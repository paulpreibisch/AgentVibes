#!/bin/bash
# Voice Manager - Handle voice switching and listing
# Usage: voice-manager.sh [list|switch|get] [voice_name]

VOICE_FILE="/tmp/claude-tts-voice-${USER}.txt"

# Source the single voice configuration file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/voices-config.sh"

case "$1" in
  list)
    echo "🎤 Available TTS Voices:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    CURRENT_VOICE=$(cat "$VOICE_FILE" 2>/dev/null || echo "Cowboy")
    for voice in "${!VOICES[@]}"; do
      if [ "$voice" = "$CURRENT_VOICE" ]; then
        echo "  ▶ $voice (current)"
      else
        echo "    $voice"
      fi
    done | sort
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Usage: voice-manager.sh switch <name>"
    echo "       voice-manager.sh preview"
    ;;

  preview)
    # Get play-tts.sh path
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    TTS_SCRIPT="$SCRIPT_DIR/play-tts.sh"

    # Check if a specific voice name was provided
    if [[ -n "$2" ]] && [[ "$2" != "first" ]] && [[ "$2" != "last" ]] && ! [[ "$2" =~ ^[0-9]+$ ]]; then
      # User specified a voice name
      VOICE_NAME="$2"

      # Check if voice exists
      if [[ -n "${VOICES[$VOICE_NAME]}" ]]; then
        echo "🎤 Previewing voice: ${VOICE_NAME}"
        echo ""
        "$TTS_SCRIPT" "Hello, this is ${VOICE_NAME}. How do you like my voice?" "${VOICE_NAME}"
      else
        echo "❌ Voice not found: ${VOICE_NAME}"
        echo ""
        echo "Available voices:"
        for voice in "${!VOICES[@]}"; do
          echo "  • $voice"
        done | sort
      fi
      exit 0
    fi

    # Original preview logic for first/last/number
    echo "🎤 Voice Preview - Playing first 3 voices..."
    echo ""

    # Sort voices and preview first 3
    VOICE_ARRAY=()
    for voice in "${!VOICES[@]}"; do
      VOICE_ARRAY+=("$voice")
    done

    # Sort the array
    IFS=$'\n' SORTED_VOICES=($(sort <<<"${VOICE_ARRAY[*]}"))
    unset IFS

    # Play first 3 voices
    COUNT=0
    for voice in "${SORTED_VOICES[@]}"; do
      if [ $COUNT -eq 3 ]; then
        break
      fi
      echo "🔊 ${voice}..."
      "$TTS_SCRIPT" "Hi, I'm ${voice}" "${VOICES[$voice]}"
      sleep 0.5
      COUNT=$((COUNT + 1))
    done

    echo ""
    echo "Would you like to hear more? Reply 'yes' to continue."
    ;;

  switch)
    VOICE_NAME="$2"

    if [[ -z "$VOICE_NAME" ]]; then
      # Show numbered list for selection
      echo "🎤 Select a voice by number:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

      # Get current voice
      CURRENT="Cowboy Bob"
      if [ -f "$VOICE_FILE" ]; then
        CURRENT=$(cat "$VOICE_FILE")
      fi

      # Create array of voice names
      VOICE_ARRAY=()
      for voice in "${!VOICES[@]}"; do
        VOICE_ARRAY+=("$voice")
      done

      # Sort the array
      IFS=$'\n' SORTED_VOICES=($(sort <<<"${VOICE_ARRAY[*]}"))
      unset IFS

      # Display numbered list in two columns for compactness
      HALF=$(( (${#SORTED_VOICES[@]} + 1) / 2 ))

      for i in $(seq 0 $((HALF - 1))); do
        NUM1=$((i + 1))
        VOICE1="${SORTED_VOICES[$i]}"

        # Format first column
        if [[ "$VOICE1" == "$CURRENT" ]]; then
          COL1=$(printf "%2d. %-20s ✓" "$NUM1" "$VOICE1")
        else
          COL1=$(printf "%2d. %-20s  " "$NUM1" "$VOICE1")
        fi

        # Format second column if it exists
        NUM2=$((i + HALF + 1))
        if [[ $((i + HALF)) -lt ${#SORTED_VOICES[@]} ]]; then
          VOICE2="${SORTED_VOICES[$((i + HALF))]}"
          if [[ "$VOICE2" == "$CURRENT" ]]; then
            COL2=$(printf "%2d. %-20s ✓" "$NUM2" "$VOICE2")
          else
            COL2=$(printf "%2d. %-20s  " "$NUM2" "$VOICE2")
          fi
          echo "  $COL1 $COL2"
        else
          echo "  $COL1"
        fi
      done

      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "Enter number (1-${#SORTED_VOICES[@]}) or voice name:"
      echo "Usage: /agent-vibes:switch 5"
      echo "       /agent-vibes:switch \"Northern Terry\""
      exit 0
    fi

    # Check if input is a number
    if [[ "$VOICE_NAME" =~ ^[0-9]+$ ]]; then
      # Get voice array
      VOICE_ARRAY=()
      for voice in "${!VOICES[@]}"; do
        VOICE_ARRAY+=("$voice")
      done

      # Sort the array
      IFS=$'\n' SORTED_VOICES=($(sort <<<"${VOICE_ARRAY[*]}"))
      unset IFS

      # Get voice by number (adjust for 0-based index)
      INDEX=$((VOICE_NAME - 1))

      if [[ $INDEX -ge 0 && $INDEX -lt ${#SORTED_VOICES[@]} ]]; then
        VOICE_NAME="${SORTED_VOICES[$INDEX]}"
        FOUND="${SORTED_VOICES[$INDEX]}"
      else
        echo "❌ Invalid number. Please choose between 1 and ${#SORTED_VOICES[@]}"
        exit 1
      fi
    else
      # Check if voice exists (case-insensitive)
      FOUND=""
      for voice in "${!VOICES[@]}"; do
        if [[ "${voice,,}" == "${VOICE_NAME,,}" ]]; then
          FOUND="$voice"
          break
        fi
      done
    fi

    if [[ -z "$FOUND" ]]; then
      echo "❌ Unknown voice: $VOICE_NAME"
      echo ""
      echo "Available voices:"
      for voice in "${!VOICES[@]}"; do
        echo "  - $voice"
      done | sort
      exit 1
    fi

    echo "$FOUND" > "$VOICE_FILE"
    echo "✅ Voice switched to: $FOUND"
    echo "🎤 Voice ID: ${VOICES[$FOUND]}"

    # Have the new voice introduce itself
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PLAY_TTS="$SCRIPT_DIR/play-tts.sh"
    if [ -x "$PLAY_TTS" ]; then
      "$PLAY_TTS" "Hi, I'm $FOUND. I'll be your voice assistant moving forward." "$FOUND" > /dev/null 2>&1 &
    fi
    ;;

  get)
    if [ -f "$VOICE_FILE" ]; then
      cat "$VOICE_FILE"
    else
      echo "Cowboy Bob"
    fi
    ;;

  whoami)
    echo "🎤 Current Voice Configuration"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Get current voice
    if [ -f "$VOICE_FILE" ]; then
      CURRENT_VOICE=$(cat "$VOICE_FILE")
    else
      CURRENT_VOICE="Cowboy Bob"
    fi
    echo "Voice: $CURRENT_VOICE"

    # Get current sentiment (priority)
    if [ -f "$HOME/.claude/tts-sentiment.txt" ]; then
      SENTIMENT=$(cat "$HOME/.claude/tts-sentiment.txt")
      echo "Sentiment: $SENTIMENT (active)"

      # Also show personality if set
      if [ -f "$HOME/.claude/tts-personality.txt" ]; then
        PERSONALITY=$(cat "$HOME/.claude/tts-personality.txt")
        echo "Personality: $PERSONALITY (overridden by sentiment)"
      fi
    else
      # No sentiment, check personality
      if [ -f "$HOME/.claude/tts-personality.txt" ]; then
        PERSONALITY=$(cat "$HOME/.claude/tts-personality.txt")
        echo "Personality: $PERSONALITY (active)"
      else
        echo "Personality: normal"
      fi
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ;;

  list-simple)
    # Simple list for AI to parse and display
    for voice in "${!VOICES[@]}"; do
      echo "$voice"
    done | sort
    ;;

  *)
    echo "Usage: voice-manager.sh [list|switch|get] [voice_name]"
    echo ""
    echo "Commands:"
    echo "  list                    - List all available voices"
    echo "  switch <voice_name>     - Switch to a different voice"
    echo "  get                     - Get current voice name"
    exit 1
    ;;
esac