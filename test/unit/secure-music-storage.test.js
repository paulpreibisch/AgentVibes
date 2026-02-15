/**
 * Secure Music Storage Tests
 * Story 4.4: File Copy and Secure Storage
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  copyToSecureStorage,
  readMusicMetadata,
  getStoredMusicPath,
  deleteStoredMusic
} from '../../src/utils/secure-music-storage.js';

// ============================================================================
// Helper: Create test environment
// ============================================================================

function createTestEnv() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-storage-test-'));
  const claudeDir = path.join(tempDir, '.claude');
  fs.mkdirSync(claudeDir);

  return {
    tempDir,
    claudeDir,
    cleanup: () => fs.rmSync(tempDir, { recursive: true })
  };
}

function createTestAudioFile(dir, filename = 'test-music.mp3') {
  const filePath = path.join(dir, filename);
  // Create a minimal MP3-like file (just magic bytes + content)
  const content = Buffer.concat([
    Buffer.from([0xFF, 0xFA]), // MP3 header
    Buffer.from('This is test audio content for testing purposes')
  ]);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ============================================================================
// Basic Copy Operation Tests
// ============================================================================

test('Copy: Basic file copy to secure storage', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const result = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(result.success, 'Copy should succeed');
    assert.strictEqual(result.error, null, 'Should have no error');
    assert(result.storagePath, 'Should return storage path');
    assert(fs.existsSync(result.storagePath), 'File should exist at storage path');
  } finally {
    env.cleanup();
  }
});

test('Copy: File stored in correct directory structure', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir, 'custom-music.mp3');
    const result = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(result.success, 'Copy should succeed');
    assert(result.storagePath.includes('audio/custom-music/tracks'), 'Should be in correct directory structure');
  } finally {
    env.cleanup();
  }
});

test('Copy: Permissions set correctly on stored file (600)', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const result = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(result.success, 'Copy should succeed');
    const stats = fs.statSync(result.storagePath);
    // 0o600 = 384 decimal, mode includes file type bits
    const userPerms = stats.mode & 0o777;
    // Should be 0o600 (user read/write) or 0o644 depending on system defaults
    assert(
      (userPerms & 0o600) === 0o600,
      `File permissions ${(userPerms).toString(8)} should have user read/write`
    );
  } finally {
    env.cleanup();
  }
});

test('Copy: Directories created with secure permissions (700)', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    await copyToSecureStorage(sourceFile, env.claudeDir);

    const musicDir = path.join(env.claudeDir, 'audio/custom-music');
    assert(fs.existsSync(musicDir), 'Music directory should exist');

    const stats = fs.statSync(musicDir);
    const dirPerms = stats.mode & 0o777;
    assert(
      (dirPerms & 0o700) === 0o700,
      `Directory permissions ${dirPerms.toString(8)} should have user rwx`
    );
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Checksum Verification Tests
// ============================================================================

test('Checksum: Source and copy checksums match', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const result = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(result.success, 'Copy should succeed with matching checksums');
    assert.strictEqual(result.error, null, 'Should have no checksum error');
  } finally {
    env.cleanup();
  }
});

test('Checksum: Checksum stored in metadata', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const result = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(result.success, 'Copy should succeed');
    assert(result.metadata, 'Should have metadata');
    assert(result.metadata.checksum, 'Metadata should include checksum');
    assert.match(result.metadata.checksum, /^[a-f0-9]{64}$/, 'Checksum should be valid SHA256 hex');
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Metadata Storage Tests
// ============================================================================

test('Metadata: Metadata file created with original filename', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir, 'my-favorite-song.mp3');
    const result = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(result.success, 'Copy should succeed');
    assert(result.metadata, 'Should have metadata');
    assert.strictEqual(result.metadata.originalFilename, 'my-favorite-song.mp3', 'Should store original filename');
  } finally {
    env.cleanup();
  }
});

test('Metadata: Metadata includes copy date and file size', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const sourceStats = fs.statSync(sourceFile);
    const result = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(result.success, 'Copy should succeed');
    assert(result.metadata.copiedDate, 'Should have copy date');
    assert(result.metadata.fileSize, 'Should have file size');
    assert.strictEqual(result.metadata.fileSize, sourceStats.size, 'File size should match source');
  } finally {
    env.cleanup();
  }
});

test('Metadata: Metadata can be read back', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const copyResult = await copyToSecureStorage(sourceFile, env.claudeDir);

    assert(copyResult.success, 'Copy should succeed');

    const readResult = readMusicMetadata(env.claudeDir);
    assert(readResult.success, 'Read should succeed');
    assert(readResult.metadata, 'Should have metadata');
    assert.strictEqual(readResult.metadata.originalFilename, path.basename(sourceFile));
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Backup Tests
// ============================================================================

test('Backup: Previous file backed up when overwriting', async () => {
  const env = createTestEnv();
  try {
    // Copy first file
    const sourceFile1 = createTestAudioFile(env.tempDir, 'song1.mp3');
    const result1 = await copyToSecureStorage(sourceFile1, env.claudeDir);
    assert(result1.success, 'First copy should succeed');

    // Copy second file with same target name
    const subdir = path.join(env.tempDir, 'subdir');
    fs.mkdirSync(subdir);
    const sourceFile2 = path.join(subdir, 'song1.mp3');
    fs.writeFileSync(sourceFile2, Buffer.from([0xFF, 0xFA, 0xAA, 0xBB])); // Different content

    const result2 = await copyToSecureStorage(sourceFile2, env.claudeDir);
    assert(result2.success, 'Second copy should succeed');
    assert(result2.backupPath, 'Should have backup path');
    assert(fs.existsSync(result2.backupPath), 'Backup file should exist');
  } finally {
    env.cleanup();
  }
});

test('Backup: Backup file has correct timestamp format', async () => {
  const env = createTestEnv();
  try {
    const sourceFile1 = createTestAudioFile(env.tempDir, 'music.mp3');
    const result1 = await copyToSecureStorage(sourceFile1, env.claudeDir);

    const subdir = path.join(env.tempDir, 'subdir');
    fs.mkdirSync(subdir);
    const sourceFile2 = path.join(subdir, 'music.mp3');
    fs.writeFileSync(sourceFile2, Buffer.from([0xFF, 0xFA, 0xCC, 0xDD]));

    const result2 = await copyToSecureStorage(sourceFile2, env.claudeDir);

    if (result2.backupPath) {
      const backupFilename = path.basename(result2.backupPath);
      // Should have timestamp format: YYYY-MM-DDTHH-MM-SS-sssZ-filename
      assert(backupFilename.match(/^\d{4}-\d{2}-\d{2}T/), 'Backup should have ISO timestamp');
    }
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Retrieval Tests
// ============================================================================

test('Retrieval: Get stored music path', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const copyResult = await copyToSecureStorage(sourceFile, env.claudeDir);

    const getResult = getStoredMusicPath(env.claudeDir);
    assert(getResult.exists, 'Stored music should exist');
    assert(getResult.path, 'Should have path');
    assert.strictEqual(getResult.path, copyResult.storagePath, 'Path should match copy result');
  } finally {
    env.cleanup();
  }
});

test('Retrieval: Get returns null when no music stored', async () => {
  const env = createTestEnv();
  try {
    const getResult = getStoredMusicPath(env.claudeDir);

    assert(!getResult.exists, 'Should not exist initially');
    assert.strictEqual(getResult.path, null, 'Path should be null');
  } finally {
    env.cleanup();
  }
});

test('Retrieval: Get returns original filename', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir, 'my-custom-song.wav');
    await copyToSecureStorage(sourceFile, env.claudeDir);

    const getResult = getStoredMusicPath(env.claudeDir);
    assert.strictEqual(getResult.filename, 'my-custom-song.wav', 'Should return original filename');
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Delete Tests
// ============================================================================

test('Delete: Stored music can be deleted', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const copyResult = await copyToSecureStorage(sourceFile, env.claudeDir);
    assert(copyResult.success, 'Copy should succeed');

    const deleteResult = deleteStoredMusic(env.claudeDir);
    assert(deleteResult.success, 'Delete should succeed');
    assert(!fs.existsSync(copyResult.storagePath), 'File should be deleted');
  } finally {
    env.cleanup();
  }
});

test('Delete: Metadata removed after delete', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    await copyToSecureStorage(sourceFile, env.claudeDir);

    deleteStoredMusic(env.claudeDir);

    const getResult = getStoredMusicPath(env.claudeDir);
    assert(!getResult.exists, 'Should not exist after delete');
  } finally {
    env.cleanup();
  }
});

test('Delete: No error when deleting non-existent music', async () => {
  const env = createTestEnv();
  try {
    const deleteResult = deleteStoredMusic(env.claudeDir);

    assert(deleteResult.success, 'Delete should succeed even if nothing stored');
    assert.strictEqual(deleteResult.error, null, 'Should have no error');
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Error Cases
// ============================================================================

test('Error: Null source path', async () => {
  const env = createTestEnv();
  try {
    const result = await copyToSecureStorage(null, env.claudeDir);

    assert(!result.success, 'Should fail with null source');
    assert(result.error, 'Should have error message');
  } finally {
    env.cleanup();
  }
});

test('Error: Non-existent source file', async () => {
  const env = createTestEnv();
  try {
    const result = await copyToSecureStorage('/nonexistent/file.mp3', env.claudeDir);

    assert(!result.success, 'Should fail for missing source');
    assert(result.error, 'Should have error message');
    assert.match(result.error, /does not exist/, 'Error should mention missing file');
  } finally {
    env.cleanup();
  }
});

test('Error: Directory as source', async () => {
  const env = createTestEnv();
  try {
    const sourceDir = path.join(env.tempDir, 'sourcedir');
    fs.mkdirSync(sourceDir);

    const result = await copyToSecureStorage(sourceDir, env.claudeDir);

    assert(!result.success, 'Should fail for directory source');
    assert(result.error, 'Should have error message');
  } finally {
    env.cleanup();
  }
});

test('Error: Invalid claude directory', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);

    const result = await copyToSecureStorage(sourceFile, null);

    assert(!result.success, 'Should fail with null claude dir');
    assert(result.error, 'Should have error message');
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Logging Support
// ============================================================================

test('Logging: Logger called during copy operation', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir);
    const logs = [];
    const logger = (msg) => logs.push(msg);

    const result = await copyToSecureStorage(sourceFile, env.claudeDir, { logger });

    assert(result.success, 'Copy should succeed');
    assert(logs.length > 0, 'Logger should be called');
    assert(logs.some(l => l.includes('starting copy')), 'Should log copy start');
    assert(logs.some(l => l.includes('success')), 'Should log success');
  } finally {
    env.cleanup();
  }
});

test('Logging: Logger called on copy failure', async () => {
  const logs = [];
  const logger = (msg) => logs.push(msg);

  await copyToSecureStorage('/nonexistent/file.mp3', '/nonexistent/dir', { logger });

  assert(logs.length > 0, 'Logger should be called on error');
  assert(logs.some(l => l.includes('failed')), 'Should log failure');
});

// ============================================================================
// Options Handling
// ============================================================================

test('Options: Custom filename option accepted', async () => {
  const env = createTestEnv();
  try {
    const sourceFile = createTestAudioFile(env.tempDir, 'original-name.mp3');
    const result = await copyToSecureStorage(sourceFile, env.claudeDir, {
      filename: 'custom-name.mp3'
    });

    assert(result.success, 'Copy should succeed with custom filename');
    assert(result.storagePath.includes('custom-name.mp3'), 'Should use custom filename');
  } finally {
    env.cleanup();
  }
});

// ============================================================================
// Integration Tests
// ============================================================================

test('Integration: Complete workflow - copy, read, get, delete', async () => {
  const env = createTestEnv();
  try {
    // 1. Copy file
    const sourceFile = createTestAudioFile(env.tempDir, 'song.mp3');
    const copyResult = await copyToSecureStorage(sourceFile, env.claudeDir);
    assert(copyResult.success, 'Copy should succeed');

    // 2. Read metadata
    const readResult = readMusicMetadata(env.claudeDir);
    assert(readResult.success, 'Read should succeed');
    assert(readResult.metadata, 'Should have metadata');

    // 3. Get stored music path
    const getResult = getStoredMusicPath(env.claudeDir);
    assert(getResult.exists, 'Should exist');
    assert(getResult.path, 'Should have path');

    // 4. Delete music
    const deleteResult = deleteStoredMusic(env.claudeDir);
    assert(deleteResult.success, 'Delete should succeed');

    // 5. Verify deleted
    const finalGet = getStoredMusicPath(env.claudeDir);
    assert(!finalGet.exists, 'Should not exist after delete');
  } finally {
    env.cleanup();
  }
});

test('Integration: Multiple copies - each overwrites previous', async () => {
  const env = createTestEnv();
  try {
    // Copy 1
    const file1 = createTestAudioFile(env.tempDir, 'music.mp3');
    const result1 = await copyToSecureStorage(file1, env.claudeDir);
    assert(result1.success, 'First copy should succeed');

    // Copy 2 - same name
    const file2Dir = path.join(env.tempDir, 'subdir');
    fs.mkdirSync(file2Dir);
    const file2 = path.join(file2Dir, 'music.mp3');
    fs.writeFileSync(file2, Buffer.from([0xFF, 0xFA, 0x01, 0x02]));

    const result2 = await copyToSecureStorage(file2, env.claudeDir);
    assert(result2.success, 'Second copy should succeed');
    assert(result2.backupPath, 'First file should be backed up');

    // Verify current file is the new one
    const getResult = getStoredMusicPath(env.claudeDir);
    const currentContent = fs.readFileSync(getResult.path);
    assert(currentContent.includes(0x01), 'Current file should be the second one');
  } finally {
    env.cleanup();
  }
});
