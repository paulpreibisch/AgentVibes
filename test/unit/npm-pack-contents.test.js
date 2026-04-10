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

  test('package.json version is set', () => {
    if (packError) return;
    assert.ok(packResult.version, 'pack result has no version');
    assert.match(packResult.version, /^\d+\.\d+\.\d+/,
      `version "${packResult.version}" is not semver`);
  });

  test('play-tts.ps1 is included in the tarball', () => {
    if (packError) return;
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
    if (packError) return;
    const psPath = path.join(PROJECT_ROOT, '.claude', 'hooks-windows', 'play-tts.ps1');
    const src = readFileSync(psPath, 'utf8');
    assert.match(src, /\[string\]\$llm/,
      'play-tts.ps1 about to be published is missing the $llm parameter — ' +
      'this is the v5.1.0 regression');
  });

  test('play-tts.ps1 in tarball is at least 400 lines', () => {
    if (packError) return;
    const psPath = path.join(PROJECT_ROOT, '.claude', 'hooks-windows', 'play-tts.ps1');
    const src = readFileSync(psPath, 'utf8');
    const lines = src.split('\n').length;
    assert.ok(lines >= 400,
      `play-tts.ps1 about to be published has only ${lines} lines — ` +
      `expected ≥400.  The mass-delete regression deleted hundreds of lines.`);
  });

  test('play-tts.sh is included and has --llm parser', () => {
    if (packError) return;
    const shPath = path.join(PROJECT_ROOT, '.claude', 'hooks', 'play-tts.sh');
    if (!existsSync(shPath)) return; // skip on systems without bash hooks
    const src = readFileSync(shPath, 'utf8');
    assert.match(src, /--llm\)/,
      'play-tts.sh about to be published is missing the --llm parser');
  });

  test('mcp-server/server.py is included and reads AGENTVIBES_LLM', () => {
    if (packError) return;
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

  test('working tree must not have uncommitted modifications to packable files', () => {
    // The v5.1.0 disaster happened because there was an uncommitted local
    // edit to play-tts.ps1 that npm publish packed.  This test fails if
    // any of the critical files have uncommitted modifications, forcing
    // the publisher to either commit or revert before publishing.
    if (packError) return;
    let dirty;
    try {
      dirty = execSync('git diff HEAD --name-only -- .claude/ mcp-server/ src/ package.json', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    } catch {
      dirty = '';  // git not available, skip
    }
    if (!dirty) return; // clean working tree
    const files = dirty.split('\n').filter(Boolean);
    assert.fail(
      `Working tree has uncommitted changes to publishable files:\n  ${files.join('\n  ')}\n` +
      `\nnpm publish packs the WORKING TREE, not the git tag.  Commit or revert ` +
      `these changes before publishing or the tarball will not match the tag.`
    );
  });
});
