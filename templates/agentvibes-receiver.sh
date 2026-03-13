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
# Pipeline: TTS (piper|soprano|macos|windows-sapi) → sox effects → ffmpeg music mix → audio player
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
  # Detect if we're the dedicated receiver user — always use TCP to reach
  # the desktop user's audio session, even if we have our own pulse socket.
  _is_receiver_user=false
  [[ "$(whoami)" == "agentvibes-receiver" ]] && _is_receiver_user=true

  if [[ "$_is_receiver_user" == true ]]; then
    # Dedicated receiver user — must use TCP to desktop user's PipeWire-Pulse
    export PULSE_SERVER="tcp:127.0.0.1:$AGENTVIBES_PULSE_PORT"
  elif [[ -e "$_own_runtime/pulse/native" ]]; then
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

# Check for user-configured sink (set via TUI receiver tab [S] key)
SINK_CONFIG="${AGENTVIBES_RECEIVER_SINK:-$HOME/.agentvibes/receiver-sink.txt}"
_default_sink=""
if [[ -f "$SINK_CONFIG" ]]; then
  _configured_sink=$(head -1 "$SINK_CONFIG" 2>/dev/null | tr -d '[:space:]')
  # Validate sink name format (alphanumeric, hyphens, underscores, dots)
  if [[ -n "$_configured_sink" ]] && [[ "$_configured_sink" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    _default_sink="$_configured_sink"
  fi
fi
# Fall back to system default if no valid config
if [[ -z "$_default_sink" ]]; then
  _default_sink=$(pactl get-default-sink 2>/dev/null || true)
fi

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
PROVIDER="piper"

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
    PROVIDER=$(printf '%s' "$DECODED" | jq -r '.provider // "piper"' 2>/dev/null) || PROVIDER="piper"
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
    PROVIDER=$(printf '%s' "$DECODED" | grep -o '"provider"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)
    [[ -z "$VOICE" ]] && VOICE="en_US-lessac-medium"
    [[ -z "$BG_VOLUME" ]] && BG_VOLUME="0.10"
    [[ -z "$PROVIDER" ]] && PROVIDER="piper"
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

# SECURITY: Validate provider format (known providers only)
case "$PROVIDER" in
  piper|soprano|macos|windows-sapi) ;;
  *) PROVIDER="piper" ;;
esac

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
  local preview="$TEXT"
  printf '%s|%s|%s|%s|%s|%s|%s|%s\n' \
    "$timestamp" "$status" "${PROJECT:-unknown}" "$VOICE" "$preview" "$detail" "$sender_ip" "$LOG_ID" \
    >> "$LOG_FILE" 2>/dev/null || true
}

log_message "RECEIVED" "provider=${PROVIDER} effects=${SOX_EFFECTS:-none} music=${BG_FILE:-none}"

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
# Step 1: Generate TTS audio (multi-provider dispatch)
# ---------------------------------------------------------------------------

