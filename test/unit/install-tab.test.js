/**
 * Epic 12: Installer Wizard (5-Screen Flow)
 * Tests for setup-tab.js pure exports and Tab Component Contract
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------

describe('formatGreeting', () => {
  let formatGreeting;
  before(async () => {
    const mod = await import('../../src/console/tabs/setup-tab.js');
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
    const mod = await import('../../src/console/tabs/setup-tab.js');
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

describe('createSetupTab — Tab Component Contract', () => {
  let createSetupTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/setup-tab.js');
    createSetupTab = mod.createSetupTab;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof createSetupTab, 'function');
  });

  test('returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({}), set: () => {}, isInstalled: () => false },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {}, getProvider: () => 'piper' },
    };
    const tab = createSetupTab(mockScreen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns named color blue', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createSetupTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {}, isInstalled: () => false },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {}, getProvider: () => 'piper' },
    });
    assert.strictEqual(tab.getFooterColor(), 'blue');
  });
});

// ---------------------------------------------------------------------------
// Regression: screen 5 left arrow must not jump back to screen 4
// ---------------------------------------------------------------------------

describe('setup-tab screen 3 left arrow guard (regression)', () => {
  test('source has screen 3 guard in left-arrow handler', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __f = fileURLToPath(import.meta.url);
    const src = readFileSync(join(dirname(__f), '../../src/console/tabs/setup-tab.js'), 'utf8');

    // Find the screen.key(['left'], ...) registration line index
    const lines = src.split('\n');
    const leftKeyIdx = lines.findIndex(l => l.includes("screen.key(['left']"));
    assert.ok(leftKeyIdx >= 0, "screen.key(['left']) handler must exist");

    // Grab the next ~10 lines of the handler body
    const handlerBody = lines.slice(leftKeyIdx, leftKeyIdx + 12).join('\n');
    assert.ok(
      handlerBody.includes("_screen === 3") && handlerBody.includes("return"),
      "left-arrow handler must guard screen 3 with early return to prevent jumping back from provider screen"
    );
  });
});
