#!/usr/bin/env bash
set -eo pipefail
#
# File: .claude/hooks/stop-tts.sh
#
# AgentVibes Stop Hook — Auto-speak Claude's response via TTS
# Reads last_assistant_message from stdin JSON and speaks it.
#

# Fix locale warnings
export LC_ALL=C

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if AgentVibes play-tts.sh exists
if [[ ! -f "$SCRIPT_DIR/play-tts.sh" ]]; then
  exit 0
fi

# Check if muted
if [[ -f "${CLAUDE_PROJECT_DIR:-.}/.claude/tts-muted.txt" ]] || [[ -f "$HOME/.claude/tts-muted.txt" ]]; then
  MUTED=$(cat "${CLAUDE_PROJECT_DIR:-.}/.claude/tts-muted.txt" 2>/dev/null || cat "$HOME/.claude/tts-muted.txt" 2>/dev/null || echo "")
  if [[ "$MUTED" == "true" ]]; then
    exit 0
  fi
fi

# Read JSON from stdin
INPUT=$(cat)

# Extract last_assistant_message using node (available in Claude Code env)
MESSAGE=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(d);
      const msg = j.last_assistant_message || '';
      // Strip markdown before TTS — prevent "asterisk asterisk" being spoken literally
      const stripped = msg
        .replace(/\*\*/g, '').replace(/\*/g, '')
        .replace(/`[^`]*`/g, '').replace(/`/g, '')
        .replace(/#+\s*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');  // [text](url) → text
      // Truncate to 150 chars for TTS
      const trimmed = stripped.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      process.stdout.write(trimmed.length > 150 ? trimmed.slice(0, 147) + '...' : trimmed);
    } catch(e) {
      process.exit(0);
    }
  });
" 2>/dev/null) || exit 0

# Skip if empty or too short
if [[ -z "$MESSAGE" ]] || [[ ${#MESSAGE} -lt 2 ]]; then
  exit 0
fi

# Check if a BMAD agent is active — route through bmad-speak.sh for per-agent voice
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
BMAD_CONTEXT="$PROJECT_DIR/.bmad-agent-context"
BMAD_SPEAK="$PROJECT_DIR/.claude/hooks/bmad-speak.sh"

if [[ -f "$BMAD_CONTEXT" ]] && [[ -f "$BMAD_SPEAK" ]]; then
  AGENT_ID=$(head -1 "$BMAD_CONTEXT" 2>/dev/null | tr -d '[:space:]')

  # Party mode: context file contains "party-mode" — skip stop hook TTS entirely.
  # Party mode handles its own TTS inline via bmad-speak.sh per agent.
  if [[ "$AGENT_ID" == "party-mode" ]]; then
    exit 0
  fi

  if [[ -n "$AGENT_ID" ]] && [[ "$AGENT_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    # Single agent mode: use bmad-speak for per-agent voice/pretext
    bash "$BMAD_SPEAK" "$AGENT_ID" "$MESSAGE" &
    exit 0
  fi
fi

# Default: speak with global voice (run in background so we don't block Claude)
bash "$SCRIPT_DIR/play-tts.sh" "$MESSAGE" &

exit 0
