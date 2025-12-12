---
description: Show AgentVibes status, settings, and available commands with diagnostics
scope: project
---

# AgentVibes Help & Status

Shows current TTS status, settings, and helpful commands.

Automatically runs diagnostics and suggests fixes if issues are detected.

## Usage

```bash
/agent-vibes:help
```

## What It Shows

- ✅ Current TTS status (working/issues/muted)
- 🔧 Current settings (mode, voice, provider, verbosity)
- 📋 Available commands
- 🔍 Automatic diagnostics (hidden unless issues found)
- 💡 Suggested fixes if problems detected
- 🔗 Help resources and documentation

## Implementation

```bash
#!/bin/bash
bash .agentvibes/hooks/help.sh
```
