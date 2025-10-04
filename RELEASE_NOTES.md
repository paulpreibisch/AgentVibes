# Release v1.0.15

## 🤖 AI Summary

This release significantly expands the AgentVibes voice library and refines BMAD agent voice assignments based on user feedback. Five new professional voices have been added, bringing the total from 17 to 22 unique ElevenLabs voices. The BMAD plugin mappings have been optimized with more fitting voice personalities for each agent role, particularly adding commanding voices for leadership roles and smooth, confident voices for quality assurance.

## ✨ New Features

### Voice Library Expansion
Added **5 new professional ElevenLabs voices**:

- **Burt Reynolds** (`4YYIPFl9wE5c4L2eu2Gb`)
  - Character: Smooth baritone, confident and charismatic
  - Best for: Quality assurance, confident communication
  - Assigned to: QA Engineer role

- **Juniper** (`aMSt68OGf4xUZAnLpTU8`)
  - Character: Warm and friendly
  - Best for: Stakeholder relations
  - Available for custom assignments

- **Tiffany** (`6aDn1KB0hjpdcocrUkmq`)
  - Character: Professional and clear
  - Best for: Product ownership, leadership
  - Assigned to: Product Owner role

- **Archer** (`L0Dsvb3SLTyegXwtm47J`)
  - Character: Authoritative and commanding
  - Best for: Leadership, orchestration
  - Assigned to: BMAD Master role

- **Tom** (`DYkrAHD8iwork3YSUBbs`)
  - Character: Professional and organized
  - Best for: Orchestration, coordination
  - Assigned to: Orchestrator role

### BMAD Plugin Voice Optimizations

**Updated voice assignments for better role fit:**

| Role | Previous Voice | New Voice | Reason |
|------|---------------|-----------|--------|
| **QA Engineer** | Ralf Eisend | Burt Reynolds | Smooth, confident tone better suits quality advocacy |
| **Product Owner** | Amy | Tiffany | Professional clarity for stakeholder communication |
| **Business Analyst** | Lutz Laugh | Ralf Eisend | International perspective for analysis work |
| **BMAD Master** | Aria | Archer | Authoritative voice for methodology leadership |
| **Orchestrator** | Ms. Walker | Tom | Organized coordination voice for workflow management |

**Unchanged (optimal assignments):**
- PM: Jessica Anne Bogart (professional)
- Developer: Matthew Schmitz (normal)
- Architect: Michael (normal)
- Scrum Master: Ms. Walker (professional)
- UX Expert: Aria (normal)

## 📝 Technical Changes

### Files Modified
- `.claude/hooks/voices-config.sh` - Added 5 new voice configurations
- `.claude/plugins/bmad-voices.md` - Updated 5 agent voice mappings
- `README.md` - Updated voice library (17→22) and BMAD plugin documentation

### Voice Library Growth
- **Previous**: 17 unique voices
- **Current**: 22 unique voices
- **Growth**: +29% expansion

## 🔄 Migration Notes

### For Existing Users
- Voice library automatically includes new voices
- BMAD plugin mappings update automatically if using default configuration
- No action required - changes are seamless

### For BMAD Users
- New agent voices take effect immediately on next activation
- Previous voice/personality settings remain preserved
- Use `/agent-vibes-bmad status` to see updated mappings
- Customize with `/agent-vibes-bmad set <agent-id> <voice>`

## 📊 Release Stats

- **3 commits** since v1.0.14
- **3 files changed**: 21 insertions, 11 deletions
- **5 new voices added** to library
- **5 BMAD roles reassigned** with optimized voices
- **0 breaking changes**

## 🎯 User Experience Improvements

1. **Better Role Alignment**: Voices now better match the personality and responsibility of each BMAD agent
2. **Professional Quality**: All new voices selected for clarity and professional tone
3. **Expanded Choice**: 22 voices provide more options for custom configurations
4. **Smoother QA**: Burt Reynolds' confident tone enhances quality advocacy communication
5. **Leadership Presence**: Archer's authoritative voice strengthens BMAD Master and orchestration roles

## 💡 Usage Examples

**Activate agents with new voices:**
```bash
/BMad:agents:qa        # Now uses Burt Reynolds
/BMad:agents:analyst   # Now uses Ralf Eisend
/BMad:agents:bmad-master  # Now uses Archer
```

**Try new voices directly:**
```bash
/agent-vibes:switch "Burt Reynolds"
/agent-vibes:switch "Archer"
/agent-vibes:switch "Tiffany"
```

## 🙏 Credits

Special thanks to users who provided feedback on voice assignments, helping us optimize the BMAD agent experience!

---

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
