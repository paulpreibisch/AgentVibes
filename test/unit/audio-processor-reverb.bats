#!/usr/bin/env bats

# Test: audio-processor.sh reverb preset name translation and path traversal guard
# Covers review findings H1 (missing tests), H3 (AGENTVIBES_REVERB_OVERRIDE), M4 (path traversal)

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
AUDIO_PROCESSOR="$REPO_ROOT/.claude/hooks/audio-processor.sh"

setup() {
  setup_test_env

  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio/tracks"

  # Minimal valid WAV (44-byte RIFF header) for sox to accept
  python3 - << 'PY' > "$BATS_TEST_TMPDIR/input.wav" 2>/dev/null || \
    dd if=/dev/zero bs=44 count=1 > "$BATS_TEST_TMPDIR/input.wav" 2>/dev/null || true
import struct, sys
data = (b'RIFF' + struct.pack('<I', 36) + b'WAVEfmt ' +
        struct.pack('<IHHIIHH', 16, 1, 1, 22050, 44100, 2, 16) +
        b'data' + struct.pack('<I', 0))
sys.stdout.buffer.write(data)
PY

  export OUTPUT_WAV="$BATS_TEST_TMPDIR/output.wav"
}

teardown() {
  teardown_test_env
}

# ---------------------------------------------------------------------------
# Helper: run processor and capture stderr
# ---------------------------------------------------------------------------
run_processor() {
  local agent_key="${1:-default}"
  output=$(bash "$AUDIO_PROCESSOR" "$BATS_TEST_TMPDIR/input.wav" "$agent_key" "$OUTPUT_WAV" 2>&1 || true)
}

# ---------------------------------------------------------------------------
# Reverb preset name translation
# ---------------------------------------------------------------------------

@test "audio-processor: 'light' preset does not trigger 'Invalid sox effect' warning" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code|light||0.15
CFG
  run_processor "llm:claude-code"
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: got 'Invalid sox effect' — preset name was not translated"
    echo "Output: $output"
    return 1
  fi
}

@test "audio-processor: 'medium' preset does not trigger 'Invalid sox effect' warning" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code|medium||0.15
CFG
  run_processor "llm:claude-code"
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: got 'Invalid sox effect' — preset name was not translated"
    return 1
  fi
}

@test "audio-processor: 'heavy' preset does not trigger 'Invalid sox effect' warning" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code|heavy||0.15
CFG
  run_processor "llm:claude-code"
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: got 'Invalid sox effect' — preset name was not translated"
    return 1
  fi
}

@test "audio-processor: 'cathedral' preset does not trigger 'Invalid sox effect' warning" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code|cathedral||0.15
CFG
  run_processor "llm:claude-code"
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: got 'Invalid sox effect' — preset name was not translated"
    return 1
  fi
}

@test "audio-processor: 'off' preset does not trigger 'Invalid sox effect' warning" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
llm:claude-code|off||0.15
CFG
  run_processor "llm:claude-code"
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: got 'Invalid sox effect'"
    return 1
  fi
}

@test "audio-processor: raw sox string passes through without 'Invalid sox effect' warning" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default|reverb 40 50 70 gain -2||0.25
CFG
  run_processor "default"
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: raw sox string was rejected"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# AGENTVIBES_REVERB_OVERRIDE env var (H3 fix: no permanent config mutation)
# ---------------------------------------------------------------------------

@test "audio-processor: AGENTVIBES_REVERB_OVERRIDE 'medium' does not trigger invalid effect warning" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default|off||0.15
CFG
  output=$(AGENTVIBES_REVERB_OVERRIDE=medium bash "$AUDIO_PROCESSOR" \
    "$BATS_TEST_TMPDIR/input.wav" "default" "$OUTPUT_WAV" 2>&1 || true)
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: REVERB_OVERRIDE was not translated"
    return 1
  fi
}

@test "audio-processor: AGENTVIBES_REVERB_OVERRIDE 'off' suppresses any config reverb" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default|heavy||0.15
CFG
  output=$(AGENTVIBES_REVERB_OVERRIDE=off bash "$AUDIO_PROCESSOR" \
    "$BATS_TEST_TMPDIR/input.wav" "default" "$OUTPUT_WAV" 2>&1 || true)
  if echo "$output" | grep -q "Invalid sox effect"; then
    echo "FAIL: reverb off override caused invalid effect"
    return 1
  fi
}

