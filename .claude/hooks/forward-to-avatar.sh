#!/usr/bin/env bash
#
# forward-to-avatar.sh — LEAN, FAST TTS delivery for a future browser-based
# avatar receiver. Not part of AgentVibes today: this script is only ever
# invoked by play-tts.sh's fast avatar path, which itself only runs when
# config/talking-head-enabled.txt is set to "true" — a flag file that doesn't
# exist by default, so this script is dormant for every current user. It's
# checked in now so the receiver-side project (a separate, not-yet-merged
# effort) has a stable client-side delivery contract to build against.
#
# Primary path: a warm piper HTTP server (model already loaded) → ~300ms.
# Fallback:     spawn piper directly (cold model load ~4s) if the server is down.
# Either way: text -> wav -> POST {audioBase64,text,voice,project,projectPath} to /speak.
#
# We already have the text, so we skip the entire heavy play-tts pipeline
# (effects, padding, sentence-silence, cache scans).
#
# Returns 0 on success (caller should exit and skip the heavy pipeline),
# non-zero only if it truly can't synthesize (caller falls back).
#
set -uo pipefail

TEXT="${1:-}"
VOICE="${2:-}"
PROJECT="${3:-AgentVibes}"
LLM="${4:-claude-code}"
PROJECT_PATH="${5:-}"
TH_PORT="${AGENTVIBES_TH_PORT:-3747}"
PIPER_PORT="${AGENTVIBES_PIPER_PORT:-5001}"

[[ -z "$TEXT" ]] && exit 1

# Resolve a working Python (Windows git-bash often has none on PATH). Without
# one this lean path can't reach the receiver — return non-zero so the caller
# falls back to the heavy pipeline.
_FTA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$_FTA_DIR/python-resolver.sh"
[[ -n "$PYTHON_BIN" ]] || exit 6

# Resolve voice: explicit arg → session voice file → default.
if [[ -z "$VOICE" ]]; then
  VOICE="$(cat "$HOME/.claude/tts-voice.txt" 2>/dev/null | tr -d '[:space:]')"
fi
[[ -z "$VOICE" ]] && VOICE="en_US-amy-medium"

# ---- Primary: warm piper server (sub-second) ----
AV_TEXT="$TEXT" AV_VOICE="$VOICE" AV_PROJ="$PROJECT" AV_PROJPATH="$PROJECT_PATH" AV_LLM="$LLM" AV_THPORT="$TH_PORT" AV_PIPER="$PIPER_PORT" \
"$PYTHON_BIN" - <<'PY'
import os, json, base64, urllib.request
text  = os.environ["AV_TEXT"]
voice = os.environ["AV_VOICE"]
model = voice.split("::")[0]
speaker = voice.split("::")[1] if "::" in voice else None
req = {"text": text, "voice": model}
if speaker:
    req["speaker"] = speaker
# Synthesize via the warm piper server
try:
    r = urllib.request.urlopen(
        urllib.request.Request("http://127.0.0.1:%s/" % os.environ["AV_PIPER"],
            data=json.dumps(req).encode(), headers={"Content-Type": "application/json"}),
        timeout=15)
    wav = r.read()
    if not wav:
        raise RuntimeError("empty wav")
except Exception:
    raise SystemExit(7)   # server unavailable → bash fallback
# Forward to the avatar
b64 = base64.b64encode(wav).decode()
body = json.dumps({"audioBase64": b64, "text": text, "voice": voice,
                   "project": os.environ["AV_PROJ"], "projectPath": os.environ.get("AV_PROJPATH", ""),
                   "origin": "local", "llm": os.environ["AV_LLM"]}).encode()
try:
    urllib.request.urlopen(
        urllib.request.Request("http://127.0.0.1:%s/speak" % os.environ["AV_THPORT"],
            data=body, headers={"Content-Type": "application/json"}),
        timeout=5)
except Exception:
    raise SystemExit(9)   # synthesized OK but delivery failed → bash falls back to heavy pipeline
raise SystemExit(0)
PY
rc=$?
[[ $rc -eq 0 ]] && exit 0

# ---- Fallback: spawn piper directly (cold) ----
command -v piper >/dev/null 2>&1 || exit 3
MODEL_NAME="$VOICE"; SPEAKER_ARGS=()
if [[ "$VOICE" == *"::"* ]]; then
  MODEL_NAME="${VOICE%%::*}"; _spk="${VOICE##*::}"; _spk_id="${_spk##*-}"
  [[ "$_spk_id" =~ ^[0-9]+$ ]] && SPEAKER_ARGS=(--speaker "$_spk_id")
fi
MODEL="$HOME/.claude/piper-voices/${MODEL_NAME}.onnx"
[[ -f "$MODEL" ]] || exit 2
# SECURITY: mktemp (not mktemp -u) creates the file atomically — avoids the
# race/symlink risk of a name-only temp path, matching play-tts-piper.sh (#130).
_tmp="$(mktemp "$HOME/.claude/audio/avx-XXXXXX" 2>/dev/null)" || exit 2
WAV="${_tmp}.wav"
mv "$_tmp" "$WAV" 2>/dev/null || { rm -f "$_tmp"; exit 2; }
trap 'rm -f "$WAV"' EXIT
printf '%s\n' "$TEXT" | piper --model "$MODEL" "${SPEAKER_ARGS[@]}" --output_file "$WAV" 2>/dev/null || exit 4
[[ -s "$WAV" ]] || exit 5
# Pass the WAV *path* (short) rather than its base64 content: a single env
# string is capped at MAX_ARG_STRLEN (~128 KiB on Linux), which base64'd audio
# blows past after ~2s of speech — passing the content directly made execve
# fail silently (E2BIG) for any real-length utterance. Python reads and
# base64-encodes the file itself instead, with no such size limit.
AV_WAV="$WAV" AV_TEXT="$TEXT" AV_VOICE="$VOICE" AV_PROJ="$PROJECT" AV_PROJPATH="$PROJECT_PATH" AV_LLM="$LLM" AV_THPORT="$TH_PORT" \
"$PYTHON_BIN" - <<'PY' 2>/dev/null
import os, sys, json, base64, urllib.request
with open(os.environ["AV_WAV"], "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
body = json.dumps({"audioBase64": b64, "text": os.environ.get("AV_TEXT",""),
                   "voice": os.environ.get("AV_VOICE",""), "project": os.environ.get("AV_PROJ",""),
                   "projectPath": os.environ.get("AV_PROJPATH",""),
                   "origin": "local", "llm": os.environ.get("AV_LLM","")}).encode()
try:
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:%s/speak" % os.environ["AV_THPORT"],
        data=body, headers={"Content-Type":"application/json"}), timeout=5)
except Exception:
    sys.exit(1)   # delivery failed → propagate so caller falls back to the heavy pipeline
PY
exit $?
