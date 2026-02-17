/**
 * AgentVibes TUI Console — App Scaffold
 * Story 6.1: Blessed.js App Scaffold & Screen Setup
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Foundational screen: header, tab bar, content area, footer, navigation.
 * Stories 6.3+ build on top of this scaffold.
 */

import blessed from 'blessed';
import { NavigationService, TAB_ORDER } from '../services/navigation-service.js';
import { setupNavigation } from './navigation.js';
import { createPlaceholderTab, TAB_DISPLAY_LABELS } from './tabs/placeholder-tab.js';
import { FOOTER_CONFIG, DEFAULT_FOOTER_COLOR } from './footer-config.js';
import { createModalOverlay } from './modals/modal-overlay.js';
import { createSettingsTab } from './tabs/settings-tab.js';
import { ConfigService } from '../services/config-service.js';
import { ProviderService } from '../services/provider-service.js';

// Brand colours — consistent with UX design plan and architecture.md
const COLORS = {
  headerBg: '#1a237e',      // Dark navy — header and footer
  tabBarBg: '#263238',      // Dark blue-gray — tab bar
  contentBg: '#0a0e1a',     // Near-black — content area background
  focusCyan: '#00e5ff',     // Cyan — focus state
  activeTab: '#3949ab',     // Blue — active tab highlight
  textWhite: 'white',
  textDim: '#90a4ae',       // Gray — placeholder / dim text
};

export class AgentVibesConsole {
  constructor(opts = {}) {
    // opts.startTab is stored for use by story 6.5 (command routing)
    this.startTab = opts.startTab ?? 'settings';
    this._testMode = opts._testMode ?? false;

    this.screen = null;
    this.tabBarBox = null;        // Exposed for story 6.2 (tab bar implementation)
    this.contentArea = null;      // Exposed for story 6.2 (tab mounting)
    this.navigationService = null;  // Exposed for story 6.3+ (context footer, etc.)
    this.tabs = {};                // { settings: BlessedBox, voices: BlessedBox, ... }
    this.contextFooterBox = null;  // Exposed for story 6.3 (color-coded context footer)
    this.modalOverlay = null;      // Exposed for story 6.4 (reusable modal overlay)
  }

  /**
   * Initialise all screen components and register event handlers.
   * Returns `this` so callers can access the instance after launch.
   */
  async init() {
    this._createScreen();

    // In test mode, skip blessed widget creation (widgets require an active screen)
    if (process.env.AGENTVIBES_TEST_MODE === 'true' || this._testMode) {
      // Provide stub objects so callers can verify properties exist
      this.tabBarBox = {};
      this.contentArea = {};
      this.contextFooterBox = {};
      this.navigationService = new NavigationService(this.startTab);
      this.tabs = {};
      return this;
    }

    this._createHeader();
    this._createTabBar();
    this._createContentArea();
    this._createContextFooter();
    this._createFooter();
    this._registerHandlers();
    this._createPlaceholderTabs();
    this._createRealTabs();
    this._initNavigation();
    this._createModalOverlay();
    // Force-activate the start tab: switchTab() no-ops when _activeTab is already
    // set by the NavigationService constructor, so forceActivate() bypasses the
    // same-tab guard to fire onSwitch callbacks and render the initial UI state.
    this.navigationService.forceActivate(this.startTab);
    this.screen.render();
    return this;
  }

  // ---------------------------------------------------------------------------
  // Private: Screen

  _createScreen() {
    // Screen options stored as property so tests can verify correct configuration
    // without needing to intercept the blessed.screen() call (ESM mock limitation).
    this._screenOptions = {
      smartCSR: true,
      mouse: true,
      fullUnicode: true,
      title: 'AgentVibes v4.0 TUI Console',
    };

    // When AGENTVIBES_TEST_MODE is set, use a lightweight stub instead of a
    // real blessed screen. This prevents the event loop from blocking tests.
    if (process.env.AGENTVIBES_TEST_MODE === 'true' || this._testMode) {
      this.screen = {
        append: () => {},
        key: () => {},
        on: () => {},
        render: () => {},
        destroy: () => {},
      };
      return;
    }

    this.screen = blessed.screen(this._screenOptions);

    // Reflow on terminal resize
    this.screen.on('resize', () => this.screen.render());
  }

  // ---------------------------------------------------------------------------
  // Private: Fixed header (rows 0-2)

