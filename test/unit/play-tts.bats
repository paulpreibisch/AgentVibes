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

  # Set ElevenLabs as the provider to avoid Piper voice download issues in tests
  echo "elevenlabs" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
}

teardown() {
  teardown_test_env
}

@test "play-tts generates audio file" {
  run "$PLAY_TTS" "Test message"

  # Show output for debugging if test fails
  if [ "$status" -ne 0 ]; then
    echo "Exit status: $status"
    echo "Output: $output"
  fi

  [ "$status" -eq 0 ]

  # Verify audio file was created (in project dir or HOME)
  local audio_count=0
  if [[ -d "$CLAUDE_PROJECT_DIR/.claude/audio" ]]; then
    audio_count=$(find "$CLAUDE_PROJECT_DIR/.claude/audio" -name "tts-*.mp3" -o -name "tts-*.wav" | wc -l)
  fi
  if [[ "$audio_count" -eq 0 ]] && [[ -d "$HOME/.claude/audio" ]]; then
    audio_count=$(find "$HOME/.claude/audio" -name "tts-*.mp3" -o -name "tts-*.wav" | wc -l)
  fi

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

  # Set provider in HOME directory since project dir is not available
  echo "elevenlabs" > "$TEST_HOME/.claude/tts-provider.txt"

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

@test "play-tts fails without text argument" {
  run "$PLAY_TTS"

  [ "$status" -eq 1 ]
  assert_output_contains "Error: No text provided"
}
