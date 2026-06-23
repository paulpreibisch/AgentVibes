/**
 * AgentVibes TUI — Shared Widget: Background Music Track Picker
 *
 * Inline modal list for selecting background music tracks.
 * Extracted from settings-tab.js for reuse across tabs.
 * Space previews track, Enter selects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { destroyList } from './destroy-list.js';
import { BRAND_PINK } from '../brand-colors.js';
import { formatTrackName } from './format-utils.js';
import { buildAudioEnv, spawnMp3Player } from '../audio-env.js';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

const _modalTitle = (text) => ` {${BRAND_PINK}-fg}${text}{/${BRAND_PINK}-fg} `;
const _hintLabel = '{#455a64-fg}[Space] Preview  [Enter] Select  [Esc] Cancel{/#455a64-fg}';

/**
 * Open a small volume input modal (0–100).
 * Left/Right arrows adjust by 5; type a number directly; Enter confirms.
 *
 * @param {object}   screen     - blessed screen
 * @param {number}   currentVol - current volume (0-100)
 * @param {Function} onConfirm  - called with volume (number) on Enter
 * @param {Function} [onClose]  - called when modal closes (confirm or cancel)
 */
export function openVolumeInput(screen, currentVol, onConfirm, onClose) {
  if (IS_TEST) { onConfirm(currentVol ?? 70); return; }
  let vol = (Number.isFinite(currentVol) && currentVol >= 0 && currentVol <= 100)
    ? currentVol : 70;

  const box = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 44,
    height: 11,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Music Volume'),
    style: { border: { fg: 'bright-cyan' } },
  });

  blessed.text({
    parent: box,
    top: 1,
    left: 2,
    width: 38,
    tags: true,
    content: '{cyan-fg}Use ← → arrow keys to adjust volume{/cyan-fg}',
  });

  const barText = blessed.text({
    parent: box,
    top: 3,
    left: 2,
    width: 38,
    tags: true,
    content: '',
  });

  blessed.text({
    parent: box,
    top: 5,
    left: 2,
    width: 38,
    tags: true,
    content: '{white-fg}[← →] ±5  [0-9] number  [Esc] Cancel{/white-fg}',
  });

  blessed.text({
    parent: box,
    top: 7,
    left: 2,
    width: 38,
    tags: true,
    content: '{white-fg}[Enter] Confirm  then {bold}{cyan-fg}[Tab]{/cyan-fg}{/bold} → Save{/white-fg}',
  });

  function _renderBar() {
    const filled = Math.round(vol / 5);
    const empty = 20 - filled;
    const bar = '{bright-cyan-fg}' + '█'.repeat(filled) + '{/bright-cyan-fg}' +
                '{#263238-fg}' + '░'.repeat(empty) + '{/#263238-fg}';
    barText.setContent(`{white-fg}Volume:{/white-fg} ${bar} {bold}${vol}%{/bold}`);
    screen.render();
  }
  _renderBar();
  // Take focus so fieldList's key handlers don't fire while this dialog is open
  box.focus();
  screen.render();

  // Capture keypress directly on screen to avoid input mode issues
  let _digits = '';
  function _onKey(ch, key) {
    const name = key?.name ?? '';
    if (name === 'enter') { _close(true); return; }
    if (name === 'escape') { _close(false); return; }
    if (name === 'left')  { vol = Math.max(0, vol - 5);   _digits = ''; _renderBar(); return; }
    if (name === 'right') { vol = Math.min(100, vol + 5); _digits = ''; _renderBar(); return; }
    if (ch && /^[0-9]$/.test(ch)) {
      _digits += ch;
      const n = parseInt(_digits, 10);
      if (n >= 0 && n <= 100) { vol = n; _renderBar(); }
      if (_digits.length >= 3) _digits = '';
    }
  }
  screen.on('keypress', _onKey);

  function _close(confirm) {
    screen.removeListener('keypress', _onKey);
    box.destroy();
    screen.render();
    // Defer callbacks so the Enter keypress finishes propagating before fieldList
    // regains focus — otherwise the same Enter event re-opens the track picker.
    setTimeout(() => {
      if (confirm && onConfirm) onConfirm(vol);
      if (onClose) onClose();
    }, 0);
  }
}

const BUILT_IN_TRACKS = [
  { label: '🎻 Soft Flamenco',  file: 'agentvibes_soft_flamenco_loop.mp3' },
  { label: '🌸 Bossa Nova',     file: 'agent_vibes_bossa_nova_v2_loop.mp3' },
  { label: '🌊 Chillwave',      file: 'agent_vibes_chillwave_v2_loop.mp3' },
  { label: '🪘 Gnawa Ambient',  file: 'agent_vibes_ganawa_ambient_v2_loop.mp3' },
];

/**
 * Open the background music track picker modal.
 * After selecting a track, prompts for volume (0-100) via openVolumeInput.
 *
 * @param {object}   screen        - blessed screen
 * @param {string}   currentTrack  - currently selected track filename
 * @param {number}   currentVolume - currently set volume (0-100, default 70)
 * @param {Function} onSelect      - called with (trackFile, volume)
 * @param {Function} [onClose]     - called after modal fully closes
 */
