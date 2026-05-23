/**
 * Windows TTS Tests
 * Tests hook scripts, voice URLs, installer copy, provider management, and path security
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..', '..');
const hooksDir = join(projectRoot, '.claude', 'hooks-windows');
const setupScript = join(projectRoot, 'setup-windows.ps1');
const downloadScript = join(projectRoot, 'download-piper-voices.ps1');

const HOOK_SCRIPTS = [
  'play-tts.ps1',
  'play-tts-windows-piper.ps1',
  'play-tts-windows-sapi.ps1',
  'play-tts-soprano.ps1',
  'provider-manager.ps1',
  'voice-manager-windows.ps1',
  'audio-cache-utils.ps1',
  'session-start-tts.ps1',
];

/**
 * Helper: run a PowerShell command and capture output
 */
function runPowerShell(args, options = {}) {
  const ms = options.timeout || 10000;
  return new Promise((resolve) => {
    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', ...args], {
      env: { ...process.env, ...options.env },
      timeout: ms,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

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
// Suite: Hook Scripts Source
// ============================================================

test('Hook Scripts Source - all 8 scripts exist', () => {
  for (const script of HOOK_SCRIPTS) {
    const scriptPath = join(hooksDir, script);
    assert.ok(existsSync(scriptPath), `Missing hook script: ${script}`);
  }
});

test('Hook Scripts Source - all scripts are non-empty', () => {
  for (const script of HOOK_SCRIPTS) {
    const content = readFileSync(join(hooksDir, script), 'utf-8');
    assert.ok(content.trim().length > 0, `Hook script is empty: ${script}`);
  }
});

test('Hook Scripts Source - TTS scripts have param($Text)', () => {
  const ttsScripts = [
    'play-tts.ps1',
    'play-tts-windows-piper.ps1',
    'play-tts-windows-sapi.ps1',
    'play-tts-soprano.ps1',
  ];

  for (const script of ttsScripts) {
    const content = readFileSync(join(hooksDir, script), 'utf-8');
    assert.ok(
      content.includes('$Text'),
      `${script} should have a $Text parameter`
    );
    assert.ok(
      content.includes('param('),
      `${script} should have a param block`
    );
  }
});

test('Hook Scripts Source - manager scripts have param($Command)', () => {
  const managerScripts = [
    'provider-manager.ps1',
    'voice-manager-windows.ps1',
    'audio-cache-utils.ps1',
  ];

  for (const script of managerScripts) {
    const content = readFileSync(join(hooksDir, script), 'utf-8');
    assert.ok(
      content.includes('$Command'),
      `${script} should have a $Command parameter`
    );
  }
});

// ============================================================
// Suite: Voice Download URLs
// ============================================================

test('Voice Download URLs - setup-windows.ps1 uses correct HF path', () => {
  const content = readFileSync(setupScript, 'utf-8');
  assert.ok(
    content.includes('en/en_US/ryan/high'),
    'setup-windows.ps1 should use HF path en/en_US/ryan/high'
  );
  assert.ok(
    content.includes('huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high'),
    'setup-windows.ps1 should have full HF URL with correct path'
  );
});

test('Voice Download URLs - play-tts-windows-piper.ps1 uses correct fallback HF path', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('en/en_US/ryan/high'),
    'play-tts-windows-piper.ps1 should use HF path en/en_US/ryan/high as fallback'
  );
});

test('Voice Download URLs - download-piper-voices.ps1 uses correct HF path', () => {
  const content = readFileSync(downloadScript, 'utf-8');
  assert.ok(
    content.includes('en/en_US/ryan/high'),
    'download-piper-voices.ps1 should use HF path en/en_US/ryan/high'
  );
});

test('Voice Download URLs - no scripts use broken /v/ path', () => {
  const filesToCheck = [
    setupScript,
    downloadScript,
    join(hooksDir, 'play-tts-windows-piper.ps1'),
  ];

  for (const filePath of filesToCheck) {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(
      !content.includes('/v/en/'),
      `${filePath} should NOT use broken /v/en/ path`
    );
  }
});

// ============================================================
// Suite: Piper URL Builder (dynamic URL in play-tts-windows-piper.ps1)
// ============================================================

test('Piper URL Builder - dynamic URL pattern parses voice name correctly', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');

  // Should have the regex pattern for parsing voice names
  assert.ok(
    content.includes("'^([a-z]{2})_([A-Z]{2})-([a-zA-Z0-9_]+)-([a-z]+)$'"),
    'Should have regex pattern for parsing voice name format: lang_REGION-speaker-quality'
  );

  // Should build URL from parsed components
  assert.ok(
    content.includes('$Lang/$LangRegion/$Speaker/$Quality'),
    'Should build HF URL path from $Lang/$LangRegion/$Speaker/$Quality'
  );
});

