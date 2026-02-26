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
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const _execFileAsync = promisify(execFile);

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#7986cb',  // Light indigo/purple — section headers (matches settings tab)
  labelFg:    '#e3f2fd',
  valueFg:    '#ffd700',
  brandPink:  '#e91e63',  // Brand pink — AgentVibes logotype
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
 * Check if a command exists on the system (async).
 * Only ENOENT means "not installed" — non-zero exit code still means the binary exists.
 * @param {string} cmd
 * @returns {Promise<boolean>}
 */
async function _commandExistsAsync(cmd) {
  try {
    await _execFileAsync(cmd, ['--version'], { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    return true;  // binary exists but --version returned non-zero
  }
}

/**
 * Run dependency checks asynchronously. Returns results map.
 * @returns {Promise<{ node: boolean, npm: boolean, piper: boolean, soprano: boolean }>}
 */
async function _checkDependenciesAsync() {
  const [node, npm, piper, sopranoTts, sopranoWebui] = await Promise.all([
    _commandExistsAsync('node'),
    _commandExistsAsync('npm'),
    _commandExistsAsync('piper'),
    _commandExistsAsync('soprano-tts'),
    _commandExistsAsync('soprano-webui'),
  ]);
  return { node, npm, piper, soprano: sopranoTts || sopranoWebui };
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

  const { configService, navigationService } = services;

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
  let _lastScreen = 0;
  let _deps = null;
  let _checking = false;
  let _selectedProvider = null;
  let _introText = getIntroDefault(process.cwd());
  let _screen5Announced    = false;  // TTS greeting fires once per wizard run
  let _completionModalOpen = false;
  let _completionModalBox  = null;

  // -------------------------------------------------------------------------
  // Content area — single persistent box, never detached.
  //
  // KEY INSIGHT: detach+recreate fails because the new widget has no previous
  // cell state, so blessed's diff renderer doesn't know which cells to clear.
  // Keeping the SAME element and calling setContent('') lets blessed diff
  // old-content → empty and write spaces over every character that was there.

  const contentBox = blessed.box({
    parent: box,
    top: 1,
    left: 2,
    width: '96%',
    bottom: 5,
    tags: true,
    wrap: false,
    scrollable: false,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  // Footer hint
  const hintLine = blessed.text({
    parent: box,
    bottom: 2,
    left: 2,
    right: 2,   // explicit right bound — prevents blessed auto-shrink which leaves stale chars
    tags: true,
    content: '',
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });

  function _c(lines) { return lines.join('\n'); }

  // -------------------------------------------------------------------------
  // Screen 4 action button callbacks

  function _doEdit() {
    if (box.hidden || _screen !== 4) return;
    const prompt = blessed.prompt({
      parent: screen,
      top: 'center',
      left: 'center',
      height: 'shrink',
      width: '60%',
      border: 'line',
      tags: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: COLORS.sectionHdr },
        label: { fg: COLORS.sectionHdr },
      },
    });
    prompt.input('Intro text (prefix spoken before every TTS message):', _introText, (err, val) => {
      prompt.destroy();
      if (!err && val !== null) {
        _introText = val.trim();
        _renderScreen4();
      }
      screen.render();
    });
    screen.render();
  }

  function _doPreview() {
    if (box.hidden || _screen !== 4) return;
    const introVal  = _introText || getIntroDefault(process.cwd()) || 'AgentVibes';
    const ttsText   = `${introVal}: Here`;
    const ttsScript = path.resolve(process.cwd(), '.claude/hooks/play-tts.sh');
    execFile('bash', [ttsScript, ttsText], {
      env: { ...process.env, PULSE_SERVER: 'unix:/mnt/wslg/PulseServer' },
      timeout: 30000,
    }, () => {});
  }

  function _doAccept() {
    if (_screen !== 4) return;
    _screen++;
    _showCurrentScreen();
  }

  // -------------------------------------------------------------------------
  // Screen 4 action buttons — real blessed widgets for keyboard focus + ←/→ nav

  function _createInstallBtn(label, bg, onClick) {
    const btn = blessed.button({
      parent: box,
      content: label,
      mouse: true,
      keys: true,
      shrink: true,
      hidden: true,
      padding: { left: 1, right: 1 },
      style: {
        bg,
        fg: '#ffffff',
        focus: { bg: COLORS.btnFocus, fg: '#000000', bold: true },
        hover: { bg: COLORS.btnFocus, fg: '#000000', bold: true },
      },
    });
    btn.key(['enter', 'space'], onClick);
    btn.on('click', () => btn.press());
    return btn;
  }

  const _editBtn    = _createInstallBtn('Edit',              '#1565c0', _doEdit);
  const _previewBtn = _createInstallBtn('Preview',           '#e65100', _doPreview);
  const _acceptBtn  = _createInstallBtn('✓ Accept & Install','#2e7d32', _doAccept);

  _editBtn.top    = 9;  _editBtn.left    = 4;
  _previewBtn.top = 9;  _previewBtn.left = 12;
  _acceptBtn.top  = 13; _acceptBtn.left  = 4;

  // ←/→ navigation between the three buttons
  // Note: Tab is NOT used here — 'tab' is registered globally by navigation.js (cycles tabs)
  _editBtn.key(['right'],            () => { _previewBtn.focus(); screen.render(); });
  _previewBtn.key(['right'],         () => { _acceptBtn.focus();  screen.render(); });
  _acceptBtn.key(['right'],          () => { _editBtn.focus();    screen.render(); });
  _previewBtn.key(['left', 'S-tab'], () => { _editBtn.focus();    screen.render(); });
  _acceptBtn.key(['left', 'S-tab'],  () => { _previewBtn.focus(); screen.render(); });
  _editBtn.key(['left', 'S-tab'],    () => { _acceptBtn.focus();  screen.render(); });

  // -------------------------------------------------------------------------
  // Screen renderers

  const _HDR = (emoji, label) =>
    `{${COLORS.sectionHdr}-fg}${emoji}  ${label} ${'─'.repeat(100)}{/${COLORS.sectionHdr}-fg}`;

  function _renderScreen1() {
    contentBox.setContent(_c([
      _HDR('🔧', 'Setup Wizard'),
      '',
      `  {${COLORS.noticeFg}-fg}TTS for AI assistants with personality.{/${COLORS.noticeFg}-fg}`,
      '',
      `  {${COLORS.valueFg}-fg}Press [Enter] to begin  |  [Esc] to exit{/${COLORS.valueFg}-fg}`,
    ]));
    hintLine.setContent('  Screen 1/5: Welcome  |  [→] or [Enter] Next  |  [Esc] Exit');
    screen.render();
  }

  async function _renderScreen2() {
    const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let frameIdx = 0;
    _checking = true;

    contentBox.setContent(_c([
      _HDR('🔍', 'Dependency Check'),
      '',
      `  {${COLORS.noticeFg}-fg}${frames[0]}  Checking dependencies...{/${COLORS.noticeFg}-fg}`,
    ]));
    hintLine.setContent('  Screen 2/5: Dependencies  |  [←] Back  |  [Enter] Next');
    screen.render();

    const spinInterval = setInterval(() => {
      frameIdx = (frameIdx + 1) % frames.length;
      contentBox.setContent(_c([
        _HDR('🔍', 'Dependency Check'),
        '',
        `  {${COLORS.noticeFg}-fg}${frames[frameIdx]}  Checking dependencies...{/${COLORS.noticeFg}-fg}`,
      ]));
      screen.render();
    }, 100);

    try {
      _deps = await _checkDependenciesAsync();
    } finally {
      clearInterval(spinInterval);
      _checking = false;
    }

    const ok  = () => `{${COLORS.successFg}-fg}✅  Installed{/${COLORS.successFg}-fg}`;
    const bad = () => `{${COLORS.errorFg}-fg}❌  Not found{/${COLORS.errorFg}-fg}`;

    contentBox.setContent(_c([
      _HDR('🔍', 'Dependency Check'),
      '',
      `  {${COLORS.noticeFg}-fg}${'Dependency'.padEnd(14)}Status{/${COLORS.noticeFg}-fg}`,
      `  {${COLORS.noticeFg}-fg}${'─'.repeat(78)}{/${COLORS.noticeFg}-fg}`,
      `  {${COLORS.labelFg}-fg}${'Node.js'.padEnd(14)}{/${COLORS.labelFg}-fg}${_deps.node    ? ok() : bad()}`,
      `  {${COLORS.labelFg}-fg}${'npm'.padEnd(14)}{/${COLORS.labelFg}-fg}${_deps.npm     ? ok() : bad()}`,
      `  {${COLORS.labelFg}-fg}${'Piper TTS'.padEnd(14)}{/${COLORS.labelFg}-fg}${_deps.piper   ? ok() : bad()}`,
      `  {${COLORS.labelFg}-fg}${'Soprano TTS'.padEnd(14)}{/${COLORS.labelFg}-fg}${_deps.soprano ? ok() : bad()}`,
      '',
      _deps.piper || _deps.soprano
        ? `  {${COLORS.successFg}-fg}✅  TTS Providers Detected — press Enter to continue{/${COLORS.successFg}-fg}`
        : `  {${COLORS.errorFg}-fg}⚠   No TTS provider found. Install Piper or Soprano first.{/${COLORS.errorFg}-fg}`,
    ]));
    screen.render();
  }

  function _renderScreen3() {
    const providers = [];
    if (_deps?.piper)   providers.push('piper');
    if (_deps?.soprano) providers.push('soprano');

    if (providers.length === 0) providers.push('piper');  // fallback
    if (!_selectedProvider) _selectedProvider = providers[0];

    // Pad items to 78 visible chars so they overwrite any stale cells from Screen 2.
    const items = providers.map(p =>
      p === _selectedProvider
        ? `{bold}{${COLORS.valueFg}-fg} ● ${p.padEnd(74)}{/${COLORS.valueFg}-fg}{/bold}`
        : `   ${p.padEnd(75)}`
    );

    contentBox.setContent(_c([
      _HDR('🎤', 'Provider Selection'),
      '',
      `  {${COLORS.noticeFg}-fg}${'Available TTS providers:'.padEnd(76)}{/${COLORS.noticeFg}-fg}`,
      '',
      ...items.map(i => `  ${i}`),
      '',
      `  {${COLORS.valueFg}-fg}${'[↑↓] Navigate  [Enter] Select & Continue'.padEnd(76)}{/${COLORS.valueFg}-fg}`,
    ]));
    hintLine.setContent('  Screen 3/5: Provider  |  [←] Back  |  [↑↓] Choose  |  [Enter] Select');
    screen.render();
  }

  function _renderScreen4() {
    const provider = _selectedProvider ?? 'piper';
    const intro = _introText || '';
    const folderName = getIntroDefault(process.cwd()) || 'AgentVibes';
    const example = `${folderName}: Here`;

    contentBox.setContent(_c([
      _HDR('🎤', 'Provider & Voice'),
      '',
      `  {${COLORS.labelFg}-fg}${'Provider:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.valueFg}-fg}${provider}{/${COLORS.valueFg}-fg}`,
      `  {${COLORS.labelFg}-fg}${'Voice:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.noticeFg}-fg}(default for ${provider}){/${COLORS.noticeFg}-fg}`,
      '',
      _HDR('✍️', 'Intro Text'),
      '',
      `  {${COLORS.labelFg}-fg}${'Intro text:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.valueFg}-fg}${intro || '(none)'}{/${COLORS.valueFg}-fg}`,
      '',  // ← [Edit]  [Preview]  buttons rendered as real widgets here (box row 9)
      '',
      `  {${COLORS.noticeFg}-fg}Example:{/${COLORS.noticeFg}-fg}  {${COLORS.valueFg}-fg}"${example}"{/${COLORS.valueFg}-fg}`,
      '',
      '',  // ← [✓ Accept & Install] button rendered as real widget here (box row 13)
    ]));
    hintLine.setContent('  Screen 4/5: Config  |  [Esc] Back  |  [E] Edit  |  [P] Preview TTS  |  [Enter] Accept & Install');
    _editBtn.focus();
    screen.render();
  }

  function _renderScreen5() {
    const provider = _selectedProvider ?? 'piper';
    const homeDir  = process.env.HOME || '';
    const globalPath  = configService.getGlobalConfigPath().replace(homeDir, '~');
    const localPath   = configService.getLocalConfigPath().replace(process.cwd() + '/', './');

    const saveBtn   = `{#2e7d32-bg}{white-fg}  ✓  Save Configuration & Install  [Enter]  {/white-fg}{/#2e7d32-bg}`;
    const cancelBtn = `{#f44336-bg}{white-fg}  ✗  Cancel  [Esc]  {/white-fg}{/#f44336-bg}`;

    contentBox.setContent(_c([
      _HDR('🎉', 'Configuration Complete'),
      '',
      `  {${COLORS.successFg}-fg}AgentVibes is configured and ready!{/${COLORS.successFg}-fg}`,
      '',
      `  {${COLORS.labelFg}-fg}${'Provider:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.valueFg}-fg}${provider}{/${COLORS.valueFg}-fg}`,
      `  {${COLORS.labelFg}-fg}${'Intro text:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.valueFg}-fg}${_introText || '(none)'}{/${COLORS.valueFg}-fg}`,
      '',
      _HDR('💾', 'Settings Location'),
      '',
      `  {${COLORS.labelFg}-fg}${'Global:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.noticeFg}-fg}${globalPath}{/${COLORS.noticeFg}-fg}`,
      `  {${COLORS.labelFg}-fg}${'Project:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.noticeFg}-fg}${localPath}{/${COLORS.noticeFg}-fg}`,
      '',
      `  {${COLORS.noticeFg}-fg}⭐ Star us on GitHub: github.com/preibisch/agentvibes{/${COLORS.noticeFg}-fg}`,
      '',
      `  ${saveBtn}    ${cancelBtn}`,
    ]));
    hintLine.setContent('  Screen 5/5: Complete  |  [Enter] Save & Install  |  [Esc] Cancel');

    // Auto-announce via TTS the first time this screen is shown this session
    if (!_screen5Announced) {
      _screen5Announced = true;
      const greeting = formatGreeting(_introText, getIntroDefault(process.cwd()));
      const ttsScript = path.resolve(process.cwd(), '.claude/hooks/play-tts.sh');
      execFile('bash', [ttsScript, greeting], {
        env: { ...process.env, PULSE_SERVER: 'unix:/mnt/wslg/PulseServer' },
        timeout: 30000,
      }, () => {});
    }

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Completion modal (shown after Save on Screen 5)

  function _showCompletionModal() {
    _completionModalOpen = true;
    const okBtn = `{#2e7d32-bg}{white-fg}    ✓  OK  [Enter]    {/white-fg}{/#2e7d32-bg}`;
    _completionModalBox = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 54,
      height: 11,
      border: 'line',
      tags: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: '#2e7d32' },
      },
      content: _c([
        '',
        `  {${COLORS.successFg}-fg}✅  Installation Complete!{/${COLORS.successFg}-fg}`,
        '',
        `  {${COLORS.noticeFg}-fg}Configuration has been saved successfully.{/${COLORS.noticeFg}-fg}`,
        `  {${COLORS.noticeFg}-fg}Taking you to the Settings tab.{/${COLORS.noticeFg}-fg}`,
        '',
        `  ${okBtn}`,
        '',
      ]),
    });
    screen.render();
  }

  function _dismissCompletionModal() {
    if (_completionModalBox) {
      _completionModalBox.destroy();
      _completionModalBox = null;
    }
    _completionModalOpen = false;
    box.hide();
    screen.render();
    navigationService?.switchTab('settings');
  }

  function _showCurrentScreen() {
    // Show Screen 4 action buttons only on screen 4
    if (_screen === 4) {
      _editBtn.show(); _previewBtn.show(); _acceptBtn.show();
    } else {
      _editBtn.hide(); _previewBtn.hide(); _acceptBtn.hide();
    }

    if (_screen !== _lastScreen) {
      // Clear via setContent('') so blessed diffs old→empty and repaints
      // every cell that had a character.  hintLine likewise.
      contentBox.setContent('');
      hintLine.setContent('');
      screen.render();
      _lastScreen = _screen;
    }
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

  // Use screen.key() instead of box.key() so handlers fire regardless of which
  // blessed element currently holds focus.  Guard with `box.hidden` so they are
  // no-ops when another tab is active.

  screen.key(['enter'], () => {
    if (box.hidden || _checking) return;
    if (_screen === 4) return;  // Screen 4: Enter handled by the focused button
    if (_completionModalOpen) { _dismissCompletionModal(); return; }
    if (_screen < 5) {
      _screen++;
      _showCurrentScreen();
    } else {
      // Screen 5 "Save Configuration & Install" — persist config, show modal
      try {
        configService.set('provider', _selectedProvider ?? 'piper');
        if (_introText) configService.set('pretext', _introText);
      } catch {}
      _showCompletionModal();
    }
  });

  screen.key(['escape'], () => {
    if (box.hidden || _checking) return;
    if (_completionModalOpen) { _dismissCompletionModal(); return; }
    if (_screen > 1) {
      _screen--;
      _showCurrentScreen();
    } else {
      box.hide();
      screen.render();
    }
  });

  screen.key(['up'], () => {
    if (box.hidden) return;
    if (_screen === 3 && _deps) {
      const providers = [];
      if (_deps.piper)   providers.push('piper');
      if (_deps.soprano) providers.push('soprano');
      const idx = providers.indexOf(_selectedProvider ?? providers[0]);
      _selectedProvider = providers[Math.max(0, idx - 1)];
      _renderScreen3();
    }
  });

  screen.key(['down'], () => {
    if (box.hidden) return;
    if (_screen === 3 && _deps) {
      const providers = [];
      if (_deps.piper)   providers.push('piper');
      if (_deps.soprano) providers.push('soprano');
      const idx = providers.indexOf(_selectedProvider ?? providers[0]);
      _selectedProvider = providers[Math.min(providers.length - 1, idx + 1)];
      _renderScreen3();
    }
  });

  // Left arrow = go back (same logic as Escape)
  // Screen 4: left arrow is handled by button ←/→ navigation; use Escape to go back
  screen.key(['left'], () => {
    if (box.hidden || _checking) return;
    if (_screen === 4) return;
    if (_screen > 1) {
      _screen--;
      _showCurrentScreen();
    }
  });

  // Right arrow = go forward (same logic as Enter, without save/finish side-effects)
  screen.key(['right'], () => {
    if (box.hidden || _checking) return;
    if (_screen < 4) {
      _screen++;
      _showCurrentScreen();
    }
    // Screens 4 and 5 require explicit [Enter] to confirm
  });

  // [E] on Screen 4: edit intro text inline
  screen.key(['e', 'E'], () => { _doEdit(); });

  // [O] anywhere: dismiss the completion modal (OK button)
  screen.key(['o', 'O'], () => {
    if (box.hidden || !_completionModalOpen) return;
    _dismissCompletionModal();
  });

  // [P] on Screen 4: preview TTS using the current intro text
  screen.key(['p', 'P'], () => { _doPreview(); });

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,

    show() {
      _screen = 1;
      _screen5Announced = false;
      if (_completionModalBox) { _completionModalBox.destroy(); _completionModalBox = null; }
      _completionModalOpen = false;
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
