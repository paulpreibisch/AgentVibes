#!/bin/bash
# Voice Manager - Handle voice switching and listing
# Usage: voice-manager.sh [list|switch|get] [voice_name]

# Get script directory (physical path for sourcing files)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/voices-config.sh"

# Project-local file first, global fallback
# Use the logical path from BASH_SOURCE to find .claude directory
# This handles both normal installations and symlinked hooks directories correctly
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_PATH")"

# Check if we have a project-local .claude directory
if [[ -d "$CLAUDE_DIR" ]] && [[ "$CLAUDE_DIR" != "$HOME/.claude" ]]; then
  VOICE_FILE="$CLAUDE_DIR/tts-voice.txt"
else
  # Fallback to global
  VOICE_FILE="$HOME/.claude/tts-voice.txt"
fi

case "$1" in
  list)
    # Get active provider
    PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    if [[ ! -f "$PROVIDER_FILE" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    ACTIVE_PROVIDER="elevenlabs"  # default
    if [ -f "$PROVIDER_FILE" ]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
    fi

    CURRENT_VOICE=$(cat "$VOICE_FILE" 2>/dev/null || echo "Cowboy Bob")

    if [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
      echo "🎤 Available Piper TTS Voices:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

      # List downloaded Piper voices
      if [[ -f "$SCRIPT_DIR/piper-voice-manager.sh" ]]; then
        source "$SCRIPT_DIR/piper-voice-manager.sh"
        VOICE_DIR=$(get_voice_storage_dir)
        VOICE_COUNT=0
        for onnx_file in "$VOICE_DIR"/*.onnx; do
          if [[ -f "$onnx_file" ]]; then
            voice=$(basename "$onnx_file" .onnx)
            if [ "$voice" = "$CURRENT_VOICE" ]; then
              echo "  ▶ $voice (current)"
            else
              echo "    $voice"
            fi
            ((VOICE_COUNT++))
          fi
        done | sort

        if [[ $VOICE_COUNT -eq 0 ]]; then
          echo "  (No Piper voices downloaded yet)"
          echo ""
          echo "Download voices with: /agent-vibes:provider download <voice-name>"
          echo "Examples: en_US-lessac-medium, en_GB-alba-medium"
        fi
      fi
    else
      echo "🎤 Available ElevenLabs TTS Voices:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      for voice in "${!VOICES[@]}"; do
        if [ "$voice" = "$CURRENT_VOICE" ]; then
          echo "  ▶ $voice (current)"
        else
          echo "    $voice"
        fi
      done | sort
    fi

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
    SILENT_MODE=false

    # Check for --silent flag
    if [[ "$2" == "--silent" ]] || [[ "$3" == "--silent" ]]; then
      SILENT_MODE=true
      # If --silent is first arg, voice name is in $3
      [[ "$2" == "--silent" ]] && VOICE_NAME="$3"
    fi

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

    # Detect active TTS provider
    PROVIDER_FILE=""
    if [[ -f "$CLAUDE_DIR/tts-provider.txt" ]]; then
      PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    ACTIVE_PROVIDER="elevenlabs"  # default
    if [[ -n "$PROVIDER_FILE" ]]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
    fi

    # If using Piper and voice name looks like a Piper model (contains underscore and dash)
    # then skip ElevenLabs voice validation
    if [[ "$ACTIVE_PROVIDER" == "piper" ]] && [[ "$VOICE_NAME" == *"_"*"-"* ]]; then
      # This is a Piper model name, use it directly
      FOUND="$VOICE_NAME"
    else
      # ElevenLabs voice lookup
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
    fi

    echo "$FOUND" > "$VOICE_FILE"
    echo "✅ Voice switched to: $FOUND"

    # Show voice ID only for ElevenLabs voices
    if [[ "$ACTIVE_PROVIDER" != "piper" ]] && [[ -n "${VOICES[$FOUND]}" ]]; then
      echo "🎤 Voice ID: ${VOICES[$FOUND]}"
    fi

    # Have the new voice introduce itself (unless silent mode)
    if [[ "$SILENT_MODE" != "true" ]]; then
      SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
      PLAY_TTS="$SCRIPT_DIR/play-tts.sh"
      if [ -x "$PLAY_TTS" ]; then
        "$PLAY_TTS" "Hi, I'm $FOUND. I'll be your voice assistant moving forward." "$FOUND" > /dev/null 2>&1 &
      fi

      echo ""
      echo "💡 Tip: To hear automatic TTS narration, enable the Agent Vibes output style:"
      echo "   /output-style Agent Vibes"
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

    # Get active TTS provider
    PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    if [[ ! -f "$PROVIDER_FILE" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    if [ -f "$PROVIDER_FILE" ]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
      if [[ "$ACTIVE_PROVIDER" == "elevenlabs" ]]; then
        echo "Provider: ElevenLabs (Premium AI)"
      elif [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
        echo "Provider: Piper TTS (Free, Offline)"
      else
        echo "Provider: $ACTIVE_PROVIDER"
      fi
    else
      # Default to ElevenLabs if no provider file
      echo "Provider: ElevenLabs (Premium AI)"
    fi

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
    # Get active provider
    PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    if [[ ! -f "$PROVIDER_FILE" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    ACTIVE_PROVIDER="elevenlabs"  # default
    if [ -f "$PROVIDER_FILE" ]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
    fi

    if [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
      # List downloaded Piper voices
      if [[ -f "$SCRIPT_DIR/piper-voice-manager.sh" ]]; then
        source "$SCRIPT_DIR/piper-voice-manager.sh"
        VOICE_DIR=$(get_voice_storage_dir)
        for onnx_file in "$VOICE_DIR"/*.onnx; do
          if [[ -f "$onnx_file" ]]; then
            basename "$onnx_file" .onnx
          fi
        done | sort
      fi
    else
      # List ElevenLabs voices
      for voice in "${!VOICES[@]}"; do
        echo "$voice"
      done | sort
    fi
    ;;

  replay)
    # Replay recent TTS audio from history
    # Use project-local directory with same logic as play-tts.sh
    if [[ -n "$CLAUDE_PROJECT_DIR" ]]; then
      AUDIO_DIR="$CLAUDE_PROJECT_DIR/.claude/audio"
    else
      # Fallback: try to find .claude directory in current path
      CURRENT_DIR="$PWD"
      while [[ "$CURRENT_DIR" != "/" ]]; do
        if [[ -d "$CURRENT_DIR/.claude" ]]; then
          AUDIO_DIR="$CURRENT_DIR/.claude/audio"
          break
        fi
        CURRENT_DIR=$(dirname "$CURRENT_DIR")
      done
      # Final fallback to global if no project .claude found
      if [[ -z "$AUDIO_DIR" ]]; then
        AUDIO_DIR="$HOME/.claude/audio"
      fi
    fi

    # Default to replay last audio (N=1)
    N="${2:-1}"

    # Validate N is a number
    if ! [[ "$N" =~ ^[0-9]+$ ]]; then
      echo "❌ Invalid argument. Please use a number (1-10)"
      echo "Usage: /agent-vibes:replay [N]"
      echo "  N=1 - Last audio (default)"
      echo "  N=2 - Second-to-last"
      echo "  N=3 - Third-to-last"
      exit 1
    fi

    # Check bounds
    if [[ $N -lt 1 || $N -gt 10 ]]; then
      echo "❌ Number out of range. Please choose 1-10"
      exit 1
    fi

    # Get list of audio files sorted by time (newest first)
    if [[ ! -d "$AUDIO_DIR" ]]; then
      echo "❌ No audio history found"
      echo "Audio files are stored in: $AUDIO_DIR"
      exit 1
    fi

    # Get the Nth most recent file
    AUDIO_FILE=$(ls -t "$AUDIO_DIR"/tts-*.mp3 2>/dev/null | sed -n "${N}p")

    if [[ -z "$AUDIO_FILE" ]]; then
      TOTAL=$(ls -t "$AUDIO_DIR"/tts-*.mp3 2>/dev/null | wc -l)
      echo "❌ Audio #$N not found in history"
      echo "Total audio files available: $TOTAL"
      exit 1
    fi

    echo "🔊 Replaying audio #$N:"
    echo "   File: $(basename "$AUDIO_FILE")"
    echo "   Path: $AUDIO_FILE"

    # Play the audio file in background
    (paplay "$AUDIO_FILE" 2>/dev/null || aplay "$AUDIO_FILE" 2>/dev/null || mpg123 "$AUDIO_FILE" 2>/dev/null) &
    ;;

  *)
    echo "Usage: voice-manager.sh [list|switch|get|replay|whoami] [voice_name]"
    echo ""
    echo "Commands:"
    echo "  list                    - List all available voices"
    echo "  switch <voice_name>     - Switch to a different voice"
    echo "  get                     - Get current voice name"
    echo "  replay [N]              - Replay Nth most recent audio (default: 1)"
    echo "  whoami                  - Show current voice and personality"
    exit 1
    ;;
esac