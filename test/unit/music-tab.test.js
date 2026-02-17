/**
 * Epic 9: Music Tab
 * Tests for music-tab.js exports: formatTrackDisplay, getBuiltInTracks, createMusicTab contract
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

  test('returns array of 12 built-in tracks', () => {
    const tracks = getBuiltInTracks();
    assert.strictEqual(tracks.length, 12);
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

  test('getFooterColor() returns orange #ff9800', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createMusicTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {} },
    });
    assert.strictEqual(tab.getFooterColor(), '#ff9800');
  });
});
