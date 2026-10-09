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
# Set ELEVENLABS_API_KEY in your shell profile, or store it in
# ~/.agentvibes/elevenlabs-key.txt (chmod 600).
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
source "$SCRIPT_DIR/python-resolver.sh"
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
# API key — env var (only if it looks valid), then key file.
# A malformed/truncated ELEVENLABS_API_KEY (e.g. a half-pasted key) is ignored so
# it can't silently shadow a good key file — a common foot-gun that yields
# confusing "API key fail" errors despite a valid key on disk.
_looks_like_el_key() {
  [[ "$1" =~ ^sk_[A-Za-z0-9]{40,}$ ]] && return 0   # current format: sk_ + >=40 chars
  [[ "$1" =~ ^[A-Fa-f0-9]{32}$ ]] && return 0        # legacy 32-char hex key
  return 1
}

API_KEY=""
if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  # A non-empty env var is authoritative — ElevenLabs has shipped several key
  # formats over time, so we must not silently discard a key just because it
  # looks unfamiliar. Warn (using ONLY the length, never the value) if the format
  # is unexpected, but use it regardless.
  API_KEY="$ELEVENLABS_API_KEY"
  if ! _looks_like_el_key "$ELEVENLABS_API_KEY"; then
    echo "⚠️  ELEVENLABS_API_KEY env var has an unexpected format (length ${#ELEVENLABS_API_KEY}); using it anyway." >&2
  fi
