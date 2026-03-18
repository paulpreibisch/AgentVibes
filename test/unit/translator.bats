#!/usr/bin/env bats
# Unit tests for translator.py and translate-manager.sh
# Tests Issue #50 (BMAD translation) and Issue #51 (Learning mode translation)

load ../helpers/test-helper

# Helper to strip ANSI color codes from output
strip_colors() {
  echo "$1" | sed -E 's/\x1B\[[0-9;]*[mK]//g'
}

# Helper function for network-dependent tests
# Note: These tests require real network access and deep-translator
# They are skipped when using mock curl (which doesn't support translation API)
skip_if_no_real_network() {
  # Skip if we're using mock curl (test mode with mocked dependencies)
  if [[ -f "${BATS_TEST_TMPDIR}/curl" ]]; then
    skip "Translation tests require real network (mock curl in use)"
  fi
  # Also check actual network connectivity using system curl
  if ! /usr/bin/curl -s --connect-timeout 2 "https://translate.google.com" > /dev/null 2>&1; then
    skip "Network not available for translation tests"
  fi
}

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  TRANSLATOR="$TEST_CLAUDE_DIR/hooks/translator.py"
  TRANSLATE_MANAGER="$TEST_CLAUDE_DIR/hooks/translate-manager.sh"
  LEARN_MANAGER="$TEST_CLAUDE_DIR/hooks/learn-manager.sh"

  # Set up paths
  export PATH="$TEST_CLAUDE_DIR/hooks:$PATH"

  # Set Piper as provider (simpler for tests)
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"

  # Change to project directory so scripts find config
  cd "$CLAUDE_PROJECT_DIR"
}

teardown() {
  teardown_test_env
}

# ============================================
# translator.py tests
# ============================================

@test "translator.py translates English to Spanish" {
  skip_if_no_real_network

  run python3 "$TRANSLATOR" "Hello world" "spanish"

  [ "$status" -eq 0 ]
  # Should contain Spanish translation
  [[ "$output" == *"hola"* ]] || [[ "$output" == *"Hola"* ]]
}

@test "translator.py accepts language codes" {
  skip_if_no_real_network

  run python3 "$TRANSLATOR" "Hello" "es"

  [ "$status" -eq 0 ]
  [[ "$output" == *"hola"* ]] || [[ "$output" == *"Hola"* ]]
}

@test "translator.py detects language" {
  skip_if_no_real_network

  run python3 "$TRANSLATOR" detect "Hola mundo"

  [ "$status" -eq 0 ]
  [[ "$output" == "es" ]]
}

@test "translator.py shows usage without arguments" {
  run python3 "$TRANSLATOR"

  [ "$status" -eq 1 ]
  [[ "$output" == *"Usage:"* ]]
}

# ============================================
# translate-manager.sh tests
# ============================================

@test "translate-manager.sh set spanish saves translation setting" {
  run "$TRANSLATE_MANAGER" set spanish

  [ "$status" -eq 0 ]
  # Check output contains translation confirmation (case-insensitive, ignoring ANSI)
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"Translation set to"* ]] || [[ "$clean_output" == *"spanish"* ]]

  # Verify file was created
  [ -f ".claude/tts-translate-to.txt" ]
  [[ "$(cat ".claude/tts-translate-to.txt")" == "spanish" ]]
}

@test "translate-manager.sh off disables translation" {
  "$TRANSLATE_MANAGER" set spanish
  run "$TRANSLATE_MANAGER" off

  [ "$status" -eq 0 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"DISABLED"* ]]
  [[ "$(cat ".claude/tts-translate-to.txt")" == "off" ]]
}

@test "translate-manager.sh auto uses BMAD config" {
  run "$TRANSLATE_MANAGER" auto

  [ "$status" -eq 0 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"AUTO"* ]]
}

@test "translate-manager.sh status shows current settings" {
  run "$TRANSLATE_MANAGER" status

  [ "$status" -eq 0 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"Translation Settings"* ]]
}

