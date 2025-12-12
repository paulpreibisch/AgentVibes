# AgentVibes Lite Mode Testing Guide

## Overview

This document provides comprehensive testing for AgentVibes Lite Mode, ensuring that TTS audio is actually being generated correctly.

## Test Scripts

### 1. Automated Test Suite (`test-lite-mode-audio.sh`)

**Purpose:** Validates lite mode logic without actually playing audio

**Features:**
- ✅ Audio Summary extraction from Claude responses
- ✅ Smart verbosity (simplifies to "Done" for responses <200 tokens)
- ✅ Skip TTS for very short responses (<50 tokens)
- ✅ Skip responses without Audio Summary marker
- ✅ TTS engine availability detection
- ✅ Test mode with file output for verification

**Usage:**
```bash
./test-lite-mode-audio.sh
```

**Output:**
Saves test TTS text to `/tmp/agentvibes-lite-test.txt` for verification.

### 2. Live Audio Test (`test-lite-mode-live-audio.sh`)

**Purpose:** Tests actual audio playback - you should HEAR the TTS

**Features:**
- 🔊 Plays actual TTS audio through system speaker
- ✅ Tests long responses (>200 tokens) → Full audio summary
- ✅ Tests short responses (<200 tokens) → Simplified to "Done"
- ✅ Verifies TTS engine integration (say, espeak, spd-say, or play-tts.sh)

**Usage:**
```bash
./test-lite-mode-live-audio.sh
```

**What You Should Hear:**
1. First test: "Updated configuration with new TTS settings and personality profile."
2. Second test: "Done"

## How Lite Mode Works

### Architecture

```
Claude Response
    ↓
Contains "**Audio Summary:** [text]"?
    ↓ Yes
Token count check
    ↓
< 50 tokens → Skip TTS
50-200 tokens → Say "Done"
> 200 tokens → Say full audio summary
    ↓
TTS Engine (say / espeak / spd-say / play-tts.sh)
    ↓
Audio Output 🔊
```

### Post-Tool-Use Hook

The lite mode hook (`.agentvibes/hooks/post-tool-use-lite.sh`) includes a test mode:

```bash
# Enable test mode
export AGENTVIBES_TEST_AUDIO=true
export AGENTVIBES_TEST_AUDIO_FILE="/tmp/agentvibes-lite-test.txt"

# Run hook
bash .agentvibes/hooks/post-tool-use-lite.sh
```

**Test mode behavior:**
- Logs TTS text to file instead of playing
- Includes timestamp for debugging
- Allows verification without audio playback

**Normal mode behavior:**
- Calls TTS engine directly (say, espeak, etc.)
- Runs in background (non-blocking)
- Silent operation (no stdout/stderr noise)

## Testing Checklist

- [x] Audio Summary extraction works correctly
- [x] Markdown formatting (`**`) removed from extracted text
- [x] Token counting accurately determines response length
- [x] Short responses (<200 tokens) simplified to "Done"
- [x] Very short responses (<50 tokens) skipped
- [x] Responses without Audio Summary marker skipped
- [x] TTS engine available (say, espeak, spd-say, or play-tts.sh)
- [x] Test mode saves output to file
- [x] Live mode plays actual audio
- [x] Mode switching (lite ↔ full) works correctly
- [x] Wrapper hooks delegate to correct implementation

## Verification Steps

### Step 1: Run Automated Tests

```bash
./test-lite-mode-audio.sh
```

Expected output:
```
✓ Audio Summary extraction working
✓ Smart verbosity (Done for short responses)
✓ Skip TTS for very short responses
✓ Skip responses without Audio Summary marker
✓ TTS engine available
All tests passed!
```

### Step 2: Run Live Audio Test

```bash
./test-lite-mode-live-audio.sh
```

Expected:
- You should HEAR two TTS messages
- First: Full audio summary
- Second: "Done"

### Step 3: Test in Real Claude Session

1. Start a new Claude Code session
2. Say something like: "Hello, how are you?"
3. Wait for response
4. You should hear TTS audio at the end

### Step 4: Verify Mode Switching

```bash
# Switch to full mode
bash .agentvibes/hooks/switch-mode.sh full

# Verify mode file
cat .agentvibes/config/mode.txt
# Should show: full

# Switch back to lite
bash .agentvibes/hooks/switch-mode.sh lite

# Verify again
cat .agentvibes/config/mode.txt
# Should show: lite
```

## Troubleshooting

### No Audio Playing

**CRITICAL: Check PostToolUse hook has matcher field:**

The PostToolUse hook requires a `matcher` field in `.claude/settings.json`:

```json
"PostToolUse": [
  {
    "matcher": "*",  // THIS IS REQUIRED!
    "hooks": [
      {
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-tool-use.sh"
      }
    ]
  }
]
```

Without the `matcher` field, the hook will **never trigger**. Use `"matcher": "*"` to match all tools.

**Check TTS engine:**
```bash
command -v say || command -v espeak || command -v spd-say || ls .claude/hooks/play-tts.sh
```

**Test TTS directly:**
```bash
# macOS
say "Test audio"

# Linux
espeak "Test audio"
# OR
spd-say "Test audio"
```

### Audio Summary Not Extracted

**Check for marker in response:**
```bash
echo "$CLAUDE_LAST_MESSAGE" | grep -i "Audio Summary:"
```

**Test extraction manually:**
```bash
export CLAUDE_LAST_MESSAGE="Test response.

**Audio Summary:** This is a test."

bash .agentvibes/hooks/post-tool-use-lite.sh
```

### Test Mode Not Working

**Verify environment variables:**
```bash
export AGENTVIBES_TEST_AUDIO=true
export AGENTVIBES_TEST_AUDIO_FILE="/tmp/test.txt"

# Check they're set
echo $AGENTVIBES_TEST_AUDIO
echo $AGENTVIBES_TEST_AUDIO_FILE
```

## Integration Tests

### Test 1: Fresh Installation

```bash
# Install AgentVibes
npx agentvibes install

# Select lite mode during installation
# Start Claude session
# Verify TTS works
```

### Test 2: Mode Switching

```bash
# Install in full mode
# Switch to lite
/agent-vibes:mode lite

# Restart Claude session
# Verify lite mode TTS works

# Switch back to full
/agent-vibes:mode full

# Restart Claude session
# Verify full mode TTS works
```

### Test 3: Parallel Sessions

```bash
# Start multiple Claude sessions
# Each should have independent TTS
# Lite mode perfect for this use case
```

## Performance Benchmarks

| Metric | Lite Mode | Full Mode |
|--------|-----------|-----------|
| Session overhead | ~50 tokens | ~500 tokens |
| Tool calls per turn | 0 | 2+ |
| Audio files created | 0 | Yes |
| Stdout noise | Silent | Verbose |
| Acknowledgment TTS | No | Yes |
| Completion TTS | Smart | Always |

## Success Criteria

All tests must pass:

- ✅ Automated test suite: 100% pass rate
- ✅ Live audio test: Both messages audible
- ✅ Mode switching: Instant, no errors
- ✅ Fresh installation: Lite mode works immediately
- ✅ Performance: <50 tokens overhead per session
- ✅ Reliability: No audio interruptions or failures

## Credits

Testing framework created to verify lite mode implementation addressing feedback from Alex Verhovsky on reducing token overhead and eliminating unnecessary features for power users.

---

**Last Updated:** 2025-12-11
**Version:** 2.18.0-beta.1
