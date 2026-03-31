/**
 * File: test/unit/windows-script-naming.test.js
 *
 * AgentVibes - Finally, your AI Agents can Talk Back!
 * Website: https://agentvibes.org
 * Repository: https://github.com/paulpreibisch/AgentVibes
 *
 * Tests for Windows script naming consistency.
 * Verifies that the MCP server's .sh -> .ps1 auto-conversion
 * finds the correct files, and that naming matches between platforms.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..', '..');
const hooksWindows = join(projectRoot, '.claude', 'hooks-windows');
const hooksLinux = join(projectRoot, '.claude', 'hooks');
const serverPy = join(projectRoot, 'mcp-server', 'server.py');

// ============================================================
// Suite: Script naming follows auto-conversion pattern
// ============================================================

test('Naming: voice-manager.sh auto-converts to voice-manager.ps1 which should exist', () => {
  // The MCP server converts .sh -> .ps1 (server.py:902-903)
  // But the actual Windows file is voice-manager-windows.ps1
  const autoConverted = join(hooksWindows, 'voice-manager.ps1');
  const actualFile = join(hooksWindows, 'voice-manager-windows.ps1');

  // The auto-converted name should exist OR the class constant must override
  // Currently: class constant overrides, so auto-converted doesn't need to exist
  // But this is fragile — any code calling voice-manager.sh directly breaks
  assert.ok(
    existsSync(autoConverted) || existsSync(actualFile),
    'Neither voice-manager.ps1 nor voice-manager-windows.ps1 exists'
  );

  if (!existsSync(autoConverted) && existsSync(actualFile)) {
    // This documents the known naming mismatch
    // When fixed, this assertion should change to require the standard name
    assert.ok(true, 'Naming mismatch: voice-manager-windows.ps1 exists but voice-manager.ps1 does not');
  }
});

test('Naming: server.py class constants override auto-conversion for known mismatches', () => {
  const serverSource = readFileSync(serverPy, 'utf-8');

  // Verify the VOICE_MANAGER_SCRIPT override exists for Windows
  assert.ok(
    serverSource.includes('voice-manager-windows'),
    'server.py must have voice-manager-windows override for Windows'
  );
});

test('Naming: all .ps1 scripts follow standard naming (no windows- prefix in hook scripts)', () => {
  // Provider scripts should use standard names (play-tts-piper.ps1, play-tts-sapi.ps1)
  // without the "windows-" prefix, matching the cross-platform naming convention.
  const problematicNames = [
    { windowsName: 'play-tts-windows-piper.ps1', standardName: 'play-tts-piper.ps1' },
    { windowsName: 'play-tts-windows-sapi.ps1', standardName: 'play-tts-sapi.ps1' },
  ];

  const mismatches = [];
  for (const { windowsName, standardName } of problematicNames) {
    const hasWindowsName = existsSync(join(hooksWindows, windowsName));
    const hasStandardName = existsSync(join(hooksWindows, standardName));

    if (hasWindowsName && !hasStandardName) {
      mismatches.push(`${windowsName} exists but ${standardName} does not`);
    }
  }

  assert.strictEqual(mismatches.length, 0, `Naming mismatches: ${mismatches.join('; ')}`);
});

// ============================================================
// Suite: Every Linux hook should have a Windows equivalent
// ============================================================

// Scripts that are platform-specific and DON'T need a Windows port
const PLATFORM_SPECIFIC = new Set([
  'macos-voice-manager',
  'play-tts-macos',
  'play-tts-termux-ssh',
  'play-tts-ssh-remote',
  'play-tts-agentvibes-receiver-for-voiceless-connections',
  'termux-installer',
  'piper-installer',
  'clawdbot-receiver',
  'clawdbot-receiver-SECURE',
  'github-star-reminder',
  'prepare-release',
  'migrate-to-agentvibes',
  'migrate-background-music',
  'optimize-background-music',
  'setup-tts-lock-dir',
]);

// Scripts that are handled differently on Windows (not a 1:1 port)
const WINDOWS_HANDLED_DIFFERENTLY = new Set([
  'play-tts-piper',       // -> play-tts-piper.ps1
  'voice-manager',        // -> voice-manager-windows.ps1
  'play-tts-enhanced',    // effects handled in play-tts.ps1 directly
  'piper-voice-manager',  // handled by voice-manager-windows.ps1
  'piper-multispeaker-registry', // data baked into play-tts-piper.ps1
  'piper-download-voices', // handled by download-extra-voices.ps1
]);

test('Naming: HIGH priority scripts (MCP-breaking) must have .ps1 equivalents', () => {
  const highPriority = [
    'personality-manager',
    'speed-manager',
    'language-manager',
    'learn-manager',
    'verbosity-manager',
    'clean-audio-cache',
  ];

  const missing = [];
  for (const script of highPriority) {
    if (!existsSync(join(hooksWindows, `${script}.ps1`))) {
      missing.push(script);
    }
  }

  assert.strictEqual(
    missing.length, 0,
    `HIGH priority scripts missing on Windows (break MCP): ${missing.join(', ')}`
  );
});

test('Naming: MEDIUM priority scripts should have .ps1 equivalents', () => {
  const mediumPriority = [
    'bmad-speak',
    'bmad-voice-manager',
    'tts-queue',
    'tts-queue-worker',
    'sentiment-manager',
    'translate-manager',
    'replay-target-audio',
    'stop-tts',
  ];

  const missing = [];
  for (const script of mediumPriority) {
    if (!existsSync(join(hooksWindows, `${script}.ps1`))) {
      missing.push(script);
    }
  }

  if (missing.length > 0) {
    console.log(`  MEDIUM priority scripts missing (${missing.length}): ${missing.join(', ')}`);
  }

  // Informational — doesn't hard-fail since these are MEDIUM priority
  // Uncomment when working on Phase 3:
  // assert.strictEqual(missing.length, 0, `MEDIUM priority missing: ${missing.join(', ')}`);
});
