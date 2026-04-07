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
  installCopilotMcp, removeCopilotMcp,
  installCopilotInstructions, removeCopilotInstructions,
  installCodexMcp, removeCodexMcp,
  installCodexInstructions, installCodexHooks,
  removeCodexInstructions, removeCodexHooks,
  loadLlmConfigSync, saveLlmConfigSync,
} from '../../services/llm-provider-service.js';
import {
  getAvailableEngines, getEngineStatuses, checkEngineInstalled,
} from '../../services/tts-engine-service.js';
import { openReverbPicker, REVERB_PRESETS } from '../widgets/reverb-picker.js';
import { openTrackPicker, openVolumeInput } from '../widgets/track-picker.js';
import { formatTrackName } from '../widgets/format-utils.js';
import { destroyList } from '../widgets/destroy-list.js';
import { scanInstalledVoices, getVoiceMeta } from './voices-tab.js';
import { attachBtnBlink } from './agents-tab.js';

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
  btnFocusBg: 'cyan',
  removeBg:   'red',
  removeFocusBg: 'magenta',
  cfgBg:      'green',
  cfgFocusBg: 'yellow',
};

const FOOTER_TEXT = '[Enter] Continue  [Esc] Back  [Tab] Next Tab  [Q] Quit';

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
    if (process.platform === 'win32') opts.shell = true;
    await _execFileAsync(cmd, ['--version'], opts);
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

  return { node, npm, piper, soprano: sopranoTts || sopranoWebui, ffmpeg };
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
  let _lastScreen = -1;
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
    btn.on('focus', () => {
      btn.style.bg = COLORS.btnFocus;
      btn.style.fg = COLORS.btnFocusFg;
      const raw = btn.content.replace(/[>\u25ba\u25c4\u2588]/g, '').trim();
      btn.setContent(`>${raw}< `);
      let _on = true;
      screen.render();
      _blinkInterval = setInterval(() => {
        _on = !_on;
        if (!btn.content.includes('>')) return;
        const r = btn.content.replace(/[>\u25ba\u25c4\u2588]/g, '').trim();
        btn.setContent(_on ? `>${r}< ` : `>${r}<`);
        screen.render();
      }, 500);
    });
    btn.on('blur', () => {
      if (_blinkInterval) { clearInterval(_blinkInterval); _blinkInterval = null; }
      btn.style.bg = bg;
      btn.style.fg = textColor;
      const raw = btn.content.replace(/[>\u25ba\u25c4\u2588]/g, '').trim();
      btn.setContent(raw);
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

  // Engine cards are built dynamically in _renderScreen2

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

  // Info box for provider details
  const infoBox = blessed.box({
    parent: box,
    top: 1,
    left: 2,
    width: '96%',
    bottom: 1,
    hidden: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
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
        focus: { fg: 'black', bg: COLORS.btnFocusBg },
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

    // Wire actions
    installBtn.on('press', async () => { await handleProviderInstall(provider); });
    installBtn.key(['enter', 'space'], async () => { await handleProviderInstall(provider); });

    removeBtn.on('press', async () => { await handleProviderRemove(provider); });
    removeBtn.key(['enter', 'space'], async () => { await handleProviderRemove(provider); });

    configBtn.on('press', async () => { await handleProviderConfigure(provider); });
    configBtn.key(['enter', 'space'], async () => { await handleProviderConfigure(provider); });

    // Navigation on each button
    for (const btn of [installBtn, removeBtn, configBtn]) {
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
        const nextIdx = providerFocusIndex + 3;
        if (nextIdx < providerFocusableItems.length) {
          providerFocusIndex = nextIdx;
          providerFocusableItems[providerFocusIndex].focus();
          screen.render();
        }
      });
    }

    providerRows.push({ id: provider.id, label, statusText, installBtn, removeBtn, configBtn });
    return { installBtn, removeBtn, configBtn };
  }

  // Build all provider rows
  for (let i = 0; i < PROVIDERS.length; i++) {
    const { installBtn, removeBtn, configBtn } = createProviderRow(PROVIDERS[i], i);
    providerFocusableItems.push(installBtn, removeBtn, configBtn);
  }

  function cycleFocus(dir) {
    providerFocusIndex = (providerFocusIndex + dir + providerFocusableItems.length) % providerFocusableItems.length;
    providerFocusableItems[providerFocusIndex].focus();
    screen.render();
  }

  // ── Provider install/remove handlers ──────────────────────────────────────

  async function handleProviderInstall(provider) {
    if (provider.id === 'claude-code') {
      showClaudeCodeInfo();
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
      await installCopilotMcp(targetDir);
      await installCodexInstructions(targetDir, packageDir);
      await installCodexHooks(targetDir, packageDir);
      await refreshInstalledState();
      showCodexInfo(result, wasInstalled);
    }
  }

  async function handleProviderRemove(provider) {
    if (provider.id === 'claude-code') {
      showRemoveInfo('claude-code');
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
      await removeCopilotMcp(targetDir);
      await removeCodexInstructions(targetDir);
      await removeCodexHooks(targetDir);
      await refreshInstalledState();
      showRemoveInfo('openai-codex');
    }
  }

  // ── Provider configure handler ────────────────────────────────────────────

  async function handleProviderConfigure(provider) {
    const llmKeyMap = {
      'claude-code': 'claude-code',
      'github-copilot': 'copilot',
      'openai-codex': 'codex',
    };
    const llmKey = llmKeyMap[provider.id] || provider.id;
    const config = loadLlmConfigSync(llmKey, targetDir);
    _openLlmConfigModal(provider, llmKey, config);
  }

  // ── LLM Config Modal ─────────────────────────────────────────────────────

  function _openLlmConfigModal(provider, llmKey, config) {
    // Guard against double-open (key repeat, double-click)
    if (navigationService?.isModalOpen()) return;
    let _closed = false;
    navigationService?.openModal();

    const draft = {
      ttsEngine:    config.ttsEngine || '',
      voice:        config.voice || '',
      pretext:      config.pretext || '',
      reverbPreset: config.effects || 'off',
      bgTrack:      config.bgTrack || '',
      bgVolume:     config.bgVolume || '0.15',
    };

    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 21,
      border: { type: 'line' },
      tags: true,
      label: ` {bold}{cyan-fg} ${provider.name} -- Audio Config {/cyan-fg}{/bold} `,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
      },
    });
    modal.setFront();

    // Field definitions
    const FIELDS = [
      { key: 'ttsEngine', label: 'TTS Engine',  getValue: () => draft.ttsEngine || '(global default)' },
      { key: 'voice',     label: 'Voice',        getValue: () => draft.voice || '(global default)' },
      { key: 'pretext',   label: 'Pretext',      getValue: () => draft.pretext || '(none)' },
      { key: 'reverb',    label: 'Reverb',        getValue: () => {
        const p = REVERB_PRESETS.find(r => r.value === draft.reverbPreset);
        return p ? p.label : draft.reverbPreset || 'Off';
      }},
      { key: 'bgTrack',   label: 'Music Track',  getValue: () => formatTrackName(draft.bgTrack) || '(default)' },
      { key: 'bgVolume',  label: 'Music Vol',    getValue: () => {
        const pct = Math.round(parseFloat(draft.bgVolume) * 100);
        return `${pct}%`;
      }},
    ];

    function _fieldItems() {
      return FIELDS.map(f => {
        const label = f.label.padEnd(14);
        return `  ${label} ${f.getValue()}`;
      });
    }

    const fieldList = blessed.list({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: FIELDS.length + 2,
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
      content: '{white-fg}[Up/Down] Navigate  [Enter] Edit  [Tab] Save/Cancel  [Esc] Cancel{/white-fg}',
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
          focus: { bg: 'cyan', fg: 'black', bold: true },
          hover: { bg: 'cyan', fg: 'black', bold: true },
        },
      });
      btn.key(['enter', 'space'], () => onClick());
      btn.on('click', () => onClick());
      return btn;
    }

    const saveBtn = _modalBtn('Save', 4, () => {
      saveLlmConfigSync(llmKey, {
        voice: draft.voice,
        pretext: draft.pretext,
        effects: draft.reverbPreset === 'off' ? '' : draft.reverbPreset,
        bgTrack: draft.bgTrack,
        bgVolume: draft.bgVolume,
        ttsEngine: draft.ttsEngine,
        sourcePath: config.sourcePath,
      }, targetDir);
      _closeModal();
      _showSavedToast(provider.name);
    });

    const resetBtn = _modalBtn('Reset', 16, () => {
      draft.ttsEngine = '';
      draft.voice = '';
      draft.pretext = '';
      draft.reverbPreset = 'off';
      draft.bgTrack = '';
      draft.bgVolume = '0.15';
      fieldList.setItems(_fieldItems());
      fieldList.focus();
      screen.render();
    });

    const cancelBtn = _modalBtn('Cancel', 30, _closeModal);

    const allBtns = [saveBtn, resetBtn, cancelBtn];
    const btnBlink = attachBtnBlink(allBtns, screen);

    function _closeModal() {
      if (_closed) return;
      _closed = true;
      btnBlink.cleanup();
      navigationService?.closeModal();
      destroyList(modal, screen);
      if (providerFocusableItems.length) providerFocusableItems[providerFocusIndex]?.focus();
      screen.render();
    }

    // Field editing via Enter
    fieldList.key(['enter'], () => {
      const idx = fieldList.selected;
      const field = FIELDS[idx];
      if (!field) return;

      const _refreshField = () => {
        fieldList.setItems(_fieldItems());
        fieldList.select(idx);
        fieldList.focus();
        screen.render();
      };
      const _cancelField = () => {
        fieldList.focus();
        screen.render();
      };

      switch (field.key) {
        case 'ttsEngine':
          _openTtsEnginePicker(draft, _refreshField);
          break;

        case 'voice':
          _openVoicePickerForLlm(draft, _refreshField);
          break;

        case 'pretext':
          _openPretextEditor(modal, draft, _refreshField);
          break;

        case 'reverb':
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
      }
    });

    fieldList.key(['escape'], _closeModal);
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
      allBtns[i].key(['escape'], _closeModal);
      allBtns[i].key(['up'], () => {
        fieldList.focus();
        screen.render();
      });
    }

    modal.key(['escape'], _closeModal);
    fieldList.focus();
    screen.render();
  }

  // ── TTS Engine picker (for config modal) ──────────────────────────────────

  function _openTtsEnginePicker(draft, onDone) {
    navigationService?.openModal();

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
      if (idx === 0) {
        draft.ttsEngine = '';
      } else {
        draft.ttsEngine = engines[idx - 1].id;
      }
      navigationService?.closeModal();
      destroyList(picker, screen);
      onDone();
    });

    picker.key(['escape'], () => {
      navigationService?.closeModal();
      destroyList(picker, screen);
      onDone();
    });

    picker.focus();
    screen.render();
  }

  // ── Voice picker for LLM config ───────────────────────────────────────────

  function _openVoicePickerForLlm(draft, onDone) {
    navigationService?.openModal();

    const vpModal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '90%',
      height: '85%',
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Select Voice {/cyan-fg}{/bold} ',
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    vpModal.setFront();

    let allVoices = [];
    try {
      const installed = scanInstalledVoices();
      for (const voiceId of installed) {
        const meta = getVoiceMeta(voiceId);
        allVoices.push({
          display: meta.displayName || voiceId,
          value: voiceId,
        });
      }
    } catch { /* no voices */ }

    let filtered = [...allVoices];

    blessed.text({
      parent: vpModal, top: 1, left: 2, tags: true,
      content: '{yellow-fg}Search:{/yellow-fg}',
      style: { bg: COLORS.contentBg },
    });

    const vpSearch = blessed.textbox({
      parent: vpModal, top: 1, left: 11, width: 40, height: 1,
      inputOnFocus: true, keys: true,
      style: { fg: 'white', bg: 'blue', focus: { bg: 'cyan' } },
    });

    const vpList = blessed.list({
      parent: vpModal, top: 3, left: 2, right: 2, bottom: 3,
      keys: true, vi: true, mouse: true,
      border: { type: 'line' },
      scrollbar: { ch: '|', style: { fg: 'cyan' } },
      tags: true,
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });

    blessed.text({
      parent: vpModal, bottom: 1, left: 2, tags: true,
      content: '{white-fg}[Enter] Select  [/] Search  [Esc] Cancel{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    function _refresh() {
      const term = (vpSearch.getValue() || '').toLowerCase().trim();
      filtered = term
        ? allVoices.filter(v => v.display.toLowerCase().includes(term))
        : [...allVoices];
      vpList.setItems(filtered.map(v => `  ${v.display}`));
      vpList.select(0);
      screen.render();
    }
    _refresh();

    vpSearch.on('keypress', () => setTimeout(_refresh, 0));
    vpSearch.key(['escape'], () => { vpList.focus(); screen.render(); });
    vpSearch.key(['enter'], () => { vpList.focus(); screen.render(); });

    vpList.key(['/'], () => { vpSearch.focus(); vpSearch.readInput(() => {}); screen.render(); });
    vpList.key(['enter'], () => {
      const sel = filtered[vpList.selected];
      if (sel) draft.voice = sel.value;
      _closeVP();
      onDone();
    });
    vpList.key(['escape'], () => { _closeVP(); onDone(); });

    function _closeVP() {
      navigationService?.closeModal();
      destroyList(vpModal, screen);
    }

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
      inputOnFocus: true,
      value: draft.pretext,
      style: {
        fg: 'white', bg: 'black',
        border: { fg: 'blue' },
        focus: { border: { fg: 'cyan' } },
      },
    });

    function _closeEdit(save) {
      if (save) {
        const val = (inputBox.getValue() || '').trim().slice(0, 200);
        draft.pretext = val;
      }
      destroyList(editModal, screen);
      onDone();
    }

    inputBox.key(['enter'], () => _closeEdit(true));
    inputBox.key(['escape'], () => _closeEdit(false));

    inputBox.focus();
    inputBox.readInput(() => {});
    screen.render();
  }

  // ── Saved toast ───────────────────────────────────────────────────────────

  function _showSavedToast(name) {
    const toast = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 30,
      height: 3,
      border: { type: 'line' },
      tags: true,
      content: `{center}{green-fg}{bold}${name} saved!{/bold}{/green-fg}{/center}`,
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
      row.label.show();
      row.statusText.show();
      row.installBtn.show();
      row.removeBtn.show();
      row.configBtn.show();
    }
  }

  function showClaudeCodeInfo() {
    providerView = 'info';
    hideAllProviderRows();
    contentBox.hide();

    const mcpPath = path.join(targetDir, '.mcp.json');
    const hooksDir = path.join(targetDir, '.claude', process.platform === 'win32' ? 'hooks-windows' : 'hooks');
    const installed = installedState['claude-code'];

    const lines = [];
    lines.push('{bold}{cyan-fg}Claude Code -- AgentVibes Integration{/cyan-fg}{/bold}');
    lines.push('');
    lines.push(installed
      ? '{green-fg}Installed{/green-fg}'
      : '{yellow-fg}Not installed -- use Install tab to set up{/yellow-fg}');
    lines.push('');
    lines.push('{bold}{cyan-fg}What gets installed:{/cyan-fg}{/bold}');
    lines.push('');
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.mcp.json{/bold} (project root)');
    lines.push(`     Location: ${mcpPath}`);
    lines.push('     Registers the AgentVibes MCP server for Claude Code.');
    lines.push('');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.claude/hooks/{/bold} (session-start + pre-tool hooks)');
    lines.push(`     Location: ${hooksDir}`);
    lines.push('');
    lines.push('  {yellow-fg}3.{/yellow-fg} {bold}.claude/commands/{/bold} (slash commands)');
    lines.push('');
    lines.push('  {yellow-fg}4.{/yellow-fg} {bold}.claude/config/{/bold} (personality, verbosity, voice settings)');
    lines.push('');
    lines.push('{bold}{cyan-fg}To install or re-install:{/cyan-fg}{/bold}');
    lines.push('  Run: {yellow-fg}npx agentvibes install{/yellow-fg}');
    lines.push('');
    lines.push('{white-fg}Press {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
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
    lines.push(result.success
      ? `{green-fg}AgentVibes for Copilot ${verb}!{/green-fg}`
      : `{red-fg}Installation failed:{/red-fg} ${result.error || 'Unknown error'}`);
    lines.push('');
    lines.push(`{bold}{cyan-fg}What got ${verb}:{/cyan-fg}{/bold}`);
    lines.push('');
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.vscode/mcp.json{/bold}');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.github/copilot-instructions.md{/bold}');
    lines.push('');
    lines.push('{white-fg}Press {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
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
    lines.push(result.success
      ? `{green-fg}AgentVibes for Codex ${verb}!{/green-fg}`
      : `{red-fg}Installation failed:{/red-fg} ${result.error || 'Unknown error'}`);
    lines.push('');
    lines.push(`{bold}{cyan-fg}What got ${verb}:{/cyan-fg}{/bold}`);
    lines.push('');
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.codex/config.toml{/bold}');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.vscode/mcp.json{/bold}');
    lines.push('  {yellow-fg}3.{/yellow-fg} {bold}AGENTS.md{/bold}');
    lines.push('  {yellow-fg}4.{/yellow-fg} {bold}.codex/hooks/{/bold}');
    lines.push('');
    lines.push('{white-fg}Press {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showRemoveInfo(providerId) {
    providerView = 'info';
    hideAllProviderRows();
    contentBox.hide();

    const lines = [];
    if (providerId === 'claude-code') {
      lines.push('{bold}{cyan-fg}Remove Claude Code Integration{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('To remove, run: {yellow-fg}npx agentvibes uninstall{/yellow-fg}');
    } else if (providerId === 'github-copilot') {
      lines.push('{bold}{cyan-fg}GitHub Copilot -- Removed{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('{green-fg}Successfully removed!{/green-fg}');
    } else if (providerId === 'openai-codex') {
      lines.push('{bold}{cyan-fg}OpenAI Codex -- Removed{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('{green-fg}Successfully removed!{/green-fg}');
    }
    lines.push('');
    lines.push('{white-fg}Press {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showProviderListView() {
    providerView = 'list';
    infoBox.hide();
    contentBox.hide();
    showAllProviderRows();
    providerFocusIndex = 0;
    if (providerFocusableItems.length) providerFocusableItems[0].focus();
    screen.render();
  }

  infoBox.key(['escape'], () => {
    showProviderListView();
  });

  async function refreshInstalledState() {
    for (const p of PROVIDERS) {
      const checkFn = p.id === 'claude-code' ? checkClaudeInstalled
        : p.id === 'github-copilot' ? checkCopilotInstalled
        : checkCodexInstalled;
      installedState[p.id] = await checkFn(targetDir);
    }
    for (const row of providerRows) {
      const installed = installedState[row.id];
      row.statusText.setContent(
        installed
          ? '{green-fg}[Installed]{/green-fg}'
          : '{yellow-fg}[Not Installed]{/yellow-fg}'
      );
      row.installBtn.setContent(installed ? ' Re-install ' : '  Install   ');
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

    const ttsOk = _deps.piper || _deps.soprano;
    contentBox.setContent(_c([
      _HDR('', t(_getLang(), 'dependencyCheck')),
      '',
      `  {white-fg}${'Dependency'.padEnd(14)}${'Status'}{/white-fg}`,
      `  {white-fg}${'---'.repeat(26)}{/white-fg}`,
      `  {white-fg}${'Node.js'.padEnd(14)}{/white-fg}${_deps.node    ? ok() : bad()}`,
      `  {white-fg}${'npm'.padEnd(14)}{/white-fg}${_deps.npm     ? ok() : bad()}`,
      `  {white-fg}${'Piper TTS'.padEnd(14)}{/white-fg}${_deps.piper   ? ok() : bad()}`,
      `  {white-fg}${'Soprano TTS'.padEnd(14)}{/white-fg}${_deps.soprano ? ok() : bad()}`,
      `  {white-fg}${'ffmpeg'.padEnd(14)}{/white-fg}${_deps.ffmpeg  ? ok() : `{red-fg}!  ${t(_getLang(), 'ffmpegMissing')}{/red-fg}`}`,
      '',
      ttsOk
        ? `  {green-fg}OK  ${t(_getLang(), 'ttsDetected')}{/green-fg}`
        : `  {red-fg}!  ${t(_getLang(), 'noTtsFound')}{/red-fg}`,
      '',
      '',
    ]));
    if (ttsOk) {
      _s1ContinueBtn.setContent(_tl('continueArrowBtn'));
      _s1ContinueBtn.show();
      _s1ContinueBtn.focus();
    }
    screen.render();
  }

  function _renderScreen2() {
    const engines = getEngineStatuses();

    const lines = [
      _HDR('', 'TTS Engine Selection'),
      '',
      '  {white-fg}Select which TTS engines to use with AgentVibes:{/white-fg}',
      '',
    ];

    for (const engine of engines) {
      const status = engine.installed
        ? '{green-fg}[Installed]{/green-fg}'
        : '{yellow-fg}[Not Found]{/yellow-fg}';
      lines.push(`  {bold}{white-fg}${engine.name}{/white-fg}{/bold}  ${status}`);
      lines.push(`    {cyan-fg}${engine.desc}{/cyan-fg}`);
      lines.push('');
    }

    lines.push('');
    lines.push('  {white-fg}TTS engines can be configured per-provider on the next screen.{/white-fg}');
    lines.push('  {white-fg}Press [Enter] or [->] to continue to LLM Providers.{/white-fg}');

    contentBox.setContent(_c(lines));
    hintLine.setContent('  Screen 2: TTS Engines  |  [Enter/->] Continue  |  [Esc/<-] Back');
    box.focus();
    screen.render();
  }

  function _renderScreen3() {
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
          case 0: _renderScreen0(); break;
          case 1: _renderScreen1(); break;
          case 2: _renderScreen2(); break;
          case 3: _renderScreen3(); break;
        }
      }, 50);
      return;
    }
    switch (_screen) {
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
    if (box.hidden || _checking) return;
    if (_screen === 0) {
      if (languageService) languageService.setLang(SUPPORTED_LANGUAGES[_langIdx].value);
      _screen = 1;
      _showCurrentScreen();
      return;
    }
    if (_screen === 1) return;  // Enter handled by Continue button
    if (_screen === 2) {
      _screen++;
      _showCurrentScreen();
      return;
    }
    if (_screen === 3) return;  // Enter handled by provider buttons
  });

  screen.key(['escape'], () => {
    if (box.hidden || _checking) return;
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
    if (box.hidden) return;
    if (_screen === 0) {
      _langIdx = Math.max(0, _langIdx - 1);
      _renderScreen0();
      return;
    }
  });

  screen.key(['left'], () => {
    if (box.hidden || _checking) return;
    if (_screen === 3) return;  // Left handled by button nav
    if (_screen > 0) {
      _screen--;
      _showCurrentScreen();
    }
  });

  screen.key(['right'], () => {
    if (box.hidden || _checking) return;
    if (_screen === 0) {
      if (languageService) languageService.setLang(SUPPORTED_LANGUAGES[_langIdx].value);
      _screen = 1;
      _showCurrentScreen();
      return;
    }
    if (_screen === 1) return;  // Right handled by Continue button
    if (_screen === 2) { _screen++; _showCurrentScreen(); return; }
    if (_screen === 3) return;  // Right handled by button nav
  });

  screen.key(['down'], () => {
    if (box.hidden) return;
    if (_screen === 0) {
      _langIdx = Math.min(SUPPORTED_LANGUAGES.length - 1, _langIdx + 1);
      _renderScreen0();
      return;
    }
  });

  // =========================================================================
  // Tab Component Contract
  // =========================================================================

  return {
    box,

    show() {
      // If not first run, skip directly to Screen 3 (providers)
      if (!_isFirstRun()) {
        _screen = 3;
      } else {
        _screen = 0;
        _langIdx = 0;
      }
      _lastScreen = -1;
      providerView = 'list';
      box.show();
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
