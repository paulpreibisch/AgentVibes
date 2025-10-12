# 🎤 AgentVibes Release Notes

## 📦 v2.0.16 - Remote Audio Setup Guide & Scripts (2025-10-12)

### 🤖 AI Summary

This patch release adds comprehensive documentation and automated setup scripts for running AgentVibes TTS on remote servers with local audio playback. Users can now easily configure PulseAudio to tunnel audio from their remote Linux servers (cloud VPS, home servers) to their local Windows speakers via SSH. Perfect for remote development workflows with VS Code Remote-SSH, this release includes interactive setup scripts for both Linux and Windows, complete with backups, validation, and troubleshooting guides.

### ✨ New Features

#### 📚 Remote Audio Setup Documentation
- **Comprehensive guide** - Complete docs at `docs/remote-audio-setup.md`
- **Architecture explained** - Detailed breakdown: Server → SSH Tunnel → WSL → Windows Speakers
- **Manual & automatic setup** - Choose your path: scripts or manual configuration
- **Troubleshooting section** - Common issues with solutions
- **VS Code integration** - Works seamlessly with Remote-SSH extension
- **Security considerations** - Explains encrypted tunneling and port configuration

**What's Covered:**
```
- Prerequisites and system requirements
- Step-by-step manual setup (Linux + Windows)
- Automated scripts (see below)
- Port configuration (4713, 14713)
- Verification commands and testing
- Common issues and fixes
- Multiple server configurations
```

#### 🐧 Linux Setup Script (`setup-remote-audio.sh`)
- **Automated PulseAudio configuration** - Sets up network support automatically
- **Shell detection** - Auto-detects bash/zsh and configures appropriately
- **Environment variables** - Adds `PULSE_SERVER=tcp:localhost:14713`
- **Automatic backups** - Creates timestamped backups before any changes
- **Colorful CLI** - Beautiful progress indicators and clear messaging
- **Verification steps** - Shows commands to test audio after setup
- **Safe execution** - Validates prerequisites before making changes

**Usage:**
```bash
curl -O https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/scripts/setup-remote-audio.sh
chmod +x setup-remote-audio.sh
./setup-remote-audio.sh
```

#### 🪟 Windows PowerShell Script (`setup-windows-audio.ps1`)
- **SSH tunnel configuration** - Automatically adds RemoteForward to SSH config
- **WSL validation** - Checks for WSL2 with GUI support (WSLg)
- **OpenSSH detection** - Verifies OpenSSH Client is installed
- **Host alias creation** - Generates friendly SSH host names
- **Backup and safety** - Creates timestamped backups of SSH config
- **Connection testing** - Optional SSH connection test after setup
- **Parameter support** - Flexible options for users and ports

**Usage:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/scripts/setup-windows-audio.ps1" -OutFile "setup-windows-audio.ps1"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-windows-audio.ps1 -RemoteHost "192.168.1.100"
```

**Parameters:**
- `-RemoteHost` (required) - Server hostname or IP
- `-RemoteUser` (optional) - SSH username (defaults to current user)
- `-TunnelPort` (optional) - Audio tunnel port (default: 14713)
- `-SSHConfigPath` (optional) - Custom SSH config location

#### 📖 Scripts Documentation
- **New scripts README** - Complete documentation at `scripts/README.md`
- **Usage examples** - Shows common workflows and scenarios
- **Troubleshooting guide** - Script-specific issues and solutions
- **Setup order** - Clear steps: Windows first, then Linux
- **Common issues** - Audio doesn't play, connection refused, etc.

### 📝 Documentation Updates

#### Main README Enhancements
- **Remote Audio Setup section** - New major section with quick setup
- **Table of Contents update** - Added 🔊 Remote Audio Setup entry
- **Quick setup commands** - Copy-paste ready PowerShell and bash commands
- **Architecture visualization** - Clear diagram of audio flow
- **Resource links** - Links to detailed docs and script READMEs

**New README Section:**
```markdown
## 🔊 Remote Audio Setup

**Running AgentVibes on a remote server but want to hear TTS on your local machine?**

Perfect for:
- Remote development on cloud/VPS servers
- Home server with local audio playback
- VS Code Remote-SSH workflows
- Any SSH-based remote development

[Complete documentation, scripts, and setup guide included]
```

### 🛠️ What Gets Configured

#### On Linux Server:
- **PulseAudio config** - `~/.config/pulse/default.pa` with network support
- **Environment variable** - `PULSE_SERVER=tcp:localhost:14713` in shell config
- **Automatic backups** - Preserves your existing configurations
- **Shell integration** - Works with bash or zsh automatically

#### On Windows Client:
- **SSH tunnel** - `RemoteForward 14713 localhost:14713` in SSH config
- **WSL compatibility** - Leverages WSLg for audio routing
- **Host configuration** - Clean SSH config entries with keep-alive
- **Backup safety** - Timestamps existing configs before changes

### 🎯 Use Cases

**Perfect for:**
1. **Cloud Development** - Run AgentVibes on AWS/GCP/Azure, hear TTS locally
2. **Home Lab Servers** - Powerful remote server, convenient local audio
3. **VS Code Remote-SSH** - Seamless integration with Remote-SSH extension
4. **Team Environments** - Shared remote development with personal audio
5. **Resource-heavy Tasks** - Use remote CPU/RAM, enjoy local audio feedback

### 📊 Files Added

**Documentation (2 files):**
- `docs/remote-audio-setup.md` (265 lines) - Complete setup guide
- `scripts/README.md` (117 lines) - Scripts documentation

**Setup Scripts (2 files):**
- `scripts/setup-remote-audio.sh` (214 lines) - Linux automation
- `scripts/setup-windows-audio.ps1` (274 lines) - Windows automation

**Main README:**
- Updated `README.md` (61 lines added) - Remote audio section

**Total Changes:** 931 insertions across 5 files

### 🔧 Technical Architecture

```
┌─────────────────┐
│  Remote Linux   │
│     Server      │
│                 │
│  PulseAudio     │
│   Port 4713     │
└────────┬────────┘
         │
         │ SSH Tunnel
         │ (RemoteForward 14713:localhost:14713)
         │
