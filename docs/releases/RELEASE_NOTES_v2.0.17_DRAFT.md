# Release v2.0.17 - MCP Integration & Language Learning Revolution

**Release Date:** October 17, 2025
**Previous Version:** v2.0.16
**Git Range:** v2.0.16..HEAD (70+ commits)

---

## 🤖 AI Summary

This major release transforms AgentVibes into a complete multi-platform TTS solution with full Claude Desktop MCP integration, an innovative Language Learning Mode for bilingual education, and comprehensive speed control across both providers. Users can now run AgentVibes in Claude Desktop via MCP server (no slash commands needed!), learn new languages through dual-language TTS playback, and control speech speed from 0.5x to 3.0x with intuitive scaling. The release also includes extensive documentation restructuring, Windows setup improvements, and 110 comprehensive tests ensuring rock-solid reliability.

---

## ✨ Major New Features

### 🎙️ Claude Desktop MCP Integration

**The Big Win:** AgentVibes now runs natively in Claude Desktop through Model Context Protocol!

#### What You Get:
- **Zero slash commands** - No more `/agent-vibes:` prefixes
- **Native MCP tools** - `text_to_speech()`, `list_voices()`, `set_voice()`, `set_personality()`, etc.
- **Easy installation** - One command: `npx agentvibes install-mcp`
- **Cross-platform support** - Windows (via WSL), macOS, Linux
- **Auto-dependency installation** - Python, MCP SDK installed automatically
- **Project-local settings** - Each Claude Desktop project has independent voice/personality
- **Provider switching** - Seamlessly switch between ElevenLabs and Piper from MCP tools

#### New MCP Tools:
1. `text_to_speech(text, voice, personality, language)` - Speak with full control
2. `list_voices()` - View all available voices for active provider
3. `set_voice(voice_name)` - Switch to different voice
4. `list_personalities()` - See personality options
5. `set_personality(personality)` - Change speaking style
6. `set_language(language)` - Speak in 30+ languages
7. `get_config()` - Check current voice/personality/language/provider
8. `replay_audio(n)` - Replay recently played TTS
9. `set_provider(provider)` - Switch between ElevenLabs/Piper
10. `set_learn_mode(enabled)` - Enable language learning
11. `set_speed(speed, target)` - Control speech speed
12. `get_speed()` - Check current speed settings

#### Installation:
```bash
# Install MCP server for Claude Desktop
npx agentvibes install-mcp

# The installer will:
# 1. Auto-install Python dependencies (mcp SDK)
# 2. Update Claude Desktop config (~/.claude/claude_desktop_config.json)
# 3. Configure provider (ElevenLabs or Piper)
# 4. Download Piper voices if using free provider
# 5. Show restart instructions
```

#### New Documentation:
- `mcp-server/README.md` - Complete MCP server documentation (347 lines)
- `mcp-server/QUICK_START.md` - Fast setup guide (205 lines)
- `mcp-server/WINDOWS_SETUP.md` - Windows-specific instructions (277 lines)
- `docs/mcp-setup.md` - Integration guide (147 lines)

#### Files Added:
- `bin/mcp-server.js` (122 lines) - Node.js MCP launcher
- `bin/mcp-server.sh` (206 lines) - Bash MCP wrapper
- `mcp-server/server.py` (706 lines) - Python MCP implementation
- `mcp-server/install-deps.js` (95 lines) - Auto-dependency installer
- `mcp-server/pyproject.toml` (52 lines) - Python project config
- `src/commands/install-mcp.js` (384 lines) - MCP installation command

**Total MCP Code:** 1,772 lines across 6 new files

---

### 🎓 Language Learning Mode

**Revolutionary Feature:** Learn languages through dual-language TTS playback!

#### How It Works:
1. Set your **main language** (e.g., English)
2. Set your **target language** (e.g., Spanish)
3. Enable learning mode
4. Every TTS message plays TWICE:
   - First in your main language (English)
   - Then in your target language (Spanish)

