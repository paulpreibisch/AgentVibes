# Release v2.14.19 - BMAD TTS Injection Improvements

**Release Date:** 2025-12-05
**Type:** Patch Release

## AI Summary

AgentVibes v2.14.19 improves the BMAD TTS injection feature with better file handling, organized backups, and a more informative summary when enabling voice support for your BMAD agents.

**Key Highlights:**
- 📦 **Organized Backups** - All backups now saved in `.agentvibes/backups/agents/` with timestamps
- 📋 **Better Summary** - See exactly which files were modified and how to restore them
- 🔧 **Improved Reliability** - Better file handling to ensure agent files are always preserved
- 🐚 **Shell Compatibility** - Works on more systems including older bash versions

---

## What is TTS Injection?

**TTS (Text-to-Speech) Injection** is a feature that makes your BMAD agents talk! When you install BMAD with AgentVibes, it adds voice instructions to each agent file so they can speak their responses aloud.

### How it works:

1. **Before TTS Injection** - Your BMAD agents (PM, Architect, UX Designer, etc.) only display text responses
2. **After TTS Injection** - Each agent can speak their responses using your chosen voice

### Example:

When you activate the PM agent, instead of just seeing text, you'll hear:
> "Hey! I'm Marcus, your Project Manager. What can I help you with today?"

The injection adds a small instruction to each agent file that tells it to use AgentVibes for voice output. Your original agent files are always backed up before any changes.

---

## What's New in This Release

### Organized Backup System

When TTS is enabled on your agents, backups are now saved in one central location:

```
.agentvibes/backups/agents/
├── pm_20251205_143022.md
├── architect_20251205_143022.md
├── ux-designer_20251205_143022.md
└── ...
```

Each backup includes a timestamp so you can see exactly when it was created.

### Informative Summary

After enabling TTS, you'll see a clear summary:

```
═══════════════════════════════════════════════════════════════
                    TTS INJECTION SUMMARY
═══════════════════════════════════════════════════════════════

✅ Successfully modified: 11 agents

📝 Modified Files:
   • .bmad/bmm/agents/pm.md
   • .bmad/bmm/agents/architect.md
   • .bmad/bmm/agents/ux-designer.md
   • ...

📦 Backups saved to:
   .agentvibes/backups/agents/

🔄 To restore original files, run:
   .claude/hooks/bmad-tts-injector.sh restore

💡 BMAD agents will now speak when activated!
```

### Improved Reliability

The script now includes extra checks to make sure your agent files are always safe:
- Creates a backup before making any changes
- Verifies changes were successful before saving
- Automatically restores from backup if anything goes wrong

---

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/bmad-tts-injector.sh` | Backup organization, summary output, reliability improvements |

---

## Testing

- ✅ All 132 BATS tests pass
- ✅ All 12 Node.js tests pass

---

## Upgrade

```bash
npx agentvibes update
```

---

---

# Release v2.14.18 - Mute/Unmute TTS Control

**Release Date:** 2025-12-03
**Type:** Patch Release (Feature)

## AI Summary

AgentVibes v2.14.18 adds the ability to mute and unmute TTS output with persistent state. Perfect for when you're in a meeting or need temporary silence without losing your voice configuration. The mute state persists across Claude sessions - mute once, stay silent until you unmute.

**Key Highlights:**
- 🔇 **Mute Command** - `/agent-vibes:mute` silences all TTS output instantly
- 🔊 **Unmute Command** - `/agent-vibes:unmute` restores voice output
- 💾 **Persistent State** - Mute survives Claude restarts (stored in `~/.agentvibes-muted`)
- 🔌 **MCP Support** - `mute()`, `unmute()`, `is_muted()` tools for Claude Desktop/Warp
- 🧪 **Full Test Coverage** - 6 new tests validate mute/unmute functionality

---

## New Features

### Mute/Unmute Slash Commands
**Files:** `.claude/commands/agent-vibes/mute.md`, `.claude/commands/agent-vibes/unmute.md`

New slash commands to control TTS output:

```bash
/agent-vibes:mute    # 🔇 Silences all TTS
/agent-vibes:unmute  # 🔊 Restores TTS
```

### MCP Server Tools
**File:** `mcp-server/server.py`

Three new MCP tools for Claude Desktop and Warp users:

| Tool | Description |
|------|-------------|
| `mute()` | Mute TTS, creates persistent mute flag |
| `unmute()` | Unmute TTS, removes mute flag(s) |
| `is_muted()` | Check current mute status |

### Dual Mute Location Support
**File:** `.claude/hooks/play-tts.sh`

Supports both global and project-local mute files:
- **Global:** `~/.agentvibes-muted` - Mutes TTS in all projects
- **Project:** `.claude/agentvibes-muted` - Mutes TTS in current project only

```bash
# play-tts.sh now checks both locations:
if [[ -f "$HOME/.agentvibes-muted" ]] || [[ -f "$PROJECT_ROOT/.claude/agentvibes-muted" ]]; then
  echo "🔇 TTS muted"
  exit 0
