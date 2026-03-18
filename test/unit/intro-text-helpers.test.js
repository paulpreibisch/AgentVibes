/**
 * Story 7.5: Intro Text Settings Group
 * Tests for exported format helper: formatIntroText
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

describe('formatIntroText', () => {
  let formatIntroText;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    formatIntroText = mod.formatIntroText;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatIntroText, 'function');
  });

  test('returns "(none)" for undefined', () => {
    assert.strictEqual(formatIntroText(undefined), '(none)');
  });

  test('returns "(none)" for empty string', () => {
    assert.strictEqual(formatIntroText(''), '(none)');
  });

  test('returns short text as-is', () => {
    assert.strictEqual(formatIntroText('Hello there!'), 'Hello there!');
  });

  test('returns exactly 30 chars without truncation', () => {
    const text = 'a'.repeat(30);
    assert.strictEqual(formatIntroText(text), text);
  });

  test('truncates text over 30 chars with ellipsis', () => {
    const text = 'a'.repeat(31);
    assert.strictEqual(formatIntroText(text), 'a'.repeat(30) + '…');
  });

  test('truncates 50-char text to 30 + ellipsis', () => {
    const text = 'Hello world, this is my intro text yeah!!!!!!!!!!';
    assert.strictEqual(formatIntroText(text), text.slice(0, 30) + '…');
  });
});

describe('createSettingsTab — regression (story 7-5)', () => {
  let createSettingsTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/settings-tab.js');
    createSettingsTab = mod.createSettingsTab;
  });

  test('still exports createSettingsTab as named function', () => {
    assert.strictEqual(typeof createSettingsTab, 'function');
  });

  test('getFooterColor() still returns #2196f3', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createSettingsTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveProvider: () => 'piper', getInstalledProviders: () => ['piper'], getActiveVoiceId: () => 'en_US-amy-medium', setActiveProvider: () => {} },
    });
    assert.strictEqual(tab.getFooterColor(), '#2196f3');
  });
});
