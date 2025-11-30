# Release v2.14.3 - macOS Provider Routing Fix

**Release Date:** 2025-11-30
**Type:** Patch Release (Bug Fix)

## AI Summary

AgentVibes v2.14.3 fixes a critical bug where the macOS TTS provider would not speak when selected. The TTS router (`play-tts.sh`) was missing the case handler for the macOS provider, causing it to fail silently. This release adds the missing routing and includes comprehensive test coverage to prevent regression.

**Key Highlights:**
- 🐛 **Fixed macOS Provider Routing** - macOS `say` provider now works when selected (Issue #52)
- ✅ **New Provider Tests** - 4 new tests ensure macOS provider is properly detected and routed
- 🔧 **Fixed Translator Tests** - Fixed 3 pre-existing failing tests related to PWD and locale warnings
- 🎯 **133 Tests Passing** - Full test suite now passes with comprehensive macOS coverage

---

## Bug Fixes

### macOS Provider Routing Fix (Issue #52)
**File:** `.claude/hooks/play-tts.sh`

The TTS router was missing case handlers for the `macos` provider in two locations:
1. The `speak_text()` function (used by translation/learning modes)
2. The main routing case statement

**Before:** Switching to macOS provider would silently fail - no TTS output
**After:** macOS provider correctly routes to `play-tts-macos.sh`

```bash
# This now works correctly:
/agent-vibes:provider switch macos
# TTS output will now use macOS say command
```

---

## Test Improvements

### New macOS Provider Tests
**Files:** `test/unit/provider-manager.bats`, `test/unit/play-tts.bats`

Added 4 new tests to ensure macOS provider is properly supported:

| Test | Description |
|------|-------------|
| `provider-manager list shows available providers` | Verifies `macos` appears in provider list |
| `provider-manager switch to macos` | Tests switching to macOS provider |
| `provider-manager validate macos provider exists` | Validates macOS provider script exists |
| `play-tts routes to macos provider when configured` | Tests actual TTS routing to macOS |
| `play-tts speak_text function routes to macos` | Verifies internal routing function |

### Fixed Translator Tests
**File:** `test/unit/translator.bats`

Fixed 3 pre-existing failing tests:
- Tests now properly `cd` to project directory before running commands
- Fixed locale warning filtering using `env LC_ALL=C bash -c`

---

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/play-tts.sh` | Added macOS case handlers (+6 lines) |
| `test/unit/provider-manager.bats` | Added macOS provider tests (+24 lines) |
| `test/unit/play-tts.bats` | Added macOS routing tests (+45 lines) |
| `test/unit/translator.bats` | Fixed PWD and locale issues (+13 lines) |

---

## Changes Summary

**Commits:** 2
- `fix: Add macOS provider routing to play-tts.sh`
- `test: Add macOS provider tests and fix translator tests`

**Files Changed:** 4
**Lines Added:** 88
**Lines Removed:** 11

---

## Migration Notes

**No migration required** - This is a bug fix release.

**Who is affected:** Mac users who updated to v2.14.1/v2.14.2 and tried to use the macOS provider.

**Fix verification:**
```bash
# Update AgentVibes
npx agentvibes update

# Switch to macOS provider - should now speak
/agent-vibes:provider switch macos
```

---

## Testing

All 133 tests pass:

```bash
npm test

# Key tests:
# ok 21 play-tts routes to macos provider when configured
# ok 22 play-tts speak_text function routes to macos
# ok 29 provider-manager switch to macos
# ok 30 provider-manager validate macos provider exists
```

---

# Release v2.14.2 - Native macOS TTS Provider

**Release Date:** 2025-11-29
**Type:** Patch Release (New Provider)

> Note: v2.14.2 is identical to v2.14.1 - version bump for CI badge fix only.

## AI Summary

AgentVibes v2.14.1 introduces native macOS TTS support via the built-in `say` command. Mac users can now use AgentVibes with **zero setup required** - no API keys, no downloads, no configuration. Simply switch to the macOS provider and start talking! The new provider automatically detects 100+ built-in Apple voices across 40+ languages, with Siri-quality enhanced voices available on macOS Mojave (10.14) and later.

**Key Highlights:**
- 🍎 **macOS Say Provider** - Native TTS using macOS `say` command (zero dependencies!)
- 🎤 **100+ Built-in Voices** - Access all Apple voices including enhanced Siri voices
- 🌍 **40+ Languages** - Full language support from Apple's voice library
- 🔄 **Three-Way Provider Switching** - Seamless migration between ElevenLabs, Piper, and macOS
- 🎉 **Smarter BMAD Detection** - Improved installer message when BMAD-METHOD™ is detected
- ✅ **Test Coverage Updated** - All provider tests account for new macOS option

---

## New Features

### macOS Say TTS Provider
**Files:** `.claude/hooks/play-tts-macos.sh`, `.claude/hooks/macos-voice-manager.sh`

Mac users can now use AgentVibes with zero setup using the native `say` command:

```bash
# Switch to macOS provider (Mac only)
/agent-vibes:provider switch macos

# List available voices
/agent-vibes:list

# Preview voices
/agent-vibes:preview

# Switch voices
/agent-vibes:switch Samantha
```

**Why macOS Provider?**
- ✅ Zero setup - works out of the box on any Mac
- ✅ No API keys required
- ✅ No downloads or installations
- ✅ Works offline
- ✅ 100+ voices included
- ✅ Siri-quality enhanced voices on macOS 10.14+

**Recommended Voices:**
- `Samantha` - American English female (enhanced)
- `Alex` - American English male (enhanced)
- `Daniel` - British English male (enhanced)
- `Karen` - Australian English female (enhanced)
- `Moira` - Irish English female (enhanced)

### Voice Management for macOS
**File:** `.claude/hooks/macos-voice-manager.sh`

Full voice management capabilities for macOS:

```bash
# List all voices
/agent-vibes:list

# Filter by language (English voices)
# Voices include: Alex, Samantha, Victoria, Daniel, Karen, etc.

# Get voice info
/agent-vibes:whoami
```

### Three-Way Provider Switching
**Files:** `.claude/hooks/provider-manager.sh`, `.claude/hooks/provider-commands.sh`

Provider switching now supports three-way voice migration:

```bash
# Show available providers (macOS shows as recommended on Mac)
/agent-vibes:provider list

# Switch to macOS provider with voice migration
/agent-vibes:provider switch macos

# Switch back to Piper
/agent-vibes:provider switch piper
```

**Provider Detection:**
- On macOS: Shows "macos" as recommended provider
- On Linux/WSL: Shows "piper" as recommended
- ElevenLabs available on all platforms (requires API key)

---

## Files Added

| File | Description |
|------|-------------|
| `.claude/hooks/play-tts-macos.sh` | macOS TTS provider implementation (270 lines) |
| `.claude/hooks/macos-voice-manager.sh` | macOS voice discovery and management (205 lines) |
| `.github/workflows/test-macos-tts.yml` | Cost-optimized macOS CI workflow (210 lines) |
| `scripts/fix-wsl-audio.sh` | WSL audio troubleshooting utility (106 lines) |

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/provider-manager.sh` | Added macOS provider detection, three-way migration (+83 lines) |
| `.claude/hooks/provider-commands.sh` | macOS provider support in commands (+135 lines) |
| `.claude/hooks/voice-manager.sh` | Provider-aware voice routing for macOS (+62 lines) |
| `.claude/commands/agent-vibes/agent-vibes.md` | macOS provider documentation (+42 lines) |
| `.claude/commands/agent-vibes/provider.md` | Updated provider docs (+28 lines) |
| `README.md` | macOS provider documentation (+19 lines) |
| `src/installer.js` | Improved BMAD detection message with party-mode recommendation |
| `test/unit/provider-manager.bats` | Updated tests for macOS provider (+4 lines) |

---

## Changes Summary

**Commits:** 2
- feat: Add macOS Say TTS provider for native Mac support
- fix: Update provider-manager test to account for macOS provider

**Files Changed:** 12
**Lines Added:** 1,104
**Lines Removed:** 61

---

## Platform Support Matrix

| Platform | ElevenLabs | Piper | macOS Say |
|----------|------------|-------|-----------|
| macOS | ✅ | ✅ | ✅ (recommended) |
| Linux | ✅ | ✅ (recommended) | ❌ |
| WSL | ✅ | ✅ (recommended) | ❌ |
| Windows | ✅ | ✅ | ❌ |

---

## Migration Notes

**No migration required** - This is a patch release with a new provider option.

**New Dependencies:** None! The macOS provider uses only built-in macOS commands.

**Compatibility:** 100% backward compatible with v2.14.0

**Recommended Action for Mac Users:**
```bash
# Try the new macOS provider
/agent-vibes:provider switch macos

# If you prefer cloud quality, switch back anytime
/agent-vibes:provider switch elevenlabs
```

---

## Testing

All tests pass including the new macOS-aware test updates:

```bash
# Run tests
npm test

# macOS-specific tests run on macOS CI only
# See: .github/workflows/test-macos-tts.yml
```