  _createHeader() {
    const cwd = process.cwd();

    const header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: `{bold}AgentVibes v4.0 TUI Console{/bold}  │  ⭐ github.com/preibisch/agentvibes  │  📁 ${cwd}`,
      tags: true,
      style: {
        fg: COLORS.textWhite,
        bg: COLORS.headerBg,
      },
      padding: { left: 1 },
    });

    this.screen.append(header);
  }

  // ---------------------------------------------------------------------------
  // Private: Tab bar (row 3) — populated with real tabs in story 6.2

  _createTabBar() {
    // tags: true enables {#color-bg}/{bold} inline tags for active tab highlight
    this.tabBarBox = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: 1,
      content: ' [ Loading tabs... ]',
      tags: true,
      style: {
        fg: COLORS.textDim,
        bg: COLORS.tabBarBg,
      },
    });

    this.screen.append(this.tabBarBox);
  }

  // ---------------------------------------------------------------------------
  // Private: Render tab bar content string for given active tab

  _renderTabBarContent(activeTabId) {
    return TAB_ORDER.map(id => {
      const label = TAB_DISPLAY_LABELS[id];
      if (id === activeTabId) {
        return `{#3949ab-bg}{bold}{white-fg} [${label[0]}] ${label} {/white-fg}{/bold}{/#3949ab-bg}`;
      }
      return `{#82b1ff-fg} [${label[0]}] ${label} {/#82b1ff-fg}`;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Private: Content area (rows 4..N-1) — tab components mount here

  _createContentArea() {
    // bottom: 2 reserves 2 rows at the bottom: context footer (story 6.3) + GitHub footer
    this.contentArea = blessed.box({
      top: 4,
      left: 0,
      width: '100%',
      bottom: 2,
      border: { type: 'line' },
      style: {
        fg: COLORS.textWhite,
        bg: COLORS.contentBg,
        border: { fg: COLORS.activeTab },
      },
    });

    this.screen.append(this.contentArea);
  }

  // ---------------------------------------------------------------------------
  // Private: Color-coded context footer (story 6.3) — above GitHub footer

  _createContextFooter() {
    this.contextFooterBox = blessed.box({
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      tags: true,
      style: {
        fg: COLORS.textWhite,
        bg: DEFAULT_FOOTER_COLOR,
      },
    });

    this.screen.append(this.contextFooterBox);
  }

  // ---------------------------------------------------------------------------
  // Private: Update context footer color + text for the given tab

  _updateContextFooter(tabId) {
    // Real tab components (Tab Component Contract) provide their own footer getters.
    // Placeholder tabs fall back to FOOTER_CONFIG.
    const tab = this.tabs[tabId];
    if (tab && typeof tab.getFooterColor === 'function') {
      this.contextFooterBox.style.bg = tab.getFooterColor();
      this.contextFooterBox.setContent(tab.getFooterText());
    } else {
      const config = FOOTER_CONFIG[tabId] ?? { color: DEFAULT_FOOTER_COLOR, text: '' };
      this.contextFooterBox.style.bg = config.color;
      this.contextFooterBox.setContent(config.text);
    }
  }

  // ---------------------------------------------------------------------------
  // Private: GitHub star footer (row N — fixed bottom)

  _createFooter() {
    const footer = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '  ⭐  Love AgentVibes? Star us on GitHub → github.com/preibisch/agentvibes  ',
      style: {
        fg: COLORS.textWhite,
        bg: COLORS.headerBg,
      },
    });

    this.screen.append(footer);
  }

  // ---------------------------------------------------------------------------
  // Private: Create placeholder tab content boxes (story 6.2)
  // Each epic 7-11 story will replace its placeholder with real content.

  _createPlaceholderTabs() {
    for (const tabId of TAB_ORDER) {
      const label = TAB_DISPLAY_LABELS[tabId];
      this.tabs[tabId] = createPlaceholderTab(this.contentArea, label);
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Replace placeholder tabs with real implementations (story 7.1+)

  _createRealTabs() {
    // Destroy the settings placeholder (real tab mounts directly to screen, not contentArea)
    const placeholder = this.tabs['settings'];
    if (placeholder && typeof placeholder.destroy === 'function') {
      placeholder.destroy();
    }

    const configService = new ConfigService();
    const providerService = new ProviderService(configService);
    this.tabs['settings'] = createSettingsTab(this.screen, { configService, providerService });
  }

  // ---------------------------------------------------------------------------
  // Private: Initialise navigation service and wire key handlers (story 6.2)

  _initNavigation() {
    this.navigationService = new NavigationService(this.startTab);

    // On every tab switch: update tab bar, context footer, and show/hide tab boxes
    this.navigationService.onSwitch(tabId => {
      // Update tab bar highlighting
      this.tabBarBox.setContent(this._renderTabBarContent(tabId));

      // Update context footer color + shortcuts (story 6.3)
      this._updateContextFooter(tabId);

      // Show active tab, hide all others.
      // Real tab components (Tab Component Contract) expose show/hide/onFocus/onBlur.
      // Placeholder tabs are plain blessed boxes with a .hidden property.
      for (const [id, tab] of Object.entries(this.tabs)) {
        if (typeof tab.show === 'function') {
          if (id === tabId) {
            tab.show();
            tab.onFocus();
          } else {
            tab.hide();
            tab.onBlur();
          }
        } else {
          tab.hidden = (id !== tabId);
        }
      }

      this.screen.render();
    });

    // Register global key bindings (S/V/M/A/R/H/I/T/Esc)
    setupNavigation(this.screen, this.navigationService);
  }

  // ---------------------------------------------------------------------------
  // Private: Modal overlay (story 6.4) — reusable base for all selector modals

  _createModalOverlay() {
    this.modalOverlay = createModalOverlay(this.screen, this.navigationService);

    // Esc key closes the modal overlay if one is open.
    // Blessed.js allows multiple handlers for the same key — all fire.
    // The navigation.js Esc handler calls nav.closeModal() (state only).
    // This second handler hides the overlay+container widgets.
    this.screen.key(['escape'], () => {
      if (this.modalOverlay) this.modalOverlay.close();
    });
  }

  // ---------------------------------------------------------------------------
  // Private: Global keyboard handlers

  _registerHandlers() {
    // Q or Ctrl+C → clean exit (no zombie processes)
    this.screen.key(['q', 'Q', 'C-c'], () => {
      this.screen.destroy();
      process.exit(0);
    });
  }
}

/**
 * Launch the AgentVibes TUI console.
 *
 * @param {object} opts
 * @param {string} [opts.startTab='settings'] - Which tab to show on launch.
 *   Used by story 6.5 (command routing). Values: 'settings' | 'install' | 'voices' | 'music'
 * @param {boolean} [opts._testMode=false] - Internal: skip render in test environments.
 * @returns {Promise<AgentVibesConsole>}
 */
export async function launchConsole(opts = {}) {
  const app = new AgentVibesConsole(opts);
  await app.init();
  return app;
}
