/**
 * Story 7.3: Background Music Settings Group
 * Tests for exported format helpers: formatMusicState, formatTrackName
 */

// Must be set before dynamic import to prevent blessed screen creation
process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('formatMusicState', () => {
  let formatMusicState;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    formatMusicState = mod.formatMusicState;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatMusicState, 'function');
  });

  test('returns "Disabled" when enabled is false', () => {
    assert.strictEqual(formatMusicState(false), 'Disabled');
  });

  test('returns "Enabled" when enabled is true', () => {
    assert.strictEqual(formatMusicState(true), 'Enabled');
  });

  test('returns "Disabled" when enabled is undefined', () => {
    assert.strictEqual(formatMusicState(undefined), 'Disabled');
  });
});

// ---------------------------------------------------------------------------

describe('formatTrackName', () => {
  let formatTrackName;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    formatTrackName = mod.formatTrackName;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatTrackName, 'function');
  });

  test('returns "🎻 Soft Flamenco" for flamenco filename', () => {
    assert.strictEqual(formatTrackName('agentvibes_soft_flamenco_loop.mp3'), '🎻 Soft Flamenco');
  });

  test('returns "🌸 Bossa Nova" for bossa nova filename', () => {
    assert.strictEqual(formatTrackName('agent_vibes_bossa_nova_v2_loop.mp3'), '🌸 Bossa Nova');
  });

  test('returns "🌊 Chillwave" for chillwave filename', () => {
    assert.strictEqual(formatTrackName('agent_vibes_chillwave_v2_loop.mp3'), '🌊 Chillwave');
  });

  test('returns "🪘 Gnawa Ambient" for gnawa filename', () => {
    assert.strictEqual(formatTrackName('agent_vibes_ganawa_ambient_v2_loop.mp3'), '🪘 Gnawa Ambient');
  });

  test('title-cases unknown track, strips agent_vibes_ prefix and _loop suffix', () => {
    assert.strictEqual(formatTrackName('agent_vibes_my_custom_track_v2_loop.mp3'), 'My Custom Track');
  });

  test('returns "None" for undefined track', () => {
    assert.strictEqual(formatTrackName(undefined), 'None');
  });

  test('returns "None" for empty string track', () => {
    assert.strictEqual(formatTrackName(''), 'None');
  });
});

// ---------------------------------------------------------------------------

describe('createSettingsTab — regression (story 7-3)', () => {
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
});