#### New Commands:
- `/agent-vibes:language` - Set your main/native language
- `/agent-vibes:target` - Set the language you want to learn
- `/agent-vibes:learn` - Enable/disable learning mode
- `/agent-vibes:target-voice` - Set voice for target language
- `/agent-vibes:replay-target` - Replay last target language audio

#### Sequential Audio Playback:
- **No overlapping audio** - Target language waits for main to complete
- **Lock file mechanism** - Uses `/tmp/agentvibes-audio.lock` for coordination
- **Precise timing** - Detects audio duration with ffprobe
- **Auto-timeout** - 30-second safety timeout

#### Provider-Aware Voice Mappings:
```bash
# Spanish mappings
ElevenLabs: Antoni, Matilda
Piper: en_US-lessac-medium, en_US-amy-medium

# French mappings
ElevenLabs: Rachel, Charlotte
Piper: en_US-ryan-high, en_GB-northern_english_male-medium

# German, Italian, Portuguese, Chinese, Japanese, Korean...
# 30+ languages fully supported!
```

#### Usage Example:
```bash
# Setup learning mode
/agent-vibes:language english
/agent-vibes:target spanish
/agent-vibes:learn enable

# Ask Claude something
User: "Explain how arrays work"

# Claude speaks:
1. English: "Arrays are ordered collections of elements..."
2. Spanish: "Los arrays son colecciones ordenadas de elementos..."

# Replay Spanish translation
/agent-vibes:replay-target
```

#### Files Added:
- `.claude/hooks/learn-manager.sh` (443 lines) - Learning mode implementation
- `.claude/commands/agent-vibes/learn.md` (67 lines)
- `.claude/commands/agent-vibes/language.md` (23 lines)
- `.claude/commands/agent-vibes/target.md` (30 lines)
- `.claude/commands/agent-vibes/target-voice.md` (26 lines)
- `.claude/commands/agent-vibes/replay-target.md` (14 lines)
- `.claude/hooks/replay-target-audio.sh` (64 lines)

**Total Language Learning Code:** 667 lines across 7 new files

---

### ⚡ Unified Speech Speed Control

**Cross-Provider Speed Control:** Adjust TTS speed from 0.5x to 3.0x for BOTH providers!

#### What's New:
- **Unified interface** - Same speed command works for ElevenLabs and Piper
- **Intuitive scaling** - Use `0.5x` (half speed), `1x` (normal), `2x` (double), `3x` (triple)
- **Human aliases** - Use `slow`, `slower`, `normal`, `fast`, `faster`
- **Provider-aware mapping** - Converts to provider-specific values automatically
- **Tongue twister demos** - Hear speed changes instantly
- **Independent control** - Set different speeds for main and target voices (learning mode)

#### ElevenLabs Mapping:
```
0.5x → 0.25 (ElevenLabs scale: 0.25-4.0)
1.0x → 1.0
2.0x → 2.0
3.0x → 3.0
```

#### Piper Mapping:
```
0.5x → -25% (Piper scale: -40% to +100%)
1.0x → 0%
2.0x → +50%
3.0x → +80%
```

#### Usage:
```bash
# Set speed with multiplier
/agent-vibes:set-speed 2x

# Set speed with alias
/agent-vibes:set-speed faster

# Set target voice speed (for learning mode)
/agent-vibes:set-speed target 1.5x

# Check current speeds
/agent-vibes:set-speed get

# After speed change, hear tongue twister demo:
# "The quick brown fox jumps over the lazy dog"
```

#### Files Added:
- `.claude/hooks/speed-manager.sh` (259 lines)
- `.claude/commands/agent-vibes/set-speed.md` (41 lines)

**Total Speed Control Code:** 300 lines across 2 new files

---

### 📚 Documentation Restructuring

**Complete README Overhaul:** Extracted main README into 13 focused documentation files!

