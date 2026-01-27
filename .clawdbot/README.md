# Clawdbot Integration

AgentVibes TTS integration for Clawdbot - the AI assistant framework.

## What is Clawdbot?

Clawdbot is a powerful AI assistant framework that connects Claude AI to messaging platforms (WhatsApp, Telegram, Discord, etc.) and provides extensible skills.

**Website**: https://clawd.bot
**GitHub**: https://github.com/clawdbot/clawdbot

## AgentVibes + Clawdbot

This integration provides Clawdbot with professional TTS capabilities using AgentVibes:

- **Free & Offline**: No API costs, works without internet
- **50+ Voices**: Professional AI voices in 30+ languages
- **Remote SSH Support**: Audio tunnels from server to local machine
- **Zero Setup**: Automatic when AgentVibes is installed

## Installation

```bash
npx agentvibes install
```

That's it! AgentVibes is ready to use.

## Usage from Clawdbot

Once installed, use AgentVibes for TTS:

```bash
npx agentvibes speak "Hello from Clawdbot"
```

## Features

- **Automatic Detection**: Clawdbot automatically uses AgentVibes when available
- **Voice Selection**: 50+ voices across 30+ languages
- **SSH Tunneling**: Audio plays on local machine from remote servers
- **Zero Config**: Works out of the box once AgentVibes is installed

## Remote SSH Audio

When running Clawdbot on a remote server, set up PulseAudio tunneling so audio plays on your local machine:

**Quick Setup:**

1. **Remote server** (`~/.bashrc`):
```bash
export PULSE_SERVER=tcp:localhost:14713
```

2. **Local machine** (`~/.ssh/config`):
```
Host your-server
    RemoteForward 14713 localhost:14713
```

3. **Connect and test**:
```bash
ssh your-server
agentvibes speak "Testing remote audio"
```

**Full guide**: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/remote-audio-setup.md

## Documentation

- **Skill Documentation**: [skill/SKILL.md](skill/SKILL.md)
- **AgentVibes Docs**: https://agentvibes.org
- **Clawdbot Docs**: https://docs.clawd.bot

## Architecture

```
Clawdbot Request
    ↓
AgentVibes Skill (this)
    ↓
AgentVibes CLI (agentvibes speak)
    ↓
Piper TTS Engine
    ↓
PulseAudio → SSH Tunnel → Local Speakers
```

## Development

The skill is automatically packaged with AgentVibes npm releases. To update:

1. Edit `skill/SKILL.md`
2. Test with Clawdbot
3. Commit to AgentVibes repo
4. Publish new AgentVibes version

## Support

- **AgentVibes Issues**: https://github.com/paulpreibisch/AgentVibes/issues
- **Clawdbot Issues**: https://github.com/clawdbot/clawdbot/issues

## License

Apache 2.0 - Same as AgentVibes
