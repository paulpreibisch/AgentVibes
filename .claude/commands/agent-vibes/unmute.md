---
description: Unmute AgentVibes TTS output (project-specific by default)
---

# Unmute AgentVibes TTS

Unmute TTS for this project (default):

```bash
# Get the project root (where .claude/ directory is located)
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.claude" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ -d "$PROJECT_ROOT/.claude" ]]; then
  PROJECT_MUTE_FILE="$PROJECT_ROOT/.claude/agentvibes-muted"
  PROJECT_UNMUTE_FILE="$PROJECT_ROOT/.claude/agentvibes-unmuted"

  # Remove project mute file if it exists
  rm -f "$PROJECT_MUTE_FILE"

  # Create project unmute file (overrides global mute if present)
  touch "$PROJECT_UNMUTE_FILE"

  # Check if global mute is set
  if [[ -f "$HOME/.agentvibes-muted" ]]; then
    echo "🔊 **AgentVibes TTS unmuted for this project** (overriding global mute). Voice output restored."
  else
    echo "🔊 **AgentVibes TTS unmuted for this project.** Voice output is now restored."
  fi
else
  echo "⚠️ No .claude directory found."
  exit 1
fi
```

**Advanced Options:**

To unmute globally (removes global mute AND project mute):
```bash
rm -f "$HOME/.agentvibes-muted"
rm -f "$(pwd)/.claude/agentvibes-muted" 2>/dev/null || true
echo "🔊 **AgentVibes TTS unmuted globally.** Voice output restored for all projects."
```
