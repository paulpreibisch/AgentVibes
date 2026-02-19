/**
 * Story 7.4: Personality & Verbosity Settings Group
 * Tests for exported format helpers: formatVerbosity, formatPersonality
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('formatVerbosity', () => {
  let formatVerbosity;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    formatVerbosity = mod.formatVerbosity;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatVerbosity, 'function');
  });

  test('returns "High" for verbosity "high"', () => {
    assert.strictEqual(formatVerbosity('high'), 'High');
  });

  test('returns "Medium" for verbosity "medium"', () => {
    assert.strictEqual(formatVerbosity('medium'), 'Medium');
  });

  test('returns "Low" for verbosity "low"', () => {
    assert.strictEqual(formatVerbosity('low'), 'Low');
  });

  test('defaults to "High" for undefined verbosity', () => {
    assert.strictEqual(formatVerbosity(undefined), 'High');
  });

  test('defaults to "High" for unknown verbosity value', () => {
    assert.strictEqual(formatVerbosity('unknown'), 'High');
  });
});

// ---------------------------------------------------------------------------

describe('formatPersonality', () => {
  let formatPersonality;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    formatPersonality = mod.formatPersonality;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatPersonality, 'function');
  });

  test('returns "None" for personality "none"', () => {
    assert.strictEqual(formatPersonality('none'), 'None');
  });

  test('title-cases "sarcastic" to "Sarcastic"', () => {
    assert.strictEqual(formatPersonality('sarcastic'), 'Sarcastic');
  });

  test('defaults to "None" for undefined', () => {
    assert.strictEqual(formatPersonality(undefined), 'None');
  });

  test('title-cases "funny" to "Funny"', () => {
    assert.strictEqual(formatPersonality('funny'), 'Funny');
  });
});

// ---------------------------------------------------------------------------

describe('createSettingsTab — regression (story 7-4)', () => {
  let createSettingsTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    createSettingsTab = mod.createSettingsTab;
  });

  test('still exports createSettingsTab as named function', () => {
    assert.strictEqual(typeof createSettingsTab, 'function');
  });

  test('still returns Tab Component Contract', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], getActiveVoiceId: () => 'en_US-amy-medium', setActiveProvider: () => {} },
    };
    const tab = createSettingsTab(mockScreen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
    assert.strictEqual(tab.getFooterColor(), '#2196f3');
  });
});
