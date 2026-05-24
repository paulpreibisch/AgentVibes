#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-piper.sh
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
# @fileoverview Piper TTS Provider Implementation - Free, offline neural TTS
# @context Provides local, privacy-first TTS alternative to cloud services for WSL/Linux
# @architecture Implements provider interface contract for Piper binary integration
# @dependencies piper (pipx), piper-voice-manager.sh, mpv/aplay, ffmpeg (optional padding)
# @entrypoints Called by play-tts.sh router when provider=piper
# @patterns Provider contract: text/voice → audio file path, voice auto-download, language-aware synthesis
# @related play-tts.sh, piper-voice-manager.sh, language-manager.sh, GitHub Issue #25
#

set -eo pipefail
# Note: -u (nounset) omitted because sourced scripts (piper-voice-manager.sh,
# language-manager.sh, audio-cache-utils.sh) use unset variables freely.
# Variables in THIS script use ${VAR:-} defaults for safety.

# Cleanup handler for temp files (preserves final output in $TEMP_FILE)
_CLEANUP_FILES=()
cleanup() {
  local f
  for f in "${_CLEANUP_FILES[@]+"${_CLEANUP_FILES[@]}"}"; do
    [[ "$f" == "${TEMP_FILE:-}" ]] && continue
    rm -f "$f"
  done
}
trap cleanup EXIT

# Fix locale warnings
export LC_ALL=C

TEXT="${1:-}"
VOICE_OVERRIDE="${2:-}"       # Optional: voice model name
AGENT_PROFILE_FILE="${3:-}"   # Optional: path to per-agent profile JSON (from bmad-speak.sh)

