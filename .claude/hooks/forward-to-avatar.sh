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
# EXIT CONTRACT (the caller suppresses the normal speaker pipeline ONLY on 0):
#   0  → audio was delivered to the avatar (/speak returned 2xx). Suppress speakers.
#   !0 → not delivered (synth failed, browser gone, server error, no python…).
#        The caller MUST fall through to the normal speaker pipeline so the user
#        still hears something. We never claim success unless /speak returned 2xx.
#
set -uo pipefail

TEXT="${1:-}"
VOICE="${2:-}"
PROJECT="${3:-AgentVibes}"
LLM="${4:-claude-code}"
TH_PORT="${AGENTVIBES_TH_PORT:-3747}"
PIPER_PORT="${AGENTVIBES_PIPER_PORT:-5001}"

[[ -z "$TEXT" ]] && exit 1

# Need python for the HTTP calls; without it the caller must fall back.
PYBIN="$(command -v python3 || command -v python || true)"
[[ -z "$PYBIN" ]] && exit 9

# Resolve voice: explicit arg → session voice file → default. Reject path chars.
if [[ -z "$VOICE" ]]; then
  VOICE="$(cat "$HOME/.claude/tts-voice.txt" 2>/dev/null | tr -d '[:space:]')"
fi
[[ -z "$VOICE" ]] && VOICE="en_US-amy-medium"
case "$VOICE" in *..*|*/*|*\\*) exit 10 ;; esac   # no traversal into the model path

# ---- Primary: warm piper server (sub-second) ----
# Delivery only counts as success when /speak returns 2xx (exit 0); a synth
# failure exits 7 (bash tries the cold path); a delivery failure exits 8.
AV_TEXT="$TEXT" AV_VOICE="$VOICE" AV_PROJ="$PROJECT" AV_LLM="$LLM" AV_THPORT="$TH_PORT" AV_PIPER="$PIPER_PORT" \
"$PYBIN" - <<'PY'
import os, json, base64, urllib.request
text  = os.environ["AV_TEXT"]
voice = os.environ["AV_VOICE"]
model = voice.split("::")[0]
req = {"text": text, "voice": model}
if "::" in voice:
    spk = voice.split("::", 1)[1]
    tail = spk.rsplit("-", 1)[-1]
    if tail.isdigit(): req["speaker_id"] = int(tail)   # match the cold-path logic
    else:              req["speaker"] = spk
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
    raise SystemExit(7)   # server unavailable → bash cold fallback
# Forward to the avatar — success ONLY if /speak returns 2xx
b64 = base64.b64encode(wav).decode()
body = json.dumps({"audioBase64": b64, "text": text, "voice": voice,
                   "project": os.environ["AV_PROJ"], "origin": "local",
                   "llm": os.environ["AV_LLM"]}).encode()
try:
    resp = urllib.request.urlopen(
        urllib.request.Request("http://127.0.0.1:%s/speak" % os.environ["AV_THPORT"],
            data=body, headers={"Content-Type": "application/json"}),
        timeout=5)
    code = resp.getcode()
    raise SystemExit(0 if 200 <= code < 300 else 8)
except SystemExit:
    raise
except Exception:
    raise SystemExit(8)   # delivery failed → caller falls back to speakers
PY
rc=$?
[[ $rc -eq 0 ]] && exit 0    # delivered to the avatar
[[ $rc -eq 8 ]] && exit 8    # synth OK but not delivered → caller does speakers
# rc == 7 → warm server down; try the cold path below.

# ---- Fallback: spawn piper directly (cold) ----
command -v piper >/dev/null 2>&1 || exit 3
MODEL_NAME="$VOICE"; SPEAKER_ARGS=()
if [[ "$VOICE" == *"::"* ]]; then
  MODEL_NAME="${VOICE%%::*}"; _spk="${VOICE##*::}"; _spk_id="${_spk##*-}"
  [[ "$_spk_id" =~ ^[0-9]+$ ]] && SPEAKER_ARGS=(--speaker "$_spk_id")
fi
MODEL="$HOME/.claude/piper-voices/${MODEL_NAME}.onnx"
[[ -f "$MODEL" ]] || exit 2
# Real temp file in a private dir (mktemp -u is a TOCTOU/symlink risk).
TMPDIR_AV="$(mktemp -d "${TMPDIR:-/tmp}/avatar.XXXXXX")" || exit 4
trap 'rm -rf "$TMPDIR_AV"' EXIT
WAV="$TMPDIR_AV/out.wav"
printf '%s\n' "$TEXT" | piper --model "$MODEL" "${SPEAKER_ARGS[@]+"${SPEAKER_ARGS[@]}"}" --output_file "$WAV" 2>/dev/null || exit 5
[[ -s "$WAV" ]] || exit 6
# Pipe base64 on STDIN (avoids E2BIG from passing multi-MB audio via the environment).
AV_TEXT="$TEXT" AV_VOICE="$VOICE" AV_PROJ="$PROJECT" AV_LLM="$LLM" AV_THPORT="$TH_PORT" \
base64 -w0 "$WAV" 2>/dev/null | "$PYBIN" - <<'PY'
import os, sys, json, urllib.request
b64 = sys.stdin.read().strip()
if not b64:
    raise SystemExit(8)
body = json.dumps({"audioBase64": b64, "text": os.environ.get("AV_TEXT",""),
                   "voice": os.environ.get("AV_VOICE",""), "project": os.environ.get("AV_PROJ",""),
                   "origin": "local", "llm": os.environ.get("AV_LLM","")}).encode()
try:
    resp = urllib.request.urlopen(
        urllib.request.Request("http://127.0.0.1:%s/speak" % os.environ["AV_THPORT"],
            data=body, headers={"Content-Type": "application/json"}),
        timeout=5)
    code = resp.getcode()
    raise SystemExit(0 if 200 <= code < 300 else 8)
except SystemExit:
    raise
except Exception:
    raise SystemExit(8)
PY
exit $?
