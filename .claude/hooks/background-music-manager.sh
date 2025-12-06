#!/usr/bin/env bash
#
# File: .claude/hooks/background-music-manager.sh
#
# AgentVibes - Background Music Manager
# Manages background music settings for TTS
#
# Usage:
#   background-music-manager.sh status   - Show current status
#   background-music-manager.sh on       - Enable background music
#   background-music-manager.sh off      - Disable background music
#   background-music-manager.sh volume X - Set volume (0.0-1.0)
#   background-music-manager.sh get-enabled - Returns "true" or "false"
#   background-music-manager.sh get-volume  - Returns current volume
#

set -euo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Config file location
CONFIG_DIR="$SCRIPT_DIR/../config"
ENABLED_FILE="$CONFIG_DIR/background-music-enabled.txt"
VOLUME_FILE="$CONFIG_DIR/background-music-volume.txt"

# Defaults
DEFAULT_VOLUME="0.40"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# @function is_enabled
# @intent Check if background music is enabled
# @returns 0 if enabled, 1 if disabled
is_enabled() {
    if [[ -f "$ENABLED_FILE" ]]; then
        local status
        status=$(cat "$ENABLED_FILE" 2>/dev/null | tr -d '[:space:]')
        [[ "$status" == "true" || "$status" == "on" || "$status" == "1" ]]
    else
        # Default: disabled
        return 1
    fi
}

# @function get_volume
# @intent Get current volume setting
# @returns Volume value (0.0-1.0)
get_volume() {
    if [[ -f "$VOLUME_FILE" ]]; then
        cat "$VOLUME_FILE" 2>/dev/null | tr -d '[:space:]'
    else
        echo "$DEFAULT_VOLUME"
    fi
}

# @function set_enabled
# @intent Enable or disable background music
# @param $1 "true" or "false"
set_enabled() {
    local value="$1"
    echo "$value" > "$ENABLED_FILE"
}

# @function set_volume
# @intent Set background music volume
# @param $1 Volume value (0.0-1.0)
set_volume() {
    local value="$1"

    # Validate it's a number between 0 and 1
    if ! [[ "$value" =~ ^[0-9]*\.?[0-9]+$ ]]; then
        echo "Error: Volume must be a number between 0.0 and 1.0" >&2
        return 1
    fi

    # Check range using bc
    if command -v bc &> /dev/null; then
        if (( $(echo "$value < 0" | bc -l) )) || (( $(echo "$value > 1" | bc -l) )); then
            echo "Error: Volume must be between 0.0 and 1.0" >&2
            return 1
        fi
    fi

    echo "$value" > "$VOLUME_FILE"
}

# @function show_status
# @intent Display current background music status
show_status() {
    echo "🎵 Background Music Status"
    echo "=========================="

    if is_enabled; then
        echo "Status: ✅ ENABLED"
    else
        echo "Status: 🔇 DISABLED"
    fi

    echo "Volume: $(get_volume) ($(echo "scale=0; $(get_volume) * 100 / 1" | bc -l 2>/dev/null || echo "?")%)"

    # Check for background files
    local bg_dir="$SCRIPT_DIR/../audio/backgrounds"
    if [[ -d "$bg_dir" ]]; then
        local count
        count=$(find "$bg_dir" -type f \( -name "*.mp3" -o -name "*.wav" -o -name "*.ogg" \) 2>/dev/null | wc -l)
        echo "Tracks: $count audio file(s) in backgrounds folder"
    else
        echo "Tracks: No backgrounds folder found"
    fi

    # Check dependencies
    echo ""
    echo "Dependencies:"
    if command -v sox &> /dev/null; then
        echo "  sox: ✅ installed"
    else
        echo "  sox: ❌ not installed (needed for effects)"
    fi
    if command -v ffmpeg &> /dev/null; then
        echo "  ffmpeg: ✅ installed"
    else
        echo "  ffmpeg: ❌ not installed (needed for mixing)"
    fi
}

# Main command handler
case "${1:-status}" in
    status|"")
        show_status
        ;;
    on|enable|true)
        set_enabled "true"
        echo "🎵 Background music ENABLED at $(get_volume) volume"
        ;;
    off|disable|false)
        set_enabled "false"
        echo "🔇 Background music DISABLED"
        ;;
    volume)
        if [[ -z "${2:-}" ]]; then
            echo "Current volume: $(get_volume)"
        else
            set_volume "$2"
            echo "🎵 Background music volume set to $2"
        fi
        ;;
    get-enabled)
        if is_enabled; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    get-volume)
        get_volume
        ;;
    *)
        echo "Usage: $0 {status|on|off|volume [X]|get-enabled|get-volume}"
        exit 1
        ;;
esac
