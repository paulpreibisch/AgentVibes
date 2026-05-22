/**
 * AgentVibes Cross-Platform Resolver
 *
 * Implements the Agent Vibes Cross-Platform Contract v1.0.
 * Single source of truth for binary resolution, path conventions, and env var interface.
 *
 * Resolution order (authoritative):
 *   1. ENV_OVERRIDE  — AGENTVIBES_*_PATH env var; if invalid, fail HARD (no fallthrough)
 *   2. which/where   — first result that passes validation
 *   3. HINT_PATHS    — platform hint list in order; first valid wins
 *   4. FAIL          — structured error, exit code 2
 *
 * Supported platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64
 * WSL2 is treated as linux-x64.
 */

import { execFileSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

// ─── Platform Detection ───────────────────────────────────────────────────────

function isWSL() {
  try {
    return /microsoft|wsl/i.test(fs.readFileSync('/proc/version', 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Detect the current platform ID.
 * Set AGENTVIBES_PLATFORM to override (CI / testing only).
 * @returns {string} One of: darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64, unknown
 */
export function detectPlatform() {
  const forced = process.env.AGENTVIBES_PLATFORM;
  if (forced) return forced;

  const p = process.platform;
  const arch = process.arch;

  if (p === 'linux' && isWSL()) return arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  if (p === 'darwin') return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  if (p === 'linux') return arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  if (p === 'win32') return 'win32-x64';
  return 'unknown';
}

// ─── Path Hint Lists (only hardcoded paths in the entire codebase) ────────────

const PIPER_HINTS = {
  'darwin-arm64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'share', 'pipx', 'venvs', 'piper-tts', 'bin', 'piper'),
    '/opt/homebrew/bin/piper',
    '/usr/local/bin/piper',
  ],
  'darwin-x64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'share', 'pipx', 'venvs', 'piper-tts', 'bin', 'piper'),
    '/usr/local/bin/piper',
    '/opt/homebrew/bin/piper',
  ],
  'linux-x64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'share', 'pipx', 'venvs', 'piper-tts', 'bin', 'piper'),
    '/usr/bin/piper',
    '/usr/local/bin/piper',
    '/snap/bin/piper',
  ],
  'linux-arm64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'bin', 'piper'),
    path.join(os.homedir(), '.local', 'share', 'pipx', 'venvs', 'piper-tts', 'bin', 'piper'),
    '/usr/bin/piper',
    '/usr/local/bin/piper',
  ],
  'win32-x64': () => {
    const appdata = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localappdata = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const programfiles = process.env.PROGRAMFILES || path.join('C:', 'Program Files');
    return [
      path.join(appdata, 'AgentVibes', 'bin', 'piper.exe'),
      path.join(localappdata, 'AgentVibes', 'bin', 'piper.exe'),
      path.join(programfiles, 'AgentVibes', 'bin', 'piper.exe'),
    ];
  },
};

const FFMPEG_HINTS = {
  'darwin-arm64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'ffmpeg'),
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ],
  'darwin-x64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'ffmpeg'),
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
  ],
  'linux-x64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'ffmpeg'),
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ],
  'linux-arm64': () => [
    path.join(os.homedir(), '.agentvibes', 'bin', 'ffmpeg'),
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ],
  'win32-x64': () => {
    const appdata = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localappdata = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const programfiles = process.env.PROGRAMFILES || path.join('C:', 'Program Files');
    return [
      path.join(appdata, 'AgentVibes', 'bin', 'ffmpeg.exe'),
      path.join(localappdata, 'AgentVibes', 'bin', 'ffmpeg.exe'),
      path.join(programfiles, 'ffmpeg', 'bin', 'ffmpeg.exe'),
    ];
  },
};

// Derive ffprobe hints by substituting the binary name in every ffmpeg path.
// ffprobe is always co-located with ffmpeg so sharing the directory list is correct.
function deriveBinaryHints(templateHints, binaryName) {
  const result = {};
  for (const [plat, fn] of Object.entries(templateHints)) {
    result[plat] = () => fn().map(p => {
      const dir = path.dirname(p);
      const ext = path.extname(p);
      return path.join(dir, binaryName + ext);
    });
  }
  return result;
}

const FFPROBE_HINTS = deriveBinaryHints(FFMPEG_HINTS, 'ffprobe');

