/**
 * AgentVibes TUI Console — Music Tab
 * Epic 9: Stories 9.1-9.3
 *
 * Implements the Tab Component Contract:
 *   createMusicTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: dynamic track library from .claude/audio/tracks/, favorites (★), active track (▶),
 *           toggle music on/off, favorites filter, preview playback on Enter/Space (toggle).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#e65100',  // Orange — section headers for Music tab
  labelFg:    '#e3f2fd',
  valueFg:    '#ffd700',
  activeFg:   '#69f0ae',  // Green — active/playing track
  favoriteFg: '#ffb300',  // Amber — favorite star
  btnDefault: '#e65100',  // Orange — Music tab buttons
  btnFocus:   '#ff9800',
  btnFocusFg: '#000000',
  btnPress:   '#ff00ff',
  borderFg:   '#ff9800',
  footerBg:   '#ff9800',  // Orange — Music tab footer
  noticeFg:   '#90a4ae',
  dimFg:      '#455a64',
  playingFg:  '#00e5ff',  // Cyan — currently previewing track indicator
};

const FOOTER_TEXT = '[↑↓/jk] Navigate  [Enter/Space] Preview  [Tab] Buttons  [M] Toggle  [*] Favorite  [F] Filter  [Q] Quit';

// ---------------------------------------------------------------------------
// Static catalog — correct real filenames; Soft Flamenco kept first for compat.
// At runtime the UI scans .claude/audio/tracks/ dynamically so new tracks appear.

// Full display names per track — emoji + label. Single-codepoint emoji only (no \uFE0F
// variation selectors) so blessed renders them cleanly in list widgets.
const TRACK_DISPLAY = Object.freeze({
  'agentvibes_soft_flamenco_loop.mp3':                 '🎻 Soft Flamenco',
  'agent_vibes_arabic_v2_loop.mp3':                    '🎵 Arabic Oud',
  'agent_vibes_bachata_v1_loop.mp3':                   '🎺 Bachata',
  'agent_vibes_bossa_nova_v2_loop.mp3':                '🌸 Bossa Nova',
  'agent_vibes_celtic_harp_v1_loop.mp3':               '🎶 Celtic Harp',
  'agent_vibes_chillwave_v2_loop.mp3':                 '🌊 Chillwave',
  'agent_vibes_cumbia_v1_loop.mp3':                    '🎸 Cumbia',
  'agent_vibes_dark_chill_step_loop.mp3':              '🌙 Dark Chill Step',
  'agent_vibes_ganawa_ambient_v2_loop.mp3':            '🪘 Gnawa Ambient',
  'agent_vibes_goa_trance_v2_loop.mp3':                '🌀 Goa Trance',
  'agent_vibes_harpsichord_v2_loop.mp3':               '🎼 Harpsichord',
  'agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3': '🌺 Hawaiian Slack Key Guitar',
  'agent_vibes_japanese_city_pop_v1_loop.mp3':         '🌆 Japanese City Pop',
  'agent_vibes_salsa_v2_loop.mp3':                     '💃 Salsa',
  'agent_vibes_tabla_dream_pop_v1_loop.mp3':           '🥁 Tabla Dream Pop',
});

const BUILT_IN_TRACK_CATALOG = Object.freeze([
  { id: 'agentvibes_soft_flamenco_loop.mp3',                 label: '🎻 Soft Flamenco' },
  { id: 'agent_vibes_arabic_v2_loop.mp3',                    label: '🎵 Arabic Oud' },
  { id: 'agent_vibes_bachata_v1_loop.mp3',                   label: '🎺 Bachata' },
  { id: 'agent_vibes_bossa_nova_v2_loop.mp3',                label: '🌸 Bossa Nova' },
  { id: 'agent_vibes_celtic_harp_v1_loop.mp3',               label: '🎶 Celtic Harp' },
  { id: 'agent_vibes_chillwave_v2_loop.mp3',                 label: '🌊 Chillwave' },
  { id: 'agent_vibes_cumbia_v1_loop.mp3',                    label: '🎸 Cumbia' },
  { id: 'agent_vibes_dark_chill_step_loop.mp3',              label: '🌙 Dark Chill Step' },
  { id: 'agent_vibes_ganawa_ambient_v2_loop.mp3',            label: '🪘 Gnawa Ambient' },
  { id: 'agent_vibes_goa_trance_v2_loop.mp3',                label: '🌀 Goa Trance' },
  { id: 'agent_vibes_harpsichord_v2_loop.mp3',               label: '🎼 Harpsichord' },
  { id: 'agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3', label: '🌺 Hawaiian Slack Key Guitar' },
  { id: 'agent_vibes_japanese_city_pop_v1_loop.mp3',         label: '🌆 Japanese City Pop' },
  { id: 'agent_vibes_salsa_v2_loop.mp3',                     label: '💃 Salsa' },
  { id: 'agent_vibes_tabla_dream_pop_v1_loop.mp3',           label: '🥁 Tabla Dream Pop' },
  { id: 'dreamy_house_loop.mp3',                             label: 'Dreamy House' },
]);

// ---------------------------------------------------------------------------
// Exported pure helpers (testable without blessed)

/**
 * Return the built-in track catalog (static, predictable for tests).
 * @returns {{ id: string, label: string }[]}
 */