┌────────▼────────┐
│  Windows        │
│   Client        │
│                 │
│  WSL → Speakers │
└─────────────────┘
```

**Key Components:**
- **Port 4713** - Standard PulseAudio TCP port on remote
- **Port 14713** - SSH tunnel port for forwarding
- **WSLg** - Windows Subsystem for Linux with GUI support
- **RemoteForward** - SSH reverse tunnel (server → client)

### 💡 Usage Examples

#### Quick Setup
```bash
# 1. On Windows (configure SSH tunnel)
.\setup-windows-audio.ps1 -RemoteHost "myserver.com"

# 2. On Linux server (configure PulseAudio)
./setup-remote-audio.sh

# 3. Reconnect via SSH
ssh myserver.com

# 4. Test audio
speaker-test -t sine -f 1000 -l 1
```

#### VS Code Remote-SSH
```bash
# Tunnel is automatically established by VS Code
# No manual SSH connection needed!
1. Open VS Code
2. Connect to remote host
3. Audio just works 🎵
```

#### Verification Commands
```bash
# Check environment variable
echo $PULSE_SERVER
# Should show: tcp:localhost:14713

# Verify tunnel
ss -tlnp | grep :14713
# Should show listening socket

# Test PulseAudio
pactl info
# Should show server: tcp:localhost:14713
```

### 🔄 Migration Notes

**For All Users:**
- This is a documentation and tooling release
- No changes to AgentVibes core functionality
- Existing installations work exactly the same
- Remote audio setup is optional and opt-in

**To Use Remote Audio:**
1. Follow the guide at `docs/remote-audio-setup.md`
2. Run automated scripts or configure manually
3. Reconnect via SSH and test audio

**Requirements:**
- Remote Linux server with PulseAudio
- Local Windows machine with WSL2
- SSH access to remote server
- Internet connection for initial setup

### 🙏 Credits

This feature was developed based on a working remote audio configuration. Special thanks to the community members who shared their setups and helped test the automation scripts!

### 📚 Additional Resources

- [Remote Audio Setup Guide](docs/remote-audio-setup.md) - Complete documentation
- [Scripts README](scripts/README.md) - Script usage and troubleshooting
- [AgentVibes Website](https://agentvibes.org) - Main documentation

---

## 📦 v2.0.15 - BMAD Plugin Auto-Enable Fix (2025-10-12)

### 🤖 AI Summary

This patch release fixes a critical bug where the BMAD voice plugin was not automatically enabled during installation, even when BMAD was detected. Users installing AgentVibes with BMAD present would find plugin files created but the plugin non-functional because the crucial `.claude/activation-instructions` file was missing and the plugin wasn't enabled. Now, when BMAD is detected, the installer automatically creates activation instructions, enables the plugin, and sets everything up to work out of the box.

### 🐛 Bug Fixes

#### BMAD Plugin Auto-Enable Not Working
- **Fixed**: Plugin not enabled when BMAD detected during installation
- **Fixed**: Missing `.claude/activation-instructions` file prevented BMAD agents from creating context
- **Root Cause**: Installer created plugin files but never enabled the plugin or created activation instructions
- **Impact**: BMAD voice integration was non-functional after fresh installs
- **Solution**: Auto-enable plugin and create activation-instructions when BMAD detected

**What Was Broken:**
```bash
# Before: Plugin files created but not actually working
npx agentvibes install  # (with BMAD present)
# ✓ Created .claude/plugins/bmad-voices.md
# ✗ No .claude/plugins/bmad-voices-enabled.flag (plugin disabled!)
# ✗ No .claude/activation-instructions (agents don't know what to do!)

# Result: BMAD agents don't speak, voice switching doesn't work
```

**After Fix:**
```bash
# After: Plugin fully configured and working
npx agentvibes install  # (with BMAD present)
# ✓ Created .claude/plugins/bmad-voices.md
# ✓ Created .claude/plugins/bmad-voices-enabled.flag (auto-enabled!)
# ✓ Created .claude/activation-instructions (agents know what to do!)
# 🎤 Auto-enabled BMAD voice plugin

