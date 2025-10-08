#!/bin/bash
#
# @fileoverview Provider management slash commands
# @context User-facing commands for switching and managing TTS providers
# @architecture Part of /agent-vibes:* command system
#

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/provider-manager.sh"
source "$SCRIPT_DIR/language-manager.sh"

COMMAND="${1:-help}"

# @function provider_list
# @intent Display all available providers with status
provider_list() {
  local current_provider
  current_provider=$(get_active_provider)

  echo "┌────────────────────────────────────────────────────────────┐"
  echo "│ Available TTS Providers                                    │"
  echo "├────────────────────────────────────────────────────────────┤"

  # ElevenLabs
  if [[ "$current_provider" == "elevenlabs" ]]; then
    echo "│ ✓ ElevenLabs    Premium quality    ⭐⭐⭐⭐⭐    [ACTIVE]    │"
  else
    echo "│   ElevenLabs    Premium quality    ⭐⭐⭐⭐⭐               │"
  fi
  echo "│   Cost: Free tier + \$5-22/mo                               │"
  echo "│   Platform: All (Windows, macOS, Linux, WSL)               │"
  echo "│   Offline: No                                              │"
  echo "│                                                            │"

  # Piper
  if [[ "$current_provider" == "piper" ]]; then
    echo "│ ✓ Piper TTS     Free, offline      ⭐⭐⭐⭐       [ACTIVE]    │"
  else
    echo "│   Piper TTS     Free, offline      ⭐⭐⭐⭐                  │"
  fi
  echo "│   Cost: Free forever                                       │"
  echo "│   Platform: WSL, Linux only                                │"
  echo "│   Offline: Yes                                             │"
  echo "└────────────────────────────────────────────────────────────┘"
  echo ""
  echo "Learn more: agentvibes.org/providers"
}

# @function provider_switch
# @intent Switch to a different TTS provider
provider_switch() {
  local new_provider="$1"

  if [[ -z "$new_provider" ]]; then
    echo "❌ Error: Provider name required"
    echo "Usage: /agent-vibes:provider switch <provider>"
    echo "Available: elevenlabs, piper"
    return 1
  fi

  # Validate provider
  if ! validate_provider "$new_provider"; then
    echo "❌ Invalid provider: $new_provider"
    echo ""
    echo "Available providers:"
    list_providers
    return 1
  fi

  local current_provider
  current_provider=$(get_active_provider)

  if [[ "$current_provider" == "$new_provider" ]]; then
    echo "✓ Already using $new_provider"
    return 0
  fi

  # Platform check for Piper
  if [[ "$new_provider" == "piper" ]]; then
    if ! grep -qi microsoft /proc/version 2>/dev/null && [[ "$(uname -s)" != "Linux" ]]; then
      echo "❌ Piper is only supported on WSL and Linux"
      echo "Your platform: $(uname -s)"
      echo "See: agentvibes.org/platform-support"
      return 1
    fi

    # Check if Piper is installed
    if ! command -v piper &> /dev/null; then
      echo "❌ Piper TTS is not installed"
      echo ""
      echo "Install with: pipx install piper-tts"
      echo "Or run: .claude/hooks/piper-installer.sh"
      echo ""
      echo "Visit: agentvibes.org/install-piper"
      return 1
    fi
  fi

  # Check language compatibility
  local current_language
  current_language=$(get_current_language)

  if [[ "$current_language" != "english" ]]; then
    if ! is_language_supported "$current_language" "$new_provider" 2>/dev/null; then
      echo "⚠️  Language Compatibility Warning"
      echo ""
      echo "Current language: $current_language"
      echo "Target provider:  $new_provider"
      echo ""
      echo "❌ Language '$current_language' is not natively supported by $new_provider"
      echo "   Will fall back to English when using $new_provider"
      echo ""
      echo "Options:"
      echo "  1. Continue anyway (will use English)"
      echo "  2. Switch language to English"
      echo "  3. Cancel provider switch"
      echo ""
      read -p "Choose option [1-3]: " -n 1 -r
      echo

      case $REPLY in
        1)
          echo "⏩ Continuing with fallback to English..."
          ;;
        2)
          echo "🔄 Switching language to English..."
          "$SCRIPT_DIR/language-manager.sh" set english
          ;;
        3)
          echo "❌ Provider switch cancelled"
          return 1
          ;;
        *)
          echo "❌ Invalid option, cancelling"
          return 1
          ;;
      esac
    fi
  fi

  # Confirm switch
  echo ""
  echo "⚠️  Switch to $(echo $new_provider | tr '[:lower:]' '[:upper:]')?"
  echo ""
  echo "Current: $current_provider"
  echo "New:     $new_provider"
  if [[ "$current_language" != "english" ]]; then
    echo "Language: $current_language"
  fi
  echo ""
  read -p "Continue? [y/N]: " -n 1 -r
  echo

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Switch cancelled"
    return 1
  fi

  # Perform switch
  set_active_provider "$new_provider"

  # Test new provider
  echo ""
  echo "🔊 Testing provider..."
  "$SCRIPT_DIR/play-tts.sh" "Provider switched to $new_provider successfully" 2>/dev/null

  echo ""
  echo "✓ Provider switch complete!"
  echo "Visit agentvibes.org for tips and tricks"
}

