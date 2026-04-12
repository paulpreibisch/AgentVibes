/**
 * AgentVibes VerbosityService
 * Epic 10: Stories 10.1-10.4
 *
 * Centralises verbosity logic for 5 levels: minimal, low, medium, high, custom.
 *
 * Hook types:
 *   - 'prompt-submit'     — fires when user submits a prompt
 *   - 'response-complete' — fires when Claude finishes responding
 */

// ---------------------------------------------------------------------------

/**
 * Ordered verbosity levels from quietest to most verbose.
 * @type {string[]}
 */
export const VERBOSITY_LEVELS = Object.freeze(['minimal', 'low', 'medium', 'high', 'caveman', 'custom']);

// Per-level shouldSpeak configuration (fixed levels only; custom reads from config)
const LEVEL_SPEAK = Object.freeze({
  minimal: { 'prompt-submit': false, 'response-complete': true },
  low:     { 'prompt-submit': false, 'response-complete': true },
  medium:  { 'prompt-submit': true,  'response-complete': true },
  high:    { 'prompt-submit': true,  'response-complete': true },
  caveman: { 'prompt-submit': true,  'response-complete': true },
});

// Per-level static messages (null = use hook default message)
const LEVEL_MESSAGES = Object.freeze({
  minimal: {
    'prompt-submit':     null,
    'response-complete': 'Claude is ready for your input',
  },
  low: {
    'prompt-submit':     null,
    'response-complete': null,  // built dynamically: "Done. <summary>"
  },
  medium:  { 'prompt-submit': null, 'response-complete': null },
  high:    { 'prompt-submit': null, 'response-complete': null },
  caveman: { 'prompt-submit': null, 'response-complete': null },
});

// ---------------------------------------------------------------------------

export class VerbosityService {
  /**
   * @param {object} configService - AgentVibes ConfigService instance
   */
  constructor(configService) {
    this._config = configService;
    this._migrated = false;  // tracks whether migration ran in this session
  }

  /**
   * Returns the current verbosity level.
   * Defaults to 'high' if not configured or unrecognised.
   * @returns {'minimal'|'low'|'medium'|'high'|'custom'}
   */
  getLevel() {
    const cfg = this._config.getConfig();
    const level = cfg.verbosity;
    return VERBOSITY_LEVELS.includes(level) ? level : 'high';
  }

  /**
   * Returns whether TTS should speak for the given hook type.
   *
   * @param {'prompt-submit'|'response-complete'} hookType
   * @returns {boolean}
   */
  shouldSpeak(hookType) {
    const level = this.getLevel();
    if (level === 'custom') {
      return this._customShouldSpeak(hookType);
    }
    const table = LEVEL_SPEAK[level] ?? LEVEL_SPEAK.high;
    return table[hookType] ?? true;
  }

  /**
   * Returns the message for the given hook type and context.
   * Returns null to use the hook's own default message.
   *
   * @param {'prompt-submit'|'response-complete'} hookType
   * @param {object} context - { summary?: string }
   * @returns {string|null}
   */
  getMessage(hookType, context) {
    const level = this.getLevel();
    if (level === 'high' || level === 'medium' || level === 'caveman') return null;

    if (level === 'low' && hookType === 'response-complete') {
      const summary = context?.summary ?? '';
      const trimmed = summary.slice(0, 30);
      return trimmed.length > 0 ? `Done. ${trimmed}` : 'Done';
    }

    if (level === 'custom') return null;  // custom uses hook defaults

    return LEVEL_MESSAGES[level]?.[hookType] ?? null;
  }

  /**
   * Checks if migration is needed (old 'low' → 'medium').
   * If needed and not already done, performs migration and returns true.
   * @returns {boolean} true if migration was performed, false otherwise
   */
  checkMigration() {
    const cfg = this._config.getConfig();
    if (cfg.verbosityMigrated) return false;
    if (cfg.verbosity !== 'low') return false;

    // Migrate: old 'low' users get 'medium' in new system
    this._config.set('verbosity', 'medium');
    this._config.set('verbosityMigrated', true);
    this._migrated = true;
    return true;
  }

  /**
   * Returns true if a migration notice should be shown to the user.
   * @returns {boolean}
   */
  needsMigrationNotice() {
    if (!this._migrated) return false;
    const cfg = this._config.getConfig();
    return !cfg.migrationNoticeDismissed;
  }

  /**
   * Marks the migration notice as dismissed.
   */
  dismissMigrationNotice() {
    this._config.set('migrationNoticeDismissed', true);
  }

  // ---------------------------------------------------------------------------
  // Private

  /**
   * shouldSpeak for CUSTOM level — reads per-hook toggles from config.customVerbosity.
   * @param {string} hookType
   * @returns {boolean}
   */
  _customShouldSpeak(hookType) {
    const cfg = this._config.getConfig();
    const custom = cfg.customVerbosity ?? {};
    const keyMap = {
      'prompt-submit':     'promptSubmit',
      'response-complete': 'responseComplete',
    };
    const key = keyMap[hookType];
    if (key === undefined) return true;
    return custom[key] !== false;  // default true if not configured
  }
}

export default VerbosityService;
