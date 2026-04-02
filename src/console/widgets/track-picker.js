/**
 * AgentVibes TUI — Shared Widget: Background Music Track Picker
 *
 * Inline modal list for selecting background music tracks.
 * Extracted from settings-tab.js for reuse across tabs.
 * Space previews track, Enter selects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { destroyList } from './destroy-list.js';
import { BRAND_PINK } from '../brand-colors.js';
import { formatTrackName } from './format-utils.js';
import { buildAudioEnv, detectMp3Player } from '../audio-env.js';

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
    width: 38,
    height: 8,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Music Volume'),
    style: { border: { fg: 'bright-cyan' } },
  });

  const barText = blessed.text({
    parent: box,
    top: 1,
    left: 2,
    width: 32,
    tags: true,
    content: '',
  });

  const hint = blessed.text({
    parent: box,
    top: 5,
    left: 1,
    width: 34,
    tags: true,
    content: '{#455a64-fg}[←→] ±5  [1-9] type  [Enter] OK  [Esc] Cancel{/#455a64-fg}',
  });

  function _renderBar() {
    const filled = Math.round(vol / 5);
    const empty = 20 - filled;
    const bar = '{bright-cyan-fg}' + '█'.repeat(filled) + '{/bright-cyan-fg}' +
                '{#263238-fg}' + '░'.repeat(empty) + '{/#263238-fg}';
    barText.setContent(`{#90a4ae-fg}Volume:{/#90a4ae-fg} ${bar} {bold}${vol}%{/bold}`);
    screen.render();
  }
  _renderBar();

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
    if (confirm && onConfirm) onConfirm(vol);
    if (onClose) onClose();
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
export function openTrackPicker(screen, currentTrack, currentVolume, onSelect, onClose) {
  const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
  let tracks;
  try {
    const files = fs.readdirSync(tracksDir);
    tracks = files
      .filter(f => /\.mp3$/i.test(f))
      .sort()
      .map(f => ({ file: f, label: formatTrackName(f) }));
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
  const _mp3Player = detectMp3Player(_spawnEnv);
  let _previewProc = null;
  let _previewTrackId = null;

  function _killPreview() {
    if (_previewProc) {
      const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      if (_isWin) {
        try { _previewProc.kill(); } catch {}
      } else {
        try { process.kill(-_previewProc.pid, 'SIGTERM'); } catch {}
      }
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

    if (!_mp3Player || !fs.existsSync(trackPath)) {
      _setHint('{red-fg}No MP3 player found or track missing{/red-fg}');
      setTimeout(() => {
        _setHint(_hintLabel);
      }, 3000);
      return;
    }

    _previewProc = spawn(_mp3Player.bin, _mp3Player.args(trackPath), {
      stdio: 'ignore', detached: true, env: _spawnEnv,
    });
    _previewTrackId = trackFile;

    const label = tracks.find(t => t.file === trackFile)?.label ?? trackFile;
    _setHint(`{bright-cyan-fg}♪ Previewing: ${label}  (Space to stop){/bright-cyan-fg}`);

    _previewProc.on('exit', () => {
      if (_previewTrackId === trackFile) {
        _previewTrackId = null;
        _previewProc = null;
        _setHint(_hintLabel);
      }
    });

    _previewProc.on('error', () => {
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

  // Enter = select track, then prompt for volume
  list.key(['enter'], () => {
    const selected = tracks[list.selected];
    if (!selected) return;
    // Close the track list first (without firing onClose yet), then open volume input
    _killPreview();
    if (list._label2) list._label2.destroy();
    destroyList(list, screen, null);
    openVolumeInput(screen, currentVolume ?? 20, (volume) => {
      onSelect(selected.file, volume);
    }, onClose);
  });

  list.key(['escape', 'q'], () => {
    _close();
  });
}
