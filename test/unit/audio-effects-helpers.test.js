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

  test('returns "Disabled" when reverb is false', () => {
    assert.strictEqual(formatReverbState(false, 0.3), 'Disabled');
  });

  test('returns "Disabled" when reverb is false regardless of amount', () => {
    assert.strictEqual(formatReverbState(false, 1.0), 'Disabled');
  });

  test('returns "Enabled (30%)" when reverb true, amount 0.3', () => {
    assert.strictEqual(formatReverbState(true, 0.3), 'Enabled (30%)');
  });

  test('returns "Enabled (100%)" when reverb true, amount 1.0', () => {
    assert.strictEqual(formatReverbState(true, 1.0), 'Enabled (100%)');
  });

  test('returns "Enabled (0%)" when reverb true, amount 0.0', () => {
    assert.strictEqual(formatReverbState(true, 0.0), 'Enabled (0%)');
  });

  test('returns "Enabled (50%)" when reverb true, amount 0.5', () => {
    assert.strictEqual(formatReverbState(true, 0.5), 'Enabled (50%)');
  });

  test('rounds to nearest percent', () => {
    // 0.333... → 33%
    assert.strictEqual(formatReverbState(true, 1/3), 'Enabled (33%)');
  });

  test('defaults reverbAmount to 30% when undefined', () => {
    assert.strictEqual(formatReverbState(true, undefined), 'Enabled (30%)');
  });
});

// ---------------------------------------------------------------------------

describe('formatPitchState', () => {
  let formatPitchState;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    formatPitchState = mod.formatPitchState;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatPitchState, 'function');
  });

  test('returns "+0 semitones" for pitch 0', () => {
    assert.strictEqual(formatPitchState(0), '+0 semitones');
  });

  test('returns "+5 semitones" for positive pitch 5', () => {
    assert.strictEqual(formatPitchState(5), '+5 semitones');
  });

  test('returns "-3 semitones" for negative pitch -3', () => {
    assert.strictEqual(formatPitchState(-3), '-3 semitones');
  });

  test('returns "+12 semitones" for maximum pitch 12', () => {
    assert.strictEqual(formatPitchState(12), '+12 semitones');
  });

  test('returns "-12 semitones" for minimum pitch -12', () => {
    assert.strictEqual(formatPitchState(-12), '-12 semitones');
  });

  test('returns "+1 semitones" for pitch 1', () => {
    assert.strictEqual(formatPitchState(1), '+1 semitones');
  });

  test('defaults to +0 semitones when pitch is undefined', () => {
    assert.strictEqual(formatPitchState(undefined), '+0 semitones');
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
