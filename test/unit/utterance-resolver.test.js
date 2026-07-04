#!/usr/bin/env node

/**
 * Story AVI-S8.5 — Utterance Resolver regression suite.
 *
 * Every row here is a landmine from this project's regression history (see
 * docs/implementation-artifacts/8-5-precedence-map.md §E). The resolver is the
 * single source of truth for utterance decisions; these tests are the permanent
 * contract that keeps the four player chains from ever re-drifting.
 *
 * Pure-function tests: no filesystem, no env — each builds a normalized `inputs`
 * bag and asserts one decision.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveUtterance,
  validatePlan,
  normalizeVolume,
  isKokoroVoice,
  DEFAULT_BG_VOLUME,
} from '../../src/services/utterance-resolver.js';

/** Convenience: resolve with defaults overlaid by `o`. */
const plan = (o = {}) => resolveUtterance({ text: 'hello', ...o });

describe('R1 — Kokoro voice forces the kokoro engine (both platforms)', () => {
  test('af_river forces kokoro even when the per-LLM ENGINE column says piper', () => {
    const p = plan({ explicitVoice: 'af_river', perLlmEngine: 'piper', providerEngine: 'piper' });
    assert.equal(p.engine, 'kokoro');
  });
  test('am_michael (real kokoro id) forces kokoro over a stored piper provider', () => {
    assert.equal(plan({ perLlmVoice: 'am_michael', providerEngine: 'piper' }).engine, 'kokoro');
  });
  test('a piper voice id does NOT force kokoro', () => {
    // Piper ids contain a hyphen (en_US-amy-medium) so they fail the kokoro regex.
    assert.equal(isKokoroVoice('en_US-amy-medium'), false);
    assert.equal(plan({ perLlmVoice: 'en_US-amy-medium', providerEngine: 'piper' }).engine, 'piper');
  });
});

describe('R2 — per-LLM voice wins ONLY over an LLM-echoed explicit override', () => {
  test('default source (llm-echo): per-LLM voice X beats the echoed explicit Y', () => {
    // default voiceSource is 'llm-echo' — the hook path where the LLM parrots back get_config
    const p = plan({ perLlmVoice: 'af_bella', explicitVoice: 'af_sarah' });
    assert.equal(p.voice, 'af_bella');
  });
  test('explicit voice is used when there is no per-LLM voice', () => {
    assert.equal(plan({ explicitVoice: 'af_sarah' }).voice, 'af_sarah');
  });
});

describe('F-2 — voiceIsOverride marks provenance (Fable gate regression)', () => {
  test('a genuine explicit/per-LLM voice is an override', () => {
    assert.equal(plan({ voiceSource: 'user-explicit', explicitVoice: 'af_sarah' }).voiceIsOverride, true);
    assert.equal(plan({ perLlmVoice: 'af_bella' }).voiceIsOverride, true);
  });
  test('a plain provider-file voice is NOT an override (player keeps its own speaker resolution)', () => {
    const p = plan({ providerVoice: 'en_US-libritts-high::Mike-13' });
    assert.equal(p.voice, 'en_US-libritts-high::Mike-13');
    assert.equal(p.voiceIsOverride, false); // player must NOT force this as -VoiceOverride (F-2)
  });
  test('an agent-profile voice is an override (must not be demoted — F-1 party mode)', () => {
    const p = plan({ voiceSource: 'agent-profile', explicitVoice: 'am_michael', perLlmVoice: 'af_default' });
    assert.equal(p.voice, 'am_michael');
    assert.equal(p.voiceIsOverride, true);
  });
});

describe('F1 — genuine explicit voices are NOT demoted (only llm-echo is)', () => {
  test('user-explicit (MCP text_to_speech voice=) wins over the per-LLM voice', () => {
    const p = plan({ voiceSource: 'user-explicit', explicitVoice: 'af_sarah', perLlmVoice: 'af_bella' });
    assert.equal(p.voice, 'af_sarah');
  });
  test('agent-profile (BMAD party mode) keeps each agent its own voice', () => {
    const p = plan({ voiceSource: 'agent-profile', explicitVoice: 'am_michael', perLlmVoice: 'af_bella' });
    assert.equal(p.voice, 'am_michael');
  });
  test('translation-target voice survives (learning/translate mode)', () => {
    const p = plan({ voiceSource: 'translation-target', explicitVoice: 'es_ES-davefx-medium', perLlmVoice: 'af_bella' });
    assert.equal(p.voice, 'es_ES-davefx-medium');
  });
});

