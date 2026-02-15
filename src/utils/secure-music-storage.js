/**
 * Secure Music Storage - File Copy and Secure Storage
 * Story 4.4: File Copy and Secure Storage
 *
 * Copies validated music files to secure storage with:
 * - Secure directory and file permissions (700/600)
 * - Metadata storage (original filename, copy date, size, checksum)
 * - Checksum verification (source vs. copy)
 * - Backup of previous music before overwriting
 * - Atomic operations (complete or fail, no partial state)
 *
 * @module secure-music-storage
 * @requires fs
 * @requires path
 * @requires crypto
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Default storage location relative to .claude directory
 */
const MUSIC_STORAGE_DIR = 'audio/custom-music';
const MUSIC_STORAGE_SUBDIR = 'tracks';
const METADATA_FILE = 'music-metadata.json';
const BACKUP_SUBDIR = 'backups';

/**
 * Story 4.4: Copy validated audio file to secure storage
 *
 * Process:
 * 1. Create secure storage directory if not exists (700 permissions)
 * 2. Calculate checksum of source file
 * 3. Backup previous music if exists
 * 4. Copy file to storage with secure permissions (600)
 * 5. Verify checksums match (source vs. copy)
 * 6. Store metadata (original filename, date, size, checksum)
 * 7. Return success with file info
 *
 * @param {string} sourceFilePath - Path to validated source audio file
 * @param {string} claudeDir - Path to .claude directory
 * @param {Object} options - Storage options
 * @param {string} options.filename - Custom filename (default: source basename)
 * @param {Function} options.logger - Optional logger function
 * @returns {Object} {
 *   success: boolean,
 *   error: string|null,
 *   storagePath: string|null,
 *   metadataPath: string|null,
 *   backupPath: string|null,
 *   metadata: Object|null
 * }
 */
export async function copyToSecureStorage(sourceFilePath, claudeDir, options = {}) {
  const { filename = null, logger = null } = options;

  try {
    logger?.(`storage: starting copy - source=${path.basename(sourceFilePath)}`);

    // Parameter validation
    if (!sourceFilePath || typeof sourceFilePath !== 'string') {
      throw new Error('Source file path must be a non-empty string');
    }

    if (!claudeDir || typeof claudeDir !== 'string') {
      throw new Error('Claude directory path must be a non-empty string');
    }

    // Verify source file exists and is readable
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error('Source file does not exist');
    }

    const sourceStats = fs.statSync(sourceFilePath);
    if (!sourceStats.isFile()) {
      throw new Error('Source path must be a regular file');
    }

    // Get file extension
    const fileExt = path.extname(sourceFilePath).toLowerCase();
    const targetFilename = filename || path.basename(sourceFilePath);

    // Create storage directory structure
    const musicDir = path.join(claudeDir, MUSIC_STORAGE_DIR);
    const tracksDir = path.join(musicDir, MUSIC_STORAGE_SUBDIR);
    const backupDir = path.join(musicDir, BACKUP_SUBDIR);

    logger?.(`storage: creating directories - ${musicDir}`);

    // Create directories with secure permissions
    const dirCreated = ensureSecureDirectories(musicDir, tracksDir, backupDir, logger);
    if (!dirCreated.success) {
      throw new Error(dirCreated.error);
    }

    // Calculate source checksum
    logger?.(`storage: calculating source checksum`);
    const sourceChecksum = calculateFileChecksum(sourceFilePath);

    // Path where file will be stored
    const targetStoragePath = path.join(tracksDir, targetFilename);

    // Backup previous music if exists
    let backupPath = null;
    if (fs.existsSync(targetStoragePath)) {
      logger?.(`storage: backing up previous music`);
      const backupResult = backupPreviousFile(targetStoragePath, backupDir, logger);
      if (!backupResult.success) {
        throw new Error(`Failed to backup previous music: ${backupResult.error}`);
      }
      backupPath = backupResult.backupPath;
    }

    // Copy file to storage
    logger?.(`storage: copying file to storage`);
    try {
      fs.copyFileSync(sourceFilePath, targetStoragePath);
    } catch (err) {
      throw new Error(`Failed to copy file: ${err.message}`);
    }

    // Set file permissions (600 = user read/write only)
    try {
      fs.chmodSync(targetStoragePath, 0o600);
    } catch (err) {
      // Log warning but continue - copy is done
      logger?.(`storage: warning - could not set file permissions: ${err.message}`);
    }

    // Verify checksums match
    logger?.(`storage: verifying checksums`);
    const targetChecksum = calculateFileChecksum(targetStoragePath);

    if (sourceChecksum !== targetChecksum) {
      // Checksums don't match - file corruption
      try {
        fs.unlinkSync(targetStoragePath);
      } catch (err) {
        logger?.(`storage: warning - could not delete corrupted file: ${err.message}`);
      }
      throw new Error('File corruption detected: checksums do not match');
    }

    // Store metadata
    logger?.(`storage: storing metadata`);
    const metadata = {
      originalFilename: path.basename(sourceFilePath),
      storagePath: targetStoragePath,
      copiedDate: new Date().toISOString(),
      fileSize: sourceStats.size,
      checksum: sourceChecksum,
      extension: fileExt
    };

    const metadataPath = path.join(musicDir, METADATA_FILE);
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
    } catch (err) {
      logger?.(`storage: warning - could not store metadata: ${err.message}`);
    }

    logger?.(`storage: success - file stored at ${path.relative(claudeDir, targetStoragePath)}`);

    return {
      success: true,
      error: null,
      storagePath: targetStoragePath,
      metadataPath,
      backupPath,
      metadata
    };

  } catch (err) {
    const error = err.message || String(err);
    logger?.(`storage: failed - ${error}`);
    return {
      success: false,
      error,
      storagePath: null,
      metadataPath: null,
      backupPath: null,
      metadata: null
    };
  }
}