fi
```

---

## Test Coverage

### New Tests Added
**File:** `mcp-server/test_server.py`

Added comprehensive mute/unmute tests:

1. ✅ Initial state is unmuted
2. ✅ Mute creates `~/.agentvibes-muted` file
3. ✅ `is_muted()` correctly reports muted state
4. ✅ Unmute removes mute file
5. ✅ `is_muted()` correctly reports active state after unmute
6. ✅ Unmute handles already-unmuted state gracefully
7. ✅ `play-tts.sh` respects mute file

---

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/play-tts.sh` | Added mute file detection (+17 lines) |
| `mcp-server/server.py` | Added `mute()`, `unmute()`, `is_muted()` tools (+76 lines) |
| `mcp-server/test_server.py` | Added mute/unmute test suite (+137 lines) |
| `.claude/commands/agent-vibes/mute.md` | New: Mute slash command |
| `.claude/commands/agent-vibes/unmute.md` | New: Unmute slash command |
| `.claude/commands/agent-vibes/agent-vibes.md` | Updated help documentation |

---

## Testing

- ✅ All 132 BATS tests pass
- ✅ All 12 Node.js tests pass
- ✅ 7 new mute/unmute tests pass

---

## Upgrade

```bash
npx agentvibes update
```

---

---

# Release v2.14.17 - CodeQL Code Quality Improvements

**Release Date:** 2025-12-02
**Type:** Patch Release (Code Quality)

## AI Summary

Hi everyone! I enabled CodeQL on this repository to ensure the highest quality code for AgentVibes. It found 5 issues which we fixed in this release!

AgentVibes v2.14.17 addresses all 5 CodeQL suggestions by upgrading to more robust Node.js APIs. These are proactive improvements to follow best practices - using atomic file writes and array-based command execution. No bash code was touched, so macOS Bash 3.2 compatibility is fully preserved.

**Key Highlights:**
- ✨ **Atomic File Writes** - Config files now use temp+rename pattern for reliability
- ✨ **Array-Based Commands** - Switched to `execFileSync` with array args (cleaner code)
- ✨ **Input Validation** - Added validation for shell paths and config locations
- ✅ **macOS Safe** - All changes are Node.js only, no bash modifications

---

## Code Quality Improvements

### Atomic File Writes (CodeQL #5)
**File:** `src/commands/install-mcp.js:151`

Upgraded config file writing to use the atomic temp+rename pattern for better reliability.

```javascript
// Before: Direct write
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// After: Atomic write pattern
const tempPath = `${configPath}.tmp.${process.pid}`;
fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), { mode: 0o600 });
fs.renameSync(tempPath, configPath);
```

### Array-Based Command Execution (CodeQL #2, #4)
**Files:** `bin/agent-vibes:33`, `src/installer.js:1305`

Switched from string-based to array-based command execution for cleaner, more robust code.

```javascript
// Before: String concatenation
execSync(`node "${installerPath}" ${arguments_.join(' ')}`);

// After: Array arguments (cleaner!)
execFileSync('node', [installerPath, ...arguments_]);
```

