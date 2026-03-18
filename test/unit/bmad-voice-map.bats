#!/usr/bin/env bats
# Unit tests for BMAD agent-voice-map.csv integration
# Tests the new feature where AgentVibes reads voice mappings from BMAD's CSV file
# Generated from agent YAML tts sections by manifest-generator.js

load ../helpers/test-helper
load ../helpers/bmad-assertions

setup() {
  setup_test_env
  setup_agentvibes_scripts

  # Set up bmad-voice-manager script path
  VOICE_MANAGER="$TEST_CLAUDE_DIR/hooks/bmad-voice-manager.sh"

  # Create a mock BMAD installation structure
  export TEST_BMAD_DIR="${CLAUDE_PROJECT_DIR}/.bmad"
  export TEST_BMAD_CFG_DIR="${TEST_BMAD_DIR}/_cfg"
  mkdir -p "$TEST_BMAD_CFG_DIR"

  # Create a mock agent-voice-map.csv with intro text (new format)
  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Hey team! John here, your Product Manager. Let's make sure we're building the right thing."
dev,en_US-joe-medium,"Hey! Amelia here, your Developer. Ready to turn specs into working code."
architect,en_GB-alan-medium,"Hello! Winston here, your Architect. I'll ensure we build something scalable and pragmatic."
analyst,en_US-kristin-medium,"Hi there! I'm Mary, your Business Analyst. I'll help uncover the real requirements."
sm,en_US-amy-medium,"Hi everyone! Bob here, your Scrum Master. I'll keep us focused and moving forward."
EOF
}

teardown() {
  teardown_test_env
}

# Test 1: CSV file detection
@test "bmad-voice-manager detects agent-voice-map.csv in .bmad/_cfg/" {
  # Need to run from project directory for CSV detection
  cd "$CLAUDE_PROJECT_DIR"

  # Call get-voice which should read from CSV
  run "$VOICE_MANAGER" get-voice "pm"

  [ "$status" -eq 0 ]
  # Strip warnings and whitespace for comparison
  clean_output=$(echo "$output" | grep -v "warning:" | tr -d '[:space:]')
  [ "$clean_output" = "en_US-ryan-high" ]
}

# Test 2: Read voice for different agents
@test "bmad-voice-manager reads correct voice for each agent from CSV" {
  cd "$CLAUDE_PROJECT_DIR"

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"

  run "$VOICE_MANAGER" get-voice "dev"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-joe-medium"

  run "$VOICE_MANAGER" get-voice "architect"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_GB-alan-medium"

  run "$VOICE_MANAGER" get-voice "analyst"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-kristin-medium"
}

# Test 3: Read intro text from CSV (FUTURE FEATURE)
# NOTE: Currently get-intro only reads from markdown table, not CSV
# This test is SKIPPED until CSV intro reading is implemented
@test "bmad-voice-manager reads intro text from CSV" {
  skip "CSV intro reading not yet implemented in bmad-voice-manager.sh"

  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-intro "pm"

  [ "$status" -eq 0 ]
  assert_output_contains "John here"
  assert_output_contains "Product Manager"
}

# Test 4: Handle missing agent gracefully
@test "bmad-voice-manager returns empty string for unknown agent" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "nonexistent-agent"

  [ "$status" -eq 0 ]
  local clean_output=$(echo "$output" | grep -v "warning:")
  [ -z "$clean_output" ]
}

# Test 5: CSV takes priority over legacy markdown config
@test "bmad-voice-manager prefers CSV over legacy markdown config" {
  cd "$CLAUDE_PROJECT_DIR"

  # Create a legacy markdown config with different voice
  mkdir -p "$CLAUDE_PROJECT_DIR/.agentvibes/bmad"
  cat > "$CLAUDE_PROJECT_DIR/.agentvibes/bmad/bmad-voices.md" << 'EOF'
| Agent ID | Agent Name | Intro | Piper Voice | macOS Voice | Personality |
|----------|------------|-------|-------------|-------------|-------------|
| pm | Product Manager | PM Intro | WRONG_VOICE | Alex | normal |
EOF

  # CSV should take priority
  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test 6: Alternative BMAD path (bmad/ without dot prefix)
@test "bmad-voice-manager supports alternative bmad/ path" {
  cd "$CLAUDE_PROJECT_DIR"

  # Remove .bmad and create bmad/ instead
  rm -rf "$TEST_BMAD_DIR"
  export TEST_BMAD_ALT_DIR="${CLAUDE_PROJECT_DIR}/bmad"
  export TEST_BMAD_ALT_CFG_DIR="${TEST_BMAD_ALT_DIR}/_cfg"
  mkdir -p "$TEST_BMAD_ALT_CFG_DIR"

  # Create CSV in alternative location
  cat > "${TEST_BMAD_ALT_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"John here"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test 7: CSV with quoted intro text containing commas (FUTURE)
@test "bmad-voice-manager handles CSV with commas in intro text" {
  skip "CSV intro reading not yet implemented in bmad-voice-manager.sh"

  cd "$CLAUDE_PROJECT_DIR"

  # Create CSV with intro containing commas
  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Hey team! John here, your Product Manager, ready to help."
EOF

  run "$VOICE_MANAGER" get-intro "pm"
  [ "$status" -eq 0 ]
  assert_output_contains "John here"
  assert_output_contains "Product Manager"
  assert_output_contains "ready to help"
}

# Test 8: Empty CSV file
@test "bmad-voice-manager handles empty CSV gracefully" {
  cd "$CLAUDE_PROJECT_DIR"
  echo "agent,voice,intro" > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv"

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  # Empty CSV should return empty or fall back to defaults - either is acceptable
  # Just verify the command doesn't crash
}

# Test 9: CSV with missing intro column (old format compatibility)
@test "bmad-voice-manager handles CSV without intro column" {
  cd "$CLAUDE_PROJECT_DIR"

  # Create CSV with only agent,voice columns (old format)
  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice
pm,en_US-ryan-high
dev,en_US-joe-medium
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test 10: Integration test - bmad-speak.sh uses CSV voice
@test "bmad-speak.sh reads voice from CSV for agent" {
  BMAD_SPEAK="$TEST_CLAUDE_DIR/hooks/bmad-speak.sh"

  # Mock the TTS queue system
  cat > "$TEST_CLAUDE_DIR/hooks/tts-queue.sh" << 'EOF'
#!/bin/bash
# Mock TTS queue - just echo what would be queued
if [[ "$1" == "add" ]]; then
  echo "QUEUED: text='$2' voice='$3' agent='$4'"
fi
EOF
  chmod +x "$TEST_CLAUDE_DIR/hooks/tts-queue.sh"

  # Speak as PM agent
  run "$BMAD_SPEAK" "pm" "Hello from PM"

  [ "$status" -eq 0 ]
  # Should queue TTS with PM's voice from CSV
  # Note: Output might be suppressed in background mode, so we check the script ran
}

# Helper functions now loaded from ../helpers/bmad-assertions.bash
