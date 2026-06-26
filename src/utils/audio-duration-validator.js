/**
 * Audio Duration Validator - Validate audio file length for background music
 * Story 4.7: TTS Integration - Background Music Mixing
 *
 * Validates that custom background music files have appropriate duration:
 * - Recommended: 30-90 seconds (ideal for looping without repetition fatigue)
 * - Warning: < 30 seconds (may sound repetitive)
 * - Warning: > 120 seconds (may use excess memory, slow processing)
 *
 * @module audio-duration-validator
 * @requires child_process
 * @requires fs
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';

/**
 * Recommended duration limits for background music
 *
 * Rationale:
 * - MIN_RECOMMENDED (30s): Research shows loops under 30s cause listener fatigue and annoyance
 * - MAX_RECOMMENDED (90s): Optimal range for music loops - long enough for variety, short enough to prevent memory issues
 * - MAX_WARNING (120s): Above 2 minutes, ffmpeg stream_loop becomes less efficient (memory overhead)
 * - MAX_ALLOWED (300s): Hard limit at 5 minutes to prevent excessive memory usage during TTS processing
 *
 * Source: Based on UX best practices for background audio in voice assistants and
 * technical constraints of ffmpeg stream looping with -stream_loop -1 flag
 */
export const DURATION_LIMITS = {
  MIN_RECOMMENDED: 30,    // 30 seconds - below this gets repetitive
  MAX_RECOMMENDED: 90,    // 90 seconds - sweet spot for variety
  MAX_WARNING: 120,       // 2 minutes - above this warn user
  MAX_ALLOWED: 300        // 5 minutes - hard limit to prevent issues
};

/**
 * Get audio file duration using ffprobe
 *
 * @param {string} filePath - Path to audio file
 * @returns {Promise<Object>} Result object:
 *   - success: boolean
 *   - duration: number|null - Duration in seconds
 *   - error: string|null - Error message if failed
 *
 * @example
 * const result = await getAudioDuration('/path/to/music.mp3');
 * // => { success: true, duration: 45.5, error: null }
 */
export async function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    // Resolve exactly once: an 'error' event, a 'close' event, and a timeout can
    // all race, and a double-resolve would mask the first (correct) result.
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };

    try {
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        done({
          success: false,
          duration: null,
          error: 'File does not exist'
        });
        return;
      }

      // Check if ffprobe is available
      const checkFFprobe = spawn('which', ['ffprobe']); // NOSONAR

      // `which` does not exist on Windows, so this spawn can fail outright.
      // Without an 'error' listener Node re-throws as an unhandled error and
      // crashes the caller; handle it and degrade gracefully instead.
      const checkTimer = setTimeout(() => {
        try { checkFFprobe.kill(); } catch { /* already exited */ }
        done({
          success: false,
          duration: null,
          error: 'ffprobe availability check timed out'
        });
      }, 5000);
      checkTimer.unref?.();

      checkFFprobe.on('error', (err) => {
        clearTimeout(checkTimer);
        done({
          success: false,
          duration: null,
          error: `ffprobe not found: ${err.message}. Please install ffmpeg.`
        });
      });

      checkFFprobe.on('close', (code) => {
        clearTimeout(checkTimer);
        if (settled) return;

        if (code !== 0) {
          done({
            success: false,
            duration: null,
            error: 'ffprobe not found. Please install ffmpeg: sudo apt install ffmpeg (Linux) or brew install ffmpeg (macOS)'
          });
          return;
        }

        // Use ffprobe to get duration (part of ffmpeg)
        // SECURITY: Use spawn with args array to prevent command injection
          const ffprobe = spawn('ffprobe', [ // NOSONAR
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          filePath
        ]);

        // A malformed or locked file can make ffprobe hang; cap it so the promise
        // always settles instead of leaving the caller awaiting forever.
        const ffTimer = setTimeout(() => {
          try { ffprobe.kill(); } catch { /* already exited */ }
          done({
            success: false,
            duration: null,
            error: 'ffprobe timed out reading the file'
          });
        }, 10000);
        ffTimer.unref?.();

        let stdoutChunks = [];
        let stderrChunks = [];

        ffprobe.stdout.on('data', (data) => {
          stdoutChunks.push(data);
        });

        ffprobe.stderr.on('data', (data) => {
          stderrChunks.push(data);
        });

        ffprobe.on('close', (code) => {
          clearTimeout(ffTimer);
          if (settled) return;

          const stdout = Buffer.concat(stdoutChunks).toString();
          const stderr = Buffer.concat(stderrChunks).toString();

          if (code !== 0) {
            done({
              success: false,
              duration: null,
              error: `ffprobe exited with code ${code}: ${stderr || 'Unknown error'}`
            });
            return;
          }

          const duration = parseFloat(stdout.trim());

          if (isNaN(duration) || duration <= 0) {
            done({
              success: false,
              duration: null,
              error: 'Invalid duration value from ffprobe'
            });
            return;
          }

          done({
            success: true,
            duration,
            error: null
          });
        });

        ffprobe.on('error', (err) => {
          clearTimeout(ffTimer);
          done({
            success: false,
            duration: null,
            error: `Failed to spawn ffprobe: ${err.message}. Please install ffmpeg.`
          });
        });
      });

    } catch (err) {
      done({
        success: false,
        duration: null,
        error: `Unexpected error: ${err.message}`
      });
    }
  });
}

