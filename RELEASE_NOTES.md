# 🎤 AgentVibes Release Notes

## 📦 v1.1.1 - Enhanced Update Display (2025-01-04)

### 🤖 AI Summary

This patch release improves the update experience by displaying both the AI-generated release summary AND the 5 latest commit messages. Users now see the high-level "what changed" from release notes plus the detailed commit history with hashes and titles. This provides better transparency during updates and helps users understand exactly what's being installed.

### ✨ Improvements

**Dual Information Display:**
- **📰 Latest Release** - Shows AI summary from RELEASE_NOTES.md with version
- **📝 Latest Commit Messages** - Shows 5 most recent commits with hashes and titles
- Applies to both pre-update confirmation screen and post-update summary
- Text wrapping at 80 characters for better readability

**What You See Now:**
```
📰 Latest Release (v1.1.0):

   This minor release introduces self-update capabilities to AgentVibes!
   Users can now update directly from Claude Code with...

📝 Latest Commit Messages:

   047accd docs: Update version to v1.1.0 [skip ci]
   f972e54 docs: Update version to v1.1.0 [skip ci]
   fa6dcf6 chore: Bump version to 1.1.0
   4a83777 feat: Add self-update system with commands
   75b1cf8 docs: Update version to v1.0.23 [skip ci]
```

### 🔧 Technical Changes

**Modified Files:**
- `src/installer.js` - Enhanced both pre-update and post-update display sections

**Implementation:**
- Extracts AI summary from RELEASE_NOTES.md first (priority)
- Falls back to git log for commit messages
- If git unavailable, reads commits from RELEASE_NOTES.md
- Word-wraps long summaries for terminal display

### 💡 Benefits

1. **Context**: See the big picture (release summary) AND the details (commits)
2. **Transparency**: Know exactly what commits you're getting
3. **Traceability**: Commit hashes let you review changes on GitHub
4. **Better UX**: No more choosing between commits OR summary - get both!

---

## 📝 Recent Commits

```
c07d3fe feat: Enhance update display with both release notes and commit messages
047accd docs: Update version to v1.1.0 [skip ci]
f972e54 docs: Update version to v1.1.0 [skip ci]
fa6dcf6 chore: Bump version to 1.1.0
4a83777 feat: Add self-update system with commands
```

---

## 📦 v1.1.0 - Self-Update & Version Management (2025-01-04)

### 🤖 AI Summary

This minor release introduces self-update capabilities to AgentVibes! Users can now update directly from Claude Code with `/agent-vibes:update` and check their version with `/agent-vibes:version`. The update process includes a beautiful confirmation screen with ASCII art, shows recent changes and release notes, and preserves all custom settings. This eliminates the need for manual npm/git commands and provides full transparency into what's changing during updates.

### ✨ New Features

#### Self-Update System
- **`/agent-vibes:version`** - Check installed version instantly
- **`/agent-vibes:update`** - Update to latest version with one command
  - Beautiful confirmation screen with two-tone ASCII art
  - Shows recent changes and release notes (from git or RELEASE_NOTES.md)
  - Preserves all custom settings, voices, and configurations
  - Works from npx, npm global, or source installations
  - Optional `--yes` flag for non-interactive updates

#### Quick Update Workflow
```bash
/agent-vibes:version           # Check current version
/agent-vibes:update            # Update with confirmation
/agent-vibes:update --yes      # Update without prompts
```

### 📚 Documentation Improvements

- **Enhanced README**: Added "System Commands" section with version and update commands
- **Better Update Instructions**: Reorganized update section with clearer methods
- **Version Checking Guide**: Documented how to check and verify versions
- **Release Notes Display**: Updates now show what's changed in the latest version
- **Quick Update Section**: Highlighted fastest update method at top of section

### 🔧 Technical Changes

**New Command Files:**
- `.claude/commands/agent-vibes/update.md` - Update command definition with examples
- `.claude/commands/agent-vibes/version.md` - Version command definition

**Documentation Updates:**
- Updated README.md with system commands table
- Improved update documentation flow
- Added "Quick Update (From Claude Code)" section
- Enhanced "What Gets Updated" list with release notes item

