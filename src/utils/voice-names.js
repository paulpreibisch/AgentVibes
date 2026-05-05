/**
 * AgentVibes — Shared voice name utilities.
 *
 * Extracted from voices-tab.js so the MCP server and console both use the
 * same uniquifyVoiceName / SURNAME_POOL logic without duplication.
 */

import fs from 'node:fs';
import path from 'node:path';

/** @type {string[]} */
export const SURNAME_POOL = [
  'Bell', 'Carter', 'Davis', 'Ellis', 'Foster', 'Gray', 'Hayes', 'Irving',
  'Jones', 'Knox', 'Lane', 'Mason', 'Nash', 'Owens', 'Pierce', 'Quinn',
];

/**
 * Convert a raw catalog speaker name like "Anna" or "Anna-2" into a unique
 * friendly display name by appending a deterministic surname.
 *   "Anna"        → "Anna Bell"
 *   "Anna-2"      → "Anna Carter"
 *   "Anna-16"     → "Anna Quinn"
 *   "Cori Samuel" → "Cori Samuel"   (already full name — left alone)
 *
 * @param {string} rawName
 * @returns {string}
 */
export function uniquifyVoiceName(rawName) {
  if (!rawName) return rawName;
  const m = rawName.match(/^(.+)-(\d+)$/);
  if (m) {
    const base = m[1];
    const n    = parseInt(m[2], 10);
    if (n >= 2) {
      const idx = (n - 1) % SURNAME_POOL.length;
      return `${base} ${SURNAME_POOL[idx]}`;
    }
  }
  if (/\s/.test(rawName)) return rawName;
  return `${rawName} ${SURNAME_POOL[0]}`;
}

/**
 * Build a map of display-name → voiceId from voice-assignments.json.
 * Keys are lowercased for case-insensitive lookup.
 *
 * @param {string} voiceAssignmentsPath  Absolute path to voice-assignments.json
 * @returns {Map<string, {voiceId: string, model: string, speakerName: string, speakerId: number, displayName: string, gender: string}>}
 */
export function buildLibriTTSDisplayNameMap(voiceAssignmentsPath) {
  const map = new Map();
  try {
    if (!fs.existsSync(voiceAssignmentsPath)) return map;
    const data = JSON.parse(fs.readFileSync(voiceAssignmentsPath, 'utf8'));
    const speakers = data.libritts_speakers ?? {};
    for (const [idStr, entry] of Object.entries(speakers)) {
      const speakerId  = Number(idStr);
      const rawName    = entry.voice_name ?? '';
      const speakerName = rawName;
      // The catalog stores raw names like "Anna", "Anna-2", "Cori Samuel"
      // uniquifyVoiceName converts them to display names "Anna Bell", "Anna Carter", etc.
      const displayName = uniquifyVoiceName(rawName);
      const voiceId    = `en_US-libritts-high::${speakerName}`;
      const info = { voiceId, model: 'en_US-libritts-high', speakerName, speakerId, displayName, gender: entry.gender ?? '' };
      map.set(displayName.toLowerCase(), info);
      // Also index by raw speaker name and by speakerName alone
      map.set(rawName.toLowerCase(), info);
      map.set(speakerName.toLowerCase(), info);
    }
  } catch { /* ignore */ }
  return map;
}

/**
 * Resolve a voice input string to a concrete voiceId.
 *
 * Accepts any of:
 *   - Display name:       "Bella Bell"
 *   - Raw catalog name:   "Bella-2", "Bella"
 *   - LibriTTS 16S name:  "Kristin_Hughes"
 *   - VoiceId (MS_SEP):   "en_US-libritts-high::Bella"
 *   - Plain piper ID:     "en_US-amy-medium"
 *
 * @param {string} input
 * @param {string} voiceAssignmentsPath  Absolute path to voice-assignments.json
 * @returns {{ voiceId: string, model: string, speakerName: string|null, speakerId: number|null, displayName: string }|null}
 *   Returns null if input cannot be resolved.
 */
export function resolveVoice(input, voiceAssignmentsPath) {
  if (!input) return null;
  const MS_SEP = '::';

  // Already a full voiceId with MS_SEP
  if (input.includes(MS_SEP)) {
    const [model, speakerName] = input.split(MS_SEP);
    // Verify model looks valid (no shell chars)
    if (!/^[a-zA-Z0-9_-]+$/.test(model)) return null;
    const catalog = buildLibriTTSDisplayNameMap(voiceAssignmentsPath);
    const entry = catalog.get(speakerName.toLowerCase());
    return {
      voiceId: input,
      model,
      speakerName,
      speakerId: entry?.speakerId ?? null,
      displayName: entry?.displayName ?? speakerName,
    };
  }

  // Plain piper model ID (no spaces, no special chars)
  if (/^en_[A-Z]{2}-[a-zA-Z0-9_]+-[a-z]+$/.test(input)) {
    return { voiceId: input, model: input, speakerName: null, speakerId: null, displayName: input };
  }

  // Try display name / catalog name lookup against LibriTTS catalog
  const catalog = buildLibriTTSDisplayNameMap(voiceAssignmentsPath);
  // Normalise underscores to spaces for 16Speakers names ("Kristin_Hughes" → "Kristin Hughes")
  const normalised = input.replace(/_/g, ' ');
  const entry = catalog.get(normalised.toLowerCase()) ?? catalog.get(input.toLowerCase());
  if (entry) return entry;

  // Nothing matched — return null
  return null;
}
