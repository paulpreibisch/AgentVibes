/**
 * Extended tests for llm-provider-service.js
 *
 * Targets previously-uncovered functions:
 *   - buildCodexToml()              — TOML string building
 *   - installCopilotMcp()           — writes .vscode/mcp.json (file I/O)
 *   - removeCopilotMcp()            — removes agentvibes from .vscode/mcp.json
 *   - getHermesConfig()             — reads SSH config from file
 *   - saveHermesConfig()            — writes SSH config to file with validation
 *   - getTransportConfig()          — reads transport config from file
 *   - saveTransportConfig()         — writes transport config with host-file side-effect
 *   - wrapWithMarkers / injectMarkerBlock / removeMarkerBlock (via install/removeCopilotInstructions)
 *   - resolveCfgPath()              — picks project vs global config path
 *   - checkCodexInstalled()         — reads .codex/config.toml
 *   - checkCopilotInstalled()       — reads .vscode/mcp.json
 *   - checkClaudeInstalled()        — checks .claude/hooks presence
 *   - removeCodexMcp()              — removes agentvibes section from TOML
 *   - loadLlmConfigSync (old format) — 6-field rows (ttsEngine absent)
 *
 * Does NOT test:
 *   - installClaudeMcp (spawns installer.js sub-imports with side-effects)
 *   - installCodexHooks / removeCodexHooks (copies real package files)
 *   - installHermes / removeHermes (writes large Python handler blobs)
 *   - uninstallClaude (requires full directory tree from installer.js)
 */

import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';

