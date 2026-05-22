/**
 * Coverage for installer.js manifest utilities and update functions
 *
 * Tests functions exported from installer.js that were not covered by
 * installer-copy-functions.test.js — primarily the manifest utilities
 * (computeFileHash, loadManifest, saveManifest, manifestSafeCopy,
 * removeManifestFiles) and update/hook functions that accept a homeDirOverride.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  // Manifest utilities
  getProjectManifestPath,
  getGlobalManifestPath,
  computeFileHash,
  loadManifest,
  saveManifest,
  manifestSafeCopy,
  removeManifestFiles,
  // Detection helpers
  isTermux,
  detectAndNotifyTermux,
  // Copy/configure functions not yet tested
  copyHookFiles,
  configurePartyModeHook,
  // Update functions
  updateCommandFiles,
  updatePersonalityFiles,
  updateGlobalHooks,
} from '../../src/installer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const silentSpinner = {
  start:          () => {},
  stop:           () => {},
  succeed:        () => {},
  fail:           () => {},
  warn:           () => {},
  info:           () => {},
  stopAndPersist: () => {},
  text:           '',
  isSpinning:     false,
};

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-manifest-'));
}

function rmTmpDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
}

// ===========================================================================
// Pure path helpers
// ===========================================================================

describe('getProjectManifestPath()', () => {
  test('returns path inside targetDir/.agentvibes/', () => {
    const p = getProjectManifestPath('/some/project');
    assert.ok(p.startsWith('/some/project'));
    assert.ok(p.includes('.agentvibes'));
    assert.ok(p.endsWith('.json'));
  });

  test('is deterministic for same targetDir', () => {
    assert.strictEqual(
      getProjectManifestPath('/foo/bar'),
      getProjectManifestPath('/foo/bar')
    );
  });
});

describe('getGlobalManifestPath()', () => {
  test('returns path under provided homeDir', () => {
    const p = getGlobalManifestPath('/custom/home');
    assert.ok(p.startsWith('/custom/home'));
    assert.ok(p.includes('.agentvibes'));
  });

  test('falls back to os.homedir() when homeDir is falsy', () => {
    const p = getGlobalManifestPath(null);
    assert.ok(p.startsWith(os.homedir()));
  });
});

// ===========================================================================
// computeFileHash
// ===========================================================================

describe('computeFileHash()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('returns hex string for existing file', async () => {
    const f = path.join(tmp, 'test.txt');
    fs.writeFileSync(f, 'hello world');
    const h = await computeFileHash(f);
    assert.ok(typeof h === 'string' && /^[0-9a-f]{64}$/.test(h));
  });

  test('returns null for missing file', async () => {
    const h = await computeFileHash('/nonexistent/path/file.txt');
    assert.strictEqual(h, null);
  });

  test('same content → same hash', async () => {
    const a = path.join(tmp, 'a.txt');
    const b = path.join(tmp, 'b.txt');
    fs.writeFileSync(a, 'content');
    fs.writeFileSync(b, 'content');
    assert.strictEqual(await computeFileHash(a), await computeFileHash(b));
  });

  test('different content → different hash', async () => {
    const a = path.join(tmp, 'c.txt');
    const d = path.join(tmp, 'd.txt');
    fs.writeFileSync(a, 'hello');
    fs.writeFileSync(d, 'world');
    assert.notStrictEqual(await computeFileHash(a), await computeFileHash(d));
  });
});

// ===========================================================================
// loadManifest / saveManifest
// ===========================================================================

describe('loadManifest()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('returns empty object for missing file', async () => {
    const result = await loadManifest(path.join(tmp, 'nonexistent.json'));
    assert.deepStrictEqual(result, {});
  });

  test('parses files key from valid JSON manifest', async () => {
    const mpath = path.join(tmp, 'manifest.json');
    fs.writeFileSync(mpath, JSON.stringify({ version: 1, files: { '/some/file': { hash: 'abc' } } }));
    const result = await loadManifest(mpath);
    assert.ok('/some/file' in result);
    assert.strictEqual(result['/some/file'].hash, 'abc');
  });

  test('returns empty object for invalid JSON', async () => {
    const mpath = path.join(tmp, 'bad.json');
    fs.writeFileSync(mpath, 'not json');
    const result = await loadManifest(mpath);
    assert.deepStrictEqual(result, {});
  });
});

describe('saveManifest()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('creates manifest file with correct structure', async () => {
    const mpath = path.join(tmp, 'sub', 'manifest.json');
    const files = { '/path/to/file.sh': { hash: 'abc123', installedAt: '2024-01-01' } };
    await saveManifest(mpath, files);
    assert.ok(fs.existsSync(mpath));
    const parsed = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    assert.strictEqual(parsed.version, 1);
    assert.ok('updatedAt' in parsed);
    assert.deepStrictEqual(parsed.files, files);
  });

  test('overwrites existing manifest', async () => {
    const mpath = path.join(tmp, 'overwrite.json');
    await saveManifest(mpath, { '/old': { hash: 'old' } });
    await saveManifest(mpath, { '/new': { hash: 'new' } });
    const parsed = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    assert.ok(!('/old' in parsed.files));
    assert.ok('/new' in parsed.files);
  });
});

// ===========================================================================
// manifestSafeCopy
// ===========================================================================

describe('manifestSafeCopy()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('action=new when dest does not exist', async () => {
    const src = path.join(tmp, 'src1.txt');
    const dst = path.join(tmp, 'dst1.txt');
    fs.writeFileSync(src, 'new content');
    const result = await manifestSafeCopy(src, dst, {});
    assert.strictEqual(result.action, 'new');
    assert.ok(fs.existsSync(dst));
    assert.ok(typeof result.hash === 'string');
  });

  test('action=unchanged when src and dest have same hash', async () => {
    const src = path.join(tmp, 'src2.txt');
    const dst = path.join(tmp, 'dst2.txt');
    fs.writeFileSync(src, 'same content');
    fs.writeFileSync(dst, 'same content');
    const result = await manifestSafeCopy(src, dst, {});
    assert.strictEqual(result.action, 'unchanged');
  });

  test('action=updated when dest hash matches manifest hash', async () => {
    const src = path.join(tmp, 'src3.txt');
    const dst = path.join(tmp, 'dst3.txt');
    fs.writeFileSync(src, 'v2 content');
    fs.writeFileSync(dst, 'v1 content');
    const oldHash = await computeFileHash(dst);
    const manifest = { [dst]: { hash: oldHash } };
    const result = await manifestSafeCopy(src, dst, manifest);
    assert.strictEqual(result.action, 'updated');
  });

  test('action=skipped when dest was user-modified (hash differs from manifest)', async () => {
    const src = path.join(tmp, 'src4.txt');
    const dst = path.join(tmp, 'dst4.txt');
    fs.writeFileSync(src, 'new version');
    fs.writeFileSync(dst, 'user-modified content');
    const manifest = { [dst]: { hash: 'aaaaaa' } }; // stale manifest hash
    const result = await manifestSafeCopy(src, dst, manifest);
    assert.strictEqual(result.action, 'skipped');
  });

  test('action=skipped when src is missing', async () => {
    const result = await manifestSafeCopy('/nonexistent/src.txt', '/nonexistent/dst.txt', {});
    assert.strictEqual(result.action, 'skipped');
    assert.strictEqual(result.hash, null);
  });
});

// ===========================================================================
// removeManifestFiles
// ===========================================================================

describe('removeManifestFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('removes files that are inside baseDir and returns count', async () => {
    const f = path.join(tmp, 'removeme.txt');
    fs.writeFileSync(f, 'data');
    const manifest = { [f]: { hash: 'x' } };
    const count = await removeManifestFiles(manifest, tmp);
    assert.strictEqual(count, 1);
    assert.ok(!fs.existsSync(f));
  });

  test('skips files outside baseDir', async () => {
    const outsideFile = path.join(os.tmpdir(), 'outside.txt');
    const manifest = { [outsideFile]: { hash: 'x' } };
    const count = await removeManifestFiles(manifest, tmp);
    assert.strictEqual(count, 0);
  });

  test('returns 0 for empty manifest', async () => {
    const count = await removeManifestFiles({}, tmp);
    assert.strictEqual(count, 0);
  });

  test('handles already-deleted files gracefully', async () => {
    const f = path.join(tmp, 'already-gone.txt');
    const manifest = { [f]: { hash: 'x' } };
    await assert.doesNotReject(() => removeManifestFiles(manifest, tmp));
  });
});

// ===========================================================================
// isTermux / detectAndNotifyTermux
// ===========================================================================

describe('isTermux()', () => {
  test('returns a boolean', () => {
    assert.strictEqual(typeof isTermux(), 'boolean');
  });

  test('returns false on Linux (non-Termux)', () => {
    if (process.platform !== 'win32' && !fs.existsSync('/data/data/com.termux')) {
      assert.strictEqual(isTermux(), false);
    }
  });
});

describe('detectAndNotifyTermux()', () => {
  test('returns a boolean', () => {
    assert.strictEqual(typeof detectAndNotifyTermux(), 'boolean');
  });
});

// ===========================================================================
// copyHookFiles
// ===========================================================================

describe('copyHookFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => copyHookFiles(tmp, silentSpinner));
  });

  test('creates .claude/hooks directory', async () => {
    await copyHookFiles(tmp, silentSpinner);
    const hooksDir = path.join(tmp, '.claude', 'hooks');
    assert.ok(fs.existsSync(hooksDir), '.claude/hooks must exist');
  });

  test('returns object with count property', async () => {
    const result = await copyHookFiles(tmp, silentSpinner);
    assert.ok(result !== undefined && typeof result === 'object');
    assert.ok('count' in result);
    assert.ok(typeof result.count === 'number');
  });

  test('is idempotent', async () => {
    await assert.doesNotReject(() => copyHookFiles(tmp, silentSpinner));
  });
});

// ===========================================================================
// configurePartyModeHook (with homeDirOverride)
// ===========================================================================

describe('configurePartyModeHook()', () => {
  let tmp;
  before(() => {
    tmp = makeTmpDir();
    fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
  });
  after(() => rmTmpDir(tmp));

  test('does not throw (even if source script is absent)', async () => {
    await assert.doesNotReject(() =>
      configurePartyModeHook(tmp, silentSpinner, tmp)
    );
  });

  test('creates .claude/hooks directory in homeDirOverride', async () => {
    await configurePartyModeHook(tmp, silentSpinner, tmp);
    const hooksDir = path.join(tmp, '.claude', 'hooks');
    assert.ok(fs.existsSync(hooksDir));
  });
});

// ===========================================================================
// updateCommandFiles
// ===========================================================================

describe('updateCommandFiles()', () => {
  let tmp;
  before(() => {
    tmp = makeTmpDir();
    fs.mkdirSync(path.join(tmp, '.claude', 'commands', 'agent-vibes'), { recursive: true });
  });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => updateCommandFiles(tmp, silentSpinner));
  });

  test('creates .claude/commands/agent-vibes directory', async () => {
    await updateCommandFiles(tmp, silentSpinner);
    assert.ok(fs.existsSync(path.join(tmp, '.claude', 'commands', 'agent-vibes')));
  });

  test('returns a number (file count)', async () => {
    const result = await updateCommandFiles(tmp, silentSpinner);
    assert.strictEqual(typeof result, 'number');
  });
});

// ===========================================================================
// updatePersonalityFiles
// ===========================================================================

describe('updatePersonalityFiles()', () => {
  let tmp;
  before(() => {
    tmp = makeTmpDir();
    fs.mkdirSync(path.join(tmp, '.claude', 'personalities'), { recursive: true });
  });
  after(() => rmTmpDir(tmp));

  test('does not throw with real source personality dir', async () => {
    const srcDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../.claude/personalities'
    );
    if (fs.existsSync(srcDir)) {
      await assert.doesNotReject(() => updatePersonalityFiles(tmp, srcDir));
    }
  });

  test('returns object with new/updated counts', async () => {
    const srcDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../.claude/personalities'
    );
    if (fs.existsSync(srcDir)) {
      const result = await updatePersonalityFiles(tmp, srcDir);
      assert.ok(result !== undefined && typeof result === 'object');
      assert.ok('new' in result || 'updated' in result);
    }
  });
});

// ===========================================================================
// updateGlobalHooks (with homeDirOverride)
// ===========================================================================

describe('updateGlobalHooks()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw with real src hooks dir and temp home', async () => {
    const srcHooksDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../.claude/hooks'
    );
    if (fs.existsSync(srcHooksDir)) {
      await assert.doesNotReject(() => updateGlobalHooks(srcHooksDir, tmp));
    }
  });

  test('creates .claude/hooks in homeDirOverride', async () => {
    const srcHooksDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../.claude/hooks'
    );
    if (fs.existsSync(srcHooksDir)) {
      await updateGlobalHooks(srcHooksDir, tmp);
      assert.ok(fs.existsSync(path.join(tmp, '.claude', 'hooks')));
    }
  });

  test('returns a number', async () => {
    const srcHooksDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../.claude/hooks'
    );
    if (fs.existsSync(srcHooksDir)) {
      const result = await updateGlobalHooks(srcHooksDir, tmp);
      assert.strictEqual(typeof result, 'number');
    }
  });
});