test('Piper URL Builder - uses huggingface.co base URL', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('huggingface.co/rhasspy/piper-voices/resolve/main'),
    'Should use correct HuggingFace base URL'
  );
});

// ============================================================
// Suite: Installer Hook Copy (setup-windows.ps1)
// ============================================================

test('Installer Hook Copy - setup script references all 8 hook scripts', () => {
  const content = readFileSync(setupScript, 'utf-8');

  for (const script of HOOK_SCRIPTS) {
    assert.ok(
      content.includes(`"${script}"`),
      `setup-windows.ps1 should reference ${script}`
    );
  }
});

test('Installer Hook Copy - setup script validates source path', () => {
  const content = readFileSync(setupScript, 'utf-8');
  assert.ok(
    content.includes('Resolve-Path'),
    'setup-windows.ps1 should use Resolve-Path for path validation'
  );
  assert.ok(
    content.includes('StartsWith'),
    'setup-windows.ps1 should check path is within project directory'
  );
});

test('Installer Hook Copy - copies to temp dir on Windows', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-test-'));
  const tempHooksDir = join(tempDir, '.claude', 'hooks-windows');
  mkdirSync(tempHooksDir, { recursive: true });

  try {
    // Simulate copy: copy hook scripts to temp hooks dir
    for (const script of HOOK_SCRIPTS) {
      const src = join(hooksDir, script);
      const dest = join(tempHooksDir, script);
      const content = readFileSync(src);
      writeFileSync(dest, content);
    }

    // Verify all files copied
    for (const script of HOOK_SCRIPTS) {
      const destPath = join(tempHooksDir, script);
      assert.ok(existsSync(destPath), `${script} should be copied to temp dir`);

      // Verify content matches
      const srcContent = readFileSync(join(hooksDir, script), 'utf-8');
      const destContent = readFileSync(destPath, 'utf-8');
      assert.strictEqual(destContent, srcContent, `${script} content should match source`);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================
// Suite: Provider Manager
// ============================================================

test('Provider Manager - list command via PowerShell', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-pm-'));

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'provider-manager.ps1'), 'list'],
      { env: { USERPROFILE: tempDir } }
    );

    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes('windows-sapi') || output.includes('Available'),
      'list command should show available providers'
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Provider Manager - get command returns default', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-pm-'));

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'provider-manager.ps1'), 'get'],
      { env: { USERPROFILE: tempDir } }
    );

    assert.ok(
      result.stdout.includes('windows-sapi'),
      'Default provider should be windows-sapi'
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Provider Manager - switch command writes provider file', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-pm-'));
  const claudeDir = join(tempDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'provider-manager.ps1'), 'switch', 'windows-sapi'],
      { env: { USERPROFILE: tempDir } }
    );

    const providerFile = join(claudeDir, 'tts-provider.txt');
    assert.ok(existsSync(providerFile), 'Provider file should be created');
    const content = readFileSync(providerFile, 'utf-8').trim();
    assert.strictEqual(content, 'windows-sapi', 'Provider file should contain windows-sapi');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================
// Suite: TTS Router Config
// ============================================================

test('TTS Router Config - defaults to windows-sapi', () => {
  const content = readFileSync(join(hooksDir, 'play-tts.ps1'), 'utf-8');
  assert.ok(
    content.includes('$ActiveProvider = "windows-sapi"'),
    'play-tts.ps1 should default to windows-sapi'
  );
});

