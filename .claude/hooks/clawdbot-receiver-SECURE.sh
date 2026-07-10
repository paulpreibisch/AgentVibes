#!/usr/bin/env bash
#
# File: .claude/hooks/clawdbot-receiver.sh (SECURITY-HARDENED VERSION)
#
# AgentVibes Clawdbot Receiver - SSH-Remote TTS with Agent Support and Intro Messages
# Receives base64-encoded text, voice, agent name, and optional intro from remote Clawdbot instances
# Calls AgentVibes play-tts-enhanced.sh to apply agent-specific audio effects
#
# SECURITY ENHANCEMENTS:
# - Voice name whitelist validation
# - Agent name format validation (alphanumeric only)
# - Length limits on decoded content
# - Safe HOME directory handling
#
# Usage (called via SSH from remote):
#   clawdbot-receiver.sh <base64_text> <voice> <base64_agent_name> [base64_intro]
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0
#

set -euo pipefail

ENCODED_TEXT="${1:-}"

# Default voice: prefer the Provider Catalog's piper default (AVI-S9.6 AC3,
# design row 23), falling back to the legacy literal if the generated catalog
# artifact is missing (installed-tree skew).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/provider-catalog.sh" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/provider-catalog.sh" 2>/dev/null || true
fi
if type catalog_default_voice >/dev/null 2>&1; then
  _CATALOG_PIPER_DEFAULT="$(catalog_default_voice piper)"
else
  _CATALOG_PIPER_DEFAULT="en_US-lessac-medium"  # legacy fallback
fi
VOICE="${2:-$_CATALOG_PIPER_DEFAULT}"
ENCODED_AGENT="${3:-}"
ENCODED_INTRO="${4:-}"

# SECURITY: Whitelist of allowed voice names.
# DO NOT UNIFY with the Provider Catalog — this is a SECURITY control, not an
# inventory list. It is deliberately narrower than (and independent of) the
# catalog's piper voice set; syncing it to the catalog would silently widen
# what an untrusted remote SSH sender can request (design §8, provider-catalog.js
# module header).
ALLOWED_VOICES="en_US-amy-medium|en_US-lessac-medium|es_ES-mls_9972-low|es_ES-davefx-medium|en_US-joe-medium"

# Validate inputs
if [[ -z "$ENCODED_TEXT" ]]; then
  echo "❌ No encoded text provided" >&2
  echo "Usage: $0 <base64_text> <voice> <base64_agent_name> [base64_intro]" >&2
  exit 1
fi

# SECURITY: Validate VOICE parameter against whitelist
if ! [[ "$VOICE" =~ ^($ALLOWED_VOICES)$ ]]; then
  echo "❌ Invalid voice name: $VOICE" >&2
  echo "Allowed voices: $(echo "$ALLOWED_VOICES" | tr '|' ', ')" >&2
  exit 1
fi

# SECURITY: Decode base64 safely
# This prevents command injection from malicious text
DECODED_TEXT=$(echo -n "$ENCODED_TEXT" | base64 -d 2>/dev/null) || {
  echo "❌ Failed to decode text (invalid base64)" >&2
  exit 1
}

# SECURITY: Enforce length limit on decoded text (10KB max)
if [[ ${#DECODED_TEXT} -gt 10000 ]]; then
  echo "❌ Decoded text too long (${#DECODED_TEXT} chars, max 10000)" >&2
  exit 1
fi

DECODED_AGENT="default"
if [[ -n "$ENCODED_AGENT" ]]; then
  DECODED_AGENT=$(echo -n "$ENCODED_AGENT" | base64 -d 2>/dev/null) || DECODED_AGENT="default"
  
  # SECURITY: Validate agent name format (alphanumeric, dash, underscore only)
  if ! [[ "$DECODED_AGENT" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "⚠️  Invalid agent name format, using 'default'" >&2
    DECODED_AGENT="default"
  fi
  
  # SECURITY: Enforce length limit on agent name
  if [[ ${#DECODED_AGENT} -gt 50 ]]; then
    echo "⚠️  Agent name too long, using 'default'" >&2
    DECODED_AGENT="default"
  fi
fi

# Decode and prepend intro if provided
DECODED_INTRO=""
if [[ -n "$ENCODED_INTRO" ]]; then
  DECODED_INTRO=$(echo -n "$ENCODED_INTRO" | base64 -d 2>/dev/null) || DECODED_INTRO=""
  
  # SECURITY: Enforce length limit on intro message
  if [[ ${#DECODED_INTRO} -gt 200 ]]; then
    echo "⚠️  Intro message too long, truncating" >&2
    DECODED_INTRO="${DECODED_INTRO:0:200}"
  fi
fi

# Prepend intro to text if configured
if [[ -n "$DECODED_INTRO" ]]; then
  DECODED_TEXT="${DECODED_INTRO} ${DECODED_TEXT}"
fi

# Find AgentVibes installation
# SECURITY: Validate HOME is set and use absolute paths
if [[ -z "${HOME:-}" ]]; then
  echo "❌ HOME environment variable not set" >&2
  exit 1
fi

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

# SECURITY: Validate AgentVibes root is a directory
if [[ ! -d "$AGENTVIBES_ROOT" ]]; then
  echo "❌ AgentVibes root is not a directory: $AGENTVIBES_ROOT" >&2
  exit 1
fi

echo "🎤 Voice: $VOICE | Agent: $DECODED_AGENT | Vol: 30% | Effects: default" >&2

# Call AgentVibes play-tts-enhanced.sh with agent name for audio-effects.cfg lookup
# SECURITY: Use absolute path and proper quoting
cd "$AGENTVIBES_ROOT" && \
  bash .claude/hooks/play-tts-enhanced.sh "$DECODED_TEXT" "$DECODED_AGENT" "$VOICE" 2>&1 || {
  # Fallback to standard play-tts if enhanced fails
  echo "⚠️  Enhanced TTS failed, using standard TTS" >&2
  bash .claude/hooks/play-tts.sh "$DECODED_TEXT" "$VOICE" 2>&1
}

exit 0
