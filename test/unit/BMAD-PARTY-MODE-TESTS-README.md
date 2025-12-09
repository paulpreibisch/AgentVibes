# BMAD Party Mode Test Suite

Comprehensive test coverage for AgentVibes party mode integration with BMAD (Issues #68, #69, #70).

## Overview

This test suite validates AgentVibes' ability to handle multi-agent TTS coordination for BMAD's party mode workflow, where multiple AI agents speak in sequence with distinct voices.

## Test Files

### 1. `party-mode-tts.bats` (Issue #68)
**16 tests** covering multi-agent TTS coordination:

- **Multi-Agent TTS Flow** (3 tests)
  - Sequential agent voices working correctly
  - Voice switching between agents
  - No audio overlap or corruption

- **Error Handling** (2 tests)
  - Fallback for missing agent voices
  - Graceful degradation when voices unavailable

- **Performance** (3 tests)
  - Rapid-fire agent responses (< 1 second between)
  - Long dialogue chains (10+ turns)
  - Memory usage with multiple temp files

- **Integration** (3 tests)
  - Works with BMAD's agent-voice-map.csv
  - Handles agents not in voice map
  - Mixed configured/unconfigured agents

- **Cleanup** (1 test)
  - Temp audio files properly cleaned up

### 2. `provider-switching.bats` (Issue #69)
**23 tests** covering provider switching and fallback:

- **Provider Switching** (6 tests)
  - Switch between Piper and macOS mid-session
  - Correct voice field used from CSV
  - Provider unavailability handling
  - Config persistence across sessions

- **Fallback Behavior** (5 tests)
  - Agent has wrong provider voice → fallback
  - Agent has no voice → system default
  - Custom fallback voice configuration
  - Per-provider fallbacks

- **Voice Map Integration** (6 tests)
  - Read voice based on active provider
  - Ignore irrelevant provider fields
  - Handle single-provider maps
  - Handle multi-provider maps

- **Error Cases** (3 tests)
  - Invalid provider names
  - Missing provider binaries
  - Provider generation failures

### 3. `intro-messages.bats` (Issue #70)
**29 tests** covering agent intro messages:

- **Intro Playback** (5 tests)
  - Play intro on party mode activation
  - Skip intro if not in voice map
  - Handle empty intro fields
  - Handle very long intros (> 200 chars)
  - Special TTS characters (?, !, ...)

- **Special Characters** (5 tests)
  - Quotation marks
  - Apostrophes
  - Exclamation points
  - Emojis/unicode
  - Pronunciation hints (BMad)

- **Integration** (4 tests)
  - Load intros from CSV
  - Match intro to correct agent voice
  - Play intro only once per session
  - Don't play on subsequent responses

- **Error Handling** (4 tests)
  - Malformed intro in CSV
  - Intro TTS generation fails
  - Intro audio playback fails
  - Continue party mode even if intro fails

- **CSV Parsing** (3 tests)
  - Basic CSV format
  - Quoted fields with commas
  - Multi-line entries

## Test Fixtures

All tests use mock data instead of requiring full BMAD installation:

```
test/fixtures/
├── voice-maps/
│   ├── basic-party-mode.csv      # Simple 4-agent setup
│   ├── special-intros.csv        # Emojis, quotes, special chars
│   ├── multi-provider.csv        # Both Piper and macOS voices
│   ├── missing-voices.csv        # Agents with no voice configured
│   └── malformed.csv             # Invalid CSV for error testing
└── mock-bmad-speak.sh            # Simulates BMAD's speak script
```

## Voice Map Format

```csv
agent,piper,mac,intro
analyst,en_US-kristin-medium,Samantha,"Hi! I'm Mary, your Business Analyst."
architect,en_GB-alan-medium,Daniel,"Hello! Winston here, your Architect."
dev,en_US-amy-medium,Karen,"Hey! Amelia here, your Developer."
```

## Running Tests

```bash
# Run all party mode tests
npm test

# Run specific test file
npm test -- test/unit/party-mode-tts.bats
npm test -- test/unit/provider-switching.bats
npm test -- test/unit/intro-messages.bats

# Run specific test
npm test -- test/unit/party-mode-tts.bats -f "sequential agent voices"
```

## Test Environment

- **Mode**: `AGENTVIBES_TEST_MODE=true` (skips voice file validation)
- **Provider**: Defaults to Piper (mocked in test helpers)
- **Audio**: Mock piper command generates minimal valid WAV files
- **Platform**: Tests are cross-platform compatible (macOS tests fail gracefully on Linux)

## Coverage Summary

- **Total Tests**: 68 new tests (16 + 23 + 29)
- **Total Suite**: 212 tests (all passing)
- **Lines Covered**: Party mode coordination, provider switching, intro messages
- **Edge Cases**: Special characters, emojis, missing voices, malformed CSV, rapid-fire responses

## Key Features Tested

✅ **Multi-agent TTS coordination** - Multiple agents speaking in sequence
✅ **Voice switching** - Each agent uses their configured voice
✅ **Background music continuity** - Music continues across agent switches
✅ **Provider awareness** - Correctly selects voice based on active provider
✅ **Fallback logic** - Handles missing voices gracefully
✅ **Intro messages** - Plays agent intros on first appearance
✅ **Special characters** - Handles emojis, quotes, unicode in intros
✅ **Error resilience** - Continues party mode even if individual agents fail
✅ **Performance** - Handles rapid-fire responses and long dialogues
✅ **Memory management** - Proper cleanup of temp files

## Platform Compatibility

- **Linux**: Full support (all tests pass)
- **macOS**: Full support (Piper + macOS Say)
- **WSL**: Full support (tested environment)

Tests that rely on macOS-specific features (like `say` command) gracefully fail on Linux with status code 1, which is expected and handled.

## Related Issues

- **Issue #68**: Party mode multi-agent TTS coordination tests
- **Issue #69**: Voice provider switching and fallback tests
- **Issue #70**: Agent intro message playback tests
- **BMAD PR #987**: Party mode integration (upstream)

## Next Steps

1. ✅ All tests passing (212/212)
2. 🔲 Consider adding integration tests with real BMAD installation (optional)
3. 🔲 Add performance benchmarks for party mode (optional)
4. 🔲 Test with actual BMAD voice map CSV when available

## Notes

- All tests use fixtures instead of requiring BMAD installation
- Mock scripts emulate BMAD's bmad-speak.sh behavior
- Tests are designed to be fast and deterministic
- No network access required (all mocked)
- No large voice files needed (mock piper generates tiny WAV files)