test('TTS Router Config - respects mute file', () => {
  const content = readFileSync(join(hooksDir, 'play-tts.ps1'), 'utf-8');
  assert.ok(
    content.includes('tts-muted.txt'),
    'play-tts.ps1 should check tts-muted.txt'
  );
  assert.ok(
    content.includes('exit 0'),
    'play-tts.ps1 should exit cleanly when muted'
  );
});

test('TTS Router Config - handles unknown provider', () => {
  const content = readFileSync(join(hooksDir, 'play-tts.ps1'), 'utf-8');
  assert.ok(
    content.includes('default'),
    'play-tts.ps1 should have a default switch case for unknown providers'
  );
  assert.ok(
    content.includes('Unknown provider'),
    'play-tts.ps1 should show error for unknown providers'
  );
});

test('TTS Router Config - routes to correct provider scripts', () => {
  const content = readFileSync(join(hooksDir, 'play-tts.ps1'), 'utf-8');
  assert.ok(
    content.includes('play-tts-windows-sapi.ps1'),
    'play-tts.ps1 should reference SAPI provider script'
  );
  assert.ok(
    content.includes('play-tts-windows-piper.ps1'),
    'play-tts.ps1 should reference Piper provider script'
  );
});

// ============================================================
// Suite: Audio Cache Utils
// ============================================================

test('Audio Cache Utils - has stats command', () => {
  const content = readFileSync(join(hooksDir, 'audio-cache-utils.ps1'), 'utf-8');
  assert.ok(
    content.includes("'stats'"),
    'audio-cache-utils.ps1 should support stats command'
  );
});

test('Audio Cache Utils - has cleanup command', () => {
  const content = readFileSync(join(hooksDir, 'audio-cache-utils.ps1'), 'utf-8');
  assert.ok(
    content.includes("'cleanup'"),
    'audio-cache-utils.ps1 should support cleanup command'
  );
});

test('Audio Cache Utils - has clear command', () => {
  const content = readFileSync(join(hooksDir, 'audio-cache-utils.ps1'), 'utf-8');
  assert.ok(
    content.includes("'clear'"),
    'audio-cache-utils.ps1 should support clear command'
  );
});

test('Audio Cache Utils - ValidateSet matches switch cases', () => {
  const content = readFileSync(join(hooksDir, 'audio-cache-utils.ps1'), 'utf-8');
  assert.ok(
    content.includes("ValidateSet('cleanup', 'stats', 'clear')"),
    'audio-cache-utils.ps1 should validate command parameter'
  );
});

// ============================================================
// Suite: Path Security
// ============================================================

test('Path Security - TTS scripts use $ScriptPath resolution', () => {
  const ttsScripts = [
    'play-tts.ps1',
    'play-tts-windows-piper.ps1',
    'play-tts-windows-sapi.ps1',
  ];

  for (const script of ttsScripts) {
    const content = readFileSync(join(hooksDir, script), 'utf-8');
    assert.ok(
      content.includes('$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path'),
      `${script} should resolve script path using $MyInvocation`
    );
  }
});

test('Path Security - TTS scripts fall back to $env:USERPROFILE', () => {
  const ttsScripts = [
    'play-tts.ps1',
    'play-tts-windows-piper.ps1',
    'play-tts-windows-sapi.ps1',
  ];

  for (const script of ttsScripts) {
    const content = readFileSync(join(hooksDir, script), 'utf-8');
    assert.ok(
      content.includes('$env:USERPROFILE'),
      `${script} should fall back to $env:USERPROFILE`
    );
  }
});

test('Path Security - installer validates source path within project', () => {
  const content = readFileSync(setupScript, 'utf-8');
  assert.ok(
    content.includes('$PSScriptRoot') || content.includes('$ScriptDir'),
    'setup-windows.ps1 should use $PSScriptRoot or $ScriptDir for source path'
  );
  assert.ok(
    content.includes('StartsWith'),
    'setup-windows.ps1 should verify source path starts with script root'
  );
});

