#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function readProjectFile(relativePath) {
  return fs.readFile(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

describe('party mode TTS instructions', () => {
  it('uses the cross-platform bmad-speak entry point in the packaged workflow steps', async () => {
    const discussionStep = await readProjectFile('.claude/skills/bmad-party-mode/steps/step-02-discussion-orchestration.md');
    const exitStep = await readProjectFile('.claude/skills/bmad-party-mode/steps/step-03-graceful-exit.md');

    assert.match(discussionStep, /node bin\/bmad-speak\.js/);
    assert.match(exitStep, /node bin\/bmad-speak\.js/);
    assert.doesNotMatch(discussionStep, /\.claude\/hooks\/bmad-speak\.sh/);
    assert.doesNotMatch(exitStep, /\.claude\/hooks\/bmad-speak\.sh/);
  });

  it('tells installer-injected party mode instructions to use sequential bmad-speak routing', async () => {
    const installerSource = await readProjectFile('src/installer.js');

    assert.match(installerSource, /node bin\/bmad-speak\.js/);
    assert.match(installerSource, /do NOT background with & and do NOT run party mode TTS in parallel/);
  });

  it('documents the same bmad-speak entry point in the Copilot party mode skill', async () => {
    const skillSource = await readProjectFile('.claude/skills/bmad-party-mode/SKILL.md');

    assert.match(skillSource, /node bin\/bmad-speak\.js/);
    assert.match(skillSource, /Each call blocks until playback completes before the next agent speaks/);
  });
});