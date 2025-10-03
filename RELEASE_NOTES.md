# Release v1.0.13

## 🤖 AI Summary

This release fixes critical bugs in the update command and personality system, adds comprehensive testing for voice mappings, and introduces a new dry humor personality. The update command was copying outdated files, causing users to miss the latest project-local isolation features. New tests prevent future voice mapping regressions, and the personality system has been refactored for better maintainability.

## 🐛 Critical Bug Fixes

### Update Command Fixed
- **Fixed**: Update command was copying outdated output style files from `templates/` instead of `.claude/`
- **Impact**: Users running `npx agentvibes update` were getting October 2nd version instead of current files
- **Resolution**: Now correctly copies from `.claude/output-styles/` with latest project-local support
- **Files affected**: `src/installer.js` line 381

### Voice Mapping Corrections
- **Fixed**: Crass personality incorrectly using Northern Terry voice
- **Restored**: Proper Ralf Eisend voice for crass personality
- **Prevention**: Added comprehensive test suite to lock in personality-voice mappings
- **Root cause**: Accidental change during troubleshooting

## ✨ New Features

### Dry Humor Personality
- Added British dry wit personality with deadpan delivery
- Uses understated humor and quintessentially British reserve
- Powered by Aria voice
- Example acknowledgments:
  - "Rather less than ideal, this error"
  - "I'll attempt to salvage this disaster. Low expectations, naturally"
  - "Right. I suppose someone ought to address this shambles"

### Enhanced Update Command
- Now displays current AgentVibes version from package.json
- Shows recent changes via git commit log (last 5 commits)
- Better visibility into what's being updated
- Example output:
  ```
  🔄 AgentVibes Update
     Version: 1.0.13

  📝 Recent Changes:
     8005930 fix: Update command copies outdated output style
     fc55226 feat: Add dry-humor personality with British wit
     702cfb3 feat: Show version and changelog in update command
  ```

### Project-Local Isolation
- Personality, sentiment, and voice settings now check project-local `.claude/` first
- Falls back to global `~/.claude/` if not found
- Enables different personalities per project
- Applies to `tts-personality.txt`, `tts-sentiment.txt`, and `tts-voice.txt`
- Output style updated to support: `.claude/tts-sentiment.txt` → `~/.claude/tts-sentiment.txt`

### Voice Information Display
- TTS output now shows voice name and ID used
- Example: `🎤 Voice used: Aria (TC0Zp7WVFzhA8zpTlRqV)`
- Fixed locale warnings in play-tts.sh
- Helps debug which voice is actually being used

## 🧪 Testing Improvements

### Personality-Voice Mapping Tests
- Added `test/unit/personality-voice-mapping.bats` with 4 comprehensive tests
- Validates all personality files have correct voice assignments
- Ensures voice IDs remain stable across releases
- Catches missing voice fields (discovered and fixed normal.md)
- Total test count: **35** (up from 27)

### Test Coverage
- ✅ Correct voice assignments for all 18 personalities
- ✅ Stable voice IDs in voices-config.sh
- ✅ All personality files have voice field
- ✅ Assigned voices exist in configuration

**Expected Mappings Validated:**
```bash
crass → Ralf Eisend
sarcastic → Jessica Anne Bogart
flirty → Jessica Anne Bogart
annoying → Lutz Laugh
angry → Demon Monster
pirate → Pirate Marshal
robot → Dr. Von Fusion
zen → Aria
dramatic → Northern Terry
millennial → Amy
surfer-dude → Cowboy Bob
sassy → Ms. Walker
normal → Aria
professional → Matthew Schmitz
moody → Michael
funny → Lutz Laugh
poetic → Aria
grandpa → Grandpa Spuds Oxley
dry-humor → Aria
```

## 🔧 Technical Improvements

### Refactored Personality System
- Made personality and sentiment acknowledgments data-driven
- Removed hardcoded responses in favor of flexible generation
- Simplified personality-manager.sh (141 lines removed, cleaner logic)
- Enhanced sentiment-manager.sh for better fallback handling
- Each personality response is now AI-generated fresh each time

### Configuration Management
- Added `.gitignore` entries for personal TTS settings
- Prevents `.claude/tts-voice.txt`, `.claude/tts-personality.txt`, `.claude/tts-sentiment.txt` from being committed
- Keeps user preferences local
- Synced `templates/output-styles/agent-vibes.md` with latest version

## 📊 Changes Summary

- **12 files changed**: 306 insertions(+), 161 deletions(-)
- **New personality**: dry-humor
- **Bug fixes**: 2 critical issues resolved
- **Test coverage**: +8 tests (27 → 35)
- **Code quality**: Simplified personality management

## 🚀 Upgrade Instructions

```bash
npx agentvibes update
```

The update command will now show you exactly what version you're getting and what's changed!

## 💡 What This Fixes For Users

**Before (Broken):**
- Update command copied old files without project-local support
- Projects couldn't have different personalities
- Crass personality used wrong voice
- No tests to prevent voice mapping regressions

**After (Fixed):**
- Update command copies latest files with all features
- Each project can have its own personality/sentiment/voice settings
- Crass personality uses correct Ralf Eisend voice
- Comprehensive tests ensure voices stay correct

## 🔗 Links

- [View this release on GitHub](https://github.com/paulpreibisch/AgentVibes/releases/tag/v1.0.13)
- [npm package](https://www.npmjs.com/package/agentvibes/v/1.0.13)
- [Full Documentation](https://github.com/paulpreibisch/AgentVibes#readme)

---

**Built with ❤️ by Paul Preibisch | Powered by ElevenLabs AI & Claude AI**