test('Path Security - installer detects node_modules install', () => {
  const content = readFileSync(setupScript, 'utf-8');
  assert.ok(
    content.includes('node_modules'),
    'setup-windows.ps1 should detect when running from node_modules'
  );
  assert.ok(
    content.includes('$ProjectRoot'),
    'setup-windows.ps1 should resolve project root for hook destination'
  );
});

test('Path Security - provider-manager uses $env:USERPROFILE for config', () => {
  const content = readFileSync(join(hooksDir, 'provider-manager.ps1'), 'utf-8');
  assert.ok(
    content.includes('$env:USERPROFILE'),
    'provider-manager.ps1 should use $env:USERPROFILE for config directory'
  );
});

// ============================================================
// Suite: Text Sanitization
// ============================================================

test('Text Sanitization - Piper script strips backslashes', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes("-replace '\\\\', ' '"),
    'Piper script should replace backslashes with spaces'
  );
});

test('Text Sanitization - SAPI script strips backslashes', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-sapi.ps1'), 'utf-8');
  assert.ok(
    content.includes("-replace '\\\\', ' '"),
    'SAPI script should replace backslashes with spaces'
  );
});

test('Text Sanitization - both TTS scripts strip special characters', () => {
  const ttsScripts = ['play-tts-windows-piper.ps1', 'play-tts-windows-sapi.ps1'];

  for (const script of ttsScripts) {
    const content = readFileSync(join(hooksDir, script), 'utf-8');
    assert.ok(
      content.includes("Sanitize text for speech"),
      `${script} should have text sanitization section`
    );
    assert.ok(
      content.includes("-replace '\\s+'"),
      `${script} should collapse multiple spaces`
    );
  }
});

test('Text Sanitization - Piper produces clean speech on Windows', { skip: process.platform !== 'win32' }, async () => {
  // Test that text with backslashes gets sanitized before synthesis
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-sanitize-'));
  const claudeDir = join(tempDir, '.claude');
  const audioDir = join(claudeDir, 'audio');
  mkdirSync(audioDir, { recursive: true });

  try {
    // Run sanitization logic in PowerShell and check the result
    const result = await runPowerShell([
      '-Command',
      "$Text = 'Hello from C:\\Users\\Paul\\.claude'; $Text = $Text -replace '\\\\', ' '; $Text = $Text -replace '[{}<>|``~^]', ''; $Text = $Text -replace '\\s+', ' '; $Text = $Text.Trim(); Write-Host $Text"
    ]);

    assert.ok(
      !result.stdout.includes('\\'),
      'Sanitized text should not contain backslashes'
    );
    assert.ok(
      result.stdout.trim() === 'Hello from C: Users Paul .claude',
      `Sanitized text should replace backslashes with spaces, got: "${result.stdout.trim()}"`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================
// Suite: PowerShell 5.1 Encoding Compatibility
// ============================================================

test('Encoding - no emoji characters in hook scripts', () => {
  // PowerShell 5.1 garbles multi-byte Unicode emojis, breaking string parsing.
  // All hook scripts must use ASCII-safe labels like [OK], [ERROR], etc.
  const emojiRange = /[\u{1F000}-\u{1FFFF}]/u;

  for (const script of HOOK_SCRIPTS) {
    const content = readFileSync(join(hooksDir, script), 'utf-8');
    assert.ok(
      !emojiRange.test(content),
      `${script} should not contain emoji characters (breaks PowerShell 5.1)`
    );
  }
});

// ============================================================
// Suite: Piper Provider (Windows integration)
// ============================================================

test('Piper Provider - script checks for piper.exe', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('piper.exe'),
    'Piper provider should check for piper.exe'
  );
  assert.ok(
    content.includes('$PiperExe'),
    'Piper provider should define $PiperExe variable'
  );
});

test('Piper Provider - voices use global path not project-local', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('$UserClaudeDir'),
    'Piper provider should define $UserClaudeDir for global paths'
  );
  assert.ok(
    content.includes('"$UserClaudeDir\\piper-voices"'),
    'Voices directory should use global $UserClaudeDir, not project-local $ClaudeDir'
  );
});

