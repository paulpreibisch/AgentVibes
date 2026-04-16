#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-ssh-remote.sh
#
# AgentVibes - SSH-Remote TTS Provider (v2 — JSON payload)
# Sends text + effects config to remote device via SSH for local playback
#
# The sender reads local audio-effects.cfg and bundles everything into a
# single base64-encoded JSON payload. The receiver is a thin executor.
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0
#

set -euo pipefail

# ---------------------------------------------------------------------------
# Argument parsing — supports both positional (backward compat) and flags.
#
# Positional (legacy):
#   play-tts-ssh-remote.sh "text" [voice] [agent_name]
#
# Flag-based (full per-call control):
#   play-tts-ssh-remote.sh --text "hello" --voice "en_US-ryan-high" \
#                          --pretext "Winston here" --music "track.mp3" \
#                          --volume 0.25 --effects "reverb 40 60 80" \
#                          --speed 1.1 --provider piper --agent "winston"
#
# Flags override config-file values.  Any flag omitted → falls back to config.
# --pretext "" (empty string) explicitly suppresses pretext (no fallback).
# ---------------------------------------------------------------------------

TEXT=""
VOICE=""
AGENT_NAME=""
PRETEXT_OVERRIDE=""
PRETEXT_SET=0           # whether --pretext was explicitly provided
MUSIC_OVERRIDE=""
VOLUME_OVERRIDE=""
EFFECTS_OVERRIDE=""
SPEED_OVERRIDE=""
PROVIDER_OVERRIDE=""

# Detect flag-based vs positional usage: if first arg starts with --, use flags.
if [[ "${1:-}" == --* ]]; then
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --text)     TEXT="${2:-}"; shift 2 ;;
      --voice)    VOICE="${2:-}"; shift 2 ;;
      --agent)    AGENT_NAME="${2:-}"; shift 2 ;;
      --pretext)  PRETEXT_OVERRIDE="${2:-}"; PRETEXT_SET=1; shift 2 ;;
      --music)    MUSIC_OVERRIDE="${2:-}"; shift 2 ;;
      --volume)   VOLUME_OVERRIDE="${2:-}"; shift 2 ;;
      --effects)  EFFECTS_OVERRIDE="${2:-}"; shift 2 ;;
      --speed)    SPEED_OVERRIDE="${2:-}"; shift 2 ;;
      --provider) PROVIDER_OVERRIDE="${2:-}"; shift 2 ;;
      *)          echo "Unknown flag: $1" >&2; exit 1 ;;
    esac
  done
else
  TEXT="${1:-}"
  VOICE="${2:-}"
  AGENT_NAME="${3:-}"
fi

# Defaults for still-empty values
VOICE="${VOICE:-en_US-lessac-medium}"
AGENT_NAME="${AGENT_NAME:-default}"

# Validate required input
if [[ -z "$TEXT" ]]; then
  echo "Usage (positional): $0 <text> [voice] [agent_name]" >&2
  echo "Usage (flags):      $0 --text <text> [--voice X --pretext Y --music Z --volume N --effects E --speed S --provider P --agent A]" >&2
  exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Derive project name from directory
PROJECT_NAME=$(basename "$PROJECT_ROOT")

# ---------------------------------------------------------------------------
# Get SSH host from config
# ---------------------------------------------------------------------------

SSH_HOST=$(cat "$PROJECT_ROOT/.claude/ssh-remote-host.txt" 2>/dev/null || \
           cat "$HOME/.claude/ssh-remote-host.txt" 2>/dev/null || echo "")

if [[ -z "$SSH_HOST" ]]; then
  echo "SSH-Remote host not configured" >&2
  echo "Set host: echo 'my-host' > .claude/ssh-remote-host.txt" >&2
  exit 1
fi

# SECURITY: Validate SSH_HOST format
if [[ ! "$SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]; then
  echo "Invalid SSH host format: $SSH_HOST" >&2
  exit 1
fi

# SECURITY: Validate VOICE (allow :: for multi-speaker, . for locale, space for names)
_voice_re='^[a-zA-Z0-9_.:  -]+$'
if [[ ! "$VOICE" =~ $_voice_re ]]; then
  echo "Invalid voice format: $VOICE" >&2
  exit 1
fi

# SECURITY: Validate AGENT_NAME
if [[ ! "$AGENT_NAME" =~ ^[a-zA-Z0-9_\ -]+$ ]]; then
  echo "Invalid agent name format: $AGENT_NAME" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Read audio effects config for this agent
# ---------------------------------------------------------------------------

SOX_EFFECTS=""
BG_FILE=""
BG_VOLUME="0.10"

EFFECTS_CFG="$PROJECT_ROOT/.claude/config/audio-effects.cfg"
if [[ -f "$EFFECTS_CFG" ]]; then
  CONFIG_LINE=$(grep "^${AGENT_NAME}|" "$EFFECTS_CFG" 2>/dev/null || \
                grep "^default|" "$EFFECTS_CFG" 2>/dev/null || true)
  if [[ -n "$CONFIG_LINE" ]]; then
    IFS='|' read -r _ SOX_EFFECTS BG_FILE BG_VOLUME <<< "$CONFIG_LINE"
  fi
fi

# Read pretext if configured
PRETEXT=""
PRETEXT_FILE="$PROJECT_ROOT/.agentvibes/config/pretext.txt"
if [[ -f "$PRETEXT_FILE" ]]; then
  PRETEXT=$(cat "$PRETEXT_FILE" 2>/dev/null || true)
fi

# Read speed if configured
SPEED=""
SPEED_FILE="$PROJECT_ROOT/.agentvibes/config/speed.txt"
if [[ -f "$SPEED_FILE" ]]; then
  SPEED=$(cat "$SPEED_FILE" 2>/dev/null || true)
fi

# Read the TTS provider the RECEIVER should use to generate audio.
# This is separate from the sender's own provider (which is "ssh-remote").
# Check receiver-provider.txt first, then fall back to "piper".
PROVIDER=""
RECEIVER_PROVIDER_FILE="$PROJECT_ROOT/.agentvibes/config/receiver-provider.txt"
if [[ -f "$RECEIVER_PROVIDER_FILE" ]]; then
  PROVIDER=$(cat "$RECEIVER_PROVIDER_FILE" 2>/dev/null || true)
fi
# Also check home-level config
if [[ -z "$PROVIDER" ]]; then
  RECEIVER_PROVIDER_FILE="$HOME/.agentvibes/config/receiver-provider.txt"
  if [[ -f "$RECEIVER_PROVIDER_FILE" ]]; then
    PROVIDER=$(cat "$RECEIVER_PROVIDER_FILE" 2>/dev/null || true)
  fi
fi
# Validate — only known TTS providers (not transport providers like ssh-remote)
case "${PROVIDER:-}" in
  piper|soprano|macos|windows-sapi) ;;
  *) PROVIDER="piper" ;;
