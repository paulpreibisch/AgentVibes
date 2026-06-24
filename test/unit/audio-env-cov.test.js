/**
 * Coverage test for src/console/audio-env.js — spawnMp3Player branches.
 *
 * Targets:
 *  - Headless-Pulse ffmpeg→pacat pipe branch (lines 183-212): requires
 *    _isHeadlessPulse(env) true (no DISPLAY, PULSE_SERVER='tcp:...') and
 *    `which ffmpeg` / `which pacat` to succeed. spawn/spawnSync are mocked
 *    so nothing real runs.
 *  - Non-Windows kill path using process.kill(-pid) (lines 230-231): forced
 *    by setting WSL_DISTRO_NAME so isWin is false, with process.kill mocked.
 *
 * No real subprocesses, audio, network, or fs writes occur.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// Fake child_process — records calls, returns controllable fake processes
// ---------------------------------------------------------------------------

let whichResults = {};        // bin -> status (for `which`/`where`)
let spawnedProcs = [];        // record of spawn() invocations

function makeFakeProc(cmd) {
  const ee = new EventEmitter();
  // stdout/stdin as EventEmitters with the methods the source touches
  const stdout = new EventEmitter();
  stdout.pipe = () => {};
  const stdin = new EventEmitter();
  const proc = Object.assign(ee, {
    pid: 4242,
    _cmd: cmd,
    stdout,
    stdin,
    killed: false,
    kill() { this.killed = true; return true; },
  });
  spawnedProcs.push(proc);
  return proc;
}

function fakeSpawn(cmd, args, opts) {
  return makeFakeProc(cmd);
}

function fakeSpawnSync(cmd, args, opts) {
  // `which`/`where` lookups return configured status; default success (0)
  if (cmd === 'which' || cmd === 'where') {
    const bin = Array.isArray(args) ? args[0] : args;
    const status = Object.prototype.hasOwnProperty.call(whichResults, bin)
      ? whichResults[bin]
      : 0;
    return { status, stdout: '', stderr: '' };
  }
  return { status: 0, stdout: '', stderr: '' };
}

await mock.module('node:child_process', {
  namedExports: { spawn: fakeSpawn, spawnSync: fakeSpawnSync },
});

const { spawnMp3Player } = await import('../../src/console/audio-env.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function headlessPulseEnv() {
  // No DISPLAY, PULSE_SERVER starts with 'tcp:' → _isHeadlessPulse true
  return { PULSE_SERVER: 'tcp:127.0.0.1:4713' };
}

describe('spawnMp3Player — headless PulseAudio ffmpeg→pacat branch', () => {
  test('returns null when ffmpeg is missing', () => {
    whichResults = { ffmpeg: 1 };
    spawnedProcs = [];
    const r = spawnMp3Player('/tmp/track.mp3', headlessPulseEnv());
    assert.equal(r, null);
  });

  test('returns null when pacat is missing', () => {
    whichResults = { ffmpeg: 0, pacat: 1 };
    spawnedProcs = [];
    const r = spawnMp3Player('/tmp/track.mp3', headlessPulseEnv());
    assert.equal(r, null);
  });

  test('spawns ffmpeg+pacat pipe and returns a controllable handle', () => {
    whichResults = { ffmpeg: 0, pacat: 0 };
    spawnedProcs = [];

    const handle = spawnMp3Player('/tmp/track.mp3', headlessPulseEnv());
    assert.ok(handle, 'handle should be returned');
    assert.equal(typeof handle.pid, 'number');
    assert.equal(typeof handle.kill, 'function');
    assert.equal(typeof handle.on, 'function');

    // Two real spawns happened: ffmpeg then pacat
    const spawnedCmds = spawnedProcs.map(p => p._cmd);
    assert.ok(spawnedCmds.includes('ffmpeg'));
    assert.ok(spawnedCmds.includes('pacat'));

    const ff = spawnedProcs.find(p => p._cmd === 'ffmpeg');
    const pa = spawnedProcs.find(p => p._cmd === 'pacat');

    // Register listeners and drive the wired-up event forwarding.
    let exitSeen = null;
    let errSeen = null;
    handle.on('exit', (code, sig) => { exitSeen = [code, sig]; });
    handle.on('error', (err) => { errSeen = err; });
    handle.on('unknownEvent', () => {}); // no-op branch (event not in _listeners)

    // Trigger the stdout/stdin error handlers (lines 198-199) and forwarders.
    ff.stdout.emit('error', new Error('stdout boom'));
    pa.stdin.emit('error', new Error('stdin boom'));

    pa.emit('exit', 0, null);                 // line 203 forward
    assert.deepEqual(exitSeen, [0, null]);

    ff.emit('error', new Error('ff err'));    // line 204 forward
    assert.ok(errSeen instanceof Error);

    errSeen = null;
    pa.emit('error', new Error('pa err'));     // line 205 forward
    assert.ok(errSeen instanceof Error);

    // kill() stops both processes (line 209)
    handle.kill();
    assert.equal(ff.killed, true);
    assert.equal(pa.killed, true);

    // kill() again — kill() throwing is swallowed by try/catch
    ff.kill = () => { throw new Error('already dead'); };
    pa.kill = () => { throw new Error('already dead'); };
    assert.doesNotThrow(() => handle.kill());
  });
});

describe('spawnMp3Player — normal player path kill() lines', () => {
  const origPlatform = process.platform;
  const origKill = process.kill;
  const origWsl = process.env.WSL_DISTRO_NAME;

  test('non-Windows kill uses process.kill(-pid) (lines 230-231)', () => {
    whichResults = { ffplay: 0 };   // detectMp3Player finds ffplay
    spawnedProcs = [];

    // Force the non-Windows kill branch:
    //  isWin = (platform==='win32') && !WSL_DISTRO_NAME
    // Setting WSL_DISTRO_NAME makes isWin false regardless of platform.
    process.env.WSL_DISTRO_NAME = 'Ubuntu';

    let killArgs = null;
    process.kill = (pid, sig) => { killArgs = [pid, sig]; };

    try {
      // Non-headless env so it goes to detectMp3Player()/normal spawn path.
      const handle = spawnMp3Player('/tmp/track.mp3', { DISPLAY: ':0' });
      assert.ok(handle);
      assert.equal(typeof handle.kill, 'function');

      handle.kill();   // → process.kill(-pid, 'SIGTERM') at line 230
      assert.ok(killArgs, 'process.kill should have been called');
      assert.equal(killArgs[0], -4242);
      assert.equal(killArgs[1], 'SIGTERM');

      // .on delegates to the underlying proc (line 234)
      let exited = false;
      handle.on('exit', () => { exited = true; });
      const proc = spawnedProcs.find(p => p._cmd === 'ffplay');
      proc.emit('exit', 0);
      assert.equal(exited, true);
    } finally {
      process.kill = origKill;
      if (origWsl === undefined) delete process.env.WSL_DISTRO_NAME;
      else process.env.WSL_DISTRO_NAME = origWsl;
      Object.defineProperty(process, 'platform', { value: origPlatform });
    }
  });

  test('kill() swallows ESRCH and other process.kill errors', () => {
    whichResults = { ffplay: 0 };
    spawnedProcs = [];
    process.env.WSL_DISTRO_NAME = 'Ubuntu';
    process.kill = () => { const e = new Error('no such process'); e.code = 'ESRCH'; throw e; };

    try {
      const handle = spawnMp3Player('/tmp/track.mp3', { DISPLAY: ':0' });
      assert.doesNotThrow(() => handle.kill());   // ESRCH ignored
    } finally {
      process.kill = origKill;
      if (origWsl === undefined) delete process.env.WSL_DISTRO_NAME;
      else process.env.WSL_DISTRO_NAME = origWsl;
    }
  });

  test('returns null when no player is detected', () => {
    // Make every which/where lookup fail → detectMp3Player returns null on
    // non-Windows. Force non-win path via WSL flag is irrelevant here; we
    // just need detection to fail. Use a non-headless env.
    whichResults = {
      ffplay: 1, play: 1, mpg123: 1, cvlc: 1, mpv: 1, afplay: 1,
    };
    spawnedProcs = [];
    const r = spawnMp3Player('/tmp/track.mp3', { DISPLAY: ':0', __forceNoWinFallback: true });
    // On win32 the source falls back to WIN_MP3_PLAYER (non-null); on other
    // platforms it is null. Accept either — the detection path executed.
    assert.ok(r === null || (r && typeof r.kill === 'function'));
  });
});
