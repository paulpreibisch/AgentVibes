/**
 * AgentVibes Config Service
 * Story 6.5: Command Routing & Entry Points (isInstalled, isBmadDetected stubs)
 * Story 7.1: Provider & Voice Settings Group (full read/write implementation)
 *
 * Provides config hierarchy: global (~/.agentvibes/config.json)
 * + project-level overrides (<projectRoot>/.agentvibes/config.json).
 * All path operations use path.resolve() to prevent traversal.
 * Config writes are atomic (write .tmp → rename) with chmod 600.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export class ConfigService {
  /**
   * @param {object} [opts]
   * @param {string} [opts.projectRoot] - Project root for hook/config detection. Defaults to process.cwd().
   * @param {string} [opts.homeDir]     - User home dir for global config. Defaults to os.homedir().
   */
  constructor(opts = {}) {
    // path.resolve() on all roots prevents path-traversal at the source
    this._projectRoot = path.resolve(opts.projectRoot ?? process.cwd());
    this._homeDir = path.resolve(opts.homeDir ?? os.homedir());
  }

  /** Returns the resolved project root path. */
  getProjectRoot() {
    return this._projectRoot;
  }

  // ---------------------------------------------------------------------------
  // Detection (story 6.5)

  /**
   * Returns true if AgentVibes hooks are installed in this project.
   * Detection: .claude/hooks/play-tts.sh exists in projectRoot.
   */
  isInstalled() {
    const hooksFile = path.resolve(this._projectRoot, '.claude', 'hooks', 'play-tts.sh');
    return fs.existsSync(hooksFile);
  }

  /**
   * Returns true if BMAD framework is detected.
   * Checks: _bmad/ or .bmad/ in projectRoot, OR global voice map.
   */
  isBmadDetected() {
    const checks = [
      path.resolve(this._projectRoot, '_bmad'),
      path.resolve(this._projectRoot, '.bmad'),
      path.resolve(this._homeDir, '.agentvibes', 'bmad-voice-map.json'),
    ];
    return checks.some(p => fs.existsSync(p));
  }

  // ---------------------------------------------------------------------------
  // Read (story 7.1)

  /**
   * Returns global config (~/.agentvibes/config.json).
   * Returns {} if file does not exist.
   */
  getGlobalConfig() {
    const filePath = path.resolve(this._homeDir, '.agentvibes', 'config.json');
    return this._readConfigFile(filePath) ?? {};
  }

  /**
   * Returns project config (<projectRoot>/.agentvibes/config.json) or null if not present.
   */
  getProjectConfig() {
    const dir = path.resolve(this._projectRoot, '.agentvibes');
    if (!fs.existsSync(dir)) return null;
    const filePath = path.resolve(dir, 'config.json');
    return this._readConfigFile(filePath);
  }

  /**
   * Returns merged config: global + project overrides.
   * Project config keys win on conflict (deep merge for nested objects).
   */
  getConfig() {
    const global = this.getGlobalConfig();
    const project = this.getProjectConfig();
    return this._deepMerge(global, project);
  }

  /**
   * Returns config schema version from merged config.
   */
  getVersion() {
    return this.getConfig().version ?? '1.0';
  }

  // ---------------------------------------------------------------------------
  // Write (story 7.1)

  /**
   * Writes a key to project config if <projectRoot>/.agentvibes/ exists,
   * otherwise writes to global config. Atomic write (tmp → rename). chmod 600.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    const projDir = path.resolve(this._projectRoot, '.agentvibes');
    if (fs.existsSync(projDir)) {
      const filePath = path.resolve(projDir, 'config.json');
      const current = this._readConfigFile(filePath) ?? {};
      current[key] = value;
      this._writeConfigAtomic(filePath, current);
    } else {
      this.setGlobal(key, value);
    }
  }

  /**
   * Always writes a key to global config (~/.agentvibes/config.json).
   * Atomic write (tmp → rename). chmod 600. Creates dir if needed.
   * @param {string} key
   * @param {*} value
   */
  setGlobal(key, value) {
    const filePath = path.resolve(this._homeDir, '.agentvibes', 'config.json');
    const current = this._readConfigFile(filePath) ?? {};
    current[key] = value;
    this._writeConfigAtomic(filePath, current);
  }

  // ---------------------------------------------------------------------------
  // Private helpers

  /**
   * Read and parse a JSON config file.
   * Returns null if the file does not exist or is not a regular file.
   * @param {string} filePath
   * @returns {object|null}
   */
  _readConfigFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      // Corrupt or unreadable — treat as missing
      return null;
    }
  }

  /**
   * Deep-merge two plain objects. Values from `override` win on conflict.
   * Arrays are replaced (not merged). null override → returns copy of base.
   * @param {object} base
   * @param {object|null} override
   * @returns {object}
   */
  _deepMerge(base, override) {
    if (!override || typeof override !== 'object') return { ...base };
    const result = { ...base };
    for (const [k, v] of Object.entries(override)) {
      if (
        v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        typeof result[k] === 'object' &&
        result[k] !== null &&
        !Array.isArray(result[k])
      ) {
        result[k] = this._deepMerge(result[k], v);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  /**
   * Atomically write data as JSON to filePath.
   * Writes to {filePath}.tmp then renames — safe against partial reads.
   * Creates parent directory if needed. Sets file permissions to 0o600.
   * @param {string} filePath
   * @param {object} data
   */
  _writeConfigAtomic(filePath, data) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    const tmpPath = `${filePath}.tmp`;
    const json = JSON.stringify(data, null, 2);

    // Write to tmp, then atomic rename
    fs.writeFileSync(tmpPath, json, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmpPath, filePath);

    // Ensure correct permissions on final file
    fs.chmodSync(filePath, 0o600);
  }
}

export default ConfigService;
