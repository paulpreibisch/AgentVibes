#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-elevenlabs.sh
#
# AgentVibes - Text-to-Speech WITH personality for AI Assistants
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Licensed under the Apache License, Version 2.0
#
# @fileoverview ElevenLabs TTS Provider — cloud neural voices with 32+ language support
# @context Provider-specific implementation for ElevenLabs API integration
# @architecture Implements provider contract: text/voice → audio playback
# @dependencies ELEVENLABS_API_KEY env var, curl, ffmpeg (optional), audio player
# @entrypoints Called by play-tts.sh router when provider=elevenlabs
# @related play-tts.sh, provider-manager.sh, language-manager.sh
#
# Voice can be a name (e.g. "Rachel") or a raw ElevenLabs voice ID.
# Set ELEVENLABS_API_KEY in your shell profile or via Infisical.
# Default voice: Rachel (English, warm female)
#

set -euo pipefail
export LC_ALL=C

TEXT="${1:-}"
VOICE_OVERRIDE="${2:-}"

# Resolve script dir (handles symlinks)
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

source "$SCRIPT_DIR/audio-cache-utils.sh"
source "$SCRIPT_DIR/language-manager.sh"

if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 \"text to speak\" [voice_name_or_id]" >&2
  exit 1
fi

# Clamp text to 2000 chars (ElevenLabs API limit)
if [[ ${#TEXT} -gt 2000 ]]; then
  TEXT="${TEXT:0:1997}..."
fi

# ---------------------------------------------------------------------------
# API key — check env var, then ~/.agentvibes/elevenlabs-key.txt
API_KEY="${ELEVENLABS_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  _key_file="${HOME}/.agentvibes/elevenlabs-key.txt"
  if [[ -f "$_key_file" ]]; then
    API_KEY="$(cat "$_key_file" | tr -d '[:space:]')"
  fi
fi

if [[ -z "$API_KEY" ]]; then
  echo "❌ ElevenLabs API key not set." >&2
  echo "   Set it one of two ways:" >&2
  echo "   1. export ELEVENLABS_API_KEY=your_key  (add to ~/.bashrc or ~/.zshrc)" >&2
  echo "   2. echo 'your_key' > ~/.agentvibes/elevenlabs-key.txt && chmod 600 ~/.agentvibes/elevenlabs-key.txt" >&2
  echo "   Get a free key at: https://elevenlabs.io" >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Inline voice name → ID map (covers common built-in ElevenLabs voices)
declare -A VOICE_IDS
VOICE_IDS["Rachel"]="21m00Tcm4TlvDq8ikWAM"
VOICE_IDS["Adam"]="pNInz6obpgDQGcFmaJgB"
VOICE_IDS["Antoni"]="ErXwobaYiN019PkySvjV"
VOICE_IDS["Arnold"]="VR6AewLTigWG4xSOukaG"
VOICE_IDS["Bella"]="EXAVITQu4vr4xnSDxMaL"
VOICE_IDS["Callum"]="N2lVS1w4EtoT3dr4eOWO"
VOICE_IDS["Charlie"]="IKne3meq5aSn9XLyUdCD"
VOICE_IDS["Charlotte"]="XB0fDUnXU5powFXDhCwa"
VOICE_IDS["Clyde"]="2EiwWnXFnvU5JabPnv8n"
VOICE_IDS["Daniel"]="onwK4e9ZLuTAKqWW03F9"
VOICE_IDS["Dave"]="CYw3kZ02Hs0563khs1Fj"
VOICE_IDS["Dorothy"]="ThT5KcBeYPX3keUQqHPh"
VOICE_IDS["Domi"]="AZnzlk1XvdvUeBnXmlld"
VOICE_IDS["Drew"]="29vD33N1CtxCmqQRPOHJ"
VOICE_IDS["Emily"]="LcfcDJNUP1GQjkzn1xUU"
VOICE_IDS["Ethan"]="g5CIjZEefAph4nQFvHAz"
VOICE_IDS["Fin"]="D38z5RcWu1voky8WS1ja"
VOICE_IDS["Freya"]="jsCqWAovK2LkecY7zXl4"
VOICE_IDS["Gigi"]="jBpfuIE2acCO8z3wKNLl"
VOICE_IDS["Giovanni"]="zcAOhNBS3c14rBihAFp1"
VOICE_IDS["Glinda"]="z9fAnlkpzviPz146aGWa"
VOICE_IDS["Grace"]="oWAxZDx7w5VEj9dCyTzz"
VOICE_IDS["Harry"]="SOYHLrjzK2X1ezoPC6cr"
VOICE_IDS["James"]="ZQe5CZNOzWyzPSCn5a3c"
VOICE_IDS["Jessie"]="t0jbNlBVZ17f02VDIeMI"
VOICE_IDS["Josh"]="TxGEqnHWrfWFTfGW9XjX"
VOICE_IDS["Liam"]="TX3LPaxmHKxFdv7VOQHJ"
VOICE_IDS["Lily"]="pFZP5JQG7iQjIQuC4Bku"
VOICE_IDS["Matilda"]="XrExE9yKIg1WjnnlVkGX"
VOICE_IDS["Michael"]="flq6f7yk4E4fJM5XTYuZ"
VOICE_IDS["Mimi"]="zrHiDhphv9ZnVXBqCLjz"
VOICE_IDS["Nicole"]="piTKgcLEGmPE4e6mEKli"
VOICE_IDS["Patrick"]="ODq5zmih8GrVes37Dizd"
VOICE_IDS["Paul"]="5Q0t7uMcjvnagumLfvZi"
VOICE_IDS["Sam"]="yoZ06aMxZJJ28mfd3POQ"
VOICE_IDS["Sarah"]="EXAVITQu4vr4xnSDxMaL"
VOICE_IDS["Serena"]="pMsXgVXv3BLzUgSXRplE"
VOICE_IDS["Thomas"]="GBv7mTt0atIp3Br8iCZE"

DEFAULT_VOICE_ID="${VOICE_IDS[Rachel]}"

# ---------------------------------------------------------------------------
# Resolve voice ID from override or config
VOICE_ID=""

if [[ -n "$VOICE_OVERRIDE" ]]; then
  if [[ -n "${VOICE_IDS[$VOICE_OVERRIDE]:-}" ]]; then
    VOICE_ID="${VOICE_IDS[$VOICE_OVERRIDE]}"
  elif [[ "$VOICE_OVERRIDE" =~ ^[a-zA-Z0-9]{10,40}$ ]]; then
    # Looks like a raw voice ID
    VOICE_ID="$VOICE_OVERRIDE"
  else
    echo "⚠️  Unknown ElevenLabs voice '$VOICE_OVERRIDE', using Rachel" >&2
    VOICE_ID="$DEFAULT_VOICE_ID"
  fi
else
  # Check voice manager for configured voice
  VOICE_NAME=""
  if [[ -f "$SCRIPT_DIR/voice-manager.sh" ]]; then
    VOICE_NAME="$("$SCRIPT_DIR/voice-manager.sh" get 2>/dev/null || true)"
  fi

  if [[ -n "$VOICE_NAME" && -n "${VOICE_IDS[$VOICE_NAME]:-}" ]]; then
    VOICE_ID="${VOICE_IDS[$VOICE_NAME]}"
  else
    VOICE_ID="$DEFAULT_VOICE_ID"
  fi
fi

# ---------------------------------------------------------------------------
# Language/model selection
CURRENT_LANGUAGE="$(get_language_code 2>/dev/null || echo 'english')"

case "$CURRENT_LANGUAGE" in
  english) LANGUAGE_CODE="en"; MODEL_ID="eleven_turbo_v2_5" ;;
  spanish) LANGUAGE_CODE="es"; MODEL_ID="eleven_multilingual_v2" ;;
  french)  LANGUAGE_CODE="fr"; MODEL_ID="eleven_multilingual_v2" ;;
  german)  LANGUAGE_CODE="de"; MODEL_ID="eleven_multilingual_v2" ;;
  italian) LANGUAGE_CODE="it"; MODEL_ID="eleven_multilingual_v2" ;;
  portuguese) LANGUAGE_CODE="pt"; MODEL_ID="eleven_multilingual_v2" ;;
  chinese) LANGUAGE_CODE="zh"; MODEL_ID="eleven_multilingual_v2" ;;
  japanese) LANGUAGE_CODE="ja"; MODEL_ID="eleven_multilingual_v2" ;;
  korean)  LANGUAGE_CODE="ko"; MODEL_ID="eleven_multilingual_v2" ;;
  russian) LANGUAGE_CODE="ru"; MODEL_ID="eleven_multilingual_v2" ;;
  polish)  LANGUAGE_CODE="pl"; MODEL_ID="eleven_multilingual_v2" ;;
  dutch)   LANGUAGE_CODE="nl"; MODEL_ID="eleven_multilingual_v2" ;;
  arabic)  LANGUAGE_CODE="ar"; MODEL_ID="eleven_multilingual_v2" ;;
  hindi)   LANGUAGE_CODE="hi"; MODEL_ID="eleven_multilingual_v2" ;;
  turkish) LANGUAGE_CODE="tr"; MODEL_ID="eleven_multilingual_v2" ;;
  swedish) LANGUAGE_CODE="sv"; MODEL_ID="eleven_multilingual_v2" ;;
  *)       LANGUAGE_CODE="en"; MODEL_ID="eleven_turbo_v2_5" ;;
