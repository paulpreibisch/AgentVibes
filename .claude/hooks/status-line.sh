#!/bin/bash

# Claude Code Status Line Script - AgentVibes Enhanced Edition
# Format: Model | Output Style | Folder | Branch | Commit | MCPs | Audio | AgentVibes | Context | Last Message
# Input: JSON with session details (passed via stdin)
# Output: Single line of text (first line of stdout becomes status line)

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Debug: Save input to temp file for inspection (optional - remove after debugging)
# echo "$INPUT" > /tmp/status-line-debug.json

# Extract variables from JSON
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "Claude"')
OUTPUT_STYLE=$(echo "$INPUT" | jq -r '.output_style.name // .output_style // "default"')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.workspace.project_dir // ""')

# Get last user message from transcript file
LAST_MESSAGE=""
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Get the most recent user text message (not tool results)
    LAST_MESSAGE=$(tac "$TRANSCRIPT_PATH" 2>/dev/null | jq -r '
        select(.message.role == "user" and
               (.message.content | type) == "array" and
               (.message.content[] | select(.type == "text"))) |
        .message.content[] |
        select(.type == "text") |
        .text
    ' 2>/dev/null | head -n 1 | head -c 50)

    # Clean up and add ellipsis
    if [ -n "$LAST_MESSAGE" ] && [ "$LAST_MESSAGE" != "null" ]; then
        LAST_MESSAGE=$(echo "$LAST_MESSAGE" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        if [ ${#LAST_MESSAGE} -ge 50 ]; then
            LAST_MESSAGE="${LAST_MESSAGE}..."
        fi
    else
        LAST_MESSAGE=""
    fi
fi

# Check Audio Tunnel Status (port 14713)
AUDIO_STATUS=""
AUDIO_COLOR=""
if ss -tlnp 2>/dev/null | grep -q :14713; then
    # Tunnel is active
    AUDIO_STATUS="🔊 Tunnel"
    AUDIO_COLOR='\033[32m'  # Green
else
    # Tunnel is down
    AUDIO_STATUS="🔇 No Tunnel"
    AUDIO_COLOR='\033[31m'  # Red
fi

# ============================================
# AgentVibes TTS Settings - Enhanced Detection
# ============================================

# Helper function to get setting from project or global
get_setting() {
    local setting_name="$1"
    local default_value="$2"
    local project_file="$CWD/.claude/$setting_name"
    local global_file="$HOME/.claude/$setting_name"

    if [ -f "$project_file" ]; then
        cat "$project_file" 2>/dev/null | tr -d '[:space:]'
    elif [ -f "$global_file" ]; then
        cat "$global_file" 2>/dev/null | tr -d '[:space:]'
    else
        echo "$default_value"
    fi
}

# Detect AgentVibes mode (Lite vs Full)
AGENTVIBES_MODE="Full"
if [ -f "$CWD/.claude/output-styles/agent-vibes-lite.md" ]; then
    AGENTVIBES_MODE="Lite"
fi

# Get TTS mute status
TTS_MUTED="no"
TTS_MUTE_ICON="🎤"
TTS_MUTE_COLOR='\033[32m'  # Green = unmuted
# Check project-level first (project overrides global)
if [ -f "$CWD/.claude/agentvibes-unmuted" ]; then
    TTS_MUTED="no"
elif [ -f "$CWD/.claude/agentvibes-muted" ]; then
    TTS_MUTED="yes"
elif [ -f "$HOME/.agentvibes-muted" ]; then
    TTS_MUTED="yes"
fi
if [ "$TTS_MUTED" = "yes" ]; then
    TTS_MUTE_ICON="🔇"
    TTS_MUTE_COLOR='\033[31m'  # Red = muted
fi

# Get TTS provider
TTS_PROVIDER=$(get_setting "tts-provider.txt" "piper")
PROVIDER_ICON=""
case "$TTS_PROVIDER" in
    piper) PROVIDER_ICON="🎵" ;;
    elevenlabs) PROVIDER_ICON="☁️" ;;
    macos) PROVIDER_ICON="🍎" ;;
    *) PROVIDER_ICON="🔊" ;;
esac

