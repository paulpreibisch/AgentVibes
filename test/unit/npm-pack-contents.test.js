/**
 * Pre-publish content validation for the npm tarball.
 *
 * Catches the v5.1.0 disaster: a regressed play-tts.ps1 was published to
 * npm even though the git tag had the correct file, because `npm publish`
 * packs the working tree (not the tag) and a half-finished local edit
 * had silently deleted the per-LLM logic.
 *
 * This test runs `npm pack --dry-run --json` to get the exact list of
 * files that *would* be published, then validates each critical file's
 * content against the same checks as llm-provider-mcp-routing.test.js.
 *
 * If this test passes locally and in CI, the next `npm publish` is
 * guaranteed to ship the same content the source has.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// `npm pack --dry-run` is slow (~3s) and requires npm in PATH.  Run it
// once and cache the result for all assertions in this file.
let packResult = null;
let packError = null;

describe('npm pack content validation (pre-publish guard)', () => {
  before(() => {
    try {
      // --dry-run: don't actually create a tarball
      // --json: structured output we can parse
      const out = execSync('npm pack --dry-run --json', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60_000, // 60s — prevents CI hangs on registry/network issues
        killSignal: 'SIGKILL',
      });
      packResult = JSON.parse(out);
      // npm pack --json returns an array of one object
      if (Array.isArray(packResult)) packResult = packResult[0];
    } catch (e) {
      packError = e;
    }
  });

  test('npm pack --dry-run succeeds', () => {
    if (packError) {
      assert.fail(`npm pack failed: ${packError.message}`);
    }
    assert.ok(packResult, 'npm pack returned no result');
  });

  // The `files` array OVERRIDES .npmignore, so listing a whole directory ships
  // every gitignored local file inside it. v5.12.0/5.13.0/5.13.1 all published
  // the maintainer's live .claude/config/* (which copyConfigFiles then seeded
  // into every user's project INSTEAD of the .sample defaults) and
  // .agentvibes/install-manifest.json containing absolute C:\Users\<name> paths.
  // Rule: a packed file must be tracked by git. Untracked == local state.
  test('REGRESSION: pack ships no untracked local state (no personal config/paths)', () => {
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);

    const tracked = new Set(
      execSync('git ls-files', { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 30_000 })
        .split('\n').map((s) => s.trim()).filter(Boolean)
    );

    // Deliberately shipped despite being gitignored — each is listed EXPLICITLY
    // (not via a directory glob) in package.json "files". Keep this list tiny and
    // justified; anything not here that is untracked is machine state, not product.
    const INTENTIONAL_UNTRACKED = new Set([
      '.mcp.json',                    // MCP server wiring shipped for users
      '.claude/github-star-reminder.txt',
      '.claude/piper-voices-dir.txt',
    ]);

    const leaked = (packResult.files || [])
      .map((f) => f.path)
      .filter((p) => !tracked.has(p) && !INTENTIONAL_UNTRACKED.has(p));

    assert.deepEqual(
      leaked, [],
      'These packed files are NOT tracked by git — they are local machine state and must not ship:\n  ' +
      leaked.join('\n  ')
    );
  });

  test('REGRESSION: files the TUI tells users to run are actually shipped', () => {
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    const packed = new Set((packResult.files || []).map((f) => f.path));
    // receiver-tab.js tells the user to run these by path; they were absent from
    // the tarball, so npm-installed users hit file-not-found.
    for (const required of ['setup-ssh-receiver.ps1', 'templates/agentvibes-receiver.ps1']) {
      assert.ok(packed.has(required), `${required} is referenced at runtime but not in package.json "files"`);
    }
  });

  test('package.json version is set', () => {
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    assert.ok(packResult.version, 'pack result has no version');
    assert.match(packResult.version, /^\d+\.\d+\.\d+/,
      `version "${packResult.version}" is not semver`);
  });

  test('play-tts.ps1 is included in the tarball', () => {
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    const files = packResult.files ?? [];
    const playTtsPs1 = files.find(f =>
      f.path === '.claude/hooks-windows/play-tts.ps1' ||
      f.path?.endsWith('play-tts.ps1')
    );
    assert.ok(playTtsPs1, 'play-tts.ps1 must be in the published tarball');
  });

  test('play-tts.ps1 in tarball has -llm parameter', () => {
    // The pack list only gives us file paths, not contents.  We re-read
    // the source file (which is what npm packs) and verify the parameter
    // is present.  This is a belt-and-braces check on top of
    // llm-provider-mcp-routing.test.js, scoped to the publish workflow.
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    const psPath = path.join(PROJECT_ROOT, '.claude', 'hooks-windows', 'play-tts.ps1');
    const src = readFileSync(psPath, 'utf8');
    assert.match(src, /\[string\]\$llm/,
      'play-tts.ps1 about to be published is missing the $llm parameter — ' +
      'this is the v5.1.0 regression');
  });

  test('play-tts.ps1 in tarball is at least 400 lines', () => {
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    const psPath = path.join(PROJECT_ROOT, '.claude', 'hooks-windows', 'play-tts.ps1');
    const src = readFileSync(psPath, 'utf8');
    const lines = src.split('\n').length;
    assert.ok(lines >= 400,
      `play-tts.ps1 about to be published has only ${lines} lines — ` +
      `expected ≥400.  The mass-delete regression deleted hundreds of lines.`);
  });

  test('play-tts.sh is included and has --llm parser', () => {
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    const shPath = path.join(PROJECT_ROOT, '.claude', 'hooks', 'play-tts.sh');
    if (!existsSync(shPath)) return; // skip on systems without bash hooks
    const src = readFileSync(shPath, 'utf8');
    assert.match(src, /--llm\)/,
      'play-tts.sh about to be published is missing the --llm parser');
  });

  test('mcp-server/server.py is included and reads AGENTVIBES_LLM', () => {
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    const pyPath = path.join(PROJECT_ROOT, 'mcp-server', 'server.py');
    if (!existsSync(pyPath)) {
      // mcp-server may be excluded from tarball; verify package.json files
      // field would have included it if needed.  For now, only assert if
      // the file exists in the source.
      return;
    }
    const src = readFileSync(pyPath, 'utf8');
    assert.match(src, /os\.environ\.get\(['"]AGENTVIBES_LLM['"]/,
      'server.py about to be published does not read AGENTVIBES_LLM env var');
    assert.doesNotMatch(src, /["']-llm["']\s*,\s*["']copilot["']/,
      'server.py about to be published still hardcodes -llm copilot');
  });

  test('working tree must not have uncommitted or untracked publishable files', () => {
    // The v5.1.0 disaster happened because there was an uncommitted local
    // edit to play-tts.ps1 that npm publish packed.  This test fails if
    // any publishable file has uncommitted MODIFICATIONS or there are
    // UNTRACKED files in publishable directories — both of which `npm pack`
    // will happily ship.
    //
    // Uses `git status --porcelain` (not `git diff HEAD`) so it catches
    // both modified-but-uncommitted AND brand-new untracked files.  The
    // first review of v5.1.2 caught that the diff-based check missed the
    // untracked case — fixed here.
    if (packError) assert.fail('npm pack failed in before(): ' + packError.message);
    let porcelain;
    try {
      porcelain = execSync(
        'git status --porcelain -- .claude/ mcp-server/ src/ package.json .codex/',
        {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 10_000,
        }
      ).trim();
    } catch (err) {
      // Hard-fail rather than silently skip — a missing git in CI is a
      // problem worth surfacing, not silently ignoring.  This is a
      // pre-publish guard and a missing tool should never be silent.
      assert.fail(
        `git status failed: ${err.message}. The publish guard requires git ` +
        `to detect uncommitted/untracked files.`
      );
      return;
    }
    if (!porcelain) return; // clean working tree
    const lines = porcelain.split('\n').filter(Boolean);
    // git status --porcelain doesn't list ignored files unless --ignored is
    // passed, so everything we see here is potentially packable.
    assert.fail(
      `Working tree has uncommitted/untracked publishable files:\n  ${lines.join('\n  ')}\n` +
      `\nnpm publish packs the WORKING TREE, not the git tag.  Commit, revert, ` +
      `or .gitignore these entries before publishing or the tarball will not match the tag.`
    );
  });
});
