# 🎤 AgentVibes

> **Finally! Your agents can talk back!**
>
> 🌐 **[agentvibes.org](https://agentvibes.org)**
>
> Professional text-to-speech for **Claude Code**, **Claude Desktop**, **Warp Terminal**, and **OpenClaw** - **Soprano** (Neural), **Piper TTS** (Free!), **macOS Say** (Built-in!), or **Windows SAPI** (Zero Setup!)

[![npm version](https://img.shields.io/npm/v/agentvibes)](https://www.npmjs.com/package/agentvibes)
[![Test Suite](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml)
[![Publish](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version**: v3.6.0

---

## 🚀 Quick Links

| I want to... | Go here |
|--------------|---------|
| **Install AgentVibes** (just `npx`, no git!) | [Quick Start Guide](docs/quick-start.md) |
| **Run Claude Code on Android** | [Android/Termux Setup](#-android--termux) |
| **Secure OpenClaw on Remote Server** | [Security Hardening Guide](docs/security-hardening-guide.md) ⚠️ |
| **Understand what I need** | [Prerequisites](#-prerequisites) |
| **Set up on Windows (Native)** | [Windows Native Setup](WINDOWS-SETUP.md) |
| **Set up on Windows (Claude Desktop/WSL)** | [Windows WSL Guide](mcp-server/WINDOWS_SETUP.md) |
| **Use with OpenClaw** | [OpenClaw Integration](#-openclaw-integration) |
| **Use natural language** | [MCP Setup](docs/mcp-setup.md) |
| **Switch voices** | [Voice Library](docs/voice-library.md) |
| **Fix issues** (git-lfs? MCP tokens? Read this!) | [Troubleshooting](docs/troubleshooting.md) & [FAQ](#-frequently-asked-questions-faq) |

---

## ✨ What is AgentVibes?

**AgentVibes adds lively voice narration to your Claude AI sessions!**

Whether you're coding in Claude Code, chatting in Claude Desktop, using Warp Terminal, or running OpenClaw - AgentVibes brings AI to life with professional voices and personalities.

---

## 🌟 NEW FEATURE HIGHLIGHTS

### 🎤 Agent Vibes v1.0 Voice Browser

![Voice Browser Banner](docs/installation-screenshots/voice-browser-screenshot.png)

**🎤 Browse, Sample & Install 914 Voices in Real-Time**

```bash
npx agentvibes-voice-browser
```

The new **AgentVibes Voice Browser** is an interactive console application that lets you:

- 🎧 **Hear Before You Choose** - Real-time audio sampling with one keypress
- ⭐ **Mark Your Favorites** - Build your personal voice collection
- 🔍 **Smart Search** - Filter by name, personality, accent, or gender
- 📦 **One-Click Install** - Press 'I' to instantly switch to any voice
- 🎨 **Beautiful Interface** - Stunning terminal UI powered by blessed.js

**914 Total Voices:**
- 904 High-Quality Piper TTS Speakers (libritts-high model)
- 10 Hand-Curated Personality Voices

**Perfect for:**
- Finding your ideal AI voice
- Exploring voice characteristics
- Quick voice switching
- Building favorite collections

Launch now: `npx agentvibes-voice-browser`

---

### 💬 Intro Text (Pretext) - Your Personal AI Branding

**Add custom prefixes to every TTS announcement!**

```bash
npx agentvibes config intro-text
```

Transform generic AI responses into your personal brand:

**Before:**
```
"Starting analysis of the codebase..."
```

**After (with "FireBot: " intro text):**
```
"FireBot: Starting analysis of the codebase..."
```

**Perfect for:**
- 🤖 **Personal AI Branding** - Make Claude sound like your custom assistant
- 🏢 **Team Identity** - Company bots with branded voices
- 🎮 **Character Roleplay** - Gaming assistants with character names
- 🎓 **Teaching Contexts** - Professor Bot, Tutor AI, etc.

**Features:**
- Up to 50 characters
- UTF-8 and emoji support 🎉
- Set during installation or anytime after
- Works with all TTS providers
- Applies to every single announcement

**Examples:**
- `"JARVIS: "` - Iron Man style
- `"🤖 Assistant: "` - With emoji
- `"CodeBot: "` - Development assistant
- `"Chef AI: "` - Cooking helper

Configure now: `npx agentvibes config intro-text`

---

### 🎵 Custom Background Music - Complete Audio Control

**Upload your own background music with battle-tested security!**

```bash
npx agentvibes config music
```

Replace the default background tracks with your own audio files for complete sonic branding.

**Supported Formats:**
- 🎵 MP3 (.mp3)
- 🎵 WAV (.wav)
- 🎵 OGG (.ogg)
- 🎵 M4A (.m4a)

**Security First:**
- ✅ **180+ attack variations tested** - Path traversal, symlinks, Unicode tricks
- ✅ **100% attack rejection rate** - Every malicious attempt blocked
- ✅ **OWASP CWE-22 compliant** - Industry-standard security
- ✅ **7 validation layers** - Defense-in-depth architecture
- ✅ **File ownership verification** - Only your files accepted
- ✅ **Magic number validation** - Real audio files only
- ✅ **Secure storage** - 600 permissions, restricted directory

**Smart Validation:**
- Recommended duration: 30-90 seconds (optimal looping)
- Maximum: 300 seconds (5 minutes)
- Maximum size: 50MB
- Automatic format detection
- Duration warnings for non-optimal lengths

**Perfect for:**
- 🎸 **Team Audio Branding** - Company theme music
- 🎮 **Gaming Sessions** - Epic background tracks
- 🎼 **Personal Playlists** - Your favorite instrumental
- 🎹 **Focus Music** - Lo-fi, classical, ambient

**Features:**
- Preview before setting
- One-command upload
- Works with all TTS providers
- Loops seamlessly under voice
- Easy restore to defaults

**Menu Options:**
1. Change music - Upload new audio file
2. Remove music - Clear custom music
3. Reset to default - Restore built-in tracks (16 genres)
4. Enable/Disable - Toggle background music
5. Preview current - Sample your music

Configure now: `npx agentvibes config music`

**Security Certified:** See full audit report at `docs/security/SECURITY-AUDIT.md`

---

### 🎯 Key Features

**🌟 NEW IN v3.6.0 — Voice Explorer Release:**
- 🎤 **Voice Browser** - Browse, sample, and install 914 voices interactively
- 🏷️ **Friendly Voice Names** - "Ryan" instead of "en_US-libritts_r-medium-speaker-123"
- 💬 **Intro Text (Pretext)** - Custom prefix for all TTS ("FireBot: Starting...")
- 🎵 **Custom Background Music** - Upload your own audio files with battle-tested security
- 🎨 **Interactive Installer** - Preview voices and music during installation
- 🛡️ **Security Hardening** - 180+ attack variations tested, 100% blocked, OWASP compliant

**🪟 NEW IN v3.5.5 — Native Windows Support:**
- 🖥️ **Windows Native TTS** - Soprano, Piper, and Windows SAPI providers. No WSL required!
- 🎵 **Background Music** - 16 genre tracks mixed under voice
- 🎛️ **Reverb & Audio Effects** - 5 reverb levels via ffmpeg
- 🔊 **Verbosity Control** - High, Medium, or Low settings
- 🎨 **Beautiful Installer** - `npx agentvibes install` or `.\setup-windows.ps1`

**⚡ v3.4.0 Highlights:**
- 🎤 **Soprano TTS Provider** - Ultra-fast neural TTS with 20x CPU, 2000x GPU acceleration (thanks [@nathanchase](https://github.com/nathanchase)!)
- 🛡️ **Security Hardening** - 9.5/10 score with comprehensive validation and timeouts
- 🌐 **Environment Intelligence** - PulseAudio tunnel auto-detection for SSH scenarios

**⚡ Core Features:**
- ⚡ **One-Command Install** - Get started in 30 seconds (`npx agentvibes install` or `.\setup-windows.ps1` without Node.js)
- 🎭 **Multi-Provider Support** - Soprano (neural), Piper TTS (50+ free voices), macOS Say (100+ built-in), or Windows SAPI
- 🎙️ **27+ Professional AI Voices** - Character voices, accents, and unique personalities
- 🎙️ **Verbosity Control** - Choose how much Claude speaks (LOW, MEDIUM, HIGH)
- 🎙️ **AgentVibes MCP** - Natural language control ("Switch to Aria voice") for Claude Code, Desktop & Warp
- 🔊 **SSH Audio Optimization** - Auto-detects remote sessions and eliminates static (VS Code Remote SSH, cloud dev)

**🎭 Personalization:**
- 🎭 **19 Built-in Personalities** - From sarcastic to flirty, pirate to dry humor
- 💬 **Advanced Sentiment System** - Apply personality styles to ANY voice without changing it
- 🎵 **Voice Preview & Replay** - Listen before you choose, replay last 10 TTS messages

**🚀 Integrations & Power Features:**
- 🔌 **Enhanced BMAD Plugin** - Auto voice switching for BMAD agents with multilingual support
- 🔊 **Live Audio Feedback** - Hear task acknowledgments and completions in any language
- 🌍 **30+ Languages** - Multilingual support with native voice quality
- 🆓 **Free & Open** - Use Piper TTS with no API key required

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
- [🚀 Quick Start](#-quick-start) - Get voice in 30 seconds (3 simple steps)
- [📱 Android/Termux](#-quick-setup-android--termux-claude-code-on-your-phone) - Run Claude Code on your phone
- [📋 Prerequisites](#-prerequisites) - What you actually need (Node.js + optional tools)
- [✨ What is AgentVibes?](#-what-is-agentvibes) - Overview & key features
- [🌟 NEW FEATURE HIGHLIGHTS](#-new-feature-highlights) - **START HERE!**
  - [🎤 Voice Browser v1.0](#-agent-vibes-v10-voice-browser) - Browse & sample 914 voices
  - [💬 Intro Text](#-intro-text-pretext---your-personal-ai-branding) - Custom TTS prefixes
  - [🎵 Custom Background Music](#-custom-background-music---complete-audio-control) - Upload your own tracks
- [📰 Latest Release](#-latest-release) - v3.6.0 "Voice Explorer" with Voice Browser, Friendly Names, Custom Music
- [🪟 Windows Setup Guide for Claude Desktop](mcp-server/WINDOWS_SETUP.md) - Complete Windows installation with WSL & Python

### AgentVibes MCP (Natural Language Control)
- [🎙️ AgentVibes MCP Overview](#%EF%B8%8F-agentvibes-mcp) - **Easiest way** - Natural language commands
  - [For Claude Desktop](docs/mcp-setup.md#for-claude-desktop) - Windows/WSL setup, Python requirements
  - [For Warp Terminal](docs/mcp-setup.md#for-warp-terminal) - Warp configuration
  - [For Claude Code](docs/mcp-setup.md#for-claude-code) - Project-specific setup

### Core Features
- [🎤 AgentVibes Voice Browser](#-agentvibes-voice-browser) - **Browse and sample 914 voices interactively**
- [🎤 Commands Reference](#-commands-reference) - All available commands
- [🎙️ Verbosity Control](#%EF%B8%8F-verbosity-control) - Control how much Claude speaks (low/medium/high)
- [🎭 Personalities vs Sentiments](#-personalities-vs-sentiments) - Two systems explained
- [🗣️ Voice Library](#%EF%B8%8F-voice-library) - 914 voices with friendly names
- [🔌 BMAD Plugin](#-bmad-plugin) - Auto voice switching for BMAD agents
- [🎙️ AgentVibes Receiver - NEW!](#%EF%B8%8F-agentvibes-receiver-remote-audio-streaming-from-voiceless-servers) - Remote audio streaming from voiceless servers

### Integrations & Platforms
- [🤖 OpenClaw Integration](#-openclaw-integration) - Use AgentVibes with OpenClaw messaging platform
  - [🎙️ AgentVibes Skill for OpenClaw](#-agentvibes-skill-for-openclaw---what-you-get) - 50+ voices, effects, personalities for OpenClaw
  - [📱 AgentVibes Receiver](#-agentvibes-receiver-local-phone-) - Remote audio on phones/local machines

### Advanced Topics
- [📦 Installation Structure](#-installation-structure) - What gets installed
- [💡 Common Workflows](#-common-workflows) - Quick examples
- [🔧 Advanced Features](#-advanced-features) - Custom voices & personalities
- [🔊 Remote Audio Setup](#-remote-audio-setup) - Play TTS from remote servers
- [🛠️ Technical Documentation](#️-technical-documentation) - Audio architecture, cross-platform support, voice resolution
- [🚨 Security Hardening Guide](docs/security-hardening-guide.md) - **REQUIRED if running OpenClaw on remote server**: SSH hardening, Fail2Ban, Tailscale, UFW, AIDE
- [🔬 Technical Deep Dive](docs/technical-deep-dive.md) - How AgentVibes works under the hood
- [❓ Troubleshooting](#-troubleshooting) - Common issues & fixes

### Additional Resources
- [🔗 Useful Links](#-useful-links) - Voice typing & AI tools
- [🔄 Updating](#-updating) - Keep AgentVibes current
- [🗑️ Uninstalling](#️-uninstalling) - Remove AgentVibes cleanly
- [❓ FAQ](#-frequently-asked-questions-faq) - **NEW!** Common questions answered (git-lfs, MCP tokens, installation)
- [🍎 macOS Testing](docs/macos-testing.md) - Automated testing on macOS with GitHub Actions
- [🤗 Hugging Face Voice Models](docs/hugging-face-models.md) - Technical details on AI voice models
- [🙏 Credits](#-credits) - Acknowledgments
- [🤝 Contributing](#-contributing) - Show support

---

## 📰 Latest Release

**[v3.6.0 - "Voice Explorer" Release](https://github.com/paulpreibisch/AgentVibes/releases/tag/v3.6.0)** 🎉

### 🎤 AgentVibes Voice Browser

**Browse and sample 914 voices in real-time!**

![AgentVibes Voice Browser](docs/installation-screenshots/voice-browser-screenshot.png)

```bash
npx agentvibes-voice-browser
```

Interactive console browser with:
- 🎧 Real-time voice sampling - hear before you choose
- ⭐ Favorite system - mark your top voices
- 🔍 Search & filter - find voices by personality, accent, gender
- 📦 One-click install - install directly from browser
- 🎨 Beautiful UI - stunning console interface

**914 Total Voices:**
- 904 Piper speaker variations (libritts-high)
- 10 curated personality voices

### 🎯 Major Features

**🏷️ Friendly Voice Names**
- No more cryptic IDs! Switch voices with names like "Ryan", "Joe", "Sarah"
- All 904+ voices have memorable, personality-matched names
- Voice metadata includes personalities, accents, and recommendations

```bash
# Before: /agent-vibes:switch en_US-libritts_r-medium-speaker-123
# After:
/agent-vibes:switch Ryan
```

**💬 Intro Text (Pretext) Feature**
- Custom prefix for all TTS announcements
- Set during installation or anytime after
- Perfect for personal branding: "FireBot: Starting analysis..."
- Up to 50 characters, UTF-8 and emoji support

```bash
npx agentvibes config intro-text
```

**🎵 Custom Background Music**
- Upload your own audio files (.mp3, .wav, .ogg, .m4a)
- **Battle-tested security:** 180+ attack variations blocked
- Magic number validation ensures real audio files
- File ownership verification (UID checks)
- Audio duration validation (30-90s recommended, 300s max)
- Secure storage with 600 permissions
- Perfect for team audio branding

```bash
npx agentvibes config music
```

**🎨 Interactive Installer**
- Preview voices during installation
- Sample all 16 background music tracks
- Audio environment auto-detection
- Cross-platform preview support

**🛡️ Security Hardening**
- **180+ attack variations tested** - Path traversal, symlinks, Unicode, null bytes
- **100% attack rejection rate** - All malicious attempts blocked
- **OWASP compliant** - CWE-22 path traversal prevention verified
- **Production certified** - Comprehensive security audit completed
- **Defense-in-depth** - 7 validation layers protect your system
- File ownership verification and secure storage (600 permissions)
- Security audit report: `docs/security/SECURITY-AUDIT.md`

### Quick Install

```bash
# Install AgentVibes
npx agentvibes install

# Launch Voice Browser
npx agentvibes-voice-browser
```

💡 **Tip:** If `npx agentvibes` shows an older version, clear cache: `npm cache clean --force && npx agentvibes@latest --help`

🐛 **Found a bug?** Report at [GitHub Issues](https://github.com/paulpreibisch/AgentVibes/issues)

[→ View Complete Release Notes](RELEASE_NOTES_v3.6.0.md) | [→ View All Releases](https://github.com/paulpreibisch/AgentVibes/releases)

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

## 🚀 Quick Start - Get Voice in 30 Seconds

**3 Simple Steps:**

### 1️⃣ Install
```bash
npx agentvibes install
```

### 2️⃣ Choose Provider (Auto-Detected)
- **macOS**: Native `say` provider (100+ voices) ✨
- **Linux/WSL**: Piper TTS (50+ free voices) 🎙️
- **Windows Native**: Soprano, Piper, or SAPI 🪟
- **Android**: Termux with auto-setup 📱

### 3️⃣ Use in Claude Code
Just code normally - AgentVibes automatically speaks task acknowledgments and completions! 🔊

---

**🍎 macOS Users (One-Time Setup):**
```bash
brew install bash  # Required for bash 5.x features
```
macOS ships with bash 3.2 (from 2007). After this, everything works perfectly!

---

**[→ Full Setup Guide](docs/quick-start.md)** - Advanced options, provider switching, and detailed setup

[↑ Back to top](#-table-of-contents)

---

## 🎤 AgentVibes Voice Browser

**The easiest way to find your perfect voice!**

![AgentVibes Voice Browser](docs/installation-screenshots/voice-browser-screenshot.png)
*Browse, sample, and install from 914 voices with real-time audio preview*

### Launch the Browser

```bash
npx agentvibes-voice-browser
```

### Features

- **914 Voices** - Browse 904 Piper speakers + 10 curated voices
- **Real-Time Sampling** - Press ENTER to hear any voice instantly
- **Favorite System** - Mark favorites for quick access
- **Smart Search** - Filter by name, personality, accent, or gender
- **One-Click Install** - Press 'I' to install and switch to a voice
- **Beautiful UI** - Stunning console interface with blessed.js

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **ENTER** | Play voice sample |
| **I** | Install/Select voice for AgentVibes |
| **F** | Toggle favorite |
| **/** | Search voices |
| **ESC** | Clear search / Back |
| **↑/↓** | Navigate list |
| **G** | Jump to top |
| **Shift+G** | Jump to bottom |
| **H** | Show help |
| **Q** | Quit |

### Voice Categories

**Curated Voices** (10 hand-picked personalities):
- Professional, Friendly, Authoritative, Warm, Energetic
- Technical, Calm, Narrator, Conversational, Enthusiastic

**Speaker Variations** (904 from libritts-high):
- Male and female speakers
- Various accents and tones
- High-quality neural voices
- Unique characteristics

### Finding Your Perfect Voice

1. **Launch browser:** `npx agentvibes-voice-browser`
2. **Search by trait:** Press `/` and type "friendly" or "professional"
3. **Sample voices:** Navigate with arrows, press ENTER to hear
4. **Mark favorites:** Press 'F' on voices you like
5. **Install:** Press 'I' to set as your AgentVibes voice

**Pro Tip:** Use the search to find voices matching your project's mood!

[↑ Back to top](#-table-of-contents)

---

## 📋 Prerequisites - What You Actually Need

### Minimum (Core Features)
**✅ REQUIRED:**
- **Node.js** ≥16.0 - Check with: `node --version`

### Required for Full Features
**✅ STRONGLY RECOMMENDED:**
- **Python** 3.10+ - Needed for Piper TTS voice engine
- **bash** 5.0+ - macOS only (macOS ships with 3.2 from 2007)

### Optional but Recommended
**⭕ OPTIONAL (TTS still works without them):**
- **sox** - Audio effects (reverb, EQ, pitch shifting)
- **ffmpeg** - Background music, audio padding, RDP compression

### NOT Required (Despite What You've Heard)
**❌ DEFINITELY NOT NEEDED:**
- ❌ Git or git-lfs (npm handles everything)
- ❌ Repository cloning (unless you're contributing code)
- ❌ Build tools or C++ compilers (pre-built package ready to use)

### Installation Methods

| Method | Command | Use Case |
|--------|---------|----------|
| **✅ RECOMMENDED: NPX (via npm)** | `npx agentvibes install` | **All platforms** - Just want to use AgentVibes |
| **🪟 Windows PowerShell** | `.\setup-windows.ps1` | **Windows** - Standalone installer (no Node.js needed) |
| **⚠️ Git Clone** | `git clone ...` | **Developers Only** - Contributing code |

**Why npx?** Zero git operations, no build steps, just 30 seconds to voice!

### For Developers (Contributing Code)

If you want to contribute to AgentVibes:
```bash
git clone https://github.com/paulpreibisch/AgentVibes.git
cd AgentVibes
npm install
npm link
```

Requires: Node.js 16+, Git (no git-lfs), and `npm link` familiarity.

[↑ Back to top](#-table-of-contents)

---

---

## 📱 Quick Setup: Android & Termux (Claude Code on Your Phone!)

**Want to run Claude Code on your Android phone with professional voices?**

Simply install Termux from F-Droid (NOT Google Play) and run:
```bash
pkg update && pkg upgrade
pkg install nodejs-lts
npx agentvibes install
```

Termux auto-detects and installs everything needed (proot-distro for compatibility, Piper TTS, audio playback).

**[→ Full Android/Termux Setup Guide](#-android--termux)** - Detailed troubleshooting and verification steps

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

#### 🪟 Windows

**Option A: Native Windows (Recommended)**

AgentVibes now supports native Windows with three TTS providers. No WSL required!

```powershell
# Interactive Node.js installer (recommended)
npx agentvibes install

# Or use the standalone PowerShell installer
.\setup-windows.ps1
```

**Providers available natively:**
- **Soprano** - Ultra-fast neural TTS (best quality, requires `pip install soprano-tts`)
- **Windows Piper** - High quality offline neural voices (auto-downloaded)
- **Windows SAPI** - Built-in Windows voices (zero setup)

**Requirements:** Node.js 16+, PowerShell 5.1+, ffmpeg (optional, for background music & reverb)

See [Windows Native Setup Guide](WINDOWS-SETUP.md) for full instructions.

**Option B: WSL (Legacy)**

For Claude Desktop or WSL-based workflows, follow the [Windows WSL Guide](mcp-server/WINDOWS_SETUP.md).

```powershell
# Install WSL from PowerShell (Administrator)
wsl --install -d Ubuntu
```

Then follow Linux requirements above inside WSL.

#### 🤖 Android / Termux

**Running Claude Code on Your Android Using Termux**

AgentVibes fully supports Android devices through the [Termux app](https://termux.dev/). This enables you to run Claude Code with professional TTS voices directly on your Android phone or tablet!

**Quick Setup:**

```bash
# 1. Install Termux from F-Droid (NOT Google Play - it's outdated)
# Download: https://f-droid.org/en/packages/com.termux/

# 2. Install Node.js in Termux
pkg update && pkg upgrade
pkg install nodejs-lts

# 3. Install AgentVibes (auto-detects Android and runs Termux installer)
npx agentvibes install
```

**What Gets Installed?**

The Termux installer automatically sets up:
- **proot-distro** with Debian (for glibc compatibility)
- **Piper TTS** via proot wrapper (Android uses bionic libc, not glibc)
- **termux-media-player** for audio playback (`paplay` doesn't work on Android)
- **Audio dependencies**: ffmpeg, sox, bc for processing
- **termux-api** for Android-specific audio routing

**Why Termux Instead of Standard Installation?**

Android's architecture requires special handling:
- ❌ Standard pip/pipx fails (missing wheels for bionic libc)
- ❌ Linux binaries require glibc (Android uses bionic)
- ❌ `/tmp` directory is not accessible on Android
- ❌ Standard audio tools like `paplay` don't exist

✅ Termux installer solves all these issues with proot-distro and Android-native audio playback!

**Requirements:**
- [Termux app](https://f-droid.org/en/packages/com.termux/) (from F-Droid, NOT Google Play)
- [Termux:API](https://f-droid.org/en/packages/com.termux.api/) (for audio playback)
- Android 7.0+ (recommended: Android 10+)
- ~500MB free storage (for Piper TTS + voice models)

**Audio Playback:**
- Uses `termux-media-player` instead of `paplay`
- Audio automatically routes through Android's media system
- Supports all Piper TTS voices (50+ languages)

**Verifying Your Setup:**

```bash
# Check Termux environment
echo $PREFIX               # Should show /data/data/com.termux/files/usr

# Check Node.js
node --version             # Should be ≥16.0

# Check if Piper is installed
which piper                # Should return /data/data/com.termux/files/usr/bin/piper

# Test audio playback
termux-media-player play /path/to/audio.wav
```

**Troubleshooting:**

| Issue | Solution |
|-------|----------|
| "piper: not found" | Run `npx agentvibes install` - auto-detects Termux |
| No audio playback | Install Termux:API from F-Droid |
| Permission denied | Run `termux-setup-storage` to grant storage access |
| Slow installation | Use WiFi, not mobile data (~300MB download) |

**Why F-Droid and Not Google Play?**

Google Play's Termux version is outdated and unsupported. Always use the [F-Droid version](https://f-droid.org/en/packages/com.termux/) for the latest security updates and compatibility.

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
| **Piper** | Linux/WSL/Windows | Free | ⭐⭐⭐⭐ | Auto-downloads |
| **Soprano** | Linux/WSL/Windows | Free | ⭐⭐⭐⭐⭐ | `pip install soprano-tts` |
| **Windows SAPI** | Windows | Free (built-in) | ⭐⭐⭐ | Zero config |

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

### Voice Browser Commands

```bash
# Launch voice browser
npx agentvibes-voice-browser

# Or use global command (if installed globally)
agentvibes-voice-browser
```

**MCP Equivalent:** Currently CLI-only (no MCP command)

### Intro Text Commands

```bash
# Configure intro text
/agent-vibes:config intro-text
npx agentvibes config intro-text

# View current intro text
cat ~/.claude/config/intro-text.txt
```

**MCP Equivalent:**
```
"Set my intro text to 'FireBot: '"
"What's my current intro text?"
"Clear my intro text"
```

### Custom Music Commands

```bash
# Configure background music
/agent-vibes:config music
npx agentvibes config music

# Menu options:
# 1. Change music - Upload new audio file
# 2. Remove music - Clear custom music
# 3. Reset to default - Restore built-in tracks
# 4. Enable/Disable - Toggle background music
# 5. Preview current - Sample current music
```

**MCP Equivalent:**
```
"Configure my background music"
"Add custom background music"
"Remove custom music"
"Preview my background music"
```

### Friendly Voice Name Commands

```bash
# Switch using friendly name
/agent-vibes:switch Ryan
/agent-vibes:switch Sarah

# List all voices with friendly names
/agent-vibes:list

# Get current voice (shows friendly name if available)
/agent-vibes:whoami
```

**MCP Equivalent:**
```
"Switch to Ryan voice"
"Use the Sarah voice"
"List all available voices"
```

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

**NEW in v3.6.0:** Use the **[AgentVibes Voice Browser](#-agentvibes-voice-browser)** to browse, sample, and install from 914 voices! Launch with `npx agentvibes-voice-browser`.

### Friendly Voice Names

All voices now have memorable names! Instead of technical IDs like `en_US-libritts_r-medium-speaker-123`, just use friendly names like **Ryan**, **Joe**, or **Sarah**.

**Voice Metadata Includes:**
- Display name and technical ID
- Gender, accent, and region
- Personality traits (professional, warm, friendly, etc.)
- Recommended use cases
- Quality rating and sample rate

### Voice Categories

**Curated Voices** (10 personalities):
These hand-picked voices cover common use cases with clear characteristics.

**Speaker Variations** (904 voices):
High-quality Piper TTS voices from the libritts-high model. Each speaker has unique vocal characteristics, accents, and tones.

### Popular Voices

AgentVibes includes professional AI voices from Piper TTS and macOS Say with multilingual support.

🎧 **Try in Claude Code:** `/agent-vibes:preview` to hear all voices
🌍 **Multilingual:** Use Antoni, Rachel, Domi, or Bella for automatic language detection

**[→ View Complete Voice Library](docs/voice-library.md)** - All voices with clickable samples, descriptions, and best use cases

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

## 🤖 OpenClaw Integration

**Use AgentVibes TTS with OpenClaw - the revolutionary AI assistant you can access via any instant messenger!**

**What is OpenClaw?** [OpenClaw](https://openclaw.ai/) is a revolutionary AI assistant that brings Claude AI to your favorite messaging platforms - WhatsApp, Telegram, Discord, and more. No apps to install, no websites to visit - just message your AI assistant like you would a friend.

🌐 **Website**: https://openclaw.ai/

AgentVibes seamlessly integrates with OpenClaw, providing professional text-to-speech for AI assistants running on messaging platforms and remote servers.

### 🚨 CRITICAL: Security Before Running OpenClaw on Any Remote Server

⚠️ **SECURITY IS NOT OPTIONAL** - Running OpenClaw on a remote server exposes your infrastructure to attack vectors including SSH compromise, credential theft, and lateral movement.

**👉 READ THIS FIRST:** [Security Hardening Guide](docs/security-hardening-guide.md) - **Required reading** covering:
- ✅ SSH hardening (key-only auth, port 2222, fail2ban)
- ✅ Firewall configuration (UFW/iptables)
- ✅ Intrusion detection (AIDE, Wazuh)
- ✅ VPN tunneling (Tailscale alternative to direct SSH)

**Do not expose your OpenClaw server to the internet without reading this guide.**

### 🎯 Key Benefits

- **Free & Offline**: No API costs, works without internet
- **Remote SSH Audio**: Audio tunnels from server to local machine via PulseAudio
- **50+ Voices**: Professional AI voices in 30+ languages
- **Zero Config**: Automatic when AgentVibes is installed

### 🚀 Installation

AgentVibes includes a ready-to-use OpenClaw skill that enables TTS on messaging platforms. The setup involves two components:

#### Component 1: OpenClaw Server (Remote)

Install AgentVibes on your OpenClaw server:

```bash
# On your remote server where OpenClaw is running
npx agentvibes install
```

The OpenClaw skill is **automatically included** in the AgentVibes npm package at `.clawdbot/skill/SKILL.md`.

**How to activate the skill in OpenClaw:**

1. **Locate the skill** - After installing AgentVibes, the skill is at:
   ```
   node_modules/agentvibes/.clawdbot/skill/SKILL.md
   ```

2. **Link to OpenClaw skills directory** (if OpenClaw uses skills):
   ```bash
   # Example - adjust path based on your OpenClaw installation
   ln -s $(npm root -g)/agentvibes/.clawdbot/skill/SKILL.md ~/.openclaw/skills/agentvibes.md
   ```

3. **OpenClaw auto-detection** - Many OpenClaw setups automatically detect AgentVibes when it's installed. Check your OpenClaw logs for:
   ```
   ✓ AgentVibes skill detected and loaded
   ```

---

#### 🎙️ AgentVibes Voice Management Skill for OpenClaw

Manage your text-to-speech voices across multiple providers with the AgentVibes Voice Management Skill:

**Voice Management Features:**
- 🎤 **50+ Professional Voices** - Across Piper TTS, Piper (free offline), and macOS Say providers
- 🔀 **Multi-Provider Support** - Switch between Piper TTS (premium), Piper (free), and macOS Say
- 👂 **Voice Preview** - Listen to voices before selecting them
- 🎚️ **Voice Customization** - Add custom voices, set pretext, control speech rate
- 📋 **Voice Management** - List, switch, replay, and manage your voice library
- 🔇 **Mute Control** - Mute/unmute TTS output with persistent settings
- 🌍 **Multilingual Support** - Voices in 30+ languages across all providers

**Installation Confirmation:**
✅ The skill is **automatically included** in the AgentVibes npm package at:
```
node_modules/agentvibes/.clawdbot/skill/SKILL.md
```

No extra setup needed - when you run `npx agentvibes install` on your OpenClaw server, the skill is ready to use!

**Full Skill Documentation:**
**[→ View Complete AgentVibes Skill Guide](.clawdbot/skill/SKILL.md)** - 430+ lines covering:
- Quick start with 50+ voice options
- Background music & effects management
- Personality system (19+ styles)
- Voice effects (reverb, reverb, EQ)
- Speed & verbosity control
- Remote SSH audio setup
- Troubleshooting & complete reference

**Popular Voice Examples:**
```bash
# Female voices
npx agentvibes speak "Hello" --voice en_US-amy-medium
npx agentvibes speak "Bonjour" --voice fr_FR-siwis-medium

# Male voices
npx agentvibes speak "Hello" --voice en_US-lessac-medium
npx agentvibes speak "Good day" --voice en_GB-alan-medium

# Add personality!
bash ~/.claude/hooks/personality-manager.sh set sarcastic
bash ~/.claude/hooks/play-tts.sh "Oh wonderful, another request"
```

---

#### Component 2: AgentVibes Receiver (Local/Phone) ⚠️ REQUIRED

**CRITICAL: You MUST install AgentVibes on your phone (or local machine) to receive and play audio!**

Without this, audio cannot be heard - the server generates TTS but needs a receiver to play it.

**Install on Android Phone (Termux):**

1. **Install Termux from F-Droid** (NOT Google Play):
   - Download: https://f-droid.org/en/packages/com.termux/

2. **Install Node.js in Termux:**
   ```bash
   pkg update && pkg upgrade
   pkg install nodejs-lts
   ```

3. **Install AgentVibes in Termux:**
   ```bash
   npx agentvibes install
   ```

4. **Install Termux:API** (for audio playback):
   - Download: https://f-droid.org/en/packages/com.termux.api/
   - Then in Termux: `pkg install termux-api`

**Install on Local Mac/Linux:**

```bash
npx agentvibes install
```

**Why is this needed?**
- The **server generates TTS** but has no speakers (headless)
- AgentVibes on your **phone acts as the audio receiver** via SSH tunnel
- Audio tunnels from server → SSH → phone → speakers 🔊

Without AgentVibes installed on the receiving device, you'll generate audio but hear nothing!

#### How It Works: Server → SSH Tunnel → Local Playback

```
┌─────────────────────────────────────────────────────────┐
│  1. User messages OpenClaw via Telegram/WhatsApp       │
│     "Tell me about the weather"                         │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  2. OpenClaw (Server) processes request with Claude    │
│     AgentVibes skill generates TTS audio               │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  3. Audio tunnels through SSH → PulseAudio (port 14713)│
│     Server: PULSE_SERVER=tcp:localhost:14713           │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  4. Local AgentVibes receives and plays audio          │
│     Phone speakers, laptop speakers, etc.              │
│     🔊 "The weather is sunny and 72 degrees"            │
└─────────────────────────────────────────────────────────┘
```

**Architecture:**
- **Server (OpenClaw)**: Generates TTS, sends via PulseAudio
- **SSH Tunnel**: RemoteForward port 14713 (encrypted transport)
- **Local (Termux/Desktop)**: AgentVibes receives audio, plays on speakers

This creates a **Siri-like experience** - message from anywhere, hear responses on your phone! 📱🎤

### 📝 Usage

#### Basic TTS Commands

```bash
# Basic TTS
npx agentvibes speak "Hello from OpenClaw"

# With different voices
npx agentvibes speak "Hello" --voice en_US-amy-medium
npx agentvibes speak "Bonjour" --voice fr_FR-siwis-medium

# List available voices
npx agentvibes voices
```

#### Advanced: Direct Hook Usage with Voice Override

For programmatic control, use the TTS hook directly:

```bash
# Basic: Use default voice
bash ~/.claude/hooks/play-tts.sh "Hello from OpenClaw"

# Advanced: Override voice per message
bash ~/.claude/hooks/play-tts.sh "Welcome message" "en_US-amy-medium"
bash ~/.claude/hooks/play-tts.sh "Bonjour!" "fr_FR-siwis-medium"
bash ~/.claude/hooks/play-tts.sh "British greeting" "en_GB-alan-medium"
```

**Parameters:**
- `$1` - **TEXT** (required): Message to speak
- `$2` - **VOICE** (optional): Voice name to override default

#### Audio Effects Configuration for OpenClaw

**File**: `.claude/config/audio-effects.cfg`

Customize audio effects, background music, and voice processing per agent or use default settings:

**Format:**
```
AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|BACKGROUND_VOLUME
```

**Example Configuration:**

```bash
# Default - subtle background music
default||agentvibes_soft_flamenco_loop.mp3|0.30

# Custom agent with reverb + background
MyAgent|reverb 40 50 90 gain -2|agentvibes_soft_flamenco_loop.mp3|0.20

# Agent with pitch shift and EQ
Assistant|pitch -100 equalizer 3000 1q +2|agentvibes_dark_chill_step_loop.mp3|0.15
```

**Available SOX Effects:**

| Effect | Syntax | Example | Description |
|--------|--------|---------|-------------|
| **Reverb** | `reverb <reverberance> <HF-damping> <room-scale>` | `reverb 40 50 90` | Adds room ambiance (light: 30 40 70, heavy: 50 60 100) |
| **Pitch** | `pitch <cents>` | `pitch -100` | Shift pitch (100 cents = 1 semitone, negative = lower) |
| **Equalizer** | `equalizer <freq> <width>q <gain-dB>` | `equalizer 3000 1q +2` | Boost/cut frequencies (bass: 200Hz, treble: 4000Hz) |
| **Gain** | `gain <dB>` | `gain -2` | Adjust volume (negative = quieter, positive = louder) |
| **Compand** | `compand <attack,decay> <threshold:in,out>` | `compand 0.3,1 6:-70,-60,-20` | Dynamic range compression (makes quiet parts louder) |

**Background Music Tracks:**

Built-in tracks available in `.claude/audio/tracks/`:
- `agentvibes_soft_flamenco_loop.mp3` - Warm, rhythmic flamenco
- `agentvibes_dark_chill_step_loop.mp3` - Modern chill electronic
- (50+ additional tracks available)

**Background Volume:**
- `0.10` - Very subtle (10%)
- `0.20` - Subtle (20%)
- `0.30` - Moderate (30%, recommended default)
- `0.40` - Noticeable (40%, party mode)

**Example: OpenClaw Custom Configuration**

Create `.claude/config/audio-effects.cfg` on your OpenClaw server:

```bash
# OpenClaw assistant - warm voice with subtle reverb
OpenClaw|reverb 30 40 70 gain -1|agentvibes_soft_flamenco_loop.mp3|0.25

# Help desk agent - clear, bright voice
HelpDesk|equalizer 4000 1q +3 compand 0.2,0.5 6:-70,-60,-20|agentvibes_dark_chill_step_loop.mp3|0.15

# Default fallback
default||agentvibes_soft_flamenco_loop.mp3|0.30
```

**How AgentVibes Applies Effects:**

1. **Generate TTS** - Create base audio with Piper TTS
2. **Apply SOX effects** - Process audio (reverb, EQ, pitch, etc.)
3. **Mix background** - Blend background music at specified volume
4. **Tunnel via SSH** - Send processed audio to local receiver
5. **Play on device** - Output to phone/laptop speakers

This allows **per-message customization** or **consistent agent branding** with unique audio signatures!

### 🔊 Remote SSH Audio

Perfect for running OpenClaw on a remote server with audio on your local machine:

**Quick Setup:**

1. **Remote server** - Configure PulseAudio:
```bash
echo 'export PULSE_SERVER=tcp:localhost:14713' >> ~/.bashrc
source ~/.bashrc
```

2. **Local machine** - Add SSH tunnel (`~/.ssh/config`):
```
Host your-server
    RemoteForward 14713 localhost:14713
```

3. **Connect and test**:
```bash
ssh your-server
agentvibes speak "Testing remote audio from OpenClaw"
```

Audio plays on your local speakers! 🔊

### 📚 Documentation

- **OpenClaw Skill**: [.clawdbot/README.md](.clawdbot/README.md)
- **OpenClaw Website**: https://openclaw.ai/
- **Remote Audio Setup**: [docs/remote-audio-setup.md](docs/remote-audio-setup.md)
- **Security Hardening**: [docs/security-hardening-guide.md](docs/security-hardening-guide.md) ⚠️

[↑ Back to top](#-table-of-contents)

---

## 🎙️ AgentVibes Receiver: Remote Audio Streaming from Voiceless Servers

**Receive and play TTS audio from servers that have no audio output!**

AgentVibes Receiver is a lightweight audio client that runs on your phone, tablet, or personal computer, which receives TTS audio from remote voiceless servers, where your OpenClaw Personal Assistant or your Claude Code project is installed.

### 🎯 What AgentVibes Receiver Solves

You have OpenClaw running on a Mac mini or remote server with **no audio output**:
- 🖥️ Mac mini (silent)
- 🖥️ Ubuntu server (headless)
- ☁️ AWS/DigitalOcean instance
- 📦 Docker container
- 🪟 WSL (Windows Subsystem for Linux)

Users message you via WhatsApp, Telegram, Discord but only get text responses:
- ❌ No voice = Less engaging experience
- ❌ No personality = Feels robotic
- ❌ No audio cues = Miss important context

**AgentVibes Receiver transforms this:**
- ✅ OpenClaw speaks with voice (Siri-like experience)
- ✅ Audio streams to your device automatically
- ✅ You hear responses on your speakers
- ✅ Users get a conversational AI experience

### 🔧 How It Works

**One-time setup:**
1. Install AgentVibes on your voiceless server with OpenClaw
2. Install AgentVibes Receiver on your personal device (phone/tablet/laptop)
3. Connect via SSH tunnel (or Tailscale VPN)
4. Done - automatic from then on

**Flow diagram:**
```
┌──────────────────────────────────────────┐
│ Your Mac mini / Server                   │
│ (OpenClaw + AgentVibes)                  │
│ • Generates TTS audio                    │
│ • Sends via SSH tunnel                   │
└──────────────────────────────────────────┘
        ↓ Encrypted SSH tunnel
┌──────────────────────────────────────────┐
│ Your Phone / Laptop                      │
│ (AgentVibes Receiver)                    │
│ • Receives audio stream (or text stream) │
│ • Auto-plays on device speakers          │
└──────────────────────────────────────────┘
```

**Real-world example:**
```
📱 WhatsApp: "Tell me about quantum computing"
        ↓
🖥️ Mac mini: OpenClaw processes + generates TTS
        ↓ SSH tunnel (audio or text stream)
📱 Your phone (Agent Vibes Receiver): Plays audio 🔊
        ↓
You hear on your device speakers: "Quantum computing uses quantum bits..."
        ↓
💬 Conversation feels alive!
```

### ✨ Key Features

| Feature | Benefit |
|---------|---------|
| **One-Time Pairing** | SSH key setup, automatic reconnect |
| **Real-Time Streaming** | Low-latency audio playback |
| **SSH Encryption** | Secure audio tunnel |
| **Tailscale Support** | Easy VPN for remote servers |
| **Voice Selection** | Configure server-side voice |
| **Audio Effects** | Reverb, echo, pitch on server |
| **Cache Tracking** | Monitor audio generation |
| **Multiple Servers** | Connect to different OpenClaw instances |

### 🚀 Perfect For

- 🖥️ **Mac mini + OpenClaw** - Home server with professional voices
- ☁️ **Remote Servers** - OpenClaw on AWS/GCP/DigitalOcean
- 📱 **WhatsApp/Telegram** - Users message, hear responses
- 🎓 **Discord Bots** - Bot speaks with voices
- 🏗️ **Docker/Containers** - Containerized OpenClaw with audio
- 🔧 **WSL Development** - Windows developers using voiceless WSL

### 📝 Setup

```bash
# On your server (Mac mini, Ubuntu, AWS, etc.)
npx agentvibes install
# Selects OpenClaw option
# AgentVibes installs with SSH-Remote provider

# On your personal device (phone, laptop, tablet)
npx agentvibes receiver setup
# Pairing prompt with server SSH key
# Done!
```

### 📚 Documentation

**[→ View AgentVibes Receiver Setup Guide](docs/agentvibes-receiver.md)** - Pairing, SSH configuration, Tailscale setup, troubleshooting

**[→ View OpenClaw Integration Guide](docs/openclaw-integration.md)** - Server setup, voice configuration, audio effects, and best practices

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

## 🛠️ Technical Documentation

### Audio Architecture

AgentVibes uses a cross-platform audio module (`src/console/audio-env.js`) that handles player detection and environment configuration for all supported platforms.

#### Platform Audio Support Matrix

| Platform | PulseAudio Config | MP3 Players (preference order) | WAV Players (preference order) |
|----------|-------------------|-------------------------------|-------------------------------|
| **Native Linux** | System default (not overridden) | ffplay → play (sox) → mpg123 → cvlc → mpv | aplay → paplay → play → ffplay |
| **WSL2** | Auto-detects `/mnt/wslg/PulseServer` | Same as Linux | Same as Linux |
| **macOS** | Not applicable | ffplay → play → mpg123 → cvlc → mpv → afplay | aplay → paplay → play → ffplay → afplay |
| **Windows** | Not applicable | ffplay → mpv (if installed) | ffplay → mpv → PowerShell SoundPlayer (built-in) |

#### Key Design Decisions

- **Direct spawn, not shell chains**: Audio players are spawned directly via Node's `spawn()` instead of `sh -c 'cmd1 || cmd2'` chains. VLC/cvlc crashes when stderr is redirected inside shell wrappers.
- **Player detection at startup**: The available player is detected once using `which` and cached. No runtime fallback chains.
- **PULSE_SERVER safety**: The WSL2 PulseServer path (`/mnt/wslg/PulseServer`) is only set when the socket file actually exists. Hardcoding it on native Linux silently breaks audio output.
- **Windows WAV fallback**: PowerShell's `System.Media.SoundPlayer` is used as a built-in fallback when no cross-platform player is installed.

#### Multi-Speaker Voice Models

Piper supports multi-speaker ONNX models (e.g., `16Speakers.onnx`) that contain multiple voices in a single file. AgentVibes expands these automatically:

- The `.onnx.json` metadata file contains `num_speakers` and `speaker_id_map`
- `scanInstalledVoices()` expands multi-speaker models into individual selectable entries (e.g., `16Speakers::Cori_Samuel`)
- When selected, the system writes `tts-piper-model.txt` and `tts-piper-speaker-id.txt` to `.claude/`
- `play-tts-piper.sh` reads these files and passes `--speaker <id>` to the piper binary

#### Voice Directory Resolution

Voice storage follows the same precedence chain in both JavaScript and shell:

1. `PIPER_VOICES_DIR` environment variable
2. Project-local `.claude/piper-voices-dir.txt` (walks up directory tree)
3. Global `~/.claude/piper-voices-dir.txt`
4. Default `~/.claude/piper-voices`

#### Required System Dependencies for Background Music

Background music requires an MP3-capable audio player. The installer detects missing players and offers to install `ffmpeg` automatically. If no player is found, the Music tab displays a clear error message.

```bash
# Install ffmpeg (recommended — provides ffplay)
# Ubuntu/Debian/WSL2:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Arch Linux:
sudo pacman -S ffmpeg
```

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

## 🗑️ Uninstalling

**Quick Uninstall (Project Only):**
```bash
npx agentvibes uninstall
```

**Uninstall Options:**
```bash
# Interactive uninstall (confirms before removing)
npx agentvibes uninstall

# Auto-confirm (skip confirmation prompt)
npx agentvibes uninstall --yes

# Also remove global configuration
npx agentvibes uninstall --global

# Complete uninstall including Piper TTS
npx agentvibes uninstall --global --with-piper
```

**What Gets Removed:**

**Project-level (default):**
- `.claude/commands/agent-vibes/` - Slash commands
- `.claude/hooks/` - TTS scripts
- `.claude/personalities/` - Personality templates
- `.claude/output-styles/` - Output styles
- `.claude/audio/` - Audio cache
- `.claude/tts-*.txt` - TTS configuration files
- `.agentvibes/` - BMAD integration files

**Global (with `--global` flag):**
- `~/.claude/` - Global configuration
- `~/.agentvibes/` - Global cache

**Piper TTS (with `--with-piper` flag):**
- `~/piper/` - Piper TTS installation

**To Reinstall:**
```bash
npx agentvibes install
```

**💡 Tips:**
- Default uninstall only removes project-level files
- Use `--global` if you want to completely reset AgentVibes
- Use `--with-piper` if you also want to remove the Piper TTS engine
- Run `npx agentvibes status` to check installation status

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

### Voice Browser & New Features

**Q: How do I use the Voice Browser?**
**A:** Simply run `npx agentvibes-voice-browser` and you'll see an interactive console with 914 voices. Use arrow keys to navigate, ENTER to sample voices, 'I' to install, 'F' to favorite, and '/' to search.

**Q: What are friendly voice names?**
**A:** Instead of technical IDs like `en_US-ryan-high`, you can now use simple names like "Ryan" when switching voices. All 904+ voices have friendly names matched to their characteristics.

**Q: How do I set up custom intro text?**
**A:** During installation, you'll be prompted for intro text. You can also configure it anytime with `npx agentvibes config intro-text`. Enter text like "FireBot: " and it will prefix all TTS announcements.

**Q: Can I use my own background music?**
**A:** Yes! Run `npx agentvibes config music` and select "Change music". Provide the path to your audio file (.mp3, .wav, .ogg, or .m4a). Files are validated for security and must be under 50MB.

**Q: What's the recommended duration for custom music?**
**A:** Between 30-90 seconds is ideal for smooth looping. The system supports up to 300 seconds (5 minutes) but will warn you if the duration is non-optimal.

**Q: Are friendly voice names case-sensitive?**
**A:** No! You can type "ryan", "Ryan", or "RYAN" - they all work. The voice resolution is case-insensitive.

**Q: Can I favorite voices without installing them?**
**A:** Yes! In the Voice Browser, press 'F' to mark any voice as a favorite. Favorites are saved and you can filter to show only favorites later.

**Q: Does custom music work with all TTS providers?**
**A:** Yes! Custom background music works with Piper TTS, Soprano, macOS Say, and Windows SAPI.

**Q: Can I preview music before setting it as my background?**
**A:** Yes! When configuring custom music with `npx agentvibes config music`, you can select "Preview current" to hear your music. During installation, you can also sample all built-in tracks.

**Q: What security measures protect custom music uploads?**
**A:** AgentVibes implements **defense-in-depth security with 7 validation layers**, tested against 180+ attack variations:

1. **Path Validation** - `path.resolve()` prevents traversal attacks (../, encoded, Unicode)
2. **Home Directory Boundary** - Files must be within your home directory
3. **File Existence Check** - Verifies file actually exists
4. **File Type Verification** - Must be a regular file (not device, socket, etc.)
5. **Ownership Verification** - File must be owned by you (UID check)
6. **Format Validation** - Magic number checking ensures real audio files
7. **Secure Storage** - Files copied to restricted directory with 600 permissions

**Security Certification:**
- ✅ 100% attack rejection rate (107/107 tests passed)
- ✅ OWASP CWE-22 compliant (path traversal prevention)
- ✅ No information disclosure in error messages
- ✅ Production-ready and certified secure

See full security audit: `docs/security/SECURITY-AUDIT.md`

**Q: Has the security been independently verified?**
**A:** Yes! AgentVibes v3.6.0 includes a comprehensive security audit with 180+ attack variations tested. All path traversal, symlink, Unicode, null byte, and edge case attacks were successfully blocked (100% rejection rate). The system is OWASP CWE-22 compliant and includes a detailed security audit report at `docs/security/SECURITY-AUDIT.md`.

**Q: What attack patterns were tested?**
**A:** The security test suite covers:
- **Path Traversal:** 100 variations (basic, URL-encoded, Unicode, null bytes, mixed)
- **Symlink Attacks:** 10 variations (sensitive files, chains, traversal targets)
- **Hard Link Attacks:** 5 variations (ownership verification)
- **Edge Cases:** 65+ variations (CRLF, whitespace, Unicode normalization, platform-specific)

Every attack was correctly rejected with no information disclosure.

### Troubleshooting

**Q: Why isn't Claude speaking?**
**A:** Common causes:
1. Hook not installed - Run `npx agentvibes install --yes`
2. Audio player missing - Install `sox` and `ffmpeg`
3. TTS protocol not enabled in settings
4. Test with `/agent-vibes:sample Aria`

**Q: Can I use this on Windows?**
**A:** Yes! AgentVibes supports **native Windows** with PowerShell scripts (Soprano, Piper, SAPI providers). See [Windows Native Setup](WINDOWS-SETUP.md). WSL is also supported for legacy workflows - see [Windows WSL Guide](mcp-server/WINDOWS_SETUP.md).

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
- [Soprano TTS](https://github.com/suno-ai/bark) - Ultra-fast neural TTS
- **Windows SAPI** - Native Windows text-to-speech
- **macOS Say** - Native macOS text-to-speech
- [Claude Code](https://claude.com/claude-code) - AI coding assistant
- Licensed under Apache 2.0

**Contributors:**
- 🎤 [@nathanchase](https://github.com/nathanchase) - Soprano TTS Provider integration (PR #95) - Ultra-fast neural TTS with GPU acceleration

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

