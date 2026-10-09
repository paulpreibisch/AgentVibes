#!/usr/bin/env node

/**
 * Story AVI-S8.7 — Resolver conformance matrix (the safety net).
 *
 * This is the machine-readable contract that Stage 2 (porting play-tts.sh,
 * play-tts.ps1, the SSH sender, and mcp-server/server.py onto resolveUtterance())
 * must satisfy. It goes BROADER than the 60 hand-written tests in
 * test/unit/utterance-resolver.test.js: instead of one example per landmine,
 * it enumerates the interesting CROSS-PRODUCT of dimensions — voice shape ×
 * transport × per-LLM engine × forceProvider × provider file, volume source ×
 * unit × magnitude, the full mute truth table, every engine alias, etc. — so a
 * broken Stage-2 port that only breaks ONE cell of the matrix still fails loud.
 *
 * Source of truth: docs/implementation-artifacts/8-5-precedence-map.md
 *   - §D  the UtterancePlan schema + precedence
 *   - §C  divergences the resolver reconciles
 *   - §E  the regression corpus (R1-R23)
 *
 * Regression-row coverage in THIS file: R1, R2, R3, R4, R5, R8, R9, R10, R11,
 * R13-analogue, R17, R18, R19, R20, plus F1-F9, F11, F12 (the Fable-gate fixes).
 *
 * Out of resolver scope (do NOT test resolveUtterance() for these — they are
 * owned elsewhere and stay exactly where the map puts them):
 *   - R12 MCP set_personality plain-text success reporting  → mcp-server/test_mcp_correctness.py
 *   - R14 MCP download_extra_voices(auto_yes=False) confirmation → mcp-server/test_mcp_correctness.py
 *   - R15 MCP subprocess stdin=DEVNULL / timeout                → mcp-server/test_mcp_correctness.py
 *   - R16 MCP replay_audio Windows support                      → mcp-server/test_mcp_correctness.py
 *   - R21 bmad-speak.sh crash (dead script, see map "Blockers")  → blocked; not resolver's to fix
 *   - R22 voice-assignments.json display-name resolution        → 8.1 (npm install/packaging)
 *   - R23 scoped set_voice/set_provider (no global rewrite)     → future scoped-write story
 *   - R6's FAIL-LOUD half (synthesis failure -> no audio)       → enforced by the provider's
 *     AV_OUTPUT: sentinel contract at PORT time (Stage 2), not by the pure resolver.
 *   - R7 (concurrent party-mode, each own exact path) is a port-time file-handling
 *     property; the resolver-level slice of it (plan carries its own outputPath
 *     verbatim, never derived) IS covered below.
 *   - R19's "browser/receiver wins" (receiver-authoritative) principle is a
 *     STAGE-2 RECEIVER behavior (see map's "Receiver-authoritative principle"),
 *     not a resolver decision — the resolver's job stops at forwarding the full
 *     plan. The resolver-ownable slice of "R19" already in the hand-written
 *     suite (forceProvider vs provider-file local ordering) is extended below.
 *
 * Pure-function tests: no filesystem, no env, no child processes.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveUtterance,
  validatePlan,
  normalizeVolume,
  normalizeEngine,
  isKokoroVoice,
  isPiperVoice,
  toBool,
  ENGINES,
  TRANSPORTS,
  ENGINE_ALIASES,
  DEFAULT_BG_VOLUME,
} from '../../src/services/utterance-resolver.js';

const plan = (o = {}) => resolveUtterance({ text: 'matrix', ...o });

/* ================================================================== *
 * Section A — Engine resolution matrix (R1, F4, F5, F3, R19)
 * voice shape × transport × per-LLM engine × forceProvider × provider file
 * ================================================================== */

