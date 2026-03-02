/**
 * AgentVibes TUI Console — Placeholder Tab Component
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Creates a stub content box for each tab ID.
 * These are replaced by real tab implementations in Epics 7-11.
 */

import blessed from 'blessed';

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

/** Map of tabId → display label for all 7 tabs */
export const TAB_DISPLAY_LABELS = {
  settings: 'Settings',
  voices:   'Voices',
  music:    'Music',
  readme:   'Readme',
  help:     'Help',
  install:  'Install',
};
