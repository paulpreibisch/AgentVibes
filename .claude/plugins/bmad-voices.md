---
plugin: bmad-voices
version: 2.0.0
enabled: true
description: Provider-aware voice mappings for BMAD agents
---

# BMAD Voice Plugin

This plugin automatically assigns voices to BMAD agents based on their role and active TTS provider.

## Agent Voice Mappings (Provider-Aware)

| Agent ID | Agent Name | ElevenLabs Voice | Piper Voice | Personality |
|----------|------------|------------------|-------------|-------------|
| pm | John (Product Manager) | Jessica Anne Bogart | en_US-ryan-high | professional |
| dev | James (Developer) | Matthew Schmitz | en_US-joe-medium | normal |
| qa | Quinn (QA) | Aria | en_US-amy-medium | professional |
| architect | Winston (Architect) | Michael | en_GB-alan-medium | normal |
| po | Product Owner | Aria | en_US-amy-medium | professional |
| analyst | Analyst | Matthew Schmitz | kristin | normal |
| sm | Scrum Master | Jessica Anne Bogart | kristin | professional |
| ux-expert | UX Expert | Aria | jenny | normal |
| bmad-master | BMAD Master | Michael | en_GB-alan-medium | zen |
| bmad-orchestrator | Orchestrator | Matthew Schmitz | en_US-ryan-high | professional |

## How It Works

The voice manager automatically selects the appropriate voice based on your active TTS provider:
- **ElevenLabs active**: Uses voices from the "ElevenLabs Voice" column
- **Piper active**: Uses voices from the "Piper Voice" column

This ensures BMAD agents work seamlessly regardless of which provider you're using.

## How to Edit

Simply edit the table above to change voice mappings. The format is:
- **Agent ID**: Must match BMAD's `agent.id` field (pm, dev, qa, etc.)
- **Agent Name**: Display name (for reference only)
- **ElevenLabs Voice**: Voice name for ElevenLabs provider
- **Piper Voice**: Voice model name for Piper provider
- **Personality**: Optional personality to apply (or "normal" for none)

## Commands

- `/agent-vibes:bmad enable` - Enable BMAD voice plugin
- `/agent-vibes:bmad disable` - Disable BMAD voice plugin
- `/agent-vibes:bmad status` - Show plugin status
- `/agent-vibes:bmad edit` - Open this file for editing
- `/agent-vibes:bmad list` - List all agent voice mappings
- `/agent-vibes:bmad set <agent-id> <elevenlabs-voice> <piper-voice> [personality]` - Set voices for specific agent
