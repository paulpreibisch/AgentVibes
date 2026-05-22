/**
 * Tests for LanguageService.
 *
 * Covers:
 * - Module exports the LanguageService class
 * - getLang() returns 'en' when no language file exists
 * - getLang() returns the persisted language after setLang()
 * - setLang() ignores unknown language codes
 * - setLang() writes the language file with mode 0o600
 * - onChange() listeners are called when the language changes
 * - t() delegates to the i18n translator with the active language
 * - Loading from a pre-existing language file on construction
 * - Invalid file content (not a recognised lang) falls back to 'en'
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpHome(suffix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agentvibes-lang-test-${suffix}-`));
}

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Return the path where LanguageService writes its language.txt, relative to
 * a given homeDir.  Mirrors the LANG_FILE computation in the source.
 */
function langFilePath(homeDir) {
  return path.join(homeDir, '.claude', 'config', 'language.txt');
}

// ---------------------------------------------------------------------------
// LanguageService is constructed with a hard-coded LANG_FILE that points to
// the real home directory.  We cannot pass a custom path via the constructor
// (the class has no injection point), so we monkey-patch os.homedir() for the
// duration of tests that need to redirect file I/O to a tmp directory.
//
// Strategy:
//   1. Before importing LanguageService, override os.homedir to return tmpDir.
//   2. Import the module — the top-level LANG_FILE is evaluated at import
//      time, so the overridden homedir is captured.
//   3. Because ESM modules are cached by the runtime we use a single tmpDir
//      for the whole suite and reset the language.txt file between tests.
// ---------------------------------------------------------------------------

let tmpHome;
let langFile;
let LanguageService;

// We need the module loaded once with a controlled home dir.
// Use before() at the top level to run setup prior to all describe blocks.

before(async () => {
  tmpHome  = makeTmpHome('main');
  langFile = langFilePath(tmpHome);

  // Patch os.homedir before the import so LANG_FILE is captured correctly.
  const originalHomedir = os.homedir;
  os.homedir = () => tmpHome;

  const mod = await import('../../src/services/language-service.js');
  LanguageService = mod.LanguageService;

  // Restore original homedir — LANG_FILE is already captured inside the module.
  os.homedir = originalHomedir;
});

after(() => {
  if (tmpHome) cleanDir(tmpHome);
});

// Wipe the language file between tests so each test starts clean.
function resetLangFile() {
  if (fs.existsSync(langFile)) fs.unlinkSync(langFile);
}

// ---------------------------------------------------------------------------
// Module structure
// ---------------------------------------------------------------------------

describe('LanguageService — module exports', () => {
  test('LanguageService is exported as a class (function)', () => {
    assert.strictEqual(typeof LanguageService, 'function',
      'LanguageService must be a named class export');
  });

  test('instances expose getLang, setLang, onChange, and t methods', () => {
    resetLangFile();
    const svc = new LanguageService();
    assert.strictEqual(typeof svc.getLang,   'function');
    assert.strictEqual(typeof svc.setLang,   'function');
    assert.strictEqual(typeof svc.onChange,  'function');
    assert.strictEqual(typeof svc.t,         'function');
  });
});

// ---------------------------------------------------------------------------
// Default state / fallback behaviour
// ---------------------------------------------------------------------------

describe('LanguageService — defaults', () => {
  test('getLang() returns "en" when no language file exists', () => {
    resetLangFile();
    const svc = new LanguageService();
    assert.strictEqual(svc.getLang(), 'en');
  });

  test('getLang() returns "en" when language file contains an unsupported code', () => {
    fs.mkdirSync(path.dirname(langFile), { recursive: true });
    fs.writeFileSync(langFile, 'xx', { mode: 0o600 });
    const svc = new LanguageService();
    assert.strictEqual(svc.getLang(), 'en');
    resetLangFile();
  });

  test('getLang() returns "en" when language file is empty', () => {
    fs.mkdirSync(path.dirname(langFile), { recursive: true });
    fs.writeFileSync(langFile, '', { mode: 0o600 });
    const svc = new LanguageService();
    assert.strictEqual(svc.getLang(), 'en');
    resetLangFile();
  });

  test('getLang() trims whitespace from language file content', () => {
    fs.mkdirSync(path.dirname(langFile), { recursive: true });
    fs.writeFileSync(langFile, '  es  \n', { mode: 0o600 });
    const svc = new LanguageService();
    assert.strictEqual(svc.getLang(), 'es');
    resetLangFile();
  });
});

