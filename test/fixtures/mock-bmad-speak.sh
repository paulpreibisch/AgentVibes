#!/bin/bash
# Mock BMAD speak script for testing party mode
# Emulates BMAD's bmad-speak.sh without requiring full BMAD installation
#
# Usage: mock-bmad-speak.sh <agent_name> <message> [voice_map_csv] [provider]

set -euo pipefail

AGENT_NAME="${1:-}"
MESSAGE="${2:-}"
VOICE_MAP="${3:-test/fixtures/voice-maps/basic-party-mode.csv}"
PROVIDER="${4:-piper}"

if [[ -z "$AGENT_NAME" ]]; then
  echo "Error: Agent name required" >&2
  exit 1
fi

if [[ -z "$MESSAGE" ]]; then
  echo "Error: Message required" >&2
  exit 1
fi

# Read voice from CSV based on provider
if [[ -f "$VOICE_MAP" ]]; then
  # Determine which column to read based on provider
  if [[ "$PROVIDER" == "piper" ]]; then
    VOICE_COLUMN=2
  elif [[ "$PROVIDER" == "macos" ]] || [[ "$PROVIDER" == "mac" ]]; then
    VOICE_COLUMN=3
  else
    echo "Warning: Unknown provider '$PROVIDER', defaulting to piper" >&2
    VOICE_COLUMN=2
  fi

  # Extract voice for this agent (skip header row)
  AGENT_VOICE=$(awk -F',' -v agent="$AGENT_NAME" -v col="$VOICE_COLUMN" '
    NR > 1 && $1 == agent {
      # Remove quotes from voice name
      gsub(/"/, "", $col)
      print $col
      exit
    }
  ' "$VOICE_MAP")

  if [[ -n "$AGENT_VOICE" ]]; then
    # Set the voice in environment for play-tts.sh to pick up
    export AGENTVIBES_VOICE="$AGENT_VOICE"
  fi
fi

# Call AgentVibes TTS
# In test mode, this will use the mock piper command
.claude/hooks/play-tts.sh "$MESSAGE"

exit 0
