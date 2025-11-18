#!/usr/bin/env bash
#
# File: .claude/hooks/tts-queue-worker.sh
#
# TTS Queue Worker - Background process that plays queued TTS sequentially
# Automatically exits when queue is empty for 5 seconds

set -euo pipefail

QUEUE_DIR="/tmp/agentvibes-tts-queue"
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
trap "rm -f $WORKER_PID_FILE" EXIT

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

      # Wait 1 second and check again
      sleep 1
      continue
    fi

    # Reset idle counter - we have work
    idle_count=0

    # Load TTS request
    source "$queue_item"

    # Decode base64 values
    TEXT=$(echo -n "$TEXT_B64" | base64 -d)
    VOICE=$(echo -n "$VOICE_B64" | base64 -d)

    # Play TTS (this blocks until audio finishes due to lock mechanism)
    # Display output to show file location (GitHub Issue #39)
    if [[ -n "${VOICE:-}" ]]; then
      bash "$SCRIPT_DIR/play-tts.sh" "$TEXT" "$VOICE" || true
    else
      bash "$SCRIPT_DIR/play-tts.sh" "$TEXT" || true
    fi

    # Add configurable pause between speakers for natural conversation flow
    sleep $SPEAKER_DELAY

    # Remove processed item
    rm -f "$queue_item"
  done
}

# Start processing
process_queue