fi
if [[ -z "$API_KEY" ]]; then
  _key_file="${HOME}/.agentvibes/elevenlabs-key.txt"
  if [[ -f "$_key_file" ]]; then
    API_KEY="$(tr -d '[:space:]' < "$_key_file")"
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
# ElevenLabs voice catalog — single source of truth (shared with voice-manager.sh).
# Provides ELEVENLABS_DEFAULT_VOICE, elevenlabs_resolve_voice(), elevenlabs_voice_names().
if [[ -f "$SCRIPT_DIR/elevenlabs-voices.sh" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/elevenlabs-voices.sh"
else
  # Minimal fallback so speech still works if the catalog file is missing.
  # bash-3.2-safe: no associative array, case-statement resolver.
  ELEVENLABS_DEFAULT_VOICE="Sarah"
  elevenlabs_resolve_voice() {
    local q="${1:-}"; [[ -z "$q" ]] && return 1
    case "$(printf '%s' "$q" | tr '[:upper:]' '[:lower:]')" in
      sarah) printf %s "EXAVITQu4vr4xnSDxMaL"; return 0 ;;
    esac
    [[ "$q" =~ ^[A-Za-z0-9]{20}$ ]] && { printf %s "$q"; return 0; }
    return 1
  }
fi
DEFAULT_VOICE_ID="$(elevenlabs_resolve_voice "$ELEVENLABS_DEFAULT_VOICE")"

# ---------------------------------------------------------------------------
# Resolve voice ID from override or config
VOICE_ID=""

if [[ -n "$VOICE_OVERRIDE" ]]; then
  VOICE_ID="$(elevenlabs_resolve_voice "$VOICE_OVERRIDE")" || {
    echo "[WARN] Unknown ElevenLabs voice '$VOICE_OVERRIDE', using $ELEVENLABS_DEFAULT_VOICE" >&2
    VOICE_ID="$DEFAULT_VOICE_ID"
  }
else
  # Config path: read the voice saved by /agent-vibes:switch (a raw voice_id or
  # a friendly name) and resolve it the same way — this is what hook-driven
  # speech uses, so a switched voice actually plays (not a silent default).
  VOICE_NAME=""
  if [[ -f "$SCRIPT_DIR/voice-manager.sh" ]]; then
    VOICE_NAME="$("$SCRIPT_DIR/voice-manager.sh" get 2>/dev/null || true)"
  fi
  VOICE_ID="$(elevenlabs_resolve_voice "$VOICE_NAME")" || VOICE_ID="$DEFAULT_VOICE_ID"
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
BODY_FILE="${AUDIO_DIR}/tts-el-body-$(date +%s%N | head -c 18).json"
trap 'rm -f "${TEMP_FILE:-}" "${BODY_FILE:-}" 2>/dev/null || true' EXIT

# ---------------------------------------------------------------------------
# Build the JSON request body with python so all escaping is handled correctly
# (text is passed via env, never interpolated into a shell-quoted payload).
if [[ -z "$PYTHON_BIN" ]]; then
  echo "❌ ElevenLabs needs Python 3, but none was found." >&2
  echo "   Install Python 3, or set AGENTVIBES_PYTHON=/path/to/python." >&2
  exit 3
fi
if ! TTS_TEXT="$TEXT" TTS_MODEL="$MODEL_ID" TTS_LANG="$LANGUAGE_CODE" "$PYTHON_BIN" -c '
import os, json
print(json.dumps({
    "text": os.environ["TTS_TEXT"],
    "model_id": os.environ["TTS_MODEL"],
    "language_code": os.environ["TTS_LANG"],
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
}))' > "$BODY_FILE" 2>/dev/null; then
  echo "❌ Failed to build ElevenLabs request body ($PYTHON_BIN required)" >&2
  exit 3
fi

# ---------------------------------------------------------------------------
# Test mode: never make a billable request to the ElevenLabs API (and never play
# audio). Short-circuit BEFORE the network call. Mirrors the sibling providers'
# AGENTVIBES_TEST_MODE handling; the EXIT trap cleans up the temp files.
if [[ "${AGENTVIBES_TEST_MODE:-false}" == "true" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Call ElevenLabs API
# Security: API key passed via a curl config read from stdin (-K -), so it never
# appears in argv (where `ps` could expose it) nor in any temp file.
HTTP_STATUS=$(printf 'header = "xi-api-key: %s"\n' "$API_KEY" | curl -s -o "$TEMP_FILE" -w "%{http_code}" \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -K - \
  -H "Content-Type: application/json" \
  --max-time 30 \
  --data-binary "@${BODY_FILE}" 2>&1)
rm -f "$BODY_FILE" 2>/dev/null || true

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
# Convert MP3 → WAV so the post-processor (sox effects) can read it, and add a
# short silence lead-in (prevents a clipped first phoneme / WSL audio static).
# ffmpeg is preferred; if it is absent we keep the MP3 and skip effects/music.
if command -v ffmpeg &>/dev/null; then
  _WAV="${AUDIO_DIR}/tts-el-$(date +%s%N | head -c 18).wav"
  trap 'rm -f "${TEMP_FILE:-}" "${_WAV:-}" 2>/dev/null || true' EXIT
  if ffmpeg -f lavfi -i "anullsrc=r=44100:cl=mono:d=0.15" -i "$TEMP_FILE" \
      -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
      -map "[out]" -ar 44100 -ac 1 -y "$_WAV" 2>/dev/null \
      && [[ -s "$_WAV" ]]; then
    rm -f "$TEMP_FILE"
    TEMP_FILE="$_WAV"
  fi
fi

# ---------------------------------------------------------------------------
# Post-process: apply audio effects (reverb/echo/chorus via sox) and mix
# background music (via ffmpeg) — exactly like the Piper provider does. Honors
# the per-LLM row (AGENTVIBES_LLM_KEY) and any per-call AGENTVIBES_REVERB_OVERRIDE.
# Fails soft: if audio-processor.sh or its tools (sox/ffmpeg) are missing, the
# unprocessed audio is played instead. NOTE: reverb/echo/chorus REQUIRE sox to be
# installed; without it, effects are silently skipped (background music still works
# via ffmpeg).
#
# Only post-process when invoked via the orchestrator (which exports
# AGENTVIBES_LLM_KEY) or with an explicit per-call effect override. A bare direct
# call — e.g. the voice-picker audition — gets the clean, dry voice so the user
# hears the voice itself, not the default LLM row's effects/music.
if [[ -f "$SCRIPT_DIR/audio-processor.sh" \
      && ( -n "${AGENTVIBES_LLM_KEY:-}" || -n "${AGENTVIBES_REVERB_OVERRIDE:-}" ) ]]; then
  _PROCESSED="${AUDIO_DIR}/tts-el-proc-$(date +%s%N | head -c 18).wav"
  trap 'rm -f "${TEMP_FILE:-}" "${_PROCESSED:-}" 2>/dev/null || true' EXIT
  _AGENT_KEY="${AGENTVIBES_LLM_KEY:-default}"
  if _PROC_OUT="$(bash "$SCRIPT_DIR/audio-processor.sh" "$TEMP_FILE" "$_AGENT_KEY" "$_PROCESSED" 2>/dev/null)"; then
    _PF="${_PROC_OUT%%|*}"
    if [[ -n "$_PF" && -f "$_PF" && -s "$_PF" && "$_PF" != "$TEMP_FILE" ]]; then
      rm -f "$TEMP_FILE"
      TEMP_FILE="$_PF"
    fi
  fi
fi

# Play audio (skip in test mode or no-playback mode — matches the Piper provider)
# AGENTVIBES_NO_PLAYBACK: Set to "true" to generate audio without playing (for post-processing)
# Native Windows (git-bash, OS=Windows_NT — not WSL) has none of the Linux
# players, and ffplay spawned from the TUI's Node process is unreliable. Use the
# built-in PowerShell WPF MediaPlayer (same as audio-env.js) — no ffmpeg/PATH
# dependency. Other platforms try the usual players.
if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]] && [[ "${AGENTVIBES_NO_PLAYBACK:-false}" != "true" ]]; then
  _PS_BIN="$(command -v powershell 2>/dev/null || command -v powershell.exe 2>/dev/null || true)"
  if [[ "${OS:-}" == "Windows_NT" && -n "$_PS_BIN" ]]; then
    _WINPATH="$(cygpath -w "$TEMP_FILE" 2>/dev/null || echo "$TEMP_FILE")"
    _WINPATH="${_WINPATH//\'/\'\'}"   # escape single quotes for the PowerShell literal
    "$_PS_BIN" -NoProfile -Command "Add-Type -AssemblyName PresentationCore; \$p = New-Object System.Windows.Media.MediaPlayer; \$p.Open([uri]'${_WINPATH}'); \$p.Play(); Start-Sleep -Milliseconds 300; \$last=[TimeSpan]::Zero; \$stall=0; \$n=0; while (\$n -lt 100) { Start-Sleep -Milliseconds 100; \$pos=\$p.Position; if (\$p.NaturalDuration.HasTimeSpan -and \$pos -ge \$p.NaturalDuration.TimeSpan) { break }; if (\$pos -eq \$last) { \$stall++ } else { \$stall=0 }; if (\$stall -ge 8 -and \$pos -gt [TimeSpan]::Zero) { break }; \$last=\$pos; \$n++ }; \$p.Stop(); \$p.Close()" 2>/dev/null || true
  else
    (paplay "$TEMP_FILE" 2>/dev/null \
      || aplay "$TEMP_FILE" 2>/dev/null \
      || mpg123 -q "$TEMP_FILE" 2>/dev/null \
      || ffplay -nodisp -autoexit -loglevel error "$TEMP_FILE" 2>/dev/null \
      || true) &
    wait $!
  fi
fi

# Cancel trap so file persists in cache (for replay)
trap '' EXIT
