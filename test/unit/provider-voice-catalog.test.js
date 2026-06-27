/**
 * Tests for the shared provider voice catalog and the provider-aware voice
 * pool used by BMAD auto-assign.
 *
 * @module test/unit/provider-voice-catalog
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEVENLABS_VOICES,
  KOKORO_VOICE_IDS,
  kokoroGender,
  voicesForProvider,
} from '../../src/services/provider-voice-catalog.js';

describe('kokoroGender()', () => {
  test('reads female from the 2nd char (f)', () => {
    assert.equal(kokoroGender('af_heart'), 'Female');
    assert.equal(kokoroGender('bf_emma'), 'Female');
    assert.equal(kokoroGender('zf_xiaoxiao'), 'Female');
  });
  test('reads male from the 2nd char (m)', () => {
    assert.equal(kokoroGender('am_adam'), 'Male');
    assert.equal(kokoroGender('zm_yunxi'), 'Male');
    assert.equal(kokoroGender('km_hyunsu'), 'Male');
  });
  test('returns empty for malformed/empty input', () => {
    assert.equal(kokoroGender(''), '');
    assert.equal(kokoroGender('x'), '');
    assert.equal(kokoroGender(null), '');
    assert.equal(kokoroGender(undefined), '');
  });
});

describe('voicesForProvider()', () => {
  test('kokoro: every voice id with a derived gender', () => {
    const pool = voicesForProvider('kokoro');
    assert.equal(pool.length, KOKORO_VOICE_IDS.length);
    assert.ok(pool.every(v => typeof v.id === 'string' && v.id.length > 0));
    // af_heart is female, am_adam is male
    assert.equal(pool.find(v => v.id === 'af_heart').gender, 'Female');
    assert.equal(pool.find(v => v.id === 'am_adam').gender, 'Male');
  });

  test('elevenlabs: ids and genders from the catalog', () => {
    const pool = voicesForProvider('elevenlabs');
    assert.equal(pool.length, ELEVENLABS_VOICES.length);
    assert.equal(pool.find(v => v.id === 'EXAVITQu4vr4xnSDxMaL').gender, 'Female'); // Sarah
    assert.equal(pool.find(v => v.id === 'pNInz6obpgDQGcFmaJgB').gender, 'Male');   // Adam
  });

  test('single-voice provider (soprano): one synthetic entry', () => {
    const pool = voicesForProvider('soprano');
    assert.deepEqual(pool, [{ id: 'soprano', gender: '' }]);
  });

  test('piper: uses injected disk-scan + metadata helpers', () => {
    const pool = voicesForProvider('piper', {
      scanInstalledVoices: () => ['en_US-ryan-high', 'en_GB-alba-medium'],
      getVoiceMeta: (id) => ({ gender: id.includes('ryan') ? 'Male' : 'Female' }),
    });
    assert.deepEqual(pool, [
      { id: 'en_US-ryan-high', gender: 'Male' },
      { id: 'en_GB-alba-medium', gender: 'Female' },
    ]);
  });

  test('defaults to piper when provider is undefined', () => {
    const pool = voicesForProvider(undefined, {
      scanInstalledVoices: () => ['x'],
      getVoiceMeta: () => ({ gender: 'Male' }),
    });
    assert.deepEqual(pool, [{ id: 'x', gender: 'Male' }]);
  });

  test('piper with no helpers yields an empty pool (no crash)', () => {
    assert.deepEqual(voicesForProvider('piper'), []);
  });

  test('case-insensitive provider matching', () => {
    assert.equal(voicesForProvider('KOKORO').length, KOKORO_VOICE_IDS.length);
    assert.equal(voicesForProvider('ElevenLabs').length, ELEVENLABS_VOICES.length);
  });
});
