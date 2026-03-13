/**
 * AgentVibes Agent Voice Store
 * Epic 11: Stories 11.1, 11.3, 11.5
 *
 * Manages global BMAD agent voice/audio profile assignments at ~/.agentvibes/bmad-voice-map.json.
 * All path operations use path.resolve() to prevent traversal.
 *
 * Store format:
 * {
 *   "partyMode": true,
 *   "voiceMap": { "architect": "en_GB-alan-medium" },   // legacy compat
 *   "agents": {
 *     "architect": {
 *       "voice": "en_GB-alan-medium",
 *       "pretext": "Winston, Architect here.",
 *       "reverbPreset": "cathedral",
 *       "personality": "normal",
 *       "backgroundMusic": { "track": "soft_piano.mp3", "volume": 30, "enabled": true }
 *     }
 *   }
 * }
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Single-voice provider detection (story 11.3)

const SINGLE_VOICE_PROVIDERS = Object.freeze(new Set(['soprano']));

/**
 * Returns true if the given provider only has one voice.
 * @param {string} provider
 * @returns {boolean}
 */
export function isSingleVoiceProvider(provider) {
  return SINGLE_VOICE_PROVIDERS.has(provider?.toLowerCase());
}

// ---------------------------------------------------------------------------
// BMAD agent manifest parser

/**
 * Parse the BMAD agent-manifest.csv to get rich agent metadata.
 * Returns agents filtered to core and bmm modules only.
 *
 * @param {string} projectRoot
 * @returns {{ id: string, displayName: string, title: string, icon: string, module: string }[]}
 */
export function parseBmadManifest(projectRoot) {
  const safeRoot = path.resolve(projectRoot ?? process.cwd());
  const manifestPath = path.resolve(safeRoot, '_bmad', '_config', 'agent-manifest.csv');

  if (!fs.existsSync(manifestPath)) return [];

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Parse CSV header
    const headers = _parseCSVLine(lines[0]);
    const nameIdx = headers.indexOf('name');
    const displayIdx = headers.indexOf('displayName');
    const titleIdx = headers.indexOf('title');
    const iconIdx = headers.indexOf('icon');
    const moduleIdx = headers.indexOf('module');

    if (nameIdx < 0) return [];

    const agents = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = _parseCSVLine(lines[i]);
      const module = cols[moduleIdx] ?? '';

      // Filter to core and bmm modules only
      if (module !== 'core' && module !== 'bmm') continue;

      agents.push({
        id: cols[nameIdx] ?? '',
        displayName: cols[displayIdx] ?? cols[nameIdx] ?? '',
        title: cols[titleIdx] ?? '',
        icon: cols[iconIdx] ?? '',
        module,
      });
    }

    return agents.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

/**
 * Simple CSV line parser that handles quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function _parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ---------------------------------------------------------------------------
// BMAD agent scanner (story 11.5) — fallback when manifest is unavailable

/**
 * Scan for BMAD agents in the project root.
 * Prefers manifest-based discovery; falls back to directory scan.
 *
 * @param {string} projectRoot
 * @returns {{ id: string, displayName: string, title: string, icon: string, module: string }[]}
 */
export function scanBmadAgents(projectRoot) {
  // Try manifest first
  const fromManifest = parseBmadManifest(projectRoot);
  if (fromManifest.length > 0) return fromManifest;

  // Fallback: directory scan
  const safeRoot = path.resolve(projectRoot ?? process.cwd());
  const candidateDirs = [
    path.resolve(safeRoot, '_bmad', 'bmm', 'agents'),
    path.resolve(safeRoot, '.bmad', 'agents'),
  ];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      return files
        .filter(f => f.endsWith('.md') && !f.includes('.backup') && !f.includes('.bak'))
        .map(f => {
          const id = f.replace(/\.md$/, '');
          const displayName = id
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          return { id, displayName, title: '', icon: '', module: 'bmm' };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
    } catch {
      // Directory not readable — skip
    }
  }
  return [];
}

/**
 * Detect whether BMAD is installed in the project.
 * @param {string} projectRoot
 * @returns {boolean}
 */
export function isBmadDetected(projectRoot) {
  const safeRoot = path.resolve(projectRoot ?? process.cwd());
  const manifestPath = path.resolve(safeRoot, '_bmad', '_config', 'agent-manifest.csv');
  if (fs.existsSync(manifestPath)) return true;

  // Fallback checks
  const dirs = [
    path.resolve(safeRoot, '_bmad', 'bmm', 'agents'),
    path.resolve(safeRoot, '.bmad', 'agents'),
  ];
  return dirs.some(d => fs.existsSync(d));
}

