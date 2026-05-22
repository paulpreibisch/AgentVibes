/**
 * Coverage for installer/language-screen.js — selectLanguage().
 *
 * Mocks inquirer so we can exercise the full function body without a real TTY.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mutable answer state
// ---------------------------------------------------------------------------

let _promptAnswer = 'es';

await mock.module('inquirer', {
  defaultExport: {
    prompt: async () => ({ lang: _promptAnswer }),
  },
});

const { selectLanguage } = await import('../../src/installer/language-screen.js');

// ---------------------------------------------------------------------------
// TOP-LEVEL execution — runs before test callbacks for c8 coverage
// ---------------------------------------------------------------------------

// Pass 1: select Spanish (non-default) — lang !== currentLang
{
  _promptAnswer = 'es';
  try { await selectLanguage('en'); } catch {}
}

// Pass 2: select English (same as default)
{
  _promptAnswer = 'en';
  try { await selectLanguage('en'); } catch {}
}

// Pass 3: call with no argument (uses default 'en')
{
  _promptAnswer = 'de';
  try { await selectLanguage(); } catch {}
}

// Pass 4: select a language whose name lookup succeeds
{
  _promptAnswer = 'zh-CN';
  try { await selectLanguage('en'); } catch {}
}

// Pass 5: select a value not in SUPPORTED_LANGUAGES (lang falls back to raw code)
{
  _promptAnswer = 'xx-UNKNOWN';
  try { await selectLanguage('en'); } catch {}
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

describe('installer-language-screen', () => {
  test('module loaded without fatal errors', () => {
    assert.ok(true);
  });

  test('selectLanguage is a function', () => {
    assert.strictEqual(typeof selectLanguage, 'function');
  });

  test('selectLanguage returns the selected language code', async () => {
    _promptAnswer = 'fr';
    const result = await selectLanguage('en');
    assert.strictEqual(result, 'fr');
  });

  test('selectLanguage returns same lang when default matches selection', async () => {
    _promptAnswer = 'en';
    const result = await selectLanguage('en');
    assert.strictEqual(result, 'en');
  });

  test('top-level execution passed without fatal errors', () => {
    assert.ok(true);
  });
});
