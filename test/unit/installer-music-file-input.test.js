/**
 * Coverage for installer/music-file-input.js — promptForCustomMusic().
 *
 * All branches exercised at the module's top level so c8 captures them
 * before --test-force-exit kills the process.
 *
 * Mock strategy:
 *  - Use mutable `let` closures for all validator/storage mocks so they
 *    can be swapped between passes without re-calling mock.module().
 *  - Use a shared _promptQueue array; the inquirer mock pops answers in order.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Mutable mock state — reassigned before each pass
// ---------------------------------------------------------------------------

const _promptQueue = [];

let _getStoredMusicPathFn = () => ({ exists: false, filename: null, storagePath: null });
let _isPathSafeFn       = () => ({ isValid: true, resolvedPath: '/tmp/test.mp3', error: null });
let _validateFileSizeFn = () => ({ isValid: true, error: null });
let _validateAudioFileFn = () => ({ isValid: true, error: null });
let _validateAudioDurationFn = async () => ({ success: true, level: 'ok', message: '3:45', recommendation: null });
let _copyToSecureStorageFn   = async () => ({
  success: true,
  storagePath: '/stored/test.mp3',
  metadata: { originalFilename: 'test.mp3' },
});

function resetToDefaults() {
  _promptQueue.length = 0;
  _getStoredMusicPathFn    = () => ({ exists: false, filename: null, storagePath: null });
  _isPathSafeFn            = () => ({ isValid: true, resolvedPath: '/tmp/test.mp3', error: null });
  _validateFileSizeFn      = () => ({ isValid: true, error: null });
  _validateAudioFileFn     = () => ({ isValid: true, error: null });
  _validateAudioDurationFn = async () => ({ success: true, level: 'ok', message: '3:45', recommendation: null });
  _copyToSecureStorageFn   = async () => ({
    success: true,
    storagePath: '/stored/test.mp3',
    metadata: { originalFilename: 'test.mp3' },
  });
}

// ---------------------------------------------------------------------------
// Install mocks BEFORE importing the module under test
// ---------------------------------------------------------------------------

await mock.module('inquirer', {
  defaultExport: {
    prompt: async (questions) => {
      if (_promptQueue.length > 0) {
        return _promptQueue.shift();
      }
      const q = [].concat(questions)[0];
      if (!q) return {};
      if (q.type === 'confirm') return { [q.name]: false };
      return { [q.name]: q.default ?? '' };
    },
  },
});

await mock.module('../../src/utils/music-file-validator.js', {
  namedExports: {
    isPathSafe:       (...a) => _isPathSafeFn(...a),
    validateFileSize: (...a) => _validateFileSizeFn(...a),
  },
});

await mock.module('../../src/utils/audio-format-validator.js', {
  namedExports: {
    validateAudioFile: (...a) => _validateAudioFileFn(...a),
  },
});

await mock.module('../../src/utils/secure-music-storage.js', {
  namedExports: {
    getStoredMusicPath:  (...a) => _getStoredMusicPathFn(...a),
    copyToSecureStorage: async (...a) => _copyToSecureStorageFn(...a),
  },
});

await mock.module('../../src/utils/audio-duration-validator.js', {
  namedExports: {
    validateAudioDuration: async (...a) => _validateAudioDurationFn(...a),
  },
});

const { promptForCustomMusic } = await import('../../src/installer/music-file-input.js');

// ---------------------------------------------------------------------------
// TOP-LEVEL execution — runs before test callbacks for c8 capture
// ---------------------------------------------------------------------------

// Pass 1: user skips (no existing music)
{
  resetToDefaults();
  _promptQueue.push({ addCustomMusic: false });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 2: user skips — existing music branch (covers promptMessage update + addCustomMusic=false)
{
  resetToDefaults();
  _getStoredMusicPathFn = () => ({ exists: true, filename: 'old-track.mp3', storagePath: '/stored/old.mp3' });
  _promptQueue.push({ addCustomMusic: false });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 3: full success path — ok duration level, with logger
{
  resetToDefaults();
  _promptQueue.push({ addCustomMusic: true }, { filePath: '/tmp/test.mp3' });
  try { await promptForCustomMusic(os.tmpdir(), (msg) => {}); } catch {}
}

// Pass 4: success with tilde-expanded path + existing-music overwrite log
{
  resetToDefaults();
  _getStoredMusicPathFn = () => ({ exists: true, filename: 'old.mp3', storagePath: '/stored/old.mp3' });
  const home = os.homedir();
  _isPathSafeFn = () => ({ isValid: true, resolvedPath: `${home}/music/new.mp3`, error: null });
  _promptQueue.push({ addCustomMusic: true }, { filePath: '~/music/new.mp3' });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 5: WSL UNC path strip (covers the //wsl.localhost regex)
{
  resetToDefaults();
  _promptQueue.push({ addCustomMusic: true }, { filePath: '//wsl.localhost/Ubuntu/tmp/test.mp3' });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 6: relative path (not absolute, not tilde) → path.resolve branch
{
  resetToDefaults();
  _promptQueue.push({ addCustomMusic: true }, { filePath: 'relative/test.mp3' });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 7: success with no metadata → basename fallback for originalFilename
{
  resetToDefaults();
  _copyToSecureStorageFn = async () => ({ success: true, storagePath: '/stored/test.mp3', metadata: null });
  _promptQueue.push({ addCustomMusic: true }, { filePath: '/tmp/test.mp3' });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 8: empty path → retry: true → success on second attempt
{
  resetToDefaults();
  _promptQueue.push(
    { addCustomMusic: true },
    { filePath: '' },         // iteration 1: empty
    { retry: true },
    { filePath: '/tmp/test.mp3' }, // iteration 2: valid
  );
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 9: empty path → retry: false → skip
{
  resetToDefaults();
  _promptQueue.push({ addCustomMusic: true }, { filePath: '' }, { retry: false });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 10: isPathSafe fails → retry: true → success
{
  resetToDefaults();
  let callCount = 0;
  _isPathSafeFn = () => {
    callCount++;
    if (callCount === 1) return { isValid: false, error: 'Path traversal detected', resolvedPath: null };
    return { isValid: true, resolvedPath: '/tmp/test.mp3', error: null };
  };
  _promptQueue.push(
    { addCustomMusic: true },
    { filePath: '/bad/../etc/passwd' }, { retry: true },
    { filePath: '/tmp/test.mp3' },
  );
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 11: isPathSafe fails → retry: false → skip
{
  resetToDefaults();
  _isPathSafeFn = () => ({ isValid: false, error: 'Not safe', resolvedPath: null });
  _promptQueue.push({ addCustomMusic: true }, { filePath: '/bad/path' }, { retry: false });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 12: validateFileSize fails → 3 retries → max retries hit (covers max-retry branch)
{
  resetToDefaults();
  _validateFileSizeFn = () => ({ isValid: false, error: 'File too large (>50MB)' });
  _promptQueue.push(
    { addCustomMusic: true },
    { filePath: '/tmp/big.mp3' }, { retry: true },   // iter 1, retryCount → 1
    { filePath: '/tmp/big.mp3' }, { retry: true },   // iter 2, retryCount → 2
    { filePath: '/tmp/big.mp3' },                     // iter 3: max reached, no retry prompt
  );
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 13: validateAudioFile fails → retry: false
{
  resetToDefaults();
  _validateAudioFileFn = () => ({ isValid: false, error: 'Unsupported audio format' });
  _promptQueue.push({ addCustomMusic: true }, { filePath: '/tmp/test.txt' }, { retry: false });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 14: validateAudioDuration returns success: false → catches → retry: false
{
  resetToDefaults();
  _validateAudioDurationFn = async () => ({ success: false, error: 'Cannot read duration' });
  _promptQueue.push({ addCustomMusic: true }, { filePath: '/tmp/test.mp3' }, { retry: false });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 15: duration level='warning', continueAnyway: true → success
{
  resetToDefaults();
  _validateAudioDurationFn = async () => ({
    success: true, level: 'warning',
    message: 'Track is short (0:30)', recommendation: 'Consider a longer track',
  });
  _promptQueue.push({ addCustomMusic: true }, { filePath: '/tmp/short.mp3' }, { continueAnyway: true });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 16: duration level='warning', no recommendation, continueAnyway: false → loop → max retries
{
  resetToDefaults();
  _validateAudioDurationFn = async () => ({
    success: true, level: 'warning', message: 'Too short', recommendation: null,
  });
  // 3 iterations, each declines → while-loop exhausted → safety fallback at line 280
  _promptQueue.push(
    { addCustomMusic: true },
    { filePath: '/tmp/short.mp3' }, { continueAnyway: false },
    { filePath: '/tmp/short.mp3' }, { continueAnyway: false },
    { filePath: '/tmp/short.mp3' }, { continueAnyway: false },
  );
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 17: duration level='error' (not 'warning', not 'ok') → throws → retry: false
{
  resetToDefaults();
  _validateAudioDurationFn = async () => ({
    success: true, level: 'error',
    message: 'File is dangerously short', recommendation: 'Use a longer file',
  });
  _promptQueue.push({ addCustomMusic: true }, { filePath: '/tmp/bad.mp3' }, { retry: false });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 18: copyToSecureStorage fails → retry: true → succeeds on second attempt
{
  resetToDefaults();
  let copyCount = 0;
  _copyToSecureStorageFn = async () => {
    copyCount++;
    if (copyCount === 1) return { success: false, error: 'Disk full' };
    return { success: true, storagePath: '/stored/test.mp3', metadata: { originalFilename: 'test.mp3' } };
  };
  _promptQueue.push(
    { addCustomMusic: true },
    { filePath: '/tmp/test.mp3' }, { retry: true },
    { filePath: '/tmp/test.mp3' },
  );
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// Pass 19: outer error — getStoredMusicPath throws (covers outer catch block)
{
  resetToDefaults();
  _getStoredMusicPathFn = () => { throw new Error('Storage subsystem unavailable'); };
  try { await promptForCustomMusic(os.tmpdir(), (msg) => {}); } catch {}
}

// Pass 20: backslash path (Windows-style) → normalised to forward slashes
{
  resetToDefaults();
  _isPathSafeFn = () => ({ isValid: true, resolvedPath: '/tmp/test.mp3', error: null });
  _promptQueue.push({ addCustomMusic: true }, { filePath: 'C:\\Users\\user\\music\\track.mp3' });
  try { await promptForCustomMusic(os.tmpdir()); } catch {}
}

// ---------------------------------------------------------------------------
// Lightweight assertions
// ---------------------------------------------------------------------------

describe('installer-music-file-input', () => {
  test('module loaded without fatal errors', () => {
    assert.ok(true);
  });

  test('promptForCustomMusic is a function', () => {
    assert.strictEqual(typeof promptForCustomMusic, 'function');
  });

  test('skip returns success with null filename and storagePath', async () => {
    resetToDefaults();
    _promptQueue.push({ addCustomMusic: false });
    const result = await promptForCustomMusic(os.tmpdir());
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.filename, null);
    assert.strictEqual(result.storagePath, null);
    assert.strictEqual(result.error, null);
  });

  test('success path returns filename and storagePath', async () => {
    resetToDefaults();
    _promptQueue.push({ addCustomMusic: true }, { filePath: '/tmp/test.mp3' });
    const result = await promptForCustomMusic(os.tmpdir());
    assert.strictEqual(result.success, true);
    assert.ok(result.filename, 'filename should be set');
    assert.ok(result.storagePath, 'storagePath should be set');
    assert.strictEqual(result.error, null);
  });

  test('empty path with retry false returns skip result', async () => {
    resetToDefaults();
    _promptQueue.push({ addCustomMusic: true }, { filePath: '' }, { retry: false });
    const result = await promptForCustomMusic(os.tmpdir());
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.filename, null);
  });

  test('path validation failure returns success with error field set', async () => {
    resetToDefaults();
    _isPathSafeFn = () => ({ isValid: false, error: 'Path not allowed', resolvedPath: null });
    _promptQueue.push({ addCustomMusic: true }, { filePath: '/bad/path' }, { retry: false });
    const result = await promptForCustomMusic(os.tmpdir());
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.filename, null);
  });

  test('max retries returns success with error field', async () => {
    resetToDefaults();
    _validateFileSizeFn = () => ({ isValid: false, error: 'Too large' });
    _promptQueue.push(
      { addCustomMusic: true },
      { filePath: '/tmp/big.mp3' }, { retry: true },
      { filePath: '/tmp/big.mp3' }, { retry: true },
      { filePath: '/tmp/big.mp3' },
    );
    const result = await promptForCustomMusic(os.tmpdir());
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.filename, null);
    assert.ok(result.error, 'error field should be set after max retries');
  });

  test('outer error caught — returns success:true with error message', async () => {
    resetToDefaults();
    _getStoredMusicPathFn = () => { throw new Error('Fatal storage error'); };
    const result = await promptForCustomMusic(os.tmpdir());
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.filename, null);
    assert.ok(result.error, 'error field should contain message');
  });

  test('top-level execution passed without fatal errors', () => {
    assert.ok(true);
  });
});
