/**
 * Epic 11: Agents Tab (BMAD Voice Management)
 * Tests for agent-voice-store.js and agents-tab.js exports
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// ---------------------------------------------------------------------------

describe('AgentVoiceStore', () => {
  let AgentVoiceStore;
  before(async () => {
    const mod = await import('../../src/services/agent-voice-store.js');
    AgentVoiceStore = mod.AgentVoiceStore;
  });

  function makeTmpStore() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-test-'));
    return new AgentVoiceStore({ homeDir: dir });
  }

  test('exported as class', () => {
    assert.strictEqual(typeof AgentVoiceStore, 'function');
  });

  test('getVoiceMap() returns empty object initially', () => {
    const store = makeTmpStore();
    assert.deepStrictEqual(store.getVoiceMap(), {});
  });

  test('setVoice() and getVoiceMap() persist voice', () => {
    const store = makeTmpStore();
    store.setVoice('dev', 'en_US-amy-medium');
    const map = store.getVoiceMap();
    assert.strictEqual(map['dev'], 'en_US-amy-medium');
  });

  test('resetVoice() removes agent from map', () => {
    const store = makeTmpStore();
    store.setVoice('dev', 'en_US-amy-medium');
    store.resetVoice('dev');
    const map = store.getVoiceMap();
    assert.strictEqual(map['dev'], undefined);
  });

  test('getPartyMode() returns false initially', () => {
    const store = makeTmpStore();
    assert.strictEqual(store.getPartyMode(), false);
  });

  test('setPartyMode(true) persists', () => {
    const store = makeTmpStore();
    store.setPartyMode(true);
    assert.strictEqual(store.getPartyMode(), true);
  });
});

// ---------------------------------------------------------------------------

describe('scanBmadAgents', () => {
  let scanBmadAgents;
  before(async () => {
    const mod = await import('../../src/services/agent-voice-store.js');
    scanBmadAgents = mod.scanBmadAgents;
  });

  test('exported as function', () => {
    assert.strictEqual(typeof scanBmadAgents, 'function');
  });

  test('returns empty array when no BMAD dir', () => {
    const result = scanBmadAgents('/nonexistent/project/path');
    assert.deepStrictEqual(result, []);
  });

  test('returns agents from _bmad/bmm/agents/ directory', () => {
    const projectRoot = path.resolve(process.cwd());
    const result = scanBmadAgents(projectRoot);
    assert.ok(Array.isArray(result));
    if (result.length > 0) {
      assert.ok(result[0].id, 'agent has id');
      assert.ok(result[0].displayName, 'agent has displayName');
    }
  });
});

// ---------------------------------------------------------------------------

describe('isSingleVoiceProvider', () => {
  let isSingleVoiceProvider;
  before(async () => {
    const mod = await import('../../src/services/agent-voice-store.js');
    isSingleVoiceProvider = mod.isSingleVoiceProvider;
  });

  test('exported as function', () => {
    assert.strictEqual(typeof isSingleVoiceProvider, 'function');
  });

  test('soprano is single voice provider', () => {
    assert.strictEqual(isSingleVoiceProvider('soprano'), true);
  });

  test('piper is not single voice provider', () => {
    assert.strictEqual(isSingleVoiceProvider('piper'), false);
  });

  test('elevenlabs is not single voice provider', () => {
    assert.strictEqual(isSingleVoiceProvider('elevenlabs'), false);
  });
});

// ---------------------------------------------------------------------------

describe('createAgentsTab — Tab Component Contract', () => {
  let createAgentsTab;
  before(async () => {
    const mod = await import('../../src/console/tabs/agents-tab.js');
    createAgentsTab = mod.createAgentsTab;
  });

  test('exported as named function', () => {
    assert.strictEqual(typeof createAgentsTab, 'function');
  });

  test('returns Tab Component Contract with all 7 properties', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const mockServices = {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {}, getProvider: () => 'piper' },
    };
    const tab = createAgentsTab(mockScreen, mockServices);
    assert.ok('box' in tab);
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns purple #9c27b0', () => {
    const mockScreen = { append: () => {}, key: () => {}, on: () => {}, render: () => {}, destroy: () => {} };
    const tab = createAgentsTab(mockScreen, {
      configService: { getConfig: () => ({}), set: () => {} },
      providerService: { getActiveVoiceId: () => '', setActiveVoice: () => {}, getProvider: () => 'piper' },
    });
    assert.strictEqual(tab.getFooterColor(), '#9c27b0');
  });
});
