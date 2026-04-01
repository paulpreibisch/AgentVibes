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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { NavigationService, TAB_ORDER } from '../services/navigation-service.js';
import { setupNavigation } from './navigation.js';
import { createPlaceholderTab, TAB_DISPLAY_LABELS, TAB_SHORTCUT_KEYS, getTabLabel } from './tabs/placeholder-tab.js';
import { LanguageService } from '../services/language-service.js';
import { t } from '../i18n/strings.js';
import { FOOTER_CONFIG, DEFAULT_FOOTER_COLOR } from './footer-config.js';
import { createModalOverlay } from './modals/modal-overlay.js';
import { BRAND_PINK } from './brand-colors.js';
import { createSettingsTab } from './tabs/settings-tab.js';
import { createVoicesTab } from './tabs/voices-tab.js';
import { createMusicTab } from './tabs/music-tab.js';
import { createInstallTab } from './tabs/install-tab.js';
import { createHelpTab } from './tabs/help-tab.js';
import { createReadmeTab } from './tabs/readme-tab.js';
import { createReceiverTab } from './tabs/receiver-tab.js';
import { createAgentsTab } from './tabs/agents-tab.js';
import { ConfigService } from '../services/config-service.js';
import { ProviderService } from '../services/provider-service.js';

const _dir = path.dirname(fileURLToPath(import.meta.url));
const _pkg = JSON.parse(readFileSync(path.join(_dir, '../../package.json'), 'utf8'));
const APP_VERSION = _pkg.version;

