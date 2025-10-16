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

# @function detect_voice_provider
# @intent Auto-detect provider from voice name (for mixed-provider support)
# @why Allow ElevenLabs for main language + Piper for target language
# @param $1 voice name/ID
# @returns Provider name (elevenlabs or piper)
detect_voice_provider() {
  local voice="$1"
  # Piper voice names contain underscore and dash (e.g., es_ES-davefx-medium)
  if [[ "$voice" == *"_"*"-"* ]]; then
    echo "piper"
  else
    echo "$ACTIVE_PROVIDER"
  fi
}

# Override provider if voice indicates different provider (mixed-provider mode)
if [[ -n "$VOICE_OVERRIDE" ]]; then
  DETECTED_PROVIDER=$(detect_voice_provider "$VOICE_OVERRIDE")
  if [[ "$DETECTED_PROVIDER" != "$ACTIVE_PROVIDER" ]]; then
    ACTIVE_PROVIDER="$DETECTED_PROVIDER"
  fi
fi

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
