/**
 * AgentVibes TUI Console — Help Tab
 * Epic 13: Story 13.1
 *
 * Implements the Tab Component Contract:
 *   createHelpTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: keyboard shortcuts reference, two sections, [/] search.
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
  sectionHdr: '#546e7a',  // Blue-gray — Help tab
  labelFg:    '#e3f2fd',
  keyFg:      '#ffd700',  // Gold — keyboard shortcuts
  descFg:     '#90a4ae',  // Gray — descriptions
  borderFg:   '#607d8b',
  footerBg:   '#607d8b',  // Gray — Help tab footer
};

const FOOTER_TEXT = '[↑↓/jk] Scroll  [/] Search  [PgUp/PgDn] Page  [S/V/M/A/R] Tab  [Q] Quit';

// ---------------------------------------------------------------------------
// Keyboard shortcuts data

const SHORTCUT_SECTIONS = Object.freeze([
  {
    title: 'Global Shortcuts',
    shortcuts: [
      { key: 'Q',         desc: 'Quit the console' },
      { key: 'Ctrl+C',    desc: 'Force quit' },
      { key: 'S',         desc: 'Switch to Settings tab' },
      { key: 'V',         desc: 'Switch to Voices tab' },
      { key: 'M',         desc: 'Switch to Music tab' },
      { key: 'A',         desc: 'Switch to Agents tab' },
      { key: 'R',         desc: 'Switch to Readme tab' },
      { key: 'H',         desc: 'Switch to Help tab' },
      { key: 'I',         desc: 'Switch to Install tab' },
      { key: 'Esc',       desc: 'Close modal / go back' },
    ],
  },
  {
    title: 'Navigation Shortcuts',
    shortcuts: [
      { key: '↑↓ / j k',  desc: 'Navigate lists' },
      { key: 'Enter',      desc: 'Select / activate' },
      { key: 'Space',      desc: 'Toggle / preview' },
      { key: 'Tab',        desc: 'Next button' },
      { key: 'Shift+Tab',  desc: 'Previous button' },
      { key: '/',          desc: 'Open search/filter' },
      { key: 'F',          desc: 'Toggle favorites filter (Voices/Music)' },
      { key: '*',          desc: 'Toggle favorite (Music tab)' },
      { key: 'M',          desc: 'Toggle music on/off (Music tab)' },
      { key: 'P',          desc: 'Toggle party mode (Agents tab)' },
      { key: 'R',          desc: 'Reset agent voice (Agents tab)' },
    ],
  },
  {
    title: 'Tab Color Guide',
    shortcuts: [
      { key: 'Blue   (#2196f3)',  desc: 'Settings tab footer' },
      { key: 'Teal   (#00695c)',  desc: 'Voices tab footer' },
      { key: 'Orange (#ff9800)',  desc: 'Music tab footer' },
      { key: 'Purple (#9c27b0)',  desc: 'Agents tab footer' },
      { key: 'Dark   (#455a64)',  desc: 'Readme tab footer' },
      { key: 'Gray   (#607d8b)',  desc: 'Help tab footer' },
      { key: 'Indigo (#3f51b5)',  desc: 'Install tab footer' },
    ],
  },
]);

/**
 * Return all shortcut sections.
 * @returns {{ title: string, shortcuts: { key: string, desc: string }[] }[]}
 */
export function getShortcutSections() {
  return [...SHORTCUT_SECTIONS];
}

// ---------------------------------------------------------------------------

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
 * Create the Help tab component.
 *
 * @param {object} screen   - Blessed screen instance
 * @param {object} services
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createHelpTab(screen, services) {
  if (IS_TEST) return createTestStub();

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
  // Build content text

  function _buildContent(filterText) {
    const lines = [];
    for (const section of SHORTCUT_SECTIONS) {
      lines.push(`{bold}{#546e7a-fg}── ${section.title} ${'─'.repeat(Math.max(0, 60 - section.title.length))}{/#546e7a-fg}{/bold}`);
      for (const { key, desc } of section.shortcuts) {
        const displayKey = key.padEnd(20);
        const displayDesc = desc;
        if (filterText && !key.toLowerCase().includes(filterText) && !desc.toLowerCase().includes(filterText)) {
          continue;
        }
        lines.push(`  {${COLORS.keyFg}-fg}${displayKey}{/${COLORS.keyFg}-fg}  {${COLORS.descFg}-fg}${displayDesc}{/${COLORS.descFg}-fg}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // Scrollable content

  const scrollBox = blessed.box({
    parent: box,
    top: 1,
    left: 2,
    width: '96%',
    bottom: 4,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: { ch: '│', style: { fg: COLORS.sectionHdr } },
    content: _buildContent(''),
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Search

  const searchBox = blessed.textbox({
    parent: box,
    bottom: 2,
    left: 10,
    width: 30,
    height: 1,
    hidden: true,
    inputOnFocus: true,
    keys: true,
    style: { fg: COLORS.keyFg, bg: '#1a237e', focus: { bg: '#283593' } },
  });

  blessed.text({
    parent: box,
    bottom: 2,
    left: 2,
    content: 'Search:',
    style: { fg: COLORS.descFg, bg: COLORS.contentBg },
  });

  searchBox.on('keypress', () => {
    setTimeout(() => {
      const filter = searchBox.getValue().toLowerCase().trim();
      scrollBox.setContent(_buildContent(filter));
      screen.render();
    }, 0);
  });

  searchBox.key(['escape'], () => {
    searchBox.clearValue();
    searchBox.hide();
    scrollBox.setContent(_buildContent(''));
    scrollBox.focus();
    screen.render();
  });

  scrollBox.key(['/'], () => {
    searchBox.show();
    searchBox.clearValue();
    searchBox.focus();
    screen.render();
  });

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,

    show() {
      box.show();
      scrollBox.setContent(_buildContent(''));
      screen.render();
    },

    hide() {
      box.hide();
      screen.render();
    },

    onFocus() {
      scrollBox.focus();
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
