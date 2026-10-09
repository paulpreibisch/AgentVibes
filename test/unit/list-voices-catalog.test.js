/**
 * list-voices.js catalog-iteration characterization (AVI-S9.5, Phase 4).
 *
 * The four hardcoded `provider === '...'` branches in src/cli/list-voices.js were
 * replaced by iterating the Provider Catalog and branching only on `voiceModel`
 * (design row 19). This test PINS the resolved output per provider so the
 * migration is provably behavior-preserving: the voice list + display label for
 * every existing provider is unchanged, and unknown/Windows-only providers keep
 * the honest "no voice list available" label from AVI-S8.1.
 *
 * @module test/unit/list-voices-catalog
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { selectVoices } from '../../src/cli/list-voices.js';
import {
  KOKORO_VOICE_IDS,
  ELEVENLABS_VOICES,
} from '../../src/services/provider-voice-catalog.js';

describe('list-voices selectVoices — catalog-driven, output unchanged', () => {
  test('kokoro → Kokoro TTS with the full static voice list', () => {
    const { voices, providerName } = selectVoices('kokoro', 'af_heart', '');
    assert.equal(providerName, 'Kokoro TTS');
    assert.equal(voices.length, KOKORO_VOICE_IDS.length);
    assert.equal(voices[0].name, KOKORO_VOICE_IDS[0]);
    assert.ok(voices.find((v) => v.name === 'af_heart').current, 'current voice must be flagged');
  });

  test('elevenlabs → ElevenLabs with the 21 name-to-id voices', () => {
    const { voices, providerName } = selectVoices('elevenlabs', 'Sarah', '');
    assert.equal(providerName, 'ElevenLabs');
    assert.equal(voices.length, ELEVENLABS_VOICES.length);
    assert.equal(voices[0].name, 'Sarah');
  });

  test('soprano → Soprano TTS with its single canonical voice', () => {
    const { voices, providerName } = selectVoices('soprano', '', '');
    assert.equal(providerName, 'Soprano TTS');
    assert.deepEqual(voices.map((v) => v.name), ['soprano-default']);
  });

  test('macos → "macOS TTS" label preserved (not the catalog display name)', () => {
    const { providerName } = selectVoices('macos', '', '');
    assert.equal(providerName, 'macOS TTS');
  });

  test('piper → Piper TTS, discovering *.onnx voices from the injected dir', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'av-piper-'));
    try {
      writeFileSync(path.join(dir, 'en_US-amy-medium.onnx'), '');
      writeFileSync(path.join(dir, 'en_GB-alan-low.onnx'), '');
      writeFileSync(path.join(dir, 'notes.txt'), 'ignore me');
      const { voices, providerName } = selectVoices('piper', 'en_US-amy-medium', dir);
      assert.equal(providerName, 'Piper TTS');
      assert.deepEqual(voices.map((v) => v.name).sort(), ['en_GB-alan-low', 'en_US-amy-medium']);
      assert.ok(voices.find((v) => v.name === 'en_US-amy-medium').current);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('windows-only + unknown providers keep the honest "no voice list" label', () => {
    for (const p of ['windows-piper', 'windows-sapi', 'totally-bogus']) {
      const { voices, providerName } = selectVoices(p, '', '');
      assert.deepEqual(voices, []);
      assert.equal(providerName, `${p} (no voice list available)`);
    }
  });
});
