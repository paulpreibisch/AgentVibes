/**
 * AgentVibes TUI Console — App Scaffold
 * Story 6.1: Blessed.js App Scaffold & Screen Setup
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 *
 * Foundational screen: header, tab bar, content area, footer, navigation.
 * Stories 6.3+ build on top of this scaffold.
 */

import blessed from 'blessed';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { NavigationService, TAB_ORDER } from '../services/navigation-service.js';
import { setupNavigation } from './navigation.js';
import { createPlaceholderTab, TAB_DISPLAY_LABELS } from './tabs/placeholder-tab.js';
import { FOOTER_CONFIG, DEFAULT_FOOTER_COLOR } from './footer-config.js';
import { createModalOverlay } from './modals/modal-overlay.js';
import { BRAND_PINK } from './brand-colors.js';
import { createSettingsTab } from './tabs/settings-tab.js';
import { createVoicesTab } from './tabs/voices-tab.js';
import { createMusicTab } from './tabs/music-tab.js';
import { createAgentsTab } from './tabs/agents-tab.js';
import { createInstallTab } from './tabs/install-tab.js';
import { createHelpTab } from './tabs/help-tab.js';
import { createReadmeTab } from './tabs/readme-tab.js';
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
    this._initNavigation();    // must run first so navigationService is live in services
    this._createRealTabs();
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

    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: false,
      wrap: false,
      scrollable: false,
      style: { fg: COLORS.textWhite, bg: COLORS.headerBg },
    });
    this.screen.append(this.headerBox);

    // Row 0: main title — explicit child avoids valign:middle redraw artifacts
    blessed.text({
      parent: this.headerBox,
      top: 0,
      left: 2,
      shrink: true,
      tags: true,
      content: `{bright-cyan-fg}Agent{/bright-cyan-fg}{${BRAND_PINK}-fg}Vibes{/${BRAND_PINK}-fg}  {#90a4ae-fg}v{/#90a4ae-fg}{#ffd700-fg}4.0{/#ffd700-fg}  \u2502  \uD83D\uDCC1 ${cwd}`,
      style: { bg: COLORS.headerBg },
    });

    // Row 1: subtitle
    blessed.text({
      parent: this.headerBox,
      top: 1,
      left: 2,
      shrink: true,
      tags: true,
      content: `{#546e7a-fg}Agent Vibes Customization Tool{/#546e7a-fg}`,
      style: { bg: COLORS.headerBg },
    });

    // Right-aligned: git remote + branch when available, else AgentVibes repo link
    let topRightContent = `{#00e5ff-fg}github.com/preibisch/agentvibes{/#00e5ff-fg}`;
    try {
      const branchResult = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'],
        { encoding: 'utf8', timeout: 2000, cwd });
      const remoteResult = spawnSync('git', ['remote', 'get-url', 'origin'],
        { encoding: 'utf8', timeout: 2000, cwd });
      if (branchResult.status === 0 && remoteResult.status === 0) {
        const branch = branchResult.stdout.trim();
        // Normalise SSH (git@github.com:user/repo.git) → HTTPS, strip .git suffix
        const repoUrl = remoteResult.stdout.trim()
          .replace(/^git@([^:]+):/, 'https://$1/')
          .replace(/\.git$/, '');
        // Strip protocol for compact display: https://github.com/… → github.com/…
        const displayUrl = repoUrl.replace(/^https?:\/\//, '');
        topRightContent = `{#00e5ff-fg}${displayUrl}{/#00e5ff-fg}  {#90a4ae-fg}\u2502{/#90a4ae-fg}  {#90a4ae-fg}\u2387{/#90a4ae-fg} {bright-white-fg}${branch}{/bright-white-fg}`;
      }
    } catch {}
    blessed.text({
      parent: this.headerBox,
      top: 0,
      right: 2,
      shrink: true,
      tags: true,
      content: topRightContent,
      style: { bg: COLORS.headerBg },
    });
  }

  // ---------------------------------------------------------------------------
  // Private: Tab bar (row 3) — individual child boxes, no tag parsing.
  // Each tab is a separate blessed.box. Active tab highlighted via style update.

  _createTabBar() {
    this.tabBarBox = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: 1,
      style: { bg: COLORS.tabBarBg },
    });
    // Attach to screen FIRST so tabBarBox.screen is set before children are
    // created. Child boxes inherit screen from parent via blessed's insert().
    // If children are created before the parent is attached, el.screen = null
    // and they render at position (0,0) — the header row area.
    this.screen.append(this.tabBarBox);

    // One box per tab — positioned sequentially. No tag parsing, no wrapping.
    this._tabItems = {};
    let xOffset = 1;
    for (const id of TAB_ORDER) {
      const label = TAB_DISPLAY_LABELS[id];
      const text = ` [${label[0]}] ${label} `;
      const el = blessed.box({
        parent: this.tabBarBox,
        top: 0,
        left: xOffset,
        width: text.length,
        height: 1,
        content: text,
        tags: false,
        style: { fg: COLORS.focusCyan, bg: COLORS.tabBarBg },
      });
      this._tabItems[id] = el;
      xOffset += text.length + 1; // 1-space gap between tabs
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Update tab bar — set active item style, reset all others.

  _updateTabBar(activeTabId) {
    if (!this._tabItems) return; // guard: not initialized in test mode
    for (const [id, el] of Object.entries(this._tabItems)) {
      if (id === activeTabId) {
        el.style.fg = 'white';
        el.style.bg = COLORS.activeTab;
        el.style.bold = true;
      } else {
        el.style.fg = COLORS.focusCyan;
        el.style.bg = COLORS.tabBarBg;
        el.style.bold = false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Render tab bar content string for given active tab
  // (kept as a pure helper for unit tests; real rendering uses _updateTabBar)

  _renderTabBarContent(activeTabId) {
    return TAB_ORDER.map(id => {
      const label = TAB_DISPLAY_LABELS[id];
      if (id === activeTabId) {
        return `{bold}{white-fg}[${label[0]}] ${label}{/white-fg}{/bold}`;
      }
      return `{#82b1ff-fg}[${label[0]}] ${label}{/#82b1ff-fg}`;
    }).join('  ');
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
    // Detect installed providers inline (same logic as ProviderService)
    const _has = (bin) => {
      try { execFileSync('which', [bin], { stdio: 'ignore', timeout: 2000 }); return true; }
      catch { return false; }
    };
    const detected = {
      piper:   _has('piper'),
      soprano: _has('soprano'),
      sapi:    process.platform === 'win32',
      macos:   process.platform === 'darwin' && _has('say'),
    };

    // Build provider status badges:  ● Name  (green if detected, grey if not)
    const on  = (label) => `{green-fg}●{/green-fg} ${label}`;
    const off = (label) => `{#546e7a-fg}● ${label}{/#546e7a-fg}`;
    const badges = [
      detected.piper   ? on('Piper')        : off('Piper'),
      detected.soprano ? on('Soprano')      : off('Soprano'),
      detected.sapi    ? on('Windows SAPI') : off('Windows SAPI'),
      detected.macos   ? on('Mac Say')      : off('Mac Say'),
    ].join('  ');

    const footer = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      content: `  ${badges}  {right}⭐ github.com/preibisch/agentvibes  {/right}`,
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
    const services = { configService, providerService, navigationService: this.navigationService };
    this.tabs['settings'] = createSettingsTab(this.screen, services);

    // Destroy voices placeholder and mount real voices tab
    const voicesPlaceholder = this.tabs['voices'];
    if (voicesPlaceholder && typeof voicesPlaceholder.destroy === 'function') {
      voicesPlaceholder.destroy();
    }
    this.tabs['voices'] = createVoicesTab(this.screen, services);

    // Destroy music placeholder and mount real music tab
    const musicPlaceholder = this.tabs['music'];
    if (musicPlaceholder && typeof musicPlaceholder.destroy === 'function') {
      musicPlaceholder.destroy();
    }
    this.tabs['music'] = createMusicTab(this.screen, services);

    // Destroy agents placeholder and mount real agents tab
    const agentsPlaceholder = this.tabs['agents'];
    if (agentsPlaceholder && typeof agentsPlaceholder.destroy === 'function') {
      agentsPlaceholder.destroy();
    }
    this.tabs['agents'] = createAgentsTab(this.screen, services);

    // Destroy install placeholder and mount real install wizard
    const installPlaceholder = this.tabs['install'];
    if (installPlaceholder && typeof installPlaceholder.destroy === 'function') {
      installPlaceholder.destroy();
    }
    this.tabs['install'] = createInstallTab(this.screen, services);

    // Destroy help/readme placeholders and mount real tabs
    const helpPlaceholder = this.tabs['help'];
    if (helpPlaceholder && typeof helpPlaceholder.destroy === 'function') {
      helpPlaceholder.destroy();
    }
    this.tabs['help'] = createHelpTab(this.screen, services);

    const readmePlaceholder = this.tabs['readme'];
    if (readmePlaceholder && typeof readmePlaceholder.destroy === 'function') {
      readmePlaceholder.destroy();
    }
    this.tabs['readme'] = createReadmeTab(this.screen, services);
  }

  // ---------------------------------------------------------------------------
  // Private: Initialise navigation service and wire key handlers (story 6.2)

  _initNavigation() {
    this.navigationService = new NavigationService(this.startTab);

    // On every tab switch: update tab bar, context footer, and show/hide tab boxes
    this.navigationService.onSwitch(tabId => {
      const activeTab = this.tabs[tabId];

      // Render-suppression tab switch:
      //   All show/hide calls and UI updates happen inside this window so zero
      //   intermediate frames are sent to the terminal. A single clean render
      //   fires at the end, when exactly one tab is visible.
      const _origRender = this.screen.render.bind(this.screen);
      this.screen.render = () => {};

      try {
        // Nuclear clear: wipe from the tab bar row (3) through the content area.
        // blessed's render loop never resets the `lines` buffer before rendering
        // (see: blessed/lib/widgets/screen.js line 733, commented-out clear).
        // Without this, stale cell content from the previous tab persists in
        // `lines` and bleeds through whenever cells aren't fully overwritten.
        this.screen.clearRegion(0, this.screen.cols, 2, this.screen.rows - 2);

        // Force-invalidate olines from the header's last row (2) through the
        // content area. Row 2 (header bottom) and row 3 (tab bar) accumulate
        // ghost rendering artifacts — draw() skips them when lines==olines even
        // though the terminal still shows stale chars from earlier renders.
        // Setting attr=-1 is impossible for any real cell, so draw() is forced
        // to physically rewrite every cell on the next render call.
        for (let r = 2; r < this.screen.rows - 2; r++) {
          const orow = this.screen.olines[r];
          if (!orow) continue;
          for (let c = 0; c < this.screen.cols; c++) {
            if (orow[c]) orow[c][0] = -1; // impossible attr — forces draw() rewrite
          }
          orow.dirty = true;
        }

        // Update tab bar and footer inside suppression — no intermediate render.
        this._updateTabBar(tabId);
        this._updateContextFooter(tabId);

        // Hide all inactive tabs via their proper hide() method so side-effects
        // (e.g. voice preview kill, previewLine clear) run correctly.
        for (const [id, tab] of Object.entries(this.tabs)) {
          if (id !== tabId) {
            if (typeof tab.hide === 'function') tab.hide();
            else tab.hidden = true;
            if (typeof tab.onBlur === 'function') tab.onBlur();
          }
        }

        // Show the active tab via show() so refreshDisplay() populates labels.
        if (activeTab) {
          if (typeof activeTab.show === 'function') {
            activeTab.show();
            // setFront() moves the box to the end of screen.children so it
            // paints last (on top) — belt-and-suspenders against any z-order issue.
            if (activeTab.box && typeof activeTab.box.setFront === 'function') {
              activeTab.box.setFront();
            }
          } else {
            activeTab.hidden = false;
          }
        }
      } finally {
        // Always restore render even if something throws.
        this.screen.render = _origRender;
      }

      if (activeTab && typeof activeTab.onFocus === 'function') {
        activeTab.onFocus();
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
