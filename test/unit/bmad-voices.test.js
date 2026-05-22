/**
 * Unit Tests for src/commands/bmad-voices.js
 *
 * Strategy:
 *  - The module exports five async commands; most of them call process.exit(1)
 *    when BMAD is not installed, which makes them hard to unit-test directly
 *    without full filesystem fixtures.  We therefore:
 *
 *    1. Test the public API surface by providing a temp directory that mimics
 *       the minimal BMAD folder structure (.bmad/_cfg/agent-voice-map.csv).
 *
 *    2. Redirect process.env.INIT_CWD so getWorkingDirectory() points to our
 *       temp dir, avoiding side-effects on the real project.
 *
 *    3. Avoid spawning any real process (play-tts.sh, bash, etc.).  Tests that
 *       would invoke previewVoice / listAvailableVoices only assert on the pure
 *       data-shape logic or the findVoiceMatch behaviour that is visible through
 *       previewVoice's error output.
 *
 *  - PIPER_VOICES and DEFAULT_VOICE_ASSIGNMENTS are not exported, so we test
 *    their observable effects through the exported functions.
 *
 * Uses: node:test + node:assert/strict, ESM, temp dirs, no network.
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir;
let origInitCwd;
let origCwd;
let origConsoleLog;
let origConsoleError;

/**
 * Build a minimal .bmad/_cfg/agent-voice-map.csv under tmpDir.
 * @param {string} csvContent - Raw CSV text (including header).
 */
function writeCsv(csvContent) {
  const cfgDir = path.join(tmpDir, '.bmad', '_cfg');
  fs.mkdirSync(cfgDir, { recursive: true });
  fs.writeFileSync(path.join(cfgDir, 'agent-voice-map.csv'), csvContent, 'utf8');
}

/**
 * Read back the CSV from the temp dir.
 * @returns {string}
 */
function readCsv() {
  return fs.readFileSync(
    path.join(tmpDir, '.bmad', '_cfg', 'agent-voice-map.csv'),
    'utf8'
  );
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-bmad-voices-'));
  origInitCwd = process.env.INIT_CWD;
  origCwd = process.cwd();
  // Point getWorkingDirectory() to our temp dir
  process.env.INIT_CWD = tmpDir;
  // Suppress console output: chalk/console.log from tested functions races with
  // the node:test runner's IPC protocol in subprocess mode (node --test), causing
  // non-deterministic "Unable to deserialize cloned data" crashes.
  origConsoleLog = console.log;
  origConsoleError = console.error;
  console.log = () => {};
  console.error = () => {};
});

afterEach(() => {
  console.log = origConsoleLog;
  console.error = origConsoleError;

  if (origInitCwd === undefined) {
    delete process.env.INIT_CWD;
  } else {
    process.env.INIT_CWD = origInitCwd;
  }

  try {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch {
    // best-effort cleanup
  }

  tmpDir = null;
});

// ---------------------------------------------------------------------------
// Lazy import — the module uses top-level await for chalk (dynamic import), so
// we import it inside each describe block to ensure env vars are set first.
// ---------------------------------------------------------------------------

async function importBmadVoices() {
  // Use a cache-busting URL parameter so Node re-evaluates the module with the
  // current process.env (needed for tests that set INIT_CWD before import).
  // In practice Node caches ESM modules; we work around this by accepting the
  // cached version is fine because process.env.INIT_CWD is read at call time,
  // not at module parse time.
  return import('../../src/commands/bmad-voices.js');
}

// ===========================================================================
// listAvailableVoices() — pure output, no BMAD installation needed
// ===========================================================================

describe('listAvailableVoices()', () => {
  test('resolves without throwing', async () => {
    const { listAvailableVoices } = await importBmadVoices();
    await assert.doesNotReject(() => listAvailableVoices());
  });
});

// ===========================================================================
// DEFAULT_VOICE_ASSIGNMENTS — observable via resetBmadVoices (--yes flag)
// ===========================================================================

describe('resetBmadVoices() — with --yes flag', () => {
  test('writes a CSV with the correct header when BMAD dir exists', async () => {
    // Ensure .bmad directory exists so isBmadInstalled() returns true
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    const lines = csv.trim().split('\n');
    assert.strictEqual(lines[0], 'agent_id,voice_name', 'First line must be the CSV header');
  });

  test('CSV contains at least one agent assignment after reset', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    const lines = csv.trim().split('\n');
    assert.ok(lines.length > 1, 'CSV must contain at least one data row beyond the header');
  });

  test('CSV contains pm agent assignment after reset', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    assert.ok(csv.includes('pm,'), 'CSV must contain a pm agent row');
  });

  test('CSV contains architect agent assignment after reset', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    assert.ok(csv.includes('architect,'), 'CSV must contain an architect agent row');
  });

  test('CSV entries follow agent_id,voice_name format (no extra commas)', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    const lines = csv.trim().split('\n').slice(1); // skip header
    for (const line of lines) {
      const parts = line.split(',');
      assert.strictEqual(parts.length, 2, `Row "${line}" must have exactly 2 columns`);
      assert.ok(parts[0].trim().length > 0, 'agent_id must not be empty');
      assert.ok(parts[1].trim().length > 0, 'voice_name must not be empty');
    }
  });
});

// ===========================================================================
// assignVoice() — read-write CSV round-trip
// ===========================================================================

