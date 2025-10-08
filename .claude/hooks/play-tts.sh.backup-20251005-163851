#!/bin/bash
# Quick TTS playback script with session-specific voice support
# Usage: play-tts.sh "Text to speak" [voice_name_or_id]
#
# Examples:
#   play-tts.sh "Hello world"                           # Uses default voice from voice manager
#   play-tts.sh "Hello world" "Sarah"                   # Uses Sarah voice by name
#   play-tts.sh "Hello world" "KTPVrSVAEUSJRClDzBw7"   # Uses voice by direct ID
#
# This allows different sessions to use different voices for easy identification!

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

# Determine which voice to use
VOICE_ID=""

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
    echo "⚠️ Unknown voice '$VOICE_OVERRIDE', using default"
  fi
fi

# If no override or invalid override, use default from voice manager
if [[ -z "$VOICE_ID" ]]; then
  VOICE_MANAGER_SCRIPT="$(dirname "$0")/voice-manager.sh"
  if [[ -f "$VOICE_MANAGER_SCRIPT" ]]; then
    VOICE_NAME=$("$VOICE_MANAGER_SCRIPT" get)
    VOICE_ID="${VOICES[$VOICE_NAME]}"
  fi

  # Final fallback to Cowboy Bob default
  if [[ -z "$VOICE_ID" ]]; then
    echo "⚠️ No voice configured, using Cowboy Bob default"
    VOICE_ID="${VOICES[Cowboy Bob]}"
  fi
fi

if [ -z "$TEXT" ]; then
  echo "Usage: $0 \"text to speak\""
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "Error: ELEVENLABS_API_KEY not set"
  exit 1
fi

# Create audio file in project-local storage
# Use project directory if available, otherwise fall back to global
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

# Generate audio
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"${TEXT}\",\"model_id\":\"eleven_monolingual_v1\",\"voice_settings\":{\"stability\":0.5,\"similarity_boost\":0.75}}" \
  -o "${TEMP_FILE}"

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

  # Play audio (WSL/Linux) in background to avoid blocking
  (paplay "${TEMP_FILE}" 2>/dev/null || aplay "${TEMP_FILE}" 2>/dev/null || mpg123 "${TEMP_FILE}" 2>/dev/null) &
  # Keep temp files for later review - cleaned up weekly by cron
  echo "🎵 Saved to: ${TEMP_FILE}"
  echo "🎤 Voice used: ${VOICE_NAME} (${VOICE_ID})"
else
  echo "Failed to generate audio"
  exit 1
fi