/**
 * Provider Catalog — Layer 2 of the SSOT program (companion to the Utterance
 * Resolver, src/services/utterance-resolver.js). See
 * docs/architecture/provider-catalog-design.md.
 *
 * ONE record per provider answers the inventory question — "WHAT exists to speak
 * with?": voice lists, defaults, membership validation, per-platform runtime,
 * and display names. The resolver answers the orthogonal question ("HOW is this
 * utterance spoken?"). The two layers NEVER import each other — the seam is
 * welded by conformance assertions only (see
 * test/unit/provider-catalog-conformance.test.js). That keeps the resolver's
 * 433-test contract untouched.
 *
 * DISCIPLINE: this module is PURE data + PURE functions. No `fs`, no `env`, no
 * clock — exactly like the resolver. Discovered providers (piper, macos, SAPI)
 * receive their installed-voice list via injection (`{ installed }`); the
 * catalog owns the RULE, never the I/O.
 *
 * SECURITY NOTE: the receiver `ALLOWED_VOICES` allowlists
 * (clawdbot-receiver-SECURE.sh) are a SECURITY control, NOT inventory — they are
 * deliberately narrower than this catalog and must never be unified with it.
 *
 * @module services/provider-catalog
 */

'use strict';

/* ------------------------------------------------------------------ *
 * Static voice data (the canonical copies; provider-voice-catalog.js
 * re-exports these for back-compat).
 * ------------------------------------------------------------------ */

/** ElevenLabs DEFAULT-LIBRARY voices (voice_id + display metadata), available to
 * every API key. Community/library voices that must be added to an account first
 * are intentionally excluded so a switch can't fail at synth time. Mirrored on
 * the shell side by .claude/hooks/elevenlabs-voices.sh (parity-guarded). */
