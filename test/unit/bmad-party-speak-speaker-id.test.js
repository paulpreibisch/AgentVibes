#!/usr/bin/env node
/**
 * Test for party mode speaker ID resolution fix
 *
 * Bug: bmad-party-speak.ps1 used a naive regex to extract the trailing number
 * from a speaker display name (e.g. "14" from "Yara-14") and passed it directly
 * as the piper --speaker index. This is wrong — the display suffix is a human-
 * readable disambiguator, NOT the actual speaker index in the model.
 *
 * Fix: Look up the full speaker name (e.g. "Yara-14") in the speaker_id_map
 * from the .onnx.json file, exactly as play-tts-piper.ps1 already does.
 *
 * This test validates the correct lookup logic works for all name formats:
 *   - Plain names: "Evan", "Alex" (no suffix)
 *   - Numbered names: "Yara-14", "Holly-2" (full name is the key, not the number)
 *
 * Refs: GitHub issue #165
 *
 * Run with: node --test test/unit/bmad-party-speak-speaker-id.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Mirror the fixed speaker resolution logic from bmad-party-speak.ps1
// (cross-platform JS equivalent for testing)

/**
 * Resolve the piper speaker index for a voice string like
 * "en_US-libritts-high::Yara-14" or "en_US-ryan-high".
 *
 * @param {string} voiceString  Full voice string (may contain ::SpeakerName)
 * @param {string} voicesDir    Directory containing *.onnx.json files
 * @returns {{ voiceName: string, speakerId: string|null }}
 */
async function resolveVoiceAndSpeaker(voiceString, voicesDir) {
  if (!voiceString.includes('::')) {
    return { voiceName: voiceString, speakerId: null };
  }

  const [voiceName, speakerName] = voiceString.split('::');

  if (!speakerName) {
    return { voiceName, speakerId: null };
  }

  // Look up real index from speaker_id_map — NEVER use raw suffix number
  const onnxJsonPath = path.join(voicesDir, `${voiceName}.onnx.json`);
  try {
    const raw = await fs.readFile(onnxJsonPath, 'utf8');
    const data = JSON.parse(raw);
    const map = data.speaker_id_map ?? {};
    const idx = map[speakerName];
    return {
      voiceName,
      speakerId: idx !== undefined ? String(idx) : null,
    };
  } catch {
    return { voiceName, speakerId: null };
  }
}

/**
 * The BUGGY naive approach that was in bmad-party-speak.ps1 before the fix.
 * Extracts the trailing number from the speaker name suffix.
 */
