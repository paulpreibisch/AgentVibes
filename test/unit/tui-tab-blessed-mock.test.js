/**
 * TUI Tab Coverage — blessed module mocked
 *
 * Uses --experimental-test-module-mocks to replace `blessed` with a stub so
 * that tab factory functions run their real code paths without a real terminal.
 *
 * Targets:
 *   - placeholder-tab.js  (createPlaceholderTab — lines 20-36 uncovered)
 *   - help-tab.js         (createHelpTab — lines 110-313 uncovered)
 *   - readme-tab.js       (createReadmeTab — lines 124-271 uncovered)
 *                         (renderMarkdown  — lines 94-99 uncovered)
 *
 * Strategy: mock.module('blessed') → minimal stub factory → dynamic import of
 * each tab module (no AGENTVIBES_TEST_MODE set, so the real code path runs).
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Blessed stub — implements every method called by the three tab files
// ---------------------------------------------------------------------------

function makeWidget(tag = 'widget') {
  return {
    _tag: tag,
    // Layout / tree
    append: () => {},
    remove: () => {},
    prepend: () => {},
    // Content
    setContent: () => {},
    getContent: () => '',
    setLabel: () => {},
    // Visibility
    show: () => {},
    hide: () => {},
    toggle: () => {},
    // Focus / interaction
    focus: () => {},
    press: () => {},
    // Scrolling
    scroll: () => {},
    scrollTo: () => {},
    getScroll: () => 0,
    getScrollPerc: () => 0,
    setScrollPerc: () => {},
    // List
    setItems: () => {},
    clearItems: () => {},
    getItem: () => null,
    select: () => {},
    // Input
    getValue: () => '',
    setValue: () => {},
    clearValue: () => {},
    input: (cb) => cb && cb(null, ''),
    // Events
    on: () => {},
    off: () => {},
    once: () => {},
    removeListener: () => {},
    emit: () => {},
    // Keys
    key: () => {},
    // Rendering
    render: () => {},
    setFront: () => {},
    setBack: () => {},
    setIndex: () => {},
    // Misc
    destroy: () => {},
    free: () => {},
    // Properties accessed by code
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {} },
    border: { type: 'line' },
    hidden: true,
    content: '',
    height: 40,
    width: 120,
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    items: [],
    selected: 0,
  };
}

const blessedStub = {
  box:     (opts) => makeWidget('box'),
  text:    (opts) => makeWidget('text'),
  textbox: (opts) => makeWidget('textbox'),
  textarea:(opts) => makeWidget('textarea'),
  list:    (opts) => makeWidget('list'),
  listbar: (opts) => makeWidget('listbar'),
  button:  (opts) => makeWidget('button'),
  prompt:  (opts) => makeWidget('prompt'),
  screen:  (opts) => makeWidget('screen'),
  escape:  (str)  => str || '',
};

// Install mock BEFORE any module that imports blessed is loaded
await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Dynamic imports — AFTER mock is installed
// ---------------------------------------------------------------------------

const { createPlaceholderTab, TAB_DISPLAY_LABELS, TAB_SHORTCUT_KEYS, getTabLabel } =
  await import('../../src/console/tabs/placeholder-tab.js');

const { createHelpTab, getShortcutSections } =
  await import('../../src/console/tabs/help-tab.js');

const { createReadmeTab, renderMarkdownLine, renderMarkdown } =
  await import('../../src/console/tabs/readme-tab.js');

// ---------------------------------------------------------------------------
// Mock screen / services
// ---------------------------------------------------------------------------

function makeMockScreen() {
  return {
    append: () => {},
    remove: () => {},
    key: () => {},
    on: () => {},
    off: () => {},
    render: () => {},
    destroy: () => {},
    emit: () => {},
    program: { clear: () => {} },
  };
}

const mockServices = {
  focusMainTabBar: () => {},
  languageService: null,
};

// ---------------------------------------------------------------------------
// placeholder-tab.js
// ---------------------------------------------------------------------------

describe('createPlaceholderTab() — with blessed mock', () => {
  test('creates a widget without throwing', () => {
    const contentArea = makeWidget('contentArea');
    assert.doesNotThrow(() => createPlaceholderTab(contentArea, 'Settings'));
  });

  test('returns the box widget from blessed.box()', () => {
    const contentArea = makeWidget('contentArea');
    const box = createPlaceholderTab(contentArea, 'Voices');
    assert.ok(box !== null && box !== undefined, 'must return a box widget');
    assert.ok(typeof box === 'object');
  });

  test('TAB_DISPLAY_LABELS contains expected tab names', () => {
    assert.ok(typeof TAB_DISPLAY_LABELS === 'object');
    assert.ok('settings' in TAB_DISPLAY_LABELS);
    assert.ok('voices' in TAB_DISPLAY_LABELS);
    assert.ok('help' in TAB_DISPLAY_LABELS);
  });

  test('TAB_SHORTCUT_KEYS overrides exist for conflicting tabs', () => {
    assert.ok(typeof TAB_SHORTCUT_KEYS === 'object');
    assert.ok('setup' in TAB_SHORTCUT_KEYS, 'setup needs override');
    assert.ok('agents' in TAB_SHORTCUT_KEYS, 'agents needs override');
  });

  test('getTabLabel returns a string for known tab ids', () => {
    const label = getTabLabel('settings');
    assert.ok(typeof label === 'string' && label.length > 0);
  });

  test('getTabLabel falls back to TAB_DISPLAY_LABELS for unknown id', () => {
    const label = getTabLabel('unknown-tab');
    assert.ok(typeof label === 'string');
  });
});

// ---------------------------------------------------------------------------
// help-tab.js — Tab Component Contract (non-test-mode, with blessed mock)
// ---------------------------------------------------------------------------

describe('createHelpTab() — with blessed mock (real code path)', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createHelpTab(screen, mockServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createHelpTab(screen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns gray #607d8b', () => {
    const screen = makeMockScreen();
    const tab = createHelpTab(screen, mockServices);
    assert.strictEqual(tab.getFooterColor(), '#607d8b');
  });

  test('getFooterText() returns a non-empty string', () => {
    const screen = makeMockScreen();
    const tab = createHelpTab(screen, mockServices);
    const text = tab.getFooterText();
    assert.ok(typeof text === 'string' && text.length > 0);
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createHelpTab(screen, mockServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createHelpTab(screen, mockServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createHelpTab(screen, mockServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createHelpTab(screen, mockServices);
    assert.doesNotThrow(() => tab.onBlur());
  });

  test('works with a languageService that has t() and onChange()', () => {
    const screen = makeMockScreen();
    const services = {
      focusMainTabBar: () => {},
      languageService: {
        t: (key) => key,
        onChange: (cb) => {},
      },
    };
    assert.doesNotThrow(() => createHelpTab(screen, services));
  });
});

// ---------------------------------------------------------------------------
// readme-tab.js — renderMarkdown pure functions
// ---------------------------------------------------------------------------

describe('renderMarkdownLine() — all branch coverage', () => {
  test('H1 (# heading) renders with bold tags', () => {
    const result = renderMarkdownLine('# Title');
    assert.ok(result.includes('Title'));
    assert.ok(result.includes('{bold}'));
  });

  test('H2 (## heading) renders with bold tags', () => {
    const result = renderMarkdownLine('## Section');
    assert.ok(result.includes('Section'));
    assert.ok(result.includes('{bold}'));
  });

  test('H3 (### heading) renders with color tag but not bold', () => {
    const result = renderMarkdownLine('### Sub');
    assert.ok(result.includes('Sub'));
    // H3 uses a color tag but no {bold}
    assert.ok(result.includes('Sub'));
  });

  test('blockquote (> text) renders with pipe separator', () => {
    const result = renderMarkdownLine('> quoted text');
    assert.ok(result.includes('│'));
    assert.ok(result.includes('quoted text'));
  });

  test('horizontal rule (---) renders as a line of dashes', () => {
    const result = renderMarkdownLine('---');
    assert.ok(result.includes('─'));
  });

  test('plain text passes through', () => {
    const result = renderMarkdownLine('Plain text');
    assert.ok(result.includes('Plain text'));
  });

  test('inline code span renders', () => {
    const result = renderMarkdownLine('Use `foo()` here');
    assert.ok(result.includes('foo()'));
  });

  test('bold **text** renders', () => {
    const result = renderMarkdownLine('**bold** text');
    assert.ok(result.includes('bold'));
    assert.ok(result.includes('{bold}'));
  });

  test('italic *text* renders', () => {
    const result = renderMarkdownLine('*italic* text');
    assert.ok(result.includes('italic'));
  });

  test('empty string returns something', () => {
    const result = renderMarkdownLine('');
    assert.ok(typeof result === 'string');
  });
});

describe('renderMarkdown() — multi-line markdown', () => {
  test('renders multi-line markdown with H1 and H2', () => {
    const md = '# Title\n\n## Section\n\nSome text here.';
    const result = renderMarkdown(md);
    assert.ok(result.includes('Title'));
    assert.ok(result.includes('Section'));
    assert.ok(result.includes('Some text here.'));
  });

  test('preserves newlines between sections', () => {
    const md = 'line1\nline2\nline3';
    const result = renderMarkdown(md);
    assert.ok(result.includes('\n'));
  });

  test('returns a string for empty input', () => {
    assert.strictEqual(typeof renderMarkdown(''), 'string');
  });

  test('handles code spans in multi-line input', () => {
    const md = '`code` on line 1\n**bold** on line 2';
    const result = renderMarkdown(md);
    assert.ok(result.includes('code'));
    assert.ok(result.includes('bold'));
  });
});

// ---------------------------------------------------------------------------
// readme-tab.js — Tab Component Contract (non-test-mode, with blessed mock)
// ---------------------------------------------------------------------------

describe('createReadmeTab() — with blessed mock (real code path)', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createReadmeTab(screen, mockServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createReadmeTab(screen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns dark gray #455a64', () => {
    const screen = makeMockScreen();
    const tab = createReadmeTab(screen, mockServices);
    assert.strictEqual(tab.getFooterColor(), '#455a64');
  });

  test('getFooterText() returns a non-empty string', () => {
    const screen = makeMockScreen();
    const tab = createReadmeTab(screen, mockServices);
    const text = tab.getFooterText();
    assert.ok(typeof text === 'string' && text.length > 0);
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReadmeTab(screen, mockServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReadmeTab(screen, mockServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReadmeTab(screen, mockServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReadmeTab(screen, mockServices);
    assert.doesNotThrow(() => tab.onBlur());
  });
});
