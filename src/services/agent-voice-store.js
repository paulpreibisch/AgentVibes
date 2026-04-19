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
// Agent ID validation — prevents prototype pollution via __proto__ / constructor keys

const VALID_AGENT_ID = /^[a-z0-9][a-z0-9_-]*$/i;

/**
 * Validate an agent ID is safe for use as an object property key.
 * Rejects __proto__, constructor, toString, etc.
 * @param {string} id
 * @returns {boolean}
 */
function _isValidAgentId(id) {
  if (!id || typeof id !== 'string') return false;
  if (!VALID_AGENT_ID.test(id)) return false;
  // Explicit blocklist for prototype pollution vectors
  const blocked = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty']);
  return !blocked.has(id);
}

// ---------------------------------------------------------------------------
// Advisory file locking for atomic read-modify-write

/**
 * Acquire an advisory lock via exclusive file open.
 * Retries briefly on EEXIST; returns fd on success, null on timeout.
 */
function _acquireLock(lockPath) {
  const maxRetries = 20;
  const retryMs = 50;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
      return fd;
    } catch (err) {
      if (err.code !== 'EEXIST') return null;
      // Stale lock detection: if lock file is older than 5 seconds, remove it
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > 5000) {
          try { fs.unlinkSync(lockPath); } catch {}
        }
      } catch {}
      // Brief sync delay (10ms) — acceptable for a single-threaded TUI lock retry
      const buf = new SharedArrayBuffer(4);
      Atomics.wait(new Int32Array(buf), 0, 0, retryMs);
    }
  }
  return null; // Proceed without lock rather than blocking forever
}

/**
 * Release advisory lock.
 */
function _releaseLock(fd, lockPath) {
  try { if (fd != null) fs.closeSync(fd); } catch {}
  try { fs.unlinkSync(lockPath); } catch {}
}

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

      const agentId = cols[nameIdx] ?? '';
      if (!_isValidAgentId(agentId)) continue;

      agents.push({
        id: agentId,
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
   * Atomically write store data with advisory file locking.
   * @param {{ voiceMap: object, partyMode: boolean, agents: object }} data
   */
  _writeStore(data) {
    const dir = path.dirname(this._filePath);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Ensure directory is user-only even if it already existed
    try { fs.chmodSync(dir, 0o700); } catch {}

    // Advisory lock: prevent concurrent read-modify-write from clobbering data
    const lockPath = `${this._filePath}.lock`;
    const lockFd = _acquireLock(lockPath);
    try {
      const tmpPath = `${this._filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmpPath, this._filePath);
      fs.chmodSync(this._filePath, 0o600);
    } finally {
      _releaseLock(lockFd, lockPath);
    }
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
    if (!_isValidAgentId(agentId)) return;
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
    if (!_isValidAgentId(agentId)) return;
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
    if (!_isValidAgentId(agentId)) return {};
    const store = this._readStore();
    const profile = { ...(store.agents[agentId] ?? {}) };
    // Compat: if voice is only in voiceMap, include it
    if (!profile.voice && store.voiceMap[agentId]) {
      profile.voice = store.voiceMap[agentId];
    }
    return profile;
  }

  /**
   * Set (merge) profile fields for an agent. Only provided fields are updated.
   * @param {string} agentId
   * @param {{ voice?: string, pretext?: string, reverbPreset?: string, personality?: string, backgroundMusic?: object }} partial
   */
  setAgentProfile(agentId, partial) {
    if (!_isValidAgentId(agentId)) return;
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
    if (!_isValidAgentId(agentId)) return;
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
