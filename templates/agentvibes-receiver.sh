#!/usr/bin/env bash
#
# File: agentvibes-receiver.sh
# Location: User installs to ~/.termux/agentvibes-play.sh or ~/.agentvibes/play-remote.sh
#
# AgentVibes SSH-TTS Receiver
# Receives text from remote server via SSH, plays with local AgentVibes
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

TEXT="$1"
VOICE="${2:-en_US-ryan-high}"

if [[ -z "$TEXT" ]]; then
    echo "❌ No text provided" >&2
    echo "Usage: $0 <text> [voice]" >&2
    exit 1
fi

# Suppress GitHub star reminders (receiver mode)
export AGENTVIBES_NO_REMINDERS=1

# Find AgentVibes installation
find_agentvibes() {
    # Try command lookup first
    if command -v agentvibes >/dev/null 2>&1; then
        local bin_path=$(which agentvibes)
        # Resolve if it's a symlink
        if [[ -L "$bin_path" ]]; then
            bin_path=$(readlink -f "$bin_path" 2>/dev/null || realpath "$bin_path" 2>/dev/null)
        fi
        local lib_path="$(dirname $(dirname "$bin_path"))/lib/node_modules/agentvibes"
        if [[ -d "$lib_path" ]]; then
            echo "$lib_path"
            return 0
        fi
    fi
    
    # Check common npm global locations
    local search_paths=(
        "$HOME/.npm-global/lib/node_modules/agentvibes"
        "/usr/local/lib/node_modules/agentvibes"
        "/data/data/com.termux/files/usr/lib/node_modules/agentvibes"  # Android Termux
        "$HOME/.nvm/versions/node/*/lib/node_modules/agentvibes"
    )
    
    for path in "${search_paths[@]}"; do
        # Expand glob
        local expanded=($path)
        if [[ -d "${expanded[0]}" ]]; then
            echo "${expanded[0]}"
            return 0
        fi
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
    echo "❌ play-tts.sh not found at $PLAY_TTS" >&2
    exit 1
fi

# Log for debugging (optional, comment out in production)
if [[ "${AGENTVIBES_DEBUG:-0}" == "1" ]]; then
    echo "[DEBUG] AgentVibes root: $AGENTVIBES_ROOT" >&2
    echo "[DEBUG] Voice: $VOICE" >&2
    echo "[DEBUG] Text length: ${#TEXT}" >&2
fi

# Generate and play with full AgentVibes features
echo "🎵 Playing via AgentVibes: ${TEXT:0:50}..." >&2
bash "$PLAY_TTS" "$TEXT" "$VOICE"

exit 0
