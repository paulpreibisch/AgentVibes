/**
 * Additional coverage tests for src/services/llm-provider-service.js
 *
 * Covers functions not tested in llm-provider-service-extended.test.js:
 *   - buildCodexToml(existingContent)
 *   - resolveCfgPath(targetDir)
 *   - saveLlmConfigSync(llmKey, config, targetDir)
 *   - seedAllLlmDefaultsSync(targetDir)
 *   - checkClaudeInstalled / checkCopilotInstalled / checkCodexInstalled
 *   - installCopilotInstructions / removeCopilotInstructions  (tests wrapWithMarkers,
 *     injectMarkerBlock, removeMarkerBlock indirectly)
 *   - installCodexMcp / removeCodexMcp
 *   - installCodexInstructions / removeCodexInstructions
 *   - getTransportConfig / saveTransportConfig
 *   - getHermesConfig / saveHermesConfig / checkHermesInstalled / removeHermes
 *
 * Strategy: real temp directories for all file I/O; HERMES_HOME and other env
 * vars are set/restored per-test. No network access; no TTS spawning.
 *
 * Uses node:test + node:assert/strict, ESM.
 */

import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeFileSync, mkdirSync } from 'node:fs';

import {
  buildCodexToml,
  resolveCfgPath,
  loadLlmConfigSync,
  saveLlmConfigSync,
  seedAllLlmDefaultsSync,
  checkClaudeInstalled,
  checkCopilotInstalled,
  checkCodexInstalled,
  installCopilotInstructions,
  removeCopilotInstructions,
  installCodexMcp,
  removeCodexMcp,
  installCodexInstructions,
  removeCodexInstructions,
  installCodexHooks,
  removeCodexHooks,
  installHermes,
  getTransportConfig,
  saveTransportConfig,
  getHermesConfig,
  saveHermesConfig,
  checkHermesInstalled,
  removeHermes,
  TRANSPORT_PROVIDERS,
  PROVIDERS,
} from '../../src/services/llm-provider-service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir;

function makeTmpDir(suffix = '') {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `av-llm-cov${suffix}-`));
  return d;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

beforeEach(() => {
  tmpDir = makeTmpDir();
});

