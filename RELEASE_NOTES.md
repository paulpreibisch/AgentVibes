# Release v2.4.1 - macOS Audio Playback Fix (2025-01-15)

## 🤖 AI Summary

This patch release fixes a critical audio playback issue on macOS where Piper TTS audio files were being created but not playing. The fix adds platform detection to use the native macOS `afplay` audio player instead of trying to use Linux-only audio players (mpv/aplay/paplay) that don't exist on macOS.

## 📋 Changes

### 🐛 Bug Fixes
- **Fixed macOS Audio Playback in Piper TTS**
  - Added platform detection to use `afplay` on macOS (Darwin)
  - Keeps existing Linux audio players (mpv/aplay/paplay) for WSL/Linux
  - Audio files now play correctly on macOS instead of silently failing
  - File: `.claude/hooks/play-tts-piper.sh` line 329-339

## 🎯 User Impact

**For macOS Users**: Audio playback now works! If you were seeing "🎵 Saved to:" messages but hearing no sound, this update fixes that. Simply run `npx agentvibes@latest install --yes` to get the fix.

**What Was Broken**: After v2.4.0 added macOS Piper TTS support, audio files were being generated successfully but the playback failed silently because the script was trying to use Linux audio players that don't exist on macOS.

**What's Fixed**: The script now detects macOS and uses the native `afplay` command for audio playback.

## 📦 Files Changed

### Modified
- `.claude/hooks/play-tts-piper.sh` - Added macOS platform detection for audio playback

### Statistics
- 1 file changed
- 10 insertions(+)
- 2 deletions(-)

## 🔄 Breaking Changes

None. This is a pure bug fix release.

## 🚀 Upgrade Notes

Simply run:
```bash
npx agentvibes@latest install --yes
```

This will update the hooks with the fixed audio playback script.

## 🙏 Credits

Special thanks to:
- **BMadCode** for reporting the issue and testing on macOS! (Official AgentVibes contributor 🎉)
- macOS users who helped identify the silent audio playback problem

## 🔗 Related

- v2.4.0 - Initial macOS Piper TTS support
- Issue: Audio files created but not playing on macOS
- Fix: Platform detection for native audio player selection

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v2.4.0...v2.4.1

---

# Release v2.4.0 - macOS Piper TTS Support (2025-01-15)

## 🤖 AI Summary

This minor release brings **full Piper TTS support to macOS** via precompiled binaries, eliminating the Python dependency conflicts that previously prevented macOS users from using free offline TTS. Mac users can now install Piper TTS with zero Python dependencies - just download and run! The installer automatically detects your Mac architecture (Intel or Apple Silicon) and downloads the appropriate binary. This release also includes comprehensive GitHub Actions CI testing to validate Piper installation across all macOS versions (13, 14, 15) and both architectures.

## 📋 Changes

### ✨ New Features
- **macOS Piper TTS Support via Precompiled Binaries**
  - Downloads official Piper binaries from rhasspy/piper releases
  - Automatic architecture detection (Apple Silicon M1/M2/M3 vs Intel)
  - Installs to `~/.local/bin/piper` with no Python dependencies
  - Zero pipx or pip conflicts - pure binary installation
  - Supports both `arm64` (Apple Silicon) and `x86_64` (Intel) architectures

- **Comprehensive macOS CI Testing**
  - Tests Piper binary installation on macOS 13, 14, and 15
  - Tests user-reported `--no-deps` pip workaround method
  - Validates both Intel and Apple Silicon architectures
  - Confirms standard pipx failure and binary success
  - Runs across 9 macOS configurations (3 OS × 3 Node versions)

### 🐛 Bug Fixes
- **Fixed macOS Piper Installation Failures**
  - Resolved pipx dependency conflict issues reported by users
  - Removed incorrect platform restriction blocking macOS
  - Fixed "Piper TTS is only supported on WSL and Linux" error

### 📚 Documentation
- **Updated Provider Documentation**
  - Corrected platform support matrix to include macOS
  - Added macOS-specific installation requirements
  - Clarified binary vs pipx installation methods
  - Updated "Choose Piper TTS if" section with macOS callout