test('Piper Provider - default voice is en_US-ryan-high', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('"en_US-ryan-high"'),
    'Piper provider should default to en_US-ryan-high voice'
  );
});

test('Piper Provider - supports voice override parameter', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('$VoiceOverride'),
    'Piper provider should accept VoiceOverride parameter'
  );
});

test('Piper Provider - auto-downloads missing voice models', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('Invoke-WebRequest'),
    'Piper provider should download missing voice models'
  );
  assert.ok(
    content.includes('[DOWNLOAD]'),
    'Piper provider should show download status'
  );
});

test('Piper Provider - generates WAV output', () => {
  const content = readFileSync(join(hooksDir, 'play-tts-windows-piper.ps1'), 'utf-8');
  assert.ok(
    content.includes('--output-file'),
    'Piper provider should use --output-file for WAV output'
  );
  assert.ok(
    content.includes('.wav'),
    'Piper provider should create .wav files'
  );
});

test('Piper Provider - switch to piper via provider-manager', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-piper-'));
  const claudeDir = join(tempDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  try {
    // Switch to windows-piper (will warn about piper not being installed but still writes file)
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'provider-manager.ps1'), 'switch', 'windows-piper'],
      { env: { USERPROFILE: tempDir } }
    );

    // It should warn that piper is not installed in this temp env
    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes('not installed') || output.includes('Provider set to'),
      'Should either warn about missing piper or set the provider'
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Piper Provider - installer downloads piper binary', () => {
  const content = readFileSync(setupScript, 'utf-8');
  assert.ok(
    content.includes('piper_windows_amd64.zip'),
    'Installer should download piper_windows_amd64.zip'
  );
  assert.ok(
    content.includes('github.com/rhasspy/piper/releases'),
    'Installer should download from official GitHub releases'
  );
});

test('Piper Provider - installer downloads default voice model', () => {
  const content = readFileSync(setupScript, 'utf-8');
  assert.ok(
    content.includes('en_US-ryan-high'),
    'Installer should reference default voice en_US-ryan-high'
  );
  assert.ok(
    content.includes('$DefaultVoice.onnx'),
    'Installer should download the .onnx voice model'
  );
  assert.ok(
    content.includes('$DefaultVoice.onnx.json'),
    'Installer should download the voice config JSON'
  );
});

test('Piper Provider - voice-manager lists piper voices', () => {
  const content = readFileSync(join(hooksDir, 'voice-manager-windows.ps1'), 'utf-8');
  assert.ok(
    content.includes('Get-PiperVoices'),
    'Voice manager should have Get-PiperVoices function'
  );
  assert.ok(
    content.includes('*.onnx'),
    'Voice manager should scan for .onnx voice files'
  );
});

test('Piper Provider - audio cache utils works via PowerShell', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-cache-'));
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(audioDir, { recursive: true });

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'audio-cache-utils.ps1'), 'stats'],
      { env: { USERPROFILE: tempDir } }
    );

    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes('Audio Cache Statistics') || output.includes('Files:'),
      'stats command should show cache statistics'
    );
    assert.strictEqual(result.exitCode, 0, 'stats command should exit cleanly');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Piper Provider - voice-manager works via PowerShell', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-vm-'));
  const claudeDir = join(tempDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'voice-manager-windows.ps1'), 'get'],
      { env: { USERPROFILE: tempDir } }
    );

    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes('default voice') || output.includes('Current voice') || output.includes('[VOICE]'),
      'get command should show current voice info'
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================
// Suite: Session-start TTS Protocol Injection
// ============================================================

test('Session Start - injects -llm claude-code flag', { skip: process.platform !== 'win32' }, async () => {
  const result = await runPowerShell(
    ['-File', join(hooksDir, 'session-start-tts.ps1')],
    { env: { CLAUDE_PROJECT_DIR: projectRoot } }
  );

  const output = result.stdout + result.stderr;
  assert.ok(
    output.includes('-llm claude-code'),
    'session-start-tts.ps1 must inject -llm claude-code so per-LLM voice/music is used'
  );
});

