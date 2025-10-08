#!/bin/bash
#
# @fileoverview Output Style Detection for AgentVibes
# @context Detects if agent-vibes output style is active
# @architecture Helper for slash commands to warn users
# @why Voice commands won't work without agent-vibes output style
#

# Check if we're in a Claude Code session with agent-vibes output style
# This is a heuristic check - we can't directly detect the output style,
# but we can check if TTS commands would work

check_output_style() {
  # Strategy: Check if this script is being called from within a Claude response
  # If CLAUDECODE env var is set, we're in Claude Code
  # If not, we're running standalone (not in a Claude Code session)

  if [[ -z "$CLAUDECODE" ]]; then
    # Not in Claude Code at all
    return 1
  fi

  # We're in Claude Code, but we can't directly detect output style
  # The agent-vibes output style calls our TTS hooks automatically
  # So if this function is called, it means a slash command was invoked

  # Check if we have the necessary TTS setup
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # Check if agent-vibes output style is installed
  if [[ ! -f "$SCRIPT_DIR/../output-styles/agent-vibes.md" ]]; then
    return 1
  fi

  # All checks passed - likely using agent-vibes output style
  return 0
}

# Show warning if output style is not agent-vibes
show_output_style_warning() {
  echo ""
  echo "⚠️  Voice commands require the agent-vibes output style"
  echo ""
  echo "To enable voice narration, run:"
  echo "  /output-style agent-vibes"
  echo ""
  echo "This will make Claude speak with TTS for all responses."
  echo "You can still use voice commands manually with agent-vibes disabled,"
  echo "but you won't hear automatic TTS narration."
  echo ""
}

# Main execution when called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if ! check_output_style; then
    show_output_style_warning
    exit 1
  fi
  exit 0
fi
