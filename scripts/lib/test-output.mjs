/**
 * Parsing of `node --test` output, shared by scripts/run-coverage.mjs and its
 * tests.
 */

export const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

// TAP escapes backslashes in names ("D:\\a\\..."); compare paths with forward
// slashes and no escaping.
const normalizePath = (p) => p.replace(/\\\\/g, '/').replace(/\\/g, '/');

/**
 * True when a reported name is the file-level entry for `file` (node --test
 * names it by the file's path), rather than a test inside it.
 * @param {string} name
 * @param {string} file - the test file the run was for, e.g. test/unit/foo.test.js
 */
function isFileEntry(name, file) {
  const n = normalizePath(name.trim());
  const f = normalizePath(file);
  return n === f || n.endsWith(`/${f}`);
}

/**
 * Names of the individual tests a run reported as failed, from either the TAP
 * or the spec reporter. The file-level entry for `file` is left out; it
 * describes the file crashing, not a test.
 * @param {string} out - combined stdout/stderr of one `node --test` run
 * @param {string} file - the test file that run was for
 * @returns {string[]}
 */
export function failedTestNames(out, file) {
  const clean = stripAnsi(out);
  return [
    ...[...clean.matchAll(/^\s*not ok \d+ - (.+?)\s*$/gm)].map((m) => m[1]),
    ...[...clean.matchAll(/^\s*✖ (.+?)(?: \([\d.]+ms\))?\s*$/gm)].map((m) => m[1]),
  ].filter((n) => n && n !== 'failing tests:' && !isFileEntry(n, file));
}

// The runner's own report when Node 20/22 on Windows cannot read a file's
// results back from its child: a file-level failure whose YAML block names the
// uncaught deserialize error. Matching the whole block, not the message alone,
// keeps test output that merely mentions the message from qualifying.
const RUNNER_DESERIALIZE_REPORT = new RegExp(
  String.raw`^not ok \d+ - (.+)\s*\n\s+---\n(?:\s+.*\n)*?` +
  String.raw`\s+failureType: 'uncaughtException'\s*\n` +
  String.raw`\s+error: 'Unable to deserialize cloned data due to invalid or unsupported version\.'\s*\n` +
  String.raw`\s+code: 'ERR_TEST_FAILURE'`,
  'm',
);

/**
 * True when a failed run is only Node's runner deserialize crash, so one rerun
 * is safe: the runner reported that crash for this file and no individual test
 * failed.
 * @param {{ file: string, code: number, out: string }} run
 * @returns {boolean}
 */
export function isRunnerDeserializeCrash({ file, code, out }) {
  if (code === 0) return false;
  const clean = stripAnsi(out).replace(/\r\n/g, '\n');
  const report = clean.match(RUNNER_DESERIALIZE_REPORT);
  return Boolean(report) && isFileEntry(report[1], file) && failedTestNames(clean, file).length === 0;
}

/**
 * Run a test file, and run it once more only if the first run was nothing but
 * the runner deserialize crash. A second crash, or any failure, is returned as
 * it is.
 * @param {string} file
 * @param {(file: string) => Promise<{ file: string, code: number, out: string }>} runFile
 * @param {(message: string) => void} [warn]
 */
export async function runWithRunnerCrashRetry(file, runFile, warn = console.warn) {
  const first = await runFile(file);
  if (!isRunnerDeserializeCrash(first)) return first;
  warn(`\n⚠️  ${file}: Node test runner failed to deserialize results; rerunning once.`);
  return runFile(file);
}
