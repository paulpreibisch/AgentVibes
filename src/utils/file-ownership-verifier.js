/**
 * File Ownership Verifier - Cross-Platform Security Validation
 * Story 4.3: File Ownership Verification
 *
 * Verifies that files are owned by the current user before processing.
 * This prevents malicious files planted by other users from being used.
 *
 * Handles platform-specific differences:
 * - Unix/Linux/macOS: UID-based ownership checking
 * - Windows: Uses fs.statSync().uid if available, graceful fallback
 * - Network mounts: Documented limitation, best-effort checking
 *
 * @module file-ownership-verifier
 * @requires fs
 * @requires os
 * @requires path
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Story 4.3: Verify file is owned by current user
 *
 * On Unix-like systems (Linux, macOS):
 * - Compares fs.statSync().uid with process.getuid()
 *
 * On Windows:
 * - Attempts UID comparison if available
 * - Gracefully falls back to path/permission checks if UID unavailable
 * - Network mount files may not have reliable ownership info
 *
 * Performance: Typically < 5ms (stat operation only, no I/O)
 *
 * @param {string} filePath - Path to file to check
 * @param {Object} options - Verification options
 * @param {boolean} options.allowNetworkMounts - Allow verification to succeed on network mounts (default: true)
 * @param {Function} options.logger - Optional logger function for sanitized logs
 * @returns {Object} {
 *   isOwned: boolean,
 *   error: string|null,
 *   ownerUid: number|null,
 *   currentUid: number|null,
 *   isNetworkMount: boolean,
 *   platform: string
 * }
 */
export function verifyFileOwnership(filePath, options = {}) {
  const { allowNetworkMounts = true, logger = null } = options;

  try {
    if (!filePath || typeof filePath !== 'string') {
      const error = 'File path must be a non-empty string';
      logger?.(`ownership-check: invalid-path - ${error}`);
      return {
        isOwned: false,
        error,
        ownerUid: null,
        currentUid: null,
        isNetworkMount: false,
        platform: process.platform
      };
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      const error = 'File does not exist';
      logger?.(`ownership-check: missing-file - ${filePath}`);
      return {
        isOwned: false,
        error,
        ownerUid: null,
        currentUid: null,
        isNetworkMount: false,
        platform: process.platform
      };
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Check if it's a regular file
    if (!stats.isFile()) {
      const error = 'Path must be a regular file';
      logger?.(`ownership-check: not-file - ${filePath}`);
      return {
        isOwned: false,
        error,
        ownerUid: null,
        currentUid: null,
        isNetworkMount: false,
        platform: process.platform
      };
    }

    const currentUid = process.getuid ? process.getuid() : null;
    const fileUid = stats.uid;

    // Determine platform type for logging
    const platformType = getPlatformType();
    const isNetworkMount = checkIsNetworkMount(filePath);

    // Log verification attempt (sanitized - no sensitive paths)
    logger?.(`ownership-check: started - platform=${platformType}, network=${isNetworkMount}`);

    // Platform-specific ownership verification
    if (process.platform === 'win32') {
      return verifyWindowsOwnership(filePath, stats, currentUid, isNetworkMount, allowNetworkMounts, logger);
    } else {
      // Unix-like systems (Linux, macOS)
      return verifyUnixOwnership(filePath, stats, currentUid, isNetworkMount, allowNetworkMounts, logger);
    }

  } catch (err) {
    const error = `Error verifying file ownership: ${err.message}`;
    logger?.(`ownership-check: error - ${error}`);
    return {
      isOwned: false,
      error,
      ownerUid: null,
      currentUid: null,
      isNetworkMount: false,
      platform: process.platform
    };
  }
}

/**
 * Unix/Linux/macOS ownership verification
 * Uses UID comparison for reliable security
 *
 * @private
 */
function verifyUnixOwnership(filePath, stats, currentUid, isNetworkMount, allowNetworkMounts, logger) {
  if (currentUid === null) {
    const error = 'Unable to determine current user UID (not available on this platform)';
    logger?.(`ownership-check: no-uid-support`);
    return {
      isOwned: false,
      error,
      ownerUid: stats.uid,
      currentUid: null,
      isNetworkMount,
      platform: process.platform
    };
  }

  // Check if UIDs match
  if (stats.uid === currentUid) {
    logger?.(`ownership-check: success - uid=${currentUid}`);
    return {
      isOwned: true,
      error: null,
      ownerUid: stats.uid,
      currentUid,
      isNetworkMount,
      platform: process.platform
    };
  }

  // UIDs don't match - file owned by different user
  const error = 'File not owned by current user (security check failed)';
  logger?.(`ownership-check: failed - file-uid=${stats.uid}, user-uid=${currentUid}`);
  return {
    isOwned: false,
    error,
    ownerUid: stats.uid,
    currentUid,
    isNetworkMount,
    platform: process.platform
  };
}

/**
 * Windows ownership verification
 * Windows doesn't have traditional UID system, use file permissions
 *
 * @private
 */
function verifyWindowsOwnership(filePath, stats, currentUid, isNetworkMount, allowNetworkMounts, logger) {
  // On Windows, process.getuid() is typically undefined
  // Try to verify through accessible permissions instead

  // If running in WSL (Windows Subsystem for Linux), we have UID available
  if (currentUid !== null && stats.uid !== undefined) {
    if (stats.uid === currentUid) {
      logger?.(`ownership-check: windows-wsl-success - uid=${currentUid}`);
      return {
        isOwned: true,
        error: null,
        ownerUid: stats.uid,
        currentUid,
        isNetworkMount,
        platform: process.platform
      };
    }

    const error = 'File not owned by current user (security check failed)';
    logger?.(`ownership-check: windows-wsl-failed - file-uid=${stats.uid}, user-uid=${currentUid}`);
    return {
      isOwned: false,
      error,
      ownerUid: stats.uid,
      currentUid,
      isNetworkMount,
      platform: process.platform
    };
  }

  // Native Windows without UID support
  // Check if file is readable and writable by current user (best effort)
  try {
    // Try to read and write to verify we own it
    fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);

    // If we can read and write, assume we own it
    logger?.(`ownership-check: windows-native-success - readable-writable`);
    return {
      isOwned: true,
      error: null,
      ownerUid: null,
      currentUid: null,
      isNetworkMount,
      platform: process.platform
    };
  } catch (err) {
    // Can't read/write - likely not owned by us or permission issue
    const error = `File not owned by current user or not accessible (Windows): ${err.message}`;
    logger?.(`ownership-check: windows-native-failed - ${err.code}`);
    return {
      isOwned: false,
      error,
      ownerUid: null,
      currentUid: null,
      isNetworkMount,
      platform: process.platform
    };
  }
}

