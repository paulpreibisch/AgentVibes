#!/usr/bin/env node
/**
 * Coverage test runner that gates on the REPORTED test results, not raw exit
 * codes, and runs each test FILE in its OWN process.
 *
 * WHY PER-FILE PROCESSES: sharing one `node --test` process across all files
 * leaks `mock.module()` mocks and global/filesystem state between files, so
 * tests that pass alone fail when the whole suite runs together (~40 of them).
 * Node's `--test-isolation=process` does this natively but isn't available on
 * every CI Node version ("node: bad option"), so we spawn one child per file
 * ourselves. Each child writes V8 coverage into a shared NODE_V8_COVERAGE dir;
 * `c8 report` aggregates it into lcov afterwards, so coverage is unaffected.
 *
 * WHY NOT TRUST EXIT CODES: `node --test --test-force-exit` can exit non-zero
 * even when every test passed (a race against lingering async handles in the
 * blessed handler-firing suites). So a child that exits non-zero but reports
 * "# pass N>0 / # fail 0" is a tolerated force-exit race; a child that fails to
 * LOAD (bad import, syntax error) reports 0 passes and IS a real failure.
 *
 * Used by `npm run test:coverage`, so every consumer (run-tests.sh, the CI
 * workflows, SonarCloud) inherits the same gating on every platform.
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const TEST_DIR = 'test/unit';
const files = readdirSync(TEST_DIR)
  .filter((f) => f.endsWith('.test.js'))
  .sort()
  .map((f) => path.posix.join(TEST_DIR, f));

if (files.length === 0) {
  console.error('❌ No *.test.js files found under', TEST_DIR);
  process.exit(1);
}

// Shared V8-coverage dir every child writes into; c8 aggregates it at the end.
const COV_DIR = path.resolve('coverage', 'tmp');
try { rmSync(COV_DIR, { recursive: true, force: true }); } catch { /* fresh anyway */ }
mkdirSync(COV_DIR, { recursive: true });

const CONCURRENCY = Number(process.env.AGENTVIBES_TEST_CONCURRENCY) || 2;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/** Run ONE test file in its own process. Resolves { file, code, out }. */
function runFile(file) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--experimental-test-module-mocks', '--test-force-exit', '--test', file],
      { env: { ...process.env, NODE_V8_COVERAGE: COV_DIR } }
    );
    let out = '';
    const cap = (stream) => stream.on('data', (c) => {
      out += c;
      process.stdout.write(c); // stream through so CI logs stay live
    });
    cap(child.stdout);
    cap(child.stderr);
    child.on('close', (code) => resolve({ file, code: code ?? 1, out }));
    child.on('error', () => resolve({ file, code: 1, out }));
  });
}

/** Fixed-size concurrency pool over the file list. */
async function runAll() {
  const queue = [...files];
  const results = [];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let f = queue.shift(); f !== undefined; f = queue.shift()) {
      results.push(await runFile(f));
    }
  }));
  return results;
}

const results = await runAll();

// Aggregate coverage from every child's V8 output into lcov + text.
const rep = spawnSync(
  'npx',
  ['c8', 'report', '--temp-directory', COV_DIR, '--reporter=lcov', '--reporter=text', '--reports-dir', 'coverage'],
  { stdio: 'inherit', shell: process.platform === 'win32', env: process.env }
);
if (rep.status !== 0) {
  console.warn('⚠️  c8 report exited non-zero — coverage lcov may be incomplete (tests still gated below).');
}

// ---- Gating -------------------------------------------------------------
let totalPassLines = 0;
const realFails = [];
const brokenFiles = [];
const tolerated = [];

for (const { file, code, out } of results) {
  const clean = stripAnsi(out);
  const passLines =
    (clean.match(/^\s*ok \d+\b/gm) || []).length +
    (clean.match(/^\s*✔ /gm) || []).length;
  totalPassLines += passLines;

  // Genuine per-test failures (descriptive names), from either reporter.
  const names = [
    ...[...clean.matchAll(/^\s*not ok \d+ - (.+?)\s*$/gm)].map((m) => m[1]),
    ...[...clean.matchAll(/^\s*✖ (.+?)(?: \([\d.]+ms\))?\s*$/gm)].map((m) => m[1]),
  ].filter((n) => n && n !== 'failing tests:' && !/\.test\.js$/.test(n.trim()));
  if (names.length) realFails.push(...names.map((n) => `${n}  [${file}]`));

  // A child that exited non-zero with ZERO passing lines never ran its tests
  // (failed to load / crashed) — that is a REAL failure, not a force-exit race.
  if (code !== 0 && names.length === 0) {
    if (passLines === 0) brokenFiles.push(file);
    else tolerated.push(file);
  }
}

if (realFails.length > 0) {
  console.error(`\n❌ ${realFails.length} real test failure(s):`);
  [...new Set(realFails)].slice(0, 40).forEach((n) => console.error(`   • ${n}`));
  process.exit(1);
}
if (brokenFiles.length > 0) {
  console.error(`\n❌ ${brokenFiles.length} test file(s) failed to run (load error / crash, 0 tests executed):`);
  brokenFiles.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}

// Guard against a wholesale early abort (OOM, etc.).
const SANITY_MIN_PASS_LINES = 1000;
if (totalPassLines < SANITY_MIN_PASS_LINES) {
  console.error(`\n❌ Only ${totalPassLines} passing-test lines (< ${SANITY_MIN_PASS_LINES}) — the run aborted early.`);
  process.exit(1);
}

if (tolerated.length > 0) {
  console.warn(`\n⚠️  ${tolerated.length} file(s) exited non-zero with all tests passing — ` +
    'known --test-force-exit race, tolerated: ' + tolerated.join(', '));
}
console.log(`\n✅ Suite passed — ${totalPassLines} passing-test lines across ${files.length} isolated files, no real failures.`);
process.exit(0);
