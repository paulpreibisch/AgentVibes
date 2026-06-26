/**
 * Regression test for the ElevenLabs API-key dialog (_openApiKeyInput).
 *
 * Bug: the dialog never registered with navigationService, so isModalOpen()
 * stayed false while it was open. Pressing Escape therefore fell through to the
 * setup-tab global Escape handler (which navigates the wizard back a screen)
 * instead of closing the dialog — leaving the box orphaned with screen.grabKeys
 * stuck on, trapping the user.
 *
 * Fix: _openApiKeyInput now calls navigationService.openModal(null, closeFn) on
 * open and navigationService.closeModal() on close, mirroring every other picker.
 *
 * These tests assert the modal is registered on open and torn down on close via
 * (a) the inputBox Escape keypress, (b) forceCloseAll(), and (c) Enter/save.
 *
 * Nothing real spawns, plays, or touches disk — blessed / fs / child_process /
 * os / tts-engine-service are all mocked.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Tracked blessed stub (destroy records a flag; program has cursor helpers)
// ---------------------------------------------------------------------------

const _allWidgets = [];

function makeTrackedWidget(tag = 'widget') {
  const _h = {};
  const w = {
    _tag: tag,
    _handlers: _h,
    append: () => {}, remove: () => {}, prepend: () => {}, insert: () => {},
    insertBefore: () => {}, insertAfter: () => {},
    setContent: () => {}, getContent: () => '', setLabel: () => {},
    show: function () { this.hidden = false; },
    hide: function () { this.hidden = true; },
    toggle: function () { this.hidden = !this.hidden; },
    focus: function () { this.focused = true; }, press: () => {},
    scroll: () => {}, scrollTo: () => {},
    getScroll: () => 0, getScrollPerc: () => 0, setScrollPerc: () => {},
    setItems: function (items) { this.items = items || []; },
    clearItems: () => {}, addItem: () => {}, getItem: () => null, setItem: () => {},
    select: function (i) { this.selected = i; }, move: () => {},
    up: () => {}, down: () => {}, getValue: () => '', setValue: () => {}, clearValue: () => {},
    input: (cb) => cb && cb(null, ''),
    prompt: (msg, cb) => cb && cb(null, ''),
    key: (keys, cb) => { [].concat(keys).forEach(k => { _h[`key:${k}`] = cb; }); },
    on: (event, cb) => { _h[`on:${event}`] = cb; },
    off: () => {},
    once: (event, cb) => { _h[`once:${event}`] = cb; },
    removeListener: () => {}, removeAllListeners: () => {},
    emit: (event, ...args) => { try { _h[`on:${event}`]?.(...args); } catch {} },
    destroy: function () { this.destroyed = true; try { _h['once:destroy']?.(); } catch {} },
    free: () => {}, render: () => {}, setFront: () => {}, setBack: () => {}, setIndex: () => {},
    _getCoords: () => ({ xi: 2, xl: 60, yi: 3 }),
    iwidth: 2, itop: 0, ileft: 1,
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border: { type: 'line' },
    hidden: false, destroyed: false, content: '', height: 40, width: 120,
    left: 0, top: 0, bottom: 0, right: 0,
    items: [], ritems: [], selected: 0, focused: false,
    program: {
      clear: () => {}, grabInput: () => {}, showCursor: () => {},
      hideCursor: () => {}, cup: () => {},
    },
    clearRegion: () => {}, cols: 120, rows: 40, olines: [], lines: [],
    type: tag, grabKeys: false,
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

// ---------------------------------------------------------------------------
// Minimal node mocks
// ---------------------------------------------------------------------------

const _writes = [];
const fsMock = {
  existsSync: () => false,
  readFileSync: () => { throw new Error('ENOENT'); },
  readdirSync: () => { throw new Error('ENOENT'); },
  writeFileSync: (p, data, opts) => { _writes.push({ p: String(p), data, opts }); },
  mkdirSync: () => {},
  unlinkSync: () => {}, chmodSync: () => {}, rmSync: () => {},
  statSync: () => ({ uid: 0 }),
  promises: { readFile: async () => { throw new Error('ENOENT'); }, writeFile: async () => {}, mkdir: async () => {} },
};

const _tmp = os.tmpdir();
const osMock = {
  homedir: () => _tmp, tmpdir: () => _tmp, platform: () => process.platform,
  hostname: () => 'testhost', EOL: '\n',
};

const cpMock = {
  spawn: () => ({ pid: 1, killed: false, kill() {}, on() { return this; }, once() { return this; }, stdout: { on() {} }, stderr: { on() {} } }),
  spawnSync: () => ({ status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') }),
  execFileSync: () => Buffer.from(''),
  execFile: (...args) => { const cb = args[args.length - 1]; if (typeof cb === 'function') cb(null, { stdout: '', stderr: '' }); return { kill() {} }; },
};

// ElevenLabs-only engine list so the single install button maps to the
// requiresApiKey path that opens _openApiKeyInput.
const _engines = [
  { id: 'elevenlabs', name: 'ElevenLabs', desc: 'cloud', native: false, requiresApiKey: true, installCmd: 'echo eleven' },
];

await mock.module('blessed', { defaultExport: blessedStub });
await mock.module('node:fs', { defaultExport: fsMock, namedExports: { ...fsMock } });
await mock.module('node:os', { defaultExport: osMock, namedExports: { ...osMock } });
await mock.module('node:child_process', { namedExports: cpMock });
await mock.module('../../src/services/tts-engine-service.js', {
  namedExports: {
    getAvailableEngines: () => _engines,
    getEngineStatuses: () => _engines.map(e => ({ ...e, installed: false })),
    checkEngineInstalled: () => false,
  },
});

const { createSetupTab } = await import('../../src/console/tabs/setup-tab.js');

// ---------------------------------------------------------------------------
// Service mocks — NavigationService spy mirrors the real depth/forceCloseAll.
// ---------------------------------------------------------------------------

function makeNavSpy() {
  let depth = 0;
  const closeFns = [];
  const calls = { open: 0, close: 0 };
  return {
    switchTab() {}, isModalOpen() { return depth > 0; },
    openModal(fn, closeFn) { depth++; closeFns.push(closeFn || null); calls.open++; if (typeof fn === 'function') fn(); },
    closeModal() { if (depth > 0) depth--; closeFns.pop(); calls.close++; },
    forceCloseAll() { const cbs = [...closeFns].reverse(); depth = 0; closeFns.length = 0; for (const cb of cbs) { try { cb && cb(); } catch {} } },
    pushFocus() {}, popFocus() { return null; },
    _calls: calls,
  };
}

function makeConfigService() {
  return {
    getConfig: () => ({
      provider: 'piper', voice: 'en_US-amy-medium', setupCompleted: true,
      language: 'en', ttsEngine: '',
      backgroundMusic: { track: null, enabled: false, volume: 50 },
      musicFavorites: [], favorites: [], thumbsUp: [], thumbsDown: [],
      personality: null, pretext: '', reverbPreset: null, reverbEnabled: false,
    }),
    set: () => {}, setGlobal: () => {}, saveAllToLocal: () => {},
    getGlobalConfig: () => ({}), getProjectConfig: () => null, hasLocalConfig: () => false,
  };
}

function makeProviderService() {
  return {
    getActiveVoiceId: () => 'en_US-amy-medium', setActiveVoice: () => {},
    getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], setActiveProvider: () => {},
  };
}

function buildTab(nav) {
  _allWidgets.length = 0;
  createSetupTab(makeTrackedWidget('screen'), {
    configService: makeConfigService(),
    providerService: makeProviderService(),
    navigationService: nav,
    focusMainTabBar: () => {},
    languageService: null,
  });
}

// Fire the ElevenLabs install button's press handler → opens _openApiKeyInput.
function openApiKeyDialog() {
  const before = _allWidgets.length;
  const installBtn = _allWidgets.find(w => w._tag === 'button' && w._handlers['on:press']);
  assert.ok(installBtn, 'an install button with a press handler should exist');
  installBtn._handlers['on:press']();
  const created = _allWidgets.slice(before);
  const dlg = created.find(w => w._tag === 'box');
  const inputBox = created.find(w => w._tag === 'textbox');
  assert.ok(dlg, 'API-key dialog box should be created');
  assert.ok(inputBox, 'API-key input textbox should be created');
  return { dlg, inputBox };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ElevenLabs API-key dialog — escape / modal teardown', () => {
  test('opening the dialog registers a modal with navigationService', () => {
    const nav = makeNavSpy();
    buildTab(nav);
    assert.equal(nav.isModalOpen(), false);
    openApiKeyDialog();
    assert.equal(nav._calls.open, 1, 'openModal should be called exactly once');
    assert.equal(nav.isModalOpen(), true, 'modal must be registered while the dialog is open');
  });

  test('Escape in the input box closes the dialog and clears modal state', () => {
    const nav = makeNavSpy();
    buildTab(nav);
    const { dlg, inputBox } = openApiKeyDialog();

    // Simulate the user pressing Escape inside the key field.
    inputBox._handlers['on:keypress']('', { name: 'escape' });

    assert.equal(dlg.destroyed, true, 'dialog box should be destroyed on Escape');
    assert.equal(nav._calls.close, 1, 'closeModal should be called on Escape');
    assert.equal(nav.isModalOpen(), false, 'modal state must be cleared so global keys work again');
    assert.equal(_writes.length, 0, 'Escape must not write a key file');
  });

  test('forceCloseAll() (global nav hotkey) tears the dialog down cleanly', () => {
    const nav = makeNavSpy();
    buildTab(nav);
    const { dlg } = openApiKeyDialog();
    assert.equal(nav.isModalOpen(), true);

    nav.forceCloseAll();

    assert.equal(dlg.destroyed, true, 'forceCloseAll must destroy the dialog via its close callback');
    assert.equal(nav.isModalOpen(), false, 'modal depth must be 0 after forceCloseAll');
  });

  test('Enter saves the key, writes the file, and clears modal state', () => {
    const nav = makeNavSpy();
    buildTab(nav);
    _writes.length = 0;
    const { dlg, inputBox } = openApiKeyDialog();

    inputBox.value = 'sk-test-key-123';
    inputBox._handlers['on:keypress']('', { name: 'enter' });

    assert.equal(dlg.destroyed, true, 'dialog should close on Enter');
    assert.equal(nav.isModalOpen(), false, 'modal state cleared on save');
    assert.equal(_writes.length, 1, 'the API key should be written to its key file');
    assert.match(_writes[0].p, /elevenlabs-key\.txt$/, 'key file path should be the elevenlabs key file');
    assert.match(String(_writes[0].data), /sk-test-key-123/, 'written content should contain the key');
    // The credential file must be written with owner-only 0o600 permissions so
    // the API key is not world/group readable.
    assert.equal(_writes[0].opts?.mode, 0o600, 'key file must be written with 0o600 (owner-only) mode');
  });
});
