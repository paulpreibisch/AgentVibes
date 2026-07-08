/**
 * Provider dispatcher parity — the class-of-bug guard (AVI-S8.1).
 *
 * `src/utils/provider-validator.js` is the canonical provider layer. Several
 * user-facing dispatchers each hard-code their OWN provider list instead of
 * deferring to it, and have silently omitted cross-platform providers (kokoro,
 * elevenlabs) — producing "Invalid provider" hard-fails, "Unknown provider"
 * exits, empty voice lists, and silent degradation to Piper.
 *
 * This test treats the canonical layer's CROSS_PLATFORM_PROVIDERS as the
 * invariant and asserts every dispatcher recognises them. It is intentionally
 * text-based: it parses each dispatcher's provider construct so a future
 * dispatcher that forgets a provider fails here, not in the field.
 *
 * @module test/unit/provider-dispatcher-parity
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  SUPPORTED_PROVIDERS,
  CROSS_PLATFORM_PROVIDERS,
  isKnownProvider,
  getProviderDisplayName,
} from '../../src/utils/provider-validator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// --- Extractors: pull the provider tokens each dispatcher actually recognises ---

/** All `valid_providers = [ ... ]` list literals in server.py (one per platform branch). */
function serverAllowlists(src) {
  const lists = [];
  const re = /valid_providers\s*=\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const items = (m[1].match(/["']([^"']+)["']/g) || []).map((s) => s.replace(/["']/g, ''));
    lists.push(items);
  }
  return lists;
}

/** The `$ValidProviders = @( ... )` array literal in provider-manager.ps1. */
function ps1ValidProviders(src) {
  const m = src.match(/\$ValidProviders\s*=\s*@\(([^)]*)\)/);
  if (!m) return [];
  return (m[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''));
}

/** Provider ids handled by explicit `provider === '...'` branches in list-voices.js. */
function listVoicesProviders(src) {
  return (src.match(/provider\s*===\s*'([^']+)'/g) || []).map(
    (s) => s.replace(/.*'([^']+)'.*/, '$1'),
  );
}

/** Provider ids handled by explicit `ACTIVE_PROVIDER == "..."` arms in voice-manager.sh. */
function voiceManagerProviders(src) {
  return (src.match(/ACTIVE_PROVIDER"?\s*==\s*"([^"]+)"/g) || []).map(
    (s) => s.replace(/.*"([^"]+)"$/, '$1'),
  );
}

describe('canonical provider layer', () => {
  test('exposes a non-empty frozen SUPPORTED_PROVIDERS set', () => {
    assert.ok(Array.isArray(SUPPORTED_PROVIDERS) && SUPPORTED_PROVIDERS.length > 0);
    assert.ok(Object.isFrozen(SUPPORTED_PROVIDERS));
  });

  test('cross-platform providers are a subset of SUPPORTED_PROVIDERS', () => {
    for (const p of CROSS_PLATFORM_PROVIDERS) {
      assert.ok(SUPPORTED_PROVIDERS.includes(p), `${p} missing from SUPPORTED_PROVIDERS`);
    }
  });

  test('isKnownProvider recognises kokoro & elevenlabs, rejects garbage', () => {
    assert.equal(isKnownProvider('kokoro'), true);
    assert.equal(isKnownProvider('elevenlabs'), true);
    assert.equal(isKnownProvider('KOKORO'), true); // case-insensitive
    assert.equal(isKnownProvider('nope'), false);
  });

  test('every canonical provider has a real display name (not the raw id)', () => {
    for (const p of ['kokoro', 'elevenlabs']) {
      const name = getProviderDisplayName(p);
      assert.notEqual(name, p, `${p} has no display name in provider-validator`);
    }
  });
});

// Each dispatcher declares which canonical providers it MUST recognise.
// kokoro/elevenlabs are cross-platform ⇒ required in the cross-platform dispatchers.
// The Windows provider manager and the bash voice-lookup are scoped to kokoro
// for this story (elevenlabs voice enumeration on those paths is AVI-S8.2).
const DISPATCHERS = [
  {
    name: 'mcp-server/server.py set_provider allowlists',
    required: CROSS_PLATFORM_PROVIDERS,
    tokens: () => {
      const lists = serverAllowlists(read('mcp-server/server.py'));
      assert.ok(lists.length >= 2, 'expected both platform allowlists in server.py');
      // A provider is "recognised" only if it appears in EVERY allowlist
      // (cross-platform ⇒ present on both Windows and non-Windows branches).
      return lists.reduce((acc, list) => acc.filter((p) => list.includes(p)), lists[0]);
    },
  },
  {
    name: 'src/cli/list-voices.js provider branches',
    required: CROSS_PLATFORM_PROVIDERS,
    tokens: () => listVoicesProviders(read('src/cli/list-voices.js')),
  },
  {
    name: '.claude/hooks-windows/provider-manager.ps1 $ValidProviders',
    required: ['kokoro'],
    tokens: () => ps1ValidProviders(read('.claude/hooks-windows/provider-manager.ps1')),
  },
  {
    name: '.claude/hooks/voice-manager.sh voice-lookup arms',
    required: ['kokoro'],
    tokens: () => voiceManagerProviders(read('.claude/hooks/voice-manager.sh')),
  },
];

describe('every dispatcher recognises its required canonical providers', () => {
  for (const d of DISPATCHERS) {
    for (const provider of d.required) {
      test(`${d.name} recognises "${provider}"`, () => {
        const recognised = d.tokens();
        assert.ok(
          recognised.includes(provider),
          `${d.name} is missing "${provider}". Recognised: [${recognised.join(', ')}]. ` +
            `Add an arm/entry for it (canonical layer supports it — see SUPPORTED_PROVIDERS).`,
        );
      });
    }
  }
});
