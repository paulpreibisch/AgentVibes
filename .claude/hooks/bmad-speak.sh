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

# WORKAROUND: If BMAD party mode passes generic intro, clear it to use agent's custom intro
# This handles BMAD-METHOD versions that haven't merged PR 987 yet
if [[ "$DIALOGUE" == "Hello! Ready to help with the discussion." ]]; then
  # Clear generic dialogue - will use agent's custom intro from voice map
  DIALOGUE=""
fi

# Additional generic intro patterns to clear (allows agent-specific intros to be used)
if [[ "$DIALOGUE" =~ ^(Hello|Hi|Hey)[!\.]?\ (Ready|Here|Available) ]]; then
  DIALOGUE=""
fi

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
    # Extract the actual agent ID (lowercase) from column 1
    local agent=$(echo "$direct_match" | awk -F',' '{print $1}' | tr -d '"')
    echo "$agent"
    return
  fi

  # Try to match displayName (column 2) - handles "Winston", "Mary", etc.
  # This handles both "John" and "John (Product Manager)"
  local agent_id=$(awk -F',' -v name="$name_or_id" '
    BEGIN { IGNORECASE=1 }
    NR > 1 {
      # Extract displayName (column 2)
      display = $2
      gsub(/^"|"$/, "", display)  # Remove surrounding quotes

      # Check if display name starts with the search name (case-insensitive)
      if (tolower(display) ~ "^" tolower(name) "($| |\\()") {
        # Extract agent ID (column 1)
        agent = $1
        gsub(/^"|"$/, "", agent)
        print agent
        exit
      }
    }
  ' "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv")

  # If still not found, try matching against title (column 3)
  # Handles "Architect" -> "architect", "Product Manager" -> "pm", etc.
  if [[ -z "$agent_id" ]]; then
    agent_id=$(awk -F',' -v name="$name_or_id" '
      BEGIN { IGNORECASE=1 }
      NR > 1 {
        # Extract title (column 3)
        title = $3
        gsub(/^"|"$/, "", title)  # Remove surrounding quotes

        # Check if title matches (exact or starts with)
        if (tolower(title) == tolower(name) || tolower(title) ~ "^" tolower(name) " ") {
          # Extract agent ID (column 1)
          agent = $1
          gsub(/^"|"$/, "", agent)
          print agent
          exit
        }
      }
    ' "$PROJECT_ROOT/.bmad/_cfg/agent-manifest.csv")
  fi

  echo "$agent_id"
}

# Get agent ID
AGENT_ID=$(map_to_agent_id "$AGENT_NAME_OR_ID")

# Get agent's voice and intro text
AGENT_VOICE=""
AGENT_INTRO=""
if [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_VOICE=$("$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$AGENT_ID" 2>/dev/null)
  AGENT_INTRO=$("$SCRIPT_DIR/bmad-voice-manager.sh" get-intro "$AGENT_ID" 2>/dev/null)
fi

# Prepend intro text if configured (e.g., "John, Product Manager here. [dialogue]")
if [[ -z "$DIALOGUE" ]]; then
  # If no dialogue text (intro-only mode), use just the intro
  FULL_TEXT="$AGENT_INTRO"
elif [[ -n "$AGENT_INTRO" ]]; then
  # Prepend intro to dialogue
  FULL_TEXT="${AGENT_INTRO}. ${DIALOGUE}"
else
  # No intro, just dialogue
  FULL_TEXT="$DIALOGUE"
fi

# Safety check: Don't speak if we have no text at all
if [[ -z "$FULL_TEXT" ]]; then
  exit 0
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
