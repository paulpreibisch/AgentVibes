---
command: agent-vibes:bmad-party
description: Control BMAD party mode voice integration (enable/disable/status)
handler: bash .claude/hooks/bmad-party-manager.sh
---

Enable or disable BMAD party mode voice integration where each agent speaks with their unique voice during multi-agent conversations.

## Usage

- `/agent-vibes:bmad-party` - Show current status
- `/agent-vibes:bmad-party status` - Show current status
- `/agent-vibes:bmad-party enable` - Enable party mode voices
- `/agent-vibes:bmad-party disable` - Disable party mode voices

## What is Party Mode Voice Integration?

When BMAD's party mode (`/bmad:core:workflows:party-mode`) is active, multiple agents collaborate on your questions. With this feature enabled, each agent speaks their responses with their unique assigned voice:

- **Winston (Architect)** speaks with Michael's voice
- **John (PM)** speaks with Jessica Anne Bogart's voice
- **Amelia (Dev)** speaks with Matthew Schmitz's voice
- And so on...

## Auto-Enable Behavior

**This feature is automatically enabled when:**
1. BMAD v6 is installed (`.bmad/_cfg/agent-manifest.csv` exists)
2. AgentVibes BMAD voice plugin is enabled

**No manual configuration needed!** Just run party mode and each agent will speak with their voice.

## How to Disable

If you prefer party mode without voice switching:

```bash
/agent-vibes:bmad-party disable
```

This creates `.agentvibes/bmad/bmad-party-mode-disabled.flag` to opt-out.

## How It Works

The integration detects agent responses in the format:

```
[Agent Name]: Their dialogue here
```

When detected, it:
1. Extracts the agent's display name (e.g., "Winston", "John")
2. Maps it to their agent ID using `.bmad/_cfg/agent-manifest.csv`
3. Looks up their voice from `.agentvibes/bmad/bmad-voices.md`
4. Speaks their dialogue with that specific voice

## Example

**Before (silent text):**
```
[Winston]: I recommend microservices for scalability
[John]: But monolith is faster to market for MVP
[Amelia]: I can implement either approach
```

**After (with voices):**
```
[Winston speaks with Michael voice]: I recommend microservices for scalability
[John speaks with Jessica Anne Bogart voice]: But monolith is faster to market for MVP
[Amelia speaks with Matthew Schmitz voice]: I can implement either approach
```

## Voice Mappings

See current agent-to-voice mappings:
```bash
/agent-vibes:bmad status
```

Edit voice assignments in:
```
.agentvibes/bmad/bmad-voices.md
```

## Requirements

- BMAD v6-alpha or later
- AgentVibes with BMAD plugin enabled
- Piper or ElevenLabs TTS provider configured

## Troubleshooting

**Party mode voices not working?**

1. Check BMAD is installed: `ls .bmad/_cfg/agent-manifest.csv`
2. Check voice plugin enabled: `ls .agentvibes/bmad/bmad-voices-enabled.flag`
3. Check party mode not disabled: `ls .agentvibes/bmad/bmad-party-mode-disabled.flag`
4. View status: `/agent-vibes:bmad-party status`

**Wrong voices playing?**

Check voice mappings: `/agent-vibes:bmad status`

Edit mappings in: `.claude/config/bmad-voices.md`

## Related Commands

- `/bmad:core:workflows:party-mode` - Start BMAD party mode
- `/agent-vibes:bmad` - Manage BMAD voice plugin
- `/agent-vibes:switch` - Change your default voice
- `/agent-vibes:provider` - Switch TTS provider

---

**Implementation:** Issue #33
**Auto-enabled:** Yes (for BMAD users)
**Opt-out:** Available via disable command
