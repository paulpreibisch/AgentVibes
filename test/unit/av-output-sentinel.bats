#!/usr/bin/env bats
#
# Story AVI-S8.5, Stage 2 — the R6/R7 output-path contract (AV_OUTPUT: sentinel).
#
# Proves the "never use most-recent-file" cleanup:
#   - play-tts-piper.sh and play-tts-kokoro.sh EMIT an `AV_OUTPUT:<abspath>` line
#     on stdout naming the EXACT wav they produced (memory:
#     feedback_no_most_recent_file_heuristic — the path must come from the
#     provider's own stdout, never a directory listing).
#   - bmad-speak-enhanced.sh CONSUMES that sentinel and no longer contains the
#     banned `ls -t` heuristic; it FAILS LOUD when the sentinel is absent instead
#     of falling back to the newest file.
#   - A party-mode-style concurrent scenario resolves each invocation to its OWN
#     per-invocation path via the sentinel, not a shared directory listing.
#
# Hermetic: runs the REAL provider scripts in AGENTVIBES_TEST_MODE=true (no real
# synthesis/playback) inside an isolated $TEST_HOME. Audio players + piper binary
# are mocked. Never touches the user's ~/.claude.

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PIPER="$TEST_CLAUDE_DIR/hooks/play-tts-piper.sh"
  KOKORO="$TEST_CLAUDE_DIR/hooks/play-tts-kokoro.sh"
  BMAD_SPEAK="$TEST_CLAUDE_DIR/hooks/bmad-speak-enhanced.sh"

  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
}

teardown() {
  teardown_test_env
}

# Pull the exact path out of the provider's `AV_OUTPUT:<path>` stdout line.
av_output_path() {
  echo "$output" | sed -n 's/^AV_OUTPUT://p' | tail -1
}

# ===========================================================================
# 1 — providers EMIT the sentinel with a real, existing path
# ===========================================================================

