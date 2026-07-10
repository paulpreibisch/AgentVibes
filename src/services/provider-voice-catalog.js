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

export default { ELEVENLABS_VOICES, KOKORO_VOICE_IDS, kokoroGender, voicesForProvider };
