/**
 * File: test/unit/installer-exec-script.test.js
 *
 * AgentVibes - Finally, your AI Agents can Talk Back!
 * Repository: https://github.com/paulpreibisch/AgentVibes
 *
 * REGRESSION: execScript()'s path allow-list used to permit ONLY the package's
 * own .claude/hooks. Every install caller passes a path under the TARGET project
 * (targetDir/.claude/hooks/piper-installer.sh), and under npx/global installs the
 * package dir is never the target dir — so the check threw for every real user.
 * Each caller swallowed it and printed "Piper installation failed or was
 * cancelled", blaming a script that was never executed. It shipped in 51
 * releases because it only works in a linked dev checkout (package === target),
 * and the one existing test pinned targetDir to the repo root — accommodating the
 * bug rather than catching it.
 *
 * These tests use a target dir that is NOT the package dir, like a real install.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execScript } from '../../src/installer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const isWindows = process.platform === 'win32';

async function makeFakeInstall() {
  // A target dir that is NOT the package dir — i.e. every real npx/global install.
  const target = await fs.mkdtemp(path.join(os.tmpdir(), 'av-target-'));
  const hooks = path.join(target, '.claude', 'hooks');
  await fs.mkdir(hooks, { recursive: true });
  const script = path.join(hooks, 'fake-installer.sh');
  await fs.writeFile(script, '#!/usr/bin/env bash\necho ran-ok\n');
  await fs.chmod(script, 0o755);
  return { target, hooks, script };
}

describe('execScript() path allow-list', () => {
  test('REGRESSION: a target-project hook is permitted when its dir is allowed', async () => {
    const { target, hooks, script } = await makeFakeInstall();
    try {
      assert.notEqual(
        path.resolve(hooks), path.resolve(PROJECT_ROOT, '.claude', 'hooks'),
        'precondition: the target hooks dir must differ from the package one'
      );
      // Must not throw "Script path outside allowed directories". On Windows there
      // is no bash to exec, so tolerate a spawn error — the point is the ALLOW-LIST
      // decision, which happens before execFileSync.
      try {
        execScript(`${script} --non-interactive`, {
          stdio: 'pipe',
          allowedDirs: [hooks],
        });
      } catch (err) {
        assert.ok(
          !/outside allowed directories/.test(err.message),
          `path validation rejected a legitimate target-project script: ${err.message}`
        );
      }
    } finally {
      await fs.rm(target, { recursive: true, force: true });
    }
  });

  test('REGRESSION: without allowedDirs, a target-project path is still rejected (allow-list intact)', async () => {
    const { target, script } = await makeFakeInstall();
    try {
      assert.throws(
        () => execScript(script, { stdio: 'pipe' }),
        /outside allowed directories/,
        'the allow-list must still reject paths no caller vouched for'
      );
    } finally {
      await fs.rm(target, { recursive: true, force: true });
    }
  });

  test('REGRESSION: a Windows-style path is not rejected for containing backslashes', { skip: !isWindows }, async () => {
    const { target, hooks, script } = await makeFakeInstall();
    try {
      assert.ok(script.includes('\\'), 'precondition: path should contain backslashes on win32');
      try {
        execScript(script, { stdio: 'pipe', allowedDirs: [hooks] });
      } catch (err) {
        assert.ok(
          !/Invalid characters in script path/.test(err.message),
          `backslash in a Windows path must not be treated as a shell metacharacter ` +
          `(execFileSync runs with shell:false): ${err.message}`
        );
      }
    } finally {
      await fs.rm(target, { recursive: true, force: true });
    }
  });

  test('traversal outside every allowed dir is still refused', async () => {
    const { target, hooks } = await makeFakeInstall();
    try {
      const evil = path.join(hooks, '..', '..', '..', 'evil.sh');
      assert.throws(
        () => execScript(evil, { stdio: 'pipe', allowedDirs: [hooks] }),
        /outside allowed directories/,
        'a ../ escape from an allowed dir must be refused'
      );
    } finally {
      await fs.rm(target, { recursive: true, force: true });
    }
  });

  test('the CLI subcommand points at a bin script that exists', async () => {
    // 'bin/mcp-server' (no extension) never existed; bin/ has mcp-server.sh/.js.
    const src = await fs.readFile(path.join(PROJECT_ROOT, 'src', 'installer.js'), 'utf8');
    const m = src.match(/const mcpServerScript = path\.join\(__dirname, '\.\.', 'bin', '([^']+)'\)/);
    assert.ok(m, 'could not find the mcpServerScript path construction');
    await fs.access(path.join(PROJECT_ROOT, 'bin', m[1]));
  });
});