esac

# ---------------------------------------------------------------------------
# Audio output directory
AUDIO_DIR="$(get_audio_cache_dir 2>/dev/null || echo "${HOME}/.claude/audio")"
mkdir -p "$AUDIO_DIR"
chmod 700 "$AUDIO_DIR"

TEMP_FILE="${AUDIO_DIR}/tts-elevenlabs-$(date +%s%N | head -c 18).mp3"
trap 'rm -f "${TEMP_FILE:-}" 2>/dev/null || true' EXIT

# ---------------------------------------------------------------------------
# Call ElevenLabs API
# Security: API key passed via header (never in URL or args)
HTTP_STATUS=$(curl -s -o "$TEMP_FILE" -w "%{http_code}" \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  --max-time 30 \
  -d "{
    \"text\": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$TEXT" 2>/dev/null || echo "\"${TEXT//\"/\\\"}\\""),
    \"model_id\": \"${MODEL_ID}\",
    \"language_code\": \"${LANGUAGE_CODE}\",
    \"voice_settings\": {\"stability\": 0.5, \"similarity_boost\": 0.75}
  }" 2>&1)

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "❌ ElevenLabs API error (HTTP $HTTP_STATUS)" >&2
  if [[ -f "$TEMP_FILE" ]]; then
    cat "$TEMP_FILE" >&2
  fi
  exit 3
