---
description: Unmute AgentVibes TTS output
---

# Unmute AgentVibes TTS

Remove the mute flag files to restore TTS output:

```bash
rm -f "$HOME/.agentvibes-muted"
rm -f "$(pwd)/.claude/agentvibes-muted"
```

After running the command, confirm to the user:

🔊 **AgentVibes TTS unmuted.** Voice output is now restored.
