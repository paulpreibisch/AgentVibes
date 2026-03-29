/**
 * File: test/unit/windows-effects.test.js
 *
 * AgentVibes - Finally, your AI Agents can Talk Back!
 * Website: https://agentvibes.org
 * Repository: https://github.com/paulpreibisch/AgentVibes
 *
 * Tests for Windows effects-manager.ps1 — reverb config sync,
 * silent failure modes, and round-trip consistency.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  readFileSync, existsSync, writeFileSync, mkdirSync, mkdtempSync,
  rmSync, copyFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..', '..');
const hooksWindows = join(projectRoot, '.claude', 'hooks-windows');
const configDir = join(projectRoot, '.claude', 'config');
const effectsScript = join(hooksWindows, 'effects-manager.ps1');

const isWindows = process.platform === 'win32';

function runPowerShell(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', ...args],
      { env: { ...process.env, ...options.env }, timeout: 10000 }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('close', (exitCode) => resolve({ stdout, stderr, exitCode }));
    setTimeout(() => { child.kill(); resolve({ stdout, stderr, exitCode: -1 }); }, 10000);
  });
}

// ============================================================
// Suite: effects-manager.ps1 existence and structure
// ============================================================

test('Effects: effects-manager.ps1 exists', () => {
  assert.ok(existsSync(effectsScript), 'effects-manager.ps1 must exist in hooks-windows/');
});

test('Effects: effects-manager.ps1 supports all required commands', () => {
  const content = readFileSync(effectsScript, 'utf-8');
  const requiredCommands = ['set-reverb', 'get-reverb', 'get-effects', 'list'];

  for (const cmd of requiredCommands) {
    assert.ok(
      content.includes(`"${cmd}"`),
      `effects-manager.ps1 must handle command: ${cmd}`
    );
  }
});

test('Effects: effects-manager.ps1 supports all reverb levels', () => {
  const content = readFileSync(effectsScript, 'utf-8');
  const levels = ['off', 'light', 'medium', 'heavy', 'cathedral'];

  for (const level of levels) {
    assert.ok(
      content.includes(`"${level}"`),
      `effects-manager.ps1 must support reverb level: ${level}`
    );
  }
});

// ============================================================
// Suite: Reverb round-trip (Windows-only live tests)
// ============================================================

test('Effects: set-reverb writes reverb-level.txt for default agent', { skip: !isWindows }, async () => {
  const reverbFile = join(configDir, 'reverb-level.txt');

  // Backup existing value
  let backup = null;
  if (existsSync(reverbFile)) {
    backup = readFileSync(reverbFile, 'utf-8');
  }

  try {
    // Set reverb to heavy
    const result = await runPowerShell(['-File', effectsScript, 'set-reverb', 'heavy', 'default']);
    assert.strictEqual(result.exitCode, 0, `set-reverb should exit 0, got ${result.exitCode}: ${result.stderr}`);

    // Verify reverb-level.txt was updated
    assert.ok(existsSync(reverbFile), 'reverb-level.txt should exist after set-reverb');
    const value = readFileSync(reverbFile, 'utf-8').trim();
    assert.strictEqual(value, 'heavy', `reverb-level.txt should contain 'heavy', got '${value}'`);

    // Set back to off
    await runPowerShell(['-File', effectsScript, 'set-reverb', 'off', 'default']);
    const offValue = readFileSync(reverbFile, 'utf-8').trim();
    assert.strictEqual(offValue, 'off', `reverb-level.txt should be 'off' after reset`);
  } finally {
    // Restore backup
    if (backup !== null) {
      writeFileSync(reverbFile, backup);
    }
  }
});

test('Effects: get-reverb returns correct level after set', { skip: !isWindows }, async () => {
  const reverbFile = join(configDir, 'reverb-level.txt');
  const cfgFile = join(configDir, 'audio-effects.cfg');

  // Both files must exist for this test
  if (!existsSync(cfgFile)) {
    console.log('  Skipping: audio-effects.cfg not found');
    return;
  }

  // Backup
  const cfgBackup = readFileSync(cfgFile, 'utf-8');
  let reverbBackup = existsSync(reverbFile) ? readFileSync(reverbFile, 'utf-8') : null;

  try {
    // Set to medium
    await runPowerShell(['-File', effectsScript, 'set-reverb', 'medium', 'default']);

    // Get should return medium
    const result = await runPowerShell(['-File', effectsScript, 'get-reverb', 'default']);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stdout.trim(), 'medium', `get-reverb should return 'medium', got '${result.stdout.trim()}'`);

    // Set to off
    await runPowerShell(['-File', effectsScript, 'set-reverb', 'off', 'default']);
    const offResult = await runPowerShell(['-File', effectsScript, 'get-reverb', 'default']);
    assert.strictEqual(offResult.stdout.trim(), 'off');
  } finally {
    writeFileSync(cfgFile, cfgBackup);
    if (reverbBackup !== null) {
      writeFileSync(reverbFile, reverbBackup);
    }
  }
});

test('Effects: set-reverb with invalid level exits non-zero', { skip: !isWindows }, async () => {
  const result = await runPowerShell(['-File', effectsScript, 'set-reverb', 'ultrabass', 'default']);
  assert.notStrictEqual(result.exitCode, 0, 'Invalid reverb level should exit non-zero');
});

// ============================================================
// Suite: Config file consistency
// ============================================================

test('Effects: audio-effects.cfg uses pipe-delimited format', () => {
  const cfgFile = join(configDir, 'audio-effects.cfg');
  if (!existsSync(cfgFile)) {
    console.log('  Skipping: audio-effects.cfg not found');
    return;
  }

  const content = readFileSync(cfgFile, 'utf-8');
  const dataLines = content.split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && line.includes('|'));

  assert.ok(dataLines.length > 0, 'audio-effects.cfg should have pipe-delimited data lines');

  for (const line of dataLines) {
    const parts = line.split('|');
    assert.ok(
      parts.length >= 4,
      `Config line should have 4+ pipe-delimited fields: "${line.substring(0, 60)}..."`
    );
  }
});

test('Effects: reverb-level.txt contains a valid level', () => {
  const reverbFile = join(configDir, 'reverb-level.txt');
  if (!existsSync(reverbFile)) {
    console.log('  Skipping: reverb-level.txt not found');
    return;
  }

  const value = readFileSync(reverbFile, 'utf-8').trim();
  const validLevels = ['off', 'light', 'medium', 'heavy', 'cathedral'];
  assert.ok(
    validLevels.includes(value),
    `reverb-level.txt should contain one of ${validLevels.join('/')}, got '${value}'`
  );
});
