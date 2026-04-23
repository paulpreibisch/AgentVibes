#!/usr/bin/env bash
#
# File: .claude/hooks/audio-processor.sh
#
# AgentVibes - Audio Effects and Background Mixing Processor
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# ---
#
# @fileoverview Audio post-processor for TTS with effects and background mixing
# @context Applies sox effects and mixes background audio for enhanced TTS experience
# @architecture Post-processing hook called after TTS generation, before playback
# @dependencies sox, ffmpeg
# @entrypoints Called by play-tts-piper.sh after audio generation
# @patterns Pipeline pattern: input.wav → effects → mix → output.wav
#

set -euo pipefail

# Fix locale warnings
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Input parameters
INPUT_FILE="${1:-}"
AGENT_NAME="${2:-default}"
OUTPUT_FILE="${3:-}"
AGENT_PROFILE_FILE="${4:-}"  # Optional: path to per-agent profile JSON (from bmad-speak.sh)

# Config and directories (resolve to absolute paths)
CONFIG_FILE="$(cd "$SCRIPT_DIR/.." && pwd)/config/audio-effects.cfg"
BACKGROUNDS_DIR="$(cd "$SCRIPT_DIR/../audio" && pwd)/tracks"
ENABLED_FILE="$(cd "$SCRIPT_DIR/.." && pwd)/config/background-music-enabled.txt"
GLOBAL_ENABLED_FILE="$HOME/.claude/config/background-music-enabled.txt"

# Check if background music is enabled (project-local, then global fallback)
is_background_music_enabled() {
    local enabled=""
    if [[ -f "$ENABLED_FILE" ]]; then
        enabled=$(cat "$ENABLED_FILE" 2>/dev/null | tr -d '[:space:]')
    elif [[ -f "$GLOBAL_ENABLED_FILE" ]]; then
        enabled=$(cat "$GLOBAL_ENABLED_FILE" 2>/dev/null | tr -d '[:space:]')
    else
        return 1  # Disabled by default
    fi

    # Return 0 (true) if enabled, 1 (false) otherwise
    [[ "$enabled" == "true" ]]
}

