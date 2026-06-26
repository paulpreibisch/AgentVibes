/**
 * Targeted coverage for track-picker.js _previewTrack error branches:
 *   - lines 249-250: track file missing  → fs.existsSync(trackPath) === false
 *   - lines 256-259: no MP3 player found → spawnMp3Player(...) returns null
 *
 * Drives the REAL openTrackPicker() and fires the captured space-key handler,
 * which calls _previewTrack(). We mock blessed (UI), ../audio-env.js
 * (spawnMp3Player) and node:fs (existsSync/readdirSync) so nothing real plays
 * or touches disk. AGENTVIBES_TEST_MODE is left unset so IS_TEST is false and
 * the preview code path actually runs.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mutable controllers for the mocked modules
// ---------------------------------------------------------------------------
let _existsResult = false;        // controls fs.existsSync
let _spawnResult = null;          // controls spawnMp3Player return value

// ---------------------------------------------------------------------------
// Tracking blessed stub (handlers actually capture callbacks)
// ---------------------------------------------------------------------------
const _allWidgets = [];

function makeTrackedWidget(tag = 'widget') {
  const _h = {};
  const w = {
    _tag: tag,
    _handlers: _h,
    append:   () => {},
    remove:   () => {},
    setContent: (c) => { w.content = c ?? ''; },
    getContent: () => w.content,
    setLabel: () => {},
    show:     () => {},
    hide:     () => {},
    focus:    () => {},
    select:   (idx) => { w.selected = typeof idx === 'number' ? idx : 0; },
    setItems: () => {},
    clearItems: () => {},
    getValue: () => '',
    key:      (keys, cb) => { [].concat(keys).forEach(k => { _h[`key:${k}`] = cb; }); },
    on:       (event, cb) => { _h[`on:${event}`] = cb; },
    off:      () => {},
    once:     (event, cb) => { _h[`once:${event}`] = cb; },
    removeListener: () => {},
    emit:     (event, ...args) => { try { _h[`on:${event}`]?.(...args); } catch {} },
    destroy:  () => {},
    free:     () => {},
    render:   () => {},
    setFront: () => {},
    style:    { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, selected: {}, item: {} },
    border:   { type: 'line' },
    hidden:   false,
    content:  '',
    height:   40,
    width:    120,
    items:    [],
    ritems:   [],
    lines:    [],
    selected: 0,
    rows:     40,
    cols:     120,
  };
  _allWidgets.push(w);
  return w;
}

const blessedStub = {
  box:    () => makeTrackedWidget('box'),
  text:   () => makeTrackedWidget('text'),
  list:   () => makeTrackedWidget('list'),
  button: () => makeTrackedWidget('button'),
  prompt: () => makeTrackedWidget('prompt'),
  screen: () => makeTrackedWidget('screen'),
  escape: (str) => str || '',
};

// ---------------------------------------------------------------------------
// Mock modules BEFORE importing the target
// ---------------------------------------------------------------------------
await mock.module('blessed', { defaultExport: blessedStub });

await mock.module('node:fs', {
  defaultExport: {
    existsSync: () => _existsResult,
    readdirSync: () => ['agentvibes_soft_flamenco_loop.mp3'],
    readFileSync: () => '{}',
  },
  namedExports: {
    existsSync: () => _existsResult,
    readdirSync: () => ['agentvibes_soft_flamenco_loop.mp3'],
    readFileSync: () => '{}',
  },
});

await mock.module('../../src/console/audio-env.js', {
  namedExports: {
    buildAudioEnv: () => ({ PATH: '' }),
    spawnMp3Player: () => _spawnResult,
    detectMp3Player: () => null,
    detectWavPlayer: () => null,
    getAllWavPlayers: () => [],
    detectRemoteLlm: () => null,
  },
});

const { openTrackPicker } =
  await import('../../src/console/widgets/track-picker.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeScreen() {
  const s = makeTrackedWidget('screen');
  s.rows = 40;
  return s;
}

function findListWidget(widgets) {
  return widgets.find(w => w._tag === 'list' && w._handlers['key:space']);
}

function openAndGetList() {
  _allWidgets.length = 0;
  const screen = makeScreen();
  openTrackPicker(screen, null, 70, () => {}, () => {});
  return findListWidget(_allWidgets);
}

// ---------------------------------------------------------------------------
// Drive the error branches
// ---------------------------------------------------------------------------
describe('track-picker-cov', () => {
  test('preview with missing track file hits the "missing" branch (249-250)', () => {
    _existsResult = false;          // fs.existsSync → false → lines 249-250
    const list = openAndGetList();
    assert.ok(list, 'track list widget should be created');
    list.selected = 0;
    assert.doesNotThrow(() => list._handlers['key:space']());
  });

  test('preview with no available MP3 player hits the "no player" branch (256-259)', () => {
    _existsResult = true;           // file exists → fall through to spawn
    _spawnResult = null;            // spawnMp3Player → null → lines 256-259
    const list = openAndGetList();
    assert.ok(list, 'track list widget should be created');
    list.selected = 0;
    assert.doesNotThrow(() => list._handlers['key:space']());
  });
});
