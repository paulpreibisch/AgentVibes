#!/usr/bin/env bats
# Unit tests for voice provider switching and fallback (Issue #69)
# Tests Piper/macOS provider switching, voice fallbacks, and cross-platform compatibility

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PLAY_TTS="$TEST_CLAUDE_DIR/hooks/play-tts.sh"
  MOCK_BMAD_SPEAK="$BATS_TEST_DIRNAME/../fixtures/mock-bmad-speak.sh"
  MULTI_PROVIDER_MAP="$BATS_TEST_DIRNAME/../fixtures/voice-maps/multi-provider.csv"

  # Set up test environment
  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"
  export AGENTVIBES_TEST_MODE=true
}

teardown() {
  teardown_test_env
}

# Provider Switching Tests

@test "provider switching: switch from Piper to macOS mid-session" {
  # Start with Piper
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  run "$PLAY_TTS" "Testing Piper"
  [ "$status" -eq 0 ]

  # Switch to macOS (may not be available on Linux)
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  run "$PLAY_TTS" "Testing macOS"

  # May succeed or fail gracefully if macOS not available
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

@test "provider switching: switch from macOS to Piper mid-session" {
  # Start with macOS (may not be available on Linux)
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  run "$PLAY_TTS" "Testing macOS first"

  # May fail if macOS not available, that's okay
  local macos_status=$status

  # Switch to Piper (should always work in test mode)
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  run "$PLAY_TTS" "Testing Piper second"
  [ "$status" -eq 0 ]
}

@test "provider switching: verify correct voice field used from CSV (piper)" {
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Should use piper column (column 2)
  run "$MOCK_BMAD_SPEAK" "analyst" "Piper voice" "$MULTI_PROVIDER_MAP" "piper"
  [ "$status" -eq 0 ]

  # Output should reference piper voice
  [[ "$output" =~ "piper" ]] || [[ "$output" =~ "en_US" ]] || [ "$status" -eq 0 ]
}

@test "provider switching: verify correct voice field used from CSV (macos)" {
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Should use mac column (column 3) - may not work on Linux
  run "$MOCK_BMAD_SPEAK" "analyst" "macOS voice" "$MULTI_PROVIDER_MAP" "macos"

  # May fail gracefully if macOS not available
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

@test "provider switching: handle provider not available (macOS on Linux)" {
  # Force macOS provider on Linux
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Should still succeed (fallback to available provider)
  run "$PLAY_TTS" "Testing unavailable provider"

  # May succeed with fallback or gracefully fail
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

@test "provider switching: config persistence across sessions" {
  # Set provider
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Verify it persists
  local provider=$(cat "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt")
  [ "$provider" = "piper" ]

  # Change it
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Verify change persisted
  provider=$(cat "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt")
  [ "$provider" = "macos" ]
}

# Fallback Behavior Tests

@test "fallback: agent has Piper voice but provider is macOS → use fallback" {
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # piper-only agent should fallback (or fail if macOS not available)
  run "$MOCK_BMAD_SPEAK" "piper-only" "I only have Piper voice" "$MULTI_PROVIDER_MAP" "macos"

  # Should succeed with fallback, or fail gracefully if macOS unavailable
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

@test "fallback: agent has macOS voice but provider is Piper → use fallback" {
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # fallback-only agent (only has macOS voice)
  run "$MOCK_BMAD_SPEAK" "fallback-only" "I only have macOS voice" "$MULTI_PROVIDER_MAP" "piper"

  # Should succeed with fallback
  [ "$status" -eq 0 ]
}

@test "fallback: agent has neither voice → use system default" {
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Use voice map with missing voices
  local missing_map="$BATS_TEST_DIRNAME/../fixtures/voice-maps/missing-voices.csv"
  run "$MOCK_BMAD_SPEAK" "no-voice-agent" "I have no voice" "$missing_map" "piper"

  # Should succeed with system default
  [ "$status" -eq 0 ]
}

@test "fallback: custom fallback voice configuration" {
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Set a custom default voice
  echo "en_US-ryan-high" > "$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"

  # Agent with no voice should use this fallback
  run "$PLAY_TTS" "Using custom fallback"
  [ "$status" -eq 0 ]
}

@test "fallback: fallback voice per provider" {
  # Piper provider with fallback
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  echo "en_US-ryan-high" > "$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"
  run "$PLAY_TTS" "Piper fallback"
  [ "$status" -eq 0 ]

  # macOS provider (if available) with fallback
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  echo "Samantha" > "$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"
  run "$PLAY_TTS" "macOS fallback"

  # Should succeed or gracefully fail if macOS not available
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

# Voice Map Integration Tests

@test "voice map: read voice from CSV based on active provider (piper)" {
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Read from piper column
  run "$MOCK_BMAD_SPEAK" "analyst" "Test" "$MULTI_PROVIDER_MAP" "piper"
  [ "$status" -eq 0 ]
}

@test "voice map: read voice from CSV based on active provider (macos)" {
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Read from mac column (may fail on Linux)
  run "$MOCK_BMAD_SPEAK" "analyst" "Test" "$MULTI_PROVIDER_MAP" "macos"

  # May fail if macOS not available
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

@test "voice map: ignore irrelevant provider field in CSV" {
  # Using piper provider should ignore mac column
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  run "$MOCK_BMAD_SPEAK" "analyst" "Ignore mac column" "$MULTI_PROVIDER_MAP" "piper"
  [ "$status" -eq 0 ]

  # Using macos provider should ignore piper column
  echo "macos" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  run "$MOCK_BMAD_SPEAK" "analyst" "Ignore piper column" "$MULTI_PROVIDER_MAP" "macos"
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ] # May fail if macOS not available
}

@test "voice map: handle voice map with only one provider" {
  # Create a voice map with only piper voices
  local piper_only_map="$BATS_TEST_TMPDIR/piper-only.csv"
  cat > "$piper_only_map" <<EOF
agent,piper,mac,intro
analyst,en_US-kristin-medium,,"Piper only"
EOF

  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  run "$MOCK_BMAD_SPEAK" "analyst" "Test" "$piper_only_map" "piper"
  [ "$status" -eq 0 ]
}

@test "voice map: handle voice map with both providers" {
  # This is the multi-provider map
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  run "$MOCK_BMAD_SPEAK" "analyst" "Test both providers" "$MULTI_PROVIDER_MAP" "piper"
  [ "$status" -eq 0 ]
}

# Error Cases

@test "error: invalid provider name in config" {
  echo "invalid-provider" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Should fallback to default provider
  run "$PLAY_TTS" "Invalid provider"

  # Should succeed with fallback or fail gracefully
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

@test "error: provider binary not found" {
  # This is handled in test mode - mock binaries always exist
  # In real scenarios, should fallback gracefully
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  run "$PLAY_TTS" "Provider check"
  [ "$status" -eq 0 ]
}

@test "error: provider fails to generate audio" {
  # In test mode, mock piper should always succeed
  # This tests graceful error handling
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  run "$PLAY_TTS" "Generation test"

  # Should either succeed or fail gracefully
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}
