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
import { openTrackPicker } from '../widgets/track-picker.js';
import { formatReverbState, formatTrackName } from './settings-tab.js';
import {
  PIPER_VOICES_DIR, SAMPLE_PHRASES,
  parseMultiSpeaker, scanInstalledVoices, getVoiceMeta,
} from './voices-tab.js';
import { buildAudioEnv, detectWavPlayer } from '../audio-env.js';
import { destroyList } from '../widgets/destroy-list.js';
import { BRAND_PINK } from '../brand-colors.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Max pretext length to prevent excessively long TTS utterances
const MAX_PRETEXT_LENGTH = 200;

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
  activeFg:   '#ce93d8',
  btnDefault: '#6a1b9a',
  btnFocus:   '#9c27b0',
  btnFocusFg: '#ffffff',
  btnPress:   '#ff00ff',
  borderFg:   '#9c27b0',
  footerBg:   '#9c27b0',
  noticeFg:   '#90a4ae',
  warnFg:     '#ff9800',
  linkFg:     '#00e5ff',
};

const FOOTER_TEXT_BMAD   = '[↑↓/jk] Navigate  [Enter] Edit Agent  [Space] Sample  [R] Reset  [P] Party Mode  [Q] Quit';
const FOOTER_TEXT_NOBMAD = '[Tab] Switch Tab  [Q] Quit';

const _modalTitle = (text) => ` {${BRAND_PINK}-fg}${text}{/${BRAND_PINK}-fg} `;

// Column widths for agent table
const COL_ICON = 4;
const COL_NAME = 22;
const COL_VOICE = 24;
const COL_PRETEXT = 20;

// ---------------------------------------------------------------------------

function createTestStub() {
  return {
    box: {},
    show: () => {},
    hide: () => {},
    onFocus: () => {},
    onBlur: () => {},
    getFooterText: () => FOOTER_TEXT_BMAD,
    getFooterColor: () => COLORS.footerBg,
  };
}

// ---------------------------------------------------------------------------
// No-BMAD onboarding content

const ONBOARDING_TEXT = `{bold}{#ce93d8-fg}🧙 BMAD Agents{/#ce93d8-fg}{/bold}

{bold}What is BMAD?{/bold}

The BMad Method (Build More Architect Dreams) is an AI-driven development
framework module within the BMad Method Ecosystem that helps you build
software through the whole process from ideation and planning all the way
through agentic implementation. It provides specialized AI agents, guided
workflows, and intelligent planning that adapts to your project's
complexity, whether you're fixing a bug or building an enterprise platform.

If you're comfortable working with AI coding assistants like Claude,
Cursor, or GitHub Copilot, you're ready to get started.


{bold}Install BMAD in your project:{/bold}

  {#00e5ff-fg}npx bmad-method install{/#00e5ff-fg}


{bold}Learn more:{/bold}

  {#00e5ff-fg}https://docs.bmad-method.org/{/#00e5ff-fg}
  {#00e5ff-fg}https://github.com/bmad-code-org/BMAD-METHOD{/#00e5ff-fg}


{#90a4ae-fg}Once BMAD is installed, this tab will show all your agents and let you
customize each agent's voice, pretext, reverb, personality, and background
music independently.{/#90a4ae-fg}`;

// ---------------------------------------------------------------------------

/**
 * Create the Agents tab component.
 */