# Get TTS voice (shorten the name for display)
TTS_VOICE=$(get_setting "tts-voice.txt" "default")
# Extract just the voice name from patterns like "en_US-lessac-medium"
TTS_VOICE_SHORT=$(echo "$TTS_VOICE" | sed 's/en_US-//;s/en_GB-//;s/-medium//;s/-high//;s/-low//')
if [ ${#TTS_VOICE_SHORT} -gt 12 ]; then
    TTS_VOICE_SHORT="${TTS_VOICE_SHORT:0:10}.."
fi

# Get verbosity level (Low/Medium/High)
TTS_VERBOSITY=$(get_setting "tts-verbosity.txt" "medium")
VERBOSITY_ICON=""
case "$TTS_VERBOSITY" in
    low)
        VERBOSITY_DISPLAY="Low"
        VERBOSITY_ICON="📢"
        ;;
    high)
        VERBOSITY_DISPLAY="High"
        VERBOSITY_ICON="📣"
        ;;
    medium|*)
        VERBOSITY_DISPLAY="Med"
        VERBOSITY_ICON="📢"
        ;;
esac

# Get background music status and track name
BG_MUSIC_DISPLAY="🎵 None"
BG_MUSIC_COLOR='\033[90m'  # Gray = not set
BG_ENABLED_FILE="$CWD/.claude/config/background-music-enabled.txt"
BG_EFFECTS_FILE="$CWD/.claude/config/audio-effects.cfg"
if [ -f "$BG_ENABLED_FILE" ]; then
    BG_STATUS=$(cat "$BG_ENABLED_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ "$BG_STATUS" = "true" ] || [ "$BG_STATUS" = "on" ] || [ "$BG_STATUS" = "1" ]; then
        # Get track name from audio-effects.cfg (default agent line)
        BG_TRACK_NAME=""
        if [ -f "$BG_EFFECTS_FILE" ]; then
            # Parse: default|effects|track_file.mp3|volume
            BG_TRACK_FILE=$(grep "^default|" "$BG_EFFECTS_FILE" 2>/dev/null | cut -d'|' -f3)
            if [ -n "$BG_TRACK_FILE" ]; then
                # Extract friendly name: agent_vibes_bachata_v1_loop.mp3 -> Bachata
                BG_TRACK_NAME=$(echo "$BG_TRACK_FILE" | sed 's/agent_vibes_//;s/agentvibes_//;s/_v[0-9]*//g;s/_loop//;s/\.mp3//;s/_/ /g;s/soft //g')
                # Capitalize first letter of each word
                BG_TRACK_NAME=$(echo "$BG_TRACK_NAME" | sed 's/\b\(.\)/\u\1/g')
            fi
        fi
        if [ -n "$BG_TRACK_NAME" ]; then
            BG_MUSIC_DISPLAY="🎵 $BG_TRACK_NAME"
        else
            BG_MUSIC_DISPLAY="🎵 On"
        fi
        BG_MUSIC_COLOR='\033[35m'  # Magenta = on
    fi
fi

# Get personality with sentiment
TTS_PERSONALITY=$(get_setting "tts-personality.txt" "")
TTS_SENTIMENT=""
PERSONALITY_COLOR='\033[95m'  # Light magenta
if [ -n "$TTS_PERSONALITY" ] && [ "$TTS_PERSONALITY" != "normal" ] && [ "$TTS_PERSONALITY" != "default" ]; then
    # Check if there's a sentiment file for current voice
    CURRENT_VOICE=$(get_setting "tts-voice.txt" "")
    if [ -n "$CURRENT_VOICE" ]; then
        SENTIMENT_FILE="$CWD/.claude/config/sentiments/${CURRENT_VOICE}.txt"
        if [ -f "$SENTIMENT_FILE" ]; then
            TTS_SENTIMENT=$(cat "$SENTIMENT_FILE" 2>/dev/null | tr -d '[:space:]')
            if [ "$TTS_SENTIMENT" = "$TTS_PERSONALITY" ]; then
                # Capitalize first letter
                TTS_SENTIMENT=$(echo "$TTS_PERSONALITY" | sed 's/\b\(.\)/\u\1/')
            fi
        fi
    fi
fi

# Detect RDP mode
RDP_MODE="Off"
RDP_MODE_COLOR='\033[90m'  # Gray
RDP_CONFIG="$CWD/.claude/config/rdp-mode.txt"
if [ -f "$RDP_CONFIG" ]; then
    RDP_STATUS=$(cat "$RDP_CONFIG" 2>/dev/null | tr -d '[:space:]')
    if [ "$RDP_STATUS" = "on" ] || [ "$RDP_STATUS" = "true" ] || [ "$RDP_STATUS" = "1" ]; then
        RDP_MODE="RDP"
        RDP_MODE_COLOR='\033[33m'  # Yellow
    fi
fi

# Detect language learning mode
LEARN_MODE=""
LEARN_MODE_COLOR='\033[96m'  # Cyan
LEARN_ENABLED="$CWD/.claude/config/learn-mode-enabled.txt"
TARGET_LANG_FILE="$CWD/.claude/config/target-language.txt"
if [ -f "$LEARN_ENABLED" ]; then
    LEARN_STATUS=$(cat "$LEARN_ENABLED" 2>/dev/null | tr -d '[:space:]')
    if [ "$LEARN_STATUS" = "on" ] || [ "$LEARN_STATUS" = "true" ] || [ "$LEARN_STATUS" = "1" ]; then
        if [ -f "$TARGET_LANG_FILE" ]; then
            TARGET_LANG=$(cat "$TARGET_LANG_FILE" 2>/dev/null | tr -d '[:space:]')
            # Convert language code to flag emoji
            case "$TARGET_LANG" in
                es) LEARN_MODE="🇪🇸 Learning" ;;
                fr) LEARN_MODE="🇫🇷 Learning" ;;
                de) LEARN_MODE="🇩🇪 Learning" ;;
                it) LEARN_MODE="🇮🇹 Learning" ;;
                pt) LEARN_MODE="🇵🇹 Learning" ;;
                ja) LEARN_MODE="🇯🇵 Learning" ;;
                ko) LEARN_MODE="🇰🇷 Learning" ;;
                zh) LEARN_MODE="🇨🇳 Learning" ;;
                *) LEARN_MODE="🌍 Learning" ;;
            esac
        else
            LEARN_MODE="🌍 Learning"
        fi
    fi
