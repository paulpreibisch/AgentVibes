---
description: Update AgentVibes to the latest version
argument-hint: [--yes]
---

Updates AgentVibes to the latest version from the npm registry.

This will update:
- All slash commands
- TTS scripts and hooks
- Personality templates (new ones added, existing ones updated)
- Output styles

Your custom settings and voice configurations will be preserved.

Usage examples:
- `/agent-vibes:update` - Update with confirmation prompt
- `/agent-vibes:update --yes` - Update without confirmation

!bash npx agent-vibes update $ARGUMENTS
