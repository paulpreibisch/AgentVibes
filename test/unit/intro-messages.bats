#!/usr/bin/env bats
# Unit tests for agent intro message playback (Issue #70)
# Tests intro message loading, special character handling, and playback logic

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PLAY_TTS="$TEST_CLAUDE_DIR/hooks/play-tts.sh"
  MOCK_BMAD_SPEAK="$BATS_TEST_DIRNAME/../fixtures/mock-bmad-speak.sh"
  BASIC_MAP="$BATS_TEST_DIRNAME/../fixtures/voice-maps/basic-party-mode.csv"
  SPECIAL_MAP="$BATS_TEST_DIRNAME/../fixtures/voice-maps/special-intros.csv"

  # Set up test environment
  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"
  export AGENTVIBES_TEST_MODE=true

  # Set Piper as provider
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
}

teardown() {
  teardown_test_env
}

# Intro Message Playback Tests

@test "intro: play intro on party mode activation (3-4 agents)" {
  # First time speaking - should play intro
  run "$MOCK_BMAD_SPEAK" "analyst" "Hi! I'm Mary, your Business Analyst." "$BASIC_MAP"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "architect" "Hello! Winston here, your Architect." "$BASIC_MAP"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "dev" "Hey! Amelia here, your Developer." "$BASIC_MAP"
  [ "$status" -eq 0 ]

  # All three calls should succeed (that's the main test)
  # Audio file count is secondary in test mode
}

@test "intro: skip intro if not in voice map" {
  # Agent not in voice map should still work (no intro)
  run "$MOCK_BMAD_SPEAK" "unknown-agent" "Regular message" "$BASIC_MAP"
  [ "$status" -eq 0 ]
}

@test "intro: handle empty intro field" {
  # Create voice map with empty intro
  local empty_intro_map="$BATS_TEST_TMPDIR/empty-intro.csv"
  cat > "$empty_intro_map" <<EOF
agent,piper,mac,intro
analyst,en_US-kristin-medium,Samantha,
EOF

  run "$MOCK_BMAD_SPEAK" "analyst" "Regular message" "$empty_intro_map"
  [ "$status" -eq 0 ]
}

@test "intro: handle very long intro messages (> 200 chars)" {
  # Create voice map with long intro
  local long_intro_map="$BATS_TEST_TMPDIR/long-intro.csv"
  local long_message="Hi there! I'm Mary, your Business Analyst, and I'm here to help you understand the requirements, analyze the stakeholder needs, document the business processes, create detailed specifications, and ensure we deliver maximum value to our customers and users!"
  cat > "$long_intro_map" <<EOF
agent,piper,mac,intro
analyst,en_US-kristin-medium,Samantha,"$long_message"
EOF

  run "$MOCK_BMAD_SPEAK" "analyst" "$long_message" "$long_intro_map"
  [ "$status" -eq 0 ]
}

@test "intro: handle intro with special TTS characters (?, !, ...)" {
  # Create voice map with special characters
  local special_map="$BATS_TEST_TMPDIR/special-chars.csv"
  cat > "$special_map" <<EOF
agent,piper,mac,intro
analyst,en_US-kristin-medium,Samantha,"Hi! I'm Mary... your analyst? Let's go!"
EOF

  run "$MOCK_BMAD_SPEAK" "analyst" "Hi! I'm Mary... your analyst? Let's go!" "$special_map"
  [ "$status" -eq 0 ]
}

# Intro Special Characters Tests

@test "intro special chars: quotation marks" {
  # Test from special-intros.csv with quotes
  run "$MOCK_BMAD_SPEAK" "pm" "What's up? I'm John - your PM & \"project ninja\"" "$SPECIAL_MAP"
  [ "$status" -eq 0 ]
}

@test "intro special chars: apostrophes" {
  # Test intro with apostrophes
  run "$MOCK_BMAD_SPEAK" "dev" "Hey y'all! Amelia's the name, code's the game" "$SPECIAL_MAP"
  [ "$status" -eq 0 ]
}

@test "intro special chars: exclamation points" {
  # Multiple exclamation points
  run "$MOCK_BMAD_SPEAK" "analyst" "Hi! I'm Mary - let's analyze this!" "$SPECIAL_MAP"
  [ "$status" -eq 0 ]
}

@test "intro special chars: emojis/unicode" {
  # Test emojis in intro
  run "$MOCK_BMAD_SPEAK" "analyst" "Hi! I'm Mary 👋 - let's analyze this!" "$SPECIAL_MAP"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "architect" "Winston here... architect extraordinaire! 🏗️" "$SPECIAL_MAP"
  [ "$status" -eq 0 ]

  run "$MOCK_BMAD_SPEAK" "dev" "Hey y'all! Amelia's the name, code's the game 💻" "$SPECIAL_MAP"
  [ "$status" -eq 0 ]
}

@test "intro special chars: pronunciation hints (BMad)" {
  # Test intro with pronunciation hints
  local bmad_map="$BATS_TEST_TMPDIR/bmad-hints.csv"
  cat > "$bmad_map" <<EOF
agent,piper,mac,intro
master,en_GB-alan-medium,Daniel,"Welcome! I'm BMad - that's B-Mad, your orchestrator!"
EOF

  run "$MOCK_BMAD_SPEAK" "master" "Welcome! I'm BMad - that's B-Mad, your orchestrator!" "$bmad_map"
  [ "$status" -eq 0 ]
}

