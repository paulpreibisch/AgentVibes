/**
 * Tests for bmad-detector.js
 *
 * Covers:
 * - detectBMAD() returns not-found for an empty directory
 * - detectBMAD() detects v6 via .bmad/_cfg/manifest.yaml
 * - detectBMAD() detects v6 via bmad/_cfg/manifest.yaml
 * - detectBMAD() detects v6 via _bmad/_cfg/manifest.yaml
 * - detectBMAD() detects v6 via _bmad/_config/manifest.yaml
 * - detectBMAD() reads version from manifest YAML correctly
 * - detectBMAD() returns correct bmadPath in result
 * - detectBMAD() detects v4 (legacy .bmad-core) as fallback
 * - getBMADConfigPath() returns configPath when installed
 * - getBMADConfigPath() returns null when not installed
 *
 * Uses real temporary directories and real YAML files so that fs.access
 * behaves exactly as in production.
 */

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { detectBMAD, getBMADConfigPath } from '../../src/bmad-detector.js';

// Some CI machines and dev systems have BMAD installed globally at ~/_bmad.
// detectBMAD() finds it for ANY target directory (since it always checks homedir).
// We detect this up-front so tests can adjust assertions accordingly.
const HAS_GLOBAL_BMAD = await (async () => {
  const candidates = [
    path.join(os.homedir(), '_bmad', '_config', 'manifest.yaml'),
    path.join(os.homedir(), '_bmad', '_cfg',    'manifest.yaml'),
    path.join(os.homedir(), '.bmad', '_cfg',    'manifest.yaml'),
  ];
  for (const p of candidates) {
    try { fs.accessSync(p); return true; } catch { /* continue */ }
  }
  return false;
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temp dir and track it for cleanup. */
const tempDirs = [];

function makeTmpDir(suffix = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `agentvibes-bmad-test${suffix}-`));
  tempDirs.push(dir);
  return dir;
}

/** Write a file, creating parent directories as needed. */
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

