import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import {
  validateProvider,
  validateSopranoInstallation,
  validatePiperInstallation,
  testProviderRuntime,
  attemptProviderInstallation,
  getProviderInstallCommand,
  getProviderDisplayName,
} from '../../src/utils/provider-validator.js';

test('Provider Validator - validateProvider', async (t) => {
  await t.test('should return unknown provider error for invalid provider', async () => {
    const result = await validateProvider('invalid-provider');
    assert.strictEqual(result.installed, false);
    assert.match(result.message, /Unknown provider/);
  });

  await t.test('should handle remote/special providers without local install', async () => {
    const result = await validateProvider('ssh-remote');
    assert.strictEqual(result.installed, true);
    assert.match(result.message, /Remote|Special/);
  });

  await t.test('should validate piper provider', async () => {
    const result = await validatePiperInstallation();
    assert.strictEqual(typeof result.installed, 'boolean');
    assert.strictEqual(typeof result.message, 'string');
  });

  await t.test('should validate macos provider', async () => {
    const result = await validateProvider('macos');
    assert.strictEqual(typeof result.installed, 'boolean');
    // On macOS it might be installed, on Linux/Windows it won't be
    if (process.platform !== 'darwin') {
      assert.strictEqual(result.installed, false);
    }
  });

  await t.test('should validate windows-sapi provider', async () => {
    const result = await validateProvider('windows-sapi');
    // On Windows it should be available, on other platforms it shouldn't
    if (process.platform === 'win32') {
      assert.strictEqual(result.installed, true);
    } else {
      assert.strictEqual(result.installed, false);
    }
  });
});

test('Provider Validator - getProviderInstallCommand', async (t) => {
  await t.test('should return pip install command for soprano', () => {
    const cmd = getProviderInstallCommand('soprano');
    assert.match(cmd, /pip install soprano-tts/);
  });

  await t.test('should return pip install command for piper', () => {
    const cmd = getProviderInstallCommand('piper');
    assert.match(cmd, /pip install piper-tts/);
  });

  await t.test('should return empty string for built-in providers', () => {
    const cmd1 = getProviderInstallCommand('macos');
    const cmd2 = getProviderInstallCommand('windows-sapi');
    assert.strictEqual(cmd1, '');
    assert.strictEqual(cmd2, '');
  });

  await t.test('should return empty string for unknown provider', () => {
    const cmd = getProviderInstallCommand('unknown');
    assert.strictEqual(cmd, '');
  });
});

test('Provider Validator - getProviderDisplayName', async (t) => {
  await t.test('should return display name for soprano', () => {
    const name = getProviderDisplayName('soprano');
    assert.strictEqual(name, 'Soprano TTS');
  });

  await t.test('should return display name for piper', () => {
    const name = getProviderDisplayName('piper');
    assert.strictEqual(name, 'Piper TTS');
  });

  await t.test('should return display name for macos', () => {
    const name = getProviderDisplayName('macos');
    assert.strictEqual(name, 'macOS Say');
  });

  await t.test('should return display name for windows-sapi', () => {
    const name = getProviderDisplayName('windows-sapi');
    assert.strictEqual(name, 'Windows SAPI');
  });

  await t.test('should return provider name for unknown provider', () => {
    const name = getProviderDisplayName('custom-provider');
    assert.strictEqual(name, 'custom-provider');
  });
});

test('Provider Validator - Piper Installation Detection', async (t) => {
  await t.test('should detect if piper is installed', async () => {
    const result = await validatePiperInstallation();
    assert.strictEqual(typeof result.installed, 'boolean');
    assert.strictEqual(typeof result.message, 'string');

    // If piper is installed, message should indicate it
    if (result.installed) {
      assert.match(result.message, /[Pp]iper/);
    } else {
      // Message should indicate Piper is not available
      assert.ok(result.message.includes('not available') || result.message.includes('piper'));
    }
  });
});

test('Provider Validator - Runtime Testing', async (t) => {
  await t.test('should return working status for piper runtime', async () => {
    const result = await testProviderRuntime('piper');
    assert.strictEqual(typeof result.working, 'boolean');
    if (!result.working) {
      assert.strictEqual(typeof result.error, 'string');
    }
  });

  await t.test('should handle unknown provider in runtime test', async () => {
    const result = await testProviderRuntime('unknown-provider');
    assert.strictEqual(result.working, true);
    assert.strictEqual(result.error, undefined);
  });

  await t.test('should return working status for macos runtime', async () => {
    const result = await testProviderRuntime('macos');
    assert.strictEqual(typeof result.working, 'boolean');
    if (!result.working && process.platform !== 'darwin') {
      // Expected - macOS only available on macOS
      assert.ok(result.error);
    }
  });
});

test('Provider Validator - attemptProviderInstallation', async (t) => {
  await t.test('should reject unknown provider', async () => {
    const result = await attemptProviderInstallation('unknown-provider');
    assert.strictEqual(result.success, false);
    assert.match(result.message, /Unknown provider/);
  });

  await t.test('should return consistent message structure for soprano', async () => {
    const result = await attemptProviderInstallation('soprano');
    assert.strictEqual(typeof result.success, 'boolean');
    assert.strictEqual(typeof result.message, 'string');
  });

  await t.test('should return consistent message structure for piper', async () => {
    const result = await attemptProviderInstallation('piper');
    assert.strictEqual(typeof result.success, 'boolean');
    assert.strictEqual(typeof result.message, 'string');
  });

  await t.test('should include command in result when successful', async () => {
    const result = await attemptProviderInstallation('piper');
    if (result.success) {
      assert.strictEqual(typeof result.command, 'string');
      assert.match(result.command, /piper-tts/);
    }
  });

  await t.test('should not suggest --break-system-packages', async () => {
    const result = await attemptProviderInstallation('soprano');
    assert.ok(!result.message.includes('--break-system-packages'));
    if (result.command) {
      assert.ok(!result.command.includes('--break-system-packages'));
    }
  });
});
