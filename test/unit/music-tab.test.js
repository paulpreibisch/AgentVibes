/**
 * Epic 9: Music Tab
 * Tests for music-tab.js exports: formatTrackLabel, getBuiltInTracks, formatMusicStatus, createMusicTab contract
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('getBuiltInTracks', () => {
  let getBuiltInTracks;
  before(async () => {
    const mod = await import('../../src/console/tabs/music-tab.js');
    getBuiltInTracks = mod.getBuiltInTracks;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof getBuiltInTracks, 'function');
  });

  test('returns array of 19 built-in tracks', () => {
    const tracks = getBuiltInTracks();
    assert.strictEqual(tracks.length, 19);
  });

  test('each track has id and label', () => {
    const tracks = getBuiltInTracks();
    for (const t of tracks) {
      assert.ok(t.id, 'track has id');
      assert.ok(t.label, 'track has label');
    }
  });

  test('first track is Soft Flamenco Loop', () => {
    const tracks = getBuiltInTracks();
    assert.ok(tracks[0].label.toLowerCase().includes('flamenco'));
  });
});

// ---------------------------------------------------------------------------

describe('formatMusicStatus', () => {
  let formatMusicStatus;
  before(async () => {
    const mod = await import('../../src/console/tabs/music-tab.js');
    formatMusicStatus = mod.formatMusicStatus;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatMusicStatus, 'function');
  });

  test('returns Enabled when music enabled', () => {
    assert.strictEqual(formatMusicStatus(true), 'Enabled');
  });

  test('returns Disabled when music disabled', () => {
    assert.strictEqual(formatMusicStatus(false), 'Disabled');
  });

  test('returns Disabled for undefined', () => {
    assert.strictEqual(formatMusicStatus(undefined), 'Disabled');
  });
});

// ---------------------------------------------------------------------------

describe('createMusicTab — Tab Component Contract', () => {
  let createMusicTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/music-tab.js');
    createMusicTab = mod.createMusicTab;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof createMusicTab, 'function');
  });

  test('returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveVoiceId: () => 'en_US-amy-medium', setActiveVoice: () => {} },
    };
    const tab = createMusicTab(mockScreen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns dark magenta #880e4f', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createMusicTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {} },
    });
    assert.strictEqual(tab.getFooterColor(), '#880e4f');
  });
});

// ---------------------------------------------------------------------------

describe('formatTrackLabel', () => {
  let formatTrackLabel;
  before(async () => {
    const mod = await import('../../src/console/tabs/music-tab.js');
    formatTrackLabel = mod.formatTrackLabel;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatTrackLabel, 'function');
  });

  test('strips agent_vibes_ prefix and _loop/_v2 suffixes', () => {
    assert.strictEqual(formatTrackLabel('agent_vibes_chillwave_v2_loop.mp3'), '🌊 Chillwave');
  });

  test('strips agentvibes_ prefix', () => {
    assert.strictEqual(formatTrackLabel('agentvibes_soft_flamenco_loop.mp3'), '🎻 Soft Flamenco');
  });

  test('handles file with no prefix', () => {
    assert.strictEqual(formatTrackLabel('dreamy_house_loop.mp3'), 'Dreamy House');
  });

  test('title-cases multi-word labels', () => {
    assert.strictEqual(formatTrackLabel('agent_vibes_bossa_nova_v2_loop.mp3'), '🌸 Bossa Nova');
  });
});
