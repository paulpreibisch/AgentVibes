/**
 * Coverage for the NEW provider-validator branches added on this branch:
 *   - validateKokoroInstallation()      (installed + not-installed paths)
 *   - validateElevenLabsInstallation()  (env var, key file, missing key)
 *   - validateProvider('kokoro' | 'elevenlabs') routing
 *   - getProviderInstallCommand('kokoro' | 'elevenlabs')
 *   - getProviderDisplayName('kokoro' | 'elevenlabs')
 *   - attemptProviderInstallation('kokoro') pip-success path
 *
 * child_process and fs are mocked so every branch runs deterministically
 * without spawning real python/pip or touching the real filesystem.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mutable mock state — tests flip these to drive each branch.
// ---------------------------------------------------------------------------
let _spawnSyncImpl = () => ({ status: 1, stdout: '' });
let _existsSyncImpl = () => false;
let _readFileImpl = () => '';

await mock.module('node:child_process', {
  namedExports: {
    spawnSync: (...args) => _spawnSyncImpl(...args),
    spawn: () => ({ on: () => {}, kill: () => {}, stdout: { on: () => {} }, stderr: { on: () => {} } }),
    execSync: () => '',
    execFileSync: () => '',
  },
});
await mock.module('node:fs', {
  defaultExport: {
    existsSync: (p) => _existsSyncImpl(p),
    readFileSync: (p, e) => _readFileImpl(p, e),
  },
  namedExports: {
    existsSync: (p) => _existsSyncImpl(p),
    readFileSync: (p, e) => _readFileImpl(p, e),
  },
});

const {
  validateProvider,
  validateKokoroInstallation,
  validateElevenLabsInstallation,
  getProviderInstallCommand,
  getProviderDisplayName,
  attemptProviderInstallation,
} = await import('../../src/utils/provider-validator.js');

function reset() {
  _spawnSyncImpl = () => ({ status: 1, stdout: '' });
  _existsSyncImpl = () => false;
  _readFileImpl = () => '';
  delete process.env.ELEVENLABS_API_KEY;
}

// ===========================================================================
// validateKokoroInstallation
// ===========================================================================
describe('validateKokoroInstallation', () => {
  test('returns installed=true when the python import check succeeds', async () => {
    reset();
    _spawnSyncImpl = () => ({ status: 0, stdout: '' });
    const r = await validateKokoroInstallation();
    assert.strictEqual(r.installed, true);
    assert.match(r.message, /Kokoro TTS detected/);
    assert.ok(Array.isArray(r.checkedLocations) && r.checkedLocations.length > 0);
  });

  test('returns installed=false with KOKORO_NOT_FOUND when import fails', async () => {
    reset();
    _spawnSyncImpl = () => ({ status: 1, stdout: '' });
    const r = await validateKokoroInstallation();
    assert.strictEqual(r.installed, false);
    assert.strictEqual(r.error, 'KOKORO_NOT_FOUND');
    assert.match(r.message, /pip install kokoro-onnx/);
    assert.ok(Array.isArray(r.checkedLocations));
  });

  test('does not throw when spawnSync itself throws', async () => {
    reset();
    _spawnSyncImpl = () => { throw new Error('spawn failed'); };
    const r = await validateKokoroInstallation();
    assert.strictEqual(r.installed, false);
    assert.strictEqual(r.error, 'KOKORO_NOT_FOUND');
  });

  test('validateProvider("kokoro") routes to the kokoro validator', async () => {
    reset();
    _spawnSyncImpl = () => ({ status: 0, stdout: '' });
    const r = await validateProvider('kokoro');
    assert.strictEqual(r.installed, true);
    assert.match(r.message, /Kokoro/);
  });
});

// ===========================================================================
// validateElevenLabsInstallation
// ===========================================================================
describe('validateElevenLabsInstallation', () => {
  test('installed=true when ELEVENLABS_API_KEY is set in the environment', async () => {
    reset();
    process.env.ELEVENLABS_API_KEY = 'sk-test-key';
    const r = await validateElevenLabsInstallation();
    assert.strictEqual(r.installed, true);
    assert.match(r.message, /environment/i);
  });

  test('installed=true when key file exists and contains a key', async () => {
    reset();
    _existsSyncImpl = (p) => String(p).includes('elevenlabs-key.txt');
    _readFileImpl = () => '  sk-from-file\n';
    const r = await validateElevenLabsInstallation();
    assert.strictEqual(r.installed, true);
    assert.match(r.message, /elevenlabs-key\.txt/);
  });

  test('installed=false when key file exists but is empty', async () => {
    reset();
    _existsSyncImpl = (p) => String(p).includes('elevenlabs-key.txt');
    _readFileImpl = () => '   \n';
    const r = await validateElevenLabsInstallation();
    assert.strictEqual(r.installed, false);
    assert.strictEqual(r.error, 'ELEVENLABS_NO_KEY');
  });

  test('installed=false when key file read throws', async () => {
    reset();
    _existsSyncImpl = (p) => String(p).includes('elevenlabs-key.txt');
    _readFileImpl = () => { throw new Error('EACCES'); };
    const r = await validateElevenLabsInstallation();
    assert.strictEqual(r.installed, false);
    assert.strictEqual(r.error, 'ELEVENLABS_NO_KEY');
  });

  test('installed=false with guidance when no key anywhere', async () => {
    reset();
    const r = await validateElevenLabsInstallation();
    assert.strictEqual(r.installed, false);
    assert.strictEqual(r.error, 'ELEVENLABS_NO_KEY');
    assert.match(r.message, /ELEVENLABS_API_KEY/);
  });

  test('validateProvider("elevenlabs") routes to the elevenlabs validator', async () => {
    reset();
    process.env.ELEVENLABS_API_KEY = 'sk-route';
    const r = await validateProvider('elevenlabs');
    assert.strictEqual(r.installed, true);
  });
});

// ===========================================================================
// Pure helpers — new map entries
// ===========================================================================
describe('install command + display name for new providers', () => {
  test('getProviderInstallCommand("kokoro")', () => {
    assert.strictEqual(getProviderInstallCommand('kokoro'), 'pip install kokoro-onnx soundfile numpy');
  });

  test('getProviderInstallCommand("elevenlabs") mentions the API key', () => {
    assert.match(getProviderInstallCommand('elevenlabs'), /ELEVENLABS_API_KEY/);
  });

  test('getProviderDisplayName("kokoro")', () => {
    assert.strictEqual(getProviderDisplayName('kokoro'), 'Kokoro TTS');
  });

  test('getProviderDisplayName("elevenlabs")', () => {
    assert.strictEqual(getProviderDisplayName('elevenlabs'), 'ElevenLabs');
  });
});

// ===========================================================================
// attemptProviderInstallation('kokoro') — pip strategy success
// ===========================================================================
describe('attemptProviderInstallation("kokoro")', () => {
  test('reports success and verified when pip install + validation succeed', async () => {
    reset();
    // pip install → status 0 ; then validateProvider('kokoro') import check → status 0
    _spawnSyncImpl = () => ({ status: 0, stdout: '' });
    const r = await attemptProviderInstallation('kokoro');
    assert.strictEqual(r.success, true);
    assert.match(r.command, /kokoro-onnx/);
    assert.strictEqual(r.verified, true);
  });
});