esac

# ---------------------------------------------------------------------------
# Apply CLI flag overrides (flags win over config files)
# ---------------------------------------------------------------------------
[[ -n "$EFFECTS_OVERRIDE"  ]] && SOX_EFFECTS="$EFFECTS_OVERRIDE"
[[ -n "$MUSIC_OVERRIDE"    ]] && BG_FILE="$MUSIC_OVERRIDE"
[[ -n "$VOLUME_OVERRIDE"   ]] && BG_VOLUME="$VOLUME_OVERRIDE"
[[ -n "$SPEED_OVERRIDE"    ]] && SPEED="$SPEED_OVERRIDE"
[[ -n "$PROVIDER_OVERRIDE" ]] && PROVIDER="$PROVIDER_OVERRIDE"
# Pretext: explicit --pretext wins even when empty string (suppresses pretext)
if [[ "$PRETEXT_SET" == "1" ]]; then
  PRETEXT="$PRETEXT_OVERRIDE"
fi

# Re-validate provider after override (in case user passed bad value)
case "${PROVIDER:-}" in
  piper|soprano|macos|windows-sapi) ;;
  *) PROVIDER="piper" ;;
esac
# Validate music filename (prevent path injection through JSON → receiver)
# Allows spaces in track names like "Late Night Hip Hop Groove.mp3"
if [[ -n "$BG_FILE" && ! "$BG_FILE" =~ ^[a-zA-Z0-9_\.\ -]+$ ]]; then
  echo "Invalid music filename format: $BG_FILE (alphanumeric/space/.-_ only)" >&2
  exit 1
fi
# Validate volume
if [[ -n "$BG_VOLUME" && ! "$BG_VOLUME" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  echo "Invalid volume: $BG_VOLUME (numeric only)" >&2
  exit 1
fi
# Validate speed
if [[ -n "$SPEED" && ! "$SPEED" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  echo "Invalid speed: $SPEED (numeric only)" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Build JSON payload
# ---------------------------------------------------------------------------

# SECURITY: Use jq if available for safe JSON construction, else manual escaping
build_json_payload() {
  if command -v jq &>/dev/null; then
    jq -n \
      --arg text "$TEXT" \
      --arg voice "$VOICE" \
      --arg effects "$SOX_EFFECTS" \
      --arg music "$BG_FILE" \
      --arg volume "$BG_VOLUME" \
      --arg project "$PROJECT_NAME" \
      --arg pretext "$PRETEXT" \
      --arg speed "$SPEED" \
      --arg provider "$PROVIDER" \
      '{text: $text, voice: $voice, effects: $effects, music: $music, volume: $volume, project: $project, pretext: $pretext, speed: $speed, provider: $provider}'
  else
    # Manual JSON — escape double quotes and backslashes in text
    local escaped_text
    escaped_text=$(printf '%s' "$TEXT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g')
    local escaped_pretext
    escaped_pretext=$(printf '%s' "$PRETEXT" | sed 's/\\/\\\\/g; s/"/\\"/g')
    printf '{"text":"%s","voice":"%s","effects":"%s","music":"%s","volume":"%s","project":"%s","pretext":"%s","speed":"%s","provider":"%s"}' \
      "$escaped_text" "$VOICE" "$SOX_EFFECTS" "$BG_FILE" "$BG_VOLUME" "$PROJECT_NAME" "$escaped_pretext" "$SPEED" "$PROVIDER"
  fi
}

JSON_PAYLOAD=$(build_json_payload)

# SECURITY: Base64-encode entire payload — safe for SSH transport
# base64 -w 0 is Linux (GNU coreutils), -b 0 is macOS (BSD)
if base64 --help 2>&1 | grep -q '\-w'; then
  ENCODED_PAYLOAD=$(printf '%s' "$JSON_PAYLOAD" | base64 -w 0)
else
  ENCODED_PAYLOAD=$(printf '%s' "$JSON_PAYLOAD" | base64 -b 0 2>/dev/null || printf '%s' "$JSON_PAYLOAD" | base64 | tr -d '\n')
fi

# ---------------------------------------------------------------------------
# Send to receiver via SSH (fire and forget — backgrounded)
# ---------------------------------------------------------------------------

echo "Sending to $SSH_HOST..." >&2

# ForceCommand receiver: SSH_ORIGINAL_COMMAND passes the payload directly
ssh "$SSH_HOST" "$ENCODED_PAYLOAD" &
SSH_PID=$!

echo "Sent to $SSH_HOST (PID: $SSH_PID)" >&2
exit 0
