#!/usr/bin/env bash
#
# forward-to-avatar.sh — LEAN, FAST TTS for the TalkingHead avatar window.
#
# Primary path: a warm piper HTTP server (model already loaded) → ~300ms.
# Fallback:     spawn piper directly (cold model load ~4s) if the server is down.
# Either way: text -> wav -> POST {audio,text,voice,project} to /speak.
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
TH_PORT="${AGENTVIBES_TH_PORT:-3747}"
PIPER_PORT="${AGENTVIBES_PIPER_PORT:-5001}"

[[ -z "$TEXT" ]] && exit 1

# Resolve voice: explicit arg → session voice file → default.
if [[ -z "$VOICE" ]]; then
  VOICE="$(cat "$HOME/.claude/tts-voice.txt" 2>/dev/null | tr -d '[:space:]')"
fi
[[ -z "$VOICE" ]] && VOICE="en_US-amy-medium"

# ---- Primary: warm piper server (sub-second) ----
AV_TEXT="$TEXT" AV_VOICE="$VOICE" AV_PROJ="$PROJECT" AV_LLM="$LLM" AV_THPORT="$TH_PORT" AV_PIPER="$PIPER_PORT" \
python3 - <<'PY'
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
                   "project": os.environ["AV_PROJ"], "origin": "local",
                   "llm": os.environ["AV_LLM"]}).encode()
try:
    urllib.request.urlopen(
        urllib.request.Request("http://127.0.0.1:%s/speak" % os.environ["AV_THPORT"],
            data=body, headers={"Content-Type": "application/json"}),
        timeout=5)
except Exception:
    pass
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
WAV="$(mktemp -u 2>/dev/null || echo "$HOME/.claude/audio/avx-$$").wav"
printf '%s\n' "$TEXT" | piper --model "$MODEL" "${SPEAKER_ARGS[@]}" --output_file "$WAV" 2>/dev/null || { rm -f "$WAV"; exit 4; }
[[ -s "$WAV" ]] || { rm -f "$WAV"; exit 5; }
B64="$(base64 -w0 "$WAV" 2>/dev/null)"; rm -f "$WAV"
[[ -z "$B64" ]] && exit 6
AV_B64="$B64" AV_TEXT="$TEXT" AV_VOICE="$VOICE" AV_PROJ="$PROJECT" AV_LLM="$LLM" AV_THPORT="$TH_PORT" \
python3 - <<'PY' 2>/dev/null || exit 0
import os, json, urllib.request
body = json.dumps({"audioBase64": os.environ["AV_B64"], "text": os.environ.get("AV_TEXT",""),
                   "voice": os.environ.get("AV_VOICE",""), "project": os.environ.get("AV_PROJ",""),
                   "origin": "local", "llm": os.environ.get("AV_LLM","")}).encode()
try:
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:%s/speak" % os.environ["AV_THPORT"],
        data=body, headers={"Content-Type":"application/json"}), timeout=5)
except Exception:
    pass
PY
exit 0
