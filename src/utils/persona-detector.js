/**
 * File: src/utils/persona-detector.js
 *
 * AgentVibes - Persona Detection for BMad Agents
 * Automatically reads IDENTITY.md and maps persona to voice characteristics
 *
 * @fileoverview Zero-config persona detection for BMad workspaces
 * @context Reads IDENTITY.md from workspace and infers voice settings
 * @architecture Markdown parser → vibe matcher → voice mapper → fallback defaults
 * @dependencies fs/promises, path
 * @entrypoints Called by TTS pipeline before voice selection
 * @patterns Template parsing, keyword matching, graceful degradation
 * @related personality-manager.sh, bmad-detector.js, voice-manager.sh
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Parse IDENTITY.md frontmatter and content
 * @param {string} content - Raw IDENTITY.md content
 * @returns {Object} Parsed persona data
 */
function parseIdentity(content) {
  const lines = content.split('\n');
  const persona = {
    name: null,
    creature: null,
    vibe: null,
    emoji: null,
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse bullet list format: - **Name:** Value
    // Pattern: dash, spaces, **, key (non-**), colon, **, space, value
    // Note: The colon is INSIDE the ** markers, not outside: **Name:** not **Name**:
    const bulletMatch = trimmed.match(/^-\s*\*\*([^*]+):\*\*\s*(.*)$/i);
    if (bulletMatch) {
      const [, key, value] = bulletMatch;
      const normalizedKey = key.trim().toLowerCase();
      const trimmedValue = value.trim();

      // Skip empty values
      if (!trimmedValue) continue;

      if (normalizedKey === 'name') persona.name = trimmedValue;
      else if (normalizedKey === 'creature') persona.creature = trimmedValue;
      else if (normalizedKey === 'vibe') persona.vibe = trimmedValue;
      else if (normalizedKey === 'emoji') persona.emoji = trimmedValue;
    }
  }

  return persona;
}

/**
 * Map vibe keywords to voice characteristics
 * @param {string} vibe - Vibe description from IDENTITY.md
 * @returns {Object} Voice characteristics
 */
function mapVibeToVoice(vibe) {
  if (!vibe) {
    return { voice: 'en_US-amy-medium', speed: 1.0, personality: 'normal' };
  }

  const vibeLower = vibe.toLowerCase();

  // Mapping table: keywords → voice settings
  const mappings = [
    // Professional / Formal
    { keywords: ['professional', 'formal', 'business'], voice: 'en_US-lessac-medium', personality: 'professional' },

    // Warm / Friendly
    { keywords: ['warm', 'friendly', 'helpful', 'caring'], voice: 'en_US-amy-medium', personality: 'normal' },

    // Energetic / Enthusiastic
    { keywords: ['energetic', 'enthusiastic', 'upbeat', 'lively'], voice: 'en_US-ryan-high', speed: 1.1, personality: 'funny' },

    // Calm / Zen
    { keywords: ['calm', 'zen', 'peaceful', 'serene'], voice: 'en_US-kimberly-low', speed: 0.9, personality: 'zen' },

    // Witty / Sarcastic
    { keywords: ['witty', 'sarcastic', 'dry', 'clever'], voice: 'en_US-ryan-medium', personality: 'sarcastic' },

    // Direct / Concise
    { keywords: ['direct', 'concise', 'brief', 'efficient'], voice: 'en_US-lessac-medium', speed: 1.05, personality: 'normal' },

    // Dramatic / Theatrical
    { keywords: ['dramatic', 'theatrical', 'expressive'], voice: 'en_US-ljspeech-high', speed: 0.95, personality: 'dramatic' },

    // Technical / Robot
    { keywords: ['technical', 'robot', 'robotic', 'mechanical'], voice: 'en_US-libritts-high', speed: 1.0, personality: 'robot' },
  ];

  // Find first matching mapping
  for (const mapping of mappings) {
    if (mapping.keywords.some((keyword) => vibeLower.includes(keyword))) {
      return {
        voice: mapping.voice,
        speed: mapping.speed || 1.0,
        personality: mapping.personality || 'normal',
      };
    }
  }

  // Default fallback
  return { voice: 'en_US-amy-medium', speed: 1.0, personality: 'normal' };
}

/**
 * Detect persona from workspace IDENTITY.md
 * @param {string} workspaceDir - Path to workspace root
 * @returns {Promise<Object>} Detected persona with voice settings
 */
export async function detectPersona(workspaceDir) {
  const identityPath = path.join(workspaceDir, 'IDENTITY.md');

  try {
    const content = await fs.readFile(identityPath, 'utf8');
    const persona = parseIdentity(content);

    // Map vibe to voice characteristics
    const voiceSettings = mapVibeToVoice(persona.vibe);

    return {
      detected: true,
      name: persona.name || 'Assistant',
      creature: persona.creature || 'AI Assistant',
      vibe: persona.vibe || 'Helpful',
      emoji: persona.emoji || '🤖',
      voice: voiceSettings.voice,
      speed: voiceSettings.speed,
      personality: voiceSettings.personality,
      source: identityPath,
    };
  } catch (error) {
    // IDENTITY.md not found or unreadable - return defaults
    return {
      detected: false,
      name: 'Assistant',
      creature: 'AI Assistant',
      vibe: 'Helpful',
      emoji: '🤖',
      voice: 'en_US-amy-medium',
      speed: 1.0,
      personality: 'normal',
      source: null,
    };
  }
}

/**
 * Get voice command string for detected persona
 * @param {Object} persona - Result from detectPersona()
 * @returns {string} Voice setting for TTS
 */
export function getPersonaVoice(persona) {
  return persona.voice || 'en_US-amy-medium';
}

/**
 * Get speed setting for detected persona
 * @param {Object} persona - Result from detectPersona()
 * @returns {number} Speed multiplier (0.5 - 2.0)
 */
export function getPersonaSpeed(persona) {
  return persona.speed || 1.0;
}
