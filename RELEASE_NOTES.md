# Release v2.6.0 - BMAD Integration & Voice Management CLI

**Release Date:** 2025-11-18
**Type:** Minor Release (New Features)

## 🎯 AI Summary

**What is BMAD?** BMAD (Building Multi-Agent Development) is a revolutionary AI-driven agile framework for software and game development. It automatically adapts from single bug fixes to enterprise-scale systems. AgentVibes whole-heartedly supports BMAD by providing Text to Speech capabilities, enabling great flow for developers working with BMAD when developing code.

AgentVibes v2.6.0 brings comprehensive BMAD integration, enabling all BMAD agents to speak with unique AI voices. This release includes a provider-agnostic TTS injection system, five new CLI commands for easy voice management, and improved user experience with fuzzy voice matching and help documentation.

**Key Highlights:**
- 🎙️ **BMAD TTS Integration** - All BMAD agents can now speak with unique voices
- 🛠️ **Voice Management CLI** - 5 new commands for managing agent voices
- 🔍 **Fuzzy Voice Matching** - Use short names like "ryan" instead of full voice IDs
- 📚 **Improved Help** - Built-in help command lists all available commands
- 🔧 **BMAD v6 Support** - Detects and works with latest BMAD folder structure

---

## ✨ New Features

### BMAD Integration

**TTS Injection System** (commits: bedbc783, a2203ffa)
- Provider-agnostic `TTS_INJECTION` marker system
- Automatic detection and injection during BMAD installation
- Works with both `.bmad/` (v6) and `bmad/` (legacy) folders
- Supports individual agent voices and party mode multi-agent discussions

**Voice Assignment** (commits: 361c522a, 3cef9d1c)
- Auto-creates default voice assignments for 10 BMAD agents
- Each agent gets a unique voice matching their personality:
  - PM (John) - Professional male voice
  - Architect (Marcus) - Deep authoritative voice
  - Developer (Alex) - Casual friendly voice
  - Analyst (Emma) - Articulate female voice
  - UX Designer (Sara) - Warm professional voice
  - And 5 more specialized voices
- Smart folder detection prevents false legacy warnings

**Agent ID Support** (commits: 638a3d75, 3e6fe609)
- Extracts agent IDs from file paths (`.bmad/bmm/agents/pm.md` → `pm`)
- Strips escaped special characters to prevent speech artifacts
- Supports both agent IDs and display names

### Voice Management CLI

**5 New Commands** (commit: 560e51bb)
1. `npx agentvibes preview-voice <voice-name>` - Preview any voice with sample text
2. `npx agentvibes list-available-voices` - Show all Piper TTS voices
3. `npx agentvibes list-bmad-assigned-voices` - Show current agent assignments
4. `npx agentvibes assign-voice <agent-id> <voice-name>` - Change voice assignments
5. `npx agentvibes reset-bmad-voices` - Reset all agents to defaults

### User Experience Improvements

**Fuzzy Voice Matching** (commit: b4160ab0)
- Use short names: `npx agentvibes preview-voice ryan`
- Automatically matches to full voice ID: `en_US-ryan-high`
- Shows friendly "Matched 'ryan' to 'en_US-ryan-high'" message
- Prevents accidental download prompts

**Help Command** (commit: 45409a3a)
- `npx agentvibes help` - Lists all available commands
- Also works with `--help` and `-h` flags
- Properly configured CLI metadata (name, description, version)

### Technical Improvements

**BMAD v6 Detection** (commit: e75be413)
- Updated `bmad-detector.js` to detect `.bmad/` folder structure
- Updated `bmad-tts-injector.sh` to prioritize `.bmad/` over `bmad/`
- Maintains backward compatibility with legacy `bmad/` folders

---

## 🐛 Bug Fixes

**Voice Assignment Creation** (commit: 3cef9d1c)
- Fixed: Voice assignments weren't created when AgentVibes installed before BMAD
- Solution: Only create assignments if `.bmad/` folder already exists
- Prevents false "legacy BMAD v4" detection warnings

**Special Character Handling** (commit: 3e6fe609)
- Fixed: Escaped characters (like `\!`) in speech caused artifacts
- Solution: Strip escape sequences before sending text to TTS
- Clean speech output without "backslash exclamation" sounds

**Agent ID Extraction** (commit: 638a3d75)
- Fixed: File paths weren't properly converted to agent IDs
- Solution: Extract basename from paths like `.bmad/bmm/agents/pm.md`
- Correct voice assignment lookup for all agents

---

## 📦 Chores & Maintenance

**.gitignore Updates** (commit: e75be413)
- Added `.bmad/` folder (BMAD v6 installations)
- Added `.mcp.json` (user-specific MCP config)
- Added documentation patterns (screenshots, drafts, release notes)
- Removed obsolete `user-prompt-output.sh` hook

---

## 🔧 Technical Details

### Files Added
- `src/commands/bmad-voices.js` (388 lines) - Voice management commands module

