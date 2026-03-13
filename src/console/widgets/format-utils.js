/**
 * AgentVibes TUI — Shared Format Utilities
 *
 * Pure formatting functions extracted from settings-tab.js to avoid
 * circular imports between widgets and tabs.
 */

const TRACK_NAMES = Object.freeze({
  'agentvibes_soft_flamenco_loop.mp3':                 '🎻 Soft Flamenco',
  'agent_vibes_bachata_v1_loop.mp3':                   '🎺 Bachata',
  'agent_vibes_salsa_v2_loop.mp3':                     '💃 Salsa',
  'agent_vibes_cumbia_v1_loop.mp3':                    '🎸 Cumbia',
  'agent_vibes_bossa_nova_v2_loop.mp3':                '🌸 Bossa Nova',
  'agent_vibes_japanese_city_pop_v1_loop.mp3':         '🌆 Japanese City Pop',
  'agent_vibes_chillwave_v2_loop.mp3':                 '🌊 Chillwave',
  'agent_vibes_dark_chill_step_loop.mp3':              '🌙 Dark Chill Step',
  'agent_vibes_goa_trance_v2_loop.mp3':                '🌀 Goa Trance',
  'agent_vibes_harpsichord_v2_loop.mp3':               '🎼 Harpsichord',
  'agent_vibes_celtic_harp_v1_loop.mp3':               '🎻 Celtic Harp',
  'agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3': '🌺 Hawaiian Slack Key Guitar',
  'agent_vibes_arabic_v2_loop.mp3':                    '🎵 Arabic Oud',
  'agent_vibes_ganawa_ambient_v2_loop.mp3':            '🪘 Gnawa Ambient',
  'agent_vibes_tabla_dream_pop_v1_loop.mp3':           '🥁 Tabla Dream Pop',
});

/**
 * @param {string} track - filename (e.g. 'agentvibes_soft_flamenco_loop.mp3')
 * @returns {string}
 */
export function formatTrackName(track) {
  if (!track) return 'None';
  if (TRACK_NAMES[track]) return TRACK_NAMES[track];
  return track
    .replace(/\.[^.]+$/, '')
    .replace(/^agentvibes_|^agent_vibes_/, '')
    .replace(/_v\d+_loop$|_loop$|_v\d+$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * @param {string} preset - 'off' | 'light' | 'medium' | 'heavy' | 'cathedral'
 * @returns {string}
 */
export function formatReverbState(preset) {
  const LABELS = { off: 'Off', light: 'Light (Small room)', medium: 'Medium (Conference room)', heavy: 'Heavy (Large hall)', cathedral: 'Cathedral (Epic space)' };
  return LABELS[preset] ?? LABELS.light;
}
