#!/usr/bin/env bats
# Unit tests for voice-manager.sh

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  # Set up voice manager script path
  VOICE_MANAGER="$TEST_CLAUDE_DIR/hooks/voice-manager.sh"
}

teardown() {
  teardown_test_env
}

@test "voice-manager list shows available voices" {
  run "$VOICE_MANAGER" list

  [ "$status" -eq 0 ]
  # Output format includes provider name (Piper or macOS)
  # Check for key components rather than exact format
  assert_output_contains "Available"
  assert_output_contains "Voices"
  # In test mode, might show no voices if none downloaded
  # This is OK - just verify the command works
}

@test "voice-manager get returns default voice" {
  run "$VOICE_MANAGER" get

  [ "$status" -eq 0 ]
  # Should return default voice (en_US-lessac-medium)
  # Just verify it returns something without failing
  [[ -n "$output" ]]
}

@test "voice-manager switch changes voice" {
  # Switch to a standard voice name (doesn't need to be downloaded in tests)
  run "$VOICE_MANAGER" switch "en_US-ryan-high"

  [ "$status" -eq 0 ]
  # Should show success message
  assert_output_contains "Voice switched to: en_US-ryan-high"

  # Verify voice was saved
  run "$VOICE_MANAGER" get
  assert_output_contains "en_US-ryan-high"
}

@test "voice-manager switch by number works" {
  skip "Numeric voice selection not yet implemented"
  run "$VOICE_MANAGER" switch "1"

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to:"
}

@test "voice-manager switch --silent does not play audio" {
  # Switch to a standard voice with --silent flag
  run "$VOICE_MANAGER" switch "en_US-amy-medium" --silent

  [ "$status" -eq 0 ]
  # Should show success message
  assert_output_contains "Voice switched to: en_US-amy-medium"

  # Should NOT contain the introduction message in output
  # (it would only appear if TTS was called)
}

@test "voice-manager switch with invalid voice fails" {
  skip "In test mode, voice validation is skipped for flexibility"
  run "$VOICE_MANAGER" switch "NonExistentVoice"

  [ "$status" -eq 1 ]
  assert_output_contains "not found"
}

@test "voice-manager whoami shows current configuration" {
  # Set a voice using a standard voice
  "$VOICE_MANAGER" switch "en_US-joe-medium" --silent

  run "$VOICE_MANAGER" whoami

  [ "$status" -eq 0 ]
  assert_output_contains "Current Voice Configuration"
  assert_output_contains "Voice: en_US-joe-medium"
}

@test "voice-manager replay uses project-local directory" {
  # Create test audio file in project-local directory
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio"
  touch "$CLAUDE_PROJECT_DIR/.claude/audio/tts-123456.mp3"

  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 0 ]
  assert_output_contains "Replaying audio #1"
  # Use pwd -P to resolve symlinks (e.g. /tmp -> /c/Users/... on Windows Git Bash)
  expected_path=$(cd "$CLAUDE_PROJECT_DIR/.claude/audio" && pwd -P)/tts-123456.mp3
  assert_output_contains "$expected_path"
}

@test "voice-manager replay falls back to HOME when no project directory" {
  unset CLAUDE_PROJECT_DIR
  mkdir -p "$TEST_HOME/.claude/audio"
  touch "$TEST_HOME/.claude/audio/tts-789012.mp3"

  cd "$TEST_HOME"

  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 0 ]
  assert_output_contains "Replaying audio #1"
  # Use pwd -P to resolve symlinks (e.g. /tmp -> /c/Users/... on Windows Git Bash)
  expected_path=$(cd "$TEST_HOME/.claude/audio" && pwd -P)/tts-789012.mp3
  assert_output_contains "$expected_path"
}

@test "voice-manager replay with no audio history fails gracefully" {
  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 1 ]
  # Accept either error message format
  [[ "$output" =~ "No audio history found"|"Audio #1 not found in history" ]]
}

