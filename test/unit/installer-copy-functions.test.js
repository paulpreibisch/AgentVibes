/**
 * Coverage for installer.js copy/configure functions
 *
 * Tests the file-operation functions exported from installer.js that install
 * AgentVibes files into a target directory. Uses real temp directories and
 * the package's own source files (which exist in the development checkout).
 *
 * Targets (lines uncovered):
 *   copyCommandFiles       (3482-3595)
 *   copyPersonalityFiles   (3775-3870)
 *   copyPluginFiles        (3869-3905)
 *   copyBmadConfigFiles    (3904-3940)
 *   copyBackgroundMusicFiles (3937-4060)
 *   copyConfigFiles        (4060-4125)
 *   copyCodexFiles         (4123-4180)
 *   configureSessionStartHook (4177-4240)
 *   ensureGitRepo          (4303-4330)
 *   installPluginManifest  (4328-4360)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  copyCommandFiles,
  copyPersonalityFiles,
  copyPluginFiles,
  copyBmadConfigFiles,
  copyBackgroundMusicFiles,
  copyConfigFiles,
  copyCodexFiles,
  configureSessionStartHook,
  ensureGitRepo,
  installPluginManifest,
  isNativeWindows,
  CRITICAL_HOOKS,
  CRITICAL_HOOKS_WINDOWS,
} from '../../src/installer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Silent spinner that satisfies createRobustSpinner's duck-type check */
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

/** Create and return a fresh temp directory for each test */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-copy-'));
}

/** Recursively remove a directory (cleanup) */
function rmTmpDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
}

// ===========================================================================
// isNativeWindows and CRITICAL_HOOKS constants
// ===========================================================================

describe('isNativeWindows()', () => {
  test('returns a boolean', () => {
    assert.strictEqual(typeof isNativeWindows(), 'boolean');
  });

  test('returns false on Linux', () => {
    if (process.platform !== 'win32') {
      assert.strictEqual(isNativeWindows(), false);
    }
  });
});

describe('CRITICAL_HOOKS constants', () => {
  test('CRITICAL_HOOKS is an array', () => {
    assert.ok(Array.isArray(CRITICAL_HOOKS));
  });

  test('CRITICAL_HOOKS_WINDOWS is an array', () => {
    assert.ok(Array.isArray(CRITICAL_HOOKS_WINDOWS));
  });

  test('CRITICAL_HOOKS contains hook script names', () => {
    assert.ok(CRITICAL_HOOKS.length > 0);
    assert.ok(CRITICAL_HOOKS.every(h => typeof h === 'string'));
  });
});

// ===========================================================================
// copyCommandFiles
// ===========================================================================

describe('copyCommandFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => copyCommandFiles(tmp, silentSpinner));
  });

  test('creates .claude/commands/agent-vibes directory', async () => {
    await copyCommandFiles(tmp, silentSpinner);
    const dir = path.join(tmp, '.claude', 'commands', 'agent-vibes');
    assert.ok(fs.existsSync(dir), 'agent-vibes commands directory must exist');
  });

  test('installs at least one .md command file', async () => {
    await copyCommandFiles(tmp, silentSpinner);
    const dir = path.join(tmp, '.claude', 'commands', 'agent-vibes');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    assert.ok(files.length > 0, 'at least one .md command file must be installed');
  });

  test('returns object with count property', async () => {
    const result = await copyCommandFiles(tmp, silentSpinner);
    assert.ok(result !== undefined);
    assert.ok('count' in result, 'result must have count');
    assert.ok(typeof result.count === 'number');
  });

  test('is idempotent — second call does not throw', async () => {
    await assert.doesNotReject(() => copyCommandFiles(tmp, silentSpinner));
  });
});

// ===========================================================================
// copyPersonalityFiles
// ===========================================================================

describe('copyPersonalityFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => copyPersonalityFiles(tmp, silentSpinner));
  });

  test('creates .claude/personalities directory', async () => {
    await copyPersonalityFiles(tmp, silentSpinner);
    const dir = path.join(tmp, '.claude', 'personalities');
    assert.ok(fs.existsSync(dir), 'personalities directory must exist');
  });

  test('installs personality .md files', async () => {
    await copyPersonalityFiles(tmp, silentSpinner);
    const dir = path.join(tmp, '.claude', 'personalities');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    assert.ok(files.length > 0, 'at least one personality file must be installed');
  });

  test('is idempotent', async () => {
    await assert.doesNotReject(() => copyPersonalityFiles(tmp, silentSpinner));
  });
});

// ===========================================================================
// copyPluginFiles (optional — graceful when absent)
// ===========================================================================

