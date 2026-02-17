/**
 * AgentVibes TUI Console — Settings Tab (Group 1: Provider & Voice)
 * Story 7.1: Provider & Voice Settings Group
 *
 * Implements the Tab Component Contract:
 *   createSettingsTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Renders Group 1 only. Groups 2-5 added in stories 7.2-7.5.
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

  const providerLabel = blessed.text({
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
    // Voice Selector Modal implemented in story 7-8
    _showNotice(box, screen, 'Voice Selector coming in story 7-8');
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
  // Groups 3-5 placeholder note

  blessed.text({
    parent: box,
    top: 16,
    left: 4,
    content: `{#455a64-fg}(Groups 3-5: Music, Personality, Intro Text — added in stories 7.3-7.5){/#455a64-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Display state

  const _buttons = [switchBtn, changeBtn, toggleBtn, adjustReverbBtn, adjustPitchBtn];

  function refreshDisplay() {
    const activeProvider = providerService.getActiveProvider();
    const activeVoice = providerService.getActiveVoiceId();
    providerValue.setContent(activeProvider);
    voiceValue.setContent(activeVoice);

    // Group 2: Audio Effects
    const effects = configService.getConfig().effects ?? { reverb: false, reverbAmount: 0.3, pitch: 0 };
    reverbValue.setContent(formatReverbState(effects.reverb, effects.reverbAmount));
    pitchValue.setContent(formatPitchState(effects.pitch));

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
      // Focus the first button (Provider [Switch]) when tab becomes active
      if (_buttons.length > 0) {
        _buttons[0].focus();
      }
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
  return configService.getConfig().effects ?? { reverb: false, reverbAmount: 0.3, pitch: 0 };
}

function _setEffects(configService, partial) {
  const current = configService.getConfig().effects ?? { reverb: false, reverbAmount: 0.3, pitch: 0 };
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
    list.destroy();
    screen.render();
    onSelect(semitones);
  });

  list.key(['escape', 'q'], () => {
    list.destroy();
    screen.render();
  });
}
