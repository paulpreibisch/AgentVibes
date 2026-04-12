#!/usr/bin/env bash
#
# File: .claude/hooks/verbosity-manager.sh
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose and noninfringement.
# In no event shall the authors or copyright holders be liable for any claim,
# damages or other liability, whether in an action of contract, tort or
# otherwise, arising from, out of or in connection with the software or the
# use or other dealings in the software.
#
# ---
#
# @fileoverview Manages AgentVibes verbosity level (low/medium/high)
# @context Controls how much Claude speaks while working - acknowledgments only vs full reasoning
# @architecture Simple config file reader/writer with project-local and global fallback
# @dependencies tts-verbosity.txt config file
# @entrypoints Called by slash commands, MCP tools, and session-start hook
# @patterns Config file management, validation, graceful defaults
# @related .claude/hooks/session-start-tts.sh, mcp-server/server.py, Issue #32

# Fix locale warnings
export LC_ALL=C

# Get script directory for accessing other scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Respect CLAUDE_PROJECT_DIR when set by MCP (project context vs global installation)
if [[ -n "$CLAUDE_PROJECT_DIR" ]]; then
  CLAUDE_DIR="$CLAUDE_PROJECT_DIR/.claude"
else
  CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
fi

# Config file locations
VERBOSITY_FILE="$CLAUDE_DIR/tts-verbosity.txt"
GLOBAL_VERBOSITY_FILE="$HOME/.claude/tts-verbosity.txt"

#
# @function get_verbosity
# @context Returns the current verbosity level (low/medium/high)
# @architecture Checks project-local first, then global, then defaults to "high"
# @dependencies tts-verbosity.txt config file
# @entrypoints Called by session-start hook, MCP tools, slash commands
# @aiNotes Default to "high" to match installer default for new installations
#
get_verbosity() {
  if [[ -f "$VERBOSITY_FILE" ]]; then
    cat "$VERBOSITY_FILE"
  elif [[ -f "$GLOBAL_VERBOSITY_FILE" ]]; then
    cat "$GLOBAL_VERBOSITY_FILE"
  else
    echo "high"
  fi
}

#
# @function set_verbosity
# @context Sets the verbosity level to low/medium/high
# @architecture Validates input, saves to project-local if .claude exists, otherwise global
# @dependencies None
# @entrypoints Called by MCP tools and slash commands
# @aiNotes Saves to project-local (.claude/) when available for per-project settings
#
set_verbosity() {
  local level="$1"

  # Validate input
  if [[ ! "$level" =~ ^(low|medium|high|caveman)$ ]]; then
    echo "❌ Invalid verbosity level: $level"
    echo "Valid options: low, medium, high, caveman"
    return 1
  fi

  # Save to project-local or global
  if [[ -d "$CLAUDE_DIR" ]]; then
    echo "$level" > "$VERBOSITY_FILE"
    echo "✅ Verbosity set to: $level (project-local)"
  else
    mkdir -p "$(dirname "$GLOBAL_VERBOSITY_FILE")"
    echo "$level" > "$GLOBAL_VERBOSITY_FILE"
    echo "✅ Verbosity set to: $level (global)"
  fi

  echo ""
  echo "💡 Verbosity levels:"
  echo "   • LOW: Acknowledgments + Completions only"
  echo "   • MEDIUM: + Major decisions and findings"
  echo "   • HIGH: All reasoning (maximum transparency)"
  echo "   • CAVEMAN: Ultra-terse fragments, max token savings"
  echo ""
  echo "⚠️  Restart Claude Code for changes to take effect"

  return 0
}

#
# @function show_info
# @context Displays current verbosity level with detailed explanation
# @architecture Reads current level and provides contextual help
# @dependencies get_verbosity()
# @entrypoints Called when no arguments provided
# @aiNotes Helps users understand what each verbosity level does
#
show_info() {
  local current_level
  current_level=$(get_verbosity)

  echo "🎙️  AgentVibes Verbosity Control"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Current level: $current_level"
  echo ""
  echo "Available levels:"
  echo ""
  echo "LOW (Minimal)"
  echo "  ✅ Acknowledgments only"
  echo "  ✅ Completions only"
  echo "  🔇 No reasoning spoken"
  echo ""
  echo "MEDIUM (Balanced)"
  echo "  ✅ Acknowledgments"
  echo "  🤔 Major decisions"
  echo "  ✓ Key findings"
  echo "  ✅ Completions"
  echo ""
  echo "HIGH (Maximum Transparency)"
  echo "  ✅ Acknowledgments"
  echo "  💭 All reasoning"
  echo "  🤔 All decisions"
  echo "  ✓ All findings"
  echo "  ✅ Completions"
  echo ""
  echo "CAVEMAN (Ultra-Terse)"
  echo "  ⚡ Fragments only, no filler"
  echo "  📉 65-75% fewer output tokens"
  echo "  🔤 Abbreviations (DB/auth/config/fn/impl)"
  echo "  ➡️  Arrows instead of prose (X -> Y)"
  echo ""
  echo "Usage:"
  echo "  $0 get                # Show current level"
  echo "  $0 set low|medium|high|caveman # Change level"
}

# Main execution
case "$1" in
  get)
    get_verbosity
    ;;
  set)
    if [[ -z "$2" ]]; then
      echo "❌ Error: Missing verbosity level"
      echo "Usage: $0 set low|medium|high|caveman"
      exit 1
    fi
    set_verbosity "$2"
    ;;
  info|"")
    show_info
    ;;
  *)
    echo "❌ Unknown command: $1"
    echo "Usage: $0 {get|set|info} [level]"
    exit 1
    ;;
esac
