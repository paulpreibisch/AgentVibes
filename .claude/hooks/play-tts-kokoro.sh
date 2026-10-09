#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-kokoro.sh
#
# AgentVibes - Text-to-Speech WITH personality for AI Assistants
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Licensed under the Apache License, Version 2.0
#
# @fileoverview Kokoro TTS Provider — 82M-param local neural TTS, 60+ voices, 8+ languages
# @context Provides high-quality local TTS via kokoro-onnx (MIT license, no API key needed)
# @architecture Implements provider contract: text/voice → audio playback
# @dependencies kokoro-onnx, soundfile, numpy (pip), ffmpeg (optional), audio player
# @entrypoints Called by play-tts.sh router when provider=kokoro
# @related play-tts.sh, kokoro-installer.sh, kokoro-tts.py
#
# Default voice: af_heart (American Female, warm)
# Install: /home/user/.claude/hooks/kokoro-installer.sh
# Or manually: pip install kokoro-onnx soundfile numpy
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

if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 \"text to speak\" [voice]" >&2
  exit 1
fi

# Distinguish "no Python at all" from "Python present but kokoro module missing"
# — the old check conflated them, so a Windows box where python3 simply wasn't on
# PATH wrongly reported "Kokoro not installed" (see python-resolver.sh).
if [[ -z "$PYTHON_BIN" ]]; then
  echo "❌ No Python 3 interpreter found." >&2
  echo "   Kokoro needs Python 3. Install it (Windows: https://python.org, or 'py')," >&2
  echo "   or set AGENTVIBES_PYTHON=/path/to/python.exe if it's installed elsewhere." >&2
  exit 2
fi

# --- Persistent daemon (mirrors play-tts-kokoro.ps1) -------------------------
# A resident kokoro-server keeps the model loaded (on the GPU when CUDA is
# available), so a request is ~0.6 s of synthesis instead of ~20 s of fresh model
# load per call. Fast path: POST to the daemon. Fallback: synthesize this message
# directly (never dropped) and start the daemon for the next one.
# AGENTVIBES_KOKORO_PORT overrides the port; AGENTVIBES_KOKORO_DAEMON=false opts out.
KOKORO_PORT="${AGENTVIBES_KOKORO_PORT:-7855}"
[[ "$KOKORO_PORT" =~ ^[0-9]+$ ]] || KOKORO_PORT=7855
KOKORO_DAEMON_ENABLED=true
[[ "${AGENTVIBES_KOKORO_DAEMON:-true}" == "false" ]] && KOKORO_DAEMON_ENABLED=false
KOKORO_SERVER_UP=false
if [[ "$KOKORO_DAEMON_ENABLED" == "true" && "${AGENTVIBES_TEST_MODE:-false}" != "true" ]] \
   && command -v curl >/dev/null 2>&1 \
   && curl -s --max-time 2 "http://127.0.0.1:${KOKORO_PORT}/health" 2>/dev/null | grep -q '"ok": *true'; then
  KOKORO_SERVER_UP=true
fi

# Check kokoro is installed (use find_spec to avoid slow torch import).
# Skipped in AGENTVIBES_TEST_MODE: the hermetic sentinel tests emit a fake
# AV_OUTPUT below without real synthesis, so kokoro need not be installed on the
# runner (mirrors the TEST_MODE guards in play-tts-piper.sh; CI has Piper but not
# the heavy Kokoro deps). Also skipped while the daemon answers: it may run under
# a different interpreter than $PYTHON_BIN, and it is the one doing synthesis.
if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" && "$KOKORO_SERVER_UP" != "true" ]] && \
   ! "$PYTHON_BIN" -c "import importlib.util; exit(0 if importlib.util.find_spec('kokoro') else 1)" 2>/dev/null; then
  echo "❌ Kokoro TTS module not installed for: $PYTHON_BIN" >&2
  echo "   Install with: ${SCRIPT_DIR}/kokoro-installer.sh" >&2
  echo "   Or manually:  \"$PYTHON_BIN\" -m pip install kokoro soundfile numpy" >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Resolve voice
