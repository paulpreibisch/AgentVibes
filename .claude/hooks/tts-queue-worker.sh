#!/usr/bin/env bash
#
# File: .claude/hooks/tts-queue-worker.sh
#
# TTS Queue Worker - Background process that plays queued TTS sequentially
# Automatically exits when queue is empty for 5 seconds

set -euo pipefail

# Security: Use secure temp directory with restrictive permissions
# Must match the logic in tts-queue.sh exactly
if [[ -n "${XDG_RUNTIME_DIR:-}" ]] && [[ -d "$XDG_RUNTIME_DIR" ]]; then
  QUEUE_DIR="$XDG_RUNTIME_DIR/agentvibes-tts-queue"
else
  # Fallback to user-specific temp directory
  QUEUE_DIR="/tmp/agentvibes-tts-queue-$(id -u)"
fi

# Security: Validate queue directory exists and has correct ownership
if [[ ! -d "$QUEUE_DIR" ]]; then
  echo "Error: Queue directory does not exist: $QUEUE_DIR" >&2
  exit 1
fi

# Security: Verify we own the queue directory (prevent symlink attacks)
if [[ "$(stat -c '%u' "$QUEUE_DIR" 2>/dev/null || stat -f '%u' "$QUEUE_DIR" 2>/dev/null)" != "$(id -u)" ]]; then
  echo "Error: Queue directory not owned by current user" >&2
  exit 1
fi

WORKER_PID_FILE="$QUEUE_DIR/worker.pid"
IDLE_TIMEOUT=5  # Exit after 5 seconds of no new requests

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configurable delay between speakers (seconds)
# Can be overridden by .claude/tts-speaker-delay.txt or ~/.claude/tts-speaker-delay.txt
SPEAKER_DELAY=4  # Default: 4 seconds between speakers

# Check for custom delay configuration
if [[ -f ".claude/tts-speaker-delay.txt" ]]; then
  CUSTOM_DELAY=$(cat .claude/tts-speaker-delay.txt 2>/dev/null | tr -d '[:space:]')
  if [[ "$CUSTOM_DELAY" =~ ^[0-9]+$ ]]; then
    SPEAKER_DELAY=$CUSTOM_DELAY
  fi
elif [[ -f "$HOME/.claude/tts-speaker-delay.txt" ]]; then
  CUSTOM_DELAY=$(cat "$HOME/.claude/tts-speaker-delay.txt" 2>/dev/null | tr -d '[:space:]')
  if [[ "$CUSTOM_DELAY" =~ ^[0-9]+$ ]]; then
    SPEAKER_DELAY=$CUSTOM_DELAY
  fi
fi

# Trap to clean up on exit
trap 'rm -f "$WORKER_PID_FILE"' EXIT

# Process queue items
process_queue() {
  local idle_count=0

  while true; do
    # Find oldest queue item
    local queue_item=$(ls -1 "$QUEUE_DIR"/*.queue 2>/dev/null | sort | head -1)

    if [[ -z "$queue_item" ]]; then
      # Queue is empty, increment idle counter
      idle_count=$((idle_count + 1))

      if [[ $idle_count -ge $IDLE_TIMEOUT ]]; then
        # No new items for timeout period, exit worker
        exit 0
      fi

      # Wait for a new queue item — use inotifywait if available to avoid polling
      # Use a 1-second timeout (-t 1) so the idle counter still advances correctly
      if command -v inotifywait &>/dev/null; then
        inotifywait -q -e create -t 1 "$QUEUE_DIR" 2>/dev/null || true
      else
        sleep 1
      fi
      continue
    fi

    # Reset idle counter - we have work
    idle_count=0

    # Load queue item — explicit key=value parsing (SECURITY: never source untrusted files)
    TEXT_FILE=""
    VOICE=""
    AGENT=""
    PROFILE_PATH=""
    PLAY_WAV=""
    while IFS='=' read -r _key _val; do
      case "$_key" in
        TEXT_FILE)     TEXT_FILE="$_val" ;;
        VOICE)         VOICE="$_val" ;;
        AGENT)         AGENT="$_val" ;;
        PROFILE_PATH)  PROFILE_PATH="$_val" ;;
        PLAY_WAV)      PLAY_WAV="$_val" ;;
      esac
    done < "$queue_item"

    # Check if this is a pre-generated WAV playback item
    if [[ -n "${PLAY_WAV:-}" ]] && [[ -f "$PLAY_WAV" ]]; then
      # Play the pre-generated WAV directly (synthesis already done by bmad-speak)
      if command -v paplay &>/dev/null; then
        paplay "$PLAY_WAV" 2>/dev/null || true
      elif command -v aplay &>/dev/null; then
        aplay -q "$PLAY_WAV" 2>/dev/null || true
      elif command -v ffplay &>/dev/null; then
        ffplay -nodisp -autoexit -loglevel quiet "$PLAY_WAV" 2>/dev/null || true
      fi
    else
      # Full TTS request — read text from companion file, use voice/agent directly
      TEXT=""
      if [[ -n "${TEXT_FILE:-}" ]] && [[ -f "$TEXT_FILE" ]]; then
        TEXT=$(cat "$TEXT_FILE")
        rm -f "$TEXT_FILE"
      fi
      AGENT_PROFILE="${PROFILE_PATH:-}"

      export AGENTVIBES_AGENT_PROFILE="$AGENT_PROFILE"

      if [[ -n "${VOICE:-}" ]]; then
        bash "$SCRIPT_DIR/play-tts.sh" "$TEXT" "${VOICE}" || true
      else
        bash "$SCRIPT_DIR/play-tts.sh" "$TEXT" || true
      fi

      if [[ -n "$AGENT_PROFILE" ]] && [[ -f "$AGENT_PROFILE" ]]; then
        rm -f "$AGENT_PROFILE"
      fi
      unset AGENTVIBES_AGENT_PROFILE
    fi

    # Add configurable pause between speakers for natural conversation flow
    sleep $SPEAKER_DELAY

    # Remove processed item and any companion text file
    rm -f "$queue_item" "${queue_item%.queue}.txt"
  done
}

# Start processing
process_queue
