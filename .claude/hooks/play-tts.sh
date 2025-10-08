#!/bin/bash
#
# @fileoverview TTS Provider Router
# @context Routes TTS requests to active provider (ElevenLabs or Piper)
# @architecture Provider abstraction layer - single entry point for all TTS
# @dependencies provider-manager.sh, play-tts-elevenlabs.sh, play-tts-piper.sh
# @entrypoints Called by hooks, slash commands, and personality-manager.sh
# @patterns Provider pattern - delegates to provider-specific implementations
# @related provider-manager.sh, play-tts-elevenlabs.sh, play-tts-piper.sh
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

# Route to appropriate provider implementation
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
