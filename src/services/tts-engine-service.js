/**
 * AgentVibes — TTS Engine Service
 *
 * OS-aware TTS engine detection: enumerates available engines,
 * checks binary availability, and reports installation status.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const _hooksDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.claude', 'hooks');

const TTS_ENGINES = [
  {
    id: 'piper', name: 'Piper TTS', desc: 'Open-source, fast, many voices — recommended', native: false,
    installCmd: process.platform === 'win32'
      ? 'winget install --id Rhasspy.Piper --accept-package-agreements --accept-source-agreements'
      : process.platform === 'darwin'
        ? 'brew install piper'
        : `${path.join(_hooksDir, 'piper-installer.sh')} --non-interactive`,
    // Structured form — robust against spaces in paths (do NOT split installCmd on ' ').
    installSpec: process.platform === 'win32'
      ? { cmd: 'winget', args: ['install', '--id', 'Rhasspy.Piper', '--accept-package-agreements', '--accept-source-agreements'] }
      : process.platform === 'darwin'
        ? { cmd: 'brew', args: ['install', 'piper'] }
        : { cmd: path.join(_hooksDir, 'piper-installer.sh'), args: ['--non-interactive'] },
  },
  {
    id: 'kokoro', name: 'Kokoro TTS', desc: 'Local neural TTS — 60+ voices, 8 languages, no API key', native: false,
    installCmd: `${path.join(_hooksDir, 'kokoro-installer.sh')} --non-interactive`,
    // Structured form — robust against spaces in paths (do NOT split installCmd on ' ').
    installSpec: { cmd: path.join(_hooksDir, 'kokoro-installer.sh'), args: ['--non-interactive'] },
    requiresApiKey: false,
  },
  {
    id: 'elevenlabs', name: 'ElevenLabs', desc: 'Premium cloud voices — free tier available, 32+ languages', native: false,
    installCmd: `echo "Set ELEVENLABS_API_KEY in your shell profile. Free key at elevenlabs.io"`,
    requiresApiKey: true,
    apiKeyEnvVar: 'ELEVENLABS_API_KEY',
  },
  {
    id: 'soprano', name: 'Soprano TTS', desc: 'Local neural TTS via Gradio WebUI', native: false,
    installCmd: 'pip install soprano-tts',
  },
  { id: 'sapi', name: 'Windows SAPI', desc: 'Built-in Windows speech — no install needed', native: true, platform: 'win32' },
  { id: 'macos-say', name: 'macOS Say', desc: 'Built-in macOS speech synthesis — no install needed', native: true, platform: 'darwin' },
];

export function getAvailableEngines() {
  return TTS_ENGINES.filter(e => !e.platform || e.platform === process.platform);
}

export function checkEngineInstalled(engineId) {
  const engine = TTS_ENGINES.find(e => e.id === engineId);
  if (!engine) return false;
  if (engine.native) return true; // Native engines are always available on their platform

  // ElevenLabs: check API key in env or key file
  if (engineId === 'elevenlabs') {
    if (process.env.ELEVENLABS_API_KEY?.trim()) return true;
    try {
      const keyFile = path.join(os.homedir(), '.agentvibes', 'elevenlabs-key.txt');
      return fs.existsSync(keyFile) && fs.readFileSync(keyFile, 'utf8').trim().length > 0;
    } catch { return false; }
  }

  // Kokoro: use find_spec (no import) to avoid the slow torch load that causes ETIMEDOUT.
  // Try each platform-appropriate python command (Windows lacks `python3`).
  if (engineId === 'kokoro') {
    const pythonCommands = process.platform === 'win32'
      ? ['py', 'python', 'python3']
      : ['python3', 'python'];
    for (const pythonCmd of pythonCommands) {
      try {
        execFileSync(pythonCmd, ['-c', "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('kokoro') else 1)"], { stdio: 'ignore', timeout: 3000 }); // NOSONAR
        return true;
      } catch {
        // try next python command
      }
    }
    return false;
  }

  // Check binary availability — soprano has two possible binaries
  const binaryMap = { piper: ['piper'], soprano: ['soprano-tts', 'soprano-webui'] };
  const binaries = binaryMap[engineId];
  if (!binaries) return false;

  for (const binary of binaries) {
    try {
      if (process.platform === 'win32') {
        // Check Windows Piper location
        if (engineId === 'piper') {
          const localAppData = process.env.LOCALAPPDATA ||
            (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
          if (localAppData && fs.existsSync(path.join(localAppData, 'Programs', 'Piper', 'piper.exe'))) return true;
        }
        execFileSync('where', [binary], { stdio: 'ignore', timeout: 2000 }); // NOSONAR
        return true;
      }
      execFileSync('which', [binary], { stdio: 'ignore', timeout: 2000 }); // NOSONAR
      return true;
    } catch {
      // try next binary
    }
  }
  return false;
}

export function getEngineStatuses() {
  return getAvailableEngines().map(e => ({
    ...e,
    installed: checkEngineInstalled(e.id),
  }));
}
