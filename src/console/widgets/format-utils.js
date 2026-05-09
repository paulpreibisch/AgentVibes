/**
 * AgentVibes TUI — Shared Format Utilities
 *
 * Pure formatting functions extracted from settings-tab.js to avoid
 * circular imports between widgets and tabs.
 */

import { uniquifyVoiceName } from '../../utils/voice-names.js';

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
  'Late Night Hip Hop Groove.mp3':                     '🎤 Late Night Hip Hop Groove',
  'Drifting Down the Hall.mp3':                        '🌃 Drifting Down the Hall',
  'Midnight Charleston Stomp.mp3':                     '🎩 Midnight Charleston Stomp',
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
 * Beautify a raw voice identifier for display in narrow table columns.
 *
 * Examples:
 *   16Speakers::Rose_Ibex       → Rose Ibex
 *   16Speakers::Emily_Cripps    → Emily Cripps
 *   en_US-kusal-medium          → Kusal
 *   en_US-lessac-high           → Lessac
 *   en_US-libritts_r-medium     → Libritts R
 *   kristin                     → Kristin
 *
 * @param {string} voice - raw voice identifier
 * @returns {string}
 */
export function formatVoiceName(voice) {
  if (!voice) return '(global)';

  let name;
  if (voice.includes('::')) {
    const speakerPart = voice.split('::')[1];
    if (speakerPart.includes('_')) {
      // 16Speakers format (Rose_Ibex) — already a complete name, just normalise display
      name = speakerPart.replace(/_/g, ' ');
    } else {
      // LibriTTS / single-word names: append deterministic surname
      // "Mary" → "Mary Bell", "Mary-7" → "Mary Hayes"
      name = uniquifyVoiceName(speakerPart);
    }
  } else {
    const parts = voice.split('-');
    const QUALITIES = new Set(['high', 'medium', 'low']);
    if (parts.length >= 2 && /^[a-z]{2}_[A-Z]{2}$/.test(parts[0])) {
      // Strip locale prefix and quality suffix
      name = parts.slice(1).filter(p => !QUALITIES.has(p)).join(' ');
    } else {
      name = voice;
    }
  }

  // Replace underscores with spaces, title-case each word
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || '(global)';
}

/**
 * @param {string} preset - 'off' | 'light' | 'medium' | 'heavy' | 'cathedral'
 * @returns {string}
 */
export function formatReverbState(preset) {
  const LABELS = { off: 'Off', light: 'Light (Small room)', medium: 'Medium (Conference room)', heavy: 'Heavy (Large hall)', cathedral: 'Cathedral (Epic space)' };
  return LABELS[preset] ?? LABELS.light;
}