### Input Validation (CodeQL #1, #3)
**File:** `src/installer.js:215-217`

Added validation for shell paths and config file locations.

```javascript
// Validate shell is a known shell binary
const validShells = ['/bin/bash', '/bin/zsh', '/bin/sh', ...];
if (!validShells.includes(shell)) {
  throw new Error('Shell path not recognized');
}
```

---

## macOS Compatibility Note

These improvements only modify JavaScript/Node.js code. No bash scripts were changed. The "array-based arguments" are **JavaScript arrays** (Node.js API), not bash arrays. Full macOS Bash 3.2 compatibility is preserved!

---

## Files Modified

| File | Changes |
|------|---------|
| `bin/agent-vibes` | execSync → execFileSync with array args |
| `src/commands/install-mcp.js` | Atomic file write with temp+rename |
| `src/installer.js` | exec → execFile, added shell/config validation |

---

## Testing

- ✅ All 132 BATS tests pass
- ✅ All 12 Node.js tests pass
- ✅ No bash code modified

---

## Upgrade

```bash
npx agentvibes update
```

---

---

# Release v2.14.16 - Security Hardening & Dependency Updates

**Release Date:** 2025-12-02
**Type:** Patch Release (Security)

## AI Summary

AgentVibes v2.14.16 hardens repository security with Dependabot automated dependency updates, CodeQL security scanning, and fixes a moderate prototype pollution vulnerability in js-yaml. GitHub security features including Dependabot alerts and security updates are now enabled for the repository.

**Key Highlights:**
- 🔒 **Security Fix** - Updated js-yaml from 4.1.0 to 4.1.1 (fixes prototype pollution CVE)
- 🤖 **Dependabot** - Automated weekly dependency updates for npm, pip, and GitHub Actions
- 🔍 **CodeQL** - Security scanning for JavaScript and Python on every PR
- ✅ **Security Updates** - Enabled Dependabot alerts and automatic security PRs

---

# Release v2.14.15 - CI/CD Publish Workflow Fix

**Release Date:** 2025-12-01
**Type:** Patch Release (CI/CD Fix)

## AI Summary

AgentVibes v2.14.15 fixes the GitHub Actions "Publish to npm" workflow that was failing with E403 errors. The issue occurred because the `/release` command publishes to npm locally, then when GitHub Actions receives the tag push, it tried to publish again. This release adds version existence checking to the workflow - it now gracefully skips publishing if the version already exists on npm.

**Key Highlights:**
- 🔧 **Workflow Fix** - publish.yml now checks if version exists before attempting npm publish
- ✅ **Green Badges** - Prevents E403 "already published" errors from failing the workflow
- 🚀 **CI/CD** - Workflow skips publish step gracefully if version already on npm

---

# Release v2.14.14 - Test Suite Fixes & Affiliate Links

**Release Date:** 2025-12-01
**Type:** Patch Release (Bug Fix + Documentation)

## AI Summary

AgentVibes v2.14.14 fixes critical test suite failures that were blocking CI/CD pipelines. The root cause was the `voices-config.sh` refactoring for bash 3.2 (macOS) compatibility - it switched from associative arrays to functions, but some files still used the old syntax. Voice names with spaces like "Ralf Eisend" and "Cowboy Bob" caused syntax errors. This release also adds Piper TTS affiliate links and makes the `/release` command require passing tests before publishing.

**Key Highlights:**
- 🐛 **Test Fix** - Fixed syntax errors from voice names with spaces in bash
- 🧪 **CI/CD** - All 132 bats + 12 Node.js tests now pass
- 📚 **Release Safety** - `/release` command now requires tests to pass first
- 🔗 **Affiliate Links** - Piper TTS URLs updated to affiliate link

---

## Bug Fixes

### Voice Lookup Syntax Errors
**Files:** `.claude/hooks/play-tts-piper.sh`, `test/unit/personality-voice-mapping.bats`

