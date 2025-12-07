# Release v2.15.0 - Background Music & Audio Effects

**Release Date:** December 7, 2024
**Type:** Minor Release (New Features)

## 🎵 AI Summary

AgentVibes v2.15.0 introduces a comprehensive background music system with audio effects processing for TTS output. This release includes 16 professionally-optimized music tracks spanning Latin, World, Electronic, and Classical genres, each crafted as seamless 15-second loops. The new audio processor enables per-agent voice effects and background music mixing with fade-in/out capabilities. A critical bug fix ensures background music properly respects enabled/disabled settings through Test-Driven Development (TDD). The system includes natural language music switching, auto-installation of config files, and complete test coverage for robust operation. BMAD v6 integration adds YAML-based voice mappings for multi-agent conversations with automatic detection and XML-style TTS injection. **Breaking change**: ElevenLabs TTS provider has been removed due to cost impracticality for heavy daily Claude use—users should migrate to the free, local Piper TTS provider.

## ✨ Key Highlights

* 🎶 **16 Background Music Tracks** - Complete library including Salsa, Bachata, Cumbia, Japanese City Pop, Bossa Nova, Celtic Harp, and more
* 🎛️ **Audio Effects Processor** - Per-agent voice effects (reverb, pitch, EQ, compression) with background music mixing
* 🐛 **TDD Bug Fix** - Background music now correctly respects enabled/disabled flag with comprehensive test coverage
* 📦 **Auto-Install Config** - Smooth first-time setup with automatic config file installation
* 🎚️ **Natural Language Control** - Switch music tracks using conversational commands like "change to salsa"
* 🔧 **Set-All Command Fix** - Background music `set-all` now properly updates default entry
* 🤖 **BMAD v6 Support** - YAML voice mappings for BMAD agents with auto-detection and XML-style TTS injection
* 🔊 **Paplay Fix** - Prioritized for Linux/WSL to fix choppy audio on RDP connections
* ⚡ **ElevenLabs Removed** - Discontinued due to cost impracticality for heavy daily Claude use

## 🎵 New Features

### Background Music System
- **16 Optimized Music Tracks** (3.9MB total)
  - **Latin Collection**: Salsa, Bachata, Cumbia (3x volume boost for voice mixing)
  - **World Music**: Japanese City Pop, Bossa Nova, Arabic, Celtic Harp, Hawaiian Slack Key Guitar, Gnawa Ambient, Tabla Dream Pop
  - **Electronic**: Chillwave, Dark Chill Step, Goa Trance, Dreamy House
  - **Classical**: Harpsichord
  - **Instrumental**: Soft Flamenco
- All tracks are 15-second seamless loops with 0.3s fade in/out
- 128kbps MP3 format optimized for size and quality
- Snake_case filenames for consistency

### Audio Processing
- **Audio Processor** (`.claude/hooks/audio-processor.sh`)
  - Applies sox voice effects per agent
  - Mixes background music with automatic volume management
  - Seamless looping with position tracking
  - RDP mode support for remote sessions
- **Background Music Manager** (`.claude/hooks/background-music-manager.sh`)
  - Commands: on/off/status/list/volume/set-default/set-agent/set-all
  - Natural language support via slash command
  - Project-local configuration
- **Config Auto-Install**
  - Automatic installation of `.claude/config/` files during install/update
  - Ensures `audio-effects.cfg` exists for smooth first-time setup
  - Preserves user customizations on updates

### User Experience
- **Detailed File List During Installation**
  - Shows each background music track with name, size, and path
  - Matches Piper voice installation output format
- **Natural Language Music Switching**
  - Enhanced slash command documentation with clear instructions
  - Prevents manual config editing errors
  - Direct path usage (no global path searches)
- **MCP Server Integration**
  - Background music management tools for Claude Desktop app
  - Seamless integration with existing provider system

### BMAD Integration (v6 Support)
- **YAML Voice Mappings** for BMAD agents
  - Voice assignments stored in `.agentvibes/bmad/bmad-voices.md`
  - Provider-aware voice selection (Piper TTS)
  - Customizable per-agent voices and personalities
  - Supports both agent IDs and display names
- **BMAD v6 Compatibility**
  - Detects BMAD v6 directory structure (`bmad/bmm/agents/`)
  - XML-style TTS injection (`<step n="4.5">` format)
  - Backward compatible with BMAD v4
- **Auto-Enable Plugin**
  - BMAD voice plugin automatically enables when BMAD installation detected
  - No manual configuration required

## ⚡ Breaking Changes

### ElevenLabs Provider Removed
- **Removed**: ElevenLabs TTS provider and all related code
- **Reason**: Cost impractical for heavy daily Claude use
  - API costs accumulate quickly with frequent TTS requests
  - Not suitable for developers using Claude extensively throughout the day
  - Local Piper TTS provides unlimited, free, high-quality voices
- **Files Removed**:
  - `.claude/hooks/play-tts-elevenlabs.sh` (420 lines)
  - `mcp-server/docs/elevenlabs-setup.md` (213 lines)
- **Migration**: Users should switch to Piper TTS (default provider)
  - Already installed and configured automatically
  - No API keys required
  - 50+ voices available including multi-speaker models
  - Better for heavy usage scenarios

**Impact**: Existing ElevenLabs users must switch to Piper TTS. Use `/agent-vibes:switch` to select a new voice from the Piper library.

## 🐛 Bug Fixes

### Critical Fixes
- **Background Music Enabled/Disabled Flag** (TDD)
  - Fixed bug where background music played even when disabled
  - Added `is_background_music_enabled()` function to check flag before mixing
  - Defaults to disabled if config file missing
  - Comprehensive test suite: `test/unit/background-music-disabled.bats`
  - Tests verify: disabled state, enabled state, and default behavior

