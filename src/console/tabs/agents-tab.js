/**
 * AgentVibes TUI Console — Agents Tab (BMAD Integration)
 *
 * Implements the Tab Component Contract:
 *   createAgentsTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Two states:
 *   1. No BMAD detected → onboarding screen with description, links, install command
 *   2. BMAD detected → agent table with per-agent voice/pretext/reverb/personality/music customization
 */

import { AgentVoiceStore, scanBmadAgents, isBmadDetected, isSingleVoiceProvider } from '../../services/agent-voice-store.js';
import { openReverbPicker, REVERB_PRESETS } from '../widgets/reverb-picker.js';
import { openPersonalityPicker, PERSONALITIES, PERSONALITY_EMOJIS } from '../widgets/personality-picker.js';
import { openTrackPicker, openVolumeInput } from '../widgets/track-picker.js';
import { formatReverbState, formatTrackName, formatVoiceName } from '../widgets/format-utils.js';
import {
  PIPER_VOICES_DIR, SAMPLE_PHRASES,
  parseMultiSpeaker, scanInstalledVoices, getVoiceMeta, genderIconTag,
  getFavorites, getThumbsDown, toggleThumbsUp, toggleThumbsDown,
} from './voices-tab.js';
import { buildAudioEnv, detectWavPlayer, detectRemoteLlm } from '../audio-env.js';
import { destroyList } from '../widgets/destroy-list.js';
import { BRAND_PINK } from '../brand-colors.js';
import { t } from '../../i18n/strings.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Max pretext length to prevent excessively long TTS utterances
const MAX_PRETEXT_LENGTH = 200;

/**
 * Attach a blinking █ cursor to a set of blessed buttons.
 * Works alongside existing focus/blur handlers (e.g. ►..◄ indicators).
 * While a spinner is active on a button, blink is paused for that button.
 * Returns { cleanup, startSpinner(btn, screen), stopSpinner(btn, screen) }.
 */
export function attachBtnBlink(btns, screen) {
  let _interval = null;
  let _on = true;
  let _active = null;
  let _spinning = null;  // button currently showing a spinner

  const _SPIN = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let _spinIdx = 0;
  let _spinInterval = null;

  // Store original label on each button at attach time — never derive from current content
  btns.forEach(btn => { btn._blinkBase = btn.content; });

  // Focused with indicator ch right after ►  e.g. ►█Preview◄ / ► Preview◄ (same width)
  function _focused(base, ch) { return `►${ch}${base}◄`; }

  function _tick() {
    if (!_active || _active === _spinning) return;
    _on = !_on;
    _active.setContent(_focused(_active._blinkBase, _on ? '█' : ' '));
    screen.render();
  }

  btns.forEach(btn => {
    btn.on('focus', () => {
      _active = btn;
      _on = true;
      if (btn !== _spinning) {
        btn.setContent(_focused(btn._blinkBase, '█'));
        screen.render();
      }
      if (!_interval) _interval = setInterval(_tick, 500);
    });
    btn.on('blur', () => {
      if (_active !== btn) return;
      _active = null;
      if (_interval) { clearInterval(_interval); _interval = null; _on = true; }
      if (btn !== _spinning) {
        btn.setContent(btn._blinkBase);
        screen.render();
      }
    });
  });

  function startSpinner(btn) {
    _spinning = btn;
    _spinIdx = 0;
    if (_spinInterval) clearInterval(_spinInterval);
    _spinInterval = setInterval(() => {
      _spinIdx = (_spinIdx + 1) % _SPIN.length;
      btn.setContent(_active === btn
        ? _focused(btn._blinkBase, _SPIN[_spinIdx])
        : `${_SPIN[_spinIdx]}${btn._blinkBase}`);
      screen.render();
    }, 80);
  }

  function stopSpinner(btn) {
    if (_spinInterval) { clearInterval(_spinInterval); _spinInterval = null; }
    _spinning = null;
    btn.setContent(_active === btn ? _focused(btn._blinkBase, '█') : btn._blinkBase);
    screen.render();
  }

  function cleanup() {
    if (_interval)    { clearInterval(_interval);    _interval    = null; }
    if (_spinInterval){ clearInterval(_spinInterval); _spinInterval = null; }
  }

  return { cleanup, startSpinner, stopSpinner };
}

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#7b1fa2',
  labelFg:    '#e3f2fd',
  valueFg:    '#ffff00',

  btnDefault: '#6a1b9a',
  btnFocus:   '#2e7d32',  // Green — focused/selected
  btnFocusFg: '#ffffff',
  btnPress:   '#ff00ff',
  borderFg:   '#9c27b0',
  footerBg:   '#9c27b0',
  noticeFg:   '#90a4ae',
  warnFg:     '#ff9800',
  linkFg:     'bright-cyan',
};

const _FOOTER_BMAD_EN   = '[↑↓/jk] Navigate  [Space] Preview  [Enter] Configure  [A] Auto-assign  [B] Bulk  [X] Reset  [Q] Quit';
const _FOOTER_NOBMAD_EN = '[Tab] Switch Tab  [Q] Quit';

const _modalTitle = (text) => ` {${BRAND_PINK}-fg}${text}{/${BRAND_PINK}-fg} `;

// Column widths for agent table
const COL_ICON     = 4;
const COL_NAME     = 16;
const COL_VOICE    = 12;  // beautified names avg 5-11 chars
const COL_GENDER   = 8;
const COL_PROVIDER = 12;
const COL_PRETEXT  = 14;
const COL_REVERB   = 10;
const COL_MUSIC    = 11;
const COL_VOL      = 5;   // e.g. "70%" or "100%"

// Inline hint appended to the selected row when list is focused
const _ROW_HINT_BMAD = `  {white-fg}[Space] Preview  [Enter] Configure{/white-fg}`;

// ---------------------------------------------------------------------------

function createTestStub() {
  return {
    box: {},
    show: () => {},
    hide: () => {},
    onFocus: () => {},
    onBlur: () => {},
    getFooterText: () => _FOOTER_BMAD_EN,
    getFooterColor: () => COLORS.footerBg,
  };
}

// ---------------------------------------------------------------------------

/**
 * Create the Agents tab component.
 */
