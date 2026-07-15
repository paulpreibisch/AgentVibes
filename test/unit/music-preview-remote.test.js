/**
 * Unit coverage for the shared music-preview transport + bling readiness cue,
 * and their wiring into BOTH music-preview surfaces:
 *
 *   src/console/music-preview.js — resolveMusicProvider() detects a remote
 *   transport provider; spawnMusicRemote() builds the forward invocation
 *   (bash play-tts-ssh-remote.sh with AGENTVIBES_MUSIC_ONLY / _STOP +
 *   CLAUDE_PROJECT_DIR).
 *
 *   src/console/bling.js — playBlingCue() fires the readiness cue.
 *
 *   track-picker.js + music-tab.js — on a REMOTE provider, previewing a track
 *   plays the bling FIRST, then forwards the track to the receiver (parity with
 *   the voice preview). On a LOCAL provider the bling plays before local
 *   playback starts.
 *
 * We mock blessed (UI), node:fs (provider file + track dir), node:child_process
 * (capture the ordered spawn calls) and ../audio-env.js (capture local
 * playback). AGENTVIBES_TEST_MODE is left unset so the real preview code runs.
 */

import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Controllable mock state
// ---------------------------------------------------------------------------
let _provider = 'ssh-remote';     // contents returned for tts-provider.txt
let _events = [];                 // ordered timeline of spawns / mp3 playback

const TRACK = 'agent_vibes_bossa_nova_v2_loop.mp3';

// ---------------------------------------------------------------------------
// Blessed stub (captures key handlers so we can fire them)
// ---------------------------------------------------------------------------
const _allWidgets = [];

function makeWidget(tag = 'widget') {
  const _h = {};
  const w = {
    _tag: tag,
    _handlers: _h,
    append: () => {}, remove: () => {}, prepend: () => {}, insert: () => {},
    setContent: (c) => { w.content = c ?? ''; }, getContent: () => w.content,
    setLabel: (l) => { w.label = l; }, getScroll: () => 0, setScrollPerc: () => {},
    show: () => {}, hide: () => {}, toggle: () => {}, focus: () => {}, press: () => {},
    scroll: () => {}, scrollTo: () => {},
    setItems: (items) => { w.items = (items || []).map(s => makeWidget('item')); w.ritems = items || []; },
    clearItems: () => { w.items = []; }, addItem: () => {}, getItem: () => null,
    setItem: () => {}, select: (i) => { w.selected = typeof i === 'number' ? i : 0; },
    move: () => {}, up: () => {}, down: () => {}, getValue: () => '', setValue: () => {},
    key: (keys, cb) => { [].concat(keys).forEach(k => { _h[`key:${k}`] = cb; }); },
    on: (event, cb) => { _h[`on:${event}`] = cb; },
    off: () => {}, once: () => {}, removeListener: () => {},
    emit: (event, ...args) => { try { _h[`on:${event}`]?.(...args); } catch {} },
    destroy: () => {}, free: () => {}, render: () => {}, setFront: () => {}, setBack: () => {}, setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {}, selected: {}, item: {} },
    border: { type: 'line' }, hidden: true, content: '', label: '',
    height: 40, width: 120, left: 0, top: 0, bottom: 0, right: 0,
    items: [], ritems: [], lines: [], selected: 0, focused: null, rows: 40, cols: 120,
  };
  _allWidgets.push(w);
  return w;
}

const blessedStub = {
  box: () => makeWidget('box'), text: () => makeWidget('text'),
  textbox: () => makeWidget('textbox'), textarea: () => makeWidget('textarea'),
  list: () => makeWidget('list'), listbar: () => makeWidget('listbar'),
  button: () => makeWidget('button'), prompt: () => makeWidget('prompt'),
  screen: () => makeWidget('screen'), escape: (s) => s || '',
};

// ---------------------------------------------------------------------------
// Mocks — installed BEFORE importing the targets
// ---------------------------------------------------------------------------
await mock.module('blessed', { defaultExport: blessedStub });

const _fsImpl = {
  existsSync: () => true,
  readdirSync: () => [TRACK],
  readFileSync: (p) => (String(p).includes('tts-provider.txt') ? _provider : '{}'),
  writeFileSync: () => {},
};
await mock.module('node:fs', { defaultExport: _fsImpl, namedExports: _fsImpl });

