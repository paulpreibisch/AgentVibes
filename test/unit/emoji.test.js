/**
 * Emoji Terminal Support Tests
 * Tests Story 2.3 & 2.4: Terminal emoji detection and fallback
 */

import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Mock emoji mapping from installer.js
 */
const personalityEmojis = {
  'angry': '😠',
  'dramatic': '🎭',
  'dry-humor': '😐',
  'flirty': '😘',
  'none': '😊',
  'pirate': '🏴‍☠️',
  'professional': '👔',
  'sarcastic': '😏'
};

/**
 * Story 2.3: Detect terminal emoji support
 */
function supportsEmoji() {
  const term = process.env.TERM || '';
  const lang = process.env.LANG || '';
  const lcAll = process.env.LC_ALL || '';

  // Explicitly unsupported terminals
  const unsupportedTerminals = ['dumb', 'emacs', 'ansi'];
  if (unsupportedTerminals.includes(term.toLowerCase())) {
    return false;
  }

  // Check for UTF-8 locale
  const isUtf8 = lang.includes('utf8') || lang.includes('UTF-8') ||
                 lcAll.includes('utf8') || lcAll.includes('UTF-8');

  // Modern terminals
  const modernTerminals = [
    'xterm-256color', 'screen-256color', 'tmux-256color',
    'iterm2', 'iterm', 'vscode', 'alacritty', 'kitty',
    'wezterm', 'windows-terminal', 'conemu'
  ];

  const isModernTerminal = modernTerminals.some(t => term.toLowerCase().includes(t));

  // Windows Terminal
  const isWindowsTerminal = process.platform === 'win32' &&
                            (process.env.WT_SESSION || process.env.WT_PROFILE_ID);

  // macOS
  const isMacOS = process.platform === 'darwin';

  // Linux with UTF-8
  const isLinuxWithUtf8 = process.platform === 'linux' && isUtf8;

  return isModernTerminal || isWindowsTerminal || isMacOS || isLinuxWithUtf8 || (term && isUtf8);
}

/**
 * Story 2.4: Get personality display with emoji or text fallback
 */
function getPersonalityIcon(personality) {
  const emoji = personalityEmojis[personality] || '✨';

  if (supportsEmoji()) {
    return emoji;
  }

  return `[${personality}]`;
}

// ============================================================================
// Terminal Detection Tests (Story 2.3)
// ============================================================================

test('Unsupported terminal (dumb) returns false', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'dumb';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  assert.strictEqual(result, false, 'dumb terminal should not support emoji');
});

test('Unsupported terminal (emacs) returns false', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'emacs';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  assert.strictEqual(result, false, 'emacs terminal should not support emoji');
});

test('Modern terminal (xterm-256color) returns true', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'xterm-256color';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  assert.strictEqual(result, true, 'xterm-256color should support emoji');
});

test('Modern terminal (screen-256color) returns true', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'screen-256color';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  assert.strictEqual(result, true, 'screen-256color should support emoji');
});

test('Modern terminal (iterm2) returns true', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'iterm2';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  assert.strictEqual(result, true, 'iterm2 should support emoji');
});

test('Modern terminal (alacritty) returns true', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'alacritty';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  assert.strictEqual(result, true, 'alacritty should support emoji');
});

test('UTF-8 locale enables emoji on unknown terminal', () => {
  const savedTerm = process.env.TERM;
  const savedLang = process.env.LANG;
  process.env.TERM = 'unknown-terminal';
  process.env.LANG = 'en_US.UTF-8';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  process.env.LANG = savedLang;
  assert.strictEqual(result, true, 'UTF-8 locale should enable emoji');
});

// ============================================================================
// Emoji Fallback Tests (Story 2.4)
// ============================================================================

test('Emoji returned when supported', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'xterm-256color';
  const icon = getPersonalityIcon('pirate');
  process.env.TERM = savedTerm;
  assert.strictEqual(icon, '🏴‍☠️', 'Should return emoji for pirate when supported');
});

test('Text fallback returned when not supported', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'dumb';
  const icon = getPersonalityIcon('pirate');
  process.env.TERM = savedTerm;
  assert.strictEqual(icon, '[pirate]', 'Should return text fallback when not supported');
});

test('Text fallback format for multiple personalities', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'dumb';

  const pirate = getPersonalityIcon('pirate');
  const sarcastic = getPersonalityIcon('sarcastic');
  const professional = getPersonalityIcon('professional');

  process.env.TERM = savedTerm;

  assert.strictEqual(pirate, '[pirate]', 'pirate fallback correct');
  assert.strictEqual(sarcastic, '[sarcastic]', 'sarcastic fallback correct');
  assert.strictEqual(professional, '[professional]', 'professional fallback correct');
});

test('Default emoji for unknown personality', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'xterm-256color';
  const icon = getPersonalityIcon('unknown-personality');
  process.env.TERM = savedTerm;
  assert.strictEqual(icon, '✨', 'Should return default emoji for unknown personality');
});

test('Default fallback for unknown personality', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'dumb';
  const icon = getPersonalityIcon('unknown-personality');
  process.env.TERM = savedTerm;
  assert.strictEqual(icon, '[unknown-personality]', 'Should return bracketed name for unknown personality');
});

test('All emoji mappings return emoji when supported', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'xterm-256color';

  Object.keys(personalityEmojis).forEach(personality => {
    const icon = getPersonalityIcon(personality);
    const emoji = personalityEmojis[personality];
    assert.strictEqual(icon, emoji, `${personality} should return its emoji`);
  });

  process.env.TERM = savedTerm;
});

test('All emoji mappings return text fallback when not supported', () => {
  const savedTerm = process.env.TERM;
  process.env.TERM = 'dumb';

  Object.keys(personalityEmojis).forEach(personality => {
    const icon = getPersonalityIcon(personality);
    assert.strictEqual(icon, `[${personality}]`, `${personality} should return bracketed name`);
  });

  process.env.TERM = savedTerm;
});

// ============================================================================
// UTF-8 Locale Tests
// ============================================================================

test('LC_ALL UTF-8 enables emoji', () => {
  const savedTerm = process.env.TERM;
  const savedLcAll = process.env.LC_ALL;
  process.env.TERM = 'unknown';
  process.env.LC_ALL = 'en_US.UTF-8';
  const result = supportsEmoji();
  process.env.TERM = savedTerm;
  process.env.LC_ALL = savedLcAll;
  assert.strictEqual(result, true, 'LC_ALL=UTF-8 should enable emoji');
});

test('LANG with UTF-8 variant enables emoji', () => {
  const savedLang = process.env.LANG;
  const savedTerm = process.env.TERM;
  delete process.env.TERM;
  process.env.LANG = 'ja_JP.utf8';
  const result = supportsEmoji();
  process.env.LANG = savedLang;
  process.env.TERM = savedTerm;
  assert.strictEqual(result, true, 'UTF-8 in LANG should enable emoji');
});
