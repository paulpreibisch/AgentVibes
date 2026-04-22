/**
 * LanguageService — single source of truth for the selected UI language.
 *
 * Persists the selection to ~/.claude/config/language.txt so it survives
 * process restarts.  Notifies registered listeners on every change so the
 * TUI can re-render dynamic labels immediately.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { t, SUPPORTED_LANGUAGES } from '../i18n/strings.js';

const LANG_FILE = path.join(os.homedir(), '.claude', 'config', 'language.txt');
const VALID_LANGS = new Set(SUPPORTED_LANGUAGES.map(l => l.value));

export class LanguageService {
  constructor() {
    this._lang = this._load();
    this._listeners = [];
  }

  _load() {
    try {
      const val = fs.readFileSync(LANG_FILE, 'utf8').trim();
      return VALID_LANGS.has(val) ? val : 'en';
    } catch {
      return 'en';
    }
  }

  getLang() { return this._lang; }

  setLang(lang) {
    if (!VALID_LANGS.has(lang)) return;
    this._lang = lang;
    try {
      fs.mkdirSync(path.dirname(LANG_FILE), { recursive: true });
      fs.writeFileSync(LANG_FILE, lang, { mode: 0o600 });
    } catch { /* non-fatal */ }
    this._listeners.forEach(fn => fn(lang));
  }

  onChange(fn) { this._listeners.push(fn); }

  t(key) { return t(this._lang, key); }
}
