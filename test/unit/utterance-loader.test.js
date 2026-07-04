#!/usr/bin/env node

/**
 * Story AVI-S8.5 Stage 2 — Utterance Loader tests.
 *
 * The loader reads real config files (per-LLM rows, .txt tiers, agent profiles,
 * env) and maps them onto the resolver's input bag. These tests drive it with
 * hermetic temp dirs + fake envs and assert the RESOLVED PLAN, proving the
 * file→plan path end-to-end. Plus a CLI smoke test through bin/resolve-utterance.js.
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { gatherInputs, resolveLlmKey, parseLlmRow } from '../../src/services/utterance-loader.js';
import { resolveUtterance } from '../../src/services/utterance-resolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

let root;   // sandbox: contains project/ and home/
before(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-loader-')); });
after(() => { fs.rmSync(root, { recursive: true, force: true }); });

/** Build an isolated project+home pair with the given config files. */
function scaffold(name, { proj = {}, home = {} } = {}) {
  const projectDir = path.join(root, name, 'project');
  const homeDir = path.join(root, name, 'home');
  const write = (base, rel, content) => {
    const p = path.join(base, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  };
  // ensure .claude exists so project-dir resolution anchors here
  fs.mkdirSync(path.join(projectDir, '.claude', 'config'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.claude', 'config'), { recursive: true });
  for (const [rel, content] of Object.entries(proj)) write(projectDir, rel, content);
  for (const [rel, content] of Object.entries(home)) write(homeDir, rel, content);
  return { projectDir, homeDir };
}

const planFrom = (ctx) => resolveUtterance(gatherInputs(ctx));

describe('LLM key resolution', () => {
  test('--llm value wins', () => {
    assert.equal(resolveLlmKey({ llm: 'claude-code', env: {} }), 'llm:claude-code');
  });
  test('CLAUDECODE=1 → claude-code', () => {
    assert.equal(resolveLlmKey({ env: { CLAUDECODE: '1' } }), 'llm:claude-code');
  });
  test('nothing → llm:default', () => {
    assert.equal(resolveLlmKey({ env: {} }), 'llm:default');
  });
  test('injection-shaped llm is rejected → default', () => {
    assert.equal(resolveLlmKey({ llm: 'bad;rm -rf', env: {} }), 'llm:default');
  });
});

describe('per-LLM row parsing (7-column audio-effects.cfg)', () => {
  test('finds the row and splits columns', () => {
    const { projectDir } = scaffold('row', {
      proj: { '.claude/config/audio-effects.cfg':
        'llm:default|off|x.mp3|0.2|af_default||piper\nllm:claude-code|light|salsa.mp3|0.05|af_bella|Yo,|kokoro\n' },
    });
    const row = parseLlmRow([path.join(projectDir, '.claude/config/audio-effects.cfg')], 'llm:claude-code');
    assert.equal(row.reverb, 'light');
    assert.equal(row.bgFile, 'salsa.mp3');
    assert.equal(row.bgVolume, '0.05');
    assert.equal(row.voice, 'af_bella');
    assert.equal(row.pretext, 'Yo,');
    assert.equal(row.engine, 'kokoro');
  });
});

describe('R1 — a kokoro voice in the per-LLM row forces kokoro (file → plan)', () => {
  test('af_bella row → engine kokoro even with piper provider file', () => {
    const { projectDir, homeDir } = scaffold('r1', {
      proj: {
        '.claude/config/audio-effects.cfg': 'llm:claude-code|off|||af_bella||piper\n',
        '.claude/tts-provider.txt': 'piper',
      },
    });
    const p = planFrom({ text: 'hi', llm: 'claude-code', homeDir, projectDir, env: {} });
    assert.equal(p.voice, 'af_bella');
    assert.equal(p.engine, 'kokoro'); // voice coupling beat the piper provider file
  });
});

describe('R2 — per-LLM voice wins over an LLM-echoed explicit voice (default source)', () => {
  test('row voice beats echoed explicit', () => {
    const { projectDir, homeDir } = scaffold('r2', {
      proj: { '.claude/config/audio-effects.cfg': 'llm:claude-code|off|||af_bella||\n' },
    });
    // default voiceSource is llm-echo
    const p = planFrom({ text: 'hi', llm: 'claude-code', voice: 'af_sarah', homeDir, projectDir, env: {} });
    assert.equal(p.voice, 'af_bella');
  });
  test('a user-explicit voice wins over the row', () => {
    const { projectDir, homeDir } = scaffold('r2b', {
      proj: { '.claude/config/audio-effects.cfg': 'llm:claude-code|off|||af_bella||\n' },
    });
    const p = planFrom({ text: 'hi', llm: 'claude-code', voice: 'af_sarah', voiceSource: 'user-explicit', homeDir, projectDir, env: {} });
    assert.equal(p.voice, 'af_sarah');
  });
});

describe('R8 — no volume anywhere → 0.20', () => {
  test('global music on, no volume file → 0.20', () => {
    const { projectDir, homeDir } = scaffold('r8', {
      proj: { '.claude/config/background-music-enabled.txt': 'true' },
    });
    const p = planFrom({ text: 'hi', homeDir, projectDir, env: {} });
    assert.equal(p.music.enabled, true);
    assert.equal(p.music.volume, 0.20);
  });
});

describe('R10 — per-agent profile enables music over global off', () => {
  test('agent profile enabled=true, global off → music plays', () => {
    const { projectDir, homeDir } = scaffold('r10', {
      proj: {
        '.claude/config/background-music-enabled.txt': 'false',
        '.agentvibes/bmad-voice-map.json': JSON.stringify({
          Amelia: { backgroundMusic: { enabled: true, track: 'bossa.mp3', volume: 30 } },
        }),
      },
    });
    const p = planFrom({ text: 'hi', homeDir, projectDir, env: { AGENTVIBES_AGENT_NAME: 'Amelia' } });
    assert.equal(p.music.enabled, true);
    assert.equal(p.music.track, 'bossa.mp3');
    assert.equal(p.music.volume, 0.30); // profile percent 30 → 0.30
  });
});

describe('R17 — 3-level mute from marker files', () => {
  test('global mute marker → muted', () => {
    const { projectDir, homeDir } = scaffold('mute', { home: { '.agentvibes-muted': '' } });
    assert.equal(planFrom({ text: 'hi', homeDir, projectDir, env: {} }).mute, true);
  });
  test('project unmute overrides global mute', () => {
    const { projectDir, homeDir } = scaffold('unmute', {
      home: { '.agentvibes-muted': '' },
      proj: { '.claude/agentvibes-unmuted': '' },
    });
    assert.equal(planFrom({ text: 'hi', homeDir, projectDir, env: {} }).mute, false);
  });
});

describe('R11 — no-play flag from either spelling', () => {
  test('NO_PLAY env → noPlayback', () => {
    const { projectDir, homeDir } = scaffold('np1');
    assert.equal(planFrom({ text: 'hi', homeDir, projectDir, env: { AGENTVIBES_NO_PLAY: '1' } }).noPlayback, true);
  });
  test('NO_PLAYBACK env → noPlayback', () => {
    const { projectDir, homeDir } = scaffold('np2');
    assert.equal(planFrom({ text: 'hi', homeDir, projectDir, env: { AGENTVIBES_NO_PLAYBACK: '1' } }).noPlayback, true);
  });
});

describe('pretext + reverb from the per-LLM row', () => {
  test('row pretext and reverb flow into the plan', () => {
    const { projectDir, homeDir } = scaffold('px', {
      proj: { '.claude/config/audio-effects.cfg': 'llm:claude-code|cathedral|||af_bella|Heads up,|kokoro\n' },
    });
    const p = planFrom({ text: 'hi', llm: 'claude-code', homeDir, projectDir, env: {} });
    assert.equal(p.pretext, 'Heads up,');
    assert.equal(p.reverb, 'cathedral');
  });
});

describe('CLI — bin/resolve-utterance.js emits a valid JSON plan on stdout', () => {
  test('smoke: prints parseable plan, nothing else on stdout', () => {
    const { projectDir } = scaffold('cli', {
      proj: { '.claude/config/audio-effects.cfg': 'llm:claude-code|off|||af_bella||\n' },
    });
    const out = execFileSync(process.execPath, [
      path.join(repoRoot, 'bin', 'resolve-utterance.js'),
      '--text', 'hello world',
      '--llm', 'claude-code',
      '--project-dir', projectDir,
    ], { encoding: 'utf8', env: { ...process.env, AGENTVIBES_NO_PLAYBACK: '1' } });
    const plan = JSON.parse(out.trim());
    assert.equal(plan.text, 'hello world');
    assert.equal(plan.voice, 'af_bella');
    assert.equal(plan.engine, 'kokoro');
    assert.equal(plan.noPlayback, true);
    assert.equal(plan.llmKey, 'llm:claude-code');
  });
});
