/**
 * AVI-S5.2: Engine-correct Space bar preview in voice picker
 *
 * Tests (source-scan):
 * 1. _previewNativeVoice spawns soprano-tts for soprano engine
 * 2. _previewNativeVoice spawns powershell + System.Speech for sapi engine
 * 3. _previewNativeVoice spawns say for macos-say engine
 * 4. Toggle: second Space press kills the running preview proc
 * 5. Error path sets picker label (not crash) when engine binary missing
 * 6. nvPicker space key calls _previewNativeVoice (not immediate select/close)
 * 7. nvPicker enter key calls _closeNV (select and close)
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

// Extract the native-engine guard block for targeted assertions
function getNativeGuardBlock(src) {
  const start = src.indexOf('const nativeVoice = NATIVE_ENGINE_VOICES[draft.ttsEngine]');
  assert.ok(start >= 0, 'native guard block must exist');
  // Grab a generous slice covering the entire block
  return src.slice(start, start + 5000);
}

// Extract _previewNativeVoice function body
function getPreviewNativeFnBody(src) {
  const fnIdx = src.indexOf('function _previewNativeVoice()');
  assert.ok(fnIdx >= 0, '_previewNativeVoice function must be defined');
  let depth = 0, i = fnIdx;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  return src.slice(fnIdx, i + 1);
}

describe('_previewNativeVoice spawn routing', () => {
  test('soprano engine spawns soprano-tts binary (non-Windows)', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes("spawn('soprano-tts'"),
      "soprano engine must spawn 'soprano-tts' on non-Windows"
    );
  });

  test('soprano engine on win32 routes through play-tts-soprano.ps1', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes("play-tts-soprano.ps1"),
      "soprano engine on win32 must route through play-tts-soprano.ps1"
    );
    assert.ok(
      body.includes("process.platform === 'win32'"),
      "soprano must have win32 platform guard"
    );
  });

  test('sapi engine spawns powershell', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes("spawn('powershell'"),
      "sapi engine must spawn 'powershell'"
    );
  });

  test('sapi engine script includes System.Speech', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes('System.Speech'),
      'sapi script must include System.Speech assembly reference'
    );
  });

  test('sapi engine script uses SpeechSynthesizer', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes('SpeechSynthesizer'),
      'sapi script must use System.Speech.Synthesis.SpeechSynthesizer'
    );
  });

  test('macos-say engine spawns say binary', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes("spawn('say'"),
      "macos-say engine must spawn 'say'"
    );
  });

  test('preview phrase contains engine label reference', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes('nativeVoice.label'),
      'preview phrase must reference nativeVoice.label for personalised message'
    );
  });
});

describe('_previewNativeVoice toggle and error handling', () => {
  test('second Space press kills the running preview proc', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    // Toggle: if _nvPreviewProc exists, kill it and return
    assert.ok(
      body.includes('_killNvPreview()'),
      'pressing Space again must call _killNvPreview() to stop the running preview'
    );
    assert.ok(
      body.includes('_nvPreviewProc'),
      '_previewNativeVoice must track proc in _nvPreviewProc for toggle support'
    );
  });

  test('_killNvPreview kills proc and nulls _nvPreviewProc', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    const killIdx = guardBlock.indexOf('function _killNvPreview()');
    assert.ok(killIdx >= 0, '_killNvPreview must be defined');
    const killBody = guardBlock.slice(killIdx, killIdx + 200);
    assert.ok(
      killBody.includes('_nvPreviewProc.kill()'),
      '_killNvPreview must call .kill() on the preview proc'
    );
    assert.ok(
      killBody.includes('_nvPreviewProc = null'),
      '_killNvPreview must null _nvPreviewProc after killing'
    );
  });

  test('error path updates picker label instead of crashing', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes('Engine not installed'),
      'error handler must show "Engine not installed" in picker label'
    );
    assert.ok(
      body.includes("proc.on('error'"),
      'must attach an error handler to the spawned process'
    );
  });

  test('exit handler clears picker label and nulls proc', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes("proc.on('exit'"),
      'must attach an exit handler to clear preview state'
    );
    assert.ok(
      body.includes('_nvPreviewProc = null'),
      'exit handler must null _nvPreviewProc'
    );
  });

  test('_closeNV kills preview proc before closing', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    const closeIdx = guardBlock.indexOf('function _closeNV()');
    assert.ok(closeIdx >= 0, '_closeNV must be defined');
    const closeBody = guardBlock.slice(closeIdx, closeIdx + 200);
    assert.ok(
      closeBody.includes('_killNvPreview()'),
      '_closeNV must call _killNvPreview() to stop any running preview on close'
    );
  });
});

describe('nvPicker key bindings', () => {
  test('Space key calls _previewNativeVoice (not _closeNV)', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    // Space key must call _previewNativeVoice
    const spaceBinding = guardBlock.match(/nvPicker\.key\(\[['"]space['"]\][^)]+\)/);
    assert.ok(spaceBinding, "nvPicker must bind ['space'] key");
    assert.ok(
      spaceBinding[0].includes('_previewNativeVoice'),
      "Space key must call _previewNativeVoice, not _closeNV"
    );
  });

  test('Enter key calls _closeNV to select and close', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    const enterIdx = guardBlock.indexOf("nvPicker.key(['enter']");
    assert.ok(enterIdx >= 0, "nvPicker must bind ['enter'] key");
    const enterSnippet = guardBlock.slice(enterIdx, enterIdx + 200);
    assert.ok(
      enterSnippet.includes('_closeNV'),
      "Enter key handler must call _closeNV to select and close"
    );
  });

  test('Enter key sets draft.voice before closing', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    const enterIdx = guardBlock.indexOf("nvPicker.key(['enter']");
    assert.ok(enterIdx >= 0, "nvPicker must bind ['enter'] key");
    const enterSnippet = guardBlock.slice(enterIdx, enterIdx + 200);
    assert.ok(
      enterSnippet.includes('draft.voice'),
      "Enter key handler must set draft.voice before calling _closeNV"
    );
  });
});

describe('Piper picker space bar regression guard', () => {
  test('_previewVoice still exists for Piper voices', () => {
    const fnIdx = setupSrc.indexOf('function _previewVoice(');
    assert.ok(fnIdx >= 0, '_previewVoice must exist for Piper voice picker');
  });

  test('_previewVoice spawns piper binary for Piper voices', () => {
    const fnIdx = setupSrc.indexOf('function _previewVoice(');
    let depth = 0, i = fnIdx;
    while (i < setupSrc.length) {
      if (setupSrc[i] === '{') depth++;
      else if (setupSrc[i] === '}') { depth--; if (depth === 0) break; }
      i++;
    }
    const fnBody = setupSrc.slice(fnIdx, i + 1);
    assert.ok(
      fnBody.includes('_piperBin') || fnBody.includes("spawn('piper'") || fnBody.includes('piper.exe'),
      '_previewVoice must still spawn piper binary for Piper voices (regression guard)'
    );
  });

  test('vpList space key handler calls _previewVoice', () => {
    const src = setupSrc;
    // The Piper picker's space key handler
    const vpListSpaceIdx = src.indexOf("vpList.key(['space']");
    assert.ok(vpListSpaceIdx >= 0, "vpList must bind ['space'] key for Piper preview");
    const snippet = src.slice(vpListSpaceIdx, vpListSpaceIdx + 200);
    assert.ok(
      snippet.includes('_previewVoice'),
      "vpList space handler must call _previewVoice for Piper voices"
    );
  });
});

describe('nvPicker shows exactly 1 item for native engines', () => {
  test('nvPicker.setItems call exists in native guard block', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    const setItemsIdx = guardBlock.indexOf('nvPicker.setItems([');
    assert.ok(setItemsIdx >= 0, 'nvPicker.setItems must be called in the native engine guard');
  });

  test('nvPicker.setItems has a single entry (no second comma-separated element)', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    const setItemsIdx = guardBlock.indexOf('nvPicker.setItems([');
    assert.ok(setItemsIdx >= 0, 'nvPicker.setItems must be called');
    // Find the closing ]) of the setItems call to bound the search
    const afterOpen = guardBlock.indexOf('[', setItemsIdx + 'nvPicker.setItems('.length);
    const closeIdx = guardBlock.indexOf('])', afterOpen);
    const arrayContent = guardBlock.slice(afterOpen + 1, closeIdx);
    // A second array item would be a backtick or quote after a comma: `, \`` or `, '`
    assert.ok(
      !arrayContent.includes('`,') && !arrayContent.includes("',"),
      'nvPicker.setItems must contain exactly 1 item (no trailing comma + second element found)'
    );
  });
});
