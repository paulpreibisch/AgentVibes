/**
 * AgentVibes — Cross-platform audio environment helpers.
 *
 * Provides PULSE_SERVER-safe environment and MP3/WAV player detection
 * that works on native Linux, WSL2, macOS, and Windows.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

/**
 * Build a spawn environment with correct PULSE_SERVER handling.
 *
 * - If PULSE_SERVER is already set in the environment, keep it.
 * - On WSL2, set it to the wslg PulseServer socket if it exists.
 * - On native Linux / macOS / Windows, do NOT set it (use system default).
 *
 * Also extends PATH so pipx-installed binaries (piper) are found.
 *
 * @returns {Object} Environment object safe to pass to child_process.spawn
 */
export function buildAudioEnv() {
  const env = {
    ...process.env,
    PATH: [process.env.PATH, path.join(os.homedir(), '.local', 'bin'), '/usr/local/bin']
      .filter(Boolean).join(process.platform === 'win32' ? ';' : ':'),
  };

  if (process.env.PULSE_SERVER) {
    env.PULSE_SERVER = process.env.PULSE_SERVER;
  } else if (fs.existsSync('/mnt/wslg/PulseServer')) {
    env.PULSE_SERVER = 'unix:/mnt/wslg/PulseServer';
  }
  // else: leave PULSE_SERVER unset — native PulseAudio/PipeWire uses its default socket

  return env;
}

// ---------------------------------------------------------------------------
// Player detection

/** @typedef {{ bin: string, args: (file: string) => string[] }} Player */

/** MP3-capable players in preference order */
const MP3_PLAYERS = [
  { bin: 'ffplay',  args: (f) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f] },
  { bin: 'play',    args: (f) => [f] },        // sox
  { bin: 'mpg123',  args: (f) => ['-q', f] },
  { bin: 'cvlc',    args: (f) => ['--play-and-exit', '--no-video', f] },
  { bin: 'mpv',     args: (f) => ['--no-video', '--really-quiet', f] },
  { bin: 'afplay',  args: (f) => [f] },        // macOS
];

/** WAV-capable players in preference order */
const WAV_PLAYERS = [
  { bin: 'aplay',   args: (f) => [f] },        // ALSA (Linux)
  { bin: 'paplay',  args: (f) => [f] },        // PulseAudio
  { bin: 'play',    args: (f) => [f] },        // sox
  { bin: 'ffplay',  args: (f) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f] },
  { bin: 'afplay',  args: (f) => [f] },        // macOS
  { bin: 'mpv',     args: (f) => ['--no-video', '--really-quiet', f] },
  { bin: 'cvlc',    args: (f) => ['--play-and-exit', '--no-video', f] },
];

/** Windows players — use PowerShell's SoundPlayer for WAV */
const WIN_WAV_PLAYER = {
  bin: 'powershell',
  args: (f) => ['-NoProfile', '-Command',
    `(New-Object Media.SoundPlayer '${f.replace(/'/g, "''")}').PlaySync()`],
};

/** Windows MP3 player — use WPF MediaPlayer (supports MP3, WAV, WMA, etc.) */
const WIN_MP3_PLAYER = {
  bin: 'powershell',
  args: (f) => ['-NoProfile', '-Command',
    `Add-Type -AssemblyName PresentationCore; ` +
    `$p = New-Object System.Windows.Media.MediaPlayer; ` +
    `$p.Open([uri]'${f.replace(/'/g, "''")}'); ` +
    `$p.Play(); ` +
    `Start-Sleep -Milliseconds 500; ` +
    `while ($p.NaturalDuration.HasTimeSpan -and $p.Position -lt $p.NaturalDuration.TimeSpan) { Start-Sleep -Milliseconds 200 }; ` +
    `if (-not $p.NaturalDuration.HasTimeSpan) { Start-Sleep -Seconds 30 }; ` +
    `$p.Close()`],
};

/**
 * Detect the first available player from a list.
 * Caches results per list so `which` is only called once per binary.
 *
 * @param {Player[]} players
 * @param {Object} env - Environment to use for `which`
 * @returns {Player|null}
 */
const _cache = new Map();
function _detect(players, env) {
  for (const p of players) {
    if (_cache.has(p.bin)) {
      if (_cache.get(p.bin)) return p;
      continue;
    }
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const r = spawnSync(whichCmd, [p.bin], { stdio: 'pipe', env });
    const found = r.status === 0;
    _cache.set(p.bin, found);
    if (found) return p;
  }
  return null;
}

/**
 * Detect the best available MP3 player.
 * On Windows, falls back to ffplay/mpv if installed, otherwise null.
 *
 * @param {Object} [env] - Environment (defaults to buildAudioEnv())
 * @returns {Player|null}
 */
export function detectMp3Player(env) {
  env = env || buildAudioEnv();
  if (process.platform === 'win32') {
    // Try cross-platform players first, fall back to WPF MediaPlayer
    return _detect(MP3_PLAYERS, env) || WIN_MP3_PLAYER;
  }
  return _detect(MP3_PLAYERS, env);
}

/**
 * Detect the best available WAV player.
 * On Windows, uses PowerShell SoundPlayer as built-in fallback.
 *
 * @param {Object} [env] - Environment (defaults to buildAudioEnv())
 * @returns {Player|null}
 */
export function detectWavPlayer(env) {
  env = env || buildAudioEnv();
  if (process.platform === 'win32') {
    // Try cross-platform players first, fall back to PowerShell
    return _detect(WAV_PLAYERS, env) || WIN_WAV_PLAYER;
  }
  return _detect(WAV_PLAYERS, env);
}
