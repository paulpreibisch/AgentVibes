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

## 📝 Recent Commits

```
(to be filled after commit)
```

---

## Upgrade

```bash
npx agentvibes@latest update
```

Or for fresh install:

```bash
npx agentvibes@latest install
```
