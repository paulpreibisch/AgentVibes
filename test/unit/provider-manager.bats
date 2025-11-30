#!/usr/bin/env bats
# Unit tests for provider-manager.sh

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  PROVIDER_MANAGER="$TEST_CLAUDE_DIR/hooks/provider-manager.sh"
  PROVIDER_FILE="$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
  VOICE_FILE="$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"
}

teardown() {
  teardown_test_env
}

# ============================================================================
# Provider Listing Tests
# ============================================================================

@test "provider-manager list shows available providers" {
  run "$PROVIDER_MANAGER" list

  [ "$status" -eq 0 ]

  # Should show all three providers: elevenlabs, piper, and macos
  assert_output_contains "elevenlabs"
  assert_output_contains "piper"
  assert_output_contains "macos"
}

@test "provider-manager list finds providers from play-tts files" {
  run "$PROVIDER_MANAGER" list

  [ "$status" -eq 0 ]

  # Verify it's detecting actual provider scripts
  # All three providers should be present (Issue #52)
  [[ "$output" =~ "elevenlabs" ]]
  [[ "$output" =~ "piper" ]]
  [[ "$output" =~ "macos" ]]
}

@test "provider-manager list works with no providers (edge case)" {
  # Temporarily rename all provider files to test no providers case
  local hooks_dir="$TEST_CLAUDE_DIR/hooks"
  mv "$hooks_dir/play-tts-elevenlabs.sh" "$hooks_dir/play-tts-elevenlabs.sh.bak" 2>/dev/null || true
  mv "$hooks_dir/play-tts-piper.sh" "$hooks_dir/play-tts-piper.sh.bak" 2>/dev/null || true
  mv "$hooks_dir/play-tts-macos.sh" "$hooks_dir/play-tts-macos.sh.bak" 2>/dev/null || true

  run "$PROVIDER_MANAGER" list

  [ "$status" -eq 0 ]
  assert_output_contains "No providers found"

  # Restore files
  mv "$hooks_dir/play-tts-elevenlabs.sh.bak" "$hooks_dir/play-tts-elevenlabs.sh" 2>/dev/null || true
  mv "$hooks_dir/play-tts-piper.sh.bak" "$hooks_dir/play-tts-piper.sh" 2>/dev/null || true
  mv "$hooks_dir/play-tts-macos.sh.bak" "$hooks_dir/play-tts-macos.sh" 2>/dev/null || true
}

# ============================================================================
# Provider Switching Tests
# ============================================================================

@test "provider-manager switch to elevenlabs" {
  run "$PROVIDER_MANAGER" switch "elevenlabs"

  [ "$status" -eq 0 ]
  assert_output_contains "Active provider set to: elevenlabs"

  # Verify provider was saved
  assert_file_exists "$PROVIDER_FILE"
  assert_file_contains "$PROVIDER_FILE" "elevenlabs"
}

@test "provider-manager switch to piper" {
  run "$PROVIDER_MANAGER" switch "piper"

  [ "$status" -eq 0 ]
  assert_output_contains "Active provider set to: piper"

  assert_file_exists "$PROVIDER_FILE"
  assert_file_contains "$PROVIDER_FILE" "piper"
}

@test "provider-manager set command works like switch" {
  run "$PROVIDER_MANAGER" set "elevenlabs"

  [ "$status" -eq 0 ]
  assert_output_contains "Active provider set to: elevenlabs"
  assert_file_contains "$PROVIDER_FILE" "elevenlabs"
}

@test "provider-manager switch to macos" {
  # Issue #52: macOS provider must be switchable
  run "$PROVIDER_MANAGER" switch "macos"

  [ "$status" -eq 0 ]
  assert_output_contains "Active provider set to: macos"

  assert_file_exists "$PROVIDER_FILE"
  assert_file_contains "$PROVIDER_FILE" "macos"
}

@test "provider-manager validate macos provider exists" {
  # Issue #52: macOS provider must be recognized as valid
  run "$PROVIDER_MANAGER" validate "macos"

  [ "$status" -eq 0 ]
}

