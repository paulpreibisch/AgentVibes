/**
 * AgentVibes TUI Console — Voices Tab
 * Epic 8: Stories 8.1-8.4
 *
 * Implements the Tab Component Contract:
 *   createVoicesTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: installed voice list, search/filter, favorites (★), voice info panel, install stub.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildAudioEnv, detectWavPlayer, getAllWavPlayers } from '../audio-env.js';
import { SURNAME_POOL, uniquifyVoiceName } from '../../utils/voice-names.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#00897b',  // Teal — section headers for Voices tab
  labelFg:    '#e3f2fd',
  valueFg:    '#f06292',  // Light magenta — brand color
  activeFg:   'bright-cyan',  // Cyan — active voice
  favoriteFg: '#ffff00',  // Yellow — favorite star
  btnDefault: '#00695c',  // Teal — Voices tab buttons
  btnFocus:   '#2e7d32',  // Green — focused/selected
  btnFocusFg: '#ffffff',
  btnPress:   '#ff00ff',
  borderFg:   '#00897b',
  footerBg:   '#00695c',  // Teal — Voices tab footer
  noticeFg:   '#90a4ae',
  dimFg:      '#455a64',
};

const FOOTER_TEXT = '[↑↓/jk] Navigate  [Space] Preview  [Enter] Select/Install  [*] Favorite  [/] Search';
/**
 * Resolve the Piper voice storage directory using the same precedence as the
 * shell-side get_voice_storage_dir() in piper-voice-manager.sh:
 *   1. PIPER_VOICES_DIR env var
 *   2. Project-local .claude/piper-voices-dir.txt (walk up from cwd)
 *   3. Global ~/.claude/piper-voices-dir.txt
 *   4. Default ~/.claude/piper-voices
 */
function resolvePiperVoicesDir() {
  const defaultDir = path.join(os.homedir(), '.claude', 'piper-voices');
  if (process.env.PIPER_VOICES_DIR) {
    const resolved = path.resolve(process.env.PIPER_VOICES_DIR);
    if (resolved.includes('..')) return defaultDir;
    return resolved;
  }

  // Search up directory tree for .claude/piper-voices-dir.txt
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    const cfg = path.join(dir, '.claude', 'piper-voices-dir.txt');
    try {
      if (fs.existsSync(cfg)) return fs.readFileSync(cfg, 'utf8').trim();
    } catch { /* skip */ }
    dir = path.dirname(dir);
  }

  // Global config
  const globalCfg = path.join(os.homedir(), '.claude', 'piper-voices-dir.txt');
  try {
    if (fs.existsSync(globalCfg)) return fs.readFileSync(globalCfg, 'utf8').trim();
  } catch { /* skip */ }

  // Default fallback
  return defaultDir;
}

export const PIPER_VOICES_DIR = resolvePiperVoicesDir();

// ---------------------------------------------------------------------------
// Voice catalog — loaded from voice-assignments.json (914 voices)

let _catalogEntries = [];   // { voiceId, displayName, gender, model, type, speakerId }
let _catalogMap = new Map(); // voiceId → catalog entry (rebuilt when catalog loads)
let _catalogLoaded = false;

/**
 * Load the full voice catalog from voice-assignments.json.
 * Called once on first tab show. Safe to call multiple times.
 */
function loadCatalog() {
  if (_catalogLoaded) return;
  _catalogLoaded = true;
  try {
    const catalogPath = path.resolve(__dirname, '..', '..', '..', 'voice-assignments.json');
    if (!fs.existsSync(catalogPath)) return;
    const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    // LibriTTS multi-speaker entries (904 speakers from en_US-libritts-high model)
    const libritts = data.libritts_speakers ?? {};
    for (const [id, entry] of Object.entries(libritts)) {
      _catalogEntries.push({
        // voiceId stays raw so existing user configs continue to resolve
        voiceId: `en_US-libritts-high${MS_SEP}${entry.voice_name}`,
        // displayName gets a deterministic surname so every speaker is unique
        displayName: uniquifyVoiceName(entry.voice_name),
        gender: (entry.gender ?? '').charAt(0).toUpperCase() + (entry.gender ?? '').slice(1),
        model: 'en_US-libritts-high',
        type: 'libritts',
        speakerId: parseInt(id, 10),
      });
    }

    // Curated standalone voices (10 individual models)
    const curated = data.curated_voices ?? {};
    for (const [, entry] of Object.entries(curated)) {
      _catalogEntries.push({
        voiceId: entry.model_file,
        displayName: entry.voice_name,
        gender: (entry.gender ?? '').charAt(0).toUpperCase() + (entry.gender ?? '').slice(1),
        model: entry.model_file,
        type: 'curated',
        speakerId: null,
      });
    }
  } catch { /* non-fatal — catalog just won't show */ }
  // Build lookup map for O(1) access by voiceId
  _catalogMap = new Map();
  for (const c of _catalogEntries) _catalogMap.set(c.voiceId, c);

  // Patch libritts_r onnx.json files so their speaker IDs become friendly names.
  // Must run after catalog loads so the name mapping is available.
  patchLibriTTSSpeakerNames();
}

/**
 * Patch the speaker_id_map in a LibriTTS .onnx.json to use friendly names
 * instead of raw corpus IDs (p3922 → Anna, p8699 → Bella, etc.).
 * Reads the catalog's index→friendly-name mapping and rebuilds the map.
 * Safe to call multiple times — skips if already patched.
 */
function patchLibriTTSSpeakerNames() {
  // Load catalog once for all models
  const catalogPath = path.resolve(__dirname, '..', '..', '..', 'voice-assignments.json');
  if (!fs.existsSync(catalogPath)) return;
  let speakers;
  try {
    speakers = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).libritts_speakers ?? {};
  } catch { return; }

  // Models to patch and how to detect unpatched keys:
  //   libritts-high  → raw keys are p-prefixed corpus IDs (p3922, p8699, …)
  //   libritts_r-*   → raw keys are plain numeric corpus IDs (3922, 8699, …)
  const MODELS = [
    { file: 'en_US-libritts-high.onnx.json',   notPatched: (k) => /^p\d+$/.test(k) },
    { file: 'en_US-libritts_r-medium.onnx.json', notPatched: (k) => /^\d+$/.test(k) },
    { file: 'en_US-libritts_r-high.onnx.json',   notPatched: (k) => /^\d+$/.test(k) },
  ];

  for (const { file, notPatched } of MODELS) {
    try {
      const jsonPath = path.join(PIPER_VOICES_DIR, file);
      if (!fs.existsSync(jsonPath)) continue;
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (!data.speaker_id_map || data.num_speakers <= 1) continue;

      const names = Object.keys(data.speaker_id_map);
      // Skip if already patched (first key is a friendly name, not a raw corpus ID)
      if (names.length === 0 || !notPatched(names[0])) continue;

      // Values are 0-based sequential indices into the model — use as catalog key
      const newMap = {};
      for (const [rawKey, idx] of Object.entries(data.speaker_id_map)) {
        const friendly = speakers[String(idx)]?.voice_name;
        newMap[friendly ?? rawKey] = idx;
      }

      data.speaker_id_map = newMap;
      // Verify file ownership before writing (security: CLAUDE.md)
      const stat = fs.statSync(jsonPath);
      if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) continue;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    } catch { /* non-fatal — skip this model */ }
  }
}

// Column widths for the multi-column voice list
export const COL_NAME_W   = 26;
export const COL_GENDER_W = 4;

// SURNAME_POOL and uniquifyVoiceName are imported from ../../utils/voice-names.js

/**
 * Map a gender string to a single-character icon for compact display.
 *   "Female" → "♀"
 *   "Male"   → "♂"
 *   anything else → "—"
 *
 * @param {string} gender
 * @returns {string}
 */
export function genderIcon(gender) {
  if (gender === 'Female') return '♀';
  if (gender === 'Male')   return '♂';
  return '—';
}

/**
 * Same as genderIcon but wrapped in blessed color tags:
 *   Female → pink (magenta)
 *   Male   → light blue (bright-cyan)
 *   other  → no color
 * The returned string is 1 visible char wide but contains color tags;
 * callers should add padding spaces separately rather than using padEnd().
 *
 * @param {string} gender
 * @returns {string}
 */
export function genderIconTag(gender) {
  if (gender === 'Female') return '{magenta-fg}♀{/magenta-fg}';
  if (gender === 'Male')   return '{bright-cyan-fg}♂{/bright-cyan-fg}';
  return '—';
}

// ---------------------------------------------------------------------------
// Pure helpers — exported for testability

