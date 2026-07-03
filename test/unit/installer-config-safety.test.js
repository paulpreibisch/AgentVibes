#!/usr/bin/env node

/**
 * Story AVI-S8.1 — Install & Packaging Bleeders (Fable review remediation).
 *
 * Regression tests for three production-breaking bugs:
 *   #1  require() in an ESM module aborted `agentvibes update` mid-run.
 *   #2  voice-assignments.json (the 914-voice catalog) was missing from the
 *       published tarball, silently dead in every npm install.
 *   #6  A corrupt (but non-empty) settings.json was overwritten with only the
 *       hook, wiping all of the user's real settings — a Non-Destructive
 *       Configuration Rule violation.
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configureSessionStartHook,
  readJsonConfigSafe,
} from '../../src/installer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

// A spinner stub that swallows all output — the hook configurer calls
// createRobustSpinner() on whatever we pass, and only invokes these methods.
function stubSpinner() {
  const noop = () => stub;
  const stub = { start: noop, succeed: noop, info: noop, warn: noop, fail: noop, stop: noop, text: '' };
  return stub;
}

let tmpRoot;
before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'avi-8-1-'));
});
after(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

async function makeTarget(name, settingsContent) {
  const targetDir = path.join(tmpRoot, name);
  const claudeDir = path.join(targetDir, '.claude');
  await fs.mkdir(claudeDir, { recursive: true });
  if (settingsContent !== undefined) {
    await fs.writeFile(path.join(claudeDir, 'settings.json'), settingsContent);
  }
  return { targetDir, settingsPath: path.join(claudeDir, 'settings.json') };
}

describe('Bug #6 — settings.json is never destroyed (configureSessionStartHook)', () => {
  test('corrupt settings.json is left byte-for-byte untouched', async () => {
    // Real-world trigger: one trailing comma. Contains real user data.
    const corrupt = '{\n  "userKey": "keep me",\n  "hooks": {},\n}\n';
    const { targetDir, settingsPath } = await makeTarget('corrupt', corrupt);

    await configureSessionStartHook(targetDir, stubSpinner());

    const after = await fs.readFile(settingsPath, 'utf8');
    assert.equal(after, corrupt, 'corrupt settings.json must not be overwritten');
    // And no backup churn from a refused write.
    assert.equal(fsSync.existsSync(settingsPath + '.bak'), false);
  });

  test('valid settings: user keys preserved, hook added, backup written', async () => {
    const valid = JSON.stringify({ userKey: 'keep', permissions: { allow: ['x'] }, hooks: {} }, null, 2);
    const { targetDir, settingsPath } = await makeTarget('valid', valid);

    await configureSessionStartHook(targetDir, stubSpinner());

    const parsed = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    assert.equal(parsed.userKey, 'keep', 'existing user data must survive');
    assert.deepEqual(parsed.permissions, { allow: ['x'] });
    assert.ok(Object.keys(parsed.hooks).length > 0, 'a hook key must be added');
    const commands = JSON.stringify(parsed.hooks);
    assert.match(commands, /session-start-tts/, 'the session-start hook command must be present');
    assert.equal(fsSync.existsSync(settingsPath + '.bak'), true, 'a .bak must be written before mutation');
  });

  test('missing settings.json is created fresh with the hook', async () => {
    const { targetDir, settingsPath } = await makeTarget('missing', undefined);

    await configureSessionStartHook(targetDir, stubSpinner());

    assert.equal(fsSync.existsSync(settingsPath), true, 'settings.json should be created');
    const parsed = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    assert.ok(Object.keys(parsed.hooks || {}).length > 0);
    // Nothing pre-existed, so no backup should be produced.
    assert.equal(fsSync.existsSync(settingsPath + '.bak'), false);
  });
});

describe('Bug #6 — readJsonConfigSafe classification', () => {
  test('missing file → exists:false, not corrupt', async () => {
    const r = await readJsonConfigSafe(path.join(tmpRoot, 'does-not-exist.json'));
    assert.deepEqual(r, { exists: false, corrupt: false, data: {} });
  });

  test('empty file → treated as fresh (safe to create)', async () => {
    const p = path.join(tmpRoot, 'empty.json');
    await fs.writeFile(p, '   \n');
    const r = await readJsonConfigSafe(p);
    assert.equal(r.exists, false);
    assert.equal(r.corrupt, false);
  });

  test('valid object → exists:true, corrupt:false, data returned', async () => {
    const p = path.join(tmpRoot, 'valid.json');
    await fs.writeFile(p, '{"a":1}');
    const r = await readJsonConfigSafe(p);
    assert.equal(r.exists, true);
    assert.equal(r.corrupt, false);
    assert.deepEqual(r.data, { a: 1 });
  });

  test('array root → corrupt (wrong shape must not be merged into)', async () => {
    const p = path.join(tmpRoot, 'array.json');
    await fs.writeFile(p, '[1,2,3]');
    const r = await readJsonConfigSafe(p);
    assert.equal(r.corrupt, true);
  });

  test('invalid JSON → corrupt', async () => {
    const p = path.join(tmpRoot, 'bad.json');
    await fs.writeFile(p, '{ "a": 1, }');
    const r = await readJsonConfigSafe(p);
    assert.equal(r.exists, true);
    assert.equal(r.corrupt, true);
  });
});

describe('Bug #1 — no require() in the ESM installer', () => {
  test('installer.js does not call require(\'child_process\')', async () => {
    const src = await fs.readFile(path.join(repoRoot, 'src', 'installer.js'), 'utf8');
    assert.equal(/require\(\s*['"]child_process['"]\s*\)/.test(src), false,
      'require() throws in a "type":"module" package');
    assert.match(src, /import\s*\{[^}]*\bspawn\b[^}]*\}\s*from\s*['"]node:child_process['"]/,
      'spawn/spawnSync must come from the top-level ESM import');
  });
});

describe('Bug #2 — voice catalog is packaged', () => {
  test('package.json files[] includes voice-assignments.json and the file exists', async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    assert.ok(pkg.files.includes('voice-assignments.json'),
      'voice-assignments.json must be whitelisted for the npm tarball');
    assert.equal(fsSync.existsSync(path.join(repoRoot, 'voice-assignments.json')), true,
      'the catalog file must exist at the package root');
  });
});
