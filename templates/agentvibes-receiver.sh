#!/usr/bin/env bash
#
# File: agentvibes-receiver.sh
# Location: User installs to ~/.agentvibes/play-remote.sh
#
# AgentVibes SSH-TTS Receiver (v2 — self-contained pipeline)
# Receives TTS requests via SSH, generates and plays audio locally.
#
# Supports two payload formats:
#   1. JSON payload (v2): single base64-encoded JSON with all config
#   2. Legacy positional args: base64_text voice_name (backward compat)
#
# Pipeline: piper TTS → sox effects → ffmpeg music mix → pw-play/paplay
# All steps run in foreground (required for SSH ForceCommand).
#
# Installation:
#   curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/scripts/install-ssh-receiver.sh | bash
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under Apache-2.0
#

set -euo pipefail

# ---------------------------------------------------------------------------
# Environment setup for SSH ForceCommand context
# ---------------------------------------------------------------------------

# ForceCommand passes args via SSH_ORIGINAL_COMMAND env var
# SECURITY: Use read -ra instead of eval to prevent command injection
if [[ -n "${SSH_ORIGINAL_COMMAND:-}" ]]; then
  read -ra _ssh_args <<< "$SSH_ORIGINAL_COMMAND"
  set -- "${_ssh_args[@]}"
fi

# Handle -- argument separator (skip it if present)
if [[ "${1:-}" == "--" ]]; then
  shift
fi

# ---------------------------------------------------------------------------
# Configuration — customize these for your installation
# ---------------------------------------------------------------------------

# Ensure common tool paths are available in restricted SSH context
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# All paths use $HOME — the receiver user's own home directory.
# During install, voices and tracks are symlinked here from the desktop user.
# This avoids needing access to another user's home directory.

# Where piper voice models are stored
VOICES_DIR="${AGENTVIBES_VOICES_DIR:-$HOME/.claude/piper-voices}"

# Where background music tracks are stored
TRACKS_DIR="${AGENTVIBES_TRACKS_DIR:-$HOME/.claude/audio/tracks}"

# Log file — the TUI reads from this location
LOG_FILE="${AGENTVIBES_RECEIVER_LOG:-$HOME/.agentvibes/receiver.log}"

# PipeWire/PulseAudio — connect to the desktop user's audio session.
# Cross-user audio is tricky: Unix sockets reject different-uid callers
# even with ACLs. The reliable approach is localhost TCP on a fixed port.
# The setup script configures PipeWire-Pulse to listen on 127.0.0.1:34567.
AGENTVIBES_PULSE_PORT="${AGENTVIBES_PULSE_PORT:-34567}"

if [[ -z "${PULSE_SERVER:-}" ]]; then
  _own_runtime="/run/user/$(id -u)"
  if [[ -e "$_own_runtime/pulse/native" ]]; then
    # Same user — use own Unix socket (fastest)
    export PULSE_SERVER="unix:$_own_runtime/pulse/native"
  else
    # Different user — use localhost TCP (setup by agentvibes installer)
    export PULSE_SERVER="tcp:127.0.0.1:$AGENTVIBES_PULSE_PORT"
  fi
fi

