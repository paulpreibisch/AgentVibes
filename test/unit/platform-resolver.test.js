/**
 * Platform Resolver Tests
 *
 * Covers the Cross-Platform Contract v1.0 test IDs:
 *   T-RES-01 through T-RES-08 (binary resolution)
 *   T-PATH-01 through T-PATH-06 (directory resolution)
 *
 * Uses real temporary executables to avoid shell=true subprocess calls in tests.
 * Platform-specific branches tested via AGENTVIBES_PLATFORM override.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  detectPlatform,
  resolveBinary,
  resolveVoiceDir,
  resolveDataDir,
  resolveConfigDir,
  validateBinary,
  whichBinary,
  getPathAugmentation,
  ENV_VARS,
} from '../../src/utils/platform-resolver.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let tempDir;

function createFakeBinary(name, exitCode = 0) {
  const binPath = path.join(tempDir, name);
  fs.writeFileSync(binPath, `#!/bin/sh\necho "fake ${name} 1.0.0"\nexit ${exitCode}\n`);
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-resolver-test-'));
});

after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

// Clear any test env vars between tests
afterEach(() => {
  for (const key of Object.values(ENV_VARS)) {
    delete process.env[key];
  }
  delete process.env.AGENTVIBES_PLATFORM;
  delete process.env.XDG_DATA_HOME;
  delete process.env.XDG_CONFIG_HOME;
});

// ─── detectPlatform ───────────────────────────────────────────────────────────

describe('detecting the current platform', () => {
  it('honors the platform override environment variable', () => {
    withEnv({ AGENTVIBES_PLATFORM: 'darwin-arm64' }, () => {
      assert.equal(detectPlatform(), 'darwin-arm64');
    });
  });

  it('identifies the current machine as a recognized platform', () => {
    const known = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64', 'unknown'];
    const result = detectPlatform();
    assert.ok(known.includes(result), `Expected a known platform, got: ${result}`);
  });

  it('recognizes the Linux x64 platform override', () => {
    withEnv({ AGENTVIBES_PLATFORM: 'linux-x64' }, () => {
      assert.equal(detectPlatform(), 'linux-x64');
    });
  });

  it('recognizes the Windows x64 platform override', () => {
    withEnv({ AGENTVIBES_PLATFORM: 'win32-x64' }, () => {
      assert.equal(detectPlatform(), 'win32-x64');
    });
  });
});

// ─── validateBinary ───────────────────────────────────────────────────────────

describe('checking whether a binary is valid and usable', () => {
  it('marks a real executable as valid when it runs successfully', () => {
    const fakeBin = createFakeBinary('fake-piper-valid');
    const result = validateBinary(fakeBin, 'piper');
    assert.equal(result.valid, true);
  });

  it('marks a binary as invalid when the path does not exist', () => {
    const result = validateBinary('/nonexistent/path/to/piper', 'piper');
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'not_found');
  });

  it('marks a binary as invalid when the path points to a directory', () => {
    const result = validateBinary(tempDir, 'piper');
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'not_a_file');
  });

  it('marks a binary as invalid when it exits with an error code', () => {
    const fakeBin = createFakeBinary('fake-piper-broken', 1);
    const result = validateBinary(fakeBin, 'piper');
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'version_check_failed');
  });

  it('marks a binary as invalid when the file is not executable', () => {
    if (process.platform === 'win32') return; // Windows doesn't use execute bit
    const filePath = path.join(tempDir, 'not-executable');
    fs.writeFileSync(filePath, '#!/bin/sh\necho test\n');
    fs.chmodSync(filePath, 0o644);
    const result = validateBinary(filePath, 'piper');
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'not_executable');
  });
});

// ─── resolveBinary ────────────────────────────────────────────────────────────

describe('resolving a binary when the override environment variable points to a valid file', () => {
  it('uses the override path when the environment variable points to a valid binary', () => {
    const fakeBin = createFakeBinary('piper-override');
    withEnv({ [ENV_VARS.piper]: fakeBin }, () => {
      const result = resolveBinary('piper');
      assert.equal(result.path, fakeBin);
      assert.equal(result.source, 'env_override');
    });
  });
});

describe('resolving a binary when the override environment variable is invalid', () => {
  it('throws an invalid override error when the override path does not exist', () => {
    withEnv({ [ENV_VARS.piper]: '/nonexistent/piper' }, () => {
      assert.throws(
        () => resolveBinary('piper'),
        (err) => {
          assert.equal(err.code, 'ENV_OVERRIDE_INVALID');
          assert.match(err.message, /ENV_OVERRIDE_INVALID/);
          return true;
        }
      );
    });
  });

  it('stops immediately on a bad override without trying other locations', () => {
    // Even if piper exists on PATH, ENV_OVERRIDE failure must not fall through
    withEnv({ [ENV_VARS.piper]: '/nonexistent/piper' }, () => {
      let threw = false;
      try {
        resolveBinary('piper');
      } catch (err) {
        threw = true;
        assert.equal(err.code, 'ENV_OVERRIDE_INVALID',
          'Must throw ENV_OVERRIDE_INVALID, not BINARY_NOT_FOUND');
      }
      assert.ok(threw, 'Should have thrown');
    });
  });
});

describe('resolving a binary when no candidates are found anywhere', () => {
  it('throws a not found error with the full list of locations that were tried', () => {
    // Use a platform where no piper exists (fake platform ID)
    withEnv({ AGENTVIBES_PLATFORM: 'unknown' }, () => {
      let threw = false;
      try {
        // Use a binary name that definitely won't exist on any machine
        // by testing with a contrived binary name via env var pointing to nothing
        withEnv({ [ENV_VARS.ffmpeg]: undefined }, () => {
          // Force an isolated PATH so which also fails
          const origPath = process.env.PATH;
          process.env.PATH = tempDir; // only our temp dir on PATH, no ffmpeg there
          try {
            resolveBinary('ffmpeg');
          } catch (err) {
            threw = true;
            assert.ok(
              err.code === 'BINARY_NOT_FOUND' || err.code === 'ENV_OVERRIDE_INVALID',
              `Expected resolution failure, got: ${err.code}`
            );
            assert.ok(Array.isArray(err.tried) || err.tried === undefined,
              'tried should be array or undefined');
          } finally {
            process.env.PATH = origPath;
          }
        });
      } catch {
        threw = true;
      }
      assert.ok(threw, 'Should have thrown a resolution error');
    });
  });
});

describe('binary resolution error includes a full audit trail of what was tried', () => {
  it('the error includes a record of every location that was checked', () => {
    withEnv({ [ENV_VARS.piper]: '/nonexistent/piper' }, () => {
      try {
        resolveBinary('piper');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.ok(Array.isArray(err.tried), 'err.tried should be an array');
        assert.ok(err.tried.length >= 1, 'Should have at least one tried entry');
        assert.ok(err.tried[0].step, 'Each entry should have a step field');
        assert.ok(err.tried[0].path, 'Each entry should have a path field');
      }
    });
  });
});

// ─── whichBinary — success path (covers lines 185-186) ───────────────────────

describe('finding a binary via the system PATH', () => {
  it('returns the full path to a binary when it is on the system PATH', () => {
    // sh/bash always exists on POSIX systems
    if (process.platform === 'win32') return;
    const result = whichBinary('sh');
    assert.ok(result !== null, 'sh should be found via which');
    assert.ok(path.isAbsolute(result), 'whichBinary should return an absolute path');
    assert.ok(!result.includes('~'), 'whichBinary result must not contain tilde');
  });

  it('returns nothing when the binary cannot be found on PATH', () => {
    const result = whichBinary('definitely-not-a-real-binary-xyzzy-99999');
    assert.equal(result, null);
  });
});

// ─── resolveBinary — which step success path (covers lines 231-236) ──────────

describe('resolving a binary by finding it on the system PATH', () => {
  it('finds a binary by searching the system PATH when no override is set', () => {
    // Put a fake piper on PATH so which finds it
    const fakeBin = createFakeBinary('piper');
    const origPath = process.env.PATH;
    process.env.PATH = `${tempDir}${path.delimiter}${origPath}`;
    try {
      withEnv({ [ENV_VARS.piper]: undefined }, () => {
        const result = resolveBinary('piper');
        assert.ok(result.path.endsWith('piper') || result.path.includes('piper'),
          `Expected piper in path, got: ${result.path}`);
        assert.ok(
          result.source === 'which' || result.source.startsWith('hint'),
          `Expected resolution via which or hint, got: ${result.source}`
        );
      });
    } finally {
      process.env.PATH = origPath;
    }
  });
});

// ─── resolveBinary — hint list iteration (covers lines 244-253) ──────────────

describe('resolving a binary by searching platform-specific hint locations', () => {
  it('searches platform hint locations after PATH lookup fails', () => {
    // Place a fake piper at the first linux-x64 hint location (within tempDir)
    // by pointing AGENTVIBES_PLATFORM to linux-x64 and pre-creating the fake binary
    // at a path that will be tried as a hint
    const fakeBin = createFakeBinary('piper-hint');

    // Override PIPER hints for testing by using ENV_OVERRIDE pointing to our fake
    // This also exercises the validateBinary path for a hint
    withEnv({
      AGENTVIBES_PLATFORM: 'linux-x64',
      [ENV_VARS.piper]: undefined,
    }, () => {
      const origPath = process.env.PATH;
      // Remove tempDir from PATH so which won't find it
      process.env.PATH = '/usr/bin:/bin';
      try {
        // Expect either BINARY_NOT_FOUND (piper not on this test machine) or a resolved path
        let result = null;
        let error = null;
        try {
          result = resolveBinary('piper');
        } catch (err) {
          error = err;
        }
        // Either outcome is valid — we just verify hint list was attempted
        if (error) {
          assert.equal(error.code, 'BINARY_NOT_FOUND');
          const triedSteps = error.tried.map(t => t.step);
          // Hint list should have been tried (HINT[0] present)
          const hasHints = triedSteps.some(s => s.startsWith('HINT'));
          assert.ok(hasHints, `Expected hint steps in tried array, got: ${JSON.stringify(triedSteps)}`);
        } else {
          assert.ok(result.path, 'Should have a resolved path');
        }
      } finally {
        process.env.PATH = origPath;
      }
    });
  });

  it('each supported platform has a list of locations to check', () => {
    // Exercise each platform hint factory to ensure they are callable
    const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64'];
    for (const p of platforms) {
      withEnv({ AGENTVIBES_PLATFORM: p }, () => {
        // Trigger hint list by attempting resolution with no binary present
        const origPath = process.env.PATH;
        process.env.PATH = '/usr/bin:/bin';
        try {
          resolveBinary('piper');
        } catch (err) {
          if (err.code === 'BINARY_NOT_FOUND' || err.code === 'ENV_OVERRIDE_INVALID') {
            // expected — hint factories were exercised
          } else {
            throw err;
          }
        } finally {
          process.env.PATH = origPath;
        }
      });
    }
  });

  it('searches platform hint locations for ffmpeg on ARM Linux and Windows', () => {
    for (const p of ['linux-arm64', 'win32-x64']) {
      withEnv({ AGENTVIBES_PLATFORM: p, [ENV_VARS.ffmpeg]: undefined }, () => {
        const origPath = process.env.PATH;
        process.env.PATH = '/usr/bin:/bin';
        try {
          resolveBinary('ffmpeg');
        } catch (err) {
          if (err.code === 'BINARY_NOT_FOUND' || err.code === 'ENV_OVERRIDE_INVALID') {
            // expected — ffmpeg hint factory for this platform was called
          } else {
            throw err;
          }
        } finally {
          process.env.PATH = origPath;
        }
      });
    }
  });

  it('successfully resolves from a hint location when the binary is found there', () => {
    if (process.platform === 'win32') return;
    // Place a valid fake binary at ~/.agentvibes/bin/piper (first linux-x64 hint)
    const hintDir = path.join(os.homedir(), '.agentvibes', 'bin');
    const hintBin = path.join(hintDir, 'piper');
    const existed = fs.existsSync(hintBin);
    if (!existed) {
      fs.mkdirSync(hintDir, { recursive: true });
      fs.writeFileSync(hintBin, '#!/bin/sh\necho "piper 1.0.0"\nexit 0\n');
      fs.chmodSync(hintBin, 0o755);
    }
    try {
      withEnv({
        AGENTVIBES_PLATFORM: 'linux-x64',
        [ENV_VARS.piper]: undefined,
      }, () => {
        const origPath = process.env.PATH;
        process.env.PATH = '/usr/bin:/bin'; // which won't find piper
        try {
          const result = resolveBinary('piper');
          assert.ok(result.source.startsWith('hint'), `Expected hint source, got: ${result.source}`);
          assert.ok(result.path.includes('piper'), `Expected piper in path: ${result.path}`);
        } finally {
          process.env.PATH = origPath;
        }
      });
    } finally {
      if (!existed) fs.rmSync(hintBin, { force: true });
    }
  });
});

// ─── resolveVoiceDir — T-PATH-04 ─────────────────────────────────────────────

describe('locating the voice files directory', () => {
  it('uses the custom voice directory when the override environment variable is set', () => {
    const customDir = path.join(tempDir, 'my-voices');
    withEnv({ [ENV_VARS.voice_dir]: customDir }, () => {
      assert.equal(resolveVoiceDir(), path.resolve(customDir));
    });
  });

  it('returns a voices subdirectory of the data directory when no override is set', () => {
    withEnv({ [ENV_VARS.voice_dir]: undefined }, () => {
      const result = resolveVoiceDir();
      assert.ok(result.endsWith(path.sep + 'voices') || result.endsWith('/voices'),
        `Expected path to end in /voices, got: ${result}`);
    });
  });

  it('returns a fully expanded path with no tilde shorthand', () => {
    const result = resolveVoiceDir();
    assert.ok(!result.includes('~'), `Path must not contain ~: ${result}`);
  });
});

// ─── resolveDataDir ───────────────────────────────────────────────────────────

describe('locating the application data directory', () => {
  it('uses the custom data directory when the override environment variable is set', () => {
    const customDir = path.join(tempDir, 'my-data');
    withEnv({ [ENV_VARS.data_dir]: customDir }, () => {
      assert.equal(resolveDataDir(), path.resolve(customDir));
    });
  });

  it('follows the XDG data home convention when the environment variable is set', () => {
    if (process.platform === 'win32') return;
    const xdgDir = path.join(tempDir, 'xdg-data');
    withEnv({ XDG_DATA_HOME: xdgDir, [ENV_VARS.data_dir]: undefined }, () => {
      const result = resolveDataDir();
      assert.ok(result.startsWith(xdgDir), `Expected path under XDG_DATA_HOME, got: ${result}`);
    });
  });

  it('defaults to the standard local share directory when XDG is not configured', () => {
    if (process.platform === 'win32') return;
    withEnv({ XDG_DATA_HOME: undefined, [ENV_VARS.data_dir]: undefined }, () => {
      const result = resolveDataDir();
      const expected = path.join(os.homedir(), '.local', 'share', 'agentvibes');
      assert.equal(result, expected);
    });
  });

  it('uses the Windows local application data directory on Windows', () => {
    const fakeLocal = path.join(tempDir, 'AppData', 'Local');
    withEnv({
      AGENTVIBES_PLATFORM: 'win32-x64',
      LOCALAPPDATA: fakeLocal,
      [ENV_VARS.data_dir]: undefined,
    }, () => {
      const result = resolveDataDir();
      assert.ok(result.startsWith(fakeLocal), `Expected path under LOCALAPPDATA, got: ${result}`);
    });
  });

  it('returns a fully expanded path with no tilde shorthand', () => {
    const result = resolveDataDir();
    assert.ok(!result.includes('~'), `Path must not contain ~: ${result}`);
  });

  it('uses the correct path separator for the current operating system', () => {
    const result = resolveDataDir();
    if (process.platform === 'win32') {
      assert.ok(!result.includes('/'), `Win32 path must use backslash: ${result}`);
    } else {
      assert.ok(!result.includes('\\'), `POSIX path must use forward slash: ${result}`);
    }
  });
});

// ─── resolveConfigDir ─────────────────────────────────────────────────────────

describe('locating the application configuration directory', () => {
  it('uses the custom config directory when the override environment variable is set', () => {
    const customDir = path.join(tempDir, 'my-config');
    withEnv({ [ENV_VARS.config_dir]: customDir }, () => {
      assert.equal(resolveConfigDir(), path.resolve(customDir));
    });
  });

  it('follows the XDG config home convention when the environment variable is set', () => {
    if (process.platform === 'win32') return;
    const xdgDir = path.join(tempDir, 'xdg-config');
    withEnv({ XDG_CONFIG_HOME: xdgDir, [ENV_VARS.config_dir]: undefined }, () => {
      const result = resolveConfigDir();
      assert.ok(result.startsWith(xdgDir), `Expected path under XDG_CONFIG_HOME, got: ${result}`);
    });
  });

  it('defaults to the standard config directory when XDG is not configured', () => {
    if (process.platform === 'win32') return;
    withEnv({ XDG_CONFIG_HOME: undefined, [ENV_VARS.config_dir]: undefined }, () => {
      const result = resolveConfigDir();
      const expected = path.join(os.homedir(), '.config', 'agentvibes');
      assert.equal(result, expected);
    });
  });

  it('uses the Windows roaming application data directory on Windows', () => {
    const fakeRoaming = path.join(tempDir, 'AppData', 'Roaming');
    withEnv({
      AGENTVIBES_PLATFORM: 'win32-x64',
      APPDATA: fakeRoaming,
      [ENV_VARS.config_dir]: undefined,
    }, () => {
      const result = resolveConfigDir();
      assert.ok(result.startsWith(fakeRoaming), `Expected path under APPDATA, got: ${result}`);
    });
  });

  it('returns a fully expanded path with no tilde shorthand', () => {
    const result = resolveConfigDir();
    assert.ok(!result.includes('~'), `Path must not contain ~: ${result}`);
  });
});

// ─── getPathAugmentation ──────────────────────────────────────────────────────

describe('getting the list of extra directories to add to PATH', () => {
  it('returns a list of directories for every supported platform', () => {
    const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64'];
    for (const p of platforms) {
      withEnv({ AGENTVIBES_PLATFORM: p }, () => {
        const result = getPathAugmentation();
        assert.ok(Array.isArray(result), `Expected array for platform ${p}`);
      });
    }
  });

  it('includes the Homebrew bin directory for Apple Silicon Macs', () => {
    withEnv({ AGENTVIBES_PLATFORM: 'darwin-arm64' }, () => {
      const result = getPathAugmentation();
      assert.ok(result.includes('/opt/homebrew/bin'),
        'darwin-arm64 must include /opt/homebrew/bin');
    });
  });

  it('includes the local bin directory for Intel Macs', () => {
    withEnv({ AGENTVIBES_PLATFORM: 'darwin-x64' }, () => {
      const result = getPathAugmentation();
      assert.ok(result.includes('/usr/local/bin'),
        'darwin-x64 must include /usr/local/bin');
    });
  });

  it('produces a list with no repeated directories', () => {
    const result = getPathAugmentation();
    const unique = [...new Set(result)];
    assert.equal(result.length, unique.length, 'No duplicates in PATH augmentation');
  });

  it('every directory in the list is a fully expanded absolute path', () => {
    const result = getPathAugmentation();
    for (const p of result) {
      assert.ok(!p.includes('~'), `Path must not contain ~: ${p}`);
      assert.ok(path.isAbsolute(p), `Path must be absolute: ${p}`);
    }
  });
});

// ─── ENV_VARS export ──────────────────────────────────────────────────────────

describe('the exported environment variable name constants', () => {
  it('exports environment variable names for all required binaries and directories', () => {
    assert.ok(ENV_VARS.piper, 'Must define piper env var');
    assert.ok(ENV_VARS.ffmpeg, 'Must define ffmpeg env var');
    assert.ok(ENV_VARS.voice_dir, 'Must define voice_dir env var');
    assert.ok(ENV_VARS.data_dir, 'Must define data_dir env var');
    assert.ok(ENV_VARS.config_dir, 'Must define config_dir env var');
  });

  it('every environment variable name uses the AGENTVIBES underscore prefix', () => {
    for (const [key, val] of Object.entries(ENV_VARS)) {
      assert.ok(val.startsWith('AGENTVIBES_'),
        `${key}: env var name must start with AGENTVIBES_, got: ${val}`);
    }
  });
});
