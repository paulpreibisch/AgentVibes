#!/usr/bin/env bats
#
# Story AVI-S8.5 Stage 2 — SSH forwarding of `mute` and `language`.
#
# Proves the two fields that were previously NEVER forwarded on SSH (map §C R17
# "mute never forwarded on SSH", map §D R18 "language | Forward on SSH") now ride
# the base64 JSON payload, and that BOTH receivers honor them under the
# RECEIVER-AUTHORITATIVE contract:
#   - mute:     effective_mute = receiver_local_mute OR forwarded_mute (safety-OR)
#   - language: receiver's OWN language config wins; else the forwarded default.
#
# Hermetic: setup_test_env isolates $HOME/$TEST_HOME and $CLAUDE_PROJECT_DIR, so
# the real ~/.claude / ~/.agentvibes are never touched. AGENTVIBES_TEST_MODE=true
# makes the sender dump its decoded JSON payload (no SSH/network) and makes the
# bash receiver dump its resolved fields (no synthesis/playback).

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
SSH_REMOTE="$REPO_ROOT/.claude/hooks/play-tts-ssh-remote.sh"
RECEIVER_SH="$REPO_ROOT/templates/agentvibes-receiver.sh"
RECEIVER_PS1="$REPO_ROOT/templates/agentvibes-receiver.ps1"

setup() {
  setup_test_env
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  mkdir -p "$TEST_HOME/.claude/config"
  echo "mock-laptop" > "$TEST_HOME/.claude/ssh-remote-host.txt"
  export AGENTVIBES_TEST_MODE="true"
  export CLAUDE_PROJECT_DIR
}

teardown() {
  teardown_test_env
}

# --- helpers ----------------------------------------------------------------

# Extract a field from the sender's JSON payload dump (stdout captured in $output).
payload_field() {
  local field="$1"
  echo "$output" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('$field','__ABSENT__'))" 2>/dev/null || echo "__ABSENT__"
}

run_sender() {
  local text="${1:-Hello}"
  local voice="${2:-en_US-amy-medium}"
  export AGENTVIBES_LLM_KEY="${3:-llm:claude-code}"
  run bash "$SSH_REMOTE" "$text" "$voice" ""
}

# Build a base64 JSON payload the way the sender does, then run the bash receiver
# in test mode and capture its resolved-field dump.
make_payload() {
  python3 -c "import json,sys,base64; print(base64.b64encode(sys.argv[1].encode()).decode())" "$1"
}
recv_field() {
  local field="$1"
  echo "$output" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('$field','__ABSENT__'))" 2>/dev/null || echo "__ABSENT__"
}

# ===========================================================================
# SENDER — payload now CARRIES mute + language (was absent before Stage 2)
# ===========================================================================

@test "sender: payload contains a 'mute' field (default false when nothing muted)" {
  run_sender "Hello"
  [ "$status" -eq 0 ]
  [ "$(payload_field mute)" = "false" ]
}

@test "sender: payload contains a 'language' field (empty when nothing configured)" {
  run_sender "Hello"
  [ "$status" -eq 0 ]
  [ "$(payload_field language)" = "" ]
}

@test "R17: a sender-side GLOBAL mute produces mute=true in the payload" {
  touch "$TEST_HOME/.agentvibes-muted"
  run_sender "Hello"
  [ "$status" -eq 0 ]
  [ "$(payload_field mute)" = "true" ]
}

@test "R17: a sender-side PROJECT mute produces mute=true in the payload" {
  touch "$CLAUDE_PROJECT_DIR/.claude/agentvibes-muted"
  run_sender "Hello"
  [ "$status" -eq 0 ]
  [ "$(payload_field mute)" = "true" ]
}

@test "R17: a PROJECT unmute overrides a GLOBAL mute (mute=false, mirrors play-tts.sh)" {
  touch "$TEST_HOME/.agentvibes-muted"
  touch "$CLAUDE_PROJECT_DIR/.claude/agentvibes-unmuted"
  run_sender "Hello"
  [ "$status" -eq 0 ]
  [ "$(payload_field mute)" = "false" ]
}

@test "R18: a configured language (config/ subdir) appears in the payload" {
  echo "spanish" > "$CLAUDE_PROJECT_DIR/.claude/config/tts-language.txt"
  run_sender "Hola"
  [ "$status" -eq 0 ]
  [ "$(payload_field language)" = "spanish" ]
}

@test "R18: a configured language (.claude root) appears in the payload" {
  echo "french" > "$CLAUDE_PROJECT_DIR/.claude/tts-language.txt"
  run_sender "Bonjour"
  [ "$status" -eq 0 ]
  [ "$(payload_field language)" = "french" ]
}

