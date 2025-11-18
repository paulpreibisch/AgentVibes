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
| pm | John (Product Manager) | Matthew Schmitz | en_US-ryan-high | professional |
| dev | Amelia (Developer) | Aria | en_US-amy-medium | normal |
| analyst | Mary (Business Analyst) | Jessica Anne Bogart | kristin | normal |
| architect | Winston (Architect) | Michael | en_GB-alan-medium | normal |
| sm | Bob (Scrum Master) | Matthew Schmitz | en_US-joe-medium | professional |
| tea | Murat (Test Architect) | Michael | en_US-arctic-medium | normal |
| tech-writer | Paige (Technical Writer) | Aria | jenny | normal |
| ux-designer | Sally (UX Designer) | Jessica Anne Bogart | en_US-lessac-medium | normal |
| frame-expert | Saif (Visual Designer) | Matthew Schmitz | en_GB-alan-medium | normal |
| bmad-master | BMad Master | Michael | en_US-danny-low | zen |

## How It Works

The voice manager automatically selects the appropriate voice based on your active TTS provider:
- **ElevenLabs active**: Uses voices from the "ElevenLabs Voice" column
- **Piper active**: Uses voices from the "Piper Voice" column

This ensures BMAD agents work seamlessly regardless of which provider you're using.

### Supports Both Display Names and Agent IDs

The `bmad-speak.sh` script accepts both formats:

**Party Mode** (multiple agents, uses display names):
```bash
.claude/hooks/bmad-speak.sh "Winston" "I recommend microservices for scalability"
```

**Individual Agents** (single agent sessions, uses agent IDs):
```bash
.claude/hooks/bmad-speak.sh "architect" "I recommend microservices for scalability"
```

Both formats map to the same voice configuration based on the agent ID in the table above. This allows BMAD to use customizable display names while maintaining stable voice mappings.

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
