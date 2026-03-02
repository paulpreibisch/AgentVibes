/**
 * AgentVibes TUI Console — Agents Tab
 * Epic 11: Stories 11.1-11.5
 *
 * Implements the Tab Component Contract:
 *   createAgentsTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: BMAD agent list, voice assignments, party mode toggle, single-voice warning.
 */

import { AgentVoiceStore, scanBmadAgents, isSingleVoiceProvider } from '../../services/agent-voice-store.js';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#7b1fa2',  // Purple — section headers for Agents tab
  labelFg:    '#e3f2fd',
  valueFg:    '#ffff00',  // Yellow
  activeFg:   '#ce93d8',  // Light purple — selected agent
  btnDefault: '#6a1b9a',  // Purple — Agents tab buttons
  btnFocus:   '#9c27b0',
  btnFocusFg: '#ffffff',
  btnPress:   '#ff00ff',
  borderFg:   '#9c27b0',
  footerBg:   '#9c27b0',  // Purple — Agents tab footer
  noticeFg:   '#90a4ae',
  warnFg:     '#ff9800',
};

const FOOTER_TEXT = '[↑↓/jk] Navigate  [Enter] Details  [R] Reset Voice  [P] Party Mode  [S/V/M/A/R] Tab  [Q] Quit';

// ---------------------------------------------------------------------------

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
 * Create the Agents tab component.
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @param {import('../../services/config-service.js').ConfigService}   services.configService
 * @param {import('../../services/provider-service.js').ProviderService} services.providerService
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createAgentsTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService, focusMainTabBar } = services;
  const voiceStore = new AgentVoiceStore();

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
  // Section header

  blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: `{#7b1fa2-fg}── BMAD Agents ${'─'.repeat(53)}{/#7b1fa2-fg}`,
    tags: true,
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

  blessed.text({
    parent: box,
    top: '64%',
    left: 2,
    content: `{#7b1fa2-fg}── Status ${'─'.repeat(58)}{/#7b1fa2-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const statusLine = blessed.text({
    parent: box,
    top: '69%',
    left: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const warningLine = blessed.text({
    parent: box,
    top: '74%',
    left: 2,
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

  const resetBtn = _createBtn('[R] Reset Voice', () => {
    const agents = _agents;
    const agent = agents[agentList.selected];
    if (agent) {
      voiceStore.resetVoice(agent.id);
      refreshDisplay();
    }
  });
  resetBtn.bottom = 4;
  resetBtn.left = 4;

  const partyBtn = _createBtn('[P] Party Mode', () => {
    const current = voiceStore.getPartyMode();
    voiceStore.setPartyMode(!current);
    refreshDisplay();
  });
  partyBtn.bottom = 4;
  partyBtn.left = 24;

  // -------------------------------------------------------------------------
  // State

  let _agents = [];

  function _buildListItems(agents, voiceMap) {
    if (agents.length === 0) {
      return [' (no BMAD agents detected — open a project with .bmad/ or _bmad/)'];
    }
    return agents.map(a => {
      const voice = voiceMap[a.id] ?? '(default)';
      return ` ${a.displayName.padEnd(20)} → ${voice}`;
    });
  }

  function refreshDisplay() {
    _agents = scanBmadAgents(process.cwd());
    const voiceMap = voiceStore.getVoiceMap();
    const partyMode = voiceStore.getPartyMode();
    const provider = providerService.getProvider?.() ?? configService.getConfig().provider ?? 'piper';
    const singleVoice = isSingleVoiceProvider(provider);

    const items = _buildListItems(_agents, voiceMap);
    agentList.setItems(items);

    statusLine.setContent(
      `  Party Mode: ${partyMode ? 'Enabled' : 'Disabled'}  |  Provider: ${provider}  |  Agents: ${_agents.length}`
    );

    warningLine.setContent(
      partyMode && singleVoice
        ? `  ⚠ Provider has only 1 voice — all agents sound the same`
        : ''
    );

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Key bindings

  agentList.key(['r', 'R'], () => {
    const agent = _agents[agentList.selected];
    if (agent) {
      voiceStore.resetVoice(agent.id);
      refreshDisplay();
    }
  });

  agentList.key(['p', 'P'], () => {
    const current = voiceStore.getPartyMode();
    voiceStore.setPartyMode(!current);
    refreshDisplay();
  });

  // Type-to-jump: press a letter to jump to first agent whose name starts with it
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

  // Blinking █ on selected row while list is focused
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

  // [↑] at top of list → jump to main header tab bar
  agentList.key(['up'], () => {
    if (agentList.selected === 0 && typeof focusMainTabBar === 'function') {
      focusMainTabBar();
      setTimeout(() => { agentList.select(0); screen.render(); }, 0);
    }
  });

  // Escape at the list level → return to header tab bar
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
      box.hide();
      screen.render();
    },

    onFocus() {
      agentList.focus();
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
