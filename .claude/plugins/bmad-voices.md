---
plugin: bmad-voices
version: 1.0.0
enabled: true
description: Voice mappings for BMAD agents
---

# BMAD Voice Plugin

This plugin automatically assigns voices to BMAD agents based on their role.

## Agent Voice Mappings

| Agent ID | Agent Name | Voice | Personality |
|----------|------------|-------|-------------|
| pm | John (Product Manager) | Matthew Schmitz | professional |
| dev | James (Developer) | Jessica Anne Bogart | normal |
| qa | Quinn (QA) | Ralf Eisend | professional |
| architect | Winston (Architect) | Michael | normal |
| po | Product Owner | Amy | professional |
| analyst | Analyst | Lutz Laugh | normal |
| sm | Scrum Master | Ms. Walker | professional |
| ux-expert | UX Expert | Aria | normal |
| bmad-master | BMAD Master | Aria | zen |
| bmad-orchestrator | Orchestrator | Ms. Walker | professional |

## How to Edit

Simply edit the table above to change voice mappings. The format is:
- **Agent ID**: Must match BMAD's `agent.id` field
- **Agent Name**: Display name (for reference only)
- **Voice**: Must be a valid AgentVibes voice name
- **Personality**: Optional personality to apply (or "normal" for none)

## Commands

- `/agent-vibes:bmad enable` - Enable BMAD voice plugin
- `/agent-vibes:bmad disable` - Disable BMAD voice plugin
- `/agent-vibes:bmad status` - Show plugin status
- `/agent-vibes:bmad edit` - Open this file for editing
- `/agent-vibes:bmad list` - List all agent voice mappings
- `/agent-vibes:bmad set <agent-id> <voice> [personality]` - Set voice for specific agent
