/**
 * AgentVibes TUI — Shared Widget: Audio Effects Picker
 *
 * Multi-select modal: pick reverb, echo, and chorus independently (combinable).
 * Space = preview highlighted effect on a test tone (sox required).
 * Enter = toggle selection for that category, c = apply, Esc = cancel.
 */

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import { destroyList } from './destroy-list.js';
import { renderHelpBar, selectorTitle } from './help-bar.js';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ── Effect category definitions ───────────────────────────────────────────────

const EFFECT_CATEGORIES = [
  {
    id: 'reverb',
    label: 'Reverb',
    defaultValue: 'off-reverb',
    items: [
      { label: 'Off  (no reverb)',            value: 'off-reverb'   },
      { label: 'Light Reverb  (small room)',  value: 'light'        },
      { label: 'Medium Reverb  (conference)', value: 'medium'       },
      { label: 'Heavy Reverb  (large hall)',  value: 'heavy'        },
      { label: 'Cathedral  (epic space)',     value: 'cathedral'    },
    ],
  },
  {
    id: 'echo',
    label: 'Echo',
    defaultValue: 'off-echo',
    items: [
      { label: 'Off  (no echo)',              value: 'off-echo'     },
      { label: 'Echo  (short delay)',         value: 'echo-short'   },
      { label: 'Cave Echo  (long)',           value: 'echo-long'    },
    ],
  },
  {
    id: 'chorus',
    label: 'Chorus',
    defaultValue: 'off-chorus',
    items: [
      { label: 'Off  (no chorus)',            value: 'off-chorus'   },
      { label: 'Light Chorus',                value: 'chorus-light' },
      { label: 'Deep Chorus',                 value: 'chorus-deep'  },
    ],
  },
];

// Character presets are compound — selecting one replaces all category selections
const CHARACTER_PRESETS = [
  { label: 'Warm  (reverb + bass)',           value: 'warm'         },
  { label: 'Radio  (EQ + overdrive)',         value: 'radio'        },
];

// ── REVERB_PRESETS (backward-compat flat export) ──────────────────────────────

export const REVERB_PRESETS = Object.freeze([
  { label: 'Off  (no effects)',               value: 'off'          },
  { label: 'Off  (no reverb)',                value: 'off-reverb'   },
  { label: 'Off  (no echo)',                  value: 'off-echo'     },
  { label: 'Off  (no chorus)',                value: 'off-chorus'   },
  ...EFFECT_CATEGORIES.flatMap(cat => cat.items.filter(i => !i.value.startsWith('off-'))),
  ...CHARACTER_PRESETS,
]);

export const AUDIO_EFFECT_PRESETS = REVERB_PRESETS;

// ── Label helper ──────────────────────────────────────────────────────────────

/**
 * Format a stored effect value for display.
 * Handles single values ('light') and combined values ('light+echo-short').
 */
export function formatEffectLabel(value) {
  if (!value || value === 'off') return 'Off';
  return value.split('+')
    .map(v => {
      const p = REVERB_PRESETS.find(r => r.value === v.trim());
      return p ? p.label.replace(/\s{2,}/g, ' ').trim() : v.trim();
    })
    .join(' + ');
}

// ── Parse stored value → selections Map ──────────────────────────────────────

function parseEffectValue(value) {
  const sel = new Map();
  for (const cat of EFFECT_CATEGORIES) sel.set(cat.id, cat.defaultValue);
  sel.set('character', null);

  if (!value || value === 'off') return sel;

  for (const part of value.split('+').map(s => s.trim()).filter(Boolean)) {
    if (CHARACTER_PRESETS.find(p => p.value === part)) {
      for (const cat of EFFECT_CATEGORIES) sel.set(cat.id, cat.defaultValue);
      sel.set('character', part);
      return sel;
    }
    for (const cat of EFFECT_CATEGORIES) {
      if (cat.items.find(item => item.value === part)) {
        sel.set(cat.id, part);
        break;
      }
    }
  }
  return sel;
}

// ── Serialize selections Map → stored value ───────────────────────────────────

function serializeSelections(sel) {
  const charVal = sel.get('character');
  if (charVal) return charVal;
  const parts = [];
  for (const cat of EFFECT_CATEGORIES) {
    const v = sel.get(cat.id);
    if (v && !v.startsWith('off-')) parts.push(v);
  }
  return parts.length ? parts.join('+') : 'off';
}

// ── TTS + effect preview ──────────────────────────────────────────────────────

