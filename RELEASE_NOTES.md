# Release v2.14.13 - Free Providers as Default

**Release Date:** 2025-12-01
**Type:** Patch Release (Bug Fix)

## AI Summary

AgentVibes v2.14.13 changes the `--yes` flag behavior to always use free TTS providers by default. Previously, the installer would auto-select ElevenLabs if an API key existed in the environment, but this caused failures when keys were expired or invalid. Now, macOS defaults to macOS Say and Linux defaults to Piper TTS. Users who want ElevenLabs must run the installer without `--yes` to manually select it.

**Key Highlights:**
- 🆓 **Free-First Defaults** - `--yes` flag now always picks free providers
- 🍎 **macOS Default** - macOS Say (built-in, zero setup)
- 🐧 **Linux Default** - Piper TTS (free, offline)
- 🎤 **ElevenLabs Manual** - Requires interactive selection (no more expired key failures)

---

## Bug Fixes

### Expired API Key Failures
**File:** `src/installer.js`

Previously, if `ELEVENLABS_API_KEY` existed in the environment, the `--yes` flag would auto-select ElevenLabs even if the subscription was expired:

```javascript
// Before: Would fail silently with expired keys
if (options.yes) {
  if (process.env.ELEVENLABS_API_KEY) {
    return 'elevenlabs'; // Key might be expired!
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
| `src/installer.js` | Removed ElevenLabs auto-detection with `--yes` flag |

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
- 🔧 **Fixed voices-config.sh** - ElevenLabs voice lookups now work on Bash 3.2
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
_get_elevenlabs_voice() {
    case "$1" in
        spanish) echo "Antoni" ;;
        ...
    esac
}
_get_elevenlabs_voice "$lang"
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