fi

# Git information (if in a git repo)
GIT_BRANCH=""
GIT_COMMIT=""
GIT_STATUS=""
GIT_AHEAD=""
GIT_BEHIND=""
GIT_STASH=""
if [ -d "$CWD/.git" ]; then
    # Get current branch
    GIT_BRANCH=$(cd "$CWD" && git rev-parse --abbrev-ref HEAD 2>/dev/null)

    # Get short commit hash
    GIT_COMMIT=$(cd "$CWD" && git rev-parse --short HEAD 2>/dev/null)

    # Check if repo is dirty
    if [ -n "$GIT_BRANCH" ]; then
        if [ -n "$(cd "$CWD" && git status --porcelain 2>/dev/null)" ]; then
            GIT_STATUS="*"  # Dirty
        else
            GIT_STATUS="✓"  # Clean
        fi
    fi

    # Get ahead/behind counts relative to upstream
    if [ -n "$GIT_BRANCH" ]; then
        # Get upstream branch (suppress error if no upstream)
        UPSTREAM=$(cd "$CWD" && git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)
        if [ -n "$UPSTREAM" ]; then
            # Count commits ahead and behind
            AHEAD_COUNT=$(cd "$CWD" && git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
            BEHIND_COUNT=$(cd "$CWD" && git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")

            if [ "$AHEAD_COUNT" -gt 0 ]; then
                GIT_AHEAD="↑${AHEAD_COUNT}"  # Commits ahead of origin (need to push)
            fi
            if [ "$BEHIND_COUNT" -gt 0 ]; then
                GIT_BEHIND="↓${BEHIND_COUNT}"  # Commits behind origin (need to pull)
            fi
        fi
    fi

    # Get stash count
    STASH_COUNT=$(cd "$CWD" && git stash list 2>/dev/null | wc -l)
    if [ "$STASH_COUNT" -gt 0 ]; then
        GIT_STASH="⚑${STASH_COUNT}"  # Number of stashed changes
    fi
fi

# Get folder name (last directory in path)
FOLDER=$(basename "$CWD")

# ANSI color codes
CYAN='\033[36m'
GREEN='\033[32m'
LIGHT_GREEN='\033[92m'
YELLOW='\033[33m'
BLUE='\033[34m'
LIGHT_BLUE='\033[94m'
MAGENTA='\033[35m'
LIGHT_MAGENTA='\033[95m'
RED='\033[31m'
WHITE='\033[37m'
GRAY='\033[90m'
RESET='\033[0m'

# Build status line components in required order with colors
COMPONENTS=()

# 1. Model (first) - Cyan
COMPONENTS+=("${CYAN}🤖 $MODEL${RESET}")

# 2. Output Style - Green (show mode if AgentVibes)
if [ "$OUTPUT_STYLE" = "agent-vibes-lite" ]; then
    COMPONENTS+=("${GREEN}🎨 AgentVibes ${LIGHT_GREEN}Lite${RESET}")
elif [[ "$OUTPUT_STYLE" =~ "agent-vibes" ]]; then
    COMPONENTS+=("${GREEN}🎨 AgentVibes ${LIGHT_GREEN}Full${RESET}")
else
    COMPONENTS+=("${GREEN}🎨 $OUTPUT_STYLE${RESET}")
fi

# 3. Folder - Yellow
COMPONENTS+=("${YELLOW}📂 $FOLDER${RESET}")

# 4. Branch - Light Green with ahead/behind/stash indicators
if [ -n "$GIT_BRANCH" ]; then
    BRANCH_INFO="${LIGHT_GREEN}🌿 $GIT_BRANCH$GIT_STATUS"
    # Add ahead/behind indicators (cyan for ahead, yellow for behind)
    if [ -n "$GIT_AHEAD" ]; then
        BRANCH_INFO+=" ${CYAN}${GIT_AHEAD}${LIGHT_GREEN}"
    fi
    if [ -n "$GIT_BEHIND" ]; then
        BRANCH_INFO+=" ${YELLOW}${GIT_BEHIND}${LIGHT_GREEN}"
    fi
    # Add stash indicator (magenta)
    if [ -n "$GIT_STASH" ]; then
        BRANCH_INFO+=" ${MAGENTA}${GIT_STASH}${LIGHT_GREEN}"
    fi
    COMPONENTS+=("${BRANCH_INFO}${RESET}")
fi

# 5. Commit - Light Green
if [ -n "$GIT_COMMIT" ]; then
    COMPONENTS+=("${LIGHT_GREEN}⎇ $GIT_COMMIT${RESET}")
fi

# 6. MCPs loaded - Not available in status line JSON, skip this field

# 7. Audio Tunnel Status - Green (active) or Red (down)
COMPONENTS+=("${AUDIO_COLOR}${AUDIO_STATUS}${RESET}")

# 8. AgentVibes TTS Status - Compact but informative
# Format: 🎤 Voice | 📢 Verbosity | 🎵 Music [Personality] [RDP] [Learning]
AGENTVIBES_INFO="${TTS_MUTE_COLOR}${TTS_MUTE_ICON} ${TTS_VOICE_SHORT}${RESET}"
AGENTVIBES_INFO+=" ${WHITE}${VERBOSITY_ICON} ${VERBOSITY_DISPLAY}${RESET}"

# Add background music (always show)
AGENTVIBES_INFO+=" ${BG_MUSIC_COLOR}${BG_MUSIC_DISPLAY}${RESET}"

# Add optional features
if [ -n "$TTS_SENTIMENT" ]; then
    AGENTVIBES_INFO+=" ${PERSONALITY_COLOR}✨${TTS_SENTIMENT}${RESET}"
fi
if [ "$RDP_MODE" != "Off" ]; then
    AGENTVIBES_INFO+=" ${RDP_MODE_COLOR}🖥️${RDP_MODE}${RESET}"
fi
if [ -n "$LEARN_MODE" ]; then
    AGENTVIBES_INFO+=" ${LEARN_MODE_COLOR}${LEARN_MODE}${RESET}"
fi

COMPONENTS+=("$AGENTVIBES_INFO")

# 9. Session cost (if available)
if [ -n "$(echo "$INPUT" | jq -r '.cost.total_cost_usd // ""')" ]; then
    TOTAL_COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')
    # Format cost with 4 decimal places
    COST_DISPLAY=$(printf "%.4f" "$TOTAL_COST")
    COMPONENTS+=("${YELLOW}💰 \$${COST_DISPLAY}${RESET}")
fi

# 10. Last message (if available) - Gray
if [ -n "$LAST_MESSAGE" ]; then
    COMPONENTS+=("${GRAY}💬 $LAST_MESSAGE${RESET}")
fi

# Join components with separator
STATUS_LINE=$(IFS=" │ "; echo -e "${COMPONENTS[*]}")

# Output the status line (first line of stdout)
echo -e "$STATUS_LINE"