/** Minimal valid v6 manifest YAML. */
function v6Manifest(version = '6.1.0') {
  return `installation:\n  version: "${version}"\n`;
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Suite: not installed
// ---------------------------------------------------------------------------

describe('detectBMAD — not installed', () => {
  test('returns installed:false for an empty directory', async () => {
    const dir = makeTmpDir('-empty');
    const result = await detectBMAD(dir);
    if (HAS_GLOBAL_BMAD) {
      // Global BMAD at ~/_bmad takes effect for any directory — function returns
      // isGlobal:true instead of installed:false.
      assert.strictEqual(result.installed, true);
      assert.strictEqual(result.isGlobal, true);
    } else {
      assert.strictEqual(result.installed, false);
      assert.strictEqual(result.version, null);
    }
  });

  test('returns no version property when not installed', async () => {
    const dir = makeTmpDir('-no-version');
    const result = await detectBMAD(dir);
    if (HAS_GLOBAL_BMAD) {
      // Global BMAD detected — version will be 6, not null.
      assert.strictEqual(result.isGlobal, true);
      assert.ok(result.version !== null, 'global BMAD detected so version is set');
    } else {
      assert.ok(!result.version, 'version should be null/undefined when not installed');
    }
  });
});

// ---------------------------------------------------------------------------
// Suite: v6 detection — .bmad/_cfg/manifest.yaml
// ---------------------------------------------------------------------------

describe('detectBMAD — v6 via .bmad/_cfg/manifest.yaml', () => {
  test('detects v6 when .bmad/_cfg/manifest.yaml exists', async () => {
    const dir = makeTmpDir('-dotbmad');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.strictEqual(result.installed, true);
    assert.strictEqual(result.version, 6);
  });

  test('bmadPath ends with .bmad for .bmad/_cfg variant', async () => {
    const dir = makeTmpDir('-dotbmad-path');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.ok(result.bmadPath.endsWith('.bmad'),
      `Expected bmadPath to end with .bmad, got: ${result.bmadPath}`);
  });

  test('manifestPath points to the manifest file for .bmad variant', async () => {
    const dir = makeTmpDir('-dotbmad-manifest');
    const manifestPath = path.join(dir, '.bmad/_cfg/manifest.yaml');
    writeFile(manifestPath, v6Manifest());
    const result = await detectBMAD(dir);
    assert.strictEqual(result.manifestPath, manifestPath);
  });

  test('configPath points to .bmad/core/config.yaml', async () => {
    const dir = makeTmpDir('-dotbmad-config');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    const expected = path.join(dir, '.bmad', 'core', 'config.yaml');
    assert.strictEqual(result.configPath, expected);
  });
});

// ---------------------------------------------------------------------------
// Suite: v6 detection — bmad/_cfg/manifest.yaml
// ---------------------------------------------------------------------------

describe('detectBMAD — v6 via bmad/_cfg/manifest.yaml', () => {
  test('detects v6 when bmad/_cfg/manifest.yaml exists', async () => {
    const dir = makeTmpDir('-bmad');
    writeFile(path.join(dir, 'bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.strictEqual(result.installed, true);
    assert.strictEqual(result.version, 6);
  });

  test('bmadPath ends with bmad for bmad/_cfg variant', async () => {
    const dir = makeTmpDir('-bmad-path');
    writeFile(path.join(dir, 'bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.ok(result.bmadPath.endsWith('bmad') && !result.bmadPath.endsWith('_bmad'),
      `Expected bmadPath to end with 'bmad', got: ${result.bmadPath}`);
  });

  test('configPath points to bmad/core/config.yaml', async () => {
    const dir = makeTmpDir('-bmad-config');
    writeFile(path.join(dir, 'bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    const expected = path.join(dir, 'bmad', 'core', 'config.yaml');
    assert.strictEqual(result.configPath, expected);
  });
});

// ---------------------------------------------------------------------------
// Suite: v6 detection — _bmad/_cfg/manifest.yaml
// ---------------------------------------------------------------------------

describe('detectBMAD — v6 via _bmad/_cfg/manifest.yaml', () => {
  test('detects v6 when _bmad/_cfg/manifest.yaml exists', async () => {
    const dir = makeTmpDir('-underbmad');
    writeFile(path.join(dir, '_bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.strictEqual(result.installed, true);
    assert.strictEqual(result.version, 6);
  });

  test('bmadPath ends with _bmad for _bmad/_cfg variant', async () => {
    const dir = makeTmpDir('-underbmad-path');
    writeFile(path.join(dir, '_bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.ok(result.bmadPath.endsWith('_bmad'),
      `Expected bmadPath to end with _bmad, got: ${result.bmadPath}`);
  });

  test('configPath points to _bmad/core/config.yaml', async () => {
    const dir = makeTmpDir('-underbmad-config');
    writeFile(path.join(dir, '_bmad/_cfg/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    const expected = path.join(dir, '_bmad', 'core', 'config.yaml');
    assert.strictEqual(result.configPath, expected);
  });
});

// ---------------------------------------------------------------------------
// Suite: v6 detection — _bmad/_config/manifest.yaml (alternate cfg path)
// ---------------------------------------------------------------------------

describe('detectBMAD — v6 via _bmad/_config/manifest.yaml', () => {
  test('detects v6 when _bmad/_config/manifest.yaml exists', async () => {
    const dir = makeTmpDir('-underbmad-config-alt');
    writeFile(path.join(dir, '_bmad/_config/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.strictEqual(result.installed, true);
    assert.strictEqual(result.version, 6);
  });

  test('bmadPath ends with _bmad for _bmad/_config variant', async () => {
    const dir = makeTmpDir('-underbmad-config-alt-path');
    writeFile(path.join(dir, '_bmad/_config/manifest.yaml'), v6Manifest());
    const result = await detectBMAD(dir);
    assert.ok(result.bmadPath.endsWith('_bmad'),
      `Expected bmadPath to end with _bmad, got: ${result.bmadPath}`);
  });
});

// ---------------------------------------------------------------------------
// Suite: version read from YAML
// ---------------------------------------------------------------------------

describe('detectBMAD — version read from manifest YAML', () => {
  test('reads detailedVersion from installation.version field', async () => {
    const dir = makeTmpDir('-version');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest('6.3.2'));
    const result = await detectBMAD(dir);
    assert.strictEqual(result.detailedVersion, '6.3.2');
  });

  test('falls back to 6.0.0-alpha.x when installation.version is absent', async () => {
    const dir = makeTmpDir('-version-fallback');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), 'installation:\n  name: "bmad"\n');
    const result = await detectBMAD(dir);
    assert.strictEqual(result.detailedVersion, '6.0.0-alpha.x');
  });

  test('falls back to 6.0.0-alpha.x when manifest has no installation key', async () => {
    const dir = makeTmpDir('-version-no-install');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), 'name: "bmad"\n');
    const result = await detectBMAD(dir);
    assert.strictEqual(result.detailedVersion, '6.0.0-alpha.x');
  });

  test('version is always 6 (numeric) for v6 manifests', async () => {
    const dir = makeTmpDir('-version-numeric');
    writeFile(path.join(dir, '_bmad/_cfg/manifest.yaml'), v6Manifest('6.5.0'));
    const result = await detectBMAD(dir);
    assert.strictEqual(result.version, 6);
  });
});

// ---------------------------------------------------------------------------
// Suite: search priority — .bmad wins over bmad and _bmad
// ---------------------------------------------------------------------------

describe('detectBMAD — search order priority', () => {
  test('.bmad/_cfg takes priority over bmad/_cfg when both exist', async () => {
    const dir = makeTmpDir('-priority');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest('6.1.0'));
    writeFile(path.join(dir, 'bmad/_cfg/manifest.yaml'), v6Manifest('6.2.0'));
    const result = await detectBMAD(dir);
    // .bmad is checked first, so detailedVersion from .bmad manifest wins
    assert.strictEqual(result.detailedVersion, '6.1.0');
    assert.ok(result.bmadPath.endsWith('.bmad'));
  });
});

// ---------------------------------------------------------------------------
// Suite: v4 legacy detection
// ---------------------------------------------------------------------------

describe('detectBMAD — v4 legacy via .bmad-core/install-manifest.yaml', () => {
  // When global BMAD v6 is installed at ~/_bmad, detectBMAD() finds it before
  // the project-local v4 manifest, making pure v4-only assertions unreliable.
  // Skip those tests on machines with global BMAD; they still run in CI without it.
  const skipIfGlobal = HAS_GLOBAL_BMAD ? 'global BMAD v6 takes precedence over project v4' : false;

  test('detects v4 when .bmad-core/install-manifest.yaml exists', { skip: skipIfGlobal }, async () => {
    const dir = makeTmpDir('-v4');
    writeFile(path.join(dir, '.bmad-core/install-manifest.yaml'), 'version: "4.5"\n');
    const result = await detectBMAD(dir);
    assert.strictEqual(result.installed, true);
    assert.strictEqual(result.version, 4);
  });

  test('detailedVersion is 4.x for v4', { skip: skipIfGlobal }, async () => {
    const dir = makeTmpDir('-v4-detailed');
    writeFile(path.join(dir, '.bmad-core/install-manifest.yaml'), '');
    const result = await detectBMAD(dir);
    assert.strictEqual(result.detailedVersion, '4.x');
  });

  test('bmadPath points to .bmad-core directory for v4', { skip: skipIfGlobal }, async () => {
    const dir = makeTmpDir('-v4-path');
    writeFile(path.join(dir, '.bmad-core/install-manifest.yaml'), '');
    const result = await detectBMAD(dir);
    assert.ok(result.bmadPath.endsWith('.bmad-core'),
      `Expected bmadPath to end with .bmad-core, got: ${result.bmadPath}`);
  });

  test('configPath points to .bmad-core/config.yaml for v4', { skip: skipIfGlobal }, async () => {
    const dir = makeTmpDir('-v4-config');
    writeFile(path.join(dir, '.bmad-core/install-manifest.yaml'), '');
    const result = await detectBMAD(dir);
    const expected = path.join(dir, '.bmad-core', 'config.yaml');
    assert.strictEqual(result.configPath, expected);
  });

  test('v4 is used as fallback when no v6 manifest is found', { skip: skipIfGlobal }, async () => {
    const dir = makeTmpDir('-v4-fallback');
    // No v6 manifest — only v4
    writeFile(path.join(dir, '.bmad-core/install-manifest.yaml'), '');
    const result = await detectBMAD(dir);
    assert.strictEqual(result.version, 4);
  });

  test('v6 wins over v4 when both are present', async () => {
    const dir = makeTmpDir('-v6-over-v4');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest('6.0.0'));
    writeFile(path.join(dir, '.bmad-core/install-manifest.yaml'), '');
    const result = await detectBMAD(dir);
    assert.strictEqual(result.version, 6);
  });
});

// ---------------------------------------------------------------------------
// Suite: getBMADConfigPath helper
// ---------------------------------------------------------------------------

describe('getBMADConfigPath', () => {
  test('returns configPath when detection says installed', async () => {
    const dir = makeTmpDir('-config-path');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest());
    const detection = await detectBMAD(dir);
    const configPath = getBMADConfigPath(detection);
    assert.strictEqual(configPath, detection.configPath);
    assert.ok(typeof configPath === 'string' && configPath.length > 0);
  });

  test('returns null when detection says not installed', () => {
    const detection = { installed: false, version: null };
    assert.strictEqual(getBMADConfigPath(detection), null);
  });

  test('configPath includes the expected directory name for .bmad', async () => {
    const dir = makeTmpDir('-config-path-dir');
    writeFile(path.join(dir, '.bmad/_cfg/manifest.yaml'), v6Manifest());
    const detection = await detectBMAD(dir);
    const configPath = getBMADConfigPath(detection);
    assert.ok(configPath.includes('.bmad'),
      `Expected configPath to include .bmad, got: ${configPath}`);
  });

  test('configPath includes core/config.yaml for v6', async () => {
    const dir = makeTmpDir('-config-path-v6');
    writeFile(path.join(dir, '_bmad/_cfg/manifest.yaml'), v6Manifest());
    const detection = await detectBMAD(dir);
    const configPath = getBMADConfigPath(detection);
    assert.ok(configPath.endsWith(path.join('core', 'config.yaml')),
      `Expected configPath to end with core/config.yaml, got: ${configPath}`);
  });
});
