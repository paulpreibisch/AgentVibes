#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-vibevoice.sh
#
# AgentVibes - VibeVoice Provider (Proof of Concept)
# Multi-speaker conversational TTS using Microsoft's VibeVoice
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0

set -euo pipefail

# Fix locale warnings
export LC_ALL=C

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
TEXT="$1"
VOICE_OVERRIDE="${2:-}"  # Optional: speaker ID (0-3) or speaker name

# Security: Validate inputs
if [[ -z "$TEXT" ]]; then
  echo "Error: No text provided" >&2
  exit 1
fi

# Security: Validate voice override doesn't contain dangerous characters
if [[ -n "$VOICE_OVERRIDE" ]] && [[ "$VOICE_OVERRIDE" =~ [';|&$`<>(){}'] ]]; then
  echo "Error: Invalid characters in voice parameter" >&2
  exit 1
fi

# @function map_voice_to_speaker_id
# @intent Convert voice name to VibeVoice speaker ID (0-3)
# @why Support both speaker IDs and friendly names
map_voice_to_speaker_id() {
  local voice="$1"

  # If already a number 0-3, use it
  if [[ "$voice" =~ ^[0-3]$ ]]; then
    echo "$voice"
    return 0
  fi

  # Map friendly names to speaker IDs
  # Note: These are placeholder mappings for POC
  case "${voice,,}" in  # Convert to lowercase
    alice|female1|speaker0) echo "0" ;;
    bob|male1|speaker1) echo "1" ;;
    carol|female2|speaker2) echo "2" ;;
    david|male2|speaker3) echo "3" ;;
    *)
      # Default to speaker 0
      echo "0"
      ;;
  esac
}

# Determine speaker ID
SPEAKER_ID=0
if [[ -n "$VOICE_OVERRIDE" ]]; then
  SPEAKER_ID=$(map_voice_to_speaker_id "$VOICE_OVERRIDE")
fi

# Audio output directory
AUDIO_DIR="$PROJECT_ROOT/.claude/audio"
mkdir -p "$AUDIO_DIR"

# Generate unique filename
TIMESTAMP=$(date +%s)
OUTPUT_FILE="$AUDIO_DIR/tts-vibevoice-${TIMESTAMP}.wav"

# Check if Python wrapper exists
WRAPPER_SCRIPT="$SCRIPT_DIR/vibevoice-wrapper.py"
if [[ ! -f "$WRAPPER_SCRIPT" ]]; then
  echo "❌ Error: VibeVoice wrapper not found at $WRAPPER_SCRIPT" >&2
  exit 1
fi

# Check if dependencies are installed
if ! python3 -c "import torch, transformers" 2>/dev/null; then
  echo "❌ Error: VibeVoice dependencies not installed" >&2
  echo "Run: pip install -r requirements-vibevoice.txt" >&2
  exit 1
fi

# Synthesize audio using VibeVoice
echo "🎭 Using VibeVoice multi-speaker TTS (Speaker $SPEAKER_ID)" >&2

if ! AUDIO_PATH=$(python3 "$WRAPPER_SCRIPT" \
  --speaker "$SPEAKER_ID" \
  --output "$OUTPUT_FILE" \
  "$TEXT" 2>&1); then
  echo "❌ VibeVoice synthesis failed" >&2
  echo "$AUDIO_PATH" >&2
  exit 1
fi

# Extract actual output path from Python script output (last line)
AUDIO_PATH=$(echo "$AUDIO_PATH" | tail -1)

# Verify audio file was created
if [[ ! -f "$AUDIO_PATH" ]]; then
  echo "❌ Error: Audio file not created at $AUDIO_PATH" >&2
  exit 1
fi

echo "🎵 Saved to: $AUDIO_PATH" >&2
echo "🎤 Voice used: VibeVoice (Speaker $SPEAKER_ID)" >&2

# Play audio (use platform-appropriate player)
if command -v ffplay &>/dev/null; then
  # Use ffplay if available (quieter output)
  ffplay -nodisp -autoexit -loglevel quiet "$AUDIO_PATH" 2>/dev/null &
elif command -v aplay &>/dev/null; then
  # ALSA player on Linux
  aplay -q "$AUDIO_PATH" 2>/dev/null &
elif command -v afplay &>/dev/null; then
  # macOS player
  afplay "$AUDIO_PATH" &
else
  echo "⚠️  No audio player found (ffplay, aplay, or afplay required)" >&2
  echo "Audio saved but cannot play automatically" >&2
fi

exit 0
