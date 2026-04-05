/**
 * AgentVibes TUI Console — LLM Providers Tab
 *
 * Shows supported LLM providers with Install/Re-install and Remove buttons.
 * - Claude Code: Install switches to Install tab; Remove removes .claude/ hooks
 * - GitHub Copilot: Install creates .vscode/mcp.json + instructions; Remove deletes them
 *
 * Implements the Tab Component Contract:
 *   createLlmProvidersTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { openReverbPicker, REVERB_PRESETS } from '../widgets/reverb-picker.js';
import { openTrackPicker, openVolumeInput } from '../widgets/track-picker.js';
import { formatTrackName } from '../widgets/format-utils.js';
import { destroyList } from '../widgets/destroy-list.js';
import { scanInstalledVoices, getVoiceMeta } from './voices-tab.js';
import { attachBtnBlink } from './agents-tab.js';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// Named ANSI colors only — hex renders as white on Paul's terminal
const COLORS = {
  contentBg:   'black',
  labelFg:     'white',
  borderFg:    'cyan',
  footerBg:    'cyan',
  btnBg:       'blue',
  btnFg:       'white',
  btnFocusBg:  'cyan',
  btnFocusFg:  'black',
  removeBg:    'red',
  removeFocusBg: 'magenta',
  cfgBg:       'green',
  cfgFocusBg:  'yellow',
};

const PROVIDERS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    desc: 'Anthropic CLI agent — hooks + MCP server',
    checkInstalled: (targetDir) => checkClaudeInstalled(targetDir),
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    desc: 'VS Code Copilot Chat — .vscode/mcp.json + instructions',
    checkInstalled: (targetDir) => checkCopilotInstalled(targetDir),
  },
];

// ── Provider checks ──────────────────────────────────────────────────────────

async function checkClaudeInstalled(targetDir) {
  try {
    await fs.access(path.join(targetDir, '.claude', 'hooks'));
    return true;
  } catch {
    try {
      await fs.access(path.join(targetDir, '.claude', 'hooks-windows'));
      return true;
    } catch {
      return false;
    }
  }
}

async function checkCopilotInstalled(targetDir) {
  try {
    const content = await fs.readFile(path.join(targetDir, '.vscode', 'mcp.json'), 'utf8');
    const parsed = JSON.parse(content);
    return !!(parsed?.servers?.agentvibes);
  } catch {
    return false;
  }
}

async function installCopilotMcp(targetDir) {
  const vscodeDir = path.join(targetDir, '.vscode');
  const mcpJsonPath = path.join(vscodeDir, 'mcp.json');

  const agentvibesServer = {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
  };

  try {
    await fs.mkdir(vscodeDir, { recursive: true });
    let mcpConfig = { servers: {} };
    try {
      const existing = await fs.readFile(mcpJsonPath, 'utf8');
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed === 'object') {
        mcpConfig = parsed;
        if (!mcpConfig.servers) mcpConfig.servers = {};
      }
    } catch { /* new file */ }

    mcpConfig.servers.agentvibes = agentvibesServer;
    await fs.writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function removeCopilotMcp(targetDir) {
  const mcpJsonPath = path.join(targetDir, '.vscode', 'mcp.json');
  try {
    const content = await fs.readFile(mcpJsonPath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed?.servers?.agentvibes) {
      delete parsed.servers.agentvibes;
      // If no servers left, remove the file
      if (Object.keys(parsed.servers).length === 0) {
        await fs.unlink(mcpJsonPath);
      } else {
        await fs.writeFile(mcpJsonPath, JSON.stringify(parsed, null, 2) + '\n');
      }
    }
    return { success: true };
  } catch {
    return { success: true }; // Already gone
  }
}

async function installCopilotInstructions(targetDir, packageDir) {
  const destPath = path.join(targetDir, '.github', 'copilot-instructions.md');
  const srcPath = path.join(packageDir, '.github', 'copilot-instructions.md');
  try {
    await fs.mkdir(path.join(targetDir, '.github'), { recursive: true });
    const content = await fs.readFile(srcPath, 'utf8');
    await fs.writeFile(destPath, content);
  } catch { /* best effort */ }
}

async function removeCopilotInstructions(targetDir) {
  try {
    await fs.unlink(path.join(targetDir, '.github', 'copilot-instructions.md'));
  } catch { /* already gone */ }
}

// ── Test stub ────────────────────────────────────────────────────────────────

function createTestStub() {
  return {
    box: {},
    show: () => {},
    hide: () => {},
    onFocus: () => {},
    onBlur: () => {},
    getFooterText: () => '[Enter] Action  [Tab] Next  [Esc] Back',
    getFooterColor: () => COLORS.footerBg,
  };
}

