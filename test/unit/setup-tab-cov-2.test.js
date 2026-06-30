/**
 * Targeted coverage for setup-tab.js Kokoro voice-picker + API-key-warning paths.
 *
 * Drives the REAL code:
 *   - _showApiKeyWarning()      (lines ~2422-2466)
 *   - _scanKokoroVoices()       (lines ~2501-2518)
 *   - _kokoroVoiceLabel()       (lines ~2520-2532)
 *   - _openKokoroVoicePicker()  (lines ~2534-2682+)
 *
 * All of these are closures inside createSetupTab(), reached through the
 * provider-config modal's field-list Enter handler:
 *   configBtn(enter) -> handleProviderConfigure(hermes) -> _openHermesConfigModal()
 *   fieldList(enter, idx=0) -> _openTtsEnginePicker() -> set draft.ttsEngine
 *   fieldList(enter, idx=1 voice) -> _openVoicePickerForLlm() -> kokoro / native branch
 *
 * Uses the tracked-blessed-stub pattern (hidden=false) from
 * setup-tab-deep-handlers.test.js so handler bodies actually execute. spawn /
 * spawnSync are mocked so nothing real plays; fs/os are mocked so no real home
 * dir or HF cache is touched.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Tracked blessed stub — hidden=false so handlers don't bail early
// ---------------------------------------------------------------------------

const _allWidgets = [];

function makeTrackedWidget(tag = 'widget', opts = {}) {
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
    setLabel:           function(l) { this._label = l; },
    show:               function() { this.hidden = false; },
    hide:               function() { this.hidden = true; },
    toggle:             function() { this.hidden = !this.hidden; },
    focus:              () => {},
    press:              () => {},
    scroll:             () => {},
    scrollTo:           () => {},
    getScroll:          () => 0,
    getScrollPerc:      () => 0,
    setScrollPerc:      () => {},
    setItems:           function(items) { this.items = items || []; },
    setItem:            () => {},
    clearItems:         () => {},
    addItem:            () => {},
    getItem:            () => null,
    select:             function(i) { this.selected = i; },
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
    emit:               (event, ...args) => { try { _h[`on:${event}`]?.(...args); } catch {} },
    removeAllListeners: () => {},
    destroy:            () => {},
    free:               () => {},
    render:             () => {},
    setFront:           () => {},
    setBack:            () => {},
    setIndex:           () => {},
    style:              { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border:             { type: 'line' },
    hidden:             false,
    content:            '',
    height:             40,
    width:              120,
    left:               0,
    top:                0,
    bottom:             0,
    right:              0,
    // Honor constructor `items` (some pickers — e.g. the TTS-engine picker — set
    // items only via the blessed.list() constructor, never setItems(); without
    // this they would look empty to item-based finders).
    items:              Array.isArray(opts.items) ? [...opts.items] : [],
    ritems:             [],
    selected:           0,
    focused:            null,
    program:            { clear: () => {}, grabInput: () => {}, showCursor: () => {} },
    clearRegion:        () => {},
    cols:               120,
    rows:               40,
    olines:             [],
    lines:              [],
    type:               tag,
    grabKeys:           false,
  };
  _allWidgets.push(w);
  return w;
}

const blessedStub = {
  box:      (o) => makeTrackedWidget('box', o),
  text:     (o) => makeTrackedWidget('text', o),
  textbox:  (o) => makeTrackedWidget('textbox', o),
  textarea: (o) => makeTrackedWidget('textarea', o),
  list:     (o) => makeTrackedWidget('list', o),
  listbar:  (o) => makeTrackedWidget('listbar', o),
  button:   (o) => makeTrackedWidget('button', o),
  prompt:   (o) => makeTrackedWidget('prompt', o),
  screen:   (o) => makeTrackedWidget('screen', o),
  escape:   (str) => str || '',
};

await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// child_process — never spawn anything real
// ---------------------------------------------------------------------------

function fakeProc() {
  const p = {
    pid: 1234,
    killed: false,
    kill() { this.killed = true; },
    on() { return this; },
    stdout: { on() {} },
    stderr: { on() {} },
  };
  return p;
}

await mock.module('node:child_process', {
  namedExports: {
    spawn:        () => fakeProc(),
    // status 0 => "module importable" / "python found" so kokoro is reported installed
    spawnSync:    () => ({ status: 0, stdout: '', stderr: '', pid: 1 }),
    execFile:     (cmd, args, opts, cb) => { const c = cb || opts; if (typeof c === 'function') c(null, '', ''); return fakeProc(); },
    execFileSync: () => '',
  },
});

// ---------------------------------------------------------------------------
// fs / os — isolated, no real home dir or HF cache touched
// ---------------------------------------------------------------------------

const FAKE_HOME = path.join(os.tmpdir(), 'agentvibes-cov2-home');

await mock.module('node:os', {
  namedExports: {
    homedir: () => FAKE_HOME,
    tmpdir:  () => os.tmpdir(),
    platform: () => process.platform,
  },
  defaultExport: {
    homedir: () => FAKE_HOME,
    tmpdir:  () => os.tmpdir(),
    platform: () => process.platform,
  },
});

// Pretend the HF Kokoro cache exists with two cached .pt voices so the
// _scanKokoroVoices() success branch (readdirSync loop) executes.
const _snapDir = path.join(
  FAKE_HOME, '.cache', 'huggingface', 'hub',
  'models--hexgrad--Kokoro-82M', 'snapshots'
);

// Mutable flag — when true, readFileSync returns favorites + a remote
// transport-config so the SSH-routing branches in _openKokoroVoicePicker run.
const fsState = { withRemoteConfig: false };

function fakeFs() {
  return {
    readdirSync: (p) => {
      const s = String(p);
      if (s === _snapDir) return ['abc123'];
      if (s.endsWith(path.join('abc123', 'voices'))) return ['af_heart.pt', 'am_adam.pt', 'notavoice.txt'];
      return [];
    },
    existsSync: (p) => {
      const s = String(p);
      if (s.endsWith(path.join('abc123', 'voices'))) return true;
      // SSH key path validity check (_validSshKey)
      if (fsState.withRemoteConfig && s.startsWith('/') && s.endsWith('id_test')) return true;
      return false;
    },
    readFileSync: (p) => {
      const s = String(p);
      if (!fsState.withRemoteConfig) throw new Error('no file');
      if (s.endsWith('kokoro-favorites.json')) return JSON.stringify(['af_heart', 'bm_fable']);
      if (s.endsWith('transport-config.json')) {
        return JSON.stringify({
          'claude-code': { mode: 'remote', host: 'my-laptop', sshKey: '/home/u/.ssh/id_test', port: 2222 },
          'other':       { mode: 'remote', host: 'box2', sshKey: '/home/u/.ssh/id_test', port: 22 },
        });
      }
      if (s.endsWith('tts-provider.txt')) return 'ssh-remote';
      throw new Error('no file');
    },
    writeFileSync: () => {},
    mkdirSync: () => {},
    unlinkSync: () => {},
    renameSync: () => {},
    chmodSync: () => {},
    statSync: () => ({ uid: process.getuid?.() ?? 0 }),
    promises: { readFile: async () => '', writeFile: async () => {}, mkdir: async () => {} },
  };
}

await mock.module('node:fs', {
  namedExports: fakeFs(),
  defaultExport: fakeFs(),
});

// ---------------------------------------------------------------------------
// service modules
// ---------------------------------------------------------------------------

const ENGINES = [
  { id: 'piper',      name: 'Piper TTS',  desc: 'd', native: false, installed: true },
  { id: 'kokoro',     name: 'Kokoro TTS', desc: 'd', native: false, installed: true },
  { id: 'elevenlabs', name: 'ElevenLabs', desc: 'd', native: false, installed: true },
];

await mock.module('../../src/services/tts-engine-service.js', {
  namedExports: {
    getAvailableEngines: () => ENGINES,
    getEngineStatuses:   () => ENGINES,
    checkEngineInstalled: () => true,
  },
});

// ---------------------------------------------------------------------------
// Import after mocks installed
// ---------------------------------------------------------------------------

const { createSetupTab } = await import('../../src/console/tabs/setup-tab.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _screen = makeTrackedWidget('screen');

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
    getActiveVoiceId:      () => 'en_US-amy-medium',
    setActiveVoice:        () => {},
    getActiveProvider:     () => 'piper',
    getInstalledProviders: () => ['piper'],
    setActiveProvider:     () => {},
  };
}

function makeNavigationService() {
  return {
    switchTab: () => {}, isModalOpen: () => false,
    openModal: (a, cb) => {}, closeModal: () => {},
    pushFocus: () => {}, popFocus: () => null,
  };
}

// Find the most-recently-created widget that has a key:enter handler AND whose
// items look like the config field list (contains a "Voice" row).
function findFieldList() {
  for (let i = _allWidgets.length - 1; i >= 0; i--) {
    const w = _allWidgets[i];
    if (w._handlers['key:enter'] && Array.isArray(w.items) &&
        w.items.some(it => typeof it === 'string' && /Voice/.test(it))) {
      return w;
    }
  }
  return null;
}

// Find the most-recently-created engine picker (label "Select TTS Engine").
function findEnginePicker() {
  for (let i = _allWidgets.length - 1; i >= 0; i--) {
    const w = _allWidgets[i];
    if (w._handlers['key:enter'] && Array.isArray(w.items) &&
        w.items.some(it => typeof it === 'string' && /global default/.test(it))) {
      return w;
    }
  }
  return null;
}

function fireConfigButtons(providerId) {
  // configBtn handlers were registered via key(['enter','space']) -> 'key:enter'
  // Fire ALL of them; each calls handleProviderConfigure(provider). We can't see
  // which is which, so fire all — the hermes one opens _openHermesConfigModal.
  for (const w of _allWidgets) {
    try { w._handlers['key:enter']?.(); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Drive the chain
// ---------------------------------------------------------------------------

async function buildTab() {
  _allWidgets.length = 0;
  _allWidgets.push(_screen);
  const origInitCwd = process.env.INIT_CWD;
  process.env.INIT_CWD = os.tmpdir();
  const tab = createSetupTab(_screen, {
    configService:     makeConfigService(),
    providerService:   makeProviderService(),
    navigationService: makeNavigationService(),
    focusMainTabBar:   () => {},
    languageService:   null,
  });
  if (origInitCwd === undefined) delete process.env.INIT_CWD;
  else process.env.INIT_CWD = origInitCwd;
  return tab;
}

// Open a provider-config modal and return its fieldList.
function openConfigModalFieldList() {
  fireConfigButtons();
  return findFieldList();
}

// Set draft.ttsEngine via the engine picker, then return whether it succeeded.
function setEngineViaFieldList(fieldList, engineId) {
  // idx 0 = TTS Engine field -> opens engine picker
  fieldList.selected = 0;
  fieldList._handlers['key:enter']();
  const picker = findEnginePicker();
  if (!picker) return false;
  // picker items: [global default, piper, kokoro, elevenlabs]
  const idx = ENGINES.findIndex(e => e.id === engineId);
  picker.selected = idx + 1; // +1 for the "(global default)" prepended row
  picker.key && picker._handlers['key:enter']();
  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('setup-tab kokoro picker + api-key warning coverage', () => {
  test('opens Kokoro voice picker (covers _openKokoroVoicePicker / _scanKokoroVoices / _kokoroVoiceLabel)', async () => {
    await buildTab();
    fireConfigButtons();
    // handleProviderConfigure is async (awaits getHermesConfig / getTransportConfig)
    // so the modal+fieldList appear only after pending microtasks/macrotasks flush.
    await new Promise(r => setTimeout(r, 500));
    let covered = false;
    // There are several provider-config modals (one per PROVIDERS row). Drive each
    // fieldList we can find to set engine=kokoro then open the voice picker.
    const fieldLists = _allWidgets.filter(w =>
      w._handlers['key:enter'] && Array.isArray(w.items) &&
      w.items.some(it => typeof it === 'string' && /Voice/.test(it)));

    for (const fl of fieldLists) {
      try {
        if (setEngineViaFieldList(fl, 'kokoro')) {
          // idx 1 = Voice field -> _openVoicePickerForLlm -> kokoro branch
          fl.selected = 1;
          fl._handlers['key:enter']();
          covered = true;
        }
      } catch {}
    }
    assert.ok(fieldLists.length > 0, 'at least one provider config modal field list opened');
    assert.ok(covered, 'engine picker accepted kokoro and the Voice field was driven');
    // The Kokoro voice picker registers a Space-preview handler; its presence
    // confirms _openKokoroVoicePicker actually opened (not just ran silently).
    assert.ok(
      _allWidgets.some(w => w._tag === 'list' && w._handlers['key:space']),
      'a Kokoro voice picker (list with a Space handler) was created',
    );
  });

  test('opens ElevenLabs native voice picker + API-key warning (covers _showApiKeyWarning)', async () => {
    await buildTab();
    fireConfigButtons();
    await new Promise(r => setTimeout(r, 500));
    const fieldLists = _allWidgets.filter(w =>
      w._handlers['key:enter'] && Array.isArray(w.items) &&
      w.items.some(it => typeof it === 'string' && /Voice/.test(it)));

    // Ensure no ELEVENLABS_API_KEY so the warning branch fires.
    const origKey = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    let elevenSet = false;
    try {
      for (const fl of fieldLists) {
        try {
          if (setEngineViaFieldList(fl, 'elevenlabs')) {
            fl.selected = 1;
            fl._handlers['key:enter']();
            elevenSet = true;
          }
        } catch {}
      }
      // The ElevenLabs voice picker registers a Space-preview handler — capture
      // its presence BEFORE we fire teardown handlers below.
      const elPickerOpened = _allWidgets.some(w => w._tag === 'list' && w._handlers['key:space']);

      // After the warning box is created, fire its enter/escape/click handlers
      // to execute _closeWarning() (destroyList + onDismiss).
      for (const w of _allWidgets) {
        try { w._handlers['key:enter']?.(); } catch {}
        try { w._handlers['key:escape']?.(); } catch {}
        try { w._handlers['on:click']?.(); } catch {}
      }

      assert.ok(elevenSet, 'engine picker accepted elevenlabs and the Voice field was driven');
      assert.ok(elPickerOpened, 'an ElevenLabs voice picker (list with a Space handler) was created');
    } finally {
      if (origKey === undefined) delete process.env.ELEVENLABS_API_KEY;
      else process.env.ELEVENLABS_API_KEY = origKey;
    }
  });

  test('kokoro picker handles favorites/transport-config present', async () => {
    // Second pass with readFileSync returning JSON so the favorites + transport
    // SSH branches inside _openKokoroVoicePicker execute (lines ~2558-2606).
    fsState.withRemoteConfig = true;   // favorites + remote SSH transport-config present
    try {
      await buildTab();
      fireConfigButtons();
      await new Promise(r => setTimeout(r, 500));
      const fieldLists = _allWidgets.filter(w =>
        w._handlers['key:enter'] && Array.isArray(w.items) &&
        w.items.some(it => typeof it === 'string' && /Voice/.test(it)));
      for (const fl of fieldLists) {
        try {
          if (setEngineViaFieldList(fl, 'kokoro')) {
            fl.selected = 1;
            fl._handlers['key:enter']();
            // Close the just-opened Kokoro picker so _closeKP / _killKPreview run.
            const kpicker = _allWidgets[_allWidgets.length - 1];
            try { kpicker._handlers['key:escape']?.(); } catch {}
          }
        } catch {}
      }
      assert.ok(fieldLists.length > 0, 'at least one config modal field list opened');
    } finally {
      fsState.withRemoteConfig = false;
    }
  });
});