# Result: BMAD agents speak automatically with assigned voices!
```

#### Missing Activation Instructions
- **Fixed**: `.claude/activation-instructions` not created by installer
- **Fixed**: Manual `/agent-vibes:bmad enable` also didn't create instructions
- **Impact**: BMAD agents couldn't create `.bmad-agent-context` file
- **Solution**: Both installer and manual enable now create comprehensive activation instructions

**Why This File Matters:**

The `.claude/activation-instructions` file tells BMAD agents to:
1. Create `.bmad-agent-context` file with agent ID when activating
2. Clean up the context file when exiting
3. This allows AgentVibes to detect which agent is active and switch voices

Without this file, agents never create the context file, so AgentVibes can't detect them and voice switching fails silently.

### 📝 Technical Changes

**Modified: `src/installer.js`** (Lines 668-743)
- Added auto-enable logic when BMAD detected
- Creates `.claude/plugins/bmad-voices-enabled.flag` automatically
- Creates `.claude/activation-instructions` with full BMAD agent instructions
- Updates success message to reflect auto-enable status
- Fixed command examples in BMAD detection box (was `/agent-vibes-bmad`, now `/agent-vibes:bmad`)

**Modified: `.claude/hooks/bmad-voice-manager.sh`** (Lines 106-168)
- Added automatic creation of `.claude/activation-instructions` when enabling
- Uses heredoc to embed full activation instructions
- Only creates file if it doesn't exist (preserves customizations)
- Shows confirmation message when file created

**Added: `templates/activation-instructions-bmad.md`**
- Template file documenting the activation instructions
- Reference for what gets created by the system
- Explains why the file is critical for BMAD integration

### 🎯 User Impact

**Before v2.0.15:**
- Fresh AgentVibes install with BMAD: Voice integration didn't work
- Users had to manually debug why BMAD agents weren't speaking
- Required manual creation of activation-instructions file
- Plugin appeared "enabled" but wasn't actually functional

**After v2.0.15:**
- Fresh install with BMAD: Everything works immediately
- BMAD agents speak automatically with assigned voices
- Voice switching works out of the box
- No manual configuration needed

### 🔄 Opt-Out Design

**Philosophy: Auto-enable with easy opt-out**
- If you have BMAD installed, you probably want voice integration
- Better to work by default than require manual setup
- Users can easily disable with `/agent-vibes:bmad disable` if unwanted

### 📊 Files Changed

**Modified (2 files):**
- `src/installer.js` (87 lines added, 6 lines removed)
- `.claude/hooks/bmad-voice-manager.sh` (63 lines added)

**Added (1 file):**
- `templates/activation-instructions-bmad.md` (54 lines)

**Total Changes:** 204 insertions, 6 deletions across 3 files

### 🔄 Migration Notes

**For New Users:**
- No action needed - BMAD plugin auto-enables and works immediately
- Just run `npx agentvibes install` in directory with BMAD

**For Existing Users (v2.0.14 and earlier):**

If you previously installed AgentVibes and found BMAD voice integration not working:

```bash
# Update AgentVibes
/agent-vibes:update

# The plugin will auto-enable on next install if BMAD detected
# Or manually enable:
/agent-vibes:bmad enable
```

**To Disable BMAD Plugin (if unwanted):**
```bash
/agent-vibes:bmad disable
```

### 💡 What Gets Created

When BMAD is detected during installation, the system creates:

1. **`.claude/plugins/bmad-voices.md`** - Voice-to-agent mappings
2. **`.claude/plugins/bmad-voices-enabled.flag`** - Enables the plugin
3. **`.claude/activation-instructions`** - Instructions for BMAD agents

**Sample Activation Instructions:**
```markdown
## STEP 3.5a: Create BMAD Context File (CRITICAL)

**IMMEDIATELY after agent identification, create the context file:**

```bash
echo "$AGENT_ID" > .bmad-agent-context
```

This allows AgentVibes to:
1. Detect which BMAD agent is active
2. Look up the correct voice mapping
3. Automatically speak questions using the agent's assigned voice
```

### 🙏 Credits

Thanks to the user who reported this issue in the md-presentations directory! This led to discovering that the BMAD plugin setup was incomplete for all fresh installations.

---

## 📦 v2.0.14 - README Version Fix for npm (2025-10-11)

### 🤖 AI Summary

This patch release updates the npm package's README to display the correct version numbers. Since v2.0.13 was published before the README was corrected, the npm website displayed outdated version information. This release ensures users see v2.0.14 everywhere.

### 🐛 Bug Fixes

#### npm README Version Display
- **Fixed**: npm package page now shows correct version (v2.0.14)
- **Root Cause**: v2.0.13 was published with uncorrected README
- **Impact**: Users visiting npmjs.com/package/agentvibes now see accurate version info
- **Solution**: Republish with corrected README

### 📝 What Changed

**Modified: `README.md`**
- Author line now shows v2.0.14
- Latest Release section shows v2.0.14

**Modified: `package.json`, `package-lock.json`**
- Bumped version from 2.0.13 to 2.0.14

### 🔄 Migration Notes

**For All Users:**
- No functional changes - this is purely a documentation update
- Update via `/agent-vibes:update` to get latest version
- All features from v2.0.13 are identical

---

## 📦 v2.0.13 - Workflow Fix & Clean Release (2025-10-11)

### 🤖 AI Summary

This patch release fixes the npm publish workflow's README update patterns and provides a clean version without the experimental remote-SSH features that were accidentally included in v2.0.11 and v2.0.12. The workflow now correctly updates the README version information during releases, and users get a stable version based on v2.0.10.

### 🐛 Bug Fixes

#### Publish Workflow README Update Fix
- **Fixed sed patterns** - Workflow now correctly matches and updates README release section
- **Flexible pattern matching** - Handles different release title formats ("Multi-Provider Revolution" vs "Release Notes")
- **Correct version display** - README now shows v2.0.13 in both author line and latest release section

#### Clean Version Without Remote-SSH Features
- **Skipped v2.0.11/v2.0.12** - These versions included experimental remote TTS forwarding features
- **Based on v2.0.10** - This is a clean release from the stable master branch
- **No breaking changes** - All existing functionality from v2.0.10 is preserved

### 📝 Technical Changes

**Modified: `.github/workflows/publish.yml`**
- Updated sed pattern from exact "Release Notes" match to flexible `[^\]]*` pattern
- Improved pattern to match any title format in release section header
- Added comment explaining the flexible matching approach

**Modified: `package.json`, `package-lock.json`**
- Bumped version from 2.0.10 to 2.0.13

### 🔄 Migration Notes

**For All Users:**
- Update via `/agent-vibes:update` or `npx agentvibes@latest install`
- No breaking changes - all settings and configurations preserved
- If you were on v2.0.12, this removes the remote-SSH code

**Deprecation Notice:**
- v2.0.12 includes experimental features and should be avoided
- v2.0.13 is the recommended stable version

---

## 📦 v2.0.10 - GitHub Star Reminder & Provider Fixes (2025-01-10)

### 🤖 AI Summary

This patch release adds a gentle daily GitHub star reminder system and fixes critical bugs in provider switching and output style commands. Users can now be reminded to star the project (once per day, easily disabled), the ElevenLabs provider switching now works correctly with proper language support for 30+ languages, and all documentation now shows the correct output style command `Agent Vibes` instead of the lowercase `agent-vibes`.

### ✨ New Features

#### Daily GitHub Star Reminder System
- **Gentle reminders** - Shows once per day when using TTS
- **Easy to disable** - Run `echo "disabled" > .claude/github-star-reminder.txt`
- **Non-intrusive** - Beautiful formatted message with clear instructions
- **Community support** - Encourages users to support the project
- **Smart tracking** - Date-based reminder system prevents spam

**Example Reminder:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ Enjoying AgentVibes?

   If you find this project helpful, please consider giving us
   a star on GitHub! It helps others discover AgentVibes and
   motivates us to keep improving it.

   👉 https://github.com/paulpreibisch/AgentVibes

   Thank you for your support! 🙏

   💡 To disable these reminders, run:
   echo "disabled" > .claude/github-star-reminder.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Piper TTS Installer Script
- **Automated installation** - Created `.claude/hooks/piper-installer.sh`
- **Platform detection** - Checks for WSL/Linux compatibility
- **Dependency management** - Installs pipx automatically if needed
- **Voice downloads** - Offers to download voice models after installation
- **Clear instructions** - Provides next steps and usage guide

### 🐛 Bug Fixes

#### Provider Switching Function Fixes
- **Fixed function name mismatch** - `get_current_language()` → `get_language_code()` in provider-commands.sh:102
- **Fixed ElevenLabs language support** - `get_current_language()` → `get_language_code()` in play-tts-elevenlabs.sh:52
- **Added language validation** - New `is_language_supported()` function validates provider/language compatibility
- **Implemented language mapping** - Full 30+ language code mapping (spanish→es, french→fr, etc.)
- **Provider switching works** - Users can now switch between ElevenLabs and Piper without errors

**What Was Broken:**
```bash
# Before: Provider switching failed with "command not found" error
/agent-vibes:provider switch elevenlabs
# .claude/hooks/provider-commands.sh: line 102: get_current_language: command not found

