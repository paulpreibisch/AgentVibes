#!/usr/bin/env node
/**
 * Voice List Display - Beautiful multi-column voice listing
 * Called by voice-manager.sh to display voices with boxen formatting
 */

import { formatVoicesList } from '../utils/list-formatter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import os from 'os';
import {
  KOKORO_VOICE_IDS,
  kokoroGender,
  ELEVENLABS_VOICES,
} from '../services/provider-voice-catalog.js';
import {
  listVoices as catalogListVoices,
  getProvider,
} from '../services/provider-catalog.js';

/**
 * Get Piper voices from voice directory
 */
function getPiperVoices(voiceDir, currentVoice) {
  const voices = [];

  if (!fs.existsSync(voiceDir)) {
    return voices;
  }

  const files = fs.readdirSync(voiceDir);
  for (const file of files) {
    if (file.endsWith('.onnx')) {
      const voiceName = path.basename(file, '.onnx');
      voices.push({
        name: voiceName,
        lang: extractLanguage(voiceName),
        current: voiceName === currentVoice
      });
    }
  }

  return voices.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get macOS voices using say -v ?
 */
function getMacOSVoices(currentVoice) {
  const voices = [];

  if (os.platform() !== 'darwin') {
    return voices;
  }

  try {
    const output = execFileSync('say', ['-v', '?'], { encoding: 'utf8' }); // NOSONAR - Safe: checking macOS say voices from system PATH
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const voiceName = parts[0];
        const lang = parts[1];

        voices.push({
          name: voiceName,
          lang,
          current: voiceName === currentVoice
        });
      }
    }
  } catch (error) {
    // say command failed
  }

  return voices;
}

/**
 * Kokoro voice ids follow `<lang><sex>_name`. The first char is the language.
 * Map it to a human-readable language label for the listing.
 */
const KOKORO_LANG_LABELS = {
  a: 'en-US', b: 'en-GB', j: 'ja', z: 'zh', e: 'es',
  f: 'fr', h: 'hi', i: 'it', p: 'pt-BR', k: 'ko',
};

/**
 * Get Kokoro voices from the canonical catalog (KOKORO_VOICE_IDS).
 * Kokoro's voice set is a fixed catalog, not discovered on disk.
 */
function getKokoroVoices(currentVoice) {
  return KOKORO_VOICE_IDS.map((id) => ({
    name: id,
    lang: KOKORO_LANG_LABELS[id[0]] || '',
    gender: kokoroGender(id),
    current: id === currentVoice,
  }));
}

/**
 * Get ElevenLabs voices from the canonical catalog (ELEVENLABS_VOICES).
 * The listing shows the friendly name; matching against currentVoice accepts
 * either the friendly name or the raw voice_id.
 */
function getElevenLabsVoices(currentVoice) {
  return ELEVENLABS_VOICES.map((v) => ({
    name: v.name,
    lang: v.lang || '',
    gender: v.gender || '',
    current: v.name === currentVoice || v.id === currentVoice,
  }));
}

/**
 * Get Soprano voices from the canonical catalog. Soprano is voiceModel `single`
 * (design §3.1): exactly one canonical voice, soprano-default — no picker.
 */
function getSopranoVoices(currentVoice) {
  return catalogListVoices('soprano').map((v) => ({
    name: v.id,
    lang: '',
    gender: v.gender || '',
    current: v.id === currentVoice || currentVoice === '' || currentVoice === 'soprano',
  }));
}

/**
 * Extract language code from voice name
 */
function extractLanguage(voiceName) {
  const match = voiceName.match(/^([a-z]{2}_[A-Z]{2})/);
  return match ? match[1] : '';
}

/**
 * Discovered providers list-voices enumerates HERE, each via its own platform
 * discovery path (piper: `*.onnx` disk glob; macos: `say -v ?`). Other discovered
 * providers (windows-piper / windows-sapi) are enumerated by the Windows lister,
 * not this Unix/darwin CLI, so they fall to the honest "no voice list" label —
 * preserving pre-AVI-S9.5 output. Adding a record with a static/name-to-id/single
 * voiceModel adds a list arm for free (no edit here needed).
 */
const LISTABLE_DISCOVERED = new Set(['piper', 'macos']);

/**
 * Resolve a provider token to its voice list + display label by iterating the
 * Provider Catalog (src/services/provider-catalog.js) and branching ONLY on the
 * record's `voiceModel` — replacing the former four hardcoded per-provider
 * equality branches (AVI-S9.5 / design row 19). Unknown tokens keep the honest
 * "no voice list available" label from AVI-S8.1.
 *
 * @param {string} provider
 * @param {string} currentVoice
 * @param {string} voiceDir
 * @returns {{ voices: object[], providerName: string }}
 */
function selectVoices(provider, currentVoice, voiceDir) {
  const record = getProvider(provider);
  if (!record) {
    return { voices: [], providerName: `${provider} (no voice list available)` };
  }

  // Label preserves the pre-existing strings exactly (macOS uses "TTS", not the
  // catalog display name "macOS Say"); all others equal record.displayName.
  const providerName = record.id === 'macos' ? 'macOS TTS' : record.displayName;

  switch (record.voiceModel) {
    case 'static': // kokoro
      return { voices: getKokoroVoices(currentVoice), providerName };
    case 'name-to-id': // elevenlabs
      return { voices: getElevenLabsVoices(currentVoice), providerName };
    case 'single': // soprano
      return { voices: getSopranoVoices(currentVoice), providerName };
    case 'discovered':
    default:
      if (record.id === 'piper') return { voices: getPiperVoices(voiceDir, currentVoice), providerName };
      if (record.id === 'macos') return { voices: getMacOSVoices(currentVoice), providerName };
      // A discovered provider without a discovery path on this platform: label
      // it honestly instead of rendering an empty list under a wrong provider.
      return { voices: [], providerName: `${provider} (no voice list available)` };
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const provider = args[0] || 'piper';
  const currentVoice = args[1] || '';
  const voiceDir = args[2] || '';

  const { voices, providerName } = selectVoices(provider, currentVoice, voiceDir);

  // Display with boxen
  const output = formatVoicesList(voices, {
    provider: providerName,
    columns: 2,
    showUsage: true
  });

  console.log(output);
}

// Only run when invoked as a CLI (keeps selectVoices importable by tests).
const _invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (_invokedDirectly) main();

export { selectVoices, LISTABLE_DISCOVERED };
