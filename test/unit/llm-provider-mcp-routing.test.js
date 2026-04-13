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

    test('installCopilotMcp also writes ~/.copilot/mcp-config.json for GitHub Copilot CLI', () => {
      // GitHub Copilot CLI is a different product from VS Code Copilot Chat.
      // Chat reads .vscode/mcp.json; CLI reads ~/.copilot/mcp-config.json.
      // installCopilotMcp must write BOTH so both products work.
      const src = readFileSync(
        path.join(PROJECT_ROOT, 'src', 'services', 'llm-provider-service.js'),
        'utf8'
      );
      const m = src.match(/installCopilotMcp[\s\S]*?^\}/m);
      assert.ok(m, 'installCopilotMcp must exist');
      assert.match(m[0], /\.copilot.*mcp-config\.json|COPILOT_HOME/,
        'installCopilotMcp must also write ~/.copilot/mcp-config.json (or honor COPILOT_HOME)');
      assert.match(m[0], /tools:\s*\[\s*['"]\*['"]\s*\]/,
        'Copilot CLI config entry must include tools: ["*"] per GitHub docs');
    });
  });

  // ── Claude Code (.mcp.json via installer.js) ─────────────────────────────
  describe('Claude Code .mcp.json (installer.js)', () => {
    let installerSrc;
    let serverPySrc;
    before(() => {
      installerSrc = readFileSync(
        path.join(PROJECT_ROOT, 'src', 'installer.js'),
        'utf8'
      );
      serverPySrc = readFileSync(
        path.join(PROJECT_ROOT, 'mcp-server', 'server.py'),
        'utf8'
      );
    });

    test('installer writes Claude Code MCP to ~/.claude.json, NOT .mcp.json', () => {
      // Claude Code's MCP config goes in ~/.claude.json (user-scope) to
      // avoid collisions with Copilot which reads .mcp.json with precedence.
      assert.match(installerSrc, /\.claude\.json/,
        'installer must reference ~/.claude.json for Claude Code MCP config');
      assert.match(installerSrc, /AGENTVIBES_LLM.*claude-code/,
        'installer must set AGENTVIBES_LLM = "claude-code"');
    });

    test('llm-provider-service installClaudeMcp writes to ~/.claude.json', () => {
      const src = readFileSync(
        path.join(PROJECT_ROOT, 'src', 'services', 'llm-provider-service.js'),
        'utf8'
      );
      const m = src.match(/installClaudeMcp[\s\S]*?const agentvibesServer = \{[\s\S]*?\};/);
      assert.ok(m, 'installClaudeMcp must declare agentvibesServer');
      assert.match(m[0], /AGENTVIBES_LLM:\s*['"]claude-code['"]/,
        'installClaudeMcp must set env.AGENTVIBES_LLM = "claude-code"');
      // Must write to ~/.claude.json, not .mcp.json
      assert.match(src, /installClaudeMcp[\s\S]*?\.claude\.json/,
        'installClaudeMcp must write to ~/.claude.json');
    });

    test('mcp-server/server.py still supports CLAUDECODE env var as fallback', () => {
      assert.match(serverPySrc, /os\.environ\.get\(['"]CLAUDECODE['"]/,
        'server.py must read CLAUDECODE env var as fallback detection');
    });
  });
});

describe('Default LLM provider (config-only fallback)', () => {
  let providerSrc;
  let setupSrc;
  let psSrc;
  let shSrc;
  before(() => {
    providerSrc = readFileSync(
      path.join(PROJECT_ROOT, 'src', 'services', 'llm-provider-service.js'),
      'utf8'
    );
    setupSrc = readFileSync(
      path.join(PROJECT_ROOT, 'src', 'console', 'tabs', 'setup-tab.js'),
      'utf8'
    );
    psSrc = readFileSync(
      path.join(PROJECT_ROOT, '.claude', 'hooks-windows', 'play-tts.ps1'),
      'utf8'
    );
    const shPath = path.join(PROJECT_ROOT, '.claude', 'hooks', 'play-tts.sh');
    shSrc = existsSync(shPath) ? readFileSync(shPath, 'utf8') : '';
  });

  test('PROVIDERS list contains a default entry with isDefault=true', () => {
    assert.match(providerSrc, /id:\s*['"]default['"]/);
    assert.match(providerSrc, /isDefault:\s*true/);
  });

  test('DEFAULT_LLM_CONFIGS includes a default entry with empty pretext', () => {
    // The default pretext must be empty so users get NO prefix unless they
    // explicitly configure one via Setup → Default → Configure.
    const m = providerSrc.match(/default:\s*\{[\s\S]*?pretext:\s*['"]([^'"]*)['"]/);
    assert.ok(m, 'DEFAULT_LLM_CONFIGS.default must exist');
    assert.strictEqual(m[1], '', 'default pretext must be empty by default');
  });

  test('setup-tab handleProviderConfigure maps default → llm:default', () => {
    assert.match(setupSrc, /['"]default['"]:\s*['"]default['"]/);
  });

  test('setup-tab hides install/remove buttons for the default provider', () => {
    // The createProviderRow function must hide install/remove for isDefault.
    assert.match(setupSrc, /provider\.isDefault[\s\S]{0,200}installBtn\.hide\(\)/);
    assert.match(setupSrc, /provider\.isDefault[\s\S]{0,200}removeBtn\.hide\(\)/);
  });

  test('setup-tab refreshInstalledState skips default and shows Config Only', () => {
    assert.match(setupSrc, /p\.isDefault[\s\S]{0,200}installedState\[p\.id\]\s*=\s*true/);
    assert.match(setupSrc, /\[Config Only\]/);
  });

  test('setup-tab showAllProviderRows keeps install/remove hidden for default', () => {
    // Regression: showAllProviderRows used to call .show() unconditionally
    // on every row's installBtn / removeBtn — undoing the createProviderRow
    // hide() and making the buttons appear on the Default row.  The fix
    // checks provider.isDefault before showing them.
    const m = setupSrc.match(/function showAllProviderRows\(\)\s*\{[\s\S]*?\n  \}/);
    assert.ok(m, 'showAllProviderRows function must exist');
    assert.match(m[0], /provider\?\.isDefault/,
      'showAllProviderRows must check provider.isDefault before showing buttons');
    assert.match(m[0], /installBtn\.hide\(\)/,
      'showAllProviderRows must hide installBtn for default provider');
    assert.match(m[0], /removeBtn\.hide\(\)/,
      'showAllProviderRows must hide removeBtn for default provider');
  });

  test('PROVIDERS list places default at the END (not the top)', () => {
    // The default provider should appear last in the providers list so it
    // sits at the bottom of the Providers screen.
    const m = providerSrc.match(/export const PROVIDERS = \[([\s\S]*?)\];/);
    assert.ok(m, 'PROVIDERS list must exist');
    const lastIdMatch = [...m[1].matchAll(/id:\s*['"]([^'"]+)['"]/g)];
    assert.ok(lastIdMatch.length >= 2, 'PROVIDERS must have at least 2 entries');
    const lastId = lastIdMatch[lastIdMatch.length - 1][1];
    assert.strictEqual(lastId, 'default',
      `PROVIDERS last entry must be 'default', got '${lastId}'`);
  });

  test('play-tts.ps1 falls back to llm="default" when no -llm flag is passed', () => {
    // After validation, an empty $llm should be set to "default" so the
    // existing per-LLM lookup naturally finds llm:default in audio-effects.cfg.
    assert.match(psSrc, /if\s*\(-not\s+\$llm\)\s*\{\s*\n\s*\$llm\s*=\s*"default"/);
  });

  test('play-tts.sh falls back to LLM_PROVIDER="default" when no --llm flag is passed', { skip: !shSrc }, () => {
    assert.match(shSrc, /if\s*\[\[\s*-z\s+"\$LLM_PROVIDER"\s*\]\];\s*then\s*\n\s*LLM_PROVIDER="default"/);
  });
});

describe('packaged per-LLM defaults cover all supported LLMs', () => {
  let audioEffects;
  before(() => {
    audioEffects = readFileSync(
      path.join(PROJECT_ROOT, '.claude', 'config', 'audio-effects.cfg'),
      'utf8'
    );
  });

  test('includes Claude Code, Copilot, and Codex rows', () => {
    assert.match(audioEffects, /^llm:claude-code\|.*\|piper$/m,
      'audio-effects.cfg must have an llm:claude-code row with piper engine');
    assert.match(audioEffects, /^llm:copilot\|.*\|piper$/m,
      'audio-effects.cfg must have an llm:copilot row with piper engine');
    assert.match(audioEffects, /^llm:codex\|.*\|piper$/m,
      'audio-effects.cfg must have an llm:codex row with piper engine');
  });

  test('Codex setup does not install or remove Copilot MCP config', () => {
    const setupSrc = readFileSync(
      path.join(PROJECT_ROOT, 'src', 'console', 'tabs', 'setup-tab.js'),
      'utf8'
    );

    // There are TWO `if (provider.id === 'openai-codex')` blocks in
    // setup-tab.js (install + remove), so a lazy `.*?` regex anchored on
    // the wrong terminator can sweep the wrong block.  Anchor instead on
    // functions that uniquely appear in EACH block:
    //   install → installCodexMcp
    //   remove  → removeCodexMcp
    // and bound the capture to a single `}` line at the next 4-space
    // closing brace at the start of a line (the indent of an `if` block
    // body inside a function).

    const installBlock = setupSrc.match(
      /if \(provider\.id === 'openai-codex'\) \{[^{}]*?installCodexMcp[^{}]*?\n    \}/
    );
    assert.ok(installBlock, 'openai-codex install block must exist');
    assert.doesNotMatch(installBlock[0], /installCopilotMcp/,
      'Codex install block must not call installCopilotMcp');
    assert.doesNotMatch(installBlock[0], /removeCopilotMcp/,
      'Codex install block must not call removeCopilotMcp');

    const removeBlock = setupSrc.match(
      /if \(provider\.id === 'openai-codex'\) \{[^{}]*?removeCodexMcp[^{}]*?\n    \}/
    );
    assert.ok(removeBlock, 'openai-codex remove block must exist');
    assert.doesNotMatch(removeBlock[0], /removeCopilotMcp/,
      'Codex remove block must not call removeCopilotMcp');
    assert.doesNotMatch(removeBlock[0], /installCopilotMcp/,
      'Codex remove block must not call installCopilotMcp');
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
