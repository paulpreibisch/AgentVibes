/**
 * File: src/services/utterance-resolver.js
 *
 * AgentVibes — The Utterance Resolver (Story AVI-S8.5).
 *
 * SINGLE SOURCE OF TRUTH for how an utterance is spoken. AgentVibes historically
 * decided voice/engine/transport/music/volume/etc. independently in four forked
 * chains (bash play-tts.sh, PowerShell play-tts.ps1, the SSH sender, and the MCP
 * server). They drifted, and the drift is where audio dies — nearly every entry
 * in this project's regression history traces to that fork.
 *
 * This module reads a NORMALIZED bag of raw inputs ONCE, applies ONE documented
 * precedence table, and emits a flat `UtterancePlan` the players execute verbatim
 * (they read no config themselves). Every precedence decision is one function with
 * one regression-test row. See docs/implementation-artifacts/8-5-precedence-map.md
 * for the contract this implements.
 *
 * DESIGN: `resolveUtterance(inputs)` is a PURE function — no filesystem, no env
 * reads, no clock. A thin loader (gatherInputs, Stage 2) collects the raw values;
 * this module only decides. That keeps every landmine a testable table row.
 *
 * @patterns Pure resolver; data-driven precedence; frozen plan object.
 * @related play-tts.sh, play-tts.ps1, play-tts-ssh-remote.sh, mcp-server/server.py
 */

'use strict';

/** A Kokoro voice id looks like `af_river`, `en_us_amy`, etc. Forces the kokoro engine. */
const KOKORO_VOICE_RE = /^[a-z]{2}_[a-z0-9_]+$/;

/** Engines AgentVibes can route to. */
const ENGINES = ['piper', 'kokoro', 'elevenlabs', 'macos', 'soprano', 'sapi'];

/** Transports. `local` plays here; the others hand off to a remote receiver. */
const TRANSPORTS = ['local', 'ssh-remote', 'agentvibes-receiver', 'termux-ssh'];
const REMOTE_TRANSPORTS = new Set(['ssh-remote', 'agentvibes-receiver', 'termux-ssh']);

/** The one canonical background-music volume default (feeds the 8.6 constants generator). */
const DEFAULT_BG_VOLUME = 0.20;

/** Default track when music is enabled but no track is chosen anywhere. */
const DEFAULT_BG_TRACK = 'agent_vibes_bachata_v1_loop.mp3';

const DEFAULT_PERSONALITY = 'normal';
const DEFAULT_LANGUAGE = 'english';
const DEFAULT_SPEED = 1.0;

/** First non-empty (non-null, non-undefined, non-'' after trim) value, else undefined. */
function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return undefined;
}

function isKokoroVoice(voice) {
  return typeof voice === 'string' && KOKORO_VOICE_RE.test(voice.trim());
}

/**
 * Normalize a background-music volume to a 0..1 fraction.
 * Landmine C#7 / R9: a value like "70" is a percentage (7000% if taken as a
 * gain), and Windows shipped it unclamped. Rule: 0<v<=1 is already a fraction;
 * 1<v<=100 is a percentage → divide by 100; anything else clamps into range.
 */
function normalizeVolume(raw, fallback = DEFAULT_BG_VOLUME) {
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return 0;
  if (n <= 1) return n;
  if (n <= 100) return n / 100;
  return 1; // anything above 100 → full scale, never a runaway gain
}

/* ------------------------------------------------------------------ *
 * Per-field resolvers. Each is ONE decision = ONE regression-test row.
 * `inputs` is the normalized bag; see gatherInputs / the schema below.
 * ------------------------------------------------------------------ */

/**
 * voice — per-LLM row wins over an echoed explicit override (R2), EXCEPT the
 * voice-browser audition escape hatch (R3) where the explicit pick must win.
 * Falls back to the provider's stored voice file.
 * Memory: feedback_per_llm_voice_wins_over_explicit.
 */
function resolveVoice(inputs) {
  const { explicitVoice, perLlmVoice, providerVoice, isAudition } = inputs;
  if (isAudition && firstNonEmpty(explicitVoice) !== undefined) return explicitVoice.trim();
  const v = firstNonEmpty(perLlmVoice, explicitVoice, providerVoice);
  return v === undefined ? '' : String(v).trim();
}

/**
 * engine — a Kokoro-shaped voice forces the kokoro engine on BOTH platforms
 * (R1; memory: project_voice_engine_coupling). Otherwise: per-LLM ENGINE column
 * (unless a transport is active) > AGENTVIBES_FORCE_PROVIDER > provider file >
 * piper. `voice` is the already-resolved voice.
 */
