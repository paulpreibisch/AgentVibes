#!/usr/bin/env bash
#
# File: .claude/hooks/user-prompt-output.sh
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
# @fileoverview Auto-detects emoji markers in Claude's output and triggers TTS
# @context Implements verbosity system by detecting 💭 🤔 ✓ markers and speaking them
# @architecture Stdin reader, regex matcher, async TTS trigger
# @dependencies play-tts.sh, tts-verbosity.txt
# @entrypoints Called by Claude Code after each assistant response (user-prompt-output hook)
# @patterns Text stream processing, background job execution, marker-based triggers
# @related session-start-tts.sh, verbosity-manager.sh, Issue #32
# @aiNotes This hook enables natural emoji-based TTS without Claude needing manual Bash calls

# Fix locale warnings
export LC_ALL=C

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAY_TTS="$SCRIPT_DIR/play-tts.sh"

# Get verbosity level
VERBOSITY=$(cat .claude/tts-verbosity.txt 2>/dev/null || cat ~/.claude/tts-verbosity.txt 2>/dev/null || echo "low")

# Read stdin (Claude's output) - preserve it for display
OUTPUT=$(cat)

# Always output the original text first (so user sees it)
echo "$OUTPUT"

# Exit early if play-tts.sh doesn't exist (AgentVibes not installed)
[[ ! -f "$PLAY_TTS" ]] && exit 0

#
# @function extract_and_speak
# @context Extracts text after emoji markers and triggers TTS asynchronously
# @architecture Uses grep to find markers, extracts text, launches TTS in background
# @dependencies play-tts.sh
# @entrypoints Called based on verbosity level
# @aiNotes Background execution (&) prevents blocking Claude's output
#
extract_and_speak() {
  local pattern="$1"

  # Extract lines matching the pattern
  # Pattern format: "emoji text" or "emoji [text]"
  while IFS= read -r line; do
    # Try to extract text after emoji
    # Handles formats: "💭 text", "💭 [text]", "💭text"
    if echo "$line" | grep -qE "$pattern"; then
      # Extract everything after the emoji (and optional space/bracket)
      text=$(echo "$line" | sed -E "s/^.*($pattern)[[:space:]]*\[?[[:space:]]*//" | sed 's/\]$//')

      # Skip if text is empty or too short
      [[ -z "$text" || ${#text} -lt 3 ]] && continue

      # Speak it in background (don't block)
      bash "$PLAY_TTS" "$text" >/dev/null 2>&1 &
    fi
  done <<< "$OUTPUT"
}

# Process based on verbosity level
case "$VERBOSITY" in
  high)
    # HIGH: Speak ALL markers (💭 🤔 ✓)
    # Don't speak ✅ here - that's handled by manual TTS completion call
    extract_and_speak "💭|🤔|✓"
    ;;

  medium)
    # MEDIUM: Speak decisions and findings (🤔 ✓)
    extract_and_speak "🤔|✓"
    ;;

  low)
    # LOW: No automatic extraction (only manual ACK/COMPLETE TTS calls)
    # Don't process any markers
    ;;
esac

# Exit successfully
exit 0
