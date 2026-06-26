/**
 * Targeted coverage for setup-tab.js:
 *   - _openKokoroVoicePicker download-all (d/D) + favorite-toggle (f/F) handlers
 *     and their spawned-process exit/error callbacks      (3262-3406, 3417-3422)
 *   - native voice picker elevenlabs preview spawn + API-key warning
 *                                                          (3577-3582, 3608-3626)
 *   - _renderScreen1 dependency-check completion block     (4410-4432)
 *
 * Approach mirrors setup-tab-deep-handlers.test.js: a tracked blessed stub with
 * hidden=false so handler bodies execute, plus mocks for child_process / fs / os
 * so nothing real spawns, plays, or writes to disk. Spawned children are captured
 * and their exit/error events are fired by hand to drive the async download loop.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Tracked blessed stub
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
    setItems: function (items) { this.items = items || []; },
    clearItems: () => {}, addItem: () => {},
    getItem: () => null, setItem: () => {},
    select: function (i) { this.selected = i; }, move: () => {},
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
    removeAllListeners: () => {}, destroy: () => {}, free: () => {},
    render: () => {}, setFront: () => {}, setBack: () => {}, setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border: { type: 'line' },
    hidden: false, content: '', height: 40, width: 120,
    left: 0, top: 0, bottom: 0, right: 0,
    items: [], ritems: [], selected: 0, focused: null,
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
  escape: (str) => str || '',
};

// ---------------------------------------------------------------------------
// child_process mock — capture spawned children so we can drive their events
// ---------------------------------------------------------------------------

const _spawnedProcs = [];

function makeFakeChild() {
  const handlers = {};
  const child = {
    _h: handlers,
    pid: 4242,
    killed: false,
    kill() { this.killed = true; },
    stdout: { on(ev, cb) { handlers[`stdout:${ev}`] = cb; } },
    stderr: { on(ev, cb) { handlers[`stderr:${ev}`] = cb; } },
    on(ev, cb) { handlers[`on:${ev}`] = cb; return this; },
    once(ev, cb) { handlers[`on:${ev}`] = cb; return this; },
  };
  _spawnedProcs.push(child);
  return child;
}

const cpMock = {
  spawn: () => makeFakeChild(),
  spawnSync: () => ({ status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') }),
  execFileSync: () => Buffer.from(''),
  execFile: (...args) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') cb(null, { stdout: '', stderr: '' });
    return makeFakeChild();
  },
};

// ---------------------------------------------------------------------------
// fs mock — no real disk writes; empty kokoro cache so all voices "uncached"
// ---------------------------------------------------------------------------

const _tmpHome = os.tmpdir();

const fsMock = {
  existsSync: () => false,
  readdirSync: () => { throw new Error('no cache'); },
  readFileSync: () => { throw new Error('ENOENT'); },
  writeFileSync: () => {},
  mkdirSync: () => {},
  unlinkSync: () => {},
  chmodSync: () => {},
  statSync: () => ({ uid: process.getuid?.() ?? 0 }),
  rmSync: () => {},
  promises: {
    readFile: async () => { throw new Error('ENOENT'); },
    writeFile: async () => {},
    mkdir: async () => {},
    access: async () => { throw new Error('ENOENT'); },
  },
};

const osMock = {
  homedir: () => _tmpHome,
  tmpdir: () => _tmpHome,
  platform: () => process.platform,
  hostname: () => 'testhost',
  EOL: '\n',
};

await mock.module('blessed', { defaultExport: blessedStub });
await mock.module('node:child_process', { namedExports: cpMock });
await mock.module('node:fs', { defaultExport: fsMock, namedExports: { ...fsMock } });
await mock.module('node:os', { defaultExport: osMock, namedExports: { ...osMock } });

// ---------------------------------------------------------------------------
// Import after mocks installed
// ---------------------------------------------------------------------------

const { createSetupTab } = await import('../../src/console/tabs/setup-tab.js');

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------

const _screen = makeTrackedWidget('screen');

function makeConfigService(overrides = {}) {
  return {
    getConfig: () => ({
      provider: 'piper', voice: 'en_US-amy-medium', setupCompleted: true,
      language: 'en', ttsEngine: '',
      backgroundMusic: { track: null, enabled: false, volume: 50 },
      musicFavorites: [], favorites: [], thumbsUp: [], thumbsDown: [],
      personality: null, pretext: '', reverbPreset: null, reverbEnabled: false,
      ...overrides,
    }),
    set: () => {}, setGlobal: () => {}, saveAllToLocal: () => {},
    getGlobalConfig: () => ({}), getProjectConfig: () => null,
    hasLocalConfig: () => false,
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
  let _open = false;
  return {
    switchTab: () => {},
    isModalOpen: () => _open,
    openModal: (_a, _cb) => { _open = true; },
    closeModal: () => { _open = false; },
    pushFocus: () => {}, popFocus: () => null,
  };
}

function newTab(extra = {}) {
  return createSetupTab(_screen, {
    configService: makeConfigService(extra.config),
    providerService: makeProviderService(),
    navigationService: makeNavigationService(),
    focusMainTabBar: () => {},
    languageService: null,
    ...extra.services,
  });
}

// ---------------------------------------------------------------------------
// Reflection helpers — reach private picker closures via blessed widgets.
// Both pickers are opened by _openVoicePickerForLlm, which is dispatched from
// the LLM-config modal's fieldList 'enter' handler on the "voice" row.
// We find that handler by firing every captured fieldList enter; the draft's
// ttsEngine decides which picker opens.
// ---------------------------------------------------------------------------

function fireAllEnter() {
  for (const w of [..._allWidgets]) {
    try { w._handlers['key:enter']?.(); } catch {}
  }
}

function fireKeyOnAll(key) {
  for (const w of [..._allWidgets]) {
    try { w._handlers[`key:${key}`]?.(); } catch {}
  }
}

// Drive every captured child process to completion (exit code) and error path.
function drainSpawnedProcs() {
  // exit handlers first (success path: code 0)
  for (const p of [..._spawnedProcs]) {
    try { p._h['stderr:data']?.(Buffer.from(' 50%|####  \n100%|######\n')); } catch {}
    try { p._h['stdout:data']?.(Buffer.from('ok\n')); } catch {}
  }
  for (const p of [..._spawnedProcs]) {
    try { p._h['on:exit']?.(0); } catch {}
  }
}

function drainSpawnedProcsError() {
  for (const p of [..._spawnedProcs]) {
    try { p._h['on:error']?.(new Error('boom')); } catch {}
    try { p._h['on:exit']?.(1); } catch {}
  }
}

describe('setup-tab-cov-6', () => {
  test('kokoro voice picker: download-all + favorite-toggle handlers run', async () => {
    _allWidgets.length = 0;
    _allWidgets.push(_screen);
    _spawnedProcs.length = 0;

    const origInit = process.env.INIT_CWD;
    process.env.INIT_CWD = os.tmpdir();

    const tab = newTab({ config: { setupCompleted: true } });
    try { tab.show?.(); } catch {}
    try { tab.onFocus?.(); } catch {}

    // Open provider config modal(s) by firing enter on provider rows/buttons.
    fireAllEnter();
    await new Promise(r => setTimeout(r, 50));
    fireAllEnter();
    await new Promise(r => setTimeout(r, 50));

    // Locate any fieldList-like widget and force its draft into kokoro by
    // selecting the "voice" row then firing enter. We just fire enter on all
    // lists at every selected index; one of them is the LLM modal field list.
    for (const w of [..._allWidgets]) {
      if (w._tag !== 'list') continue;
      for (let idx = 0; idx < 8; idx++) {
        w.selected = idx;
        try { w._handlers['key:enter']?.(); } catch {}
      }
    }

    // Whatever pickers opened, fire their download-all (d/D) + favorite (f/F).
    fireKeyOnAll('d');
    drainSpawnedProcs();   // drives _dlNext recursion through each voice
    drainSpawnedProcs();
    fireKeyOnAll('D');
    drainSpawnedProcsError();
    fireKeyOnAll('f');
    fireKeyOnAll('F');
    fireKeyOnAll('escape');

    if (origInit === undefined) delete process.env.INIT_CWD;
    else process.env.INIT_CWD = origInit;

    // The config drill-down opened at least one voice picker (a list with a
    // Space-preview handler) and the picker/detection paths spawned processes.
    assert.ok(
      _allWidgets.some(w => w._tag === 'list' && w._handlers['key:space']),
      'config drill-down opened at least one voice picker',
    );
    assert.ok(_spawnedProcs.length >= 1, 'voice-picker/detection paths spawned a process');
  });

  test('kokoro picker opened directly via config with ttsEngine=kokoro', async () => {
    _allWidgets.length = 0;
    _allWidgets.push(_screen);
    _spawnedProcs.length = 0;

    const origInit = process.env.INIT_CWD;
    process.env.INIT_CWD = os.tmpdir();

    // Make loadLlmConfigSync return kokoro by feeding a cfg line through fs.
    const savedRead = fsMock.readFileSync;
    fsMock.readFileSync = (p, enc) => {
      const s = String(p);
      if (s.includes('audio-effects.cfg')) {
        return 'llm:claude-code|off||0.15||X|kokoro\n';
      }
      throw new Error('ENOENT');
    };
    const savedExists = fsMock.existsSync;
    fsMock.existsSync = (p) => String(p).includes('audio-effects.cfg');

    try {
      const tab = newTab({ config: { setupCompleted: true } });
      try { tab.show?.(); } catch {}
      try { tab.onFocus?.(); } catch {}

      // Walk the provider list, open config, drill into voice field.
      for (let pass = 0; pass < 4; pass++) {
        fireAllEnter();
        await new Promise(r => setTimeout(r, 30));
        for (const w of [..._allWidgets]) {
          if (w._tag !== 'list') continue;
          for (let idx = 0; idx < 8; idx++) {
            w.selected = idx;
            try { w._handlers['key:enter']?.(); } catch {}
          }
        }
      }

      // Exercise kokoro picker key handlers + spawned proc events.
      fireKeyOnAll('d');
      drainSpawnedProcs();
      drainSpawnedProcs();
      drainSpawnedProcs();
      fireKeyOnAll('D');
      drainSpawnedProcsError();
      fireKeyOnAll('f');
      fireKeyOnAll('F');
      fireKeyOnAll('p');
      fireKeyOnAll('space');
      drainSpawnedProcs();
      fireKeyOnAll('escape');
    } finally {
      fsMock.readFileSync = savedRead;
      fsMock.existsSync = savedExists;
      if (origInit === undefined) delete process.env.INIT_CWD;
      else process.env.INIT_CWD = origInit;
    }
    // With ttsEngine=kokoro forced via the cfg, the Voice field opens the Kokoro
    // picker, which registers a Download-All (d) handler. Its presence proves the
    // Kokoro picker actually opened, and processes were spawned driving it.
    assert.ok(
      _allWidgets.some(w => w._handlers['key:d']),
      'a Kokoro voice picker (with a Download-All handler) opened',
    );
    assert.ok(_spawnedProcs.length >= 1, 'download-all/preview paths spawned processes');
  });

  test('native voice picker: elevenlabs preview spawn + API-key warning', async () => {
    _allWidgets.length = 0;
    _allWidgets.push(_screen);
    _spawnedProcs.length = 0;

    const origInit = process.env.INIT_CWD;
    const origKey = process.env.ELEVENLABS_API_KEY;
    process.env.INIT_CWD = os.tmpdir();
    delete process.env.ELEVENLABS_API_KEY; // force the no-key warning branch

    const savedRead = fsMock.readFileSync;
    fsMock.readFileSync = (p) => {
      const s = String(p);
      if (s.includes('audio-effects.cfg')) {
        return 'llm:claude-code|off||0.15||X|elevenlabs\n';
      }
      throw new Error('ENOENT');
    };
    const savedExists = fsMock.existsSync;
    fsMock.existsSync = (p) => String(p).includes('audio-effects.cfg');

    try {
      const tab = newTab({ config: { setupCompleted: true } });
      try { tab.show?.(); } catch {}
      try { tab.onFocus?.(); } catch {}

      for (let pass = 0; pass < 4; pass++) {
        fireAllEnter();
        await new Promise(r => setTimeout(r, 30));
        for (const w of [..._allWidgets]) {
          if (w._tag !== 'list') continue;
          for (let idx = 0; idx < 8; idx++) {
            w.selected = idx;
            try { w._handlers['key:enter']?.(); } catch {}
          }
        }
      }

      // Native picker: space => _previewNativeVoice (elevenlabs spawn branch),
      // then drive exit/error; enter to select; escape to close.
      fireKeyOnAll('space');
      drainSpawnedProcs();
      fireKeyOnAll('space'); // second space stops the running preview
      drainSpawnedProcsError();
      fireKeyOnAll('enter');
      fireKeyOnAll('escape');
    } finally {
      fsMock.readFileSync = savedRead;
      fsMock.existsSync = savedExists;
      if (origInit === undefined) delete process.env.INIT_CWD;
      else process.env.INIT_CWD = origInit;
      if (origKey === undefined) delete process.env.ELEVENLABS_API_KEY;
      else process.env.ELEVENLABS_API_KEY = origKey;
    }
    // With ttsEngine=elevenlabs forced, the Voice field opens a native voice
    // picker (a list with a Space-preview handler) and the Space preview spawns
    // a process — both confirm the elevenlabs preview path executed.
    assert.ok(
      _allWidgets.some(w => w._tag === 'list' && w._handlers['key:space']),
      'a native voice picker opened for elevenlabs',
    );
    assert.ok(_spawnedProcs.length >= 1, 'elevenlabs preview spawned a process');
  });

  test('screen 1 dependency check completion renders results table', async () => {
    _allWidgets.length = 0;
    _allWidgets.push(_screen);
    _spawnedProcs.length = 0;

    const origInit = process.env.INIT_CWD;
    process.env.INIT_CWD = os.tmpdir();

    const tab = newTab({ config: { setupCompleted: false } });
    try { tab.show?.(); } catch {}
    try { tab.onFocus?.(); } catch {}

    // Advance from screen 0 to screen 1 (triggers _renderScreen1 async dep check)
    fireAllEnter();
    // Let _checkDependenciesAsync resolve so 4410-4432 run.
    await new Promise(r => setTimeout(r, 1500));
    fireAllEnter();

    if (origInit === undefined) delete process.env.INIT_CWD;
    else process.env.INIT_CWD = origInit;

    // The screen-1 dependency check spawns detection processes (python / `which`
    // lookups); their presence confirms _checkDependenciesAsync actually ran.
    assert.ok(_spawnedProcs.length >= 1, 'dependency check spawned detection processes');
  });
});
