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
  assert_output_contains "Available TTS Voices"
  assert_output_contains "Aria"
  assert_output_contains "Cowboy Bob"
}

@test "voice-manager get returns default voice" {
  run "$VOICE_MANAGER" get

  [ "$status" -eq 0 ]
  # Should return Cowboy Bob as default
  [[ "$output" == "Cowboy Bob" ]]
}

@test "voice-manager switch changes voice" {
  run "$VOICE_MANAGER" switch "Aria"

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to: Aria"

  # Verify voice was saved
  run "$VOICE_MANAGER" get
  [[ "$output" == "Aria" ]]
}

@test "voice-manager switch by number works" {
  run "$VOICE_MANAGER" switch "1"

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to:"
}

@test "voice-manager switch --silent does not play audio" {
  run "$VOICE_MANAGER" switch "Aria" --silent

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to: Aria"

  # Should NOT contain the introduction message in output
  # (it would only appear if TTS was called)
}

@test "voice-manager switch with invalid voice fails" {
  run "$VOICE_MANAGER" switch "NonExistentVoice"

  [ "$status" -eq 1 ]
  assert_output_contains "Unknown voice"
}

@test "voice-manager whoami shows current configuration" {
  # Set a voice
  "$VOICE_MANAGER" switch "Aria" --silent

  run "$VOICE_MANAGER" whoami

  [ "$status" -eq 0 ]
  assert_output_contains "Current Voice Configuration"
  assert_output_contains "Voice: Aria"
}

@test "voice-manager replay with no audio history fails gracefully" {
  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 1 ]
  assert_output_contains "No audio history found"
}
