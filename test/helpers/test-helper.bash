#!/usr/bin/env bash
# BATS test helper functions for AgentVibes

# Set up test environment
setup_test_env() {
  # Create isolated test directories
  export TEST_HOME="${BATS_TEST_TMPDIR}/home"
  export TEST_CLAUDE_DIR="${TEST_HOME}/.claude"
  export TEST_AUDIO_DIR="${TEST_CLAUDE_DIR}/audio"
  export TEST_PERSONALITIES_DIR="${TEST_CLAUDE_DIR}/personalities"

  mkdir -p "$TEST_HOME"
  mkdir -p "$TEST_CLAUDE_DIR"
  mkdir -p "$TEST_AUDIO_DIR"
  mkdir -p "$TEST_PERSONALITIES_DIR"

  # Override HOME for isolated testing
  export HOME="$TEST_HOME"

  # Set test environment variables
  export ELEVENLABS_API_KEY="test_api_key_mock"
  export CLAUDE_PROJECT_DIR="${BATS_TEST_TMPDIR}/project"

  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio"
}

# Clean up test environment
teardown_test_env() {
  # Clean up test files
  rm -rf "$TEST_HOME"
  rm -rf "$CLAUDE_PROJECT_DIR"

  # Remove any test voice/personality files
  rm -f /tmp/claude-tts-voice-*.txt
  rm -f "$HOME/.claude/tts-personality.txt"
  rm -f "$HOME/.claude/tts-sentiment.txt"
}

# Mock curl to avoid real API calls
mock_curl() {
  # Create a mock curl that generates silent test audio
  cat > "${BATS_TEST_TMPDIR}/curl" << 'EOF'
#!/bin/bash
# Mock curl for testing - no real API calls

# Extract output file from arguments
OUTPUT_FILE=""
for arg in "$@"; do
  if [[ "$prev_arg" == "-o" ]]; then
    OUTPUT_FILE="$arg"
    break
  fi
  prev_arg="$arg"
done

# Generate a minimal silent MP3 (base64 encoded)
# This is a valid but minimal MP3 file that's essentially silent
echo "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAhAD5AAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEYABEY41g5vAAA9RjpZxRTAImU+W8eshaFpAQgALAAYALATx/nYDYCMJ0HITQYYA7AH4c7MoGsnCMU5pnW+OQnBcDrQ9Xx7w37/D+PimYavV8elKUpT9H5fjvhn+mP+n/9P+7vSJ/nf//5m5IEgwJJVljCJJJJIlzfUlJJJL/+ZJJIliTJZJJJJIid//+ZJJJZJJJJJJJf/nf//0P//7U=" | base64 -d > "$OUTPUT_FILE"

# Simulate successful response
exit 0
EOF
  chmod +x "${BATS_TEST_TMPDIR}/curl"
  export PATH="${BATS_TEST_TMPDIR}:$PATH"
}

# Mock audio players to prevent actual playback
mock_audio_players() {
  # Create mock paplay
  cat > "${BATS_TEST_TMPDIR}/paplay" << 'EOF'
#!/bin/bash
# Mock paplay - no actual audio playback
exit 0
EOF
  chmod +x "${BATS_TEST_TMPDIR}/paplay"

  # Create mock aplay
  cat > "${BATS_TEST_TMPDIR}/aplay" << 'EOF'
#!/bin/bash
# Mock aplay - no actual audio playback
exit 0
EOF
  chmod +x "${BATS_TEST_TMPDIR}/aplay"

  # Create mock mpg123
  cat > "${BATS_TEST_TMPDIR}/mpg123" << 'EOF'
#!/bin/bash
# Mock mpg123 - no actual audio playback
exit 0
EOF
  chmod +x "${BATS_TEST_TMPDIR}/mpg123"

  export PATH="${BATS_TEST_TMPDIR}:$PATH"
}

# Copy AgentVibes scripts to test location
setup_agentvibes_scripts() {
  local REPO_ROOT="${BATS_TEST_DIRNAME}/.."

  # Copy hooks to test .claude directory
  cp -r "$REPO_ROOT/.claude/hooks" "$TEST_CLAUDE_DIR/"
  cp -r "$REPO_ROOT/.claude/personalities" "$TEST_PERSONALITIES_DIR/"

  # Make scripts executable
  chmod +x "$TEST_CLAUDE_DIR/hooks/"*.sh
}

# Create a test personality file
create_test_personality() {
  local name="$1"
  local voice="${2:-}"

  cat > "$TEST_PERSONALITIES_DIR/${name}.md" << EOF
---
name: ${name}
description: Test personality
voice: ${voice}
---

# ${name} Personality

## AI Instructions
Test instructions for ${name}

## Example Responses
- "Test response 1"
- "Test response 2"
EOF
}

# Assert file exists
assert_file_exists() {
  local file="$1"
  [[ -f "$file" ]] || {
    echo "Expected file to exist: $file"
    return 1
  }
}

# Assert file contains text
assert_file_contains() {
  local file="$1"
  local text="$2"
  grep -q "$text" "$file" || {
    echo "Expected file '$file' to contain: $text"
    echo "Actual contents:"
    cat "$file"
    return 1
  }
}

# Assert command output contains text
assert_output_contains() {
  local text="$1"
  echo "$output" | grep -q "$text" || {
    echo "Expected output to contain: $text"
    echo "Actual output:"
    echo "$output"
    return 1
  }
}
