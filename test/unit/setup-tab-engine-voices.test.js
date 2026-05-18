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
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 3000);
    assert.ok(
      fnBody.includes('NATIVE_ENGINE_VOICES[draft.ttsEngine]'),
      'Guard must check NATIVE_ENGINE_VOICES[draft.ttsEngine]'
    );
  });

  test('guard path does not call scanInstalledVoices', () => {
    // The early-return block for native engines ends before _refreshVP/_allVoices
    const fnIdx = setupSrc.indexOf('function _openVoicePickerForLlm');
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 3000);
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
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 3000);
    assert.ok(
      fnBody.includes('draft.voice = nativeVoice.id'),
      'draft.voice must be set to nativeVoice.id in the guard block'
    );
  });
});

// ── Suite 3: Engine picker clears draft.voice ─────────────────────────────────

describe('_openTtsEnginePicker clears draft.voice on selection', () => {
  test('enter handler sets draft.voice to empty string', () => {
    const fnIdx = setupSrc.indexOf('function _openTtsEnginePicker');
    assert.ok(fnIdx >= 0, '_openTtsEnginePicker must exist');
    const fnBody = setupSrc.slice(fnIdx, fnIdx + 1500);
    assert.ok(
      fnBody.includes("draft.voice = ''"),
      "Engine picker enter handler must set draft.voice = ''"
    );
  });
});

// ── Suite 4: _buildFields voice getValue uses label ───────────────────────────

describe('_buildFields voice getValue shows native engine label', () => {
  test('voice getValue uses NATIVE_ENGINE_VOICES label lookup', () => {
    const occurrences = (setupSrc.match(/NATIVE_ENGINE_VOICES\[draft\.voice\]/g) || []).length;
    assert.ok(
      occurrences >= 2,
      `Both _buildFields instances must use NATIVE_ENGINE_VOICES[draft.voice] — found ${occurrences}`
    );
  });

  test('voice getValue falls back to draft.voice when not a native engine', () => {
    // Pattern: NATIVE_ENGINE_VOICES[draft.voice]?.label ?? (draft.voice || ...)
    const count = (setupSrc.match(/NATIVE_ENGINE_VOICES\[draft\.voice\]\?\.label \?\?/g) || []).length;
    assert.ok(
      count >= 2,
      `Both _buildFields must use null-coalescing fallback — found ${count}`
    );
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
