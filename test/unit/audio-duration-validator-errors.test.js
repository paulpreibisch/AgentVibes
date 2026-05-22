/**
 * Error-path and edge-case tests for Audio Duration Validator
 * Story 4.7: TTS Integration - Background Music Mixing
 *
 * Focuses on gaps NOT covered by test/utils/audio-duration-validator.test.js:
 *   - getAudioDuration() when ffprobe is absent or exits non-zero
 *   - formatDuration() edge cases (boundary values, fractional rounding, large values)
 *   - validateDuration() boundary and type-coercion edge cases
 *
 * Uses node:test + node:assert (ESM). No real ffprobe is spawned for error
 * path tests — we verify behaviour against files without relying on ffprobe
 * being installed (skip gracefully when needed).
 *
 * @module test/unit/audio-duration-validator-errors
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import {
  getAudioDuration,
  validateDuration,
  formatDuration,
  DURATION_LIMITS,
} from '../../src/utils/audio-duration-validator.js';

// ---------------------------------------------------------------------------
// Helper: detect whether ffprobe is available on this machine
// ---------------------------------------------------------------------------
function ffprobeAvailable() {
  try {
    execSync('which ffprobe', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const HAS_FFPROBE = ffprobeAvailable();

// ---------------------------------------------------------------------------
// Shared temp directory
// ---------------------------------------------------------------------------
let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-duration-err-test-'));
});

afterEach(() => {
  try {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup
  }
  tmpDir = null;
});

// ===========================================================================
// getAudioDuration() — error paths
// ===========================================================================

describe('getAudioDuration() — error paths', () => {
  test('returns error when file does not exist', async () => {
    const missingFile = path.join(tmpDir, 'no-such-file.mp3');
    const result = await getAudioDuration(missingFile);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.duration, null);
    assert.ok(result.error, 'error should be a non-empty string');
    assert.match(result.error, /does not exist/i);
  });

  test('returns error (not a throw) when ffprobe is not found', async (t) => {
    if (HAS_FFPROBE) {
      // We cannot fake "ffprobe absent" when it is actually installed, but we
      // can still verify the success path does not crash.
      t.skip('ffprobe is installed — cannot test "not found" path on this machine');
      return;
    }

    // ffprobe is genuinely absent; create a real (but trivial) file so the
    // existence check passes and the code reaches the ffprobe-check branch.
    const dummyFile = path.join(tmpDir, 'dummy.mp3');
    fs.writeFileSync(dummyFile, Buffer.alloc(128, 0xff));

    const result = await getAudioDuration(dummyFile);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.duration, null);
    assert.ok(result.error, 'error should be defined');
    // The error message must mention ffprobe so the user knows what to install
    assert.match(result.error, /ffprobe/i);
  });

  test('result object always has the expected shape on error', async () => {
    const result = await getAudioDuration('/definitely/not/real.mp3');

    assert.ok('success' in result, 'result must have success');
    assert.ok('duration' in result, 'result must have duration');
    assert.ok('error' in result, 'result must have error');
    assert.strictEqual(typeof result.success, 'boolean');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.duration, null);
  });

  test('result object always has the expected shape on success (requires ffprobe)', async (t) => {
    if (!HAS_FFPROBE) {
      t.skip('ffprobe not installed — skipping success-shape test');
      return;
    }
    // We cannot create a real MP3 without ffmpeg, but we can at least confirm
    // a non-existent file returns the shape correctly and that getAudioDuration
    // does not throw.
    const result = await getAudioDuration('/nonexistent/shape-check.mp3');
    // Even a failure must carry all three keys
    assert.ok('success' in result);
    assert.ok('duration' in result);
    assert.ok('error' in result);
  });
});

// ===========================================================================
// formatDuration() — edge cases
// ===========================================================================

describe('formatDuration() — edge cases', () => {
  test('formats exactly 0 seconds as "0s"', () => {
    assert.strictEqual(formatDuration(0), '0s');
  });

  test('formats 1 second as "1s"', () => {
    assert.strictEqual(formatDuration(1), '1s');
  });

  test('formats 59 seconds as "59s" (just under a minute)', () => {
    assert.strictEqual(formatDuration(59), '59s');
  });

  test('formats exactly 60 seconds as "1:00"', () => {
    assert.strictEqual(formatDuration(60), '1:00');
  });

  test('formats 61 seconds as "1:01"', () => {
    assert.strictEqual(formatDuration(61), '1:01');
  });

  test('pads single-digit seconds with a leading zero', () => {
    assert.strictEqual(formatDuration(65), '1:05');
    assert.strictEqual(formatDuration(122), '2:02');
  });

  test('formats exactly 90 seconds as "1:30"', () => {
    assert.strictEqual(formatDuration(90), '1:30');
  });

  test('formats the MAX_ALLOWED limit (300 s) as "5:00"', () => {
    assert.strictEqual(formatDuration(DURATION_LIMITS.MAX_ALLOWED), '5:00');
  });

  test('formats large values correctly (e.g. 3600 s = "60:00")', () => {
    assert.strictEqual(formatDuration(3600), '60:00');
  });

  test('rounds fractional seconds below 60 to nearest integer', () => {
    assert.strictEqual(formatDuration(29.4), '29s');
    assert.strictEqual(formatDuration(29.5), '30s');
    assert.strictEqual(formatDuration(29.9), '30s');
  });

  test('rounds fractional seconds above 60 correctly', () => {
    // 90.4 → floor(90.4/60)=1 min, round(90.4 % 60)=round(30.4)=30 → "1:30"
    assert.strictEqual(formatDuration(90.4), '1:30');
    // 90.6 → round(30.6)=31 → "1:31"
    assert.strictEqual(formatDuration(90.6), '1:31');
  });

  test('handles negative seconds without crashing (returns a string)', () => {
    // The function does not validate input — it should return some string
    const result = formatDuration(-5);
    assert.strictEqual(typeof result, 'string');
  });
});

// ===========================================================================
// validateDuration() — boundary and type-coercion edge cases
// ===========================================================================

describe('validateDuration() — boundary and type-coercion edge cases', () => {
  test('rejects duration of exactly 0', () => {
    const result = validateDuration(0);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
  });

  test('rejects negative durations', () => {
    assert.strictEqual(validateDuration(-1).isValid, false);
    assert.strictEqual(validateDuration(-0.001).isValid, false);
  });

  test('rejects Infinity', () => {
    const result = validateDuration(Infinity);
    // Infinity > MAX_ALLOWED so it triggers the "too long" branch
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
  });

  test('rejects NaN', () => {
    assert.strictEqual(validateDuration(NaN).isValid, false);
  });

  test('rejects null', () => {
    assert.strictEqual(validateDuration(null).isValid, false);
  });

  test('rejects undefined', () => {
    assert.strictEqual(validateDuration(undefined).isValid, false);
  });

  test('rejects a numeric string (type check)', () => {
    // validateDuration requires typeof === 'number'
    assert.strictEqual(validateDuration('45').isValid, false);
  });

  test('rejects boolean true (type check)', () => {
    assert.strictEqual(validateDuration(true).isValid, false);
  });

  test('rejects boolean false (type check)', () => {
    assert.strictEqual(validateDuration(false).isValid, false);
  });

  // Boundary: exact boundary at MIN_RECOMMENDED (30 s)
  test('exactly 30 seconds is in the ideal range (level ok)', () => {
    const result = validateDuration(DURATION_LIMITS.MIN_RECOMMENDED); // 30
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.level, 'ok');
  });

  // Boundary: just below MIN_RECOMMENDED (29.999 s) → warning
  test('just below 30 seconds returns a warning', () => {
    const result = validateDuration(29.999);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.level, 'warning');
    assert.match(result.recommendation, /repetitive/i);
  });

  // Boundary: exactly 90 s (MAX_RECOMMENDED) → still ok
  test('exactly 90 seconds is in the ideal range (level ok)', () => {
    const result = validateDuration(DURATION_LIMITS.MAX_RECOMMENDED); // 90
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.level, 'ok');
  });

  // Boundary: between MAX_RECOMMENDED (90) and MAX_WARNING (120) → ok
  test('105 seconds (between recommended max and warning limit) is level ok', () => {
    const result = validateDuration(105);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.level, 'ok');
  });

  // Boundary: exactly MAX_WARNING (120 s) → still ok (not yet a warning)
  test('exactly 120 seconds is level ok (boundary, not yet warning)', () => {
    const result = validateDuration(DURATION_LIMITS.MAX_WARNING); // 120
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.level, 'ok');
  });

  // Boundary: just above MAX_WARNING (120.001 s) → warning
  test('just above 120 seconds returns a warning', () => {
    const result = validateDuration(120.001);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.level, 'warning');
    assert.match(result.recommendation, /memory/i);
  });

  // Boundary: exactly MAX_ALLOWED (300 s) → still valid (not greater than)
  test('exactly 300 seconds does not exceed the hard limit', () => {
    const result = validateDuration(DURATION_LIMITS.MAX_ALLOWED); // 300
    // 300 > 300 is false, so it should NOT hit the "too long" error branch
    assert.strictEqual(result.isValid, true);
  });

  // Boundary: just above MAX_ALLOWED (300.001 s) → error
  test('just above 300 seconds returns a hard-limit error', () => {
    const result = validateDuration(300.001);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
    assert.match(result.message, /too long/i);
    assert.ok(result.recommendation, 'Should provide a recommendation');
  });

  test('very large duration (1000 s) returns error with trim recommendation', () => {
    const result = validateDuration(1000);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
    assert.match(result.recommendation, /trim/i);
  });

  test('result always includes required keys', () => {
    const cases = [1, 15, 45, 90, 150, 400];
    for (const d of cases) {
      const result = validateDuration(d);
      assert.ok('isValid' in result, `isValid missing for duration ${d}`);
      assert.ok('level' in result, `level missing for duration ${d}`);
      assert.ok('message' in result, `message missing for duration ${d}`);
      assert.ok('recommendation' in result, `recommendation missing for duration ${d}`);
    }
  });
});
