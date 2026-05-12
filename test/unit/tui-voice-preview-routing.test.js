/**
 * Regression tests: TUI voice preview routing
 *
 * Covers two things:
 * 1. detectRemoteLlm() correctly reads transport-config.json
 * 2. Structural: preview functions in settings-tab, agents-tab, and
 *    personality-picker route through play-tts.sh (not direct piper spawn)
 *
 * Why: these functions previously spawned piper directly, bypassing the
 * per-LLM transport-config routing and preventing audio from reaching
 * remote hosts (e.g. ssh-remote → laptop-win).
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

// ──────────────────────────────────────────────────────────────────────────────
// Suite 1: detectRemoteLlm() unit tests
// ──────────────────────────────────────────────────────────────────────────────

test('detectRemoteLlm — returns first remote LLM from transport-config.json', async () => {
  const fakeHome = mkdtempSync(join(tmpdir(), 'av-detect-remote-'));
  mkdirSync(join(fakeHome, '.agentvibes'), { recursive: true });
  writeFileSync(join(fakeHome, '.agentvibes', 'transport-config.json'), JSON.stringify({
    copilot: { mode: 'local' },
    'claude-code': { mode: 'remote', host: 'laptop-win', port: '' },
    codex: { mode: 'remote', host: 'other-host', port: '' },
  }));

  try {
    process.env.HOME = fakeHome;
    const { detectRemoteLlm } = await import(`../../src/console/audio-env.js?bust=${Date.now()}`);
    const result = detectRemoteLlm();
    assert.strictEqual(result, 'claude-code', 'Should return first remote LLM key');
  } finally {
    rmSync(fakeHome, { recursive: true, force: true });
    delete process.env.HOME;
  }
});

test('detectRemoteLlm — returns null when all LLMs are local', async () => {
  const fakeHome = mkdtempSync(join(tmpdir(), 'av-detect-local-'));
  mkdirSync(join(fakeHome, '.agentvibes'), { recursive: true });
  writeFileSync(join(fakeHome, '.agentvibes', 'transport-config.json'), JSON.stringify({
    copilot: { mode: 'local' },
    'claude-code': { mode: 'local' },
  }));

  try {
    process.env.HOME = fakeHome;
    const { detectRemoteLlm } = await import(`../../src/console/audio-env.js?bust=${Date.now()}`);
    const result = detectRemoteLlm();
    assert.strictEqual(result, null, 'Should return null when no remote LLMs configured');
  } finally {
    rmSync(fakeHome, { recursive: true, force: true });
    delete process.env.HOME;
  }
});

test('detectRemoteLlm — returns null when transport-config.json is missing', async () => {
  const fakeHome = mkdtempSync(join(tmpdir(), 'av-no-config-'));
  // No .agentvibes dir — file doesn't exist

  try {
    process.env.HOME = fakeHome;
    const { detectRemoteLlm } = await import(`../../src/console/audio-env.js?bust=${Date.now()}`);
    const result = detectRemoteLlm();
    assert.strictEqual(result, null, 'Should return null when config file is missing');
  } finally {
    rmSync(fakeHome, { recursive: true, force: true });
    delete process.env.HOME;
  }
});

test('detectRemoteLlm — returns null on malformed JSON', async () => {
  const fakeHome = mkdtempSync(join(tmpdir(), 'av-bad-json-'));
  mkdirSync(join(fakeHome, '.agentvibes'), { recursive: true });
  writeFileSync(join(fakeHome, '.agentvibes', 'transport-config.json'), 'not valid json {{{');

  try {
    process.env.HOME = fakeHome;
    const { detectRemoteLlm } = await import(`../../src/console/audio-env.js?bust=${Date.now()}`);
    const result = detectRemoteLlm();
    assert.strictEqual(result, null, 'Should return null on parse error');
  } finally {
    rmSync(fakeHome, { recursive: true, force: true });
    delete process.env.HOME;
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Suite 2: Structural regression — preview functions must not spawn piper directly
//
// These tests read source files and assert the structural properties that
// ensure audio routing goes through play-tts.sh (and detectRemoteLlm)
// rather than bypassing transport config by spawning piper directly.
// ──────────────────────────────────────────────────────────────────────────────

test('settings-tab: _previewVoice must not directly spawn piper binary', () => {
  const src = readFileSync(join(PROJECT_ROOT, 'src/console/tabs/settings-tab.js'), 'utf-8');

  // Extract _previewVoice function body (from function decl to matching closing brace)
  const fnStart = src.indexOf('function _previewVoice(');
  assert.ok(fnStart !== -1, '_previewVoice function must exist in settings-tab.js');

  // Find where the function ends by counting braces from fnStart
  let depth = 0, i = fnStart, bodyStart = -1;
  while (i < src.length) {
    if (src[i] === '{') { if (depth === 0) bodyStart = i; depth++; }
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  const fnBody = src.slice(fnStart, i + 1);

  // Must NOT spawn piper binary directly
  assert.ok(
    !fnBody.includes("spawn(_piperBin") && !fnBody.includes("spawn('piper'") && !fnBody.includes('spawn("piper"'),
    '_previewVoice must not directly spawn the piper binary — route through play-tts.sh instead'
  );

  // Must reference play-tts.sh for routing
  assert.ok(
    fnBody.includes('play-tts.sh') || fnBody.includes('playTtsScript'),
    '_previewVoice must route through play-tts.sh'
  );

  // Must use detectRemoteLlm for transport-aware routing
  assert.ok(
    fnBody.includes('detectRemoteLlm') || src.includes('detectRemoteLlm'),
    'settings-tab must use detectRemoteLlm for transport-aware voice routing'
  );
});

test('agents-tab: _previewVoice must not directly spawn piper binary', () => {
  const src = readFileSync(join(PROJECT_ROOT, 'src/console/tabs/agents-tab.js'), 'utf-8');

  const fnStart = src.indexOf('function _previewVoice(');
  assert.ok(fnStart !== -1, '_previewVoice function must exist in agents-tab.js');

  let depth = 0, i = fnStart, bodyStart = -1;
  while (i < src.length) {
    if (src[i] === '{') { if (depth === 0) bodyStart = i; depth++; }
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  const fnBody = src.slice(fnStart, i + 1);

  assert.ok(
    !fnBody.includes("spawn(_piperBin") && !fnBody.includes("spawn('piper'") && !fnBody.includes('spawn("piper"'),
    '_previewVoice must not directly spawn the piper binary — route through play-tts.sh instead'
  );

  assert.ok(
    fnBody.includes('play-tts.sh') || fnBody.includes('playTtsScript') || fnBody.includes('plainScript'),
    '_previewVoice must route through play-tts.sh'
  );
});

test('agents-tab: _sampleWithFullProfile must pass --llm flag when remote LLM configured', () => {
  const src = readFileSync(join(PROJECT_ROOT, 'src/console/tabs/agents-tab.js'), 'utf-8');

  const fnStart = src.indexOf('function _sampleWithFullProfile(');
  assert.ok(fnStart !== -1, '_sampleWithFullProfile must exist in agents-tab.js');

  let depth = 0, i = fnStart;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  const fnBody = src.slice(fnStart, i + 1);

  assert.ok(
    fnBody.includes('detectRemoteLlm') || fnBody.includes('remoteLlm'),
    '_sampleWithFullProfile must detect and apply remote LLM for transport routing'
  );
  assert.ok(
    fnBody.includes('--llm'),
    '_sampleWithFullProfile must pass --llm flag to play-tts.sh'
  );
});

test('personality-picker: _speakPreview must pass --llm flag when remote LLM configured', () => {
  const src = readFileSync(join(PROJECT_ROOT, 'src/console/widgets/personality-picker.js'), 'utf-8');

  assert.ok(
    src.includes('detectRemoteLlm'),
    'personality-picker must import and use detectRemoteLlm'
  );
  assert.ok(
    src.includes('--llm'),
    'personality-picker must conditionally pass --llm flag to play-tts.sh'
  );
});

test('audio-env: detectRemoteLlm is exported', () => {
  const src = readFileSync(join(PROJECT_ROOT, 'src/console/audio-env.js'), 'utf-8');
  assert.ok(
    src.includes('export function detectRemoteLlm'),
    'detectRemoteLlm must be an exported function in audio-env.js'
  );
});