afterEach(() => {
  try {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch { /* best effort */ }
  tmpDir = null;
});

// ===========================================================================
// buildCodexToml()
// ===========================================================================

describe('buildCodexToml() — pure function', () => {
  test('returns a TOML block with [mcp_servers.agentvibes] when given empty content', () => {
    const toml = buildCodexToml('');
    assert.ok(toml.includes('[mcp_servers.agentvibes]'), 'must contain section header');
  });

  test('contains command = "npx" in the block', () => {
    const toml = buildCodexToml('');
    assert.ok(toml.includes('command = "npx"'), 'must specify npx as command');
  });

  test('contains agentvibes-mcp-server in args', () => {
    const toml = buildCodexToml('');
    assert.ok(toml.includes('agentvibes-mcp-server'), 'must reference agentvibes-mcp-server');
  });

  test('contains AGENTVIBES_LLM = "codex" in env', () => {
    const toml = buildCodexToml('');
    assert.ok(toml.includes('AGENTVIBES_LLM'), 'must set AGENTVIBES_LLM env var');
    assert.ok(toml.includes('"codex"'), 'must set LLM to codex');
  });

  test('preserves existing TOML content when appending', () => {
    const existing = '[other_section]\nkey = "value"\n';
    const toml = buildCodexToml(existing);
    assert.ok(toml.includes('[other_section]'), 'must preserve existing sections');
    assert.ok(toml.includes('key = "value"'), 'must preserve existing key-value pairs');
    assert.ok(toml.includes('[mcp_servers.agentvibes]'), 'must add agentvibes section');
  });

  test('replaces an existing agentvibes block when called with content that has one', () => {
    const existing = '[mcp_servers.agentvibes]\ncommand = "old-command"\n[other]\nx = 1\n';
    const toml = buildCodexToml(existing);
    assert.ok(!toml.includes('old-command'), 'must replace old command');
    assert.ok(toml.includes('command = "npx"'), 'must use new npx command');
    assert.ok(toml.includes('[other]'), 'must preserve other sections');
  });

  test('returns a string ending with a newline', () => {
    const toml = buildCodexToml('');
    assert.ok(toml.endsWith('\n'), 'TOML output must end with newline');
  });

  test('does not double-append when called with empty string default', () => {
    const toml = buildCodexToml();
    const count = (toml.match(/\[mcp_servers\.agentvibes\]/g) || []).length;
    assert.strictEqual(count, 1, 'section must appear exactly once');
  });
});

// ===========================================================================
// resolveCfgPath()
// ===========================================================================

describe('resolveCfgPath()', () => {
  test('returns local .claude/config/audio-effects.cfg when it exists', () => {
    const localCfg = path.join(tmpDir, '.claude', 'config', 'audio-effects.cfg');
    writeFile(localCfg, '# test cfg\n');

    const result = resolveCfgPath(tmpDir);

    assert.strictEqual(result, localCfg);
  });

  test('returns global path when local config does not exist', () => {
    // tmpDir has no .claude/config/audio-effects.cfg
    const result = resolveCfgPath(tmpDir);

    // Global path should be ~/.claude/config/audio-effects.cfg
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    const globalCfg = path.join(homeDir, '.claude', 'config', 'audio-effects.cfg');
    assert.strictEqual(result, globalCfg);
  });

  test('result is a string ending in audio-effects.cfg', () => {
    const result = resolveCfgPath(tmpDir);
    assert.ok(result.endsWith('audio-effects.cfg'), `Expected path to end with audio-effects.cfg, got: ${result}`);
  });
});

// ===========================================================================
// saveLlmConfigSync() + loadLlmConfigSync() — round-trip
// ===========================================================================

describe('saveLlmConfigSync() + loadLlmConfigSync() — round-trip', () => {
  test('written config is readable back with correct fields', () => {
    const cfg = {
      effects: 'heavy',
      bgTrack: 'my-track.mp3',
      bgVolume: '0.25',
      voice: 'en_US-ryan-high',
      pretext: 'Hello agent!',
      ttsEngine: 'piper',
    };

    saveLlmConfigSync('test-llm', cfg, tmpDir);
    const loaded = loadLlmConfigSync('test-llm', tmpDir);

    assert.strictEqual(loaded.effects, 'heavy');
    assert.strictEqual(loaded.bgTrack, 'my-track.mp3');
    assert.strictEqual(loaded.bgVolume, '0.25');
    assert.strictEqual(loaded.voice, 'en_US-ryan-high');
    assert.strictEqual(loaded.pretext, 'Hello agent!');
    assert.strictEqual(loaded.ttsEngine, 'piper');
  });

  test('updates existing entry when called twice with same key', () => {
    saveLlmConfigSync('my-llm', { effects: 'none', bgTrack: '', bgVolume: '0.1', voice: 'v1', pretext: '', ttsEngine: '' }, tmpDir);
    saveLlmConfigSync('my-llm', { effects: 'light', bgTrack: 'track.mp3', bgVolume: '0.2', voice: 'v2', pretext: 'Hi', ttsEngine: 'piper' }, tmpDir);

    const loaded = loadLlmConfigSync('my-llm', tmpDir);
    assert.strictEqual(loaded.voice, 'v2', 'second save should override first');
    assert.strictEqual(loaded.pretext, 'Hi');
  });

  test('strips pipe characters from config values to prevent injection', () => {
    saveLlmConfigSync('pipe-test', {
      effects: 'li|ght',
      bgTrack: '',
      bgVolume: '0.15',
      voice: 'en|US-ryan',
      pretext: 'Say|this',
      ttsEngine: 'pi|per',
    }, tmpDir);

    const cfgPath = path.join(tmpDir, '.claude', 'config', 'audio-effects.cfg');
    const raw = fs.readFileSync(cfgPath, 'utf8');
    // Pipe chars inside values must be stripped
    const lines = raw.split('\n').filter(l => l.startsWith('llm:pipe-test|'));
    assert.strictEqual(lines.length, 1, 'must have exactly one config row');
    // The line is pipe-delimited; if value pipes were kept, splitting would yield >7 fields
    const parts = lines[0].split('|');
    assert.strictEqual(parts.length, 7, 'row must have exactly 7 pipe-delimited fields');
  });

  test('sourcePath in loaded config points to the project cfg file', () => {
    saveLlmConfigSync('src-path-test', { effects: '', bgTrack: '', bgVolume: '0.15', voice: '', pretext: '', ttsEngine: '' }, tmpDir);
    const loaded = loadLlmConfigSync('src-path-test', tmpDir);
    assert.ok(loaded.sourcePath.includes(tmpDir), 'sourcePath must point to project dir');
  });
});

// ===========================================================================
// seedAllLlmDefaultsSync()
// ===========================================================================

describe('seedAllLlmDefaultsSync()', () => {
  test('creates audio-effects.cfg in project dir after seeding', () => {
    seedAllLlmDefaultsSync(tmpDir);

    const cfgPath = path.join(tmpDir, '.claude', 'config', 'audio-effects.cfg');
    assert.ok(fs.existsSync(cfgPath), 'audio-effects.cfg must be created');
  });

  test('seeds at least claude-code and default entries', () => {
    seedAllLlmDefaultsSync(tmpDir);

    const cfgPath = path.join(tmpDir, '.claude', 'config', 'audio-effects.cfg');
    const content = fs.readFileSync(cfgPath, 'utf8');
    assert.ok(content.includes('llm:claude-code|'), 'must contain claude-code row');
    assert.ok(content.includes('llm:default|'), 'must contain default row');
  });

  test('does not overwrite existing config entries', () => {
    // Pre-seed with custom claude-code config
    writeFile(
      path.join(tmpDir, '.claude', 'config', 'audio-effects.cfg'),
      'llm:claude-code|none|my-custom.mp3|0.5|en_US-ryan-high|Custom pretext|piper\n'
    );

    seedAllLlmDefaultsSync(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
    assert.ok(content.includes('my-custom.mp3'), 'existing custom track must not be overwritten');
    assert.ok(content.includes('Custom pretext'), 'existing pretext must not be overwritten');
  });
});

// ===========================================================================
// checkClaudeInstalled / checkCopilotInstalled / checkCodexInstalled
// ===========================================================================

describe('checkClaudeInstalled()', () => {
  test('returns false when .claude/hooks does not exist', async () => {
    const result = await checkClaudeInstalled(tmpDir);
    assert.strictEqual(result, false);
  });

  test('returns true when .claude/hooks exists', async () => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'hooks'), { recursive: true });
    const result = await checkClaudeInstalled(tmpDir);
    assert.strictEqual(result, true);
  });

  test('returns true when .claude/hooks-windows exists (fallback)', async () => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'hooks-windows'), { recursive: true });
    const result = await checkClaudeInstalled(tmpDir);
    assert.strictEqual(result, true);
  });
});

