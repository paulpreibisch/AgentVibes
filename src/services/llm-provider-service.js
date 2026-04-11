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
  {
    id: 'default',
    name: 'Default (Fallback)',
    desc: 'Used when any tool calls TTS without identifying its LLM',
    // No install/uninstall — this is a config-only entry
    isDefault: true,
  },
];

const DEFAULT_LLM_CONFIGS = {
  // Fallback used when play-tts is invoked with no -llm flag.  Pretext is
  // empty by default — users edit it via Setup → Default → Configure.  When
  // empty, no prefix is prepended at all.
  default: {
    effects: 'light',
    bgTrack: '',
    bgVolume: '0.15',
    voice: 'en_US-lessac-high',
    pretext: '',
    ttsEngine: 'piper',
  },
  'claude-code': {
    effects: 'light',
    bgTrack: 'agent_vibes_chillwave_v2_loop.mp3',
    bgVolume: '0.15',
    voice: 'en_US-lessac-high',
    pretext: 'Claude Code here',
    ttsEngine: 'piper',
  },
  copilot: {
    effects: 'light',
    bgTrack: 'agent_vibes_bossa_nova_v2_loop.mp3',
    bgVolume: '0.15',
    voice: 'en_US-libritts-high::Anna-11',
    pretext: 'Copilot here',
    ttsEngine: 'piper',
  },
  codex: {
    effects: 'light',
    bgTrack: 'agent_vibes_chillwave_v2_loop.mp3',
    bgVolume: '0.15',
    // NOTE: lessac-medium appears to silently fail to synthesize on some
    // Windows Piper installs (loads the model, exits with no output).
    // lessac-high works reliably, so use it as the default for codex.
    voice: 'en_US-lessac-high',
    pretext: 'Codex here',
    ttsEngine: 'piper',
  },
};

