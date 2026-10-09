/**
 * scripts/lib/test-output.mjs decides what the coverage runner counts as a
 * failed test and when Node's Windows deserialize crash earns one rerun. A
 * rerun must never hide a real failure.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { failedTestNames, isRunnerDeserializeCrash } from '../../scripts/lib/test-output.mjs';

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
const FAILED = ['# Subtest: copies hooks', 'not ok 1 - copies hooks', '  ---', "  error: 'expected true'", '  ...'].join('\n');

describe('failedTestNames', () => {
  test('lists failed tests from the TAP and spec reporters', () => {
    assert.deepEqual(failedTestNames(`${FAILED}\n✖ restores config (3.9ms)`), ['copies hooks', 'restores config']);
  });

  test('leaves out file-level entries and the spec summary header', () => {
    assert.deepEqual(failedTestNames(`${CRASH}\n✖ failing tests:`), []);
  });

  test('ignores colour codes', () => {
    assert.deepEqual(failedTestNames('\x1b[31m✖ restores config\x1b[39m'), ['restores config']);
  });
});

describe('isRunnerDeserializeCrash', () => {
  test('a failed run whose only failure is the runner crash is retried', () => {
    assert.equal(isRunnerDeserializeCrash({ code: 1, out: `${PASSED}\n${CRASH}` }), true);
  });

  test('Windows line endings in the report still match', () => {
    assert.equal(isRunnerDeserializeCrash({ code: 1, out: CRASH.replace(/\n/g, '\r\n') }), true);
  });

  test('a passing run is never retried', () => {
    assert.equal(isRunnerDeserializeCrash({ code: 0, out: CRASH }), false);
  });

  test('a real test failure alongside the crash is kept, not retried', () => {
    assert.equal(isRunnerDeserializeCrash({ code: 1, out: `${FAILED}\n${CRASH}` }), false);
  });

  test('test output that only mentions the message does not qualify', () => {
    const out = `${PASSED}\nUnable to deserialize cloned data due to invalid or unsupported version.\n`;
    assert.equal(isRunnerDeserializeCrash({ code: 1, out }), false);
  });

  test('a different uncaught error is not retried', () => {
    const other = CRASH.replace('Unable to deserialize cloned data due to invalid or unsupported version.', 'boom');
    assert.equal(isRunnerDeserializeCrash({ code: 1, out: other }), false);
  });
});
