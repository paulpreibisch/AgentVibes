/**
 * AgentVibes TUI Console — Navigation Service
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Manages tab state, cycling, modal overlay state, and focus stack.
 * Used by navigation.js (key bindings) and app.js (wiring).
 */

/** Ordered list of all tab IDs — used for cycling and validation */
export const TAB_ORDER = ['setup', 'settings', 'voices', 'music', 'agents', 'receiver', 'readme', 'help'];

export class NavigationService {
  /**
   * @param {string} [initialTab='settings'] - Tab to activate on launch
   */
  constructor(initialTab = 'settings') {
    this._activeTab = TAB_ORDER.includes(initialTab) ? initialTab : 'settings';
    this._switchCallbacks = [];
    this._focusStack = [];
    this._modalDepth = 0;
    this._modalCloseCallbacks = [];
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
   * Cycle to the previous tab in TAB_ORDER, wrapping from first back to last.
   */
  cycleTabPrev() {
    const idx = TAB_ORDER.indexOf(this._activeTab);
    const prevIdx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    this.switchTab(TAB_ORDER[prevIdx]);
  }

  /**
   * Register a callback fired whenever the active tab changes.
   * @param {(tabId: string) => void} callback
   */
  onSwitch(callback) {
    this._switchCallbacks.push(callback);
  }

  // ---------------------------------------------------------------------------
  // Modal state

  /** Returns true if one or more modals are currently open */
  isModalOpen() {
    return this._modalDepth > 0;
  }

  /**
   * Open a modal. Increments depth counter and registers an optional close
   * callback so nav hotkeys can force-close all open modals.
   * @param {Function|null} fn       - Optional factory/callback invoked immediately
   * @param {Function|null} closeFn  - Optional callback to close this modal's UI
   */
  openModal(fn, closeFn) {
    this._modalDepth++;
    this._modalCloseCallbacks.push(closeFn ?? null);
    fn?.();
  }

  /**
   * Close the topmost modal, decrementing the depth counter.
   * Safe to call when depth is already 0.
   */
  closeModal() {
    if (this._modalDepth > 0) this._modalDepth--;
    if (this._modalCloseCallbacks.length > 0) this._modalCloseCallbacks.pop();
  }

  /**
   * Force-close all open modals by calling their registered close callbacks
   * from innermost to outermost, then reset depth to 0.
   * Used by nav hotkeys (S/V/M/…) to dismiss modals before switching tabs.
   */
  forceCloseAll() {
    const callbacks = [...this._modalCloseCallbacks].reverse();
    this._modalDepth = 0;
    this._modalCloseCallbacks = [];
    for (const cb of callbacks) {
      if (typeof cb === 'function') {
        try { cb(); } catch {}
      }
    }
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
