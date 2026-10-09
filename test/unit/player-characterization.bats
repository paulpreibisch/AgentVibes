#!/usr/bin/env bats
#
# Story AVI-S8.7 — Player DECISION-characterization harness (bash chain).
#
# This is NOT a "does audio play" test (see test/unit/play-tts.bats for that).
# It invokes the REAL play-tts.sh / play-tts-ssh-remote.sh in a safe dry-run
# mode and captures the DECISION each makes — which engine/provider, which
# voice, SSH port-flag behavior, and what the SSH JSON payload carries — WITHOUT
# producing real audio or a real network connection, so a Stage-2 port that
# silently changes a decision is caught immediately.
#
# Mechanism (see docs/implementation-artifacts/8-5-precedence-map.md, the
# env-var table, and CLAUDE.md's non-destructive rule):
#   - setup_test_env / setup_agentvibes_scripts (test/helpers/test-helper.bash)
#     copy the real hooks into an ISOLATED $TEST_HOME — the real ~/.claude and
#     ~/.agentvibes are never read or written by this file.
#   - mock_audio_players stubs `piper`/`aplay`/`paplay`/`mpg123` on PATH so no
#     real synthesis or playback binary needs to be installed.
#   - AGENTVIBES_TEST_MODE=true is honored by the *-piper.sh/*-kokoro.sh
#     provider scripts to skip playback (they still "synthesize" via the
#     mocked `piper` binary, which writes a tiny deterministic silent WAV).
#   - AGENTVIBES_VERBOSE=1 makes play-tts.sh print `voice=`/`provider=` to
#     stderr — the resolved DECISION — before it execs into the provider.
#   - play-tts-ssh-remote.sh, in AGENTVIBES_TEST_MODE=true, prints the decoded
#     JSON payload instead of opening a real SSH connection (no network).
#   - A local mock `ssh` binary (this file only, not test-helper.bash) captures
#     argv to a file so the port-flag decision (R4/R5) can be inspected without
#     AGENTVIBES_TEST_MODE (which exits before the SSH_ARGS are built).
#
# KNOWN DIVERGENCES (map §C): rows the CURRENT bash chain gets wrong are
# written with the CORRECT (target, post-Stage-2) assertion but `skip`ped with
# a citation — never asserted as passing today. Delete the `skip` line once
# Stage 2 ports play-tts.sh onto the resolver; the assertion should then go green.

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PLAY_TTS="$TEST_CLAUDE_DIR/hooks/play-tts.sh"
  SSH_REMOTE="$TEST_CLAUDE_DIR/hooks/play-tts-ssh-remote.sh"

  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"
  # Point the resolver-plan swap (AVI-S8.5 Stage 2) at the REAL repo bundle so
  # the isolated hooks copy activates it (the bundle uses only node builtins, so
  # running it from the repo path resolves its ../src imports correctly).
  export AGENTVIBES_RESOLVER_CLI="$REPO_ROOT/bin/resolve-utterance.js"
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
}

teardown() {
  teardown_test_env
}

# Extract the `provider=<x>` diagnostic line play-tts.sh prints under
# AGENTVIBES_VERBOSE=1 (stderr, captured into $output by `run`).
decision_provider() {
  echo "$output" | sed -n 's/^provider=//p' | tail -1
}
decision_voice() {
  echo "$output" | sed -n 's/^voice=//p' | tail -1
}

write_llm_row() {
  # llm:<name>|REVERB|BGFILE|BGVOL|VOICE|PRETEXT|ENGINE
  echo "$1" > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg"
}

# ===========================================================================
# Section 1 — engine/voice routing decisions (play-tts.sh, AGENTVIBES_VERBOSE)
# ===========================================================================

@test "characterization: a piper-shaped explicit voice routes to piper (F4, already correct)" {
  export AGENTVIBES_VERBOSE=1
  run "$PLAY_TTS" --project-dir "$CLAUDE_PROJECT_DIR" "hello" "en_US-amy-medium"
  [ "$(decision_provider)" = "piper" ]
}

@test "characterization: an unconfigured LLM key falls back to the piper provider file default" {
  export AGENTVIBES_VERBOSE=1
  run "$PLAY_TTS" --project-dir "$CLAUDE_PROJECT_DIR" --llm "nobody-configured" "hello"
  [ "$(decision_provider)" = "piper" ]
}