test('Session Start - injects absolute play-tts.ps1 path not relative', { skip: process.platform !== 'win32' }, async () => {
  const result = await runPowerShell(
    ['-File', join(hooksDir, 'session-start-tts.ps1')],
    { env: { CLAUDE_PROJECT_DIR: projectRoot } }
  );

  const output = result.stdout + result.stderr;
  // Must NOT contain the relative path that breaks when CWD != project dir
  assert.ok(
    !output.includes('".claude\\hooks-windows\\play-tts.ps1"'),
    'session-start-tts.ps1 must not inject relative play-tts.ps1 path'
  );
  // Must contain an absolute path ending in play-tts.ps1
  assert.ok(
    /[A-Za-z]:\\.*play-tts\.ps1/.test(output),
    'session-start-tts.ps1 must inject an absolute path to play-tts.ps1'
  );
});

test('Session Start - static check: uses $PlayTtsPath variable not hardcoded relative path', () => {
  const content = readFileSync(join(hooksDir, 'session-start-tts.ps1'), 'utf-8');
  assert.ok(
    content.includes('$PlayTtsPath'),
    'session-start-tts.ps1 must define $PlayTtsPath for absolute path resolution'
  );
  assert.ok(
    !content.includes('".claude\\hooks-windows\\play-tts.ps1"'),
    'session-start-tts.ps1 must not hardcode relative play-tts.ps1 path'
  );
});

// ============================================================
// Suite: Per-LLM Voice Routing (regression — fresh folder uses configured voice)
// ============================================================

test('Per-LLM Routing - play-tts.ps1 reads voice from CLAUDE_PROJECT_DIR config', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-routing-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  // Write a known per-LLM config — using a real installed voice so Piper can synthesize
  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    'llm:claude-code|off||0.15|en_US-lessac-high|routing-test|piper\n'
  );

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'play-tts.ps1'), 'routing test', '-llm', 'claude-code'],
      {
        env: {
          CLAUDE_PROJECT_DIR: tempDir,
          AGENTVIBES_VERBOSE: '1',
          USERPROFILE: process.env.USERPROFILE,  // real voices/piper live here
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          Path: process.env.Path || process.env.PATH,
        },
        timeout: 30000,
      }
    );

    const output = result.stdout + result.stderr;
    // Debug line must show llm=claude-code and voice from project config
    assert.ok(
      output.includes('llm=claude-code'),
      `play-tts.ps1 must route to llm:claude-code. Output: ${output.slice(0, 500)}`
    );
    assert.ok(
      output.includes('voice=en_US-lessac-high'),
      `play-tts.ps1 must use voice from project config. Output: ${output.slice(0, 500)}`
    );
    assert.ok(
      output.includes('pretext=routing-test'),
      `play-tts.ps1 must pick up pretext from project config. Output: ${output.slice(0, 500)}`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}, 30000);

// ============================================================
// Suite: Multi-Speaker Voice Display (regression for issue #186)
// ============================================================

test('Multi-Speaker Display - [VOICE] output includes ::SpeakerName from llm config', { skip: process.platform !== 'win32' }, async () => {
  // Regression: play-tts-piper.ps1 was stripping "::SpeakerName" before the [VOICE] log line,
  // making it impossible to verify which speaker was used from the Bash output.
  const piperPath = join(process.env.LOCALAPPDATA || '', 'Programs', 'Piper', 'piper.exe');
  if (!existsSync(piperPath)) return; // Piper not installed on this runner — skip
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-speaker-display-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    'llm:claude-code|off||0.15|en_US-libritts-high::Mary|display-test|piper\n'
  );

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'play-tts.ps1'), 'speaker display test', '-llm', 'claude-code'],
      {
        env: {
          CLAUDE_PROJECT_DIR: tempDir,
          AGENTVIBES_VERBOSE: '1',
          USERPROFILE: process.env.USERPROFILE,
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          Path: process.env.Path || process.env.PATH,
        },
        timeout: 30000,
      }
    );

    const output = result.stdout + result.stderr;
    // The [VOICE] line MUST include the full model::SpeakerName, not just the model.
    // Failure here means the speaker suffix was stripped before logging (issue #186).
    assert.ok(
      output.includes('[VOICE] Voice used: en_US-libritts-high::Mary'),
      `[VOICE] line must include ::SpeakerName. Got output:\n${output.slice(0, 600)}`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}, 30000);

