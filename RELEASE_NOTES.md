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
