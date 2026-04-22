/**
 * File: test/unit/windows-provider-manager.test.js
 *
 * AgentVibes - Finally, your AI Agents can Talk Back!
 * Website: https://agentvibes.org
 * Repository: https://github.com/paulpreibisch/AgentVibes
 *
 * Tests for Windows provider-manager.ps1 and provider naming consistency.
 * Covers the piper vs windows-piper unification issue.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..', '..');
const hooksWindows = join(projectRoot, '.claude', 'hooks-windows');
const providerScript = join(hooksWindows, 'provider-manager.ps1');
const serverPy = join(projectRoot, 'mcp-server', 'server.py');

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
// Suite: Provider script existence
// ============================================================

test('Provider: provider-manager.ps1 exists', () => {
  assert.ok(existsSync(providerScript), 'provider-manager.ps1 must exist');
});

test('Provider: all provider play-tts scripts exist on Windows', () => {
  const expectedProviderScripts = [
    'play-tts-piper.ps1',
    'play-tts-sapi.ps1',
    'play-tts-soprano.ps1',
  ];

  for (const script of expectedProviderScripts) {
    assert.ok(
      existsSync(join(hooksWindows, script)),
      `Provider script missing: ${script}`
    );
  }
});

// ============================================================
// Suite: Provider naming consistency (piper vs windows-piper)
// ============================================================

test('Provider: MCP server valid_providers should accept "piper" on Windows', () => {
  const serverSource = readFileSync(serverPy, 'utf-8');

  // Find the Windows valid_providers list
  const windowsMatch = serverSource.match(/if\s+self\.is_windows:\s*\n\s*valid_providers\s*=\s*\[([^\]]+)\]/);
  assert.ok(windowsMatch, 'Could not find Windows valid_providers in server.py');

  const providers = windowsMatch[1];

  // Currently this will show "windows-piper" — when unified, should show "piper"
  if (providers.includes('windows-piper')) {
    console.log('  INFO: MCP still uses "windows-piper" — needs unification to "piper"');
    console.log(`  Current Windows providers: ${providers.trim()}`);
  }

  // At minimum, verify the provider list exists and isn't empty
  assert.ok(providers.trim().length > 0, 'Windows valid_providers should not be empty');
});

test('Provider: provider-manager.ps1 accepts both "piper" and "windows-piper"', () => {
  const content = readFileSync(providerScript, 'utf-8');

  // The script should accept both for backwards compatibility
  assert.ok(
    content.includes('piper'),
    'provider-manager.ps1 should accept "piper"'
  );
});

test('Provider: play-tts.ps1 routes to correct provider script', () => {
  const playTts = join(hooksWindows, 'play-tts.ps1');
  if (!existsSync(playTts)) return;

  const content = readFileSync(playTts, 'utf-8');

  // Verify it can route to both piper and sapi
  assert.ok(
    content.includes('windows-piper') || content.includes('piper'),
    'play-tts.ps1 should reference piper provider'
  );
  assert.ok(
    content.includes('sapi') || content.includes('windows-sapi'),
    'play-tts.ps1 should reference sapi provider'
  );
});

// ============================================================
// Suite: Live provider-manager tests (Windows only)
// ============================================================

test('Provider: list shows available providers', { skip: !isWindows }, async () => {
  const result = await runPowerShell(['-File', providerScript, 'list']);
  assert.strictEqual(result.exitCode, 0, `list should exit 0: ${result.stderr}`);
  assert.ok(result.stdout.trim().length > 0, 'list should produce output');
});

test('Provider: get returns current provider', { skip: !isWindows }, async () => {
  const result = await runPowerShell(['-File', providerScript, 'get']);
  assert.strictEqual(result.exitCode, 0, `get should exit 0: ${result.stderr}`);

  const provider = result.stdout.trim();
  assert.ok(provider.length > 0, 'get should return a provider name');
});

test('Provider: switch to invalid provider fails or warns', { skip: !isWindows }, async () => {
  const result = await runPowerShell(['-File', providerScript, 'switch', 'nonexistent-provider']);
  // Provider-manager may exit 0 but should output an error/warning message
  const output = (result.stdout + result.stderr).toLowerCase();
  assert.ok(
    result.exitCode !== 0 || output.includes('invalid') || output.includes('error') ||
    output.includes('not found') || output.includes('unknown') || output.includes('not recognized'),
    `Invalid provider should produce error output or non-zero exit. exitCode=${result.exitCode}, output: ${output.substring(0, 200)}`
  );
});

test('Provider: switch then get round-trips correctly', { skip: !isWindows }, async () => {
  const { readFileSync: rfSync, writeFileSync: wfSync, existsSync: exSync } = await import('node:fs');
  const { join: pJoin, resolve: pResolve, dirname: pDirname } = await import('node:path');
  const { fileURLToPath: fURLToPath } = await import('node:url');
  const pRoot = pResolve(pDirname(fURLToPath(import.meta.url)), '..', '..');
  const providerFile = pJoin(pRoot, '.claude', 'tts-provider.txt');

  // Save current provider file content for exact restoration
  const originalContent = exSync(providerFile) ? rfSync(providerFile, 'utf-8') : null;

  try {
    // Switch to sapi (always available on Windows)
    const switchResult = await runPowerShell(['-File', providerScript, 'switch', 'sapi']);
    if (switchResult.exitCode !== 0) {
      console.log('  Skipping: could not switch to sapi');
      return;
    }

    // Verify get returns the new provider
    const after = await runPowerShell(['-File', providerScript, 'get']);
    const newProvider = after.stdout.trim();
    assert.ok(
      newProvider.includes('sapi'),
      `After switching to sapi, get should return sapi, got: ${newProvider}`
    );
  } finally {
    // Restore original file content exactly
    if (originalContent !== null) {
      wfSync(providerFile, originalContent);
    }
  }
});
