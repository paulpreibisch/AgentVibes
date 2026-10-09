/**
 * scripts/lib/test-output.mjs decides what the coverage runner counts as a
 * failed test and when Node's Windows deserialize crash earns one rerun. A
 * rerun must never hide a real failure.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { failedTestNames, isRunnerDeserializeCrash, runWithRunnerCrashRetry } from '../../scripts/lib/test-output.mjs';

const FILE = 'test/unit/installer-cov.test.js';

// The runner's own report for the crash, as it appears in CI logs.
const CRASH = [
  'not ok 1 - D:\\\\a\\\\AgentVibes\\\\AgentVibes\\\\test\\\\unit\\\\installer-cov.test.js',
  '  ---',
  '  duration_ms: 422.4957',
  "  location: 'D:\\\\a\\\\AgentVibes\\\\AgentVibes\\\\test\\\\unit\\\\installer-cov.test.js:1:1'",
  "  failureType: 'uncaughtException'",
  "  error: 'Unable to deserialize cloned data due to invalid or unsupported version.'",
  "  code: 'ERR_TEST_FAILURE'",
  '  stack: |-',
  '    #proccessRawBuffer (node:internal/test_runner/runner:358:20)',
  '  ...',
].join('\n');

const PASSED = ['# Subtest: copies hooks', 'ok 1 - copies hooks', '  ---', '  ...'].join('\n');
const failed = (name) => [`# Subtest: ${name}`, `not ok 1 - ${name}`, '  ---', "  error: 'expected true'", '  ...'].join('\n');

describe('failedTestNames', () => {
  test('lists failed tests from the TAP and spec reporters', () => {
    assert.deepEqual(failedTestNames(`${failed('copies hooks')}\n✖ restores config (3.9ms)`, FILE),
      ['copies hooks', 'restores config']);
  });

  test("leaves out this file's own entry and the spec summary header", () => {
    assert.deepEqual(failedTestNames(`${CRASH}\n✖ failing tests:\n✖ test\\unit\\installer-cov.test.js (227.5ms)`, FILE), []);
  });

  test('keeps a failed test whose name ends in .test.js', () => {
    assert.deepEqual(failedTestNames(failed('loads config.test.js'), FILE), ['loads config.test.js']);
  });

  test('ignores colour codes', () => {
    assert.deepEqual(failedTestNames('\x1b[31m✖ restores config\x1b[39m', FILE), ['restores config']);
  });
});

describe('isRunnerDeserializeCrash', () => {
  const run = (code, out) => ({ file: FILE, code, out });

  test('a failed run whose only failure is the runner crash qualifies', () => {
    assert.equal(isRunnerDeserializeCrash(run(1, `${PASSED}\n${CRASH}`)), true);
  });

  test('Windows line endings in the report still match', () => {
    assert.equal(isRunnerDeserializeCrash(run(1, CRASH.replace(/\n/g, '\r\n'))), true);
  });

  test('a passing run does not qualify', () => {
    assert.equal(isRunnerDeserializeCrash(run(0, CRASH)), false);
  });

  test('a real test failure alongside the crash does not qualify', () => {
    assert.equal(isRunnerDeserializeCrash(run(1, `${failed('copies hooks')}\n${CRASH}`)), false);
  });

  test('a failed test named like a file, alongside the crash, does not qualify', () => {
    assert.equal(isRunnerDeserializeCrash(run(1, `${failed('loads config.test.js')}\n${CRASH}`)), false);
  });

  test('test output that only mentions the message does not qualify', () => {
    const out = `${PASSED}\nUnable to deserialize cloned data due to invalid or unsupported version.\n`;
    assert.equal(isRunnerDeserializeCrash(run(1, out)), false);
  });

  test('a crash reported for a different file does not qualify', () => {
    assert.equal(isRunnerDeserializeCrash({ file: 'test/unit/other.test.js', code: 1, out: CRASH }), false);
  });

  test('a different uncaught error does not qualify', () => {
    const other = CRASH.replace('Unable to deserialize cloned data due to invalid or unsupported version.', 'boom');
    assert.equal(isRunnerDeserializeCrash(run(1, other)), false);
  });
});

describe('runWithRunnerCrashRetry', () => {
  /** A runFile stand-in that answers with the given runs in order. */
  function scripted(...runs) {
    const calls = [];
    const runFile = async (file) => { calls.push(file); return { file, ...runs[calls.length - 1] }; };
    return { runFile, calls };
  }
  const silent = () => {};

  test('a passing run is returned without a rerun', async () => {
    const { runFile, calls } = scripted({ code: 0, out: PASSED });
    assert.equal((await runWithRunnerCrashRetry(FILE, runFile, silent)).code, 0);
    assert.equal(calls.length, 1);
  });

  test('an unrelated failure is returned without a rerun', async () => {
    const { runFile, calls } = scripted({ code: 1, out: failed('copies hooks') });
    assert.equal((await runWithRunnerCrashRetry(FILE, runFile, silent)).code, 1);
    assert.equal(calls.length, 1);
  });

  test('a real failure alongside the crash is returned without a rerun', async () => {
    const { runFile, calls } = scripted({ code: 1, out: `${failed('copies hooks')}\n${CRASH}` }, { code: 0, out: PASSED });
    assert.equal((await runWithRunnerCrashRetry(FILE, runFile, silent)).code, 1);
    assert.equal(calls.length, 1);
  });

  test('the crash alone is rerun once and the rerun result is used', async () => {
    const warnings = [];
    const { runFile, calls } = scripted({ code: 1, out: CRASH }, { code: 0, out: PASSED });
    assert.equal((await runWithRunnerCrashRetry(FILE, runFile, (m) => warnings.push(m))).code, 0);
    assert.equal(calls.length, 2);
    assert.equal(warnings.length, 1);
  });

  test('a rerun that crashes again is returned as a failure, with no third run', async () => {
    const { runFile, calls } = scripted({ code: 1, out: CRASH }, { code: 1, out: CRASH }, { code: 0, out: PASSED });
    assert.equal((await runWithRunnerCrashRetry(FILE, runFile, silent)).code, 1);
    assert.equal(calls.length, 2);
  });
});
