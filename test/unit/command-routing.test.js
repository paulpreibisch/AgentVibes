/**
 * Story 6.5: Command Routing & Entry Points
 * Tests for resolveStartTab() and ConfigService
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Stubs

const installedStub = { isInstalled: () => true };
const notInstalledStub = { isInstalled: () => false };

// ---------------------------------------------------------------------------
// resolveStartTab tests

describe('resolveStartTab', () => {
  let resolveStartTab;

  // Dynamic import so tests don't trigger the main execution block
  before(async () => {
    const mod = await import('../../bin/agentvibes.js');
    resolveStartTab = mod.resolveStartTab;
  });

  test('exports resolveStartTab as named export', () => {
    // resolveStartTab is already loaded via before() hook above
    assert.strictEqual(typeof resolveStartTab, 'function',
      'resolveStartTab must be a named export');
  });

  test('"install" arg → startTab: install', () => {
    const result = resolveStartTab(['install'], notInstalledStub);
    assert.deepStrictEqual(result, { startTab: 'install' });
  });

  test('"config" arg → startTab: settings', () => {
    const result = resolveStartTab(['config'], notInstalledStub);
    assert.deepStrictEqual(result, { startTab: 'settings' });
  });

  test('"configure" arg → startTab: settings', () => {
    const result = resolveStartTab(['configure'], notInstalledStub);
    assert.deepStrictEqual(result, { startTab: 'settings' });
  });

  test('no args + isInstalled=true → startTab: settings', () => {
    const result = resolveStartTab([], installedStub);
    assert.deepStrictEqual(result, { startTab: 'settings' });
  });

  test('no args + isInstalled=false → startTab: install', () => {
    const result = resolveStartTab([], notInstalledStub);
    assert.deepStrictEqual(result, { startTab: 'install' });
  });

  test('"update" arg → cliUpdate: true', () => {
    const result = resolveStartTab(['update'], installedStub);
    assert.deepStrictEqual(result, { cliUpdate: true, args: [] });
  });

  test('"update" arg with flags → cliUpdate: true, args passed through', () => {
    const result = resolveStartTab(['update', '--yes'], installedStub);
    assert.deepStrictEqual(result, { cliUpdate: true, args: ['--yes'] });
  });

  test('"uninstall" arg → cliUninstall: true', () => {
    const result = resolveStartTab(['uninstall'], installedStub);
    assert.deepStrictEqual(result, { cliUninstall: true, args: [] });
  });

  test('unknown command → error object (not startTab)', () => {
    const result = resolveStartTab(['foobar'], notInstalledStub);
    assert.ok('error' in result, 'unknown command must return { error }');
    assert.ok(!('startTab' in result), 'error result must not have startTab');
  });

  test('unknown command error message mentions the unknown command', () => {
    const result = resolveStartTab(['foobar'], notInstalledStub);
    assert.ok(result.error.includes('foobar'),
      'error message must include the unknown command name');
  });

  test('empty string arg is falsy → treats as bare invocation (smart detection)', () => {
    // '' is falsy in JS, so !cmd is true → falls into smart detection branch
    const result = resolveStartTab([''], notInstalledStub);
    assert.ok('startTab' in result,
      'empty string arg is falsy → treats as bare invocation');
  });
});

// ---------------------------------------------------------------------------
// ConfigService tests

describe('ConfigService', () => {
  test('exports ConfigService as named export', async () => {
    const mod = await import('../../src/services/config-service.js');
    assert.strictEqual(typeof mod.ConfigService, 'function',
      'ConfigService must be a named export');
  });

  test('exports ConfigService as default export', async () => {
    const mod = await import('../../src/services/config-service.js');
    assert.strictEqual(typeof mod.default, 'function',
      'ConfigService must be the default export too');
  });

  test('isInstalled() returns false for non-existent projectRoot', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');
    const svc = new ConfigService({ projectRoot: '/tmp/definitely-does-not-exist-agentvibes' });
    assert.strictEqual(svc.isInstalled(), false,
      'isInstalled() must return false when hooks directory does not exist');
  });

  test('isInstalled() returns true when play-tts.sh exists', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');

    // Create temp project structure with fake hooks
    const tmpDir = path.join(os.tmpdir(), `agentvibes-test-${Date.now()}`);
    const hooksDir = path.join(tmpDir, '.claude', 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });
    await fs.writeFile(path.join(hooksDir, 'play-tts.sh'), '#!/bin/bash\necho test\n');

    try {
      const svc = new ConfigService({ projectRoot: tmpDir });
      assert.strictEqual(svc.isInstalled(), true,
        'isInstalled() must return true when .claude/hooks/play-tts.sh exists');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('isBmadDetected() returns false for empty projectRoot', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');
    const svc = new ConfigService({
      projectRoot: '/tmp/definitely-does-not-exist-agentvibes',
      homeDir: '/tmp/definitely-does-not-exist-home',
    });
    assert.strictEqual(svc.isBmadDetected(), false,
      'isBmadDetected() must return false when no BMAD indicators present');
  });

  test('isBmadDetected() returns true when _bmad/ exists in projectRoot', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');

    const tmpDir = path.join(os.tmpdir(), `agentvibes-bmad-test-${Date.now()}`);
    const bmadDir = path.join(tmpDir, '_bmad');
    await fs.mkdir(bmadDir, { recursive: true });

    try {
      const svc = new ConfigService({
        projectRoot: tmpDir,
        homeDir: '/tmp/definitely-does-not-exist-home',
      });
      assert.strictEqual(svc.isBmadDetected(), true,
        'isBmadDetected() must return true when _bmad/ directory exists');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('isBmadDetected() returns true when .bmad/ exists in projectRoot', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');

    const tmpDir = path.join(os.tmpdir(), `agentvibes-dotbmad-test-${Date.now()}`);
    const dotBmadDir = path.join(tmpDir, '.bmad');
    await fs.mkdir(dotBmadDir, { recursive: true });

    try {
      const svc = new ConfigService({
        projectRoot: tmpDir,
        homeDir: '/tmp/definitely-does-not-exist-home',
      });
      assert.strictEqual(svc.isBmadDetected(), true,
        'isBmadDetected() must return true when .bmad/ directory exists');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('isBmadDetected() returns true when global bmad-voice-map.json exists', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');

    const tmpHome = path.join(os.tmpdir(), `agentvibes-home-test-${Date.now()}`);
    const voiceMapDir = path.join(tmpHome, '.agentvibes');
    await fs.mkdir(voiceMapDir, { recursive: true });
    await fs.writeFile(path.join(voiceMapDir, 'bmad-voice-map.json'), '{}');

    try {
      const svc = new ConfigService({
        projectRoot: '/tmp/definitely-does-not-exist-agentvibes',
        homeDir: tmpHome,
      });
      assert.strictEqual(svc.isBmadDetected(), true,
        'isBmadDetected() must return true when ~/.agentvibes/bmad-voice-map.json exists');
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  test('getConfig() returns an object', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');
    const svc = new ConfigService({ projectRoot: '/tmp/fake' });
    const cfg = svc.getConfig();
    assert.strictEqual(typeof cfg, 'object', 'getConfig() must return an object');
    assert.ok(cfg !== null, 'getConfig() must not return null');
  });

  test('getGlobalConfig() returns an object', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');
    const svc = new ConfigService({ projectRoot: '/tmp/fake' });
    const cfg = svc.getGlobalConfig();
    assert.strictEqual(typeof cfg, 'object', 'getGlobalConfig() must return an object');
  });

  test('getProjectConfig() returns null (stub)', async () => {
    const { ConfigService } = await import('../../src/services/config-service.js');
    const svc = new ConfigService({ projectRoot: '/tmp/fake' });
    assert.strictEqual(svc.getProjectConfig(), null,
      'getProjectConfig() must return null in stub implementation');
  });
});
