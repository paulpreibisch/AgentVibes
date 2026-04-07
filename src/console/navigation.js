/**
 * AgentVibes TUI Console — Global Keyboard Navigation
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Registers all global key bindings on the Blessed screen.
 * Tab shortcuts (S/V/M/X/R/H/I) are blocked when a modal is open.
 */

/** Map of key → tab ID for global tab shortcut keys */
const KEY_TO_TAB = {
  's': 'settings', 'S': 'settings',
  'v': 'voices',   'V': 'voices',
  'm': 'music',    'M': 'music',
  'b': 'agents',   'B': 'agents',
  'x': 'receiver', 'X': 'receiver',
  'r': 'readme',   'R': 'readme',
  'h': 'help',     'H': 'help',
  'i': 'setup',    'I': 'setup',
};

/**
 * Register all global keyboard navigation handlers on the Blessed screen.
 *
 * Handlers registered:
 *   S/V/M/A/R/H/I → switchTab (blocked when modal is open)
 *   Tab / T/t      → cycleTab forward (blocked when modal is open)
 *   Shift+Tab      → cycleTab backward (blocked when modal is open)
 *   Escape         → closeModal (only when modal is open)
 *
 * Arrow keys (left/right) are intentionally NOT used for tab cycling —
 * individual tabs use left/right for in-element navigation (e.g. row siblings).
 *
 * NOTE: Q / Ctrl+C are already registered in app.js (_registerHandlers).
 * Do NOT re-register them here — that would stack duplicate quit handlers.
 *
 * @param {object} screen - Blessed screen instance (or stub in tests)
 * @param {import('../services/navigation-service.js').NavigationService} navigationService
 * @param {function} [focusMainTabBar] - Optional callback to return focus to the tab bar
 */
export function setupNavigation(screen, navigationService, focusMainTabBar) {
  // Tab switching shortcuts — one handler per key (both cases)
  for (const [key, tabId] of Object.entries(KEY_TO_TAB)) {
    screen.key([key], () => {
      if (!navigationService.isModalOpen()) {
        navigationService.switchTab(tabId);
      }
    });
  }

  // T → cycle to next tab (Tab itself is handled by the tab bar and footer only)
  screen.key(['t', 'T'], () => {
    if (!navigationService.isModalOpen()) {
      navigationService.cycleTab();
    }
  });

  // Escape — close modal if open, otherwise return focus to tab bar
  screen.key(['escape'], () => {
    if (navigationService.isModalOpen()) {
      navigationService.closeModal();
    } else if (typeof focusMainTabBar === 'function') {
      focusMainTabBar();
    }
  });
}