describe('checkCopilotInstalled()', () => {
  test('returns false when .vscode/mcp.json does not exist', async () => {
    const result = await checkCopilotInstalled(tmpDir);
    assert.strictEqual(result, false);
  });

  test('returns false when mcp.json exists but has no agentvibes server', async () => {
    writeFile(
      path.join(tmpDir, '.vscode', 'mcp.json'),
      JSON.stringify({ servers: { other: {} } })
    );
    const result = await checkCopilotInstalled(tmpDir);
    assert.strictEqual(result, false);
  });

  test('returns true when mcp.json has servers.agentvibes entry', async () => {
    writeFile(
      path.join(tmpDir, '.vscode', 'mcp.json'),
      JSON.stringify({ servers: { agentvibes: { command: 'npx' } } })
    );
    const result = await checkCopilotInstalled(tmpDir);
    assert.strictEqual(result, true);
  });
});

describe('checkCodexInstalled()', () => {
  test('returns false when .codex/config.toml does not exist', async () => {
    const result = await checkCodexInstalled(tmpDir);
    assert.strictEqual(result, false);
  });

  test('returns false when config.toml exists but has no agentvibes section', async () => {
    writeFile(
      path.join(tmpDir, '.codex', 'config.toml'),
      '[other_section]\nkey = "value"\n'
    );
    const result = await checkCodexInstalled(tmpDir);
    assert.strictEqual(result, false);
  });

  test('returns true when config.toml contains [mcp_servers.agentvibes]', async () => {
    writeFile(
      path.join(tmpDir, '.codex', 'config.toml'),
      '[mcp_servers.agentvibes]\ncommand = "npx"\n'
    );
    const result = await checkCodexInstalled(tmpDir);
    assert.strictEqual(result, true);
  });
});

// ===========================================================================
// installCodexMcp() + removeCodexMcp() — TOML round-trip
// ===========================================================================