#### Why This Matters:
- **README reduced** from 1,617 lines → 796 lines (50% smaller!)
- **Faster loading** - AI can read relevant docs without loading everything
- **Better organization** - Each feature has its own detailed guide
- **Easier maintenance** - Update docs without touching massive README

#### New Documentation Files:
1. `docs/quick-start.md` (85 lines) - Installation and first steps
2. `docs/mcp-setup.md` (147 lines) - Claude Desktop MCP integration
3. `docs/language-learning-mode.md` (126 lines) - Complete learning mode guide
4. `docs/providers.md` (114 lines) - ElevenLabs vs Piper comparison
5. `docs/voice-library.md` (47 lines) - Voice catalog and recommendations
6. `docs/personalities.md` (52 lines) - Personality system guide
7. `docs/commands.md` (67 lines) - Command reference
8. `docs/bmad-plugin.md` (85 lines) - BMAD integration
9. `docs/advanced-features.md` (48 lines) - Speed control, pretext, etc.
10. `docs/troubleshooting.md` (39 lines) - Common issues and solutions
11. `docs/updating.md` (53 lines) - Update instructions
12. `docs/installation-structure.md` (52 lines) - Directory structure
13. `docs/remote-audio-setup.md` (Updated, 85+ lines) - SSH audio tunneling

**Total New Documentation:** 1,000+ lines across 13 files

---

### 🪟 Windows Setup Improvements

**Complete Windows Setup Overhaul:**

#### What Changed:
- **Prerequisites first** - Python, Node.js, Claude Desktop/Code explained upfront
- **NPX installation** - No more `npm install`, use `npx agentvibes install`
- **Provider choice** - Clear comparison: Piper (free, WSL required) vs ElevenLabs (paid)
- **Human-friendly paths** - Use `%USERNAME%` instead of hardcoded names
- **Three-column tables** - Commands for Claude Desktop, Claude Code, Claude Code + MCP
- **WSL setup** - Complete WSL installation guide with Ubuntu Desktop RDP
- **Audio tunnel fix** - Scripts to fix audio over SSH (VS Code Remote)

#### New Files:
- `mcp-server/WINDOWS_SETUP.md` (277 lines) - Complete Windows guide
- `INSTALL_MCP_WINDOWS.md` (153 lines) - Windows MCP installation
- `AUDIO_TUNNEL_FIX_SUMMARY.md` (223 lines) - Audio tunnel documentation
- `scripts/fix-audio-tunnel.sh` (273 lines) - Audio tunnel fix script
- `scripts/fix-audio-tunnel-complete.sh` (255 lines) - Complete fix
- `scripts/setup-auto-monitor.sh` (86 lines) - Auto-monitor setup

**Total Windows Support:** 1,267 lines across 6 files

---

### 🧪 Comprehensive Test Coverage

**Massive Testing Expansion:** From 31 tests → 110 tests (254% increase!)

#### What Was Tested:
- **speed-manager.sh** (37 new tests)
  - Speed setting with multipliers (0.5x, 1x, 2x, 3x)
  - Human aliases (slow, slower, normal, fast, faster)
  - Provider-aware speed mapping
  - Target voice speed (learning mode)
  - Speed retrieval and validation

- **provider-manager.sh** (42 new tests)
  - Provider switching (ElevenLabs ↔ Piper)
  - Voice synchronization when switching
  - Provider info display
  - Provider testing
  - Non-interactive mode (MCP)

#### Test Files Updated:
- `test/unit/play-tts.bats` - Fixed provider config (5 tests passing)
- `test/unit/personality-manager.bats` - Fixed project-local paths (21 tests passing)
- `test/unit/voice-manager.bats` - Updated output assertions (1 test passing)

#### Test Infrastructure:
- `test/helpers/test-helper.bash` - Enhanced test utilities
- Mock audio players, curl, provider config
- Project-local directory simulation

**Test Results:**
```bash
npm test
# ✓ 110 tests passing
# ✓ 0 failures
# ✓ 100% passing rate
```

