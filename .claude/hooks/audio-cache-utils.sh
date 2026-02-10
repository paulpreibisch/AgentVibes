#!/usr/bin/env bash
# AgentVibes Audio Cache Utility Functions
# Provides common functions for file counting, sizing, and cleanup operations

# Get the audio directory path with priority order
# Returns: Absolute path to audio directory
get_audio_dir() {
  local audio_dir=""

  # Priority 1: Project-local directory (if CLAUDE_PROJECT_DIR is set)
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
    audio_dir="$CLAUDE_PROJECT_DIR/.claude/audio"
  else
    # Priority 2: Walk up directory tree to find .claude
    local current_dir="$PWD"
    while [[ "$current_dir" != "/" ]]; do
      if [[ -d "$current_dir/.claude" ]]; then
        audio_dir="$current_dir/.claude/audio"
        break
      fi
      current_dir=$(dirname "$current_dir")
    done
  fi

  # Priority 3: Fallback to global ~/.claude/audio
  if [[ -z "$audio_dir" ]]; then
    audio_dir="$HOME/.claude/audio"
  fi

  echo "$audio_dir"
}

# Count TTS audio files (excludes background music tracks in tracks/ subdirectory)
# Args: $1 = audio_dir (optional, defaults to get_audio_dir)
# Returns: Integer count
count_tts_files() {
  local audio_dir="${1:-$(get_audio_dir)}"

  if [[ ! -d "$audio_dir" ]]; then
    echo "0"
    return
  fi

  # Count TTS output files only (excludes subdirectories like tracks/)
  local count=0
  count=$(find "$audio_dir" -maxdepth 1 -type f \( \
    -name "tts-*.wav" -o \
    -name "tts-*.mp3" -o \
    -name "tts-*.aiff" -o \
    -name "tts-padded-*.mp3" -o \
    -name "tts-padded-*.wav" \
  \) 2>/dev/null | wc -l)

  echo "$count"
}

# Calculate total size of TTS audio files in bytes
# Args: $1 = audio_dir (optional, defaults to get_audio_dir)
# Returns: Size in bytes (integer)
calculate_tts_size_bytes() {
  local audio_dir="${1:-$(get_audio_dir)}"

  if [[ ! -d "$audio_dir" ]]; then
    echo "0"
    return
  fi

  local total_bytes=0
  local stat_cmd=""

  # Detect stat command format (BSD vs GNU)
  if stat -c%s /dev/null >/dev/null 2>&1; then
    stat_cmd="stat -c%s"
  else
    stat_cmd="stat -f%z"
  fi

  # Sum file sizes for all TTS files
  while IFS= read -r file; do
    if [[ -f "$file" ]]; then
      local size=$($stat_cmd "$file" 2>/dev/null || echo "0")
      total_bytes=$((total_bytes + size))
    fi
  done < <(find "$audio_dir" -maxdepth 1 -type f \( \
    -name "tts-*.wav" -o \
    -name "tts-*.mp3" -o \
    -name "tts-*.aiff" -o \
    -name "tts-padded-*.mp3" -o \
    -name "tts-padded-*.wav" \
  \) 2>/dev/null)

  echo "$total_bytes"
}

# Convert bytes to human-readable format (e.g., "1.4MB", "230KB")
# Args: $1 = bytes
# Returns: Human-readable string (B, KB, MB, GB)
bytes_to_human() {
  local bytes="${1:-0}"

  if [[ ! "$bytes" =~ ^[0-9]+$ ]]; then
    bytes="0"
  fi

  if [[ $bytes -lt 1024 ]]; then
    echo "${bytes}B"
  elif [[ $bytes -lt 1048576 ]]; then
    awk "BEGIN {printf \"%.1fKB\", $bytes/1024}"
  elif [[ $bytes -lt 1073741824 ]]; then
    awk "BEGIN {printf \"%.1fMB\", $bytes/1048576}"
  else
    awk "BEGIN {printf \"%.1fGB\", $bytes/1073741824}"
  fi
}

# Get auto-cleanup threshold (number of files before cleanup triggers)
# Returns: Integer threshold (default: 50)
get_auto_clean_threshold() {
  local threshold_file=""
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # Priority order for config file
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]] && [[ -f "$CLAUDE_PROJECT_DIR/.claude/tts-auto-clean-threshold.txt" ]]; then
    threshold_file="$CLAUDE_PROJECT_DIR/.claude/tts-auto-clean-threshold.txt"
  elif [[ -f "$script_dir/../tts-auto-clean-threshold.txt" ]]; then
    threshold_file="$script_dir/../tts-auto-clean-threshold.txt"
  elif [[ -f "$HOME/.claude/tts-auto-clean-threshold.txt" ]]; then
    threshold_file="$HOME/.claude/tts-auto-clean-threshold.txt"
  fi

  if [[ -n "$threshold_file" ]]; then
    local threshold=$(grep -v '^\s*#' "$threshold_file" 2>/dev/null | grep -v '^\s*$' | head -1)
    if [[ "$threshold" =~ ^[0-9]+$ ]]; then
      echo "$threshold"
      return
    fi
  fi

  # Default threshold
  echo "50"
}