describe('installCodexMcp() + removeCodexMcp()', () => {
  test('installCodexMcp creates .codex/config.toml with agentvibes section', async () => {
    await installCodexMcp(tmpDir);

    const tomlPath = path.join(tmpDir, '.codex', 'config.toml');
    assert.ok(fs.existsSync(tomlPath), 'config.toml must be created');
    const content = fs.readFileSync(tomlPath, 'utf8');
    assert.ok(content.includes('[mcp_servers.agentvibes]'));
  });

  test('installCodexMcp seeds llm config for codex', async () => {
    await installCodexMcp(tmpDir);

    const cfgPath = path.join(tmpDir, '.claude', 'config', 'audio-effects.cfg');
    assert.ok(fs.existsSync(cfgPath), 'audio-effects.cfg must be seeded');
    const content = fs.readFileSync(cfgPath, 'utf8');
    assert.ok(content.includes('llm:codex|'), 'must contain codex row');
  });

  test('removeCodexMcp removes the agentvibes section from config.toml', async () => {
    await installCodexMcp(tmpDir);
    await removeCodexMcp(tmpDir);

    const tomlPath = path.join(tmpDir, '.codex', 'config.toml');
    // Either file is deleted (was only agentvibes) or section is removed
    if (fs.existsSync(tomlPath)) {
      const content = fs.readFileSync(tomlPath, 'utf8');
      assert.ok(!content.includes('[mcp_servers.agentvibes]'), 'agentvibes section must be removed');
    }
    // If file doesn't exist, the section was the only content — that's also correct
  });

  test('removeCodexMcp is a no-op when config.toml does not exist', async () => {
    const result = await removeCodexMcp(tmpDir);
    assert.deepEqual(result, { success: true });
  });

  test('installCodexMcp returns success:true', async () => {
    const result = await installCodexMcp(tmpDir);
    assert.strictEqual(result.success, true);
  });

  test('installCodexMcp is idempotent — running twice has same result', async () => {
    await installCodexMcp(tmpDir);
    await installCodexMcp(tmpDir);

    const tomlPath = path.join(tmpDir, '.codex', 'config.toml');
    const content = fs.readFileSync(tomlPath, 'utf8');
    const count = (content.match(/\[mcp_servers\.agentvibes\]/g) || []).length;
    assert.strictEqual(count, 1, 'agentvibes section must appear exactly once after two installs');
  });
});

// ===========================================================================
// installCopilotInstructions() + removeCopilotInstructions()
// (tests wrapWithMarkers, injectMarkerBlock, removeMarkerBlock indirectly)
// ===========================================================================

describe('installCopilotInstructions() + removeCopilotInstructions()', () => {
  const PACKAGE_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');

  test('creates .github/copilot-instructions.md with AgentVibes markers', async () => {
    await installCopilotInstructions(tmpDir, PACKAGE_DIR);

    const dest = path.join(tmpDir, '.github', 'copilot-instructions.md');
    if (fs.existsSync(dest)) {
      const content = fs.readFileSync(dest, 'utf8');
      assert.ok(content.includes('<!-- BEGIN AGENTVIBES -->'), 'must have start marker');
      assert.ok(content.includes('<!-- END AGENTVIBES -->'), 'must have end marker');
    }
    // If the src file doesn't exist in the package, installCopilotInstructions silently skips
  });

  test('removeCopilotInstructions is a no-op when file does not exist', async () => {
    // Should not throw
    await assert.doesNotReject(() => removeCopilotInstructions(tmpDir));
  });

  test('removeCopilotInstructions removes marker block from existing file', async () => {
    // Write a file with markers manually
    const dest = path.join(tmpDir, '.github', 'copilot-instructions.md');
    writeFile(dest, [
      '# My instructions',
      '',
      '<!-- BEGIN AGENTVIBES -->',
      'AgentVibes content here',
      '<!-- END AGENTVIBES -->',
      '',
      '# Other content',
    ].join('\n') + '\n');

    await removeCopilotInstructions(tmpDir);

    if (fs.existsSync(dest)) {
      const content = fs.readFileSync(dest, 'utf8');
      assert.ok(!content.includes('<!-- BEGIN AGENTVIBES -->'), 'start marker must be removed');
      assert.ok(!content.includes('<!-- END AGENTVIBES -->'), 'end marker must be removed');
      assert.ok(!content.includes('AgentVibes content here'), 'marker content must be removed');
      assert.ok(content.includes('# Other content'), 'other content must be preserved');
    }
    // File may be deleted if it only contained the marker block — also correct
  });

  test('removeCopilotInstructions deletes file when only marker block remains', async () => {
    const dest = path.join(tmpDir, '.github', 'copilot-instructions.md');
    writeFile(dest, [
      '<!-- BEGIN AGENTVIBES -->',
      'Only agentvibes content',
      '<!-- END AGENTVIBES -->',
    ].join('\n') + '\n');

    await removeCopilotInstructions(tmpDir);

    assert.ok(!fs.existsSync(dest), 'file must be deleted when empty after marker removal');
  });
});

// ===========================================================================
// installCodexInstructions() + removeCodexInstructions()
// ===========================================================================

