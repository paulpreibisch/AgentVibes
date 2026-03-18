/**
 * Epic 12: Installer Wizard (5-Screen Flow)
 * Tests for install-tab.js pure exports and Tab Component Contract
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('formatGreeting', () => {
  let formatGreeting;
  before(async () => {
    const mod = await import('../../src/console/tabs/install-tab.js');
    formatGreeting = mod.formatGreeting;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof formatGreeting, 'function');
  });

  test('includes project name when intro text provided', () => {
    const msg = formatGreeting('FireBot', 'AgentVibes');
    assert.ok(msg.includes('FireBot'));
  });

  test('returns generic greeting when no intro text', () => {
    const msg = formatGreeting('', 'AgentVibes');
    assert.ok(typeof msg === 'string' && msg.length > 0);
  });

  test('includes GitHub star mention', () => {
    const msg = formatGreeting('Bot', 'MyProject');
    assert.ok(msg.toLowerCase().includes('github') || msg.includes('⭐'));
  });
});

// ---------------------------------------------------------------------------

describe('getIntroDefault', () => {
  let getIntroDefault;
  before(async () => {
    const mod = await import('../../src/console/tabs/install-tab.js');
    getIntroDefault = mod.getIntroDefault;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof getIntroDefault, 'function');
  });

  test('returns basename of project dir', () => {
    const result = getIntroDefault('/home/user/my-project');
    assert.strictEqual(result, 'my-project');
  });

  test('returns empty string for empty input', () => {
    const result = getIntroDefault('');
    assert.strictEqual(typeof result, 'string');
  });
});

// ---------------------------------------------------------------------------

describe('createInstallTab — Tab Component Contract', () => {
  let createInstallTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/install-tab.js');
    createInstallTab = mod.createInstallTab;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof createInstallTab, 'function');
  });

  test('returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({}), set: () => {}, isInstalled: () => false },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {}, getProvider: () => 'piper' },
    };
    const tab = createInstallTab(mockScreen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns indigo #3f51b5', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createInstallTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {}, isInstalled: () => false },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {}, getProvider: () => 'piper' },
    });
    assert.strictEqual(tab.getFooterColor(), '#3f51b5');
  });
});
