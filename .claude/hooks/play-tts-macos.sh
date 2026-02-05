#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-macos.sh
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
# express or implied. Use at your own risk. See the Apache License for details.
#
# ---
#
# @fileoverview macOS Say Provider Implementation - Native macOS TTS using the 'say' command
# @context Provides zero-dependency, offline TTS for macOS users using built-in Apple voices
# @architecture Implements provider interface contract for macOS 'say' command integration
# @dependencies macOS only (Darwin), say command (built-in), afplay (built-in)
# @entrypoints Called by play-tts.sh router when provider=macos
# @patterns Provider contract: text/voice → audio file path, voice validation, platform guard
# @related play-tts.sh, macos-voice-manager.sh, provider-manager.sh
#

# Platform guard - fail fast on non-macOS systems
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "❌ Error: macOS provider only works on macOS"
  echo "   Current platform: $(uname -s)"
  echo ""
  echo "   Switch to a different provider:"
  echo "   /agent-vibes:provider switch piper"
  exit 1
fi

TEXT="$1"
VOICE_OVERRIDE="$2"  # Optional: voice name (e.g., "Samantha", "Daniel")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source audio cache utilities
source "$SCRIPT_DIR/audio-cache-utils.sh"

# Default voice for macOS
DEFAULT_VOICE="Samantha"

# Common macOS voices with descriptions
# These are typically available on all macOS systems
# Using simple list format for bash 3.x compatibility (macOS default)
show_common_voices() {
  echo "  Alex - American English male (enhanced)"
  echo "  Daniel - British English male (enhanced)"
  echo "  Fiona - Scottish English female (enhanced)"
  echo "  Karen - Australian English female (enhanced)"
  echo "  Moira - Irish English female (enhanced)"
  echo "  Samantha - American English female (enhanced)"
  echo "  Tessa - South African English female (enhanced)"
  echo "  Veena - Indian English female (enhanced)"
  echo "  Victoria - American English female"
}

# @function get_voice_file_path
# @intent Determine path to voice configuration file
# @returns Echoes path to tts-voice.txt
get_voice_file_path() {
  local voice_file=""

  if [[ -n "$CLAUDE_PROJECT_DIR" ]] && [[ -f "$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt" ]]; then
    voice_file="$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"
  elif [[ -f "$SCRIPT_DIR/../tts-voice.txt" ]]; then
    voice_file="$SCRIPT_DIR/../tts-voice.txt"
  elif [[ -f "$HOME/.claude/tts-voice.txt" ]]; then
    voice_file="$HOME/.claude/tts-voice.txt"
  fi

  echo "$voice_file"
}

# @function determine_voice
# @intent Resolve which voice to use
# @returns Sets $VOICE_NAME global variable
VOICE_NAME=""

if [[ -n "$VOICE_OVERRIDE" ]]; then
  VOICE_NAME="$VOICE_OVERRIDE"
  echo "🎤 Using voice: $VOICE_OVERRIDE (session-specific)"
else
  VOICE_FILE=$(get_voice_file_path)

  if [[ -n "$VOICE_FILE" ]] && [[ -f "$VOICE_FILE" ]]; then
    FILE_VOICE=$(cat "$VOICE_FILE" 2>/dev/null | tr -d '\n\r')
    if [[ -n "$FILE_VOICE" ]]; then
      VOICE_NAME="$FILE_VOICE"
    fi
  fi

  # Fallback to default if no voice set
  if [[ -z "$VOICE_NAME" ]]; then
    VOICE_NAME="$DEFAULT_VOICE"
  fi
fi

# @function validate_inputs
# @intent Check required parameters
if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 \"text to speak\" [voice_name]"
  echo ""
  echo "Common voices (run 'say -v ?' for full list):"
  show_common_voices
  exit 1
fi

# @function validate_voice
# @intent Check if the specified voice exists on this system
# @param $1 Voice name to validate
# @returns 0 if valid, 1 if not found
validate_voice() {
  local voice="$1"
  say -v ? 2>/dev/null | grep -qi "^${voice} "
}

# Validate voice exists (case-insensitive search)
if ! validate_voice "$VOICE_NAME"; then
  echo "⚠️  Voice '$VOICE_NAME' not found on this system"
  echo "   Falling back to default: $DEFAULT_VOICE"
  VOICE_NAME="$DEFAULT_VOICE"

  # If default also doesn't exist, try to find any English voice
  if ! validate_voice "$VOICE_NAME"; then
    VOICE_NAME=$(say -v ? 2>/dev/null | grep -i "en_" | head -1 | awk '{print $1}')
    if [[ -z "$VOICE_NAME" ]]; then
      echo "❌ No English voices found on this system"
      exit 2
    fi
    echo "   Using first available English voice: $VOICE_NAME"
  fi