- **Installer Script Documentation**
  - Added platform detection logic documentation
  - Documented binary download and extraction process
  - Added PATH setup instructions for macOS users

### 🔧 Maintenance
- **Refactored Release Process**
  - Extracted `showReleaseInfo()` function for code reuse
  - Added critical ordering warning to `/release` command
  - Documented README update before npm publish requirement

## 🎯 User Impact

**For macOS Users**: You can now use **completely free offline Piper TTS** on your Mac! No more ElevenLabs API key required. No more Python/pipx dependency hell. Just run `.claude/hooks/piper-installer.sh` and you're done. Works on both Intel Macs and Apple Silicon (M1/M2/M3).

**For All Users**: The updated documentation now correctly reflects that Piper TTS works on **ALL platforms**: Windows, macOS, Linux, and WSL.

**Installation is Simple**:
```bash
# Run AgentVibes installer
npx agentvibes install --yes

# Or directly run Piper installer
.claude/hooks/piper-installer.sh

# Add to PATH (if needed)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Architecture Support**:
- ✅ Apple Silicon (M1/M2/M3): Downloads `piper_macos_aarch64.tar.gz`
- ✅ Intel Mac (x86_64): Downloads `piper_macos_x64.tar.gz`

## 📦 Files Changed

### Modified
- `.claude/hooks/piper-installer.sh` - Added macOS binary installation support
- `.github/workflows/test-macos.yml` - Added comprehensive Piper installation tests
- `docs/providers.md` - Updated macOS support documentation
- `.claude/commands/release.md` - Added README update ordering warning
- `src/installer.js` - Refactored release info display

### Statistics
- 5 files changed
- 241 insertions(+)
- 130 deletions(-)

## 🔄 Breaking Changes

None. This release is fully backward compatible. Linux/WSL users continue using pipx installation, macOS users now get binary installation.

## 🚀 Upgrade Notes

Simply run:
```bash
npx agentvibes@latest install --yes
```

Existing configurations are preserved. If you're on macOS and previously couldn't install Piper, it will work now!

## 🙏 Credits

Special thanks to:
- **BMadCode** for reporting the macOS installation issue
- **rhasspy/piper** project for providing macOS binaries
- Community members who suggested the `--no-deps` workaround

## 📊 Testing

This release includes extensive CI testing:
- ✅ 9 macOS configurations (macOS 13/14/15 × Node 18/20/22)
- ✅ Both architecture types (Intel and Apple Silicon)
- ✅ Binary download and extraction validation
- ✅ Piper execution tests
- ✅ Fallback to pipx testing (confirms original issue)

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v2.3.1...v2.4.0

---

## v2.3.0 - Command Visibility Management & Maintenance (2025-11-06)

### 🤖 AI Summary

This minor release introduces command visibility management features allowing MCP users to hide/show AgentVibes slash commands, plus important maintenance improvements. Users who primarily interact with AgentVibes through MCP tools can now declutter their Claude Code command palette by hiding slash commands, while still retaining full MCP functionality. The release also includes improved .gitignore rules to exclude runtime and user-generated files from version control.

### 📋 Changes

#### ✨ New Features
- **Command Visibility Management**: New `/agent-vibes:hide` and `/agent-vibes:show` commands
  - Hide all AgentVibes slash commands from Claude Code interface
  - Keeps only hide/show commands visible when hidden
  - MCP functionality remains completely unaffected
  - Commands safely backed up to `.claude/.agentvibes-backup/`
  - Perfect for users who prefer MCP tools over slash commands

#### 🔧 Maintenance
- **Enhanced .gitignore**: Improved exclusion rules for runtime files
  - `.claude/plugins/*.flag` - Plugin state flags
  - `.claude/piper-voices/` - Downloaded voice models
  - `.claude/piper-voices-dir.txt` - Voice directory config
  - `.claude/github-star-reminder.txt` - UI reminder state
  - `.claude/.agentvibes-backup/` - Hidden command backups
  - `.claude/.agentvibes-hidden.flag` - Command visibility state

#### 📚 Documentation
- **README**: Updated version to v2.2.3
- **MCP Config**: Cleaned up `.mcp-minimal.json` configuration

### 🎯 User Impact

**For MCP Users**: If you primarily use AgentVibes through MCP tools and find the slash commands cluttering your command palette, you can now use `/agent-vibes:hide` to clean up the interface. Your MCP functionality will work exactly the same. Use `/agent-vibes:show` anytime to restore commands.

**For All Users**: The improved .gitignore ensures that runtime-generated files (voice models, state flags, reminders) are never accidentally committed to version control, keeping your git history clean.

**Command Organization**: The 29 AgentVibes slash commands can now be completely hidden with a single command, leaving only the hide/show toggles visible. This is ideal for users who:
- Prefer using MCP tools directly
- Want a cleaner command palette
- Are setting up AgentVibes for others
- Have memorized their favorite commands

### 📦 Files Changed
- `.claude/commands/agent-vibes/hide.md` - NEW: Hide commands feature
- `.claude/commands/agent-vibes/show.md` - NEW: Show commands feature
- `.gitignore` - Enhanced runtime file exclusions
- `.mcp-minimal.json` - Configuration cleanup
- `README.md` - Version update to v2.2.3

### 🔄 Breaking Changes
None. This release is fully backward compatible.

### 🚀 Upgrade Notes
Simply run `npx agentvibes@latest` to get the new features. Existing configurations and settings are preserved.

---

## v2.2.1 - Documentation & Installer UX Improvements (2025-11-03)

### 🤖 AI Summary

This patch release improves the user experience during installation and updates the documentation to reflect the latest v2.2.0 features. The MCP server configuration display has been redesigned with cleaner visual formatting, making it easier to copy the JSON configuration without accidentally including border characters. The README now properly highlights v2.2.0's provider-aware features, BMAD v6 support, and the transition from output-styles to SessionStart hooks.

### 📋 Changes

#### ✨ Improvements
- **Installer UX**: Split MCP configuration display into three sections for cleaner formatting
  - Top boxed section with intro and description
  - Middle section (no box) showing only the JSON config for easy copy-paste
  - Bottom boxed section with setup links and guides
  - Prevents accidental copying of border characters when copying JSON config

#### 📚 Documentation
- **README**: Updated latest release section to showcase v2.2.0 features
  - Provider-aware voice switching
  - **BMAD v6 support** with full backward compatibility to v4
  - MCP NPX configuration improvements
  - Improved installer UX highlights
  - Better voice mapping details
- **Architecture Change**: Documented transition from output-styles to SessionStart hooks
  - SessionStart hook now automatically loads TTS protocol on every session
  - Cleaner, more reliable activation mechanism
  - No need for manual output-style selection

### 🎯 User Impact

**For New Users**: The improved installer display makes it much easier to copy the MCP server configuration into your `~/.claude/mcp.json` file without formatting issues. You'll also benefit from the new SessionStart hook architecture which automatically activates TTS on every Claude Code session.

**For Existing Users**: When running `npx agentvibes install` or viewing installation instructions, you'll see a cleaner, more professional display that's easier to read and use. Note that AgentVibes now uses SessionStart hooks instead of output-styles for automatic activation.

**BMAD Users**: Full support for BMAD-METHOD v6-alpha with automatic agent voice assignment, while maintaining complete backward compatibility with v4.

### 📦 Files Changed
- `README.md` - Updated v2.2.0 release highlights
- `src/installer.js` - Improved MCP configuration display formatting
- `.claude/github-star-reminder.txt` - Updated reminder state
- `AgentVibes.code-workspace` - Workspace configuration updates

---

## v2.2.0 - Provider-Aware Features, BMAD v6 Support & MCP Improvements (2025-11-02)

### 🤖 AI Summary

Major enhancements to multi-provider support, BMAD integration, and MCP server configuration! This release makes AgentVibes smarter about which TTS provider you're using and adds full support for BMAD-METHOD v6-alpha with complete backward compatibility to v4.# Release v2.4.0 - macOS Piper TTS Support (2025-01-15)

## 🤖 AI Summary

This minor release brings **full Piper TTS support to macOS** via precompiled binaries, eliminating the Python dependency conflicts that previously prevented macOS users from using free offline TTS. Mac users can now install Piper TTS with zero Python dependencies - just download and run! The installer automatically detects your Mac architecture (Intel or Apple Silicon) and downloads the appropriate binary. This release also includes comprehensive GitHub Actions CI testing to validate Piper installation across all macOS versions (13, 14, 15) and both architectures.

## 📋 Changes

### ✨ New Features
- **macOS Piper TTS Support via Precompiled Binaries**
  - Downloads official Piper binaries from rhasspy/piper releases
  - Automatic architecture detection (Apple Silicon M1/M2/M3 vs Intel)
  - Installs to `~/.local/bin/piper` with no Python dependencies
  - Zero pipx or pip conflicts - pure binary installation
  - Supports both `arm64` (Apple Silicon) and `x86_64` (Intel) architectures

- **Comprehensive macOS CI Testing**
  - Tests Piper binary installation on macOS 13, 14, and 15
  - Tests user-reported `--no-deps` pip workaround method
  - Validates both Intel and Apple Silicon architectures
  - Confirms standard pipx failure and binary success
  - Runs across 9 macOS configurations (3 OS × 3 Node versions)

### 🐛 Bug Fixes
- **Fixed macOS Piper Installation Failures**
  - Resolved pipx dependency conflict issues reported by users
  - Removed incorrect platform restriction blocking macOS
  - Fixed "Piper TTS is only supported on WSL and Linux" error

### 📚 Documentation
- **Updated Provider Documentation**
  - Corrected platform support matrix to include macOS
  - Added macOS-specific installation requirements
  - Clarified binary vs pipx installation methods
  - Updated "Choose Piper TTS if" section with macOS callout

- **Installer Script Documentation**
  - Added platform detection logic documentation
  - Documented binary download and extraction process
  - Added PATH setup instructions for macOS users

### 🔧 Maintenance
- **Refactored Release Process**
  - Extracted `showReleaseInfo()` function for code reuse
  - Added critical ordering warning to `/release` command
  - Documented README update before npm publish requirement

## 🎯 User Impact

**For macOS Users**: You can now use **completely free offline Piper TTS** on your Mac! No more ElevenLabs API key required. No more Python/pipx dependency hell. Just run `.claude/hooks/piper-installer.sh` and you're done. Works on both Intel Macs and Apple Silicon (M1/M2/M3).

**For All Users**: The updated documentation now correctly reflects that Piper TTS works on **ALL platforms**: Windows, macOS, Linux, and WSL.

**Installation is Simple**:
```bash
# Run AgentVibes installer
npx agentvibes install --yes

# Or directly run Piper installer
.claude/hooks/piper-installer.sh

# Add to PATH (if needed)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Architecture Support**:
- ✅ Apple Silicon (M1/M2/M3): Downloads `piper_macos_aarch64.tar.gz`
- ✅ Intel Mac (x86_64): Downloads `piper_macos_x64.tar.gz`

## 📦 Files Changed

### Modified
- `.claude/hooks/piper-installer.sh` - Added macOS binary installation support
- `.github/workflows/test-macos.yml` - Added comprehensive Piper installation tests
- `docs/providers.md` - Updated macOS support documentation
- `.claude/commands/release.md` - Added README update ordering warning
- `src/installer.js` - Refactored release info display

### Statistics
- 5 files changed
- 241 insertions(+)
- 130 deletions(-)

## 🔄 Breaking Changes

None. This release is fully backward compatible. Linux/WSL users continue using pipx installation, macOS users now get binary installation.

## 🚀 Upgrade Notes

Simply run:
```bash
npx agentvibes@latest install --yes
```

Existing configurations are preserved. If you're on macOS and previously couldn't install Piper, it will work now!

## 🙏 Credits

Special thanks to:
- **BMadCode** for reporting the macOS installation issue
- **rhasspy/piper** project for providing macOS binaries
- Community members who suggested the `--no-deps` workaround

## 📊 Testing

This release includes extensive CI testing:
- ✅ 9 macOS configurations (macOS 13/14/15 × Node 18/20/22)
- ✅ Both architecture types (Intel and Apple Silicon)
- ✅ Binary download and extraction validation
- ✅ Piper execution tests
- ✅ Fallback to pipx testing (confirms original issue)

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v2.3.1...v2.4.0

---

