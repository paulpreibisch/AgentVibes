/**
 * ElevenLabs catalog parity — the shell catalog (.claude/hooks/elevenlabs-voices.sh)
 * and the JS catalog (src/services/provider-voice-catalog.js → ELEVENLABS_VOICES)
 * are two representations of ONE curated voice set (bash can't import JS). This
 * test fails the moment they drift, keeping the single-source-of-truth honest.
 *
 * @module test/unit/elevenlabs-catalog-parity
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ELEVENLABS_VOICES } from '../../src/services/provider-voice-catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shSrc = readFileSync(path.join(ROOT, '.claude/hooks/elevenlabs-voices.sh'), 'utf8');

/** Parse the `[Name]="id"` entries of the ELEVENLABS_VOICE_IDS bash assoc array. */
function bashCatalog(src) {
  const map = {};
  const re = /\[([A-Za-z0-9_]+)\]="([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) map[m[1]] = m[2];
  return map;
}

describe('ElevenLabs catalog parity (bash ↔ JS)', () => {
  const bash = bashCatalog(shSrc);
  const js = Object.fromEntries(ELEVENLABS_VOICES.map((v) => [v.name, v.id]));

  test('same set of voice names', () => {
    assert.deepEqual(
      Object.keys(bash).sort(),
      Object.keys(js).sort(),
      'bash elevenlabs-voices.sh and JS ELEVENLABS_VOICES define different names',
    );
  });

  test('every name maps to the same voice_id in both', () => {
    for (const [name, id] of Object.entries(js)) {
      assert.equal(bash[name], id, `id mismatch for "${name}": bash=${bash[name]} js=${id}`);
    }
  });

  test('no duplicate voice_ids in the catalog (each name is a distinct voice)', () => {
    const ids = ELEVENLABS_VOICES.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate voice_id in ELEVENLABS_VOICES');
  });

  test('default voice is a real catalog entry', () => {
    const m = shSrc.match(/ELEVENLABS_DEFAULT_VOICE="([^"]+)"/);
    assert.ok(m, 'ELEVENLABS_DEFAULT_VOICE not set in elevenlabs-voices.sh');
    assert.ok(bash[m[1]], `default voice "${m[1]}" is not in the catalog`);
  });
});