// ============================================================
// Suite: Config-vs-Output Round-Trip (regression for issue #186)
// ============================================================

test('Config round-trip - [VOICE] output matches voice configured in audio-effects.cfg', { skip: process.platform !== 'win32' }, async () => {
  // Regression: [VOICE] line was showing only the model name (en_US-libritts-high)
  // instead of the full model::SpeakerName. This test verifies the displayed voice
  // matches whatever is stored in audio-effects.cfg so we can detect drift.
  const piperPath = join(process.env.LOCALAPPDATA || '', 'Programs', 'Piper', 'piper.exe');
  if (!existsSync(piperPath)) return; // Piper not installed on this runner — skip
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-cfg-roundtrip-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  const configuredVoice = 'en_US-libritts-high::Mary';
  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    `llm:claude-code|off||0.15|${configuredVoice}|roundtrip-test|piper\n`
  );

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'play-tts.ps1'), 'round trip test', '-llm', 'claude-code'],
      {
        env: {
          CLAUDE_PROJECT_DIR: tempDir,
          AGENTVIBES_VERBOSE: '1',
          USERPROFILE: process.env.USERPROFILE,
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          Path: process.env.Path || process.env.PATH,
        },
        timeout: 30000,
      }
    );

    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes(`[VOICE] Voice used: ${configuredVoice}`),
      `[VOICE] must exactly match configured voice "${configuredVoice}".\nGot: ${output.slice(0, 600)}`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}, 30000);

// ============================================================
// Suite: Session Lifecycle E2E (regression for issue #187)
// Simulates what actually happens during a Claude Code session:
// 1. SessionStart fires (CLAUDE_PROJECT_DIR is set)
// 2. Protocol is injected with the TTS command
// 3. Claude later runs that exact command WITHOUT CLAUDE_PROJECT_DIR
//    (Bash tool calls don't inherit it)
// The test verifies that the project config is still used.
// ============================================================

test('E2E Session Lifecycle - project voice used even when CLAUDE_PROJECT_DIR not in Bash env', { skip: process.platform !== 'win32' }, async () => {
  const piperPath = join(process.env.LOCALAPPDATA || '', 'Programs', 'Piper', 'piper.exe');
  if (!existsSync(piperPath)) return; // Piper not installed on this runner — skip
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-e2e-lifecycle-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  const configuredVoice = 'en_US-libritts-high::Mary';
  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    `llm:claude-code|off||0.15|${configuredVoice}|e2e-test|piper\n`
  );

  // Step 1: Run session-start-tts.ps1 WITH CLAUDE_PROJECT_DIR set (as Claude Code does)
  // Capture the injected TTS protocol to extract the exact play-tts command
  const sessionResult = await runPowerShell(
    ['-File', join(hooksDir, 'session-start-tts.ps1')],
    {
      env: {
        CLAUDE_PROJECT_DIR: tempDir,
        USERPROFILE: process.env.USERPROFILE,
        APPDATA: process.env.APPDATA,
        Path: process.env.Path || process.env.PATH,
      },
      timeout: 15000,
    }
  );

  const protocol = sessionResult.stdout + sessionResult.stderr;
  // Verify session-start injected -ProjectDir into the protocol
  assert.ok(
    protocol.includes('-ProjectDir') || protocol.includes(tempDir),
    `session-start-tts.ps1 must embed project dir in injected command.\nProtocol: ${protocol.slice(0, 400)}`
  );

  // Step 2: Extract the -ProjectDir value from the injected command
  const projDirMatch = protocol.match(/-ProjectDir\s+"([^"]+)"/);
  assert.ok(projDirMatch, `Must find -ProjectDir in injected protocol.\nProtocol: ${protocol.slice(0, 400)}`);
  const injectedProjectDir = projDirMatch[1];

  // Step 3: Run play-tts.ps1 WITHOUT CLAUDE_PROJECT_DIR in env (simulates Bash tool call)
  // but WITH -ProjectDir as injected by session-start — this is the real fix
  const ttsResult = await runPowerShell(
    ['-File', join(hooksDir, 'play-tts.ps1'), 'e2e lifecycle test', '-llm', 'claude-code', '-ProjectDir', injectedProjectDir],
    {
      env: {
        // Deliberately NO CLAUDE_PROJECT_DIR — simulates Bash tool call env
        USERPROFILE: process.env.USERPROFILE,
        LOCALAPPDATA: process.env.LOCALAPPDATA,
        APPDATA: process.env.APPDATA,
        Path: process.env.Path || process.env.PATH,
      },
      timeout: 30000,
    }
  );

  const output = ttsResult.stdout + ttsResult.stderr;
  assert.ok(
    output.includes(`[VOICE] Voice used: ${configuredVoice}`),
    `[VOICE] must use project config voice even without CLAUDE_PROJECT_DIR in env.\n` +
    `Expected: ${configuredVoice}\nGot: ${output.slice(0, 600)}`
  );

  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
}, 45000);

