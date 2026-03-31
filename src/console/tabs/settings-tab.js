/**
 * AgentVibes TUI Console — Settings Tab
 * Stories 7.1 (Provider & Voice) + 7.2 (Audio Effects)
 *
 * Implements the Tab Component Contract:
 *   createSettingsTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Groups 1-2 implemented. Groups 3-5 added in stories 7.3-7.5.
 * Button-level focus navigation (↑↓←→) implemented in story 7.6.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import {
  PIPER_VOICES_DIR, COL_NAME_W, COL_GENDER_W, SAMPLE_PHRASES,
  parseVoiceId, parseMultiSpeaker, scanInstalledVoices, getVoiceMeta, getFavorites, toggleFavorite,
} from './voices-tab.js';
import { formatTrackLabel, scanTracks, getMusicFavorites, toggleMusicFavorite, applyTrackToAudioEffects } from './music-tab.js';
import { BRAND_PINK, BRAND_BLUE } from '../brand-colors.js';
import { buildAudioEnv, detectMp3Player, detectWavPlayer } from '../audio-env.js';
import { destroyList } from '../widgets/destroy-list.js';
import { openReverbPicker } from '../widgets/reverb-picker.js';
import { openPersonalityPicker } from '../widgets/personality-picker.js';
import { PERSONALITY_EMOJIS } from '../constants/personalities.js';
import { formatTrackName as _sharedFormatTrackName, formatReverbState as _sharedFormatReverbState } from '../widgets/format-utils.js';
import { showNotice as _showNoticeWidget } from '../widgets/notice.js';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';
const _IS_WINDOWS = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;

/** Resolve piper binary path — uses exe on Windows, 'piper' in PATH on Unix */
function _resolvePiperBin() {
  if (_IS_WINDOWS) {
    const lad = process.env.LOCALAPPDATA ||
      (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
    if (lad) {
      // Standalone binary install
      const exe = path.join(lad, 'Programs', 'Piper', 'piper.exe');
      if (fs.existsSync(exe)) return exe;
      // pip-installed piper (Python Scripts directory)
      const pyScripts = path.join(lad, 'Programs', 'Python');
      try {
        const pyDirs = fs.readdirSync(pyScripts).filter(d => d.startsWith('Python'));
        for (const d of pyDirs) {
          const pipExe = path.join(pyScripts, d, 'Scripts', 'piper.exe');
          if (fs.existsSync(pipExe)) return pipExe;
        }
      } catch { /* no Python installs */ }
    }
  }
  return 'piper';
}

/** Build spawn options with Windows-safe defaults (no visible console, no detached) */
function _spawnOpts(env, extraOpts = {}) {
  return { stdio: 'ignore', detached: !_IS_WINDOWS, windowsHide: true, env, ...extraOpts };
}

// Sanitize strings before passing as env vars to shell commands.
// Removes characters that could cause shell injection when expanded inside sh -c.
function _sanitizeForShell(str) {
  return str.replace(/[`$\\(){}!]/g, '');
}

// Lazy-load blessed only in non-test mode (avoids screen requirement in tests)
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------
// Brand colours (matches architecture.md + UX design plan)

// Modal label helper — wraps text in BRAND_PINK for consistent modal titles
const _modalTitle = (text) => ` {${BRAND_PINK}-fg}${text}{/${BRAND_PINK}-fg} `;

const COLORS = {
  contentBg:    '#0a0e1a',  // Near-black content background
  sectionHdr:   'bright-cyan',  // Matches header "Agent" color
  labelFg:      '#e3f2fd',  // Light blue text — labels
  valueFg:      '#ffff00',  // Yellow — current values
  btnDefault:   '#37474f',  // Dark slate — default button bg
  btnFocus:     '#2e7d32',  // Green — focused/selected button bg
  btnFocusFg:   '#ffffff',  // White — focused button text
  btnPress:     '#ff00ff',  // Magenta — pressed button bg
  btnChange:    '#37474f',  // Dark slate — Change buttons
  btnTest:      '#37474f',  // Dark slate — Test buttons
  btnEdit:      '#37474f',  // Dark slate — Edit buttons
  btnEnableOn:  '#37474f',  // Dark slate — Enabled toggle
  btnEnableOff: '#37474f',  // Dark slate — Disabled toggle
  borderFg:     'bright-cyan',  // Matches section headers
  footerBg:     '#2196f3',  // Blue — settings footer
  noticeFg:     '#90a4ae',  // Gray — stub notice text
};

const FOOTER_TEXT =
  '[↑↓] Group  [←→] Sibling/Sub-tab  [Enter/Space] Activate  [Tab] Switch Tab  [Q] Quit';

// Default effects — single source of truth (used by _getEffects, _setEffects, refreshDisplay)
const EFFECTS_DEFAULTS = Object.freeze({ reverbPreset: 'light' });

// Default background music config
const MUSIC_DEFAULTS = Object.freeze({ enabled: false, track: 'agentvibes_soft_flamenco_loop.mp3', volume: 70 });

// Verbosity display labels
const VERBOSITY_LABELS = Object.freeze({ high: 'High', medium: 'Medium', low: 'Low', minimal: 'Minimal', custom: 'Custom' });

// Personality emojis and names imported from src/console/constants/personalities.js
// (via the import at the top of this file)

// Human-readable track display names — moved to shared widgets/format-utils.js
// TRACK_NAMES constant removed (M1 dedup). Use formatTrackName() instead.

// Built-in track list for the picker (fallback when tracks dir is missing)
const BUILT_IN_TRACKS = [
  { label: '🎻 Soft Flamenco',  file: 'agentvibes_soft_flamenco_loop.mp3' },
  { label: '🌸 Bossa Nova',     file: 'agent_vibes_bossa_nova_v2_loop.mp3' },
  { label: '🌊 Chillwave',      file: 'agent_vibes_chillwave_v2_loop.mp3' },
  { label: '🪘 Gnawa Ambient',  file: 'agent_vibes_ganawa_ambient_v2_loop.mp3' },
];

// ---------------------------------------------------------------------------
// Exported format helpers (pure functions — used by tests and UI)

/**
 * @param {string} preset - 'off' | 'light' | 'medium' | 'heavy' | 'cathedral'
 * @returns {string}
 */
export const formatReverbState = _sharedFormatReverbState;

/**
 * @param {boolean} enabled
 * @returns {string}
 */
export function formatMusicState(enabled) {
  return enabled ? 'Enabled' : 'Disabled';
}

/**
 * @param {number} volume - integer 10–100
 * @returns {string}
 */
export function formatVolume(volume) {
  const v = typeof volume === 'number' && !isNaN(volume) ? volume : MUSIC_DEFAULTS.volume;
  return `${Math.max(10, Math.min(100, v))}%`;
}

/**
 * @param {string} track - filename (e.g. 'agentvibes_soft_flamenco_loop.mp3')
 * @returns {string}
 */
export const formatTrackName = _sharedFormatTrackName;

/**
 * @param {string} verbosity - 'high' | 'medium' | 'low'
 * @returns {string}
 */
export function formatVerbosity(verbosity) {
  return VERBOSITY_LABELS[verbosity] ?? 'High';
}

/**
 * @param {string} personality
 * @returns {string}
 */
export function formatPersonality(personality) {
  const name  = personality || 'none';
  const emoji = PERSONALITY_EMOJIS[name] ?? '✨';
  const label = name === 'none' ? 'None' : name.charAt(0).toUpperCase() + name.slice(1);
  return `${emoji} ${label}`;
}

/**
 * @param {string} pretext - intro text (max 50 chars from installer)
 * @returns {string}
 */
export function formatIntroText(pretext) {
  if (!pretext) return '(none)';
  return pretext.length > 30 ? pretext.slice(0, 30) + '…' : pretext;
}

// ---------------------------------------------------------------------------
// Test stub — returned in AGENTVIBES_TEST_MODE to avoid blessed widgets

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
 * Create the Settings tab component.
 * Follows the Tab Component Contract defined in architecture.md.
 *
 * @param {object} screen   - Blessed screen instance (or test stub)
 * @param {object} services
 * @param {import('../../services/config-service.js').ConfigService}  services.configService
 * @param {import('../../services/provider-service.js').ProviderService} services.providerService
 * @returns {{ box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }}
 */
export function createSettingsTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const { configService, providerService, navigationService, focusMainTabBar, focusFirstHeaderItem, focusLastHeaderItem, updateHeaderStatus } = services;

  // Playback state for the voice sample button
  let _sampleProcess = null;
  let _samplePlaying = false;

  // soprano-manager.sh wait-proc — tracked separately so killing it does NOT kill soprano-webui
  let _sopranoMgrProc = null;

  // Soprano WebUI status glyph — updated asynchronously when provider is soprano
  let _sopranoStatusGlyph = '';
  let _sopranoStatusProc  = null;

  const _sampleEnv = buildAudioEnv();

  const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  const SPINNER_PROCESSING_BG = '#00838f';  // teal — distinct from blue default and cyan focus

  // Single-button spinner (▶ Play, music Test)
  let _spinnerTimer = null;
  let _spinnerIdx   = 0;
  let _spinnerBtn   = null;

  function _startSpinner(btn, label) {
    _stopSpinner();  // Clear any running spinner so label updates don't leak intervals
    _spinnerBtn = btn;
    _spinnerIdx = 0;
    btn.style.bg = SPINNER_PROCESSING_BG;
    btn.setContent(`${SPINNER_FRAMES[0]} ${label}`);
    screen.render();
    _spinnerTimer = setInterval(() => {
      _spinnerIdx = (_spinnerIdx + 1) % SPINNER_FRAMES.length;
      btn.setContent(`${SPINNER_FRAMES[_spinnerIdx]} ${label}`);
      screen.render();
    }, 100);
  }

  function _stopSpinner() {
    if (_spinnerTimer) { clearInterval(_spinnerTimer); _spinnerTimer = null; }
    if (_spinnerBtn)   { _spinnerBtn.style.bg = COLORS.btnDefault; _spinnerBtn = null; }
  }

  // Multi-button spinner for _testBtns (reverb Test + Full Preview — each keeps its own label)
  let _testSpinnerTimer = null;
  let _testSpinnerIdx   = 0;
  // Populated alongside _testBtns so we know each button's rest label
  const _testBtnLabels  = new Map();

  function _startTestSpinner() {
    _testSpinnerIdx = 0;
    for (const b of _testBtns) {
      b.style.bg = SPINNER_PROCESSING_BG;
      b.setContent(`${SPINNER_FRAMES[0]} ${_testBtnLabels.get(b) ?? '▶ Preview'}`);
    }
    screen.render();
    _testSpinnerTimer = setInterval(() => {
      _testSpinnerIdx = (_testSpinnerIdx + 1) % SPINNER_FRAMES.length;
      for (const b of _testBtns) {
        b.setContent(`${SPINNER_FRAMES[_testSpinnerIdx]} ${_testBtnLabels.get(b) ?? '▶ Preview'}`);
      }
      screen.render();
    }, 100);
  }

  function _stopTestSpinner() {
    if (_testSpinnerTimer) { clearInterval(_testSpinnerTimer); _testSpinnerTimer = null; }
    for (const b of _testBtns) { b.style.bg = COLORS.btnDefault; }
  }

  function _killSample() {
    _stopSpinner();
    // Kill manager wait-proc with direct SIGTERM (NOT process group) so soprano-webui keeps running
    if (_sopranoMgrProc) {
      try { _sopranoMgrProc.kill('SIGTERM'); } catch {}
      _sopranoMgrProc = null;
    }
    if (_sampleProcess) {
      if (_IS_WINDOWS) {
        try { _sampleProcess.kill(); } catch {}
      } else {
        try { process.kill(-_sampleProcess.pid, 'SIGTERM'); } catch {}
      }
      _sampleProcess = null;
    }
    _samplePlaying = false;
  }

  // Test button state (shared for reverb [Test])
  let _testActive       = false;
  let _testMusicProc    = null;
  let _testVoiceProc    = null;
  let _testTimeout      = null;
  let _testInitiatorBtn = null;  // button that started the current test (restored on completion)
  const _testBtns       = [];  // populated after button creation

  // Music-only test state (background music [Test] — no voice synthesis)
  let _musicTestActive = false;
  let _musicTestProc   = null;

  // Config Storage snapshot — taken when tab is shown, used by Cancel Changes
  let _snapshotGlobal = null;
  let _snapshotLocal  = null;

  function _captureSnapshot() {
    try {
      _snapshotGlobal = JSON.parse(JSON.stringify(configService.getGlobalConfig()));
      const local = configService.getProjectConfig();
      _snapshotLocal = local ? JSON.parse(JSON.stringify(local)) : null;
    } catch {
      _snapshotGlobal = {};
      _snapshotLocal  = null;
    }
  }

  const _testEnv = buildAudioEnv();

  function _killTest() {
    _stopTestSpinner();
    if (_testTimeout)   { clearTimeout(_testTimeout); _testTimeout = null; }
    if (_testMusicProc) { try { _IS_WINDOWS ? _testMusicProc.kill() : process.kill(-_testMusicProc.pid, 'SIGTERM'); } catch {} _testMusicProc = null; }
    if (_testVoiceProc) { try { _IS_WINDOWS ? _testVoiceProc.kill() : process.kill(-_testVoiceProc.pid, 'SIGTERM'); } catch {} _testVoiceProc = null; }
    _testActive = false;
    _testInitiatorBtn = null;
    // Restore spinner labels to defaults (may have been overridden for soprano 'Loading model…')
    _testBtnLabels.set(reverbTestBtn,      '▶ Preview');
    _testBtnLabels.set(personalityTestBtn, '▶ Preview');
    _testBtnLabels.set(fullPreviewBtn,     '▶ Full Preview');
  }

  function _setTestBtnsLabel(label) {
    for (const b of _testBtns) { b.setContent(label); }
    screen.render();
  }

  // Restore each test button to its individual default label (from _testBtnLabels map).
  // Replaces the old _restoreTestBtnsLabels() pattern which stomped on non-'Test' labels.
  function _restoreTestBtnsLabels() {
    for (const b of _testBtns) b.setContent(_testBtnLabels.get(b) ?? '▶ Preview');
    screen.render();
  }

  // Read a random example response from the personality's .md file.
  // Returns null when no personality is set or the file can't be parsed.
  function _getPersonalityPhrase(personality) {
    if (!personality || personality === 'none' || personality === 'normal') return null;
    if (personality.includes('..') || personality.includes('/') || personality.includes('\\')) return null;
    try {
      const file = path.join(process.cwd(), '.claude', 'personalities', personality + '.md');
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      const examples = lines
        .filter(l => /^\s*- "/.test(l))
        .map(l => l.trim().replace(/^- "/, '').replace(/"$/, '').trim())
        .filter(Boolean);
      return examples.length ? examples[Math.floor(Math.random() * examples.length)] : null;
    } catch { return null; }
  }

  const _TEST_GREETINGS = [
    'Hey', 'Hi there', 'Hello', 'Hey there', 'Howdy', 'Greetings', 'What\'s up',
  ];

  function _testGreeting() {
    return _TEST_GREETINGS[Math.floor(Math.random() * _TEST_GREETINGS.length)];
  }

  function _buildPreviewPhrase() {
    const cfg       = configService.getConfig();
    const provider  = providerService.getActiveProvider();
    const _rawVoice = providerService.getActiveVoiceId() ?? 'unknown';
    const _msV = parseMultiSpeaker(_rawVoice);
    const voice     = provider === 'soprano' ? 'Soprano' : (_msV.isMultiSpeaker ? _msV.speakerName : _rawVoice);

    const effects      = cfg.effects ?? {};
    const reverbOn     = effects.reverb !== false;
    const reverbPreset = effects.reverbPreset ?? 'light';

    const music      = cfg.backgroundMusic ?? {};
    const musicOn    = music.enabled !== false;
    const trackLabel = _stripLeadingEmoji(formatTrackName(music.track ?? ''));

    const personality = (cfg.personality ?? '').trim();
    const hasPersonality = personality && personality !== 'none' && personality !== 'normal';

    const parts = [];
    parts.push(`${_testGreeting()}.`);
    parts.push('Agent Vibes here.');

    let voicePart = `I am ${voice}`;
    if (hasPersonality) voicePart += `, with ${personality} personality`;
    voicePart += ',';
    parts.push(voicePart);

    if (reverbOn) parts.push(`reverb set at ${reverbPreset},`);
    else          parts.push('reverb off,');

    if (musicOn) parts.push(`and background music set to ${trackLabel}.`);
    else         parts.push('and background music off.');

    return parts.join(' ');
  }

  // withMusic=true → Full Preview (voice + reverb + background track)
  // withMusic=false → Reverb Test (voice + reverb only, no background music)
  // phraseOverride → speak this text instead of the full _buildPreviewPhrase() summary
  function _runTest(withMusic = true, phraseOverride = null) {
    if (_testActive) { _killTest(); _restoreTestBtnsLabels(); return; }

    _testActive = true;
    _testInitiatorBtn = _buttons[_currentIdx];
    _startTestSpinner();

    // Prefer the settings-tab key (backgroundMusic) over the music-tab key (music)
    const musicCfg = configService.getConfig().backgroundMusic
      ?? configService.getConfig().music
      ?? {};
    const trackId   = musicCfg.track ?? 'agentvibes_soft_flamenco_loop.mp3';
    const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
    const trackPath = path.resolve(tracksDir, trackId);
    const safeMusic = path.resolve(tracksDir);

    // Start background music loop (Full Preview only — not reverb Test)
    if (withMusic) {
      const trackExists = (trackPath.startsWith(safeMusic + path.sep) || trackPath === safeMusic)
        && (() => { try { fs.accessSync(trackPath); return true; } catch { return false; } })();
      if (trackExists) {
        const vol         = musicCfg.volume ?? MUSIC_DEFAULTS.volume;
        const volFraction = (Math.max(10, Math.min(100, vol)) / 100).toFixed(2);
        const musicCmd = [
          `ffplay -nodisp -loop 0 -loglevel quiet -volume ${vol} "${trackPath}"`,
          `play "${trackPath}" repeat 9999 vol ${volFraction}`,
          `mpg123 -q --loop -1 "${trackPath}"`,
        ].join(' 2>/dev/null || ') + ' 2>/dev/null';
        if (_IS_WINDOWS) {
          const _clampedVol = Math.max(10, Math.min(100, vol));
          _testMusicProc = spawn('ffplay', ['-nodisp', '-loop', '0', '-loglevel', 'quiet', '-volume', String(_clampedVol), trackPath], _spawnOpts(_testEnv));
          _testMusicProc.on('error', () => { _testMusicProc = null; });
        } else {
          _testMusicProc = spawn('sh', ['-c', musicCmd], _spawnOpts(_testEnv));
        }
        _testMusicProc?.unref();
      }
    }

    // Lead-in before voice synthesis.
    // Soprano CLI loads the neural model fresh each call (cold-start: 5–120s depending on hardware).
    // No artificial delay needed — music will be playing well before synthesis completes.
    // The spinner label is updated to "Loading model…" so the user knows it's working.
    const provider   = providerService.getActiveProvider();
    const leadInMs   = provider === 'soprano' ? 0 : 2000;
    if (provider === 'soprano') {
      // Use "Synthesizing…" when WebUI is already warm, "Loading model…" when cold.
      const sopranoLabel = _sopranoStatusGlyph === ' 🟢' ? 'Synthesizing…' : 'Loading model…';
      for (const b of _testBtns) _testBtnLabels.set(b, sopranoLabel);
      for (const b of _testBtns) b.setContent(`${SPINNER_FRAMES[0]} ${sopranoLabel}`);
      screen.render();
    }
    _testTimeout = setTimeout(() => {
      _testTimeout = null;
      if (!_testActive) return;

      const provider  = providerService.getActiveProvider();  // re-read (may have changed)
      const tempWav   = path.join(os.tmpdir(), `agentvibes-test-${Date.now()}.wav`);
      const ttsInput  = phraseOverride ?? _buildPreviewPhrase();

      let synthProc;
      if (provider === 'soprano') {
        const port    = process.env.SOPRANO_PORT || '7860';
        const synther = path.resolve(new URL(import.meta.url).pathname,
          '..', '..', '..', '..', '.claude', 'hooks', 'soprano-gradio-synth.py');
        const sopranoEnv = {
          ...(_testEnv),
          _AV_PHRASE:  _sanitizeForShell(ttsInput),
          _AV_WAV:     tempWav,
          _AV_SYNTHER: synther,
          _AV_PORT:    String(port),
        };
        // Mirror the Play button: try Gradio WebUI → OpenAI-compat API → CLI fallback.
        // This keeps the model warm instead of cold-loading it on every Test press.
        const cmd = [
          `python3 "$_AV_SYNTHER" "$_AV_PHRASE" "$_AV_WAV" "$_AV_PORT" 2>/dev/null`,
          `curl -sf --max-time 30 "http://127.0.0.1:$_AV_PORT/v1/audio/speech"` +
            ` -H "Content-Type: application/json"` +
            ` -d "{\\"input\\":\\"$_AV_PHRASE\\"}" --output "$_AV_WAV" 2>/dev/null`,
          `soprano "$_AV_PHRASE" -o "$_AV_WAV"`,
        ].join(' || ');
        synthProc = spawn('sh', ['-c', cmd], {
          stdio: 'ignore', detached: !_IS_WINDOWS, windowsHide: true, env: sopranoEnv,
        });
      } else {
        const voiceId = providerService.getActiveVoiceId();
        if (!voiceId) { _killTest(); _restoreTestBtnsLabels(); return; }
        const _ms = parseMultiSpeaker(voiceId);
        const voicePath = path.resolve(PIPER_VOICES_DIR, _ms.model + '.onnx');
        const safePiper = path.resolve(PIPER_VOICES_DIR);
        if (!voicePath.startsWith(safePiper + path.sep) && voicePath !== safePiper) {
          _killTest(); _restoreTestBtnsLabels(); return;
        }
        const _piperArgs = ['--model', voicePath, '--output_file', tempWav];
        if (_ms.speakerId != null) _piperArgs.push('--speaker', String(_ms.speakerId));
        synthProc = spawn(_resolvePiperBin(), _piperArgs, {
          stdio: ['pipe', 'ignore', 'ignore'], detached: !_IS_WINDOWS, windowsHide: true, env: _testEnv,
        });
        synthProc.stdin.write(ttsInput + '\n');
        synthProc.stdin.end();
      }
      synthProc.unref();
      _testVoiceProc = synthProc;

      synthProc.on('exit', (code) => {
        if (!_testActive || code !== 0) {
          _killTest(); _restoreTestBtnsLabels();
          try { fs.unlinkSync(tempWav); } catch {}
          return;
        }

        // Apply reverb based on current preset (read from config)
        const preset = configService.getConfig().effects?.reverbPreset ?? EFFECTS_DEFAULTS.reverbPreset;

        let wavToPlay = tempWav;
        let processedWav = null;

        if (preset && preset !== 'off') {
          processedWav = path.join(os.tmpdir(), `agentvibes-test-fx-${Date.now()}.wav`);
          if (_IS_WINDOWS) {
            // Windows: use ffmpeg aecho (same filter as play-tts.ps1)
            const FFMPEG_REVERB = {
              light:     'aecho=0.8:0.88:60:0.4',
              medium:    'aecho=0.8:0.88:60|120:0.4|0.3',
              heavy:     'aecho=0.8:0.88:60|120|180:0.4|0.3|0.2',
              cathedral: 'aecho=0.8:0.88:100|200|300|400:0.3|0.25|0.2|0.15',
            };
            const filter = FFMPEG_REVERB[preset];
            if (filter) {
              spawnSync('ffmpeg', ['-y', '-i', tempWav, '-af', filter, processedWav], {
                stdio: 'ignore', timeout: 5000, env: _testEnv,
              });
            }
          } else {
            // Linux/macOS: use sox
            const SOX_REVERB = {
              light:    'reverb 20 50 50',
              medium:   'reverb 40 50 70',
              heavy:    'reverb 70 50 100',
              cathedral: 'reverb 90 30 100',
            };
            const soxFx = SOX_REVERB[preset];
            if (soxFx) {
              spawnSync('sox', [tempWav, processedWav, ...soxFx.split(' ')], {
                stdio: 'ignore', timeout: 5000, env: _testEnv,
              });
            }
          }
          // Use processed wav only if effect succeeded and file has content
          try {
            const _stat = fs.statSync(processedWav);
            if (_stat.size > 0) {
              wavToPlay = processedWav;
            } else {
              fs.unlinkSync(processedWav);
              processedWav = null;
            }
          } catch {
            processedWav = null;
          }
        }

        _stopTestSpinner();
        _setTestBtnsLabel('■ Stop');
        const _wavPlayer1 = detectWavPlayer(_testEnv);
        const playProc = _wavPlayer1
          ? spawn(_wavPlayer1.bin, _wavPlayer1.args(wavToPlay), _spawnOpts(_testEnv))
          : null;
        if (!playProc) { _killTest(); _restoreTestBtnsLabels(); return; }
        _testVoiceProc = playProc;
        playProc.on('exit', () => {
          const btn = _testInitiatorBtn;
          _killTest(); _restoreTestBtnsLabels();
          try { fs.unlinkSync(tempWav); } catch {}
          if (processedWav) { try { fs.unlinkSync(processedWav); } catch {} }
          if (btn && !btn.hidden) setImmediate(() => _focusButton(btn));
        });
        playProc.on('error', () => {
          const btn = _testInitiatorBtn;
          _killTest(); _restoreTestBtnsLabels();
          try { fs.unlinkSync(tempWav); } catch {}
          if (processedWav) { try { fs.unlinkSync(processedWav); } catch {} }
          if (btn && !btn.hidden) setImmediate(() => _focusButton(btn));
        });
      });

      synthProc.on('error', () => {
        const btn = _testInitiatorBtn;
        _killTest(); _restoreTestBtnsLabels();
        if (btn && !btn.hidden) setImmediate(() => _focusButton(btn));
      });
    }, leadInMs);
  }

  function _killMusicTest() {
    if (_musicTestProc) {
      if (_IS_WINDOWS) {
        try { _musicTestProc.kill(); } catch {}
      } else {
        try { process.kill(-_musicTestProc.pid, 'SIGTERM'); } catch {}
      }
      _musicTestProc = null;
    }
    _musicTestActive = false;
  }

  function _runMusicTest() {
    if (_musicTestActive) {
      _killMusicTest();
      musicTestBtn.setContent('▶ Preview');
      screen.render();
      return;
    }

    const musicCfg = configService.getConfig().backgroundMusic ?? MUSIC_DEFAULTS;
    if (!musicCfg.enabled) {
      // Show a small popup offering to enable music on the spot
      const modal = blessed.box({
        parent: screen, top: 'center', left: 'center', width: 46, height: 7,
        border: { type: 'line' },
        tags: true,
        label: _modalTitle('Background Music'),
        style: { bg: COLORS.contentBg, border: { fg: COLORS.btnFocus } },
      });
      blessed.text({
        parent: modal, top: 1, left: 2, tags: true,
        content: '{#e3f2fd-fg}Music is disabled. Enable it now?{/#e3f2fd-fg}',
        style: { bg: COLORS.contentBg },
      });
      function _closeConfirm() {
        modal.destroy();
        try {
          for (let r = 0; r < screen.height; r++)
            for (let c = 0; c < screen.width; c++)
              if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
        } catch {}
        _restoreFocus();
        screen.render();
      }
      const enableBtn = _createButton(modal, screen, 'Enable', COLORS, () => {
        _closeConfirm();
        _setMusic(configService, { enabled: true });
        refreshDisplay();
        _runMusicTest();
      });
      enableBtn.top = 4; enableBtn.left = 4;
      const cancelBtn = _createButton(modal, screen, 'Cancel', COLORS, _closeConfirm);
      cancelBtn.top = 4; cancelBtn.left = 16;
      modal.key(['escape', 'q'], _closeConfirm);
      enableBtn.key(['right', 'tab'], () => { cancelBtn.focus(); screen.render(); });
      cancelBtn.key(['left', 'S-tab'], () => { enableBtn.focus(); screen.render(); });
      modal.setFront();
      enableBtn.focus();
      screen.render();
      return;
    }
    const trackId  = musicCfg.track ?? MUSIC_DEFAULTS.track;
    const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
    const trackPath = path.resolve(tracksDir, trackId);
    const safeBase  = path.resolve(tracksDir);
    if (!trackPath.startsWith(safeBase + path.sep) && trackPath !== safeBase) return;

    _musicTestActive = true;

    // Apply volume: ffplay 0-100, sox vol 0.0-1.0
    const vol         = musicCfg.volume ?? MUSIC_DEFAULTS.volume;
    const volFraction = (Math.max(10, Math.min(100, vol)) / 100).toFixed(2);

    // Play up to 10 seconds of the track (music-only, no voice)
    const cmd = [
      `ffplay -nodisp -t 10 -loglevel quiet -volume ${vol} "${trackPath}"`,
      `play "${trackPath}" trim 0 10 vol ${volFraction}`,
      `mpg123 -q "${trackPath}"`,
    ].join(' 2>/dev/null || ') + ' 2>/dev/null';

    if (_IS_WINDOWS) {
      const _clampedVol2 = Math.max(10, Math.min(100, vol));
      _musicTestProc = spawn('ffplay', ['-nodisp', '-t', '10', '-loglevel', 'quiet', '-volume', String(_clampedVol2), trackPath], _spawnOpts(_testEnv));
      _musicTestProc.on('error', () => { _killMusicTest(); musicTestBtn.setContent('▶ Preview'); screen.render(); });
    } else {
      _musicTestProc = spawn('sh', ['-c', cmd], _spawnOpts(_testEnv));
    }
    _musicTestProc.unref();
    musicTestBtn.setContent('■ Stop');
    screen.render();

    _musicTestProc.on('exit', () => {
      if (_musicTestActive) {
        _killMusicTest();
        musicTestBtn.setContent('▶ Preview');
        _focusButton(musicTestBtn);
      }
    });
    _musicTestProc.on('error', () => {
      _killMusicTest();
      musicTestBtn.setContent('▶ Preview');
      _focusButton(musicTestBtn);
    });
  }

  // -------------------------------------------------------------------------
  // Audio destination helpers

  function _detectSshAliases() {
    try {
      const sshConfigPath = path.join(os.homedir(), '.ssh', 'config');
      const raw = fs.readFileSync(sshConfigPath, 'utf8');
      const aliases = [];
      for (const line of raw.split('\n')) {
        const m = line.match(/^Host\s+(\S+)/i);
        if (m && !m[1].includes('*') && !m[1].includes('?')) aliases.push(m[1]);
      }
      return aliases;
    } catch {
      return [];
    }
  }

  function formatAudioDst(dst, alias) {
    if (dst === 'remote') return `Remote → ${alias || '(no alias set)'}`;
    return 'Local Speakers';
  }

  // -------------------------------------------------------------------------
  // Container box — fills content area, hidden until activated

  const box = blessed.box({
    parent: screen,
    top: 4,       // Below header (row 0-2) + tab bar (row 3)
    left: 0,
    width: '100%',
    bottom: 2,    // Above context footer + GitHub footer
    hidden: true,
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    scrollbar: { ch: '│', track: { bg: '#1e2a3a' }, style: { fg: COLORS.borderFg } },
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: COLORS.borderFg } },
    border: { type: 'line' },
  });


  // -------------------------------------------------------------------------
  // Sub-tab bar — Voice | Effects | Personality | Output

  const SUB_TABS = ['voice', 'effects', 'personality', 'output'];
  const SUB_TAB_LABELS = {
    voice:       ' [V] Voice ',
    effects:     ' [E] Effects ',
    personality: ' [P] Personality ',
    output:      ' [O] Output ',
  };
  let _activeSubTab = 'voice';

  const _subTabBar = blessed.box({
    parent: box, top: 1, left: 1, height: 1,
    style: { bg: COLORS.contentBg },
  });

  blessed.text({
    parent: box, top: 2, left: 1, right: 1,
    content: '─'.repeat(80),
    style: { fg: '#37474f', bg: COLORS.contentBg },
  });

  const _subTabItemsMap = {};
  let _xOff = 0;
  for (const id of SUB_TABS) {
    const lbl = SUB_TAB_LABELS[id];
    const item = blessed.box({
      parent: _subTabBar,
      content: lbl, width: lbl.length, height: 1,
      top: 0, left: _xOff,
      keys: true, focusable: true,
      style: { fg: 'bright-cyan', bg: '#263238' },
    });
    _subTabItemsMap[id] = item;
    _xOff += lbl.length;
  }

  function _updateSubTabBar() {
    for (const id of SUB_TABS) {
      const item = _subTabItemsMap[id];
      if (id === _activeSubTab) {
        item.style.fg = 'white';
        item.style.bg = '#0288d1'; // light blue — active tab
        item.style.bold = true;
      } else {
        item.style.fg = 'bright-cyan';
        item.style.bg = '#263238';
        item.style.bold = false;
      }
    }
  }

  // Focused sub-tab item turns purple + blinking █; blur restores active/inactive colours
  for (const id of SUB_TABS) {
    const item      = _subTabItemsMap[id];
    const _stBase   = SUB_TAB_LABELS[id];
    const _stBlock  = _stBase.slice(0, -1) + '█'; // replace trailing space with block
    let _stInterval = null;
    item.on('focus', () => {
      item.style.fg = 'white';
      item.style.bg = '#9c27b0';
      item.style.bold = true;
      let _stOn = true;
      item.setContent(_stBlock);
      screen.render();
      _stInterval = setInterval(() => {
        _stOn = !_stOn;
        item.setContent(_stOn ? _stBlock : _stBase);
        screen.render();
      }, 500);
    });
    item.on('blur', () => {
      if (_stInterval) { clearInterval(_stInterval); _stInterval = null; }
      item.setContent(_stBase);
      _updateSubTabBar();
      screen.render();
    });
  }

  // -------------------------------------------------------------------------
  // Section header: ── Provider & Voice ──

  const providerVoiceHeader = blessed.text({
    parent: box,
    top: 3,
    left: 1,
    content: '{bright-cyan-fg} 🎤 Provider & Voice {/bright-cyan-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Provider row: label + value + [Switch] button

  const providerLabel = blessed.text({
    parent: box,
    top: 5,
    left: 6,
    content: 'Provider:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const providerValue = blessed.text({
    parent: box,
    top: 5,
    left: 22,
    width: 26,    // truncate before [Switch] at left:40
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const switchBtn = _createButton(box, screen, 'Switch', COLORS, () => {
    _openProviderPicker(screen, providerService, (selected) => {
      providerService.setActiveProvider(selected);
      refreshDisplay();
      _buttons[_currentIdx].focus();
      screen.render();
    }, _restoreFocus);
  });
  switchBtn.top = 5;
  switchBtn.left = 52;

  // -------------------------------------------------------------------------
  // Voice row: label + value + [Change] button (stub for story 7-8)

  const voiceLabel = blessed.text({
    parent: box,
    top: 7,
    left: 6,
    content: 'Current Voice:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const voiceValue = blessed.text({
    parent: box,
    top: 7,
    left: 22,
    width: 26,    // truncate before [Change] at left:40
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const changeBtn = _createButton(box, screen, 'Change', COLORS, () => {
    if (changeBtn.hidden) return;  // Guard: non-piper providers hide this button
    _openVoiceBrowserModal(screen, providerService, configService, navigationService, () => {
      refreshDisplay();
      _buttons[_currentIdx].focus();
      screen.render();
    }, _restoreFocus);
  }, { bg: COLORS.btnChange });
  changeBtn.top = 7;
  changeBtn.left = 52;

  const playBtn = _createButton(box, screen, '▶ Play', COLORS, () => {
    if (_samplePlaying) {
      _killSample();
      playBtn.setContent('▶ Play');
      screen.render();
      return;
    }

    const provider = providerService.getActiveProvider();
    const _activePers = (configService.getConfig().personality ?? '').trim();
    const _hasPersonality = _activePers && _activePers !== 'none' && _activePers !== 'normal';
    const _rawPlay = providerService.getActiveVoiceId() ?? 'this voice';
    const _msPlay = parseMultiSpeaker(_rawPlay);
    let phrase = `${_testGreeting()}. Agent Vibes here. I am ${provider === 'soprano' ? 'Soprano' : (_msPlay.isMultiSpeaker ? _msPlay.speakerName : _rawPlay)}`;
    if (_hasPersonality) phrase += `, with ${_activePers} personality`;
    phrase += '.';
    const tempWav  = path.join(os.tmpdir(), `agentvibes-sample-${Date.now()}.wav`);

    _samplePlaying = true;

    const _onSynthDone = (code) => {
      _stopSpinner();
      if (!_samplePlaying) { try { fs.unlinkSync(tempWav); } catch {} return; }
      if (code !== 0) {
        _killSample(); playBtn.setContent('▶ Play'); _focusButton(playBtn);
        _showNotice(screen, 'Voice synthesis failed — check voice model');
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }
      playBtn.setContent('■ Stop');
      screen.render();
      const _wavPlayer2 = detectWavPlayer(_sampleEnv);
      if (!_wavPlayer2) {
        _stopSpinner(); _killSample(); playBtn.setContent('▶ Play');
        _showNotice(screen, 'No audio player found — install ffplay, sox, or mpv');
        screen.render(); return;
      }
      const playProc = spawn(_wavPlayer2.bin, _wavPlayer2.args(tempWav), _spawnOpts(_sampleEnv));
      _sampleProcess = playProc;
      const _done = () => { _killSample(); playBtn.setContent('▶ Play'); _focusButton(playBtn); try { fs.unlinkSync(tempWav); } catch {} };
      playProc.on('exit', _done);
      playProc.on('error', _done);
    };

    if (provider === 'soprano') {
      const port        = process.env.SOPRANO_PORT || '7860';
      const synther     = path.resolve(new URL(import.meta.url).pathname,
        '..', '..', '..', '..', '.claude', 'hooks', 'soprano-gradio-synth.py');
      const managerPath = path.resolve(new URL(import.meta.url).pathname,
        '..', '..', '..', '..', '.claude', 'hooks', 'soprano-manager.sh');

      // Fast-path: cached green status glyph confirms WebUI is healthy — skip manager wait.
      // @why soprano-manager does an HTTP health check (up to 2s) even when already running;
      //      if _refreshSopranoStatus() already confirmed 🟢 we can synthesize immediately.
      if (_sopranoStatusGlyph === ' 🟢') {
        _doSopranoSynth(true);
      } else {
        // Ask soprano-manager to ensure the WebUI is running and wait until healthy.
        // If already running: exits in <200ms. If cold-starting: blocks up to 60s.
        // Progressive label updates tell the user how long it's been waiting.
        _startSpinner(playBtn, 'Starting Soprano…');

        let _startSecs = 0;
        const _startLabelTimer = setInterval(() => {
          if (!_samplePlaying) { clearInterval(_startLabelTimer); return; }
          _startSecs += 10;
          // Re-call _startSpinner to replace the label; it stops the old interval first.
          _startSpinner(playBtn, `Starting Soprano… (${_startSecs}s)`);
        }, 10000);

        if (fs.existsSync(managerPath)) {
          const mgrProc = spawn('bash', [managerPath, 'start', '--wait'], {
            stdio: ['ignore', 'ignore', 'pipe'],
            env: { ...process.env, SOPRANO_PORT: port },
          });
          _sopranoMgrProc = mgrProc;  // tracked separately — kill() won't cascade to soprano-webui

          mgrProc.on('exit', (code) => {
            clearInterval(_startLabelTimer);
            _sopranoMgrProc = null;
            if (!_samplePlaying) return;
            if (code === 5) {
              // soprano-webui binary not installed
              _stopSpinner();
              _killSample();
              playBtn.setContent('▶ Play');
              _showNotice(screen, 'Soprano not installed — run: pip install soprano-tts');
              _refreshSopranoStatus();
              _focusButton(playBtn);
              return;
            }
            // code 0 = WebUI ready (Synthesizing…); any other = timed out/error (Loading model…)
            _doSopranoSynth(code === 0);
          });

          mgrProc.on('error', () => {
            clearInterval(_startLabelTimer);
            _sopranoMgrProc = null;
            if (_samplePlaying) _doSopranoSynth(false);
          });
        } else {
          // soprano-manager.sh not present — fall back to direct 2s HTTP check
          clearInterval(_startLabelTimer);
          const checkReq = http.get(
            `http://127.0.0.1:${port}/gradio_api/info`,
            { timeout: 2000 },
            (res) => { res.resume(); _doSopranoSynth(true); },
          );
          checkReq.on('error', () => _doSopranoSynth(false));
          checkReq.on('timeout', () => { checkReq.destroy(); _doSopranoSynth(false); });
        }
      }

      function _doSopranoSynth(webUIUp) {
        if (!_samplePlaying) return;
        _startSpinner(playBtn, webUIUp ? 'Synthesizing…' : 'Loading model…');

        // Pass phrase and output path via env vars — avoids all shell-escaping issues.
        // Mode chain: WebUI (Gradio, model warm) → API server (OpenAI-compat) → CLI (slow cold-load).
        const sopranoEnv = {
          ...(_sampleEnv),
          _AV_PHRASE:  _sanitizeForShell(phrase),
          _AV_WAV:     tempWav,
          _AV_SYNTHER: synther,
          _AV_PORT:    String(port),
        };
        const cmd = [
          // Mode 1: Gradio WebUI
          `python3 "$_AV_SYNTHER" "$_AV_PHRASE" "$_AV_WAV" "$_AV_PORT" 2>/dev/null`,
          // Mode 2: OpenAI-compatible API server (curl writes WAV directly)
          `curl -sf --max-time 30 "http://127.0.0.1:$_AV_PORT/v1/audio/speech"` +
            ` -H "Content-Type: application/json"` +
            ` -d "{\\"input\\":\\"$_AV_PHRASE\\"}" --output "$_AV_WAV" 2>/dev/null`,
          // Mode 3: CLI — reloads neural model each call (~15-30s)
          `soprano "$_AV_PHRASE" -o "$_AV_WAV"`,
        ].join(' || ');

        const soprano = spawn('sh', ['-c', cmd], {
          stdio: 'ignore', detached: !_IS_WINDOWS, windowsHide: true, env: sopranoEnv,
        });
        _sampleProcess = soprano;
        soprano.on('exit', (code) => {
          _onSynthDone(code);
          _refreshSopranoStatus();  // Update status glyph after synthesis completes
        });
        soprano.on('error', () => { _stopSpinner(); _killSample(); playBtn.setContent('▶ Play'); _focusButton(playBtn); });
      }
    } else {
      // Piper (default): pipe text via stdin
      _startSpinner(playBtn, 'Synthesizing…');
      const voiceId   = providerService.getActiveVoiceId();
      if (!voiceId) {
        _stopSpinner(); _killSample(); playBtn.setContent('▶ Play');
        _showNotice(screen, 'No voice selected — choose a voice first');
        screen.render(); return;
      }
      const _ms2 = parseMultiSpeaker(voiceId);
      const voicePath = path.resolve(PIPER_VOICES_DIR, _ms2.model + '.onnx');
      const safeBase  = path.resolve(PIPER_VOICES_DIR);
      if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) {
        _stopSpinner(); _killSample(); playBtn.setContent('▶ Play');
        _showNotice(screen, 'Invalid voice path');
        screen.render(); return;
      }
      const piperBin2 = _resolvePiperBin();
      if (piperBin2 === 'piper') {
        // Bare command — verify it exists in PATH before spawning
        const whichCmd = _IS_WINDOWS ? 'where' : 'which';
        const whichResult = spawnSync(whichCmd, [_IS_WINDOWS ? 'piper.exe' : 'piper'], { stdio: 'pipe', env: _sampleEnv });
        if (whichResult.status !== 0) {
          _stopSpinner(); _killSample(); playBtn.setContent('▶ Play');
          _showNotice(screen, 'Piper not installed — run the installer or: pip install piper-tts');
          _focusButton(playBtn); screen.render(); return;
        }
      }
      const _piperArgs2 = ['--model', voicePath, '--output_file', tempWav];
      if (_ms2.speakerId != null) _piperArgs2.push('--speaker', String(_ms2.speakerId));
      const piper = spawn(piperBin2, _piperArgs2, {
        stdio: ['pipe', 'ignore', 'pipe'], detached: !_IS_WINDOWS, windowsHide: true, env: _sampleEnv,
      });
      let _piperStderr = '';
      piper.stderr.on('data', (d) => { _piperStderr += d.toString(); });
      piper.stdin.write(phrase + '\n');
      piper.stdin.end();
      _sampleProcess = piper;
      piper.on('exit', (code) => {
        if (code !== 0 && _piperStderr) {
          // Python tracebacks: actual error is the LAST non-empty line
          const lines = _piperStderr.split('\n').map(l => l.trim()).filter(Boolean);
          const errLine = lines[lines.length - 1] || lines[0] || 'unknown error';
          _stopSpinner();
          if (!_samplePlaying) { try { fs.unlinkSync(tempWav); } catch {} return; }
          _killSample(); playBtn.setContent('▶ Play'); _focusButton(playBtn);
          _showNotice(screen, errLine.length > 100 ? errLine.substring(0, 97) + '…' : errLine);
          try { fs.unlinkSync(tempWav); } catch {}
          return;
        }
        _onSynthDone(code);
      });
      piper.on('error', (e) => {
        _stopSpinner(); _killSample(); playBtn.setContent('▶ Play');
        _showNotice(screen, `Piper failed: ${e.message}`);
        _focusButton(playBtn);
      });
    }
  });
  playBtn.top = 7;
  playBtn.left = 64;

  const voiceFileText = blessed.text({
    parent: box,
    top: 8,
    left: 22,
    right: 2,
    wrap: false,
    content: '.claude/tts-voice.txt',
    style: { fg: '#546e7a', bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Section header: ── Audio Effects ──

  const audioEffectsHeader = blessed.text({
    parent: box,
    top: 3,
    left: 1,
    content: '{bright-cyan-fg} ⚡ Audio Effects {/bright-cyan-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Reverb row: label + value + [Toggle] + [Adjust] buttons

  const reverbLabel = blessed.text({
    parent: box,
    top: 5,
    left: 6,
    content: 'Reverb:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const reverbValue = blessed.text({
    parent: box,
    top: 5,
    left: 22,
    width: 26,    // truncate before [Change] at left:40
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const reverbChangeBtn = _createButton(box, screen, 'Change', COLORS, () => {
    openReverbPicker(screen, configService.getConfig().effects?.reverbPreset ?? 'light', (preset) => {
      _setEffects(configService, { reverbPreset: preset });
      // On Windows, sync reverb-level.txt so play-tts.ps1 picks it up
      if (_IS_WINDOWS) {
        const _validPresets = new Set(['off', 'light', 'medium', 'heavy', 'cathedral']);
        if (_validPresets.has(preset)) {
          const _cwdMgr = path.join(process.cwd(), '.claude', 'hooks-windows', 'effects-manager.ps1');
          const _homeMgr = path.join(os.homedir(), '.claude', 'hooks-windows', 'effects-manager.ps1');
          const effectsMgr = fs.existsSync(_cwdMgr) ? _cwdMgr : _homeMgr;
          spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', effectsMgr, 'set-reverb', preset, 'default'], {
            stdio: 'ignore', timeout: 5000,
          });
        }
      }
      refreshDisplay();
    }, _restoreFocus);
  }, { bg: COLORS.btnChange });
  reverbChangeBtn.top = 5;
  reverbChangeBtn.left = 52;

  const reverbTestBtn = _createButton(box, screen, '▶ Preview', COLORS, () => _runTest(false), { bg: COLORS.btnTest });
  reverbTestBtn.top = 5;
  reverbTestBtn.left = 64;

  const reverbPathText = blessed.text({
    parent: box,
    top: 6,
    left: 22,
    right: 2,
    wrap: false,
    content: '.agentvibes/config.json',
    style: { fg: '#546e7a', bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Section header: ── Background Music ──

  const bgMusicHeader = blessed.text({
    parent: box,
    top: 7,
    left: 1,
    content: '{bright-cyan-fg} 🎸 Background Music {/bright-cyan-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Music row (single): Track value + [Change] + [Enabled/Disabled] + [Test]

  const trackLabel = blessed.text({
    parent: box,
    top: 9,
    left: 6,
    content: 'Track:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const trackValue = blessed.text({
    parent: box,
    top: 9,
    left: 22,
    width: 26,    // truncate before [Change] at left:40
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const trackChangeBtn = _createButton(box, screen, 'Change', COLORS, () => {
    _openMusicBrowserModal(screen, configService, navigationService, () => {
      refreshDisplay();
      _buttons[_currentIdx].focus();
      screen.render();
    }, _restoreFocus);
  }, { bg: COLORS.btnChange });
  trackChangeBtn.top = 9;
  trackChangeBtn.left = 52;

  const musicToggleBtn = _createButton(box, screen, 'Disabled', COLORS, () => {
    const music = _getMusic(configService);
    _setMusic(configService, { enabled: !music.enabled });
    refreshDisplay();
  }, {
    bg: COLORS.btnEnableOff,
    getDynamicBg: () => _getMusic(configService).enabled ? COLORS.btnEnableOn : COLORS.btnEnableOff,
  });
  musicToggleBtn.top = 9;
  musicToggleBtn.left = 64;

  const musicTestBtn = _createButton(box, screen, '▶ Preview', COLORS, _runMusicTest, { bg: COLORS.btnTest });
  musicTestBtn.top = 9;
  musicTestBtn.left = 78;

  const trackPathText = blessed.text({
    parent: box,
    top: 10,
    left: 22,
    right: 2,
    wrap: false,
    content: '.agentvibes/config.json',
    style: { fg: '#546e7a', bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Volume row: label + value + [Change] button

  const volumeLabel = blessed.text({
    parent: box,
    top: 11,
    left: 6,
    content: 'Volume:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const volumeValue = blessed.text({
    parent: box,
    top: 11,
    left: 22,
    width: 26,
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const volumeChangeBtn = _createButton(box, screen, 'Change', COLORS, () => {
    _openVolumePicker(screen, configService, (vol) => {
      _setMusic(configService, { volume: vol });
      // If music test is active, restart it at the new volume
      if (_musicTestActive) {
        _killMusicTest();
        _runMusicTest();
      }
      refreshDisplay();
    }, _restoreFocus);
  }, { bg: COLORS.btnChange });
  volumeChangeBtn.top = 11;
  volumeChangeBtn.left = 52;

  // -------------------------------------------------------------------------
  // Section header: ── Style ──

  const styleHeader = blessed.text({
    parent: box,
    top: 3,
    left: 1,
    content: '{bright-cyan-fg} 🎭 Style {/bright-cyan-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Verbosity row: label + value + [Change] button

  const verbosityLabel = blessed.text({
    parent: box,
    top: 5,
    left: 6,
    content: 'Verbosity:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const verbosityValue = blessed.text({
    parent: box,
    top: 5,
    left: 22,
    width: 26,    // truncate before [Change] at left:40
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const verbosityChangeBtn = _createButton(box, screen, 'Change', COLORS, () => {
    _openVerbosityPicker(screen, configService, () => refreshDisplay(), _restoreFocus);
  }, { bg: COLORS.btnChange });
  verbosityChangeBtn.top = 5;
  verbosityChangeBtn.left = 52;

  const verbosityPathText = blessed.text({
    parent: box,
    top: 6,
    left: 22,
    right: 2,
    wrap: false,
    content: '.claude/tts-verbosity.txt',
    style: { fg: '#546e7a', bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Personality row: label + value + [Change] button

  const personalityLabel = blessed.text({
    parent: box,
    top: 7,
    left: 6,
    content: 'Personality:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const personalityValue = blessed.text({
    parent: box,
    top: 7,
    left: 22,
    width: 26,    // truncate before [Change] at left:40
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const personalityChangeBtn = _createButton(box, screen, 'Change', COLORS, () => {
    openPersonalityPicker(screen, configService.getConfig().personality ?? 'none', (name) => {
      configService.set('personality', name);
      refreshDisplay();
    }, _restoreFocus);
  }, { bg: COLORS.btnChange });
  personalityChangeBtn.top = 7;
  personalityChangeBtn.left = 52;

  const personalityTestBtn = _createButton(box, screen, '▶ Preview', COLORS, () => {
    const personality = (configService.getConfig().personality ?? '').trim();
    const example = _getPersonalityPhrase(personality);
    const phrase = example
      ? `${_testGreeting()}. Agent Vibes here. ${example}`
      : _buildPreviewPhrase();
    _runTest(false, phrase);
  }, { bg: COLORS.btnTest });
  personalityTestBtn.top = 7;
  personalityTestBtn.left = 64;

  const personalityFileText = blessed.text({
    parent: box,
    top: 8,
    left: 22,
    right: 2,
    wrap: false,
    tags: true,
    content: '',  // populated by refreshDisplay()
    style: { fg: '#546e7a', bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Section header: ── Intro Text ──

  const introTextHeader = blessed.text({
    parent: box,
    top: 10,
    left: 1,
    content: '{bright-cyan-fg} ✍️ Intro Text {/bright-cyan-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Intro Text row: label + value + [Edit] + [Clear] buttons

  const introTextLabel = blessed.text({
    parent: box,
    top: 12,
    left: 6,
    content: 'Intro Text:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const introTextValue = blessed.text({
    parent: box,
    top: 12,
    left: 22,
    width: 26,    // truncate before [Edit] at left:40
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const introEditBtn = _createButton(box, screen, 'Edit', COLORS, () => {
    _openIntroTextEditor(screen, configService, () => { refreshDisplay(); }, _restoreFocus);
  }, { bg: COLORS.btnEdit });
  introEditBtn.top = 12;
  introEditBtn.left = 52;

  const introClearBtn = _createButton(box, screen, 'Clear', COLORS, () => {
    configService.set('pretext', '');
    refreshDisplay();
  }, { bg: '#c62828' });
  introClearBtn.top = 12;
  introClearBtn.left = 64;

  const introPathText = blessed.text({
    parent: box,
    top: 13,
    left: 22,
    right: 2,
    wrap: false,
    content: '.agentvibes/config.json',
    style: { fg: '#546e7a', bg: COLORS.contentBg },
  });

  // Full Preview button — voice + reverb + background track combined
  const fullPreviewBtn = _createButton(box, screen, '▶ Full Preview', COLORS, () => _runTest(true));
  fullPreviewBtn.bottom = 0;
  fullPreviewBtn.left = 2;

  // -------------------------------------------------------------------------
  // Section header: 📡 Audio Destination

  const audioDstHeader = blessed.text({
    parent: box,
    top: 3,
    left: 2,
    content: '{bright-cyan-fg} 📡 Audio Destination {/bright-cyan-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Destination row: label + value + [Change] button

  const audioDstLabel = blessed.text({
    parent: box,
    top: 5,
    left: 6,
    content: 'Destination:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const audioDstValue = blessed.text({
    parent: box,
    top: 5,
    left: 22,
    width: 26,
    wrap: false,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const audioDstChangeBtn = _createButton(box, screen, 'Change', COLORS, () => {
    const aliases = _detectSshAliases();
    const current = configService.getConfig().audio_destination ?? 'local';
    const choices = ['local', 'remote'];
    const nextIdx = (choices.indexOf(current) + 1) % choices.length;
    const next = choices[nextIdx];
    configService.set('audio_destination', next);
    if (next === 'remote' && !(configService.getConfig().audio_ssh_alias)) {
      // Prompt for alias immediately if switching to remote with no alias set
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
          if (!err && val && val.trim()) {
            const trimmed = val.trim();
            if (/[;&|`$(){}\\<>]/.test(trimmed)) {
              _showNotice(screen, 'Invalid alias — special characters not allowed');
            } else {
              configService.set('audio_ssh_alias', trimmed);
            }
          }
          refreshDisplay();
          screen.render();
        });
      screen.render();
      return;
    }
    refreshDisplay();
  }, { bg: COLORS.btnChange });
  audioDstChangeBtn.top = 5;
  audioDstChangeBtn.left = 52;

  // -------------------------------------------------------------------------
  // SSH Alias row: label + value + [Edit] + [stream mode toggle] buttons
  // Hidden when destination is Local — shown/hidden by refreshDisplay()

  const audioSshLabel = blessed.text({
    parent: box,
    top: 7,
    left: 6,
    hidden: true,
    content: 'SSH Alias:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const audioSshValue = blessed.text({
    parent: box,
    top: 7,
    left: 22,
    width: 26,
    wrap: false,
    hidden: true,
    content: '',  // populated by refreshDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  const audioSshEditBtn = _createButton(box, screen, 'Edit', COLORS, () => {
    const aliases = _detectSshAliases();
    const current = configService.getConfig().audio_ssh_alias ?? '';
    const detectedAliases = aliases.length > 0 ? ` (detected: ${aliases.join(', ')})` : '';
    const prompt = blessed.prompt({
      parent: screen,
      top: 'center', left: 'center',
      height: 'shrink', width: '60%',
      border: 'line', tags: true,
      style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: COLORS.sectionHdr } },
    });
    prompt.input(`SSH Host alias from ~/.ssh/config${detectedAliases}:`,
      current || (aliases[0] ?? ''),
      (err, val) => {
        prompt.destroy();
        if (!err && val !== null) {
          const trimmed = val.trim();
          if (/[;&|`$(){}\\<>]/.test(trimmed)) {
            _showNotice(screen, 'Invalid alias — special characters not allowed');
          } else {
            configService.set('audio_ssh_alias', trimmed);
          }
        }
        refreshDisplay();
        screen.render();
      });
    screen.render();
  }, { bg: COLORS.btnEdit });
  audioSshEditBtn.top = 7;
  audioSshEditBtn.left = 52;
  audioSshEditBtn.hide();

  // Stream mode toggle
  // Streaming Text Only = send TTS text to remote AgentVibes Receiver which speaks locally (no audio data transfer)
  // Streaming Pulse Audio = stream audio file over SSH/PulseAudio tunnel
  const audioStreamModeBtn = _createButton(box, screen, 'Streaming Text Only ✓', COLORS, () => {
    const current = configService.getConfig().audio_stream_mode ?? 'text';
    configService.set('audio_stream_mode', current === 'text' ? 'pulse' : 'text');
    refreshDisplay();
  }, { bg: '#1565c0' });  // blue — distinct from green focus
  audioStreamModeBtn.top = 7;
  audioStreamModeBtn.left = 64;
  audioStreamModeBtn.hide();

  // Explanation note
  const audioExplanationNote = blessed.text({
    parent: box,
    top: 9,
    left: 6,
    right: 2,
    wrap: false,
    tags: true,
    content: `{#546e7a-fg}Remote: sends TTS over SSH. Text Only = remote speaks (no audio transfer). Pulse = streams audio.{/#546e7a-fg}`,
    style: { bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Section header: 💾 Config Storage

  const configStorageHeader = blessed.text({
    parent: box,
    top: 11,
    left: 2,
    content: '{bright-cyan-fg} 💾 Config Storage {/bright-cyan-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // Info row 1: global config path
  const configGlobalLabel = blessed.text({
    parent: box,
    top: 12,
    left: 6,
    content: 'Global:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const configGlobalValue = blessed.text({
    parent: box,
    top: 12,
    left: 22,
    right: 2,
    wrap: false,
    content: '',  // populated by refreshConfigDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  // Info row 2: local config path (or "None")
  const configLocalLabel = blessed.text({
    parent: box,
    top: 13,
    left: 6,
    content: 'Local:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const configLocalValue = blessed.text({
    parent: box,
    top: 13,
    left: 22,
    right: 2,
    wrap: false,
    content: '',  // populated by refreshConfigDisplay()
    style: { fg: COLORS.valueFg, bg: COLORS.contentBg },
  });

  // Action buttons row — right column, row 17
  const saveGloballyBtn = _createButton(box, screen, 'Save Globally', COLORS, () => {
    const data = configService.getConfig();
    const configPath = configService.getGlobalConfigPath();
    _showSavePreview(screen, configPath, data, () => {
      configService.saveAllToGlobal(data);
      applyTrackToAudioEffects(data.backgroundMusic?.track);
      refreshConfigDisplay();
      _showNotice(screen, 'Settings Saved');
    }, () => { _currentIdx = _buttons.indexOf(saveGloballyBtn); _focusButton(saveGloballyBtn); });
  }, { bg: '#7b1fa2' });   // purple
  saveGloballyBtn.bottom = 0;
  saveGloballyBtn.left = 24;

  const saveLocallyBtn = _createButton(box, screen, 'Save Locally', COLORS, () => {
    const data = configService.getConfig();
    const configPath = configService.getLocalConfigPath();
    _showSavePreview(screen, configPath, data, () => {
      configService.saveAllToLocal(data);
      applyTrackToAudioEffects(data.backgroundMusic?.track);
      refreshConfigDisplay();
      _showNotice(screen, 'Settings Saved');
    }, () => { _currentIdx = _buttons.indexOf(saveLocallyBtn); _focusButton(saveLocallyBtn); });
  }, { bg: '#1565c0' });   // blue — distinct from green focus
  saveLocallyBtn.bottom = 0;
  saveLocallyBtn.left = 46;

  const cancelChangesBtn = _createButton(box, screen, 'Cancel Changes', COLORS, () => {
    // Restore global config to snapshot taken at tab open
    if (_snapshotGlobal !== null) configService.saveAllToGlobal(_snapshotGlobal);
    // Restore (or remove) local config
    if (_snapshotLocal !== null) {
      configService.saveAllToLocal(_snapshotLocal);
    } else {
      // Local didn't exist at tab open — remove it if created during this session
      const localPath = configService.getLocalConfigPath();
      try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch {}
    }
    refreshDisplay();
    refreshConfigDisplay();
    _showNotice(screen, 'Changes reverted');
  }, { bg: '#c62828' });   // red
  cancelChangesBtn.bottom = 0;
  cancelChangesBtn.left = 66;

  // -------------------------------------------------------------------------
  // Display state + button-level focus navigation (story 7.6)

  // Widget groups for each sub-tab (used by _showSubTab to show/hide)
  const _subTabWidgets = {
    voice: [
      providerVoiceHeader,
      providerLabel, providerValue, switchBtn,
      voiceLabel, voiceValue, changeBtn, playBtn, voiceFileText,
    ],
    effects: [
      audioEffectsHeader,
      reverbLabel, reverbValue, reverbChangeBtn, reverbTestBtn, reverbPathText,
      bgMusicHeader,
      trackLabel, trackValue, trackChangeBtn, musicToggleBtn, musicTestBtn, trackPathText,
      volumeLabel, volumeValue, volumeChangeBtn,
    ],
    personality: [
      styleHeader,
      verbosityLabel, verbosityValue, verbosityChangeBtn, verbosityPathText,
      personalityLabel, personalityValue, personalityChangeBtn, personalityTestBtn, personalityFileText,
      introTextHeader,
      introTextLabel, introTextValue, introEditBtn, introClearBtn, introPathText,
    ],
    output: [
      audioDstHeader,
      audioDstLabel, audioDstValue, audioDstChangeBtn,
      audioSshLabel, audioSshValue, audioSshEditBtn, audioStreamModeBtn, audioExplanationNote,
      configStorageHeader,
      configGlobalLabel, configGlobalValue,
      configLocalLabel, configLocalValue,
    ],
  };

  // Row groups per sub-tab for ↑↓ navigation
  const _rowsBySubTab = {
    voice:       [[switchBtn], [changeBtn, playBtn]],
    effects:     [[reverbChangeBtn, reverbTestBtn], [trackChangeBtn, musicToggleBtn, musicTestBtn], [volumeChangeBtn]],
    personality: [[verbosityChangeBtn], [personalityChangeBtn, personalityTestBtn], [introEditBtn, introClearBtn]],
    output:      [[audioDstChangeBtn], [audioSshEditBtn, audioStreamModeBtn]],
  };

  const _subTabItemsArray = SUB_TABS.map(id => _subTabItemsMap[id]);

  function _showSubTab(name, keepFocusOnBar = false) {
    _activeSubTab = name;

    // Hide all section widgets; clear any active blink intervals on hidden buttons
    for (const widgets of Object.values(_subTabWidgets)) {
      for (const w of widgets) {
        if (w._btnBlinkInterval) { clearInterval(w._btnBlinkInterval); w._btnBlinkInterval = null; }
        w.hide();
      }
    }

    // Show active section widgets (SSH row controlled by refreshDisplay, not here)
    const sshSpecific = [audioSshLabel, audioSshValue, audioSshEditBtn, audioStreamModeBtn];
    for (const w of _subTabWidgets[name]) {
      if (sshSpecific.includes(w)) continue;
      w.show();
    }

    // If showing output tab, let refreshDisplay control SSH row visibility
    if (name === 'output') refreshDisplay();

    // Rebuild _rows: [subTabRow, ...contentRows, fullPreview, save, cancel]
    _rows.length = 0;
    _rows.push(_subTabItemsArray);
    for (const row of _rowsBySubTab[name]) _rows.push(row);
    _rows.push([fullPreviewBtn]);
    _rows.push([saveGloballyBtn, saveLocallyBtn, cancelChangesBtn]);

    _updateSubTabBar();

    if (!keepFocusOnBar) {
      const firstRow = _rowsBySubTab[name].find(row => !row[0].hidden);
      if (firstRow) {
        _currentIdx = _buttons.indexOf(firstRow[0]);
        _focusButton(firstRow[0]);
      }
    }

    screen.render();
  }

  const _buttons = [
    _subTabItemsMap.voice, _subTabItemsMap.effects,
    _subTabItemsMap.personality, _subTabItemsMap.output,
    switchBtn, changeBtn, playBtn,
    reverbChangeBtn, reverbTestBtn,
    trackChangeBtn, musicToggleBtn, musicTestBtn,
    volumeChangeBtn,
    verbosityChangeBtn, personalityChangeBtn, personalityTestBtn,
    introEditBtn, introClearBtn,
    audioDstChangeBtn, audioSshEditBtn, audioStreamModeBtn,
    fullPreviewBtn,
    saveGloballyBtn, saveLocallyBtn, cancelChangesBtn,
  ];

  // Restore focus to the active settings button after any modal closes.
  const _restoreFocus = () => _focusButton(_buttons[_currentIdx]);

  // Register test buttons for label sync (reverb + full preview share state)
  _testBtns.push(reverbTestBtn, personalityTestBtn, fullPreviewBtn);
  _testBtnLabels.set(reverbTestBtn,      '▶ Preview');
  _testBtnLabels.set(personalityTestBtn, '▶ Preview');
  _testBtnLabels.set(fullPreviewBtn,     '▶ Full Preview');

  let _currentIdx = 0;

  // Map each button to its row label + value widgets for focus-highlight
  const _buttonToLabel = new Map([
    [switchBtn,            providerLabel],
    [changeBtn,            voiceLabel],
    [playBtn,              voiceLabel],
    [reverbChangeBtn,      reverbLabel],
    [reverbTestBtn,        reverbLabel],
    [trackChangeBtn,       trackLabel],
    [musicToggleBtn,       trackLabel],
    [musicTestBtn,         trackLabel],
    [volumeChangeBtn,      volumeLabel],
    [verbosityChangeBtn,   verbosityLabel],
    [personalityChangeBtn, personalityLabel],
    [personalityTestBtn,   personalityLabel],
    [introEditBtn,         introTextLabel],
    [introClearBtn,        introTextLabel],
    [audioDstChangeBtn,    audioDstLabel],
    [audioSshEditBtn,      audioSshLabel],
    [audioStreamModeBtn,   audioDstLabel],
  ]);

  const _buttonToValue = new Map([
    [switchBtn,            providerValue],
    [changeBtn,            voiceValue],
    [playBtn,              voiceValue],
    [reverbChangeBtn,      reverbValue],
    [reverbTestBtn,        reverbValue],
    [trackChangeBtn,       trackValue],
    [musicToggleBtn,       trackValue],
    [musicTestBtn,         trackValue],
    [volumeChangeBtn,      volumeValue],
    [verbosityChangeBtn,   verbosityValue],
    [personalityChangeBtn, personalityValue],
    [personalityTestBtn,   personalityValue],
    [introEditBtn,         introTextValue],
    [introClearBtn,        introTextValue],
    [audioDstChangeBtn,    audioDstValue],
    [audioSshEditBtn,      audioSshValue],
    [audioStreamModeBtn,   audioDstValue],
  ]);

  // Sync _currentIdx; highlight label (cyan) + value (bright blue + underline) on focus
  for (const [i, btn] of _buttons.entries()) {
    btn.on('focus', () => {
      _currentIdx = i;
      const lbl = _buttonToLabel.get(btn);
      if (lbl) lbl.style.fg = COLORS.btnFocus;
      const val = _buttonToValue.get(btn);
      if (val) { val.style.fg = COLORS.btnFocus; val.style.underline = true; }
    });
    btn.on('blur', () => {
      const lbl = _buttonToLabel.get(btn);
      if (lbl) lbl.style.fg = COLORS.labelFg;
      const val = _buttonToValue.get(btn);
      if (val) { val.style.fg = COLORS.valueFg; val.style.underline = false; }
    });
  }

  // Shared focus helper — suppresses intermediate renders, force-invalidates olines.
  // Prevents the olines desync artifact where setContent() updates lines[] but
  // olines[] stays stale, causing draw() to skip repainting those cells.
  function _focusButton(btn) {
    const _orig = screen.render.bind(screen);
    screen.render = () => {};
    try { btn.focus(); } finally { screen.render = _orig; }

    screen.clearRegion(0, screen.cols, 4, screen.rows - 2);
    for (let r = 4; r < screen.rows - 2; r++) {
      const orow = screen.olines[r];
      if (!orow) continue;
      for (let c = 0; c < screen.cols; c++) {
        if (orow[c]) orow[c][0] = -1;
      }
      orow.dirty = true;
    }
    screen.render();
  }

  // ↓ / ↑ → navigate between row groups (skips siblings; use ←/→ for those)

  // Returns the first non-hidden button in a row, or the first button if all are hidden.
  // Needed because some rows have a hidden first button (e.g. [changeBtn, playBtn] when
  // provider is not piper — changeBtn is hidden but playBtn is still reachable).
  function _firstVisibleBtn(row) {
    return row.find(b => !b.hidden) ?? row[0];
  }

  function _isRowVisible(row) {
    return row.some(b => !b.hidden);
  }

  function _navigateRow(delta) {
    const focused = _buttons[_currentIdx];
    let rowIdx = _rows.findIndex(row => row.includes(focused));
    if (rowIdx === -1) rowIdx = 0;
    // At the sub-tab bar (row 0): pressing ↑ moves focus to the main header tab bar
    if (rowIdx === 0 && delta < 0) {
      if (typeof focusMainTabBar === 'function') focusMainTabBar();
      return;
    }

    // _rows layout: [0]=sub-tab bar, [1..lastContent]=per-tab rows, then 3 shared bottom rows
    const BOTTOM_ROWS = 2; // [fullPreviewBtn], [saveGlobally+saveLocally+cancelChanges]
    const lastContentIdx = _rows.length - BOTTOM_ROWS - 1;

    // Cross-tab forward: ↓ from the effective last visible content row → jump to next sub-tab
    if (delta > 0 && rowIdx >= 1 && rowIdx <= lastContentIdx) {
      let isEffectiveLast = true;
      for (let r = rowIdx + 1; r <= lastContentIdx; r++) {
        if (_isRowVisible(_rows[r])) { isEffectiveLast = false; break; }
      }
      if (isEffectiveLast) {
        const tabIdx = SUB_TABS.indexOf(_activeSubTab);
        if (tabIdx < SUB_TABS.length - 1) {
          const nextTab = SUB_TABS[tabIdx + 1];
          _showSubTab(nextTab, true);
          const firstRow = _rowsBySubTab[nextTab].find(row => _isRowVisible(row));
          if (firstRow) {
            const btn = _firstVisibleBtn(firstRow);
            _currentIdx = _buttons.indexOf(btn);
            _focusButton(btn);
            return;
          }
        }
        // On the last sub-tab: fall through to normal (go to fullPreviewBtn)
      }
    }

    // Cross-tab backward: ↑ from first content row (row 1) → jump to previous sub-tab's last row
    if (delta < 0 && rowIdx === 1) {
      const tabIdx = SUB_TABS.indexOf(_activeSubTab);
      if (tabIdx > 0) {
        const prevTab = SUB_TABS[tabIdx - 1];
        _showSubTab(prevTab, true);
        const prevRows = _rowsBySubTab[prevTab];
        let lastRow = null;
        for (let i = prevRows.length - 1; i >= 0; i--) {
          if (_isRowVisible(prevRows[i])) { lastRow = prevRows[i]; break; }
        }
        if (lastRow) {
          const btn = _firstVisibleBtn(lastRow);
          _currentIdx = _buttons.indexOf(btn);
          _focusButton(btn);
          return;
        }
      }
      // First sub-tab: fall through (goes to sub-tab bar at row 0)
    }

    // In the bottom save row: ↓ navigates to the next visible sibling within the row
    // rather than wrapping to row 0 (sub-tab bar) via modulo.
    const lastRowIdx = _rows.length - 1;
    if (delta > 0 && rowIdx === lastRowIdx) {
      const row = _rows[lastRowIdx];
      const posInRow = row.indexOf(focused);
      for (let i = posInRow + 1; i < row.length; i++) {
        if (!row[i].hidden) {
          _currentIdx = _buttons.indexOf(row[i]);
          _focusButton(row[i]);
          return;
        }
      }
      // Last sibling in the row — wrap up to sub-tab bar (row 0)
      const topBtn = _firstVisibleBtn(_rows[0]);
      _currentIdx = _buttons.indexOf(topBtn);
      _focusButton(topBtn);
      return;
    }

    // Skip rows where ALL buttons are hidden (e.g. SSH alias row when destination is local).
    // Use _firstVisibleBtn so we land on the first visible button in a mixed row.
    let attempts = 0;
    do {
      rowIdx = (rowIdx + delta + _rows.length) % _rows.length;
      attempts++;
    } while (!_isRowVisible(_rows[rowIdx]) && attempts < _rows.length);
    const btn = _firstVisibleBtn(_rows[rowIdx]);
    _currentIdx = _buttons.indexOf(btn);
    _focusButton(btn);
  }

  for (const btn of _buttons) {
    btn.key(['down'],   () => _navigateRow(1));
    btn.key(['up'],     () => _navigateRow(-1));
    btn.key(['escape'], () => { if (typeof focusMainTabBar === 'function') setTimeout(() => focusMainTabBar(), 0); });
  }

  // ← / → within content rows — uses _buttonGroups (static); sub-tab bar has its own wiring
  const _rows = [];  // populated dynamically by _showSubTab()

  const _buttonGroups = [
    [switchBtn], [changeBtn, playBtn],
    [reverbChangeBtn, reverbTestBtn],
    [trackChangeBtn, musicToggleBtn, musicTestBtn],
    [volumeChangeBtn],
    [verbosityChangeBtn],
    [personalityChangeBtn, personalityTestBtn],
    [introEditBtn, introClearBtn],
    [audioDstChangeBtn],
    [audioSshEditBtn, audioStreamModeBtn],
    [fullPreviewBtn],
    [saveGloballyBtn, saveLocallyBtn, cancelChangesBtn],
  ];

  for (const row of _buttonGroups) {
    for (let i = 0; i < row.length; i++) {
      if (i < row.length - 1) {
        row[i].key(['right'], () => {
          // Skip hidden siblings (e.g. SSH/stream mode when destination is local)
          let next = i + 1;
          while (next < row.length && row[next].hidden) next++;
          if (next < row.length) { _currentIdx = _buttons.indexOf(row[next]); _focusButton(row[next]); }
        });
      }
      if (i > 0) {
        row[i].key(['left'], () => {
          let prev = i - 1;
          while (prev >= 0 && row[prev].hidden) prev--;
          if (prev >= 0) { _currentIdx = _buttons.indexOf(row[prev]); _focusButton(row[prev]); }
        });
      }
    }
  }

  // Tab/S-tab cycle: bottom buttons ↔ main header tab bar
  // Debounce prevents key-repeat from firing on the newly-focused button in the same stroke.
  let _tabBusy = false;
  const _withTabDebounce = (fn) => () => {
    if (_tabBusy) return;
    _tabBusy = true;
    setTimeout(() => { _tabBusy = false; }, 120);
    fn();
  };

  fullPreviewBtn.key(['tab'],   _withTabDebounce(() => { _currentIdx = _buttons.indexOf(saveGloballyBtn); _focusButton(saveGloballyBtn); }));
  saveGloballyBtn.key(['tab'],  _withTabDebounce(() => { _currentIdx = _buttons.indexOf(saveLocallyBtn);  _focusButton(saveLocallyBtn); }));
  saveLocallyBtn.key(['tab'],   _withTabDebounce(() => { _currentIdx = _buttons.indexOf(cancelChangesBtn); _focusButton(cancelChangesBtn); }));
  cancelChangesBtn.key(['tab'], _withTabDebounce(() => { if (typeof focusFirstHeaderItem === 'function') focusFirstHeaderItem(); }));

  fullPreviewBtn.key(['S-tab'],   _withTabDebounce(() => { if (typeof focusLastHeaderItem === 'function') focusLastHeaderItem(); }));
  saveGloballyBtn.key(['S-tab'],  _withTabDebounce(() => { _currentIdx = _buttons.indexOf(fullPreviewBtn);    _focusButton(fullPreviewBtn); }));
  saveLocallyBtn.key(['S-tab'],   _withTabDebounce(() => { _currentIdx = _buttons.indexOf(saveGloballyBtn);   _focusButton(saveGloballyBtn); }));
  cancelChangesBtn.key(['S-tab'], _withTabDebounce(() => { _currentIdx = _buttons.indexOf(saveLocallyBtn);    _focusButton(saveLocallyBtn); }));

  // Wire sub-tab ←/→ and Tab/S-tab to switch sub-tabs
  for (let i = 0; i < SUB_TABS.length; i++) {
    const item = _subTabItemsMap[SUB_TABS[i]];
    if (i < SUB_TABS.length - 1) {
      item.key(['right'], () => {
        _showSubTab(SUB_TABS[i + 1], true);
        _focusButton(_subTabItemsArray[i + 1]);
      });
    }
    if (i > 0) {
      item.key(['left'], () => {
        _showSubTab(SUB_TABS[i - 1], true);
        _focusButton(_subTabItemsArray[i - 1]);
      });
    }
    // Tab/S-tab wrap-cycle through sub-tab bar (independent of global header Tab cycle)
    item.key(['tab'], () => {
      const next = (i + 1) % SUB_TABS.length;
      _showSubTab(SUB_TABS[next], true);
      _focusButton(_subTabItemsArray[next]);
    });
    item.key(['S-tab'], () => {
      const prev = (i - 1 + SUB_TABS.length) % SUB_TABS.length;
      _showSubTab(SUB_TABS[prev], true);
      _focusButton(_subTabItemsArray[prev]);
    });
  }

  // Initialize with Voice sub-tab active
  _showSubTab('voice');
  _currentIdx = _buttons.indexOf(switchBtn);

  // @function _refreshSopranoStatus
  // @intent Update the provider status glyph (🟢/🟡/🔴) without blocking the render loop
  // @why soprano-manager status does an HTTP health-check (up to 2s) — must be async
  function _refreshSopranoStatus() {
    if (_sopranoStatusProc) {
      try { _sopranoStatusProc.kill(); } catch {}
      _sopranoStatusProc = null;
    }
    const managerPath = path.resolve(new URL(import.meta.url).pathname,
      '..', '..', '..', '..', '.claude', 'hooks', 'soprano-manager.sh');
    if (!fs.existsSync(managerPath)) return;

    const proc = spawn('bash', [managerPath, 'status'], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    _sopranoStatusProc = proc;

    proc.on('exit', (code) => {
      _sopranoStatusProc = null;
      // 0=running(🟢) 1=starting(🟡) 2=stopped(🔴) 3=conflict(🔴)
      _sopranoStatusGlyph = code === 0 ? ' 🟢' : code === 1 ? ' 🟡' : ' 🔴';
      if (providerService.getActiveProvider() === 'soprano') {
        const name = _ALL_PROVIDERS.find(p => p.id === 'soprano')?.name ?? 'Soprano';
        providerValue.setContent(name + _sopranoStatusGlyph);
        screen.render();
      }
    });

    proc.on('error', () => { _sopranoStatusProc = null; });
  }

  function refreshDisplay() {
    const activeProvider = providerService.getActiveProvider();
    const activeVoice = providerService.getActiveVoiceId();
    const provName = _ALL_PROVIDERS.find(p => p.id === activeProvider)?.name ?? activeProvider;
    if (activeProvider === 'soprano') {
      // Show cached glyph immediately, kick off async refresh for updated status
      providerValue.setContent(provName + _sopranoStatusGlyph);
      _refreshSopranoStatus();
    } else {
      providerValue.setContent(provName);
      // Cancel any pending status check and clear glyph when leaving soprano
      _sopranoStatusGlyph = '';
      if (_sopranoStatusProc) { try { _sopranoStatusProc.kill(); } catch {} _sopranoStatusProc = null; }
    }
    // Single-voice providers: show the provider name instead of voice ID
    // For multi-speaker voices, show speaker name (e.g., "Kristin_Hughes" not "16Speakers::Kristin_Hughes")
    const _msDisplay = parseMultiSpeaker(activeVoice);
    voiceValue.setContent(activeProvider === 'soprano' ? 'Soprano' : (_msDisplay.isMultiSpeaker ? _msDisplay.speakerName : activeVoice));
    // Only Piper supports multiple installed voices — hide Change for single-voice providers
    if (activeProvider === 'piper') { changeBtn.show(); playBtn.left = 64; voiceFileText.setContent('.claude/tts-voice.txt'); }
    else { changeBtn.hide(); playBtn.left = 52; voiceFileText.setContent(''); }

    // Group 2: Audio Effects
    const effects = configService.getConfig().effects ?? EFFECTS_DEFAULTS;
    reverbValue.setContent(formatReverbState(effects.reverbPreset ?? 'light'));

    // Group 3: Background Music
    const music = configService.getConfig().backgroundMusic ?? configService.getConfig().music ?? MUSIC_DEFAULTS;
    // Strip leading emoji so double-width chars don't misalign buttons on the same row
    trackValue.setContent(_stripLeadingEmoji(formatTrackName(music.track)));
    const musicEnabled = music.enabled ?? false;
    musicToggleBtn.setContent(musicEnabled ? 'Enabled' : 'Disabled');
    musicToggleBtn.style.bg = musicEnabled ? COLORS.btnEnableOn : COLORS.btnEnableOff;
    volumeValue.setContent(formatVolume(music.volume));

    // Group 4: Personality & Verbosity
    const cfg = configService.getConfig();
    verbosityValue.setContent(formatVerbosity(cfg.verbosity));
    personalityValue.setContent(_stripLeadingEmoji(formatPersonality(cfg.personality)));
    const _pers = (cfg.personality ?? '').trim();
    personalityFileText.setContent(
      (_pers && _pers !== 'none' && _pers !== 'normal')
        ? `.claude/personalities/${_pers}.md`
        : '',
    );

    // Group 5: Intro Text
    introTextValue.setContent(formatIntroText(cfg.pretext));

    // Group 6: Audio Destination
    const audioDst   = cfg.audio_destination ?? 'local';
    const audioAlias = cfg.audio_ssh_alias ?? '';
    audioDstValue.setContent(formatAudioDst(audioDst, audioAlias));
    // Show/hide SSH Alias row and stream mode toggle based on destination
    if (audioDst === 'remote') {
      audioSshLabel.show();
      audioSshValue.show();
      audioSshEditBtn.show();
      audioStreamModeBtn.show();
      audioSshValue.setContent(audioAlias || '(none)');
      const streamMode = cfg.audio_stream_mode ?? 'text';
      audioStreamModeBtn.setContent(streamMode === 'pulse' ? 'Streaming Pulse Audio' : 'Streaming Text Only ✓');
      audioStreamModeBtn.style.bg = streamMode === 'text' ? '#1565c0' : COLORS.btnChange;
    } else {
      audioSshLabel.hide();
      audioSshValue.hide();
      audioSshEditBtn.hide();
      audioStreamModeBtn.hide();
    }

    if (typeof updateHeaderStatus === 'function') updateHeaderStatus();
    screen.render();
  }

  function refreshConfigDisplay() {
    const globalPath = configService.getGlobalConfigPath();
    const localPath  = configService.getLocalConfigPath();
    const hasLocal   = configService.hasLocalConfig();
    // Abbreviate home dir with ~ for readability
    const home = os.homedir();
    const abbrev = (p) => p.startsWith(home) ? '~' + p.slice(home.length) : p;
    configGlobalValue.setContent(abbrev(globalPath));
    // Local path shown in full (not abbreviated) so the user sees the real location
    configLocalValue.setContent(
      hasLocal ? localPath : 'None  (settings saved to global)',
    );
    screen.render();
  }

  // -------------------------------------------------------------------------
  // Tab Component Contract implementation

  return {
    box,

    show() {
      _captureSnapshot();
      box.show();
      refreshDisplay();
      refreshConfigDisplay();
      // Force full olines invalidation — prevents ghost rows when the tab becomes visible
      try {
        for (let r = 0; r < screen.height; r++)
          for (let c = 0; c < screen.width; c++)
            if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
      } catch {}
      screen.render();
    },

    hide() {
      _killSample();
      playBtn.setContent('▶ Play');
      _killTest();
      _restoreTestBtnsLabels();
      _killMusicTest();
      musicTestBtn.setContent('▶ Preview');
      // Kill any pending soprano status check
      if (_sopranoStatusProc) {
        try { _sopranoStatusProc.kill(); } catch {}
        _sopranoStatusProc = null;
      }
      box.hide();
      screen.render();
    },

    onFocus() {
      // Use _focusButton (not raw .focus()) so olines get invalidated before render,
      // preventing the ghost-duplicate-row artifact on initial tab activation.
      _focusButton(_buttons[_currentIdx]);
    },

    onBlur() {
      _killSample();
      playBtn.setContent('▶ Play');
      _killTest();
      _restoreTestBtnsLabels();
      _killMusicTest();
      musicTestBtn.setContent('▶ Preview');
    },

    getFooterText() {
      return FOOTER_TEXT;
    },

    getFooterColor() {
      return COLORS.footerBg;
    },

    focusBottomRow() {
      _currentIdx = _buttons.indexOf(fullPreviewBtn);
      _focusButton(fullPreviewBtn);
    },

    focusLastBottomRow() {
      _currentIdx = _buttons.indexOf(cancelChangesBtn);
      _focusButton(cancelChangesBtn);
    },
  };
}

// ---------------------------------------------------------------------------
// Private: Create a styled focusable button

function _createButton(parent, screen, label, COLORS, onClick, opts = {}) {
  const baseBg = opts.bg ?? COLORS.btnDefault;
  const getDynamicBg = opts.getDynamicBg ?? null;
  const btn = blessed.button({
    parent,
    content: label,
    mouse: true,
    keys: true,
    shrink: true,
    padding: { left: 1, right: 1 },
    style: {
      bg: baseBg,
      fg: 'white',
      focus: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
    },
  });

  // Focus indicators: ►label◄ with blinking █ cursor
  // Store interval on the button so it can be cleared when the button is hidden.
  btn._btnBlinkInterval = null;
  btn.on('focus', () => {
    btn.style.bg = COLORS.btnFocus;
    btn.style.fg = COLORS.btnFocusFg;
    const raw = btn.content.replace(/[►◄█]/g, '').trim();
    btn.setContent(`►${raw}◄ █`);
    let _on = true;
    screen.render();
    btn._btnBlinkInterval = setInterval(() => {
      _on = !_on;
      // Skip if spinner has overridden the content (no ► means spinner is active)
      if (!btn.content.includes('►')) return;
      const r = btn.content.replace(/[►◄█]/g, '').trim();
      btn.setContent(_on ? `►${r}◄ █` : `►${r}◄`);
      screen.render();
    }, 500);
  });
  btn.on('blur', () => {
    if (btn._btnBlinkInterval) { clearInterval(btn._btnBlinkInterval); btn._btnBlinkInterval = null; }
    btn.style.bg = getDynamicBg ? getDynamicBg() : baseBg;
    btn.style.fg = 'white';
    const raw = btn.content.replace(/[►◄█]/g, '').trim();
    btn.setContent(raw);
    screen.render();
  });

  // Keyboard activation with magenta flash
  btn.key(['enter', 'space'], () => {
    btn.style.bg = COLORS.btnPress;
    btn.style.fg = 'white';
    screen.render();
    setTimeout(() => {
      btn.style.bg = getDynamicBg ? getDynamicBg() : baseBg;
      btn.style.fg = 'white';
      screen.render();
      onClick();
    }, 150);
  });

  // Mouse click only — no mouseover so hover never causes render artifacts
  btn.on('click', () => btn.press());

  return btn;
}

// ---------------------------------------------------------------------------
// Private: Provider picker modal — all providers, install status, instructions

const _ALL_PROVIDERS = [
  { id: 'piper',        name: 'Piper TTS',    platforms: ['linux', 'darwin', 'win32'], desc: 'High-quality local neural TTS' },
  { id: 'soprano',      name: 'Soprano',      platforms: ['linux', 'darwin'],          desc: 'Ultra-fast neural TTS (single voice)' },
  { id: 'sapi',         name: 'Windows SAPI', platforms: ['win32'],                   desc: 'Windows built-in text-to-speech' },
  { id: 'macos',        name: 'Mac Say',      platforms: ['darwin'],                  desc: 'macOS built-in text-to-speech' },
];

const _INSTALL_CMDS = {
  piper:          ['pip install piper-tts', 'OR:   pipx install piper-tts', '', 'Voices are downloaded separately:', 'Run: agentvibes install  (then choose Piper)'],
  soprano:        ['pip install soprano-tts', 'OR:   pipx install soprano-tts', '', 'Keep model loaded for fast synthesis:', 'soprano-webui'],
  sapi:           ['Built-in on Windows — no install required.', 'Only works in a native Windows shell,', 'not inside WSL. Use piper or soprano in WSL.'],
  macos:          ['Built-in on macOS — no install required.', 'The say command ships with every Mac.'],
};

function _detectEnvLabel() {
  if (process.platform === 'win32') return { label: 'Windows', platform: 'win32' };
  if (process.platform === 'darwin') return { label: 'macOS', platform: 'darwin' };
  try {
    const v = fs.readFileSync('/proc/version', 'utf8');
    if (v.toLowerCase().includes('microsoft')) return { label: 'WSL (Linux/Microsoft)', platform: 'linux' };
  } catch {}
  return { label: 'Linux', platform: 'linux' };
}

function _openProviderPicker(screen, providerService, onSelect, onClose) {
  const { label: envLabel, platform } = _detectEnvLabel();
  const installed = new Set(providerService.getInstalledProviders());
  const current   = providerService.getActiveProvider();

  const modal = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 70,
    height: 24,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Select Provider'),
    style: { border: { fg: COLORS.btnFocus }, bg: COLORS.contentBg },
  });

  function _close() {
    modal.destroy();
    try {
      for (let r = 0; r < screen.height; r++)
        for (let c = 0; c < screen.width; c++)
          if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
    } catch {}
    onClose?.();
    screen.render();
  }

  // Environment header
  blessed.text({
    parent: modal, top: 0, left: 1, tags: true,
    content: `{bright-cyan-fg}🖥  Environment:{/bright-cyan-fg} {bold}${envLabel}{/bold}`,
    style: { bg: COLORS.contentBg },
  });
  blessed.text({
    parent: modal, top: 1, left: 0,
    content: ' ' + '─'.repeat(66),
    style: { fg: COLORS.sectionHdr, bg: COLORS.contentBg },
  });

  // Provider rows (top 2–5)
  const actionBtns = [];
  let focusIdx = 0;

  _ALL_PROVIDERS.forEach((prov, i) => {
    const rowTop      = 2 + (i * 2);   // 2 rows per provider: name row + description row
    const isSupported = prov.platforms.includes(platform);
    const isInstalled = installed.has(prov.id);
    const isCurrent   = prov.id === current;

    if (!isSupported) {
      const osMap = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };
      const forOs = prov.platforms.map(p => osMap[p] ?? p).join('/');
      blessed.text({
        parent: modal, top: rowTop, left: 1, width: 66, tags: true,
        content: `{#546e7a-fg}✗  ${prov.name}  — only on: ${forOs}{/#546e7a-fg}`,
        style: { bg: COLORS.contentBg },
      });
      blessed.text({
        parent: modal, top: rowTop + 1, left: 5, width: 62, tags: true,
        content: `{#455a64-fg}${prov.desc}{/#455a64-fg}`,
        style: { bg: COLORS.contentBg },
      });
      return;
    }

    const icon   = isInstalled ? '{green-fg}✓{/green-fg}' : '{#ef9a9a-fg}✗{/#ef9a9a-fg}';
    const name   = isInstalled ? `{bold}${prov.name}{/bold}` : prov.name;
    const active = isCurrent   ? ' {yellow-fg}[active]{/yellow-fg}' : '';
    const status = isInstalled ? '{green-fg}Installed{/green-fg}' : '{#ef9a9a-fg}Not found{/#ef9a9a-fg}';

    blessed.text({ parent: modal, top: rowTop,     left: 1,  width: 30, tags: true, content: `${icon}  ${name}${active}`, style: { bg: COLORS.contentBg } });
    blessed.text({ parent: modal, top: rowTop,     left: 44, width: 12, tags: true, content: status,                      style: { bg: COLORS.contentBg } });
    blessed.text({ parent: modal, top: rowTop + 1, left: 5,  width: 60, tags: true,
      content: `{#90a4ae-fg}${prov.desc}{/#90a4ae-fg}`, style: { bg: COLORS.contentBg } });

    const btn = _createButton(modal, screen, isInstalled ? 'Select' : 'Install', COLORS, () => {
      if (isInstalled) {
        _close(); onSelect(prov.id);
      } else {
        const lines = _INSTALL_CMDS[prov.id] ?? ['No instructions available.'];
        instrTitle.setContent(`{bright-cyan-fg}Install — ${prov.name}:{/bright-cyan-fg}`);
        instrContent.setContent(lines.map(l => l ? `{bright-cyan-fg}${l}{/bright-cyan-fg}` : '').join('\n'));
        screen.render();
      }
    });
    btn.top = rowTop; btn.left = 57;
    if (isCurrent) focusIdx = actionBtns.length;
    actionBtns.push(btn);
  });

  // Separator + instructions panel (shifted down 4 rows due to 2-row provider layout)
  blessed.text({ parent: modal, top: 10, left: 0, content: ' ' + '─'.repeat(66), style: { fg: COLORS.sectionHdr, bg: COLORS.contentBg } });

  const instrTitle = blessed.text({
    parent: modal, top: 11, left: 1, width: 66, tags: true,
    content: '{bright-cyan-fg}Install instructions — click Install beside a provider:{/bright-cyan-fg}',
    style: { bg: COLORS.contentBg },
  });
  const instrContent = blessed.text({
    parent: modal, top: 12, left: 3, width: 64, height: 5, tags: true,
    content: '{#546e7a-fg}(click Install beside a provider to see commands){/#546e7a-fg}',
    style: { bg: COLORS.contentBg },
  });

  // Bottom separator + Cancel
  blessed.text({ parent: modal, top: 18, left: 0, content: ' ' + '─'.repeat(66), style: { fg: COLORS.sectionHdr, bg: COLORS.contentBg } });

  const cancelBtn = _createButton(modal, screen, 'Cancel', COLORS, _close);
  cancelBtn.top = 19; cancelBtn.left = 'center';
  actionBtns.push(cancelBtn);

  // Keyboard navigation
  for (let i = 0; i < actionBtns.length; i++) {
    actionBtns[i].key(['down', 'tab'], () => {
      const cur = actionBtns.findIndex(b => b === screen.focused);
      actionBtns[(cur + 1) % actionBtns.length].focus();
    });
    actionBtns[i].key(['up', 'S-tab'], () => {
      const cur = actionBtns.findIndex(b => b === screen.focused);
      actionBtns[(cur - 1 + actionBtns.length) % actionBtns.length].focus();
    });
  }
  modal.key(['escape', 'q'], _close);

  (actionBtns[focusIdx] ?? actionBtns[0])?.focus();
  screen.render();
}

// ---------------------------------------------------------------------------
// Private: Destroy helper — now imported from shared widgets/destroy-list.js
// (kept as comment for git blame traceability)

// NOTE: The following line was the old _destroyList definition, now using shared import:
// import { destroyList } from '../widgets/destroy-list.js';
//
// Old code removed to eliminate duplication (M1 fix).
// The shared destroyList has identical behavior.

// ---------------------------------------------------------------------------
// Private: Show a temporary stub notice text

// Strip a leading emoji character (code points > U+2500 cover emoji ranges)
// while preserving punctuation like en-dash (U+2013) and em-dash (U+2014).
function _stripLeadingEmoji(s) {
  if (!s) return s;
  const cp = s.codePointAt(0);
  return cp > 0x2500 ? s.slice(String.fromCodePoint(cp).length).trimStart() : s;
}

/**
 * Show a "Save Preview" confirmation modal.
 * Displays the destination path and all key-value pairs that will be saved.
 * User must press [OK — Save] to confirm or [Cancel] to abort.
 *
 * @param {object} screen  - blessed screen
 * @param {string} filePath - absolute destination path
 * @param {object} data     - config object to be saved
 * @param {Function} onConfirm - called only if user presses OK
 */
function _showSavePreview(screen, filePath, data, onConfirm, onClose) {
  // Flatten nested objects one level deep
  const rawLines = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const [sk, sv] of Object.entries(v)) {
        rawLines.push([`${k}.${sk}`, String(sv ?? '')]);
      }
    } else {
      rawLines.push([k, String(v ?? '')]);
    }
  }

  const keyWidth  = rawLines.length ? Math.max(...rawLines.map(([k]) => k.length)) : 0;
  const pathLine  = `  Path: ${filePath}`;
  const kvMaxW    = rawLines.length ? Math.max(...rawLines.map(([k, v]) => 2 + keyWidth + 2 + v.length)) : 0;
  const innerW    = Math.max(52, pathLine.length + 2, kvMaxW + 4);
  const width     = Math.min(innerW + 4, screen.width - 4);
  const sep       = '─'.repeat(Math.max(0, Math.min(innerW - 2, width - 6)));

  const taggedKV = rawLines.map(([k, v]) =>
    `  {#90a4ae-fg}${k.padEnd(keyWidth)}:{/#90a4ae-fg} {#ffff00-fg}${v}{/#ffff00-fg}`
  );

  // Content rows (all text rendered via box.content; buttons are child widgets)
  const contentLines = [
    `  {#90a4ae-fg}Path:{/#90a4ae-fg} ${filePath}`,
    `  ${sep}`,
    ...taggedKV,
    `  ${sep}`,
    '',   // blank row — buttons sit here as child widgets
  ];

  const height = contentLines.length + 2;  // +2 for top/bottom border

  const modal = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width,
    height,
    label: _modalTitle('Save Preview'),
    border: { type: 'line' },
    tags: true,
    content: contentLines.join('\n'),
    style: {
      fg: '#e3f2fd',
      bg: COLORS.contentBg,
      border: { fg: 'bright-cyan' },
    },
  });

  function _close() { destroyList(modal, screen, onClose); }

  modal.key(['escape'], _close);

  // Buttons are children of the modal box; top is relative to box content area
  const btnRow = contentLines.length - 1;   // last content line (the blank row)
  const midX   = Math.floor((width - 2) / 2);

  const cancelBtn = _createButton(modal, screen, 'Cancel', COLORS, _close, { bg: '#c62828' });
  cancelBtn.top  = btnRow;
  cancelBtn.left = midX - 14;

  const okBtn = _createButton(modal, screen, 'OK — Save', COLORS, () => {
    _close();
    onConfirm();
  }, { bg: '#1565c0' });
  okBtn.top  = btnRow;
  okBtn.left = midX + 2;

  // Keyboard navigation between OK and Cancel buttons
  okBtn.key(['tab', 'left', 'right'], () => { cancelBtn.focus(); screen.render(); });
  cancelBtn.key(['tab', 'left', 'right'], () => { okBtn.focus(); screen.render(); });

  screen.render();
  okBtn.focus();
}

function _showNotice(screen, message) {
  _showNoticeWidget(screen, message, { bg: COLORS.contentBg });
}

// ---------------------------------------------------------------------------
// Private: Effects config read/write helpers

function _getEffects(configService) {
  return configService.getConfig().effects ?? EFFECTS_DEFAULTS;
}

function _setEffects(configService, partial) {
  const current = configService.getConfig().effects ?? EFFECTS_DEFAULTS;
  const merged = { ...current, ...partial };
  configService.set('effects', merged);
}

// ---------------------------------------------------------------------------
// Private: _openReverbPicker removed — now using shared import:
//   import { openReverbPicker } from '../widgets/reverb-picker.js';

// ---------------------------------------------------------------------------
// Private: Background music config read/write helpers

function _getMusic(configService) {
  return configService.getConfig().backgroundMusic ?? MUSIC_DEFAULTS;
}

function _setMusic(configService, partial) {
  const current = configService.getConfig().backgroundMusic ?? MUSIC_DEFAULTS;
  const merged = { ...current, ...partial };
  configService.set('backgroundMusic', merged);
}

// ---------------------------------------------------------------------------
// Private: Inline track picker

function _openTrackPicker(screen, configService, onSelect, onClose) {
  // Scan .claude/audio/tracks/ dynamically; fall back to BUILT_IN_TRACKS if missing.
  const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
  let tracks;
  try {
    const files = fs.readdirSync(tracksDir);
    tracks = files
      .filter(f => /\.mp3$/i.test(f))
      .sort()
      .map(f => ({ file: f, label: formatTrackName(f) }));
  } catch {
    tracks = BUILT_IN_TRACKS;
  }

  const ADD_SENTINEL = '__ADD_CUSTOM_TRACK__';
  const allItems = [...tracks, { file: ADD_SENTINEL, label: '+ Add Custom Track' }];

  const currentTrack = (configService.getConfig().backgroundMusic?.track ?? MUSIC_DEFAULTS.track);
  const items = allItems.map(t =>
    t.file === ADD_SENTINEL
      ? `  {bright-cyan-fg}+ Add Custom Track{/bright-cyan-fg}`
      : (t.file === currentTrack ? `● ${t.label}` : `  ${t.label}`)
  );
  const currentIdx = tracks.findIndex(t => t.file === currentTrack);

  const listHeight = Math.min(allItems.length + 4, Math.floor(screen.rows * 0.7));
  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 50,
    height: listHeight,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Select Track'),
    items,
    keys: true,
    vi: false,
    mouse: true,
    scrollable: true,
    scrollbar: { ch: '│', track: { bg: '#1e2a3a' }, style: { fg: COLORS.btnFocus } },
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  if (currentIdx >= 0) list.select(currentIdx);
  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const selected = allItems[list.selected];
    if (!selected) return;
    if (selected.file === ADD_SENTINEL) {
      // Destroy list first, then open path-input dialog
      destroyList(list, screen);
      _openCustomTrackInput(screen, tracksDir, (newFile) => {
        onSelect(newFile);
      }, onClose);
      return;
    }
    destroyList(list, screen, onClose);
    onSelect(selected.file);
  });

  list.key(['escape', 'q'], () => {
    destroyList(list, screen, onClose);
  });
}

// ---------------------------------------------------------------------------
// Private: Custom track path-input dialog — copies an MP3 into tracks dir

function _openCustomTrackInput(screen, tracksDir, onDone, onClose) {
  let _closed = false;

  const modal = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 64,
    height: 11,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Add Custom Track'),
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg, border: { fg: COLORS.btnFocus } },
  });

  blessed.text({
    parent: modal, top: 1, left: 2,
    content: 'Enter full path to an MP3 file:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const inputBox = blessed.textbox({
    parent: modal, top: 3, left: 2, right: 2, height: 3,
    border: { type: 'line' },
    inputOnFocus: true,
    style: {
      fg: COLORS.valueFg, bg: '#0d1b35',
      border: { fg: COLORS.borderFg },
      focus: { border: { fg: COLORS.btnFocus } },
    },
  });

  const errText = blessed.text({
    parent: modal, top: 7, left: 2, width: 58,
    tags: true, content: '',
    style: { bg: COLORS.contentBg },
  });

  function _close() {
    if (_closed) return;
    _closed = true;
    modal.destroy();
    try {
      for (let r = 0; r < screen.height; r++)
        for (let c = 0; c < screen.width; c++)
          if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
    } catch {}
    onClose?.();
    screen.render();
  }

  function _addTrack() {
    const raw = inputBox.getValue().trim();
    if (!raw) return;
    const src = path.resolve(raw);

    // Validate: must be a readable .mp3 file owned by the current user
    if (!/\.mp3$/i.test(src)) {
      errText.setContent('{red-fg}File must be an MP3 (.mp3){/red-fg}');
      screen.render(); return;
    }
    try {
      const stat = fs.statSync(src);
      if (!stat.isFile()) throw new Error('not a file');
      if (stat.uid !== undefined && stat.uid !== process.getuid?.()) {
        errText.setContent('{red-fg}File not owned by current user{/red-fg}');
        screen.render(); return;
      }
    } catch {
      errText.setContent('{red-fg}File not found or not accessible{/red-fg}');
      screen.render(); return;
    }

    const dest = path.join(tracksDir, path.basename(src));
    try {
      fs.mkdirSync(tracksDir, { recursive: true });
      fs.copyFileSync(src, dest);
    } catch {
      errText.setContent('{red-fg}Could not copy file to tracks directory{/red-fg}');
      screen.render(); return;
    }

    _closed = true;
    modal.destroy();
    try {
      for (let r = 0; r < screen.height; r++)
        for (let c = 0; c < screen.width; c++)
          if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
    } catch {}
    screen.render();
    onDone(path.basename(src));
  }

  inputBox.key(['enter'], _addTrack);
  inputBox.key(['escape'], _close);

  const addBtn = _createButton(modal, screen, 'Add Track', COLORS, _addTrack);
  addBtn.bottom = 1; addBtn.left = 4;

  const cancelBtn = _createButton(modal, screen, 'Cancel', COLORS, _close);
  cancelBtn.bottom = 1; cancelBtn.left = 18;

  addBtn.key(['tab'], () => { cancelBtn.focus(); screen.render(); });
  cancelBtn.key(['tab'], () => { inputBox.focus(); screen.render(); });

  modal.setFront();
  inputBox.focus();
  screen.render();
}

// ---------------------------------------------------------------------------
// Private: Inline volume picker (10% steps: 10–100)

function _openVolumePicker(screen, configService, onSelect, onClose) {
  const VOLUMES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const currentVol = configService.getConfig().backgroundMusic?.volume ?? MUSIC_DEFAULTS.volume;
  const currentIdx = Math.max(0, VOLUMES.indexOf(currentVol));

  // Preview state
  let _previewProcess = null;
  let _previewVol     = null;

  const _previewEnv = buildAudioEnv();

  function _killPreview() {
    if (_previewProcess) {
      if (_IS_WINDOWS) {
        try { _previewProcess.kill(); } catch {}
      } else {
        try { process.kill(-_previewProcess.pid, 'SIGTERM'); } catch {}
      }
      _previewProcess = null;
    }
    _previewVol = null;
  }

  function _buildItems() {
    return VOLUMES.map((v, i) => {
      const mark = (v === _previewVol) ? '♪' : (i === currentIdx ? '●' : ' ');
      const hint = (v === _previewVol) ? ' (Space to stop) ' : ' (Space to test) ';
      return ` ${mark} ${String(v).padStart(3)}%${hint}`;
    });
  }

  function _refreshList() {
    const sel = list.selected;
    list.setItems(_buildItems());
    list.select(sel);
    screen.render();
  }

  function _close() {
    _killPreview();
    list.destroy();
    // Force-invalidate olines so blessed redraws every cell the modal covered
    try {
      for (let r = 0; r < screen.height; r++)
        for (let c = 0; c < screen.width; c++)
          if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
    } catch {}
    onClose?.();
    screen.render();
  }

  function _previewVolume(vol) {
    const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
    const trackId   = configService.getConfig().backgroundMusic?.track ?? MUSIC_DEFAULTS.track;
    const trackPath = path.resolve(tracksDir, trackId);
    const safeBase  = path.resolve(tracksDir);
    if (!trackPath.startsWith(safeBase + path.sep) && trackPath !== safeBase) return;

    // Toggle: pressing Space on the currently playing volume stops it
    if (_previewVol === vol) {
      _killPreview();
      _refreshList();
      return;
    }

    _killPreview();
    _previewVol = vol;

    const volFraction = (Math.max(10, Math.min(100, vol)) / 100).toFixed(2);
    const cmd = [
      `ffplay -nodisp -t 10 -loglevel quiet -volume ${vol} "${trackPath}"`,
      `play "${trackPath}" trim 0 10 vol ${volFraction}`,
      `mpg123 -q "${trackPath}"`,
    ].join(' 2>/dev/null || ') + ' 2>/dev/null';

    if (_IS_WINDOWS) {
      const _clampedVol3 = Math.max(10, Math.min(100, vol));
      _previewProcess = spawn('ffplay', ['-nodisp', '-t', '10', '-loglevel', 'quiet', '-volume', String(_clampedVol3), trackPath], _spawnOpts(_previewEnv));
      _previewProcess.on('error', () => { _previewProcess = null; _previewVol = null; _refreshList(); });
    } else {
      _previewProcess = spawn('sh', ['-c', cmd], _spawnOpts(_previewEnv));
    }
    _previewProcess.unref();
    _refreshList();

    _previewProcess.on('exit', () => {
      if (_previewVol === vol) { _killPreview(); _refreshList(); }
    });
    _previewProcess.on('error', () => {
      if (_previewVol === vol) { _killPreview(); _refreshList(); }
    });
  }

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 28,
    height: VOLUMES.length + 4,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Volume'),
    items: _buildItems(),
    keys: true,
    vi: false,
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

  // Space → preview audio at selected volume (toggle stop/play)
  list.key(['space'], () => {
    const vol = VOLUMES[list.selected];
    if (vol !== undefined) _previewVolume(vol);
  });

  // Enter → accept selected volume and close
  list.key(['enter'], () => {
    const vol = VOLUMES[list.selected];
    if (vol === undefined) return;
    _close();
    onSelect(vol);
  });

  list.key(['escape', 'q'], () => {
    _close();
  });
}

// ---------------------------------------------------------------------------
// Private: Full music browser modal — rich track selection with favorites + preview

function _openMusicBrowserModal(screen, configService, navigationService, onDone, onClose) {
  let _allTracks = [];
  let _showFavoritesOnly = false;
  let _previewProcess = null;
  let _previewTrackId = null;
  let _closed = false;

  // Block global Tab-to-cycle-tab while modal is open
  navigationService?.openModal();

  const _modalEnv = buildAudioEnv();

  function _killPreview() {
    if (_previewProcess) {
      if (_IS_WINDOWS) {
        try { _previewProcess.kill(); } catch {}
      } else {
        try { process.kill(-_previewProcess.pid, 'SIGTERM'); } catch {}
      }
      _previewProcess = null;
    }
    _previewTrackId = null;
  }

  function _closeModal() {
    if (_closed) return;
    _closed = true;
    navigationService?.closeModal();
    _killPreview();
    modal.destroy();

    // Force-invalidate olines so draw() rewrites every cell the modal covered
    screen.clearRegion(0, screen.cols, 2, screen.rows - 2);
    for (let r = 2; r < screen.rows - 2; r++) {
      const orow = screen.olines[r];
      if (!orow) continue;
      for (let c = 0; c < screen.cols; c++) {
        if (orow[c]) orow[c][0] = -1;
      }
      orow.dirty = true;
    }

    onClose?.();
    screen.render();
    onDone();
  }

  // ---- Modal overlay ----
  const modal = blessed.box({
    parent: screen,
    top: '5%',
    left: '3%',
    width: '94%',
    height: '90%',
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('🎵 Select Music Track'),
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.btnFocus },
      label: { fg: COLORS.btnFocus },
    },
  });
  modal.setFront();

  // ---- Track list ----
  const modalTrackList = blessed.list({
    parent: modal,
    top: 1,
    left: 2,
    right: 2,
    bottom: 6,
    keys: true,
    vi: true,
    mouse: true,
    border: { type: 'line' },
    scrollbar: { ch: '│', style: { fg: COLORS.borderFg } },
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
      selected: { bg: '#2e7d32', fg: '#ffffff', bold: true },
      item: { fg: COLORS.labelFg },
    },
  });

  // ---- Preview status line ----
  const modalPreviewLine = blessed.text({
    parent: modal,
    bottom: 5,
    left: 2,
    right: 2,
    tags: true,
    content: '',
    style: { fg: 'bright-cyan', bg: COLORS.contentBg },
  });

  // ---- File location hint ----
  blessed.text({
    parent: modal,
    bottom: 4,
    left: 2,
    right: 2,
    tags: true,
    content: `{#455a64-fg}Add MP3 files to: .claude/audio/tracks/  •  Supports ffplay / mpg123 / play{/#455a64-fg}`,
    style: { bg: COLORS.contentBg },
  });

  // ---- Key hint bar ----
  blessed.text({
    parent: modal,
    bottom: 3,
    left: 2,
    right: 2,
    content: '{#455a64-fg}[\u2191\u2193] Navigate  [Enter] Select  [Space] Preview  [F] Favorite  [/] Favorites only  [Esc] Cancel{/#455a64-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // ---- Buttons ----
  const selectTrackBtn = _createButton(modal, screen, 'Select Track', COLORS, () => {
    const visible = _getVisibleTracks();
    const selected = visible[modalTrackList.selected];
    if (selected) {
      try {
        const current = configService.getConfig().backgroundMusic ?? {};
        configService.set('backgroundMusic', { ...current, track: selected.id });
      } catch {}
      _closeModal();
    }
  });
  selectTrackBtn.bottom = 1;
  selectTrackBtn.left = 4;

  const cancelModalBtn = _createButton(modal, screen, 'Cancel', COLORS, _closeModal);
  cancelModalBtn.bottom = 1;
  cancelModalBtn.left = 22;

  // ---- Helper functions ----

  function _getVisibleTracks() {
    if (!_showFavoritesOnly) return _allTracks;
    const favs = getMusicFavorites(configService);
    return _allTracks.filter(t => favs.includes(t.id));
  }

  function _buildListItems(tracks) {
    const currentTrack = configService.getConfig().backgroundMusic?.track ?? MUSIC_DEFAULTS.track;
    const favs = getMusicFavorites(configService);
    return tracks.map(t => {
      const isActive = t.id === currentTrack;
      const isFav    = favs.includes(t.id);
      const isPrev   = t.id === _previewTrackId;
      const activeMark = isPrev ? '\u266A' : (isActive ? '\u25B6' : ' ');
      const favMark    = isFav ? '\u2605' : ' ';
      return ` ${activeMark} ${favMark} ${formatTrackName(t.id) || t.label}`;
    });
  }

  function _refreshList() {
    if (_closed) return;
    const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
    const scanned = scanTracks();
    _allTracks = scanned;
    const visible = _getVisibleTracks();
    const items = _buildListItems(visible);
    modalTrackList.setItems(items.length > 0 ? items : [' (no tracks found)']);
    screen.render();
  }

  function _previewTrack(trackId) {
    const tracksDir = path.join(process.cwd(), '.claude', 'audio', 'tracks');
    const trackPath = path.resolve(tracksDir, trackId);
    const safeBase  = path.resolve(tracksDir);
    if (!trackPath.startsWith(safeBase + path.sep) && trackPath !== safeBase) return;

    // Toggle: second press on same track → stop
    if (_previewTrackId === trackId) {
      _killPreview();
      if (!_closed) { modalPreviewLine.setContent(''); screen.render(); }
      _refreshList();
      return;
    }

    _killPreview();

    const _mp3Player = detectMp3Player(_modalEnv);
    if (!_mp3Player) return;
    _previewProcess = spawn(_mp3Player.bin, _mp3Player.args(trackPath), {
      stdio: 'ignore', detached: !_IS_WINDOWS, windowsHide: true, env: _modalEnv,
    });
    _previewProcess.unref();
    _previewTrackId = trackId;

    const label = _allTracks.find(t => t.id === trackId)?.label ?? formatTrackLabel(trackId);
    if (!_closed) {
      modalPreviewLine.setContent(`{bright-cyan-fg}\u266A Previewing: ${label}  (Space to stop){/bright-cyan-fg}`);
      screen.render();
    }

    _previewProcess.on('exit', () => {
      if (_previewTrackId === trackId) {
        _previewTrackId = null;
        _previewProcess = null;
        if (!_closed) { modalPreviewLine.setContent(''); _refreshList(); }
      }
    });

    _previewProcess.on('error', () => {
      _previewTrackId = null;
      _previewProcess = null;
      if (!_closed) { modalPreviewLine.setContent(''); screen.render(); }
    });
  }

  // ---- Key bindings ----

  modalTrackList.key(['enter'], () => {
    const visible = _getVisibleTracks();
    const sel = visible[modalTrackList.selected];
    if (sel) {
      try {
        const current = configService.getConfig().backgroundMusic ?? {};
        configService.set('backgroundMusic', { ...current, track: sel.id });
      } catch {}
      _closeModal();
    }
  });

  modalTrackList.key(['space'], () => {
    const visible = _getVisibleTracks();
    const sel = visible[modalTrackList.selected];
    if (sel) { _previewTrack(sel.id); }
  });

  modalTrackList.key(['f', 'F'], () => {
    const visible = _getVisibleTracks();
    const sel = visible[modalTrackList.selected];
    if (sel) {
      toggleMusicFavorite(configService, sel.id);
      _refreshList();
    }
  });

  modalTrackList.key(['/'], () => {
    _showFavoritesOnly = !_showFavoritesOnly;
    _refreshList();
  });

  modalTrackList.key(['escape', 'q'], _closeModal);

  // Tab: list → [Select Track] → [Cancel] → list
  modalTrackList.key(['tab'], () => { selectTrackBtn.focus(); screen.render(); });
  selectTrackBtn.key(['tab'], () => { cancelModalBtn.focus(); screen.render(); });
  cancelModalBtn.key(['tab'], () => { modalTrackList.focus(); screen.render(); });
  selectTrackBtn.key(['escape'], _closeModal);
  cancelModalBtn.key(['escape'], _closeModal);

  // ---- Initial load ----
  _refreshList();

  // Scroll to active track on open
  const currentTrack = configService.getConfig().backgroundMusic?.track ?? MUSIC_DEFAULTS.track;
  const activeIdx = _getVisibleTracks().findIndex(t => t.id === currentTrack);
  if (activeIdx >= 0) modalTrackList.select(activeIdx);

  modalTrackList.focus();
  screen.render();
}

// ---------------------------------------------------------------------------
// Private: Inline verbosity picker

function _openVerbosityPicker(screen, configService, onDone, onClose) {
  const levels = ['Minimal', 'Low', 'Medium', 'High', 'Custom'];
  const current = configService.getConfig().verbosity ?? 'high';
  const currentIdx = Math.max(0, levels.findIndex(l => l.toLowerCase() === current));

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 28,
    height: levels.length + 4,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Verbosity Level'),
    items: levels.map((l, i) => (i === currentIdx ? `● ${l}` : `  ${l}`)),
    keys: true,
    vi: false,
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

  list.key(['enter', 'space'], () => {
    const selected = levels[list.selected];
    if (!selected) return;
    destroyList(list, screen, onClose);
    configService.set('verbosity', selected.toLowerCase());
    onDone();
  });

  list.key(['escape', 'q'], () => {
    destroyList(list, screen, onClose);
  });
}

// ---------------------------------------------------------------------------
// Private: Inline intro text editor

function _openIntroTextEditor(screen, configService, onDone, onClose) {
  const current = configService.getConfig().pretext ?? '';
  let _closed = false;

  const modal = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 62,
    height: 11,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Edit Intro Text'),
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.btnFocus },
    },
  });

  blessed.text({
    parent: modal,
    top: 1,
    left: 2,
    content: 'Enter intro text (max 50 chars, prepended before TTS):',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const inputBox = blessed.textbox({
    parent: modal,
    top: 3,
    left: 2,
    right: 2,
    height: 3,
    border: { type: 'line' },
    inputOnFocus: true,
    style: {
      fg: COLORS.valueFg,
      bg: '#0d1b35',
      border: { fg: COLORS.borderFg },
      focus: { border: { fg: COLORS.btnFocus } },
    },
  });
  inputBox.setValue(current);

  blessed.text({
    parent: modal,
    bottom: 1,
    left: 2,
    content: '{#455a64-fg}[Enter] Save  [Esc] Cancel{/#455a64-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  function _close() {
    if (_closed) return;
    _closed = true;
    modal.destroy();
    screen.clearRegion(0, screen.cols, 2, screen.rows - 2);
    for (let r = 2; r < screen.rows - 2; r++) {
      const orow = screen.olines[r];
      if (!orow) continue;
      for (let c = 0; c < screen.cols; c++) { if (orow[c]) orow[c][0] = -1; }
      orow.dirty = true;
    }
    onClose?.();
    screen.render();
  }

  inputBox.key(['enter'], () => {
    const value = inputBox.getValue().replace(/\n/g, ' ').trim().slice(0, 50);
    try { configService.set('pretext', value); } catch {}
    _close();
    onDone();
  });

  inputBox.key(['escape'], () => {
    _close();
  });

  modal.setFront();
  inputBox.focus();
  screen.render();
}

// ---------------------------------------------------------------------------
// Private: Full voice browser modal — replicates the Voices tab UX

function _openVoiceBrowserModal(screen, providerService, configService, navigationService, onDone, onClose) {
  let _allVoices = [];
  let _filterText = '';
  let _playingProcess = null;
  let _playingVoiceId = null;
  let _closed = false;

  // Block global Tab-to-cycle-tab while modal is open
  navigationService?.openModal();

  const _spawnEnv = buildAudioEnv();

  function _killPreview() {
    if (_playingProcess) {
      if (_IS_WINDOWS) {
        try { _playingProcess.kill(); } catch {}
      } else {
        try { process.kill(-_playingProcess.pid, 'SIGTERM'); } catch {}
      }
      _playingProcess = null;
    }
    _playingVoiceId = null;
  }

  function _closeModal() {
    if (_closed) return;
    _closed = true;
    navigationService?.closeModal();
    _killPreview();
    modal.destroy();

    // Force-invalidate olines so draw() rewrites every cell the modal covered.
    // modal.destroy() removes the widget from lines[] but leaves olines[] stale,
    // so draw() skips repainting cells where lines==olines — terminal retains
    // modal content. Setting attr=-1 is impossible for any real cell, so draw()
    // is forced to physically rewrite each cell on the next render.
    screen.clearRegion(0, screen.cols, 2, screen.rows - 2);
    for (let r = 2; r < screen.rows - 2; r++) {
      const orow = screen.olines[r];
      if (!orow) continue;
      for (let c = 0; c < screen.cols; c++) {
        if (orow[c]) orow[c][0] = -1;
      }
      orow.dirty = true;
    }

    onClose?.();
    screen.render();
    onDone();
  }

  // ---- Modal overlay ----
  const modal = blessed.box({
    parent: screen,
    top: '8%',
    left: '4%',
    width: '92%',
    height: '84%',
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Change Voice'),
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.btnFocus },
      label: { fg: COLORS.btnFocus },
    },
  });
  modal.setFront();

  // ---- Search ----
  blessed.text({
    parent: modal,
    top: 1,
    left: 2,
    content: 'Search:',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const modalSearch = blessed.textbox({
    parent: modal,
    top: 1,
    left: 11,
    width: 40,
    height: 1,
    inputOnFocus: true,
    keys: true,
    style: {
      fg: COLORS.valueFg,
      bg: '#1a3a5c',
      focus: { bg: '#283593' },
    },
  });

  // ---- Column header ----
  blessed.text({
    parent: modal,
    top: 2,
    left: 6,
    content: `{bright-cyan-fg}${'Name'.padEnd(COL_NAME_W)}${'Gender'.padEnd(COL_GENDER_W)}Provider{/bright-cyan-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // ---- Voice list ----
  const modalVoiceList = blessed.list({
    parent: modal,
    top: 3,
    left: 2,
    right: 2,
    bottom: 6,
    keys: true,
    vi: true,
    mouse: true,
    border: { type: 'line' },
    scrollbar: { ch: '│', style: { fg: COLORS.borderFg } },
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
      selected: { bg: '#2e7d32', fg: '#ffffff', bold: true },
      item: { fg: COLORS.labelFg },
    },
  });

  // ---- Info panel ----
  blessed.text({
    parent: modal,
    bottom: 5,
    left: 2,
    content: `{bright-cyan-fg}── Voice Info ${'─'.repeat(50)}{/bright-cyan-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const modalInfoLine = blessed.text({
    parent: modal,
    bottom: 4,
    left: 2,
    right: 2,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const modalPreviewLine = blessed.text({
    parent: modal,
    bottom: 3,
    left: 2,
    right: 2,
    tags: true,
    content: '',
    style: { fg: 'bright-cyan', bg: COLORS.contentBg },
  });

  // ---- Key hint bar ----
  blessed.text({
    parent: modal,
    bottom: 2,
    left: 2,
    right: 2,
    content: '{#455a64-fg}[↑↓/jk] Navigate  [Enter] Select  [Space] Preview  [F] Favorite  [/] Search  [Esc] Cancel{/#455a64-fg}',
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  // ---- Buttons ----
  const selectBtn = _createButton(modal, screen, 'Select Voice', COLORS, () => {
    const voices = _getFiltered();
    const selected = voices[modalVoiceList.selected];
    if (selected) {
      providerService.setActiveVoice(selected);
      _closeModal();
    }
  });
  selectBtn.bottom = 1;
  selectBtn.left = 4;

  const favBtn = _createButton(modal, screen, '★ Fav', COLORS, () => {
    const filtered = _getFiltered();
    const sel = filtered[modalVoiceList.selected];
    if (sel) { toggleFavorite(configService, sel); _refreshList(); }
  });
  favBtn.bottom = 1;
  favBtn.left = 22;

  const cancelBtn = _createButton(modal, screen, 'Cancel', COLORS, _closeModal);
  cancelBtn.bottom = 1;
  cancelBtn.left = 33;

  // ---- Helper functions ----

  function _getFiltered() {
    if (!_filterText) return _allVoices;
    const f = _filterText.toLowerCase();
    return _allVoices.filter(v => v.toLowerCase().includes(f));
  }

  function _buildItems(voices) {
    const active = providerService.getActiveVoiceId();
    const favs = getFavorites(configService);
    return voices.map(v => {
      const isFav   = favs.includes(v);
      const isActive = v === active;
      const isPrev  = v === _playingVoiceId;
      const star = isFav  ? '★' : ' ';
      const dot  = isPrev ? '♪' : (isActive ? '●' : ' ');
      const { displayName, gender, provider } = getVoiceMeta(v);
      const name = displayName.length > COL_NAME_W
        ? displayName.slice(0, COL_NAME_W - 1) + '…'
        : displayName.padEnd(COL_NAME_W);
      return ` ${star}${dot} ${name}${gender.padEnd(COL_GENDER_W)}${provider}`;
    });
  }

  function _formatInfo(voiceId) {
    const { lang, name, quality } = parseVoiceId(voiceId);
    const Y = COLORS.valueFg;
    if (lang === 'unknown') {
      return `{${Y}-fg}Voice:{/${Y}-fg} ${voiceId}  {${Y}-fg}Provider:{/${Y}-fg} Piper`;
    }
    return `{${Y}-fg}Voice:{/${Y}-fg} ${name}  ` +
           `{${Y}-fg}Language:{/${Y}-fg} ${lang}  ` +
           `{${Y}-fg}Quality:{/${Y}-fg} ${quality}  ` +
           `{${Y}-fg}Provider:{/${Y}-fg} Piper  ` +
           `{${Y}-fg}ID:{/${Y}-fg} ${voiceId}`;
  }

  function _refreshList() {
    if (_closed) return;
    _allVoices = scanInstalledVoices();
    const filtered = _getFiltered();
    const items = _buildItems(filtered);
    modalVoiceList.setItems(items.length > 0 ? items : [' (no voices found — install piper first)']);
    const active = providerService.getActiveVoiceId();
    const sel = filtered[modalVoiceList.selected] ?? active ?? '';
    if (sel) modalInfoLine.setContent(`  ${_formatInfo(sel)}`);
    screen.render();
  }

  function _previewVoice(voiceId) {
    if (_playingVoiceId === voiceId) {
      _killPreview();
      if (!_closed) { modalPreviewLine.setContent(''); screen.render(); }
      return;
    }
    _killPreview();

    // Path traversal guard
    const _ms3 = parseMultiSpeaker(voiceId);
    const voicePath = path.resolve(PIPER_VOICES_DIR, _ms3.model + '.onnx');
    const safeBase  = path.resolve(PIPER_VOICES_DIR);
    if (!voicePath.startsWith(safeBase + path.sep) && voicePath !== safeBase) return;

    const tempWav = path.join(os.tmpdir(), `agentvibes-preview-${Date.now()}.wav`);
    const phrase  = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];

    const _IS_WINDOWS = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
    let _piperBin3 = 'piper';
    if (_IS_WINDOWS) {
      const _lad = process.env.LOCALAPPDATA ||
        (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
      if (_lad) {
        const _exe = path.join(_lad, 'Programs', 'Piper', 'piper.exe');
        if (fs.existsSync(_exe)) _piperBin3 = _exe;
      }
    }
    const _piperArgs3 = ['--model', voicePath, '--output_file', tempWav];
    if (_ms3.speakerId != null) _piperArgs3.push('--speaker', String(_ms3.speakerId));
    const piper = spawn(_piperBin3, _piperArgs3, {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached: !_IS_WINDOWS,
      windowsHide: true,
      env: _spawnEnv,
    });
    piper.stdin.write(phrase + '\n');
    piper.stdin.end();

    _playingProcess = piper;
    _playingVoiceId = voiceId;
    if (!_closed) {
      modalPreviewLine.setContent(`{bright-cyan-fg}♪ Synthesizing: ${voiceId}…{/bright-cyan-fg}`);
      screen.render();
    }

    piper.on('exit', (code) => {
      if (_playingVoiceId !== voiceId) {
        try { fs.unlinkSync(tempWav); } catch {}
        return;
      }
      if (code !== 0) {
        _playingVoiceId = null;
        _playingProcess = null;
        if (!_closed) {
          modalPreviewLine.setContent('{bright-cyan-fg}♪ Preview failed (piper error — is piper installed?){/bright-cyan-fg}');
          screen.render();
          setTimeout(() => { if (!_closed) { modalPreviewLine.setContent(''); screen.render(); } }, 4000);
        }
        return;
      }

      const _wavPlayer3 = detectWavPlayer(_spawnEnv);
      if (!_wavPlayer3) return;
      const playProc = spawn(_wavPlayer3.bin, _wavPlayer3.args(tempWav), {
        stdio: 'ignore',
        detached: !_IS_WINDOWS,
        windowsHide: true,
        env: _spawnEnv,
      });
      _playingProcess = playProc;

      if (!_closed) {
        modalPreviewLine.setContent(`{bright-cyan-fg}♪ Playing: ${voiceId}  (Space to stop){/bright-cyan-fg}`);
        screen.render();
      }

      playProc.on('exit', () => {
        if (_playingVoiceId === voiceId) {
          _playingVoiceId = null;
          _playingProcess = null;
          if (!_closed) { modalPreviewLine.setContent(''); screen.render(); }
        }
        try { fs.unlinkSync(tempWav); } catch {}
      });

      playProc.on('error', () => {
        _playingVoiceId = null;
        _playingProcess = null;
        if (!_closed) { modalPreviewLine.setContent(''); screen.render(); }
        try { fs.unlinkSync(tempWav); } catch {}
      });
    });

    piper.on('error', () => {
      _playingVoiceId = null;
      _playingProcess = null;
      if (!_closed) {
        modalPreviewLine.setContent('{bright-cyan-fg}♪ Cannot find piper — install with: pipx install piper-tts{/bright-cyan-fg}');
        screen.render();
        setTimeout(() => { if (!_closed) { modalPreviewLine.setContent(''); screen.render(); } }, 4000);
      }
    });
  }

  // ---- Key bindings ----

  // Search: update filter on keypress
  modalSearch.on('keypress', () => {
    setTimeout(() => {
      _filterText = modalSearch.getValue().trim();
      _refreshList();
    }, 0);
  });

  // Escape in search → back to list (not close)
  modalSearch.key(['escape'], () => {
    modalVoiceList.focus();
    screen.render();
  });

  // Tab out of search → select button
  modalSearch.key(['tab'], () => { selectBtn.focus(); screen.render(); });

  // / in list → open search
  modalVoiceList.key(['/'], () => {
    modalSearch.clearValue();
    modalSearch.focus();
    screen.render();
  });

  // f → toggle favorite
  modalVoiceList.key(['f'], () => {
    const filtered = _getFiltered();
    const sel = filtered[modalVoiceList.selected];
    if (sel) { toggleFavorite(configService, sel); _refreshList(); }
  });

  // Enter → select voice (set active + close modal)
  modalVoiceList.key(['enter'], () => {
    const filtered = _getFiltered();
    const sel = filtered[modalVoiceList.selected];
    if (sel) {
      providerService.setActiveVoice(sel);
      _closeModal();
    }
  });

  // Space → preview voice (toggle)
  modalVoiceList.key(['space'], () => {
    const filtered = _getFiltered();
    const sel = filtered[modalVoiceList.selected];
    if (sel) { _previewVoice(sel); _refreshList(); }
  });

  // Update info panel on selection change
  modalVoiceList.on('select item', () => {
    const filtered = _getFiltered();
    const sel = filtered[modalVoiceList.selected] ?? '';
    if (sel && !_closed) {
      modalInfoLine.setContent(`  ${_formatInfo(sel)}`);
      screen.render();
    }
  });

  // Tab navigation: list → [Select] → [★ Fav] → [Cancel] → list
  modalVoiceList.key(['tab'], () => { selectBtn.focus(); screen.render(); });
  selectBtn.key(['tab'], () => { favBtn.focus(); screen.render(); });
  favBtn.key(['tab'], () => { cancelBtn.focus(); screen.render(); });
  cancelBtn.key(['tab'], () => { modalVoiceList.focus(); screen.render(); });

  // Escape / q closes modal
  modalVoiceList.key(['escape', 'q'], _closeModal);
  selectBtn.key(['escape'], _closeModal);
  favBtn.key(['escape'], _closeModal);
  cancelBtn.key(['escape'], _closeModal);

  // ---- Initial load ----
  _refreshList();

  // Scroll to active voice on open
  const activeVoiceId = providerService.getActiveVoiceId();
  const activeIdx = _getFiltered().indexOf(activeVoiceId);
  if (activeIdx >= 0) modalVoiceList.select(activeIdx);

  modalVoiceList.focus();
  screen.render();
}

// ---------------------------------------------------------------------------
// Private: _openPersonalityPicker removed — now using shared import:
//   import { openPersonalityPicker } from '../widgets/personality-picker.js';