The `voices-config.sh` was refactored to use functions (`get_voice_id()`) instead of associative arrays for bash 3.2 compatibility. However, two files still used the old `${VOICES[...]}` syntax:

```bash
# Before: Caused syntax errors with spaced names
if [[ -n "${VOICES[$VOICE_OVERRIDE]}" ]]; then
  VOICE_ID="${VOICES[$VOICE_OVERRIDE]}"
# Error: "syntax error in expression (error token is "Eisend")"
```

**Fix:** Updated to use the new function-based lookup:

```bash
# After: Works with all voice names
OVERRIDE_VOICE_ID=$(get_voice_id "$VOICE_OVERRIDE")
if [[ -n "$OVERRIDE_VOICE_ID" ]]; then
  VOICE_ID="$OVERRIDE_VOICE_ID"
```

---

## Documentation Updates

### Release Workflow Safety
**File:** `.claude/commands/release.md`

Added mandatory test suite execution as the first step of the release process. If any tests fail, the release is immediately aborted to prevent publishing broken code to npm.

### Piper TTS Affiliate Links
**Files:** `README.md`, `src/installer.js`, `mcp-server/docs/piper-setup.md`

Updated Piper TTS URLs to use affiliate link (`https://try.piper.io/agentvibes`) for sign-up references while keeping functional links (dashboard, pricing, privacy) pointing to their actual pages.

---

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/play-tts-piper.sh` | Fixed voice lookup to use `get_voice_id()` function |
| `test/unit/personality-voice-mapping.bats` | Fixed test assertions to use `get_voice_id()` function |
| `.claude/commands/release.md` | Added mandatory test requirement before release |
| `README.md` | Added Piper TTS affiliate links |
| `src/installer.js` | Added Piper TTS affiliate link to API key prompt |
| `mcp-server/docs/piper-setup.md` | Added Piper TTS affiliate link to setup guide |

---

## Upgrade

```bash
npx agentvibes update
```

---

---

# Release v2.14.13 - Free Providers as Default

**Release Date:** 2025-12-01
**Type:** Patch Release (Bug Fix)

## AI Summary

AgentVibes v2.14.13 changes the `--yes` flag behavior to always use free TTS providers by default. Previously, the installer would auto-select Piper TTS if an API key existed in the environment, but this caused failures when keys were expired or invalid. Now, macOS defaults to macOS Say and Linux defaults to Piper TTS. Users who want Piper TTS must run the installer without `--yes` to manually select it.

**Key Highlights:**
- 🆓 **Free-First Defaults** - `--yes` flag now always picks free providers
- 🍎 **macOS Default** - macOS Say (built-in, zero setup)
- 🐧 **Linux Default** - Piper TTS (free, offline)
- 🎤 **Piper TTS Manual** - Requires interactive selection (no more expired key failures)

---

## Bug Fixes

### Expired API Key Failures
**File:** `src/installer.js`

Previously, if `ELEVENLABS_API_KEY` existed in the environment, the `--yes` flag would auto-select Piper TTS even if the subscription was expired:

```javascript
// Before: Would fail silently with expired keys
if (options.yes) {
  if (process.env.ELEVENLABS_API_KEY) {
    return 'piper'; // Key might be expired!
  }
}
```

**Fix:** Free providers are now always the default with `--yes`:

```javascript
// After: Always works, free providers first
if (options.yes) {
  if (isMacOS) {
    return 'macos';  // Built-in, always works
  }
  return 'piper';    // Free, offline
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/installer.js` | Removed Piper TTS auto-detection with `--yes` flag |

---

## Upgrade

```bash
npx agentvibes update
```

---

---

# Release v2.14.12 - macOS Bash 3.2 Full Compatibility & MCP Config Installer

**Release Date:** 2025-12-01
**Type:** Patch Release (Bug Fix + Feature)

## AI Summary

AgentVibes v2.14.12 completes macOS Bash 3.2 compatibility by eliminating ALL `declare -A` associative arrays that caused errors on stock macOS. This fixes the critical bug where users saw `declare: -A: invalid option` errors. Additionally, the installer now offers to automatically create `.mcp.json` in your project directory, making MCP server setup one click instead of manual copy-paste.

**Key Highlights:**
- 🍎 **Full macOS Compatibility** - All `declare -A` associative arrays replaced with functions
- 🔧 **Fixed language-manager.sh** - `declare: -A: invalid option` error resolved
- 🔧 **Fixed voices-config.sh** - Piper TTS voice lookups now work on Bash 3.2
- 🔧 **Fixed voice-manager.sh** - Voice listing and preview commands fixed
- 📦 **MCP Config Installer** - Installer offers to create `.mcp.json` automatically
- 🍎 **macOS Default Provider** - Installer now defaults to macOS Say on Mac

---

## Bug Fixes

### Bash 3.2 Associative Array Compatibility (Critical)
**Files:** `language-manager.sh`, `voices-config.sh`, `voice-manager.sh`

macOS ships with Bash 3.2 (from 2007) which doesn't support `declare -A` associative arrays (added in Bash 4.0). This caused errors like:

```
declare: -A: invalid option
declare: usage: declare [-afFirtx] [-p] [name[=value] ...]
```

**Fix:** Replaced all associative arrays with function-based lookups using `case` statements:

```bash
# Before (Bash 4+ only):
declare -A ELEVENLABS_VOICES=(
    ["spanish"]="Antoni"
    ...
)
echo "${ELEVENLABS_VOICES[$lang]}"

# After (Bash 3.2 compatible):
_get_piper_voice() {
    case "$1" in
        spanish) echo "Antoni" ;;
        ...
    esac
}
_get_piper_voice "$lang"
```

### Fixed `local` Usage in For Loops
**File:** `language-manager.sh`

Bash 3.2 doesn't allow `local` declarations inside loops that aren't in functions:

```bash
# Before (fails on Bash 3.2):
for lang in ...; do
    local voice
    voice=$(_get_language_voice "$lang")
