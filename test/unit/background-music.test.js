/**
 * Background Music Integration Tests
 * Tests background music file structure and configuration
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

test('Background music directory exists', () => {
  const bgDir = join(PROJECT_ROOT, '.claude/audio/backgrounds');
  assert.ok(existsSync(bgDir), 'Backgrounds directory should exist');
});

test('Background music files are present', () => {
  const bgDir = join(PROJECT_ROOT, '.claude/audio/backgrounds');
  const files = readdirSync(bgDir).filter(f => f.endsWith('.mp3'));

  assert.ok(files.length >= 13, `Should have at least 13 background music files, found ${files.length}`);
});

test('Background music files use snake_case naming', () => {
  const bgDir = join(PROJECT_ROOT, '.claude/audio/backgrounds');
  const files = readdirSync(bgDir).filter(f => f.endsWith('.mp3'));

  const invalidFiles = files.filter(f => {
    // Should be snake_case or all lowercase with underscores
    // Not PascalCase or spaces
    return /[A-Z]/.test(f) || /\s/.test(f);
  });

  assert.strictEqual(
    invalidFiles.length,
    0,
    `All files should use snake_case, but found: ${invalidFiles.join(', ')}`
  );
});

test('Background music files are not empty', () => {
  const bgDir = join(PROJECT_ROOT, '.claude/audio/backgrounds');
  const files = readdirSync(bgDir).filter(f => f.endsWith('.mp3'));

  files.forEach(file => {
    const filePath = join(bgDir, file);
    const stats = statSync(filePath);
    assert.ok(
      stats.size > 1000, // At least 1KB
      `${file} should not be empty (found ${stats.size} bytes)`
    );
  });
});

test('Audio effects config exists and is valid', () => {
  const configPath = join(PROJECT_ROOT, '.claude/config/audio-effects.cfg');
  assert.ok(existsSync(configPath), 'audio-effects.cfg should exist');

  const content = readFileSync(configPath, 'utf-8');
  assert.ok(content.length > 0, 'Config file should not be empty');

  // Check for default entry
  const hasDefault = content.split('\n').some(line => line.startsWith('default|'));
  assert.ok(hasDefault, 'Config should have a default entry');
});

test('Audio effects config uses snake_case filenames', () => {
  const configPath = join(PROJECT_ROOT, '.claude/config/audio-effects.cfg');
  const content = readFileSync(configPath, 'utf-8');

  // Extract all background file references (3rd pipe-separated field)
  const lines = content.split('\n').filter(line => {
    return line.trim() && !line.startsWith('#') && line.includes('|');
  });

  const invalidFiles = [];
  lines.forEach(line => {
    const parts = line.split('|');
    if (parts.length >= 3 && parts[2].trim()) {
      const filename = parts[2].trim();
      // Check if filename contains spaces or PascalCase
      if (/\s/.test(filename) || (/[A-Z]/.test(filename) && !filename.startsWith('optimized/'))) {
        invalidFiles.push(filename);
      }
    }
  });

  assert.strictEqual(
    invalidFiles.length,
    0,
    `Config should use snake_case filenames, found: ${invalidFiles.join(', ')}`
  );
});

test('Audio effects config does not reference optimized/ subdirectory', () => {
  const configPath = join(PROJECT_ROOT, '.claude/config/audio-effects.cfg');
  const content = readFileSync(configPath, 'utf-8');

  // Extract all background file references
  const lines = content.split('\n').filter(line => {
    return line.trim() && !line.startsWith('#') && line.includes('|');
  });

  const optimizedRefs = [];
  lines.forEach(line => {
    const parts = line.split('|');
    if (parts.length >= 3 && parts[2].includes('optimized/')) {
      optimizedRefs.push(line.trim());
    }
  });

  assert.strictEqual(
    optimizedRefs.length,
    0,
    `Config should not reference optimized/ subdirectory. Found:\n${optimizedRefs.join('\n')}`
  );
});

test('All referenced background files exist', () => {
  const configPath = join(PROJECT_ROOT, '.claude/config/audio-effects.cfg');
  const bgDir = join(PROJECT_ROOT, '.claude/audio/backgrounds');
  const content = readFileSync(configPath, 'utf-8');

  const lines = content.split('\n').filter(line => {
    return line.trim() && !line.startsWith('#') && line.includes('|');
  });

  const missingFiles = [];
  lines.forEach(line => {
    const parts = line.split('|');
    if (parts.length >= 3 && parts[2].trim()) {
      const filename = parts[2].trim();
      const fullPath = join(bgDir, filename);
      if (!existsSync(fullPath)) {
        missingFiles.push(filename);
      }
    }
  });

  assert.strictEqual(
    missingFiles.length,
    0,
    `All referenced files should exist. Missing: ${missingFiles.join(', ')}`
  );
});

test('Background music manager script exists', () => {
  const scriptPath = join(PROJECT_ROOT, '.claude/hooks/background-music-manager.sh');
  assert.ok(existsSync(scriptPath), 'background-music-manager.sh should exist');

  const stats = statSync(scriptPath);
  assert.ok(stats.mode & 0o111, 'Script should be executable');
});

test('Audio processor script exists', () => {
  const scriptPath = join(PROJECT_ROOT, '.claude/hooks/audio-processor.sh');
  assert.ok(existsSync(scriptPath), 'audio-processor.sh should exist');

  const stats = statSync(scriptPath);
  assert.ok(stats.mode & 0o111, 'Script should be executable');
});

test('Background music README exists', () => {
  const readmePath = join(PROJECT_ROOT, '.claude/audio/backgrounds/README.md');
  assert.ok(existsSync(readmePath), 'backgrounds/README.md should exist');

  const content = readFileSync(readmePath, 'utf-8');
  assert.ok(content.length > 100, 'README should have meaningful content');
});
