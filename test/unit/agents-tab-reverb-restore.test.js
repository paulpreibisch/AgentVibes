/**
 * Story 8.3 (AVI-S8.3) — Bug 3 regression test.
 *
 * Windows agent-preview in agents-tab.js temp-patches personality.txt /
 * reverb-level.txt to apply per-agent settings during a preview, then is
 * supposed to restore them when the preview finishes. Before this fix,
 * the restore path had no unlink branch for reverb-level.txt, so a preview
 * that created the file for the first time left it permanently patched —
 * a violation of the project's Non-Destructive Configuration Rule.
 *
 * This test drives the REAL code path (not a reimplementation): it mocks
 * `blessed` and `node:child_process` so no real terminal/process is needed,
 * points `_projectRoot` at an isolated temp directory (never the real
 * project or home .claude/), and fires the actual 'space' key handler that
 * agents-tab.js registers for agent-preview.
 *
 * Covers:
 *   - reverb-level.txt (didn't exist before) is removed after preview close
 *   - personality.txt (existed before) is restored to its original content
 *   - idempotency: repeating the preview cycle leaves byte-identical state
 *   - abnormal exit: if the preview process's own 'exit' handler never
 *     fires (simulating a crash / quit mid-preview), the module-level
 *     `process.on('exit', ...)` safety net still restores everything.
 */