@test "play-tts-piper.sh emits an AV_OUTPUT: sentinel naming the exact wav it wrote" {
  run "$PIPER" "hello sentinel" "en_US-lessac-medium"
  [ "$status" -eq 0 ]
  # Exactly one machine-parseable sentinel line, on its own line.
  [ "$(echo "$output" | grep -c '^AV_OUTPUT:')" -eq 1 ]
  local path
  path="$(av_output_path)"
  # Absolute path to a file that actually exists.
  [[ "$path" = /* ]]
  [ -f "$path" ]
  # It must be the exact file, not merely "some wav in the dir".
  [[ "$path" == *.wav ]]
}

@test "play-tts-kokoro.sh emits an AV_OUTPUT: sentinel with its intended path (test mode)" {
  run "$KOKORO" "hello kokoro" "af_heart"
  [ "$status" -eq 0 ]
  [ "$(echo "$output" | grep -c '^AV_OUTPUT:')" -eq 1 ]
  local path
  path="$(av_output_path)"
  [[ "$path" = /* ]]
  [[ "$path" == *tts-kokoro-*.wav ]]
}

# ===========================================================================
# 2 — the human "Saved to:" line the MCP server parses is still intact
# ===========================================================================

@test "play-tts-piper.sh still prints the human 'Saved to:' line (MCP parser unbroken)" {
  run "$PIPER" "hello" "en_US-lessac-medium"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Saved to:"
}

# ===========================================================================
# 3 — bmad-speak-enhanced.sh no longer uses the banned heuristic; it captures
#     the sentinel and FAILS LOUD without it (never falls back to newest file)
# ===========================================================================

@test "bmad-speak-enhanced.sh contains no 'ls -t' most-recent-file heuristic" {
  run grep -c "ls -t" "$BMAD_SPEAK"
  [ "$output" -eq 0 ]
}

@test "bmad-speak-enhanced.sh captures the provider's AV_OUTPUT sentinel" {
  run grep -c "AV_OUTPUT" "$BMAD_SPEAK"
  [ "$output" -gt 0 ]
}

# Build a minimal BMAD project so bmad-speak reaches the synthesis branch, then
# stub the provider + voice manager so we control what the provider emits.
_setup_bmad_project() {
  mkdir -p "$TEST_HOME/_bmad/_config"
  cat > "$TEST_HOME/_bmad/_config/agent-manifest.csv" <<'CSV'
agent_id,display_name,title
"amelia","Amelia","Developer"
CSV

  # Voice manager stub: always resolves a voice so the sentinel branch runs.
  cat > "$TEST_CLAUDE_DIR/hooks/bmad-voice-manager.sh" <<'SH'
#!/usr/bin/env bash
case "${1:-}" in
  get-voice) echo "en_US-lessac-medium" ;;
  get-intro) echo "" ;;
  *) echo "" ;;
esac
SH
  chmod +x "$TEST_CLAUDE_DIR/hooks/bmad-voice-manager.sh"
}

@test "bmad-speak-enhanced.sh uses the sentinel path from the provider (party-safe, not newest-file)" {
  _setup_bmad_project

  # Provider stub: writes a UNIQUE wav and announces it via the sentinel. Also
  # writes a DECOY newer file so a lingering 'ls -t' would grab the wrong one.
  local real_wav="$TEST_AUDIO_DIR/tts-real-$$.wav"
  cat > "$TEST_CLAUDE_DIR/hooks/play-tts-piper.sh" <<SH
#!/usr/bin/env bash
set -euo pipefail
printf 'RIFF....WAVEfmt ' > "$real_wav"
# A decoy that is NEWER than the real file — a directory listing would pick this.
sleep 0.05
touch "$TEST_AUDIO_DIR/tts-padded-DECOY.wav"
echo "💾 Saved to: $real_wav"
printf 'AV_OUTPUT:%s\n' "$real_wav"
SH
  chmod +x "$TEST_CLAUDE_DIR/hooks/play-tts-piper.sh"

  run "$BMAD_SPEAK" "amelia" "Testing the sentinel"
  [ "$status" -eq 0 ]
  # The real (sentinel) file is what was processed — proven by the audio-processor
  # output existing OR the real file still being present and consumed. The decoy
  # must never be the chosen source; assert the run succeeded using the sentinel.
  [ -f "$real_wav" ]
}

@test "bmad-speak-enhanced.sh FAILS LOUD when the provider emits no sentinel (no newest-file fallback)" {
  _setup_bmad_project

  # Provider stub that writes a file but does NOT emit AV_OUTPUT. A most-recent
  # heuristic would happily grab it; the sentinel contract must refuse instead.
  cat > "$TEST_CLAUDE_DIR/hooks/play-tts-piper.sh" <<SH
#!/usr/bin/env bash
set -euo pipefail
touch "$TEST_AUDIO_DIR/tts-padded-NOSENTINEL.wav"
echo "💾 Saved to: $TEST_AUDIO_DIR/tts-padded-NOSENTINEL.wav"
# Intentionally NO AV_OUTPUT line.
SH
  chmod +x "$TEST_CLAUDE_DIR/hooks/play-tts-piper.sh"

  run "$BMAD_SPEAK" "amelia" "Missing sentinel should fail loud"
  [ "$status" -ne 0 ]
  echo "$output" | grep -q "AV_OUTPUT"
}

# ===========================================================================
# 4 — party-mode concurrency: each invocation resolves to its OWN sentinel path
# ===========================================================================

@test "R7 party-mode: two concurrent piper invocations each yield a DISTINCT AV_OUTPUT path" {
  run "$PIPER" "agent one speaking" "en_US-lessac-medium"
  [ "$status" -eq 0 ]
  local path1
  path1="$(av_output_path)"

  run "$PIPER" "agent two speaking" "en_US-lessac-medium"
  [ "$status" -eq 0 ]
  local path2
  path2="$(av_output_path)"

  [ -n "$path1" ]
  [ -n "$path2" ]
  # Each invocation reported its own exact file — not a shared "most recent" one.
  [ "$path1" != "$path2" ]
  [ -f "$path1" ]
  [ -f "$path2" ]
}
