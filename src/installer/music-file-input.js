/**
 * Music File Input - Custom Music File Selection During Installation
 * Story 4.5: Music File Input and Selection
 *
 * Provides interactive prompts for users to add custom background music during installation.
 * Integrates validation chain from Stories 4.1-4.4 (path, format, ownership, storage).
 *
 * @module music-file-input
 * @requires inquirer
 * @requires music-file-validator
 * @requires audio-format-validator
 * @requires secure-music-storage
 */

import inquirer from 'inquirer';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { isPathSafe, validateFileSize } from '../utils/music-file-validator.js';
import { validateAudioFile } from '../utils/audio-format-validator.js';
import { copyToSecureStorage } from '../utils/secure-music-storage.js';
import { validateAudioDuration } from '../utils/audio-duration-validator.js';
import { getStoredMusicPath } from '../utils/secure-music-storage.js';

/**
 * Prompt user for custom music file during installation
 *
 * Implements AC-1 through AC-10 from Story 4.5:
 * - Interactive yes/no prompt
 * - File path input with tilde expansion
 * - Validation chain (path → format → ownership → copy)
 * - Retry logic (max 3 attempts)
 * - Progress feedback
 * - Error handling with retry option
 *
 * @param {string} claudeDir - Path to .claude directory for storage
 * @param {Function} logger - Optional logger function for debugging
 * @returns {Promise<Object>} Result object with structure:
 *   - success: boolean - Always true (failures handled with retries)
 *   - error: string|null - Error message if operation failed
 *   - filename: string|null - Original filename if successful, null if skipped
 *   - storagePath: string|null - Path to stored file if successful
 *
 * @example
 * // User skips custom music
 * const result = await promptForCustomMusic('/home/user/.claude');
 * // => { success: true, error: null, filename: null, storagePath: null }
 *
 * @example
 * // User provides valid music file
 * const result = await promptForCustomMusic('/home/user/.claude');
 * // => { success: true, error: null, filename: 'my-track.mp3', storagePath: '/home/user/.claude/audio/custom-music/tracks/my-track.mp3' }
 */
