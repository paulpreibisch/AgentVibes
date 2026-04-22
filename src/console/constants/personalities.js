/**
 * AgentVibes — Canonical personality constants.
 *
 * Single source of truth for personality names and their associated emoji
 * glyphs.  All TUI modules (settings-tab, agents-tab, personality-picker …)
 * import from here; src/installer.js maintains its own copy because it
 * predates the TUI and uses a different module-load path.
 *
 * Exported:
 *   PERSONALITY_EMOJIS  — Map of personality name → emoji string
 *   PERSONALITIES       — Ordered array of personality names (canonical order
 *                         used for picker lists)
 */

export const PERSONALITY_EMOJIS = Object.freeze({
  angry:        '😠',
  annoying:     '😤',
  crass:        '🤬',
  dramatic:     '🎭',
  'dry-humor':  '😐',
  flirty:       '😘',
  funny:        '😂',
  grandpa:      '👴',
  millennial:   '🙄',
  moody:        '😒',
  none:         '😊',
  normal:       '😊',
  pirate:       '⚓',
  poetic:       '📜',
  professional: '👔',
  rapper:       '🎤',
  robot:        '🤖',
  sarcastic:    '😏',
  sassy:        '💁',
  'surfer-dude':'🏄',
  zen:          '🧘',
});

export const PERSONALITIES = Object.freeze([
  'none', 'angry', 'annoying', 'crass', 'dramatic', 'dry-humor',
  'flirty', 'funny', 'grandpa', 'millennial', 'moody', 'normal',
  'pirate', 'poetic', 'professional', 'rapper', 'robot', 'sarcastic',
  'sassy', 'surfer-dude', 'zen',
]);