# @function provider_info
# @intent Show detailed information about a provider
provider_info() {
  local provider_name="$1"

  if [[ -z "$provider_name" ]]; then
    echo "❌ Error: Provider name required"
    echo "Usage: /agent-vibes:provider info <provider>"
    return 1
  fi

  case "$provider_name" in
    elevenlabs)
      echo "┌────────────────────────────────────────────────────────────┐"
      echo "│ ElevenLabs - Premium TTS Provider                          │"
      echo "├────────────────────────────────────────────────────────────┤"
      echo "│ Quality:     ⭐⭐⭐⭐⭐  (Highest available)                   │"
      echo "│ Cost:        Free tier + \$5-22/mo                          │"
      echo "│ Platform:    All (Windows, macOS, Linux, WSL)              │"
      echo "│ Offline:     No (requires internet)                        │"
      echo "│                                                            │"
      echo "│ Trade-offs:                                                │"
      echo "│ + Highest voice quality and naturalness                   │"
      echo "│ + 50+ premium voices available                            │"
      echo "│ + Multilingual support (30+ languages)                    │"
      echo "│ - Requires API key and internet                           │"
      echo "│ - Costs money after free tier                             │"
      echo "│                                                            │"
      echo "│ Best for: Premium quality, multilingual needs             │"
      echo "└────────────────────────────────────────────────────────────┘"
      echo ""
      echo "Full comparison: agentvibes.org/providers"
      ;;

    piper)
      echo "┌────────────────────────────────────────────────────────────┐"
      echo "│ Piper TTS - Free Offline Provider                          │"
      echo "├────────────────────────────────────────────────────────────┤"
      echo "│ Quality:     ⭐⭐⭐⭐  (Very good)                            │"
      echo "│ Cost:        Free forever                                  │"
      echo "│ Platform:    WSL, Linux only                               │"
      echo "│ Offline:     Yes (fully local)                             │"
      echo "│                                                            │"
      echo "│ Trade-offs:                                                │"
      echo "│ + Completely free, no API costs                           │"
      echo "│ + Works offline, no internet needed                       │"
      echo "│ + Fast synthesis (local processing)                       │"
      echo "│ - WSL/Linux only (no macOS/Windows)                       │"
      echo "│ - Slightly lower quality than ElevenLabs                  │"
      echo "│                                                            │"
      echo "│ Best for: Budget-conscious, offline use, privacy          │"
      echo "└────────────────────────────────────────────────────────────┘"
      echo ""
      echo "Full comparison: agentvibes.org/providers"
      ;;

    *)
      echo "❌ Unknown provider: $provider_name"
      echo "Available: elevenlabs, piper"
      ;;
  esac
}