describe('R3 — voice-browser audition escape hatch: explicit wins', () => {
  test('voiceSource=audition makes the explicit pick win over the per-LLM voice', () => {
    const p = plan({ voiceSource: 'audition', explicitVoice: 'af_sarah', perLlmVoice: 'af_bella' });
    assert.equal(p.voice, 'af_sarah');
  });
});

describe('R4/R5 — SSH port 22 omits -p; a real port passes it', () => {
  const remote = {
    providerTransport: 'ssh-remote', sshHostConfig: 'laptop-win',
  };
  test('R4: port 22 → no -p flag (honor ssh alias)', () => {
    const p = plan({ ...remote, sshPortConfig: '22' });
    assert.equal(p.transport, 'ssh-remote');
    assert.equal(p.sshTarget.passPortFlag, false);
    assert.deepEqual(validatePlan(p), []);
  });
  test('R5: port 45217 → pass -p 45217', () => {
    const p = plan({ ...remote, sshPortConfig: '45217' });
    assert.equal(p.sshTarget.port, '45217');
    assert.equal(p.sshTarget.passPortFlag, true);
  });
  test('unset port defaults to 22 and omits -p', () => {
    const p = plan({ ...remote });
    assert.equal(p.sshTarget.port, '22');
    assert.equal(p.sshTarget.passPortFlag, false);
  });
});

describe('R6/R7 — output path never uses "most recent file"', () => {
  test('outputPath is null unless the provider sentinel supplied an exact path', () => {
    assert.equal(plan().outputPath, null);
  });
  test('an exact captured path is carried verbatim', () => {
    assert.equal(plan({ outputPath: '/x/tts-abc.wav' }).outputPath, '/x/tts-abc.wav');
  });
  test('two concurrent utterances carry their own distinct paths (no cross-grab)', () => {
    const a = plan({ outputPath: '/x/tts-A.wav' });
    const b = plan({ outputPath: '/x/tts-B.wav' });
    assert.equal(a.outputPath, '/x/tts-A.wav');
    assert.equal(b.outputPath, '/x/tts-B.wav');
  });
});

describe('R8 — background-music volume defaults to 0.20', () => {
  test('no volume configured anywhere → 0.20', () => {
    assert.equal(plan({ globalMusicEnabled: true }).music.volume, DEFAULT_BG_VOLUME);
    assert.equal(DEFAULT_BG_VOLUME, 0.20);
  });
});

describe('R9 — volume "70" is a percentage, never a 7000% gain', () => {
  test('normalizeVolume("70") → 0.70', () => {
    assert.equal(normalizeVolume('70'), 0.70);
  });
  test('a fraction 0.35 passes through', () => {
    assert.equal(normalizeVolume(0.35), 0.35);
  });
  test('a per-LLM bg volume of 70 resolves to 0.70 in the plan', () => {
    assert.equal(plan({ globalMusicEnabled: true, perLlmBgVolume: '70' }).music.volume, 0.70);
  });
  test('an absurd value clamps to 1, not a runaway gain', () => {
    assert.equal(normalizeVolume('5000'), 1);
  });
});

describe('R10 — per-agent music enabled overrides global music off', () => {
  test('profile enabled=true while global off → music plays', () => {
    const p = plan({ globalMusicEnabled: false, profileMusicEnabled: true, profileTrack: 't.mp3' });
    assert.equal(p.music.enabled, true);
    assert.equal(p.music.track, 't.mp3');
  });
  test('global off and no profile override → music off', () => {
    assert.equal(plan({ globalMusicEnabled: false }).music.enabled, false);
    assert.equal(plan({ globalMusicEnabled: false }).music.track, null);
  });
});

describe('R11 — one canonical no-playback flag honored from either spelling', () => {
  test('NO_PLAY (Windows spelling) suppresses playback', () => {
    assert.equal(plan({ noPlay: true }).noPlayback, true);
  });
  test('NO_PLAYBACK (bash spelling) suppresses playback', () => {
    assert.equal(plan({ noPlayback: true }).noPlayback, true);
  });
  test('neither set → playback allowed', () => {
    assert.equal(plan().noPlayback, false);
  });
});