export function getBuiltInTracks() {
  return [...BUILT_IN_TRACK_CATALOG];
}

/**
 * Generate a pretty label from a track filename.
 * Returns the canonical display name (with emoji) for known tracks.
 * For unknown tracks, strips agent_vibes_/agentvibes_ prefix and _loop/_vN suffixes,
 * then title-cases the result.
 *
 * @param {string} filename
 * @returns {string}
 */
export function formatTrackLabel(filename) {
  if (TRACK_DISPLAY[filename]) return TRACK_DISPLAY[filename];
  const label = filename
    .replace(/\.mp3$/i, '')
    .replace(/^agent_vibes_/i, '')
    .replace(/^agentvibes_/i, '')
    .replace(/_loop$/i, '')
    .replace(/_v\d+$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
  return label || filename;
}

/**
 * Format music enabled state as readable string.
 * @param {boolean|undefined} enabled
 * @returns {string}
 */
export function formatMusicStatus(enabled) {
  return enabled ? 'Enabled' : 'Disabled';
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
// Helpers (used inside createMusicTab)

/**
 * Resolve the tracks directory for the running project.
 * @returns {string}
 */
function _getTracksDir() {
  return path.join(process.cwd(), '.claude', 'audio', 'tracks');
}

/**
 * Scan .claude/audio/tracks/ for .mp3 files.
 * Falls back to the static catalog if the directory is absent.
 *
 * @returns {{ id: string, label: string, isBuiltIn: boolean }[]}
 */
export function scanTracks() {
  const tracksDir = _getTracksDir();
  try {
    const files = fs.readdirSync(tracksDir);
    return files
      .filter(f => /\.mp3$/i.test(f))
      .sort()
      .map(f => ({ id: f, label: formatTrackLabel(f), isBuiltIn: true }));
  } catch {
    // Directory not found or unreadable — use the static catalog
    return BUILT_IN_TRACK_CATALOG.map(t => ({ ...t, isBuiltIn: true }));
  }
}

/**
 * Get music config from configService.
 */
function _getMusic(configService) {
  const cfg = configService.getConfig();
  const music = cfg.music ?? {};
  return {
    enabled: music.enabled ?? false,
    track:   music.track ?? BUILT_IN_TRACK_CATALOG[0].id,
  };
}

/**
 * Update music config (merge, never overwrite).
 */
function _setMusic(configService, update) {
  const current = _getMusic(configService);
  configService.set('music', { ...current, ...update });
}

/**
 * Get favorites array from config.musicFavorites.
 */
export function getMusicFavorites(configService) {
  const favs = configService.getConfig().musicFavorites;
  return Array.isArray(favs) ? favs : [];
}

/**
 * Toggle a track in the favorites list.
 */
export function toggleMusicFavorite(configService, trackId) {
  const favs = getMusicFavorites(configService);
  const idx = favs.indexOf(trackId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(trackId);
  }
  configService.set('musicFavorites', favs);
}

/**
 * Get custom tracks from config.
 */
function _getCustomTracks(configService) {
  const custom = configService.getConfig().customTracks;
  return Array.isArray(custom) ? custom : [];
}

// ---------------------------------------------------------------------------

/**
 * Create the Music tab component.
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @param {import('../../services/config-service.js').ConfigService}   services.configService
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createMusicTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService } = services;

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
  // Section headers

  blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: `{#e65100-fg}── Built-in Tracks ${'─'.repeat(48)}{/#e65100-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Track list

  const trackList = blessed.list({
    parent: box,
    top: 3,
    left: 2,
    width: '96%',
    height: '55%',
    keys: true,
    vi: true,
    mouse: true,
    border: { type: 'line' },
    scrollbar: { ch: '│', style: { fg: COLORS.sectionHdr } },
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
      selected: { bg: '#3e2000', fg: COLORS.activeFg, bold: true },
      item: { fg: COLORS.labelFg },
    },
  });

  // -------------------------------------------------------------------------
  // Status panel

  blessed.text({
    parent: box,
    top: '64%',
    left: 2,
    content: `{#e65100-fg}── Music Status ${'─'.repeat(52)}{/#e65100-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const statusLine = blessed.text({
    parent: box,
    top: '69%',
    left: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const previewLine = blessed.text({
    parent: box,
    top: '74%',
    left: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.playingFg, bg: COLORS.contentBg },
  });

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
      const raw = btn.content.replace(/[►◄]/g, '').trim();
      btn.setContent(`►${raw}◄`);
      screen.render();
    });
    btn.on('blur', () => {
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

  const toggleBtn = _createBtn('[Toggle Music]', () => {
    const { enabled } = _getMusic(configService);
    _setMusic(configService, { enabled: !enabled });
    refreshDisplay();
  });
  toggleBtn.bottom = 4;
  toggleBtn.left = 4;

  const setActiveBtn = _createBtn('[Set Active]', () => {
    const trackId = _getSelectedTrackId();
    if (trackId) {
      _setMusic(configService, { track: trackId });
      refreshDisplay();
    }
  });
  setActiveBtn.bottom = 4;
  setActiveBtn.left = 22;

  const favoriteBtn = _createBtn('[★ Favorite]', () => {
    const trackId = _getSelectedTrackId();
    if (trackId) {
      toggleMusicFavorite(configService, trackId);
      refreshDisplay();
    }
  });
  favoriteBtn.bottom = 4;
  favoriteBtn.left = 38;

  const uploadBtn = _createBtn('[Upload Help]', () => {
    const notice = blessed.text({
      parent: box,
      top: 'center',
      left: 'center',
      content: 'Use /agent-vibes:background-music to manage custom tracks',
      tags: true,
      style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
    });
    screen.render();
    setTimeout(() => { notice.destroy(); screen.render(); }, 3000);
  });
  uploadBtn.bottom = 4;
  uploadBtn.left = 55;

  // -------------------------------------------------------------------------
  // Playback state

  let _playingProcess = null;
  let _playingTrackId = null;

  // Kill the entire process group so child audio processes (ffplay, play, mpg123) all die
  function _killPlayingProcess() {
    if (_playingProcess) {
      try { process.kill(-_playingProcess.pid, 'SIGTERM'); } catch {}
      _playingProcess = null;
    }
  }

  // Extended PATH for audio players (ffplay, play, mpg123)
  const _spawnEnv = {
    ...process.env,
    PATH: [process.env.PATH, path.join(os.homedir(), '.local', 'bin'), '/usr/local/bin']
      .filter(Boolean).join(':'),
  };

  /**
   * Preview a track by spawning an audio player.
   * Second call with the same trackId stops playback (toggle).
   */
  function _playTrack(trackId) {
    const tracksDir = _getTracksDir();
    const trackPath = path.resolve(tracksDir, trackId);

    // Guard: path must stay inside tracksDir
    const safeBase = path.resolve(tracksDir);
    if (!trackPath.startsWith(safeBase + path.sep) && trackPath !== safeBase) {
      return;
    }

    // Toggle: second press on the same track → stop
    if (_playingTrackId === trackId) {
      _killPlayingProcess();
      _playingTrackId = null;
      previewLine.setContent('');
      screen.render();
      return;
    }

    // Kill any previously playing track
    _killPlayingProcess();
    _playingTrackId = null;

    // Spawn: try ffplay (ffmpeg), then play (sox), then mpg123
    const cmd = [
      `ffplay -nodisp -autoexit -loglevel quiet "${trackPath}"`,
      `play "${trackPath}"`,
      `mpg123 -q "${trackPath}"`,
    ].join(' 2>/dev/null || ') + ' 2>/dev/null';

    _playingProcess = spawn('sh', ['-c', cmd], { stdio: 'ignore', detached: true, env: _spawnEnv });
    _playingTrackId = trackId;

    const label = _allTracks.find(t => t.id === trackId)?.label ?? formatTrackLabel(trackId);
    previewLine.setContent(`{${COLORS.playingFg}-fg}♪ Previewing: ${label}  (press Enter/Space again to stop){/${COLORS.playingFg}-fg}`);
    screen.render();

    _playingProcess.on('exit', () => {
      if (_playingTrackId === trackId) {
        _playingTrackId = null;
        _playingProcess = null;
        previewLine.setContent('');
        screen.render();
      }
    });

    _playingProcess.on('error', () => {
      _playingTrackId = null;
      _playingProcess = null;
      previewLine.setContent('');
    });
  }

  // -------------------------------------------------------------------------
  // Display state

  let _showFavoritesOnly = false;
  let _allTracks = [];

  function _buildAllTracks() {
    const scanned = scanTracks();
    const scannedIds = new Set(scanned.map(t => t.id));
    // Append custom tracks not already present from disk scan
    const custom = _getCustomTracks(configService)
      .filter(id => !scannedIds.has(id))
      .map(id => ({ id, label: formatTrackLabel(id), isBuiltIn: false }));
    return [...scanned, ...custom];
  }

  function _getVisibleTracks() {
    if (!_showFavoritesOnly) return _allTracks;
    const favs = getMusicFavorites(configService);
    return _allTracks.filter(t => favs.includes(t.id));
  }

  function _getSelectedTrackId() {
    const visible = _getVisibleTracks();
    const entry = visible[trackList.selected];
    return entry ? entry.id : null;
  }

  function _buildListItems(tracks, activeTrackId, favorites) {
    return tracks.map(t => {
      const isFav     = favorites.includes(t.id);
      const isActive  = t.id === activeTrackId;
      const isPrev    = t.id === _playingTrackId;
      const star = isFav  ? '★' : ' ';
      const dot  = isPrev ? '♪' : (isActive ? '▶' : ' ');
      const tag  = t.isBuiltIn ? '' : ' [custom]';
      return ` ${star}${dot} ${t.label}${tag}`;
    });
  }

  function refreshDisplay() {
    _allTracks = _buildAllTracks();
    const { enabled, track: activeTrackId } = _getMusic(configService);
    const favorites = getMusicFavorites(configService);
    const visible = _getVisibleTracks();
    const items = _buildListItems(visible, activeTrackId, favorites);

    const activeTrack = _allTracks.find(t => t.id === activeTrackId);
    const activeLabel = (activeTrack?.label ?? formatTrackLabel(activeTrackId ?? '')) || 'None';

    trackList.setItems(items.length > 0 ? items : [' (no tracks match filter)']);
    statusLine.setContent(
      `  Music: ${formatMusicStatus(enabled)}  |  Active Track: ${activeLabel}  |  Filter: ${_showFavoritesOnly ? 'Favorites' : 'All'}`
    );

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Key bindings on trackList

  // [Enter] → preview/stop track (toggle)
  trackList.key(['enter'], () => {
    const trackId = _getSelectedTrackId();
    if (trackId) {
      _playTrack(trackId);
      refreshDisplay();
    }
  });

  // [Space] → same as Enter: preview/stop track (toggle)
  trackList.key(['space'], () => {
    const trackId = _getSelectedTrackId();
    if (trackId) {
      _playTrack(trackId);
      refreshDisplay();
    }
  });

  // [m/M] → toggle music enabled in config
  trackList.key(['m', 'M'], () => {
    const { enabled } = _getMusic(configService);
    _setMusic(configService, { enabled: !enabled });
    refreshDisplay();
  });

  // [*] → toggle favorite
  trackList.key(['*'], () => {
    const trackId = _getSelectedTrackId();
    if (trackId) {
      toggleMusicFavorite(configService, trackId);
      refreshDisplay();
    }
  });

  // [f/F] → toggle favorites filter
  trackList.key(['f', 'F'], () => {
    _showFavoritesOnly = !_showFavoritesOnly;
    refreshDisplay();
  });

  // Refresh status text on cursor movement
  trackList.on('select item', () => {
    const { enabled, track: activeTrackId } = _getMusic(configService);
    const activeTrack = _allTracks.find(t => t.id === activeTrackId);
    const activeLabel = (activeTrack?.label ?? formatTrackLabel(activeTrackId ?? '')) || 'None';
    statusLine.setContent(
      `  Music: ${formatMusicStatus(enabled)}  |  Active Track: ${activeLabel}  |  Filter: ${_showFavoritesOnly ? 'Favorites' : 'All'}`
    );
    screen.render();
  });

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
      // Stop any preview when leaving the tab
      _killPlayingProcess();
      _playingTrackId = null;
      previewLine.setContent('');
      box.hide();
      screen.render();
    },

    onFocus() {
      trackList.focus();
      screen.render();
    },

    onBlur() {
      // Stop preview when focus leaves Music tab
      _killPlayingProcess();
      _playingTrackId = null;
    },

    getFooterText() {
      return FOOTER_TEXT;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
