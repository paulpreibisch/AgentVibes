#!/bin/bash
#
# @fileoverview ElevenLabs TTS Provider Implementation
# @context Provider-specific implementation for ElevenLabs API integration
# @architecture Part of multi-provider TTS system - implements provider interface
# @dependencies Requires ELEVENLABS_API_KEY, curl, ffmpeg, paplay/aplay/mpg123, jq
# @entrypoints Called by play-tts.sh router with ($1=text, $2=voice_name)
# @patterns Follows provider contract: accept text/voice, output audio file path
# @related play-tts.sh, provider-manager.sh, GitHub Issue #25
#

# Fix locale warnings
export LC_ALL=C

TEXT="$1"
VOICE_OVERRIDE="$2"  # Optional: voice name or direct voice ID
API_KEY="${ELEVENLABS_API_KEY}"

# Check for project-local pretext configuration
CONFIG_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/config"
CONFIG_FILE="$CONFIG_DIR/agentvibes.json"

if [[ -f "$CONFIG_FILE" ]] && command -v jq &> /dev/null; then
  PRETEXT=$(jq -r '.pretext // empty' "$CONFIG_FILE" 2>/dev/null)
  if [[ -n "$PRETEXT" ]]; then
    TEXT="$PRETEXT: $TEXT"
  fi
fi