// Well-known piper dataset → gender
const GENDER_MAP = {
  // Single-speaker datasets
  amy: 'Female', kristin: 'Female', jenny: 'Female', cori: 'Female',
  aria: 'Female', glados: 'Female', litvyak: 'Female', hfc_female: 'Female',
  ljspeech: 'Female',
  alan: 'Male', joe: 'Male', john: 'Male', ryan: 'Male', lessac: 'Male',
  kusal: 'Male', hfc_male: 'Male', danny: 'Male', arctic: 'Male',
  l2arctic: 'Male',
  // 16Speakers multi-speaker model (names from speaker_id_map)
  cori_samuel: 'Female', kara_shallenberg: 'Female', kristin_hughes: 'Female',
  maria_kasper: 'Female', rose_ibex: 'Female', owlivia: 'Female',
  jennifer_dorr: 'Female', emily_cripps: 'Female',
  mike_pelton: 'Male', mark_nelson: 'Male', michael_scherer: 'Male',
  james_k_white: 'Male', progressingamerica: 'Male', steve_c: 'Male',
  paul_hampton: 'Male', martin_clifton: 'Male',
  // LibriTTS / common first names used as multi-speaker speaker IDs
  anna: 'Female', bella: 'Female', chloe: 'Female', donna: 'Female',
  ella: 'Female', faith: 'Female', gina: 'Female', holly: 'Female',
  ivy: 'Female', jane: 'Female', kelly: 'Female', laura: 'Female',
  mary: 'Female', nina: 'Female', olivia: 'Female', penny: 'Female',
  rachel: 'Female', sarah: 'Female', tara: 'Female', uma: 'Female',
  vera: 'Female', wendy: 'Female', yara: 'Female', zoe: 'Female',
  betty: 'Female', cindy: 'Female', debra: 'Female', erica: 'Female',
  faye: 'Female', gloria: 'Female', quinn: 'Female',
  alex: 'Male', ben: 'Male', carl: 'Male', dan: 'Male', evan: 'Male',
  frank: 'Male', greg: 'Male', hank: 'Male', ivan: 'Male', jake: 'Male',
  kevin: 'Male', leo: 'Male', mike: 'Male', nathan: 'Male', oscar: 'Male',
  paul: 'Male', rick: 'Male', sam: 'Male', tom: 'Male', victor: 'Male',
  will: 'Male', xavier: 'Male', zach: 'Male', adam: 'Male', brad: 'Male',
  colin: 'Male', derek: 'Male', ethan: 'Male', felix: 'Male',
};

// Well-known piper dataset → nice display name
const DISPLAY_NAMES = {
  ljspeech:    'LJ Speech',
  libritts:    'LibriTTS',
  libritts_r:  'LibriTTS',
  l2arctic:    'L2-Arctic',
  hfc_male:    'HFC Male',
  hfc_female:  'HFC Female',
};

/**
 * Infer voice gender from voice ID and/or dataset name.
 * Returns 'Female', 'Male', or '—'.
 *
 * @param {string} voiceId  e.g. 'en_GB-southern_english_female-low'
 * @param {string} [dataset] e.g. 'southern_english_female'
 * @returns {string}
 */
export function inferGender(voiceId, dataset) {
  const id = voiceId.toLowerCase();
  const ds = (dataset ?? '').toLowerCase();
  // Explicit in name
  if (id.includes('_female') || ds.includes('female')) return 'Female';
  if (id.includes('_male')   || ds.includes('male'))   return 'Male';
  // Dataset lookup first
  if (ds && GENDER_MAP[ds]) return GENDER_MAP[ds];
  // For multi-speaker speaker names like "Anna-9", strip trailing "-N" suffix
  // then look up the base name (e.g. "anna")
  const baseName = id.replace(/-\d+$/, '');
  if (GENDER_MAP[baseName]) return GENDER_MAP[baseName];
  // Fall back to middle segment of voice ID (e.g. "ryan" from "en_US-ryan-high")
  const segment = id.split('-')[1] ?? '';
  return GENDER_MAP[segment] ?? GENDER_MAP[id] ?? '—';
}

/**
 * Format a piper dataset name into a human-readable voice display name.
 *
 * @param {string} voiceId
 * @param {string} [dataset] from the .onnx.json file
 * @returns {string}
 */
export function formatVoiceName(voiceId, dataset) {
  // Skip generic dataset values that aren't useful as display names
  const GENERIC_DATASETS = new Set(['training', 'dataset', 'default', 'unknown', '']);
  const usableDataset = dataset && !GENERIC_DATASETS.has(dataset.toLowerCase()) ? dataset : null;
  const raw = usableDataset ?? voiceId.split('-')[1] ?? voiceId;
  if (DISPLAY_NAMES[raw]) return DISPLAY_NAMES[raw];
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export const SAMPLE_PHRASES = [
  "Hello! I'm ready to assist you with your tasks today.",
  "Code review complete. I found several areas that could be improved.",
  "Welcome to AgentVibes. I'll help you get things done efficiently.",
  "Task finished successfully. What shall we work on next?",
  "I've analyzed the code and have some suggestions for you.",
];

// ---------------------------------------------------------------------------
// Exported pure helpers (testable without blessed)

/**
 * Parse a piper voice ID into its components.
 * e.g. 'en_US-amy-medium' → { lang: 'en_US', name: 'amy', quality: 'medium' }
 *
 * @param {string} voiceId
 * @returns {{ lang: string, name: string, quality: string }}
 */
export function parseVoiceId(voiceId) {
  if (!voiceId) return { lang: 'unknown', name: 'unknown', quality: 'unknown' };
  // Expected format: <lang>-<name>-<quality>  e.g. en_US-amy-medium
  const match = voiceId.match(/^([a-z]{2}_[A-Z]{2})-(.+)-(low|medium|high)$/);
  if (!match) return { lang: 'unknown', name: voiceId, quality: 'unknown' };
  return { lang: match[1], name: match[2], quality: match[3] };
}

/**
 * Format a one-line voice info summary.
 *
 * @param {string} voiceId
 * @returns {string}
 */
export function formatVoiceInfo(voiceId) {
  const { lang, name, quality } = parseVoiceId(voiceId);
  if (lang === 'unknown') return `Voice: ${voiceId} | Provider: Piper`;
  return `Voice: ${name} | Language: ${lang} | Quality: ${quality} | Provider: Piper`;
}

// ---------------------------------------------------------------------------
// Test stub

function createTestStub() {
  return {
    box: {},
    show: () => {},
    hide: () => {},
    onFocus: () => {},
    onBlur: () => {},
    getFooterText: () => FOOTER_TEXT,
    getFooterColor: () => COLORS.footerBg,
  };
}

// ---------------------------------------------------------------------------

// Multi-speaker voice separator: "modelName::speakerName"
export const MS_SEP = '::';

/**
 * Parse a voice entry that may be a multi-speaker ID.
 * @param {string} voiceId - e.g. "16Speakers::Cori_Samuel" or "en_US-lessac-medium"
 * @returns {{ model: string, speakerId: number|null, speakerName: string|null, isMultiSpeaker: boolean }}
 */
export function parseMultiSpeaker(voiceId) {
  if (!voiceId) return { model: voiceId ?? '', speakerId: null, speakerName: null, isMultiSpeaker: false };
  if (voiceId.includes(MS_SEP)) {
    const [model, speakerName] = voiceId.split(MS_SEP, 2);
    const jsonPath = path.join(PIPER_VOICES_DIR, model + '.onnx.json');
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      let speakerId = data.speaker_id_map?.[speakerName] ?? null;
      // Fallback: if the .onnx.json still has raw corpus IDs (not yet patched),
      // look up the numeric speaker ID from voice-assignments.json catalog.
      if (speakerId == null && (model === 'en_US-libritts-high' || /^en_US-libritts_r-/.test(model))) {
        try {
          const catalogPath = path.resolve(__dirname, '..', '..', '..', 'voice-assignments.json');
          const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
          const speakers = catalog.libritts_speakers ?? {};
          const entry = Object.entries(speakers).find(([, e]) => e.voice_name === speakerName);
          if (entry) speakerId = parseInt(entry[0], 10);
        } catch { /* non-fatal */ }
      }
      return { model, speakerId, speakerName, isMultiSpeaker: true };
    } catch {
      return { model, speakerId: null, speakerName, isMultiSpeaker: true };
    }
  }
  return { model: voiceId, speakerId: null, speakerName: null, isMultiSpeaker: false };
}

/**
 * Scan PIPER_VOICES_DIR for installed voice IDs.
 * Expands multi-speaker models into individual speaker entries.
 *
 * @returns {string[]}
 */
export function scanInstalledVoices() {
  // Ensure catalog is loaded and libritts_r onnx.json files are patched
  // before we read their speaker_id_map keys (otherwise we get raw corpus IDs).
  loadCatalog();
  try {
    const files = fs.readdirSync(PIPER_VOICES_DIR);
    const onnxFiles = files
      .filter(f => f.endsWith('.onnx') && !f.endsWith('.onnx.json') && !f.startsWith('-'));

    const result = [];
    for (const f of onnxFiles) {
      const voiceId = f.replace(/\.onnx$/, '');
      const jsonPath = path.join(PIPER_VOICES_DIR, voiceId + '.onnx.json');
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data.num_speakers > 1 && data.speaker_id_map) {
          // Expand multi-speaker model into individual entries
          for (const speakerName of Object.keys(data.speaker_id_map)) {
            result.push(`${voiceId}${MS_SEP}${speakerName}`);
          }
          continue;
        }
      } catch { /* fall through to add as single voice */ }
      result.push(voiceId);
    }
    return result.sort();
  } catch {
    return [];
  }
}

/**
 * Get favorites (thumbs-up) array from config.
 * @param {object} configService
 * @returns {string[]}
 */
export function getFavorites(configService) {
  const cfg = configService.getConfig();
  // Prefer thumbsUp if present, fall back to legacy favorites
  const favs = cfg.thumbsUp ?? cfg.favorites;
  return Array.isArray(favs) ? favs : [];
}

/**
 * Get thumbs-down array from config.
 * @param {object} configService
 * @returns {string[]}
 */
export function getThumbsDown(configService) {
  const td = configService.getConfig().thumbsDown;
  return Array.isArray(td) ? td : [];
}

