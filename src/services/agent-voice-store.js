/**
 * AgentVibes Agent Voice Store
 * Epic 11: Stories 11.1, 11.3, 11.5
 *
 * Manages global BMAD agent voice assignments at ~/.agentvibes/bmad-voice-map.json.
 * All path operations use path.resolve() to prevent traversal.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Single-voice provider detection (story 11.3)

/**
 * Known providers that only have one voice (limits party mode usefulness).
 */
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
// BMAD agent scanner (story 11.5)

/**
 * Scan for BMAD agents in the project root.
 * Looks in `_bmad/bmm/agents/` then `.bmad/agents/`.
 *
 * @param {string} projectRoot
 * @returns {{ id: string, displayName: string }[]}
 */
export function scanBmadAgents(projectRoot) {
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
          return { id, displayName };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
    } catch {
      // Directory not readable — skip
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// AgentVoiceStore class (story 11.1)

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
   * Read the full voice map.
   * @returns {{ voiceMap: object, partyMode: boolean }}
   */
  _readStore() {
    if (!fs.existsSync(this._filePath)) {
      return { voiceMap: {}, partyMode: false };
    }
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      const data = JSON.parse(raw);
      return {
        voiceMap:  data.voiceMap  ?? {},
        partyMode: data.partyMode ?? false,
      };
    } catch {
      return { voiceMap: {}, partyMode: false };
    }
  }

  /**
   * Atomically write store data.
   * @param {{ voiceMap: object, partyMode: boolean }} data
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
   * Get the agent → voice ID map.
   * @returns {object}
   */
  getVoiceMap() {
    return this._readStore().voiceMap;
  }

  /**
   * Assign a voice to an agent.
   * @param {string} agentId
   * @param {string} voiceId
   */
  setVoice(agentId, voiceId) {
    const store = this._readStore();
    store.voiceMap[agentId] = voiceId;
    this._writeStore(store);
  }

  /**
   * Remove an agent's voice assignment (reset to default).
   * @param {string} agentId
   */
  resetVoice(agentId) {
    const store = this._readStore();
    delete store.voiceMap[agentId];
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
}

export default AgentVoiceStore;
