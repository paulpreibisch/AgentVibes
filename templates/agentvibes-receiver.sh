#!/usr/bin/env bash
#
# File: agentvibes-receiver.sh
# Location: User installs to ~/.termux/agentvibes-play.sh or ~/.agentvibes/play-remote.sh
#
# AgentVibes SSH-TTS Receiver
# Receives base64-encoded JSON payload from remote server via SSH,
# decodes it, applies voice/music/effects, and plays with local AgentVibes.
#
# Payload format: base64({"text","voice","effects","music","volume","pretext","speed","provider","llm"})
#
# SSH ForceCommand: SSH_ORIGINAL_COMMAND carries the base64 payload.
# Direct invocation: pass the payload as first argument.
#
# Installation:
#   curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/scripts/install-ssh-receiver.sh | bash
#   OR
#   agentvibes install --ssh-receiver
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under Apache-2.0
#

set -euo pipefail

# Handle -- argument separator (skip it if present)
if [[ "${1:-}" == "--" ]]; then
    shift
fi

# ---------------------------------------------------------------------------
# Resolve encoded payload: arg → SSH_ORIGINAL_COMMAND → stdin (legacy)
# ---------------------------------------------------------------------------

ENCODED_PAYLOAD="${1:-}"
if [[ -z "$ENCODED_PAYLOAD" ]]; then
    ENCODED_PAYLOAD="${SSH_ORIGINAL_COMMAND:-}"
fi
if [[ -z "$ENCODED_PAYLOAD" ]]; then
    ENCODED_PAYLOAD=$(cat 2>/dev/null || true)
fi

if [[ -z "$ENCODED_PAYLOAD" ]]; then
    echo "❌ No payload provided" >&2
    echo "Usage: $0 <base64-json-payload>" >&2
    exit 1
fi

