/**
 * AgentVibes TUI Console — Install Tab (Installer Wizard)
 * Epic 12: Stories 12.1-12.5
 *
 * Implements the Tab Component Contract:
 *   createInstallTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * 5-screen wizard flow:
 *   Screen 1: Welcome & Purpose
 *   Screen 2: Auto Dependency Check
 *   Screen 3: Provider Selection
 *   Screen 4: Voice Config & Intro Text
 *   Screen 5: Complete & TTS Greeting
 */

import path from 'node:path';
import { execFileSync } from 'node:child_process';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#283593',  // Indigo — install tab headers
  labelFg:    '#e3f2fd',
  valueFg:    '#ffd700',
  successFg:  '#69f0ae',  // Green — success
  errorFg:    '#ef9a9a',  // Red — error/missing
  btnDefault: '#283593',
  btnFocus:   '#3f51b5',
  btnFocusFg: '#ffffff',
  btnPress:   '#ff00ff',
  borderFg:   '#3f51b5',
  footerBg:   '#3f51b5',  // Indigo — Install tab footer
  noticeFg:   '#90a4ae',
};

const FOOTER_TEXT = '[Enter] Continue/Finish  [Esc] Back/Exit  [C] Open Console  [S/V/M/A/R] Tab  [Q] Quit';

// ---------------------------------------------------------------------------
// Exported pure helpers (stories 12.1, 12.5)

/**
 * Returns the default intro text suggestion (project folder name).
 * @param {string} projectDir
 * @returns {string}
 */
export function getIntroDefault(projectDir) {
  if (!projectDir) return '';
  return path.basename(projectDir);
}

/**
 * Format the TTS greeting message for Screen 5.
 * @param {string} introText - User's intro text (may be empty)
 * @param {string} projectName - Project folder name
 * @returns {string}
 */
export function formatGreeting(introText, projectName) {
  const name = introText || projectName || 'AgentVibes';
  return `${name} is ready! Welcome to AgentVibes. ⭐ Star us on GitHub at github.com/preibisch/agentvibes`;
}

// ---------------------------------------------------------------------------
// Dependency detection helpers (story 12.2)

/**
 * Check if a command exists on the system.
 * @param {string} cmd
 * @returns {boolean}
 */
