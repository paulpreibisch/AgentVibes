#!/usr/bin/env bats

# Test: SSH remote end-to-end — sender builds payload, receiver uses all fields
#
# Verifies the complete round-trip:
#   1. play-tts-ssh-remote.sh (sender) builds a base64 JSON payload
#   2. agentvibes-receiver.sh (receiver) decodes the payload and applies every field
#
# The test checks that reverb (effects), voice, music track, music volume, and
# pretext are ALL present in the sender payload AND are ALL correctly applied
# by the receiver — so regression in either end is caught.
#
# Both sender and receiver run with AGENTVIBES_TEST_MODE=true, which dumps
# results to stdout instead of requiring audio hardware or a live SSH tunnel.

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
SSH_REMOTE="$REPO_ROOT/.claude/hooks/play-tts-ssh-remote.sh"
RECEIVER="$REPO_ROOT/templates/agentvibes-receiver.sh"

setup() {
  setup_test_env

  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  mkdir -p "$TEST_HOME/.claude"

  echo "mock-laptop" > "$TEST_HOME/.claude/ssh-remote-host.txt"

  export AGENTVIBES_TEST_MODE="true"
  export CLAUDE_PROJECT_DIR
}

teardown() {
  teardown_test_env
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Run the sender and capture the raw JSON payload
sender_payload() {
  local text="${1:-Hello world}"
  local voice="${2:-en_US-libritts-high::Oscar-14}"
  export AGENTVIBES_LLM_KEY="${3:-llm:claude-code}"
  bash "$SSH_REMOTE" "$text" "$voice" ""
}

# Base64-encode a string with no line wrapping (portable: probes for GNU vs BSD flag)
b64enc() {
  if printf '' | base64 -w 0 >/dev/null 2>&1; then
    printf '%s' "$1" | base64 -w 0
  else
    printf '%s' "$1" | base64 | tr -d '\n'
  fi
}

# Extract a field from the receiver's test-mode output JSON
receiver_field() {
  local field="$1"
  echo "$output" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('$field',''))" 2>/dev/null || echo ""
}

# Full round-trip: run sender → pipe JSON to receiver → capture receiver output
run_e2e() {
  local text="${1:-Hello world}"
  local voice="${2:-en_US-libritts-high::Oscar-14}"
  export AGENTVIBES_LLM_KEY="${3:-llm:claude-code}"
  local json_payload
  json_payload=$(bash "$SSH_REMOTE" "$text" "$voice" "")
  local encoded
  encoded=$(b64enc "$json_payload")
  run bash "$RECEIVER" "$encoded"
}

# ===========================================================================
# 1. Sender includes all required fields in the payload
# ===========================================================================

@test "e2e: sender payload contains all required fields" {
  # Personality/pretext is delivered via TEXT (play-tts.sh prepends it upstream).
  # The JSON pretext field is intentionally empty so the receiver does not double-prepend.
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code|light|agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  payload=$(sender_payload "Bcs latin dance here, Test speech" "en_US-libritts-high::Oscar-14")
  # Audio fields are all present
  [ -n "$(echo "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('voice',''))")" ]
  [ -n "$(echo "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('music',''))")" ]
  [ -n "$(echo "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('volume',''))")" ]
  [ -n "$(echo "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('llm',''))")" ]
  # Personality IS in the text field (prepended by play-tts.sh)
  text=$(echo "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('text',''))")
  [[ "$text" == "Bcs latin dance here"* ]]
  # Pretext field empty — receiver must not prepend again
  pre=$(echo "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('pretext',''))")
  [ "$pre" = "" ]
}

# ===========================================================================
# 2. Receiver applies voice sent by sender
# ===========================================================================

@test "e2e: receiver uses the voice from sender payload" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_e2e "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  voice=$(receiver_field "voice")
  [ "$voice" = "en_US-libritts-high::Oscar-14" ]
}

# ===========================================================================
# 3. Receiver applies music track sent by sender
# ===========================================================================

@test "e2e: receiver uses the music track from sender payload" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_e2e "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  music=$(receiver_field "music")
  [ "$music" = "agent_vibes_salsa_v2_loop.mp3" ]
}

# ===========================================================================
# 4. Receiver applies music volume sent by sender
# ===========================================================================

@test "e2e: receiver uses the music volume from sender payload" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.99
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_e2e "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  vol=$(receiver_field "volume")
  [ "$vol" = "0.05" ]
}

# ===========================================================================
# 5. Receiver applies reverb/effects sent by sender
# ===========================================================================

@test "e2e: receiver uses the reverb effects from sender payload" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code|light|agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_e2e "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  effects=$(receiver_field "effects")
  [ "$effects" = "light" ]
}

# ===========================================================================
# 6. Personality/pretext: delivered via TEXT (play-tts.sh prepends it upstream)
# ===========================================================================
# The receiver must NOT see pretext in the JSON pretext field — play-tts.sh
# already prepended it to TEXT before calling the sender. If the receiver also
# prepends from the pretext field, the user hears the intro twice.

@test "e2e: receiver gets personality in TEXT field, pretext JSON field is empty" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  # Simulate play-tts.sh: pretext already prepended to TEXT
  run_e2e "Bcs latin dance here, Hello user" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  # pretext field must be empty — receiver must not prepend it again
  pretext=$(receiver_field "pretext")
  [ "$pretext" = "" ]
  # but personality IS in the text the receiver will speak
  text=$(receiver_field "text")
  [[ "$text" == "Bcs latin dance here"* ]]
}

# ===========================================================================
# 7. Receiver does NOT use default chillwave when sender sent salsa
# ===========================================================================

@test "e2e: receiver gets salsa, not chillwave, when project has salsa" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.15
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_e2e "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  music=$(receiver_field "music")
  [ "$music" != "agent_vibes_chillwave_v2_loop.mp3" ]
  [ "$music" = "agent_vibes_salsa_v2_loop.mp3" ]
}

# ===========================================================================
# 8. Receiver passes llm identifier through
# ===========================================================================

@test "e2e: receiver passes llm identifier from sender payload" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code||agent_vibes_salsa_v2_loop.mp3|0.05|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  run_e2e "Test speech" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]
  llm=$(receiver_field "llm")
  [ "$llm" = "claude-code" ]
}

# ===========================================================================
# 9. Full round-trip: all fields correct simultaneously
# ===========================================================================

@test "e2e: full round-trip — all fields correct simultaneously" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_chillwave_v2_loop.mp3|0.99
llm:claude-code|medium|agent_vibes_salsa_v2_loop.mp3|0.07|en_US-libritts-high::Oscar-14|Bcs latin dance here|piper
CFG

  # Simulate play-tts.sh having prepended the pretext to TEXT
  run_e2e "Bcs latin dance here, Full test" "en_US-libritts-high::Oscar-14"
  [ "$status" -eq 0 ]

  voice=$(receiver_field "voice");   [ "$voice"  = "en_US-libritts-high::Oscar-14" ]
  music=$(receiver_field "music");   [ "$music"  = "agent_vibes_salsa_v2_loop.mp3" ]
  vol=$(receiver_field "volume");    [ "$vol"    = "0.07"                           ]
  efx=$(receiver_field "effects");   [ "$efx"   = "medium"                          ]
  llm=$(receiver_field "llm");       [ "$llm"   = "claude-code"                     ]
  # pretext field empty — personality delivered via TEXT (no double-prepend)
  pre=$(receiver_field "pretext");   [ "$pre"   = ""                                ]
  text=$(receiver_field "text");     [[ "$text" == "Bcs latin dance here"* ]]
}
