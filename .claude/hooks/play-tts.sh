#!/bin/bash
#
# @fileoverview TTS Provider Router with Language Learning Support
# @context Routes TTS requests to active provider (ElevenLabs or Piper)
# @architecture Provider abstraction layer - single entry point for all TTS
# @dependencies provider-manager.sh, play-tts-elevenlabs.sh, play-tts-piper.sh, learn-manager.sh
# @entrypoints Called by hooks, slash commands, and personality-manager.sh
# @patterns Provider pattern - delegates to provider-specific implementations
# @related provider-manager.sh, play-tts-elevenlabs.sh, play-tts-piper.sh, learn-manager.sh
#

# Fix locale warnings
export LC_ALL=C

TEXT="$1"
VOICE_OVERRIDE="$2"  # Optional: voice name or ID

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source provider manager to get active provider
source "$SCRIPT_DIR/provider-manager.sh"

# Get active provider
ACTIVE_PROVIDER=$(get_active_provider)

# Show GitHub star reminder (once per day)
"$SCRIPT_DIR/github-star-reminder.sh" 2>/dev/null || true

# Normal single-language mode - route to appropriate provider implementation
# Note: For learning mode, the output style will call this script TWICE:
# 1. First call with main language text and current voice
# 2. Second call with translated text and target voice
case "$ACTIVE_PROVIDER" in
  elevenlabs)
    exec "$SCRIPT_DIR/play-tts-elevenlabs.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  piper)
    exec "$SCRIPT_DIR/play-tts-piper.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  *)
    echo "❌ Unknown provider: $ACTIVE_PROVIDER"
    echo "   Run: /agent-vibes:provider list"
    exit 1
    ;;
esac
