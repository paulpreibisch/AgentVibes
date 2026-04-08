/**
 * AgentVibes — TTS Engine Service
 *
 * OS-aware TTS engine detection: enumerates available engines,
 * checks binary availability, and reports installation status.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const TTS_ENGINES = [
  {
    id: 'piper', name: 'Piper TTS', desc: 'Open-source, fast, many voices — recommended', native: false,
    installCmd: process.platform === 'win32'
      ? 'winget install --id Rhasspy.Piper --accept-package-agreements --accept-source-agreements'
      : process.platform === 'darwin'
        ? 'brew install piper'
        : 'pip install piper-tts',
  },
  {
    id: 'soprano', name: 'Soprano TTS', desc: 'Web-based TTS service with premium voices', native: false,
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
        execFileSync('where', [binary], { stdio: 'ignore', timeout: 2000 });
        return true;
      }
      execFileSync('which', [binary], { stdio: 'ignore', timeout: 2000 });
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
