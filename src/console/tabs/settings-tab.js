/**
 * AgentVibes TUI Console — Settings Tab
 * Stories 7.1 (Provider & Voice) + 7.2 (Audio Effects)
 *
 * Implements the Tab Component Contract:
 *   createSettingsTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Groups 1-2 implemented. Groups 3-5 added in stories 7.3-7.5.
 * Button-level focus navigation (↑↓←→) implemented in story 7.6.
 */

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

// Lazy-load blessed only in non-test mode (avoids screen requirement in tests)
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------
// Brand colours (matches architecture.md + UX design plan)

const COLORS = {
  contentBg:   '#0a0e1a',  // Near-black content background
  sectionHdr:  '#7986cb',  // Light blue — section dividers
  labelFg:     '#e3f2fd',  // Light blue text — labels
  valueFg:     '#ffd700',  // Yellow — current values
  btnDefault:  '#3949ab',  // Blue — default button bg
  btnFocus:    '#00e5ff',  // Cyan — focused button bg
  btnFocusFg:  '#000000',  // Black — focused button text
  btnPress:    '#ff00ff',  // Magenta — pressed button bg
  borderFg:    '#7986cb',  // Light blue — borders
  footerBg:    '#2196f3',  // Blue — settings footer
  noticeFg:    '#90a4ae',  // Gray — stub notice text
};

const FOOTER_TEXT =
  '[↑↓] Next Button  [Enter] Activate  [Space] Preview  [S/V/M/A/H/R] Switch Tab  [Q] Quit';

// Default effects — single source of truth (used by _getEffects, _setEffects, refreshDisplay)
const EFFECTS_DEFAULTS = Object.freeze({ reverb: false, reverbAmount: 0.3, pitch: 0 });

// Default background music config
const MUSIC_DEFAULTS = Object.freeze({ enabled: false, track: 'agentvibes_soft_flamenco_loop.mp3' });

// Verbosity display labels
const VERBOSITY_LABELS = Object.freeze({ high: 'High', medium: 'Medium', low: 'Low', minimal: 'Minimal', custom: 'Custom' });

// Known personalities (matches .claude/personalities/ directory)
const PERSONALITIES = Object.freeze([
  'none', 'angry', 'annoying', 'crass', 'dramatic', 'dry-humor',
  'flirty', 'funny', 'grandpa', 'millennial', 'moody', 'normal',
  'pirate', 'poetic', 'professional', 'rapper', 'robot', 'sarcastic',
  'sassy', 'surfer-dude', 'zen',
]);

// Human-readable track display names
const TRACK_NAMES = Object.freeze({
  'agentvibes_soft_flamenco_loop.mp3':      'Soft Flamenco',
  'agent_vibes_bossa_nova_v2_loop.mp3':     'Bossa Nova',
  'agent_vibes_chillwave_v2_loop.mp3':      'Chillwave',
  'agent_vibes_ganawa_ambient_v2_loop.mp3': 'Gnawa Ambient',
});

// Built-in track list for the picker
const BUILT_IN_TRACKS = [
  { label: 'Soft Flamenco',  file: 'agentvibes_soft_flamenco_loop.mp3' },
  { label: 'Bossa Nova',     file: 'agent_vibes_bossa_nova_v2_loop.mp3' },
  { label: 'Chillwave',      file: 'agent_vibes_chillwave_v2_loop.mp3' },
  { label: 'Gnawa Ambient',  file: 'agent_vibes_ganawa_ambient_v2_loop.mp3' },
];

// ---------------------------------------------------------------------------
// Exported format helpers (pure functions — used by tests and UI)

/**
 * @param {boolean} reverb
 * @param {number} reverbAmount - 0.0 to 1.0
 * @returns {string}
 */
export function formatReverbState(reverb, reverbAmount) {
  if (!reverb) return 'Disabled';
  const pct = Math.round((reverbAmount ?? 0.3) * 100);
  return `Enabled (${pct}%)`;
}

/**
 * @param {number} pitch - integer semitones, −12 to +12
 * @returns {string}
 */
export function formatPitchState(pitch) {
  const s = pitch ?? 0;
  const sign = s >= 0 ? '+' : '';
  return `${sign}${s} semitones`;
}

/**
 * @param {boolean} enabled
 * @returns {string}
 */
export function formatMusicState(enabled) {
  return enabled ? 'Enabled' : 'Disabled';
}

