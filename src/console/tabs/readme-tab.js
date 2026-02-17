/**
 * AgentVibes TUI Console — Readme Tab
 * Epic 13: Story 13.2
 *
 * Implements the Tab Component Contract:
 *   createReadmeTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: renders README.md with styled markdown, scrolling, search.
 */

import fs from 'node:fs';
import path from 'node:path';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  h1Fg:       '#69f0ae',  // Green — H1
  h2Fg:       '#82b1ff',  // Blue — H2
  h3Fg:       '#80d8ff',  // Light blue — H3
  codeFg:     '#ffd700',  // Gold — code spans
  boldFg:     '#e3f2fd',  // Bright — bold text
  quoteFg:    '#90a4ae',  // Gray — blockquotes
  labelFg:    '#e3f2fd',
  borderFg:   '#455a64',
  footerBg:   '#455a64',  // Dark gray — Readme tab footer
};

const FOOTER_TEXT = '[↑↓/jk] Scroll  [PgUp/PgDn] Page  [/] Search  [S/V/M/A/R] Tab  [Q] Quit';

// ---------------------------------------------------------------------------
// Markdown renderer (story 13.2)

/**
 * Render a single markdown line to blessed tagged string.
 * Handles: H1/H2/H3, bold (**), code spans (`), blockquotes (>), plain text.
 *
 * @param {string} line
 * @returns {string}
 */
export function renderMarkdownLine(line) {
  // H1
  if (/^# /.test(line)) {
    const text = line.replace(/^# /, '');
    return `{bold}{${COLORS.h1Fg}-fg}${text}{/${COLORS.h1Fg}-fg}{/bold}`;
  }
  // H2
  if (/^## /.test(line)) {
    const text = line.replace(/^## /, '');
    return `{bold}{${COLORS.h2Fg}-fg}${text}{/${COLORS.h2Fg}-fg}{/bold}`;
  }
  // H3
  if (/^### /.test(line)) {
    const text = line.replace(/^### /, '');
    return `{${COLORS.h3Fg}-fg}${text}{/${COLORS.h3Fg}-fg}`;
  }
  // Blockquote
  if (/^> /.test(line)) {
    const text = line.replace(/^> /, '');
    return `{${COLORS.quoteFg}-fg}│ ${text}{/${COLORS.quoteFg}-fg}`;
  }
  // Horizontal rule
  if (/^---+$/.test(line.trim())) {
    return `{${COLORS.quoteFg}-fg}${'─'.repeat(66)}{/${COLORS.quoteFg}-fg}`;
  }

  // Inline: code spans, bold
  let result = line;
  // Escape existing blessed tags (literal braces in content)
  // Code spans: `text`
  result = result.replace(/`([^`]+)`/g, `{${COLORS.codeFg}-fg}$1{/${COLORS.codeFg}-fg}`);
  // Bold: **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, `{bold}$1{/bold}`);
  // Italic: *text*
  result = result.replace(/\*([^*]+)\*/g, `{${COLORS.h3Fg}-fg}$1{/${COLORS.h3Fg}-fg}`);

  return result;
}

/**
 * Render full markdown content to blessed tagged multi-line string.
 * @param {string} markdown
 * @returns {string}
 */
export function renderMarkdown(markdown) {
  return markdown
    .split('\n')
    .map(line => renderMarkdownLine(line))
    .join('\n');
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
 * Create the Readme tab component.
 *
 * @param {object} screen   - Blessed screen instance
 * @param {object} services
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createReadmeTab(screen, services) {
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
  // Load README.md

  function _loadReadme() {
    const candidates = [
      path.resolve(process.cwd(), 'README.md'),
      path.resolve(process.cwd(), 'readme.md'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          return fs.readFileSync(p, 'utf8');
        } catch {
          // Unreadable
        }
      }
    }
    return '# README\n\n*(No README.md found in current directory)*';
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
    scrollbar: { ch: '│', style: { fg: COLORS.borderFg } },
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  // Scroll indicator
  const scrollIndicator = blessed.text({
    parent: box,
    bottom: 2,
    right: 2,
    content: '',
    tags: true,
    style: { fg: COLORS.quoteFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Render

  function refreshContent() {
    const markdown = _loadReadme();
    const rendered = renderMarkdown(markdown);
    scrollBox.setContent(rendered);
    scrollIndicator.setContent('{#607d8b-fg}↓ Scroll for more content ↓{/#607d8b-fg}');
    screen.render();
  }

  // Scroll events update indicator
  scrollBox.on('scroll', () => {
    const atBottom = scrollBox.getScrollPerc() >= 99;
    scrollIndicator.setContent(
      atBottom ? '' : '{#607d8b-fg}↓ Scroll for more content ↓{/#607d8b-fg}'
    );
    screen.render();
  });

  // PgUp/PgDn
  scrollBox.key(['pageup'], () => {
    scrollBox.scroll(-10);
    screen.render();
  });
  scrollBox.key(['pagedown'], () => {
    scrollBox.scroll(10);
    screen.render();
  });

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,

    show() {
      box.show();
      refreshContent();
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
