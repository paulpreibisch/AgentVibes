---
scope: user
description: Configure RDP mode for optimized audio over remote desktop (on/off/status)
---

Configure AgentVibes RDP mode for optimized audio streaming over remote desktop connections.

RDP mode reduces audio bandwidth by:
- Converting to mono (1 channel instead of 2)
- Lowering sample rate to 22kHz (from 44.1kHz)
- Limiting bitrate to 64kbps

Usage:
- `/agent-vibes:rdp on` - Enable RDP mode
- `/agent-vibes:rdp off` - Disable RDP mode
- `/agent-vibes:rdp status` - Check current status

When enabled, this setting persists across sessions by creating a config file.

IMPORTANT: After changing RDP mode, you must either:
1. Restart Claude Code, OR
2. Run: `source ~/.bashrc` (or equivalent for your shell)

This is necessary because the AGENTVIBES_RDP_MODE environment variable needs to be set in your shell session.
