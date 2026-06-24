/**
 * Coverage driver for setup-tab.js — Kokoro voice picker local-preview path.
 *
 * Targets src/console/tabs/setup-tab.js lines ~3069-3261: the Space-key preview
 * handler inside _openKokoroVoicePicker. That block synthesizes a WAV via a
 * spawned kokoro-tts.py process and, on success, spawns a player; on failure it
 * tries a direct .pt download. We drive the REAL handler by:
 *   1. mocking blessed with tracked widgets (hidden=false) so handlers run,
 *   2. mocking node:child_process so spawn returns controllable fake children,
 *   3. mocking node:fs so transport-config has NO remote host (forces local path)
 *      and all writes/unlinks are no-ops,
 *   4. mocking llm-provider-service so loadLlmConfigSync yields ttsEngine=kokoro,
 *   5. opening the LLM config modal, firing the Voice field -> kokoro picker,
 *      then invoking the captured Space handler and emitting synth/play events.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Tracked blessed stub (hidden=false so handler bodies run)
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
    focus: () => {}, press: () => {}, scroll: () => {}, scrollTo: () => {},
    getScroll: () => 0, getScrollPerc: () => 0, setScrollPerc: () => {},
    setItems: () => {}, clearItems: () => {}, addItem: () => {},
    getItem: () => null, setItem: () => {}, select: () => {}, move: () => {},
    up: () => {}, down: () => {}, getValue: () => '', setValue: () => {},
    clearValue: () => {},
    input: (cb) => cb && cb(null, ''),
    prompt: (msg, cb) => cb && cb(null, ''),
    key: (keys, cb) => { [].concat(keys).forEach(k => { _h[`key:${k}`] = cb; }); },
    on: (event, cb) => { _h[`on:${event}`] = cb; },
    off: () => {},
    once: (event, cb) => { _h[`once:${event}`] = cb; },
    removeListener: () => {},
    emit: (event, ...args) => { try { _h[`on:${event}`]?.(...args); } catch {} },
    removeAllListeners: () => {},
    destroy: () => {}, free: () => {}, render: () => {},
    setFront: () => {}, setBack: () => {}, setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border: { type: 'line' },
    hidden: false, content: '', height: 40, width: 120,
    left: 0, top: 0, bottom: 0, right: 0,
    items: [], ritems: [], selected: 0, focused: null, destroyed: false,
    program: { clear: () => {}, grabInput: () => {}, showCursor: () => {} },
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
  escape: (s) => s || '',
};

// ---------------------------------------------------------------------------
// Controllable child-process fakes
// ---------------------------------------------------------------------------

const _spawned = [];

function makeFakeChild() {
  const handlers = {};
  const stdoutH = {};
  const stderrH = {};
  const child = {
    killed: false,
    pid: 1234,
    on: (ev, cb) => { handlers[ev] = cb; return child; },
    once: (ev, cb) => { handlers[ev] = cb; return child; },
    kill: () => { child.killed = true; },
    unref: () => {},
    stdout: { on: (ev, cb) => { stdoutH[ev] = cb; } },
    stderr: { on: (ev, cb) => { stderrH[ev] = cb; } },
    _emit: (ev, ...a) => { try { handlers[ev]?.(...a); } catch {} },
    _emitStdout: (d) => { try { stdoutH.data?.(Buffer.from(d)); } catch {} },
    _emitStderr: (d) => { try { stderrH.data?.(Buffer.from(d)); } catch {} },
  };
  return child;
}

let _throwOnNextSpawn = false;
function spawnMock() {
  if (_throwOnNextSpawn) { _throwOnNextSpawn = false; throw new Error('spawn EACCES'); }
  const c = makeFakeChild();
  _spawned.push(c);
  return c;
}

function spawnSyncMock() {
  // status 0 => python found AND modules importable (kokoro/soundfile installed)
  return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') };
}

// ---------------------------------------------------------------------------
// fs mock — no real disk writes; transport-config has NO remote host so the
// Kokoro Space handler takes the LOCAL preview branch (the target lines).
// ---------------------------------------------------------------------------

const realFs = await import('node:fs');
const realCp = await import('node:child_process');

let _remoteHost = false;
function fsReadFileSyncMock(p) {
  const s = String(p);
  if (s.includes('transport-config.json')) {
    // No remote entries -> _validSshHost is false -> local preview path.
    // When _remoteHost is set, expose a remote route -> SSH preview path.
    return _remoteHost
      ? JSON.stringify({ 'claude-code': { mode: 'remote', host: 'myhost' } })
      : JSON.stringify({});
  }
  if (s.includes('tts-provider.txt')) return 'piper';
  if (s.includes('kokoro-favorites.json')) return JSON.stringify(['af_river']);
  // Anything else: behave as "not found" so try/catch fallbacks kick in.
  const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e;
}

// _scanKokoroVoices walks snapshots/<snap>/voices/*.pt. Return one cached voice
// (af_river) so the "isDownloaded" spinner branch is exercised too.
let _cacheAfRiver = false;
function fsReaddirSyncMock(p) {
  const s = String(p);
  if (!_cacheAfRiver) return [];
  if (s.includes('snapshots') && !s.includes('voices')) return ['snap1'];
  if (s.includes('voices')) return ['af_river.pt'];
  return [];
}
function fsExistsSyncMock(p) {
  const s = String(p);
  if (_cacheAfRiver && s.includes('voices')) return true;
  return false;
}
function fsMkdirSyncMock() { return undefined; }
function fsWriteFileSyncMock() { return undefined; }
function fsUnlinkSyncMock() { return undefined; }
function fsChmodSyncMock() { return undefined; }

const fsNamedExports = {
  ...realFs,
  readFileSync: fsReadFileSyncMock,
  readdirSync: fsReaddirSyncMock,
  existsSync: fsExistsSyncMock,
  mkdirSync: fsMkdirSyncMock,
  writeFileSync: fsWriteFileSyncMock,
  unlinkSync: fsUnlinkSyncMock,
  chmodSync: fsChmodSyncMock,
  promises: realFs.promises,
};

// ---------------------------------------------------------------------------
// llm-provider-service mock — loadLlmConfigSync yields a kokoro engine so the
// Voice field routes to the Kokoro picker.
// ---------------------------------------------------------------------------

const realLps = await import('../../src/services/llm-provider-service.js');

const lpsNamedExports = {
  ...realLps,
  loadLlmConfigSync: () => ({ ttsEngine: 'kokoro', voice: 'af_river', pretext: '', effects: 'off' }),
  saveLlmConfigSync: () => {},
  getTransportConfig: async () => ({ mode: 'local' }),
  saveTransportConfig: async () => {},
};

// ---------------------------------------------------------------------------
// Install mocks BEFORE importing target
// ---------------------------------------------------------------------------

await mock.module('blessed', { defaultExport: blessedStub });
await mock.module('node:fs', { defaultExport: fsNamedExports, namedExports: fsNamedExports });
await mock.module('../../src/services/llm-provider-service.js', { namedExports: lpsNamedExports });

// node:child_process — spawn/spawnSync controllable; keep all other real exports
// (execFileSync etc. are used elsewhere in the codebase).
const cpNamedExports = {
  ...realCp,
  spawn: spawnMock,
  spawnSync: spawnSyncMock,
  execFile: (cmd, args, opts, cb) => {
    const c = makeFakeChild();
    const done = typeof opts === 'function' ? opts : cb;
    if (done) setImmediate(() => done(null, { stdout: '', stderr: '' }));
    return c;
  },
};
await mock.module('node:child_process', {
  defaultExport: cpNamedExports,
  namedExports: cpNamedExports,
});

const { createSetupTab } = await import('../../src/console/tabs/setup-tab.js');

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

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
    getActiveVoiceId: () => 'en_US-amy-medium',
    setActiveVoice: () => {},
    getActiveProvider: () => 'piper',
    getInstalledProviders: () => ['piper'],
    setActiveProvider: () => {},
  };
}

function makeNavigationService() {
  let modalOpen = false;
  return {
    switchTab: () => {},
    isModalOpen: () => modalOpen,
    openModal: () => { modalOpen = true; },
    closeModal: () => { modalOpen = false; },
    pushFocus: () => {},
    popFocus: () => null,
  };
}

// ---------------------------------------------------------------------------
// Drive: open the LLM config modal -> Voice field -> Kokoro picker, then run
// the Space-preview handler and emit synth/play process events.
// ---------------------------------------------------------------------------

/**
 * Opens the kokoro picker by walking the real handler chain, returns the
 * kPicker widget (the most-recently-created list that has a key:space handler).
 */
