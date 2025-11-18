# Release v2.7.0 - Party Mode Voice Improvements

**Release Date:** 2025-11-18
**Type:** Minor Release (New Features)

## 🎯 AI Summary

AgentVibes v2.7.0 transforms BMAD party mode into a professional multi-agent voice conversation system. This release introduces a sophisticated TTS queue architecture that enables sequential voice playback without blocking Claude Code, natural 2-second pauses between speakers, and customizable agent introductions. The configuration system has been reorganized to use the official `.claude/config/` directory, and several critical text-to-speech bugs have been fixed.

**Key Highlights:**
- 🎭 **TTS Queue System** - Sequential non-blocking voice playback for party mode
- ⏸️ **Natural Speaker Pauses** - 2-second delay between agents for conversation flow
- 🎤 **Speaker Introductions** - Configurable intro text (e.g., "John, Product Manager here")
- 📁 **Config Reorganization** - Moved from `.claude/plugins/` to official `.claude/config/`
- 🐛 **Text Escaping Fixes** - No more "backslash exclamation" in speech

---

## ✨ New Features

### TTS Queue System for Party Mode

**Non-Blocking Sequential Playback** (commit: b4c7dd71)
- New `tts-queue.sh` and `tts-queue-worker.sh` background queue system
- Agents queue TTS requests and return immediately (non-blocking)
- Queue worker plays audio sequentially in the background
- Claude Code continues at full speed while voices play in order
- Base64 encoding handles special characters safely (apostrophes, quotes, etc.)
- Auto-starting worker with 5-second idle timeout
- Prevents audio overlap in multi-agent party mode discussions

**Benefits:**
```
Before: Agent 1 text → [WAIT 3s] → Agent 2 text → [WAIT 3s] → Agent 3 text
After:  Agent 1, 2, 3 text (instant) → [Audio plays sequentially in background]
```

### Natural Conversation Flow

**2-Second Pause Between Speakers** (commit: b4c7dd71)
- Automatic pause added after each agent finishes speaking
- Gives users time to process what was said before next agent speaks
- Creates natural conversation rhythm in party mode
- Implemented in queue worker for consistent timing

### Customizable Speaker Introductions

**Agent Identification System** (commit: b4c7dd71)
- New "Intro" column in voice mapping table
- Default introductions for all 10 BMAD agents:
  - "John, Product Manager here"
  - "Mary, Business Analyst here"
  - "Winston, Architect here"
  - And 7 more specialized intros
- Intro text automatically prepended before dialogue
- Fully customizable via markdown table
- Leave blank to disable intro for specific agents
- New `get-intro` command in `bmad-voice-manager.sh`

---

## 🔧 Configuration Improvements

### Official Config Directory Migration

