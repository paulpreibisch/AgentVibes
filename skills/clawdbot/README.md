# AgentVibes Clawdbot Skill

**One-line setup for Clawdbot + AgentVibes local-gen-tts integration**

## Quick Start

```bash
curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/skills/clawdbot/setup.sh | \
  CLAWDBOT_WORKSPACE=~/clawd \
  AGENTVIBES_SSH_HOST=android \
  bash
```

## What This Does

Automatically configures your Clawdbot instance to speak all responses via AgentVibes with:
- ✅ Local TTS generation on remote device (Android/Linux)
- ✅ Full voice effects (reverb, background music)
- ✅ Automatic triggering (no manual commands)
- ✅ Secure SSH transmission

## Documentation

See [SKILL.md](SKILL.md) for complete documentation.

## Requirements

- Clawdbot installed
- AgentVibes on remote device
- SSH access between server and remote

## Support

Issues: https://github.com/paulpreibisch/AgentVibes/issues  
Docs: https://agentvibes.org/clawdbot
