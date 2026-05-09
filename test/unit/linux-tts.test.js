/**
 * Linux / macOS / WSL TTS Tests
 * Tests session-start-tts.sh protocol injection and per-LLM voice routing.
 * All tests skip on native Windows (process.platform === 'win32') since bash hooks
 * are not used there.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..', '..');
const hooksDir = join(projectRoot, '.claude', 'hooks');

const SKIP_ON_WINDOWS = process.platform === 'win32';

function runBash(args, options = {}) {
  const ms = options.timeout || 10000;
  return new Promise((resolve) => {
    const child = spawn('bash', args, {
      env: { ...process.env, ...options.env },
      timeout: ms,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });

    setTimeout(() => {
      child.kill();
      resolve({ stdout, stderr, exitCode: -1 });
    }, ms);
  });
}

// ============================================================
// Suite: Session-start TTS Protocol Injection (Linux/macOS/WSL)
// ============================================================

test('Session Start (Linux) - static check: uses $PLAY_TTS_PATH not hardcoded relative path', () => {
  const content = readFileSync(join(hooksDir, 'session-start-tts.sh'), 'utf-8');
  assert.ok(
    content.includes('PLAY_TTS_PATH='),
    'session-start-tts.sh must define PLAY_TTS_PATH for absolute path resolution'
  );
  assert.ok(
    !content.includes('".claude/hooks/play-tts.sh"'),
    'session-start-tts.sh must not hardcode a relative play-tts.sh path'
  );
});

test('Session Start (Linux) - static check: resolves path from BASH_SOURCE not CWD', () => {
  const content = readFileSync(join(hooksDir, 'session-start-tts.sh'), 'utf-8');
  assert.ok(
    content.includes('BASH_SOURCE'),
    'session-start-tts.sh must use BASH_SOURCE[0] to locate play-tts.sh'
  );
});

test('Session Start (Linux) - static check: uses CLAUDE_PROJECT_DIR for per-project settings', () => {
  const content = readFileSync(join(hooksDir, 'session-start-tts.sh'), 'utf-8');
  assert.ok(
    content.includes('CLAUDE_PROJECT_DIR'),
    'session-start-tts.sh must read CLAUDE_PROJECT_DIR for per-project config'
  );
});

test('Session Start (Linux) - injects --llm claude-code flag', { skip: SKIP_ON_WINDOWS }, async () => {
  const result = await runBash(
    [join(hooksDir, 'session-start-tts.sh')],
    { env: { CLAUDE_PROJECT_DIR: projectRoot, HOME: process.env.HOME } }
  );

  const output = result.stdout + result.stderr;
  assert.ok(
    output.includes('--llm claude-code'),
    `session-start-tts.sh must inject --llm claude-code so per-LLM voice/music is used. Output: ${output.slice(0, 400)}`
  );
});

test('Session Start (Linux) - injects absolute play-tts.sh path not relative', { skip: SKIP_ON_WINDOWS }, async () => {
  const result = await runBash(
    [join(hooksDir, 'session-start-tts.sh')],
    { env: { CLAUDE_PROJECT_DIR: projectRoot, HOME: process.env.HOME } }
  );

  const output = result.stdout + result.stderr;
  assert.ok(
    !output.includes('".claude/hooks/play-tts.sh"'),
    'session-start-tts.sh must not inject relative play-tts.sh path'
  );
  assert.ok(
    output.includes('/play-tts.sh'),
    `session-start-tts.sh must inject an absolute path to play-tts.sh. Output: ${output.slice(0, 400)}`
  );
  // The absolute path must contain the actual hooksDir prefix
  assert.ok(
    output.includes(hooksDir.replace(/\\/g, '/')),
    `play-tts.sh path in output must be under hooksDir. Output: ${output.slice(0, 400)}`
  );
});

// ============================================================
// Suite: Per-LLM Voice Routing on Linux/macOS/WSL
// ============================================================

test('Per-LLM Routing (Linux) - play-tts.sh reads CLAUDE_PROJECT_DIR config', { skip: SKIP_ON_WINDOWS }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-linux-routing-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  // Write a known per-LLM config row
  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    'llm:claude-code|off||0.15|en_US-lessac-high|routing-test|piper\n'
  );

  try {
    const result = await runBash(
      [join(hooksDir, 'play-tts.sh'), 'routing test', '--llm', 'claude-code'],
      {
        env: {
          CLAUDE_PROJECT_DIR: tempDir,
          AGENTVIBES_VERBOSE: '1',
          HOME: process.env.HOME,
          PATH: process.env.PATH,
        },
        timeout: 30000,
      }
    );

    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes('llm=claude-code') || output.includes('llm:claude-code'),
      `play-tts.sh must route to llm:claude-code row. Output: ${output.slice(0, 500)}`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}, 30000);

test('Per-LLM Routing (Linux) - without --llm flag falls back to llm:default', { skip: SKIP_ON_WINDOWS }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-linux-default-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    'llm:default|off||0.15|en_US-ryan-high|default-pretext|piper\nllm:claude-code|off||0.15|en_US-lessac-high|cc-pretext|piper\n'
  );

  try {
    const result = await runBash(
      [join(hooksDir, 'play-tts.sh'), 'routing test'],
      {
        env: {
          CLAUDE_PROJECT_DIR: tempDir,
          AGENTVIBES_VERBOSE: '1',
          HOME: process.env.HOME,
          PATH: process.env.PATH,
        },
        timeout: 30000,
      }
    );

    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes('llm=default') || output.includes('llm:default'),
      `Without --llm flag, play-tts.sh must route to llm:default. Output: ${output.slice(0, 500)}`
    );
    assert.ok(
      !output.includes('cc-pretext'),
      `Without --llm flag, must not pick up claude-code pretext. Output: ${output.slice(0, 500)}`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}, 30000);

// ============================================================
// Suite: Installer — hook registration uses $HOME not $CLAUDE_PROJECT_DIR
// ============================================================

test('Installer - configureSessionStartHook registers $HOME path for Linux', async () => {
  const { configureSessionStartHook } = await import('../../src/installer.js');

  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-install-hook-'));
  const claudeDir = join(tempDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  const silentSpinner = {
    start() { return this; },
    succeed() { return this; },
    fail() { return this; },
    info() { return this; },
    text: '',
  };

  try {
    if (process.platform !== 'win32') {
      await configureSessionStartHook(tempDir, silentSpinner);

      const { readFileSync: rfs } = await import('node:fs');
      const settings = JSON.parse(rfs(join(claudeDir, 'settings.json'), 'utf-8'));
      const hook = settings.hooks?.UserPromptSubmit?.[0]?.hooks?.[0]?.command ?? '';

      assert.ok(
        hook.includes('$HOME'),
        `UserPromptSubmit command must use $HOME, got: ${hook}`
      );
      assert.ok(
        !hook.includes('$CLAUDE_PROJECT_DIR'),
        `UserPromptSubmit command must not use $CLAUDE_PROJECT_DIR, got: ${hook}`
      );
      assert.ok(
        hook.includes('session-start-tts.sh'),
        `UserPromptSubmit command must reference session-start-tts.sh, got: ${hook}`
      );
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
