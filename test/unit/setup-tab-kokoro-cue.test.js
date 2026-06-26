/**
 * Unit coverage for the Kokoro voice-picker readiness cue and the dependency
 * detection helper extracted from setup-tab.js.
 *
 *   buildPyModuleCheckArgs() — builds `python -c` args that probe modules with
 *   importlib.find_spec (NOT `import`), so a slow torch load can't blow the
 *   spawn timeout and produce a false "not installed".
 *
 *   buildBlingCommand() — builds the fire-and-forget "preview is on its way"
 *   cue command. Plays the bundled CC0 wav when present, else falls back to a
 *   platform system sound / terminal bell.
 *
 * Both are pure (no spawning), so they are unit-testable without the blessed
 * TUI harness.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

describe('buildPyModuleCheckArgs', () => {
  let buildPyModuleCheckArgs;
  before(async () => {
    ({ buildPyModuleCheckArgs } = await import('../../src/console/tabs/setup-tab.js'));
  });

  test('exported as a function', () => {
    assert.equal(typeof buildPyModuleCheckArgs, 'function');
  });

  test('uses find_spec, never a bare import (avoids slow torch load)', () => {
    const [flag, code] = buildPyModuleCheckArgs(['kokoro']);
    assert.equal(flag, '-c');
    assert.match(code, /find_spec\('kokoro'\)/);
    assert.doesNotMatch(code, /\bimport kokoro\b/);
  });

  test('imports importlib.util and exits 0/1 on the spec result', () => {
    const [, code] = buildPyModuleCheckArgs(['soundfile']);
    assert.match(code, /import importlib\.util as u, sys/);
    assert.match(code, /sys\.exit\(0 if .* else 1\)/);
  });

  test('joins multiple modules with logical AND', () => {
    const [, code] = buildPyModuleCheckArgs(['kokoro', 'soundfile', 'numpy']);
    assert.match(code, /u\.find_spec\('kokoro'\) and u\.find_spec\('soundfile'\) and u\.find_spec\('numpy'\)/);
  });
});

describe('buildBlingCommand', () => {
  let buildBlingCommand;
  before(async () => {
    ({ buildBlingCommand } = await import('../../src/console/tabs/setup-tab.js'));
  });

  const WAV = '/pkg/.claude/audio/ui/bling-success.wav';

  test('exported as a function', () => {
    assert.equal(typeof buildBlingCommand, 'function');
  });

  test('returns a { command, args[] } shape', () => {
    const r = buildBlingCommand('linux', WAV, false);
    assert.equal(typeof r.command, 'string');
    assert.ok(Array.isArray(r.args));
  });

  // ── Windows ────────────────────────────────────────────────────────────
  test('win32 + wav present → SoundPlayer.PlaySync on the bundled wav', () => {
    const { command, args } = buildBlingCommand('win32', WAV, true);
    assert.equal(command, 'powershell');
    const ps = args.at(-1);
    assert.match(ps, /System\.Media\.SoundPlayer/);
    assert.match(ps, /PlaySync\(\)/);
    assert.ok(ps.includes(WAV), 'must reference the wav path');
  });

  test('win32 + wav missing → falls back to the Asterisk system sound', () => {
    const { command, args } = buildBlingCommand('win32', WAV, false);
    assert.equal(command, 'powershell');
    assert.match(args.at(-1), /SystemSounds\]::Asterisk\.Play\(\)/);
  });

  test('win32 escapes single quotes in the wav path (no PS string break-out)', () => {
    const tricky = "C:\\a'b\\bling-success.wav";
    const ps = buildBlingCommand('win32', tricky, true).args.at(-1);
    assert.ok(ps.includes("a''b"), 'single quote must be doubled for PowerShell');
  });

  // ── POSIX ──────────────────────────────────────────────────────────────
  test('posix + wav present → paplay/aplay the wav (path passed as $1, not interpolated)', () => {
    const { command, args } = buildBlingCommand('linux', WAV, true);
    assert.equal(command, 'bash');
    // The wav is passed as a positional arg ($1) so it is never interpolated
    // into the shell string (injection-safe). The sh script is the '-c' value.
    const sh = args[args.indexOf('-c') + 1];
    assert.match(sh, /paplay "\$1"/);
    assert.match(sh, /aplay -q "\$1"/);
    assert.ok(args.includes(WAV), 'wav path must be passed as a positional argument');
  });

  test('posix bell falls back to /dev/tty, not discarded stdout', () => {
    const args = buildBlingCommand('linux', WAV, true).args;
    const sh = args[args.indexOf('-c') + 1];
    assert.match(sh, /printf "\\a" > \/dev\/tty/);
  });

  test('posix + wav missing → freedesktop cue fallback', () => {
    const sh = buildBlingCommand('darwin', WAV, false).args.at(-1);
    assert.match(sh, /freedesktop\/stereo\/message\.oga/);
  });
});
