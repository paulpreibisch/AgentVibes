/**
 * AgentVibes Provider Service
 * Story 7.1: Provider & Voice Settings Group
 *
 * Detects installed TTS providers, reads/writes active provider and voice
 * through ConfigService. Gracefully degrades when detection fails.
 */

import { execFileSync } from 'node:child_process';

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
   * Sets the active TTS provider in config.
   * @param {string} provider
   */
  setActiveProvider(provider) {
    this._config.set('provider', provider);
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
   * Defaults to 'en_US-amy-medium' if not configured.
   * @returns {string}
   */
  getActiveVoiceId() {
    return this._config.getConfig().voice ?? 'en_US-amy-medium';
  }

  /**
   * Sets the active voice ID in config.
   * @param {string} voiceId
   */
  setActiveVoice(voiceId) {
    this._config.set('voice', voiceId);
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
