/**
 * Coverage for installer.js pure/deterministic helper functions
 *
 * Tests exported helper functions that were previously non-exported:
 * isPiperProvider, supportsEmoji, getPersonalityIcon, detectEnvironment,
 * createPageHeaderFooter, buildNavigationChoices, handleNavigationAction,
 * getPageTitle, getUserShell, showWelcome, getReleaseInfoBoxen,
 * generateActivationInstructions.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  isPiperProvider,
  supportsEmoji,
  getPersonalityIcon,
  detectEnvironment,
  createPageHeaderFooter,
  buildNavigationChoices,
  handleNavigationAction,
  getPageTitle,
  getUserShell,
  showWelcome,
  getReleaseInfoBoxen,
  generateActivationInstructions,
} from '../../src/installer.js';

// ===========================================================================
// isPiperProvider
// ===========================================================================

describe('isPiperProvider()', () => {
  test('returns true for piper', () => {
    assert.strictEqual(isPiperProvider('piper'), true);
  });

  test('returns true for windows-piper', () => {
    assert.strictEqual(isPiperProvider('windows-piper'), true);
  });

  test('returns false for macos', () => {
    assert.strictEqual(isPiperProvider('macos'), false);
  });

  test('returns false for soprano', () => {
    assert.strictEqual(isPiperProvider('soprano'), false);
  });

  test('returns false for silent', () => {
    assert.strictEqual(isPiperProvider('silent'), false);
  });

  test('returns false for empty string', () => {
    assert.strictEqual(isPiperProvider(''), false);
  });
});

// ===========================================================================
// supportsEmoji
// ===========================================================================

describe('supportsEmoji()', () => {
  test('returns a boolean', () => {
    assert.strictEqual(typeof supportsEmoji(), 'boolean');
  });

  test('returns false for dumb terminal', () => {
    const orig = process.env.TERM;
    process.env.TERM = 'dumb';
    const result = supportsEmoji();
    if (orig === undefined) delete process.env.TERM; else process.env.TERM = orig;
    assert.strictEqual(result, false);
  });

  test('returns true for xterm-256color with UTF-8 locale', () => {
    const origTerm = process.env.TERM;
    const origLang = process.env.LANG;
    process.env.TERM = 'xterm-256color';
    process.env.LANG = 'en_US.UTF-8';
    const result = supportsEmoji();
    if (origTerm === undefined) delete process.env.TERM; else process.env.TERM = origTerm;
    if (origLang === undefined) delete process.env.LANG; else process.env.LANG = origLang;
    assert.strictEqual(result, true);
  });
});

// ===========================================================================
// getPersonalityIcon
// ===========================================================================

describe('getPersonalityIcon()', () => {
  test('returns emoji when emoji supported', () => {
    const result = getPersonalityIcon('funny', true);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('returns text fallback when emoji not supported', () => {
    const result = getPersonalityIcon('funny', false);
    assert.ok(result.includes('funny'));
    assert.ok(result.startsWith('['));
    assert.ok(result.endsWith(']'));
  });

  test('handles unknown personality with emoji supported', () => {
    const result = getPersonalityIcon('unknown-personality', true);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('handles unknown personality with text fallback', () => {
    const result = getPersonalityIcon('custom', false);
    assert.strictEqual(result, '[custom]');
  });
});

// ===========================================================================
// detectEnvironment
// ===========================================================================

describe('detectEnvironment()', () => {
  test('returns a string', () => {
    const result = detectEnvironment();
    assert.strictEqual(typeof result, 'string');
  });

  test('returns one of the known environment types', () => {
    const result = detectEnvironment();
    assert.ok(['PHONE', 'VOICELESS', 'DESKTOP'].includes(result));
  });
});

// ===========================================================================
// getPageTitle
// ===========================================================================

describe('getPageTitle()', () => {
  test('returns string for page 0', () => {
    const result = getPageTitle(0);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('returns string for all pages 0-7', () => {
    for (let i = 0; i <= 7; i++) {
      const result = getPageTitle(i);
      assert.ok(typeof result === 'string' && result.length > 0, `page ${i} should return a string`);
    }
  });

  test('returns fallback for unknown page', () => {
    const result = getPageTitle(99);
    assert.ok(typeof result === 'string' && result.length > 0);
  });
});

// ===========================================================================
// createPageHeaderFooter
// ===========================================================================

describe('createPageHeaderFooter()', () => {
  test('returns object with header and footer', () => {
    const result = createPageHeaderFooter('Test Page', 0, 8);
    assert.ok(typeof result === 'object');
    assert.ok('header' in result);
    assert.ok('footer' in result);
  });

  test('header and footer are strings', () => {
    const result = createPageHeaderFooter('My Page', 2, 8);
    assert.strictEqual(typeof result.header, 'string');
    assert.strictEqual(typeof result.footer, 'string');
  });

  test('works with pageOffset', () => {
    const result = createPageHeaderFooter('Offset Page', 1, 8, 2);
    assert.ok(typeof result.header === 'string');
  });

  test('works on last page', () => {
    const result = createPageHeaderFooter('Last', 7, 8);
    assert.ok(typeof result.header === 'string');
  });
});

// ===========================================================================
// buildNavigationChoices
// ===========================================================================

describe('buildNavigationChoices()', () => {
  test('returns an array', () => {
    const result = buildNavigationChoices(0, 8, 'Continue', false);
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
  });

  test('first page without showPreviousOnFirst has no prev choice', () => {
    const result = buildNavigationChoices(0, 8, 'Continue', false);
    const values = result.map(c => c.value);
    assert.ok(!values.includes('prev'));
  });

  test('first page with showPreviousOnFirst has prev choice', () => {
    const result = buildNavigationChoices(0, 8, 'Continue', true);
    const values = result.map(c => c.value);
    assert.ok(values.includes('prev'));
  });

  test('middle page has next and prev', () => {
    const result = buildNavigationChoices(3, 8, 'Continue', false);
    const values = result.map(c => c.value);
    assert.ok(values.includes('next'));
    assert.ok(values.includes('prev'));
  });

  test('last page has continue and prev', () => {
    const result = buildNavigationChoices(7, 8, 'Install Now', false);
    const values = result.map(c => c.value);
    assert.ok(values.includes('continue'));
    assert.ok(values.includes('prev'));
  });

  test('works with pages array for labels', () => {
    const pages = [
      { title: 'Page 0' }, { title: 'Page 1' }, { title: 'Page 2' }
    ];
    const result = buildNavigationChoices(0, 3, 'Continue', false, pages);
    assert.ok(Array.isArray(result));
  });

  test('all choices have name and value', () => {
    const result = buildNavigationChoices(1, 5, 'Go', false);
    for (const choice of result) {
      assert.ok('name' in choice && 'value' in choice);
    }
  });
});

// ===========================================================================
// handleNavigationAction
// ===========================================================================

describe('handleNavigationAction()', () => {
  test('next on page 0 returns page 1', () => {
    const result = handleNavigationAction('next', 0, false);
    assert.strictEqual(result.newPage, 1);
    assert.strictEqual(result.shouldExit, false);
    assert.strictEqual(result.shouldReturn, false);
  });

  test('prev on page 2 returns page 1', () => {
    const result = handleNavigationAction('prev', 2, false);
    assert.strictEqual(result.newPage, 1);
    assert.strictEqual(result.shouldExit, false);
    assert.strictEqual(result.shouldReturn, false);
  });

  test('prev on page 0 without showPreviousOnFirst returns same page and shouldReturn=false', () => {
    const result = handleNavigationAction('prev', 0, false);
    assert.strictEqual(result.newPage, 0);
    assert.strictEqual(result.shouldReturn, false);
  });

  test('prev on page 0 with showPreviousOnFirst returns shouldReturn=true', () => {
    const result = handleNavigationAction('prev', 0, true);
    assert.strictEqual(result.shouldReturn, true);
    assert.strictEqual(result.shouldExit, false);
  });

  test('continue action sets shouldExit=true', () => {
    const result = handleNavigationAction('continue', 5, false);
    assert.strictEqual(result.shouldExit, true);
    assert.strictEqual(result.shouldReturn, false);
  });

  test('always returns object with newPage, shouldExit, shouldReturn', () => {
    for (const action of ['next', 'prev', 'continue']) {
      const result = handleNavigationAction(action, 3, false);
      assert.ok('newPage' in result);
      assert.ok('shouldExit' in result);
      assert.ok('shouldReturn' in result);
    }
  });
});

// ===========================================================================
// getUserShell
// ===========================================================================

describe('getUserShell()', () => {
  test('returns an object with shell property', () => {
    const result = getUserShell();
    assert.ok(typeof result === 'object');
    assert.ok('shell' in result);
  });

  test('shell is a non-empty string', () => {
    const { shell } = getUserShell();
    assert.ok(typeof shell === 'string' && shell.length > 0);
  });

  test('shellConfig is a string', () => {
    const { shellConfig } = getUserShell();
    assert.ok(shellConfig === null || typeof shellConfig === 'string');
  });
});

// ===========================================================================
// showWelcome
// ===========================================================================

describe('showWelcome()', () => {
  test('does not throw', () => {
    assert.doesNotThrow(() => showWelcome());
  });
});

// ===========================================================================
// getReleaseInfoBoxen
// ===========================================================================

describe('getReleaseInfoBoxen()', () => {
  test('returns a non-empty string', () => {
    const result = getReleaseInfoBoxen();
    assert.ok(typeof result === 'string' && result.length > 0);
  });
});

// ===========================================================================
// generateActivationInstructions
// ===========================================================================

describe('generateActivationInstructions()', () => {
  test('returns a non-empty string', () => {
    const result = generateActivationInstructions('1.0.0');
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('works with null version', () => {
    const result = generateActivationInstructions(null);
    assert.ok(typeof result === 'string');
  });

  test('works with undefined version', () => {
    const result = generateActivationInstructions(undefined);
    assert.ok(typeof result === 'string');
  });
});
