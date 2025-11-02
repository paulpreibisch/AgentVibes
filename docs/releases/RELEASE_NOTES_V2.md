**Release Date:** October 2025
**Breaking Changes:** None - Fully backward compatible!

---

## 🎉 What's New in v2.0.17-beta

### 🔊 Automatic SSH Audio Optimization

**The biggest remote audio improvement ever!** AgentVibes now automatically detects and optimizes audio for SSH sessions.

#### **The Problem (Solved!):**
When using AgentVibes over SSH (VS Code Remote SSH, regular SSH, cloud dev environments), users experienced:
- 🔇 Static and clicking sounds instead of clear audio
- 😫 Frustrating audio quality issues
- 🛠️ Complex manual audio tunnel setup

#### **The Solution:**
AgentVibes now **auto-detects SSH sessions** and **converts audio format** for perfect playback!

**How it works:**
1. **Auto-detects** SSH environments via environment variables:
   - `SSH_CONNECTION` - Regular SSH sessions
   - `SSH_CLIENT` - SSH client connections
   - `VSCODE_IPC_HOOK_CLI` - VS Code Remote SSH
2. **Auto-converts** audio from 44.1kHz mono MP3 to 48kHz stereo WAV
3. **Perfect playback** through SSH audio tunnels with zero configuration

**Supported scenarios:**
- 🖥️ **VS Code Remote SSH** - Code locally, run TTS on remote server
- 🔐 **Regular SSH** - Standard SSH with audio tunneling
- ☁️ **Cloud Dev Environments** - AWS, Azure, GCP instances
- 🐳 **Docker/Container** - Containerized dev environments

**Benefits:**
- ✅ **Zero configuration** - Works automatically
- ✅ **Crystal clear audio** - No more static or clicking
- ✅ **Universal compatibility** - Works with all SSH audio tunnel setups
- ✅ **Backwards compatible** - Local audio still works perfectly

**Technical details:**
```bash
# Detection code (play-tts-elevenlabs.sh:351-359)
if [[ -n "$SSH_CONNECTION" ]] || [[ -n "$SSH_CLIENT" ]] || [[ -n "$VSCODE_IPC_HOOK_CLI" ]]; then
  # Convert to 48kHz stereo WAV for SSH tunnel compatibility
  ffmpeg -i input.mp3 -ar 48000 -ac 2 output.wav
fi
```

---

### 🎚️ Unified Speech Speed Control

**Single command to control speech rate across both ElevenLabs and Piper TTS!**

#### **New Speed Commands:**
```bash
# Set speed for all voices
/agent-vibes:set-speed 2x          # 2x slower (great for learning)
/agent-vibes:set-speed 0.5x        # 2x faster (for quick listening)
/agent-vibes:set-speed normal      # Reset to normal speed

# Set speed for target language only (learning mode)
/agent-vibes:set-speed target 2x   # Slow down target language

# Check current speed
/agent-vibes:set-speed get
```

#### **Features:**
- ✅ **Unified control** - Works with both ElevenLabs and Piper
- ✅ **Intuitive syntax** - `2x` = 2x slower, `0.5x` = 2x faster
- ✅ **Learning mode support** - Separate speeds for main and target languages
- ✅ **Tongue twister demos** - Automatic demo after speed changes

#### **Range:**
- **Piper TTS:** 0.5x to 3x speed (0.5x = 2x faster, 3x = 3x slower)
- **ElevenLabs:** 0.25x to 4x speed (0.25x = 4x faster, 4x = 4x slower)

---

### 🎙️ Enhanced MCP Integration

**Smarter project-specific settings and improved provider management!**

#### **Smart Context Detection:**
AgentVibes MCP now intelligently saves settings based on context:
- **Warp Terminal** → Global `~/.claude/` (terminal-wide)
- **Claude Code** → Project `.claude/` (per-project)
- **Claude Desktop** → Project `.claude/` (per-project)

