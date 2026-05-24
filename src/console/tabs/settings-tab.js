/**
 * AgentVibes TUI Console — Settings Tab (Redesigned)
 *
 * Simplified flat settings list matching the mockup:
 *   1. Interface Language
 *   2. Default TTS Engine
 *   3. Default Voice
 *   4. Verbosity
 *   5. Audio Destination
 *   6. Config Storage (read-only)
 *   7. Re-run Setup Wizard
 *
 * Implements the Tab Component Contract:
 *   createSettingsTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  scanInstalledVoices, getVoiceMeta, genderIconTag, PIPER_VOICES_DIR, SAMPLE_PHRASES, parseMultiSpeaker,
} from './voices-tab.js';
import { LanguageService } from '../../services/language-service.js';
import { SUPPORTED_LANGUAGES, t } from '../../i18n/strings.js';
import { buildAudioEnv, detectWavPlayer, detectRemoteLlm } from '../audio-env.js';
import { destroyList } from '../widgets/destroy-list.js';
import { openReverbPicker } from '../widgets/reverb-picker.js';
import { openPersonalityPicker } from '../widgets/personality-picker.js';
import { PERSONALITY_EMOJIS } from '../constants/personalities.js';
import { formatTrackName as _sharedFormatTrackName, formatReverbState as _sharedFormatReverbState } from '../widgets/format-utils.js';
import { showNotice as _showNoticeWidget } from '../widgets/notice.js';
import {
  getAvailableEngines, checkEngineInstalled,
} from '../../services/tts-engine-service.js';

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
  btnDefault: 'blue',
  btnFocus:   'green',
  btnFocusFg: 'white',
  btnPress:   'magenta',
  borderFg:   'bright-cyan',
  footerBg:   '#2196f3',
  noticeFg:   'white',
};

const FOOTER_TEXT =
  '[↑↓] Navigate  [Enter] Edit  [Esc] Tab Bar';

const MUSIC_DEFAULTS = Object.freeze({ enabled: false, track: 'agentvibes_soft_flamenco_loop.mp3', volume: 20 });
const VERBOSITY_LABELS = Object.freeze({ high: 'High', medium: 'Medium', low: 'Low', caveman: 'Caveman', minimal: 'Minimal', custom: 'Custom' });

// ---------------------------------------------------------------------------
// Exported format helpers (pure functions — used by tests and UI)

export const formatReverbState = _sharedFormatReverbState;

export function formatMusicState(enabled) {
  return enabled ? 'Enabled' : 'Disabled';
}

export function formatVolume(volume) {
  const v = typeof volume === 'number' && !isNaN(volume) ? volume : MUSIC_DEFAULTS.volume;
  return `${Math.max(10, Math.min(100, v))}%`;
}

export const formatTrackName = _sharedFormatTrackName;

export function formatVerbosity(verbosity) {
  return VERBOSITY_LABELS[verbosity] ?? 'High';
}

export function formatPersonality(personality) {
  const name  = personality || 'none';
  const emoji = PERSONALITY_EMOJIS[name] ?? '✨';
  const label = name === 'none' ? 'None' : name.charAt(0).toUpperCase() + name.slice(1);
  return `${emoji} ${label}`;
}

export function formatIntroText(pretext) {
  if (!pretext) return '(none)';
  return pretext.length > 30 ? pretext.slice(0, 30) + '…' : pretext;
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
 * Create the Settings tab component (redesigned flat list).
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createSettingsTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService, navigationService, focusMainTabBar, languageService } = services;

  // ── Container ────────────────────────────────────────────────────────────

  const box = blessed.box({
    parent: screen,
    top: 5,
    left: 0,
    width: '100%',
    bottom: 2,
    tags: true,
    keys: true,
    scrollable: false,
    hidden: true,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  // ── Settings items definition ────────────────────────────────────────────

  const SETTINGS = [
    {
      key: 'language',
      label: 'Interface Language',
      getValue: () => {
        const lang = languageService?.getLang() ?? configService?.getConfig?.()?.language ?? 'en';
        const entry = SUPPORTED_LANGUAGES.find(l => l.value === lang);
        return entry ? entry.name : lang;
      },
      desc: 'Press Enter to change — also accessible during first-run Setup wizard',
    },
    {
      key: 'ttsEngine',
      label: 'Default TTS Engine',
      getValue: () => {
        const engine = configService?.getConfig?.()?.ttsEngine ?? '';
        if (!engine) {
          const engines = getAvailableEngines();
          const installed = engines.find(e => checkEngineInstalled(e.id));
          return installed ? installed.name : '(none)';
        }
        const match = getAvailableEngines().find(e => e.id === engine);
        return match ? match.name : engine;
      },
      desc: 'Global default — individual providers can override in Setup → Configure',
    },
    {
      key: 'voice',
      label: 'Default Voice',
      getValue: () => {
        const voice = providerService?.getActiveVoiceId() ?? configService?.getConfig?.()?.voice ?? '';
        if (!voice) return '(none)';
        const meta = getVoiceMeta(voice);
        return meta.displayName || voice;
      },
      desc: 'Global default voice — providers can override',
    },
    {
      key: 'verbosity',
      label: 'Verbosity',
      getValue: () => formatVerbosity(configService?.getConfig?.()?.verbosity ?? 'high'),
      desc: null,
    },
    {
      key: 'audioDst',
      label: 'Audio Destination',
      getValue: () => {
        const dst = configService?.getConfig?.()?.audio_destination ?? 'local';
        if (dst === 'remote') {
          const alias = configService?.getConfig?.()?.audio_ssh_alias ?? '';
          const mode = configService?.getConfig?.()?.audio_stream_mode ?? 'text';
          return `Remote (${alias || 'no alias'}) — ${mode === 'pulse' ? 'PulseAudio' : 'Text Only'}`;
        }
        return 'Local';
      },
      desc: 'Play audio locally or stream to a remote host via SSH',
    },
    {
      key: 'sshAlias',
      label: 'SSH Host Alias',
      getValue: () => {
        const alias = configService?.getConfig?.()?.audio_ssh_alias ?? '';
        return alias || '(not set)';
      },
      desc: 'SSH host alias from ~/.ssh/config used when Audio Destination is Remote',
    },
    {
      key: 'configStorage',
      label: 'Config Storage',
      getValue: () => {
        const home = os.homedir();
        const globalPath = path.join(home, '.claude', 'config', 'audio-effects.cfg');
        const localPath = path.join('.claude', 'config', 'audio-effects.cfg');
        return `Global: ${globalPath}  |  Local: ${localPath}`;
      },
      desc: null,
      readOnly: true,
    },
    {
      key: 'rerunWizard',
      label: 'Re-run Setup Wizard',
      getValue: () => '',
      desc: 'Press Enter to re-run the first-time setup (Language → Deps → TTS → Providers)',
      isAction: true,
    },
  ];

  // ── Build UI ─────────────────────────────────────────────────────────────

  const headerText = blessed.text({
    parent: box,
    top: 0,
    left: 2,
    tags: true,
    content: '{bold}{cyan-fg}Settings{/cyan-fg}{/bold}',
    style: { bg: COLORS.contentBg },
  });

  // Settings rows — each is a bordered section
  const _settingWidgets = [];
  let yPos = 2;

  for (let i = 0; i < SETTINGS.length; i++) {
    const setting = SETTINGS[i];
    const rowHeight = setting.desc ? 3 : 2;

    const rowBox = blessed.box({
      parent: box,
      top: yPos,
      left: 2,
      right: 2,
      height: rowHeight,
      border: { type: 'line' },
      tags: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'blue' },
      },
    });

    const labelWidget = blessed.text({
      parent: rowBox,
      top: 0,
      left: 1,
      tags: true,
      content: `{bold}{cyan-fg}${setting.label}{/cyan-fg}{/bold}`,
      style: { bg: COLORS.contentBg },
    });

    const valueWidget = blessed.text({
      parent: rowBox,
      top: 0,
      left: setting.label.length + 4,
      right: 1,
      tags: true,
      wrap: false,
      content: '',
      style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
    });

    let descWidget = null;
    if (setting.desc) {
      descWidget = blessed.text({
        parent: rowBox,
        top: 1,
        left: 1,
        right: 1,
        tags: true,
        wrap: false,
        content: `{white-fg}${setting.desc}{/white-fg}`,
        style: { bg: COLORS.contentBg },
      });
    }

    _settingWidgets.push({ setting, rowBox, labelWidget, valueWidget, descWidget });
    yPos += rowHeight + 1;
  }

  // Footer hint
  const hintLine = blessed.text({
    parent: box,
    bottom: 0,
    left: 2,
    right: 2,
    tags: true,
    content: `{white-fg}${FOOTER_TEXT}{/white-fg}`,
    style: { bg: COLORS.contentBg },
  });

  // ── Selection state ──────────────────────────────────────────────────────

  let _selectedIdx = 0;

  function _highlightRow(idx) {
    for (let i = 0; i < _settingWidgets.length; i++) {
      const w = _settingWidgets[i];
      if (i === idx) {
        w.rowBox.style.bg = 'magenta';
        w.rowBox.style.border.fg = 'magenta';
        w.labelWidget.style.bg = 'magenta';
        w.labelWidget.style.fg = 'white';
        w.valueWidget.style.bg = 'magenta';
        if (w.descWidget) w.descWidget.style.bg = 'magenta';
      } else {
        w.rowBox.style.bg = COLORS.contentBg;
        w.rowBox.style.border.fg = 'blue';
        w.labelWidget.style.bg = COLORS.contentBg;
        w.labelWidget.style.fg = 'cyan';
        w.valueWidget.style.bg = COLORS.contentBg;
        if (w.descWidget) w.descWidget.style.bg = COLORS.contentBg;
      }
    }
    screen.render();
  }

  function _refreshValues() {
    for (const w of _settingWidgets) {
      const val = w.setting.getValue();
      if (w.setting.isAction) {
        w.valueWidget.setContent('');
      } else {
        w.valueWidget.setContent(`{yellow-fg}${val}{/yellow-fg}`);
      }
    }
  }

  // ── Key navigation ───────────────────────────────────────────────────────

  box.key(['down', 'j'], () => {
    _selectedIdx = Math.min(_selectedIdx + 1, SETTINGS.length - 1);
    _highlightRow(_selectedIdx);
  });

  box.key(['up', 'k'], () => {
    if (_selectedIdx === 0) {
      _selectedIdx = -1;
      _highlightRow(-1);
      if (typeof focusMainTabBar === 'function') {
        focusMainTabBar();
        screen.render();
      }
      return;
    }
    _selectedIdx = _selectedIdx - 1;
    _highlightRow(_selectedIdx);
  });

  box.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') {
      focusMainTabBar();
      screen.render();
    }
  });

  box.key(['enter', 'space'], () => {
    const setting = SETTINGS[_selectedIdx];
    if (setting.readOnly) return;
    _handleEdit(setting);
  });

  // ── Edit handlers ────────────────────────────────────────────────────────

  function _handleEdit(setting) {
    switch (setting.key) {
      case 'language':
        _editLanguage();
        break;
      case 'ttsEngine':
        _editTtsEngine();
        break;
      case 'voice':
        _editVoice();
        break;
      case 'verbosity':
        _editVerbosity();
        break;
      case 'audioDst':
        _editAudioDst();
        break;
      case 'sshAlias':
        _editSshAlias();
        break;
      case 'rerunWizard':
        _rerunWizard();
        break;
    }
  }

  // ── Language editor ──────────────────────────────────────────────────────

  function _editLanguage() {
    navigationService?.openModal();

    const modal = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: SUPPORTED_LANGUAGES.length + 4,
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Select Language {/cyan-fg}{/bold} ',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    modal.setFront();

    const items = SUPPORTED_LANGUAGES.map(l => `  ${l.name}`);
    modal.setItems(items);

    const currentLang = languageService?.getLang() ?? 'en';
    const currentIdx = SUPPORTED_LANGUAGES.findIndex(l => l.value === currentLang);
    if (currentIdx >= 0) modal.select(currentIdx);

    modal.key(['enter'], () => {
      const sel = SUPPORTED_LANGUAGES[modal.selected];
      if (sel) {
        configService.set('language', sel.value);
        if (languageService) languageService.setLang(sel.value);
      }
      _closeModal();
    });
    modal.key(['escape', 'q'], _closeModal);

    function _closeModal() {
      navigationService?.closeModal();
      destroyList(modal, screen);
      _refreshValues();
      box.focus();
      screen.render();
    }

    modal.focus();
    screen.render();
  }

  // ── TTS Engine editor ────────────────────────────────────────────────────

  function _editTtsEngine() {
    navigationService?.openModal();

    const engines = getAvailableEngines();
    const modal = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: engines.length + 4,
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Default TTS Engine {/cyan-fg}{/bold} ',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    modal.setFront();

    const items = engines.map(e => {
      const installed = checkEngineInstalled(e.id);
      const status = installed ? '{green-fg}[OK]{/green-fg}' : '{yellow-fg}[N/A]{/yellow-fg}';
      return `  ${e.name}  ${status}`;
    });
    modal.setItems(items);

    modal.key(['enter'], () => {
      const sel = engines[modal.selected];
      if (sel) configService.set('ttsEngine', sel.id);
      _closeModal();
    });
    modal.key(['escape', 'q'], _closeModal);

    function _closeModal() {
      navigationService?.closeModal();
      destroyList(modal, screen);
      _refreshValues();
      box.focus();
      screen.render();
    }

    modal.focus();
    screen.render();
  }

  // ── Voice editor (with space bar preview — matches agents-tab pattern) ──

  function _secureTempWav(prefix) {
    const baseDir = process.env.XDG_RUNTIME_DIR || os.tmpdir();
    const dir = path.join(baseDir, `agentvibes-${process.getuid?.() ?? 'u'}`);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try { fs.chmodSync(dir, 0o700); } catch {}
    return path.join(dir, `${prefix}-${crypto.randomUUID()}.wav`);
  }

  function _editVoice() {
    navigationService?.openModal();

    let _allVoices = [];
    let _previewProc = null;
    let _previewVoiceId = null;
    let _vpClosed = false;

    const _spawnEnv = buildAudioEnv();
    const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;

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
      destroyList(vpModal, screen);
      _refreshValues();
      box.focus();
      screen.render();
    }

    const vpModal = blessed.box({
      parent: screen,
      top: '6%',
      left: '3%',
      width: '94%',
      height: '88%',
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Select Default Voice {/cyan-fg}{/bold} ',
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'cyan' } },
    });
    vpModal.setFront();

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
        selected: { bg: 'green', fg: 'black', bold: true },
        item: { fg: COLORS.labelFg },
      },
    });

    const vpPreviewLine = blessed.text({
      parent: vpModal, bottom: 3, left: 2, right: 2, tags: true,
      content: '', style: { fg: 'cyan', bg: COLORS.contentBg },
    });

    blessed.text({
      parent: vpModal, bottom: 2, left: 2, right: 2, tags: true,
      content: '{white-fg}[↑↓] Nav  [PgUp/PgDn] Page  [Home/End]  [a-z] Jump  [Enter] Select  [Space] Preview  [Esc] Cancel{/white-fg}',
      style: { bg: COLORS.contentBg },
    });

    function _buildItems(voices) {
      const currentVoice = providerService?.getActiveVoiceId() ?? '';
      return voices.map(v => {
        const isActive = v === currentVoice;
        const isPrev = v === _previewVoiceId;
        const dot = isPrev ? '♪' : (isActive ? '●' : ' ');
        const meta = getVoiceMeta(v);
        const name = meta.displayName.length > COL_N
          ? meta.displayName.slice(0, COL_N - 1) + '…'
          : meta.displayName.padEnd(COL_N);
        // genderIconTag has invisible color tags — pad with literal spaces (1 visible char + 3 spaces = 4)
        return ` ${dot} ${name}${genderIconTag(meta.gender)}   ${meta.provider}`;
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
      const items = _buildItems(_allVoices);
      vpList.setItems(items.length > 0 ? items : [' (no voices found)']);
      vpList.select(Math.min(savedIdx, items.length - 1));
      vpList.childBase = Math.min(savedScroll, Math.max(0, items.length - (vpList.height - 2)));
      screen.render();
    }

    function _previewVoice(voiceId) {
      if (_previewVoiceId === voiceId) { _killVP(); vpPreviewLine.setContent(''); _refreshVP(); return; }
      _killVP();

      const phrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)]; // NOSONAR
      const playTtsScript = path.join(_projectRoot, '.claude', 'hooks', 'play-tts.sh');
      if (!fs.existsSync(playTtsScript)) return;

      const remoteLlm = detectRemoteLlm();
      const args = [playTtsScript, phrase, voiceId];
      if (remoteLlm) args.push('--llm', remoteLlm);

      _previewProc = spawn('bash', args, { // NOSONAR
        stdio: 'ignore',
        detached: true,
        env: _spawnEnv,
        cwd: _projectRoot,
      });
      _previewVoiceId = voiceId;

      if (!_vpClosed) {
        vpPreviewLine.setContent(`{cyan-fg}♪ Playing: ${voiceId}...{/cyan-fg}`);
        _refreshVP();
      }

      _previewProc.on('exit', () => {
        if (_previewVoiceId === voiceId) {
          _previewVoiceId = null;
          _previewProc = null;
          if (!_vpClosed) { vpPreviewLine.setContent(''); _refreshVP(); }
        }
      });
      _previewProc.on('error', () => { _previewProc = null; _previewVoiceId = null; });
    }

    vpList.key(['enter'], () => {
      const sel = _allVoices[vpList.selected];
      if (sel) {
        if (providerService) providerService.setActiveVoice(sel);
        else configService.set('voice', sel);
      }
      _closeVP();
    });
    vpList.key(['space'], () => {
      const sel = _allVoices[vpList.selected];
      if (sel) _previewVoice(sel);
    });
    vpList.key(['escape', 'q'], _closeVP);

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
    const currentVoice = providerService?.getActiveVoiceId() ?? '';
    const activeIdx = _allVoices.indexOf(currentVoice);
    if (activeIdx >= 0) vpList.select(activeIdx);
    vpList.focus();
    screen.render();
  }

  // ── Verbosity editor ─────────────────────────────────────────────────────

  function _editVerbosity() {
    navigationService?.openModal();

    const levels = ['high', 'medium', 'low', 'caveman'];
    const modal = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 30,
      height: levels.length + 4,
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Verbosity {/cyan-fg}{/bold} ',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    modal.setFront();

    modal.setItems(levels.map(l => `  ${formatVerbosity(l)}`));
    const current = configService?.getConfig?.()?.verbosity ?? 'high';
    const idx = levels.indexOf(current);
    if (idx >= 0) modal.select(idx);

    modal.key(['enter'], () => {
      const sel = levels[modal.selected];
      if (sel) configService.set('verbosity', sel);
      _closeModal();
    });
    modal.key(['escape', 'q'], _closeModal);

    function _closeModal() {
      navigationService?.closeModal();
      destroyList(modal, screen);
      _refreshValues();
      box.focus();
      screen.render();
    }

    modal.focus();
    screen.render();
  }

  // ── Audio Destination editor ─────────────────────────────────────────────

  function _detectSshAliases() {
    try {
      const sshConfigPath = path.join(os.homedir(), '.ssh', 'config');
      const raw = fs.readFileSync(sshConfigPath, 'utf8');
      const matches = raw.match(/^Host\s+(\S+)/gm);
      if (!matches) return [];
      return matches.map(m => m.replace(/^Host\s+/, '').trim()).filter(a => a !== '*');
    } catch {
      return [];
    }
  }

  function _editAudioDst() {
    navigationService?.openModal();

    const choices = ['local', 'remote'];
    const modal = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: choices.length + 4,
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Audio Destination {/cyan-fg}{/bold} ',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    modal.setFront();

    modal.setItems(choices.map(c => `  ${c === 'local' ? 'Local' : 'Remote (SSH)'}`));
    const current = configService?.getConfig?.()?.audio_destination ?? 'local';
    const idx = choices.indexOf(current);
    if (idx >= 0) modal.select(idx);

    modal.key(['enter'], () => {
      const sel = choices[modal.selected];
      if (sel) {
        configService.set('audio_destination', sel);
        if (sel === 'remote' && !(configService.getConfig().audio_ssh_alias)) {
          // Prompt for SSH alias
          _closeModal();
          _promptSshAlias();
          return;
        }
      }
      _closeModal();
    });
    modal.key(['escape', 'q'], _closeModal);

    function _closeModal() {
      navigationService?.closeModal();
      destroyList(modal, screen);
      _refreshValues();
      box.focus();
      screen.render();
    }

    modal.focus();
    screen.render();
  }

  function _promptSshAlias() {
    navigationService?.openModal();
    const aliases = _detectSshAliases();
    const detectedAliases = aliases.length > 0 ? ` (detected: ${aliases.join(', ')})` : '';
    const prompt = blessed.prompt({
      parent: screen,
      top: 'center', left: 'center',
      height: 'shrink', width: '60%',
      border: 'line', tags: true,
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: COLORS.sectionHdr } },
    });
    prompt.input(`SSH Host alias from ~/.ssh/config${detectedAliases}:`,
      aliases[0] ?? '',
      (err, val) => {
        prompt.destroy();
        navigationService?.closeModal();
        if (!err && val && val.trim()) {
          const trimmed = val.trim();
          if (/[;&|`$(){}\\<>]/.test(trimmed)) {
            _showNoticeWidget(screen, 'Invalid alias — special characters not allowed');
          } else {
            configService.set('audio_ssh_alias', trimmed);
          }
        }
        _refreshValues();
        box.focus();
        screen.render();
      });
    screen.render();
  }

  // ── SSH alias editor ─────────────────────────────────────────────────────

  function _editSshAlias() {
    navigationService?.openModal();

    const aliases = _detectSshAliases().filter(a => !a.includes('github.com'));
    const MANUAL_OPTION = '  Type manually...';
    const items = [...aliases.map(a => `  ${a}`), MANUAL_OPTION];
    const currentAlias = configService?.getConfig?.()?.audio_ssh_alias ?? '';

    const listHeight = Math.min(items.length + 4, 18);
    const modal = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 44,
      height: listHeight,
      border: { type: 'line' },
      tags: true,
      label: ' {bold}{cyan-fg} Select SSH Host Alias {/cyan-fg}{/bold} ',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });
    modal.setFront();
    modal.setItems(items);

    const currentIdx = aliases.indexOf(currentAlias);
    if (currentIdx >= 0) modal.select(currentIdx);

    modal.key(['enter'], () => {
      const selItem = items[modal.selected];
      if (selItem === MANUAL_OPTION) {
        _closeModal();
        _promptSshAlias();
        return;
      }
      const alias = selItem?.trim();
      if (alias) configService.set('audio_ssh_alias', alias);
      _closeModal();
    });
    modal.key(['escape', 'q'], _closeModal);

    function _closeModal() {
      navigationService?.closeModal();
      destroyList(modal, screen);
      _refreshValues();
      box.focus();
      screen.render();
    }

    modal.focus();
    screen.render();
  }

  // ── Re-run wizard ────────────────────────────────────────────────────────

  function _rerunWizard() {
    // Clear setupCompleted flag so the Setup tab shows the wizard
    configService.set('setupCompleted', false);
    // Navigate to setup tab
    if (navigationService) {
      navigationService.switchTab('setup');
    }
  }

  // ── Refresh display ──────────────────────────────────────────────────────

  function refreshDisplay() {
    _refreshValues();
    _highlightRow(_selectedIdx);
  }

  // ── Tab Component Contract ───────────────────────────────────────────────

  function show() {
    refreshDisplay();
    box.show();
    box.focus();
    screen.render();
  }

  function hide() {
    box.hide();
  }

  function onFocus() {
    if (_selectedIdx < 0) _selectedIdx = 0;
    refreshDisplay();
    box.focus();
  }

  function onBlur() {}

  function getFooterText() {
    return FOOTER_TEXT;
  }

  function getFooterColor() {
    return COLORS.footerBg;
  }

  return { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor };
}
