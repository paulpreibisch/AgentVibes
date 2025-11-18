#!/usr/bin/env bash
#
# File: .claude/hooks/bmad-speak.sh
#
# AgentVibes BMAD Voice Integration
# Maps agent display names OR agent IDs to voices and triggers TTS
#
# Usage: bmad-speak.sh "Agent Name" "dialogue text"
#        bmad-speak.sh "agent-id" "dialogue text"
#
# Supports both:
# - Display names (e.g., "Winston", "John") for party mode
# - Agent IDs (e.g., "architect", "pm") for individual agents
#

set -euo pipefail

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Arguments
AGENT_NAME_OR_ID="$1"
DIALOGUE="$2"

# Check if party mode is enabled
if [[ -f "$PROJECT_ROOT/.claude/plugins/bmad-party-mode-disabled.flag" ]]; then
  exit 0
fi

# Check if BMAD is installed
if [[ ! -f "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv" ]]; then
  exit 0
fi

# Map display name to agent ID, OR pass through if already an agent ID
map_to_agent_id() {
  local name_or_id="$1"

  # First check if it's already an agent ID (column 1 of manifest)
  # CSV format: name,displayName,title,icon,role,...
  local direct_match=$(grep -i "^\"*${name_or_id}\"*," "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv" | head -1)
  if [[ -n "$direct_match" ]]; then
    # Already an agent ID, pass through
    echo "$name_or_id"
    return
  fi

  # Otherwise map display name to agent ID (for party mode)
  # Extract 'name' (column 1) where displayName (column 2) matches
  local agent_id=$(grep -i ",\"*${name_or_id}\"*," "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv" | \
                   head -1 | \
                   cut -d',' -f1 | \
                   tr -d '"')

  echo "$agent_id"
}

# Get agent ID
AGENT_ID=$(map_to_agent_id "$AGENT_NAME_OR_ID")

# Get agent's voice
AGENT_VOICE=""
if [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_VOICE=$("$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$AGENT_ID" 2>/dev/null)
fi

# Speak with agent's voice
if [[ -n "$AGENT_VOICE" ]]; then
  bash "$SCRIPT_DIR/play-tts.sh" "$DIALOGUE" "$AGENT_VOICE" &
else
  # Fallback to default voice
  bash "$SCRIPT_DIR/play-tts.sh" "$DIALOGUE" &
fi