export async function promptForCustomMusic(claudeDir, logger = null) {
  const maxRetries = 3;
  let retryCount = 0;

  try {
    // Check if existing custom music is already configured
    const existingMusic = getStoredMusicPath(claudeDir);
    let promptMessage = 'Add custom background music?';

    if (existingMusic.exists) {
      promptMessage = `Custom music already exists (${existingMusic.filename}). Replace it?`;
    }

    // Task 1.2: Initial prompt (yes/no) - AC-1
    const { addCustomMusic } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addCustomMusic',
        message: promptMessage,
        default: false
      }
    ]);

    // User skipped - return success with null filename (AC-8)
    if (!addCustomMusic) {
      return {
        success: true,
        error: null,
        filename: null,
        storagePath: null
      };
    }

    // Warn user if they're about to overwrite existing music
    if (existingMusic.exists) {
      console.log(`⚠️  Replacing existing custom music: ${existingMusic.filename}`);
    }

    // Task 1.3: File path prompt with retry loop
    while (retryCount < maxRetries) {
      try {
        // Prompt for file path with help text - AC-2, AC-10
        const { filePath } = await inquirer.prompt([
          {
            type: 'input',
            name: 'filePath',
            message: 'Enter path to audio file (.mp3, .wav, .ogg, .m4a):\n  Supported formats: .mp3, .wav, .ogg, .m4a | Max: 50MB | Example: ~/music/lofi-beats.mp3\n  Path:'
          }
        ]);

        // Handle empty or whitespace-only input - AC-9
        const trimmedPath = filePath.trim();
        if (!trimmedPath) {
          console.error('❌ Path cannot be empty');

          // Prompt for retry - AC-6
          const { retry } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'retry',
              message: 'Try again?',
              default: true
            }
          ]);

          if (!retry) {
            // User declined retry - skip feature (AC-8)
            return {
              success: true,
              error: null,
              filename: null,
              storagePath: null
            };
          }

          retryCount++;
          continue;
        }

        // Task 1.4: Tilde expansion - AC-2
        let expandedPath = trimmedPath;
        if (trimmedPath.startsWith('~')) {
          expandedPath = trimmedPath.replace(/^~/, os.homedir());
        }

        // Normalize Windows-style backslashes to forward slashes for WSL compatibility
        expandedPath = expandedPath.replace(/\\/g, '/');

        // Strip Windows UNC paths (\\wsl.localhost\Ubuntu\) to extract the Linux path
        if (expandedPath.match(/^\/\/wsl\.localhost\/[^/]+\//i)) {
          expandedPath = expandedPath.replace(/^\/\/wsl\.localhost\/[^/]+/i, '');
        }

        // Resolve to absolute path (only if not already absolute)
        const absolutePath = expandedPath.startsWith('/')
          ? expandedPath
          : path.resolve(expandedPath);

        logger?.(`Validating file: ${absolutePath}`);

        // Task 1.5: Validation chain orchestration - AC-4
        // Show progress indicator
        console.log('🔄 Validating file...');

        // Step 1: Path validation (Story 4.1) - AC-4
        console.log('  → Checking path...');
        const pathValidation = isPathSafe(absolutePath, os.homedir());

        if (!pathValidation.isValid) {
          throw new Error(pathValidation.error);
        }

        // Step 2: File size validation - AC-4
        console.log('  → Checking file size...');
        const sizeValidation = validateFileSize(pathValidation.resolvedPath);

        if (!sizeValidation.isValid) {
          throw new Error(sizeValidation.error);
        }

        // Step 3: Format validation (Story 4.2) - AC-4
        console.log('  → Verifying format...');
        const formatValidation = validateAudioFile(pathValidation.resolvedPath);

        if (!formatValidation.isValid) {
          throw new Error(formatValidation.error);
        }

        // Step 4: Audio duration validation (Story 4.7) - AC-11
        console.log('  → Checking audio duration...');
        const durationValidation = await validateAudioDuration(pathValidation.resolvedPath);

        if (!durationValidation.success) {
          throw new Error(durationValidation.error);
        }

        // Show duration to user with appropriate message
        if (durationValidation.level === 'error') {
          throw new Error(`${durationValidation.message}\n${durationValidation.recommendation}`);
        } else if (durationValidation.level === 'warning') {
          console.log(`⚠️  ${durationValidation.message}`);
          if (durationValidation.recommendation) {
            console.log(`   ${durationValidation.recommendation}`);
          }
          // Ask user if they want to continue with warning
          const { continueAnyway } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continueAnyway',
              message: 'Continue anyway?',
              default: true
            }
          ]);

          if (!continueAnyway) {
            retryCount++;
            continue;
          }
        } else {
          console.log(`✅ Duration: ${durationValidation.message}`);
        }

        // Step 5: Copy to secure storage (Story 4.4) - AC-4
        console.log('  → Copying to storage...');
        const copyResult = await copyToSecureStorage(
          pathValidation.resolvedPath,
          claudeDir,
          { logger }
        );

        if (!copyResult.success) {
          throw new Error(copyResult.error);
        }

        // Task 1.7: Success path - AC-5
        const originalFilename = copyResult.metadata?.originalFilename || path.basename(absolutePath);
        console.log(`✅ Custom music set: ${originalFilename}`);

        logger?.(`Custom music configured: ${originalFilename} at ${copyResult.storagePath}`);

        return {
          success: true,
          error: null,
          filename: originalFilename,
          storagePath: copyResult.storagePath
        };

      } catch (validationError) {
        // Task 1.6: Error handling and retry logic - AC-6
        console.error(`❌ ${validationError.message}`);

        // Check if max retries reached - AC-7
        if (retryCount >= maxRetries - 1) {
          console.log('⚠️  Maximum retry attempts reached. Skipping custom music setup.');
          return {
            success: true,
            error: validationError.message,
            filename: null,
            storagePath: null
          };
        }

        // Prompt for retry - AC-6
        const { retry } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Try again?',
            default: true
          }
        ]);

        if (!retry) {
          // User declined retry - skip feature (AC-8)
          return {
            success: true,
            error: null,
            filename: null,
            storagePath: null
          };
        }

        retryCount++;
      }
    }

    // Max retries reached (should not get here due to check above, but safety fallback)
    return {
      success: true,
      error: 'Maximum retry attempts reached',
      filename: null,
      storagePath: null
    };

  } catch (error) {
    // Unexpected error (e.g., inquirer failure, Ctrl+C) - AC-3
    logger?.(`Error in promptForCustomMusic: ${error.message}`);

    // Return skip result to allow installation to continue
    return {
      success: true,
      error: error.message,
      filename: null,
      storagePath: null
    };
  }
}

export default {
  promptForCustomMusic
};
