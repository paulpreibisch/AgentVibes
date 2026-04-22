/**
 * Background Music Volume Default Tests
 * Ensures all volume defaults are 20 (not 70) across the codebase.
 * Regression guard: prevents accidental reversion to the old 70% default.
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

// ---------------------------------------------------------------------------
// settings-tab MUSIC_DEFAULTS
// ---------------------------------------------------------------------------

describe('settings-tab MUSIC_DEFAULTS volume', () => {
  test('formatVolume uses 20 as default when no config volume present', async () => {
    const { formatVolume } = await import('../../src/console/tabs/settings-tab.js');
    // formatVolume(undefined) falls back to MUSIC_DEFAULTS.volume
    const result = formatVolume(undefined);
    assert.ok(result.includes('20'), `Expected default volume to show 20, got: "${result}"`);
    assert.ok(!result.includes('70'), `Default volume must not be 70, got: "${result}"`);
  });

  test('MUSIC_DEFAULTS constant in source is volume 20', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, 'src/console/tabs/settings-tab.js'), 'utf8');
    const match = src.match(/const MUSIC_DEFAULTS\s*=\s*Object\.freeze\([^)]+\)/);
    assert.ok(match, 'MUSIC_DEFAULTS constant must exist');
    assert.ok(match[0].includes('volume: 20'), `MUSIC_DEFAULTS must have volume: 20, got: ${match[0]}`);
    assert.ok(!match[0].includes('volume: 70'), 'MUSIC_DEFAULTS must not have volume: 70');
  });
});

// ---------------------------------------------------------------------------
// music-tab _getMusic fallback volume
// ---------------------------------------------------------------------------

describe('music-tab volume fallback', () => {
  test('source file uses ?? 20 fallback for volume', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, 'src/console/tabs/music-tab.js'), 'utf8');
    // Check the fallback line in _getMusic
    assert.ok(src.includes('volume ?? 20') || src.includes('volume:  music.volume ?? 20') || src.includes('volume: music.volume ?? 20'),
      'music-tab _getMusic must fall back to 20 for volume');
    assert.ok(!src.includes('volume ?? 70'), 'music-tab must not fall back to 70');
  });
});

// ---------------------------------------------------------------------------
// agents-tab fallbacks
// ---------------------------------------------------------------------------

describe('agents-tab volume fallbacks', () => {
  test('source file has no ?? 70 fallbacks for volume', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, 'src/console/tabs/agents-tab.js'), 'utf8');
    // Extract all ?? 70 occurrences near volume context
    const matches = [...src.matchAll(/\?\?\s*70/g)];
    assert.strictEqual(matches.length, 0, `agents-tab must have no ?? 70 fallbacks, found ${matches.length}`);
  });

  test('openTrackPicker called with 20 as default volume for bulk set', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, 'src/console/tabs/agents-tab.js'), 'utf8');
    // The bulk "set music for all agents" call passes 20 as initial volume
    assert.ok(src.includes("openTrackPicker(screen, '', 20,"),
      "bulk openTrackPicker must pass 20 as default volume");
  });
});

// ---------------------------------------------------------------------------
// track-picker default volume
// ---------------------------------------------------------------------------

describe('track-picker openVolumeInput default', () => {
  test('source file uses ?? 20 for currentVolume fallback', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, 'src/console/widgets/track-picker.js'), 'utf8');
    assert.ok(src.includes('currentVolume ?? 20'), 'track-picker must use ?? 20 as volume fallback');
    assert.ok(!src.includes('currentVolume ?? 70'), 'track-picker must not use ?? 70');
  });
});

// ---------------------------------------------------------------------------
// audio-processor.sh fallback
// ---------------------------------------------------------------------------

describe('audio-processor.sh volume fallback', () => {
  test('parse-failure fallback is 0.20 not 0.70', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks/audio-processor.sh'), 'utf8');
    assert.ok(!src.includes('bg_volume="0.70"'), 'audio-processor.sh must not use 0.70 as fallback');
    assert.ok(src.includes('bg_volume="0.20"'), 'audio-processor.sh must use 0.20 as fallback');
  });
});

// ---------------------------------------------------------------------------
// bmad-speak.sh fallback
// ---------------------------------------------------------------------------

describe('bmad-speak.sh volume fallback', () => {
  test('does not hardcode 70 as music volume fallback', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks/bmad-speak.sh'), 'utf8');
    assert.ok(!src.includes(':-70}'), 'bmad-speak.sh must not use :-70 as volume default');
    assert.ok(!src.includes("|| 70,"), 'bmad-speak.sh JS inline must not fallback to 70');
  });

  test('reads global background-music-volume.txt for fallback', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks/bmad-speak.sh'), 'utf8');
    assert.ok(src.includes('background-music-volume.txt'), 'bmad-speak.sh must read background-music-volume.txt');
    assert.ok(src.includes('GLOBAL_BG_VOLUME'), 'bmad-speak.sh must define GLOBAL_BG_VOLUME from config file');
  });

  test('parse-failure JS fallback is 20 not 70', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks/bmad-speak.sh'), 'utf8');
    assert.ok(src.includes('|| 20,'), 'bmad-speak.sh JS inline must fallback to 20');
  });
});

// ---------------------------------------------------------------------------
// bmad-speak.ps1 fallback
// ---------------------------------------------------------------------------

describe('bmad-speak.ps1 volume fallback', () => {
  test('does not use 0.25 as hardcoded default', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks-windows/bmad-speak.ps1'), 'utf8');
    assert.ok(!src.includes('"0.25"'), 'bmad-speak.ps1 must not use 0.25 as hardcoded default');
  });

  test('reads global background-music-volume.txt for fallback', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks-windows/bmad-speak.ps1'), 'utf8');
    assert.ok(src.includes('background-music-volume.txt'), 'bmad-speak.ps1 must read background-music-volume.txt');
  });

  test('fallback value when file missing is 0.20', async () => {
    const src = await fs.readFile(path.join(PROJECT_ROOT, '.claude/hooks-windows/bmad-speak.ps1'), 'utf8');
    assert.ok(src.includes('"0.20"'), 'bmad-speak.ps1 must use 0.20 as hardcoded fallback');
    assert.ok(!src.includes('"0.70"'), 'bmad-speak.ps1 must not use 0.70');
  });
});
