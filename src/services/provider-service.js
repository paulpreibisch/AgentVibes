/**
 * AgentVibes Provider Service
 * Story 7.1: Provider & Voice Settings Group
 *
 * Detects installed TTS providers, reads/writes active provider and voice
 * through ConfigService. Gracefully degrades when detection fails.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export class ProviderService {
  /**
   * @param {import('./config-service.js').ConfigService} configService
   */
  constructor(configService) {
    this._config = configService;
    this._installedProviders = null; // cached after first detection
  }

  // ---------------------------------------------------------------------------
  // Provider

  /**
   * Returns the currently active TTS provider from config.
   * Defaults to 'piper' if not configured.
   * @returns {string}
   */
  getActiveProvider() {
    return this._config.getConfig().provider ?? 'piper';
  }

  /**
   * Sets the active TTS provider in config AND syncs to .claude/tts-provider.txt
   * so the shell hooks (play-tts.sh → provider-manager.sh) pick up the change.
   * @param {string} provider
   */
  setActiveProvider(provider) {
    this._config.set('provider', provider);
    this._config.setGlobal('provider', provider);
    this._syncProviderFile(provider);
  }

  /**
   * Write provider to .claude/tts-provider.txt so shell hooks stay in sync.
   * Writes to projectRoot/.claude/tts-provider.txt if .claude/ exists there,
   * otherwise falls back to ~/.claude/tts-provider.txt.
   * @param {string} provider
   */
  _syncProviderFile(provider) {
    try {
      const projectClaudeDir = path.resolve(this._config.getProjectRoot(), '.claude');
      const targetDir = fs.existsSync(projectClaudeDir)
        ? projectClaudeDir
        : path.resolve(os.homedir(), '.claude');
      const targetFile = path.resolve(targetDir, 'tts-provider.txt');
      // Verify resolved path stays within targetDir (path traversal guard)
      if (!targetFile.startsWith(targetDir + path.sep) && targetFile !== targetDir) return;
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(targetFile, provider, 'utf8');
    } catch {
      // Non-fatal — config.json is the authoritative source
    }
  }

  /**
   * Returns an array of installed/available TTS providers.
   * Detection uses `which` binary check. Always returns at least ['piper']
   * as graceful degradation (piper is the primary supported provider).
   * @returns {string[]}
   */
  getInstalledProviders() {
    if (this._installedProviders) return this._installedProviders;

    const providers = [];

    if (this._isAvailable('piper')) providers.push('piper');
    if (this._isAvailable('soprano')) providers.push('soprano');

    // macOS Say (darwin only)
    if (process.platform === 'darwin' && this._isAvailable('say')) {
      providers.push('macos');
    }

    // Graceful degradation: always return at least piper
    if (providers.length === 0) providers.push('piper');

    this._installedProviders = providers;
    return providers;
  }

  // ---------------------------------------------------------------------------
  // Voice

  /**
   * Returns the currently active voice ID from config.
   * Falls back to first installed voice if not configured.
   * @returns {string|null}
   */
  getActiveVoiceId() {
    const voice = this._config.getConfig().voice;
    if (voice) return voice;
    // Detect first installed voice instead of hardcoding a default that may not exist
    const voicesDir = path.join(os.homedir(), '.claude', 'piper-voices');
    try {
      const models = fs.readdirSync(voicesDir).filter(f => f.endsWith('.onnx'));
      if (models.length > 0) return models[0].replace(/\.onnx$/, '');
    } catch { /* dir may not exist */ }
    return null;
  }

  /**
   * Sets the active voice ID in config.
   * Writes to both project (if exists) and global config for portability.
   * @param {string} voiceId
   */
  setActiveVoice(voiceId) {
    this._config.set('voice', voiceId);
    this._config.setGlobal('voice', voiceId);
  }

  // ---------------------------------------------------------------------------
  // Private

  /**
   * Check if a binary is available in PATH using `which`.
   * Binary names are all hardcoded (not user input) — safe from injection.
   * @param {string} binary - hardcoded binary name ('piper', 'soprano', 'say')
   * @returns {boolean}
   */
  _isAvailable(binary) {
    try {
      execFileSync('which', [binary], { stdio: 'ignore', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

export default ProviderService;