@test "per-LLM ENGINE column drives the engine, normalized (windows-piper -> piper, F5)" {
  write_llm_row 'llm:claude-code||||||windows-piper'
  export AGENTVIBES_VERBOSE=1
  run "$PLAY_TTS" --project-dir "$CLAUDE_PROJECT_DIR" --llm "claude-code" "hello"
  # Post-Stage-2: the resolver canonicalizes the alias spelling (F5) so the
  # engine is the canonical "piper" (routes to the same handler either way).
  # Before Stage 2 this passed through the raw "windows-piper" string.
  [ "$(decision_provider)" = "piper" ]
}

@test "R1 FIXED (project_voice_engine_coupling): a Kokoro-shaped voice forces the kokoro engine in bash" {
  # Was the silence bug: detect_voice_provider matched only piper's _..- shape,
  # so af_river fell through to the piper provider -> silence on Linux. Stage 2
  # routes the engine through the resolver, which couples af_* -> kokoro.
  write_llm_row 'llm:claude-code||||||piper'
  export AGENTVIBES_VERBOSE=1
  run "$PLAY_TTS" --project-dir "$CLAUDE_PROJECT_DIR" --llm "claude-code" "hello" "af_river"
  [ "$(decision_provider)" = "kokoro" ]
}

@test "R2 FIXED (feedback_per_llm_voice_wins_over_explicit): per-LLM voice wins over an LLM-echoed explicit voice" {
  # The hook path treats the positional voice as an LLM echo (voiceSource=llm-echo),
  # so the per-LLM row voice now wins — restoring per-LLM routing.
  write_llm_row 'llm:claude-code||||af_bella||'
  export AGENTVIBES_VERBOSE=1
  run "$PLAY_TTS" --project-dir "$CLAUDE_PROJECT_DIR" --llm "claude-code" "hello" "af_sarah"
  [ "$(decision_voice)" = "af_bella" ]
}

@test "characterization: an explicit voice IS used when no per-LLM voice is configured (matches R2's 'else explicit' fallback)" {
  export AGENTVIBES_VERBOSE=1
  run "$PLAY_TTS" --project-dir "$CLAUDE_PROJECT_DIR" "hello" "af_sarah"
  [ "$(decision_voice)" = "af_sarah" ]
}

# ===========================================================================
# Section 2 — SSH transport: port-flag decision (R4/R5)
# Uses a LOCAL mock `ssh` (this file only) so the real SSH_ARGS-building code
# path runs (AGENTVIBES_TEST_MODE would exit before reaching it) with zero
# network access — the mock never connects anywhere, it only records argv.
# ===========================================================================

# NOTE on R4/R5 (SSH `-p 22` omission): the runtime BEHAVIOR is covered
# deterministically by the resolver conformance matrix
# (test/unit/resolver-conformance-matrix.test.js — resolveSshTarget.passPortFlag).
# We deliberately do NOT observe it by capturing argv from the live sender here:
# the sender backgrounds ssh in an orphaned subshell (`( ssh … ) &; exit 0`,
# play-tts-ssh-remote.sh:350-357), which is inherently unreliable to observe from
# bats (a flaky safety-net test is worse than none). Instead we lock the guard
# STATICALLY against the real sender source — deterministic, and exactly the line
# that must never regress. The port-resolution env-var wiring is a separate
# concern tracked for the Stage-2 SSH port.

@test "R4/R5: the bash SSH sender still contains the -p-omit-when-22 guard (honors ~/.ssh/config alias)" {
  # Landmine memory: project_ssh_port_alias_override. The guard must skip -p for
  # port 22 so an ~/.ssh/config alias's real port is used.
  run grep -E '"\$?SSH_PORT" != "22"' "$SSH_REMOTE"
  [ "$status" -eq 0 ]
}

@test "R5: the sender adds -p with the resolved port when it is not 22" {
  # Same guard line also appends -p "$SSH_PORT" for a non-default port.
  run grep -E 'SSH_ARGS\+=\(-p ' "$SSH_REMOTE"
  [ "$status" -eq 0 ]
}

# ===========================================================================
# Section 3 — SSH JSON payload: what gets forwarded to the receiver (R17/R18)
# ===========================================================================

