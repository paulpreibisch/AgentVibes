/**
 * AgentVibes — Shared "bling" readiness cue.
 *
 * A short, fire-and-forget chime played the instant a preview is committed, so
 * silence during synthesis / an SSH round-trip never reads as a hang. Used by
 * BOTH the voice picker (setup-tab.js) and the music-preview surfaces
 * (music-tab.js, track-picker.js) so they can't drift.
 *
 * `buildBlingCommand` was originally defined in setup-tab.js; it was moved here
 * and is re-exported from setup-tab.js for backward compatibility (existing
 * imports and tests keep working).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Build the fire-and-forget "preview ready" cue command for a platform. Pure
 * (no spawning here, so it is unit-testable). Plays the bundled CC0 wav when
 * present, else falls back to a system sound (Windows) / freedesktop cue or
 * terminal bell (POSIX). stdio is ignored by the caller, so the POSIX bell is
 * redirected to /dev/tty rather than the discarded stdout.
 * @param {string} platform - process.platform value
 * @param {string} wavPath - absolute path to the bling wav
 * @param {boolean} haveWav - whether wavPath exists on disk
 * @returns {{command: string, args: string[]}}
 */
export function buildBlingCommand(platform, wavPath, haveWav) {
  if (platform === 'win32') {
    const ps = haveWav
      ? `Add-Type -AssemblyName System.Windows.Forms; (New-Object System.Media.SoundPlayer('${wavPath.replace(/'/g, "''")}')).PlaySync()`
      : '[System.Media.SystemSounds]::Asterisk.Play(); Start-Sleep -Milliseconds 700';
    return { command: 'powershell', args: ['-NoProfile', '-Command', ps] };
  }
  if (haveWav) {
    // Pass wavPath as a positional arg ($1) so the path is never interpolated
    // into the shell string (prevents injection / breakage on special chars).
    const sh = 'paplay "$1" 2>/dev/null || aplay -q "$1" 2>/dev/null || printf "\\a" > /dev/tty 2>/dev/null';
    return { command: 'bash', args: ['-c', sh, '--', wavPath] };
  }
  const sh = 'paplay /usr/share/sounds/freedesktop/stereo/message.oga 2>/dev/null || printf "\\a" > /dev/tty 2>/dev/null';
  return { command: 'bash', args: ['-c', sh] };
}

/**
 * Resolve the bundled CC0 bling wav for a package root.
 * Sound: "Ui sounds - Shimmering success" by Philip_Berger, CC0 (freesound
 * #648212). See .claude/audio/ui/CREDITS.txt.
 * @param {string} packageRoot - AgentVibes package/repo root
 * @returns {string}
 */
export function resolveBlingWav(packageRoot) {
  return path.join(packageRoot, '.claude', 'audio', 'ui', 'bling-success.wav');
}

/**
 * Play the readiness cue, fire-and-forget. Detached + unref'd + errors
 * swallowed, so it never blocks the UI or fails a preview. A missing wav falls
 * back to a platform system sound via buildBlingCommand.
 * @param {string} packageRoot - AgentVibes package/repo root
 */
export function playBlingCue(packageRoot) {
  try {
    const wav = resolveBlingWav(packageRoot);
    const { command, args } = buildBlingCommand(process.platform, wav, fs.existsSync(wav));
    const cue = spawn(command, args, { stdio: 'ignore', detached: true }); // NOSONAR
    cue.on('error', () => { /* best-effort cue; a spawn failure must not surface */ });
    cue.unref();
  } catch { /* the readiness cue is purely cosmetic — never break the preview */ }
}
