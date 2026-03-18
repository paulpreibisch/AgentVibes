/**
 * Story 7.1: Provider & Voice Settings Group
 * Tests for ProviderService
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

describe('ProviderService', () => {
  let ProviderService;
  before(async () => {
    const mod = await import('../../src/services/provider-service.js');
    ProviderService = mod.ProviderService;
  });

  test('exports ProviderService as named export', () => {
    assert.strictEqual(typeof ProviderService, 'function');
  });

  test('exports ProviderService as default export', async () => {
    const mod = await import('../../src/services/provider-service.js');
    assert.strictEqual(typeof mod.default, 'function');
  });

  test('getActiveProvider() returns provider from configService.getConfig()', () => {
    const mockConfig = { getConfig: () => ({ provider: 'soprano' }) };
    const svc = new ProviderService(mockConfig);
    assert.strictEqual(svc.getActiveProvider(), 'soprano');
  });

  test('getActiveProvider() defaults to piper when config has no provider key', () => {
    const mockConfig = { getConfig: () => ({}) };
    const svc = new ProviderService(mockConfig);
    assert.strictEqual(svc.getActiveProvider(), 'piper');
  });

  test('setActiveProvider() calls configService.set with correct args', () => {
    const calls = [];
    const mockConfig = {
      getConfig: () => ({}),
      set: (k, v) => calls.push({ k, v }),
    };
    const svc = new ProviderService(mockConfig);
    svc.setActiveProvider('macos');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].k, 'provider');
    assert.strictEqual(calls[0].v, 'macos');
  });

  test('getActiveVoiceId() returns voice from configService.getConfig()', () => {
    const mockConfig = { getConfig: () => ({ voice: 'en_US-ryan-high' }) };
    const svc = new ProviderService(mockConfig);
    assert.strictEqual(svc.getActiveVoiceId(), 'en_US-ryan-high');
  });

  test('getActiveVoiceId() defaults to en_US-amy-medium when not configured', () => {
    const mockConfig = { getConfig: () => ({}) };
    const svc = new ProviderService(mockConfig);
    assert.strictEqual(svc.getActiveVoiceId(), 'en_US-amy-medium');
  });

  test('setActiveVoice() calls configService.set with correct args', () => {
    const calls = [];
    const mockConfig = {
      getConfig: () => ({}),
      set: (k, v) => calls.push({ k, v }),
    };
    const svc = new ProviderService(mockConfig);
    svc.setActiveVoice('en_US-lessac-medium');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].k, 'voice');
    assert.strictEqual(calls[0].v, 'en_US-lessac-medium');
  });

  test('getInstalledProviders() returns an array', () => {
    const mockConfig = { getConfig: () => ({}) };
    const svc = new ProviderService(mockConfig);
    const providers = svc.getInstalledProviders();
    assert.ok(Array.isArray(providers), 'should return an array');
  });

  test('getInstalledProviders() returns at least one provider (graceful degradation)', () => {
    const mockConfig = { getConfig: () => ({}) };
    const svc = new ProviderService(mockConfig);
    const providers = svc.getInstalledProviders();
    assert.ok(providers.length >= 1, 'must return at least one provider');
  });

  test('getInstalledProviders() only returns known provider names', () => {
    const KNOWN = new Set(['piper', 'soprano', 'macos', 'termux-ssh']);
    const mockConfig = { getConfig: () => ({}) };
    const svc = new ProviderService(mockConfig);
    const providers = svc.getInstalledProviders();
    for (const p of providers) {
      assert.ok(KNOWN.has(p), `unknown provider returned: ${p}`);
    }
  });

  test('getInstalledProviders() caches result on repeated calls (same array reference)', () => {
    const mockConfig = { getConfig: () => ({}) };
    const svc = new ProviderService(mockConfig);
    const first = svc.getInstalledProviders();
    const second = svc.getInstalledProviders();
    assert.strictEqual(first, second, 'should return the same cached array reference');
  });
});
