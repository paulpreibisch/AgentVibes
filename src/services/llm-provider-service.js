/**
 * AgentVibes — LLM Provider Service
 *
 * Extracted from llm-providers-tab.js: all provider logic as a standalone service.
 * Config format: llm:key|effects|bgTrack|bgVolume|voice|pretext|ttsEngine
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

// ── Provider definitions ────────────────────────────────────────────────────

export const PROVIDERS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    desc: 'Anthropic CLI agent — hooks + MCP server',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    desc: 'VS Code Copilot Chat — .vscode/mcp.json + instructions',
  },
  {
    id: 'openai-codex',
    name: 'OpenAI Codex',
    desc: 'OpenAI CLI agent — .codex/config.toml + AGENTS.md',
  },
];

// ── Provider install-checks ─────────────────────────────────────────────────

export async function checkClaudeInstalled(targetDir) {
  try {
    await fs.access(path.join(targetDir, '.claude', 'hooks'));
    return true;
  } catch {
    try {
      await fs.access(path.join(targetDir, '.claude', 'hooks-windows'));
      return true;
    } catch {
      return false;
    }
  }
}

export async function checkCopilotInstalled(targetDir) {
  try {
    const content = await fs.readFile(path.join(targetDir, '.vscode', 'mcp.json'), 'utf8');
    const parsed = JSON.parse(content);
    return !!(parsed?.servers?.agentvibes);
  } catch {
    return false;
  }
}

export async function checkCodexInstalled(targetDir) {
  try {
    const content = await fs.readFile(path.join(targetDir, '.codex', 'config.toml'), 'utf8');
    return content.includes('[mcp_servers.agentvibes]');
  } catch {
    return false;
  }
}

// ── Claude Code install ────────────────────────────────────────────────────

/**
 * Create .mcp.json in target directory if it doesn't exist.
 * Also copies hooks, commands, config, personality, plugin, and bmad config files.
 */
