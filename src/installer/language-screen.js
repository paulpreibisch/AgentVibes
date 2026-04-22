/**
 * File: src/installer/language-screen.js
 *
 * Language selection screen for the AgentVibes installer TUI.
 * Presents a list of supported languages and returns the selected code.
 */

import inquirer from 'inquirer';
import { t, SUPPORTED_LANGUAGES } from '../i18n/strings.js';

/**
 * Show the language selection screen and return the chosen language code.
 *
 * @param {string} [currentLang='en'] - Currently active language code (used as default)
 * @returns {Promise<string>} The selected language code (e.g. 'es', 'zh-CN')
 */
export async function selectLanguage(currentLang = 'en') {
  const { lang } = await inquirer.prompt([{
    type: 'list',
    name: 'lang',
    message: '🌐 Select Language / Seleccionar Idioma / Choisir la langue / Sprache wählen / Selecionar Idioma / 言語を選択 / भाषा चुनें / 选择语言 / 언어 선택',
    default: currentLang,
    choices: SUPPORTED_LANGUAGES
  }]);

  console.clear();
  const chosenName = SUPPORTED_LANGUAGES.find(l => l.value === lang)?.name ?? lang;
  console.log(`\u2713 ${t(lang, 'languageApplied')}: ${chosenName}\n`);

  return lang;
}
