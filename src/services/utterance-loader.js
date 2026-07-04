/**
 * File: src/services/utterance-loader.js
 *
 * AgentVibes — Utterance Loader (Story AVI-S8.5, Stage 2 bridge).
 *
 * The resolver (`utterance-resolver.js`) is a PURE function: (normalized inputs)
 * → plan. It reads nothing. This loader is the impure half: it reads every
 * config source once (files + env + argv), maps them onto the resolver's input
 * bag, and hands the result to `resolveUtterance()`. The `bin/resolve-utterance.js`
 * CLI wraps this so bash/PowerShell/Python players can obtain a finished plan as
 * JSON and execute it verbatim — the players stop reading config themselves.
 *
 * Testability: `gatherInputs(ctx)` takes explicit `projectDir`/`homeDir`/`env`,
 * so tests drive it with temp dirs and fake envs — no global-state coupling.
 *
 * Config-source precedence for each field is documented in
 * docs/implementation-artifacts/8-5-precedence-map.md §A/§D. This loader only
 * GATHERS candidates in that order; the resolver DECIDES.
 *
 * @related utterance-resolver.js, bin/resolve-utterance.js
 */

'use strict';

import fs from 'node:fs';
import path from 'node:path';

/** Read a file's trimmed contents, or undefined if missing/unreadable/empty. */
function readTrim(filePath) {
  try {
    const s = fs.readFileSync(filePath, 'utf8').trim();
    return s === '' ? undefined : s;
  } catch {
    return undefined;
  }
}

/** First existing file's trimmed content across an ordered path list. */
function firstFile(paths) {
  for (const p of paths) {
    const v = readTrim(p);
    if (v !== undefined) return v;
  }
  return undefined;
}

/** True if the path exists (any type). */
function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

/**
 * Resolve the project root the same way the bash player does: an explicit
 * --project-dir / CLAUDE_PROJECT_DIR wins; otherwise walk up from cwd looking
 * for a `.claude` dir; else fall back to home.
 */