# Validate inputs
if [[ -z "$INPUT_FILE" ]] || [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: Input file required and must exist" >&2
    echo "Usage: $0 <input.wav> [agent_name] [output.wav]" >&2
    exit 1
fi

# Default output to input location with -processed suffix
if [[ -z "$OUTPUT_FILE" ]]; then
    OUTPUT_FILE="${INPUT_FILE%.wav}-processed.wav"
fi

# Check for required tools
if ! command -v sox &> /dev/null; then
    echo "Warning: sox not installed, skipping effects" >&2
    cp "$INPUT_FILE" "$OUTPUT_FILE"
    echo "$OUTPUT_FILE"
    exit 0
fi

# @function get_agent_config
# @intent Parse audio-effects.cfg for agent-specific settings
# @param $1 Agent name
# @returns Pipe-separated config line or default
get_agent_config() {
    local agent="$1"

    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo "default|gain -8||0.0"
        return
    fi

    # Try exact match first (use awk for safe literal matching)
    local config
    config=$(awk -F'|' -v agent="$agent" 'tolower($1) == tolower(agent)' "$CONFIG_FILE" 2>/dev/null | head -1)

    # Fall back to default
    if [[ -z "$config" ]]; then
        config=$(grep "^default|" "$CONFIG_FILE" 2>/dev/null | head -1)
    fi

    # Return config or empty default
    if [[ -n "$config" ]]; then
        echo "$config"
    else
        echo "default|gain -8||0.0"
    fi
}

# @function apply_sox_effects
# @intent Apply sox effect chain to audio file
# @param $1 Input file
# @param $2 Output file
# @param $3 Sox effects string
apply_sox_effects() {
    local input="$1"
    local output="$2"
    local effects="$3"

    if [[ -z "$effects" ]]; then
        cp "$input" "$output"
        return 0
    fi

    # Validate effects contain only allowed sox effect names and numeric params
    local allowed_effects="gain|reverb|echo|chorus|flanger|phaser|tremolo|overdrive|bass|treble|equalizer|highpass|lowpass|bandpass|vol|speed|tempo|pitch|rate|pad|silence|trim|fade|norm|loudness|compand|contrast|delay|repeat|stat|remix"
    for word in $effects; do
      if ! [[ "$word" =~ ^-?[0-9]*\.?[0-9]+$ ]] && ! echo "$word" | grep -qiE "^($allowed_effects)$"; then
        echo "Warning: Invalid sox effect '$word', skipping effects" >&2
        cp "$input" "$output"
        return 0
      fi
    done

    # Apply effects - note: effects string is intentionally unquoted to allow word splitting
    # shellcheck disable=SC2086
    sox "$input" "$output" $effects 2>/dev/null || {
        echo "Warning: Sox effects failed, using original" >&2
        cp "$input" "$output"
    }
}

# Position tracking file for continuous playback
POSITION_FILE="$SCRIPT_DIR/../config/background-music-position.txt"
# Lock file for position file — prevents race conditions in party mode with concurrent agents
POSITION_LOCK="/tmp/agentvibes-bgpos-$(id -u).lock"

# @function get_custom_music_path
# @intent Story 4.7: Check for custom music uploaded by user
# @returns Path to custom music file if exists, empty string otherwise
# @context Custom music stored at .claude/audio/custom-music/tracks/
get_custom_music_path() {
    local custom_music_dir="$SCRIPT_DIR/../audio/custom-music/tracks"

    # Check if custom music directory exists
    if [[ ! -d "$custom_music_dir" ]]; then
        echo ""
        return
    fi

    # Look for any audio file in custom music directory
    # Files uploaded through Stories 4.1-4.6 are stored here
    # SECURITY: Use -maxdepth 1 to prevent directory traversal
    # DETERMINISTIC: Sort by modification time (newest first) for consistent behavior
    local custom_file
    custom_file=$(find "$custom_music_dir" -maxdepth 1 -type f \( -name "*.mp3" -o -name "*.wav" -o -name "*.ogg" -o -name "*.m4a" \) -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

    if [[ -n "$custom_file" ]] && [[ -f "$custom_file" ]]; then
        # SECURITY: Verify file ownership matches current user
        local file_uid
        file_uid=$(stat -c '%u' "$custom_file" 2>/dev/null || stat -f '%u' "$custom_file" 2>/dev/null)
        local current_uid
        current_uid=$(id -u)

        if [[ "$file_uid" == "$current_uid" ]]; then
            echo "$custom_file"
            return
        fi
    fi

    echo ""
}

# @function get_background_position
# @intent Get saved position for a background track (caller must hold POSITION_LOCK)
# @param $1 Background file path
# @returns Position in seconds (or 0 if not found)
get_background_position() {
    local bg_file="$1"
    local bg_name
    bg_name=$(basename "$bg_file")

    if [[ -f "$POSITION_FILE" ]]; then
        awk -F: -v name="$bg_name" '$1 == name {print $2}' "$POSITION_FILE" 2>/dev/null | tr -d '[:space:]' | tail -1
    else
        echo "0"
    fi
}

# @function save_background_position
# @intent Save position for a background track (caller must hold POSITION_LOCK)
# @param $1 Background file path
# @param $2 New position in seconds
save_background_position() {
    local bg_file="$1"
    local position="$2"
    local bg_name
    bg_name=$(basename "$bg_file")

    mkdir -p "$(dirname "$POSITION_FILE")"

    # Remove old entry and add new one (atomic update via temp file + mv)
    local tmp_pos
    tmp_pos=$(mktemp "${POSITION_FILE}.XXXXXX")
    if [[ -f "$POSITION_FILE" ]]; then
        # SECURITY: Use grep -F for fixed string matching (#134)
        grep -vF "${bg_name}:" "$POSITION_FILE" > "$tmp_pos" 2>/dev/null || true
    fi
    echo "${bg_name}:${position}" >> "$tmp_pos"
    mv "$tmp_pos" "$POSITION_FILE"
}

# @function mix_background
# @intent Mix background audio with voice at specified volume, continuing from last position
# @param $1 Voice file (foreground)
# @param $2 Background file
# @param $3 Background volume (0.0-1.0)
# @param $4 Output file
mix_background() {
    local voice="$1"
    local background="$2"
    local volume="$3"
    local output="$4"

    if [[ -z "$background" ]] || [[ ! -f "$background" ]]; then
        cp "$voice" "$output"
        return 0
    fi

    if ! command -v ffmpeg &> /dev/null; then
        echo "Warning: ffmpeg not installed, skipping background mix" >&2
        cp "$voice" "$output"
        return 0
    fi

    # Get voice duration
    local duration
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$voice" 2>/dev/null)

    if [[ -z "$duration" ]]; then
        cp "$voice" "$output"
        return 0
    fi

    # Get background track duration
    local bg_duration
    bg_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$background" 2>/dev/null)
    bg_duration=${bg_duration:-0}

    # Read the start position and pre-compute the new position atomically under flock.
    # This prevents party-mode race conditions where concurrent agents both read the
    # same position, compute independently, and overwrite each other's updates.
    local start_pos
    local new_pos
    local total_duration
    {
        flock -x 200

        # Get saved position for this track (continuous playback)
        start_pos=$(get_background_position "$background")

        # Validate start_pos: if too small (floating point error) or invalid, reset to 0
        if command -v bc &> /dev/null; then
            if ! [[ "$start_pos" =~ ^[0-9]+\.?[0-9]*$ ]] || (( $(echo "$start_pos < 0.001" | bc -l) )); then
                start_pos="0"
            fi
        else
            # Without bc, just check if it's a valid number
            if ! [[ "$start_pos" =~ ^[0-9]+\.?[0-9]*$ ]]; then
                start_pos="0"
            fi
        fi

        # If position exceeds track length, wrap around
        if command -v bc &> /dev/null && [[ -n "$bg_duration" ]]; then
            if (( $(echo "$start_pos >= $bg_duration" | bc -l) )); then
                start_pos=$(echo "$start_pos % $bg_duration" | bc -l)
            fi
        fi

        # Extend total duration by 2 seconds for background music fade out
        if command -v bc &> /dev/null; then
            total_duration=$(echo "$duration + 2" | bc -l)
        else
            total_duration=$(awk "BEGIN {print $duration + 2}")
        fi

        # Calculate new position after this clip (including fade out time)
        if command -v bc &> /dev/null; then
            new_pos=$(echo "$start_pos + $total_duration" | bc -l)
            # Wrap around if needed
            if [[ -n "$bg_duration" ]] && (( $(echo "$new_pos >= $bg_duration" | bc -l) )); then
                new_pos=$(echo "$new_pos % $bg_duration" | bc -l)
            fi
        else
            new_pos="0"
        fi

        # Claim the new position immediately so concurrent agents advance past it
        save_background_position "$background" "$new_pos"
    } 200>"$POSITION_LOCK"

    # Mix: Seek to position in background, apply volume and fades
    # Background fades in at start (0.3s), continues under speech, then fades out over 2s after speech ends
    # -ss before -i seeks efficiently without decoding
    local bg_fade_out_start
    if command -v bc &> /dev/null; then
        bg_fade_out_start=$(echo "$duration" | bc -l)
    else
        bg_fade_out_start="$duration"
    fi

    # Auto-detect remote sessions (SSH/RDP) and enable compression
    if [[ -z "${AGENTVIBES_RDP_MODE:-}" ]]; then
        if [[ -n "${SSH_CLIENT:-}" ]] || [[ -n "${SSH_TTY:-}" ]] || [[ "${DISPLAY:-}" =~ ^localhost:.* ]]; then
            export AGENTVIBES_RDP_MODE=true
        fi
    fi

    # RDP-optimized audio settings: mono 22kHz for lower bandwidth
    # Automatically enabled for remote desktop/SSH environments
    local audio_settings=""
    if [[ "${AGENTVIBES_RDP_MODE:-false}" == "true" ]]; then
        audio_settings="-ac 1 -ar 22050 -b:a 64k"
    fi

    # Add 2 seconds of background music intro before voice starts
    # Background: fades in (0.3s), plays solo (2s), then voice joins, fades out at end (2s)
    # Voice: delayed by 2000ms (2s), no fade-in (full volume from first word)
    local voice_delay_ms="2000"  # adelay takes milliseconds
    local voice_delay_sec="2.0"
    local bg_fade_out_adjusted
    if command -v bc &> /dev/null; then
        bg_fade_out_adjusted=$(echo "$duration + $voice_delay_sec" | bc -l)
    else
        bg_fade_out_adjusted=$(echo "$duration + 2" | bc)
    fi

    ffmpeg -y -i "$voice" -ss "$start_pos" -stream_loop -1 -i "$background" \
        -filter_complex "[1:a]volume=${volume},afade=t=in:st=0:d=0.3,afade=t=out:st=${bg_fade_out_adjusted}:d=2[bg];[0:a]adelay=${voice_delay_ms}|${voice_delay_ms},volume=1.5[v];[v][bg]amix=inputs=2:duration=longest:normalize=0[out]" \
        -map "[out]" $audio_settings -t "$total_duration" "$output" 2>/dev/null || {
        echo "Warning: Background mixing failed, using voice only" >&2
        cp "$voice" "$output"
        return
    }
}

# Main processing
main() {
    echo "🎛️ Processing audio for agent: $AGENT_NAME" >&2

    # Get agent config
    local config
    config=$(get_agent_config "$AGENT_NAME")

    # Parse config (format: NAME|EFFECTS|BACKGROUND|VOLUME)
    IFS='|' read -r _ sox_effects background_file bg_volume <<< "$config"

    # Per-agent background music override from bmad-speak.sh profile JSON (takes priority over cfg).
    # The profile file is a PID-scoped temp file written by bmad-speak.sh; no env var leakage.
    if [[ -n "$AGENT_PROFILE_FILE" ]] && [[ -f "$AGENT_PROFILE_FILE" ]]; then
        # SECURITY: Pass profile path via env var to avoid shell injection in node -e string
        local _prof_track _prof_vol _prof_enabled
        _prof_track=$(_AV_PROF="$AGENT_PROFILE_FILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._AV_PROF,'utf8'));process.stdout.write(p.backgroundMusic?.track??'')}catch{process.stdout.write('')}" 2>/dev/null || true)
        _prof_vol=$(_AV_PROF="$AGENT_PROFILE_FILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._AV_PROF,'utf8'));process.stdout.write(String(p.backgroundMusic?.volume??''))}catch{process.stdout.write('')}" 2>/dev/null || true)
        _prof_enabled=$(_AV_PROF="$AGENT_PROFILE_FILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._AV_PROF,'utf8'));process.stdout.write(String(p.backgroundMusic?.enabled??''))}catch{process.stdout.write('')}" 2>/dev/null || true)
        if [[ "$_prof_enabled" == "true" ]] && [[ -n "$_prof_track" ]]; then
            background_file="$_prof_track"
            # Convert percentage volume (0-100) to decimal (0.0-1.0) for ffmpeg
            if [[ "$_prof_vol" =~ ^[0-9]+$ ]]; then
                bg_volume=$(awk "BEGIN{printf \"%.2f\", ${_prof_vol}/100}")
            else
                bg_volume="0.20"
            fi
        fi
    fi

    # SECURITY: Use secure temp directory per CLAUDE.md guidelines
    # Prefer XDG_RUNTIME_DIR (user-owned, restricted permissions)
    # Fall back to user-specific directory in /tmp
    local TEMP_DIR
    if [[ -d "/data/data/com.termux" ]]; then
        # On Termux - use Termux temp
        TEMP_DIR="${TMPDIR:-${PREFIX:-/data/data/com.termux/files/usr}/tmp}/agentvibes-audio-$$"
    elif [[ -n "${XDG_RUNTIME_DIR:-}" ]] && [[ -d "$XDG_RUNTIME_DIR" ]]; then
        # Preferred: XDG_RUNTIME_DIR (user-owned, 700 permissions)
        TEMP_DIR="$XDG_RUNTIME_DIR/agentvibes-audio"
    else
        # Fallback: user-specific directory in /tmp
        TEMP_DIR="/tmp/agentvibes-audio-${USER:-$(id -un)}"
    fi

    # Create temp directory with restrictive permissions
    mkdir -p "$TEMP_DIR"
    chmod 700 "$TEMP_DIR"

    # SECURITY: Verify ownership of temp directory
    if [[ "$(stat -c '%u' "$TEMP_DIR" 2>/dev/null || stat -f '%u' "$TEMP_DIR" 2>/dev/null)" != "$(id -u)" ]]; then
        echo "Error: Temp directory not owned by current user: $TEMP_DIR" >&2
        exit 1
    fi

    # SECURITY: Use mktemp for unpredictable filenames
    local temp_effects
    local temp_final
    temp_effects=$(mktemp "$TEMP_DIR/effects-XXXXXX.wav")
    temp_final=$(mktemp "$TEMP_DIR/final-XXXXXX.wav")

    # Clean up on exit - use double quotes to capture paths at definition time
    # (local variables won't exist at trap execution time outside function scope)
    trap "rm -f '$temp_effects' '$temp_final'" EXIT

    # Step 1: Apply sox effects
    if [[ -n "$sox_effects" ]]; then
        echo "  → Applying effects: $sox_effects" >&2
        apply_sox_effects "$INPUT_FILE" "$temp_effects" "$sox_effects"
    else
        cp "$INPUT_FILE" "$temp_effects"
    fi

    # Step 2: Mix background if configured AND enabled
    # Story 4.7: Check for custom music first, then fallback to default
    local background_path=""
    local custom_music_path
    custom_music_path=$(get_custom_music_path)

    if [[ -n "$custom_music_path" ]]; then
        # Story 4.7: Custom music uploaded by user takes priority
        background_path="$custom_music_path"
        echo "  → Using custom background music" >&2
    elif [[ -n "$background_file" ]]; then
        # Fall back to default background music from audio-effects.cfg
        background_path="$BACKGROUNDS_DIR/$background_file"
    fi

    # Per-agent profile enables music independently of the global flag.
    local _bg_allowed=false
    if is_background_music_enabled; then
        _bg_allowed=true
    elif [[ -n "$AGENT_PROFILE_FILE" ]] && [[ -f "$AGENT_PROFILE_FILE" ]]; then
        # A valid agent profile with enabled=true overrides the global off switch.
        local _check_enabled
        _check_enabled=$(_AV_PROF="$AGENT_PROFILE_FILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._AV_PROF,'utf8'));process.stdout.write(String(p.backgroundMusic?.enabled??''))}catch{process.stdout.write('')}" 2>/dev/null || true)
        [[ "$_check_enabled" == "true" ]] && _bg_allowed=true
    fi

    local used_background=""
    if is_background_music_enabled && [[ -n "$background_path" ]] && [[ -f "$background_path" ]] && [[ "${bg_volume:-0}" != "0" ]] && [[ "${bg_volume:-0}" != "0.0" ]]; then
        local bg_display_name
        if [[ "$background_path" == "$custom_music_path" ]]; then
            bg_display_name="custom music"
        else
            bg_display_name="$background_file"
        fi
        echo "  → Mixing background: $bg_display_name at ${bg_volume} volume" >&2
        mix_background "$temp_effects" "$background_path" "$bg_volume" "$temp_final"
        used_background="$background_path"  # Return full path instead of just filename
    else
        cp "$temp_effects" "$temp_final"
    fi

    # Move to final output
    mv "$temp_final" "$OUTPUT_FILE"

    # Return the output file path (stdout for caller to capture)
    # Format: OUTPUT_FILE|BACKGROUND_FILE_PATH (background is empty if not used)
    echo "$OUTPUT_FILE|$used_background"
}

main
