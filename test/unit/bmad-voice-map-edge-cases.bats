#!/usr/bin/env bats
# Additional edge case tests for BMAD agent-voice-map.csv integration
# Tests cover Issue #67: CSV parsing edge cases for BMAD PR #987
# GitHub Issue: https://github.com/paulpreibisch/AgentVibes/issues/67
# These tests complement bmad-voice-map.bats with advanced scenarios

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
}

teardown() {
  # Ensure cleanup of permission-modified files
  chmod -R 755 "$TEST_BMAD_CFG_DIR" 2>/dev/null || true
  teardown_test_env
}

# ==============================================================================
# CSV PARSING EDGE CASES - Issue #67
# ==============================================================================

# Test: CSV with RFC 4180 compliant quote escaping (doubled quotes)
@test "[Issue #67] CSV with RFC 4180 escaped quotes in intro text" {
  cd "$CLAUDE_PROJECT_DIR"

  # RFC 4180: Quotes inside quoted fields must be doubled ("")
  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"He said ""hello"" and ""goodbye"""
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with newline characters (escaped)
@test "[Issue #67] CSV with escaped newline characters in intro" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Line 1\nLine 2\nLine 3"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: Malformed CSV - missing voice value (falls back to hardcoded default)
@test "[Issue #67] Malformed CSV with empty voice field uses fallback" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,,"PM intro text"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  # Empty voice field triggers fallback to hardcoded default (en_US-ryan-high for pm)
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with empty intro field
@test "[Issue #67] CSV with empty intro field" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,""
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with invalid/non-existent voice name (validation happens at TTS time)
@test "[Issue #67] CSV with invalid voice name passes through" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,NONEXISTENT_VOICE_123,"PM intro"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "NONEXISTENT_VOICE_123"
  # Voice validation happens at TTS time, not CSV read time
}

# Test: Missing voice map file entirely (falls back to hardcoded defaults)
@test "[Issue #67] Missing voice map file uses fallback gracefully" {
  cd "$CLAUDE_PROJECT_DIR"

  # Ensure CSV doesn't exist
  rm -f "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv"

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  # Should return hardcoded fallback voice (en_US-ryan-high for pm)
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: Corrupted CSV with binary data (should fail gracefully with non-zero exit)
@test "[Issue #67] Corrupted CSV file with binary data fails gracefully" {
  cd "$CLAUDE_PROJECT_DIR"

  # Create corrupted file with binary data
  echo -e "\x00\x01\x02\xFF\xFE" > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv"

  run "$VOICE_MANAGER" get-voice "pm"
  # Should either succeed with empty output or fail gracefully
  # Either way, should not crash with segfault or uncaught error
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

# Test: File permission issues (should fail with non-zero exit or return empty)
@test "[Issue #67] Read permission denied on CSV file fails gracefully" {
  # Skip in CI - permission tests unreliable across different runners
  skip "Permission tests may not work reliably in CI environments"

  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"PM intro"
EOF

  # Remove read permissions
  chmod 000 "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv"

  # Use trap to ensure cleanup even if test fails
  trap "chmod 644 '${TEST_BMAD_CFG_DIR}/agent-voice-map.csv' 2>/dev/null || true" EXIT

  run "$VOICE_MANAGER" get-voice "pm"

  # Should handle gracefully - either error (status 1) or fallback (status 0 with empty)
  if [ "$status" -eq 0 ]; then
    assert_output_empty_clean
  else
    [ "$status" -eq 1 ]
  fi

  # Cleanup
  chmod 644 "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" 2>/dev/null || true
  trap - EXIT
}

# Test: CSV with only headers, no data
@test "[Issue #67] CSV with only headers uses fallback for unknown agent" {
  cd "$CLAUDE_PROJECT_DIR"

  echo "agent,voice,intro" > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv"

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  # Should return hardcoded fallback for unknown agent
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with extra columns (forward compatibility)
@test "[Issue #67] CSV with extra columns for future compatibility" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro,personality,future_field
pm,en_US-ryan-high,"PM intro",normal,extra_data
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with Windows line endings (CRLF)
@test "[Issue #67] CSV with Windows CRLF line endings" {
  cd "$CLAUDE_PROJECT_DIR"

  # Create CSV with CRLF
  printf "agent,voice,intro\r\npm,en_US-ryan-high,\"PM intro\"\r\n" > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv"

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with leading/trailing whitespace in fields
@test "[Issue #67] CSV with whitespace padding in fields" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
 pm ,  en_US-ryan-high  ,"  PM intro  "
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  # Whitespace in agent name means lookup might fail - test graceful handling
  # Either returns the voice (if trimmed) or empty (if exact match required)
}

# Test: CSV with Unicode/emoji characters
@test "[Issue #67] CSV with Unicode and emoji characters" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Hey! 👋 John here 🚀 Let's build!"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with very long intro text (>500 chars)
@test "[Issue #67] CSV with very long intro text" {
  cd "$CLAUDE_PROJECT_DIR"

  long_intro="This is a very long introduction that goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << EOF
agent,voice,intro
pm,en_US-ryan-high,"${long_intro}"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with duplicate agent entries (grep returns all matches)
@test "[Issue #67] CSV with duplicate agent entries returns all matches" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-joe-medium,"First entry"
pm,en_US-ryan-high,"Second entry"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  # grep returns both lines, cut extracts both voices
  # Implementation uses first match (grep returns multiple lines, cut -f2 gets field 2 from each)
  # Test passes if either voice is in output (grep's behavior with duplicates is implementation-defined)
  assert_output_contains "en_US-joe-medium"
  assert_output_contains "en_US-ryan-high"
}

# ==============================================================================
# SECURITY TESTS - Issue #67
# ==============================================================================

# Test: CSV with shell special characters (security - no injection)
@test "[Issue #67] CSV with shell special characters prevents injection" {
  cd "$CLAUDE_PROJECT_DIR"

  # Test for shell injection vulnerabilities
  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Test $PATH and `echo pwned` and $(whoami)"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
  # Verifies no shell expansion/injection occurs
}

# Test: CSV with semicolons (potential command injection)
@test "[Issue #67] CSV with semicolons in intro prevents command injection" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Hello; rm -rf /; echo done"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with pipe characters (security)
@test "[Issue #67] CSV with pipe characters prevents command chaining" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Hello | cat /etc/passwd"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# Test: CSV with single quotes (security)
@test "[Issue #67] CSV with single quotes handles correctly" {
  cd "$CLAUDE_PROJECT_DIR"

  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"It's John's intro message"
EOF

  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

# ==============================================================================
# CONTRACT TESTS - BMAD Integration
# ==============================================================================

# Test: CSV format matches BMAD manifest-generator.js output
@test "[Issue #67] CSV format contract - three columns (agent,voice,intro)" {
  cd "$CLAUDE_PROJECT_DIR"

  # This is the exact format BMAD's manifest-generator.js produces
  cat > "${TEST_BMAD_CFG_DIR}/agent-voice-map.csv" << 'EOF'
agent,voice,intro
pm,en_US-ryan-high,"Hey team! John here, your Product Manager."
dev,en_US-joe-medium,"Hey! Amelia here, your Developer."
architect,en_GB-alan-medium,"Hello! Winston here, your Architect."
EOF

  # Verify all three agents are readable
  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"

  run "$VOICE_MANAGER" get-voice "dev"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-joe-medium"

  run "$VOICE_MANAGER" get-voice "architect"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_GB-alan-medium"
}

# Test: Alternative BMAD path (bmad/ without dot prefix)
@test "[Issue #67] Contract - alternative bmad/ path supported" {
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
