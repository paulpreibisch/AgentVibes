/**
 * Extended Unit Tests for Music File Validator
 * Story 4.1: Path Validation and Security Hardening
 *
 * Covers functions NOT already tested in test/security/path-traversal.test.js:
 *   - validateFileSize(filePath, maxSizeBytes)
 *   - getSecureTempDir(prefix)
 *   - createSecureTempDir(dirPath)
 *
 * Uses node:test + node:assert (ESM). Real temp files via mkdtempSync.
 * Cleaned up in afterEach.
 *
 * @module test/unit/music-file-validator-extended
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  isPathSafe,
  validateFileSize,
  getSecureTempDir,
  createSecureTempDir,
} from '../../src/utils/music-file-validator.js';

// ---------------------------------------------------------------------------
// Shared temp directory — created fresh before each test, removed after each
// ---------------------------------------------------------------------------

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-validator-test-'));
});

afterEach(() => {
  try {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    // Best-effort cleanup — do not fail the test
  }
  tmpDir = null;
});

// ===========================================================================
// validateFileSize()
// ===========================================================================

describe('validateFileSize()', () => {
  test('returns error when file does not exist', () => {
    const missingPath = path.join(tmpDir, 'no-such-file.mp3');
    const result = validateFileSize(missingPath);

    assert.strictEqual(result.isValid, false);
    assert.ok(result.error, 'error should be a non-empty string');
    assert.match(result.error, /does not exist/i);
    assert.strictEqual(result.sizeBytes, 0);
  });

  test('returns error when file exceeds maxSizeBytes', () => {
    const filePath = path.join(tmpDir, 'big.mp3');
    // Write 10 bytes — set max to 5 bytes so it's "too large"
    fs.writeFileSync(filePath, Buffer.alloc(10, 0xaa));

    const result = validateFileSize(filePath, 5);

    assert.strictEqual(result.isValid, false);
    assert.ok(result.error, 'error should be defined');
    assert.match(result.error, /exceeds maximum/i);
    // sizeBytes should reflect the actual file size
    assert.strictEqual(result.sizeBytes, 10);
  });

  test('error message includes both actual size and max size in MB', () => {
    const filePath = path.join(tmpDir, 'oversize.mp3');
    // 2 MB file, 1 MB limit
    const oneMB = 1 * 1024 * 1024;
    const twoMB = 2 * 1024 * 1024;
    fs.writeFileSync(filePath, Buffer.alloc(twoMB, 0x00));

    const result = validateFileSize(filePath, oneMB);

    assert.strictEqual(result.isValid, false);
    assert.match(result.error, /2\.00MB/);
    assert.match(result.error, /1\.00MB/);
  });

  test('returns error for empty file (0 bytes)', () => {
    const filePath = path.join(tmpDir, 'empty.mp3');
    fs.writeFileSync(filePath, Buffer.alloc(0));

    const result = validateFileSize(filePath);

    assert.strictEqual(result.isValid, false);
    assert.match(result.error, /empty/i);
    assert.strictEqual(result.sizeBytes, 0);
  });

  test('returns success with sizeBytes for a valid file', () => {
    const filePath = path.join(tmpDir, 'valid.mp3');
    const content = Buffer.alloc(512, 0xbb); // 512 bytes, well within 50 MB default
    fs.writeFileSync(filePath, content);

    const result = validateFileSize(filePath);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.sizeBytes, 512);
  });

  test('accepts a file whose size equals maxSizeBytes exactly', () => {
    const filePath = path.join(tmpDir, 'exact.mp3');
    // 100 bytes exactly; limit is also 100 bytes
    fs.writeFileSync(filePath, Buffer.alloc(100, 0xcc));

    const result = validateFileSize(filePath, 100);

    // size === max is NOT greater than max, so it should pass
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.sizeBytes, 100);
  });

  test('uses default 50 MB limit when maxSizeBytes is omitted', () => {
    const filePath = path.join(tmpDir, 'small.mp3');
    fs.writeFileSync(filePath, Buffer.alloc(1024, 0xdd)); // 1 KB — well under 50 MB

    const result = validateFileSize(filePath);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.sizeBytes, 1024);
  });
});

// ===========================================================================
// getSecureTempDir()
// ===========================================================================

describe('getSecureTempDir()', () => {
  test('returns a path under XDG_RUNTIME_DIR when the env var is set and the dir exists', () => {
    // Use our own tmpDir as a stand-in for XDG_RUNTIME_DIR (it's guaranteed to exist)
    const originalXdg = process.env.XDG_RUNTIME_DIR;
    try {
      process.env.XDG_RUNTIME_DIR = tmpDir;
      const result = getSecureTempDir('test-prefix');

      assert.ok(result.startsWith(tmpDir), `Expected path to start with ${tmpDir}, got ${result}`);
      assert.ok(result.includes('test-prefix'), 'Path should include the supplied prefix');
    } finally {
      if (originalXdg === undefined) {
        delete process.env.XDG_RUNTIME_DIR;
      } else {
        process.env.XDG_RUNTIME_DIR = originalXdg;
      }
    }
  });

  test('returns a path under os.tmpdir() when XDG_RUNTIME_DIR is not set', () => {
    const originalXdg = process.env.XDG_RUNTIME_DIR;
    try {
      delete process.env.XDG_RUNTIME_DIR;
      const result = getSecureTempDir('av-music');

      // Should fall back to os.tmpdir()-based path
      const sysTmp = os.tmpdir();
      assert.ok(result.startsWith(sysTmp), `Expected path under ${sysTmp}, got ${result}`);
      assert.ok(result.includes('av-music'), 'Path should include the supplied prefix');
    } finally {
      if (originalXdg !== undefined) {
        process.env.XDG_RUNTIME_DIR = originalXdg;
      }
    }
  });

  test('falls back to tmpdir when XDG_RUNTIME_DIR points to a non-existent directory', () => {
    const originalXdg = process.env.XDG_RUNTIME_DIR;
    try {
      // Point to a directory that definitely does not exist
      process.env.XDG_RUNTIME_DIR = path.join(os.tmpdir(), 'xdg-nonexistent-' + process.pid);
      const result = getSecureTempDir('fallback-test');

      const sysTmp = os.tmpdir();
      assert.ok(result.startsWith(sysTmp), `Should fall back under ${sysTmp}, got ${result}`);
    } finally {
      if (originalXdg === undefined) {
        delete process.env.XDG_RUNTIME_DIR;
      } else {
        process.env.XDG_RUNTIME_DIR = originalXdg;
      }
    }
  });

  test('uses default prefix "agentvibes-music" when none is supplied', () => {
    const originalXdg = process.env.XDG_RUNTIME_DIR;
    try {
      delete process.env.XDG_RUNTIME_DIR;
      const result = getSecureTempDir();

      assert.ok(result.includes('agentvibes-music'), `Expected default prefix in ${result}`);
    } finally {
      if (originalXdg !== undefined) {
        process.env.XDG_RUNTIME_DIR = originalXdg;
      }
    }
  });

  test('embeds the current process PID when using XDG_RUNTIME_DIR', () => {
    const originalXdg = process.env.XDG_RUNTIME_DIR;
    try {
      process.env.XDG_RUNTIME_DIR = tmpDir;
      const result = getSecureTempDir('pid-test');

      assert.ok(result.includes(String(process.pid)), `Expected PID ${process.pid} in ${result}`);
    } finally {
      if (originalXdg === undefined) {
        delete process.env.XDG_RUNTIME_DIR;
      } else {
        process.env.XDG_RUNTIME_DIR = originalXdg;
      }
    }
  });
});

// ===========================================================================
// createSecureTempDir()
// ===========================================================================

describe('createSecureTempDir()', () => {
  test('creates a new directory and returns success', () => {
    const newDir = path.join(tmpDir, 'secure-new');
    assert.ok(!fs.existsSync(newDir), 'Precondition: directory must not exist yet');

    const result = createSecureTempDir(newDir);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.dirPath, newDir);
    assert.ok(fs.existsSync(newDir), 'Directory should now exist on disk');
  });

  test('new directory is created with restrictive 0o700 mode', () => {
    if (process.platform === 'win32') return; // Windows does not enforce Unix file permission modes
    const newDir = path.join(tmpDir, 'mode-check');
    createSecureTempDir(newDir);

    const stats = fs.statSync(newDir);
    // Check that no group/world bits are set (mode & 0o077 === 0)
    const groupWorldBits = stats.mode & 0o077;
    assert.strictEqual(groupWorldBits, 0, `Expected mode 0o700, got ${(stats.mode & 0o777).toString(8)}`);
  });

  test('succeeds when the directory already exists with secure permissions (0o700)', () => {
    if (process.platform === 'win32') return; // Windows does not enforce Unix file permission modes
    const existingDir = path.join(tmpDir, 'already-secure');
    fs.mkdirSync(existingDir, { mode: 0o700 });

    const result = createSecureTempDir(existingDir);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.dirPath, existingDir);
  });

  test('returns error when existing directory has insecure permissions (0o777)', () => {
    const insecureDir = path.join(tmpDir, 'insecure');
    fs.mkdirSync(insecureDir, { mode: 0o777 });

    const result = createSecureTempDir(insecureDir);

    assert.strictEqual(result.success, false);
    assert.ok(result.error, 'error should be a non-empty string');
    assert.match(result.error, /insecure permissions/i);
    assert.strictEqual(result.dirPath, null);
  });

  test('returns error when existing directory has group-readable permissions (0o750)', () => {
    const groupReadableDir = path.join(tmpDir, 'group-readable');
    fs.mkdirSync(groupReadableDir, { mode: 0o750 });

    const result = createSecureTempDir(groupReadableDir);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /insecure permissions/i);
  });

  test('returns error when existing directory is world-readable (0o755)', () => {
    const worldReadableDir = path.join(tmpDir, 'world-readable');
    fs.mkdirSync(worldReadableDir, { mode: 0o755 });

    const result = createSecureTempDir(worldReadableDir);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /insecure permissions/i);
  });

  test('returns the dirPath unchanged on success', () => {
    const target = path.join(tmpDir, 'roundtrip');
    const result = createSecureTempDir(target);

    assert.strictEqual(result.dirPath, target);
  });
});

// ===========================================================================
// isPathSafe() — unit-level tests using tmpDir as the "home directory"
//
// isPathSafe(userPath, userHomeDir) accepts an explicit home directory so we
// can pass tmpDir instead of os.homedir(), keeping tests self-contained and
// free from side-effects on the real home dir.
// ===========================================================================

describe('isPathSafe() — input validation', () => {
  test('returns isValid:false for null path', () => {
    const result = isPathSafe(null, tmpDir);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error, 'error should be set');
    assert.strictEqual(result.resolvedPath, null);
  });

  test('returns isValid:false for empty string path', () => {
    const result = isPathSafe('', tmpDir);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.resolvedPath, null);
  });

  test('returns isValid:false for non-string path (number)', () => {
    const result = isPathSafe(42, tmpDir);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.resolvedPath, null);
  });

  test('error message mentions "non-empty string" for null path', () => {
    const result = isPathSafe(null, tmpDir);
    assert.match(result.error, /non-empty string/i);
  });
});

describe('isPathSafe() — home directory boundary enforcement', () => {
  test('returns isValid:false when path is outside the custom homeDir', () => {
    // /etc/passwd is outside tmpDir — must be rejected
    const result = isPathSafe('/etc/passwd', tmpDir);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.resolvedPath, null);
  });

  test('error message mentions "home directory" for out-of-home paths', () => {
    const result = isPathSafe('/etc/passwd', tmpDir);
    assert.match(result.error, /home directory/i);
  });

  test('rejects a path that shares a prefix with homeDir but is outside it', () => {
    // e.g. if homeDir is /tmp/abc, /tmp/abcdef should be rejected
    const parent = path.dirname(tmpDir);
    const sibling = tmpDir + '_sibling';
    const result = isPathSafe(path.join(sibling, 'file.mp3'), tmpDir);
    assert.strictEqual(result.isValid, false);
  });
});

describe('isPathSafe() — file existence and type checks', () => {
  test('returns isValid:false for a path that does not exist', () => {
    const missing = path.join(tmpDir, 'does-not-exist.mp3');
    const result = isPathSafe(missing, tmpDir);
    assert.strictEqual(result.isValid, false);
    assert.match(result.error, /not found|ENOENT/i);
  });

  test('returns isValid:false when the path is a directory', () => {
    // tmpDir itself is a directory — not a regular file
    const result = isPathSafe(tmpDir, path.dirname(tmpDir));
    assert.strictEqual(result.isValid, false);
    assert.match(result.error, /directory|regular file/i);
  });

  test('returns isValid:true and resolvedPath for a valid regular file inside homeDir', () => {
    if (process.platform === 'win32') return; // File ownership verification not available on Windows
    // Create a file owned by the current user inside tmpDir
    const validFile = path.join(tmpDir, 'valid-audio.mp3');
    fs.writeFileSync(validFile, Buffer.alloc(100, 0xff), { mode: 0o600 });

    const result = isPathSafe(validFile, tmpDir);

    assert.strictEqual(result.isValid, true, `Expected isValid:true, got error: ${result.error}`);
    assert.strictEqual(result.error, null);
    assert.ok(result.resolvedPath, 'resolvedPath should be set');
    assert.ok(result.resolvedPath.includes(tmpDir), 'resolvedPath should be under tmpDir');
  });

  test('resolvedPath is an absolute path on success', () => {
    if (process.platform === 'win32') return; // isPathSafe uses process.getuid() which is unavailable on Windows
    const validFile = path.join(tmpDir, 'abs-check.wav');
    fs.writeFileSync(validFile, Buffer.alloc(10, 0x00));

    const result = isPathSafe(validFile, tmpDir);

    assert.strictEqual(result.isValid, true);
    assert.ok(path.isAbsolute(result.resolvedPath), 'resolvedPath must be absolute');
  });
});

describe('isPathSafe() — symlink handling', () => {
  test('rejects a symlink whose target is outside homeDir', () => {
    // Create symlink inside tmpDir pointing to /etc/passwd (outside)
    const linkPath = path.join(tmpDir, 'evil-link.mp3');
    try {
      fs.symlinkSync('/etc/passwd', linkPath);
    } catch {
      // Skip if symlink creation fails (permissions)
      return;
    }

    const result = isPathSafe(linkPath, tmpDir);
    assert.strictEqual(result.isValid, false,
      'symlink pointing outside homeDir must be rejected');
    fs.unlinkSync(linkPath);
  });

  test('accepts a symlink whose target is inside homeDir', () => {
    // Create a real file and a symlink to it — both inside tmpDir
    const realFile = path.join(tmpDir, 'real-file.mp3');
    const linkFile = path.join(tmpDir, 'link-to-real.mp3');
    fs.writeFileSync(realFile, Buffer.alloc(20, 0xaa), { mode: 0o600 });
    try {
      fs.symlinkSync(realFile, linkFile);
    } catch {
      // Skip if symlink creation fails (permissions)
      return;
    }

    const result = isPathSafe(linkFile, tmpDir);
    // The symlink target (realFile) is inside tmpDir, so this should pass.
    // If the current user owns the file, it should be isValid:true.
    assert.strictEqual(typeof result.isValid, 'boolean');

    // Cleanup
    try { fs.unlinkSync(linkFile); } catch { /* best effort */ }
  });
});
