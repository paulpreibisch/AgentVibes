/**
 * Spawn-mocked tests for getAudioDuration() robustness fixes.
 *
 * Covers the hardening added after the timer/process leak hunt:
 *   - the `which ffprobe` spawn now has an 'error' listener, so a spawn failure
 *     (e.g. `which` absent on Windows) degrades gracefully instead of throwing
 *     an unhandled error that crashes the caller;
 *   - both the `which` check and the `ffprobe` read are bounded by timeouts so a
 *     stalled child can never leave the returned promise pending forever;
 *   - the resolve is guarded so racing close/error/timeout events settle once.
 *
 * child_process.spawn is fully mocked — no real subprocess is ever launched.
 * A real temp file backs fs.existsSync so only spawn behaviour is under test.
 *
 * Requires --experimental-test-module-mocks (the suite already passes it).
 *
 * @module test/unit/audio-duration-validator-spawn
 */

import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Controllable fake child_process
// ---------------------------------------------------------------------------
let spawned = [];

function makeFakeChild(cmd) {
  const child = new EventEmitter();
  child._cmd = cmd;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.kill = function () { this.killed = true; return true; };
  spawned.push(child);
  return child;
}

function fakeSpawn(cmd) {
  return makeFakeChild(cmd);
}

await mock.module('node:child_process', {
  namedExports: { spawn: fakeSpawn },
});

const { getAudioDuration } = await import('../../src/utils/audio-duration-validator.js');

// A real file so the fs.existsSync() guard passes and execution reaches spawn.
let realFile;
beforeEach(() => {
  spawned = [];
  realFile = path.join(os.tmpdir(), `av-dur-spawn-${process.pid}.mp3`);
  fs.writeFileSync(realFile, Buffer.alloc(64, 0));
});

const childFor = (cmd) => spawned.find((c) => c._cmd === cmd);

describe('getAudioDuration() — spawn error handling', () => {
  test('a `which` spawn error resolves gracefully instead of throwing', async () => {
    const p = getAudioDuration(realFile);
    // Before the fix there was no 'error' listener on the `which` child, so this
    // emit would throw an unhandled error and crash the caller.
    childFor('which').emit('error', new Error('spawn which ENOENT'));
    const result = await p;
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.duration, null);
    assert.match(result.error, /ffprobe/i);
  });

  test('a `which` non-zero exit reports ffprobe not found', async () => {
    const p = getAudioDuration(realFile);
    childFor('which').emit('close', 1);
    const result = await p;
    assert.strictEqual(result.success, false);
    assert.match(result.error, /ffprobe not found/i);
  });

  test('a successful ffprobe read parses the duration', async () => {
    const p = getAudioDuration(realFile);
    childFor('which').emit('close', 0);          // ffprobe is available
    const ff = childFor('ffprobe');
    ff.stdout.emit('data', Buffer.from('45.5\n'));
    ff.emit('close', 0);
    const result = await p;
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.duration, 45.5);
    assert.strictEqual(result.error, null);
  });

  test('an ffprobe spawn error resolves gracefully', async () => {
    const p = getAudioDuration(realFile);
    childFor('which').emit('close', 0);
    childFor('ffprobe').emit('error', new Error('boom'));
    const result = await p;
    assert.strictEqual(result.success, false);
    assert.match(result.error, /ffprobe/i);
  });

  test('a non-zero ffprobe exit surfaces the stderr text', async () => {
    const p = getAudioDuration(realFile);
    childFor('which').emit('close', 0);
    const ff = childFor('ffprobe');
    ff.stderr.emit('data', Buffer.from('bad file'));
    ff.emit('close', 3);
    const result = await p;
    assert.strictEqual(result.success, false);
    assert.match(result.error, /code 3/);
    assert.match(result.error, /bad file/);
  });

  test('a late close after an error does not double-resolve (settled guard)', async () => {
    const p = getAudioDuration(realFile);
    const w = childFor('which');
    w.emit('error', new Error('spawn which ENOENT'));   // first resolve
    w.emit('close', 0);                                  // must be ignored
    const result = await p;
    // The error result (not a ffprobe spawn) must win; a second spawn must NOT
    // have happened because the close handler short-circuits on `settled`.
    assert.strictEqual(result.success, false);
    assert.strictEqual(childFor('ffprobe'), undefined, 'no ffprobe spawn after settle');
  });
});

describe('getAudioDuration() — timeouts', () => {
  test('a stalled `which` check times out and kills the child', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const p = getAudioDuration(realFile);
    const w = childFor('which');
    assert.strictEqual(w.killed, false);
    t.mock.timers.tick(5000);                 // fire the 5s check timeout
    const result = await p;
    assert.strictEqual(result.success, false);
    assert.match(result.error, /timed out/i);
    assert.strictEqual(w.killed, true, 'the stalled child must be killed');
  });

  test('a stalled ffprobe read times out and kills the child', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const p = getAudioDuration(realFile);
    childFor('which').emit('close', 0);       // reach the ffprobe stage
    const ff = childFor('ffprobe');
    t.mock.timers.tick(10000);                // fire the 10s read timeout
    const result = await p;
    assert.strictEqual(result.success, false);
    assert.match(result.error, /timed out/i);
    assert.strictEqual(ff.killed, true);
  });
});
