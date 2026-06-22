/**
 * AgentVibes TUI Console — Setup Tab (Unified Setup Wizard)
 *
 * Replaces install-tab.js + llm-providers-tab.js with a single unified tab.
 *
 * Implements the Tab Component Contract:
 *   createSetupTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * 4-screen wizard flow:
 *   Screen 0: Language picker
 *   Screen 1: Dependency check
 *   Screen 2: TTS Engine selection (new)
 *   Screen 3: LLM Providers (new — install/remove/configure)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { promises as _fsP } from 'node:fs';
import { SUPPORTED_LANGUAGES, t } from '../../i18n/strings.js';
import {
  PROVIDERS,
  checkClaudeInstalled, checkCopilotInstalled, checkCodexInstalled,
  installClaudeMcp, removeClaudeMcp, uninstallClaude,
  installCopilotMcp, removeCopilotMcp,
  installCopilotInstructions, removeCopilotInstructions,
  installCodexMcp, removeCodexMcp,
  installCodexInstructions, installCodexHooks,
  removeCodexInstructions, removeCodexHooks,
  checkHermesInstalled, installHermes, removeHermes,
  getHermesConfig, saveHermesConfig,
  TRANSPORT_PROVIDERS, getTransportConfig, saveTransportConfig,
  loadLlmConfigSync, saveLlmConfigSync, resolveCfgPath,
} from '../../services/llm-provider-service.js';
import {
  getAvailableEngines, getEngineStatuses, checkEngineInstalled,
} from '../../services/tts-engine-service.js';
import { openReverbPicker, REVERB_PRESETS } from '../widgets/reverb-picker.js';
import { openTrackPicker, openVolumeInput } from '../widgets/track-picker.js';
import { formatTrackName } from '../widgets/format-utils.js';
import { destroyList } from '../widgets/destroy-list.js';
import { scanInstalledVoices, getVoiceMeta, genderIconTag, PIPER_VOICES_DIR, SAMPLE_PHRASES, parseMultiSpeaker, getFavorites, getThumbsDown, toggleFavorite, toggleThumbsUp, toggleThumbsDown } from './voices-tab.js';
import { attachBtnBlink } from './agents-tab.js';
import { buildAudioEnv, detectWavPlayer } from '../audio-env.js';
import { spawn } from 'node:child_process';
import os from 'node:os';
import crypto from 'node:crypto';
import net from 'node:net';

const _execFileAsync = promisify(execFile);

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------
// Named ANSI colors only — hex renders as white on Paul's terminal

const COLORS = {
  contentBg:  'black',
  sectionHdr: 'bright-cyan',
  labelFg:    'white',
  valueFg:    'yellow',
  brandPink:  'magenta',
  successFg:  'green',
  errorFg:    'red',
  btnDefault: 'blue',
  btnFocus:   'green',
  btnFocusFg: 'white',
  btnPress:   'magenta',
  borderFg:   'bright-cyan',
  footerBg:   'blue',
  noticeFg:   'white',
  btnBg:      'blue',
  btnFg:      'white',
  btnFocusBg: '#2e7d32',
  removeBg:   'red',
  removeFocusBg: 'magenta',
  cfgBg:      'green',
  cfgFocusBg: 'yellow',
};

const FOOTER_TEXT = '[Enter] Continue  [Esc] Back  [Tab] Next Tab  [Q] Quit';

// Maps non-Piper engine IDs to their canonical voice ID and display label.
// Used by the voice picker, _buildFields display, and auto-save logic.
const NATIVE_ENGINE_VOICES = {
  soprano:     { id: 'soprano',         label: 'Soprano'                  },
  sapi:        { id: 'sapi',            label: 'Windows SAPI'             },
  'macos-say': { id: 'macos-say',       label: 'macOS Say'                },
  elevenlabs:  { id: 'elevenlabs-Rachel', label: 'ElevenLabs (Rachel)'    },
};

// ---------------------------------------------------------------------------
// Soprano WebUI auto-start helpers

function _checkSopranoPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(2000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    // Absorb any late errors emitted after destroy() to prevent uncaught 'error' crash
    socket.on('error', () => {});
  });
}

// Timestamp of last soprano-webui spawn; prevents duplicate processes on rapid re-entry
let _sopranoSpawnedAt = 0;

async function _ensureSopranoWebUI(onStatus, signal) {
  const port = parseInt(process.env.SOPRANO_PORT || '7860', 10);
  if (signal?.aborted) return false;
  if (await _checkSopranoPort(port)) return true;
  onStatus('Starting Soprano WebUI...');
  // Only spawn a new soprano-webui process if we haven't done so in the last 10 s
  if (Date.now() - _sopranoSpawnedAt > 10_000) {
    _sopranoSpawnedAt = Date.now();
    try {
      const p = spawn('soprano-webui', [], { // NOSONAR
        stdio: 'ignore', detached: true, windowsHide: true,
        shell: process.platform === 'win32',
      });
      p.unref();
    } catch (e) {
      process.stderr.write(`[AgentVibes] soprano-webui spawn failed: ${e.message}\n`);
    }
  }
  for (let i = 0; i < 45; i++) {
    if (signal?.aborted) return false;
    await new Promise(r => setTimeout(r, 2000));
    if (signal?.aborted) return false;
    if (await _checkSopranoPort(port)) return true;
    onStatus(`Starting Soprano WebUI... ${(i + 1) * 2}s`);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Exported pure helpers (kept from install-tab for backward compat)

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
 * Format the TTS greeting message.
 * @param {string} introText - User's intro text (may be empty)
 * @param {string} projectName - Project folder name
 * @returns {string}
 */
export function formatGreeting(introText, projectName) {
  const name = introText || projectName || 'AgentVibes';
  return `${name} is ready! Welcome to AgentVibes. Love AgentVibes? We'd really appreciate it if you could give us a star on GitHub.`;
}

// ---------------------------------------------------------------------------
// Dependency detection helpers

async function _commandExistsAsync(cmd) {
  try {
    const opts = { stdio: 'pipe', timeout: 5000 };
    if (process.platform === 'win32') {
      opts.shell = true;
      await _execFileAsync(`${cmd} --version`, [], opts);
    } else {
      await _execFileAsync(cmd, ['--version'], opts);
    }
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    return true;
  }
}

async function _checkDependenciesAsync() {
  const [node, npm, piperCmd, sopranoTts, sopranoWebui, ffmpeg] = await Promise.all([
    _commandExistsAsync('node'),
    _commandExistsAsync('npm'),
    _commandExistsAsync('piper'),
    _commandExistsAsync('soprano-tts'),
    _commandExistsAsync('soprano-webui'),
    _commandExistsAsync('ffmpeg'),
  ]);

  let piper = piperCmd;
  if (!piper && process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ||
      (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
    if (localAppData) {
      piper = fs.existsSync(path.join(localAppData, 'Programs', 'Piper', 'piper.exe'));
    }
  }

  // Kokoro: check python import (non-fatal if python3 unavailable)
  // Use find_spec instead of import to avoid slow torch load (which causes ETIMEDOUT on sync checks)
  const kokoro = await new Promise(resolve => {
    try {
      const proc = spawn('python3', ['-c', "import importlib.util; exit(0 if importlib.util.find_spec('kokoro') else 1)"], { stdio: 'ignore' }); // NOSONAR
      const timer = setTimeout(() => { proc.kill(); resolve(false); }, 5000);
      proc.on('close', code => { clearTimeout(timer); resolve(code === 0); });
      proc.on('error', () => { clearTimeout(timer); resolve(false); });
    } catch { resolve(false); }
  });

  // ElevenLabs: check env var or key file (sync — just a file read)
  const elevenlabs = Boolean(process.env.ELEVENLABS_API_KEY) || (() => {
    try {
      const kf = path.join(os.homedir(), '.agentvibes', 'elevenlabs-key.txt');
      return fs.existsSync(kf) && fs.readFileSync(kf, 'utf8').trim().length > 0;
    } catch { return false; }
  })();

  return { node, npm, piper, soprano: sopranoTts || sopranoWebui, kokoro, elevenlabs, ffmpeg };
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
    getFooterText: () => t('en', 'footerText'),
    getFooterColor: () => COLORS.footerBg,
  };
}

// ---------------------------------------------------------------------------

