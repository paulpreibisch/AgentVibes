# 🎤 AgentVibes

> **Finally! Your agents can talk back!**
>
> 🌐 **[agentvibes.org](https://agentvibes.org)**
>
> Professional text-to-speech for **Claude Code**, **Claude Desktop**, and **Warp Terminal** - **Piper TTS (Free!)** or **macOS Say (Built-in!)**

[![npm version](https://img.shields.io/npm/v/agentvibes)](https://www.npmjs.com/package/agentvibes)
[![Test Suite](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml)
[![Publish](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version**: v2.17.8

---

## 🚀 Quick Links

| I want to... | Go here |
|--------------|---------|
| **Install AgentVibes** (just `npx`, no git!) | [Quick Start Guide](docs/quick-start.md) |
| **Understand what I need** (spoiler: just Node.js!) | [Prerequisites](#-prerequisites) |
| **Set up on Windows (Claude Desktop)** | [Windows Setup Guide](mcp-server/WINDOWS_SETUP.md) |
| **Use natural language** | [MCP Setup](docs/mcp-setup.md) |
| **Switch voices** | [Voice Library](docs/voice-library.md) |
| **Learn Spanish while coding** | [Language Learning Mode](docs/language-learning-mode.md) |
| **Fix issues** (git-lfs? MCP tokens? Read this!) | [Troubleshooting](docs/troubleshooting.md) & [FAQ](#-frequently-asked-questions-faq) |

---

## ✨ What is AgentVibes?

**AgentVibes adds lively voice narration to your Claude AI sessions!**

Whether you're coding in Claude Code, chatting in Claude Desktop, or using Warp Terminal - AgentVibes brings AI to life with professional voices and personalities.

### 🎯 Key Features

- 🎙️ **Verbosity Control** - **NEW!** Control how much Claude speaks (LOW: minimal, MEDIUM: balanced, HIGH: full transparency)
- 🎙️ **AgentVibes MCP** - **NEW!** Natural language control for Claude Code, Claude Desktop & Warp (no slash commands!)
- 📚 **Language Learning Mode** - **NEW!** Learn a second language while you program (e.g., Learn Spanish as you code!)
- 🔊 **SSH Audio Optimization** - **NEW!** Auto-detects remote sessions and eliminates static (VS Code Remote SSH, cloud dev)
- 🎭 **Multi-Provider Support** - Choose Piper TTS (50+ free voices) or macOS Say (100+ built-in voices)
- 🌍 **30+ Languages** - Multilingual support with native voice quality
- 🎙️ **27+ Professional AI Voices** - Character voices, accents, and unique personalities
- 🎭 **19 Built-in Personalities** - From sarcastic to flirty, pirate to dry humor
- 💬 **Advanced Sentiment System** - Apply personality styles to ANY voice without changing it
- 🔌 **Enhanced BMAD Plugin** - Auto voice switching for BMAD agents with multilingual support
- 🔊 **Live Audio Feedback** - Hear task acknowledgments and completions in any language
- 🎵 **Voice Preview & Replay** - Listen before you choose, replay last 10 TTS messages
- 🆓 **Free Option Available** - Use Piper TTS with no API key required
- ⚡ **One-Command Install** - Get started in seconds

### 🤗 Hugging Face AI Voice Models

**AgentVibes' Piper TTS uses 100% Hugging Face-trained AI voice models** from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices).

**What are Hugging Face voice models?**

Hugging Face voice models are pre-trained artificial intelligence models hosted on the Hugging Face Model Hub platform, designed to convert text into human-like speech (Text-to-Speech or TTS) or perform other speech tasks like voice cloning and speech-to-speech translation. They're accessible via their Transformers library for easy use in applications like voice assistants, audio generation, and more.

**Key Benefits:**
- 🎯 **Human-like Speech** - VITS-based neural models for natural pronunciation and intonation
- 🌍 **35+ Languages** - Multilingual support with native accents
- 🆓 **100% Open Source** - All Piper voices are free HF models (Tacotron2, FastSpeech2, VITS)
- 🔧 **Developer-Friendly** - Fine-tune, customize, or deploy for various audio projects
- ⚡ **Offline & Fast** - No API keys, no internet needed once installed

All 50+ Piper voices AgentVibes provides are sourced from Hugging Face's open-source AI voice models, ensuring high-quality, natural-sounding speech synthesis across all supported platforms.

---

## 📑 Table of Contents

### Getting Started
- [🚀 Quick Start](#-quick-start) - Install in 3 steps
- [📋 Prerequisites](#-prerequisites) - **NEW!** What you need (spoiler: just Node.js!)
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
- [❓ FAQ](#-frequently-asked-questions-faq) - **NEW!** Common questions answered (git-lfs, MCP tokens, installation)
- [🍎 macOS Testing](docs/macos-testing.md) - Automated testing on macOS with GitHub Actions
- [🙏 Credits](#-credits) - Acknowledgments
- [🤝 Contributing](#-contributing) - Show support

---

## 📰 Latest Release

**[v2.17.8 - Repository Cleanup](https://github.com/paulpreibisch/AgentVibes/releases/tag/v2.17.8)** 🧹
AgentVibes v2.17.8 is a maintenance release focusing on repository organization and cleanup. This release removes 12 outdated files including old release notes from versions 2.4.0 through 2.16.0, legacy setup scripts, and temporary documentation files. The cleanup reduces repository size by over 3,000 lines while preserving all active documentation and functionality. **Key Highlights:** - 🧹 **Repository Cleanup** - Removed 8 outdated release notes files (v2.4.0-v2.16.0) - 📝 **Documentation Consolidation** - All release history now maintained in single RELEASE_NOTES.md - 🗑️ **Legacy Script Removal** - Cleaned up obsolete VS Code color scripts and Ubuntu RDP audio setup - ✅ **Test Coverage** - Added installer page flow test, all 236 tests passing
AgentVibes v2.17.8 is a maintenance release focusing on repository organization and cleanup. This release removes 12 outdated files including old release notes from versions 2.4.0 through 2.16.0, legacy setup scripts, and temporary documentation files. The cleanup reduces repository size by over 3,000 lines while preserving all active documentation and functionality.

**Key Highlights:**
- 🧹 **Repository Cleanup** - Removed 8 outdated release notes files (v2.4.0-v2.16.0)
- 📝 **Documentation Consolidation** - All release history now maintained in single RELEASE_NOTES.md
- 🗑️ **Legacy Script Removal** - Cleaned up obsolete VS Code color scripts and Ubuntu RDP audio setup
- ✅ **Test Coverage** - Added installer page flow test, all 236 tests passing

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

Get AgentVibes running in 3 steps: **Install** → **Choose Provider** (Piper/macOS) → **Enable Voice**

**Quick Install:**
```bash
npx agentvibes install
```

**[→ View Complete Quick Start Guide](docs/quick-start.md)** - Full installation options, provider setup, and activation steps

[↑ Back to top](#-table-of-contents)

---

## 📋 Prerequisites

### For Users (Installing & Running AgentVibes)

**✅ Required:**
- **Node.js** ≥16.0 (`node --version`)
- That's it! No git required, no git-lfs required, no repo cloning needed.

**❌ NOT Required:**
- ❌ Git or git-lfs (you're installing via npm, not cloning)
- ❌ Repository cloning (npm handles everything)
- ❌ Build tools (pre-built package ready to use)

**📦 Installation Methods:**

| Method | Command | Use Case |
|--------|---------|----------|
| **✅ RECOMMENDED: NPM** | `npx agentvibes install` | Users wanting to use AgentVibes |
| **⚠️ Developer Clone** | `git clone ...` | **Only for contributing code** |

**💡 Why npm installation?**
- Zero git operations - npm downloads pre-built package
- No large file downloads - audio generated on-demand
- Instant setup - works in seconds
- No git-lfs, no cloning, no build steps

### For Developers (Contributing to AgentVibes)

**Only if contributing code to the project:**
- Node.js 16+
- Git (no git-lfs needed - repo has no large files)
- Familiarity with `npm link` for local development

**Developer installation:**
```bash
git clone https://github.com/paulpreibisch/AgentVibes.git
cd AgentVibes
npm install
npm link
```

[↑ Back to top](#-table-of-contents)

---

## 📋 System Requirements

AgentVibes requires certain system dependencies for optimal audio processing and playback. Requirements vary by operating system and TTS provider.

### Core Requirements (All Platforms)

| Tool | Required For | Why It's Needed |
|------|-------------|-----------------|
| **Node.js** ≥16.0 | All platforms | Runtime for AgentVibes installer and MCP server |
| **Bash** ≥5.0 | macOS | Modern bash features (macOS ships with 3.2 from 2007) |
| **Python** 3.10+ | Piper TTS, MCP server | Runs Piper voice engine and MCP server |

### Audio Processing Tools (Recommended)

| Tool | Status | Purpose | Impact if Missing |
|------|--------|---------|------------------|
| **sox** | Recommended | Audio effects (reverb, EQ, pitch, compression) | No audio effects, still works |
| **ffmpeg** | Recommended | Background music mixing, audio padding, RDP compression | No background music or RDP optimization |

### Platform-Specific Requirements

#### 🐧 Linux / WSL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y sox ffmpeg python3-pip pipx

# Fedora/RHEL
sudo dnf install -y sox ffmpeg python3-pip pipx

# Arch Linux
sudo pacman -S sox ffmpeg python-pip python-pipx
```

**Audio Playback** (one of the following):
- `paplay` (PulseAudio - usually pre-installed)
- `aplay` (ALSA - fallback)
- `mpg123` (fallback)
- `mpv` (fallback)

**Why these tools?**
- **sox**: Applies audio effects defined in `.claude/config/audio-effects.cfg` (reverb, pitch shifting, EQ, compression)
- **ffmpeg**: Mixes background music tracks, adds silence padding to prevent audio cutoff, compresses audio for RDP/SSH sessions
- **paplay/aplay**: Plays generated TTS audio files
- **pipx**: Isolated Python environment manager for Piper TTS installation

#### 🍎 macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Required: Modern bash
brew install bash

# Recommended: Audio processing tools
brew install sox ffmpeg pipx
```

**Audio Playback**:
- `afplay` (built-in - always available)
- `say` (built-in - for macOS TTS provider)

**Why these tools?**
- **bash 5.x**: macOS ships with bash 3.2 which lacks associative arrays and other modern features AgentVibes uses
- **sox**: Same audio effects processing as Linux
- **ffmpeg**: Same background music and padding as Linux
- **afplay**: Built-in macOS audio player
- **say**: Built-in macOS text-to-speech (alternative to Piper)

#### 🪟 Windows (WSL Required)

AgentVibes requires WSL (Windows Subsystem for Linux) on Windows. Follow the [Windows Setup Guide](mcp-server/WINDOWS_SETUP.md) for complete installation.

```powershell
# Install WSL from PowerShell (Administrator)
wsl --install -d Ubuntu
```

Then follow Linux requirements above inside WSL.

**Why WSL?**
- AgentVibes uses bash scripts extensively
- Audio routing from WSL to Windows requires PulseAudio configuration
- See [Windows Setup Guide](mcp-server/WINDOWS_SETUP.md) for detailed audio setup

### TTS Provider Requirements

#### Piper TTS (Free, Offline)
- **Python** 3.10+
- **pipx** (for isolated installation)
- **Disk Space**: ~50MB per voice model
- **Internet**: Only for initial voice downloads

```bash
# Installed automatically by AgentVibes
pipx install piper-tts
```

#### macOS Say (Built-in, macOS Only)
- No additional requirements
- 100+ voices pre-installed on macOS
- Use: `/agent-vibes:provider switch macos`

### Verifying Your Setup

```bash
# Check all dependencies
node --version    # Should be ≥16.0
python3 --version # Should be ≥3.10
bash --version    # Should be ≥5.0 (macOS users!)
sox --version     # Optional but recommended
ffmpeg -version   # Optional but recommended
pipx --version    # Required for Piper TTS

# Check audio playback (Linux/WSL)
paplay --version || aplay --version

# Check audio playback (macOS)
which afplay      # Should return /usr/bin/afplay
```

### What Happens Without Optional Dependencies?

| Missing Tool | Impact | Workaround |
|-------------|--------|------------|
| sox | No audio effects (reverb, EQ, pitch) | TTS still works, just no effects |
| ffmpeg | No background music, no audio padding | TTS still works, audio may cut off slightly early |
| paplay/aplay | No audio playback on Linux | Install at least one audio player |

**All TTS generation still works** - optional tools only enhance the experience!

[↑ Back to top](#-table-of-contents)

---

## 🎭 Choose Your Voice Provider

**Piper TTS** (free, works offline on Linux/WSL) or **macOS Say** (free, built-in on Mac) - pick one and switch anytime.

| Provider | Platform | Cost | Quality | Setup |
|----------|----------|------|---------|-------|
| **macOS Say** | macOS only | Free (built-in) | ⭐⭐⭐⭐ | Zero config |
| **Piper** | Linux/WSL | Free | ⭐⭐⭐⭐ | Auto-downloads |

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

AgentVibes includes professional AI voices from Piper TTS and macOS Say with multilingual support.

🎧 **Try in Claude Code:** `/agent-vibes:preview` to hear all voices
🌍 **Multilingual:** Use Antoni, Rachel, Domi, or Bella for automatic language detection

**[→ View Complete Voice Library](docs/voice-library.md)** - All 27 voices with clickable samples, descriptions, and best use cases

[↑ Back to top](#-table-of-contents)

---

## 🔌 BMAD Plugin

**Automatically switch voices when using BMAD agents!**

The BMAD plugin detects when you activate a BMAD agent (e.g., `/BMad:agents:pm`) and automatically uses the assigned voice for that role.

**Version Support**: AgentVibes supports both BMAD v4 and v6-alpha installations. Version detection is automatic - just install BMAD and AgentVibes will detect and configure itself correctly!

### 🔊 TTS Injection: How It Works

BMAD uses a **loosely-coupled injection system** for voice integration. BMAD source files contain placeholder markers that AgentVibes replaces with speaking instructions during installation:

**Before Installation (BMAD Source):**
```xml
<rules>
  <r>ALWAYS communicate in {communication_language}...</r>
  <!-- TTS_INJECTION:agent-tts -->
  <r>Stay in character until exit selected</r>
</rules>
```

**After Installation (with AgentVibes enabled):**
```xml
<rules>
  <r>ALWAYS communicate in {communication_language}...</r>
  - When responding to user messages, speak your responses using TTS:
      Call: `.claude/hooks/bmad-speak.sh '{agent-id}' '{response-text}'`
      Where {agent-id} is your agent type (pm, architect, dev, etc.)

  - Auto Voice Switching: AgentVibes automatically switches to the voice
      assigned for your agent role when activated
  <r>Stay in character until exit selected</r>
</rules>
```

**After Installation (with TTS disabled):**
```xml
<rules>
  <r>ALWAYS communicate in {communication_language}...</r>
  <r>Stay in character until exit selected</r>
</rules>
```

This design means **any TTS provider** can integrate with BMAD by replacing these markers with their own instructions!

**[→ View Complete BMAD Documentation](docs/bmad-plugin.md)** - All agent mappings, language support, TTS injection details, plugin management, and customization

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

# Add custom Piper voice
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
- 🆓 **[Piper TTS](https://github.com/rhasspy/piper)** - Free offline neural TTS
- 🤖 **[Claude Code](https://claude.com/claude-code)** - AI coding assistant
- 🎭 **[BMAD METHOD](https://github.com/bmad-code-org/BMAD-METHOD)** - Multi-agent framework

### AgentVibes Resources

- 🐛 **[Issues](https://github.com/paulpreibisch/AgentVibes/issues)** - Report bugs
- 📝 **[Changelog](https://github.com/paulpreibisch/AgentVibes/releases)** - Version history
- 📰 **[Technical Deep Dive - LinkedIn Article](https://www.linkedin.com/pulse/agent-vibes-add-voice-claude-code-deep-dive-npx-paul-preibisch-8zrcc/)** - How AgentVibes works under the hood

[↑ Back to top](#-table-of-contents)

---

## ❓ Troubleshooting

**Common Issues:**

**❌ Error: "git-lfs is not installed"**

**AgentVibes does NOT require git-lfs.** This error suggests:

1. **Wrong installation method** - Use npm, not git clone:
   ```bash
   # ✅ CORRECT - Use this:
   npx agentvibes install

   # ❌ WRONG - Don't clone unless contributing:
   git clone https://github.com/paulpreibisch/AgentVibes.git
   ```

2. **Different project** - You may be in a BMAD-METHOD or other repo that uses git-lfs

3. **Global git config** - Your git may have lfs enabled globally:
   ```bash
   git config --global --list | grep lfs
   ```

**Solution:** Use `npx agentvibes install` - no git operations needed!

---

**No Audio Playing?**
1. Verify hook is installed: `ls -la .claude/hooks/session-start-tts.sh`
2. Test: `/agent-vibes:sample Aria`

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

## ❓ Frequently Asked Questions (FAQ)

### Installation & Setup

**Q: Does AgentVibes require git-lfs?**
**A:** **NO.** AgentVibes has zero git-lfs requirement. Use `npx agentvibes install` - no git operations needed.

**Q: Do I need to clone the GitHub repository?**
**A:** **NO** (unless you're contributing code). Normal users should use `npx agentvibes install`. Repository cloning is only for developers who want to contribute to the project.

**Q: Why is the GitHub repo so large?**
**A:** The repo includes demo files and development dependencies (node_modules). The actual npm package you download is **< 50MB** and optimized for users.

**Q: What's the difference between npm install and git clone?**
**A:**
- `npx agentvibes install` → **For users** - Downloads pre-built package, zero git operations, instant setup
- `git clone ...` → **For developers only** - Full source code, development setup, contributing code

**Q: I saw an error about git-lfs, is something wrong?**
**A:** You're likely:
1. Using wrong installation method (use `npx` not `git clone`)
2. In a different project directory that uses git-lfs
3. Have global git config with lfs enabled

AgentVibes itself does NOT use or require git-lfs.

### Features & Usage

**Q: Does MCP consume tokens from my context window?**
**A:** **YES.** Every MCP tool schema adds to the context window. AgentVibes MCP is designed to be minimal (~1500-2000 tokens), but if you're concerned about token usage, you can use slash commands instead of MCP.

**Q: What's the difference between using MCP vs slash commands?**
**A:**
- **MCP**: Natural language ("Switch to Aria voice"), uses ~1500-2000 context tokens
- **Slash commands**: Explicit commands (`/agent-vibes:switch Aria`), zero token overhead

Both do the exact same thing - MCP is more convenient, slash commands are more token-efficient.

**Q: Is AgentVibes just a bash script?**
**A:** No. AgentVibes includes:
- Multi-provider TTS abstraction (Piper TTS, macOS Say)
- Voice management system with 50+ voices
- Personality & sentiment system
- Language learning mode with bilingual playback
- Audio effects processing (reverb, EQ, compression)
- MCP server for natural language control
- BMAD integration for multi-agent voice switching
- Remote audio optimization for SSH/RDP sessions

**Q: Can I use AgentVibes without BMAD?**
**A:** **YES.** AgentVibes works standalone. BMAD integration is optional - only activates if you install BMAD separately.

**Q: What are the audio dependencies?**
**A:**
- **Required**: Node.js 16+, Python 3.10+ (for Piper TTS)
- **Optional**: sox (audio effects), ffmpeg (background music, padding)
- All TTS generation works without optional dependencies - they just enhance the experience

### Troubleshooting

**Q: Why isn't Claude speaking?**
**A:** Common causes:
1. Hook not installed - Run `npx agentvibes install --yes`
2. Audio player missing - Install `sox` and `ffmpeg`
3. TTS protocol not enabled in settings
4. Test with `/agent-vibes:sample Aria`

**Q: Can I use this on Windows?**
**A:** Yes, but requires WSL (Windows Subsystem for Linux). See [Windows Setup Guide](mcp-server/WINDOWS_SETUP.md).

**Q: How do I reduce token usage?**
**A:**
1. Use slash commands instead of MCP (zero context token overhead)
2. Set verbosity to LOW (`/agent-vibes:verbosity low`)
3. Disable BMAD integration if not using it

[↑ Back to top](#-table-of-contents)

---

## ⚠️ Important Disclaimers

**API Costs & Usage:**
- Usage is completely free with Piper TTS and Mac Say (no API costs)
- Users are solely responsible for their own API costs and usage


**Third-Party Services:**
- This project integrates with Piper TTS (local processing) and macOS Say (system built-in)
- We are **not affiliated with, endorsed by, or officially connected** to Anthropic, Apple, or Claude
- Piper TTS is subject to its terms of service

**Privacy & Data:**
- **Piper TTS**: All processing happens locally on your machine, no external data transmission
- **macOS Say**: All processing happens locally using Apple's built-in speech synthesis

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

