/**
 * Story 7.1: Provider & Voice Settings Group
 * Tests for ConfigService read/write methods
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers

function makeTmpDir(suffix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agentvibes-cfg-test-${suffix}-`));
}

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------

describe('ConfigService — getGlobalConfig()', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('returns {} when global config file does not exist', () => {
    const homeDir = makeTmpDir('home-missing');
    try {
      const svc = new ConfigService({ homeDir, projectRoot: '/tmp/fake' });
      assert.deepStrictEqual(svc.getGlobalConfig(), {});
    } finally {
      cleanDir(homeDir);
    }
  });

  test('parses and returns global config JSON', () => {
    const homeDir = makeTmpDir('home-json');
    try {
      const cfgDir = path.join(homeDir, '.agentvibes');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(path.join(cfgDir, 'config.json'), JSON.stringify({ provider: 'soprano', version: '2.0' }));
      const svc = new ConfigService({ homeDir, projectRoot: '/tmp/fake' });
      const cfg = svc.getGlobalConfig();
      assert.strictEqual(cfg.provider, 'soprano');
      assert.strictEqual(cfg.version, '2.0');
    } finally {
      cleanDir(homeDir);
    }
  });
});

describe('ConfigService — getProjectConfig()', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('returns null when .agentvibes/ directory does not exist in projectRoot', () => {
    const projectRoot = makeTmpDir('proj-missing');
    try {
      const svc = new ConfigService({ homeDir: '/tmp/fake-home', projectRoot });
      assert.strictEqual(svc.getProjectConfig(), null);
    } finally {
      cleanDir(projectRoot);
    }
  });

  test('returns null when .agentvibes/ exists but config.json missing', () => {
    const projectRoot = makeTmpDir('proj-dir-only');
    try {
      fs.mkdirSync(path.join(projectRoot, '.agentvibes'), { recursive: true });
      const svc = new ConfigService({ homeDir: '/tmp/fake-home', projectRoot });
      assert.strictEqual(svc.getProjectConfig(), null);
    } finally {
      cleanDir(projectRoot);
    }
  });

  test('parses project config when .agentvibes/config.json exists', () => {
    const projectRoot = makeTmpDir('proj-with-config');
    try {
      const cfgDir = path.join(projectRoot, '.agentvibes');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(path.join(cfgDir, 'config.json'), JSON.stringify({ verbosity: 'HIGH' }));
      const svc = new ConfigService({ homeDir: '/tmp/fake-home', projectRoot });
      const cfg = svc.getProjectConfig();
      assert.strictEqual(cfg.verbosity, 'HIGH');
    } finally {
      cleanDir(projectRoot);
    }
  });
});

describe('ConfigService — getConfig() merge', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('returns global config when no project config', () => {
    const homeDir = makeTmpDir('merge-global');
    const projectRoot = makeTmpDir('merge-proj-empty');
    try {
      const cfgDir = path.join(homeDir, '.agentvibes');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(path.join(cfgDir, 'config.json'), JSON.stringify({ provider: 'piper', voice: 'en_US-amy-medium' }));
      const svc = new ConfigService({ homeDir, projectRoot });
      const cfg = svc.getConfig();
      assert.strictEqual(cfg.provider, 'piper');
      assert.strictEqual(cfg.voice, 'en_US-amy-medium');
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });

  test('project config overrides global on conflict', () => {
    const homeDir = makeTmpDir('merge-override-home');
    const projectRoot = makeTmpDir('merge-override-proj');
    try {
      const globalCfgDir = path.join(homeDir, '.agentvibes');
      fs.mkdirSync(globalCfgDir, { recursive: true });
      fs.writeFileSync(path.join(globalCfgDir, 'config.json'), JSON.stringify({ provider: 'piper', verbosity: 'MEDIUM' }));

      const projCfgDir = path.join(projectRoot, '.agentvibes');
      fs.mkdirSync(projCfgDir, { recursive: true });
      fs.writeFileSync(path.join(projCfgDir, 'config.json'), JSON.stringify({ verbosity: 'HIGH' }));

      const svc = new ConfigService({ homeDir, projectRoot });
      const cfg = svc.getConfig();
      assert.strictEqual(cfg.provider, 'piper', 'global key preserved when no project override');
      assert.strictEqual(cfg.verbosity, 'HIGH', 'project overrides global');
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });
});

describe('ConfigService — set()', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('writes to global config when no .agentvibes/ in projectRoot', () => {
    const homeDir = makeTmpDir('set-global');
    const projectRoot = makeTmpDir('set-proj-no-dir');
    try {
      const svc = new ConfigService({ homeDir, projectRoot });
      svc.set('provider', 'soprano');
      const globalCfgPath = path.join(homeDir, '.agentvibes', 'config.json');
      assert.ok(fs.existsSync(globalCfgPath), 'global config.json should be created');
      const written = JSON.parse(fs.readFileSync(globalCfgPath, 'utf8'));
      assert.strictEqual(written.provider, 'soprano');
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });

  test('writes to project config when .agentvibes/ exists in projectRoot', () => {
    const homeDir = makeTmpDir('set-proj-home');
    const projectRoot = makeTmpDir('set-proj-with-dir');
    try {
      fs.mkdirSync(path.join(projectRoot, '.agentvibes'), { recursive: true });
      const svc = new ConfigService({ homeDir, projectRoot });
      svc.set('provider', 'macos');
      const projCfgPath = path.join(projectRoot, '.agentvibes', 'config.json');
      assert.ok(fs.existsSync(projCfgPath), 'project config.json should be created');
      const written = JSON.parse(fs.readFileSync(projCfgPath, 'utf8'));
      assert.strictEqual(written.provider, 'macos');
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });

  test('set() preserves existing keys in config', () => {
    const homeDir = makeTmpDir('set-preserve-home');
    const projectRoot = makeTmpDir('set-preserve-proj');
    try {
      const cfgDir = path.join(homeDir, '.agentvibes');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(path.join(cfgDir, 'config.json'), JSON.stringify({ provider: 'piper', voice: 'en_US-amy-medium', verbosity: 'MEDIUM' }));
      const svc = new ConfigService({ homeDir, projectRoot });
      svc.set('verbosity', 'HIGH');
      const written = JSON.parse(fs.readFileSync(path.join(cfgDir, 'config.json'), 'utf8'));
      assert.strictEqual(written.provider, 'piper', 'provider preserved');
      assert.strictEqual(written.voice, 'en_US-amy-medium', 'voice preserved');
      assert.strictEqual(written.verbosity, 'HIGH', 'verbosity updated');
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });

  test('set() does not leave a .tmp file after write', () => {
    const homeDir = makeTmpDir('set-atomic-home');
    const projectRoot = makeTmpDir('set-atomic-proj');
    try {
      const svc = new ConfigService({ homeDir, projectRoot });
      svc.set('provider', 'piper');
      const tmpFile = path.join(homeDir, '.agentvibes', 'config.json.tmp');
      assert.ok(!fs.existsSync(tmpFile), 'no .tmp file should remain after atomic write');
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });
});

describe('ConfigService — getVersion()', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('returns version from config when set', () => {
    const homeDir = makeTmpDir('version-home');
    try {
      const cfgDir = path.join(homeDir, '.agentvibes');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(path.join(cfgDir, 'config.json'), JSON.stringify({ version: '2.5' }));
      const svc = new ConfigService({ homeDir, projectRoot: '/tmp/fake' });
      assert.strictEqual(svc.getVersion(), '2.5');
    } finally {
      cleanDir(homeDir);
    }
  });

  test('defaults to "1.0" when version not in config', () => {
    const homeDir = makeTmpDir('version-default-home');
    try {
      const svc = new ConfigService({ homeDir, projectRoot: '/tmp/fake' });
      assert.strictEqual(svc.getVersion(), '1.0');
    } finally {
      cleanDir(homeDir);
    }
  });
});

describe('ConfigService — setGlobal()', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('always writes to global config regardless of project .agentvibes/ presence', () => {
    const homeDir = makeTmpDir('setglobal-home');
    const projectRoot = makeTmpDir('setglobal-proj');
    try {
      // Create project .agentvibes/ dir (should be ignored by setGlobal)
      fs.mkdirSync(path.join(projectRoot, '.agentvibes'), { recursive: true });
      const svc = new ConfigService({ homeDir, projectRoot });
      svc.setGlobal('provider', 'soprano');
      const globalCfgPath = path.join(homeDir, '.agentvibes', 'config.json');
      assert.ok(fs.existsSync(globalCfgPath));
      const written = JSON.parse(fs.readFileSync(globalCfgPath, 'utf8'));
      assert.strictEqual(written.provider, 'soprano');
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });
});

// ---------------------------------------------------------------------------

describe('ConfigService — getGlobalConfigPath / getLocalConfigPath / hasLocalConfig', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('getGlobalConfigPath returns path inside homeDir', () => {
    const homeDir = path.resolve('/home/test');
    const svc = new ConfigService({ homeDir, projectRoot: path.resolve('/proj') });
    assert.strictEqual(svc.getGlobalConfigPath(), path.join(homeDir, '.agentvibes', 'config.json'));
  });

  test('getLocalConfigPath returns path inside projectRoot', () => {
    const projectRoot = path.resolve('/proj');
    const svc = new ConfigService({ homeDir: path.resolve('/home/test'), projectRoot });
    assert.strictEqual(svc.getLocalConfigPath(), path.join(projectRoot, '.agentvibes', 'config.json'));
  });

  test('hasLocalConfig returns false when no local config file exists', () => {
    const homeDir = makeTmpDir('has-local-false');
    const projectRoot = makeTmpDir('proj-no-local');
    try {
      const svc = new ConfigService({ homeDir, projectRoot });
      assert.strictEqual(svc.hasLocalConfig(), false);
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });

  test('hasLocalConfig returns true when local config file exists', () => {
    const homeDir = makeTmpDir('has-local-true');
    const projectRoot = makeTmpDir('proj-has-local');
    try {
      const svc = new ConfigService({ homeDir, projectRoot });
      const localDir = path.join(projectRoot, '.agentvibes');
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(path.join(localDir, 'config.json'), '{}');
      assert.strictEqual(svc.hasLocalConfig(), true);
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });
});

// ---------------------------------------------------------------------------

describe('ConfigService — saveAllToGlobal / saveAllToLocal', () => {
  let ConfigService;
  before(async () => {
    const mod = await import('../../src/services/config-service.js');
    ConfigService = mod.ConfigService;
  });

  test('saveAllToGlobal overwrites global config atomically', () => {
    const homeDir = makeTmpDir('save-global');
    try {
      const svc = new ConfigService({ homeDir, projectRoot: '/tmp/proj' });
      svc.saveAllToGlobal({ provider: 'piper', voice: 'test' });
      assert.deepStrictEqual(svc.getGlobalConfig(), { provider: 'piper', voice: 'test' });
    } finally {
      cleanDir(homeDir);
    }
  });

  test('saveAllToGlobal creates parent dir if needed', () => {
    const homeDir = makeTmpDir('save-global-mkdir');
    try {
      const svc = new ConfigService({ homeDir, projectRoot: '/tmp/proj' });
      svc.saveAllToGlobal({ foo: 'bar' });
      assert.ok(fs.existsSync(path.join(homeDir, '.agentvibes', 'config.json')));
    } finally {
      cleanDir(homeDir);
    }
  });

  test('saveAllToLocal creates .agentvibes dir and writes config', () => {
    const homeDir = makeTmpDir('save-local');
    const projectRoot = makeTmpDir('save-local-proj');
    try {
      const svc = new ConfigService({ homeDir, projectRoot });
      svc.saveAllToLocal({ voice: 'local-voice' });
      assert.deepStrictEqual(svc.getProjectConfig(), { voice: 'local-voice' });
      assert.strictEqual(svc.hasLocalConfig(), true);
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });

  test('saveAllToLocal replaces entire local config (does not merge)', () => {
    const homeDir = makeTmpDir('save-local-replace');
    const projectRoot = makeTmpDir('save-local-replace-proj');
    try {
      const svc = new ConfigService({ homeDir, projectRoot });
      svc.saveAllToLocal({ a: 1, b: 2 });
      svc.saveAllToLocal({ a: 99 });
      const result = svc.getProjectConfig();
      assert.strictEqual(result.a, 99);
      assert.strictEqual(result.b, undefined);
    } finally {
      cleanDir(homeDir);
      cleanDir(projectRoot);
    }
  });
});