function ensureDefaultLlmConfigSync(llmKey, targetDir) {
  const existing = loadLlmConfigSync(llmKey, targetDir);
  if (existing.sourcePath) return;

  const defaults = DEFAULT_LLM_CONFIGS[llmKey];
  if (!defaults) return;

  saveLlmConfigSync(llmKey, defaults, targetDir);
}

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

  // The agentvibes server entry for Claude Code's .mcp.json.
  //
  // IMPORTANT: no `env.AGENTVIBES_LLM` block here.  GitHub Copilot CLI
  // also reads project-level `.mcp.json` with precedence over its own
  // `~/.copilot/mcp-config.json` — so if we set `AGENTVIBES_LLM=claude-code`
  // in `.mcp.json`, Copilot CLI picks up that value too and mis-routes.
  // Instead, the MCP server (mcp-server/server.py) auto-detects Claude
  // Code via the `CLAUDECODE=1` env var that Claude Code sets on every
  // subprocess it spawns.  Copilot CLI does NOT set that var, so its
  // spawned MCP server correctly falls back to its own config.
  const agentvibesServer = {
    command: 'npx',
    args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
  };

  const mcpConfig = {
    mcpServers: {
      agentvibes: agentvibesServer,
    },
  };

  try {
    let mcpCreated = false;
    try {
      await fs.access(mcpConfigPath);
      // Already exists — merge / upgrade the agentvibes entry.  This also
      // STRIPS any stale AGENTVIBES_LLM env block left over from v5.1.2..4
      // so Copilot CLI stops mis-routing.
      try {
        const existing = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8'));
        existing.mcpServers = existing.mcpServers || {};
        existing.mcpServers.agentvibes = { ...agentvibesServer };
        await fs.writeFile(mcpConfigPath, JSON.stringify(existing, null, 2) + '\n');
        mcpCreated = true;
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
    ensureDefaultLlmConfigSync('claude-code', targetDir);

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

/**
 * Full uninstall: remove MCP entry + all AgentVibes files from the project.
 * Does NOT touch user's own .claude/ settings (settings.json, CLAUDE.md etc.).
 */
export async function uninstallClaude(targetDir) {
  const removed = [];

  // 1. Remove MCP entry
  await removeClaudeMcp(targetDir);
  removed.push('.mcp.json (agentvibes entry)');

  // 2. Remove AgentVibes directories
  const dirs = [
    ['.claude', 'commands', 'agent-vibes'],
    ['.claude', 'hooks'],
    ['.claude', 'hooks-windows'],
    ['.claude', 'personalities'],
    ['.claude', 'output-styles'],
    ['.claude', 'plugins'],
    ['.claude', 'audio'],
    ['.claude', 'config'],
    ['.agentvibes'],
  ];

  for (const parts of dirs) {
    const dirPath = path.join(targetDir, ...parts);
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      removed.push(parts.join('/'));
    } catch { /* doesn't exist */ }
  }

  // 3. Remove AgentVibes config files from .claude/
  const configFiles = [
    'tts-voice.txt', 'tts-provider.txt', 'tts-personality.txt',
    'tts-verbosity.txt', 'tts-translate.txt', 'tts-target-voice.txt',
    'tts-target-language.txt', 'tts-language.txt', 'tts-speech-rate.txt',
    'tts-target-speech-rate.txt', 'piper-speech-rate.txt',
    'piper-target-speech-rate.txt', 'personalities.json',
    'github-star-reminder.txt', 'piper-voices-dir.txt',
    'verbosity.txt', 'personality.txt', 'intro-text.txt',
    'reverb-level.txt', 'background-music-enabled.txt',
    'background-music-volume.txt',
  ];

  for (const file of configFiles) {
    try {
      await fs.unlink(path.join(targetDir, '.claude', file));
    } catch { /* doesn't exist */ }
  }

  // 4. Remove settings.json hook entries if present
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');
  try {
    const content = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(content);
    let changed = false;
    if (settings.hooks) {
      for (const hookKey of Object.keys(settings.hooks)) {
        const hooks = settings.hooks[hookKey];
        if (Array.isArray(hooks)) {
          const filtered = hooks.filter(h =>
            !(h.command && (h.command.includes('agentvibes') || h.command.includes('play-tts') || h.command.includes('bmad-speak'))));
          if (filtered.length !== hooks.length) {
            settings.hooks[hookKey] = filtered;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      removed.push('.claude/settings.json (hooks cleaned)');
    }
  } catch { /* no settings or parse error */ }

  return { success: true, removed };
}

// ── Copilot install/remove ──────────────────────────────────────────────────

export async function installCopilotMcp(targetDir) {
  const vscodeDir = path.join(targetDir, '.vscode');
  const mcpJsonPath = path.join(vscodeDir, 'mcp.json');

  const agentvibesServer = {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
    // Tells the MCP server which LLM is calling so per-LLM voice / pretext
    // / music / effects routing in audio-effects.cfg works correctly.
    env: { AGENTVIBES_LLM: 'copilot' },
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

    // Also write ~/.copilot/mcp-config.json so the GitHub Copilot CLI
    // (different product from VS Code Copilot Chat!) can find the
    // agentvibes MCP server.  VS Code reads .vscode/mcp.json, but the
    // CLI reads ONLY from ~/.copilot/mcp-config.json per docs:
    // https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
    try {
      const copilotHome = process.env.COPILOT_HOME ||
        path.join(process.env.USERPROFILE || process.env.HOME || '', '.copilot');
      const copilotMcpPath = path.join(copilotHome, 'mcp-config.json');
      await fs.mkdir(copilotHome, { recursive: true });
      let cliConfig = { mcpServers: {} };
      try {
        const existingCli = await fs.readFile(copilotMcpPath, 'utf8');
        const parsedCli = JSON.parse(existingCli);
        if (parsedCli && typeof parsedCli === 'object') {
          cliConfig = parsedCli;
          if (!cliConfig.mcpServers) cliConfig.mcpServers = {};
        }
      } catch { /* new file */ }
      cliConfig.mcpServers.agentvibes = {
        type: 'local',
        command: 'npx',
        args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
        env: { AGENTVIBES_LLM: 'copilot' },
        tools: ['*'],
      };
      await fs.writeFile(copilotMcpPath, JSON.stringify(cliConfig, null, 2) + '\n');
    } catch { /* best effort — CLI might not be installed */ }

    ensureDefaultLlmConfigSync('copilot', targetDir);
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
    ensureDefaultLlmConfigSync('codex', targetDir);
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
    // Tells the MCP server which LLM is calling so per-LLM voice / pretext
    // / music / effects routing in audio-effects.cfg works correctly.
    'env = { AGENTVIBES_LLM = "codex" }',
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