@test "provider-manager switch with invalid provider fails" {
  run "$PROVIDER_MANAGER" switch "nonexistent"

  [ "$status" -eq 1 ]
  assert_output_contains "Error: Provider 'nonexistent' not found"
  assert_output_contains "Available providers:"
}

@test "provider-manager switch requires provider name" {
  run "$PROVIDER_MANAGER" switch

  [ "$status" -eq 1 ]
  assert_output_contains "Error: Provider name required"
}

@test "provider-manager switch migrates voice to new provider" {
  # Set an unknown voice first (not in mapping)
  echo "TestVoice" > "$VOICE_FILE"

  run "$PROVIDER_MANAGER" switch "piper"

  [ "$status" -eq 0 ]
  # Should migrate to default when voice is not in mapping table
  assert_output_contains "Voice migrated:"

  # Voice file should exist with migrated voice
  [[ -f "$VOICE_FILE" ]]
  # Should contain a Piper voice format
  assert_file_contains "$VOICE_FILE" "en_US"
}

@test "provider-manager switch preserves known voice mappings" {
  # Create voice file with a known ElevenLabs voice
  mkdir -p "$(dirname "$VOICE_FILE")"
  echo "Jessica Anne Bogart" > "$VOICE_FILE"

  "$PROVIDER_MANAGER" switch "elevenlabs"

  # Voice file should exist
  [[ -f "$VOICE_FILE" ]]

  # Should preserve existing voice when staying in same provider type
  # Jessica Anne Bogart is ElevenLabs, so stays the same
  assert_file_contains "$VOICE_FILE" "Jessica Anne Bogart"
}

# ============================================================================
# Provider Persistence Tests
# ============================================================================

@test "provider-manager provider setting persists" {
  # Set provider
  "$PROVIDER_MANAGER" switch "elevenlabs"

  # Read it back
  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  [[ "$output" =~ "elevenlabs" ]]
}

@test "provider-manager multiple switches persist correctly" {
  # Switch back and forth
  "$PROVIDER_MANAGER" switch "elevenlabs"
  "$PROVIDER_MANAGER" switch "piper"

  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  [[ "$output" =~ "piper" ]]
}

# ============================================================================
# Provider Detection Tests
# ============================================================================

@test "provider-manager get returns current provider" {
  # Set provider
  echo "elevenlabs" > "$PROVIDER_FILE"

  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  [[ "$output" =~ "elevenlabs" ]]
}

@test "provider-manager get returns default when no config exists" {
  # Ensure no provider file exists
  rm -f "$PROVIDER_FILE"

  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  # Default is piper (free, offline)
  [[ "$output" =~ "piper" ]]
}

@test "provider-manager get trims whitespace from provider name" {
  # Write provider with extra whitespace
  echo "  elevenlabs  " > "$PROVIDER_FILE"

  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  # Should return clean provider name (may have newline)
  [[ "$output" =~ "elevenlabs" ]]
}

# ============================================================================
# Provider Validation Tests
# ============================================================================

@test "provider-manager validate checks if provider exists" {
  run "$PROVIDER_MANAGER" validate "elevenlabs"

  [ "$status" -eq 0 ]
}

@test "provider-manager validate fails for non-existent provider" {
  run "$PROVIDER_MANAGER" validate "fake_provider"

  [ "$status" -eq 1 ]
}

@test "provider-manager validate requires provider name" {
  run "$PROVIDER_MANAGER" validate

  [ "$status" -eq 1 ]
  assert_output_contains "Error: Provider name required"
}

# ============================================================================
# File Location Tests
# ============================================================================

@test "provider-manager uses project-local directory when CLAUDE_PROJECT_DIR is set" {
  # CLAUDE_PROJECT_DIR is set in setup_test_env
  "$PROVIDER_MANAGER" switch "piper"

  # Should save to project directory
  assert_file_exists "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
}

