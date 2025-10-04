# Release v1.0.14

## 🤖 AI Summary

This release introduces the BMAD Plugin - a powerful integration that automatically switches AgentVibes voices based on which BMAD agent is active. When you activate a BMAD agent (like `/BMad:agents:pm`), AgentVibes now intelligently uses that agent's assigned voice for all TTS acknowledgments and completions. The plugin includes auto-detection of BMAD installations, preserves your previous voice settings when toggling the plugin, and provides comprehensive management commands. Additionally, this release adds a nostalgic "grandpa" personality and includes a major README restructure with improved navigation.

## ✨ New Features

### BMAD Plugin Integration
- **Automatic voice switching** for BMAD agents based on their role
- **Auto-detection**: Plugin automatically enables when BMAD installation is detected (`.bmad-core/install-manifest.yaml`)
- **Settings preservation**: Backs up and restores your previous voice/personality/sentiment settings when enabling/disabling plugin
- **10 agent voice mappings** included by default:
  - PM (Product Manager): Jessica Anne Bogart with professional personality
  - Developer: Matthew Schmitz with normal personality
  - QA Engineer: Ralf Eisend with professional personality
  - Architect: Michael with normal personality
  - Product Owner: Amy with professional personality
  - Analyst: Lutz Laugh with normal personality
  - Scrum Master: Ms. Walker with professional personality
  - UX Expert: Aria with normal personality
  - BMAD Master: Aria with zen personality
  - Orchestrator: Ms. Walker with professional personality

### Plugin Management Commands
- `/agent-vibes-bmad enable` - Enable BMAD voice plugin
- `/agent-vibes-bmad disable` - Disable and restore previous settings
- `/agent-vibes-bmad status` - Show plugin status and agent mappings
- `/agent-vibes-bmad list` - List all agent voice assignments
- `/agent-vibes-bmad set <agent-id> <voice> [personality]` - Customize agent voices
- `/agent-vibes-bmad edit` - Open configuration for manual editing

### Grandpa Personality
- Added nostalgic rambling storyteller personality
- Uses Grandpa Spuds Oxley voice
- Perfect for agents that need a folksy, nostalgic communication style
- Example acknowledgments:
  - "Well now, let me tell you about fixing bugs back in my day..."
  - "Reminds me of the time I debugged a system with punch cards..."

### README Improvements
- Complete restructure with comprehensive table of contents
- Organized into logical categories: Getting Started, Core Features, Advanced Topics
- Added "Back to top" navigation links throughout
- New dedicated BMAD Plugin section with usage examples
- Improved discoverability and user experience

## 🔧 Technical Implementation

### Plugin Architecture
- Voice mappings stored in `.claude/plugins/bmad-voices.md` (markdown table format)
- Management script at `.claude/hooks/bmad-voice-manager.sh`
- Enable/disable flag at `.claude/plugins/bmad-voices-enabled.flag`
- Auto-detection function checks for BMAD on every voice lookup
- Settings backup stored in `.claude/plugins/.bmad-previous-settings` (gitignored)

### Voice Priority System
The plugin follows this priority order:
1. BMAD plugin voice (if agent active and plugin enabled)
2. Sentiment mode (if set)
3. Personality mode (if set)
4. Default voice

### Output Style Integration
- Added BMAD plugin detection to Agent Vibes output style
- Automatic agent context tracking
- Seamless integration with existing personality/sentiment system
- Template files updated for new installations

## 📝 Changed Files

- `.claude/commands/agent-vibes-bmad.md` - New command documentation (132 lines)
- `.claude/hooks/bmad-voice-manager.sh` - New management script (278 lines)
- `.claude/output-styles/agent-vibes.md` - Added BMAD integration section (58 new lines)
- `.claude/personalities/grandpa.md` - Fixed voice name (Grandpa Spuds Oxley)
- `.claude/plugins/bmad-voices.md` - New plugin configuration (42 lines)
- `.claude/plugins/bmad-voices-enabled.flag` - Plugin enable flag (empty file)
- `.gitignore` - Added plugin backup file exclusion
- `README.md` - Complete restructure (418 lines changed)
- `templates/output-styles/agent-vibes.md` - Updated template (58 new lines)

**Total changes**: 791 insertions(+), 199 deletions(-)

## 🐛 Bug Fixes

### Grandpa Personality Voice
- **Fixed**: Grandpa personality was using non-existent "Grandpa Werthers" voice
- **Corrected**: Now uses proper "Grandpa Spuds Oxley" voice
- **Impact**: Grandpa personality now works correctly

## 🔄 Migration Notes

### For Existing Users
- BMAD plugin will **auto-enable** if BMAD is detected in your project
- Your existing voice/personality settings are **automatically backed up** when plugin enables
- Disable plugin with `/agent-vibes-bmad disable` to restore previous settings
- Plugin is **completely optional** - AgentVibes works exactly as before if BMAD isn't installed

### For BMAD Users
- Plugin activates automatically when BMAD installation is detected
- Each BMAD agent has a pre-assigned voice (see table above)
- Customize voice mappings with `/agent-vibes-bmad set <agent-id> <voice>`
- Edit `.claude/plugins/bmad-voices.md` directly for bulk changes

## 📊 Stats

- **5 commits** since v1.0.13
- **9 files changed**
- **2 new features**: BMAD Plugin, Grandpa Personality
- **6 new commands**: BMAD plugin management suite
- **10 agent voice mappings**: Pre-configured professional voice assignments
- **1 major documentation update**: README restructure with TOC

## 🙏 Credits

Special thanks to the BMAD project for the inspiration and to all users who requested better agent voice customization!

---

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
