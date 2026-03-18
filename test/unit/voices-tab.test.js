/**
 * Epic 8: Voices Tab
 * Tests for voices-tab.js exports: parseVoiceId, formatVoiceInfo, inferGender, formatVoiceName, createVoicesTab contract
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('parseVoiceId', () => {
  let parseVoiceId;
  before(async () => {
    const mod = await import('../../src/console/tabs/voices-tab.js');
    parseVoiceId = mod.parseVoiceId;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof parseVoiceId, 'function');
  });

  test('parses en_US-amy-medium correctly', () => {
    const r = parseVoiceId('en_US-amy-medium');
    assert.strictEqual(r.lang, 'en_US');
    assert.strictEqual(r.name, 'amy');
    assert.strictEqual(r.quality, 'medium');
  });

  test('parses en_GB-alan-medium correctly', () => {
    const r = parseVoiceId('en_GB-alan-medium');
    assert.strictEqual(r.lang, 'en_GB');
    assert.strictEqual(r.name, 'alan');
    assert.strictEqual(r.quality, 'medium');
  });

  test('parses en_US-ryan-high correctly', () => {
    const r = parseVoiceId('en_US-ryan-high');
    assert.strictEqual(r.quality, 'high');
  });

  test('returns unknown fields for unparseable voice id', () => {
    const r = parseVoiceId('tracy');
    assert.strictEqual(r.lang, 'unknown');
    assert.strictEqual(r.name, 'tracy');
  });
});

// ---------------------------------------------------------------------------

describe('formatVoiceInfo', () => {
  let formatVoiceInfo;
  before(async () => {
    const mod = await import('../../src/console/tabs/voices-tab.js');
    formatVoiceInfo = mod.formatVoiceInfo;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatVoiceInfo, 'function');
  });

  test('returns string for en_US-amy-medium', () => {
    const s = formatVoiceInfo('en_US-amy-medium');
    assert.ok(s.includes('en_US'));
    assert.ok(s.includes('amy'));
    assert.ok(s.includes('medium'));
  });

  test('returns string for unknown voice', () => {
    const s = formatVoiceInfo('tracy');
    assert.ok(typeof s === 'string');
    assert.ok(s.length > 0);
  });
});

// ---------------------------------------------------------------------------

describe('createVoicesTab — Tab Component Contract', () => {
  let createVoicesTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/voices-tab.js');
    createVoicesTab = mod.createVoicesTab;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof createVoicesTab, 'function');
  });

  test('returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveVoiceId: () => 'en_US-amy-medium', setActiveVoice: () => {} },
    };
    const tab = createVoicesTab(mockScreen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns teal #00695c', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createVoicesTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveVoiceId: () => 'en_US-amy-medium', setActiveVoice: () => {} },
    });
    assert.strictEqual(tab.getFooterColor(), '#00695c');
  });
});

// ---------------------------------------------------------------------------

describe('inferGender', () => {
  let inferGender;
  before(async () => {
    const mod = await import('../../src/console/tabs/voices-tab.js');
    inferGender = mod.inferGender;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof inferGender, 'function');
  });

  test('detects female from _female in voice ID', () => {
    assert.strictEqual(inferGender('en_GB-southern_english_female-low'), 'Female');
  });

  test('detects female for amy (lookup)', () => {
    assert.strictEqual(inferGender('en_US-amy-medium'), 'Female');
  });

  test('detects male for alan (lookup)', () => {
    assert.strictEqual(inferGender('en_GB-alan-medium'), 'Male');
  });

  test('detects male for ryan (lookup)', () => {
    assert.strictEqual(inferGender('en_US-ryan-high'), 'Male');
  });

  test('returns — for unknown voice', () => {
    assert.strictEqual(inferGender('xx_XX-unknown-medium'), '—');
  });

  test('uses dataset param when provided', () => {
    assert.strictEqual(inferGender('en_US-amy-medium', 'amy'), 'Female');
  });
});

// ---------------------------------------------------------------------------

describe('formatVoiceName', () => {
  let formatVoiceName;
  before(async () => {
    const mod = await import('../../src/console/tabs/voices-tab.js');
    formatVoiceName = mod.formatVoiceName;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatVoiceName, 'function');
  });

  test('title-cases simple dataset name', () => {
    assert.strictEqual(formatVoiceName('en_US-amy-medium', 'amy'), 'Amy');
  });

  test('title-cases multi-word dataset', () => {
    assert.strictEqual(formatVoiceName('en_GB-southern_english_female-low', 'southern_english_female'), 'Southern English Female');
  });

  test('uses display name override for ljspeech', () => {
    assert.strictEqual(formatVoiceName('en_US-ljspeech-high', 'ljspeech'), 'LJ Speech');
  });

  test('falls back to parsing voice ID when no dataset', () => {
    const result = formatVoiceName('en_US-alan-medium');
    assert.ok(result.toLowerCase().includes('alan'));
  });
});