describe('A1 — voice/engine coupling wins over EVERY other engine source, on EVERY transport', () => {
  const kokoroVoices = ['af_river', 'am_michael', 'bf_emma', 'jf_alpha', 'af_bella'];
  const localTransportInputs = [{}, { providerTransport: 'local' }];
  const remoteTransportInputs = [
    { providerTransport: 'ssh-remote', sshHostConfig: 'h' },
    { providerTransport: 'agentvibes-receiver', sshHostConfig: 'h' },
    { providerTransport: 'termux-ssh', sshHostConfig: 'h' },
  ];
  const engineNoise = [
    { perLlmEngine: 'piper' },
    { perLlmEngine: 'sapi' },
    { forceProvider: 'macos' },
    { providerEngine: 'elevenlabs' },
    { perLlmEngine: 'piper', forceProvider: 'sapi', providerEngine: 'macos', receiverProvider: 'elevenlabs' },
  ];

  for (const voice of kokoroVoices) {
    for (const transportBag of [...localTransportInputs, ...remoteTransportInputs]) {
      for (const noise of engineNoise) {
        const label = `${voice} / ${transportBag.providerTransport || 'local'} / ${JSON.stringify(noise)}`;
        test(`R1: ${label} -> kokoro`, () => {
          const p = plan({ explicitVoice: voice, ...transportBag, ...noise });
          assert.equal(p.engine, 'kokoro', label);
          assert.deepEqual(validatePlan(p), []);
        });
      }
    }
  }
});

describe('A2 — Piper-shaped voice forces piper on every transport (F4, mirror of R1)', () => {
  const piperVoices = ['en_US-amy-medium', 'es_ES-davefx-medium', 'en_US-libritts-high::Oscar-14', 'model::Speaker'];
  const transports = [
    {},
    { providerTransport: 'ssh-remote', sshHostConfig: 'h' },
    { providerTransport: 'agentvibes-receiver', sshHostConfig: 'h' },
    { providerTransport: 'termux-ssh', sshHostConfig: 'h' },
  ];
  for (const voice of piperVoices) {
    for (const t of transports) {
      test(`${voice} on ${t.providerTransport || 'local'} -> piper`, () => {
        const p = plan({ explicitVoice: voice, providerEngine: 'kokoro', perLlmEngine: 'kokoro', ...t });
        assert.equal(p.engine, 'piper');
      });
    }
  }
});

describe('A3 — remote engine tier: forceProvider > receiverProvider > null (F3), per-LLM ENGINE never applies', () => {
  const remoteBase = { providerTransport: 'ssh-remote', sshHostConfig: 'h' };
  test('neither forceProvider nor receiverProvider set -> null (receiver decides)', () => {
    assert.equal(plan({ ...remoteBase, perLlmEngine: 'sapi' }).engine, null);
  });
  test('receiverProvider alone sets the engine', () => {
    assert.equal(plan({ ...remoteBase, receiverProvider: 'kokoro' }).engine, 'kokoro');
  });
  test('forceProvider beats receiverProvider', () => {
    assert.equal(plan({ ...remoteBase, forceProvider: 'macos', receiverProvider: 'kokoro' }).engine, 'macos');
  });
  test('per-LLM ENGINE column is ignored entirely under transport (only forceProvider/receiverProvider count)', () => {
    const p = plan({ ...remoteBase, perLlmEngine: 'elevenlabs' });
    assert.equal(p.engine, null);
  });
  for (const alias of Object.keys(ENGINE_ALIASES)) {
    test(`alias "${alias}" normalizes on remote via forceProvider too (F5)`, () => {
      assert.equal(plan({ ...remoteBase, forceProvider: alias }).engine, ENGINE_ALIASES[alias]);
    });
  }
});

describe('A4 — local engine tier: per-LLM ENGINE > forceProvider > provider file > piper (R19 extended)', () => {
  test('per-LLM beats forceProvider beats provider file', () => {
    assert.equal(plan({ perLlmEngine: 'macos', forceProvider: 'sapi', providerEngine: 'kokoro' }).engine, 'macos');
  });
  test('forceProvider beats provider file when no per-LLM engine', () => {
    assert.equal(plan({ forceProvider: 'sapi', providerEngine: 'kokoro' }).engine, 'sapi');
  });
  test('provider file wins when nothing else set', () => {
    assert.equal(plan({ providerEngine: 'soprano' }).engine, 'soprano');
  });
  test('an invalid provider file value falls back to piper, not to the invalid string', () => {
    assert.equal(plan({ providerEngine: 'not-a-real-engine' }).engine, 'piper');
  });
  test('absolutely nothing set -> piper (the documented local default)', () => {
    assert.equal(plan({}).engine, 'piper');
  });
});

