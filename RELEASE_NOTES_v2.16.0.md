# AgentVibes v2.16.0 Release Notes

## 🎵 Installer & User Experience Improvements

### Interactive Installer Enhancements
- **Background Music Setup**: Interactive prompt during installation to enable background music and select default track
  - Default: Soft Flamenco (changed from Bachata)
  - 16 track choices with emojis and descriptions
  - Auto-enables background music when track is selected
- **Verbosity Level Selection**: Choose TTS verbosity during installation
  - Options: High (default), Medium, Low
  - High = maximum transparency (speaks reasoning, decisions, findings)
- **Auto-Enable on Track Selection**: Setting a background track now automatically enables background music if disabled

### Project-Over-Global Settings
- **Smart Mute/Unmute**: Project settings now always override global settings
  - New `.claude/agentvibes-unmuted` file to override global mute
  - `/agent-vibes:mute` and `/agent-vibes:unmute` commands are project-specific by default
  - Advanced options for global mute/unmute
- **Visual Status Indicators**: Added status messages after TTS output showing:
  - Mute status (project/global/overrides)
  - Background music status (enabled/disabled/playing)

## 🎤 Audio Quality Improvements

### Better Pacing & Natural Speech
- **Sentence Pauses**: Added 2-second pauses between sentences using `--sentence-silence`
- **Background Music Intro**: 2-second Flamenco intro before voice starts
  - Background fades in (0.3s), plays solo (2s), then voice joins at full volume
  - Voice never fades in - full clarity from first word
- **Punctuation Handling**: Enhanced backslash removal for cleaner speech
  - Removes escaping for `!`, `?`, `,`, `.`, `$`, and `\\`
  - Welcome message updated to avoid exclamation marks (temporary fix)

### Regenerated Welcome Demo
- Complete welcome message with all sections
- Soft Flamenco background music throughout
- 2-second pauses between sentences
- No exclamation marks (avoids backslash pronunciation)

## 🐛 Bug Fixes

- **Installer Error**: Fixed "promptUser is not defined" error
  - Changed to use `inquirer.prompt` (correct API)
- **Audio Processing**: Clarified that fade-in only applies to background music, not voice

## 📦 What's Included

- Piper TTS (free, offline, high-quality voices)
- macOS Say support (system voices)
- 16 background music tracks (Latin, Electronic, Classical, World Music)
- BMAD integration for multi-agent conversations
- Background music management
- Personality system (20+ personalities)
- Verbosity levels (low/medium/high)
- Project-specific and global settings

## 🚀 Upgrading

```bash
npx agentvibes@latest update
```

## 📝 Breaking Changes

None - fully backward compatible

## 🙏 Thank You

Thank you to all our users and contributors! Please consider giving us a ⭐ on GitHub.

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v2.15.0...v2.16.0
