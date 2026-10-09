#!/usr/bin/env bats
#
# Scoped "tests running" mute. scripts/run-tests.sh used to touch an empty
# ~/.agentvibes-tests-running, which silenced EVERY project on the machine for the
# whole (hour-long on Windows) suite. It now records the repo root under test, and
# only callers inside that root are muted. An empty marker keeps the old
# mute-everything behaviour for older runners.
#
# Hermetic: $HOME is a temp dir (test-helper), so the real marker is never touched.

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_audio_players
  MARKER="$HOME/.agentvibes-tests-running"
  PLAY_TTS="$TEST_CLAUDE_DIR/hooks/play-tts.sh"
  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"
  # shellcheck source=/dev/null
  source "$REPO_ROOT/.claude/hooks/tests-running-guard.sh"
}

teardown() {
  rm -f "$MARKER"
  teardown_test_env
}

@test "guard: no marker -> not muted" {
  rm -f "$MARKER"
  run av_tests_running_mute "/c/Users/me/proj"
  [ "$status" -eq 1 ]
}

@test "guard: empty marker -> muted everywhere (legacy behaviour)" {
  : > "$MARKER"
  run av_tests_running_mute "/c/Users/me/anything"
  [ "$status" -eq 0 ]
}

@test "guard: caller inside the root under test -> muted" {
  printf '/c/Users/me/AgentVibes\n' > "$MARKER"
  run av_tests_running_mute "/c/Users/me/AgentVibes"
  [ "$status" -eq 0 ]
  run av_tests_running_mute "/c/Users/me/AgentVibes/test/unit"
  [ "$status" -eq 0 ]
}

@test "guard: other project, and a sibling sharing a name prefix -> NOT muted" {
  printf '/c/Users/me/AgentVibes\n' > "$MARKER"
  run av_tests_running_mute "/c/Users/me/preibisch.biz"
  [ "$status" -eq 1 ]
  run av_tests_running_mute "/c/Users/me/AgentVibes-kokoro-warm"
  [ "$status" -eq 1 ]
}

@test "guard: Windows path forms, case and CRLF all match the Git Bash root" {
  printf '/c/Users/me/AgentVibes\r\n' > "$MARKER"
  run av_tests_running_mute 'C:\Users\Me\agentvibes\'
  [ "$status" -eq 0 ]
  run av_tests_running_mute "C:/Users/me/AgentVibes/src"
  [ "$status" -eq 0 ]
}

@test "guard: any of several context dirs, and any of several roots, can match" {
  printf '/srv/one\n/srv/two\n' > "$MARKER"
  run av_tests_running_mute "" "/home/x" "/srv/two/sub"
  [ "$status" -eq 0 ]
}

@test "play-tts: speaks for a project that is NOT under test" {
  printf '/nowhere/some-other-repo\n' > "$MARKER"
  run "$PLAY_TTS" "should still speak" --project-dir "$CLAUDE_PROJECT_DIR"
  [ -n "$output" ]
}

@test "play-tts: silent for a caller inside the repo under test" {
  printf '%s\n' "$CLAUDE_PROJECT_DIR" > "$MARKER"
  run "$PLAY_TTS" "should be suppressed" --project-dir "$CLAUDE_PROJECT_DIR"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "play-tts: the script's own checkout under test is silent even without --project-dir" {
  # The installed hooks live in $HOME/.claude/hooks, so their project root is $HOME.
  printf '%s\n' "$HOME" > "$MARKER"
  run env -u CLAUDE_PROJECT_DIR "$PLAY_TTS" "should be suppressed"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "run-tests.sh: records its repo root and removes only its own line" {
  run grep -F 'printf '"'"'%s\n'"'"' "$TEST_ROOT" >> "$MARKER"' "$REPO_ROOT/scripts/run-tests.sh"
  [ "$status" -eq 0 ]
  run grep -F 'grep -vxF -- "$TEST_ROOT" "$MARKER"' "$REPO_ROOT/scripts/run-tests.sh"
  [ "$status" -eq 0 ]
}

@test "parity: PowerShell guard applies the same rules" {
  ps="$(command -v pwsh || command -v powershell || true)"
  [ -n "$ps" ] || skip "no PowerShell on this runner"
  guard="$REPO_ROOT/.claude/hooks-windows/tests-running-guard.ps1"
  command -v cygpath >/dev/null 2>&1 && guard="$(cygpath -w "$guard")"
  printf '/c/Users/me/AgentVibes\r\n' > "$MARKER"
  home_native="$HOME"; command -v cygpath >/dev/null 2>&1 && home_native="$(cygpath -w "$HOME")"
  run "$ps" -NoProfile -Command "\$env:USERPROFILE='$home_native'; . '$guard'; \
    \"\$(Test-AvTestsRunningMute @('C:\\Users\\Me\\agentvibes\\src'))|\$(Test-AvTestsRunningMute @('C:\\Users\\me\\AgentVibes-kokoro-warm'))\""
  [ "$status" -eq 0 ]
  [[ "$output" == *"True|False"* ]]
  : > "$MARKER"
  run "$ps" -NoProfile -Command "\$env:USERPROFILE='$home_native'; . '$guard'; Test-AvTestsRunningMute @('C:\\anything')"
  [[ "$output" == *"True"* ]]
}