# Reject oversized payloads (DoS guard: 64 KB is generous for any TTS request)
_MAX_PAYLOAD_BYTES=65536
if [[ ${#ENCODED_PAYLOAD} -gt $_MAX_PAYLOAD_BYTES ]]; then
    echo "❌ Payload too large (max ${_MAX_PAYLOAD_BYTES} bytes)" >&2
    exit 1
fi

# Validate it looks like base64
if [[ ! "$ENCODED_PAYLOAD" =~ ^[A-Za-z0-9+/=]+$ ]]; then
    echo "❌ Payload must be base64-encoded" >&2
    exit 1
fi

# Decode
DECODED=$(printf '%s' "$ENCODED_PAYLOAD" | base64 -d 2>/dev/null) || {
    echo "❌ Failed to decode base64 payload" >&2; exit 1
}

# ---------------------------------------------------------------------------
# Parse JSON payload — python3 is required for JSON parsing
# ---------------------------------------------------------------------------

if ! command -v python3 &>/dev/null; then
    echo "❌ python3 required for JSON parsing" >&2; exit 1
fi

# Parse all fields in one python call to avoid repeated process spawning
# and to log a clear error if the payload is malformed JSON.
_PARSE_OUT=$(python3 - "$DECODED" 2>&1 <<'PYEOF'
import json, sys
try:
    d = json.loads(sys.argv[1])
    for field in ("text","voice","music","volume","effects","pretext","speed","provider","llm"):
        print(d.get(field, ""))
except json.JSONDecodeError as e:
    print(f"JSON_PARSE_ERROR: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
) || { echo "❌ Invalid JSON in payload: $_PARSE_OUT" >&2; exit 1; }

# Assign fields from ordered output lines
TEXT=$(    sed -n '1p' <<< "$_PARSE_OUT")
VOICE=$(   sed -n '2p' <<< "$_PARSE_OUT")
MUSIC=$(   sed -n '3p' <<< "$_PARSE_OUT")
VOLUME=$(  sed -n '4p' <<< "$_PARSE_OUT")
EFFECTS=$( sed -n '5p' <<< "$_PARSE_OUT")
PRETEXT=$( sed -n '6p' <<< "$_PARSE_OUT")
SPEED=$(   sed -n '7p' <<< "$_PARSE_OUT")
PROVIDER=$(sed -n '8p' <<< "$_PARSE_OUT")
LLM=$(     sed -n '9p' <<< "$_PARSE_OUT")

# Fall back to defaults
[[ -z "$VOICE"    ]] && VOICE="en_US-lessac-medium"
[[ -z "$VOLUME"   ]] && VOLUME="0.10"
[[ -z "$PROVIDER" ]] && PROVIDER="piper"

# Validate text
if [[ -z "$TEXT" ]]; then
    echo "❌ No text in payload" >&2; exit 1
fi

# SECURITY: Validate voice — letters, digits, underscore, hyphen, period, colon
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_.:/-]+$ ]]; then
    echo "❌ Invalid voice format: $VOICE" >&2; exit 1
fi

# Validate volume is numeric
if [[ ! "$VOLUME" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    VOLUME="0.10"
fi

# Validate provider
case "$PROVIDER" in
    piper|soprano|macos|windows-sapi) ;;
    *) PROVIDER="piper" ;;
esac

# Prepend pretext if present (same logic as PS receiver)
if [[ -n "$PRETEXT" ]]; then
    TEXT="${PRETEXT}. ${TEXT}"
fi

# ---------------------------------------------------------------------------
# Test mode: dump what would be played without calling play-tts
# ---------------------------------------------------------------------------

if [[ "${AGENTVIBES_TEST_MODE:-false}" == "true" ]]; then
    python3 -c "
import json, sys
print(json.dumps({
    'text':     sys.argv[1],
    'voice':    sys.argv[2],
    'music':    sys.argv[3],
    'volume':   sys.argv[4],
    'effects':  sys.argv[5],
    'pretext':  sys.argv[6],
    'provider': sys.argv[7],
    'llm':      sys.argv[8],
}, ensure_ascii=False))
" "$TEXT" "$VOICE" "$MUSIC" "$VOLUME" "$EFFECTS" "$PRETEXT" "$PROVIDER" "$LLM"
    exit 0
fi

# ---------------------------------------------------------------------------
# Find AgentVibes installation
# ---------------------------------------------------------------------------

# Suppress GitHub star reminders (receiver mode)
export AGENTVIBES_NO_REMINDERS=1

find_agentvibes() {
    if command -v agentvibes >/dev/null 2>&1; then
        local bin_path
        bin_path=$(which agentvibes)
        if [[ -L "$bin_path" ]]; then
            bin_path=$(readlink -f "$bin_path" 2>/dev/null || realpath "$bin_path" 2>/dev/null || echo "$bin_path")
        fi
        local lib_path
        lib_path="$(dirname "$(dirname "$bin_path")")/lib/node_modules/agentvibes"
        if [[ -d "$lib_path" ]]; then
            echo "$lib_path"
            return 0
        fi
    fi

    local search_paths=(
        "$HOME/.npm-global/lib/node_modules/agentvibes"
        "/usr/local/lib/node_modules/agentvibes"
        "/data/data/com.termux/files/usr/lib/node_modules/agentvibes"
    )

    if [[ -d "$HOME/.nvm/versions/node" ]]; then
        local nvm_path
        nvm_path=$(find "$HOME/.nvm/versions/node" -maxdepth 3 -type d -name "agentvibes" -path "*/lib/node_modules/*" 2>/dev/null | head -1)
        if [[ -n "$nvm_path" ]] && [[ -d "$nvm_path" ]]; then
            echo "$nvm_path"
            return 0
        fi
    fi

    for p in "${search_paths[@]}"; do
        [[ -d "$p" ]] && { echo "$p"; return 0; }
    done

    return 1
}

AGENTVIBES_ROOT=$(find_agentvibes)

if [[ -z "$AGENTVIBES_ROOT" ]]; then
    echo "❌ AgentVibes not found" >&2
    echo "💡 Install: npm install -g agentvibes" >&2
    exit 1
fi

PLAY_TTS="$AGENTVIBES_ROOT/.claude/hooks/play-tts.sh"

if [[ ! -f "$PLAY_TTS" ]]; then
    echo "❌ play-tts.sh not found at $PLAY_TTS" >&2; exit 1
fi

# ---------------------------------------------------------------------------
# Apply music / effects overrides via env vars for play-tts.sh
# ---------------------------------------------------------------------------

[[ -n "$MUSIC"   ]] && export AGENTVIBES_OVERRIDE_MUSIC="$MUSIC"
[[ -n "$VOLUME"  ]] && export AGENTVIBES_OVERRIDE_VOLUME="$VOLUME"
[[ -n "$EFFECTS" ]] && export AGENTVIBES_OVERRIDE_EFFECTS="$EFFECTS"
[[ -n "$SPEED"   ]] && export AGENTVIBES_OVERRIDE_SPEED="$SPEED"

if [[ "${AGENTVIBES_DEBUG:-0}" == "1" ]]; then
    echo "[DEBUG] Voice: $VOICE" >&2
    echo "[DEBUG] Music: ${MUSIC:-none}" >&2
    echo "[DEBUG] Volume: ${VOLUME:-none}" >&2
    echo "[DEBUG] Effects: ${EFFECTS:-none}" >&2
    echo "[DEBUG] Pretext: ${PRETEXT:-none}" >&2
    echo "[DEBUG] Provider: $PROVIDER" >&2
fi

echo "🎵 Playing via AgentVibes: ${TEXT:0:50}..." >&2
bash "$PLAY_TTS" "$TEXT" "$VOICE"

exit 0