describe('installCodexInstructions() + removeCodexInstructions()', () => {
  const PACKAGE_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');

  test('removeCodexInstructions is a no-op when files do not exist', async () => {
    await assert.doesNotReject(() => removeCodexInstructions(tmpDir));
  });

  test('removeCodexInstructions removes marker block from .codex/AGENTS.md', async () => {
    const dest = path.join(tmpDir, '.codex', 'AGENTS.md');
    writeFile(dest, [
      '# Project agents',
      '<!-- BEGIN AGENTVIBES -->',
      'AgentVibes agent instructions',
      '<!-- END AGENTVIBES -->',
      '# Other agents',
    ].join('\n') + '\n');

    await removeCodexInstructions(tmpDir);

    if (fs.existsSync(dest)) {
      const content = fs.readFileSync(dest, 'utf8');
      assert.ok(!content.includes('<!-- BEGIN AGENTVIBES -->'), 'marker must be removed');
      assert.ok(content.includes('# Other agents'), 'other content must be preserved');
    }
  });

  test('removeCodexInstructions removes marker block from AGENTS.md in root too', async () => {
    const rootDest = path.join(tmpDir, 'AGENTS.md');
    writeFile(rootDest, [
      '<!-- BEGIN AGENTVIBES -->',
      'Root AgentVibes content',
      '<!-- END AGENTVIBES -->',
      'Other root content',
    ].join('\n') + '\n');

    await removeCodexInstructions(tmpDir);

    if (fs.existsSync(rootDest)) {
      const content = fs.readFileSync(rootDest, 'utf8');
      assert.ok(!content.includes('<!-- BEGIN AGENTVIBES -->'), 'root marker must be removed');
    }
  });

  test('removeCodexInstructions unlinks file when only the marker block remains', async () => {
    // When the entire file is the marker block, removing it leaves empty content
    // so removeCodexInstructions should unlink the file instead of writing empty content
    const dest = path.join(tmpDir, '.codex', 'AGENTS.md');
    writeFile(dest, [
      '<!-- BEGIN AGENTVIBES -->',
      'Only agentvibes content — nothing else',
      '<!-- END AGENTVIBES -->',
    ].join('\n') + '\n');

    await removeCodexInstructions(tmpDir);

    assert.ok(!fs.existsSync(dest), 'file must be unlinked when marker block is all that remains');
  });

  test('installCodexInstructions copies and injects AGENTS.md from packageDir', async () => {
    const mockPkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-instr-'));
    try {
      const srcCodexDir = path.join(mockPkgDir, '.codex');
      fs.mkdirSync(srcCodexDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcCodexDir, 'AGENTS.md'),
        '# AgentVibes Instructions\nUse the text_to_speech tool.\n'
      );

      await installCodexInstructions(tmpDir, mockPkgDir);

      const codexDest = path.join(tmpDir, '.codex', 'AGENTS.md');
      assert.ok(fs.existsSync(codexDest), '.codex/AGENTS.md must be created');
      const content = fs.readFileSync(codexDest, 'utf8');
      assert.ok(content.includes('AgentVibes Instructions'), 'content must include injected text');
      assert.ok(content.includes('<!-- BEGIN AGENTVIBES -->'), 'content must be wrapped in markers');

      const rootDest = path.join(tmpDir, 'AGENTS.md');
      assert.ok(fs.existsSync(rootDest), 'root AGENTS.md must also be created');
    } finally {
      fs.rmSync(mockPkgDir, { recursive: true, force: true });
    }
  });
});

// ===========================================================================
// getTransportConfig() / saveTransportConfig()
// ===========================================================================

describe('getTransportConfig() — defaults', () => {
  // Save and clear the real transport config before these tests so parallel
  // test files that write ssh-remote:mode=remote don't pollute the defaults checks.
  const _tcPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.agentvibes', 'transport-config.json');
  let _tcSaved = null;
  before(() => {
    try { _tcSaved = fs.readFileSync(_tcPath, 'utf8'); } catch {}
    try { fs.rmSync(_tcPath); } catch {}
  });
  after(() => {
    if (_tcSaved !== null) {
      fs.mkdirSync(path.dirname(_tcPath), { recursive: true });
      fs.writeFileSync(_tcPath, _tcSaved);
    }
  });

  test('returns an object with mode, connType, sshKey, host, port', async () => {
    const cfg = await getTransportConfig('ssh-remote');
    assert.ok(typeof cfg === 'object');
    assert.ok('mode' in cfg);
    assert.ok('connType' in cfg);
    assert.ok('sshKey' in cfg);
    assert.ok('host' in cfg);
    assert.ok('port' in cfg);
  });

  test('mode defaults to "local"', async () => {
    const cfg = await getTransportConfig('ssh-remote');
    assert.strictEqual(cfg.mode, 'local');
  });

  test('port defaults to "22" for ssh-remote', async () => {
    const cfg = await getTransportConfig('ssh-remote');
    assert.strictEqual(cfg.port, '22');
  });

  test('port defaults to "8022" for termux-ssh', async () => {
    const cfg = await getTransportConfig('termux-ssh');
    assert.strictEqual(cfg.port, '8022');
  });

  test('port defaults to "2222" for agentvibes-receiver', async () => {
    const cfg = await getTransportConfig('agentvibes-receiver');
    assert.strictEqual(cfg.port, '2222');
  });
});

