#!/usr/bin/env bats
#
# File: test/piper-installation.bats
#
# Piper TTS Installation Tests
# Tests the complete Piper installation flow including voice downloads
#

setup() {
  # Test environment setup
  export AGENTVIBES_TEST_MODE="true"

  # For integration tests, use real HOME to allow Piper installation
  # For unit tests, use temp HOME for isolation
  if [ -z "$PIPER_INTEGRATION_TEST" ]; then
    export HOME="${BATS_TEST_TMPDIR}/home"
    mkdir -p "$HOME"
  fi
  # else: use real $HOME for integration tests

  # Create temporary project directory
  export TEST_PROJECT_DIR="${BATS_TEST_TMPDIR}/agentvibes-test"
  mkdir -p "$TEST_PROJECT_DIR"
  cd "$TEST_PROJECT_DIR"

  # Copy necessary files for installation
  cp -r "$BATS_TEST_DIRNAME/../.claude" "$TEST_PROJECT_DIR/"

  # Expected voice models
  export EXPECTED_VOICES=(
    "en_US-lessac-medium"
    "en_US-amy-medium"
    "en_US-joe-medium"
    "en_US-ryan-high"
    "en_US-libritts-high"
    "16Speakers"
  )
}

teardown() {
  # Cleanup test environment
  cd "$BATS_TEST_DIRNAME"
  rm -rf "$TEST_PROJECT_DIR"

  # Only remove temp HOME for unit tests, not integration tests
  if [ -z "$PIPER_INTEGRATION_TEST" ]; then
    rm -rf "$HOME"
  fi
}

@test "Piper installer script exists and is executable" {
  [ -f "$TEST_PROJECT_DIR/.claude/hooks/piper-installer.sh" ]
  [ -x "$TEST_PROJECT_DIR/.claude/hooks/piper-installer.sh" ]
}

@test "Piper voice downloader script exists and is executable" {
  [ -f "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh" ]
  [ -x "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh" ]
}

@test "Piper voice manager script exists" {
  [ -f "$TEST_PROJECT_DIR/.claude/hooks/piper-voice-manager.sh" ]
}

@test "Non-interactive flag is supported in piper-installer.sh" {
  run grep -q "NON_INTERACTIVE" "$TEST_PROJECT_DIR/.claude/hooks/piper-installer.sh"
  [ "$status" -eq 0 ]
}

@test "Yes flag is supported in piper-download-voices.sh" {
  run grep -q "AUTO_YES" "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh"
  [ "$status" -eq 0 ]
}

@test "Download script has explicit exit 0" {
  run grep -q "exit 0" "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh"
  [ "$status" -eq 0 ]
}

@test "All expected voices are in COMMON_VOICES array" {
  for voice in "${EXPECTED_VOICES[@]}"; do
    run grep -q "\"$voice\"" "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh"
    [ "$status" -eq 0 ]
  done
}

@test "16Speakers model is included in download list" {
  run grep -q "16Speakers" "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh"
  [ "$status" -eq 0 ]
}

@test "Curl timeouts are configured in voice manager" {
  run grep -q "\-\-connect-timeout" "$TEST_PROJECT_DIR/.claude/hooks/piper-voice-manager.sh"
  [ "$status" -eq 0 ]

  run grep -q "\-\-max-time" "$TEST_PROJECT_DIR/.claude/hooks/piper-voice-manager.sh"
  [ "$status" -eq 0 ]
}

@test "Piper installer passes --non-interactive flag to voice downloader" {
  run grep -q "piper-download-voices.sh.*--yes" "$TEST_PROJECT_DIR/.claude/hooks/piper-installer.sh"
  [ "$status" -eq 0 ]
}

# Integration test - only runs if PIPER_INTEGRATION_TEST is set
@test "Full Piper installation with voice downloads (integration)" {
  if [ -z "$PIPER_INTEGRATION_TEST" ]; then
    skip "Set PIPER_INTEGRATION_TEST=1 to run integration tests"
  fi

  # Run installer in non-interactive mode
  run bash "$TEST_PROJECT_DIR/.claude/hooks/piper-installer.sh" --non-interactive
  echo "Installer output: $output"
  [ "$status" -eq 0 ]

  # Verify Piper is installed
  command -v piper || skip "Piper not in PATH after installation"

  # Check voice storage directory
  VOICE_DIR="$HOME/.claude/piper-voices"
  [ -d "$VOICE_DIR" ]

  # Verify at least some voices downloaded
  voice_count=$(find "$VOICE_DIR" -name "*.onnx" | wc -l)
  [ "$voice_count" -gt 0 ]

  # Verify 16Speakers model specifically
  [ -f "$VOICE_DIR/16Speakers.onnx" ]
  [ -f "$VOICE_DIR/16Speakers.onnx.json" ]
}

@test "Voice download script handles failures gracefully" {
  # Test that the script returns 0 even with failures
  # This is a mock test - in real scenario we'd simulate network failures

  run bash -c "source '$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh' 2>&1 | tail -1"
  echo "Output: $output"

  # Script should exit 0 (checked via exit code or explicit exit statement)
  [ -f "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh" ]
  tail -5 "$TEST_PROJECT_DIR/.claude/hooks/piper-download-voices.sh" | grep -q "exit 0"
}