fi

# @function determine_audio_directory
# @intent Find appropriate directory for audio file storage
if [[ -n "$CLAUDE_PROJECT_DIR" ]]; then
  AUDIO_DIR="$CLAUDE_PROJECT_DIR/.claude/audio"
else
  CURRENT_DIR="$PWD"
  while [[ "$CURRENT_DIR" != "/" ]]; do
    if [[ -d "$CURRENT_DIR/.claude" ]]; then
      AUDIO_DIR="$CURRENT_DIR/.claude/audio"
      break
    fi
    CURRENT_DIR=$(dirname "$CURRENT_DIR")
  done
  if [[ -z "$AUDIO_DIR" ]]; then
    AUDIO_DIR="$HOME/.claude/audio"
  fi
fi

mkdir -p "$AUDIO_DIR"

# Generate unique filename
TIMESTAMP=$(date +%s)
TEMP_FILE="$AUDIO_DIR/tts-${TIMESTAMP}.aiff"
FINAL_FILE="$AUDIO_DIR/tts-padded-${TIMESTAMP}.wav"

# @function get_speech_rate
# @intent Determine speech rate for synthesis
# @returns Speech rate value (words per minute, default ~175-200)
get_speech_rate() {
  local rate_config=""

  # Check for rate config file
  if [[ -f "$SCRIPT_DIR/../config/tts-speech-rate.txt" ]]; then
    rate_config="$SCRIPT_DIR/../config/tts-speech-rate.txt"
  elif [[ -f "$HOME/.claude/config/tts-speech-rate.txt" ]]; then
    rate_config="$HOME/.claude/config/tts-speech-rate.txt"
  fi

  if [[ -n "$rate_config" ]]; then
    local user_speed=$(cat "$rate_config" 2>/dev/null | grep -v '^#' | grep -v '^$' | tail -1)
    # Convert multiplier to words per minute (base ~200 WPM)
    # User: 0.5=slower, 1.0=normal, 2.0=faster
    echo "scale=0; 200 * $user_speed / 1" | bc -l 2>/dev/null || echo "200"
    return
  fi

  # Default: 200 WPM (normal rate)
  echo "200"
}

SPEECH_RATE=$(get_speech_rate)

# @function synthesize_with_say
# @intent Generate speech using macOS 'say' command
# @returns Creates audio file at $TEMP_FILE
echo "$TEXT" | say -v "$VOICE_NAME" -r "$SPEECH_RATE" -o "$TEMP_FILE" 2>/dev/null

if [[ ! -f "$TEMP_FILE" ]] || [[ ! -s "$TEMP_FILE" ]]; then
  echo "❌ Failed to synthesize speech with macOS say command"
  echo "Voice: $VOICE_NAME"
  exit 3
fi

# @function convert_and_pad_audio
# @intent Convert AIFF to WAV and add silence padding for consistency
# @why Maintains consistent audio format across providers
if command -v ffmpeg &> /dev/null; then
  # Add 200ms of silence at the beginning and convert to WAV
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo:d=0.2 -i "$TEMP_FILE" \
    -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
    -map "[out]" -y "$FINAL_FILE" 2>/dev/null

  if [[ -f "$FINAL_FILE" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$FINAL_FILE"
  fi
else
  # No ffmpeg - use AIFF directly (rename for consistency)
  FINAL_FILE="$AUDIO_DIR/tts-padded-${TIMESTAMP}.aiff"
  mv "$TEMP_FILE" "$FINAL_FILE"
  TEMP_FILE="$FINAL_FILE"
fi

# @function play_audio
# @intent Play generated audio - via PulseAudio tunnel for SSH, afplay for local
LOCK_FILE="/tmp/agentvibes-audio.lock"

# Wait for previous audio to finish (max 30 seconds)
for i in {1..60}; do
  if [ ! -f "$LOCK_FILE" ]; then
    break
  fi
  sleep 0.5
done

# Create lock and play audio
touch "$LOCK_FILE"

# Get audio duration for proper lock timing
if command -v ffprobe &> /dev/null; then
  DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEMP_FILE" 2>/dev/null)
  DURATION=${DURATION%.*}  # Round to integer
else
  # Estimate duration based on text length (~150 WPM)
  WORD_COUNT=$(echo "$TEXT" | wc -w)
  DURATION=$(( (WORD_COUNT * 60 / 150) + 1 ))
fi
DURATION=${DURATION:-2}  # Default to 2 seconds if detection fails

# Play audio in background (skip if in test mode or no-playback mode)
# AGENTVIBES_NO_PLAYBACK: Set to "true" to generate audio without playing (for post-processing)
if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]] && [[ "${AGENTVIBES_NO_PLAYBACK:-false}" != "true" ]]; then
  # Check if we're in an SSH session with PulseAudio tunnel available
  if [[ -n "$SSH_CONNECTION" ]] && [[ -n "$PULSE_SERVER" ]]; then
    # Use paplay to send audio through PulseAudio tunnel to remote machine
    if command -v /opt/homebrew/bin/paplay &> /dev/null; then
      /opt/homebrew/bin/paplay "$TEMP_FILE" >/dev/null 2>&1 &
      PLAYER_PID=$!
      echo "🔊 Playing via PulseAudio tunnel"
    else
      echo "⚠️  paplay not found - install pulseaudio for SSH audio"
      afplay "$TEMP_FILE" >/dev/null 2>&1 &
      PLAYER_PID=$!
    fi
  else
    # Local session - use native macOS player
    afplay "$TEMP_FILE" >/dev/null 2>&1 &
    PLAYER_PID=$!
  fi