fi

if [[ ! -f "$TEMP_FILE" || ! -s "$TEMP_FILE" ]]; then
  echo "❌ ElevenLabs returned empty audio" >&2
  exit 3
fi

# ---------------------------------------------------------------------------
# Optional: add silence padding to prevent WSL audio static
if command -v ffmpeg &>/dev/null; then
  _PADDED="${AUDIO_DIR}/tts-el-padded-$(date +%s%N | head -c 18).mp3"
  trap 'rm -f "${TEMP_FILE:-}" "${_PADDED:-}" 2>/dev/null || true' EXIT
  if ffmpeg -f lavfi -i "anullsrc=r=44100:cl=mono:d=0.15" -i "$TEMP_FILE" \
      -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
      -map "[out]" -c:a libmp3lame -q:a 2 -y "$_PADDED" 2>/dev/null \
      && [[ -s "$_PADDED" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$_PADDED"
  fi
fi

# Play audio — try players in order
(paplay "$TEMP_FILE" 2>/dev/null \
  || aplay "$TEMP_FILE" 2>/dev/null \
  || mpg123 -q "$TEMP_FILE" 2>/dev/null \
  || ffplay -nodisp -autoexit "$TEMP_FILE" 2>/dev/null \
  || true) &
wait $!

# Cancel trap so file persists in cache (for replay)
trap '' EXIT