# Limit text length to prevent API issues (max 500 chars for safety)
if [ ${#TEXT} -gt 500 ]; then
  TEXT="${TEXT:0:497}..."
  echo "⚠️ Text truncated to 500 characters for API safety"
fi

# Source the single voice configuration file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/voices-config.sh"
source "$SCRIPT_DIR/language-manager.sh"

# @function determine_voice_and_language
# @intent Resolve voice name/ID and language for multilingual support
# @why Supports both voice names and direct IDs, plus language-specific voices
# @param $VOICE_OVERRIDE {string} Voice name or ID (optional)
# @returns Sets $VOICE_ID and $LANGUAGE_CODE global variables
# @sideeffects None
# @edgecases Handles unknown voices, falls back to default
VOICE_ID=""
LANGUAGE_CODE="en"  # Default to English

# Get current language setting
CURRENT_LANGUAGE=$(get_current_language)

# Get language code for API
LANGUAGE_CODE=$(get_language_code_for_name "$CURRENT_LANGUAGE")
[[ -z "$LANGUAGE_CODE" ]] && LANGUAGE_CODE="en"

if [[ -n "$VOICE_OVERRIDE" ]]; then
  # Check if override is a voice name (lookup in mapping)
  if [[ -n "${VOICES[$VOICE_OVERRIDE]}" ]]; then
    VOICE_ID="${VOICES[$VOICE_OVERRIDE]}"
    echo "🎤 Using voice: $VOICE_OVERRIDE (session-specific)"
  # Check if override looks like a voice ID (alphanumeric string ~20 chars)
  elif [[ "$VOICE_OVERRIDE" =~ ^[a-zA-Z0-9]{15,30}$ ]]; then
    VOICE_ID="$VOICE_OVERRIDE"
    echo "🎤 Using custom voice ID (session-specific)"
  else
    echo "⚠️ Unknown voice '$VOICE_OVERRIDE', trying language-specific voice"
  fi
fi

# If no override or invalid override, use language-specific voice
if [[ -z "$VOICE_ID" ]]; then
  # Try to get voice for current language
  LANG_VOICE=$(get_voice_for_language "$CURRENT_LANGUAGE" "elevenlabs" 2>/dev/null)

  if [[ -n "$LANG_VOICE" ]] && [[ -n "${VOICES[$LANG_VOICE]}" ]]; then
    VOICE_ID="${VOICES[$LANG_VOICE]}"
    echo "🌍 Using $CURRENT_LANGUAGE voice: $LANG_VOICE"
  else
    # Fall back to voice manager
    VOICE_MANAGER_SCRIPT="$(dirname "$0")/voice-manager.sh"
    if [[ -f "$VOICE_MANAGER_SCRIPT" ]]; then
      VOICE_NAME=$("$VOICE_MANAGER_SCRIPT" get)
      VOICE_ID="${VOICES[$VOICE_NAME]}"
    fi

    # Final fallback to default
    if [[ -z "$VOICE_ID" ]]; then
      echo "⚠️ No voice configured, using default"
      VOICE_ID="${VOICES[Aria]}"
    fi
  fi
fi

# @function validate_inputs
# @intent Check required parameters and API key
# @why Fail fast with clear errors if inputs missing
# @exitcode 1=missing text, 2=missing API key
if [ -z "$TEXT" ]; then
  echo "Usage: $0 \"text to speak\" [voice_name_or_id]"
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "Error: ELEVENLABS_API_KEY not set"
  echo "Set your API key: export ELEVENLABS_API_KEY=your_key_here"
  exit 2
fi

# @function determine_audio_directory
# @intent Find appropriate directory for audio file storage
# @why Supports project-local and global storage
# @returns Sets $AUDIO_DIR global variable
# @sideeffects None
# @edgecases Handles missing directories, creates if needed
# AI NOTE: Check project dir first, then search up tree, finally fall back to global
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

mkdir -p "$AUDIO_DIR"
TEMP_FILE="$AUDIO_DIR/tts-$(date +%s).mp3"

# @function synthesize_with_elevenlabs
# @intent Call ElevenLabs API to generate speech
# @why Encapsulates API call with error handling
# @param Uses globals: $TEXT, $VOICE_ID, $API_KEY
# @returns Creates audio file at $TEMP_FILE
# @exitcode 0=success, 3=API error
# @sideeffects Creates MP3 file in audio directory
# @edgecases Handles network failures, API errors, rate limiting
# Choose model based on language
if [[ "$LANGUAGE_CODE" == "en" ]]; then
  MODEL_ID="eleven_monolingual_v1"
else
  MODEL_ID="eleven_multilingual_v2"
fi

curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"${TEXT}\",\"model_id\":\"${MODEL_ID}\",\"language_code\":\"${LANGUAGE_CODE}\",\"voice_settings\":{\"stability\":0.5,\"similarity_boost\":0.75}}" \
  -o "${TEMP_FILE}"

# @function add_silence_padding
# @intent Add silence to beginning of audio to prevent WSL static
# @why WSL audio subsystem cuts off first ~200ms, causing static/clipping
# @param Uses global: $TEMP_FILE
# @returns Updates $TEMP_FILE to padded version
# @sideeffects Modifies audio file, removes original
# @edgecases Gracefully falls back to unpadded if ffmpeg unavailable
# Add silence padding to prevent WSL audio static
if [ -f "${TEMP_FILE}" ]; then
  # Check if ffmpeg is available for adding padding
  if command -v ffmpeg &> /dev/null; then
    PADDED_FILE="$AUDIO_DIR/tts-padded-$(date +%s).mp3"
    # Add 200ms of silence at the beginning to prevent static
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo:d=0.2 -i "${TEMP_FILE}" \
      -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
      -map "[out]" -y "${PADDED_FILE}" 2>/dev/null

    if [ -f "${PADDED_FILE}" ]; then
      # Use padded file and clean up original
      rm -f "${TEMP_FILE}"
      TEMP_FILE="${PADDED_FILE}"
    fi
    # If padding failed, just use original file
  fi

  # @function play_audio
  # @intent Play generated audio file using available player
  # @why Support multiple audio players (paplay, aplay, mpg123)
  # @param Uses global: $TEMP_FILE
  # @sideeffects Plays audio in background
  # @edgecases Falls through players until one works
  # Play audio (WSL/Linux) in background to avoid blocking
  (paplay "${TEMP_FILE}" 2>/dev/null || aplay "${TEMP_FILE}" 2>/dev/null || mpg123 "${TEMP_FILE}" 2>/dev/null) &

  # Keep temp files for later review - cleaned up weekly by cron
  echo "🎵 Saved to: ${TEMP_FILE}"
  echo "🎤 Voice used: ${VOICE_NAME} (${VOICE_ID})"
else
  echo "❌ Failed to generate audio - API may be unavailable"
  echo "Check your API key and network connection"
  exit 3
fi
