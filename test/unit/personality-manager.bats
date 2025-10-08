#!/usr/bin/env bats
# Unit tests for personality-manager.sh

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PERSONALITY_MANAGER="$TEST_CLAUDE_DIR/hooks/personality-manager.sh"

  # Create test personalities with both ElevenLabs and Piper voices
  create_test_personality "sarcastic" "Jessica Anne Bogart" "en_US-amy-medium"
  create_test_personality "normal" "Aria" "en_US-lessac-medium"
}

teardown() {
  teardown_test_env
}

@test "personality-manager list shows available personalities" {
  run "$PERSONALITY_MANAGER" list

  [ "$status" -eq 0 ]
  assert_output_contains "Available Personalities"
  assert_output_contains "sarcastic"
  assert_output_contains "normal"
}

@test "personality-manager set changes personality" {
  run "$PERSONALITY_MANAGER" set "sarcastic"

  [ "$status" -eq 0 ]
  assert_output_contains "Personality set to: sarcastic"

  # Verify personality was saved
  assert_file_exists "$HOME/.claude/tts-personality.txt"
  assert_file_contains "$HOME/.claude/tts-personality.txt" "sarcastic"
}

@test "personality-manager get returns current personality" {
  echo "sarcastic" > "$HOME/.claude/tts-personality.txt"

  run "$PERSONALITY_MANAGER" get

  [ "$status" -eq 0 ]
  assert_output_contains "Current personality: sarcastic"
}

@test "personality-manager set with assigned voice switches voice silently" {
  # Set default provider (no provider file defaults to elevenlabs)
  # sarcastic personality has assigned voice "Jessica Anne Bogart" (ElevenLabs)
  run "$PERSONALITY_MANAGER" set "sarcastic"

  [ "$status" -eq 0 ]
  assert_output_contains "Switching to assigned voice: Jessica Anne Bogart"

  # Should NOT contain duplicate "Hi, I'm Jessica..." introduction
  # (that would indicate double audio bug)
}

@test "personality-manager set with piper provider uses piper voice" {
  # Set Piper as active provider
  echo "piper" > "$HOME/.claude/tts-provider.txt"

  # sarcastic personality should use en_US-amy-medium (Piper voice)
  run "$PERSONALITY_MANAGER" set "sarcastic"

  [ "$status" -eq 0 ]
  assert_output_contains "Switching to assigned voice: en_US-amy-medium"
}

@test "personality-manager reset changes to normal" {
  echo "sarcastic" > "$HOME/.claude/tts-personality.txt"

  run "$PERSONALITY_MANAGER" reset

  [ "$status" -eq 0 ]
  assert_output_contains "Personality reset to: normal"

  assert_file_contains "$HOME/.claude/tts-personality.txt" "normal"
}

@test "personality-manager add creates new personality file" {
  run "$PERSONALITY_MANAGER" add "custom_test"

  [ "$status" -eq 0 ]
  assert_output_contains "Created new personality: custom_test"

  assert_file_exists "$TEST_PERSONALITIES_DIR/custom_test.md"
}

@test "personality-manager add duplicate fails" {
  "$PERSONALITY_MANAGER" add "duplicate_test"

  run "$PERSONALITY_MANAGER" add "duplicate_test"

  [ "$status" -eq 1 ]
  assert_output_contains "already exists"
}

@test "personality-manager set with invalid personality fails" {
  run "$PERSONALITY_MANAGER" set "nonexistent_personality"

  [ "$status" -eq 1 ]
  assert_output_contains "Personality not found"
}

@test "personality-manager edit shows file path" {
  run "$PERSONALITY_MANAGER" edit "sarcastic"

  [ "$status" -eq 0 ]
  assert_output_contains "Edit this file"
  assert_output_contains "sarcastic.md"
}
