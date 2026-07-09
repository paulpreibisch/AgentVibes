/**
 * Provider voice catalogs — single source of truth for the static voice lists
 * of the cloud/neural providers, plus a helper that returns the voice pool for
 * whichever provider is currently active.
 *
 * Piper voices are NOT listed here (they are discovered on disk via
 * scanInstalledVoices); this module covers the providers whose voices are a
 * fixed catalog: ElevenLabs and Kokoro. Single-voice providers (e.g. soprano)
 * resolve to a single synthetic entry.
 *
 * @module services/provider-voice-catalog
 */

import { isSingleVoiceProvider } from './agent-voice-store.js';

/** ElevenLabs library voices (voice_id + display metadata). */
export const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah',   gender: 'Female', lang: 'en-US', desc: 'Mature, reassuring'      },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger',   gender: 'Male',   lang: 'en-US', desc: 'Laid-back, casual'       },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura',   gender: 'Female', lang: 'en-US', desc: 'Enthusiast, quirky'      },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Male',   lang: 'en-AU', desc: 'Deep, confident'         },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George',  gender: 'Male',   lang: 'en-GB', desc: 'Warm storyteller'        },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum',  gender: 'Male',   lang: 'en-US', desc: 'Husky trickster'         },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River',   gender: '',       lang: 'en-US', desc: 'Relaxed, neutral'        },
  { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry',   gender: 'Male',   lang: 'en-US', desc: 'Fierce warrior'          },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam',    gender: 'Male',   lang: 'en-US', desc: 'Energetic creator'       },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice',   gender: 'Female', lang: 'en-GB', desc: 'Clear educator'          },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female', lang: 'en-US', desc: 'Knowledgable, pro'       },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will',    gender: 'Male',   lang: 'en-US', desc: 'Relaxed optimist'        },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female', lang: 'en-US', desc: 'Playful, bright'         },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric',    gender: 'Male',   lang: 'en-US', desc: 'Smooth, trustworthy'     },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella',   gender: 'Female', lang: 'en-US', desc: 'Professional, warm'      },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris',   gender: 'Male',   lang: 'en-US', desc: 'Charming, down-to-earth' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian',   gender: 'Male',   lang: 'en-US', desc: 'Deep, comforting'        },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel',  gender: 'Male',   lang: 'en-GB', desc: 'Steady broadcaster'      },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily',    gender: 'Female', lang: 'en-GB', desc: 'Velvety actress'         },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',    gender: 'Male',   lang: 'en-US', desc: 'Dominant, firm'          },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill',    gender: 'Male',   lang: 'en-US', desc: 'Wise, mature'            },
];
// NOTE: these 21 are the ElevenLabs DEFAULT-LIBRARY voices, available to every
// API key. Community/library voices that must be added to an account first are
// intentionally excluded so a switch can't fail at synth time. This list is
// mirrored on the shell side by .claude/hooks/elevenlabs-voices.sh; the two are
// kept in lockstep by test/unit/elevenlabs-catalog-parity.test.js.

/** Kokoro voice ids. Gender is encoded in the id: the 2nd char is f|m. */
export const KOKORO_VOICE_IDS = [
  // American English
  'af_heart','af_alloy','af_aoede','af_bella','af_jessica','af_kore','af_nicole','af_nova','af_river','af_sarah','af_sky',
  'am_adam','am_echo','am_eric','am_fenrir','am_liam','am_michael','am_onyx','am_puck',
  // British English
  'bf_alice','bf_emma','bf_isabella','bf_lily',
  'bm_daniel','bm_fable','bm_george','bm_lewis',
  // Japanese
  'jf_alpha','jf_gongitsune','jf_nezumi','jf_tebukuro','jm_kumo',
  // Mandarin Chinese
  'zf_xiaobei','zf_xiaoni','zf_xiaoxiao','zf_xiaoyi','zm_yunxi','zm_yunxia','zm_yunyang',
  // Spanish
  'ef_dora','em_alex','em_santa',
  // French
  'ff_siwis',
  // Hindi
  'hf_alpha','hm_omega',
  // Italian
  'if_sara','im_nicola',
  // Brazilian Portuguese
  'pf_dora','pm_alex','pm_santa',
  // Korean
  'kf_alpha','km_hyunsu',
];

/**
 * Infer a Kokoro voice's gender from its id. Kokoro ids follow `<lang><sex>_name`
 * where the 2nd character is `f` (female) or `m` (male).
 * @param {string} id
 * @returns {'Female'|'Male'|''}
 */
export function kokoroGender(id) {
  const c = typeof id === 'string' && id.length > 1 ? id[1].toLowerCase() : '';
  if (c === 'f') return 'Female';
  if (c === 'm') return 'Male';
  return '';
}

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