---

## 🐛 Bug Fixes

### Provider Switching Fixes
- **Fixed ElevenLabs language support** - Corrected `get_current_language()` → `get_language_code()`
- **Fixed voice sync** - Auto-update target voice when switching providers
- **Fixed non-interactive mode** - MCP provider switching works without prompts

### Audio Quality Fixes
- **128kbps bitrate preserved** - Fixed ffmpeg downsampling from 128kbps → 64kbps
- **No more static** - Eliminated quality degradation during audio padding
- **ElevenLabs static fix** - Force MP3 output to prevent static audio

### JSON Escaping (ElevenLabs)
- **Robust API communication** - Now uses jq for proper JSON escaping
- **Special characters fixed** - Handles quotes, backslashes, newlines correctly
- **Prevents API errors** - No more "Invalid \escape" errors

### BMAD Plugin Fixes
- **Provider-aware voice mapping** - BMAD agents use correct voice for active provider
- **Auto-context detection** - Improved detection of active BMAD agent

### Audio Tunnel Fixes
- **SSH audio compatibility** - Convert ElevenLabs audio to 48kHz stereo
- **Tunnel diagnostic** - Added scripts to verify audio tunnel health
- **Auto-monitor setup** - Scripts to automatically fix audio issues

---

## 🔧 Technical Changes

### Architecture Improvements

#### Project-Local Configuration Priority
All settings now check project-local `.claude/` first:
1. Check `$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt` (project-local)
2. Fall back to `~/.claude/tts-voice.txt` (global)

Applies to:
- Voice settings
- Personality settings
- Sentiment settings
- Language settings
- Provider settings
- Speed settings

#### MCP Context Detection
Smart detection of whether running in MCP vs slash command context:
```bash
if [[ -n "$MCP_SERVER_NAME" ]] || [[ -n "$MCP_SESSION_ID" ]]; then
    # Non-interactive MCP mode
else
    # Interactive slash command mode
fi
```

#### Provider-Aware Command Routing
All commands now route through provider system:
- `/agent-vibes:preview` → `provider-commands.sh preview`
- `/agent-vibes:list` → `voice-manager.sh list` (provider-aware)
- `/agent-vibes:switch` → `voice-manager.sh switch` (validates provider)

### Performance Improvements

#### Sequential Audio Playback
- Lock file prevents overlapping audio
- Duration detection with ffprobe
- Async playback with automatic cleanup
- 30-second timeout prevents deadlocks

#### Piper Voice Caching
- Auto-download default voice on first run
- Voice models cached in `~/.local/share/piper-voices/`
- Faster subsequent TTS calls

---

## 📊 Files Changed

### Summary Statistics
```
72 files changed
8,652 insertions(+)
820 deletions(-)

Net change: +7,832 lines
```

### New Files (45 total)

**MCP Integration (6 files):**
- `bin/mcp-server.js`
- `bin/mcp-server.sh`
- `mcp-server/server.py`
- `mcp-server/install-deps.js`
- `mcp-server/pyproject.toml`
- `src/commands/install-mcp.js`

**Language Learning (7 files):**
- `.claude/hooks/learn-manager.sh`
- `.claude/commands/agent-vibes/learn.md`
- `.claude/commands/agent-vibes/language.md`
- `.claude/commands/agent-vibes/target.md`
- `.claude/commands/agent-vibes/target-voice.md`
- `.claude/commands/agent-vibes/replay-target.md`
- `.claude/hooks/replay-target-audio.sh`

**Speed Control (2 files):**
- `.claude/hooks/speed-manager.sh`
- `.claude/commands/agent-vibes/set-speed.md`

**Documentation (13 files):**
- `docs/quick-start.md`
- `docs/mcp-setup.md`
- `docs/language-learning-mode.md`
- `docs/providers.md`
- `docs/voice-library.md`
- `docs/personalities.md`
- `docs/commands.md`
- `docs/bmad-plugin.md`
- `docs/advanced-features.md`
- `docs/troubleshooting.md`
- `docs/updating.md`
- `docs/installation-structure.md`
- `docs/remote-audio-setup.md` (updated)

