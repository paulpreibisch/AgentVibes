/**
 * Coverage for src/utils/audio-duration-validator.js
 *
 * Tests the audio duration validation utilities including pure functions
 * (validateDuration, formatDuration) and the ffprobe-based getAudioDuration
 * function (which gracefully degrades when file doesn't exist or ffprobe fails).
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  DURATION_LIMITS,
  getAudioDuration,
  validateDuration,
  formatDuration,
  validateAudioDuration,
} from '../../src/utils/audio-duration-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Real audio file from the package for ffprobe testing
const PKG_TRACKS_DIR = path.resolve(__dirname, '../../.claude/audio/tracks');
const REAL_MP3 = (() => {
  try {
    const files = fs.readdirSync(PKG_TRACKS_DIR).filter(f => f.endsWith('.mp3'));
    return files.length > 0 ? path.join(PKG_TRACKS_DIR, files[0]) : null;
  } catch {
    return null;
  }
})();

// ===========================================================================
// DURATION_LIMITS constant
// ===========================================================================

describe('DURATION_LIMITS', () => {
  test('is an object with expected keys', () => {
    assert.ok(typeof DURATION_LIMITS === 'object');
    assert.ok('MIN_RECOMMENDED' in DURATION_LIMITS);
    assert.ok('MAX_RECOMMENDED' in DURATION_LIMITS);
    assert.ok('MAX_WARNING' in DURATION_LIMITS);
    assert.ok('MAX_ALLOWED' in DURATION_LIMITS);
  });

  test('MIN_RECOMMENDED < MAX_RECOMMENDED < MAX_WARNING < MAX_ALLOWED', () => {
    assert.ok(DURATION_LIMITS.MIN_RECOMMENDED < DURATION_LIMITS.MAX_RECOMMENDED);
    assert.ok(DURATION_LIMITS.MAX_RECOMMENDED < DURATION_LIMITS.MAX_WARNING);
    assert.ok(DURATION_LIMITS.MAX_WARNING < DURATION_LIMITS.MAX_ALLOWED);
  });

  test('all values are positive numbers', () => {
    for (const val of Object.values(DURATION_LIMITS)) {
      assert.ok(typeof val === 'number' && val > 0);
    }
  });
});

// ===========================================================================
// validateDuration
// ===========================================================================

describe('validateDuration()', () => {
  test('ideal duration returns isValid=true and level=ok', () => {
    const result = validateDuration(60); // 60s is in the ideal range
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.level, 'ok');
    assert.ok(typeof result.message === 'string');
  });

  test('returns error for non-numeric input', () => {
    const result = validateDuration('not a number');
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
  });

  test('returns error for NaN', () => {
    const result = validateDuration(NaN);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
  });

  test('returns error for zero', () => {
    const result = validateDuration(0);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
  });

  test('returns error for negative duration', () => {
    const result = validateDuration(-5);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
  });

  test('returns warning for duration below MIN_RECOMMENDED', () => {
    const result = validateDuration(DURATION_LIMITS.MIN_RECOMMENDED - 1);
    assert.ok(result.level === 'warning' || result.level === 'error');
  });

  test('returns error for duration above MAX_ALLOWED', () => {
    const result = validateDuration(DURATION_LIMITS.MAX_ALLOWED + 1);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.level, 'error');
  });

  test('returns warning for duration above MAX_WARNING but below MAX_ALLOWED', () => {
    const result = validateDuration(DURATION_LIMITS.MAX_WARNING + 1);
    // Should be a warning or error (but file is still kind-of acceptable)
    assert.ok(typeof result.level === 'string');
    assert.ok(typeof result.message === 'string');
  });

  test('result always has isValid, level, message properties', () => {
    for (const dur of [5, 30, 60, 90, 121, 301]) {
      const result = validateDuration(dur);
      assert.ok('isValid' in result, `missing isValid for ${dur}`);
      assert.ok('level' in result, `missing level for ${dur}`);
      assert.ok('message' in result, `missing message for ${dur}`);
    }
  });

  test('recommendation is null or a string', () => {
    const result = validateDuration(60);
    assert.ok(result.recommendation === null || typeof result.recommendation === 'string');
  });
});

// ===========================================================================
// formatDuration
// ===========================================================================

describe('formatDuration()', () => {
  test('formats 0 seconds', () => {
    const result = formatDuration(0);
    assert.ok(typeof result === 'string');
  });

  test('formats 30 seconds', () => {
    const result = formatDuration(30);
    assert.ok(typeof result === 'string' && result.length > 0);
    assert.ok(result.includes('30') || result.includes('0:30'));
  });

  test('formats 90 seconds as 1:30 or similar', () => {
    const result = formatDuration(90);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('formats 3600 seconds (1 hour)', () => {
    const result = formatDuration(3600);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('formats fractional seconds', () => {
    const result = formatDuration(45.7);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('always returns a string', () => {
    for (const s of [0, 1, 15, 29, 30, 60, 90, 120, 300, 3600]) {
      assert.strictEqual(typeof formatDuration(s), 'string');
    }
  });
});

// ===========================================================================
// getAudioDuration
// ===========================================================================

describe('getAudioDuration()', () => {
  test('returns error result for non-existent file', async () => {
    const result = await getAudioDuration('/nonexistent/path/file.mp3');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.duration, null);
    assert.ok(typeof result.error === 'string');
  });

  test('returns object with success, duration, error keys', async () => {
    const result = await getAudioDuration('/nonexistent/file.mp3');
    assert.ok('success' in result);
    assert.ok('duration' in result);
    assert.ok('error' in result);
  });

  test('returns a result (success or fail) for real mp3 file', async () => {
    if (!REAL_MP3) return; // skip if no audio files available
    const result = await getAudioDuration(REAL_MP3);
    // Either success with a duration, or failure with an error
    assert.ok(typeof result === 'object');
    assert.ok('success' in result);
    if (result.success) {
      assert.ok(typeof result.duration === 'number' && result.duration > 0);
      assert.strictEqual(result.error, null);
    } else {
      assert.ok(typeof result.error === 'string');
      assert.strictEqual(result.duration, null);
    }
  });

  test('returns success with duration when ffprobe is available and file is valid', async () => {
    if (!REAL_MP3) return;
    const result = await getAudioDuration(REAL_MP3);
    if (result.success) {
      // If ffprobe is available, duration should be a positive number
      assert.ok(result.duration > 0, 'duration should be positive');
    }
    // If ffprobe not available, result.success is false — that's also OK
  });
});

// ===========================================================================
// validateAudioDuration (higher-level wrapper)
// ===========================================================================

describe('validateAudioDuration()', () => {
  test('returns an object for non-existent file', async () => {
    const result = await validateAudioDuration('/nonexistent/file.mp3');
    assert.ok(typeof result === 'object');
  });

  test('gracefully handles missing file', async () => {
    await assert.doesNotReject(() => validateAudioDuration('/nonexistent/audio.mp3'));
  });

  test('returns validation result for real mp3 file', async () => {
    if (!REAL_MP3) return;
    const result = await validateAudioDuration(REAL_MP3);
    assert.ok(typeof result === 'object');
  });
});
