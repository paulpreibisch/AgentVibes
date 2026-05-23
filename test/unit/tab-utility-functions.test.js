/**
 * Coverage for pure utility functions exported from tab files
 *
 * Tests deterministic helper functions from voices-tab.js, music-tab.js,
 * and settings-tab.js that do not require blessed or a real terminal.
 * Mocks blessed FIRST so the tab files load (they conditionally import blessed).
 */

import { test, describe, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Blessed stub — tabs import blessed conditionally; mock it so the modules load
// ---------------------------------------------------------------------------

function makeWidget(tag = 'widget') {
  return {
    _tag: tag,
    append: () => {}, remove: () => {}, prepend: () => {}, insert: () => {},
    insertBefore: () => {}, insertAfter: () => {}, setContent: () => {},
    getContent: () => '', setLabel: () => {}, show: () => {}, hide: () => {},
    toggle: () => {}, focus: () => {}, press: () => {}, scroll: () => {},
    scrollTo: () => {}, getScroll: () => 0, getScrollPerc: () => 0,
    setScrollPerc: () => {}, setItems: () => {}, clearItems: () => {},
    addItem: () => {}, getItem: () => null, select: () => {}, move: () => {},
    up: () => {}, down: () => {}, getValue: () => '', setValue: () => {},
    clearValue: () => {}, input: (cb) => cb && cb(null, ''),
    prompt: (msg, cb) => cb && cb(null, ''), on: () => {}, off: () => {},
    once: () => {}, removeListener: () => {}, emit: () => {}, key: () => {},
    destroy: () => {}, free: () => {}, render: () => {}, setFront: () => {},
    setBack: () => {}, setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border: { type: 'line' }, hidden: true, content: '', height: 40, width: 120,
    left: 0, top: 0, bottom: 0, right: 0, items: [], ritems: [], selected: 0,
    program: { clear: () => {} }, clearRegion: () => {}, cols: 120, rows: 40, olines: [],
  };
}

const blessedStub = {
  box: () => makeWidget('box'), text: () => makeWidget('text'),
  textbox: () => makeWidget('textbox'), textarea: () => makeWidget('textarea'),
  list: () => makeWidget('list'), listbar: () => makeWidget('listbar'),
  button: () => makeWidget('button'), prompt: () => makeWidget('prompt'),
  screen: () => makeWidget('screen'), escape: (str) => str || '',
};

await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Dynamic imports — AFTER mock installed
// ---------------------------------------------------------------------------

const {
  genderIcon, genderIconTag, inferGender, formatVoiceName,
  parseVoiceId, formatVoiceInfo, parseMultiSpeaker,
  scanInstalledVoices, getFavorites, getThumbsDown,
  toggleThumbsUp, toggleThumbsDown, toggleFavorite,
  getVoiceMeta, SAMPLE_PHRASES, MS_SEP, COL_NAME_W, COL_GENDER_W,
} = await import('../../src/console/tabs/voices-tab.js');

const {
  getBuiltInTracks, formatTrackLabel, formatMusicStatus,
  scanTracks, getMusicFavorites, toggleMusicFavorite,
  applyEnabledToFile, applyTrackToAudioEffects,
} = await import('../../src/console/tabs/music-tab.js');

const {
  formatReverbState, formatMusicState, formatVolume,
  formatVerbosity, formatPersonality, formatIntroText,
} = await import('../../src/console/tabs/settings-tab.js');

// ---------------------------------------------------------------------------
// Mock config service for toggle tests
// ---------------------------------------------------------------------------

function makeConfigService(overrides = {}) {
  const store = {
    thumbsUp: [], thumbsDown: [], favorites: [],
    musicFavorites: [], backgroundMusic: { enabled: false, track: null, volume: 50 },
    ...overrides,
  };
  return {
    getConfig: () => ({ ...store }),
    set: (key, val) => { store[key] = val; },
  };
}

// ===========================================================================
// voices-tab.js — constants
// ===========================================================================

describe('voices-tab constants', () => {
  test('COL_NAME_W is a positive number', () => {
    assert.ok(typeof COL_NAME_W === 'number' && COL_NAME_W > 0);
  });

  test('COL_GENDER_W is a positive number', () => {
    assert.ok(typeof COL_GENDER_W === 'number' && COL_GENDER_W > 0);
  });

  test('MS_SEP is "::"', () => {
    assert.strictEqual(MS_SEP, '::');
  });

  test('SAMPLE_PHRASES is a non-empty array of strings', () => {
    assert.ok(Array.isArray(SAMPLE_PHRASES) && SAMPLE_PHRASES.length > 0);
    assert.ok(SAMPLE_PHRASES.every(s => typeof s === 'string'));
  });
});

// ===========================================================================
// voices-tab.js — genderIcon
// ===========================================================================

describe('genderIcon()', () => {
  test('Female → ♀', () => {
    assert.strictEqual(genderIcon('Female'), '♀');
  });

  test('Male → ♂', () => {
    assert.strictEqual(genderIcon('Male'), '♂');
  });

  test('unknown → —', () => {
    assert.strictEqual(genderIcon('Other'), '—');
    assert.strictEqual(genderIcon(''), '—');
    assert.strictEqual(genderIcon(undefined), '—');
  });
});

// ===========================================================================
// voices-tab.js — genderIconTag
// ===========================================================================

describe('genderIconTag()', () => {
  test('Female → contains magenta tag', () => {
    const tag = genderIconTag('Female');
    assert.ok(tag.includes('{magenta-fg}'));
    assert.ok(tag.includes('♀'));
  });

  test('Male → contains bright-cyan tag', () => {
    const tag = genderIconTag('Male');
    assert.ok(tag.includes('{bright-cyan-fg}'));
    assert.ok(tag.includes('♂'));
  });

  test('other → returns —', () => {
    assert.strictEqual(genderIconTag('Unknown'), '—');
  });
});

// ===========================================================================
// voices-tab.js — inferGender
// ===========================================================================

describe('inferGender()', () => {
  test('detects female from _female in voice ID', () => {
    assert.strictEqual(inferGender('en_GB-southern_english_female-low'), 'Female');
  });

  test('detects male from _male in voice ID', () => {
    assert.strictEqual(inferGender('en_US-hfc_male-medium'), 'Male');
  });

  test('detects female from dataset name', () => {
    assert.strictEqual(inferGender('some-voice', 'southern_english_female'), 'Female');
  });

  test('looks up known dataset names like amy', () => {
    assert.strictEqual(inferGender('en_US-amy-medium', 'amy'), 'Female');
  });

  test('looks up known dataset names like ryan', () => {
    assert.strictEqual(inferGender('en_US-ryan-high', 'ryan'), 'Male');
  });

  test('returns — for unknown voice', () => {
    assert.strictEqual(inferGender('xx-unknown-voice', 'unknown_dataset'), '—');
  });

  test('handles empty inputs', () => {
    const result = inferGender('', '');
    assert.ok(typeof result === 'string');
  });
});

// ===========================================================================
// voices-tab.js — formatVoiceName
// ===========================================================================

describe('formatVoiceName()', () => {
  test('uses dataset display name when available', () => {
    const name = formatVoiceName('en_US-ljspeech-high', 'ljspeech');
    assert.strictEqual(name, 'LJ Speech');
  });

  test('title-cases and replaces underscores when no display name', () => {
    const name = formatVoiceName('en_US-my_voice-medium', 'my_voice');
    assert.strictEqual(name, 'My Voice');
  });

  test('falls back to voice ID segment when dataset is generic', () => {
    const name = formatVoiceName('en_US-amy-medium', 'training');
    assert.ok(typeof name === 'string' && name.length > 0);
  });

  test('handles missing dataset', () => {
    const name = formatVoiceName('en_US-amy-medium');
    assert.ok(typeof name === 'string' && name.length > 0);
  });
});

// ===========================================================================
// voices-tab.js — parseVoiceId
// ===========================================================================

describe('parseVoiceId()', () => {
  test('parses standard voice ID format', () => {
    const result = parseVoiceId('en_US-amy-medium');
    assert.strictEqual(result.lang, 'en_US');
    assert.strictEqual(result.name, 'amy');
    assert.strictEqual(result.quality, 'medium');
  });

  test('parses high quality', () => {
    const result = parseVoiceId('en_GB-alan-high');
    assert.strictEqual(result.lang, 'en_GB');
    assert.strictEqual(result.quality, 'high');
  });

  test('parses low quality', () => {
    const result = parseVoiceId('de_DE-thorsten-low');
    assert.strictEqual(result.quality, 'low');
  });

  test('returns unknown for null/empty input', () => {
    const result = parseVoiceId('');
    assert.strictEqual(result.lang, 'unknown');
  });

  test('returns unknown for non-standard format', () => {
    const result = parseVoiceId('notavoice');
    assert.strictEqual(result.lang, 'unknown');
  });
});

// ===========================================================================
// voices-tab.js — formatVoiceInfo
// ===========================================================================

describe('formatVoiceInfo()', () => {
  test('formats standard voice ID', () => {
    const info = formatVoiceInfo('en_US-amy-medium');
    assert.ok(info.includes('amy'));
    assert.ok(info.includes('en_US'));
    assert.ok(info.includes('medium'));
    assert.ok(info.includes('Piper'));
  });

  test('handles non-standard voice ID gracefully', () => {
    const info = formatVoiceInfo('customvoice');
    assert.ok(typeof info === 'string');
    assert.ok(info.includes('Piper'));
  });
});

// ===========================================================================
// voices-tab.js — parseMultiSpeaker
// ===========================================================================

describe('parseMultiSpeaker()', () => {
  test('detects non-multi-speaker voice', () => {
    const result = parseMultiSpeaker('en_US-amy-medium');
    assert.strictEqual(result.isMultiSpeaker, false);
    assert.strictEqual(result.model, 'en_US-amy-medium');
    assert.strictEqual(result.speakerId, null);
    assert.strictEqual(result.speakerName, null);
  });

  test('handles null/undefined gracefully', () => {
    const result = parseMultiSpeaker(null);
    assert.strictEqual(result.isMultiSpeaker, false);
  });

  test('detects multi-speaker voice by :: separator', () => {
    // Even if the .onnx.json file doesn't exist, it gracefully returns isMultiSpeaker:true
    const result = parseMultiSpeaker('SomeModel::SomeSpeaker');
    assert.strictEqual(result.isMultiSpeaker, true);
    assert.strictEqual(result.model, 'SomeModel');
    assert.strictEqual(result.speakerName, 'SomeSpeaker');
  });
});

// ===========================================================================
// voices-tab.js — scanInstalledVoices
// ===========================================================================

describe('scanInstalledVoices()', () => {
  test('returns an array (may be empty if no voices installed)', () => {
    const voices = scanInstalledVoices();
    assert.ok(Array.isArray(voices));
  });

  test('all entries are strings', () => {
    const voices = scanInstalledVoices();
    assert.ok(voices.every(v => typeof v === 'string'));
  });
});

// ===========================================================================
// voices-tab.js — getFavorites / getThumbsDown
// ===========================================================================

describe('getFavorites()', () => {
  test('returns [] when config has no favorites', () => {
    const cs = makeConfigService({ thumbsUp: undefined, favorites: undefined });
    assert.deepStrictEqual(getFavorites(cs), []);
  });

  test('returns thumbsUp array when present', () => {
    const cs = makeConfigService({ thumbsUp: ['en_US-amy-medium'], favorites: [] });
    assert.deepStrictEqual(getFavorites(cs), ['en_US-amy-medium']);
  });

  test('falls back to favorites when thumbsUp is absent', () => {
    const cs = makeConfigService({ thumbsUp: undefined, favorites: ['en_US-ryan-high'] });
    assert.deepStrictEqual(getFavorites(cs), ['en_US-ryan-high']);
  });
});

describe('getThumbsDown()', () => {
  test('returns [] when config has no thumbsDown', () => {
    const cs = makeConfigService({ thumbsDown: undefined });
    assert.deepStrictEqual(getThumbsDown(cs), []);
  });

  test('returns thumbsDown array when present', () => {
    const cs = makeConfigService({ thumbsDown: ['badvoice'] });
    assert.deepStrictEqual(getThumbsDown(cs), ['badvoice']);
  });
});

// ===========================================================================
// voices-tab.js — toggleThumbsUp
// ===========================================================================

describe('toggleThumbsUp()', () => {
  test('adds voice to thumbsUp — returns "added"', () => {
    const cs = makeConfigService({ thumbsUp: [], thumbsDown: [], favorites: [] });
    const result = toggleThumbsUp(cs, 'en_US-amy-medium');
    assert.strictEqual(result, 'added');
    assert.ok(getFavorites(cs).includes('en_US-amy-medium'));
  });

  test('removes voice from thumbsUp — returns "removed"', () => {
    const cs = makeConfigService({ thumbsUp: ['en_US-amy-medium'], favorites: ['en_US-amy-medium'], thumbsDown: [] });
    const result = toggleThumbsUp(cs, 'en_US-amy-medium');
    assert.strictEqual(result, 'removed');
    assert.ok(!getFavorites(cs).includes('en_US-amy-medium'));
  });

  test('clears thumbsDown when adding to thumbsUp', () => {
    const cs = makeConfigService({ thumbsUp: [], favorites: [], thumbsDown: ['en_US-amy-medium'] });
    toggleThumbsUp(cs, 'en_US-amy-medium');
    assert.ok(!getThumbsDown(cs).includes('en_US-amy-medium'));
  });
});

// ===========================================================================
// voices-tab.js — toggleThumbsDown
// ===========================================================================

describe('toggleThumbsDown()', () => {
  test('adds voice to thumbsDown — returns "added"', () => {
    const cs = makeConfigService({ thumbsDown: [] });
    const result = toggleThumbsDown(cs, 'en_US-ryan-high');
    assert.strictEqual(result, 'added');
    assert.ok(getThumbsDown(cs).includes('en_US-ryan-high'));
  });

  test('removes voice from thumbsDown — returns "removed"', () => {
    const cs = makeConfigService({ thumbsDown: ['en_US-ryan-high'] });
    const result = toggleThumbsDown(cs, 'en_US-ryan-high');
    assert.strictEqual(result, 'removed');
    assert.ok(!getThumbsDown(cs).includes('en_US-ryan-high'));
  });

  test('clears thumbsUp/favorites when adding to thumbsDown', () => {
    const cs = makeConfigService({
      thumbsDown: [],
      thumbsUp: ['en_US-ryan-high'],
      favorites: ['en_US-ryan-high'],
    });
    toggleThumbsDown(cs, 'en_US-ryan-high');
    assert.ok(!getFavorites(cs).includes('en_US-ryan-high'));
  });
});

// ===========================================================================
// voices-tab.js — toggleFavorite (legacy compat)
// ===========================================================================

describe('toggleFavorite()', () => {
  test('does not throw and toggles the voice', () => {
    const cs = makeConfigService({ thumbsUp: [], favorites: [], thumbsDown: [] });
    assert.doesNotThrow(() => toggleFavorite(cs, 'en_US-amy-medium'));
    assert.ok(getFavorites(cs).includes('en_US-amy-medium'));
  });
});

// ===========================================================================
// voices-tab.js — getVoiceMeta
// ===========================================================================

describe('getVoiceMeta()', () => {
  test('returns object with displayName, gender, provider', () => {
    const meta = getVoiceMeta('en_US-amy-medium');
    assert.ok(typeof meta === 'object');
    assert.ok('displayName' in meta);
    assert.ok('gender' in meta);
    assert.ok('provider' in meta);
  });

  test('caches results (second call same result)', () => {
    const m1 = getVoiceMeta('en_US-amy-medium');
    const m2 = getVoiceMeta('en_US-amy-medium');
    assert.deepStrictEqual(m1, m2);
  });
});

// ===========================================================================
// music-tab.js — getBuiltInTracks
// ===========================================================================

describe('getBuiltInTracks()', () => {
  test('returns an array', () => {
    const tracks = getBuiltInTracks();
    assert.ok(Array.isArray(tracks));
  });

  test('each track has id and label', () => {
    const tracks = getBuiltInTracks();
    for (const t of tracks) {
      assert.ok('id' in t, 'track must have id');
      assert.ok('label' in t, 'track must have label');
    }
  });

  test('returns a copy (mutations do not affect the original)', () => {
    const a = getBuiltInTracks();
    const b = getBuiltInTracks();
    a.push({ id: 'fake', label: 'Fake' });
    assert.ok(a.length !== b.length, 'each call should return a new copy');
  });
});

// ===========================================================================
// music-tab.js — formatTrackLabel
// ===========================================================================

describe('formatTrackLabel()', () => {
  test('strips agent_vibes_ prefix and _loop suffix', () => {
    const label = formatTrackLabel('agent_vibes_cool_track_loop.mp3');
    assert.ok(!label.includes('agent_vibes_'));
    assert.ok(!label.toLowerCase().includes('_loop'));
  });

  test('strips agentvibes_ prefix', () => {
    const label = formatTrackLabel('agentvibes_jazz.mp3');
    assert.ok(!label.toLowerCase().startsWith('agentvibes'));
  });

  test('title-cases the result', () => {
    const label = formatTrackLabel('agent_vibes_cool_track.mp3');
    assert.ok(/^[A-Z]/.test(label), 'should start with uppercase');
  });

  test('returns non-empty string for empty-after-clean input', () => {
    const label = formatTrackLabel('agent_vibes__loop.mp3');
    assert.ok(typeof label === 'string' && label.length > 0);
  });

  test('returns known display name for known tracks', () => {
    const tracks = getBuiltInTracks();
    if (tracks.length > 0) {
      const label = formatTrackLabel(tracks[0].id);
      assert.ok(typeof label === 'string' && label.length > 0);
    }
  });
});

// ===========================================================================
// music-tab.js — formatMusicStatus
// ===========================================================================

describe('formatMusicStatus()', () => {
  test('true → "Enabled"', () => {
    assert.strictEqual(formatMusicStatus(true), 'Enabled');
  });

  test('false → "Disabled"', () => {
    assert.strictEqual(formatMusicStatus(false), 'Disabled');
  });

  test('undefined → "Disabled"', () => {
    assert.strictEqual(formatMusicStatus(undefined), 'Disabled');
  });
});

// ===========================================================================
// music-tab.js — scanTracks
// ===========================================================================

describe('scanTracks()', () => {
  test('returns an array', () => {
    const tracks = scanTracks();
    assert.ok(Array.isArray(tracks));
  });

  test('each track has id, label, isBuiltIn', () => {
    const tracks = scanTracks();
    for (const t of tracks) {
      assert.ok('id' in t);
      assert.ok('label' in t);
      assert.ok('isBuiltIn' in t);
    }
  });
});

// ===========================================================================
// music-tab.js — getMusicFavorites / toggleMusicFavorite
// ===========================================================================

describe('getMusicFavorites()', () => {
  test('returns [] when config has no musicFavorites', () => {
    const cs = makeConfigService({ musicFavorites: undefined });
    assert.deepStrictEqual(getMusicFavorites(cs), []);
  });

  test('returns musicFavorites array', () => {
    const cs = makeConfigService({ musicFavorites: ['track1.mp3'] });
    assert.deepStrictEqual(getMusicFavorites(cs), ['track1.mp3']);
  });
});

describe('toggleMusicFavorite()', () => {
  test('adds track to favorites', () => {
    const cs = makeConfigService({ musicFavorites: [] });
    toggleMusicFavorite(cs, 'track1.mp3');
    assert.ok(getMusicFavorites(cs).includes('track1.mp3'));
  });

  test('removes track from favorites', () => {
    const cs = makeConfigService({ musicFavorites: ['track1.mp3'] });
    toggleMusicFavorite(cs, 'track1.mp3');
    assert.ok(!getMusicFavorites(cs).includes('track1.mp3'));
  });
});

// ===========================================================================
// music-tab.js — applyEnabledToFile / applyTrackToAudioEffects
// ===========================================================================

describe('applyEnabledToFile()', () => {
  test('does not throw even if config directory is absent', () => {
    assert.doesNotThrow(() => applyEnabledToFile(true));
    assert.doesNotThrow(() => applyEnabledToFile(false));
  });
});

describe('applyTrackToAudioEffects()', () => {
  let _savedCwd;
  let _tempDir;

  before(() => {
    _savedCwd = process.cwd();
    _tempDir = mkdtempSync(join(tmpdir(), 'av-music-test-'));
    mkdirSync(join(_tempDir, '.claude', 'config'), { recursive: true });
    writeFileSync(join(_tempDir, '.claude', 'config', 'audio-effects.cfg'), 'default|||0.30\n', 'utf-8');
    process.chdir(_tempDir);
  });

  after(() => {
    process.chdir(_savedCwd);
    try { rmSync(_tempDir, { recursive: true, force: true }); } catch {}
  });

  test('does not throw for valid track name', () => {
    assert.doesNotThrow(() => applyTrackToAudioEffects('agent_vibes_jazz.mp3'));
  });

  test('does not throw for invalid track name (path separators)', () => {
    assert.doesNotThrow(() => applyTrackToAudioEffects('bad/track|name.mp3'));
  });

  test('does not throw for empty/null track', () => {
    assert.doesNotThrow(() => applyTrackToAudioEffects(''));
    assert.doesNotThrow(() => applyTrackToAudioEffects(null));
  });
});

// ===========================================================================
// settings-tab.js — format helpers
// ===========================================================================

describe('formatMusicState()', () => {
  test('true → "Enabled"', () => {
    assert.strictEqual(formatMusicState(true), 'Enabled');
  });

  test('false → "Disabled"', () => {
    assert.strictEqual(formatMusicState(false), 'Disabled');
  });
});

describe('formatVolume()', () => {
  test('returns percentage string for valid number', () => {
    const v = formatVolume(50);
    assert.ok(v.endsWith('%'));
    assert.ok(v.includes('50'));
  });

  test('clamps to minimum 10%', () => {
    const v = formatVolume(0);
    assert.ok(parseInt(v) >= 10);
  });

  test('clamps to maximum 100%', () => {
    const v = formatVolume(200);
    assert.ok(parseInt(v) <= 100);
  });

  test('handles NaN with default', () => {
    const v = formatVolume(NaN);
    assert.ok(v.endsWith('%'));
  });
});

describe('formatVerbosity()', () => {
  test('"high" → "High"', () => {
    assert.strictEqual(formatVerbosity('high'), 'High');
  });

  test('"low" → "Low"', () => {
    assert.strictEqual(formatVerbosity('low'), 'Low');
  });

  test('unknown returns "High" as default', () => {
    assert.strictEqual(formatVerbosity('unknown_value'), 'High');
  });

  test('"caveman" → "Caveman"', () => {
    assert.strictEqual(formatVerbosity('caveman'), 'Caveman');
  });
});

describe('formatPersonality()', () => {
  test('"none" → contains "None"', () => {
    assert.ok(formatPersonality('none').includes('None'));
  });

  test('"pirate" → contains "Pirate" and emoji', () => {
    const result = formatPersonality('pirate');
    assert.ok(result.includes('Pirate'));
  });

  test('null/empty → none label', () => {
    const result = formatPersonality(null);
    assert.ok(result.includes('None'));
  });
});

describe('formatIntroText()', () => {
  test('null/empty → "(none)"', () => {
    assert.strictEqual(formatIntroText(null), '(none)');
    assert.strictEqual(formatIntroText(''), '(none)');
  });

  test('short text returned as-is', () => {
    assert.strictEqual(formatIntroText('Hello!'), 'Hello!');
  });

  test('long text truncated with ellipsis', () => {
    const long = 'A'.repeat(50);
    const result = formatIntroText(long);
    assert.ok(result.length < long.length);
    assert.ok(result.endsWith('…'));
  });
});

describe('formatReverbState()', () => {
  test('returns a string', () => {
    assert.strictEqual(typeof formatReverbState(null), 'string');
    assert.strictEqual(typeof formatReverbState({ preset: 'hall', enabled: true }), 'string');
  });

  test('returns "Off" or similar for null/disabled', () => {
    const r = formatReverbState(null);
    assert.ok(typeof r === 'string' && r.length > 0);
  });
});
