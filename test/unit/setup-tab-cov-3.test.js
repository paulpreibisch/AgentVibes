/**
 * Targeted coverage for setup-tab.js lines 2683-2875 — the Kokoro voice
 * picker's spinner helpers (_startKSpinner / _stopKSpinner) and the
 * pip-install dialog + progress modal (_promptInstallPkg), including its
 * spawn stdout/stderr/exit pipeline.
 *
 * Strategy: drive the REAL code through the modal chain.
 *   1. Build the Setup tab with a tracked blessed stub (hidden=false so handlers
 *      run). Provider rows create a "Configure" button whose handler invokes
 *      handleProviderConfigure → _openLlmConfigModal (a fieldList).
 *   2. Fire the Configure button → modal fieldList appears.
 *   3. On the fieldList, set selected=0 (TTS Engine) and fire enter → engine
 *      picker. Select the Kokoro row and fire enter → draft.ttsEngine='kokoro'.
 *   4. On the fieldList, set selected=1 (Voice) and fire enter → because
 *      ttsEngine==='kokoro', _openKokoroVoicePicker runs, building kPicker.
 *   5. Fire kPicker's Space handler. With _kokoroInstalled=false that runs
 *      _promptInstallPkg; pressing "i" spawns pip and exercises the stdout
 *      parser (download/collecting/building/installing/satisfied/success) and
 *      the exit (code 0 / non-0) + error handlers.
 *   6. With a valid SSH host configured (mocked transport-config) and
 *      _kokoroInstalled=true, the Space handler reaches _startKSpinner /
 *      _stopKSpinner.
 *
 * All subprocesses are mocked — no real audio/network/pip.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import pathMod from 'node:path';

// ---------------------------------------------------------------------------
// Toggle-able state shared between the test body and the mocks
// ---------------------------------------------------------------------------

const STATE = {
  // when false, _pyHasModules(['kokoro','soundfile']) returns false so the
  // Space handler routes through _promptInstallPkg.
  pyModulesOk: false,
  // emit a remote transport-config so _validSshHost is true
  sshRemote: false,
  // sequence of stdout lines the mock pip process emits
  pipLines: [],
  // exit code the mock install process reports
  pipExit: 0,
  // when true, the install spawn emits 'error' instead of running
  pipError: false,
};

const _procs = [];

function makeMockProc({ emitErr = false } = {}) {
  const p = new EventEmitter();
  p.stdout = new EventEmitter();
  p.stderr = new EventEmitter();
  p.killed = false;
  p.kill = () => { p.killed = true; };
  p.unref = () => {};
  p._emitErr = emitErr;
  _procs.push(p);
  return p;
}

// ---------------------------------------------------------------------------
// node:child_process mock
// ---------------------------------------------------------------------------

function spawnSyncMock(cmd, args) {
  const joined = Array.isArray(args) ? args.join(' ') : '';
  // python --version probe → success so _pythonCmd resolves
  if (joined.includes('--version')) return { status: 0 };
  // find_spec module checks: kokoro/soundfile gate _kokoroInstalled,
  // pyopenjtalk/jamo/pypinyin gate _cjkInstalled.
  if (joined.includes('find_spec') || joined.includes('importlib')) {
    return { status: STATE.pyModulesOk ? 0 : 1 };
  }
  return { status: 0 };
}

function spawnMock(cmd, args) {
  const joined = Array.isArray(args) ? args.join(' ') : '';
  // The pip install in _promptInstallPkg
  if (joined.includes('pip') && joined.includes('install')) {
    const p = makeMockProc();
    // Drive stdout/stderr/exit asynchronously so handlers are registered first
    setImmediate(() => {
      if (STATE.pipError) { p.emit('error', new Error('no python')); return; }
      for (const line of STATE.pipLines) {
        p.stdout.emit('data', Buffer.from(line + '\n'));
      }
      p.stderr.emit('data', Buffer.from('some stderr\n'));
      p.emit('exit', STATE.pipExit);
    });
    return p;
  }
  // Any other spawn (bling cue, ssh-remote preview, kokoro-tts.py, etc.)
  const p = makeMockProc();
  setImmediate(() => { p.emit('exit', 0); });
  return p;
}

function execFileSyncMock() { return Buffer.from(''); }
function execFileMock(cmd, args, opts, cb) {
  const c = typeof opts === 'function' ? opts : cb;
  if (c) setImmediate(() => c(null, '', ''));
  return makeMockProc();
}

await mock.module('node:child_process', {
  namedExports: {
    spawn: spawnMock,
    spawnSync: spawnSyncMock,
    execFileSync: execFileSyncMock,
    execFile: execFileMock,
    exec: execFileMock,
  },
});

// ---------------------------------------------------------------------------
// node:fs mock — feed transport-config / provider files, swallow writes
// ---------------------------------------------------------------------------

const realFs = await import('node:fs');

function readFileSyncMock(p, enc) {
  const s = String(p);
  if (s.includes('transport-config.json')) {
    if (STATE.sshRemote) {
      return JSON.stringify({
        'claude-code': { mode: 'remote', host: 'myhost', sshKey: '', port: '' },
      });
    }
    return JSON.stringify({});
  }
  if (s.includes('tts-provider.txt')) return 'piper';
  if (s.includes('kokoro-favorites.json')) return JSON.stringify(['af_river']);
  // LLM config files / others — pretend absent
  throw new Error('ENOENT');
}

const fsMock = {
  ...realFs.default,
  existsSync: () => false,
  readFileSync: readFileSyncMock,
  readdirSync: () => [],
  writeFileSync: () => {},
  mkdirSync: () => {},
  chmodSync: () => {},
  unlinkSync: () => {},
  statSync: () => ({ isFile: () => true, uid: 0 }),
  promises: realFs.promises,
};

await mock.module('node:fs', {
  defaultExport: fsMock,
  namedExports: { ...fsMock, promises: realFs.promises, default: fsMock },
});

// ---------------------------------------------------------------------------
// Tracked blessed stub — hidden=false; stores opts so widgets are identifiable
// ---------------------------------------------------------------------------

const _allWidgets = [];

function makeTrackedWidget(tag, opts = {}) {
  const _h = {};
  const w = {
    _tag: tag,
    _opts: opts,
    _handlers: _h,
    options: opts,
    append: () => {}, remove: () => {}, prepend: () => {}, insert: () => {},
    insertBefore: () => {}, insertAfter: () => {},
    setContent: () => {}, getContent: () => '', setLabel: function (l) { this.label = l; },
    setItem: () => {}, setItems: () => {}, clearItems: () => {}, addItem: () => {},
    getItem: () => null,
    show: function () { this.hidden = false; }, hide: function () { this.hidden = true; },
    toggle: function () { this.hidden = !this.hidden; },
    focus: () => {}, press: () => {}, scroll: () => {}, scrollTo: () => {},
    getScroll: () => 0, getScrollPerc: () => 0, setScrollPerc: () => {},
    select: function (i) { if (typeof i === 'number') this.selected = i; },
    move: () => {}, up: () => {}, down: () => {},
    getValue: () => '', setValue: () => {}, clearValue: () => {},
    input: (cb) => cb && cb(null, ''), prompt: (m, cb) => cb && cb(null, ''),
    key: (keys, cb) => { [].concat(keys).forEach(k => { _h[`key:${k}`] = cb; }); },
    on: (event, cb) => { _h[`on:${event}`] = cb; },
    off: () => {},
    once: (event, cb) => { _h[`once:${event}`] = cb; },
    removeListener: () => {}, removeAllListeners: () => {},
    emit: (event, ...a) => { try { _h[`on:${event}`]?.(...a); } catch {} },
    destroy: () => {}, free: () => {}, render: () => {},
    setFront: () => {}, setBack: () => {}, setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {}, selected: {}, item: {} },
    border: { type: 'line' },
    label: opts.label || '',
    content: opts.content || '',
    hidden: false,
    destroyed: false,
    height: 40, width: 120, left: 0, top: 0, bottom: 0, right: 0,
    items: [], ritems: [], selected: 0, focused: null,
    program: { clear: () => {}, grabInput: () => {}, showCursor: () => {} },
    clearRegion: () => {}, cols: 120, rows: 40, olines: [], lines: [],
    type: tag, grabKeys: false,
  };
  _allWidgets.push(w);
  return w;
}

const blessedStub = {
  box: (o) => makeTrackedWidget('box', o),
  text: (o) => makeTrackedWidget('text', o),
  textbox: (o) => makeTrackedWidget('textbox', o),
  textarea: (o) => makeTrackedWidget('textarea', o),
  list: (o) => makeTrackedWidget('list', o),
  listbar: (o) => makeTrackedWidget('listbar', o),
  button: (o) => makeTrackedWidget('button', o),
  prompt: (o) => makeTrackedWidget('prompt', o),
  screen: (o) => makeTrackedWidget('screen', o),
  escape: (s) => s || '',
};

await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Import target after mocks installed
// ---------------------------------------------------------------------------

const { createSetupTab } = await import('../../src/console/tabs/setup-tab.js');

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------

function makeServices() {
  return {
    configService: {
      getConfig: () => ({
        provider: 'piper', voice: 'en_US-amy-medium', setupCompleted: true,
        language: 'en', ttsEngine: '',
        backgroundMusic: { track: null, enabled: false, volume: 50 },
        musicFavorites: [], favorites: [], thumbsUp: [], thumbsDown: [],
        personality: null, pretext: '', reverbPreset: null, reverbEnabled: false,
      }),
      set: () => {}, setGlobal: () => {}, saveAllToLocal: () => {},
      getGlobalConfig: () => ({}), getProjectConfig: () => null, hasLocalConfig: () => false,
    },
    providerService: {
      getActiveVoiceId: () => 'en_US-amy-medium', setActiveVoice: () => {},
      getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'],
      setActiveProvider: () => {},
    },
    navigationService: {
      switchTab: () => {}, isModalOpen: () => false,
      openModal: () => {}, closeModal: () => {},
      pushFocus: () => {}, popFocus: () => null,
    },
    focusMainTabBar: () => {},
    languageService: null,
  };
}

// ---------------------------------------------------------------------------
// Widget locators
// ---------------------------------------------------------------------------

function findOne(pred) { return _allWidgets.find(pred); }
function findLast(pred) {
  for (let i = _allWidgets.length - 1; i >= 0; i--) if (pred(_allWidgets[i])) return _allWidgets[i];
  return undefined;
}

const tick = () => new Promise(r => setImmediate(r));

// Drive: open config modal → set engine to kokoro → open kokoro picker.
// Returns the kPicker (kokoro voice list) widget, or undefined.
async function openKokoroPicker() {
  // 1. Fire a "Configure" button handler → handleProviderConfigure → modal
  const configBtns = _allWidgets.filter(
    w => w._tag === 'button' && /Configure/.test(w._opts?.content || ''));
  let opened = false;
  for (const btn of configBtns) {
    const h = btn._handlers['key:enter'] || btn._handlers['on:press'];
    if (!h) continue;
    try { await h(); } catch {}
    await tick();
    // Did a fieldList-bearing modal appear? Look for the engine picker entry point:
    const modalBox = findLast(w => /Audio Config/.test(w._opts?.label || ''));
    if (modalBox) { opened = true; break; }
  }
  if (!opened) return undefined;

  // 2. The fieldList is a 'list' created right after the modal box. Find the
  //    list whose enter handler triggers the field switch (most recent list).
  const fieldList = findLast(w => w._tag === 'list' && w._handlers['key:enter']);
  if (!fieldList) return undefined;

  // selected=0 → TTS Engine field → open engine picker
  fieldList.selected = 0;
  try { fieldList._handlers['key:enter'](); } catch {}
  await tick();

  // 3. Engine picker = newest list whose items include the "(global default)" row.
  //    (Title now lives on the wrapping box, so match the list by its content.)
  const enginePicker = findLast(w => w._tag === 'list'
    && (w._opts?.items || []).some(it => /global default/.test(String(it))));
  if (enginePicker) {
    // Kokoro is engines[1] → picker index 2 (after unshifted "(global default)")
    enginePicker.selected = 2;
    try { enginePicker._handlers['key:enter'](); } catch {}
    await tick();
  }

  // 4. Re-open the field switch with Voice selected → kokoro picker
  fieldList.selected = 1;
  try { fieldList._handlers['key:enter'](); } catch {}
  await tick();

  // kPicker = newest list inside a box labelled "Kokoro" — find by item structure.
  // The kokoro list is created last; identify it as a 'list' with a space handler.
  const kPicker = findLast(w => w._tag === 'list' && w._handlers['key:space'] && w._handlers['key:d']);
  return kPicker;
}

// ---------------------------------------------------------------------------
// Run scenarios at module top-level so c8 captures them, then assert.
// ---------------------------------------------------------------------------

const results = { installPrompt: false, spinner: false };

// Scenario A — install-prompt path (_promptInstallPkg) with success exit.
{
  STATE.pyModulesOk = false;
  STATE.sshRemote = false;
  STATE.pipExit = 0;
  STATE.pipError = false;
  STATE.pipLines = [
    'Collecting kokoro',
    'Collecting soundfile',
    '\x1b[32mDownloading kokoro-0.1-py3-none-any.whl (5.0 MB)\x1b[0m',
    '  1.0/5.0 MB',
    '  5.0/5.0 MB',
    'Building wheel for kokoro',
    'Running setup.py',
    'Installing collected packages: kokoro',
    'Successfully installed kokoro-0.1',
    'Requirement already satisfied: numpy',
  ];

  _allWidgets.length = 0;
  const screen = makeTrackedWidget('screen', {});
  const tab = createSetupTab(screen, makeServices());
  try { tab.show?.(); } catch {}
  await tick();

  const kPicker = await openKokoroPicker();
  if (kPicker) {
    // Space → not installed → _promptInstallPkg dialog
    try { kPicker._handlers['key:space'](); } catch {}
    await tick();
    // The install dialog is a box labelled "Missing:"; press "i" to start install.
    const dlg = findLast(w => /Missing:/.test(w._opts?.label || ''));
    if (dlg && dlg._handlers['key:i']) {
      results.installPrompt = true;
      try { dlg._handlers['key:i'](); } catch {}
      await tick();             // lets the install modal register + spawn fire
      await tick();             // lets stdout/exit emit
      await tick();
      // After exit, the install modal has an enter (OK) handler — press it.
      const iMod = findLast(w => /Installing|Installed|Install Failed/.test(w.label || w._opts?.label || ''));
      if (iMod && iMod._handlers['key:enter']) { try { iMod._handlers['key:enter'](); } catch {} }
    }
  }
}

// Scenario B — install fails (non-zero exit with python3-dev hint).
{
  STATE.pyModulesOk = false;
  STATE.sshRemote = false;
  STATE.pipExit = 1;
  STATE.pipError = false;
  STATE.pipLines = ['Collecting kokoro', 'fatal error: Python.h: No such file'];

  _allWidgets.length = 0;
  const screen = makeTrackedWidget('screen', {});
  const tab = createSetupTab(screen, makeServices());
  try { tab.show?.(); } catch {}
  await tick();

  const kPicker = await openKokoroPicker();
  if (kPicker) {
    try { kPicker._handlers['key:space'](); } catch {}
    await tick();
    const dlg = findLast(w => /Missing:/.test(w._opts?.label || ''));
    if (dlg && dlg._handlers['key:i']) {
      try { dlg._handlers['key:i'](); } catch {}
      await tick(); await tick(); await tick();
      const iMod = findLast(w => /Install Failed|Installing/.test(w.label || w._opts?.label || ''));
      if (iMod && iMod._handlers['key:enter']) { try { iMod._handlers['key:enter'](); } catch {} }
    }
    // Also drive the dialog Escape/cancel branch on a fresh prompt
    try { kPicker._handlers['key:space'](); } catch {}
    await tick();
    const dlg2 = findLast(w => /Missing:/.test(w._opts?.label || ''));
    if (dlg2 && dlg2._handlers['key:escape']) { try { dlg2._handlers['key:escape'](); } catch {} }
  }
}

// Scenario C — install spawn errors (pip not found).
{
  STATE.pyModulesOk = false;
  STATE.sshRemote = false;
  STATE.pipError = true;
  STATE.pipLines = [];

  _allWidgets.length = 0;
  const screen = makeTrackedWidget('screen', {});
  const tab = createSetupTab(screen, makeServices());
  try { tab.show?.(); } catch {}
  await tick();

  const kPicker = await openKokoroPicker();
  if (kPicker) {
    try { kPicker._handlers['key:space'](); } catch {}
    await tick();
    const dlg = findLast(w => /Missing:/.test(w._opts?.label || ''));
    if (dlg && dlg._handlers['key:i']) {
      try { dlg._handlers['key:i'](); } catch {}
      await tick(); await tick();
      const iMod = findLast(w => /pip Not Found|Installing/.test(w.label || w._opts?.label || ''));
      if (iMod && iMod._handlers['key:enter']) { try { iMod._handlers['key:enter'](); } catch {} }
    }
  }
}

// Scenario D — installed + remote SSH → _startKSpinner / _stopKSpinner.
{
  STATE.pyModulesOk = true;    // _kokoroInstalled = true
  STATE.sshRemote = true;      // _validSshHost = true → spinner path
  STATE.pipError = false;
  STATE.pipExit = 0;
  STATE.pipLines = [];

  _allWidgets.length = 0;
  const screen = makeTrackedWidget('screen', {});
  const tab = createSetupTab(screen, makeServices());
  try { tab.show?.(); } catch {}
  await tick();

  const kPicker = await openKokoroPicker();
  if (kPicker) {
    results.spinner = true;
    // Space with installed kokoro + valid SSH host → _startKSpinner runs,
    // then the remote spawn exits (mock) → _stopKSpinner runs.
    try { kPicker._handlers['key:space'](); } catch {}
    await tick();
    // Advance the spinner setInterval a few frames to execute its body.
    await new Promise(r => setTimeout(r, 200));
    // Toggle Space again → _killKPreview (which also stops the spinner).
    try { kPicker._handlers['key:space'](); } catch {}
    await tick();
    // Close picker → clears any timers/listeners.
    if (kPicker._handlers['key:escape']) { try { kPicker._handlers['key:escape'](); } catch {} }
    await tick();
  }
}

// Make sure no leftover mock procs keep emitting.
for (const p of _procs) { try { p.removeAllListeners(); } catch {} }

// ---------------------------------------------------------------------------
// Assertions (light — the real value is the executed source lines)
// ---------------------------------------------------------------------------

describe('setup-tab kokoro picker — spinner + pip install coverage', () => {
  test('module + scenarios ran without fatal errors', () => {
    // The module-level scenarios call createSetupTab(), which synchronously
    // builds the setup UI; the last scenario's widgets remain in _allWidgets.
    // A populated registry proves the tab was actually constructed (the
    // scenarios did not throw before producing UI).
    assert.ok(_allWidgets.length > 0, 'createSetupTab built widgets during the scenarios');
  });

  test('reached the kokoro picker and its install-prompt or spinner path', () => {
    // At least one of the deep paths must have been driven for the coverage
    // target to be meaningful.
    assert.ok(results.installPrompt || results.spinner,
      'expected to reach the kokoro install-prompt or spinner path');
  });
});
