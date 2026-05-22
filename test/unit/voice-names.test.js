/**
 * Tests for uniquifyVoiceName, formatVoiceName display logic,
 * buildLibriTTSDisplayNameMap, and resolveVoice.
 *
 * Covers:
 * - SURNAME_POOL indexing (n >= 2, n = 1, n = 0)
 * - Already-full names (space present) left unchanged
 * - formatVoiceName bracket display for TUI (16Speakers vs LibriTTS)
 * - buildLibriTTSDisplayNameMap: missing file, valid JSON, map keys
 * - resolveVoice: model::Speaker format, plain piper ID, catalog lookup,
 *   underscore normalisation, invalid input
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { uniquifyVoiceName, SURNAME_POOL, buildLibriTTSDisplayNameMap, resolveVoice } from '../../src/utils/voice-names.js';
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

// ============================================================
// buildLibriTTSDisplayNameMap tests
// ============================================================

describe('buildLibriTTSDisplayNameMap', () => {
  let tmpDir;
  let assignmentsPath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-vntest-'));
    assignmentsPath = path.join(tmpDir, 'voice-assignments.json');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns empty Map when file does not exist', () => {
    const result = buildLibriTTSDisplayNameMap(path.join(tmpDir, 'no-such-file.json'));
    assert.ok(result instanceof Map);
    assert.strictEqual(result.size, 0);
  });

  test('returns empty Map when path is empty string', () => {
    const result = buildLibriTTSDisplayNameMap('');
    assert.ok(result instanceof Map);
    assert.strictEqual(result.size, 0);
  });

  test('returns empty Map when file contains invalid JSON', () => {
    const badPath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(badPath, 'NOT JSON {{{');
    const result = buildLibriTTSDisplayNameMap(badPath);
    assert.ok(result instanceof Map);
    assert.strictEqual(result.size, 0);
  });

  test('returns empty Map when libritts_speakers key is absent', () => {
    fs.writeFileSync(assignmentsPath, JSON.stringify({ other_key: {} }));
    const result = buildLibriTTSDisplayNameMap(assignmentsPath);
    assert.ok(result instanceof Map);
    assert.strictEqual(result.size, 0);
  });

  test('builds map with 3 keys per speaker (displayName, rawName, speakerName)', () => {
    const data = {
      libritts_speakers: {
        '0': { voice_name: 'Anna', gender: 'female' },
      },
    };
    fs.writeFileSync(assignmentsPath, JSON.stringify(data));
    const result = buildLibriTTSDisplayNameMap(assignmentsPath);
    // Anna → "Anna Bell" (uniquifyVoiceName adds surname)
    assert.ok(result.has('anna bell'), 'displayName key (lowercased) must be present');
    assert.ok(result.has('anna'),      'rawName/speakerName key (lowercased) must be present');
    // displayName and rawName are the same key for a single-word speaker — size is 2 unique keys
    assert.ok(result.size >= 2);
  });

  test('entry has correct voiceId, model, speakerName, speakerId, displayName, gender', () => {
    const data = {
      libritts_speakers: {
        '1': { voice_name: 'Bella', gender: 'female' },
      },
    };
    fs.writeFileSync(assignmentsPath, JSON.stringify(data));
    const result = buildLibriTTSDisplayNameMap(assignmentsPath);
    const entry = result.get('bella bell');
    assert.ok(entry, 'entry for "bella bell" must exist');
    assert.strictEqual(entry.voiceId,      'en_US-libritts-high::Bella');
    assert.strictEqual(entry.model,        'en_US-libritts-high');
    assert.strictEqual(entry.speakerName,  'Bella');
    assert.strictEqual(entry.speakerId,    1);
    assert.strictEqual(entry.displayName,  'Bella Bell');
    assert.strictEqual(entry.gender,       'female');
  });

  test('numbered speaker name produces correct surname via uniquifyVoiceName', () => {
    const data = {
      libritts_speakers: {
        '2': { voice_name: 'Anna-2', gender: 'female' },
      },
    };
    fs.writeFileSync(assignmentsPath, JSON.stringify(data));
    const result = buildLibriTTSDisplayNameMap(assignmentsPath);
    // Anna-2 → "Anna Carter"
    const entry = result.get('anna carter');
    assert.ok(entry, 'key "anna carter" must exist for Anna-2');
    assert.strictEqual(entry.displayName, 'Anna Carter');
    assert.strictEqual(entry.speakerId,   2);
  });

  test('full-name speaker (space present) is stored unchanged', () => {
    const data = {
      libritts_speakers: {
        '99': { voice_name: 'Cori Samuel', gender: 'female' },
      },
    };
    fs.writeFileSync(assignmentsPath, JSON.stringify(data));
    const result = buildLibriTTSDisplayNameMap(assignmentsPath);
    const entry = result.get('cori samuel');
    assert.ok(entry, 'key "cori samuel" must exist');
    assert.strictEqual(entry.displayName, 'Cori Samuel');
  });

  test('handles multiple speakers and indexes all of them', () => {
    const data = {
      libritts_speakers: {
        '0': { voice_name: 'Anna',  gender: 'female' },
        '2': { voice_name: 'Alex',  gender: 'male'   },
        '3': { voice_name: 'Ben',   gender: 'male'   },
      },
    };
    fs.writeFileSync(assignmentsPath, JSON.stringify(data));
    const result = buildLibriTTSDisplayNameMap(assignmentsPath);
    assert.ok(result.has('anna bell'),  'Anna must be indexed');
    assert.ok(result.has('alex bell'),  'Alex must be indexed');
    assert.ok(result.has('ben bell'),   'Ben must be indexed');
  });

  test('gender defaults to empty string when absent from entry', () => {
    const data = {
      libritts_speakers: {
        '5': { voice_name: 'Echo' },
      },
    };
    fs.writeFileSync(assignmentsPath, JSON.stringify(data));
    const result = buildLibriTTSDisplayNameMap(assignmentsPath);
    const entry = result.get('echo bell');
    assert.ok(entry);
    assert.strictEqual(entry.gender, '');
  });
});

// ============================================================
// resolveVoice tests
// ============================================================

describe('resolveVoice', () => {
  let tmpDir;
  let assignmentsPath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-resolve-'));
    assignmentsPath = path.join(tmpDir, 'voice-assignments.json');

    // Write a small catalog used by most tests
    const data = {
      libritts_speakers: {
        '0': { voice_name: 'Anna',        gender: 'female' },
        '1': { voice_name: 'Bella',       gender: 'female' },
        '2': { voice_name: 'Anna-2',      gender: 'female' },
        '9': { voice_name: 'Cori Samuel', gender: 'female' },
      },
    };
    fs.writeFileSync(assignmentsPath, JSON.stringify(data));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns null for empty string input', () => {
    assert.strictEqual(resolveVoice('', assignmentsPath), null);
  });

  test('returns null for null input', () => {
    assert.strictEqual(resolveVoice(null, assignmentsPath), null);
  });

  // model::Speaker format
  test('model::Speaker format — extracts model and speakerName', () => {
    const result = resolveVoice('en_US-libritts-high::Anna', assignmentsPath);
    assert.ok(result, 'result must not be null');
    assert.strictEqual(result.voiceId,     'en_US-libritts-high::Anna');
    assert.strictEqual(result.model,       'en_US-libritts-high');
    assert.strictEqual(result.speakerName, 'Anna');
  });

  test('model::Speaker format — speakerId populated from catalog', () => {
    const result = resolveVoice('en_US-libritts-high::Anna', assignmentsPath);
    assert.strictEqual(result.speakerId, 0);
    assert.strictEqual(result.displayName, 'Anna Bell');
  });

  test('model::Speaker format — speakerId null when not in catalog', () => {
    const result = resolveVoice('en_US-libritts-high::Ghost', assignmentsPath);
    assert.ok(result, 'unknown speaker still resolves to a voiceId object');
    assert.strictEqual(result.speakerId,   null);
    assert.strictEqual(result.displayName, 'Ghost');
  });

  test('model::Speaker format — invalid model chars returns null', () => {
    const result = resolveVoice('en US-bad model::Anna', assignmentsPath);
    assert.strictEqual(result, null);
  });

  test('model::Speaker format — shell injection chars in model returns null', () => {
    const result = resolveVoice('en_US-libritts;rm -rf::Anna', assignmentsPath);
    assert.strictEqual(result, null);
  });

  // Plain piper model ID
  test('plain piper ID — en_US-lessac-medium resolves to itself', () => {
    const result = resolveVoice('en_US-lessac-medium', assignmentsPath);
    assert.ok(result, 'plain piper ID must resolve');
    assert.strictEqual(result.voiceId,     'en_US-lessac-medium');
    assert.strictEqual(result.model,       'en_US-lessac-medium');
    assert.strictEqual(result.speakerName, null);
    assert.strictEqual(result.speakerId,   null);
  });

  test('plain piper ID — en_US-amy-medium resolves to itself', () => {
    const result = resolveVoice('en_US-amy-medium', assignmentsPath);
    assert.ok(result);
    assert.strictEqual(result.voiceId, 'en_US-amy-medium');
  });

  test('plain piper ID — model with digits like en_US-libritts_r9y9-medium resolves', () => {
    const result = resolveVoice('en_US-libritts_r9y9-medium', assignmentsPath);
    assert.ok(result);
    assert.strictEqual(result.voiceId, 'en_US-libritts_r9y9-medium');
  });

  // Catalog display name lookup
  test('display name lookup — "Bella Bell" resolves via catalog', () => {
    const result = resolveVoice('Bella Bell', assignmentsPath);
    assert.ok(result, '"Bella Bell" must resolve via catalog');
    assert.strictEqual(result.voiceId, 'en_US-libritts-high::Bella');
    assert.strictEqual(result.speakerId, 1);
  });

  test('display name lookup — raw catalog name "Bella" resolves', () => {
    const result = resolveVoice('Bella', assignmentsPath);
    assert.ok(result, '"Bella" must resolve via rawName key');
    assert.strictEqual(result.voiceId, 'en_US-libritts-high::Bella');
  });

  test('display name lookup — case-insensitive match works', () => {
    const result = resolveVoice('bella bell', assignmentsPath);
    assert.ok(result, 'lowercase lookup must work');
    assert.strictEqual(result.voiceId, 'en_US-libritts-high::Bella');
  });

  test('display name lookup — numbered name "Anna-2" resolves', () => {
    const result = resolveVoice('Anna-2', assignmentsPath);
    assert.ok(result, '"Anna-2" must resolve');
    assert.strictEqual(result.displayName, 'Anna Carter');
  });

  test('display name lookup — full name with space "Cori Samuel" resolves', () => {
    const result = resolveVoice('Cori Samuel', assignmentsPath);
    assert.ok(result, '"Cori Samuel" must resolve');
    assert.strictEqual(result.voiceId, 'en_US-libritts-high::Cori Samuel');
  });

  // Underscore normalisation (16Speakers names)
  test('underscore normalised to space before lookup — "Anna_Carter" finds "Anna Carter"', () => {
    // Inject a speaker whose display name is "Anna Carter"
    const specialPath = path.join(tmpDir, 'voice-assignments-underscore.json');
    const data = {
      libritts_speakers: {
        '2': { voice_name: 'Anna-2', gender: 'female' },
      },
    };
    fs.writeFileSync(specialPath, JSON.stringify(data));
    // Anna-2 → displayName "Anna Carter"; underscore form "Anna_Carter" should resolve
    const result = resolveVoice('Anna_Carter', specialPath);
    assert.ok(result, '"Anna_Carter" must resolve via underscore normalisation');
    assert.strictEqual(result.displayName, 'Anna Carter');
  });

  // Nothing matched
  test('returns null for completely unrecognised input', () => {
    const result = resolveVoice('zzz-nonexistent-xyz', assignmentsPath);
    assert.strictEqual(result, null, 'unrecognised name must return null');
  });

  test('returns null when assignments file does not exist', () => {
    const result = resolveVoice('Bella', path.join(tmpDir, 'no-such-file.json'));
    assert.strictEqual(result, null, 'missing file should cause null return');
  });
});
