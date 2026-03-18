/**
 * Audio Format Validator Tests
 * Story 4.2: Audio Format Detection (Magic Number Validation)
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectAudioFormat,
  validateFileExtension,
  validateAudioFile,
  SUPPORTED_EXTENSIONS
} from '../../src/utils/audio-format-validator.js';

// ============================================================================
// Test Setup: Create temporary test files with audio magic numbers
// ============================================================================

/**
 * Create a test file with specific magic bytes
 */
function createTestFile(tempDir, filename, magicBytes) {
  const filePath = path.join(tempDir, filename);

  // Create buffer with magic bytes + padding
  const buffer = Buffer.alloc(256, 0x00);
  magicBytes.data.copy(buffer, magicBytes.offset);

  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ============================================================================
// MP3 Format Detection Tests
// ============================================================================

test('MP3: Detect MPEG-1 Layer III (FF FA header)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'test.mp3', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFA])
    });

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, true, 'Should detect as valid MP3');
    assert.strictEqual(result.format, 'mp3', 'Format should be mp3');
    assert.strictEqual(result.detectedFormat, 'MP3 MPEG-1 Layer III', 'Should identify MPEG-1 variant');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('MP3: Detect MPEG-2 Layer III (FF FB header)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'test.mp3', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFB])
    });

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, true, 'Should detect as valid MP3');
    assert.strictEqual(result.format, 'mp3', 'Format should be mp3');
    assert.strictEqual(result.detectedFormat, 'MP3 MPEG-2 Layer III', 'Should identify MPEG-2 variant');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('MP3: Detect ID3v2 tag (ID3 header)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'test.mp3', {
      offset: 0,
      data: Buffer.from([0x49, 0x44, 0x33]) // "ID3"
    });

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, true, 'Should detect as valid MP3 with ID3');
    assert.strictEqual(result.format, 'mp3', 'Format should be mp3');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// WAV Format Detection Tests
// ============================================================================

test('WAV: Detect RIFF header at offset 0 and WAVE at offset 8', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const buffer = Buffer.alloc(256, 0x00);
    buffer.write('RIFF', 0);
    buffer.write('WAVE', 8);

    const filePath = path.join(tempDir, 'test.wav');
    fs.writeFileSync(filePath, buffer);

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, true, 'Should detect as valid WAV');
    assert.strictEqual(result.format, 'wav', 'Format should be wav');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('WAV: Accept RIFF header even without WAVE at offset 8', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'test.wav', {
      offset: 0,
      data: Buffer.from('RIFF')
    });

    const result = detectAudioFormat(filePath);
    // Should still detect because RIFF header is present
    assert.strictEqual(result.isValid, true, 'Should detect RIFF header');
    assert.strictEqual(result.format, 'wav', 'Format should be wav');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// OGG Format Detection Tests
// ============================================================================

test('OGG: Detect OggS header', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'test.ogg', {
      offset: 0,
      data: Buffer.from('OggS')
    });

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, true, 'Should detect as valid OGG');
    assert.strictEqual(result.format, 'ogg', 'Format should be ogg');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// M4A Format Detection Tests
// ============================================================================

test('M4A: Detect ISO Base Media (ftypisom) at offset 4', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const buffer = Buffer.alloc(256, 0x00);
    buffer.write('ftypisom', 4);

    const filePath = path.join(tempDir, 'test.m4a');
    fs.writeFileSync(filePath, buffer);

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, true, 'Should detect as valid M4A');
    assert.strictEqual(result.format, 'm4a', 'Format should be m4a');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('M4A: Detect Apple iTunes (ftypM4A) at offset 4', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const buffer = Buffer.alloc(256, 0x00);
    buffer.write('ftypM4A', 4);

    const filePath = path.join(tempDir, 'test.m4a');
    fs.writeFileSync(filePath, buffer);

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, true, 'Should detect as valid M4A');
    assert.strictEqual(result.format, 'm4a', 'Format should be m4a');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// File Extension Validation Tests
// ============================================================================

test('Extension: Reject .txt file with MP3 content', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'music.txt', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFA])
    });

    const result = validateFileExtension(filePath, 'mp3');
    assert.strictEqual(result.isValid, false, 'Should reject .txt extension for MP3');
    assert.match(result.error, /doesn't match/, 'Error should mention mismatch');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Extension: Accept correct .mp3 extension', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'music.mp3', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFA])
    });

    const result = validateFileExtension(filePath, 'mp3');
    assert.strictEqual(result.isValid, true, 'Should accept correct .mp3 extension');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Comprehensive Validation Tests
// ============================================================================

