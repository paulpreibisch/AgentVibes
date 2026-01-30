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

TEXT="$1"
VOICE="${2:-en_US-lessac-medium}"

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

# Sanitize text for SSH transmission (escape single quotes)
SANITIZED_TEXT="${TEXT//\'/\'\\\'\'}"

# Send text to remote for local AgentVibes playback
echo "📱 Sending to $SSH_HOST for local playback..." >&2

# Use agentvibes-play receiver if available, fallback to direct play-tts
if ssh "$SSH_HOST" "test -f ~/.termux/agentvibes-play.sh" 2>/dev/null; then
  ssh "$SSH_HOST" "bash ~/.termux/agentvibes-play.sh '$SANITIZED_TEXT' '$VOICE'" &
elif ssh "$SSH_HOST" "test -f ~/.agentvibes/play-remote.sh" 2>/dev/null; then
  ssh "$SSH_HOST" "bash ~/.agentvibes/play-remote.sh '$SANITIZED_TEXT' '$VOICE'" &
else
  echo "⚠️  Receiver script not found on $SSH_HOST" >&2
  echo "💡 Install: agentvibes install --ssh-receiver" >&2
  exit 1
fi

echo "✓ Sent to $SSH_HOST (playing remotely)" >&2
exit 0