**Implementation Details:**
- Update command wraps existing `npx agentvibes update` installer function
- Version command wraps `npx agentvibes --version` for consistent output
- Both commands work seamlessly from within Claude Code sessions

### 🎯 Why This Matters

**Before v1.1.0:**
Users had to exit Claude Code and manually run:
```bash
npm update -g agentvibes
# or
cd ~/AgentVibes && git pull && npm install
```

**After v1.1.0:**
Users can update directly from Claude Code:
```bash
/agent-vibes:update
```

The update process now includes:
- ✅ Visual confirmation with package version
- ✅ Recent changes from git log or RELEASE_NOTES.md
- ✅ File-by-file update progress with counts
- ✅ Summary of what was updated
- ✅ Preservation of all custom configurations

### 📝 What Gets Updated

When you run `/agent-vibes:update`, these components are refreshed:
- ✅ All slash commands (11+ commands)
- ✅ TTS scripts and hooks (6+ scripts)
- ✅ Personality templates (new ones added, existing updated)
- ✅ Output styles (agent-vibes.md)
- ✅ BMAD plugin configurations
- ✅ Voice configuration mappings

**Safe Updates**: Your voice settings, custom personalities, sentiment preferences, language settings, and all user configurations are always preserved!

### 📊 Release Stats

- **3 files changed**: 2 new command files, 1 README update
- **2 new commands**: `/agent-vibes:version`, `/agent-vibes:update`
- **1 documentation section** enhanced: "🔄 Updating"
- **0 breaking changes**

### 💡 User Experience Improvements

1. **Convenience**: Update without leaving Claude Code
2. **Transparency**: See what's changing before confirming
3. **Safety**: Settings and customizations always preserved
4. **Visibility**: Version command helps troubleshooting
5. **Consistency**: Same update experience across all install methods

---

## 📝 Recent Commits

```
75b1cf8 docs: Update version to v1.0.23 [skip ci]
```

---

# Release v1.0.20

## 🤖 AI Summary

This patch release improves the user experience when installing or updating via npx by adding a fallback to display release notes from RELEASE_NOTES.md when git is unavailable. Users running `npx agentvibes update` will now see the latest release summary instead of git errors, making it clear what's new in each version.

## 🐛 Bug Fixes

### Installer Release Notes Fallback
- **Fixed**: Update/install commands showing "fatal: not a git repository" error
- **Root Cause**: npx cache doesn't include .git directory
- **Impact**: Users now see release notes even when git is unavailable
- **Solution**: Added fallback to read RELEASE_NOTES.md and extract latest release summary
- **Benefit**: Better transparency about what's being installed/updated

## 📝 Technical Changes

### Modified Files

**src/installer.js** (+56 lines)
- Added RELEASE_NOTES.md fallback for both install and update commands
- Extracts latest release header and AI summary
- Displays formatted release notes when git log fails
- Graceful degradation when neither git nor release notes available

### Key Implementation Details

**Release Notes Fallback:**
```javascript
try {
  // Try git log first
  const gitLog = execSync('git log --oneline --no-decorate -5', {...});
  // ... show git commits
} catch (error) {
  // Fallback to RELEASE_NOTES.md
  const releaseNotes = await fs.readFile('RELEASE_NOTES.md', 'utf8');
  // Extract and display latest release summary
  console.log(chalk.cyan(`📰 ${releaseHeader}`));
  console.log(chalk.white(`   ${summaryText}`));
}
```

## 🔄 Migration Notes

### For Users

**No action required** - This is an installer improvement:
- Next time you run `npx agentvibes update` you'll see release notes
- Works even when installing from npm cache without git
- Shows latest release summary automatically

### For Package Maintainers

**Benefits:**
- Users always see what's new, even via npx
- RELEASE_NOTES.md now serves as fallback documentation
- Better user experience for npm package installations

## 📝 Recent Commits

```
456abb0 docs: Update version to v1.0.21 [skip ci]
3dfdcb5 fix: Include RELEASE_NOTES.md in npm package for installer fallback
96f8a9b docs: Update README and RELEASE_NOTES to v1.0.20 [skip ci]
5e2e3cc chore: Bump version to 1.0.20 for npm publish
1636b14 feat: Show release notes from RELEASE_NOTES.md when git is unavailable
```