function resolveEngine(inputs, voice, transport) {
  if (isKokoroVoice(voice)) return 'kokoro';
  const isTransport = transport && transport !== 'local';
  const candidate = firstNonEmpty(
    isTransport ? undefined : inputs.perLlmEngine,
    inputs.forceProvider,
    inputs.providerEngine,
  );
  const e = candidate === undefined ? 'piper' : String(candidate).trim().toLowerCase();
  return ENGINES.includes(e) ? e : 'piper';
}

/**
 * transport — explicit transport in the provider file wins; else a per-LLM
 * transport entry with mode==remote; else local.
 */
function resolveTransport(inputs) {
  const explicit = firstNonEmpty(inputs.providerTransport);
  if (explicit && REMOTE_TRANSPORTS.has(explicit)) return explicit;
  if (inputs.perLlmTransportMode === 'remote') {
    return firstNonEmpty(inputs.perLlmTransportKind, 'ssh-remote');
  }
  return 'local';
}

/**
 * sshTarget — resolves the remote endpoint and, critically, whether to pass a
 * `-p` port arg. Port 22 MUST be omitted so an ~/.ssh/config alias's real port
 * is honored (R4/R5; memory: project_ssh_port_alias_override).
 */
function resolveSshTarget(inputs, transport) {
  if (!REMOTE_TRANSPORTS.has(transport)) return null;
  const host = firstNonEmpty(inputs.sshHostEnv, inputs.sshHostConfig, inputs.sshHostLegacy);
  if (host === undefined) return null;
  const portRaw = firstNonEmpty(inputs.sshPortEnv, inputs.sshPortConfig);
  const port = portRaw === undefined ? '22' : String(portRaw).trim();
  return {
    host: String(host).trim(),
    port,
    // Landmine: only pass -p when the port is not the default 22.
    passPortFlag: port !== '' && port !== '22',
    key: firstNonEmpty(inputs.sshKeyEnv, inputs.sshKeyConfig) || null,
    connType: firstNonEmpty(inputs.sshConnType) || 'ssh',
  };
}

/**
 * music — {enabled, track, volume}. Per-agent profile can enable music even when
 * the global switch is off (R10). Volume defaults to 0.20 and is normalized
 * (R8/R9). Track: custom-dir newest > test track > profile > per-LLM > default
 * file > bachata.
 */
function resolveMusic(inputs) {
  const enabled = Boolean(firstNonEmpty(
    inputs.overrideMusicEnabled,       // remote/party override forces on
    inputs.profileMusicEnabled,        // per-agent profile (overrides global off)
    inputs.perLlmBgFile ? true : undefined,
    inputs.globalMusicEnabled,
  ));

  const volume = normalizeVolume(firstNonEmpty(
    inputs.overrideVolume,
    inputs.profileVolume,
    inputs.perLlmBgVolume,
    inputs.bgVolumeFile,
  ), DEFAULT_BG_VOLUME);

  let track = null;
  if (enabled) {
    track = firstNonEmpty(
      inputs.customMusicNewest,
      inputs.testTrack,
      inputs.profileTrack,
      inputs.perLlmBgFile,
      inputs.bgTrackFile,
      DEFAULT_BG_TRACK,
    );
  }

  return { enabled, track: enabled ? track : null, volume };
}

/** reverb — one-shot override > per-LLM preset > reverb-level file > off. */
function resolveReverb(inputs) {
  return firstNonEmpty(
    inputs.reverbOverride,
    inputs.perLlmReverb,
    inputs.reverbFile,
  ) || 'off';
}

/** pretext — suppressed by AGENTVIBES_NO_PRETEXT; else per-LLM > file sources. */
function resolvePretext(inputs) {
  if (inputs.noPretext) return '';
  return firstNonEmpty(
    inputs.perLlmPretext,
    inputs.pretextConfigJson,
    inputs.pretextFile,
    inputs.introTextFile,
  ) || '';
}

/** speed — translation target rate > speech-rate file > 1.0. Applies to ALL engines (R20). */
function resolveSpeed(inputs) {
  const s = firstNonEmpty(inputs.translationRate, inputs.speechRate);
  const n = s === undefined ? DEFAULT_SPEED : parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SPEED;
}

/** personality — per-call override > file > "normal". Absent file must not be written. */
function resolvePersonality(inputs) {
  return firstNonEmpty(inputs.personalityOverride, inputs.personalityFile) || DEFAULT_PERSONALITY;
}

/** language — learning/translation target > language file > english. Forwarded on SSH (R18). */
function resolveLanguage(inputs) {
  return firstNonEmpty(
    inputs.learningLanguage,
    inputs.translationLanguage,
    inputs.languageFile,
  ) || DEFAULT_LANGUAGE;
}

