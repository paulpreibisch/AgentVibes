#!/usr/bin/env bats

# Test: Background music respects disabled flag
# When background music is disabled, audio-processor should skip mixing

load '../helpers/test-helper'

setup() {
  setup_test_env

  # Set up test config
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio/tracks"

  # Create a dummy background music file
  echo "dummy" > "$CLAUDE_PROJECT_DIR/.claude/audio/tracks/test_track.mp3"

  # Create audio-effects.cfg with default track
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CONFIG'
# Format: AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|VOLUME
default||test_track.mp3|0.30
CONFIG
}

teardown() {
  teardown_test_env

  # Clean up test files in repo (calculate repo root)
  REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
  rm -f "$REPO_ROOT/.claude/config/background-music-enabled.txt"
}

@test "background music is NOT mixed when disabled" {
  # Calculate repo root (BATS_TEST_DIRNAME is test/unit, so go up two levels)
  REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

  # Disable background music (create in repo's config dir where script looks)
  mkdir -p "$REPO_ROOT/.claude/config"
  echo "false" > "$REPO_ROOT/.claude/config/background-music-enabled.txt"

  # Run audio processor (it should skip background music)
  export AGENTVIBES_TEST_MODE=true

  # Create a dummy input WAV file (audio-processor.sh validates input exists)
  cd "$CLAUDE_PROJECT_DIR"
  echo "RIFF....WAVEfmt " > test.wav

  # Run audio processor
  output=$(bash "$REPO_ROOT/.claude/hooks/audio-processor.sh" "test.wav" "" "test" 2>&1 || true)

  # Verify background music was NOT mentioned in output
  if echo "$output" | grep -q "Mixing background:"; then
    echo "FAIL: Background music was mixed even though it's disabled!"
    echo "Output: $output"
    return 1
  fi

  # Success - no background music mentioned
  return 0
}

@test "background music IS mixed when enabled" {
  # Calculate repo root (BATS_TEST_DIRNAME is test/unit, so go up two levels)
  REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

  # Enable background music (create in repo's config dir where script looks)
  mkdir -p "$REPO_ROOT/.claude/config"
  echo "true" > "$REPO_ROOT/.claude/config/background-music-enabled.txt"

  # Run audio processor
  export AGENTVIBES_TEST_MODE=true

  # Create a dummy input WAV file (audio-processor.sh validates input exists)
  cd "$CLAUDE_PROJECT_DIR"
  echo "RIFF....WAVEfmt " > test.wav

  # Run audio processor
  output=$(bash "$REPO_ROOT/.claude/hooks/audio-processor.sh" "test.wav" "" "test" 2>&1 || true)

  # Verify background music WAS mentioned in output
  if ! echo "$output" | grep -q "Mixing background:"; then
    echo "FAIL: Background music was NOT mixed even though it's enabled!"
    echo "Output: $output"
    return 1
  fi

  # Success - background music mentioned
  return 0
}

@test "background music defaults to disabled if config missing" {
  # Calculate repo root (BATS_TEST_DIRNAME is test/unit, so go up two levels)
  REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

  # Remove the enabled config file (make sure it doesn't exist)
  rm -f "$REPO_ROOT/.claude/config/background-music-enabled.txt"

  # Run audio processor
  export AGENTVIBES_TEST_MODE=true

  # Create a dummy input WAV file (audio-processor.sh validates input exists)
  cd "$CLAUDE_PROJECT_DIR"
  echo "RIFF....WAVEfmt " > test.wav

  # Run audio processor
  output=$(bash "$REPO_ROOT/.claude/hooks/audio-processor.sh" "test.wav" "" "test" 2>&1 || true)

  # Verify background music was NOT mixed (default is disabled)
  if echo "$output" | grep -q "Mixing background:"; then
    echo "FAIL: Background music was mixed when config is missing (should default to disabled)!"
    echo "Output: $output"
    return 1
  fi

  # Success - no background music mentioned
  return 0
}
