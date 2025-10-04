# 🎤 AgentVibes

> **Bring your Claude Code sessions to life with voice!**
>
> Professional text-to-speech narration powered by ElevenLabs AI

[![npm version](https://badge.fury.io/js/agentvibes.svg)](https://badge.fury.io/js/agentvibes)
[![Test Suite](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml)
[![Publish](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version**: v1.0.21

---

## 📑 Table of Contents

### Getting Started
- [🚀 Quick Start](#-quick-start) - Install in 3 steps
- [✨ What is AgentVibes?](#-what-is-agentvibes) - Overview & key features
- [📰 Latest Release](#-latest-release) - What's new

### Core Features
- [🎤 Commands Reference](#-commands-reference) - All available commands
- [🎭 Personalities vs Sentiments](#-personalities-vs-sentiments) - Two systems explained
- [🗣️ Voice Library](#️-voice-library) - 17+ professional voices
- [🌍 Multilingual Support](#change-language) - Speak in 30+ languages
- [🔌 BMAD Plugin](#-bmad-plugin) - Auto voice switching for BMAD agents

### Advanced Topics
- [📦 Installation Structure](#-installation-structure) - What gets installed
- [💡 Usage Examples](#-usage-examples) - Common workflows
- [🔧 Advanced Features](#-advanced-features) - Custom voices & personalities
- [💰 Pricing & Usage](#-pricing--usage) - ElevenLabs costs & monitoring
- [❓ Troubleshooting](#-troubleshooting) - Common issues & fixes

### Additional Resources
- [🔄 Updating](#-updating) - Keep AgentVibes current
- [🙏 Credits](#-credits) - Acknowledgments
- [🤝 Contributing](#-contributing) - Show support

---

## 📰 Latest Release

**[v1.0.21 - Release Notes](https://github.com/paulpreibisch/AgentVibes/releases/tag/v1.0.21)** 🌍

Multilingual support is here! Speak with Claude in 30+ languages including Spanish, French, German, Italian, Portuguese, Chinese, Japanese, and more. Added 6 multilingual voices, fixed slash command discovery, and improved update experience with release notes fallback.

[→ View All Releases](https://github.com/paulpreibisch/AgentVibes/releases)

---

## ✨ What is AgentVibes?

**AgentVibes adds lively voice narration to your Claude Code sessions!**

Imagine Claude speaking to you with different voices and personalities as you code. Whether you want a sarcastic assistant, a pirate captain, or a wise grandpa - AgentVibes brings your AI coding buddy to life with professional ElevenLabs voices.

### 🎯 Key Features

- 🎙️ **17+ Professional AI Voices** - Character voices, accents, and unique personalities
- 🎭 **19 Built-in Personalities** - From sarcastic to flirty, pirate to dry humor
- 💬 **Sentiment System** - Apply personality styles to ANY voice
- 🔌 **BMAD Plugin** - Auto voice switching for BMAD agents
- 🔊 **Live Audio Feedback** - Hear task acknowledgments and completions
- 🎵 **Voice Preview** - Listen before you choose
- 🔄 **Audio Replay** - Replay the last 10 TTS messages
- ⚡ **One-Command Install** - Get started in seconds

[↑ Back to top](#-table-of-contents)

---

## 🚀 Quick Start

### Step 1: Install AgentVibes

Choose your preferred installation method:

#### **Option A: Using npx (Recommended)** ⚡
No installation needed! Run directly:
```bash
npx agentvibes install
```

#### **Option B: Install globally via npm** 📦
Install once, use anywhere:
```bash
npm install -g agentvibes
agentvibes install
```

#### **Option C: From source (Development)** 🔧
Clone and run from repository:
```bash
git clone https://github.com/paulpreibisch/AgentVibes.git
cd AgentVibes
npm install
node bin/agent-vibes install
```

### Step 2: Get Your ElevenLabs API Key

1. Sign up at [elevenlabs.io](https://elevenlabs.io/) (free tier available!)
2. Copy your API key from the dashboard
3. Add it to your environment:

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export ELEVENLABS_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### Step 3: Enable Voice in Claude Code

```bash
/output-style agent-vibes
```

**That's it! Claude will now speak to you!** 🎉

[↑ Back to top](#-table-of-contents)

---

## 🎤 Commands Reference

All commands are prefixed with `/agent-vibes:`

### Voice Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:list` | Show all available voices |
| `/agent-vibes:switch <voice>` | Change to a different voice |
| `/agent-vibes:whoami` | Show current voice, sentiment & personality |
| `/agent-vibes:preview [N]` | Preview voices with audio samples |
| `/agent-vibes:sample <voice>` | Test a specific voice |
| `/agent-vibes:add <name> <id>` | Add custom ElevenLabs voice |
| `/agent-vibes:replay [N]` | Replay recent TTS audio |
| `/agent-vibes:get` | Get currently selected voice |

### Personality Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:personality <name>` | Set personality (changes voice + style) |
| `/agent-vibes:personality list` | Show all personalities |
| `/agent-vibes:personality add <name>` | Create custom personality |
| `/agent-vibes:personality edit <name>` | Edit personality file |
| `/agent-vibes:personality get` | Show current personality |
| `/agent-vibes:personality reset` | Reset to normal |

### Sentiment Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:sentiment <name>` | Apply sentiment to current voice |
| `/agent-vibes:sentiment list` | Show all available sentiments |
| `/agent-vibes:sentiment get` | Show current sentiment |
| `/agent-vibes:sentiment clear` | Remove sentiment |

### Language Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:set-language <language>` | Set TTS language (30+ supported) |
| `/agent-vibes:set-language english` | Reset to English |
| `/agent-vibes:set-language list` | Show all supported languages |
| `/agent-vibes:whoami` | Show current language + voice |

### BMAD Plugin Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes-bmad status` | Show BMAD plugin status & mappings |
| `/agent-vibes-bmad enable` | Enable automatic voice switching |
| `/agent-vibes-bmad disable` | Disable plugin (restores previous settings) |
| `/agent-vibes-bmad list` | List all BMAD agent voice mappings |
| `/agent-vibes-bmad set <agent> <voice> [personality]` | Update agent mapping |
| `/agent-vibes-bmad edit` | Edit configuration file |

[↑ Back to top](#-table-of-contents)

---

## 🎭 Personalities vs Sentiments

### 🎪 Personalities (Voice + Style)

**Personalities change BOTH voice AND how Claude talks.** Each has a dedicated ElevenLabs voice:

| Personality | Voice | Style |
|------------|-------|-------|
| **sarcastic** | Jessica Anne Bogart | Dry wit and cutting observations |
| **flirty** | Jessica Anne Bogart | Playful charm and compliments |
| **pirate** | Pirate Marshal | Seafaring swagger - "Arr matey!" |
| **grandpa** | Grandpa Spuds Oxley | Rambling nostalgic stories |
| **dry-humor** | Aria | British wit and deadpan delivery |
| **angry** | Demon Monster | Frustrated and loud |
| **robot** | Dr. Von Fusion | Mechanical and precise |
| **zen** | Aria | Peaceful and mindful |
| **professional** | Matthew Schmitz | Formal and corporate |

**All 19 personalities:** sarcastic, flirty, pirate, grandpa, dry-humor, angry, robot, zen, professional, dramatic, millennial, surfer-dude, sassy, poetic, moody, funny, annoying, crass, normal, random

```bash
/agent-vibes:personality sarcastic
/agent-vibes:personality pirate
/agent-vibes:personality list
```

### 💭 Sentiments (Style Only)

**Sentiments apply personality styles to YOUR current voice:**

```bash
# Use YOUR voice with sarcastic attitude
/agent-vibes:sentiment sarcastic

# Clear sentiment
/agent-vibes:sentiment clear
```

**Key Difference:**
- **Personality** = Changes voice + style (e.g., Pirate Marshal + pirate speak)
- **Sentiment** = Keeps your voice + adds style (e.g., Your Voice + sarcasm)

### 🎤 Combine Voice + Sentiment

```bash
# Switch to Aria with sarcastic sentiment
/agent-vibes:switch Aria --sentiment sarcastic
```

[↑ Back to top](#-table-of-contents)

---

## 🗣️ Voice Library

AgentVibes includes **27 unique ElevenLabs voices** with multilingual support:

### 🌍 Multilingual Voices (Supports 30+ Languages)

Perfect for international projects! These voices work with Spanish, French, German, Italian, Portuguese, and many more languages using ElevenLabs' Multilingual v2 model.

| Voice | Character | Languages | Best For |
|-------|-----------|-----------|----------|
| [Antoni](https://elevenlabs.io/voice-library/antoni/ErXwobaYiN019PkySvjV) | Well-balanced | 30+ | International, Spanish |
| [Rachel](https://elevenlabs.io/voice-library/rachel/21m00Tcm4TlvDq8ikWAM) | Clear, professional | 30+ | Global communication, French |
| [Domi](https://elevenlabs.io/voice-library/domi/AZnzlk1XvdvUeBnXmlld) | Strong, confident | 30+ | Leadership, German |
| [Bella](https://elevenlabs.io/voice-library/bella/EXAVITQu4vr4xnSDxMaL) | Soft, engaging | 30+ | Friendly, Italian |

### 🗣️ Language-Optimized Voices

| Voice | Character | Optimized For |
|-------|-----------|---------------|
| [Charlotte](https://elevenlabs.io/voice-library/charlotte/XB0fDUnXU5powFXDhCwa) | Expressive | French, German, Spanish |
| [Matilda](https://elevenlabs.io/voice-library/matilda/XrExE9yKIg1WjnnlVkGX) | Warm | Spanish, Portuguese |

### 🎭 English Character Voices

| Voice | Character | Best For |
|-------|-----------|----------|
| [Aria](https://elevenlabs.io/voice-library/aria-professional-narration/TC0Zp7WVFzhA8zpTlRqV) | Clear professional | Default, all-purpose |
| [Archer](https://elevenlabs.io/voice-library/archer/L0Dsvb3SLTyegXwtm47J) | Authoritative | Leadership, orchestration |
| [Jessica Anne Bogart](https://elevenlabs.io/voice-library/jessica-anne-bogart/flHkNRp1BlvT73UL6gyz) | Wickedly eloquent | Sarcastic, flirty |
| [Pirate Marshal](https://elevenlabs.io/voice-library/pirate-marshal/PPzYpIqttlTYA83688JI) | Authentic pirate | Pirate personality |
| [Grandpa Spuds Oxley](https://elevenlabs.io/voice-library/grandpa-spuds-oxley/NOpBlnGInO9m6vDvFkFC) | Wise elder | Grandpa personality |
| [Matthew Schmitz](https://elevenlabs.io/voice-library/matthew-schmitz/0SpgpJ4D3MpHCiWdyTg3) | Deep baritone | Professional |
| [Cowboy Bob](https://elevenlabs.io/voice-library/cowboy-bob/KTPVrSVAEUSJRClDzBw7) | Western charm | Casual, friendly |
| [Northern Terry](https://elevenlabs.io/voice-library/northern-terry/wo6udizrrtpIxWGp2qJk) | Eccentric British | Quirky responses |
| [Ms. Walker](https://elevenlabs.io/voice-library/ms-walker/DLsHlh26Ugcm6ELvS0qi) | Warm teacher | Professional |
| [Dr. Von Fusion](https://elevenlabs.io/voice-library/dr-von-fusion/yjJ45q8TVCrtMhEKurxY) | Mad scientist | Robot personality |
| [Michael](https://elevenlabs.io/voice-library/michael/U1Vk2oyatMdYs096Ety7) | British urban | Professional |
| [Ralf Eisend](https://elevenlabs.io/voice-library/ralf-eisend/A9evEp8yGjv4c3WsIKuY) | International | Multi-cultural |
| [Amy](https://elevenlabs.io/voice-library/amy/bhJUNIXWQQ94l8eI2VUf) | Chinese accent | Diverse |
| [Lutz Laugh](https://elevenlabs.io/voice-library/lutz-laugh/9yzdeviXkFddZ4Oz8Mok) | Jovial | Funny |
| [Burt Reynolds](https://elevenlabs.io/voice-library/burt-reynolds/4YYIPFl9wE5c4L2eu2Gb) | Smooth baritone | Confident |
| [Juniper](https://elevenlabs.io/voice-library/juniper/aMSt68OGf4xUZAnLpTU8) | Warm, friendly | Relations |
| [Tiffany](https://elevenlabs.io/voice-library/tiffany/6aDn1KB0hjpdcocrUkmq) | Professional | Leadership |
| [Tom](https://elevenlabs.io/voice-library/tom/DYkrAHD8iwork3YSUBbs) | Professional | Coordination |
| [Demon Monster](https://elevenlabs.io/voice-library/demon-monster/vfaqCOvlrKi4Zp7C2IAm) | Deep, spooky | Dramatic |

💡 **Tip:** Click voice names to hear samples on ElevenLabs!
🎧 **Try in Claude Code:** `/agent-vibes:preview` to hear all voices
🌍 **Multilingual:** Use Antoni, Rachel, Domi, or Bella for automatic language detection

[↑ Back to top](#-table-of-contents)

---

## 🔌 BMAD Plugin

**Automatically switch voices when using BMAD agents!**

The BMAD plugin detects when you activate a BMAD agent (e.g., `/BMad:agents:pm`) and automatically uses the assigned voice for that role.

### Default BMAD Voice Mappings

| Agent | Role | Voice | Personality |
|-------|------|-------|-------------|
| **pm** | Product Manager | Jessica Anne Bogart | professional |
| **dev** | Developer | Matthew Schmitz | normal |
| **qa** | QA Engineer | Burt Reynolds | professional |
| **architect** | Architect | Michael | normal |
| **po** | Product Owner | Tiffany | professional |
| **analyst** | Analyst | Ralf Eisend | normal |
| **sm** | Scrum Master | Ms. Walker | professional |
| **ux-expert** | UX Expert | Aria | normal |
| **bmad-master** | BMAD Master | Archer | zen |
| **bmad-orchestrator** | Orchestrator | Tom | professional |

### Plugin Management

```bash
# Check status (auto-enables if BMAD detected)
/agent-vibes-bmad status

# Disable plugin
/agent-vibes-bmad disable

# Re-enable plugin
/agent-vibes-bmad enable

# Customize agent voice
/agent-vibes-bmad set pm "Aria" zen

# Edit configuration
/agent-vibes-bmad edit
```

### How It Works

1. **Auto-Detection**: Plugin checks for `.bmad-core/install-manifest.yaml`
2. **Auto-Enable**: Enables automatically when BMAD is detected
3. **Settings Preservation**: Saves your previous voice/personality when enabling
4. **Restore on Disable**: Restores previous settings when disabling

### 🌍 Language Support with BMAD

When you set a language, AgentVibes intelligently selects the best voice:

**Language Priority System:**
1. **BMAD Agent Active** + **Language Set**: Uses multilingual version of agent's assigned voice
   - If agent's voice doesn't support the language → switches to Antoni/Rachel/Domi/Bella (multilingual)
2. **BMAD Agent Active** + **No Language Set**: Uses agent's assigned voice (default English)
3. **No BMAD Agent** + **Language Set**: Uses current voice if multilingual, otherwise switches to Antoni
4. **No BMAD Agent** + **No Language Set**: Uses current voice/personality normally

**Example Workflow:**
```bash
# Set language to Spanish
/agent-vibes:set-language spanish

# Activate BMAD PM agent
/BMad:agents:pm
# → Will try to use Jessica Anne Bogart for Spanish
# → If not multilingual, falls back to Antoni (Spanish-optimized)

# All TTS will speak in Spanish with appropriate voice
```

**Supported Languages:**
- Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Polish, Dutch, Turkish, Russian, and 20+ more

**Multilingual Fallback Voices:**
- **Antoni** - Best for Spanish
- **Rachel** - Best for French
- **Domi** - Best for German
- **Bella** - Best for Italian
- **Charlotte** - European languages
- **Matilda** - Latin languages

[↑ Back to top](#-table-of-contents)

---

## 📦 Installation Structure

```
your-project/
└── .claude/
    ├── commands/
    │   ├── agent-vibes/              # Voice commands
    │   └── agent-vibes-bmad.md       # BMAD plugin command
    ├── hooks/
    │   ├── voice-manager.sh          # Voice switching
    │   ├── personality-manager.sh    # Personality system
    │   ├── sentiment-manager.sh      # Sentiment system
    │   ├── bmad-voice-manager.sh     # BMAD plugin
    │   ├── play-tts.sh              # TTS playback
    │   └── voices-config.sh         # Voice ID mappings
    ├── personalities/               # 19 personality templates
    ├── plugins/
    │   └── bmad-voices.md           # BMAD voice mappings
    ├── output-styles/
    │   └── agent-vibes.md           # Voice output style
    └── audio/                       # Generated TTS files
```

### Voice Settings Storage

- **Current Voice**: `~/.claude/tts-voice.txt`
- **Current Personality**: `~/.claude/tts-personality.txt`
- **Current Sentiment**: `~/.claude/tts-sentiment.txt`

Settings persist across Claude Code sessions!

[↑ Back to top](#-table-of-contents)

---

## 💡 Usage Examples

### Switch Voices

```bash
/agent-vibes:list                    # See all voices
/agent-vibes:switch Aria             # Switch to Aria
/agent-vibes:switch "Cowboy Bob"     # Switch to Cowboy Bob
/agent-vibes:whoami                  # Check current setup
```

### Try Personalities

```bash
/agent-vibes:personality sarcastic   # Sarcastic + Jessica Anne Bogart
/agent-vibes:personality pirate      # Pirate + Pirate Marshal
/agent-vibes:personality dry-humor   # British wit + Aria
/agent-vibes:personality list        # See all 19 personalities
```

### Use Sentiments

```bash
/agent-vibes:switch Aria             # Set to Aria voice
/agent-vibes:sentiment sarcastic     # Add sarcasm to Aria
/agent-vibes:sentiment clear         # Remove sentiment
```

### Audio Replay

```bash
/agent-vibes:replay                  # Replay last message
/agent-vibes:replay 3                # Replay 3rd-to-last
```

### Voice Preview

```bash
/agent-vibes:preview                 # Hear first 3 voices
/agent-vibes:preview 10              # Hear first 10
/agent-vibes:preview last 5          # Hear last 5
```

### Change Language

Make Claude speak in **30+ languages** using multilingual voices:

```bash
# Set to Spanish
/agent-vibes:set-language spanish

# Set to French
/agent-vibes:set-language french

# Set to German
/agent-vibes:set-language german

# See all supported languages
/agent-vibes:set-language list

# Reset to English
/agent-vibes:set-language english
```

**Supported Languages:**
- Spanish, French, German, Italian, Portuguese
- Chinese, Japanese, Korean, Hindi, Arabic
- Polish, Dutch, Turkish, Swedish, Russian
- And 15+ more!

**How It Works:**
1. AgentVibes detects your language setting
2. Automatically switches to multilingual voices (Antoni, Rachel, Domi, Bella)
3. All TTS messages are spoken in your chosen language
4. Works with personalities and BMAD plugin

**Best Multilingual Voices:**
- **Antoni** - Optimized for Spanish
- **Rachel** - Optimized for French
- **Domi** - Optimized for German
- **Bella** - Optimized for Italian
- **Charlotte** - European languages
- **Matilda** - Latin languages

[↑ Back to top](#-table-of-contents)

---

## 🔧 Advanced Features

### Custom Personalities

1. Create new personality:
   ```bash
   /agent-vibes:personality add mycustom
   ```

2. Edit `.claude/personalities/mycustom.md`:
   ```markdown
   ---
   name: mycustom
   description: My style
   voice: Aria
   ---

   ## AI Instructions
   Speak in your unique style...
   ```

3. Use it:
   ```bash
   /agent-vibes:personality mycustom
   ```

### Add Custom Voices

```bash
# Get voice ID from elevenlabs.io
/agent-vibes:add "My Voice" abc123xyz789
```

### Use in Custom Output Styles

```markdown
I'll do the task
[Bash: .claude/hooks/play-tts.sh "Starting" "Aria"]

... work ...

✅ Done
[Bash: .claude/hooks/play-tts.sh "Complete" "Cowboy Bob"]
```

[↑ Back to top](#-table-of-contents)

---

## 💰 Pricing & Usage

### ElevenLabs Pricing (2025)

| Plan | Monthly Cost | Characters/Month | Best For |
|------|-------------|------------------|----------|
| **Free** | $0 | 10,000 | Trying it out, light use |
| **Starter** | $5 | 30,000 | Casual coding (1-2 hrs/day) |
| **Creator** | $22 | 100,000 | Regular coding (4-5 hrs/day) |
| **Pro** | $99 | 500,000 | Heavy daily use (8+ hrs/day) |
| **Scale** | $330 | 2,000,000 | Professional/teams |

### Monitor Your Usage

**Track consumption in real-time:**

1. **Go to ElevenLabs Dashboard**: https://elevenlabs.io/app/usage
2. **Monitor**: Credits used, character breakdown, billing period
3. **Set alerts**: Check usage weekly, watch for spikes

### Tips to Manage Costs

1. **Use selectively**: Disable TTS when doing quick edits
   ```bash
   /output-style default         # Turn off voice
   /output-style agent-vibes     # Turn back on
   ```

2. **Monitor analytics**: Check usage dashboard regularly

3. **Shorter messages**: "Normal" personality = shortest messages

4. **Upgrade proactively**: If coding 8+ hrs/day, start with Creator plan

### Useful Links

- 📊 **Usage Dashboard**: https://elevenlabs.io/app/usage
- 💳 **Pricing Page**: https://elevenlabs.io/pricing
- 🆘 **Support**: https://help.elevenlabs.io/

[↑ Back to top](#-table-of-contents)

---

## ❓ Troubleshooting

### No Audio Playing?

1. Check API key: `echo $ELEVENLABS_API_KEY`
2. Check output style: `/output-style agent-vibes`
3. Test playback: `/agent-vibes:sample Aria`

### Commands Not Found?

```bash
# Verify installation
node ~/claude/AgentVibes/bin/agent-vibes status

# Reinstall
node ~/claude/AgentVibes/bin/agent-vibes install --yes
```

### Wrong Voice Playing?

```bash
# Check current setup
/agent-vibes:whoami

# Reset if needed
/agent-vibes:personality reset
/agent-vibes:sentiment clear
```

[↑ Back to top](#-table-of-contents)

---

## 🔄 Updating

### If installed via npx:
```bash
npx agentvibes update --yes
```

### If installed globally via npm:
```bash
npm update -g agentvibes
agentvibes update --yes
```

### If installed from source:
```bash
cd ~/AgentVibes
git pull origin master
npm install
node bin/agent-vibes update --yes
```

The update command will:
- ✅ Update all slash commands
- ✅ Update TTS scripts and plugins
- ✅ Add new personalities (keeps your custom ones)
- ✅ Update output styles
- ⚠️  Preserves your voice settings and configurations

[↑ Back to top](#-table-of-contents)

---

## 🙏 Credits

**Built with ❤️ by [Paul Preibisch](https://github.com/paulpreibisch)**

- 🐦 Twitter: [@997Fire](https://x.com/997Fire)
- 💼 LinkedIn: [paul-preibisch](https://www.linkedin.com/in/paul-preibisch/)
- 🌐 GitHub: [paulpreibisch](https://github.com/paulpreibisch)

**Powered by:**
- [ElevenLabs](https://elevenlabs.io/) AI voices
- [Claude Code](https://claude.com/claude-code)
- Licensed under Apache 2.0

**Inspired by:**
- 💡 [Claude Code Hooks Mastery](https://github.com/disler/claude-code-hooks-mastery) by [@disler](https://github.com/disler)

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