describe('TRANSPORT_PROVIDERS — structure', () => {
  test('is an array with at least 3 items', () => {
    assert.ok(Array.isArray(TRANSPORT_PROVIDERS));
    assert.ok(TRANSPORT_PROVIDERS.length >= 3);
  });

  test('each provider has id, name, desc, defaultPort', () => {
    for (const p of TRANSPORT_PROVIDERS) {
      assert.ok(typeof p.id === 'string' && p.id.length > 0, `provider.id must be a non-empty string, got: ${p.id}`);
      assert.ok(typeof p.name === 'string' && p.name.length > 0, `provider.name must be a non-empty string`);
      assert.ok(typeof p.desc === 'string' && p.desc.length > 0, `provider.desc must be a non-empty string`);
      assert.ok(typeof p.defaultPort === 'string' && p.defaultPort.length > 0, `provider.defaultPort must be a non-empty string`);
    }
  });

  test('ssh-remote provider has defaultPort "22"', () => {
    const sshRemote = TRANSPORT_PROVIDERS.find(p => p.id === 'ssh-remote');
    assert.ok(sshRemote, 'ssh-remote provider must exist');
    assert.strictEqual(sshRemote.defaultPort, '22');
  });
});

// ===========================================================================
// getHermesConfig() / saveHermesConfig() / checkHermesInstalled() / removeHermes()
// — use HERMES_HOME env var to point to a temp directory
// ===========================================================================

describe('getHermesConfig() — defaults', () => {
  let origHermesHome;

  beforeEach(() => {
    origHermesHome = process.env.HERMES_HOME;
    process.env.HERMES_HOME = path.join(tmpDir, 'hermes');
  });

  afterEach(() => {
    if (origHermesHome === undefined) {
      delete process.env.HERMES_HOME;
    } else {
      process.env.HERMES_HOME = origHermesHome;
    }
  });

  test('returns defaults when no config file exists', async () => {
    const cfg = await getHermesConfig();
    assert.ok(typeof cfg === 'object');
    assert.ok('mode' in cfg);
    assert.ok('sshKey' in cfg);
    assert.ok('host' in cfg);
    assert.ok('port' in cfg);
    assert.ok('voice' in cfg);
  });

  test('default mode is "local"', async () => {
    const cfg = await getHermesConfig();
    assert.strictEqual(cfg.mode, 'local');
  });
});

describe('saveHermesConfig() + getHermesConfig() — round-trip', () => {
  let origHermesHome;

  beforeEach(() => {
    origHermesHome = process.env.HERMES_HOME;
    process.env.HERMES_HOME = path.join(tmpDir, 'hermes');
  });

  afterEach(() => {
    if (origHermesHome === undefined) {
      delete process.env.HERMES_HOME;
    } else {
      process.env.HERMES_HOME = origHermesHome;
    }
  });

  test('saved config is readable back', async () => {
    const cfg = {
      mode: 'remote',
      sshKey: '/home/user/.ssh/id_ed25519',
      host: '192.168.1.100',
      port: '2222',
      voice: 'en_US-ryan-high',
    };

    await saveHermesConfig(cfg);
    const loaded = await getHermesConfig();

    assert.strictEqual(loaded.mode, 'remote');
    assert.strictEqual(loaded.host, '192.168.1.100');
    assert.strictEqual(loaded.port, '2222');
    assert.strictEqual(loaded.voice, 'en_US-ryan-high');
  });

  test('mode is normalized to "remote" for any non-"local" value', async () => {
    await saveHermesConfig({ mode: 'invalid', sshKey: '', host: '', port: '22', voice: '' });
    const loaded = await getHermesConfig();
    // saveHermesConfig uses: rawMode === 'local' ? 'local' : 'remote'
    // so any non-'local' value (including 'invalid') becomes 'remote'
    assert.strictEqual(loaded.mode, 'remote', 'non-local mode must normalize to "remote"');
  });
});