# Strip emojis, asterisks, and markdown formatting that Piper would speak literally
TEXT=$(printf '%s' "$TEXT" | perl -CSD -pe '
  s/[\x{1F300}-\x{1F9FF}]//g;   # emoticons, symbols, pictographs
  s/[\x{2600}-\x{27BF}]//g;     # misc symbols, dingbats
  s/[\x{FE00}-\x{FE0F}]//g;     # variation selectors
  s/[\x{200D}]//g;               # zero-width joiner
  s/[\x{2500}-\x{257F}]//g;     # box drawing (─━ etc)
  s/[\x{2580}-\x{259F}]//g;     # block elements
  s/\*+//g;                       # asterisks (bold/italic markdown)
  s/#+\s*//g;                     # heading markers
  s/`//g;                         # backticks
  s/~+//g;                        # strikethrough
  s/^\s*[-]\s*//g;                # list dashes
')

# cd-based resolution works on macOS (BSD readlink lacks -f) and Linux alike
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/piper-voice-manager.sh"
source "$SCRIPT_DIR/language-manager.sh"
source "$SCRIPT_DIR/audio-cache-utils.sh"

# Default voice for Piper
DEFAULT_VOICE="en_US-lessac-medium"

# @function determine_voice_model
# @intent Resolve voice name to Piper model name with language support
# @why Support voice override, language-specific voices, and default fallback
# @param Uses global: $VOICE_OVERRIDE
# @returns Sets $VOICE_MODEL global variable
# @sideeffects None
VOICE_MODEL=""
FILE_VOICE=""

# Get current language setting
CURRENT_LANGUAGE=$(get_language_code)

if [[ -n "$VOICE_OVERRIDE" ]]; then
  # Use override if provided
  # Handle multi-speaker format: "Model::SpeakerName" → split into model + speaker lookup
  if [[ "$VOICE_OVERRIDE" == *"::"* ]]; then
    VOICE_MODEL="${VOICE_OVERRIDE%%::*}"
    _SPEAKER_NAME="${VOICE_OVERRIDE#*::}"
    # Look up speaker ID from the model's .onnx.json speaker_id_map
    voice_dir=$(get_voice_storage_dir)
    _JSON_FILE="$voice_dir/${VOICE_MODEL}.onnx.json"
    if [[ -f "$_JSON_FILE" ]]; then
      # SECURITY: Pass values via env vars to prevent shell injection
      SPEAKER_ID=$(_JSON="$_JSON_FILE" _SPKR="$_SPEAKER_NAME" node -e "
        try {
          const j = JSON.parse(require('fs').readFileSync(process.env._JSON,'utf8'));
          const map = j.speaker_id_map || {};
          const id = map[process.env._SPKR];
          if (id !== undefined) process.stdout.write(String(id));
        } catch {}
      " 2>/dev/null || true)
    fi
    echo "🎭 Using multi-speaker voice: $VOICE_OVERRIDE (Model: $VOICE_MODEL, Speaker ID: ${SPEAKER_ID:-?})"
  else
    VOICE_MODEL="$VOICE_OVERRIDE"
    echo "🎤 Using voice: $VOICE_OVERRIDE (session-specific)"
  fi
else
  # Try to get voice from voice file (check CLAUDE_PROJECT_DIR first for MCP context)
  VOICE_FILE=""

  # Priority order:
  # 1. CLAUDE_PROJECT_DIR env var (set by MCP for project-specific settings)
  # 2. Script location (for direct slash command usage)
  # 3. Global ~/.claude (fallback)

  # SECURITY: Canonicalize path to prevent traversal (#128)
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
    CLAUDE_PROJECT_DIR=$(cd "${CLAUDE_PROJECT_DIR}" 2>/dev/null && pwd -P) || CLAUDE_PROJECT_DIR=""
  fi
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]] && [[ -f "$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt" ]]; then
    # MCP context: Use the project directory where MCP was invoked
    VOICE_FILE="$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"
  elif [[ -f "$SCRIPT_DIR/../tts-voice.txt" ]]; then
    # Direct usage: Use script location
    VOICE_FILE="$SCRIPT_DIR/../tts-voice.txt"
  elif [[ -f "$HOME/.claude/tts-voice.txt" ]]; then
    # Fallback: Use global
    VOICE_FILE="$HOME/.claude/tts-voice.txt"
  fi

  if [[ -n "$VOICE_FILE" ]]; then
    FILE_VOICE=$(cat "$VOICE_FILE" 2>/dev/null)

    # Check for multi-speaker voice (model + speaker ID stored separately)
    # Use same directory as VOICE_FILE for consistency
    VOICE_DIR=$(dirname "$VOICE_FILE")
    MODEL_FILE="$VOICE_DIR/tts-piper-model.txt"
    SPEAKER_ID_FILE="$VOICE_DIR/tts-piper-speaker-id.txt"

    if [[ -f "$MODEL_FILE" ]] && [[ -f "$SPEAKER_ID_FILE" ]]; then
      # Multi-speaker voice config found locally
      VOICE_MODEL=$(cat "$MODEL_FILE" 2>/dev/null)
      SPEAKER_ID=$(cat "$SPEAKER_ID_FILE" 2>/dev/null)
      # Validate speaker ID is numeric
      if [[ -n "$SPEAKER_ID" ]] && ! [[ "$SPEAKER_ID" =~ ^[0-9]+$ ]]; then
        echo "Warning: Invalid speaker ID '$SPEAKER_ID', ignoring" >&2
        SPEAKER_ID=""
      fi
      echo "🎭 Using multi-speaker voice: $FILE_VOICE (Model: $VOICE_MODEL, Speaker ID: ${SPEAKER_ID:-none})"
    # Check if voice uses Model::SpeakerName format (from AgentVibes config)
    elif [[ -n "$FILE_VOICE" ]] && [[ "$FILE_VOICE" == *"::"* ]]; then
      VOICE_MODEL="${FILE_VOICE%%::*}"
      _SPEAKER_NAME="${FILE_VOICE#*::}"
      voice_dir=$(get_voice_storage_dir)
      _JSON_FILE="$voice_dir/${VOICE_MODEL}.onnx.json"
      if [[ -f "$_JSON_FILE" ]]; then
        # SECURITY: Pass values via env vars to prevent shell injection
        SPEAKER_ID=$(_JSON="$_JSON_FILE" _SPKR="$_SPEAKER_NAME" node -e "
          try {
            const j = JSON.parse(require('fs').readFileSync(process.env._JSON,'utf8'));
            const map = j.speaker_id_map || {};
            const id = map[process.env._SPKR];
            if (id !== undefined) process.stdout.write(String(id));
          } catch {}
        " 2>/dev/null || true)
      fi
      echo "🎭 Using multi-speaker voice: $FILE_VOICE (Model: $VOICE_MODEL, Speaker ID: ${SPEAKER_ID:-?})"
    # Standard Piper model name or custom voice (just use as-is)
    elif [[ -n "$FILE_VOICE" ]]; then
      # Strip multi-speaker suffix if present (model::SpeakerName-Label)
      if [[ "$FILE_VOICE" == *"::"* ]]; then
        VOICE_MODEL="${FILE_VOICE%%::*}"
      else
        VOICE_MODEL="$FILE_VOICE"
      fi
    fi
  fi

  # If no Piper voice from file, try language-specific voice
  if [[ -z "$VOICE_MODEL" ]]; then
    LANG_VOICE=$(get_voice_for_language "$CURRENT_LANGUAGE" "piper" 2>/dev/null)

    if [[ -n "$LANG_VOICE" ]]; then
      VOICE_MODEL="$LANG_VOICE"
      echo "🌍 Using $CURRENT_LANGUAGE voice: $LANG_VOICE (Piper)"
    else
      # Use default voice
      VOICE_MODEL="$DEFAULT_VOICE"
    fi
  fi
fi

# Preserve full display name (with ::SpeakerName) before any stripping for logging
if [[ -n "$VOICE_OVERRIDE" ]]; then
  DISPLAY_VOICE_NAME="$VOICE_OVERRIDE"
elif [[ -n "$FILE_VOICE" ]]; then
  DISPLAY_VOICE_NAME="$FILE_VOICE"
else
  DISPLAY_VOICE_NAME="$VOICE_MODEL"
fi

# @function validate_inputs
# @intent Check required parameters
# @why Fail fast with clear errors if inputs missing
# @exitcode 1=missing text, 2=missing piper binary
if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 \"text to speak\" [voice_model_name]"
  exit 1
fi

# Augment PATH for non-interactive shells (pipx installs to ~/.local/bin which
# interactive shells get via .bashrc/.zshrc, but Bash tool calls skip profile).
# Mac: add both Apple Silicon (/opt/homebrew) and Intel (/usr/local) Homebrew locations.
export PATH="$HOME/.local/bin:$HOME/.local/share/pipx/venvs/piper-tts/bin:$PATH"
if [[ "$(uname -s 2>/dev/null)" == "Darwin" ]]; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi

# Resolve explicit piper binary path — avoids bare `piper` invocation failing when
# PATH augmentation above hasn't propagated into nested subshells.
PIPER_BIN=$(command -v piper 2>/dev/null || echo "")

# Check if Piper is installed
if [[ -z "$PIPER_BIN" ]]; then
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
# @edgecases Prompts user for consent before downloading, skipped in test mode
if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]] && ! verify_voice "$VOICE_MODEL"; then
  echo "📥 Voice model not found: $VOICE_MODEL"
  echo "   File size: ~25MB"
  echo "   Preview: https://huggingface.co/rhasspy/piper-voices"
  echo ""

  # Auto-download when non-interactive (e.g. called from a hook)
  if [[ ! -t 0 ]]; then
    echo "   Auto-downloading (non-interactive mode)..."
    if ! download_voice "$VOICE_MODEL"; then
      echo "❌ Failed to download voice model"
      echo "Fix: Download manually or choose different voice"
      exit 3
    fi
  else
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
fi

# Get voice model path
# In test mode, use a fake path since we have mock piper that doesn't need real files
if [[ "${AGENTVIBES_TEST_MODE:-false}" == "true" ]]; then
  VOICE_PATH="/tmp/mock-voice-${VOICE_MODEL}.onnx"
else
  VOICE_PATH=$(get_voice_path "$VOICE_MODEL")
  if [[ $? -ne 0 ]]; then
    echo "❌ Voice model path not found: $VOICE_MODEL"
    exit 3
  fi
fi

# @function determine_audio_directory
# @intent Find appropriate directory for audio file storage
# @why Supports project-local and global storage
# @returns Sets $AUDIO_DIR global variable
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
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
  if [[ -z "${AUDIO_DIR:-}" ]]; then
    AUDIO_DIR="$HOME/.claude/audio"
  fi
fi

mkdir -p "$AUDIO_DIR"
# Normalize to canonical path (handles Git Bash /tmp→/c/Users/..., macOS /var→/private/var)
AUDIO_DIR=$(cd "$AUDIO_DIR" && pwd -P)
_tmp=$(mktemp "$AUDIO_DIR/tts-XXXXXX"); TEMP_FILE="${_tmp}.wav"; mv "$_tmp" "$TEMP_FILE"

# @function get_speech_rate
# @intent Determine speech rate for Piper synthesis
# @why Convert user-facing speed (0.5=slower, 2.0=faster) to Piper length-scale (inverted)
# @returns Piper length-scale value (inverted from user scale)
# @note Piper uses length-scale where higher=slower, opposite of user expectation
get_speech_rate() {
  local target_config=""
  local main_config=""

  # Check for target-specific config first (new and legacy paths)
  if [[ -f "$SCRIPT_DIR/../config/tts-target-speech-rate.txt" ]]; then
    target_config="$SCRIPT_DIR/../config/tts-target-speech-rate.txt"
  elif [[ -f "$HOME/.claude/config/tts-target-speech-rate.txt" ]]; then
    target_config="$HOME/.claude/config/tts-target-speech-rate.txt"
  elif [[ -f "$SCRIPT_DIR/../config/piper-target-speech-rate.txt" ]]; then
    target_config="$SCRIPT_DIR/../config/piper-target-speech-rate.txt"
  elif [[ -f "$HOME/.claude/config/piper-target-speech-rate.txt" ]]; then
    target_config="$HOME/.claude/config/piper-target-speech-rate.txt"
  fi

  # Check for main config (new and legacy paths)
  if [[ -f "$SCRIPT_DIR/../config/tts-speech-rate.txt" ]]; then
    main_config="$SCRIPT_DIR/../config/tts-speech-rate.txt"
  elif [[ -f "$HOME/.claude/config/tts-speech-rate.txt" ]]; then
    main_config="$HOME/.claude/config/tts-speech-rate.txt"
  elif [[ -f "$SCRIPT_DIR/../config/piper-speech-rate.txt" ]]; then
    main_config="$SCRIPT_DIR/../config/piper-speech-rate.txt"
  elif [[ -f "$HOME/.claude/config/piper-speech-rate.txt" ]]; then
    main_config="$HOME/.claude/config/piper-speech-rate.txt"
  fi

  # If this is a non-English voice and target config exists, use it
  if [[ "$CURRENT_LANGUAGE" != "english" ]] && [[ -n "$target_config" ]]; then
    local user_speed=$(cat "$target_config" 2>/dev/null)
    # Validate speed is a positive number
    if ! [[ "$user_speed" =~ ^[0-9]*\.?[0-9]+$ ]] || [[ "$user_speed" == "0" ]] || [[ "$user_speed" == "0.0" ]]; then
      echo "1.0"
      return
    fi
    # Convert user speed to Piper length-scale (invert)
    # User: 0.5=slower, 1.0=normal, 2.0=faster
    # Piper: 2.0=slower, 1.0=normal, 0.5=faster
    # Formula: piper_length_scale = 1.0 / user_speed
    echo "scale=2; 1.0 / $user_speed" | bc -l 2>/dev/null || echo "1.0"
    return
  fi

  # Otherwise use main config if available
  if [[ -n "$main_config" ]]; then
    local user_speed=$(grep -v '^#' "$main_config" 2>/dev/null | grep -v '^$' | tail -1)
    # Validate speed is a positive number
    if ! [[ "$user_speed" =~ ^[0-9]*\.?[0-9]+$ ]] || [[ "$user_speed" == "0" ]] || [[ "$user_speed" == "0.0" ]]; then
      echo "1.0"
      return
    fi
    echo "scale=2; 1.0 / $user_speed" | bc -l 2>/dev/null || echo "1.0"
    return
  fi

  # Default: 1.0 (normal) for English, 2.0 (slower) for learning
  if [[ "$CURRENT_LANGUAGE" != "english" ]]; then
    echo "2.0"
  else
    echo "1.0"
  fi
}

SPEECH_RATE=$(get_speech_rate)

# Ensure piper log directory exists so stderr redirect never silently fails
_PIPER_LOG_DIR="${AGENTVIBES_LOG_DIR:-$HOME/.local/state/agentvibes/logs}"
mkdir -p "$_PIPER_LOG_DIR" 2>/dev/null || true

# @function synthesize_with_piper
# @intent Generate speech using Piper TTS
# @why Provides free, offline TTS alternative
# @param Uses globals: $TEXT, $VOICE_PATH, $SPEECH_RATE, $SPEAKER_ID (optional)
# @returns Creates WAV file at $TEMP_FILE
# @exitcode 0=success, 4=synthesis error
# @sideeffects Creates audio file
# @edgecases Handles piper errors, invalid models, multi-speaker voices
if [[ -n "${SPEAKER_ID:-}" ]]; then
  # Multi-speaker voice: Pass speaker ID
  # SECURITY: Use printf instead of echo for pipe safety (#134)
  printf '%s\n' "$TEXT" | "$PIPER_BIN" --model "$VOICE_PATH" --speaker "$SPEAKER_ID" --length-scale "$SPEECH_RATE" --sentence-silence 2.0 --output_file "$TEMP_FILE" 2>>"$_PIPER_LOG_DIR/piper.log"
else
  # Single-speaker voice
  printf '%s\n' "$TEXT" | "$PIPER_BIN" --model "$VOICE_PATH" --length-scale "$SPEECH_RATE" --sentence-silence 2.0 --output_file "$TEMP_FILE" 2>>"$_PIPER_LOG_DIR/piper.log"
fi

if [[ ! -f "$TEMP_FILE" ]] || [[ ! -s "$TEMP_FILE" ]]; then
  echo "❌ Failed to synthesize speech with Piper"
  echo "Voice model: $VOICE_MODEL"
  echo "Check that voice model is valid"
  exit 4
fi

# @function detect_remote_session
# @intent Auto-detect SSH/RDP sessions and enable audio compression
# @why Remote desktop audio is choppy without compression
# @returns Sets AGENTVIBES_RDP_MODE environment variable
# @detection Checks SSH_CLIENT, SSH_TTY, and DISPLAY variables
if [[ -z "${AGENTVIBES_RDP_MODE:-}" ]]; then
  # Auto-detect remote session
  if [[ -n "${SSH_CLIENT:-}" ]] || [[ -n "${SSH_TTY:-}" ]] || [[ "${DISPLAY:-}" =~ ^localhost:.* ]]; then
    export AGENTVIBES_RDP_MODE=true
    echo "🌐 Remote session detected - enabling audio compression"
  fi
fi

# @function compress_for_remote
# @intent Compress TTS audio for remote sessions (SSH/RDP)
# @why Reduces bandwidth and prevents choppy playback
# @param Uses global: $TEMP_FILE, $AGENTVIBES_RDP_MODE
# @returns Updates $TEMP_FILE to compressed version
# @sideeffects Converts to mono 22kHz for lower bandwidth
if [[ "${AGENTVIBES_RDP_MODE:-false}" == "true" ]] && command -v ffmpeg &> /dev/null; then
  _tmp=$(mktemp "$AUDIO_DIR/tts-compressed-XXXXXX"); COMPRESSED_FILE="${_tmp}.wav"; mv "$_tmp" "$COMPRESSED_FILE"
  _CLEANUP_FILES+=("$COMPRESSED_FILE")
  # Convert to mono, 22kHz, 64kbps for remote sessions
  ffmpeg -i "$TEMP_FILE" -ac 1 -ar 22050 -b:a 64k -y "$COMPRESSED_FILE" 2>/dev/null

  if [[ -f "$COMPRESSED_FILE" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$COMPRESSED_FILE"
  fi
fi

# @function add_silence_padding
# @intent Add silence to prevent WSL audio static
# @why WSL audio subsystem cuts off first ~200ms
# @param Uses global: $TEMP_FILE
# @returns Updates $TEMP_FILE to padded version
# @sideeffects Modifies audio file
# AI NOTE: Use ffmpeg if available, otherwise skip padding (degraded experience)
if command -v ffmpeg &> /dev/null; then
  _tmp=$(mktemp "$AUDIO_DIR/tts-padded-XXXXXX"); PADDED_FILE="${_tmp}.wav"; mv "$_tmp" "$PADDED_FILE"
  _CLEANUP_FILES+=("$PADDED_FILE")
  # Add 200ms of silence at the beginning
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo:d=0.2 -i "$TEMP_FILE" \
    -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
    -map "[out]" -y "$PADDED_FILE" 2>/dev/null

  if [[ -f "$PADDED_FILE" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$PADDED_FILE"
  fi
fi

# @function apply_audio_effects
# @intent Apply sox effects and background music via audio-processor.sh
# @param Uses global: $TEMP_FILE
# @returns Updates $TEMP_FILE to processed version, sets $BACKGROUND_MUSIC if used
# @sideeffects Applies audio effects and background music
BACKGROUND_MUSIC=""
if [[ -f "$SCRIPT_DIR/audio-processor.sh" ]]; then
  _tmp=$(mktemp "$AUDIO_DIR/tts-processed-XXXXXX"); PROCESSED_FILE="${_tmp}.wav"; mv "$_tmp" "$PROCESSED_FILE"
  _CLEANUP_FILES+=("$PROCESSED_FILE")
  # audio-processor.sh returns: FILE_PATH|BACKGROUND_FILE
  # Lookup order: LLM key (from --llm) → default
  _AGENT_KEY="${AGENTVIBES_LLM_KEY:-default}"
  PROCESSOR_OUTPUT=$(bash "$SCRIPT_DIR/audio-processor.sh" "$TEMP_FILE" "$_AGENT_KEY" "$PROCESSED_FILE" "$AGENT_PROFILE_FILE" 2>/dev/null) || {
    echo "Warning: Audio processing failed, using unprocessed audio" >&2
    PROCESSED_FILE="$TEMP_FILE"
    PROCESSOR_OUTPUT="$TEMP_FILE|"
  }

  # Parse output: FILE|BACKGROUND
  PROCESSED_FILE="${PROCESSOR_OUTPUT%%|*}"
  BACKGROUND_MUSIC="${PROCESSOR_OUTPUT##*|}"

  if [[ -f "$PROCESSED_FILE" ]] && [[ "$PROCESSED_FILE" != "$TEMP_FILE" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$PROCESSED_FILE"
  fi
fi

# @function play_audio
# @intent Play generated audio using available player with sequential playback
# @why Support multiple audio players and prevent overlapping audio in learning mode
# @param Uses global: $TEMP_FILE, $CURRENT_LANGUAGE
# @sideeffects Plays audio with lock mechanism for sequential playback
_LOCK_DIR="${XDG_RUNTIME_DIR:-/tmp/agentvibes-$(id -u)}"
mkdir -p "$_LOCK_DIR"
chmod 700 "$_LOCK_DIR"
LOCK_FILE="$_LOCK_DIR/agentvibes-audio.lock"

# Auto-remove stale lock files (older than 30 seconds) to prevent permanent blocking
# This handles cases where the background cleanup process was killed mid-playback
if [ -f "$LOCK_FILE" ]; then
  _lock_age=0
  if [[ "$(uname)" == "Darwin" ]]; then
    _lock_mtime=$(stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0)
  else
    _lock_mtime=$(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)
  fi
  _now=$(date +%s)
  _lock_age=$((_now - _lock_mtime))
  if [[ $_lock_age -gt 30 ]]; then
    rm -f "$LOCK_FILE"
  fi
fi

# Wait for previous audio to finish (max 15 seconds to prevent overlapping playback)
for i in {1..30}; do
  if [ ! -f "$LOCK_FILE" ]; then
    break
  fi
  sleep 0.5
done

# If still locked after 15 seconds, skip this TTS to prevent blocking Claude
if [ -f "$LOCK_FILE" ]; then
  echo "⏭️  Skipping TTS (previous audio still playing after 15s)" >&2
  exit 0
fi

# Track last target language audio for replay command
if [[ "$CURRENT_LANGUAGE" != "english" ]]; then
  TARGET_AUDIO_FILE="${CLAUDE_PROJECT_DIR:-${HOME}}/.claude/last-target-audio.txt"
  echo "$TEMP_FILE" > "$TARGET_AUDIO_FILE"
fi

# Create lock and play audio
touch "$LOCK_FILE"

# Create write lock file in audio directory to signal file is in-use (prevents race condition in cleanup)
AUDIO_DIR="${TEMP_FILE%/*}"
WRITE_LOCK_FILE="$AUDIO_DIR/$(basename "$TEMP_FILE" .wav).lock"
touch "$WRITE_LOCK_FILE"

# Get audio duration for proper lock timing
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEMP_FILE" 2>/dev/null || true)
DURATION=${DURATION%.*}  # Round to integer
# SECURITY: Validate duration is numeric (#134)
if ! [[ "${DURATION:-}" =~ ^[0-9]+$ ]]; then
  DURATION=1
fi

# Play audio (skip if in test mode or no-playback mode)
# AGENTVIBES_NO_PLAYBACK: Set to "true" to generate audio without playing (for post-processing)
PLAYER_PID=""
if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]] && [[ "${AGENTVIBES_NO_PLAYBACK:-false}" != "true" ]]; then
  # Detect platform and use appropriate audio player
  if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS: Use afplay (native macOS audio player)
    afplay "$TEMP_FILE" >/dev/null 2>&1 &
    PLAYER_PID=$!
  elif [[ -n "${TERMUX_VERSION:-}" ]] || [[ -d "/data/data/com.termux" ]]; then
    # Android/Termux: Use termux-media-player
    termux-media-player play "$TEMP_FILE" >/dev/null 2>&1 &
    PLAYER_PID=$!
  else
    # Linux/WSL: paplay with 500ms latency buffer prevents choppiness over RDP/network audio
    (paplay --latency-msec=500 "$TEMP_FILE" || mpv "$TEMP_FILE" || aplay -B 2000000 "$TEMP_FILE") >/dev/null 2>&1 &
    PLAYER_PID=$!
  fi
fi

# Lock will be released after player finishes (see wait + rm below).
# Removed timer-based release — sleep $DURATION was underestimating actual
# playback time (paplay startup latency, network audio), causing early lock
# release and TTS overlap. Now released only after wait $PLAYER_PID returns.

# Get audio cache path
AUDIO_DIR_PATH=$(get_audio_dir)

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

# CRITICAL: Run auto-cleanup FIRST (before calculating size)
# This ensures we display the POST-cleanup size, not pre-cleanup size
AUTO_CLEAN_THRESHOLD=$(get_auto_clean_threshold)
INITIAL_SIZE=$(calculate_tts_size_bytes "$AUDIO_DIR_PATH")
if [[ $INITIAL_SIZE -gt $((AUTO_CLEAN_THRESHOLD * 1048576)) ]]; then
  DELETED=$(auto_clean_old_files "$AUDIO_DIR_PATH" "$AUTO_CLEAN_THRESHOLD")
  if [[ $DELETED -gt 0 ]]; then
    echo -e "${ORANGE}🧹 Auto-cleaned $DELETED old files${NC}"
  fi
fi

# NOW calculate cache stats after cleanup
FILE_COUNT=$(count_tts_files "$AUDIO_DIR_PATH")
SIZE_BYTES=$(calculate_tts_size_bytes "$AUDIO_DIR_PATH")
SIZE_HUMAN=$(bytes_to_human "$SIZE_BYTES")

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

# Display with file count (now showing accurate post-cleanup size)
echo -e "${WHITE}💾 Saved to:${NC} ${CYAN}$TEMP_FILE${NC} ${YELLOW}$FILE_COUNT${NC} ${WHITE}🗄️${NC} ${CACHE_COLOR}$SIZE_HUMAN${NC} ${WHITE}🧹${NC}${GOLD}[${AUTO_CLEAN_THRESHOLD}mb]${NC}"

if [[ -n "$BACKGROUND_MUSIC" ]]; then
  # Extract just the filename to save space
  MUSIC_FILENAME=$(basename "$BACKGROUND_MUSIC")
  echo -e "${WHITE}🎵 Background music:${NC} ${PURPLE}$MUSIC_FILENAME${NC}"
fi
# Build friendly label: "model::Mike-13 [Mike Nash]"
_SURNAME_POOL=("Bell" "Carter" "Davis" "Ellis" "Foster" "Gray" "Hayes" "Irving" "Jones" "Knox" "Lane" "Mason" "Nash" "Owens" "Pierce" "Quinn")
_VOICE_DISPLAY_LABEL="$DISPLAY_VOICE_NAME"
if [[ "$DISPLAY_VOICE_NAME" == *"::"* ]]; then
  _SP="${DISPLAY_VOICE_NAME#*::}"
  # Skip 16Speakers names (underscore = already first_last format)
  if [[ "$_SP" != *"_"* ]]; then
    _FRIENDLY=""
    if [[ "$_SP" =~ ^(.+)-([0-9]+)$ ]]; then
      if [[ ${BASH_REMATCH[2]} -ge 2 ]]; then
        _IDX=$(( (${BASH_REMATCH[2]} - 1) % 16 ))
        _FRIENDLY="${BASH_REMATCH[1]} ${_SURNAME_POOL[$_IDX]}"
      else
        # n=1: strip suffix, use Bell — matches uniquifyVoiceName JS behaviour
        _FRIENDLY="${BASH_REMATCH[1]} ${_SURNAME_POOL[0]}"
      fi
    elif [[ "$_SP" =~ [[:space:]] ]]; then
      _FRIENDLY="$_SP"
    else
      _FRIENDLY="$_SP ${_SURNAME_POOL[0]}"
    fi
    [[ "$_FRIENDLY" != "$_SP" ]] && _VOICE_DISPLAY_LABEL="$DISPLAY_VOICE_NAME [$_FRIENDLY]"
  fi
fi
echo -e "${WHITE}🎤 Voice used:${NC} ${BLUE}$_VOICE_DISPLAY_LABEL${NC} ${WHITE}(Piper TTS)${NC}"

# Show personality if configured
PERSONALITY=$(cat "$PROJECT_ROOT/.claude/tts-personality.txt" 2>/dev/null || cat "$HOME/.claude/tts-personality.txt" 2>/dev/null || echo "")
if [[ -n "$PERSONALITY" ]] && [[ "$PERSONALITY" != "none" ]] && [[ "$PERSONALITY" != "normal" ]]; then
  echo -e "${WHITE}💫 Personality:${NC} ${YELLOW}$PERSONALITY${NC}"
fi

# Check audio folder size and warn if getting large
if [[ -d "$AUDIO_DIR_PATH" ]]; then
  AUDIO_SIZE=$(du -sm "$AUDIO_DIR_PATH" 2>/dev/null | cut -f1)
  if [[ -n "$AUDIO_SIZE" ]] && [[ "$AUDIO_SIZE" -gt 100 ]]; then
    echo -e "\033[0;31m⚠️  Audio cache is ${AUDIO_SIZE}MB - Run: /agent-vibes:cleanup\033[0m"
  fi
fi

# Show status indicators
GLOBAL_MUTE_FILE="$HOME/.agentvibes-muted"
PROJECT_MUTE_FILE="${PROJECT_ROOT:-/nonexistent}/.claude/agentvibes-muted"
PROJECT_UNMUTE_FILE="${PROJECT_ROOT:-/nonexistent}/.claude/agentvibes-unmuted"
BACKGROUND_ENABLED_FILE="${PROJECT_ROOT:-/nonexistent}/.claude/config/background-music-enabled.txt"
GLOBAL_BACKGROUND_ENABLED_FILE="$HOME/.claude/config/background-music-enabled.txt"

# Mute status indicator
if [[ -f "$PROJECT_UNMUTE_FILE" ]] && [[ -f "$GLOBAL_MUTE_FILE" ]]; then
  echo "🔊 Status: Unmuted (project overrides global mute)"
elif [[ -f "$PROJECT_MUTE_FILE" ]]; then
  echo "🔇 Status: Muted (project)"
elif [[ -f "$GLOBAL_MUTE_FILE" ]]; then
  echo "🔇 Status: Would be muted (global) - but this project is speaking"
fi

# Background music status indicator
if [[ -z "$BACKGROUND_MUSIC" ]]; then
  _bg_enabled=false
  if [[ -f "$BACKGROUND_ENABLED_FILE" ]] && grep -q "true" "$BACKGROUND_ENABLED_FILE" 2>/dev/null; then
    echo -e "${WHITE}🎵 Background music:${NC} ${PURPLE}Enabled but not playing (check config)${NC}"
  else
    echo -e "${WHITE}🎵 Background music:${NC} ${PURPLE}Disabled${NC}"
  fi
fi

# Wait for audio player to finish before returning, then release the lock.
# Lock is released HERE — after actual playback — not via a timer.
# This prevents overlap caused by underestimated audio duration.
if [[ -n "$PLAYER_PID" ]]; then
  wait "$PLAYER_PID" 2>/dev/null || true
fi
rm -f "$LOCK_FILE" "$WRITE_LOCK_FILE"
