# 🎤 AgentVibes

> **Bring your Claude Code sessions to life with voice!**
>
> Professional text-to-speech narration powered by ElevenLabs AI

[![npm version](https://badge.fury.io/js/agentvibes.svg)](https://badge.fury.io/js/agentvibes)
[![Test Suite](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml)
[![Publish](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/publish.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire))

---

## 📰 Latest Release

**[v1.0.13 - Detailed Release Notes](https://github.com/paulpreibisch/AgentVibes/releases/tag/v1.0.13)** 🐛

Critical bug fixes for update command and personality system, plus new dry humor personality and comprehensive voice mapping tests.

[→ View All Releases](https://github.com/paulpreibisch/AgentVibes/releases)

---

## ✨ What is AgentVibes?

**AgentVibes adds lively voice narration to your Claude Code sessions!**

Imagine Claude speaking to you with different voices and personalities as you code. Whether you want a sarcastic assistant, a pirate captain, or a wise grandpa - AgentVibes brings your AI coding buddy to life with professional ElevenLabs voices.

### 🎯 Key Features

- 🎙️ **17+ Professional AI Voices** - Character voices, accents, and unique personalities
- 🎭 **19 Built-in Personalities** - From sarcastic to flirty, pirate to dry humor
- 💬 **Sentiment System** - Apply personality styles to ANY voice
- 🔊 **Live Audio Feedback** - Hear task acknowledgments and completions
- 🎵 **Voice Preview** - Listen before you choose
- 🔄 **Audio Replay** - Replay the last 10 TTS messages
- ⚡ **One-Command Install** - Get started in seconds

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

| Voice | Character | Best For | Listen |
|-------|-----------|----------|--------|
| [Aria](https://elevenlabs.io/voice-library/aria-professional-narration/TC0Zp7WVFzhA8zpTlRqV) | Clear professional | Default, all-purpose | [Preview](https://elevenlabs.io/voice-library/aria-professional-narration/TC0Zp7WVFzhA8zpTlRqV) |
| [Jessica Anne Bogart](https://elevenlabs.io/voice-library/jessica-anne-bogart/flHkNRp1BlvT73UL6gyz) | Wickedly eloquent | Sarcastic, flirty | [Preview](https://elevenlabs.io/voice-library/jessica-anne-bogart/flHkNRp1BlvT73UL6gyz) |
| [Pirate Marshal](https://elevenlabs.io/voice-library/pirate-marshal/PPzYpIqttlTYA83688JI) | Authentic pirate | Pirate personality | [Preview](https://elevenlabs.io/voice-library/pirate-marshal/PPzYpIqttlTYA83688JI) |
| [Grandpa Werthers](https://elevenlabs.io/voice-library/grandpa-werthers/MKlLqCItoCkvdhrxgtLv) | Nostalgic elder | Grandpa personality | [Preview](https://elevenlabs.io/voice-library/grandpa-werthers/MKlLqCItoCkvdhrxgtLv) |
| [Drill Sergeant](https://elevenlabs.io/voice-library/drill-sergeant/vfaqCOvlrKi4Zp7C2IAm) | Military authority | Angry personality | [Preview](https://elevenlabs.io/voice-library/drill-sergeant/vfaqCOvlrKi4Zp7C2IAm) |
| [Cowboy Bob](https://elevenlabs.io/voice-library/cowboy-bob/KTPVrSVAEUSJRClDzBw7) | Western charm | Casual, friendly | [Preview](https://elevenlabs.io/voice-library/cowboy-bob/KTPVrSVAEUSJRClDzBw7) |
| [Northern Terry](https://elevenlabs.io/voice-library/northern-terry/wo6udizrrtpIxWGp2qJk) | Eccentric British | Quirky responses | [Preview](https://elevenlabs.io/voice-library/northern-terry/wo6udizrrtpIxWGp2qJk) |
| [Ms. Walker](https://elevenlabs.io/voice-library/ms-walker/DLsHlh26Ugcm6ELvS0qi) | Warm teacher | Professional | [Preview](https://elevenlabs.io/voice-library/ms-walker/DLsHlh26Ugcm6ELvS0qi) |
| [Dr. Von Fusion](https://elevenlabs.io/voice-library/dr-von-fusion/yjJ45q8TVCrtMhEKurxY) | Mad scientist | Robot personality | [Preview](https://elevenlabs.io/voice-library/dr-von-fusion/yjJ45q8TVCrtMhEKurxY) |
| [Matthew Schmitz](https://elevenlabs.io/voice-library/matthew-schmitz/0SpgpJ4D3MpHCiWdyTg3) | Deep baritone | Dramatic | [Preview](https://elevenlabs.io/voice-library/matthew-schmitz/0SpgpJ4D3MpHCiWdyTg3) |
| [Grandpa Spuds Oxley](https://elevenlabs.io/voice-library/grandpa-spuds-oxley/NOpBlnGInO9m6vDvFkFC) | Wise elder | Wisdom | [Preview](https://elevenlabs.io/voice-library/grandpa-spuds-oxley/NOpBlnGInO9m6vDvFkFC) |
| [Michael](https://elevenlabs.io/voice-library/michael/U1Vk2oyatMdYs096Ety7) | British urban | Professional | [Preview](https://elevenlabs.io/voice-library/michael/U1Vk2oyatMdYs096Ety7) |
| [Ralf Eisend](https://elevenlabs.io/voice-library/ralf-eisend/A9evEp8yGjv4c3WsIKuY) | International | Multi-cultural | [Preview](https://elevenlabs.io/voice-library/ralf-eisend/A9evEp8yGjv4c3WsIKuY) |
| [Amy](https://elevenlabs.io/voice-library/amy/bhJUNIXWQQ94l8eI2VUf) | Chinese accent | Diverse | [Preview](https://elevenlabs.io/voice-library/amy/bhJUNIXWQQ94l8eI2VUf) |
| [Lutz Laugh](https://elevenlabs.io/voice-library/lutz-laugh/9yzdeviXkFddZ4Oz8Mok) | Jovial | Funny | [Preview](https://elevenlabs.io/voice-library/lutz-laugh/9yzdeviXkFddZ4Oz8Mok) |
| [Demon Monster](https://elevenlabs.io/voice-library/demon-monster/vfaqCOvlrKi4Zp7C2IAm) | Deep and spooky | Dramatic | [Preview](https://elevenlabs.io/voice-library/demon-monster/vfaqCOvlrKi4Zp7C2IAm) |

**💡 Tip:** Click voice names or Preview links to hear samples on ElevenLabs before choosing!

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

## 🔄 Updating AgentVibes

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
- ✅ Update TTS scripts
- ✅ Add new personalities (keeps your custom ones)
- ✅ Update output styles
- ⚠️  Preserves your voice settings and configurations

---

## 💰 ElevenLabs Usage & Costs

### **Important: Monitor Your Usage!**

AgentVibes generates TTS audio for **every task acknowledgment and completion** - this can add up quickly during active coding sessions!

### 📊 **Typical Usage Patterns**

**Light coding (1-2 hours/day):**
- ~50-100 TTS messages
- ~2,500-5,000 characters/day
- ✅ **Free tier works** (10,000 chars/month)

**Moderate coding (4-5 hours/day):**
- ~200-300 TTS messages
- ~10,000-15,000 characters/day
- ⚠️ **Starter plan needed** ($5/month, 30,000 chars)

**Heavy coding (8+ hours/day):**
- ~400-600 TTS messages
- ~20,000-30,000 characters/day
- ⚠️ **Creator/Pro plan needed** ($22-$99/month)
- 💡 **May need to upgrade mid-month** if coding intensively

### 💳 **ElevenLabs Pricing (2025)**

| Plan | Monthly Cost | Characters/Month | Best For |
|------|-------------|------------------|----------|
| **Free** | $0 | 10,000 | Trying it out, light use |
| **Starter** | $5 | 30,000 | Casual coding |
| **Creator** | $22 | 100,000 | Regular coding |
| **Pro** | $99 | 500,000 | Heavy daily use |
| **Scale** | $330 | 2,000,000 | Professional/teams |

**Overage costs** (if you exceed your plan):
- Creator: $0.30 per 1,000 characters
- Pro: $0.24 per 1,000 characters
- Scale: $0.18 per 1,000 characters

### 📈 **Monitor Your Usage**

**Track your consumption in real-time:**

1. **Go to ElevenLabs Dashboard:**
   - Visit: https://elevenlabs.io/app/usage
   - Click "My Account" → "Usage Analytics"
   - Or: "Developers" → "Usage" tab

2. **What to monitor:**
   - ✅ **Credits used** - Daily and monthly totals
   - ✅ **Character breakdown** - By voice/API key
   - ✅ **Billing period alignment** - See when your plan resets
   - ✅ **Export to CSV** - Download usage data

3. **Set up alerts:**
   - Check your usage weekly
   - Watch for unexpected spikes
   - Upgrade before hitting limits

### 💡 **Tips to Manage Costs**

1. **Use selectively**: Disable TTS when doing quick edits
   ```bash
   /output-style default  # Turn off voice
   /output-style agent-vibes  # Turn back on
   ```

2. **Monitor analytics**: Check https://elevenlabs.io/app/usage regularly

3. **Shorter messages**: Personality styles affect message length
   - "Normal" personality = shortest messages
   - "Sarcastic/Grandpa" = longer messages

4. **Upgrade proactively**: If coding 8+ hours/day, start with Creator plan

### 🔗 **Useful Links**

- 📊 **Usage Dashboard**: https://elevenlabs.io/app/usage
- 💳 **Pricing Page**: https://elevenlabs.io/pricing
- 📖 **Usage Analytics Docs**: https://elevenlabs.io/docs/product-guides/administration/usage-analytics
- 🆘 **Support**: https://help.elevenlabs.io/

### ⚠️ **Fair Warning**

If you're coding **8 hours/day with Claude Code**, expect to use:
- ~600-800 TTS messages daily
- ~30,000-40,000 characters daily
- ~900,000-1,200,000 characters/month

**You'll likely need:**
- **Pro plan ($99/month)** minimum
- Or **Creator plan + overages** (~$140/month)
- Possibly **two Pro subscriptions** if coding intensively 6-7 days/week

**Always monitor your ElevenLabs analytics dashboard!** 📊

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
- 💡 [Claude Code Hooks Mastery](https://github.com/disler/claude-code-hooks-mastery) by [@disler](https://github.com/disler) - Original inspiration for Claude Code customization and hooks

---

## 🤝 Show Some Love

If AgentVibes makes your coding more fun:
- ⭐ **Star this repo** on GitHub
- 🐦 **Tweet** and tag [@997Fire](https://x.com/997Fire)
- 🎥 **Share videos** of Claude with personality
- 💬 **Tell dev friends** about voice-powered AI

---

**Ready to give Claude a voice? Install now and code with personality! 🎤✨**