@test "voice-manager replay shows both filename and path" {
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio"
  touch "$CLAUDE_PROJECT_DIR/.claude/audio/tts-999999.mp3"

  run "$VOICE_MANAGER" replay 1

  [ "$status" -eq 0 ]
  assert_output_contains "File: tts-999999.mp3"
  # macOS resolves /var/folders -> /private/var/folders; normalise before comparing
  local expected_path
  expected_path=$(cd "$CLAUDE_PROJECT_DIR/.claude/audio" && pwd -P)/tts-999999.mp3
  assert_output_contains "Path: $expected_path"
}

# --- Kokoro catalog-backed switch validation (AVI-S9.3, Phase 2) --------------
# These prove the switch-time MEMBERSHIP validation (catalog_validate_voice),
# canonical case-fold, the AGENTVIBES_ALLOW_UNLISTED_VOICE escape hatch, and the
# resolver-style FAIL-SAFE fallback when provider-catalog.sh is missing.

# Route voice-manager to the kokoro provider (provider file lives in the same
# .claude dir voice-manager resolves for reads/writes: CLAUDE_PROJECT_DIR/.claude).
_use_kokoro_provider() {
  echo "kokoro" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
}

@test "voice-manager kokoro switch accepts a catalog voice" {
  _use_kokoro_provider
  run "$VOICE_MANAGER" switch "am_michael" --silent

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to: am_michael"
  run "$VOICE_MANAGER" get
  assert_output_contains "am_michael"
}

@test "voice-manager kokoro switch case-folds AM_MICHAEL to am_michael" {
  _use_kokoro_provider
  run "$VOICE_MANAGER" switch "AM_MICHAEL" --silent

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to: am_michael"
}

@test "voice-manager kokoro switch rejects a typo (af_hart) without saving it" {
  _use_kokoro_provider
  echo "am_michael" > "$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"  # sentinel

  run "$VOICE_MANAGER" switch "af_hart" --silent
  [ "$status" -eq 1 ]
  assert_output_contains "Kokoro voice not found"

  # The typo must NOT have been written over the sentinel.
  run cat "$CLAUDE_PROJECT_DIR/.claude/tts-voice.txt"
  assert_output_contains "am_michael"
}

@test "voice-manager kokoro escape hatch allows an unlisted shape-valid voice" {
  _use_kokoro_provider
  export AGENTVIBES_ALLOW_UNLISTED_VOICE=1
  run "$VOICE_MANAGER" switch "xz_newvoice" --silent

  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to: xz_newvoice"
}

@test "voice-manager kokoro escape hatch still rejects a shape-invalid voice" {
  _use_kokoro_provider
  export AGENTVIBES_ALLOW_UNLISTED_VOICE=1
  run "$VOICE_MANAGER" switch "BadVoice!" --silent

  [ "$status" -eq 1 ]
}

@test "voice-manager kokoro switch fails safe to legacy regex when catalog is missing" {
  _use_kokoro_provider
  # Hide the generated catalog artifact to simulate installed-tree skew.
  mv "$TEST_CLAUDE_DIR/hooks/provider-catalog.sh" "$TEST_CLAUDE_DIR/hooks/provider-catalog.sh.hidden"

  # A shape-valid voice still switches via the legacy fallback path.
  run "$VOICE_MANAGER" switch "am_puck" --silent
  [ "$status" -eq 0 ]
  assert_output_contains "Voice switched to: am_puck"

  # A shape-invalid voice is still rejected on the legacy path.
  run "$VOICE_MANAGER" switch "nope!" --silent
  [ "$status" -eq 1 ]
}

@test "voice-manager kokoro list-simple emits the full catalog set" {
  _use_kokoro_provider
  run "$VOICE_MANAGER" list-simple

  [ "$status" -eq 0 ]
  # A representative id from a NON-English language block only present in the full
  # ~54-id catalog list (not the legacy 16-id subset) proves catalog-driven output.
  assert_output_contains "km_hyunsu"
  assert_output_contains "af_heart"
}