describe('A5 — every canonical engine round-trips through normalizeEngine and every alias maps to it', () => {
  for (const e of ENGINES) {
    test(`canonical "${e}" normalizes to itself`, () => {
      assert.equal(normalizeEngine(e), e);
      assert.equal(normalizeEngine(e.toUpperCase()), e);
    });
  }
  for (const [alias, canon] of Object.entries(ENGINE_ALIASES)) {
    test(`alias "${alias}" -> "${canon}" via the local engine tier`, () => {
      assert.equal(plan({ perLlmEngine: alias }).engine, canon);
      assert.equal(plan({ forceProvider: alias }).engine, canon);
      assert.equal(plan({ providerEngine: alias }).engine, canon);
    });
  }
  test('null/undefined/empty normalize to null', () => {
    assert.equal(normalizeEngine(null), null);
    assert.equal(normalizeEngine(undefined), null);
    assert.equal(normalizeEngine(''), null);
    assert.equal(normalizeEngine('   '), null);
  });
});

/* ================================================================== *
 * Section B — Voice resolution matrix (R2, F1, R3)
 * ================================================================== */

describe('B1 — voiceSource matrix: only llm-echo is demoted by a per-LLM voice', () => {
  const sources = ['llm-echo', 'user-explicit', 'agent-profile', 'translation-target', 'audition'];
  for (const source of sources) {
    const expectPerLlmWins = source === 'llm-echo';
    test(`voiceSource=${source}: explicit "Y" vs per-LLM "X" -> ${expectPerLlmWins ? 'X (demoted)' : 'Y (genuine)'}`, () => {
      const p = plan({ voiceSource: source, explicitVoice: 'Y-voice', perLlmVoice: 'X-voice' });
      assert.equal(p.voice, expectPerLlmWins ? 'X-voice' : 'Y-voice');
    });
  }
  test('default voiceSource (omitted) behaves as llm-echo', () => {
    const p = plan({ explicitVoice: 'Y-voice', perLlmVoice: 'X-voice' });
    assert.equal(p.voice, 'X-voice');
  });
});

describe('B2 — voice fallback chain when no explicit voice at all', () => {
  test('perLlmVoice beats providerVoice', () => {
    assert.equal(plan({ perLlmVoice: 'llm-voice', providerVoice: 'stored-voice' }).voice, 'llm-voice');
  });
  test('providerVoice used when no perLlmVoice', () => {
    assert.equal(plan({ providerVoice: 'stored-voice' }).voice, 'stored-voice');
  });
  test('nothing set -> empty string voice (not undefined/null)', () => {
    assert.equal(plan({}).voice, '');
  });
});

describe('B3 — R3 audition escape hatch across every noisy per-LLM voice value', () => {
  for (const perLlm of ['af_bella', 'en_US-amy-medium', 'anything-here']) {
    test(`audition beats per-LLM voice "${perLlm}"`, () => {
      const p = plan({ voiceSource: 'audition', explicitVoice: 'chosen-preview-voice', perLlmVoice: perLlm });
      assert.equal(p.voice, 'chosen-preview-voice');
    });
  }
});

describe('B4 — voice-shape detectors are total functions (no throw) across odd inputs', () => {
  for (const v of [undefined, null, '', 42, {}, [], 'af_', '_af', 'AF_river', 'af-river']) {
    test(`isKokoroVoice/isPiperVoice tolerate ${JSON.stringify(v)}`, () => {
      assert.doesNotThrow(() => isKokoroVoice(v));
      assert.doesNotThrow(() => isPiperVoice(v));
    });
  }
});

/* ================================================================== *
 * Section C — Transport + SSH matrix (R4, R5, F6, F12)
 * ================================================================== */

describe('C1 — SSH port matrix: exactly port 22 omits -p, every other numeric port passes it', () => {
  const ports = ['22', '2222', '45217', '80', '1', '65535'];
  for (const port of ports) {
    const shouldPass = port !== '22';
    test(`port ${port} -> passPortFlag=${shouldPass}`, () => {
      const p = plan({ providerTransport: 'ssh-remote', sshHostConfig: 'h', sshPortConfig: port });
      assert.equal(p.sshTarget.passPortFlag, shouldPass);
      assert.deepEqual(validatePlan(p), []);
    });
  }
});