done

# After (works everywhere):
for lang in ...; do
    printf "%-15s → %s\n" "$lang" "$(_get_language_voice "$lang")"
done
```

---

## New Features

### Interactive MCP Config Creation
**File:** `src/installer.js`

The installer now offers to create `.mcp.json` in your project directory:

**Scenario 1: No config exists, user approves**
```
┌──────────────────────────────────────────────────────────┐
│  ✅ MCP Configuration Created!                           │
│                                                          │
│  Your .mcp.json has been created in this project.        │
│  To use AgentVibes MCP server with Claude, run:          │
│     claude --mcp-config .mcp.json                        │
└──────────────────────────────────────────────────────────┘
```

**Scenario 2: No config exists, user declines**
Shows full manual configuration instructions with copy-paste JSON.

**Scenario 3: Config already exists**
Shows instructions to manually add AgentVibes to existing `mcpServers`.

### macOS Say as Default Provider
**File:** `src/installer.js`

On macOS, the installer now:
- Lists macOS Say first (marked as "Recommended")
- Defaults to macOS Say instead of Piper
- Reduces friction for new Mac users (zero setup required)

---

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/language-manager.sh` | Replaced 3 `declare -A` with functions (+80/-85 lines) |
| `.claude/hooks/voices-config.sh` | Replaced VOICES array with `get_voice_id()` function |
| `.claude/hooks/voice-manager.sh` | Updated to use new function-based voice lookups |
| `src/installer.js` | Added `handleMcpConfiguration()` (+178/-58 lines) |

---

## Testing

- ✅ Verified on macOS Bash 3.2.57 (via SSH to cloud Mac)
- ✅ Verified on Linux Bash 5.x (WSL)
- ✅ All language commands work: `set`, `get`, `list`, `voice-for-language`
- ✅ Voice management commands work on macOS
- ✅ MCP config creation tested in fresh directories

---

## Upgrade

```bash
npx agentvibes update
```

Or for fresh install:
```bash
npx agentvibes install
```

---

---

# Release v2.14.11 - macOS SSH Audio Tunnel Support

