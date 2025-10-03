# AgentVibes Test Suite

## Overview

AgentVibes uses **BATS (Bash Automated Testing System)** for comprehensive testing without calling real ElevenLabs API or playing audio.

## Quick Start

```bash
# Install BATS (Ubuntu/Debian)
sudo apt-get install bats

# Or via npm
npm install -g bats

# Run all tests
npm test

# Run with verbose output
npm run test:verbose
```

## Test Architecture

### Mocked Dependencies

**No API Calls:**
- `curl` is mocked to return silent test MP3 files
- No actual ElevenLabs API requests
- No token usage during testing

**No Audio Playback:**
- `paplay`, `aplay`, `mpg123` are all mocked
- Tests run silently without audio output
- Verifies TTS calls without playing sound

**Isolated Environment:**
- Tests run in temporary directories
- No interference with real user config
- Clean slate for each test

### Test Coverage

#### voice-manager.sh (9 tests)
- ✅ List all voices
- ✅ Switch voice by name/number
- ✅ Get current voice
- ✅ Silent mode (--silent flag)
- ✅ whoami command
- ❌ Invalid voice handling
- ❌ Error cases

#### personality-manager.sh (10 tests)
- ✅ List/set/get/reset personalities
- ✅ Add/edit custom personalities
- ✅ Silent voice switching (no double audio)
- ✅ Assigned voice handling
- ❌ Invalid personality handling
- ❌ Missing file errors

#### play-tts.sh (7 tests)
- ✅ Audio file generation
- ✅ Project-local vs global directory
- ✅ Voice override
- ✅ Text truncation
- ❌ Missing API key
- ❌ Missing arguments

**Total: 26+ tests** covering all core functionality

## CI/CD Integration

Tests run automatically on:
- Every push to `master` or `v1` branches
- Every pull request
- Via GitHub Actions workflow

**Workflow:** `.github/workflows/test.yml`

## Running Tests Locally

```bash
# All tests
npm test

# Specific test file
bats test/unit/voice-manager.bats

# With timestamps and verbose output
bats -t test/unit/voice-manager.bats

# Individual test by line number
bats -f "voice-manager list" test/unit/voice-manager.bats
```

## Adding New Tests

1. Create or edit `.bats` file in `test/unit/`
2. Use test helpers from `test/helpers/test-helper.bash`
3. Follow existing patterns:

```bash
@test "descriptive test name" {
  # Arrange
  setup_test_env

  # Act
  run "$SCRIPT" arguments

  # Assert
  [ "$status" -eq 0 ]
  assert_output_contains "expected output"
}
```

## Test Helpers

Available helpers from `test/helpers/test-helper.bash`:

- `setup_test_env()` - Create isolated test environment
- `teardown_test_env()` - Clean up after tests
- `mock_curl()` - Mock ElevenLabs API
- `mock_audio_players()` - Mock audio playback
- `setup_agentvibes_scripts()` - Copy scripts to test location
- `create_test_personality()` - Create test personality files
- `assert_file_exists()` - Verify file exists
- `assert_file_contains()` - Verify file content
- `assert_output_contains()` - Verify command output

## Silent Test Audio

The mocked `curl` returns a minimal valid MP3 file:
- Valid MP3 format (passes file validation)
- Essentially silent (no annoying playback)
- Tiny file size (~500 bytes)
- No API token usage

## Why BATS?

- **Bash Native:** Tests bash scripts in their natural environment
- **Simple Syntax:** Easy to read and write
- **Fast:** Runs quickly without heavy frameworks
- **CI-Friendly:** Works great in GitHub Actions
- **Widely Used:** Standard for bash testing

## Troubleshooting

**Tests fail with "command not found":**
```bash
sudo apt-get install bats
```

**Permissions errors:**
```bash
chmod +x .claude/hooks/*.sh
```

**Mock not working:**
- Check `$PATH` includes test mocks
- Verify helper functions are sourced

## Future Improvements

- [ ] Integration tests for slash commands
- [ ] Coverage reporting
- [ ] Performance benchmarks
- [ ] Test all 17 voices
- [ ] Test all personality types
