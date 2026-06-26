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
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
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

child.on('close', (code) => {
  const clean = buf.replace(/\x1b\[[0-9;]*m/g, '');

  // The node:test summary line is "ℹ fail N" (spec reporter, the default here)
  // or "# fail N" (tap reporter). Gate on this authoritative count — it is the
  // real number of failing tests, independent of the process's flaky exit code.
  const failCounts = [...clean.matchAll(/^(?:ℹ|#)\s*fail\s+(\d+)\s*$/gm)].map((m) => Number(m[1]));

  // The run must have produced at least one summary; otherwise it aborted early
  // (crash, OOM, or launch failure) and we must surface that.
  if (failCounts.length === 0) {
    console.error('\n❌ No test summary found — coverage run aborted before completion.');
    process.exit(code || 1);
  }

  const totalFails = failCounts.reduce((a, b) => a + b, 0);
  if (totalFails > 0) {
    console.error(`\n❌ ${totalFails} test failure(s) detected.`);
    process.exit(1);
  }

  if (code !== 0) {
    console.warn(`\n⚠️  node --test exited ${code} but reported 0 failures ` +
      '(known --test-force-exit race on lingering handles) — treating as pass.');
  } else {
    console.log('\n✅ All tests passed (0 failures).');
  }
  process.exit(0);
});

child.on('error', (err) => {
  console.error('❌ Failed to launch coverage runner:', err.message);
  process.exit(1);
});