function naiveSpeakerIdExtraction(voiceString) {
  if (!voiceString.includes('::')) return null;
  const speakerName = voiceString.split('::')[1] ?? '';
  const m = speakerName.match(/-(\d+)$/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Tests

describe('Party mode speaker ID resolution (fix for issue #165)', () => {
  let voicesDir;

  // Build a minimal mock .onnx.json with a realistic speaker_id_map
  const MOCK_SPEAKER_MAP = {
    // Plain names (no suffix)
    Evan:  5,
    Alex:  16,
    // Numbered names — suffix is NOT the index
    'Yara-14': 860,
    'Mike-10':  584,
    'Faye-3':   151,
    'Jake-10':  576,
    'Holly-2':   64,
    'Victor-5': 332,
    'Yara-11':  630,
    'Betty-11': 638,
    // Index 14 belongs to a completely different speaker
    Ivy: 14,
  };

  before(async () => {
    voicesDir = path.join(os.tmpdir(), `agentvibes-speaker-test-${Date.now()}`);
    await fs.mkdir(voicesDir, { recursive: true });

    // Write mock .onnx.json
    const onnxJson = { speaker_id_map: MOCK_SPEAKER_MAP };
    await fs.writeFile(
      path.join(voicesDir, 'en_US-libritts-high.onnx.json'),
      JSON.stringify(onnxJson),
      'utf8',
    );
  });

  after(async () => {
    await fs.rm(voicesDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  describe('Correct lookup (fix)', () => {
    it('resolves Yara-14 to index 860, not 14', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Yara-14', voicesDir,
      );
      assert.strictEqual(speakerId, '860',
        'Yara-14 must resolve to real index 860, not the display suffix 14');
    });

    it('resolves Mike-10 to index 584, not 10', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Mike-10', voicesDir,
      );
      assert.strictEqual(speakerId, '584');
    });

    it('resolves Faye-3 to index 151, not 3', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Faye-3', voicesDir,
      );
      assert.strictEqual(speakerId, '151');
    });

    it('resolves Jake-10 to index 576, not 10', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Jake-10', voicesDir,
      );
      assert.strictEqual(speakerId, '576');
    });

    it('resolves Holly-2 to index 64, not 2', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Holly-2', voicesDir,
      );
      assert.strictEqual(speakerId, '64');
    });

    it('resolves Victor-5 to index 332, not 5', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Victor-5', voicesDir,
      );
      assert.strictEqual(speakerId, '332');
    });

    it('resolves plain name Evan (no suffix) to index 5', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Evan', voicesDir,
      );
      assert.strictEqual(speakerId, '5',
        'Plain names with no numeric suffix must still be resolved correctly');
    });

    it('resolves plain name Alex (no suffix) to index 16', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Alex', voicesDir,
      );
      assert.strictEqual(speakerId, '16');
    });

    it('returns null speakerId for voices without :: (single-speaker model)', async () => {
      const { voiceName, speakerId } = await resolveVoiceAndSpeaker(
        'en_US-ryan-high', voicesDir,
      );
      assert.strictEqual(voiceName, 'en_US-ryan-high');
      assert.strictEqual(speakerId, null,
        'Single-speaker voices must not produce a speaker ID');
    });

    it('returns null speakerId when speaker name not found in map', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::UnknownSpeaker', voicesDir,
      );
      assert.strictEqual(speakerId, null,
        'Unknown speaker names must return null, not crash');
    });

    it('returns null speakerId when .onnx.json is missing', async () => {
      const { speakerId } = await resolveVoiceAndSpeaker(
        'en_US-missing-model::Yara-14', voicesDir,
      );
      assert.strictEqual(speakerId, null,
        'Missing .onnx.json must degrade gracefully');
    });

    it('extracts correct voiceName from :: format', async () => {
      const { voiceName } = await resolveVoiceAndSpeaker(
        'en_US-libritts-high::Yara-14', voicesDir,
      );
      assert.strictEqual(voiceName, 'en_US-libritts-high');
    });
  });

  // -------------------------------------------------------------------------
  describe('Naive approach (demonstrates the bug)', () => {
    it('naive extraction of Yara-14 returns 14 (WRONG — maps to Ivy)', () => {
      const id = naiveSpeakerIdExtraction('en_US-libritts-high::Yara-14');
      assert.strictEqual(id, '14',
        'Naive regex extracts 14, which is Ivy — completely wrong speaker');
    });

    it('naive extraction returns null for plain names like Evan (silently fails)', () => {
      const id = naiveSpeakerIdExtraction('en_US-libritts-high::Evan');
      assert.strictEqual(id, null,
        'Naive regex fails for plain names — piper would pick a random default');
    });

    it('correct lookup disagrees with naive for all configured agents', async () => {
      const agents = [
        { voice: 'en_US-libritts-high::Yara-14',  correct: '860', naive: '14' },
        { voice: 'en_US-libritts-high::Mike-10',   correct: '584', naive: '10' },
        { voice: 'en_US-libritts-high::Faye-3',    correct: '151', naive: '3'  },
        { voice: 'en_US-libritts-high::Jake-10',   correct: '576', naive: '10' },
        { voice: 'en_US-libritts-high::Holly-2',   correct: '64',  naive: '2'  },
        { voice: 'en_US-libritts-high::Victor-5',  correct: '332', naive: '5'  },
        { voice: 'en_US-libritts-high::Yara-11',   correct: '630', naive: '11' },
        { voice: 'en_US-libritts-high::Betty-11',  correct: '638', naive: '11' },
      ];

      for (const { voice, correct, naive } of agents) {
        const { speakerId } = await resolveVoiceAndSpeaker(voice, voicesDir);
        assert.strictEqual(speakerId, correct,
          `${voice}: correct=${correct} but naive would use=${naive}`);
        assert.notStrictEqual(speakerId, naive,
          `${voice}: speaker ID must NOT match naive suffix ${naive}`);
      }
    });
  });
});

console.log('Running party mode speaker ID resolution tests...\n');