function previewEffectWithVoice(effectValue, phrase, opts, onDone) {
  if (IS_TEST) return;
  stopPreview();
  const playTts = path.join(opts.previewHooksDir, 'play-tts.sh');
  if (!fs.existsSync(playTts)) { previewEffect(effectValue); onDone?.(); return; }

  const env = { ...process.env, AGENTVIBES_REVERB_OVERRIDE: effectValue, AGENTVIBES_EFFECTS_PREVIEW: '1' };
  if (opts.previewTargetDir) env.CLAUDE_PROJECT_DIR = opts.previewTargetDir;
  // Force a specific synth provider when the caller knows it (e.g. ElevenLabs),
  // so the orchestrator doesn't fall back to the global provider.
  if (opts.previewForceProvider) env.AGENTVIBES_FORCE_PROVIDER = opts.previewForceProvider;

  // On Windows, a bare 'bash' resolves to WSL (no audio/key access); the caller
  // passes the real git-bash path via previewBashBin.
  const bashBin = opts.previewBashBin || 'bash';
  const args = [bashBin, playTts, phrase];
  if (opts.previewLlmKey) args.push('--llm', opts.previewLlmKey, '--project-dir', opts.previewTargetDir || '');
  // Pass voice explicitly so the preview uses the current voice, not the LLM row's default
  if (opts.previewVoice) args.push(opts.previewVoice);

  _previewProc = spawn(args[0], args.slice(1), { stdio: 'ignore', env });
  if (_previewProc) {
    _previewProc.on('close', () => { _previewProc = null; onDone?.(); });
    _previewProc.on('error', () => { _previewProc = null; onDone?.(); });
  }
}

// ── Sox effect preview ────────────────────────────────────────────────────────

const SOX_EFFECT_MAP = {
  'off': '', 'off-reverb': '', 'off-echo': '', 'off-chorus': '',
  'light':        'reverb 20 50 50',
  'medium':       'reverb 40 50 70',
  'heavy':        'reverb 70 50 100',
  'cathedral':    'reverb 90 30 100',
  'chorus-light': 'chorus 0.7 0.9 55 0.4 0.25 2 -t',
  'chorus-deep':  'chorus 0.8 0.9 55 0.4 0.25 2 -t chorus 0.8 0.9 44 0.4 0.2 2.3 -t',
  'echo-short':   'echo 0.8 0.6 60 0.4',
  'echo-long':    'echo 0.8 0.7 100 0.5 200 0.3',
  'warm':         'bass 5 reverb 30 50 60',
  'radio':        'highpass 300 treble 5 gain -3 overdrive 10 gain -3',
};

let _previewProc = null;

function stopPreview() {
  if (_previewProc && !_previewProc.killed) {
    try { _previewProc.kill(); } catch {}
  }
  _previewProc = null;
}

function previewEffect(effectValue) {
  if (IS_TEST || (process.platform === 'win32' && !process.env.WSL_DISTRO_NAME)) return;

  stopPreview();

  const soxFx = SOX_EFFECT_MAP[effectValue] ?? '';
  const pid = process.pid;
  const tmpDir = os.tmpdir();
  const tonePath = path.join(tmpDir, `av-tone-${pid}.wav`);
  const prevPath = path.join(tmpDir, `av-prev-${pid}.wav`);

  const cleanup = () => {
    try { if (fs.existsSync(tonePath)) fs.unlinkSync(tonePath); } catch {}
    try { if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath); } catch {}
  };

  const doPlay = (file) => {
    // S4036: 'play'/'sox' are standard SoX tools on the user's local PATH; absolute
    // paths aren't portable across distros/Homebrew. Risk accepted.
    _previewProc = spawn('play', [file], { stdio: 'ignore' }); // NOSONAR
    _previewProc.on('error', cleanup);
    _previewProc.on('close', () => { _previewProc = null; cleanup(); });
  };

  // Generate a two-octave harmonic tone (~1s) — richer than pure sine for hearing effects
  const gen = spawn('sox', [ // NOSONAR — see S4036 note above
    '-n', '-r', '44100', '-c', '1', tonePath,
    'synth', '1.0', 'sine', '220', 'sine', '440',
    'gain', '-n', '-6',
  ], { stdio: 'ignore' });

  _previewProc = gen;
  gen.on('error', cleanup);
  gen.on('close', (code) => {
    if (code !== 0 || !fs.existsSync(tonePath)) { cleanup(); return; }
    if (!soxFx) { doPlay(tonePath); return; }

    const fxProc = spawn('sox', [tonePath, prevPath, ...soxFx.split(/\s+/).filter(Boolean)], { stdio: 'ignore' }); // NOSONAR — see S4036 note above
    _previewProc = fxProc;
    fxProc.on('error', () => doPlay(tonePath));
    fxProc.on('close', (c) => {
      if (c === 0 && fs.existsSync(prevPath)) doPlay(prevPath);
      else doPlay(tonePath);
    });
  });
}

