/**
 * AgentVibes TUI — Shared Widget: Personality Picker
 *
 * Inline modal list for selecting voice personalities with TTS preview.
 * Extracted from settings-tab.js for reuse across tabs.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { destroyList } from './destroy-list.js';
import { buildAudioEnv } from '../audio-env.js';
import { BRAND_PINK } from '../brand-colors.js';
import { PERSONALITY_EMOJIS, PERSONALITIES } from '../constants/personalities.js';

export { PERSONALITY_EMOJIS, PERSONALITIES };

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

const _modalTitle = (text) => ` {${BRAND_PINK}-fg}${text}{/${BRAND_PINK}-fg} `;

const PERSONALITY_PREVIEW_PHRASES = Object.freeze({
  angry:        "UNACCEPTABLE! This build time is a DISASTER! Fix it NOW or so help me!",
  annoying:     "Oh oh oh! Can I tell you something? Can I? Can I? PLEASE? It is so important!",
  crass:        "Well damn, that code runs like my uncle's truck. Barely, and it smells funny.",
  dramatic:     "The tests... have failed. I don't know how much longer I can do this.",
  'dry-humor':  "Your code worked. I too am surprised.",
  flirty:       "Ooh, a clean merge? You know exactly how to make my heart race.",
  funny:        "Why do programmers hate nature? Too many bugs. I will show myself out.",
  grandpa:      "Back in my day, we compiled by hand. Uphill. In the snow. Both ways.",
  millennial:   "I literally cannot even with this error. I am so done. Like, actually deceased.",
  moody:        "...It works. Whatever. Do not get used to it.",
  pirate:       "Arrr! The build be sailin' smooth today, matey! No barnacles in sight!",
  poetic:       "Like rivers to the sea, your code flows toward eventual compilation.",
  professional: "I have completed the requested task and am prepared to document outcomes.",
  rapper:       "Yo! Clean code flowin', tests are glowin', no bugs showin'!",
  robot:        "TASK COMPLETE. EFFICIENCY: OPTIMAL. PROBABILITY OF SUCCESS: 97.3 PERCENT. BEEP.",
  sarcastic:    "Oh wow, another bug. What a completely unexpected surprise. Truly shocking.",
  sassy:        "Honey, whoever told you that was good code was not your friend.",
  'surfer-dude':"Duuude! That commit totally shredded! Gnarly clean code, bro!",
  zen:          "The bug is not the enemy. The bug is the teacher. Breathe. Commit.",
  random:       "Who will I be today? Even I do not know. Expect the unexpected.",
});

/**
 * Open the personality picker modal.
 *
 * @param {object}   screen             - blessed screen
 * @param {string}   currentPersonality - current personality value
 * @param {Function} onSelect           - called with selected personality
 * @param {Function} [onClose]          - called after modal closes
 */
export function openPersonalityPicker(screen, currentPersonality, onSelect, onClose) {
  const current = currentPersonality ?? 'none';
  const currentIdx = Math.max(0, PERSONALITIES.indexOf(current));

  const COLORS = {
    btnFocus: '#2e7d32',
    btnFocusFg: '#ffffff',
  };

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 44,
    height: Math.min(PERSONALITIES.length + 4, 22),
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Select Personality'),
    items: PERSONALITIES.map((p, i) => {
      const emoji = PERSONALITY_EMOJIS[p] ?? '✨';
      const label = p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1);
      const mark  = i === currentIdx ? '✅' : '   ';
      return `${mark} ${emoji} ${label}`;
    }),
    keys: true,
    vi: true,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  list.select(currentIdx);
  list.focus();
  screen.render();

  // TTS preview on hover
  let _pickerTtsProc = null;
  let _playingItemIdx = -1;

  function _setItemPlaying(idx, playing) {
    const item = list.items?.[idx];
    if (!item) return;
    const base = (item.content ?? '').replace(/ █$/, '').replace(/ \(playing\)$/, '');
    item.setContent(playing ? `${base} (playing)` : base);
  }

  function _killPickerTts() {
    if (_pickerTtsProc) {
      const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      if (_isWin) {
        try { _pickerTtsProc.kill(); } catch {}
      } else {
        try { process.kill(-_pickerTtsProc.pid, 'SIGTERM'); } catch {}
      }
      _pickerTtsProc = null;
    }
    if (_playingItemIdx >= 0) {
      _setItemPlaying(_playingItemIdx, false);
      _playingItemIdx = -1;
    }
  }

  function _speakPreview(personality) {
    _killPickerTts();
    const phrase = PERSONALITY_PREVIEW_PHRASES[personality];
    if (!phrase) return;
    const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
    const _env = buildAudioEnv();
    if (_isWin) {
      // Prefer project-local install, fall back to global ~/.claude install
      const _cwdScript = path.join(process.cwd(), '.claude', 'hooks-windows', 'play-tts.ps1');
      const _homeScript = path.join(os.homedir(), '.claude', 'hooks-windows', 'play-tts.ps1');
      const ttsScript = fs.existsSync(_cwdScript) ? _cwdScript : _homeScript;
      _pickerTtsProc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ttsScript, phrase], {
        stdio: 'ignore',
        env: _env,
      });
    } else {
      const ttsScript = path.join(process.cwd(), '.claude', 'hooks', 'play-tts.sh');
      _pickerTtsProc = spawn('bash', [ttsScript, phrase], {
        stdio: 'ignore',
        detached: true,
        env: _env,
      });
    }
    _playingItemIdx = list.selected;
    _setItemPlaying(_playingItemIdx, true);
    screen.render();
    _pickerTtsProc.on('exit', () => {
      if (_playingItemIdx >= 0) {
        _setItemPlaying(_playingItemIdx, false);
        _playingItemIdx = -1;
        screen.render();
      }
      _pickerTtsProc = null;
    });
    _pickerTtsProc.on('error', () => {
      _pickerTtsProc = null;
      if (_playingItemIdx >= 0) {
        _setItemPlaying(_playingItemIdx, false);
        _playingItemIdx = -1;
        screen.render();
      }
    });
    _pickerTtsProc.unref();
  }

  list.on('select item', () => {
    _speakPreview(PERSONALITIES[list.selected]);
  });

  list.key(['space'], () => {
    if (_pickerTtsProc && _playingItemIdx === list.selected) {
      _killPickerTts();
    } else {
      _speakPreview(PERSONALITIES[list.selected]);
    }
  });

  // Type-to-jump
  const _jumpBlocked = new Set(['j', 'k', 'g', 'h', 'l', 'd', 'u', 'q']);
  list.on('keypress', (ch, key) => {
    if (!ch || key.ctrl || key.meta) return;
    const lower = ch.toLowerCase();
    if (!/^[a-z]$/.test(lower)) return;
    if (_jumpBlocked.has(lower)) return;
    const count = PERSONALITIES.length;
    const start = list.selected ?? 0;
    for (let i = 1; i <= count; i++) {
      const idx = (start + i) % count;
      if (PERSONALITIES[idx].startsWith(lower)) {
        list.select(idx);
        screen.render();
        break;
      }
    }
  });

  list.key(['enter'], () => {
    const selected = PERSONALITIES[list.selected];
    if (!selected) return;
    _killPickerTts();
    // Call onSelect before destroying to avoid stale-state re-renders
    onSelect(selected);
    destroyList(list, screen, onClose);
  });

  list.key(['escape', 'q'], () => {
    _killPickerTts();
    destroyList(list, screen, onClose);
  });
}
