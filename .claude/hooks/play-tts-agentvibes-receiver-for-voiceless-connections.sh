#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-agentvibes-receiver-for-voiceless-connections.sh
#
# AgentVibes - AgentVibes Receiver Provider (for voiceless connections)
# Sends text to a remote device via SSH for local AgentVibes playback.
# Use this when the AI agent runs on a server/headless machine that has no
# audio output — the remote device (laptop, phone, etc.) plays the audio.
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0
#

set -euo pipefail

TEXT="${1:-}"
VOICE="${2:-en_US-lessac-medium}"
AGENT_NAME="${3:-default}"

# Validate required input
if [[ -z "$TEXT" ]]; then
  echo "❌ No text provided" >&2
  echo "Usage: $0 <text> [voice] [agent_name]" >&2
  exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ---------------------------------------------------------------------------
# Get SSH connection details from config
# Prefer ~/.agentvibes/transport-config.json, fall back to legacy host file
# ---------------------------------------------------------------------------

SSH_HOST=""
SSH_KEY=""
SSH_PORT=""

_TRANSPORT_CFG="$HOME/.agentvibes/transport-config.json"
if [[ -f "$_TRANSPORT_CFG" ]] && command -v python3 &>/dev/null; then
  SSH_HOST=$(python3 -c "import json; d=json.load(open('$_TRANSPORT_CFG')); p=d.get('agentvibes-receiver',{}); print(p.get('host',''))" 2>/dev/null || echo "")
  SSH_KEY=$(python3  -c "import json; d=json.load(open('$_TRANSPORT_CFG')); p=d.get('agentvibes-receiver',{}); print(p.get('sshKey',''))" 2>/dev/null || echo "")
  SSH_PORT=$(python3 -c "import json; d=json.load(open('$_TRANSPORT_CFG')); p=d.get('agentvibes-receiver',{}); print(p.get('port',''))" 2>/dev/null || echo "")
fi

if [[ -z "$SSH_HOST" ]]; then
  SSH_HOST=$(cat "$PROJECT_ROOT/.claude/agentvibes-receiver-host.txt" 2>/dev/null || \
             cat "$HOME/.claude/agentvibes-receiver-host.txt" 2>/dev/null || echo "")
fi

if [[ -z "$SSH_HOST" ]]; then
  echo "❌ AgentVibes Receiver host not configured" >&2
  echo "💡 Configure in AgentVibes Setup → Audio Transport → AgentVibes Receiver → Configure" >&2
  exit 1
fi

# SECURITY: Validate SSH_HOST to prevent option injection
if [[ ! "$SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]; then
  echo "❌ Invalid SSH host format: $SSH_HOST" >&2
  echo "💡 Host must be alphanumeric (may contain dots, hyphens, underscores)" >&2
  exit 1
fi

# SECURITY: Validate SSH_KEY path (must be absolute)
if [[ -n "$SSH_KEY" ]] && [[ ! "$SSH_KEY" =~ ^/ ]]; then SSH_KEY=""; fi

# SECURITY: Validate SSH_PORT (digits only)
if [[ -n "$SSH_PORT" ]] && [[ ! "$SSH_PORT" =~ ^[0-9]+$ ]]; then SSH_PORT=""; fi

# SECURITY: Validate VOICE (allow :: for multi-speaker, . for locale, space for names)
_voice_re='^[a-zA-Z0-9_.:  -]+$'
if [[ ! "$VOICE" =~ $_voice_re ]]; then
  echo "❌ Invalid voice format: $VOICE" >&2
  exit 1
fi

# SECURITY: Validate AGENT_NAME to prevent injection (alphanumeric, hyphens, underscores, spaces only)
if [[ ! "$AGENT_NAME" =~ ^[a-zA-Z0-9_\ -]+$ ]]; then
  echo "❌ Invalid agent name format: $AGENT_NAME" >&2
  exit 1
fi

# SECURITY: Encode text and agent name as base64 to prevent command injection
# The receiver will decode these safely
# Probe for GNU base64 (-w 0), fall back to BSD (-b 0), then tr
if printf '' | base64 -w 0 >/dev/null 2>&1; then
  ENCODED_TEXT=$(printf '%s' "$TEXT" | base64 -w 0)
  ENCODED_AGENT=$(printf '%s' "$AGENT_NAME" | base64 -w 0)
else
  ENCODED_TEXT=$(printf '%s' "$TEXT" | base64 -b 0 2>/dev/null || printf '%s' "$TEXT" | base64 | tr -d '\n')
  ENCODED_AGENT=$(printf '%s' "$AGENT_NAME" | base64 -b 0 2>/dev/null || printf '%s' "$AGENT_NAME" | base64 | tr -d '\n')
fi

# Send text to remote for local AgentVibes playback
echo "📱 Sending to $SSH_HOST for local playback..." >&2

# Build SSH args — use explicit key/port from config if available, else rely on ~/.ssh/config
SSH_ARGS=()
[[ -n "$SSH_KEY"  && -f "$SSH_KEY"  ]] && SSH_ARGS+=(-i "$SSH_KEY")
[[ -n "$SSH_PORT" ]] && SSH_ARGS+=(-p "$SSH_PORT")

# Try receiver scripts in order — single SSH call, no separate probe
# SECURITY: Base64-encoded values are safe to pass as arguments (no shell metacharacters)
ssh "${SSH_ARGS[@]}" "$SSH_HOST" "
  if [ -f ~/.agentvibes/play-remote.sh ]; then
    bash ~/.agentvibes/play-remote.sh '$ENCODED_TEXT' '$VOICE' '$ENCODED_AGENT'
  elif [ -f ~/.termux/agentvibes-play.sh ]; then
    bash ~/.termux/agentvibes-play.sh '$ENCODED_TEXT' '$VOICE' '$ENCODED_AGENT'
  else
    echo 'Error: Receiver script not found' >&2
    exit 1
  fi
" &
SSH_PID=$!

echo "Sent to $SSH_HOST (PID: $SSH_PID)" >&2
exit 0