/**
 * @param {string} track - filename (e.g. 'agentvibes_soft_flamenco_loop.mp3')
 * @returns {string}
 */
export function formatTrackName(track) {
  if (!track) return 'None';
  return TRACK_NAMES[track] ?? track.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
}

/**
 * @param {string} verbosity - 'high' | 'medium' | 'low'
 * @returns {string}
 */
export function formatVerbosity(verbosity) {
  return VERBOSITY_LABELS[verbosity] ?? 'High';
}

/**
 * @param {string} personality
 * @returns {string}
 */
export function formatPersonality(personality) {
  return personality ?? 'none';
}

/**
 * @param {string} pretext - intro text (max 50 chars from installer)
 * @returns {string}
 */
export function formatIntroText(pretext) {
  if (!pretext) return '(none)';
  return pretext.length > 30 ? pretext.slice(0, 30) + '…' : pretext;
}

// ---------------------------------------------------------------------------
// Test stub — returned in AGENTVIBES_TEST_MODE to avoid blessed widgets

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
 * Create the Settings tab component.
 * Follows the Tab Component Contract defined in architecture.md.
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @param {import('../../services/config-service.js').ConfigService}  services.configService
 * @param {import('../../services/provider-service.js').ProviderService} services.providerService
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createSettingsTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService } = services;

  // -------------------------------------------------------------------------
  // Container box — fills content area, hidden until activated

  const box = blessed.box({
    parent: screen,
    top: 4,       // Below header (row 0-2) + tab bar (row 3)
    left: 0,
    width: '100%',
    bottom: 2,    // Above context footer + GitHub footer
    hidden: true,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    border: { type: 'line' },
    borderStyle: { fg: COLORS.borderFg },
  });

  // -------------------------------------------------------------------------
  // Section header: ── Provider & Voice ──

  blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: `{#7986cb-fg}── Provider & Voice ${'─'.repeat(50)}{/#7986cb-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Provider row: label + value + [Switch] button

  blessed.text({
    parent: box,
    top: 3,
    left: 4,
    content: 'Provider:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const providerValue = blessed.text({
    parent: box,
    top: 3,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const switchBtn = _createButton(box, screen, '[Switch]', COLORS, () => {
    _openProviderPicker(screen, providerService, (selected) => {
      providerService.setActiveProvider(selected);
      refreshDisplay();
    });
  });
  switchBtn.top = 3;
  switchBtn.left = 40;

  // -------------------------------------------------------------------------
  // Voice row: label + value + [Change] button (stub for story 7-8)

  blessed.text({
    parent: box,
    top: 5,
    left: 4,
    content: 'Current Voice:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const voiceValue = blessed.text({
    parent: box,
    top: 5,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const changeBtn = _createButton(box, screen, '[Change]', COLORS, () => {
    // Full voice browser available via CLI: /agent-vibes:switch or /audio-browser
    _showNotice(box, screen, 'Use /agent-vibes:switch or /audio-browser to change voice');
  });
  changeBtn.top = 5;
  changeBtn.left = 40;

  // -------------------------------------------------------------------------
  // Section header: ── Audio Effects ──

  blessed.text({
    parent: box,
    top: 9,
    left: 2,
    content: `{#7986cb-fg}── Audio Effects ${'─'.repeat(50)}{/#7986cb-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Reverb row: label + value + [Toggle] + [Adjust] buttons

  blessed.text({
    parent: box,
    top: 11,
    left: 4,
    content: 'Reverb:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const reverbValue = blessed.text({
    parent: box,
    top: 11,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const toggleBtn = _createButton(box, screen, '[Toggle]', COLORS, () => {
    const effects = _getEffects(configService);
    _setEffects(configService, { reverb: !effects.reverb });
    refreshDisplay();
  });
  toggleBtn.top = 11;
  toggleBtn.left = 40;

  const adjustReverbBtn = _createButton(box, screen, '[Adjust]', COLORS, () => {
    _openReverbPicker(screen, configService, (amount) => {
      _setEffects(configService, { reverbAmount: amount });
      refreshDisplay();
    });
  });
  adjustReverbBtn.top = 11;
  adjustReverbBtn.left = 52;

  // -------------------------------------------------------------------------
  // Pitch row: label + value + [Adjust] button

  blessed.text({
    parent: box,
    top: 13,
    left: 4,
    content: 'Pitch:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const pitchValue = blessed.text({
    parent: box,
    top: 13,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const adjustPitchBtn = _createButton(box, screen, '[Adjust]', COLORS, () => {
    _openPitchPicker(screen, configService, (semitones) => {
      _setEffects(configService, { pitch: semitones });
      refreshDisplay();
    });
  });
  adjustPitchBtn.top = 13;
  adjustPitchBtn.left = 40;

  // -------------------------------------------------------------------------
  // Section header: ── Background Music ──

  blessed.text({
    parent: box,
    top: 17,
    left: 2,
    content: `{#7986cb-fg}── Background Music ${'─'.repeat(48)}{/#7986cb-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Music row: label + value + [Toggle] button

  blessed.text({
    parent: box,
    top: 19,
    left: 4,
    content: 'Music:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const musicValue = blessed.text({
    parent: box,
    top: 19,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const musicToggleBtn = _createButton(box, screen, '[Toggle]', COLORS, () => {
    const music = _getMusic(configService);
    _setMusic(configService, { enabled: !music.enabled });
    refreshDisplay();
  });
  musicToggleBtn.top = 19;
  musicToggleBtn.left = 40;

  // -------------------------------------------------------------------------
  // Track row: label + value + [Change] button

  blessed.text({
    parent: box,
    top: 21,
    left: 4,
    content: 'Track:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const trackValue = blessed.text({
    parent: box,
    top: 21,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const trackChangeBtn = _createButton(box, screen, '[Change]', COLORS, () => {
    _openTrackPicker(screen, configService, (file) => {
      _setMusic(configService, { track: file });
      refreshDisplay();
    });
  });
  trackChangeBtn.top = 21;
  trackChangeBtn.left = 40;

  // -------------------------------------------------------------------------
  // Section header: ── Personality & Verbosity ──

  blessed.text({
    parent: box,
    top: 25,
    left: 2,
    content: `{#7986cb-fg}── Personality & Verbosity ${'─'.repeat(40)}{/#7986cb-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Verbosity row: label + value + [Change] button

  blessed.text({
    parent: box,
    top: 27,
    left: 4,
    content: 'Verbosity:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const verbosityValue = blessed.text({
    parent: box,
    top: 27,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const verbosityChangeBtn = _createButton(box, screen, '[Change]', COLORS, () => {
    _openVerbosityPicker(screen, configService, () => refreshDisplay());
  });
  verbosityChangeBtn.top = 27;
  verbosityChangeBtn.left = 40;

  // -------------------------------------------------------------------------
  // Personality row: label + value + [Change] button (stub for story 7-7)

  blessed.text({
    parent: box,
    top: 29,
    left: 4,
    content: 'Personality:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const personalityValue = blessed.text({
    parent: box,
    top: 29,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const personalityChangeBtn = _createButton(box, screen, '[Change]', COLORS, () => {
    _openPersonalityPicker(screen, configService, (name) => {
      configService.set('personality', name);
      refreshDisplay();
    });
  });
  personalityChangeBtn.top = 29;
  personalityChangeBtn.left = 40;

  // -------------------------------------------------------------------------
  // Section header: ── Intro Text ──

  blessed.text({
    parent: box,
    top: 33,
    left: 2,
    content: `{#7986cb-fg}── Intro Text ${'─'.repeat(54)}{/#7986cb-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Intro Text row: label + value + [Clear] button

  blessed.text({
    parent: box,
    top: 35,
    left: 4,
    content: 'Intro Text:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const introTextValue = blessed.text({
    parent: box,
    top: 35,
    left: 20,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const introClearBtn = _createButton(box, screen, '[Clear]', COLORS, () => {
    configService.set('pretext', '');
    refreshDisplay();
  });
  introClearBtn.top = 35;
  introClearBtn.left = 40;

  // -------------------------------------------------------------------------
  // Display state + button-level focus navigation (story 7.6)

  const _buttons = [
    switchBtn, changeBtn,
    toggleBtn, adjustReverbBtn, adjustPitchBtn,
    musicToggleBtn, trackChangeBtn,
    verbosityChangeBtn, personalityChangeBtn,
    introClearBtn,
  ];

  let _currentIdx = 0;

  // Sync _currentIdx on focus — keeps mouse clicks in sync with keyboard nav
  for (const [i, btn] of _buttons.entries()) {
    btn.on('focus', () => { _currentIdx = i; });
  }

  // ↓ / Tab → next button;  ↑ / Shift-Tab → previous button
  function _navigateButton(delta) {
    _currentIdx = (_currentIdx + delta + _buttons.length) % _buttons.length;
    _buttons[_currentIdx].focus();
  }

  for (const btn of _buttons) {
    btn.key(['down', 'tab'], () => _navigateButton(1));
    btn.key(['up', 'S-tab'], () => _navigateButton(-1));
  }

  function refreshDisplay() {
    const activeProvider = providerService.getActiveProvider();
    const activeVoice = providerService.getActiveVoiceId();
    providerValue.setContent(activeProvider);
    voiceValue.setContent(activeVoice);

    // Group 2: Audio Effects
    const effects = configService.getConfig().effects ?? EFFECTS_DEFAULTS;
    reverbValue.setContent(formatReverbState(effects.reverb, effects.reverbAmount));
    pitchValue.setContent(formatPitchState(effects.pitch));

    // Group 3: Background Music
    const music = configService.getConfig().backgroundMusic ?? MUSIC_DEFAULTS;
    musicValue.setContent(formatMusicState(music.enabled));
    trackValue.setContent(formatTrackName(music.track));

    // Group 4: Personality & Verbosity
    const cfg = configService.getConfig();
    verbosityValue.setContent(formatVerbosity(cfg.verbosity));
    personalityValue.setContent(formatPersonality(cfg.personality));

    // Group 5: Intro Text
    introTextValue.setContent(formatIntroText(cfg.pretext));

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Tab Component Contract implementation

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
      // Restore focus to last used button (or first button on initial activation)
      _buttons[_currentIdx].focus();
      screen.render();
    },

    onBlur() {
      // No-op: NavigationService handles focus restoration
    },

    getFooterText() {
      return FOOTER_TEXT;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}

// ---------------------------------------------------------------------------
// Private: Create a styled focusable button

function _createButton(parent, screen, label, COLORS, onClick) {
  const btn = blessed.button({
    parent,
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

  // Focus indicators: prepend ► and append ◄
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

  // Keyboard activation with magenta flash
  btn.key(['enter', 'space'], () => {
    btn.style.bg = COLORS.btnPress;
    btn.style.fg = 'white';
    screen.render();
    setTimeout(() => {
      btn.style.bg = COLORS.btnDefault;
      btn.style.fg = 'white';
      screen.render();
      onClick();
    }, 150);
  });

  // Mouse
  btn.on('click', () => btn.press());
  btn.on('mouseover', () => btn.focus());

  return btn;
}

// ---------------------------------------------------------------------------
// Private: Inline provider picker (blessed list widget)

function _openProviderPicker(screen, providerService, onSelect) {
  const providers = providerService.getInstalledProviders();
  const current = providerService.getActiveProvider();

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 32,
    height: providers.length + 4,
    border: { type: 'line' },
    label: ' Select Provider ',
    items: providers.map(p => (p === current ? `● ${p}` : `  ${p}`)),
    keys: true,
    vi: false,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const selected = providers[list.selected];
    list.destroy();
    screen.render();
    if (selected) onSelect(selected);
  });

  list.key(['escape', 'q'], () => {
    list.destroy();
    screen.render();
  });
}

// ---------------------------------------------------------------------------
// Private: Show a temporary stub notice text

function _showNotice(parent, screen, message) {
  const notice = blessed.text({
    parent,
    top: 'center',
    left: 'center',
    content: `{center}${message}{/center}`,
    tags: true,
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });
  screen.render();

  // Auto-dismiss after 2 seconds
  setTimeout(() => {
    notice.destroy();
    screen.render();
  }, 2000);
}

// ---------------------------------------------------------------------------
// Private: Effects config read/write helpers

function _getEffects(configService) {
  return configService.getConfig().effects ?? EFFECTS_DEFAULTS;
}

function _setEffects(configService, partial) {
  const current = configService.getConfig().effects ?? EFFECTS_DEFAULTS;
  const merged = { ...current, ...partial };
  configService.set('effects', merged);
}

// ---------------------------------------------------------------------------
// Private: Inline reverb amount picker

function _openReverbPicker(screen, configService, onSelect) {
  const opts = ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'];
  const currentAmt = (configService.getConfig().effects?.reverbAmount ?? 0.3);
  const currentIdx = Math.min(10, Math.round(currentAmt * 10));

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 28,
    height: Math.min(opts.length + 4, 20),
    border: { type: 'line' },
    label: ' Reverb Amount ',
    items: opts,
    keys: true,
    vi: true,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  list.select(currentIdx);
  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const pct = parseInt(opts[list.selected], 10);
    if (isNaN(pct)) return;
    const amount = pct / 100;
    list.destroy();
    screen.render();
    onSelect(amount);
  });

  list.key(['escape', 'q'], () => {
    list.destroy();
    screen.render();
  });
}

// ---------------------------------------------------------------------------
// Private: Inline pitch semitone picker

function _openPitchPicker(screen, configService, onSelect) {
  const pitchOpts = [];
  for (let i = -12; i <= 12; i++) {
    pitchOpts.push(i >= 0 ? `+${i}` : `${i}`);
  }

  const currentPitch = (configService.getConfig().effects?.pitch ?? 0);
  const currentIdx = currentPitch + 12;  // -12 → 0, 0 → 12, +12 → 24

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 24,
    height: 20,
    border: { type: 'line' },
    label: ' Pitch (semitones) ',
    items: pitchOpts,
    keys: true,
    vi: true,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  list.select(currentIdx);
  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const raw = pitchOpts[list.selected];
    const semitones = parseInt(raw, 10);
    if (isNaN(semitones)) return;
    list.destroy();
    screen.render();
    onSelect(semitones);
  });

  list.key(['escape', 'q'], () => {
    list.destroy();
    screen.render();
  });
}

// ---------------------------------------------------------------------------
// Private: Background music config read/write helpers

function _getMusic(configService) {
  return configService.getConfig().backgroundMusic ?? MUSIC_DEFAULTS;
}

function _setMusic(configService, partial) {
  const current = configService.getConfig().backgroundMusic ?? MUSIC_DEFAULTS;
  const merged = { ...current, ...partial };
  configService.set('backgroundMusic', merged);
}

// ---------------------------------------------------------------------------
// Private: Inline track picker

function _openTrackPicker(screen, configService, onSelect) {
  const currentTrack = (configService.getConfig().backgroundMusic?.track ?? MUSIC_DEFAULTS.track);
  const items = BUILT_IN_TRACKS.map(t => (t.file === currentTrack ? `● ${t.label}` : `  ${t.label}`));
  const currentIdx = BUILT_IN_TRACKS.findIndex(t => t.file === currentTrack);

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 44,
    height: BUILT_IN_TRACKS.length + 4,
    border: { type: 'line' },
    label: ' Select Track ',
    items,
    keys: true,
    vi: false,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  if (currentIdx >= 0) list.select(currentIdx);
  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const selected = BUILT_IN_TRACKS[list.selected];
    if (!selected) return;
    list.destroy();
    screen.render();
    onSelect(selected.file);
  });

  list.key(['escape', 'q'], () => {
    list.destroy();
    screen.render();
  });
}

// ---------------------------------------------------------------------------
// Private: Inline verbosity picker

function _openVerbosityPicker(screen, configService, onDone) {
  const levels = ['Minimal', 'Low', 'Medium', 'High', 'Custom'];
  const current = configService.getConfig().verbosity ?? 'high';
  const currentIdx = Math.max(0, levels.findIndex(l => l.toLowerCase() === current));

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 28,
    height: levels.length + 4,
    border: { type: 'line' },
    label: ' Verbosity Level ',
    items: levels.map((l, i) => (i === currentIdx ? `● ${l}` : `  ${l}`)),
    keys: true,
    vi: false,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  list.select(currentIdx);
  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const selected = levels[list.selected];
    if (!selected) return;
    list.destroy();
    screen.render();
    configService.set('verbosity', selected.toLowerCase());
    onDone();
  });

  list.key(['escape', 'q'], () => {
    list.destroy();
    screen.render();
  });
}

// ---------------------------------------------------------------------------
// Private: Inline personality picker

function _openPersonalityPicker(screen, configService, onSelect) {
  const current = configService.getConfig().personality ?? 'none';
  const currentIdx = Math.max(0, PERSONALITIES.indexOf(current));

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 32,
    height: Math.min(PERSONALITIES.length + 4, 22),
    border: { type: 'line' },
    label: ' Select Personality ',
    items: PERSONALITIES.map((p, i) => (i === currentIdx ? `● ${p}` : `  ${p}`)),
    keys: true,
    vi: true,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  list.select(currentIdx);
  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const selected = PERSONALITIES[list.selected];
    if (!selected) return;
    list.destroy();
    screen.render();
    onSelect(selected);
  });

  list.key(['escape', 'q'], () => {
    list.destroy();
    screen.render();
  });
}
