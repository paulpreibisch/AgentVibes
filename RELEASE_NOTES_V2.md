# 🎉 AgentVibes v2.0.0 - The Multi-Provider Revolution

**Release Date:** October 2025
**Breaking Changes:** None - Fully backward compatible!

---

## 🚀 Major Features

### 🎭 Multi-Provider TTS System

The biggest update in AgentVibes history! **Choose your TTS provider** and switch seamlessly without reconfiguring.

#### **Two Provider Options:**

**🎤 ElevenLabs (Premium AI Voices)**
- 150+ professional AI voices
- 30+ languages with multilingual v2 model
- Studio-quality audio with emotional range
- Character voices, accents, and personalities
- Voices: Aria, Archer, Cowboy Bob, Pirate Marshal, Grandpa Spuds, Jessica Anne Bogart, and more!

**🆓 Piper TTS (Free, Offline)**
- 50+ neural voices, completely free
- 18 languages supported
- No API key required
- Works offline (perfect for WSL/Linux)
- Privacy-focused local processing

#### **New Provider Commands:**

```bash
# View current provider
/agent-vibes:provider info

# List available providers
/agent-vibes:provider list

# Switch providers instantly
/agent-vibes:provider switch

# Test provider functionality
/agent-vibes:provider test
```

#### **Intelligent Provider Selection:**
- **Interactive installer** asks which provider you prefer
- **Automatic fallback** if API key missing
- **Voice compatibility** - automatically maps voices to provider capabilities
- **Persistent settings** - your choice is saved across sessions

---

### 🌍 Advanced Multilingual Support (30+ Languages)

AgentVibes now speaks **30+ languages** with native voice quality!

#### **Supported Languages:**
- 🇪🇸 Spanish, 🇫🇷 French, 🇩🇪 German, 🇮🇹 Italian, 🇵🇹 Portuguese
- 🇨🇳 Chinese, 🇯🇵 Japanese, 🇰🇷 Korean, 🇮🇳 Hindi, 🇸🇦 Arabic
- 🇵🇱 Polish, 🇳🇱 Dutch, 🇹🇷 Turkish, 🇸🇪 Swedish, 🇷🇺 Russian
- And 15+ more!

#### **New Language Commands:**

```bash
# Set language for TTS
/agent-vibes:set-language spanish
/agent-vibes:set-language french
/agent-vibes:set-language german

# List all supported languages
/agent-vibes:set-language list

# Check current language
/agent-vibes:whoami

# Reset to English
/agent-vibes:set-language english
```

#### **Smart Voice Selection:**
- **Language-optimized voices** - Auto-switches to Antoni (Spanish), Rachel (French), Domi (German), Bella (Italian)
- **BMAD integration** - Agents speak in your chosen language
- **Personality support** - All 19 personalities work in any language
- **Provider-aware** - Works with both ElevenLabs and Piper TTS

#### **Language Priority System:**
1. BMAD Agent + Language Set → Uses multilingual version of agent voice
2. BMAD Agent only → Uses agent's default voice (English)
3. Language Set only → Switches to language-optimized voice
4. Neither → Uses current voice/personality

---

### 🎤 Expanded Voice Library (27+ Voices)

**New multilingual voices added:**

| Voice | Character | Languages | Best For |
|-------|-----------|-----------|----------|
| **Antoni** | Well-balanced | 30+ | Spanish, International |
| **Rachel** | Clear, professional | 30+ | French, Global communication |
| **Domi** | Strong, confident | 30+ | German, Leadership |
| **Bella** | Soft, engaging | 30+ | Italian, Friendly |
| **Charlotte** | Expressive | 30+ | French, German, Spanish |
| **Matilda** | Warm | 30+ | Spanish, Portuguese |

**Enhanced English character voices:**
- Juniper, Tiffany, Tom (Team coordination)
- Ralf Eisend (International)
- Amy (Chinese accent)
- Lutz Laugh (Jovial)
- Burt Reynolds (Smooth baritone)
- Demon Monster (Dramatic)

---

### 💭 Advanced Sentiment System

**Apply personality styles to ANY voice** without changing it!

#### **How It Works:**
- **Personality** = Voice + Style (e.g., Pirate Marshal + pirate speak)
- **Sentiment** = Your Voice + Style (e.g., Aria + sarcasm)

#### **New Sentiment Commands:**

```bash
# Apply sentiment to current voice
/agent-vibes:sentiment sarcastic
/agent-vibes:sentiment flirty
/agent-vibes:sentiment zen

# List all sentiments
/agent-vibes:sentiment list

# Check current sentiment
/agent-vibes:sentiment get

# Remove sentiment
/agent-vibes:sentiment clear

# Combine voice + sentiment
/agent-vibes:switch Aria --sentiment sarcastic
```

#### **All 19 Sentiments Available:**
sarcastic, flirty, pirate, grandpa, dry-humor, angry, robot, zen, professional, dramatic, millennial, surfer-dude, sassy, poetic, moody, funny, annoying, crass, normal, random

---

### 🔌 Enhanced BMAD Plugin Integration

**Auto-voice switching for multi-agent workflows** - now with language support!