## 📊 Release Stats

- **5 commits** since v1.0.19
- **3 files changed**: .npmignore, README.md, RELEASE_NOTES.md
- **10 insertions**, **4 deletions**
- **1 bug fix**: RELEASE_NOTES.md now included in npm package
- **0 breaking changes**

## 🎯 User Experience Improvements

1. **Transparency**: See what's new even when installing via npx
2. **No Errors**: Graceful fallback instead of git errors
3. **Consistent**: Same release info whether from git or npm
4. **Informative**: Latest release summary shown in all scenarios

## 💡 Example Output

When running `npx agentvibes update`:

**Before (v1.0.19):**
```
✨ Update complete!
fatal: not a git repository (or any of the parent directories): .git
💡 Changes will take effect immediately!
```

**After (v1.0.20):**
```
✨ Update complete!

📰 Release v1.0.19

   This release brings powerful multilingual support to AgentVibes! Users can now make Claude speak in 30+ languages including Spanish, French, German, Italian, Portuguese, Chinese, Japanese, and many more...

💡 Changes will take effect immediately!
```

## 🙏 Credits

Thanks to users who reported the confusing git error messages when updating via npx!

---

# Release v1.0.19

## 🤖 AI Summary

This release brings powerful multilingual support to AgentVibes! Users can now make Claude speak in 30+ languages including Spanish, French, German, Italian, Portuguese, Chinese, Japanese, and many more. The system automatically selects optimal multilingual voices and seamlessly integrates with existing personalities and the BMAD plugin. Additionally, this release includes critical bug fixes for slash command discovery and comprehensive documentation updates.

## ✨ New Features

### 🌍 Multilingual Language Support

**Speak in 30+ Languages**
- Added `/agent-vibes:set-language <language>` command
- Support for Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, and 20+ more languages
- Automatic multilingual voice selection based on language
- Works seamlessly with personalities and BMAD plugin
- Language settings persist across sessions

**Language Manager System**
- New `language-manager.sh` script handles language switching
- Intelligent voice recommendations per language:
  - Spanish → Antoni/Matilda
  - French → Rachel/Charlotte
  - German → Domi/Charlotte
  - Italian → Bella
  - Portuguese → Matilda
- Stores language preference in `.claude/tts-language.txt`

**New Multilingual Voices Added**
- **Antoni** - Optimized for Spanish, general multilingual (30+ languages)
- **Rachel** - Optimized for French, professional multilingual
- **Domi** - Optimized for German, strong confident voice
- **Bella** - Optimized for Italian, soft engaging voice
- **Charlotte** - European languages specialist
- **Matilda** - Latin languages specialist

### 📚 Documentation Enhancements

**Updated README**
- Added comprehensive "Change Language" section with examples
- New "Language Commands" table in Commands Reference
- Added "🌍 Multilingual Support" to Table of Contents
- Documented all 30+ supported languages
- Included multilingual voice recommendations and usage tips

**New Language Command Documentation**
- Created `.claude/commands/agent-vibes/set-language.md`
- Detailed usage examples and language list
- Explains how language system works
- Voice recommendations per language

## 🐛 Bug Fixes

### Slash Command Discovery Fix
- **Fixed**: Commands in `.claude/commands/agent-vibes/` were not appearing in autocomplete
- **Root Cause**: Missing `commands.json` registration file
- **Impact**: All `/agent-vibes:*` subcommands are now discoverable
- **Added**: Proper `commands.json` with all 13 subcommands registered:
  - list, preview, switch, whoami, sample, replay
  - personality, sentiment, set-pretext, set-language
  - add, get

### Installer File Filtering
- **Fixed**: Project-specific files being included in installer
- **Impact**: Cleaner installations without unnecessary local files
- **Changed**: Added filters to exclude `.claude/tts-*.txt` and other session files

## 📝 Technical Changes

### New Files Added

**Language Management System**
- `.claude/commands/agent-vibes/set-language.md` - Command documentation
- `.claude/hooks/language-manager.sh` - Language switching logic
- `.claude/commands/agent-vibes/commands.json` - Command registration

