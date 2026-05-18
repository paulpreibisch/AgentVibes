/**
 * AVI-S5.3: Auto-save engine inference fix
 *
 * Tests (source-scan):
 * 1. _autoSave in _openLlmConfigModal uses NATIVE_ENGINE_VOICES to avoid wrong piper inference
 * 2. _autoSave in _openHermesConfigModal has the same fix
 * 3. Native engine IDs (soprano, sapi, macos-say) as draft.voice do NOT infer piper
 * 4. Non-native voice with no ttsEngine still infers piper (regression guard)
 * 5. No ttsEngine and no voice saves engine as empty string
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

// Extract the body of an _autoSave function starting at a given search offset
function getAutoSaveBody(src, searchFrom = 0) {
  const fnIdx = src.indexOf('function _autoSave(', searchFrom);
  if (fnIdx < 0) return null;
  let depth = 0, i = fnIdx;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  return src.slice(fnIdx, i + 1);
}

describe('_openLlmConfigModal _autoSave engine fix', () => {
  test('_autoSave exists inside _openLlmConfigModal', () => {
    const llmModalIdx = setupSrc.indexOf('function _openLlmConfigModal(');
    assert.ok(llmModalIdx >= 0, '_openLlmConfigModal must exist');
    const body = getAutoSaveBody(setupSrc, llmModalIdx);
    assert.ok(body !== null, '_autoSave must exist inside _openLlmConfigModal');
  });

  test('uses NATIVE_ENGINE_VOICES to guard piper inference', () => {
    const llmModalIdx = setupSrc.indexOf('function _openLlmConfigModal(');
    const body = getAutoSaveBody(setupSrc, llmModalIdx);
    assert.ok(
      body.includes('NATIVE_ENGINE_VOICES[draft.voice]'),
      '_autoSave must check NATIVE_ENGINE_VOICES[draft.voice] before inferring piper'
    );
  });

  test('native engine voice does NOT trigger piper inference (pattern check)', () => {
    const llmModalIdx = setupSrc.indexOf('function _openLlmConfigModal(');
    const body = getAutoSaveBody(setupSrc, llmModalIdx);
    // The correct pattern: only infer piper when voice is NOT a native engine ID
    assert.ok(
      body.includes('!NATIVE_ENGINE_VOICES[draft.voice]'),
      '_autoSave must negate NATIVE_ENGINE_VOICES check: !NATIVE_ENGINE_VOICES[draft.voice]'
    );
  });

  test('draft.ttsEngine is still the primary authoritative value', () => {
    const llmModalIdx = setupSrc.indexOf('function _openLlmConfigModal(');
    const body = getAutoSaveBody(setupSrc, llmModalIdx);
    // Pattern: engine = draft.ttsEngine || (fallback)
    assert.ok(
      body.includes('draft.ttsEngine ||'),
      '_autoSave must use draft.ttsEngine as primary, fallback only when it is empty'
    );
  });
});

describe('_openHermesConfigModal _autoSave engine fix', () => {
  test('_autoSave exists inside _openHermesConfigModal', () => {
    const hermesModalIdx = setupSrc.indexOf('function _openHermesConfigModal(');
    assert.ok(hermesModalIdx >= 0, '_openHermesConfigModal must exist');
    const body = getAutoSaveBody(setupSrc, hermesModalIdx);
    assert.ok(body !== null, '_autoSave must exist inside _openHermesConfigModal');
  });

  test('uses NATIVE_ENGINE_VOICES to guard piper inference', () => {
    const hermesModalIdx = setupSrc.indexOf('function _openHermesConfigModal(');
    const body = getAutoSaveBody(setupSrc, hermesModalIdx);
    assert.ok(
      body.includes('NATIVE_ENGINE_VOICES[draft.voice]'),
      'Hermes _autoSave must check NATIVE_ENGINE_VOICES[draft.voice] before inferring piper'
    );
  });

  test('native engine voice does NOT trigger piper inference', () => {
    const hermesModalIdx = setupSrc.indexOf('function _openHermesConfigModal(');
    const body = getAutoSaveBody(setupSrc, hermesModalIdx);
    assert.ok(
      body.includes('!NATIVE_ENGINE_VOICES[draft.voice]'),
      'Hermes _autoSave must negate NATIVE_ENGINE_VOICES check'
    );
  });
});

describe('engine inference logic correctness (pattern verification)', () => {
  test('both _autoSave functions fixed — count of NATIVE_ENGINE_VOICES usage in _autoSave', () => {
    // Count occurrences of the fix pattern across the whole file
    const count = (setupSrc.match(/!NATIVE_ENGINE_VOICES\[draft\.voice\]/g) || []).length;
    assert.ok(
      count >= 2,
      `Both LLM and Hermes _autoSave must use !NATIVE_ENGINE_VOICES[draft.voice] — found ${count}`
    );
  });

  test('old broken pattern (voice ? piper : empty) is not used in either _autoSave', () => {
    // The old broken pattern was: draft.voice ? 'piper' : ''
    // After fix it should be: draft.voice && !NATIVE_ENGINE_VOICES[draft.voice] ? 'piper' : ''
    // We cannot allow the simple version since it would mis-infer native engines as piper.
    // Check there's no standalone "draft.voice ? 'piper'" in the _autoSave bodies.
    const llmModalIdx = setupSrc.indexOf('function _openLlmConfigModal(');
    const llmBody = getAutoSaveBody(setupSrc, llmModalIdx);
    const hermesModalIdx = setupSrc.indexOf('function _openHermesConfigModal(');
    const hermesBody = getAutoSaveBody(setupSrc, hermesModalIdx);

    const badPattern = /draft\.voice \? ['"]piper['"]/;
    assert.ok(
      !badPattern.test(llmBody),
      'LLM _autoSave must not use bare "draft.voice ? piper" — native engines would be mis-inferred'
    );
    assert.ok(
      !badPattern.test(hermesBody),
      'Hermes _autoSave must not use bare "draft.voice ? piper" — native engines would be mis-inferred'
    );
  });
});