// ── Build flat items list for the blessed list widget ─────────────────────────

function buildFlatItems() {
  const items = [];
  items.push({ isHelp: true, label: renderHelpBar([
    { key: 'Space', label: 'test' },
    { key: 'Enter', label: 'toggle' },
    { key: 'A', label: 'apply' },
    { key: 'Esc', label: 'cancel' },
  ]) });
  items.push({ isSpacer: true, label: '' });
  for (const cat of EFFECT_CATEGORIES) {
    items.push({ isHeader: true, label: `── ${cat.label} ` });
    for (const item of cat.items) items.push({ category: cat.id, ...item });
  }
  items.push({ isHeader: true, label: '── Character  (compound presets) ' });
  for (const item of CHARACTER_PRESETS) items.push({ category: 'character', ...item });
  // Top padding so the Apply button isn't hunched against the last option. The
  // button is the LAST row so pressing Down to the bottom always lands on it.
  items.push({ isSpacer: true, label: '' });
  items.push({ isApply: true, label: '✓  Apply effects' });
  return items;
}

const FLAT_ITEMS = buildFlatItems();

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Open the multi-select audio effects picker.
 * API-compatible with the old single-select openReverbPicker.
 * currentPreset and onSelect(value) now support combined values like 'light+echo-short'.
 *
 * @param {object}   screen        - blessed screen
 * @param {string}   currentPreset - current effect value (single or '+'-combined)
 * @param {Function} onSelect      - called with the new combined effect value
 * @param {Function} [onClose]     - called after modal closes
 * @param {object}   [opts]
 * @param {boolean}  [opts.applyToEffectsManager=true]
 */
