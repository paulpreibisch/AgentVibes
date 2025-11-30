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

# ============================================================================
# Provider Routing Tests (Issue #52)
# ============================================================================

@test "play-tts routes to macos provider when configured" {
  # Issue #52: macOS provider routing was missing
  # This test ensures the macos case exists in play-tts.sh
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Create a mock play-tts-macos.sh that we can detect was called
  local macos_script="$TEST_CLAUDE_DIR/hooks/play-tts-macos.sh"
  cat > "$macos_script" << 'EOF'
#!/usr/bin/env bash
echo "MACOS_PROVIDER_CALLED"
echo "Text: $1"
echo "Voice: $2"
exit 0
EOF
  chmod +x "$macos_script"

  run "$PLAY_TTS" "Test macOS routing"

  [ "$status" -eq 0 ]
  # Should have called the macos provider
  assert_output_contains "MACOS_PROVIDER_CALLED"
}

@test "play-tts speak_text function routes to macos" {
  # Test the speak_text function also routes to macos (for translation/learning modes)
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Source play-tts.sh and test speak_text function
  # We verify by checking the macos case exists in the script
  run grep -A2 'case "\$provider" in' "$PLAY_TTS"

  [ "$status" -eq 0 ]
  # The macos case should exist in the speak_text function
  run grep 'macos)' "$PLAY_TTS"
  [ "$status" -eq 0 ]

  # Count occurrences - should be 2 (one in speak_text, one in main routing)
  local count=$(grep -c 'macos)' "$PLAY_TTS")
  [ "$count" -ge 2 ]
}
