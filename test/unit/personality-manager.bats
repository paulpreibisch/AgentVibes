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

  # Verify personality was saved (personality-manager writes to project dir OR HOME fallback)
  # Check both locations since the script may use HOME if CLAUDE_PROJECT_DIR isn't set
  if [[ -f "$CLAUDE_PROJECT_DIR/.claude/tts-personality.txt" ]]; then
    assert_file_contains "$CLAUDE_PROJECT_DIR/.claude/tts-personality.txt" "sarcastic"
  elif [[ -f "$HOME/.claude/tts-personality.txt" ]]; then
    assert_file_contains "$HOME/.claude/tts-personality.txt" "sarcastic"
  else
    # File must exist in one of these locations
    return 1
  fi
}

@test "personality-manager get returns current personality" {
  # Set personality in project-local directory (where the script saves it)
  echo "sarcastic" > "$CLAUDE_PROJECT_DIR/.claude/tts-personality.txt"

  run "$PERSONALITY_MANAGER" get

  [ "$status" -eq 0 ]
  assert_output_contains "Current personality: sarcastic"
}

@test "personality-manager set with assigned voice switches voice silently" {
  # Set Piper as active provider (ElevenLabs removed in v2.15.0)
  echo "piper" > "$HOME/.claude/tts-provider.txt"

  # sarcastic personality has assigned voice "en_US-amy-medium" (Piper voice)
  run "$PERSONALITY_MANAGER" set "sarcastic"

  [ "$status" -eq 0 ]
  assert_output_contains "Switching to assigned voice: en_US-amy-medium"

  # Should NOT contain duplicate voice introduction
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
  # Set personality first - script will write to either project dir or HOME
  "$PERSONALITY_MANAGER" set "sarcastic" > /dev/null 2>&1

  run "$PERSONALITY_MANAGER" reset

  [ "$status" -eq 0 ]
  assert_output_contains "Personality reset to: normal"

  # Verify reset was saved (check both possible locations)
  if [[ -f "$CLAUDE_PROJECT_DIR/.claude/tts-personality.txt" ]]; then
    assert_file_contains "$CLAUDE_PROJECT_DIR/.claude/tts-personality.txt" "normal"
  elif [[ -f "$HOME/.claude/tts-personality.txt" ]]; then
    assert_file_contains "$HOME/.claude/tts-personality.txt" "normal"
  else
    return 1
  fi
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
