/**
 * Tests for saveLlmConfigSync sanitization (review findings M2 + M3):
 *   M2 — bgVolume was not sanitized (could contain pipe chars)
 *   M3 — sanitize() did not strip newlines (newline injection into config rows)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { saveLlmConfigSync, loadLlmConfigSync, seedAllLlmDefaultsSync } from '../../src/services/llm-provider-service.js';

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'av-sanitize-test-'));
  mkdirSync(join(dir, '.claude', 'config'), { recursive: true });
  return dir;
}

describe('saveLlmConfigSync sanitization', () => {

  test('M2: bgVolume containing pipe chars is sanitized', () => {
    const dir = makeTempDir();
    saveLlmConfigSync('claude-code', {
      voice: 'en_US-amy-medium',
      pretext: 'Hi',
      effects: '',
      bgTrack: 'track.mp3',
      bgVolume: '0.15|injected|extra',  // pipe injection attempt
      ttsEngine: 'piper',
    }, dir);

    const cfg = readFileSync(join(dir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    const row = cfg.split('\n').find(l => l.startsWith('llm:claude-code|'));
    assert.ok(row, 'Config row should be written');
    const fields = row.split('|');
    // bgVolume is field index 3 — must not contain injected content
    assert.strictEqual(fields[3], '0.15injectedextra', 'Pipe chars stripped from bgVolume');
    // Total fields must remain 7 (not more due to injected pipes)
    assert.strictEqual(fields.length, 7, 'Row must have exactly 7 pipe-delimited fields');
  });

  test('M3: newline in pretext is sanitized — no config row injection', () => {
    const dir = makeTempDir();
    const maliciousPretext = 'hello\ninjected:llm|reverb 90 30 100||0.15|evil-voice|';
    saveLlmConfigSync('claude-code', {
      voice: 'en_US-amy-medium',
      pretext: maliciousPretext,
      effects: '',
      bgTrack: '',
      bgVolume: '0.15',
      ttsEngine: 'piper',
    }, dir);

    const cfg = readFileSync(join(dir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    const lines = cfg.split('\n').filter(l => l.trim());
    // Should only have 1 row — the injected second row must be stripped
    const llmRows = lines.filter(l => l.startsWith('llm:'));
    assert.strictEqual(llmRows.length, 1, 'Newline injection must not create extra config rows');
    // No line must begin with "injected:llm" — the injected key row must not appear
    // (the text may still appear as a substring inside the sanitized pretext field, which is acceptable)
    assert.ok(!lines.some(l => l.startsWith('injected:llm')), 'Injected fake key row must be absent');
  });

  test('M3: newline in voice field is sanitized', () => {
    const dir = makeTempDir();
    saveLlmConfigSync('claude-code', {
      voice: 'en_US-amy\nevil-voice',
      pretext: '',
      effects: '',
      bgTrack: '',
      bgVolume: '0.15',
      ttsEngine: 'piper',
    }, dir);

    const cfg = readFileSync(join(dir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    const llmRows = cfg.split('\n').filter(l => l.startsWith('llm:'));
    assert.strictEqual(llmRows.length, 1, 'Newline in voice must not split config rows');
  });

  test('round-trip: save then load preserves values correctly', () => {
    const dir = makeTempDir();
    saveLlmConfigSync('claude-code', {
      voice: 'en_US-amy-medium',
      pretext: 'Claude here',
      effects: 'light',
      bgTrack: 'track.mp3',
      bgVolume: '0.25',
      ttsEngine: 'piper',
    }, dir);

    const loaded = loadLlmConfigSync('claude-code', dir);
    assert.strictEqual(loaded.voice, 'en_US-amy-medium');
    assert.strictEqual(loaded.pretext, 'Claude here');
    assert.strictEqual(loaded.effects, 'light');
    assert.strictEqual(loaded.bgTrack, 'track.mp3');
    assert.strictEqual(loaded.bgVolume, '0.25');
    assert.strictEqual(loaded.ttsEngine, 'piper');
  });

  test('saveLlmConfigSync with targetDir never writes to sourcePath (global config pollution fix)', () => {
    // Regression: if loadLlmConfigSync found a row in the global ~/.claude/config, it set
    // sourcePath to the global path.  saveLlmConfigSync then followed sourcePath and wrote back
    // to global, polluting other projects (e.g., "Test5 pretext" appearing in a fresh Test6 install).
    const globalDir = makeTempDir();
    const projectDir = makeTempDir();

    // Seed global config with a row
    writeFileSync(
      join(globalDir, '.claude', 'config', 'audio-effects.cfg'),
      'llm:claude-code|off||0.20|global-voice|GlobalPretext|piper\n',
    );

    // Simulate: TUI loads config (finds it in globalDir), then user saves from projectDir
    const loaded = loadLlmConfigSync('claude-code', globalDir);
    assert.strictEqual(loaded.sourcePath, join(globalDir, '.claude', 'config', 'audio-effects.cfg'));

    // Save with targetDir = projectDir (even though sourcePath points at globalDir)
    saveLlmConfigSync('claude-code', { ...loaded, pretext: 'ProjectPretext' }, projectDir);

    // Global config must NOT have been modified
    const globalContent = readFileSync(join(globalDir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    assert.ok(globalContent.includes('GlobalPretext'), 'Global config must remain unchanged');
    assert.ok(!globalContent.includes('ProjectPretext'), 'Global config must not have project pretext');

    // Project config must have the new value
    const projectContent = readFileSync(join(projectDir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    assert.ok(projectContent.includes('ProjectPretext'), 'Project config must have new pretext');
  });

  test('seedAllLlmDefaultsSync writes piper rows to project dir even when global config exists', () => {
    // Regression: ensureDefaultLlmConfigSync returned early when global config had a row,
    // preventing per-project piper defaults from being seeded. Result: play-tts.ps1 found
    // no per-LLM row in the project, kept the global windows-sapi provider, and Microsoft
    // David spoke instead of the user's configured piper voice.
    const globalDir = makeTempDir();
    const projectDir = makeTempDir();

    // Simulate global config pollution from a previous project
    writeFileSync(
      join(globalDir, '.claude', 'config', 'audio-effects.cfg'),
      'llm:claude-code|light|track.mp3|0.20|global-voice|GlobalPretext|piper\n',
    );

    // seedAllLlmDefaultsSync must write to projectDir despite global config existing
    seedAllLlmDefaultsSync(projectDir);

    const projectContent = readFileSync(join(projectDir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    assert.ok(projectContent.includes('llm:claude-code|'), 'Project must have claude-code row after seeding');
    assert.ok(projectContent.includes('|piper'), 'Seeded row must have piper engine');

    // Global must be untouched
    const globalContent = readFileSync(join(globalDir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    assert.ok(globalContent.includes('GlobalPretext'), 'Global config must be unchanged');
  });

  test('M2: bgVolume with pipe survives round-trip as sanitized value', () => {
    const dir = makeTempDir();
    saveLlmConfigSync('copilot', {
      voice: '',
      pretext: '',
      effects: '',
      bgTrack: '',
      bgVolume: '0.30|bad',
      ttsEngine: '',
    }, dir);

    const loaded = loadLlmConfigSync('copilot', dir);
    // After sanitize strips |, the value is "0.30bad" — not "0.30" and not corrupted
    assert.ok(!loaded.bgVolume.includes('|'), 'Loaded bgVolume must not contain pipe chars');
  });
});
