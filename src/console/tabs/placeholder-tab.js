/**
 * AgentVibes TUI Console — Placeholder Tab Component
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Creates a stub content box for each tab ID.
 * These are replaced by real tab implementations in Epics 7-11.
 */

import blessed from 'blessed';
import { t } from '../../i18n/strings.js';

/**
 * Create a hidden placeholder box for a tab, appended into the content area.
 *
 * @param {object} contentArea - Blessed box to append into (this.contentArea from app.js)
 * @param {string} label - Human-readable tab name for display (e.g. 'Settings')
 * @returns {object} The created Blessed box widget
 */
export function createPlaceholderTab(contentArea, label) {
  const box = blessed.box({
    parent: contentArea,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    content: `{center}{bold}${label}{/bold}{/center}\n\n{center}Coming in a future story...{/center}`,
    tags: true,
    hidden: true,
    style: {
      fg: '#90a4ae',
      bg: '#0a0e1a',
    },
  });

  return box;
}

/** Map of tabId → display label for all tabs */
export const TAB_DISPLAY_LABELS = {
  settings:        'Settings',
  voices:          'Voices',
  music:           'Music',
  agents:          'BMad',
  receiver:        'Receiver',
  readme:          'Readme',
  help:            'Help',
  setup:           'Setup',
};

/** Override shortcut key for tabs where first letter conflicts */
export const TAB_SHORTCUT_KEYS = {
  setup:           'I',
  agents:          'B',
  receiver:        'X',
};

/**
 * Return the translated display label for a tab.
 * Falls back to TAB_DISPLAY_LABELS[id] if no i18n key is found.
 *
 * @param {string} id   - Tab identifier (e.g. 'settings', 'voices')
 * @param {string} lang - BCP-47 language code (e.g. 'es', 'zh-CN')
 * @returns {string}
 */
export function getTabLabel(id, lang = 'en') {
  const keyMap = {
    setup:           'tabSetup',
    settings:        'tabSettings',
    voices:          'tabVoices',
    music:           'tabMusic',
    agents:          'tabBmad',
    receiver:        'tabReceiver',
    readme:          'tabReadme',
    help:            'tabHelp',
  };
  const key = keyMap[id];
  if (!key) return TAB_DISPLAY_LABELS[id] ?? id;
  const translated = t(lang, key);
  // t() returns the key itself when missing — fall back to English display label
  return (translated && translated !== key) ? translated : (TAB_DISPLAY_LABELS[id] ?? id);
}
