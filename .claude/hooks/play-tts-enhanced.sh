#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-enhanced.sh
#
# AgentVibes - Enhanced TTS with Background Music and Effects
# Generates TTS, applies effects, mixes background, plays ONCE (no echo)
#
# Usage: play-tts-enhanced.sh "text to speak" [agent_name] [voice_override]
#
# Environment:
#   AGENTVIBES_PARTY_MODE=true  - Use room ambiance background (_party_mode config)
#

set -euo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TEXT="${1:-}"
AGENT_NAME="${2:-default}"
VOICE_OVERRIDE="${3:-}"

if [[ -z "$TEXT" ]]; then
    echo "Usage: $0 \"text to speak\" [agent_name] [voice_override]" >&2
    exit 1
fi

# Determine which config to use
CONFIG_KEY="$AGENT_NAME"
if [[ "${AGENTVIBES_PARTY_MODE:-false}" == "true" ]]; then
    CONFIG_KEY="_party_mode"
fi

# ---------------------------------------------------------------------------
# Per-agent profile overrides (from bmad-voice-map.json via bmad-speak.sh)
# If AGENTVIBES_AGENT_PROFILE is set and the file exists, apply reverb/personality/music
# overrides by temporarily setting effects-manager config for this agent
AGENT_PROFILE="${AGENTVIBES_AGENT_PROFILE:-}"

if [[ -n "$AGENT_PROFILE" ]] && [[ -f "$AGENT_PROFILE" ]]; then
    # Read profile fields using node (reliable JSON parsing)
    # SECURITY: Pass values via env vars to prevent shell injection
    _PROFILE_REVERB=$(_APFILE="$AGENT_PROFILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._APFILE,'utf8'));process.stdout.write(p.reverbPreset||'')}catch{}" 2>/dev/null || true)
    _PROFILE_MUSIC_TRACK=$(_APFILE="$AGENT_PROFILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._APFILE,'utf8'));process.stdout.write(p.backgroundMusic?.track||'')}catch{}" 2>/dev/null || true)
    _PROFILE_MUSIC_VOL=$(_APFILE="$AGENT_PROFILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._APFILE,'utf8'));process.stdout.write(String(p.backgroundMusic?.volume||''))}catch{}" 2>/dev/null || true)

    # Apply per-invocation reverb via env var override (processed by audio-processor.sh).
    # This avoids permanently mutating audio-effects.cfg — env var is process-scoped and auto-cleaned.
    if [[ -n "$_PROFILE_REVERB" ]]; then
        export AGENTVIBES_REVERB_OVERRIDE="$_PROFILE_REVERB"
    fi

    # Override background music track/volume for this invocation via env vars
    if [[ -n "$_PROFILE_MUSIC_TRACK" ]]; then
        export AGENTVIBES_BG_TRACK="$_PROFILE_MUSIC_TRACK"
    fi
    if [[ -n "$_PROFILE_MUSIC_VOL" ]]; then
        export AGENTVIBES_BG_VOLUME="$_PROFILE_MUSIC_VOL"
    fi
fi

# Step 1: Generate TTS WITHOUT playback
export AGENTVIBES_NO_PLAYBACK=true
export AGENTVIBES_WAV_OUTPATH="${XDG_RUNTIME_DIR:-/tmp}/agentvibes-last-wav-$$.txt"

# Cleanup temp outpath file on exit
trap 'rm -f "$AGENTVIBES_WAV_OUTPATH"' EXIT
bash "$SCRIPT_DIR/play-tts.sh" "$TEXT" "$VOICE_OVERRIDE"

# Read the generated file path (written by play-tts-piper.sh via AGENTVIBES_WAV_OUTPATH)
GENERATED_FILE=""
if [[ -f "$AGENTVIBES_WAV_OUTPATH" ]]; then
    GENERATED_FILE=$(cat "$AGENTVIBES_WAV_OUTPATH")
    rm -f "$AGENTVIBES_WAV_OUTPATH"
fi
unset AGENTVIBES_WAV_OUTPATH

if [[ -z "$GENERATED_FILE" ]] || [[ ! -f "$GENERATED_FILE" ]]; then
    echo "Error: Could not find generated audio file" >&2
    exit 1
fi

# Step 2: Process with effects and background
PROCESSED_FILE="${GENERATED_FILE%.wav}-enhanced.wav"

if [[ -f "$SCRIPT_DIR/audio-processor.sh" ]]; then
    "$SCRIPT_DIR/audio-processor.sh" "$GENERATED_FILE" "$CONFIG_KEY" "$PROCESSED_FILE" 2>/dev/null || {
        # Fallback to original if processing fails
        PROCESSED_FILE="$GENERATED_FILE"
    }
else
    PROCESSED_FILE="$GENERATED_FILE"
fi

# Step 3: Play the processed audio ONCE
if [[ -f "$PROCESSED_FILE" ]]; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
        afplay "$PROCESSED_FILE" >/dev/null 2>&1 &
    else
        (mpv "$PROCESSED_FILE" || aplay "$PROCESSED_FILE" || paplay "$PROCESSED_FILE") >/dev/null 2>&1 &
    fi
    echo "🎵 Enhanced audio: $PROCESSED_FILE"
else
    echo "Error: Processed file not found" >&2
    exit 1
fi
