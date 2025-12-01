# 🎤 AgentVibes

> **Finally! Your agents can talk back!**
>
> 🌐 **[agentvibes.org](https://agentvibes.org)**
>
> Professional text-to-speech for **Claude Code**, **Claude Desktop**, and **Warp Terminal** - **ElevenLabs AI**, **Piper TTS (Free!)**, or **macOS Say (Built-in!)**

[![npm version](https://img.shields.io/npm/v/agentvibes)](https://www.npmjs.com/package/agentvibes)
[![Test Suite](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml)
[![Publish](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version**: v2.14.11

---

## 🚀 Quick Links

| I want to... | Go here |
|--------------|---------|
| **Install AgentVibes** | [Quick Start Guide](docs/quick-start.md) |
| **Set up on Windows (Claude Desktop)** | [Windows Setup Guide](mcp-server/WINDOWS_SETUP.md) |
| **Use natural language** | [MCP Setup](docs/mcp-setup.md) |
| **Switch voices** | [Voice Library](docs/voice-library.md) |
| **Learn Spanish while coding** | [Language Learning Mode](docs/language-learning-mode.md) |
| **Fix issues** | [Troubleshooting](docs/troubleshooting.md) |

---

## ✨ What is AgentVibes?

**AgentVibes adds lively voice narration to your Claude AI sessions!**

Whether you're coding in Claude Code, chatting in Claude Desktop, or using Warp Terminal - AgentVibes brings AI to life with professional voices and personalities.

### 🎯 Key Features

- 🎙️ **Verbosity Control** - **NEW!** Control how much Claude speaks (LOW: minimal, MEDIUM: balanced, HIGH: full transparency)
- 🎙️ **AgentVibes MCP** - **NEW!** Natural language control for Claude Code, Claude Desktop & Warp (no slash commands!)
- 📚 **Language Learning Mode** - **NEW!** Learn a second language while you program (e.g., Learn Spanish as you code!)
- 🔊 **SSH Audio Optimization** - **NEW!** Auto-detects remote sessions and eliminates static (VS Code Remote SSH, cloud dev)
- 🎭 **Multi-Provider Support** - Choose ElevenLabs (150+ premium voices), Piper TTS (50+ free voices), or macOS Say (100+ built-in voices)
- 🌍 **30+ Languages** - Multilingual support with native voice quality
- 🎙️ **27+ Professional AI Voices** - Character voices, accents, and unique personalities
- 🎭 **19 Built-in Personalities** - From sarcastic to flirty, pirate to dry humor
- 💬 **Advanced Sentiment System** - Apply personality styles to ANY voice without changing it
- 🔌 **Enhanced BMAD Plugin** - Auto voice switching for BMAD agents with multilingual support
- 🔊 **Live Audio Feedback** - Hear task acknowledgments and completions in any language
- 🎵 **Voice Preview & Replay** - Listen before you choose, replay last 10 TTS messages
- 🆓 **Free Option Available** - Use Piper TTS with no API key required
- ⚡ **One-Command Install** - Get started in seconds

---

## 📑 Table of Contents

### Getting Started
- [🚀 Quick Start](#-quick-start) - Install in 3 steps
- [✨ What is AgentVibes?](#-what-is-agentvibes) - Overview & key features
- [📰 Latest Release](#-latest-release) - What's new
- [🪟 Windows Setup Guide for Claude Desktop](mcp-server/WINDOWS_SETUP.md) - Complete Windows installation with WSL & Python

### AgentVibes MCP (Natural Language Control)
- [🎙️ AgentVibes MCP Overview](#%EF%B8%8F-agentvibes-mcp) - **Easiest way** - Natural language commands
  - [For Claude Desktop](docs/mcp-setup.md#for-claude-desktop) - Windows/WSL setup, Python requirements
  - [For Warp Terminal](docs/mcp-setup.md#for-warp-terminal) - Warp configuration
  - [For Claude Code](docs/mcp-setup.md#for-claude-code) - Project-specific setup

### Core Features
- [🎤 Commands Reference](#-commands-reference) - All available commands
- [🎙️ Verbosity Control](#%EF%B8%8F-verbosity-control) - **NEW!** Control how much Claude speaks (low/medium/high)
- [📚 Language Learning Mode](#-language-learning-mode) - **NEW!** Learn Spanish while you program
- [🎭 Personalities vs Sentiments](#-personalities-vs-sentiments) - Two systems explained
- [🗣️ Voice Library](#%EF%B8%8F-voice-library) - 27+ professional voices
- [🔌 BMAD Plugin](#-bmad-plugin) - Auto voice switching for BMAD agents

### Advanced Topics
- [📦 Installation Structure](#-installation-structure) - What gets installed
- [💡 Common Workflows](#-common-workflows) - Quick examples
- [🔧 Advanced Features](#-advanced-features) - Custom voices & personalities
- [🔊 Remote Audio Setup](#-remote-audio-setup) - Play TTS from remote servers
- [🔬 Technical Deep Dive](docs/technical-deep-dive.md) - How AgentVibes works under the hood
- [❓ Troubleshooting](#-troubleshooting) - Common issues & fixes

### Additional Resources
- [🔗 Useful Links](#-useful-links) - Voice typing & AI tools
- [🔄 Updating](#-updating) - Keep AgentVibes current
- [🍎 macOS Testing](docs/macos-testing.md) - Automated testing on macOS with GitHub Actions
- [🙏 Credits](#-credits) - Acknowledgments
- [🤝 Contributing](#-contributing) - Show support

---

## 📰 Latest Release

**[v2.14.11 - macOS SSH Audio Tunnel Support](https://github.com/paulpreibisch/AgentVibes/releases/tag/v2.14.11)** 🎉

AgentVibes v2.14.11 enables macOS TTS audio to play through remote Windows speakers when accessing a Mac via SSH. Perfect for testing macOS features on cloud Macs (e.g., Scaleway) without owning one!

**Key Highlights:**
- 🔊 **SSH Audio Tunneling** - macOS TTS now plays on Windows speakers when SSHed into Mac
- 🍎 **Cloud Mac Testing** - Test macOS features without owning a Mac (Scaleway recommended)
- 🎵 **SSH Login Greeting** - Hear "Connected to Mac OS" on login to confirm tunnel works
- 📖 **Full Documentation** - Step-by-step guide for SSH PulseAudio tunnel setup
- ✅ **Backwards Compatible** - Local Mac users unaffected (still uses `afplay`)

💡 **Tip:** If `npx agentvibes` shows an older version or missing commands, clear your npm cache: `npm cache clean --force && npx agentvibes@latest --help`

[→ View All Releases](https://github.com/paulpreibisch/AgentVibes/releases)

[↑ Back to top](#-table-of-contents)

---

## 🎙️ AgentVibes MCP

Agent Vibes was originally created to give the Claude Code assistant a voice! Simply install it with an npx command in your terminal, and Claude Code can talk back to you.

We've now enhanced this capability by adding an MCP (Model Context Protocol) server. This integration exposes Agent Vibes' functionality directly to your AI assistant, allowing you to configure and control Agent Vibes using natural language instead of typing "/" slash commands.

Setting it up is straightforward: just add the MCP server to your Claude Code configuration files.

But the convenience doesn't stop there. With the MCP server in place, Claude Desktop can now use Agent Vibes too! We've even tested it successfully with Warp, an AI assistant that helps you navigate Windows and other operating systems.

We're thrilled about this expansion because it means Claude Desktop and Warp can finally talk back as well!

If you decide to use the MCP server on Claude Desktop, after configuration, give Claude Desktop this command: "every time i give you a command, speak the acknowledgement using agentvibes and the confirmation about what you completed, when done"—and watch the magic happen!

**🎯 Control AgentVibes with natural language - no slash commands to remember!**

Just say "Switch to Aria voice" or "Speak in Spanish" instead of typing commands.

**Works in:** Claude Desktop, Claude Code, Warp Terminal

**[→ View Complete MCP Setup Guide](docs/mcp-setup.md)** - Full setup for all platforms, configuration examples, available tools, and MCP vs slash commands comparison

[↑ Back to top](#-table-of-contents)

---

## 🚀 Quick Start

### 🍎 macOS Users - Read This First!

**REQUIRED:** Install bash 5.x before using AgentVibes:
```bash
brew install bash  # One-time setup
```

macOS ships with bash 3.2 (from 2007) which lacks modern bash features AgentVibes needs. After installing bash 5.x via Homebrew, everything works perfectly!

---

Get AgentVibes running in 3 steps: **Install** → **Choose Provider** (Piper/ElevenLabs) → **Enable Voice**

**Quick Install:**
```bash
npx agentvibes install
```

**[→ View Complete Quick Start Guide](docs/quick-start.md)** - Full installation options, provider setup, and activation steps

[↑ Back to top](#-table-of-contents)

---

## 🎭 Choose Your Voice Provider

**ElevenLabs** (premium AI voices), **Piper TTS** (free, works offline on Linux/WSL), or **macOS Say** (free, built-in on Mac) - pick one and switch anytime.

| Provider | Platform | Cost | Quality | Setup |
|----------|----------|------|---------|-------|
| **macOS Say** | macOS only | Free (built-in) | ⭐⭐⭐⭐ | Zero config |
| **Piper** | Linux/WSL | Free | ⭐⭐⭐⭐ | Auto-downloads |
| **ElevenLabs** | All | Free tier + paid | ⭐⭐⭐⭐⭐ | API key required |

On macOS, the native `say` provider is automatically detected and recommended!

**[→ Provider Comparison Guide](docs/providers.md)**

[↑ Back to top](#-table-of-contents)

---

## 🎤 Commands Reference

AgentVibes provides **50+ slash commands** and **natural language MCP equivalents**.

**Quick Examples:**
```bash
# Voice control
/agent-vibes:switch Aria              # Or: "Switch to Aria voice"
/agent-vibes:list                     # Or: "List all voices"

# Personality & sentiment
/agent-vibes:personality pirate       # Or: "Set personality to pirate"
/agent-vibes:sentiment sarcastic      # Or: "Apply sarcastic sentiment"

# Language & learning
/agent-vibes:set-language spanish     # Or: "Speak in Spanish"
/agent-vibes:learn                    # Or: "Enable learning mode"
```

**[→ View Complete Command Reference](docs/commands.md)** - All voice, system, personality, sentiment, language, and BMAD commands with MCP equivalents

[↑ Back to top](#-table-of-contents)

---

## 🎙️ Verbosity Control

**Control how much Claude speaks while working!** 🔊

Choose from three verbosity levels:

### LOW (Minimal) 🔇
- Acknowledgments only (start of task)
- Completions only (end of task)
- Perfect for quiet work sessions

### MEDIUM (Balanced) 🤔
- Acknowledgments + completions
- Major decisions ("I'll use grep to search")
- Key findings ("Found 12 instances")
- Perfect for understanding decisions without full narration

### HIGH (Maximum Transparency) 💭
- All reasoning ("Let me search for all instances")
- All decisions ("I'll use grep for this")
- All findings ("Found it at line 1323")
- Perfect for learning mode, debugging complex tasks

**Quick Commands:**
```bash
/agent-vibes:verbosity           # Show current level
/agent-vibes:verbosity high      # Maximum transparency
/agent-vibes:verbosity medium    # Balanced
/agent-vibes:verbosity low       # Minimal (default)
```

**MCP Equivalent:**
```
"Set verbosity to high"
"What's my current verbosity level?"
```

💡 **How it works:** Claude uses emoji markers (💭 🤔 ✓) in its text, and AgentVibes automatically detects and speaks them based on your verbosity level. No manual TTS calls needed!

⚠️ **Note:** Changes take effect on next Claude Code session restart.

[↑ Back to top](#-table-of-contents)

---

## 📚 Language Learning Mode

**🎯 Learn Spanish (or 30+ languages) while you program!** 🌍

Every task acknowledgment plays **twice** - first in English, then in your target language. Context-based learning while you code!

**[→ View Complete Learning Mode Guide](docs/language-learning-mode.md)** - Full tutorial, quick start, commands, speech rate control, supported languages, and pro tips

[↑ Back to top](#-table-of-contents)

---

## 🎭 Personalities vs Sentiments

**Two ways to add personality:**

- **🎪 Personalities** - Changes BOTH voice AND speaking style (e.g., `pirate` personality = Pirate Marshal voice + pirate speak)
- **💭 Sentiments** - Keeps your current voice, only changes speaking style (e.g., Aria voice + sarcastic sentiment)

**[→ Complete Personalities Guide](docs/personalities.md)** - All 19 personalities, create custom ones

[↑ Back to top](#-table-of-contents)

---

## 🗣️ Voice Library

AgentVibes includes **27 unique ElevenLabs voices** with multilingual support.

💡 **Tip:** Click voice names to hear samples on ElevenLabs!
🎧 **Try in Claude Code:** `/agent-vibes:preview` to hear all voices
🌍 **Multilingual:** Use Antoni, Rachel, Domi, or Bella for automatic language detection

**[→ View Complete Voice Library](docs/voice-library.md)** - All 27 voices with clickable samples, descriptions, and best use cases

[↑ Back to top](#-table-of-contents)

---

## 🔌 BMAD Plugin

**Automatically switch voices when using BMAD agents!**

The BMAD plugin detects when you activate a BMAD agent (e.g., `/BMad:agents:pm`) and automatically uses the assigned voice for that role.

**Version Support**: AgentVibes supports both BMAD v4 and v6-alpha installations. Version detection is automatic - just install BMAD and AgentVibes will detect and configure itself correctly!

**[→ View Complete BMAD Documentation](docs/bmad-plugin.md)** - All agent mappings, language support, plugin management, and customization

[↑ Back to top](#-table-of-contents)

---

## 📦 Installation Structure

**What gets installed:** Commands, hooks, personalities, and plugins in `.claude/` directory.

**[→ View Complete Installation Structure](docs/installation-structure.md)** - Full directory tree, file descriptions, and settings storage

[↑ Back to top](#-table-of-contents)

---

## 💡 Common Workflows

```bash
# Switch voices
/agent-vibes:list                    # See all voices
/agent-vibes:switch Aria             # Change voice

# Try personalities
/agent-vibes:personality pirate      # Pirate voice + style
/agent-vibes:personality list        # See all 19 personalities

# Speak in other languages
/agent-vibes:set-language spanish    # Speak in Spanish
/agent-vibes:set-language list       # See 30+ languages

# Replay audio
/agent-vibes:replay                  # Replay last message
```

**💡 Tip:** Using MCP? Just say "Switch to Aria voice" or "Speak in Spanish" instead of typing commands.

[↑ Back to top](#-table-of-contents)

---

## 🔧 Advanced Features

AgentVibes supports **custom personalities** and **custom voices**.

**Quick Examples:**
```bash
# Create custom personality
/agent-vibes:personality add mycustom

# Add custom ElevenLabs voice
/agent-vibes:add "My Voice" abc123xyz789

# Use in custom output styles
[Bash: .claude/hooks/play-tts.sh "Starting" "Aria"]
```

**[→ View Advanced Features Guide](docs/advanced-features.md)** - Custom personalities, custom voices, and more

[↑ Back to top](#-table-of-contents)

---

## 🔊 Remote Audio Setup

**Running AgentVibes on a remote server?** No problem!

✅ **Auto-detects SSH sessions** - Works with VS Code Remote SSH, regular SSH, cloud dev environments
✅ **Zero configuration** - Audio optimizes automatically
✅ **No static/clicking** - Clean playback through SSH tunnels

**[→ Remote Audio Setup Guide](docs/remote-audio-setup.md)** - Full PulseAudio configuration details

[↑ Back to top](#-table-of-contents)

---

## 🔗 Useful Links

### Voice & AI Tools

- 🎤 **[WhisperTyping](https://whispertyping.com/)** - Fast voice-to-text typing for developers
- 🗣️ **[OpenWhisper (Azure)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/whisper-overview)** - Microsoft's speech-to-text service
- 🎙️ **[ElevenLabs](https://elevenlabs.io/)** - Premium AI voice synthesis
- 🆓 **[Piper TTS](https://github.com/rhasspy/piper)** - Free offline neural TTS
- 🤖 **[Claude Code](https://claude.com/claude-code)** - AI coding assistant
- 🎭 **[BMAD METHOD](https://github.com/bmad-code-org/BMAD-METHOD)** - Multi-agent framework

### AgentVibes Resources

- 📊 **[Usage Dashboard](https://elevenlabs.io/app/usage)** - Monitor ElevenLabs usage
- 💳 **[Pricing Page](https://elevenlabs.io/pricing)** - ElevenLabs plans
- 🐛 **[Issues](https://github.com/paulpreibisch/AgentVibes/issues)** - Report bugs
- 📝 **[Changelog](https://github.com/paulpreibisch/AgentVibes/releases)** - Version history
- 📰 **[Technical Deep Dive - LinkedIn Article](https://www.linkedin.com/pulse/agent-vibes-add-voice-claude-code-deep-dive-npx-paul-preibisch-8zrcc/)** - How AgentVibes works under the hood

[↑ Back to top](#-table-of-contents)

---

## ❓ Troubleshooting

**Common Issues:**

**No Audio Playing?**
1. Check API key: `echo $ELEVENLABS_API_KEY`
2. Verify hook is installed: `ls -la ~/.claude/hooks/user-prompt-submit.sh`
3. Test: `/agent-vibes:sample Aria`

**Commands Not Found?**
```bash
npx agentvibes install --yes
```

**[→ View Complete Troubleshooting Guide](docs/troubleshooting.md)** - Solutions for audio issues, command problems, MCP errors, voice issues, and more

[↑ Back to top](#-table-of-contents)

---

## 🔄 Updating

**Quick Update (From Claude Code):**
```bash
/agent-vibes:update
```

**Alternative Methods:**
```bash
# Via npx
npx agentvibes update --yes

# Via npm (if installed globally)
npm update -g agentvibes && agentvibes update --yes
```

**Check Version:** `/agent-vibes:version`

**[→ View Complete Update Guide](docs/updating.md)** - All update methods, version checking, what gets updated, and troubleshooting

[↑ Back to top](#-table-of-contents)

---

## ⚠️ Important Disclaimers

**API Costs & Usage:**
- ElevenLabs usage may incur charges based on your subscription tier and character usage
- Users are solely responsible for their own API costs and usage
- Free tier: 10,000 characters/month | Paid plans: $5-99/month
- See [ElevenLabs Pricing](https://elevenlabs.io/pricing) for current rates

**Third-Party Services:**
- This project integrates with ElevenLabs (TTS API), Piper TTS (local processing), and macOS Say (system built-in)
- We are **not affiliated with, endorsed by, or officially connected** to ElevenLabs, Anthropic, Apple, or Claude
- ElevenLabs and Piper TTS are subject to their respective terms of service

**Privacy & Data:**
- **ElevenLabs**: Your text prompts are sent to ElevenLabs servers for processing
- **Piper TTS**: All processing happens locally on your machine, no external data transmission
- **macOS Say**: All processing happens locally using Apple's built-in speech synthesis
- Review [ElevenLabs Privacy Policy](https://elevenlabs.io/privacy) for their data handling

**Software License:**
- Provided "as-is" under Apache 2.0 License without warranty of any kind
- See [LICENSE](LICENSE) file for full terms
- No liability for data loss, bugs, service interruptions, or any damages

**Use at Your Own Risk:**
- This is open-source software maintained by the community
- Always test in development before production use
- Monitor your API usage and costs regularly

[↑ Back to top](#-table-of-contents)

---

## 🙏 Credits

**Built with ❤️ by [Paul Preibisch](https://github.com/paulpreibisch)**

- 🐦 Twitter: [@997Fire](https://x.com/997Fire)
- 💼 LinkedIn: [paul-preibisch](https://www.linkedin.com/in/paul-preibisch/)
- 🌐 GitHub: [paulpreibisch](https://github.com/paulpreibisch)

**Powered by:**
- [ElevenLabs](https://elevenlabs.io/) - Premium AI voices
- [Piper TTS](https://github.com/rhasspy/piper) - Free neural voices
- [Claude Code](https://claude.com/claude-code) - AI coding assistant
- Licensed under Apache 2.0

**Special Thanks:**
- 💡 [Claude Code Hooks Mastery](https://github.com/disler/claude-code-hooks-mastery) by [@disler](https://github.com/disler) - Hooks inspiration
- 🤖 [BMAD METHOD](https://github.com/bmad-code-org/BMAD-METHOD) - Multi-agent framework with auto voice switching integration

[↑ Back to top](#-table-of-contents)

---

## 🤝 Contributing

If AgentVibes makes your coding more fun:
- ⭐ **Star this repo** on GitHub
- 🐦 **Tweet** and tag [@997Fire](https://x.com/997Fire)
- 🎥 **Share videos** of Claude with personality
- 💬 **Tell dev friends** about voice-powered AI

---

**Ready to give Claude a voice? Install now and code with personality! 🎤✨**

[↑ Back to top](#-table-of-contents)