# Default voice sourced from the generated Provider Catalog (SSOT) when present.
# FAIL-SAFE: keep the literal fallback for installed-tree skew (mirrors play-tts.sh
# PLAN_OK) — synth never breaks on a missing catalog.
DEFAULT_VOICE="af_heart"
if [[ -f "$SCRIPT_DIR/provider-catalog.sh" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/provider-catalog.sh" 2>/dev/null || true
  if type catalog_default_voice >/dev/null 2>&1; then
    _CATALOG_DEFAULT="$(catalog_default_voice kokoro 2>/dev/null || true)"
    [[ -n "$_CATALOG_DEFAULT" ]] && DEFAULT_VOICE="$_CATALOG_DEFAULT"
  fi
fi

# Synth-time shape check (LENIENT per design §3.3): a voice from a NEWER kokoro
# model that the shipped catalog doesn't know must still degrade audibly, not
# brick — so this stays a shape check + loud-warning fallback, NOT membership.
# One literal, reused at both call sites below.
KOKORO_SHAPE_RE='^[a-z]{2}_[a-z0-9_]+$'

if [[ -n "$VOICE_OVERRIDE" ]]; then
  # Accept kokoro-style voice IDs (2-letter prefix + underscore + name)
  # e.g. af_heart, am_adam, bf_emma, bm_george
  if [[ "$VOICE_OVERRIDE" =~ $KOKORO_SHAPE_RE ]]; then
    VOICE="$VOICE_OVERRIDE"
  else
    echo "⚠️  Unrecognized kokoro voice '$VOICE_OVERRIDE', using $DEFAULT_VOICE" >&2
    VOICE="$DEFAULT_VOICE"
  fi
else
  # Check voice manager
  if [[ -f "$SCRIPT_DIR/voice-manager.sh" ]]; then
    _CONFIGURED="$("$SCRIPT_DIR/voice-manager.sh" get 2>/dev/null || true)"
    if [[ "$_CONFIGURED" =~ $KOKORO_SHAPE_RE ]]; then
      VOICE="$_CONFIGURED"
    else
      VOICE="$DEFAULT_VOICE"
    fi
  else
    VOICE="$DEFAULT_VOICE"
  fi
fi

# Speed from config (optional, defaults to 1.0)
# SECURITY: Validate speed is numeric before passing to python (avoids traceback)
SPEED="${KOKORO_SPEED:-1.0}"
[[ "$SPEED" =~ ^[0-9]+(\.[0-9]+)?$ ]] || SPEED="1.0"

# ---------------------------------------------------------------------------
# Synthesis
AUDIO_DIR="$(get_audio_cache_dir 2>/dev/null || echo "${HOME}/.claude/audio")"
mkdir -p "$AUDIO_DIR"
chmod 700 "$AUDIO_DIR"

TEMP_WAV="${AUDIO_DIR}/tts-kokoro-$(date +%s%N | head -c 18).wav"
trap 'rm -f "${TEMP_WAV:-}" 2>/dev/null || true' EXIT

SYNTH_SCRIPT="${SCRIPT_DIR}/kokoro-tts.py"
if [[ ! -f "$SYNTH_SCRIPT" ]]; then
  echo "❌ kokoro-tts.py not found at $SYNTH_SCRIPT" >&2
  exit 2
fi

# Skip the (slow) synthesis + playback entirely in test mode — nothing to play
# and no need to spin up the kokoro model. Mirrors the sibling Piper provider.
# Still emit the AV_OUTPUT sentinel so consumers get the exact intended path
# (Story AVI-S8.5, R6): the path is machine-parseable regardless of playback.
if [[ "${AGENTVIBES_TEST_MODE:-false}" == "true" ]]; then
  printf 'AV_OUTPUT:%s\n' "$TEMP_WAV"
  trap '' EXIT
  exit 0
fi

USED_SERVER=false
if [[ "$KOKORO_SERVER_UP" == "true" ]]; then
  # The daemon is a native process: on Windows (Git Bash) it needs C:/... not /c/...
  _wav_native="$TEMP_WAV"
  command -v cygpath >/dev/null 2>&1 && _wav_native="$(cygpath -m "$TEMP_WAV")"
  _payload="$("$PYTHON_BIN" -c 'import json,sys; print(json.dumps({"text":sys.argv[1],"voice":sys.argv[2],"speed":float(sys.argv[3]),"output":sys.argv[4]}))' \
    "$TEXT" "$VOICE" "$SPEED" "$_wav_native" 2>/dev/null)" || _payload=""
  if [[ -n "$_payload" ]] \
     && curl -s --max-time 120 -H "Content-Type: application/json" --data-binary "$_payload" \
          "http://127.0.0.1:${KOKORO_PORT}/synth" 2>/dev/null | grep -q '"ok": *true' \
     && [[ -s "$TEMP_WAV" ]]; then
    USED_SERVER=true
  else
    echo "⚠️  Kokoro daemon request failed; falling back to direct synthesis" >&2
  fi
fi

if [[ "$USED_SERVER" != "true" ]]; then
  # Start the daemon for subsequent messages (only when it is down — a daemon that
  # answered /health but failed this request is left alone). Detached, output
  # discarded; kokoro-server.py binds 127.0.0.1 only.
  if [[ "$KOKORO_DAEMON_ENABLED" == "true" && "$KOKORO_SERVER_UP" != "true" && -f "$SCRIPT_DIR/kokoro-server.py" ]]; then
    nohup "$PYTHON_BIN" "$SCRIPT_DIR/kokoro-server.py" "$KOKORO_PORT" >/dev/null 2>&1 &
    disown 2>/dev/null || true
  fi
  # Run synthesis — output path printed to stdout
  RESULT=$("$PYTHON_BIN" "$SYNTH_SCRIPT" "$TEXT" "$VOICE" "$TEMP_WAV" "$SPEED" 2>&1) || {
    echo "❌ Kokoro synthesis failed: $RESULT" >&2
    exit 3
  }
fi

if [[ ! -f "$TEMP_WAV" || ! -s "$TEMP_WAV" ]]; then
  echo "❌ Kokoro synthesis produced no audio" >&2
  exit 3
fi

# AV_OUTPUT sentinel (Story AVI-S8.5, R6/R7): emit the EXACT absolute path of the
# wav this invocation produced, on its own machine-parseable stdout line. Consumers
# capture THIS path — never a directory listing (memory:
# feedback_no_most_recent_file_heuristic).
printf 'AV_OUTPUT:%s\n' "$TEMP_WAV"

# ---------------------------------------------------------------------------
# Play audio — try players in order (WAV-capable)
# Skip playback in test mode or no-playback mode (matches the Piper provider).
# AGENTVIBES_NO_PLAYBACK: Set to "true" to generate audio without playing (for post-processing)
if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]] && [[ "${AGENTVIBES_NO_PLAYBACK:-false}" != "true" ]]; then
  (aplay -q "$TEMP_WAV" 2>/dev/null \
    || paplay "$TEMP_WAV" 2>/dev/null \
    || ffplay -nodisp -autoexit -loglevel quiet "$TEMP_WAV" 2>/dev/null \
    || mpg123 -q "$TEMP_WAV" 2>/dev/null \
    || true) &
  wait $!
fi

# Cancel trap so file persists in cache
trap '' EXIT
