#!/usr/bin/env bash
#
# File: .claude/hooks/bmad-speak-enhanced.sh
#
# AgentVibes BMAD Voice Integration with Audio Effects
# Enhanced version with background music and voice effects per agent
#
# Usage: bmad-speak-enhanced.sh "Agent Name" "dialogue text"
#
# Features:
# - All features of bmad-speak.sh
# - Per-agent sox voice effects
# - Per-agent background music mixing
# - Configurable via audio-effects.cfg
#

set -euo pipefail

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Arguments
AGENT_NAME_OR_ID="${1:-}"
DIALOGUE="${2:-}"

if [[ -z "$AGENT_NAME_OR_ID" ]] || [[ -z "$DIALOGUE" ]]; then
    echo "Usage: $0 \"Agent Name\" \"dialogue text\"" >&2
    exit 1
fi

# Remove backslash escaping that Claude might add for special chars like ! and $
DIALOGUE="${DIALOGUE//\\!/!}"
DIALOGUE="${DIALOGUE//\\\$/\$}"

# Check if party mode is enabled
if [[ -f "$PROJECT_ROOT/.agentvibes/bmad/bmad-party-mode-disabled.flag" ]]; then
    exit 0
fi

# Check if BMAD is installed
if [[ ! -f "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv" ]]; then
    exit 0
fi

# Map display name to agent ID
map_to_agent_id() {
    local name_or_id="$1"

    # If it looks like a file path, extract the agent ID
    if [[ "$name_or_id" =~ \.bmad/.*/agents/([^/]+)\.md$ ]]; then
        echo "${BASH_REMATCH[1]}"
        return
    fi

    # Check if it's already an agent ID
    local direct_match=$(grep -i "^\"*${name_or_id}\"*," "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv" | head -1)
    if [[ -n "$direct_match" ]]; then
        echo "$name_or_id"
        return
    fi

    # Map display name to agent ID
    local agent_id=$(awk -F',' -v name="$name_or_id" '
        BEGIN { IGNORECASE=1 }
        NR > 1 {
            display = $2
            gsub(/^"|"$/, "", display)
            if (tolower(display) ~ "^" tolower(name) "($| |\\()") {
                agent = $1
                gsub(/^"|"$/, "", agent)
                print agent
                exit
            }
        }
    ' "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv")

    echo "$agent_id"
}

# Get display name from manifest for audio processor
get_display_name() {
    local agent_id="$1"

    local display_name=$(awk -F',' -v id="$agent_id" '
        BEGIN { IGNORECASE=1 }
        NR > 1 {
            aid = $1
            gsub(/^"|"$/, "", aid)
            if (tolower(aid) == tolower(id)) {
                display = $2
                gsub(/^"|"$/, "", display)
                print display
                exit
            }
        }
    ' "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv")

    echo "$display_name"
}

# Get agent ID
AGENT_ID=$(map_to_agent_id "$AGENT_NAME_OR_ID")
DISPLAY_NAME=$(get_display_name "$AGENT_ID")

# Use display name for config lookup, fallback to original input
AGENT_FOR_EFFECTS="${DISPLAY_NAME:-$AGENT_NAME_OR_ID}"

# Get agent's voice and intro text
AGENT_VOICE=""
AGENT_INTRO=""
if [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
    AGENT_VOICE=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$AGENT_ID" 2>/dev/null || echo "")
    AGENT_INTRO=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-intro "$AGENT_ID" 2>/dev/null || echo "")
fi

# Prepend intro text if configured
FULL_TEXT="$DIALOGUE"
if [[ -n "$AGENT_INTRO" ]]; then
    FULL_TEXT="${AGENT_INTRO}. ${DIALOGUE}"
fi

# Export agent name for audio processor to pick up
export AGENTVIBES_CURRENT_AGENT="$AGENT_FOR_EFFECTS"

# Use enhanced pipeline: TTS -> Effects -> Play
# This directly generates and processes audio instead of using queue

# Generate TTS audio file directly
AUDIO_DIR="$PROJECT_ROOT/.claude/audio"
mkdir -p "$AUDIO_DIR"
TEMP_FILE="$AUDIO_DIR/tts-enhanced-$(date +%s)-$$.wav"

# Determine voice and generate audio
if [[ -n "$AGENT_VOICE" ]]; then
    echo "🎤 Agent: $AGENT_FOR_EFFECTS | Voice: $AGENT_VOICE"
    # Call piper directly to generate audio without playback
    "$SCRIPT_DIR/play-tts-piper.sh" "$FULL_TEXT" "$AGENT_VOICE" > /dev/null 2>&1 &
    PIPER_PID=$!

    # Wait for piper to generate (it outputs the file path)
    wait $PIPER_PID 2>/dev/null || true

    # Find the most recent TTS file
    GENERATED_FILE=$(ls -t "$AUDIO_DIR"/tts-padded-*.wav 2>/dev/null | head -1)

    if [[ -n "$GENERATED_FILE" ]] && [[ -f "$GENERATED_FILE" ]]; then
        # Apply audio effects and background mixing
        if [[ -f "$SCRIPT_DIR/audio-processor.sh" ]]; then
            PROCESSED_FILE="$AUDIO_DIR/tts-enhanced-processed-$(date +%s)-$$.wav"
            "$SCRIPT_DIR/audio-processor.sh" "$GENERATED_FILE" "$AGENT_FOR_EFFECTS" "$PROCESSED_FILE" 2>/dev/null || {
                # Fallback to original if processing fails
                PROCESSED_FILE="$GENERATED_FILE"
            }

            # Play the processed file
            if [[ -f "$PROCESSED_FILE" ]]; then
                (mpv "$PROCESSED_FILE" || aplay "$PROCESSED_FILE" || paplay "$PROCESSED_FILE") >/dev/null 2>&1 &
            fi
        fi
    fi
else
    # Fallback to standard TTS queue
    bash "$SCRIPT_DIR/tts-queue.sh" add "$FULL_TEXT" &
fi
