/**
 * AgentVibes TUI Console — Music Tab
 * Epic 9: Stories 9.1-9.3
 *
 * Implements the Tab Component Contract:
 *   createMusicTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: 12 built-in tracks, custom tracks from config, favorites (★), active track (▶),
 *           toggle music on/off, favorites filter, upload help.
 */

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
};

const FOOTER_TEXT = '[↑↓/jk] Navigate  [Enter] Set Active  [M] Toggle Music  [*] Favorite  [F] Fav Filter  [Q] Quit';

// ---------------------------------------------------------------------------
// Track catalog

const BUILT_IN_TRACK_CATALOG = Object.freeze([
  { id: 'agentvibes_soft_flamenco_loop.mp3',    label: 'Soft Flamenco Loop' },
  { id: 'agentvibes_jazz_ambient_chill.mp3',    label: 'Jazz Ambient Chill' },
  { id: 'agentvibes_classical_piano_gentle.mp3',label: 'Classical Piano Gentle' },
  { id: 'agentvibes_lofi_beats_coding.mp3',     label: 'Lo-Fi Beats Coding' },
  { id: 'agentvibes_electronic_focus.mp3',      label: 'Electronic Focus' },
  { id: 'agentvibes_blues_smooth_guitar.mp3',   label: 'Blues Smooth Guitar' },
  { id: 'agentvibes_acoustic_folk_calm.mp3',    label: 'Acoustic Folk Calm' },
  { id: 'agentvibes_cinematic_epic.mp3',        label: 'Cinematic Epic' },
  { id: 'agentvibes_nature_sounds_rain.mp3',    label: 'Nature Sounds Rain' },
  { id: 'agentvibes_white_noise_deep.mp3',      label: 'White Noise Deep' },
  { id: 'agentvibes_binaural_waves_alpha.mp3',  label: 'Binaural Waves Alpha' },
  { id: 'agentvibes_orchestral_peaceful.mp3',   label: 'Orchestral Peaceful' },
]);

// ---------------------------------------------------------------------------
// Exported pure helpers (testable without blessed)

/**
 * Return the built-in track catalog.
 * @returns {{ id: string, label: string }[]}
 */
export function getBuiltInTracks() {
  return [...BUILT_IN_TRACK_CATALOG];
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

/**
 * Get music config object from configService.
 * @param {object} configService
 * @returns {{ enabled: boolean, track: string }}
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
 * Update music config.
 * @param {object} configService
 * @param {Partial<{ enabled: boolean, track: string }>} update
 */
function _setMusic(configService, update) {
  const current = _getMusic(configService);
  configService.set('music', { ...current, ...update });
}

/**
 * Get favorites array from config.musicFavorites.
 * @param {object} configService
 * @returns {string[]}
 */
function _getFavorites(configService) {
  const favs = configService.getConfig().musicFavorites;
  return Array.isArray(favs) ? favs : [];
}

/**
 * Toggle a track in music favorites.
 * @param {object} configService
 * @param {string} trackId
 */
function _toggleFavorite(configService, trackId) {
  const favs = _getFavorites(configService);
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
 * @param {object} configService
 * @returns {string[]}
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
      _toggleFavorite(configService, trackId);
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
  // State

  let _showFavoritesOnly = false;
  let _allTracks = [];  // { id, label, isBuiltIn }

  function _buildAllTracks() {
    const builtIn = BUILT_IN_TRACK_CATALOG.map(t => ({ ...t, isBuiltIn: true }));
    const custom = _getCustomTracks(configService).map(id => ({
      id,
      label: id.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
      isBuiltIn: false,
    }));
    return [...builtIn, ...custom];
  }

  function _getVisibleTracks() {
    if (!_showFavoritesOnly) return _allTracks;
    const favs = _getFavorites(configService);
    return _allTracks.filter(t => favs.includes(t.id));
  }

  function _getSelectedTrackId() {
    const visible = _getVisibleTracks();
    const entry = visible[trackList.selected];
    return entry ? entry.id : null;
  }

  function _buildListItems(tracks, activeTrackId, favorites) {
    return tracks.map(t => {
      const isFav = favorites.includes(t.id);
      const isActive = t.id === activeTrackId;
      const star = isFav ? '★' : ' ';
      const dot  = isActive ? '▶' : ' ';
      const tag  = t.isBuiltIn ? '' : ' [custom]';
      return ` ${star}${dot} ${t.label}${tag}`;
    });
  }

  function refreshDisplay() {
    _allTracks = _buildAllTracks();
    const { enabled, track: activeTrackId } = _getMusic(configService);
    const favorites = _getFavorites(configService);
    const visible = _getVisibleTracks();
    const items = _buildListItems(visible, activeTrackId, favorites);

    const activeLabel = BUILT_IN_TRACK_CATALOG.find(t => t.id === activeTrackId)?.label
      ?? activeTrackId?.replace(/\.[^.]+$/, '').replace(/_/g, ' ')
      ?? 'None';

    trackList.setItems(items.length > 0 ? items : [' (no tracks match filter)']);
    statusLine.setContent(
      `  Music: ${formatMusicStatus(enabled)}  |  Active Track: ${activeLabel}  |  Filter: ${_showFavoritesOnly ? 'Favorites' : 'All'}`
    );

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Key bindings on trackList

  // [Enter] → set active track
  trackList.key(['enter'], () => {
    const trackId = _getSelectedTrackId();
    if (trackId) {
      _setMusic(configService, { track: trackId });
      refreshDisplay();
    }
  });

  // [m/M] → toggle music
  trackList.key(['m', 'M'], () => {
    const { enabled } = _getMusic(configService);
    _setMusic(configService, { enabled: !enabled });
    refreshDisplay();
  });

  // [*] → toggle favorite
  trackList.key(['*'], () => {
    const trackId = _getSelectedTrackId();
    if (trackId) {
      _toggleFavorite(configService, trackId);
      refreshDisplay();
    }
  });

  // [f/F] → toggle favorites filter
  trackList.key(['f', 'F'], () => {
    _showFavoritesOnly = !_showFavoritesOnly;
    refreshDisplay();
  });

  // Update status on selection change
  trackList.on('select item', () => {
    const { enabled, track: activeTrackId } = _getMusic(configService);
    const activeLabel = BUILT_IN_TRACK_CATALOG.find(t => t.id === activeTrackId)?.label ?? activeTrackId ?? 'None';
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
      box.hide();
      screen.render();
    },

    onFocus() {
      trackList.focus();
      screen.render();
    },

    onBlur() {},

    getFooterText() {
      return FOOTER_TEXT;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