// ---------------------------------------------------------------------------
// AgentVoiceStore class

export class AgentVoiceStore {
  /**
   * @param {object} [opts]
   * @param {string} [opts.homeDir] - User home dir. Defaults to os.homedir().
   */
  constructor(opts = {}) {
    this._homeDir = path.resolve(opts.homeDir ?? os.homedir());
    this._filePath = path.resolve(this._homeDir, '.agentvibes', 'bmad-voice-map.json');
  }

  /**
   * Read the full store.
   * @returns {{ voiceMap: object, partyMode: boolean, agents: object }}
   */
  _readStore() {
    if (!fs.existsSync(this._filePath)) {
      return { voiceMap: {}, partyMode: false, agents: {} };
    }
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      const data = JSON.parse(raw);
      return {
        voiceMap:  data.voiceMap  ?? {},
        partyMode: data.partyMode ?? false,
        agents:    data.agents    ?? {},
      };
    } catch {
      return { voiceMap: {}, partyMode: false, agents: {} };
    }
  }

  /**
   * Atomically write store data.
   * @param {{ voiceMap: object, partyMode: boolean, agents: object }} data
   */
  _writeStore(data) {
    const dir = path.dirname(this._filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${this._filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmpPath, this._filePath);
    fs.chmodSync(this._filePath, 0o600);
  }

  /**
   * Get the agent → voice ID map (legacy compat).
   * Merges voiceMap with agents[id].voice for backward compat.
   * @returns {object}
   */
  getVoiceMap() {
    const store = this._readStore();
    const merged = { ...store.voiceMap };
    for (const [id, profile] of Object.entries(store.agents)) {
      if (profile.voice && !merged[id]) merged[id] = profile.voice;
    }
    return merged;
  }

  /**
   * Assign a voice to an agent (legacy compat — also updates agent profile).
   * @param {string} agentId
   * @param {string} voiceId
   */
  setVoice(agentId, voiceId) {
    const store = this._readStore();
    store.voiceMap[agentId] = voiceId;
    if (!store.agents[agentId]) store.agents[agentId] = {};
    store.agents[agentId].voice = voiceId;
    this._writeStore(store);
  }

  /**
   * Remove an agent's voice assignment (reset to default).
   * @param {string} agentId
   */
  resetVoice(agentId) {
    const store = this._readStore();
    delete store.voiceMap[agentId];
    if (store.agents[agentId]) delete store.agents[agentId].voice;
    this._writeStore(store);
  }

  /**
   * Get party mode state.
   * @returns {boolean}
   */
  getPartyMode() {
    return this._readStore().partyMode;
  }

  /**
   * Set party mode state.
   * @param {boolean} enabled
   */
  setPartyMode(enabled) {
    const store = this._readStore();
    store.partyMode = Boolean(enabled);
    this._writeStore(store);
  }

  // -------------------------------------------------------------------------
  // Per-agent profile API

  /**
   * Get the full profile for an agent. Missing fields are undefined (caller merges with global).
   * @param {string} agentId
   * @returns {{ voice?: string, pretext?: string, reverbPreset?: string, personality?: string, backgroundMusic?: object }}
   */
  getAgentProfile(agentId) {
    const store = this._readStore();
    const profile = store.agents[agentId] ?? {};
    // Compat: if voice is only in voiceMap, include it
    if (!profile.voice && store.voiceMap[agentId]) {
      profile.voice = store.voiceMap[agentId];
    }
    return { ...profile };
  }

  /**
   * Set (merge) profile fields for an agent. Only provided fields are updated.
   * @param {string} agentId
   * @param {{ voice?: string, pretext?: string, reverbPreset?: string, personality?: string, backgroundMusic?: object }} partial
   */
  setAgentProfile(agentId, partial) {
    const store = this._readStore();
    if (!store.agents[agentId]) store.agents[agentId] = {};
    Object.assign(store.agents[agentId], partial);
    // Keep voiceMap in sync
    if (partial.voice) store.voiceMap[agentId] = partial.voice;
    this._writeStore(store);
  }

  /**
   * Reset all profile settings for an agent.
   * @param {string} agentId
   */
  resetAgentProfile(agentId) {
    const store = this._readStore();
    delete store.agents[agentId];
    delete store.voiceMap[agentId];
    this._writeStore(store);
  }

  /**
   * Generate a default pretext for an agent.
   * @param {string} displayName - e.g. "Winston"
   * @param {string} title       - e.g. "Architect"
   * @returns {string}
   */
  static getDefaultPretext(displayName, title) {
    if (!displayName) return '';
    if (!title) return `${displayName} here.`;
    return `${displayName}, ${title} here.`;
  }
}

export default AgentVoiceStore;