test('Comprehensive: Valid MP3 with correct extension', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'music.mp3', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFA])
    });

    const result = validateAudioFile(filePath);
    assert.strictEqual(result.isValid, true, 'Should be valid');
    assert.strictEqual(result.format, 'mp3', 'Format should be mp3');
    assert.strictEqual(result.extensionMatch, true, 'Extension should match');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Comprehensive: Valid MP3 with wrong extension (non-strict)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'music.wav', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFA])
    });

    // Non-strict mode should still pass if format is valid
    const result = validateAudioFile(filePath, { strictExtension: false });
    assert.strictEqual(result.isValid, true, 'Should be valid in non-strict mode');
    assert.strictEqual(result.format, 'mp3', 'Format should be mp3');
    assert.strictEqual(result.extensionMatch, false, 'Extension should not match');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Comprehensive: Valid MP3 with wrong extension (strict mode)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'music.wav', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFA])
    });

    // Strict mode should reject mismatched extensions
    const result = validateAudioFile(filePath, { strictExtension: true });
    assert.strictEqual(result.isValid, false, 'Should be invalid in strict mode');
    assert.match(result.error, /doesn't match/, 'Should show extension mismatch error');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Edge Case Tests
// ============================================================================

test('Edge Case: File too small (< 12 bytes)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = path.join(tempDir, 'tiny.mp3');
    fs.writeFileSync(filePath, Buffer.from([0xFF, 0xFA])); // Only 2 bytes

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, false, 'Should reject too-small file');
    assert.match(result.error, /too small/, 'Error should mention file size');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Edge Case: Empty file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = path.join(tempDir, 'empty.mp3');
    fs.writeFileSync(filePath, Buffer.alloc(0));

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, false, 'Should reject empty file');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Edge Case: Invalid magic number', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = path.join(tempDir, 'invalid.mp3');
    fs.writeFileSync(filePath, Buffer.alloc(256, 0x00));

    const result = detectAudioFormat(filePath);
    assert.strictEqual(result.isValid, false, 'Should reject invalid magic number');
    assert.match(result.error, /Unsupported audio format/, 'Should suggest supported formats');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Edge Case: Non-existent file', () => {
  const result = detectAudioFormat('/nonexistent/file.mp3');
  assert.strictEqual(result.isValid, false, 'Should handle non-existent file');
  assert.match(result.error, /does not exist/, 'Error should mention missing file');
});

test('Edge Case: Directory instead of file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const result = detectAudioFormat(tempDir);
    assert.strictEqual(result.isValid, false, 'Should reject directory');
    assert.match(result.error, /regular file/, 'Error should mention regular file');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('Edge Case: Invalid file path parameter', () => {
  const result = detectAudioFormat(null);
  assert.strictEqual(result.isValid, false, 'Should handle null path');
  assert.match(result.error, /non-empty string/, 'Error should describe expected input');
});

test('Edge Case: Empty string file path', () => {
  const result = detectAudioFormat('');
  assert.strictEqual(result.isValid, false, 'Should reject empty string');
});

// ============================================================================
// Performance Tests
// ============================================================================

test('Performance: Format detection < 100ms', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const filePath = createTestFile(tempDir, 'test.mp3', {
      offset: 0,
      data: Buffer.from([0xFF, 0xFA])
    });

    const startTime = performance.now();
    const result = detectAudioFormat(filePath);
    const endTime = performance.now();
    const duration = endTime - startTime;

    assert.strictEqual(result.isValid, true, 'Detection should succeed');
    assert(duration < 100, `Detection took ${duration.toFixed(2)}ms, should be < 100ms`);
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Supported Formats List Tests
// ============================================================================

test('Supported formats include all required extensions', () => {
  assert(SUPPORTED_EXTENSIONS.includes('.mp3'), 'Should include .mp3');
  assert(SUPPORTED_EXTENSIONS.includes('.wav'), 'Should include .wav');
  assert(SUPPORTED_EXTENSIONS.includes('.ogg'), 'Should include .ogg');
  assert(SUPPORTED_EXTENSIONS.includes('.m4a'), 'Should include .m4a');
});

// ============================================================================
// Multiple Format Detection Tests
// ============================================================================

test('All 4 formats detectable', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  try {
    const testCases = [
      { format: 'mp3', bytes: Buffer.from([0xFF, 0xFA]), offset: 0, filename: 'test.mp3' },
      { format: 'wav', bytes: Buffer.from('RIFF'), offset: 0, filename: 'test.wav' },
      { format: 'ogg', bytes: Buffer.from('OggS'), offset: 0, filename: 'test.ogg' },
      { format: 'm4a', bytes: Buffer.from('ftypisom'), offset: 4, filename: 'test.m4a' }
    ];

    testCases.forEach(({ format, bytes, offset, filename }) => {
      const filePath = path.join(tempDir, filename);
      const buffer = Buffer.alloc(256, 0x00);
      bytes.copy(buffer, offset);
      fs.writeFileSync(filePath, buffer);

      const result = detectAudioFormat(filePath);
      assert.strictEqual(result.isValid, true, `Should detect ${format}`);
      assert.strictEqual(result.format, format, `Format should be ${format}`);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});