**Voice Configuration**
- Added 6 multilingual voices to `voices-config.sh`:
  - Antoni (ErXwobaYiN019PkySvjV)
  - Rachel (21m00Tcm4TlvDq8ikWAM)
  - Domi (AZnzlk1XvdvUeBnXmlld)
  - Bella (EXAVITQu4vr4xnSDxMaL)
  - Charlotte (XB0fDUnXU5powFXDhCwa)
  - Matilda (XrExE9yKIg1WjnnlVkGX)

### Modified Files

**Output Style Updates** (`agent-vibes.md`)
- Enhanced language detection logic
- Added multilingual voice fallback system
- Priority order: Language → Sentiment → Personality → Default
- Improved BMAD integration with language support

**Installer Improvements** (`src/installer.js`)
- Enhanced file filtering to exclude session-specific files
- Better validation of ElevenLabs voice IDs
- Improved installation messaging

### Key Implementation Details

**Language Priority System:**
```bash
# Check order:
1. Language setting (.claude/tts-language.txt)
2. Sentiment setting (.claude/tts-sentiment.txt)
3. Personality setting (.claude/tts-personality.txt)
4. Default voice
```

**Multilingual Voice Mapping:**
```bash
declare -A LANGUAGE_VOICES=(
    ["spanish"]="Antoni"
    ["french"]="Rachel"
    ["german"]="Domi"
    ["italian"]="Bella"
    # ... 20+ more languages
)
```

**BMAD + Language Integration:**
- When BMAD agent is active AND language is set:
  - Tries agent's assigned voice first
  - Falls back to multilingual voice if agent's voice doesn't support language
  - Maintains agent's personality style in chosen language

## 🔄 Migration Notes

### For Users

**To Start Using Multilingual Features:**
```bash
# Set your preferred language
/agent-vibes:set-language spanish

# Claude will now speak in Spanish!
# To go back to English:
/agent-vibes:set-language english
```

**Recommended Voices for Languages:**
- Use `/agent-vibes:set-language list` to see all supported languages
- System auto-selects best voice for your language
- Can manually switch voices with `/agent-vibes:switch <voice>`

### For Existing AgentVibes Users

**No Breaking Changes:**
- Existing voice/personality settings preserved
- Language defaults to English
- All previous commands work exactly the same
- New language feature is opt-in

## 📊 Release Stats

- **7 commits** since v1.0.18
- **8 files changed**:
  - 3 new files (set-language.md, language-manager.sh, commands.json)
  - 5 modified files (README.md, agent-vibes.md, voices-config.sh, installer.js)
- **467 insertions**, **45 deletions**
- **2 major features**: Multilingual support, Command registration fix
- **2 bug fixes**: Slash commands, Installer filtering
- **0 breaking changes**

## 🎯 User Experience Improvements

1. **Global Language Support**: Speak with Claude in your native language
2. **Automatic Voice Selection**: System picks best multilingual voice
3. **Seamless Integration**: Works with all existing features
4. **Better Discovery**: All commands now show in autocomplete
5. **Comprehensive Docs**: Complete guide to using languages

## 💡 Usage Examples

### Basic Language Switching
```bash
# Switch to Spanish
/agent-vibes:set-language spanish

# Claude responds in Spanish
"¡Voy a hacer esa tarea para ti!"

# Switch back to English
/agent-vibes:set-language english
```

### Language + Personality
```bash
# Set language to French
/agent-vibes:set-language french

# Use pirate personality
/agent-vibes:personality pirate

# Get French pirate responses!
"Arr, je vais conquérir ce code pour toi, moussaillon!"
```

### Language + BMAD
```bash
# Set language to German
/agent-vibes:set-language german

# Activate BMAD PM agent
/BMad:agents:pm

# PM speaks in German with professional voice
"Ich werde diese Anforderungen für Sie analysieren"
```

## 🌍 Supported Languages

**Complete List (30+ languages):**
Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Polish, Dutch, Turkish, Russian, Arabic, Hindi, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Ukrainian, Greek, Bulgarian, Croatian, Slovak, and more!

## 🙏 Credits

Special thanks to the ElevenLabs team for their amazing multilingual voice technology! The new Multilingual v2 model makes it possible to provide natural-sounding TTS in 30+ languages.

---

# Release v1.0.18

[Previous release notes preserved below...]
