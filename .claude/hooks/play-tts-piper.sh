#!/bin/bash
#
# @fileoverview Piper TTS Provider Implementation
# @context Free, offline neural TTS for WSL/Linux
# @architecture Implements provider contract for Piper binary
# @dependencies piper (pipx), piper-voice-manager.sh, mpv/aplay
# @entrypoints Called by play-tts.sh router
# @patterns Provider contract: text/voice → audio file path
# @related play-tts.sh, piper-voice-manager.sh, GitHub Issue #25
#

# Fix locale warnings
export LC_ALL=C

TEXT="$1"
VOICE_OVERRIDE="$2"  # Optional: voice model name

# Source voice manager and language manager
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/piper-voice-manager.sh"
source "$SCRIPT_DIR/language-manager.sh"

# Default voice for Piper
DEFAULT_VOICE="en_US-lessac-medium"

# @function determine_voice_model
# @intent Resolve voice name to Piper model name with language support
# @why Support voice override, language-specific voices, and default fallback
# @param Uses global: $VOICE_OVERRIDE
# @returns Sets $VOICE_MODEL global variable
# @sideeffects None
VOICE_MODEL=""

# Get current language setting
CURRENT_LANGUAGE=$(get_current_language)

if [[ -n "$VOICE_OVERRIDE" ]]; then
  # Use override if provided
  VOICE_MODEL="$VOICE_OVERRIDE"
  echo "🎤 Using voice: $VOICE_OVERRIDE (session-specific)"
else
  # Try to get language-specific voice
  LANG_VOICE=$(get_voice_for_language "$CURRENT_LANGUAGE" "piper" 2>/dev/null)

  if [[ -n "$LANG_VOICE" ]]; then
    VOICE_MODEL="$LANG_VOICE"
    echo "🌍 Using $CURRENT_LANGUAGE voice: $LANG_VOICE (Piper)"
  else
    # Use default voice
    VOICE_MODEL="$DEFAULT_VOICE"
  fi
fi

# @function validate_inputs
# @intent Check required parameters
# @why Fail fast with clear errors if inputs missing
# @exitcode 1=missing text, 2=missing piper binary
if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 \"text to speak\" [voice_model_name]"
  exit 1
fi

# Check if Piper is installed
if ! command -v piper &> /dev/null; then
  echo "❌ Error: Piper TTS not installed"
  echo "Install with: pipx install piper-tts"
  echo "Or run: .claude/hooks/piper-installer.sh"
  exit 2
fi

# @function ensure_voice_downloaded
# @intent Download voice model if not cached
# @why Provide seamless experience with automatic downloads
# @param Uses global: $VOICE_MODEL
# @sideeffects Downloads voice model files
# @edgecases Prompts user for consent before downloading
if ! verify_voice "$VOICE_MODEL"; then
  echo "📥 Voice model not found: $VOICE_MODEL"
  echo "   File size: ~25MB"
  echo "   Preview: https://huggingface.co/rhasspy/piper-voices"
  echo ""
  read -p "   Download this voice model? [y/N]: " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! download_voice "$VOICE_MODEL"; then
      echo "❌ Failed to download voice model"
      echo "Fix: Download manually or choose different voice"
      exit 3
    fi
  else
    echo "❌ Voice download cancelled"
    exit 3
  fi
fi

# Get voice model path
VOICE_PATH=$(get_voice_path "$VOICE_MODEL")
if [[ $? -ne 0 ]]; then
  echo "❌ Voice model path not found: $VOICE_MODEL"
  exit 3
fi

# @function determine_audio_directory
# @intent Find appropriate directory for audio file storage
# @why Supports project-local and global storage
# @returns Sets $AUDIO_DIR global variable
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
TEMP_FILE="$AUDIO_DIR/tts-$(date +%s).wav"

# @function synthesize_with_piper
# @intent Generate speech using Piper TTS
# @why Provides free, offline TTS alternative
# @param Uses globals: $TEXT, $VOICE_PATH
# @returns Creates WAV file at $TEMP_FILE
# @exitcode 0=success, 4=synthesis error
# @sideeffects Creates audio file
# @edgecases Handles piper errors, invalid models
echo "$TEXT" | piper --model "$VOICE_PATH" --output_file "$TEMP_FILE" 2>/dev/null

if [[ ! -f "$TEMP_FILE" ]] || [[ ! -s "$TEMP_FILE" ]]; then
  echo "❌ Failed to synthesize speech with Piper"
  echo "Voice model: $VOICE_MODEL"
  echo "Check that voice model is valid"
  exit 4
fi

# @function add_silence_padding
# @intent Add silence to prevent WSL audio static
# @why WSL audio subsystem cuts off first ~200ms
# @param Uses global: $TEMP_FILE
# @returns Updates $TEMP_FILE to padded version
# @sideeffects Modifies audio file
# AI NOTE: Use ffmpeg if available, otherwise skip padding (degraded experience)
if command -v ffmpeg &> /dev/null; then
  PADDED_FILE="$AUDIO_DIR/tts-padded-$(date +%s).wav"
  # Add 200ms of silence at the beginning
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo:d=0.2 -i "$TEMP_FILE" \
    -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
    -map "[out]" -y "$PADDED_FILE" 2>/dev/null

  if [[ -f "$PADDED_FILE" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$PADDED_FILE"
  fi
fi

# @function play_audio
# @intent Play generated audio using available player
# @why Support multiple audio players
# @param Uses global: $TEMP_FILE
# @sideeffects Plays audio in background
# Play audio (WSL/Linux) in background
(mpv "$TEMP_FILE" 2>/dev/null || aplay "$TEMP_FILE" 2>/dev/null || paplay "$TEMP_FILE" 2>/dev/null) &

echo "🎵 Saved to: $TEMP_FILE"
echo "🎤 Voice used: $VOICE_MODEL (Piper TTS)"
