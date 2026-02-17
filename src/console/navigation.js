/**
 * AgentVibes TUI Console — Global Keyboard Navigation
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Registers all global key bindings on the Blessed screen.
 * Tab shortcuts (S/V/M/A/R/H/I) are blocked when a modal is open.
 */

/** Map of key → tab ID for global tab shortcut keys */
const KEY_TO_TAB = {
  's': 'settings', 'S': 'settings',
  'v': 'voices',   'V': 'voices',
  'm': 'music',    'M': 'music',
  'a': 'agents',   'A': 'agents',
  'r': 'readme',   'R': 'readme',
  'h': 'help',     'H': 'help',
  'i': 'install',  'I': 'install',
};

/**
 * Register all global keyboard navigation handlers on the Blessed screen.
 *
 * Handlers registered:
 *   S/V/M/A/R/H/I → switchTab (blocked when modal is open)
 *   T/t           → cycleTab  (blocked when modal is open)
 *   Escape        → closeModal (only when modal is open)
 *
 * NOTE: Q / Ctrl+C are already registered in app.js (_registerHandlers).
 * Do NOT re-register them here — that would stack duplicate quit handlers.
 *
 * @param {object} screen - Blessed screen instance (or stub in tests)
 * @param {import('../services/navigation-service.js').NavigationService} navigationService
 */
export function setupNavigation(screen, navigationService) {
  // Tab switching shortcuts — one handler per key (both cases)
  for (const [key, tabId] of Object.entries(KEY_TO_TAB)) {
    screen.key([key], () => {
      if (!navigationService.isModalOpen()) {
        navigationService.switchTab(tabId);
      }
    });
  }

  // Tab cycling — T key
  screen.key(['t', 'T'], () => {
    if (!navigationService.isModalOpen()) {
      navigationService.cycleTab();
    }
  });

  // Escape — close modal (story 6.4 will expand modal handling)
  screen.key(['escape'], () => {
    if (navigationService.isModalOpen()) {
      navigationService.closeModal();
    }
  });
}
