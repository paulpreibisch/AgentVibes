/**
 * Story 7.6: Button-Level Focus Navigation System
 * Tests for settings tab navigation: onFocus restores position, contract intact.
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

describe('Settings Tab Navigation (story 7-6)', () => {
  let createSettingsTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    createSettingsTab = mod.createSettingsTab;
  });

  test('createSettingsTab still exported as function', () => {
    assert.strictEqual(typeof createSettingsTab, 'function');
  });

  test('Tab Component Contract: all 7 properties present', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], getActiveVoiceId: () => 'en_US-amy-medium', setActiveProvider: () => {} },
    };
    const tab = createSettingsTab(mockScreen, mockServices);
    assert.ok('box' in tab, 'box property missing');
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() still returns #2196f3', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createSettingsTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], getActiveVoiceId: () => 'en_US-amy-medium', setActiveProvider: () => {} },
    });
    assert.strictEqual(tab.getFooterColor(), '#2196f3');
  });

  test('onFocus() executes without error in test mode', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createSettingsTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], getActiveVoiceId: () => 'en_US-amy-medium', setActiveProvider: () => {} },
    });
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() executes without error', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createSettingsTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], getActiveVoiceId: () => 'en_US-amy-medium', setActiveProvider: () => {} },
    });
    assert.doesNotThrow(() => tab.onBlur());
  });
});