const ELEVENLABS_VOICES = [
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

/** Kokoro voice ids. Gender is encoded in the id: the 2nd char is f|m. */
const KOKORO_VOICE_IDS = [
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
function kokoroGender(id) {
  const c = typeof id === 'string' && id.length > 1 ? id[1].toLowerCase() : '';
  if (c === 'f') return 'Female';
  if (c === 'm') return 'Male';
  return '';
}

/* ------------------------------------------------------------------ *
 * Voice-model validation rules (pure). Each returns { ok, canonical, reason }.
 * ------------------------------------------------------------------ */

/** Piper-family voice shape: `en_US-lessac-medium` or a `model::Speaker` form. */
const PIPER_VOICE_SHAPE = /^[a-z]{2,3}_[A-Z]{2}-/;
/** Raw ElevenLabs voice_id shape (preserves elevenlabs-voices.sh:66 semantics). */
const ELEVENLABS_ID_SHAPE = /^[A-Za-z0-9]{20}$/;

/* ------------------------------------------------------------------ *
 * The seven canonical ProviderRecords.
 *
 * `aliases` are spellings that resolve to THIS record via getProvider()
 * (e.g. windows-sapi ← 'sapi'). `engineId` is the resolver ENGINES value
 * ('sapi' for windows-sapi, 'piper' for windows-piper); the derived
 * engineAliasTable() mirrors the resolver's ENGINE_ALIASES.
 * ------------------------------------------------------------------ */

const RECORDS = [
  {
    id: 'soprano',
    engineId: 'soprano',
    aliases: [],
    displayName: 'Soprano TTS',
    voiceModel: 'single',
    voices: ['soprano-default'],
    defaultVoice: 'soprano-default',
    runtime: { unix: 'play-tts-soprano.sh', windows: 'play-tts-soprano.ps1', darwinOnly: false },
    requires: 'pip',
  },
  {
    id: 'piper',
    engineId: 'piper',
    aliases: [],
    displayName: 'Piper TTS',
    voiceModel: 'discovered',
    voices: null, // discovered on disk (*.onnx glob)
    defaultVoice: 'en_US-lessac-medium', // preferred fallback, NOT a guaranteed install
    runtime: { unix: 'play-tts-piper.sh', windows: null, darwinOnly: false }, // Windows uses windows-piper
    requires: 'pip',
  },
  {
    id: 'kokoro',
    engineId: 'kokoro',
    aliases: [],
    displayName: 'Kokoro TTS',
    voiceModel: 'static',
    voices: KOKORO_VOICE_IDS,
    defaultVoice: 'af_heart',
    runtime: { unix: 'play-tts-kokoro.sh', windows: 'play-tts-kokoro.ps1', darwinOnly: false },
    requires: 'pip',
  },
  {
    id: 'elevenlabs',
    engineId: 'elevenlabs',
    aliases: [],
    displayName: 'ElevenLabs',
    voiceModel: 'name-to-id',
    voices: ELEVENLABS_VOICES,
    defaultVoice: 'Sarah',
    runtime: { unix: 'play-tts-elevenlabs.sh', windows: null, darwinOnly: false }, // ← no ps1 runtime; the contradiction, now data
    requires: 'api-key',
  },
  {
    id: 'macos',
    engineId: 'macos',
    aliases: ['macos-say', 'say'],
    displayName: 'macOS Say',
    voiceModel: 'discovered',
    voices: null, // `say -v ?`
    defaultVoice: 'Samantha',
    runtime: { unix: 'play-tts-macos.sh', windows: null, darwinOnly: true },
    requires: 'builtin',
  },
  {
    id: 'windows-sapi',
    engineId: 'sapi',
    aliases: ['sapi'],
    displayName: 'Windows SAPI',
    voiceModel: 'discovered',
    voices: null, // System.Speech
    defaultVoice: '', // system default
    runtime: { unix: null, windows: 'play-tts-sapi.ps1', darwinOnly: false },
    requires: 'builtin',
  },
  {
    id: 'windows-piper',
    engineId: 'piper',
    aliases: ['piper'], // on Windows, bare 'piper' forwards to windows-piper
    displayName: 'Piper TTS',
    voiceModel: 'discovered',
    voices: null, // same *.onnx models as piper
    defaultVoice: 'en_US-lessac-medium',
    runtime: { unix: null, windows: 'play-tts-windows-piper.ps1', darwinOnly: false },
    requires: 'exe',
  },
];

// Lookup indexes (built once).
const _BY_ID = new Map();
const _BY_ALIAS = new Map();
for (const r of RECORDS) {
  _BY_ID.set(r.id, r);
}
for (const r of RECORDS) {
  for (const a of r.aliases) {
    // Exact-id spellings always win, so never let an alias shadow a real id.
    if (!_BY_ID.has(a) && !_BY_ALIAS.has(a)) _BY_ALIAS.set(a, r);
  }
}

/** Normalize an id-or-alias to a lowercase key. */
function _norm(idOrAlias) {
  return typeof idOrAlias === 'string' ? idOrAlias.trim().toLowerCase() : '';
}

/* ------------------------------------------------------------------ *
 * Public API (design §3.2). All entries are alias-normalizing.
 * ------------------------------------------------------------------ */

/**
 * @param {string} idOrAlias
 * @returns {object|null} the ProviderRecord, or null if unknown.
 */
function getProvider(idOrAlias) {
  const key = _norm(idOrAlias);
  if (!key) return null;
  return _BY_ID.get(key) || _BY_ALIAS.get(key) || null;
}

/** @returns {object[]} all seven records (fresh array; records are shared). */
function listProviders() {
  return RECORDS.slice();
}

/**
 * Is a provider playable on `platform`?
 *   - 'windows' → has a Windows runtime script.
 *   - 'darwin'  → has a Unix runtime script (darwin runs the .sh players).
 *   - 'unix'    → has a Unix runtime AND is not darwin-only (i.e. Linux).
 * @param {string} idOrAlias
 * @param {'unix'|'windows'|'darwin'} platform
 * @returns {boolean}
 */
function isAvailable(idOrAlias, platform) {
  const r = getProvider(idOrAlias);
  if (!r) return false;
  if (platform === 'windows') return r.runtime.windows !== null;
  if (platform === 'darwin') return r.runtime.unix !== null;
  return r.runtime.unix !== null && !r.runtime.darwinOnly; // 'unix' == generic Linux
}

/**
 * @param {'unix'|'windows'|'darwin'} platform
 * @returns {object[]} records available on that platform.
 */
function providersFor(platform) {
  return RECORDS.filter((r) => isAvailable(r.id, platform));
}

/**
 * List a provider's voices as `{ id, name?, gender, lang? }` entries. Discovered
 * providers require an injected `installed` list (else an empty array).
 * @param {string} idOrAlias
 * @param {{installed?: string[]}} [opts]
 * @returns {Array<{id: string, name?: string, gender: string, lang?: string}>}
 */
function listVoices(idOrAlias, { installed } = {}) {
  const r = getProvider(idOrAlias);
  if (!r) return [];
  switch (r.voiceModel) {
    case 'static': // kokoro
      return r.voices.map((id) => ({ id, gender: kokoroGender(id) }));
    case 'name-to-id': // elevenlabs
      return r.voices.map((v) => ({ id: v.id, name: v.name, gender: v.gender || '', lang: v.lang }));
    case 'single': // soprano
      return r.voices.map((id) => ({ id, gender: '' }));
    case 'discovered': // piper / macos / windows-sapi / windows-piper
    default:
      if (Array.isArray(installed)) return installed.map((id) => ({ id, gender: '' }));
      return [];
  }
}

/**
 * @param {string} idOrAlias
 * @returns {string} the provider's default voice ('' for windows-sapi = system default).
 */
function defaultVoice(idOrAlias) {
  const r = getProvider(idOrAlias);
  return r ? r.defaultVoice : '';
}

/**
 * Validate a voice for a provider. STRICT membership at config-write time
 * (typos never reach voice.txt). Returns `{ ok, canonical, reason }` — never a
 * bare boolean — so every rejection carries a message and the accepted spelling
 * is normalized ONCE.
 *
 * @param {string} idOrAlias
 * @param {string} voice
 * @param {{installed?: string[], allowUnlisted?: boolean}} [opts]
 *   `allowUnlisted` expresses the AGENTVIBES_ALLOW_UNLISTED_VOICE escape hatch —
 *   the catalog never reads env; consumers pass the flag (design §3.3). It relaxes
 *   MEMBERSHIP, not shape.
 * @returns {{ok: boolean, canonical: string|null, reason: string}}
 */
function validateVoice(idOrAlias, voice, { installed, allowUnlisted = false } = {}) {
  const r = getProvider(idOrAlias);
  if (!r) return { ok: false, canonical: null, reason: `Unknown provider: ${idOrAlias}` };
  const raw = typeof voice === 'string' ? voice.trim() : '';

  switch (r.voiceModel) {
    case 'static': { // kokoro — case-fold, exact membership
      const folded = raw.toLowerCase();
      if (r.voices.includes(folded)) return { ok: true, canonical: folded, reason: '' };
      if (allowUnlisted && folded) return { ok: true, canonical: folded, reason: '' };
      return { ok: false, canonical: null, reason: `"${voice}" is not a known ${r.displayName} voice` };
    }
    case 'name-to-id': { // elevenlabs — case-insensitive name → id, OR raw 20-char id
      const lc = raw.toLowerCase();
      const byName = r.voices.find((v) => v.name.toLowerCase() === lc);
      if (byName) return { ok: true, canonical: byName.id, reason: '' };
      if (ELEVENLABS_ID_SHAPE.test(raw)) return { ok: true, canonical: raw, reason: '' };
      return { ok: false, canonical: null, reason: `"${voice}" is not a known ElevenLabs voice name or id` };
    }
    case 'single': { // soprano — '', 'soprano', 'soprano-default' → canonical 'soprano-default'
      const lc = raw.toLowerCase();
      if (lc === '' || lc === r.id || lc === r.defaultVoice) {
        return { ok: true, canonical: r.defaultVoice, reason: '' };
      }
      return { ok: false, canonical: null, reason: `${r.displayName} has a single voice (${r.defaultVoice})` };
    }
    case 'discovered': // piper / macos / windows-sapi / windows-piper
    default: {
      const isPiperFamily = r.engineId === 'piper';
      if (Array.isArray(installed)) {
        if (installed.includes(raw)) return { ok: true, canonical: raw, reason: '' };
        if (!allowUnlisted) {
          return { ok: false, canonical: null, reason: `"${voice}" is not an installed ${r.displayName} voice` };
        }
        // allowUnlisted: fall through to shape/permissive check
      }
      if (isPiperFamily) {
        if (PIPER_VOICE_SHAPE.test(raw) || raw.includes('::')) return { ok: true, canonical: raw, reason: '' };
        return { ok: false, canonical: null, reason: `"${voice}" is not a valid Piper voice id` };
      }
      // macos / windows-sapi: permissive when no list is available; '' = system default.
      if (raw === '' && r.defaultVoice === '') return { ok: true, canonical: '', reason: '' };
      if (raw) return { ok: true, canonical: raw, reason: '' };
      return { ok: false, canonical: null, reason: `Empty voice for ${r.displayName}` };
    }
  }
}

/**
 * @param {string} idOrAlias
 * @returns {string} a human display name, or the input unchanged if unknown
 *   (mirrors provider-validator.getProviderDisplayName's passthrough).
 */
function displayName(idOrAlias) {
  const r = getProvider(idOrAlias);
  if (r) return r.displayName;
  return typeof idOrAlias === 'string' ? idOrAlias : '';
}

/**
 * Derived alias→engine table, built to MIRROR the resolver's ENGINE_ALIASES
 * (utterance-resolver.js:52-57). A record whose id differs from its engineId
 * contributes id→engineId; each non-identity alias contributes alias→engineId.
 * Conformance group 6 asserts this deep-equals the resolver's table.
 * @returns {Record<string,string>}
 */
function engineAliasTable() {
  const table = {};
  for (const r of RECORDS) {
    if (r.id !== r.engineId) table[r.id] = r.engineId;
    for (const a of r.aliases) {
      if (a !== r.engineId) table[a] = r.engineId;
    }
  }
  return table;
}

export {
  getProvider,
  listProviders,
  providersFor,
  isAvailable,
  listVoices,
  defaultVoice,
  validateVoice,
  displayName,
  engineAliasTable,
  kokoroGender,
  ELEVENLABS_VOICES,
  KOKORO_VOICE_IDS,
};

export default {
  getProvider,
  listProviders,
  providersFor,
  isAvailable,
  listVoices,
  defaultVoice,
  validateVoice,
  displayName,
  engineAliasTable,
  kokoroGender,
  ELEVENLABS_VOICES,
  KOKORO_VOICE_IDS,
};