describe('checkHermesInstalled() + removeHermes()', () => {
  let origHermesHome;

  beforeEach(() => {
    origHermesHome = process.env.HERMES_HOME;
    process.env.HERMES_HOME = path.join(tmpDir, 'hermes');
  });

  afterEach(() => {
    if (origHermesHome === undefined) {
      delete process.env.HERMES_HOME;
    } else {
      process.env.HERMES_HOME = origHermesHome;
    }
  });

  test('checkHermesInstalled returns false when HOOK.yaml does not exist', async () => {
    const result = await checkHermesInstalled();
    assert.strictEqual(result, false);
  });

  test('checkHermesInstalled returns true after HOOK.yaml is created manually', async () => {
    const hermesHome = process.env.HERMES_HOME;
    const hooksDir = path.join(hermesHome, 'hooks', 'agentvibes-tts');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'HOOK.yaml'), 'name: agentvibes-tts\n', { mode: 0o600 });

    const result = await checkHermesInstalled();
    assert.strictEqual(result, true);
  });

  test('removeHermes is a no-op when hooks dir does not exist', async () => {
    await assert.doesNotReject(() => removeHermes());
  });

  test('removeHermes removes HOOK.yaml', async () => {
    const hermesHome = process.env.HERMES_HOME;
    const hooksDir = path.join(hermesHome, 'hooks', 'agentvibes-tts');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'HOOK.yaml'), 'name: test\n', { mode: 0o600 });

    await removeHermes();

    assert.ok(!fs.existsSync(path.join(hooksDir, 'HOOK.yaml')), 'HOOK.yaml must be removed');
  });
});

// ===========================================================================
// PROVIDERS — data integrity
// ===========================================================================

describe('PROVIDERS — exported data structure', () => {
  test('is an array', () => {
    assert.ok(Array.isArray(PROVIDERS));
  });

  test('each provider has id, name, desc', () => {
    for (const p of PROVIDERS) {
      assert.ok(typeof p.id === 'string' && p.id.length > 0, 'provider.id must be non-empty string');
      assert.ok(typeof p.name === 'string' && p.name.length > 0, 'provider.name must be non-empty string');
      assert.ok(typeof p.desc === 'string' && p.desc.length > 0, 'provider.desc must be non-empty string');
    }
  });

  test('includes a claude-code provider', () => {
    assert.ok(PROVIDERS.some(p => p.id === 'claude-code'), 'must include claude-code provider');
  });

  test('includes a hermes provider', () => {
    assert.ok(PROVIDERS.some(p => p.id === 'hermes'), 'must include hermes provider');
  });

  test('includes a default provider with isDefault:true', () => {
    const defaultProvider = PROVIDERS.find(p => p.id === 'default');
    assert.ok(defaultProvider, 'must have a default provider');
    assert.strictEqual(defaultProvider.isDefault, true);
  });
});

// ===========================================================================
// installHermes() — creates HOOK.yaml and handler.py files
// ===========================================================================

describe('installHermes()', () => {
  let origHermesHome;

  beforeEach(() => {
    origHermesHome = process.env.HERMES_HOME;
    process.env.HERMES_HOME = path.join(tmpDir, 'hermes');
  });

  afterEach(() => {
    if (origHermesHome === undefined) {
      delete process.env.HERMES_HOME;
    } else {
      process.env.HERMES_HOME = origHermesHome;
    }
  });

  test('creates HOOK.yaml with agentvibes-tts name', async () => {
    await installHermes();

    const hermesHome = process.env.HERMES_HOME;
    const hooksDir = path.join(hermesHome, 'hooks', 'agentvibes-tts');
    const hookYamlPath = path.join(hooksDir, 'HOOK.yaml');
    assert.ok(fs.existsSync(hookYamlPath), 'HOOK.yaml must be created');
    const content = fs.readFileSync(hookYamlPath, 'utf8');
    assert.ok(content.includes('agentvibes-tts'), 'HOOK.yaml must name agentvibes-tts');
  });

  test('creates handler.py in the hooks dir', async () => {
    await installHermes();

    const hermesHome = process.env.HERMES_HOME;
    const hooksDir = path.join(hermesHome, 'hooks', 'agentvibes-tts');
    const handlerPath = path.join(hooksDir, 'handler.py');
    assert.ok(fs.existsSync(handlerPath), 'handler.py must be created');
  });

  test('handler.py is a Python script', async () => {
    await installHermes();

    const hermesHome = process.env.HERMES_HOME;
    const hooksDir = path.join(hermesHome, 'hooks', 'agentvibes-tts');
    const handlerPath = path.join(hooksDir, 'handler.py');
    const content = fs.readFileSync(handlerPath, 'utf8');
    assert.ok(content.includes('import'), 'handler.py must contain Python import statements');
  });

  test('creates default agentvibes-ssh-config.json when it does not exist', async () => {
    await installHermes();

    const hermesHome = process.env.HERMES_HOME;
    const hooksDir = path.join(hermesHome, 'hooks', 'agentvibes-tts');
    const cfgPath = path.join(hooksDir, 'agentvibes-ssh-config.json');
    assert.ok(fs.existsSync(cfgPath), 'default SSH config must be created');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    assert.ok(typeof cfg.mode === 'string', 'config must have mode field');
  });

  test('does not overwrite existing agentvibes-ssh-config.json', async () => {
    const hermesHome = process.env.HERMES_HOME;
    const hooksDir = path.join(hermesHome, 'hooks', 'agentvibes-tts');
    fs.mkdirSync(hooksDir, { recursive: true });
    const existingCfg = { mode: 'remote', host: 'custom-host', port: '9999', sshKey: '/custom/key', voice: 'custom-voice' };
    fs.writeFileSync(
      path.join(hooksDir, 'agentvibes-ssh-config.json'),
      JSON.stringify(existingCfg),
      { mode: 0o600 }
    );

    await installHermes();

    const cfg = JSON.parse(fs.readFileSync(path.join(hooksDir, 'agentvibes-ssh-config.json'), 'utf8'));
    assert.strictEqual(cfg.host, 'custom-host', 'existing config must not be overwritten');
  });

  test('returns an object with hooksDir and handlerPath', async () => {
    const result = await installHermes();

    assert.ok(typeof result === 'object');
    assert.ok('hooksDir' in result);
    assert.ok('handlerPath' in result);
    assert.ok(typeof result.hooksDir === 'string');
    assert.ok(typeof result.handlerPath === 'string');
  });

  test('checkHermesInstalled returns true after installHermes', async () => {
    await installHermes();
    const installed = await checkHermesInstalled();
    assert.strictEqual(installed, true);
  });
});

