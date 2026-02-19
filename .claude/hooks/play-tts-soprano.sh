#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-soprano.sh
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
# @fileoverview Soprano TTS Provider Implementation - Free, local, neural-quality TTS
# @context Provides ultra-lightweight on-device neural TTS via Soprano (80M params)
# @architecture Implements provider interface contract with 3 synthesis modes (WebUI/API/CLI)
# @dependencies soprano-tts (pip), soprano-gradio-synth.py, ffmpeg (optional padding), audio players
# @entrypoints Called by play-tts.sh router when provider=soprano
# @patterns Provider contract: text/voice → audio file path, auto-mode detection, Gradio SSE protocol
# @related play-tts.sh, soprano-gradio-synth.py, provider-manager.sh, GitHub Issue #94
#
# Supports three modes (auto-detected in priority order):
#   1. WebUI mode: Gradio WebUI running (soprano-webui), uses Python helper
#   2. API mode: OpenAI-compatible server (uvicorn soprano.server:app), uses curl
#   3. CLI mode: Direct `soprano` command — reloads model each call (slowest)
#
# Environment variables:
#   SOPRANO_PORT    — WebUI/API port (default: 7860)
#   SOPRANO_DEVICE  — Device for CLI mode: auto|cuda|cpu|mps (default: auto)
#

# Fix locale warnings
export LC_ALL=C

TEXT="$1"
VOICE_OVERRIDE="$2"  # Ignored — Soprano has a single voice, kept for provider contract

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/audio-cache-utils.sh"

SOPRANO_PORT="${SOPRANO_PORT:-7860}"
SOPRANO_DEVICE="${SOPRANO_DEVICE:-auto}"

# @function validate_inputs
# @intent Check required parameters
# @why Fail fast with clear errors if inputs missing
# @exitcode 1=missing text
if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 \"text to speak\" [voice_override]"
  exit 1
fi

# @function check_webui_server
# @intent Detect if Soprano Gradio WebUI is reachable
# @why WebUI mode keeps model in memory for fastest repeated synthesis
# @returns exitcode 0=reachable, 1=not reachable
check_webui_server() {
  curl -sf --max-time 2 "http://127.0.0.1:${SOPRANO_PORT}/gradio_api/info" -o /dev/null 2>/dev/null ||
  curl -sf --max-time 2 "http://127.0.0.1:${SOPRANO_PORT}/info" -o /dev/null 2>/dev/null
}

# @function check_api_server
# @intent Detect if Soprano OpenAI-compatible API server is reachable
# @why API mode is simpler than WebUI (direct WAV response, no SSE polling)
# @returns exitcode 0=reachable, 1=not reachable
check_api_server() {
  curl -sf --max-time 2 "http://127.0.0.1:${SOPRANO_PORT}/v1/audio/speech" \
    -H "Content-Type: application/json" \
    -d '{"input":"test"}' -o /dev/null 2>/dev/null
}

# @function check_soprano_available
# @intent Verify at least one synthesis mode is available
# @why Provide helpful installation instructions if nothing works
# @exitcode 2=soprano not installed and no server running
if ! command -v soprano &>/dev/null && ! check_webui_server && ! check_api_server; then
  echo "❌ Error: Soprano TTS not installed and no server running on port $SOPRANO_PORT"
  echo ""
  echo "Install:  pip install soprano-tts"
  echo "  (GPU):  pip install soprano-tts[lmdeploy]"
  echo ""
  echo "Start WebUI:  soprano-webui"
  echo "Start API:    uvicorn soprano.server:app --host 127.0.0.1 --port $SOPRANO_PORT"
  exit 2
fi

# @function determine_audio_directory
# @intent Find appropriate directory for audio file storage
# @why Supports project-local and global storage
# @returns Sets $AUDIO_DIR global variable
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
TEMP_FILE="$AUDIO_DIR/tts-$(date +%s).wav"

# @function synthesize_speech
# @intent Generate speech using best available Soprano mode
# @why Auto-detect WebUI → API → CLI for optimal performance
# @param Uses globals: $TEXT, $SOPRANO_PORT, $SOPRANO_DEVICE
# @returns Creates WAV file at $TEMP_FILE, sets $SYNTH_MODE
# @exitcode 4=synthesis error
SYNTH_MODE=""

if check_webui_server; then
  # Gradio WebUI mode — use Python helper for SSE protocol
  SYNTH_MODE="webui"
  python3 "$SCRIPT_DIR/soprano-gradio-synth.py" "$TEXT" "$TEMP_FILE" "$SOPRANO_PORT" 2>/dev/null