describe('R18 — language is resolved (and available to forward on SSH)', () => {
  test('language file value is used', () => {
    assert.equal(plan({ languageFile: 'spanish' }).language, 'spanish');
  });
  test('translation target beats the stored file', () => {
    assert.equal(plan({ translationLanguage: 'french', languageFile: 'spanish' }).language, 'french');
  });
  test('default is english', () => {
    assert.equal(plan().language, 'english');
  });
});

describe('R13-analogue — personality absent stays "normal" (no phantom write signal)', () => {
  test('no personality anywhere → normal', () => {
    assert.equal(plan().personality, 'normal');
  });
  test('per-call override beats the stored file', () => {
    assert.equal(plan({ personalityOverride: 'pirate', personalityFile: 'cheerful' }).personality, 'pirate');
  });
});

describe('R17 — mute is 3-level and unified (project-unmute > project-mute > global-mute)', () => {
  test('global mute alone → muted', () => {
    assert.equal(plan({ globalMute: true }).mute, true);
  });
  test('project-mute overrides an unset global', () => {
    assert.equal(plan({ projectMute: true }).mute, true);
  });
  test('project-unmute overrides global mute', () => {
    assert.equal(plan({ globalMute: true, projectMute: true, projectUnmute: true }).mute, false);
  });
});

describe('R20 — speed applies to all engines (not Kokoro-only)', () => {
  test('speech rate is carried regardless of engine', () => {
    const p = plan({ perLlmVoice: 'en_US-amy-medium', speechRate: '1.3' }); // piper engine
    assert.equal(p.engine, 'piper');
    assert.equal(p.speed, 1.3);
  });
  test('default speed is 1.0', () => {
    assert.equal(plan().speed, 1.0);
  });
});

describe('transport + engine interaction', () => {
  test('F3: under transport, per-LLM ENGINE is ignored; receiver decides (engine null)', () => {
    // The per-LLM ENGINE column describes the LOCAL box, not the receiver. With
    // no receiverProvider set, engine is null → "receiver picks from the voice".
    const p = plan({ providerTransport: 'ssh-remote', sshHostConfig: 'h', perLlmEngine: 'sapi' });
    assert.equal(p.transport, 'ssh-remote');
    assert.equal(p.engine, null);
    assert.deepEqual(validatePlan(p), []); // null engine is valid on a remote plan
  });
  test('F3: receiverProvider sets the remote engine', () => {
    const p = plan({ providerTransport: 'ssh-remote', sshHostConfig: 'h', receiverProvider: 'kokoro' });
    assert.equal(p.engine, 'kokoro');
  });
  test('a kokoro voice still forces kokoro even under transport', () => {
    const p = plan({ providerTransport: 'ssh-remote', sshHostConfig: 'h', explicitVoice: 'af_river' });
    assert.equal(p.engine, 'kokoro');
  });
});

describe('F4 — a Piper-shaped voice forces the piper engine (mirror of R1)', () => {
  test('es_ES-davefx-medium forces piper even when the active engine is kokoro', () => {
    const p = plan({ voiceSource: 'translation-target', explicitVoice: 'es_ES-davefx-medium', providerEngine: 'kokoro' });
    assert.equal(p.engine, 'piper');
  });
  test('a libritts model::Speaker voice forces piper', () => {
    assert.equal(plan({ perLlmVoice: 'en_US-libritts-high::Leo', providerEngine: 'kokoro' }).engine, 'piper');
  });
});

describe('F5 — engine alias spellings normalize (not silently downgraded to piper)', () => {
  test('windows-sapi → sapi', () => {
    assert.equal(plan({ perLlmEngine: 'windows-sapi' }).engine, 'sapi');
  });
  test('windows-piper → piper', () => {
    assert.equal(plan({ perLlmEngine: 'windows-piper' }).engine, 'piper');
  });
  test('an unknown engine falls back to piper (local)', () => {
    assert.equal(plan({ perLlmEngine: 'nonsense' }).engine, 'piper');
  });
});

describe('R19 — forceProvider vs provider-file ordering (local)', () => {
  test('forceProvider beats the provider file', () => {
    assert.equal(plan({ forceProvider: 'sapi', providerEngine: 'piper' }).engine, 'sapi');
  });
  test('per-LLM engine beats forceProvider', () => {
    assert.equal(plan({ perLlmEngine: 'macos', forceProvider: 'sapi', providerEngine: 'piper' }).engine, 'macos');
  });
});