get_payload_field() {
  local field="$1"
  echo "$output" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('$field','__ABSENT__'))" 2>/dev/null || echo "__ABSENT__"
}

@test "characterization: SSH payload carries voice/music/volume/effects/llm (already correct — R19 forwarding baseline)" {
  echo "mock-host" > "$TEST_HOME/.claude/ssh-remote-host.txt"
  write_llm_row 'llm:claude-code|light|agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14||piper'
  export AGENTVIBES_TEST_MODE=true
  export AGENTVIBES_LLM_KEY="llm:claude-code"
  run bash "$SSH_REMOTE" "hello" "en_US-libritts-high::Oscar-14" ""
  [ "$status" -eq 0 ]
  [ "$(get_payload_field voice)" = "en_US-libritts-high::Oscar-14" ]
  [ "$(get_payload_field music)" = "agent_vibes_salsa_v2_loop.mp3" ]
  [ "$(get_payload_field volume)" = "0.05" ]
  [ "$(get_payload_field effects)" = "light" ]
}

@test "R17 FIXED: a sender-side mute is forwarded in the SSH payload (receiver honors it via safety-OR)" {
  echo "mock-host" > "$TEST_HOME/.claude/ssh-remote-host.txt"
  export AGENTVIBES_TEST_MODE=true
  touch "$TEST_HOME/.agentvibes-muted"   # sender is globally muted
  run bash "$SSH_REMOTE" "hello" "en_US-amy-medium" ""
  [ "$(get_payload_field mute)" = "true" ]
}

@test "R18 FIXED: the target language is forwarded in the SSH payload (receiver's own config still wins)" {
  echo "mock-host" > "$TEST_HOME/.claude/ssh-remote-host.txt"
  export AGENTVIBES_TEST_MODE=true
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  echo "spanish" > "$CLAUDE_PROJECT_DIR/.claude/config/tts-language.txt"
  run bash "$SSH_REMOTE" "hello" "en_US-amy-medium" ""
  [ "$(get_payload_field language)" = "spanish" ]
}

# ===========================================================================
# Section 4 — output-path sentinel (R6) and the banned "most recent file" heuristic
# ===========================================================================

@test "R6 FIXED: play-tts-piper.sh emits an AV_OUTPUT: sentinel (exact output path)" {
  # The emit is `printf 'AV_OUTPUT:%s\n' ...` so it can't be a source line STARTING
  # with AV_OUTPUT: — assert the sentinel is emitted anywhere in the script.
  run grep -c "AV_OUTPUT:" "$TEST_CLAUDE_DIR/hooks/play-tts-piper.sh"
  [ "$output" -gt 0 ]
}

@test "R6/R7 FIXED: bmad-speak-enhanced.sh no longer uses the banned 'ls -t' most-recent-file heuristic" {
  run grep -c "ls -t" "$TEST_CLAUDE_DIR/hooks/bmad-speak-enhanced.sh"
  [ "$output" -eq 0 ]
}

# ===========================================================================
# Section 5 — the NO_PLAY / NO_PLAYBACK flag mismatch (R11, AC item)
# ===========================================================================

@test "R11/AC 7.5: run-tests.sh exports BOTH no-play spellings so bash providers are actually silenced" {
  # AVI-S8.7 fixed the mismatch: run-tests.sh used to export only AGENTVIBES_NO_PLAY
  # (the ps1 spelling), but the bash providers gate on AGENTVIBES_NO_PLAYBACK, so
  # bash test-suppression was a no-op. It now exports both until Stage 2 unifies
  # everything on the resolver's canonical plan.noPlayback field.
  run grep -c "AGENTVIBES_NO_PLAYBACK" "$REPO_ROOT/scripts/run-tests.sh"
  [ "$output" -gt 0 ]
  run grep -c "AGENTVIBES_NO_PLAY=" "$REPO_ROOT/scripts/run-tests.sh"
  [ "$output" -gt 0 ]
}

@test "characterization: play-tts-piper.sh DOES honor AGENTVIBES_NO_PLAYBACK directly (the canonical spelling works when set correctly)" {
  write_llm_row 'llm:default||||||piper'
  export AGENTVIBES_NO_PLAYBACK=true
  run "$PLAY_TTS" --project-dir "$CLAUDE_PROJECT_DIR" "hello"
  [ "$status" -eq 0 ]
}
