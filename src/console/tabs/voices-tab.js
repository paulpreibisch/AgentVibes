/**
 * AgentVibes TUI Console — Voices Tab
 * Epic 8: Stories 8.1-8.4
 *
 * Implements the Tab Component Contract:
 *   createVoicesTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Features: installed voice list, search/filter, favorites (★), voice info panel, install stub.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#00897b',  // Teal — section headers for Voices tab
  labelFg:    '#e3f2fd',
  valueFg:    '#ffd700',
  activeFg:   '#00e5ff',  // Cyan — active voice
  favoriteFg: '#ffb300',  // Amber — favorite star
  btnDefault: '#00695c',  // Teal — Voices tab buttons
  btnFocus:   '#00e5ff',
  btnFocusFg: '#000000',
  btnPress:   '#ff00ff',
  borderFg:   '#00897b',
  footerBg:   '#00695c',  // Teal — Voices tab footer
  noticeFg:   '#90a4ae',
  dimFg:      '#455a64',
};

const FOOTER_TEXT = '[↑↓/jk] Navigate  [Enter/Space] Preview  [Tab] Buttons  [F] Favorite  [/] Search  [Q] Quit';
const PIPER_VOICES_DIR = path.join(os.homedir(), '.local', 'share', 'piper', 'voices');

const SAMPLE_PHRASES = [
  "Hello! I'm ready to assist you with your tasks today.",
  "Code review complete. I found several areas that could be improved.",
  "Welcome to AgentVibes. I'll help you get things done efficiently.",
  "Task finished successfully. What shall we work on next?",
  "I've analyzed the code and have some suggestions for you.",
];

// ---------------------------------------------------------------------------
// Exported pure helpers (testable without blessed)

/**
 * Parse a piper voice ID into its components.
 * e.g. 'en_US-amy-medium' → { lang: 'en_US', name: 'amy', quality: 'medium' }
 *
 * @param {string} voiceId
 * @returns {{ lang: string, name: string, quality: string }}
 */
export function parseVoiceId(voiceId) {
  if (!voiceId) return { lang: 'unknown', name: 'unknown', quality: 'unknown' };
  // Expected format: <lang>-<name>-<quality>  e.g. en_US-amy-medium
  const match = voiceId.match(/^([a-z]{2}_[A-Z]{2})-(.+)-(low|medium|high)$/);
  if (!match) return { lang: 'unknown', name: voiceId, quality: 'unknown' };
  return { lang: match[1], name: match[2], quality: match[3] };
}

/**
 * Format a one-line voice info summary.
 *
 * @param {string} voiceId
 * @returns {string}
 */
