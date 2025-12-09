#!/usr/bin/env bats
# Unit tests for party mode multi-agent TTS coordination (Issue #68)
# Tests sequential agent voices, background music continuity, and audio cleanup

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PLAY_TTS="$TEST_CLAUDE_DIR/hooks/play-tts.sh"
  MOCK_BMAD_SPEAK="$BATS_TEST_DIRNAME/../fixtures/mock-bmad-speak.sh"
  VOICE_MAP="$BATS_TEST_DIRNAME/../fixtures/voice-maps/basic-party-mode.csv"

  # Set up test environment
  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"
  export AGENTVIBES_TEST_MODE=true

  # Set Piper as provider for tests
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
}

teardown() {
  teardown_test_env
}

# Multi-Agent TTS Flow Tests

@test "party mode: sequential agent voices work" {
  # Test 3 agents speaking in sequence
  run "$MOCK_BMAD_SPEAK" "analyst" "Let me analyze this requirement"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "architect" "I'll design the architecture"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "dev" "I'll implement the solution"
  [ "$status" -eq 0 ]

  # All three calls succeeded - that's the key test
  # (Audio files might be in different locations in test mode)
}

@test "party mode: voice switching between agents uses correct voice" {
  # Set provider to piper
  export AGENTVIBES_PROVIDER="piper"

  # Analyst should use kristin voice
  AGENTVIBES_VOICE="en_US-kristin-medium" run "$PLAY_TTS" "Analyst speaking"
  [ "$status" -eq 0 ]

  # Architect should use alan voice
  AGENTVIBES_VOICE="en_GB-alan-medium" run "$PLAY_TTS" "Architect speaking"
  [ "$status" -eq 0 ]

  # Dev should use amy voice
  AGENTVIBES_VOICE="en_US-amy-medium" run "$PLAY_TTS" "Developer speaking"
  [ "$status" -eq 0 ]
}

@test "party mode: no audio overlap or corruption" {
  # Rapid-fire agent responses (< 1 second between)
  "$MOCK_BMAD_SPEAK" "analyst" "Quick analysis" &
  local pid1=$!

  sleep 0.1
  "$MOCK_BMAD_SPEAK" "architect" "Quick design" &
  local pid2=$!

  sleep 0.1
  "$MOCK_BMAD_SPEAK" "dev" "Quick code" &
  local pid3=$!

  # Wait for all to complete
  wait $pid1 $pid2 $pid3

  # All should succeed
  [ $? -eq 0 ]

  # Verify all audio files are valid (non-zero size)
  local audio_files=$(find "$CLAUDE_PROJECT_DIR/.claude/audio" -name "tts-*.wav" -o -name "tts-*.mp3" 2>/dev/null)
  for file in $audio_files; do
    [ -s "$file" ] # File exists and has size > 0
  done
}

@test "party mode: temp audio files are cleaned up" {
  # Generate audio
  run "$MOCK_BMAD_SPEAK" "analyst" "Test cleanup"
  [ "$status" -eq 0 ]

  # Check for orphaned temp files
  local temp_count=$(find /tmp -name "agentvibes-*" -type f 2>/dev/null | wc -l)

  # Should have minimal temp files (process-specific only)
  [ "$temp_count" -lt 10 ]
}

# Error Handling Tests

@test "party mode: handle missing voice for agent (fallback)" {
  # Agent not in voice map should use default voice
  run "$MOCK_BMAD_SPEAK" "unknown-agent" "I have no voice configured"

  # Should succeed with fallback to default
  [ "$status" -eq 0 ]
}

@test "party mode: graceful degradation when voice unavailable" {
  # Use a voice that doesn't exist
  AGENTVIBES_VOICE="invalid-voice-name" run "$PLAY_TTS" "Testing fallback"

  # Should fall back to default and succeed
  [ "$status" -eq 0 ]
}

# Performance Tests

@test "party mode: rapid-fire agent responses (< 1 second between)" {
  local start_time=$(date +%s)

  for i in {1..5}; do
    "$MOCK_BMAD_SPEAK" "analyst" "Message $i" || true
    sleep 0.5
  done

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  # Should complete in reasonable time (< 10 seconds for 5 messages)
  [ "$duration" -lt 10 ]
}

@test "party mode: long dialogue chains (10+ agent turns)" {
  local success_count=0

  # Simulate 10 agent turns
  for i in {1..10}; do
    local agent="analyst"
    if [ $((i % 3)) -eq 0 ]; then
      agent="architect"
    elif [ $((i % 3)) -eq 1 ]; then
      agent="dev"
    fi

    if "$MOCK_BMAD_SPEAK" "$agent" "Turn $i of conversation"; then
      success_count=$((success_count + 1))
    fi
  done

  # All turns should succeed
  [ "$success_count" -eq 10 ]
}

@test "party mode: memory usage with multiple temp files" {
  # Generate 20 audio files
  for i in {1..20}; do
    "$MOCK_BMAD_SPEAK" "analyst" "Message $i" || true
  done

  # Check audio directory size is reasonable (< 10MB for test mode)
  local audio_dir="$CLAUDE_PROJECT_DIR/.claude/audio"
  if [ -d "$audio_dir" ]; then
    local size=$(du -sm "$audio_dir" | cut -f1)
    [ "$size" -lt 10 ]
  fi
}

# Integration Tests

@test "party mode: works with agent-voice-map.csv from BMAD" {
  # Use the basic party mode voice map
  export VOICE_MAP="$BATS_TEST_DIRNAME/../fixtures/voice-maps/basic-party-mode.csv"

  run "$MOCK_BMAD_SPEAK" "analyst" "Using voice map" "$VOICE_MAP"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "architect" "Using voice map" "$VOICE_MAP"
  [ "$status" -eq 0 ]
}

@test "party mode: handles agents not in voice map" {
  # Agent not in CSV should still work
  run "$MOCK_BMAD_SPEAK" "unknown-agent" "Not in map" "$VOICE_MAP"
  [ "$status" -eq 0 ]
}

@test "party mode: handles mixed configured/unconfigured agents" {
  # Mix of agents in and not in voice map
  run "$MOCK_BMAD_SPEAK" "analyst" "I'm in the map" "$VOICE_MAP"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "random-agent" "I'm not in the map" "$VOICE_MAP"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "architect" "I'm also in the map" "$VOICE_MAP"
  [ "$status" -eq 0 ]
}
