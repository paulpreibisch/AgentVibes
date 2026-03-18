/**
 * Installer CLI Tests
 * Tests the CLI entry point and argument parsing
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const installerPath = join(__dirname, '../../src/installer.js');

/**
 * Helper function to run installer CLI command
 * @param {string[]} args - Command line arguments
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function runInstaller(args = []) {
  return new Promise((resolve) => {
    const child = spawn('node', [installerPath, ...args], {
      env: { ...process.env, AGENTVIBES_TEST_MODE: 'true' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      child.kill();
      resolve({ stdout, stderr, exitCode: -1 });
    }, 5000);
  });
}

test('CLI entry point - help command', async () => {
  const result = await runInstaller(['help']);

  assert.strictEqual(result.exitCode, 0, 'help command should exit successfully');
  assert.ok(
    result.stdout.includes('Usage:') || result.stdout.includes('Commands:'),
    'help output should contain usage information'
  );
});

test('CLI entry point - no arguments shows help', async () => {
  const result = await runInstaller([]);

  // Should show help/welcome message
  // The output might be in stderr for some terminal formatting
  const output = result.stdout + result.stderr;
  assert.ok(
    output.includes('AgentVibes') || output.includes('Usage:') || output.includes('Commands:'),
    'no arguments should display help or welcome message'
  );
});

test('CLI entry point - invalid command shows error', async () => {
  const result = await runInstaller(['invalid-command-xyz']);

  // Should show some error or help message
  assert.ok(
    result.stdout.length > 0 || result.stderr.length > 0,
    'invalid command should produce output'
  );
});

test('Exported functions are available for import', async () => {
  // This test verifies the export statement works
  const { isTermux, detectAndNotifyTermux } = await import('../../src/installer.js');

  assert.strictEqual(typeof isTermux, 'function', 'isTermux should be exported as a function');
  assert.strictEqual(
    typeof detectAndNotifyTermux,
    'function',
    'detectAndNotifyTermux should be exported as a function'
  );
});