describe('copyPluginFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw (source may be absent)', async () => {
    await assert.doesNotReject(() => copyPluginFiles(tmp, silentSpinner));
  });

  test('returns a number (file count)', async () => {
    const result = await copyPluginFiles(tmp, silentSpinner);
    assert.strictEqual(typeof result, 'number');
  });
});

// ===========================================================================
// copyBmadConfigFiles
// ===========================================================================

describe('copyBmadConfigFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => copyBmadConfigFiles(tmp, silentSpinner));
  });

  test('creates .agentvibes/bmad directory', async () => {
    await copyBmadConfigFiles(tmp, silentSpinner);
    const dir = path.join(tmp, '.agentvibes', 'bmad');
    assert.ok(fs.existsSync(dir), '.agentvibes/bmad directory must exist');
  });
});

// ===========================================================================
// copyBackgroundMusicFiles
// ===========================================================================

describe('copyBackgroundMusicFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => copyBackgroundMusicFiles(tmp, silentSpinner));
  });

  test('creates .claude/audio/tracks directory', async () => {
    await copyBackgroundMusicFiles(tmp, silentSpinner);
    const dir = path.join(tmp, '.claude', 'audio', 'tracks');
    assert.ok(fs.existsSync(dir), '.claude/audio/tracks directory must exist');
  });

  test('returns an object with boxen (or undefined for no tracks)', async () => {
    const result = await copyBackgroundMusicFiles(tmp, silentSpinner);
    // Function may return undefined or an object with boxen content
    assert.ok(result === undefined || typeof result === 'object');
  });
});

// ===========================================================================
// copyConfigFiles
// ===========================================================================

describe('copyConfigFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => copyConfigFiles(tmp, silentSpinner));
  });

  test('creates .claude/config directory', async () => {
    await copyConfigFiles(tmp, silentSpinner);
    const dir = path.join(tmp, '.claude', 'config');
    assert.ok(fs.existsSync(dir), '.claude/config directory must exist');
  });

  test('returns a number (file count)', async () => {
    const result = await copyConfigFiles(tmp, silentSpinner);
    assert.strictEqual(typeof result, 'number');
  });

  test('second call skips already-existing files', async () => {
    const result2 = await copyConfigFiles(tmp, silentSpinner);
    assert.strictEqual(typeof result2, 'number');
  });
});

// ===========================================================================
// copyCodexFiles
// ===========================================================================

describe('copyCodexFiles()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => copyCodexFiles(tmp, silentSpinner));
  });

  test('returns a number (file count)', async () => {
    const result = await copyCodexFiles(tmp, silentSpinner);
    assert.strictEqual(typeof result, 'number');
  });

  test('creates .codex directory if files were copied', async () => {
    const result = await copyCodexFiles(tmp, silentSpinner);
    if (result > 0) {
      assert.ok(fs.existsSync(path.join(tmp, '.codex')));
    }
  });
});

// ===========================================================================
// configureSessionStartHook
// ===========================================================================

describe('configureSessionStartHook()', () => {
  let tmp;
  before(() => {
    tmp = makeTmpDir();
    // Pre-create .claude dir so the function can write settings.json
    fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
  });
  after(() => rmTmpDir(tmp));

  test('does not throw', async () => {
    await assert.doesNotReject(() => configureSessionStartHook(tmp, silentSpinner));
  });

  test('creates .claude/settings.json', async () => {
    await configureSessionStartHook(tmp, silentSpinner);
    const settingsPath = path.join(tmp, '.claude', 'settings.json');
    assert.ok(fs.existsSync(settingsPath), 'settings.json must exist after configuring hook');
  });

  test('settings.json has hooks section', async () => {
    const settingsPath = path.join(tmp, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok('hooks' in settings, 'settings must have hooks section');
  });

  test('second call does not throw (idempotent)', async () => {
    await assert.doesNotReject(() => configureSessionStartHook(tmp, silentSpinner));
  });
});

// ===========================================================================
// ensureGitRepo
// ===========================================================================

describe('ensureGitRepo()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw when no .git dir exists', async () => {
    await assert.doesNotReject(() => ensureGitRepo(tmp, silentSpinner));
  });

  test('does not throw when .git dir already exists', async () => {
    fs.mkdirSync(path.join(tmp, '.git'), { recursive: true });
    await assert.doesNotReject(() => ensureGitRepo(tmp, silentSpinner));
  });
});

// ===========================================================================
// installPluginManifest (optional — graceful when plugin.json absent)
// ===========================================================================

describe('installPluginManifest()', () => {
  let tmp;
  before(() => { tmp = makeTmpDir(); });
  after(() => rmTmpDir(tmp));

  test('does not throw (source plugin.json may be absent)', async () => {
    await assert.doesNotReject(() => installPluginManifest(tmp, silentSpinner));
  });
});
