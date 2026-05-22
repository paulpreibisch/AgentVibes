/**
 * Tests for src/utils/preview-list-prompt.js
 *
 * createPreviewListPrompt(inquirer, config) wraps an inquirer list prompt
 * with optional spacebar-preview support. In a non-TTY test environment,
 * process.stdin.isTTY is falsy so the keypress listener is never installed;
 * only the core prompt flow and cleanup path are exercised.
 *
 * Strategy: mock inquirer.prompt() to resolve immediately, no real terminal.
 * Uses node:test + node:assert/strict, ESM, no network.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewListPrompt } from '../../src/utils/preview-list-prompt.js';

// ---------------------------------------------------------------------------
// Mock inquirer — resolves immediately with the first choice
// ---------------------------------------------------------------------------

function makeMockInquirer(resolveValue) {
  return {
    prompt: async (questions) => {
      // Return an object keyed by the question's name
      const name = questions[0]?.name || 'choice';
      return { [name]: resolveValue };
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createPreviewListPrompt()', () => {
  test('resolves with the value from inquirer.prompt', async () => {
    const inquirer = makeMockInquirer('en_US-ryan-high');
    const result = await createPreviewListPrompt(inquirer, {
      name: 'voice',
      message: 'Choose a voice',
      choices: [
        { name: 'Ryan High', value: 'en_US-ryan-high' },
        { name: 'Lessac High', value: 'en_US-lessac-high' },
      ],
    });

    assert.ok(typeof result === 'object', 'must return an object');
    assert.strictEqual(result.voice, 'en_US-ryan-high');
  });

  test('passes through without onPreview — no TTY keypress setup needed', async () => {
    const inquirer = makeMockInquirer('test-choice');
    // Should resolve without errors even when onPreview is omitted
    await assert.doesNotReject(() =>
      createPreviewListPrompt(inquirer, {
        name: 'item',
        message: 'Pick one',
        choices: [{ name: 'Option A', value: 'test-choice' }],
      })
    );
  });

  test('handles a config with a default choice that exists in choices list', async () => {
    const inquirer = makeMockInquirer('second');
    const result = await createPreviewListPrompt(inquirer, {
      name: 'selection',
      message: 'Choose',
      default: 'second',
      choices: [
        { name: 'First', value: 'first' },
        { name: 'Second', value: 'second' },
        { name: 'Third', value: 'third' },
      ],
    });

    assert.strictEqual(result.selection, 'second');
  });

  test('handles a config with a default that does NOT exist in choices', async () => {
    const inquirer = makeMockInquirer('first');
    // Should not throw even if default value is not in the choices list
    await assert.doesNotReject(() =>
      createPreviewListPrompt(inquirer, {
        name: 'pick',
        message: 'Pick',
        default: 'nonexistent-default',
        choices: [{ name: 'First', value: 'first' }],
      })
    );
  });

  test('handles empty choices array without throwing', async () => {
    const inquirer = makeMockInquirer(undefined);
    await assert.doesNotReject(() =>
      createPreviewListPrompt(inquirer, {
        name: 'pick',
        message: 'Pick',
        choices: [],
      })
    );
  });

  test('onPreview is not called in non-TTY environment (stdin.isTTY is falsy)', async () => {
    let previewCalled = false;
    const inquirer = makeMockInquirer('en_US-lessac-high');

    await createPreviewListPrompt(inquirer, {
      name: 'voice',
      message: 'Pick voice',
      choices: [{ name: 'Lessac High', value: 'en_US-lessac-high' }],
      onPreview: async (value) => {
        previewCalled = true;
        return null;
      },
    });

    // In a non-TTY test environment, the keypress listener is never installed
    // so onPreview is never invoked during the prompt
    assert.strictEqual(previewCalled, false, 'onPreview must not be called in non-TTY env');
  });

  test('propagates inquirer.prompt rejection as a rejected promise', async () => {
    const brokenInquirer = {
      prompt: async () => { throw new Error('inquirer failed'); },
    };

    await assert.rejects(
      () => createPreviewListPrompt(brokenInquirer, {
        name: 'voice',
        message: 'Pick',
        choices: [{ name: 'A', value: 'a' }],
      }),
      /inquirer failed/
    );
  });
});
