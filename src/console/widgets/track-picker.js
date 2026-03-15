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

const BUILT_IN_TRACKS = [
  { label: '🎻 Soft Flamenco',  file: 'agentvibes_soft_flamenco_loop.mp3' },
  { label: '🌸 Bossa Nova',     file: 'agent_vibes_bossa_nova_v2_loop.mp3' },
  { label: '🌊 Chillwave',      file: 'agent_vibes_chillwave_v2_loop.mp3' },
  { label: '🪘 Gnawa Ambient',  file: 'agent_vibes_ganawa_ambient_v2_loop.mp3' },
];

/**
 * Open the background music track picker modal.
 *
 * @param {object}   screen       - blessed screen
 * @param {string}   currentTrack - currently selected track filename
 * @param {Function} onSelect     - called with selected track filename
 * @param {Function} [onClose]    - called after modal closes
 */
export function openTrackPicker(screen, currentTrack, onSelect, onClose) {
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
    btnFocus: '#00e5ff',
    btnFocusFg: '#000000',
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
      try { process.kill(-_previewProc.pid, 'SIGTERM'); } catch {}
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
    _setHint(`{#00e5ff-fg}♪ Previewing: ${label}  (Space to stop){/#00e5ff-fg}`);

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

  // Enter = select
  list.key(['enter'], () => {
    const selected = tracks[list.selected];
    if (!selected) return;
    _close(() => onSelect(selected.file));
  });

  list.key(['escape', 'q'], () => {
    _close();
  });
}
