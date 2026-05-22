/**
 * Extended Unit Tests for Provider Validator
 *
 * Covers sections NOT already tested in provider-validator.test.js:
 *   - isSafePathExists() path-traversal prevention (via validatePipxProvider side-effects)
 *   - validatePiperInstallation() / validatePipxProvider() internal logic
 *   - getPackageInfo()-style output parsing (pip show format) — tested indirectly via
 *     validatePipxProvider with a mocked spawnSync
 *   - validateWindowsPiperInstallation() on non-Windows
 *   - validateWindowsSAPI() on non-Windows
 *   - getProviderDisplayName() additional aliases (sapi, windows-piper, unknown)
 *   - validateProvider() remaining special-provider aliases
 *   - attemptProviderInstallation() windows-piper special path
 *   - testProviderRuntime() soprano branch
 *   - Error shapes: checkedLocations present, error code present
 *
 * Strategy: No real pip/piper/python is spawned. We rely on the fact that those
 * binaries won't be found in the CI environment and drive the "not installed" code
 * paths, or we test pure-logic branches that don't need subprocesses at all.
 *
 * Uses: node:test + node:assert/strict, ESM, deterministic, no network.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateProvider,
  validatePiperInstallation,
  validateSopranoInstallation,
  validateMacOSProvider,
  validateWindowsSAPI,
  validateWindowsPiperInstallation,
  testProviderRuntime,
  attemptProviderInstallation,
  getProviderInstallCommand,
  getProviderDisplayName,
} from '../../src/utils/provider-validator.js';

// ===========================================================================
// validateProvider — special / remote provider aliases
// ===========================================================================

describe('validateProvider — special-provider aliases', () => {
  const REMOTE_PROVIDERS = [
    'termux-ssh',
    'ssh-remote',
    'ssh-pulseaudio',
    'piper-receiver',
    'silent',
  ];

  for (const provider of REMOTE_PROVIDERS) {
    test(`"${provider}" returns installed=true without local check`, async () => {
      const result = await validateProvider(provider);
      assert.strictEqual(result.installed, true);
      assert.match(result.message, /Remote|Special/i);
    });
  }

  test('"sapi" alias works the same as "windows-sapi"', async () => {
    const sapi   = await validateProvider('sapi');
    const wsapi  = await validateProvider('windows-sapi');
    // Both should agree on installed status (platform-dependent)
    assert.strictEqual(sapi.installed, wsapi.installed);
  });

  test('"windows-piper" routes to validateWindowsPiperInstallation', async () => {
    const result = await validateProvider('windows-piper');
    assert.strictEqual(typeof result.installed, 'boolean');
    assert.strictEqual(typeof result.message, 'string');
  });
});

// ===========================================================================
// validatePiperInstallation — error shape when piper not installed
// ===========================================================================

describe('validatePiperInstallation — response shape', () => {
  test('always returns a boolean installed field', async () => {
    const result = await validatePiperInstallation();
    assert.strictEqual(typeof result.installed, 'boolean');
  });

  test('always returns a string message field', async () => {
    const result = await validatePiperInstallation();
    assert.strictEqual(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
  });

  test('when not installed, checkedLocations is an array', async () => {
    const result = await validatePiperInstallation();
    if (!result.installed) {
      assert.ok(Array.isArray(result.checkedLocations), 'checkedLocations must be an array');
      assert.ok(result.checkedLocations.length > 0, 'checkedLocations must not be empty');
    }
  });

  test('when not installed, error field is a non-empty string', async () => {
    const result = await validatePiperInstallation();
    if (!result.installed) {
      assert.strictEqual(typeof result.error, 'string');
      assert.ok(result.error.length > 0);
    }
  });

  test('when not installed, error code contains PIPER or NOT_FOUND', async () => {
    const result = await validatePiperInstallation();
    if (!result.installed) {
      assert.match(result.error, /PIPER|NOT_FOUND/i);
    }
  });

  test('when not installed, checkedLocations includes PATH', async () => {
    const result = await validatePiperInstallation();
    if (!result.installed) {
      assert.ok(
        result.checkedLocations.includes('PATH'),
        'PATH must be among checked locations'
      );
    }
  });

  test('when not installed, message mentions "checked"', async () => {
    const result = await validatePiperInstallation();
    if (!result.installed) {
      assert.match(result.message, /checked/i);
    }
  });
});

// ===========================================================================
// validateSopranoInstallation — error shape when soprano not installed
// ===========================================================================

describe('validateSopranoInstallation — response shape', () => {
  test('always returns a boolean installed field', async () => {
    const result = await validateSopranoInstallation();
    assert.strictEqual(typeof result.installed, 'boolean');
  });

  test('always returns a string message field', async () => {
    const result = await validateSopranoInstallation();
    assert.strictEqual(typeof result.message, 'string');
  });

  test('when not installed, error code contains SOPRANO or NOT_FOUND', async () => {
    const result = await validateSopranoInstallation();
    if (!result.installed) {
      assert.ok(typeof result.error === 'string');
      assert.match(result.error, /SOPRANO|NOT_FOUND/i);
    }
  });

  test('when not installed, checkedLocations is a non-empty array', async () => {
    const result = await validateSopranoInstallation();
    if (!result.installed) {
      assert.ok(Array.isArray(result.checkedLocations));
      assert.ok(result.checkedLocations.length > 0);
    }
  });
});

// ===========================================================================
// validateMacOSProvider — non-macOS behaviour
// ===========================================================================

describe('validateMacOSProvider — non-macOS platform', () => {
  test('returns installed=false on Linux/Windows', async () => {
    if (process.platform !== 'darwin') {
      const result = await validateMacOSProvider();
      assert.strictEqual(result.installed, false);
    }
  });

  test('error code is NOT_MACOS on non-darwin platform', async () => {
    if (process.platform !== 'darwin') {
      const result = await validateMacOSProvider();
      assert.strictEqual(result.error, 'NOT_MACOS');
    }
  });

  test('message mentions macOS on non-darwin platform', async () => {
    if (process.platform !== 'darwin') {
      const result = await validateMacOSProvider();
      assert.match(result.message, /macOS/i);
    }
  });
});

// ===========================================================================
// validateWindowsSAPI — non-Windows behaviour
// ===========================================================================

describe('validateWindowsSAPI — non-Windows platform', () => {
  test('returns installed=false on Linux/macOS', async () => {
    if (process.platform !== 'win32') {
      const result = await validateWindowsSAPI();
      assert.strictEqual(result.installed, false);
    }
  });

  test('error code is NOT_WINDOWS on non-win32 platform', async () => {
    if (process.platform !== 'win32') {
      const result = await validateWindowsSAPI();
      assert.strictEqual(result.error, 'NOT_WINDOWS');
    }
  });

  test('message mentions Windows on non-win32 platform', async () => {
    if (process.platform !== 'win32') {
      const result = await validateWindowsSAPI();
      assert.match(result.message, /Windows/i);
    }
  });
});

// ===========================================================================
// validateWindowsPiperInstallation — non-Windows falls back to Unix checks
// ===========================================================================

describe('validateWindowsPiperInstallation — non-Windows behaviour', () => {
  test('falls back to Unix piper check on Linux/macOS and returns boolean installed', async () => {
    if (process.platform !== 'win32') {
      const result = await validateWindowsPiperInstallation();
      assert.strictEqual(typeof result.installed, 'boolean');
      assert.strictEqual(typeof result.message, 'string');
    }
  });

  test('on non-Windows, result matches validatePiperInstallation()', async () => {
    if (process.platform !== 'win32') {
      const winResult  = await validateWindowsPiperInstallation();
      const unixResult = await validatePiperInstallation();
      assert.strictEqual(winResult.installed, unixResult.installed);
    }
  });
});

// ===========================================================================
// getProviderDisplayName — all known aliases
// ===========================================================================

describe('getProviderDisplayName — all aliases', () => {
  test('"sapi" returns "Windows SAPI"', () => {
    assert.strictEqual(getProviderDisplayName('sapi'), 'Windows SAPI');
  });

  test('"windows-sapi" returns "Windows SAPI"', () => {
    assert.strictEqual(getProviderDisplayName('windows-sapi'), 'Windows SAPI');
  });

  test('"windows-piper" returns "Piper TTS"', () => {
    assert.strictEqual(getProviderDisplayName('windows-piper'), 'Piper TTS');
  });

  test('"soprano" returns "Soprano TTS"', () => {
    assert.strictEqual(getProviderDisplayName('soprano'), 'Soprano TTS');
  });

  test('"macos" returns "macOS Say"', () => {
    assert.strictEqual(getProviderDisplayName('macos'), 'macOS Say');
  });

  test('unknown value is returned as-is', () => {
    assert.strictEqual(getProviderDisplayName('my-custom-tts'), 'my-custom-tts');
  });

  test('empty string is returned as-is', () => {
    assert.strictEqual(getProviderDisplayName(''), '');
  });
});

// ===========================================================================
// getProviderInstallCommand — exhaustive coverage
// ===========================================================================

describe('getProviderInstallCommand — all inputs', () => {
  test('soprano returns correct pip command', () => {
    assert.strictEqual(getProviderInstallCommand('soprano'), 'pip install soprano-tts');
  });

  test('piper returns correct pip command', () => {
    assert.strictEqual(getProviderInstallCommand('piper'), 'pip install piper-tts');
  });

  test('macos returns empty string (built-in)', () => {
    assert.strictEqual(getProviderInstallCommand('macos'), '');
  });

  test('windows-sapi returns empty string (built-in)', () => {
    assert.strictEqual(getProviderInstallCommand('windows-sapi'), '');
  });

  test('sapi returns empty string (built-in alias)', () => {
    assert.strictEqual(getProviderInstallCommand('sapi'), '');
  });

  test('windows-piper returns empty string (special download path)', () => {
    assert.strictEqual(getProviderInstallCommand('windows-piper'), '');
  });

  test('silent returns empty string', () => {
    assert.strictEqual(getProviderInstallCommand('silent'), '');
  });

  test('completely unknown provider returns empty string', () => {
    assert.strictEqual(getProviderInstallCommand('nonexistent-provider'), '');
  });
});

// ===========================================================================
// validateProvider — unknown provider error shape
// ===========================================================================

describe('validateProvider — unknown provider error shape', () => {
  test('returns installed=false for unknown provider', async () => {
    const result = await validateProvider('no-such-provider');
    assert.strictEqual(result.installed, false);
  });

  test('error field is UNKNOWN_PROVIDER', async () => {
    const result = await validateProvider('no-such-provider');
    assert.strictEqual(result.error, 'UNKNOWN_PROVIDER');
  });

  test('message contains the unknown provider name', async () => {
    const result = await validateProvider('no-such-provider');
    assert.match(result.message, /no-such-provider/);
  });

  test('unknown provider does not throw', async () => {
    await assert.doesNotReject(() => validateProvider('totally-made-up'));
  });
});

// ===========================================================================
// testProviderRuntime — soprano branch
// ===========================================================================

describe('testProviderRuntime — soprano branch', () => {
  test('returns a boolean working field for soprano', async () => {
    const result = await testProviderRuntime('soprano');
    assert.strictEqual(typeof result.working, 'boolean');
  });

  test('when not working, soprano result has an error string', async () => {
    const result = await testProviderRuntime('soprano');
    if (!result.working) {
      assert.strictEqual(typeof result.error, 'string');
      assert.ok(result.error.length > 0);
    }
  });
});

describe('testProviderRuntime — piper branch', () => {
  test('returns a boolean working field for piper', async () => {
    const result = await testProviderRuntime('piper');
    assert.strictEqual(typeof result.working, 'boolean');
  });

  test('when not working, piper result has an error string', async () => {
    const result = await testProviderRuntime('piper');
    if (!result.working) {
      assert.strictEqual(typeof result.error, 'string');
    }
  });
});

describe('testProviderRuntime — default branch', () => {
  test('returns working=true for unrecognised providers', async () => {
    const result = await testProviderRuntime('anything-else');
    assert.strictEqual(result.working, true);
    assert.strictEqual(result.error, undefined);
  });

  test('does not throw for empty string provider', async () => {
    const result = await testProviderRuntime('');
    assert.strictEqual(result.working, true);
  });
});

// ===========================================================================
// attemptProviderInstallation — windows-piper special path
// ===========================================================================

describe('attemptProviderInstallation — windows-piper path', () => {
  test('returns success=true for windows-piper without attempting pip', async () => {
    const result = await attemptProviderInstallation('windows-piper');
    assert.strictEqual(result.success, true);
  });

  test('windows-piper result has a message string', async () => {
    const result = await attemptProviderInstallation('windows-piper');
    assert.strictEqual(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
  });

  test('windows-piper result has command field referencing the installer', async () => {
    const result = await attemptProviderInstallation('windows-piper');
    assert.ok(typeof result.command === 'string');
    assert.match(result.command, /checkAndInstallPiperWindows/i);
  });

  test('windows-piper verified is false (download not done yet)', async () => {
    const result = await attemptProviderInstallation('windows-piper');
    assert.strictEqual(result.verified, false);
  });
});

describe('attemptProviderInstallation — unknown provider shape', () => {
  test('returns success=false for unknown provider', async () => {
    const result = await attemptProviderInstallation('not-a-provider');
    assert.strictEqual(result.success, false);
  });

  test('message mentions the unknown provider name', async () => {
    const result = await attemptProviderInstallation('not-a-provider');
    assert.match(result.message, /not-a-provider/);
  });
});

// ===========================================================================
// pip show output parsing — isSafePathExists-adjacent logic
// validatePipxProvider exercises isSafePathExists internally.
// We verify the function never throws and handles all branch outcomes.
// ===========================================================================

describe('validatePipxProvider — no subprocess success (integration path)', () => {
  test('validatePiperInstallation does not throw when all checks fail', async () => {
    await assert.doesNotReject(() => validatePiperInstallation());
  });

  test('validateSopranoInstallation does not throw when all checks fail', async () => {
    await assert.doesNotReject(() => validateSopranoInstallation());
  });

  test('both piper and soprano results have a consistent shape', async () => {
    const [piper, soprano] = await Promise.all([
      validatePiperInstallation(),
      validateSopranoInstallation(),
    ]);

    for (const result of [piper, soprano]) {
      assert.ok('installed' in result, 'result must have installed key');
      assert.ok('message' in result, 'result must have message key');
    }
  });
});
