/**
 * AgentVibes — LLM Provider Service
 *
 * Extracted from llm-providers-tab.js: all provider logic as a standalone service.
 * Config format: llm:key|effects|bgTrack|bgVolume|voice|pretext|ttsEngine
 */

import path from 'node:path';
import os from 'node:os';
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
    id: 'hermes',
    name: 'Hermes Agent',
    desc: 'NousResearch Hermes — SSH hook auto-speaks every response',
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
  hermes: {
    effects: 'light',
    bgTrack: 'agent_vibes_bachata_v1_loop.mp3',
    bgVolume: '0.15',
    voice: 'en_US-libritts-high::Leo-8',
    pretext: 'Hermes here',
    ttsEngine: 'piper',
  },
};

function ensureDefaultLlmConfigSync(llmKey, targetDir) {
  // Check only the project dir — a global config row must not prevent seeding
  // per-project defaults (otherwise new installs silently inherit a different
  // project's voice/pretext and the per-LLM piper engine is never written,
  // causing play-tts.ps1 to fall through to the global SAPI provider).
  const resolvedDir = targetDir || process.env.INIT_CWD || process.cwd();
  const projectCfgPath = path.join(resolvedDir, '.claude', 'config', 'audio-effects.cfg');
  const cfgKey = `llm:${llmKey}`;
  try {
    const content = fsSync.readFileSync(projectCfgPath, 'utf8');
    if (content.split('\n').some(line => line.startsWith(cfgKey + '|'))) return;
  } catch { /* file not found — continue to seed */ }

  const defaults = DEFAULT_LLM_CONFIGS[llmKey];
  if (!defaults) return;

  saveLlmConfigSync(llmKey, defaults, targetDir);
}

/**
 * Seed piper defaults for every LLM in DEFAULT_LLM_CONFIGS into the project dir.
 * Called at install time so play-tts.ps1 always finds a per-LLM piper row in the
 * project config and never silently falls back to the global windows-sapi provider.
 */
