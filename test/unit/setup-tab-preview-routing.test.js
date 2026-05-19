/**
 * AVI-S5.2: Engine-correct Space bar preview in voice picker
 * Adversarial review: soprano reliability and crash-prevention fixes
 *
 * Tests (source-scan):
 * 1. _previewNativeVoice spawns soprano binary (non-Windows)
 * 2. _previewNativeVoice spawns powershell + System.Speech for sapi engine
 * 3. _previewNativeVoice spawns say for macos-say engine
 * 4. Toggle: second Space press kills the running preview proc
 * 5. Error path sets picker label (not crash) when engine binary missing
 * 6. nvPicker space key calls _previewNativeVoice (not immediate select/close)
 * 7. nvPicker enter key calls _closeNV (select and close)
 * 8. _checkSopranoPort absorbs late errors after destroy()
 * 9. _ensureSopranoWebUI: AbortController, .catch(), cooldown, WSL guard
 * 10. _spawnAndTrack: spawn-throw error label + non-zero exit code label
 * 11. play-tts-soprano.ps1 PATH preservation
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
  // Grab a generous slice covering the entire block (key bindings follow _previewNativeVoice)
  return src.slice(start, start + 10000);
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
  test('soprano engine spawns soprano binary (non-Windows)', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    assert.ok(
      body.includes("spawn('soprano'"),
      "soprano engine must spawn 'soprano' on non-Windows (not the defunct 'soprano-tts' name)"
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

// ---------------------------------------------------------------------------
// Adversarial review fix: _checkSopranoPort crash prevention (Issue #2)

function getCheckSopranoPortBody(src) {
  const fnIdx = src.indexOf('function _checkSopranoPort(');
  assert.ok(fnIdx >= 0, '_checkSopranoPort must be defined');
  let depth = 0, i = fnIdx;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  return src.slice(fnIdx, i + 1);
}

function getEnsureWebUIBody(src) {
  const fnIdx = src.indexOf('async function _ensureSopranoWebUI(');
  assert.ok(fnIdx >= 0, '_ensureSopranoWebUI must be defined');
  let depth = 0, i = fnIdx;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  return src.slice(fnIdx, i + 1);
}

describe('_checkSopranoPort crash prevention', () => {
  test('has permanent error absorber to swallow late destroy() errors', () => {
    const body = getCheckSopranoPortBody(setupSrc);
    // socket.on (permanent) must exist alongside socket.once (single-fire)
    assert.ok(
      body.includes("socket.on('error'"),
      "_checkSopranoPort must add a permanent 'error' absorber so late errors after destroy() don't crash Node.js"
    );
  });

  test('has timeout handler that calls destroy()', () => {
    const body = getCheckSopranoPortBody(setupSrc);
    assert.ok(
      body.includes("socket.once('timeout'"),
      '_checkSopranoPort must handle the timeout event'
    );
    assert.ok(
      body.includes('socket.destroy()'),
      'timeout handler must destroy the socket'
    );
  });
});

// ---------------------------------------------------------------------------
// Adversarial review fixes: _ensureSopranoWebUI reliability (Issues #3 #4 #9)

describe('_ensureSopranoWebUI reliability', () => {
  test('accepts signal parameter and checks signal.aborted in loop', () => {
    const body = getEnsureWebUIBody(setupSrc);
    assert.ok(
      body.includes('signal'),
      '_ensureSopranoWebUI must accept a signal parameter for AbortController support'
    );
    assert.ok(
      body.includes('signal?.aborted'),
      '_ensureSopranoWebUI must check signal.aborted so the polling loop can be cancelled'
    );
  });

  test('uses spawn cooldown timestamp to prevent duplicate soprano-webui processes', () => {
    assert.ok(
      setupSrc.includes('_sopranoSpawnedAt'),
      '_ensureSopranoWebUI must track last-spawn timestamp to prevent duplicate soprano-webui processes'
    );
    const body = getEnsureWebUIBody(setupSrc);
    assert.ok(
      body.includes('_sopranoSpawnedAt'),
      '_sopranoSpawnedAt must be checked inside _ensureSopranoWebUI before spawning'
    );
  });

  test('all call sites have .catch() handlers (no unhandled rejections)', () => {
    // Exclude the function declaration itself (preceded by 'async function ')
    const callSites = [...setupSrc.matchAll(/_ensureSopranoWebUI\(/g)].filter(m => {
      const before = setupSrc.slice(Math.max(0, m.index - 20), m.index);
      return !before.includes('function ');
    });
    assert.ok(callSites.length >= 2, '_ensureSopranoWebUI must be called in at least 2 places');
    let uncaught = 0;
    for (const match of callSites) {
      const snippet = setupSrc.slice(match.index, match.index + 900);
      if (!snippet.includes('.catch(')) uncaught++;
    }
    assert.strictEqual(
      uncaught, 0,
      `every _ensureSopranoWebUI call must have a .catch() handler — ${uncaught} site(s) missing one`
    );
  });

  test('LLM config modal creates AbortController before calling _ensureSopranoWebUI', () => {
    assert.ok(
      setupSrc.includes('_previewEnsureAbort = new AbortController()'),
      'LLM config modal preview must create an AbortController so the polling loop is cancellable'
    );
  });

  test('native voice picker creates AbortController before calling _ensureSopranoWebUI', () => {
    assert.ok(
      setupSrc.includes('_nvEnsureAbort = new AbortController()'),
      'native voice picker must create an AbortController so the polling loop is cancellable'
    );
  });

  test('soprano WebUI polling is aborted when LLM config modal closes', () => {
    // The LLM config modal's _killPreview (not the Hermes or provider modals) must abort the
    // polling controller. Search for the explicit .abort() call rather than the first _killPreview.
    assert.ok(
      setupSrc.includes('_previewEnsureAbort.abort()'),
      '_previewEnsureAbort.abort() must be called to cancel soprano WebUI polling when the modal closes'
    );
    assert.ok(
      setupSrc.includes('_previewEnsureAbort = null'),
      '_previewEnsureAbort must be nulled after abort to prevent stale controller references'
    );
  });

  test('_closeNV aborts soprano WebUI polling when voice picker closes', () => {
    const guardBlock = getNativeGuardBlock(setupSrc);
    const closeIdx = guardBlock.indexOf('function _closeNV()');
    assert.ok(closeIdx >= 0, '_closeNV must be defined');
    const closeBody = guardBlock.slice(closeIdx, closeIdx + 300);
    assert.ok(
      closeBody.includes('_nvEnsureAbort'),
      '_closeNV must reference _nvEnsureAbort to cancel soprano polling'
    );
    assert.ok(
      closeBody.includes('.abort()'),
      '_closeNV must call .abort() to stop the polling loop'
    );
  });
});

// ---------------------------------------------------------------------------
// Adversarial review fixes: _spawnAndTrack error handling (Issues #5 #6)

describe('_spawnAndTrack error handling', () => {
  test('shows error label and logs when spawn() throws', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    const fnIdx = body.indexOf('function _spawnAndTrack(');
    assert.ok(fnIdx >= 0, '_spawnAndTrack must be defined inside _previewNativeVoice');
    const fnBody = body.slice(fnIdx, fnIdx + 600);
    assert.ok(
      fnBody.includes('Engine not installed'),
      '_spawnAndTrack catch block must show "Engine not installed" label when spawn throws'
    );
    assert.ok(
      fnBody.includes('process.stderr.write'),
      '_spawnAndTrack must log spawn failures to stderr (not silently discard)'
    );
  });

  test('exit handler shows error label on non-zero exit code', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    const fnIdx = body.indexOf('function _spawnAndTrack(');
    assert.ok(fnIdx >= 0, '_spawnAndTrack must be defined');
    const fnBody = body.slice(fnIdx, fnIdx + 800);
    assert.ok(
      fnBody.includes('code !== 0'),
      '_spawnAndTrack exit handler must check for non-zero exit code'
    );
    assert.ok(
      fnBody.includes('Preview failed'),
      '_spawnAndTrack exit handler must show "Preview failed" label so the user knows the preview broke'
    );
  });
});

// ---------------------------------------------------------------------------
// Adversarial review fix: WSL guard in soprano Windows branch (Issue #8)

describe('soprano Windows guard correctness', () => {
  test('soprano Windows branch excludes WSL environments', () => {
    const body = getPreviewNativeFnBody(setupSrc);
    const sopranoWinIdx = body.indexOf("engine === 'soprano'");
    assert.ok(sopranoWinIdx >= 0, 'soprano Windows branch must exist in _previewNativeVoice');
    const snippet = body.slice(sopranoWinIdx, sopranoWinIdx + 200);
    assert.ok(
      snippet.includes('WSL_DISTRO_NAME'),
      "soprano Windows branch must check WSL_DISTRO_NAME — WSL reports win32 platform but can't use play-tts-soprano.ps1"
    );
  });
});

// ---------------------------------------------------------------------------
// Adversarial review fix: play-tts-soprano.ps1 PATH preservation (Issue #7)

describe('play-tts-soprano.ps1 PATH resilience', () => {
  const ps1Src = readFileSync(
    resolve(PROJECT_ROOT, '.claude/hooks-windows/play-tts-soprano.ps1'), 'utf8'
  );

  test('PATH refresh preserves existing entries (does not overwrite)', () => {
    assert.ok(
      ps1Src.includes('$env:Path = $env:Path +'),
      'play-tts-soprano.ps1 must prepend $env:Path before registry entries to preserve nvm/conda/pyenv shims'
    );
  });

  test('PATH refresh does not start from registry (would erase runtime shims)', () => {
    const startsWithRegistry = /\$env:Path\s*=\s*\[System\.Environment\]/.test(ps1Src);
    assert.ok(
      !startsWithRegistry,
      'play-tts-soprano.ps1 must not start PATH assignment from registry — that erases runtime-added shims'
    );
  });
});