fi

# Wait for audio to finish, then release lock
(sleep $DURATION; rm -f "$LOCK_FILE") &
disown

# Get audio cache stats
AUDIO_DIR_PATH=$(get_audio_dir)
FILE_COUNT=$(count_tts_files "$AUDIO_DIR_PATH")
SIZE_BYTES=$(calculate_tts_size_bytes "$AUDIO_DIR_PATH")
SIZE_HUMAN=$(bytes_to_human "$SIZE_BYTES")

# Color codes
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
LIGHT_PURPLE='\033[1;35m'
RED='\033[0;31m'
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
WHITE='\033[1;37m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
GOLD='\033[38;5;226m'
NC='\033[0m'

# Dynamic color coding based on cache size
# Green: < 500MB (small)
# Yellow: 500MB - 3GB (lots)
# Red: > 3GB (extreme)
CACHE_COLOR=$GREEN
if [[ $SIZE_BYTES -gt 3221225472 ]]; then  # > 3GB
  CACHE_COLOR=$RED
elif [[ $SIZE_BYTES -gt 524288000 ]]; then  # > 500MB
  CACHE_COLOR=$YELLOW
fi

# Display with file count and auto-clean indicator
# Get auto-clean threshold for display
AUTO_CLEAN_THRESHOLD=$(get_auto_clean_threshold)
echo -e "${WHITE}💾 Saved to:${NC} ${CYAN}$TEMP_FILE${NC} ${WHITE}📦${NC} ${YELLOW}$FILE_COUNT${NC} ${CACHE_COLOR}$SIZE_HUMAN${NC} ${WHITE}🧹${NC}${GOLD}[${AUTO_CLEAN_THRESHOLD}mb]${NC}"

# Auto-cleanup check - delete oldest files if over size threshold
THRESHOLD_MB=$(get_auto_clean_threshold)
if [[ $SIZE_BYTES -gt $((THRESHOLD_MB * 1048576)) ]]; then
  DELETED=$(auto_clean_old_files "$AUDIO_DIR_PATH" "$THRESHOLD_MB")
  if [[ $DELETED -gt 0 ]]; then
    echo -e "${ORANGE}🧹 Auto-cleaned $DELETED files${NC}"
  fi
fi

echo -e "${CYAN}🎤 Voice used:${NC} ${WHITE}$VOICE_NAME (macOS Say)${NC}"

# Show personality if configured
PERSONALITY=$(cat "$PROJECT_ROOT/.claude/tts-personality.txt" 2>/dev/null || cat "$HOME/.claude/tts-personality.txt" 2>/dev/null || echo "")
if [[ -n "$PERSONALITY" ]] && [[ "$PERSONALITY" != "none" ]] && [[ "$PERSONALITY" != "normal" ]]; then
  echo -e "${GOLD}💫 Personality:${NC} ${WHITE}$PERSONALITY${NC}"
fi

# Check audio folder size and warn if getting large
if [[ -d "$AUDIO_DIR_PATH" ]]; then
  AUDIO_SIZE=$(du -sm "$AUDIO_DIR_PATH" 2>/dev/null | cut -f1)
  if [[ -n "$AUDIO_SIZE" ]] && [[ "$AUDIO_SIZE" -gt 100 ]]; then
    echo -e "\033[0;31m⚠️  Audio cache is ${AUDIO_SIZE}MB - Run: /agent-vibes:cleanup\033[0m"
  fi
fi
