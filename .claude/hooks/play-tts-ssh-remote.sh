#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-ssh-remote.sh
#
# AgentVibes - SSH-Remote TTS Provider
# Sends text to remote device via SSH for local AgentVibes playback
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

# Get SSH host from config
SSH_HOST=$(cat "$PROJECT_ROOT/.claude/ssh-remote-host.txt" 2>/dev/null || \
           cat "$HOME/.claude/ssh-remote-host.txt" 2>/dev/null || echo "")

if [[ -z "$SSH_HOST" ]]; then
  echo "❌ SSH-Remote host not configured" >&2
  echo "💡 Set host: echo 'android' > ~/.claude/ssh-remote-host.txt" >&2
  exit 1
fi

# SECURITY: Validate SSH_HOST to prevent option injection
# Must be a valid hostname, IP address, or SSH config alias (alphanumeric, dots, hyphens, underscores)
if [[ ! "$SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]; then
  echo "❌ Invalid SSH host format: $SSH_HOST" >&2
  echo "💡 Host must be alphanumeric (may contain dots, hyphens, underscores)" >&2
  exit 1
fi

# SECURITY: Reject hosts starting with hyphen (SSH option injection)
if [[ "$SSH_HOST" == -* ]]; then
  echo "❌ Invalid SSH host: cannot start with hyphen" >&2
  exit 1
fi

# SECURITY: Validate VOICE to prevent injection (alphanumeric, hyphens, underscores only)
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
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
ENCODED_TEXT=$(printf '%s' "$TEXT" | base64 -w 0)
ENCODED_AGENT=$(printf '%s' "$AGENT_NAME" | base64 -w 0)

# Send text to remote for local AgentVibes playback
echo "📱 Sending to $SSH_HOST for local playback..." >&2

# Try receiver scripts in order — single SSH call, no separate probe
# SECURITY: Base64-encoded values are safe to pass as arguments (no shell metacharacters)
ssh "$SSH_HOST" "
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