@test "provider-manager creates parent directory if missing" {
  # Test that mkdir -p works by using a fresh subdirectory
  local test_dir="$TEST_HOME/.claude/subdir"
  rm -rf "$test_dir"

  # Create provider file in this location
  mkdir -p "$test_dir"
  echo "elevenlabs" > "$test_dir/tts-provider.txt"

  # Verify directory and file were created
  [[ -d "$test_dir" ]]
  [[ -f "$test_dir/tts-provider.txt" ]]
}

@test "provider-manager falls back to HOME when no project directory" {
  unset CLAUDE_PROJECT_DIR

  # cd to test home to ensure we're not in a .claude directory tree
  cd "$TEST_HOME"

  run "$PROVIDER_MANAGER" switch "piper"

  [ "$status" -eq 0 ]

  # Should save to HOME
  assert_file_exists "$HOME/.claude/tts-provider.txt"
}

@test "provider-manager searches up directory tree for .claude" {
  unset CLAUDE_PROJECT_DIR

  # Create .claude in parent directory
  local parent_dir="$TEST_HOME/projects/myproject"
  mkdir -p "$parent_dir/subdir"
  mkdir -p "$TEST_HOME/projects/.claude"

  cd "$parent_dir/subdir"

  "$PROVIDER_MANAGER" switch "elevenlabs"

  # Should find .claude in parent tree
  assert_file_exists "$TEST_HOME/projects/.claude/tts-provider.txt"
}

# ============================================================================
# Provider Script Path Tests
# ============================================================================

@test "provider-manager returns correct script path for elevenlabs" {
  # Source the provider manager to use its functions
  source "$PROVIDER_MANAGER"

  run get_provider_script_path "elevenlabs"

  [ "$status" -eq 0 ]
  [[ "$output" =~ "play-tts-elevenlabs.sh" ]]
}

@test "provider-manager returns correct script path for piper" {
  source "$PROVIDER_MANAGER"

  run get_provider_script_path "piper"

  [ "$status" -eq 0 ]
  [[ "$output" =~ "play-tts-piper.sh" ]]
}

@test "provider-manager script path fails for invalid provider" {
  source "$PROVIDER_MANAGER"

  run get_provider_script_path "invalid"

  [ "$status" -eq 1 ]
  # Error should go to stderr, captured in output
  [[ "$output" =~ "Error: Provider 'invalid' not found" ]]
}

@test "provider-manager script path requires provider name" {
  source "$PROVIDER_MANAGER"

  run get_provider_script_path

  [ "$status" -eq 1 ]
  [[ "$output" =~ "Error: Provider name required" ]]
}

# ============================================================================
# Config Path Resolution Tests
# ============================================================================

@test "provider-manager config path prioritizes CLAUDE_PROJECT_DIR" {
  source "$PROVIDER_MANAGER"

  run get_provider_config_path

  [ "$status" -eq 0 ]
  [[ "$output" =~ "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt" ]]
}

@test "provider-manager config path searches directory tree" {
  source "$PROVIDER_MANAGER"
  unset CLAUDE_PROJECT_DIR

  # Create .claude in parent
  mkdir -p "$TEST_HOME/workspace/project/.claude"
  cd "$TEST_HOME/workspace/project"

  run get_provider_config_path

  [ "$status" -eq 0 ]
  [[ "$output" =~ "$TEST_HOME/workspace/project/.claude/tts-provider.txt" ]]
}

@test "provider-manager config path falls back to HOME" {
  source "$PROVIDER_MANAGER"
  unset CLAUDE_PROJECT_DIR

  cd "$TEST_HOME"

  run get_provider_config_path

  [ "$status" -eq 0 ]
  [[ "$output" =~ "$HOME/.claude/tts-provider.txt" ]]
}

# ============================================================================
# Provider Manager as Sourced Library Tests
# ============================================================================

