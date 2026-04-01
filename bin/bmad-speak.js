#!/usr/bin/env node

/**
 * AgentVibes - Cross-platform BMAD agent TTS entry point
 *
 * Delegates to the correct platform script:
 *   Windows (non-WSL) → .claude/hooks-windows/bmad-speak.ps1
 *   Linux/Mac/WSL     → .claude/hooks/bmad-speak.sh
 *
 * Usage: node bin/bmad-speak.js "Agent Name" "dialogue text"
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const [, , agentName, dialogue] = process.argv;

if (!agentName || !dialogue) {
  process.stderr.write('Usage: bmad-speak.js "Agent Name" "dialogue text"\n');
  process.exit(1);
}

const IS_WINDOWS = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;

// Resolve script path — prefer project-local, fall back to global ~/.claude install
function resolveScript(relPath) {
  const cwdPath = path.join(process.cwd(), relPath);
  const homePath = path.join(os.homedir(), relPath.replace(/^\.claude[\\/]/, '.claude/'));
  if (fs.existsSync(cwdPath)) return cwdPath;
  if (fs.existsSync(homePath)) return homePath;
  return null;
}

let result;

if (IS_WINDOWS) {
  const script = resolveScript('.claude/hooks-windows/bmad-speak.ps1');
  if (!script) process.exit(0);
  result = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, agentName, dialogue],
    { stdio: 'inherit' }
  );
} else {
  const script = resolveScript('.claude/hooks/bmad-speak.sh');
  if (!script) process.exit(0);
  result = spawnSync('bash', [script, agentName, dialogue], { stdio: 'inherit' });
}

process.exit(result.status ?? 0);