export function createAgentsTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService, focusMainTabBar, navigationService, languageService } = services;
  const _tl = (key) => languageService ? languageService.t(key) : t('en', key);

  function _buildOnboardingText() {
    return `{bold}{#ce93d8-fg}${_tl('bmadTitle')}{/#ce93d8-fg}{/bold}

{bold}${_tl('bmadWhatIsHeader')}{/bold}

${_tl('bmadDesc')}


{bold}${_tl('bmadInstallHeader')}{/bold}

  {bright-cyan-fg}npx bmad-method install{/bright-cyan-fg}


{bold}${_tl('bmadLearnMoreHeader')}{/bold}

  {bright-cyan-fg}https://docs.bmad-method.org/{/bright-cyan-fg}
  {bright-cyan-fg}https://github.com/bmad-code-org/BMAD-METHOD{/bright-cyan-fg}


{#90a4ae-fg}${_tl('bmadInstalledNote')}{/#90a4ae-fg}`;
  }
  const voiceStore = new AgentVoiceStore();

  // Capture cwd once at construction (L1 fix)
  const _projectRoot = process.cwd();

  let _bmadDetected = false;
  let _agents = [];
  let _playingProcess = null;
  let _playGeneration = 0; // H4: generation counter to prevent orphaned processes

  /**
   * Create a secure temp file path using XDG_RUNTIME_DIR or user-specific dir (H3 fix).
   */
  function _secureTempWav(prefix) {
    const baseDir = process.env.XDG_RUNTIME_DIR || os.tmpdir();
    const dir = path.join(baseDir, `agentvibes-${process.getuid?.() ?? 'u'}`);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try { fs.chmodSync(dir, 0o700); } catch {}
    return path.join(dir, `${prefix}-${crypto.randomUUID()}.wav`);
  }

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
  // Onboarding content (no-BMAD state)

  const onboardingBox = blessed.box({
    parent: box,
    top: 1,
    left: 3,
    right: 3,
    bottom: 1,
    hidden: true,
    tags: true,
    scrollable: true,
    keys: true,
    vi: true,
    mouse: true,
    content: _buildOnboardingText(),
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  onboardingBox.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
  });

  // -------------------------------------------------------------------------
  // BMAD state — section header

  const sectionHeader = blessed.text({
    parent: box,
    top: 1,
    left: 2,
    hidden: true,
    content: `{#7b1fa2-fg}── BMAD Agents ${'─'.repeat(53)}{/#7b1fa2-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // Column header
  const columnHeader = blessed.text({
    parent: box,
    top: 2,
    left: 4,
    hidden: true,
    tags: true,
    content: `{#90a4ae-fg}${''.padEnd(COL_ICON)}${' Agent'.padEnd(COL_NAME)}${' Voice'.padEnd(COL_VOICE)}${' Gender'.padEnd(COL_GENDER)}${' Provider'.padEnd(COL_PROVIDER)}${' Reverb'.padEnd(COL_REVERB)}${' Music'.padEnd(COL_MUSIC)}${' Vol'.padEnd(COL_VOL)}  Pretext{/#90a4ae-fg}`,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Agent list

  const agentList = blessed.list({
    parent: box,
    top: 3,
    left: 2,
    width: '96%',
    height: '55%',
    hidden: true,
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: 'line' },
    scrollbar: { ch: '│', style: { fg: COLORS.sectionHdr } },
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
      selected: { bg: 'blue', fg: 'yellow' },
      item: { fg: COLORS.labelFg },
    },
  });

  // -------------------------------------------------------------------------
  // Status panel

  const statusDivider = blessed.text({
    parent: box,
    top: '64%',
    left: 2,
    hidden: true,
    content: `{#7b1fa2-fg}── Status ${'─'.repeat(58)}{/#7b1fa2-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const statusLine = blessed.text({
    parent: box,
    top: '69%',
    left: 2,
    hidden: true,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const warningLine = blessed.text({
    parent: box,
    top: '74%',
    left: 2,
    hidden: true,
    tags: true,
    content: '',
    style: { fg: COLORS.warnFg, bg: COLORS.contentBg },
  });

  // Hint shown inline next to the action buttons at bottom of list
  const hintLine = blessed.text({
    parent: box,
    bottom: 5,
    left: 4,
    hidden: true,
    tags: true,
    content: '{#546e7a-fg}[Space] Preview  [Enter] Configure  [X] Reset  [A] Auto-assign  [B] Bulk Edit{/#546e7a-fg}',
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Buttons

  function _createBtn(label, onClick) {
    const btn = blessed.button({
      parent: box,
      content: label,
      mouse: true,
      keys: true,
      shrink: true,
      hidden: true,
      padding: { left: 1, right: 1 },
      style: {
        bg: COLORS.btnDefault,
        fg: 'bright-white',
        focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      },
    });
    btn.on('focus', () => {
      const raw = btn.content.replace(/[►◄]/g, '').trim();
      btn.setContent(`►${raw}◄`);
      screen.render();
    });
    btn.on('blur', () => {
      const raw = btn.content.replace(/[►◄]/g, '').trim();
      btn.setContent(raw);
      screen.render();
    });
    btn.key(['enter', 'space'], () => {
      btn.style.bg = COLORS.btnPress;
      screen.render();
      setTimeout(() => {
        btn.style.bg = COLORS.btnDefault;
        screen.render();
        onClick();
      }, 150);
    });
    btn.on('click', () => btn.press());
    btn.on('mouseover', () => btn.focus());
    return btn;
  }

  const resetBtn = _createBtn('[X] Reset', () => {
    const agent = _agents[agentList.selected ?? 0];
    if (agent) {
      voiceStore.resetAgentProfile(agent.id);
      refreshDisplay();
    }
  });
  resetBtn.bottom = 4;
  resetBtn.left = 4;

  const autoAssignBtn = _createBtn('[A] Auto-assign', () => _autoAssignAll());
  autoAssignBtn.bottom = 4;
  autoAssignBtn.left = 18;

  const bulkEditBtn = _createBtn('[B] Bulk Edit', () => _openBulkEditMenu());
  bulkEditBtn.bottom = 4;
  bulkEditBtn.left = 36;

  // -------------------------------------------------------------------------
  // Show/hide helpers for the two states

  const _bmadWidgets = [sectionHeader, columnHeader, agentList, hintLine, resetBtn, autoAssignBtn, bulkEditBtn];

  function _showBmadState() {
    onboardingBox.hide();
    for (const w of _bmadWidgets) w.show();
  }

  function _showOnboardingState() {
    for (const w of _bmadWidgets) w.hide();
    onboardingBox.show();
  }

  // -------------------------------------------------------------------------
  // Build table row items

  function _buildListItems(agents) {
    if (agents.length === 0) {
      return [' (no BMAD agents detected)'];
    }
    return agents.map(a => {
      const profile = voiceStore.getAgentProfile(a.id);
      // Strip variation selectors (e.g. U+FE0F on 🏗️) so padEnd uses visual width
      const rawIcon = (a.icon || '').replace(/\uFE0F/g, '');
      const icon = (rawIcon ? `${rawIcon} ` : '   ').padEnd(COL_ICON);
      const name = ` ${a.displayName}`.padEnd(COL_NAME).slice(0, COL_NAME);
      const voiceRaw = formatVoiceName(profile.voice);
      const voice = (' ' + voiceRaw).padEnd(COL_VOICE).slice(0, COL_VOICE);
      const meta = profile.voice ? getVoiceMeta(profile.voice) : { gender: '—', provider: '—' };
      const gender = (' ' + meta.gender).padEnd(COL_GENDER).slice(0, COL_GENDER);
      const provider = (' ' + meta.provider).padEnd(COL_PROVIDER).slice(0, COL_PROVIDER);
      const reverb = (' ' + (profile.reverbPreset || '(global)')).padEnd(COL_REVERB).slice(0, COL_REVERB);
      const music = (' ' + (profile.backgroundMusic?.track
        ? formatTrackName(profile.backgroundMusic.track)
        : '(global)')).padEnd(COL_MUSIC).slice(0, COL_MUSIC);
      const vol = profile.backgroundMusic?.enabled
        ? ` ${profile.backgroundMusic.volume ?? 20}%`.padEnd(COL_VOL)
        : '  —  ';
      const pretext = ' ' + (profile.pretext || '(default)').slice(0, COL_PRETEXT - 1);
      return ` ${icon}${name}${voice}${gender}${provider}${reverb}${music}${vol}  ${pretext}`;
    });
  }

  // -------------------------------------------------------------------------
  // Refresh display

  function refreshDisplay() {
    _bmadDetected = isBmadDetected(_projectRoot);
    _agents = scanBmadAgents(_projectRoot);

    if (!_bmadDetected) {
      _showOnboardingState();
      screen.render();
      return;
    }

    _showBmadState();

    const items = _buildListItems(_agents);
    agentList.setItems(items);

    if (_listFocused) {
      _hintIdx = -1;
      _hintBase = '';
      _updateHint(agentList.selected ?? 0);
    }

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Temporary "Saved!" toast notification

  function _showSavedToast(agentName) {
    const toast = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 34,
      height: 3,
      border: { type: 'line' },
      tags: true,
      content: `  {green-fg}{bold}✓ ${agentName} saved!{/bold}{/green-fg}`,
      style: { fg: '#e3f2fd', bg: '#1b5e20', border: { fg: '#4caf50' } },
    });
    toast.setFront();
    screen.render();
    setTimeout(() => {
      toast.destroy();
      try {
        for (let r = 0; r < screen.height; r++)
          for (let c = 0; c < screen.width; c++)
            if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
      } catch {}
      screen.render();
    }, 1500);
  }

  // -------------------------------------------------------------------------
  // Row spinner (animated braille while preview is playing)

  const _SPIN_PFX = '{bright-cyan-fg}';
  const _SPIN_SFX = '{/bright-cyan-fg}';
  const _SPIN_PFX_TOTAL_LEN = _SPIN_PFX.length + 1 + _SPIN_SFX.length; // tag + 1 frame char + close tag
  const _SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let _spinnerInterval  = null;
  let _spinnerFrameIdx  = 0;
  let _spinnerAgentIdx  = -1;

  // Strip the spinner prefix (tag+frame+close or plain first char) to get the row tail.
  function _stripSpinnerPfx(c) {
    return c.startsWith(_SPIN_PFX) ? c.slice(_SPIN_PFX_TOTAL_LEN) : c.slice(1);
  }

  function _startSpinner(agentIdx) {
    _stopSpinner();
    _spinnerAgentIdx = agentIdx;
    _spinnerFrameIdx = 0;
    const items = agentList.items;
    const item = items[_spinnerAgentIdx];
    if (item) {
      item.setContent(`${_SPIN_PFX}${_SPIN_FRAMES[0]}${_SPIN_SFX}${_stripSpinnerPfx(item.content ?? ' ')}`);
      screen.render();
    }
    _spinnerInterval = setInterval(() => {
      _spinnerFrameIdx = (_spinnerFrameIdx + 1) % _SPIN_FRAMES.length;
      const it = agentList.items[_spinnerAgentIdx];
      if (!it) return;
      it.setContent(`${_SPIN_PFX}${_SPIN_FRAMES[_spinnerFrameIdx]}${_SPIN_SFX}${_stripSpinnerPfx(it.content ?? ' ')}`);
      screen.render();
    }, 80);
  }

  function _stopSpinner() {
    if (_spinnerInterval) { clearInterval(_spinnerInterval); _spinnerInterval = null; }
    if (_spinnerAgentIdx >= 0) {
      const item = agentList.items[_spinnerAgentIdx];
      if (item) item.setContent(' ' + _stripSpinnerPfx(item.content ?? ' '));
      _spinnerAgentIdx = -1;
      screen.render();
    }
  }

  // -------------------------------------------------------------------------
  // Kill any playing preview

  function _killPreview() {
    _stopSpinner();
    if (_playingProcess) {
      try {
        // On Windows, negative-PID process group kill is unsupported
        if (process.platform === 'win32') {
          _playingProcess.kill();
        } else {
          process.kill(-_playingProcess.pid, 'SIGTERM');
        }
      } catch {}
      _playingProcess = null;
    }
  }

  // -------------------------------------------------------------------------
  // Sample an agent with their full profile (voice + pretext + reverb + music)
  // Uses play-tts-enhanced.sh for the complete effects pipeline.

  function _sampleAgent(agent) {
    const profile = voiceStore.getAgentProfile(agent.id);
    const globalCfg = configService.getConfig();
    _sampleWithFullProfile(agent, {
      voice:           profile.voice         || globalCfg.voice || '',
      pretext:         profile.pretext       || AgentVoiceStore.getDefaultPretext(agent.displayName, agent.title),
      reverbPreset:    profile.reverbPreset  || globalCfg.effects?.reverbPreset || 'light',
      personality:     profile.personality   || globalCfg.personality || 'none',
      backgroundMusic: {
        track:   profile.backgroundMusic?.track   || globalCfg.backgroundMusic?.track || '',
        volume:  profile.backgroundMusic?.volume  ?? globalCfg.backgroundMusic?.volume ?? 20,
        enabled: profile.backgroundMusic?.enabled ?? globalCfg.backgroundMusic?.enabled ?? false,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Agent detail panel (modal overlay)

  function _openAgentDetailPanel(agent) {
    const profile = voiceStore.getAgentProfile(agent.id);
    const globalCfg = configService.getConfig();

    // Working copy of the profile being edited
    const draft = {
      voice:           profile.voice         || globalCfg.voice || '',
      pretext:         profile.pretext       || AgentVoiceStore.getDefaultPretext(agent.displayName, agent.title),
      reverbPreset:    profile.reverbPreset  || globalCfg.effects?.reverbPreset || 'light',
      personality:     profile.personality   || globalCfg.personality || 'none',
      backgroundMusic: {
        track:   profile.backgroundMusic?.track   || globalCfg.backgroundMusic?.track || '',
        volume:  profile.backgroundMusic?.volume  ?? globalCfg.backgroundMusic?.volume ?? 20,
        enabled: profile.backgroundMusic?.enabled ?? globalCfg.backgroundMusic?.enabled ?? false,
      },
    };

    let _closed = false;
    navigationService?.openModal(null, _closeModal);

    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 19,
      border: { type: 'line' },
      tags: true,
      label: _modalTitle(`${agent.icon || '🧙'} ${agent.displayName} (${agent.title || 'Agent'})`),
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: COLORS.btnFocus },
      },
    });
    modal.setFront();

    // Field definitions
    const FIELDS = [
      { key: 'voice',        label: 'Voice',       getValue: () => draft.voice || '(global default)' },
      { key: 'pretext',      label: 'Pretext',     getValue: () => draft.pretext || '(default)' },
      { key: 'reverbPreset', label: 'Audio Effects', getValue: () => formatReverbState(draft.reverbPreset) },
      { key: 'personality',  label: 'Personality', getValue: () => {
        const p = draft.personality;
        const emoji = PERSONALITY_EMOJIS[p] || '';
        return `${emoji} ${p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}`;
      }},
      { key: 'musicTrack',   label: 'Music Track', getValue: () => {
        if (!draft.backgroundMusic.enabled) return '(disabled)';
        return formatTrackName(draft.backgroundMusic.track) || '(none)';
      }},
      { key: 'musicVol',    label: 'Music Vol',   getValue: () => {
        if (!draft.backgroundMusic.enabled) return '(disabled)';
        return `${draft.backgroundMusic.volume ?? 20}%`;
      }},
    ];

    // Build field list items
    function _fieldItems() {
      return FIELDS.map(f => {
        const label = f.label.padEnd(14);
        const val = f.getValue();
        return `  ${label} ${val}`;
      });
    }

    const fieldList = blessed.list({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: FIELDS.length + 2,
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      tags: true,
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: '#4a148c' },
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
      content: '{white-fg}[↑↓] Navigate  [Enter] Edit  [Tab] → Buttons  [Esc] Close{/white-fg}',
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
          bg: COLORS.btnDefault,
          fg: 'bright-white',
          focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
          hover: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
        },
      });
      // Focus indicator handled by attachBtnBlink
      btn.key(['enter', 'space'], () => onClick());
      btn.on('click', () => onClick());
      return btn;
    }

    const previewBtn = _modalBtn('Preview', 4, () => {
      _sampleAgentWithDraft({ ...agent }, draft, () => {
        btnBlink.stopSpinner(previewBtn);
      });
      btnBlink.startSpinner(previewBtn);
    });

    // Auto-save the current draft (called after every field change).
    // Only persists fields that differ from the global defaults — same logic
    // the explicit Save button used to use, just triggered automatically.
    function _autoSaveAgent() {
      const toSave = {};
      if (draft.voice && draft.voice !== globalCfg.voice) toSave.voice = draft.voice;
      if (draft.pretext !== AgentVoiceStore.getDefaultPretext(agent.displayName, agent.title)) toSave.pretext = draft.pretext;
      if (draft.reverbPreset !== (globalCfg.effects?.reverbPreset || 'light')) toSave.reverbPreset = draft.reverbPreset;
      if (draft.personality !== (globalCfg.personality || 'none')) toSave.personality = draft.personality;
      if (draft.backgroundMusic.track !== (globalCfg.backgroundMusic?.track || '') ||
          draft.backgroundMusic.volume !== (globalCfg.backgroundMusic?.volume ?? 20) ||
          draft.backgroundMusic.enabled !== (globalCfg.backgroundMusic?.enabled ?? false)) {
        toSave.backgroundMusic = draft.backgroundMusic;
      }
      voiceStore.setAgentProfile(agent.id, toSave);
      refreshDisplay();
      _showSavedToast(agent.displayName);
    }

    const resetBtn = _modalBtn('Reset to Defaults', 18, () => {
      voiceStore.resetAgentProfile(agent.id);
      _closeModal();
      refreshDisplay();
    });

    const saveBtn = _modalBtn('Save', 41, () => { try { _autoSaveAgent(); } catch {} _closeModal(); });

    const closeBtn = _modalBtn('Close', 50, _closeModal);

    // Blinking █ cursor + preview spinner — reusable across all modal buttons
    const btnBlink = attachBtnBlink([previewBtn, resetBtn, saveBtn, closeBtn], screen);

    function _closeModal() {
      if (_closed) return;
      _closed = true;
      _killPreview();
      btnBlink.cleanup();
      navigationService?.closeModal();
      destroyList(modal, screen);
      agentList.focus();
      screen.render();
    }

    // Field editing via Enter
    fieldList.key(['enter'], () => {
      const idx = fieldList.selected;
      const field = FIELDS[idx];
      if (!field) return;

      switch (field.key) {
        case 'voice':
          _openVoicePickerForAgent(agent, draft, () => {
            _autoSaveAgent();
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          });
          break;

        case 'pretext':
          _openPretextEditor(modal, draft, () => {
            _autoSaveAgent();
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          });
          break;

        case 'reverbPreset':
          openReverbPicker(screen, draft.reverbPreset, (val) => {
            draft.reverbPreset = val;
            _autoSaveAgent();
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          }, () => {
            fieldList.focus();
            screen.render();
          }, { applyToEffectsManager: false });
          break;

        case 'personality':
          openPersonalityPicker(screen, draft.personality, (val) => {
            draft.personality = val;
            _autoSaveAgent();
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          }, () => {
            fieldList.focus();
            screen.render();
          });
          break;

        case 'musicTrack':
          openTrackPicker(screen, draft.backgroundMusic.track, draft.backgroundMusic.volume, (track) => {
            draft.backgroundMusic.track = track;
            draft.backgroundMusic.enabled = true;
            _autoSaveAgent();
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          }, () => {
            fieldList.focus();
            screen.render();
          }, { skipVolume: true });
          break;

        case 'musicVol':
          openVolumeInput(screen, draft.backgroundMusic.volume, (volume) => {
            draft.backgroundMusic.volume = volume;
            if (draft.backgroundMusic.track) draft.backgroundMusic.enabled = true;
            _autoSaveAgent();
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          }, () => {
            fieldList.focus();
            screen.render();
          });
          break;
      }
    });

    // Space = sample with current draft
    fieldList.key(['space'], () => {
      const draftAgent = { ...agent };
      // Temporarily set profile for sampling
      _sampleAgentWithDraft(draftAgent, draft);
    });

    // Escape = close
    fieldList.key(['escape', 'q', 'Q'], _closeModal);
    previewBtn.key(['escape', 'q', 'Q'], _closeModal);
    resetBtn.key(['escape', 'q', 'Q'], _closeModal);
    saveBtn.key(['escape', 'q', 'Q'], _closeModal);
    closeBtn.key(['escape', 'q', 'Q'], _closeModal);

    // Tab + arrow navigation within modal
    fieldList.key(['tab'], () => { previewBtn.focus(); screen.render(); });

    // Wrap: down on last field → focus first button; up on first field → focus first button
    // One extra arrow press at boundary moves to button row.
    // Track previous selection so arriving at boundary doesn't immediately jump.
    let _prevFieldSel = 0;
    fieldList.key(['down'], () => {
      const cur = fieldList.selected ?? 0;
      if (cur === FIELDS.length - 1 && _prevFieldSel === FIELDS.length - 1) {
        previewBtn.focus(); screen.render();
      }
      _prevFieldSel = cur;
    });
    fieldList.key(['up'], () => {
      const cur = fieldList.selected ?? 0;
      if (cur === 0 && _prevFieldSel === 0) {
        previewBtn.focus(); screen.render();
      }
      _prevFieldSel = cur;
    });

    // Wrap: up on buttons → back to field list
    previewBtn.key(['up'], () => { fieldList.focus(); fieldList.select(FIELDS.length - 1); screen.render(); });
    resetBtn.key(['up'], () => { fieldList.focus(); fieldList.select(FIELDS.length - 1); screen.render(); });
    saveBtn.key(['up'], () => { fieldList.focus(); fieldList.select(FIELDS.length - 1); screen.render(); });
    closeBtn.key(['up'], () => { fieldList.focus(); fieldList.select(FIELDS.length - 1); screen.render(); });

    previewBtn.key(['tab', 'right'], () => { resetBtn.focus(); screen.render(); });
    previewBtn.key(['left'], () => { closeBtn.focus(); screen.render(); });

    resetBtn.key(['tab', 'right'], () => { saveBtn.focus(); screen.render(); });
    resetBtn.key(['left'], () => { previewBtn.focus(); screen.render(); });

    saveBtn.key(['tab', 'right'], () => { closeBtn.focus(); screen.render(); });
    saveBtn.key(['left'], () => { resetBtn.focus(); screen.render(); });

    closeBtn.key(['tab', 'right'], () => { fieldList.focus(); screen.render(); });
    closeBtn.key(['left'], () => { saveBtn.focus(); screen.render(); });

    fieldList.focus();
    try {
      for (let r = 0; r < screen.height; r++)
        for (let c = 0; c < screen.width; c++)
          if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
    } catch {}
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Voice picker for agent detail panel

  function _openVoicePickerForAgent(agent, draft, onDone) {
    let _allVoices = [];
    let _previewProc = null;
    let _previewVoiceId = null;
    let _previewMinTimer = null;
    let _vpClosed = false;

    const _spawnEnv = buildAudioEnv();

    function _killVP() {
      if (_previewMinTimer) { clearTimeout(_previewMinTimer); _previewMinTimer = null; }
      if (_previewProc) {
        try {
          if (process.platform === 'win32') {
            _previewProc.kill();
          } else {
            process.kill(-_previewProc.pid, 'SIGTERM');
          }
        } catch {}
        _previewProc = null;
      }
      _previewVoiceId = null;
    }

    function _closeVP() {
      if (_vpClosed) return;
      _vpClosed = true;
      _killVP();
      destroyList(vpModal, screen, onDone);
    }

    const vpModal = blessed.box({
      parent: screen,
      top: '6%',
      left: '3%',
      width: '94%',
      height: '88%',
      border: { type: 'line' },
      tags: true,
      label: _modalTitle(`Select Voice for ${agent.icon || ''} ${agent.displayName}`),
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: 'bright-cyan' },
      },
    });
    vpModal.setFront();

    // Column header
    const COL_N = 30;
    const COL_G = 4;
    blessed.text({
      parent: vpModal, top: 1, left: 6, tags: true,
      content: `{bright-cyan-fg}${'Name'.padEnd(COL_N)}{/bright-cyan-fg}{magenta-fg}♀{/magenta-fg}/{bright-cyan-fg}♂{/bright-cyan-fg} {bright-cyan-fg}Provider{/bright-cyan-fg}`,
      style: { bg: COLORS.contentBg },
    });

    const vpList = blessed.list({
      parent: vpModal, top: 2, left: 2, right: 2, bottom: 5,
      keys: true, vi: true, mouse: true,
      tags: true,
      border: { type: 'line' },
      scrollbar: { ch: '│', style: { fg: COLORS.borderFg } },
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: COLORS.borderFg },
        selected: { bg: '#2e7d32', fg: '#ffffff', bold: true },
        item: { fg: COLORS.labelFg },
      },
    });

    const vpPreviewLine = blessed.text({
      parent: vpModal, bottom: 4, left: 2, right: 2, height: 1, tags: true,
      content: '', style: { fg: 'bright-cyan', bg: COLORS.contentBg },
    });

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
      if (_previewMinTimer) { clearTimeout(_previewMinTimer); _previewMinTimer = null; }

      const phrase = `Hi, my name is ${getVoiceMeta(voiceId).displayName}.`;
      const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;

      if (_isWin) {
        // Windows: route through play-tts.ps1 (same pattern as non-Windows bash route)
        const playTtsScript = path.join(_projectRoot, '.claude', 'hooks-windows', 'play-tts.ps1');
        if (!fs.existsSync(playTtsScript)) return;
        _previewVoiceId = voiceId;
        if (!_vpClosed) { vpPreviewLine.setContent(`{bright-cyan-fg}♪ Playing: ${voiceId}...{/bright-cyan-fg}`); _refreshVP(); }
        _previewProc = spawn('powershell', [ // NOSONAR
          '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', playTtsScript, phrase, voiceId,
        ], { stdio: 'ignore', detached: false, windowsHide: true, env: _spawnEnv });
        _previewProc.on('exit', () => {
          if (_previewVoiceId === voiceId) { _previewVoiceId = null; _previewProc = null; if (!_vpClosed) { vpPreviewLine.setContent(''); _refreshVP(); } }
        });
        _previewProc.on('error', () => { _previewProc = null; _previewVoiceId = null; });
        return;
      }

      // Non-Windows: use bash play-tts.sh
      const playTtsScript = path.join(_projectRoot, '.claude', 'hooks', 'play-tts.sh');
      if (!fs.existsSync(playTtsScript)) return;

      const remoteLlm = detectRemoteLlm();
      const args = [playTtsScript, phrase, voiceId];
      if (remoteLlm) args.push('--llm', remoteLlm);

      _previewProc = spawn('bash', args, { // NOSONAR
        stdio: 'ignore', detached: true,
        env: { ..._spawnEnv, CLAUDE_PROJECT_DIR: _projectRoot },
        cwd: _projectRoot,
      });
      _previewVoiceId = voiceId;
      if (!_vpClosed) { vpPreviewLine.setContent(`{bright-cyan-fg}♪ Playing: ${voiceId}...{/bright-cyan-fg}`); _refreshVP(); }

      const _clearAfterMinDisplay = () => {
        if (_previewVoiceId === voiceId) {
          _previewVoiceId = null; _previewProc = null;
          if (!_vpClosed) { vpPreviewLine.setContent(''); _refreshVP(); }
        }
        _previewMinTimer = null;
      };
      // Keep indicator visible for at least 2s (ssh-remote exits immediately)
      _previewProc.on('exit', () => { _previewMinTimer = setTimeout(_clearAfterMinDisplay, 2000); });
      _previewProc.on('error', () => { _previewMinTimer = setTimeout(_clearAfterMinDisplay, 2000); });
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

  // -------------------------------------------------------------------------
  // Pretext inline editor

  function _openPretextEditor(parentModal, draft, onDone) {
    const editModal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 8,
      border: { type: 'line' },
      tags: true,
      label: _modalTitle('Edit Pretext'),
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'bright-cyan' } },
    });
    editModal.setFront();

    blessed.text({
      parent: editModal, top: 1, left: 2,
      content: 'Agent pretext (spoken before each TTS message):',
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    });

    const inputBox = blessed.textbox({
      parent: editModal, top: 3, left: 2, right: 2, height: 3,
      border: { type: 'line' },
      style: {
        fg: COLORS.valueFg, bg: '#0d1b35',
        border: { fg: COLORS.borderFg },
        focus: { border: { fg: 'bright-cyan' } },
      },
    });

    let _editClosed = false;
    let _cursor = draft.pretext.length;
    inputBox.value = draft.pretext;

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
        // M7: enforce max pretext length; allow clearing to empty string
        draft.pretext = inputBox.value.trim().slice(0, MAX_PRETEXT_LENGTH);
      }
      destroyList(editModal, screen, onDone);
    }

    // Guard: if editModal is destroyed externally (parent closed, signal, etc.)
    // without _closeEdit being called, restore grab state so TUI stays responsive.
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

  // -------------------------------------------------------------------------
  // Sample agent with a draft profile (no save) — same full pipeline

  function _sampleAgentWithDraft(agent, draft, onComplete) {
    _sampleWithFullProfile(agent, draft, onComplete);
  }

  // -------------------------------------------------------------------------
  // Shared: sample with full profile via play-tts-enhanced.sh
  // Writes a temp agent profile JSON, then calls the enhanced TTS pipeline
  // which applies voice + reverb + background music.

  function _sampleWithFullProfile(agent, profile, onComplete) {
    _killPreview();
    const gen = ++_playGeneration;

    // Start spinner on the agent's row in the list
    const agentIdx = _agents.findIndex(a => a.id === agent.id);
    if (agentIdx >= 0) _startSpinner(agentIdx);

    const voiceId = profile.voice || '';
    const pretext = profile.pretext || AgentVoiceStore.getDefaultPretext(agent.displayName, agent.title);
    const phrase = `${pretext} ${SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)]}`; // NOSONAR

    const isWindows = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;

    if (isWindows) {
      // On Windows, call play-tts.ps1 via PowerShell with draft settings patched
      // in so reverb, background music, and personality are applied.
      _sampleWithFullEffectsWindows(gen, agent, profile, phrase, onComplete);
    } else {
      // On Linux/macOS/WSL, use play-tts.sh
      const _spawnEnv = buildAudioEnv();
      const scriptDir = path.join(_projectRoot, '.claude', 'hooks');
      const plainScript = path.join(scriptDir, 'play-tts.sh');
      const remoteLlm = detectRemoteLlm();
      const args = [plainScript, phrase];
      if (voiceId) args.push(voiceId);
      if (remoteLlm) args.push('--llm', remoteLlm);

      const proc = spawn('bash', args, { // NOSONAR
        stdio: ['ignore', 'ignore', 'ignore'],
        detached: true,
        env: { ..._spawnEnv },
        cwd: _projectRoot,
      });
      _playingProcess = proc;

      proc.on('exit', () => {
        if (gen === _playGeneration) { _playingProcess = null; _stopSpinner(); }
      });
      proc.on('error', () => {
        if (gen === _playGeneration) { _playingProcess = null; _stopSpinner(); }
      });
    }
  }

  /** Windows-native sample: piper.exe → wav → detectWavPlayer */
  function _sampleWithPiperDirect(gen, voiceId, phrase) {
    const _spawnEnv = buildAudioEnv();

    // Resolve piper binary
    let piperBin = 'piper';
    const localAppData = process.env.LOCALAPPDATA ||
      (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
    if (localAppData) {
      const exePath = path.join(localAppData, 'Programs', 'Piper', 'piper.exe');
      if (fs.existsSync(exePath)) piperBin = exePath;
    }

    // Resolve voice model path
    const ms = parseMultiSpeaker(voiceId);
    const voicePath = path.resolve(PIPER_VOICES_DIR, ms.model + '.onnx');
    const safeBase = path.resolve(PIPER_VOICES_DIR);
    if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) {
      _stopSpinner();
      return;
    }

    const tempWav = path.join(os.tmpdir(), `agentvibes-agent-preview-${Date.now()}.wav`);
    const piperArgs = ['--model', voicePath, '--output_file', tempWav];
    if (ms.speakerId != null) piperArgs.push('--speaker', String(ms.speakerId));

    const piper = spawn(piperBin, piperArgs, {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached: false,
      windowsHide: true,
      env: _spawnEnv,
    });
    piper.stdin.write(phrase + '\n');
    piper.stdin.end();
    _playingProcess = piper;

    piper.on('exit', (code) => {
      if (gen !== _playGeneration) {
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }
      if (code !== 0) {
        _playingProcess = null;
        _stopSpinner();
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }

      // Play the synthesized wav
      const wavPlayer = detectWavPlayer(_spawnEnv);
      if (!wavPlayer) {
        _playingProcess = null;
        _stopSpinner();
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }
      const playProc = spawn(wavPlayer.bin, wavPlayer.args(tempWav), {
        stdio: 'ignore',
        detached: false,
        windowsHide: true,
        env: _spawnEnv,
      });
      _playingProcess = playProc;

      playProc.on('exit', () => {
        if (gen === _playGeneration) { _playingProcess = null; _stopSpinner(); }
        try { fs.unlinkSync(tempWav); } catch {}
      });
      playProc.on('error', () => {
        if (gen === _playGeneration) { _playingProcess = null; _stopSpinner(); }
        try { fs.unlinkSync(tempWav); } catch {}
      });
    });

    piper.on('error', () => {
      if (gen === _playGeneration) { _playingProcess = null; _stopSpinner(); }
    });
  }

  /** Windows full-effects preview: temporarily patches personality/reverb, passes music via env vars */
  function _sampleWithFullEffectsWindows(gen, agent, profile, phrase, onComplete) {
    const _spawnEnv = buildAudioEnv();
    const homeDir = process.env.USERPROFILE || os.homedir();
    // Use project-local .claude if it exists, else global ~/.claude
    const claudeDir = fs.existsSync(path.join(_projectRoot, '.claude'))
      ? path.join(_projectRoot, '.claude')
      : path.join(homeDir, '.claude');
    const configDir = path.join(claudeDir, 'config');
    const hooksDir  = path.join(claudeDir, 'hooks-windows');
    const playTts   = path.join(hooksDir, 'play-tts.ps1');
    if (!fs.existsSync(playTts)) { _sampleWithPiperDirect(gen, profile.voice || '', phrase); return; }

    const personalityFile = path.join(configDir, 'personality.txt');
    const reverbFile      = path.join(configDir, 'reverb-level.txt');

    const _read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
    const origPersonality = _read(personalityFile);
    const origReverb      = _read(reverbFile);

    const bgMusic = profile.backgroundMusic;

    // Build spawn env — pass per-agent music via AGENTVIBES_OVERRIDE_* env vars.
    // play-tts.ps1 reads these directly and forces BgEnabled=true when set,
    // so no config file patching is needed for background music.
    const spawnEnv = { ..._spawnEnv, AGENTVIBES_AGENT_NAME: agent.id, CLAUDE_PROJECT_DIR: _projectRoot };
    if (bgMusic?.enabled && bgMusic?.track) {
      const vol = ((bgMusic.volume ?? 20) / 100).toFixed(2);
      spawnEnv.AGENTVIBES_OVERRIDE_MUSIC  = bgMusic.track;
      spawnEnv.AGENTVIBES_OVERRIDE_VOLUME = vol;
    }

    try {
      if (profile.personality && profile.personality !== 'none')
        fs.writeFileSync(personalityFile, profile.personality);
      if (profile.reverbPreset)
        fs.writeFileSync(reverbFile, profile.reverbPreset);
    } catch { /* degrade gracefully */ }

    const voiceId = profile.voice || '';
    const psArgs  = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', playTts, phrase];
    if (voiceId) psArgs.push(voiceId);

    const proc = spawn('powershell', psArgs, { // NOSONAR
      stdio: 'ignore', detached: false, windowsHide: true, env: spawnEnv,
    });
    _playingProcess = proc;

    function _restore() {
      try {
        if (origPersonality !== null) fs.writeFileSync(personalityFile, origPersonality);
        else try { fs.unlinkSync(personalityFile); } catch {}
        if (origReverb !== null) fs.writeFileSync(reverbFile, origReverb);
      } catch {}
    }

    proc.on('exit', () => { if (gen === _playGeneration) { _playingProcess = null; _stopSpinner(); } _restore(); if (onComplete) onComplete(); });
    proc.on('error', () => { if (gen === _playGeneration) { _playingProcess = null; _stopSpinner(); } _restore(); if (onComplete) onComplete(); });
  }

  // -------------------------------------------------------------------------
  // Auto-assign helpers

  function _shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // NOSONAR
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Common first-name → gender map for gender-aware auto-assign.
  // Only needs to cover names likely used as BMAD agent display names.
  const _NAME_GENDER = {
    // Female
    amelia: 'Female', amy: 'Female', anna: 'Female', betty: 'Female',
    claire: 'Female', dana: 'Female', emma: 'Female', faye: 'Female',
    grace: 'Female', heather: 'Female', ivy: 'Female', jane: 'Female',
    jenny: 'Female', julia: 'Female', kate: 'Female', laura: 'Female',
    lily: 'Female', maria: 'Female', mary: 'Female', nina: 'Female',
    olivia: 'Female', paige: 'Female', quinn: 'Female', rachel: 'Female',
    sally: 'Female', sara: 'Female', sarah: 'Female', sophie: 'Female',
    tina: 'Female', wendy: 'Female', zoe: 'Female',
    freya: 'Female', saga: 'Female',
    // Male
    alan: 'Male', barry: 'Male', bob: 'Male', carl: 'Male',
    charlie: 'Male', dan: 'Male', david: 'Male', eric: 'Male',
    frank: 'Male', george: 'Male', hank: 'Male', jack: 'Male',
    james: 'Male', joe: 'Male', john: 'Male', kevin: 'Male',
    leo: 'Male', mark: 'Male', max: 'Male', murat: 'Male',
    nick: 'Male', oscar: 'Male', paul: 'Male', ray: 'Male',
    ryan: 'Male', saif: 'Male', sam: 'Male', steve: 'Male',
    tom: 'Male', victor: 'Male', winston: 'Male', zach: 'Male',
  };

  /** Infer agent gender from display name (first word). */
  function _inferAgentGender(agent) {
    const firstName = (agent.displayName || '').split(/[\s(]/)[0].toLowerCase();
    return _NAME_GENDER[firstName] || null;
  }

  function _autoAssignVoices() {
    const installed = scanInstalledVoices();
    if (installed.length === 0) return false;

    // Separate voices by gender
    const femaleVoices = _shuffleArray(installed.filter(v => getVoiceMeta(v).gender === 'Female'));
    const maleVoices   = _shuffleArray(installed.filter(v => getVoiceMeta(v).gender === 'Male'));
    const otherVoices  = _shuffleArray(installed.filter(v => !['Male', 'Female'].includes(getVoiceMeta(v).gender)));

    // Separate agents by gender
    const femaleAgents = _agents.filter(a => _inferAgentGender(a) === 'Female');
    const maleAgents   = _agents.filter(a => _inferAgentGender(a) === 'Male');
    const otherAgents  = _agents.filter(a => !_inferAgentGender(a));

    const usedVoices = new Set();

    // Assign matching-gender voices first, then fall back to any available
    function assignGroup(agents, preferredPool, fallbackPools) {
      const allPools = [preferredPool, ...fallbackPools];
      agents.forEach(agent => {
        let voice = null;
        for (const pool of allPools) {
          voice = pool.find(v => !usedVoices.has(v));
          if (voice) break;
        }
        // If all unique voices exhausted, reuse from preferred pool
        if (!voice && preferredPool.length > 0) {
          voice = preferredPool[usedVoices.size % preferredPool.length];
        }
        if (voice) {
          usedVoices.add(voice);
          voiceStore.setAgentProfile(agent.id, { voice });
        }
      });
    }

    assignGroup(femaleAgents, femaleVoices, [otherVoices, maleVoices]);
    assignGroup(maleAgents,   maleVoices,   [otherVoices, femaleVoices]);
    assignGroup(otherAgents,  otherVoices,   [maleVoices, femaleVoices]);

    return true;
  }

  function _autoAssignMusic() {
    const tracksDir = path.join(_projectRoot, '.claude', 'audio', 'tracks');
    let tracks = [];
    try {
      tracks = fs.readdirSync(tracksDir).filter(f => /\.mp3$/i.test(f));
    } catch { /* no tracks dir */ }
    if (tracks.length === 0) return false;

    const shuffled = _shuffleArray(tracks);
    _agents.forEach((agent, i) => {
      const track = shuffled[i % shuffled.length];
      const existing = voiceStore.getAgentProfile(agent.id);
      voiceStore.setAgentProfile(agent.id, {
        backgroundMusic: { track, volume: existing.backgroundMusic?.volume ?? 20, enabled: true },
      });
    });
    return true;
  }

  function _autoAssignAll() {
    if (_agents.length === 0) return;
    const voiceOk = _autoAssignVoices();
    const musicOk = _autoAssignMusic();
    refreshDisplay();
    const msg = voiceOk && musicOk ? 'Voices and music auto-assigned'
               : voiceOk ? 'Voices auto-assigned' : 'Auto-assign: no voices found';
    _showSavedToast(msg);
  }

  // -------------------------------------------------------------------------
  // Bulk edit menu

  function _openBulkEditMenu() {
    const BULK_ACTIONS = [
      { label: '  Randomize Voices (gender-aware)',      key: 'voices' },
      { label: '  Randomize Music (unique per agent)',   key: 'music' },
      { label: '  Randomize Both',                       key: 'both' },
      { label: '  Set Same Music for All Agents...',     key: 'setMusic' },
      { label: '  Set Same Volume for All Agents...',    key: 'setVolume' },
      { label: '  Set Same Pretext for All Agents...',   key: 'setPretext' },
      { label: '  Set Same Reverb for All Agents...',    key: 'setReverb' },
      { label: '  Reset All Agent Profiles',             key: 'resetAll' },
    ];

    const menuList = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 52,
      height: BULK_ACTIONS.length + 4,
      border: { type: 'line' },
      tags: true,
      label: _modalTitle('Bulk Edit'),
      keys: true,
      vi: true,
      mouse: true,
      items: BULK_ACTIONS.map(a => a.label),
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: COLORS.btnFocus },
        selected: { bg: 'blue', fg: 'yellow' },
        item: { fg: COLORS.labelFg },
      },
    });

    blessed.text({
      parent: menuList,
      bottom: -1,
      left: 1,
      width: 48,
      height: 1,
      tags: true,
      content: '{#455a64-fg}[Enter] Select  [Esc] Cancel{/#455a64-fg}',
      style: { bg: COLORS.contentBg },
    });

    menuList.setFront();
    menuList.focus();
    screen.render();

    let _menuClosed = false;
    function _closeMenu(callback) {
      if (_menuClosed) return;
      _menuClosed = true;
      destroyList(menuList, screen, callback);
    }

    menuList.key(['enter'], () => {
      const action = BULK_ACTIONS[menuList.selected];
      if (!action) return;

      switch (action.key) {
        case 'voices':
          _closeMenu(() => {
            if (_autoAssignVoices()) { refreshDisplay(); _showSavedToast('Voices randomized'); }
          });
          break;

        case 'music':
          _closeMenu(() => {
            if (_autoAssignMusic()) { refreshDisplay(); _showSavedToast('Music randomized'); }
          });
          break;

        case 'both':
          _closeMenu(() => { _autoAssignAll(); });
          break;

        case 'setMusic':
          _closeMenu(() => {
            openTrackPicker(screen, '', 20, (track, volume) => {
              _agents.forEach(agent => {
                const p = voiceStore.getAgentProfile(agent.id);
                voiceStore.setAgentProfile(agent.id, {
                  backgroundMusic: { track, volume, enabled: true },
                });
              });
              refreshDisplay();
              _showSavedToast('Music set for all agents');
              agentList.focus();
            }, () => { agentList.focus(); screen.render(); });
          });
          break;

        case 'setVolume':
          _closeMenu(() => {
            const curVol = voiceStore.getAgentProfile(_agents[0]?.id)?.backgroundMusic?.volume ?? 20;
            openVolumeInput(screen, curVol, (volume) => {
              _agents.forEach(agent => {
                const p = voiceStore.getAgentProfile(agent.id);
                const bm = p.backgroundMusic || {};
                voiceStore.setAgentProfile(agent.id, {
                  backgroundMusic: { ...bm, volume },
                });
              });
              refreshDisplay();
              _showSavedToast(`Volume set to ${volume}% for all agents`);
              agentList.focus();
            }, () => { agentList.focus(); screen.render(); });
          });
          break;

        case 'setPretext':
          _closeMenu(() => { _openBulkPretextEditor(); });
          break;

        case 'setReverb':
          _closeMenu(() => {
            openReverbPicker(screen, '', (val) => {
              _agents.forEach(agent => voiceStore.setAgentProfile(agent.id, { reverbPreset: val }));
              refreshDisplay();
              _showSavedToast('Reverb set for all agents');
              agentList.focus();
            }, () => { agentList.focus(); screen.render(); }, { applyToEffectsManager: false });
          });
          break;

        case 'resetAll':
          _closeMenu(() => {
            _agents.forEach(agent => voiceStore.resetAgentProfile(agent.id));
            refreshDisplay();
            _showSavedToast('All profiles reset');
          });
          break;
      }
    });

    menuList.key(['escape', 'q'], () => {
      _closeMenu(() => { agentList.focus(); screen.render(); });
    });
  }

  function _openBulkPretextEditor() {
    const editModal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 9,
      border: { type: 'line' },
      tags: true,
      label: _modalTitle('Set Pretext for All Agents'),
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: 'bright-cyan' } },
    });
    editModal.setFront();

    blessed.text({
      parent: editModal, top: 1, left: 2,
      content: 'Pretext to apply to all agents (leave empty to clear):',
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    });

    const inputBox = blessed.textbox({
      parent: editModal, top: 3, left: 2, right: 2, height: 3,
      border: { type: 'line' },
      inputOnFocus: true,
      style: {
        fg: COLORS.valueFg, bg: '#0d1b35',
        border: { fg: COLORS.borderFg },
        focus: { border: { fg: 'bright-cyan' } },
      },
    });

    blessed.text({
      parent: editModal, bottom: 1, left: 2, tags: true,
      content: '{#455a64-fg}[Enter] Apply to all  [Esc] Cancel{/#455a64-fg}',
      style: { bg: COLORS.contentBg },
    });

    let _closed = false;
    function _close(save) {
      if (_closed) return;
      _closed = true;
      if (save) {
        const raw = inputBox.getValue().trim().slice(0, MAX_PRETEXT_LENGTH);
        _agents.forEach(agent => {
          if (raw) {
            voiceStore.setAgentProfile(agent.id, { pretext: raw });
          } else {
            const p = voiceStore.getAgentProfile(agent.id);
            const { pretext: _removed, ...rest } = p;
            voiceStore.resetAgentProfile(agent.id);
            if (Object.keys(rest).length > 0) voiceStore.setAgentProfile(agent.id, rest);
          }
        });
        refreshDisplay();
        _showSavedToast('Pretext set for all agents');
      }
      destroyList(editModal, screen, () => { agentList.focus(); screen.render(); });
    }

    inputBox.key(['enter'], () => _close(true));
    inputBox.key(['escape'], () => _close(false));
    inputBox.focus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Key bindings

  agentList.key(['x', 'X'], () => {
    const agent = _agents[agentList.selected ?? 0];
    if (agent) {
      voiceStore.resetAgentProfile(agent.id);
      refreshDisplay();
    }
  });


  agentList.key(['enter'], () => {
    const agent = _agents[agentList.selected ?? 0];
    if (agent) _openAgentDetailPanel(agent);
  });

  agentList.key(['space'], () => {
    const agent = _agents[agentList.selected ?? 0];
    if (agent) _sampleAgent(agent);
  });

  agentList.key(['a', 'A'], () => { _autoAssignAll(); });
  agentList.key(['b', 'B'], () => { _openBulkEditMenu(); });

  // Type-to-jump
  const _agentJumpBlocked = new Set(['j', 'k', 'g', 'h', 'l', 'd', 'u', 'x', 'a', 'b']);
  agentList.on('keypress', (ch, key) => {
    if (!ch || key.ctrl || key.meta) return;
    const lower = ch.toLowerCase();
    if (!/^[a-z]$/.test(lower)) return;
    if (_agentJumpBlocked.has(lower)) return;
    const count = _agents.length;
    if (count === 0) return;
    const start = agentList.selected ?? 0;
    for (let i = 1; i <= count; i++) {
      const idx = (start + i) % count;
      const name = (_agents[idx]?.displayName ?? '').toLowerCase();
      if (name.startsWith(lower)) {
        agentList.select(idx);
        screen.render();
        break;
      }
    }
  });

  // Inline row hint (appended to selected row while list is focused)
  let _listFocused = false;
  let _hintIdx  = -1;
  let _hintBase = '';   // row content before hint was appended (no hint, no █)

  function _updateHint(idx) {
    const items = agentList.items;
    // Pad with spaces to overwrite ghost hint text from previous render
    const _pad = ' '.repeat(60);
    if (_hintIdx >= 0 && _hintIdx !== idx && items[_hintIdx]) {
      const hadBlink = (items[_hintIdx].content ?? '').endsWith('  █');
      items[_hintIdx].setContent((hadBlink ? _hintBase + '  █' : _hintBase) + _pad);
    }
    if (idx >= 0 && items[idx]) {
      let c = items[idx].content ?? '';
      const hasBlink = c.endsWith('  █');
      if (hasBlink) c = c.slice(0, -3);
      _hintBase = c;
      items[idx].setContent(c + _ROW_HINT_BMAD + (hasBlink ? '  █' : ''));
    } else {
      _hintBase = '';
    }
    _hintIdx = idx;
  }

  // Blinking cursor
  let _alBlink = { interval: null, on: false, sel: -1 };
  function _alTick() {
    _alBlink.on = !_alBlink.on;
    const items = agentList.items;
    const cur = agentList.selected ?? 0;
    if (_alBlink.sel !== cur && _alBlink.sel >= 0 && items[_alBlink.sel]) {
      items[_alBlink.sel].setContent((items[_alBlink.sel].content ?? '').replace(/  █$/, ''));
    }
    _alBlink.sel = cur;
    if (items[cur]) {
      const base = (items[cur].content ?? '').replace(/  █$/, '');
      items[cur].setContent(_alBlink.on ? `${base}  █` : base);
    }
    screen.render();
  }
  agentList.on('focus', () => {
    _listFocused = true;
    _alBlink.on = true;
    _alBlink.sel = agentList.selected ?? 0;
    _hintIdx = -1;
    _hintBase = '';
    _updateHint(_alBlink.sel);
    const items = agentList.items;
    if (items[_alBlink.sel]) items[_alBlink.sel].setContent((items[_alBlink.sel].content ?? '') + '  █');
    screen.render();
    _alBlink.interval = setInterval(_alTick, 500);
  });
  agentList.on('blur', () => {
    _listFocused = false;
    if (_alBlink.interval) { clearInterval(_alBlink.interval); _alBlink.interval = null; }
    const items = agentList.items;
    const sel = agentList.selected ?? 0;
    if (items[sel]) {
      items[sel].setContent(sel === _hintIdx ? _hintBase : (items[sel].content ?? '').replace(/  █$/, ''));
    }
    if (_hintIdx >= 0 && _hintIdx !== sel && items[_hintIdx]) {
      items[_hintIdx].setContent(_hintBase);
    }
    _hintIdx = -1;
    _hintBase = '';
    screen.render();
  });
  agentList.on('select item', () => {
    _updateHint(agentList.selected ?? 0);
    if (_alBlink.interval) _alTick();
  });

  // Navigation: up at top → tab bar, escape → tab bar
  // Track previous selection so arriving at index 0 doesn't immediately jump
  let _prevAgentSel = -1;
  agentList.key(['up'], () => {
    const cur = agentList.selected ?? 0;
    if (cur === 0 && _prevAgentSel === 0 && typeof focusMainTabBar === 'function') {
      focusMainTabBar();
      setTimeout(() => { agentList.select(0); screen.render(); }, 0);
    }
    _prevAgentSel = cur;
  });
  agentList.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
  });

  // -------------------------------------------------------------------------
  // Language change handler

  if (languageService) {
    languageService.onChange(() => {
      onboardingBox.setContent(_buildOnboardingText());
      screen.render();
    });
  }

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,

    show() {
      box.show();
      refreshDisplay();
      screen.render();
    },

    hide() {
      _killPreview();
      box.hide();
      screen.render();
    },

    onFocus() {
      if (_bmadDetected) {
        agentList.focus();
      } else {
        onboardingBox.focus();
      }
      screen.render();
    },

    onBlur() {
      _killPreview();
    },

    getFooterText() {
      return _bmadDetected ? _tl('bmadFooterBmad') : _tl('bmadFooterNobmad');
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