_generate_tts_piper() {
  local model="$VOICES_DIR/${VOICE}.onnx"
  if [[ ! -f "$model" ]]; then
    # Fallback: try any available voice rather than failing
    local fallback
    fallback=$(find "$VOICES_DIR" -maxdepth 1 -name '*.onnx' -type f 2>/dev/null | head -1)
    if [[ -n "$fallback" ]]; then
      local fallback_name
      fallback_name=$(basename "$fallback" .onnx)
      log_message "WARN" "Voice $VOICE not found, falling back to $fallback_name"
      echo "Warning: Voice $VOICE not found, using $fallback_name" >&2
      VOICE="$fallback_name"
      model="$fallback"
    else
      log_message "ERROR" "No voice models found in $VOICES_DIR"
      echo "Error: No voice models found in $VOICES_DIR" >&2
      return 1
    fi
  fi

  local args=(--model "$model" --output_file "$RAW_WAV")
  if [[ -n "$SPEED" ]] && [[ "$SPEED" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    args+=(--length_scale "$SPEED")
  fi

  echo "$TEXT" | piper "${args[@]}" 2>/dev/null || {
    log_message "ERROR" "Piper TTS failed"
    echo "Error: Piper TTS generation failed" >&2
    return 1
  }
}

_generate_tts_soprano() {
  local soprano_port="${SOPRANO_PORT:-7860}"

  # Try API mode first (OpenAI-compatible endpoint)
  if curl -sf -X POST "http://127.0.0.1:${soprano_port}/v1/audio/speech" \
    -H "Content-Type: application/json" \
    -d "{\"input\":$(printf '%s' "$TEXT" | jq -Rs .)}" \
    --output "$RAW_WAV" 2>/dev/null; then
    return 0
  fi

  # Try CLI mode
  if command -v soprano &>/dev/null; then
    soprano "$TEXT" -o "$RAW_WAV" 2>/dev/null && return 0
  fi

  log_message "ERROR" "Soprano TTS failed — is soprano running on port ${soprano_port}?"
  echo "Error: Soprano TTS unavailable (tried API and CLI)" >&2
  return 1
}

_generate_tts_macos() {
  if ! command -v say &>/dev/null; then
    log_message "ERROR" "macOS say command not found"
    echo "Error: macOS say command not available" >&2
    return 1
  fi

  local say_args=(-v "$VOICE")
  # Convert speed multiplier to WPM (say uses WPM, default ~200)
  if [[ -n "$SPEED" ]] && [[ "$SPEED" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    local wpm
    wpm=$(awk "BEGIN {printf \"%d\", 200 * $SPEED}")
    say_args+=(-r "$wpm")
  fi

  # say outputs AIFF — convert to WAV for consistent pipeline
  local aiff_tmp="${RAW_WAV%.wav}.aiff"
  echo "$TEXT" | say "${say_args[@]}" -o "$aiff_tmp" 2>/dev/null || {
    log_message "ERROR" "macOS say failed"
    rm -f "$aiff_tmp"
    return 1
  }

  if command -v ffmpeg &>/dev/null; then
    ffmpeg -y -i "$aiff_tmp" "$RAW_WAV" </dev/null 2>/dev/null
    rm -f "$aiff_tmp"
  else
    # No ffmpeg — rename and hope player handles AIFF
    mv "$aiff_tmp" "$RAW_WAV"
  fi
}

_generate_tts_windows_sapi() {
  # Windows SAPI via PowerShell (works in WSL2 via powershell.exe)
  local ps_cmd=""
  if command -v powershell.exe &>/dev/null; then
    ps_cmd="powershell.exe"
  elif command -v pwsh &>/dev/null; then
    ps_cmd="pwsh"
  else
    log_message "ERROR" "PowerShell not found for Windows SAPI"
    echo "Error: PowerShell required for Windows SAPI" >&2
    return 1
  fi

  # SECURITY: Escape text for PowerShell single-quoted string
  local escaped_text
  escaped_text=$(printf '%s' "$TEXT" | sed "s/'/''/g")

  local rate=0
  if [[ -n "$SPEED" ]] && [[ "$SPEED" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    # SAPI rate: -10 to 10, 0 is normal. Speed 1.0=0, 2.0=5, 0.5=-5
    rate=$(awk "BEGIN {r = ($SPEED - 1.0) * 10; if (r > 10) r = 10; if (r < -10) r = -10; printf \"%d\", r}")
  fi

  $ps_cmd -NoProfile -Command "
    Add-Type -AssemblyName System.Speech
    \$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    \$synth.Rate = $rate
    \$synth.SetOutputToWaveFile('$(wslpath -w "$RAW_WAV" 2>/dev/null || echo "$RAW_WAV")')
    \$synth.Speak('$escaped_text')
    \$synth.Dispose()
  " 2>/dev/null || {
    log_message "ERROR" "Windows SAPI TTS failed"
    echo "Error: Windows SAPI generation failed" >&2
    return 1
  }
}

# Dispatch to the appropriate TTS provider
case "$PROVIDER" in
  piper)
    _generate_tts_piper || exit 1
    ;;
  soprano)
    _generate_tts_soprano || exit 1
    ;;
  macos)
    _generate_tts_macos || exit 1
    ;;
  windows-sapi)
    _generate_tts_windows_sapi || exit 1
    ;;
  *)
    log_message "ERROR" "Unknown provider: $PROVIDER"
    echo "Error: Unknown TTS provider: $PROVIDER" >&2
    exit 1
    ;;
esac

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

# Save master volume before playback — flat-volumes in PipeWire/PulseAudio
# can change master volume when a new stream connects from another user.
_saved_vol=""
if command -v pactl &>/dev/null; then
  _saved_vol=$(pactl get-sink-volume @DEFAULT_SINK@ 2>/dev/null | grep -o '[0-9]*%' | head -1)
fi

log_message "PLAYING" "player=$AUDIO_PLAYER sink=${_default_sink:-unknown} vol=${_saved_vol:-?} pulse=${PULSE_SERVER:-unset}"

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
