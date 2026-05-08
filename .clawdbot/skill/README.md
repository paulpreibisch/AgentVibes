# 🎤 AgentVibes OpenClaw Skill

> **Give your voiceless server a voice!** Professional text-to-speech for OpenClaw AI agents running on remote servers, VPS, Mac Minis, or isolated hardware.

[![npm version](https://img.shields.io/npm/v/agentvibes)](https://www.npmjs.com/package/agentvibes)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Published by**: Paul Preibisch ([@997Fire](https://x.com/997Fire))
**ClawHub**: https://clawhub.ai/paulpreibisch/agentvibes-openclaw-skill
**Full Documentation**: https://github.com/paulpreibisch/AgentVibes#-openclaw-integration

---

## 🎯 What This Skill Does

AgentVibes adds **professional voice output** to your OpenClaw AI agent using intelligent text streaming—no matter where your agent is running (Mac Mini, VPS, old PC, cloud server).

### The Problem

You've wisely deployed OpenClaw on isolated hardware for security. But now:
- Your server has no speakers
- Your AI agent is mute
- You're stuck reading text responses
- Mobile development is clunky

### The Solution

**Text streaming architecture**: Server sends text → Your device generates voice locally

**Benefits:**
- ✅ 99.9% less bandwidth than audio streaming (200KB vs 800MB per 100 responses)
- ✅ Works on Linux, macOS, Android
- ✅ 50+ voices in 30+ languages (free, offline)
- ✅ Maintains security isolation
- ✅ Walk, commute, or multitask while your agent talks

---

## 🚀 Quick Start

### 1. Install AgentVibes on Your OpenClaw Server

```bash
# On your remote server where OpenClaw runs
npx agentvibes install
```

This installs:
- Piper TTS engine (free, offline)
- 50+ professional AI voices
- Voice management slash commands
- Text streaming receiver support

### 2. Test Voice Output

```bash
# Test that TTS works
/agent-vibes:sample
```

You should hear audio through your device speakers!

### 3. Customize Your Voice (Optional)

```bash
# List available voices
/agent-vibes:list

# Preview voices before choosing
/agent-vibes:preview 5

# Switch to your preferred voice
/agent-vibes:switch en_US-amy-medium
```

---

## 📱 Mobile Setup (Walk & Talk)

Want your OpenClaw agent to speak to you while walking? Set up the **AgentVibes Receiver**:

### For Android (Termux)

```bash
# On your Android phone
pkg install termux-api openssh python
pip install agentvibes

# On your server, configure SSH host
echo "android" > ~/.claude/ssh-remote-host.txt
```

Now text streams to your phone, generates voice locally, and plays through headphones—no button presses needed!

**Full mobile setup**: https://github.com/paulpreibisch/AgentVibes#-openclaw-integration

---

## 🎭 Available Voices

### English Voices
- `en_US-lessac-medium` - Default male (clear, professional)
- `en_US-amy-medium` - Friendly female
- `en_US-ryan-high` - High quality male
- `en_GB-alan-medium` - British male

### Romance Languages
- `es_ES-davefx-medium` - Spanish (Spain)
- `fr_FR-siwis-medium` - French female
- `it_IT-riccardo-x_low` - Italian male
- `pt_BR-faber-medium` - Portuguese (Brazilian)

### Asian Languages
- `ja_JP-ayanami-medium` - Japanese female
- `zh_CN-huayan-x_low` - Chinese female
- `ko_KR-kss-medium` - Korean female

**And 40+ more voices in 30+ languages!**

---

## 🎮 Voice Control Commands

All commands available in OpenClaw chat:

### Voice Selection
```bash
/agent-vibes:list              # Show all voices
/agent-vibes:preview 5         # Preview first 5 voices
/agent-vibes:switch <voice>    # Change voice
/agent-vibes:get               # Show current voice
```

### Playback Control
```bash
/agent-vibes:mute              # Silence TTS
/agent-vibes:unmute            # Restore voice
/agent-vibes:replay            # Replay last audio
/agent-vibes:replay 2          # Replay 2nd-to-last
```

### Advanced
```bash
/agent-vibes:provider list     # Show TTS providers
/agent-vibes:set-speed 1.2     # Adjust speech rate
/agent-vibes:personality       # Set voice personality
/agent-vibes:verbosity high    # Control how much AI speaks
```

---

## 🔧 Common Use Cases

### 1. Code Reviews on the Go
Walk to a meeting while your AI agent reviews PRs and explains issues verbally.

### 2. Hands-Free Development
Cook dinner while monitoring deployment status or test results via voice.

### 3. Commute Learning
Study new frameworks during your commute—have your agent explain concepts aloud.

### 4. Multi-Language Development
Switch to Spanish, French, or Japanese voices to hear code comments in native languages.

### 5. Accessibility
Fully accessible voice interface for developers who benefit from audio feedback.

---

## 🔒 Security Considerations

**⚠️ CRITICAL**: If running OpenClaw on a remote server, read the security guide:

https://github.com/paulpreibisch/AgentVibes/blob/master/docs/security-hardening-guide.md

**Required security measures:**
- SSH key-only authentication
- Non-standard SSH port (e.g., 2222)
- Firewall configuration (UFW/iptables)
- Fail2ban for intrusion prevention
- VPN tunneling (Tailscale recommended)

**Never expose OpenClaw directly to the internet without hardening.**

---

## 🌍 Deployment Options

AgentVibes works on all isolated OpenClaw deployments:

### Mac Mini
```bash
# On your Mac Mini
npx agentvibes install
```

### VPS (AWS, DigitalOcean, Database Mart, etc.)
```bash
# On your cloud server
npx agentvibes install
```

### Old PC/Laptop (Repurposed Hardware)
```bash
# On your dedicated machine
npx agentvibes install
```

### Docker Container
```bash
# Inside your OpenClaw container
npx agentvibes install
```

---

## 📊 Bandwidth Comparison

**Traditional audio streaming:**
- 8MB per response
- 800MB per 100 responses
- Expensive over cellular

**AgentVibes text streaming:**
- 2KB per response
- 200KB per 100 responses
- Negligible cellular cost

**Savings: 99.975% bandwidth reduction**

---

## 🆘 Troubleshooting

### No Audio Output

```bash
# Check if Piper is installed
which piper

# Test audio directly
echo "Hello world" | piper --model en_US-lessac-medium --output_file test.wav
aplay test.wav  # Linux
afplay test.wav # macOS
```

### Voice Not Found

```bash
# List installed voices
/agent-vibes:list

# Download voice if missing
npx agentvibes install
```

### SSH Audio Issues

```bash
# Verify SSH connection
ssh your-server "echo Connected"

# Check receiver script
ls ~/.termux/agentvibes-play.sh  # Android
ls ~/.agentvibes/play-remote.sh  # Linux/macOS
```

**Full troubleshooting guide**: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/troubleshooting.md

---

## 📚 Additional Documentation

### Full Guides
- **Main README**: https://github.com/paulpreibisch/AgentVibes
- **OpenClaw Integration**: https://github.com/paulpreibisch/AgentVibes#-openclaw-integration
- **Security Hardening**: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/security-hardening-guide.md
- **Voice Library**: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/voice-library.md
- **Troubleshooting**: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/troubleshooting.md

### Community
- **GitHub Issues**: https://github.com/paulpreibisch/AgentVibes/issues
- **GitHub Discussions**: https://github.com/paulpreibisch/AgentVibes/discussions
- **Website**: https://agentvibes.org

---

## 🤝 Contributing

AgentVibes is open source (Apache 2.0)! Contributions welcome:

- 🐛 Report bugs
- 💡 Suggest features
- 🌍 Add voice translations
- 📝 Improve documentation
- 🔧 Submit pull requests

**Repository**: https://github.com/paulpreibisch/AgentVibes

---

## 📄 License

Apache License 2.0 - see [LICENSE](https://github.com/paulpreibisch/AgentVibes/blob/master/LICENSE)

---

## 🙏 Credits

**Created by**: Paul Preibisch
**Twitter/X**: [@997Fire](https://x.com/997Fire)
**Website**: https://agentvibes.org

**Powered by**:
- [Piper TTS](https://github.com/rhasspy/piper) - Fast, offline neural TTS
- [Hugging Face Voice Models](https://huggingface.co/rhasspy/piper-voices) - 50+ AI voices
- [OpenClaw](https://openclaw.ai) - AI assistant framework

---

**⭐ If you find AgentVibes useful, please star the repo on GitHub!**

https://github.com/paulpreibisch/AgentVibes

Thank you for using AgentVibes! 🎤✨
