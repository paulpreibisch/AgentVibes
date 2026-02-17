/**
 * Story 7.1: Provider & Voice Settings Group
 * Tests for createSettingsTab factory (contract shape + footer values)
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------
// Mock screen — mirrors the app.js test stub pattern

const mockScreen = {
  append: () => {},
  key: () => {},
  on: () => {},
  render: () => {},
  destroy: () => {},
};

// ---------------------------------------------------------------------------
// Mock services

const mockConfigService = {
  getConfig: () => ({ provider: 'piper', voice: 'en_US-amy-medium' }),
  set: () => {},
  getGlobalConfig: () => ({}),
  getProjectConfig: () => null,
};

const mockProviderService = {
  getActiveProvider: () => 'piper',
  getInstalledProviders: () => ['piper'],
  getActiveVoiceId: () => 'en_US-amy-medium',
  setActiveProvider: () => {},
  setActiveVoice: () => {},
};

// ---------------------------------------------------------------------------

describe('createSettingsTab', () => {
  let createSettingsTab;
  before(async () => {
    // Set test mode so blessed widgets are skipped
    process.env.AGENTVIBES_TEST_MODE = 'true';
    const mod = await import('../../src/console/tabs/settings-tab.js');
    createSettingsTab = mod.createSettingsTab;
  });

  test('exports createSettingsTab as named export', () => {
    assert.strictEqual(typeof createSettingsTab, 'function');
  });

  test('returns Tab Component Contract object with all required properties', () => {
    const tab = createSettingsTab(mockScreen, {
      configService: mockConfigService,
      providerService: mockProviderService,
    });
    assert.ok(tab, 'createSettingsTab must return an object');
    assert.ok('box' in tab, 'must have box property');
    assert.strictEqual(typeof tab.show, 'function', 'must have show()');
    assert.strictEqual(typeof tab.hide, 'function', 'must have hide()');
    assert.strictEqual(typeof tab.onFocus, 'function', 'must have onFocus()');
    assert.strictEqual(typeof tab.onBlur, 'function', 'must have onBlur()');
    assert.strictEqual(typeof tab.getFooterText, 'function', 'must have getFooterText()');
    assert.strictEqual(typeof tab.getFooterColor, 'function', 'must have getFooterColor()');
  });

  test('getFooterColor() returns blue #2196f3', () => {
    const tab = createSettingsTab(mockScreen, {
      configService: mockConfigService,
      providerService: mockProviderService,
    });
    assert.strictEqual(tab.getFooterColor(), '#2196f3');
  });

  test('getFooterText() contains [↑↓] navigation hint', () => {
    const tab = createSettingsTab(mockScreen, {
      configService: mockConfigService,
      providerService: mockProviderService,
    });
    assert.ok(tab.getFooterText().includes('[↑↓]'), 'footer must include [↑↓] navigation hint');
  });

  test('getFooterText() contains [Enter] hint', () => {
    const tab = createSettingsTab(mockScreen, {
      configService: mockConfigService,
      providerService: mockProviderService,
    });
    assert.ok(tab.getFooterText().includes('[Enter]'), 'footer must include [Enter] hint');
  });

  test('show() and hide() do not throw', () => {
    const tab = createSettingsTab(mockScreen, {
      configService: mockConfigService,
      providerService: mockProviderService,
    });
    assert.doesNotThrow(() => tab.show());
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() and onBlur() do not throw', () => {
    const tab = createSettingsTab(mockScreen, {
      configService: mockConfigService,
      providerService: mockProviderService,
    });
    assert.doesNotThrow(() => tab.onFocus());
    assert.doesNotThrow(() => tab.onBlur());
  });

  test('box property is an object (not null/undefined)', () => {
    const tab = createSettingsTab(mockScreen, {
      configService: mockConfigService,
      providerService: mockProviderService,
    });
    assert.ok(tab.box !== null && tab.box !== undefined, 'box must not be null/undefined');
    assert.strictEqual(typeof tab.box, 'object');
  });
});
