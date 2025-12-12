#!/usr/bin/env bash
#
# File: .claude/hooks/session-start-tts.sh
#
# AgentVibes SessionStart Hook - Wrapper that delegates to .agentvibes/
# This is a thin wrapper that reads the current mode and sources the appropriate hook
#

# Fix locale warnings
export LC_ALL=C

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Path to mode configuration
MODE_FILE="$PROJECT_ROOT/.agentvibes/config/mode.txt"

# Check if AgentVibes is installed
AGENTVIBES_HOOKS="$PROJECT_ROOT/.agentvibes/hooks"
if [[ ! -d "$AGENTVIBES_HOOKS" ]]; then
  # AgentVibes not installed, exit silently
  exit 0
fi

# Read current mode (default to full if not set)
CURRENT_MODE="full"
if [[ -f "$MODE_FILE" ]]; then
  CURRENT_MODE=$(cat "$MODE_FILE" 2>/dev/null | tr -d '[:space:]')
fi

# Delegate to the appropriate hook based on mode
if [[ "$CURRENT_MODE" == "lite" ]]; then
  # Lite mode v2 - minimal protocol using working tool-call approach
  if [[ -f "$AGENTVIBES_HOOKS/session-start-lite-v2.sh" ]]; then
    bash "$AGENTVIBES_HOOKS/session-start-lite-v2.sh"
  elif [[ -f "$AGENTVIBES_HOOKS/session-start-lite.sh" ]]; then
    # Fallback to old lite mode (won't work due to PostToolUse issue)
    bash "$AGENTVIBES_HOOKS/session-start-lite.sh"
  fi
else
  # Full mode - rich protocol
  if [[ -f "$AGENTVIBES_HOOKS/session-start-full.sh" ]]; then
    bash "$AGENTVIBES_HOOKS/session-start-full.sh"
  fi
fi