describe('assignVoice() — round-trip CSV', () => {
  test('creates .bmad/_cfg dir and CSV when neither exists', async () => {
    // Only create .bmad dir (no _cfg subdir, no CSV)
    fs.mkdirSync(path.join(tmpDir, '.bmad'), { recursive: true });

    const { assignVoice } = await importBmadVoices();
    await assignVoice('pm', 'en_US-ryan-high');

    assert.ok(
      fs.existsSync(path.join(tmpDir, '.bmad', '_cfg', 'agent-voice-map.csv')),
      'CSV file must exist after assignVoice'
    );
  });

  test('assigns a known voice to an agent that did not exist before', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { assignVoice } = await importBmadVoices();
    await assignVoice('custom-agent', 'en_US-amy-medium');

    const csv = readCsv();
    assert.ok(csv.includes('custom-agent,en_US-amy-medium'), 'CSV must contain the new assignment');
  });

  test('updates an existing agent assignment', async () => {
    // Pre-populate CSV
    writeCsv('agent_id,voice_name\npm,en_US-ryan-high\n');

    const { assignVoice } = await importBmadVoices();
    await assignVoice('pm', 'en_US-danny-low');

    const csv = readCsv();
    assert.ok(csv.includes('pm,en_US-danny-low'), 'Updated voice must appear in CSV');
    assert.ok(!csv.includes('pm,en_US-ryan-high'), 'Old voice must be replaced');
  });

  test('preserves other agents when updating one', async () => {
    writeCsv('agent_id,voice_name\npm,en_US-ryan-high\ndev,en_US-joe-medium\n');

    const { assignVoice } = await importBmadVoices();
    await assignVoice('pm', 'en_US-danny-low');

    const csv = readCsv();
    assert.ok(csv.includes('dev,en_US-joe-medium'), 'Other agent row must be preserved');
  });

  test('CSV written by assignVoice starts with correct header', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { assignVoice } = await importBmadVoices();
    await assignVoice('pm', 'en_US-ryan-high');

    const csv = readCsv();
    assert.ok(csv.startsWith('agent_id,voice_name\n'), 'CSV must start with header line');
  });
});

// ===========================================================================
// listBmadAssignedVoices() — reads from CSV
// ===========================================================================

describe('listBmadAssignedVoices() — reads from CSV', () => {
  test('resolves without throwing when a valid CSV exists', async () => {
    writeCsv('agent_id,voice_name\npm,en_US-ryan-high\n');

    const { listBmadAssignedVoices } = await importBmadVoices();
    await assert.doesNotReject(() => listBmadAssignedVoices());
  });
});

// ===========================================================================
// CSV parsing — readVoiceAssignments observable through listBmadAssignedVoices
// ===========================================================================

describe('CSV parsing — multi-row assignments', () => {
  test('all rows written by resetBmadVoices are readable and valid', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    const lines = csv.trim().split('\n');

    // header + at least the 10 default agents
    assert.ok(lines.length >= 11, `Expected at least 11 lines (header + 10 agents), got ${lines.length}`);
  });

  test('CSV written contains bmad-master agent', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    assert.ok(csv.includes('bmad-master,'), 'bmad-master must appear in the reset CSV');
  });

  test('CSV written contains sm agent', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    assert.ok(csv.includes('sm,'), 'sm agent must appear in the reset CSV');
  });

  test('CSV written contains tech-writer agent', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    assert.ok(csv.includes('tech-writer,'), 'tech-writer agent must appear in the reset CSV');
  });

  test('pre-existing CSV with unknown voice still parses gracefully', async () => {
    writeCsv('agent_id,voice_name\npm,en_US-ryan-high\ndev,unknown-voice-xyz\n');

    const { listBmadAssignedVoices } = await importBmadVoices();
    // Should not throw even when an unknown voice is referenced
    await assert.doesNotReject(() => listBmadAssignedVoices());
  });
});

// ===========================================================================
// Default voice assignments — verify content through reset
// ===========================================================================

describe('DEFAULT_VOICE_ASSIGNMENTS — voice name validity', () => {
  test('all default voice names are non-empty strings', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    const lines = csv.trim().split('\n').slice(1); // skip header
    for (const line of lines) {
      const [agentId, voiceName] = line.split(',');
      assert.ok(voiceName && voiceName.trim().length > 0,
        `Agent "${agentId}" must have a non-empty voice name`);
    }
  });

  test('all default voice names follow the en_XX-name-quality pattern', async () => {
    fs.mkdirSync(path.join(tmpDir, '.bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const csv = readCsv();
    const lines = csv.trim().split('\n').slice(1);
    const VOICE_PATTERN = /^[a-z]{2}_[A-Z]{2}-.+-(high|medium|low)$/;
    for (const line of lines) {
      const voiceName = line.split(',')[1].trim();
      assert.match(
        voiceName,
        VOICE_PATTERN,
        `Voice name "${voiceName}" must match locale-name-quality pattern`
      );
    }
  });
});

// ===========================================================================
// getBmadPath — legacy "bmad" folder fallback
// ===========================================================================

describe('getBmadPath — legacy folder fallback', () => {
  test('assignVoice works when only the legacy "bmad" folder exists', async () => {
    // Create a legacy (no dot) bmad directory
    fs.mkdirSync(path.join(tmpDir, 'bmad', '_cfg'), { recursive: true });

    const { assignVoice } = await importBmadVoices();
    await assignVoice('pm', 'en_US-ryan-high');

    const legacyCsv = path.join(tmpDir, 'bmad', '_cfg', 'agent-voice-map.csv');
    assert.ok(fs.existsSync(legacyCsv), 'CSV must be written to legacy bmad/_cfg/');
  });

  test('resetBmadVoices works when only the legacy "bmad" folder exists', async () => {
    fs.mkdirSync(path.join(tmpDir, 'bmad', '_cfg'), { recursive: true });

    const { resetBmadVoices } = await importBmadVoices();
    await resetBmadVoices({ yes: true });

    const legacyCsv = path.join(tmpDir, 'bmad', '_cfg', 'agent-voice-map.csv');
    assert.ok(fs.existsSync(legacyCsv), 'CSV must be written to legacy path on reset');
  });
});
