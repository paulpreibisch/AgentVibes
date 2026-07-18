// Provider-aware voice picker (spec-provider-aware-voice-picker).
//
// The Settings default-voice picker and the Voices tab used to list voices via
// scanInstalledVoices() (Piper-only disk scan), ignoring the active engine. They
// now derive the list from the Provider Catalog via voicesForProvider(), keyed on
// the active provider, mapping {id,gender} -> id. This test asserts that exact
// usage pattern is provider-aware (no blessed/TUI needed — voicesForProvider is
// pure, so it runs in any Node, unlike the repo's mock.module blessed tests).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voicesForProvider, KOKORO_VOICE_IDS, ELEVENLABS_VOICES, WINDOWS_SAPI_VOICES } from '../../src/services/provider-voice-catalog.js';
import { getVoiceMeta } from '../../src/console/tabs/voices-tab.js';

// The picker does: voicesForProvider(activeProvider, { scanInstalledVoices, getVoiceMeta }).map(v => v.id)
const pick = (provider, deps) => voicesForProvider(provider, deps).map(v => v.id);

// Fakes for the disk-discovered (piper) path — the picker injects these.
const fakeScan = () => ['en_US-amy-medium', 'en_GB-alan-low'];
const fakeMeta = (id) => ({ gender: id.includes('amy') ? 'female' : 'male' });

test('kokoro active -> picker lists Kokoro catalog voices (not Piper)', () => {
  const ids = pick('kokoro', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta });
  assert.deepEqual(ids, KOKORO_VOICE_IDS);
  assert.ok(ids.every(id => /^[a-z]{2}_/.test(id)), 'kokoro ids look like af_/am_/…');
  assert.ok(!ids.includes('en_US-amy-medium'), 'no Piper voices leak in');
});

test('elevenlabs active -> picker lists ElevenLabs catalog voices', () => {
  const ids = pick('elevenlabs', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta });
  assert.deepEqual(ids, ELEVENLABS_VOICES.map(v => v.id));
  assert.ok(ids.length > 0);
});

test('piper active -> picker lists the on-disk scanned voices (unchanged)', () => {
  const ids = pick('piper', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta });
  assert.deepEqual(ids, ['en_US-amy-medium', 'en_GB-alan-low']);
});

test('soprano active -> single synthetic entry', () => {
  const ids = pick('soprano', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta });
  assert.deepEqual(ids, ['soprano']);
});

// Windows SAPI voices live on the receiver, so the picker must show the curated
// built-in list — NOT the local Piper disk scan (the reported bug).
test('sapi active -> curated Windows SAPI voices (not Piper)', () => {
  const ids = pick('sapi', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta });
  assert.deepEqual(ids, WINDOWS_SAPI_VOICES.map(v => v.id));
  assert.ok(ids.includes('Microsoft David Desktop'));
  assert.ok(!ids.includes('en_US-amy-medium'), 'no Piper voices leak in');
});

test('windows-sapi alias resolves the same as sapi', () => {
  assert.deepEqual(
    pick('windows-sapi', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta }),
    pick('sapi', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta }));
});

test('macos active -> curated macOS voices (not Piper)', () => {
  const ids = pick('macos', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta });
  assert.ok(ids.includes('Samantha'));
  assert.ok(!ids.includes('en_US-amy-medium'), 'no Piper voices leak in');
});

test('unknown/unset provider -> falls back to the Piper disk scan (no crash)', () => {
  assert.deepEqual(pick('nonsense-provider', { scanInstalledVoices: fakeScan, getVoiceMeta: fakeMeta }),
    ['en_US-amy-medium', 'en_GB-alan-low']);
  // Missing deps entirely (defensive): empty list, never throws.
  assert.deepEqual(voicesForProvider('piper', {}).map(v => v.id), []);
});

// getVoiceMeta must resolve non-Piper ids from the catalog (labels/gender/provider),
// not fall through to the Piper-only path — otherwise ElevenLabs shows raw ids
// tagged "Piper" and Kokoro loses its gender (review MED-1/MED-2).
test('getVoiceMeta: ElevenLabs id -> friendly name, real gender, ElevenLabs provider', () => {
  const el = ELEVENLABS_VOICES[0];
  const m = getVoiceMeta(el.id);
  assert.equal(m.provider, 'ElevenLabs');
  assert.equal(m.displayName, el.name);            // "Sarah", not the raw id
  assert.notEqual(m.displayName, el.id);
  if (el.gender) assert.equal(m.gender, el.gender); // real gender, not "—"
});

test('getVoiceMeta: Kokoro id -> Kokoro provider + real gender (not Piper/—)', () => {
  const id = KOKORO_VOICE_IDS[0];
  const m = getVoiceMeta(id);
  assert.equal(m.provider, 'Kokoro');
  assert.notEqual(m.provider, 'Piper');
  assert.notEqual(m.gender, '—');                   // gender resolved via kokoroGender
});

test('getVoiceMeta: Piper id still resolves as Piper (unchanged)', () => {
  const m = getVoiceMeta('en_US-lessac-medium');
  assert.match(m.provider, /^Piper/);
});

// Single-voice provider ids (soprano) must NOT fall through to the Piper path —
// otherwise the Voices tab shows "soprano … Piper" (the reported bug).
test('getVoiceMeta: soprano id -> Soprano provider (not Piper)', () => {
  const m = getVoiceMeta('soprano');
  assert.equal(m.provider, 'Soprano');
  assert.notEqual(m.provider, 'Piper');
});

// Windows SAPI voice names must resolve to a friendly label + Windows SAPI
// provider, not be mislabeled as Piper.
test('getVoiceMeta: SAPI voice name -> Windows SAPI provider + friendly name', () => {
  const m = getVoiceMeta('Microsoft David Desktop');
  assert.equal(m.provider, 'Windows SAPI');
  assert.notEqual(m.provider, 'Piper');
  assert.equal(m.displayName, 'David');
  assert.equal(m.gender, 'Male');
});

test('getVoiceMeta: macOS voice name -> macOS Say provider (not Piper)', () => {
  const m = getVoiceMeta('Samantha');
  assert.equal(m.provider, 'macOS Say');
  assert.notEqual(m.provider, 'Piper');
});
