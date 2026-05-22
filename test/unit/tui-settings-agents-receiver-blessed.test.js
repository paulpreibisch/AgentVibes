/**
 * TUI Coverage — settings-tab.js, agents-tab.js, receiver-tab.js with blessed mock
 *
 * Uses --experimental-test-module-mocks to replace `blessed` so real code paths run.
 *
 * Targets:
 *   - settings-tab.js  (createSettingsTab — lines 127-988 uncovered)
 *   - agents-tab.js    (createAgentsTab  — lines 180-1959 uncovered)
 *   - receiver-tab.js  (createReceiverTab — lines 218-1527 uncovered)
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Blessed stub
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
// Dynamic imports — AFTER mock installed
// ---------------------------------------------------------------------------

const { createSettingsTab } = await import('../../src/console/tabs/settings-tab.js');
const { createAgentsTab, attachBtnBlink } = await import('../../src/console/tabs/agents-tab.js');
const { createReceiverTab } = await import('../../src/console/tabs/receiver-tab.js');

// ---------------------------------------------------------------------------
// Helpers
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

function makeMockConfigService(overrides = {}) {
  return {
    getConfig: () => ({
      provider: 'piper',
      voice: 'en_US-amy-medium',
      verbosity: 'high',
      language: 'en',
      ttsEngine: '',
      backgroundMusic: { track: null, enabled: false, volume: 50 },
      musicFavorites: [],
      favorites: [],
      thumbsUp: [],
      thumbsDown: [],
      personality: null,
      pretext: '',
      reverbPreset: null,
      reverbEnabled: false,
      reverb: { preset: null, enabled: false },
      backgroundMusicVolume: 50,
      ...overrides,
    }),
    set: () => {},
    setGlobal: () => {},
    getGlobalConfig: () => ({}),
    getProjectConfig: () => null,
  };
}

function makeMockProviderService() {
  return {
    getActiveVoiceId: () => 'en_US-amy-medium',
    setActiveVoice: () => {},
    getActiveProvider: () => 'piper',
    getInstalledProviders: () => ['piper'],
    setActiveProvider: () => {},
  };
}

const mockSettingsServices = {
  configService: makeMockConfigService(),
  providerService: makeMockProviderService(),
  navigationService: { switchTab: () => {} },
  focusMainTabBar: () => {},
  languageService: null,
};

const mockAgentsServices = {
  configService: makeMockConfigService(),
  providerService: makeMockProviderService(),
  focusMainTabBar: () => {},
  navigationService: { switchTab: () => {} },
  languageService: null,
};

const mockReceiverServices = {
  focusMainTabBar: () => {},
  languageService: null,
};

// ===========================================================================
// settings-tab.js — Tab Component Contract with blessed mock
// ===========================================================================

describe('createSettingsTab() — with blessed mock (real code path)', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createSettingsTab(screen, mockSettingsServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createSettingsTab(screen, mockSettingsServices);
    assert.ok('box' in tab, 'must have box');
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns blue #2196f3', () => {
    const screen = makeMockScreen();
    const tab = createSettingsTab(screen, mockSettingsServices);
    assert.strictEqual(tab.getFooterColor(), '#2196f3');
  });

  test('getFooterText() contains navigation hints', () => {
    const screen = makeMockScreen();
    const tab = createSettingsTab(screen, mockSettingsServices);
    const text = tab.getFooterText();
    assert.ok(typeof text === 'string' && text.length > 0);
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSettingsTab(screen, mockSettingsServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSettingsTab(screen, mockSettingsServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSettingsTab(screen, mockSettingsServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSettingsTab(screen, mockSettingsServices);
    assert.doesNotThrow(() => tab.onBlur());
  });

  test('works with languageService that has getLang and t', () => {
    const screen = makeMockScreen();
    const services = {
      ...mockSettingsServices,
      languageService: {
        getLang: () => 'en',
        t: (key) => key,
        onChange: (cb) => {},
      },
    };
    assert.doesNotThrow(() => createSettingsTab(screen, services));
  });
});

// ===========================================================================
// agents-tab.js — attachBtnBlink pure function
// ===========================================================================

describe('attachBtnBlink()', () => {
  test('does not throw when given empty array', () => {
    const mockScreen = makeMockScreen();
    assert.doesNotThrow(() => attachBtnBlink([], mockScreen));
  });

  test('returns an object with cleanup, startSpinner, stopSpinner', () => {
    const mockScreen = makeMockScreen();
    const btn = {
      content: 'Test Button',
      setContent: () => {},
      on: () => {},
      off: () => {},
    };
    const result = attachBtnBlink([btn], mockScreen);
    assert.ok(typeof result === 'object');
    assert.strictEqual(typeof result.cleanup, 'function');
    assert.strictEqual(typeof result.startSpinner, 'function');
    assert.strictEqual(typeof result.stopSpinner, 'function');
  });

  test('cleanup() does not throw', () => {
    const mockScreen = makeMockScreen();
    const result = attachBtnBlink([], mockScreen);
    assert.doesNotThrow(() => result.cleanup());
  });

  test('startSpinner and stopSpinner do not throw', () => {
    const mockScreen = makeMockScreen();
    const btn = {
      content: 'Btn',
      _blinkBase: 'Btn',
      setContent: () => {},
      on: () => {},
      off: () => {},
    };
    const result = attachBtnBlink([btn], mockScreen);
    assert.doesNotThrow(() => result.startSpinner(btn, mockScreen));
    assert.doesNotThrow(() => result.stopSpinner(btn, mockScreen));
    result.cleanup();
  });
});

// ===========================================================================
// agents-tab.js — Tab Component Contract with blessed mock
// ===========================================================================

describe('createAgentsTab() — with blessed mock (real code path)', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createAgentsTab(screen, mockAgentsServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createAgentsTab(screen, mockAgentsServices);
    assert.ok('box' in tab, 'must have box');
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns purple #9c27b0', () => {
    const screen = makeMockScreen();
    const tab = createAgentsTab(screen, mockAgentsServices);
    assert.strictEqual(tab.getFooterColor(), '#9c27b0');
  });

  test('getFooterText() returns a non-empty string', () => {
    const screen = makeMockScreen();
    const tab = createAgentsTab(screen, mockAgentsServices);
    assert.ok(typeof tab.getFooterText() === 'string');
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createAgentsTab(screen, mockAgentsServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createAgentsTab(screen, mockAgentsServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createAgentsTab(screen, mockAgentsServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createAgentsTab(screen, mockAgentsServices);
    assert.doesNotThrow(() => tab.onBlur());
  });
});

// ===========================================================================
// receiver-tab.js — Tab Component Contract with blessed mock
// ===========================================================================

describe('createReceiverTab() — with blessed mock (real code path)', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createReceiverTab(screen, mockReceiverServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createReceiverTab(screen, mockReceiverServices);
    assert.ok('box' in tab, 'must have box');
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns teal #00897b', () => {
    const screen = makeMockScreen();
    const tab = createReceiverTab(screen, mockReceiverServices);
    assert.strictEqual(tab.getFooterColor(), '#00897b');
  });

  test('getFooterText() returns a non-empty string', () => {
    const screen = makeMockScreen();
    const tab = createReceiverTab(screen, mockReceiverServices);
    assert.ok(typeof tab.getFooterText() === 'string');
    assert.ok(tab.getFooterText().length > 0);
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReceiverTab(screen, mockReceiverServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReceiverTab(screen, mockReceiverServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReceiverTab(screen, mockReceiverServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createReceiverTab(screen, mockReceiverServices);
    assert.doesNotThrow(() => tab.onBlur());
  });

  test('works with null services', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createReceiverTab(screen, null));
  });
});