// ── Main tab factory ─────────────────────────────────────────────────────────

export function createLlmProvidersTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { focusMainTabBar, navigationService } = services;

  const targetDir = process.env.INIT_CWD || process.cwd();
  const _thisFile = import.meta.url;
  const packageDir = path.resolve(
    path.dirname(_thisFile.replace('file:///', '').replace('file://', '')),
    '..', '..', '..'
  );

  let installedState = {};
  let currentView = 'list'; // 'list' or 'info'
  let focusableItems = [];  // ordered list of buttons for Tab/Shift+Tab cycling
  let focusIndex = 0;

  // ── Main container ─────────────────────────────────────────────────────────

  const box = blessed.box({
    parent: screen,
    top: 5,
    left: 0,
    width: '100%',
    bottom: 2,
    hidden: true,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    border: { type: 'line', fg: COLORS.borderFg },
  });

  blessed.text({
    parent: box,
    top: 0,
    left: 2,
    tags: true,
    content: '{bold}{cyan-fg}LLM Providers{/cyan-fg}{/bold}  Configure AgentVibes for your AI assistant:',
    style: { bg: COLORS.contentBg },
  });

  // ── Provider row builder ───────────────────────────────────────────────────

  const providerRows = [];
  const statusTexts = [];

  function createProviderRow(provider, rowIndex) {
    const yOffset = 2 + (rowIndex * 3);

    // Provider name + description
    const label = blessed.text({
      parent: box,
      top: yOffset,
      left: 2,
      tags: true,
      content: `{bold}{white-fg}${provider.name}{/white-fg}{/bold}  {cyan-fg}${provider.desc}{/cyan-fg}`,
      style: { bg: COLORS.contentBg },
    });

    // Status indicator
    const statusText = blessed.text({
      parent: box,
      top: yOffset + 1,
      left: 4,
      tags: true,
      content: '{yellow-fg}Checking...{/yellow-fg}',
      style: { bg: COLORS.contentBg },
    });
    statusTexts.push({ id: provider.id, widget: statusText });

    // Install / Re-install button
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
      style: {
        fg: COLORS.btnFg,
        bg: COLORS.btnBg,
        focus: { fg: COLORS.btnFocusFg, bg: COLORS.btnFocusBg },
      },
    });

    // Remove button
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
      style: {
        fg: COLORS.btnFg,
        bg: COLORS.removeBg,
        focus: { fg: COLORS.btnFocusFg, bg: COLORS.removeFocusBg },
      },
    });

    // Configure button
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
      style: {
        fg: COLORS.btnFocusFg,
        bg: COLORS.cfgBg,
        focus: { fg: COLORS.btnFocusFg, bg: COLORS.cfgFocusBg },
      },
    });

    // Wire install action
    installBtn.on('press', async () => { await handleInstall(provider); });
    installBtn.key(['enter', 'space'], async () => { await handleInstall(provider); });

    // Wire remove action
    removeBtn.on('press', async () => { await handleRemove(provider); });
    removeBtn.key(['enter', 'space'], async () => { await handleRemove(provider); });

    // Wire configure action
    configBtn.on('press', async () => { await handleConfigure(provider); });
    configBtn.key(['enter', 'space'], async () => { await handleConfigure(provider); });

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
        // Move to previous row's button at same column, or tab bar
        const prevIdx = focusIndex - 3;
        if (prevIdx >= 0) {
          focusIndex = prevIdx;
          focusableItems[focusIndex].focus();
          screen.render();
        } else if (typeof focusMainTabBar === 'function') {
          focusMainTabBar();
        }
      });
      btn.key(['down'], () => {
        const nextIdx = focusIndex + 3;
        if (nextIdx < focusableItems.length) {
          focusIndex = nextIdx;
          focusableItems[focusIndex].focus();
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
    focusableItems.push(installBtn, removeBtn, configBtn);
  }

  // ── Focus cycling ──────────────────────────────────────────────────────────

  function cycleFocus(dir) {
    focusIndex = (focusIndex + dir + focusableItems.length) % focusableItems.length;
    focusableItems[focusIndex].focus();
    screen.render();
  }

  // ── Install / Remove handlers ──────────────────────────────────────────────

  async function handleInstall(provider) {
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
  }

  async function handleRemove(provider) {
    if (provider.id === 'claude-code') {
      // Show confirmation — Claude Code removal is the uninstall flow
      showRemoveInfo('claude-code');
      return;
    }

    if (provider.id === 'github-copilot') {
      await removeCopilotMcp(targetDir);
      await removeCopilotInstructions(targetDir);
      await refreshInstalledState();
      showRemoveInfo('github-copilot');
    }
  }

  // ── Configure handler ────────────────────────────────────────────────────

  async function handleConfigure(provider) {
    const llmKey = provider.id === 'github-copilot' ? 'copilot' : 'claude-code';
    const config = loadLlmConfigSync(llmKey);
    _openLlmConfigModal(provider, llmKey, config);
  }

  function _resolveCfgPath() {
    const localCfg = path.join(targetDir, '.claude', 'config', 'audio-effects.cfg');
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    const globalCfg = path.join(homeDir, '.claude', 'config', 'audio-effects.cfg');
    return fsSync.existsSync(localCfg) ? localCfg : globalCfg;
  }

  function loadLlmConfigSync(llmKey) {
    const cfgKey = `llm:${llmKey}`;
    const cfgPaths = [
      path.join(targetDir, '.claude', 'config', 'audio-effects.cfg'),
      path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'config', 'audio-effects.cfg'),
    ];

    for (const cfgPath of cfgPaths) {
      try {
        const content = fsSync.readFileSync(cfgPath, 'utf8');
        for (const line of content.split('\n')) {
          if (line.startsWith(cfgKey + '|')) {
            const parts = line.split('|');
            return {
              effects: (parts[1] || '').trim(),
              bgTrack: (parts[2] || '').trim(),
              bgVolume: (parts[3] || '0.15').trim(),
              voice: (parts[4] || '').trim(),
              pretext: (parts[5] || '').trim(),
              sourcePath: cfgPath,
            };
          }
        }
      } catch { /* file not found */ }
    }
    return { effects: '', bgTrack: '', bgVolume: '0.15', voice: '', pretext: '', sourcePath: '' };
  }

  function saveLlmConfigSync(llmKey, config) {
    const cfgKey = `llm:${llmKey}`;
    const cfgLine = `${cfgKey}|${config.effects}|${config.bgTrack}|${config.bgVolume}|${config.voice}|${config.pretext}`;
    const cfgPath = config.sourcePath || _resolveCfgPath();

    try {
      let content = '';
      try { content = fsSync.readFileSync(cfgPath, 'utf8'); } catch { /* new file */ }

      const lines = content.split('\n');
      let found = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(cfgKey + '|')) {
          lines[i] = cfgLine;
          found = true;
          break;
        }
      }
      if (!found) lines.push(cfgLine);

      fsSync.mkdirSync(path.dirname(cfgPath), { recursive: true });
      fsSync.writeFileSync(cfgPath, lines.join('\n'));
    } catch { /* best effort */ }
  }

  // ── LLM Config Modal (reuses BMAD agent configurer pattern) ─────────────

  function _openLlmConfigModal(provider, llmKey, config) {
    const { navigationService } = services;
    let _closed = false;
    navigationService?.openModal();

    // Working copy
    const draft = {
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
      height: 19,
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

    // Field definitions
    const FIELDS = [
      { key: 'voice',    label: 'Voice',       getValue: () => draft.voice || '(global default)' },
      { key: 'pretext',  label: 'Pretext',     getValue: () => draft.pretext || '(none)' },
      { key: 'reverb',   label: 'Reverb',       getValue: () => {
        const p = REVERB_PRESETS.find(r => r.value === draft.reverbPreset);
        return p ? p.label : draft.reverbPreset || 'Off';
      }},
      { key: 'bgTrack',  label: 'Music Track', getValue: () => formatTrackName(draft.bgTrack) || '(default)' },
      { key: 'bgVolume', label: 'Music Vol',   getValue: () => {
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

    // Key hint
    blessed.text({
      parent: modal,
      bottom: 4,
      left: 2,
      right: 2,
      tags: true,
      content: '{white-fg}[↑↓] Navigate  [Enter] Edit  [Tab] → Save/Cancel  [Esc] Cancel{/white-fg}',
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
        sourcePath: config.sourcePath,
      });
      _closeModal();
      _showSavedToast(provider.name);
    });

    const resetBtn = _modalBtn('Reset', 16, () => {
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
      if (focusableItems.length) focusableItems[focusIndex]?.focus();
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

    // Escape on field list = close modal
    fieldList.key(['escape'], _closeModal);

    // Tab from field list to buttons
    fieldList.key(['tab'], () => {
      allBtns[0].focus();
      screen.render();
    });

    // Button navigation
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

    // Escape on the modal box itself (catch-all)
    modal.key(['escape'], _closeModal);

    fieldList.focus();
    screen.render();
  }

  // ── Voice picker for LLM config ────────────────────────────────────────

  function _openVoicePickerForLlm(draft, onDone) {
    const { navigationService } = services;
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

    // Scan installed voices (already expanded for multi-speaker)
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

    // Search
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

  // ── Pretext editor ────────────────────────────────────────────────────

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



  // ── Saved toast ────────────────────────────────────────────────────────

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

  // ── Info panel (shown after install/remove) ────────────────────────────────

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

  function hideAllRows() {
    for (const row of providerRows) {
      row.label.hide();
      row.statusText.hide();
      row.installBtn.hide();
      row.removeBtn.hide();
      row.configBtn.hide();
    }
  }

  function showAllRows() {
    for (const row of providerRows) {
      row.label.show();
      row.statusText.show();
      row.installBtn.show();
      row.removeBtn.show();
      row.configBtn.show();
    }
  }

  function showClaudeCodeInfo() {
    currentView = 'info';
    hideAllRows();

    const mcpPath = path.join(targetDir, '.mcp.json');
    const hooksDir = path.join(targetDir, '.claude', process.platform === 'win32' ? 'hooks-windows' : 'hooks');
    const installed = installedState['claude-code'];

    const lines = [];
    lines.push('{bold}{cyan-fg}Claude Code — AgentVibes Integration{/cyan-fg}{/bold}');
    lines.push('');
    lines.push(installed
      ? '{green-fg}Installed{/green-fg}'
      : '{yellow-fg}Not installed — use the Install tab (I) to set up{/yellow-fg}');
    lines.push('');
    lines.push('{bold}{cyan-fg}What gets installed:{/cyan-fg}{/bold}');
    lines.push('');
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.mcp.json{/bold} (project root)');
    lines.push(`     Location: ${mcpPath}`);
    lines.push('     Registers the AgentVibes MCP server for Claude Code.');
    lines.push('     Claude Code reads this file and starts the server automatically.');
    lines.push('');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.claude/hooks/{/bold} (session-start + pre-tool hooks)');
    lines.push(`     Location: ${hooksDir}`);
    lines.push('     Session-start hook injects the TTS protocol so Claude speaks');
    lines.push('     an acknowledgment at the start and a summary at the end.');
    lines.push('');
    lines.push('  {yellow-fg}3.{/yellow-fg} {bold}.claude/commands/{/bold} (slash commands)');
    lines.push('     Slash commands like /agent-vibes:switch, /agent-vibes:mute, etc.');
    lines.push('');
    lines.push('  {yellow-fg}4.{/yellow-fg} {bold}.claude/config/{/bold} (personality, verbosity, voice settings)');
    lines.push('     Your TTS preferences: voice, personality, speed, language.');
    lines.push('');
    lines.push('{bold}{cyan-fg}How to use:{/cyan-fg}{/bold}');
    lines.push('');
    lines.push('  1. Run {yellow-fg}claude{/yellow-fg} in your project directory');
    lines.push('  2. Claude will automatically speak its responses via TTS');
    lines.push('  3. Use slash commands to control voice: /agent-vibes:switch, /agent-vibes:mute');
    lines.push('');
    lines.push('{bold}{cyan-fg}To install or re-install:{/cyan-fg}{/bold}');
    lines.push('  Press {bold}I{/bold} to switch to the Install tab, or run:');
    lines.push('  {yellow-fg}npx agentvibes install{/yellow-fg}');
    lines.push('');
    lines.push('{white-fg}Press {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showCopilotInfo(result, wasInstalled = false) {
    currentView = 'info';
    hideAllRows();

    const mcpPath = path.join(targetDir, '.vscode', 'mcp.json');
    const verb = wasInstalled ? 'reinstalled' : 'installed';

    const lines = [];
    lines.push('{bold}{cyan-fg}GitHub Copilot — AgentVibes Integration{/cyan-fg}{/bold}');
    lines.push('');

    if (result.success) {
      lines.push(`{green-fg}AgentVibes for Copilot ${verb}!{/green-fg}`);
    } else {
      lines.push(`{red-fg}Installation failed:{/red-fg} ${result.error || 'Unknown error'}`);
    }

    lines.push('');
    lines.push(`{bold}{cyan-fg}What got ${verb}:{/cyan-fg}{/bold}`);
    lines.push('');
    lines.push('  {yellow-fg}1.{/yellow-fg} {bold}.vscode/mcp.json{/bold}');
    lines.push(`     Location: ${mcpPath}`);
    lines.push('     Registers the AgentVibes MCP server so Copilot can call');
    lines.push('     text_to_speech, set_voice, set_personality, and other tools.');
    lines.push('     VS Code starts the server automatically — no manual launch needed.');
    lines.push('');
    lines.push('  {yellow-fg}2.{/yellow-fg} {bold}.github/copilot-instructions.md{/bold}');
    lines.push('     Custom instructions that tell Copilot the TTS protocol:');
    lines.push('     speak an acknowledgment at the start and a summary at the end.');
    lines.push('');
    lines.push('{bold}{cyan-fg}How to use:{/cyan-fg}{/bold}');
    lines.push('');
    lines.push('  1. Open VS Code in this project');
    lines.push('  2. Open Copilot Chat (Ctrl+Shift+I)');
    lines.push('  3. Ask Copilot to do something — you should hear TTS!');
    lines.push('');
    lines.push('{bold}{cyan-fg}Available MCP tools:{/cyan-fg}{/bold}');
    lines.push('');
    lines.push('  {yellow-fg}text_to_speech{/yellow-fg}    Speak text aloud');
    lines.push('  {yellow-fg}set_voice{/yellow-fg}         Switch voices (ryan, katherine, etc.)');
    lines.push('  {yellow-fg}set_personality{/yellow-fg}    Change personality (sarcastic, pirate, zen)');
    lines.push('  {yellow-fg}set_speed{/yellow-fg}         Adjust speech rate');
    lines.push('  {yellow-fg}set_verbosity{/yellow-fg}     Control detail level (low/medium/high)');
    lines.push('  {yellow-fg}mute / unmute{/yellow-fg}     Toggle audio');
    lines.push('  {yellow-fg}get_config{/yellow-fg}        Read current settings');
    lines.push('');
    lines.push('{white-fg}Press {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showRemoveInfo(providerId) {
    currentView = 'info';
    hideAllRows();

    const lines = [];

    if (providerId === 'claude-code') {
      lines.push('{bold}{cyan-fg}Remove Claude Code Integration{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('To remove the Claude Code integration, run:');
      lines.push('');
      lines.push('  {yellow-fg}npx agentvibes uninstall{/yellow-fg}');
      lines.push('');
      lines.push('This removes the .claude/ hooks and commands installed by AgentVibes.');
    } else if (providerId === 'github-copilot') {
      lines.push('{bold}{cyan-fg}GitHub Copilot — Removed{/cyan-fg}{/bold}');
      lines.push('');
      lines.push('{green-fg}Successfully removed!{/green-fg}');
      lines.push('');
      lines.push('The following were cleaned up:');
      lines.push('');
      lines.push('  {yellow-fg}1.{/yellow-fg} Removed {bold}agentvibes{/bold} server from .vscode/mcp.json');
      lines.push('     (file deleted if no other servers remained)');
      lines.push('');
      lines.push('  {yellow-fg}2.{/yellow-fg} Removed .github/copilot-instructions.md');
      lines.push('');
      lines.push('Copilot will no longer use AgentVibes TTS. You can re-install anytime.');
    }

    lines.push('');
    lines.push('{white-fg}Press {bold}Escape{/bold} to return to the provider list.{/white-fg}');

    infoBox.setContent(lines.join('\n'));
    infoBox.show();
    infoBox.focus();
    infoBox.scrollTo(0);
    screen.render();
  }

  function showListView() {
    currentView = 'list';
    infoBox.hide();
    showAllRows();
    focusIndex = 0;
    focusableItems[0].focus();
    screen.render();
  }

  infoBox.key(['escape'], () => {
    showListView();
  });

  // ── Refresh installed status ───────────────────────────────────────────────

  async function refreshInstalledState() {
    for (const p of PROVIDERS) {
      installedState[p.id] = await p.checkInstalled(targetDir);
    }
    // Update status text and button labels
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

  // ── Tab Component Contract ─────────────────────────────────────────────────

  return {
    box,

    show() {
      box.show();
      refreshInstalledState().then(() => {
        if (currentView === 'list') {
          showAllRows();
          infoBox.hide();
        }
        screen.render();
      });
    },

    hide() {
      box.hide();
      currentView = 'list';
      infoBox.hide();
      showAllRows();
      screen.render();
    },

    onFocus() {
      if (currentView === 'list') {
        focusIndex = 0;
        if (focusableItems.length) focusableItems[0].focus();
      } else {
        infoBox.focus();
      }
      screen.render();
    },

    onBlur() {},

    getFooterText() {
      if (currentView === 'info') {
        return '[Esc] Back to list  [Up/Down] Scroll';
      }
      return '[Enter] Action  [Tab] Next button  [Esc] Tab bar';
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