**Windows Support (6 files):**
- `mcp-server/WINDOWS_SETUP.md`
- `INSTALL_MCP_WINDOWS.md`
- `AUDIO_TUNNEL_FIX_SUMMARY.md`
- `scripts/fix-audio-tunnel.sh`
- `scripts/fix-audio-tunnel-complete.sh`
- `scripts/setup-auto-monitor.sh`

**Test Files (2 files):**
- `test/unit/speed-manager.bats` (37 tests)
- `test/unit/provider-manager.bats` (42 tests)

**Other (9 files):**
- `AgentVibes.code-workspace`
- `scripts/README.md`
- `scripts/TROUBLESHOOTING.md`
- `scripts/CHANGELOG-2025-10-16.md`
- `scripts/AUTO-MONITOR-SETUP.md`
- `scripts/check-audio-tunnel.sh`
- `scripts/health-check-tunnel.sh`
- `setup-ubuntu-rdp-audio.sh`
- Various config/example files

### Modified Files (27 total)

**Core Hooks:**
- `.claude/hooks/language-manager.sh` (+210 lines)
- `.claude/hooks/play-tts-elevenlabs.sh` (+166 lines)
- `.claude/hooks/play-tts-piper.sh` (+104 lines)
- `.claude/hooks/provider-commands.sh` (+137 lines)
- `.claude/hooks/provider-manager.sh` (+60 lines)
- `.claude/hooks/voice-manager.sh` (+125 lines)
- `.claude/hooks/personality-manager.sh` (+31 lines)
- `.claude/hooks/bmad-tts-injector.sh` (+57 lines)

**Configuration:**
- `.claude/output-styles/agent-vibes.md` (+88 lines)
- `.claude/commands/agent-vibes/commands.json`
- `.mcp-minimal.json`

**Documentation:**
- `README.md` (+796 lines, -820 deletions = net -24)
- `RELEASE_NOTES.md` (+97 lines)
- `RELEASE_NOTES_V2.md` (+263 lines)

**Installation:**
- `src/installer.js` (+70 lines)
- `package.json` (+12 lines)

**Tests:**
- `test/unit/play-tts.bats`
- `test/unit/personality-manager.bats`
- `test/unit/voice-manager.bats`

---

## 🎯 User Impact

### For Claude Desktop Users
✅ **Native MCP integration** - AgentVibes works in Claude Desktop now!
✅ **No slash commands** - Use natural MCP tools instead
✅ **Easy setup** - One command: `npx agentvibes install-mcp`
✅ **Cross-platform** - Windows (WSL), macOS, Linux all supported

### For Language Learners
✅ **Bilingual TTS** - Hear responses in two languages
✅ **30+ languages** - Spanish, French, German, Italian, Chinese, Japanese, etc.
✅ **Sequential playback** - No overlapping audio
✅ **Replay control** - Replay target language as many times as needed
✅ **Provider-aware** - Works with both ElevenLabs and Piper

### For Power Users
✅ **Speed control** - 0.5x to 3.0x across both providers
✅ **Unified interface** - Same commands work for all providers
✅ **Independent speeds** - Different speeds for main/target voices
✅ **Tongue twister demos** - Instant feedback on speed changes

### For Windows Users
✅ **Better setup docs** - Prerequisites first, clear instructions
✅ **WSL guidance** - Complete WSL setup with audio
✅ **Audio tunnel fixes** - Scripts to fix SSH audio issues
✅ **Three-column tables** - Commands for all use cases

### For All Users
✅ **Cleaner docs** - README 50% smaller, focused files
✅ **Better reliability** - 110 tests ensure everything works
✅ **Audio quality** - No static, preserved bitrate
✅ **Provider switching** - Seamless ElevenLabs ↔ Piper

