#!/usr/bin/env bats

# Test: Background music respects disabled flag
# When background music is disabled, audio-processor should skip mixing

load '../helpers/test-helper'

setup() {
  setup_test_env

  # audio-processor.sh reads CONFIG_FILE from SCRIPT_DIR/../config (the actual repo .claude/config/).
  # .claude/config/audio-effects.cfg is gitignored so CI never has it — write it here with a
  # committed track so the background-music-enabled test can find a real file to mix.
  # Note: bats runs tests sequentially (one setup→test→teardown per test); no concurrent conflict.
  local repo_root="${BATS_TEST_DIRNAME}/../.."
  mkdir -p "$repo_root/.claude/config"

  # Backup BEFORE any write — if the write fails, teardown can still restore the original.
  if [[ -f "$repo_root/.claude/config/audio-effects.cfg" ]]; then
    cp "$repo_root/.claude/config/audio-effects.cfg" "$BATS_TEST_TMPDIR/audio-effects.cfg.bak"
  fi

  # Backup background-music-enabled.txt so teardown can restore it (Node.js tests depend on it).
  if [[ -f "$repo_root/.claude/config/background-music-enabled.txt" ]]; then
    cp "$repo_root/.claude/config/background-music-enabled.txt" "$BATS_TEST_TMPDIR/background-music-enabled.txt.bak"
  fi

  # Fix #13: Atomic write — write to temp file then move to prevent partial-write corruption.
  local tmp_cfg
  tmp_cfg=$(mktemp "$repo_root/.claude/config/audio-effects.cfg.XXXXXX")
  cat > "$tmp_cfg" << 'CONFIG'
default||agentvibes_soft_flamenco_loop.mp3|0.30
CONFIG
  mv "$tmp_cfg" "$repo_root/.claude/config/audio-effects.cfg"
}

teardown() {
  teardown_test_env

  local repo_root="${BATS_TEST_DIRNAME}/../.."

  # Restore audio-effects.cfg to pre-test state
  if [[ -f "$BATS_TEST_TMPDIR/audio-effects.cfg.bak" ]]; then
    cp "$BATS_TEST_TMPDIR/audio-effects.cfg.bak" "$repo_root/.claude/config/audio-effects.cfg"
  else
    rm -f "$repo_root/.claude/config/audio-effects.cfg"
  fi

  # Restore background-music-enabled.txt to pre-test state (Node.js tests need it intact).
  if [[ -f "$BATS_TEST_TMPDIR/background-music-enabled.txt.bak" ]]; then
    cp "$BATS_TEST_TMPDIR/background-music-enabled.txt.bak" "$repo_root/.claude/config/background-music-enabled.txt"
  else
    rm -f "$repo_root/.claude/config/background-music-enabled.txt"
  fi
}

@test "background music is NOT mixed when disabled" {
  REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

  mkdir -p "$REPO_ROOT/.claude/config"
  echo "false" > "$REPO_ROOT/.claude/config/background-music-enabled.txt"

  export AGENTVIBES_TEST_MODE=true

  cd "$CLAUDE_PROJECT_DIR"
  echo "RIFF....WAVEfmt " > test.wav

  output=$(bash "$REPO_ROOT/.claude/hooks/audio-processor.sh" "test.wav" "" "test" 2>&1 || true)

  if echo "$output" | grep -q "Mixing background:"; then
    echo "FAIL: Background music was mixed even though it's disabled!"
    echo "Output: $output"
    return 1
  fi
}

@test "background music IS mixed when enabled" {
  REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

  # Fix #3: Assert the required track exists before running the test that depends on it.
  local track="$REPO_ROOT/.claude/audio/tracks/agentvibes_soft_flamenco_loop.mp3"
  if [[ ! -f "$track" ]]; then
    skip "Required track not found: agentvibes_soft_flamenco_loop.mp3 (git checkout issue?)"
  fi

  mkdir -p "$REPO_ROOT/.claude/config"
  echo "true" > "$REPO_ROOT/.claude/config/background-music-enabled.txt"

  export AGENTVIBES_TEST_MODE=true

  cd "$CLAUDE_PROJECT_DIR"
  echo "RIFF....WAVEfmt " > test.wav

  output=$(bash "$REPO_ROOT/.claude/hooks/audio-processor.sh" "test.wav" "" "test" 2>&1 || true)

  # Fix #8: Two-level assertion:
  # (1) "Mixing background:" confirms the if-block was entered.
  # (2) The background path in stdout confirms used_background was set (mixing block completed).
  if ! echo "$output" | grep -q "Mixing background:"; then
    echo "FAIL: Background music was NOT mixed even though it's enabled!"
    echo "Output: $output"
    return 1
  fi

  if ! echo "$output" | grep -q "agentvibes_soft_flamenco_loop"; then
    echo "FAIL: Background path not present in output — mixing if-block may not have completed."
    echo "Output: $output"
    return 1
  fi
}

@test "background music defaults to disabled if config missing" {
  REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

  rm -f "$REPO_ROOT/.claude/config/background-music-enabled.txt"

  export AGENTVIBES_TEST_MODE=true

  cd "$CLAUDE_PROJECT_DIR"
  echo "RIFF....WAVEfmt " > test.wav

  output=$(bash "$REPO_ROOT/.claude/hooks/audio-processor.sh" "test.wav" "" "test" 2>&1 || true)

  if echo "$output" | grep -q "Mixing background:"; then
    echo "FAIL: Background music was mixed when config is missing (should default to disabled)!"
    echo "Output: $output"
    return 1
  fi
}