export async function installClaudeMcp(targetDir) {
  const mcpConfigPath = path.join(targetDir, '.mcp.json');

  const mcpConfig = {
    mcpServers: {
      agentvibes: {
        command: 'npx',
        args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
      },
    },
  };

  try {
    let mcpCreated = false;
    try {
      await fs.access(mcpConfigPath);
      // Already exists — merge agentvibes key if missing
      try {
        const existing = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8'));
        if (!existing.mcpServers?.agentvibes) {
          existing.mcpServers = existing.mcpServers || {};
          existing.mcpServers.agentvibes = mcpConfig.mcpServers.agentvibes;
          await fs.writeFile(mcpConfigPath, JSON.stringify(existing, null, 2) + '\n');
          mcpCreated = true;
        }
      } catch { /* parse error — don't corrupt */ }
    } catch {
      // File doesn't exist — create it
      await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n');
      mcpCreated = true;
    }

    // Copy hooks, commands, config, personality, plugin, bmad config files
    const silentSpinner = { start: () => {}, succeed: () => {}, fail: () => {} };
    const installer = await import('../installer.js');
    await installer.copyHookFiles(targetDir, silentSpinner);
    await installer.copyCommandFiles(targetDir, silentSpinner);
    await installer.copyConfigFiles(targetDir, silentSpinner);
    await installer.copyPersonalityFiles(targetDir, silentSpinner);
    await installer.copyPluginFiles(targetDir, silentSpinner);
    await installer.copyBmadConfigFiles(targetDir, silentSpinner);
    await installer.copyBackgroundMusicFiles(targetDir, silentSpinner);

    return { success: true, mcpCreated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function removeClaudeMcp(targetDir) {
  const mcpConfigPath = path.join(targetDir, '.mcp.json');
  try {
    const content = await fs.readFile(mcpConfigPath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed.mcpServers?.agentvibes) {
      delete parsed.mcpServers.agentvibes;
      // Only delete file if mcpServers is empty AND no other top-level keys
      const noServers = Object.keys(parsed.mcpServers).length === 0;
      const noOtherKeys = Object.keys(parsed).length === 1;
      if (noServers && noOtherKeys) {
        await fs.unlink(mcpConfigPath);
      } else {
        await fs.writeFile(mcpConfigPath, JSON.stringify(parsed, null, 2) + '\n');
      }
    }
  } catch { /* file doesn't exist or can't parse — nothing to remove */ }
  return { success: true };
}

// ── Copilot install/remove ──────────────────────────────────────────────────

export async function installCopilotMcp(targetDir) {
  const vscodeDir = path.join(targetDir, '.vscode');
  const mcpJsonPath = path.join(vscodeDir, 'mcp.json');

  const agentvibesServer = {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
  };

  try {
    await fs.mkdir(vscodeDir, { recursive: true });
    let mcpConfig = { servers: {} };
    try {
      const existing = await fs.readFile(mcpJsonPath, 'utf8');
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed === 'object') {
        mcpConfig = parsed;
        if (!mcpConfig.servers) mcpConfig.servers = {};
      }
    } catch { /* new file */ }

    mcpConfig.servers.agentvibes = agentvibesServer;
    await fs.writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function removeCopilotMcp(targetDir) {
  const mcpJsonPath = path.join(targetDir, '.vscode', 'mcp.json');
  try {
    const content = await fs.readFile(mcpJsonPath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed?.servers?.agentvibes) {
      delete parsed.servers.agentvibes;
      if (Object.keys(parsed.servers).length === 0) {
        await fs.unlink(mcpJsonPath);
      } else {
        await fs.writeFile(mcpJsonPath, JSON.stringify(parsed, null, 2) + '\n');
      }
    }
    return { success: true };
  } catch {
    return { success: true }; // Already gone
  }
}

export async function installCopilotInstructions(targetDir, packageDir) {
  const destPath = path.join(targetDir, '.github', 'copilot-instructions.md');
  const srcPath = path.join(packageDir, '.github', 'copilot-instructions.md');
  try {
    await fs.mkdir(path.join(targetDir, '.github'), { recursive: true });
    const content = await fs.readFile(srcPath, 'utf8');
    await fs.writeFile(destPath, content);
  } catch { /* best effort */ }
}

export async function removeCopilotInstructions(targetDir) {
  try {
    await fs.unlink(path.join(targetDir, '.github', 'copilot-instructions.md'));
  } catch { /* already gone */ }
}

// ── Codex install/remove ────────────────────────────────────────────────────

export async function installCodexMcp(targetDir) {
  const codexDir = path.join(targetDir, '.codex');
  const tomlPath = path.join(codexDir, 'config.toml');

  try {
    await fs.mkdir(codexDir, { recursive: true });
    let existing = '';
    try { existing = await fs.readFile(tomlPath, 'utf8'); } catch { /* new file */ }
    const content = buildCodexToml(existing);
    await fs.writeFile(tomlPath, content);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function removeCodexMcp(targetDir) {
  const tomlPath = path.join(targetDir, '.codex', 'config.toml');
  try {
    const content = await fs.readFile(tomlPath, 'utf8');
    const lines = content.split('\n');
    const filtered = [];
    let skipping = false;
    for (const line of lines) {
      if (line.trim() === '[mcp_servers.agentvibes]') {
        skipping = true;
        continue;
      }
      if (skipping && line.startsWith('[')) {
        skipping = false;
      }
      if (!skipping) filtered.push(line);
    }
    const result = filtered.join('\n').trim();
    if (!result) {
      await fs.unlink(tomlPath);
    } else {
      await fs.writeFile(tomlPath, result + '\n');
    }
    return { success: true };
  } catch {
    return { success: true }; // Already gone
  }
}

export function buildCodexToml(existingContent = '') {
  const serverBlock = [
    '[mcp_servers.agentvibes]',
    'command = "npx"',
    'args = ["-y", "--package=agentvibes", "agentvibes-mcp-server"]',
  ].join('\n');

  if (!existingContent.trim()) return serverBlock + '\n';

  // Remove existing agentvibes block if present, then append fresh
  const lines = existingContent.split('\n');
  const filtered = [];
  let skipping = false;
  for (const line of lines) {
    if (line.trim() === '[mcp_servers.agentvibes]') {
      skipping = true;
      continue;
    }
    if (skipping && line.startsWith('[')) {
      skipping = false;
    }
    if (!skipping) filtered.push(line);
  }

  let result = filtered.join('\n').trimEnd();
  if (result.length) result += '\n\n';
  return result + serverBlock + '\n';
}

export async function installCodexInstructions(targetDir, packageDir) {
  const srcPath = path.join(packageDir, '.codex', 'AGENTS.md');
  try {
    const content = await fs.readFile(srcPath, 'utf8');
    await fs.mkdir(path.join(targetDir, '.codex'), { recursive: true });
    await fs.writeFile(path.join(targetDir, '.codex', 'AGENTS.md'), content);
    await fs.writeFile(path.join(targetDir, 'AGENTS.md'), content);
  } catch { /* best effort */ }
}

export async function installCodexHooks(targetDir, packageDir) {
  const destDir = path.join(targetDir, '.codex', 'hooks');
  const srcDir = path.join(packageDir, '.codex', 'hooks');
  try {
    await fs.mkdir(destDir, { recursive: true });
    for (const file of ['init-agentvibes.sh', 'init-agentvibes.ps1']) {
      try {
        const content = await fs.readFile(path.join(srcDir, file), 'utf8');
        await fs.writeFile(path.join(destDir, file), content);
      } catch { /* best effort */ }
    }
  } catch { /* best effort */ }
}

export async function removeCodexInstructions(targetDir) {
  try {
    await fs.unlink(path.join(targetDir, '.codex', 'AGENTS.md'));
  } catch { /* already gone */ }
  try {
    await fs.unlink(path.join(targetDir, 'AGENTS.md'));
  } catch { /* already gone */ }
}

export async function removeCodexHooks(targetDir) {
  const hooksDir = path.join(targetDir, '.codex', 'hooks');
  try {
    await fs.unlink(path.join(hooksDir, 'init-agentvibes.sh'));
  } catch { /* already gone */ }
  try {
    await fs.unlink(path.join(hooksDir, 'init-agentvibes.ps1'));
  } catch { /* already gone */ }
  try {
    await fs.rmdir(hooksDir);
  } catch { /* not empty or gone */ }
}

// ── Config path resolution ──────────────────────────────────────────────────

export function resolveCfgPath(targetDir) {
  const localCfg = path.join(targetDir, '.claude', 'config', 'audio-effects.cfg');
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const globalCfg = path.join(homeDir, '.claude', 'config', 'audio-effects.cfg');
  return fsSync.existsSync(localCfg) ? localCfg : globalCfg;
}

// ── LLM config read/write ───────────────────────────────────────────────────

/**
 * Read per-LLM audio config from audio-effects.cfg.
 * Format: llm:key|effects|bgTrack|bgVolume|voice|pretext|ttsEngine
 * Handles old 6-field format gracefully (ttsEngine defaults to '').
 */
export function loadLlmConfigSync(llmKey, targetDir) {
  const cfgKey = `llm:${llmKey}`;
  const resolvedTargetDir = targetDir || process.env.INIT_CWD || process.cwd();
  const cfgPaths = [
    path.join(resolvedTargetDir, '.claude', 'config', 'audio-effects.cfg'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'config', 'audio-effects.cfg'),
  ];

  for (const cfgPath of cfgPaths) {
    try {
      const content = fsSync.readFileSync(cfgPath, 'utf8');
      for (const line of content.split('\n')) {
        if (line.startsWith(cfgKey + '|')) {
          const parts = line.split('|');
          return {
            effects: (parts[1] || '').trim(),
            bgTrack: (parts[2] || '').trim(),
            bgVolume: (parts[3] || '0.15').trim(),
            voice: (parts[4] || '').trim(),
            pretext: (parts[5] || '').trim(),
            ttsEngine: (parts[6] || '').trim(),  // new field — empty if old format
            sourcePath: cfgPath,
          };
        }
      }
    } catch { /* file not found */ }
  }
  return { effects: '', bgTrack: '', bgVolume: '0.15', voice: '', pretext: '', ttsEngine: '', sourcePath: '' };
}

/**
 * Write per-LLM audio config to audio-effects.cfg.
 * Format: llm:key|effects|bgTrack|bgVolume|voice|pretext|ttsEngine
 */
export function saveLlmConfigSync(llmKey, config, targetDir) {
  const cfgKey = `llm:${llmKey}`;
  // Sanitize pipe chars in user-editable fields to prevent config format corruption
  const sanitize = (v) => (v || '').replace(/\|/g, '');
  const cfgLine = `${cfgKey}|${sanitize(config.effects)}|${sanitize(config.bgTrack)}|${config.bgVolume}|${sanitize(config.voice)}|${sanitize(config.pretext)}|${sanitize(config.ttsEngine)}`;
  const resolvedTargetDir = targetDir || process.env.INIT_CWD || process.cwd();
  const cfgPath = config.sourcePath || resolveCfgPath(resolvedTargetDir);

  try {
    let content = '';
    try { content = fsSync.readFileSync(cfgPath, 'utf8'); } catch { /* new file */ }

    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(cfgKey + '|')) {
        lines[i] = cfgLine;
        found = true;
        break;
      }
    }
    if (!found) lines.push(cfgLine);

    fsSync.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fsSync.writeFileSync(cfgPath, lines.join('\n'));
  } catch { /* best effort */ }
}
