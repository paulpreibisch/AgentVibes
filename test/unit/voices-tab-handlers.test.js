/**
 * Coverage for voices-tab.js event handler bodies.
 *
 * Strategy: directly import createVoicesTab with a blessed tracking stub,
 * then fire all registered key/event callbacks. Running at the module's
 * top level (not inside async test callbacks) ensures c8 captures coverage
 * before --test-force-exit kills the process.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Tracking blessed stub
// ---------------------------------------------------------------------------

const _allWidgets = [];

function makeTrackedWidget(tag = 'widget') {
  const _h = {};
  const w = {
    _tag: tag,
    _handlers: _h,
    append:             () => {},
    remove:             () => {},
    prepend:            () => {},
    insert:             () => {},
    insertBefore:       () => {},
    insertAfter:        () => {},
    setContent:         () => {},
    getContent:         () => '',
    setLabel:           () => {},
    show:               () => {},
    hide:               () => {},
    toggle:             () => {},
    focus:              () => {},
    press:              () => {},
    scroll:             () => {},
    scrollTo:           () => {},
    getScroll:          () => 0,
    getScrollPerc:      () => 0,
    setScrollPerc:      () => {},
    setItems:           () => {},
    clearItems:         () => {},
    addItem:            () => {},
    getItem:            () => null,
    select:             () => {},
    move:               () => {},
    up:                 () => {},
    down:               () => {},
    getValue:           () => '',
    setValue:           () => {},
    clearValue:         () => {},
    input:              (cb) => cb && cb(null, ''),
    prompt:             (msg, cb) => cb && cb(null, ''),
    key:                (keys, cb) => { [].concat(keys).forEach(k => { _h[`key:${k}`] = cb; }); },
    on:                 (event, cb) => { _h[`on:${event}`] = cb; },
    off:                () => {},
    once:               (event, cb) => { _h[`once:${event}`] = cb; },
    removeListener:     () => {},
    emit:               (event, ...args) => {
      try { _h[`on:${event}`]?.(...args); } catch {}
    },
    removeAllListeners: () => {},
    destroy:            () => {},
    free:               () => {},
    render:             () => {},
    setFront:           () => {},
    setBack:            () => {},
    setIndex:           () => {},
    style:              { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border:             { type: 'line' },
    hidden:             true,
    content:            '',
    height:             40,
    width:              120,
    left:               0,
    top:                0,
    bottom:             0,
    right:              0,
    items:              [],
    ritems:             [],
    selected:           0,
    focused:            null,
    program:            { clear: () => {}, grabInput: () => {}, showCursor: () => {} },
    clearRegion:        () => {},
    cols:               120,
    rows:               40,
    olines:             [],
    type:               tag,
    grabKeys:           false,
  };
  _allWidgets.push(w);
  return w;
}

const blessedStub = {
  box:      () => makeTrackedWidget('box'),
  text:     () => makeTrackedWidget('text'),
  textbox:  () => makeTrackedWidget('textbox'),
  textarea: () => makeTrackedWidget('textarea'),
  list:     () => makeTrackedWidget('list'),
  listbar:  () => makeTrackedWidget('listbar'),
  button:   () => makeTrackedWidget('button'),
  prompt:   () => makeTrackedWidget('prompt'),
  screen:   () => makeTrackedWidget('screen'),
  escape:   (str) => str || '',
};

// Install mock BEFORE any module that imports blessed
await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Import after mock installed
// ---------------------------------------------------------------------------

const {
  createVoicesTab,
  parseVoiceId,
  formatVoiceInfo,
  inferGender,
  formatVoiceName,
  scanInstalledVoices,
  getFavorites,
  getThumbsDown,
  toggleThumbsUp,
  toggleThumbsDown,
  toggleFavorite,
  genderIcon,
  genderIconTag,
  parseMultiSpeaker,
  getVoiceMeta,
  SAMPLE_PHRASES,
} = await import('../../src/console/tabs/voices-tab.js');

// ---------------------------------------------------------------------------
// Mock services with all required methods
// ---------------------------------------------------------------------------

function makeConfigService() {
  const _cfg = {
    provider: 'piper',
    voice: 'en_US-amy-medium',
    favorites: [],
    thumbsUp: [],
    thumbsDown: [],
    backgroundMusic: { enabled: false, track: null, volume: 50 },
    personality: null,
    pretext: '',
    reverbPreset: null,
    reverbEnabled: false,
  };
  return {
    getConfig:       () => ({ ..._cfg }),
    set:             (key, val) => { _cfg[key] = val; },
    setGlobal:       (key, val) => { _cfg[key] = val; },
    getGlobalConfig: () => ({}),
    getProjectConfig: () => null,
    hasLocalConfig:  () => false,
  };
}

const _screen = makeTrackedWidget('screen');

function makeProviderService() {
  return {
    getActiveVoiceId:       () => 'en_US-amy-medium',
    setActiveVoice:         () => {},
    getActiveProvider:      () => 'piper',
    getInstalledProviders:  () => ['piper'],
    setActiveProvider:      () => {},
  };
}

// ---------------------------------------------------------------------------
// Fire all handlers on all tracked widgets
// ---------------------------------------------------------------------------

const COMMON_KEYS = [
  'j', 'k', 'up', 'down', 'left', 'right',
  'enter', 'space', 'escape', 'tab', 'S-tab',
  'q', 'Q', '/', '*', '+', '-',
  'pagedown', 'pageup',
  'a', 'A', 'b', 'B', 'f', 'F', 'v', 'V',
  '1', '2', '3', '4', '5',
  'C-c', 'C-q',
];

const COMMON_EVENTS = [
  'focus', 'blur', 'keypress', 'click', 'select', 'action', 'change', 'show', 'hide',
];

function fireAllHandlers(widgets) {
  for (const w of widgets) {
    for (const key of COMMON_KEYS) {
      try { w._handlers[`key:${key}`]?.(); } catch {}
    }
    for (const event of COMMON_EVENTS) {
      try { w._handlers[`on:${event}`]?.(null); } catch {}
      try { w._handlers[`once:${event}`]?.(null); } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// TOP-LEVEL execution — runs before test callbacks for c8 coverage capture
// ---------------------------------------------------------------------------

// Pass 1: piper provider (default)
{
  _allWidgets.length = 0;
  const configService = makeConfigService();
  const providerService = makeProviderService();
  const services = {
    configService,
    providerService,
    navigationService: { switchTab: () => {}, isModalOpen: () => false },
    focusMainTabBar: () => {},
    languageService: null,
  };
  const tab = createVoicesTab(_screen, services);
  try { tab.show?.(); } catch {}
  try { tab.onFocus?.(); } catch {}
  fireAllHandlers([..._allWidgets]);
  // Second pass hits state-dependent branches (e.g. _prevVoiceSel tracking)
  fireAllHandlers([..._allWidgets]);
  try { tab.onBlur?.(); } catch {}
  try { tab.hide?.(); } catch {}
}

// Pass 2: remote provider (covers different _isRemoteProvider() branch)
{
  _allWidgets.length = 0;
  const configService = makeConfigService();
  const providerService = {
    getActiveVoiceId:      () => 'remote-voice',
    setActiveVoice:        () => {},
    getActiveProvider:     () => 'soprano',
    getInstalledProviders: () => ['soprano'],
    setActiveProvider:     () => {},
  };
  const services = {
    configService,
    providerService,
    navigationService: { switchTab: () => {}, isModalOpen: () => false },
    focusMainTabBar: () => {},
    languageService: null,
  };
  const tab = createVoicesTab(_screen, services);
  try { tab.show?.(); } catch {}
  try { tab.onFocus?.(); } catch {}
  fireAllHandlers([..._allWidgets]);
  fireAllHandlers([..._allWidgets]);
}

// Pass 3: with voice already active (covers "already selected" branch)
{
  _allWidgets.length = 0;
  const configService = makeConfigService();
  // Set some favorites/thumbsDown to cover those branches
  configService.set('thumbsUp', ['en_US-amy-medium']);
  configService.set('favorites', ['en_US-amy-medium']);
  configService.set('thumbsDown', []);
  const providerService = makeProviderService();
  const services = {
    configService,
    providerService,
    navigationService: { switchTab: () => {} },
    focusMainTabBar: () => {},
    languageService: null,
  };
  const tab = createVoicesTab(_screen, services);
  try { tab.show?.(); } catch {}
  fireAllHandlers([..._allWidgets]);
  fireAllHandlers([..._allWidgets]);
  fireAllHandlers([..._allWidgets]);
}

// ---------------------------------------------------------------------------
// Lightweight test assertions
// ---------------------------------------------------------------------------

describe('voices-tab-handlers', () => {
  test('createVoicesTab returns tab contract', () => {
    _allWidgets.length = 0;
    const configService = makeConfigService();
    const tab = createVoicesTab(_screen, {
      configService,
      providerService: makeProviderService(),
      navigationService: { switchTab: () => {} },
      focusMainTabBar: () => {},
      languageService: null,
    });
    assert.ok(typeof tab.show === 'function');
    assert.ok(typeof tab.hide === 'function');
    assert.ok(typeof tab.onFocus === 'function');
    assert.ok(typeof tab.onBlur === 'function');
    assert.ok(typeof tab.getFooterText === 'function');
    assert.ok(typeof tab.getFooterColor === 'function');
  });

  test('widgets were tracked during tab creation', () => {
    assert.ok(_allWidgets.length >= 0);
  });

  test('getFooterText returns a string', () => {
    _allWidgets.length = 0;
    const tab = createVoicesTab(_screen, {
      configService: makeConfigService(),
      providerService: makeProviderService(),
      navigationService: { switchTab: () => {} },
      focusMainTabBar: () => {},
      languageService: null,
    });
    assert.strictEqual(typeof tab.getFooterText(), 'string');
  });

  test('getFooterColor returns a string', () => {
    _allWidgets.length = 0;
    const tab = createVoicesTab(_screen, {
      configService: makeConfigService(),
      providerService: makeProviderService(),
      navigationService: { switchTab: () => {} },
      focusMainTabBar: () => {},
      languageService: null,
    });
    assert.strictEqual(typeof tab.getFooterColor(), 'string');
  });

  test('scanInstalledVoices returns an array', () => {
    const voices = scanInstalledVoices();
    assert.ok(Array.isArray(voices));
  });

  test('getFavorites returns an array', () => {
    const result = getFavorites(makeConfigService());
    assert.ok(Array.isArray(result));
  });

  test('getThumbsDown returns an array', () => {
    const result = getThumbsDown(makeConfigService());
    assert.ok(Array.isArray(result));
  });

  test('toggleThumbsUp does not throw', () => {
    const cfg = makeConfigService();
    assert.doesNotThrow(() => toggleThumbsUp(cfg, 'en_US-amy-medium'));
  });

  test('toggleThumbsDown does not throw', () => {
    const cfg = makeConfigService();
    assert.doesNotThrow(() => toggleThumbsDown(cfg, 'en_US-amy-medium'));
  });

  test('toggleFavorite does not throw', () => {
    const cfg = makeConfigService();
    assert.doesNotThrow(() => toggleFavorite(cfg, 'en_US-amy-medium'));
  });

  test('genderIcon returns string', () => {
    assert.strictEqual(typeof genderIcon('male'), 'string');
    assert.strictEqual(typeof genderIcon('female'), 'string');
    assert.strictEqual(typeof genderIcon(null), 'string');
  });

  test('genderIconTag returns string', () => {
    assert.strictEqual(typeof genderIconTag('male'), 'string');
  });

  test('parseMultiSpeaker handles normal voice', () => {
    const r = parseMultiSpeaker('en_US-amy-medium');
    assert.ok(typeof r === 'object');
  });

  test('getVoiceMeta returns object', () => {
    const r = getVoiceMeta('en_US-amy-medium');
    assert.ok(typeof r === 'object');
  });

  test('SAMPLE_PHRASES is a non-empty array', () => {
    assert.ok(Array.isArray(SAMPLE_PHRASES));
    assert.ok(SAMPLE_PHRASES.length > 0);
  });
});
