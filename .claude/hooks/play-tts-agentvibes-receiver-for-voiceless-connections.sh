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

# Get SSH host from config
SSH_HOST=$(cat "$PROJECT_ROOT/.claude/agentvibes-receiver-host.txt" 2>/dev/null || \
           cat "$HOME/.claude/agentvibes-receiver-host.txt" 2>/dev/null || echo "")

if [[ -z "$SSH_HOST" ]]; then
  echo "❌ AgentVibes Receiver host not configured" >&2
  echo "💡 Set host: echo 'your-device' > ~/.claude/agentvibes-receiver-host.txt" >&2
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

# Determine which receiver script exists and send encoded text, voice, and agent name
# SECURITY: Base64-encoded values are safe to pass as arguments (no shell metacharacters)
# The receiver auto-detects and decodes base64 input
if ssh "$SSH_HOST" "test -f ~/.termux/agentvibes-play.sh" 2>/dev/null; then
  ssh "$SSH_HOST" "bash ~/.termux/agentvibes-play.sh '$ENCODED_TEXT' '$VOICE' '$ENCODED_AGENT'" &
  SSH_PID=$!
elif ssh "$SSH_HOST" "test -f ~/.agentvibes/play-remote.sh" 2>/dev/null; then
  ssh "$SSH_HOST" "bash ~/.agentvibes/play-remote.sh '$ENCODED_TEXT' '$VOICE' '$ENCODED_AGENT'" &
  SSH_PID=$!
else
  echo "⚠️  Receiver script not found on $SSH_HOST" >&2
  echo "💡 Install: agentvibes install --ssh-receiver" >&2
  exit 1
fi

# Log the background PID for debugging (non-blocking)
echo "✓ Sent to $SSH_HOST (PID: $SSH_PID, playing remotely)" >&2
exit 0