/**
 * Toggle thumbs-up on a voice. Clears thumbs-down if set.
 * @param {object} configService
 * @param {string} voiceId
 * @returns {'added'|'removed'}
 */
export function toggleThumbsUp(configService, voiceId) {
  const favs = getFavorites(configService);
  const idx = favs.indexOf(voiceId);
  let result;
  if (idx >= 0) {
    favs.splice(idx, 1);
    result = 'removed';
  } else {
    favs.push(voiceId);
    // Remove from thumbs-down
    const td = getThumbsDown(configService);
    const tdIdx = td.indexOf(voiceId);
    if (tdIdx >= 0) { td.splice(tdIdx, 1); configService.set('thumbsDown', td); }
    result = 'added';
  }
  configService.set('thumbsUp', favs);
  configService.set('favorites', favs); // backward compat
  return result;
}

/**
 * Toggle thumbs-down on a voice. Clears thumbs-up if set.
 * @param {object} configService
 * @param {string} voiceId
 * @returns {'added'|'removed'}
 */
export function toggleThumbsDown(configService, voiceId) {
  const td = getThumbsDown(configService);
  const idx = td.indexOf(voiceId);
  let result;
  if (idx >= 0) {
    td.splice(idx, 1);
    result = 'removed';
  } else {
    td.push(voiceId);
    // Remove from thumbs-up / favorites
    const favs = getFavorites(configService);
    const fIdx = favs.indexOf(voiceId);
    if (fIdx >= 0) { favs.splice(fIdx, 1); configService.set('thumbsUp', favs); configService.set('favorites', favs); }
    result = 'added';
  }
  configService.set('thumbsDown', td);
  return result;
}

/**
 * Toggle a voice in the favorites list (legacy compat — calls toggleThumbsUp).
 * @param {object} configService
 * @param {string} voiceId
 */
export function toggleFavorite(configService, voiceId) {
  toggleThumbsUp(configService, voiceId);
}

// ---------------------------------------------------------------------------
// Voice metadata cache (lives for the process lifetime)

const _metaCache = new Map();

/**
 * Load metadata from the .onnx.json file for a voice.
 * Caches results so the file is only read once per voice.
 *
 * @param {string} voiceId
 * @returns {{ displayName: string, gender: string, provider: string }}
 */
export function getVoiceMeta(voiceId) {
  if (_metaCache.has(voiceId)) return _metaCache.get(voiceId);

  // Lazy-load the catalog so callers from any tab get uniquified names
  loadCatalog();

  const ms = parseMultiSpeaker(voiceId);
  if (ms.isMultiSpeaker) {
    if (!ms.speakerName) {
      const result = { displayName: voiceId, gender: '—', provider: `Piper (${ms.model})` };
      _metaCache.set(voiceId, result);
      return result;
    }
    // Prefer the catalog entry (which has the uniquified name + gender)
    const cat = _catalogMap.get(voiceId);
    if (cat) {
      const result = {
        displayName: cat.displayName,
        gender: cat.gender || inferGender(ms.speakerName, null),
        provider: `Piper (${ms.model})`,
      };
      _metaCache.set(voiceId, result);
      return result;
    }
    // libritts_r variants share speaker names with libritts-high after patching
    if (/^en_US-libritts_r-/.test(ms.model)) {
      // After patching: speakerName is a friendly name — look up in libritts-high catalog
      const highCat = _catalogMap.get(`en_US-libritts-high${MS_SEP}${ms.speakerName}`);
      if (highCat) {
        const result = { displayName: highCat.displayName, gender: highCat.gender, provider: `Piper (${ms.model})` };
        _metaCache.set(voiceId, result);
        return result;
      }
      // Before patching: speakerName is a raw numeric corpus ID — resolve via onnx.json value
      if (/^\d+$/.test(ms.speakerName)) {
        try {
          const jsonPath = path.join(PIPER_VOICES_DIR, ms.model + '.onnx.json');
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          const seqIdx = data.speaker_id_map?.[ms.speakerName];
          if (seqIdx != null && _catalogEntries[seqIdx]) {
            const cat = _catalogEntries[seqIdx];
            const result = { displayName: cat.displayName, gender: cat.gender, provider: `Piper (${ms.model})` };
            _metaCache.set(voiceId, result);
            return result;
          }
        } catch { /* fall through */ }
      }
    }
    // Fallback for speakers not in the catalog (e.g. 16Speakers model)
    const displayName = uniquifyVoiceName(ms.speakerName.replace(/_/g, ' '));
    const result = {
      displayName,
      gender: inferGender(ms.speakerName, null),
      provider: `Piper (${ms.model})`,
    };
    _metaCache.set(voiceId, result);
    return result;
  }

  let dataset = null;
  try {
    const jsonPath = path.join(PIPER_VOICES_DIR, voiceId + '.onnx.json');
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    dataset = data.dataset ?? null;
  } catch {}
  const result = {
    displayName: formatVoiceName(voiceId, dataset),
    gender: inferGender(voiceId, dataset),
    provider: 'Piper',
  };
  _metaCache.set(voiceId, result);
  return result;
}

// ---------------------------------------------------------------------------

