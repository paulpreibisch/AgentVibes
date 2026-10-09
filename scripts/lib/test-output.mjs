/**
 * Parsing of `node --test` output, shared by scripts/run-coverage.mjs and its
 * tests.
 */

export const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/**
 * Names of the individual tests a run reported as failed, from either the TAP
 * or the spec reporter. File-level entries (`not ok 1 - foo.test.js`) are left
 * out; they describe a file that crashed, not a test.
 * @param {string} out - combined stdout/stderr of one `node --test` run
 * @returns {string[]}
 */
export function failedTestNames(out) {
  const clean = stripAnsi(out);
  return [
    ...[...clean.matchAll(/^\s*not ok \d+ - (.+?)\s*$/gm)].map((m) => m[1]),
    ...[...clean.matchAll(/^\s*✖ (.+?)(?: \([\d.]+ms\))?\s*$/gm)].map((m) => m[1]),
  ].filter((n) => n && n !== 'failing tests:' && !/\.test\.js$/.test(n.trim()));
}

// The runner's own report when Node 20/22 on Windows cannot read a file's
// results back from its child: a file-level failure whose YAML block names the
// uncaught deserialize error. Matching the whole block, not the message alone,
// keeps test output that merely mentions the message from qualifying.
const RUNNER_DESERIALIZE_REPORT = new RegExp(
  String.raw`^not ok \d+ - .+\.test\.js\s*\n\s+---\n(?:\s+.*\n)*?` +
  String.raw`\s+failureType: 'uncaughtException'\s*\n` +
  String.raw`\s+error: 'Unable to deserialize cloned data due to invalid or unsupported version\.'\s*\n` +
  String.raw`\s+code: 'ERR_TEST_FAILURE'`,
  'm',
);

/**
 * True when a failed run is only Node's runner deserialize crash, so one rerun
 * is safe: the runner reported that crash and no individual test failed.
 * @param {{ code: number, out: string }} run
 * @returns {boolean}
 */
export function isRunnerDeserializeCrash({ code, out }) {
  if (code === 0) return false;
  const clean = stripAnsi(out).replace(/\r\n/g, '\n');
  return RUNNER_DESERIALIZE_REPORT.test(clean) && failedTestNames(clean).length === 0;
}