### Files Modified
- `src/installer.js` - Added CLI command definitions and program config
- `src/bmad-detector.js` - Updated for `.bmad/` folder detection
- `.claude/hooks/bmad-speak.sh` - Enhanced agent ID and path handling
- `.claude/hooks/bmad-tts-injector.sh` - Added `.bmad/` detection
- `.gitignore` - Comprehensive ignore patterns

### GitHub Issues Resolved
- #36 - Support BMAD agent IDs in bmad-speak.sh
- #37 - Add CLI commands for BMAD voice management

---

## 📊 Stats

- **Commits:** 10
- **Files Changed:** 8
- **Lines Added:** ~600
- **Lines Removed:** ~150
- **New Commands:** 5
- **Issues Closed:** 2

---

## 🚀 Upgrade Guide

### From v2.5.0

**No breaking changes** - this is a backward-compatible feature release.

To get the new features:

```bash
# Update AgentVibes
npx agentvibes update

# If you have BMAD installed, voice assignments will be created automatically
# Test the new commands:
npx agentvibes help
npx agentvibes list-available-voices
npx agentvibes preview-voice ryan
```

---

## 💡 Usage Examples

### Preview Voices (New Fuzzy Matching)
```bash
# Short names now work!
npx agentvibes preview-voice ryan
npx agentvibes preview-voice kristin
npx agentvibes preview-voice danny

# Full names still work
npx agentvibes preview-voice en_US-ryan-high
```

### Manage BMAD Agent Voices
```bash
# List all available voices
npx agentvibes list-available-voices

# See current BMAD agent assignments
npx agentvibes list-bmad-assigned-voices

# Change an agent's voice
npx agentvibes assign-voice pm en_US-danny-low

# Reset all agents to defaults
npx agentvibes reset-bmad-voices
```

### Get Help
```bash
# All these work:
npx agentvibes help
npx agentvibes --help
npx agentvibes -h
```

---

## 🤝 Contributors

- Paul Preibisch (@paulpreibisch)
- Claude AI (code generation assistant)

---

## 📝 Notes

### BMAD Installation Order

For automatic voice assignment setup, install BMAD first, then AgentVibes:

```bash
npx bmad install
npx agentvibes install
```

If you install AgentVibes first, you'll need to manually create voice assignments:

```bash
mkdir -p .bmad/_cfg
cat > .bmad/_cfg/agent-voice-map.csv << 'EOF'
agent_id,voice_name
pm,en_US-ryan-high
architect,en_US-danny-low
dev,en_US-joe-medium
analyst,en_US-amy-medium
ux-designer,en_US-kristin-medium
tea,en_US-lessac-medium
sm,en_US-bryce-medium
tech-writer,en_US-kathleen-low
frame-expert,en_US-kusal-medium
bmad-master,en_US-libritts_r-high
EOF
```

### Provider-Agnostic Design

The `TTS_INJECTION` marker system is intentionally generic. Future TTS providers can integrate by:
1. Creating a hook script at `.claude/hooks/bmad-speak.sh`
2. Implementing the interface: `bmad-speak.sh <agent-id> <text>`
3. BMAD will automatically detect and use the custom implementation

---

## 🔗 Links

- **npm Package:** https://www.npmjs.com/package/agentvibes
- **GitHub Repository:** https://github.com/paulpreibisch/AgentVibes
- **GitHub Release:** https://github.com/paulpreibisch/AgentVibes/releases/tag/v2.6.0
- **BMAD Integration PR:** (To be created in BMAD-METHOD repository)
- **Issue #36:** https://github.com/paulpreibisch/AgentVibes/issues/36
- **Issue #37:** https://github.com/paulpreibisch/AgentVibes/issues/37

---

**Full Changelog:** https://github.com/paulpreibisch/AgentVibes/compare/v2.5.0...v2.6.0

---

# Release v2.4.3 - macOS Compatibility Fixes (2025-01-15)

## 🤖 AI Summary

This patch release resolves three critical macOS installation issues discovered during user testing. The fixes ensure seamless installation on macOS by adding proper audio playback support for ElevenLabs TTS, detecting the user's shell environment correctly (zsh vs bash), fixing Piper installer PATH issues, and handling optional plugin manifest files gracefully. These changes complete the macOS compatibility work started in v2.4.0, making AgentVibes fully functional across all platforms.

## 📋 Changes

### 🐛 Bug Fixes

- **Fixed ElevenLabs Audio Playback on macOS**
  - Added platform detection to use native `afplay` on macOS
  - Previously used Linux-only players (paplay/aplay) that don't exist on macOS
  - Audio files now play correctly instead of failing silently
  - File: `.claude/hooks/play-tts-elevenlabs.sh` lines 387-399

- **Fixed Shell Environment Detection**
  - Installer now detects user's default shell (zsh vs bash)
  - Environment variables written to correct config file (.zshrc or .bashrc)
  - Scripts now execute using user's shell with proper environment
  - Replaced hardcoded `bash` calls with shell-aware execution
  - File: `src/installer.js` - Added `getUserShell()` and `execScript()` helpers

