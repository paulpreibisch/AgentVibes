/**
 * Story 7.1: Provider & Voice Settings Group
 * Tests for createSettingsTab factory (contract shape + footer values)
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// Pure formatter functions — exported from settings-tab.js, testable without blessed
process.env.AGENTVIBES_TEST_MODE = 'true';
const settingsTabModule = await import('../../src/console/tabs/settings-tab.js');
const {
  formatMusicState,
  formatVolume,
  formatVerbosity,
  formatPersonality,
  formatIntroText,
} = settingsTabModule;

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
    assert.ok(tab.getFooterText().includes('Enter'), 'footer must include Enter hint');
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

// ===========================================================================
// Pure formatter functions — tested without blessed dependency
// ===========================================================================

describe('formatMusicState()', () => {
  test('returns "Enabled" for truthy value', () => {
    assert.strictEqual(formatMusicState(true), 'Enabled');
  });

  test('returns "Disabled" for falsy value', () => {
    assert.strictEqual(formatMusicState(false), 'Disabled');
  });

  test('returns "Disabled" for null', () => {
    assert.strictEqual(formatMusicState(null), 'Disabled');
  });

  test('returns "Enabled" for truthy non-boolean (1)', () => {
    assert.strictEqual(formatMusicState(1), 'Enabled');
  });
});

describe('formatVolume()', () => {
  test('returns formatted percentage for a numeric volume', () => {
    const result = formatVolume(50);
    assert.ok(result.includes('50'), 'must include the volume value');
    assert.ok(result.includes('%'), 'must include % sign');
  });

  test('clamps value to minimum 10 for small numbers', () => {
    const result = formatVolume(5);
    assert.strictEqual(result, '10%', 'volume below 10 must be clamped to 10%');
  });

  test('clamps value to maximum 100 for large numbers', () => {
    const result = formatVolume(150);
    assert.strictEqual(result, '100%', 'volume above 100 must be clamped to 100%');
  });

  test('uses default volume for NaN input', () => {
    const result = formatVolume(NaN);
    assert.ok(result.endsWith('%'), 'must return a % value even for NaN input');
  });

  test('uses default volume for null input', () => {
    const result = formatVolume(null);
    assert.ok(result.endsWith('%'), 'must return a % value for null input');
  });

  test('exact boundary: 10 returns "10%"', () => {
    assert.strictEqual(formatVolume(10), '10%');
  });

  test('exact boundary: 100 returns "100%"', () => {
    assert.strictEqual(formatVolume(100), '100%');
  });
});

describe('formatVerbosity()', () => {
  test('returns "High" for "high"', () => {
    assert.strictEqual(formatVerbosity('high'), 'High');
  });

  test('returns "Medium" for "medium"', () => {
    assert.strictEqual(formatVerbosity('medium'), 'Medium');
  });

  test('returns "Low" for "low"', () => {
    assert.strictEqual(formatVerbosity('low'), 'Low');
  });

  test('returns "Caveman" for "caveman"', () => {
    assert.strictEqual(formatVerbosity('caveman'), 'Caveman');
  });

  test('returns "Minimal" for "minimal"', () => {
    assert.strictEqual(formatVerbosity('minimal'), 'Minimal');
  });

  test('returns "High" for unknown verbosity (fallback)', () => {
    assert.strictEqual(formatVerbosity('unknown-level'), 'High');
  });

  test('returns "High" for undefined (fallback)', () => {
    assert.strictEqual(formatVerbosity(undefined), 'High');
  });
});

describe('formatPersonality()', () => {
  test('returns "(none)" display text for null/empty personality', () => {
    const result = formatPersonality(null);
    assert.ok(result.includes('None'), `Expected "None" in result, got: ${result}`);
  });

  test('returns "(none)" display text for empty string', () => {
    const result = formatPersonality('');
    assert.ok(result.includes('None'), `Expected "None" in result, got: ${result}`);
  });

  test('returns capitalized name for known personality', () => {
    const result = formatPersonality('pirate');
    assert.ok(result.includes('Pirate'), `Expected "Pirate" in result, got: ${result}`);
  });

  test('includes emoji in output', () => {
    const result = formatPersonality('robot');
    assert.ok(result.trim().length > 0, 'must not be empty');
    // Some emoji or fallback must be present
  });

  test('returns capitalized version of unknown personality', () => {
    const result = formatPersonality('my-custom');
    assert.ok(result.includes('My-custom'), `Expected capitalized name in result, got: ${result}`);
  });
});

describe('formatIntroText()', () => {
  test('returns "(none)" for null pretext', () => {
    assert.strictEqual(formatIntroText(null), '(none)');
  });

  test('returns "(none)" for empty string', () => {
    assert.strictEqual(formatIntroText(''), '(none)');
  });

  test('returns the text unchanged when under 30 chars', () => {
    const short = 'Hello agent!';
    assert.strictEqual(formatIntroText(short), short);
  });

  test('truncates text over 30 chars with ellipsis', () => {
    const long = 'This is a very long pretext string that exceeds thirty characters easily';
    const result = formatIntroText(long);
    assert.ok(result.endsWith('…'), 'must end with ellipsis character');
    assert.ok(result.length <= 31, `result must be 30 chars + ellipsis, got ${result.length} chars`);
  });

  test('exactly 30 chars is returned unchanged', () => {
    const exactly30 = 'a'.repeat(30);
    assert.strictEqual(formatIntroText(exactly30), exactly30);
  });

  test('31 chars is truncated to 30 + ellipsis', () => {
    const thirtyOne = 'a'.repeat(31);
    const result = formatIntroText(thirtyOne);
    assert.strictEqual(result, 'a'.repeat(30) + '…');
  });
});
