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
import { buildAudioEnv, detectWavPlayer } from '../audio-env.js';

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
  activeFg:   '#00e5ff',  // Cyan — active voice
  favoriteFg: '#ffff00',  // Yellow — favorite star
  btnDefault: '#00695c',  // Teal — Voices tab buttons
  btnFocus:   '#00e5ff',
  btnFocusFg: '#000000',
  btnPress:   '#ff00ff',
  borderFg:   '#00897b',
  footerBg:   '#00695c',  // Teal — Voices tab footer
  noticeFg:   '#90a4ae',
  dimFg:      '#455a64',
};

const FOOTER_TEXT = '[↑↓/jk] Navigate  [Space] Preview  [Enter] Select/Install  [F] Favorite  [/] Search';
/**
 * Resolve the Piper voice storage directory using the same precedence as the
 * shell-side get_voice_storage_dir() in piper-voice-manager.sh:
 *   1. PIPER_VOICES_DIR env var
 *   2. Project-local .claude/piper-voices-dir.txt (walk up from cwd)
 *   3. Global ~/.claude/piper-voices-dir.txt
 *   4. Default ~/.claude/piper-voices
 */
function resolvePiperVoicesDir() {
  if (process.env.PIPER_VOICES_DIR) {
    return process.env.PIPER_VOICES_DIR;
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
  return path.join(os.homedir(), '.claude', 'piper-voices');
}

export const PIPER_VOICES_DIR = resolvePiperVoicesDir();

// ---------------------------------------------------------------------------
// Voice catalog — loaded from voice-assignments.json (914 voices)

let _catalogEntries = [];   // { voiceId, displayName, gender, model, type, speakerId }
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
        voiceId: `en_US-libritts-high${MS_SEP}${entry.voice_name}`,
        displayName: entry.voice_name,
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
}

/**
 * Patch the speaker_id_map in a LibriTTS .onnx.json to use friendly names
 * instead of raw corpus IDs (p3922 → Anna, p8699 → Bella, etc.).
 * Reads the catalog's index→friendly-name mapping and rebuilds the map.
 * Safe to call multiple times — skips if already patched.
 */
function patchLibriTTSSpeakerNames() {
  try {
    const jsonPath = path.join(PIPER_VOICES_DIR, 'en_US-libritts-high.onnx.json');
    if (!fs.existsSync(jsonPath)) return;
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.speaker_id_map || data.num_speakers <= 1) return;

    const names = Object.keys(data.speaker_id_map);
    // Already patched if first name doesn't start with 'p' followed by digits
    if (names.length > 0 && !/^p\d+$/.test(names[0])) return;

    // Build index → p-name reverse map
    const indexToP = {};
    for (const [pname, idx] of Object.entries(data.speaker_id_map)) {
      indexToP[idx] = pname;
    }

    // Load friendly names from catalog
    const catalogPath = path.resolve(__dirname, '..', '..', '..', 'voice-assignments.json');
    if (!fs.existsSync(catalogPath)) return;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const speakers = catalog.libritts_speakers ?? {};

    // Rebuild speaker_id_map with friendly names
    const newMap = {};
    for (const [idx, pname] of Object.entries(indexToP)) {
      const friendly = speakers[idx]?.voice_name;
      if (friendly) {
        newMap[friendly] = parseInt(idx, 10);
      } else {
        newMap[pname] = parseInt(idx, 10);
      }
    }

    data.speaker_id_map = newMap;
    // Verify file ownership before writing (security: CLAUDE.md)
    const stat = fs.statSync(jsonPath);
    if (stat.uid !== process.getuid()) return;
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  } catch { /* non-fatal */ }
}

// Column widths for the multi-column voice list
export const COL_NAME_W   = 26;
export const COL_GENDER_W = 10;

// ---------------------------------------------------------------------------
// Pure helpers — exported for testability

