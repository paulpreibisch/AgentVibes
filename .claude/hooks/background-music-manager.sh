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
#   background-music-manager.sh list     - List all pre-packaged background music
#   background-music-manager.sh set-default TRACK - Set default background music
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
DEFAULT_VOLUME="0.34"

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

# @function list_tracks
# @intent List all pre-packaged background music files
list_tracks() {
    local bg_dir="$SCRIPT_DIR/../audio/tracks"

    if [[ ! -d "$bg_dir" ]]; then
        echo "❌ No tracks folder found at $bg_dir"
        return 1
    fi

    echo "🎵 Available Background Music Tracks"
    echo "===================================="
    echo ""

    local count=0
    while IFS= read -r -d '' file; do
        local basename
        basename=$(basename "$file")
        count=$((count + 1))
        printf "%2d. %s\n" "$count" "$basename"
    done < <(find "$bg_dir" -type f \( -name "*.mp3" -o -name "*.wav" -o -name "*.ogg" \) -print0 2>/dev/null | sort -z)

    if [[ $count -eq 0 ]]; then
        echo "No audio files found in tracks folder"
    else
        echo ""
        echo "Total: $count track(s)"
    fi
}

# @function get_default_track
# @intent Get the current default background music track
get_default_track() {
    local audio_effects_cfg="$SCRIPT_DIR/../config/audio-effects.cfg"

    if [[ ! -f "$audio_effects_cfg" ]]; then
        echo ""
        return
    fi

    # Extract the background file from the default entry
    grep "^default|" "$audio_effects_cfg" 2>/dev/null | cut -d'|' -f3 || echo ""
}

