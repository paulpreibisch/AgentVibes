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

# Capture project dir NOW while Claude Code has set CLAUDE_PROJECT_DIR.
# Bash tool calls (how Claude actually runs play-tts.sh) do not automatically
# receive CLAUDE_PROJECT_DIR, so we bake it into the injected protocol command
# via --project-dir so the correct per-project config is always found.
CAPTURED_PROJECT_DIR=""
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && -d "$CLAUDE_PROJECT_DIR/.claude" ]]; then
  CAPTURED_PROJECT_DIR="$CLAUDE_PROJECT_DIR"
  _PROJECT_CLAUDE_DIR="$CLAUDE_PROJECT_DIR/.claude"
else
  # Fallback: script lives inside .claude/hooks/, so parent IS .claude/
  _PROJECT_CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
fi

# Build --project-dir flag to embed in TTS commands.
# Sanitize: strip any embedded quotes that would break shell quoting.
PROJECT_DIR_FLAG=""
if [[ -n "$CAPTURED_PROJECT_DIR" ]]; then
  _SAFE_PROJECT_DIR="${CAPTURED_PROJECT_DIR//\"/}"
  PROJECT_DIR_FLAG=" --project-dir \"$_SAFE_PROJECT_DIR\""
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

1. **Acknowledgment** - Start of task: \`Bash: $PLAY_TTS_PATH "[action]" --llm claude-code$PROJECT_DIR_FLAG\`
2. **Completion** - End of task: \`Bash: $PLAY_TTS_PATH "[result + key details]" --llm claude-code$PROJECT_DIR_FLAG\`

**IMPORTANT: Run TTS commands inline (NOT in background). Wait for each TTS call to complete before continuing.**

**Example:**
\`\`\`
[Bash: $PLAY_TTS_PATH "Checking git status" --llm claude-code$PROJECT_DIR_FLAG]
[work...]
[Bash: $PLAY_TTS_PATH "Repository is clean, no changes" --llm claude-code$PROJECT_DIR_FLAG]
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