// Well-known piper dataset → gender
const GENDER_MAP = {
  amy: 'Female', kristin: 'Female', jenny: 'Female', cori: 'Female',
  aria: 'Female', glados: 'Female', litvyak: 'Female', hfc_female: 'Female',
  ljspeech: 'Female',
  alan: 'Male', joe: 'Male', john: 'Male', ryan: 'Male', lessac: 'Male',
  kusal: 'Male', hfc_male: 'Male', danny: 'Male', arctic: 'Male',
  l2arctic: 'Male', libritts: 'Male', libritts_r: 'Male',
  // 16Speakers multi-speaker model (names from speaker_id_map)
  cori_samuel: 'Female', kara_shallenberg: 'Female', kristin_hughes: 'Female',
  maria_kasper: 'Female', rose_ibex: 'Female', owlivia: 'Female',
  jennifer_dorr: 'Female', emily_cripps: 'Female',
  mike_pelton: 'Male', mark_nelson: 'Male', michael_scherer: 'Male',
  james_k_white: 'Male', progressingamerica: 'Male', steve_c: 'Male',
  paul_hampton: 'Male', martin_clifton: 'Male',
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
  // Lookup by dataset, name segment, or full id (for multi-speaker names)
  const key = ds || (id.split('-')[1] ?? '');
  return GENDER_MAP[key] ?? GENDER_MAP[id] ?? '—';
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
  if (voiceId.includes(MS_SEP)) {
    const [model, speakerName] = voiceId.split(MS_SEP, 2);
    const jsonPath = path.join(PIPER_VOICES_DIR, model + '.onnx.json');
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const speakerId = data.speaker_id_map?.[speakerName] ?? null;
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
  try {
    const files = fs.readdirSync(PIPER_VOICES_DIR);
    const onnxFiles = files
      .filter(f => f.endsWith('.onnx') && !f.endsWith('.onnx.json'));

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
 * Get favorites array from config.
 * @param {object} configService
 * @returns {string[]}
 */
export function getFavorites(configService) {
  const favs = configService.getConfig().favorites;
  return Array.isArray(favs) ? favs : [];
}

/**
 * Toggle a voice in the favorites list.
 * @param {object} configService
 * @param {string} voiceId
 */
export function toggleFavorite(configService, voiceId) {
  const favs = getFavorites(configService);
  const idx = favs.indexOf(voiceId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(voiceId);
  }
  configService.set('favorites', favs);
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

  const ms = parseMultiSpeaker(voiceId);
  if (ms.isMultiSpeaker) {
    const displayName = ms.speakerName.replace(/_/g, ' ');
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

  const { configService, providerService, focusMainTabBar } = services;

  // -------------------------------------------------------------------------
  // Container

  const box = blessed.box({
    parent: screen,
    top: 4,
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

  blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: `{#00897b-fg}── Voices ${'─'.repeat(58)}{/#00897b-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Search input

  blessed.text({
    parent: box,
    top: 3,
    left: 4,
    content: 'Search:',
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
      bg: '#1a237e',
      focus: { bg: '#283593' },
    },
  });

  // -------------------------------------------------------------------------
  // Column header row (sits between search and voice list border)

  blessed.text({
    parent: box,
    top: 4,
    left: 6,
    content: `{#00897b-fg}${'Name'.padEnd(COL_NAME_W)}${'Gender'.padEnd(COL_GENDER_W)}Provider{/#00897b-fg}`,
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
      selected: { bg: '#1a237e', fg: COLORS.activeFg, bold: true },
      item: { fg: COLORS.labelFg },
    },
  });

  // -------------------------------------------------------------------------
  // Info panel

  blessed.text({
    parent: box,
    top: '60%',
    left: 2,
    content: `{#00897b-fg}── Voice Info ${'─'.repeat(54)}{/#00897b-fg}`,
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
    tags: true,
    content: '',
    style: { fg: COLORS.activeFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Hint text shown in previewLine when the list has focus and nothing is playing
  const HINT_TEXT = `{${COLORS.dimFg}-fg}[Space] preview  [Enter] select as default voice{/${COLORS.dimFg}-fg}`;
  let _listFocused = false;

  // Inline selection hint appended to the currently highlighted voice row.
  // _hintBase stores the item's clean content (no hint, no █) — no sentinel needed.
  const _ROW_HINT_INSTALLED   = `  {bright-black-fg}[Space] Preview  [Enter] Select  [*] Favorite{/bright-black-fg}`;
  const _ROW_HINT_UNINSTALLED = `  {bright-yellow-fg}[Enter] Download & Install{/bright-yellow-fg}`;
  let _hintIdx  = -1;
  let _hintBase = '';   // content of items[_hintIdx] before hint was appended
  let _refreshing = false;

  function _getRowHint(idx) {
    const voices = _getFilteredVoices();
    const voiceId = voices[idx];
    if (!voiceId) return _ROW_HINT_INSTALLED;
    return _isInstalled(voiceId) ? _ROW_HINT_INSTALLED : _ROW_HINT_UNINSTALLED;
  }

  function _updateHint(idx) {
    const items = voiceList.items;
    if (_hintIdx >= 0 && _hintIdx !== idx && items[_hintIdx]) {
      const hadBlink = (items[_hintIdx].content ?? '').endsWith(' █');
      items[_hintIdx].setContent(hadBlink ? _hintBase + ' █' : _hintBase);
    }
    if (idx >= 0 && items[idx]) {
      let c = items[idx].content ?? '';
      const hasBlink = c.endsWith(' █');
      if (hasBlink) c = c.slice(0, -2);
      _hintBase = c;
      items[idx].setContent(c + _getRowHint(idx) + (hasBlink ? ' █' : ''));
    } else {
      _hintBase = '';
    }
    _hintIdx = idx;
  }

  // -------------------------------------------------------------------------
  // Playback state

  let _playingProcess = null;
  let _playingVoiceId = null;

  // Kill the entire process group so child audio players (piper, aplay, play) all die
  function _killPlayingProcess() {
    if (_playingProcess) {
      try { process.kill(-_playingProcess.pid, 'SIGTERM'); } catch {}
      _playingProcess = null;
    }
  }

  const _spawnEnv = buildAudioEnv();

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

    // Resolve model path (may be multi-speaker)
    const ms = parseMultiSpeaker(voiceId);
    const voicePath = path.resolve(PIPER_VOICES_DIR, ms.model + '.onnx');
    const safeBase = path.resolve(PIPER_VOICES_DIR);
    if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) {
      return;
    }

    const tempWav = path.join(os.tmpdir(), `agentvibes-preview-${Date.now()}.wav`);
    const phrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];

    // Synthesize: spawn piper in its own process group; pass text via stdin with newline
    const piperArgs = ['--model', voicePath, '--output_file', tempWav];
    if (ms.speakerId != null) piperArgs.push('--speaker', String(ms.speakerId));
    const piper = spawn('piper', piperArgs, {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached: true,
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

      // Play the synthesized wav in its own process group so we can kill it
      const _wavP = detectWavPlayer(_spawnEnv);
      if (!_wavP) return;
      const playProc = spawn(_wavP.bin, _wavP.args(tempWav), {
        stdio: 'ignore',
        detached: true,
        env: _spawnEnv,
      });
      _playingProcess = playProc;

      previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Playing: ${voiceId}  (Enter/Space to stop){/${COLORS.activeFg}-fg}`);
      screen.render();

      playProc.on('exit', () => {
        if (_playingVoiceId === voiceId) {
          _playingVoiceId = null;
          _playingProcess = null;
          previewLine.setContent(_listFocused ? HINT_TEXT : '');
          refreshDisplay(); // clears (playing) label
        }
        try { fs.unlinkSync(tempWav); } catch {}
      });

      playProc.on('error', () => {
        _playingVoiceId = null;
        _playingProcess = null;
        previewLine.setContent(_listFocused ? HINT_TEXT : '');
        try { fs.unlinkSync(tempWav); } catch {}
      });
    });

    piper.on('error', () => {
      _playingVoiceId = null;
      _playingProcess = null;
      previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Cannot find piper — install with: pipx install piper-tts{/${COLORS.activeFg}-fg}`);
      screen.render();
      setTimeout(() => { previewLine.setContent(_listFocused ? HINT_TEXT : ''); screen.render(); }, 4000);
    });
  }

  // -------------------------------------------------------------------------
  // Voice activation (handles multi-speaker model/speaker-id files)

  function _activateVoice(voiceId) {
    const ms = parseMultiSpeaker(voiceId);
    const claudeDir = path.resolve(process.cwd(), '.claude');
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
        fg: 'white',
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
      btn.style.fg = 'white';
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

  const switchBtn = _createBtn('[Switch Voice]', () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      _activateVoice(selected);
      refreshDisplay();
    }
  });
  switchBtn.bottom = 4;
  switchBtn.left = 4;

  const favoriteBtn = _createBtn('[★ Favorite]', () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      toggleFavorite(configService, selected);
      refreshDisplay();
    }
  });
  favoriteBtn.bottom = 4;
  favoriteBtn.left = 22;

  const installBtn = _createBtn('[Download Voice]', () => {
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

  function _openSelectVoiceModal(voiceId) {
    const { displayName } = getVoiceMeta(voiceId);

    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 60,
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
      content: `{${COLORS.dimFg}-fg}Press Preview to audition this voice{/${COLORS.dimFg}-fg}`,
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

    function _makeBtn(label, bg, left, onClick) {
      const btn = blessed.button({
        parent: modal,
        content: label,
        top: 5,
        left,
        mouse: true,
        keys: true,
        shrink: true,
        padding: { left: 1, right: 1 },
        style: {
          bg,
          fg: 'white',
          focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
          hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        },
      });
      btn.key(['enter', 'space'], () => { _close(); onClick(); });
      btn.on('click', () => btn.press());
      return btn;
    }

    const okBtn     = _makeBtn('OK — Set Voice', COLORS.btnDefault, 2,  () => {
      _activateVoice(voiceId);
      refreshDisplay();
      _showVoiceChangedNotice(displayName);
    });
    const cancelBtn = _makeBtn('Cancel',         '#546e7a',         20, () => {});

    // Preview button — does NOT close the modal; plays/stops the voice inline
    const previewBtn = blessed.button({
      parent: modal,
      content: 'Preview',
      top: 5,
      left: 33,
      mouse: true,
      keys: true,
      shrink: true,
      padding: { left: 1, right: 1 },
      style: {
        bg: '#e65100',
        fg: 'white',
        focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      },
    });
    previewBtn.key(['enter', 'space'], () => {
      const isPlaying = _playingVoiceId === voiceId;
      _previewVoice(voiceId);
      modalStatus.setContent(isPlaying
        ? `{${COLORS.dimFg}-fg}Stopped.{/${COLORS.dimFg}-fg}`
        : `{${COLORS.activeFg}-fg}♪ Playing: ${displayName}…{/${COLORS.activeFg}-fg}`
      );
      screen.render();
    });
    previewBtn.on('click', () => previewBtn.press());

    // Tab/arrow navigation: OK → Cancel → Preview → OK
    okBtn.key(['tab', 'right'],         () => { cancelBtn.focus();  screen.render(); });
    cancelBtn.key(['tab', 'right'],     () => { previewBtn.focus(); screen.render(); });
    previewBtn.key(['tab', 'right'],    () => { okBtn.focus();      screen.render(); });
    previewBtn.key(['left'],            () => { cancelBtn.focus();  screen.render(); });
    cancelBtn.key(['left'],             () => { okBtn.focus();      screen.render(); });
    okBtn.key(['left'],                 () => { previewBtn.focus(); screen.render(); });

    modal.key(['escape', 'q'], _close);

    modal.setFront();
    okBtn.focus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Download modal for uninstalled catalog voices

  function _openDownloadModal(voiceId) {
    const cat = _catalogEntries.find(c => c.voiceId === voiceId);
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
      statusLine.setContent(`{${COLORS.activeFg}-fg}⬇ Downloading ${modelToDownload}…{/${COLORS.activeFg}-fg}`);
      screen.render();

      // Use piper-voice-manager.sh download_voice function
      const managerScript = path.resolve(process.cwd(), '.claude', 'hooks', 'piper-voice-manager.sh');
      const downloadCmd = `source "${managerScript}" && download_voice "${modelToDownload}"`;
      const dlProc = spawn('bash', ['-c', downloadCmd], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: _spawnEnv,
      });

      let output = '';
      dlProc.stdout.on('data', (d) => { output += d.toString(); });
      dlProc.stderr.on('data', (d) => { output += d.toString(); });

      dlProc.on('exit', (code) => {
        _downloading = false;
        if (code === 0) {
          // Patch speaker names for freshly downloaded LibriTTS model
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
        _downloading = false;
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
          fg: 'white',
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

    modal.key(['escape', 'q'], () => { if (!_downloading) _close(); });

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
      const cat = _catalogEntries.find(c => c.voiceId === v);
      if (cat && cat.displayName.toLowerCase().includes(f)) return true;
      return false;
    });
  }

  function _isInstalled(voiceId) {
    return _installedSet.has(voiceId);
  }

  function _buildListItems(voices, active, favorites) {
    return voices.map(v => {
      const installed = _isInstalled(v);
      const isFav    = favorites.includes(v);
      const isActive = v === active;
      const isPrev   = v === _playingVoiceId;
      const star = isFav  ? '★' : ' ';
      const dot  = isPrev ? '♪' : (isActive ? '{green-fg}✓{/green-fg}' : ' ');

      let displayName, gender, provider;
      if (installed) {
        const meta = getVoiceMeta(v);
        displayName = meta.displayName;
        gender = meta.gender;
        provider = meta.provider;
      } else {
        // Catalog-only voice — use catalog metadata
        const cat = _catalogEntries.find(c => c.voiceId === v);
        displayName = cat?.displayName ?? v;
        gender = cat?.gender ?? '—';
        provider = cat?.type === 'libritts' ? 'Piper (LibriTTS)' : 'Piper';
      }

      const name = displayName.length > COL_NAME_W
        ? displayName.slice(0, COL_NAME_W - 1) + '…'
        : displayName.padEnd(COL_NAME_W);

      if (!installed) {
        // Greyed-out row for uninstalled catalog voices
        return `{bright-black-fg} ${star}  ${name}${gender.padEnd(COL_GENDER_W)}${provider}{/bright-black-fg}`;
      }
      return ` ${star}${dot} ${name}${gender.padEnd(COL_GENDER_W)}${provider}${isPrev ? ' (playing)' : ''}`;
    });
  }

  // Build a tagged info string with yellow labels for the info panel
  function _formatInfoTagged(voiceId) {
    const Y = COLORS.valueFg;  // #ffd700 yellow

    // Uninstalled catalog voice — show download prompt
    if (!_isInstalled(voiceId)) {
      const cat = _catalogEntries.find(c => c.voiceId === voiceId);
      const name = cat?.displayName ?? voiceId;
      const gender = cat?.gender ?? '—';
      const model = cat?.type === 'libritts' ? 'LibriTTS High (multi-speaker)' : (cat?.model ?? voiceId);
      return `{${Y}-fg}Voice:{/${Y}-fg} ${name}  ` +
             `{${Y}-fg}Gender:{/${Y}-fg} ${gender}  ` +
             `{${Y}-fg}Model:{/${Y}-fg} ${model}  ` +
             `{bright-yellow-fg}⬇ Press [Enter] to download and install{/bright-yellow-fg}`;
    }

    const ms = parseMultiSpeaker(voiceId);
    if (ms.isMultiSpeaker) {
      const name = ms.speakerName.replace(/_/g, ' ');
      return `{${Y}-fg}Speaker:{/${Y}-fg} ${name}  ` +
             `{${Y}-fg}Model:{/${Y}-fg} ${ms.model}  ` +
             `{${Y}-fg}Speaker ID:{/${Y}-fg} ${ms.speakerId ?? '?'}  ` +
             `{${Y}-fg}Provider:{/${Y}-fg} Piper`;
    }
    const { lang, name, quality } = parseVoiceId(voiceId);
    if (lang === 'unknown') {
      return `{${Y}-fg}Voice:{/${Y}-fg} ${voiceId}  {${Y}-fg}Provider:{/${Y}-fg} Piper`;
    }
    return `{${Y}-fg}Voice:{/${Y}-fg} ${name}  ` +
           `{${Y}-fg}Language:{/${Y}-fg} ${lang}  ` +
           `{${Y}-fg}Quality:{/${Y}-fg} ${quality}  ` +
           `{${Y}-fg}Provider:{/${Y}-fg} Piper  ` +
           `{${Y}-fg}ID:{/${Y}-fg} ${voiceId}`;
  }

  function refreshDisplay() {
    _refreshing = true;
    const savedIdx = voiceList.selected ?? 0;

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
    const filtered = _getFilteredVoices();
    const items = _buildListItems(filtered, active, favorites);

    voiceList.setItems(items.length > 0 ? items : [' (no voices found — install piper first)']);
    const maxIdx = Math.max(0, (items.length > 0 ? items.length : 1) - 1);
    voiceList.select(Math.min(savedIdx, maxIdx));

    // Re-apply inline hint if list is focused
    if (_listFocused) {
      _hintIdx = -1;
      _hintBase = '';
      _updateHint(voiceList.selected ?? 0);
    }

    // Update info panel for currently selected item
    const sel = filtered[voiceList.selected] ?? active ?? '';
    infoLine.setContent(`  ${_formatInfoTagged(sel)}`);

    _refreshing = false;
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

  // Pressing '/' in voiceList focuses search box
  voiceList.key(['/'], () => {
    searchBox.clearValue();
    searchBox.focus();
    screen.render();
  });

  // ↑ at the top of the list → jump to main header tab bar
  voiceList.key(['up'], () => {
    if (voiceList.selected === 0 && typeof focusMainTabBar === 'function') {
      focusMainTabBar();
      // Reset selection to 0 after built-in handler potentially wraps to end
      setTimeout(() => { voiceList.select(0); screen.render(); }, 0);
    }
  });

  // Escape at the list level → return to header tab bar
  voiceList.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
  });

  // 'f' or '*' in voiceList toggles favorite
  voiceList.key(['f', '*'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      toggleFavorite(configService, selected);
      refreshDisplay();
    }
  });

  // Space → preview voice (toggle: second press stops playback)
  // Only works for installed voices — uninstalled need download first
  voiceList.key(['space'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (!selected) return;
    if (!_isInstalled(selected)) {
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

    if (_isInstalled(selected)) {
      _openSelectVoiceModal(selected);
    } else {
      _openDownloadModal(selected);
    }
  });

  // Blinking █ on selected row while list is focused
  let _vlBlink = { interval: null, on: false, sel: -1 };
  function _vlTick() {
    _vlBlink.on = !_vlBlink.on;
    const items = voiceList.items;
    const cur = voiceList.selected ?? 0;
    if (_vlBlink.sel !== cur && _vlBlink.sel >= 0 && items[_vlBlink.sel]) {
      items[_vlBlink.sel].setContent((items[_vlBlink.sel].content ?? '').replace(/ █$/, ''));
    }
    _vlBlink.sel = cur;
    if (items[cur]) {
      const base = (items[cur].content ?? '').replace(/ █$/, '');
      items[cur].setContent(_vlBlink.on ? `${base} █` : base);
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
    if (items[_vlBlink.sel]) items[_vlBlink.sel].setContent((items[_vlBlink.sel].content ?? '') + ' █');
    if (!_playingVoiceId) previewLine.setContent(HINT_TEXT);
    screen.render();
    _vlBlink.interval = setInterval(_vlTick, 500);
  });
  voiceList.on('blur', () => {
    _listFocused = false;
    if (!_playingVoiceId) previewLine.setContent('');
    if (_vlBlink.interval) { clearInterval(_vlBlink.interval); _vlBlink.interval = null; }
    const items = voiceList.items;
    const sel = voiceList.selected ?? 0;
    if (items[sel]) {
      items[sel].setContent(sel === _hintIdx ? _hintBase : (items[sel].content ?? '').replace(/ █$/, ''));
    }
    if (_hintIdx >= 0 && _hintIdx !== sel && items[_hintIdx]) {
      items[_hintIdx].setContent(_hintBase);
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
  const _voiceJumpBlocked = new Set(['j', 'k', 'g', 'h', 'l', 'd', 'u', 'f']);
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
  // Tab Component Contract

  return {
    box,

    show() {
      box.show();
      refreshDisplay();
      screen.render();
    },

    hide() {
      _killPlayingProcess();
      _playingVoiceId = null;
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
    },

    getFooterText() {
      return FOOTER_TEXT;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