function resolveProjectDir({ projectDir, env = {}, cwd, homeDir }) {
  const explicit = projectDir || env.CLAUDE_PROJECT_DIR;
  if (explicit && exists(path.join(explicit, '.claude'))) return explicit;
  if (explicit) return explicit;
  let dir = cwd || homeDir;
  for (let i = 0; i < 40 && dir; i++) {
    if (exists(path.join(dir, '.claude'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return homeDir;
}

/**
 * Parse the `llm:<key>` row from audio-effects.cfg (7 pipe columns):
 *   llm:<key>|REVERB|BGFILE|BGVOL|VOICE|PRETEXT|ENGINE
 * Searches the given ordered cfg paths; first file containing the row wins.
 * Returns an object of the six value columns (or {} if not found).
 */
function parseLlmRow(cfgPaths, llmKey) {
  const key = llmKey.startsWith('llm:') ? llmKey : `llm:${llmKey}`;
  for (const cfg of cfgPaths) {
    let text;
    try { text = fs.readFileSync(cfg, 'utf8'); } catch { continue; }
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith(key + '|') && line !== key) continue;
      const cols = line.split('|');
      // cols[0] = 'llm:<key>'
      return {
        reverb: cols[1] || undefined,
        bgFile: cols[2] || undefined,
        bgVolume: cols[3] || undefined,
        voice: cols[4] || undefined,
        pretext: cols[5] || undefined,
        engine: cols[6] || undefined,
      };
    }
  }
  return {};
}

/** Read a per-agent BMAD profile from bmad-voice-map.json (project then global). */
function readAgentProfile(agentName, projectDir, homeDir) {
  if (!agentName) return {};
  const candidates = [
    path.join(projectDir, '.agentvibes', 'bmad-voice-map.json'),
    path.join(homeDir, '.agentvibes', 'bmad-voice-map.json'),
  ];
  for (const p of candidates) {
    try {
      const map = JSON.parse(fs.readFileSync(p, 'utf8'));
      const prof = map && map[agentName];
      if (prof && typeof prof === 'object') return prof;
    } catch { /* try next */ }
  }
  return {};
}

/** The single canonical LLM-key resolution (mirrors play-tts.sh / server.py). */
function resolveLlmKey({ llm, env = {} }) {
  const clean = (v) => (v && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(v) ? v : '');
  let key = clean((llm || '').replace(/^llm:/, ''));
  if (!key) key = clean((env.AGENTVIBES_LLM_KEY || '').replace(/^llm:/, ''));
  if (!key) key = clean((env.AGENTVIBES_LLM || '').replace(/^llm:/, ''));
  if (!key && String(env.CLAUDECODE || '').trim() === '1') key = 'claude-code';
  if (!key) key = clean(env.AGENTVIBES_MCP_FALLBACK || '');
  return `llm:${key || 'default'}`;
}

/**
 * Gather the resolver input bag from all config sources.
 *
 * @param {object} ctx
 * @param {string} ctx.text          the utterance text
 * @param {string} [ctx.voice]       explicit voice arg (positional / -VoiceOverride)
 * @param {string} [ctx.voiceSource] provenance of `voice` (see resolver VOICE_SOURCES);
 *                                    defaults to 'llm-echo' (the hook path).
 * @param {string} [ctx.llm]         --llm value
 * @param {string} [ctx.projectDir]  explicit project dir
 * @param {string} ctx.homeDir       user home (global config root)
 * @param {string} [ctx.cwd]         current dir (for project walk-up)
 * @param {object} [ctx.env]         environment map (defaults to {})
 * @returns {object} normalized inputs for resolveUtterance()
 */
function gatherInputs(ctx) {
  const env = ctx.env || {};
  const homeDir = ctx.homeDir;
  const projectDir = resolveProjectDir(ctx);
  const projClaude = path.join(projectDir, '.claude');
  const homeClaude = path.join(homeDir, '.claude');
  const projCfg = path.join(projClaude, 'config');
  const homeCfg = path.join(homeClaude, 'config');

  const llmKey = resolveLlmKey({ llm: ctx.llm, env });

  // audio-effects.cfg search order: CLAUDE_PROJECT_DIR project → project root → home
  const cfgPaths = [
    path.join(projCfg, 'audio-effects.cfg'),
    path.join(homeCfg, 'audio-effects.cfg'),
  ];
  const row = parseLlmRow(cfgPaths, llmKey);

  const agentName = env.AGENTVIBES_AGENT_NAME;
  const profile = readAgentProfile(agentName, projectDir, homeDir);
  const profMusic = (profile && profile.backgroundMusic) || {};

  // 3-tier file reader: project .claude → home .claude
  const tier = (name, sub = '') => firstFile([
    path.join(projClaude, sub, name),
    path.join(homeClaude, sub, name),
  ]);
  const cfgTier = (name) => firstFile([
    path.join(projCfg, name),
    path.join(homeCfg, name),
  ]);

  return {
    text: ctx.text ?? '',
    voiceSource: ctx.voiceSource || 'llm-echo',

    // ---- voice ----
    explicitVoice: ctx.voice || undefined,
    perLlmVoice: row.voice,
    providerVoice: firstFile([
      path.join(projClaude, 'tts-voice.txt'),
      path.join(homeClaude, 'tts-voice.txt'),
    ]),
    voiceModel: tier('tts-piper-model.txt'),
    speakerId: tier('tts-piper-speaker-id.txt'),

    // ---- engine / provider ----
    perLlmEngine: row.engine,
    forceProvider: env.AGENTVIBES_FORCE_PROVIDER || undefined,
    providerEngine: tier('tts-provider.txt'),
    receiverProvider: cfgTier('receiver-provider.txt'),

    // ---- transport ----
    providerTransport: (() => {
      const p = tier('tts-provider.txt');
      return (p === 'ssh-remote' || p === 'agentvibes-receiver' || p === 'termux-ssh') ? p : undefined;
    })(),
    // (per-LLM transport-config.json mode is read by the CLI when present; omitted
    //  here until the SSH port stage wires the full transport-config parse.)
    sshHostEnv: env.AGENTVIBES_SSH_HOST || undefined,
    sshHostLegacy: firstFile([
      path.join(projClaude, 'ssh-remote-host.txt'),
      path.join(homeClaude, 'ssh-remote-host.txt'),
    ]),
    sshPortEnv: env.AGENTVIBES_SSH_PORT || undefined,
    sshKeyEnv: env.AGENTVIBES_SSH_KEY || undefined,

    // ---- music ----
    overrideMusicEnabled: env.AGENTVIBES_OVERRIDE_MUSIC !== undefined ? true : undefined,
    overrideTrack: env.AGENTVIBES_OVERRIDE_MUSIC || undefined,
    overrideVolume: env.AGENTVIBES_OVERRIDE_VOLUME || undefined,
    profileMusicEnabled: profMusic.enabled,
    profileTrack: profMusic.track,
    profileVolume: profMusic.volume,
    perLlmBgFile: row.bgFile,
    perLlmBgVolume: row.bgVolume,
    bgTrackFile: cfgTier('background-music-default.txt'),
    bgVolumeFile: cfgTier('background-music-volume.txt'),
    globalMusicEnabled: cfgTier('background-music-enabled.txt'),
    testTrack: env.AGENTVIBES_TEST_TRACK || undefined,

    // ---- reverb / effects ----
    reverbOverride: env.AGENTVIBES_REVERB_OVERRIDE || undefined,
    perLlmReverb: row.reverb,
    reverbFile: cfgTier('reverb-level.txt'),
    perLlmEffects: undefined,
    effectsOverride: env.AGENTVIBES_OVERRIDE_EFFECTS || undefined,

    // ---- pretext ----
    noPretext: env.AGENTVIBES_NO_PRETEXT === '1' || undefined,
    perLlmPretext: row.pretext,
    pretextFile: cfgTier('tts-pretext.txt'),
    introTextFile: cfgTier('intro-text.txt'),

    // ---- speed ----
    speechRate: firstFile([
      path.join(projClaude, 'tts-speech-rate.txt'),
      path.join(homeClaude, 'tts-speech-rate.txt'),
      path.join(projCfg, 'tts-speed.txt'),
      path.join(homeCfg, 'tts-speed.txt'),
    ]),

    // ---- personality / language ----
    personalityOverride: ctx.personality || undefined,
    personalityFile: tier('tts-personality.txt'),
    languageFile: tier('tts-language.txt'),

    // ---- mute (3-level) ----
    projectUnmute: exists(path.join(projClaude, 'agentvibes-unmuted')) || undefined,
    projectMute: exists(path.join(projClaude, 'agentvibes-muted')) || undefined,
    globalMute: exists(path.join(homeDir, '.agentvibes-muted')) || undefined,

    // ---- misc ----
    rdpModeExplicit: env.AGENTVIBES_RDP_MODE || undefined,
    noPlay: env.AGENTVIBES_NO_PLAY || undefined,
    noPlayback: env.AGENTVIBES_NO_PLAYBACK || undefined,
    testModeEnv: env.AGENTVIBES_TEST_MODE || undefined,
    projectDir,
    llmKey,
  };
}

export {
  gatherInputs,
  resolveProjectDir,
  resolveLlmKey,
  parseLlmRow,
  readAgentProfile,
};