# @function set_default_track
# @intent Set the default background music track
# @param $1 Track filename
set_default_track() {
    local track="$1"
    local audio_effects_cfg="$SCRIPT_DIR/../config/audio-effects.cfg"
    local bg_dir="$SCRIPT_DIR/../audio/tracks"

    if [[ -z "$track" ]]; then
        echo "❌ Error: No track name provided"
        echo "Usage: $0 set-default TRACK_NAME"
        return 1
    fi

    # Check if track exists
    if [[ ! -f "$bg_dir/$track" ]]; then
        echo "❌ Error: Track '$track' not found in tracks folder"
        echo "Run '$0 list' to see available tracks"
        return 1
    fi

    # Check if audio-effects.cfg exists
    if [[ ! -f "$audio_effects_cfg" ]]; then
        echo "❌ Error: audio-effects.cfg not found at $audio_effects_cfg"
        return 1
    fi

    # Update the default entry in audio-effects.cfg
    # Preserve the sox effects and volume, just update the background file
    local temp_file
    temp_file=$(mktemp)

    if grep -q "^default|" "$audio_effects_cfg"; then
        # Replace existing default entry - preserve effects and volume
        awk -F'|' -v track="$track" '
            /^default\|/ {
                print $1 "|" $2 "|" track "|" $4
                next
            }
            { print }
        ' "$audio_effects_cfg" > "$temp_file"

        mv "$temp_file" "$audio_effects_cfg"

        # Auto-enable background music if it was disabled
        if ! is_enabled; then
            set_enabled "true"
            echo "✅ Default background music set to: $track"
            echo "🎵 Background music enabled automatically"
        else
            echo "✅ Default background music set to: $track"
        fi
    else
        echo "❌ Error: No default entry found in audio-effects.cfg"
        return 1
    fi
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

    # Show default track
    local default_track
    default_track=$(get_default_track)
    if [[ -n "$default_track" ]]; then
        echo "Default Track: $default_track"
    else
        echo "Default Track: (none)"
    fi

    # Check for background files
    local bg_dir="$SCRIPT_DIR/../audio/tracks"
    if [[ -d "$bg_dir" ]]; then
        local count
        count=$(find "$bg_dir" -type f \( -name "*.mp3" -o -name "*.wav" -o -name "*.ogg" \) 2>/dev/null | wc -l)
        echo "Tracks: $count audio file(s) in tracks folder"
    else
        echo "Tracks: No tracks folder found"
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

# Set background music for a specific agent
set_agent_track() {
    local agent="$1"
    local track="$2"
    local config_file="$SCRIPT_DIR/../config/audio-effects.cfg"

    if [[ -z "$agent" ]] || [[ -z "$track" ]]; then
        echo "❌ Error: Agent name and track required"
        echo "Usage: $0 set-agent AGENT_NAME TRACK_NAME"
        exit 1
    fi

    # Verify track exists
    local bg_dir="$SCRIPT_DIR/../audio/tracks"
    if [[ ! -f "$bg_dir/$track" ]]; then
        echo "❌ Error: Track not found: $track"
        echo "Run '$0 list' to see available tracks"
        exit 1
    fi

    # Update or add agent config line
    if grep -q "^${agent}|" "$config_file" 2>/dev/null; then
        # Agent exists - update track (preserve effects and volume)
        local temp_file
        temp_file=$(mktemp)
        awk -F'|' -v agent="$agent" -v track="$track" '
            $1 == agent {
                print $1 "|" $2 "|" track "|" $4
                next
            }
            { print }
        ' "$config_file" > "$temp_file"
        mv "$temp_file" "$config_file"
        echo "✅ Updated background music for $agent: $track"
    else
        # Agent doesn't exist - add new line with track
        echo "${agent}||${track}|0.30" >> "$config_file"
        echo "✅ Added background music for $agent: $track"
    fi

    # Auto-enable background music if it was disabled
    if ! is_enabled; then
        set_enabled "true"
        echo "🎵 Background music enabled automatically"
    fi
}

# Set background music for all agents
set_all_agents_track() {
    local track="$1"
    local config_file="$SCRIPT_DIR/../config/audio-effects.cfg"

    if [[ -z "$track" ]]; then
        echo "❌ Error: Track name required"
        echo "Usage: $0 set-all TRACK_NAME"
        exit 1
    fi

    # Verify track exists
    local bg_dir="$SCRIPT_DIR/../audio/tracks"
    if [[ ! -f "$bg_dir/$track" ]]; then
        echo "❌ Error: Track not found: $track"
        echo "Run '$0 list' to see available tracks"
        exit 1
    fi

    # Update all non-comment, non-empty, non-default lines
    local temp_file
    temp_file=$(mktemp)
    local count=0

    awk -F'|' -v track="$track" '
        # Skip comments and empty lines
        /^#/ || /^[[:space:]]*$/ { print; next }

        # Skip only _party_mode (but UPDATE default!)
        $1 == "_party_mode" { print; next }

        # Update all agent lines including default
        {
            print $1 "|" $2 "|" track "|" $4
        }
    ' "$config_file" > "$temp_file"

    # Count updated agents (including default)
    count=$(grep -v '^#' "$config_file" | grep -v '^[[:space:]]*$' | grep -v '^_party_mode|' | wc -l)

    mv "$temp_file" "$config_file"
    echo "✅ Updated background music for $count agents: $track"

    # Auto-enable background music if it was disabled
    if ! is_enabled; then
        set_enabled "true"
        echo "🎵 Background music enabled automatically"
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
    list)
        list_tracks
        ;;
    set-default)
        if [[ -z "${2:-}" ]]; then
            echo "❌ Error: No track name provided"
            echo "Usage: $0 set-default TRACK_NAME"
            echo "Run '$0 list' to see available tracks"
            exit 1
        fi
        set_default_track "$2"
        ;;
    set-agent)
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
            echo "❌ Error: Agent name and track required"
            echo "Usage: $0 set-agent AGENT_NAME TRACK_NAME"
            echo "Run '$0 list' to see available tracks"
            exit 1
        fi
        set_agent_track "$2" "$3"
        ;;
    set-all)
        if [[ -z "${2:-}" ]]; then
            echo "❌ Error: Track name required"
            echo "Usage: $0 set-all TRACK_NAME"
            echo "Run '$0 list' to see available tracks"
            exit 1
        fi
        set_all_agents_track "$2"
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
        echo "Usage: $0 {status|on|off|volume [X]|list|set-default TRACK|set-agent AGENT TRACK|set-all TRACK|get-enabled|get-volume}"
        exit 1
        ;;
esac