#### **What's New:**

**🌍 Multilingual BMAD Agents:**
- Set language, activate agent → Agent speaks in that language
- Intelligent voice fallback if agent's voice doesn't support language
- All 10 BMAD agents work in 30+ languages

**🎭 Per-Agent Personality:**
```bash
# Set agent with custom personality
/agent-vibes-bmad set pm "Jessica Anne Bogart" zen
/agent-vibes-bmad set dev "Matthew Schmitz" sarcastic
```

**📊 Enhanced Status Display:**
```bash
/agent-vibes-bmad status  # Shows all mappings + current language
```

#### **Default BMAD Voice Mappings:**

| Agent | Role | Voice | Personality |
|-------|------|-------|-------------|
| pm | Product Manager | Jessica Anne Bogart | professional |
| dev | Developer | Matthew Schmitz | normal |
| qa | QA Engineer | Burt Reynolds | professional |
| architect | Architect | Michael | normal |
| po | Product Owner | Tiffany | professional |
| analyst | Analyst | Ralf Eisend | normal |
| sm | Scrum Master | Ms. Walker | professional |
| ux-expert | UX Expert | Aria | normal |
| bmad-master | BMAD Master | Archer | zen |
| bmad-orchestrator | Orchestrator | Tom | professional |

---

### 🎵 Audio Management Features

#### **Voice Preview System:**
```bash
/agent-vibes:preview           # Hear first 3 voices
/agent-vibes:preview 10        # Hear first 10
/agent-vibes:preview last 5    # Hear last 5
```

#### **Audio Replay:**
```bash
/agent-vibes:replay     # Replay last message
/agent-vibes:replay 3   # Replay 3rd-to-last
```

#### **Voice Testing:**
```bash
/agent-vibes:sample Aria              # Test specific voice
/agent-vibes:sample "Cowboy Bob"      # Test with custom text
```

---

### ⚙️ Enhanced Installation & Updates

#### **Interactive Installer:**
- **Provider selection** during install
- **API key detection** and setup guidance
- **Piper TTS option** with automatic voice download
- **Visual progress** with ora spinners
- **Release notes display** showing latest changes

#### **Self-Update System:**
```bash
/agent-vibes:update         # Update with confirmation
/agent-vibes:update --yes   # Auto-confirm update
/agent-vibes:version        # Check installed version
```

#### **Update Features:**
- ✅ Updates all commands and hooks
- ✅ Adds new personalities (preserves custom ones)
- ✅ Shows release notes and commit history
- ✅ Preserves your settings and configurations
- ✅ Provider-aware (updates both ElevenLabs & Piper files)

---

### 🛠️ System Improvements

#### **Symlink Support:**
- Share hooks across projects via symlinks
- Maintain independent settings per project
- Project-local `.claude/` takes precedence over symlinks

#### **WSL Audio Fixes:**
- Automatic silence padding prevents audio static
- Enhanced audio playback for WSL2 users
- Cross-platform audio improvements

#### **GitHub Actions Integration:**
- Automated release creation
- Categorized release notes (feat/fix/chore)
- README auto-updates on release
- Comprehensive changelog generation

---

## 📦 What's Included

### Installation Structure:
```
.claude/
├── commands/agent-vibes/        # 15 slash commands
├── hooks/
│   ├── play-tts.sh             # Main TTS (provider-aware)
│   ├── play-tts-elevenlabs.sh  # ElevenLabs implementation
│   ├── play-tts-piper.sh       # Piper implementation
│   ├── provider-manager.sh      # Provider switching
│   ├── provider-commands.sh     # Provider CLI
│   ├── language-manager.sh      # Language system
│   ├── voice-manager.sh         # Voice switching
│   ├── personality-manager.sh   # Personality system
│   ├── sentiment-manager.sh     # Sentiment system
│   ├── bmad-voice-manager.sh    # BMAD integration
│   ├── piper-voice-manager.sh   # Piper voices
│   └── piper-download-voices.sh # Piper downloader
├── personalities/               # 19 personality templates
├── plugins/
│   └── bmad-voices.md          # BMAD mappings
├── output-styles/
│   └── agent-vibes.md          # Voice output style
└── audio/                      # Generated TTS files
```

### Settings Storage:
- `tts-provider.txt` - Active provider (elevenlabs/piper)
- `tts-voice.txt` - Current voice
- `tts-personality.txt` - Active personality
- `tts-sentiment.txt` - Active sentiment
- `tts-language.txt` - Selected language

---

## 🎯 Complete Command Reference

### Voice Commands:
- `/agent-vibes:list` - Show all voices
- `/agent-vibes:switch <voice>` - Change voice
- `/agent-vibes:whoami` - Show current setup
- `/agent-vibes:preview [N]` - Preview voices
- `/agent-vibes:sample <voice>` - Test voice
- `/agent-vibes:add <name> <id>` - Add custom voice
- `/agent-vibes:replay [N]` - Replay audio
- `/agent-vibes:get` - Get current voice

