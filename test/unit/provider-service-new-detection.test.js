/**
 * Coverage for the NEW provider-detection branches in ProviderService:
 *   - _isKokoroInstalled()        (importable / not importable)
 *   - _isElevenLabsConfigured()   (env var, key file, none)
 *   - getInstalledProviders() pushing 'kokoro' and 'elevenlabs'
 *
 * child_process.execFileSync and fs are mocked so detection is deterministic
 * (no real python / which / filesystem access).
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mutable mock state
let _execImpl = () => { throw new Error('not found'); };
let _existsImpl = () => false;
let _readImpl = () => '';

await mock.module('node:child_process', {
  namedExports: {
    execFileSync: (...args) => _execImpl(...args),
    spawnSync: () => ({ status: 1, stdout: '' }),
    spawn: () => ({ on: () => {}, kill: () => {} }),
  },
});
await mock.module('node:fs', {
  defaultExport: {
    existsSync: (p) => _existsImpl(p),
    readFileSync: (p, e) => _readImpl(p, e),
    mkdirSync: () => {},
    writeFileSync: () => {},
  },
  namedExports: {
    existsSync: (p) => _existsImpl(p),
    readFileSync: (p, e) => _readImpl(p, e),
    mkdirSync: () => {},
    writeFileSync: () => {},
  },
});

const { ProviderService } = await import('../../src/services/provider-service.js');

function reset() {
  _execImpl = () => { throw new Error('not found'); };
  _existsImpl = () => false;
  _readImpl = () => '';
  delete process.env.ELEVENLABS_API_KEY;
}

const mkConfig = () => ({ getConfig: () => ({}), getProjectRoot: () => process.cwd() });

describe('ProviderService._isKokoroInstalled', () => {
  test('returns true when `python3 -c import kokoro` succeeds', () => {
    reset();
    _execImpl = (cmd, args) => {
      if (cmd === 'python3' && Array.isArray(args) && args[1] === 'import kokoro') return '';
      throw new Error('not found');
    };
    const svc = new ProviderService(mkConfig());
    assert.strictEqual(svc._isKokoroInstalled(), true);
  });

  test('returns false when the import throws', () => {
    reset();
    const svc = new ProviderService(mkConfig());
    assert.strictEqual(svc._isKokoroInstalled(), false);
  });
});

describe('ProviderService._isElevenLabsConfigured', () => {
  test('returns true when ELEVENLABS_API_KEY is set', () => {
    reset();
    process.env.ELEVENLABS_API_KEY = 'sk-x';
    const svc = new ProviderService(mkConfig());
    assert.strictEqual(svc._isElevenLabsConfigured(), true);
  });

  test('returns true when key file exists with content', () => {
    reset();
    _existsImpl = (p) => String(p).includes('elevenlabs-key.txt');
    _readImpl = () => 'sk-from-file\n';
    const svc = new ProviderService(mkConfig());
    assert.strictEqual(svc._isElevenLabsConfigured(), true);
  });

  test('returns false when key file is empty', () => {
    reset();
    _existsImpl = (p) => String(p).includes('elevenlabs-key.txt');
    _readImpl = () => '   ';
    const svc = new ProviderService(mkConfig());
    assert.strictEqual(svc._isElevenLabsConfigured(), false);
  });

  test('returns false when nothing is configured', () => {
    reset();
    const svc = new ProviderService(mkConfig());
    assert.strictEqual(svc._isElevenLabsConfigured(), false);
  });
});

describe('ProviderService.getInstalledProviders — kokoro + elevenlabs', () => {
  test('includes kokoro and elevenlabs when both detected', () => {
    reset();
    process.env.ELEVENLABS_API_KEY = 'sk-x';
    _execImpl = (cmd, args) => {
      if (cmd === 'python3' && args[1] === 'import kokoro') return '';
      if (cmd === 'which') return ''; // piper/soprano present
      throw new Error('not found');
    };
    const svc = new ProviderService(mkConfig());
    const providers = svc.getInstalledProviders();
    assert.ok(providers.includes('kokoro'), 'kokoro should be listed');
    assert.ok(providers.includes('elevenlabs'), 'elevenlabs should be listed');
  });

  test('omits kokoro/elevenlabs when neither detected, still returns piper', () => {
    reset();
    _execImpl = (cmd) => {
      if (cmd === 'which') return ''; // piper present
      throw new Error('not found');
    };
    const svc = new ProviderService(mkConfig());
    const providers = svc.getInstalledProviders();
    assert.ok(!providers.includes('kokoro'));
    assert.ok(!providers.includes('elevenlabs'));
    assert.ok(providers.includes('piper'));
  });
});