@test "R18: learning-mode target language is forwarded (learn-mode ON)" {
  echo "ON" > "$CLAUDE_PROJECT_DIR/.claude/tts-learn-mode.txt"
  echo "german" > "$CLAUDE_PROJECT_DIR/.claude/tts-target-language.txt"
  # A plain tts-language.txt exists but learning-mode target must win.
  echo "english" > "$CLAUDE_PROJECT_DIR/.claude/tts-language.txt"
  run_sender "Hallo"
  [ "$status" -eq 0 ]
  [ "$(payload_field language)" = "german" ]
}

@test "sender: payload remains valid JSON with the two new fields present" {
  echo "italian" > "$CLAUDE_PROJECT_DIR/.claude/config/tts-language.txt"
  touch "$TEST_HOME/.agentvibes-muted"
  run_sender "Ciao con 'apostrofi' e simboli!"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); assert 'mute' in d and 'language' in d; print('ok')" 2>/dev/null || echo "fail")
  [ "$result" = "ok" ]
}

# ===========================================================================
# BASH RECEIVER — receiver-authoritative OR-mute + language fallback EXERCISED
# ===========================================================================

@test "receiver.sh: forwarded mute=true → effective_mute=true (safety-OR)" {
  local pl
  pl=$(make_payload '{"text":"hi","voice":"en_US-amy-medium","mute":"true","language":""}')
  run bash "$RECEIVER_SH" "$pl"
  [ "$status" -eq 0 ]
  [ "$(recv_field mute)" = "true" ]
  [ "$(recv_field effective_mute)" = "true" ]
}

@test "receiver.sh: receiver-local mute forces effective_mute=true even when sender is unmuted" {
  touch "$TEST_HOME/.agentvibes-muted"   # receiver host is muted
  local pl
  pl=$(make_payload '{"text":"hi","voice":"en_US-amy-medium","mute":"false","language":""}')
  run bash "$RECEIVER_SH" "$pl"
  [ "$status" -eq 0 ]
  [ "$(recv_field mute)" = "false" ]
  [ "$(recv_field effective_mute)" = "true" ]
}

@test "receiver.sh: neither side muted → effective_mute=false" {
  local pl
  pl=$(make_payload '{"text":"hi","voice":"en_US-amy-medium","mute":"false","language":""}')
  run bash "$RECEIVER_SH" "$pl"
  [ "$status" -eq 0 ]
  [ "$(recv_field effective_mute)" = "false" ]
}

@test "receiver.sh: forwarded language used when receiver has none (default)" {
  local pl
  pl=$(make_payload '{"text":"hi","voice":"en_US-amy-medium","mute":"false","language":"spanish"}')
  run bash "$RECEIVER_SH" "$pl"
  [ "$status" -eq 0 ]
  [ "$(recv_field language)" = "spanish" ]
}

@test "receiver.sh: receiver's OWN language config WINS over the forwarded value" {
  echo "portuguese" > "$TEST_HOME/.claude/tts-language.txt"   # receiver-local config
  local pl
  pl=$(make_payload '{"text":"hi","voice":"en_US-amy-medium","mute":"false","language":"spanish"}')
  run bash "$RECEIVER_SH" "$pl"
  [ "$status" -eq 0 ]
  [ "$(recv_field language)" = "portuguese" ]
}

# ===========================================================================
# POWERSHELL RECEIVER — OR-mute + language-fallback asserted statically.
# The .ps1 needs __OWNER_HOME__ substitution + a Windows session/queue dir to
# run end-to-end, which is not hermetic from bats; the runtime OR-mute logic is
# exercised for real on the bash receiver above. Here we lock the equivalent
# guards in the ps1 source so a port can't silently drop them.
# ===========================================================================

@test "receiver.ps1: contains the mute safety-OR (forwarded OR receiver-local)" {
  run grep -E '\$EffectiveMute = \(\$Mute -eq "true"\) -or \$ReceiverLocalMuted' "$RECEIVER_PS1"
  [ "$status" -eq 0 ]
}

@test "receiver.ps1: vetoes playback (exit 0) when EffectiveMute is set" {
  run grep -E 'if \(\$EffectiveMute\)' "$RECEIVER_PS1"
  [ "$status" -eq 0 ]
}

@test "receiver.ps1: language fallback — receiver's own config overrides forwarded" {
  run grep -E '\$EffectiveLanguage = \$rl' "$RECEIVER_PS1"
  [ "$status" -eq 0 ]
}

@test "receiver.ps1: forwards the effective language through the queue JSON" {
  run grep -E 'language = \$EffectiveLanguage' "$RECEIVER_PS1"
  [ "$status" -eq 0 ]
}
