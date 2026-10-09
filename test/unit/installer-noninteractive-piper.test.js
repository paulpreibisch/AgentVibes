/**
 * Non-interactive installs (agents, CI) must end with a provider that speaks:
 * a missing Piper is installed with the packaged installer, and on macOS a
 * failed Piper install falls back to Say instead of aborting.
 *
 * node:child_process is mocked, so no installer runs and `which piper` is
 * answered by the test.
 */
import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

let piperOnPath = false;
let piperBroken = false;
let installerSucceeds = true;
let installerCalls = [];

await mock.module('node:child_process', {
  namedExports: {
    execSync: (cmd) => {
      if (/\b(which|where)\b.*piper/.test(String(cmd)) && !piperOnPath) throw new Error('not found');
      if (/^piper --help/.test(String(cmd)) && (!piperOnPath || piperBroken)) throw new Error('dyld: Library not loaded');
      return Buffer.from('');
    },
    execFileSync: (file, args) => {
      installerCalls.push([file, args]);
      if (!installerSucceeds) throw new Error('installer failed');
      piperOnPath = true;
      piperBroken = false;
      return Buffer.from('');
    },
    spawn: () => ({ unref() {}, on() {}, kill() {}, killed: false, stdout: { on() {} }, stderr: { on() {} } }),
    spawnSync: () => ({ status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') }),
    exec: (_cmd, _opts, cb) => { if (typeof cb === 'function') cb(null, '', ''); },
  },
});

// The real inquirer pulls @inquirer/prompts, which fails to load against the
// child_process mock on Node 20. Nothing here prompts.
await mock.module('inquirer', { defaultExport: { prompt: async () => ({}) } });

const { installPiperNonInteractive, ensureNonInteractivePiper, isNonSayVoice } = await import('../../src/installer.js');

const savedEnv = {};
const quiet = () => mock.method(console, 'log', () => {});
// Native Windows installs Piper another way (checkAndInstallPiperWindows) and
// checks for it on disk, so these paths are POSIX-only.
const posixOnly = { skip: process.platform === 'win32' && 'non-interactive Piper install is POSIX-only' };

beforeEach(() => {
  for (const k of ['PATH', 'SHELL']) savedEnv[k] = process.env[k];
  process.env.SHELL = '/bin/bash';
  piperOnPath = false;
  piperBroken = false;
  installerSucceeds = true;
  installerCalls = [];
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  mock.restoreAll();
});

describe('installPiperNonInteractive', () => {
  test('runs the packaged piper-installer.sh non-interactively', posixOnly, () => {
    quiet();
    assert.equal(installPiperNonInteractive(), true);
    assert.equal(installerCalls.length, 1);
    const [file, args] = installerCalls[0];
    assert.match(file.replace(/\\/g, '/'), /\.claude\/hooks\/piper-installer\.sh$/);
    assert.deepEqual(args, ['--non-interactive']);
  });

  test('puts ~/.local/bin first on PATH so the fresh install is found', () => {
    quiet();
    const localBin = path.join(os.homedir(), '.local', 'bin');
    process.env.PATH = ['/usr/bin', '/bin'].join(path.delimiter);
    installPiperNonInteractive();
    assert.equal(process.env.PATH.split(path.delimiter)[0], localBin);
    const before = process.env.PATH;
    installPiperNonInteractive();
    assert.equal(process.env.PATH, before, 'adds ~/.local/bin only once');
  });

  test('moves ~/.local/bin ahead of a directory with a broken piper', () => {
    quiet();
    const localBin = path.join(os.homedir(), '.local', 'bin');
    process.env.PATH = ['/opt/broken-piper/bin', localBin, '/usr/bin'].join(path.delimiter);
    installPiperNonInteractive();
    assert.deepEqual(process.env.PATH.split(path.delimiter), [localBin, '/opt/broken-piper/bin', '/usr/bin']);
  });

  test('reports failure when the installer fails', () => {
    quiet();
    installerSucceeds = false;
    assert.equal(installPiperNonInteractive(), false);
  });
});

describe('ensureNonInteractivePiper', () => {
  test('keeps a provider that is not Piper without installing anything', () => {
    const config = { provider: 'macos', defaultVoice: 'Samantha' };
    assert.equal(ensureNonInteractivePiper(config, 'darwin'), 'macos');
    assert.equal(installerCalls.length, 0);
  });

  test('keeps Piper when it is already installed', () => {
    piperOnPath = true;
    const config = { provider: 'piper', defaultVoice: 'en_US-ryan-high' };
    assert.equal(ensureNonInteractivePiper(config, 'darwin'), 'piper');
    assert.equal(installerCalls.length, 0);
  });

  test('replaces a piper that is on PATH but cannot start', posixOnly, () => {
    quiet();
    piperOnPath = true;
    piperBroken = true;
    const config = { provider: 'piper', defaultVoice: 'en_US-ryan-high' };
    assert.equal(ensureNonInteractivePiper(config, 'darwin'), 'piper');
    assert.equal(installerCalls.length, 1, 'the installer ran to replace it');
  });

  test('falls back to Say when a broken piper cannot be replaced on macOS', posixOnly, () => {
    quiet();
    piperOnPath = true;
    piperBroken = true;
    installerSucceeds = false;
    const config = { provider: 'piper', defaultVoice: 'en_US-ryan-high' };
    assert.equal(ensureNonInteractivePiper(config, 'darwin'), 'macos');
  });

  test('installs a missing Piper and keeps it', posixOnly, () => {
    quiet();
    const config = { provider: 'piper', defaultVoice: 'en_US-ryan-high' };
    assert.equal(ensureNonInteractivePiper(config, 'darwin'), 'piper');
    assert.equal(installerCalls.length, 1);
    assert.equal(config.defaultVoice, 'en_US-ryan-high');
  });

  test('falls back to macOS Say when Piper cannot be installed on macOS', posixOnly, () => {
    quiet();
    installerSucceeds = false;
    const config = { provider: 'piper', defaultVoice: 'en_US-ryan-high' };
    assert.equal(ensureNonInteractivePiper(config, 'darwin'), 'macos');
    // replaceSavedVoice: a saved Piper voice would force the engine back to Piper.
    assert.deepEqual(config, { provider: 'macos', defaultVoice: 'Samantha', replaceSavedVoice: true });
  });

  test('gives up elsewhere when Piper cannot be installed', posixOnly, () => {
    quiet();
    installerSucceeds = false;
    const config = { provider: 'piper', defaultVoice: 'en_US-ryan-high' };
    assert.equal(ensureNonInteractivePiper(config, 'linux'), null);
    assert.equal(config.provider, 'piper');
  });

  test('checks piper with ~/.local/bin first, the order playback uses', posixOnly, () => {
    piperOnPath = true;
    const localBin = path.join(os.homedir(), '.local', 'bin');
    process.env.PATH = ['/opt/other/bin', localBin].join(path.delimiter);
    ensureNonInteractivePiper({ provider: 'piper', defaultVoice: 'en_US-ryan-high' }, 'darwin');
    assert.equal(process.env.PATH.split(path.delimiter)[0], localBin);
  });

  test('native Windows keeps Piper for its own installer step and never runs the POSIX one', { skip: process.platform !== 'win32' && 'native Windows only' }, () => {
    quiet();
    const config = { provider: 'piper', defaultVoice: 'en_US-ryan-high' };
    assert.equal(ensureNonInteractivePiper(config, 'win32'), 'piper', 'a fresh setup is installed later by checkAndInstallPiperWindows');
    assert.equal(installerCalls.length, 0);
  });
});

describe('isNonSayVoice', () => {
  test('flags Piper and Kokoro voices, which Say cannot speak', () => {
    for (const v of ['en_US-ryan-high', 'en_GB-alba-medium', 'fil_PH-x-low', 'af_heart', 'am_michael', 'en_US-ryan-high\n']) {
      assert.equal(isNonSayVoice(v), true, v);
    }
  });

  test('keeps Say voices and empty input', () => {
    for (const v of ['Samantha', 'Alex', 'Good News', 'Daniel (Enhanced)', '', null, undefined]) {
      assert.equal(isNonSayVoice(v), false, String(v));
    }
  });
});
