#!/usr/bin/env bats
# Unit tests for play-tts.sh

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PLAY_TTS="$TEST_CLAUDE_DIR/hooks/play-tts.sh"

  # Set up voices config
  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"
}

teardown() {
  teardown_test_env
}

@test "play-tts generates audio file" {
  run "$PLAY_TTS" "Test message"

  [ "$status" -eq 0 ]
  assert_output_contains "Saved to:"

  # Verify audio file was created
  local audio_count=$(find "$CLAUDE_PROJECT_DIR/.claude/audio" -name "tts-*.mp3" | wc -l)
  [ "$audio_count" -ge 1 ]
}

@test "play-tts saves to project-local directory when CLAUDE_PROJECT_DIR set" {
  export CLAUDE_PROJECT_DIR="${BATS_TEST_TMPDIR}/project"
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio"

  run "$PLAY_TTS" "Test message"

  [ "$status" -eq 0 ]
  assert_output_contains "$CLAUDE_PROJECT_DIR/.claude/audio/tts-"
}

@test "play-tts saves to HOME when no project directory found" {
  unset CLAUDE_PROJECT_DIR
  cd "$TEST_HOME"

  run "$PLAY_TTS" "Test message"

  [ "$status" -eq 0 ]
  assert_output_contains "$TEST_HOME/.claude/audio/tts-"
}

@test "play-tts with voice override uses specified voice" {
  run "$PLAY_TTS" "Test message" "Aria"

  [ "$status" -eq 0 ]
  assert_output_contains "Using voice: Aria"
}

@test "play-tts truncates long text" {
  local long_text=$(printf 'A%.0s' {1..600})

  run "$PLAY_TTS" "$long_text"

  [ "$status" -eq 0 ]
  assert_output_contains "Text truncated to 500 characters"
}

@test "play-tts fails without API key when using ElevenLabs" {
  unset ELEVENLABS_API_KEY

  # Set ElevenLabs as active provider
  echo "elevenlabs" > "$HOME/.claude/tts-provider.txt"

  run "$PLAY_TTS" "Test message"

  [ "$status" -eq 1 ]
  assert_output_contains "ELEVENLABS_API_KEY not set"
}

@test "play-tts fails without text argument" {
  run "$PLAY_TTS"

  [ "$status" -eq 1 ]
  assert_output_contains "Usage:"
}