**Release Date:** 2025-11-30
**Type:** Patch Release (Feature)

## AI Summary

AgentVibes v2.14.11 enables macOS TTS audio to play through remote Windows speakers when accessing a Mac via SSH. This is perfect for developers who don't own a Mac and want to test macOS functionality using cloud Mac instances (e.g., Scaleway). The `play-tts-macos.sh` script now auto-detects SSH sessions and uses PulseAudio's `paplay` to tunnel audio back to your local machine instead of playing locally with `afplay`.

**Key Highlights:**
- 🔊 **SSH Audio Tunneling** - macOS TTS now plays on Windows speakers when SSHed into Mac
- 🍎 **Cloud Mac Testing** - Test macOS features without owning a Mac (Scaleway recommended)
- 🎵 **SSH Login Greeting** - Hear "Connected to Mac OS" on login to confirm tunnel works
- 📖 **Full Documentation** - Step-by-step guide for SSH PulseAudio tunnel setup
- ✅ **Backwards Compatible** - Local Mac users unaffected (still uses `afplay`)

---

## New Features

### PulseAudio SSH Tunnel Support
**File:** `.claude/hooks/play-tts-macos.sh`

The macOS TTS provider now detects SSH sessions and automatically routes audio through PulseAudio tunnel:

```bash
# Auto-detection logic:
if [[ -n "$SSH_CONNECTION" ]] && [[ -n "$PULSE_SERVER" ]]; then
    # SSH session with tunnel → use paplay
    /opt/homebrew/bin/paplay "$TEMP_FILE"
else
    # Local session → use native afplay
    afplay "$TEMP_FILE"
fi
```

**Use Case:** SSH into a cloud Mac (e.g., Scaleway), run Claude with AgentVibes, hear TTS on your Windows speakers.

### SSH Audio Greeting Script
**File:** `scripts/macos-ssh-audio-greeting.zsh`

Plays "Connected to Mac OS" through your Windows speakers when you SSH into the Mac, confirming the audio tunnel is working:

```zsh
# Add to ~/.zshrc on Mac:
source ~/macos-ssh-audio-greeting.zsh
```

### Audio Test Script
**File:** `scripts/test-macos-audio.sh`

Manual test script to verify the PulseAudio tunnel:

```bash
~/test-macos-audio.sh
# Output: "Success! You are hearing this from the Mac, playing on Windows speakers."
```

---

## Documentation

### New Guide: macOS PulseAudio Remote Tunnel
**File:** `docs/MACOS_PULSEAUDIO_REMOTE_TUNNEL.md`

Comprehensive guide covering:
- Why: Test macOS without owning a Mac (cloud Mac instances)
- Architecture: SSH RemoteForward tunneling PulseAudio
- WSL Setup: SSH config with ControlMaster for multiple sessions
- macOS Setup: Install PulseAudio, greeting script, test script
- AgentVibes Integration: How play-tts-macos.sh detects SSH
- Troubleshooting: Port conflicts, no audio, connection refused