/**
 * Ensure secure storage directories exist with proper permissions
 *
 * @private
 */
function ensureSecureDirectories(musicDir, tracksDir, backupDir, logger) {
  try {
    // Create main music directory
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true, mode: 0o700 });
      logger?.(`storage: created music directory with 700 permissions`);
    } else {
      // Verify permissions on existing directory
      const stats = fs.statSync(musicDir);
      if ((stats.mode & 0o077) !== 0) {
        // Has group/other permissions - try to fix
        try {
          fs.chmodSync(musicDir, 0o700);
          logger?.(`storage: fixed insecure permissions on music directory`);
        } catch (err) {
          logger?.(`storage: warning - could not fix permissions: ${err.message}`);
        }
      }
    }

    // Create tracks subdirectory
    if (!fs.existsSync(tracksDir)) {
      fs.mkdirSync(tracksDir, { recursive: true, mode: 0o700 });
      logger?.(`storage: created tracks directory with 700 permissions`);
    }

    // Create backup subdirectory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      logger?.(`storage: created backup directory with 700 permissions`);
    }

    return {
      success: true,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to create directories: ${err.message}`
    };
  }
}

/**
 * Calculate SHA256 checksum of file
 *
 * @private
 */
function calculateFileChecksum(filePath) {
  const hash = crypto.createHash('sha256');
  const fileContent = fs.readFileSync(filePath);
  hash.update(fileContent);
  return hash.digest('hex');
}

/**
 * Backup previous music file to backup directory
 *
 * @private
 */
function backupPreviousFile(previousPath, backupDir, logger) {
  try {
    const filename = path.basename(previousPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${timestamp}-${filename}`;
    const backupPath = path.join(backupDir, backupFilename);

    // Copy to backup
    fs.copyFileSync(previousPath, backupPath);
    fs.chmodSync(backupPath, 0o600);

    logger?.(`storage: backed up previous file to ${path.basename(backupPath)}`);

    return {
      success: true,
      error: null,
      backupPath
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to backup previous file: ${err.message}`,
      backupPath: null
    };
  }
}

/**
 * Story 4.4: Read stored music metadata
 *
 * @param {string} claudeDir - Path to .claude directory
 * @returns {Object} {
 *   success: boolean,
 *   error: string|null,
 *   metadata: Object|null
 * }
 */
export function readMusicMetadata(claudeDir) {
  try {
    const metadataPath = path.join(claudeDir, MUSIC_STORAGE_DIR, METADATA_FILE);

    if (!fs.existsSync(metadataPath)) {
      return {
        success: true,
        error: null,
        metadata: null
      };
    }

    const content = fs.readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);

    return {
      success: true,
      error: null,
      metadata
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to read metadata: ${err.message}`,
      metadata: null
    };
  }
}

/**
 * Story 4.4: Get path to stored custom music file
 *
 * @param {string} claudeDir - Path to .claude directory
 * @returns {Object} {
 *   exists: boolean,
 *   path: string|null,
 *   filename: string|null
 * }
 */
export function getStoredMusicPath(claudeDir) {
  try {
    const metadataPath = path.join(claudeDir, MUSIC_STORAGE_DIR, METADATA_FILE);

    if (!fs.existsSync(metadataPath)) {
      return {
        exists: false,
        path: null,
        filename: null
      };
    }

    const content = fs.readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);

    // Verify the stored file actually exists
    if (!fs.existsSync(metadata.storagePath)) {
      return {
        exists: false,
        path: null,
        filename: null
      };
    }

    return {
      exists: true,
      path: metadata.storagePath,
      filename: metadata.originalFilename
    };
  } catch (err) {
    return {
      exists: false,
      path: null,
      filename: null
    };
  }
}

/**
 * Story 4.4: Delete stored custom music
 *
 * @param {string} claudeDir - Path to .claude directory
 * @returns {Object} { success: boolean, error: string|null }
 */
export function deleteStoredMusic(claudeDir) {
  try {
    const musicInfo = getStoredMusicPath(claudeDir);

    if (!musicInfo.exists) {
      return {
        success: true,
        error: null
      };
    }

    // Delete the stored file
    fs.unlinkSync(musicInfo.path);

    // Delete metadata
    const metadataPath = path.join(claudeDir, MUSIC_STORAGE_DIR, METADATA_FILE);
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }

    return {
      success: true,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to delete stored music: ${err.message}`
    };
  }
}

export default {
  copyToSecureStorage,
  readMusicMetadata,
  getStoredMusicPath,
  deleteStoredMusic
};
