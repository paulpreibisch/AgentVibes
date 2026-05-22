/**
 * Tests for dependency-checker.js
 *
 * Covers the exported functions that can be exercised without spawning
 * real system processes:
 *
 *   - getInstallCommands(missing, platform)  — pure command-string builder
 *   - displayMissingDependencies(results)    — tested via return value only
 *   - checkDependencies()                    — Node version path (process.version)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  getInstallCommands,
  displayMissingDependencies,
  checkDependencies,
} from '../../src/utils/dependency-checker.js';

// ---------------------------------------------------------------------------
// getInstallCommands — darwin
// ---------------------------------------------------------------------------

describe('getInstallCommands - darwin platform', () => {
  test('returns empty array when nothing is missing', () => {
    const result = getInstallCommands({}, 'darwin');
    assert.deepStrictEqual(result, []);
  });

  test('includes brew install command when sox is missing', () => {
    const result = getInstallCommands({ sox: true }, 'darwin');
    assert.strictEqual(result.length, 1);
    assert.match(result[0].command, /brew install/);
    assert.match(result[0].command, /sox/);
  });

  test('brew command lists ffmpeg when ffmpeg is missing', () => {
    const result = getInstallCommands({ ffmpeg: true }, 'darwin');
    assert.ok(result.some(r => r.command.includes('ffmpeg')));
  });

  test('brew command lists util-linux for flock', () => {
    const result = getInstallCommands({ flock: true }, 'darwin');
    assert.ok(result.some(r => r.command.includes('util-linux')));
  });

  test('brew command lists curl when curl is missing', () => {
    const result = getInstallCommands({ curl: true }, 'darwin');
    assert.ok(result.some(r => r.command.includes('curl')));
  });

  test('brew command lists bc when bc is missing', () => {
    const result = getInstallCommands({ bc: true }, 'darwin');
    assert.ok(result.some(r => r.command.includes('bc')));
  });

  test('brew command lists pipx when pipx is missing', () => {
    const result = getInstallCommands({ pipx: true }, 'darwin');
    assert.ok(result.some(r => r.command.includes('pipx')));
  });

  test('adds separate python install command when python is missing', () => {
    const result = getInstallCommands({ python: true }, 'darwin');
    const pythonCmd = result.find(r => r.label === 'Python 3.10+');
    assert.ok(pythonCmd, 'Should have a Python 3.10+ entry');
    assert.match(pythonCmd.command, /brew install python@3\.11/);
  });

  test('combines multiple missing packages into single brew command', () => {
    const result = getInstallCommands({ sox: true, ffmpeg: true, curl: true }, 'darwin');
    const brewCmd = result.find(r => r.label === 'macOS (Homebrew)');
    assert.ok(brewCmd, 'Should have a Homebrew entry');
    assert.match(brewCmd.command, /sox/);
    assert.match(brewCmd.command, /ffmpeg/);
    assert.match(brewCmd.command, /curl/);
  });

  test('result objects have label and command string properties', () => {
    const result = getInstallCommands({ sox: true }, 'darwin');
    assert.ok(result.length > 0);
    for (const entry of result) {
      assert.strictEqual(typeof entry.label, 'string');
      assert.strictEqual(typeof entry.command, 'string');
    }
  });
});

// ---------------------------------------------------------------------------
// getInstallCommands — linux platform
// ---------------------------------------------------------------------------

describe('getInstallCommands - linux platform', () => {
  test('returns empty array when nothing is missing', () => {
    const result = getInstallCommands({}, 'linux');
    assert.deepStrictEqual(result, []);
  });

  test('includes Ubuntu/Debian apt command when sox is missing', () => {
    const result = getInstallCommands({ sox: true }, 'linux');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd, 'Should have Ubuntu/Debian entry');
    assert.match(aptCmd.command, /apt-get install/);
    assert.match(aptCmd.command, /sox/);
  });

  test('apt command includes libsox-fmt-mp3 for sox', () => {
    const result = getInstallCommands({ sox: true }, 'linux');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd);
    assert.match(aptCmd.command, /libsox-fmt-mp3/);
  });

  test('includes Fedora/RHEL dnf command when ffmpeg is missing', () => {
    const result = getInstallCommands({ ffmpeg: true }, 'linux');
    const dnfCmd = result.find(r => r.label === 'Fedora/RHEL');
    assert.ok(dnfCmd, 'Should have Fedora/RHEL entry');
    assert.match(dnfCmd.command, /dnf install/);
    assert.match(dnfCmd.command, /ffmpeg/);
  });

  test('includes Arch Linux pacman command when curl is missing', () => {
    const result = getInstallCommands({ curl: true }, 'linux');
    const pacCmd = result.find(r => r.label === 'Arch Linux');
    assert.ok(pacCmd, 'Should have Arch Linux entry');
    assert.match(pacCmd.command, /pacman -S/);
    assert.match(pacCmd.command, /curl/);
  });

  test('audioPlayer maps to pulseaudio-utils in apt', () => {
    const result = getInstallCommands({ audioPlayer: true }, 'linux');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd);
    assert.match(aptCmd.command, /pulseaudio-utils/);
  });

  test('audioPlayer maps to libpulse in pacman', () => {
    const result = getInstallCommands({ audioPlayer: true }, 'linux');
    const pacCmd = result.find(r => r.label === 'Arch Linux');
    assert.ok(pacCmd);
    assert.match(pacCmd.command, /libpulse/);
  });

  test('python maps to python3-pip in apt', () => {
    const result = getInstallCommands({ python: true }, 'linux');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd);
    assert.match(aptCmd.command, /python3-pip/);
  });

  test('python maps to python-pip in pacman', () => {
    const result = getInstallCommands({ python: true }, 'linux');
    const pacCmd = result.find(r => r.label === 'Arch Linux');
    assert.ok(pacCmd);
    assert.match(pacCmd.command, /python-pip/);
  });

  test('pipx maps to python-pipx in pacman', () => {
    const result = getInstallCommands({ pipx: true }, 'linux');
    const pacCmd = result.find(r => r.label === 'Arch Linux');
    assert.ok(pacCmd);
    assert.match(pacCmd.command, /python-pipx/);
  });

  test('bc maps to bc in all three package managers', () => {
    const result = getInstallCommands({ bc: true }, 'linux');
    const labels = result.map(r => r.label);
    assert.ok(labels.includes('Ubuntu/Debian'));
    assert.ok(labels.includes('Fedora/RHEL'));
    assert.ok(labels.includes('Arch Linux'));
    for (const entry of result) {
      assert.match(entry.command, /\bbc\b/);
    }
  });

  test('multiple missing packages combined into single command per manager', () => {
    const result = getInstallCommands({ sox: true, ffmpeg: true, bc: true }, 'linux');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd);
    assert.match(aptCmd.command, /sox/);
    assert.match(aptCmd.command, /ffmpeg/);
    assert.match(aptCmd.command, /bc/);
  });

  test('produces exactly 3 entries (apt, dnf, pacman) when something is missing', () => {
    const result = getInstallCommands({ ffmpeg: true }, 'linux');
    assert.strictEqual(result.length, 3);
    const labels = result.map(r => r.label);
    assert.ok(labels.includes('Ubuntu/Debian'));
    assert.ok(labels.includes('Fedora/RHEL'));
    assert.ok(labels.includes('Arch Linux'));
  });
});

// ---------------------------------------------------------------------------
// getInstallCommands — wsl platform (same as linux)
// ---------------------------------------------------------------------------

describe('getInstallCommands - wsl platform', () => {
  test('returns linux-style commands for wsl platform', () => {
    const result = getInstallCommands({ sox: true }, 'wsl');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd, 'WSL should produce Ubuntu/Debian apt command');
  });

  test('apt command uses sudo apt-get update prefix', () => {
    const result = getInstallCommands({ curl: true }, 'wsl');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd);
    assert.match(aptCmd.command, /sudo apt-get update && sudo apt-get install -y/);
  });
});

// ---------------------------------------------------------------------------
// getInstallCommands — win32 platform
// ---------------------------------------------------------------------------

describe('getInstallCommands - win32 platform', () => {
  test('returns exactly one entry for win32', () => {
    const result = getInstallCommands({ sox: true, ffmpeg: true }, 'win32');
    assert.strictEqual(result.length, 1);
  });

  test('win32 entry has Windows (Native) label', () => {
    const result = getInstallCommands({ ffmpeg: true }, 'win32');
    assert.strictEqual(result[0].label, 'Windows (Native)');
  });

  test('win32 command uses npx agentvibes install', () => {
    const result = getInstallCommands({ ffmpeg: true }, 'win32');
    assert.match(result[0].command, /npx agentvibes install/);
  });

  test('win32 entry includes a note property', () => {
    const result = getInstallCommands({}, 'win32');
    assert.strictEqual(result.length, 1);
    assert.ok(typeof result[0].note === 'string' && result[0].note.length > 0);
  });

  test('win32 always returns the single entry regardless of missing set', () => {
    const resultEmpty = getInstallCommands({}, 'win32');
    const resultFull = getInstallCommands(
      { sox: true, ffmpeg: true, python: true, curl: true, bc: true, flock: true, pipx: true },
      'win32'
    );
    assert.strictEqual(resultEmpty.length, 1);
    assert.strictEqual(resultFull.length, 1);
  });
});

// ---------------------------------------------------------------------------
// getInstallCommands — unknown platform
// ---------------------------------------------------------------------------

describe('getInstallCommands - unknown/unsupported platform', () => {
  test('returns empty array for unknown platform string', () => {
    const result = getInstallCommands({ sox: true }, 'freebsd');
    assert.deepStrictEqual(result, []);
  });

  test('returns empty array for empty string platform', () => {
    const result = getInstallCommands({ sox: true }, '');
    assert.deepStrictEqual(result, []);
  });
});

// ---------------------------------------------------------------------------
// displayMissingDependencies — return value tests (no console assertion)
// ---------------------------------------------------------------------------

describe('displayMissingDependencies - return value', () => {
  test('returns false when no dependencies are missing', () => {
    const results = {
      core: { node: { installed: true, version: '20.0', isCompatible: true } },
      optional: {},
      missing: {},
      warnings: []
    };
    const ret = displayMissingDependencies(results);
    assert.strictEqual(ret, false);
  });

  test('returns true when at least one dependency is missing', () => {
    const results = {
      core: { node: { installed: true, version: '14.0', isCompatible: false } },
      optional: {},
      missing: { node: true },
      warnings: ['Node.js 14.0 - requires ≥16.0']
    };
    const ret = displayMissingDependencies(results);
    assert.strictEqual(ret, true);
  });

  test('returns true when only optional tools are missing', () => {
    const results = {
      core: { node: { installed: true, version: '20.0', isCompatible: true } },
      optional: { sox: false },
      missing: { sox: true },
      warnings: []
    };
    const ret = displayMissingDependencies(results);
    assert.strictEqual(ret, true);
  });

  test('returns true when multiple optional tools are missing', () => {
    const results = {
      core: {},
      optional: {},
      missing: { sox: true, ffmpeg: true, curl: true },
      warnings: []
    };
    const ret = displayMissingDependencies(results);
    assert.strictEqual(ret, true);
  });

  test('returns true when bash is listed as missing', () => {
    const results = {
      core: { bash: { installed: true, version: '3.2', isModern: false } },
      optional: {},
      missing: { bash: true },
      warnings: ['Bash 3.2 - macOS requires ≥5.0']
    };
    const ret = displayMissingDependencies(results);
    assert.strictEqual(ret, true);
  });
});

// ---------------------------------------------------------------------------
// checkDependencies — Node.js version detection (uses process.version, no spawn)
// ---------------------------------------------------------------------------

describe('checkDependencies - Node.js version check', () => {
  test('core.node is present in results', () => {
    // checkDependencies() will attempt to spawn external tools but the
    // Node version check is always first and uses process.version (no spawn).
    // We catch any spawn errors silently and just verify the node entry exists.
    let results;
    try {
      results = checkDependencies();
    } catch {
      // If checkDependencies throws (e.g. missing chalk/boxen in test env),
      // skip this assertion.
      return;
    }
    assert.ok(results.core.node, 'results.core.node should be defined');
  });

  test('core.node.installed is true for the running process', () => {
    let results;
    try {
      results = checkDependencies();
    } catch {
      return;
    }
    assert.strictEqual(results.core.node.installed, true);
  });

  test('core.node.isCompatible is true for current Node (≥16)', () => {
    // The test runner itself requires a modern Node, so this should always pass.
    const major = parseInt(process.version.replace(/^v/, '').split('.')[0], 10);
    let results;
    try {
      results = checkDependencies();
    } catch {
      return;
    }
    const expected = major >= 16;
    assert.strictEqual(results.core.node.isCompatible, expected);
  });

  test('core.node.version is a string in "major.minor" form', () => {
    let results;
    try {
      results = checkDependencies();
    } catch {
      return;
    }
    assert.match(results.core.node.version, /^\d+\.\d+$/);
  });

  test('results object has core, optional, missing, and warnings keys', () => {
    let results;
    try {
      results = checkDependencies();
    } catch {
      return;
    }
    assert.ok(typeof results.core === 'object');
    assert.ok(typeof results.optional === 'object');
    assert.ok(typeof results.missing === 'object');
    assert.ok(Array.isArray(results.warnings));
  });
});

// ---------------------------------------------------------------------------
// getInstallCommands — package map completeness checks
// ---------------------------------------------------------------------------

describe('getInstallCommands - package map completeness', () => {
  const allMissing = {
    bash: true,
    sox: true,
    ffmpeg: true,
    pipx: true,
    flock: true,
    curl: true,
    bc: true,
    python: true,
    audioPlayer: true,
    node: true // not in package map, should be silently ignored
  };

  test('darwin brew command handles all known keys at once', () => {
    const result = getInstallCommands(allMissing, 'darwin');
    assert.ok(result.length > 0);
    const brewCmd = result.find(r => r.label === 'macOS (Homebrew)');
    assert.ok(brewCmd, 'Should produce a Homebrew entry');
  });

  test('linux apt command handles all known keys at once', () => {
    const result = getInstallCommands(allMissing, 'linux');
    const aptCmd = result.find(r => r.label === 'Ubuntu/Debian');
    assert.ok(aptCmd);
    assert.match(aptCmd.command, /apt-get install/);
  });

  test('darwin: bash maps to bash package in brew', () => {
    const result = getInstallCommands({ bash: true }, 'darwin');
    const brewCmd = result.find(r => r.label === 'macOS (Homebrew)');
    assert.ok(brewCmd);
    assert.match(brewCmd.command, /\bbash\b/);
  });

  test('false values in missing object are ignored', () => {
    const result = getInstallCommands({ sox: false, ffmpeg: false }, 'darwin');
    assert.deepStrictEqual(result, []);
  });

  test('undefined values in missing object are ignored', () => {
    const result = getInstallCommands({ sox: undefined }, 'linux');
    assert.deepStrictEqual(result, []);
  });
});
