/**
 * Epic 13: Help & Readme Tabs
 * Tests for help-tab.js and readme-tab.js exports and Tab Component Contract
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('createHelpTab — Tab Component Contract', () => {
  let createHelpTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/help-tab.js');
    createHelpTab = mod.createHelpTab;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof createHelpTab, 'function');
  });

  test('returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createHelpTab(mockScreen, {});
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns gray #607d8b', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createHelpTab(mockScreen, {});
    assert.strictEqual(tab.getFooterColor(), '#607d8b');
  });
});

// ---------------------------------------------------------------------------

describe('getShortcutSections', () => {
  let getShortcutSections;
  before(async () => {
    const mod = await import('../../src/console/tabs/help-tab.js');
    getShortcutSections = mod.getShortcutSections;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof getShortcutSections, 'function');
  });

  test('returns at least 2 sections', () => {
    const sections = getShortcutSections();
    assert.ok(sections.length >= 2);
  });

  test('each section has title and shortcuts array', () => {
    const sections = getShortcutSections();
    for (const s of sections) {
      assert.ok(s.title, 'section has title');
      assert.ok(Array.isArray(s.shortcuts), 'section has shortcuts array');
    }
  });
});

// ---------------------------------------------------------------------------

describe('createReadmeTab — Tab Component Contract', () => {
  let createReadmeTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/readme-tab.js');
    createReadmeTab = mod.createReadmeTab;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof createReadmeTab, 'function');
  });

  test('returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createReadmeTab(mockScreen, {});
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns dark gray #455a64', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createReadmeTab(mockScreen, {});
    assert.strictEqual(tab.getFooterColor(), '#455a64');
  });
});

// ---------------------------------------------------------------------------

describe('renderMarkdownLine', () => {
  let renderMarkdownLine;
  before(async () => {
    const mod = await import('../../src/console/tabs/readme-tab.js');
    renderMarkdownLine = mod.renderMarkdownLine;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof renderMarkdownLine, 'function');
  });

  test('H1 line contains color tags', () => {
    const result = renderMarkdownLine('# My Title');
    assert.ok(result.includes('My Title'));
    assert.ok(result.includes('{'));  // blessed tags
  });

  test('H2 line renders correctly', () => {
    const result = renderMarkdownLine('## Section');
    assert.ok(result.includes('Section'));
  });

  test('plain text passes through', () => {
    const result = renderMarkdownLine('Hello world');
    assert.ok(result.includes('Hello world'));
  });

  test('code span renders with tags', () => {
    const result = renderMarkdownLine('Use `foo()` here');
    assert.ok(result.includes('foo()'));
  });

  test('bold text renders', () => {
    const result = renderMarkdownLine('**bold** text');
    assert.ok(result.includes('bold'));
  });
});
