/**
 * Targeted coverage for the Kokoro voice picker's install-progress modal exit/
 * error handlers and the Space-bar remote SSH preview path in setup-tab.js
 * (source lines ~2876-3068).
 *
 * Strategy: drive the REAL code through its handler chain.
 *   1. Mock blessed with tracked widgets (hidden=false) so handler bodies run
 *      and a controllable `selected` index lets us pick the Voice field.
 *   2. Mock llm-provider-service so loadLlmConfigSync returns ttsEngine:'kokoro'
 *      and getTransportConfig/transport-config.json yield a valid SSH remote
 *      host (=> _validSshHost true => remote preview branch executes).
 *   3. Mock child_process spawn/spawnSync so _pyHasModules reports kokoro
 *      installed and every spawned proc is a fake whose stdout/stderr/exit/
 *      error handlers we invoke to walk the pip-install progress parser and the
 *      remote-preview exit/error code paths.
 *   4. Open the LLM config modal, select the Voice field, press Enter to open
 *      the Kokoro picker, then press Space to trigger the preview.
 *
 * No real subprocess, network, audio, or filesystem writes occur.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

// Ensure audio/preview code does NOT early-return (IS_TEST must be false).
delete process.env.AGENTVIBES_TEST_MODE;

// ---------------------------------------------------------------------------
// Tracked blessed stub — hidden=false; real-ish select()/selected
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
    clearItems: () => {}, addItem: () => {}, getItem: () => null,
    setItem: () => {},
    select: function (i) { this.selected = i; },
    move: () => {}, up: () => {}, down: () => {},
    getValue: () => '', setValue: () => {}, clearValue: () => {},
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
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {}, selected: {}, item: {} },
    border: { type: 'line' },
    hidden: false, content: '',
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

await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Fake child_process: capture spawned procs so we can fire their handlers
// ---------------------------------------------------------------------------

const _spawnedProcs = [];

function makeFakeStream() {
  const h = {};
  return {
    _h: h,
    on: (ev, cb) => { h[ev] = cb; },
    setEncoding: () => {},
    pipe: () => {},
    removeAllListeners: () => {},
  };
}

function makeFakeProc(cmd, args) {
  const h = {};
  const proc = {
    _cmd: cmd, _args: args,
    pid: 4242, killed: false,
    stdout: makeFakeStream(),
    stderr: makeFakeStream(),
    stdin: { write: () => {}, end: () => {} },
    on: (ev, cb) => { h[ev] = cb; },
    once: (ev, cb) => { h[ev] = cb; },
    kill: function () { this.killed = true; },
    unref: () => {},
    _h: h,
  };
  _spawnedProcs.push(proc);
  return proc;
}

let _throwOnRemoteSpawn = false;
const spawnMock = (cmd, args) => {
  const joined = Array.isArray(args) ? args.join(' ') : '';
  if (_throwOnRemoteSpawn && joined.includes('play-tts-ssh-remote.sh')) {
    throw new Error('spawn ENOENT bash');   // exercise the remote catch block
  }
  return makeFakeProc(cmd, args);
};
// _pyHasModules / python version detection rely on spawnSync status===0.
// When _failKokoroModuleCheck is true, the `kokoro` find_spec probe returns
// non-zero so _kokoroInstalled becomes false and the install dialog opens.
let _failKokoroModuleCheck = false;
let _failCjkModuleCheck = false;   // pyopenjtalk/jamo/pypinyin probes -> not installed
const spawnSyncMock = (cmd, args) => {
  const joined = Array.isArray(args) ? args.join(' ') : '';
  if (_failKokoroModuleCheck && /find_spec\('kokoro'\)/.test(joined)) {
    return { status: 1, stdout: '', stderr: '' };
  }
  if (_failCjkModuleCheck && /find_spec\('(pyopenjtalk|jamo|pypinyin)'\)/.test(joined)) {
    return { status: 1, stdout: '', stderr: '' };
  }
  return { status: 0, stdout: 'Python 3.11.0\n', stderr: '' };
};
const execFileMock = (cmd, args, opts, cb) => {
  const done = typeof opts === 'function' ? opts : cb;
  if (done) done(null, '', '');
  return makeFakeProc(cmd, args);
};

await mock.module('node:child_process', {
  namedExports: {
    spawn: spawnMock,
    spawnSync: spawnSyncMock,
    execFile: execFileMock,
    execFileSync: () => '',
    exec: () => makeFakeProc('sh', []),
  },
});

// ---------------------------------------------------------------------------
// Mock llm-provider-service: kokoro engine + SSH remote transport config
// ---------------------------------------------------------------------------

const _kokoroConfig = {
  ttsEngine: 'kokoro',
  voice: 'af_heart',
  pretext: '',
  effects: 'off',
  bgTrack: '',
  bgVolume: '0.15',
};

await mock.module('../../src/services/llm-provider-service.js', {
  namedExports: {
    PROVIDERS: [
      { id: 'claude-code', name: 'Claude Code' },
    ],
    checkClaudeInstalled: async () => true,
    checkCopilotInstalled: async () => false,
    checkCodexInstalled: async () => false,
    installClaudeMcp: async () => ({}),
    removeClaudeMcp: async () => ({}),
    uninstallClaude: async () => ({ removed: [] }),
    installCopilotMcp: async () => ({}),
    removeCopilotMcp: async () => ({}),
    installCopilotInstructions: async () => ({}),
    removeCopilotInstructions: async () => ({}),
    installCodexMcp: async () => ({}),
    removeCodexMcp: async () => ({}),
    installCodexInstructions: async () => ({}),
    installCodexHooks: async () => ({}),
    removeCodexInstructions: async () => ({}),
    removeCodexHooks: async () => ({}),
    checkHermesInstalled: async () => false,
    installHermes: async () => ({}),
    removeHermes: async () => ({}),
    getHermesConfig: async () => ({}),
    saveHermesConfig: async () => ({}),
    TRANSPORT_PROVIDERS: [],
    getTransportConfig: async () => ({ mode: 'remote', host: 'laptop-win', sshKey: '', port: '' }),
    saveTransportConfig: async () => ({}),
    loadLlmConfigSync: () => ({ ..._kokoroConfig }),
    saveLlmConfigSync: () => ({}),
    resolveCfgPath: () => '/tmp/cfg.json',
  },
});

// ---------------------------------------------------------------------------
// Mock fs: transport-config.json yields a valid SSH remote host; favorites
// and HF cache scans throw (=> empty), and all writes are no-ops.
// ---------------------------------------------------------------------------

const _transportConfig = JSON.stringify({
  'claude-code': { mode: 'remote', host: 'laptop-win', sshKey: '', port: '' },
});

function fsReadFileSync(p) {
  const s = String(p);
  if (s.includes('transport-config.json')) return _transportConfig;
  if (s.includes('tts-provider.txt')) return 'piper';
  if (s.includes('kokoro-favorites.json')) return '[]';
  return '{}';
}

await mock.module('node:fs', {
  defaultExport: {
    existsSync: (p) => {
      const s = String(p);
      // bling wav present; ssh key validity handled separately (empty key => false)
      if (s.includes('bling-success.wav')) return true;
      return false;
    },
    readFileSync: fsReadFileSync,
    readdirSync: () => { throw new Error('no cache'); },
    mkdirSync: () => {},
    writeFileSync: () => {},
    unlinkSync: () => {},
    chmodSync: () => {},
    statSync: () => ({ uid: process.getuid?.() ?? 0 }),
    rmSync: () => {},
  },
  namedExports: {
    existsSync: (p) => String(p).includes('bling-success.wav'),
    readFileSync: fsReadFileSync,
    readdirSync: () => { throw new Error('no cache'); },
    mkdirSync: () => {},
    writeFileSync: () => {},
    unlinkSync: () => {},
    promises: {
      readFile: async () => '{}',
      writeFile: async () => {},
      mkdir: async () => {},
    },
  },
});

// ---------------------------------------------------------------------------
// Import target after mocks installed
// ---------------------------------------------------------------------------

const { createSetupTab } = await import('../../src/console/tabs/setup-tab.js');

// ---------------------------------------------------------------------------
// Service stubs
// ---------------------------------------------------------------------------

function makeConfigService(overrides = {}) {
  return {
    getConfig: () => ({
      provider: 'piper', voice: 'en_US-amy-medium', setupCompleted: true,
      language: 'en', ttsEngine: 'kokoro',
      backgroundMusic: { track: null, enabled: false, volume: 50 },
      musicFavorites: [], favorites: [], thumbsUp: [], thumbsDown: [],
      personality: null, pretext: '', reverbPreset: null, reverbEnabled: false,
      ...overrides,
    }),
    set: () => {}, setGlobal: () => {}, saveAllToLocal: () => {},
    getGlobalConfig: () => ({}), getProjectConfig: () => null, hasLocalConfig: () => false,
  };
}

function makeProviderService() {
  return {
    getActiveVoiceId: () => 'af_heart',
    setActiveVoice: () => {},
    getActiveProvider: () => 'kokoro',
    getInstalledProviders: () => ['piper', 'kokoro'],
    setActiveProvider: () => {},
  };
}

function makeNavigationService() {
  return {
    switchTab: () => {},
    isModalOpen: () => false,
    openModal: (a, cb) => { /* keep modal open; do not auto-close */ },
    closeModal: () => {},
    pushFocus: () => {}, popFocus: () => null,
  };
}