@test "translate-manager.sh get-translate-to returns language" {
  "$TRANSLATE_MANAGER" set french > /dev/null 2>&1

  # Must run from same directory where 'set' wrote the config
  # Set LC_ALL=C before bash to suppress locale warnings
  run env LC_ALL=C bash -c "cd '$CLAUDE_PROJECT_DIR' && $TRANSLATE_MANAGER get-translate-to" 2>/dev/null

  [ "$status" -eq 0 ]
  [[ "$output" == "french" ]]
}

@test "translate-manager.sh is-enabled returns OFF when disabled" {
  "$TRANSLATE_MANAGER" off

  run "$TRANSLATE_MANAGER" is-enabled

  [ "$status" -eq 1 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"OFF"* ]]
}

@test "translate-manager.sh is-enabled returns ON when enabled" {
  "$TRANSLATE_MANAGER" set german

  run "$TRANSLATE_MANAGER" is-enabled

  [ "$status" -eq 0 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"ON"* ]]
}

@test "translate-manager.sh rejects unsupported language" {
  run "$TRANSLATE_MANAGER" set klingon

  [ "$status" -eq 1 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"not supported"* ]]
}

# ============================================
# BMAD integration tests
# ============================================

@test "translate-manager.sh detects BMAD communication_language" {
  # Create mock BMAD config in the project directory
  mkdir -p "$CLAUDE_PROJECT_DIR/.bmad/core"
  cat > "$CLAUDE_PROJECT_DIR/.bmad/core/config.yaml" << 'EOF'
communication_language: Spanish
document_output_language: Spanish
EOF

  # Must run from project directory where BMAD config exists
  # Set LC_ALL=C before bash to suppress locale warnings
  run env LC_ALL=C bash -c "cd '$CLAUDE_PROJECT_DIR' && $TRANSLATE_MANAGER get-bmad-language" 2>/dev/null

  [ "$status" -eq 0 ]
  [[ "$output" == "spanish" ]]
}

@test "translate-manager.sh auto uses BMAD language when set" {
  # Create mock BMAD config in the project directory
  mkdir -p "$CLAUDE_PROJECT_DIR/.bmad/core"
  cat > "$CLAUDE_PROJECT_DIR/.bmad/core/config.yaml" << 'EOF'
communication_language: French
EOF

  "$TRANSLATE_MANAGER" auto > /dev/null 2>&1

  # Must run from project directory where BMAD config and tts-translate-to.txt exist
  # Set LC_ALL=C before bash to suppress locale warnings
  run env LC_ALL=C bash -c "cd '$CLAUDE_PROJECT_DIR' && $TRANSLATE_MANAGER get-translate-to" 2>/dev/null

  [ "$status" -eq 0 ]
  [[ "$output" == "french" ]]
}

# ============================================
# Learning mode auto-translation tests (Issue #51)
# ============================================

@test "learn-manager.sh enables learning mode" {
  run "$LEARN_MANAGER" enable

  [ "$status" -eq 0 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"ENABLED"* ]]
}

@test "learn-manager.sh disables learning mode" {
  "$LEARN_MANAGER" enable
  run "$LEARN_MANAGER" disable

  [ "$status" -eq 0 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"DISABLED"* ]]
}

@test "learn-manager.sh is-enabled returns correct status" {
  "$LEARN_MANAGER" disable
  run "$LEARN_MANAGER" is-enabled

  [ "$status" -eq 1 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"OFF"* ]]

  "$LEARN_MANAGER" enable
  run "$LEARN_MANAGER" is-enabled

  [ "$status" -eq 0 ]
  clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"ON"* ]]
}

@test "learn-manager.sh set-target-language sets language and voice" {
  run "$LEARN_MANAGER" set-target-language spanish

  [ "$status" -eq 0 ]
  local clean_output=$(strip_colors "$output")
  [[ "$clean_output" == *"Target language set to"* ]]
  [[ "$clean_output" == *"Target voice automatically set"* ]]
}