export function formatVoiceInfo(voiceId) {
  const { lang, name, quality } = parseVoiceId(voiceId);
  if (lang === 'unknown') return `Voice: ${voiceId} | Provider: Piper`;
  return `Voice: ${name} | Language: ${lang} | Quality: ${quality} | Provider: Piper`;
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
 * Scan PIPER_VOICES_DIR for installed voice IDs.
 * Returns sorted list of voice IDs (without .onnx extension).
 *
 * @returns {string[]}
 */
function _scanInstalledVoices() {
  try {
    const files = fs.readdirSync(PIPER_VOICES_DIR);
    return files
      .filter(f => f.endsWith('.onnx') && !f.endsWith('.onnx.json'))
      .map(f => f.replace(/\.onnx$/, ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Get favorites array from config.
 * @param {object} configService
 * @returns {string[]}
 */
function _getFavorites(configService) {
  const favs = configService.getConfig().favorites;
  return Array.isArray(favs) ? favs : [];
}

/**
 * Toggle a voice in the favorites list.
 * @param {object} configService
 * @param {string} voiceId
 */
function _toggleFavorite(configService, voiceId) {
  const favs = _getFavorites(configService);
  const idx = favs.indexOf(voiceId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(voiceId);
  }
  configService.set('favorites', favs);
}

// ---------------------------------------------------------------------------

/**
 * Create the Voices tab component.
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @param {import('../../services/config-service.js').ConfigService}   services.configService
 * @param {import('../../services/provider-service.js').ProviderService} services.providerService
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createVoicesTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService } = services;

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
    content: `{#00897b-fg}── Installed Voices ${'─'.repeat(49)}{/#00897b-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Search input

  blessed.text({
    parent: box,
    top: 3,
    left: 4,
    content: 'Search:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const searchBox = blessed.textbox({
    parent: box,
    top: 3,
    left: 13,
    width: 40,
    height: 1,
    inputOnFocus: true,
    keys: true,
    style: {
      fg: COLORS.valueFg,
      bg: '#1a237e',
      focus: { bg: '#283593' },
    },
  });

  // -------------------------------------------------------------------------
  // Voice list

  const voiceList = blessed.list({
    parent: box,
    top: 5,
    left: 2,
    width: '96%',
    height: '50%',
    keys: true,
    vi: true,
    mouse: true,
    border: { type: 'line' },
    scrollbar: { ch: '│', style: { fg: COLORS.sectionHdr } },
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
      selected: { bg: '#1a237e', fg: COLORS.activeFg, bold: true },
      item: { fg: COLORS.labelFg },
    },
  });

  // -------------------------------------------------------------------------
  // Info panel

  blessed.text({
    parent: box,
    top: '60%',
    left: 2,
    content: `{#00897b-fg}── Voice Info ${'─'.repeat(54)}{/#00897b-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const infoLine = blessed.text({
    parent: box,
    top: '65%',
    left: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const previewLine = blessed.text({
    parent: box,
    top: '70%',
    left: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.activeFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Playback state

  let _playingProcess = null;
  let _playingVoiceId = null;

  function _killPlayingProcess() {
    if (_playingProcess && !_playingProcess.killed) {
      try { _playingProcess.kill('SIGTERM'); } catch {}
    }
    _playingProcess = null;
  }

  /**
   * Preview a voice by synthesizing a sample phrase with piper.
   * Second call with the same voice stops playback (toggle).
   */
  function _previewVoice(voiceId) {
    // Toggle: second press stops
    if (_playingVoiceId === voiceId) {
      _killPlayingProcess();
      _playingVoiceId = null;
      previewLine.setContent('');
      screen.render();
      return;
    }

    // Kill any current preview
    _killPlayingProcess();

    // Validate model path stays within PIPER_VOICES_DIR
    const voicePath = path.resolve(PIPER_VOICES_DIR, voiceId + '.onnx');
    const safeBase = path.resolve(PIPER_VOICES_DIR);
    if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) {
      return;
    }

    const tempWav = path.join(os.tmpdir(), `agentvibes-preview-${Date.now()}.wav`);
    const phrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];

    // Synthesize via piper using stdin (no shell injection)
    const piper = spawn('piper', ['--model', voicePath, '--output_file', tempWav], {
      stdio: ['pipe', 'ignore', 'ignore'],
    });
    piper.stdin.write(phrase);
    piper.stdin.end();

    _playingProcess = piper;
    _playingVoiceId = voiceId;

    previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Synthesizing: ${voiceId}…{/${COLORS.activeFg}-fg}`);
    screen.render();

    piper.on('exit', (code) => {
      if (_playingVoiceId !== voiceId) {
        // Stopped by user before synthesis finished
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }

      if (code !== 0) {
        _playingVoiceId = null;
        _playingProcess = null;
        previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Preview failed (piper error){/${COLORS.activeFg}-fg}`);
        screen.render();
        return;
      }

      // Play the synthesized wav
      const cmd = `play "${tempWav}" 2>/dev/null || aplay "${tempWav}" 2>/dev/null`;
      const playProc = spawn('sh', ['-c', cmd], { stdio: 'ignore', detached: false });
      _playingProcess = playProc;

      previewLine.setContent(`{${COLORS.activeFg}-fg}♪ Playing: ${voiceId}  (press Enter/Space again to stop){/${COLORS.activeFg}-fg}`);
      screen.render();

      playProc.on('exit', () => {
        if (_playingVoiceId === voiceId) {
          _playingVoiceId = null;
          _playingProcess = null;
          previewLine.setContent('');
          screen.render();
        }
        try { fs.unlinkSync(tempWav); } catch {}
      });

      playProc.on('error', () => {
        _playingVoiceId = null;
        _playingProcess = null;
        previewLine.setContent('');
        try { fs.unlinkSync(tempWav); } catch {}
      });
    });

    piper.on('error', () => {
      _playingVoiceId = null;
      _playingProcess = null;
      previewLine.setContent('');
    });
  }

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

  const switchBtn = _createBtn('[Switch Voice]', () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      providerService.setActiveVoice(selected);
      refreshDisplay();
    }
  });
  switchBtn.bottom = 4;
  switchBtn.left = 4;

  const favoriteBtn = _createBtn('[★ Favorite]', () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      _toggleFavorite(configService, selected);
      refreshDisplay();
    }
  });
  favoriteBtn.bottom = 4;
  favoriteBtn.left = 22;

  const installBtn = _createBtn('[Install More...]', () => {
    const notice = blessed.text({
      parent: box,
      top: 'center',
      left: 'center',
      content: 'Use /audio-browser to browse and install 914+ voices',
      tags: true,
      style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
    });
    screen.render();
    setTimeout(() => { notice.destroy(); screen.render(); }, 3000);
  });
  installBtn.bottom = 4;
  installBtn.left = 38;

  // -------------------------------------------------------------------------
  // State

  let _allVoices = [];
  let _filterText = '';

  function _getFilteredVoices() {
    if (!_filterText) return _allVoices;
    const f = _filterText.toLowerCase();
    return _allVoices.filter(v => v.toLowerCase().includes(f));
  }

  function _buildListItems(voices, active, favorites) {
    return voices.map(v => {
      const isFav    = favorites.includes(v);
      const isActive = v === active;
      const isPrev   = v === _playingVoiceId;
      const star = isFav  ? '★' : ' ';
      const dot  = isPrev ? '♪' : (isActive ? '●' : ' ');
      return ` ${star}${dot} ${v}`;
    });
  }

  function refreshDisplay() {
    _allVoices = _scanInstalledVoices();
    const active = providerService.getActiveVoiceId();
    const favorites = _getFavorites(configService);
    const filtered = _getFilteredVoices();
    const items = _buildListItems(filtered, active, favorites);

    voiceList.setItems(items.length > 0 ? items : [' (no voices found — install piper first)']);

    // Update info panel for currently selected item
    const sel = filtered[voiceList.selected] ?? active ?? '';
    infoLine.setContent(`  ${formatVoiceInfo(sel)}`);

    screen.render();
  }

  // -------------------------------------------------------------------------
  // Search box interaction

  searchBox.on('keypress', () => {
    // Update filter after keystroke
    setTimeout(() => {
      _filterText = searchBox.getValue().trim();
      refreshDisplay();
    }, 0);
  });

  // Pressing Escape in search returns focus to voiceList
  searchBox.key(['escape'], () => {
    voiceList.focus();
    screen.render();
  });

  // Pressing '/' in voiceList focuses search box
  voiceList.key(['/'], () => {
    searchBox.clearValue();
    searchBox.focus();
    screen.render();
  });

  // 'f' in voiceList toggles favorite
  voiceList.key(['f'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      _toggleFavorite(configService, selected);
      refreshDisplay();
    }
  });

  // Enter / Space → preview voice (toggle: second press stops playback)
  voiceList.key(['enter', 'space'], () => {
    const voices = _getFilteredVoices();
    const selected = voices[voiceList.selected];
    if (selected) {
      _previewVoice(selected);
      refreshDisplay();
    }
  });

  // Update info panel when selection changes
  voiceList.on('select item', () => {
    const voices = _getFilteredVoices();
    const sel = voices[voiceList.selected] ?? '';
    infoLine.setContent(`  ${formatVoiceInfo(sel)}`);
    screen.render();
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
      _killPlayingProcess();
      _playingVoiceId = null;
      previewLine.setContent('');
      box.hide();
      screen.render();
    },

    onFocus() {
      voiceList.focus();
      screen.render();
    },

    onBlur() {
      _killPlayingProcess();
      _playingVoiceId = null;
    },

    getFooterText() {
      return FOOTER_TEXT;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },
  };
}