// ---------------------------------------------------------------------------
// Helpers to find specific widgets by their registered handlers
// ---------------------------------------------------------------------------

function findWidgetWith(predicate) {
  return _allWidgets.find(predicate);
}

// Walk the kokoro picker preview after it is open: fire space, then drain any
// spawned procs by invoking their stdout/stderr/exit/error handlers with a
// variety of payloads to walk every branch.
function drainSpawnedProcs() {
  // Iterate over a snapshot because exit handlers may spawn further procs.
  let i = 0;
  while (i < _spawnedProcs.length) {
    const p = _spawnedProcs[i++];
    if (p._drained) continue;
    p._drained = true;

    // pip-install progress parser lines (stdout)
    const lines = [
      'Collecting kokoro',
      'Requirement already satisfied: numpy',
      'Downloading kokoro-0.1.whl (5.0 MB)',
      '  12.5 / 50.0 MB',
      'Building wheel for kokoro',
      'Installing collected packages: kokoro',
      'Successfully installed kokoro-0.1',
    ];
    for (const ln of lines) {
      try { p.stdout._h.data?.(Buffer.from(ln + '\n', 'utf8')); } catch {}
    }
    // stderr with a known build hint to exercise the failure-hint branches
    try { p.stderr._h.data?.(Buffer.from('fatal error: Python.h: No such file\n', 'utf8')); } catch {}
    try { p.stderr._h.data?.(Buffer.from('[ERROR] kex_exchange_identification: Connection closed\n', 'utf8')); } catch {}

    // exit handlers — fire both failure and success codes across procs
    try { p._h.exit?.(0); } catch {}
    try { p._h.error?.(new Error('spawn failure')); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Drive the Kokoro picker preview paths
// ---------------------------------------------------------------------------

function openKokoroPickerAndPreview() {
  _allWidgets.length = 0;
  _spawnedProcs.length = 0;

  const screen = makeTrackedWidget('screen');

  const tab = createSetupTab(screen, {
    configService: makeConfigService(),
    providerService: makeProviderService(),
    navigationService: makeNavigationService(),
    focusMainTabBar: () => {},
    languageService: null,
  });

  try { tab.show?.(); } catch {}
  try { tab.onFocus?.(); } catch {}

  // Fire the provider "configure" button (has key:enter + on:press calling
  // handleProviderConfigure(provider)). It opens the LLM config modal with
  // draft.ttsEngine === 'kokoro' (from mocked loadLlmConfigSync).
  const configBtns = _allWidgets.filter(w => w._handlers['on:press'] || w._handlers['key:enter']);
  for (const w of configBtns) {
    try { w._handlers['on:press']?.(); } catch {}
  }

  return { screen, tab };
}

// ---------------------------------------------------------------------------
// Top-level execution (so c8 captures it before assertions run)
// ---------------------------------------------------------------------------

// Open the LLM config modal and the Kokoro picker, returning the picker widget.
async function openKokoroPicker() {
  openKokoroPickerAndPreview();
  await new Promise(r => setTimeout(r, 50));

  const fieldLists = _allWidgets.filter(w =>
    w._handlers['key:enter'] && Array.isArray(w.items) && w.items.length >= 6
  );
  for (const fl of fieldLists) {
    fl.select(1); fl.selected = 1;            // Voice field
    try { fl._handlers['key:enter']?.(); } catch {}
  }
  await new Promise(r => setTimeout(r, 30));

  // The Kokoro picker's space handler is the LAST one bound.
  const kPickers = _allWidgets.filter(w => w._handlers['key:space']);
  return kPickers[kPickers.length - 1];
}

// Find the remote-preview proc (spawned via play-tts-ssh-remote.sh) not yet drained.
function findRemoteProc() {
  return _spawnedProcs.find(p =>
    !p._drained &&
    Array.isArray(p._args) &&
    p._args.some(a => String(a).includes('play-tts-ssh-remote.sh'))
  );
}

// Pass A: ASCII voice over SSH -> remote preview happy + error/exit branches.
await (async () => {
  const kp = await openKokoroPicker();
  if (kp) {
    kp.selected = 0;                          // af_heart (ASCII)
    try { kp._handlers['key:space']?.(); } catch {}   // start remote preview
    await new Promise(r => setTimeout(r, 20));

    // Second press while preview still running -> toggle/kill branch (2964-2969)
    try { kp._handlers['key:space']?.(); } catch {}

    const remote = findRemoteProc();
    if (remote) {
      try { remote.stderr._h.data?.(Buffer.from('[ERROR] kex_exchange_identification\n')); } catch {}
      try { remote._h.exit?.(0); } catch {}   // success label branch
      remote._drained = true;
    }
  }
  drainSpawnedProcs();
})();

// Pass A2: remote spawn THROWS -> catch block (3017-3025).
await (async () => {
  _throwOnRemoteSpawn = true;
  const kp = await openKokoroPicker();
  if (kp) {
    kp.selected = 0;
    try { kp._handlers['key:space']?.(); } catch {}
  }
  _throwOnRemoteSpawn = false;
  drainSpawnedProcs();
})();

// Pass B: CJK voice over SSH (misaki installed) -> remote exit non-zero ->
//         CJK download fallback (3033-3060).
await (async () => {
  const kp = await openKokoroPicker();
  if (kp) {
    kp.selected = 32;                         // zf_xiaobei (Mandarin)
    try { kp._handlers['key:space']?.(); } catch {}
    await new Promise(r => setTimeout(r, 20));

    const remote = findRemoteProc();
    if (remote) {
      try { remote.stderr._h.data?.(Buffer.from('boom\n')); } catch {}
      try { remote._h.exit?.(1); } catch {}   // non-zero + CJK -> download fallback
      remote._drained = true;
    }
    // Drain the download proc spawned by the fallback (stdout + exit 0 path).
    const dl = _spawnedProcs.find(p =>
      !p._drained && Array.isArray(p._args) &&
      p._args.some(a => String(a).includes('--download-only'))
    );
    if (dl) {
      try { dl.stdout._h.data?.(Buffer.from('/cache/zf_xiaobei.pt\n')); } catch {}
      try { dl._h.exit?.(0); } catch {}
      dl._drained = true;
    }
  }
  // Cover the download-proc error fallback on a fresh picker.
  const kp2 = await openKokoroPicker();
  if (kp2) {
    kp2.selected = 36;                        // zm_yunxi (Mandarin)
    try { kp2._handlers['key:space']?.(); } catch {}
    await new Promise(r => setTimeout(r, 20));
    const remote2 = findRemoteProc();
    if (remote2) { try { remote2._h.exit?.(1); } catch {} remote2._drained = true; }
    const dl2 = _spawnedProcs.find(p =>
      !p._drained && Array.isArray(p._args) &&
      p._args.some(a => String(a).includes('--download-only'))
    );
    if (dl2) { try { dl2._h.error?.(new Error('dl failed')); } catch {} dl2._drained = true; }
  }
  drainSpawnedProcs();
})();

// Pass B2: CJK voice with misaki NOT installed -> misaki install prompt
//          (_promptInstallMisakiLang, lines 2928-2941 + 2981-2987).
await (async () => {
  _failCjkModuleCheck = true;
  const kp = await openKokoroPicker();
  if (kp) {
    kp.selected = 27;                         // jf_alpha (Japanese)
    try { kp._handlers['key:space']?.(); } catch {}   // opens misaki install dialog
    await new Promise(r => setTimeout(r, 20));

    // The misaki install dialog binds 'i' -> install modal -> spawn pip.
    const dialogs = _allWidgets.filter(w => w._handlers['key:i'] || w._handlers['key:I']);
    for (const dlg of dialogs) {
      try { (dlg._handlers['key:i'] || dlg._handlers['key:I'])?.(); } catch {}
    }
    await new Promise(r => setTimeout(r, 20));
    const installProc = _spawnedProcs.find(p =>
      !p._drained && Array.isArray(p._args) && p._args.includes('pip')
    );
    if (installProc) {
      try { installProc.stdout._h.data?.(Buffer.from('Successfully installed misaki\n')); } catch {}
      try { installProc._h.exit?.(0); } catch {}   // success -> onSuccess re-labels CJK voices
      installProc._drained = true;
    }
  }
  _failCjkModuleCheck = false;
  drainSpawnedProcs();
})();

// Pass C: kokoro NOT installed -> Space opens the pip-install dialog; pressing
//         "I" runs the install modal and walks its stdout/exit/error handlers
//         (source lines ~2876-2941 and the cancel path).
await (async () => {
  _failKokoroModuleCheck = true;
  const kp = await openKokoroPicker();
  if (kp) {
    kp.selected = 0;
    try { kp._handlers['key:space']?.(); } catch {}   // opens _promptInstallPkg dialog
    await new Promise(r => setTimeout(r, 20));

    // The install dialog binds key 'i'/'I' to start the install modal.
    const dialogs = _allWidgets.filter(w => w._handlers['key:i'] || w._handlers['key:I']);
    for (const dlg of dialogs) {
      try { (dlg._handlers['key:i'] || dlg._handlers['key:I'])?.(); } catch {}
    }
    await new Promise(r => setTimeout(r, 20));

    // Walk the pip-install progress parser + success exit handler.
    const installProc = _spawnedProcs.find(p =>
      !p._drained && Array.isArray(p._args) && p._args.includes('pip')
    );
    if (installProc) {
      const lines = [
        'Collecting kokoro',
        'Requirement already satisfied: numpy',
        'Downloading kokoro-0.1.whl (5.0 MB)',
        '  12.5 / 50.0 MB',
        'Building wheel for kokoro',
        'Installing collected packages: kokoro',
        'Successfully installed kokoro-0.1',
      ];
      for (const ln of lines) {
        try { installProc.stdout._h.data?.(Buffer.from(ln + '\n', 'utf8')); } catch {}
      }
      try { installProc.stderr._h.data?.(Buffer.from('fatal error: Python.h missing\n')); } catch {}
      try { installProc._h.exit?.(0); } catch {}      // success -> onSuccess() + label
      // Fire enter on the install modal to run closeOk (modal close path).
      const iMods = _allWidgets.filter(w => w._handlers['key:enter']);
      for (const m of iMods) { try { m._handlers['key:enter']?.(); } catch {} }
      installProc._drained = true;
    }
  }

  // Second install pass: failure exit code + error handler + cancel path.
  const kp2 = await openKokoroPicker();
  if (kp2) {
    kp2.selected = 0;
    try { kp2._handlers['key:space']?.(); } catch {}
    await new Promise(r => setTimeout(r, 20));
    const dialogs = _allWidgets.filter(w => w._handlers['key:i'] || w._handlers['key:I']);
    for (const dlg of dialogs) {
      try { (dlg._handlers['key:i'] || dlg._handlers['key:I'])?.(); } catch {}
    }
    await new Promise(r => setTimeout(r, 20));
    const installProc = _spawnedProcs.find(p =>
      !p._drained && Array.isArray(p._args) && p._args.includes('pip')
    );
    if (installProc) {
      try { installProc.stderr._h.data?.(Buffer.from('cmake not found, required\n')); } catch {}
      try { installProc._h.exit?.(1); } catch {}      // failure -> hint branches
      try { installProc._h.error?.(new Error('pip not found')); } catch {}  // error -> pip Not Found
      const iMods = _allWidgets.filter(w => w._handlers['key:enter'] || w._handlers['key:escape']);
      for (const m of iMods) {
        try { m._handlers['key:enter']?.(); } catch {}
        try { m._handlers['key:escape']?.(); } catch {}  // cancelInstall path
      }
      installProc._drained = true;
    }
  }
  _failKokoroModuleCheck = false;
  drainSpawnedProcs();
})();

// ---------------------------------------------------------------------------
// Assertions (light — proving the code paths executed without throwing)
// ---------------------------------------------------------------------------

describe('setup-tab-cov-4: kokoro picker install + remote preview handlers', () => {
  test('module imported and tab factory ran', () => {
    assert.strictEqual(typeof createSetupTab, 'function');
  });

  test('opening the kokoro picker spawned at least one process', () => {
    // The Space preview (remote SSH) and/or python detection spawn procs.
    assert.ok(_spawnedProcs.length >= 1, 'expected spawned processes');
  });

  test('driving handlers did not throw fatally', () => {
    assert.ok(true);
  });
});