### Background Music System Fixes
- **Set-All Command**
  - Now updates `default` entry along with all named agents
  - Previously skipped default, causing music switching issues
  - Fixed natural language switching workflow
- **Slash Command Execution**
  - Updated `/agent-vibes:background-music` with execution instructions
  - Added critical path information to prevent global path searches
  - Prevents searching for non-existent `/agent-vibes/cli.sh` or `~/.agentvibes/cli.sh`

### Audio Playback Fixes
- **Paplay Priority for Linux/WSL**
  - Changed audio player order to prioritize `paplay` over `mpv` and `aplay`
  - Fixes choppy audio on WSL/Linux and RDP connections
  - PulseAudio (`paplay`) provides smoother playback over remote connections
  - Platform detection: macOS uses `afplay`, Linux/WSL now prefers `paplay` first

### NPM Package Fixes
- **Files Array in package.json**
  - Added explicit `files` array to publish background music tracks
  - Whitelisted `.claude/audio/tracks/*.mp3` in `.gitignore`
  - Narrowed files array to exclude 2.6GB of temp TTS files
  - Fixed 827MB package bloat issue
- **Installer Path Corrections**
  - Corrected background music copy from `tracks/` not `tracks/optimized/`
  - Fixed folder rename from `backgrounds/` to `tracks/`

## 📚 Documentation Updates

- **Natural Language Handling Instructions**
  - Added clear workflow for music switching requests
  - Documented proper use of `background-music-manager.sh`
  - Examples: "change to salsa" → list tracks → find exact filename → execute set-default
- **Critical Path Information**
  - Script location always at `.claude/hooks/background-music-manager.sh`
  - Never search for global paths
  - Use relative path from project directory
- **Slash Command Documentation**
  - Updated `/agent-vibes:background-music` with all commands
  - Added usage examples with expected output
  - Documented requirements (sox, ffmpeg)

## 🧪 Testing

### New Test Suites
- **background-music-disabled.bats**
  - Test 1: Background music NOT mixed when disabled
  - Test 2: Background music IS mixed when enabled
  - Test 3: Defaults to disabled if config missing
- **background-music.test.js**
  - Node.js tests for background music manager
- **test-background-music.sh**
  - Manual testing script

### Test Coverage
- All background music enabled/disabled scenarios covered
- Audio processor mixing logic tested
- Config file auto-install verified
- Natural language switching workflow tested

## 🔧 Technical Changes

### Architecture
- **Audio Processing Pipeline**
  - Input WAV → Sox Effects → Background Music Mixing → Output WAV
  - Per-agent configuration in `audio-effects.cfg`
  - Format: `AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|VOLUME`
- **Configuration Files**
  - `.claude/config/audio-effects.cfg` - Per-agent voice effects and music
  - `.claude/config/background-music-enabled.txt` - Global enable/disable flag
  - `.claude/config/background-music-position.txt` - Track position for seamless looping
  - `.claude/config/background-music-volume.txt` - Global volume setting

### Refactoring
- **Folder Structure**
  - Renamed `.claude/audio/backgrounds/` → `.claude/audio/tracks/`
  - Simplified structure removes nested `optimized/` folder
  - All tracks in single directory for clarity
- **File Naming**
  - Converted all track names to snake_case
  - Example: `Agent Vibes Salsa v2 Loop.mp3` → `agent_vibes_salsa_v2_loop.mp3`

## 📦 Package Updates

- **Size**: ~5MB (down from 827MB with proper files array)
- **New Files Included**:
  - `.claude/audio/tracks/*.mp3` (16 tracks)
  - `.claude/config/audio-effects.cfg`
  - `.claude/hooks/audio-processor.sh`
  - `.claude/hooks/background-music-manager.sh`
  - Test files: `test/unit/background-music-disabled.bats`, `test/unit/background-music.test.js`

## 🚀 Migration Notes

### For Existing Users
1. **Auto-Upgrade**: Run `npx agentvibes update` to install new music tracks and config files
2. **Background Music**: Disabled by default - enable with `/agent-vibes:background-music on`
3. **Config Files**: Auto-installed to `.claude/config/` on update
4. **Old Backgrounds Folder**: Can be safely deleted if exists (renamed to `tracks/`)

### For New Users
1. **Installation**: All music tracks and config files installed automatically
2. **Enable Music**: Use `/agent-vibes:background-music on`
3. **Choose Track**: Use `/agent-vibes:background-music list` then `set-default TRACK_NAME`
4. **Natural Language**: Just say "change to salsa" or "switch to jazz"

## 🎯 User Impact

### Positive Changes
- ✅ Rich background music library enhances TTS experience
- ✅ Per-agent voice effects create distinct personalities
- ✅ Smooth first-time setup with auto-config installation
- ✅ Natural language music switching is intuitive
- ✅ Background music properly respects on/off toggle
- ✅ Comprehensive test coverage ensures reliability

### Breaking Changes
- ⚠️ **ElevenLabs Removed**: Users relying on ElevenLabs TTS must switch to Piper TTS
  - Migration is seamless: Piper is already installed by default
  - Use `/agent-vibes:switch` to select from 50+ free voices
  - No configuration or API keys required

## 🔗 Related Links

- **GitHub Release**: https://github.com/paulpreibisch/AgentVibes/releases/tag/v2.15.0
- **NPM Package**: https://www.npmjs.com/package/agentvibes
- **Documentation**: See updated slash command help for `/agent-vibes:background-music`

## 👏 Credits

This release brings cinematic audio quality to AI assistants with professionally crafted background music and sophisticated audio processing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
