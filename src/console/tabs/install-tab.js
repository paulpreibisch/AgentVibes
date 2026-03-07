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
import _fs from 'node:fs';
import { promises as _fsP } from 'node:fs';
import {
  copyCommandFiles, copyHookFiles, copyPersonalityFiles,
  copyPluginFiles, copyBmadConfigFiles, copyBackgroundMusicFiles,
  copyConfigFiles, configureSessionStartHook,
  installPluginManifest, checkAndInstallPiper,
} from '../../installer.js';

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
  valueFg:    '#ffff00',  // Yellow
  brandPink:  '#f06292',  // Light magenta — AgentVibes logotype
  successFg:  '#69f0ae',  // Green — success
  errorFg:    '#ef9a9a',  // Red — error/missing
  btnDefault: '#283593',
  btnFocus:   '#00e5ff',  // Cyan — focused button (system standard)
  btnFocusFg: '#000000',  // Black text on cyan
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
  return `${name} is ready! Welcome to AgentVibes. Love AgentVibes? We'd really appreciate it if you could give us a star on GitHub.`;
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

  const { configService, providerService, navigationService, focusMainTabBar } = services;

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

  // Install state (populated during screen 5)
  let _installLog      = [];   // array of blessed-tagged strings
  let _installRunning  = false;
  let _installComplete = false;
  let _installError    = null;
  let _lastSpinnerIdx  = -1;   // index of last ⟳ entry, replaced by ✓ on succeed

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

  // -------------------------------------------------------------------------
  // TUI spinner adapter — captures copy-function progress into _installLog

  function _makeSpinner() {
    return {
      start(msg) {
        _installLog.push(`{${COLORS.noticeFg}-fg}  ⟳  ${msg}{/${COLORS.noticeFg}-fg}`);
        _lastSpinnerIdx = _installLog.length - 1;
        _renderScreen5();
      },
      succeed(msg) {
        const line = `{${COLORS.successFg}-fg}  ✓  ${msg || ''}{/${COLORS.successFg}-fg}`;
        if (_lastSpinnerIdx >= 0) {
          _installLog[_lastSpinnerIdx] = line;
        } else {
          _installLog.push(line);
        }
        _lastSpinnerIdx = -1;
        _renderScreen5();
      },
      info(msg) {
        _installLog.push(`{${COLORS.noticeFg}-fg}  ℹ  ${msg}{/${COLORS.noticeFg}-fg}`);
        _renderScreen5();
      },
      warn(msg) {
        _installLog.push(`{#ffcc00-fg}  ⚠  ${msg}{/#ffcc00-fg}`);
        _renderScreen5();
      },
      stop() {},
    };
  }

  // -------------------------------------------------------------------------
  // Write AgentVibes config files into targetDir/.claude/

  async function _writeInstallConfig(targetDir, provider) {
    const claudeDir = path.join(targetDir, '.claude');
    const configDir = path.join(claudeDir, 'config');
    await _fsP.mkdir(configDir, { recursive: true });

    const defaultVoices = {
      piper:           'en_US-ryan-high',
      macos:           'Samantha',
      soprano:         'soprano-default',
      'windows-piper': 'en_US-ryan-high',
      'windows-sapi':  'Microsoft David Desktop',
    };
    // Use voice from Settings if configured, otherwise fall back to provider default
    const configuredVoice = configService?.getConfig?.()?.voice;
    const voice = configuredVoice ?? (defaultVoices[provider] ?? 'en_US-ryan-high');

    await _fsP.writeFile(path.join(claudeDir, 'tts-provider.txt'), provider);
    await _fsP.writeFile(path.join(claudeDir, 'tts-voice.txt'), voice);
    await _fsP.writeFile(path.join(claudeDir, 'tts-verbosity.txt'), 'medium');

    const pretext = _introText?.trim() ?? '';
    if (pretext) {
      await _fsP.writeFile(path.join(configDir, 'tts-pretext.txt'), pretext, { mode: 0o600 });
    } else {
      try { await _fsP.unlink(path.join(configDir, 'tts-pretext.txt')); } catch { /* ok */ }
    }

    // Apply background music settings from Settings tab.
    // play-tts-piper.sh reads background-music-enabled.txt (not background-music.txt),
    // so we must write that file explicitly when music is enabled.
    const bgMusic = configService?.getConfig?.()?.backgroundMusic;
    if (bgMusic?.enabled) {
      await _fsP.writeFile(path.join(configDir, 'background-music-enabled.txt'), 'true');
      // Update the track in audio-effects.cfg (copied from package defaults a moment ago).
      // Only apply if the track name is a safe filename (no pipe characters or path separators).
      const track = bgMusic.track;
      if (track && !/[|/\\]/.test(track)) {
        try {
          const audioEffectsPath = path.join(configDir, 'audio-effects.cfg');
          let content = await _fsP.readFile(audioEffectsPath, 'utf-8');
          content = content.replace(
            /^default\|([^|]*)\|([^|]*)\|(.*)$/m,
            `default|$1|${track}|$3`,
          );
          await _fsP.writeFile(audioEffectsPath, content);
        } catch { /* audio-effects.cfg not yet present — non-fatal */ }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Full installation sequence (runs on screen 5)

  async function _runInstall() {
    _installLog      = [];
    _installRunning  = true;
    _installComplete = false;
    _installError    = null;
    _lastSpinnerIdx  = -1;

    const targetDir = process.cwd();
    const provider  = _selectedProvider ?? 'piper';
    const spinner   = _makeSpinner();

    // Suppress console output from installer.js copy functions — they use
    // chalk+console.log which would corrupt the blessed display.
    const _origLog  = console.log;
    const _origWarn = console.warn;
    const _origErr  = console.error;
    console.log  = () => {};
    console.warn = () => {};
    console.error = () => {};

    try {
      // Create directory structure
      spinner.start('Preparing .claude directory...');
      await _fsP.mkdir(path.join(targetDir, '.claude', 'commands'), { recursive: true });
      await _fsP.mkdir(path.join(targetDir, '.claude', 'hooks'),    { recursive: true });
      await _fsP.mkdir(path.join(targetDir, '.claude', 'audio', 'tracks'), { recursive: true });
      spinner.succeed('Directory structure ready');

      await copyCommandFiles(targetDir, spinner);
      await copyHookFiles(targetDir, spinner);
      await copyPersonalityFiles(targetDir, spinner);
      await copyPluginFiles(targetDir, spinner);
      await copyBmadConfigFiles(targetDir, spinner);
      await copyBackgroundMusicFiles(targetDir, spinner);
      await copyConfigFiles(targetDir, spinner);
      await configureSessionStartHook(targetDir, spinner);
      await installPluginManifest(targetDir, spinner);

      spinner.start('Writing configuration...');
      await _writeInstallConfig(targetDir, provider);
      spinner.succeed('Configuration saved');

      // Create .mcp.json if it doesn't already exist
      const mcpConfigPath = path.join(targetDir, '.mcp.json');
      let _mcpCreated = false;
      try {
        await _fsP.access(mcpConfigPath);
        // Already exists — skip to avoid overwriting user's config
      } catch {
        const mcpConfig = {
          mcpServers: {
            agentvibes: {
              command: 'npx',
              args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
            },
          },
        };
        spinner.start('Creating .mcp.json...');
        await _fsP.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n');
        spinner.succeed('.mcp.json created');
        _mcpCreated = true;
      }

      if (provider === 'piper') {
        spinner.start('Checking Piper TTS voices...');
        await checkAndInstallPiper(targetDir, { yes: true, silent: true });
        spinner.succeed('Piper TTS ready');
      }

      _installComplete = true;
      _installRunning  = false;
      _installLog.push('');
      _installLog.push(`{${COLORS.successFg}-fg}  ✅  AgentVibes installed successfully!{/${COLORS.successFg}-fg}`);
      if (_mcpCreated) {
        _installLog.push(`{${COLORS.successFg}-fg}  📡  .mcp.json created — run: claude --mcp-config .mcp.json{/${COLORS.successFg}-fg}`);
      }
      _installLog.push(`{${COLORS.noticeFg}-fg}  ⭐ Star us on GitHub: github.com/preibisch/agentvibes{/${COLORS.noticeFg}-fg}`);

    } catch (err) {
      _installRunning = false;
      _installError   = err.message;
      _installLog.push(`{${COLORS.errorFg}-fg}  ✗  Installation failed: ${err.message}{/${COLORS.errorFg}-fg}`);
    } finally {
      console.log  = _origLog;
      console.warn = _origWarn;
      console.error = _origErr;
    }

    _renderScreen5();

    // Show OK button now that install is done (success or error)
    _s5OkBtn.show();
    _s5OkBtn.focus();
    screen.render();

    // Play TTS greeting on success
    if (_installComplete && !_screen5Announced) {
      _screen5Announced = true;
      const greeting = formatGreeting(_introText, getIntroDefault(process.cwd()));
      const ttsScript = path.resolve(targetDir, '.claude/hooks/play-tts.sh');
      execFile('bash', [ttsScript, greeting], {
        env: { ...process.env, ...(process.env.PULSE_SERVER ? { PULSE_SERVER: process.env.PULSE_SERVER } : _fs.existsSync('/mnt/wslg/PulseServer') ? { PULSE_SERVER: 'unix:/mnt/wslg/PulseServer' } : {}) },
        timeout: 30000,
      }, () => {});
    }
  }

  function _doAccept() {
    if (_screen !== 4 || _installRunning) return;
    _screen++;
    _showCurrentScreen();
    // Start install after screen transition renders (50ms delay in _showCurrentScreen)
    setTimeout(() => _runInstall().catch(() => {}), 100);
  }

  // -------------------------------------------------------------------------
  // Screen 4 action buttons — real blessed widgets for keyboard focus + ←/→ nav

  function _createInstallBtn(label, bg, onClick, textColor = '#ffffff') {
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
        fg: textColor,
        focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      },
    });

    // Focus indicator: ►label◄ with blinking █ — matches settings-tab standard
    let _blinkInterval = null;
    btn.on('focus', () => {
      btn.style.bg = COLORS.btnFocus;
      btn.style.fg = COLORS.btnFocusFg;
      const raw = btn.content.replace(/[►◄█]/g, '').trim();
      btn.setContent(`►${raw}◄ █`);
      let _on = true;
      screen.render();
      _blinkInterval = setInterval(() => {
        _on = !_on;
        if (!btn.content.includes('►')) return;
        const r = btn.content.replace(/[►◄█]/g, '').trim();
        btn.setContent(_on ? `►${r}◄ █` : `►${r}◄`);
        screen.render();
      }, 500);
    });
    btn.on('blur', () => {
      if (_blinkInterval) { clearInterval(_blinkInterval); _blinkInterval = null; }
      btn.style.bg = bg;
      btn.style.fg = textColor;
      const raw = btn.content.replace(/[►◄█]/g, '').trim();
      btn.setContent(raw);
      screen.render();
    });

    // Press: magenta flash then invoke onClick
    // Guard: don't fire onClick when the completion modal is open — Enter should dismiss it.
    btn.key(['enter', 'space'], () => {
      if (_completionModalOpen) return;
      btn.style.bg = COLORS.btnPress;
      btn.style.fg = 'white';
      screen.render();
      setTimeout(() => {
        btn.style.bg = bg;
        btn.style.fg = textColor;
        screen.render();
        onClick();
      }, 150);
    });
    btn.on('click', () => btn.press());
    return btn;
  }

  const _editBtn   = _createInstallBtn('Edit',               '#1565c0', _doEdit);
  const _acceptBtn = _createInstallBtn('✓ Accept & Install', COLORS.btnDefault, _doAccept);

  // Edit sits inline with the intro text row; Accept & Install is below
  _editBtn.top   = 8;  _editBtn.left   = 36;
  _acceptBtn.top = 13; _acceptBtn.left = 4;

  // ↓/↑ navigate between Edit and Accept & Install
  // Note: Tab is NOT used here — 'tab' is registered globally by navigation.js (cycles tabs)
  _editBtn.key(['down', 'right'],  () => { _acceptBtn.focus(); screen.render(); });
  _acceptBtn.key(['up', 'left'],   () => { _editBtn.focus();   screen.render(); });

  // -------------------------------------------------------------------------
  // Screen 1 buttons — Begin (cyan) and Exit (grey)

  const _s1BeginBtn = _createInstallBtn('▶  Begin', '#00838f', () => {
    _screen++;
    _showCurrentScreen();
  });
  const _s1ExitBtn = _createInstallBtn('✗  Exit', '#546e7a', () => {
    box.hide();
    screen.render();
    if (typeof focusMainTabBar === 'function') focusMainTabBar();
  });

  _s1BeginBtn.top = 5; _s1BeginBtn.left = 4;
  _s1ExitBtn.top  = 5; _s1ExitBtn.left  = 20;

  // ←/→ horizontal and ↑/↓ vertical — both navigate between the two buttons
  _s1BeginBtn.key(['right', 'down'],  () => { _s1ExitBtn.focus();   screen.render(); });
  _s1ExitBtn.key(['right', 'down'],   () => { _s1BeginBtn.focus();  screen.render(); });
  _s1ExitBtn.key(['left', 'up', 'S-tab'],   () => { _s1BeginBtn.focus();  screen.render(); });
  _s1BeginBtn.key(['left', 'up', 'S-tab'],  () => { _s1ExitBtn.focus();   screen.render(); });

  // -------------------------------------------------------------------------
  // Screen 2 button — Continue (shown after deps check passes)

  const _s2ContinueBtn = _createInstallBtn('Continue →', '#1565c0', () => {
    _screen++;
    _showCurrentScreen();
  });
  _s2ContinueBtn.top  = 12; _s2ContinueBtn.left = 4;
  // → also advances without the flash delay
  _s2ContinueBtn.key(['right'], () => { _screen++; _showCurrentScreen(); });

  // Screen 3: no Continue button — Enter/→ on the list confirms selection and advances

  // -------------------------------------------------------------------------
  // Screen 5 button — OK (summary page only, config already saved on screen 4)

  const _s5OkBtn = _createInstallBtn('✓  OK — Done', '#2e7d32', () => {
    _dismissCompletionModal();
  });
  _s5OkBtn.bottom = 3; _s5OkBtn.left = 4;  // bottom-anchored: sits above hintLine (bottom:2)

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
      '',  // ← [▶ Begin] [✗ Exit] buttons here (box row 5)
    ]));
    hintLine.setContent('  Screen 1/5: Welcome  |  [←/→] Navigate  |  [Enter] Begin  |  [Esc] Exit');
    _s1BeginBtn.focus();
    screen.render();
  }

  async function _renderScreen2() {
    const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let frameIdx = 0;
    _checking = true;
    _s2ContinueBtn.hide();  // hidden during spinner

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

    const ttsOk = _deps.piper || _deps.soprano;
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
      ttsOk
        ? `  {${COLORS.successFg}-fg}✅  TTS Providers Detected{/${COLORS.successFg}-fg}`
        : `  {${COLORS.errorFg}-fg}⚠   No TTS provider found. Install Piper or Soprano first.{/${COLORS.errorFg}-fg}`,
      '',  // blank separator
      '',  // ← [Continue →] button here (box row 12) when TTS detected
    ]));
    if (ttsOk) {
      _s2ContinueBtn.show();
      _s2ContinueBtn.focus();
    }
    screen.render();
  }

  function _renderScreen3() {
    const providers = [];
    if (_deps?.piper)   providers.push('piper');
    if (_deps?.soprano) providers.push('soprano');

    if (providers.length === 0) providers.push('piper');  // fallback
    if (!_selectedProvider) _selectedProvider = providers[0];

    // Pad items to 96 visible chars so they fully overwrite any stale cells from Screen 2.
    // Selected row uses cyan bg + black text (matches button focus standard).
    const items = providers.map(p =>
      p === _selectedProvider
        ? `{#00e5ff-bg}{#000000-fg}{bold} ● ${p.padEnd(92)}{/bold}{/#000000-fg}{/#00e5ff-bg}`
        : `{${COLORS.labelFg}-fg}   ${p.padEnd(93)}{/${COLORS.labelFg}-fg}`
    );

    // Pad item list to 3 entries so the Continue button sits at a fixed row
    // and all stale lines from Screen 2 (which has ~10 lines) are overwritten.
    const paddedItems = [...items];
    while (paddedItems.length < 3) paddedItems.push(`   ${''.padEnd(93)}`);

    // Append trailing blank rows (space-padded) so blessed rewrites every cell that
    // screen 2 used. Two screen.render() calls in the same tick are batched, so the
    // intermediate "clear" render never fires — trailing spaces here fix that in one pass.
    const _blank = ' '.repeat(120);
    const _trail = Array(12).fill(_blank);
    contentBox.setContent(_c([
      _HDR('🎤', 'Provider Selection'),
      '',
      `  {${COLORS.noticeFg}-fg}${'Available TTS providers:'.padEnd(94)}{/${COLORS.noticeFg}-fg}`,
      '',
      ...paddedItems.map(i => `  ${i}`),
      ..._trail,
    ]));
    hintLine.setContent('  Screen 3/5: Provider  |  [←] Back  |  [↑↓] Choose  |  [Enter/→] Confirm & Continue');
    box.focus();
    screen.render();
  }

  function _renderScreen4() {
    const provider = _selectedProvider ?? 'piper';
    const intro = _introText || '';
    const folderName = getIntroDefault(process.cwd()) || 'AgentVibes';
    const example = `${folderName}: Here`;
    const voiceId = providerService?.getActiveVoiceId?.() ?? 'en_US-amy-medium';

    contentBox.setContent(_c([
      _HDR('🎤', 'Provider & Voice'),
      '',
      `  {${COLORS.labelFg}-fg}${'Provider:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.valueFg}-fg}${provider}{/${COLORS.valueFg}-fg}`,
      `  {${COLORS.labelFg}-fg}${'Voice:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.valueFg}-fg}${voiceId}{/${COLORS.valueFg}-fg}  {${COLORS.noticeFg}-fg}(after installation, you can change in Settings){/${COLORS.noticeFg}-fg}`,
      '',
      _HDR('✍️', 'Intro Text'),
      '',
      `  {${COLORS.labelFg}-fg}${'Intro text:'.padEnd(14)}{/${COLORS.labelFg}-fg}{${COLORS.valueFg}-fg}${intro || '(none)'}{/${COLORS.valueFg}-fg}`,
      // ↑ [Edit] button rendered inline at box row 8, left=36
      '',
      `  {${COLORS.noticeFg}-fg}Example:{/${COLORS.noticeFg}-fg}  {${COLORS.valueFg}-fg}"${example}"{/${COLORS.valueFg}-fg}`,
      '',
      '',
      '',  // ← [✓ Accept & Install] button rendered as real widget here (box row 13)
    ]));
    hintLine.setContent('  Screen 4/5: Config  |  [Esc] Back  |  [E] Edit  |  [↓] Accept & Install');
    _acceptBtn.focus();
    screen.render();
  }

  function _renderScreen5() {
    const header = _installError
      ? _HDR('❌', 'Installation Failed')
      : _installComplete
        ? _HDR('✅', 'Installation Complete')
        : _HDR('⚙️', 'Installing AgentVibes...');

    const hint = (_installComplete || _installError)
      ? '  Screen 5/5: Complete  |  [Enter] OK — Done'
      : '  Screen 5/5: Installing...  |  Please wait';

    // Show last 18 log lines so content fits in the box
    const MAX_LINES = 18;
    const visibleLog = _installLog.length > MAX_LINES
      ? _installLog.slice(-MAX_LINES)
      : _installLog;

    contentBox.setContent(_c([
      header,
      '',
      ...visibleLog,
    ]));
    hintLine.setContent(hint);
    screen.render();
  }

  function _showInstallNotice(message) {
    const width = Math.max(28, message.length + 6);
    const notice = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width,
      height: 3,
      border: { type: 'line' },
      tags: true,
      content: `{center}${message}{/center}`,
      style: {
        fg: '#e3f2fd',
        bg: COLORS.contentBg,
        border: { fg: '#00e5ff' },
      },
    });
    screen.render();
    setTimeout(() => { try { notice.destroy(); screen.render(); } catch {} }, 2500);
  }

  function _dismissCompletionModal() {
    if (_completionModalBox) {
      _completionModalBox.destroy();
      _completionModalBox = null;
    }
    _completionModalOpen = false;
    _screen = 1;
    box.hide();
    _showInstallNotice('Installation Complete — Settings Saved');
    screen.render();
    navigationService?.switchTab('settings');
  }

  function _showCurrentScreen() {
    // Show Screen 1 buttons only on screen 1
    if (_screen === 1) {
      _s1BeginBtn.show(); _s1ExitBtn.show();
    } else {
      _s1BeginBtn.hide(); _s1ExitBtn.hide();
    }

    // Screen 2 continue button: hidden on other screens; _renderScreen2 manages show/focus
    if (_screen !== 2) _s2ContinueBtn.hide();

    // Screen 5 OK button: hidden during active install, shown by _runInstall() on completion
    if (_screen === 5 && (_installComplete || _installError)) {
      _s5OkBtn.show();
    } else {
      _s5OkBtn.hide();
    }

    // Show Screen 4 action buttons only on screen 4
    if (_screen === 4) {
      _editBtn.show(); _acceptBtn.show();
    } else {
      _editBtn.hide(); _acceptBtn.hide();
    }

    if (_screen !== _lastScreen) {
      // Nuclear clear: force-invalidate every olines cell so blessed's diff renderer
      // actually writes blanks to the terminal (blessed skips cells it thinks are
      // unchanged — setting attr=-1 is impossible for any real cell so draw() is
      // forced to physically rewrite every character).
      try {
        for (let r = 0; r < screen.height; r++) {
          const orow = screen.olines?.[r];
          if (!orow) continue;
          for (let c = 0; c < screen.width; c++) {
            if (orow[c]) orow[c][0] = -1;
          }
        }
        // Row 2 (header bottom) never becomes dirty on its own — force it so
        // draw() writes headerBg+spaces and overwrites any ghost terminal content.
        if (screen.lines?.[2]) screen.lines[2].dirty = true;
      } catch {}

      const _clearLine = ' '.repeat(150);
      const _clearPage = Array(25).fill(_clearLine).join('\n');
      contentBox.setContent(_clearPage);
      hintLine.setContent(_clearLine);
      screen.render();

      const targetScreen = _screen;
      _lastScreen = _screen;
      // 50 ms delay: enough for the terminal to display the blank frame before
      // the new screen content overwrites it. setTimeout(0) is too fast —
      // both renders land in the same display frame.
      setTimeout(() => {
        if (_screen !== targetScreen) return;
        switch (_screen) {
          case 1: _renderScreen1(); break;
          case 2: _renderScreen2(); break;
          case 3: _renderScreen3(); break;
          case 4: _renderScreen4(); break;
          case 5: _renderScreen5(); break;
        }
      }, 50);
      return;
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
    if (_completionModalOpen) { _dismissCompletionModal(); return; }  // always first
    if (_screen === 1) return;  // Screen 1: Enter handled by Begin/Exit buttons
    if (_screen === 2) return;  // Screen 2: Enter handled by Continue button
    if (_screen === 4) return;  // Screen 4: Enter handled by the focused button
    if (_screen === 5) return;  // Screen 5: Enter handled by OK button
    if (_screen < 5) {
      _screen++;
      _showCurrentScreen();
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
      // Defer so the escape keypress event finishes propagating before focus changes.
      // Calling focusMainTabBar() synchronously here would set focus to the tab bar
      // item mid-event, causing its own key(['escape']) handler to fire in the same
      // emission and call onFocus() → re-focus a button inside the now-hidden box.
      if (typeof focusMainTabBar === 'function') setTimeout(() => focusMainTabBar(), 0);
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
  // Screen 1: right arrow handled by button ←/→ navigation
  screen.key(['right'], () => {
    if (box.hidden || _checking) return;
    if (_screen === 1) return;
    if (_screen === 2) return;  // Screen 2: → handled by Continue button
    if (_screen === 3) { _screen++; _showCurrentScreen(); return; }  // → confirms provider and advances
    if (_screen === 4) return;  // Screen 4: → handled by button nav
    if (_screen === 5) return;  // Screen 5: → handled by button nav
  });

  // Down arrow: Screen 3 provider nav; Screen 1 ↓ is handled by button key handlers
  // (tab bar's el.key(['down']) → onFocus() focuses Begin, then button ↓ → Exit)
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

  // [E] on Screen 4: edit intro text inline
  screen.key(['e', 'E'], () => { _doEdit(); });

  // [O] anywhere: dismiss the completion modal (OK button)
  screen.key(['o', 'O'], () => {
    if (box.hidden || !_completionModalOpen) return;
    _dismissCompletionModal();
  });

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,

    show() {
      _screen = 1;
      _screen5Announced = false;
      _installLog      = [];
      _installRunning  = false;
      _installComplete = false;
      _installError    = null;
      _lastSpinnerIdx  = -1;
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
      // Focus the active interactive element, not just the box container
      if (_screen === 1) {
        _s1BeginBtn.focus();
      } else if (_screen === 4) {
        _editBtn.focus();
      } else if (_screen === 5 && (_installComplete || _installError)) {
        _s5OkBtn.focus();
      } else {
        box.focus();
      }
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