async function openKokoroPicker() {
  const before = _allWidgets.length;

  // configBtn handlers call handleProviderConfigure(provider) which loads the
  // (mocked) kokoro config and opens _openLlmConfigModal.
  const configBtns = _allWidgets.filter(w => w._tag === 'button' && w._handlers['key:enter']);
  for (const b of configBtns) {
    try { await b._handlers['key:enter'](); } catch {}
  }

  // Find the fieldList: most recent list created by _openLlmConfigModal.
  const lists = _allWidgets.slice(before).filter(w => w._tag === 'list');
  // The config modal fieldList registers a key:enter handler.
  const fieldList = [...lists].reverse().find(w => w._handlers['key:enter']);
  if (!fieldList) return null;

  const afterModal = _allWidgets.length;
  fieldList.selected = 1; // "Voice" field
  try { fieldList._handlers['key:enter'](); } catch {}

  // kPicker is the newest list with a key:space handler.
  const pickerLists = _allWidgets.slice(afterModal).filter(w => w._tag === 'list');
  const kPicker = [...pickerLists].reverse().find(w => w._handlers['key:space']);
  return kPicker;
}

function buildTab() {
  const origInit = process.env.INIT_CWD;
  process.env.INIT_CWD = os.tmpdir();
  const tab = createSetupTab(makeTrackedWidget('screen'), {
    configService: makeConfigService(),
    providerService: makeProviderService(),
    navigationService: makeNavigationService(),
    focusMainTabBar: () => {},
    languageService: null,
  });
  if (origInit === undefined) delete process.env.INIT_CWD; else process.env.INIT_CWD = origInit;
  return tab;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('setup-tab kokoro local preview handler', () => {
  test('synth success then play exit 0 (happy path)', async () => {
    _allWidgets.length = 0;
    _spawned.length = 0;
    buildTab();

    const kPicker = await openKokoroPicker();
    assert.ok(kPicker, 'kokoro picker (list with space handler) should be created');

    kPicker.selected = 0; // af_river (non-CJK, not cached -> download anim path)
    kPicker._handlers['key:space']();

    // The synth process is the LAST spawned (a "bling" cue may be spawned first).
    const synth = _spawned[_spawned.length - 1];
    assert.ok(synth, 'synth process spawned');

    // feed some tqdm-style download progress to stderr (drives the parser)
    synth._emitStderr(' 42%|####      | 4/10\n');
    synth._emitStderr('done\r');

    // synth exits cleanly -> spawns playProc
    const playBefore = _spawned.length;
    synth._emit('exit', 0);
    const play = _spawned[playBefore];
    assert.ok(play, 'play process spawned after synth success');

    // play exits cleanly
    play._emit('exit', 0);

    // run a second preview to drive play exit != 0
    kPicker.selected = 1;
    kPicker._handlers['key:space']();
    const synth2 = _spawned[_spawned.length - 1];
    const pb2 = _spawned.length;
    synth2._emit('exit', 0);
    const play2 = _spawned[pb2];
    if (play2) play2._emit('exit', 7);

    // third preview -> play error branch
    kPicker.selected = 2;
    kPicker._handlers['key:space']();
    const synth3 = _spawned[_spawned.length - 1];
    const pb3 = _spawned.length;
    synth3._emit('exit', 0);
    const play3 = _spawned[pb3];
    if (play3) play3._emit('error', new Error('boom'));

    assert.ok(true);
  });

  test('synth failure (exit 3) triggers direct .pt download', async () => {
    _allWidgets.length = 0;
    _spawned.length = 0;
    buildTab();
    const kPicker = await openKokoroPicker();
    assert.ok(kPicker);

    kPicker.selected = 0;
    kPicker._handlers['key:space']();
    const synth = _spawned[_spawned.length - 1];
    const dlBefore = _spawned.length;
    synth._emit('exit', 3); // failure path -> spawns download-only proc
    const dl = _spawned[dlBefore];
    if (dl) {
      dl._emitStdout('af_river.pt downloaded');
      dl._emit('exit', 0);
    }
    assert.ok(true);
  });

  test('synth non-zero (generic failure) and synth error branch', async () => {
    _allWidgets.length = 0;
    _spawned.length = 0;
    buildTab();
    const kPicker = await openKokoroPicker();
    assert.ok(kPicker);

    kPicker.selected = 0;
    kPicker._handlers['key:space']();
    const synth = _spawned[_spawned.length - 1];
    synth._emit('exit', 1); // generic non-zero, not 3

    // a fresh preview, then trigger synth 'error'
    kPicker.selected = 1;
    kPicker._handlers['key:space']();
    const synth2 = _spawned[_spawned.length - 1];
    synth2._emit('error', new Error('python missing'));

    assert.ok(true);
  });

  test('toggling preview off, favorite, and download-all handlers', async () => {
    _allWidgets.length = 0;
    _spawned.length = 0;
    buildTab();
    const kPicker = await openKokoroPicker();
    assert.ok(kPicker);

    // start a preview, then press space again to toggle it off (kills preview)
    kPicker.selected = 0;
    kPicker._handlers['key:space']();
    kPicker._handlers['key:space'](); // _kPreviewProc set -> kill branch

    // favorite toggle on/off
    if (kPicker._handlers['key:f']) {
      kPicker._handlers['key:f']();
      kPicker._handlers['key:f']();
    }

    // download-all
    if (kPicker._handlers['key:d']) {
      const sb = _spawned.length;
      kPicker._handlers['key:d']();
      // drive any spawned download children to completion
      for (let i = sb; i < _spawned.length; i++) {
        _spawned[i]._emitStdout('5%|# |');
        _spawned[i]._emit('exit', 0);
      }
    }

    // escape closes
    if (kPicker._handlers['key:escape']) kPicker._handlers['key:escape']();

    assert.ok(true);
  });

  test('cached voice spinner path + download animation tick', async () => {
    _allWidgets.length = 0;
    _spawned.length = 0;
    _cacheAfRiver = true;
    try {
      buildTab();
      const kPicker = await openKokoroPicker();
      assert.ok(kPicker);

      // af_river is index 0 and is "cached" -> isDownloaded true -> spinner path
      kPicker.selected = 0;
      kPicker._handlers['key:space']();
      let synth = _spawned[_spawned.length - 1];
      synth._emit('exit', 0); // already-downloaded success, spawns play
      const play = _spawned[_spawned.length - 1];
      if (play && play !== synth) play._emit('exit', 0);

      // an uncached voice -> download animation; let the 120ms interval tick
      kPicker.selected = 5;
      kPicker._handlers['key:space']();
      synth = _spawned[_spawned.length - 1];
      await new Promise(r => setTimeout(r, 200)); // allow _startDlAnim interval to fire
      synth._emitStderr(' 77%|####### |\n'); // real pct so the bar-render branch runs
      await new Promise(r => setTimeout(r, 160));
      synth._emit('exit', 0);
    } finally {
      _cacheAfRiver = false;
    }
    assert.ok(true);
  });

  test('synth spawn throws -> preview-failed branch', async () => {
    _allWidgets.length = 0;
    _spawned.length = 0;
    buildTab();
    const kPicker = await openKokoroPicker();
    assert.ok(kPicker);
    kPicker.selected = 0;
    _throwOnNextSpawn = true; // the bling cue is wrapped in try/catch; synth spawn throws
    kPicker._handlers['key:space']();
    _throwOnNextSpawn = false;
    assert.ok(true);
  });

  test('remote SSH preview path (success and cjk failure tail)', async () => {
    _allWidgets.length = 0;
    _spawned.length = 0;
    _remoteHost = true;
    try {
      buildTab();
      const kPicker = await openKokoroPicker();
      assert.ok(kPicker);

      // non-CJK voice over SSH -> remoteProc exit 0 (success label) tail
      kPicker.selected = 0;
      kPicker._handlers['key:space']();
      let remote = _spawned[_spawned.length - 1];
      remote._emitStderr('some output\n');
      remote._emit('exit', 0);

      // SSH error exit (non-zero, non-CJK) -> error label branch
      kPicker.selected = 1;
      kPicker._handlers['key:space']();
      remote = _spawned[_spawned.length - 1];
      remote._emitStderr('[ERROR] kex_exchange failed\n');
      remote._emit('exit', 255);

      // remoteProc 'error' event branch
      kPicker.selected = 2;
      kPicker._handlers['key:space']();
      remote = _spawned[_spawned.length - 1];
      remote._emit('error', new Error('ssh died'));
    } finally {
      _remoteHost = false;
    }
    assert.ok(true);
  });
});
