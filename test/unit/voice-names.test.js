/**
 * Tests for uniquifyVoiceName and formatVoiceName display logic.
 *
 * Covers:
 * - SURNAME_POOL indexing (n >= 2, n = 1, n = 0)
 * - Already-full names (space present) left unchanged
 * - formatVoiceName bracket display for TUI (16Speakers vs LibriTTS)
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { uniquifyVoiceName, SURNAME_POOL } from '../../src/utils/voice-names.js';
import { formatVoiceName } from '../../src/console/widgets/format-utils.js';

// ============================================================
// uniquifyVoiceName unit tests
// ============================================================

test('uniquifyVoiceName - single name gets Bell (index 0)', () => {
  assert.strictEqual(uniquifyVoiceName('Mary'), 'Mary Bell');
});

test('uniquifyVoiceName - n=1 suffix treated like no suffix (Bell)', () => {
  // n < 2 → strip suffix, use Bell; same as bare name
  assert.strictEqual(uniquifyVoiceName('Mary-1'), 'Mary Bell');
});

test('uniquifyVoiceName - n=2 → Carter (index 1)', () => {
  assert.strictEqual(uniquifyVoiceName('Mary-2'), 'Mary Carter');
});

test('uniquifyVoiceName - n=13 → Nash (index 12)', () => {
  assert.strictEqual(uniquifyVoiceName('Mike-13'), 'Mike Nash');
});

test('uniquifyVoiceName - n=16 → Quinn (index 15)', () => {
  assert.strictEqual(uniquifyVoiceName('Anna-16'), `Anna ${SURNAME_POOL[15]}`);
});

test('uniquifyVoiceName - n=17 wraps to Bell (index 0)', () => {
  assert.strictEqual(uniquifyVoiceName('Anna-17'), 'Anna Bell');
});

test('uniquifyVoiceName - already full name (space) returned unchanged', () => {
  assert.strictEqual(uniquifyVoiceName('Cori Samuel'), 'Cori Samuel');
  assert.strictEqual(uniquifyVoiceName('Rose Ibex'), 'Rose Ibex');
});

test('uniquifyVoiceName - empty string returned as-is', () => {
  assert.strictEqual(uniquifyVoiceName(''), '');
});

// ============================================================
// formatVoiceName display tests (TUI column text)
// ============================================================

test('formatVoiceName - LibriTTS single-word gets surname bracket', () => {
  const result = formatVoiceName('en_US-libritts-high::Mary');
  assert.ok(result.includes('Mary Bell'), `Expected "Mary Bell", got "${result}"`);
});

test('formatVoiceName - LibriTTS numbered speaker shows friendly name', () => {
  const result = formatVoiceName('en_US-libritts-high::Mike-13');
  assert.ok(result.includes('Mike Nash'), `Expected "Mike Nash", got "${result}"`);
});

test('formatVoiceName - 16Speakers underscore name shown without extra surname', () => {
  const result = formatVoiceName('16Speakers::Rose_Ibex');
  assert.ok(
    result.includes('Rose Ibex'),
    `Expected "Rose Ibex", got "${result}"`
  );
  // Must NOT append another surname ("Rose Ibex Bell" would be wrong)
  assert.ok(
    !result.includes('Rose Ibex Bell'),
    `16Speakers name must not get extra surname, got "${result}"`
  );
});

test('formatVoiceName - 16Speakers Emily_Cripps normalised correctly', () => {
  const result = formatVoiceName('16Speakers::Emily_Cripps');
  assert.ok(result.includes('Emily Cripps'), `Expected "Emily Cripps", got "${result}"`);
  assert.ok(!result.includes('Emily Cripps Bell'), `Must not add extra surname, got "${result}"`);
});

test('formatVoiceName - plain piper model strips locale and quality', () => {
  const result = formatVoiceName('en_US-lessac-medium');
  assert.ok(result.toLowerCase().includes('lessac'), `Expected lessac in "${result}"`);
});

// ============================================================
// Bash/PS1 SURNAME_POOL consistency guard
// ============================================================

test('SURNAME_POOL has exactly 16 entries', () => {
  assert.strictEqual(SURNAME_POOL.length, 16);
});

test('SURNAME_POOL starts with Bell and ends with Quinn', () => {
  assert.strictEqual(SURNAME_POOL[0], 'Bell');
  assert.strictEqual(SURNAME_POOL[15], 'Quinn');
});

test('SURNAME_POOL matches bash/PS1 array order', () => {
  const expectedOrder = ['Bell','Carter','Davis','Ellis','Foster','Gray','Hayes','Irving',
    'Jones','Knox','Lane','Mason','Nash','Owens','Pierce','Quinn'];
  assert.deepStrictEqual([...SURNAME_POOL], expectedOrder);
});
