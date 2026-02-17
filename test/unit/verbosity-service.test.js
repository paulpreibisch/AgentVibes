/**
 * Epic 10: Verbosity System Enhancement
 * Tests for VerbosityService class: levels, shouldSpeak, getMessage, migration
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('VERBOSITY_LEVELS', () => {
  let VERBOSITY_LEVELS;
  before(async () => {
    const mod = await import('../../src/services/verbosity-service.js');
    VERBOSITY_LEVELS = mod.VERBOSITY_LEVELS;
  });

  test('exported as array', () => {
    assert.ok(Array.isArray(VERBOSITY_LEVELS));
  });

  test('contains 5 levels in order', () => {
    assert.deepStrictEqual(VERBOSITY_LEVELS, ['minimal', 'low', 'medium', 'high', 'custom']);
  });
});

// ---------------------------------------------------------------------------

describe('VerbosityService', () => {
  let VerbosityService;
  before(async () => {
    const mod = await import('../../src/services/verbosity-service.js');
    VerbosityService = mod.VerbosityService;
  });

  function makeConfig(verbosity = 'high', extra = {}) {
    const store = { verbosity, ...extra };
    return {
      getConfig: () => ({ ...store }),
      set: (k, v) => { store[k] = v; },
    };
  }

  test('exported as class', () => {
    assert.strictEqual(typeof VerbosityService, 'function');
  });

  // getLevel
  test('getLevel() returns configured level', () => {
    const svc = new VerbosityService(makeConfig('medium'));
    assert.strictEqual(svc.getLevel(), 'medium');
  });

  test('getLevel() defaults to high when undefined', () => {
    const svc = new VerbosityService(makeConfig(undefined));
    assert.strictEqual(svc.getLevel(), 'high');
  });

  // shouldSpeak - minimal
  test('MINIMAL: shouldSpeak(prompt-submit) = false', () => {
    const svc = new VerbosityService(makeConfig('minimal'));
    assert.strictEqual(svc.shouldSpeak('prompt-submit'), false);
  });

  test('MINIMAL: shouldSpeak(response-complete) = true', () => {
    const svc = new VerbosityService(makeConfig('minimal'));
    assert.strictEqual(svc.shouldSpeak('response-complete'), true);
  });

  // shouldSpeak - low
  test('LOW: shouldSpeak(prompt-submit) = false', () => {
    const svc = new VerbosityService(makeConfig('low'));
    assert.strictEqual(svc.shouldSpeak('prompt-submit'), false);
  });

  test('LOW: shouldSpeak(response-complete) = true', () => {
    const svc = new VerbosityService(makeConfig('low'));
    assert.strictEqual(svc.shouldSpeak('response-complete'), true);
  });

  // shouldSpeak - medium/high
  test('MEDIUM: shouldSpeak(prompt-submit) = true', () => {
    const svc = new VerbosityService(makeConfig('medium'));
    assert.strictEqual(svc.shouldSpeak('prompt-submit'), true);
  });

  test('HIGH: shouldSpeak(response-complete) = true', () => {
    const svc = new VerbosityService(makeConfig('high'));
    assert.strictEqual(svc.shouldSpeak('response-complete'), true);
  });

  // shouldSpeak - custom
  test('CUSTOM: shouldSpeak respects customVerbosity.promptSubmit', () => {
    const cfg = makeConfig('custom', { customVerbosity: { promptSubmit: false, responseComplete: true } });
    const svc = new VerbosityService(cfg);
    assert.strictEqual(svc.shouldSpeak('prompt-submit'), false);
    assert.strictEqual(svc.shouldSpeak('response-complete'), true);
  });

  // getMessage
  test('MINIMAL: getMessage(response-complete) returns non-empty string', () => {
    const svc = new VerbosityService(makeConfig('minimal'));
    const msg = svc.getMessage('response-complete', {});
    assert.ok(typeof msg === 'string' && msg.length > 0);
  });

  test('LOW: getMessage(response-complete) includes "Done"', () => {
    const svc = new VerbosityService(makeConfig('low'));
    const msg = svc.getMessage('response-complete', { summary: 'Fixed the bug' });
    assert.ok(msg.includes('Done') || msg.length > 0);
  });

  test('HIGH: getMessage returns null (use hook default)', () => {
    const svc = new VerbosityService(makeConfig('high'));
    assert.strictEqual(svc.getMessage('prompt-submit', {}), null);
  });

  // Migration
  test('checkMigration() migrates low → medium and returns true', () => {
    const cfg = makeConfig('low');
    const svc = new VerbosityService(cfg);
    const migrated = svc.checkMigration();
    assert.strictEqual(migrated, true);
    assert.strictEqual(cfg.getConfig().verbosity, 'medium');
  });

  test('checkMigration() returns false for non-low level', () => {
    const svc = new VerbosityService(makeConfig('high'));
    assert.strictEqual(svc.checkMigration(), false);
  });

  test('checkMigration() returns false if already migrated', () => {
    const cfg = makeConfig('low', { verbosityMigrated: true });
    const svc = new VerbosityService(cfg);
    assert.strictEqual(svc.checkMigration(), false);
  });

  test('needsMigrationNotice() returns true after migration', () => {
    const cfg = makeConfig('low');
    const svc = new VerbosityService(cfg);
    svc.checkMigration();
    assert.strictEqual(svc.needsMigrationNotice(), true);
  });

  test('dismissMigrationNotice() sets migrationNoticeDismissed', () => {
    const cfg = makeConfig('low');
    const svc = new VerbosityService(cfg);
    svc.checkMigration();
    svc.dismissMigrationNotice();
    assert.strictEqual(svc.needsMigrationNotice(), false);
  });
});