describe('F2 — a remote/party override track is honored (was dropped)', () => {
  test('overrideTrack wins the track chain and forces music enabled', () => {
    const p = plan({ overrideTrack: 'agent_vibes_salsa_v2_loop.mp3', globalMusicEnabled: false, perLlmBgFile: 'x.mp3' });
    assert.equal(p.music.enabled, true);
    assert.equal(p.music.track, 'agent_vibes_salsa_v2_loop.mp3');
  });
});

describe('F6 — remote transport with no resolvable host falls back to local', () => {
  test('perLlmTransportMode=remote but no host → local, not a dead plan', () => {
    const p = plan({ perLlmTransportMode: 'remote' });
    assert.equal(p.transport, 'local');
    assert.equal(p.sshTarget, null);
    assert.deepEqual(validatePlan(p), []);
  });
});

describe('F7 — volume units are per-source (percent vs fraction)', () => {
  test('agent-profile volume is percent: profileVolume 20 → 0.20', () => {
    assert.equal(plan({ globalMusicEnabled: true, profileVolume: 20 }).music.volume, 0.20);
  });
  test('agent-profile volume 1 means 1% (0.01), not 100%', () => {
    assert.equal(plan({ globalMusicEnabled: true, profileVolume: 1 }).music.volume, 0.01);
  });
  test('bgVolumeFile is fraction-native: 0.35 → 0.35', () => {
    assert.equal(plan({ globalMusicEnabled: true, bgVolumeFile: '0.35' }).music.volume, 0.35);
  });
});

describe('F11 — music enabled with volume 0 resolves to disabled (no dead air)', () => {
  test('enabled=true + volume 0 → music off', () => {
    const p = plan({ globalMusicEnabled: true, bgVolumeFile: '0', profileTrack: 't.mp3' });
    assert.equal(p.music.enabled, false);
    assert.equal(p.music.track, null);
  });
});

describe('F8 — stringly-typed booleans are coerced correctly', () => {
  test('the string "false" is falsey (not truthy)', () => {
    assert.equal(plan({ globalMute: 'false' }).mute, false);
    assert.equal(plan({ rdpModeExplicit: 'false' }).rdpMode, false);
    assert.equal(plan({ noPlay: '0' }).noPlayback, false);
  });
  test('the string "true"/"1" is truthy', () => {
    assert.equal(plan({ globalMute: 'true' }).mute, true);
    assert.equal(plan({ noPlayback: '1' }).noPlayback, true);
  });
  test('profileMusicEnabled "false" does not block global enabled', () => {
    // 'false' must resolve to false and let the global setting apply
    const p = plan({ profileMusicEnabled: 'false', globalMusicEnabled: 'true' });
    assert.equal(p.music.enabled, true);
  });
});

describe('F9 — the plan is deeply frozen (players cannot re-drift by mutation)', () => {
  test('nested music and sshTarget are frozen', () => {
    const p = plan({ globalMusicEnabled: true, providerTransport: 'ssh-remote', sshHostConfig: 'h', sshPortConfig: '2222' });
    assert.ok(Object.isFrozen(p.music));
    assert.ok(Object.isFrozen(p.sshTarget));
  });
});

describe('F12 — a non-numeric port is never passed as -p', () => {
  test('passPortFlag is false for a garbage port and validatePlan rejects it if forced', () => {
    const p = plan({ providerTransport: 'ssh-remote', sshHostConfig: 'h', sshPortConfig: 'abc' });
    assert.equal(p.sshTarget.passPortFlag, false);
    assert.deepEqual(validatePlan(p), []);
  });
});

describe('plan shape + validation', () => {
  test('a default plan is structurally valid and frozen', () => {
    const p = plan({ globalMusicEnabled: true });
    assert.deepEqual(validatePlan(p), []);
    assert.ok(Object.isFrozen(p));
  });
  test('llmKey defaults to llm:default', () => {
    assert.equal(plan().llmKey, 'llm:default');
  });
  test('reverb defaults to off; override wins', () => {
    assert.equal(plan().reverb, 'off');
    assert.equal(plan({ reverbOverride: 'cathedral', perLlmReverb: 'light' }).reverb, 'cathedral');
  });
  test('pretext suppressed by noPretext flag', () => {
    assert.equal(plan({ perLlmPretext: 'Yo,', noPretext: true }).pretext, '');
    assert.equal(plan({ perLlmPretext: 'Yo,' }).pretext, 'Yo,');
  });
});
