/**
 * Story 7.2: Audio Effects Settings Group
 * Tests for exported format helpers: formatReverbState, formatPitchState
 */

// Must be set before dynamic import to prevent blessed screen creation
process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('formatReverbState', () => {
  let formatReverbState;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    formatReverbState = mod.formatReverbState;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatReverbState, 'function');
  });

  test('returns "Off" for preset "off"', () => {
    assert.strictEqual(formatReverbState('off'), 'Off');
  });

  test('returns "Light Reverb" for preset "light"', () => {
    assert.strictEqual(formatReverbState('light'), 'Light Reverb');
  });

  test('returns "Medium Reverb" for preset "medium"', () => {
    assert.strictEqual(formatReverbState('medium'), 'Medium Reverb');
  });

  test('returns "Heavy Reverb" for preset "heavy"', () => {
    assert.strictEqual(formatReverbState('heavy'), 'Heavy Reverb');
  });

  test('returns "Cathedral" for preset "cathedral"', () => {
    assert.strictEqual(formatReverbState('cathedral'), 'Cathedral');
  });

  test('defaults to "Light Reverb" for unknown preset', () => {
    assert.strictEqual(formatReverbState('unknown'), 'Light Reverb');
  });

  test('defaults to "Light Reverb" when preset is undefined', () => {
    assert.strictEqual(formatReverbState(undefined), 'Light Reverb');
  });

  test('returns distinct label for each of the 5 presets', () => {
    const results = ['off', 'light', 'medium', 'heavy', 'cathedral'].map(p => formatReverbState(p));
    const unique = new Set(results);
    assert.strictEqual(unique.size, 5);
  });
});

// ---------------------------------------------------------------------------

describe('createSettingsTab — regression (story 7-2)', () => {
  let createSettingsTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    createSettingsTab = mod.createSettingsTab;
  });

  test('still exports createSettingsTab as named function', () => {
    assert.strictEqual(typeof createSettingsTab, 'function');
  });

  test('still returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({ provider: 'piper', voice: 'en_US-amy-medium' }), set: () => {} },
      providerService: { getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], getActiveVoiceId: () => 'en_US-amy-medium', setActiveProvider: () => {} },
    };
    const tab = createSettingsTab(mockScreen, mockServices);
    assert.ok('box' in tab);
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
});
