/**
 * AgentVibes TUI Console — Modal Overlay Component
 * Story 6.4: Modal Overlay Component
 *
 * Provides a reusable dim-overlay + centered-container modal for the TUI.
 * Used by stories 7.7 (Personality), 7.8 (Voice), 7.9 (Music) selector modals.
 *
 * Integration with NavigationService:
 *   - openModal() sets isModalOpen() = true (blocks S/V/M/A/R/H/I/T shortcuts)
 *   - closeModal() restores modal-closed state
 *   - pushFocus/popFocus manage keyboard focus across open/close
 */

import blessed from 'blessed';

// Brand colours consistent with app.js and UX design plan
const COLORS = {
  headerBg: '#1a237e',
  contentBg: '#0a0e1a',
  activeTab: '#3949ab',
  textWhite: 'white',
  overlayBg: '#000000',
};

export class ModalOverlay {
  /**
   * @param {object} screen - Blessed screen instance (or stub in tests)
   * @param {NavigationService} nav - Navigation service for modal state management
   * @param {object} [opts={}]
   * @param {string} [opts.title='Modal'] - Default modal title
   */
  constructor(screen, nav, opts = {}) {
    this._screen = screen;
    this._nav = nav;
    this._onApply = null;
    this._focusedButton = 'apply'; // M1: tracks which footer button has focus ('apply'|'cancel')

    const title = opts.title ?? 'Modal';
    this._title = title; // L1: stored for external access

    // Detect test/stub environment: real blessed screens have a .program property.
    // When using a stub screen (no .program), create lightweight object stubs
    // instead of real blessed widgets to avoid "No active screen." errors.
    const isTestMode = !screen.program;

    if (isTestMode) {
      this._overlay    = { hidden: true };
      this._container  = { hidden: true, key: () => {}, focus: () => {} };
      this._titleBar   = { setContent: () => {} };
      this._contentBox = { hidden: true };
      this._footerBar  = { hidden: true, setContent: () => {} }; // setContent needed by _updateFooter
    } else {
      // Full-screen dim overlay — sits beneath the modal container
      this._overlay = blessed.box({
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        style: { bg: COLORS.overlayBg },
        hidden: true,
      });

      // Centered modal container with border
      this._container = blessed.box({
        top: 'center',
        left: 'center',
        width: '60%',
        height: '60%',
        border: { type: 'line' },
        style: {
          fg: COLORS.textWhite,
          bg: COLORS.contentBg,
          border: { fg: COLORS.activeTab },
        },
        hidden: true,
        keys: true,
        mouse: true,
      });

      // Title bar — top row of container
      this._titleBar = blessed.box({
        parent: this._container,
        top: 0,
        left: 0,
        width: '100%',
        height: 1,
        content: ` ${title}`,
        tags: true,
        style: {
          fg: COLORS.textWhite,
          bg: COLORS.headerBg,
        },
      });

      // Scrollable content area — callers append their UI here via getContentBox()
      this._contentBox = blessed.box({
        parent: this._container,
        top: 1,
        left: 0,
        width: '100%',
        bottom: 2,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        style: {
          fg: COLORS.textWhite,
          bg: COLORS.contentBg,
        },
      });

      // Footer strip with focusable Apply / Cancel buttons
      this._footerBar = blessed.box({
        parent: this._container,
        bottom: 0,
        left: 0,
        width: '100%',
        height: 2,
        content: '  ► {bold}[Apply]{/bold}   [Cancel]',
        tags: true,
        style: {
          fg: COLORS.textWhite,
          bg: COLORS.headerBg,
        },
      });

      // Append to screen in z-order: overlay first (bottom), container on top
      this._screen.append(this._overlay);
      this._screen.append(this._container);

      // M1: Tab cycles focus indicator between Apply and Cancel
      this._container.key(['tab'], () => {
        this._focusedButton = this._focusedButton === 'apply' ? 'cancel' : 'apply';
        this._updateFooter();
        this._screen.render();
      });

      // Enter activates the currently focused footer button (M1: checks _focusedButton)
      this._container.key(['enter'], () => {
        if (this._focusedButton === 'apply') {
          this._handleApply();
        } else {
          this.close();
        }
      });

      this._container.key(['escape'], () => this.close());
    }
  }

  // ---------------------------------------------------------------------------
  // Public API

  /**
   * Open the modal overlay.
   * Shows the dim overlay + container, updates NavigationService modal state,
   * pushes current focus to the focus stack, and renders the screen.
   * @param {Function|null} [onApply] - Called when user activates Apply
   */
  open(onApply = null) {
    // H2: Guard against double-open — prevents stacked pushFocus calls
    if (this._nav.isModalOpen()) return;

    this._onApply = onApply;
    this._focusedButton = 'apply'; // Reset focus to Apply on each open
    this._overlay.hidden = false;
    this._container.hidden = false;

    this._nav.openModal(() => {
      // Push current focus so we can restore on close
      this._nav.pushFocus(this._screen.focused);
      this._container.focus();
    });

    this._updateFooter();
    this._screen.render();
  }

  /**
   * Close the modal overlay.
   * Hides overlay + container, restores NavigationService modal state,
   * pops saved focus, and renders the screen.
   *
   * Guard: uses widget-state (overlay.hidden) rather than isModalOpen().
   * Reason: Blessed.js fires multiple Esc handlers in registration order.
   * navigation.js registers its handler first and calls nav.closeModal()
   * before app.js calls modal.close() — so isModalOpen() is already false
   * when we arrive here, causing the old guard to return early and leave
   * the overlay/container visible on screen.
   */
  close() {
    // H1: Widget-state guard — safe against dual-handler Esc ordering
    if (this._overlay.hidden) return;
    this._overlay.hidden = true;
    this._container.hidden = true;
    // H1: navigation.js may have already called closeModal() — only call if still open
    if (this._nav.isModalOpen()) this._nav.closeModal();
    const prev = this._nav.popFocus();
    if (prev && typeof prev.focus === 'function') prev.focus();
    this._screen.render();
  }

  /**
   * Returns the inner content box so callers (7.7-7.9) can append their UI.
   * @returns {object} Blessed box (or stub in tests)
   */
  getContentBox() {
    return this._contentBox;
  }

  /**
   * Update the modal title bar text.
   * @param {string} text
   */
  setTitle(text) {
    this._titleBar.setContent(` ${text}`);
  }

  // ---------------------------------------------------------------------------
  // Private

  /**
   * M1: Render the footer with a ► cursor on the currently focused button.
   */
  _updateFooter() {
    const applyLabel  = this._focusedButton === 'apply'  ? '► {bold}[Apply]{/bold}' : '  [Apply]';
    const cancelLabel = this._focusedButton === 'cancel' ? '► {bold}[Cancel]{/bold}' : '  [Cancel]';
    this._footerBar.setContent(`  ${applyLabel}   ${cancelLabel}`);
  }

  _handleApply() {
    if (typeof this._onApply === 'function') {
      this._onApply();
    }
    this.close();
  }
}

/**
 * Factory function for creating a ModalOverlay.
 * @param {object} screen - Blessed screen
 * @param {NavigationService} nav - Navigation service
 * @param {object} [opts={}]
 * @returns {ModalOverlay}
 */
export function createModalOverlay(screen, nav, opts = {}) {
  return new ModalOverlay(screen, nav, opts);
}