- **Fixed Piper Version Check on macOS**
  - Version check now uses full path `$INSTALL_DIR/piper --version`
  - Previously failed because PATH wasn't updated in same shell session
  - Eliminates false "piper: command not found" error after successful install
  - File: `.claude/hooks/piper-installer.sh` line 200

- **Fixed Plugin Manifest Installation Error**
  - Installer now checks if source `.claude-plugin/plugin.json` exists
  - Skips silently if file doesn't exist (optional feature)
  - Prevents ENOENT error: "no such file or directory" during installation
  - File: `src/installer.js` lines 682-704

## 🎯 User Impact

**For macOS Users**: All three critical installation issues are now fixed! You can install AgentVibes on macOS without errors:

1. **ElevenLabs TTS audio plays correctly** - Uses native macOS `afplay` command
2. **Environment variables work** - Installer detects zsh and writes to .zshrc
3. **Piper installer succeeds** - No more false "command not found" errors
4. **No plugin manifest errors** - Installation completes cleanly

**What Was Broken**:
- ElevenLabs audio generated but didn't play (wrong audio player for macOS)
- API keys written to .zshrc but scripts ran with bash (no environment)
- Piper binary installed successfully but version check failed
- Plugin manifest copy failed with ENOENT error

**What's Fixed**: Complete macOS installation workflow now works end-to-end.

## 📦 Files Changed

### Modified
- `.claude/hooks/play-tts-elevenlabs.sh` - Added macOS audio playback support
- `.claude/hooks/piper-installer.sh` - Fixed version check PATH issue
- `src/installer.js` - Added shell detection, fixed plugin manifest handling

### Statistics
- 3 files changed
- 26 insertions(+)
- 7 deletions(-)

## 🔄 Breaking Changes

None. This release only fixes bugs without changing any existing functionality.

## 🚀 Upgrade Notes

Simply run:
```bash
npx agentvibes@latest install --yes
```

All fixes are applied automatically during installation. No manual configuration needed!

## 🙏 Credits

Special thanks to **Tyler Worley** and **Brian Madison** for thorough macOS testing and reporting these issues! Their detailed bug reports with screenshots made these fixes possible.

## 🔗 Related

- v2.4.2 - BMAD TTS Auto-Injection
- v2.4.1 - macOS Piper Audio Playback Fix
- v2.4.0 - macOS Piper TTS Support

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v2.4.2...v2.4.3

---

# Release v2.4.2 - BMAD TTS Auto-Injection (2025-01-15)

## 🤖 AI Summary

This patch release makes BMAD integration completely automatic! Previously, the installer only created documentation about BMAD integration but didn't actually modify the agent files. Now the installer automatically runs `bmad-tts-injector.sh enable` when BMAD is detected, ensuring BMAD agents will speak immediately after installation without requiring manual configuration steps.

## 📋 Changes

### ✨ Improvements
- **Automatic BMAD TTS Injection**
  - Installer now automatically injects TTS hooks into BMAD agent files
  - Detects BMAD installation and enables TTS during AgentVibes installation
  - No manual steps required - agents speak immediately after install
  - File: `src/installer.js` lines 1004-1036

### 🔧 Technical Changes
- **Enhanced Installer Logic**
  - Import `execSync` from `node:child_process` to run shell scripts
  - Automatically execute `bmad-tts-injector.sh enable` when BMAD detected
  - Add comprehensive error handling with user-friendly fallback messages
  - Update success message to reflect automatic TTS injection status
  - Show injection status and available commands in completion box

## 🎯 User Impact

**For BMAD Users**: When you install AgentVibes, TTS is now **automatically injected** into all your BMAD agent files. Your agents will speak immediately - no need to run `bmad-tts-injector.sh enable` manually!

**What Changed**: The installer detects BMAD and automatically runs the TTS injection script, modifying agent files to include TTS hooks. If injection fails for any reason, you'll see a friendly error message with manual fallback instructions.

**Installation is Simple**:
```bash
npx agentvibes install --yes
# TTS is automatically injected into BMAD agents!
```

## 📦 Files Changed

### Modified
- `src/installer.js` - Added automatic BMAD TTS injection during installation

### Statistics
- 1 file changed
- 40 insertions(+)
- 4 deletions(-)

## 🔄 Breaking Changes

None. This release enhances the installation experience for BMAD users without affecting existing functionality.

## 🚀 Upgrade Notes

Simply run:
```bash
npx agentvibes@latest install --yes
```

If you previously installed AgentVibes and manually ran `bmad-tts-injector.sh enable`, this update won't affect you. The injection script is idempotent and safe to run multiple times.

## 🙏 Credits

This improvement eliminates a manual configuration step that users frequently asked about, making BMAD integration seamless.

## 🔗 Related

- v2.4.1 - macOS Audio Playback Fix
- v2.4.0 - macOS Piper TTS Support
- BMAD Plugin Documentation: `docs/bmad-plugin.md`

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v2.4.1...v2.4.2

---

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

Major enhancements to multi-provider support, BMAD integration, and MCP server configuration! This release makes AgentVibes smarter about which TTS provider you're using and adds full support for BMAD-METHOD v6-alpha with complete backward compatibility to v4.