// Brand colours — consistent with UX design plan and architecture.md
const COLORS = {
  headerBg: '#1a237e',      // Dark navy — header and footer
  tabBarBg: '#263238',      // Dark blue-gray — tab bar
  contentBg: '#0a0e1a',     // Near-black — content area background
  focusCyan: 'bright-cyan',  // Matches "Agent" in header title
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
    // Initial render: draws header/tab-bar/footer into blessed's line buffer
    // before forceActivate fires. Without this, lines[0..1] (header rows) are
    // uninitialized when clearRegion() runs inside onSwitch, so blessed's draw()
    // skips them (not dirty) and the header is invisible on first load.
    this.screen.render();
    // Force-activate the start tab: switchTab() no-ops when _activeTab is already
    // set by the NavigationService constructor, so forceActivate() bypasses the
    // same-tab guard to fire onSwitch callbacks and render the initial UI state.
    this.navigationService.forceActivate(this.startTab);
    this.screen.render();
    // Place cursor on the start tab's header item (purple = focused).
    // User presses ↓/Enter to descend into content, or ←/→ to pick a different tab.
    const startTabItem = this._tabItems?.[this.startTab];
    if (startTabItem) {
      startTabItem.focus();
      this.screen.render();
    }
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
      title: `AgentVibes v${APP_VERSION} TUI Console`,
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
      content: `{bright-cyan-fg}Agent{/bright-cyan-fg}{${BRAND_PINK}-fg}Vibes{/${BRAND_PINK}-fg}  {#90a4ae-fg}v{/#90a4ae-fg}{#ffff00-fg}${APP_VERSION}{/#ffff00-fg}  \u2502  \uD83D\uDCC1 ${cwd}`,
      style: { bg: COLORS.headerBg },
    });

    // Row 1: subtitle
    this._headerSubtitleText = blessed.text({
      parent: this.headerBox,
      top: 1,
      left: 2,
      shrink: true,
      tags: true,
      content: `{green-fg}Customization Tool{/green-fg}`,
      style: { bg: COLORS.headerBg },
    });

    // Row 1: Quit shortcut — left-anchored after "Customization Tool" (18 chars at left:2)
    this._headerQuitText = blessed.text({
      parent: this.headerBox,
      top: 1,
      left: 22,
      shrink: true,
      tags: true,
      content: `{#ef9a9a-fg}[Q] Quit{/#ef9a9a-fg}`,
      style: { bg: COLORS.headerBg },
    });

    // Row 1 (right): Active settings summary [provider][voice][effects][music]
    this._headerStatusText = blessed.text({
      parent: this.headerBox,
      top: 1,
      right: 2,
      shrink: true,
      tags: true,
      content: '',
      style: { bg: COLORS.headerBg },
    });

    // Right-aligned: git remote + branch when available, else AgentVibes repo link
    let topRightContent = `{${BRAND_PINK}-fg}github.com/preibisch/agentvibes{/${BRAND_PINK}-fg}`;
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
        topRightContent = `{${BRAND_PINK}-fg}${displayUrl}{/${BRAND_PINK}-fg}  {#90a4ae-fg}\u2502{/#90a4ae-fg}  {#90a4ae-fg}\u2387{/#90a4ae-fg} {bright-white-fg}${branch}{/bright-white-fg}`;
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
  // Private: Update header status summary [provider][voice][effects][music]

  _updateHeaderStatus() {
    if (!this._headerStatusText || !this._providerService || !this._configService) return;
    try {
      const provider = this._providerService.getActiveProvider() ?? 'piper';
      const rawVoice = this._providerService.getActiveVoiceId() ?? '';
      // Show speaker name for multi-speaker voices
      const msSep = rawVoice.indexOf('::');
      const voiceName = msSep >= 0 ? rawVoice.slice(msSep + 2) : rawVoice;
      // Truncate long names
      const voiceShort = voiceName.length > 18 ? voiceName.slice(0, 17) + '…' : voiceName;

      const cfg = this._configService.getConfig();
      const effects = cfg.effects ?? {};
      const reverb = effects.reverbPreset ?? 'light';

      const music = cfg.backgroundMusic ?? cfg.music ?? {};
      const musicEnabled = music.enabled ?? false;
      const trackFile = music.track ?? '';
      // Strip prefixes and suffixes for compact display
      const trackShort = trackFile
        .replace(/\.mp3$/i, '')
        .replace(/^agent_vibes_/i, '')
        .replace(/^agentvibes_/i, '')
        .replace(/_loop$/i, '')
        .replace(/_v\d+$/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .slice(0, 16) || 'None';

      this._headerStatusText.setContent(
        `{#90a4ae-fg}[{/#90a4ae-fg}{bright-cyan-fg}${provider}{/bright-cyan-fg}{#90a4ae-fg}]{/#90a4ae-fg} ` +
        `{#90a4ae-fg}[{/#90a4ae-fg}{green-fg}${voiceShort}{/green-fg}{#90a4ae-fg}]{/#90a4ae-fg} ` +
        `{#90a4ae-fg}[{/#90a4ae-fg}{yellow-fg}${reverb}{/yellow-fg}{#90a4ae-fg}]{/#90a4ae-fg} ` +
        `{#90a4ae-fg}[{/#90a4ae-fg}{${musicEnabled ? 'magenta' : 'bright-black'}-fg}${musicEnabled ? trackShort : 'off'}{/${musicEnabled ? 'magenta' : 'bright-black'}-fg}{#90a4ae-fg}]{/#90a4ae-fg}`
      );
    } catch { /* non-fatal */ }
  }

  // ---------------------------------------------------------------------------
  // Private: Tab bar (row 3) — individual child boxes, no tag parsing.
  // Each tab is a separate blessed.box. Active tab highlighted via style update.

  _createTabBar() {
    // Background strip — screen child so blessed uses absolute coordinates directly.
    // Tab items are ALSO screen children (not children of tabBarBox) to avoid the
    // WSL/Windows Terminal parent-relative positioning bug that renders them 1 row
    // too high (at row 2 instead of row 3), producing a ghost duplicate tab bar.
    this.tabBarBox = blessed.box({
      parent: this.screen,
      top: 3,
      left: 0,
      width: '100%',
      height: 1,
      style: { bg: COLORS.tabBarBg },
    });

    // One box per tab — direct screen children at absolute top:3. No tag parsing, no wrapping.
    this._tabItems = {};
    this._tabItemXOffsets = {};  // track x positions for label refresh
    let xOffset = 1;
    for (const id of TAB_ORDER) {
      const lang = this._languageService?.getLang() ?? 'en';
      const label = getTabLabel(id, lang);
      const shortcutKey = TAB_SHORTCUT_KEYS[id] || label[0];
      const text = ` [${shortcutKey}] ${label} `;
      const el = blessed.box({
        parent: this.screen,
        top: 3,
        left: xOffset,
        width: text.length,
        height: 1,
        content: text,
        tags: false,
        wrap: false,
        keys: true,
        focusable: true,
        style: { fg: COLORS.focusCyan, bg: COLORS.tabBarBg },
      });
      this._tabItems[id] = el;
      this._tabItemXOffsets[id] = xOffset;
      xOffset += text.length + 1; // 1-space gap between tabs
    }

    // Right-aligned Quit item — direct screen child at absolute top:3
    const _quitText  = ' [Q] Quit ';
    const _quitBase  = _quitText;
    const _quitBlock = _quitText.slice(0, -1) + '█';
    let _quitInterval = null;
    this._quitItem = blessed.box({
      parent: this.screen,
      top: 3,
      right: 1,
      width: _quitText.length,
      height: 1,
      content: _quitText,
      tags: false,
      keys: true,
      focusable: true,
      style: { fg: '#ef9a9a', bg: COLORS.tabBarBg },  // soft red — matches header quit hint
    });
    this._quitItem.on('focus', () => {
      this._quitItem.style.fg = 'white';
      this._quitItem.style.bg = '#9c27b0';
      this._quitItem.setContent(_quitBlock);
      this.screen.render();
      if (_quitInterval) { clearInterval(_quitInterval); _quitInterval = null; }
      _quitInterval = setInterval(() => {
        const on = this._quitItem.content === _quitBlock;
        this._quitItem.setContent(on ? _quitBase : _quitBlock);
        this.screen.render();
      }, 500);
    });
    this._quitItem.on('blur', () => {
      if (_quitInterval) { clearInterval(_quitInterval); _quitInterval = null; }
      this._quitItem.setContent(_quitBase);
      this._quitItem.style.fg = '#ef9a9a';
      this._quitItem.style.bg = COLORS.tabBarBg;
      this.screen.render();
    });
    this._quitItem.key(['enter', 'space', 'q', 'Q'], () => {
      this.screen.destroy();
      process.exit(0);
    });

    // Keyboard navigation on the main tab items
    const tabIds = TAB_ORDER;
    for (let i = 0; i < tabIds.length; i++) {
      const el = this._tabItems[tabIds[i]];

      // Blinking block cursor: replace trailing space with █, toggle at 500ms
      // Always derive from current el.content so language changes are preserved.
      const _getBaseContent = () => el.content.replace(/█$/, ' ');
      let _cursorInterval = null;
      let _cursorOn       = false;

      el.on('focus', () => {
        el.style.fg = 'white';
        el.style.bg = '#9c27b0'; // purple — cursor on this tab item
        _cursorOn = true;
        const _base  = _getBaseContent();
        const _block = _base.slice(0, -1) + '█';
        el.setContent(_block);
        this.screen.render();
        if (_cursorInterval) { clearInterval(_cursorInterval); _cursorInterval = null; }
        _cursorInterval = setInterval(() => {
          _cursorOn = !_cursorOn;
          const b = _getBaseContent();
          el.setContent(_cursorOn ? b.slice(0, -1) + '█' : b);
          this.screen.render();
        }, 500);
      });
      el.on('blur', () => {
        if (_cursorInterval) { clearInterval(_cursorInterval); _cursorInterval = null; }
        el.setContent(_getBaseContent());
        // navigationService set up after _createTabBar, but blur fires lazily — safe
        this._updateTabBar(this.navigationService?.getActiveTab() ?? tabIds[0]);
        this.screen.render();
      });

      el.key(['left'], () => {
        if (i === 0) {
          this._quitItem?.focus();  // wrap: first tab ← → Quit
        } else {
          this._tabItems[tabIds[i - 1]].focus();
        }
      });
      el.key(['right'], () => {
        if (i === tabIds.length - 1) {
          this._quitItem?.focus();  // wrap: last tab → → Quit
        } else {
          this._tabItems[tabIds[i + 1]].focus();
        }
      });
      el.key(['enter', 'space'], () => {
        this.navigationService.switchTab(tabIds[i]);
      });
      // ↓ or Escape returns focus to the active tab's content
      el.key(['down', 'escape'], () => {
        const activeTab = this.tabs[this.navigationService.getActiveTab()];
        if (activeTab && typeof activeTab.onFocus === 'function') activeTab.onFocus();
      });

      // Tab: forward through header items; last item → Quit item
      el.key(['tab'], () => {
        if (i < tabIds.length - 1) {
          this._tabItems[tabIds[i + 1]].focus();
        } else {
          this._quitItem?.focus();
        }
      });
      // S-tab: backward through header items; first item → active tab's last bottom button
      el.key(['S-tab'], () => {
        if (i > 0) {
          this._tabItems[tabIds[i - 1]].focus();
        } else {
          const activeTab = this.tabs?.[this.navigationService?.getActiveTab()];
          if (activeTab && typeof activeTab.focusLastBottomRow === 'function') {
            activeTab.focusLastBottomRow();
          } else {
            this._quitItem?.focus();
          }
        }
      });
    }

    // Wire Quit item ← → and Tab/S-tab into the header navigation cycle
    this._quitItem.key(['left'], () => {
      this._tabItems[tabIds[tabIds.length - 1]]?.focus();  // ← Quit → last tab (Help)
    });
    this._quitItem.key(['right'], () => {
      this._tabItems[tabIds[0]]?.focus();  // → Quit → first tab (Install), wrap
    });
    this._quitItem.key(['tab'], () => {
      const activeTab = this.tabs?.[this.navigationService?.getActiveTab()];
      if (activeTab && typeof activeTab.focusBottomRow === 'function') {
        activeTab.focusBottomRow();
      } else {
        this._tabItems[tabIds[0]]?.focus();
      }
    });
    this._quitItem.key(['S-tab'], () => {
      this._tabItems[tabIds[tabIds.length - 1]]?.focus();
    });
    this._quitItem.key(['down', 'escape'], () => {
      const activeTab = this.tabs?.[this.navigationService?.getActiveTab()];
      if (activeTab && typeof activeTab.onFocus === 'function') activeTab.onFocus();
    });
  }

  // ---------------------------------------------------------------------------
  // Private: Update tab bar — set active item style, reset all others.

  _updateTabBar(activeTabId) {
    if (!this._tabItems) return; // guard: not initialized in test mode
    for (const [id, el] of Object.entries(this._tabItems)) {
      if (id === activeTabId) {
        el.style.fg = 'white';
        el.style.bg = '#0288d1'; // bright light blue — matches sub-tab active color
        el.style.bold = true;
      } else {
        el.style.fg = COLORS.focusCyan;
        el.style.bg = COLORS.tabBarBg;
        el.style.bold = false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Refresh all chrome strings (header subtitle, tab bar labels) when lang changes

  _refreshChrome(lang) {
    // Update header subtitle "Customization Tool"
    if (this._headerSubtitleText) {
      this._headerSubtitleText.setContent(`{green-fg}${t(lang, 'customizationTool')}{/green-fg}`);
    }
    if (this._headerQuitText) {
      this._headerQuitText.setContent(`{#ef9a9a-fg}${t(lang, 'quitLabel')}{/#ef9a9a-fg}`);
    }

    // Update tab bar item labels — resize and reposition to fit translated labels
    let xOffset = 1;
    for (const id of TAB_ORDER) {
      const el = this._tabItems?.[id];
      if (!el) continue;
      const label = getTabLabel(id, lang);
      const shortcutKey = TAB_SHORTCUT_KEYS[id] || label[0];
      const text = ` [${shortcutKey}] ${label} `;
      el.left = xOffset;
      el.width = text.length;
      el.setContent(text);
      xOffset += text.length + 1;
    }

    // Update active tab's footer text if it supports language-aware footer
    const activeId = this.navigationService?.getActiveTab();
    if (activeId) this._updateContextFooter(activeId);

    this.screen.render();
  }

  // ---------------------------------------------------------------------------
  // Private: Render tab bar content string for given active tab
  // (kept as a pure helper for unit tests; real rendering uses _updateTabBar)

  _renderTabBarContent(activeTabId) {
    const lang = this._languageService?.getLang() ?? 'en';
    return TAB_ORDER.map(id => {
      const label = getTabLabel(id, lang);
      const shortcutKey = TAB_SHORTCUT_KEYS[id] || label[0];
      if (id === activeTabId) {
        return `{bold}{white-fg}[${shortcutKey}] ${label}{/white-fg}{/bold}`;
      }
      return `{bright-cyan-fg}[${shortcutKey}] ${label}{/bright-cyan-fg}`;
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
      content: `  ${badges}  {#ffff00-fg}⭐ Love AgentVibes? Give us a star!{/#ffff00-fg}  github.com/preibisch/agentvibes`,
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
    this._configService = configService;
    this._providerService = providerService;
    const languageService = new LanguageService();
    this._languageService = languageService;
    // Refresh UI chrome when language changes
    languageService.onChange(lang => this._refreshChrome(lang));
    const services = {
      configService,
      providerService,
      languageService,
      navigationService: this.navigationService,
      updateHeaderStatus: () => this._updateHeaderStatus(),
      focusMainTabBar: () => {
        const id = this.navigationService.getActiveTab();
        const item = this._tabItems?.[id];
        if (item) item.focus();
      },
      focusFirstHeaderItem: () => {
        this._tabItems?.[TAB_ORDER[0]]?.focus();
      },
      focusLastHeaderItem: () => {
        this._tabItems?.[TAB_ORDER[TAB_ORDER.length - 1]]?.focus();
      },
    };
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

    // Destroy agents placeholder and mount real agents tab
    const agentsPlaceholder = this.tabs['agents'];
    if (agentsPlaceholder && typeof agentsPlaceholder.destroy === 'function') {
      agentsPlaceholder.destroy();
    }
    this.tabs['agents'] = createAgentsTab(this.screen, services);

    // Destroy receiver placeholder and mount real receiver tab
    const receiverPlaceholder = this.tabs['receiver'];
    if (receiverPlaceholder && typeof receiverPlaceholder.destroy === 'function') {
      receiverPlaceholder.destroy();
    }
    this.tabs['receiver'] = createReceiverTab(this.screen, services);

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
        // Nuclear clear: wipe the content area (row 4+) to remove stale cell content
        // from the previous tab. Start at row 4 — header (0-2) and tab bar (3) are
        // static widgets that don't need clearing; wiping them causes the double
        // tab bar artifact (row 2 of header shows tab bar ghost from prior render).
        // blessed's render loop never resets the `lines` buffer before rendering
        // (see: blessed/lib/widgets/screen.js line 733, commented-out clear).
        this.screen.clearRegion(0, this.screen.cols, 4, this.screen.rows - 2);

        // Force-invalidate olines for the entire visible area (rows 0..rows-3).
        // Includes header rows 0-1 so the branded header is always redrawn on
        // tab switches — prevents corruption from persisting across tabs.
        // Row 2 (header bottom), row 3 (tab bar) and content rows accumulate
        // ghost rendering artifacts — draw() skips them when lines==olines even
        // though the terminal still shows stale chars from earlier renders.
        // Setting attr=-1 is impossible for any real cell, so draw() is forced
        // to physically rewrite every cell on the next render call.
        for (let r = 0; r < this.screen.rows - 2; r++) {
          const orow = this.screen.olines[r];
          if (!orow) continue;
          for (let c = 0; c < this.screen.cols; c++) {
            if (orow[c]) orow[c][0] = -1; // impossible attr — forces draw() rewrite
          }
          orow.dirty = true;
        }

        // Row 2 (header bottom) is never dirty after draw 1 — its content (headerBg+
        // spaces) never changes so element.render() never marks it dirty.  The olines
        // invalidation above sets olines[2][c][0]=-1, but draw() only compares cells
        // when lines[r].dirty is true; a false dirty flag skips the entire row without
        // ever consulting olines.  Force-mark it dirty so draw() emits the explicit
        // cup(3,1)+headerBg+spaces sequence and overwrites any ghost terminal content.
        if (this.screen.lines?.[2]) this.screen.lines[2].dirty = true;

        // Update tab bar, footer, and header status inside suppression — no intermediate render.
        this._updateTabBar(tabId);
        this._updateContextFooter(tabId);
        this._updateHeaderStatus();

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
            // Move any screen-level overlay widgets (e.g. junction chars) to front
            // AFTER box.setFront() so they render on top of the box border.
            if (typeof activeTab.moveOverlaysToFront === 'function') {
              activeTab.moveOverlaysToFront();
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
    setupNavigation(this.screen, this.navigationService, () => {
      const id = this.navigationService.getActiveTab();
      const item = this._tabItems?.[id];
      if (item) item.focus();
    });
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