function _commandExists(cmd) {
  try {
    execFileSync(cmd, ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execFileSync(cmd, ['-version'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Run dependency checks. Returns results map.
 * @returns {{ node: boolean, npm: boolean, piper: boolean, soprano: boolean }}
 */
function _checkDependencies() {
  return {
    node:    _commandExists('node'),
    npm:     _commandExists('npm'),
    piper:   _commandExists('piper'),
    soprano: _commandExists('soprano-tts') || _commandExists('soprano-webui'),
  };
}

// ---------------------------------------------------------------------------
// Test stub

function createTestStub() {
  return {
    box: {},
    show: () => {},
    hide: () => {},
    onFocus: () => {},
    onBlur: () => {},
    getFooterText: () => FOOTER_TEXT,
    getFooterColor: () => COLORS.footerBg,
  };
}

// ---------------------------------------------------------------------------

/**
 * Create the Install tab component.
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @param {import('../../services/config-service.js').ConfigService}   services.configService
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createInstallTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService } = services;

  // -------------------------------------------------------------------------
  // Container

  const box = blessed.box({
    parent: screen,
    top: 4,
    left: 0,
    width: '100%',
    bottom: 2,
    hidden: true,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    border: { type: 'line' },
    borderStyle: { fg: COLORS.borderFg },
  });

  // -------------------------------------------------------------------------
  // Wizard state

  let _screen = 1;
  let _deps = null;
  let _selectedProvider = null;
  let _introText = getIntroDefault(process.cwd());

  // -------------------------------------------------------------------------
  // Content area (redrawn per screen)

  const contentBox = blessed.box({
    parent: box,
    top: 1,
    left: 2,
    width: '96%',
    bottom: 5,
    tags: true,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  // Footer hint
  const hintLine = blessed.text({
    parent: box,
    bottom: 2,
    left: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Screen renderers

  function _renderScreen1() {
    contentBox.setContent([
      `{bold}{#3f51b5-fg}AgentVibes v4.0 — Setup Wizard{/#3f51b5-fg}{/bold}`,
      '',
      '  What AgentVibes does:',
      '  • Text-to-Speech for AI assistants (Claude Code, Cursor, etc.)',
      '  • 900+ voice library via Piper TTS',
      '  • 21 personality profiles (calm, excited, professional...)',
      '  • Background music while Claude thinks',
      '',
      `  {${COLORS.valueFg}-fg}Press [Enter] to begin setup  |  [Esc] to exit{/${COLORS.valueFg}-fg}`,
    ].join('\n'));
    hintLine.setContent('  Screen 1/5: Welcome');
    screen.render();
  }

  function _renderScreen2() {
    _deps = _checkDependencies();
    const ok  = c => `{${COLORS.successFg}-fg}✅ Installed{/${COLORS.successFg}-fg}`;
    const bad = c => `{${COLORS.errorFg}-fg}❌ Not found{/${COLORS.errorFg}-fg}`;

    contentBox.setContent([
      `{bold}{#3f51b5-fg}── Dependency Check ${'─'.repeat(47)}{/#3f51b5-fg}{/bold}`,
      '',
      `  Node.js   ${_deps.node    ? ok() : bad()}`,
      `  npm       ${_deps.npm     ? ok() : bad()}`,
      `  Piper     ${_deps.piper   ? ok() : bad()}`,
      `  Soprano   ${_deps.soprano ? ok() : bad()}`,
      '',
      _deps.piper || _deps.soprano
        ? `  {${COLORS.successFg}-fg}✅ Provider detected — press [Enter] to continue{/${COLORS.successFg}-fg}`
        : `  {${COLORS.errorFg}-fg}⚠ No TTS provider detected. Install Piper or Soprano first.{/${COLORS.errorFg}-fg}`,
    ].join('\n'));
    hintLine.setContent('  Screen 2/5: Dependencies');
    screen.render();
  }

  function _renderScreen3() {
    const providers = [];
    if (_deps?.piper)   providers.push('piper');
    if (_deps?.soprano) providers.push('soprano');

    if (providers.length === 0) providers.push('piper');  // fallback
    if (!_selectedProvider) _selectedProvider = providers[0];

    const items = providers.map(p =>
      p === _selectedProvider
        ? `{bold}{${COLORS.valueFg}-fg} ● ${p}{/${COLORS.valueFg}-fg}{/bold}`
        : `   ${p}`
    );

    contentBox.setContent([
      `{bold}{#3f51b5-fg}── Provider Selection ${'─'.repeat(46)}{/#3f51b5-fg}{/bold}`,
      '',
      '  Available providers:',
      ...items.map(i => `  ${i}`),
      '',
      `  {${COLORS.valueFg}-fg}[↑↓] Navigate  [Enter] Select & Continue{/${COLORS.valueFg}-fg}`,
    ].join('\n'));
    hintLine.setContent('  Screen 3/5: Provider');
    screen.render();
  }

  function _renderScreen4() {
    contentBox.setContent([
      `{bold}{#3f51b5-fg}── Voice & Intro Text ${'─'.repeat(46)}{/#3f51b5-fg}{/bold}`,
      '',
      `  Provider:   ${_selectedProvider ?? 'piper'}`,
      `  Voice:      (default for ${_selectedProvider ?? 'piper'})`,
      '',
      `  Intro text: ${_introText || '(disabled)'}`,
      '',
      '  The intro text is spoken before every TTS message.',
      '  Example: "FireBot:" → "FireBot: Done!"',
      '',
      `  {${COLORS.valueFg}-fg}Press [Enter] to accept and install  |  [E] Edit intro text{/${COLORS.valueFg}-fg}`,
    ].join('\n'));
    hintLine.setContent('  Screen 4/5: Config');
    screen.render();
  }

  function _renderScreen5() {
    const greeting = formatGreeting(_introText, getIntroDefault(process.cwd()));
    contentBox.setContent([
      `{bold}{#3f51b5-fg}── Installation Complete ${'─'.repeat(43)}{/#3f51b5-fg}{/bold}`,
      '',
      `  {${COLORS.successFg}-fg}✅ AgentVibes is configured!{/${COLORS.successFg}-fg}`,
      '',
      `  Provider:    ${_selectedProvider ?? 'piper'}`,
      `  Intro text:  ${_introText || '(disabled)'}`,
      '',
      '  TTS Greeting:',
      `  "${greeting}"`,
      '',
      `  {${COLORS.valueFg}-fg}[Enter] Finish  |  [C] Open Console  |  ⭐ Star on GitHub!{/${COLORS.valueFg}-fg}`,
    ].join('\n'));
    hintLine.setContent('  Screen 5/5: Complete');

    // Save configuration
    configService.set('provider', _selectedProvider ?? 'piper');
    if (_introText) configService.set('introText', _introText);

    screen.render();
  }

  function _showCurrentScreen() {
    switch (_screen) {
      case 1: _renderScreen1(); break;
      case 2: _renderScreen2(); break;
      case 3: _renderScreen3(); break;
      case 4: _renderScreen4(); break;
      case 5: _renderScreen5(); break;
    }
  }

  // -------------------------------------------------------------------------
  // Navigation

  box.key(['enter'], () => {
    if (_screen < 5) {
      _screen++;
      _showCurrentScreen();
    } else {
      // Screen 5: Finish — close box
      box.hide();
      screen.render();
    }
  });

  box.key(['escape'], () => {
    if (_screen > 1) {
      _screen--;
      _showCurrentScreen();
    } else {
      box.hide();
      screen.render();
    }
  });

  box.key(['up'], () => {
    if (_screen === 3 && _deps) {
      const providers = [];
      if (_deps.piper)   providers.push('piper');
      if (_deps.soprano) providers.push('soprano');
      const idx = providers.indexOf(_selectedProvider ?? providers[0]);
      _selectedProvider = providers[Math.max(0, idx - 1)];
      _renderScreen3();
    }
  });

  box.key(['down'], () => {
    if (_screen === 3 && _deps) {
      const providers = [];
      if (_deps.piper)   providers.push('piper');
      if (_deps.soprano) providers.push('soprano');
      const idx = providers.indexOf(_selectedProvider ?? providers[0]);
      _selectedProvider = providers[Math.min(providers.length - 1, idx + 1)];
      _renderScreen3();
    }
  });

  box.key(['c', 'C'], () => {
    if (_screen === 5) {
      // Signal to open console (handled by navigation service)
      box.hide();
      screen.render();
    }
  });

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,

    show() {
      _screen = 1;
      box.show();
      _showCurrentScreen();
      screen.render();
    },

    hide() {
      box.hide();
      screen.render();
    },

    onFocus() {
      box.focus();
      screen.render();
    },

    onBlur() {},

    getFooterText() {
      return FOOTER_TEXT;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
