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
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { buildAudioEnv, detectMp3Player } from '../audio-env.js';
import { t } from '../../i18n/strings.js';

// Package-relative tracks dir — used as fallback when cwd has no .claude/audio/tracks/
const _PKG_TRACKS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', '.claude', 'audio', 'tracks'
);

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#f06292',  // Light magenta — section headers for Music tab
  labelFg:    '#e3f2fd',
  valueFg:    '#f06292',  // Light magenta — brand color
  activeFg:   '#69f0ae',  // Green — active/playing track
  favoriteFg: '#ffff00',  // Yellow — favorite star
  btnDefault: '#880e4f',  // Dark magenta — Music tab buttons
  btnFocus:   '#2e7d32',  // Green — focused/selected
  btnFocusFg: '#ffffff',
  btnPress:   '#ff00ff',
  borderFg:   '#f06292',  // Light magenta — border
  footerBg:   '#880e4f',  // Dark magenta — Music tab footer
  noticeFg:   '#90a4ae',
  dimFg:      '#455a64',
  playingFg:  'bright-cyan',  // Cyan — currently previewing track indicator
};

const FOOTER_TEXT = '[↑↓/jk] Navigate  [Space] Preview  [Enter] Select  [M] Toggle  [*] Favorite  [F] Filter  [Q] Quit';

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
 * Uses process.cwd() because the TUI always runs from the project root
 * and this function is called both internally and from exported helpers
 * that lack configService context.
 * @returns {string}
 */
function _getTracksDir() {
  const cwdTracks = path.join(process.cwd(), '.claude', 'audio', 'tracks');
  // Fall back to package-bundled tracks if cwd doesn't have any
  return fs.existsSync(cwdTracks) ? cwdTracks : _PKG_TRACKS_DIR;
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
    const builtInIds = new Set(BUILT_IN_TRACK_CATALOG.map(t => t.id));
    return files
      .filter(f => /\.mp3$/i.test(f))
      .sort()
      .map(f => ({ id: f, label: formatTrackLabel(f), isBuiltIn: builtInIds.has(f) }));
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
  // Use backgroundMusic (matches settings-tab); fall back to legacy 'music' key
  const music = cfg.backgroundMusic ?? cfg.music ?? {};
  return {
    enabled: music.enabled ?? false,
    track:   music.track ?? BUILT_IN_TRACK_CATALOG[0].id,
    volume:  music.volume ?? 70,
  };
}

/**
 * Update music config (merge, never overwrite).
 * Writes to 'backgroundMusic' key (shared with settings-tab).
 */
function _setMusic(configService, update) {
  const current = _getMusic(configService);
  configService.set('backgroundMusic', { ...current, ...update });
}

/**
 * Patch the 'default' entry in audio-effects.cfg to use the given track.
 * play-tts-piper.sh reads the track from audio-effects.cfg (not from config.json),
 * so any track change must be reflected here to take effect at runtime.
 * Safe to call with invalid/missing tracks — non-fatal on failure.
 * @param {string} track - Filename like "agent_vibes_salsa_v2_loop.mp3"
 */