/**
 * Create the Setup tab component (unified install + provider configuration).
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createSetupTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService, navigationService, focusMainTabBar, languageService } = services;

  const targetDir = process.env.INIT_CWD || process.cwd();
  const _thisFile = fileURLToPath(import.meta.url);
  const packageDir = path.resolve(path.dirname(_thisFile), '..', '..', '..');

  // -------------------------------------------------------------------------
  // Container

  const box = blessed.box({
    parent: screen,
    top: 5,
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

  let _screen = 0;
  let _lastScreen = -2;
  let _pendingGlobalCfg = null;  // Set when global config detected on first run
  // Set to true while a config modal is closing so the wizard Escape handler
  // does not also step the setup wizard backwards on the same keypress.
  let _modalClosing = false;
  let _globalChoiceIdx = 0;      // 0 = Load Global, 1 = Start Fresh
  const _getLang = () => languageService?.getLang() ?? 'en';
  const _tl = (key) => languageService?.t(key) ?? t('en', key);
  let _langIdx = 0;
  let _deps = null;
  let _checking = false;

  // First-run detection: evaluated at show() time so async config init is complete
  function _isFirstRun() {
    return !(configService?.getConfig?.()?.setupCompleted);
  }

  // -------------------------------------------------------------------------
  // Content area

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

  const hintLine = blessed.text({
    parent: box,
    bottom: 2,
    left: 2,
    right: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });

  function _c(lines) { return lines.join('\n'); }

  // -------------------------------------------------------------------------
  // Shared button factory

  function _createBtn(label, bg, onClick, textColor = 'white') {
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

    let _blinkInterval = null;
    const _origLabel = label;
    btn.on('focus', () => {
      btn.style.bg = COLORS.btnFocus;
      btn.style.fg = COLORS.btnFocusFg;
      btn.setContent(`\u25ba ${_origLabel} \u25c4`);
      let _on = true;
      screen.render();
      _blinkInterval = setInterval(() => {
        _on = !_on;
        btn.setContent(_on ? `\u25ba ${_origLabel} \u25c4` : `  ${_origLabel}  `);
        screen.render();
      }, 500);
    });
    btn.on('blur', () => {
      if (_blinkInterval) { clearInterval(_blinkInterval); _blinkInterval = null; }
      btn.style.bg = bg;
      btn.style.fg = textColor;
      btn.setContent(_origLabel);
      screen.render();
    });

    btn.key(['enter', 'space'], () => {
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

  // =========================================================================
  // SCREEN 0: Language picker (kept as-is)
  // =========================================================================

  // =========================================================================
  // SCREEN 1: Dependency check (was Screen 2, renumbered)
  // =========================================================================

  const _s1ContinueBtn = _createBtn('Continue  ->', 'blue', () => {
    _screen++;
    _showCurrentScreen();
  });
  _s1ContinueBtn.top = 12; _s1ContinueBtn.left = 4;
  _s1ContinueBtn.key(['right'], () => { _screen++; _showCurrentScreen(); });

  // =========================================================================
  // SCREEN 2: TTS Engine selection (new)
  // =========================================================================

  // TTS engine install buttons — created once, shown/hidden per screen
  const _ttsEngineRows = [];
  const _ttsFocusableItems = [];
  let _ttsFocusIndex = 0;

  const _ttsEngines = getAvailableEngines();
  for (let i = 0; i < _ttsEngines.length; i++) {
    const engine = _ttsEngines[i];
    const yOff = 5 + (i * 3);

    const nameLabel = blessed.text({
      parent: box, top: yOff, left: 2, tags: true, hidden: true,
      content: '', style: { bg: COLORS.contentBg },
    });

    const statusLabel = blessed.text({
      parent: box, top: yOff, left: 22, tags: true, hidden: true,
      content: '', style: { bg: COLORS.contentBg },
    });

    const descLabel = blessed.text({
      parent: box, top: yOff + 1, left: 4, tags: true, hidden: true,
      content: `{cyan-fg}${engine.desc}{/cyan-fg}`,
      style: { bg: COLORS.contentBg },
    });

    const installBtn = blessed.button({
      parent: box, top: yOff, left: 40, width: 14, height: 1,
      content: '  Install  ', tags: true, mouse: true, keys: true, hidden: true,
      style: {
        fg: COLORS.btnFg, bg: COLORS.btnBg,
        focus: { fg: 'white', bg: COLORS.btnFocusBg },
      },
    });

    installBtn.on('press', () => _handleTtsInstall(engine));
    installBtn.key(['enter', 'space'], () => _handleTtsInstall(engine));
    installBtn.key(['tab', 'down'], () => _cycleTtsFocus(1));
    installBtn.key(['S-tab', 'up'], () => _cycleTtsFocus(-1));
    installBtn.key(['escape'], () => {
      if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
    });

    _ttsEngineRows.push({ engine, nameLabel, statusLabel, descLabel, installBtn });
    if (!engine.native) _ttsFocusableItems.push(installBtn);
  }

  function _cycleTtsFocus(dir) {
    const items = _ttsFocusableItems.filter(b => !b.hidden);
    if (!items.length) {
      _s2ContinueBtn.focus();
      screen.render();
      return;
    }
    const nextIdx = _ttsFocusIndex + dir;
    if (dir > 0 && nextIdx >= items.length) {
      // Tab past last install button → land on Continue
      _s2ContinueBtn.focus();
      screen.render();
      return;
    }
    _ttsFocusIndex = (nextIdx + items.length) % items.length;
    items[_ttsFocusIndex].focus();
    screen.render();
  }

  function _showTtsEngineRows() {
    for (const row of _ttsEngineRows) {
      const installed = checkEngineInstalled(row.engine.id);
      row.nameLabel.setContent(`{bold}{white-fg}${row.engine.name}{/white-fg}{/bold}`);
      row.statusLabel.setContent(installed
        ? '{green-fg}[Installed]{/green-fg}'
        : '{yellow-fg}[Not Found]{/yellow-fg}');
      row.nameLabel.show();
      row.statusLabel.show();
      row.descLabel.show();
      if (!installed && !row.engine.native) {
        row.installBtn.show();
      } else {
        row.installBtn.hide();
      }
    }
  }

  function _hideTtsEngineRows() {
    for (const row of _ttsEngineRows) {
      row.nameLabel.hide();
      row.statusLabel.hide();
      row.descLabel.hide();
      row.installBtn.hide();
    }
  }

  let _ttsInstalling = false;
  async function _handleTtsInstall(engine) {
    if (!engine.installCmd || _ttsInstalling) return;
    _ttsInstalling = true;

    const row = _ttsEngineRows.find(r => r.engine.id === engine.id);
    const spinFrames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let spinIdx = 0;
    const spinTimer = setInterval(() => {
      if (row) {
        row.statusLabel.setContent(`{yellow-fg}${spinFrames[spinIdx % spinFrames.length]} Installing...{/yellow-fg}`);
        screen.render();
      }
      spinIdx++;
    }, 100);

    try {
      const opts = { stdio: 'pipe', timeout: 1800000 };
      if (process.platform === 'win32') {
        opts.shell = true;
        await _execFileAsync(engine.installCmd, [], opts);
      } else {
        const parts = engine.installCmd.split(' ');
        await _execFileAsync(parts[0], parts.slice(1), opts);
      }

      clearInterval(spinTimer);
      const installed = checkEngineInstalled(engine.id);
      if (row) {
        row.statusLabel.setContent(installed
          ? '{green-fg}[Installed]{/green-fg}'
          : '{red-fg}[Install Failed]{/red-fg}');
        if (installed) row.installBtn.hide();
      }
    } catch (err) {
      clearInterval(spinTimer);
      if (row) {
        row.statusLabel.setContent(`{red-fg}[Failed]{/red-fg}`);
      }
    }
    _ttsInstalling = false;
    screen.render();
  }

  // Continue button for Screen 2
  const _s2ContinueBtn = _createBtn('Continue  ->', 'blue', () => {
    if (_screen < 3) { _screen++; _showCurrentScreen(); }
  });
  _s2ContinueBtn.hidden = true;
  _s2ContinueBtn.key(['right', 'enter'], () => { if (_screen < 3) { _screen++; _showCurrentScreen(); } });
  _s2ContinueBtn.key(['S-tab', 'up'], () => {
    const items = _ttsFocusableItems.filter(b => !b.hidden);
    if (items.length) {
      _ttsFocusIndex = items.length - 1;
      items[_ttsFocusIndex].focus();
      screen.render();
    }
  });

  // =========================================================================
  // SCREEN 3: LLM Providers (new — from llm-providers-tab)
  // =========================================================================

  let installedState = {};
  let providerFocusableItems = [];
  let providerFocusIndex = 0;
  let providerView = 'list'; // 'list' or 'info'

  // Provider row widgets (created once)
  const providerRows = [];
  const providerStatusTexts = [];

  // Transport provider row widgets (Configure-only, no Install/Remove)
  const transportRows = [];

  // Info box for provider details
  const infoBox = blessed.box({
    parent: box,
    top: 0,
    left: 0,
    width: '100%',
    bottom: 0,
    hidden: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    valign: 'top',
    scrollbar: { ch: '|', style: { fg: 'cyan' } },
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  // Provider header
  const providerHeader = blessed.text({
    parent: box,
    top: 0,
    left: 2,
    tags: true,
    hidden: true,
    content: '{bold}{cyan-fg}LLM Providers{/cyan-fg}{/bold}  Configure AgentVibes for your AI assistant:',
    style: { bg: COLORS.contentBg },
  });

  function createProviderRow(provider, rowIndex) {
    const yOffset = 2 + (rowIndex * 3);

    const label = blessed.text({
      parent: box,
      top: yOffset,
      left: 2,
      tags: true,
      hidden: true,
      content: `{bold}{white-fg}${provider.name}{/white-fg}{/bold}  {cyan-fg}${provider.desc}{/cyan-fg}`,
      style: { bg: COLORS.contentBg },
    });

    const statusText = blessed.text({
      parent: box,
      top: yOffset + 1,
      left: 4,
      tags: true,
      hidden: true,
      content: '{yellow-fg}Checking...{/yellow-fg}',
      style: { bg: COLORS.contentBg },
    });
    providerStatusTexts.push({ id: provider.id, widget: statusText });

    const installBtn = blessed.button({
      parent: box,
      top: yOffset + 1,
      left: 30,
      width: 14,
      height: 1,
      content: '  Install  ',
      tags: true,
      mouse: true,
      keys: true,
      hidden: true,
      style: {
        fg: COLORS.btnFg,
        bg: COLORS.btnBg,
        focus: { fg: 'white', bg: COLORS.btnFocusBg },
      },
    });

    const removeBtn = blessed.button({
      parent: box,
      top: yOffset + 1,
      left: 46,
      width: 12,
      height: 1,
      content: '  Remove  ',
      tags: true,
      mouse: true,
      keys: true,
      hidden: true,
      style: {
        fg: COLORS.btnFg,
        bg: COLORS.removeBg,
        focus: { fg: 'black', bg: COLORS.removeFocusBg },
      },
    });

    const configBtn = blessed.button({
      parent: box,
      top: yOffset + 1,
      left: 60,
      width: 14,
      height: 1,
      content: ' Configure ',
      tags: true,
      mouse: true,
      keys: true,
      hidden: true,
      style: {
        fg: 'black',
        bg: COLORS.cfgBg,
        focus: { fg: 'black', bg: COLORS.cfgFocusBg },
      },
    });

    // The "default" provider is config-only — it has no install/remove
    // semantics.  Hide those buttons and only show Configure.
    if (provider.isDefault) {
      installBtn.hide();
      removeBtn.hide();
    }

    // Wire actions
    installBtn.on('press', async () => { await handleProviderInstall(provider); });
    installBtn.key(['enter', 'space'], async () => { await handleProviderInstall(provider); });

    removeBtn.on('press', async () => { await handleProviderRemove(provider); });
    removeBtn.key(['enter', 'space'], async () => { await handleProviderRemove(provider); });

    configBtn.on('press', async () => { await handleProviderConfigure(provider); });
    configBtn.key(['enter', 'space'], async () => { await handleProviderConfigure(provider); });

    // Navigation on each button — for the default provider, only Configure
    // is focusable since install/remove are hidden.
    const navButtons = provider.isDefault ? [configBtn] : [installBtn, removeBtn, configBtn];
    for (const btn of navButtons) {
      btn.key(['tab', 'right'], () => { cycleFocus(1); });
      btn.key(['S-tab', 'left'], () => { cycleFocus(-1); });
      btn.key(['escape'], () => {
        if (typeof focusMainTabBar === 'function') {
          focusMainTabBar();
          screen.render();
        }
      });
      btn.key(['up'], () => {
        const prevIdx = providerFocusIndex - 3;
        if (prevIdx >= 0) {
          providerFocusIndex = prevIdx;
          providerFocusableItems[providerFocusIndex].focus();
          screen.render();
        } else if (typeof focusMainTabBar === 'function') {
          focusMainTabBar();
        }
      });
      btn.key(['down'], () => {
        // Column-preserving down nav.  If pressing down from Install/Remove
        // would land on the Default row (which has no Install/Remove — all
        // three slots are configBtn duplicates), don't move.  Configure
        // column navigates normally into Default row's Configure.
        const col = providerFocusIndex % 3;
        const nextIdx = providerFocusIndex + 3;
        if (nextIdx >= providerFocusableItems.length) return;
        const nextRowIdx = Math.floor(nextIdx / 3);
        const nextRow = PROVIDERS[nextRowIdx];
        if (col < 2 && nextRow && nextRow.isDefault) return; // skip Default from Install/Remove
        if (providerFocusableItems[nextIdx].hidden) return; // skip hidden (e.g. Config not installed)
        providerFocusIndex = nextIdx;
        providerFocusableItems[providerFocusIndex].focus();
        screen.render();
      });
    }

    providerRows.push({ id: provider.id, label, statusText, installBtn, removeBtn, configBtn });
    return { installBtn, removeBtn, configBtn };
  }

  // Build all provider rows.
  // For the default provider, install/remove are hidden — push configBtn
  // three times so the row-of-3 arrow-nav arithmetic still works (every
  // "slot" in the default row lands on Configure, the only visible button).
  for (let i = 0; i < PROVIDERS.length; i++) {
    const { installBtn, removeBtn, configBtn } = createProviderRow(PROVIDERS[i], i);
    if (PROVIDERS[i].isDefault) {
      providerFocusableItems.push(configBtn, configBtn, configBtn);
    } else {
      providerFocusableItems.push(installBtn, removeBtn, configBtn);
    }
  }

  function cycleFocus(dir) {
    const len = providerFocusableItems.length;
    let next = (providerFocusIndex + dir + len) % len;
    // Skip hidden buttons (e.g. Configure when provider not installed)
    let steps = 0;
    while (providerFocusableItems[next].hidden && steps < len) {
      next = (next + dir + len) % len;
      steps++;
    }
    providerFocusIndex = next;
    providerFocusableItems[providerFocusIndex].focus();
    screen.render();
  }

  // ── Provider install/remove handlers ──────────────────────────────────────

  async function handleProviderInstall(provider) {
    // Remember which button the user was on so we can advance focus to
    // the NEXT row (same column) after they dismiss the info page.
    _preInfoFocusIndex = providerFocusIndex;

    if (provider.id === 'claude-code') {
      const wasInstalled = installedState[provider.id];
      const result = await installClaudeMcp(targetDir);
      await refreshInstalledState();
      showClaudeCodeInfo(result, wasInstalled);
      return;
    }

    if (provider.id === 'github-copilot') {
      const wasInstalled = installedState[provider.id];
      const result = await installCopilotMcp(targetDir);
      await installCopilotInstructions(targetDir, packageDir);
      await refreshInstalledState();
      showCopilotInfo(result, wasInstalled);
    }

    if (provider.id === 'openai-codex') {
      const wasInstalled = installedState[provider.id];
      const result = await installCodexMcp(targetDir);
      await installCodexInstructions(targetDir, packageDir);
      await installCodexHooks(targetDir, packageDir);
      await refreshInstalledState();
      showCodexInfo(result, wasInstalled);
    }

    if (provider.id === 'hermes') {
      const wasInstalled = installedState[provider.id];
      try {
        const result = await installHermes();
        await refreshInstalledState();
        showHermesInfo(result, wasInstalled);
      } catch (err) {
        showHermesInfo({ error: err.message }, wasInstalled);
      }
    }
  }

  async function handleProviderRemove(provider) {
    // Remember which button the user was on so we can advance focus to
    // the NEXT row (same column) after they dismiss the info page.
    _preInfoFocusIndex = providerFocusIndex;

    if (provider.id === 'claude-code') {
      const result = await uninstallClaude(targetDir);
      await refreshInstalledState();
      showRemoveInfo('claude-code', result.removed || []);
      return;
    }

    if (provider.id === 'github-copilot') {
      await removeCopilotMcp(targetDir);
      await removeCopilotInstructions(targetDir);
      await refreshInstalledState();
      showRemoveInfo('github-copilot');
    }

    if (provider.id === 'openai-codex') {
      await removeCodexMcp(targetDir);
      await removeCodexInstructions(targetDir);
      await removeCodexHooks(targetDir);
      await refreshInstalledState();
      showRemoveInfo('openai-codex');
    }

    if (provider.id === 'hermes') {
      await removeHermes();
      await refreshInstalledState();
      showRemoveInfo('hermes');
    }
  }

  // ── Provider configure handler ────────────────────────────────────────────

  async function handleProviderConfigure(provider) {
    if (provider.id === 'hermes') {
      const cfg = await getHermesConfig();
      _openHermesConfigModal(cfg);
      return;
    }
    const llmKeyMap = {
      'claude-code': 'claude-code',
      'github-copilot': 'copilot',
      'openai-codex': 'codex',
      'default': 'default',
    };
    const llmKey = llmKeyMap[provider.id] || provider.id;
    const config = loadLlmConfigSync(llmKey, targetDir);
    const sshCfg = await getTransportConfig(llmKey);
    _openLlmConfigModal(provider, llmKey, config, sshCfg);
  }

  // ── Hermes Audio Config Modal (issue #185) ───────────────────────────────
  // Matches the standard LLM config layout (_openLlmConfigModal) exactly,
  // with 6 standard audio fields + 4 Hermes-specific SSH fields.

  function _openHermesConfigModal(currentCfg) {
    if (navigationService?.isModalOpen()) return;
    let _closed = false;
    navigationService?.openModal(null, _closeModal);

    // Load standard audio fields from audio-effects.cfg (llm:hermes key)
    const llmConfig = loadLlmConfigSync('hermes', targetDir);

    const draft = {
      // Standard audio fields
      ttsEngine:    llmConfig.ttsEngine || '',
      voice:        llmConfig.voice || currentCfg.voice || '',
      pretext:      llmConfig.pretext || '',
      reverbPreset: llmConfig.effects || 'off',
      bgTrack:      llmConfig.bgTrack || '',
      bgVolume:     llmConfig.bgVolume || '0.15',
      // Hermes SSH fields
      mode:   currentCfg.mode === 'remote' ? 'remote' : 'local',
      sshKey: currentCfg.sshKey || '',
      host:   currentCfg.host   || '',
      port:   currentCfg.port   || '2222',
    };
    // Restore saved connType; fall back to auto-detect for legacy configs that
    // predate the connType field (host in ~/.ssh/config with no key/port).
    draft.connType = currentCfg.connType === 'alias' ? 'alias'
      : currentCfg.connType === 'manual' ? 'manual'
      : (_getSshConfigAliases().includes(draft.host) && !draft.sshKey && !draft.port) ? 'alias' : 'manual';

    const globalEngine = providerService?.getActiveProvider?.() || 'piper';
    const globalVoice  = providerService?.getActiveVoiceId?.() || 'none';

    const modal = blessed.box({
      parent: screen, top: 'center', left: 'center',
      width: 72, height: 26,
      border: { type: 'line' }, tags: true,
      label: ' {bold}{cyan-fg} Hermes — Audio Config {/cyan-fg}{/bold} ',
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    modal.setFront();

    function _buildFields() {
      const base = [
        { key: 'ttsEngine',   label: 'TTS Engine',  getValue: () => draft.ttsEngine || `(global: ${globalEngine})` },
        { key: 'voice',       label: 'Voice',        getValue: () => NATIVE_ENGINE_VOICES[draft.voice]?.label ?? (draft.voice || `(global: ${globalVoice})`) },
        { key: 'pretext',     label: 'Pretext',      getValue: () => draft.pretext || '(none)' },
        { key: 'audioEffects', label: 'Audio Effects', getValue: () => {
          const p = REVERB_PRESETS.find(r => r.value === draft.reverbPreset);
          return p ? p.label : draft.reverbPreset || 'Off';
        }},
        { key: 'bgTrack',     label: 'Music Track',  getValue: () => formatTrackName(draft.bgTrack) || '(default)' },
        { key: 'bgVolume',    label: 'Music Vol',    getValue: () => `${Math.round(parseFloat(draft.bgVolume) * 100)}%` },
        { key: 'destination', label: 'Destination',  getValue: () => draft.mode === 'remote' ? '🌐 Remote (SSH)' : '🏠 Local' },
      ];
      if (draft.mode === 'remote') {
        base.push({ key: 'sshConnection', label: 'SSH Connection', getValue: () => {
          if (draft.connType === 'alias') return `{cyan-fg}📋 ${draft.host || '(choose alias)'}{/cyan-fg}`;
          const h = draft.host || '(not set)';
          const p = draft.port ? `:${draft.port}` : '';
          const k = draft.sshKey ? '  🔑' : '';
          return `✏  ${h}${p}${k}`;
        }});
        if (draft.connType === 'manual') {
          base.push({ key: 'sshKey', label: 'SSH Key', getValue: () => draft.sshKey || '{gray-fg}(optional){/gray-fg}' });
          base.push({ key: 'port',   label: 'Port',    getValue: () => draft.port   || '{gray-fg}(default: 22){/gray-fg}' });
        }
      }
      return base;
    }

    function _fieldItems() {
      const fields = _buildFields();
      if (fieldList) fieldList.height = fields.length + 2;
      return fields.map(f => {
        const label = f.label.padEnd(16);
        return `  ${label} ${f.getValue()}`;
      });
    }

    const fieldList = blessed.list({
      parent: modal, top: 1, left: 2, right: 2,
      height: 12,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    fieldList.setItems(_fieldItems());

    blessed.text({
      parent: modal, bottom: 4, left: 2, right: 2, tags: true,
      content: '{white-fg}[Up/Down] Navigate  [Enter] Edit  [Tab] Buttons  [Esc] Close{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    // Buttons (same pattern as LLM config modal)
    function _modalBtn(label, leftPos, onClick) {
      const btn = blessed.button({
        parent: modal, content: label, bottom: 2, left: leftPos,
        mouse: true, keys: true, shrink: true,
        padding: { left: 1, right: 1 },
        style: {
          bg: 'blue', fg: 'white',
          focus: { bg: '#2e7d32', fg: 'white', bold: true },
          hover: { bg: '#2e7d32', fg: 'white', bold: true },
        },
      });
      btn.on('focus', () => { btn.style.bg = '#2e7d32'; btn.style.fg = 'white'; screen.render(); });
      btn.on('blur',  () => { btn.style.bg = 'blue';    btn.style.fg = 'white'; screen.render(); });
      btn.key(['enter', 'space'], () => onClick());
      btn.on('click', () => onClick());
      return btn;
    }

    const previewLine = blessed.text({
      parent: modal, bottom: 1, left: 2, right: 2, tags: true, content: '',
      style: { bg: COLORS.contentBg },
    });

    let _previewModalProc = null;
    function _killPreview() {
      if (_previewModalProc) { try { _previewModalProc.kill(); } catch {} _previewModalProc = null; }
    }

    // Auto-save: persist both audio config and Hermes SSH config
    function _autoSave(silent) {
      const engine = draft.ttsEngine || (draft.voice && !NATIVE_ENGINE_VOICES[draft.voice] ? 'piper' : '');
      saveLlmConfigSync('hermes', {
        voice:      draft.voice,
        pretext:    draft.pretext,
        effects:    draft.reverbPreset === 'off' ? '' : draft.reverbPreset,
        bgTrack:    draft.bgTrack,
        bgVolume:   draft.bgVolume,
        ttsEngine:  engine,
        sourcePath: llmConfig.sourcePath,
      }, targetDir);
      // Also persist Hermes SSH config (async, fire-and-forget)
      saveHermesConfig({
        mode:   draft.mode,
        sshKey: draft.sshKey,
        host:   draft.host,
        port:   draft.port,
        voice:  draft.voice,
      }).catch(() => {});
      if (!silent) _showSavedToast('Hermes Config', '~/.hermes/hooks/agentvibes-tts/agentvibes-ssh-config.json');
    }

    function _playPreview() {
      _killPreview();
      previewLine.setContent('{cyan-fg}♪ Previewing...{/cyan-fg}');
      screen.render();
      _autoSave(true);

      const hooksSubdir = process.platform === 'win32' ? 'hooks-windows' : 'hooks';
      const isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      const sampleText = 'This is how your Hermes audio settings sound right now.';
      let cmd, args;
      if (isWin) {
        const script = path.join(targetDir, '.claude', hooksSubdir, 'play-tts.ps1');
        cmd = 'powershell';
        args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, sampleText, '', '-llm', 'hermes'];
      } else {
        const script = path.join(targetDir, '.claude', hooksSubdir, 'play-tts.sh');
        cmd = 'bash';
        args = [script, sampleText, '', '--llm', 'hermes'];
      }
      const proc = spawn(cmd, args, {
        stdio: 'ignore', windowsHide: true,
        env: { ...process.env, CLAUDE_PROJECT_DIR: targetDir },
      });
      _previewModalProc = proc;
      proc.on('exit', (code) => {
        _previewModalProc = null;
        if (!_closed) {
          if (code !== 0 && code !== null) {
            const engineLabel = NATIVE_ENGINE_VOICES[draft.ttsEngine]?.label || draft.ttsEngine || 'engine';
            previewLine.setContent(`{red-fg}Preview failed — is ${engineLabel} running/installed?{/red-fg}`);
            screen.render();
            setTimeout(() => { if (!_closed) { previewLine.setContent(''); screen.render(); } }, 4000);
          } else {
            previewLine.setContent(''); screen.render();
          }
        }
      });
      proc.on('error', () => { _previewModalProc = null; if (!_closed) { previewLine.setContent('{red-fg}Preview failed{/red-fg}'); screen.render(); } });
    }

    const previewBtn = _modalBtn('Preview', 4, _playPreview);
    const resetBtn   = _modalBtn('Reset',   18, () => {
      draft.ttsEngine = ''; draft.voice = ''; draft.pretext = '';
      draft.reverbPreset = 'off'; draft.bgTrack = ''; draft.bgVolume = '0.15';
      _autoSave();
      fieldList.setItems(_fieldItems());
      fieldList.focus();
      screen.render();
    });
    const closeBtn = _modalBtn('Close', 30, _closeModal);

    const allBtns = [previewBtn, resetBtn, closeBtn];
    const btnBlink = attachBtnBlink(allBtns, screen);

    function _closeModal() {
      if (_closed) return;
      _closed = true;
      // Signal the wizard Escape handler to skip its own logic this keypress.
      // forceCloseAll() may have already decremented the depth to 0 before
      // setup-tab's screen.key('escape') handler fires, so we need this flag.
      _modalClosing = true;
      Promise.resolve().then(() => { _modalClosing = false; });
      _killPreview();
      btnBlink.cleanup();
      navigationService?.closeModal();
      destroyList(modal, screen);
      if (providerFocusableItems.length) providerFocusableItems[providerFocusIndex]?.focus();
      screen.render();
    }

    // ── Field editing via Enter ───────────────────────────────────────────
    fieldList.key(['enter'], () => {
      const idx   = fieldList.selected;
      const field = _buildFields()[idx];
      if (!field) return;

      const _refreshField = () => {
        if (_closed) return;
        _autoSave(true);
        fieldList.setItems(_fieldItems());
        fieldList.select(Math.min(idx, _buildFields().length - 1));
        fieldList.focus();
        screen.render();
      };
      const _cancelField = () => {
        if (_closed) return;
        fieldList.focus();
        screen.render();
      };

      switch (field.key) {
        case 'ttsEngine':      _openTtsEnginePicker(draft, _refreshField);      break;
        case 'voice':          _openVoicePickerForLlm(draft, _refreshField);    break;
        case 'pretext':        _openPretextEditor(modal, draft, _refreshField); break;
        case 'audioEffects':
          openReverbPicker(screen, draft.reverbPreset, (val) => { draft.reverbPreset = val; _refreshField(); }, _cancelField, { applyToEffectsManager: false });
          break;
        case 'bgTrack':
          openTrackPicker(screen, draft.bgTrack, Math.round(parseFloat(draft.bgVolume) * 100), (track) => { draft.bgTrack = track; _refreshField(); }, _cancelField, { skipVolume: true });
          break;
        case 'bgVolume':
          openVolumeInput(screen, Math.round(parseFloat(draft.bgVolume) * 100), (volume) => { draft.bgVolume = (volume / 100).toFixed(2); _refreshField(); }, _cancelField);
          break;
        case 'destination':    _openDestinationPicker(draft, _refreshField);                                                break;
        case 'sshConnection':  if (draft.mode === 'local') break; _openSshConnectionPicker(draft, _refreshField);          break;
        case 'sshKey':         if (draft.connType !== 'manual') break; _openSshKeyPicker(draft, _refreshField);            break;
        case 'port':           if (draft.connType !== 'manual') break; _openSshPortPicker(draft, _refreshField);           break;
      }
    });

    fieldList.key(['escape', 'q', 'Q'], _closeModal);

    fieldList.on('blur', () => {
      fieldList.style.selected = { bg: COLORS.contentBg, fg: COLORS.labelFg };
      fieldList.setItems(_fieldItems());
      screen.render();
    });
    fieldList.on('focus', () => {
      fieldList.style.selected = { bg: 'blue', fg: 'yellow' };
      fieldList.setItems(_fieldItems());
      screen.render();
    });

    let _prevFieldSel = 0;
    fieldList.key(['down'], () => {
      const cur = fieldList.selected ?? 0;
      const last = _buildFields().length - 1;
      if (cur === last && _prevFieldSel === last) { allBtns[0].focus(); screen.render(); }
      _prevFieldSel = cur;
    });
    fieldList.key(['up'], () => {
      const cur = fieldList.selected ?? 0;
      if (cur === 0 && _prevFieldSel === 0) { allBtns[0].focus(); screen.render(); }
      _prevFieldSel = cur;
    });
    fieldList.key(['tab'], () => { allBtns[0].focus(); screen.render(); });

    for (let i = 0; i < allBtns.length; i++) {
      allBtns[i].key(['tab', 'right'],   () => { allBtns[(i + 1) % allBtns.length].focus(); screen.render(); });
      allBtns[i].key(['S-tab', 'left'],  () => { allBtns[(i - 1 + allBtns.length) % allBtns.length].focus(); screen.render(); });
      allBtns[i].key(['escape', 'q', 'Q'], _closeModal);
      allBtns[i].key(['up'], () => { fieldList.focus(); screen.render(); });
    }

    modal.key(['escape', 'q', 'Q'], _closeModal);
    fieldList.focus();
    screen.render();
  }

  // ── Shared SSH helpers (used by Hermes modal and Transport modal) ─────────

  function _openSshFieldEditor(draft, fieldKey, label, maxLen, onDone) {
    const editModal = blessed.box({
      parent: screen, top: 'center', left: 'center',
      width: 62, height: 8,
      border: { type: 'line' }, tags: true,
      label: ` {bold}{cyan-fg} Edit ${label} {/cyan-fg}{/bold} `,
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    editModal.setFront();
    blessed.text({
      parent: editModal, top: 1, left: 2, tags: true,
      content: `{white-fg}Enter ${label}:{/white-fg}`,
      style: { bg: COLORS.contentBg },
    });
    const inputBox = blessed.textbox({
      parent: editModal, top: 3, left: 2, right: 2, height: 3,
      border: { type: 'line' }, inputOnFocus: true,
      value: draft[fieldKey],
      style: { fg: 'white', bg: 'black', border: { fg: 'blue' }, focus: { border: { fg: 'cyan' } } },
    });
    function _closeEdit(save) {
      if (save) draft[fieldKey] = (inputBox.getValue() || '').trim().slice(0, maxLen);
      destroyList(editModal, screen);
      onDone();
    }
    inputBox.key(['enter'], () => _closeEdit(true));
    inputBox.key(['escape'], () => _closeEdit(false));
    inputBox.focus();
    inputBox.readInput(() => {});
    screen.render();
  }

  function _openSshKeyPicker(draft, onDone) {
    const sshConfigPath = path.join(os.homedir(), '.ssh', 'config');
    let keys = [];
    try {
      const raw = fs.readFileSync(sshConfigPath, 'utf8');
      const seen = new Set();
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*IdentityFile\s+(.+)\s*$/i); // NOSONAR
        if (m) {
          const expanded = m[1].trim().replace(/^~/, os.homedir());
          if (!seen.has(expanded)) { seen.add(expanded); keys.push(expanded); }
        }
      }
    } catch {}

    if (!keys.length) {
      _openSshFieldEditor(draft, 'sshKey', 'SSH Key Path', 512, onDone);
      return;
    }

    const items = [...keys, '  ✏  Enter path manually…'];
    const pickerH = Math.min(items.length + 4, 16);
    const picker = blessed.list({
      parent: screen, top: 'center', left: 'center',
      width: 62, height: pickerH,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      label: ' {bold}{cyan-fg} SSH Key {/cyan-fg}{/bold} ',
      items,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'black', bold: true },
      },
    });
    picker.setFront();
    const curIdx = keys.indexOf(draft.sshKey);
    if (curIdx >= 0) picker.select(curIdx);
    function _closePicker(save) {
      if (save) {
        const idx = picker.selected;
        if (idx === items.length - 1) {
          destroyList(picker, screen);
          _openSshFieldEditor(draft, 'sshKey', 'SSH Key Path', 512, onDone);
          return;
        }
        draft.sshKey = keys[idx] || draft.sshKey;
      }
      destroyList(picker, screen);
      onDone();
    }
    picker.key(['enter'], () => _closePicker(true));
    picker.key(['escape'], () => _closePicker(false));
    picker.focus();
    screen.render();
  }

  function _openDestinationPicker(draft, onDone) {
    const picker = blessed.list({
      parent: screen, top: 'center', left: 'center',
      width: 52, height: 6,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      label: ' {bold}{cyan-fg} Destination {/cyan-fg}{/bold} ',
      items: [
        '  🏠 Local   — Hermes & speakers on same machine',
        '  🌐 Remote  — Send audio over SSH to receiver',
      ],
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'black', bold: true },
      },
    });
    picker.setFront();
    picker.select(draft.mode === 'remote' ? 1 : 0);
    function _closePicker(save) {
      if (save) draft.mode = picker.selected === 1 ? 'remote' : 'local';
      destroyList(picker, screen);
      onDone();
    }
    picker.key(['enter'], () => _closePicker(true));
    picker.key(['escape'], () => _closePicker(false));
    picker.focus();
    screen.render();
  }

  // ── Known host / port discovery ──────────────────────────────────────────
  // Scans all config sources and returns deduplicated known values.

  function _getKnownHosts() {
    const seen = new Set();
    const hosts = [];
    function add(v) {
      if (v && !seen.has(v)) { seen.add(v); hosts.push(v); }
    }
    // transport-config.json — all provider entries
    try {
      const raw = fs.readFileSync(path.join(os.homedir(), '.agentvibes', 'transport-config.json'), 'utf8');
      const all = JSON.parse(raw);
      for (const cfg of Object.values(all)) { if (cfg?.host) add(cfg.host); }
    } catch {}
    // Hermes SSH config
    try {
      const hermesHome = process.env.HERMES_HOME || path.join(os.homedir(), '.hermes');
      const raw = fs.readFileSync(path.join(hermesHome, 'hooks', 'agentvibes-tts', 'agentvibes-ssh-config.json'), 'utf8');
      add(JSON.parse(raw).host);
    } catch {}
    // Legacy host txt files
    for (const f of ['ssh-remote-host.txt', 'agentvibes-receiver-host.txt', 'termux-ssh-host.txt']) {
      try { add(fs.readFileSync(path.join(os.homedir(), '.claude', f), 'utf8').trim()); } catch {}
    }
    return hosts;
  }

  function _getKnownPorts() {
    const seen = new Set();
    const ports = [];
    function add(v) {
      if (v && /^[0-9]+$/.test(String(v)) && !seen.has(String(v))) { seen.add(String(v)); ports.push(String(v)); }
    }
    // transport-config.json — all provider entries
    try {
      const raw = fs.readFileSync(path.join(os.homedir(), '.agentvibes', 'transport-config.json'), 'utf8');
      const all = JSON.parse(raw);
      for (const cfg of Object.values(all)) { if (cfg?.port) add(cfg.port); }
    } catch {}
    // Hermes SSH config
    try {
      const hermesHome = process.env.HERMES_HOME || path.join(os.homedir(), '.hermes');
      const raw = fs.readFileSync(path.join(hermesHome, 'hooks', 'agentvibes-tts', 'agentvibes-ssh-config.json'), 'utf8');
      add(JSON.parse(raw).port);
    } catch {}
    // Well-known SSH ports as fallback suggestions
    for (const p of ['22', '2222', '8022']) add(p);
    return ports;
  }

  // Parse ~/.ssh/config for Host aliases (excludes wildcards like *)
  function _getSshConfigAliases() {
    const aliases = [];
    const seen = new Set();
    try {
      const lines = fs.readFileSync(path.join(os.homedir(), '.ssh', 'config'), 'utf8').split('\n');
      for (const line of lines) {
        const m = line.match(/^\s*[Hh]ost\s+(.+)$/); // NOSONAR
        if (m) {
          for (const name of m[1].trim().split(/\s+/)) {
            if (!name.includes('*') && !name.includes('?') && !seen.has(name)) {
              seen.add(name);
              aliases.push(name);
            }
          }
        }
      }
    } catch {}
    return aliases;
  }

  function _openSshHostPicker(draft, onDone) {
    const aliases = _getSshConfigAliases();
    const known   = _getKnownHosts().filter(h => !aliases.includes(h));  // avoid duplicates

    // Build display items — aliases first (they carry key/port in ~/.ssh/config)
    const aliasItems = aliases.map(a => `  📋 ${a}  {gray-fg}(SSH alias){/gray-fg}`);
    const knownItems = known.map(h => `  ${h}`);
    const allItems   = [...aliasItems, ...knownItems, '  ✏  Enter manually…'];

    if (allItems.length === 1) {
      // Nothing configured yet — go straight to manual entry
      _openSshFieldEditor(draft, 'host', 'SSH Alias / Host / IP', 253, onDone);
      return;
    }

    const pickerH = Math.min(allItems.length + 4, 16);
    const picker = blessed.list({
      parent: screen, top: 'center', left: 'center',
      width: 66, height: pickerH,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      label: ' {bold}{cyan-fg} SSH Alias / Host / IP {/cyan-fg}{/bold} ',
      items: allItems,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'black', bold: true },
      },
    });
    picker.setFront();

    // Pre-select the current value
    const curAlias = aliases.indexOf(draft.host);
    const curKnown = known.indexOf(draft.host);
    if (curAlias >= 0)      picker.select(curAlias);
    else if (curKnown >= 0) picker.select(aliases.length + curKnown);

    function _closePicker(save) {
      if (save) {
        const idx = picker.selected;
        if (idx === allItems.length - 1) {
          // "Enter manually" — open free-form editor
          destroyList(picker, screen);
          _openSshFieldEditor(draft, 'host', 'SSH Alias / Host / IP', 253, onDone);
          return;
        }
        if (idx < aliases.length) {
          // SSH alias — key/port are defined in ~/.ssh/config, clear them so SSH uses the config
          draft.host   = aliases[idx];
          draft.sshKey = '';
          draft.port   = '';
        } else {
          // Known IP/hostname — just update host, leave key/port alone
          draft.host = known[idx - aliases.length] || draft.host;
        }
      }
      destroyList(picker, screen);
      onDone();
    }
    picker.key(['enter'], () => _closePicker(true));
    picker.key(['escape'], () => _closePicker(false));
    picker.focus();
    screen.render();
  }

  // Two-step SSH connection picker: choose Alias or Manual mode.
  // Alias:  pick a host from ~/.ssh/config — key/port handled by SSH config.
  // Manual: sequential entry of host → SSH key → port.
  function _openSshConnectionPicker(draft, onDone) {
    const aliases = _getSshConfigAliases();
    const hasAliases = aliases.length > 0;
    const picker = blessed.list({
      parent: screen, top: 'center', left: 'center',
      width: 64, height: 8,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      label: ' {bold}{cyan-fg} SSH Connection {/cyan-fg}{/bold} ',
      items: [
        `  📋 SSH Alias   — pick from ~/.ssh/config${hasAliases ? '' : '  {gray-fg}(none found){/gray-fg}'}`,
        '  ✏  Manual      — enter host, key, and port',
      ],
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'black', bold: true },
      },
    });
    picker.setFront();
    picker.select(draft.connType === 'alias' ? 0 : 1);
    picker.key(['enter'], () => {
      const isAlias = picker.selected === 0;
      destroyList(picker, screen);
      if (isAlias) {
        if (!hasAliases) { draft.connType = 'manual'; _openSshFieldEditor(draft, 'host', 'Host / IP', 253, onDone); return; }
        _openSshAliasPicker(draft, onDone);
      } else {
        draft.connType = 'manual';
        _openSshFieldEditor(draft, 'host', 'Host / IP', 253, () =>
          _openSshKeyPicker(draft, () =>
            _openSshPortPicker(draft, onDone)));
      }
    });
    picker.key(['escape'], () => { destroyList(picker, screen); onDone(); });
    picker.focus();
    screen.render();
  }

  function _openSshAliasPicker(draft, onDone) {
    const aliases = _getSshConfigAliases();
    if (!aliases.length) { draft.connType = 'manual'; _openSshFieldEditor(draft, 'host', 'Host / IP', 253, onDone); return; }
    const items = [...aliases.map(a => `  📋 ${a}`), '  ← Back'];
    const pickerH = Math.min(items.length + 4, 18);
    const picker = blessed.list({
      parent: screen, top: 'center', left: 'center',
      width: 54, height: pickerH,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      label: ' {bold}{cyan-fg} SSH Alias {/cyan-fg}{/bold} ',
      items,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'black', bold: true },
      },
    });
    picker.setFront();
    const cur = aliases.indexOf(draft.host);
    if (cur >= 0) picker.select(cur);
    picker.key(['enter'], () => {
      const idx = picker.selected;
      destroyList(picker, screen);
      if (idx === items.length - 1) { _openSshConnectionPicker(draft, onDone); return; }
      draft.connType = 'alias';
      draft.host   = aliases[idx];
      draft.sshKey = '';
      draft.port   = '';
      onDone();
    });
    picker.key(['escape'], () => { destroyList(picker, screen); _openSshConnectionPicker(draft, onDone); });
    picker.focus();
    screen.render();
  }

  function _openSshPortPicker(draft, onDone) {
    const known = _getKnownPorts();
    if (!known.length) { _openSshFieldEditor(draft, 'port', 'Port', 10, onDone); return; }
    const items = [...known, '  ✏  Enter manually…'];
    const pickerH = Math.min(items.length + 4, 14);
    const picker = blessed.list({
      parent: screen, top: 'center', left: 'center',
      width: 40, height: pickerH,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      label: ' {bold}{cyan-fg} Port {/cyan-fg}{/bold} ',
      items,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'black', bold: true },
      },
    });
    picker.setFront();
    const curIdx = known.indexOf(draft.port);
    if (curIdx >= 0) picker.select(curIdx);
    function _closePicker(save) {
      if (save) {
        const idx = picker.selected;
        if (idx === items.length - 1) { destroyList(picker, screen); _openSshFieldEditor(draft, 'port', 'Port', 10, onDone); return; }
        draft.port = known[idx] || draft.port;
      }
      destroyList(picker, screen);
      onDone();
    }
    picker.key(['enter'], () => _closePicker(true));
    picker.key(['escape'], () => _closePicker(false));
    picker.focus();
    screen.render();
  }

  // ── Transport SSH Config Modal ────────────────────────────────────────────
  // Shared by ssh-remote, agentvibes-receiver, termux-ssh.
  // Shows 3 SSH fields: SSH Key, Host / IP, Port.

  function _openTransportConfigModal(provider, currentCfg) {
    if (navigationService?.isModalOpen()) return;
    let _closed = false;
    navigationService?.openModal(null, _closeModal);

    const draft = {
      sshKey: currentCfg.sshKey || '',
      host:   currentCfg.host   || '',
      port:   currentCfg.port   || provider.defaultPort || '22',
    };
    draft.connType = currentCfg.connType === 'alias' ? 'alias'
      : currentCfg.connType === 'manual' ? 'manual'
      : (_getSshConfigAliases().includes(draft.host) && !draft.sshKey && !draft.port) ? 'alias' : 'manual';

    function _buildFields() {
      const base = [{ key: 'sshConnection', label: 'SSH Connection', getValue: () => {
        if (draft.connType === 'alias') return `{cyan-fg}📋 ${draft.host || '(choose alias)'}{/cyan-fg}`;
        const h = draft.host || '(not set)';
        const p = draft.port ? `:${draft.port}` : '';
        const k = draft.sshKey ? '  🔑' : '';
        return `✏  ${h}${p}${k}`;
      }}];
      if (draft.connType === 'manual') {
        base.push({ key: 'sshKey', label: 'SSH Key', getValue: () => draft.sshKey || '{gray-fg}(optional){/gray-fg}' });
        base.push({ key: 'port',   label: 'Port',    getValue: () => draft.port   || provider.defaultPort || '{gray-fg}(default){/gray-fg}' });
      }
      return base;
    }

    function _fieldItems() {
      const fields = _buildFields();
      if (fieldList) fieldList.height = fields.length + 2;
      return fields.map(f => `  ${f.label.padEnd(16)} ${f.getValue()}`);
    }

    const modal = blessed.box({
      parent: screen, top: 'center', left: 'center',
      width: 72, height: 12,
      border: { type: 'line' }, tags: true,
      label: ` {bold}{cyan-fg} ${provider.name} — SSH Config {/cyan-fg}{/bold} `,
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    modal.setFront();

    const fieldList = blessed.list({
      parent: modal, top: 1, left: 2, right: 2,
      height: 5,
      keys: true, vi: false, mouse: true,
      border: { type: 'line' }, tags: true,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    fieldList.setItems(_fieldItems());

    blessed.text({
      parent: modal, bottom: 4, left: 2, right: 2, tags: true,
      content: '{white-fg}[Up/Down] Navigate  [Enter] Edit  [Tab] Buttons  [Esc] Close{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    const previewLine = blessed.text({
      parent: modal, bottom: 1, left: 2, right: 2, tags: true, content: '',
      style: { bg: COLORS.contentBg },
    });

    function _modalBtn(label, leftPos, onClick) {
      const btn = blessed.button({
        parent: modal, content: label, bottom: 2, left: leftPos,
        mouse: true, keys: true, shrink: true,
        padding: { left: 1, right: 1 },
        style: {
          bg: 'blue', fg: 'white',
          focus: { bg: '#2e7d32', fg: 'white', bold: true },
          hover: { bg: '#2e7d32', fg: 'white', bold: true },
        },
      });
      btn.on('focus', () => { btn.style.bg = '#2e7d32'; btn.style.fg = 'white'; screen.render(); });
      btn.on('blur',  () => { btn.style.bg = 'blue';    btn.style.fg = 'white'; screen.render(); });
      btn.key(['enter', 'space'], () => onClick());
      btn.on('click', () => onClick());
      return btn;
    }

    function _autoSave(silent) {
      saveTransportConfig(provider.id, draft).then(() => {
        // Refresh status text below provider name
        const row = transportRows.find(r => r.id === provider.id);
        if (row && draft.host) {
          row.statusText.setContent(`{gray-fg}→ ${draft.host}:${draft.port}{/gray-fg}`);
          screen.render();
        }
      }).catch(() => {});
      if (!silent) _showSavedToast(`${provider.name} Config`, `~/.agentvibes/transport-config.json`);
    }

    let _previewProc = null;
    function _killPreview() {
      if (_previewProc) { try { _previewProc.kill(); } catch {} _previewProc = null; }
    }

    function _playPreview() {
      _killPreview();
      previewLine.setContent('{cyan-fg}♪ Previewing...{/cyan-fg}');
      screen.render();
      _autoSave(true);
      const hooksSubdir = process.platform === 'win32' ? 'hooks-windows' : 'hooks';
      const isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      const sampleText = 'This is how your audio settings sound right now.';
      const script = path.join(targetDir, '.claude', hooksSubdir, isWin ? 'play-tts.ps1' : 'play-tts.sh');
      const proc = isWin
        ? spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, sampleText], { // NOSONAR
            stdio: 'ignore', windowsHide: true, env: { ...process.env, CLAUDE_PROJECT_DIR: targetDir },
          })
        : spawn('bash', [script, sampleText], { // NOSONAR
            stdio: 'ignore', env: { ...process.env, CLAUDE_PROJECT_DIR: targetDir },
          });
      _previewProc = proc;
      proc.on('exit', () => { _previewProc = null; if (!_closed) { previewLine.setContent(''); screen.render(); } });
      proc.on('error', () => { _previewProc = null; if (!_closed) { previewLine.setContent('{red-fg}Preview failed{/red-fg}'); screen.render(); } });
    }

    const saveBtn    = _modalBtn('Save',    4,  () => { _autoSave(false); });
    const previewBtn = _modalBtn('Preview', 12, _playPreview);
    const closeBtn   = _modalBtn('Close',   22, _closeModal);
    const allBtns = [saveBtn, previewBtn, closeBtn];
    const btnBlink = attachBtnBlink(allBtns, screen);

    function _closeModal() {
      if (_closed) return;
      _closed = true;
      _modalClosing = true;
      Promise.resolve().then(() => { _modalClosing = false; });
      _killPreview();
      btnBlink.cleanup();
      navigationService?.closeModal();
      destroyList(modal, screen);
      if (providerFocusableItems.length) providerFocusableItems[providerFocusIndex]?.focus();
      screen.render();
    }

    fieldList.key(['enter'], () => {
      const idx   = fieldList.selected;
      const field = _buildFields()[idx];
      if (!field) return;
      const _refreshField = () => {
        if (_closed) return;
        _autoSave(true);
        fieldList.setItems(_fieldItems());
        fieldList.select(Math.min(idx, _buildFields().length - 1));
        fieldList.focus();
        screen.render();
      };
      switch (field.key) {
        case 'sshConnection': _openSshConnectionPicker(draft, _refreshField); break;
        case 'sshKey':        if (draft.connType !== 'manual') break; _openSshKeyPicker(draft, _refreshField); break;
        case 'port':          if (draft.connType !== 'manual') break; _openSshPortPicker(draft, _refreshField); break;
      }
    });

    fieldList.key(['escape', 'q', 'Q'], _closeModal);
    fieldList.on('blur', () => {
      fieldList.style.selected = { bg: COLORS.contentBg, fg: COLORS.labelFg };
      fieldList.setItems(_fieldItems());
      screen.render();
    });
    fieldList.on('focus', () => {
      fieldList.style.selected = { bg: 'blue', fg: 'yellow' };
      fieldList.setItems(_fieldItems());
      screen.render();
    });
    fieldList.key(['tab'], () => { allBtns[0].focus(); screen.render(); });
    for (let i = 0; i < allBtns.length; i++) {
      allBtns[i].key(['tab', 'right'],   () => { allBtns[(i + 1) % allBtns.length].focus(); screen.render(); });
      allBtns[i].key(['S-tab', 'left'],  () => { allBtns[(i - 1 + allBtns.length) % allBtns.length].focus(); screen.render(); });
      allBtns[i].key(['escape', 'q', 'Q'], _closeModal);
      allBtns[i].key(['up'], () => { fieldList.focus(); screen.render(); });
    }

    modal.key(['escape', 'q', 'Q'], _closeModal);
    fieldList.focus();
    screen.render();
  }

  // ── LLM Config Modal ─────────────────────────────────────────────────────

  function _openLlmConfigModal(provider, llmKey, config, sshCfg = {}) {
    // Guard against double-open (key repeat, double-click)
    if (navigationService?.isModalOpen()) return;
    let _closed = false;
    navigationService?.openModal(null, _closeModal);

    const _folderName = path.basename(targetDir);
    const _folderPretext = _folderName
      ? _folderName.charAt(0).toUpperCase() + _folderName.slice(1) + ' here'
      : '';
    const defaultPretext = {
      'claude-code': _folderPretext,
      'copilot':     _folderPretext,
      'codex':       _folderPretext,
      'default':     _folderPretext,
    };

    // Read global defaults for display
    const globalEngine = providerService?.getActiveProvider?.() || 'piper';
    const globalVoice = providerService?.getActiveVoiceId?.() || 'none';

    const draft = {
      ttsEngine:    config.ttsEngine || '',
      voice:        config.voice || '',
      pretext:      config.pretext || defaultPretext[llmKey] || '',
      reverbPreset: config.effects || 'off',
      bgTrack:      config.bgTrack || '',
      bgVolume:     config.bgVolume || '0.15',
      // SSH destination fields
      mode:   sshCfg.mode === 'remote' ? 'remote' : 'local',
      sshKey: sshCfg.sshKey || '',
      host:   sshCfg.host   || '',
      port:   sshCfg.port   || '22',
    };
    draft.connType = sshCfg.connType === 'alias' ? 'alias'
      : sshCfg.connType === 'manual' ? 'manual'
      : (_getSshConfigAliases().includes(draft.host) && !draft.sshKey && !draft.port) ? 'alias' : 'manual';

    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 26,
      border: { type: 'line' },
      tags: true,
      label: ` {bold}{cyan-fg} ${provider.name} — Audio Config {/cyan-fg}{/bold} `,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
      },
    });
    modal.setFront();

    // Field definitions — dynamic based on mode/connType
    function _buildFields() {
      const base = [
        { key: 'ttsEngine',   label: 'TTS Engine',  getValue: () => draft.ttsEngine || `(global: ${globalEngine})` },
        { key: 'voice',       label: 'Voice',        getValue: () => NATIVE_ENGINE_VOICES[draft.voice]?.label ?? (draft.voice || `(global: ${globalVoice})`) },
        { key: 'pretext',     label: 'Pretext',      getValue: () => draft.pretext || '(none)' },
        { key: 'audioEffects', label: 'Audio Effects', getValue: () => {
          const p = REVERB_PRESETS.find(r => r.value === draft.reverbPreset);
          return p ? p.label : draft.reverbPreset || 'Off';
        }},
        { key: 'bgTrack',     label: 'Music Track',  getValue: () => formatTrackName(draft.bgTrack) || '(default)' },
        { key: 'bgVolume',    label: 'Music Vol',    getValue: () => `${Math.round(parseFloat(draft.bgVolume) * 100)}%` },
        { key: 'destination', label: 'Destination',  getValue: () => draft.mode === 'remote' ? '🌐 Remote (SSH)' : '🏠 Local' },
      ];
      if (draft.mode === 'remote') {
        base.push({ key: 'sshConnection', label: 'SSH Connection', getValue: () => {
          if (draft.connType === 'alias') return `{cyan-fg}📋 ${draft.host || '(choose alias)'}{/cyan-fg}`;
          const h = draft.host || '(not set)';
          const p = draft.port ? `:${draft.port}` : '';
          const k = draft.sshKey ? '  🔑' : '';
          return `✏  ${h}${p}${k}`;
        }});
        if (draft.connType === 'manual') {
          base.push({ key: 'sshKey', label: 'SSH Key', getValue: () => draft.sshKey || '{gray-fg}(optional){/gray-fg}' });
          base.push({ key: 'port',   label: 'Port',    getValue: () => draft.port   || '{gray-fg}(default: 22){/gray-fg}' });
        }
      }
      return base;
    }

    function _fieldItems() {
      const fields = _buildFields();
      if (fieldList) fieldList.height = fields.length + 2;
      return fields.map(f => {
        const label = f.label.padEnd(16);
        return `  ${label} ${f.getValue()}`;
      });
    }

    const fieldList = blessed.list({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: 12,
      keys: true,
      vi: false,
      mouse: true,
      border: { type: 'line' },
      tags: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    fieldList.setItems(_fieldItems());

    blessed.text({
      parent: modal,
      bottom: 4,
      left: 2,
      right: 2,
      tags: true,
      content: '{white-fg}[Up/Down] Navigate  [Enter] Edit  [Tab] Buttons  [Esc] Close{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    // Buttons
    function _modalBtn(label, leftPos, onClick) {
      const btn = blessed.button({
        parent: modal,
        content: label,
        bottom: 2,
        left: leftPos,
        mouse: true,
        keys: true,
        shrink: true,
        padding: { left: 1, right: 1 },
        style: {
          bg: 'blue',
          fg: 'white',
          focus: { bg: '#2e7d32', fg: 'white', bold: true },
          hover: { bg: '#2e7d32', fg: 'white', bold: true },
        },
      });
      btn.on('focus', () => { btn.style.bg = '#2e7d32'; btn.style.fg = 'white'; screen.render(); });
      btn.on('blur',  () => { btn.style.bg = 'blue';    btn.style.fg = 'white'; screen.render(); });
      btn.key(['enter', 'space'], () => onClick());
      btn.on('click', () => onClick());
      return btn;
    }

    // Preview status line
    const previewLine = blessed.text({
      parent: modal,
      bottom: 1,
      left: 2,
      right: 2,
      tags: true,
      content: '',
      style: { bg: COLORS.contentBg },
    });

    // _bgRestoreFn is modal-scoped so _killPreview can restore bg music synchronously,
    // eliminating the race condition when Preview is clicked twice rapidly.
    let _previewModalProc = null;
    let _bgRestoreFn = null;
    let _previewEnsureAbort = null;
    function _killPreview() {
      // Restore bg music immediately (synchronously) before killing the process.
      // This prevents the async exit-handler race where a second Preview invocation
      // reads bgWas=true (music already enabled) before the first's exit fires.
      if (_bgRestoreFn) { _bgRestoreFn(); _bgRestoreFn = null; }
      if (_previewEnsureAbort) { _previewEnsureAbort.abort(); _previewEnsureAbort = null; }
      if (_previewModalProc) {
        try { _previewModalProc.kill(); } catch {}
        _previewModalProc = null;
      }
    }

    function _playPreview() {
      _killPreview();
      previewLine.setContent('{cyan-fg}♪ Previewing...{/cyan-fg}');
      screen.render();

      // Save first so play-tts picks up current settings
      _autoSave(true);

      const hooksSubdir = process.platform === 'win32' ? 'hooks-windows' : 'hooks';
      const isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      // Don't include pretext — play-tts already prepends it from the config
      const sampleText = 'This is how your audio settings sound right now.';

      // Prefer package hooks (always up-to-date) over project-local copies which
      // may be stale installs from an older version. Fall back to targetDir if
      // the package hook doesn't exist (e.g. custom project-only setups).
      const _playTtsName = path.join('.claude', hooksSubdir, isWin ? 'play-tts.ps1' : 'play-tts.sh');
      const _hooksBase = fs.existsSync(path.join(packageDir, _playTtsName)) ? packageDir : targetDir;

      // Temporarily enable background music for preview if a track is configured.
      // Write to targetDir (project): audio-processor.sh checks CLAUDE_PROJECT_DIR first
      // (which is set to targetDir in the subprocess env), so this survives npm-link syncs
      // that would delete files from the package dir via rsync --delete.
      if (!!draft.bgTrack) {
        const bgEnabledFile = path.join(targetDir, '.claude', 'config', 'background-music-enabled.txt');
        let bgWas = false;
        try { bgWas = fs.readFileSync(bgEnabledFile, 'utf8').trim() === 'true'; } catch {}
        if (!bgWas) {
          try {
            fs.mkdirSync(path.dirname(bgEnabledFile), { recursive: true });
            fs.writeFileSync(bgEnabledFile, 'true', 'utf8');
          } catch {}
          _bgRestoreFn = () => { try { fs.writeFileSync(bgEnabledFile, 'false', 'utf8'); } catch {} };
        }
      }

      function _doSpawnPreview() {
        let cmd, args;
        if (isWin) {
          const script = path.join(_hooksBase, '.claude', hooksSubdir, 'play-tts.ps1');
          cmd = 'powershell';
          args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, sampleText, '', '-llm', llmKey];
        } else {
          const script = path.join(_hooksBase, '.claude', hooksSubdir, 'play-tts.sh');
          cmd = 'bash';
          args = [script, sampleText, '', '--llm', llmKey];
        }
        const proc = spawn(cmd, args, {
          stdio: 'ignore',
          windowsHide: true,
          env: { ...process.env, CLAUDE_PROJECT_DIR: targetDir, AGENTVIBES_LLM_KEY: `llm:${llmKey}` },
        });
        _previewModalProc = proc;

        proc.on('exit', (code) => {
          _previewModalProc = null;
          if (_bgRestoreFn) { _bgRestoreFn(); _bgRestoreFn = null; }
          if (!_closed) {
            if (code !== 0 && code !== null) {
              const engineLabel = NATIVE_ENGINE_VOICES[draft.ttsEngine]?.label || draft.ttsEngine || 'engine';
              previewLine.setContent(`{red-fg}Preview failed — is ${engineLabel} running/installed?{/red-fg}`);
              screen.render();
              setTimeout(() => { if (!_closed) { previewLine.setContent(''); screen.render(); } }, 4000);
            } else {
              previewLine.setContent(''); screen.render();
            }
          }
        });
        proc.on('error', () => {
          _previewModalProc = null;
          if (_bgRestoreFn) { _bgRestoreFn(); _bgRestoreFn = null; }
          if (!_closed) { previewLine.setContent('{red-fg}Preview failed{/red-fg}'); screen.render(); }
        });
      }  // end _doSpawnPreview

      // Soprano on Windows: ensure WebUI server is running before preview
      if (draft.ttsEngine === 'soprano' && isWin) {
        previewLine.setContent('{cyan-fg}Checking Soprano...{/cyan-fg}');
        screen.render();
        _previewEnsureAbort = new AbortController();
        _ensureSopranoWebUI((msg) => {
          if (!_closed) { previewLine.setContent(`{cyan-fg}${msg}{/cyan-fg}`); screen.render(); }
        }, _previewEnsureAbort.signal).then((ready) => {
          _previewEnsureAbort = null;
          if (_closed) return;
          if (!ready) {
            previewLine.setContent('{red-fg}Soprano WebUI failed to start{/red-fg}');
            screen.render();
            setTimeout(() => { if (!_closed) { previewLine.setContent(''); screen.render(); } }, 4000);
            return;
          }
          _doSpawnPreview();
        }).catch(() => { _previewEnsureAbort = null; });
        return;
      }
      _doSpawnPreview();
    }  // end _playPreview

    // Auto-save: persist draft to config immediately on any change
    function _autoSave(silent) {
      // Preserve draft.ttsEngine as authoritative; only infer 'piper' when engine
      // is unset AND voice is not a native-engine canonical ID.
      const engine = draft.ttsEngine || (draft.voice && !NATIVE_ENGINE_VOICES[draft.voice] ? 'piper' : '');
      saveLlmConfigSync(llmKey, {
        voice: draft.voice,
        pretext: draft.pretext,
        effects: draft.reverbPreset === 'off' ? '' : draft.reverbPreset,
        bgTrack: draft.bgTrack,
        bgVolume: draft.bgVolume,
        ttsEngine: engine,
        sourcePath: config.sourcePath,
      }, targetDir);
      // Persist SSH destination config (fire-and-forget)
      saveTransportConfig(llmKey, {
        mode:     draft.mode,
        connType: draft.connType,
        sshKey:   draft.sshKey,
        host:     draft.host,
        port:     draft.port,
      }).catch(() => {});
      if (!silent) {
        const cfgPath = config.sourcePath || resolveCfgPath(targetDir);
        _showSavedToast('Settings', cfgPath);
      }
    }

    const previewBtn = _modalBtn('Preview', 4, _playPreview);

    const resetBtn = _modalBtn('Reset', 18, () => {
      draft.ttsEngine = '';
      draft.voice = '';
      draft.pretext = defaultPretext[llmKey] || '';
      draft.reverbPreset = 'off';
      draft.bgTrack = '';
      draft.bgVolume = '0.15';
      draft.mode     = 'local';
      draft.connType = 'manual';
      draft.sshKey   = '';
      draft.host     = '';
      draft.port     = '22';
      _autoSave();
      fieldList.setItems(_fieldItems());
      fieldList.focus();
      screen.render();
    });

    const closeBtn = _modalBtn('Close', 30, _closeModal);

    const allBtns = [previewBtn, resetBtn, closeBtn];
    const btnBlink = attachBtnBlink(allBtns, screen);

    function _closeModal() {
      if (_closed) return;
      _closed = true;
      _modalClosing = true;
      Promise.resolve().then(() => { _modalClosing = false; });
      _killPreview();
      btnBlink.cleanup();
      navigationService?.closeModal();
      destroyList(modal, screen);
      if (providerFocusableItems.length) providerFocusableItems[providerFocusIndex]?.focus();
      screen.render();
    }

    // Field editing via Enter
    fieldList.key(['enter'], () => {
      const idx = fieldList.selected;
      const field = _buildFields()[idx];
      if (!field) return;

      const _refreshField = () => {
        if (_closed) return;
        _autoSave();
        fieldList.setItems(_fieldItems());
        fieldList.select(Math.min(idx, _buildFields().length - 1));
        fieldList.focus();
        screen.render();
      };
      const _cancelField = () => {
        if (_closed) return;
        fieldList.focus();
        screen.render();
      };

      switch (field.key) {
        case 'ttsEngine':
          _openTtsEnginePicker(draft, _refreshField);
          break;

        case 'voice':
          _openVoicePickerForLlm(draft, _refreshField, llmKey);
          break;

        case 'pretext':
          _openPretextEditor(modal, draft, _refreshField);
          break;

        case 'audioEffects':
          openReverbPicker(screen, draft.reverbPreset, (val) => {
            draft.reverbPreset = val;
            _refreshField();
          }, _cancelField, { applyToEffectsManager: false });
          break;

        case 'bgTrack':
          openTrackPicker(screen, draft.bgTrack, Math.round(parseFloat(draft.bgVolume) * 100), (track) => {
            draft.bgTrack = track;
            _refreshField();
          }, _cancelField, { skipVolume: true });
          break;

        case 'bgVolume':
          openVolumeInput(screen, Math.round(parseFloat(draft.bgVolume) * 100), (volume) => {
            draft.bgVolume = (volume / 100).toFixed(2);
            _refreshField();
          }, _cancelField);
          break;

        case 'destination':    _openDestinationPicker(draft, _refreshField);                                               break;
        case 'sshConnection':  if (draft.mode === 'local') break; _openSshConnectionPicker(draft, _refreshField);       break;
        case 'sshKey':         if (draft.connType !== 'manual') break; _openSshKeyPicker(draft, _refreshField);         break;
        case 'port':           if (draft.connType !== 'manual') break; _openSshPortPicker(draft, _refreshField);        break;
      }
    });

    fieldList.key(['escape', 'q', 'Q'], _closeModal);

    // Remove selection highlight when field list loses focus
    fieldList.on('blur', () => {
      fieldList.style.selected = { bg: COLORS.contentBg, fg: COLORS.labelFg };
      fieldList.setItems(_fieldItems());
      screen.render();
    });
    fieldList.on('focus', () => {
      fieldList.style.selected = { bg: 'blue', fg: 'yellow' };
      fieldList.setItems(_fieldItems());
      screen.render();
    });

    // Wrap: down on last field → focus Save; up on first field → focus Save
    // One extra arrow press at boundary moves to button row.
    // Track previous selection so arriving at boundary doesn't immediately jump.
    let _prevFieldSel = 0;
    fieldList.key(['down'], () => {
      const cur = fieldList.selected ?? 0;
      const last = _buildFields().length - 1;
      if (cur === last && _prevFieldSel === last) {
        allBtns[0].focus(); screen.render();
      }
      _prevFieldSel = cur;
    });
    fieldList.key(['up'], () => {
      const cur = fieldList.selected ?? 0;
      if (cur === 0 && _prevFieldSel === 0) {
        allBtns[0].focus(); screen.render();
      }
      _prevFieldSel = cur;
    });
    fieldList.key(['tab'], () => {
      allBtns[0].focus();
      screen.render();
    });

    for (let i = 0; i < allBtns.length; i++) {
      allBtns[i].key(['tab', 'right'], () => {
        allBtns[(i + 1) % allBtns.length].focus();
        screen.render();
      });
      allBtns[i].key(['S-tab', 'left'], () => {
        allBtns[(i - 1 + allBtns.length) % allBtns.length].focus();
        screen.render();
      });
      allBtns[i].key(['escape', 'q', 'Q'], _closeModal);
      allBtns[i].key(['up'], () => {
        fieldList.focus();
        screen.render();
      });
    }

    modal.key(['escape', 'q', 'Q'], _closeModal);
    fieldList.focus();
    screen.render();
  }

  // ── TTS Engine picker (for config modal) ──────────────────────────────────

  function _openTtsEnginePicker(draft, onDone) {
    function _closePicker() {
      navigationService?.closeModal();
      destroyList(picker, screen);
      onDone();
    }
    navigationService?.openModal(null, _closePicker);

    const engines = getEngineStatuses();
    const items = engines.map(e => {
      const status = e.installed ? '{green-fg}[OK]{/green-fg}' : '{yellow-fg}[Not Found]{/yellow-fg}';
      return `  ${e.name.padEnd(20)} ${status}  ${e.desc}`;
    });
    // Add "(global default)" option at top
    items.unshift('  (global default)');

    const picker = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 70,
      height: Math.min(items.length + 4, 16),
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Select TTS Engine {/cyan-fg}{/bold} ',
      keys: true,
      vi: false,
      mouse: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    picker.setFront();
    picker.setItems(items);

    picker.key(['enter'], () => {
      const idx = picker.selected;
      const selectedEngine = idx === 0 ? '' : engines[idx - 1].id;
      // Guard: block selection of non-installed optional engines
      if (selectedEngine) {
        const engineStatus = engines.find(e => e.id === selectedEngine);
        if (engineStatus && !engineStatus.installed && !engineStatus.native) {
          picker.setLabel(` {red-fg} ${engineStatus.name} is not installed — go to Setup > TTS Engines to install {/red-fg} `);
          screen.render();
          setTimeout(() => {
            if (!picker.destroyed) {
              picker.setLabel(' {bold}{cyan-fg} Select TTS Engine {/cyan-fg}{/bold} ');
              screen.render();
            }
          }, 3000);
          return;
        }
      }
      draft.ttsEngine = selectedEngine;
      // Auto-set voice to native engine canonical ID so the Voice field updates
      // immediately. For piper or empty engine, clear to '' (shows global default).
      draft.voice = NATIVE_ENGINE_VOICES[selectedEngine]?.id || '';
      _closePicker();
    });

    picker.key(['escape', 'q', 'Q'], _closePicker);

    picker.focus();
    screen.render();
  }

  // ── API Key Warning Popup ─────────────────────────────────────────────────
  // Non-blocking warning when a cloud TTS provider needs an API key.
  // Shows on top of whatever is currently open; calls onDismiss() when closed.
  function _showApiKeyWarning(serviceName, envVarName, keyFilePath, onDismiss) {
    const warningBox = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 66,
      height: 11,
      border: { type: 'line' },
      tags: true,
      label: ` {bold}{yellow-fg} ${serviceName} — API Key Not Detected {/yellow-fg}{/bold} `,
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'yellow' } },
    });
    warningBox.setFront();

    blessed.text({
      parent: warningBox, top: 1, left: 2, right: 2, tags: true,
      content: `{yellow-fg}No API key found for ${serviceName}.{/yellow-fg}`,
      style: { bg: COLORS.contentBg },
    });
    blessed.text({
      parent: warningBox, top: 3, left: 2, right: 2, tags: true,
      content: `Set it in your shell:\n  {cyan-fg}export ${envVarName}=your_key_here{/cyan-fg}`,
      style: { bg: COLORS.contentBg },
    });
    blessed.text({
      parent: warningBox, top: 6, left: 2, right: 2, tags: true,
      content: `Or write the key to:\n  {cyan-fg}${keyFilePath}{/cyan-fg}`,
      style: { bg: COLORS.contentBg },
    });
    blessed.text({
      parent: warningBox, bottom: 1, left: 2, right: 2, tags: true,
      content: '{gray-fg}[Enter] or [Esc] to dismiss{/gray-fg}',
      style: { bg: COLORS.contentBg },
    });

    function _closeWarning() {
      destroyList(warningBox, screen);
      onDismiss();
    }

    warningBox.key(['enter', 'escape', 'space', 'q', 'Q'], _closeWarning);
    warningBox.on('click', _closeWarning);
    warningBox.focus();
    screen.render();
  }

  // ── Voice picker for LLM config (matches agents-tab pattern) ──────────────

  // ── Kokoro voice scanner ─────────────────────────────────────────────────
  // Full static list for Kokoro v0.9.x. Voices not yet cached are downloaded
  // automatically by the library on first use via huggingface-hub.
  const _KOKORO_ALL_VOICES = [
    // American English female
    'af_heart','af_alloy','af_aoede','af_bella','af_jessica',
    'af_kore','af_nicole','af_nova','af_river','af_sarah','af_sky',
    // American English male
    'am_adam','am_echo','am_eric','am_fenrir','am_liam','am_michael','am_onyx','am_puck',
    // British English female
    'bf_alice','bf_emma','bf_isabella','bf_lily',
    // British English male
    'bm_daniel','bm_fable','bm_george','bm_lewis',
    // Japanese
    'jf_alpha','jf_gongitsune','jf_nezumi','jf_tebukuro','jm_kumo',
    // Mandarin Chinese
    'zf_xiaobei','zf_xiaoni','zf_xiaoxiao','zf_xiaoyi','zm_yunxi','zm_yunxia','zm_yunyang',
    // Spanish
    'ef_dora','em_alex','em_santa',
    // French
    'ff_siwis',
    // Hindi
    'hf_alpha','hm_omega',
    // Italian
    'if_sara','im_nicola',
    // Brazilian Portuguese
    'pf_dora','pm_alex','pm_santa',
    // Korean
    'kf_alpha','km_hyunsu',
  ];

  function _scanKokoroVoices() {
    // Determine which voices are already cached locally
    const cached = new Set();
    try {
      const snapshotsDir = path.join(
        os.homedir(), '.cache', 'huggingface', 'hub',
        'models--hexgrad--Kokoro-82M', 'snapshots'
      );
      for (const snap of fs.readdirSync(snapshotsDir)) {
        const voicesDir = path.join(snapshotsDir, snap, 'voices');
        if (!fs.existsSync(voicesDir)) continue;
        for (const f of fs.readdirSync(voicesDir)) {
          if (f.endsWith('.pt')) cached.add(f.replace('.pt', ''));
        }
      }
    } catch {}
    return { voices: _KOKORO_ALL_VOICES, cached };
  }

  function _kokoroVoiceLabel(id) {
    const prefix = id.slice(0, 2);
    const name = id.slice(3);
    const lang = {
      af: 'en-US ♀', am: 'en-US ♂', bf: 'en-GB ♀', bm: 'en-GB ♂',
      jf: 'ja ♀',    jm: 'ja ♂',    zf: 'zh ♀',    zm: 'zh ♂',
      ef: 'es ♀',    em: 'es ♂',    ff: 'fr ♀',    fm: 'fr ♂',
      hf: 'hi ♀',    hm: 'hi ♂',    pf: 'pt ♀',    pm: 'pt ♂',
      kf: 'ko ♀',    km: 'ko ♂',    if: 'it ♀',    im: 'it ♂',
    }[prefix] || prefix;
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return `${label.padEnd(14)} {gray-fg}(${lang}){/gray-fg}  {cyan-fg}${id}{/cyan-fg}`;
  }

  function _openKokoroVoicePicker(draft, onDone, llmKey = '') {
    const { voices, cached } = _scanKokoroVoices();
    let _kClosed = false;
    let _kPreviewProc = null;
    let _kTmpWav = null;
    let _kAnimInterval = null;

    // Read SSH config so previews route to the receiver
    let _sshHost = '', _sshKey = '', _sshPort = '22';
    try {
      const tcPath = path.join(os.homedir(), '.agentvibes', 'transport-config.json');
      const tc = JSON.parse(fs.readFileSync(tcPath, 'utf8'));

      // Priority 1: per-LLM remote config (e.g. tc['claude-code'].mode === 'remote')
      if (llmKey && tc[llmKey]?.mode === 'remote') {
        _sshHost = tc[llmKey].host || '';
        _sshKey  = tc[llmKey].sshKey || '';
        _sshPort = String(tc[llmKey].port || '22');
      }

      // Priority 2: global provider is explicitly ssh-remote/agentvibes-receiver
      if (!_sshHost) {
        const provFilePath = path.join(os.homedir(), '.claude', 'tts-provider.txt');
        const globalProv = fs.readFileSync(provFilePath, 'utf8').trim();
        if (globalProv === 'ssh-remote' || globalProv === 'agentvibes-receiver') {
          _sshHost = tc[globalProv]?.host || '';
          _sshKey  = tc[globalProv]?.sshKey || '';
          _sshPort = String(tc[globalProv]?.port || '22');
        }
      }

      // Priority 3: scan all transport-config entries for any mode=remote entry
      // (mirrors play-tts-ssh-remote.sh Priority 2b — handles the case where
      // tts-provider.txt says 'piper' but a per-LLM remote route is configured)
      if (!_sshHost) {
        for (const val of Object.values(tc)) {
          if (val?.mode === 'remote' && val?.host) {
            _sshHost = val.host;
            _sshKey  = val.sshKey || '';
            _sshPort = String(val.port || '22');
            break;
          }
        }
      }
    } catch {}

    // Pre-validate SSH config once so the space handler can branch without re-checking
    const _validSshHost = Boolean(_sshHost && /^[a-zA-Z0-9][a-zA-Z0-9._@:-]*$/.test(_sshHost));
    const _validSshKey  = Boolean(_sshKey && /^\//.test(_sshKey) && fs.existsSync(_sshKey));
    const _validSshPort = Boolean(_sshPort && /^\d+$/.test(_sshPort));

    const IDLE_LABEL = ' {bold}{cyan-fg} Kokoro — Select Voice {/cyan-fg}{/bold} ';

    function _killKPreview() {
      if (_kAnimInterval) { clearInterval(_kAnimInterval); _kAnimInterval = null; }
      if (_kPreviewProc) { try { _kPreviewProc.kill(); } catch {} _kPreviewProc = null; }
      if (_kTmpWav) { try { fs.unlinkSync(_kTmpWav); } catch {} _kTmpWav = null; }
    }
    function _closeKP() {
      if (_kClosed) return;
      _kClosed = true;
      _killKPreview();
      // _dlAllProc and _dlAllActive are closed via _kClosed check in the dl loop
      navigationService?.closeModal();
      destroyList(kBox, screen, onDone);
    }
    navigationService?.openModal(null, _closeKP);

    // ★ = cached locally, ☁ = auto-downloads from HuggingFace on first preview/use
    const items = voices.map(id => {
      const mark = cached.has(id) ? '{green-fg}★{/green-fg}' : '{cyan-fg}☁{/cyan-fg}';
      return `  ${mark} ${_kokoroVoiceLabel(id)}`;
    });

    const LEGEND_H = 1;
    const pickerH = Math.min(voices.length + LEGEND_H + 3, 22);

    // Outer box (border + label) — legend is a fixed child, not part of the scroll list
    const kBox = blessed.box({
      parent: screen,
      top: 'center', left: 'center',
      width: 78, height: pickerH,
      border: { type: 'line' }, tags: true,
      label: IDLE_LABEL,
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    kBox.setFront();

    // Fixed legend row — pinned at top so it never scrolls away
    blessed.text({
      parent: kBox, top: 0, left: 0, right: 0, height: LEGEND_H, tags: true,
      content: '{gray-fg}[{/gray-fg}{#FF69B4-fg}Enter{/#FF69B4-fg}{gray-fg}]={/gray-fg}{#FFD700-fg}select{/#FFD700-fg}  {gray-fg}[{/gray-fg}Space{gray-fg}]={/gray-fg}{#FFD700-fg}sample{/#FFD700-fg}  {green-fg}★{/green-fg}{gray-fg}={/gray-fg}{#FFD700-fg}cached{/#FFD700-fg}  {cyan-fg}☁{/cyan-fg}{gray-fg}={/gray-fg}{#FFD700-fg}Download{/#FFD700-fg}  {gray-fg}[D]={/gray-fg}all  {gray-fg}[Esc]={/gray-fg}cancel',
      style: { bg: COLORS.contentBg },
    });

    // Scrollable voice list — starts below the legend row
    const kPicker = blessed.list({
      parent: kBox,
      top: LEGEND_H, left: 0, right: 0, bottom: 0,
      keys: true, vi: true, mouse: true, tags: true,
      items,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: '|', style: { fg: 'cyan' } },
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        selected: { bg: 'green', fg: 'white', bold: true },
        item: { fg: COLORS.labelFg },
      },
    });

    const curIdx = voices.indexOf(draft.voice);
    if (curIdx >= 0) kPicker.select(curIdx);

    kPicker.key(['enter'], () => {
      if (voices.length) draft.voice = voices[kPicker.selected];
      _closeKP();
    });

    kPicker.key(['space'], () => {
      if (!voices.length) return;
      const voiceId = voices[kPicker.selected];
      if (_kPreviewProc) {
        _killKPreview();
        kBox.setLabel(IDLE_LABEL);
        screen.render();
        return;
      }

      const phrase = `Hi, I am the ${voiceId.slice(3)} Kokoro voice.`;

      // ── Remote preview: route through SSH pipeline so receiver plays it ──
      if (_validSshHost) {
        kBox.setLabel(` {cyan-fg}♪ ${voiceId}... (Space=stop){/cyan-fg} `);
        screen.render();
        const hookDir = path.join(packageDir, '.claude', 'hooks');
        const remoteEnv = { ...process.env, CLAUDE_PROJECT_DIR: targetDir, AGENTVIBES_SSH_HOST: _sshHost };
        if (_validSshKey)  remoteEnv.AGENTVIBES_SSH_KEY  = _sshKey;
        if (_validSshPort) remoteEnv.AGENTVIBES_SSH_PORT = _sshPort;
        let remoteProc;
        try {
          remoteProc = spawn('bash', [path.join(hookDir, 'play-tts-ssh-remote.sh'), phrase, voiceId], { // NOSONAR
            stdio: 'ignore',
            env: remoteEnv,
          });
        } catch {
          if (!_kClosed) {
            kBox.setLabel(` {red-fg}Remote preview failed{/red-fg} `);
            screen.render();
            setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 3000);
          }
          return;
        }
        _kPreviewProc = remoteProc;
        // play-tts-ssh-remote.sh backgrounds SSH and exits quickly — keep label 2s
        remoteProc.on('exit', () => {
          _kPreviewProc = null;
          setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 2000);
        });
        remoteProc.on('error', () => {
          _kPreviewProc = null;
          if (!_kClosed) {
            kBox.setLabel(` {red-fg}Remote preview failed{/red-fg} `);
            screen.render();
            setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 3000);
          }
        });
        return;
      }

      // ── Local preview: synthesize WAV then play ──────────────────────────
      const isDownloaded = cached.has(voiceId);

      // ── Download progress bar helpers ──────────────────────────────────────
      const DL_BAR_W = 22;
      const DL_SPIN  = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
      let _dlSpinIdx = 0;
      let _dlRealPct = -1;  // -1 = no real % received yet

      function _dlBarLabel(pct) {
        const filled = Math.round(pct * DL_BAR_W / 100);
        const bar = '{yellow-fg}' + '█'.repeat(filled) + '{/yellow-fg}'
                  + '{#555555-fg}' + '░'.repeat(DL_BAR_W - filled) + '{/#555555-fg}';
        return ` {yellow-fg}☁{/yellow-fg} [${bar}{gray-fg}]{/gray-fg} {white-fg}${pct}%{/white-fg} {gray-fg}${voiceId}{/gray-fg} `;
      }

      function _startDlAnim() {
        kBox.setLabel(_dlBarLabel(0));
        screen.render();
        _kAnimInterval = setInterval(() => {
          if (_kClosed) { clearInterval(_kAnimInterval); _kAnimInterval = null; return; }
          if (_dlRealPct >= 0) {
            // Real progress received — update bar, keep interval running for smooth render
            kBox.setLabel(_dlBarLabel(_dlRealPct));
          } else {
            // No real data yet — spin
            _dlSpinIdx = (_dlSpinIdx + 1) % DL_SPIN.length;
            kBox.setLabel(` {yellow-fg}${DL_SPIN[_dlSpinIdx]} Downloading ${voiceId}...{/yellow-fg} `);
          }
          screen.render();
        }, 120);
      }

      function _stopDlAnim() {
        if (_kAnimInterval) { clearInterval(_kAnimInterval); _kAnimInterval = null; }
      }
      // ──────────────────────────────────────────────────────────────────────

      if (isDownloaded) {
        kBox.setLabel(` {cyan-fg}♪ Synthesizing ${voiceId}...{/cyan-fg} `);
      } else {
        _startDlAnim();
      }
      screen.render();

      // Phase 1: synthesize WAV locally with kokoro-tts.py
      // stderr is captured so we can parse HuggingFace tqdm download progress
      const pyScript = path.join(packageDir, '.claude', 'hooks', 'kokoro-tts.py');
      const tmpWav = _secureTempWav('kokoro-preview');
      _kTmpWav = tmpWav;

      let synthProc;
      try {
        synthProc = spawn('python3', [pyScript, phrase, voiceId, tmpWav, '1.0'], { // NOSONAR
          stdio: ['ignore', 'ignore', 'pipe'],
          env: { ...process.env, CLAUDE_PROJECT_DIR: targetDir },
        });
      } catch {
        _stopDlAnim();
        _kTmpWav = null;
        try { fs.unlinkSync(tmpWav); } catch {}
        if (!_kClosed) {
          kBox.setLabel(` {red-fg}Preview failed — is Kokoro installed?{/red-fg} `);
          screen.render();
          setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 3000);
        }
        return;
      }
      _kPreviewProc = synthProc;

      // Always drain stderr to prevent pipe-buffer deadlock from PyTorch warnings.
      // For uncached voices, also parse tqdm download progress lines.
      let _stderrBuf = '';
      synthProc.stderr.on('data', (chunk) => {
        if (_kClosed) return;
        if (isDownloaded) return;  // just drain — no UI update needed
        _stderrBuf += chunk.toString();
        // tqdm writes \r-terminated progress on same line; split on \r or \n
        const parts = _stderrBuf.split(/[\r\n]/);
        _stderrBuf = parts.pop() ?? '';
        for (const line of parts) {
          const m = line.match(/\b(\d{1,3})%\s*\|/);
          if (m) {
            _dlRealPct = Math.min(100, parseInt(m[1], 10));
          }
        }
      });

      synthProc.on('exit', (synthCode) => {
        _stopDlAnim();
        _kPreviewProc = null;
        _kTmpWav = null;
        if (_kClosed) { try { fs.unlinkSync(tmpWav); } catch {} return; }
        if (synthCode !== 0) {
          try { fs.unlinkSync(tmpWav); } catch {}
          kBox.setLabel(` {red-fg}Synthesis failed — is Kokoro installed?{/red-fg} `);
          screen.render();
          setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 3000);
          return;
        }
        // Update icon to ★ for newly-downloaded voice
        if (!isDownloaded) {
          cached.add(voiceId);
          kPicker.setItem(kPicker.selected, `  {green-fg}★{/green-fg} ${_kokoroVoiceLabel(voiceId)}`);
        }

        // Phase 2: play WAV locally (remote destinations handled before synthesis via SSH pipeline)
        let playProc;
        try {
          playProc = spawn('bash', ['-c', `aplay -q "$1" 2>/dev/null || paplay "$1" 2>/dev/null || true`, '--', tmpWav], { // NOSONAR
            stdio: 'ignore',
            env: { ...process.env },
          });
        } catch {
          try { fs.unlinkSync(tmpWav); } catch {}
          if (!_kClosed) {
            kBox.setLabel(` {red-fg}Playback failed{/red-fg} `);
            screen.render();
            setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 3000);
          }
          return;
        }
        _kPreviewProc = playProc;
        _kTmpWav = tmpWav;
        kBox.setLabel(` {cyan-fg}♪ ${voiceId}... (Space=stop){/cyan-fg} `);
        screen.render();
        playProc.on('exit', () => {
          _kPreviewProc = null;
          if (_kTmpWav) { try { fs.unlinkSync(_kTmpWav); } catch {} _kTmpWav = null; }
          if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); }
        });
        playProc.on('error', () => {
          _kPreviewProc = null;
          if (_kTmpWav) { try { fs.unlinkSync(_kTmpWav); } catch {} _kTmpWav = null; }
          if (!_kClosed) { kBox.setLabel(` {red-fg}Playback failed{/red-fg} `); screen.render(); }
        });
      });

      synthProc.on('error', () => {
        _stopDlAnim();
        _kPreviewProc = null;
        _kTmpWav = null;
        try { fs.unlinkSync(tmpWav); } catch {}
        if (!_kClosed) {
          kBox.setLabel(` {red-fg}Preview failed — is Kokoro installed?{/red-fg} `);
          screen.render();
          setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 3000);
        }
      });
    });

    // Download All — sequentially downloads every uncached voice
    let _dlAllActive = false;
    let _dlAllProc = null;
    kPicker.key(['d', 'D'], () => {
      if (_kPreviewProc || _dlAllActive) return;
      const toDownload = voices.filter(v => !cached.has(v));
      if (!toDownload.length) {
        kBox.setLabel(` {green-fg}✓ All ${voices.length} voices already cached{/green-fg} `);
        setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 2500);
        screen.render();
        return;
      }
      _dlAllActive = true;
      let dlIdx = 0;

      function _dlNext() {
        if (_kClosed || dlIdx >= toDownload.length) {
          _dlAllActive = false;
          _dlAllProc = null;
          if (!_kClosed) {
            const total = voices.filter(v => cached.has(v)).length;
            kBox.setLabel(` {green-fg}✓ Download complete — ${total}/${voices.length} cached{/green-fg} `);
            setTimeout(() => { if (!_kClosed) { kBox.setLabel(IDLE_LABEL); screen.render(); } }, 3000);
            screen.render();
          }
          return;
        }
        const voiceId = toDownload[dlIdx];
        const n = dlIdx + 1;
        kBox.setLabel(` {yellow-fg}☁ ${n}/${toDownload.length}: ${voiceId}...{/yellow-fg} `);
        screen.render();

        const tmpWav = _secureTempWav('kokoro-dl');
        const pyScript = path.join(packageDir, '.claude', 'hooks', 'kokoro-tts.py');
        let dlProc;
        try {
          dlProc = spawn('python3', [pyScript, 'hello', voiceId, tmpWav, '1.0'], { // NOSONAR
            stdio: ['ignore', 'ignore', 'pipe'],
            env: { ...process.env, CLAUDE_PROJECT_DIR: targetDir },
          });
        } catch {
          dlIdx++;
          _dlNext();
          return;
        }
        _dlAllProc = dlProc;

        let _buf = '', _dlPct = -1;
        const DL_W = 18;
        dlProc.stderr.on('data', (chunk) => {
          if (_kClosed) return;
          _buf += chunk.toString();
          const parts = _buf.split(/[\r\n]/);
          _buf = parts.pop() ?? '';
          for (const line of parts) {
            const m = line.match(/\b(\d{1,3})%\s*\|/);
            if (m) {
              const pct = Math.min(100, parseInt(m[1], 10));
              if (pct !== _dlPct) {
                _dlPct = pct;
                const filled = Math.round(pct * DL_W / 100);
                const bar = '{yellow-fg}' + '█'.repeat(filled) + '{/yellow-fg}'
                          + '{#555555-fg}' + '░'.repeat(DL_W - filled) + '{/#555555-fg}';
                kBox.setLabel(` {yellow-fg}☁ ${n}/${toDownload.length} [${bar}] ${pct}% ${voiceId}{/yellow-fg} `);
                screen.render();
              }
            }
          }
        });

        dlProc.on('exit', (code) => {
          _dlAllProc = null;
          try { fs.unlinkSync(tmpWav); } catch {}
          if (code === 0) {
            cached.add(voiceId);
            const listIdx = voices.indexOf(voiceId);
            if (listIdx >= 0) kPicker.setItem(listIdx, `  {green-fg}★{/green-fg} ${_kokoroVoiceLabel(voiceId)}`);
          }
          dlIdx++;
          _dlNext();
        });
        dlProc.on('error', () => { _dlAllProc = null; try { fs.unlinkSync(tmpWav); } catch {} dlIdx++; _dlNext(); });
      }
      _dlNext();
    });

    kPicker.key(['escape', 'q', 'Q'], _closeKP);
    kPicker.focus();
    screen.render();
  }

  function _secureTempWav(prefix) {
    const baseDir = process.env.XDG_RUNTIME_DIR || os.tmpdir();
    const dir = path.join(baseDir, `agentvibes-${process.getuid?.() ?? 'u'}`);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try { fs.chmodSync(dir, 0o700); } catch {}
    return path.join(dir, `${prefix}-${crypto.randomUUID()}.wav`);
  }

  function _openVoicePickerForLlm(draft, onDone, llmKey = '') {
    // Kokoro has its own multi-voice picker (voices scanned from HF cache)
    if (draft.ttsEngine === 'kokoro') {
      _openKokoroVoicePicker(draft, onDone, llmKey);
      return;
    }

    navigationService?.openModal(null, _closeVP);

    let _allVoices = [];
    let _previewProc = null;
    let _previewVoiceId = null;
    let _vpClosed = false;

    const _spawnEnv = buildAudioEnv();
    const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;

    // Check if this LLM has mode=remote in transport-config.json so voice previews
    // are routed to the remote receiver even when the global provider is piper/local.
    let _llmIsRemote = false;
    if (llmKey) {
      try {
        const _tcPath = path.join(os.homedir(), '.agentvibes', 'transport-config.json');
        const _tc = JSON.parse(fs.readFileSync(_tcPath, 'utf8'));
        _llmIsRemote = _tc[llmKey]?.mode === 'remote';
      } catch {}
    }

    function _killVP() {
      if (_previewProc) {
        try {
          if (_isWin) { _previewProc.kill(); } else { process.kill(-_previewProc.pid, 'SIGTERM'); }
        } catch {}
        _previewProc = null;
      }
      _previewVoiceId = null;
    }

    function _closeVP() {
      if (_vpClosed) return;
      _vpClosed = true;
      _killVP();
      navigationService?.closeModal();
      destroyList(vpModal, screen, onDone);
    }

    // AVI-S5.1/5.2: Single-item overlay for non-Piper engines.
    // scanInstalledVoices() is NOT called; Space previews via the correct engine binary.
    const nativeVoice = NATIVE_ENGINE_VOICES[draft.ttsEngine];
    if (nativeVoice) {
      draft.voice = nativeVoice.id;
      let _nvClosed = false;
      let _nvPreviewProc = null;
      let _nvEnsureAbort = null;

      function _killNvPreview() {
        if (_nvPreviewProc) { try { _nvPreviewProc.kill(); } catch {} _nvPreviewProc = null; }
      }

      function _closeNV() {
        if (_nvClosed) return;
        _nvClosed = true;
        _killNvPreview();
        if (_nvEnsureAbort) { _nvEnsureAbort.abort(); _nvEnsureAbort = null; }
        navigationService?.closeModal();
        destroyList(nvPicker, screen, onDone);
      }

      const nvPicker = blessed.list({
        parent: screen,
        top: 'center',
        left: 'center',
        width: 52,
        height: 7,
        border: { type: 'line' },
        tags: true,
        label: ' {bold}{cyan-fg} Select Voice {/cyan-fg}{/bold} ',
        keys: true,
        vi: false,
        mouse: true,
        style: {
          fg: COLORS.labelFg,
          bg: COLORS.contentBg,
          border: { fg: 'cyan' },
          selected: { bg: 'green', fg: 'white', bold: true },
          item: { fg: COLORS.labelFg },
        },
      });
      nvPicker.setFront();
      nvPicker.setItems([`  ${nativeVoice.label}  {gray-fg}[Space] preview  [Enter] select{/gray-fg}`]);
      nvPicker.select(0);

      function _previewNativeVoice() {
        if (_nvPreviewProc) {
          _killNvPreview();
          nvPicker.setLabel(' {bold}{cyan-fg} Select Voice {/cyan-fg}{/bold} ');
          screen.render();
          return;
        }
        const phrase = `Hi, I am the ${nativeVoice.label} voice.`;
        const engine = nativeVoice.id;

        function _spawnAndTrack(cmd, args, opts) {
          let proc;
          try { proc = spawn(cmd, args, opts); } catch (e) {
            process.stderr.write(`[AgentVibes] preview spawn failed: ${e.message}\n`);
            if (!_nvClosed) { nvPicker.setLabel(' {red-fg}Engine not installed{/red-fg} '); screen.render(); }
            return;
          }
          _nvPreviewProc = proc;
          nvPicker.setLabel(` {cyan-fg}♪ ${nativeVoice.label}... (Space=stop){/cyan-fg} `);
          screen.render();
          proc.on('exit', (code) => {
            _nvPreviewProc = null;
            if (!_nvClosed) {
              if (code !== 0 && code !== null) {
                nvPicker.setLabel(` {red-fg}Preview failed (exit ${code}){/red-fg} `);
                setTimeout(() => { if (!_nvClosed) { nvPicker.setLabel(' {bold}{cyan-fg} Select Voice {/cyan-fg}{/bold} '); screen.render(); } }, 3000);
              } else {
                nvPicker.setLabel(' {bold}{cyan-fg} Select Voice {/cyan-fg}{/bold} ');
              }
              screen.render();
            }
          });
          proc.on('error', () => {
            _nvPreviewProc = null;
            if (!_nvClosed) { nvPicker.setLabel(' {red-fg}Engine not installed{/red-fg} '); screen.render(); }
          });
        }

        if (engine === 'soprano' && process.platform === 'win32' && !process.env.WSL_DISTRO_NAME) {
          // Ensure soprano WebUI is running before preview; start it if not.
          nvPicker.setLabel(' {cyan-fg}Checking Soprano...{/cyan-fg} ');
          screen.render();
          _nvEnsureAbort = new AbortController();
          _ensureSopranoWebUI((msg) => {
            if (!_nvClosed) { nvPicker.setLabel(` {cyan-fg}${msg}{/cyan-fg} `); screen.render(); }
          }, _nvEnsureAbort.signal).then((ready) => {
            _nvEnsureAbort = null;
            if (_nvClosed) return;
            if (!ready) {
              nvPicker.setLabel(' {red-fg}Soprano WebUI failed to start{/red-fg} ');
              screen.render();
              return;
            }
            const scriptPath = path.join(os.homedir(), '.claude', 'hooks-windows', 'play-tts-soprano.ps1');
            _spawnAndTrack('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, phrase], { stdio: 'ignore', windowsHide: true });
          }).catch(() => { _nvEnsureAbort = null; });
          return;
        }

        let proc = null;
        try {
          if (engine === 'soprano') {
            proc = spawn('soprano', [phrase], { stdio: 'ignore' }); // NOSONAR
          } else if (engine === 'sapi') {
            const safePhrase = phrase.replace(/'/g, "''");
            const sapiScript = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${safePhrase}')`;
            proc = spawn('powershell', ['-NoProfile', '-Command', sapiScript], { stdio: 'ignore', windowsHide: true }); // NOSONAR
          } else if (engine === 'macos-say') {
            proc = spawn('say', [phrase], { stdio: 'ignore' }); // NOSONAR
          } else if (engine.startsWith('elevenlabs')) {
            const elScript = path.join(packageDir, '.claude', 'hooks', 'play-tts-elevenlabs.sh');
            proc = spawn('bash', [elScript, phrase, 'Rachel'], { // NOSONAR
              stdio: 'ignore',
              env: { ...process.env, CLAUDE_PROJECT_DIR: targetDir },
            });
          }
        } catch {}
        if (!proc) {
          nvPicker.setLabel(' {red-fg}Engine not installed{/red-fg} ');
          screen.render();
          return;
        }
        _nvPreviewProc = proc;
        nvPicker.setLabel(` {cyan-fg}♪ ${nativeVoice.label}... (Space=stop){/cyan-fg} `);
        screen.render();
        proc.on('exit', () => {
          _nvPreviewProc = null;
          if (!_nvClosed) { nvPicker.setLabel(' {bold}{cyan-fg} Select Voice {/cyan-fg}{/bold} '); screen.render(); }
        });
        proc.on('error', () => {
          _nvPreviewProc = null;
          if (!_nvClosed) { nvPicker.setLabel(' {red-fg}Engine not installed{/red-fg} '); screen.render(); }
        });
      }

      nvPicker.key(['enter'], () => { draft.voice = nativeVoice.id; _closeNV(); });
      nvPicker.key(['space'], _previewNativeVoice);
      nvPicker.key(['escape', 'q', 'Q'], _closeNV);
      nvPicker.focus();
      screen.render();

      // ElevenLabs: if no API key is set, show a warning on top of the picker.
      // The picker stays open; user dismisses the warning and can still select/preview.
      if (draft.ttsEngine === 'elevenlabs') {
        const _elKeySet = Boolean(process.env.ELEVENLABS_API_KEY) || (() => {
          try {
            const kf = path.join(os.homedir(), '.agentvibes', 'elevenlabs-key.txt');
            return fs.existsSync(kf) && fs.readFileSync(kf, 'utf8').trim().length > 0;
          } catch { return false; }
        })();
        if (!_elKeySet) {
          _showApiKeyWarning(
            'ElevenLabs',
            'ELEVENLABS_API_KEY',
            path.join(os.homedir(), '.agentvibes', 'elevenlabs-key.txt'),
            () => { if (!_nvClosed) { nvPicker.focus(); screen.render(); } }
          );
        }
      }
      return;
    }

    const vpModal = blessed.box({
      parent: screen,
      top: '6%',
      left: '3%',
      width: '94%',
      height: '88%',
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Select Voice {/cyan-fg}{/bold} ',
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    vpModal.setFront();

    // Column header
    const COL_N = 30;
    const COL_G = 4;
    blessed.text({
      parent: vpModal, top: 1, left: 6, tags: true,
      content: `{cyan-fg}${'Name'.padEnd(COL_N)}{/cyan-fg}{magenta-fg}♀{/magenta-fg}/{bright-cyan-fg}♂{/bright-cyan-fg} {cyan-fg}Provider{/cyan-fg}`,
      style: { bg: COLORS.contentBg },
    });

    const vpList = blessed.list({
      parent: vpModal, top: 2, left: 2, right: 2, bottom: 5,
      keys: true, vi: true, mouse: true,
      border: { type: 'line' },
      scrollbar: { ch: '|', style: { fg: 'cyan' } },
      tags: true,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'blue' },
        selected: { bg: 'green', fg: 'white', bold: true },
        item: { fg: COLORS.labelFg },
      },
    });

    const vpPreviewLine = blessed.text({
      parent: vpModal, bottom: 4, left: 2, right: 2, height: 1, tags: true,
      content: ' ', style: { fg: 'cyan', bg: COLORS.contentBg },
    });

    // Footer split into two fixed-height lines so wrapping never covers vpPreviewLine
    blessed.text({
      parent: vpModal, bottom: 3, left: 2, right: 2, height: 1, tags: true,
      content: '{white-fg}[↑↓] Nav  [PgUp/PgDn] Page  [a-z] Jump{/white-fg}',
      style: { bg: COLORS.contentBg },
    });
    blessed.text({
      parent: vpModal, bottom: 2, left: 2, right: 2, height: 1, tags: true,
      content: '{white-fg}[Enter] Select  [Space] Preview  [+] 👍  [-] 👎  [Esc] Cancel{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    function _buildVoiceItems(voices) {
      const favs = getFavorites(configService);
      const td = getThumbsDown(configService);
      return voices.map(v => {
        const isActive = v === draft.voice;
        const isPrev = v === _previewVoiceId;
        const isUp = favs.includes(v);
        const isDown = td.includes(v);
        const dot = isPrev ? '♪' : (isActive ? '●' : ' ');
        const star = isUp ? '{green-fg}👍{/green-fg}' : (isDown ? '{red-fg}👎{/red-fg}' : '  ');
        const meta = getVoiceMeta(v);
        const name = meta.displayName.length > COL_N
          ? meta.displayName.slice(0, COL_N - 1) + '…'
          : meta.displayName.padEnd(COL_N);
        // genderIconTag has invisible color tags — pad with literal spaces (1 visible char + 3 spaces = 4)
        return ` ${dot}${star} ${name}${genderIconTag(meta.gender)}   ${meta.provider}`;
      });
    }

    function _refreshVP() {
      if (_vpClosed) return;
      const savedIdx = vpList.selected ?? 0;
      const savedScroll = vpList.childBase ?? 0;
      _allVoices = scanInstalledVoices();
      // Sort by display name so the first-letter quick jump is intuitive
      _allVoices.sort((a, b) => getVoiceMeta(a).displayName.localeCompare(
        getVoiceMeta(b).displayName, undefined, { sensitivity: 'base' }));
      const items = _buildVoiceItems(_allVoices);
      vpList.setItems(items.length > 0 ? items : [' (no voices found)']);
      vpList.select(Math.min(savedIdx, items.length - 1));
      vpList.childBase = Math.min(savedScroll, Math.max(0, items.length - (vpList.height - 2)));
      screen.render();
    }

    function _previewVoice(voiceId) {
      if (_previewVoiceId === voiceId) { _killVP(); vpPreviewLine.setContent(''); _refreshVP(); return; }
      _killVP();

      const phrase = `Hi, my name is ${getVoiceMeta(voiceId).displayName}.`;

      // Route through remote provider if active
      // Search order: targetDir → cwd → package root → home
      const _remoteProviders = ['ssh-remote', 'agentvibes-receiver'];
      let _activeProvider = '';
      try {
        const _provPaths = [
          path.join(targetDir, '.claude', 'tts-provider.txt'),
          path.join(process.cwd(), '.claude', 'tts-provider.txt'),
          path.join(packageDir, '.claude', 'tts-provider.txt'),
          path.join(os.homedir(), '.claude', 'tts-provider.txt'),
        ];
        for (const p of _provPaths) {
          if (fs.existsSync(p)) { _activeProvider = fs.readFileSync(p, 'utf8').trim(); break; }
        }
      } catch {}

      if (_remoteProviders.includes(_activeProvider) || _llmIsRemote) {
        const _playTtsName = _isWin
          ? path.join('.claude', 'hooks-windows', 'play-tts.ps1')
          : path.join('.claude', 'hooks', 'play-tts.sh');
        const _hooksBase = fs.existsSync(path.join(packageDir, _playTtsName))
          ? packageDir
          : targetDir;
        const _rEnv = {
          ..._spawnEnv, CLAUDE_PROJECT_DIR: targetDir,
          ...(llmKey ? { AGENTVIBES_LLM_KEY: `llm:${llmKey}` } : {}),
        };
        let rProc;
        if (_isWin) {
          const _playTts = path.join(_hooksBase, '.claude', 'hooks-windows', 'play-tts.ps1');
          const _llmArgs = llmKey ? ['-llm', llmKey] : [];
          rProc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', _playTts, phrase, voiceId, ..._llmArgs], { // NOSONAR
            stdio: 'ignore', detached: false, windowsHide: true, env: _rEnv,
          });
        } else {
          const _playTts = path.join(_hooksBase, '.claude', 'hooks', 'play-tts.sh');
          const _llmArgs = llmKey ? ['--llm', llmKey] : [];
          rProc = spawn('bash', [_playTts, phrase, voiceId, ..._llmArgs], { // NOSONAR
            stdio: 'ignore', detached: true, env: _rEnv, cwd: targetDir,
          });
        }
        _previewProc = rProc;
        _previewVoiceId = voiceId;
        if (!_vpClosed) { _refreshVP(); vpPreviewLine.setContent('{bright-magenta-fg}♪ Synthesizing on remote...{/bright-magenta-fg}'); screen.render(); }
        rProc.on('exit', () => {
          if (_previewVoiceId === voiceId) {
            _previewVoiceId = null; _previewProc = null;
            // Keep message + ♪ visible for 5s while remote device synthesises and plays
            setTimeout(() => { if (!_vpClosed) { vpPreviewLine.setContent(''); _refreshVP(); } }, 5000);
          }
        });
        rProc.on('error', () => { _previewProc = null; _previewVoiceId = null; });
        return;
      }

      const _ms = parseMultiSpeaker(voiceId);
      const voicePath = path.resolve(PIPER_VOICES_DIR, _ms.model + '.onnx');
      const safeBase = path.resolve(PIPER_VOICES_DIR);
      if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) return;

      const tempWav = _secureTempWav('vp');

      let _piperBin = 'piper';
      if (_isWin) {
        const _lad = process.env.LOCALAPPDATA ||
          (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
        if (_lad) {
          const _ep = path.join(_lad, 'Programs', 'Piper', 'piper.exe');
          if (fs.existsSync(_ep)) _piperBin = _ep;
        }
      }

      const args = ['--model', voicePath, '--output_file', tempWav];
      if (_ms.speakerId != null) args.push('--speaker', String(_ms.speakerId));
      const piper = spawn(_piperBin, args, {
        stdio: ['pipe', 'ignore', 'ignore'],
        detached: !_isWin,
        windowsHide: true,
        env: _spawnEnv,
      });
      piper.stdin.write(phrase + '\n');
      piper.stdin.end();
      _previewProc = piper;
      _previewVoiceId = voiceId;

      if (!_vpClosed) {
        vpPreviewLine.setContent(`{cyan-fg}♪ Synthesizing: ${voiceId}...{/cyan-fg}`);
        _refreshVP();
      }

      piper.on('exit', (code) => {
        if (_previewVoiceId !== voiceId) { try { fs.unlinkSync(tempWav); } catch {} return; }
        if (code !== 0) {
          _previewProc = null; _previewVoiceId = null;
          if (!_vpClosed) {
            vpPreviewLine.setContent('{red-fg}♪ Preview failed — is Piper installed?{/red-fg}');
            screen.render();
            setTimeout(() => { if (!_vpClosed) { vpPreviewLine.setContent(''); screen.render(); } }, 4000);
          }
          try { fs.unlinkSync(tempWav); } catch {};
          return;
        }
        const wp = detectWavPlayer(_spawnEnv);
        if (!wp) return;
        const pp = spawn(wp.bin, wp.args(tempWav), {
          stdio: 'ignore',
          detached: !_isWin,
          windowsHide: true,
          env: _spawnEnv,
        });
        _previewProc = pp;
        if (!_vpClosed) { vpPreviewLine.setContent(`{cyan-fg}♪ Playing: ${voiceId}{/cyan-fg}`); screen.render(); }
        pp.on('exit', () => {
          if (_previewVoiceId === voiceId) { _previewVoiceId = null; _previewProc = null; if (!_vpClosed) { vpPreviewLine.setContent(''); _refreshVP(); } }
          try { fs.unlinkSync(tempWav); } catch {}
        });
      });
      piper.on('error', () => {
        _previewProc = null; _previewVoiceId = null;
        if (!_vpClosed) {
          vpPreviewLine.setContent('{red-fg}♪ Cannot find Piper — install it first{/red-fg}');
          screen.render();
          setTimeout(() => { if (!_vpClosed) { vpPreviewLine.setContent(''); screen.render(); } }, 4000);
        }
      });
    }

    vpList.key(['enter'], () => {
      const sel = _allVoices[vpList.selected];
      if (sel) { draft.voice = sel; _closeVP(); }
    });
    vpList.key(['space'], () => {
      const sel = _allVoices[vpList.selected];
      if (sel) _previewVoice(sel);
    });
    vpList.key(['*', '+'], () => {
      const sel = _allVoices[vpList.selected];
      if (sel) { toggleThumbsUp(configService, sel); _refreshVP(); }
    });
    vpList.key(['-'], () => {
      const sel = _allVoices[vpList.selected];
      if (sel) { toggleThumbsDown(configService, sel); _refreshVP(); }
    });
    vpList.key(['escape', 'q', 'Q'], _closeVP);

    // PageUp / PageDown / Home / End navigation
    const _pageSize = () => Math.max(1, (vpList.height ?? 10) - 2);
    vpList.key(['pageup'],   () => { vpList.up(_pageSize());   screen.render(); });
    vpList.key(['pagedown'], () => { vpList.down(_pageSize()); screen.render(); });
    vpList.key(['home'],     () => { vpList.select(0); screen.render(); });
    vpList.key(['end'],      () => { vpList.select(Math.max(0, _allVoices.length - 1)); screen.render(); });

    // First-letter quick jump: typing 'a' jumps to the first voice starting
    // with A. Block keys reserved by the list widget (vi nav, cancel) so
    // they don't get swallowed: q (cancel), j/k/g/h/l (vi navigation).
    const _vpJumpBlocked = new Set(['j', 'k', 'g', 'h', 'l', 'q']);
    vpList.on('keypress', (ch, key) => {
      if (!ch || key?.ctrl || key?.meta) return;
      if (!/^[a-zA-Z]$/.test(ch)) return;
      const target = ch.toLowerCase();
      if (_vpJumpBlocked.has(target)) return;
      const idx = _allVoices.findIndex(v => {
        const name = getVoiceMeta(v).displayName.toLowerCase();
        return name.startsWith(target);
      });
      if (idx >= 0) { vpList.select(idx); screen.render(); }
    });

    _refreshVP();
    const activeIdx = _allVoices.indexOf(draft.voice);
    if (activeIdx >= 0) vpList.select(activeIdx);
    vpList.focus();
    screen.render();
  }

  // ── Pretext editor ────────────────────────────────────────────────────────

  function _openPretextEditor(parentModal, draft, onDone) {
    const editModal = blessed.box({
      parent: screen, top: 'center', left: 'center',
      width: 60, height: 8,
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Edit Pretext {/cyan-fg}{/bold} ',
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    editModal.setFront();

    blessed.text({
      parent: editModal, top: 1, left: 2, tags: true,
      content: '{white-fg}Spoken before every TTS message (max 200 chars):{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    const inputBox = blessed.textbox({
      parent: editModal, top: 3, left: 2, right: 2, height: 3,
      border: { type: 'line' },
      style: {
        fg: 'white', bg: 'black',
        border: { fg: 'blue' },
        focus: { border: { fg: 'cyan' } },
      },
    });

    let _editClosed = false;
    let _cursor = (draft.pretext || '').length;
    inputBox.value = draft.pretext || '';

    function _renderPretext() {
      const val = inputBox.value;
      const lpos = inputBox._getCoords();
      if (!lpos) { screen.render(); return; }
      const contentWidth = Math.max(1, (lpos.xl - lpos.xi) - inputBox.iwidth);
      const start = _cursor > contentWidth - 1 ? _cursor - contentWidth + 1 : 0;
      inputBox.setContent(val.slice(start));
      screen.render();
      screen.program.cup(lpos.yi + inputBox.itop, lpos.xi + inputBox.ileft + (_cursor - start));
    }

    const _prevGrabKeys = screen.grabKeys;
    function _closeEdit(save) {
      if (_editClosed) return;
      _editClosed = true;
      inputBox.removeAllListeners('keypress');
      screen.grabKeys = _prevGrabKeys;
      screen.program.hideCursor();
      if (save) {
        draft.pretext = (inputBox.value || '').trim().slice(0, 200);
      }
      destroyList(editModal, screen);
      onDone();
    }

    // Guard: if editModal is destroyed externally without _closeEdit being called,
    // restore grab state so TUI stays responsive.
    editModal.once('destroy', () => {
      if (!_editClosed) {
        _editClosed = true;
        inputBox.removeAllListeners('keypress');
        screen.grabKeys = _prevGrabKeys;
        screen.program.hideCursor();
      }
    });

    screen.grabKeys = true;
    inputBox.focus();
    screen.render(); // Layout pass so _getCoords() returns valid coords on first _renderPretext
    screen.program.showCursor();
    _renderPretext();

    inputBox.on('keypress', function(ch, key) {
      if (_editClosed) return;
      const val = inputBox.value;
      if (key.name === 'enter') { _closeEdit(true); return; }
      if (key.name === 'escape') { _closeEdit(false); return; }
      if (key.name === 'home' || (key.ctrl && key.name === 'a')) {
        _cursor = 0;
      } else if (key.name === 'end' || (key.ctrl && key.name === 'e')) {
        _cursor = val.length;
      } else if (key.name === 'left') {
        if (_cursor > 0) _cursor--; else return;
      } else if (key.name === 'right') {
        if (_cursor < val.length) _cursor++; else return;
      } else if (key.name === 'backspace') {
        if (_cursor > 0) { inputBox.value = val.slice(0, _cursor - 1) + val.slice(_cursor); _cursor--; }
        else return;
      } else if (key.name === 'delete') {
        if (_cursor < val.length) { inputBox.value = val.slice(0, _cursor) + val.slice(_cursor + 1); }
        else return;
      } else if (ch && !key.ctrl && !key.meta && !/^[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]$/.test(ch)) {
        inputBox.value = val.slice(0, _cursor) + ch + val.slice(_cursor);
        _cursor++;
      } else {
        return;
      }
      _renderPretext();
    });
  }

  // ── Saved toast ───────────────────────────────────────────────────────────

  function _showSavedToast(name, filePath) {
    const lines = [`{center}{green-fg}{bold}${name} saved!{/bold}{/green-fg}{/center}`];
    if (filePath) lines.push(`{center}{white-fg}${filePath}{/white-fg}{/center}`);
    const w = filePath ? Math.min(Math.max(filePath.length + 6, 30), 70) : 30;
    const toast = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: w,
      height: filePath ? 4 : 3,
      border: { type: 'line' },
      tags: true,
      content: lines.join('\n'),
      style: { bg: COLORS.contentBg, border: { fg: 'green' } },
    });
    toast.setFront();
    screen.render();
    setTimeout(() => {
      toast.destroy();
      screen.render();
    }, 1500);
  }

  // ── Provider info panels ──────────────────────────────────────────────────

  function hideAllProviderRows() {
    providerHeader.hide();
    for (const row of providerRows) {
      row.label.hide();
      row.statusText.hide();
      row.installBtn.hide();
      row.removeBtn.hide();
      row.configBtn.hide();
    }
  }

  function showAllProviderRows() {
    providerHeader.show();
    for (const row of providerRows) {
      const provider = PROVIDERS.find(p => p.id === row.id);
      row.label.show();
      row.statusText.show();
      // The "default" provider has no install/remove semantics — keep its
      // install/remove buttons hidden so only Configure shows.
      if (provider?.isDefault) {
        row.installBtn.hide();
        row.removeBtn.hide();
        row.configBtn.show();
      } else {
        row.installBtn.show();
        row.removeBtn.show();
        // Config is only available once the provider is installed.
        // refreshInstalledState() will show it if already installed.
        row.configBtn.hide();
      }
    }
  }

  function showClaudeCodeInfo(result = null, wasInstalled = false) {
    providerView = 'info';
    hideAllProviderRows();
    contentBox.hide();

    const hooksDir = path.join(targetDir, '.claude', process.platform === 'win32' ? 'hooks-windows' : 'hooks');
    const installed = installedState['claude-code'];
    const verb = wasInstalled ? 'reinstalled' : 'installed';

    const lines = [];
    lines.push('{bold}{cyan-fg}Claude Code -- AgentVibes Integration{/cyan-fg}{/bold}');
    lines.push('');

    if (result) {
      if (result.success) {
        lines.push(`{green-fg}AgentVibes for Claude Code ${verb}!{/green-fg}`);
        if (result.mcpError) {
          lines.push(`{yellow-fg}Warning:{/yellow-fg} ${result.mcpError}`);
        }
      } else {
        lines.push(`{red-fg}Installation failed:{/red-fg} ${result.error || 'Unknown error'}`);
      }
    } else {
      lines.push(installed
        ? '{green-fg}Installed{/green-fg}'
        : '{yellow-fg}Not installed{/yellow-fg}');
    }

    lines.push('');
    lines.push(`{bold}{cyan-fg}What ${result ? `got ${verb}` : 'gets installed'}:{/cyan-fg}{/bold}`);
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.mcp.json{/bold} (MCP server — natural language voice control)');
    lines.push('');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.claude/hooks/{/bold} (session-start + pre-tool hooks)');
    lines.push(`     Location: ${hooksDir}`);
    lines.push('');
    lines.push('  {yellow-fg}3.{/yellow-fg} {bold}.claude/commands/{/bold} (slash commands)');
    lines.push('');
    lines.push('  {yellow-fg}4.{/yellow-fg} {bold}.claude/config/{/bold} (personality, verbosity, voice settings)');
    lines.push('');
    lines.push('{white-fg}Press {bold}Enter{/bold} or {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.setFront();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showCopilotInfo(result, wasInstalled = false) {
    providerView = 'info';
    hideAllProviderRows();
    contentBox.hide();

    const verb = wasInstalled ? 'reinstalled' : 'installed';

    const lines = [];
    lines.push('{bold}{cyan-fg}GitHub Copilot -- AgentVibes Integration{/cyan-fg}{/bold}');
    lines.push('');
    if (result.success) {
      lines.push(`{green-fg}AgentVibes for Copilot ${verb}!{/green-fg}`);
      if (result.mcpError) {
        lines.push(`{yellow-fg}MCP config failed:{/yellow-fg} ${result.mcpError}`);
      }
    } else {
      lines.push(`{red-fg}Installation failed:{/red-fg} ${result.error || 'Unknown error'}`);
    }
    lines.push('');
    lines.push(`{bold}{cyan-fg}What got ${verb}:{/cyan-fg}{/bold}`);
    lines.push('');
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.vscode/mcp.json{/bold}');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.github/copilot-instructions.md{/bold}');
    lines.push('');
    lines.push('{white-fg}Press {bold}Enter{/bold} or {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.setFront();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showCodexInfo(result, wasInstalled = false) {
    providerView = 'info';
    hideAllProviderRows();
    contentBox.hide();

    const verb = wasInstalled ? 'reinstalled' : 'installed';

    const lines = [];
    lines.push('{bold}{cyan-fg}OpenAI Codex -- AgentVibes Integration{/cyan-fg}{/bold}');
    lines.push('');
    if (result.success) {
      lines.push(`{green-fg}AgentVibes for Codex ${verb}!{/green-fg}`);
      if (result.mcpError) {
        lines.push(`{yellow-fg}MCP config failed:{/yellow-fg} ${result.mcpError}`);
      }
    } else {
      lines.push(`{red-fg}Installation failed:{/red-fg} ${result.error || 'Unknown error'}`);
    }
    lines.push('');
    lines.push(`{bold}{cyan-fg}What got ${verb}:{/cyan-fg}{/bold}`);
    lines.push('');
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.codex/config.toml{/bold}');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.vscode/mcp.json{/bold}');
    lines.push('  {yellow-fg}3.{/yellow-fg} {bold}AGENTS.md{/bold}');
    lines.push('  {yellow-fg}4.{/yellow-fg} {bold}.codex/hooks/{/bold}');
    lines.push('');
    lines.push('{white-fg}Press {bold}Enter{/bold} or {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.setFront();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showHermesInfo(result, wasInstalled = false) {
    providerView = 'info';
    hideAllProviderRows();
    contentBox.hide();

    const lines = [];
    lines.push('{bold}{cyan-fg}Hermes Agent -- AgentVibes Integration{/cyan-fg}{/bold}');
    lines.push('');

    if (result && result.hooksDir) {
      const verb = wasInstalled ? 'Reinstalled' : 'Installed';
      lines.push(`{green-fg}${verb}! Hook files written to:{/green-fg}`);
      lines.push('');
      lines.push(`  {yellow-fg}•{/yellow-fg} {bold}${result.hooksDir}/HOOK.yaml{/bold}`);
      lines.push(`  {yellow-fg}•{/yellow-fg} {bold}${result.hooksDir}/handler.py{/bold}`);
      lines.push('');
      lines.push('{bold}{yellow-fg}ACTION REQUIRED — Configure SSH settings:{/yellow-fg}{/bold}');
      lines.push('');
      lines.push('  Press the {bold}Configure{/bold} button, or use the MCP tool {cyan-fg}set_hermes_config{/cyan-fg}:');
      lines.push('');
      lines.push('  {cyan-fg}SSH Key{/cyan-fg}  — absolute path to your SSH private key');
      lines.push('  {cyan-fg}Host{/cyan-fg}     — Tailscale IP of the machine with speakers');
      lines.push('  {cyan-fg}Port{/cyan-fg}     — AgentVibes receiver SSH port (not 22)');
      lines.push('  {cyan-fg}Voice{/cyan-fg}    — voice model (default: en_US-libritts-high::Leo-8)');
      lines.push('');
      lines.push('{white-fg}Then restart the Hermes gateway:{/white-fg}');
      lines.push('');
      lines.push('  {yellow-fg}hermes gateway restart{/yellow-fg}');
      lines.push('');
      lines.push('{white-fg}Check {bold}tts-hook.log{/bold} in the hooks dir after the first agent turn.{/white-fg}');
    } else {
      lines.push(`{red-fg}Installation failed: ${result?.error || 'Unknown error'}{/red-fg}`);
    }
    lines.push('');
    lines.push('{white-fg}Press {bold}Enter{/bold} or {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.setFront();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showRemoveInfo(providerId, removedItems) {
    providerView = 'info';
    hideAllProviderRows();
    contentBox.hide();

    const lines = [];
    if (providerId === 'claude-code') {
      lines.push('{bold}{cyan-fg}Claude Code -- Uninstalled{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('{green-fg}AgentVibes fully removed from this project!{/green-fg}');
      lines.push('');
      if (removedItems && removedItems.length > 0) {
        lines.push('{bold}{cyan-fg}Removed:{/cyan-fg}{/bold}');
        for (const item of removedItems) {
          lines.push(`  {yellow-fg}•{/yellow-fg} ${item}`);
        }
        lines.push('');
      }
      lines.push('{white-fg}Re-install anytime with the Install button.{/white-fg}');
    } else if (providerId === 'github-copilot') {
      lines.push('{bold}{cyan-fg}GitHub Copilot -- Removed{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('{green-fg}Successfully removed!{/green-fg}');
    } else if (providerId === 'openai-codex') {
      lines.push('{bold}{cyan-fg}OpenAI Codex -- Removed{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('{green-fg}Successfully removed!{/green-fg}');
    } else if (providerId === 'hermes') {
      lines.push('{bold}{cyan-fg}Hermes Agent -- Removed{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('{green-fg}Hook files removed. Run{/green-fg} {yellow-fg}hermes gateway restart{/yellow-fg} {green-fg}to apply.{/green-fg}');
    }
    lines.push('');
    lines.push('{white-fg}Press {bold}Enter{/bold} or {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.setFront();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showProviderListView(targetIdx = 0) {
    providerView = 'list';
    infoBox.hide();
    contentBox.hide();
    showAllProviderRows();
    refreshInstalledState().then(() => {
      const max = providerFocusableItems.length;
      if (max > 0) {
        providerFocusIndex = ((targetIdx % max) + max) % max;
        providerFocusableItems[providerFocusIndex].focus();
      }
      screen.render();
    });
  }

  infoBox.key(['escape', 'enter'], () => {
    // After dismissing the install/remove info page, advance focus to the
    // NEXT provider row but keep the same column (Install/Remove/Configure).
    // Each row has 3 focusable slots, so +3 moves one full row down.
    //
    // Special case: when leaving the LAST installable provider (Codex) from
    // Install or Remove column, skip the Default row (it has no Install or
    // Remove) and wrap to the FIRST Configure button (Claude Code Configure).
    // This lets the user cleanly walk all three installs, then all three
    // Configures, ending on Default Configure.
    const max = providerFocusableItems.length;
    if (max === 0) { showProviderListView(0); return; }
    const col = _preInfoFocusIndex % 3;   // 0=Install, 1=Remove, 2=Configure
    const row = Math.floor(_preInfoFocusIndex / 3);
    const nextRow = PROVIDERS[row + 1];
    const nextRowIsDefault = nextRow && nextRow.isDefault;
    let nextIdx;
    if (col < 2 && nextRowIsDefault) {
      // Last Install/Remove → jump to the FIRST non-default provider's
      // Configure column (dynamic: don't hardcode PROVIDERS[0]).
      const firstInstallableIdx = PROVIDERS.findIndex(p => !p.isDefault);
      nextIdx = firstInstallableIdx >= 0 ? firstInstallableIdx * 3 + 2 : (_preInfoFocusIndex + 3) % max;
    } else {
      nextIdx = (_preInfoFocusIndex + 3) % max;
    }
    showProviderListView(nextIdx);
  });

  // Captured by handleProviderInstall/Remove right before showing info.
  // Defaults to 0 so the first-time flow still lands on Claude Code Install.
  let _preInfoFocusIndex = 0;

  async function refreshInstalledState() {
    for (const p of PROVIDERS) {
      // The "default" provider is config-only — always treat as available.
      if (p.isDefault) {
        installedState[p.id] = true;
        continue;
      }
      const checkFn = p.id === 'claude-code' ? checkClaudeInstalled
        : p.id === 'github-copilot' ? checkCopilotInstalled
        : p.id === 'hermes' ? checkHermesInstalled
        : checkCodexInstalled;
      installedState[p.id] = await checkFn(targetDir);
    }
    for (const row of providerRows) {
      const provider = PROVIDERS.find(p => p.id === row.id);
      // The default provider has no install state to display — show its
      // config-only nature instead.
      if (provider?.isDefault) {
        row.statusText.setContent('{cyan-fg}[Config Only]{/cyan-fg}');
        continue;
      }
      const installed = installedState[row.id];
      row.statusText.setContent(
        installed
          ? '{green-fg}[Installed]{/green-fg}'
          : '{yellow-fg}[Not Installed]{/yellow-fg}'
      );
      row.installBtn.setContent(installed ? ' Re-install ' : '  Install   ');
      // Show Configure only when installed; hide it when not.
      if (installed) {
        row.configBtn.show();
      } else {
        row.configBtn.hide();
      }
    }
  }

  // =========================================================================
  // Screen renderers
  // =========================================================================

  const _HDR = (emoji, label) =>
    `{${COLORS.sectionHdr}-fg}${emoji}  ${label} ${'--'.repeat(50)}{/${COLORS.sectionHdr}-fg}`;

  function _renderScreen0() {
    const lines = [
      _HDR('', 'Language / Idioma / Langue / Sprache'),
      '',
      '  Select your language:',
      '',
      ...SUPPORTED_LANGUAGES.map((l, i) =>
        i === _langIdx
          ? `  {green-fg}> ${l.name}{/green-fg}`
          : `    ${l.name}`
      ),
    ];
    contentBox.setContent(_c(lines));
    hintLine.setContent('  Screen 0: Language  |  [Up/Down] Select  |  [Enter] Apply & Continue  |  [->] Skip (English)');
    screen.render();
  }

  async function _renderScreen1() {
    const frames = ['|','/','-','\\'];
    let frameIdx = 0;
    _checking = true;
    _s1ContinueBtn.hide();

    contentBox.setContent(_c([
      _HDR('', t(_getLang(), 'dependencyCheck')),
      '',
      `  {white-fg}${frames[0]}  ${t(_getLang(), 'checkingDependencies')}{/white-fg}`,
    ]));
    hintLine.setContent(`  ${t(_getLang(), 'screen2Hint')}`);
    screen.render();

    const spinInterval = setInterval(() => {
      frameIdx = (frameIdx + 1) % frames.length;
      contentBox.setContent(_c([
        _HDR('', t(_getLang(), 'dependencyCheck')),
        '',
        `  {white-fg}${frames[frameIdx]}  ${t(_getLang(), 'checkingDependencies')}{/white-fg}`,
      ]));
      screen.render();
    }, 100);

    try {
      _deps = await _checkDependenciesAsync();
    } finally {
      clearInterval(spinInterval);
      _checking = false;
    }

    const ok  = () => `{green-fg}OK  ${t(_getLang(), 'installed')}{/green-fg}`;
    const bad = () => `{red-fg}X  ${t(_getLang(), 'notFound')}{/red-fg}`;

    const ttsOk = _deps.piper || _deps.soprano || _deps.kokoro || _deps.elevenlabs;
    contentBox.setContent(_c([
      _HDR('', t(_getLang(), 'dependencyCheck')),
      '',
      `  {white-fg}${'Dependency'.padEnd(16)}${'Status'}{/white-fg}`,
      `  {white-fg}${'---'.repeat(26)}{/white-fg}`,
      `  {white-fg}${'Node.js'.padEnd(16)}{/white-fg}${_deps.node       ? ok() : bad()}`,
      `  {white-fg}${'npm'.padEnd(16)}{/white-fg}${_deps.npm        ? ok() : bad()}`,
      `  {white-fg}${'Piper TTS'.padEnd(16)}{/white-fg}${_deps.piper      ? ok() : bad()}`,
      `  {white-fg}${'Kokoro TTS'.padEnd(16)}{/white-fg}${_deps.kokoro     ? ok() : `{#546e7a-fg}-  optional{/#546e7a-fg}`}`,
      `  {white-fg}${'ElevenLabs'.padEnd(16)}{/white-fg}${_deps.elevenlabs ? ok() : `{#546e7a-fg}-  needs API key{/#546e7a-fg}`}`,
      `  {white-fg}${'Soprano TTS'.padEnd(16)}{/white-fg}${_deps.soprano    ? ok() : `{#546e7a-fg}-  optional{/#546e7a-fg}`}`,
      `  {white-fg}${'ffmpeg'.padEnd(16)}{/white-fg}${_deps.ffmpeg     ? ok() : `{red-fg}!  ${t(_getLang(), 'ffmpegMissing')}{/red-fg}`}`,
      '',
      ttsOk
        ? `  {green-fg}OK  ${t(_getLang(), 'ttsDetected')}{/green-fg}`
        : `  {red-fg}!  ${t(_getLang(), 'noTtsFound')}{/red-fg}`,
      '',
      '',
    ]));
    _s1ContinueBtn.setContent(ttsOk ? _tl('continueArrowBtn') : '  Install TTS  ->');
    _s1ContinueBtn.show();
    _s1ContinueBtn.focus();
    screen.render();
  }

  function _renderScreen2() {
    const lines = [
      _HDR('', 'TTS Engine Selection'),
      '',
      '  {white-fg}Select which TTS engines to use with AgentVibes:{/white-fg}',
    ];

    contentBox.setContent(_c(lines));

    _showTtsEngineRows();

    // Position continue button below engine rows
    const btnY = 5 + (_ttsEngines.length * 3) + 1;
    _s2ContinueBtn.top = btnY;
    _s2ContinueBtn.left = 4;
    _s2ContinueBtn.show();

    hintLine.setContent('  Screen 2: TTS Engines  |  [Tab] Install  |  [Enter/->] Continue  |  [Esc/<-] Back');

    // Focus first visible install button or continue button
    const visibleBtns = _ttsFocusableItems.filter(b => !b.hidden);
    if (visibleBtns.length) {
      _ttsFocusIndex = 0;
      visibleBtns[0].focus();
    } else {
      _s2ContinueBtn.focus();
    }
    screen.render();
  }

  function _renderScreen3() {
    // Mark setup as completed — write to targetDir in case configService
    // has a different projectRoot (e.g. npm link resolves differently).
    // Each step is wrapped individually so a partial failure (e.g. corrupt
    // local config file) does not block the others — and errors are logged
    // to stderr so the user can see why setup keeps re-running.
    try { configService.set('setupCompleted', true); }
    catch (e) { console.error('setupCompleted (project): ' + e.message); }
    try { configService.setGlobal?.('setupCompleted', true); }
    catch (e) { console.error('setupCompleted (global): ' + e.message); }

    try {
      const localCfgDir = path.join(targetDir, '.agentvibes');
      const localCfgPath = path.join(localCfgDir, 'config.json');
      if (!fs.existsSync(localCfgPath)) {
        fs.mkdirSync(localCfgDir, { recursive: true });
        fs.writeFileSync(localCfgPath, JSON.stringify({ setupCompleted: true }, null, 2));
      } else {
        let existing = {};
        try {
          existing = JSON.parse(fs.readFileSync(localCfgPath, 'utf8'));
        } catch (e) {
          // Corrupt JSON — back up the old file and start fresh so the user
          // doesn't get stuck in an endless setup loop.
          console.error(`setupCompleted: ${localCfgPath} is corrupt (${e.message}); rewriting`);
          try { fs.renameSync(localCfgPath, localCfgPath + '.bak'); } catch {}
          existing = {};
        }
        if (!existing.setupCompleted) {
          existing.setupCompleted = true;
          fs.writeFileSync(localCfgPath, JSON.stringify(existing, null, 2));
        }
      }
    } catch (e) {
      console.error('setupCompleted (local file): ' + e.message);
    }

    // Show provider rows instead of contentBox
    contentBox.hide();
    hintLine.setContent('  Screen 3: LLM Providers  |  [Enter] Action  |  [Tab] Next button  |  [Esc] Tab bar');
    showAllProviderRows();
    refreshInstalledState().then(() => {
      if (providerFocusableItems.length) {
        providerFocusIndex = 0;
        providerFocusableItems[0].focus();
      }
      screen.render();
    });
  }

  function _showCurrentScreen() {
    // Hide Screen 1 continue button on other screens
    if (_screen !== 1) _s1ContinueBtn.hide();

    // Hide Screen 2 TTS engine rows on other screens
    if (_screen !== 2) {
      _hideTtsEngineRows();
      _s2ContinueBtn.hide();
    }

    // Hide provider rows on non-provider screens
    if (_screen !== 3) {
      hideAllProviderRows();
      infoBox.hide();
      providerView = 'list';
    }

    // Show contentBox on screens 0-2
    if (_screen <= 2) {
      contentBox.show();
    }

    if (_screen !== _lastScreen) {
      // Nuclear clear
      try {
        for (let r = 0; r < screen.height; r++) {
          const orow = screen.olines?.[r];
          if (!orow) continue;
          for (let c = 0; c < screen.width; c++) {
            if (orow[c]) orow[c][0] = -1;
          }
        }
        if (screen.lines?.[2]) screen.lines[2].dirty = true;
      } catch {}

      const _clearLine = ' '.repeat(150);
      const _clearPage = Array(25).fill(_clearLine).join('\n');
      contentBox.setContent(_clearPage);
      hintLine.setContent(_clearLine);
      screen.render();

      const targetScreen = _screen;
      _lastScreen = _screen;
      setTimeout(() => {
        if (_screen !== targetScreen) return;
        switch (_screen) {
          case -1: _renderScreenGlobal(); break;
          case 0: _renderScreen0(); break;
          case 1: _renderScreen1(); break;
          case 2: _renderScreen2(); break;
          case 3: _renderScreen3(); break;
        }
      }, 50);
      return;
    }
    switch (_screen) {
      case -1: _renderScreenGlobal(); break;
      case 0: _renderScreen0(); break;
      case 1: _renderScreen1(); break;
      case 2: _renderScreen2(); break;
      case 3: _renderScreen3(); break;
    }
  }

  // =========================================================================
  // Navigation (key handlers)
  // =========================================================================

  screen.key(['enter'], () => {
    if (box.hidden || _checking || navigationService?.isModalOpen()) return;
    if (_screen === -1) {
      // Global config choice screen
      if (_globalChoiceIdx === 0) {
        try { configService.saveAllToLocal(_pendingGlobalCfg); } catch {}
        _screen = 3;
      } else {
        _screen = 0;
        _langIdx = 0;
      }
      _pendingGlobalCfg = null;
      _showCurrentScreen();
      return;
    }
    if (_screen === 0) {
      if (languageService) languageService.setLang(SUPPORTED_LANGUAGES[_langIdx].value);
      _screen = 1;
      _showCurrentScreen();
      return;
    }
    if (_screen === 1) return;  // Enter handled by Continue button
    if (_screen === 2) return;  // Enter handled by Continue button and install buttons
    if (_screen === 3) return;  // Enter handled by provider buttons
  });

  screen.key(['escape'], () => {
    if (box.hidden || _checking || navigationService?.isModalOpen() || _modalClosing) return;
    if (_screen === -1) {
      setTimeout(() => navigationService?.switchTab('settings'), 0);
      return;
    }
    if (_screen === 3 && providerView === 'info') {
      showProviderListView();
      return;
    }
    if (_screen > 0) {
      _screen--;
      _showCurrentScreen();
    } else {
      setTimeout(() => navigationService?.switchTab('settings'), 0);
    }
  });

  screen.key(['up'], () => {
    if (box.hidden || navigationService?.isModalOpen()) return;
    if (_screen === -1) {
      _globalChoiceIdx = 0;
      _renderScreenGlobal();
      return;
    }
    if (_screen === 0) {
      _langIdx = Math.max(0, _langIdx - 1);
      _renderScreen0();
      return;
    }
  });

  screen.key(['left'], () => {
    if (box.hidden || _checking || navigationService?.isModalOpen()) return;
    if (_screen === -1) return;
    if (_screen === 3) return;  // Left handled by button nav
    if (_screen > 0) {
      _screen--;
      _showCurrentScreen();
    }
  });

  screen.key(['right'], () => {
    if (box.hidden || _checking || navigationService?.isModalOpen()) return;
    if (_screen === -1) return;
    if (_screen === 0) {
      if (languageService) languageService.setLang(SUPPORTED_LANGUAGES[_langIdx].value);
      _screen = 1;
      _showCurrentScreen();
      return;
    }
    if (_screen === 1) return;  // Right handled by Continue button
    if (_screen === 2) { if (_screen < 3) { _screen++; _showCurrentScreen(); } return; }
    if (_screen === 3) return;  // Right handled by button nav
  });

  screen.key(['down'], () => {
    if (box.hidden || navigationService?.isModalOpen()) return;
    if (_screen === -1) {
      _globalChoiceIdx = 1;
      _renderScreenGlobal();
      return;
    }
    if (_screen === 0) {
      _langIdx = Math.min(SUPPORTED_LANGUAGES.length - 1, _langIdx + 1);
      _renderScreen0();
      return;
    }
  });

  // =========================================================================
  // Screen -1: Global Config Detection (pre-wizard)
  // =========================================================================

  function _renderScreenGlobal() {
    const cfg = _pendingGlobalCfg || {};
    const cfgPath = configService?.getGlobalConfigPath?.() || '~/.agentvibes/config.json';

    // Build settings preview
    const voice = cfg.voice || '(default)';
    const lang = cfg.language || 'en';
    const ttsEngine = cfg.ttsEngine || '(auto)';
    const verbosity = cfg.verbosity || 'high';
    const personality = cfg.personality || 'none';

    const sel0 = _globalChoiceIdx === 0;
    const sel1 = _globalChoiceIdx === 1;
    const hi = '{magenta-bg}{white-fg}';
    const lo = '{/white-fg}{/magenta-bg}';

    const lines = [
      _HDR('', 'Global Settings Found'),
      '',
      `  {white-fg}Location:{/white-fg} {yellow-fg}${cfgPath}{/yellow-fg}`,
      '',
      `  {cyan-fg}Voice:{/cyan-fg}       {yellow-fg}${voice}{/yellow-fg}`,
      `  {cyan-fg}Language:{/cyan-fg}    {yellow-fg}${lang}{/yellow-fg}`,
      `  {cyan-fg}TTS Engine:{/cyan-fg} {yellow-fg}${ttsEngine}{/yellow-fg}`,
      `  {cyan-fg}Verbosity:{/cyan-fg}  {yellow-fg}${verbosity}{/yellow-fg}`,
      `  {cyan-fg}Personality:{/cyan-fg}{yellow-fg} ${personality}{/yellow-fg}`,
      '',
      '  {white-fg}What would you like to do for this project?{/white-fg}',
      '',
      `  ${sel0 ? hi : ''}> Load Global Settings${sel0 ? lo : ''}  {white-fg}— use these settings for this project{/white-fg}`,
      `  ${sel1 ? hi : ''}> Start Fresh${sel1 ? lo : ''}          {white-fg}— run the full setup wizard from scratch{/white-fg}`,
      '',
    ];
    contentBox.setContent(_c(lines));
    hintLine.setContent('  [Up/Down] Choose  |  [Enter] Select');
    box.focus();
    screen.render();
  }

  // =========================================================================
  // Tab Component Contract
  // =========================================================================

  return {
    box,

    show() {
      _lastScreen = -1;
      providerView = 'list';
      box.show();

      // Detect if AgentVibes is already installed in the target directory
      // (e.g. user ran install, closed TUI, came back)
      const alreadyInstalled = fs.existsSync(path.join(targetDir, '.claude', 'commands', 'agent-vibes'));

      // Check: no local config but global exists with setupCompleted
      const hasLocal = configService?.hasLocalConfig?.();
      const globalCfg = configService?.getGlobalConfig?.() ?? {};
      if (!alreadyInstalled && !hasLocal && globalCfg.setupCompleted) {
        _pendingGlobalCfg = globalCfg;
        _screen = -1;
        _showCurrentScreen();
        screen.render();
        return;
      }

      // If already installed or not first run, skip directly to Screen 3 (providers)
      if (alreadyInstalled || !_isFirstRun()) {
        _screen = 3;
      } else {
        _screen = 0;
        _langIdx = 0;
      }
      _showCurrentScreen();
      screen.render();
    },

    hide() {
      box.hide();
      hideAllProviderRows();
      infoBox.hide();
      providerView = 'list';
      screen.render();
    },

    onFocus() {
      if (_screen === 0) {
        box.focus();
      } else if (_screen === 3) {
        if (providerView === 'list') {
          providerFocusIndex = 0;
          if (providerFocusableItems.length) providerFocusableItems[0].focus();
        } else {
          infoBox.focus();
        }
      } else {
        box.focus();
      }
      screen.render();
    },

    onBlur() {},

    getFooterText() {
      if (_screen === 3) {
        if (providerView === 'info') {
          return '[Esc] Back to list  [Up/Down] Scroll';
        }
        return '[Enter] Action  [Tab] Next button  [Esc] Tab bar';
      }
      return _tl('footerText');
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