# After: Works perfectly
/agent-vibes:provider switch elevenlabs
# ✓ Provider switched to: elevenlabs
```

#### Output Style Command Correction
- **Fixed installer** - Updated `src/installer.js` (2 locations)
- **Fixed hooks** - Updated check-output-style.sh, personality-manager.sh, voice-manager.sh
- **Correct command** - Changed `/output-style agent-vibes` → `/output-style Agent Vibes`
- **Consistent docs** - All documentation now shows the correct command

**Why This Matters:**
The output style name is case-sensitive in Claude Code. The incorrect lowercase command would fail silently, preventing users from enabling TTS narration.

### 🔧 Technical Changes

#### GitHub Star Reminder Implementation
**New Files:**
- `.claude/hooks/github-star-reminder.sh` - Main reminder script with disable support
- `.claude/github-star-reminder.txt` - Tracks last reminder date

**Integration:**
- Added to `play-tts.sh` router (runs before TTS playback)
- Silent errors (2>/dev/null || true) prevent disruption
- Project-local or global config support

**Disable Options:**
1. Echo "disabled" to reminder file
2. Create `.claude/github-star-reminder-disabled.flag`
3. Create `~/.claude/github-star-reminder-disabled.flag`

#### Provider Command Fixes
**Modified Functions:**
- `provider-commands.sh`:
  - Added `is_language_supported()` function (lines 15-42)
  - Fixed `get_current_language()` call to `get_language_code()` (line 131)

- `play-tts-elevenlabs.sh`:
  - Fixed `get_current_language()` call to `get_language_code()` (line 52)
  - Replaced `get_language_code_for_name()` with full case statement (lines 56-83)
  - Supports all 30+ languages with ISO 639-1 codes

**Language Code Mapping:**
```bash
case "$CURRENT_LANGUAGE" in
  spanish) LANGUAGE_CODE="es" ;;
  french) LANGUAGE_CODE="fr" ;;
  german) LANGUAGE_CODE="de" ;;
  italian) LANGUAGE_CODE="it" ;;
  # ... 26 more languages
  english|*) LANGUAGE_CODE="en" ;;