export function createAgentsTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService, focusMainTabBar, navigationService } = services;
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
    content: ONBOARDING_TEXT,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
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
    content: `{#90a4ae-fg}${''.padEnd(COL_ICON)}${'Agent'.padEnd(COL_NAME)}${'Voice'.padEnd(COL_VOICE)}${'Pretext'.padEnd(COL_PRETEXT)}Reverb{/#90a4ae-fg}`,
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
    border: { type: 'line' },
    scrollbar: { ch: '│', style: { fg: COLORS.sectionHdr } },
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
      selected: { bg: '#4a148c', fg: COLORS.activeFg, bold: true },
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
        fg: 'white',
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

  const resetBtn = _createBtn('[R] Reset', () => {
    const agent = _agents[agentList.selected];
    if (agent) {
      voiceStore.resetAgentProfile(agent.id);
      refreshDisplay();
    }
  });
  resetBtn.bottom = 4;
  resetBtn.left = 4;

  const partyBtn = _createBtn('[P] Party Mode', () => {
    voiceStore.setPartyMode(!voiceStore.getPartyMode());
    refreshDisplay();
  });
  partyBtn.bottom = 4;
  partyBtn.left = 20;

  // -------------------------------------------------------------------------
  // Show/hide helpers for the two states

  const _bmadWidgets = [sectionHeader, columnHeader, agentList, statusDivider, statusLine, warningLine, resetBtn, partyBtn];

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
      const icon = (a.icon || '  ').padEnd(COL_ICON);
      const name = `${a.displayName}`.padEnd(COL_NAME).slice(0, COL_NAME);
      const voice = (profile.voice || '(global)').padEnd(COL_VOICE).slice(0, COL_VOICE);
      const pretext = (profile.pretext || '(default)').padEnd(COL_PRETEXT).slice(0, COL_PRETEXT);
      const reverb = profile.reverbPreset || '(global)';
      return ` ${icon}${name}${voice}${pretext}${reverb}`;
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

    const partyMode = voiceStore.getPartyMode();
    const provider = providerService.getProvider?.() ?? configService.getConfig().provider ?? 'piper';
    const singleVoice = isSingleVoiceProvider(provider);

    const items = _buildListItems(_agents);
    agentList.setItems(items);

    statusLine.setContent(
      `  Party Mode: ${partyMode ? '{green-fg}Enabled{/green-fg}' : 'Disabled'}  |  Provider: ${provider}  |  Agents: ${_agents.length}`
    );
    statusLine.options.tags = true;

    warningLine.setContent(
      partyMode && singleVoice
        ? `  ⚠ Provider "${provider}" has only 1 voice — all agents will sound the same`
        : ''
    );

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Kill any playing preview

  function _killPreview() {
    if (_playingProcess) {
      try { process.kill(-_playingProcess.pid, 'SIGTERM'); } catch {}
      _playingProcess = null;
    }
  }

  // -------------------------------------------------------------------------
  // Sample an agent with their full profile

  function _sampleAgent(agent) {
    _killPreview();
    const gen = ++_playGeneration;

    const profile = voiceStore.getAgentProfile(agent.id);
    const voiceId = profile.voice || configService.getConfig().voice || '';
    if (!voiceId) return;

    const pretext = profile.pretext || AgentVoiceStore.getDefaultPretext(agent.displayName, agent.title);
    const phrase = `${pretext} ${SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)]}`;

    const _ms = parseMultiSpeaker(voiceId);
    const voicePath = path.resolve(PIPER_VOICES_DIR, _ms.model + '.onnx');
    const safeBase = path.resolve(PIPER_VOICES_DIR);
    if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) return;

    const _spawnEnv = buildAudioEnv();
    const tempWav = _secureTempWav('agent-preview');

    const _piperArgs = ['--model', voicePath, '--output_file', tempWav];
    if (_ms.speakerId != null) _piperArgs.push('--speaker', String(_ms.speakerId));
    const piper = spawn('piper', _piperArgs, {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached: true,
      env: _spawnEnv,
    });
    piper.stdin.write(phrase + '\n');
    piper.stdin.end();
    _playingProcess = piper;

    piper.on('exit', (code) => {
      if (gen !== _playGeneration) { try { fs.unlinkSync(tempWav); } catch {} return; }
      if (code !== 0) {
        _playingProcess = null;
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }
      const _wavPlayer = detectWavPlayer(_spawnEnv);
      if (!_wavPlayer) {
        _playingProcess = null;
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }
      const playProc = spawn(_wavPlayer.bin, _wavPlayer.args(tempWav), {
        stdio: 'ignore',
        detached: true,
        env: _spawnEnv,
      });
      _playingProcess = playProc;
      playProc.on('exit', () => {
        if (gen === _playGeneration) _playingProcess = null;
        try { fs.unlinkSync(tempWav); } catch {}
      });
      playProc.on('error', () => {
        if (gen === _playGeneration) _playingProcess = null;
        try { fs.unlinkSync(tempWav); } catch {}
      });
    });

    piper.on('error', () => {
      if (gen === _playGeneration) _playingProcess = null;
      try { fs.unlinkSync(tempWav); } catch {}
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
        volume:  profile.backgroundMusic?.volume  ?? globalCfg.backgroundMusic?.volume ?? 70,
        enabled: profile.backgroundMusic?.enabled ?? globalCfg.backgroundMusic?.enabled ?? false,
      },
    };

    let _closed = false;
    navigationService?.openModal();

    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 18,
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
      { key: 'reverbPreset', label: 'Reverb',      getValue: () => formatReverbState(draft.reverbPreset) },
      { key: 'personality',  label: 'Personality', getValue: () => {
        const p = draft.personality;
        const emoji = PERSONALITY_EMOJIS[p] || '';
        return `${emoji} ${p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}`;
      }},
      { key: 'music',        label: 'Music',       getValue: () => {
        if (!draft.backgroundMusic.enabled) return '(disabled)';
        return `${formatTrackName(draft.backgroundMusic.track)} Vol:${draft.backgroundMusic.volume}%`;
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
        selected: { bg: '#4a148c', fg: COLORS.activeFg, bold: true },
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
      content: '{#455a64-fg}[↑↓] Navigate fields  [Enter] Edit field  [Space] Sample  [Esc] Cancel{/#455a64-fg}',
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
          fg: 'white',
          focus: { bg: '#00e5ff', fg: '#000000', bold: true },
          hover: { bg: '#00e5ff', fg: '#000000', bold: true },
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
      btn.key(['enter', 'space'], () => onClick());
      btn.on('click', () => onClick());
      return btn;
    }

    const saveBtn = _modalBtn('Save', 4, () => {
      // Only save fields that differ from global
      const toSave = {};
      if (draft.voice && draft.voice !== globalCfg.voice) toSave.voice = draft.voice;
      if (draft.pretext !== AgentVoiceStore.getDefaultPretext(agent.displayName, agent.title)) toSave.pretext = draft.pretext;
      if (draft.reverbPreset !== (globalCfg.effects?.reverbPreset || 'light')) toSave.reverbPreset = draft.reverbPreset;
      if (draft.personality !== (globalCfg.personality || 'none')) toSave.personality = draft.personality;
      if (draft.backgroundMusic.track !== (globalCfg.backgroundMusic?.track || '') ||
          draft.backgroundMusic.volume !== (globalCfg.backgroundMusic?.volume ?? 70) ||
          draft.backgroundMusic.enabled !== (globalCfg.backgroundMusic?.enabled ?? false)) {
        toSave.backgroundMusic = draft.backgroundMusic;
      }
      voiceStore.setAgentProfile(agent.id, toSave);
      _closeModal();
      refreshDisplay();
    });

    const resetAllBtn = _modalBtn('Reset to Defaults', 14, () => {
      voiceStore.resetAgentProfile(agent.id);
      _closeModal();
      refreshDisplay();
    });

    const cancelBtn = _modalBtn('Cancel', 38, _closeModal);

    function _closeModal() {
      if (_closed) return;
      _closed = true;
      _killPreview();
      navigationService?.closeModal();
      destroyList(modal, screen);
    }

    // Field editing via Enter
    fieldList.key(['enter'], () => {
      const idx = fieldList.selected;
      const field = FIELDS[idx];
      if (!field) return;

      switch (field.key) {
        case 'voice':
          _openVoicePickerForAgent(draft, () => {
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          });
          break;

        case 'pretext':
          _openPretextEditor(modal, draft, () => {
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          });
          break;

        case 'reverbPreset':
          openReverbPicker(screen, draft.reverbPreset, (val) => {
            draft.reverbPreset = val;
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
            fieldList.setItems(_fieldItems());
            fieldList.select(idx);
            fieldList.focus();
            screen.render();
          }, () => {
            fieldList.focus();
            screen.render();
          });
          break;

        case 'music':
          openTrackPicker(screen, draft.backgroundMusic.track, (track) => {
            draft.backgroundMusic.track = track;
            draft.backgroundMusic.enabled = true;
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
    fieldList.key(['escape', 'q'], _closeModal);
    saveBtn.key(['escape'], _closeModal);
    resetAllBtn.key(['escape'], _closeModal);
    cancelBtn.key(['escape'], _closeModal);

    // Tab navigation within modal
    fieldList.key(['tab'], () => { saveBtn.focus(); screen.render(); });
    saveBtn.key(['tab'], () => { resetAllBtn.focus(); screen.render(); });
    resetAllBtn.key(['tab'], () => { cancelBtn.focus(); screen.render(); });
    cancelBtn.key(['tab'], () => { fieldList.focus(); screen.render(); });

    fieldList.focus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Voice picker for agent detail panel

  function _openVoicePickerForAgent(draft, onDone) {
    let _allVoices = [];
    let _filterText = '';
    let _previewProc = null;
    let _previewVoiceId = null;
    let _vpClosed = false;

    const _spawnEnv = buildAudioEnv();

    function _killVP() {
      if (_previewProc) {
        try { process.kill(-_previewProc.pid, 'SIGTERM'); } catch {}
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
      label: _modalTitle('Select Agent Voice'),
      style: {
        fg: COLORS.labelFg,
        bg: COLORS.contentBg,
        border: { fg: '#00e5ff' },
      },
    });
    vpModal.setFront();

    // Search
    blessed.text({
      parent: vpModal, top: 1, left: 2,
      content: 'Search:', style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    });
    const vpSearch = blessed.textbox({
      parent: vpModal, top: 1, left: 11, width: 40, height: 1,
      inputOnFocus: true, keys: true,
      style: { fg: COLORS.valueFg, bg: '#1a237e', focus: { bg: '#283593' } },
    });

    // Column header
    const COL_N = 28;
    const COL_G = 10;
    blessed.text({
      parent: vpModal, top: 2, left: 6, tags: true,
      content: `{#7986cb-fg}${'Name'.padEnd(COL_N)}${'Gender'.padEnd(COL_G)}Provider{/#7986cb-fg}`,
      style: { bg: COLORS.contentBg },
    });

    const vpList = blessed.list({
      parent: vpModal, top: 3, left: 2, right: 2, bottom: 5,
      keys: true, vi: true, mouse: true,
      border: { type: 'line' },
      scrollbar: { ch: '│', style: { fg: COLORS.borderFg } },
      style: {
        fg: COLORS.labelFg, bg: COLORS.contentBg,
        border: { fg: COLORS.borderFg },
        selected: { bg: '#1a237e', fg: '#00e5ff', bold: true },
        item: { fg: COLORS.labelFg },
      },
    });

    const vpInfoLine = blessed.text({
      parent: vpModal, bottom: 4, left: 2, right: 2, tags: true,
      content: '', style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    });

    const vpPreviewLine = blessed.text({
      parent: vpModal, bottom: 3, left: 2, right: 2, tags: true,
      content: '', style: { fg: '#00e5ff', bg: COLORS.contentBg },
    });

    blessed.text({
      parent: vpModal, bottom: 2, left: 2, right: 2, tags: true,
      content: '{#455a64-fg}[↑↓/jk] Navigate  [Enter] Select  [Space] Preview  [/] Search  [Esc] Cancel{/#455a64-fg}',
      style: { bg: COLORS.contentBg },
    });

    function _getFiltered() {
      if (!_filterText) return _allVoices;
      const f = _filterText.toLowerCase();
      return _allVoices.filter(v => v.toLowerCase().includes(f));
    }

    function _buildVoiceItems(voices) {
      return voices.map(v => {
        const isActive = v === draft.voice;
        const isPrev = v === _previewVoiceId;
        const dot = isPrev ? '♪' : (isActive ? '●' : ' ');
        const meta = getVoiceMeta(v);
        const name = meta.displayName.length > COL_N
          ? meta.displayName.slice(0, COL_N - 1) + '…'
          : meta.displayName.padEnd(COL_N);
        return ` ${dot} ${name}${meta.gender.padEnd(COL_G)}${meta.provider}`;
      });
    }

    function _refreshVP() {
      if (_vpClosed) return;
      _allVoices = scanInstalledVoices();
      const filtered = _getFiltered();
      const items = _buildVoiceItems(filtered);
      vpList.setItems(items.length > 0 ? items : [' (no voices found)']);
      screen.render();
    }

    function _previewVoice(voiceId) {
      if (_previewVoiceId === voiceId) { _killVP(); vpPreviewLine.setContent(''); screen.render(); return; }
      _killVP();

      const _ms = parseMultiSpeaker(voiceId);
      const voicePath = path.resolve(PIPER_VOICES_DIR, _ms.model + '.onnx');
      const safeBase = path.resolve(PIPER_VOICES_DIR);
      if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) return;

      const tempWav = _secureTempWav('vp');
      const phrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];

      const args = ['--model', voicePath, '--output_file', tempWav];
      if (_ms.speakerId != null) args.push('--speaker', String(_ms.speakerId));
      const piper = spawn('piper', args, {
        stdio: ['pipe', 'ignore', 'ignore'], detached: true, env: _spawnEnv,
      });
      piper.stdin.write(phrase + '\n');
      piper.stdin.end();
      _previewProc = piper;
      _previewVoiceId = voiceId;

      if (!_vpClosed) {
        vpPreviewLine.setContent(`{#00e5ff-fg}♪ Synthesizing: ${voiceId}...{/#00e5ff-fg}`);
        screen.render();
      }

      piper.on('exit', (code) => {
        if (_previewVoiceId !== voiceId) { try { fs.unlinkSync(tempWav); } catch {} return; }
        if (code !== 0) { _previewProc = null; _previewVoiceId = null; return; }
        const wp = detectWavPlayer(_spawnEnv);
        if (!wp) return;
        const pp = spawn(wp.bin, wp.args(tempWav), { stdio: 'ignore', detached: true, env: _spawnEnv });
        _previewProc = pp;
        if (!_vpClosed) { vpPreviewLine.setContent(`{#00e5ff-fg}♪ Playing: ${voiceId}{/#00e5ff-fg}`); screen.render(); }
        pp.on('exit', () => {
          if (_previewVoiceId === voiceId) { _previewVoiceId = null; _previewProc = null; if (!_vpClosed) { vpPreviewLine.setContent(''); screen.render(); } }
          try { fs.unlinkSync(tempWav); } catch {}
        });
      });
      piper.on('error', () => { _previewProc = null; _previewVoiceId = null; });
    }

    vpSearch.on('keypress', () => {
      setTimeout(() => { _filterText = vpSearch.getValue().trim(); _refreshVP(); }, 0);
    });
    vpSearch.key(['escape'], () => { vpList.focus(); screen.render(); });
    vpList.key(['/'], () => { vpSearch.clearValue(); vpSearch.focus(); screen.render(); });
    vpList.key(['enter'], () => {
      const filtered = _getFiltered();
      const sel = filtered[vpList.selected];
      if (sel) { draft.voice = sel; _closeVP(); }
    });
    vpList.key(['space'], () => {
      const filtered = _getFiltered();
      const sel = filtered[vpList.selected];
      if (sel) _previewVoice(sel);
    });
    vpList.key(['escape', 'q'], _closeVP);

    _refreshVP();
    const activeIdx = _getFiltered().indexOf(draft.voice);
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
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: '#00e5ff' } },
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
      inputOnFocus: true,
      value: draft.pretext,
      style: {
        fg: COLORS.valueFg, bg: '#0d1b35',
        border: { fg: COLORS.borderFg },
        focus: { border: { fg: '#00e5ff' } },
      },
    });

    let _editClosed = false;
    function _closeEdit(save) {
      if (_editClosed) return;
      _editClosed = true;
      if (save) {
        const raw = inputBox.getValue().trim();
        // M7: enforce max pretext length
        draft.pretext = (raw || draft.pretext).slice(0, MAX_PRETEXT_LENGTH);
      }
      destroyList(editModal, screen, onDone);
    }

    inputBox.key(['enter'], () => _closeEdit(true));
    inputBox.key(['escape'], () => _closeEdit(false));

    inputBox.focus();
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Sample agent with a draft profile (no save)

  function _sampleAgentWithDraft(agent, draft) {
    _killPreview();
    const gen = ++_playGeneration;

    const voiceId = draft.voice;
    if (!voiceId) return;

    const pretext = draft.pretext || AgentVoiceStore.getDefaultPretext(agent.displayName, agent.title);
    const phrase = `${pretext} ${SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)]}`;

    const _ms = parseMultiSpeaker(voiceId);
    const voicePath = path.resolve(PIPER_VOICES_DIR, _ms.model + '.onnx');
    const safeBase = path.resolve(PIPER_VOICES_DIR);
    if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) return;

    const _spawnEnv = buildAudioEnv();
    const tempWav = _secureTempWav('draft-preview');

    const _piperArgs = ['--model', voicePath, '--output_file', tempWav];
    if (_ms.speakerId != null) _piperArgs.push('--speaker', String(_ms.speakerId));
    const piper = spawn('piper', _piperArgs, {
      stdio: ['pipe', 'ignore', 'ignore'], detached: true, env: _spawnEnv,
    });
    piper.stdin.write(phrase + '\n');
    piper.stdin.end();
    _playingProcess = piper;

    piper.on('exit', (code) => {
      if (gen !== _playGeneration) { try { fs.unlinkSync(tempWav); } catch {} return; }
      if (code !== 0) { _playingProcess = null; try { fs.unlinkSync(tempWav); } catch {} return; }
      const wp = detectWavPlayer(_spawnEnv);
      if (!wp) { _playingProcess = null; try { fs.unlinkSync(tempWav); } catch {} return; }
      const pp = spawn(wp.bin, wp.args(tempWav), { stdio: 'ignore', detached: true, env: _spawnEnv });
      _playingProcess = pp;
      pp.on('exit', () => { if (gen === _playGeneration) _playingProcess = null; try { fs.unlinkSync(tempWav); } catch {} });
      pp.on('error', () => { if (gen === _playGeneration) _playingProcess = null; try { fs.unlinkSync(tempWav); } catch {} });
    });
    piper.on('error', () => { if (gen === _playGeneration) _playingProcess = null; try { fs.unlinkSync(tempWav); } catch {} });
  }

  // -------------------------------------------------------------------------
  // Key bindings

  agentList.key(['r', 'R'], () => {
    const agent = _agents[agentList.selected];
    if (agent) {
      voiceStore.resetAgentProfile(agent.id);
      refreshDisplay();
    }
  });

  agentList.key(['p', 'P'], () => {
    voiceStore.setPartyMode(!voiceStore.getPartyMode());
    refreshDisplay();
  });

  agentList.key(['enter'], () => {
    const agent = _agents[agentList.selected];
    if (agent) _openAgentDetailPanel(agent);
  });

  agentList.key(['space'], () => {
    const agent = _agents[agentList.selected];
    if (agent) _sampleAgent(agent);
  });

  // Type-to-jump
  const _agentJumpBlocked = new Set(['j', 'k', 'g', 'h', 'l', 'd', 'u', 'r', 'p']);
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

  // Blinking cursor
  let _alBlink = { interval: null, on: false, sel: -1 };
  function _alTick() {
    _alBlink.on = !_alBlink.on;
    const items = agentList.items;
    const cur = agentList.selected ?? 0;
    if (_alBlink.sel !== cur && _alBlink.sel >= 0 && items[_alBlink.sel]) {
      items[_alBlink.sel].setContent((items[_alBlink.sel].content ?? '').replace(/ █$/, ''));
    }
    _alBlink.sel = cur;
    if (items[cur]) {
      const base = (items[cur].content ?? '').replace(/ █$/, '');
      items[cur].setContent(_alBlink.on ? `${base} █` : base);
    }
    screen.render();
  }
  agentList.on('focus', () => {
    _alBlink.on = true;
    _alBlink.sel = agentList.selected ?? 0;
    const items = agentList.items;
    if (items[_alBlink.sel]) items[_alBlink.sel].setContent((items[_alBlink.sel].content ?? '') + ' █');
    screen.render();
    _alBlink.interval = setInterval(_alTick, 500);
  });
  agentList.on('blur', () => {
    if (_alBlink.interval) { clearInterval(_alBlink.interval); _alBlink.interval = null; }
    const items = agentList.items;
    const sel = agentList.selected ?? 0;
    if (items[sel]) items[sel].setContent((items[sel].content ?? '').replace(/ █$/, ''));
    screen.render();
  });
  agentList.on('select item', () => {
    if (_alBlink.interval) _alTick();
  });

  // Navigation: up at top → tab bar, escape → tab bar
  agentList.key(['up'], () => {
    if (agentList.selected === 0 && typeof focusMainTabBar === 'function') {
      focusMainTabBar();
      setTimeout(() => { agentList.select(0); screen.render(); }, 0);
    }
  });
  agentList.key(['escape'], () => {
    if (typeof focusMainTabBar === 'function') { focusMainTabBar(); screen.render(); }
  });

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
      return _bmadDetected ? FOOTER_TEXT_BMAD : FOOTER_TEXT_NOBMAD;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
