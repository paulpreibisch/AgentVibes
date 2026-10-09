#!/usr/bin/env bats

# Test: audio-processor.sh per-agent background-music override (_bg_allowed)
#
# Regression for Story 8.4 (AVI-S8.4): the per-agent profile JSON
# (backgroundMusic.enabled=true) is supposed to let an individual agent turn
# on background music even when the GLOBAL background-music-enabled flag is
# off. The computed `_bg_allowed` local correctly captured that OR logic, but
# the actual mix-gate at the bottom of main() re-tested `is_background_music_enabled`
# (the global flag only) instead of `_bg_allowed`, so the per-agent override
# was dead code — mixing never happened unless the global flag was already on.

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
AUDIO_PROCESSOR="$REPO_ROOT/.claude/hooks/audio-processor.sh"

setup() {
  setup_test_env

  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/config"
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude/audio/tracks"

  # Minimal valid WAV (44-byte RIFF header) for ffprobe/sox to accept
  python3 - << 'PY' > "$BATS_TEST_TMPDIR/input.wav" 2>/dev/null || \
    dd if=/dev/zero bs=44 count=1 > "$BATS_TEST_TMPDIR/input.wav" 2>/dev/null || true
import struct, sys
data = (b'RIFF' + struct.pack('<I', 36) + b'WAVEfmt ' +
        struct.pack('<IHHIIHH', 16, 1, 1, 22050, 44100, 2, 16) +
        b'data' + struct.pack('<I', 0))
sys.stdout.buffer.write(data)
PY

  # A "track" file just needs to exist on disk — mix_background() falls back
  # to copying the voice file untouched if ffprobe can't read a real duration,
  # so the presence check (not audio validity) is what we're exercising here.
  echo "fake-track-bytes" > "$CLAUDE_PROJECT_DIR/.claude/audio/tracks/test-profile-track.mp3"

  export OUTPUT_WAV="$BATS_TEST_TMPDIR/output.wav"

  # Global flag OFF for every test in this file — the whole point is to prove
  # the per-agent profile can override this without flipping the global switch.
  echo "false" > "$CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt"
}

teardown() {
  teardown_test_env
}

# ---------------------------------------------------------------------------
# Regression: per-agent profile enabled=true must override global off switch
# ---------------------------------------------------------------------------

@test "audio-processor: per-agent profile enabled=true mixes music even when global flag is off" {
  cat > "$BATS_TEST_TMPDIR/profile.json" << 'JSON'
{"backgroundMusic":{"enabled":true,"track":"test-profile-track.mp3","volume":50}}
JSON

  run bash "$AUDIO_PROCESSOR" "$BATS_TEST_TMPDIR/input.wav" "default" "$OUTPUT_WAV" "$BATS_TEST_TMPDIR/profile.json"

  if ! echo "$output" | grep -q "Mixing background"; then
    echo "FAIL: per-agent profile enabled=true did not trigger mixing despite global flag being off"
    echo "Output: $output"
    return 1
  fi
}

@test "audio-processor: per-agent profile enabled=false does NOT mix when global flag is off" {
  cat > "$BATS_TEST_TMPDIR/profile.json" << 'JSON'
{"backgroundMusic":{"enabled":false,"track":"test-profile-track.mp3","volume":50}}
JSON

  run bash "$AUDIO_PROCESSOR" "$BATS_TEST_TMPDIR/input.wav" "default" "$OUTPUT_WAV" "$BATS_TEST_TMPDIR/profile.json"

  if echo "$output" | grep -q "Mixing background"; then
    echo "FAIL: mixing happened even though both global flag and profile are off"
    echo "Output: $output"
    return 1
  fi
}

@test "audio-processor: no profile file + global flag off does NOT mix (baseline, no regression)" {
  # No 4th arg at all — mirrors the common non-BMAD call path.
  run bash "$AUDIO_PROCESSOR" "$BATS_TEST_TMPDIR/input.wav" "default" "$OUTPUT_WAV"

  if echo "$output" | grep -q "Mixing background"; then
    echo "FAIL: mixing happened with no profile file and global flag off"
    echo "Output: $output"
    return 1
  fi
}