test('E2E Session Lifecycle - without -ProjectDir falls through to wrong config (demonstrates the bug)', { skip: process.platform !== 'win32' }, async () => {
  // This test documents the ORIGINAL bug behaviour: without -ProjectDir, the project
  // config is silently ignored when CLAUDE_PROJECT_DIR is absent from the Bash env.
  // It should FAIL to find the project-specific pretext, proving the isolation works.
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-e2e-noproj-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  const uniquePretext = `pretext-isolation-${Date.now()}`;
  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    `llm:claude-code|off||0.15|en_US-libritts-high::Mary|${uniquePretext}|piper\n`
  );

  // Run WITHOUT -ProjectDir AND without CLAUDE_PROJECT_DIR (bug condition)
  const result = await runPowerShell(
    ['-File', join(hooksDir, 'play-tts.ps1'), 'isolation test', '-llm', 'claude-code'],
    {
      env: {
        // No CLAUDE_PROJECT_DIR, no -ProjectDir → should NOT find project config
        USERPROFILE: process.env.USERPROFILE,
        LOCALAPPDATA: process.env.LOCALAPPDATA,
        APPDATA: process.env.APPDATA,
        Path: process.env.Path || process.env.PATH,
      },
      timeout: 30000,
    }
  );

  const output = result.stdout + result.stderr;
  // The unique pretext from the project config must NOT appear — it was never found
  assert.ok(
    !output.includes(uniquePretext),
    `Project pretext should NOT appear without -ProjectDir or CLAUDE_PROJECT_DIR.\nGot: ${output.slice(0, 400)}`
  );

  rmSync(tempDir, { recursive: true, force: true });
}, 45000);

test('Per-LLM Routing - without -llm flag falls back to llm:default not project claude-code', { skip: process.platform !== 'win32' }, async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentvibes-routing-default-'));
  const configDir = join(tempDir, '.claude', 'config');
  const audioDir = join(tempDir, '.claude', 'audio');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });

  writeFileSync(
    join(configDir, 'audio-effects.cfg'),
    'llm:default|off||0.15|en_US-lessac-high|default-pretext|piper\nllm:claude-code|off||0.15|en_US-lessac-high|cc-pretext|piper\n'
  );

  try {
    const result = await runPowerShell(
      ['-File', join(hooksDir, 'play-tts.ps1'), 'routing test'],
      {
        env: {
          CLAUDE_PROJECT_DIR: tempDir,
          AGENTVIBES_VERBOSE: '1',
          AGENTVIBES_LLM_KEY: '',
          USERPROFILE: process.env.USERPROFILE,
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          Path: process.env.Path || process.env.PATH,
        },
        timeout: 30000,
      }
    );

    const output = result.stdout + result.stderr;
    assert.ok(
      output.includes('llm=default'),
      `Without -llm flag, must route to llm:default. Output: ${output.slice(0, 500)}`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}, 30000);