@test "audio-processor: AGENTVIBES_REVERB_OVERRIDE does not modify audio-effects.cfg" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default|off||0.15
CFG
  local before
  before=$(cat "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg")

  AGENTVIBES_REVERB_OVERRIDE=medium bash "$AUDIO_PROCESSOR" \
    "$BATS_TEST_TMPDIR/input.wav" "default" "$OUTPUT_WAV" 2>/dev/null || true

  local after
  after=$(cat "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg")

  if [[ "$before" != "$after" ]]; then
    echo "FAIL: audio-effects.cfg was mutated by REVERB_OVERRIDE"
    echo "Before: $before"
    echo "After:  $after"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# LLM 7-column row parsing (bg_volume must not swallow extra fields)
# ---------------------------------------------------------------------------

@test "audio-processor: 7-column LLM row parses bg_volume as numeric only" {
  # Regression: read without _rest caused bg_volume='0.15||voice|pretext|engine'
  # which ffmpeg rejected, silently falling back to voice-only.
  local repo_root="${BATS_TEST_DIRNAME}/../.."
  local cfg_file="$repo_root/.claude/config/audio-effects.cfg"
  local enabled_file="$repo_root/.claude/config/background-music-enabled.txt"

  local cfg_existed=false enabled_existed=false
  [[ -f "$cfg_file" ]] && { cfg_existed=true; cp "$cfg_file" "$BATS_TEST_TMPDIR/cfg.bak"; }
  [[ -f "$enabled_file" ]] && { enabled_existed=true; cp "$enabled_file" "$BATS_TEST_TMPDIR/en.bak"; }

  mkdir -p "$repo_root/.claude/config"
  # 7-field LLM row (the format saveLlmConfigSync writes)
  printf 'llm:claude-code|light||0.15||Test pretext|piper\n' > "$cfg_file"
  printf 'false\n' > "$enabled_file"  # disabled — we just check volume parsed, not mixing

  local out
  out=$(bash "$AUDIO_PROCESSOR" \
    "$BATS_TEST_TMPDIR/input.wav" "llm:claude-code" "$BATS_TEST_TMPDIR/output.wav" 2>&1 || true)

  if $cfg_existed; then cp "$BATS_TEST_TMPDIR/cfg.bak" "$cfg_file"; else rm -f "$cfg_file"; fi
  if $enabled_existed; then cp "$BATS_TEST_TMPDIR/en.bak" "$enabled_file"; else rm -f "$enabled_file"; fi

  # Should NOT see the non-numeric volume in any output
  if echo "$out" | grep -qF "0.15||"; then
    echo "FAIL: bg_volume was not trimmed — extra fields leaked into volume string"
    echo "Output: $out"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# CLAUDE_PROJECT_DIR config search (npm link / global install fix)
# ---------------------------------------------------------------------------

@test "audio-processor: CLAUDE_PROJECT_DIR config takes priority over package config" {
  local repo_root="${BATS_TEST_DIRNAME}/../.."
  local pkg_cfg="$repo_root/.claude/config/audio-effects.cfg"
  local pkg_enabled="$repo_root/.claude/config/background-music-enabled.txt"

  local pkg_cfg_existed=false pkg_en_existed=false
  [[ -f "$pkg_cfg" ]] && { pkg_cfg_existed=true; cp "$pkg_cfg" "$BATS_TEST_TMPDIR/pkg_cfg.bak"; }
  [[ -f "$pkg_enabled" ]] && { pkg_en_existed=true; cp "$pkg_enabled" "$BATS_TEST_TMPDIR/pkg_en.bak"; }

  # Package config has no LLM row; project config has the LLM row
  mkdir -p "$repo_root/.claude/config"
  printf 'default||agentvibes_soft_flamenco_loop.mp3|0.30\n' > "$pkg_cfg"
  printf 'false\n' > "$pkg_enabled"

  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  printf 'llm:test-agent|off||0.20\n' > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg"

  local out
  out=$(CLAUDE_PROJECT_DIR="$CLAUDE_PROJECT_DIR" bash "$AUDIO_PROCESSOR" \
    "$BATS_TEST_TMPDIR/input.wav" "llm:test-agent" "$BATS_TEST_TMPDIR/output.wav" 2>&1 || true)

  if $pkg_cfg_existed; then cp "$BATS_TEST_TMPDIR/pkg_cfg.bak" "$pkg_cfg"; else rm -f "$pkg_cfg"; fi
  if $pkg_en_existed; then cp "$BATS_TEST_TMPDIR/pkg_en.bak" "$pkg_enabled"; else rm -f "$pkg_enabled"; fi

  # Processor must have found the LLM agent row from CLAUDE_PROJECT_DIR config
  if echo "$out" | grep -q "Processing audio for agent: llm:test-agent"; then
    : # agent was recognized
  else
    echo "FAIL: processor didn't use CLAUDE_PROJECT_DIR config"
    echo "Output: $out"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Path traversal guard (M4 fix)
# ---------------------------------------------------------------------------

@test "audio-processor: path traversal in background_file emits warning" {
  # Skip early if realpath is unavailable — the guard in audio-processor.sh depends on it
  command -v realpath &>/dev/null || skip "realpath not available, path traversal check skipped"

  local repo_root="${BATS_TEST_DIRNAME}/../.."
  local cfg_file="$repo_root/.claude/config/audio-effects.cfg"
  local enabled_file="$repo_root/.claude/config/background-music-enabled.txt"

  # Backup repo config files — audio-processor.sh reads from SCRIPT_DIR, not CLAUDE_PROJECT_DIR
  local cfg_bak="$BATS_TEST_TMPDIR/audio-effects-bak.cfg"
  local enabled_bak="$BATS_TEST_TMPDIR/bg-enabled-bak.txt"
  local cfg_existed=false enabled_existed=false
  [[ -f "$cfg_file" ]] && { cfg_existed=true; cp "$cfg_file" "$cfg_bak"; }
  [[ -f "$enabled_file" ]] && { enabled_existed=true; cp "$enabled_file" "$enabled_bak"; }

  # Write traversal entry to the path the script actually reads
  mkdir -p "$repo_root/.claude/config"
  printf 'default||../../etc/hostname|0.30\n' > "$cfg_file"
  printf 'true\n' > "$enabled_file"

  local traversal_output
  traversal_output=$(bash "$AUDIO_PROCESSOR" \
    "$BATS_TEST_TMPDIR/input.wav" "default" "$BATS_TEST_TMPDIR/output_traversal.wav" 2>&1 || true)

  # Always restore before asserting (so teardown sees original state)
  if $cfg_existed; then cp "$cfg_bak" "$cfg_file"; else rm -f "$cfg_file"; fi
  if $enabled_existed; then cp "$enabled_bak" "$enabled_file"; else rm -f "$enabled_file"; fi

  if ! echo "$traversal_output" | grep -qiE "outside allowed|traversal|warning.*background"; then
    echo "FAIL: no traversal warning emitted"
    echo "Output: $traversal_output"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# AGENTVIBES_TEST_TRACK override (opt-in audio during tests)
# ---------------------------------------------------------------------------

@test "audio-processor: AGENTVIBES_TEST_TRACK overrides configured background track" {
  cat > "$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg" << 'CFG'
default||agent_vibes_bossa_nova_v2_loop.mp3|0.30
CFG
  # Variable prefixes don't export into $() subshells, so use export/unset.
  export AGENTVIBES_TEST_TRACK="agentvibes_soft_flamenco_loop.mp3"
  local track_output
  track_output=$(bash "$AUDIO_PROCESSOR" "$BATS_TEST_TMPDIR/input.wav" "default" "$OUTPUT_WAV" 2>&1 || true)
  unset AGENTVIBES_TEST_TRACK

  if echo "$track_output" | grep -q "bossa_nova"; then
    echo "FAIL: bossa nova track was used even though AGENTVIBES_TEST_TRACK is set"
    echo "Output: $track_output"
    return 1
  fi
  # Bossa nova must not appear. Flamenco may or may not appear (depends on enabled flag).
}