const BINARY_HINTS = { piper: PIPER_HINTS, ffmpeg: FFMPEG_HINTS, ffprobe: FFPROBE_HINTS };

/** Canonical env var names — only override surface permitted by the contract */
export const ENV_VARS = {
  piper: 'AGENTVIBES_PIPER_PATH',
  ffmpeg: 'AGENTVIBES_FFMPEG_PATH',
  ffprobe: 'AGENTVIBES_FFPROBE_PATH',
  config_dir: 'AGENTVIBES_CONFIG_DIR',
  data_dir: 'AGENTVIBES_DATA_DIR',
  cache_dir: 'AGENTVIBES_CACHE_DIR',
  voice_dir: 'AGENTVIBES_VOICE_DIR',
};

// ─── Binary Validation ────────────────────────────────────────────────────────

/**
 * Validate that a candidate binary path is a real, executable, working binary.
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateBinary(binaryPath, binaryName) {
  let stat;
  try {
    stat = fs.statSync(binaryPath);
  } catch {
    return { valid: false, reason: 'not_found' };
  }

  if (!stat.isFile()) return { valid: false, reason: 'not_a_file' };

  if (process.platform !== 'win32') {
    try {
      fs.accessSync(binaryPath, fs.constants.X_OK);
    } catch {
      return { valid: false, reason: 'not_executable' };
    }
  }

  // Smoke test: binary must respond to --version (or -version for ffmpeg/ffprobe)
  const versionFlag = (binaryName === 'ffmpeg' || binaryName === 'ffprobe') ? '-version' : '--version';
  try {
    execFileSync(binaryPath, [versionFlag], { stdio: 'pipe', timeout: 3000 });
    return { valid: true };
  } catch {
    return { valid: false, reason: 'version_check_failed' };
  }
}

/**
 * Find binary using which (POSIX) or where (Windows).
 * Returns the realpath of the first result, or null.
 */
export function whichBinary(name) {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = execFileSync(cmd, [name], { encoding: 'utf8', stdio: 'pipe', timeout: 3000 });
    const first = result.trim().split('\n')[0].trim();
    if (!first) return null;
    // Resolve symlinks to get the real binary path
    return fs.realpathSync(first);
  } catch {
    return null;
  }
}

// ─── Binary Resolution (4-step contract) ─────────────────────────────────────

/**
 * Resolve a binary following the contract resolution order.
 * Throws a structured error if resolution fails.
 *
 * @param {'piper'|'ffmpeg'|'ffprobe'} binaryName
 * @returns {{ path: string, source: string }}
 */
export function resolveBinary(binaryName) {
  const platformId = detectPlatform();
  const envVar = ENV_VARS[binaryName];
  const tried = [];

  // Step 1: ENV_OVERRIDE — if set, it's absolute. Invalid = hard fail, no fallthrough.
  if (envVar && process.env[envVar]) {
    const overridePath = process.env[envVar];
    const validation = validateBinary(overridePath, binaryName);
    tried.push({ step: 'ENV_OVERRIDE', path: overridePath, ...validation });
    if (!validation.valid) {
      const err = new Error(
        `[AgentVibes] RESOLUTION_FAILURE\n` +
        `  binary:   ${binaryName}\n` +
        `  error:    ENV_OVERRIDE_INVALID\n` +
        `  platform: ${platformId}\n` +
        `  ${envVar}=${overridePath} (${validation.reason})\n` +
        `  fix:      Correct the ${envVar} environment variable or unset it`
      );
      err.code = 'ENV_OVERRIDE_INVALID';
      err.tried = tried;
      throw err;
    }
    return { path: overridePath, source: 'env_override' };
  }
  tried.push({ step: 'ENV_OVERRIDE', path: 'not set' });

  // Step 2: which/where — respect what the user already has configured
  const whichResult = whichBinary(binaryName);
  if (whichResult) {
    const validation = validateBinary(whichResult, binaryName);
    tried.push({ step: 'WHICH', path: whichResult, ...validation });
    if (validation.valid) {
      return { path: whichResult, source: 'which' };
    }
    // Exists in PATH but failed validation — log and continue to hints
  } else {
    tried.push({ step: 'WHICH', path: 'not found' });
  }

  // Step 3: Platform hint list — last resort before failure
  const hintFn = BINARY_HINTS[binaryName]?.[platformId];
  if (hintFn) {
    const hints = hintFn();
    for (let i = 0; i < hints.length; i++) {
      const hintPath = hints[i];
      const validation = validateBinary(hintPath, binaryName);
      tried.push({ step: `HINT[${i}]`, path: hintPath, ...validation });
      if (validation.valid) {
        return { path: hintPath, source: `hint[${i}]` };
      }
    }
  }

  // Step 4: FAIL — structured error with full audit trail
  const triedFormatted = tried
    .map(t => `    - ${t.step.padEnd(12)}: ${t.path}${t.reason ? ` → ${t.reason}` : ''}`)
    .join('\n');
  const err = new Error(
    `[AgentVibes] RESOLUTION_FAILURE\n` +
    `  binary:   ${binaryName}\n` +
    `  error:    BINARY_NOT_FOUND\n` +
    `  platform: ${platformId}\n` +
    `  tried:\n${triedFormatted}\n` +
    `  fix:      Install ${binaryName} or set ${envVar} to the binary path`
  );
  err.code = 'BINARY_NOT_FOUND';
  err.binary = binaryName;
  err.platform = platformId;
  err.tried = tried;
  throw err;
}

