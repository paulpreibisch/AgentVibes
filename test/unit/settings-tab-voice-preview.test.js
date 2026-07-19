/**
 * Story 8.3 (AVI-S8.3) — Bug 1 regression test.
 *
 * settings-tab.js's voice preview (Settings → Default Voice → [Space] Preview)
 * referenced an undefined `_projectRoot` variable — it only existed in
 * agents-tab.js. Pressing Space threw `ReferenceError: _projectRoot is not
 * defined`, guaranteed-crashing the TUI every time.
 *
 * The fix defines `_projectRoot = process.cwd()` at the top of
 * createSettingsTab() (matching agents-tab.js's L1 fix pattern) and adds the
 * same Windows-branch preview routing (via play-tts.ps1) that agents-tab.js
 * already had, so the two files no longer diverge.
 *
 * This test drives the REAL code path: mocks `blessed` and
 * `node:child_process` (no real terminal/process), then fires the actual
 * Enter/Space key handlers settings-tab.js registers for
 * Settings → Default Voice → preview.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mock blessed — tracked-widget stub (captures key/event handlers)
// ---------------------------------------------------------------------------

const _allWidgets = [];

function makeTrackedWidget(tag = 'widget') {
  const _h = {};
  const w = {
    _tag: tag,
    _handlers: _h,
    append: () => {}, remove: () => {}, prepend: () => {},
    insert: () => {}, insertBefore: () => {}, insertAfter: () => {},
    setContent: () => {}, getContent: () => '', setLabel: () => {},
    show: () => {}, hide: () => {}, toggle: () => {},
    focus: () => {}, press: () => {}, scroll: () => {}, scrollTo: () => {},
    getScroll: () => 0, getScrollPerc: () => 0, setScrollPerc: () => {},
    setItems: () => {}, clearItems: () => {}, addItem: () => {}, getItem: () => null,
    select: () => {}, move: () => {}, up: () => {}, down: () => {},
    getValue: () => '', setValue: () => {}, clearValue: () => {},
    input: (cb) => cb && cb(null, ''), prompt: (msg, cb) => cb && cb(null, ''),
    key: (keys, cb) => { [].concat(keys).forEach(k => { _h[`key:${k}`] = cb; }); },
    on: (event, cb) => { _h[`on:${event}`] = cb; },
    off: () => {}, once: (event, cb) => { _h[`once:${event}`] = cb; },
    removeListener: () => {},
    emit: (event, ...args) => { try { _h[`on:${event}`]?.(...args); } catch {} },
    removeAllListeners: () => {}, destroy: () => {}, free: () => {}, render: () => {},
    setFront: () => {}, setBack: () => {}, setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border: { type: 'line' }, hidden: true, content: '',
    height: 40, width: 120, left: 0, top: 0, bottom: 0, right: 0,
    items: [], ritems: [], selected: 0, focused: null,
    program: { clear: () => {}, grabInput: () => {}, showCursor: () => {} },
    clearRegion: () => {}, cols: 120, rows: 40, olines: [], type: tag, grabKeys: false,
  };
  _allWidgets.push(w);
  return w;
}

const blessedStub = {
  box: () => makeTrackedWidget('box'),
  text: () => makeTrackedWidget('text'),
  textbox: () => makeTrackedWidget('textbox'),
  textarea: () => makeTrackedWidget('textarea'),
  list: () => makeTrackedWidget('list'),
  listbar: () => makeTrackedWidget('listbar'),
  button: () => makeTrackedWidget('button'),
  prompt: () => makeTrackedWidget('prompt'),
  screen: () => makeTrackedWidget('screen'),
  escape: (str) => str || '',
};

await mock.module('blessed', { defaultExport: blessedStub });

// The voice-preview list is populated by voicesForProvider(), which for Piper
// scans the machine's INSTALLED .onnx voices from disk. On a CI runner no Piper
// voices are installed, so the list would be empty and pressing Space would have
// nothing to preview (the handler is `if (sel) _previewVoice(sel)`), making the
// "a process is spawned" assertion environment-dependent. Mock ONLY
// voicesForProvider (spreading the real module so its other exports —
// ELEVENLABS_VOICES etc. that voices-tab.js imports — survive) so the list always
// has a known voice, testing the preview path, not what's installed on the runner.
const { default: _catalogDefault, ..._realCatalogNamed } = await import('../../src/services/provider-voice-catalog.js');
await mock.module('../../src/services/provider-voice-catalog.js', {
  namedExports: {
    ..._realCatalogNamed,
    voicesForProvider: () => [{ id: 'en_US-amy-medium', gender: 'Female' }],
  },
});

// ---------------------------------------------------------------------------
// Mock node:child_process — never actually spawn a real TTS/powershell
// process during this test.
// ---------------------------------------------------------------------------

let _spawnCallCount = 0;

function makeFakeProc() {
  const handlers = {};
  return {
    on: (event, cb) => { (handlers[event] ??= []).push(cb); },
    kill: () => {},
    pid: 424242,
  };
}

const fakeSpawn = (..._args) => {
  _spawnCallCount++;
  return makeFakeProc();
};

await mock.module('node:child_process', {
  namedExports: {
    spawn: fakeSpawn,
    spawnSync: () => ({ status: 0, stdout: '', stderr: '' }),
    execFileSync: () => '',
  },
});

// ---------------------------------------------------------------------------
// Import after mocks are installed
// ---------------------------------------------------------------------------

const { createSettingsTab } = await import('../../src/console/tabs/settings-tab.js');

function makeConfigService() {
  return {
    getConfig: () => ({
      voice: 'en_US-amy-medium',
      verbosity: 'high',
      language: 'en',
      ttsEngine: '',
    }),
    set: () => {},
    setGlobal: () => {},
    getGlobalConfig: () => ({}),
    getProjectConfig: () => null,
  };
}

function makeProviderService() {
  return {
    getActiveVoiceId: () => 'en_US-amy-medium',
    setActiveVoice: () => {},
    getActiveProvider: () => 'piper',
    getInstalledProviders: () => ['piper'],
    setActiveProvider: () => {},
  };
}

function makeNavigationService() {
  return {
    switchTab: () => {},
    isModalOpen: () => false,
    openModal: () => {},
    closeModal: () => {},
    pushFocus: () => {},
    popFocus: () => null,
  };
}

/** Build a fresh settings tab and drive it to the "Default Voice" editor's preview list. */
function openVoicePreviewList() {
  _allWidgets.length = 0;
  const screen = makeTrackedWidget('screen');
  const services = {
    configService: makeConfigService(),
    providerService: makeProviderService(),
    navigationService: makeNavigationService(),
    focusMainTabBar: () => {},
    languageService: null,
  };
  const tab = createSettingsTab(screen, services);
  tab.show?.();

  // The settings list box registers a single ['enter','space'] handler that
  // dispatches to the currently-selected row's editor (see settings-tab.js
  // ~line 385: box.key(['enter','space'], () => _handleEdit(SETTINGS[idx]))).
  const box = _allWidgets.find(w => w._handlers['key:enter'] && w._handlers['key:space']);
  assert.ok(box, 'settings list box with enter/space handler must exist');

  // SETTINGS order is: language(0), ttsEngine(1), voice(2), ... — move down
  // twice to select "Default Voice", matching real keyboard navigation.
  box._handlers['key:down']?.();
  box._handlers['key:down']?.();
  box._handlers['key:enter']();

  // Opening the voice editor creates a NEW blessed.list — the voice-preview
  // list (vpList) — which is the widget with a 'space' handler AND a
  // 'keypress' handler (first-letter jump) registered on it.
  const vpList = _allWidgets.find(w => w._handlers['key:space'] && w._handlers['on:keypress'] && w !== box);
  assert.ok(vpList, 'voice-preview list (vpList) must be created when Default Voice is opened');
  return vpList;
}

describe('AVI-8.3 bug 1 — settings-tab voice preview does not throw ReferenceError', () => {
  test('pressing Space on a voice in Settings -> Default Voice does not throw', () => {
    const vpList = openVoicePreviewList();
    vpList.selected = 0;
    assert.doesNotThrow(() => vpList._handlers['key:space'](),
      '_projectRoot must be defined in settings-tab.js — this threw ReferenceError before the fix');
  });

  test('preview actually spawns a process once _projectRoot resolves correctly', () => {
    const vpList = openVoicePreviewList();
    vpList.selected = 0;
    const before = _spawnCallCount;
    vpList._handlers['key:space']();
    assert.ok(_spawnCallCount > before, 'expected a preview process to be spawned (Windows play-tts.ps1 route)');
  });

  test('pressing Space twice (start then stop) toggles preview without throwing', () => {
    const vpList = openVoicePreviewList();
    vpList.selected = 0;
    assert.doesNotThrow(() => {
      vpList._handlers['key:space'](); // start preview
      vpList._handlers['key:space'](); // same voice again -> stop preview
    });
  });
});
