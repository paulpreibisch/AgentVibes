/**
 * playWavWithFallback: try each WAV player until one exits cleanly, settle
 * each player once, and stop when the caller has moved on. playPreviewWav:
 * tidy up a voice preview after it.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { playWavWithFallback, playPreviewWav } from '../../src/console/audio-env.js';

const player = (bin) => ({ bin, args: (f) => [f] });

/** A spawn stand-in whose processes the test finishes by hand. */
function fakeSpawn() {
  const procs = [];
  const spawnFn = (bin, args, opts) => {
    const proc = new EventEmitter();
    Object.assign(proc, { bin, args, opts });
    procs.push(proc);
    return proc;
  };
  return { procs, spawnFn };
}

function run(players, { isCurrent = () => true } = {}) {
  const { procs, spawnFn } = fakeSpawn();
  const results = [];
  const spawned = [];
  playWavWithFallback(players, '/tmp/x.wav', {
    env: { A: '1' },
    spawnFn,
    onSpawn: (p) => spawned.push(p),
    isCurrent,
    onDone: (r) => results.push(r),
  });
  return { procs, results, spawned };
}

describe('playWavWithFallback', () => {
  test('plays with the first player that exits cleanly', () => {
    const { procs, results, spawned } = run([player('play'), player('ffplay')]);
    assert.equal(procs.length, 1);
    assert.deepEqual(procs[0].args, ['/tmp/x.wav']);
    assert.deepEqual(procs[0].opts.env, { A: '1' });
    procs[0].emit('exit', 0);
    assert.deepEqual(results, ['played']);
    assert.deepEqual(spawned, procs);
  });

  test('moves to the next player when one exits non-zero', () => {
    const { procs, results } = run([player('play'), player('ffplay')]);
    procs[0].emit('exit', 1);
    assert.equal(procs.length, 2);
    assert.equal(procs[1].bin, 'ffplay');
    procs[1].emit('exit', 0);
    assert.deepEqual(results, ['played']);
  });

  test('moves on when a player fails to start', () => {
    const { procs, results } = run([player('missing'), player('ffplay')]);
    procs[0].emit('error', new Error('ENOENT'));
    procs[1].emit('exit', 0);
    assert.deepEqual(results, ['played']);
  });

  test('advances once when a player emits both error and exit', () => {
    const { procs } = run([player('a'), player('b'), player('c')]);
    procs[0].emit('error', new Error('ENOENT'));
    procs[0].emit('exit', 1);
    assert.equal(procs.length, 2, 'only the next player starts');
  });

  test('reports failed when every player fails', () => {
    const { procs, results } = run([player('a'), player('b')]);
    procs[0].emit('exit', 1);
    procs[1].emit('exit', 1);
    assert.deepEqual(results, ['failed']);
  });

  test('reports failed at once when there are no players', () => {
    const { procs, results } = run([]);
    assert.equal(procs.length, 0);
    assert.deepEqual(results, ['failed']);
  });

  test('stops without trying more players once the caller has moved on', () => {
    let current = true;
    const { procs, results } = run([player('a'), player('b')], { isCurrent: () => current });
    current = false; // user stopped the preview; the kill makes the player exit non-zero
    procs[0].emit('exit', null);
    assert.equal(procs.length, 1);
    assert.deepEqual(results, ['cancelled']);
  });
});

describe('playPreviewWav', () => {
  /** Play a real temp file and record what the row was told. */
  function preview({ isCurrent = () => true } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-preview-'));
    const wav = path.join(dir, 'vp.wav');
    fs.writeFileSync(wav, 'RIFF');
    const { procs, spawnFn } = fakeSpawn();
    const calls = [];
    playPreviewWav(wav, {
      env: {},
      players: [player('a'), player('b')],
      spawnFn,
      isCurrent,
      release: () => calls.push('release'),
      onFailed: () => calls.push('failed'),
    });
    return { wav, procs, calls, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
  }

  test('releases the row and removes the wav after playing', () => {
    const { wav, procs, calls, cleanup } = preview();
    procs[0].emit('exit', 0);
    assert.deepEqual(calls, ['release']);
    assert.equal(fs.existsSync(wav), false);
    cleanup();
  });

  test('reports a failure when no player can play it', () => {
    const { wav, procs, calls, cleanup } = preview();
    procs[0].emit('exit', 1);
    procs[1].emit('exit', 1);
    assert.deepEqual(calls, ['release', 'failed']);
    assert.equal(fs.existsSync(wav), false);
    cleanup();
  });

  test('leaves the row to a newer preview, but still removes the wav', () => {
    let current = true;
    const { wav, procs, calls, cleanup } = preview({ isCurrent: () => current });
    current = false;
    procs[0].emit('exit', null);
    assert.deepEqual(calls, []);
    assert.equal(fs.existsSync(wav), false);
    cleanup();
  });
});
