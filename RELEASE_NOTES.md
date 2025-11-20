# Release v2.9.5 - Legacy Output Styles Cleanup

**Release Date:** TBD
**Type:** Patch Release (Cleanup)

## 🎯 AI Summary

AgentVibes v2.9.5 removes legacy output styles installation that became obsolete when we switched to the SessionStart hook system for TTS activation. This cleanup reduces installation time, saves disk space, and simplifies the codebase without affecting functionality.

## 🧹 Cleanup

### Removed Legacy Output Styles Installation
- Removed `copyOutputStyles()` function from installer (src/installer.js:589-608)
- Deleted `templates/output-styles/` directory from repository
- Removed unused `check-output-style.sh` hook
- Updated documentation to reflect SessionStart hook system

### Migration Note for Existing Users
If you previously installed AgentVibes, you can safely delete the `.claude/output-styles/` directory from your projects. The SessionStart hook system (`.claude/hooks/session-start.sh`) now handles TTS activation automatically and is more reliable than the old output styles approach.

---

# Release v2.7.2 - Party Mode Voice Fixes

**Release Date:** 2025-11-18
**Type:** Patch Release (Bug Fixes)

## 🎯 AI Summary

AgentVibes v2.7.2 resolves critical party mode voice issues and enhances the multi-agent conversation experience. This patch fixes issue #38 where BMAD agents appeared to use the same voice due to non-provider-aware status display, and issue #39 by showing audio file locations in output. The speaker delay has been increased from 2s to 4s and made configurable, documentation paths have been updated from the old `.claude/plugins/` to the official `.claude/config/` directory, and the command has been renamed to prevent conflicts with BMAD's party mode.

**Key Highlights:**
- 🎭 **Provider-Aware Voice Display** - Fixed issue #38: Voice mappings now show correct voices for active TTS provider
- 📍 **Audio File Locations** - Fixed issue #39: TTS output now displays file paths and voice used
- ⏸️ **Configurable Speaker Delay** - Increased from 2s to 4s with customizable configuration
- 📁 **Documentation Path Updates** - Migrated all references from `.claude/plugins/` to `.claude/config/`
- 🎪 **Command Renamed** - Prevents conflict with BMAD's `/bmad:core:workflows:party-mode`

---

## 🐛 Bug Fixes

### Issue #38: Provider-Aware Voice Mappings

**Fixed Voice Display for Active Provider** (commit: 34db8510)
- Problem: `list_mappings()` in `bmad-voice-manager.sh` always showed ElevenLabs voices regardless of active provider
- Made agents appear to use same voice when using Piper provider
- Solution: Added provider detection logic to `list_mappings()` function
- Now displays correct voice column based on active TTS provider (Piper or ElevenLabs)
- Added provider indicator to status output: "Provider: piper" or "Provider: elevenlabs"
- Actual voice assignment was working correctly - only the display was wrong

**Technical Details:**
```bash
# Detect active TTS provider
local active_provider="elevenlabs"  # default
if [[ -f ".claude/tts-provider.txt" ]]; then
    active_provider=$(cat .claude/tts-provider.txt)
elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
    active_provider=$(cat "$HOME/.claude/tts-provider.txt)
fi

# Select correct voice column
local voice_column=5  # ElevenLabs (AWK column 5)
if [[ "$active_provider" == "piper" ]]; then
    voice_column=6  # Piper (AWK column 6)
fi
```

### Issue #39: Display Audio File Locations

**Show TTS Output in Party Mode** (commit: 3afff2b0)
- Problem: Audio file paths were hidden due to `2>/dev/null` redirect
- Users couldn't see which files were being played or which voices were used
- Solution: Removed output suppression from `tts-queue-worker.sh`
- Now displays: File path, voice used, and model information
- Helps with debugging and transparency

**Example Output:**
```
🎭 Using multi-speaker voice: kristin (Model: 16Speakers, Speaker ID: 2)
🎵 Saved to: /home/fire/claude/AgentVibes/.claude/audio/tts-padded-1763498669.wav
🎤 Voice used: 16Speakers (Piper TTS)
```

### Party Mode Hook Path Issues

**Project Hooks vs Global Hooks** (commit: 34a53d67)
- Problem: Party mode instructions didn't specify project-local hooks
- Claude AI sometimes used `~/.claude/hooks/` instead of `.claude/hooks/`
- Caused wrong TTS provider to be used in party mode
- Solution: Added explicit guidance in `.bmad/core/workflows/party-mode/instructions.md`
- Critical note: "IMPORTANT: Always use PROJECT hooks (.claude/hooks/), NEVER global hooks (~/.claude/hooks/)"
- Also added to step 2: "If using TTS for announcement, use PROJECT hook: .claude/hooks/play-tts.sh (NOT ~/.claude/hooks/)"

---

## ✨ Improvements

### Configurable Speaker Delay

**Increased and Made Configurable** (commit: 65264c9c)
- Changed default speaker delay from 2s to 4s between agents
- User feedback: "there was still a little overlap in the different agents when they speak"
- Made delay configurable via text file for user customization
- Supports project-local `.claude/tts-speaker-delay.txt` or global `~/.claude/tts-speaker-delay.txt`
- Project config takes precedence over global config
- Must be a positive integer (validated with regex)