### Provider Commands:
- `/agent-vibes:provider switch` - Change TTS provider
- `/agent-vibes:provider info` - Show current provider
- `/agent-vibes:provider list` - List all providers
- `/agent-vibes:provider test` - Test provider

### Language Commands:
- `/agent-vibes:set-language <lang>` - Set TTS language
- `/agent-vibes:set-language list` - Show languages
- `/agent-vibes:set-language english` - Reset to English

### Personality Commands:
- `/agent-vibes:personality <name>` - Set personality
- `/agent-vibes:personality list` - Show all
- `/agent-vibes:personality add <name>` - Create custom
- `/agent-vibes:personality edit <name>` - Edit file
- `/agent-vibes:personality get` - Show current
- `/agent-vibes:personality reset` - Reset to normal

### Sentiment Commands:
- `/agent-vibes:sentiment <name>` - Apply sentiment
- `/agent-vibes:sentiment list` - Show all
- `/agent-vibes:sentiment get` - Show current
- `/agent-vibes:sentiment clear` - Remove sentiment

### BMAD Plugin Commands:
- `/agent-vibes-bmad status` - Show plugin status
- `/agent-vibes-bmad enable` - Enable plugin
- `/agent-vibes-bmad disable` - Disable plugin
- `/agent-vibes-bmad list` - List agent mappings
- `/agent-vibes-bmad set <agent> <voice> [personality]` - Update mapping
- `/agent-vibes-bmad edit` - Edit configuration

### System Commands:
- `/agent-vibes:version` - Show version
- `/agent-vibes:update [--yes]` - Update to latest

---

## 🔄 Migration Guide

### From v1.x to v2.0:

**No breaking changes!** v2.0 is fully backward compatible.

**Recommended steps:**

1. **Update AgentVibes:**
   ```bash
   /agent-vibes:update
   ```

2. **Choose your provider:**
   - If you have ElevenLabs API key → Keep using ElevenLabs
   - Want free/offline → Switch to Piper TTS:
     ```bash
     /agent-vibes:provider switch
     ```

3. **Try multilingual:**
   ```bash
   /agent-vibes:set-language spanish
   ```

4. **Explore sentiments:**
   ```bash
   /agent-vibes:sentiment sarcastic
   ```

**Your existing settings are preserved:**
- ✅ Current voice
- ✅ Personality preferences
- ✅ Custom voices
- ✅ BMAD mappings

---

## 💰 Pricing & Cost Management

### ElevenLabs Pricing (2025):
- **Free:** $0/month - 10,000 chars (light use)
- **Starter:** $5/month - 30,000 chars (casual)
- **Creator:** $22/month - 100,000 chars (regular)
- **Pro:** $99/month - 500,000 chars (heavy)

### Piper TTS:
- **Completely FREE** - No limits, no API key
- Offline processing
- Privacy-focused
- Great for development and testing

### Cost-Saving Tips:
1. Use Piper TTS for development
2. Use ElevenLabs for demos/production
3. Switch providers with one command:
   ```bash
   /agent-vibes:provider switch
   ```

---

## 🐛 Bug Fixes

- Fixed symlink support for shared hooks
- Fixed WSL audio static with silence padding
- Fixed installer directory detection for npx
- Fixed release notes display in installer
- Enhanced provider detection and fallback
- Improved error handling for missing API keys
- Better voice compatibility checking

---

## 📊 Statistics

**v2.0.0 by the numbers:**
- 🎤 **200+ voices** across both providers
- 🌍 **30+ languages** supported
- 🎭 **19 personalities** included
- 💭 **19 sentiments** available
- 📝 **15 slash commands** total
- 🔧 **12 hook scripts** installed
- 🔌 **2 TTS providers** available
- 🤖 **10 BMAD agents** with voice mapping

---

## 🙏 Credits

**Built with ❤️ by [Paul Preibisch](https://github.com/paulpreibisch)**

**Powered by:**
- [ElevenLabs](https://elevenlabs.io/) - Premium AI voices
- [Piper TTS](https://github.com/rhasspy/piper) - Free neural voices
- [Claude Code](https://claude.com/claude-code) - AI coding assistant

**Special Thanks:**
- [@disler](https://github.com/disler) for Claude Code hooks inspiration
- ElevenLabs team for incredible voice technology
- Piper TTS community for open-source excellence
- BMAD community for multi-agent framework

---

## 🚀 Get Started

### Install v2.0:
```bash
npx agentvibes install
```

### Update from v1.x:
```bash
/agent-vibes:update
```

### Enable Voice in Claude Code:
```bash
/output-style agent-vibes
```

---

## 📚 Resources

- 📖 **Documentation:** [README.md](README.md)
- 🐛 **Issues:** [GitHub Issues](https://github.com/paulpreibisch/AgentVibes/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/paulpreibisch/AgentVibes/discussions)
- 🌐 **Website:** [agentvibes.org](https://agentvibes.org)
- 📦 **NPM:** [npmjs.com/package/agentvibes](https://www.npmjs.com/package/agentvibes)

---

**Ready to code with personality in multiple languages? Install v2.0 now! 🎤✨**

[↑ Back to top](#-agentvibes-v200---the-multi-provider-revolution)
