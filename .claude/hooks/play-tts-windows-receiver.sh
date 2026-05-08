#!/usr/bin/env bash
#
# play-tts-windows-receiver.sh
# Sends TTS to Windows AgentVibes receiver via SSH.
# The Windows receiver expects bare base64-encoded text as the SSH command.
#
set -euo pipefail

TEXT="${1:-}"
VOICE="${2:-}"

[[ -z "$TEXT" ]] && { echo 'No text' >&2; exit 1; }

# Get host
HOST=$(cat "$HOME/.claude/windows-receiver-host.txt" 2>/dev/null || echo '')
[[ -z "$HOST" ]] && { echo '❌ No host: set ~/.claude/windows-receiver-host.txt' >&2; exit 1; }

# Validate host
[[ "$HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]] || { echo '❌ Invalid host' >&2; exit 1; }

# Strip markdown/emojis
TEXT=$(printf '%s' "$TEXT" | perl -CSD -pe '
  s/[\x{1F300}-\x{1F9FF}]//g;
  s/[\x{2600}-\x{27BF}]//g;
  s/\*+//g; s/#+\s*//g; s/`//g;
' 2>/dev/null || printf '%s' "$TEXT")

ENCODED=$(printf '%s' "$TEXT" | base64 -w 0)

echo "🖥️ Sending to Windows receiver ($HOST)…" >&2
RESULT=$(ssh "$HOST" "$ENCODED" 2>&1) && echo "✓ $RESULT" >&2 || echo "⚠️ $RESULT" >&2 &