/**
 * mute — 3-level: project-unmute overrides project-mute overrides global-mute.
 * Unified across platforms; forwarded on SSH so the receiver honors sender intent (R17).
 */
function resolveMute(inputs) {
  if (inputs.projectUnmute) return false;
  if (inputs.projectMute) return true;
  return Boolean(inputs.globalMute);
}

/**
 * resolveUtterance — the single entry point. Pure: (normalized inputs) → frozen plan.
 *
 * @param {object} inputs  normalized raw values from all config sources (see the
 *   field-resolvers above and docs/.../8-5-precedence-map.md for each source's
 *   precedence). Missing keys are treated as absent.
 * @returns {Readonly<UtterancePlan>}
 */
function resolveUtterance(inputs = {}) {
  const transport = resolveTransport(inputs);
  const voice = resolveVoice(inputs);
  const engine = resolveEngine(inputs, voice, transport);
  const music = resolveMusic(inputs);

  const plan = {
    text: inputs.text ?? '',
    voice,
    engine,
    transport,
    sshTarget: resolveSshTarget(inputs, transport),
    voiceModel: firstNonEmpty(inputs.voiceModel) || null,
    speakerId: (inputs.speakerId === undefined || inputs.speakerId === null || inputs.speakerId === '')
      ? null : String(inputs.speakerId),
    personality: resolvePersonality(inputs),
    language: resolveLanguage(inputs),
    pretext: resolvePretext(inputs),
    speed: resolveSpeed(inputs),
    reverb: resolveReverb(inputs),
    effects: firstNonEmpty(inputs.effectsOverride, inputs.perLlmEffects) || '',
    music,
    mute: resolveMute(inputs),
    rdpMode: Boolean(firstNonEmpty(inputs.rdpModeExplicit, inputs.rdpModeSniffed)),
    // outputPath is NEVER derived by "most recent file"; the provider emits an
    // `AV_OUTPUT:` sentinel line and the player captures the exact path (R6/R7,
    // memory: feedback_no_most_recent_file_heuristic). Carried here when known.
    outputPath: firstNonEmpty(inputs.outputPath) || null,
    // One canonical no-playback flag, replacing the NO_PLAY (ps1) / NO_PLAYBACK
    // (bash) split (R11; memory landmine 5).
    noPlayback: Boolean(firstNonEmpty(inputs.noPlay, inputs.noPlayback)),
    // One canonical test-mode signal (replaces env-vs-file split).
    testMode: Boolean(firstNonEmpty(inputs.testModeEnv, inputs.testModeFile)),
    projectDir: firstNonEmpty(inputs.projectDir) || null,
    llmKey: firstNonEmpty(inputs.llmKey) || 'llm:default',
  };

  return Object.freeze(plan);
}

/**
 * validatePlan — cheap structural guard so a malformed plan fails loudly at the
 * seam rather than producing silent-wrong audio downstream.
 * @returns {string[]} list of problems (empty = valid)
 */
function validatePlan(plan) {
  const errs = [];
  if (!plan || typeof plan !== 'object') return ['plan is not an object'];
  if (typeof plan.voice !== 'string') errs.push('voice must be a string');
  if (!ENGINES.includes(plan.engine)) errs.push(`engine "${plan.engine}" not in ${ENGINES.join('|')}`);
  if (!TRANSPORTS.includes(plan.transport)) errs.push(`transport "${plan.transport}" invalid`);
  if (typeof plan.music !== 'object' || plan.music === null) errs.push('music must be an object');
  else {
    if (typeof plan.music.enabled !== 'boolean') errs.push('music.enabled must be boolean');
    if (!(plan.music.volume >= 0 && plan.music.volume <= 1)) errs.push('music.volume must be 0..1');
    if (plan.music.enabled && !plan.music.track) errs.push('music enabled but no track');
  }
  if (plan.transport !== 'local' && REMOTE_TRANSPORTS.has(plan.transport) && plan.sshTarget) {
    if (plan.sshTarget.port === '22' && plan.sshTarget.passPortFlag) {
      errs.push('sshTarget: port 22 must not pass -p (ssh alias)');
    }
  }
  return errs;
}

export {
  resolveUtterance,
  validatePlan,
  // exported for targeted testing + reuse by the (Stage 2) loader and players
  resolveVoice,
  resolveEngine,
  resolveTransport,
  resolveSshTarget,
  resolveMusic,
  resolveReverb,
  resolvePretext,
  resolveSpeed,
  resolvePersonality,
  resolveLanguage,
  resolveMute,
  normalizeVolume,
  isKokoroVoice,
  KOKORO_VOICE_RE,
  ENGINES,
  TRANSPORTS,
  DEFAULT_BG_VOLUME,
  DEFAULT_BG_TRACK,
};
