/**
 * TUI Coverage — app.js (AgentVibesConsole) with blessed mock
 *
 * Uses --experimental-test-module-mocks to replace `blessed` so the real
 * initialization code paths run without a real terminal.
 *
 * Targets: src/console/app.js lines 75+ (non-test-mode initialization),
 * which covers _createScreen, _createHeader, _createTabBar, _createContentArea,
 * _createContextFooter, _createFooter, _registerHandlers, _createPlaceholderTabs,
 * _initNavigation, _createRealTabs, _createModalOverlay.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Blessed stub — same as the other blessed mock test files
// ---------------------------------------------------------------------------

function makeWidget(tag = 'widget') {
  return {
    _tag: tag,
    append: () => {},
    remove: () => {},
    prepend: () => {},
    insert: () => {},
    insertBefore: () => {},
    insertAfter: () => {},
    setContent: () => {},
    getContent: () => '',
    setLabel: () => {},
    show: () => {},
    hide: () => {},
    toggle: () => {},
    focus: () => {},
    press: () => {},
    scroll: () => {},
    scrollTo: () => {},
    getScroll: () => 0,
    getScrollPerc: () => 0,
    setScrollPerc: () => {},
    setItems: () => {},
    clearItems: () => {},
    addItem: () => {},
    getItem: (i) => null,
    select: () => {},
    move: () => {},
    up: () => {},
    down: () => {},
    getValue: () => '',
    setValue: () => {},
    clearValue: () => {},
    input: (cb) => cb && cb(null, ''),
    prompt: (msg, cb) => cb && cb(null, ''),
    on: () => {},
    off: () => {},
    once: () => {},
    removeListener: () => {},
    emit: () => {},
    key: () => {},
    destroy: () => {},
    free: () => {},
    render: () => {},
    setFront: () => {},
    setBack: () => {},
    setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
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
    ritems: [],
    selected: 0,
    focused: null,
    // Screen-specific properties needed by app.js / navigation-service
    program: { clear: () => {} },
    clearRegion: () => {},
    cols: 120,
    rows: 40,
    olines: [],
  };
}

const blessedStub = {
  box:      (opts) => makeWidget('box'),
  text:     (opts) => makeWidget('text'),
  textbox:  (opts) => makeWidget('textbox'),
  textarea: (opts) => makeWidget('textarea'),
  list:     (opts) => makeWidget('list'),
  listbar:  (opts) => makeWidget('listbar'),
  button:   (opts) => makeWidget('button'),
  prompt:   (opts) => makeWidget('prompt'),
  screen:   (opts) => makeWidget('screen'),
  escape:   (str)  => str || '',
};

// Install mock BEFORE loading any module that imports blessed
await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Dynamic import — AFTER mock installed
// ---------------------------------------------------------------------------

const { AgentVibesConsole, launchConsole } =
  await import('../../src/console/app.js');

// ===========================================================================
// AgentVibesConsole — real code path (non-test-mode)
// ===========================================================================

describe('AgentVibesConsole — constructor', () => {
  test('constructs without throwing', () => {
    assert.doesNotThrow(() => new AgentVibesConsole());
  });

  test('default startTab is settings', () => {
    const app = new AgentVibesConsole();
    assert.strictEqual(app.startTab, 'settings');
  });

  test('remaps install tab to setup', () => {
    const app = new AgentVibesConsole({ startTab: 'install' });
    assert.strictEqual(app.startTab, 'setup');
  });

  test('stores startTab option', () => {
    const app = new AgentVibesConsole({ startTab: 'music' });
    assert.strictEqual(app.startTab, 'music');
  });

  test('_testMode defaults to false', () => {
    const app = new AgentVibesConsole();
    assert.strictEqual(app._testMode, false);
  });
});

describe('AgentVibesConsole.init() — with blessed mock (real code path)', () => {
  test('init() resolves without throwing', async () => {
    const app = new AgentVibesConsole();
    await assert.doesNotReject(() => app.init());
  });

  test('screen is set after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(app.screen !== null, 'screen must be set after init');
  });

  test('tabs object is populated after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(typeof app.tabs === 'object');
    assert.ok(Object.keys(app.tabs).length > 0, 'must have at least one tab');
  });

  test('navigationService is set after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(app.navigationService !== null);
  });

  test('tabBarBox is set after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(app.tabBarBox !== null && app.tabBarBox !== undefined);
  });

  test('contentArea is set after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(app.contentArea !== null && app.contentArea !== undefined);
  });

  test('contextFooterBox is set after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(app.contextFooterBox !== null && app.contextFooterBox !== undefined);
  });

  test('modalOverlay is set after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(app.modalOverlay !== null && app.modalOverlay !== undefined);
  });

  test('settings tab exists after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok('settings' in app.tabs, 'settings tab must be created');
    assert.strictEqual(typeof app.tabs['settings'].show, 'function');
  });

  test('voices tab is NOT created (removed — voice pickers live in Setup)', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok(!('voices' in app.tabs), 'voices tab must NOT be created');
  });

  test('agents tab exists after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok('agents' in app.tabs, 'agents tab must be created');
  });

  test('setup tab exists after init()', async () => {
    const app = new AgentVibesConsole();
    await app.init();
    assert.ok('setup' in app.tabs, 'setup tab must be created');
  });

  test('starts from music tab without throwing', async () => {
    const app = new AgentVibesConsole({ startTab: 'music' });
    await assert.doesNotReject(() => app.init());
  });

  test('starts from agents tab without throwing', async () => {
    const app = new AgentVibesConsole({ startTab: 'agents' });
    await assert.doesNotReject(() => app.init());
  });

  test('starts from help tab without throwing', async () => {
    const app = new AgentVibesConsole({ startTab: 'help' });
    await assert.doesNotReject(() => app.init());
  });
});