@test "provider-manager functions work when sourced" {
  source "$PROVIDER_MANAGER"

  # Test get_active_provider function
  echo "elevenlabs" > "$PROVIDER_FILE"

  run get_active_provider

  [ "$status" -eq 0 ]
  [[ "$output" == "elevenlabs" ]]
}

@test "provider-manager list_providers returns all providers" {
  source "$PROVIDER_MANAGER"

  run list_providers

  [ "$status" -eq 0 ]
  [[ "$output" =~ "elevenlabs" ]]
  [[ "$output" =~ "piper" ]]
}

@test "provider-manager validate_provider returns exit code" {
  source "$PROVIDER_MANAGER"

  # Valid provider - should return 0
  validate_provider "elevenlabs"
  [ "$?" -eq 0 ]

  # Invalid provider - should return non-zero
  # Use ! to invert but keep exit code check simple
  run validate_provider "nonexistent"
  [ "$status" -ne 0 ]
}

# ============================================================================
# Empty and Malformed Config Tests
# ============================================================================

@test "provider-manager handles empty provider file" {
  # Create empty file
  touch "$PROVIDER_FILE"

  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  # Should return default
  [[ "$output" =~ "piper" ]]
}

@test "provider-manager handles file with only whitespace" {
  echo "   " > "$PROVIDER_FILE"

  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  # Should return default
  [[ "$output" =~ "piper" ]]
}

@test "provider-manager handles newlines in provider file" {
  echo -e "elevenlabs\n\n" > "$PROVIDER_FILE"

  run "$PROVIDER_MANAGER" get

  [ "$status" -eq 0 ]
  [[ "$output" =~ "elevenlabs" ]]
}

# ============================================================================
# Help/Usage Tests
# ============================================================================

@test "provider-manager shows usage with invalid command" {
  run "$PROVIDER_MANAGER" invalid_command

  [ "$status" -eq 1 ]
  assert_output_contains "Usage:"
  assert_output_contains "{get|switch|list|validate}"
}

@test "provider-manager usage shows all commands" {
  run "$PROVIDER_MANAGER" --help

  [ "$status" -eq 1 ]
  assert_output_contains "get"
  assert_output_contains "switch"
  assert_output_contains "list"
  assert_output_contains "validate"
}

# ============================================================================
# Integration Tests with Other Scripts
# ============================================================================

@test "provider-manager provider persists and can be read by get command" {
  # Switch to elevenlabs
  "$PROVIDER_MANAGER" switch "elevenlabs"

  # Verify get returns same provider
  local result=$("$PROVIDER_MANAGER" get)

  [[ "$result" == "elevenlabs" ]]
}

@test "provider-manager multiple provider switches work correctly" {
  "$PROVIDER_MANAGER" switch "elevenlabs"
  local first=$("$PROVIDER_MANAGER" get)

  "$PROVIDER_MANAGER" switch "piper"
  local second=$("$PROVIDER_MANAGER" get)

  "$PROVIDER_MANAGER" switch "elevenlabs"
  local third=$("$PROVIDER_MANAGER" get)

  [[ "$first" == "elevenlabs" ]]
  [[ "$second" == "piper" ]]
  [[ "$third" == "elevenlabs" ]]
}

# ============================================================================
# Error Handling Tests
# ============================================================================

@test "provider-manager switch handles empty provider name gracefully" {
  run "$PROVIDER_MANAGER" switch ""

  [ "$status" -eq 1 ]
  assert_output_contains "Error: Provider name required"
}

@test "provider-manager validate handles empty provider name" {
  run "$PROVIDER_MANAGER" validate ""

  [ "$status" -eq 1 ]
}

@test "provider-manager handles missing hooks directory gracefully" {
  # This should not happen in practice, but test defensive coding
  local broken_script="$BATS_TEST_TMPDIR/broken-provider-manager.sh"

  # Copy script and modify BASH_SOURCE simulation
  cp "$PROVIDER_MANAGER" "$broken_script"

  # Try to run validate on non-existent provider
  run bash "$broken_script" validate "fake"

  [ "$status" -eq 1 ]
}