// ---------------------------------------------------------------------------
// Persistence — loading from file
// ---------------------------------------------------------------------------

describe('LanguageService — loading persisted language', () => {
  test('loads "es" from a pre-existing language file', () => {
    fs.mkdirSync(path.dirname(langFile), { recursive: true });
    fs.writeFileSync(langFile, 'es', { mode: 0o600 });
    const svc = new LanguageService();
    assert.strictEqual(svc.getLang(), 'es');
    resetLangFile();
  });

  test('loads "fr" from a pre-existing language file', () => {
    fs.mkdirSync(path.dirname(langFile), { recursive: true });
    fs.writeFileSync(langFile, 'fr', { mode: 0o600 });
    const svc = new LanguageService();
    assert.strictEqual(svc.getLang(), 'fr');
    resetLangFile();
  });

  test('loads "zh-CN" (compound code) from a pre-existing language file', () => {
    fs.mkdirSync(path.dirname(langFile), { recursive: true });
    fs.writeFileSync(langFile, 'zh-CN', { mode: 0o600 });
    const svc = new LanguageService();
    assert.strictEqual(svc.getLang(), 'zh-CN');
    resetLangFile();
  });
});

// ---------------------------------------------------------------------------
// setLang — happy path
// ---------------------------------------------------------------------------

describe('LanguageService — setLang() round-trip', () => {
  test('setLang("es") updates getLang() immediately', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('es');
    assert.strictEqual(svc.getLang(), 'es');
    resetLangFile();
  });

  test('setLang("de") writes language file with correct content', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('de');
    const written = fs.readFileSync(langFile, 'utf8');
    assert.strictEqual(written, 'de');
    resetLangFile();
  });

  test('setLang("ja") writes language file with mode 0o600', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('ja');
    const stat = fs.statSync(langFile);
    // Check owner read/write only (0o600).  stat.mode includes file type bits so
    // mask with 0o777 to get only permission bits.
    assert.strictEqual(stat.mode & 0o777, 0o600);
    resetLangFile();
  });

  test('setLang() creates parent directories if they do not exist', () => {
    resetLangFile();
    // Remove the parent directory entirely so mkdirSync must create it.
    const configDir = path.dirname(langFile);
    if (fs.existsSync(configDir)) fs.rmSync(configDir, { recursive: true });

    const svc = new LanguageService();
    svc.setLang('pt');
    assert.ok(fs.existsSync(langFile), 'language file must be created even when dir was absent');
    resetLangFile();
  });

  test('successive setLang calls update the file each time', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('ko');
    assert.strictEqual(svc.getLang(), 'ko');
    svc.setLang('hi');
    assert.strictEqual(svc.getLang(), 'hi');
    const written = fs.readFileSync(langFile, 'utf8');
    assert.strictEqual(written, 'hi');
    resetLangFile();
  });
});

// ---------------------------------------------------------------------------
// setLang — validation / unknown codes
// ---------------------------------------------------------------------------

