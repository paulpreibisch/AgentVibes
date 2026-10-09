/**
 * AgentVibes — Shared music-preview transport helpers.
 *
 * Both music-preview surfaces (the Music tab and the track-picker widget) must
 * make the same remote-vs-local decision: a transport provider routes audio to
 * a remote receiver, so a local MP3 preview would be silent on a headless box
 * and must be forwarded instead. This module holds the provider-resolve and the
 * remote-forward spawn so the two surfaces can't drift.
 *
 * The caller owns UI feedback (status text, error messages) and attaches its own
 * exit/error/stderr handlers to the returned child process.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { detectRemoteLlm } from './audio-env.js';

// Transport providers route audio to a remote receiver; local MP3 playback is
// silent on a headless/remote box, so track previews must be forwarded instead.
export const REMOTE_PROVIDERS = ['ssh-remote', 'agentvibes-receiver'];

// Preview transport badge + row spinner live in the neutral preview-transport
// module (shared with the voice pickers). Re-exported here for the music
// surfaces that already import from music-preview.js.
export { transportBadge, createRowSpinner, previewRowContent, SPIN_FRAMES } from './preview-transport.js';

/**
 * Resolve the active provider and the project dir it was read from, using the
 * same search order as the voice pickers (CLAUDE_PROJECT_DIR → cwd → package →
 * home). Returns { remote, projectDir } so a remote preview can forward the
 * track to the receiver and tell the sender which .claude dir to resolve.
 * @param {string} packageRoot - AgentVibes package/repo root (package fallback)
 * @returns {{ remote: boolean, projectDir: string }}
 */
export function resolveMusicProvider(packageRoot) {
  const dirs = [process.env.CLAUDE_PROJECT_DIR, process.cwd(), packageRoot, os.homedir()].filter(Boolean);

  // A configured remote TTS transport (transport-config.json mode=remote) routes
  // audio to a receiver, so a LOCAL music preview would be silent on this box —
  // forward it too, matching the voice preview. This is a SEPARATE signal from
  // the provider file: a project can carry tts-provider.txt=piper (local) while
  // the global transport routes TTS to a remote receiver, and the two surfaces
  // must agree or the picker plays to an inaudible local sink.
  const transportRemote = !!detectRemoteLlm();

  for (const d of dirs) {
    const p = path.join(d, '.claude', 'tts-provider.txt');
    try {
      if (fs.existsSync(p)) {
        const provider = fs.readFileSync(p, 'utf8').trim();
        return { remote: REMOTE_PROVIDERS.includes(provider) || transportRemote, projectDir: d };
      }
    } catch { /* next */ }
  }
  // No provider file found anywhere — still forward if a remote transport is set.
  return { remote: transportRemote, projectDir: process.env.CLAUDE_PROJECT_DIR || process.cwd() };
}

/**
 * Resolve the SSH sender script path, preferring the package-bundled copy and
 * falling back to the project's .claude/hooks copy.
 * @param {string} packageRoot
 * @param {string} projectDir
 * @returns {string}
 */
export function resolveRemoteSender(packageRoot, projectDir) {
  const pkgSender = path.resolve(packageRoot, '.claude', 'hooks', 'play-tts-ssh-remote.sh');
  return fs.existsSync(pkgSender)
    ? pkgSender
    : path.join(projectDir, '.claude', 'hooks', 'play-tts-ssh-remote.sh');
}

/**
 * Spawn the SSH sender to forward a music track to the receiver, or stop the
 * current one. Fire-and-forget (the sender exits after handing the payload to
 * SSH; the receiver plays/stops asynchronously). Returns the child process so
 * the caller can wire its own exit/error/stderr handlers for UI feedback.
 *
 * @param {object} opts
 * @param {string} opts.packageRoot
 * @param {string} opts.projectDir
 * @param {object} opts.env         - base spawn env (e.g. buildAudioEnv())
 * @param {string} [opts.track]     - track filename to play (ignored when stop)
 * @param {boolean} [opts.stop]     - send an explicit music-stop signal instead
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnMusicRemote({ packageRoot, projectDir, env, track = null, stop = false }) {
  const senderPath = resolveRemoteSender(packageRoot, projectDir);
  const spawnEnv = { ...env, CLAUDE_PROJECT_DIR: projectDir };
  if (stop) spawnEnv.AGENTVIBES_MUSIC_STOP = '1';
  else spawnEnv.AGENTVIBES_MUSIC_ONLY = track;
  return spawn('bash', [senderPath, '', ''], { stdio: ['ignore', 'ignore', 'pipe'], detached: true, env: spawnEnv }); // NOSONAR
}
