/**
 * Codex Integration Files Installer Tests
 *
 * Verifies copyCodexFiles installs .codex/AGENTS.md and .codex/hooks/* and,
 * per the Non-Destructive Configuration Rule (CLAUDE.md #6), never overwrites a
 * user-edited copy on a subsequent install/update — a .user.bak is saved and the
 * edit survives. Fable review finding: copyCodexFiles rewrote these from the
 * template on every run, silently destroying user edits.
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { copyCodexFiles } from '../../src/installer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

const silentSpinner = { start: () => {}, succeed: () => {}, warn: () => {}, info: () => {}, fail: () => {} };

describe('copyCodexFiles', () => {
  let tmpTarget;

  before(async () => {
    tmpTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'av-codex-test-'));
  });

  after(async () => {
    await fs.rm(tmpTarget, { recursive: true, force: true });
  });

  test('installs AGENTS.md and both init hooks', async () => {
    await copyCodexFiles(tmpTarget, silentSpinner);
    await assert.doesNotReject(fs.access(path.join(tmpTarget, '.codex', 'AGENTS.md')),
      '.codex/AGENTS.md must be installed');
    await assert.doesNotReject(fs.access(path.join(tmpTarget, '.codex', 'hooks', 'init-agentvibes.sh')),
      '.codex/hooks/init-agentvibes.sh must be installed');
    await assert.doesNotReject(fs.access(path.join(tmpTarget, '.codex', 'hooks', 'init-agentvibes.ps1')),
      '.codex/hooks/init-agentvibes.ps1 must be installed');
  });

  test('is idempotent — a second run leaves stock files identical', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'av-codex-idem-'));
    try {
      await copyCodexFiles(tmp, silentSpinner);
      const agentsPath = path.join(tmp, '.codex', 'AGENTS.md');
      const first = await fs.readFile(agentsPath, 'utf8');

      await copyCodexFiles(tmp, silentSpinner);
      const second = await fs.readFile(agentsPath, 'utf8');

      assert.strictEqual(second, first, 'Stock AGENTS.md must be byte-identical after a second run');
      // No spurious backup for an unmodified stock file.
      await assert.rejects(fs.access(`${agentsPath}.user.bak`),
        'An unmodified stock file must not produce a .user.bak');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test('does not overwrite a user-modified AGENTS.md; saves a .user.bak', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'av-codex-nondestruct-'));
    try {
      // First run installs stock files and records them in the manifest.
      await copyCodexFiles(tmp, silentSpinner);

      const agentsPath = path.join(tmp, '.codex', 'AGENTS.md');
      const userMarker = '# USER EDIT — my custom Codex instructions';
      await fs.writeFile(agentsPath, userMarker);

      // Second run must detect the divergence and preserve the edit.
      await copyCodexFiles(tmp, silentSpinner);

      const afterUpdate = await fs.readFile(agentsPath, 'utf8');
      assert.strictEqual(afterUpdate, userMarker,
        'A user-modified AGENTS.md must survive a re-run untouched');

      const backup = await fs.readFile(`${agentsPath}.user.bak`, 'utf8');
      assert.strictEqual(backup, userMarker,
        'The user edit must be preserved in a .user.bak sidecar');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test('does not overwrite a user-modified Codex hook script', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'av-codex-hook-nondestruct-'));
    try {
      await copyCodexFiles(tmp, silentSpinner);

      const hookPath = path.join(tmp, '.codex', 'hooks', 'init-agentvibes.sh');
      const userMarker = '#!/bin/bash\n# USER EDIT\n';
      await fs.writeFile(hookPath, userMarker);

      await copyCodexFiles(tmp, silentSpinner);

      const afterUpdate = await fs.readFile(hookPath, 'utf8');
      assert.strictEqual(afterUpdate, userMarker,
        'A user-modified Codex hook must survive a re-run untouched');
      await assert.doesNotReject(fs.access(`${hookPath}.user.bak`),
        'The user edit must be backed up to a .user.bak sidecar');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
