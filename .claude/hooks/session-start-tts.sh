#!/usr/bin/env bash
#
# File: .claude/hooks/session-start-tts.sh
#
# AgentVibes SessionStart Hook - Injects TTS Protocol Instructions
#
# This hook outputs TTS protocol instructions to stdout, which Claude Code
# adds to the conversation context at session start.
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

# Determine which to use
if [[ -n "$SENTIMENT" ]]; then
  STYLE_MODE="sentiment"
  STYLE_NAME="$SENTIMENT"
else
  STYLE_MODE="personality"
  STYLE_NAME="$PERSONALITY"
fi

# Get verbosity level (Issue #32)
VERBOSITY=$(cat .claude/tts-verbosity.txt 2>/dev/null || cat ~/.claude/tts-verbosity.txt 2>/dev/null || echo "low")

# Output TTS protocol instructions to stdout
# Claude Code will add this to the conversation context
cat <<'EOF'

# AgentVibes TTS Protocol

**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction:**

## 1. ACKNOWLEDGMENT (Start of Every Task)
Immediately after receiving ANY user message:
1. Generate a brief, unique acknowledgment message
2. Execute: `Bash: .claude/hooks/play-tts.sh "[your message]"`
3. Then proceed with the work

## 2. COMPLETION (End of Every Task)
After finishing the task:
1. Generate a brief, unique completion message
2. Execute: `Bash: .claude/hooks/play-tts.sh "[your message]"`

## Rules
- Use Bash tool to execute play-tts.sh
- Keep messages under 150 characters
- Generate unique messages each time
- Use relative path: .claude/hooks/play-tts.sh
- This is NOT optional - follow for EVERY interaction

## Example
```
User: "check git status"
[Bash: .claude/hooks/play-tts.sh "I'll check that for you."]
[... do work ...]
[Bash: .claude/hooks/play-tts.sh "Done! All clean."]
```

EOF

# Add verbosity-specific protocol (Issue #32)
case "$VERBOSITY" in
  low)
    cat <<'EOF'
## Verbosity: LOW (Minimal)
- Speak only at acknowledgment (start) and completion (end)
- Do NOT speak reasoning, decisions, or findings during work
- Keep it quiet and focused

EOF
    ;;

  medium)
    cat <<'EOF'
## Verbosity: MEDIUM (Balanced)
- Speak at acknowledgment and completion (always)
- Also speak major decisions and key findings during work
- Use emoji markers for automatic TTS:
  🤔 [decision text] - Major decisions (e.g., "🤔 I'll use grep to search all files")
  ✓ [finding text] - Key findings (e.g., "✓ Found 12 instances at line 1323")

Example:
```
User: "Find all TODO comments"
[TTS: Acknowledgment]
🤔 I'll use grep to search for TODO comments
[Work happens...]
✓ Found 12 TODO comments across 5 files
[TTS: Completion]
```

EOF
    ;;

  high)
    cat <<'EOF'
## Verbosity: HIGH (Maximum Transparency)
- Speak acknowledgment and completion (always)
- Speak ALL reasoning, decisions, and findings as you work
- Use emoji markers for automatic TTS:
  💭 [reasoning text] - Thought process (e.g., "💭 Let me search for all instances")
  🤔 [decision text] - Decisions (e.g., "🤔 I'll use grep for this")
  ✓ [finding text] - Findings (e.g., "✓ Found it at line 1323")

Example:
```
User: "Find all TODO comments"
[TTS: Acknowledgment]
💭 Let me search through the codebase for TODO comments
🤔 I'll use the Grep tool with pattern "TODO"
[Grep runs...]
✓ Found 12 TODO comments across 5 files
💭 Let me organize these results by file
[Processing...]
[TTS: Completion]
```

IMPORTANT: Use emoji markers naturally in your reasoning text. They trigger automatic TTS.

EOF
    ;;
esac

# Add current style and verbosity info
echo "Current Style: ${STYLE_NAME} (${STYLE_MODE})"
echo "Current Verbosity: ${VERBOSITY}"
echo ""
