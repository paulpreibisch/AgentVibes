/**
 * Music File Validator - Security-Critical Path and File Validation
 * Story 4.1: Path Validation and Security Hardening
 *
 * CRITICAL: All functions enforce CLAUDE.md security requirements:
 * - Use path.resolve() for all path operations
 * - Verify file ownership before processing external files
 * - Prevent path traversal attacks via traversal patterns, symlinks, etc.
 * - Validate file exists, is readable, and owned by current user
 *
 * @module music-file-validator
 * @requires fs
 * @requires path
 * @requires os
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Story 4.1: Validate that a file path is safe and within user's home directory
 *
 * Security checks:
 * 1. Resolves path to absolute form (prevents ../ tricks)
 * 2. Validates path is within home directory
 * 3. Rejects symlinks pointing outside home
 * 4. Verifies file ownership matches current user
 * 5. Checks file is readable
 *
 * @param {string} userPath - Path provided by user (absolute or relative)
 * @param {string} userHomeDir - User's home directory (default: process.env.HOME)
 * @returns {Object} { isValid: boolean, error: string|null, resolvedPath: string|null }
 * @throws {Error} If path validation encounters unexpected errors
 */
export function isPathSafe(userPath, userHomeDir = null) {
  try {
    // Parameter validation
    if (!userPath || typeof userPath !== 'string') {
      return {
        isValid: false,
        error: 'Path must be a non-empty string',
        resolvedPath: null
      };
    }

    // Use provided home dir or default to environment
    const homeDir = userHomeDir || (process.env.HOME || process.env.USERPROFILE);
    if (!homeDir) {
      return {
        isValid: false,
        error: 'Unable to determine home directory',
        resolvedPath: null
      };
    }

    // CRITICAL: Use path.resolve() to get absolute path (CLAUDE.md requirement)
    // This prevents directory traversal attacks like "../../etc/passwd"
    const resolvedPath = path.resolve(userPath);
    const resolvedHome = path.resolve(homeDir);

    // Check if path is within home directory
    // Must either match exactly OR start with home + separator (prevents /home/user2 bypass)
    const isWithinHome = resolvedPath === resolvedHome ||
                        resolvedPath.startsWith(resolvedHome + path.sep);

    if (!isWithinHome) {
      return {
        isValid: false,
        error: `Security validation failed: path must be within home directory (${resolvedHome})`,
        resolvedPath: null
      };
    }

    // SECURITY: Use lstatSync first to detect symlinks before following them (#131)
    let lstats;
    try {
      lstats = fs.lstatSync(resolvedPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { isValid: false, error: `File not found: ${userPath}`, resolvedPath: null };
      }
      return { isValid: false, error: `Cannot access file: ${err.message}`, resolvedPath: null };
    }

    // Check if symlink - if so, verify target is also within home directory
    if (lstats.isSymbolicLink()) {
      try {
        const targetPath = fs.realpathSync(resolvedPath);
        const isTargetWithinHome = targetPath === resolvedHome ||
                                  targetPath.startsWith(resolvedHome + path.sep);

        if (!isTargetWithinHome) {
          return {
            isValid: false,
            error: 'Security validation failed: symlink target must be within home directory',
            resolvedPath: null
          };
        }
      } catch (err) {
        return {
          isValid: false,
          error: `Failed to resolve symlink: ${err.message}`,
          resolvedPath: null
        };
      }
    }

    // Get file stats (follows symlinks for regular file check)
    const stats = fs.statSync(resolvedPath);

    // Check if it's a regular file (not directory, special file, etc)
    if (!stats.isFile()) {
      return {
        isValid: false,
        error: `Path must be a regular file, not a ${stats.isDirectory() ? 'directory' : 'special file'}`,
        resolvedPath: null
      };
    }

    // CRITICAL: Verify file ownership (CLAUDE.md requirement)
    // Prevent other users from planting malicious files
    // SECURITY: Fail-secure on platforms where getuid is unavailable (#131)
    const currentUserId = process.getuid ? process.getuid() : null;
    if (currentUserId === null) {
      return {
        isValid: false,
        error: 'Security validation failed: unable to verify file ownership on this platform',
        resolvedPath: null
      };
    }
    if (stats.uid !== currentUserId) {
      return {
        isValid: false,
        error: 'Security validation failed: file not owned by current user',
        resolvedPath: null
      };
    }

    // Check if file is readable
    try {
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch (err) {
      return {
        isValid: false,
        error: `File is not readable: ${err.message}`,
        resolvedPath: null
      };
    }

    // All checks passed
    return {
      isValid: true,
      error: null,
      resolvedPath
    };

  } catch (err) {
    // Unexpected error during validation
    return {
      isValid: false,
      error: `Unexpected validation error: ${err.message}`,
      resolvedPath: null
    };
  }
}

/**
 * Verify file size is within acceptable limits for music files
 *
 * @param {string} filePath - Path to file (must already be validated with isPathSafe)
 * @param {number} maxSizeBytes - Maximum file size in bytes (default: 50MB)
 * @returns {Object} { isValid: boolean, error: string|null, sizeBytes: number }
 */
export function validateFileSize(filePath, maxSizeBytes = 50 * 1024 * 1024) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        error: 'File does not exist',
        sizeBytes: 0
      };
    }

    const stats = fs.statSync(filePath);
    const sizeBytes = stats.size;

    if (sizeBytes > maxSizeBytes) {
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
      const maxMB = (maxSizeBytes / 1024 / 1024).toFixed(2);
      return {
        isValid: false,
        error: `File size (${sizeMB}MB) exceeds maximum (${maxMB}MB)`,
        sizeBytes
      };
    }

    if (sizeBytes === 0) {
      return {
        isValid: false,
        error: 'File is empty',
        sizeBytes
      };
    }

    return {
      isValid: true,
      error: null,
      sizeBytes
    };

  } catch (err) {
    return {
      isValid: false,
      error: `Error checking file size: ${err.message}`,
      sizeBytes: 0
    };
  }
}

