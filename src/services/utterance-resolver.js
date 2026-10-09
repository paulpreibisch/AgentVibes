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

/**
 * A Kokoro voice id looks like `af_river`, `am_michael` (2-letter lang/gender
 * prefix, then lowercase). Forces the kokoro engine (R1). Real kokoro ids use
 * the `af_ am_ bf_ bm_` prefixes (kokoro-tts.py); piper ids carry an UPPERCASE
 * locale + a hyphen (`en_US-amy-medium`) so they can never match this.
 */
const KOKORO_VOICE_RE = /^[a-z]{2}_[a-z0-9_]+$/;

/**
 * A Piper voice id looks like `en_US-amy-medium` (lowercase lang, UPPERCASE
 * region, hyphen) or a libritts multi-speaker `model::Speaker` form. Forces the
 * piper engine (F4 — the mirror of the kokoro rule; how learning/mixed mode
 * picks piper for a target-language voice even when the active engine is kokoro).
 */
const PIPER_VOICE_RE = /^[a-z]{2}_[A-Z]{2}-/;

/** Engines AgentVibes can route to. */
const ENGINES = ['piper', 'kokoro', 'elevenlabs', 'macos', 'soprano', 'sapi'];

/**
 * Alias spellings that real config carries (per-LLM ENGINE column, FORCE_PROVIDER
 * allowlist, SSH-forwarded provider). Without this, `windows-sapi` fell through
 * the ENGINES check and was silently downgraded to piper (F5).
 */
const ENGINE_ALIASES = {
  'windows-sapi': 'sapi',
  'windows-piper': 'piper',
  'macos-say': 'macos',
  say: 'macos',
};

/** Named provenance of the explicit-voice slot (F1). Only 'llm-echo' is demoted. */
const VOICE_SOURCES = ['llm-echo', 'user-explicit', 'agent-profile', 'translation-target', 'audition'];

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

function isPiperVoice(voice) {
  return typeof voice === 'string' && (PIPER_VOICE_RE.test(voice.trim()) || voice.includes('::'));
}

/**
 * Coerce a config value to boolean (F8). Inputs originate as env/file STRINGS,
 * so `Boolean("false")` / `Boolean("0")` would be wrongly truthy. Treat the
 * literal falsey strings as false; everything else present is true.
 */
function toBool(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return !(s === '' || s === 'false' || s === '0' || s === 'no' || s === 'off');
}

/** Recursively freeze a plain object so no player can mutate the plan in place (F9). */
function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const k of Object.keys(obj)) deepFreeze(obj[k]);
  }
  return obj;
}

/** Map an engine value (incl. alias spellings) to a canonical engine, else null (F5). */
function normalizeEngine(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === '') return null;
  const canon = ENGINE_ALIASES[s] || s;
  return ENGINES.includes(canon) ? canon : null;
}

