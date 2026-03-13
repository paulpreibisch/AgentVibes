---
name: bmad-party-mode
description: 'Orchestrates group discussions between all installed BMAD agents, enabling natural multi-agent conversations. Use when user requests party mode.'
---

IMMEDIATELY write the agent context file to signal party mode (disables stop hook TTS — party mode handles TTS inline per agent):
```bash
echo "party-mode" > {project-root}/.bmad-agent-context
```

Then follow the instructions in [workflow.md](workflow.md).