describe('C2 — non-numeric / malformed ports never pass -p (F12)', () => {
  for (const port of ['abc', '22a', '-1', '3.14', '', '  ']) {
    test(`malformed port "${port}" -> passPortFlag=false`, () => {
      const p = plan({ providerTransport: 'ssh-remote', sshHostConfig: 'h', sshPortConfig: port });
      assert.equal(p.sshTarget.passPortFlag, false);
      assert.deepEqual(validatePlan(p), []);
    });
  }
});

describe('C3 — SSH host source precedence: env > config > legacy', () => {
  test('env host beats config and legacy', () => {
    const p = plan({ sshHostEnv: 'env-host', sshHostConfig: 'cfg-host', sshHostLegacy: 'legacy-host', providerTransport: 'ssh-remote' });
    assert.equal(p.sshTarget.host, 'env-host');
  });
  test('config host beats legacy when no env', () => {
    const p = plan({ sshHostConfig: 'cfg-host', sshHostLegacy: 'legacy-host', providerTransport: 'ssh-remote' });
    assert.equal(p.sshTarget.host, 'cfg-host');
  });
  test('legacy host used as last resort', () => {
    const p = plan({ sshHostLegacy: 'legacy-host', providerTransport: 'ssh-remote' });
    assert.equal(p.sshTarget.host, 'legacy-host');
  });
});

describe('C4 — every remote transport kind falls back to local when no host resolves (F6)', () => {
  for (const kind of ['ssh-remote', 'agentvibes-receiver', 'termux-ssh']) {
    test(`${kind} with no host anywhere -> local, sshTarget null, plan still valid`, () => {
      const p = plan({ providerTransport: kind });
      assert.equal(p.transport, 'local');
      assert.equal(p.sshTarget, null);
      assert.deepEqual(validatePlan(p), []);
    });
  }
});

describe('C5 — per-LLM transport mode=remote resolves a transport kind', () => {
  test('defaults to ssh-remote when no explicit kind given', () => {
    const p = plan({ perLlmTransportMode: 'remote', sshHostConfig: 'h' });
    assert.equal(p.transport, 'ssh-remote');
  });
  test('an explicit per-LLM transport kind is honored', () => {
    const p = plan({ perLlmTransportMode: 'remote', perLlmTransportKind: 'termux-ssh', sshHostConfig: 'h' });
    assert.equal(p.transport, 'termux-ssh');
  });
  test('a non-remote-keyword provider file value ("local" is not a real sentinel) does NOT block per-LLM remote mode', () => {
    // tts-provider.txt only ever names a synth engine (piper/kokoro/...) or a
    // remote-transport keyword — it never literally contains the string
    // "local" (local is just the absence of a transport keyword). resolveTransport
    // only short-circuits when the explicit value IS one of the REMOTE_TRANSPORTS
    // keywords (matching play-tts.sh's `case $ACTIVE_PROVIDER in ssh-remote|...)`);
    // any other explicit value still falls through to the per-LLM remote check —
    // exactly like the real bash per-LLM SSH override block.
    const p = plan({ providerTransport: 'local', perLlmTransportMode: 'remote', sshHostConfig: 'h' });
    assert.equal(p.transport, 'ssh-remote');
  });
  test('an explicit remote-transport keyword in the provider file wins outright (no per-LLM check needed)', () => {
    const p = plan({ providerTransport: 'agentvibes-receiver', perLlmTransportMode: 'remote', perLlmTransportKind: 'termux-ssh', sshHostConfig: 'h' });
    assert.equal(p.transport, 'agentvibes-receiver');
  });
});

/* ================================================================== *
 * Section D — Background music matrix (R8, R9, R10, F2, F7, F11)
 * ================================================================== */

