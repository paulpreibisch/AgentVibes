/**
 * BMAD Party Mode Hook Installer Tests
 * Verifies that configurePartyModeHook correctly installs the PostToolUse
 * hook script and registers it in ~/.claude/settings.json for all platforms.
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  configurePartyModeHook,
  CRITICAL_HOOKS,
  CRITICAL_HOOKS_WINDOWS,
} from '../../src/installer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

// Silent spinner stub
const silentSpinner = { start: () => {}, succeed: () => {}, warn: () => {}, info: () => {}, fail: () => {} };

// ---------------------------------------------------------------------------
// Script file presence in project hooks dirs
// ---------------------------------------------------------------------------

describe('party mode scripts ship with the package', () => {
  test('bmad-party-speak.sh exists in .claude/hooks/', async () => {
    const p = path.join(PROJECT_ROOT, '.claude/hooks/bmad-party-speak.sh');
    await assert.doesNotReject(fs.access(p), 'bmad-party-speak.sh must exist in .claude/hooks/');
  });

  test('bmad-party-speak.ps1 exists in .claude/hooks-windows/', async () => {
    const p = path.join(PROJECT_ROOT, '.claude/hooks-windows/bmad-party-speak.ps1');
    await assert.doesNotReject(fs.access(p), 'bmad-party-speak.ps1 must exist in .claude/hooks-windows/');
  });

  test('bmad-party-speak.sh has execute permission (non-Windows)', async () => {
    if (process.platform === 'win32') return;
    const p = path.join(PROJECT_ROOT, '.claude/hooks/bmad-party-speak.sh');
    const stat = await fs.stat(p);
    assert.ok(stat.mode & 0o111, 'bmad-party-speak.sh must be executable');
  });

  test('bmad-party-speak.sh contains party mode fingerprint', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks/bmad-party-speak.sh'), 'utf8');
    assert.ok(src.includes('BMAD agent in a collaborative roundtable'),
      'bmad-party-speak.sh must fingerprint party mode prompts');
  });

  test('bmad-party-speak.ps1 contains party mode fingerprint', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks-windows/bmad-party-speak.ps1'), 'utf8');
    assert.ok(src.includes('BMAD agent in a collaborative roundtable'),
      'bmad-party-speak.ps1 must fingerprint party mode prompts');
  });

  test('bmad-party-speak.sh uses set -euo pipefail', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks/bmad-party-speak.sh'), 'utf8');
    assert.ok(src.includes('set -euo pipefail'), 'bmad-party-speak.sh must use strict bash mode');
  });
});

// ---------------------------------------------------------------------------
// CRITICAL_HOOKS registration
// ---------------------------------------------------------------------------

describe('CRITICAL_HOOKS includes party mode scripts', () => {
  test('CRITICAL_HOOKS includes bmad-party-speak.sh', () => {
    assert.ok(CRITICAL_HOOKS.includes('bmad-party-speak.sh'),
      'bmad-party-speak.sh must be in CRITICAL_HOOKS for update propagation');
  });

  test('CRITICAL_HOOKS_WINDOWS includes bmad-party-speak.ps1', () => {
    assert.ok(CRITICAL_HOOKS_WINDOWS.includes('bmad-party-speak.ps1'),
      'bmad-party-speak.ps1 must be in CRITICAL_HOOKS_WINDOWS');
  });
});

// ---------------------------------------------------------------------------
// configurePartyModeHook — installs script and registers PostToolUse hook
// ---------------------------------------------------------------------------

describe('configurePartyModeHook', () => {
  let tmpHome;

  before(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'av-party-test-'));
  });

  after(async () => {
    await fs.rm(tmpHome, { recursive: true, force: true });
  });

  test('creates global hooks dir and copies script', async () => {
    await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome);

    const hooksSubdir = process.platform === 'win32' ? 'hooks-windows' : 'hooks';
    const scriptName = process.platform === 'win32' ? 'bmad-party-speak.ps1' : 'bmad-party-speak.sh';
    const destScript = path.join(tmpHome, '.claude', hooksSubdir, scriptName);

    await assert.doesNotReject(fs.access(destScript),
      `${scriptName} must be copied to global ${hooksSubdir} dir`);
  });

  test('copied script contains party mode logic', async () => {
    await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome);

    const hooksSubdir = process.platform === 'win32' ? 'hooks-windows' : 'hooks';
    const scriptName = process.platform === 'win32' ? 'bmad-party-speak.ps1' : 'bmad-party-speak.sh';
    const destScript = path.join(tmpHome, '.claude', hooksSubdir, scriptName);

    const content = await fs.readFile(destScript, 'utf8');
    assert.ok(content.includes('BMAD agent in a collaborative roundtable'),
      'Copied script must contain party mode fingerprint');
  });

  test('writes PostToolUse hook to ~/.claude/settings.json', async () => {
    const tmpHome2 = await fs.mkdtemp(path.join(os.tmpdir(), 'av-party-settings-test-'));
    try {
      await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome2);

      const settingsPath = path.join(tmpHome2, '.claude', 'settings.json');
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));

      assert.ok(Array.isArray(settings.hooks?.PostToolUse),
        'settings.json must have PostToolUse hooks array');

      const hasPartyHook = settings.hooks.PostToolUse.some(entry =>
        Array.isArray(entry.hooks) &&
        entry.hooks.some(h => h.command && h.command.includes('bmad-party-speak'))
      );
      assert.ok(hasPartyHook, 'PostToolUse must include bmad-party-speak command');
    } finally {
      await fs.rm(tmpHome2, { recursive: true, force: true });
    }
  });

  test('PostToolUse hook command references global ~/.claude path', async () => {
    const tmpHome3 = await fs.mkdtemp(path.join(os.tmpdir(), 'av-party-cmd-test-'));
    try {
      await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome3);

      const settingsPath = path.join(tmpHome3, '.claude', 'settings.json');
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));

      const entry = settings.hooks.PostToolUse
        .flatMap(e => e.hooks ?? [])
        .find(h => h.command?.includes('bmad-party-speak'));

      assert.ok(entry, 'Must find a bmad-party-speak hook entry');
      // Command must reference $HOME (not project-relative path)
      assert.ok(entry.command.includes('$HOME') || entry.command.includes('%USERPROFILE%') || entry.command.includes('$HOME'),
        `Hook command must use $HOME path, got: ${entry.command}`);
    } finally {
      await fs.rm(tmpHome3, { recursive: true, force: true });
    }
  });

  test('is idempotent — does not add duplicate PostToolUse hook', async () => {
    const tmpHome4 = await fs.mkdtemp(path.join(os.tmpdir(), 'av-party-idem-test-'));
    try {
      // Run twice
      await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome4);
      await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome4);

      const settingsPath = path.join(tmpHome4, '.claude', 'settings.json');
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));

      const partyHooks = settings.hooks.PostToolUse.filter(entry =>
        Array.isArray(entry.hooks) &&
        entry.hooks.some(h => h.command?.includes('bmad-party-speak'))
      );
      assert.strictEqual(partyHooks.length, 1, 'Must not add duplicate PostToolUse hooks on repeated runs');
    } finally {
      await fs.rm(tmpHome4, { recursive: true, force: true });
    }
  });

  test('preserves existing PostToolUse hooks when adding party mode hook', async () => {
    const tmpHome5 = await fs.mkdtemp(path.join(os.tmpdir(), 'av-party-preserve-test-'));
    try {
      // Pre-populate with an existing PostToolUse hook
      await fs.mkdir(path.join(tmpHome5, '.claude'), { recursive: true });
      const existing = {
        hooks: {
          PostToolUse: [{ hooks: [{ type: 'command', command: 'bash some-other-hook.sh' }] }]
        }
      };
      await fs.writeFile(path.join(tmpHome5, '.claude', 'settings.json'), JSON.stringify(existing));

      await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome5);

      const settings = JSON.parse(await fs.readFile(path.join(tmpHome5, '.claude', 'settings.json'), 'utf8'));
      assert.strictEqual(settings.hooks.PostToolUse.length, 2,
        'Must keep existing hook and add party mode hook');

      const hasOther = settings.hooks.PostToolUse.some(e =>
        e.hooks?.some(h => h.command?.includes('some-other-hook'))
      );
      assert.ok(hasOther, 'Must preserve existing PostToolUse hook');
    } finally {
      await fs.rm(tmpHome5, { recursive: true, force: true });
    }
  });

  test('hook command type is "command"', async () => {
    const tmpHome6 = await fs.mkdtemp(path.join(os.tmpdir(), 'av-party-type-test-'));
    try {
      await configurePartyModeHook(PROJECT_ROOT, silentSpinner, tmpHome6);
      const settings = JSON.parse(await fs.readFile(path.join(tmpHome6, '.claude', 'settings.json'), 'utf8'));

      const entry = settings.hooks.PostToolUse
        .flatMap(e => e.hooks ?? [])
        .find(h => h.command?.includes('bmad-party-speak'));

      assert.strictEqual(entry.type, 'command', 'Hook type must be "command"');
    } finally {
      await fs.rm(tmpHome6, { recursive: true, force: true });
    }
  });
});
