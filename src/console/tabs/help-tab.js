/**
 * AgentVibes TUI Console — Help Tab
 * Epic 13: Story 13.1
 *
 * Implements the Tab Component Contract:
 *   createHelpTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: keyboard shortcuts reference, two sections, [/] search.
 */

import { t } from '../../i18n/strings.js';

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
  keyFg:      '#ffff00',  // Yellow — keyboard shortcuts
  descFg:     '#90a4ae',  // Gray — descriptions
  borderFg:   '#607d8b',
  footerBg:   '#607d8b',  // Gray — Help tab footer
};

// ---------------------------------------------------------------------------

/**
 * Return all shortcut sections.
 * @returns {{ title: string, shortcuts: { key: string, desc: string }[] }[]}
 */
export function getShortcutSections() {
  return [
    {
      title: 'Global Shortcuts',
      shortcuts: [
        { key: 'Q',   desc: 'Quit the console' },
        { key: 'Ctrl+C', desc: 'Force quit' },
        { key: 'S',   desc: 'Switch to Settings tab' },
        { key: 'V',   desc: 'Switch to Voices tab' },
        { key: 'M',   desc: 'Switch to Music tab' },
        { key: 'R',   desc: 'Switch to Readme tab' },
        { key: 'H',   desc: 'Switch to Help tab' },
        { key: 'I',   desc: 'Switch to Install tab' },
        { key: 'Esc', desc: 'Close modal / go back' },
      ],
    },
    {
      title: 'Navigation Shortcuts',
      shortcuts: [
        { key: '↑↓ / j k', desc: 'Navigate lists' },
        { key: 'Enter',     desc: 'Select / activate' },
        { key: 'Space',     desc: 'Toggle / preview' },
        { key: 'Tab',       desc: 'Next button' },
        { key: 'Shift+Tab', desc: 'Previous button' },
        { key: '/',         desc: 'Open search/filter' },
        { key: 'F',         desc: 'Toggle favorites filter (Voices/Music)' },
        { key: '*',         desc: 'Toggle favorite (Music tab)' },
        { key: 'M',         desc: 'Toggle music on/off (Music tab)' },
      ],
    },
    {
      title: 'Tab Color Guide',
      shortcuts: [
        { key: 'Blue   (#2196f3)', desc: 'Settings tab footer' },
        { key: 'Teal   (#00695c)', desc: 'Voices tab footer' },
        { key: 'Orange (#ff9800)', desc: 'Music tab footer' },
        { key: 'Dark   (#455a64)', desc: 'Readme tab footer' },
        { key: 'Gray   (#607d8b)', desc: 'Help tab footer' },
        { key: 'Indigo (#3f51b5)', desc: 'Install tab footer' },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------

const _FOOTER_TEXT_EN = '[↑↓/jk] Scroll  [/] Search  [PgUp/PgDn] Page  [S/V/M/A/R] Tab  [Q] Quit';

function createTestStub() {
  return {
    box: {},
    show: () => {},
    hide: () => {},
    onFocus: () => {},
    onBlur: () => {},
    getFooterText: () => _FOOTER_TEXT_EN,
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

  const { focusMainTabBar, languageService } = services;
  const _tl = (key) => languageService ? languageService.t(key) : t('en', key);

  function _buildSections() {
    return [
      {
        title: _tl('helpSectionGlobal'),
        shortcuts: [
          { key: 'Q',         desc: _tl('helpQuit') },
          { key: 'Ctrl+C',    desc: _tl('helpForceQuit') },
          { key: 'S',         desc: _tl('helpSwitchSettings') },
          { key: 'V',         desc: _tl('helpSwitchVoices') },
          { key: 'M',         desc: _tl('helpSwitchMusic') },
          { key: 'R',         desc: _tl('helpSwitchReadme') },
          { key: 'H',         desc: _tl('helpSwitchHelp') },
          { key: 'I',         desc: _tl('helpSwitchInstall') },
          { key: 'Esc',       desc: _tl('helpCloseModal') },
        ],
      },
      {
        title: _tl('helpSectionNavigation'),
        shortcuts: [
          { key: '↑↓ / j k',  desc: _tl('helpNavigateLists') },
          { key: 'Enter',      desc: _tl('helpSelectActivate') },
          { key: 'Space',      desc: _tl('helpTogglePreview') },
          { key: 'Tab',        desc: _tl('helpNextButton') },
          { key: 'Shift+Tab',  desc: _tl('helpPrevButton') },
          { key: '/',          desc: _tl('helpOpenSearch') },
          { key: 'F',          desc: _tl('helpToggleFavFilter') },
          { key: '*',          desc: _tl('helpToggleFav') },
          { key: 'M',          desc: _tl('helpToggleMusic') },
        ],
      },
      {
        title: _tl('helpSectionColors'),
        shortcuts: [
          { key: 'Blue   (#2196f3)', desc: _tl('helpColorSettings') },
          { key: 'Teal   (#00695c)', desc: _tl('helpColorVoices') },
          { key: 'Orange (#ff9800)', desc: _tl('helpColorMusic') },
          { key: 'Dark   (#455a64)', desc: _tl('helpColorReadme') },
          { key: 'Gray   (#607d8b)', desc: _tl('helpColorHelp') },
          { key: 'Indigo (#3f51b5)', desc: _tl('helpColorInstall') },
        ],
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Container

  const box = blessed.box({
    parent: screen,
    top: 5,
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
    for (const section of _buildSections()) {
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
    style: { fg: COLORS.keyFg, bg: '#1a3a5c', focus: { bg: '#245a80' } },
  });

  const searchLabel = blessed.text({
    parent: box,
    bottom: 2,
    left: 2,
    content: _tl('helpSearchLabel'),
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

  // [↑] at top of content → jump to main header tab bar
  scrollBox.key(['up'], () => {
    if (scrollBox.getScroll() === 0 && typeof focusMainTabBar === 'function') {
      focusMainTabBar();
    }
  });

  // Escape → return to header tab bar
  scrollBox.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
  });

  // -------------------------------------------------------------------------
  // Language change handler

  if (languageService) {
    languageService.onChange(() => {
      scrollBox.setContent(_buildContent(''));
      searchLabel.setContent(_tl('helpSearchLabel'));
      screen.render();
    });
  }

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
      return _tl('helpFooter');
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
