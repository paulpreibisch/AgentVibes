#!/usr/bin/env bats

# Test: play-tts-ssh-remote.sh builds correct JSON payload
#
# Verifies that the sender packs the right voice, reverb (sox_effects),
# music track (bg_file), music volume (bg_volume), and pretext into the
# JSON payload destined for the receiver (a dumb player that plays exactly
# what it receives — no local config re-read on the remote side).
#
# Uses AGENTVIBES_TEST_MODE=true so the script dumps the JSON to stdout
# instead of SSH-ing to a real host — no network required.
#
# Also covers: voice-preview and music-preview paths over SSH remote.

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
SSH_REMOTE="$REPO_ROOT/.claude/hooks/play-tts-ssh-remote.sh"

# ---------------------------------------------------------------------------
# Setup: isolated project dir, SSH host file so the script doesn't abort
# ---------------------------------------------------------------------------

setup() {
  setup_test_env

  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio/tracks"

  # Provide a valid SSH host so the script doesn't exit early.
  # In AGENTVIBES_TEST_MODE the SSH command is never actually executed.
  mkdir -p "$TEST_HOME/.claude"
  echo "mock-laptop" > "$TEST_HOME/.claude/ssh-remote-host.txt"

  # Force test mode
  export AGENTVIBES_TEST_MODE="true"
  export CLAUDE_PROJECT_DIR
}

teardown() {
  teardown_test_env
}

# ---------------------------------------------------------------------------
# Helper: run ssh-remote, capture JSON output, extract a field
# ---------------------------------------------------------------------------
get_payload_field() {
  local field="$1"
  echo "$output" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('$field',''))" 2>/dev/null || echo ""
}

run_ssh_remote() {
  local text="${1:-Hello world}"
  local voice="${2:-en_US-libritts-high::Oscar-14}"
  local agent="${3:-}"
  export AGENTVIBES_LLM_KEY="${4:-llm:claude-code}"
  run bash "$SSH_REMOTE" "$text" "$voice" "$agent"
}

# ===========================================================================
# 1. Core payload correctness — music track, volume, reverb, voice
# ===========================================================================

@test "ssh-remote: sends salsa music track from project llm:claude-code row" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default|reverb 20 50 50|agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  music=$(get_payload_field "music")
  [ "$music" = "agent_vibes_salsa_v2_loop.mp3" ]
}

@test "ssh-remote: sends correct music volume from llm:claude-code row (not default 0.15)" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.40
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  vol=$(get_payload_field "volume")
  [ "$vol" = "0.05" ]
}

@test "ssh-remote: sends the voice passed as argument" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  voice=$(get_payload_field "voice")
  [ "$voice" = "en_US-libritts-high::Oscar-14" ]
}

@test "ssh-remote: sends reverb preset from llm:claude-code row" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code|light|agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  effects=$(get_payload_field "effects")
  [ "$effects" = "light" ]
}

@test "ssh-remote: does NOT send chillwave when project llm row has salsa" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  music=$(get_payload_field "music")
  [ "$music" != "agent_vibes_chillwave_v2_loop.mp3" ]
}

# ===========================================================================
# 2. CLAUDE_PROJECT_DIR takes precedence over global home fallback
# ===========================================================================

@test "ssh-remote: project audio-effects.cfg wins over global fallback" {
  # Global config (under TEST_HOME) has chillwave; project has salsa
  mkdir -p "$TEST_HOME/.claude/config"
  cat > "$TEST_HOME/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_chillwave_v2_loop.mp3|0.15|en_US-ryan-high||piper
CFG

  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_flamenco_loop.mp3|0.30
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  music=$(get_payload_field "music")
  [ "$music" = "agent_vibes_salsa_v2_loop.mp3" ]
}

# ===========================================================================
# 3. Voice preview — correct voice and music sent for preview
# ===========================================================================

@test "ssh-remote: voice preview sends the preview voice in payload" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Hi, I'm Oscar. How does my voice sound?" \
    "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  voice=$(get_payload_field "voice")
  [ "$voice" = "en_US-libritts-high::Oscar-14" ]
}

@test "ssh-remote: voice preview uses project music track not global default" {
  mkdir -p "$TEST_HOME/.claude/config"
  cat > "$TEST_HOME/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_chillwave_v2_loop.mp3|0.15||
CFG

  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_flamenco_loop.mp3|0.30
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Voice preview text" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  music=$(get_payload_field "music")
  [ "$music" = "agent_vibes_salsa_v2_loop.mp3" ]
}

# ===========================================================================
# 4. Music track preview — the configured track is sent
# ===========================================================================

@test "ssh-remote: music preview sends the project-configured track" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Music preview" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  music=$(get_payload_field "music")
  [[ "$music" == *"salsa"* ]]
}

@test "ssh-remote: music preview volume matches llm row, not default row" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.99
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Music preview" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  vol=$(get_payload_field "volume")
  [ "$vol" = "0.05" ]
}

# ===========================================================================
# 5. Pretext (personality intro) — delivered via TEXT, not JSON pretext field
# ===========================================================================
# play-tts.sh reads the llm row's pretext and prepends it to TEXT before
# calling this script. The JSON pretext field is intentionally left empty so
# the receiver does NOT prepend it a second time (double-prepend = heard twice).
# The personality IS delivered to the receiver — it is baked into the text arg.

@test "ssh-remote: pretext JSON field is empty (play-tts.sh already baked it into TEXT)" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  # Simulate play-tts.sh: pretext is prepended to TEXT before this script runs
  run_ssh_remote "Bcs latin dance here, Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  # The JSON pretext field must be empty — receiver must not prepend it again
  pretext=$(get_payload_field "pretext")
  [ "$pretext" = "" ]
}

@test "ssh-remote: personality reaches receiver via TEXT field (not pretext field)" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  # Simulate play-tts.sh having prepended the pretext
  run_ssh_remote "Bcs latin dance here, Hello user" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  text=$(get_payload_field "text")
  [[ "$text" == "Bcs latin dance here"* ]]
}

# ===========================================================================
# 6. Payload is valid JSON (not corrupted)
# ===========================================================================

@test "ssh-remote: payload is valid JSON" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech with 'quotes' and special chars: hello!"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | python3 -c \
    "import json,sys; json.load(sys.stdin); print('ok')" 2>/dev/null || echo "fail")
  [ "$result" = "ok" ]
}

# ===========================================================================
# 7. LLM identifier is sent in payload
# ===========================================================================

@test "ssh-remote: sends llm identifier in payload" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_ssh_remote "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  llm=$(get_payload_field "llm")
  [ "$llm" = "claude-code" ]
}

# ===========================================================================
# 8. Fallback to default row when no llm: row exists
# ===========================================================================

@test "ssh-remote: falls back to default row when llm:claude-code row absent" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_bachata_loop.mp3|0.20
CFG

  run_ssh_remote "Test speech" "en_US-lessac-medium"
  [ "$status" -eq 0 ]
  music=$(get_payload_field "music")
  [ "$music" = "agent_vibes_bachata_loop.mp3" ]
}