elif check_api_server; then
  # OpenAI-compatible API mode — direct curl
  SYNTH_MODE="api"
  curl -sf "http://127.0.0.1:${SOPRANO_PORT}/v1/audio/speech" \
    -H "Content-Type: application/json" \
    -d "$(printf '{"input":"%s"}' "$(echo "$TEXT" | sed 's/"/\\"/g')")" \
    --output "$TEMP_FILE" 2>/dev/null
else
  # CLI fallback — reloads model each call (slowest)
  SYNTH_MODE="cli"
  soprano "$TEXT" -o "$TEMP_FILE" -d "$SOPRANO_DEVICE" 2>/dev/null
fi

if [[ ! -f "$TEMP_FILE" ]] || [[ ! -s "$TEMP_FILE" ]]; then
  echo "❌ Failed to synthesize speech with Soprano ($SYNTH_MODE mode)"
  [[ "$SYNTH_MODE" == "webui" ]] && echo "   Try: python3 $SCRIPT_DIR/soprano-gradio-synth.py \"test\" /tmp/test.wav $SOPRANO_PORT"
  exit 4
fi

# @function detect_remote_session
# @intent Auto-detect SSH/RDP sessions and enable audio compression
# @why Remote desktop audio is choppy without compression
# @returns Sets AGENTVIBES_RDP_MODE environment variable
if [[ -z "${AGENTVIBES_RDP_MODE:-}" ]]; then
  if [[ -n "${SSH_CLIENT:-}" ]] || [[ -n "${SSH_TTY:-}" ]] || [[ "${DISPLAY:-}" =~ ^localhost:.* ]]; then
    export AGENTVIBES_RDP_MODE=true
    echo "🌐 Remote session detected - enabling audio compression"
  fi
fi

