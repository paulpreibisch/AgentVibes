/**
 * Coverage for the audio-suppression helpers added so the coverage suites'
 * Space-key previews never speak aloud:
 *   __suppressAudio() — true when AGENTVIBES_SUPPRESS_AUDIO=true or the shared
 *                       ~/.agentvibes-tests-running marker exists.
 *   __silentProc()    — child_process-like stub that emits a clean exit, so the
 *                       preview lifecycle code stays covered without real audio.
 *   __spawnAudio()    — returns the silent stub while suppressed.
 *
 * AGENTVIBES_TEST_MODE=true keeps setup-tab from importing blessed.
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const { __suppressAudio, __silentProc, __spawnAudio } = await import('../../src/console/tabs/setup-tab.js');

test('__suppressAudio honors the AGENTVIBES_SUPPRESS_AUDIO env flag', () => {
  const prev = process.env.AGENTVIBES_SUPPRESS_AUDIO;
  process.env.AGENTVIBES_SUPPRESS_AUDIO = 'true';
  try {
    assert.equal(__suppressAudio(), true);
  } finally {
    if (prev === undefined) delete process.env.AGENTVIBES_SUPPRESS_AUDIO;
    else process.env.AGENTVIBES_SUPPRESS_AUDIO = prev;
  }
});

test('__suppressAudio falls back to the shared tests-running marker file', () => {
  const prev = process.env.AGENTVIBES_SUPPRESS_AUDIO;
  delete process.env.AGENTVIBES_SUPPRESS_AUDIO;
  const marker = path.join(os.homedir(), '.agentvibes-tests-running');
  const preexisting = fs.existsSync(marker);
  try {
    if (!preexisting) fs.writeFileSync(marker, '');
    assert.equal(__suppressAudio(), true, 'marker present → suppressed');
    if (!preexisting) {
      fs.unlinkSync(marker);
      assert.equal(__suppressAudio(), false, 'no env, no marker → not suppressed');
    }
  } finally {
    if (prev !== undefined) process.env.AGENTVIBES_SUPPRESS_AUDIO = prev;
    if (!preexisting) { try { fs.unlinkSync(marker); } catch {} }
  }
});

test('__silentProc emits a clean exit and exposes the child_process surface', () => {
  const proc = __silentProc();
  // Synchronous surface the preview code relies on.
  assert.equal(proc.killed, false);
  proc.stdin.write('hi');
  proc.stdin.end();
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  let errSeen = false;
  proc.once('error', () => { errSeen = true; });
  proc.emit('error');               // exercises once + emit
  assert.equal(errSeen, true);
  proc.kill();
  assert.equal(proc.killed, true);
  proc.unref();

  return new Promise((resolve) => {
    proc.on('exit', (code) => {     // exercises the deferred exit emit
      assert.equal(code, 0);
      resolve();
    });
  });
});

test('__spawnAudio returns the silent stub while suppressed (no real process)', () => {
  const prev = process.env.AGENTVIBES_SUPPRESS_AUDIO;
  process.env.AGENTVIBES_SUPPRESS_AUDIO = 'true';
  try {
    const proc = __spawnAudio('definitely-not-a-real-binary', ['--nope'], { stdio: 'ignore' });
    assert.equal(typeof proc.on, 'function');
    assert.equal(proc.killed, false);
  } finally {
    if (prev === undefined) delete process.env.AGENTVIBES_SUPPRESS_AUDIO;
    else process.env.AGENTVIBES_SUPPRESS_AUDIO = prev;
  }
});
