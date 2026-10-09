/**
 * Story 8.3 (AVI-S8.3) — Bug 4 regression test.
 *
 * music-tab.js's "Save Globally & Locally" button (in the track Save modal)
 * called `configService.setGlobal('backgroundMusic', { track })`, which
 * REPLACES the entire global `backgroundMusic` object — silently dropping
 * `volume` and `enabled`. This violates the Non-Destructive Configuration
 * Rule: setting a track should never reset the user's saved volume or
 * disable music.
 *
 * The fix reads the current global `backgroundMusic` object and merges the
 * new `track` into it before writing.
 *
 * This test drives the REAL code path: mocks `blessed`, opens the Save
 * modal for a track (via the real trackList 'enter' handler), and clicks
 * the real "Save Globally & Locally" button.
 */

import { test, describe, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Mock blessed — tracked-widget stub that also records button `content`
// labels, so the test can find "Save Globally & Locally" among several
// buttons created in the same modal.
// ---------------------------------------------------------------------------

const _allWidgets = [];

function makeTrackedWidget(tag = 'widget', opts = {}) {
  const _h = {};
  const w = {
    _tag: tag,
    _content: opts.content ?? '',
    _handlers: _h,
    append: () => {}, remove: () => {}, prepend: () => {},
    insert: () => {}, insertBefore: () => {}, insertAfter: () => {},
    setContent: () => {}, getContent: () => w._content, setLabel: () => {},
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
    border: { type: 'line' }, hidden: true, content: opts.content ?? '',
    height: 40, width: 120, left: 0, top: 0, bottom: 0, right: 0,
    items: [], ritems: [], selected: 0, focused: null,
    program: { clear: () => {}, grabInput: () => {}, showCursor: () => {} },
    clearRegion: () => {}, cols: 120, rows: 40, olines: [], type: tag, grabKeys: false,
  };
  _allWidgets.push(w);
  return w;
}

const blessedStub = {
  box:      (opts) => makeTrackedWidget('box', opts),
  text:     (opts) => makeTrackedWidget('text', opts),
  textbox:  (opts) => makeTrackedWidget('textbox', opts),
  textarea: (opts) => makeTrackedWidget('textarea', opts),
  list:     (opts) => makeTrackedWidget('list', opts),
  listbar:  (opts) => makeTrackedWidget('listbar', opts),
  button:   (opts) => makeTrackedWidget('button', opts),
  prompt:   (opts) => makeTrackedWidget('prompt', opts),
  screen:   (opts) => makeTrackedWidget('screen', opts),
  escape:   (str)  => str || '',
};

await mock.module('blessed', { defaultExport: blessedStub });

// node:child_process is pulled in transitively via audio-env.js — stub it so
// nothing real ever spawns.
await mock.module('node:child_process', {
  namedExports: {
    spawn: () => ({ on: () => {}, kill: () => {}, pid: 1 }),
    spawnSync: () => ({ status: 0, stdout: '', stderr: '' }),
    execFileSync: () => '',
  },
});

const { createMusicTab } = await import('../../src/console/tabs/music-tab.js');

// ---------------------------------------------------------------------------
// Isolate cwd — applyEnabledToFile()/applyTrackToAudioEffects() (called by
// _saveLocally(), which "Save Globally & Locally" also triggers) write to
// `${process.cwd()}/.claude/config/*`. Point cwd at an empty temp dir so
// this test can NEVER touch the real repo's or home's .claude/config/
// files (Non-Destructive Configuration Rule). Both functions are written to
// no-op safely when the directory/file doesn't exist.
// ---------------------------------------------------------------------------

const _origCwd = process.cwd();
let _tempDir;

before(() => {
  _tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-avi83-music-test-'));
  process.chdir(_tempDir);
});

after(() => {
  process.chdir(_origCwd);
  try { fs.rmSync(_tempDir, { recursive: true, force: true }); } catch {}
});

/**
 * Global backgroundMusic config as it would exist on disk BEFORE the user
 * touches the Save modal — a previously-configured volume and enabled flag
 * that must survive a "Save Globally" of a different track.
 */
const EXISTING_GLOBAL_BG_MUSIC = Object.freeze({
  track: 'agentvibes_soft_flamenco_loop.mp3',
  volume: 35,
  enabled: true,
});

function makeConfigService() {
  const localCfg = {
    backgroundMusic: { ...EXISTING_GLOBAL_BG_MUSIC },
    musicFavorites: [],
    customTracks: [],
  };
  const setGlobalCalls = [];
  return {
    getConfig: () => ({ ...localCfg }),
    set: (k, v) => { localCfg[k] = v; },
    setGlobal: (k, v) => { setGlobalCalls.push([k, v]); },
    getGlobalConfig: () => ({ backgroundMusic: { ...EXISTING_GLOBAL_BG_MUSIC } }),
    getProjectConfig: () => null,
    _setGlobalCalls: setGlobalCalls,
  };
}

function setupTab() {
  _allWidgets.length = 0;
  const screen = makeTrackedWidget('screen');
  const configService = makeConfigService();
  const services = {
    configService,
    focusMainTabBar: () => {},
    updateHeaderStatus: () => {},
    languageService: null,
  };
  const tab = createMusicTab(screen, services);
  tab.show?.();

  const trackList = _allWidgets.find(w => w._handlers['key:enter'] && w._tag === 'list');
  assert.ok(trackList, 'trackList widget must exist');
  trackList.selected = 0;
  trackList._handlers['key:enter'](); // opens the Save modal for the selected track

  const saveGloballyBtn = _allWidgets.find(w => w._tag === 'button' && w._content === 'Save Globally & Locally');
  assert.ok(saveGloballyBtn, '"Save Globally & Locally" button must be created');

  return { configService, saveGloballyBtn };
}

describe('AVI-8.3 bug 4 — music-tab "Save Globally" merges, does not replace', () => {
  test('setGlobal is called with the merged object, not a bare { track }', () => {
    const { configService, saveGloballyBtn } = setupTab();
    saveGloballyBtn._handlers['key:enter']();

    const call = configService._setGlobalCalls.find(([k]) => k === 'backgroundMusic');
    assert.ok(call, 'setGlobal("backgroundMusic", ...) must have been called');
    const [, value] = call;
    assert.notDeepStrictEqual(value, { track: value.track },
      'must not be a bare object with only "track" — that would drop volume/enabled');
  });

  test('volume survives "Save Globally"', () => {
    const { configService, saveGloballyBtn } = setupTab();
    saveGloballyBtn._handlers['key:enter']();

    const [, value] = configService._setGlobalCalls.find(([k]) => k === 'backgroundMusic');
    assert.strictEqual(value.volume, EXISTING_GLOBAL_BG_MUSIC.volume,
      'volume must be preserved from the existing global config');
  });

  test('enabled survives "Save Globally"', () => {
    const { configService, saveGloballyBtn } = setupTab();
    saveGloballyBtn._handlers['key:enter']();

    const [, value] = configService._setGlobalCalls.find(([k]) => k === 'backgroundMusic');
    assert.strictEqual(value.enabled, EXISTING_GLOBAL_BG_MUSIC.enabled,
      'enabled must be preserved from the existing global config');
  });

  test('track is actually updated to the newly selected track', () => {
    const { configService, saveGloballyBtn } = setupTab();
    saveGloballyBtn._handlers['key:enter']();

    const [, value] = configService._setGlobalCalls.find(([k]) => k === 'backgroundMusic');
    assert.notStrictEqual(value.track, EXISTING_GLOBAL_BG_MUSIC.track,
      'the whole point of Save Globally is to change the track');
    assert.ok(typeof value.track === 'string' && value.track.length > 0);
  });

  test('never introduces a 70%/0.70 volume default — no regression on the project rule', () => {
    const { configService, saveGloballyBtn } = setupTab();
    saveGloballyBtn._handlers['key:enter']();

    const [, value] = configService._setGlobalCalls.find(([k]) => k === 'backgroundMusic');
    assert.notStrictEqual(value.volume, 70);
    assert.notStrictEqual(value.volume, 0.70);
  });
});
