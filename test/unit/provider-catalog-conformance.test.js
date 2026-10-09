/**
 * Provider Catalog Conformance v1 (AVI-S9.1, Phase 0).
 *
 * Matrix-driven guard (provider × surface × platform) in the style of
 * resolver-conformance-matrix.test.js, reusing the text-extractor approach of
 * provider-dispatcher-parity.test.js. It proves every EXISTING dispatcher agrees
 * with the canonical Provider Catalog (src/services/provider-catalog.js).
 *
 * Implements design §5 groups:
 *   1 = artifact freshness (regenerate in-memory, byte-diff vs. checked-in copies)
 *   2 = positive availability (over ALL 7 providers)
 *   3 = NEGATIVE availability (a platform must reject a provider it cannot play)
 *   4 = runtime truth (declared runtime scripts exist; orphaned provider has no dispatcher)
 *   5 = voice rules
 *   6 = resolver-seam parity (welds the catalog↔resolver seam by assertion, not import)
 *   7 = bash-3.2 lint (generated .sh has no `declare -A` / case-modifying expansions)
 *   8 = display names
 *
 * Groups 1/4/7 landed in Phase 1 (AVI-S9.2). Group 1 (freshness byte-diff)
 * SUBSUMES and RETIRES the former test/unit/elevenlabs-catalog-parity.test.js —
 * the shell catalog is now GENERATED from src/services/provider-catalog.js, so
 * bash↔JS drift is caught by regeneration equality, not a hand-mirror parser.
 *
 * @module test/unit/provider-catalog-conformance
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { generateAll, ARTIFACTS } from '../../scripts/generate-provider-catalog.mjs';

import {
  getProvider,
  listProviders,
  providersFor,
  isAvailable,
  listVoices,
  defaultVoice,
  validateVoice,
  displayName,
  engineAliasTable,
} from '../../src/services/provider-catalog.js';
import {
  KOKORO_VOICE_RE,
  PIPER_VOICE_RE,
  ENGINES,
  ENGINE_ALIASES,
} from '../../src/services/utterance-resolver.js';
import {
  SUPPORTED_PROVIDERS,
  CROSS_PLATFORM_PROVIDERS,
  WINDOWS_RUNTIME_PROVIDERS,
  isKnownProvider,
  getProviderDisplayName,
} from '../../src/utils/provider-validator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const ALL_IDS = listProviders().map((r) => r.id);

// --- Extractors: pull the provider tokens each dispatcher actually recognises ---

/** Extract a Python list literal `NAME = [ ... ]` (string items) from source. */
function pyListLiteral(src, name) {
  const m = src.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!m) return [];
  return (m[1].match(/["']([^"']+)["']/g) || []).map((s) => s.replace(/["']/g, ''));
}

/** Extract a Python dict literal `NAME = { "k": "v", ... }` from source. */
function pyDictLiteral(src, name) {
  const m = src.match(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`));
  if (!m) return {};
  const out = {};
  const pairRe = /["']([^"']+)["']\s*:\s*["']([^"']*)["']/g;
  let pm;
  while ((pm = pairRe.exec(m[1])) !== null) out[pm[1]] = pm[2];
  return out;
}

/**
 * server.py's EMBEDDED FALLBACK allowlists, split by platform. Post-AVI-S9.5 the
 * runtime lists DERIVE from provider-catalog.json; the embedded literals below
 * are the fallback (parity-asserted ≡ catalog, both directions). The negative /
 * positive availability groups read the fallback because it is what ships AND is
 * proven equal to the catalog. The non-Windows fallback carries the transport
 * token (termux-ssh), matching the runtime set the server accepts on non-Windows.
 */
function serverAllowlistsByPlatform(src) {
  const windows = pyListLiteral(src, '_FALLBACK_PROVIDERS_WINDOWS');
  const nonWindows = pyListLiteral(src, '_FALLBACK_PROVIDERS_NON_WINDOWS');
  const transport = pyListLiteral(src, '_TRANSPORT_TOKENS');
  return { windows, unix: nonWindows.concat(transport) };
}

/** The `$ValidProviders = @( ... )` array literal in provider-manager.ps1. */
function ps1ValidProviders(src) {
  const m = src.match(/\$ValidProviders\s*=\s*@\(([^)]*)\)/);
  if (!m) return [];
  return (m[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''));
}

/**
 * The `-ProviderOverride` allowlist FALLBACK literal in play-tts.ps1. Post-
 * AVI-S9.5 the live allowlist derives from provider-catalog.ps1 (dot-sourced);
 * this reads the `$ProviderOverrideAllowlist = @( ... )` legacy fallback, which
 * conformance proves equals the Windows set + forwarding aliases.
 */
function ps1ProviderOverrideAllowlist(src) {
  const m = src.match(/\$ProviderOverrideAllowlist\s*=\s*@\(([^)]*)\)/);
  if (!m) return [];
  return (m[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''));
}

/**
 * Provider ids list-voices.js presents a real voice list for. Post-AVI-S9.5 it
 * iterates the catalog and branches on `voiceModel` (no `provider === '...'`
 * chain): every static/name-to-id/single record is listable, plus the discovered
 * providers explicitly enumerated in `LISTABLE_DISCOVERED` (piper/macos). This
 * mirrors the code so the extractor can't drift from it.
 */
function listVoicesProviders(src) {
  const m = src.match(/LISTABLE_DISCOVERED\s*=\s*new Set\(\[([^\]]*)\]\)/);
  const discovered = m ? (m[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, '')) : [];
  const listableModels = new Set(['static', 'name-to-id', 'single']);
  const byModel = listProviders().filter((r) => listableModels.has(r.voiceModel)).map((r) => r.id);
  return [...new Set([...discovered, ...byModel])];
}

/**
 * Provider ids handled by explicit `ACTIVE_PROVIDER == "..."` arms in a NAMED
 * case block of voice-manager.sh (sliced by label so arms in other cases can't leak in).
 */
function voiceManagerCaseProviders(src, label, nextLabel) {
  const start = src.indexOf(label);
  const end = src.indexOf(nextLabel, start);
  const block = start !== -1 && end !== -1 ? src.slice(start, end) : src;
  return (block.match(/ACTIVE_PROVIDER"?\s*==\s*"([^"]+)"/g) || []).map((s) => s.replace(/.*"([^"]+)"$/, '$1'));
}

/**
 * server.py's display-name FALLBACK dict keys (catalog providers) + the transport
 * display dict keys (termux-ssh). Post-AVI-S9.5 the runtime dict derives from
 * provider-catalog.json; these embedded literals are the fallback.
 */
function serverDisplayDictKeys(src) {
  const merged = {
    ...pyDictLiteral(src, '_FALLBACK_DISPLAY_NAMES'),
    ...pyDictLiteral(src, '_TRANSPORT_DISPLAY_NAMES'),
  };
  return Object.keys(merged);
}

/** Normalize a raw dispatcher token to a canonical catalog id (or null if unknown). */
function toCanonical(token) {
  const r = getProvider(token);
  return r ? r.id : null;
}

/**
 * Providers ORPHANED on a platform: no runtime there AND no same-engine sibling
 * that IS playable there AND not a darwin-only forwarding alias. These are the
 * providers a platform's dispatchers must NEVER accept (design §5.3, refined so
 * cross-platform forwarding aliases like `piper`→windows-piper and `macos` are
 * legitimately allowed, isolating the true violation: elevenlabs-on-Windows).
 */
function orphanedOn(platform) {
  return listProviders()
    .filter((r) => {
      if (isAvailable(r.id, platform)) return false; // has a runtime here
      if (r.runtime.darwinOnly) return false; // darwin-only: a legit forwarding alias
      const sibling = listProviders().some(
        (q) => q.id !== r.id && q.engineId === r.engineId && isAvailable(q.id, platform),
      );
      return !sibling;
    })
    .map((r) => r.id);
}

// --- Dispatcher table (surface × platform) ---
// `file` (AVI-S9.6 AC7) records the source path each dispatcher actually reads,
// so the dispatcher-drift grep guard below can recognise "this file is already
// a known/declared dispatcher" without re-parsing tokens().
const DISPATCHERS = [
  {
    name: 'mcp-server/server.py set_provider allowlist (windows)',
    platform: 'windows',
    file: 'mcp-server/server.py',
    tokens: () => serverAllowlistsByPlatform(read('mcp-server/server.py')).windows,
  },
  {
    name: 'mcp-server/server.py set_provider allowlist (unix)',
    platform: 'unix',
    file: 'mcp-server/server.py',
    tokens: () => serverAllowlistsByPlatform(read('mcp-server/server.py')).unix,
  },
  {
    name: '.claude/hooks-windows/provider-manager.ps1 $ValidProviders',
    platform: 'windows',
    file: '.claude/hooks-windows/provider-manager.ps1',
    tokens: () => ps1ValidProviders(read('.claude/hooks-windows/provider-manager.ps1')),
  },
  {
    name: '.claude/hooks-windows/play-tts.ps1 -ProviderOverride allowlist',
    platform: 'windows',
    file: '.claude/hooks-windows/play-tts.ps1',
    tokens: () => ps1ProviderOverrideAllowlist(read('.claude/hooks-windows/play-tts.ps1')),
  },
  {
    name: '.claude/hooks/voice-manager.sh switch) arms',
    platform: 'darwin',
    file: '.claude/hooks/voice-manager.sh',
    tokens: () => voiceManagerCaseProviders(read('.claude/hooks/voice-manager.sh'), 'switch)', 'get)'),
  },
  {
    name: '.claude/hooks/voice-manager.sh list) arms',
    platform: 'darwin',
    file: '.claude/hooks/voice-manager.sh',
    tokens: () => voiceManagerCaseProviders(read('.claude/hooks/voice-manager.sh'), 'list)', 'preview)'),
  },
  {
    name: '.claude/hooks/voice-manager.sh list-simple) arms',
    platform: 'darwin',
    file: '.claude/hooks/voice-manager.sh',
    tokens: () => voiceManagerCaseProviders(read('.claude/hooks/voice-manager.sh'), 'list-simple)', 'replay)'),
  },
  {
    name: 'src/cli/list-voices.js provider branches',
    platform: 'darwin',
    file: 'src/cli/list-voices.js',
    tokens: () => listVoicesProviders(read('src/cli/list-voices.js')),
  },
];

/**
 * Formerly-known positive-availability gaps (the soprano "Unknown provider"
 * fallthrough — design row 6), tracked here as documentation of what AVI-S9.4
 * fixed. Soprano now has real list/switch/list-simple arms in voice-manager.sh
 * and a real branch in list-voices.js, so these run as live (unskipped)
 * assertions in group 2 below. Keyed by `${dispatcher.name}::${providerId}`.
 */
const KNOWN_POSITIVE_SKIPS = new Set([]);

/* ================================================================= *
 * Module API sanity (Task 1.5) — each API function, each voiceModel kind.
 * ================================================================= */
describe('provider-catalog module API', () => {
  test('holds exactly the seven canonical records', () => {
    assert.deepEqual(ALL_IDS.sort(), [
      'elevenlabs', 'kokoro', 'macos', 'piper', 'soprano', 'windows-piper', 'windows-sapi',
    ]);
  });

  test('getProvider is alias-normalizing (sapi→windows-sapi, say→macos, case/space)', () => {
    assert.equal(getProvider('sapi').id, 'windows-sapi');
    assert.equal(getProvider('say').id, 'macos');
    assert.equal(getProvider('macos-say').id, 'macos');
    assert.equal(getProvider('  KOKORO ').id, 'kokoro');
    assert.equal(getProvider('piper').id, 'piper'); // exact id wins over windows-piper alias
    assert.equal(getProvider('nope'), null);
  });

  test('elevenlabs declares runtime.windows null (the contradiction, now data)', () => {
    assert.equal(getProvider('elevenlabs').runtime.windows, null);
  });

  test('validateVoice always returns {ok, canonical, reason} — never a bare boolean', () => {
    for (const id of ALL_IDS) {
      const r = validateVoice(id, defaultVoice(id));
      assert.equal(typeof r, 'object');
      assert.ok('ok' in r && 'canonical' in r && 'reason' in r);
      assert.equal(typeof r.ok, 'boolean');
    }
  });

  test('listVoices: static/name-to-id enumerable; discovered needs injection', () => {
    assert.equal(listVoices('kokoro').length, getProvider('kokoro').voices.length);
    assert.equal(listVoices('elevenlabs').length, getProvider('elevenlabs').voices.length);
    assert.deepEqual(listVoices('soprano'), [{ id: 'soprano-default', gender: '' }]);
    assert.deepEqual(listVoices('piper'), []); // no injected list
    assert.deepEqual(
      listVoices('piper', { installed: ['en_US-amy-medium'] }),
      [{ id: 'en_US-amy-medium', gender: '' }],
    );
  });
});

/* ================================================================= *
 * GROUP 2 — Positive availability (over ALL 7 providers).
 * ================================================================= */
describe('group 2 — positive availability', () => {
  for (const d of DISPATCHERS) {
    const required = providersFor(d.platform).map((r) => r.id);
    for (const provider of required) {
      const key = `${d.name}::${provider}`;
      const opts = KNOWN_POSITIVE_SKIPS.has(key)
        ? { skip: 'AVI-S9.4: soprano list/switch fallthrough — fixed in a later phase' }
        : {};
      test(`${d.name} recognises "${provider}" (${d.platform})`, opts, () => {
        const recognised = new Set(d.tokens().map(toCanonical).filter(Boolean));
        assert.ok(
          recognised.has(provider),
          `${d.name} does not recognise "${provider}". Recognised: [${[...recognised].join(', ')}]`,
        );
      });
    }
  }
});

/* ================================================================= *
 * GROUP 3 — NEGATIVE availability (the class the positive-only test misses).
 * A platform's dispatchers must reject any provider ORPHANED on that platform.
 * MUST NOT be skipped. Red on the pre-fix tree at server.py + play-tts.ps1.
 * ================================================================= */
describe('group 3 — negative availability', () => {
  for (const d of DISPATCHERS) {
    test(`${d.name} accepts NO provider orphaned on ${d.platform}`, () => {
      const orphaned = new Set(orphanedOn(d.platform));
      const violations = d.tokens()
        .map(toCanonical)
        .filter((id) => id && orphaned.has(id));
      assert.deepEqual(
        [...new Set(violations)],
        [],
        `${d.name} accepts orphaned provider(s) [${[...new Set(violations)].join(', ')}] on ${d.platform} ` +
          `(no runtime + no same-engine sibling there). Remove the token(s).`,
      );
    });
  }
});

/* ================================================================= *
 * GROUP 5 — Voice rules.
 * ================================================================= */
describe('group 5 — voice rules', () => {
  test('kokoro: default ∈ voices; no dup ids; every voice validates & round-trips', () => {
    const ids = getProvider('kokoro').voices;
    assert.ok(ids.includes(defaultVoice('kokoro')));
    assert.equal(new Set(ids).size, ids.length, 'duplicate kokoro id');
    for (const id of ids) {
      const r = validateVoice('kokoro', id);
      assert.ok(r.ok && r.canonical === id, `kokoro voice ${id} failed validation`);
    }
  });

  test('kokoro: case-folds (AF_HEART → af_heart) and rejects fuzzed typos', () => {
    assert.deepEqual(validateVoice('kokoro', 'AF_HEART'), { ok: true, canonical: 'af_heart', reason: '' });
    assert.equal(validateVoice('kokoro', 'af_hart').ok, false);
  });

  test('kokoro ids all match resolver KOKORO_VOICE_RE and none match PIPER_VOICE_RE', () => {
    for (const id of getProvider('kokoro').voices) {
      assert.ok(KOKORO_VOICE_RE.test(id), `${id} does not match KOKORO_VOICE_RE`);
      assert.ok(!PIPER_VOICE_RE.test(id), `${id} unexpectedly matches PIPER_VOICE_RE`);
    }
  });

  test('elevenlabs: names → id (case-insensitive), raw 20-char id passthrough, typos rejected', () => {
    for (const v of getProvider('elevenlabs').voices) {
      assert.ok(/^[A-Za-z0-9]{20}$/.test(v.id), `elevenlabs id ${v.id} is not 20 alphanumerics`);
      const r = validateVoice('elevenlabs', v.name);
      assert.ok(r.ok && r.canonical === v.id, `elevenlabs name ${v.name} did not resolve to its id`);
      assert.ok(validateVoice('elevenlabs', v.id).ok, `raw id ${v.id} passthrough failed`);
    }
    assert.equal(validateVoice('elevenlabs', 'sarah').canonical, 'EXAVITQu4vr4xnSDxMaL'); // case-insensitive
    assert.equal(validateVoice('elevenlabs', 'Sara').ok, false);
    assert.equal(validateVoice('elevenlabs', 'en_US-lessac').ok, false);
    assert.ok(getProvider('elevenlabs').voices.some((v) => v.name === defaultVoice('elevenlabs')));
  });

  test('soprano: single voice — ""/soprano/soprano-default → canonical soprano-default', () => {
    for (const v of ['', 'soprano', 'soprano-default', 'SOPRANO']) {
      assert.deepEqual(validateVoice('soprano', v), { ok: true, canonical: 'soprano-default', reason: '' });
    }
    assert.equal(validateVoice('soprano', 'nope').ok, false);
  });

  test('piper (discovered): injected membership + shape fallback', () => {
    assert.ok(validateVoice('piper', 'en_US-amy-medium', { installed: ['en_US-amy-medium'] }).ok);
    assert.equal(validateVoice('piper', 'ghost', { installed: ['en_US-amy-medium'] }).ok, false);
    assert.ok(validateVoice('piper', 'en_US-lessac-medium').ok); // shape fallback, no list
    assert.equal(validateVoice('piper', 'af_heart').ok, false); // kokoro-shaped is not piper-shaped
  });
});

/* ================================================================= *
 * GROUP 6 — Resolver-seam parity (welded by assertion, never import).
 * ================================================================= */
describe('group 6 — resolver-seam parity', () => {
  test('catalog engineIds ⊆ resolver ENGINES', () => {
    for (const r of listProviders()) {
      assert.ok(ENGINES.includes(r.engineId), `engineId "${r.engineId}" (${r.id}) not in resolver ENGINES`);
    }
  });

  test('catalog alias table ≡ resolver ENGINE_ALIASES', () => {
    assert.deepEqual(engineAliasTable(), ENGINE_ALIASES);
  });

  test('play-tts.ps1 and kokoro-tts.py kokoro regexes equal KOKORO_VOICE_RE.source', () => {
    const ps1 = read('.claude/hooks-windows/play-tts.ps1');
    const py = read('.claude/hooks/kokoro-tts.py');
    const ps1Re = ps1.match(/-match\s*'(\^\[a-z\][^']*)'/);
    const pyRe = py.match(/re\.match\(\s*r'(\^\[a-z\][^']*)'/);
    assert.ok(ps1Re, 'could not find kokoro regex in play-tts.ps1');
    assert.ok(pyRe, 'could not find kokoro regex in kokoro-tts.py');
    assert.equal(ps1Re[1], KOKORO_VOICE_RE.source);
    assert.equal(pyRe[1], KOKORO_VOICE_RE.source);
  });
});

/* ================================================================= *
 * GROUP 8 — Display names.
 * ================================================================= */
describe('group 8 — display names', () => {
  test('every provider and alias yields a non-id display name', () => {
    for (const r of listProviders()) {
      assert.notEqual(displayName(r.id), r.id, `${r.id} has no display name`);
      for (const a of r.aliases) {
        assert.ok(displayName(a) && displayName(a) !== a, `alias ${a} has no display name`);
      }
    }
  });

  test('server.py display dict covers exactly the 7 catalog providers (+ termux-ssh transport)', () => {
    const keys = serverDisplayDictKeys(read('mcp-server/server.py'));
    const catalogSet = new Set(ALL_IDS);
    // Every catalog provider must have a server.py display entry.
    for (const id of ALL_IDS) {
      assert.ok(keys.includes(id), `server.py provider_names missing "${id}"`);
    }
    // Every server.py key is a catalog provider, except the known transport termux-ssh.
    for (const k of keys) {
      assert.ok(catalogSet.has(k) || k === 'termux-ssh', `server.py provider_names has unexpected key "${k}"`);
    }
  });
});

/* ================================================================= *
 * AVI-S9.5 (Phase 4) — Derived platform allowlists.
 * The embedded FALLBACK literals in every catalog-sourcing consumer must equal
 * the catalog-derived sets BOTH directions (design §8: one-directional parity is
 * the exact gap that let elevenlabs-on-Windows through the old positive-only
 * test). These guards are non-vacuous — deleting a fallback token turns one red.
 * ================================================================= */
describe('AVI-S9.5 — server.py allowlist fallback ≡ catalog (bidirectional)', () => {
  const src = read('mcp-server/server.py');
  const winFallback = pyListLiteral(src, '_FALLBACK_PROVIDERS_WINDOWS');
  const nonWinFallback = pyListLiteral(src, '_FALLBACK_PROVIDERS_NON_WINDOWS');
  const transport = pyListLiteral(src, '_TRANSPORT_TOKENS');
  const catWindows = providersFor('windows').map((r) => r.id);
  const catNonWindows = providersFor('darwin').map((r) => r.id); // superset covering Linux + macOS

  const sortedCanon = (arr) => [...new Set(arr.map(toCanonical))].sort();

  test('windows fallback ≡ catalog windows set (fallback ⊆ catalog AND catalog ⊆ fallback)', () => {
    assert.ok(winFallback.length > 0, 'could not extract _FALLBACK_PROVIDERS_WINDOWS');
    assert.deepEqual(sortedCanon(winFallback), [...catWindows].sort());
  });

  test('non-windows fallback ≡ catalog darwin set (both directions, alias-normalized)', () => {
    assert.ok(nonWinFallback.length > 0, 'could not extract _FALLBACK_PROVIDERS_NON_WINDOWS');
    assert.deepEqual(sortedCanon(nonWinFallback), [...catNonWindows].sort());
  });

  test('elevenlabs is NOT in the windows fallback (the Phase-0 fix must remain)', () => {
    assert.ok(!winFallback.includes('elevenlabs'), 'elevenlabs leaked back into the Windows allowlist');
  });

  test('termux-ssh: a non-catalog transport, accepted only on non-windows (AC6)', () => {
    assert.deepEqual(transport, ['termux-ssh']);
    assert.equal(getProvider('termux-ssh'), null, 'termux-ssh must NOT be a catalog provider (it is a transport)');
    assert.ok(!winFallback.includes('termux-ssh'), 'termux-ssh must not be in the Windows fallback');
    assert.ok(!nonWinFallback.includes('termux-ssh'), 'transport must be tracked separately, not in the provider fallback');
  });
});

describe('AVI-S9.5 — server.py display-name fallback ≡ catalog (group 8, bidirectional)', () => {
  test('_FALLBACK_DISPLAY_NAMES deep-equals catalog displayNames', () => {
    const src = read('mcp-server/server.py');
    const fallback = pyDictLiteral(src, '_FALLBACK_DISPLAY_NAMES');
    const catalog = Object.fromEntries(listProviders().map((r) => [r.id, r.displayName]));
    assert.deepEqual(fallback, catalog);
  });
});

describe('AVI-S9.5 — generated PowerShell allowlist fallbacks ≡ windows set (AC4)', () => {
  const canonSet = (arr) => new Set(arr.map(toCanonical));
  const winIds = new Set(providersFor('windows').map((r) => r.id));

  test('provider-manager.ps1 $ValidProviders fallback ≡ catalog windows set', () => {
    const tokens = ps1ValidProviders(read('.claude/hooks-windows/provider-manager.ps1'));
    assert.ok(tokens.length > 0, 'could not extract $ValidProviders literal');
    assert.deepEqual(canonSet(tokens), winIds);
    assert.ok(!tokens.includes('elevenlabs'), 'elevenlabs must not be in $ValidProviders');
  });

  test('play-tts.ps1 -ProviderOverride fallback ≡ windows set + forwarding aliases (piper/sapi/macos)', () => {
    const tokens = ps1ProviderOverrideAllowlist(read('.claude/hooks-windows/play-tts.ps1'));
    assert.ok(tokens.length > 0, 'could not extract $ProviderOverrideAllowlist literal');
    // Canonical set = windows set ∪ {piper, macos} (sapi normalizes to windows-sapi).
    const expected = new Set([...winIds, 'piper', 'macos']);
    assert.deepEqual(canonSet(tokens), expected);
    for (const alias of ['piper', 'sapi', 'macos']) {
      assert.ok(tokens.includes(alias), `forwarding alias "${alias}" missing from play-tts.ps1 allowlist`);
    }
    assert.ok(!tokens.includes('elevenlabs'), 'elevenlabs must not be forwardable on Windows');
  });
});

describe('AVI-S9.5 — list-voices.js iterates the catalog (AC5)', () => {
  const src = read('src/cli/list-voices.js');

  test('presents a real list for every static/name-to-id/single provider + piper/macos', () => {
    const recognized = new Set(listVoicesProviders(src));
    for (const r of listProviders()) {
      if (['static', 'name-to-id', 'single'].includes(r.voiceModel)) {
        assert.ok(recognized.has(r.id), `list-voices does not present a voice list for "${r.id}"`);
      }
    }
    assert.ok(recognized.has('piper') && recognized.has('macos'), 'piper/macos discovery arms missing');
  });

  test('branches via the catalog (getProvider) — no hardcoded provider=== chain remains', () => {
    assert.match(src, /getProvider\(/, 'list-voices no longer imports/uses the catalog');
    assert.doesNotMatch(src, /provider\s*===\s*'/, 'a hardcoded provider=== branch survived the migration');
  });
});

/* ================================================================= *
 * AVI-S9.6 (Phase 5, long tail) — AC1: Antoni-class literal-parity scan.
 * language-manager.sh's `is_voice_multilingual` (and its hooks-windows/
 * language-manager.ps1 twin) hardcode a small membership list of ElevenLabs
 * voice NAMES. The list previously included "Antoni"/"Rachel"/"Domi"/
 * "Charlotte" — none of which exist in the 21-voice catalog (the same class
 * of bug design row 21 found in the now-deleted learn-manager.sh). Trimmed to
 * catalog-real names; this assertion is the permanent guard — a future
 * addition of a non-existent name fails here instead of shipping silently.
 * ================================================================= */
describe('AVI-S9.6 AC1 — language-manager multilingual-voice list ⊆ ElevenLabs catalog', () => {
  const catalogNames = new Set(getProvider('elevenlabs').voices.map((v) => v.name));

  test('.claude/hooks/language-manager.sh: every multilingual_voices() entry exists in the catalog', () => {
    const src = read('.claude/hooks/language-manager.sh');
    const m = src.match(/multilingual_voices=\(([^)]*)\)/);
    assert.ok(m, 'could not find multilingual_voices=(...) in language-manager.sh');
    const names = (m[1].match(/"([^"]+)"/g) || []).map((s) => s.replace(/"/g, ''));
    assert.ok(names.length > 0, 'multilingual_voices list is empty');
    for (const n of names) {
      assert.ok(catalogNames.has(n), `language-manager.sh multilingual_voices has "${n}" — not in the ElevenLabs catalog`);
    }
    // The Antoni-class names must specifically be gone (regression guard).
    for (const bad of ['Antoni', 'Rachel', 'Domi', 'Charlotte']) {
      assert.ok(!names.includes(bad), `"${bad}" leaked back into multilingual_voices (not a real catalog voice)`);
    }
  });

  test('.claude/hooks-windows/language-manager.ps1: every $multilingual entry exists in the catalog', () => {
    const src = read('.claude/hooks-windows/language-manager.ps1');
    const m = src.match(/\$multilingual\s*=\s*@\(([^)]*)\)/);
    assert.ok(m, 'could not find $multilingual = @(...) in language-manager.ps1');
    const names = (m[1].match(/"([^"]+)"/g) || []).map((s) => s.replace(/"/g, ''));
    assert.ok(names.length > 0, '$multilingual list is empty');
    for (const n of names) {
      assert.ok(catalogNames.has(n), `language-manager.ps1 $multilingual has "${n}" — not in the ElevenLabs catalog`);
    }
    for (const bad of ['Antoni', 'Rachel', 'Domi', 'Charlotte']) {
      assert.ok(!names.includes(bad), `"${bad}" leaked back into $multilingual (not a real catalog voice)`);
    }
  });
});

/* ================================================================= *
 * AVI-S9.6 (Phase 5) — AC4: Python kokoro literal parity (defense-in-depth,
 * design row 24). kokoro-tts.py / kokoro-server.py (+ hooks-windows twins)
 * deliberately keep their own default-voice literal as a last-ditch fallback
 * even if every generated catalog artifact is missing. That's a feature, not
 * drift — but the LITERAL must never silently diverge from the catalog
 * default, so it is text-parsed and asserted here (extends group 6's existing
 * kokoro-regex parity assertion to also cover the default-voice value, and to
 * cover kokoro-server.py + both hooks-windows twins).
 * ================================================================= */
describe('AVI-S9.6 AC4 — python kokoro default-voice literal parity', () => {
  const kokoroDefault = defaultVoice('kokoro');

  test('.claude/hooks/kokoro-tts.py: argv fallback default (~35) ≡ catalog default', () => {
    const src = read('.claude/hooks/kokoro-tts.py');
    const m = src.match(/sys\.argv\[2\]\s*if\s*len\(sys\.argv\)\s*>\s*2\s*else\s*'([^']+)'/);
    assert.ok(m, 'could not find the argv[2]-fallback default literal in kokoro-tts.py');
    assert.equal(m[1], kokoroDefault);
  });

  test('.claude/hooks/kokoro-server.py: /synth default (~168) and warmup literal (~205) ≡ catalog default', () => {
    const src = read('.claude/hooks/kokoro-server.py');
    const synthDefault = src.match(/body\.get\("voice",\s*"([^"]+)"\)/);
    const warmupDefault = src.match(/synth\("ready",\s*"([^"]+)"/);
    assert.ok(synthDefault, 'could not find the /synth default-voice literal in kokoro-server.py');
    assert.ok(warmupDefault, 'could not find the warmup default-voice literal in kokoro-server.py');
    assert.equal(synthDefault[1], kokoroDefault);
    assert.equal(warmupDefault[1], kokoroDefault);
  });

  test('.claude/hooks-windows/kokoro-server.py (twin): /synth default and warmup literal ≡ catalog default', () => {
    const src = read('.claude/hooks-windows/kokoro-server.py');
    const synthDefault = src.match(/body\.get\("voice",\s*"([^"]+)"\)/);
    const warmupDefault = src.match(/synth\("ready",\s*"([^"]+)"/);
    assert.ok(synthDefault, 'could not find the /synth default-voice literal in hooks-windows/kokoro-server.py');
    assert.ok(warmupDefault, 'could not find the warmup default-voice literal in hooks-windows/kokoro-server.py');
    assert.equal(synthDefault[1], kokoroDefault);
    assert.equal(warmupDefault[1], kokoroDefault);
  });

  test('.claude/hooks-windows/kokoro-tts.py (twin): documented as having NO default-voice literal', () => {
    // Unlike its Unix sibling, the Windows twin's main() requires argv[2] (exits
    // with a usage error if short) and never falls back to a hardcoded voice —
    // there is nothing to parity-assert. This guard fails loud if that ever
    // changes underneath us, so a real fallback literal doesn't go unchecked.
    const src = read('.claude/hooks-windows/kokoro-tts.py');
    assert.doesNotMatch(
      src,
      /sys\.argv\[2\]\s*if\s*len\(sys\.argv\)\s*>\s*2\s*else\s*'[^']+'/,
      'hooks-windows/kokoro-tts.py now has a default-voice fallback literal — add a parity assertion for it above',
    );
  });
});

/* ================================================================= *
 * AVI-S9.6 (Phase 5) — AC5: installer download-target literals (design row 25).
 * piper-download-voices.sh / piper-installer.sh / termux-installer.sh
 * legitimately hardcode `en_US-lessac-medium` as the voice they BOOTSTRAP on a
 * fresh install (before any catalog artifact could possibly be sourced) — NOT
 * migrated to catalog_default_voice, but asserted equal to it so a future
 * default-voice change forces the installers to follow.
 * ================================================================= */
describe('AVI-S9.6 AC5 — installer download-target literals ≡ catalog piper default', () => {
  const piperDefault = defaultVoice('piper');

  test('piper-download-voices.sh COMMON_VOICES literal ≡ catalog piper default', () => {
    const src = read('.claude/hooks/piper-download-voices.sh');
    assert.ok(
      src.includes(`"${piperDefault}"`),
      `piper-download-voices.sh does not contain the catalog piper default "${piperDefault}"`,
    );
  });

  test('piper-installer.sh manual-download fallback ≡ catalog piper default', () => {
    const src = read('.claude/hooks/piper-installer.sh');
    assert.ok(
      src.includes(piperDefault),
      `piper-installer.sh does not contain the catalog piper default "${piperDefault}"`,
    );
  });

  test('termux-installer.sh VOICE_MODEL literal ≡ catalog piper default', () => {
    const src = read('.claude/hooks/termux-installer.sh');
    const m = src.match(/VOICE_MODEL="([^"]+)"/);
    assert.ok(m, 'could not find VOICE_MODEL="..." in termux-installer.sh');
    assert.equal(m[1], piperDefault);
  });
});

/* ================================================================= *
 * AVI-S9.6 (Phase 5) — AC6: retiring test/unit/provider-dispatcher-parity.test.js.
 * That file's "canonical provider layer" describe block asserted properties of
 * src/utils/provider-validator.js's derived-view exports (SUPPORTED_PROVIDERS,
 * CROSS_PLATFORM_PROVIDERS, WINDOWS_RUNTIME_PROVIDERS, isKnownProvider,
 * getProviderDisplayName). Those exports are DERIVED VIEWS over this catalog
 * (design row 18, landed in an earlier phase) — its OWN "every dispatcher
 * recognises its required canonical providers" assertions are superseded by
 * groups 2/3 above (same DISPATCHERS surfaces, all 7 providers instead of 2,
 * both positive AND negative). This block re-asserts the 5 "canonical
 * provider layer" checks directly against provider-validator's exports so the
 * old file's full assertion surface demonstrably survives before deletion.
 * See the Dev Agent Record for the full old→new mapping table.
 * ================================================================= */
describe('AVI-S9.6 AC6 — provider-validator derived views ≡ catalog (retires provider-dispatcher-parity.test.js)', () => {
  test('SUPPORTED_PROVIDERS is frozen and exactly the catalog id set', () => {
    assert.ok(Array.isArray(SUPPORTED_PROVIDERS) && SUPPORTED_PROVIDERS.length > 0);
    assert.ok(Object.isFrozen(SUPPORTED_PROVIDERS));
    assert.deepEqual([...SUPPORTED_PROVIDERS].sort(), ALL_IDS.sort());
  });

  test('CROSS_PLATFORM_PROVIDERS is frozen and a subset of SUPPORTED_PROVIDERS', () => {
    assert.ok(Object.isFrozen(CROSS_PLATFORM_PROVIDERS));
    for (const p of CROSS_PLATFORM_PROVIDERS) {
      assert.ok(SUPPORTED_PROVIDERS.includes(p), `${p} missing from SUPPORTED_PROVIDERS`);
    }
  });

  test('WINDOWS_RUNTIME_PROVIDERS is frozen and a subset of CROSS_PLATFORM_PROVIDERS', () => {
    assert.ok(Object.isFrozen(WINDOWS_RUNTIME_PROVIDERS));
    for (const p of WINDOWS_RUNTIME_PROVIDERS) {
      assert.ok(CROSS_PLATFORM_PROVIDERS.includes(p), `${p} in WINDOWS_RUNTIME_PROVIDERS but not CROSS_PLATFORM_PROVIDERS`);
    }
  });

  test('isKnownProvider recognises kokoro & elevenlabs (case-insensitive), rejects garbage', () => {
    assert.equal(isKnownProvider('kokoro'), true);
    assert.equal(isKnownProvider('elevenlabs'), true);
    assert.equal(isKnownProvider('KOKORO'), true);
    assert.equal(isKnownProvider('nope'), false);
  });

  test('getProviderDisplayName gives every canonical provider a real display name (not the raw id)', () => {
    for (const id of ALL_IDS) {
      assert.notEqual(getProviderDisplayName(id), id, `${id} has no display name via provider-validator`);
    }
  });
});

/* ================================================================= *
 * GROUP 1 — Artifact freshness (design §5.1).
 * Regenerate every checked-in artifact in-memory and byte-diff against disk.
 * A stale generation OR a hand-edit of a generated file fails loud here — this
 * is the pure-test gate wired into `npm test` (no tree mutation), and it retires
 * the former elevenlabs-catalog-parity.test.js.
 * ================================================================= */
describe('group 1 — artifact freshness (byte-diff vs. generator)', () => {
  const generated = generateAll();
  for (const a of ARTIFACTS) {
    test(`${a.relPath} on disk equals a fresh generation (byte-for-byte)`, () => {
      const disk = readFileSync(path.join(ROOT, a.relPath), 'utf8');
      assert.equal(
        disk,
        generated[a.relPath],
        `${a.relPath} is STALE or hand-edited. Regenerate with:\n` +
          '  node scripts/generate-provider-catalog.mjs\n' +
          'Never edit a generated artifact by hand (it carries a DO NOT EDIT header).',
      );
    });
  }

  test('every generated artifact carries the DO NOT EDIT provenance marker', () => {
    for (const a of ARTIFACTS) {
      assert.match(
        generated[a.relPath],
        /DO NOT EDIT — generated from src\/services\/provider-catalog\.js/,
        `${a.relPath} is missing the DO NOT EDIT provenance header`,
      );
    }
  });
});

/* ================================================================= *
 * GROUP 4 — Runtime truth (design §5.4).
 * Positive: every declared runtime script exists on disk.
 * Negative: a provider ORPHANED on a platform has no `play-tts-<id>` dispatcher
 * script there (reusing the same-engine-sibling logic as group 3, so a legit
 * forwarding sibling like windows-piper's play-tts-piper.ps1 is NOT flagged —
 * only a true orphan like a would-be play-tts-elevenlabs.ps1 fails, forcing a
 * catalog flip that auto-unlocks the dispatchers).
 * ================================================================= */
describe('group 4 — runtime truth', () => {
  const hooksDir = (rel) => path.join(ROOT, '.claude/hooks', rel);
  const winHooksDir = (rel) => path.join(ROOT, '.claude/hooks-windows', rel);

  test('every declared runtime.unix / runtime.windows script exists on disk', () => {
    for (const r of listProviders()) {
      if (r.runtime.unix) {
        assert.ok(
          existsSync(hooksDir(r.runtime.unix)),
          `${r.id}: declared runtime.unix "${r.runtime.unix}" missing from .claude/hooks/`,
        );
      }
      if (r.runtime.windows) {
        assert.ok(
          existsSync(winHooksDir(r.runtime.windows)),
          `${r.id}: declared runtime.windows "${r.runtime.windows}" missing from .claude/hooks-windows/`,
        );
      }
    }
  });

  test('no play-tts-<provider>.ps1 exists for a provider orphaned on windows (flip the flag)', () => {
    for (const id of orphanedOn('windows')) {
      const f = winHooksDir(`play-tts-${id}.ps1`);
      assert.ok(
        !existsSync(f),
        `Found play-tts-${id}.ps1 but the catalog says ${id} has runtime.windows=null. ` +
          `FLIP the availability flag in src/services/provider-catalog.js (set runtime.windows) — ` +
          `that auto-unlocks every Windows dispatcher for ${id}.`,
      );
    }
  });

  test('no play-tts-<provider>.sh exists for a provider orphaned on unix (flip the flag)', () => {
    for (const id of orphanedOn('unix')) {
      const f = hooksDir(`play-tts-${id}.sh`);
      assert.ok(
        !existsSync(f),
        `Found play-tts-${id}.sh but the catalog says ${id} has runtime.unix=null. ` +
          `FLIP the availability flag in src/services/provider-catalog.js (set runtime.unix).`,
      );
    }
  });
});

/* ================================================================= *
 * GROUP 7 — Bash-3.2 lint (design §5.7).
 * The whole reason elevenlabs-voices.sh is regenerated: macOS ships bash 3.2,
 * which has NO associative arrays (`declare -A`) and NO case-modifying parameter
 * expansions (`${x,,}` / `${x^^}` / `${x^}`). Scan every generated .sh for them.
 * ================================================================= */
describe('group 7 — bash-3.2 lint (generated .sh)', () => {
  const shArtifacts = ARTIFACTS.filter((a) => a.relPath.endsWith('.sh'));
  const generated = generateAll();

  for (const a of shArtifacts) {
    test(`${a.relPath} has no declare -A`, () => {
      assert.doesNotMatch(
        generated[a.relPath],
        /declare\s+-A\b/,
        `${a.relPath} uses declare -A — breaks bash 3.2 (macOS)`,
      );
    });

    test(`${a.relPath} has no case-modifying \${x,,}/\${x^^}/\${x^} expansion`, () => {
      // Match ${name,,}, ${name^^}, ${name^}, ${name,} — case-modification operators
      // that bash 3.2 does not support. Deliberately does NOT match plain ${name}.
      assert.doesNotMatch(
        generated[a.relPath],
        /\$\{[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?(,,|\^\^|\^|,)[^}]*\}/,
        `${a.relPath} uses a case-modifying parameter expansion — breaks bash 3.2 (macOS)`,
      );
    });
  }
});

/* ================================================================= *
 * AVI-S9.6 (Phase 5) — AC7: dispatcher-drift grep guard (design §8).
 *
 * Residual risk the matrix above can't close by construction: a FUTURE file
 * under .claude/hooks*(-windows)/ could hand-roll its OWN provider-name dispatch list
 * (a bash `case ... in ... esac` or a PowerShell `@( ... )` array literal that
 * names >=2 real catalog providers) and never get added to the DISPATCHERS
 * table above — reintroducing the exact "new dispatcher never wired into the
 * matrix" hole design §8 calls out. This scans every .sh/.ps1 file under both
 * hooks trees for that shape and fails if it finds one whose file isn't
 * already declared in DISPATCHERS (or is a generated ARTIFACT, which the
 * freshness test in group 1 already guards).
 * ================================================================= */

/** Recursively list every file under `dir` (both hooks trees are flat today,
 * but this doesn't assume that). */
function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

/** Canonical provider ids named as quoted tokens inside a block of text. */
function providerTokensInBlock(text) {
  const toks = (text.match(/(['"])([^'"]+)\1/g) || []).map((s) => s.slice(1, -1));
  const canon = new Set();
  for (const t of toks) {
    const r = getProvider(t);
    if (r) canon.add(r.id);
  }
  return canon;
}

/**
 * Does `src` contain a construct that dispatches on distinct canonical
 * provider ids? Heuristic (deliberately narrow, matching the two idioms every
 * real dispatch site in this repo actually uses): a bash `case ... in ... esac`
 * block, or a PowerShell `@( ... )` array literal. Returns the LARGEST set of
 * recognised provider ids found in any single block (empty/size<2 = "not a
 * provider dispatch site" — plain case statements on non-provider tokens, e.g.
 * `enable|disable|status`, canonicalize to nothing and are ignored).
 */
function providerDispatchTokens(filePath, src) {
  const blocks = [];
  if (filePath.endsWith('.sh')) {
    const re = /case\b[^\n]*\bin([\s\S]*?)\besac\b/g;
    let m;
    while ((m = re.exec(src)) !== null) blocks.push(m[1]);
  } else if (filePath.endsWith('.ps1')) {
    const re = /@\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(src)) !== null) blocks.push(m[1]);
  }
  let best = new Set();
  for (const b of blocks) {
    const toks = providerTokensInBlock(b);
    if (toks.size > best.size) best = toks;
  }
  return best;
}

const GENERATED_ARTIFACT_PATHS = new Set(ARTIFACTS.map((a) => a.relPath));
// Files under .claude/hooks*/ the DISPATCHERS table above already declares —
// keep this in sync by construction (it reads DISPATCHERS, not a hand-copied list).
const KNOWN_DISPATCH_FILES = new Set(
  DISPATCHERS.map((d) => d.file).filter((f) => f && f.startsWith('.claude/hooks')),
);

describe('AVI-S9.6 AC7 — dispatcher-drift grep guard (design §8)', () => {
  const hooksRoots = ['.claude/hooks', '.claude/hooks-windows'];
  const scanFiles = hooksRoots
    .flatMap((r) => walkFiles(path.join(ROOT, r)))
    .filter((f) => /\.(sh|ps1)$/.test(f));

  test('no NEW file under .claude/hooks*/ dispatches on >=2 provider ids outside the DISPATCHERS table', () => {
    const violations = [];
    for (const f of scanFiles) {
      const rel = path.relative(ROOT, f).replace(/\\/g, '/');
      if (GENERATED_ARTIFACT_PATHS.has(rel)) continue; // generated — freshness-tested in group 1
      const src = readFileSync(f, 'utf8');
      const toks = providerDispatchTokens(f, src);
      if (toks.size >= 2 && !KNOWN_DISPATCH_FILES.has(rel)) {
        violations.push(`${rel} (tokens: ${[...toks].sort().join(', ')})`);
      }
    }
    assert.deepEqual(
      violations,
      [],
      `New provider-name dispatch site(s) found outside the DISPATCHERS table: ${violations.join('; ')}. ` +
        'Add an entry (with a "file") to the DISPATCHERS table in this file, or replace the ad-hoc list with ' +
        'catalog_providers_for_platform / getProvider() so it no longer hand-rolls provider inventory.',
    );
  });

  test('non-vacuous proof: the same scan DOES flag a decoy dispatch list (temp fixture, deleted immediately)', () => {
    const decoyPath = path.join(ROOT, '.claude/hooks/_avi-s96-ac7-decoy-dispatcher.sh');
    const decoySrc = [
      '#!/usr/bin/env bash',
      '# Decoy fixture for AVI-S9.6 AC7 non-vacuous proof — deleted immediately after use.',
      'case "$PROVIDER" in',
      '  "kokoro") echo "kokoro" ;;',
      '  "piper") echo "piper" ;;',
      'esac',
      '',
    ].join('\n');
    writeFileSync(decoyPath, decoySrc);
    try {
      const rel = path.relative(ROOT, decoyPath).replace(/\\/g, '/');
      const toks = providerDispatchTokens(decoyPath, decoySrc);
      assert.ok(toks.size >= 2, 'decoy fixture was not recognised as a provider dispatch site — detector is broken');
      assert.ok(
        !GENERATED_ARTIFACT_PATHS.has(rel) && !KNOWN_DISPATCH_FILES.has(rel),
        'decoy fixture unexpectedly already known/excluded (test setup bug)',
      );
      // This is exactly the condition the "no NEW file ..." test above fails on
      // for any real file — proving the guard is non-vacuous (it CAN fail).
    } finally {
      rmSync(decoyPath, { force: true });
    }
  });
});