// ─── Directory Resolution ─────────────────────────────────────────────────────

/**
 * Resolve the voice model directory (never contains tilde on return).
 * Windows: %LOCALAPPDATA%\AgentVibes\voices
 * POSIX: $XDG_DATA_HOME/agentvibes/voices or ~/.local/share/agentvibes/voices
 */
export function resolveVoiceDir() {
  const override = process.env[ENV_VARS.voice_dir];
  if (override) return path.resolve(override);
  return path.join(resolveDataDir(), 'voices');
}

/**
 * Resolve the data directory.
 * Uses LOCALAPPDATA on Windows, XDG_DATA_HOME or ~/.local/share on POSIX.
 */
export function resolveDataDir() {
  const override = process.env[ENV_VARS.data_dir];
  if (override) return path.resolve(override);

  const platformId = detectPlatform();
  if (platformId === 'win32-x64') {
    const localappdata = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localappdata, 'AgentVibes');
  }
  const xdgData = process.env.XDG_DATA_HOME;
  if (xdgData) return path.join(xdgData, 'agentvibes');
  return path.join(os.homedir(), '.local', 'share', 'agentvibes');
}

/**
 * Resolve the config directory.
 * Uses APPDATA on Windows, XDG_CONFIG_HOME or ~/.config on POSIX.
 */
export function resolveConfigDir() {
  const override = process.env[ENV_VARS.config_dir];
  if (override) return path.resolve(override);

  const platformId = detectPlatform();
  if (platformId === 'win32-x64') {
    const appdata = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appdata, 'AgentVibes');
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  if (xdgConfig) return path.join(xdgConfig, 'agentvibes');
  return path.join(os.homedir(), '.config', 'agentvibes');
}

// ─── PATH Augmentation Helper ─────────────────────────────────────────────────

/**
 * Return extra PATH directories for the current platform.
 * MCP servers launched by Claude Desktop inherit a sanitized PATH that omits
 * Homebrew (Mac) and pipx (POSIX) locations — this list covers those gaps.
 * Never includes directories already on PATH.
 * @returns {string[]} List of absolute directory paths
 */
export function getPathAugmentation() {
  const platformId = detectPlatform();
  const extra = [];

  if (platformId === 'darwin-arm64') {
    extra.push('/opt/homebrew/bin', '/usr/local/bin');
  } else if (platformId === 'darwin-x64') {
    extra.push('/usr/local/bin', '/opt/homebrew/bin');
  }
  // Linux/WSL: ~/.local/bin is the only reliable extra location
  if (platformId === 'linux-x64' || platformId === 'linux-arm64') {
    extra.push(path.join(os.homedir(), '.local', 'bin'));
  }
  // pipx venv — all POSIX platforms
  if (platformId !== 'win32-x64') {
    extra.push(path.join(os.homedir(), '.local', 'share', 'pipx', 'venvs', 'piper-tts', 'bin'));
    extra.push(path.join(os.homedir(), '.local', 'bin'));
  }

  // Deduplicate, preserving order
  return [...new Set(extra)];
}
