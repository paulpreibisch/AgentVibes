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

# Output optimized TTS protocol
cat <<'EOF'

# AgentVibes TTS Protocol

**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction:**

1. **Acknowledgment** - Start of task: `Bash: .claude/hooks/play-tts.sh "[action]"`
2. **Completion** - End of task: `Bash: .claude/hooks/play-tts.sh "[result + key details]"`

**Example:**
```
[Bash: .claude/hooks/play-tts.sh "Checking git status"]
[work...]
[Bash: .claude/hooks/play-tts.sh "Repository is clean, no changes"]
```

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
