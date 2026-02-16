/**
 * Tests for Audio Duration Validator
 * Story 4.7: TTS Integration - Background Music Mixing
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import {
  getAudioDuration,
  validateDuration,
  validateAudioDuration,
  formatDuration,
  DURATION_LIMITS
} from '../../src/utils/audio-duration-validator.js';

describe('Audio Duration Validator', () => {
  let testDir;
  let testFiles = {};

  beforeAll(async () => {
    // Create secure temp directory
    testDir = path.join(os.tmpdir(), `agentvibes-test-${process.pid}`);
    fs.mkdirSync(testDir, { recursive: true, mode: 0o700 });

    // Generate test audio files with ffmpeg (if available)
    try {
      // Check if ffmpeg is available
      execSync('ffmpeg -version', { stdio: 'ignore' });

      // Create short audio (15 seconds)
      const shortFile = path.join(testDir, 'short.mp3');
      execSync(
        `ffmpeg -f lavfi -i sine=frequency=440:duration=15 -q:a 9 ${shortFile}`,
        { stdio: 'ignore' }
      );
      testFiles.short = shortFile;

      // Create ideal audio (45 seconds)
      const idealFile = path.join(testDir, 'ideal.mp3');
      execSync(
        `ffmpeg -f lavfi -i sine=frequency=440:duration=45 -q:a 9 ${idealFile}`,
        { stdio: 'ignore' }
      );
      testFiles.ideal = idealFile;

      // Create long audio (150 seconds)
      const longFile = path.join(testDir, 'long.mp3');
      execSync(
        `ffmpeg -f lavfi -i sine=frequency=440:duration=150 -q:a 9 ${longFile}`,
        { stdio: 'ignore' }
      );
      testFiles.long = longFile;

      // Create very long audio (400 seconds - exceeds max)
      const veryLongFile = path.join(testDir, 'very-long.mp3');
      execSync(
        `ffmpeg -f lavfi -i sine=frequency=440:duration=400 -q:a 9 ${veryLongFile}`,
        { stdio: 'ignore' }
      );
      testFiles.veryLong = veryLongFile;

    } catch (err) {
      console.warn('⚠️  ffmpeg not available - skipping audio file generation tests');
    }
  });

  afterAll(() => {
    // Clean up test directory with try/catch for robustness
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Warning: Failed to clean up test directory: ${err.message}`);
    }
  });

  describe('formatDuration()', () => {
    it('should format seconds < 60 with "s" suffix', () => {
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(5)).toBe('5s');
    });

    it('should format minutes and seconds as M:SS', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(195)).toBe('3:15');
    });

    it('should round fractional seconds', () => {
      expect(formatDuration(45.7)).toBe('46s');
      expect(formatDuration(89.4)).toBe('1:29');
    });
  });

  describe('validateDuration()', () => {
    it('should reject invalid duration values', () => {
      expect(validateDuration(0).isValid).toBe(false);
      expect(validateDuration(-10).isValid).toBe(false);
      expect(validateDuration(NaN).isValid).toBe(false);
      expect(validateDuration(null).isValid).toBe(false);
      expect(validateDuration('invalid').isValid).toBe(false);
    });

    it('should mark ideal range (30-90s) as OK', () => {
      const result45 = validateDuration(45);
      expect(result45.isValid).toBe(true);
      expect(result45.level).toBe('ok');
      expect(result45.recommendation).toBe(null);

      const result60 = validateDuration(60);
      expect(result60.isValid).toBe(true);
      expect(result60.level).toBe('ok');

      const result90 = validateDuration(90);
      expect(result90.isValid).toBe(true);
      expect(result90.level).toBe('ok');
    });

    it('should warn for short duration (<30s)', () => {
      const result = validateDuration(15);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('warning');
      expect(result.recommendation).toContain('30-90 seconds recommended');
      expect(result.recommendation).toContain('repetitive');
    });

    it('should warn for long duration (>120s but <300s)', () => {
      const result = validateDuration(150);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('warning');
      expect(result.recommendation).toContain('30-90 seconds recommended');
      expect(result.recommendation).toContain('memory');
    });

    it('should reject very long duration (>300s)', () => {
      const result = validateDuration(400);
      expect(result.isValid).toBe(false);
      expect(result.level).toBe('error');
      expect(result.message).toContain('too long');
      expect(result.recommendation).toContain('trim');
    });

    it('should accept duration between recommended max and warning limit', () => {
      const result = validateDuration(100);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('ok');
    });
  });

  describe('getAudioDuration()', () => {
    it('should return error for non-existent file', async () => {
      const result = await getAudioDuration('/nonexistent/file.mp3');
      expect(result.success).toBe(false);
      expect(result.duration).toBe(null);
      expect(result.error).toContain('does not exist');
    });

    it('should detect duration of short audio file', async () => {
      if (!testFiles.short) {
        console.warn('Skipping test - ffmpeg not available');
        return;
      }

      const result = await getAudioDuration(testFiles.short);
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(14);
      expect(result.duration).toBeLessThan(16);
      expect(result.error).toBe(null);
    });

    it('should detect duration of ideal audio file', async () => {
      if (!testFiles.ideal) {
        console.warn('Skipping test - ffmpeg not available');
        return;
      }

      const result = await getAudioDuration(testFiles.ideal);
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(44);
      expect(result.duration).toBeLessThan(46);
      expect(result.error).toBe(null);
    });

    it('should detect duration of long audio file', async () => {
      if (!testFiles.long) {
        console.warn('Skipping test - ffmpeg not available');
        return;
      }

      const result = await getAudioDuration(testFiles.long);
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(149);
      expect(result.duration).toBeLessThan(151);
      expect(result.error).toBe(null);
    });
  });

  describe('validateAudioDuration()', () => {
    it('should return error for non-existent file', async () => {
      const result = await validateAudioDuration('/nonexistent/file.mp3');
      expect(result.success).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.level).toBe('error');
      expect(result.error).toBeTruthy();
    });

    it('should validate short audio with warning', async () => {
      if (!testFiles.short) {
        console.warn('Skipping test - ffmpeg not available');
        return;
      }

      const result = await validateAudioDuration(testFiles.short);
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('warning');
      expect(result.duration).toBeGreaterThan(14);
      expect(result.recommendation).toContain('repetitive');
    });

    it('should validate ideal audio as OK', async () => {
      if (!testFiles.ideal) {
        console.warn('Skipping test - ffmpeg not available');
        return;
      }

      const result = await validateAudioDuration(testFiles.ideal);
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('ok');
      expect(result.duration).toBeGreaterThan(44);
      expect(result.recommendation).toBe(null);
    });

    it('should validate long audio with warning', async () => {
      if (!testFiles.long) {
        console.warn('Skipping test - ffmpeg not available');
        return;
      }

      const result = await validateAudioDuration(testFiles.long);
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('warning');
      expect(result.duration).toBeGreaterThan(149);
      expect(result.recommendation).toContain('memory');
    });

    it('should reject very long audio', async () => {
      if (!testFiles.veryLong) {
        console.warn('Skipping test - ffmpeg not available');
        return;
      }

      const result = await validateAudioDuration(testFiles.veryLong);
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.level).toBe('error');
      expect(result.duration).toBeGreaterThan(399);
      expect(result.message).toContain('too long');
    });
  });

  describe('DURATION_LIMITS constants', () => {
    it('should export expected limit values', () => {
      expect(DURATION_LIMITS.MIN_RECOMMENDED).toBe(30);
      expect(DURATION_LIMITS.MAX_RECOMMENDED).toBe(90);
      expect(DURATION_LIMITS.MAX_WARNING).toBe(120);
      expect(DURATION_LIMITS.MAX_ALLOWED).toBe(300);
    });
  });
});
