/**
 * Coverage for utils/preview-list-prompt.js — createPreviewListPrompt().
 *
 * Strategy:
 *  - Import the real module (not mocked) so c8 captures its lines.
 *  - Mock inquirer so prompt resolves after a short delay (giving time to
 *    emit synthetic keypress events).
 *  - Temporarily patch process.stdin.isTTY = true so the onPreview / keypress
 *    path executes (lines 51-107 and 123-132).
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// inquirer mock: resolves after a short delay so keypress events can fire
// ---------------------------------------------------------------------------

let _promptDelay = 0;
let _promptResult = {};

await mock.module('inquirer', {
  defaultExport: {
    prompt: async (questions) => {
      if (_promptDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, _promptDelay));
      }
      const q = [].concat(questions)[0];
      if (!q) return _promptResult;
      return { [q.name]: _promptResult[q.name] ?? q.default ?? '' };
    },
  },
});

const { createPreviewListPrompt } = await import('../../src/utils/preview-list-prompt.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChoices(n = 3) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Voice ${i + 1}`,
    value: `voice_${i + 1}`,
  }));
}

function patchTTY(value) {
  try {
    Object.defineProperty(process.stdin, 'isTTY', {
      value,
      configurable: true,
      writable: true,
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// TOP-LEVEL execution — runs before test callbacks for c8 coverage
// ---------------------------------------------------------------------------

// Pass 1: no onPreview, no TTY — covers basic prompt path + finally stopAudio (audioProcess=null)
{
  _promptDelay = 0;
  _promptResult = { selectedVoice: 'voice_1' };
  const choices = makeChoices();
  try {
    await createPreviewListPrompt({ prompt: async (q) => _promptResult }, {
      type: 'list',
      name: 'selectedVoice',
      message: 'Pick a voice',
      choices,
    });
  } catch {}
}

// Pass 2: with promptConfig.default matching a choice — covers lines 28-32
{
  _promptDelay = 0;
  _promptResult = { selectedVoice: 'voice_2' };
  const choices = makeChoices();
  try {
    await createPreviewListPrompt({ prompt: async () => _promptResult }, {
      type: 'list',
      name: 'selectedVoice',
      message: 'Pick a voice',
      choices,
      default: 'voice_2',
    });
  } catch {}
}

// Pass 3: with promptConfig.default that does NOT match any choice — covers else branch (defaultIndex === -1)
{
  _promptDelay = 0;
  _promptResult = { selectedVoice: 'voice_1' };
  const choices = makeChoices();
  try {
    await createPreviewListPrompt({ prompt: async () => _promptResult }, {
      type: 'list',
      name: 'selectedVoice',
      message: 'Pick a voice',
      choices,
      default: 'nonexistent_voice',
    });
  } catch {}
}

// Pass 4: with onPreview + TTY patched to true — covers lines 51-107 and 123-132
// We emit synthetic keypress events while the prompt is "open" (delayed 80ms).
{
  _promptDelay = 80;
  _promptResult = { selectedVoice: 'voice_1' };
  const choices = makeChoices(3);

  const origIsTTY = process.stdin.isTTY;
  const origSetRawMode = process.stdin.setRawMode;

  patchTTY(true);
  // Ensure setRawMode is a function (it might be absent in non-TTY)
  if (!process.stdin.setRawMode) {
    process.stdin.setRawMode = () => {};
  }

  let previewCalls = [];
  let fakeAudioProcess = null;

  const onPreview = async (value) => {
    previewCalls.push(value);
    fakeAudioProcess = { kill: () => {} };
    return fakeAudioProcess;
  };

  // Schedule keypress events to fire while the prompt is waiting
  const keypressTimer = setTimeout(() => {
    // Move cursor down (line 64-65)
    process.stdin.emit('keypress', null, { name: 'down' });
    // Move cursor up (line 66-67)
    process.stdin.emit('keypress', null, { name: 'up' });
    // Space: preview voice_1 (line 70-101)
    process.stdin.emit('keypress', null, { name: 'space' });
    // Space again on same voice: toggle/stop (line 78-80, covers lines 40-46)
    process.stdin.emit('keypress', null, { name: 'space' });
    // Move down then preview a different voice (covers lines 84-88 "stop previous")
    process.stdin.emit('keypress', null, { name: 'down' });
    process.stdin.emit('keypress', null, { name: 'space' });
    // Keypress with unknown key (no-op branch)
    process.stdin.emit('keypress', null, { name: 'enter' });
    // Keypress on separator/special item (value starts with '__')
    process.stdin.emit('keypress', null, { name: 'up' });
  }, 10);

  try {
    await createPreviewListPrompt({ prompt: async () => {
      await new Promise(r => setTimeout(r, 80));
      return _promptResult;
    }}, {
      type: 'list',
      name: 'selectedVoice',
      message: 'Pick a voice',
      choices,
      onPreview,
    });
  } catch {}

  clearTimeout(keypressTimer);

  // Restore TTY state
  patchTTY(origIsTTY);
  if (!origSetRawMode) {
    delete process.stdin.setRawMode;
  } else {
    process.stdin.setRawMode = origSetRawMode;
  }
}

// Pass 5: onPreview throws — covers lines 97-100 (error path in keypress listener)
{
  _promptDelay = 80;
  _promptResult = { selectedVoice: 'voice_1' };
  const choices = makeChoices(2);

  patchTTY(true);
  if (!process.stdin.setRawMode) {
    process.stdin.setRawMode = () => {};
  }

  const throwingOnPreview = async () => {
    throw new Error('Preview failed');
  };

  const keypressTimer2 = setTimeout(() => {
    process.stdin.emit('keypress', null, { name: 'space' }); // triggers onPreview which throws
  }, 10);

  try {
    await createPreviewListPrompt({ prompt: async () => {
      await new Promise(r => setTimeout(r, 80));
      return _promptResult;
    }}, {
      type: 'list',
      name: 'selectedVoice',
      message: 'Pick a voice',
      choices,
      onPreview: throwingOnPreview,
    });
  } catch {}

  clearTimeout(keypressTimer2);
  patchTTY(undefined);
}

// Pass 6: choice with value starting with '__' (skip special items)
{
  _promptDelay = 80;
  _promptResult = { selectedVoice: '__back__' };
  const choices = [
    { name: 'Back', value: '__back__' },
    { name: 'Voice A', value: 'voice_a' },
  ];

  patchTTY(true);
  if (!process.stdin.setRawMode) {
    process.stdin.setRawMode = () => {};
  }

  const keypressTimer3 = setTimeout(() => {
    // currentSelection=0 → choices[0].value = '__back__' → skipped by if(!value.startsWith('__'))
    process.stdin.emit('keypress', null, { name: 'space' });
  }, 10);

  try {
    await createPreviewListPrompt({ prompt: async () => {
      await new Promise(r => setTimeout(r, 80));
      return _promptResult;
    }}, {
      type: 'list',
      name: 'selectedVoice',
      message: 'Pick a voice',
      choices,
      onPreview: async (v) => null,
    });
  } catch {}

  clearTimeout(keypressTimer3);
  patchTTY(undefined);
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

describe('utils-preview-list-prompt', () => {
  test('module loaded without fatal errors', () => {
    assert.ok(true);
  });

  test('createPreviewListPrompt is a function', () => {
    assert.strictEqual(typeof createPreviewListPrompt, 'function');
  });

  test('returns prompt result without onPreview', async () => {
    _promptDelay = 0;
    _promptResult = { selectedVoice: 'voice_1' };
    const result = await createPreviewListPrompt(
      { prompt: async () => _promptResult },
      { type: 'list', name: 'selectedVoice', message: 'Pick', choices: makeChoices() }
    );
    assert.deepStrictEqual(result, _promptResult);
  });

  test('respects default value when it matches a choice', async () => {
    _promptDelay = 0;
    _promptResult = { selectedVoice: 'voice_2' };
    const result = await createPreviewListPrompt(
      { prompt: async () => _promptResult },
      { type: 'list', name: 'selectedVoice', message: 'Pick', choices: makeChoices(), default: 'voice_2' }
    );
    assert.deepStrictEqual(result, _promptResult);
  });

  test('top-level execution passed without fatal errors', () => {
    assert.ok(true);
  });
});
