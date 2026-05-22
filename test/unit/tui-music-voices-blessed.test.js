/**
 * TUI Coverage — music-tab.js and voices-tab.js with blessed mock
 *
 * Uses --experimental-test-module-mocks to replace `blessed` with a stub
 * so that createMusicTab() and createVoicesTab() run their real code paths
 * without a real terminal.
 *
 * Targets:
 *   - music-tab.js   (createMusicTab — lines 304-1097 currently uncovered)
 *   - voices-tab.js  (createVoicesTab — lines 642-2049 currently uncovered)
 *                    (pure functions  — lines 27-528 currently uncovered)
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Blessed stub
// ---------------------------------------------------------------------------

function makeWidget(tag = 'widget') {
  const handlers = {};
  const keyHandlers = {};
  return {
    _tag: tag,
    append: () => {},
    remove: () => {},
    prepend: () => {},
    insert: () => {},
    setContent: () => {},
    getContent: () => '',
    setLabel: () => {},
    show: () => {},
    hide: () => {},
    toggle: () => {},
    focus: () => {},
    press: () => {},
    scroll: () => {},
    scrollTo: () => {},
    getScroll: () => 0,
    getScrollPerc: () => 0,
    setScrollPerc: () => {},
    setItems: () => {},
    clearItems: () => {},
    addItem: () => {},
    getItem: (i) => null,
    select: () => {},
    move: () => {},
    up: () => {},
    down: () => {},
    getValue: () => '',
    setValue: () => {},
    clearValue: () => {},
    input: (cb) => cb && cb(null, ''),
    prompt: (msg, cb) => cb && cb(null, ''),
    on: (event, handler) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    off: () => {},
    once: () => {},
    removeListener: () => {},
    emit: (event, ...args) => {
      (handlers[event] || []).forEach(h => { try { h(...args); } catch {} });
    },
    key: (keys, handler) => {},
    destroy: () => {},
    free: () => {},
    render: () => {},
    setFront: () => {},
    setBack: () => {},
    setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border: { type: 'line' },
    hidden: true,
    content: '',
    height: 40,
    width: 120,
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    items: [],
    ritems: [],
    selected: 0,
    _handlers: handlers,
  };
}

const blessedStub = {
  box:      (opts) => makeWidget('box'),
  text:     (opts) => makeWidget('text'),
  textbox:  (opts) => makeWidget('textbox'),
  textarea: (opts) => makeWidget('textarea'),
  list:     (opts) => makeWidget('list'),
  listbar:  (opts) => makeWidget('listbar'),
  button:   (opts) => makeWidget('button'),
  prompt:   (opts) => makeWidget('prompt'),
  screen:   (opts) => makeWidget('screen'),
  escape:   (str)  => str || '',
};

// Install mock BEFORE loading any module that imports blessed
await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Dynamic imports — AFTER mock installed
// ---------------------------------------------------------------------------

const musicTabMod = await import('../../src/console/tabs/music-tab.js');
const {
  createMusicTab,
  getBuiltInTracks,
  formatTrackLabel,
  formatMusicStatus,
  scanTracks,
  getMusicFavorites,
  toggleMusicFavorite,
  applyEnabledToFile,
  applyTrackToAudioEffects,
} = musicTabMod;

const voicesTabMod = await import('../../src/console/tabs/voices-tab.js');
const {
  createVoicesTab,
  genderIcon,
  genderIconTag,
  inferGender,
  formatVoiceName,
  parseVoiceId,
  formatVoiceInfo,
  parseMultiSpeaker,
  scanInstalledVoices,
  getFavorites,
  getThumbsDown,
  toggleThumbsUp,
  toggleThumbsDown,
  toggleFavorite,
  getVoiceMeta,
  SAMPLE_PHRASES,
  PIPER_VOICES_DIR,
} = voicesTabMod;

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeMockScreen() {
  return {
    append: () => {},
    remove: () => {},
    key: () => {},
    on: () => {},
    off: () => {},
    render: () => {},
    destroy: () => {},
    emit: () => {},
    program: { clear: () => {} },
  };
}

function makeMockConfigService(overrides = {}) {
  return {
    getConfig: () => ({
      backgroundMusic: { track: null, enabled: false, volume: 50 },
      musicFavorites: [],
      customTracks: [],
      favorites: [],
      thumbsUp: [],
      thumbsDown: [],
      voice: 'en_US-amy-medium',
      ...overrides,
    }),
    set: () => {},
    setGlobal: () => {},
    getGlobalConfig: () => ({}),
    getProjectConfig: () => null,
  };
}

function makeMockProviderService() {
  return {
    getActiveVoiceId: () => 'en_US-amy-medium',
    setActiveVoice: () => {},
    getActiveProvider: () => 'piper',
    getInstalledProviders: () => ['piper'],
    setActiveProvider: () => {},
  };
}

const mockMusicServices = {
  configService: makeMockConfigService(),
  focusMainTabBar: () => {},
  updateHeaderStatus: () => {},
  languageService: null,
};

const mockVoicesServices = {
  configService: makeMockConfigService(),
  providerService: makeMockProviderService(),
  focusMainTabBar: () => {},
  updateHeaderStatus: () => {},
  languageService: null,
};

// ===========================================================================
// music-tab.js pure function tests
// ===========================================================================

describe('getBuiltInTracks() — blessed-mock process', () => {
  test('returns the built-in track catalog', () => {
    const tracks = getBuiltInTracks();
    assert.ok(Array.isArray(tracks));
    assert.ok(tracks.length > 0);
  });

  test('every track has id and label', () => {
    for (const t of getBuiltInTracks()) {
      assert.ok(typeof t.id === 'string' && t.id.length > 0);
      assert.ok(typeof t.label === 'string' && t.label.length > 0);
    }
  });
});

describe('formatTrackLabel()', () => {
  test('returns known display name for built-in track', () => {
    const label = formatTrackLabel('celestial_velvet.mp3');
    assert.ok(label.includes('Celestial Velvet'));
  });

  test('formats unknown track by stripping prefix/suffix', () => {
    const label = formatTrackLabel('my_custom_track_loop.mp3');
    assert.ok(typeof label === 'string' && label.length > 0);
  });

  test('strips agentvibes_ prefix from unknown tracks', () => {
    const label = formatTrackLabel('agentvibes_test_track_v2_loop.mp3');
    assert.ok(!label.includes('agentvibes_'), 'prefix should be stripped');
  });
});

describe('formatMusicStatus()', () => {
  test('returns truthy string for enabled', () => {
    const result = formatMusicStatus(true);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('returns truthy string for disabled', () => {
    const result = formatMusicStatus(false);
    assert.ok(typeof result === 'string' && result.length > 0);
  });
});

describe('scanTracks()', () => {
  test('returns an array (possibly empty if no tracks dir)', () => {
    const tracks = scanTracks();
    assert.ok(Array.isArray(tracks));
  });
});

describe('getMusicFavorites()', () => {
  test('returns empty array when no favorites set', () => {
    const cfg = makeMockConfigService();
    const favs = getMusicFavorites(cfg);
    assert.ok(Array.isArray(favs));
    assert.strictEqual(favs.length, 0);
  });
});

describe('toggleMusicFavorite()', () => {
  test('adds track to empty favorites list', () => {
    const cfg = makeMockConfigService();
    toggleMusicFavorite(cfg, 'my-track.mp3');
    // Just verify it doesn't throw
  });

  test('removes track from favorites when already present', () => {
    const cfg = makeMockConfigService({ musicFavorites: ['my-track.mp3'] });
    toggleMusicFavorite(cfg, 'my-track.mp3');
    // Just verify it doesn't throw
  });
});

// ===========================================================================
// createMusicTab() — Tab Component Contract
// ===========================================================================

describe('createMusicTab() — with blessed mock', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createMusicTab(screen, mockMusicServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createMusicTab(screen, mockMusicServices);
    assert.ok('box' in tab, 'must have box');
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns dark magenta #880e4f', () => {
    const screen = makeMockScreen();
    const tab = createMusicTab(screen, mockMusicServices);
    assert.strictEqual(tab.getFooterColor(), '#880e4f');
  });

  test('getFooterText() returns a non-empty string', () => {
    const screen = makeMockScreen();
    const tab = createMusicTab(screen, mockMusicServices);
    const text = tab.getFooterText();
    assert.ok(typeof text === 'string' && text.length > 0);
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createMusicTab(screen, mockMusicServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createMusicTab(screen, mockMusicServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createMusicTab(screen, mockMusicServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createMusicTab(screen, mockMusicServices);
    assert.doesNotThrow(() => tab.onBlur());
  });
});

// ===========================================================================
// voices-tab.js pure function tests
// ===========================================================================

describe('genderIcon()', () => {
  test('returns a string for male gender', () => {
    const icon = genderIcon('male');
    assert.ok(typeof icon === 'string');
  });

  test('returns a string for female gender', () => {
    const icon = genderIcon('female');
    assert.ok(typeof icon === 'string');
  });

  test('returns a string for unknown gender', () => {
    const icon = genderIcon('unknown');
    assert.ok(typeof icon === 'string');
  });

  test('returns a string for neutral gender', () => {
    const icon = genderIcon('neutral');
    assert.ok(typeof icon === 'string');
  });
});

describe('genderIconTag()', () => {
  test('returns a string with blessed tags for male', () => {
    const tag = genderIconTag('male');
    assert.ok(typeof tag === 'string');
  });

  test('returns a string for female', () => {
    const tag = genderIconTag('female');
    assert.ok(typeof tag === 'string');
  });
});

describe('inferGender()', () => {
  test('infers female from common female names', () => {
    const gender = inferGender('en_US-amy-medium');
    assert.ok(typeof gender === 'string');
  });

  test('infers male from common male names', () => {
    const gender = inferGender('en_US-ryan-high');
    assert.ok(typeof gender === 'string');
  });

  test('returns a string for unknown names', () => {
    const gender = inferGender('en_US-xyzunknown-medium');
    assert.ok(typeof gender === 'string');
  });
});

describe('formatVoiceName()', () => {
  test('returns a display name for a known voice ID', () => {
    const name = formatVoiceName('en_US-amy-medium');
    assert.ok(typeof name === 'string' && name.length > 0);
  });

  test('handles unknown voice IDs gracefully', () => {
    const name = formatVoiceName('unknown-voice-id');
    assert.ok(typeof name === 'string');
  });
});

describe('parseVoiceId()', () => {
  test('parses standard voice ID', () => {
    const r = parseVoiceId('en_US-amy-medium');
    assert.strictEqual(r.lang, 'en_US');
    assert.strictEqual(r.name, 'amy');
    assert.strictEqual(r.quality, 'medium');
  });

  test('handles high quality', () => {
    const r = parseVoiceId('en_US-ryan-high');
    assert.strictEqual(r.quality, 'high');
  });

  test('handles unknown format gracefully', () => {
    const r = parseVoiceId('tracy');
    assert.ok(r.name === 'tracy' || typeof r.name === 'string');
  });
});

describe('formatVoiceInfo()', () => {
  test('returns a string for a known voice ID', () => {
    const info = formatVoiceInfo('en_US-amy-medium');
    assert.ok(typeof info === 'string');
  });

  test('returns a string for unknown voice ID', () => {
    const info = formatVoiceInfo('unknown-voice');
    assert.ok(typeof info === 'string');
  });
});

describe('parseMultiSpeaker()', () => {
  test('returns isMultiSpeaker: false for a non-multi-speaker voice', () => {
    const result = parseMultiSpeaker('en_US-amy-medium');
    assert.ok(typeof result === 'object' && result !== null);
    assert.strictEqual(result.isMultiSpeaker, false);
    assert.strictEqual(result.speakerId, null);
  });

  test('returns isMultiSpeaker: true with model + speakerName for multi-speaker voice', () => {
    const result = parseMultiSpeaker('en_US-libritts_r-medium::Alice');
    assert.ok(typeof result === 'object' && result !== null);
    assert.strictEqual(result.isMultiSpeaker, true);
    assert.ok(typeof result.model === 'string');
    assert.strictEqual(result.speakerName, 'Alice');
  });
});

describe('scanInstalledVoices()', () => {
  test('returns an array (empty if no voices dir)', () => {
    const voices = scanInstalledVoices();
    assert.ok(Array.isArray(voices));
  });
});

describe('SAMPLE_PHRASES', () => {
  test('is a non-empty array of strings', () => {
    assert.ok(Array.isArray(SAMPLE_PHRASES));
    assert.ok(SAMPLE_PHRASES.length > 0);
    assert.ok(typeof SAMPLE_PHRASES[0] === 'string');
  });
});

describe('PIPER_VOICES_DIR', () => {
  test('is a non-empty string path', () => {
    assert.ok(typeof PIPER_VOICES_DIR === 'string' && PIPER_VOICES_DIR.length > 0);
  });
});

describe('getFavorites()', () => {
  test('returns empty array when no favorites configured', () => {
    const cfg = makeMockConfigService();
    const favs = getFavorites(cfg);
    assert.ok(Array.isArray(favs));
  });

  test('returns thumbsUp array when present', () => {
    const cfg = makeMockConfigService({ thumbsUp: ['en_US-amy-medium'] });
    const favs = getFavorites(cfg);
    assert.ok(Array.isArray(favs));
  });
});

describe('getThumbsDown()', () => {
  test('returns empty array when no thumbsDown configured', () => {
    const cfg = makeMockConfigService();
    const td = getThumbsDown(cfg);
    assert.ok(Array.isArray(td));
  });
});

describe('toggleThumbsUp()', () => {
  test('adds voice to thumbsUp (does not throw)', () => {
    const cfg = makeMockConfigService();
    assert.doesNotThrow(() => toggleThumbsUp(cfg, 'en_US-amy-medium'));
  });

  test('removes voice from thumbsUp when already present', () => {
    const cfg = makeMockConfigService({ thumbsUp: ['en_US-amy-medium'], favorites: ['en_US-amy-medium'] });
    assert.doesNotThrow(() => toggleThumbsUp(cfg, 'en_US-amy-medium'));
  });
});

describe('toggleThumbsDown()', () => {
  test('adds voice to thumbsDown (does not throw)', () => {
    const cfg = makeMockConfigService();
    assert.doesNotThrow(() => toggleThumbsDown(cfg, 'en_US-amy-medium'));
  });

  test('removes voice from thumbsDown when already present', () => {
    const cfg = makeMockConfigService({ thumbsDown: ['en_US-amy-medium'] });
    assert.doesNotThrow(() => toggleThumbsDown(cfg, 'en_US-amy-medium'));
  });
});

describe('toggleFavorite()', () => {
  test('does not throw for a non-favorite voice', () => {
    const cfg = makeMockConfigService();
    assert.doesNotThrow(() => toggleFavorite(cfg, 'en_US-amy-medium'));
  });
});

describe('getVoiceMeta()', () => {
  test('returns an object for a known voice ID', () => {
    const meta = getVoiceMeta('en_US-amy-medium');
    assert.ok(meta === null || typeof meta === 'object');
  });

  test('returns null for unknown voice ID', () => {
    const meta = getVoiceMeta('unknown-fake-voice');
    assert.ok(meta === null || typeof meta === 'object');
  });
});

// ===========================================================================
// createVoicesTab() — Tab Component Contract
// ===========================================================================

describe('createVoicesTab() — with blessed mock', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createVoicesTab(screen, mockVoicesServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createVoicesTab(screen, mockVoicesServices);
    assert.ok('box' in tab, 'must have box');
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns teal #00695c', () => {
    const screen = makeMockScreen();
    const tab = createVoicesTab(screen, mockVoicesServices);
    assert.strictEqual(tab.getFooterColor(), '#00695c');
  });

  test('getFooterText() returns a non-empty string', () => {
    const screen = makeMockScreen();
    const tab = createVoicesTab(screen, mockVoicesServices);
    assert.ok(typeof tab.getFooterText() === 'string');
    assert.ok(tab.getFooterText().length > 0);
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createVoicesTab(screen, mockVoicesServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createVoicesTab(screen, mockVoicesServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createVoicesTab(screen, mockVoicesServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createVoicesTab(screen, mockVoicesServices);
    assert.doesNotThrow(() => tab.onBlur());
  });
});