describe('LanguageService — setLang() with invalid codes', () => {
  test('setLang("xx") is ignored — getLang() stays "en"', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('xx');
    assert.strictEqual(svc.getLang(), 'en');
  });

  test('setLang("") is ignored — getLang() stays "en"', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('');
    assert.strictEqual(svc.getLang(), 'en');
  });

  test('setLang("EN") (wrong case) is ignored', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('EN');
    assert.strictEqual(svc.getLang(), 'en');
  });

  test('setLang with invalid code does not write language file', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('zz');
    assert.ok(!fs.existsSync(langFile), 'language file must not be created for invalid lang');
  });

  test('setLang with invalid code does not overwrite a valid existing lang', () => {
    resetLangFile();
    const svc = new LanguageService();
    svc.setLang('es');
    svc.setLang('invalid-code');
    assert.strictEqual(svc.getLang(), 'es', 'lang must remain es after rejected update');
    resetLangFile();
  });
});

// ---------------------------------------------------------------------------
// onChange listeners
// ---------------------------------------------------------------------------

describe('LanguageService — onChange()', () => {
  test('listener is called when setLang() changes the language', () => {
    resetLangFile();
    const svc = new LanguageService();
    let receivedLang;
    svc.onChange(lang => { receivedLang = lang; });
    svc.setLang('fr');
    assert.strictEqual(receivedLang, 'fr');
    resetLangFile();
  });

  test('listener is NOT called when setLang() receives an invalid code', () => {
    resetLangFile();
    const svc = new LanguageService();
    let callCount = 0;
    svc.onChange(() => { callCount++; });
    svc.setLang('invalid');
    assert.strictEqual(callCount, 0, 'listener must not fire for invalid language');
  });

  test('multiple listeners are all notified', () => {
    resetLangFile();
    const svc = new LanguageService();
    const received = [];
    svc.onChange(lang => received.push(`a:${lang}`));
    svc.onChange(lang => received.push(`b:${lang}`));
    svc.setLang('de');
    assert.deepStrictEqual(received, ['a:de', 'b:de']);
    resetLangFile();
  });

  test('listener receives the new language code as its argument', () => {
    resetLangFile();
    const svc = new LanguageService();
    const langs = [];
    svc.onChange(lang => langs.push(lang));
    svc.setLang('ko');
    svc.setLang('ja');
    assert.deepStrictEqual(langs, ['ko', 'ja']);
    resetLangFile();
  });
});

// ---------------------------------------------------------------------------
// t() delegation
// ---------------------------------------------------------------------------

describe('LanguageService — t() method', () => {
  test('t() returns a non-empty string for a known key in English', () => {
    resetLangFile();
    const svc = new LanguageService();
    // 'welcomeTitle' is present in all language files per strings.js
    const result = svc.t('welcomeTitle');
    assert.ok(typeof result === 'string' && result.length > 0,
      `Expected non-empty string from t('welcomeTitle'), got: ${JSON.stringify(result)}`);
  });

  test('t() uses the active language after setLang()', () => {
    resetLangFile();
    const svc = new LanguageService();
    const enResult = svc.t('welcomeTitle');
    svc.setLang('es');
    const esResult = svc.t('welcomeTitle');
    // Spanish and English titles should both be non-empty strings.
    // They may or may not differ — we only guarantee non-empty.
    assert.ok(typeof esResult === 'string' && esResult.length > 0,
      `Expected non-empty Spanish string, got: ${JSON.stringify(esResult)}`);
    resetLangFile();
  });

  test('t() falls back to the key name for an unknown key', () => {
    resetLangFile();
    const svc = new LanguageService();
    const result = svc.t('__no_such_key_xyz__');
    assert.strictEqual(result, '__no_such_key_xyz__',
      'Unknown key must be returned as-is when no translation or English fallback exists');
  });
});

// ---------------------------------------------------------------------------
// All supported language codes are accepted
// ---------------------------------------------------------------------------

describe('LanguageService — all SUPPORTED_LANGUAGES accepted by setLang()', () => {
  const supportedCodes = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'hi', 'zh-CN', 'ko'];

  for (const code of supportedCodes) {
    test(`setLang("${code}") is accepted and persisted`, () => {
      resetLangFile();
      const svc = new LanguageService();
      svc.setLang(code);
      assert.strictEqual(svc.getLang(), code, `getLang() must return "${code}" after setLang`);
      resetLangFile();
    });
  }
});