/**
 * Validate audio duration against recommended limits
 *
 * Story 4.7 AC-11: Validate audio length and advise user
 *
 * @param {number} duration - Duration in seconds
 * @returns {Object} Validation result:
 *   - isValid: boolean - True if within acceptable limits
 *   - level: string - 'ok' | 'warning' | 'error'
 *   - message: string - User-friendly message
 *   - recommendation: string|null - Recommendation for user
 *
 * @example
 * const validation = validateDuration(45);
 * // => { isValid: true, level: 'ok', message: 'Duration is ideal...', recommendation: null }
 */
export function validateDuration(duration) {
  if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
    return {
      isValid: false,
      level: 'error',
      message: 'Invalid duration value',
      recommendation: null
    };
  }

  // Hard limit exceeded
  if (duration > DURATION_LIMITS.MAX_ALLOWED) {
    return {
      isValid: false,
      level: 'error',
      message: `Audio is too long (${formatDuration(duration)}). Maximum allowed: ${DURATION_LIMITS.MAX_ALLOWED} seconds (${formatDuration(DURATION_LIMITS.MAX_ALLOWED)})`,
      recommendation: 'Please use a shorter audio file or trim this one to under 5 minutes. Long background music can cause memory issues and slow TTS processing.'
    };
  }

  // Warning: too long but acceptable
  if (duration > DURATION_LIMITS.MAX_WARNING) {
    return {
      isValid: true,
      level: 'warning',
      message: `Audio is quite long (${formatDuration(duration)})`,
      recommendation: `Consider using a shorter track (30-90 seconds recommended). Longer tracks use more memory and may slow down TTS processing.`
    };
  }

  // Ideal range
  if (duration >= DURATION_LIMITS.MIN_RECOMMENDED && duration <= DURATION_LIMITS.MAX_RECOMMENDED) {
    return {
      isValid: true,
      level: 'ok',
      message: `Duration is ideal (${formatDuration(duration)})`,
      recommendation: null
    };
  }

  // Warning: too short but acceptable
  if (duration < DURATION_LIMITS.MIN_RECOMMENDED) {
    return {
      isValid: true,
      level: 'warning',
      message: `Audio is short (${formatDuration(duration)})`,
      recommendation: `Consider using a longer track (30-90 seconds recommended). Short tracks will loop frequently and may sound repetitive during longer TTS messages.`
    };
  }

  // Between recommended max and warning limit - acceptable
  return {
    isValid: true,
    level: 'ok',
    message: `Duration is acceptable (${formatDuration(duration)})`,
    recommendation: null
  };
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1:23", "2:45", "45s")
 *
 * @example
 * formatDuration(45) // => "45s"
 * formatDuration(90) // => "1:30"
 * formatDuration(195) // => "3:15"
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get duration validation for audio file (convenience function)
 *
 * Combines getAudioDuration() and validateDuration() for one-step validation
 *
 * @param {string} filePath - Path to audio file
 * @returns {Promise<Object>} Combined result:
 *   - success: boolean
 *   - duration: number|null
 *   - isValid: boolean
 *   - level: string
 *   - message: string
 *   - recommendation: string|null
 *   - error: string|null
 *
 * @example
 * const result = await validateAudioDuration('/path/to/music.mp3');
 * if (result.success && result.level === 'warning') {
 *   console.log(result.message);
 *   console.log(result.recommendation);
 * }
 */
export async function validateAudioDuration(filePath) {
  const durationResult = await getAudioDuration(filePath);

  if (!durationResult.success) {
    return {
      success: false,
      duration: null,
      isValid: false,
      level: 'error',
      message: durationResult.error,
      recommendation: null,
      error: durationResult.error
    };
  }

  const validation = validateDuration(durationResult.duration);

  return {
    success: true,
    duration: durationResult.duration,
    ...validation,
    error: null
  };
}

export default {
  getAudioDuration,
  validateDuration,
  validateAudioDuration,
  formatDuration,
  DURATION_LIMITS
};