import { test, describe, mock, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Mock blessed — minimal tracked-widget stub (captures key/event handlers)
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

// ---------------------------------------------------------------------------
// Mock node:child_process — capture the "powershell" spawn without ever
// launching a real process.
// ---------------------------------------------------------------------------

let _lastSpawnedProc = null;

function makeFakeProc() {
  const handlers = {};
  const proc = {
    on: (event, cb) => { (handlers[event] ??= []).push(cb); return proc; },
    kill: () => {},
    pid: 999999,
    stdin: { write: () => {}, end: () => {} },
    _emit: (event, ...args) => { (handlers[event] || []).forEach(cb => cb(...args)); },
  };
  return proc;
}

const fakeSpawn = (..._args) => {
  _lastSpawnedProc = makeFakeProc();
  return _lastSpawnedProc;
};

// Other modules in the import chain (reverb-picker.js, audio-env.js,
// provider-service.js, tts-engine-service.js) also pull named exports off
// node:child_process — provide harmless stand-ins so the module resolves.
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

const { createAgentsTab } = await import('../../src/console/tabs/agents-tab.js');

// ---------------------------------------------------------------------------
// Isolated temp project root — NEVER the real repo or home .claude/
// ---------------------------------------------------------------------------

const _origCwd = process.cwd();
let _tempDir;
let _personalityFile;
let _reverbFile;
const _origPersonalityContent = 'sarcastic';

before(() => {
  _tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-avi83-test-'));
  const hooksWinDir = path.join(_tempDir, '.claude', 'hooks-windows');
  const configDir = path.join(_tempDir, '.claude', 'config');
  fs.mkdirSync(hooksWinDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  // Dummy play-tts.ps1 — existence is all _sampleWithFullEffectsWindows checks for.
  fs.writeFileSync(path.join(hooksWinDir, 'play-tts.ps1'), '# test stub, never executed (spawn is mocked)\n');

  _personalityFile = path.join(configDir, 'personality.txt');
  _reverbFile = path.join(configDir, 'reverb-level.txt');

  // personality.txt pre-exists — restore must bring back this exact content.
  fs.writeFileSync(_personalityFile, _origPersonalityContent);
  // reverb-level.txt does NOT pre-exist — restore must remove it, not leave
  // it patched. This is the exact bug: previously there was no unlink branch.
  assert.ok(!fs.existsSync(_reverbFile), 'precondition: reverb-level.txt must not exist yet');

  process.chdir(_tempDir);
});

after(() => {
  process.chdir(_origCwd);
  try { fs.rmSync(_tempDir, { recursive: true, force: true }); } catch {}
});

function makeConfigService() {
  const _cfg = {
    provider: 'piper',
    voice: 'en_US-amy-medium',
    verbosity: 'high',
    language: 'en',
    ttsEngine: '',
    backgroundMusic: { track: null, enabled: false, volume: 20 },
    personality: 'sarcastic', // truthy + not 'none' → personality.txt gets patched
    effects: { reverbPreset: 'light', enabled: true }, // → reverb-level.txt gets patched
  };
  return {
    getConfig: () => ({ ..._cfg }),
    set: () => {},
    setGlobal: () => {},
    getGlobalConfig: () => ({}),
    getProjectConfig: () => null,
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
  return {
    switchTab: () => {},
    isModalOpen: () => false,
    openModal: (cb) => { try { cb?.(); } catch {} },
    closeModal: () => {},
    pushFocus: () => {},
    popFocus: () => null,
  };
}

/** Build a fresh agents tab, show it (populates _agents), return the agentList widget. */
function setupTab() {
  _allWidgets.length = 0;
  const screen = makeTrackedWidget('screen');
  const services = {
    configService: makeConfigService(),
    providerService: makeProviderService(),
    navigationService: makeNavigationService(),
    focusMainTabBar: () => {},
    languageService: null,
  };
  const tab = createAgentsTab(screen, services);
  tab.show?.();
  // agentList is the widget with both an 'enter' and a 'space' key handler
  // registered (see agents-tab.js ~line 1835-1843).
  const agentList = _allWidgets.find(w => w._handlers['key:space'] && w._handlers['key:enter']);
  assert.ok(agentList, 'agentList widget with space/enter handlers must exist');
  return agentList;
}

/** Fire the real 'space' preview handler. Returns the fake spawned proc (or null if no agent). */
function triggerPreview(agentList) {
  _lastSpawnedProc = null;
  agentList.selected = 0;
  agentList._handlers['key:space']();
  return _lastSpawnedProc;
}

describe('AVI-8.3 bug 3 — agent-preview config patch/restore (agents-tab.js)', () => {
  // Reset to a known pristine state before EVERY test, regardless of whether
  // the previous test intentionally left files patched (e.g. to test restore
  // behavior). Without this, an earlier test's un-restored reverb-level.txt
  // would be misread as "pre-existing" by a later test, masking the bug.
  beforeEach(() => {
    fs.writeFileSync(_personalityFile, _origPersonalityContent);
    try { fs.unlinkSync(_reverbFile); } catch {}
    _lastSpawnedProc = null;
  });

  test('precondition: at least one BMAD agent is detected so space-preview has a target', () => {
    const agentList = setupTab();
    const proc = triggerPreview(agentList);
    assert.ok(proc, 'space key must spawn a preview process for a real agent — otherwise this whole test is vacuous');
  });

  test('during preview: both personality.txt and reverb-level.txt are patched', () => {
    const agentList = setupTab();
    triggerPreview(agentList);
    assert.strictEqual(fs.readFileSync(_personalityFile, 'utf8'), 'sarcastic');
    assert.ok(fs.existsSync(_reverbFile), 'reverb-level.txt should be created during patch');
    assert.strictEqual(fs.readFileSync(_reverbFile, 'utf8'), 'light');
  });

  test('normal completion: proc exit handler restores personality.txt and REMOVES reverb-level.txt', () => {
    const agentList = setupTab();
    const proc = triggerPreview(agentList);
    proc._emit('exit');

    assert.strictEqual(fs.readFileSync(_personalityFile, 'utf8'), _origPersonalityContent,
      'personality.txt must be restored to its pre-patch content');
    assert.ok(!fs.existsSync(_reverbFile),
      'reverb-level.txt must be REMOVED (it did not exist before the preview) — this is the core bug-3 fix');
  });

  test('idempotency: a second preview cycle leaves byte-identical state', () => {
    const agentList = setupTab();
    const proc1 = triggerPreview(agentList);
    proc1._emit('exit');
    const afterFirst = fs.readFileSync(_personalityFile, 'utf8');
    const reverbGoneFirst = !fs.existsSync(_reverbFile);

    const proc2 = triggerPreview(agentList);
    proc2._emit('exit');
    const afterSecond = fs.readFileSync(_personalityFile, 'utf8');
    const reverbGoneSecond = !fs.existsSync(_reverbFile);

    assert.strictEqual(afterSecond, afterFirst, 'personality.txt content must be identical after repeated previews');
    assert.strictEqual(afterSecond, _origPersonalityContent);
    assert.ok(reverbGoneFirst && reverbGoneSecond, 'reverb-level.txt absent after every preview cycle');
  });

  test('abnormal exit: if the child process never fires its own "exit" event, the process-level exit handler still restores config', () => {
    const agentList = setupTab();
    triggerPreview(agentList);
    // Do NOT emit 'exit' on the fake child — simulates a crash / quitting the
    // TUI mid-preview, before the per-preview proc handler runs.
    assert.strictEqual(fs.readFileSync(_personalityFile, 'utf8'), 'sarcastic', 'still patched at this point');
    assert.ok(fs.existsSync(_reverbFile), 'still patched at this point');

    // Simulate the whole process exiting — this fires every process.on('exit', ...)
    // handler, including the module-level safety net registered in agents-tab.js.
    process.emit('exit', 0);

    assert.strictEqual(fs.readFileSync(_personalityFile, 'utf8'), _origPersonalityContent,
      'personality.txt must be restored even when the preview process itself never signalled completion');
    assert.ok(!fs.existsSync(_reverbFile),
      'reverb-level.txt must be removed even on abnormal exit (process-level safety net)');
  });
});
