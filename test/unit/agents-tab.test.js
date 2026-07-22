/**
 * Epic 11: Agents Tab (BMAD Voice Management)
 * Tests for agent-voice-store.js and agents-tab.js exports
 */

process.env.AGENTVIBES_TEST_MODE = 'true';

import { test, describe, before, mock, afterEach } from 'node:test';
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

  test('returns array for any project path (may include global home-dir BMAD agents)', () => {
    const result = scanBmadAgents('/nonexistent/project/path');
    assert.ok(Array.isArray(result));
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
// Regression: v6.6+ skills-only BMAD layout. Persona agents are top-level
// `bmad-agent-<role>` skill dirs; a skill's private `agents/` subfolder (e.g.
// bmad-prfaq/agents/) must NOT be mistaken for the BMAD roster — that produced
// a bogus "2 agents" list (artifact-analyzer, web-researcher).

describe('scanBmadAgents — v6.6+ skills layout (regression)', () => {
  let scanBmadAgents, isBmadDetected;
  before(async () => {
    const mod = await import('../../src/services/agent-voice-store.js');
    scanBmadAgents = mod.scanBmadAgents;
    isBmadDetected = mod.isBmadDetected;
  });

  afterEach(() => mock.restoreAll());

  // Build an isolated project AND pin os.homedir() to it, so the scan only sees
  // this fixture (both functions also scan the real home dir otherwise).
  function makeProject({ personaSkills = [], helperSkill = false }) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-bmad-'));
    mock.method(os, 'homedir', () => root);
    const skills = path.join(root, '.claude', 'skills');
    for (const role of personaSkills) {
      const d = path.join(skills, `bmad-agent-${role}`);
      fs.mkdirSync(d, { recursive: true });
      const name = { analyst: 'Mary', architect: 'Winston', dev: 'Amelia' }[role] ?? role;
      const title = { analyst: 'Business Analyst', architect: 'Architect', dev: 'Developer' }[role] ?? '';
      fs.writeFileSync(path.join(d, 'SKILL.md'), `---\nname: bmad-agent-${role}\n---\n\n# ${name} — ${title}\n`);
    }
    if (helperSkill) {
      const d = path.join(skills, 'bmad-prfaq', 'agents');
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'artifact-analyzer.md'), '# helper\n');
      fs.writeFileSync(path.join(d, 'web-researcher.md'), '# helper\n');
    }
    return root;
  }

  test('finds bmad-agent-* persona skills, ignores skill-internal agents/', () => {
    const root = makeProject({ personaSkills: ['analyst', 'architect', 'dev'], helperSkill: true });
    const ids = scanBmadAgents(root).map(a => a.id).sort();
    assert.deepStrictEqual(ids, ['analyst', 'architect', 'dev']);
    assert.ok(!ids.includes('artifact-analyzer'), 'skill helper must not be listed');
    assert.ok(!ids.includes('web-researcher'), 'skill helper must not be listed');
  });

  test('reads persona name + title from SKILL.md heading', () => {
    const root = makeProject({ personaSkills: ['analyst'] });
    const mary = scanBmadAgents(root).find(a => a.id === 'analyst');
    assert.strictEqual(mary.displayName, 'Mary');
    assert.strictEqual(mary.title, 'Business Analyst');
  });

  test('derives persona name from a bare "# Name" heading / the description', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-bmad-'));
    mock.method(os, 'homedir', () => root);
    const d = path.join(root, '.claude', 'skills', 'bmad-agent-analyst');
    fs.mkdirSync(d, { recursive: true });
    // No dashed "Name — Title" heading; a bare "# Mary" + a description that names
    // the persona ("talk to Mary"). Either source should yield "Mary", not "Analyst".
    fs.writeFileSync(path.join(d, 'SKILL.md'),
      '---\nname: bmad-agent-analyst\ndescription: Strategic analyst. Use when the user asks to talk to Mary or requests the analyst.\n---\n\n# Mary\n\n## Overview\n');
    const mary = scanBmadAgents(root).find(a => a.id === 'analyst');
    assert.strictEqual(mary.displayName, 'Mary');
  });

  test('falls back to title-cased id when SKILL.md has no "Name — Title" heading', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-bmad-'));
    mock.method(os, 'homedir', () => root);
    const d = path.join(root, '.claude', 'skills', 'bmad-agent-builder');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'SKILL.md'), '---\nname: bmad-agent-builder\n---\n\n# Overview\n\nBuilds skills.\n');
    const builder = scanBmadAgents(root).find(a => a.id === 'builder');
    assert.strictEqual(builder.displayName, 'Builder');
    assert.strictEqual(builder.title, '');
  });

  test('a skill-internal agents/ folder alone is NOT a BMAD install', () => {
    const root = makeProject({ helperSkill: true });
    assert.deepStrictEqual(scanBmadAgents(root), []);
    assert.strictEqual(isBmadDetected(root), false);
  });

  test('bmad-agent-* skills DO count as a BMAD install', () => {
    const root = makeProject({ personaSkills: ['pm'] });
    assert.strictEqual(isBmadDetected(root), true);
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