esac
```

#### Output Style Updates
**Files Modified:**
- `src/installer.js` - Lines 588, 614
- `.claude/hooks/check-output-style.sh` - Line 45
- `.claude/hooks/personality-manager.sh` - Line 197
- `.claude/hooks/voice-manager.sh` - Line 248

All now correctly reference `/output-style Agent Vibes` instead of the incorrect lowercase version.

### 🎯 User Impact

**Before v2.0.10:**
- Provider switching failed with cryptic "command not found" errors
- Users couldn't switch between ElevenLabs and Piper
- Documentation showed wrong output style command
- No gentle reminder to support the project

**After v2.0.10:**
- Provider switching works seamlessly
- Full 30+ language support with ElevenLabs
- Correct output style command everywhere
- Optional daily star reminder (easily disabled)
- Piper TTS installer for easy setup

### 📊 Files Changed

**Added (3 files):**
- `.claude/hooks/github-star-reminder.sh` (94 lines)
- `.claude/hooks/piper-installer.sh` (144 lines)
- `.claude/github-star-reminder.txt` (1 line)

**Modified (8 files):**
- `.claude/hooks/check-output-style.sh` (4 lines changed)
- `.claude/hooks/personality-manager.sh` (4 lines changed)
- `.claude/hooks/play-tts-elevenlabs.sh` (33 lines added)
- `.claude/hooks/play-tts.sh` (3 lines added)
- `.claude/hooks/provider-commands.sh` (31 lines added)
- `.claude/hooks/voice-manager.sh` (4 lines changed)
- `README.md` (4 lines changed)
- `src/installer.js` (4 lines changed)

**Test Updates (3 files):**
- `test/helpers/test-helper.bash` (6 lines changed)
- `test/unit/personality-manager.bats` (20 lines changed)
- `test/unit/personality-voice-mapping.bats` (21 lines changed)
- `test/unit/play-tts.bats` (9 lines removed)

**Total Changes:** 347 insertions, 35 deletions across 15 files

### 🔄 Migration Notes

**For All Users:**
- Update via `/agent-vibes:update` or `npx agentvibes update`
- No breaking changes - all existing settings preserved
- GitHub star reminder shows once per day (easily disabled)
- Provider switching now works correctly

**To Disable GitHub Star Reminders:**
```bash
echo "disabled" > .claude/github-star-reminder.txt
```

**To Install Piper TTS:**
```bash
.claude/hooks/piper-installer.sh
```

### 💡 What's Next

The next release (v2.1.0) will focus on:
- Enhanced Piper TTS voice management
- Improved multilingual voice selection
- Additional personality styles
- BMAD plugin enhancements

### 📝 Commits in This Release

```
869b1e8 feat: Add Piper TTS installer and improve GitHub star reminders
a9f3b0b feat: Add daily GitHub star reminder system
18c389e fix: Update output style command and provider switching functions
07ee376 test: Remove flaky API key test
5a1a78b test: Skip flaky API key test in CI environments
4ff1075 Merge branch 'master' of github.com:paulpreibisch/AgentVibes
73d8303 test: Update tests for provider-aware personality system
ec21c34 docs: Update README to version v2.0.9 [skip ci]
```

### 🙏 Credits

- Thanks to users who reported the provider switching issues
- Special appreciation to the community for supporting AgentVibes
- ElevenLabs team for their excellent multilingual API

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

---

# 🎤 AgentVibes Release Notes

## 📦 v2.0.9 - Installer Release Notes Fix (2025-01-07)

### 🤖 AI Summary

This patch release fixes a critical bug where the installer and updater commands were showing outdated v1.1.x commit messages instead of the current v2.0.8+ release notes. The commands now correctly read from RELEASE_NOTES.md which is included in the npm package.

### 🐛 Bug Fixes

#### Installer Release Notes Display
- **Fixed install command** - Now reads from RELEASE_NOTES.md instead of git log
- **Fixed update command** - Now shows actual v2.0.x release notes instead of v1.1.x commits
- **npm package compatibility** - Works correctly when installed via `npx agentvibes` (not a git repo)
- **Consistent display** - Both install and update show the same latest release information

### 🎯 User Impact

**Before:** Running `npx agentvibes update` showed confusing old commit messages from v1.1.2 era.

**After:** Both `install` and `update` commands show the correct latest release notes from v2.0.9, including the provider-aware personalities feature and all recent improvements.

### 📊 Files Changed
- Modified: src/installer.js (57 insertions, 31 deletions)

## 📦 v2.0.8 - Provider-Aware Personalities (2025-01-07)

### 🤖 AI Summary

This patch release makes the personality system fully provider-aware, fixing a critical issue where personality switching would fail to play TTS acknowledgments when using Piper TTS. Users can now seamlessly switch personalities regardless of which TTS provider they're using, with each personality automatically selecting the appropriate voice for the active provider.

### ✨ New Features

#### Provider-Aware Personality Voice Switching
- **Dual voice mappings** - All 19 personality files now include both `elevenlabs_voice` and `piper_voice` fields
- **Automatic voice selection** - Personality manager detects active TTS provider and switches to appropriate voice automatically
- **Piper voice mappings**:
  - Female personalities (sarcastic, flirty, sassy, dramatic) → `en_US-amy-medium`
  - Male casual (funny, pirate, surfer-dude, crass) → `en_US-joe-medium`
  - Professional (professional, normal, dry-humor, poetic, zen) → `en_US-lessac-medium`
  - Energetic (angry, annoying, robot) → `en_US-ryan-high`
  - Character voices (grandpa, moody) → `en_US-libritts-high`

#### Output Style Detection Helper
- **New check-output-style.sh** - Helper script for future output style detection features
- **User-friendly tips** - Voice and personality commands now show helpful tip about enabling agent-vibes output style
- **Better UX** - Users are guided to `/output-style agent-vibes` when needed

### 🐛 Bug Fixes

#### Whoami Command Provider Detection
- **Fixed provider display** - `/agent-vibes:whoami` now correctly shows active provider (Piper TTS or ElevenLabs)
- **Updated command description** - Metadata now mentions both providers instead of hardcoding "ElevenLabs"
- **Accurate information** - Users see "Provider: Piper TTS (Free, Offline)" when using Piper

#### Voice Manager Provider Support
- **Piper model name recognition** - Voice manager now accepts Piper voice model names (e.g., `en_US-amy-medium`)
- **Provider-aware validation** - Skips ElevenLabs voice validation when using Piper with Piper model names
- **Smart voice ID display** - Only shows ElevenLabs voice ID when actually using ElevenLabs

#### Piper TTS Voice File Reading
- **Fixed voice file lookup** - `play-tts-piper.sh` now correctly reads voice from `.claude/tts-voice.txt`
- **Project-local support** - Checks project-local `.claude/tts-voice.txt` first, then global `~/.claude/tts-voice.txt`
- **Piper model detection** - Validates voice names contain underscore and dash pattern for Piper models

### 🔧 Technical Changes

#### Personality Manager Improvements
- **Provider detection** - Reads `tts-provider.txt` to determine active provider
- **Conditional voice selection** - Uses `piper_voice` field when Piper is active, `elevenlabs_voice` for ElevenLabs
- **Fallback voice** - Defaults to `en_US-lessac-medium` if no Piper voice specified
- **New field support** - Added `piper_voice` field extraction to `get_personality_data` function

#### Voice Manager Refactoring
- **Provider-aware switch logic** - Detects Piper model names and bypasses ElevenLabs validation
- **Pattern matching** - Uses `*"_"*"-"*` pattern to identify Piper voice model names
- **Cleaner output** - Removed voice ID display for Piper voices since they don't use IDs

#### Personality File Structure
- **Clearer naming** - Renamed `voice:` to `elevenlabs_voice:` in all personality frontmatter
- **Dual provider support** - Every personality now has both ElevenLabs and Piper voice assignments
- **Consistency** - Standardized field naming across all 19 personality files

### 🎯 User Impact

**Before:** Setting a personality like `/agent-vibes:personality sarcastic` while using Piper TTS would try to use an ElevenLabs voice name that doesn't exist in Piper, resulting in no audio playback for acknowledgments/completions.

**After:** Personality switching seamlessly works with both providers:
- Using Piper? Gets `en_US-amy-medium` for sarcastic personality
- Using ElevenLabs? Gets "Jessica Anne Bogart" voice
- Always hear proper TTS acknowledgments and completions!

### 📊 Files Changed
- Modified: 3 hook scripts (personality-manager.sh, voice-manager.sh, play-tts-piper.sh)
- Modified: 19 personality files (all now have dual voice mappings)
- Modified: 1 command file (whoami.md)
- Added: 1 new helper script (check-output-style.sh)

**Total Changes:** 247 insertions, 69 deletions across 25 files

## 📦 v2.0.7 - Bug Fixes & UX Improvements (2025-01-07)

### 🤖 AI Summary

This patch release fixes critical issues with the voice preview command and significantly improves the installer UX. The `/agent-vibes:preview` command now correctly handles provider-specific voices and provides helpful guidance when users try to preview voices from the wrong provider. The installer adds interactive provider selection with automatic API key setup and shell configuration, making first-time setup much smoother.

### 🐛 Bug Fixes

#### Voice Preview Command Fixed
- **Fixed provider-aware voice previewing** - The `/agent-vibes:preview` command now correctly routes through the provider system instead of directly calling ElevenLabs-specific code
- **Intelligent voice detection** - Detects when you try to preview an ElevenLabs voice (like "Antoni") while using Piper and provides helpful guidance with alternatives
- **Support for specific voice previews** - Can now preview individual Piper voices by model name (e.g., `/agent-vibes:preview en_US-lessac-medium`)
- **Fixed language-manager error** - Resolved issue where sourcing `language-manager.sh` would trigger unwanted command handler execution showing "AgentVibes Language Manager" usage text
- **Fixed function name mismatch** - Corrected `get_current_language` to `get_language_code` in play-tts-piper.sh

#### Provider Routing Improvements
- **Simplified play-tts.sh router** - Streamlined routing logic for cleaner provider delegation
- **Fixed provider routing** - Ensures TTS requests always route to the active provider correctly
- **Better error handling** - Clear, helpful messages when voice/provider mismatch occurs

### ✨ Installer UX Enhancements

#### Interactive Provider Selection
- **Provider choice prompt** - Installer now asks which TTS provider you want (Piper or ElevenLabs) with clear descriptions
- **Automatic API key setup** - Detects your shell (bash/zsh) and offers to add ELEVENLABS_API_KEY to shell config file
- **Shell detection** - Intelligently detects whether you're using bash or zsh and configures the correct file
- **Multiple setup paths** - Choose between automatic shell config, manual setup, or skip API key configuration
- **Piper voices path configuration** - Added prompt for custom Piper voice storage location

#### Clearer Installation Messaging
- **Better location explanation** - Clear explanation of why AgentVibes installs in `.claude/` directory (Claude Code auto-discovery)
- **Removed confusing prompts** - Simplified installation directory selection to avoid confusion
- **Better confirmation flow** - Two-step confirmation: location first, then provider/installation
- **Installation summary** - Shows exactly what will be installed before proceeding

### 🔧 Update Command Improvements

- **Fixed version display** - Update command now correctly shows v2.0.x instead of v1.1.3
- **Synced with install command** - Both install and update commands now show identical release notes and formatting
- **Directory filtering** - Properly filters out directories when counting hooks and personalities
- **Consistent formatting** - Matches install command's beautiful display style

### 🛠️ Code Quality

- **Fixed undefined variable** - Replaced `srcPersonalityFiles` with correct variable name
- **Proper scope management** - Moved `piperVoicesPath` declaration to correct scope to avoid undefined errors
- **Command handler isolation** - Wrapped language-manager.sh case statement to only run when executed directly, not when sourced

---

### 📊 Changes Summary

**Files Modified:** 8 files
- `.claude/commands/agent-vibes/preview.md` - Provider-aware routing
- `.claude/hooks/language-manager.sh` - Command handler isolation fix
- `.claude/hooks/play-tts-piper.sh` - Function name correction
- `.claude/hooks/play-tts.sh` - Simplified router
- `.claude/hooks/provider-commands.sh` - Enhanced Piper preview support
- `src/installer.js` - Interactive setup & UX improvements
- `.claude/commands/release.md` - Documentation update
- `.claude/piper-voices-dir.txt` - Storage config

**Lines Changed:**
- Added: 275 lines
- Removed: 354 lines
- Net: -79 lines (cleaner codebase!)

---

### 🎯 What's Improved

#### For New Users
- **Much easier setup** - Interactive prompts guide you through provider selection and API key configuration
- **Clearer explanations** - Better messaging about where files are installed and why (Claude Code auto-discovery)
- **Faster onboarding** - Shell detection and automatic config file modification save manual steps

#### For Existing Users
- **Preview command works correctly** - No more language-manager errors when previewing voices
- **Provider switching is seamless** - Better error messages when voice/provider mismatch occurs
- **Update command is accurate** - Shows correct version and release notes instead of old v1.1.3

#### For Developers
- **Cleaner codebase** - Removed 79 lines of unnecessary code
- **Better separation of concerns** - Command handlers only run when appropriate
- **Improved maintainability** - More consistent code patterns across scripts

---

### 🔧 Technical Details

#### Provider Preview Architecture
The preview command now uses a three-tier detection system:

1. **ElevenLabs Provider**: Routes to `voice-manager.sh preview` for ElevenLabs voice listing
2. **Piper Provider with voice arg**:
   - Detects Piper voice format (`en_US-*-medium`)
   - Detects ElevenLabs voice names (shows helpful error with alternatives)
   - Validates voice model exists before previewing
3. **Piper Provider without args**: Shows first 3 sample voices (Lessac, Amy, Joe)

#### Language Manager Fix
The `language-manager.sh` script now checks if it's being executed directly vs sourced:

```bash
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Only run command handler when executed directly
    case "${1:-}" in
        set|get|code|check-voice|best-voice|list)
            # Handle commands
        ;;
    esac
