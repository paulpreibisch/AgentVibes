/**
 * Provider voice catalogs — BACK-COMPAT SHIM.
 *
 * The canonical source of provider voice data is now
 * `src/services/provider-catalog.js` (the Provider Catalog, SSOT Layer 2). This
 * module re-exports the static voice lists (`ELEVENLABS_VOICES`,
 * `KOKORO_VOICE_IDS`) and the gender helper from the catalog, and keeps the
 * `voicesForProvider()` convenience used by BMAD gender-aware auto-assignment.
 *
 * Kept as a shim so existing importers (and test/unit/provider-voice-catalog.test.js)
 * continue to work unmodified.
 *
 * @module services/provider-voice-catalog
 */

import { isSingleVoiceProvider } from './agent-voice-store.js';
import {
  ELEVENLABS_VOICES,
  KOKORO_VOICE_IDS,
  kokoroGender,
} from './provider-catalog.js';

export { ELEVENLABS_VOICES, KOKORO_VOICE_IDS, kokoroGender };

/**
 * Curated built-in voices for the OS-native "discovered" providers (Windows SAPI,
 * macOS `say`). Their real voices live on the target device — for a remote
 * receiver we cannot enumerate them from here — so these standard voices (shipped
 * by default on Windows 10/11 and macOS) give the picker an honest, selectable
 * list. The `id` is the exact name the player passes to SelectVoice / `say -v`;
 * if the receiver lacks one it falls back to the system default (benign).
 *
 * Verified against a real Windows 11 install (System.Speech GetInstalledVoices).
 * The receiver remains authoritative — this is UI convenience, not inventory SSOT.
 */
const WINDOWS_SAPI_VOICES = [
  { id: 'Microsoft David Desktop', name: 'David (Desktop)', gender: 'Male',   lang: 'en-US' },
  { id: 'Microsoft Zira Desktop',  name: 'Zira (Desktop)',  gender: 'Female', lang: 'en-US' },
  { id: 'Microsoft David',         name: 'David',           gender: 'Male',   lang: 'en-US' },
  { id: 'Microsoft Mark',          name: 'Mark',            gender: 'Male',   lang: 'en-US' },
  { id: 'Microsoft Zira',          name: 'Zira',            gender: 'Female', lang: 'en-US' },
];

const MACOS_VOICES = [
  { id: 'Samantha', name: 'Samantha', gender: 'Female', lang: 'en-US' },
  { id: 'Alex',     name: 'Alex',     gender: 'Male',   lang: 'en-US' },
  { id: 'Daniel',   name: 'Daniel',   gender: 'Male',   lang: 'en-GB' },
  { id: 'Karen',    name: 'Karen',    gender: 'Female', lang: 'en-AU' },
  { id: 'Moira',    name: 'Moira',    gender: 'Female', lang: 'en-IE' },
];

export { WINDOWS_SAPI_VOICES, MACOS_VOICES };

/**
 * Return the voice pool for the currently-active provider as `{ id, gender }`
 * entries, suitable for gender-aware auto-assignment.
 *
 * Piper voices are discovered on disk, so the caller injects `scanInstalledVoices`
 * and `getVoiceMeta` (both live in the voices-tab module) to avoid a circular
 * import here.
 *
 * @param {string} provider - active provider id (piper|kokoro|elevenlabs|soprano|…)
 * @param {object} helpers
 * @param {() => string[]} helpers.scanInstalledVoices - lists installed Piper voice ids
 * @param {(id: string) => {gender?: string}} helpers.getVoiceMeta - Piper voice metadata
 * @returns {Array<{id: string, gender: string}>}
 */
export function voicesForProvider(provider, { scanInstalledVoices, getVoiceMeta } = {}) {
  const p = (provider || 'piper').toLowerCase();

  if (p === 'kokoro') {
    return KOKORO_VOICE_IDS.map(id => ({ id, gender: kokoroGender(id) }));
  }

  if (p === 'elevenlabs') {
    return ELEVENLABS_VOICES.map(v => ({ id: v.id, gender: v.gender || '' }));
  }

  // OS-native discovered providers: their voices live on the target device (the
  // receiver in remote mode), so they can't be scanned here. Return the curated
  // built-in list instead of falling through to the Piper disk scan (which would
  // mislabel them as Piper voices).
  if (p === 'sapi' || p === 'windows-sapi') {
    return WINDOWS_SAPI_VOICES.map(v => ({ id: v.id, gender: v.gender || '' }));
  }
  if (p === 'macos' || p === 'macos-say' || p === 'say') {
    return MACOS_VOICES.map(v => ({ id: v.id, gender: v.gender || '' }));
  }

  // Single-voice providers (e.g. soprano): one synthetic entry named after the
  // provider — every agent ends up sharing it, which is correct for these.
  if (isSingleVoiceProvider(p)) {
    return [{ id: p, gender: '' }];
  }

  // Piper (and any disk-discovered provider): read installed models.
  if (typeof scanInstalledVoices === 'function') {
    const metaOf = typeof getVoiceMeta === 'function' ? getVoiceMeta : () => ({});
    return scanInstalledVoices().map(id => ({ id, gender: metaOf(id).gender || '' }));
  }

  return [];
}

export default { ELEVENLABS_VOICES, KOKORO_VOICE_IDS, WINDOWS_SAPI_VOICES, MACOS_VOICES, kokoroGender, voicesForProvider };