describe('D1 — volume magnitude matrix: fraction / percent / edge / runaway (R9)', () => {
  const cases = [
    ['0', 0], ['0.0', 0], ['0.35', 0.35], ['1', 1], ['1.0', 1],
    ['20', 0.20], ['70', 0.70], ['99', 0.99], ['100', 1],
    ['150', 1], ['5000', 1], ['-5', 0],
  ];
  for (const [raw, expected] of cases) {
    test(`normalizeVolume("${raw}") -> ${expected}`, () => {
      assert.equal(normalizeVolume(raw), expected);
    });
  }
  test('non-numeric volume input falls back to the 0.20 default', () => {
    assert.equal(normalizeVolume('not-a-number'), DEFAULT_BG_VOLUME);
  });
});

describe('D2 — per-source volume UNIT matrix (F7): same numeral, different meaning by source', () => {
  test('profileVolume (percent-native) 20 -> 0.20', () => {
    assert.equal(plan({ globalMusicEnabled: true, profileVolume: 20 }).music.volume, 0.20);
  });
  test('bgVolumeFile (fraction-native) 20 clamps to 1 (it is NOT treated as 20%)', () => {
    assert.equal(plan({ globalMusicEnabled: true, bgVolumeFile: '20' }).music.volume, 1);
  });
  test('overrideVolume (fraction-native, env) 0.2 -> 0.20 unchanged', () => {
    assert.equal(plan({ globalMusicEnabled: true, overrideVolume: '0.2' }).music.volume, 0.20);
  });
  test('perLlmBgVolume (ambiguous heuristic) "70" -> 0.70', () => {
    assert.equal(plan({ globalMusicEnabled: true, perLlmBgVolume: '70' }).music.volume, 0.70);
  });
});

describe('D3 — volume source precedence: override > profile > per-LLM > file > default', () => {
  test('overrideVolume wins over everything', () => {
    const p = plan({
      globalMusicEnabled: true, overrideVolume: '0.9', profileVolume: 50, perLlmBgVolume: '30', bgVolumeFile: '0.1',
    });
    assert.equal(p.music.volume, 0.9);
  });
  test('profileVolume wins when no override', () => {
    const p = plan({ globalMusicEnabled: true, profileVolume: 50, perLlmBgVolume: '30', bgVolumeFile: '0.1' });
    assert.equal(p.music.volume, 0.5);
  });
  test('perLlmBgVolume wins when no override/profile', () => {
    const p = plan({ globalMusicEnabled: true, perLlmBgVolume: '30', bgVolumeFile: '0.1' });
    assert.equal(p.music.volume, 0.30);
  });
  test('bgVolumeFile is the last resort before the 0.20 default', () => {
    const p = plan({ globalMusicEnabled: true, bgVolumeFile: '0.1' });
    assert.equal(p.music.volume, 0.1);
  });
  test('nothing set -> the 0.20 default', () => {
    assert.equal(plan({ globalMusicEnabled: true }).music.volume, 0.20);
  });
});

describe('D4 — music-enabled OR-truth-table (R10) across the 3 boolean-ish sources', () => {
  const bools = ['true', 'false', undefined];
  for (const profile of bools) {
    for (const global of bools) {
      for (const perLlmFile of [undefined, 'track.mp3']) {
        const expected = toBool(profile) || perLlmFile !== undefined || toBool(global);
        test(`profile=${profile} perLlmBgFile=${perLlmFile} global=${global} -> enabled=${expected}`, () => {
          const p = plan({ profileMusicEnabled: profile, perLlmBgFile: perLlmFile, globalMusicEnabled: global, profileTrack: 't.mp3' });
          assert.equal(p.music.enabled, expected);
        });
      }
    }
  }
});

describe('D5 — overrideMusicEnabled is authoritative, forcing on or off regardless of other sources', () => {
  test('override=false forces music off even with global on + profile on', () => {
    const p = plan({ overrideMusicEnabled: 'false', globalMusicEnabled: true, profileMusicEnabled: true, profileTrack: 't.mp3' });
    assert.equal(p.music.enabled, false);
  });
  test('override=true forces music on even with everything else off', () => {
    const p = plan({ overrideMusicEnabled: 'true', globalMusicEnabled: false, profileMusicEnabled: false });
    assert.equal(p.music.enabled, true);
  });
});