fi
```

This prevents the case statement from executing when the script is sourced by other scripts like `play-tts-piper.sh`.

#### Installer Flow
```
1. Show installation details and location
2. Provider selection (Piper/ElevenLabs)
   ├─ If ElevenLabs: Check for API key
   │  ├─ Detect shell (bash/zsh)
   │  ├─ Offer to add to shell config
   │  ├─ Manual setup option
   │  └─ Skip option
   └─ If Piper: Ask for voice storage path
3. Explain .claude/ installation location with reasoning
4. Confirm installation location
5. Show installation summary
6. Final confirmation
7. Install all files
8. Show success summary with next steps
```

---

### 💡 Usage Examples

#### Preview Commands
```bash
# Preview with Piper (no args = first 3 voices)
/agent-vibes:preview

# Preview specific Piper voice
/agent-vibes:preview en_US-lessac-medium

# Try to preview ElevenLabs voice while using Piper
/agent-vibes:preview Antoni
# ❌ 'Antoni' appears to be an ElevenLabs voice
# You're currently using Piper TTS (free provider).
# Options:
#   1. Run /agent-vibes:list to see available Piper voices
#   2. Switch to ElevenLabs: /agent-vibes:provider switch elevenlabs
```

#### Installer Provider Selection
```bash
npx agentvibes install