# @function compress_for_remote
# @intent Compress TTS audio for remote sessions (SSH/RDP)
# @why Reduces bandwidth and prevents choppy playback
if [[ "${AGENTVIBES_RDP_MODE:-false}" == "true" ]] && command -v ffmpeg &>/dev/null; then
  COMPRESSED_FILE="$AUDIO_DIR/tts-compressed-$(date +%s).wav"
  ffmpeg -i "$TEMP_FILE" -ac 1 -ar 22050 -b:a 64k -y "$COMPRESSED_FILE" 2>/dev/null
  if [[ -f "$COMPRESSED_FILE" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$COMPRESSED_FILE"
  fi
fi

# @function add_silence_padding
# @intent Add silence to prevent WSL audio static
# @why WSL audio subsystem cuts off first ~200ms
if command -v ffmpeg &>/dev/null; then
  PADDED_FILE="$AUDIO_DIR/tts-padded-$(date +%s).wav"
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
# @returns Updates $TEMP_FILE to processed version
BACKGROUND_MUSIC=""
if [[ -f "$SCRIPT_DIR/audio-processor.sh" ]]; then
  PROCESSED_FILE="$AUDIO_DIR/tts-processed-$(date +%s).wav"
  PROCESSOR_OUTPUT=$("$SCRIPT_DIR/audio-processor.sh" "$TEMP_FILE" "default" "$PROCESSED_FILE" 2>/dev/null) || {
    PROCESSED_FILE="$TEMP_FILE"
    PROCESSOR_OUTPUT="$TEMP_FILE|"
  }
  PROCESSED_FILE="${PROCESSOR_OUTPUT%%|*}"
  BACKGROUND_MUSIC="${PROCESSOR_OUTPUT##*|}"
  if [[ -f "$PROCESSED_FILE" ]] && [[ "$PROCESSED_FILE" != "$TEMP_FILE" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$PROCESSED_FILE"
  fi
fi

# @function play_audio
# @intent Play generated audio using available player with sequential playback
# @why Support multiple audio players and prevent overlapping audio
LOCK_FILE="/tmp/agentvibes-audio.lock"

for i in {1..4}; do
  if [ ! -f "$LOCK_FILE" ]; then
    break
  fi
  sleep 0.5
done

if [ -f "$LOCK_FILE" ]; then
  echo "⏭️  Skipping TTS (previous audio still playing)" >&2
  exit 0
fi

touch "$LOCK_FILE"

AUDIO_DIR_PLAY="${TEMP_FILE%/*}"
WRITE_LOCK_FILE="$AUDIO_DIR_PLAY/$(basename "$TEMP_FILE" .wav).lock"
touch "$WRITE_LOCK_FILE"

DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEMP_FILE" 2>/dev/null)
DURATION=${DURATION%.*}
DURATION=${DURATION:-1}

if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]] && [[ "${AGENTVIBES_NO_PLAYBACK:-false}" != "true" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    afplay "$TEMP_FILE" >/dev/null 2>&1 &
    PLAYER_PID=$!
  elif [[ -n "${TERMUX_VERSION:-}" ]] || [[ -d "/data/data/com.termux" ]]; then
    termux-media-player play "$TEMP_FILE" >/dev/null 2>&1 &
    PLAYER_PID=$!
  else
    (paplay "$TEMP_FILE" || mpv "$TEMP_FILE" || aplay "$TEMP_FILE") >/dev/null 2>&1 &
    PLAYER_PID=$!
  fi
fi

(sleep $DURATION; rm -f "$LOCK_FILE" "$WRITE_LOCK_FILE") &
disown

# @function display_cache_stats
# @intent Show audio cache statistics with color-coded output
AUDIO_DIR_PATH=$(get_audio_dir)

BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
WHITE='\033[1;37m'
CYAN='\033[0;36m'
GOLD='\033[38;5;226m'
NC='\033[0m'

AUTO_CLEAN_THRESHOLD=$(get_auto_clean_threshold)
INITIAL_SIZE=$(calculate_tts_size_bytes "$AUDIO_DIR_PATH")
if [[ $INITIAL_SIZE -gt $((AUTO_CLEAN_THRESHOLD * 1048576)) ]]; then
  DELETED=$(auto_clean_old_files "$AUDIO_DIR_PATH" "$AUTO_CLEAN_THRESHOLD")
  if [[ $DELETED -gt 0 ]]; then
    echo -e "${ORANGE}🧹 Auto-cleaned $DELETED old files${NC}"
  fi
fi

FILE_COUNT=$(count_tts_files "$AUDIO_DIR_PATH")
SIZE_BYTES=$(calculate_tts_size_bytes "$AUDIO_DIR_PATH")
SIZE_HUMAN=$(bytes_to_human "$SIZE_BYTES")

CACHE_COLOR=$GREEN
if [[ $SIZE_BYTES -gt 3221225472 ]]; then
  CACHE_COLOR=$RED
elif [[ $SIZE_BYTES -gt 524288000 ]]; then
  CACHE_COLOR=$YELLOW
fi

echo -e "${WHITE}💾 Saved to:${NC} ${CYAN}$TEMP_FILE${NC} ${YELLOW}$FILE_COUNT${NC} ${WHITE}🗄️${NC} ${CACHE_COLOR}$SIZE_HUMAN${NC} ${WHITE}🧹${NC}${GOLD}[${AUTO_CLEAN_THRESHOLD}mb]${NC}"

if [[ -n "$BACKGROUND_MUSIC" ]]; then
  MUSIC_FILENAME=$(basename "$BACKGROUND_MUSIC")
  echo -e "${WHITE}🎵 Background music:${NC} ${PURPLE}$MUSIC_FILENAME${NC}"
fi
echo -e "${WHITE}🎤 Voice:${NC} ${BLUE}Soprano-1.1-80M${NC} ${WHITE}(Soprano TTS, ${SYNTH_MODE} mode)${NC}"

# Show personality if configured
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
PERSONALITY=$(cat "$PROJECT_ROOT/.claude/tts-personality.txt" 2>/dev/null || cat "$HOME/.claude/tts-personality.txt" 2>/dev/null || echo "")
if [[ -n "$PERSONALITY" ]] && [[ "$PERSONALITY" != "none" ]] && [[ "$PERSONALITY" != "normal" ]]; then
  echo -e "${WHITE}💫 Personality:${NC} ${YELLOW}$PERSONALITY${NC}"
fi

if [[ -d "$AUDIO_DIR_PATH" ]]; then
  AUDIO_SIZE=$(du -sm "$AUDIO_DIR_PATH" 2>/dev/null | cut -f1)
  if [[ -n "$AUDIO_SIZE" ]] && [[ "$AUDIO_SIZE" -gt 100 ]]; then
    echo -e "\033[0;31m⚠️  Audio cache is ${AUDIO_SIZE}MB - Run: /agent-vibes:cleanup\033[0m"
  fi
fi

# Background music status
if [[ -z "$BACKGROUND_MUSIC" ]]; then
  BACKGROUND_ENABLED_FILE="$PROJECT_ROOT/.claude/config/background-music-enabled.txt"
  if [[ -f "$BACKGROUND_ENABLED_FILE" ]] && grep -q "true" "$BACKGROUND_ENABLED_FILE" 2>/dev/null; then
    echo -e "${WHITE}🎵 Background music:${NC} ${PURPLE}Enabled but not playing (check config)${NC}"
  else
    echo -e "${WHITE}🎵 Background music:${NC} ${PURPLE}Disabled${NC}"
  fi
fi
