#!/usr/bin/env bash
set -euo pipefail
#
# File: .claude/hooks/session-start-tts.sh
#
# AgentVibes SessionStart Hook - Optimized (Issue #80, Phase 1)
# Outputs JSON with additionalContext for reliable context injection
#

# Fix locale warnings
export LC_ALL=C

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if AgentVibes is installed
if [[ ! -f "$SCRIPT_DIR/play-tts.sh" ]]; then
  # AgentVibes not installed, don't inject anything
  exit 0
fi

# Check for sentiment (priority) or personality (fallback)
SENTIMENT=$(cat .claude/tts-sentiment.txt 2>/dev/null || cat ~/.claude/tts-sentiment.txt 2>/dev/null || echo "")
PERSONALITY=$(cat .claude/tts-personality.txt 2>/dev/null || cat ~/.claude/tts-personality.txt 2>/dev/null || echo "normal")

# Determine style
if [[ -n "$SENTIMENT" ]]; then
  STYLE="$SENTIMENT"
else
  STYLE="$PERSONALITY"
fi

# Get verbosity level (Issue #32)
VERBOSITY=$(cat .claude/tts-verbosity.txt 2>/dev/null || cat ~/.claude/tts-verbosity.txt 2>/dev/null || echo "low")

# Build context string
CONTEXT="# AgentVibes TTS Protocol\n\n"
CONTEXT+="**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction:**\n\n"
CONTEXT+="1. **Acknowledgment** - Start of task: \`Bash: .claude/hooks/play-tts.sh \"[action]\"\`\n"
CONTEXT+="2. **Completion** - End of task: \`Bash: .claude/hooks/play-tts.sh \"[result + key details]\"\`\n\n"
CONTEXT+="**Example:**\n\`\`\`\n[Bash: .claude/hooks/play-tts.sh \"Checking git status\"]\n[work...]\n"
CONTEXT+="[Bash: .claude/hooks/play-tts.sh \"Repository is clean, no changes\"]\n\`\`\`\n\n"

# Add verbosity-specific protocol
case "$VERBOSITY" in
  low)
    CONTEXT+="## Verbosity: LOW\n- Acknowledgment: Action only\n- Completion: Result + errors only\n- Skip: Reasoning, decisions\n\n"
    ;;
  medium)
    CONTEXT+="## Verbosity: MEDIUM\n- Acknowledgment: Action + key approach\n- Completion: Result + important decisions\n- Include: Major choices only\n\n"
    ;;
  high)
    CONTEXT+="## Verbosity: HIGH\n- Acknowledgment: Action + approach + why\n- Completion: Result + decisions + trade-offs\n- Include: Full reasoning, alternatives\n\n"
    ;;
esac

# Add style info and rules
CONTEXT+="## Style: $STYLE\n\n"
CONTEXT+="## Rules\n"
CONTEXT+="1. Never skip acknowledgment TTS\n"
CONTEXT+="2. Never skip completion TTS\n"
CONTEXT+="3. Match verbosity level\n"
CONTEXT+="4. Keep under 150 chars\n"
CONTEXT+="5. Always include errors\n\n"
CONTEXT+="Quick Ref: low=action+result | medium=+key decisions | high=+full reasoning"

# Escape for JSON (handle newlines, quotes, backslashes)
ESCAPED=$(printf '%s' "$CONTEXT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g')

# Output structured JSON for reliable context injection
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$ESCAPED"