# 🎭 Choose Your TTS Provider:
# ? Which TTS provider would you like to use?
#   🆓 Piper TTS (Free, Offline) - 50+ neural voices, no API key needed
#   🎤 ElevenLabs (Premium) - 150+ AI voices, requires API key
```

---

### 📦 Upgrade Notes

**From v2.0.6:**
```bash
npm update -g agentvibes
# or
/agent-vibes:update
```

**No breaking changes** - This is a pure bug fix and UX improvement release. All existing configurations, voices, personalities, and settings are preserved.

---

### 🙏 Credits

- **Voice Preview Fix**: Resolved GitHub issue reported by users experiencing language-manager errors
- **Provider Architecture**: Multi-provider system improvements continue to mature
- **Installer UX**: Community feedback on first-time setup experience led to these improvements

---

### 📚 Resources

- **Documentation**: https://agentvibes.org
- **GitHub**: https://github.com/paulpreibisch/AgentVibes
- **Issues**: https://github.com/paulpreibisch/AgentVibes/issues

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

---

## 📦 v1.1.3 - Symlink Support & Audio Fixes (2025-10-04)

### 🤖 AI Summary

This patch release fixes critical issues with symlinked `.claude/hooks` directories and adds WSL audio static prevention. Users who share hooks across multiple projects via symlinks (common in team environments) will now have proper project-local settings isolation. Additionally, WSL users experiencing audio static at the beginning of TTS playback now get automatic silence padding to eliminate the issue.

### 🐛 Bug Fixes

#### Symlinked Hooks Directory Support
- **Fixed**: Settings interference when `.claude/hooks` is a symlink
- **Root Cause**: Scripts used physical path resolution which broke project isolation
- **Impact**: Multiple projects sharing symlinked hooks now maintain separate voices/personalities
- **Solution**: Use logical paths (`pwd` without `-P`) to preserve symlink structure
- **Benefit**: Works seamlessly for both normal and symlinked installations

**What Was Broken:**
```bash
# Before: Projects sharing symlinked hooks interfered with each other
Project A: .claude/hooks -> /shared/hooks (uses Project B's voice!)
Project B: .claude/hooks -> /shared/hooks (correct)

# After: Each project maintains independent settings
Project A: Uses .claude/tts-voice.txt (correct!)
Project B: Uses .claude/tts-voice.txt (correct!)
```

#### WSL Audio Static Prevention
- **Fixed**: Static/pop at beginning of TTS audio in WSL environments
- **Root Cause**: Audio driver initialization delay
- **Solution**: Add 200ms silence padding before audio playback using ffmpeg
- **Benefit**: Clean, static-free audio playback

### 🔧 Technical Changes

**Modified Files:**
- `.claude/hooks/voice-manager.sh` - Fixed path resolution for symlinks
- `.claude/hooks/personality-manager.sh` - Fixed path resolution for symlinks
- `.claude/hooks/sentiment-manager.sh` - Fixed path resolution for symlinks
- `.claude/hooks/language-manager.sh` - Fixed path resolution for symlinks
- `.claude/hooks/play-tts.sh` - Added ffmpeg silence padding

**Path Resolution Changes:**
```bash
# Before (broken with symlinks):
PROJECT_ROOT="$SCRIPT_DIR/../.."
VOICE_FILE="$PROJECT_ROOT/.claude/tts-voice.txt"

# After (works with and without symlinks):
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_PATH")"
VOICE_FILE="$CLAUDE_DIR/tts-voice.txt"
```

**Audio Padding Implementation:**
```bash
# Add 200ms silence at start to prevent static
if command -v ffmpeg &> /dev/null; then
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo:d=0.2 \
    -i "${TEMP_FILE}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
    -map "[out]" -y "${PADDED_FILE}"
fi
```

### 💡 Use Cases Now Supported

**Team Environments with Shared Hooks:**
```bash
# Share hooks across team projects
team-9/SageDev/.claude/hooks -> /shared/team-hooks
team-10/production/.claude/hooks -> /shared/team-hooks

# Each project maintains independent settings
team-9/SageDev/.claude/tts-voice.txt = "Sarcastic Voice"
team-10/production/.claude/tts-voice.txt = "Professional Voice"
```

**WSL Audio Users:**
- No more static/pop sounds at audio start
- Smooth, professional TTS playback
- Works automatically if ffmpeg is installed

### 📊 Release Stats

- **5 files changed**: All manager scripts updated for symlink support
- **1 audio enhancement**: Silence padding for WSL
- **2 critical bugs fixed**
- **0 breaking changes**
- **100% backward compatible**: Normal installations unaffected

### 🔄 Migration Notes

**For Existing Users:**
- If you don't use symlinks: No action needed, everything works as before
- If you use symlinked hooks: Update via `/agent-vibes:update` to fix settings isolation
- WSL users: Install ffmpeg for static-free audio (`sudo apt-get install ffmpeg`)

**For New Users:**
- Symlinks work out of the box
- No special configuration needed

---

## 📝 Recent Commits

```
2044dc5 chore: Bump version to 1.1.2
8460977 fix: Installer now uses correct directory when run via npx
2ce7910 docs: Update version to v1.1.1 [skip ci]
5dc3ed1 docs: Update README to version v1.1.1 [skip ci]
2a46ab9 feat: Release v1.1.1 - Enhanced update display
```

---

## 📦 v1.1.2 - NPX Installation Fix (2025-10-04)

### 🤖 AI Summary

This patch release fixes a critical bug where `npx agentvibes install` incorrectly installed files to the npm cache directory instead of the user's actual project directory. The installer now properly detects the original working directory when run via npx by using the `INIT_CWD` environment variable, ensuring files are installed in the correct location every time.

### 🐛 Bug Fixes

#### NPX Installation Directory Bug
- **Fixed**: Installer using wrong directory when run via `npx agentvibes install`
- **Root Cause**: `process.cwd()` returns npm cache location during npx execution
- **Impact**: Files were installed to `/home/user/.npm/_npx/...` instead of project directory
- **Solution**: Use `process.env.INIT_CWD` (set by npm/npx) to get actual user's working directory
- **Benefit**: Installations now work correctly in all scenarios

**What Was Broken:**
```bash
$ cd /my/project
$ npx agentvibes install

# Before: Installed to /home/user/.npm/_npx/.../node_modules/agentvibes/.claude/
# After:  Installs to /my/project/.claude/ ✓
```

### 🔧 Technical Changes

**Modified Files:**
- `src/installer.js` - Fixed directory detection in all 3 command handlers

**Implementation:**
```javascript
// Before (broken):
const currentDir = process.cwd();

// After (fixed):
const currentDir = process.env.INIT_CWD || process.cwd();
```

**Commands Fixed:**
- `install` command (line 70)
- `update` command (line 428)
- `status` command (line 855)

### 💡 Why INIT_CWD?

When you run `npx agentvibes install`:
1. npm downloads package to cache: `/home/user/.npm/_npx/...`
2. npm sets `INIT_CWD` to your original directory: `/my/project`
3. npm runs the script from cache directory
4. `process.cwd()` returns cache directory (wrong!)
5. `process.env.INIT_CWD` returns your project directory (correct!)

### 📊 Release Stats

- **1 file changed**: src/installer.js
- **3 functions fixed**: install, update, status
- **6 lines added**: Comments explaining the fix
- **1 critical bug fixed**
- **0 breaking changes**

---

## 📝 Recent Commits

```
2ce7910 docs: Update version to v1.1.1 [skip ci]
5dc3ed1 docs: Update README to version v1.1.1 [skip ci]
2a46ab9 feat: Release v1.1.1 - Enhanced update display
c07d3fe feat: Enhance update display with both release notes and commit messages
047accd docs: Update version to v1.1.0 [skip ci]
```

---

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
