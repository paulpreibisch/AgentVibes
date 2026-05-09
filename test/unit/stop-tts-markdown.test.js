/**
 * Tests for stop-tts.sh markdown stripping and updateGlobalHooks installer fix
 * GH #141: installed global hook missing markdown strip — says 'asterisk asterisk'
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { updateGlobalHooks, CRITICAL_HOOKS } from '../../src/installer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOOKS_SRC_DIR = path.join(__dirname, '../../.claude/hooks');

// ── Inline the same markdown stripping logic from stop-tts.sh for unit testing ──
function stripMarkdown(msg) {
  const stripped = msg
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/`[^`]*`/g, '').replace(/`/g, '')
    .replace(/#+\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return stripped.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('stop-tts.sh markdown stripping', () => {
  test('strips double asterisks (bold)', () => {
    assert.equal(stripMarkdown('**bold text**'), 'bold text');
  });

  test('strips single asterisks (italic)', () => {
    assert.equal(stripMarkdown('*italic*'), 'italic');
  });

  test('strips backtick code spans', () => {
    assert.equal(stripMarkdown('`code`'), '');
  });

  test('strips inline code with content', () => {
    // backtick content removed; whitespace normalized → single space between words
    assert.equal(stripMarkdown('use `npm install` to install'), 'use to install');
  });

  test('strips heading markers', () => {
    assert.equal(stripMarkdown('## Heading'), 'Heading');
    assert.equal(stripMarkdown('### Sub'), 'Sub');
  });

  test('converts markdown links to text only', () => {
    assert.equal(stripMarkdown('[click here](https://example.com)'), 'click here');
  });

  test('handles glob patterns without saying asterisk', () => {
    const result = stripMarkdown('Watch `**/node_modules/**` and `**/.claude/audio/**`');
    assert.ok(!result.includes('*'), `Should not contain asterisk, got: "${result}"`);
  });

  test('handles mixed bold + code', () => {
    const result = stripMarkdown('**`AgentVibesPrivate.code-workspace`** — added `files.watcherExclude`');
    assert.ok(!result.includes('*'), `Should not contain asterisk, got: "${result}"`);
    assert.ok(result.includes('added'), 'Should keep prose text');
  });

  test('no asterisks in bold+glob response pattern (GH #141 regression)', () => {
    const input = '**`files.watcherExclude`** — added `**/node_modules/**`, `**/coverage/**`';
    const result = stripMarkdown(input);
    assert.ok(!result.includes('*'), `Asterisk found in: "${result}"`);
  });

  test('collapses whitespace', () => {
    const result = stripMarkdown('Done.\n\nSummary:\n- item one\n- item two');
    assert.ok(!result.includes('\n'), 'Should not contain newlines');
  });

  test('empty string returns empty', () => {
    assert.equal(stripMarkdown(''), '');
  });

  test('plain text passes through unchanged', () => {
    assert.equal(stripMarkdown('No markdown here'), 'No markdown here');
  });
});

describe('updateGlobalHooks', () => {
  let tmpGlobalDir;
  let tmpSrcDir;

  before(async () => {
    // Create a fake global ~/.claude/hooks dir with an old stop-tts.sh
    // updateGlobalHooks resolves: homeDirOverride + '/.claude/hooks'
    tmpGlobalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'av-test-global-'));
    await fs.mkdir(path.join(tmpGlobalDir, '.claude', 'hooks'), { recursive: true });
    await fs.writeFile(path.join(tmpGlobalDir, '.claude', 'hooks', 'stop-tts.sh'), '#!/bin/bash\n# OLD VERSION\n');

    // Create a fake src hooks dir with updated stop-tts.sh
    tmpSrcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'av-test-src-'));
    await fs.writeFile(path.join(tmpSrcDir, 'stop-tts.sh'), '#!/bin/bash\n# NEW VERSION with markdown strip\n');
    await fs.writeFile(path.join(tmpSrcDir, 'play-tts.sh'), '#!/bin/bash\n# play-tts new\n');
  });

  after(async () => {
    await fs.rm(tmpGlobalDir, { recursive: true, force: true });
    await fs.rm(tmpSrcDir, { recursive: true, force: true });
  });

  test('CRITICAL_HOOKS includes stop-tts.sh', () => {
    assert.ok(CRITICAL_HOOKS.includes('stop-tts.sh'), 'stop-tts.sh must be in CRITICAL_HOOKS');
  });

  test('updates existing hook files in global dir', async () => {
    const count = await updateGlobalHooks(tmpSrcDir, tmpGlobalDir);
    assert.ok(count >= 1, `Expected at least 1 update, got ${count}`);

    const content = await fs.readFile(path.join(tmpGlobalDir, '.claude', 'hooks', 'stop-tts.sh'), 'utf8');
    assert.ok(content.includes('NEW VERSION'), 'stop-tts.sh should be updated to new version');
  });

  test('creates hooks in global dir even if they did not exist before', async () => {
    // updateGlobalHooks now always ensures all CRITICAL_HOOKS are present
    await updateGlobalHooks(tmpSrcDir, tmpGlobalDir);
    let exists = false;
    try {
      await fs.access(path.join(tmpGlobalDir, '.claude', 'hooks', 'play-tts.sh'));
      exists = true;
    } catch { /* not expected */ }
    assert.equal(exists, true, 'Should create hooks in global dir so $HOME hook paths resolve');
  });

  test('creates global hooks dir when it does not exist', async () => {
    const freshHomeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'av-fresh-home-'));
    try {
      const count = await updateGlobalHooks(tmpSrcDir, freshHomeDir);
      assert.ok(count >= 1, `Should create hooks in a fresh home dir, got count=${count}`);
      // The dir must now exist
      await fs.access(path.join(freshHomeDir, '.claude', 'hooks'));
    } finally {
      await fs.rm(freshHomeDir, { recursive: true, force: true });
    }
  });
});

describe('stop-tts.sh source file has markdown stripping', () => {
  test('source hook contains strip logic (regression guard)', async () => {
    const hookPath = path.join(HOOKS_SRC_DIR, 'stop-tts.sh');
    const content = await fs.readFile(hookPath, 'utf8');
    assert.ok(
      content.includes('.replace(/\\*\\*/g'),
      'stop-tts.sh source must contain double-asterisk replace'
    );
    assert.ok(
      content.includes('asterisk asterisk') || content.includes('Strip markdown'),
      'stop-tts.sh should have a comment explaining why markdown is stripped'
    );
  });
});
