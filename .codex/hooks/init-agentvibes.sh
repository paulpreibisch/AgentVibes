#!/usr/bin/env bash
set -euo pipefail
#
# File: .codex/hooks/init-agentvibes.sh
#
# AgentVibes SessionStart Hook for OpenAI Codex CLI
# Ensures AgentVibes config exists and logs session initialization.
# NOTE: Codex hooks are experimental — TTS protocol is in
# .codex/AGENTS.md and MCP tools handle speech.
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Ensure .agentvibes config directory exists
AGENTVIBES_DIR="$PROJECT_ROOT/.agentvibes"
if [[ ! -d "$AGENTVIBES_DIR" ]]; then
  mkdir -p "$AGENTVIBES_DIR"
fi

# Log session start
echo "[AgentVibes] Codex session initialized at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$AGENTVIBES_DIR/codex-sessions.log"

# Check for BMAD party mode
if [[ -f "$PROJECT_ROOT/.bmad-agent-context" ]]; then
  CONTEXT=$(cat "$PROJECT_ROOT/.bmad-agent-context")
  echo "[AgentVibes] BMAD context: $CONTEXT"
fi

exit 0
