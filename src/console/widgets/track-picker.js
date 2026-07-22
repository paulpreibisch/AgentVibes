/**
 * AgentVibes TUI — Shared Widget: Background Music Track Picker
 *
 * Inline modal list for selecting background music tracks.
 * Extracted from settings-tab.js for reuse across tabs.
 * Space previews track, Enter selects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { destroyList } from './destroy-list.js';
import { BRAND_PINK } from '../brand-colors.js';
import { renderHelpBar, selectorTitle } from './help-bar.js';
import { formatTrackName } from './format-utils.js';
import { buildAudioEnv, spawnMp3Player } from '../audio-env.js';
import { resolveMusicProvider, spawnMusicRemote, createRowSpinner } from '../music-preview.js';
import { playBlingCue } from '../bling.js';

// AgentVibes package/repo root — resolves bundled assets (bling cue) and is the
// package fallback when resolving the active provider for remote forwarding.
const _WIDGET_DIR = path.dirname(fileURLToPath(import.meta.url));
const _PKG_ROOT = path.resolve(_WIDGET_DIR, '..', '..', '..');

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

const _modalTitle = (text) => ` {${BRAND_PINK}-fg}${text}{/${BRAND_PINK}-fg} `;

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
  if (IS_TEST) { onConfirm(currentVol ?? 20); return; }
  let vol = (Number.isFinite(currentVol) && currentVol >= 0 && currentVol <= 100)
    ? currentVol : 20;

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
 * @param {number}   currentVolume - currently set volume (0-100, default 20)
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

  // Standardized chrome: bordered box titled "Music Track Selector", a pinned
  // (non-scrolling) help bar at the top, and the track list filling the rest.
  const TITLE = selectorTitle('Music Track');
  const HELP = renderHelpBar([
    { key: 'Space', label: 'preview' },
    { key: 'Enter', label: 'select' },
    { key: 'Esc', label: 'cancel' },
  ]);

  const boxHeight = Math.min(tracks.length + 5, Math.floor(screen.rows * 0.7));
  const box = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 54,
    height: boxHeight,
    border: { type: 'line' },
    tags: true,
    label: TITLE,
    style: { border: { fg: COLORS.btnFocus } },
  });
  box.setFront();

  blessed.text({
    parent: box,
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    tags: true,
    content: HELP,
  });

  const list = blessed.list({
    parent: box,
    top: 1,
    left: 0,
    right: 0,
    bottom: 0,
    tags: true,
    items,
    keys: true,
    vi: false,
    mouse: true,
    scrollable: true,
    scrollbar: { ch: '│', track: { bg: '#1e2a3a' }, style: { fg: COLORS.btnFocus } },
    style: {
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  // Transient error status shows in the title area; idle restores the title.
  function _setStatus(text) {
    box.setLabel(text || TITLE);
    screen.render();
  }

  // Row spinner: paints "⠹ Previewing (locally|remotely via SSH)  (Space to stop)"
  // ON the selected track row — shared with every other picker. _setStatus stays
  // for error messages only.
  let _closed = false;
  const _rowSpin = createRowSpinner(list, screen, (i) => (
    tracks[i] && tracks[i].file === currentTrack ? `● ${tracks[i].label}` : `  ${tracks[i] ? tracks[i].label : ''}`
  ), { isClosed: () => _closed });

  if (currentIdx >= 0) list.select(currentIdx);
  list.focus();
  screen.render();

  // Preview playback state
  const _spawnEnv = buildAudioEnv();
  let _previewProc = null;
  let _previewTrackId = null;
  // Remote playback is fire-and-forget (the local sender exits in ms while the
  // receiver keeps playing), so the toggle tracks the intended remote track
  // here rather than relying on a live local process.
  let _remotePreviewTrackId = null;

  function _killPreview() {
    if (_previewProc) {
      _previewProc.kill();
      _previewProc = null;
    }
    _previewTrackId = null;
    // Stop any remote preview so closing/selecting doesn't leave music playing
    // on the receiver (the local equivalent of killing the player process).
    if (_remotePreviewTrackId) {
      const mp = resolveMusicProvider(_PKG_ROOT);
      if (mp.remote) _sendRemote(mp, { stop: true });
      _remotePreviewTrackId = null;
    }
    _rowSpin.stop();
  }

  /**
   * Forward a music track to the receiver (or stop it), mirroring the Music
   * tab's remote-preview behavior. Fire-and-forget; UI errors surface in the
   * title status area. Returns true if the send was launched.
   * @param {{remote:boolean, projectDir:string}} mp
   * @param {{track?:string, stop?:boolean}} opts
   */
  function _sendRemote(mp, { track = null, stop = false } = {}) {
    let proc;
    try {
      proc = spawnMusicRemote({ packageRoot: _PKG_ROOT, projectDir: mp.projectDir, env: _spawnEnv, track, stop });
    } catch {
      if (!stop) {
        _setStatus(' {red-fg}Remote preview failed{/red-fg} ');
        setTimeout(() => { _setStatus(); }, 4000);
      }
      return false;
    }
    let _rerr = '';
    if (proc.stderr) proc.stderr.on('data', d => { _rerr += d.toString(); });
    proc.on('exit', (code) => {
      if (stop || code === 0) return;
      if (_remotePreviewTrackId === track) _remotePreviewTrackId = null;
      const msg = _rerr.trim().split('\n').pop() || 'Remote preview failed';
      _setStatus(` {red-fg}♪ ${msg}{/red-fg} `);
      setTimeout(() => { _setStatus(); }, 4000);
    });
    proc.on('error', () => {
      if (stop) return;
      if (_remotePreviewTrackId === track) _remotePreviewTrackId = null;
      _setStatus(' {red-fg}Remote preview failed{/red-fg} ');
      setTimeout(() => { _setStatus(); }, 4000);
    });
    return true;
  }

  function _previewTrack(trackFile) {
    // Transport provider: forward to the receiver instead of local playback
    // (which is silent on a headless box) — parity with the Music tab.
    const _mp = resolveMusicProvider(_PKG_ROOT);
    if (_mp.remote) {
      // Toggle off if same track → explicit music-stop signal
      if (_remotePreviewTrackId === trackFile) {
        _sendRemote(_mp, { stop: true });
        _remotePreviewTrackId = null;
        _rowSpin.stop();
        return;
      }
      // Bling first (fire-and-forget, plays locally like the voice preview),
      // then forward the track to the receiver. The receiver keeps playing until
      // an explicit stop, so the row spinner persists (no floor).
      playBlingCue(_PKG_ROOT);
      if (_sendRemote(_mp, { track: trackFile })) {
        _remotePreviewTrackId = trackFile;
        _rowSpin.start(list.selected, true);
      }
      return;
    }

    // ── Local playback ──────────────────────────────────────────────────────
    // Toggle off if same track
    if (_previewTrackId === trackFile) {
      _killPreview();
      _setStatus();
      return;
    }

    _killPreview();

    const trackPath = path.resolve(tracksDir, trackFile);
    const safeBase = path.resolve(tracksDir);
    if (!trackPath.startsWith(safeBase + path.sep) && trackPath !== safeBase) return;

    if (!fs.existsSync(trackPath)) {
      _setStatus(' {red-fg}Track file missing{/red-fg} ');
      setTimeout(() => { _setStatus(); }, 3000);
      return;
    }

    // Bling first (fire-and-forget) — same readiness cue as the voice preview —
    // then start local playback.
    playBlingCue(_PKG_ROOT);

    const proc = spawnMp3Player(trackPath, _spawnEnv);
    if (!proc) {
      _setStatus(' {red-fg}No MP3 player found{/red-fg} ');
      setTimeout(() => { _setStatus(); }, 3000);
      return;
    }

    _previewProc = proc;
    _previewTrackId = trackFile;
    _rowSpin.start(list.selected, false);

    proc.on('exit', () => {
      if (_previewTrackId === trackFile) {
        _previewTrackId = null;
        _previewProc = null;
        _rowSpin.stop();
      }
    });

    proc.on('error', () => {
      _previewTrackId = null;
      _previewProc = null;
      _rowSpin.stop();
    });
  }

  function _close(callback) {
    _closed = true;
    _killPreview();
    if (callback) {
      callback();
      destroyList(box, screen, onClose);
    } else {
      destroyList(box, screen, onClose);
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
    if (options.skipVolume) {
      destroyList(box, screen, null);
      setTimeout(() => {
        onSelect(selected.file);
        if (onClose) onClose();
      }, 0);
    } else {
      destroyList(box, screen, null);
      openVolumeInput(screen, currentVolume ?? 20, (volume) => {
        onSelect(selected.file, volume);
      }, onClose);
    }
  });

  list.key(['escape', 'q', 'Q'], () => {
    _close();
  });
}