/**
 * Get secure temp directory for audio file operations
 * Uses XDG_RUNTIME_DIR if available (follows CLAUDE.md requirement)
 * Falls back to user-specific /tmp directory
 *
 * @param {string} prefix - Directory name prefix (default: 'agentvibes-music')
 * @returns {string} Secure temp directory path
 */
export function getSecureTempDir(prefix = 'agentvibes-music') {
  const xdgRuntime = process.env.XDG_RUNTIME_DIR;

  if (xdgRuntime && fs.existsSync(xdgRuntime)) {
    return path.join(xdgRuntime, `${prefix}-${process.pid}`);
  }

  // Fallback to user-specific /tmp
  const userTmp = path.join(os.tmpdir(), `${prefix}-${process.env.USER || 'user'}`);
  return userTmp;
}

/**
 * Create secure temp directory with restrictive permissions
 *
 * @param {string} dirPath - Directory path to create
 * @returns {Object} { success: boolean, error: string|null, dirPath: string|null }
 */
export function createSecureTempDir(dirPath) {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
    } else {
      // If exists, verify permissions are restrictive
      const stats = fs.statSync(dirPath);
      // Check if world-readable (mode & 0o077 should be 0 for secure)
      if ((stats.mode & 0o077) !== 0) {
        return {
          success: false,
          error: 'Temp directory has insecure permissions',
          dirPath: null
        };
      }
    }

    return {
      success: true,
      error: null,
      dirPath
    };

  } catch (err) {
    return {
      success: false,
      error: `Failed to create secure temp directory: ${err.message}`,
      dirPath: null
    };
  }
}

export default {
  isPathSafe,
  validateFileSize,
  getSecureTempDir,
  createSecureTempDir
};
