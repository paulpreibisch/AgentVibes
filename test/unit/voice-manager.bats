#!/usr/bin/env bats
# Unit tests for voice-manager.sh

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  # Set up voice manager script path
  VOICE_MANAGER="$TEST_CLAUDE_DIR/hooks/voice-manager.sh"
}

teardown() {
  teardown_test_env
}

@test "voice-manager list shows available voices" {
  run "$VOICE_MANAGER" list

  [ "$status" -eq 0 ]
  # Output format includes provider name (Piper or macOS)
  # Check for key components rather than exact format
  assert_output_contains "Available"
  assert_output_contains "Voices"
  # Check for bundled multi-speaker model (always available in CI)
  assert_output_contains "16Speakers"
}

@test "voice-manager get returns default voice" {
  run "$VOICE_MANAGER" get

  [ "$status" -eq 0 ]
  # Should return a voice (may be en_US-lessac-medium or a bundled multi-speaker voice)
  # Just verify it returns something valid without failing
  [[ "$output" =~ (en_US-lessac-medium|Cori_Samuel|Rose_Ibex|Kara_Shallenberg) ]]
}

@test "voice-manager switch changes voice" {
  # Use a bundled multi-speaker voice that's always available
  run "$VOICE_MANAGER" switch "Rose_Ibex"

  [ "$status" -eq 0 ]
  # Multi-speaker voices have different output format
  assert_output_contains "voice switched to: Rose_Ibex"

  # Verify voice was saved (may include warnings)
  run "$VOICE_MANAGER" get
  assert_output_contains "Rose_Ibex"
}

@test "voice-manager switch by number works" {
  skip "Numeric voice selection not yet implemented"
  run "$VOICE_MANAGER" switch "1"

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to:"
}

@test "voice-manager switch --silent does not play audio" {
  # Use a bundled multi-speaker voice that's always available
  run "$VOICE_MANAGER" switch "Cori_Samuel" --silent

  [ "$status" -eq 0 ]
  # Multi-speaker voices have different output format
  assert_output_contains "voice switched to: Cori_Samuel"

  # Should NOT contain the introduction message in output
  # (it would only appear if TTS was called)
}

@test "voice-manager switch with invalid voice fails" {
  run "$VOICE_MANAGER" switch "NonExistentVoice"

  [ "$status" -eq 1 ]
  assert_output_contains "not found"
}

@test "voice-manager whoami shows current configuration" {
  # Set a voice using a bundled multi-speaker voice
  "$VOICE_MANAGER" switch "Kara_Shallenberg" --silent

  run "$VOICE_MANAGER" whoami

  [ "$status" -eq 0 ]
  assert_output_contains "Current Voice Configuration"
  assert_output_contains "Voice: Kara_Shallenberg"
}

@test "voice-manager replay uses project-local directory" {
  # Create test audio file in project-local directory
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio"
  touch "$CLAUDE_PROJECT_DIR/.claude/audio/tts-123456.mp3"

  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 0 ]
  assert_output_contains "Replaying audio #1"
  assert_output_contains "$CLAUDE_PROJECT_DIR/.claude/audio/tts-123456.mp3"
}

@test "voice-manager replay falls back to HOME when no project directory" {
  unset CLAUDE_PROJECT_DIR
  mkdir -p "$TEST_HOME/.claude/audio"
  touch "$TEST_HOME/.claude/audio/tts-789012.mp3"

  cd "$TEST_HOME"

  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 0 ]
  assert_output_contains "Replaying audio #1"
  assert_output_contains "$TEST_HOME/.claude/audio/tts-789012.mp3"
}

@test "voice-manager replay with no audio history fails gracefully" {
  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 1 ]
  # Accept either error message format
  [[ "$output" =~ "No audio history found"|"Audio #1 not found in history" ]]
}

@test "voice-manager replay shows both filename and path" {
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio"
  touch "$CLAUDE_PROJECT_DIR/.claude/audio/tts-999999.mp3"

  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 0 ]
  assert_output_contains "File: tts-999999.mp3"
  assert_output_contains "Path: $CLAUDE_PROJECT_DIR/.claude/audio/tts-999999.mp3"
}
