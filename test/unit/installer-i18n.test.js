/**
 * Tests for i18n strings and language utilities (src/i18n/strings.js)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, strings, SUPPORTED_LANGUAGES } from '../../src/i18n/strings.js';

test('t(en, welcomeTitle) returns English string', () => {
  const result = t('en', 'welcomeTitle');
  assert.ok(result.length > 0, 'should return a non-empty string');
  assert.strictEqual(result, strings.en.welcomeTitle);
});

test('t(es, welcomeTitle) returns Spanish string', () => {
  const result = t('es', 'welcomeTitle');
  assert.strictEqual(result, strings.es.welcomeTitle);
  assert.notStrictEqual(result, strings.en.welcomeTitle, 'Spanish should differ from English');
});

test('t(xx, welcomeTitle) falls back to English for unknown language', () => {
  const result = t('xx', 'welcomeTitle');
  assert.strictEqual(result, strings.en.welcomeTitle, 'unknown lang should fall back to English');
});

test('t(es, nonExistentKey) falls back to English value', () => {
  const result = t('es', 'nonExistentKey_xyz');
  // English also does not have it — both return the key itself
  assert.strictEqual(result, t('en', 'nonExistentKey_xyz'));
});

test('SUPPORTED_LANGUAGES has exactly 9 entries', () => {
  assert.strictEqual(SUPPORTED_LANGUAGES.length, 9);
});

test('All 9 language codes have entries in strings', () => {
  const codes = SUPPORTED_LANGUAGES.map(l => l.value);
  for (const code of codes) {
    assert.ok(strings[code] !== undefined, `strings should contain entry for '${code}'`);
  }
});

test('Each language has all the same keys as English (completeness check)', () => {
  const englishKeys = Object.keys(strings.en);
  const codes = SUPPORTED_LANGUAGES.map(l => l.value).filter(c => c !== 'en');

  for (const code of codes) {
    for (const key of englishKeys) {
      assert.ok(
        strings[code][key] !== undefined,
        `Language '${code}' is missing key '${key}'`
      );
    }
  }
});

test('t returns key itself when key is missing from all languages', () => {
  const missingKey = 'this_key_does_not_exist_anywhere';
  const result = t('en', missingKey);
  assert.strictEqual(result, missingKey);
});
