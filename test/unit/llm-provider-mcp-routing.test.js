/**
 * Regression tests for the v5.1.x MCP per-LLM routing bugs.
 *
 * Three things must hold so that Codex / Copilot / Claude Code each get
 * routed to their own llm:<key> entry in audio-effects.cfg:
 *
 *   1. Every MCP launcher template (Codex .codex/config.toml, Copilot
 *      .vscode/mcp.json, Claude Code .mcp.json) sets AGENTVIBES_LLM
 *      to the correct value.
 *   2. mcp-server/server.py reads AGENTVIBES_LLM from the environment
 *      and forwards it as -llm <key> to play-tts.ps1 / play-tts.sh.
 *   3. play-tts.ps1 (Windows) actually accepts the -llm parameter and
 *      performs the per-LLM lookup in audio-effects.cfg.
 *
 * If any of these break the user gets the wrong voice / pretext / music
 * or — worse — silent failure (the v5.1.0 npm package shipped a
 * play-tts.ps1 with the parameter removed entirely, breaking ALL
 * Windows TTS).
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

describe('MCP launcher templates set AGENTVIBES_LLM env var', () => {
  // ── Codex (TOML) ─────────────────────────────────────────────────────────
  describe('Codex .codex/config.toml', () => {
    let buildCodexToml;
    before(async () => {
      const mod = await import('../../src/services/llm-provider-service.js');
      buildCodexToml = mod.buildCodexToml;
    });

    test('exports buildCodexToml', () => {
      assert.strictEqual(typeof buildCodexToml, 'function');
    });

    test('emits AGENTVIBES_LLM = "codex" in the agentvibes block', () => {
      const toml = buildCodexToml();
      assert.match(toml, /\[mcp_servers\.agentvibes\]/);
      assert.match(toml, /AGENTVIBES_LLM\s*=\s*"codex"/,
        'Codex MCP launcher must set AGENTVIBES_LLM = "codex"');
    });

    test('preserves AGENTVIBES_LLM when merged with existing TOML', () => {
      const existing = '[some_other.section]\nfoo = "bar"\n';
      const toml = buildCodexToml(existing);
      assert.match(toml, /\[some_other\.section\]/);
      assert.match(toml, /AGENTVIBES_LLM\s*=\s*"codex"/);
    });

    test('source template at .codex/config.toml has AGENTVIBES_LLM = "codex"', () => {
      const tomlPath = path.join(PROJECT_ROOT, '.codex', 'config.toml');
      const content = readFileSync(tomlPath, 'utf8');
      assert.match(content, /AGENTVIBES_LLM\s*=\s*"codex"/,
        '.codex/config.toml template must set AGENTVIBES_LLM = "codex"');
    });
  });

  // ── Copilot (.vscode/mcp.json) ───────────────────────────────────────────
  // Note: .vscode/mcp.json is gitignored so we can't test a source template.
  // The install path (installCopilotMcp) builds the JSON from scratch, so
  // testing the writer's source code is the authoritative check.
  describe('Copilot .vscode/mcp.json', () => {
    test('installCopilotMcp writer produces env.AGENTVIBES_LLM = "copilot"', async () => {
      // Read the source of installCopilotMcp / agentvibesServer literal to
      // confirm the env field is hard-wired without actually touching disk.
      const src = readFileSync(
        path.join(PROJECT_ROOT, 'src', 'services', 'llm-provider-service.js'),
        'utf8'
      );
      // Find the agentvibesServer block inside installCopilotMcp
      const m = src.match(/installCopilotMcp[\s\S]*?const agentvibesServer = \{[\s\S]*?\};/);
      assert.ok(m, 'installCopilotMcp must declare agentvibesServer');
      assert.match(m[0], /AGENTVIBES_LLM:\s*['"]copilot['"]/,
        'installCopilotMcp must set env.AGENTVIBES_LLM = "copilot"');
    });
  });

  // ── Claude Code (.mcp.json via installer.js) ─────────────────────────────
  describe('Claude Code .mcp.json (installer.js)', () => {
    let installerSrc;
    before(() => {
      installerSrc = readFileSync(
        path.join(PROJECT_ROOT, 'src', 'installer.js'),
        'utf8'
      );
    });

    test('installer mcpConfig template has env.AGENTVIBES_LLM = "claude-code"', () => {
      // Find the mcpConfig literal inside handleMcpConfiguration
      const m = installerSrc.match(/handleMcpConfiguration[\s\S]*?const mcpConfig = \{[\s\S]*?\};/);
      assert.ok(m, 'installer.js must declare mcpConfig in handleMcpConfiguration');
      assert.match(m[0], /AGENTVIBES_LLM:\s*['"]claude-code['"]/,
        '.mcp.json template must set env.AGENTVIBES_LLM = "claude-code"');
    });

    test('installer migrates EXISTING .mcp.json instead of just printing instructions', () => {
      // The v5.1.2 review found that the original `if (mcpExists)` branch
      // returned without modifying the file, leaving v5.1.0/v5.1.1 users
      // broken on upgrade.  v5.1.3 must auto-merge the AGENTVIBES_LLM env
      // var into existing .mcp.json files.
      assert.match(installerSrc, /if\s*\(mcpExists\)/,
        'installer must still detect existing .mcp.json');
      // The new migration block should write to the file inside the
      // mcpExists branch, not just call console.log and return.
      const block = installerSrc.match(/if\s*\(mcpExists\)\s*\{[\s\S]*?\n  \}/);
      assert.ok(block, 'mcpExists branch must be present');
      assert.match(block[0], /writeFile\(\s*mcpConfigPath/,
        'mcpExists branch must call fs.writeFile to migrate the existing config');
      assert.match(block[0], /AGENTVIBES_LLM/,
        'migration block must set AGENTVIBES_LLM in the merged config');
    });
  });
});

describe('mcp-server/server.py routes AGENTVIBES_LLM env var to play-tts', () => {
  let serverSrc;
  before(() => {
    serverSrc = readFileSync(
      path.join(PROJECT_ROOT, 'mcp-server', 'server.py'),
      'utf8'
    );
  });

  test('reads AGENTVIBES_LLM from os.environ', () => {
    assert.match(serverSrc, /os\.environ\.get\(\s*['"]AGENTVIBES_LLM['"]/,
      'server.py must read AGENTVIBES_LLM env var');
  });

  test('does NOT hardcode -llm copilot', () => {
    // The historical bug: line 201 had '-llm', 'copilot' as a literal pair.
    // We allow the string 'copilot' to appear elsewhere (provider list, comments)
    // but the literal -llm/copilot pair must NOT appear.
    assert.doesNotMatch(serverSrc, /["']-llm["']\s*,\s*["']copilot["']/,
      'server.py must not hardcode -llm copilot — the LLM key must come from env');
    assert.doesNotMatch(serverSrc, /["']--llm["']\s*,\s*["']copilot["']/,
      'server.py must not hardcode --llm copilot — the LLM key must come from env');
  });

  test('passes -llm flag conditionally on llm_key being set', () => {
    // Both Windows and POSIX branches should append -llm/--llm only when
    // llm_key is truthy.  The pattern is `if llm_key:` followed by an
    // args.extend / args.append call with -llm or --llm.
    assert.match(serverSrc, /if\s+llm_key\s*:[\s\S]{0,200}["']-?-llm["']/,
      'server.py must guard the -llm flag behind `if llm_key:`');
  });

  test('validates AGENTVIBES_LLM format before forwarding', () => {
    // The env value must be checked against the same regex play-tts.sh
    // uses (^[a-zA-Z0-9_-]+$) so weird/malicious values can't poison
    // child scripts or the audio-effects.cfg lookup.
    assert.match(serverSrc, /\^\[a-zA-Z0-9_-\]\+\$/,
      'server.py must validate AGENTVIBES_LLM against ^[a-zA-Z0-9_-]+$');
  });
});

describe('play-tts.ps1 validates $llm parameter format', () => {
  // The PowerShell script must mirror play-tts.sh's validation so the
  // cross-platform contract is symmetric and weird values can't poison
  // the audio-effects.cfg lookup or AGENTVIBES_LLM_KEY env var.
  let psSrc;
  before(() => {
    psSrc = readFileSync(
      path.join(PROJECT_ROOT, '.claude', 'hooks-windows', 'play-tts.ps1'),
      'utf8'
    );
  });

  test('rejects invalid $llm values with regex check', () => {
    assert.match(psSrc, /\$llm\s+-notmatch\s+'\^\[a-zA-Z0-9_-\]\+\$'/,
      'play-tts.ps1 must validate $llm against ^[a-zA-Z0-9_-]+$');
  });
});

describe('play-tts.ps1 contract — accepts -llm parameter', () => {
  // Regression test for the v5.1.0 npm package bug where play-tts.ps1
  // shipped without its -llm parameter, breaking ALL per-LLM routing
  // on Windows.  If this file ever drops the parameter again, the test
  // fails LOUDLY before publish.
  let psSrc;
  before(() => {
    psSrc = readFileSync(
      path.join(PROJECT_ROOT, '.claude', 'hooks-windows', 'play-tts.ps1'),
      'utf8'
    );
  });

  test('declares the $llm parameter', () => {
    assert.match(psSrc, /\[string\]\$llm\s*=\s*['"]?['"]?/,
      'play-tts.ps1 must declare a $llm parameter');
  });

  test('contains per-LLM config lookup logic', () => {
    assert.match(psSrc, /llm:\$llm/i,
      'play-tts.ps1 must build the llm:<key> lookup string');
    assert.match(psSrc, /audio-effects\.cfg/i,
      'play-tts.ps1 must read audio-effects.cfg for per-LLM lookup');
  });

  test('exports AGENTVIBES_LLM_KEY env var for child scripts', () => {
    assert.match(psSrc, /AGENTVIBES_LLM_KEY/,
      'play-tts.ps1 must export AGENTVIBES_LLM_KEY for downstream scripts');
  });

  test('file is at least 400 lines (catches mass-deletion regressions)', () => {
    const lineCount = psSrc.split('\n').length;
    assert.ok(lineCount >= 400,
      `play-tts.ps1 has ${lineCount} lines — expected ≥400. ` +
      `A drastically smaller file usually means the per-LLM logic was deleted.`);
  });
});

describe('play-tts.sh contract — accepts --llm parameter', () => {
  let shSrc;
  before(() => {
    const shPath = path.join(PROJECT_ROOT, '.claude', 'hooks', 'play-tts.sh');
    if (!existsSync(shPath)) {
      shSrc = '';
      return;
    }
    shSrc = readFileSync(shPath, 'utf8');
  });

  test('parses --llm argument', { skip: !existsSync(path.join(PROJECT_ROOT, '.claude', 'hooks', 'play-tts.sh')) }, () => {
    assert.match(shSrc, /--llm\)/,
      'play-tts.sh must have a --llm) case in its argument parser');
  });

  test('does per-LLM lookup against audio-effects.cfg', { skip: !existsSync(path.join(PROJECT_ROOT, '.claude', 'hooks', 'play-tts.sh')) }, () => {
    assert.match(shSrc, /llm:\$\{?LLM_PROVIDER\}?/,
      'play-tts.sh must build the llm:${LLM_PROVIDER} lookup key');
  });
});
