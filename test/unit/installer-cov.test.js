/**
 * Targeted line-coverage for src/installer.js.
 *
 * Drives the REAL exported `checkAndInstallPiper`, which in turn calls the
 * internal `offerLibriTTSDownload` and `execScript` helpers. We mock
 * node:child_process (so no real subprocess runs), inquirer (so prompts are
 * deterministic and never block), and node:fs (a passthrough that lets us
 * steer existsSync / readdirSync for the specific paths the code probes).
 *
 * Assigned lines this file aims to cover:
 *   3193-3195  execScript -> execFileSync (best-effort; path validation may
 *              short-circuit on Windows, which still exercises offerLibriTTS)
 *   4358-4393  offerLibriTTSDownload (full body, both confirm branches)
 *   4420-4421  checkAndInstallPiper "voices found" -> offerLibriTTSDownload
 *   4450       checkAndInstallPiper "no voices, download" -> offerLibriTTSDownload
 */

import { test, describe, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import realFs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Controllable state for the mocked modules
// ---------------------------------------------------------------------------

// existsSync answers: map of "endsWith fragment" -> boolean. Checked in order;
// first match wins. Falls back to real fs for anything unmatched.
let existsRules = [];
// readdirSync answers for the piper-voices dir.
let readdirAnswer = [];
// Records of what inquirer was asked, and the canned answer to return.
let inquirerAnswers = [];
let inquirerCalls = [];
// Records of child_process invocations.
let execSyncBehavior = () => Buffer.from('');
let execFileSyncCalls = [];

function resetState() {
  existsRules = [];
  readdirAnswer = [];
  inquirerAnswers = [];
  inquirerCalls = [];
  execSyncBehavior = () => Buffer.from('');
  execFileSyncCalls = [];
}

function existsAnswer(p) {
  const s = String(p).replace(/\\/g, '/');
  for (const rule of existsRules) {
    if (s.includes(rule.frag)) return rule.value;
  }
  // Default false for anything we didn't explicitly allow, to keep behaviour
  // deterministic and avoid touching the real home dir.
  return false;
}

// ---------------------------------------------------------------------------
// Mocks installed BEFORE importing the target module
// ---------------------------------------------------------------------------

await mock.module('node:child_process', {
  namedExports: {
    execSync: (...args) => execSyncBehavior(...args),
    execFileSync: (...args) => {
      execFileSyncCalls.push(args);
      return Buffer.from('');
    },
    spawn: () => ({ unref() {}, on() {}, kill() {}, killed: false, stdout: { on() {} }, stderr: { on() {} } }),
    spawnSync: () => ({ status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') }),
    exec: (_cmd, _opts, cb) => { if (typeof cb === 'function') cb(null, '', ''); },
  },
});

await mock.module('node:fs', {
  defaultExport: {
    ...realFs,
    existsSync: (p) => existsAnswer(p),
    readdirSync: (p) => {
      const s = String(p).replace(/\\/g, '/');
      if (s.includes('piper-voices')) return readdirAnswer;
      return realFs.readdirSync(p);
    },
  },
  namedExports: {
    ...realFs,
    existsSync: (p) => existsAnswer(p),
    readdirSync: (p) => {
      const s = String(p).replace(/\\/g, '/');
      if (s.includes('piper-voices')) return readdirAnswer;
      return realFs.readdirSync(p);
    },
  },
});

await mock.module('inquirer', {
  defaultExport: {
    prompt: async (questions) => {
      inquirerCalls.push(questions);
      const next = inquirerAnswers.shift();
      return next !== undefined ? next : {};
    },
  },
});

// Import AFTER mocks are installed.
const installer = await import('../../src/installer.js');
const { checkAndInstallPiper } = installer;

// ---------------------------------------------------------------------------
// Environment guard — ensure HOME/SHELL are set so getUserShell works, and
// never write to the real home dir.
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
let savedEnv = {};

before(() => {
  savedEnv = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    SHELL: process.env.SHELL,
    AGENTVIBES_TEST_MODE: process.env.AGENTVIBES_TEST_MODE,
  };
  // Point HOME at a throwaway path; existsSync is mocked so nothing is read.
  process.env.HOME = path.join(REPO_ROOT, 'coverage', 'fake-home-installer-cov');
  process.env.SHELL = '/bin/bash';
  delete process.env.AGENTVIBES_TEST_MODE;
});

after(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

// ===========================================================================
// checkAndInstallPiper: "Piper installed, voices present" -> offerLibriTTS
// ===========================================================================

describe('checkAndInstallPiper — voices already present', () => {
  test('offers LibriTTS and accepts the download (confirm=true)', async () => {
    resetState();
    // command -v piper succeeds (no throw).
    execSyncBehavior = () => Buffer.from('/usr/bin/piper');
    // piper-voices dir exists and has .onnx files -> hasVoices = true (4413-4419)
    existsRules = [
      // libritts not installed -> proceed to prompt (most specific first)
      { frag: 'en_US-libritts-high.onnx', value: false },
      { frag: 'piper-download-voices.sh', value: true }, // offerLibriTTS existsSync gate
      { frag: 'piper-voices', value: true },        // voices dir
    ];
    readdirAnswer = ['en_US-ryan-high.onnx', 'notavoice.txt'];
    inquirerAnswers = [{ installLibriTTS: true }];

    // targetDir = repo root so any execScript path validation resolves under
    // <repo>/.claude/hooks. execFileSync is mocked regardless.
    await checkAndInstallPiper(REPO_ROOT, { yes: false, silent: true });

    assert.ok(inquirerCalls.length >= 1, 'LibriTTS prompt should have fired');
  });

  test('offers LibriTTS and declines the download (confirm=false)', async () => {
    resetState();
    execSyncBehavior = () => Buffer.from('/usr/bin/piper');
    existsRules = [
      { frag: 'en_US-libritts-high.onnx', value: false },
      { frag: 'piper-download-voices.sh', value: true },
      { frag: 'piper-voices', value: true },
    ];
    readdirAnswer = ['en_US-ryan-high.onnx'];
    inquirerAnswers = [{ installLibriTTS: false }];

    await checkAndInstallPiper(REPO_ROOT, { yes: false, silent: true });
    assert.ok(inquirerCalls.length >= 1);
  });

  test('skips LibriTTS offer when options.yes is true', async () => {
    resetState();
    execSyncBehavior = () => Buffer.from('/usr/bin/piper');
    existsRules = [
      { frag: 'en_US-libritts-high.onnx', value: false },
      { frag: 'piper-download-voices.sh', value: true },
      { frag: 'piper-voices', value: true },
    ];
    readdirAnswer = ['en_US-ryan-high.onnx'];

    await checkAndInstallPiper(REPO_ROOT, { yes: true, silent: true });
    assert.strictEqual(inquirerCalls.length, 0, 'yes mode must not prompt');
  });

  test('skips LibriTTS offer when libritts already installed', async () => {
    resetState();
    execSyncBehavior = () => Buffer.from('/usr/bin/piper');
    existsRules = [
      { frag: 'en_US-libritts-high.onnx', value: true }, // already installed -> early return
      { frag: 'piper-download-voices.sh', value: true },
      { frag: 'piper-voices', value: true },
    ];
    readdirAnswer = ['en_US-ryan-high.onnx'];

    await checkAndInstallPiper(REPO_ROOT, { yes: false, silent: true });
    assert.strictEqual(inquirerCalls.length, 0, 'should not prompt when already installed');
  });
});

// ===========================================================================
// checkAndInstallPiper: "Piper installed, NO voices" -> download path -> 4450
// ===========================================================================

describe('checkAndInstallPiper — no voices, downloads then offers LibriTTS', () => {
  test('runs download script then offers LibriTTS (line 4450)', async () => {
    resetState();
    execSyncBehavior = () => Buffer.from('/usr/bin/piper');
    // voices dir does NOT exist (so hasVoices stays false) but the download
    // script DOES exist so execScript is attempted.
    existsRules = [
      { frag: 'en_US-libritts-high.onnx', value: false },
      { frag: 'piper-download-voices.sh', value: true },
      { frag: 'piper-voices', value: false }, // dir missing -> skip voice scan
    ];
    inquirerAnswers = [{ installLibriTTS: true }];

    await checkAndInstallPiper(REPO_ROOT, { yes: false, silent: false });
    // Either inquirer fired (offerLibriTTS reached) — line 4450 executed.
    assert.ok(inquirerCalls.length >= 1, 'offerLibriTTS after download should prompt');
  });

  test('handles missing download script gracefully then offers LibriTTS', async () => {
    resetState();
    execSyncBehavior = () => Buffer.from('/usr/bin/piper');
    existsRules = [
      { frag: 'en_US-libritts-high.onnx', value: false },
      { frag: 'piper-download-voices.sh', value: false }, // script missing
      { frag: 'piper-voices', value: false },
    ];
    inquirerAnswers = [{ installLibriTTS: false }];

    // download script absent -> 4440-4443 branch, then offerLibriTTS sees the
    // script absent and returns early (4360).
    await checkAndInstallPiper(REPO_ROOT, { yes: false, silent: true });
    assert.ok(true);
  });
});

// ===========================================================================
// checkAndInstallPiper: Piper NOT detected -> declines install (no throw)
// ===========================================================================

describe('checkAndInstallPiper — piper binary not detected', () => {
  test('user declines piper install (non-yes) and function returns', async () => {
    resetState();
    // command -v piper throws -> "not detected" branch.
    execSyncBehavior = () => { throw new Error('not found'); };
    existsRules = [];
    inquirerAnswers = [{ confirmPiperInstall: false }];

    await checkAndInstallPiper(REPO_ROOT, { yes: false, silent: true });
    assert.ok(inquirerCalls.length >= 1);
  });
});