import {
  buildCodexToml,
  installCopilotMcp,
  removeCopilotMcp,
  getHermesConfig,
  saveHermesConfig,
  getTransportConfig,
  saveTransportConfig,
  checkCodexInstalled,
  checkCopilotInstalled,
  checkClaudeInstalled,
  removeCodexMcp,
  loadLlmConfigSync,
  resolveCfgPath,
  installCopilotInstructions,
  removeCopilotInstructions,
  TRANSPORT_PROVIDERS,
  PROVIDERS,
} from '../../src/services/llm-provider-service.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTempDir(prefix = 'av-ext-test-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function makeProjectDir() {
  const dir = makeTempDir();
  mkdirSync(join(dir, '.claude', 'config'), { recursive: true });
  return dir;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildCodexToml — pure TOML string builder
// ─────────────────────────────────────────────────────────────────────────────

describe('buildCodexToml — pure TOML building', () => {
  test('empty input → minimal agentvibes block', () => {
    const toml = buildCodexToml('');
    assert.match(toml, /\[mcp_servers\.agentvibes\]/);
    assert.match(toml, /command = "npx"/);
    assert.match(toml, /AGENTVIBES_LLM = "codex"/);
    assert.ok(toml.endsWith('\n'), 'result must end with newline');
  });

  test('no-arg call (undefined) behaves the same as empty string', () => {
    const toml = buildCodexToml();
    assert.match(toml, /\[mcp_servers\.agentvibes\]/);
    assert.match(toml, /AGENTVIBES_LLM = "codex"/);
  });

  test('whitespace-only input is treated as empty', () => {
    const toml = buildCodexToml('   \n\t  ');
    assert.match(toml, /\[mcp_servers\.agentvibes\]/);
    // should not have a leading blank chunk before the block
    assert.ok(!toml.startsWith('\n\n'), 'should not have leading blank lines for empty input');
  });

  test('existing content is preserved before the new block', () => {
    const existing = '[some_section]\nkey = "value"\n';
    const toml = buildCodexToml(existing);
    assert.match(toml, /\[some_section\]/);
    assert.match(toml, /key = "value"/);
    assert.match(toml, /\[mcp_servers\.agentvibes\]/);
    // existing section must come BEFORE the agentvibes block
    const sectionIdx = toml.indexOf('[some_section]');
    const avIdx = toml.indexOf('[mcp_servers.agentvibes]');
    assert.ok(sectionIdx < avIdx, 'existing content must precede agentvibes block');
  });

  test('existing agentvibes block is replaced, not duplicated', () => {
    const existing = [
      '[mcp_servers.agentvibes]',
      'command = "old-command"',
      'env = { AGENTVIBES_LLM = "old-value" }',
    ].join('\n') + '\n';
    const toml = buildCodexToml(existing);
    // must appear exactly once
    const count = (toml.match(/\[mcp_servers\.agentvibes\]/g) || []).length;
    assert.strictEqual(count, 1, 'agentvibes block must appear exactly once after rebuild');
    assert.doesNotMatch(toml, /old-command/, 'stale command must be replaced');
    assert.match(toml, /AGENTVIBES_LLM = "codex"/, 'fresh env key must be present');
  });

  test('agentvibes block replaced while preserving other sections', () => {
    const existing = [
      '[other_section]',
      'foo = "bar"',
      '',
      '[mcp_servers.agentvibes]',
      'command = "stale"',
      '',
      '[third_section]',
      'baz = 1',
    ].join('\n') + '\n';
    const toml = buildCodexToml(existing);
    assert.match(toml, /\[other_section\]/);
    assert.match(toml, /foo = "bar"/);
    // third_section appears after agentvibes — after removal it should still be present
    assert.match(toml, /\[third_section\]/);
    assert.match(toml, /baz = 1/);
    assert.match(toml, /command = "npx"/, 'fresh npx command must be present');
  });

  test('args line contains required npx flags', () => {
    const toml = buildCodexToml();
    assert.match(toml, /args = \["-y", "--package=agentvibes", "agentvibes-mcp-server"\]/);
  });

  test('result always ends with a trailing newline', () => {
    assert.ok(buildCodexToml('').endsWith('\n'));
    assert.ok(buildCodexToml('[existing]\nk = 1\n').endsWith('\n'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// installCopilotMcp / removeCopilotMcp — file I/O for .vscode/mcp.json
// ─────────────────────────────────────────────────────────────────────────────

describe('installCopilotMcp — writes .vscode/mcp.json', () => {
  // Override HOME so the ~/.copilot write goes to a temp dir
  let origHome;
  let homeTemp;
  let targetDir;

  before(() => {
    origHome = process.env.HOME;
    homeTemp = makeTempDir('av-copilot-home-');
    process.env.HOME = homeTemp;
    process.env.COPILOT_HOME = join(homeTemp, '.copilot');
  });

  after(() => {
    process.env.HOME = origHome;
    delete process.env.COPILOT_HOME;
    rmSync(homeTemp, { recursive: true, force: true });
  });

  afterEach(() => {
    if (targetDir) {
      rmSync(targetDir, { recursive: true, force: true });
      targetDir = null;
    }
  });

  test('creates .vscode/mcp.json from scratch', async () => {
    targetDir = makeTempDir();
    const result = await installCopilotMcp(targetDir);
    assert.equal(result.success, true);
    const mcpPath = join(targetDir, '.vscode', 'mcp.json');
    assert.ok(existsSync(mcpPath), '.vscode/mcp.json must be created');
    const parsed = JSON.parse(readFileSync(mcpPath, 'utf8'));
    assert.ok(parsed.servers?.agentvibes, 'agentvibes server entry must exist');
    assert.equal(parsed.servers.agentvibes.env.AGENTVIBES_LLM, 'copilot');
    assert.equal(parsed.servers.agentvibes.command, 'npx');
  });

  test('merges into existing .vscode/mcp.json preserving other servers', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    const existing = { servers: { 'other-server': { command: 'foo', args: [] } } };
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify(existing, null, 2));

    await installCopilotMcp(targetDir);

    const parsed = JSON.parse(readFileSync(join(targetDir, '.vscode', 'mcp.json'), 'utf8'));
    assert.ok(parsed.servers['other-server'], 'pre-existing server must be preserved');
    assert.ok(parsed.servers.agentvibes, 'agentvibes must be added');
  });

  test('removes stale agentvibes-copilot key on install', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    const existing = {
      servers: {
        'agentvibes-copilot': { command: 'old' },
        'agentvibes': { command: 'older' },
      },
    };
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify(existing, null, 2));

    await installCopilotMcp(targetDir);

    const parsed = JSON.parse(readFileSync(join(targetDir, '.vscode', 'mcp.json'), 'utf8'));
    assert.ok(!parsed.servers['agentvibes-copilot'], 'stale agentvibes-copilot key must be removed');
    assert.ok(parsed.servers.agentvibes, 'fresh agentvibes key must be present');
  });

  test('adds type=stdio field', async () => {
    targetDir = makeTempDir();
    const result = await installCopilotMcp(targetDir);
    assert.equal(result.success, true);
    const parsed = JSON.parse(readFileSync(join(targetDir, '.vscode', 'mcp.json'), 'utf8'));
    assert.equal(parsed.servers.agentvibes.type, 'stdio');
  });
});

describe('removeCopilotMcp — cleans .vscode/mcp.json', () => {
  let targetDir;

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('removes agentvibes from file with multiple servers', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    const existing = {
      servers: {
        agentvibes: { command: 'npx' },
        keeper: { command: 'keep-me' },
      },
    };
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify(existing, null, 2));

    const result = await removeCopilotMcp(targetDir);
    assert.equal(result.success, true);
    const parsed = JSON.parse(readFileSync(join(targetDir, '.vscode', 'mcp.json'), 'utf8'));
    assert.ok(!parsed.servers.agentvibes, 'agentvibes must be removed');
    assert.ok(parsed.servers.keeper, 'other servers must be preserved');
  });

  test('deletes file entirely when agentvibes is the only server', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    const existing = { servers: { agentvibes: { command: 'npx' } } };
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify(existing, null, 2));

    const result = await removeCopilotMcp(targetDir);
    assert.equal(result.success, true);
    assert.ok(!existsSync(join(targetDir, '.vscode', 'mcp.json')), 'file must be deleted when empty');
  });

  test('succeeds gracefully when file does not exist', async () => {
    targetDir = makeTempDir();
    const result = await removeCopilotMcp(targetDir);
    assert.equal(result.success, true);
  });

  test('removes legacy agentvibes-copilot key as well', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    const existing = {
      servers: {
        'agentvibes-copilot': { command: 'old' },
        keeper: { command: 'keep' },
      },
    };
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify(existing, null, 2));

    await removeCopilotMcp(targetDir);

    const parsed = JSON.parse(readFileSync(join(targetDir, '.vscode', 'mcp.json'), 'utf8'));
    assert.ok(!parsed.servers['agentvibes-copilot'], 'legacy key must be removed');
    assert.ok(parsed.servers.keeper, 'other server must remain');
  });

  test('handles malformed JSON gracefully (returns success)', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), 'not valid json');
    const result = await removeCopilotMcp(targetDir);
    assert.equal(result.success, true);
  });

  test('handles non-object root gracefully', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify([1, 2, 3]));
    const result = await removeCopilotMcp(targetDir);
    assert.equal(result.success, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getHermesConfig / saveHermesConfig
// ─────────────────────────────────────────────────────────────────────────────

describe('getHermesConfig / saveHermesConfig', () => {
  let hermesTemp;
  let origHermesHome;

  before(() => {
    origHermesHome = process.env.HERMES_HOME;
    hermesTemp = makeTempDir('av-hermes-');
    process.env.HERMES_HOME = hermesTemp;
  });

  after(() => {
    if (origHermesHome !== undefined) {
      process.env.HERMES_HOME = origHermesHome;
    } else {
      delete process.env.HERMES_HOME;
    }
    rmSync(hermesTemp, { recursive: true, force: true });
  });

  test('getHermesConfig returns defaults when no file exists', async () => {
    const cfg = await getHermesConfig();
    assert.equal(cfg.mode, 'local');
    assert.ok(cfg.sshKey, 'sshKey default must be non-empty');
    assert.ok(cfg.host, 'host default must be non-empty');
    assert.ok(cfg.port, 'port default must be non-empty');
    assert.ok(cfg.voice, 'voice default must be non-empty');
  });

  test('saveHermesConfig writes file and returns sanitized config', async () => {
    const input = {
      mode: 'remote',
      sshKey: '/home/user/.ssh/id_ed25519',
      host: '100.64.0.1',
      port: '2222',
      voice: 'en_US-libritts-high::Leo-8',
    };
    const saved = await saveHermesConfig(input);
    assert.equal(saved.mode, 'remote');
    assert.equal(saved.host, '100.64.0.1');
    assert.equal(saved.port, '2222');

    // round-trip: getHermesConfig should now return saved values
    const loaded = await getHermesConfig();
    assert.equal(loaded.mode, 'remote');
    assert.equal(loaded.host, '100.64.0.1');
    assert.equal(loaded.port, '2222');
    assert.equal(loaded.sshKey, '/home/user/.ssh/id_ed25519');
  });

  test('saveHermesConfig normalises unknown mode to "remote"', async () => {
    const saved = await saveHermesConfig({ mode: 'bogus', sshKey: '/k', host: 'h', port: '22', voice: 'v' });
    assert.equal(saved.mode, 'remote', 'unknown mode must normalise to "remote"');
  });

  test('saveHermesConfig normalises "local" mode correctly', async () => {
    const saved = await saveHermesConfig({ mode: 'local', sshKey: '/k', host: 'h', port: '22', voice: 'v' });
    assert.equal(saved.mode, 'local');
  });

  test('getHermesConfig merges saved values over defaults', async () => {
    await saveHermesConfig({ mode: 'local', sshKey: '/custom/key', host: 'myhost', port: '9999', voice: 'custom-voice' });
    const cfg = await getHermesConfig();
    assert.equal(cfg.sshKey, '/custom/key');
    assert.equal(cfg.host, 'myhost');
    assert.equal(cfg.port, '9999');
    assert.equal(cfg.voice, 'custom-voice');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTransportConfig / saveTransportConfig
// ─────────────────────────────────────────────────────────────────────────────

describe('getTransportConfig / saveTransportConfig', () => {
  // We need to override _TRANSPORT_CFG_PATH indirectly by overriding HOME
  // since the path is computed at module evaluation time using process.env.HOME.
  // Re-importing the module won't work (ESM cache), so instead we exercise the
  // functions as-is and accept that the real ~/.agentvibes/ path may be used.
  // To avoid polluting real HOME, we redirect HOME before importing (module
  // already imported) — instead test the observable file-level behaviour by
  // checking the HOME-based path if it's not writable, or just assert the
  // function contract directly.
  //
  // Since the module is already loaded with the original HOME, we test against
  // the real _TRANSPORT_CFG_PATH but use afterEach to restore.

  // Determine the cfg path the module will actually write to
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const transportCfgPath = join(homeDir, '.agentvibes', 'transport-config.json');
  let originalContent = null;

  before(() => {
    // Preserve any existing transport config
    try {
      originalContent = readFileSync(transportCfgPath, 'utf8');
    } catch { /* not present */ }
  });

  after(() => {
    // Restore original state
    if (originalContent !== null) {
      mkdirSync(join(homeDir, '.agentvibes'), { recursive: true });
      writeFileSync(transportCfgPath, originalContent);
    } else {
      try { rmSync(transportCfgPath); } catch { /* already gone */ }
    }
  });

  test('getTransportConfig returns defaults when no file exists', async () => {
    // Write a known-empty state first
    try { rmSync(transportCfgPath); } catch { /* ok */ }
    const cfg = await getTransportConfig('ssh-remote');
    assert.equal(cfg.mode, 'local');
    assert.equal(cfg.connType, 'manual');
    assert.equal(cfg.port, '22', 'ssh-remote default port must be 22');
  });

  test('getTransportConfig uses correct default port per provider', async () => {
    try { rmSync(transportCfgPath); } catch { /* ok */ }
    const agentVibesCfg = await getTransportConfig('agentvibes-receiver');
    assert.equal(agentVibesCfg.port, '2222');

    const termuxCfg = await getTransportConfig('termux-ssh');
    assert.equal(termuxCfg.port, '8022');
  });

  test('saveTransportConfig persists values and round-trips', async () => {
    const input = {
      mode: 'remote',
      connType: 'manual',
      sshKey: '/home/user/.ssh/id_rsa',
      host: '10.0.0.5',
      port: '2022',
    };
    const saved = await saveTransportConfig('ssh-remote', input);
    assert.equal(saved.mode, 'remote');
    assert.equal(saved.host, '10.0.0.5');
    assert.equal(saved.port, '2022');
    assert.equal(saved.sshKey, '/home/user/.ssh/id_rsa');

    const loaded = await getTransportConfig('ssh-remote');
    assert.equal(loaded.mode, 'remote');
    assert.equal(loaded.host, '10.0.0.5');
    assert.equal(loaded.port, '2022');
  });

  test('saveTransportConfig normalises unknown mode to "local"', async () => {
    const saved = await saveTransportConfig('ssh-remote', {
      mode: 'nonsense', connType: 'manual', sshKey: '', host: 'h', port: '22',
    });
    assert.equal(saved.mode, 'local', 'unknown mode must be normalised to local');
  });

  test('saveTransportConfig sets port to empty string in alias mode', async () => {
    const saved = await saveTransportConfig('ssh-remote', {
      mode: 'remote', connType: 'alias', sshKey: '', host: 'my-alias', port: '9999',
    });
    assert.equal(saved.connType, 'alias');
    assert.equal(saved.port, '', 'alias mode must persist empty port');
  });

  test('saveTransportConfig preserves other provider configs when updating one', async () => {
    // Write ssh-remote first
    await saveTransportConfig('ssh-remote', { mode: 'remote', connType: 'manual', sshKey: '', host: 'host-a', port: '22' });
    // Then write termux-ssh
    await saveTransportConfig('termux-ssh', { mode: 'remote', connType: 'manual', sshKey: '', host: 'host-b', port: '8022' });

    // ssh-remote should still be there
    const sshCfg = await getTransportConfig('ssh-remote');
    assert.equal(sshCfg.host, 'host-a', 'ssh-remote host must be preserved');

    const termuxCfg = await getTransportConfig('termux-ssh');
    assert.equal(termuxCfg.host, 'host-b', 'termux-ssh host must be stored');
  });

  test('saveTransportConfig writes backward-compat host file when host is set', async () => {
    const claudeDir = join(homeDir, '.claude');
    await saveTransportConfig('ssh-remote', {
      mode: 'remote', connType: 'manual', sshKey: '', host: 'my-remote-host', port: '22',
    });
    const hostFilePath = join(claudeDir, 'ssh-remote-host.txt');
    assert.ok(existsSync(hostFilePath), 'ssh-remote-host.txt must be written');
    const content = readFileSync(hostFilePath, 'utf8');
    assert.ok(content.includes('my-remote-host'), 'host file must contain the host value');
  });

  test('TRANSPORT_PROVIDERS exported array contains expected providers', () => {
    const ids = TRANSPORT_PROVIDERS.map(p => p.id);
    assert.ok(ids.includes('ssh-remote'));
    assert.ok(ids.includes('agentvibes-receiver'));
    assert.ok(ids.includes('termux-ssh'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkCodexInstalled / checkCopilotInstalled / checkClaudeInstalled
// ─────────────────────────────────────────────────────────────────────────────

describe('checkCodexInstalled', () => {
  let targetDir;

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('returns false when .codex/config.toml does not exist', async () => {
    targetDir = makeTempDir();
    assert.equal(await checkCodexInstalled(targetDir), false);
  });

  test('returns false when config.toml exists but lacks agentvibes block', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.codex'), { recursive: true });
    writeFileSync(join(targetDir, '.codex', 'config.toml'), '[other_section]\nfoo = "bar"\n');
    assert.equal(await checkCodexInstalled(targetDir), false);
  });

  test('returns true when config.toml contains [mcp_servers.agentvibes]', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.codex'), { recursive: true });
    writeFileSync(join(targetDir, '.codex', 'config.toml'), buildCodexToml());
    assert.equal(await checkCodexInstalled(targetDir), true);
  });
});

describe('checkCopilotInstalled', () => {
  let targetDir;

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('returns false when .vscode/mcp.json does not exist', async () => {
    targetDir = makeTempDir();
    assert.equal(await checkCopilotInstalled(targetDir), false);
  });

  test('returns false when mcp.json has no servers.agentvibes entry', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify({ servers: {} }));
    assert.equal(await checkCopilotInstalled(targetDir), false);
  });

  test('returns true when mcp.json has servers.agentvibes entry', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    const mcp = { servers: { agentvibes: { command: 'npx', type: 'stdio', args: [], env: {} } } };
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), JSON.stringify(mcp));
    assert.equal(await checkCopilotInstalled(targetDir), true);
  });

  test('returns false when mcp.json is malformed', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.vscode'), { recursive: true });
    writeFileSync(join(targetDir, '.vscode', 'mcp.json'), 'not json at all');
    assert.equal(await checkCopilotInstalled(targetDir), false);
  });
});

describe('checkClaudeInstalled', () => {
  let targetDir;

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('returns false when neither hooks dir exists', async () => {
    targetDir = makeTempDir();
    assert.equal(await checkClaudeInstalled(targetDir), false);
  });

  test('returns true when .claude/hooks exists', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.claude', 'hooks'), { recursive: true });
    assert.equal(await checkClaudeInstalled(targetDir), true);
  });

  test('returns true when .claude/hooks-windows exists (fallback)', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.claude', 'hooks-windows'), { recursive: true });
    assert.equal(await checkClaudeInstalled(targetDir), true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeCodexMcp — strips agentvibes section from .codex/config.toml
// ─────────────────────────────────────────────────────────────────────────────

describe('removeCodexMcp', () => {
  let targetDir;

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('removes agentvibes section from toml that also has other sections', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.codex'), { recursive: true });
    const toml = [
      '[other_section]',
      'key = "val"',
      '',
      '[mcp_servers.agentvibes]',
      'command = "npx"',
      'args = ["-y"]',
      '',
    ].join('\n');
    writeFileSync(join(targetDir, '.codex', 'config.toml'), toml);

    const result = await removeCodexMcp(targetDir);
    assert.equal(result.success, true);
    const content = readFileSync(join(targetDir, '.codex', 'config.toml'), 'utf8');
    assert.ok(content.includes('[other_section]'), 'other section must be preserved');
    assert.ok(!content.includes('[mcp_servers.agentvibes]'), 'agentvibes section must be removed');
  });

  test('deletes file entirely when agentvibes is the only content', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.codex'), { recursive: true });
    writeFileSync(join(targetDir, '.codex', 'config.toml'), buildCodexToml(''));

    const result = await removeCodexMcp(targetDir);
    assert.equal(result.success, true);
    assert.ok(!existsSync(join(targetDir, '.codex', 'config.toml')), 'file must be deleted when empty');
  });

  test('returns success when file does not exist', async () => {
    targetDir = makeTempDir();
    const result = await removeCodexMcp(targetDir);
    assert.equal(result.success, true);
  });

  test('section following agentvibes is preserved', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.codex'), { recursive: true });
    const toml = [
      '[mcp_servers.agentvibes]',
      'command = "npx"',
      '',
      '[other_section]',
      'key = "preserved"',
    ].join('\n') + '\n';
    writeFileSync(join(targetDir, '.codex', 'config.toml'), toml);

    await removeCodexMcp(targetDir);

    const content = readFileSync(join(targetDir, '.codex', 'config.toml'), 'utf8');
    assert.ok(content.includes('[other_section]'), 'section after agentvibes must be preserved');
    assert.ok(content.includes('key = "preserved"'));
    assert.ok(!content.includes('[mcp_servers.agentvibes]'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveCfgPath — picks project vs global config
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveCfgPath', () => {
  let targetDir;

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('returns project config path when local file exists', () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.claude', 'config'), { recursive: true });
    const cfgPath = join(targetDir, '.claude', 'config', 'audio-effects.cfg');
    writeFileSync(cfgPath, 'llm:claude-code|light||0.15|voice||piper\n');

    const resolved = resolveCfgPath(targetDir);
    assert.equal(resolved, cfgPath, 'should resolve to the local project config');
  });

  test('returns global config path when local file does not exist', () => {
    targetDir = makeTempDir();
    // Ensure there is no local .claude/config/audio-effects.cfg
    const resolved = resolveCfgPath(targetDir);
    // Should point into HOME-based path, not the targetDir
    assert.ok(!resolved.startsWith(targetDir), 'should not resolve to the local (non-existent) config');
    assert.ok(resolved.includes('audio-effects.cfg'), 'should reference audio-effects.cfg');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadLlmConfigSync — old 6-field format compatibility
// ─────────────────────────────────────────────────────────────────────────────

describe('loadLlmConfigSync — backward-compatible old 6-field format', () => {
  let targetDir;

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('reads 6-field row and returns ttsEngine as empty string', () => {
    targetDir = makeProjectDir();
    // Old format: llm:key|effects|bgTrack|bgVolume|voice|pretext  (no ttsEngine field)
    writeFileSync(
      join(targetDir, '.claude', 'config', 'audio-effects.cfg'),
      'llm:claude-code|light|track.mp3|0.20|en_US-amy-medium|Hello\n'
    );
    const cfg = loadLlmConfigSync('claude-code', targetDir);
    assert.equal(cfg.effects, 'light');
    assert.equal(cfg.bgTrack, 'track.mp3');
    assert.equal(cfg.bgVolume, '0.20');
    assert.equal(cfg.voice, 'en_US-amy-medium');
    assert.equal(cfg.pretext, 'Hello');
    assert.equal(cfg.ttsEngine, '', 'ttsEngine must be empty string for old 6-field format');
  });

  test('returns all-empty defaults when key is not found', () => {
    targetDir = makeProjectDir();
    writeFileSync(
      join(targetDir, '.claude', 'config', 'audio-effects.cfg'),
      'llm:other-key|light||0.15|voice||piper\n'
    );
    const cfg = loadLlmConfigSync('nonexistent', targetDir);
    assert.equal(cfg.effects, '');
    assert.equal(cfg.bgTrack, '');
    assert.equal(cfg.bgVolume, '0.20');
    assert.equal(cfg.voice, '');
    assert.equal(cfg.pretext, '');
    assert.equal(cfg.ttsEngine, '');
    assert.equal(cfg.sourcePath, '');
  });

  test('returns all-empty defaults when config file does not exist', () => {
    targetDir = makeProjectDir();
    // Use a key that cannot be present in any global fallback config file
    const cfg = loadLlmConfigSync('_test_nonexistent_llm_key_xyz_', targetDir);
    assert.equal(cfg.effects, '');
    assert.equal(cfg.sourcePath, '');
  });

  test('trims whitespace from field values', () => {
    targetDir = makeProjectDir();
    writeFileSync(
      join(targetDir, '.claude', 'config', 'audio-effects.cfg'),
      'llm:copilot|  light  |  track.mp3  |  0.15  |  voice  |  hello  |  piper  \n'
    );
    const cfg = loadLlmConfigSync('copilot', targetDir);
    assert.equal(cfg.effects, 'light');
    assert.equal(cfg.bgTrack, 'track.mp3');
    assert.equal(cfg.bgVolume, '0.15');
    assert.equal(cfg.voice, 'voice');
    assert.equal(cfg.pretext, 'hello');
    assert.equal(cfg.ttsEngine, 'piper');
  });

  test('bgVolume defaults to 0.20 when field is empty', () => {
    targetDir = makeProjectDir();
    // field index 3 (bgVolume) must be an empty string (falsy) for the || default to apply.
    // Whitespace like '  ' is truthy and trims to '', so use a truly empty field instead.
    writeFileSync(
      join(targetDir, '.claude', 'config', 'audio-effects.cfg'),
      'llm:hermes|light|||voice|pretext|piper\n'
    );
    const cfg = loadLlmConfigSync('hermes', targetDir);
    assert.equal(cfg.bgVolume, '0.20', 'empty bgVolume must default to 0.20 (never 0.15/0.70 — see AVI-S8.4)');
  });

  test('returns sourcePath pointing to the file that was read', () => {
    targetDir = makeProjectDir();
    const cfgPath = join(targetDir, '.claude', 'config', 'audio-effects.cfg');
    writeFileSync(cfgPath, 'llm:codex|light||0.15|voice||piper\n');
    const cfg = loadLlmConfigSync('codex', targetDir);
    assert.equal(cfg.sourcePath, cfgPath, 'sourcePath must be set to the file that was read');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// installCopilotInstructions / removeCopilotInstructions — marker blocks
// ─────────────────────────────────────────────────────────────────────────────

describe('installCopilotInstructions — marker block injection', () => {
  let targetDir;
  let packageDir;

  before(() => {
    packageDir = makeTempDir('av-pkg-');
    mkdirSync(join(packageDir, '.github'), { recursive: true });
    writeFileSync(
      join(packageDir, '.github', 'copilot-instructions.md'),
      'AgentVibes says hi!\n'
    );
  });

  after(() => {
    rmSync(packageDir, { recursive: true, force: true });
  });

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('creates .github/copilot-instructions.md from scratch wrapped in markers', async () => {
    targetDir = makeTempDir();
    await installCopilotInstructions(targetDir, packageDir);

    const dest = join(targetDir, '.github', 'copilot-instructions.md');
    assert.ok(existsSync(dest), 'file must be created');
    const content = readFileSync(dest, 'utf8');
    assert.ok(content.includes('<!-- BEGIN AGENTVIBES -->'), 'start marker must be present');
    assert.ok(content.includes('<!-- END AGENTVIBES -->'), 'end marker must be present');
    assert.ok(content.includes('AgentVibes says hi!'), 'source content must be included');
  });

  test('injects block into existing file without destroying existing content', async () => {
    targetDir = makeTempDir();
    mkdirSync(join(targetDir, '.github'), { recursive: true });
    const existing = '# My project instructions\n\nDo things correctly.\n';
    writeFileSync(join(targetDir, '.github', 'copilot-instructions.md'), existing);

    await installCopilotInstructions(targetDir, packageDir);

    const content = readFileSync(join(targetDir, '.github', 'copilot-instructions.md'), 'utf8');
    assert.ok(content.includes('# My project instructions'), 'pre-existing content must be preserved');
    assert.ok(content.includes('<!-- BEGIN AGENTVIBES -->'));
    assert.ok(content.includes('AgentVibes says hi!'));
  });

  test('re-install replaces existing marker block (idempotent)', async () => {
    targetDir = makeTempDir();
    await installCopilotInstructions(targetDir, packageDir);
    await installCopilotInstructions(targetDir, packageDir); // second install

    const content = readFileSync(join(targetDir, '.github', 'copilot-instructions.md'), 'utf8');
    const startCount = (content.match(/<!-- BEGIN AGENTVIBES -->/g) || []).length;
    assert.equal(startCount, 1, 'marker must appear exactly once after double install');
  });
});

describe('removeCopilotInstructions — marker block removal', () => {
  let targetDir;
  let packageDir;

  before(() => {
    packageDir = makeTempDir('av-pkg2-');
    mkdirSync(join(packageDir, '.github'), { recursive: true });
    writeFileSync(join(packageDir, '.github', 'copilot-instructions.md'), 'AgentVibes content\n');
  });

  after(() => {
    rmSync(packageDir, { recursive: true, force: true });
  });

  afterEach(() => {
    if (targetDir) rmSync(targetDir, { recursive: true, force: true });
    targetDir = null;
  });

  test('removes marker block and preserves surrounding content', async () => {
    targetDir = makeTempDir();
    const destPath = join(targetDir, '.github', 'copilot-instructions.md');
    mkdirSync(join(targetDir, '.github'), { recursive: true });
    const content = [
      '# Existing project docs',
      '',
      '<!-- BEGIN AGENTVIBES -->',
      'AgentVibes content',
      '<!-- END AGENTVIBES -->',
      '',
      '# More content',
    ].join('\n') + '\n';
    writeFileSync(destPath, content);

    await removeCopilotInstructions(targetDir);

    const updated = readFileSync(destPath, 'utf8');
    assert.ok(!updated.includes('<!-- BEGIN AGENTVIBES -->'), 'start marker must be removed');
    assert.ok(!updated.includes('<!-- END AGENTVIBES -->'), 'end marker must be removed');
    assert.ok(updated.includes('# Existing project docs'), 'surrounding content must be preserved');
    assert.ok(updated.includes('# More content'), 'content after block must be preserved');
  });

  test('deletes file entirely when marker block is the only content', async () => {
    targetDir = makeTempDir();
    const destPath = join(targetDir, '.github', 'copilot-instructions.md');
    mkdirSync(join(targetDir, '.github'), { recursive: true });

    // Install first, then remove — file should be deleted entirely
    await installCopilotInstructions(targetDir, packageDir);
    await removeCopilotInstructions(targetDir);

    assert.ok(!existsSync(destPath), 'file must be deleted when only marker content remains');
  });

  test('succeeds gracefully when file does not exist', async () => {
    targetDir = makeTempDir();
    // Should not throw
    await removeCopilotInstructions(targetDir);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDERS list — structural contract
// ─────────────────────────────────────────────────────────────────────────────

describe('PROVIDERS list — structural contract', () => {
  test('contains at least 5 entries', () => {
    assert.ok(PROVIDERS.length >= 5, `expected ≥5 providers, got ${PROVIDERS.length}`);
  });

  test('every provider has id, name, and desc', () => {
    for (const p of PROVIDERS) {
      assert.ok(p.id, `provider missing id: ${JSON.stringify(p)}`);
      assert.ok(p.name, `provider ${p.id} missing name`);
      assert.ok(p.desc, `provider ${p.id} missing desc`);
    }
  });

  test('includes claude-code, github-copilot, openai-codex, hermes, default', () => {
    const ids = PROVIDERS.map(p => p.id);
    for (const expected of ['claude-code', 'github-copilot', 'openai-codex', 'hermes', 'default']) {
      assert.ok(ids.includes(expected), `PROVIDERS must include '${expected}'`);
    }
  });

  test('default provider has isDefault=true', () => {
    const def = PROVIDERS.find(p => p.id === 'default');
    assert.ok(def, 'default provider must exist');
    assert.equal(def.isDefault, true);
  });

  test('all provider ids are unique', () => {
    const ids = PROVIDERS.map(p => p.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, 'all provider ids must be unique');
  });
});
