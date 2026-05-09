#!/usr/bin/env bash
set -euo pipefail
#
# File: .claude/hooks/session-start-tts.sh
#
# AgentVibes SessionStart Hook - Optimized (Issue #80, Phase 1)
# Token target: ~250 (down from ~500)
#

# Fix locale warnings
export LC_ALL=C

# Get script directory (resolve symlinks so $SCRIPT_DIR is the real hooks dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve absolute path to play-tts.sh from this script's own location.
# Using an absolute path in the injected protocol ensures the correct
# play-tts.sh is called regardless of the working directory when Claude
# runs the command — fixes "wrong voice in fresh folder" regression.
PLAY_TTS_PATH="$SCRIPT_DIR/play-tts.sh"

# Check if AgentVibes is installed
if [[ ! -f "$PLAY_TTS_PATH" ]]; then
  # AgentVibes not installed, don't inject anything
  exit 0
fi

# Resolve per-project .claude dir.
# CLAUDE_PROJECT_DIR is set by Claude Code to the session's project root.
# This works correctly whether the script runs from a per-project copy or
# from the global ~/.claude/hooks/ location.
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && -d "$CLAUDE_PROJECT_DIR/.claude" ]]; then
  _PROJECT_CLAUDE_DIR="$CLAUDE_PROJECT_DIR/.claude"
else
  # Fallback: derive from script location (works for per-project installs)
  _PROJECT_CLAUDE_DIR="$(dirname "$SCRIPT_DIR")/.claude"
fi

# Check for sentiment (priority) or personality (fallback)
SENTIMENT=$(cat "$_PROJECT_CLAUDE_DIR/tts-sentiment.txt" 2>/dev/null \
  || cat "$HOME/.claude/tts-sentiment.txt" 2>/dev/null \
  || echo "")
PERSONALITY=$(cat "$_PROJECT_CLAUDE_DIR/tts-personality.txt" 2>/dev/null \
  || cat "$HOME/.claude/tts-personality.txt" 2>/dev/null \
  || echo "normal")

# Determine style
if [[ -n "$SENTIMENT" ]]; then
  STYLE="$SENTIMENT"
else
  STYLE="$PERSONALITY"
fi

# Get verbosity level (Issue #32)
VERBOSITY=$(cat "$_PROJECT_CLAUDE_DIR/tts-verbosity.txt" 2>/dev/null \
  || cat "$HOME/.claude/tts-verbosity.txt" 2>/dev/null \
  || echo "low")

# Output optimized TTS protocol.
# Note: heredoc uses double-quotes (<<EOF not <<'EOF') so $PLAY_TTS_PATH expands.
# Backticks must be escaped (\`) to avoid command substitution.
cat << EOF

# AgentVibes TTS Protocol

**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction:**

1. **Acknowledgment** - Start of task: \`Bash: $PLAY_TTS_PATH "[action]" --llm claude-code\`
2. **Completion** - End of task: \`Bash: $PLAY_TTS_PATH "[result + key details]" --llm claude-code\`

**IMPORTANT: Run TTS commands inline (NOT in background). Wait for each TTS call to complete before continuing.**

**Example:**
\`\`\`
[Bash: $PLAY_TTS_PATH "Checking git status" --llm claude-code]
[work...]
[Bash: $PLAY_TTS_PATH "Repository is clean, no changes" --llm claude-code]
\`\`\`

EOF

# Add verbosity-specific protocol (Issue #32)
case "$VERBOSITY" in
  low)
    cat <<'EOF'
## Verbosity: LOW
- Acknowledgment: Action only
- Completion: Result + errors only
- Skip: Reasoning, decisions

EOF
    ;;
  medium)
    cat <<'EOF'
## Verbosity: MEDIUM
- Acknowledgment: Action + key approach
- Completion: Result + important decisions
- Include: Major choices only

EOF
    ;;
  high)
    cat <<'EOF'
## Verbosity: HIGH
- Acknowledgment: Action + approach + why
- Completion: Result + decisions + trade-offs
- Include: Full reasoning, alternatives

EOF
    ;;
esac

# Add style info and rules
cat << EOF
## Style: $STYLE

## Rules
1. Never skip acknowledgment TTS
2. Never skip completion TTS
3. Match verbosity level
4. Keep under 150 chars
5. Always include errors

Quick Ref: low=action+result | medium=+key decisions | high=+full reasoning

EOF