function _fakeProc(kind, command, args, env) {
  _events.push({ kind, command, args, env });
  return {
    pid: 4242,
    stderr: { on: () => {} },
    on: () => {},
    kill: () => {},
    unref: () => {},
  };
}
await mock.module('node:child_process', {
  namedExports: {
    spawn: (command, args, opts) => _fakeProc('spawn', command, args, opts?.env),
    spawnSync: () => ({ status: 0, stdout: '', stderr: '' }),
    execFile: () => {},
  },
});

await mock.module('../../src/console/audio-env.js', {
  namedExports: {
    buildAudioEnv: () => ({ PATH: '' }),
    spawnMp3Player: (trackPath) => { _events.push({ kind: 'mp3', trackPath }); return { on: () => {}, kill: () => {} }; },
    detectMp3Player: () => null,
    detectWavPlayer: () => null,
    getAllWavPlayers: () => [],
    detectRemoteLlm: () => null,
  },
});

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------
const { resolveMusicProvider, spawnMusicRemote, REMOTE_PROVIDERS } =
  await import('../../src/console/music-preview.js');
const { playBlingCue, buildBlingCommand } = await import('../../src/console/bling.js');
const { openTrackPicker } = await import('../../src/console/widgets/track-picker.js');
const { createMusicTab } = await import('../../src/console/tabs/music-tab.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeScreen() { const s = makeWidget('screen'); s.rows = 40; s.render = () => {}; s.program = { clear: () => {} }; return s; }
function findList(from = 0) { return _allWidgets.slice(from).find(w => w._tag === 'list' && w._handlers['key:space']); }
const forwardCall = () => _events.find(e => e.kind === 'spawn' && e.env && e.env.AGENTVIBES_MUSIC_ONLY);

beforeEach(() => { _events = []; _allWidgets.length = 0; _provider = 'ssh-remote'; });

// ===========================================================================
describe('music-preview shared helpers', () => {
  test('REMOTE_PROVIDERS lists the transport providers', () => {
    assert.deepEqual(REMOTE_PROVIDERS, ['ssh-remote', 'agentvibes-receiver']);
  });

  test('resolveMusicProvider detects a remote provider', () => {
    _provider = 'ssh-remote';
    const mp = resolveMusicProvider('/pkg/root');
    assert.equal(mp.remote, true);
    assert.ok(mp.projectDir, 'projectDir is set');
  });

  test('resolveMusicProvider treats a local provider as non-remote', () => {
    _provider = 'piper';
    assert.equal(resolveMusicProvider('/pkg/root').remote, false);
  });

  test('spawnMusicRemote builds the play invocation (bash sender + AGENTVIBES_MUSIC_ONLY + CLAUDE_PROJECT_DIR)', () => {
    spawnMusicRemote({ packageRoot: '/pkg', projectDir: '/proj', env: { PATH: '' }, track: TRACK });
    const call = _events.at(-1);
    assert.equal(call.command, 'bash');
    assert.match(String(call.args[0]), /play-tts-ssh-remote\.sh$/);
    assert.equal(call.env.AGENTVIBES_MUSIC_ONLY, TRACK);
    assert.equal(call.env.CLAUDE_PROJECT_DIR, '/proj');
    assert.equal(call.env.AGENTVIBES_MUSIC_STOP, undefined);
  });

  test('spawnMusicRemote builds the stop invocation (AGENTVIBES_MUSIC_STOP, no track)', () => {
    spawnMusicRemote({ packageRoot: '/pkg', projectDir: '/proj', env: {}, stop: true });
    const call = _events.at(-1);
    assert.equal(call.env.AGENTVIBES_MUSIC_STOP, '1');
    assert.equal(call.env.AGENTVIBES_MUSIC_ONLY, undefined);
  });

  test('playBlingCue fires a fire-and-forget cue spawn', () => {
    playBlingCue('/pkg/root');
    const call = _events.at(-1);
    assert.equal(call.kind, 'spawn');
    // Not a music-forward spawn (no MUSIC_ONLY/STOP env)
    assert.equal(call.env?.AGENTVIBES_MUSIC_ONLY, undefined);
    assert.equal(call.env?.AGENTVIBES_MUSIC_STOP, undefined);
  });

  test('buildBlingCommand is re-exported and returns a { command, args } shape', () => {
    const r = buildBlingCommand('linux', '/x/bling.wav', false);
    assert.equal(typeof r.command, 'string');
    assert.ok(Array.isArray(r.args));
  });
});

// ===========================================================================
describe('track-picker preview — remote forwarding + bling ordering', () => {
  test('remote provider: blings FIRST, then forwards the track to the receiver', () => {
    _provider = 'ssh-remote';
    const before = _allWidgets.length;
    openTrackPicker(makeScreen(), TRACK, 20, () => {}, () => {});
    const list = findList(before);
    assert.ok(list, 'picker list created');
    list.selected = 0;
    list._handlers['key:space']();

    const fwd = forwardCall();
    assert.ok(fwd, 'a remote-forward spawn happened');
    assert.equal(fwd.env.AGENTVIBES_MUSIC_ONLY, TRACK, 'forwards the selected track');
    // No local mp3 playback on the remote path
    assert.equal(_events.find(e => e.kind === 'mp3'), undefined);
    // Bling precedes the forward
    const fwdIdx = _events.indexOf(fwd);
    const blingIdx = _events.findIndex(e => e.kind === 'spawn' && !e.env?.AGENTVIBES_MUSIC_ONLY && !e.env?.AGENTVIBES_MUSIC_STOP);
    assert.ok(blingIdx >= 0 && blingIdx < fwdIdx, 'bling spawn comes before the forward spawn');
  });

  test('remote provider: second Space on the same track sends a stop (toggle off)', () => {
    _provider = 'ssh-remote';
    const before = _allWidgets.length;
    openTrackPicker(makeScreen(), TRACK, 20, () => {}, () => {});
    const list = findList(before);
    list.selected = 0;
    list._handlers['key:space']();   // start
    _events = [];
    list._handlers['key:space']();   // toggle off
    const stop = _events.find(e => e.kind === 'spawn' && e.env?.AGENTVIBES_MUSIC_STOP === '1');
    assert.ok(stop, 'a music-stop signal was sent');
  });

  test('local provider: blings FIRST, then plays locally (no remote forward)', () => {
    _provider = 'piper';
    const before = _allWidgets.length;
    openTrackPicker(makeScreen(), TRACK, 20, () => {}, () => {});
    const list = findList(before);
    list.selected = 0;
    list._handlers['key:space']();

    const mp3Idx = _events.findIndex(e => e.kind === 'mp3');
    assert.ok(mp3Idx >= 0, 'local playback happened');
    assert.equal(forwardCall(), undefined, 'no remote forward on the local path');
    const blingIdx = _events.findIndex(e => e.kind === 'spawn');
    assert.ok(blingIdx >= 0 && blingIdx < mp3Idx, 'bling spawn comes before local playback');
  });
});

// ===========================================================================
describe('music-tab preview — remote forwarding + bling ordering (parity)', () => {
  test('remote provider: blings FIRST, then forwards the track to the receiver', () => {
    _provider = 'ssh-remote';
    const services = {
      configService: {
        getConfig: () => ({ backgroundMusic: { track: TRACK, enabled: false, volume: 20 }, musicFavorites: [], customTracks: [] }),
        set: () => {}, setGlobal: () => {}, getGlobalConfig: () => ({}),
      },
      focusMainTabBar: () => {}, updateHeaderStatus: () => {}, languageService: null,
    };
    const before = _allWidgets.length;
    const tab = createMusicTab(makeScreen(), services);
    tab.show();                        // populates the track list
    const list = findList(before);
    assert.ok(list, 'music-tab track list created');
    list.selected = 0;
    _events = [];
    list._handlers['key:space']();     // preview selected track

    const fwd = forwardCall();
    assert.ok(fwd, 'a remote-forward spawn happened');
    assert.equal(fwd.env.AGENTVIBES_MUSIC_ONLY, TRACK);
    assert.equal(_events.find(e => e.kind === 'mp3'), undefined, 'no local playback on remote');
    const fwdIdx = _events.indexOf(fwd);
    const blingIdx = _events.findIndex(e => e.kind === 'spawn' && !e.env?.AGENTVIBES_MUSIC_ONLY && !e.env?.AGENTVIBES_MUSIC_STOP);
    assert.ok(blingIdx >= 0 && blingIdx < fwdIdx, 'bling spawn comes before the forward spawn');
  });
});