# @function provider_test
# @intent Test current provider with sample audio
provider_test() {
  local current_provider
  current_provider=$(get_active_provider)

  echo "🔊 Testing provider: $current_provider"
  echo ""

  "$SCRIPT_DIR/play-tts.sh" "Provider test successful. Audio is working correctly with $current_provider."

  echo ""
  echo "✓ Test complete"
}

# @function provider_get
# @intent Show currently active provider
provider_get() {
  local current_provider
  current_provider=$(get_active_provider)

  echo "🎤 Current Provider: $current_provider"
  echo ""

  # Show brief info
  case "$current_provider" in
    elevenlabs)
      echo "Quality: ⭐⭐⭐⭐⭐"
      echo "Cost: Free tier + \$5-22/mo"
      echo "Offline: No"
      ;;
    piper)
      echo "Quality: ⭐⭐⭐⭐"
      echo "Cost: Free forever"
      echo "Offline: Yes"
      ;;
  esac

  echo ""
  echo "Use /agent-vibes:provider info $current_provider for details"
}

# @function provider_preview
# @intent Preview voices for the currently active provider
# @architecture Delegates to provider-specific voice managers
provider_preview() {
  local current_provider
  current_provider=$(get_active_provider)

  echo "🎤 Voice Preview ($current_provider)"
  echo ""

  case "$current_provider" in
    elevenlabs)
      # Use the ElevenLabs voice manager
      "$SCRIPT_DIR/voice-manager.sh" preview "$@"
      ;;
    piper)
      # Use the Piper voice manager's list functionality
      # For Piper, we'll list and play sample from available voices
      source "$SCRIPT_DIR/piper-voice-manager.sh"

      # Play intro announcement
      echo "🎤 Piper Preview of 3 people"
      echo ""

      # Play first 3 Piper voices as samples
      local sample_voices=(
        "en_US-lessac-medium:Lessac"
        "en_US-amy-medium:Amy"
        "en_US-joe-medium:Joe"
      )

      for voice_entry in "${sample_voices[@]}"; do
        local voice_name="${voice_entry%%:*}"
        local display_name="${voice_entry##*:}"

        echo "🔊 ${display_name}..."
        "$SCRIPT_DIR/play-tts.sh" "Hi, my name is ${display_name}" "$voice_name"

        # Wait for the voice to finish playing before starting next one
        sleep 3
      done

      echo ""
      echo "✓ Preview complete"
      echo "💡 Use /agent-vibes:list to see all available Piper voices"
      ;;
    *)
      echo "❌ Unknown provider: $current_provider"
      ;;
  esac
}

# @function provider_help
# @intent Show help for provider commands
provider_help() {
  echo "Provider Management Commands"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Usage:"
  echo "  /agent-vibes:provider list              # Show all providers"
  echo "  /agent-vibes:provider switch <name>     # Switch provider"
  echo "  /agent-vibes:provider info <name>       # Provider details"
  echo "  /agent-vibes:provider test              # Test current provider"
  echo "  /agent-vibes:provider get               # Show active provider"
  echo ""
  echo "Examples:"
  echo "  /agent-vibes:provider switch piper"
  echo "  /agent-vibes:provider info elevenlabs"
  echo ""
  echo "Learn more: agentvibes.org/docs/providers"
}

# Route to appropriate function
case "$COMMAND" in
  list)
    provider_list
    ;;
  switch)
    provider_switch "$2"
    ;;
  info)
    provider_info "$2"
    ;;
  test)
    provider_test
    ;;
  get)
    provider_get
    ;;
  preview)
    shift  # Remove 'preview' from args
    provider_preview "$@"
    ;;
  help|*)
    provider_help
    ;;
esac