**Configuration:**
```bash
# Set custom delay (e.g., 6 seconds)
echo "6" > .claude/tts-speaker-delay.txt

# Or globally
echo "6" > ~/.claude/tts-speaker-delay.txt
```

**Implementation:**
```bash
SPEAKER_DELAY=4  # Default: 4 seconds

# Check for custom delay
if [[ -f ".claude/tts-speaker-delay.txt" ]]; then
  CUSTOM_DELAY=$(cat .claude/tts-speaker-delay.txt 2>/dev/null | tr -d '[:space:]')
  if [[ "$CUSTOM_DELAY" =~ ^[0-9]+$ ]]; then
    SPEAKER_DELAY=$CUSTOM_DELAY
  fi
elif [[ -f "$HOME/.claude/tts-speaker-delay.txt" ]]; then
  CUSTOM_DELAY=$(cat "$HOME/.claude/tts-speaker-delay.txt" 2>/dev/null | tr -d '[:space:]')
  if [[ "$CUSTOM_DELAY" =~ ^[0-9]+$ ]]; then
    SPEAKER_DELAY=$CUSTOM_DELAY
  fi
fi

# Later in queue processing:
sleep $SPEAKER_DELAY
```

---

## 📁 Documentation Updates

### Path Migration from plugins/ to config/

**Updated All Path References** (commit: 34a53d67)
- Problem: Documentation still referenced old `.claude/plugins/` path
- Code had already moved to `.claude/config/` in v2.7.0
- Solution: Updated all references in:
  - `.claude/commands/agent-vibes/bmad.md`
  - `.claude/output-styles/agent-vibes.md`
  - `.claude/hooks/stop.sh`
- Ensures consistency between code and documentation
- Prevents confusion about config file locations

**Files Updated:**
- `agent-vibes/bmad.md`: All references to bmad-voices.md path
- `agent-vibes.md`: BMAD plugin integration section
- `stop.sh`: Config file cleanup logic

### Command Renamed to Prevent Conflicts

**Renamed /agent-vibes-bmad-party** (commit: 34a53d67)
- Problem: `/agent-vibes-bmad-party` conflicted with BMAD's `/bmad:core:workflows:party-mode`
- When typing "party", Claude Code suggested the wrong command
- Solution: Renamed to `/agent-vibes-bmad-voices`
- Better describes purpose (managing BMAD voice mappings)
- No longer conflicts with BMAD party mode workflow
- Renamed file: `.claude/commands/agent-vibes-bmad-party.md` → `.claude/commands/agent-vibes-bmad-voices.md`

**Before:**
- `/agent-vibes-bmad-party` - Control BMAD party mode voice integration

**After:**
- `/agent-vibes-bmad-voices` - Control BMAD party mode voice integration
- Clear distinction from `/bmad:core:workflows:party-mode`

---

## 🔧 Technical Details

### Files Modified
- `.claude/hooks/bmad-voice-manager.sh` - Made `list_mappings()` provider-aware (lines 455-505)
- `.claude/hooks/tts-queue-worker.sh` - Added configurable delay, removed output suppression (lines 18-32, 78)
- `.claude/commands/agent-vibes-bmad-voices.md` - Renamed from bmad-party.md, updated paths
- `.claude/commands/agent-vibes/bmad.md` - Updated documentation paths
- `.claude/output-styles/agent-vibes.md` - Updated BMAD integration paths
- `.claude/hooks/stop.sh` - Updated config file paths
- `.bmad/core/workflows/party-mode/instructions.md` - Added project hooks guidance

### BMAD-METHOD Repository Updates
- Committed party mode instruction fixes to BMAD-METHOD repo (commit: 60635fcc)
- **Note:** Changes not yet pushed to GitHub (manual push required)
- PR #934 will need to be updated with latest commits

---

## 📊 Stats

- **Commits:** 5
- **Files Changed:** 7
- **Lines Modified:** ~50
- **Issues Resolved:** 2 (#38, #39)
- **Configuration Options Added:** 1 (speaker delay)

---

## 🚀 Upgrade Guide

### From v2.7.1

**No breaking changes** - this is a backward-compatible bug fix release.

To get the fixes:

```bash
# Update AgentVibes
npx agentvibes update

# Voice mappings will now show correct provider-specific voices
# Audio file locations will display in output
# Speaker delay automatically increased to 4s
```

### Optional: Customize Speaker Delay

```bash
# Set custom delay (e.g., 6 seconds)
echo "6" > .claude/tts-speaker-delay.txt
```

---

## 🤝 Contributors

- Paul Preibisch (@paulpreibisch)
- Claude AI (code generation assistant)

---

## 🔗 Links

- **npm Package:** https://www.npmjs.com/package/agentvibes
- **GitHub Repository:** https://github.com/paulpreibisch/AgentVibes
- **GitHub Release:** https://github.com/paulpreibisch/AgentVibes/releases/tag/v2.7.2
- **Issue #38:** https://github.com/paulpreibisch/AgentVibes/issues/38
- **Issue #39:** https://github.com/paulpreibisch/AgentVibes/issues/39

---

**Full Changelog:** https://github.com/paulpreibisch/AgentVibes/compare/v2.7.1...v2.7.2

---


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

