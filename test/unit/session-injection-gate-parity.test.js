/**
 * @fileoverview Cacophony-fix parity: the opt-in session-start injection gate,
 * the mute precedence, and the {{session}} self-ID must exist on BOTH runtimes.
 *
 * @why Community report (Gina): with AgentVibes installed globally, every open
 * agent session injected the TTS protocol and spoke at once, with no way to tell
 * which window was talking. v5.13.0 fixed this in bash only — the PowerShell
 * hooks kept injecting unconditionally, `/agent-vibes:mute` did not silence
 * Windows audio at all, and there was no self-ID. These tests assert the FIX IS
 * PRESENT ON BOTH SIDES, so a future edit to one runtime cannot silently
 * re-open the gap on the other.
 *
 * Deliberately written against the shipped hook sources rather than a mock:
 * the bug was that the real files diverged.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..');
const BASH = path.join(REPO, '.claude', 'hooks');
const WIN = path.join(REPO, '.claude', 'hooks-windows');

const read = (p) => fs.readFileSync(p, 'utf8');

describe('cacophony fix: bash/PowerShell parity', () => {
  describe('opt-in session-start injection gate', () => {
    // The three markers that make up the gate. Both runtimes must consult all
    // three; checking only a subset is exactly how the Windows side drifted.
    const MARKERS = ['agentvibes-unmuted', 'agentvibes-muted', '.agentvibes-muted'];

    for (const marker of MARKERS) {
      test(`bash session-start-tts.sh consults ${marker}`, () => {
        assert.match(read(path.join(BASH, 'session-start-tts.sh')), new RegExp(marker.replace('.', '\\.')));
      });

      test(`PowerShell session-start-tts.ps1 consults ${marker}`, () => {
        assert.match(read(path.join(WIN, 'session-start-tts.ps1')), new RegExp(marker.replace('.', '\\.')));
      });
    }

    test('PowerShell gate exits before emitting the protocol', () => {
      const src = read(path.join(WIN, 'session-start-tts.ps1'));
      const gateAt = src.indexOf('.agentvibes-muted');
      const protocolAt = src.indexOf('# AgentVibes TTS Protocol');
      assert.ok(gateAt > -1, 'no global-mute check found in session-start-tts.ps1');
      assert.ok(protocolAt > -1, 'no protocol block found in session-start-tts.ps1');
      assert.ok(
        gateAt < protocolAt,
        'the mute gate must run BEFORE the protocol heredoc, or it injects tokens anyway'
      );
    });

    test('both runtimes default to silent (opt-in), not to injecting', () => {
      // An opt-in default means the fall-through branch must terminate.
      for (const [label, file] of [['bash', path.join(BASH, 'session-start-tts.sh')],
                                   ['powershell', path.join(WIN, 'session-start-tts.ps1')]]) {
        const src = read(file);
        assert.match(src, /agentvibes-enabled/, `${label}: no opt-in marker check`);
        assert.match(src, /exit 0/, `${label}: no early-exit path`);
      }
    });
  });

  describe('mute precedence in the players', () => {
    // Regression: play-tts.ps1 read ONLY ~/.claude/tts-muted.txt, which
    // /agent-vibes:mute never writes — so mute did nothing on Windows.
    test('play-tts.ps1 honours the global ~/.agentvibes-muted kill-switch', () => {
      assert.match(read(path.join(WIN, 'play-tts.ps1')), /\.agentvibes-muted/);
    });

    test('play-tts.ps1 honours per-project mute AND unmute markers', () => {
      const src = read(path.join(WIN, 'play-tts.ps1'));
      assert.match(src, /agentvibes-unmuted/, 'no project unmute override');
      assert.match(src, /agentvibes-muted/, 'no project mute check');
    });

    test('project unmute is checked before the mute markers (it overrides them)', () => {
      const src = read(path.join(WIN, 'play-tts.ps1'));
      const unmuteAt = src.indexOf('agentvibes-unmuted');
      const globalAt = src.indexOf('".agentvibes-muted"');
      assert.ok(unmuteAt > -1 && globalAt > -1);
      assert.ok(
        unmuteAt < globalAt,
        'project unmute must be evaluated first or it can never override a global mute'
      );
    });
  });

  describe('{{session}} self-identification', () => {
    test('a PowerShell self-ID script ships alongside the bash one', () => {
      assert.ok(fs.existsSync(path.join(BASH, 'agentvibes-session-id.sh')));
      assert.ok(
        fs.existsSync(path.join(WIN, 'agentvibes-session-id.ps1')),
        'agentvibes-session-id.ps1 missing — Windows users get no session self-ID'
      );
    });

    test('both players expand the {{session}} token', () => {
      assert.match(read(path.join(BASH, 'play-tts.sh')), /\{\{session\}\}/);
      assert.match(read(path.join(WIN, 'play-tts.ps1')), /\{\{session\}\}/);
    });

    test('terminal detection covers the same emulators on both runtimes', () => {
      const sh = read(path.join(BASH, 'agentvibes-session-id.sh'));
      const ps = read(path.join(WIN, 'agentvibes-session-id.ps1'));
      for (const term of ['WT_SESSION', 'TERM_PROGRAM', 'vscode', 'iTerm.app',
                          'Apple_Terminal', 'ghostty', 'WezTerm', 'Hyper', 'Tabby',
                          'KITTY_WINDOW_ID', 'ALACRITTY_WINDOW_ID']) {
        assert.match(sh, new RegExp(term.replace('.', '\\.')), `bash missing ${term}`);
        assert.match(ps, new RegExp(term.replace('.', '\\.')), `powershell missing ${term}`);
      }
    });

    test('PowerShell has no duplicate case-insensitive Ghostty arm', () => {
      // PowerShell's switch is case-insensitive, so separate "ghostty" and
      // "Ghostty" arms BOTH match and both emit -> "Ghostty Ghostty".
      // Bash needs both arms; PowerShell must have exactly one.
      const ps = read(path.join(WIN, 'agentvibes-session-id.ps1'));
      const arms = ps.match(/^\s*"[gG]hostty"\s*\{/gm) || [];
      assert.equal(arms.length, 1, `expected exactly 1 Ghostty switch arm, found ${arms.length}`);
    });
  });

  describe('the fix reaches real installs', () => {
    test('both self-ID scripts are in the critical-hooks update lists', () => {
      // They are shelled out to by play-tts.{sh,ps1}; if the global update path
      // does not ship them, the self-ID silently degrades to empty forever.
      const installer = read(path.join(REPO, 'src', 'installer.js'));
      const bashList = installer.match(/const CRITICAL_HOOKS = \[(.*?)\]/s)?.[1] ?? '';
      const winList = installer.match(/const CRITICAL_HOOKS_WINDOWS = \[(.*?)\]/s)?.[1] ?? '';
      assert.match(bashList, /agentvibes-session-id\.sh/);
      assert.match(winList, /agentvibes-session-id\.ps1/);
      assert.match(winList, /session-start-tts\.ps1/);
    });
  });
});