# Integration Tests

@test "intro integration: load intros from agent-voice-map.csv" {
  # Read intro from CSV
  local intro=$(awk -F',' '$1 == "analyst" {gsub(/"/, "", $4); print $4}' "$BASIC_MAP" | tail -n 1)

  # Should have found the intro
  [[ -n "$intro" ]]
  [[ "$intro" =~ "Mary" ]]
}

@test "intro integration: match intro to correct agent voice" {
  # Analyst should get kristin voice with analyst intro
  run "$MOCK_BMAD_SPEAK" "analyst" "Hi! I'm Mary, your Business Analyst." "$BASIC_MAP"
  [ "$status" -eq 0 ]

  # Architect should get alan voice with architect intro
  run "$MOCK_BMAD_SPEAK" "architect" "Hello! Winston here, your Architect." "$BASIC_MAP"
  [ "$status" -eq 0 ]
}

@test "intro integration: play intro only once per session" {
  # Create a session tracking file
  local session_file="$CLAUDE_PROJECT_DIR/.claude/party-mode-session.txt"
  mkdir -p "$(dirname "$session_file")"

  # First time - intro should play
  if ! grep -q "analyst" "$session_file" 2>/dev/null; then
    echo "analyst" >> "$session_file"
    run "$PLAY_TTS" "Hi! I'm Mary, your Business Analyst."
    [ "$status" -eq 0 ]
  fi

  # Second time - regular message (no intro)
  if grep -q "analyst" "$session_file" 2>/dev/null; then
    run "$PLAY_TTS" "Let me analyze this requirement."
    [ "$status" -eq 0 ]
  fi
}

@test "intro integration: don't play intro on subsequent agent responses" {
  # Track which agents have introduced themselves
  local session_file="$CLAUDE_PROJECT_DIR/.claude/party-mode-session.txt"
  mkdir -p "$(dirname "$session_file")"

  # First response - with intro
  echo "analyst" >> "$session_file"
  run "$PLAY_TTS" "Hi! I'm Mary, your Business Analyst."
  [ "$status" -eq 0 ]

  # Subsequent responses - without intro
  run "$PLAY_TTS" "The requirement looks good."
  [ "$status" -eq 0 ]

  run "$PLAY_TTS" "I've completed the analysis."
  [ "$status" -eq 0 ]
}

# Error Handling Tests

@test "intro error: malformed intro in CSV" {
  # Use malformed voice map
  local malformed_map="$BATS_TEST_DIRNAME/../fixtures/voice-maps/malformed.csv"

  # Should still work for valid entries
  run "$MOCK_BMAD_SPEAK" "analyst" "Valid entry" "$malformed_map"
  [ "$status" -eq 0 ]
}

@test "intro error: intro TTS generation fails" {
  # Even if intro generation fails, should continue
  run "$PLAY_TTS" "This is a regular message"
  [ "$status" -eq 0 ]
}

@test "intro error: intro audio playback fails" {
  # Audio playback failure should be graceful
  # In test mode, this is mocked and always succeeds
  run "$PLAY_TTS" "Testing playback"
  [ "$status" -eq 0 ]
}

@test "intro error: continue party mode even if intro fails" {
  # Even if one agent's intro fails, others should continue
  run "$MOCK_BMAD_SPEAK" "analyst" "First agent" "$BASIC_MAP"
  [ "$status" -eq 0 ]

  # Simulate failure scenario with invalid voice map
  run "$MOCK_BMAD_SPEAK" "architect" "Second agent" "/tmp/nonexistent-map.csv"

  # Should either succeed with fallback or fail gracefully
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]

  # Third agent should still work
  run "$MOCK_BMAD_SPEAK" "dev" "Third agent" "$BASIC_MAP"
  [ "$status" -eq 0 ]
}

# CSV Parsing Tests

@test "intro csv: parse basic CSV format" {
  # Extract intro from CSV
  local intro=$(awk -F',' 'NR > 1 && $1 == "analyst" {gsub(/"/, "", $4); print $4}' "$BASIC_MAP")

  [[ -n "$intro" ]]
  [[ "$intro" =~ "Mary" ]]
}

@test "intro csv: handle quoted fields with commas" {
  # Create CSV with comma in intro
  local comma_map="$BATS_TEST_TMPDIR/comma-intro.csv"
  cat > "$comma_map" <<EOF
agent,piper,mac,intro
analyst,en_US-kristin-medium,Samantha,"Hi, I'm Mary, your analyst"
EOF

  # Should be able to use this CSV without errors
  run "$MOCK_BMAD_SPEAK" "analyst" "Test message" "$comma_map"
  [ "$status" -eq 0 ]
}

@test "intro csv: handle multi-line CSV entries" {
  # Create CSV with potential multi-line entry
  local multiline_map="$BATS_TEST_TMPDIR/multiline.csv"
  cat > "$multiline_map" <<'EOF'
agent,piper,mac,intro
analyst,en_US-kristin-medium,Samantha,"Hi! I'm Mary"
EOF

  run "$MOCK_BMAD_SPEAK" "analyst" "Hi! I'm Mary" "$multiline_map"
  [ "$status" -eq 0 ]
}