describe('D6 — track precedence chain (F2 fixes the dropped override track)', () => {
  const allSources = {
    overrideTrack: 'override.mp3',
    customMusicNewest: 'custom.mp3',
    testTrack: 'test.mp3',
    profileTrack: 'profile.mp3',
    perLlmBgFile: 'perllm.mp3',
    bgTrackFile: 'file.mp3',
  };
  const order = ['overrideTrack', 'customMusicNewest', 'testTrack', 'profileTrack', 'perLlmBgFile', 'bgTrackFile'];
  for (let i = 0; i < order.length; i++) {
    const present = {};
    for (let j = i; j < order.length; j++) present[order[j]] = allSources[order[j]];
    test(`with {${order.slice(i).join(', ')}} present -> "${allSources[order[i]]}" wins`, () => {
      const p = plan({ globalMusicEnabled: true, ...present });
      assert.equal(p.music.track, allSources[order[i]]);
    });
  }
  test('no track source at all -> the bachata default', () => {
    const p = plan({ globalMusicEnabled: true });
    assert.equal(p.music.track, 'agent_vibes_bachata_v1_loop.mp3');
  });
});

describe('D7 — volume-0 disables music regardless of an enabled source (F11, no dead air)', () => {
  for (const source of ['profileMusicEnabled', 'globalMusicEnabled']) {
    test(`${source}=true + volume 0 -> enabled false, track null`, () => {
      const p = plan({ [source]: true, bgVolumeFile: '0', profileTrack: 't.mp3' });
      assert.equal(p.music.enabled, false);
      assert.equal(p.music.track, null);
    });
  }
});

/* ================================================================== *
 * Section E — Mute truth table (R17) — full 2^3 combinations
 * ================================================================== */

describe('E1 — mute is a full 3-input truth table: unmute > mute > global', () => {
  const combos = [];
  for (const g of [false, true]) {
    for (const m of [false, true]) {
      for (const u of [false, true]) {
        combos.push([g, m, u]);
      }
    }
  }
  for (const [globalMute, projectMute, projectUnmute] of combos) {
    const expected = projectUnmute ? false : (projectMute ? true : globalMute);
    test(`global=${globalMute} projectMute=${projectMute} projectUnmute=${projectUnmute} -> mute=${expected}`, () => {
      const p = plan({ globalMute, projectMute, projectUnmute });
      assert.equal(p.mute, expected);
    });
  }
});

describe('E2 — mute inputs are string-coerced correctly (F8) at every truth-table cell', () => {
  test('string "false" everywhere resolves to unmuted', () => {
    assert.equal(plan({ globalMute: 'false', projectMute: 'false', projectUnmute: 'false' }).mute, false);
  });
  test('string "true" project mute overrides string "false" global', () => {
    assert.equal(plan({ globalMute: 'false', projectMute: 'true' }).mute, true);
  });
});

/* ================================================================== *
 * Section F — language, personality, speed, pretext, reverb, effects
 * (R18, R13-analogue, R20, plan defaults)
 * ================================================================== */

describe('F-lang — language precedence: learning > translation > file > english (R18)', () => {
  test('learning beats everything', () => {
    const p = plan({ learningLanguage: 'japanese', translationLanguage: 'french', languageFile: 'spanish' });
    assert.equal(p.language, 'japanese');
  });
  test('translation beats file', () => {
    assert.equal(plan({ translationLanguage: 'french', languageFile: 'spanish' }).language, 'french');
  });
  test('file used when no override', () => {
    assert.equal(plan({ languageFile: 'spanish' }).language, 'spanish');
  });
  test('default is english', () => {
    assert.equal(plan({}).language, 'english');
  });
});

describe('F-personality — per-call override > file > normal (R13-analogue)', () => {
  test('override beats file', () => {
    assert.equal(plan({ personalityOverride: 'pirate', personalityFile: 'cheerful' }).personality, 'pirate');
  });
  test('file used alone', () => {
    assert.equal(plan({ personalityFile: 'cheerful' }).personality, 'cheerful');
  });
  test('absent -> normal (not written as a phantom signal)', () => {
    assert.equal(plan({}).personality, 'normal');
  });
});

