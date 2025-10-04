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
