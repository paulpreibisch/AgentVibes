#!/usr/bin/env node
/**
 * Coverage test runner that gates on the REPORTED test results, not the child's
 * raw exit code.
 *
 * Node's test runner with --test-force-exit can intermittently exit non-zero
 * even when every test passed (the summary still reports "# fail 0"). It's a
 * force-exit race against lingering async handles in the blessed handler-firing
 * coverage suites — not a real failure. Real failures (`not ok` lines, or a
 * non-zero `# fail N` summary) still fail the build; a clean run passes
 * regardless of the flaky exit code.
 *
 * Used by `npm run test:coverage` so every consumer (run-tests.sh, the CI
 * workflows, SonarCloud) inherits the same gating on every platform.
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
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

// npx resolves c8 reliably on every platform (avoids ./node_modules/.bin issues
// on Windows). shell:true lets Windows find npx.cmd.
const c8Args = [
  'c8', '--reporter=lcov', '--reporter=text',
  'node',
  '--experimental-test-module-mocks',
  '--test-concurrency=2',
  '--test-force-exit',
  '--test',
  ...files,
];

const child = spawn('npx', c8Args, {
  shell: process.platform === 'win32',
  env: process.env,
});

let buf = '';
const tee = (stream, sink) => {
  stream.on('data', (chunk) => {
    buf += chunk;
    sink.write(chunk);
  });
};
tee(child.stdout, process.stdout);
tee(child.stderr, process.stderr);

// A healthy run emits this many passing-test lines at minimum. The suite is
// ~2100 tests plus nested subtests (several thousand "ok" lines). This floor
// catches a catastrophic early abort (crash/OOM) while sitting far below a
// normal run. We count lines rather than trusting the summary because
// --test-force-exit sometimes exits before printing the "# fail N" summary.
const SANITY_MIN_PASS_LINES = 1000;

const isFileLevel = (n) => /[\\/].*\.test\.js$|^[^ ]+\.test\.js$/.test(n);

child.on('close', (code) => {
  const clean = buf.replace(/\x1b\[[0-9;]*m/g, '');

  // Passing lines: tap "ok N - …" (but not "not ok") or spec "✔ …".
  const passLines =
    (clean.match(/^\s*ok \d+\b/gm) || []).length +
    (clean.match(/^\s*✔ /gm) || []).length;

  // Failing entries from either reporter: tap "not ok N - <name>" or spec
  // "✖ <name> (<ms>)". A REAL failure has a descriptive test name; a file-level
  // force-exit artifact names a "*.test.js" path with all of its subtests
  // passing — node intermittently marks an innocent file failed when an async
  // resource settles after that file's process is force-exited under load.
  const failNames = [
    ...[...clean.matchAll(/^\s*not ok \d+ - (.+?)\s*$/gm)].map((m) => m[1]),
    ...[...clean.matchAll(/^\s*✖ (.+?)(?: \([\d.]+ms\))?\s*$/gm)].map((m) => m[1]),
  ].filter((n) => n && n !== 'failing tests:');

  const realFails = failNames.filter((n) => !isFileLevel(n));
  const fileFails = [...new Set(failNames.filter(isFileLevel))];

  if (realFails.length > 0) {
    console.error(`\n❌ ${realFails.length} real test failure(s):`);
    realFails.slice(0, 20).forEach((n) => console.error(`   • ${n}`));
    process.exit(1);
  }

  // Guard against a run that crashed/aborted before executing the suite.
  if (passLines < SANITY_MIN_PASS_LINES) {
    console.error(`\n❌ Only ${passLines} passing-test lines seen (< ${SANITY_MIN_PASS_LINES}) — ` +
      'the run aborted before completing.');
    process.exit(code || 1);
  }

  // A file-level entry is only an ARTIFACT if the file genuinely passes on its
  // own. This used to be asserted by comment ("all subtests passed") and by
  // nothing else: any failure whose NAME merely looked like a *.test.js path was
  // waved through. A file that failed to LOAD (bad import after a rename, syntax
  // error) reports exactly that shape — so hundreds of assertions could stop
  // running and every consumer of this gate (npm test, CI, SonarCloud, and the
  // release skill, whose ONLY test step is this) stayed green. Proven, not
  // theorised: a deliberately-broken import produced "✅ Suite passed … no real
  // failures" and exit 0.
  //
  // So: re-run each flagged file serially, without --test-force-exit (which is
  // the only thing the tolerance exists to excuse). If it passes alone, it was a
  // race. If it fails alone, it is real and the build must fail.
  if (fileFails.length > 0) {
    console.warn(`\n⚠️  ${fileFails.length} file-level failure(s) reported — re-running each ` +
      'serially to tell a force-exit race from a genuinely broken file:');

    const stillFailing = [];
    for (const name of fileFails) {
      const rel = name.trim().replace(/\\/g, '/');
      if (!existsSync(rel)) {
        // Can't verify it → refuse to tolerate it.
        console.error(`   • ${name} — cannot locate file to re-verify; treating as REAL`);
        stillFailing.push(name);
        continue;
      }
      const res = spawnSync(
        process.execPath,
        ['--experimental-test-module-mocks', '--test', rel],
        { encoding: 'utf8', timeout: 300_000 }
      );
      if (res.status === 0) {
        console.warn(`   • ${name} — passes alone ✔ (force-exit race, tolerated)`);
      } else {
        console.error(`   • ${name} — FAILS alone ✖ (real failure, not an artifact)`);
        stillFailing.push(name);
      }
    }

    if (stillFailing.length > 0) {
      console.error(`\n❌ ${stillFailing.length} test file(s) fail on their own:`);
      stillFailing.forEach((n) => console.error(`   • ${n}`));
      process.exit(1);
    }
  }
  if (code !== 0) {
    console.warn(`\n⚠️  node --test exited ${code} but no real failures — known ` +
      '--test-force-exit race; treating as pass.');
  }
  console.log(`\n✅ Suite passed — ${passLines} passing-test lines, no real failures.`);
  process.exit(0);
});

child.on('error', (err) => {
  console.error('❌ Failed to launch coverage runner:', err.message);
  process.exit(1);
});