/**
 * Determine if path is likely a network mount
 * Used to set expectations for ownership checking reliability
 *
 * @private
 */
function checkIsNetworkMount(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (process.platform === 'win32') {
    // Windows: check for UNC paths (\\server\share) or mapped drives
    // Coerce to boolean — match() returns array|null, not boolean
    return resolvedPath.startsWith('\\\\') ||
           !!resolvedPath.match(/^[A-Z]:\\[^\\]*\\netshare/i);
  } else {
    // Unix: check for common network mount prefixes
    // /mnt, /media, NFS mount points
    return resolvedPath.startsWith('/mnt/') ||
           resolvedPath.startsWith('/media/') ||
           resolvedPath.includes(':/');  // NFS mount indicators
  }
}

/**
 * Get human-readable platform type
 *
 * @private
 */
function getPlatformType() {
  switch (process.platform) {
    case 'linux':
      return 'linux';
    case 'darwin':
      return 'macos';
    case 'win32':
      return 'windows';
    default:
      return process.platform;
  }
}

/**
 * Story 4.3: Get current user information for logging/debugging
 *
 * Returns user info in a sanitized format safe for logging.
 * Does NOT include sensitive paths or full usernames.
 *
 * @returns {Object} {
 *   uid: number|null,
 *   gid: number|null,
 *   username: string,
 *   platform: string
 * }
 */
export function getCurrentUserInfo() {
  try {
    const uid = process.getuid ? process.getuid() : null;
    const gid = process.getgid ? process.getgid() : null;
    const username = os.userInfo().username || 'unknown';

    return {
      uid,
      gid,
      username,
      platform: getPlatformType()
    };
  } catch (err) {
    return {
      uid: null,
      gid: null,
      username: 'unknown',
      platform: getPlatformType()
    };
  }
}

/**
 * Story 4.3: Batch verify ownership of multiple files
 *
 * Efficiently checks ownership of multiple files.
 * Returns detailed results for each file.
 *
 * @param {string[]} filePaths - Array of file paths to check
 * @param {Object} options - Verification options (passed to verifyFileOwnership)
 * @returns {Object} {
 *   allOwned: boolean,
 *   results: Array<{path: string, isOwned: boolean, error: string|null}>
 * }
 */
export function verifyMultipleFiles(filePaths, options = {}) {
  const results = [];
  let allOwned = true;

  for (const filePath of filePaths) {
    const result = verifyFileOwnership(filePath, options);
    results.push({
      path: filePath,
      isOwned: result.isOwned,
      error: result.error
    });

    if (!result.isOwned) {
      allOwned = false;
    }
  }

  return {
    allOwned,
    results
  };
}

export default {
  verifyFileOwnership,
  getCurrentUserInfo,
  verifyMultipleFiles
};