export function applyTrackToAudioEffects(track) {
  if (!track || /[|/\\]/.test(track)) return;
  const cfgFile = path.join(process.cwd(), '.claude', 'config', 'audio-effects.cfg');
  try {
    let content = fs.readFileSync(cfgFile, 'utf-8');
    content = content.replace(
      /^default\|([^|]*)\|([^|]*)\|(.*)$/m,
      (match, g1, g2, g3) => `default|${g1}|${track}|${g3}`,
    );
    fs.writeFileSync(cfgFile, content, 'utf-8');
  } catch { /* file may not exist — non-fatal */ }
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

  const { configService, focusMainTabBar, updateHeaderStatus, languageService } = services;
  const _tl = (key) => languageService ? languageService.t(key) : t('en', key);

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

  const builtInHdr = blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: `{${COLORS.sectionHdr}-fg}${_tl('musicBuiltInHeader')}${'─'.repeat(48)}{/${COLORS.sectionHdr}-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // Currently selected track indicator (updated by refreshDisplay)
  const activeTrackText = blessed.text({
    parent: box,
    top: 1,
    right: 4,
    shrink: true,
    tags: true,
    content: '',
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
    tags: true,
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

  const musicStatusHdr = blessed.text({
    parent: box,
    top: '64%',
    left: 2,
    content: `{${COLORS.sectionHdr}-fg}${_tl('musicStatusHeader')}${'─'.repeat(52)}{/${COLORS.sectionHdr}-fg}`,
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

  const toggleBtn = _createBtn(_tl('musicToggleBtn'), () => {
    const { enabled } = _getMusic(configService);
    _setMusic(configService, { enabled: !enabled });
    refreshDisplay();
  });
  toggleBtn.bottom = 4;
  toggleBtn.left = 4;

  const addCustomTrackBtn = _createBtn(_tl('musicAddCustomBtn'), () => {
    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 66,
      height: 11,
      border: { type: 'line' },
      tags: true,
      label: ` {${COLORS.activeFg}-fg}Add Custom Background Track{/${COLORS.activeFg}-fg} `,
      style: { border: { fg: COLORS.borderFg }, bg: COLORS.contentBg },
      content: [
        '',
        `  {${COLORS.labelFg}-fg}To add a custom track:{/${COLORS.labelFg}-fg}`,
        '',
        `  {${COLORS.valueFg}-fg}1.{/${COLORS.valueFg}-fg}  Place an MP3/OGG/WAV file in:`,
        `     {${COLORS.noticeFg}-fg}.claude/audio/tracks/{/${COLORS.noticeFg}-fg}`,
        '',
        `  {${COLORS.valueFg}-fg}2.{/${COLORS.valueFg}-fg}  Or run: {${COLORS.noticeFg}-fg}/agent-vibes:background-music{/${COLORS.noticeFg}-fg}`,
        '',
        `  {${COLORS.dimFg}-fg}[Esc / Enter] Close{/${COLORS.dimFg}-fg}`,
      ].join('\n'),
    });
    modal.key(['escape', 'enter', 'q'], () => { modal.destroy(); trackList.focus(); screen.render(); });
    modal.setFront();
    modal.focus();
    screen.render();
  });
  addCustomTrackBtn.bottom = 4;
  addCustomTrackBtn.left = 26;

  // -------------------------------------------------------------------------
  // Hint text shown in previewLine when the list has focus and nothing is playing.
  // Getter functions so they re-translate when language changes.
  const _hintText   = () => `{${COLORS.dimFg}-fg}${_tl('musicHintText')}{/${COLORS.dimFg}-fg}`;
  const _rowHint    = () => `  {bright-black-fg}${_tl('musicRowHint')}{/bright-black-fg}`;
  let _listFocused = false;

  // Inline selection hint appended to the currently highlighted track row.
  // _hintBase stores the item's clean content (no hint, no █) so we never need
  // a sentinel character — PUA chars like U+E000 render as Nerd Font icons.
  let _hintIdx  = -1;
  let _hintBase = '';   // content of items[_hintIdx] before hint was appended
  let _refreshing = false;

  // Known limitation: _updateHint and _tlTick (blink) can interleave,
  // causing brief visual glitches. The _refreshing guard prevents the worst
  // cases but is not a complete fix. Acceptable for a TUI animation.
  function _updateHint(idx) {
    const items = trackList.items;
    // Restore previously hinted row using its saved base content
    if (_hintIdx >= 0 && _hintIdx !== idx && items[_hintIdx]) {
      const hadBlink = (items[_hintIdx].content ?? '').endsWith(' █');
      items[_hintIdx].setContent(hadBlink ? _hintBase + ' █' : _hintBase);
    }
    // Add hint to the new row, saving its clean base first
    if (idx >= 0 && items[idx]) {
      let c = items[idx].content ?? '';
      const hasBlink = c.endsWith(' █');
      if (hasBlink) c = c.slice(0, -2);
      _hintBase = c;
      items[idx].setContent(c + _rowHint() + (hasBlink ? ' █' : ''));
    } else {
      _hintBase = '';
    }
    _hintIdx = idx;
  }

  // -------------------------------------------------------------------------
  // Playback state

  let _playingProcess = null;
  let _playingTrackId = null;

  // Kill the entire process group so child audio processes (ffplay, play, mpg123) all die
  function _killPlayingProcess() {
    if (_playingProcess) {
      const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      try {
        if (_isWin) {
          // Windows: kill the process tree via taskkill (process group kill doesn't work)
          spawn('taskkill', ['/F', '/T', '/PID', String(_playingProcess.pid)], {
            stdio: 'ignore', windowsHide: true,
          });
        } else {
          process.kill(-_playingProcess.pid, 'SIGTERM');
        }
      } catch (e) {
        if (e.code !== 'ESRCH') { /* ignore */ }
      }
      _playingProcess = null;
    }
  }

  const _spawnEnv = buildAudioEnv();
  const _detectedPlayer = detectMp3Player(_spawnEnv);

  process.on('exit', () => { _killPlayingProcess(); });

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
      previewLine.setContent(_listFocused ? _hintText() : '');
      screen.render();
      return;
    }

    // Kill any previously playing track
    _killPlayingProcess();
    _playingTrackId = null;

    if (!_detectedPlayer) {
      const installHint = process.platform === 'win32'
        ? 'No MP3 player found. Install ffmpeg: winget install ffmpeg'
        : 'No MP3 player found. Install ffmpeg: sudo apt install ffmpeg';
      previewLine.setContent(`{red-fg}${installHint}{/red-fg}`);
      screen.render();
      setTimeout(() => { previewLine.setContent(_listFocused ? _hintText() : ''); screen.render(); }, 5000);
      return;
    }

    const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
    // Spawn the detected player directly (no sh -c chain — avoids VLC/cvlc stderr issues)
    _playingProcess = spawn(_detectedPlayer.bin, _detectedPlayer.args(trackPath), {
      stdio: 'ignore', detached: !_isWin, windowsHide: true, env: _spawnEnv,
    });
    _playingTrackId = trackId;

    const label = _allTracks.find(t => t.id === trackId)?.label ?? formatTrackLabel(trackId);
    previewLine.setContent(`{${COLORS.playingFg}-fg}♪ Previewing: ${label}  (Space again to stop){/${COLORS.playingFg}-fg}`);
    screen.render();

    _playingProcess.on('exit', () => {
      if (_playingTrackId === trackId) {
        _playingTrackId = null;
        _playingProcess = null;
        previewLine.setContent(_listFocused ? _hintText() : '');
        refreshDisplay(); // clears (playing) label
      }
    });

    _playingProcess.on('error', () => {
      if (_playingTrackId === trackId) {
        _killPlayingProcess();
        _playingTrackId = null;
        _playingProcess = null;
        previewLine.setContent(_listFocused ? _hintText() : '');
      }
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
      const dot  = isPrev ? '♪' : (isActive ? '{green-fg}✓{/green-fg}' : ' ');
      const tag  = t.isBuiltIn ? '' : ' [custom]';
      return ` ${star}${dot} ${t.label}${tag}${isPrev ? ' (playing)' : ''}`;
    });
  }

  function refreshDisplay() {
    _refreshing = true;
    const savedIdx = trackList.selected ?? 0;

    _allTracks = _buildAllTracks();
    const { enabled, track: activeTrackId } = _getMusic(configService);
    const favorites = getMusicFavorites(configService);
    const visible = _getVisibleTracks();
    const items = _buildListItems(visible, activeTrackId, favorites);

    const activeTrack = _allTracks.find(t => t.id === activeTrackId);
    const activeLabel = (activeTrack?.label ?? formatTrackLabel(activeTrackId ?? '')) || 'None';

    trackList.setItems(items.length > 0 ? items : [' (no tracks match filter)']);
    // Restore selection (setItems resets to 0)
    const maxIdx = Math.max(0, (items.length > 0 ? items.length : 1) - 1);
    trackList.select(Math.min(savedIdx, maxIdx));

    // Re-apply inline hint if list is focused
    if (_listFocused) {
      _hintIdx = -1;
      _hintBase = '';
      _updateHint(trackList.selected ?? 0);
    }

    statusLine.setContent(
      `  ${_tl('musicStatusLabel')} ${formatMusicStatus(enabled)}  |  ${_tl('musicActiveTrack')} ${activeLabel}  |  ${_tl('musicFilterLabel')} ${_showFavoritesOnly ? _tl('musicFilterFavs') : _tl('musicFilterAll')}`
    );

    // Update "Currently Selected" header
    activeTrackText.setContent(`{${COLORS.activeFg}-fg}✓ ${activeLabel}{/${COLORS.activeFg}-fg}`);

    _refreshing = false;
    if (typeof updateHeaderStatus === 'function') updateHeaderStatus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Key bindings on trackList

  // [Enter] → open save modal for selected track
  trackList.key(['enter'], () => {
    const trackId = _getSelectedTrackId();
    if (!trackId) return;
    const label = _allTracks.find(t => t.id === trackId)?.label ?? formatTrackLabel(trackId);
    _openSaveModal(trackId, label);
  });

  /**
   * Save-track modal: Save Locally | Save Globally & Locally | Cancel | Preview
   */
  function _openSaveModal(trackId, displayName) {
    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 8,
      border: { type: 'line' },
      tags: true,
      label: ` {${COLORS.activeFg}-fg}Set Background Track{/${COLORS.activeFg}-fg} `,
      style: { border: { fg: COLORS.btnFocus }, bg: COLORS.contentBg },
    });

    blessed.text({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      content: `Set {${COLORS.valueFg}-fg}${displayName}{/${COLORS.valueFg}-fg} as your background track?`,
      tags: true,
      style: { bg: COLORS.contentBg },
    });

    const modalStatus = blessed.text({
      parent: modal,
      top: 3,
      left: 2,
      right: 2,
      tags: true,
      content: `{${COLORS.dimFg}-fg}Press Preview to audition this track{/${COLORS.dimFg}-fg}`,
      style: { bg: COLORS.contentBg },
    });

    function _close() {
      _killPlayingProcess();
      _playingTrackId = null;
      previewLine.setContent(_listFocused ? _hintText() : '');
      modal.destroy();
      trackList.focus();
      screen.render();
    }

    function _makeBtn(lbl, bg, left, top, onClick) {
      const btn = blessed.button({
        parent: modal,
        content: lbl,
        top,
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

    function _saveLocally() {
      _setMusic(configService, { track: trackId });
      applyTrackToAudioEffects(trackId);
      refreshDisplay();
      _showTrackChangedNotice(displayName);
    }

    function _saveGlobally() {
      configService.setGlobal('backgroundMusic', { track: trackId });
    }

    const okLocalBtn = _makeBtn('Save Locally', COLORS.btnDefault, 2, 5, () => {
      _saveLocally();
    });
    const okGlobalBtn = _makeBtn('Save Globally & Locally', '#1565c0', 18, 5, () => {
      _saveLocally();
      _saveGlobally();
    });
    const cancelBtn = _makeBtn('Cancel', '#546e7a', 46, 5, () => {});

    // Preview button — does NOT close the modal; plays/stops the track inline
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
        fg: 'white',
        focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      },
    });
    previewBtn.key(['enter', 'space'], () => {
      const isPlaying = _playingTrackId === trackId;
      _playTrack(trackId);
      modalStatus.setContent(isPlaying
        ? `{${COLORS.dimFg}-fg}Stopped.{/${COLORS.dimFg}-fg}`
        : `{${COLORS.playingFg}-fg}♪ Playing: ${displayName}…{/${COLORS.playingFg}-fg}`
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

    modal.key(['escape', 'q'], _close);

    modal.setFront();
    okLocalBtn.focus();
    screen.render();
  }

  function _showTrackChangedNotice(displayName) {
    const notice = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 5,
      border: { type: 'line' },
      tags: true,
      label: ` {${COLORS.activeFg}-fg}Done{/${COLORS.activeFg}-fg} `,
      style: { border: { fg: COLORS.btnFocus }, bg: COLORS.contentBg },
      content: `\n  {${COLORS.activeFg}-fg}✓ Track set: ${displayName}{/${COLORS.activeFg}-fg}`,
    });
    notice.setFront();
    screen.render();
    let noticeDestroyed = false;
    setTimeout(() => { if (!noticeDestroyed) { notice.destroy(); noticeDestroyed = true; screen.render(); } }, 2000);
  }

  // [Space] → preview/stop track (toggle)
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

  // [↑] at top of list → jump to main header tab bar
  trackList.key(['up'], () => {
    if (trackList.selected === 0 && typeof focusMainTabBar === 'function') {
      focusMainTabBar();
      setTimeout(() => { trackList.select(0); screen.render(); }, 0);
    }
  });

  // Escape at the list level → return to header tab bar
  trackList.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
  });

  // ↓ at the last item → descend into the button row (Toggle Music gets focus first)
  // Note: Tab is NOT used here — navigation.js registers screen.key(['tab']) to cycle tabs,
  // so element.key(['tab']) + screen.key(['tab']) both fire, causing a simultaneous tab-cycle.
  trackList.key(['down'], () => {
    const visible = _getVisibleTracks();
    if (trackList.selected >= visible.length - 1) {
      toggleBtn.focus();
      screen.render();
    }
  });

  // ←/→ navigate between the two buttons
  toggleBtn.key(['right'],         () => { addCustomTrackBtn.focus(); screen.render(); });
  addCustomTrackBtn.key(['right'], () => { toggleBtn.focus();         screen.render(); });
  toggleBtn.key(['left'],          () => { addCustomTrackBtn.focus(); screen.render(); });
  addCustomTrackBtn.key(['left'],  () => { toggleBtn.focus();         screen.render(); });

  // ↑ or Escape from any button → back to track list
  toggleBtn.key(['up', 'escape'],          () => { trackList.focus(); screen.render(); });
  addCustomTrackBtn.key(['up', 'escape'],  () => { trackList.focus(); screen.render(); });

  // Blinking █ on selected row while list is focused
  let _tlBlink = { interval: null, on: false, sel: -1 };
  process.on('exit', () => { if (_tlBlink.interval) clearInterval(_tlBlink.interval); });
  function _tlTick() {
    _tlBlink.on = !_tlBlink.on;
    const items = trackList.items;
    const cur = trackList.selected ?? 0;
    if (_tlBlink.sel !== cur && _tlBlink.sel >= 0 && items[_tlBlink.sel]) {
      items[_tlBlink.sel].setContent((items[_tlBlink.sel].content ?? '').replace(/ █$/, ''));
    }
    _tlBlink.sel = cur;
    if (items[cur]) {
      const base = (items[cur].content ?? '').replace(/ █$/, '');
      items[cur].setContent(_tlBlink.on ? `${base} █` : base);
    }
    screen.render();
  }
  trackList.on('focus', () => {
    _listFocused = true;
    _tlBlink.on = true;
    _tlBlink.sel = trackList.selected ?? 0;
    _hintIdx = -1;
    _hintBase = '';
    _updateHint(_tlBlink.sel);
    const items = trackList.items;
    if (items[_tlBlink.sel]) items[_tlBlink.sel].setContent((items[_tlBlink.sel].content ?? '') + ' █');
    if (!_playingTrackId) previewLine.setContent(_hintText());
    screen.render();
    _tlBlink.interval = setInterval(_tlTick, 500);
  });
  trackList.on('blur', () => {
    _listFocused = false;
    if (!_playingTrackId) previewLine.setContent('');
    if (_tlBlink.interval) { clearInterval(_tlBlink.interval); _tlBlink.interval = null; }
    const items = trackList.items;
    const sel = trackList.selected ?? 0;
    if (items[sel]) {
      // Restore the hinted item to its clean base; for non-hinted items just strip █
      items[sel].setContent(sel === _hintIdx ? _hintBase : (items[sel].content ?? '').replace(/ █$/, ''));
    }
    if (_hintIdx >= 0 && _hintIdx !== sel && items[_hintIdx]) {
      items[_hintIdx].setContent(_hintBase);
    }
    _hintIdx = -1;
    _hintBase = '';
    screen.render();
  });

  // Refresh status text on cursor movement
  trackList.on('select item', () => {
    if (_refreshing) return;
    _updateHint(trackList.selected ?? 0);
    if (_tlBlink.interval) _tlTick(); // move █ to newly selected row
    const { enabled, track: activeTrackId } = _getMusic(configService);
    const activeTrack = _allTracks.find(t => t.id === activeTrackId);
    const activeLabel = (activeTrack?.label ?? formatTrackLabel(activeTrackId ?? '')) || 'None';
    statusLine.setContent(
      `  ${_tl('musicStatusLabel')} ${formatMusicStatus(enabled)}  |  ${_tl('musicActiveTrack')} ${activeLabel}  |  ${_tl('musicFilterLabel')} ${_showFavoritesOnly ? _tl('musicFilterFavs') : _tl('musicFilterAll')}`
    );
    screen.render();
  });

  // Type-to-jump: press a letter to jump to first track whose label starts with it
  const _trackJumpBlocked = new Set(['j', 'k', 'g', 'h', 'l', 'd', 'u', 'm', 'f']);
  trackList.on('keypress', (ch, key) => {
    if (!ch || key.ctrl || key.meta) return;
    const lower = ch.toLowerCase();
    if (!/^[a-z]$/.test(lower)) return;
    if (_trackJumpBlocked.has(lower)) return;
    const tracks = _getVisibleTracks();
    const count = tracks.length;
    if (count === 0) return;
    const start = trackList.selected ?? 0;
    for (let i = 1; i <= count; i++) {
      const idx = (start + i) % count;
      // Strip leading emoji/symbols to get first letter of track name
      const firstLetter = tracks[idx].label.replace(/^[^a-zA-Z]*/, '')[0]?.toLowerCase() ?? '';
      if (firstLetter === lower) {
        trackList.select(idx);
        screen.render();
        break;
      }
    }
  });

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Language refresh

  function refreshMusicLabels() {
    builtInHdr.setContent(`{${COLORS.sectionHdr}-fg}${_tl('musicBuiltInHeader')}${'─'.repeat(48)}{/${COLORS.sectionHdr}-fg}`);
    musicStatusHdr.setContent(`{${COLORS.sectionHdr}-fg}${_tl('musicStatusHeader')}${'─'.repeat(52)}{/${COLORS.sectionHdr}-fg}`);
    toggleBtn.setContent(_tl('musicToggleBtn'));
    addCustomTrackBtn.setContent(_tl('musicAddCustomBtn'));
    refreshDisplay();
  }

  if (languageService) {
    languageService.onChange(() => { refreshMusicLabels(); screen.render(); });
  }

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
      return _tl('musicFooter');
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };

}
