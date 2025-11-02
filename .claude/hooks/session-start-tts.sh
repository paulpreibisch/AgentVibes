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

# Add current style info
echo "Current Style: ${STYLE_NAME} (${STYLE_MODE})"
echo ""