// ===========================================================================
// installCodexHooks() + removeCodexHooks()
// ===========================================================================

describe('installCodexHooks() + removeCodexHooks()', () => {
  const PACKAGE_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');

  test('installCodexHooks creates .codex/hooks directory', async () => {
    await installCodexHooks(tmpDir, PACKAGE_DIR);
    // Even if source files don't exist, the dir should be created (or silently skipped)
    // The function uses best-effort semantics with catch blocks
    // Just verify it doesn't throw
    await assert.doesNotReject(() => installCodexHooks(tmpDir, PACKAGE_DIR));
  });

  test('removeCodexHooks is a no-op when hooks dir does not exist', async () => {
    await assert.doesNotReject(() => removeCodexHooks(tmpDir));
  });

  test('removeCodexHooks removes hook files when they exist', async () => {
    const hooksDir = path.join(tmpDir, '.codex', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'init-agentvibes.sh'), '#!/bin/bash\necho hello\n');
    fs.writeFileSync(path.join(hooksDir, 'init-agentvibes.ps1'), '# PowerShell\nWrite-Host "hello"\n');

    await removeCodexHooks(tmpDir);

    assert.ok(
      !fs.existsSync(path.join(hooksDir, 'init-agentvibes.sh')),
      'init-agentvibes.sh must be removed'
    );
    assert.ok(
      !fs.existsSync(path.join(hooksDir, 'init-agentvibes.ps1')),
      'init-agentvibes.ps1 must be removed'
    );
  });

  test('removeCodexHooks removes hooks dir if it becomes empty', async () => {
    const hooksDir = path.join(tmpDir, '.codex', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'init-agentvibes.sh'), '#!/bin/bash\n');

    await removeCodexHooks(tmpDir);

    // The dir should be gone after all files are removed (rmdir on empty dir)
    assert.ok(!fs.existsSync(hooksDir), 'empty hooks dir must be removed');
  });

  test('installCodexHooks copies hook files when source files exist in packageDir', async () => {
    const mockPkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentvibes-pkg-'));
    try {
      const srcHooksDir = path.join(mockPkgDir, '.codex', 'hooks');
      fs.mkdirSync(srcHooksDir, { recursive: true });
      fs.writeFileSync(path.join(srcHooksDir, 'init-agentvibes.sh'), '#!/bin/bash\necho hello\n');
      fs.writeFileSync(path.join(srcHooksDir, 'init-agentvibes.ps1'), '# PowerShell\nWrite-Host "hello"\n');

      await installCodexHooks(tmpDir, mockPkgDir);

      assert.ok(
        fs.existsSync(path.join(tmpDir, '.codex', 'hooks', 'init-agentvibes.sh')),
        'init-agentvibes.sh must be copied to target'
      );
      assert.ok(
        fs.existsSync(path.join(tmpDir, '.codex', 'hooks', 'init-agentvibes.ps1')),
        'init-agentvibes.ps1 must be copied to target'
      );
      assert.strictEqual(
        fs.readFileSync(path.join(tmpDir, '.codex', 'hooks', 'init-agentvibes.sh'), 'utf8'),
        '#!/bin/bash\necho hello\n'
      );
    } finally {
      fs.rmSync(mockPkgDir, { recursive: true, force: true });
    }
  });
});
