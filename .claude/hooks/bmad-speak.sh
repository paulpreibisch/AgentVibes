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

# Remove backslash escaping that Claude might add for special chars like ! and $
# In single quotes these don't need escaping, but Claude sometimes adds \! anyway
DIALOGUE="${DIALOGUE//\\!/!}"
DIALOGUE="${DIALOGUE//\\\$/\$}"

# Check if party mode is enabled
if [[ -f "$PROJECT_ROOT/.agentvibes/bmad/bmad-party-mode-disabled.flag" ]]; then
  exit 0
fi

# Check if BMAD is installed
if [[ ! -f "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv" ]]; then
  exit 0
fi

# Map display name to agent ID, OR pass through if already an agent ID
map_to_agent_id() {
  local name_or_id="$1"

  # If it looks like a file path (.bmad/*/agents/*.md), extract the agent ID
  # Example: .bmad/bmm/agents/pm.md -> pm
  if [[ "$name_or_id" =~ \.bmad/.*/agents/([^/]+)\.md$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi

  # First check if it's already an agent ID (column 1 of manifest)
  # CSV format: name,displayName,title,icon,role,...
  local direct_match=$(grep -i "^\"*${name_or_id}\"*," "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv" | head -1)
  if [[ -n "$direct_match" ]]; then
    # Already an agent ID, pass through
    echo "$name_or_id"
    return
  fi

  # Otherwise map display name to agent ID (for party mode)
  # Extract 'name' (column 1) where displayName (column 2) contains the name
  # displayName format in CSV: "John", "Mary", "Winston", etc. (first word before any parentheses)
  local agent_id=$(awk -F',' -v name="$name_or_id" '
    BEGIN { IGNORECASE=1 }
    NR > 1 {
      # Extract displayName (column 2)
      display = $2
      gsub(/^"|"$/, "", display)  # Remove surrounding quotes

      # Check if display name starts with the search name (case-insensitive)
      # This handles both "John" and "John (Product Manager)"
      if (tolower(display) ~ "^" tolower(name) "($| |\\()") {
        # Extract agent ID (column 1)
        agent = $1
        gsub(/^"|"$/, "", agent)
        print agent
        exit
      }
    }
  ' "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv")

  echo "$agent_id"
}

# Get agent ID
AGENT_ID=$(map_to_agent_id "$AGENT_NAME_OR_ID")

# Get agent's voice and intro text
AGENT_VOICE=""
AGENT_INTRO=""
if [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_VOICE=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$AGENT_ID" 2>/dev/null)
  AGENT_INTRO=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-intro "$AGENT_ID" 2>/dev/null)
fi

# Prepend intro text if configured (e.g., "John, Product Manager here. [dialogue]")
FULL_TEXT="$DIALOGUE"
if [[ -n "$AGENT_INTRO" ]]; then
  FULL_TEXT="${AGENT_INTRO}. ${DIALOGUE}"
fi

# Speak with agent's voice using queue system (non-blocking for Claude)
# Queue system ensures sequential playback while allowing Claude to continue
# Pass agent display name for unique background music per agent (audio-effects.cfg)
# Output from play-tts.sh will be displayed by the queue worker (GitHub Issue #39)
if [[ -n "$AGENT_VOICE" ]]; then
  bash "$SCRIPT_DIR/tts-queue.sh" add "$FULL_TEXT" "$AGENT_VOICE" "$AGENT_NAME_OR_ID" &
else
  # Fallback to default voice, still pass agent name for background music
  bash "$SCRIPT_DIR/tts-queue.sh" add "$FULL_TEXT" "" "$AGENT_NAME_OR_ID" &
fi
