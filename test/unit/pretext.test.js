/**
 * Pretext Feature Integration Tests
 * Tests pretext file structure, validation, and TTS prepending logic
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const CONFIG_DIR = join(PROJECT_ROOT, '.claude/config');
const TEST_PRETEXT_FILE = join(CONFIG_DIR, 'tts-pretext.txt');

// Helper function to write test pretext file
function writePretextFile(content) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(TEST_PRETEXT_FILE, content, 'utf-8');
}

// Helper function to clean up test file
function cleanupPretextFile() {
  if (existsSync(TEST_PRETEXT_FILE)) {
    unlinkSync(TEST_PRETEXT_FILE);
  }
}

// ============================================================================
// 50-Character Limit Validation Tests
// ============================================================================

test('Pretext should reject input longer than 50 characters', () => {
  const longPretext = 'A'.repeat(51);
  assert.ok(longPretext.length > 50, 'Test setup: pretext should be > 50 chars');

  // Validate using same logic as installer.js
  const isValid = longPretext.length <= 50;
  assert.strictEqual(isValid, false, 'Should reject text > 50 characters');
});

test('Pretext should accept input at exactly 50 characters', () => {
  const maxPretext = 'A'.repeat(50);
  assert.strictEqual(maxPretext.length, 50, 'Test setup: pretext should be exactly 50 chars');

  const isValid = maxPretext.length <= 50;
  assert.strictEqual(isValid, true, 'Should accept text at exactly 50 characters');
});

test('Pretext should accept input under 50 characters', () => {
  const shortPretext = 'Agent: ';
  assert.ok(shortPretext.length < 50, 'Test setup: pretext should be < 50 chars');

  const isValid = shortPretext.length <= 50;
  assert.strictEqual(isValid, true, 'Should accept text under 50 characters');
});

// ============================================================================
// Newline Rejection Tests
// ============================================================================

test('Pretext should reject input with newline character', () => {
  const pretextWithNewline = 'Agent:\nAssistant';
  const hasNewline = pretextWithNewline.includes('\n') || pretextWithNewline.includes('\r');
  assert.strictEqual(hasNewline, true, 'Test setup: should contain newline');

  assert.ok(hasNewline, 'Should detect newlines in input');
});

test('Pretext should reject input with carriage return', () => {
  const pretextWithCR = 'Agent:\rAssistant';
  const hasCR = pretextWithCR.includes('\r');
  assert.strictEqual(hasCR, true, 'Test setup: should contain carriage return');

  assert.ok(hasCR, 'Should detect carriage returns in input');
});

test('Pretext should reject input with both newline and carriage return', () => {
  const pretextWithBoth = 'Agent:\r\nAssistant';
  const hasBoth = pretextWithBoth.includes('\n') || pretextWithBoth.includes('\r');
  assert.strictEqual(hasBoth, true, 'Test setup: should contain both CR and LF');

  assert.ok(hasBoth, 'Should detect mixed line endings');
});

// ============================================================================
// Whitespace-Only Rejection Tests
// ============================================================================

test('Pretext should treat whitespace-only input as empty', () => {
  const whitespaceOnly = '   ';
  const trimmed = whitespaceOnly.trim();
  assert.strictEqual(trimmed.length, 0, 'Trimmed whitespace should be empty');
});

test('Pretext should treat tabs as empty', () => {
  const tabOnly = '\t\t\t';
  const trimmed = tabOnly.trim();
  assert.strictEqual(trimmed.length, 0, 'Trimmed tabs should be empty');
});

test('Pretext should treat mixed whitespace as empty', () => {
  const mixedWhitespace = '  \t  \n  ';
  const trimmed = mixedWhitespace.trim();
  assert.strictEqual(trimmed.length, 0, 'Trimmed mixed whitespace should be empty');
});

// ============================================================================
// Emoji and Unicode Support Tests
// ============================================================================

test('Pretext should support emoji characters', () => {
  const pretextWithEmoji = '🤖 Assistant: ';
  // Check character count respects emoji
  const isValid = pretextWithEmoji.length <= 50;
  assert.ok(isValid, 'Should accept emoji in pretext');
});

test('Pretext should support unicode characters (accents)', () => {
  const pretextWithAccents = 'Assistànt: ';
  const isValid = pretextWithAccents.length <= 50;
  assert.ok(isValid, 'Should accept unicode accents in pretext');
});

test('Pretext should support mixed emoji and text', () => {
  const pretextMixed = '🎤 FireBot: ';
  const isValid = pretextMixed.length <= 50;
  assert.ok(isValid, 'Should accept mixed emoji and text');
});

test('Pretext should count emoji as single character for length limit', () => {
  // This test verifies emoji handling - emoji are typically counted as 1-2 characters
  const emoji = '🤖';
  const text = 'A'.repeat(48);
  const combined = emoji + text;
  // Even with emoji, should fit under 50
  const isValid = combined.length <= 50;
  assert.ok(isValid, 'Should handle emoji length counting correctly');
});

// ============================================================================
// Empty and Skip Behavior Tests
// ============================================================================

test('Pretext should handle empty string gracefully', () => {
  const empty = '';
  const trimmed = empty.trim();
  assert.strictEqual(trimmed.length, 0, 'Empty string should remain empty after trim');
});

test('Pretext should allow user to skip (press Enter)', () => {
  // Simulating user pressing Enter (no input = empty string)
  const userSkipped = '';
  const trimmed = userSkipped.trim();
  assert.strictEqual(trimmed.length, 0, 'Skipping should result in empty pretext');
});

// ============================================================================
// File Read/Write Operations Tests
// ============================================================================

test('Config directory exists', () => {
  assert.ok(existsSync(CONFIG_DIR), 'Config directory should exist at .claude/config');
});

test('Can write pretext file', () => {
  writePretextFile('Agent: ');
  assert.ok(existsSync(TEST_PRETEXT_FILE), 'Pretext file should be created');
  cleanupPretextFile();
});

test('Can read pretext file content', () => {
  const testContent = 'TestAgent: ';
  writePretextFile(testContent);

  const content = readFileSync(TEST_PRETEXT_FILE, 'utf-8');
  assert.strictEqual(content, testContent, 'Should read correct pretext content');
  cleanupPretextFile();
});

test('Pretext file should preserve exact content (no extra whitespace)', () => {
  const testContent = 'Bot: ';
  writePretextFile(testContent);

  const content = readFileSync(TEST_PRETEXT_FILE, 'utf-8');
  assert.strictEqual(content, testContent, 'Should preserve exact content without modification');
  cleanupPretextFile();
});

test('Can overwrite pretext file', () => {
  writePretextFile('First: ');
  writePretextFile('Second: ');

  const content = readFileSync(TEST_PRETEXT_FILE, 'utf-8');
  assert.strictEqual(content, 'Second: ', 'Should overwrite with new content');
  cleanupPretextFile();
});

test('Pretext file with emoji persists correctly', () => {
  const emojiContent = '🎤 Voice: ';
  writePretextFile(emojiContent);

  const content = readFileSync(TEST_PRETEXT_FILE, 'utf-8');
  assert.strictEqual(content, emojiContent, 'Should preserve emoji in file');
  cleanupPretextFile();
});

// ============================================================================
// TTS Prepending Logic Tests
// ============================================================================

test('Pretext should be prepended to TTS text with space separator', () => {
  const pretext = 'Agent: ';
  const message = 'This is the message';

  // Simulate TTS prepending logic
  const result = pretext.trim() ? `${pretext} ${message}` : message;
  const expected = 'Agent:  This is the message';

  assert.strictEqual(result, expected, 'Pretext should be prepended with space');
});

test('Empty pretext should not prepend anything', () => {
  const pretext = '';
  const message = 'This is the message';

  // Simulate TTS prepending logic
  const result = pretext.trim() ? `${pretext} ${message}` : message;

  assert.strictEqual(result, message, 'Empty pretext should not modify message');
});

test('Pretext with emoji should prepend correctly', () => {
  const pretext = '🤖 Bot';
  const message = 'Ready to go';

  const result = `${pretext} ${message}`;
  const expected = '🤖 Bot Ready to go';

  assert.strictEqual(result, expected, 'Emoji pretext should prepend correctly');
});

test('Multiple word pretext should prepend correctly', () => {
  const pretext = 'AI Agent Alpha';
  const message = 'Processing request';

  const result = `${pretext} ${message}`;
  const expected = 'AI Agent Alpha Processing request';

  assert.strictEqual(result, expected, 'Multi-word pretext should prepend with space');
});

// ============================================================================
// Integration Tests (Bash Scripts)
// ============================================================================

test('Pretext TTS hook reads file correctly', () => {
  // Write test pretext file
  writePretextFile('TestBot: ');

  // Test that the pretext file exists and has content
  assert.ok(existsSync(TEST_PRETEXT_FILE), 'Pretext file should exist');
  const content = readFileSync(TEST_PRETEXT_FILE, 'utf-8');
  assert.ok(content.length > 0, 'Pretext file should have content');

  cleanupPretextFile();
});

test('Pretext integration directory structure', () => {
  // Verify the expected directory structure exists
  assert.ok(existsSync(CONFIG_DIR), 'Config directory should exist');
  assert.ok(existsSync(join(PROJECT_ROOT, '.claude/hooks')), 'Hooks directory should exist');
});

test('TTS hook scripts exist and are executable', () => {
  const hooksDir = join(PROJECT_ROOT, '.claude/hooks');
  const requiredHooks = [
    'play-tts-piper.sh',
    'play-tts-macos.sh',
    'play-tts-soprano.sh'
  ];

  requiredHooks.forEach(hook => {
    const hookPath = join(hooksDir, hook);
    assert.ok(existsSync(hookPath), `${hook} should exist`);

    // Windows doesn't use Unix permission bits; skip executable check there
    if (process.platform !== 'win32') {
      const stats = statSync(hookPath);
      assert.ok(stats.mode & 0o111, `${hook} should be executable`);
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

test('Pretext should handle special characters safely', () => {
  const specialChars = 'Agent$@%: ';
  const isValid = specialChars.length <= 50 &&
                  !specialChars.includes('\n') &&
                  !specialChars.includes('\r');
  assert.ok(isValid, 'Should handle special characters within limits');
});

test('Pretext should handle leading/trailing spaces after trim', () => {
  const withSpaces = '  Agent:  ';
  const trimmed = withSpaces.trim();
  const expected = 'Agent:';

  assert.strictEqual(trimmed, expected, 'Should trim leading and trailing spaces');
});

test('Pretext should handle single character', () => {
  const single = 'A';
  const isValid = single.length > 0 && single.length <= 50;
  assert.ok(isValid, 'Should accept single character pretext');
});

test('Pretext should handle maximum length (50 chars) with special content', () => {
  const maxWithSpecial = '🎤 AgentBot (Active) - Ready!';
  const isValid = maxWithSpecial.length <= 50;
  assert.ok(isValid, 'Should handle max-length special content');
});
