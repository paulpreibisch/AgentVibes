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

# Handle -- argument separator (skip it if present)
if [[ "${1:-}" == "--" ]]; then
    shift
fi

TEXT="${1:-}"
VOICE="${2:-en_US-ryan-high}"
MUSIC="${3:-}"
REVERB="${4:-}"

if [[ -z "$TEXT" ]]; then
    echo "❌ No text provided" >&2
    echo "Usage: $0 [--] <text> [voice] [music] [reverb]" >&2
    exit 1
fi

# SECURITY: If text is base64-encoded (from secure sender), decode it
# Base64 text won't contain spaces or special chars, so we detect it heuristically
if [[ "$TEXT" =~ ^[A-Za-z0-9+/]+=*$ ]] && [[ ${#TEXT} -gt 20 ]]; then
    DECODED=$(printf '%s' "$TEXT" | base64 -d 2>/dev/null) || DECODED=""
    if [[ -n "$DECODED" ]]; then
        TEXT="$DECODED"
    fi
fi

# SECURITY: Validate voice format (alphanumeric, hyphens, underscores only)
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "❌ Invalid voice format: $VOICE" >&2
    exit 1
fi

# Suppress GitHub star reminders (receiver mode)
export AGENTVIBES_NO_REMINDERS=1

# Find AgentVibes installation
# SECURITY: Uses controlled paths only, validates existence
find_agentvibes() {
    # Try command lookup first
    if command -v agentvibes >/dev/null 2>&1; then
        local bin_path
        bin_path=$(which agentvibes)
        # Resolve if it's a symlink
        if [[ -L "$bin_path" ]]; then
            bin_path=$(readlink -f "$bin_path" 2>/dev/null || realpath "$bin_path" 2>/dev/null || echo "$bin_path")
        fi
        # SECURITY: Properly quote nested command substitutions
        local lib_path
        lib_path="$(dirname "$(dirname "$bin_path")")/lib/node_modules/agentvibes"
        if [[ -d "$lib_path" ]]; then
            echo "$lib_path"
            return 0
        fi
    fi

    # Check common npm global locations (controlled paths only)
    local search_paths=(
        "$HOME/.npm-global/lib/node_modules/agentvibes"
        "/usr/local/lib/node_modules/agentvibes"
        "/data/data/com.termux/files/usr/lib/node_modules/agentvibes"  # Android Termux
    )

    # Handle nvm paths separately to avoid glob issues
    if [[ -d "$HOME/.nvm/versions/node" ]]; then
        local nvm_path
        # SECURITY: Use find instead of unsafe glob expansion
        nvm_path=$(find "$HOME/.nvm/versions/node" -maxdepth 3 -type d -name "agentvibes" -path "*/lib/node_modules/*" 2>/dev/null | head -1)
        if [[ -n "$nvm_path" ]] && [[ -d "$nvm_path" ]]; then
            echo "$nvm_path"
            return 0
        fi
    fi

    for path in "${search_paths[@]}"; do
        if [[ -d "$path" ]]; then
            echo "$path"
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

# Configure audio effects and background music if provided
# CRITICAL: Write to AGENTVIBES package config, not HOME config
# The audio-processor reads from package config, not ~/.claude/config
if [[ -n "$MUSIC" ]] || [[ -n "$REVERB" ]]; then
    CONFIG_DIR="$AGENTVIBES_ROOT/.claude/config"
    mkdir -p "$CONFIG_DIR"
    
    # Enable background music
    echo "true" > "$CONFIG_DIR/background-music-enabled.txt"
    
    # Clear position cache for fresh start
    rm -f "$CONFIG_DIR/background-music-position.txt"
    
    # Set background music track if provided
    if [[ -n "$MUSIC" ]]; then
        echo "$MUSIC" > "$CONFIG_DIR/background-music.txt"
    fi
    
    # Set audio effects config (default agent name is always "default")
    if [[ -n "$MUSIC" ]] && [[ -n "$REVERB" ]]; then
        echo "default|${REVERB}|${MUSIC}|0.10" > "$CONFIG_DIR/audio-effects.cfg"
    elif [[ -n "$REVERB" ]]; then
        echo "default|${REVERB}||0.0" > "$CONFIG_DIR/audio-effects.cfg"
    elif [[ -n "$MUSIC" ]]; then
        echo "default||${MUSIC}|0.10" > "$CONFIG_DIR/audio-effects.cfg"
    fi
fi

# Log for debugging (optional, comment out in production)
if [[ "${AGENTVIBES_DEBUG:-0}" == "1" ]]; then
    echo "[DEBUG] AgentVibes root: $AGENTVIBES_ROOT" >&2
    echo "[DEBUG] Voice: $VOICE" >&2
    echo "[DEBUG] Music: ${MUSIC:-none}" >&2
    echo "[DEBUG] Reverb: ${REVERB:-none}" >&2
    echo "[DEBUG] Text length: ${#TEXT}" >&2
fi

# Generate and play with full AgentVibes features
echo "🎵 Playing via AgentVibes: ${TEXT:0:50}..." >&2
bash "$PLAY_TTS" "$TEXT" "$VOICE"

exit 0
