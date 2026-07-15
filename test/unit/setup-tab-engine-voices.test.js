/**
 * AVI-S5.1: Engine-aware voice picker in LLM config modal
 *
 * Tests:
 * 1. NATIVE_ENGINE_VOICES constant is defined with correct entries
 * 2. _openVoicePickerForLlm has the native-engine guard
 * 3. _openTtsEnginePicker clears draft.voice on engine change
 * 4. Both _buildFields voice getValue use NATIVE_ENGINE_VOICES label
 * 5. tts-engine-service platform filtering (getAvailableEngines)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

const setupSrc = readFileSync(
  resolve(PROJECT_ROOT, 'src/console/tabs/setup-tab.js'), 'utf8'
);
const catalogSrc = readFileSync(
  resolve(PROJECT_ROOT, 'src/services/provider-voice-catalog.js'), 'utf8'
);
// SSOT Layer 2 (AVI-E09): the raw voice lists now live in provider-catalog.js;
// provider-voice-catalog.js is a re-export shim. Read both so drift is asserted
// at the layer that actually holds the definition.
const providerCatalogSrc = readFileSync(
  resolve(PROJECT_ROOT, 'src/services/provider-catalog.js'), 'utf8'
);

// ── Suite 1: NATIVE_ENGINE_VOICES constant ────────────────────────────────────

describe('NATIVE_ENGINE_VOICES constant', () => {
  test('is defined at module scope in setup-tab.js', () => {
    assert.ok(
      setupSrc.includes('const NATIVE_ENGINE_VOICES'),
      'NATIVE_ENGINE_VOICES constant must be defined'
    );
  });

  test('contains soprano entry with correct id', () => {
    assert.ok(
      setupSrc.includes("soprano:") && setupSrc.includes("id: 'soprano'"),
      "soprano entry with id: 'soprano' must be present"
    );
  });

  test('contains sapi entry with correct id', () => {
    assert.ok(
      setupSrc.includes("sapi:") && setupSrc.includes("id: 'sapi'"),
      "sapi entry with id: 'sapi' must be present"
    );
  });

  test("contains macos-say entry with correct id", () => {
    assert.ok(
      setupSrc.includes("'macos-say'") && setupSrc.includes("id: 'macos-say'"),
      "macos-say entry with id: 'macos-say' must be present"
    );
  });

  test('contains label strings for all three native engines', () => {
    assert.ok(setupSrc.includes("label: 'Soprano'"),      "Soprano label missing");
    assert.ok(setupSrc.includes("label: 'Windows SAPI'"), "Windows SAPI label missing");
    assert.ok(setupSrc.includes("label: 'macOS Say'"),    "macOS Say label missing");
  });
});

// ── Suite 2: Voice picker guard ───────────────────────────────────────────────

describe('_openVoicePickerForLlm native-engine guard', () => {
  test('checks NATIVE_ENGINE_VOICES for draft.ttsEngine before Piper path', () => {
    const fnIdx = setupSrc.indexOf('function _openVoicePickerForLlm');
    assert.ok(fnIdx >= 0, '_openVoicePickerForLlm must exist');
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 4000);
    assert.ok(
      fnBody.includes('NATIVE_ENGINE_VOICES[draft.ttsEngine]'),
      'Guard must check NATIVE_ENGINE_VOICES[draft.ttsEngine]'
    );
  });

  test('guard path does not call scanInstalledVoices', () => {
    // The early-return block for native engines ends before _refreshVP/_allVoices
    const fnIdx = setupSrc.indexOf('function _openVoicePickerForLlm');
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 4000);
    // Guard block ends with 'return;' before scanInstalledVoices is reached
    const guardStart = fnBody.indexOf('NATIVE_ENGINE_VOICES[draft.ttsEngine]');
    const guardEnd   = fnBody.indexOf('return;', guardStart);
    assert.ok(guardStart >= 0 && guardEnd >= 0, 'Guard block with return must exist');
    const guardBlock = fnBody.slice(guardStart, guardEnd);
    assert.ok(
      !guardBlock.includes('scanInstalledVoices'),
      'scanInstalledVoices must not appear in the native-engine guard block'
    );
  });

  test('native picker sets draft.voice to nativeVoice.id on Enter', () => {
    const fnIdx = setupSrc.indexOf('function _openVoicePickerForLlm');
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 4000);
    assert.ok(
      fnBody.includes('draft.voice = nativeVoice.id'),
      'draft.voice must be set to nativeVoice.id in the guard block'
    );
  });
});

// ── Suite 3: Engine picker auto-sets draft.voice on engine change ─────────────

describe('_openTtsEnginePicker auto-sets draft.voice on engine change', () => {
  test('enter handler assigns draft.voice from NATIVE_ENGINE_VOICES or empty', () => {
    const fnIdx = setupSrc.indexOf('function _openTtsEnginePicker');
    assert.ok(fnIdx >= 0, '_openTtsEnginePicker must exist');
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 4000);
    // New pattern: NATIVE_ENGINE_VOICES[selectedEngine]?.id || ''
    assert.ok(
      fnBody.includes('NATIVE_ENGINE_VOICES[selectedEngine]'),
      "Engine picker enter handler must set draft.voice from NATIVE_ENGINE_VOICES for native engines"
    );
  });

  test('enter handler falls back to empty string for non-native engines', () => {
    const fnIdx = setupSrc.indexOf('function _openTtsEnginePicker');
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 4000);
    assert.ok(
      fnBody.includes("?.id || ''"),
      "Engine picker must fall back to empty string when engine is not a native engine"
    );
  });
});

// ── Suite 4: _buildFields voice getValue uses label ───────────────────────────

describe('_buildFields voice getValue shows native engine label', () => {
  test('both voice getValue instances delegate to formatVoiceLabel', () => {
    const occurrences = (setupSrc.match(/formatVoiceLabel\(draft\.voice, globalVoice\)/g) || []).length;
    assert.ok(
      occurrences >= 2,
      `Both _buildFields instances must use formatVoiceLabel(draft.voice, globalVoice) — found ${occurrences}`
    );
  });

  test('formatVoiceLabel does native-engine label lookup with fallback', () => {
    // formatVoiceLabel must look up NATIVE_ENGINE_VOICES, then ElevenLabs name,
    // then fall back to the raw voice / global default.
    const fn = setupSrc.slice(setupSrc.indexOf('function formatVoiceLabel'));
    assert.ok(fn.includes('NATIVE_ENGINE_VOICES[voice]'), 'must look up NATIVE_ENGINE_VOICES label');
    assert.ok(fn.includes('elevenLabsVoiceName(voice)'), 'must map ElevenLabs voice IDs to a name');
    assert.ok(fn.includes('global: ${globalVoice}'), 'must fall back to the global default');
  });

  test('ElevenLabs voices are a static built-in list with raw IDs (in the shared catalog)', () => {
    // SSOT layering (AVI-E09): the raw list lives in provider-catalog.js;
    // provider-voice-catalog.js re-exports it; setup-tab imports from the shim.
    // No layer holds a duplicate, so none can drift.
    assert.ok(setupSrc.includes("from '../../services/provider-voice-catalog.js'"),
      'setup-tab must import the shared voice catalog');
    assert.ok(setupSrc.includes('ELEVENLABS_VOICES'), 'setup-tab must reference ELEVENLABS_VOICES');
    assert.ok(setupSrc.includes('ELEVENLABS_DEFAULT_VOICE_ID'), 'a default voice ID must be defined');
    assert.ok(catalogSrc.includes('ELEVENLABS_VOICES'),
      'provider-voice-catalog shim must re-export ELEVENLABS_VOICES');
    assert.ok(providerCatalogSrc.includes('ELEVENLABS_VOICES'),
      'provider-catalog (SSOT) must define ELEVENLABS_VOICES');
    // Sanity: at least ~20 premade voices listed in the SSOT catalog
    const ids = (providerCatalogSrc.match(/id: '[A-Za-z0-9]{20}'/g) || []).length;
    assert.ok(ids >= 20, `expected >=20 ElevenLabs voice IDs, found ${ids}`);
  });
});

// ── Suite 5: tts-engine-service platform filtering ────────────────────────────

describe('getAvailableEngines() platform filtering', () => {
  const origPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

  function setPlatform(p) {
    Object.defineProperty(process, 'platform', { value: p, configurable: true });
  }

  function restorePlatform() {
    if (origPlatform) Object.defineProperty(process, 'platform', origPlatform);
  }

  test('returns sapi on win32 only', async () => {
    setPlatform('win32');
    try {
      const { getAvailableEngines } = await import(
        `../../src/services/tts-engine-service.js?bust=${Date.now()}`
      );
      const ids = getAvailableEngines().map(e => e.id);
      assert.ok(ids.includes('sapi'),      'sapi must be available on win32');
      assert.ok(!ids.includes('macos-say'),'macos-say must not be available on win32');
    } finally { restorePlatform(); }
  });

  test('returns macos-say on darwin only', async () => {
    setPlatform('darwin');
    try {
      const { getAvailableEngines } = await import(
        `../../src/services/tts-engine-service.js?bust=${Date.now()}`
      );
      const ids = getAvailableEngines().map(e => e.id);
      assert.ok(ids.includes('macos-say'), 'macos-say must be available on darwin');
      assert.ok(!ids.includes('sapi'),     'sapi must not be available on darwin');
    } finally { restorePlatform(); }
  });

  test('returns soprano and piper on all platforms', async () => {
    for (const plat of ['win32', 'darwin', 'linux']) {
      setPlatform(plat);
      try {
        const { getAvailableEngines } = await import(
          `../../src/services/tts-engine-service.js?bust=${Date.now()}`
        );
        const ids = getAvailableEngines().map(e => e.id);
        assert.ok(ids.includes('soprano'), `soprano must be available on ${plat}`);
        assert.ok(ids.includes('piper'),   `piper must be available on ${plat}`);
      } finally { restorePlatform(); }
    }
  });

  test('neither sapi nor macos-say available on linux', async () => {
    setPlatform('linux');
    try {
      const { getAvailableEngines } = await import(
        `../../src/services/tts-engine-service.js?bust=${Date.now()}`
      );
      const ids = getAvailableEngines().map(e => e.id);
      assert.ok(!ids.includes('sapi'),      'sapi must not be available on linux');
      assert.ok(!ids.includes('macos-say'), 'macos-say must not be available on linux');
    } finally { restorePlatform(); }
  });
});