describe('F-speed — applies uniformly across every engine (R20)', () => {
  const engines = [
    { perLlmVoice: 'en_US-amy-medium' },       // piper (voice-coupled)
    { explicitVoice: 'af_river' },             // kokoro (voice-coupled)
    { providerEngine: 'macos' },
    { providerEngine: 'sapi' },
    { providerEngine: 'soprano' },
    { providerEngine: 'elevenlabs' },
  ];
  for (const eng of engines) {
    test(`speed 1.4 carried regardless of engine choice (${JSON.stringify(eng)})`, () => {
      const p = plan({ ...eng, speechRate: '1.4' });
      assert.equal(p.speed, 1.4);
    });
  }
  test('translation target rate beats the file', () => {
    assert.equal(plan({ translationRate: '0.8', speechRate: '1.4' }).speed, 0.8);
  });
  test('a non-positive/garbage rate falls back to 1.0', () => {
    assert.equal(plan({ speechRate: '-1' }).speed, 1.0);
    assert.equal(plan({ speechRate: 'nope' }).speed, 1.0);
    assert.equal(plan({ speechRate: '0' }).speed, 1.0);
  });
});

describe('F-pretext — per-LLM > json > pretext file > intro file, suppressible', () => {
  test('per-LLM beats every file source', () => {
    const p = plan({ perLlmPretext: 'LLM says hi', pretextConfigJson: 'json hi', pretextFile: 'file hi', introTextFile: 'intro hi' });
    assert.equal(p.pretext, 'LLM says hi');
  });
  test('json beats pretext file beats intro file', () => {
    assert.equal(plan({ pretextConfigJson: 'json hi', pretextFile: 'file hi', introTextFile: 'intro hi' }).pretext, 'json hi');
    assert.equal(plan({ pretextFile: 'file hi', introTextFile: 'intro hi' }).pretext, 'file hi');
    assert.equal(plan({ introTextFile: 'intro hi' }).pretext, 'intro hi');
  });
  test('AGENTVIBES_NO_PRETEXT suppresses ALL pretext sources', () => {
    assert.equal(plan({ perLlmPretext: 'LLM says hi', noPretext: true }).pretext, '');
  });
  test('no pretext anywhere -> empty string, not undefined', () => {
    assert.equal(plan({}).pretext, '');
  });
});

describe('F-reverb — override > per-LLM preset > file > off', () => {
  test('override wins', () => {
    assert.equal(plan({ reverbOverride: 'cathedral', perLlmReverb: 'light', reverbFile: 'medium' }).reverb, 'cathedral');
  });
  test('per-LLM wins over file', () => {
    assert.equal(plan({ perLlmReverb: 'light', reverbFile: 'medium' }).reverb, 'light');
  });
  test('file used alone', () => {
    assert.equal(plan({ reverbFile: 'medium' }).reverb, 'medium');
  });
  test('default off', () => {
    assert.equal(plan({}).reverb, 'off');
  });
});

describe('F-effects — effects override beats per-LLM effects; both absent -> empty string', () => {
  test('override wins', () => {
    assert.equal(plan({ effectsOverride: 'chorus', perLlmEffects: 'echo' }).effects, 'chorus');
  });
  test('per-LLM used alone', () => {
    assert.equal(plan({ perLlmEffects: 'echo' }).effects, 'echo');
  });
  test('neither -> empty string', () => {
    assert.equal(plan({}).effects, '');
  });
});

/* ================================================================== *
 * Section G — no-playback / test-mode flag unification (R11) + rdpMode
 * ================================================================== */

describe('G1 — noPlayback: full 2x2 spelling matrix (R11 — retires the NO_PLAY/NO_PLAYBACK split)', () => {
  const bools = [true, false];
  for (const noPlay of bools) {
    for (const noPlayback of bools) {
      const expected = noPlay || noPlayback;
      test(`noPlay=${noPlay} noPlayback=${noPlayback} -> canonical noPlayback=${expected}`, () => {
        assert.equal(plan({ noPlay, noPlayback }).noPlayback, expected);
      });
    }
  }
});

describe('G2 — testMode: env-vs-file split unified into one canonical signal', () => {
  const bools = [true, false];
  for (const env of bools) {
    for (const file of bools) {
      const expected = env || file;
      test(`testModeEnv=${env} testModeFile=${file} -> canonical testMode=${expected}`, () => {
        assert.equal(plan({ testModeEnv: env, testModeFile: file }).testMode, expected);
      });
    }
  }
});

