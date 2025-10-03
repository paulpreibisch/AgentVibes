# 🎤 AgentVibes

> **Bring your Claude Code sessions to life with voice!**
> Professional text-to-speech narration powered by ElevenLabs AI voices

[![npm version](https://badge.fury.io/js/agentvibes.svg)](https://badge.fury.io/js/agentvibes)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Repository**: [github.com/paulpreibisch/AgentVibes](https://github.com/paulpreibisch/AgentVibes)
**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire))

---

## 📑 Table of Contents

- [What is AgentVibes?](#-what-is-agentvibes)
- [Quick Start](#-quick-start)
- [Personalities & Sentiments](#-personalities--sentiments)
- [Voice Commands](#-voice-commands)
- [Available Voices](#-available-voices)
- [Installation Details](#-installation-details)
- [Advanced Usage](#-advanced-usage)

---

## ✨ What is AgentVibes?

**AgentVibes adds lively voice narration to your Claude Code sessions!**

Imagine Claude speaking to you with different voices and personalities as you code. Whether you want a sarcastic assistant, a pirate captain, or a wise grandpa - AgentVibes brings your AI coding buddy to life with professional ElevenLabs voices.

### 🎯 Key Features

- 🎙️ **17+ Professional AI Voices** - Choose from characters, accents, and unique personalities
- 🎭 **18 Built-in Personalities** - From sarcastic to flirty, pirate to professional
- 💬 **Sentiment System** - Apply personality styles to ANY voice you choose
- 🔊 **Live Audio Feedback** - Hear task acknowledgments and completions
- 🎵 **Voice Preview** - Listen before you choose
- 🔄 **Audio Replay** - Replay the last 10 TTS messages
- ⚡ **One-Command Install** - Get started in seconds

---

## 🚀 Quick Start

### Step 1: Install AgentVibes

**Local Development (not yet on npm):**

```bash
# From your project directory
cd ~/my-project

# Install AgentVibes
node ~/claude/AgentVibes/bin/agent-vibes install
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

---

## 🎭 Personalities & Sentiments

AgentVibes has two powerful ways to customize how Claude speaks:

### 🎪 Personalities (Voice + Style)

Personalities change **both the voice AND how Claude talks**. Each personality has a dedicated ElevenLabs voice:

| Personality | Voice | Style |
|------------|-------|-------|
| **Sarcastic** | Jessica Anne Bogart | Dry wit and cutting observations |
| **Flirty** | Jessica Anne Bogart | Playful charm and compliments |
| **Pirate** | Pirate Marshal | Seafaring swagger - "Arr matey!" |
| **Grandpa** | Grandpa Werthers | Rambling nostalgic stories |
| **Angry** | Drill Sergeant | Frustrated and loud |
| **Robot** | Dr. Von Fusion | Mechanical and precise |
| **Zen** | Aria | Peaceful and mindful |
| **Professional** | Michael | Formal and corporate |

**18 total personalities** including: dramatic, millennial, surfer-dude, sassy, poetic, moody, funny, annoying, crass, normal, and random!

```bash
# Try different personalities
/agent-vibes:personality sarcastic
/agent-vibes:personality pirate
/agent-vibes:personality grandpa

# List all available
/agent-vibes:personality list
```

### 💭 Sentiments (Style Only)

**Sentiments apply personality styles to YOUR current voice** - perfect for custom voices!

```bash
# Use YOUR voice with sarcastic attitude
/agent-vibes:sentiment sarcastic

# Use YOUR voice with flirty charm
/agent-vibes:sentiment flirty

# Clear sentiment
/agent-vibes:sentiment clear
```

**The difference:**
- **Personality** = Changes voice + style (e.g., Pirate Marshal + pirate speak)
- **Sentiment** = Keeps your voice + adds style (e.g., Your Voice + sarcasm)

### 🎤 Switch Voice with Sentiment

```bash
# Switch to Aria with sarcastic sentiment
/agent-vibes:switch Aria --sentiment sarcastic

# Switch to Cowboy Bob with zen sentiment
/agent-vibes:switch "Cowboy Bob" --sentiment zen
```

---

## 🎤 Voice Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:list` | Show all available voices |
| `/agent-vibes:switch <voice>` | Change to a different voice |
| `/agent-vibes:whoami` | Show current voice & personality |
| `/agent-vibes:preview [N]` | Preview voices with audio samples |
| `/agent-vibes:sample <voice>` | Test a specific voice |
| `/agent-vibes:replay [N]` | Replay recent TTS audio |

### Personality Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:personality <name>` | Set personality (changes voice + style) |
| `/agent-vibes:personality list` | Show all personalities |
| `/agent-vibes:personality add <name>` | Create custom personality |
| `/agent-vibes:personality edit <name>` | Edit personality file |

### Sentiment Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:sentiment <name>` | Apply sentiment to current voice |
| `/agent-vibes:sentiment list` | Show all available sentiments |
| `/agent-vibes:sentiment get` | Show current sentiment |
| `/agent-vibes:sentiment clear` | Remove sentiment |

### Advanced Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:add <name> <voice_id>` | Add custom ElevenLabs voice |
| `/agent-vibes:set-pretext <text>` | Add prefix to all TTS messages |

---

## 🗣️ Available Voices

AgentVibes includes **17 unique ElevenLabs voices**:

| Voice Name | Character | Best For |
|-----------|-----------|----------|
| **Aria** | Clear professional | Default, all-purpose |
| **Jessica Anne Bogart** | Wickedly eloquent | Sarcastic, flirty personalities |
| **Pirate Marshal** | Authentic pirate | Pirate personality |
| **Grandpa Werthers** | Nostalgic elder | Grandpa personality |
| **Drill Sergeant** | Military authority | Angry personality |
| **Cowboy Bob** | Western charm | Casual, friendly |
| **Northern Terry** | Eccentric British | Quirky responses |
| **Ms. Walker** | Warm teacher | Professional, helpful |
| **Dr. Von Fusion** | Mad scientist | Robot personality |
| **Matthew Schmitz** | Deep baritone | Dramatic readings |
| **Grandpa Spuds Oxley** | Wise elder | Wisdom and advice |
| **Michael** | British urban | Professional work |
| **Ralf Eisend** | International speaker | Multi-cultural |
| **Amy** | Chinese accent | Diverse representation |
| **Lutz Laugh** | Jovial and giggly | Funny moments |
| **Demon Monster** | Deep and spooky | Fun and dramatic |

### Add Your Own Voices

```bash
# Get voice ID from elevenlabs.io
/agent-vibes:add "My Voice" abc123xyz789
```

---

## 📦 Installation Details

### What Gets Installed?

```
your-project/
└── .claude/
    ├── commands/
    │   └── agent-vibes/           # All slash commands
    ├── hooks/
    │   ├── voice-manager.sh       # Voice switching logic
    │   ├── personality-manager.sh # Personality system
    │   ├── sentiment-manager.sh   # Sentiment system
    │   ├── play-tts.sh           # TTS playback
    │   └── voices-config.sh      # Voice ID mappings
    ├── personalities/            # 18 personality templates
    │   ├── sarcastic.md
    │   ├── flirty.md
    │   ├── pirate.md
    │   └── ... (15 more)
    ├── output-styles/
    │   └── agent-vibes.md        # Voice output style
    └── audio/                    # Generated TTS files
        └── tts-*.mp3            # Last 10 kept for replay
```

### Voice Settings Storage

- **Current Voice**: `~/.claude/tts-voice.txt`
- **Current Personality**: `~/.claude/tts-personality.txt`
- **Current Sentiment**: `~/.claude/tts-sentiment.txt`

These persist across Claude Code sessions!

### CLI Management

```bash
# Check installation status
node ~/claude/AgentVibes/bin/agent-vibes status

# Update to latest version
node ~/claude/AgentVibes/bin/agent-vibes update

# Install with options
node ~/claude/AgentVibes/bin/agent-vibes install --yes --directory ~/my-project
```

---

## 🔧 Advanced Usage

### Using in Output Styles

Specify voices directly in your custom output styles:

```markdown
I'll start the task
[Bash: .claude/hooks/play-tts.sh "Starting task" "Aria"]

... work happens ...

✅ Task complete!
[Bash: .claude/hooks/play-tts.sh "All done" "Cowboy Bob"]
```

### Create Custom Personalities

1. Create a new personality:
   ```bash
   /agent-vibes:personality add mycustom
   ```

2. Edit the generated file at `.claude/personalities/mycustom.md`:
   ```markdown
   ---
   name: mycustom
   description: My custom style
   voice: Aria
   ---

   ## AI Instructions
   Speak in your unique style here...
   ```

3. Use it:
   ```bash
   /agent-vibes:personality mycustom
   ```

### Sentiment Priority

**How it works:**
1. If sentiment is set → Uses sentiment style with current voice
2. If no sentiment → Uses personality (includes voice change)

```bash
# Example workflow
/agent-vibes:switch Aria              # Set voice to Aria
/agent-vibes:sentiment sarcastic      # Add sarcasm to Aria
/agent-vibes:sentiment clear          # Remove sentiment
/agent-vibes:personality pirate       # Switch to Pirate Marshal + pirate style
```

---

## 🌟 Tips & Tricks

### Best Voice/Personality Combos

- **Debugging**: Sarcastic + Jessica Anne Bogart 😏
- **Learning**: Professional + Michael 📚
- **Fun Coding**: Pirate + Pirate Marshal 🏴‍☠️
- **Late Night**: Zen + Aria 🧘
- **Pair Programming**: Grandpa + Grandpa Werthers 👴

### Audio Replay

Lost what Claude just said?
```bash
/agent-vibes:replay      # Replay last message
/agent-vibes:replay 2    # Replay 2nd-to-last
/agent-vibes:replay 5    # Replay 5th-to-last
```

### Voice Preview

Not sure which voice to choose?
```bash
/agent-vibes:preview        # Hear first 3 voices
/agent-vibes:preview 10     # Hear first 10 voices
/agent-vibes:preview last 5 # Hear last 5 voices
```

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

# Reinstall if needed
node ~/claude/AgentVibes/bin/agent-vibes install --yes
```

### Audio Files Piling Up?

Audio files are auto-limited to 10 most recent in `.claude/audio/`

---

## 🙏 Credits & License

**Built with ❤️ by [Paul Preibisch](https://github.com/paulpreibisch) ([@997Fire](https://x.com/997Fire))**

- Powered by [ElevenLabs](https://elevenlabs.io/) AI voices
- Made for [Claude Code](https://claude.com/claude-code)
- Licensed under Apache 2.0

---

## 🤝 Show Some Love

If AgentVibes makes your coding more fun:
- ⭐ **Star this repo** on GitHub
- 🐦 **Tweet about it** and tag [@997Fire](https://x.com/997Fire)
- 🎥 **Share your videos** of Claude with personality
- 💬 **Tell your dev friends** about voice-powered AI coding

---

**Ready to give your Claude a voice? Install now and start coding with personality! 🎤✨**