---

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/play-tts-macos.sh` | Added SSH detection, paplay support (+18 lines) |
| `scripts/macos-ssh-audio-greeting.zsh` | New: ZSH greeting script for SSH login |
| `scripts/macos-ssh-audio-greeting.sh` | New: Bash version of greeting script |
| `scripts/test-macos-audio.sh` | New: Manual audio tunnel test script |
| `docs/MACOS_PULSEAUDIO_REMOTE_TUNNEL.md` | New: Full setup guide (415 lines) |

---

## How It Works

```
┌─────────────────┐         SSH Tunnel          ┌─────────────────┐
│  Windows WSL    │ ─────────────────────────── │  Cloud macOS    │
│  (You are here) │   RemoteForward 14714       │  (e.g. Scaleway)│
│                 │                              │                 │
│ PulseAudio      │◄────────────────────────────│  say → paplay   │
│ Server :14714   │     Audio streams back      │  sends audio    │
│                 │                              │                 │
│ 🔊 Speakers     │                              │  AgentVibes TTS │
└─────────────────┘                              └─────────────────┘
```

1. Windows WSL runs PulseAudio server on port 14714
2. SSH `RemoteForward` makes WSL port available as `localhost:14714` on Mac
3. macOS `say` generates audio, `paplay` sends it through tunnel
4. Audio plays on your Windows speakers!

---

## Testing

- Verified SSH tunnel audio on Scaleway Mac Mini M1
- Confirmed backwards compatibility (local Mac still uses afplay)
- Tested multiple SSH sessions with ControlMaster

---

## Upgrade

```bash
npx agentvibes update
```

Or for fresh install:
```bash
npx agentvibes install
```

---

---

# Release v2.14.10 - macOS Bash 3.2 Compatibility Fix

**Release Date:** 2025-11-30
**Type:** Patch Release (Bug Fix)

## AI Summary

AgentVibes v2.14.10 fixes critical bash compatibility issues affecting all macOS users. The voice-manager.sh and related scripts were using `${var,,}` lowercase syntax which only works in bash 4.0+, but macOS ships with bash 3.2 by default. This caused "bad substitution" errors when switching voices. Additionally, the installer now detects existing Piper voice models and skips the download prompt on reinstalls.

**Key Highlights:**
- 🍎 **macOS Compatibility** - Fixed bash 3.2 compatibility for all voice scripts
- 🔧 **No More "bad substitution"** - Replaced `${var,,}` with POSIX-compatible `tr` commands
- ⚡ **Smarter Reinstalls** - Installer detects existing Piper voices and skips download prompt
- ✅ **All 132 Tests Pass** - Full test suite validated

---

## Bug Fixes

### Bash 3.2 Compatibility (Issue #54)
**Files:** `voice-manager.sh`, `piper-multispeaker-registry.sh`, `learn-manager.sh`

macOS ships with bash 3.2 (from 2007) due to GPL licensing. The `${var,,}` lowercase conversion syntax requires bash 4.0+, causing errors like:

```
/Volumes/.../voices-config.sh: line 428: ${voice,,}: bad substitution
```

**Fix:** Added `to_lower()` helper function using POSIX-compatible `tr`:

```bash
# Before (bash 4+ only):
if [[ "${voice,,}" == "${VOICE_NAME,,}" ]]; then

# After (bash 3.2 compatible):
to_lower() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}
if [[ "$(to_lower "$voice")" == "$(to_lower "$VOICE_NAME")" ]]; then
```

### Installer Detects Existing Piper Voices (Issue #53)
**File:** `src/installer.js`

The installer now checks if Piper voice models already exist before prompting for download location:

**Before (every reinstall):**
```
Where should Piper voice models be downloaded? (~/.claude/piper-voices)
```

**After (when voices exist):**
```
✓ Piper voices already installed at /Users/user/.claude/piper-voices
   Found 6 voice model(s):
     • en_US-lessac-medium
     • en_US-amy-medium
     • en_US-joe-medium
     ...

✓ Skipping download - using existing voices
```

---

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/voice-manager.sh` | Added `to_lower()` function, replaced 2 `${,,}` usages |
| `.claude/hooks/piper-multispeaker-registry.sh` | Added `_to_lower()` function, replaced 2 `${,,}` usages |
| `.claude/hooks/learn-manager.sh` | Added `_to_lower()` function, replaced 2 `${,,}` usages |
| `src/installer.js` | Added `checkExistingPiperVoices()` function (+42 lines) |

---

## Testing

- All 132 unit tests pass
- Verified bash 3.2 syntax compatibility
- Tested voice switching on macOS

---

## Related Issues

- [Issue #53](https://github.com/paulpreibisch/AgentVibes/issues/53) - Installer should detect existing Piper voice models
- [Issue #54](https://github.com/paulpreibisch/AgentVibes/issues/54) - Bash 3.2 compatibility fix

---

## Upgrade

```bash
npx agentvibes@latest update
```

Or for fresh install:

```bash
npx agentvibes@latest install
```
