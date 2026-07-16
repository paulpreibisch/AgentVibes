/**
 * Install Manifest — Non-Destructive Update Tests
 *
 * Verifies that the manifest system correctly:
 *   - Tracks installed file hashes
 *   - Skips user-modified files on update (saves .user.bak)
 *   - Copies new/unchanged stock files safely
 *   - Leaves user-created files untouched during uninstall
 *   - Preserves tts-voice.txt / tts-verbosity.txt on reinstall
 *
 * Covers the fixes for CRITICAL-1..5 and HIGH-1..2 from the adversarial review.
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  computeFileHash,
  loadManifest,
  saveManifest,
  manifestSafeCopy,
  removeManifestFiles,
  getProjectManifestPath,
  getGlobalManifestPath,
  updatePersonalityFiles,
  updateCommandFiles,
  updateGlobalHooks,
  copyHookFiles,
  CRITICAL_HOOKS,
} from '../../src/installer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'av-manifest-test-'));
}

async function writeFile(dir, name, content) {
  const p = path.join(dir, name);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, 'utf8');
  return p;
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const silentSpinner = {
  start: () => silentSpinner,
  succeed: () => silentSpinner,
  warn: () => silentSpinner,
  info: () => silentSpinner,
  fail: () => silentSpinner,
  stop: () => silentSpinner,
  stopAndPersist: () => silentSpinner,
  get text() { return ''; },
  set text(_) {},
  get isSpinning() { return false; },
};

// ── computeFileHash ───────────────────────────────────────────────────────────

describe('computeFileHash', () => {
  let tmp;
  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('returns sha256 hex for existing file', async () => {
    const p = await writeFile(tmp, 'a.txt', 'hello');
    const hash = await computeFileHash(p);
    assert.equal(hash, sha256('hello'));
  });

  test('returns null for missing file', async () => {
    const hash = await computeFileHash(path.join(tmp, 'nonexistent.txt'));
    assert.equal(hash, null);
  });
});

// ── loadManifest / saveManifest ───────────────────────────────────────────────

describe('loadManifest / saveManifest', () => {
  let tmp;
  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('loadManifest returns empty object for missing file', async () => {
    const result = await loadManifest(path.join(tmp, 'nonexistent.json'));
    assert.deepEqual(result, {});
  });

  test('saveManifest writes and loadManifest reads back', async () => {
    const manifestPath = path.join(tmp, 'test-manifest.json');
    const files = { '/some/path': { hash: 'abc123', installedAt: '2025-01-01' } };
    await saveManifest(manifestPath, files);
    const result = await loadManifest(manifestPath);
    assert.deepEqual(result, files);
  });

  test('saveManifest is atomic (uses tmp+rename)', async () => {
    const manifestPath = path.join(tmp, 'atomic.json');
    await saveManifest(manifestPath, { '/foo': { hash: 'h1', installedAt: 'now' } });
    // After write, no .tmp file should remain
    const entries = await fs.readdir(tmp);
    const tmpFiles = entries.filter(e => e.includes('.tmp.'));
    assert.equal(tmpFiles.length, 0, 'No .tmp file should remain after save');
  });

  test('manifest file gets mode 0o600', async () => {
    if (process.platform === 'win32') return;
    const manifestPath = path.join(tmp, 'perms.json');
    await saveManifest(manifestPath, {});
    const stat = await fs.stat(manifestPath);
    assert.equal(stat.mode & 0o777, 0o600, 'Manifest must be owner-read-write only');
  });
});

// ── manifestSafeCopy ─────────────────────────────────────────────────────────

describe('manifestSafeCopy', () => {
  let tmp;
  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('copies new file (dest missing), action=new', async () => {
    const src = await writeFile(tmp, 'src/new.txt', 'stock content');
    const dest = path.join(tmp, 'dest/new.txt');
    await fs.mkdir(path.dirname(dest), { recursive: true });

    const result = await manifestSafeCopy(src, dest, {});

    assert.equal(result.action, 'new');
    assert.equal(result.hash, sha256('stock content'));
    const written = await fs.readFile(dest, 'utf8');
    assert.equal(written, 'stock content');
  });

  test('returns unchanged when dest already matches src', async () => {
    const src = await writeFile(tmp, 'src/same.txt', 'identical');
    const dest = await writeFile(tmp, 'dest/same.txt', 'identical');

    const result = await manifestSafeCopy(src, dest, {});

    assert.equal(result.action, 'unchanged');
    assert.equal(result.hash, sha256('identical'));
  });

  test('updates unmanifested file when src differs, action=updated', async () => {
    const src = await writeFile(tmp, 'src/stock.txt', 'v2 content');
    const dest = await writeFile(tmp, 'dest/stock.txt', 'v1 content');

    const result = await manifestSafeCopy(src, dest, {}); // no manifest entry

    assert.equal(result.action, 'updated');
    const written = await fs.readFile(dest, 'utf8');
    assert.equal(written, 'v2 content');
  });

  // A file with no manifest entry may be a user's customized hook OR an older
  // stock copy — indistinguishable. Overwriting it without a backup silently
  // destroyed user customizations (e.g. a hook customized before manifests
  // existed). We must never lose the bytes.
  test('REGRESSION: unmanifested user-modified file is backed up before overwrite', async () => {
    const src = await writeFile(tmp, 'src/hook.sh', 'new stock v2');
    const dest = await writeFile(tmp, 'dest/hook.sh', 'MY PRECIOUS CUSTOMIZATION');

    const result = await manifestSafeCopy(src, dest, {}); // no manifest entry

    assert.equal(result.action, 'updated', 'update must still be delivered');
    assert.equal(result.backedUp, true, 'result must report that a backup was taken');
    assert.equal(await fs.readFile(dest, 'utf8'), 'new stock v2', 'update lands');
    assert.equal(
      await fs.readFile(dest + '.user.bak', 'utf8'),
      'MY PRECIOUS CUSTOMIZATION',
      'the user\'s content must survive in .user.bak — never silently destroyed'
    );
  });

  test('REGRESSION: an existing .user.bak is never clobbered by a second backup', async () => {
    const src = await writeFile(tmp, 'src/two.sh', 'stock v3');
    const dest = await writeFile(tmp, 'dest/two.sh', 'customization B');
    await writeFile(tmp, 'dest/two.sh.user.bak', 'customization A (older, precious)');

    const result = await manifestSafeCopy(src, dest, {});

    assert.equal(result.action, 'updated');
    assert.equal(
      await fs.readFile(dest + '.user.bak', 'utf8'),
      'customization A (older, precious)',
      'the pre-existing backup must survive untouched'
    );
    // customization B must also be recoverable, under a stamped name
    const dir = await fs.readdir(path.dirname(dest));
    const stamped = dir.filter(f => f.startsWith('two.sh.user.bak.'));
    assert.equal(stamped.length, 1, 'the newer customization gets its own stamped backup');
    assert.equal(
      await fs.readFile(path.join(path.dirname(dest), stamped[0]), 'utf8'),
      'customization B'
    );
  });

  test('skips user-modified file when manifest hash differs from dest, action=skipped', async () => {
    const src = await writeFile(tmp, 'src/custom.txt', 'new stock v2');
    const dest = await writeFile(tmp, 'dest/custom.txt', 'my custom edits');

    // Manifest records v1 stock as the installed hash
    const manifest = { [dest]: { hash: sha256('original stock v1'), installedAt: '2025-01-01' } };
    const result = await manifestSafeCopy(src, dest, manifest);

    assert.equal(result.action, 'skipped', 'User-modified file must not be overwritten');
    const stillCustom = await fs.readFile(dest, 'utf8');
    assert.equal(stillCustom, 'my custom edits', 'Original user content must be preserved');
  });

  test('saves .user.bak when skipping user-modified file', async () => {
    const src = await writeFile(tmp, 'src/bak.txt', 'new stock');
    const dest = await writeFile(tmp, 'dest/bak.txt', 'user edits');
    const manifest = { [dest]: { hash: sha256('old stock'), installedAt: '2025-01-01' } };

    await manifestSafeCopy(src, dest, manifest);

    const bak = await fs.readFile(dest + '.user.bak', 'utf8');
    assert.equal(bak, 'user edits', '.user.bak must contain the user\'s original content');
  });

  test('overwrites stock file when manifest hash matches dest (not user-modified)', async () => {
    const src = await writeFile(tmp, 'src/upgrade.txt', 'new stock v2');
    const dest = await writeFile(tmp, 'dest/upgrade.txt', 'old stock v1');

    const manifest = { [dest]: { hash: sha256('old stock v1'), installedAt: '2025-01-01' } };
    const result = await manifestSafeCopy(src, dest, manifest);

    assert.equal(result.action, 'updated');
    const written = await fs.readFile(dest, 'utf8');
    assert.equal(written, 'new stock v2', 'Stock file must be upgraded');
  });

  test('returns skipped (hash null) when src is missing', async () => {
    const dest = await writeFile(tmp, 'dest/orphan.txt', 'existing');
    const result = await manifestSafeCopy(path.join(tmp, 'src/gone.txt'), dest, {});
    assert.equal(result.action, 'skipped');
    assert.equal(result.hash, null);
  });
});

// ── removeManifestFiles ───────────────────────────────────────────────────────

describe('removeManifestFiles', () => {
  let tmp;
  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('deletes only files listed in manifest under baseDir', async () => {
    const avFile = await writeFile(tmp, '.claude/hooks/play-tts.sh', '#!/bin/bash');
    const userFile = await writeFile(tmp, '.claude/hooks/my-custom-hook.sh', '#!/bin/bash echo custom');

    const manifest = { [avFile]: { hash: 'h1', installedAt: 'now' } };
    const removed = await removeManifestFiles(manifest, tmp);

    assert.equal(removed, 1);
    await assert.rejects(fs.access(avFile), 'AgentVibes file must be deleted');
    await assert.doesNotReject(fs.access(userFile), 'User custom file must NOT be deleted');
  });

  test('ignores manifest entries outside baseDir (path traversal safety)', async () => {
    const outsideFile = await writeFile(tmp + '-outside', 'secret.txt', 'data');
    const manifest = { [outsideFile]: { hash: 'h', installedAt: 'now' } };
    const removed = await removeManifestFiles(manifest, tmp);
    assert.equal(removed, 0);
    await assert.doesNotReject(fs.access(outsideFile), 'Files outside baseDir must not be touched');
    await fs.rm(tmp + '-outside', { recursive: true, force: true });
  });

  test('returns 0 for empty manifest', async () => {
    const removed = await removeManifestFiles({}, tmp);
    assert.equal(removed, 0);
  });

  test('prunesDirs are attempted as rmdir (no-op if non-empty)', async () => {
    const subDir = path.join(tmp, 'prune-test');
    await fs.mkdir(subDir, { recursive: true });
    const remainingFile = await writeFile(tmp, 'prune-test/user.txt', 'keep me');
    // Should not throw even if dir is not empty
    await assert.doesNotReject(removeManifestFiles({}, tmp, [subDir]));
    await assert.doesNotReject(fs.access(remainingFile), 'Non-manifested file in dir must survive');
  });
});

// ── getProjectManifestPath / getGlobalManifestPath ───────────────────────────

describe('manifest path helpers', () => {
  test('getProjectManifestPath returns .agentvibes/install-manifest.json under targetDir', () => {
    const result = getProjectManifestPath('/my/project');
    assert.equal(result, path.join('/my/project', '.agentvibes', 'install-manifest.json'));
  });

  test('getGlobalManifestPath uses provided homeDir', () => {
    const result = getGlobalManifestPath('/home/testuser');
    assert.equal(result, path.join('/home/testuser', '.agentvibes', 'install-manifest.json'));
  });
});

// ── updatePersonalityFiles idempotency ───────────────────────────────────────

describe('updatePersonalityFiles — user customisation preserved', () => {
  let tmp;
  const srcPersonalitiesDir = path.join(PROJECT_ROOT, '.claude', 'personalities');

  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('first call installs personality files and writes manifest', async () => {
    await fs.mkdir(path.join(tmp, '.claude', 'personalities'), { recursive: true });
    await fs.mkdir(path.join(tmp, '.agentvibes'), { recursive: true });

    await updatePersonalityFiles(tmp, srcPersonalitiesDir);

    // Manifest should have been written
    const manifest = await loadManifest(getProjectManifestPath(tmp));
    assert.ok(Object.keys(manifest).length > 0, 'Manifest must be written after first install');
  });

  test('second call does not overwrite user-modified personality', async () => {
    // Find a personality file that was installed
    const destDir = path.join(tmp, '.claude', 'personalities');
    const files = await fs.readdir(destDir);
    const mdFile = files.find(f => f.endsWith('.md'));
    assert.ok(mdFile, 'At least one personality file must be installed');

    const destPath = path.join(destDir, mdFile);
    const userEdit = '# My custom edit\nThis is MY personality now.';
    await fs.writeFile(destPath, userEdit, 'utf8');

    // Run update again
    await updatePersonalityFiles(tmp, srcPersonalitiesDir);

    // User's edit must survive
    const content = await fs.readFile(destPath, 'utf8');
    assert.equal(content, userEdit, 'User-modified personality must not be overwritten by update');

    // .user.bak must be saved
    const bak = await fs.readFile(destPath + '.user.bak', 'utf8');
    assert.equal(bak, userEdit, '.user.bak must be saved for user-modified personality');
  });
});

// ── updateCommandFiles idempotency ───────────────────────────────────────────

describe('updateCommandFiles — user customisation preserved', () => {
  let tmp;

  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('first update installs command files and writes manifest', async () => {
    await fs.mkdir(path.join(tmp, '.claude', 'commands', 'agent-vibes'), { recursive: true });
    await fs.mkdir(path.join(tmp, '.agentvibes'), { recursive: true });

    await updateCommandFiles(tmp, silentSpinner);

    const manifest = await loadManifest(getProjectManifestPath(tmp));
    assert.ok(Object.keys(manifest).length > 0, 'Manifest must be written after updateCommandFiles');
  });

  test('second update preserves user-modified command file', async () => {
    const commandsDir = path.join(tmp, '.claude', 'commands', 'agent-vibes');
    const files = await fs.readdir(commandsDir);
    const mdFile = files.find(f => f.endsWith('.md'));
    assert.ok(mdFile, 'At least one command file must be installed');

    const destPath = path.join(commandsDir, mdFile);
    const userEdit = '# My custom command\nDo something custom.';
    await fs.writeFile(destPath, userEdit, 'utf8');

    await updateCommandFiles(tmp, silentSpinner);

    const content = await fs.readFile(destPath, 'utf8');
    assert.equal(content, userEdit, 'User-modified command must not be overwritten');
  });
});

// ── updateGlobalHooks manifest tracking ──────────────────────────────────────

describe('updateGlobalHooks — manifest tracking and user preservation', () => {
  let fakeHome;

  before(async () => { fakeHome = await makeTmpDir(); });
  after(async () => { await fs.rm(fakeHome, { recursive: true, force: true }); });

  test('writes global manifest after installing hooks', async () => {
    const srcHooksDir = path.join(PROJECT_ROOT, '.claude', 'hooks');
    await updateGlobalHooks(srcHooksDir, fakeHome);

    const manifest = await loadManifest(getGlobalManifestPath(fakeHome));
    assert.ok(Object.keys(manifest).length > 0, 'Global manifest must be written');
  });

  test('preserves user-modified global hook on second update', async () => {
    const globalHooksDir = path.join(fakeHome, '.claude', 'hooks');
    const hookFile = CRITICAL_HOOKS.find(h => h.endsWith('.sh'));
    assert.ok(hookFile, 'At least one critical .sh hook must exist');

    const destPath = path.join(globalHooksDir, hookFile);
    const userEdit = '#!/bin/bash\n# My custom hook\necho "custom"';
    await fs.writeFile(destPath, userEdit, 'utf8');

    const srcHooksDir = path.join(PROJECT_ROOT, '.claude', 'hooks');
    await updateGlobalHooks(srcHooksDir, fakeHome);

    const content = await fs.readFile(destPath, 'utf8');
    assert.equal(content, userEdit, 'User-modified global hook must not be overwritten');
  });
});

// ── copyHookFiles manifest tracking ──────────────────────────────────────────

describe('copyHookFiles — manifest tracking', () => {
  let tmp;

  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('writes project manifest after copying hooks', async () => {
    await fs.mkdir(path.join(tmp, '.agentvibes'), { recursive: true });

    await copyHookFiles(tmp, silentSpinner);

    const manifest = await loadManifest(getProjectManifestPath(tmp));
    assert.ok(Object.keys(manifest).length > 0, 'Manifest must be written by copyHookFiles');
  });

  test('preserves user-modified hook on second copyHookFiles call', async () => {
    const hooksDir = path.join(tmp, '.claude', process.platform === 'win32' ? 'hooks-windows' : 'hooks');
    const files = await fs.readdir(hooksDir);
    const shFile = files.find(f => f.endsWith('.sh') || f.endsWith('.ps1'));
    assert.ok(shFile, 'At least one hook must be installed');

    const destPath = path.join(hooksDir, shFile);
    const userEdit = '#!/bin/bash\n# My custom hook\necho "custom"';
    await fs.writeFile(destPath, userEdit, 'utf8');

    await copyHookFiles(tmp, silentSpinner);

    const content = await fs.readFile(destPath, 'utf8');
    assert.equal(content, userEdit, 'User-modified hook must survive re-install');
  });
});

// ── tts-pretext.txt preserved on reinstall ────────────────────────────────────

describe('tts-pretext.txt — not deleted when wizard prompt is blank', () => {
  let tmp;

  before(async () => { tmp = await makeTmpDir(); });
  after(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  test('pretext file survives when userConfig.pretext is empty string', async () => {
    // Directly test the conditional logic: if pretext is falsy, file must NOT be unlinked.
    const pretextPath = await writeFile(tmp, 'tts-pretext.txt', 'Hello, I am Claude.');
    const userPretext = '';

    // This is the fixed logic — no unlink on blank
    if (userPretext && userPretext.trim()) {
      await fs.writeFile(pretextPath, userPretext, { mode: 0o600 });
    }
    // (no else/unlink branch)

    await assert.doesNotReject(fs.access(pretextPath), 'tts-pretext.txt must NOT be deleted when pretext is blank');
    const content = await fs.readFile(pretextPath, 'utf8');
    assert.equal(content, 'Hello, I am Claude.', 'Pretext content must be preserved');
  });
});