**Moved to .claude/config/** (commit: b4c7dd71)
- Migrated `bmad-voices.md` from `.claude/plugins/` to `.claude/config/`
- Moved `bmad-voices-enabled.flag` to config directory
- Updated all references in `bmad-voice-manager.sh`
- Aligns with Claude Code's official directory structure
- Avoids potential conflicts with future plugin system

**Why This Matters:**
- `.claude/config/` is the official location for configuration files
- `.claude/plugins/` was never an official Claude Code directory
- Better organization alongside `agentvibes.json`
- Future-proof against official plugin system conflicts

---

## 🐛 Bug Fixes

### Text Escaping Issues

**Backslash Escaping Fix** (commit: b4c7dd71)
- Fixed: TTS would speak "backslash exclamation" when text contained `\!`
- Solution: Added defensive stripping in `play-tts.sh` lines 49-52
- Removes `\!` and `\$` escape sequences before TTS
- Clean speech output without unwanted "backslash" words
- Also applied to `bmad-speak.sh` for BMAD agent dialogue

### Voice Mapping Column Numbers

**AWK Column Parsing** (commit: b4c7dd71)
- Fixed: Voice lookups after adding Intro column
- AWK pipe-delimited parsing has empty $1, shifted all columns
- Updated all column references in `bmad-voice-manager.sh`:
  - Voice columns: 5 (ElevenLabs), 6 (Piper)
  - Intro column: 4
  - Personality column: 7
- Voice selection now works correctly with new table structure

---

## 📚 Documentation

### TTS Queue Architecture

**New Documentation** (commit: b4c7dd71)
- Added comprehensive `README-TTS-QUEUE.md` (135 lines)
- Architecture diagrams and flow explanations
- Queue file format and worker lifecycle details
- Troubleshooting guide for common issues
- Performance benefits comparison (before/after)
- Thread safety and auto-restart behavior

### Voice Configuration Guide

**Updated Table Format** (commit: b4c7dd71)
- Documented new 6-column format with Intro field
- Clear instructions for editing introductions
- Examples of customizing agent identification
- Explanation of leaving Intro blank to disable

---

## 🔧 Technical Details

### Files Added
- `.claude/hooks/tts-queue.sh` (105 lines) - Queue manager for TTS requests
- `.claude/hooks/tts-queue-worker.sh` (68 lines) - Background sequential audio player
- `.claude/hooks/README-TTS-QUEUE.md` (135 lines) - Queue system documentation
- `.claude/config/bmad-voices.md` (moved from plugins)
- `.claude/config/bmad-voices-enabled.flag` (moved from plugins)

### Files Modified
- `.claude/hooks/bmad-speak.sh` - Display name mapping, intro support, queue integration
- `.claude/hooks/bmad-voice-manager.sh` - Config path update, intro functions, column fixes
- `.claude/hooks/play-tts.sh` - Backslash escaping fix

### Files Removed
- `.claude/plugins/bmad-voices.md` (moved to config)

### Queue System Architecture

**Queue File Format** (Base64 encoded):
```bash
TEXT_B64=<base64-encoded-text>
VOICE_B64=<base64-encoded-voice-name>
```

**Worker Lifecycle:**
1. Auto-starts when first item added to empty queue
2. Processes oldest items first (timestamp-sorted)
3. Blocks during audio playback (lock mechanism)
4. Adds 2-second pause after each item
5. Auto-exits after 5 seconds idle

**Thread Safety:**
- Queue items use nanosecond timestamps for uniqueness
- Audio lock file prevents simultaneous playback
- Worker PID tracking prevents multiple workers

---

## 📊 Stats

- **Commits:** 1
- **Files Changed:** 8
- **Lines Added:** 420
- **Lines Removed:** 50
- **New Scripts:** 2 (queue manager + worker)
- **Documentation:** 1 comprehensive guide

---

## 🚀 Upgrade Guide

### From v2.6.0

**No breaking changes** - this is a backward-compatible feature release.

To get the new features:

```bash
# Update AgentVibes
npx agentvibes update

# Party mode will automatically use the queue system
# Voice introductions work immediately with defaults
# Config files automatically migrated to .claude/config/
```

### Customizing Speaker Introductions

Edit `.claude/config/bmad-voices.md`:

```markdown
| Agent ID | Agent Name | Intro | ElevenLabs Voice | Piper Voice | Personality |
|----------|------------|-------|------------------|-------------|-------------|
| pm | John | John here | Matthew Schmitz | en_US-ryan-high | professional |
```

Change "John here" to your preferred introduction text, or leave blank to disable.

---

## 💡 Usage Examples

### Queue Status Commands

```bash
# Check queue status
bash .claude/hooks/tts-queue.sh status

# Clear all pending TTS (emergency stop)
bash .claude/hooks/tts-queue.sh clear
```

### Party Mode Improvements

When multiple BMAD agents respond:

**Before:**
- All voices spoke simultaneously (overlapping audio)
- No natural pauses between speakers
- No identification of which agent is speaking

**After:**
- Sequential playback with correct voices
- 2-second pauses for natural flow
- Each agent identifies themselves (e.g., "Mary, Business Analyst here")
- Claude Code remains responsive during TTS

---

## 🤝 Contributors

- Paul Preibisch (@paulpreibisch)
- Claude AI (code generation assistant)

---

## 🔗 Links

- **npm Package:** https://www.npmjs.com/package/agentvibes
- **GitHub Repository:** https://github.com/paulpreibisch/AgentVibes
- **GitHub Release:** https://github.com/paulpreibisch/AgentVibes/releases/tag/v2.7.0

---

**Full Changelog:** https://github.com/paulpreibisch/AgentVibes/compare/v2.6.0...v2.7.0

---