export function openTrackPicker(screen, currentTrack, currentVolume, onSelect, onClose, options = {}) {
  const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
  let tracks;
  try {
    const files = fs.readdirSync(tracksDir);
    // Sort by the alphabetic part of the label (skip leading emoji/symbols)
    // so the order reflects the track NAME, not the emoji codepoint.
    const _sortKey = (s) => s.replace(/^[^a-zA-Z]+/, '');
    tracks = files
      .filter(f => /\.mp3$/i.test(f))
      .map(f => ({ file: f, label: formatTrackName(f) }))
      .sort((a, b) => _sortKey(a.label).localeCompare(_sortKey(b.label), undefined, { sensitivity: 'base' }));
  } catch {
    tracks = BUILT_IN_TRACKS;
  }

  const COLORS = {
    btnFocus: '#2e7d32',
    btnFocusFg: '#ffffff',
  };

  const items = tracks.map(t =>
    t.file === currentTrack ? `● ${t.label}` : `  ${t.label}`
  );
  const currentIdx = tracks.findIndex(t => t.file === currentTrack);

  const listHeight = Math.min(tracks.length + 6, Math.floor(screen.rows * 0.7));
  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 54,
    height: listHeight,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Select Track'),
    items,
    keys: true,
    vi: false,
    mouse: true,
    scrollable: true,
    scrollbar: { ch: '│', track: { bg: '#1e2a3a' }, style: { fg: COLORS.btnFocus } },
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  // Helper: update hint text in the bottom border label
  function _setHint(text) {
    list.setLabel({ text: _modalTitle('Select Track'), side: 'left' });
    // Use _ prefix convention for bottom border content (blessed doesn't have setFooter)
    list._label2 && list._label2.destroy();
    list._label2 = blessed.text({
      parent: list,
      bottom: -1,
      left: 1,
      width: 50,
      height: 1,
      tags: true,
      content: text,
      style: { fg: '#e3f2fd' },
    });
    screen.render();
  }

  _setHint(_hintLabel);

  if (currentIdx >= 0) list.select(currentIdx);
  list.focus();
  screen.render();

  // Preview playback state
  const _spawnEnv = buildAudioEnv();
  let _previewProc = null;
  let _previewTrackId = null;

  function _killPreview() {
    if (_previewProc) {
      _previewProc.kill();
      _previewProc = null;
    }
    _previewTrackId = null;
  }

  function _previewTrack(trackFile) {
    // Toggle off if same track
    if (_previewTrackId === trackFile) {
      _killPreview();
      _setHint(_hintLabel);
      return;
    }

    _killPreview();

    const trackPath = path.resolve(tracksDir, trackFile);
    const safeBase = path.resolve(tracksDir);
    if (!trackPath.startsWith(safeBase + path.sep) && trackPath !== safeBase) return;

    if (!fs.existsSync(trackPath)) {
      _setHint('{red-fg}Track file missing{/red-fg}');
      setTimeout(() => { _setHint(_hintLabel); }, 3000);
      return;
    }

    const proc = spawnMp3Player(trackPath, _spawnEnv);
    if (!proc) {
      _setHint('{red-fg}No MP3 player found{/red-fg}');
      setTimeout(() => { _setHint(_hintLabel); }, 3000);
      return;
    }

    _previewProc = proc;
    _previewTrackId = trackFile;

    const label = tracks.find(t => t.file === trackFile)?.label ?? trackFile;
    _setHint(`{bright-cyan-fg}♪ Previewing: ${label}  (Space to stop){/bright-cyan-fg}`);

    proc.on('exit', () => {
      if (_previewTrackId === trackFile) {
        _previewTrackId = null;
        _previewProc = null;
        _setHint(_hintLabel);
      }
    });

    proc.on('error', () => {
      _previewTrackId = null;
      _previewProc = null;
    });
  }

  function _close(callback) {
    _killPreview();
    if (list._label2) list._label2.destroy();
    if (callback) {
      callback();
      destroyList(list, screen, onClose);
    } else {
      destroyList(list, screen, onClose);
    }
  }

  // Space = preview
  list.key(['space'], () => {
    const selected = tracks[list.selected];
    if (selected) _previewTrack(selected.file);
  });

  // Enter = select track; if skipVolume, return track only, otherwise prompt for volume
  list.key(['enter'], () => {
    const selected = tracks[list.selected];
    if (!selected) return;
    _killPreview();
    if (list._label2) list._label2.destroy();
    if (options.skipVolume) {
      destroyList(list, screen, null);
      setTimeout(() => {
        onSelect(selected.file);
        if (onClose) onClose();
      }, 0);
    } else {
      destroyList(list, screen, null);
      openVolumeInput(screen, currentVolume ?? 20, (volume) => {
        onSelect(selected.file, volume);
      }, onClose);
    }
  });

  list.key(['escape', 'q', 'Q'], () => {
    _close();
  });
}
