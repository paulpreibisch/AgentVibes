#!/usr/bin/env node

/**
 * Story AVI-S8.5 (Stage 2 packaging) — the utterance resolver bundle
 * (bin/resolve-utterance.js + src/services/utterance-resolver.js +
 * src/services/utterance-loader.js) must ship to a real install, not just
 * live in the repo. Before this change, `npx agentvibes install` copied the
 * hooks into ~/.claude/hooks/ but never copied the resolver CLI or its
 * services alongside them, so the players' `$SCRIPT_DIR/resolve-utterance.js`
 * lookup always missed and silently fell back to legacy (pre-fix) logic.
 *
 * These tests exercise the real installer copy functions against a temp
 * fake-home/fake-project tree and assert:
 *   1. the three bundle files land at the chosen location with the bin/ +
 *      src/services/ relative layout intact (so `../src/services/...`
 *      imports still resolve from the shipped resolve-utterance.js), and
 *   2. a second run is idempotent (no errors, unchanged content, and a
 *      user-modified copy is preserved rather than clobbered — the
 *      Non-Destructive Configuration Rule), and
 *   3. the shipped bundle actually RUNS: `node <shipped>/resolve-utterance.js`
 *      resolves its relative imports and prints a real JSON plan.
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { copyResolverBundle, updateGlobalResolverBundle } from '../../src/installer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

function stubSpinner() {
  const noop = () => stub;
  const stub = { start: noop, succeed: noop, info: noop, warn: noop, fail: noop, stop: noop, text: '' };
  return stub;
}

let tmpRoot;
before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'avi-8-5-bundle-'));
});
after(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

function bundlePaths(claudeDir) {
  return {
    hooksCli: path.join(claudeDir, 'hooks', 'resolve-utterance.js'),
    hooksWindowsCli: path.join(claudeDir, 'hooks-windows', 'resolve-utterance.js'),
    resolver: path.join(claudeDir, 'src', 'services', 'utterance-resolver.js'),
    loader: path.join(claudeDir, 'src', 'services', 'utterance-loader.js'),
  };
}

describe('copyResolverBundle — project-local install', () => {
  test('ships all three files with the bin/ + src/services/ layout intact', async () => {
    const targetDir = path.join(tmpRoot, 'project-a');
    await fs.mkdir(targetDir, { recursive: true });

    const result = await copyResolverBundle(targetDir, stubSpinner());
    assert.ok(result.count >= 4, 'first run should copy all 4 shipped file targets');

    const claudeDir = path.join(targetDir, '.claude');
    const p = bundlePaths(claudeDir);
    for (const [name, filePath] of Object.entries(p)) {
      assert.equal(fsSync.existsSync(filePath), true, `${name} must exist at ${filePath}`);
    }

    // Content matches the real repo source (byte-for-byte copy, not a stub).
    const realCli = await fs.readFile(path.join(repoRoot, 'bin', 'resolve-utterance.js'), 'utf8');
    assert.equal(await fs.readFile(p.hooksCli, 'utf8'), realCli);
    assert.equal(await fs.readFile(p.hooksWindowsCli, 'utf8'), realCli);
  });

  test('second run is idempotent — no errors, content unchanged', async () => {
    const targetDir = path.join(tmpRoot, 'project-idempotent');
    await fs.mkdir(targetDir, { recursive: true });

    await copyResolverBundle(targetDir, stubSpinner());
    const p = bundlePaths(path.join(targetDir, '.claude'));
    const before1 = await fs.readFile(p.resolver, 'utf8');

    const second = await copyResolverBundle(targetDir, stubSpinner());
    assert.equal(second.count, 0, 'second run should report nothing new to copy (all unchanged)');

    const after1 = await fs.readFile(p.resolver, 'utf8');
    assert.equal(after1, before1, 'content must be identical after a second, idempotent run');
  });

  test('a user-modified bundle file is preserved (Non-Destructive Configuration Rule)', async () => {
    const targetDir = path.join(tmpRoot, 'project-user-mod');
    await fs.mkdir(targetDir, { recursive: true });

    await copyResolverBundle(targetDir, stubSpinner());
    const p = bundlePaths(path.join(targetDir, '.claude'));

    // Simulate a user hand-editing the shipped file after install.
    const userEdit = '// USER CUSTOMIZATION\n' + (await fs.readFile(p.resolver, 'utf8'));
    await fs.writeFile(p.resolver, userEdit);

    await copyResolverBundle(targetDir, stubSpinner());

    const afterUpdate = await fs.readFile(p.resolver, 'utf8');
    assert.equal(afterUpdate, userEdit, 'user-modified resolver file must survive a re-install/update');
    assert.equal(fsSync.existsSync(p.resolver + '.user.bak'), true, 'a .user.bak should be recorded (unused here, but proves the safe-copy path ran)');
  });
});

describe('updateGlobalResolverBundle — global ~/.claude/ sync', () => {
  test('ships the bundle into a fake $HOME/.claude/', async () => {
    const fakeHome = path.join(tmpRoot, 'fake-home-1');
    await fs.mkdir(fakeHome, { recursive: true });

    const count = await updateGlobalResolverBundle(fakeHome);
    assert.ok(count >= 4, 'first run should copy all 4 shipped file targets into the fake home');

    const p = bundlePaths(path.join(fakeHome, '.claude'));
    for (const [name, filePath] of Object.entries(p)) {
      assert.equal(fsSync.existsSync(filePath), true, `${name} must exist at ${filePath}`);
    }
  });

  test('second run against the same fake $HOME is idempotent', async () => {
    const fakeHome = path.join(tmpRoot, 'fake-home-2');
    await fs.mkdir(fakeHome, { recursive: true });

    await updateGlobalResolverBundle(fakeHome);
    const second = await updateGlobalResolverBundle(fakeHome);
    assert.equal(second, 0, 'second run should report nothing new (all unchanged)');
  });
});

describe('shipped bundle actually runs (relative imports resolve)', () => {
  test('node <claudeDir>/hooks/resolve-utterance.js prints a real JSON plan', async () => {
    const targetDir = path.join(tmpRoot, 'project-run');
    await fs.mkdir(targetDir, { recursive: true });
    await copyResolverBundle(targetDir, stubSpinner());

    const shippedCli = path.join(targetDir, '.claude', 'hooks', 'resolve-utterance.js');
    const projectDirForPlan = path.join(tmpRoot, 'project-run-plan-target');
    await fs.mkdir(projectDirForPlan, { recursive: true });

    const stdout = execFileSync(
      process.execPath,
      [shippedCli, '--text', 'hi', '--project-dir', projectDirForPlan],
      { encoding: 'utf8' }
    );

    const plan = JSON.parse(stdout.trim());
    assert.equal(plan.text, 'hi', 'the shipped CLI must resolve a real plan, not fail on missing imports');
    assert.equal(typeof plan.voice, 'string');
    assert.equal(typeof plan.engine, 'string');
  });

  test('node <fakeHome>/.claude/hooks-windows/resolve-utterance.js also runs (shared src/services/)', async () => {
    const fakeHome = path.join(tmpRoot, 'fake-home-run');
    await fs.mkdir(fakeHome, { recursive: true });
    await updateGlobalResolverBundle(fakeHome);

    const shippedCli = path.join(fakeHome, '.claude', 'hooks-windows', 'resolve-utterance.js');
    const stdout = execFileSync(
      process.execPath,
      [shippedCli, '--text', 'hello again', '--project-dir', fakeHome],
      { encoding: 'utf8' }
    );

    const plan = JSON.parse(stdout.trim());
    assert.equal(plan.text, 'hello again');
  });
});

describe('npm tarball packaging (package.json files[])', () => {
  test('bin/ and src/ globs cover the resolver bundle source files on disk', async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    assert.ok(pkg.files.includes('bin/'), 'bin/ must be whitelisted for the npm tarball');
    assert.ok(pkg.files.includes('src/'), 'src/ must be whitelisted for the npm tarball');

    for (const rel of ['bin/resolve-utterance.js', 'src/services/utterance-resolver.js', 'src/services/utterance-loader.js']) {
      assert.equal(fsSync.existsSync(path.join(repoRoot, rel)), true, `${rel} must exist at the package root`);
    }
  });
});