/**
 * Create the Voices tab component.
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @param {import('../../services/config-service.js').ConfigService}   services.configService
 * @param {import('../../services/provider-service.js').ProviderService} services.providerService
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createVoicesTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService, focusMainTabBar, updateHeaderStatus, languageService } = services;
  const _tl = (key) => languageService ? languageService.t(key) : key;

  // -------------------------------------------------------------------------
  // Container

  const box = blessed.box({
    parent: screen,
    top: 5,
    left: 0,
    width: '100%',
    bottom: 2,
    hidden: true,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    border: { type: 'line' },
    borderStyle: { fg: COLORS.borderFg },
  });

  // -------------------------------------------------------------------------
  // Section header

  const voicesSectionHdr = blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: `{#00897b-fg}${_tl('voicesHeader')}${'─'.repeat(58)}{/#00897b-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // Currently selected voice indicator (updated by refreshDisplay)
  const activeVoiceText = blessed.text({
    parent: box,
    top: 1,
    right: 4,
    shrink: true,
    tags: true,
    content: '',
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Search input

  const searchLabelText = blessed.text({
    parent: box,
    top: 3,
    left: 4,
    content: _tl('searchLabel'),
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const searchBox = blessed.textbox({
    parent: box,
    top: 3,
    left: 13,
    width: 40,
    height: 1,
    inputOnFocus: true,
    keys: true,
    style: {
      fg: COLORS.valueFg,
      bg: '#1a3a5c',
      focus: { bg: '#283593' },
    },
  });

  // -------------------------------------------------------------------------
  // Column header row (sits between search and voice list border)

  const colHeaderText = blessed.text({
    parent: box,
    top: 4,
    left: 6,
    content: `{#00897b-fg}${_tl('voicesColName').padEnd(COL_NAME_W)}{/#00897b-fg}{magenta-fg}♀{/magenta-fg}/{bright-cyan-fg}♂{/bright-cyan-fg} {#00897b-fg}${_tl('voicesColProvider')}{/#00897b-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Voice list

  const voiceList = blessed.list({
    parent: box,
    top: 5,
    left: 2,
    width: '96%',
    height: '50%',
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: 'line' },
    scrollbar: { ch: '│', style: { fg: COLORS.sectionHdr } },
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
      selected: { bg: '#2e7d32', fg: '#ffffff', bold: true },
      item: { fg: COLORS.labelFg },
    },
  });

  // -------------------------------------------------------------------------
  // Info panel

  const voiceInfoHdr = blessed.text({
    parent: box,
    top: '60%',
    left: 2,
    content: `{#00897b-fg}${_tl('voicesInfoHeader')}${'─'.repeat(54)}{/#00897b-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const infoLine = blessed.text({
    parent: box,
    top: '65%',
    left: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const previewLine = blessed.text({
    parent: box,
    top: '70%',
    left: 2,
    height: 1,
    tags: true,
    content: ' ',
    style: { fg: COLORS.activeFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Hint text shown in previewLine when the list has focus and nothing is playing
  const HINT_TEXT = '{white-fg}[Space] preview  [Enter] select  [+] thumbs up  [-] thumbs down{/white-fg}';
  let _listFocused = false;

  // Inline selection hint appended to the currently highlighted voice row.
  // _hintBase stores the item's clean content (no hint, no █) — no sentinel needed.
  // Use getter functions so hints re-translate when language changes.
  const _rowHintInstalled   = () => `  {white-fg}${_tl('voicesRowHintInstalled')}{/white-fg}`;
  const _rowHintUninstalled = () => `  {bright-yellow-fg}${_tl('voicesRowHintUninstalled')}{/bright-yellow-fg}`;
  let _hintIdx  = -1;
  let _hintBase = '';   // content of items[_hintIdx] before hint was appended
  let _refreshing = false;

  function _getRowHint(idx) {
    const voices = _getFilteredVoices();
    const voiceId = voices[idx];
    if (!voiceId) return _rowHintInstalled();
    return _isInstalled(voiceId) ? _rowHintInstalled() : _rowHintUninstalled();
  }

  // Translate gender value at display time
  function _tGender(g) {
    if (g === 'Female') return _tl('genderFemale');
    if (g === 'Male')   return _tl('genderMale');
    return g;
  }

  // Decoration helpers — strip blink cursor and (optionally) hint text from
  // a list item's content.  We use a precise approach instead of a generic
  // regex over `bright-black-fg` blocks because uninstalled rows wrap their
  // PROVIDER column in `bright-black-fg` too — a generic strip would erase it.
  //
  // _stripBlink(): only removes ` █` markers (safe to call on any row).
  // _stripHint():  removes hint by anchoring to the exact hint text from
  //                _getRowHint(idx). Only safe on rows we know are hinted.
  const _BLINK_RE = / █/g;
  function _stripBlink(raw) {
    return (raw ?? '').replace(_BLINK_RE, '');
  }
  function _stripHint(raw, idx) {
    const hint = _getRowHint(idx);
    if (!hint) return raw;
    // The hint is appended to the end (possibly followed by blink); remove it.
    const noBlink = (raw ?? '').replace(_BLINK_RE, '');
    if (noBlink.endsWith(hint)) return noBlink.slice(0, -hint.length);
    return noBlink;
  }
  function _stripDecorations(raw, idx) {
    return _stripHint(_stripBlink(raw), idx);
  }

  function _updateHint(idx) {
    const items = voiceList.items;
    const _pad = ' '.repeat(60);
    // Restore previously hinted row to its clean base
    if (_hintIdx >= 0 && _hintIdx !== idx && items[_hintIdx]) {
      items[_hintIdx].setContent(_hintBase + _pad);
    }
    if (idx >= 0 && items[idx]) {
      // The row may already have a hint (from a prior _updateHint cycle)
      // and/or a blink — strip both before capturing the clean base.
      _hintBase = _stripDecorations(items[idx].content, idx);
      items[idx].setContent(_hintBase + _getRowHint(idx));
    } else {
      _hintBase = '';
    }
    _hintIdx = idx;
  }

  // -------------------------------------------------------------------------
  // Playback state

  let _playingProcess = null;
  let _playingVoiceId = null;
  let _downloadProcess = null;
  let _closed = false;

  // Kill the entire process group so child audio players (piper, aplay, play) all die
  function _killPlayingProcess() {
    if (_playingProcess) {
      try { process.kill(-_playingProcess.pid, 'SIGTERM'); } catch {}
      _playingProcess = null;
    }
  }

  const _spawnEnv = buildAudioEnv();

  // Remote providers play audio on a remote device — local piper voices are irrelevant.
  // This check uses the same provider search order as _previewVoice.
  const _remoteProviders = ['ssh-remote', 'agentvibes-receiver'];
  function _isRemoteProvider() {
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    try {
      const providerPaths = [
        process.env.CLAUDE_PROJECT_DIR && path.join(process.env.CLAUDE_PROJECT_DIR, '.claude', 'tts-provider.txt'),
        path.join(process.cwd(), '.claude', 'tts-provider.txt'),
        path.join(projectRoot, '.claude', 'tts-provider.txt'),
        path.join(os.homedir(), '.claude', 'tts-provider.txt'),
      ].filter(Boolean);
      for (const p of providerPaths) {
        if (fs.existsSync(p)) {
          return _remoteProviders.includes(fs.readFileSync(p, 'utf8').trim());
        }
      }
    } catch {}
    return false;
  }

  /**
   * Preview a voice by synthesizing a sample phrase with piper, then playing the wav.
   * Second call with the same voice stops playback (toggle).
   */
  function _previewVoice(voiceId) {
    // Toggle: second press stops
    if (_playingVoiceId === voiceId) {
      _killPlayingProcess();
      _playingVoiceId = null;
      previewLine.setContent(_listFocused ? HINT_TEXT : '');
      screen.render();
      return;
    }

    // Kill any current preview first
    _killPlayingProcess();
    _playingVoiceId = null;

    // Check if we should route through remote provider (ssh-remote / agentvibes-receiver).
    // Search order: CLAUDE_PROJECT_DIR (project override) → cwd → package root → home.
    // Per-project tts-provider.txt intentionally overrides global — if a project sets
    // "piper" that is respected here.  If local playback fails (no audio device), the
    // error is surfaced in the previewLine rather than silently clearing.
    // NOTE: projectRoot is AgentVibes repo root (3 levels up from src/console/tabs/)
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    let activeProvider = '';
    try {
      const providerPaths = [
        process.env.CLAUDE_PROJECT_DIR && path.join(process.env.CLAUDE_PROJECT_DIR, '.claude', 'tts-provider.txt'),
        path.join(process.cwd(), '.claude', 'tts-provider.txt'),
        path.join(projectRoot, '.claude', 'tts-provider.txt'),
        path.join(os.homedir(), '.claude', 'tts-provider.txt'),
      ].filter(Boolean);
      for (const p of providerPaths) {
        if (fs.existsSync(p)) { activeProvider = fs.readFileSync(p, 'utf8').trim(); break; }
      }
    } catch {}

    if (_remoteProviders.includes(activeProvider)) {
      const isWindows = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      const phrase = `Hi, my name is ${getVoiceMeta(voiceId).displayName}.`;
      // Hooks live in the AgentVibes package (projectRoot), not the user's project dir.
      // Fall back to CLAUDE_PROJECT_DIR / cwd only if the hook isn't at projectRoot
      // (e.g. when running from a published npm package with a different layout).
      const _playTtsName = isWindows
        ? path.join('.claude', 'hooks-windows', 'play-tts.ps1')
        : path.join('.claude', 'hooks', 'play-tts.sh');
      const hooksBase = fs.existsSync(path.join(projectRoot, _playTtsName))
        ? projectRoot
        : (process.env.CLAUDE_PROJECT_DIR || process.cwd());
      let proc;
      if (isWindows) {
        const playTts = path.join(hooksBase, '.claude', 'hooks-windows', 'play-tts.ps1');
        proc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', playTts, phrase, voiceId], {
          stdio: 'ignore', detached: false, windowsHide: true, env: _spawnEnv,
        });
      } else {
        const playTts = path.join(hooksBase, '.claude', 'hooks', 'play-tts.sh');
        proc = spawn('bash', [playTts, phrase, voiceId], {
          stdio: ['ignore', 'ignore', 'pipe'], detached: true, env: _spawnEnv,
          cwd: process.cwd(),
        });
      }
      _playingProcess = proc;
      _playingVoiceId = voiceId;
      refreshDisplay();
      previewLine.setContent('{bright-magenta-fg}♪ Synthesizing on remote...{/bright-magenta-fg}');
      screen.render();
      let _stderrBuf = '';
      if (proc.stderr) {
        proc.stderr.on('data', d => { _stderrBuf += d.toString(); });
      }
      proc.on('exit', (code) => {
        if (_playingVoiceId === voiceId) {
          _playingVoiceId = null; _playingProcess = null;
          if (code !== 0 && _stderrBuf) {
            const msg = _stderrBuf.trim().split('\n').pop() || 'Remote TTS failed';
            previewLine.setContent(`{red-fg}♪ ${msg}{/red-fg}`);
            screen.render();
            setTimeout(() => { if (!_closed) { previewLine.setContent(_listFocused ? HINT_TEXT : ''); refreshDisplay(); } }, 6000);
          } else {
            // Keep message + ♪ visible for 5s while remote device synthesises and plays
            setTimeout(() => { if (!_closed) { previewLine.setContent(_listFocused ? HINT_TEXT : ''); refreshDisplay(); } }, 5000);
          }
        }
      });
      proc.on('error', (err) => {
        _playingVoiceId = null; _playingProcess = null;
        previewLine.setContent(`{red-fg}Remote preview failed: ${err.message}{/red-fg}`);
        screen.render();
        setTimeout(() => { previewLine.setContent(_listFocused ? HINT_TEXT : ''); screen.render(); }, 4000);
      });
      return;
    }

    // Resolve model path (may be multi-speaker)
    const ms = parseMultiSpeaker(voiceId);
    const voicePath = path.resolve(PIPER_VOICES_DIR, ms.model + '.onnx');
    const safeBase = path.resolve(PIPER_VOICES_DIR);
    if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) {
      return;
    }

    const tempWav = path.join(os.tmpdir(), `agentvibes-preview-${Date.now()}.wav`);
    const phrase = `Hi, my name is ${getVoiceMeta(voiceId).displayName}.`;

    // Synthesize: spawn piper; on Windows use the exe path directly
    const isWindows = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
    let piperBin = 'piper';
    if (isWindows) {
      const localAppData = process.env.LOCALAPPDATA ||
        (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
      if (localAppData) {
        const exePath = path.join(localAppData, 'Programs', 'Piper', 'piper.exe');
        if (fs.existsSync(exePath)) piperBin = exePath;
      }
    }
    const piperArgs = ['--model', voicePath, '--output_file', tempWav];
    if (ms.speakerId != null) piperArgs.push('--speaker', String(ms.speakerId));
    // On Windows, avoid detached:true which opens a visible console window
    const piper = spawn(piperBin, piperArgs, {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached: !isWindows,
      windowsHide: true,
      env: _spawnEnv,
    });
    piper.stdin.write(phrase + '\n');
    piper.stdin.end();

    _playingProcess = piper;
    _playingVoiceId = voiceId;

    previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Synthesizing: ${voiceId}…{/${COLORS.activeFg}-fg}`);
    screen.render();

    piper.on('exit', (code) => {
      if (_playingVoiceId !== voiceId) {
        // User stopped before synthesis finished
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }

      if (code !== 0) {
        _playingVoiceId = null;
        _playingProcess = null;
        previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Preview failed (piper error — is piper installed?){/${COLORS.activeFg}-fg}`);
        screen.render();
        setTimeout(() => { previewLine.setContent(_listFocused ? HINT_TEXT : ''); screen.render(); }, 4000);
        return;
      }

      // Play the synthesized wav — try each installed player until one succeeds
      const _wavPlayers = getAllWavPlayers(_spawnEnv);
      if (_wavPlayers.length === 0) {
        _playingVoiceId = null;
        _playingProcess = null;
        previewLine.setContent(`{red-fg}No audio player found. Install ffmpeg.{/red-fg}`);
        screen.render();
        setTimeout(() => { previewLine.setContent(_listFocused ? HINT_TEXT : ''); screen.render(); }, 4000);
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }

      // Race note: _playingVoiceId could change between piper exit and here
      // if the user stops playback. Re-check before assigning to avoid orphan.
      if (_playingVoiceId !== voiceId) { try { fs.unlinkSync(tempWav); } catch {} return; }

      previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Playing: ${voiceId}  (Enter/Space to stop){/${COLORS.activeFg}-fg}`);
      screen.render();

      function _tryNextPlayer(remainingPlayers) {
        if (!remainingPlayers.length) {
          _playingVoiceId = null;
          _playingProcess = null;
          previewLine.setContent(`{red-fg}♪ Audio playback failed (no audio device?) — check your provider in Setup{/red-fg}`);
          screen.render();
          setTimeout(() => { if (!_closed) { previewLine.setContent(_listFocused ? HINT_TEXT : ''); screen.render(); } }, 5000);
          try { fs.unlinkSync(tempWav); } catch {}
          return;
        }
        const [wavP, ...rest] = remainingPlayers;
        const playProc = spawn(wavP.bin, wavP.args(tempWav), {
          stdio: 'ignore',
          detached: !isWindows,
          windowsHide: true,
          env: _spawnEnv,
        });
        if (_playingVoiceId !== voiceId) {
          try { playProc.kill(); } catch {}
          try { fs.unlinkSync(tempWav); } catch {}
          return;
        }
        _playingProcess = playProc;

        playProc.on('exit', (code) => {
          if (_playingVoiceId !== voiceId) {
            try { fs.unlinkSync(tempWav); } catch {}
            return;
          }
          if (code !== 0) {
            // This player failed — try the next one
            _tryNextPlayer(rest);
          } else {
            _playingVoiceId = null;
            _playingProcess = null;
            previewLine.setContent(_listFocused ? HINT_TEXT : '');
            refreshDisplay();
            try { fs.unlinkSync(tempWav); } catch {}
          }
        });

        playProc.on('error', () => {
          if (_playingVoiceId !== voiceId) { try { fs.unlinkSync(tempWav); } catch {} return; }
          _tryNextPlayer(rest);
        });
      }

      _tryNextPlayer(_wavPlayers);
    });

    piper.on('error', () => {
      _playingVoiceId = null;
      _playingProcess = null;
      previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Cannot find piper — install with: pipx install piper-tts{/${COLORS.activeFg}-fg}`);
      screen.render();
      setTimeout(() => { previewLine.setContent(_listFocused ? HINT_TEXT : ''); screen.render(); }, 4000);
      try { fs.unlinkSync(tempWav); } catch {}
    });
  }

  // -------------------------------------------------------------------------
  // Voice activation (handles multi-speaker model/speaker-id files)

  function _activateVoice(voiceId) {
    const ms = parseMultiSpeaker(voiceId);
    const claudeDir = path.resolve(process.cwd(), '.claude');
    try { fs.mkdirSync(claudeDir, { recursive: true }); } catch {}
    // Always write tts-voice.txt so shell scripts pick up the voice on reload
    try {
      fs.writeFileSync(path.join(claudeDir, 'tts-voice.txt'), voiceId, 'utf8');
    } catch { /* non-fatal */ }
    if (ms.isMultiSpeaker) {
      // Store full MS ID (e.g., "16Speakers::Kristin_Hughes") so list matching works
      providerService.setActiveVoice(voiceId);
      try {
        fs.writeFileSync(path.join(claudeDir, 'tts-piper-model.txt'), ms.model, 'utf8');
        fs.writeFileSync(path.join(claudeDir, 'tts-piper-speaker-id.txt'), String(ms.speakerId), 'utf8');
      } catch { /* non-fatal */ }
    } else {
      providerService.setActiveVoice(voiceId);
      // Clear multi-speaker files if switching to a single-speaker voice
      try { fs.unlinkSync(path.join(claudeDir, 'tts-piper-model.txt')); } catch { /* ok */ }
      try { fs.unlinkSync(path.join(claudeDir, 'tts-piper-speaker-id.txt')); } catch { /* ok */ }
    }
  }

  // -------------------------------------------------------------------------
  // Buttons

  function _createBtn(label, onClick) {
    const btn = blessed.button({
      parent: box,
      content: label,
      mouse: true,
      keys: true,
      shrink: true,
      padding: { left: 1, right: 1 },
      style: {
        bg: COLORS.btnDefault,
        fg: 'bright-white',
        focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      },
    });
    btn.on('focus', () => {
      btn.style.bg = COLORS.btnFocus;
      btn.style.fg = COLORS.btnFocusFg;
      const raw = btn.content.replace(/[►◄]/g, '').trim();
      btn.setContent(`►${raw}◄`);
      screen.render();
    });
    btn.on('blur', () => {
      btn.style.bg = COLORS.btnDefault;
      btn.style.fg = 'bright-white';
      const raw = btn.content.replace(/[►◄]/g, '').trim();
      btn.setContent(raw);
      screen.render();
    });
    btn.key(['enter', 'space'], () => {
      btn.style.bg = COLORS.btnPress;
      screen.render();
      setTimeout(() => {
        btn.style.bg = COLORS.btnDefault;
        screen.render();
        onClick();
      }, 150);
    });
    btn.on('click', () => btn.press());
    btn.on('mouseover', () => btn.focus());
    return btn;
  }

  const switchBtn = _createBtn(_tl('voicesSwitchBtn'), () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      _activateVoice(selected);
      refreshDisplay();
    }
  });
  switchBtn.bottom = 4;
  switchBtn.left = 4;

  const favoriteBtn = _createBtn(_tl('voicesFavoriteBtn'), () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      toggleFavorite(configService, selected);
      refreshDisplay();
    }
  });
  favoriteBtn.bottom = 4;
  favoriteBtn.left = 22;

  const installBtn = _createBtn(_tl('voicesDownloadBtn'), () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (!selected) return;
    if (_isInstalled(selected)) {
      const notice = blessed.text({
        parent: box,
        top: 'center',
        left: 'center',
        content: 'Voice already installed. Scroll down to find uninstalled voices (greyed out).',
        tags: true,
        style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
      });
      screen.render();
      setTimeout(() => { notice.destroy(); screen.render(); }, 3000);
    } else {
      _openDownloadModal(selected);
    }
  });
  installBtn.bottom = 4;
  installBtn.left = 38;

  // -------------------------------------------------------------------------
  // "Voice Changed" notice — auto-dismisses after 2 s

  function _showVoiceChangedNotice(displayName) {
    const notice = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 44,
      height: 5,
      border: { type: 'line' },
      tags: true,
      label: ` {${COLORS.activeFg}-fg}Done{/${COLORS.activeFg}-fg} `,
      style: { border: { fg: COLORS.btnFocus }, bg: COLORS.contentBg },
      content: `\n  {${COLORS.activeFg}-fg}✓ Voice changed: ${displayName}{/${COLORS.activeFg}-fg}`,
    });
    notice.setFront();
    screen.render();
    setTimeout(() => { notice.destroy(); screen.render(); }, 2000);
  }

  // -------------------------------------------------------------------------
  // Select-voice confirmation modal

  function _activateVoiceGlobal(voiceId) {
    // Save voice globally (all projects)
    const ms = parseMultiSpeaker(voiceId);
    const globalClaudeDir = path.resolve(os.homedir(), '.claude');
    // Verify ownership before writing to global config dir
    try {
      const stat = fs.statSync(globalClaudeDir);
      if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) return;
    } catch {}
    if (ms.isMultiSpeaker) {
      configService.setGlobal('voice', voiceId);
      try {
        fs.writeFileSync(path.join(globalClaudeDir, 'tts-piper-model.txt'), ms.model, 'utf8');
        fs.writeFileSync(path.join(globalClaudeDir, 'tts-piper-speaker-id.txt'), String(ms.speakerId), 'utf8');
      } catch { /* non-fatal */ }
    } else {
      configService.setGlobal('voice', voiceId);
      try { fs.unlinkSync(path.join(globalClaudeDir, 'tts-piper-model.txt')); } catch { /* ok */ }
      try { fs.unlinkSync(path.join(globalClaudeDir, 'tts-piper-speaker-id.txt')); } catch { /* ok */ }
    }
    // Also write global tts-voice.txt for shell scripts
    try { fs.writeFileSync(path.join(globalClaudeDir, 'tts-voice.txt'), ms.isMultiSpeaker ? voiceId : voiceId, 'utf8'); } catch { /* ok */ }
  }

  function _openSelectVoiceModal(voiceId) {
    const { displayName } = getVoiceMeta(voiceId);

    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 8,
      border: { type: 'line' },
      tags: true,
      label: ` {${COLORS.activeFg}-fg}Set Default Voice{/${COLORS.activeFg}-fg} `,
      style: { border: { fg: COLORS.btnFocus }, bg: COLORS.contentBg },
    });

    blessed.text({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      content: `Set {${COLORS.valueFg}-fg}${displayName}{/${COLORS.valueFg}-fg} as your default voice?`,
      tags: true,
      style: { bg: COLORS.contentBg },
    });

    // Status line shows playback state while modal is open
    const modalStatus = blessed.text({
      parent: modal,
      top: 3,
      left: 2,
      right: 2,
      tags: true,
      content: '{white-fg}Press Preview to audition this voice{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    function _close() {
      _killPlayingProcess();
      _playingVoiceId = null;
      previewLine.setContent(_listFocused ? HINT_TEXT : '');
      modal.destroy();
      voiceList.focus();
      screen.render();
    }

    // Note: blessed's destroy() does not remove key listeners from child buttons,
    // so modal button handlers may leak. This is a known blessed limitation.
    function _makeBtn(label, bg, left, top, onClick) {
      const btn = blessed.button({
        parent: modal,
        content: label,
        top,
        left,
        mouse: true,
        keys: true,
        shrink: true,
        padding: { left: 1, right: 1 },
        style: {
          bg,
          fg: 'bright-white',
          focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
          hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        },
      });
      btn.key(['enter', 'space'], () => { _close(); onClick(); });
      btn.on('click', () => btn.press());
      return btn;
    }

    const okLocalBtn = _makeBtn('Save Locally', COLORS.btnDefault, 2, 5, () => {
      _activateVoice(voiceId);
      refreshDisplay();
      _showVoiceChangedNotice(displayName);
    });
    const okGlobalBtn = _makeBtn('Save Globally & Locally', '#1565c0', 18, 5, () => {
      _activateVoice(voiceId);
      _activateVoiceGlobal(voiceId);
      refreshDisplay();
      _showVoiceChangedNotice(displayName);
    });
    const cancelBtn = _makeBtn('Cancel', '#546e7a', 46, 5, () => {});

    // Preview button — does NOT close the modal; plays/stops the voice inline
    const previewBtn = blessed.button({
      parent: modal,
      content: 'Preview',
      top: 5,
      left: 58,
      mouse: true,
      keys: true,
      shrink: true,
      padding: { left: 1, right: 1 },
      style: {
        bg: '#e65100',
        fg: 'bright-white',
        focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      },
    });
    previewBtn.key(['enter', 'space'], () => {
      const isPlaying = _playingVoiceId === voiceId;
      _previewVoice(voiceId);
      modalStatus.setContent(isPlaying
        ? '{white-fg}Stopped.{/white-fg}'
        : `{${COLORS.activeFg}-fg}♪ Playing: ${displayName}…{/${COLORS.activeFg}-fg}`
      );
      screen.render();
    });
    previewBtn.on('click', () => previewBtn.press());

    // Tab/arrow navigation: SaveLocal → SaveGlobal → Cancel → Preview → SaveLocal
    okLocalBtn.key(['tab', 'right'],    () => { okGlobalBtn.focus(); screen.render(); });
    okGlobalBtn.key(['tab', 'right'],   () => { cancelBtn.focus();   screen.render(); });
    cancelBtn.key(['tab', 'right'],     () => { previewBtn.focus();  screen.render(); });
    previewBtn.key(['tab', 'right'],    () => { okLocalBtn.focus();  screen.render(); });
    previewBtn.key(['left'],            () => { cancelBtn.focus();   screen.render(); });
    cancelBtn.key(['left'],             () => { okGlobalBtn.focus(); screen.render(); });
    okGlobalBtn.key(['left'],           () => { okLocalBtn.focus();  screen.render(); });
    okLocalBtn.key(['left'],            () => { previewBtn.focus();  screen.render(); });

    modal.key(['escape', 'q', 'Q'], _close);

    modal.setFront();
    okLocalBtn.focus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Download modal for uninstalled catalog voices

  function _openDownloadModal(voiceId) {
    const cat = _catalogMap.get(voiceId);
    const displayName = cat?.displayName ?? voiceId;
    const modelToDownload = cat?.type === 'libritts' ? 'en_US-libritts-high' : (cat?.model ?? voiceId);
    const isLibriTTS = cat?.type === 'libritts';

    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 64,
      height: 10,
      border: { type: 'line' },
      tags: true,
      label: ` {${COLORS.activeFg}-fg}Download Voice{/${COLORS.activeFg}-fg} `,
      style: { border: { fg: COLORS.btnFocus }, bg: COLORS.contentBg },
    });

    const msgLine = blessed.text({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      tags: true,
      content: `Download {${COLORS.valueFg}-fg}${displayName}{/${COLORS.valueFg}-fg}?\n\n` +
        `Model: {${COLORS.activeFg}-fg}${modelToDownload}{/${COLORS.activeFg}-fg}` +
        (isLibriTTS ? `  (~57 MB — unlocks all 904 LibriTTS speakers)` : `  (~25 MB)`),
      style: { bg: COLORS.contentBg },
    });

    const statusLine = blessed.text({
      parent: modal,
      top: 5,
      left: 2,
      right: 2,
      tags: true,
      content: '',
      style: { bg: COLORS.contentBg },
    });

    let _downloading = false;

    function _close() {
      modal.destroy();
      voiceList.focus();
      screen.render();
    }

    function _startDownload() {
      if (_downloading) return;
      _downloading = true;

      // Animated spinner
      const spinFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let spinIdx = 0;
      let dlPhase = 'Downloading model';
      const progressBar = (pct) => {
        const filled = Math.round(pct / 5);
        const empty = 20 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
      };

      const spinTimer = setInterval(() => {
        spinIdx = (spinIdx + 1) % spinFrames.length;
        const frame = spinFrames[spinIdx];
        statusLine.setContent(
          `{${COLORS.activeFg}-fg}${frame} ${dlPhase}… ${modelToDownload}{/${COLORS.activeFg}-fg}`
        );
        screen.render();
      }, 100);

      // Download voice model — use PowerShell on Windows, bash on Unix
      const packageRoot = path.resolve(__dirname, '..', '..', '..');
      const isWindows = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      let dlProc;

      if (isWindows) {
        const piperVoicesDir = resolvePiperVoicesDir();
        const hfBase = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';
        const match = modelToDownload.match(/^([a-z]{2})_([A-Z]{2})-([a-zA-Z0-9_]+)-([a-z]+)$/);
        let modelUrl, configUrl;
        if (match) {
          const [, lang, region, speaker, quality] = match;
          const hfPath = `${lang}/${lang}_${region}/${speaker}/${quality}`;
          modelUrl = `${hfBase}/${hfPath}/${modelToDownload}.onnx`;
          configUrl = `${hfBase}/${hfPath}/${modelToDownload}.onnx.json`;
        } else {
          const customBase = 'https://huggingface.co/agentvibes/piper-custom-voices/resolve/main';
          modelUrl = `${customBase}/${modelToDownload}.onnx`;
          configUrl = `${customBase}/${modelToDownload}.onnx.json`;
        }
        const modelFile = path.join(piperVoicesDir, `${modelToDownload}.onnx`);
        const configFile = path.join(piperVoicesDir, `${modelToDownload}.onnx.json`);
        // PowerShell script with progress reporting
        const psScript = `
          $ErrorActionPreference = 'Stop'
          $ProgressPreference = 'SilentlyContinue'
          $voicesDir = '${piperVoicesDir.replace(/'/g, "''")}'
          if (-not (Test-Path $voicesDir)) { New-Item -ItemType Directory -Path $voicesDir -Force | Out-Null }
          Write-Output 'PHASE:model'
          Invoke-WebRequest -Uri '${modelUrl}' -OutFile '${modelFile.replace(/'/g, "''")}' -ErrorAction Stop
          Write-Output 'PHASE:config'
          Invoke-WebRequest -Uri '${configUrl}' -OutFile '${configFile.replace(/'/g, "''")}' -ErrorAction Stop
          Write-Output 'PHASE:done'
        `;
        dlProc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: _spawnEnv,
        });
      } else {
        const managerScript = path.resolve(packageRoot, '.claude', 'hooks', 'piper-voice-manager.sh');
        dlProc = spawn('bash', ['-c', 'source "$1" && download_voice "$2"', '_', managerScript, modelToDownload], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: _spawnEnv,
        });
      }
      _downloadProcess = dlProc;

      let output = '';
      dlProc.stdout.on('data', (d) => {
        const chunk = d.toString();
        output += chunk;
        // Update phase based on progress markers
        if (chunk.includes('PHASE:config') || chunk.includes('config file')) {
          dlPhase = 'Downloading config';
        } else if (chunk.includes('PHASE:done') || chunk.includes('successfully')) {
          dlPhase = 'Finishing up';
        }
      });
      dlProc.stderr.on('data', (d) => { output += d.toString(); });

      dlProc.on('exit', (code) => {
        clearInterval(spinTimer);
        _downloading = false;
        _downloadProcess = null;
        if (code === 0) {
          if (isLibriTTS) {
            patchLibriTTSSpeakerNames();
            _metaCache.clear();
          }
          statusLine.setContent(`{green-fg}✓ Downloaded successfully!{/green-fg}`);
          screen.render();
          setTimeout(() => {
            _close();
            refreshDisplay();
          }, 1500);
        } else {
          statusLine.setContent(`{red-fg}✗ Download failed. ${output.slice(-80).trim()}{/red-fg}`);
          screen.render();
        }
      });

      dlProc.on('error', () => {
        clearInterval(spinTimer);
        _downloading = false;
        _downloadProcess = null;
        statusLine.setContent(`{red-fg}✗ Could not run download script{/red-fg}`);
        screen.render();
      });
    }

    function _makeBtn(label, bg, left, onClick) {
      const btn = blessed.button({
        parent: modal,
        content: label,
        top: 7,
        left,
        mouse: true,
        keys: true,
        shrink: true,
        padding: { left: 1, right: 1 },
        style: {
          bg,
          fg: 'bright-white',
          focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
          hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        },
      });
      btn.key(['enter', 'space'], onClick);
      btn.on('click', () => btn.press());
      return btn;
    }

    const dlBtn     = _makeBtn('Download', COLORS.btnDefault, 2, _startDownload);
    const cancelBtn = _makeBtn('Cancel',   '#546e7a',         16, _close);

    dlBtn.key(['tab', 'right'], () => { cancelBtn.focus(); screen.render(); });
    cancelBtn.key(['tab', 'right'], () => { dlBtn.focus(); screen.render(); });
    dlBtn.key(['left'], () => { cancelBtn.focus(); screen.render(); });
    cancelBtn.key(['left'], () => { dlBtn.focus(); screen.render(); });

    modal.key(['escape', 'q', 'Q'], () => { if (!_downloading) _close(); });

    modal.setFront();
    dlBtn.focus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // State

  let _allVoices = [];      // voice IDs (installed first, then catalog-only)
  let _installedSet = new Set();  // which IDs are locally installed
  let _filterText = '';

  function _getFilteredVoices() {
    if (!_filterText) return _allVoices;
    const f = _filterText.toLowerCase();
    return _allVoices.filter(v => {
      if (v.toLowerCase().includes(f)) return true;
      // Also search by catalog display name
      const cat = _catalogMap.get(v);
      if (cat && cat.displayName.toLowerCase().includes(f)) return true;
      return false;
    });
  }

  function _isInstalled(voiceId) {
    return _installedSet.has(voiceId);
  }

  function _buildListItems(voices, active, favorites, thumbsDown) {
    return voices.map(v => {
      const installed = _isInstalled(v);
      const isUp     = favorites.includes(v);
      const isDown   = thumbsDown.includes(v);
      const isActive = v === active;
      const isPrev   = v === _playingVoiceId;
      const star = isUp ? '{green-fg}👍{/green-fg}' : (isDown ? '{red-fg}👎{/red-fg}' : '  ');
      const dot  = isPrev ? '♪' : (isActive ? '{green-fg}✓{/green-fg}' : ' ');

      let displayName, gender, provider;
      if (installed) {
        const meta = getVoiceMeta(v);
        displayName = meta.displayName;
        gender = meta.gender;
        provider = meta.provider;
      } else {
        // Catalog-only voice — use catalog metadata
        const cat = _catalogMap.get(v);
        displayName = cat?.displayName ?? v;
        gender = cat?.gender ?? '—';
        provider = cat?.type === 'libritts' ? 'Piper (LibriTTS)' : 'Piper';
      }

      const name = displayName.length > COL_NAME_W
        ? displayName.slice(0, COL_NAME_W - 1) + '…'
        : displayName.padEnd(COL_NAME_W);

      // genderIconTag has invisible color tags — pad with literal spaces (1 visible char + 3 spaces = 4)
      const gIcon = genderIconTag(gender);
      if (!installed) {
        // Greyed-out row for uninstalled catalog voices — close grey wrap around the icon so its colors show
        return `{bright-black-fg} ${star}  ${name}{/bright-black-fg}${gIcon}   {bright-black-fg}${provider}{/bright-black-fg}`;
      }
      return `{${COLORS.labelFg}-fg} ${star}${dot} ${name}{/${COLORS.labelFg}-fg}${gIcon}   {${COLORS.labelFg}-fg}${provider}${isPrev ? ` ${_tl('voicePlaying')}` : ''}{/${COLORS.labelFg}-fg}`;
    });
  }

  // Build a tagged info string with yellow labels for the info panel
  function _formatInfoTagged(voiceId) {
    const Y = COLORS.valueFg;  // #ffd700 yellow

    // Uninstalled catalog voice — show download prompt
    if (!_isInstalled(voiceId)) {
      const cat = _catalogMap.get(voiceId);
      const name = cat?.displayName ?? voiceId;
      const gender = cat?.gender ?? '—';
      const model = cat?.type === 'libritts' ? 'LibriTTS High (multi-speaker)' : (cat?.model ?? voiceId);
      return `{${Y}-fg}${_tl('voiceInfoVoice')}{/${Y}-fg} ${name}  ` +
             `{${Y}-fg}${_tl('voiceInfoGender')}{/${Y}-fg} ${_tGender(gender)}  ` +
             `{${Y}-fg}${_tl('voiceInfoModel')}{/${Y}-fg} ${model}  ` +
             `{bright-yellow-fg}${_tl('voiceInfoDownload')}{/bright-yellow-fg}`;
    }

    const ms = parseMultiSpeaker(voiceId);
    if (ms.isMultiSpeaker) {
      const name = ms.speakerName.replace(/_/g, ' ');
      return `{${Y}-fg}${_tl('voiceInfoSpeaker')}{/${Y}-fg} ${name}  ` +
             `{${Y}-fg}${_tl('voiceInfoModel')}{/${Y}-fg} ${ms.model}  ` +
             `{${Y}-fg}${_tl('voiceInfoSpeakerId')}{/${Y}-fg} ${ms.speakerId ?? '?'}  ` +
             `{${Y}-fg}${_tl('voiceInfoProvider')}{/${Y}-fg} Piper`;
    }
    const { lang, name, quality } = parseVoiceId(voiceId);
    if (lang === 'unknown') {
      return `{${Y}-fg}${_tl('voiceInfoVoice')}{/${Y}-fg} ${voiceId}  {${Y}-fg}${_tl('voiceInfoProvider')}{/${Y}-fg} Piper`;
    }
    return `{${Y}-fg}${_tl('voiceInfoVoice')}{/${Y}-fg} ${name}  ` +
           `{${Y}-fg}${_tl('voiceInfoLanguage')}{/${Y}-fg} ${lang}  ` +
           `{${Y}-fg}${_tl('voiceInfoQuality')}{/${Y}-fg} ${quality}  ` +
           `{${Y}-fg}${_tl('voiceInfoProvider')}{/${Y}-fg} Piper  ` +
           `{${Y}-fg}${_tl('voiceInfoId')}{/${Y}-fg} ${voiceId}`;
  }

  function refreshDisplay() {
    _refreshing = true;
    const savedIdx = voiceList.selected ?? 0;
    const savedScroll = voiceList.childBase ?? 0;

    // Load catalog on first refresh and patch speaker names (once)
    if (!_catalogLoaded) {
      loadCatalog();
      patchLibriTTSSpeakerNames();
      _metaCache.clear();
    }

    // Installed voices (from local disk)
    const installed = scanInstalledVoices();
    _installedSet = new Set(installed);

    // Merge: installed voices first, then uninstalled catalog voices
    const catalogOnly = _catalogEntries
      .filter(c => !_installedSet.has(c.voiceId))
      .map(c => c.voiceId);
    _allVoices = [...installed, ...catalogOnly];

    const active = providerService.getActiveVoiceId();
    const favorites = getFavorites(configService);
    const thumbsDown = getThumbsDown(configService);
    const filtered = _getFilteredVoices();
    const items = _buildListItems(filtered, active, favorites, thumbsDown);

    voiceList.setItems(items.length > 0 ? items : [' (no voices found — install piper first)']);
    const maxIdx = Math.max(0, (items.length > 0 ? items.length : 1) - 1);
    voiceList.select(Math.min(savedIdx, maxIdx));
    voiceList.childBase = Math.min(savedScroll, Math.max(0, (items.length > 0 ? items.length : 1) - (voiceList.height - 2)));

    // Re-apply inline hint if list is focused
    if (_listFocused) {
      _hintIdx = -1;
      _hintBase = '';
      _updateHint(voiceList.selected ?? 0);
    }

    // Update info panel for currently selected item
    const sel = filtered[voiceList.selected] ?? active ?? '';
    infoLine.setContent(`  ${_formatInfoTagged(sel)}`);

    // Update "Currently Selected" header
    if (active) {
      const _msA = parseMultiSpeaker(active);
      const activeName = _msA.isMultiSpeaker ? _msA.speakerName : active;
      const meta = _isInstalled(active) ? getVoiceMeta(active) : null;
      const displayName = meta?.displayName ?? activeName;
      activeVoiceText.setContent(`{green-fg}✓ ${displayName}{/green-fg}`);
    } else {
      activeVoiceText.setContent(`{bright-black-fg}No voice selected{/bright-black-fg}`);
    }

    _refreshing = false;
    if (typeof updateHeaderStatus === 'function') updateHeaderStatus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Search box interaction

  searchBox.on('keypress', () => {
    // Update filter after keystroke
    setTimeout(() => {
      _filterText = searchBox.getValue().trim();
      refreshDisplay();
    }, 0);
  });

  // Pressing Escape in search returns focus to voiceList
  searchBox.key(['escape'], () => {
    voiceList.focus();
    screen.render();
  });

  // Page Up / Page Down — jump ~20 items at a time
  const PAGE_SIZE = 20;
  voiceList.key(['pagedown'], () => {
    const voices = _getFilteredVoices();
    const maxIdx = Math.max(0, voices.length - 1);
    voiceList.select(Math.min((voiceList.selected ?? 0) + PAGE_SIZE, maxIdx));
    screen.render();
  });
  voiceList.key(['pageup'], () => {
    voiceList.select(Math.max((voiceList.selected ?? 0) - PAGE_SIZE, 0));
    screen.render();
  });

  // Pressing '/' in voiceList focuses search box
  voiceList.key(['/'], () => {
    searchBox.clearValue();
    searchBox.focus();
    screen.render();
  });

  // ↑ at the top of the list → jump to main header tab bar
  // [↑] at top of list → jump to main header tab bar (second press)
  let _prevVoiceSel = -1;
  voiceList.key(['up'], () => {
    const cur = voiceList.selected ?? 0;
    if (cur === 0 && _prevVoiceSel === 0 && typeof focusMainTabBar === 'function') {
      focusMainTabBar();
      setTimeout(() => { voiceList.select(0); screen.render(); }, 0);
    }
    _prevVoiceSel = cur;
  });

  // Escape at the list level → return to header tab bar
  voiceList.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
  });

  // '*' or '+' in voiceList toggles thumbs-up
  voiceList.key(['*', '+'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      toggleThumbsUp(configService, selected);
      refreshDisplay();
    }
  });

  // '-' in voiceList toggles thumbs-down
  voiceList.key(['-'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      toggleThumbsDown(configService, selected);
      refreshDisplay();
    }
  });

  // Space → preview voice (toggle: second press stops playback)
  // For remote providers, skip the install check — audio plays on the remote device.
  voiceList.key(['space'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (!selected) return;
    if (!_isRemoteProvider() && !_isInstalled(selected)) {
      previewLine.setContent(`{bright-yellow-fg}⬇ Voice not installed — press [Enter] to download first{/bright-yellow-fg}`);
      screen.render();
      setTimeout(() => { previewLine.setContent(_listFocused ? HINT_TEXT : ''); screen.render(); }, 3000);
      return;
    }
    _previewVoice(selected);
    refreshDisplay();
  });

  // Enter → open "Set as default voice" or download uninstalled voice
  voiceList.key(['enter'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (!selected) return;
    _killPlayingProcess();
    _playingVoiceId = null;
    previewLine.setContent('');
    screen.render();

    if (_isRemoteProvider() || _isInstalled(selected)) {
      _openSelectVoiceModal(selected);
    } else {
      _openDownloadModal(selected);
    }
  });

  // Blinking █ on selected row while list is focused
  let _vlBlink = { interval: null, on: false, sel: -1 };
  process.on('exit', () => { if (_vlBlink.interval) clearInterval(_vlBlink.interval); });
  function _vlTick() {
    _vlBlink.on = !_vlBlink.on;
    const items = voiceList.items;
    const cur = voiceList.selected ?? 0;
    // Clean old row — only strip blink (it's not the hinted row anymore,
    // and we don't want to accidentally erase its provider column).
    if (_vlBlink.sel !== cur && _vlBlink.sel >= 0 && items[_vlBlink.sel]) {
      items[_vlBlink.sel].setContent(_stripBlink(items[_vlBlink.sel].content));
    }
    _vlBlink.sel = cur;
    if (items[cur]) {
      // Get content without blink but preserve hint
      const raw = _stripBlink(items[cur].content);
      items[cur].setContent(_vlBlink.on ? `${raw} █` : raw);
    }
    screen.render();
  }
  voiceList.on('focus', () => {
    _listFocused = true;
    _vlBlink.on = true;
    _vlBlink.sel = voiceList.selected ?? 0;
    _hintIdx = -1;
    _hintBase = '';
    _updateHint(_vlBlink.sel);
    const items = voiceList.items;
    if (items[_vlBlink.sel]) {
      const raw = _stripBlink(items[_vlBlink.sel].content);
      items[_vlBlink.sel].setContent(raw + ' █');
    }
    if (!_playingVoiceId) previewLine.setContent(HINT_TEXT);
    screen.render();
    _vlBlink.interval = setInterval(_vlTick, 500);
  });
  voiceList.on('blur', () => {
    _listFocused = false;
    if (!_playingVoiceId) previewLine.setContent('');
    if (_vlBlink.interval) { clearInterval(_vlBlink.interval); _vlBlink.interval = null; }
    const items = voiceList.items;
    // Clean up: strip blink from selected row, strip hint from hinted row.
    // Only the hinted row knows what its hint text was — use _stripDecorations
    // there. For other rows, only strip blink.
    const sel = voiceList.selected ?? 0;
    if (items[sel]) {
      if (sel === _hintIdx) {
        items[sel].setContent(_stripDecorations(items[sel].content, sel));
      } else {
        items[sel].setContent(_stripBlink(items[sel].content));
      }
    }
    if (_hintIdx >= 0 && _hintIdx !== sel && items[_hintIdx]) {
      items[_hintIdx].setContent(_stripDecorations(items[_hintIdx].content, _hintIdx));
    }
    _hintIdx = -1;
    _hintBase = '';
    screen.render();
  });

  // Update info panel when selection changes
  voiceList.on('select item', () => {
    if (_refreshing) return;
    _updateHint(voiceList.selected ?? 0);
    if (_vlBlink.interval) _vlTick(); // move █ to newly selected row
    const voices = _getFilteredVoices();
    const sel = voices[voiceList.selected] ?? '';
    infoLine.setContent(`  ${_formatInfoTagged(sel)}`);
    screen.render();
  });

  // Type-to-jump: press a letter to jump to first voice whose display name starts with it
  const _voiceJumpBlocked = new Set(['j', 'k', 'g', 'h', 'l', 'd', 'u']);
  voiceList.on('keypress', (ch, key) => {
    if (!ch || key.ctrl || key.meta) return;
    const lower = ch.toLowerCase();
    if (!/^[a-z]$/.test(lower)) return;
    if (_voiceJumpBlocked.has(lower)) return;
    const voices = _getFilteredVoices();
    const count = voices.length;
    if (count === 0) return;
    const start = voiceList.selected ?? 0;
    for (let i = 1; i <= count; i++) {
      const idx = (start + i) % count;
      const name = getVoiceMeta(voices[idx]).displayName.toLowerCase();
      if (name.startsWith(lower)) {
        voiceList.select(idx);
        screen.render();
        break;
      }
    }
  });

  // -------------------------------------------------------------------------
  // Button-row keyboard navigation
  // ↓ at the last list item → descend into the button row (Switch Voice gets focus first)
  // Note: Tab is NOT used — navigation.js registers screen.key(['tab']) to cycle tabs,
  // so element.key(['tab']) + screen.key(['tab']) both fire simultaneously.
  voiceList.key(['down'], () => {
    const voices = _getFilteredVoices();
    if (voiceList.selected >= voices.length - 1) {
      switchBtn.focus();
      screen.render();
    }
  });

  // ←/→ navigate between the three buttons
  switchBtn.key(['right'],    () => { favoriteBtn.focus();  screen.render(); });
  favoriteBtn.key(['right'],  () => { installBtn.focus();   screen.render(); });
  installBtn.key(['right'],   () => { switchBtn.focus();    screen.render(); });
  switchBtn.key(['left'],     () => { installBtn.focus();   screen.render(); });
  favoriteBtn.key(['left'],   () => { switchBtn.focus();    screen.render(); });
  installBtn.key(['left'],    () => { favoriteBtn.focus();  screen.render(); });

  // ↑ or Escape from any button → back to voice list
  switchBtn.key(['up', 'escape'],   () => { voiceList.focus(); screen.render(); });
  favoriteBtn.key(['up', 'escape'], () => { voiceList.focus(); screen.render(); });
  installBtn.key(['up', 'escape'],  () => { voiceList.focus(); screen.render(); });

  // -------------------------------------------------------------------------
  // Language refresh

  function refreshVoicesLabels() {
    voicesSectionHdr.setContent(`{#00897b-fg}${_tl('voicesHeader')}${'─'.repeat(58)}{/#00897b-fg}`);
    searchLabelText.setContent(_tl('searchLabel'));
    colHeaderText.setContent(`{#00897b-fg}${_tl('voicesColName').padEnd(COL_NAME_W)}{/#00897b-fg}{magenta-fg}♀{/magenta-fg}/{bright-cyan-fg}♂{/bright-cyan-fg} {#00897b-fg}${_tl('voicesColProvider')}{/#00897b-fg}`);
    voiceInfoHdr.setContent(`{#00897b-fg}${_tl('voicesInfoHeader')}${'─'.repeat(54)}{/#00897b-fg}`);
    switchBtn.setContent(_tl('voicesSwitchBtn'));
    favoriteBtn.setContent(_tl('voicesFavoriteBtn'));
    installBtn.setContent(_tl('voicesDownloadBtn'));
    screen.render();
  }

  if (languageService) {
    languageService.onChange(() => refreshVoicesLabels());
  }

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,

    show() {
      _closed = false;
      box.show();
      refreshDisplay();
      screen.render();
    },

    hide() {
      _closed = true;
      _killPlayingProcess();
      _playingVoiceId = null;
      if (_downloadProcess) { try { _downloadProcess.kill(); } catch {} _downloadProcess = null; }
      previewLine.setContent('');
      box.hide();
      screen.render();
    },

    onFocus() {
      voiceList.focus();
      screen.render();
    },

    onBlur() {
      _killPlayingProcess();
      _playingVoiceId = null;
      if (_downloadProcess) { try { _downloadProcess.kill(); } catch {} _downloadProcess = null; }
    },

    getFooterText() {
      return _tl('voicesFooter');
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
