/**
 * Preview must play everything combined — voice + effects + background music.
 *
 * Two regressions, both "silent music drop" from the user's point of view:
 *
 * 1. setup-tab.js — _openHermesConfigModal._playPreview did not temporarily
 *    enable background music, while _openLlmConfigModal._playPreview did.
 *    A Hermes row with a bgTrack configured previewed voice-only.
 *
 * 2. play-tts.ps1 — when background music or reverb was requested but ffmpeg
 *    was absent from PATH, mixing was skipped with no diagnostic at all. The
 *    bash side has always warned (audio-processor.sh: "ffmpeg not installed,
 *    skipping background mix"); PowerShell was silent, so a stale long-running
 *    tts-watcher.ps1 (PATH snapshot predating the ffmpeg install) produced
 *    working voice and no music with nothing in the log to explain it.
 *
 * Source-scan tests, matching the established pattern in
 * setup-tab-preview-routing.test.js — the blessed modals aren't constructible
 * headlessly, so we assert on the shipped source.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

const setupSrc = readFileSync(
  resolve(PROJECT_ROOT, 'src/console/tabs/setup-tab.js'), 'utf8',
);
const psSrc = readFileSync(
  resolve(PROJECT_ROOT, '.claude/hooks-windows/play-tts.ps1'), 'utf8',
);
const bashSrc = readFileSync(
  resolve(PROJECT_ROOT, '.claude/hooks/audio-processor.sh'), 'utf8',
);

/** Extract every `function _playPreview()` body via brace matching. */
function allPlayPreviewBodies(src) {
  const bodies = [];
  let from = 0;
  for (;;) {
    const fnIdx = src.indexOf('function _playPreview()', from);
    if (fnIdx < 0) break;
    let depth = 0, i = src.indexOf('{', fnIdx);
    const start = i;
    while (i < src.length) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
      i++;
    }
    bodies.push(src.slice(start, i + 1));
    from = i + 1;
  }
  return bodies;
}

describe('preview enables background music in every voice-config modal', () => {
  test('setup-tab defines multiple _playPreview functions', () => {
    const bodies = allPlayPreviewBodies(setupSrc);
    assert.ok(
      bodies.length >= 3,
      `expected at least 3 _playPreview bodies (LLM, Hermes, transport), got ${bodies.length}`,
    );
  });

  test('every _playPreview that owns a bgTrack draft enables bg music', () => {
    const bodies = allPlayPreviewBodies(setupSrc);

    // Modals whose draft carries its own bgTrack must temporarily flip the
    // enable-flag on. The transport-provider modal has no bgTrack of its own
    // (it previews whatever the global config already says) and is exempt.
    const owning = bodies.filter(b => b.includes('draft.bgTrack'));
    assert.ok(
      owning.length >= 2,
      `expected >=2 bgTrack-owning preview modals (LLM + Hermes), got ${owning.length}`,
    );

    for (const [i, body] of owning.entries()) {
      assert.ok(
        body.includes('background-music-enabled.txt'),
        `bgTrack-owning _playPreview #${i} must temporarily enable background music ` +
        `(write background-music-enabled.txt) — preview plays voice+effects+music combined`,
      );
      assert.ok(
        body.includes('_bgRestoreFn'),
        `bgTrack-owning _playPreview #${i} must register _bgRestoreFn so the user's ` +
        `real background-music setting is restored after preview`,
      );
    }
  });

  test('Hermes modal restores bg music on both exit and error paths', () => {
    const bodies = allPlayPreviewBodies(setupSrc);
    const hermes = bodies.find(b => b.includes('your Hermes audio settings'));
    assert.ok(hermes, 'Hermes _playPreview must exist (identified by its sample text)');

    // Restore must fire however the preview ends, else the user's music setting
    // is left switched on behind their back.
    const restores = hermes.match(/_bgRestoreFn\(\); _bgRestoreFn = null;/g) || [];
    assert.ok(
      restores.length >= 2,
      `Hermes preview must restore bg music on both exit and error (found ${restores.length} restore sites)`,
    );
  });

  test('Hermes _killPreview restores bg music synchronously', () => {
    // Rapid double-click race: the second Preview must not read bgWas=true
    // (left over from the first) and then "restore" music to permanently on.
    const idx = setupSrc.indexOf("saveLlmConfigSync('hermes'");
    assert.ok(idx > 0, 'Hermes modal must exist');
    const before = setupSrc.slice(Math.max(0, idx - 1200), idx);
    assert.ok(
      before.includes('_bgRestoreFn') && before.includes('function _killPreview'),
      'Hermes _killPreview must restore _bgRestoreFn synchronously before killing the proc',
    );
  });
});

describe('missing ffmpeg is reported, never a silent music drop', () => {
  test('bash warns when ffmpeg is absent during background mix', () => {
    assert.ok(
      /ffmpeg not installed, skipping background mix/.test(bashSrc),
      'audio-processor.sh must warn when ffmpeg is missing (baseline behavior)',
    );
  });

  test('PowerShell warns when mixing was requested but ffmpeg is absent', () => {
    assert.ok(
      /-not \$HasFfmpeg -and \(\$BgEnabled -or \$HasReverb\)/.test(psSrc),
      'play-tts.ps1 must detect "mixing requested but ffmpeg missing" — parity with bash',
    );
    assert.ok(
      /ffmpeg not found on PATH/.test(psSrc),
      'play-tts.ps1 must emit a WARNING naming ffmpeg as the missing dependency',
    );
  });

  test('the PowerShell warning names the stale-watcher cause', () => {
    // The failure mode that actually bit: ffmpeg IS installed, but a watcher
    // started before the install holds a stale PATH. Without naming it, the
    // warning sends users to reinstall something they already have.
    assert.ok(
      /stale/i.test(psSrc) && /restart the watcher/i.test(psSrc),
      'play-tts.ps1 ffmpeg warning must mention the stale-PATH watcher case and say to restart it',
    );
  });

  test('the ffmpeg warning fires after all re-check opportunities', () => {
    // $HasFfmpeg is re-probed when bg music or reverb get enabled late (LLM row,
    // remote override). Warning before those re-checks would produce false alarms.
    const lastRecheck = psSrc.lastIndexOf('$HasFfmpeg = $true } catch {}');
    const warnIdx = psSrc.indexOf('ffmpeg not found on PATH');
    assert.ok(lastRecheck > 0 && warnIdx > 0, 'both re-check and warning must exist');
    assert.ok(
      warnIdx > lastRecheck,
      'ffmpeg warning must come after the final $HasFfmpeg re-check, else it false-alarms',
    );
  });
});
