/**
 * File: src/i18n/strings.js
 *
 * Internationalization strings for the AgentVibes installer TUI.
 * Supports: en, es, fr, de, pt, ja, hi, zh-CN, ko
 *
 * Usage:
 *   import { t, SUPPORTED_LANGUAGES, strings } from './i18n/strings.js';
 *   t('es', 'welcomeTitle') // => Spanish welcome title
 *   t('xx', 'welcomeTitle') // => falls back to English
 */

import en from './en.js';
import es from './es.js';
import fr from './fr.js';
import de from './de.js';
import pt from './pt.js';
import ja from './ja.js';
import hi from './hi.js';
import zhCN from './zh-CN.js';
import ko from './ko.js';

export const strings = { en, es, fr, de, pt, ja, hi, 'zh-CN': zhCN, ko };

/**
 * Translate a key for a given language, falling back to English.
 * @param {string} lang - Language code (e.g. 'es', 'zh-CN')
 * @param {string} key - String key to look up
 * @returns {string} Translated string, or English fallback, or the key itself
 */
export function t(lang, key) {
  const langStrings = strings[lang];
  if (langStrings && langStrings[key] !== undefined) {
    return langStrings[key];
  }
  // Fall back to English
  return strings.en[key] !== undefined ? strings.en[key] : key;
}

/**
 * Supported languages for the language chooser UI.
 * Each entry has: value (language code), name (display label for inquirer)
 */
export const SUPPORTED_LANGUAGES = [
  { value: 'en',    name: '🇺🇸 English' },
  { value: 'es',    name: '🇪🇸 Español (Spanish)' },
  { value: 'fr',    name: '🇫🇷 Français (French)' },
  { value: 'de',    name: '🇩🇪 Deutsch (German)' },
  { value: 'pt',    name: '🇧🇷 Português (Portuguese)' },
  { value: 'ja',    name: '🇯🇵 日本語 (Japanese)' },
  { value: 'hi',    name: '🇮🇳 हिन्दी (Hindi)' },
  { value: 'zh-CN', name: '🇨🇳 中文 (Chinese Simplified)' },
  { value: 'ko',    name: '🇰🇷 한국어 (Korean)' },
];
