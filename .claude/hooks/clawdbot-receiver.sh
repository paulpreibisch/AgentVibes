#!/usr/bin/env bash
#
# File: .claude/hooks/clawdbot-receiver.sh
#
# AgentVibes Clawdbot Receiver - SSH-Remote TTS with Agent Support and Intro Messages
# Receives base64-encoded text, voice, agent name, and optional intro from remote Clawdbot instances
# Uses TTS queue to prevent audio overlap when multiple messages arrive quickly
#
# Usage (called via SSH from remote):
#   clawdbot-receiver.sh <base64_text> <voice> <base64_agent_name> [base64_intro]
#
# Parameters:
#   base64_text       - The main TTS text (base64 encoded)
#   voice             - Piper voice name (e.g., en_US-amy-medium)
#   base64_agent_name - Agent name for audio effects lookup (base64 encoded)
#   base64_intro      - Optional intro message to prepend (base64 encoded)
#                       e.g., "Orion ClawdBot here." or "Samuel, your assistant."
#
# The intro is prepended to the text: "${INTRO} ${TEXT}"
#
# Installed at: ~/.termux/agentvibes-play.sh or ~/.agentvibes/play-remote.sh
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0
#

set -euo pipefail

ENCODED_TEXT="${1:-}"
VOICE="${2:-en_US-lessac-medium}"
ENCODED_AGENT="${3:-}"
ENCODED_INTRO="${4:-}"

# Validate inputs
if [[ -z "$ENCODED_TEXT" ]]; then
  echo "❌ No encoded text provided" >&2
  echo "Usage: $0 <base64_text> <voice> <base64_agent_name> [base64_intro]" >&2
  exit 1
fi

# SECURITY: Decode base64 safely
# This prevents command injection from malicious text
DECODED_TEXT=$(echo -n "$ENCODED_TEXT" | base64 -d 2>/dev/null) || {
  echo "❌ Failed to decode text (invalid base64)" >&2
  exit 1
}

DECODED_AGENT="default"
if [[ -n "$ENCODED_AGENT" ]]; then
  DECODED_AGENT=$(echo -n "$ENCODED_AGENT" | base64 -d 2>/dev/null) || DECODED_AGENT="default"
fi

# Decode and prepend intro if provided
DECODED_INTRO=""
if [[ -n "$ENCODED_INTRO" ]]; then
  DECODED_INTRO=$(echo -n "$ENCODED_INTRO" | base64 -d 2>/dev/null) || DECODED_INTRO=""
fi

# Prepend intro to text if configured
if [[ -n "$DECODED_INTRO" ]]; then
  DECODED_TEXT="${DECODED_INTRO} ${DECODED_TEXT}"
fi

# Find AgentVibes installation
# Priority: 1. ~/agentvibes, 2. ~/AgentVibes-dev, 3. current directory
AGENTVIBES_ROOT=""
if [[ -f "$HOME/agentvibes/.claude/hooks/play-tts-enhanced.sh" ]]; then
  AGENTVIBES_ROOT="$HOME/agentvibes"
elif [[ -f "$HOME/AgentVibes-dev/.claude/hooks/play-tts-enhanced.sh" ]]; then
  AGENTVIBES_ROOT="$HOME/AgentVibes-dev"
elif [[ -f ".claude/hooks/play-tts-enhanced.sh" ]]; then
  AGENTVIBES_ROOT="$(pwd)"
else
  echo "❌ AgentVibes not found" >&2
  echo "💡 Install AgentVibes at ~/agentvibes/ or ~/AgentVibes-dev/" >&2
  exit 1
fi

echo "🎤 Voice: $VOICE | Music: $(echo -n "$DECODED_AGENT" | base64 -w 0) | Vol: 30% | Effects: default" >&2

# Use TTS queue if available (prevents audio overlap)
cd "$AGENTVIBES_ROOT"
if [[ -f ".claude/hooks/tts-queue.sh" ]]; then
  # Queue the TTS request for sequential playback
  bash .claude/hooks/tts-queue.sh add "$DECODED_TEXT" "$VOICE" "$DECODED_AGENT" 2>&1
else
  # Fallback to direct playback (may overlap)
  bash .claude/hooks/play-tts-enhanced.sh "$DECODED_TEXT" "$DECODED_AGENT" "$VOICE" 2>&1 || {
    echo "⚠️  Enhanced TTS failed, using standard TTS" >&2
    bash .claude/hooks/play-tts.sh "$DECODED_TEXT" "$VOICE" 2>&1
  }
fi

exit 0
