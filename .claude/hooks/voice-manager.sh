#!/bin/bash
# Voice Manager - Handle voice switching and listing
# Usage: voice-manager.sh [list|switch|get] [voice_name]

VOICE_FILE="/tmp/claude-tts-voice-${USER}.txt"

# Voice mapping - Official ElevenLabs Character Voices
declare -A VOICES=(
  ["Northern Terry"]="wo6udizrrtpIxWGp2qJk"
  ["Grandpa Spuds Oxley"]="NOpBlnGInO9m6vDvFkFC"
  ["Ms. Walker"]="DLsHlh26Ugcm6ELvS0qi"
  ["Ralf Eisend"]="A9evEp8yGjv4c3WsIKuY"
  ["Amy"]="bhJUNIXWQQ94l8eI2VUf"
  ["Michael"]="U1Vk2oyatMdYs096Ety7"
  ["Jessica Anne Bogart"]="flHkNRp1BlvT73UL6gyz"
  ["Aria"]="TC0Zp7WVFzhA8zpTlRqV"
  ["Lutz Laugh"]="9yzdeviXkFddZ4Oz8Mok"
  ["Dr. Von Fusion"]="yjJ45q8TVCrtMhEKurxY"
  ["Matthew Schmitz"]="0SpgpJ4D3MpHCiWdyTg3"
  ["Demon Monster"]="vfaqCOvlrKi4Zp7C2IAm"
  ["Cowboy Bob"]="KTPVrSVAEUSJRClDzBw7"
  ["Drill Sergeant"]="DGzg6RaUqxGRTHSBjfgF"
)

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
    echo "🎤 Voice Preview - Playing first 3 voices..."
    echo ""

    # Get play-tts.sh path
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    TTS_SCRIPT="$SCRIPT_DIR/play-tts.sh"

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
      echo "❌ Error: Please specify a voice name"
      echo "Usage: Voice Switch <name>"
      echo "Example: Voice Switch GentleGirl"
      exit 1
    fi

    # Check if voice exists (case-insensitive)
    FOUND=""
    for voice in "${!VOICES[@]}"; do
      if [[ "${voice,,}" == "${VOICE_NAME,,}" ]]; then
        FOUND="$voice"
        break
      fi
    done

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