# Delete oldest TTS files to stay under size threshold (in MB)
# Args: $1 = audio_dir, $2 = threshold (size in MB)
# Returns: Number of files deleted
auto_clean_old_files() {
  local audio_dir="${1:-$(get_audio_dir)}"
  local threshold_mb="${2:-15}"
  local threshold_bytes=$((threshold_mb * 1048576))

  if [[ ! -d "$audio_dir" ]]; then
    echo "0"
    return
  fi

  local current_size=$(calculate_tts_size_bytes "$audio_dir")

  if [[ $current_size -le $threshold_bytes ]]; then
    echo "0"
    return
  fi

  # SAFETY CHECK: Skip cleanup if any TTS files have active write locks
  # Check for .lock files that indicate in-progress TTS generation
  local lock_count=$(find "$audio_dir" -maxdepth 1 -name "tts-*.lock" -type f 2>/dev/null | wc -l)
  if [[ $lock_count -gt 0 ]]; then
    # Active TTS generation in progress, skip cleanup to avoid race condition
    return 0
  fi

  local files_deleted=0
  local current_size_bytes=$current_size

  # Delete oldest files until under threshold
  # IMPORTANT: Only delete auto-generated TTS files, NOT project assets like welcome-multivoice-final.wav
  while [[ $current_size_bytes -gt $threshold_bytes ]]; do
    # Find the oldest file (only tts-processed-* and tts-padded-* files, not other project assets)
    local oldest_file=$(find "$audio_dir" -maxdepth 1 -type f \( \
      -name "tts-processed-*.wav" -o \
      -name "tts-processed-*.mp3" -o \
      -name "tts-padded-*.mp3" -o \
      -name "tts-padded-*.wav" \
    \) -printf '%T+ %p\n' 2>/dev/null | sort | head -1 | cut -d' ' -f2-)

    if [[ -z "$oldest_file" ]]; then
      break
    fi

    # Get file size and delete it
    local file_size=$(stat -c%s "$oldest_file" 2>/dev/null || stat -f%z "$oldest_file" 2>/dev/null || echo "0")
    rm -f "$oldest_file" 2>/dev/null || true
    current_size_bytes=$((current_size_bytes - file_size))
    files_deleted=$((files_deleted + 1))
  done

  echo "$files_deleted"
}

# Clean all TTS audio files and report stats
# Args: $1 = audio_dir (optional, defaults to get_audio_dir)
# Returns: Formatted output with cleanup stats
clean_all_tts_files() {
  local audio_dir="${1:-$(get_audio_dir)}"

  # Color codes
  local RED='\033[0;31m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local BLUE='\033[0;34m'
  local NC='\033[0m' # No Color

  # Get stats before cleanup
  local count_before=$(count_tts_files "$audio_dir")
  local size_before=$(calculate_tts_size_bytes "$audio_dir")
  local human_before=$(bytes_to_human "$size_before")

  if [[ $count_before -eq 0 ]]; then
    echo -e "${GREEN}✅ Cache is already clean! No TTS files found.${NC}"
    return
  fi

  # Delete auto-generated TTS files only (preserve project assets like welcome-multivoice-final.wav)
  find "$audio_dir" -maxdepth 1 -type f \( \
    -name "tts-processed-*.wav" -o \
    -name "tts-processed-*.mp3" -o \
    -name "tts-padded-*.mp3" -o \
    -name "tts-padded-*.wav" \
  \) -delete 2>/dev/null || true

  # Also delete BMAD party mode recordings if they exist
  if [[ -d "$audio_dir/bmad-party-mode-recordings" ]]; then
    rm -rf "$audio_dir/bmad-party-mode-recordings" 2>/dev/null || true
  fi

  # Get stats after cleanup
  local count_after=$(count_tts_files "$audio_dir")
  local size_after=$(calculate_tts_size_bytes "$audio_dir")
  local human_after=$(bytes_to_human "$size_after")
  local freed=$((size_before - size_after))
  local human_freed=$(bytes_to_human "$freed")

  echo -e "${GREEN}✅ Cleanup complete!${NC}"
  echo "  • Files deleted: ${YELLOW}$count_before${NC}"
  echo "  • Space freed: ${YELLOW}$human_freed${NC}"
  echo "  • Before: $human_before | After: $human_after"
}