/** Clamp a number into 0..1. */
function clamp01(n) {
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Normalize a possibly-percent volume to a 0..1 fraction (used for the per-LLM
 * BGVOL column and env override, which real chains treat as percent-or-fraction).
 * Landmine C#7 / R9: "70" is 70% (0.70), never a 7000% gain. Fraction-native and
 * percent-native sources are converted explicitly by the caller; this is the
 * heuristic path for the ambiguous columns plus a final clamp.
 */
function normalizeVolume(raw, fallback = DEFAULT_BG_VOLUME) {
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return 0;
  if (n <= 1) return n;
  if (n <= 100) return n / 100;
  return 1; // anything above 100 → full scale, never a runaway gain
}

/** A percent-native source (agent profile 0-100): always divide by 100, then clamp. */
function percentToFraction(raw) {
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return clamp01(n / 100);
}

/** A fraction-native source (background-music-volume.txt, env): clamp only. */
function fractionVolume(raw) {
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return clamp01(n);
}

/* ------------------------------------------------------------------ *
 * Per-field resolvers. Each is ONE decision = ONE regression-test row.
 * `inputs` is the normalized bag; see gatherInputs / the schema below.
 * ------------------------------------------------------------------ */

/**
 * voice — the per-LLM row voice wins ONLY when the explicit voice is an LLM echo
 * (R2; memory feedback_per_llm_voice_wins_over_explicit — LLMs parrot back the
 * voice they saw in get_config, which otherwise defeats per-LLM routing).
 *
 * F1: this demotion is applied ONLY for `voiceSource === 'llm-echo'` (the default
 * hook path). Every OTHER named source is a GENUINE explicit choice that must win:
 *   - 'user-explicit'      MCP text_to_speech(voice=…), /agent-vibes:sample
 *   - 'agent-profile'      BMAD party mode (each agent its own voice)
 *   - 'translation-target' the target-language voice in learning/translate mode
 *   - 'audition'           voice-browser preview
 * Otherwise falls back to per-LLM voice, then the provider's stored voice file.
 */
function resolveVoiceInfo(inputs) {
  const { explicitVoice, perLlmVoice, providerVoice } = inputs;
  const source = inputs.voiceSource || 'llm-echo';
  const hasExplicit = firstNonEmpty(explicitVoice) !== undefined;

  // `isOverride` marks a voice that came from a REAL override source (a genuine
  // explicit pick or a per-LLM row) vs. merely the provider's stored voice file.
  // Players adopt an override into their VOICE_OVERRIDE arg; a NON-override voice
  // is left for the provider script's own file+model+speaker resolution (F-2 —
  // adopting the provider-file voice as an "explicit override" skips piper's
  // multi-speaker model/speaker-id lookup and plays speaker 0).
  if (hasExplicit) {
    if (source === 'llm-echo') {
      if (firstNonEmpty(perLlmVoice) !== undefined) {
        return { voice: String(perLlmVoice).trim(), isOverride: true };   // per-LLM wins over echo (R2)
      }
      // A bare LLM echo that just repeats the provider's stored voice is NOT a
      // real override — mark it non-override so the provider script keeps its own
      // file+model+speaker-id resolution (F-2: forcing it as an explicit override
      // skips piper's multi-speaker lookup and plays speaker 0).
      const ev = String(explicitVoice).trim();
      const pv = firstNonEmpty(providerVoice);
      if (pv !== undefined && ev === String(pv).trim()) {
        return { voice: ev, isOverride: false };
      }
    }
    return { voice: String(explicitVoice).trim(), isOverride: true };   // genuine explicit pick
  }
  if (firstNonEmpty(perLlmVoice) !== undefined) {
    return { voice: String(perLlmVoice).trim(), isOverride: true };      // per-LLM row voice
  }
  const pv = firstNonEmpty(providerVoice);
  return { voice: pv === undefined ? '' : String(pv).trim(), isOverride: false }; // provider file fallback
}

/** Back-compat string accessor (voice only). */
function resolveVoice(inputs) {
  return resolveVoiceInfo(inputs).voice;
}

/**
 * engine — voice/engine coupling first (both platforms):
 *   - a Kokoro-shaped voice forces kokoro (R1; project_voice_engine_coupling)
 *   - a Piper-shaped voice forces piper (F4; mixed/learning mode)
 * Then it depends on transport:
 *   - REMOTE: the receiver decides. Chain is forceProvider > receiverProvider,
 *     else `null` = "receiver picks from the forwarded voice" (F3). The per-LLM
 *     ENGINE column is NOT applied under transport (the local column doesn't
 *     describe the remote box).
 *   - LOCAL: per-LLM ENGINE column > forceProvider > provider file > piper.
 * All engine values pass through alias normalization (F5: windows-sapi → sapi).
 */
function resolveEngine(inputs, voice, transport) {
  if (isKokoroVoice(voice)) return 'kokoro';
  if (isPiperVoice(voice)) return 'piper';

  const isRemote = REMOTE_TRANSPORTS.has(transport);
  if (isRemote) {
    const remote = firstNonEmpty(inputs.forceProvider, inputs.receiverProvider);
    return normalizeEngine(remote); // may be null → receiver decides from the voice
  }

  const local = firstNonEmpty(inputs.perLlmEngine, inputs.forceProvider, inputs.providerEngine);
  return normalizeEngine(local) || 'piper';
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
    // Landmine: only pass -p when the port is a real, non-default numeric port.
    // Port 22 is omitted so an ~/.ssh/config alias's real port is honored; a
    // non-numeric value is never passed (F12).
    passPortFlag: port !== '' && port !== '22' && /^\d+$/.test(port),
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
  // enabled: a remote override is authoritative when present (force on/off).
  // Otherwise music plays if ANY source enables it — OR semantics matching
  // audio-processor.sh's `_bg_allowed` (global OR per-agent): a per-agent
  // profile can turn music ON over a global-off (R10), but a profile's own
  // "false" must NOT disable a global-on. Booleans are string-coerced (F8).
  let enabled;
  if (inputs.overrideMusicEnabled !== undefined) {
    enabled = toBool(inputs.overrideMusicEnabled);
  } else if (firstNonEmpty(inputs.overrideTrack) !== undefined) {
    enabled = true;
  } else {
    enabled = toBool(inputs.profileMusicEnabled)
      || firstNonEmpty(inputs.perLlmBgFile) !== undefined
      || toBool(inputs.globalMusicEnabled);
  }

  // volume: each source carries a KNOWN unit (F7) — profile & per-LLM columns are
  // percent (0-100), the volume file & env override are fractions. First present
  // source wins, converted by its own unit; default 0.20.
  let volume = DEFAULT_BG_VOLUME;
  const volSource = [
    [inputs.overrideVolume, fractionVolume],
    [inputs.profileVolume, percentToFraction],
    [inputs.perLlmBgVolume, normalizeVolume],   // ambiguous column: percent-or-fraction heuristic
    [inputs.bgVolumeFile, fractionVolume],
  ].find(([v]) => v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === ''));
  if (volSource) {
    const conv = volSource[1](volSource[0]);
    if (conv !== null && conv !== undefined) volume = conv;
  }

  // F11: volume normalizing to 0 means music-off (avoids 2s of dead air the mix
  // pipeline inserts for an "enabled but silent" track). Match audio-processor.sh.
  if (volume === 0) enabled = false;

  let track = null;
  if (enabled) {
    track = firstNonEmpty(
      inputs.overrideTrack,        // remote/party sender's requested track (F2) — top of chain
      inputs.customMusicNewest,
      inputs.testTrack,
      inputs.profileTrack,
      inputs.perLlmBgFile,
      inputs.bgTrackFile,
      DEFAULT_BG_TRACK,
    ) || null;
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
  if (toBool(inputs.noPretext)) return '';
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
  if (toBool(inputs.projectUnmute)) return false;
  if (toBool(inputs.projectMute)) return true;
  return toBool(inputs.globalMute);
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
  let transport = resolveTransport(inputs);
  const sshTarget = resolveSshTarget(inputs, transport);
  // F6: a remote transport with no resolvable host is a dead plan (silent audio
  // death — the class this project bans). Fall back to local, matching bash
  // (play-tts.sh only switches to remote when a host is present).
  if (REMOTE_TRANSPORTS.has(transport) && sshTarget === null) transport = 'local';

  const voiceInfo = resolveVoiceInfo(inputs);
  const voice = voiceInfo.voice;
  const engine = resolveEngine(inputs, voice, transport);
  const music = resolveMusic(inputs);

  const plan = {
    text: inputs.text ?? '',
    voice,
    // True only when `voice` came from a real override (explicit pick or per-LLM
    // row), NOT the provider's stored voice file. Players adopt it into their
    // VOICE_OVERRIDE arg only when true, so a plain provider-file voice keeps the
    // provider script's own model/speaker-id resolution (F-2). Engine coupling
    // (R1) still uses `voice` regardless.
    voiceIsOverride: voiceInfo.isOverride,
    engine,
    transport,
    sshTarget,
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
    rdpMode: toBool(inputs.rdpModeExplicit) || toBool(inputs.rdpModeSniffed),
    // outputPath is NEVER derived by "most recent file"; the provider emits an
    // `AV_OUTPUT:` sentinel line and the player captures the exact path (R6/R7,
    // memory: feedback_no_most_recent_file_heuristic). Carried here when known.
    outputPath: firstNonEmpty(inputs.outputPath) || null,
    // One canonical no-playback flag, replacing the NO_PLAY (ps1) / NO_PLAYBACK
    // (bash) split (R11; memory landmine 5).
    noPlayback: toBool(inputs.noPlay) || toBool(inputs.noPlayback),
    // One canonical test-mode signal (replaces env-vs-file split).
    testMode: toBool(inputs.testModeEnv) || toBool(inputs.testModeFile),
    projectDir: firstNonEmpty(inputs.projectDir) || null,
    llmKey: firstNonEmpty(inputs.llmKey) || 'llm:default',
  };

  return deepFreeze(plan);
}

/**
 * validatePlan — cheap structural guard so a malformed plan fails loudly at the
 * seam rather than producing silent-wrong audio downstream.
 * @returns {string[]} list of problems (empty = valid)
 */
function validatePlan(plan) {
  const errs = [];
  if (!plan || typeof plan !== 'object') return ['plan is not an object'];
  // text/voice must be strings — a boolean here means the CLI mis-parsed an
  // argument (e.g. a value that started with "--"); fail loud, never speak it.
  if (typeof plan.text !== 'string') errs.push('text must be a string');
  if (typeof plan.voice !== 'string') errs.push('voice must be a string');
  const isRemote = REMOTE_TRANSPORTS.has(plan.transport);
  // engine may be null ONLY on a remote plan (the receiver decides from the voice).
  if (plan.engine === null) {
    if (!isRemote) errs.push('engine null is only valid on a remote transport');
  } else if (!ENGINES.includes(plan.engine)) {
    errs.push(`engine "${plan.engine}" not in ${ENGINES.join('|')}`);
  }
  if (!TRANSPORTS.includes(plan.transport)) errs.push(`transport "${plan.transport}" invalid`);
  if (typeof plan.music !== 'object' || plan.music === null) errs.push('music must be an object');
  else {
    if (typeof plan.music.enabled !== 'boolean') errs.push('music.enabled must be boolean');
    if (!(plan.music.volume >= 0 && plan.music.volume <= 1)) errs.push('music.volume must be 0..1');
    if (plan.music.enabled && !plan.music.track) errs.push('music enabled but no track');
  }
  if (isRemote) {
    // F6: a remote plan MUST have a target (else it's a silent-audio dead plan).
    if (!plan.sshTarget) errs.push(`transport ${plan.transport} but sshTarget is null`);
    else {
      if (plan.sshTarget.port === '22' && plan.sshTarget.passPortFlag) {
        errs.push('sshTarget: port 22 must not pass -p (ssh alias)');
      }
      // F12: a port that will be passed must be numeric.
      if (plan.sshTarget.passPortFlag && !/^\d+$/.test(String(plan.sshTarget.port))) {
        errs.push(`sshTarget: non-numeric port "${plan.sshTarget.port}"`);
      }
    }
  }
  return errs;
}

export {
  resolveUtterance,
  validatePlan,
  // exported for targeted testing + reuse by the (Stage 2) loader and players
  resolveVoice,
  resolveVoiceInfo,
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
  percentToFraction,
  fractionVolume,
  isKokoroVoice,
  isPiperVoice,
  normalizeEngine,
  toBool,
  deepFreeze,
  KOKORO_VOICE_RE,
  PIPER_VOICE_RE,
  ENGINE_ALIASES,
  VOICE_SOURCES,
  ENGINES,
  TRANSPORTS,
  DEFAULT_BG_VOLUME,
  DEFAULT_BG_TRACK,
};