---

## 🔄 Migration Notes

### For Existing Users (v2.0.16 → v2.0.17)

**No Breaking Changes!**
- All existing configurations preserved
- Voice/personality/sentiment settings work the same
- Slash commands unchanged
- Backward compatible with v2.0.16

**To Update:**
```bash
# From Claude Code
/agent-vibes:update

# From terminal
npx agentvibes update

# Or via npm (if installed globally)
npm update -g agentvibes
```

### New Features to Try

**1. Claude Desktop MCP (NEW!):**
```bash
npx agentvibes install-mcp
# Restart Claude Desktop
# Use text_to_speech() tool!
```

**2. Language Learning Mode (NEW!):**
```bash
/agent-vibes:language english
/agent-vibes:target spanish
/agent-vibes:learn enable
# Ask Claude anything - hear it in both languages!
```

**3. Speed Control (NEW!):**
```bash
/agent-vibes:set-speed 2x
# Hear tongue twister demo at double speed!
```

---

## 📝 Breaking Changes

**None!** This release is fully backward compatible with v2.0.16.

---

## 🐛 Known Issues

### MCP Server
- **Windows WSL requirement** - Piper TTS requires WSL on Windows
- **Python 3.10+ required** - MCP server needs modern Python
- **First-time setup** - May take 2-3 minutes to install dependencies

### Language Learning Mode
- **Requires ffprobe** - Install ffmpeg for duration detection
- **30-second timeout** - Very long audio may trigger timeout (increase if needed)

### Speed Control
- **Piper range limited** - Piper supports -40% to +100% (maps to 0.5x-3.0x)
- **ElevenLabs API limits** - Speed range is 0.25 to 4.0 on ElevenLabs side

---

## 💡 What's Next (v2.1.0 Roadmap)

### Planned Features
1. **Voice cloning** - Clone your own voice with ElevenLabs
2. **Custom personalities** - Create and share personality packs
3. **Multi-model MCP** - Support Anthropic, OpenAI, Gemini via MCP
4. **Browser extension** - AgentVibes for web-based AI chats
5. **Docker support** - Containerized AgentVibes for easy deployment

---

## 🙏 Credits

### Contributors
- **Paul Preibisch** - Creator and primary developer
- **Claude AI** - Co-development partner
- **Community** - Bug reports, feature requests, testing

### Special Thanks
- **ElevenLabs** - Amazing multilingual TTS API
- **Rhasspy/Piper** - Free, offline TTS voices
- **Anthropic** - Claude Code and MCP platform
- **All beta testers** - Testing v2.0.17-beta.1 through beta.25!

---

## 📚 Resources

- **Website**: https://agentvibes.org
- **GitHub**: https://github.com/paulpreibisch/AgentVibes
- **Issues**: https://github.com/paulpreibisch/AgentVibes/issues
- **Discord**: Coming soon!
- **NPM**: https://www.npmjs.com/package/agentvibes

---

## 📊 Release Statistics

### Commits
- **70 commits** since v2.0.16
- **5 days** of development
- **25 beta releases** (beta.1 through beta.25)

### Code Changes
- **72 files changed**
- **8,652 insertions**
- **820 deletions**
- **+7,832 net lines**

### Features
- **3 major features**: MCP integration, Language Learning Mode, Speed Control
- **45 new files**: MCP, docs, tests, Windows support
- **27 modified files**: Core hooks, configs, installer
- **79 new tests**: Speed manager (37), Provider manager (42)
- **110 total tests**: 100% passing rate

### Documentation
- **13 new docs**: Quick start, MCP setup, learning mode, etc.
- **1,000+ lines**: New focused documentation
- **README reduced**: From 1,617 → 796 lines (50% smaller)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

---

**Date:** October 17, 2025
**Version:** 2.0.17
**Git Tag:** v2.0.17
**NPM:** https://www.npmjs.com/package/agentvibes/v/2.0.17
