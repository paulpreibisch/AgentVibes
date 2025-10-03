# 🎤 AgentVibes

> **Bring your Claude Code sessions to life with voice!**
>
> Professional text-to-speech narration powered by ElevenLabs AI

[![npm version](https://badge.fury.io/js/agentvibes.svg)](https://badge.fury.io/js/agentvibes)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire))

---

## ✨ What is AgentVibes?

**AgentVibes adds lively voice narration to your Claude Code sessions!**

Imagine Claude speaking to you with different voices and personalities as you code. Whether you want a sarcastic assistant, a pirate captain, or a wise grandpa - AgentVibes brings your AI coding buddy to life with professional ElevenLabs voices.

### 🎯 Key Features

- 🎙️ **17+ Professional AI Voices** - Character voices, accents, and unique personalities
- 🎭 **18 Built-in Personalities** - From sarcastic to flirty, pirate to professional
- 💬 **Sentiment System** - Apply personality styles to ANY voice
- 🔊 **Live Audio Feedback** - Hear task acknowledgments and completions
- 🎵 **Voice Preview** - Listen before you choose
- 🔄 **Audio Replay** - Replay the last 10 TTS messages
- ⚡ **One-Command Install** - Get started in seconds

---

## 🚀 Quick Start

### Step 1: Install AgentVibes

**Option A: Using npx (Recommended - Coming Soon)**
```bash
cd ~/my-project
npx agentvibes install
```

**Option B: Local Development (Current)**
```bash
cd ~/my-project
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

## 🎤 Available Commands

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

### Advanced Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:set-pretext <text>` | Add prefix to all TTS messages |

---

## 🎭 Personalities vs Sentiments

### 🎪 Personalities (Voice + Style)

**Personalities change BOTH voice AND how Claude talks.** Each has a dedicated ElevenLabs voice:

| Personality | Voice | Style |
|------------|-------|-------|
| **sarcastic** | Jessica Anne Bogart | Dry wit and cutting observations |
| **flirty** | Jessica Anne Bogart | Playful charm and compliments |
| **pirate** | Pirate Marshal | Seafaring swagger - "Arr matey!" |
| **grandpa** | Grandpa Werthers | Rambling nostalgic stories |
| **angry** | Drill Sergeant | Frustrated and loud |
| **robot** | Dr. Von Fusion | Mechanical and precise |
| **zen** | Aria | Peaceful and mindful |
| **professional** | Michael | Formal and corporate |

**All 18 personalities:** sarcastic, flirty, pirate, grandpa, angry, robot, zen, professional, dramatic, millennial, surfer-dude, sassy, poetic, moody, funny, annoying, crass, normal, random

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

---

## 🗣️ Available Voices

AgentVibes includes **17 unique ElevenLabs voices:**

| Voice | Character | Best For |
|-------|-----------|----------|
| Aria | Clear professional | Default, all-purpose |
| Jessica Anne Bogart | Wickedly eloquent | Sarcastic, flirty |
| Pirate Marshal | Authentic pirate | Pirate personality |
| Grandpa Werthers | Nostalgic elder | Grandpa personality |
| Drill Sergeant | Military authority | Angry personality |
| Cowboy Bob | Western charm | Casual, friendly |
| Northern Terry | Eccentric British | Quirky responses |
| Ms. Walker | Warm teacher | Professional |
| Dr. Von Fusion | Mad scientist | Robot personality |
| Matthew Schmitz | Deep baritone | Dramatic |
| Grandpa Spuds Oxley | Wise elder | Wisdom |
| Michael | British urban | Professional |
| Ralf Eisend | International | Multi-cultural |
| Amy | Chinese accent | Diverse |
| Lutz Laugh | Jovial | Funny |
| Demon Monster | Deep and spooky | Dramatic |

---

## 📦 What Gets Installed?

```
your-project/
└── .claude/
    ├── commands/
    │   └── agent-vibes/              # All slash commands
    │       ├── agent-vibes.md
    │       ├── agent-vibes:list.md
    │       ├── agent-vibes:switch.md
    │       ├── agent-vibes:whoami.md
    │       ├── agent-vibes:personality.md
    │       ├── agent-vibes:sentiment.md
    │       └── ... (12 total)
    ├── hooks/
    │   ├── voice-manager.sh          # Voice switching
    │   ├── personality-manager.sh    # Personality system
    │   ├── sentiment-manager.sh      # Sentiment system
    │   ├── play-tts.sh              # TTS playback
    │   └── voices-config.sh         # Voice ID mappings
    ├── personalities/               # 18 personality templates
    │   ├── sarcastic.md
    │   ├── flirty.md
    │   ├── pirate.md
    │   └── ... (15 more)
    ├── output-styles/
    │   └── agent-vibes.md           # Voice output style
    └── audio/                       # Generated TTS files
        └── tts-*.mp3               # Last 10 kept
```

### Voice Settings Storage

- **Current Voice**: `~/.claude/tts-voice.txt`
- **Current Personality**: `~/.claude/tts-personality.txt`
- **Current Sentiment**: `~/.claude/tts-sentiment.txt`

Settings persist across Claude Code sessions!

---

## 🔧 CLI Management

```bash
# Check installation status
node ~/claude/AgentVibes/bin/agent-vibes status

# Update to latest version
node ~/claude/AgentVibes/bin/agent-vibes update

# Install with options
node ~/claude/AgentVibes/bin/agent-vibes install --yes --directory ~/my-project
```

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
/agent-vibes:personality grandpa     # Grandpa + Grandpa Werthers
/agent-vibes:personality list        # See all 18 personalities
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

---

## 🌟 Best Voice/Personality Combos

- **Debugging**: Sarcastic + Jessica Anne Bogart 😏
- **Learning**: Professional + Michael 📚
- **Fun Coding**: Pirate + Pirate Marshal 🏴‍☠️
- **Late Night**: Zen + Aria 🧘
- **Pair Programming**: Grandpa + Grandpa Werthers 👴

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

---

## 🔧 Advanced Usage

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

### Use in Output Styles

```markdown
I'll do the task
[Bash: .claude/hooks/play-tts.sh "Starting" "Aria"]

... work ...

✅ Done
[Bash: .claude/hooks/play-tts.sh "Complete" "Cowboy Bob"]
```

---

## 🙏 Credits

**Built with ❤️ by [Paul Preibisch](https://github.com/paulpreibisch) ([@997Fire](https://x.com/997Fire))**

- Powered by [ElevenLabs](https://elevenlabs.io/) AI voices
- Made for [Claude Code](https://claude.com/claude-code)
- Licensed under Apache 2.0

---

## 🤝 Show Some Love

If AgentVibes makes your coding more fun:
- ⭐ **Star this repo** on GitHub
- 🐦 **Tweet** and tag [@997Fire](https://x.com/997Fire)
- 🎥 **Share videos** of Claude with personality
- 💬 **Tell dev friends** about voice-powered AI

---

**Ready to give Claude a voice? Install now and code with personality! 🎤✨**