#### **Improved Provider Switching:**
- ✅ **Auto-confirmation** - Speaks confirmation after provider switch
- ✅ **Voice reset** - Resets to default voice when switching providers
- ✅ **Non-interactive support** - Works seamlessly via MCP and slash commands
- ✅ **Better detection** - Enhanced `CLAUDE_PROJECT_DIR` check

#### **Auto-Install System:**
- ✅ **Automatic dependencies** - Python packages install automatically
- ✅ **NPX wrapper** - Easy Claude Desktop setup with `npx`
- ✅ **Voice download** - Piper voices download on first use
- ✅ **Windows support** - Setup guide for Windows/WSL users

---

### 🎤 Audio Quality Improvements

#### **Bitrate Preservation:**
- ✅ Fixed 128kbps bitrate during audio padding
- ✅ Eliminates static noise from format conversion
- ✅ Better quality for ElevenLabs voice previews

#### **Non-Blocking Playback:**
- ✅ TTS scripts no longer hang
- ✅ Fully detached audio players
- ✅ Faster response times

#### **Sequential Playback:**
- ✅ Language learning mode plays audio in sequence
- ✅ Main language first, then target language
- ✅ Proper waiting between audio segments

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

### 🎓 Language Learning Mode (Beta)

**Learn languages naturally with dual-language TTS!**

AgentVibes now includes a **language learning mode** that helps you learn new languages through context and repetition. Every acknowledgment and completion is spoken TWICE - first in your main language (English), then in your target language.

#### **How It Works:**

1. **Set your target language** - Choose from 30+ supported languages
2. **Enable learning mode** - Activates dual-language TTS
3. **Natural repetition** - Hear everything twice in context
4. **Adjustable speed** - Slow down target language for better comprehension

#### **New Learning Commands:**

```bash
# Set the language you want to learn
/agent-vibes:target spanish
/agent-vibes:target french
/agent-vibes:target german

# Set voice for target language (auto-selected based on provider)
/agent-vibes:target-voice Antoni          # ElevenLabs
/agent-vibes:target-voice es_ES-davefx-medium  # Piper

# Enable/disable learning mode
/agent-vibes:learn

# Set your main/native language
/agent-vibes:language english

# Adjust speech speed (Piper only)
/agent-vibes:set-speed 2x          # 2x slower (great for learning)
/agent-vibes:set-speed target 2x   # Slow down target language only
/agent-vibes:set-speed normal      # Reset to normal speed
```

#### **Example Learning Session:**

```
User: "hello"

Claude (English): "Hey there! Great to hear from you!"
🔊 Plays in English with your configured voice

Claude (Spanish): "¡Hola! ¡Qué bueno saber de ti!"
🔊 Plays in Spanish with target voice (Antoni/es_ES-davefx-medium)
```

#### **Advanced Features:**

**🎚️ Speech Rate Control (Piper TTS):**
- Slow down target language for better comprehension
- Separate speed controls for main and target languages
- Intuitive syntax: `2x` = 2x slower, `0.5x` = 2x faster
- Perfect for language learners who need more time to process

**🔄 Mixed Provider Support:**
- Use **ElevenLabs for English** (premium quality)
- Use **Piper for Spanish** (free, slower speech)
- System auto-detects provider from voice name
- Seamless switching between providers

**🎯 Auto-Voice Selection:**
- System automatically selects the best voice for your target language
- Provider-aware: ElevenLabs voices for ElevenLabs, Piper voices for Piper
- Smart fallback if preferred voice unavailable

**🌍 Supported Target Languages:**
Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, Arabic, Hindi, Polish, Dutch, Turkish, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Ukrainian, Greek, Bulgarian, Croatian, Slovak, and more!

#### **Voice Mappings by Provider:**

**ElevenLabs Voices:**
- Spanish → Antoni
- French → Rachel
- German → Domi
- Italian → Bella
- Portuguese → Matilda
- Chinese, Japanese, Korean → Antoni (multilingual)

