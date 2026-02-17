/**
 * AgentVibes TUI Console — Context Footer Configuration
 * Story 6.3: Color-Coded Context Footer System
 *
 * Per-tab footer colors and keyboard shortcut hint text.
 * Keys are styled in magenta ({#ff00ff-fg}{bold}); actions follow in plain text.
 */

/** Fallback footer background color */
export const DEFAULT_FOOTER_COLOR = '#1a237e';

/** Helper: wrap a key label in magenta bold tags */
function key(label) {
  return `{#ff00ff-fg}{bold}[${label}]{/bold}{/#ff00ff-fg}`;
}

export const FOOTER_CONFIG = {
  settings: {
    color: '#2196f3',
    text: ` ${key('↑↓')} Navigate  ${key('←→')} Same Row  ${key('Enter')} Activate  ${key('Space')} Preview  ${key('Esc')} Cancel`,
  },
  voices: {
    color: '#00bcd4',
    text: ` ${key('1-6')} Sort  ${key('/')} Search  ${key('P')} Provider  ${key('F')} Favorites  ${key('Space')} Preview  ${key('*')} Fav  ${key('I')} Install`,
  },
  music: {
    color: '#ff9800',
    text: ` ${key('Space')} Preview  ${key('Enter')} Select  ${key('M')} Toggle  ${key('*')} Fav  ${key('F')} Filter  ${key('↑↓')} Navigate`,
  },
  agents: {
    color: '#9c27b0',
    text: ` ${key('↑↓')} Navigate  ${key('Enter')} Assign  ${key('Space')} Preview  ${key('R')} Reset`,
  },
  readme: {
    color: '#455a64',
    text: ` ${key('↑↓')} Scroll  ${key('PgUp/PgDn')} Page  ${key('Home/End')} Jump`,
  },
  help: {
    color: '#607d8b',
    text: ` ${key('↑↓')} Scroll  ${key('Q')} Quit`,
  },
  install: {
    color: '#1a237e',
    text: ` ${key('↑↓')} Navigate  ${key('Enter')} Select  ${key('Esc')} Back`,
  },
};