# XDG_RUNTIME_DIR still needed for pipewire tools (pw-play fallback)
if [[ -z "${XDG_RUNTIME_DIR:-}" ]] || [[ ! -e "$XDG_RUNTIME_DIR/pipewire-0" ]]; then
  for _rd in /run/user/*/; do
    [[ -e "${_rd}pipewire-0" ]] && { export XDG_RUNTIME_DIR="${_rd%/}"; break; }
  done
fi
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

# Audio playback — detect available player
# Prefer paplay over pw-play: pw-play from a different user causes
# PipeWire flat-volume side effects that drop the master volume.
AUDIO_PLAYER=""
AUDIO_PLAYER_ARGS=()
# Detect the desktop user's default sink so we play on the right device
# (receiver user may not share the same default)
_default_sink=$(pactl get-default-sink 2>/dev/null || true)

if command -v paplay &>/dev/null; then
  AUDIO_PLAYER="paplay"
  [[ -n "$_default_sink" ]] && AUDIO_PLAYER_ARGS=(--device="$_default_sink")
elif command -v pw-play &>/dev/null; then
  AUDIO_PLAYER="pw-play"
  [[ -n "$_default_sink" ]] && AUDIO_PLAYER_ARGS=(--target="$_default_sink")
elif command -v aplay &>/dev/null; then
  AUDIO_PLAYER="aplay"
fi

# ---------------------------------------------------------------------------
# Input parsing
# ---------------------------------------------------------------------------

ENCODED_PAYLOAD="${1:-}"

if [[ -z "$ENCODED_PAYLOAD" ]]; then
  echo "Error: No payload provided" >&2
  echo "Usage: $0 <base64-encoded-json-or-text> [voice]" >&2
  exit 1
fi

# SECURITY: Validate base64 format (reject shell metacharacters)
if [[ ! "$ENCODED_PAYLOAD" =~ ^[A-Za-z0-9+/=]+$ ]]; then
  echo "Error: Payload must be base64-encoded" >&2
  exit 1
fi

# Decode base64
DECODED=$(printf '%s' "$ENCODED_PAYLOAD" | base64 -d 2>/dev/null) || {
  echo "Error: Failed to decode base64 payload" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Parse payload — JSON (v2) or plain text (legacy)
# ---------------------------------------------------------------------------

TEXT=""
VOICE="en_US-lessac-medium"
SOX_EFFECTS=""
BG_FILE=""
BG_VOLUME="0.10"
PROJECT=""
PRETEXT=""
SPEED=""

# Detect JSON payload (starts with '{')
if [[ "$DECODED" == "{"* ]]; then
  # JSON v2 payload — extract fields with lightweight parsing
  # SECURITY: Use parameter extraction, not eval
  if command -v jq &>/dev/null; then
    TEXT=$(printf '%s' "$DECODED" | jq -r '.text // empty' 2>/dev/null) || TEXT=""
    VOICE=$(printf '%s' "$DECODED" | jq -r '.voice // "en_US-lessac-medium"' 2>/dev/null) || VOICE="en_US-lessac-medium"
    SOX_EFFECTS=$(printf '%s' "$DECODED" | jq -r '.effects // empty' 2>/dev/null) || SOX_EFFECTS=""
    BG_FILE=$(printf '%s' "$DECODED" | jq -r '.music // empty' 2>/dev/null) || BG_FILE=""
    BG_VOLUME=$(printf '%s' "$DECODED" | jq -r '.volume // "0.10"' 2>/dev/null) || BG_VOLUME="0.10"
    PROJECT=$(printf '%s' "$DECODED" | jq -r '.project // empty' 2>/dev/null) || PROJECT=""
    PRETEXT=$(printf '%s' "$DECODED" | jq -r '.pretext // empty' 2>/dev/null) || PRETEXT=""
    SPEED=$(printf '%s' "$DECODED" | jq -r '.speed // empty' 2>/dev/null) || SPEED=""
  else
    # Fallback: extract with grep/sed (no jq available)
    TEXT=$(printf '%s' "$DECODED" | grep -o '"text"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    VOICE=$(printf '%s' "$DECODED" | grep -o '"voice"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    SOX_EFFECTS=$(printf '%s' "$DECODED" | grep -o '"effects"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    BG_FILE=$(printf '%s' "$DECODED" | grep -o '"music"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    BG_VOLUME=$(printf '%s' "$DECODED" | grep -o '"volume"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    PROJECT=$(printf '%s' "$DECODED" | grep -o '"project"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    PRETEXT=$(printf '%s' "$DECODED" | grep -o '"pretext"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    SPEED=$(printf '%s' "$DECODED" | grep -o '"speed"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    [[ -z "$VOICE" ]] && VOICE="en_US-lessac-medium"
    [[ -z "$BG_VOLUME" ]] && BG_VOLUME="0.10"
  fi
else
  # Legacy format: plain text, voice from positional arg
  TEXT="$DECODED"
  VOICE="${2:-en_US-lessac-medium}"
fi

# Validate required text
if [[ -z "$TEXT" ]]; then
  echo "Error: No text in payload" >&2
  exit 1
fi

# SECURITY: Validate voice format (alphanumeric, hyphens, underscores only)
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo "Error: Invalid voice format" >&2
  exit 1
fi

# SECURITY: Validate volume is a number
if [[ -n "$BG_VOLUME" ]] && [[ ! "$BG_VOLUME" =~ ^[0-9]+\.?[0-9]*$ ]]; then
  BG_VOLUME="0.10"
fi

# Prepend pretext if provided
if [[ -n "$PRETEXT" ]]; then
  TEXT="${PRETEXT}. ${TEXT}"
fi

# ---------------------------------------------------------------------------
# Structured logging (for receiver tab to display)
# ---------------------------------------------------------------------------

LOG_ID=$(printf '%04x' $((RANDOM % 65536)))

log_message() {
  local status="$1"
  local detail="${2:-}"
  local timestamp
  timestamp=$(date '+%Y-%m-%dT%H:%M:%S')
  local log_dir
  log_dir=$(dirname "$LOG_FILE")
  mkdir -p "$log_dir" 2>/dev/null || true
  # Extract sender IP from SSH_CLIENT (set by sshd: "IP PORT PORT")
  local sender_ip="${SSH_CLIENT%% *}"
  [[ -z "$sender_ip" ]] && sender_ip="local"
  # Format: TIMESTAMP|STATUS|PROJECT|VOICE|TEXT_PREVIEW|DETAIL|IP|LOG_ID
  local preview="${TEXT:0:60}"
  printf '%s|%s|%s|%s|%s|%s|%s|%s\n' \
    "$timestamp" "$status" "${PROJECT:-unknown}" "$VOICE" "$preview" "$detail" "$sender_ip" "$LOG_ID" \
    >> "$LOG_FILE" 2>/dev/null || true
}

log_message "RECEIVED" "effects=${SOX_EFFECTS:-none} music=${BG_FILE:-none}"

# ---------------------------------------------------------------------------
# Temp files with cleanup
# ---------------------------------------------------------------------------

# Use own runtime dir for temp files (not the desktop user's)
_TEMP_BASE="/run/user/$(id -u)"
[[ -d "$_TEMP_BASE" ]] && [[ -w "$_TEMP_BASE" ]] || _TEMP_BASE="/tmp"
RAW_WAV=$(mktemp "$_TEMP_BASE/agentvibes-recv-XXXXXX.wav")
EFFECTS_WAV=$(mktemp "$_TEMP_BASE/agentvibes-recv-fx-XXXXXX.wav")
FINAL_WAV=$(mktemp "$_TEMP_BASE/agentvibes-recv-final-XXXXXX.wav")
trap 'rm -f "$RAW_WAV" "$EFFECTS_WAV" "$FINAL_WAV"' EXIT

# ---------------------------------------------------------------------------
# Step 1: Generate TTS with piper
# ---------------------------------------------------------------------------

MODEL="$VOICES_DIR/${VOICE}.onnx"
if [[ ! -f "$MODEL" ]]; then
  # Fallback: try any available voice rather than failing
  FALLBACK_MODEL=$(find "$VOICES_DIR" -maxdepth 1 -name '*.onnx' -type f 2>/dev/null | head -1)
  if [[ -n "$FALLBACK_MODEL" ]]; then
    FALLBACK_VOICE=$(basename "$FALLBACK_MODEL" .onnx)
    log_message "WARN" "Voice $VOICE not found, falling back to $FALLBACK_VOICE"
    echo "Warning: Voice $VOICE not found, using $FALLBACK_VOICE" >&2
    VOICE="$FALLBACK_VOICE"
    MODEL="$FALLBACK_MODEL"
  else
    log_message "ERROR" "No voice models found in $VOICES_DIR"
    echo "Error: No voice models found in $VOICES_DIR" >&2
    exit 1
  fi
fi

PIPER_ARGS=(--model "$MODEL" --output_file "$RAW_WAV")

# Add speed/length_scale if provided
if [[ -n "$SPEED" ]] && [[ "$SPEED" =~ ^[0-9]+\.?[0-9]*$ ]]; then
  PIPER_ARGS+=(--length_scale "$SPEED")
fi

echo "$TEXT" | piper "${PIPER_ARGS[@]}" 2>/dev/null || {
  log_message "ERROR" "Piper TTS failed"
  echo "Error: Piper TTS generation failed" >&2
  exit 1
}

PLAY_FILE="$RAW_WAV"

# ---------------------------------------------------------------------------
# Step 2: Apply sox effects (reverb, EQ, etc.)
# ---------------------------------------------------------------------------

if [[ -n "$SOX_EFFECTS" ]] && command -v sox &>/dev/null; then
  # SECURITY: sox effects are from sender config, validated at sender side
  sox "$RAW_WAV" "$EFFECTS_WAV" $SOX_EFFECTS 2>/dev/null && PLAY_FILE="$EFFECTS_WAV"
fi

# ---------------------------------------------------------------------------
# Step 3: Mix background music (if configured)
# ---------------------------------------------------------------------------

if [[ -n "$BG_FILE" ]] && command -v ffmpeg &>/dev/null; then
  BG_PATH="$TRACKS_DIR/$BG_FILE"
  if [[ -f "$BG_PATH" ]]; then
    DURATION=$(ffprobe -v error -show_entries format=duration \
      -of default=noprint_wrappers=1:nokey=1 "$PLAY_FILE" 2>/dev/null || echo "")
    if [[ -n "$DURATION" ]]; then
      TOTAL_DUR=$(awk "BEGIN {printf \"%.2f\", $DURATION + 2}")
      FADE_OUT=$(awk "BEGIN {printf \"%.2f\", $DURATION}")
      timeout 20 ffmpeg -y -i "$PLAY_FILE" -stream_loop -1 -i "$BG_PATH" \
        -filter_complex "[1:a]volume=${BG_VOLUME},afade=t=in:st=0:d=0.3,afade=t=out:st=${FADE_OUT}:d=2[bg];[0:a]adelay=2000|2000[v];[v][bg]amix=inputs=2:duration=longest[out]" \
        -map "[out]" -t "$TOTAL_DUR" "$FINAL_WAV" </dev/null 2>/dev/null && PLAY_FILE="$FINAL_WAV"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Step 4: Play audio in foreground (required for SSH — no backgrounding)
# ---------------------------------------------------------------------------

if [[ -z "$AUDIO_PLAYER" ]]; then
  log_message "ERROR" "No audio player found (pw-play, paplay, aplay)"
  echo "Error: No audio player available" >&2
  exit 1
fi

log_message "PLAYING" "player=$AUDIO_PLAYER"

# Save master volume before playback — flat-volumes in PipeWire/PulseAudio
# can change master volume when a new stream connects from another user.
_saved_vol=""
if command -v pactl &>/dev/null; then
  _saved_vol=$(pactl get-sink-volume @DEFAULT_SINK@ 2>/dev/null | grep -o '[0-9]*%' | head -1)
fi

_play_err=$($AUDIO_PLAYER "${AUDIO_PLAYER_ARGS[@]}" "$PLAY_FILE" 2>&1) || {
  log_message "ERROR" "Playback failed with $AUDIO_PLAYER: $_play_err"
  echo "Error: Audio playback failed" >&2
  echo "Detail: $_play_err" >&2
  exit 1
}

# Restore master volume to what it was before playback
if [[ -n "$_saved_vol" ]] && command -v pactl &>/dev/null; then
  pactl set-sink-volume @DEFAULT_SINK@ "$_saved_vol" 2>/dev/null || true
fi

log_message "DONE" ""
exit 0