describe('G3 — rdpMode: explicit env OR sniffed-from-SSH, both string-coerced', () => {
  test('explicit true', () => {
    assert.equal(plan({ rdpModeExplicit: 'true' }).rdpMode, true);
  });
  test('sniffed true', () => {
    assert.equal(plan({ rdpModeSniffed: true }).rdpMode, true);
  });
  test('neither -> false', () => {
    assert.equal(plan({}).rdpMode, false);
  });
  test('string "off" is falsey, not truthy', () => {
    assert.equal(plan({ rdpModeExplicit: 'off' }).rdpMode, false);
  });
});

/* ================================================================== *
 * Section H — outputPath (R6/R7 resolver-level slice) + llmKey + projectDir
 * ================================================================== */

describe('H1 — outputPath is carried verbatim, never derived (R6/R7)', () => {
  test('absent -> null (no "most recent file" fallback exists)', () => {
    assert.equal(plan({}).outputPath, null);
  });
  test('an exact path from the AV_OUTPUT sentinel passes through unchanged', () => {
    assert.equal(plan({ outputPath: '/x/y/tts-9f8e.wav' }).outputPath, '/x/y/tts-9f8e.wav');
  });
  test('two concurrent plans keep their own distinct paths (R7 — no cross-grab)', () => {
    const paths = ['/a/tts-1.wav', '/a/tts-2.wav', '/a/tts-3.wav'];
    const plans = paths.map((outputPath) => plan({ outputPath }));
    assert.deepEqual(plans.map((p) => p.outputPath), paths);
  });
});

describe('H2 — llmKey defaults and is carried from the caller', () => {
  test('default is llm:default', () => {
    assert.equal(plan({}).llmKey, 'llm:default');
  });
  test('an explicit llmKey passes through', () => {
    assert.equal(plan({ llmKey: 'llm:copilot' }).llmKey, 'llm:copilot');
  });
});

describe('H3 — projectDir resolution falls through to null when unresolved', () => {
  test('explicit projectDir wins', () => {
    assert.equal(plan({ projectDir: '/home/user/proj' }).projectDir, '/home/user/proj');
  });
  test('absent -> null (loader is responsible for the walk-up/home fallback, Stage 2)', () => {
    assert.equal(plan({}).projectDir, null);
  });
});

/* ================================================================== *
 * Section I — structural validation across a battery of generated plans (F9)
 * ================================================================== */

describe('I1 — every plan in this file-generated battery is structurally valid and frozen', () => {
  const battery = [
    {},
    { explicitVoice: 'af_river' },
    { perLlmVoice: 'en_US-amy-medium', globalMusicEnabled: true },
    { providerTransport: 'ssh-remote', sshHostConfig: 'h', sshPortConfig: '2222' },
    { providerTransport: 'agentvibes-receiver', sshHostConfig: 'h', receiverProvider: 'kokoro' },
    { providerTransport: 'termux-ssh', sshHostConfig: 'h' },
    { globalMusicEnabled: true, overrideTrack: 'x.mp3', overrideVolume: '0.5' },
    { perLlmEngine: 'windows-sapi' },
    { forceProvider: 'macos-say' },
  ];
  for (const inputs of battery) {
    test(`valid + frozen: ${JSON.stringify(inputs)}`, () => {
      const p = plan(inputs);
      assert.deepEqual(validatePlan(p), []);
      assert.ok(Object.isFrozen(p));
      assert.ok(Object.isFrozen(p.music));
      if (p.sshTarget) assert.ok(Object.isFrozen(p.sshTarget));
    });
  }
});

describe('I2 — TRANSPORTS/ENGINES exported constants match validatePlan\'s own allowlists', () => {
  test('every TRANSPORTS entry is accepted by a minimal plan', () => {
    for (const t of TRANSPORTS) {
      if (t === 'local') {
        assert.deepEqual(validatePlan(plan({})), []);
      } else {
        assert.deepEqual(validatePlan(plan({ providerTransport: t, sshHostConfig: 'h' })), []);
      }
    }
  });
  test('every ENGINES entry is reachable via providerEngine on local transport', () => {
    for (const e of ENGINES) {
      assert.equal(plan({ providerEngine: e }).engine, e);
    }
  });
});