export function openReverbPicker(screen, currentPreset, onSelect, onClose, opts = {}) {
  const applyToEffectsManager = opts.applyToEffectsManager !== false;
  const selections = parseEffectValue(currentPreset);
  const WIDTH = 52;
  const HEIGHT = Math.min(FLAT_ITEMS.length + 4, Math.max(20, (screen.height || 24) - 2));

  let _previewIdx = -1;
  let _spinFrame = 0;
  const _SPIN = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  // Tracked selection index so the Apply button (whose solid bg overrides
  // blessed's row highlight) can render a distinct focused state.
  let _selIdx = 0;
  const _applyIdx = FLAT_ITEMS.findIndex(it => it.isApply);

  const renderItems = () => FLAT_ITEMS.map((item, idx) => {
    if (item.isSpacer) return '';
    if (item.isHelp) return ` ${item.label}`;
    if (item.isHeader) {
      const fill = Math.max(0, WIDTH - 6 - item.label.length);
      return `{#90a4ae-fg}${item.label}${'─'.repeat(fill)}{/#90a4ae-fg}`;
    }
    if (item.isLegend) return `{#90a4ae-fg}${item.label}{/#90a4ae-fg}`;
    if (item.isApply) {
      const btn = '  ✓  Apply effects  ';
      const pad = ' '.repeat(Math.max(0, Math.floor((WIDTH - 4 - btn.length) / 2)));
      // Bright + arrows when focused, dim when not — so navigating to it is obvious.
      return idx === _selIdx
        ? `${pad}{#43a047-bg}{white-fg}{bold}▸${btn}◂{/bold}{/white-fg}{/#43a047-bg}`
        : `${pad}{#1b3a1f-bg}{#81c784-fg} ${btn} {/#81c784-fg}{/#1b3a1f-bg}`;
    }
    const isSel = item.category === 'character'
      ? selections.get('character') === item.value
      : selections.get(item.category) === item.value;
    const dot = isSel ? '{green-fg}●{/green-fg}' : '{#546e7a-fg}○{/#546e7a-fg}';
    const spin = idx === _previewIdx ? ` {cyan-fg}${_SPIN[_spinFrame % _SPIN.length]}{/cyan-fg}` : '';
    return ` ${dot}  ${item.label}${spin}`;
  });

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: WIDTH,
    height: HEIGHT,
    border: { type: 'line' },
    tags: true,
    label: selectorTitle('Audio Effects'),
    items: renderItems(),
    keys: false,
    vi: false,
    mouse: true,
    scrollable: true,
    scrollbar: { ch: '▐', style: { fg: '#2e7d32' } },
    style: {
      border: { fg: '#2e7d32' },
      selected: { bg: '#1b3a1f', fg: '#e3f2fd' },
      item: { fg: '#e3f2fd' },
    },
  });

  // Position cursor at first active (non-off) selection, or first selectable item
  let initialIdx = FLAT_ITEMS.findIndex(item =>
    item.category &&
    (item.category === 'character'
      ? selections.get('character') === item.value
      : selections.get(item.category) === item.value && !item.value.startsWith('off-'))
  );
  if (initialIdx < 0) initialIdx = FLAT_ITEMS.findIndex(item => item.category);

  _selIdx = Math.max(0, initialIdx);
  list.select(_selIdx);
  list.focus();
  screen.render();

  const _refresh = () => {
    const cur = list.selected;
    _selIdx = cur;
    list.setItems(renderItems());
    list.select(cur);
    screen.render();
  };

  let _spinInterval = null;

  const _stopSpinner = () => {
    if (_spinInterval) { clearInterval(_spinInterval); _spinInterval = null; }
    if (_previewIdx >= 0) {
      const prevIdx = _previewIdx;
      _previewIdx = -1;
      list.setItem(prevIdx, renderItems()[prevIdx]);
      screen.render();
    }
    _previewIdx = -1;
  };

  const _startSpinner = (idx) => {
    _stopSpinner();
    _previewIdx = idx;
    _spinFrame = 0;
    _spinInterval = setInterval(() => {
      _spinFrame++;
      // Update only the spinning item — avoids full-list redraw flashing
      list.setItem(_previewIdx, renderItems()[_previewIdx]);
      screen.render();
    }, 80);
  };

  const _confirm = () => {
    _stopSpinner();
    const val = serializeSelections(selections);
    if (applyToEffectsManager) {
      const isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      if (!isWin) {
        const effectsScript = path.join(process.cwd(), '.claude', 'hooks', 'effects-manager.sh');
        spawnSync('bash', [effectsScript, 'set-reverb', val, 'default'], { // NOSONAR
          stdio: 'ignore', timeout: 5000, env: { ...process.env },
        });
      }
    }
    stopPreview();
    onSelect(val);
    destroyList(list, screen, onClose);
  };

  list.key('enter', () => {
    const item = FLAT_ITEMS[list.selected];
    if (!item || item.isHeader || item.isLegend || item.isHelp || item.isSpacer) return;
    if (item.isApply) { _confirm(); return; }

    if (item.category === 'character') {
      // Toggle: selecting same character preset again turns it off
      if (selections.get('character') === item.value) {
        selections.set('character', null);
      } else {
        // Character presets clear individual category selections
        for (const cat of EFFECT_CATEGORIES) selections.set(cat.id, cat.defaultValue);
        selections.set('character', item.value);
      }
    } else {
      // Selecting a category item clears any active character preset
      selections.set('character', null);
      selections.set(item.category, item.value);
    }
    _refresh();
  });

  list.key('space', () => {
    const idx = list.selected;
    const item = FLAT_ITEMS[idx];
    if (!item || item.isHeader || item.isLegend || item.isApply || item.isHelp || item.isSpacer) return;
    if (opts.previewHooksDir) {
      const name = item.label.replace(/\s{2,}\(.*?\)\s*$/, '').trim();
      _startSpinner(idx);
      previewEffectWithVoice(item.value, `Testing ${name}.`, opts, _stopSpinner);
    } else {
      previewEffect(item.value);
    }
  });

  list.key(['a', 'A', 'c', 'C'], _confirm);

  // Navigation skips decoration (headers, spacers, help) so arrow keys move only
  // between real options and the Apply button — Down to the bottom always lands
  // on Apply. (keys:false above disables blessed's built-in nav so we own it.)
  const _isSelectable = (i) => {
    const it = FLAT_ITEMS[i];
    return Boolean(it && (it.category || it.isApply));
  };
  // Select row i and repaint the Apply button so its focused/dim state follows.
  const _selectRow = (i) => {
    _selIdx = i;
    list.select(i);
    if (_applyIdx >= 0) list.setItem(_applyIdx, renderItems()[_applyIdx]);
    screen.render();
  };
  const _move = (dir) => {
    let i = list.selected;
    do { i += dir; } while (i >= 0 && i < FLAT_ITEMS.length && !_isSelectable(i));
    if (i >= 0 && i < FLAT_ITEMS.length && _isSelectable(i)) _selectRow(i);
  };
  const _jump = (dir) => {
    const idx = dir > 0
      ? FLAT_ITEMS.map((_, i) => i).reverse().find(_isSelectable)
      : FLAT_ITEMS.findIndex((_, i) => _isSelectable(i));
    if (idx >= 0) _selectRow(idx);
  };
  list.key(['down', 'j'], () => _move(1));
  list.key(['up', 'k'], () => _move(-1));
  list.key(['home'], () => _jump(-1));
  list.key(['end'], () => _jump(1)); // jump straight to Apply

  list.key(['escape', 'q', 'Q'], () => {
    _stopSpinner();
    stopPreview();
    destroyList(list, screen, onClose);
  });
}
