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

# Step 1: Generate TTS WITHOUT playback
export AGENTVIBES_NO_PLAYBACK=true
OUTPUT=$("$SCRIPT_DIR/play-tts.sh" "$TEXT" "$VOICE_OVERRIDE" 2>&1)

# Extract the generated file path from output
GENERATED_FILE=$(echo "$OUTPUT" | grep "Saved to:" | sed 's/.*Saved to: //')

if [[ -z "$GENERATED_FILE" ]] || [[ ! -f "$GENERATED_FILE" ]]; then
    echo "Error: Failed to generate TTS audio" >&2
    echo "$OUTPUT" >&2
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
