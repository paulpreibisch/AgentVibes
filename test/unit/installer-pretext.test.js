/**
 * Regression tests: folder-based pretext defaults
 *
 * Ensures that when agentvibes is installed into a folder (e.g., "test91"),
 * the pretext reflects the folder name ("Test91 here") rather than a
 * hardcoded global name like "Claude Code here".
 *
 * Two mechanisms are verified:
 *   1. DEFAULT_LLM_CONFIGS has empty per-LLM pretexts — the project-level
 *      tts-pretext.txt (set to the folder name) applies for all agents.
 *   2. The installer non-interactive path (options.yes) derives config.pretext
 *      from path.basename(process.cwd()) so tts-pretext.txt is folder-named.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { seedAllLlmDefaultsSync } from '../../src/services/llm-provider-service.js';

const __filename = fileURLToPath(import.meta.url);
const installerPath = new URL('../../src/installer.js', import.meta.url);

describe('folder-based pretext defaults', () => {

  test('seedAllLlmDefaultsSync: per-LLM pretexts are empty so tts-pretext.txt applies', () => {
    const dir = mkdtempSync(join(tmpdir(), 'av-pretext-seed-'));
    mkdirSync(join(dir, '.claude', 'config'), { recursive: true });

    try {
      seedAllLlmDefaultsSync(dir);

      const cfg = readFileSync(join(dir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
      const llmRows = cfg.split('\n').filter(l => l.startsWith('llm:') && !l.startsWith('llm:default'));

      assert.ok(llmRows.length > 0, 'At least one non-default llm: row should be seeded');

      for (const row of llmRows) {
        const parts = row.split('|');
        const pretext = parts[5] || '';
        assert.strictEqual(
          pretext, '',
          `Per-LLM default pretext must be empty (got "${pretext}" in: ${row})`
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('seedAllLlmDefaultsSync: no hardcoded "Code here", "Copilot here" etc in seeded rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'av-pretext-hardcode-'));
    mkdirSync(join(dir, '.claude', 'config'), { recursive: true });

    try {
      seedAllLlmDefaultsSync(dir);

      const cfg = readFileSync(join(dir, '.claude', 'config', 'audio-effects.cfg'), 'utf8');
      const hardcoded = ['Claude Code here', 'Copilot here', 'Codex here', 'Hermes here'];

      for (const name of hardcoded) {
        assert.ok(
          !cfg.includes(name),
          `Seeded config must not contain hardcoded "${name}" — use empty pretext so folder name applies`
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('installer source: non-interactive mode uses folder name as pretext default', () => {
    const src = readFileSync(installerPath, 'utf8');

    // The options.yes block must set pretext from the folder name
    assert.ok(
      src.includes("path.basename(process.cwd())"),
      'installer.js must derive pretext from path.basename(process.cwd())'
    );

    assert.ok(
      src.includes("charAt(0).toUpperCase()"),
      'installer.js must capitalize the folder name for pretext'
    );

    assert.ok(
      src.includes("+ ' here'"),
      "installer.js must append \" here\" to the folder name"
    );
  });

  test('pretext editor: Home/End key support present in agents-tab', () => {
    const src = readFileSync(new URL('../../src/console/tabs/agents-tab.js', import.meta.url), 'utf8');

    // _openPretextEditor must contain cursor tracking and Home/End handling
    assert.ok(
      src.includes("key.name === 'home'"),
      'agents-tab _openPretextEditor must handle Home key'
    );
    assert.ok(
      src.includes("key.name === 'end'"),
      'agents-tab _openPretextEditor must handle End key'
    );
    assert.ok(
      src.includes('_cursor = 0'),
      'agents-tab _openPretextEditor must move cursor to start on Home'
    );
    assert.ok(
      src.includes('_cursor = val.length'),
      'agents-tab _openPretextEditor must move cursor to end on End'
    );
  });

  test('pretext editor: Home/End key support present in setup-tab', () => {
    const src = readFileSync(new URL('../../src/console/tabs/setup-tab.js', import.meta.url), 'utf8');

    assert.ok(
      src.includes("key.name === 'home'"),
      'setup-tab _openPretextEditor must handle Home key'
    );
    assert.ok(
      src.includes("key.name === 'end'"),
      'setup-tab _openPretextEditor must handle End key'
    );
    assert.ok(
      src.includes('_cursor = 0'),
      'setup-tab _openPretextEditor must move cursor to start on Home'
    );
    assert.ok(
      src.includes('_cursor = val.length'),
      'setup-tab _openPretextEditor must move cursor to end on End'
    );
  });

  test('pretext editor: screen.grabKeys save/restore present in agents-tab', () => {
    const src = readFileSync(new URL('../../src/console/tabs/agents-tab.js', import.meta.url), 'utf8');
    assert.ok(
      src.includes('_prevGrabKeys'),
      'agents-tab must save/restore screen.grabKeys to avoid stomping outer grab state'
    );
    assert.ok(
      src.includes('screen.grabKeys = _prevGrabKeys'),
      'agents-tab must restore screen.grabKeys to previous value on close'
    );
  });

  test('pretext editor: destroy guard present in agents-tab (external close safety)', () => {
    const src = readFileSync(new URL('../../src/console/tabs/agents-tab.js', import.meta.url), 'utf8');
    assert.ok(
      src.includes("editModal.once('destroy'"),
      'agents-tab must register destroy listener to restore grabKeys if modal closed externally'
    );
  });

  test('pretext editor: clearing to empty string is allowed in agents-tab', () => {
    const src = readFileSync(new URL('../../src/console/tabs/agents-tab.js', import.meta.url), 'utf8');
    // The old broken pattern used (raw || draft.pretext) which prevented clearing
    assert.ok(
      !src.includes('(raw || draft.pretext)'),
      'agents-tab must not fall back to draft.pretext when raw is empty — user must be able to clear pretext'
    );
  });

  test('installer source: empty basename (Docker /) does not write a leading-space pretext', () => {
    const src = readFileSync(installerPath, 'utf8');
    assert.ok(
      src.includes('if (folderName)'),
      'installer.js must guard empty basename before constructing pretext (prevents " here" on Docker / root)'
    );
  });

  test('installer source: homeDir uses os.homedir() fallback', () => {
    const src = readFileSync(installerPath, 'utf8');
    assert.ok(
      src.includes('os.homedir()'),
      'installer.js must fall back to os.homedir() when HOME and USERPROFILE env vars are absent'
    );
  });

  test('setup-tab source: defaultPretext uses folder name not hardcoded "Claude Code here"', () => {
    const src = readFileSync(new URL('../../src/console/tabs/setup-tab.js', import.meta.url), 'utf8');
    assert.ok(
      !src.includes("'claude-code': 'Claude Code here'"),
      'setup-tab defaultPretext must not hardcode "Claude Code here" — use folder name instead'
    );
    assert.ok(
      !src.includes("'copilot': 'Copilot here'"),
      'setup-tab defaultPretext must not hardcode "Copilot here" — use folder name instead'
    );
    assert.ok(
      src.includes('_folderPretext'),
      'setup-tab must derive defaultPretext from folder name via _folderPretext'
    );
  });
});