**Piper Voices (Free, Offline):**
- Spanish → es_ES-davefx-medium
- French → fr_FR-siwis-medium
- German → de_DE-thorsten-medium
- Italian → it_IT-riccardo-x_low
- Portuguese → pt_BR-faber-medium
- Chinese → zh_CN-huayan-medium
- Japanese → ja_JP-hikari-medium

#### **Why This Helps Learning:**

1. **Context-based learning** - Hear words/phrases in real situations
2. **Natural repetition** - Every message twice, reinforcing vocabulary
3. **Pronunciation practice** - Native-quality voices model correct pronunciation
4. **Adjustable pace** - Slow down difficult phrases with speed control
5. **Consistent exposure** - Learn while coding, naturally building vocabulary
6. **No extra effort** - Learning happens passively as you work

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
│   ├── learn-manager.sh         # Language learning mode
│   ├── speed-manager.sh         # Speech rate control (Piper)
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
- `tts-learn-mode.txt` - Learning mode status (ON/OFF)
- `tts-target-language.txt` - Target language for learning
- `tts-target-voice.txt` - Voice for target language
- `tts-main-language.txt` - Main/native language
- `config/piper-speech-rate.txt` - Main voice speech rate (Piper)
- `config/piper-target-speech-rate.txt` - Target voice speech rate (Piper)

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

### Language Learning Commands:
- `/agent-vibes:target <language>` - Set target language to learn
- `/agent-vibes:target-voice <voice>` - Set voice for target language
- `/agent-vibes:learn` - Enable/disable learning mode
- `/agent-vibes:language <language>` - Set main/native language
- `/agent-vibes:set-speed <speed>` - Set speech rate (Piper only)
- `/agent-vibes:set-speed target <speed>` - Set target language speed
- `/agent-vibes:set-speed get` - Show current speed settings

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

### v2.0.17-beta Series (SSH Audio + Learning Mode):
- **Fixed SSH audio tunnel static** - Auto-converts 44.1kHz mono MP3 to 48kHz stereo WAV for remote sessions
- **Fixed ElevenLabs audio static** - Added MP3 codec (`-c:a libmp3lame`) to prevent WAV format issues
- **Fixed audio bitrate** - Preserves 128kbps during padding to eliminate static noise
- **Fixed MCP provider switching** - Enhanced non-interactive detection with `CLAUDE_PROJECT_DIR` check
- **Fixed target voice sync** - Auto-updates target voice when switching providers
- **Fixed voice/provider mismatches** - Output style now lets system choose voice based on active provider
- **Fixed learning mode config** - Corrected file names (`tts-learn-mode.txt`) and value checks (`ON`/`OFF`)
- **Fixed Piper speech rate** - Properly reads numeric values from config files (strips comments)
- **Fixed interactive prompts in MCP** - Provider switch commands now work seamlessly via slash commands
- **Fixed Spanish voice download** - Voice models now download automatically with user consent
- **Fixed audio playback hanging** - TTS scripts now fully detach audio players (non-blocking)

### v2.0.0 Core Fixes:
- Fixed symlink support for shared hooks
- Fixed WSL audio static with silence padding
- Fixed installer directory detection for npx
- Fixed release notes display in installer
- Enhanced provider detection and fallback
- Improved error handling for missing API keys
- Better voice compatibility checking

---

## 📊 Statistics

**v2.0.17-beta by the numbers:**
- 🎤 **200+ voices** across both providers
- 🌍 **30+ languages** supported (learning mode for all)
- 🎓 **1 language learning mode** with dual-language TTS
- 🎭 **19 personalities** included
- 💭 **19 sentiments** available
- 📝 **20+ slash commands** total (incl. learning commands)
- 🔧 **14 hook scripts** installed (incl. learn-manager, speed-manager)
- 🔌 **2 TTS providers** available (mixed provider support)
- 🤖 **10 BMAD agents** with voice mapping
- 🎚️ **Adjustable speech rate** for Piper TTS (0.5x - 3x)

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
