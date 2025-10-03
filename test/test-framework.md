# AgentVibes Testing Strategy

## Overview

AgentVibes uses **BATS (Bash Automated Testing System)** for testing bash scripts and commands.

## Test Structure

```
test/
├── unit/                    # Unit tests for individual scripts
│   ├── voice-manager.bats
│   ├── personality-manager.bats
│   ├── sentiment-manager.bats
│   └── play-tts.bats
├── integration/            # Integration tests for commands
│   ├── switch-voice.bats
│   ├── personality.bats
│   └── sentiment.bats
├── fixtures/               # Test data and mocks
│   ├── mock-voices.sh
│   ├── mock-elevenlabs-api.sh
│   └── test-personalities/
└── helpers/                # Test utilities
    └── test-helper.bash

```

## Testing Philosophy

1. **Mock External Dependencies**: Don't call real ElevenLabs API in tests
2. **Test Each Script in Isolation**: Use mocks for dependencies
3. **Verify Side Effects**: Check file writes, TTS calls, output messages
4. **Test Error Paths**: Invalid inputs, missing files, API failures
5. **CI/CD Integration**: Run on every push and PR

## What to Test

### voice-manager.sh
- ✅ List all voices
- ✅ Switch voice by name
- ✅ Switch voice by number
- ✅ Get current voice
- ✅ Silent mode (--silent flag)
- ✅ Preview voice
- ✅ Replay audio
- ✅ whoami command
- ❌ Invalid voice names
- ❌ Missing voice file

### personality-manager.sh
- ✅ List personalities
- ✅ Set personality
- ✅ Get current personality
- ✅ Add custom personality
- ✅ Edit personality
- ✅ Reset to normal
- ✅ Silent voice switch (no double audio)
- ❌ Invalid personality names
- ❌ Missing personality files

### sentiment-manager.sh
- ✅ List sentiments
- ✅ Set sentiment
- ✅ Get current sentiment
- ✅ Clear sentiment
- ❌ Invalid sentiment names

### play-tts.sh
- ✅ Generate TTS audio
- ✅ Save to correct directory (project-local vs global)
- ✅ Handle voice override
- ✅ Truncate long text
- ✅ Use pretext configuration
- ❌ Missing API key
- ❌ API failures

## CI/CD Pipeline

GitHub Actions workflow will:
1. Install BATS
2. Set up test environment
3. Mock ElevenLabs API
4. Run unit tests
5. Run integration tests
6. Report coverage
7. Fail PR if tests don't pass

## Running Tests Locally

```bash
# Install BATS
npm install -g bats

# Run all tests
npm test

# Run specific test file
bats test/unit/voice-manager.bats

# Run with verbose output
bats -t test/unit/voice-manager.bats
```

## Mock Strategy

**ElevenLabs API Mock:**
- Intercept curl calls to api.elevenlabs.io
- Return fake MP3 data
- No actual API charges during tests

**Voice Configuration Mock:**
- Use test-specific voice files
- Isolated from real user config
- Clean up after tests

**Audio Playback Mock:**
- Replace paplay/aplay with no-op
- Verify TTS was called with correct text
- No actual audio playback during tests
