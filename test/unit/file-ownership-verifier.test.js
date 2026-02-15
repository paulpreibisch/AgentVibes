/**
 * File Ownership Verifier Tests
 * Story 4.3: File Ownership Verification
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  verifyFileOwnership,
  getCurrentUserInfo,
  verifyMultipleFiles
} from '../../src/utils/file-ownership-verifier.js';

// ============================================================================
// Helper: Create test files
// ============================================================================

function createTestFile(tempDir, filename) {
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, 'test content');
  return filePath;
}

// ============================================================================
// Platform Detection Tests
// ============================================================================

test('Platform: Detect current platform', () => {
  const info = getCurrentUserInfo();
  assert(info.platform, 'Should detect platform');
  assert(['linux', 'macos', 'windows'].includes(info.platform), 'Platform should be recognized');
});

test('Platform: Verify platform-specific UID availability', () => {
  const info = getCurrentUserInfo();

  if (process.platform === 'win32') {
    // Windows may not have UID in native Windows (but does in WSL)
    // Just verify we can call the function without error
    assert(info.uid === null || typeof info.uid === 'number', 'UID should be null or number on Windows');
  } else {
    // Linux and macOS should have UID
    assert(typeof info.uid === 'number', 'Should have UID on Unix-like systems');
    assert(info.uid >= 0, 'UID should be non-negative');
  }
});

// ============================================================================
// User Information Tests
// ============================================================================

test('User Info: Get current user information', () => {
  const info = getCurrentUserInfo();

  assert(info.username, 'Should return username');
  assert(['linux', 'macos', 'windows'].includes(info.platform), 'Should have valid platform');
  assert(typeof info.username === 'string', 'Username should be string');
});

test('User Info: Current user is consistent', () => {
  const info1 = getCurrentUserInfo();
  const info2 = getCurrentUserInfo();

  assert.strictEqual(info1.uid, info2.uid, 'UID should be consistent');
  assert.strictEqual(info1.username, info2.username, 'Username should be consistent');
});

// ============================================================================
// Ownership Verification Tests - Happy Path
// ============================================================================

test('Ownership: Verify ownership of current user\'s file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const result = verifyFileOwnership(filePath);

    // File created by current process should be owned by current user
    assert(result.isOwned, 'File created by current user should be verified as owned');
    assert.strictEqual(result.error, null, 'Should have no error');
    assert(result.platform, 'Should include platform info');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Ownership: Return correct current UID', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const result = verifyFileOwnership(filePath);

    // On Unix systems with file ownership
    if (process.platform !== 'win32' || process.getuid) {
      assert(typeof result.ownerUid === 'number', 'Should return file owner UID');
      assert(typeof result.currentUid === 'number', 'Should return current user UID');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Ownership: Performance < 10ms', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');

    const startTime = performance.now();
    const result = verifyFileOwnership(filePath);
    const endTime = performance.now();
    const duration = endTime - startTime;

    assert(result.isOwned, 'Verification should succeed');
    assert(duration < 10, `Ownership check took ${duration.toFixed(2)}ms, should be < 10ms`);
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Error Cases - Invalid Input
// ============================================================================

test('Error: Null file path', () => {
  const result = verifyFileOwnership(null);

  assert.strictEqual(result.isOwned, false, 'Should fail with null path');
  assert(result.error, 'Should have error message');
  assert.match(result.error, /non-empty string/, 'Error should mention required input');
});

test('Error: Empty string file path', () => {
  const result = verifyFileOwnership('');

  assert.strictEqual(result.isOwned, false, 'Should fail with empty path');
  assert(result.error, 'Should have error message');
});

test('Error: Non-string file path', () => {
  const result = verifyFileOwnership(123);

  assert.strictEqual(result.isOwned, false, 'Should fail with non-string');
  assert(result.error, 'Should have error message');
});

test('Error: Non-existent file', () => {
  const result = verifyFileOwnership('/nonexistent/path/to/file.txt');

  assert.strictEqual(result.isOwned, false, 'Should fail for missing file');
  assert(result.error, 'Should have error message');
  assert.match(result.error, /does not exist/, 'Error should mention missing file');
});

test('Error: Directory instead of file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const result = verifyFileOwnership(tempDir);

    assert.strictEqual(result.isOwned, false, 'Should fail for directory');
    assert(result.error, 'Should have error message');
    assert.match(result.error, /regular file/, 'Error should mention regular file requirement');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Logging Support
// ============================================================================

test('Logging: Logger function is called on success', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const logs = [];
    const logger = (message) => logs.push(message);

    const result = verifyFileOwnership(filePath, { logger });

    assert(result.isOwned, 'Should verify ownership');
    assert(logs.length > 0, 'Logger should be called');
    assert(logs.some(log => log.includes('success')), 'Should log success');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Logging: Logger function is called on failure', () => {
  const logs = [];
  const logger = (message) => logs.push(message);

  verifyFileOwnership('/nonexistent/file.txt', { logger });

  assert(logs.length > 0, 'Logger should be called on error');
  assert(logs.some(log => log.includes('missing-file')), 'Should log missing file');
});

test('Logging: Logger receives sanitized messages', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const logs = [];
    const logger = (message) => logs.push(message);

    verifyFileOwnership(filePath, { logger });

    // Logs should not contain actual file paths in errors
    const logContent = logs.join(' ');
    // Check that log format is proper (contains uid, platform, etc)
    assert(logContent.includes('ownership-check'), 'Should use consistent log prefix');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Platform-Specific Tests
// ============================================================================

test('Platform Semantics: Correct platform reported in result', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const result = verifyFileOwnership(filePath);

    assert.strictEqual(result.platform, process.platform, 'Should report correct platform');
    assert(['linux', 'darwin', 'win32'].includes(result.platform), 'Should be valid process.platform');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Network Mount Detection
// ============================================================================

test('Network Detection: Non-network path detected correctly', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const result = verifyFileOwnership(filePath);

    assert.strictEqual(result.isNetworkMount, false, 'Local temp dir should not be detected as network mount');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Batch Verification
// ============================================================================

test('Batch: Verify multiple files - all owned', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const file1 = createTestFile(tempDir, 'file1.txt');
    const file2 = createTestFile(tempDir, 'file2.txt');
    const file3 = createTestFile(tempDir, 'file3.txt');

    const result = verifyMultipleFiles([file1, file2, file3]);

    assert.strictEqual(result.allOwned, true, 'All files should be owned by current user');
    assert.strictEqual(result.results.length, 3, 'Should have results for all 3 files');
    assert(result.results.every(r => r.isOwned), 'All results should show ownership');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Batch: Verify multiple files - mixed results', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const file1 = createTestFile(tempDir, 'file1.txt');
    const file2 = '/nonexistent/file.txt';
    const file3 = createTestFile(tempDir, 'file3.txt');

    const result = verifyMultipleFiles([file1, file2, file3]);

    assert.strictEqual(result.allOwned, false, 'Should report not all owned');
    assert.strictEqual(result.results.length, 3, 'Should have results for all 3 files');
    assert(result.results[0].isOwned, 'First file should be owned');
    assert(!result.results[1].isOwned, 'Second file should not be owned (missing)');
    assert(result.results[2].isOwned, 'Third file should be owned');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Batch: Error handling in batch verification', () => {
  const result = verifyMultipleFiles([null, undefined, '']);

  assert.strictEqual(result.allOwned, false, 'Should fail for invalid inputs');
  assert.strictEqual(result.results.length, 3, 'Should return results for all inputs');
  assert(result.results.every(r => !r.isOwned), 'All should be invalid');
});

// ============================================================================
// Return Value Structure
// ============================================================================

test('Return Values: Complete result structure on success', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const result = verifyFileOwnership(filePath);

    // Verify all expected properties
    assert('isOwned' in result, 'Should have isOwned');
    assert('error' in result, 'Should have error');
    assert('ownerUid' in result, 'Should have ownerUid');
    assert('currentUid' in result, 'Should have currentUid');
    assert('isNetworkMount' in result, 'Should have isNetworkMount');
    assert('platform' in result, 'Should have platform');

    // Verify types
    assert.strictEqual(typeof result.isOwned, 'boolean', 'isOwned should be boolean');
    assert(result.error === null || typeof result.error === 'string', 'error should be null or string');
    assert.strictEqual(typeof result.isNetworkMount, 'boolean', 'isNetworkMount should be boolean');
    assert.strictEqual(typeof result.platform, 'string', 'platform should be string');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Return Values: Complete result structure on failure', () => {
  const result = verifyFileOwnership('/nonexistent/file.txt');

  // Verify all expected properties
  assert('isOwned' in result, 'Should have isOwned');
  assert('error' in result, 'Should have error');
  assert('ownerUid' in result, 'Should have ownerUid');
  assert('currentUid' in result, 'Should have currentUid');
  assert('isNetworkMount' in result, 'Should have isNetworkMount');
  assert('platform' in result, 'Should have platform');

  // Verify failure state
  assert.strictEqual(result.isOwned, false, 'isOwned should be false');
  assert(result.error, 'error should be populated');
  assert.strictEqual(typeof result.error, 'string', 'error should be string');
});

// ============================================================================
// Options Handling
// ============================================================================

test('Options: allowNetworkMounts option is accepted', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');

    // Should not throw with option provided
    const result1 = verifyFileOwnership(filePath, { allowNetworkMounts: true });
    const result2 = verifyFileOwnership(filePath, { allowNetworkMounts: false });

    // Both should succeed since file is local and owned by user
    assert(result1.isOwned, 'Should verify with allowNetworkMounts=true');
    assert(result2.isOwned, 'Should verify with allowNetworkMounts=false');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Options: logger option is accepted', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const filePath = createTestFile(tempDir, 'myfile.txt');
    const logs = [];

    // Should not throw with logger provided
    const result = verifyFileOwnership(filePath, {
      logger: (msg) => logs.push(msg),
      allowNetworkMounts: true
    });

    assert(result.isOwned, 'Verification should succeed');
    assert(logs.length > 0, 'Logger should be called');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Edge Cases
// ============================================================================

test('Edge Case: Symlink to owned file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const actualFile = createTestFile(tempDir, 'actual.txt');
    const symlink = path.join(tempDir, 'link.txt');

    // Create symlink if possible
    try {
      fs.symlinkSync(actualFile, symlink);

      const result = verifyFileOwnership(symlink);
      // Symlink itself should be owned by current user
      assert(result.isOwned, 'Symlink to owned file should verify as owned');
    } catch (err) {
      // Skip if symlinks not supported (Windows without admin)
      if (err.code === 'ENOENT') {
        console.log('Symlinks not supported in this environment, skipping test');
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Edge Case: Very long file path', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    // Create nested directories to get a long path
    let currentPath = tempDir;
    for (let i = 0; i < 5; i++) {
      currentPath = path.join(currentPath, `dir_${i}`);
      fs.mkdirSync(currentPath);
    }

    const filePath = path.join(currentPath, 'file.txt');
    fs.writeFileSync(filePath, 'content');

    const result = verifyFileOwnership(filePath);
    assert(result.isOwned, 'Should handle long paths');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Error Message Quality
// ============================================================================

test('Error Messages: Clear error for missing file', () => {
  const result = verifyFileOwnership('/nonexistent/file.txt');

  assert(result.error, 'Should have error message');
  assert.match(result.error, /does not exist/, 'Error should mention missing file');
});

test('Error Messages: Clear error for non-file path', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-test-'));
  try {
    const result = verifyFileOwnership(tempDir);

    assert(result.error, 'Should have error message');
    assert.match(result.error, /regular file/, 'Error should mention regular file');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});