export function seedAllLlmDefaultsSync(targetDir) {
  for (const llmKey of Object.keys(DEFAULT_LLM_CONFIGS)) {
    ensureDefaultLlmConfigSync(llmKey, targetDir);
  }
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
 * Install AgentVibes for Claude Code.
 *
 * Writes .mcp.json to register the AgentVibes MCP server (enables natural
 * language control: text_to_speech, get_config, set_voice, etc.).
 *
 * .mcp.json does NOT set AGENTVIBES_LLM because Copilot also reads it.
 * Claude Code is auto-detected via CLAUDECODE=1 env var at runtime.
 *
 * Also copies hooks, commands, config, personality, plugin, and bmad config files.
 */
export async function installClaudeMcp(targetDir) {
  const mcpConfigPath = path.join(targetDir, '.mcp.json');

  // AGENTVIBES_MCP_FALLBACK=copilot is the fallback identity for non-Claude-Code
  // tools reading .mcp.json (primarily VS Code Copilot, which reads .mcp.json
  // with precedence over .vscode/mcp.json).  Claude Code auto-detects via
  // CLAUDECODE=1 which takes priority over the fallback in server.py.
  const agentvibesServer = {
    command: 'npx',
    args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
    env: { AGENTVIBES_MCP_FALLBACK: 'copilot' },
  };

  // MCP config and file copies are independent — report partial success
  // when one succeeds but the other fails.
  let mcpCreated = false;
  let mcpError = null;
  try {
    let existing = null;
    let parseError = null;
    try {
      const raw = await fs.readFile(mcpConfigPath, 'utf8');
      existing = JSON.parse(raw);
    } catch (err) {
      // ENOENT = new file (fine); anything else = malformed (report to caller)
      if (err.code !== 'ENOENT') parseError = err;
    }

    if (parseError) {
      throw new Error(`Existing ${mcpConfigPath} is malformed: ${parseError.message}`);
    }

    // Guard: non-object root
    if (existing && (typeof existing !== 'object' || Array.isArray(existing))) {
      throw new Error(`${mcpConfigPath} has a non-object root — please fix manually.`);
    }

    if (existing) {
      // Guard: mcpServers must be a plain object
      if (!existing.mcpServers || typeof existing.mcpServers !== 'object' || Array.isArray(existing.mcpServers)) {
        existing.mcpServers = {};
      }
      const current = existing.mcpServers.agentvibes;
      // Strip any stale AGENTVIBES_LLM (from older versions — causes collisions)
      if (current?.env?.AGENTVIBES_LLM) delete current.env.AGENTVIBES_LLM;
      // Preserve user's other env keys, ensure AGENTVIBES_MCP_FALLBACK is set
      const mergedEnv = { ...(current?.env ?? {}), AGENTVIBES_MCP_FALLBACK: 'copilot' };
      existing.mcpServers.agentvibes = {
        command: 'npx',
        args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
        env: mergedEnv,
      };
      await fs.writeFile(mcpConfigPath, JSON.stringify(existing, null, 2) + '\n');
    } else {
      await fs.writeFile(mcpConfigPath, JSON.stringify({ mcpServers: { agentvibes: agentvibesServer } }, null, 2) + '\n');
    }
    mcpCreated = true;
  } catch (err) {
    mcpError = err.message;
  }

  try {
    // Copy hooks, commands, config, personality, plugin, bmad config files
    const silentSpinner = { start: () => {}, stop: () => {}, succeed: () => {}, fail: () => {}, warn: () => {}, info: () => {}, stopAndPersist: () => {}, get text() { return ''; }, set text(_) {}, get isSpinning() { return false; } };
    const installer = await import('../installer.js');
    await installer.copyHookFiles(targetDir, silentSpinner);
    await installer.copyCommandFiles(targetDir, silentSpinner);
    await installer.copyConfigFiles(targetDir, silentSpinner);
    await installer.copyPersonalityFiles(targetDir, silentSpinner);
    await installer.copyPluginFiles(targetDir, silentSpinner);
    await installer.copyBmadConfigFiles(targetDir, silentSpinner);
    await installer.copyBackgroundMusicFiles(targetDir, silentSpinner);
    ensureDefaultLlmConfigSync('claude-code', targetDir);

    // Explicitly write tts-provider.txt so `get_active_provider()` in
    // provider-manager.sh doesn't silently fall back to "piper".  Without
    // this, headless servers with no audio device hit a confusing failure
    // mode where TTS tries to synth locally and fails silently.
    // Inherit from global ~/.claude/tts-provider.txt if it exists, so users
    // with ssh-remote or other transport providers configured globally don't
    // have to reconfigure every new project.  Fall back to "piper" only if
    // no global setting is found.
    const ttsProviderPath = path.join(targetDir, '.claude', 'tts-provider.txt');
    try {
      await fs.access(ttsProviderPath);
      // Already exists — user has explicitly set a provider, don't clobber
    } catch {
      // Read global provider to inherit; default to piper if not configured
      let globalProvider = 'piper';
      try {
        const globalPath = path.join(os.homedir(), '.claude', 'tts-provider.txt');
        const val = await fs.readFile(globalPath, 'utf8');
        const trimmed = val.trim();
        if (trimmed) globalProvider = trimmed;
      } catch {}
      await fs.writeFile(ttsProviderPath, globalProvider + '\n');
    }

    return { success: true, mcpCreated, mcpError };
  } catch (err) {
    return { success: false, error: err.message, mcpError };
  }
}

export async function removeClaudeMcp(targetDir) {
  // Clean up .mcp.json agentvibes entry (legacy from older versions)
  try {
    const mcpConfigPath = path.join(targetDir, '.mcp.json');
    const content = await fs.readFile(mcpConfigPath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed.mcpServers?.agentvibes) {
      delete parsed.mcpServers.agentvibes;
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

  // 1. Remove legacy .mcp.json agentvibes entry if present
  await removeClaudeMcp(targetDir);
  removed.push('.mcp.json agentvibes entry (if present)');

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

  let mcpError = null;
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

    // Clean up any old "agentvibes-copilot" entry from a prior attempt.
    delete mcpConfig.servers['agentvibes-copilot'];
    mcpConfig.servers.agentvibes = agentvibesServer;
    await fs.writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');

    // Also write ~/.copilot/mcp-config.json so the GitHub Copilot CLI
    // (different product from VS Code Copilot Chat!) can find the
    // agentvibes MCP server.  VS Code reads .vscode/mcp.json, but the
    // CLI reads ONLY from ~/.copilot/mcp-config.json per docs:
    // https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
    try {
      // If neither USERPROFILE nor HOME is set, skip — writing to a
      // relative `.copilot/` path would pollute the project dir.
      const home = process.env.COPILOT_HOME ||
        process.env.USERPROFILE || process.env.HOME;
      if (home) {
        const copilotHome = process.env.COPILOT_HOME || path.join(home, '.copilot');
        const copilotMcpPath = path.join(copilotHome, 'mcp-config.json');
        await fs.mkdir(copilotHome, { recursive: true });
        let cliConfig = { mcpServers: {} };
        try {
          const existingCli = await fs.readFile(copilotMcpPath, 'utf8');
          const parsedCli = JSON.parse(existingCli);
          if (parsedCli && typeof parsedCli === 'object' && !Array.isArray(parsedCli)) {
            cliConfig = parsedCli;
            if (!cliConfig.mcpServers || typeof cliConfig.mcpServers !== 'object' || Array.isArray(cliConfig.mcpServers)) {
              cliConfig.mcpServers = {};
            }
          }
        } catch { /* new file or malformed — start fresh */ }
        cliConfig.mcpServers.agentvibes = {
          type: 'local',
          command: 'npx',
          args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
          env: { AGENTVIBES_LLM: 'copilot' },
          tools: ['*'],
        };
        await fs.writeFile(copilotMcpPath, JSON.stringify(cliConfig, null, 2) + '\n');
      }
    } catch (err) {
      // Best effort — CLI might not be installed.  Log to stderr so users
      // with COPILOT_HOME set but write failures (EACCES) can diagnose.
      console.error(`[agentvibes] Warning: could not write ~/.copilot/mcp-config.json: ${err.message}`);
    }
  } catch (err) {
    mcpError = err.message;
  }

  ensureDefaultLlmConfigSync('copilot', targetDir);
  return { success: true, mcpError };
}

export async function removeCopilotMcp(targetDir) {
  const mcpJsonPath = path.join(targetDir, '.vscode', 'mcp.json');
  try {
    const content = await fs.readFile(mcpJsonPath, 'utf8');
    const parsed = JSON.parse(content);
    // Guard against non-object root or non-object servers (malformed config)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: true };
    }
    const servers = parsed.servers;
    if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
      return { success: true };
    }
    // Remove both old ("agentvibes") and new ("agentvibes-copilot") names
    delete servers.agentvibes;
    delete servers['agentvibes-copilot'];
    const noServers = Object.keys(servers).length === 0;
    const noOtherKeys = Object.keys(parsed).length === 1;  // only "servers"
    if (noServers && noOtherKeys) {
      await fs.unlink(mcpJsonPath);
    } else {
      await fs.writeFile(mcpJsonPath, JSON.stringify(parsed, null, 2) + '\n');
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

  let mcpError = null;
  try {
    await fs.mkdir(codexDir, { recursive: true });
    let existing = '';
    try { existing = await fs.readFile(tomlPath, 'utf8'); } catch { /* new file */ }
    const content = buildCodexToml(existing);
    await fs.writeFile(tomlPath, content);
  } catch (err) {
    mcpError = err.message;
  }

  ensureDefaultLlmConfigSync('codex', targetDir);
  return { success: true, mcpError };
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

// ── Hermes install/check/remove ─────────────────────────────────────────────

function _getHermesHooksDir() {
  const hermesHome = process.env.HERMES_HOME || path.join(process.env.HOME || process.env.USERPROFILE || '', '.hermes');
  return path.join(hermesHome, 'hooks', 'agentvibes-tts');
}

const HERMES_CONFIG_DEFAULTS = {
  mode: 'local',
  sshKey: '/absolute/path/to/id_ed25519_agentvibes',
  host: 'your-receiver-tailscale-ip',
  port: '2222',
  voice: 'en_US-libritts-high::Leo-8',
};

export async function getHermesConfig() {
  const cfgPath = path.join(_getHermesHooksDir(), 'agentvibes-ssh-config.json');
  try {
    const raw = await fs.readFile(cfgPath, 'utf8');
    return { ...HERMES_CONFIG_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...HERMES_CONFIG_DEFAULTS };
  }
}

export async function saveHermesConfig(cfg) {
  const hooksDir = _getHermesHooksDir();
  const hermesHome = process.env.HERMES_HOME || path.join(process.env.HOME || process.env.USERPROFILE || '', '.hermes');
  const resolvedHooksDir = path.resolve(hooksDir);
  const resolvedHermesHome = path.resolve(hermesHome);
  if (!resolvedHooksDir.startsWith(resolvedHermesHome + path.sep)) {
    throw new Error('Invalid Hermes hooks path');
  }
  await fs.mkdir(hooksDir, { recursive: true, mode: 0o700 });
  const rawMode = String(cfg.mode || HERMES_CONFIG_DEFAULTS.mode);
  const safe = {
    mode:   rawMode === 'local' ? 'local' : 'remote',
    sshKey: String(cfg.sshKey || HERMES_CONFIG_DEFAULTS.sshKey),
    host:   String(cfg.host   || HERMES_CONFIG_DEFAULTS.host),
    port:   String(cfg.port   || HERMES_CONFIG_DEFAULTS.port),
    voice:  String(cfg.voice  || HERMES_CONFIG_DEFAULTS.voice),
  };
  await fs.writeFile(
    path.join(hooksDir, 'agentvibes-ssh-config.json'),
    JSON.stringify(safe, null, 2),
    { mode: 0o600 }
  );
  return safe;
}

export async function checkHermesInstalled() {
  try {
    await fs.access(path.join(_getHermesHooksDir(), 'HOOK.yaml'));
    return true;
  } catch {
    return false;
  }
}

export async function installHermes() {
  const hooksDir = _getHermesHooksDir();

  // Validate path stays within hermesHome (no traversal)
  const hermesHome = process.env.HERMES_HOME || path.join(process.env.HOME || process.env.USERPROFILE || '', '.hermes');
  const resolvedHooksDir = path.resolve(hooksDir);
  const resolvedHermesHome = path.resolve(hermesHome);
  if (!resolvedHooksDir.startsWith(resolvedHermesHome)) {
    throw new Error('Invalid Hermes hooks path');
  }

  await fs.mkdir(hooksDir, { recursive: true, mode: 0o700 });

  const hookYaml = `name: agentvibes-tts\ndescription: Send agent responses to AgentVibes TTS remotely\nevents:\n  - agent:end\n`;
  await fs.writeFile(path.join(hooksDir, 'HOOK.yaml'), hookYaml, { mode: 0o600 });

  // Write default SSH config only if it doesn't already exist
  const cfgPath = path.join(hooksDir, 'agentvibes-ssh-config.json');
  try {
    await fs.access(cfgPath);
  } catch {
    await fs.writeFile(cfgPath, JSON.stringify(HERMES_CONFIG_DEFAULTS, null, 2), { mode: 0o600 });
  }

  const handlerPy = `"""
AgentVibes TTS Hook — fires on agent:end to speak the agent's response.

Supports two modes (set via agentvibes-ssh-config.json):
  mode=local   — Hermes and speakers are on the same machine. Calls play-tts.sh directly.
  mode=remote  — Hermes is on a remote server; sends audio over SSH to a receiver.

SETUP: Use the AgentVibes TUI (Configure button) or: set_hermes_config MCP tool,
       then run: hermes gateway restart
"""

import asyncio, base64, json, logging, os, re, subprocess, time

# ---------------------------------------------------------------------------
# Config is read from agentvibes-ssh-config.json in this directory.
# Edit that file directly or use the AgentVibes TUI / MCP tools.
# ---------------------------------------------------------------------------
_CFG_DIR  = os.path.dirname(os.path.abspath(__file__))
_CFG_PATH = os.path.join(_CFG_DIR, "agentvibes-ssh-config.json")
try:
    with open(_CFG_PATH, encoding="utf-8") as _f:
        _cfg = json.load(_f)
except Exception:
    _cfg = {}

_MODE               = _cfg.get("mode",   "local")   # "local" or "remote"
AGENTVIBES_SSH_KEY  = _cfg.get("sshKey", "/absolute/path/to/id_ed25519_agentvibes")
AGENTVIBES_HOST     = _cfg.get("host",   "your-receiver-tailscale-ip")
AGENTVIBES_PORT     = _cfg.get("port",   "2222")
AGENTVIBES_VOICE    = _cfg.get("voice",  "en_US-libritts-high::Leo-8")
AGENTVIBES_USER     = "agentvibes-receiver"
AGENTVIBES_PROJECT  = "hermes"
MAX_CONTENT_LEN     = 200
PREFIX              = "Hermes here, "
_KNOWN_HOSTS        = os.path.join(_CFG_DIR, "known_hosts")
_LOG_FILE           = os.path.join(_CFG_DIR, "tts-hook.log")

_log = logging.getLogger("agentvibes-tts")
if not _log.handlers:
    try:
        _h = logging.FileHandler(_LOG_FILE, encoding="utf-8")
        _h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        _log.addHandler(_h)
    except OSError:
        _log.addHandler(logging.NullHandler())
    _log.setLevel(logging.INFO)

_last_sent: float = 0.0
_MIN_INTERVAL_S: float = 3.0


def _find_play_tts() -> str | None:
    """Locate the AgentVibes play-tts.sh on this machine (local mode only)."""
    env_hooks = os.environ.get("AGENTVIBES_HOOKS", "")
    candidates = []
    if env_hooks:
        candidates.append(os.path.join(env_hooks, "play-tts.sh"))
    candidates += [
        os.path.expanduser("~/.claude/hooks/play-tts.sh"),
        os.path.expanduser("~/.npm-global/lib/node_modules/agentvibes/.claude/hooks/play-tts.sh"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


def _tts_speak_local(text: str) -> None:
    """Local mode: call play-tts.sh directly on this machine."""
    play_tts = _find_play_tts()
    if not play_tts:
        _log.warning("local mode: play-tts.sh not found — set AGENTVIBES_HOOKS or install AgentVibes")
        return
    env = os.environ.copy()
    env.setdefault("AGENTVIBES_LLM", AGENTVIBES_PROJECT)
    try:
        result = subprocess.run(
            ["bash", play_tts, text],
            capture_output=True, timeout=30, env=env,
        )
        if result.returncode != 0:
            _log.warning("play-tts exit %d: %s", result.returncode, result.stderr.decode(errors="replace").strip())
        else:
            _log.info("local TTS OK")
    except subprocess.TimeoutExpired:
        _log.warning("play-tts timed out after 30s")
    except Exception as exc:
        _log.warning("play-tts error: %s", exc)


def _tts_speak_remote(text: str) -> None:
    """Remote mode: send payload over SSH to AgentVibes receiver."""
    payload = base64.b64encode(json.dumps({
        "text": text, "voice": AGENTVIBES_VOICE, "project": AGENTVIBES_PROJECT,
        "provider": "piper", "pretext": "", "effects": "", "music": "", "volume": "", "speed": "",
    }).encode()).decode()
    cmd = ["ssh", "-i", AGENTVIBES_SSH_KEY, "-o", "ConnectTimeout=5",
           "-o", "StrictHostKeyChecking=accept-new", "-o", f"UserKnownHostsFile={_KNOWN_HOSTS}",
           "-o", "BatchMode=yes", "-p", AGENTVIBES_PORT, f"{AGENTVIBES_USER}@{AGENTVIBES_HOST}", payload]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=15)
        if result.returncode != 0:
            _log.warning("ssh exit %d: %s", result.returncode, result.stderr.decode(errors="replace").strip())
        else:
            _log.info("queued OK: %s", result.stdout.decode(errors="replace").strip())
    except subprocess.TimeoutExpired:
        _log.warning("ssh timed out after 15s")
    except Exception as exc:
        _log.warning("ssh error: %s", exc)


def _tts_speak(text: str) -> None:
    global _last_sent
    if not text or not text.strip():
        return
    now = time.monotonic()
    if now - _last_sent < _MIN_INTERVAL_S:
        _log.info("rate-limited: %.1fs since last send — skipping", now - _last_sent)
        return
    _last_sent = now
    full_text = PREFIX + text.strip()
    max_len = len(PREFIX) + MAX_CONTENT_LEN
    if len(full_text) > max_len:
        full_text = full_text[:max_len].rsplit(" ", 1)[0] + "..."
    if _MODE == "local":
        _tts_speak_local(full_text)
    else:
        _tts_speak_remote(full_text)

async def handle(event_type: str, context: dict) -> None:
    if event_type != "agent:end":
        return
    response = (context.get("response") or "").strip()
    if not response:
        return
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _tts_speak, _strip_markdown(response))

def _strip_markdown(text: str) -> str:
    text = re.sub(r"\`\`\`[\\s\\S]*?\`\`\`", "", text)
    text = re.sub(r"\`([^\`]+)\`", r"\\1", text)
    text = re.sub(r"\\*{1,2}([^\\*]+)\\*{1,2}", r"\\1", text)
    text = re.sub(r"\\[([^\\]]+)\\]\\([^\\)]+\\)", r"\\1", text)
    return re.sub(r"\\s+", " ", text).strip()
`;
  await fs.writeFile(path.join(hooksDir, 'handler.py'), handlerPy, { mode: 0o600 });

  return { hooksDir, handlerPath: path.join(hooksDir, 'handler.py'), cfgPath };
}

export async function removeHermes() {
  const hooksDir = _getHermesHooksDir();
  try { await fs.unlink(path.join(hooksDir, 'HOOK.yaml')); } catch { /* already gone */ }
  try { await fs.unlink(path.join(hooksDir, 'handler.py')); } catch { /* already gone */ }
  try { await fs.rmdir(hooksDir); } catch { /* not empty or gone */ }
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
  // Sanitize user-editable fields: strip pipe chars (config delimiter) and newlines
  // (newlines could inject extra rows into the pipe-delimited config file)
  const sanitize = (v) => (v || '').replace(/[\|\n\r\x00]/g, '');
  const cfgLine = `${cfgKey}|${sanitize(config.effects)}|${sanitize(config.bgTrack)}|${sanitize(config.bgVolume)}|${sanitize(config.voice)}|${sanitize(config.pretext)}|${sanitize(config.ttsEngine)}`;
  const resolvedTargetDir = targetDir || process.env.INIT_CWD || process.cwd();
  // When targetDir is explicitly passed, always write to the project dir — never follow
  // config.sourcePath back to the global ~/.claude/config (it may have been loaded from there
  // as a "default seed" for a new project, and writing back would pollute other projects).
  const cfgPath = targetDir
    ? path.join(resolvedTargetDir, '.claude', 'config', 'audio-effects.cfg')
    : (config.sourcePath || resolveCfgPath(resolvedTargetDir));

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

// ── Transport Provider SSH Config ────────────────────────────────────────────

export const TRANSPORT_PROVIDERS = [
  {
    id: 'ssh-remote',
    name: 'SSH Remote',
    desc: 'Send text to remote device via SSH for local TTS playback',
    defaultPort: '22',
  },
  {
    id: 'agentvibes-receiver',
    name: 'AgentVibes Receiver',
    desc: 'Send to a device running the AgentVibes receiver app',
    defaultPort: '2222',
  },
  {
    id: 'termux-ssh',
    name: 'Termux SSH',
    desc: 'Play TTS on Android via Termux SSH',
    defaultPort: '8022',
  },
];

const _TRANSPORT_CFG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.agentvibes', 'transport-config.json'
);

export async function getTransportConfig(providerId) {
  const defaultPort = TRANSPORT_PROVIDERS.find(p => p.id === providerId)?.defaultPort ?? '22';
  const defaults = { mode: 'local', connType: 'manual', sshKey: '', host: '', port: defaultPort };
  try {
    const raw = await fs.readFile(_TRANSPORT_CFG_PATH, 'utf8');
    const all = JSON.parse(raw);
    return { ...defaults, ...(all[providerId] || {}) };
  } catch {
    return { ...defaults };
  }
}

export async function saveTransportConfig(providerId, cfg) {
  const cfgDir = path.dirname(_TRANSPORT_CFG_PATH);
  // Validate path stays within .agentvibes home dir
  const resolvedPath = path.resolve(_TRANSPORT_CFG_PATH);
  const resolvedDir = path.resolve(cfgDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    throw new Error('Invalid transport config path');
  }
  await fs.mkdir(cfgDir, { recursive: true, mode: 0o700 });

  let all = {};
  try {
    const raw = await fs.readFile(_TRANSPORT_CFG_PATH, 'utf8');
    all = JSON.parse(raw);
  } catch {}

  const defaultPort = TRANSPORT_PROVIDERS.find(p => p.id === providerId)?.defaultPort ?? '22';
  const isAlias = cfg.connType === 'alias';
  const safe = {
    mode:     cfg.mode === 'remote' ? 'remote' : 'local',
    connType: isAlias ? 'alias' : 'manual',
    sshKey:   String(cfg.sshKey || ''),
    host:     String(cfg.host   || ''),
    // In alias mode, port is handled by ~/.ssh/config — persist empty string
    // so alias detection on reload doesn't require port to be absent.
    port:     isAlias ? '' : String(cfg.port || defaultPort),
  };
  all[providerId] = safe;

  await fs.writeFile(_TRANSPORT_CFG_PATH, JSON.stringify(all, null, 2), { mode: 0o600 });

  // Write backward-compat host file so legacy scripts still work
  const hostFileMap = {
    'ssh-remote':           'ssh-remote-host.txt',
    'agentvibes-receiver':  'agentvibes-receiver-host.txt',
    'termux-ssh':           'termux-ssh-host.txt',
  };
  const hostFile = hostFileMap[providerId];
  if (hostFile && safe.host) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const claudeDir = path.join(homeDir, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(path.join(claudeDir, hostFile), safe.host + '\n', { mode: 0o600 });
  }

  return safe;
}
