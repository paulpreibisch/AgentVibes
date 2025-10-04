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

## 🤖 AI Summary

This release focuses entirely on improving the installer experience with better visual design, accurate information display, and enhanced transparency. The installer now shows the correct package version dynamically, displays recent changes before installation, uses a beautiful two-tone ASCII title, and clarifies that installation is project-local (not global). Users will have much better visibility into what they're installing and where it's going.

## ✨ New Features

### Enhanced Installer Display

**Dynamic Version Reading**
- Installer now reads version from `package.json` instead of hardcoded `1.0.0`
- Always displays current package version accurately
- No more manual version updates needed in installer

**Latest Release Notes Section**
- Added "📰 Latest Release Notes" section showing last 5 commits
- Displays before installation prompt for transparency
- Users can see what's new before deciding to install
- Includes commit hashes and messages

**Visual Enhancements**
- Two-tone ASCII title: "Agent" (cyan) + "Vibes" (magenta)
- Added blank line above title for better spacing
- GitHub repo link now displayed in welcome box
- More polished, professional appearance

### Installation Accuracy Improvements

**Current Directory Installation**
- Changed default from home directory to current working directory
- Installer now shows "Current directory" and "Install location" separately
- Confirmation prompt displays actual install path
- Clarified as "project-local" installation

**Updated Voice Library Information**
- Voice count updated from "15+" to "22 unique ElevenLabs voices"
- Accurate reflection of current voice library
- Displayed in both pre-install info and post-install summary

## 🐛 Bug Fixes

### Installer Location Fix
- **Fixed**: Installer defaulting to home directory instead of current directory
- **Impact**: Users now install in their project folder as expected
- **Changed**: `process.env.HOME` → `process.cwd()` for default directory
- **Benefit**: No more confusion about install location

### Version Display Fix
- **Fixed**: Hardcoded version 1.0.0 in installer
- **Impact**: Users see actual current version
- **Changed**: Now reads dynamically from package.json
- **Benefit**: Accurate version info for every release

### Voice Count Fix
- **Fixed**: Outdated "15+ voices" reference
- **Impact**: Users see correct voice library size (22 voices)
- **Changed**: Updated in both install command and update command
- **Benefit**: Accurate feature information

## 📝 Technical Changes

### Files Modified

**src/installer.js** (+86 lines, -21 lines)
- Dynamic version reading from package.json
- Two-tone ASCII art generation (Agent + Vibes)
- Latest release notes display section
- GitHub repo link in welcome box
- Current directory detection and display
- Voice count updated to 22
- Both install and update commands improved

### Key Implementation Details

**Dynamic Version Loading:**
```javascript
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const VERSION = packageJson.version;
```

**Two-Tone ASCII Title:**
```javascript
const agentText = figlet.textSync('Agent', {...});
const vibesText = figlet.textSync('Vibes', {...});
// Combine line-by-line with different colors
console.log(chalk.cyan(agentLine) + chalk.magenta(vibesLine));
```

**Release Notes Display:**
```javascript
const gitLog = execSync('git log --oneline --no-decorate -5', {...});
// Parse and display with colored hash and message
```

## 🔄 Migration Notes

### For Users

**No action required** - These are installer improvements only:
- Next installation will automatically use current directory
- Version and voice count display correctly
- Visual enhancements appear automatically

### For Package Maintainers

**Benefits:**
- No need to manually update VERSION constant anymore
- Installer always shows accurate package version
- Release notes automatically display from git history

## 📊 Release Stats

- **5 commits** since v1.0.17
- **1 file changed**: src/installer.js
- **86 insertions**, **21 deletions**
- **3 bug fixes**: version, directory, voice count
- **4 enhancements**: release notes, repo link, two-tone title, spacing
- **0 breaking changes**

## 🎯 User Experience Improvements

1. **Better Transparency**: Users see what's new before installing
2. **Accurate Information**: Version and voice count always correct
3. **Visual Appeal**: Eye-catching two-tone magenta/cyan title
4. **Clear Location**: No confusion about where files install
5. **Easy Reference**: GitHub repo link prominently displayed
6. **Professional Polish**: Improved spacing and layout

## 💡 Installer Output Preview

```
[Blank line for spacing]

 █████╗  ██████╗ ███████╗███╗   ██╗████████╗ ██╗   ██╗██╗██████╗ ███████╗███████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝ ██║   ██║██║██╔══██╗██╔════╝██╔════╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║    ██║   ██║██║██████╔╝█████╗  ███████╗
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║    ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ╚════██║
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║     ╚████╔╝ ██║██████╔╝███████╗███████║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝      ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚══════╝
(cyan)                                                  (magenta)

╭──────────────────────────────────────────────────────────────────╮
│                                                                  │
│  🎤 Beautiful ElevenLabs TTS Voice Commands for Claude Code      │
│                                                                  │
│  Add professional text-to-speech narration to your AI coding    │
│  sessions                                                        │
│                                                                  │
│  📦 https://github.com/paulpreibisch/AgentVibes                  │
│                                                                  │
╰──────────────────────────────────────────────────────────────────╯

📍 Installation Details:
   Current directory: /home/user/my-project
   Install location: /home/user/my-project/.claude/ (project-local)
   Package version: 1.0.18

📰 Latest Release Notes:
   b2a0db7 style: Make 'Vibes' magenta in AgentVibes title
   68b4f1a style: Add blank line above AgentVibes title in installer
   34aaf56 feat: Add GitHub repo link and Latest Release Notes to installer
   3502b48 fix: Install to current directory instead of home directory by default
   d10c552 fix: Update installer to show correct version (1.0.17) and voice count (22)

📦 What will be installed:
   • 11 slash commands → /home/user/my-project/.claude/commands/agent-vibes/
   • 4 TTS scripts → /home/user/my-project/.claude/hooks/
   • 10+ personality templates → /home/user/my-project/.claude/personalities/
   • Agent Vibes output style → /home/user/my-project/.claude/output-styles/
   • Voice configuration files
   • 22 unique ElevenLabs voices
```

## 🙏 Credits

Thanks to all users who provided feedback on the installer experience! Your input helped make AgentVibes more user-friendly and transparent.

---

# Release v1.0.17

[Previous release notes preserved below...]
