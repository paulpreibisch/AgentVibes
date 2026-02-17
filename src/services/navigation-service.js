/**
 * AgentVibes TUI Console — Navigation Service
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Manages tab state, cycling, modal overlay state, and focus stack.
 * Used by navigation.js (key bindings) and app.js (wiring).
 */

/** Ordered list of all tab IDs — used for cycling and validation */
export const TAB_ORDER = ['settings', 'voices', 'music', 'agents', 'readme', 'help', 'install'];

export class NavigationService {
  /**
   * @param {string} [initialTab='settings'] - Tab to activate on launch
   */
  constructor(initialTab = 'settings') {
    this._activeTab = TAB_ORDER.includes(initialTab) ? initialTab : 'settings';
    this._switchCallbacks = [];
    this._focusStack = [];
    this._modalOpen = false;
  }

  // ---------------------------------------------------------------------------
  // Tab navigation

  /** Returns the currently active tab ID */
  getActiveTab() {
    return this._activeTab;
  }

  /**
   * Switch to the given tab.
   * Ignores invalid tab IDs. Fires all registered onSwitch callbacks.
   * @param {string} tabId
   */
  switchTab(tabId) {
    if (!TAB_ORDER.includes(tabId)) return;
    if (tabId === this._activeTab) return; // no-op: already on this tab
    this._activeTab = tabId;
    this._switchCallbacks.forEach(cb => cb(tabId));
  }

  /**
   * Activate a tab unconditionally, bypassing the same-tab no-op guard.
   * Used for initial UI setup: the constructor pre-sets _activeTab but
   * onSwitch callbacks must still fire to render the initial state.
   * @param {string} tabId
   */
  forceActivate(tabId) {
    if (!TAB_ORDER.includes(tabId)) return;
    this._activeTab = tabId;
    this._switchCallbacks.forEach(cb => cb(tabId));
  }

  /**
   * Cycle to the next tab in TAB_ORDER, wrapping from last back to first.
   */
  cycleTab() {
    const idx = TAB_ORDER.indexOf(this._activeTab);
    const nextIdx = (idx + 1) % TAB_ORDER.length;
    this.switchTab(TAB_ORDER[nextIdx]);
  }

  /**
   * Register a callback fired whenever the active tab changes.
   * @param {(tabId: string) => void} callback
   */
  onSwitch(callback) {
    this._switchCallbacks.push(callback);
  }

  // ---------------------------------------------------------------------------
  // Modal state (story 6.4 will expand this)

  /** Returns true if a modal is currently open */
  isModalOpen() {
    return this._modalOpen;
  }

  /**
   * Open a modal. Sets modal-open state and calls the factory fn if provided.
   * @param {Function|null} fn - Optional factory/callback invoked immediately
   */
  openModal(fn) {
    this._modalOpen = true;
    fn?.();
  }

  /** Close the current modal, restoring modal-closed state */
  closeModal() {
    this._modalOpen = false;
  }

  // ---------------------------------------------------------------------------
  // Focus stack (story 7.6 will use this for button-level focus)

  /**
   * Push a Blessed element onto the focus stack
   * @param {object} element - Blessed widget
   */
  pushFocus(element) {
    this._focusStack.push(element);
  }

  /**
   * Pop the last element from the focus stack.
   * Returns undefined if the stack is empty.
   * @returns {object|undefined}
   */
  popFocus() {
    return this._focusStack.pop();
  }
}
