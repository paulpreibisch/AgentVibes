#!/usr/bin/env node

/**
 * File: src/installer.js
 *
 * AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
 * Website: https://agentvibes.org
 * Repository: https://github.com/paulpreibisch/AgentVibes
 *
 * Co-created by Paul Preibisch with Claude AI
 * Copyright (c) 2025 Paul Preibisch
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * express or implied, including but not limited to the warranties of
 * merchantability, fitness for a particular purpose and noninfringement.
 * In no event shall the authors or copyright holders be liable for any claim,
 * damages or other liability, whether in an action of contract, tort or
 * otherwise, arising from, out of or in connection with the software or the
 * use or other dealings in the software.
 *
 * ---
 *
 * @fileoverview Interactive installer and updater for AgentVibes CLI
 * @context Guides users through TTS provider selection, API key setup, and .claude/ directory installation
 * @architecture Commander.js CLI with subcommands (install, update, status, setup-mcp-for-claude-desktop), interactive prompts via Inquirer
 * @dependencies commander, inquirer, chalk, figlet, boxen, ora, fs/promises, node:child_process
 * @entrypoints Run via `npx agentvibes install|update|status|setup-mcp-for-claude-desktop` or direct node execution
 * @patterns Command pattern for CLI, interactive prompt flows, file copying with permission management, INIT_CWD for npx context
 * @related package.json scripts, .claude/commands/agent-vibes/, .claude/hooks/, templates/, docs/ai-optimized-documentation-standards.md
 */

import { program } from 'commander';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { execSync, execFileSync, spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import crypto from 'node:crypto';
import chalk from 'chalk';
import inquirer from 'inquirer';
import search from '@inquirer/search';
import figlet from 'figlet';
import { detectBMAD } from './bmad-detector.js';
import boxen from 'boxen';
import ora from 'ora';
import { fileURLToPath } from 'node:url';
import { installMCP } from './commands/install-mcp.js';
import {
  previewVoice,
  listAvailableVoices,
  listBmadAssignedVoices,
  assignVoice,
  resetBmadVoices,
} from './commands/bmad-voices.js';
import {
  validateProvider,
  getProviderInstallCommand,
  getProviderDisplayName,
  attemptProviderInstallation,
} from './utils/provider-validator.js';
import { promptForCustomMusic } from './installer/music-file-input.js';
import { createPreviewListPrompt } from './utils/preview-list-prompt.js';
import { selectLanguage } from './installer/language-screen.js';
import { t } from './i18n/strings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const VERSION = packageJson.version;

// Personality emoji mapping for quick visual recognition
const personalityEmojis = {
  'angry': '😠',
  'annoying': '😤',
  'crass': '🤬',
  'dramatic': '🎭',
  'dry-humor': '😐',
  'flirty': '😘',
  'funny': '😂',
  'grandpa': '👴',
  'millennial': '🙄',
  'moody': '😒',
  'none': '😊',
  'normal': '😊',
  'pirate': '🏴‍☠️',
  'poetic': '📜',
  'professional': '👔',
  'rapper': '🎤',
  'robot': '🤖',
  'sarcastic': '😏',
  'sassy': '💁',
  'surfer-dude': '🏄',
  'zen': '🧘'
};

// Validate Node.js executable is available (CLAUDE.md - early validation)
if (!process.execPath) {
  console.error('❌ Error: Node.js executable path not found');
  console.error('   Please ensure Node.js is properly installed and in your PATH');
  process.exit(1);
}

/**
 * Detect if running on Android/Termux environment
 * @returns {boolean} True if running on Termux/Android
 */
function isTermux() {
  return fsSync.existsSync('/data/data/com.termux');
}

/**
 * Detect if running on native Windows (not WSL)
 * @returns {boolean} True if running on native Windows
 */
function isNativeWindows() {
  return process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
}

/**
 * Get the Piper provider name (always 'piper' on all platforms)
 * @returns {string} The piper provider identifier
 */
function getPiperProvider() {
  return 'piper';
}

/**
 * Check if a provider is piper (accepts legacy 'windows-piper' for backwards compat)
 * @param {string} provider - The provider name to check
 * @returns {boolean} True if the provider is a piper variant
 */
function isPiperProvider(provider) {
  return provider === 'piper' || provider === 'windows-piper';
}

/**
 * Detect if running on Android/Termux and display message
 * @returns {boolean} True if running on Termux/Android
 */
function detectAndNotifyTermux() {
  if (isTermux()) {
    console.log(chalk.green('\n📱 Android environment detected!'));
    console.log(chalk.cyan('   Installing specialized libraries for Termux...\n'));
    return true;
  }
  return false;
}

/**
 * Check if PulseAudio tunnel is active
 * @returns {boolean} True if PULSE_SERVER points to a TCP connection
 */
function hasPulseAudioTunnel() {
  return process.env.PULSE_SERVER &&
         process.env.PULSE_SERVER.toLowerCase().startsWith('tcp:');
}

/**
 * Story 2.3: Detect terminal emoji support
 * Checks $TERM, locale, and platform to determine emoji capability
 * @returns {boolean} True if terminal supports emoji
 */
function supportsEmoji() {
  // Check TERM environment variable
  const term = process.env.TERM || '';
  const lang = process.env.LANG || '';
  const lcAll = process.env.LC_ALL || '';

  // Explicitly unsupported terminals
  const unsupportedTerminals = ['dumb', 'emacs', 'ansi'];
  if (unsupportedTerminals.includes(term.toLowerCase())) {
    return false;
  }

  // Check for UTF-8 locale (required for emoji)
  const isUtf8 = lang.includes('utf8') || lang.includes('UTF-8') ||
                 lcAll.includes('utf8') || lcAll.includes('UTF-8');

  // Modern terminals (check common ones)
  const modernTerminals = [
    'xterm-256color', 'screen-256color', 'tmux-256color',
    'iterm2', 'iterm', 'vscode', 'alacritty', 'kitty',
    'wezterm', 'windows-terminal', 'conemu'
  ];

  const isModernTerminal = modernTerminals.some(t => term.toLowerCase().includes(t));

  // Windows Terminal always supports emoji — coerce to boolean to avoid returning WT_SESSION UUID
  const isWindowsTerminal = process.platform === 'win32' &&
                            !!(process.env.WT_SESSION || process.env.WT_PROFILE_ID);

  // macOS Terminal and iTerm2
  const isMacOS = process.platform === 'darwin';

  // Linux with proper UTF-8
  const isLinuxWithUtf8 = process.platform === 'linux' && isUtf8;

  // Unknown terminal with UTF-8: Only enable emoji if TERM is not explicitly unsupported AND has UTF-8
  // This prevents false positives like "vt100" with UTF-8 reporting emoji support
  const unknownTerminalWithUtf8 = term &&
                                 !unsupportedTerminals.includes(term.toLowerCase()) &&
                                 isUtf8;

  // Default to true for: modern terms, Windows Terminal, macOS, Linux with UTF-8, or unknown term with UTF-8
  // Default to false for: dumb/emacs/ansi terminals or environments without UTF-8
  return isModernTerminal || isWindowsTerminal || isMacOS || isLinuxWithUtf8 || unknownTerminalWithUtf8;
}

/**
 * Story 2.4: Get personality display with emoji or text fallback
 * Returns emoji if supported, otherwise returns text label like "[personality]"
 * @param {string} personality - Personality name
 * @param {boolean} emojiSupported - Pre-computed emoji support (avoids redundant env var reads)
 * @returns {string} Either emoji or "[personality-name]" fallback
 */
function getPersonalityIcon(personality, emojiSupported) {
  const emoji = personalityEmojis[personality] || '✨';

  // Use provided emojiSupported to avoid recalculating for every personality (performance)
  if (emojiSupported) {
    return emoji;
  }

  // Text fallback for unsupported terminals: [personality-name]
  return `[${personality}]`;
}

/**
 * Check if Piper TTS is installed
 * @returns {boolean} True if piper command exists
 */
function isPiperInstalled() {
  // On Windows, check standard install location then PATH
  if (isNativeWindows()) {
    const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
    if (localAppData) {
      const piperExe = path.join(localAppData, 'Programs', 'Piper', 'piper.exe');
      if (fsSync.existsSync(piperExe)) return true;
    }
    // Also check PATH (e.g. pip-installed piper)
    try {
      execSync('where piper.exe', { stdio: 'pipe', timeout: 3000 });
      return true;
    } catch (e) {
      return false;
    }
  }
  try {
    execSync('which piper', {
      stdio: 'pipe',
      timeout: 3000
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if Soprano TTS is installed
 * @returns {boolean} True if soprano-tts or soprano-webui command exists
 */
function isSopranoInstalled() {
  try {
    execSync('which soprano-tts || which soprano-webui', {
      stdio: 'pipe',
      timeout: 3000
    });
    return true;
  } catch (e) {
    // On Windows, 'which' may not find Python scripts; try 'py -m pip show' as fallback
    if (isNativeWindows()) {
      try {
        const result = spawnSync('py', ['-m', 'pip', 'show', 'soprano-tts'], {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000
        });
        return result.status === 0 && result.stdout && result.stdout.includes('Name:');
      } catch (e2) {
        return false;
      }
    }
    return false;
  }
}

/**
 * Play voice sample for preview during voice selection
 * @param {string} voiceName - Name of the voice (e.g., 'en_US-lessac-medium', 'soprano-default')
 * @param {string} provider - TTS provider ('piper' or 'soprano')
 * @returns {Promise<boolean>} True if sample played successfully
 */
async function playVoiceSample(voiceName, provider) {
  try {
    const samplesDir = path.join(__dirname, '..', '.claude', 'audio', 'voice-samples', provider);

    // Try friendly name first (e.g., "ryan.wav")
    let sampleFile = path.join(samplesDir, `${voiceName}.wav`);

    // If not found and looks like a Piper ID, try that too
    if (!fsSync.existsSync(sampleFile) && voiceName.includes('-')) {
      sampleFile = path.join(samplesDir, `${voiceName}.wav`);
    }

    // Check if pre-recorded sample exists
    if (fsSync.existsSync(sampleFile)) {
      console.log(chalk.cyan('  🔊 Playing voice sample...'));

      // Play using sox/aplay - use spawn for non-blocking playback
      try {
        // Play using aplay directly (no shell interpolation — prevents command injection)
        const player = spawn('aplay', [sampleFile], {
          detached: false,
          stdio: 'ignore'
        });

        // Return the process so it can be killed
        return player;
      } catch (e) {
        // Fallback: generate on-the-fly if provider is available
      }
    }

    // Generate sample on-the-fly if provider is running
    if (isPiperProvider(provider) && isPiperInstalled()) {
      const text = `Hi, I'm ${voiceName.split('-')[1] || 'Piper'}`;
      // Use bash -c with positional args to prevent command injection via text/voiceName
      spawnSync('bash', ['-c', 'echo "$1" | piper --model "$2" --output_raw | aplay -r 22050 -f S16_LE -t raw -', '_', text, voiceName], {
        stdio: 'inherit',
        timeout: 15000
      });
      return true;
    } else if (provider === 'soprano' && await isSopranoRunning()) {
      // Generate via Soprano API
      const text = "Hi, I'm Soprano";
      const response = await fetch('http://localhost:7860/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'soprano-default' }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const audio = await response.arrayBuffer();
        // Save temporarily and play
        const tempFile = path.join(os.tmpdir(), `soprano-sample-${crypto.randomBytes(8).toString('hex')}.wav`);
        fsSync.writeFileSync(tempFile, Buffer.from(audio));
        try {
          // Use spawnSync with argument array to prevent command injection
          spawnSync('aplay', [tempFile], { stdio: 'pipe', timeout: 5000 });
        } finally {
          fsSync.unlinkSync(tempFile);
        }
        return true;
      }
    }

    return false;
  } catch (e) {
    console.log(chalk.gray('  (Preview not available)'));
    return false;
  }
}

/**
 * Check if Soprano server is running on port 7860
 * @returns {Promise<boolean>} True if server responds to health check
 */
async function isSopranoRunning() {
  try {
    const response = await fetch('http://localhost:7860/health', {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Start Soprano TTS server in background
 * @returns {Promise<boolean>} True if successfully started
 */
async function startSopranoServer() {
  try {
    console.log(chalk.gray('🚀 Starting Soprano TTS server...'));

    // Start soprano-webui in background
    const sopranoProcess = spawn('soprano-webui', ['--port', '7860'], {
      detached: true,
      stdio: 'ignore'
    });

    sopranoProcess.unref(); // Allow parent to exit independently

    // Wait up to 10 seconds for server to be ready
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await isSopranoRunning()) {
        console.log(chalk.green('✓ Soprano TTS server started successfully\n'));
        return true;
      }
    }

    console.log(chalk.yellow('⚠️  Soprano server started but not responding yet\n'));
    return false;
  } catch (e) {
    console.log(chalk.yellow('⚠️  Failed to start Soprano server:', e.message, '\n'));
    return false;
  }
}

/**
 * Detect system capabilities for smart provider recommendations
 * @returns {Promise<Object>} System info including GPU, memory, platform, Soprano availability
 */
async function detectSystemCapabilities() {
  const isMacOS = process.platform === 'darwin';
  const isAndroid = isTermux();
  let hasGPU = false;
  let totalRAM = 0;
  let sopranoAvailable = false;

  try {
    // Detect NVIDIA GPU
    try {
      execSync('nvidia-smi --query-gpu=name --format=csv,noheader', {
        stdio: 'pipe',
        timeout: 5000  // 5 second timeout
      });
      hasGPU = true;
    } catch (e) {
      // No NVIDIA GPU or timeout
    }

    // Detect total RAM (in MB)
    if (isMacOS) {
      const output = execSync('sysctl hw.memsize', {
        encoding: 'utf8',
        timeout: 3000  // 3 second timeout
      });
      const parts = output.split(':');
      if (parts.length < 2) {
        throw new Error('Unexpected sysctl output format');
      }
      const bytes = parseInt(parts[1].trim(), 10);
      if (isNaN(bytes)) {
        throw new Error('Failed to parse memory size');
      }
      totalRAM = Math.floor(bytes / (1024 * 1024));
    } else {
      const output = execSync('cat /proc/meminfo | grep MemTotal', {
        encoding: 'utf8',
        timeout: 3000  // 3 second timeout
      });
      const parts = output.split(':');
      if (parts.length < 2) {
        throw new Error('Unexpected meminfo output format');
      }
      const memParts = parts[1].trim().split(' ');
      if (memParts.length < 1) {
        throw new Error('Unexpected meminfo value format');
      }
      const kb = parseInt(memParts[0], 10);
      if (isNaN(kb)) {
        throw new Error('Failed to parse memory size');
      }
      totalRAM = Math.floor(kb / 1024);
    }
  } catch (e) {
    // Fallback: assume 4GB if detection fails
    totalRAM = 4096;
  }

  // Detect and auto-start Soprano if installed
  if (isSopranoInstalled()) {
    const isRunning = await isSopranoRunning();
    if (isRunning) {
      sopranoAvailable = true;
    } else {
      // Soprano installed but not running - try to start it
      sopranoAvailable = await startSopranoServer();
    }
  }

  return {
    hasGPU,
    lowMemory: totalRAM < 4096,
    totalRAM,
    isMacOS,
    isAndroid,
    sopranoAvailable
  };
}

/**
 * Detect environment type for smart installation defaults
 * @returns {string} - 'DESKTOP', 'PHONE', or 'VOICELESS'
 */
function detectEnvironment() {
  // Check if Termux/Android
  if (isTermux()) {
    return 'PHONE';
  }

  // Check for audio devices (local hardware)
  const hasAudio = checkAudioDevices();

  // Check if PulseAudio tunnel is active (e.g., tcp:hostname:port)
  // This provides working audio over SSH connections
  const hasTunnel = hasPulseAudioTunnel();

  // Check if in SSH session
  const isSSH = process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY;

  // Voiceless: No audio devices AND no PulseAudio tunnel
  // (SSH status doesn't matter - what matters is whether audio works)
  if (!hasAudio && !hasTunnel) {
    return 'VOICELESS';
  }

  // Desktop: Has working audio (local devices OR PulseAudio tunnel)
  // This includes SSH sessions with PulseAudio tunnels
  return 'DESKTOP';
}

/**
 * Check if system has audio output devices
 * @returns {boolean} - True if audio devices found
 */
function checkAudioDevices() {
  try {
    // Linux: check with aplay or paplay
    if (process.platform === 'linux') {
      try {
        // Try aplay first (ALSA)
        execSync('aplay -l 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' });
        return true;
      } catch (e) {
        // Try paplay (PulseAudio)
        try {
          execSync('paplay --version 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' });
          return true;
        } catch (e2) {
          return false;
        }
      }
    }

    // macOS: always has audio
    if (process.platform === 'darwin') {
      return true;
    }

    // Windows: assume has audio
    if (process.platform === 'win32') {
      return true;
    }

    return false;
  } catch (error) {
    // If detection fails, assume no audio (safe default)
    return false;
  }
}

/**
 * Create header and footer for installer pages
 * @param {string} pageTitle - Title of current page
 * @param {number} currentPage - Current page number (0-indexed, relative to section)
 * @param {number} totalPages - Total number of pages across entire installer
 * @param {number} pageOffset - Offset to add to currentPage for global numbering
 * @returns {Object} - Object with header and footer strings
 */
function createPageHeaderFooter(pageTitle, currentPage, totalPages, pageOffset = 0) {
  // Calculate consistent width for header
  const boxWidth = 80;

  // Header: Agent Vibes Installer + Version + Page Title + Page Number + Links
  const agentText = chalk.cyan('Agent');
  const vibesText = chalk.magentaBright('Vibes');
  const globalPageNum = currentPage + pageOffset + 1; // Convert to 1-indexed and add offset
  const pageNum = chalk.green(`Page ${globalPageNum}/${totalPages}`);
  const website = chalk.gray('https://agentvibes.org');
  const github = chalk.gray('https://github.com/paulpreibisch/AgentVibes');

  const header = boxen(
    `${agentText} ${vibesText} ${chalk.gray(`v${VERSION}`)} ${chalk.gray('Installer')} • ${pageNum}\n` +
    `${website} • ${github}\n\n` +
    `${chalk.cyan(pageTitle)}`,
    {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: 'cyan',
      textAlignment: 'center',
      width: boxWidth,
      backgroundColor: '#1a1a1a'
    }
  );

  // No separate footer needed - everything in header
  const footer = '';

  return { header, footer };
}

/**
 * Display paginated installation content with Previous/Next navigation
 * @param {Array} pages - Array of {title, content} objects to display
 * @param {Object} options - Options for pagination (yes, continueLabel, pageOffset, totalPages, showPreviousOnFirst)
 * @returns {Promise<void>}
 */
/**
 * Build navigation choices for paginated content
 * @param {number} currentPage - Current page index
 * @param {number} totalPages - Total number of pages
 * @param {string} continueLabel - Label for continue button
 * @param {boolean} showPreviousOnFirst - Show previous on first page
 * @param {Array} pages - Array of page objects with titles
 * @returns {Array} Navigation choices
 */
function buildNavigationChoices(currentPage, totalPages, continueLabel, showPreviousOnFirst, pages = null) {
  const choices = [];
  const isLastPage = currentPage >= totalPages - 1;

  if (!isLastPage) {
    let nextLabel = chalk.green('Next →');
    if (pages && pages[currentPage + 1]) {
      nextLabel += chalk.gray(` (${pages[currentPage + 1].title})`);
    }
    choices.push({ name: nextLabel, value: 'next' });
  } else {
    choices.push({ name: chalk.cyan(`✓ ${continueLabel.replace('✓ ', '')}`), value: 'continue' });
  }

  if (currentPage > 0 || showPreviousOnFirst) {
    let prevLabel = chalk.gray('← Previous');
    if (pages && currentPage > 0 && pages[currentPage - 1]) {
      prevLabel += chalk.gray(` (${pages[currentPage - 1].title})`);
    } else if (showPreviousOnFirst && currentPage === 0) {
      prevLabel = chalk.gray('← Back to Configuration');
    }
    choices.push({ name: prevLabel, value: 'prev' });
  }

  return choices;
}

/**
 * Handle navigation action in paginated content
 * @param {string} action - Navigation action (prev, next, continue)
 * @param {number} currentPage - Current page index
 * @param {boolean} showPreviousOnFirst - Show previous on first page
 * @returns {Object} Navigation result {newPage, shouldExit, shouldReturn}
 */
function handleNavigationAction(action, currentPage, showPreviousOnFirst) {
  if (action === 'prev') {
    if (currentPage > 0) {
      return { newPage: currentPage - 1, shouldExit: false, shouldReturn: false };
    }
    if (showPreviousOnFirst) {
      return { newPage: currentPage, shouldExit: false, shouldReturn: true };
    }
  } else if (action === 'next') {
    return { newPage: currentPage + 1, shouldExit: false, shouldReturn: false };
  }

  // Continue action - exit loop
  return { newPage: currentPage, shouldExit: true, shouldReturn: false };
}

async function showPaginatedContent(pages, options = {}) {
  if (options.yes || pages.length === 0) {
    pages.forEach(page => console.log(page.content));
    return;
  }

  const continueLabel = options.continueLabel || '✓ Continue with Installation';
  const pageOffset = options.pageOffset || 0;
  const totalPages = options.totalPages || pages.length;
  const showPreviousOnFirst = options.showPreviousOnFirst || false;
  let currentPage = 0;

  while (currentPage >= 0 && currentPage < pages.length) {
    console.clear();

    const { header, footer } = createPageHeaderFooter(
      pages[currentPage].title,
      currentPage,
      totalPages,
      pageOffset
    );

    console.log(header);
    console.log(pages[currentPage].content);
    const choices = buildNavigationChoices(currentPage, pages.length, continueLabel, showPreviousOnFirst, pages);

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: chalk.cyan('💡 Try these AgentVibes commands in Claude Code terminal'),
      prefix: '',
      choices,
      default: currentPage < pages.length - 1 ? 'next' : 'continue'
    }]);

    const navResult = handleNavigationAction(action, currentPage, showPreviousOnFirst);

    if (navResult.shouldReturn) {
      return 'prev';
    }

    if (navResult.shouldExit) {
      console.clear();
      break;
    }

    currentPage = navResult.newPage;
  }
}

/**
 * Get page title by page number
 * @param {number} pageNum - Page number (0-4)
 * @returns {string} Page title
 */
function getPageTitle(pageNum) {
  const titles = {
    0: '🔧 System Dependencies',
    1: '🔌 TTS Provider Configuration',
    2: '🎤 Voice Selection',
    3: '😎 Personality Selection',
    4: '🎛️ Reverb Settings',
    5: '🎵 Background Music',
    6: '🔊 Verbosity Settings'
  };
  return titles[pageNum] || 'Configuration';
}

/**
 * Handle Page 0: System Dependencies display
 * @returns {Promise<void>}
 */
async function handleSystemDependenciesPage() {
  const { checkDependencies, getInstallCommands } = await import('./utils/dependency-checker.js');
  const depResults = checkDependencies();

  let depContent = chalk.gray('System dependencies detected and already installed.\n');
  depContent += chalk.gray('These tools enable AgentVibes features and functionality.\n\n');

  // Satisfied dependencies
  if (depResults.core.node?.isCompatible) {
    depContent += chalk.green(`✓ Node.js ${depResults.core.node.version}\n`);
  }
  if (depResults.core.python?.isCompatible) {
    depContent += chalk.green(`✓ Python ${depResults.core.python.version}\n`);
  }
  if (depResults.core.bash?.isModern) {
    depContent += chalk.green(`✓ Bash ${depResults.core.bash.version}\n`);
  }
  if (depResults.optional.curl) {
    depContent += chalk.green('✓ curl\n');
  }
  if (depResults.optional.sox) {
    depContent += chalk.green('✓ sox\n');
  }
  if (depResults.optional.ffmpeg) {
    depContent += chalk.green('✓ ffmpeg\n');
  }
  if (depResults.optional.bc) {
    depContent += chalk.green('✓ bc\n');
  }
  if (depResults.optional.flock) {
    depContent += chalk.green('✓ flock\n');
  }
  if (depResults.optional.pipx) {
    depContent += chalk.green('✓ pipx\n');
  }
  if (depResults.optional.audioPlayer) {
    depContent += chalk.green('✓ audio player (paplay/aplay/mpv)\n');
  }

  // Check TTS providers
  const piperInstalled = isPiperInstalled();
  const sopranoInstalled = isSopranoInstalled();

  if (piperInstalled || sopranoInstalled) {
    depContent += '\n' + chalk.gray('─'.repeat(50)) + '\n\n';
    depContent += chalk.cyan.bold('TTS Providers Already Installed:\n\n');

    if (piperInstalled) {
      try {
        const piperPath = execSync('which piper 2>/dev/null', { encoding: 'utf8' }).trim();
        depContent += chalk.green('✓ Piper TTS (offline voice synthesis)\n');
        depContent += chalk.gray(`  ${piperPath}\n`);
      } catch (e) {
        depContent += chalk.green('✓ Piper TTS (offline voice synthesis)\n');
      }
    }
    if (sopranoInstalled) {
      try {
        let sopranoPath = '';
        try {
          sopranoPath = execSync('which soprano-tts 2>/dev/null', { encoding: 'utf8' }).trim();
        } catch (e) {
          sopranoPath = execSync('which soprano-webui 2>/dev/null', { encoding: 'utf8' }).trim();
        }
        depContent += chalk.green('✓ Soprano TTS (premium quality)\n');
        depContent += chalk.gray(`  ${sopranoPath}\n`);
      } catch (e) {
        depContent += chalk.green('✓ Soprano TTS (premium quality)\n');
      }
    }
  }

  // Missing dependencies
  if (Object.keys(depResults.missing).length > 0) {
    depContent += '\n' + chalk.gray('─'.repeat(50)) + '\n\n';
    depContent += chalk.yellow.bold('Missing (Optional):\n\n');

    if (depResults.missing.curl) depContent += chalk.yellow('⚠ curl - needed for downloads\n');
    if (depResults.missing.sox) depContent += chalk.yellow('⚠ sox - audio effects\n');
    if (depResults.missing.ffmpeg) depContent += chalk.yellow('⚠ ffmpeg - background music\n');
    if (depResults.missing.bc) depContent += chalk.yellow('⚠ bc - audio calculations\n');
    if (depResults.missing.flock) depContent += chalk.yellow('⚠ flock - TTS queue locking\n');
    if (depResults.missing.pipx) depContent += chalk.yellow('⚠ pipx - Piper TTS installation\n');
    if (depResults.missing.audioPlayer) depContent += chalk.yellow('⚠ audio player - playback\n');

    depContent += '\n' + chalk.gray('TTS will still work without optional tools');

    // Add install commands (os imported at top level)
    const platform = os.platform();
    const installCmds = getInstallCommands(depResults.missing, platform);

    if (installCmds.length > 0) {
      depContent += '\n\n' + chalk.gray('─'.repeat(50)) + '\n\n';
      depContent += chalk.cyan.bold('To Install Missing Tools:\n\n');

      installCmds.forEach(({ label, command }) => {
        depContent += chalk.cyan(`${label}:\n`);
        depContent += chalk.white(`  ${command}\n\n`);
      });
    }
  }

  const depsBoxen = boxen(depContent.trim(), {
    padding: 1,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: Object.keys(depResults.missing).length > 0 ? 'yellow' : 'green',
    width: 80
  });

  console.log(depsBoxen);

  // Return status for navigation message
  return {
    allMet: Object.keys(depResults.missing).length === 0,
    missingCount: Object.keys(depResults.missing).length
  };
}

/**
 * Validate and copy custom music track to .claude/audio/tracks directory
 * @param {string} userFilePath - Path provided by user
 * @param {string} tracksDir - Target directory for audio tracks
 * @returns {Promise<string|null>} Filename if successful, null if cancelled
 */
async function handleCustomMusicTrack(userFilePath, tracksDir) {
  try {
    // Validate file exists and resolve path securely
    const resolvedPath = path.resolve(userFilePath.trim());

    if (!fsSync.existsSync(resolvedPath)) {
      console.error(chalk.red('✗ File not found. Please check the path.'));
      return null;
    }

    // Validate file extension (whitelist approach per CLAUDE.md)
    const ext = path.extname(resolvedPath).toLowerCase();
    const supportedFormats = ['.mp3', '.wav', '.ogg', '.m4a'];
    if (!supportedFormats.includes(ext)) {
      console.error(chalk.red('✗ Unsupported format. Use: .mp3, .wav, .ogg, or .m4a'));
      return null;
    }

    // Verify file is within expected directory (prevent path traversal)
    if (!resolvedPath.startsWith(path.resolve(os.homedir()))) {
      console.error(chalk.red('✗ File must be in your home directory or subdirectories.'));
      return null;
    }

    // Get original filename and sanitize it
    let originalFilename = path.basename(resolvedPath);
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Create tracks directory if needed
    await fs.mkdir(tracksDir, { recursive: true });

    // Copy file to tracks directory
    const destPath = path.join(tracksDir, sanitizedFilename);
    await fs.copyFile(resolvedPath, destPath);

    return sanitizedFilename;
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    return null;
  }
}

/**
 * Load custom tracks from global registry
 * @returns {Promise<Array>} Array of custom track objects {name, filename}
 */
async function loadCustomTracks() {
  try {
    const registryPath = path.join(process.env.HOME || process.env.USERPROFILE, '.agentvibes', 'custom-tracks.json');
    if (fsSync.existsSync(registryPath)) {
      const content = await fs.readFile(registryPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Silently fail - registry may not exist yet
  }
  return [];
}

/**
 * Save custom tracks to global registry
 * @param {Array} tracks - Array of custom track objects
 */
async function saveCustomTracks(tracks) {
  try {
    const registryDir = path.join(process.env.HOME || process.env.USERPROFILE, '.agentvibes');
    await fs.mkdir(registryDir, { recursive: true });
    const registryPath = path.join(registryDir, 'custom-tracks.json');
    await fs.writeFile(registryPath, JSON.stringify(tracks, null, 2));
  } catch (err) {
    // Silently fail - non-critical
  }
}

// Track currently playing audio preview to prevent overlaps
let currentAudioPreview = null;

/**
 * Preview audio track using available audio player
 * @param {string} trackName - Name of the track file to preview
 * @param {string} tracksDir - Directory containing audio tracks
 * @returns {Promise<boolean>} True if preview was attempted, false if no audio tools available
 */
async function previewAudioTrack(trackName, tracksDir) {
  // Stop any currently playing preview
  if (currentAudioPreview && !currentAudioPreview.killed) {
    currentAudioPreview.kill('SIGTERM');
    currentAudioPreview = null;
  }

  const trackPath = path.join(tracksDir, trackName);

  // Verify track exists
  if (!fsSync.existsSync(trackPath)) {
    console.log(chalk.yellow('⚠️  Track file not found'));
    return false;
  }

  // Try available audio players in order of preference
  const audioPlayers = ['ffplay', 'play', 'mpv'];
  let playerAvailable = false;

  for (const player of audioPlayers) {
    try {
      execSync(`which ${player}`, { stdio: 'ignore' });
      playerAvailable = true;

      console.log(chalk.cyan('▶  Playing preview (10 seconds)...'));

      // Build appropriate command for each player
      let playerArgs = [];
      if (player === 'ffplay') {
        playerArgs = ['-nodisp', '-autoexit', '-t', '10', '-volume', '30', trackPath];
      } else if (player === 'play') {
        playerArgs = [trackPath, 'trim', '0', '10'];
      } else if (player === 'mpv') {
        playerArgs = ['--no-video', '--duration=10', '--volume=30', trackPath];
      }

      // Spawn player process (manual setTimeout below handles the safety kill)
      const audioProcess = spawn(player, playerArgs, {
        stdio: ['ignore', 'ignore', 'ignore']
      });

      // Store reference to current preview
      currentAudioPreview = audioProcess;

      // Handle process completion
      return new Promise((resolve) => {
        const timeoutHandle = setTimeout(() => {
          if (audioProcess && !audioProcess.killed) {
            audioProcess.kill('SIGTERM');
          }
          if (currentAudioPreview === audioProcess) {
            currentAudioPreview = null;
          }
          resolve(true);
        }, 11000); // 11 second timeout

        audioProcess.on('close', () => {
          clearTimeout(timeoutHandle);
          if (currentAudioPreview === audioProcess) {
            currentAudioPreview = null;
          }
          resolve(true);
        });

        audioProcess.on('error', () => {
          clearTimeout(timeoutHandle);
          if (currentAudioPreview === audioProcess) {
            currentAudioPreview = null;
          }
          resolve(true);
        });
      });
    } catch (err) {
      // This player not available, try next
      continue;
    }
  }

  if (!playerAvailable) {
    console.log(chalk.yellow('⚠️  Audio preview requires ffplay, sox (play), or mpv'));
  }
  return false;
}

/**
 * Collect all configuration answers through paginated question flow
 * @param {Object} options - Installation options (yes, pageOffset, totalPages)
 * @returns {Promise<Object>} Configuration object with all answers
 */
async function collectConfiguration(options = {}) {
  const config = {
    provider: null,
    piperPath: null,
    sshHost: null,
    defaultVoice: null,
    pretext: '',
    personality: 'none',
    reverb: 'light',
    backgroundMusic: {
      enabled: true,
      track: 'agentvibes_soft_flamenco_loop.mp3'
    },
    verbosity: 'high'
  };

  // Load existing pretext from file if it exists (Story 1.2: File Persistence)
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const claudeDir = path.join(homeDir, '.claude');
  const pretextFile = path.join(claudeDir, 'config', 'tts-pretext.txt');
  try {
    if (fsSync.existsSync(pretextFile)) {
      const existingPretext = fsSync.readFileSync(pretextFile, 'utf-8').trim();
      if (existingPretext) {
        config.pretext = existingPretext;
      }
    }
  } catch (err) {
    // Gracefully handle read errors (file permissions, encoding issues, etc.)
    // Pretext will remain empty string if file can't be read
  }

  // Detect environment type
  const environment = detectEnvironment();
  const isAndroid = isTermux();

  if (isAndroid) {
    detectAndNotifyTermux();
  } else if (environment === 'VOICELESS') {
    console.log(chalk.cyan('\n🔇 Voiceless environment detected!'));
    console.log(chalk.gray('   No audio output available on this server.\n'));
  } else if (environment === 'DESKTOP') {
    console.log(chalk.green('\n🔊 Audio output detected!'));
    console.log(chalk.gray('   Your system has speakers/audio devices.\n'));
  }

  if (options.yes) {
    // Non-interactive mode - use defaults
    // On Termux, always use piper (via proot-distro)
    if (isAndroid) {
      config.provider = 'piper';
      config.defaultVoice = 'en_US-lessac-medium';
      config.isTermux = true;
    } else if (isNativeWindows()) {
      config.provider = 'piper';
      config.defaultVoice = 'en_US-ryan-high';
    } else {
      config.provider = process.platform === 'darwin' ? 'macos' : 'piper';
      config.defaultVoice = process.platform === 'darwin' ? 'Samantha' : 'en_US-ryan-high';
    }
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    config.piperPath = path.join(homeDir, '.claude', 'piper-voices');
    // AI agent / non-interactive defaults: no reverb, no background music
    config.reverb = 'none';
    config.backgroundMusic = { enabled: false, track: 'agentvibes_soft_flamenco_loop.mp3' };
    return config;
  }

  let currentPage = 0;
  const sectionPages = 7; // System Dependencies, Provider, Voice Selection, Personality Selection, Reverb, Background Music, Verbosity
  const pageOffset = options.pageOffset || 0;
  const totalPages = options.totalPages || sectionPages;

  // Cache system capabilities to avoid duplicate detection
  let systemInfoCache = null;

  console.clear();
  console.log(chalk.cyan.bold('\n⚙️  Configuration Setup\n'));
  console.log(chalk.white('Please configure your AgentVibes installation.\n'));
  console.log(chalk.gray('Use arrow keys to navigate between pages.\n'));

  while (currentPage >= 0 && currentPage < sectionPages) {
    console.clear();

    // Show header
    const pageTitle = getPageTitle(currentPage);
    const { header, footer } = createPageHeaderFooter(pageTitle, currentPage, totalPages, pageOffset);
    console.log(header);

    let pageStatus = null; // Track page completion status for navigation message

    if (currentPage === 0) {
      pageStatus = await handleSystemDependenciesPage();
    } else if (currentPage === 1) {
      // Page 2: TTS Provider & Voice Storage

      // Show provider selection with context-aware messaging
      const isMacOS = process.platform === 'darwin';

      // Voiceless Server: Special prompt about audio routing
      if (environment === 'VOICELESS') {
        console.log(boxen(
          chalk.cyan.bold('Where would you like to hear TTS announcements?\n\n') +
          chalk.white('1️⃣  ') + chalk.green('My phone/tablet via SSH') + chalk.yellow(' (Recommended)\n') +
          chalk.gray('    ✓ Secure, works anywhere with Tailscale\n') +
          chalk.gray('    ✓ Full voice effects and features on receiver\n') +
          chalk.gray('    ✓ Low bandwidth (text only)\n\n') +
          chalk.white('2️⃣  ') + chalk.blue('Another computer via PulseAudio\n') +
          chalk.gray('    ✓ Low latency on local network\n') +
          chalk.gray('    ✗ Requires PulseAudio on both devices\n\n') +
          chalk.white('3️⃣  ') + chalk.gray('No audio (silent mode)'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'cyan',
            width: 80
          }
        ));
      }
      // Phone/Termux: Ask how they'll use AgentVibes
      else if (environment === 'PHONE') {
        console.log(boxen(
          chalk.cyan.bold('How will you use AgentVibes on this device?\n\n') +
          chalk.white('1️⃣  ') + chalk.green('Receive TTS from remote server') + chalk.yellow(' (Receiver mode)\n') +
          chalk.gray('    ✓ Perfect for Clawdbot phone setup\n') +
          chalk.gray('    ✓ Plays audio sent from your server\n\n') +
          chalk.white('2️⃣  ') + chalk.blue('Local TTS playback only\n') +
          chalk.gray('    ✓ Use AgentVibes directly on this device\n') +
          chalk.gray('    ✗ Not for remote server routing'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'green',
            width: 80
          }
        ));
      }
      // Windows: Simple provider info
      else if (isNativeWindows()) {
        const providerInfoContent =
          chalk.white('Text-to-Speech (TTS) converts Claude\'s text responses into spoken audio.\n\n') +
          chalk.white('Choose your Text-to-Speech provider.\n\n') +
          chalk.green('🎵 Windows Piper TTS (Recommended)\n') +
          chalk.gray('   • High quality neural voices\n') +
          chalk.gray('   • 50+ Hugging Face AI voices\n') +
          chalk.gray('   • Free & offline\n\n') +
          chalk.magenta('⚡ Soprano TTS\n') +
          chalk.gray('   • Ultra-fast: 20x CPU, 2000x GPU\n') +
          chalk.gray('   • 1 premium English voice\n') +
          chalk.gray('   • <1GB memory footprint\n\n') +
          chalk.blue('🔊 Windows SAPI (Built-in)\n') +
          chalk.gray('   • Zero setup required\n') +
          chalk.gray('   • Uses Windows built-in voices\n') +
          chalk.gray('   • Basic quality');
        console.log(boxen(providerInfoContent, {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'cyan',
          width: 80
        }));
      }
      // Desktop: Smart provider selection with system detection
      else {
        // Detect system capabilities for smart recommendations (cached to avoid duplicate calls)
        if (!systemInfoCache) {
          systemInfoCache = await detectSystemCapabilities();
        }
        const systemInfo = systemInfoCache;

        // Detect audio method (local devices vs PulseAudio tunnel)
        const hasLocalAudio = checkAudioDevices();
        const hasTunnel = hasPulseAudioTunnel();

        // Context-aware header message
        let audioHeader = '';
        let audioSubtext = '';
        if (hasLocalAudio && hasTunnel) {
          audioHeader = chalk.green.bold('🔊 Audio Output Detected!\n\n');
          audioSubtext = chalk.white('Local speakers + PulseAudio tunnel detected. Choose your TTS engine:\n\n');
        } else if (hasTunnel) {
          audioHeader = chalk.blue.bold('🌐 PulseAudio Tunnel Detected!\n\n');
          audioSubtext = chalk.white('Audio will play through your PulseAudio tunnel. Choose your TTS engine:\n\n');
        } else {
          audioHeader = chalk.green.bold('🔊 Audio Output Detected!\n\n');
          audioSubtext = chalk.white('Your system has speakers. Choose your TTS engine:\n\n');
        }

        // Build recommendation message
        let recommendation = '';
        if (systemInfo.hasGPU && !systemInfo.isMacOS) {
          recommendation = chalk.yellow('💡 Recommendation: Soprano\n') +
                          chalk.gray('   Your GPU will run Soprano 2000x faster than CPU!\n') +
                          chalk.gray('   Perfect for high-volume TTS or real-time applications.\n\n');
        } else if (systemInfo.lowMemory && !systemInfo.isMacOS) {
          const ramGB = systemInfo.totalRAM / 1024;
          const ramDisplay = ramGB < 1
            ? `${systemInfo.totalRAM}MB`
            : `${Math.floor(ramGB)}GB`;
          recommendation = chalk.yellow('💡 Recommendation: Soprano\n') +
                          chalk.gray(`   Your system has limited RAM (${ramDisplay}).\n`) +
                          chalk.gray('   Soprano uses <1GB vs Piper\'s 2-3GB.\n\n');
        } else if (systemInfo.isMacOS) {
          recommendation = chalk.yellow('💡 Recommendation: macOS Say\n') +
                          chalk.gray('   Built-in, zero setup, 100+ voices included.\n') +
                          chalk.gray('   Best choice for macOS users.\n\n');
        } else {
          recommendation = chalk.yellow('💡 Recommendation: Piper\n') +
                          chalk.gray('   Most versatile: 50+ voices, 18+ languages.\n') +
                          chalk.gray('   Great for multi-language projects and variety.\n\n');
        }

        console.log(boxen(
          audioHeader +
          audioSubtext +
          recommendation +
          chalk.white('Available Providers:\n\n') +
          (systemInfo.isMacOS ? chalk.yellow('🍎 macOS Say\n') +
          chalk.gray('   • Built-in, zero setup, 100+ voices\n\n') : '') +
          chalk.magenta('⚡ Soprano TTS\n') +
          chalk.gray('   • Ultra-fast: 20x CPU, 2000x GPU\n') +
          chalk.gray('   • 1 premium English voice\n') +
          chalk.gray('   • <1GB memory footprint\n\n') +
          chalk.green('🆓 Piper TTS\n') +
          chalk.gray('   • 50+ voices, 18+ languages\n') +
          chalk.gray('   • Free & offline\n') +
          chalk.gray('   • Human-like speech quality'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'green',
            width: 80
          }
        ));
      }

      // Provider selection - Context-aware based on environment
      const providerChoices = [];

      // VOICELESS SERVER: Prioritize remote audio options
      if (environment === 'VOICELESS') {
        providerChoices.push({
          name: chalk.green('📱 AgentVibes Receiver (Text → SSH → Device)') + chalk.yellow(' (Recommended)'),
          value: 'termux-ssh',
          short: 'SSH-Remote'
        });
        providerChoices.push({
          name: chalk.blue('🔊 PulseAudio Tunnel (Audio → TCP → Speakers)'),
          value: 'ssh-pulseaudio',
          short: 'PulseAudio'
        });
        providerChoices.push({
          name: chalk.gray('🔇 Silent Mode (No TTS)'),
          value: 'silent',
          short: 'Silent'
        });
      }
      // PHONE/TERMUX: Receiver mode or local playback
      else if (environment === 'PHONE') {
        providerChoices.push({
          name: chalk.green('📱 Receiver Mode (Remote Server → This Phone)') + chalk.yellow(' (Recommended)'),
          value: 'piper-receiver',
          short: 'Receiver'
        });
        providerChoices.push({
          name: chalk.blue('🔊 Local Playback (This Device Only)'),
          value: 'piper',
          short: 'Local'
        });
      }
      // WINDOWS: Native Windows providers
      else if (isNativeWindows()) {
        providerChoices.push({
          name: chalk.green('🎵 Windows Piper TTS (Recommended)') + chalk.gray(' - High quality neural voices'),
          value: 'piper'
        });
        providerChoices.push({
          name: chalk.magenta('⚡ Soprano TTS') + chalk.gray(' - Ultra-fast neural, 1 premium voice'),
          value: 'soprano'
        });
        providerChoices.push({
          name: chalk.blue('🔊 Windows SAPI (Built-in)') + chalk.gray(' - Basic quality, zero setup'),
          value: 'sapi'
        });
      }
      // DESKTOP: Smart provider ordering
      else {
        // Reuse cached system info from earlier detection
        const systemInfo = systemInfoCache || await detectSystemCapabilities();

        // Smart ordering based on system capabilities
        if (systemInfo.hasGPU && !systemInfo.isMacOS) {
          // GPU detected: Soprano first
          providerChoices.push({
            name: chalk.magenta('⚡ Soprano TTS') + chalk.yellow(' (Recommended for your GPU)') +
                  chalk.gray(' - 2000x real-time'),
            value: 'soprano',
            short: 'Soprano'
          });
          providerChoices.push({
            name: chalk.green('🆓 Piper TTS') + chalk.gray(' - 50+ voices, 18+ languages'),
            value: 'piper',
            short: 'Piper'
          });
        } else if (systemInfo.lowMemory && !systemInfo.isMacOS) {
          // Low memory: Soprano first
          providerChoices.push({
            name: chalk.magenta('⚡ Soprano TTS') + chalk.yellow(' (Best for low memory)') +
                  chalk.gray(' - <1GB'),
            value: 'soprano',
            short: 'Soprano'
          });
          providerChoices.push({
            name: chalk.green('🆓 Piper TTS') + chalk.gray(' - 50+ voices (uses 2-3GB RAM)'),
            value: 'piper',
            short: 'Piper'
          });
        } else if (systemInfo.isMacOS) {
          // macOS: System voice first
          providerChoices.push({
            name: chalk.yellow('🍎 macOS Say') + chalk.yellow(' (Recommended)') +
                  chalk.gray(' - Zero setup, 100+ built-in voices'),
            value: 'macos',
            short: 'macOS Say'
          });
          providerChoices.push({
            name: chalk.magenta('⚡ Soprano TTS') + chalk.gray(' - Ultra-fast, 1 premium voice'),
            value: 'soprano',
            short: 'Soprano'
          });
          providerChoices.push({
            name: chalk.green('🆓 Piper TTS') + chalk.gray(' - 50+ voices, 18+ languages'),
            value: 'piper',
            short: 'Piper'
          });
        } else {
          // Standard: Piper first (most versatile)
          providerChoices.push({
            name: chalk.green('🆓 Piper TTS') + chalk.yellow(' (Recommended)') +
                  chalk.gray(' - 50+ voices, versatile'),
            value: 'piper',
            short: 'Piper'
          });
          providerChoices.push({
            name: chalk.magenta('⚡ Soprano TTS') + chalk.gray(' - Ultra-fast, 1 premium voice'),
            value: 'soprano',
            short: 'Soprano'
          });
        }
      }

      providerChoices.push(new inquirer.Separator());
      providerChoices.push({
        name: chalk.magentaBright('← Back to Welcome'),
        value: '__back__'
      });

      // Provider selection loop - allows user to try different providers without going back
      let providerSelected = false;
      while (!providerSelected) {
        const { provider } = await inquirer.prompt([{
          type: 'list',
          name: 'provider',
          message: chalk.yellow('Select TTS provider:'),
          choices: providerChoices,
          default: config.provider || (isMacOS ? 'macos' : 'piper')
        }]);

        // Check if user wants to go back to previous page
        if (provider === '__back__') {
          return null;
        }

        // Validate provider installation before accepting selection
        console.log(chalk.gray(`\n   Checking for ${getProviderDisplayName(provider)}...`));

        // Special handling for Soprano - check if running, auto-start if installed
        if (provider === 'soprano') {
          const sopranoInstalled = isSopranoInstalled();
          const sopranoRunning = await isSopranoRunning();

          if (sopranoInstalled && !sopranoRunning) {
            // Soprano installed but not running - offer to start it
            console.log(chalk.yellow('\n⚠️  Soprano TTS is installed but server is not running'));

            const { startAction } = await inquirer.prompt([{
              type: 'list',
              name: 'startAction',
              message: 'What would you like to do?',
              choices: [
                { name: chalk.green('Start Soprano server now (recommended)'), value: 'start' },
                { name: 'I\'ll start it myself', value: 'manual' },
                { name: 'Choose a different provider', value: 'back' }
              ]
            }]);

            if (startAction === 'start') {
              const started = await startSopranoServer();
              if (started) {
                config.provider = provider;
                providerSelected = true;
                continue;
              } else {
                console.log(chalk.yellow('\n⚠️  Failed to start Soprano automatically'));
                console.log(chalk.cyan('   Try starting manually:'));
                console.log(chalk.gray('   $ soprano-webui --port 7860\n'));
                continue;
              }
            } else if (startAction === 'manual') {
              console.log(chalk.cyan('\n📝 To start Soprano manually, run:'));
              console.log(chalk.gray('   $ soprano-webui --port 7860\n'));
              continue;
            } else {
              // User chose to go back
              continue;
            }
          } else if (sopranoInstalled && sopranoRunning) {
            // Soprano installed and running - all good!
            console.log(chalk.green('\n✓ Soprano TTS detected and running!\n'));
            config.provider = provider;
            providerSelected = true;
            continue;
          }
          // If not installed, fall through to normal validation below
        }

        const validation = await validateProvider(provider);

        if (!validation.installed) {
          const displayName = getProviderDisplayName(provider);
          console.log(chalk.yellow(`\n⚠️  ${validation.message}`));

          const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: chalk.green('Install now (recommended)'), value: 'install' },
              { name: 'Choose a different provider', value: 'back' },
              { name: 'I\'ll install it myself later', value: 'skip' }
            ]
          }]);

          if (action === 'install') {
            console.log(chalk.cyan(`\n📦 Installing ${displayName}...\n`));

            // Use smart installation with fallbacks
            const installResult = await attemptProviderInstallation(provider);

            if (installResult.success && installResult.verified) {
              // Installation succeeded AND verified
              console.log(chalk.green(`\n✓ ${displayName} installed and verified!\n`));
              console.log(chalk.gray(`   Method: ${installResult.command}`));
              console.log(chalk.green(`   Status: Ready to use\n`));
              config.provider = provider;
              providerSelected = true; // Exit provider selection loop
            } else if (installResult.success) {
              // Installation command ran but verification failed
              console.log(chalk.yellow(`\n⚠️  Installation command completed, but verification failed\n`));
              console.log(chalk.gray(`   The installation may have been blocked by system protection (PEP 668).\n`));
              console.log(chalk.cyan(`   Try one of these solutions:\n`));
              console.log(chalk.gray(`   1. Use pipx (avoids system protection):\n      pipx install soprano-tts\n`));
              console.log(chalk.gray(`   2. Create a virtual environment:\n      python3 -m venv ~/my-env\n      ~/my-env/bin/pip install soprano-tts\n`));

              // Pause before returning to provider selection
              await inquirer.prompt([{
                type: 'confirm',
                name: 'continue',
                message: 'Press Enter to try a different provider',
                default: true
              }]);

              // Loop back to provider selection
              continue;
            } else {
              console.log(chalk.red(`\n❌ ${installResult.message}\n`));

              // Pause before returning to provider selection
              await inquirer.prompt([{
                type: 'confirm',
                name: 'continue',
                message: 'Press Enter to try a different provider',
                default: true
              }]);

              // Loop back to provider selection
              continue;
            }
          } else if (action === 'back') {
            // Loop back to provider selection to choose a different one
            continue;
          } else if (action === 'skip') {
            console.log(chalk.yellow(`\n⚠️  No problem! You can set it up anytime with:\n   ${getProviderInstallCommand(provider)}\n`));
            config.provider = provider;
            providerSelected = true; // Exit provider selection loop
          }
        } else {
          // Provider detected and ready to use
          const displayName = getProviderDisplayName(provider);
          console.log(chalk.green(`\n✓ ${displayName} Detected and selected!\n`));
          config.provider = provider;
          providerSelected = true; // Exit provider selection loop

          // Auto-advance flag for navigation
          config._autoAdvance = true;
        }
      }

      // Handle special receiver mode for Termux
      if (config.provider === 'piper-receiver') {
        config.provider = getPiperProvider();
        config.isReceiver = true;
      }

      // Handle silent mode (voiceless servers that don't want audio)
      if (config.provider === 'silent') {
        // Silent mode uses piper but won't actually play audio
        config.provider = getPiperProvider();
        config.isSilent = true;
      }

      // If Piper selected, ask for voice storage location
      if (isPiperProvider(config.provider) || config.isReceiver) {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        const defaultPiperPath = path.join(homeDir, '.claude', 'piper-voices');

        // Check if voices already exist
        const existingVoices = await checkExistingPiperVoices(defaultPiperPath);

        if (!existingVoices.installed) {
          console.log('\n' + boxen(
            chalk.white('Piper voice models are ~25MB each.\n') +
            chalk.white('They can be stored globally to be shared\n') +
            chalk.white('across all your projects, or locally per project.'),
            {
              padding: 1,
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              borderStyle: 'round',
              borderColor: 'gray',
              width: 80
            }
          ));

          const { piperPath } = await inquirer.prompt([{
            type: 'input',
            name: 'piperPath',
            message: chalk.yellow('Where should Piper voice models be downloaded?'),
            default: config.piperPath || defaultPiperPath,
            validate: (input) => {
              if (!input || input.trim() === '') {
                return 'Please provide a valid path';
              }
              return true;
            }
          }]);

          config.piperPath = piperPath;
        } else {
          config.piperPath = defaultPiperPath;
        }
      }

      // If SSH-Remote selected, show setup guide (NOT PulseAudio!)
      if (config.provider === 'termux-ssh' || config.provider === 'ssh-remote') {
        console.log('\n' + boxen(
          chalk.cyan.bold('📱 AgentVibes Receiver Setup\n\n') +
          chalk.white('What is Receiver Mode?\n') +
          chalk.gray('This voiceless server has no speakers. Receiver mode lets you\n') +
          chalk.gray('hear TTS audio on a different device (phone/tablet) with speakers.\n\n') +
          chalk.white('How it Works:\n') +
          chalk.gray('1. This server sends TEXT via SSH to your device\n') +
          chalk.gray('2. Your device generates audio locally with AgentVibes\n') +
          chalk.gray('3. You hear high-quality TTS with full voice effects\n\n') +
          chalk.white('Benefits:\n') +
          chalk.green('✓ Low bandwidth (text only, not audio files)\n') +
          chalk.green('✓ Full AgentVibes features on your device\n') +
          chalk.green('✓ Secure (SSH encrypted)\n') +
          chalk.green('✓ Works anywhere with Tailscale\n\n') +
          chalk.gray('─'.repeat(60) + '\n\n') +
          chalk.white('Quick Setup (5 minutes):\n\n') +
          chalk.gray('☐ 1. Install AgentVibes on target device\n') +
          chalk.white('     npm install -g agentvibes\n\n') +
          chalk.gray('☐ 2. Configure SSH access\n') +
          chalk.white('     • Copy SSH key: ssh-copy-id user@device\n') +
          chalk.white('     • OR: Use Tailscale for zero-config networking\n\n') +
          chalk.gray('☐ 3. Set receiver hostname\n') +
          chalk.white('     echo "your-device-name" > ~/.claude/ssh-remote-host.txt\n\n') +
          chalk.gray('☐ 4. Test the connection\n') +
          chalk.white('     agentvibes tts "Hello from server!"\n\n') +
          chalk.cyan('📖 Full guide: ') + chalk.blue('https://github.com/paulpreibisch/AgentVibes/blob/main/docs/SSH_REMOTE_SETUP.md'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'cyan',
            width: 80
          }
        ));

        const { configureNow } = await inquirer.prompt([{
          type: 'confirm',
          name: 'configureNow',
          message: chalk.yellow('Configure SSH host alias now?'),
          default: false
        }]);

        if (configureNow) {
          const { sshHost } = await inquirer.prompt([{
            type: 'input',
            name: 'sshHost',
            message: chalk.yellow('Enter your SSH host alias (e.g., "android", "phone"):'),
            validate: (input) => {
              if (!input || input.trim() === '') {
                return 'Please provide a valid SSH host alias';
              }
              // Security: Basic validation - no spaces, no special chars that could cause issues
              if (!/^[a-zA-Z0-9_-]+$/.test(input.trim())) {
                return 'SSH host alias should only contain letters, numbers, dashes, and underscores';
              }
              return true;
            }
          }]);

          config.sshHost = sshHost.trim();
        } else {
          console.log(chalk.yellow('\n⚠️  SSH host not configured - you can set it later:'));
          console.log(chalk.gray('   echo "your-host-alias" > ~/.claude/ssh-remote-host.txt\n'));
        }
      }

      // If PulseAudio selected, show different setup (BUG FIX!)
      if (config.provider === 'ssh-pulseaudio' || config.provider === 'pulseaudio') {
        console.log('\n' + boxen(
          chalk.blue.bold('🔊 PulseAudio Tunnel Setup\n\n') +
          chalk.white('What is PulseAudio Tunnel?\n') +
          chalk.gray('Server generates audio and streams it via TCP to your speakers.\n\n') +
          chalk.white('How it Works:\n') +
          chalk.gray('1. Server: Generates TTS audio (Piper/Soprano/macOS Say)\n') +
          chalk.gray('2. Server: Streams AUDIO via TCP tunnel (port 14713)\n') +
          chalk.gray('3. Your device: PulseAudio receives and plays audio\n\n') +
          chalk.white('Requirements:\n') +
          chalk.yellow('⚠️  PulseAudio must be installed on BOTH devices\n') +
          chalk.yellow('⚠️  SSH tunnel or network route to port 14713\n\n') +
          chalk.white('Manual Setup Required:\n') +
          chalk.gray('On Server:\n') +
          chalk.white('  export PULSE_SERVER=tcp:localhost:14713\n') +
          chalk.white('  (Add to ~/.bashrc for persistence)\n\n') +
          chalk.gray('On Your Local Machine:\n') +
          chalk.white('  ssh -R 14713:localhost:4713 your-server\n\n') +
          chalk.cyan('📖 Full guide: ') + chalk.blue('docs/remote-audio-setup.md\n\n') +
          chalk.yellow('💡 Tip: ') + chalk.gray('PulseAudio works best on local networks.\n') +
          chalk.gray('   For mobile/remote, consider SSH-Remote instead.'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'blue',
            width: 80
          }
        ));
        console.log('');
      }

    } else if (currentPage === 2) {
      // Page 3: Voice Selection
      // Provider-aware voice selection introduction
      let voiceIntroMessage = '';
      if (config.provider === 'soprano') {
        voiceIntroMessage = chalk.white('Soprano Voice Configuration\n\n') +
                           chalk.gray('Soprano has a single premium neural voice.\n') +
                           chalk.gray('Voice details and specifications shown below.');
      } else if (isPiperProvider(config.provider)) {
        voiceIntroMessage = chalk.white('Choose a default voice for your AgentVibes.\n\n') +
                           chalk.gray('Piper offers 50+ voices in 18+ languages.\n') +
                           chalk.gray('You can change this anytime with: ') + chalk.cyan('/agent-vibes:voice switch <name>');
      } else if (config.provider === 'macos') {
        voiceIntroMessage = chalk.white('Choose a default voice for your AgentVibes.\n\n') +
                           chalk.gray('macOS includes 100+ built-in voices.\n') +
                           chalk.gray('You can change this anytime with: ') + chalk.cyan('/agent-vibes:voice switch <name>');
      } else {
        voiceIntroMessage = chalk.white('Choose a default voice for your AgentVibes.\n\n') +
                           chalk.gray('This will be used when no specific voice is configured.\n') +
                           chalk.gray('You can change this anytime with: ') + chalk.cyan('/agent-vibes:voice switch <name>');
      }

      console.log(boxen(
        voiceIntroMessage,
        {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'gray',
          width: 80
        }
      ));

      if (isPiperProvider(config.provider)) {
        // Check if Piper is installed for voice previews
        const piperAvailable = isPiperInstalled();

        // Load voice metadata for friendly names
        let voiceMetadata;
        try {
          const metadataPath = path.join(__dirname, '..', '.agentvibes', 'config', 'voice-metadata.json');
          voiceMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        } catch (e) {
          voiceMetadata = null;
        }

        // Build voice choices
        const previewHint = piperAvailable ? ' ' + chalk.gray('[SPACE to preview]') : '';
        let piperVoices;

        if (voiceMetadata && voiceMetadata.installerVoices) {
          // Use voice metadata system - all 10 voices with friendly names
          piperVoices = voiceMetadata.installerVoices.map(friendlyName => {
            const voice = voiceMetadata.voices[friendlyName];
            const isMale = voice.gender === 'male';
            const color = isMale ? chalk.cyan : chalk.hex('#FF69B4'); // Lighter pink for females

            return {
              name: color(voice.displayName) + chalk.gray(` (${voice.gender}, ${voice.accent}, ${voice.quality})`) + previewHint,
              value: friendlyName  // Store friendly name
            };
          });
        } else {
          // Fallback to old hardcoded list
          piperVoices = [
            { name: chalk.cyan('en_US-ryan-high') + chalk.gray(' (Male, American, High Quality)') + previewHint, value: 'en_US-ryan-high' },
            { name: chalk.magenta('en_US-amy-medium') + chalk.gray(' (Female, American, Clear)') + previewHint, value: 'en_US-amy-medium' },
            { name: chalk.cyan('en_US-joe-medium') + chalk.gray(' (Male, American, Warm)') + previewHint, value: 'en_US-joe-medium' },
            { name: chalk.magenta('en_US-lessac-medium') + chalk.gray(' (Female, American, Professional)') + previewHint, value: 'en_US-lessac-medium' },
            { name: chalk.cyan('en_GB-alan-medium') + chalk.gray(' (Male, British, Refined)') + previewHint, value: 'en_GB-alan-medium' },
            { name: chalk.magenta('en_GB-southern_english_female-medium') + chalk.gray(' (Female, British)') + previewHint, value: 'en_GB-southern_english_female-medium' }
          ];
        }

        piperVoices.push(
          new inquirer.Separator(),
          { name: chalk.yellow('Skip - I\'ll set this later'), value: '__skip__' },
          { name: chalk.magentaBright('← Back to Provider Selection'), value: '__back__' }
        );

        let selectedVoice;
        if (piperAvailable) {
          const result = await createPreviewListPrompt(inquirer, {
            name: 'selectedVoice',
            message: chalk.yellow('Select your default Piper voice:'),
            choices: piperVoices,
            default: 'en_US-ryan-high',
            pageSize: 12,
            onPreview: async (voiceName) => {
              await playVoiceSample(voiceName, 'piper');
            }
          });
          selectedVoice = result.selectedVoice;
        } else {
          const result = await inquirer.prompt([{
            type: 'list',
            name: 'selectedVoice',
            message: chalk.yellow('Select your default Piper voice:'),
            choices: piperVoices,
            default: 'en_US-ryan-high',
            pageSize: 12
          }]);
          selectedVoice = result.selectedVoice;
        }

        if (selectedVoice === '__back__') {
          return null;
        }

        if (selectedVoice !== '__skip__') {
          // Convert friendly name to Piper ID if using metadata
          if (voiceMetadata && voiceMetadata.voices[selectedVoice]) {
            config.defaultVoice = voiceMetadata.voices[selectedVoice].id;
            console.log(chalk.green(`\n✓ Voice selected: ${voiceMetadata.voices[selectedVoice].displayName} (${config.defaultVoice})\n`));
          } else {
            config.defaultVoice = selectedVoice;
            console.log(chalk.green(`\n✓ Voice selected: ${selectedVoice}\n`));
          }

          // Show hint about voice browser
          console.log(boxen(
            chalk.cyan('💡 Want to explore 914+ voices?\n\n') +
            chalk.white('Run: ') + chalk.yellow('npx agentvibes-voice-browser') + chalk.gray('\n\nBrowse all LibriTTS voices with preview, search, and install.'),
            {
              padding: { top: 0, bottom: 0, left: 1, right: 1 },
              margin: { top: 0, bottom: 1, left: 0, right: 0 },
              borderStyle: 'round',
              borderColor: 'cyan',
              dimBorder: true
            }
          ));

          // Auto-advance to next page after selection
          currentPage++; // Skip to next page immediately
          continue; // Skip navigation and go to next iteration
        } else {
          // User skipped - advance anyway
          console.log(chalk.yellow('\n⊘ Voice selection skipped\n'));
          currentPage++;
          continue;
        }

      } else if (config.provider === 'macos') {
        // macOS Say voices - popular selections
        const macOSVoices = [
          { name: chalk.cyan('Samantha') + chalk.gray(' (Female, American)'), value: 'Samantha' },
          { name: chalk.cyan('Alex') + chalk.gray(' (Male, American)'), value: 'Alex' },
          { name: chalk.magenta('Flo') + chalk.gray(' (Female, American, Expressive)'), value: 'Flo' },
          { name: chalk.cyan('Tom') + chalk.gray(' (Male, American)'), value: 'Tom' },
          { name: chalk.magenta('Karen') + chalk.gray(' (Female, Australian)'), value: 'Karen' },
          { name: chalk.cyan('Daniel') + chalk.gray(' (Male, British)'), value: 'Daniel' },
          new inquirer.Separator(),
          { name: chalk.yellow('Skip - I\'ll set this later'), value: '__skip__' },
          { name: chalk.magentaBright('← Back to Provider Selection'), value: '__back__' }
        ];

        const { selectedVoice } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedVoice',
          message: chalk.yellow('Select your default macOS voice:'),
          choices: macOSVoices,
          default: 'Samantha',
          pageSize: 12
        }]);

        if (selectedVoice === '__back__') {
          return null;
        }

        if (selectedVoice !== '__skip__') {
          // macOS voices use their name directly (no piper metadata conversion needed)
          config.defaultVoice = selectedVoice;
          console.log(chalk.green(`\n✓ Voice selected: ${selectedVoice}\n`));

          // Show hint about voice browser
          console.log(boxen(
            chalk.cyan('💡 Want to explore 914+ voices?\n\n') +
            chalk.white('Run: ') + chalk.yellow('npx agentvibes-voice-browser') + chalk.gray('\n\nBrowse all LibriTTS voices with preview, search, and install.'),
            {
              padding: { top: 0, bottom: 0, left: 1, right: 1 },
              margin: { top: 0, bottom: 1, left: 0, right: 0 },
              borderStyle: 'round',
              borderColor: 'cyan',
              dimBorder: true
            }
          ));

          // Auto-advance to next page after selection
          currentPage++; // Skip to next page immediately
          continue; // Skip navigation and go to next iteration
        } else {
          // User skipped - advance anyway
          console.log(chalk.yellow('\n⊘ Voice selection skipped\n'));
          currentPage++;
          continue;
        }

      } else if (config.provider === 'soprano') {
        // Soprano TTS - single voice model
        console.log(boxen(
          chalk.magenta.bold('⚡ Soprano TTS Voice\n\n') +
          chalk.white('Soprano is a single-speaker neural TTS model.\n\n') +
          chalk.cyan('Voice Details:\n') +
          chalk.gray('   • Model: ') + chalk.white('Soprano-1.1-80M\n') +
          chalk.gray('   • Language: ') + chalk.white('English (en_US)\n') +
          chalk.gray('   • Gender: ') + chalk.white('Female\n') +
          chalk.gray('   • Quality: ') + chalk.white('Premium neural voice\n') +
          chalk.gray('   • Speed: ') + chalk.white('20x CPU, 2000x GPU (if available)\n\n') +
          chalk.yellow('💡 ') + chalk.white('Only one voice available - automatically selected.\n') +
          chalk.gray('   For multiple voices, consider switching to Piper (50+ voices).'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'magenta',
            width: 80
          }
        ));

        // Auto-set the single Soprano voice
        config.defaultVoice = 'soprano-default';
        console.log(chalk.green('\n✓ Voice: Soprano-1.1-80M (auto-selected)\n'));

        // Auto-advance to next page
        currentPage++;
        continue;

      } else if (config.provider === 'sapi' || config.provider === 'windows-sapi') {
        const sapiVoices = [
          { name: chalk.cyan('Microsoft David Desktop') + chalk.gray(' (Male, American)'), value: 'Microsoft David Desktop' },
          { name: chalk.magenta('Microsoft Zira Desktop') + chalk.gray(' (Female, American)'), value: 'Microsoft Zira Desktop' },
          { name: chalk.cyan('Microsoft Mark Desktop') + chalk.gray(' (Male, American)'), value: 'Microsoft Mark Desktop' },
          new inquirer.Separator(),
          { name: chalk.yellow('Skip - I\'ll set this later'), value: '__skip__' },
          { name: chalk.magentaBright('← Back to Provider Selection'), value: '__back__' }
        ];
        const { selectedVoice } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedVoice',
          message: chalk.yellow('Select your default Windows SAPI voice:'),
          choices: sapiVoices,
          default: 'Microsoft David Desktop',
          pageSize: 10
        }]);
        if (selectedVoice === '__back__') {
          return null;
        }
        if (selectedVoice !== '__skip__') {
          config.defaultVoice = selectedVoice;
          console.log(chalk.green(`\n✓ Voice selected: ${selectedVoice}\n`));
          currentPage++;
          continue;
        } else {
          console.log(chalk.yellow('\n⊘ Voice selection skipped\n'));
          currentPage++;
          continue;
        }

      } else if (config.provider === 'termux-ssh' || config.provider === 'ssh-pulseaudio') {
        // Termux SSH - voices are managed on Android device
        console.log(boxen(
          chalk.white('Android TTS voices are managed on your Android device.\n\n') +
          chalk.gray('To configure voices:\n') +
          chalk.gray('   1. Open Android ') + chalk.cyan('Settings → Accessibility → Text-to-Speech\n') +
          chalk.gray('   2. Install voice engines from Play Store (e.g., Google TTS)\n') +
          chalk.gray('   3. Select your preferred engine and voice\n\n') +
          chalk.yellow('AgentVibes will use your Android\'s selected TTS voice automatically.'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'blue',
            width: 80
          }
        ));

        console.log(chalk.green('\n✓ Android TTS will use device-configured voice\n'));

        // Auto-advance to next page
        currentPage++;
        continue;
      }

    } else if (currentPage === 3) {
      // Page 4: Pretext and Personality Selection
      console.log(boxen(
        chalk.white('Customize your Agent\'s introduction!\n\n') +
        chalk.gray('Add optional intro text that prefixes all TTS messages.\n') +
        chalk.gray('Examples: "FireBot: ", "Agent: ", "🤖 Assistant: "\n\n') +
        chalk.gray('You can change this anytime with: ') + chalk.cyan('/agent-vibes:set-pretext <text>'),
        {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'gray',
          width: 80
        }
      ));

      // Pretext input with validation
      let pretextValid = false;
      let pretext = config.pretext || '';

      while (!pretextValid) {
        const { pretextInput } = await inquirer.prompt([{
          type: 'input',
          name: 'pretextInput',
          message: chalk.yellow('Enter intro text (optional, max 50 chars):'),
          default: pretext,
          // Live character count display in prompt
          prefix: `${chalk.cyan('[Intro Text]')}`,
          validate: (input) => {
            // Trim first for consistent length checking
            const trimmed = input.trim();
            // Check for newlines
            if (input.includes('\n') || input.includes('\r')) {
              return chalk.red('Error: Newlines not allowed');
            }
            // Check length after trimming for consistency with display
            if (trimmed.length > 50) {
              return chalk.red(`Too long: ${trimmed.length}/50 characters`);
            }
            return true;
          },
          filter: (input) => {
            // Trim and treat whitespace-only as empty
            const trimmed = input.trim();
            return trimmed;
          }
        }]);

        pretext = pretextInput;

        // Display preview
        if (pretext) {
          console.log(chalk.yellow(`\nCharacter count: ${pretext.length}/50`));
          console.log(chalk.cyan(`Preview: "${pretext}" This is how it will sound\n`));
          console.log(chalk.green(`✓ Intro text set: "${pretext}"\n`));
        } else {
          console.log(chalk.gray('→ No intro text (messages will speak normally)\n'));
        }

        config.pretext = pretext;
        pretextValid = true;
      }

      // Page 5: Personality Selection
      console.log(boxen(
        chalk.white('Give your Agent a personality!\n\n') +
        chalk.gray('Personalities add character and style to TTS responses.\n') +
        chalk.gray('Examples: sarcastic, pirate, zen, professional, etc.\n\n') +
        chalk.yellow('Default: ') + chalk.cyan('none') + chalk.gray(' (professional, no character)\n\n') +
        chalk.gray('You can change this anytime with: ') + chalk.cyan('/agent-vibes:personality <style>'),
        {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'gray',
          width: 80
        }
      ));

      // Build personality choices from .claude/personalities directory
      const personalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
      let personalityChoices = [];

      // Story 2.3 & 2.4: Check emoji support once, pass to all personality icons (performance fix)
      const emojiSupported = supportsEmoji();

      try {
        const personalityFiles = await fs.readdir(personalitiesDir);
        const personalities = [];

        for (const file of personalityFiles) {
          if (file.endsWith('.md')) {
            const personalityName = file.replace('.md', '');
            const filePath = path.join(personalitiesDir, file);
            const content = await fs.readFile(filePath, 'utf-8');

            // Extract description from frontmatter
            const descMatch = content.match(/^description:\s*(.+)$/m);
            const description = descMatch ? descMatch[1].trim() : '';

            personalities.push({
              name: personalityName,
              description: description
            });
          }
        }

        // Sort alphabetically
        personalities.sort((a, b) => a.name.localeCompare(b.name));

        // Add "none" as first option (default)
        const noneIcon = getPersonalityIcon('none', emojiSupported);
        personalityChoices.push(
          { name: noneIcon + ' ' + chalk.green('none') + chalk.gray(' (Professional, no personality) - Recommended'), value: 'none' },
          new inquirer.Separator(chalk.gray('─'.repeat(60)))
        );

        // Add all other personalities
        for (const p of personalities) {
          if (p.name !== 'normal') { // Skip 'normal' as it's similar to 'none'
            const icon = getPersonalityIcon(p.name, emojiSupported);
            personalityChoices.push({
              name: icon + ' ' + chalk.cyan(p.name) + chalk.gray(` - ${p.description}`),
              value: p.name
            });
          }
        }

        personalityChoices.push(
          new inquirer.Separator(),
          { name: chalk.magentaBright('← Back to Voice Selection'), value: '__back__' }
        );

      } catch (error) {
        // Fallback if personalities directory not found
        personalityChoices = [
          { name: chalk.green('none') + chalk.gray(' (Professional, no personality)'), value: 'none' },
          { name: chalk.magentaBright('← Back to Voice Selection'), value: '__back__' }
        ];
      }

      // Story 2.3 & 2.4: Show emoji support status in help text (reuse emojiSupported from above)
      const emojiNote = emojiSupported
        ? chalk.gray('(Emoji icons shown for visual recognition)')
        : chalk.gray('(Text labels shown - emoji not supported in this terminal)');

      // Use search prompt for keyboard navigation (type to filter)
      const selectedPersonality = await search({
        message: chalk.yellow('Select your default personality (type to search):') + ' ' + emojiNote,
        source: async (input) => {
          // Filter personalityChoices based on input
          if (!input) {
            return personalityChoices;
          }
          return personalityChoices.filter(choice => {
            // Check if choice is a Separator, if so skip it
            if (!choice.value) return false;
            return choice.value.toLowerCase().includes(input.toLowerCase()) ||
                   (choice.name && choice.name.toLowerCase().includes(input.toLowerCase()));
          });
        },
        pageSize: 15
      });

      if (selectedPersonality === '__back__') {
        currentPage--; // Go back to voice selection
        continue;
      }

      config.personality = selectedPersonality;

      if (selectedPersonality === 'none') {
        console.log(chalk.green('\n✓ No personality - professional mode\n'));
      } else {
        console.log(chalk.green(`\n✓ Personality selected: ${selectedPersonality}\n`));
      }

      // Auto-advance to next page
      currentPage++;
      continue;

    } else if (currentPage === 4) {
      // Page 5: Audio Settings (Reverb + Background Music)
      // Skip for termux-ssh - audio effects/background music don't work with SSH text-only TTS
      if (config.provider === 'termux-ssh') {
        console.log(boxen(
          chalk.white('SSH-Remote: Android Local Generation\n\n') +
          chalk.green('✅ Full feature support:\n') +
          chalk.gray('   • Sends TEXT to Android (low bandwidth)\n') +
          chalk.gray('   • AgentVibes generates audio locally on Android\n') +
          chalk.gray('   • All reverb and background music effects work\n\n') +
          chalk.yellow('⚠️  Requires:\n') +
          chalk.gray('   • AgentVibes installed in Termux on Android\n') +
          chalk.gray('   • SSH access to Android device\n\n') +
          chalk.cyan('Configure audio effects below - they will apply on your Android device!'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'green',
            width: 80
          }
        ));
        console.log('');
      } else if (config.provider === 'ssh-pulseaudio') {
        console.log(boxen(
          chalk.white('SSH-Remote: Server Generation + PulseAudio\n\n') +
          chalk.green('✅ Full feature support:\n') +
          chalk.gray('   • Server generates audio with Piper\n') +
          chalk.gray('   • Sends AUDIO via SSH tunnel to PulseAudio\n') +
          chalk.gray('   • All reverb and background music effects work\n\n') +
          chalk.yellow('⚠️  Requires:\n') +
          chalk.gray('   • PulseAudio on remote machine\n') +
          chalk.gray('   • SSH tunnel configured (port 14713)\n') +
          chalk.gray('   • See: docs/remote-audio-setup.md\n\n') +
          chalk.cyan('Configure audio effects below - they will apply on the server!'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'blue',
            width: 80
          }
        ));
        console.log('');
      }

      console.log(boxen(
        chalk.white('Configure audio effects and background music for your Agents.\n\n') +
        chalk.yellow('Reverb:\n') +
        chalk.gray('   • 💧 Reverb adds room ambiance to TTS audio, making voices sound more natural\n') +
        chalk.gray('   • Change anytime: ') + chalk.cyan('/agent-vibes:effects reverb off/light/medium/heavy/cathedral\n\n') +
        chalk.yellow('Background Music:\n') +
        chalk.gray('   • Optional ambient music during TTS\n') +
        chalk.gray('   • 16 genre choices from Flamenco to City Pop\n') +
        chalk.gray('   • Toggle: ') + chalk.cyan('/agent-vibes:background-music on/off\n') +
        chalk.gray('   • Change track: ') + chalk.cyan('/agent-vibes:background-music set chillwave'),
        {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'gray',
          width: 80
        }
      ));

      const { reverbLevel } = await inquirer.prompt([{
        type: 'list',
        name: 'reverbLevel',
        message: chalk.yellow('Select default reverb level:'),
        choices: [
          { name: 'Off (Dry, no reverb)', value: 'off' },
          { name: 'Light (Small room) - Recommended', value: 'light' },
          { name: 'Medium (Conference room)', value: 'medium' },
          { name: 'Heavy (Large hall)', value: 'heavy' },
          { name: 'Cathedral (Epic space)', value: 'cathedral' },
          new inquirer.Separator(),
          { name: chalk.magentaBright('← Previous'), value: '__back__' }
        ],
        default: config.reverb || 'light'
      }]);

      if (reverbLevel === '__back__') {
        currentPage--;
        continue;
      }

      config.reverb = reverbLevel;

      console.log(chalk.green('\n✓ Reverb level set\n'));
      currentPage++;
      continue;

    } else if (currentPage === 5) {
      // Page 6: Background Music Settings

      // Skip for termux-ssh - background music doesn't work with SSH text-only TTS
      if (config.provider === 'termux-ssh' || config.provider === 'ssh-pulseaudio') {
        console.log(boxen(
          chalk.white('SSH-Remote: Audio Effects Apply on Android\n\n') +
          chalk.green('✅ Background music works:\n') +
          chalk.gray('   • Music plays on Android device\n') +
          chalk.gray('   • All settings configured below will apply\n\n') +
          chalk.cyan('Configure background music below!'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'green',
            width: 80
          }
        ));
        console.log('');
      }

      // Background music
      console.log(chalk.gray('🎵 Background music plays ambient tracks during TTS for a more engaging experience.'));

      const { enableMusic } = await inquirer.prompt([{
        type: 'confirm',
        name: 'enableMusic',
        message: chalk.yellow('Enable background music for TTS?'),
        default: config.backgroundMusic.enabled !== undefined ? config.backgroundMusic.enabled : true
      }]);

      config.backgroundMusic.enabled = enableMusic;

      if (enableMusic) {
        // Check if ffmpeg is available; offer to install if not
        const { execSync: _execSync } = await import('child_process');
        const _osPlatform = process.platform;
        let _hasFfmpeg = false;
        try {
          if (_osPlatform === 'win32') {
            _execSync('where ffmpeg', { stdio: 'pipe' });
          } else {
            _execSync('which ffmpeg', { stdio: 'pipe' });
          }
          _hasFfmpeg = true;
        } catch {}

        if (!_hasFfmpeg) {
          console.log('');
          console.log(chalk.yellow('⚠️  ffmpeg not found — required for background music mixing.'));
          console.log(chalk.gray('   ffmpeg mixes background music with TTS voice output.\n'));

          let _installCmd;
          if (_osPlatform === 'win32') {
            _installCmd = 'winget install --id Gyan.FFmpeg -e --source winget';
          } else if (_osPlatform === 'darwin') {
            _installCmd = 'brew install ffmpeg';
          } else {
            // Prefer pkexec (GUI password dialog) when available — works in
            // environments where sudo lacks a tty (e.g., AI assistant terminals).
            // Fall back to sudo for headless/SSH setups.
            let _hasPkexec = false;
            try { _execSync('which pkexec', { stdio: 'pipe' }); _hasPkexec = true; } catch {}
            _installCmd = _hasPkexec
              ? 'pkexec apt-get install -y ffmpeg'
              : 'sudo apt-get install -y ffmpeg';
          }

          if (!options.yes) {
            const { installFfmpeg } = await inquirer.prompt([{
              type: 'confirm',
              name: 'installFfmpeg',
              message: chalk.yellow(`Install ffmpeg now? (${_installCmd})`),
              default: true,
            }]);
            if (installFfmpeg) {
              try {
                console.log(chalk.cyan(`\n📦 Running: ${_installCmd}\n`));
                const { execSync: _exec } = await import('child_process');
                _exec(_installCmd, { stdio: 'inherit', timeout: 300000 });
                console.log(chalk.green('\n✅ ffmpeg installed successfully!\n'));
              } catch {
                console.log(chalk.yellow('\n⚠️  ffmpeg installation failed. You can install it manually:'));
                console.log(chalk.cyan(`   ${_installCmd}\n`));
              }
            } else {
              console.log(chalk.gray(`   Install later with: ${_installCmd}\n`));
            }
          }
        }

        // Check for sox — required to mix background music into TTS audio
        let _hasSox = false;
        try { _execSync('which sox', { stdio: 'pipe' }); _hasSox = true; } catch {}
        if (!_hasSox) {
          console.log('');
          console.log(chalk.yellow('⚠️  sox not found — required to mix background music into voice audio.'));
          console.log(chalk.gray('   Without sox, you\'ll hear voice only, no background music.\n'));

          const _osPlatform2 = process.platform;
          let _soxCmd;
          if (_osPlatform2 === 'darwin') {
            _soxCmd = 'brew install sox';
          } else {
            let _hasPkexec2 = false;
            try { _execSync('which pkexec', { stdio: 'pipe' }); _hasPkexec2 = true; } catch {}
            _soxCmd = _hasPkexec2
              ? 'pkexec apt-get install -y sox libsox-fmt-mp3'
              : 'sudo apt-get install -y sox libsox-fmt-mp3';
          }

          if (!options.yes) {
            const { installSox } = await inquirer.prompt([{
              type: 'confirm',
              name: 'installSox',
              message: chalk.yellow(`Install sox now? (${_soxCmd})`),
              default: true,
            }]);
            if (installSox) {
              try {
                console.log(chalk.cyan(`\n📦 Running: ${_soxCmd}\n`));
                _execSync(_soxCmd, { stdio: 'inherit', timeout: 120000 });
                console.log(chalk.green('\n✅ sox installed successfully!\n'));
              } catch {
                console.log(chalk.yellow('\n⚠️  sox installation failed. You can install it manually:'));
                console.log(chalk.cyan(`   ${_soxCmd}\n`));
              }
            } else {
              console.log(chalk.gray(`   Install later with: ${_soxCmd}\n`));
            }
          }
        }

        // Add spacing before track selection
        console.log('');
        console.log(chalk.gray('🎼 Choose your default background music genre (you can change this anytime).'));

        // Load custom tracks from registry
        const customTracks = await loadCustomTracks();
        const customTrackChoices = customTracks.map(track => ({
          name: `📁 ${track.name} ` + chalk.gray('[SPACE to preview]'),
          value: track.filename
        }));

        const trackChoices = [
          { name: '🎻 Soft Flamenco (Spanish guitar) ' + chalk.gray('[SPACE to preview]'), value: 'agentvibes_soft_flamenco_loop.mp3' },
          { name: '🎺 Bachata (Latin - Romantic guitar & bongos) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_bachata_v1_loop.mp3' },
          { name: '💃 Salsa (Latin - Upbeat brass & percussion) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_salsa_v2_loop.mp3' },
          { name: '🎸 Cumbia (Latin - Accordion & drums) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_cumbia_v1_loop.mp3' },
          { name: '🌸 Bossa Nova (Brazilian jazz) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_bossa_nova_v2_loop.mp3' },
          { name: '🏙️  Japanese City Pop (80s synth) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_japanese_city_pop_v1_loop.mp3' },
          { name: '🌊 Chillwave (Electronic ambient) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_chillwave_v2_loop.mp3' },
          { name: '🌙 Dark Chill Step (Electronic bass) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_dark_chill_step_loop.mp3' },
          { name: '🕉️  Goa Trance (Psychedelic electronic) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_goa_trance_v2_loop.mp3' },
          { name: '🎼 Harpsichord (Baroque classical) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_harpsichord_v2_loop.mp3' },
          { name: '🎻 Celtic Harp (Irish traditional) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_celtic_harp_v1_loop.mp3' },
          { name: '🌺 Hawaiian Slack Key Guitar ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3' },
          { name: '🏜️  Arabic Oud (Middle Eastern) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_arabic_v2_loop.mp3' },
          { name: '🪘 Gnawa Ambient (North African) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_ganawa_ambient_v2_loop.mp3' },
          { name: '🥁 Tabla Dream Pop (Indian percussion) ' + chalk.gray('[SPACE to preview]'), value: 'agent_vibes_tabla_dream_pop_v1_loop.mp3' },
          { name: '🎤 Late Night Hip Hop Groove ' + chalk.gray('[SPACE to preview]'), value: 'Late Night Hip Hop Groove.mp3' },
          { name: '🌃 Drifting Down the Hall (90s Vibes) ' + chalk.gray('[SPACE to preview]'), value: 'Drifting Down the Hall.mp3' },
          { name: '🎩 Midnight Charleston Stomp (Swing) ' + chalk.gray('[SPACE to preview]'), value: 'Midnight Charleston Stomp.mp3' }
        ];

        // Add custom tracks separator and options if any exist
        if (customTrackChoices.length > 0) {
          trackChoices.push(
            new inquirer.Separator(chalk.gray('─'.repeat(50))),
            ...customTrackChoices
          );
        }

        // Add custom track option
        trackChoices.push(
          new inquirer.Separator(chalk.gray('─'.repeat(50))),
          { name: '➕ Add Custom Track...', value: '__custom__' }
        );

        // Interactive track selection - Enter=Select, Spacebar=Preview
        const tracksDir = path.join(__dirname, '..', '.claude', 'audio', 'tracks');

        const result = await createPreviewListPrompt(inquirer, {
          name: 'selectedTrack',
          message: chalk.yellow('Choose background music:'),
          choices: trackChoices,
          default: config.backgroundMusic.track || 'agentvibes_soft_flamenco_loop.mp3',
          pageSize: 18,
          loop: false,
          onPreview: async (trackFile) => {
            console.log(chalk.cyan('\n  🔊 Playing preview...\n'));
            await previewAudioTrack(trackFile, tracksDir);
          }
        });
        const selectedTrack = result.selectedTrack;

        // Handle custom track selection
        if (selectedTrack === '__custom__') {
          console.log('');
          const result = await promptForCustomMusic(claudeDir);

          if (result.success && result.filename) {
            config.backgroundMusic.track = result.filename;

            // Update registry
            const allCustomTracks = await loadCustomTracks();
            if (!allCustomTracks.some(t => t.filename === result.filename)) {
              const trackName = path.basename(result.filename, path.extname(result.filename));
              allCustomTracks.push({ name: trackName, filename: result.filename });
              await saveCustomTracks(allCustomTracks);
            }
          } else {
            // Fallback to default
            config.backgroundMusic.track = 'agentvibes_soft_flamenco_loop.mp3';
            if (result.error) {
              console.log(chalk.yellow(`⚠️  ${result.error}`));
            }
            console.log(chalk.yellow('⚠️  Using default track'));
          }
        } else {
          config.backgroundMusic.track = selectedTrack;
        }

        console.log(chalk.green(`\n✓ Selected: ${config.backgroundMusic.track}\n`));
      }

      // Auto-advance to next page after audio settings
      console.log(chalk.green('✓ Background music configured\n'));
      currentPage++;
      continue;

    } else if (currentPage === 6) {
      // Page 7: Verbosity Settings
      console.log(boxen(
        chalk.white('Choose how much Claude speaks during interactions.\n\n') +
        chalk.yellow('🔊 High:\n') +
        chalk.gray('   • Maximum transparency\n') +
        chalk.gray('   • Speaks acknowledgments, reasoning, decisions, findings\n\n') +
        chalk.yellow('🔉 Medium:\n') +
        chalk.gray('   • Balanced approach\n') +
        chalk.gray('   • Speaks acknowledgments and key updates\n\n') +
        chalk.yellow('🔈 Low:\n') +
        chalk.gray('   • Minimal notifications\n') +
        chalk.gray('   • Only essential messages\n\n') +
        chalk.gray('Change anytime: ') + chalk.cyan('/agent-vibes:verbosity <level>'),
        {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'gray',
          width: 80
        }
      ));

      console.log(chalk.gray('\n🔊 Verbosity controls how much Claude speaks during tasks (reasoning, findings, etc.).'));

      const { verbosity } = await inquirer.prompt([{
        type: 'list',
        name: 'verbosity',
        message: chalk.yellow('Select TTS verbosity level:'),
        choices: [
          { name: '🔊 High - Maximum transparency', value: 'high' },
          { name: '🔉 Medium - Balanced', value: 'medium' },
          { name: '🔈 Low - Minimal', value: 'low' },
          new inquirer.Separator(),
          { name: chalk.magentaBright('← Previous'), value: '__back__' }
        ],
        default: config.verbosity || 'high'
      }]);

      if (verbosity === '__back__') {
        currentPage--;
        continue;
      }

      config.verbosity = verbosity;

      // Show confirmation and auto-advance to next page
      console.log(chalk.green('\n✓ Verbosity level set\n'));
      currentPage++;
      continue;
    }

    // Auto-advance if provider was just detected (skip navigation prompt)
    if (config._autoAdvance) {
      delete config._autoAdvance;
      await new Promise(resolve => setTimeout(resolve, 800)); // Brief pause
      currentPage++;
      continue;
    }

    // Navigation with page titles
    const navChoices = [];
    if (currentPage < totalPages - 1) {
      const nextPageTitle = getPageTitle(currentPage + 1).replace(/[🔧🎙️🎤😎💧🔊]\s*/, ''); // Remove emoji
      navChoices.push({ name: chalk.green('Next →') + chalk.gray(` (${nextPageTitle})`), value: 'next' });
    } else {
      navChoices.push({ name: chalk.cyan('✓ Continue to Installation'), value: 'continue' });
    }

    // Always show Previous button (on first page it goes back to welcome)
    if (currentPage === 0) {
      navChoices.push({ name: chalk.magentaBright('← Back to Welcome'), value: 'back' });
    } else {
      const prevPageTitle = getPageTitle(currentPage - 1).replace(/[🔧🎙️🎤😎💧🔊]\s*/, ''); // Remove emoji
      navChoices.push({ name: chalk.magentaBright('← Previous') + chalk.gray(` (${prevPageTitle})`), value: 'prev' });
    }

    // Set navigation message based on page status
    let navMessage = '';
    if (currentPage === 0 && pageStatus) {
      navMessage = pageStatus.allMet
        ? chalk.green('✓') + chalk.cyan(' All system dependencies met')
        : chalk.yellow('⚠') + chalk.cyan(` ${pageStatus.missingCount} optional tool${pageStatus.missingCount > 1 ? 's' : ''} missing`);
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: navMessage,
      prefix: '',
      choices: navChoices,
      default: 'next'
    }]);

    if (action === 'back') {
      // Return to welcome screen
      console.clear();
      return null; // Signal to caller to show welcome again
    } else if (action === 'prev') {
      currentPage--;
    } else if (action === 'next') {
      currentPage++;
    } else {
      // Continue - exit configuration
      break;
    }
  }

  console.clear();
  return config;
}

// Configure CLI
program
  .name('agentvibes')
  .description('🎙️ AgentVibes - Text-to-Speech with personality for AI Assistants')
  .version(VERSION, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command');

// Beautiful ASCII art
function showWelcome() {
  console.log('');

  // Generate separate ASCII art for "Agent" and "Vibes"
  const agentText = figlet.textSync('Agent', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
  });

  const vibesText = figlet.textSync('Vibes', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
  });

  // Split into lines and combine with different colors
  const agentLines = agentText.split('\n');
  const vibesLines = vibesText.split('\n');
  const maxLines = Math.max(agentLines.length, vibesLines.length);

  for (let i = 0; i < maxLines; i++) {
    const agentLine = agentLines[i] || '';
    const vibesLine = vibesLines[i] || '';
    console.log(chalk.cyan(agentLine) + chalk.magenta(vibesLine));
  }

  console.log(
    boxen(
      chalk.white.bold('🎤 Now your AI Agents can finally talk back! TTS Voice for Claude Code\n\n') +
      chalk.gray('Add professional text-to-speech narration to your AI coding sessions\n\n') +
      chalk.cyan('📦 https://github.com/paulpreibisch/AgentVibes'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        backgroundColor: '#1a1a1a',
      }
    )
  );
}

/**
 * Display latest release information box
 * Reads the first section from RELEASE_NOTES.md so it's always current.
 * Falls back to a minimal static string if the file is missing.
 */
function getReleaseInfoBoxen() {
  try {
    const notesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
    const raw = fsSync.readFileSync(notesPath, 'utf8');
    const lines = raw.split('\n');

    // Find the first ## heading (latest release section)
    const startIdx = lines.findIndex(l => l.startsWith('## '));
    if (startIdx < 0) return '';

    // Collect lines until the next ## heading (or end of file)
    const sectionLines = [];
    for (let i = startIdx; i < lines.length; i++) {
      if (i !== startIdx && lines[i].startsWith('## ')) break;
      sectionLines.push(lines[i]);
    }

    // Strip markdown syntax from a line for plain display
    const stripMd = (s) => s
      .replace(/^#{1,6}\s*/, '')           // ## headings
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
      .replace(/`([^`]+)`/g, '$1')        // `code`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // [text](url)

    // Render: heading in cyan, bullets as gray, skip blank/hr lines at end
    return sectionLines
      .map((line, i) => {
        if (i === 0) return chalk.cyan.bold(stripMd(line));
        if (line.startsWith('### ')) return chalk.green.bold(stripMd(line));
        if (line.startsWith('- ')) return chalk.gray('  ' + stripMd(line));
        if (line === '---') return '';
        return chalk.gray(stripMd(line));
      })
      .join('\n')
      .trimEnd() + '\n\n' +
      chalk.gray('📖 Full Release Notes: RELEASE_NOTES.md\n') +
      chalk.gray('🌐 Website: https://agentvibes.org\n') +
      chalk.gray('📦 Repository: https://github.com/paulpreibisch/AgentVibes\n\n') +
      chalk.gray('Co-created by Paul Preibisch with Claude AI\n') +
      chalk.gray('Copyright © 2026 Paul Preibisch | Apache-2.0 License');
  } catch {
    return chalk.cyan.bold(`📦 AgentVibes v${VERSION}\n`) +
      chalk.gray('📖 Full Release Notes: RELEASE_NOTES.md\n') +
      chalk.gray('🌐 Website: https://agentvibes.org');
  }
}

/**
 * Play welcome demo with background music and TTS voice
 * Extended welcome with multiple segments, pauses, and MCP detection
 * @param {string} targetDir - Installation directory
 * @param {object} spinner - ora spinner instance
 */
async function playWelcomeDemo(targetDir, spinner, options = {}) {
  // Skip welcome demo if --yes flag is used (non-interactive install)
  if (options.yes) {
    return;
  }

  // Use pre-generated welcome demo audio
  const welcomeDemoAudio = path.join(__dirname, '..', 'templates', 'audio', 'welcome-demo.wav');

  if (!fsSync.existsSync(welcomeDemoAudio)) {
    console.log(chalk.gray('\n   (Welcome demo skipped - audio file not found)'));
    return;
  }

  // Windows: Use PowerShell SoundPlayer for audio playback (check BEFORE Unix which)
  if (isNativeWindows()) {
    // Escape single quotes to prevent PowerShell injection (double them per PS escaping rules)
    const safeAudioPath = welcomeDemoAudio.replace(/'/g, "''");
    const audioProcess = spawn('powershell', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `(New-Object System.Media.SoundPlayer '${safeAudioPath}').PlaySync()`
    ], { detached: true, stdio: 'ignore' });
    audioProcess.unref();
    return;
  }

  // Unix: Check if we have audio player (prefer paplay for WSL)
  let audioPlayer = null;

  try {
    execFileSync('which', ['paplay'], { stdio: 'pipe' });
    audioPlayer = 'paplay';
  } catch {
    try {
      execFileSync('which', ['afplay'], { stdio: 'pipe' });
      audioPlayer = 'afplay';
    } catch {
      try {
        execFileSync('which', ['mpv'], { stdio: 'pipe' });
        audioPlayer = 'mpv';
      } catch {}
    }
  }

  if (!audioPlayer) {
    console.log(chalk.gray('\n   (Welcome demo skipped - requires paplay, afplay, or mpv)'));
    return;
  }

  // Check if MCP is configured to determine which script to show
  const mcpConfigPath = path.join(targetDir, '.mcp.json');
  const hasMcp = fsSync.existsSync(mcpConfigPath);

  // Build the welcome script with colored commands
  let welcomeScript = chalk.white('Welcome to Agent Vibes, the free software that enhances your developer experience and gives your agents a voice.\n\n');
  welcomeScript += chalk.white('Now integrated with the B mad Method - Artificial Intelligence Driven Agile Development That Scales From Bug Fixes to Enterprise.\n\n');
  welcomeScript += chalk.white('We have added a lot of commands, but don\'t worry, you can hide them by typing ');
  welcomeScript += chalk.magentaBright('/agent-vibes:hide');
  welcomeScript += chalk.white(', and ');
  welcomeScript += chalk.magentaBright('/agent-vibes:show');
  welcomeScript += chalk.white(' to bring them back.');

  if (!hasMcp) {
    welcomeScript += chalk.white('\n\nTo control Agent Vibes with natural language, install the MCP server. That way you can just say things like, ');
    welcomeScript += chalk.magentaBright('"change my voice"');
    welcomeScript += chalk.white(' or ');
    welcomeScript += chalk.magentaBright('"mute the audio"');
    welcomeScript += chalk.white('.');
  }

  welcomeScript += chalk.white('\n\nTo change my personality, just type, ');
  welcomeScript += chalk.magentaBright('"change personality to sarcastic."');
  welcomeScript += chalk.white('\n\nOr to change my voice, type, ');
  welcomeScript += chalk.magentaBright('"try a different voice."');
  welcomeScript += chalk.white('\n\nWe recently have added background music to your agents. You can turn it on or off by saying ');
  welcomeScript += chalk.magentaBright('"Turn background music on"');
  welcomeScript += chalk.white(' or ');
  welcomeScript += chalk.magentaBright('"Turn background music off."');
  welcomeScript += chalk.yellow('\n\n⭐ Please consider giving us a GitHub star! ') + chalk.yellow('https://github.com/paulpreibisch/agentvibes');
  welcomeScript += chalk.white('\n\nLastly, Agent Vibes is updated frequently. Use ');
  welcomeScript += chalk.magentaBright('npx agentvibes update');
  welcomeScript += chalk.white(' to keep up to date.\n\nWe hope you have fun with Agent Vibes. Thank you!');

  // Stop spinner and display the welcome script in a box
  spinner.stop();
  console.log('\n' + boxen(welcomeScript, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: '🎵 AgentVibes Welcome',
    titleAlignment: 'center'
  }));

  console.log(chalk.cyan('🎵 Playing welcome demo in background...\n'));

  try {
    // Play the audio in the background (non-blocking) with reduced volume
    let args;
    if (audioPlayer === 'mpv') {
      args = ['--no-video', '--really-quiet', '--volume=40', welcomeDemoAudio];
    } else if (audioPlayer === 'paplay') {
      args = ['--volume=32768', welcomeDemoAudio]; // 50% volume (max is 65536)
    } else {
      args = ['--volume=0.4', welcomeDemoAudio]; // afplay - 40% volume
    }

    const audioProcess = spawn(audioPlayer, args, {
      detached: true,
      stdio: 'ignore'
    });

    // Detach the process so it continues running after parent exits
    audioProcess.unref();

  } catch (error) {
    // Silent fail - demo is optional
    console.log(chalk.gray('   (Welcome demo skipped)'));
  }
}

/**
 * Get user's shell and shell config file path
 * @returns {{shell: string, shellName: string, shellConfig: string}}
 */
function getUserShell() {
  const shellPath = process.env.SHELL || '/bin/bash';
  const shellName = shellPath.split('/').pop();
  const homeDir = process.env.HOME || process.env.USERPROFILE;

  let shellConfig;
  if (shellName === 'zsh') {
    shellConfig = path.join(homeDir, '.zshrc');
  } else if (shellName === 'bash') {
    shellConfig = path.join(homeDir, '.bashrc');
  } else {
    // Default to bash if unknown
    shellConfig = path.join(homeDir, '.bashrc');
  }

  return {
    shell: shellPath,
    shellName,
    shellConfig
  };
}

/**
 * Execute a shell script using the user's default shell with environment loaded
 * @param {string} scriptPath - Path to the script with optional arguments (e.g., "script.sh enable")
 * @param {object} options - execSync options
 * @returns {Buffer} - Output from the script
 */
function execScript(scriptPath, options = {}) {
  const { shell, shellConfig } = getUserShell();

  // Security: Properly escape the scriptPath to prevent command injection
  // Split scriptPath into command and arguments
  const parts = scriptPath.split(/\s+/);
  const scriptFile = parts[0];
  const args = parts.slice(1);

  // Validate that the script file doesn't contain shell metacharacters
  if (scriptFile.match(/[;&|`$(){}[\]<>'"\\]/)) {
    throw new Error('Invalid characters in script path');
  }

  // Validate path is within expected directory (defense in depth)
  const resolvedPath = path.resolve(scriptFile);
  const allowedDir = path.resolve(__dirname, '..', '.claude', 'hooks');
  if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
    throw new Error('Script path outside allowed directory');
  }

  // Security: Validate shell and shellConfig don't contain dangerous characters
  // These come from environment variables which could be attacker-controlled
  if (shell.match(/[;&|`$(){}[\]<>'"\\]/)) {
    throw new Error('Invalid characters in shell path');
  }
  if (shellConfig.match(/[;&|`$(){}[\]<>'"\\]/)) {
    throw new Error('Invalid characters in shell config path');
  }

  // Validate shell is an absolute path to a known shell
  const validShells = ['/bin/bash', '/bin/zsh', '/bin/sh', '/usr/bin/bash', '/usr/bin/zsh', '/usr/bin/sh'];
  if (!validShells.includes(shell) && !shell.match(/^\/(?:usr\/)?(?:local\/)?bin\/(?:ba)?sh$/)) {
    throw new Error('Shell path not recognized as a valid shell');
  }

  // Validate shellConfig is under home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const resolvedConfig = path.resolve(shellConfig);
  const resolvedHome = path.resolve(homeDir);
  if (!resolvedConfig.startsWith(resolvedHome + path.sep)) {
    throw new Error('Shell config must be under home directory');
  }

  // Security: Avoid shell script string interpolation to prevent CodeQL warnings
  // Instead, directly execute the script file without sourcing shell config
  // The script itself will be executed in a clean environment
  // Note: This means shell aliases/functions won't be available, but that's safer
  return execFileSync(scriptFile, args, {
    ...options,
    shell: false  // Don't use shell to avoid injection risks
  });
}

/**
 * Generate BMAD activation instructions based on version
 * @param {number} version - BMAD version (4 or 6)
 * @returns {string} Activation instructions content
 */
function generateActivationInstructions(version) {
  const configPathExample = version === 6
    ? 'bmad/core/config.yaml'
    : '.bmad-core/config.yaml';

  return `# BMAD Agent Activation Instructions (v${version})

When a BMAD agent activates, follow these steps EXACTLY:

## STEP 3.5a: Create BMAD Context File (CRITICAL)

**IMMEDIATELY after agent identification, create the context file:**

\`\`\`bash
echo "$AGENT_ID" > .bmad-agent-context
\`\`\`

Where \`$AGENT_ID\` is one of:
- \`pm\` (Product Manager)
- \`dev\` (Developer)
- \`qa\` (QA)
- \`architect\` (Architect)
- \`po\` (Product Owner)
- \`analyst\` (Analyst)
- \`sm\` (Scrum Master)
- \`ux-expert\` (UX Expert)
- \`bmad-master\` (BMAD Master)
- \`bmad-orchestrator\` (Orchestrator)

**Example:**
\`\`\`bash
# For Product Manager agent
echo "pm" > .bmad-agent-context
\`\`\`

**Configuration Location**: ${configPathExample}

This file allows AgentVibes to:
1. Detect which BMAD agent is active
2. Look up the correct voice mapping
3. Automatically speak questions using the agent's assigned voice

## STEP 10: Clean Up on Exit

**Before exiting the agent, remove the context file:**

\`\`\`bash
rm -f .bmad-agent-context
\`\`\`

This ensures voice switching only happens when an agent is active.

## Why This Matters

Without the \`.bmad-agent-context\` file:
- AgentVibes cannot detect which agent is active
- Questions won't be spoken automatically
- Voice switching won't work
- The BMAD voice plugin becomes non-functional

**This is MANDATORY for BMAD voice integration to work!**
`;
}

// ============================================================================
// HELPER FUNCTIONS FOR INSTALL/UPDATE REFACTORING
// ============================================================================

/**
 * Prompt user to select TTS provider (Piper, macOS Say, or Termux SSH)
 * @param {Object} options - Installation options
 * @returns {Promise<string>} Selected provider ('piper', 'macos', or 'termux-ssh')
 */
async function promptProviderSelection(options) {
  const isMacOS = process.platform === 'darwin';

  if (options.yes) {
    // Free-first approach: Always use free providers with --yes flag
    if (isMacOS) {
      console.log(chalk.green('✓ Using macOS Say (built-in, zero setup)\n'));
      return 'macos';
    }
    console.log(chalk.green('✓ Using Piper TTS (free, offline)\n'));
    return 'piper';
  }

  // Always show all providers - let user choose
  console.log(chalk.cyan('🎭 Choose Your TTS Provider:\n'));

  const choices = [];

  // macOS Say (only on macOS)
  if (isMacOS) {
    choices.push({
      name: chalk.yellow('🍎 macOS Say (Recommended)') + chalk.gray(' - Built-in, zero setup required'),
      value: 'macos',
    });
  }

  // Piper TTS (all platforms)
  choices.push({
    name: chalk.green('🆓 Piper TTS (Free, Offline)') + chalk.gray(' - 50+ Hugging Face AI voices, human-like speech'),
    value: 'piper',
  });

  // Soprano TTS (all platforms)
  choices.push({
    name: chalk.magenta('⚡ Soprano TTS (Ultra-Fast)') + chalk.gray(' - 1 premium voice, 20x faster, <1GB memory'),
    value: 'soprano',
  });

  // Termux SSH (all platforms)
  choices.push({
    name: chalk.blue('📱 Termux SSH (Android)') + chalk.gray(' - Only choose if your project is on a remote server and you want audio sent to your Android device. See: github.com/paulpreibisch/AgentVibes/blob/master/.claude/docs/TERMUX_SETUP.md'),
    value: 'termux-ssh',
  });

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which TTS provider would you like to use?',
      choices,
      default: isMacOS ? 'macos' : 'piper',
    },
  ]);

  return provider;
}

/**
 * Check if Piper voices are already installed at a given path
 * @param {string} voicesPath - Path to check for voice models
 * @returns {Promise<{installed: boolean, voices: string[]}>} Whether voices are installed and list of voice names
 */
async function checkExistingPiperVoices(voicesPath) {
  try {
    const files = await fs.readdir(voicesPath);
    const voiceFiles = files.filter(f => f.endsWith('.onnx'));

    if (voiceFiles.length > 0) {
      const voiceNames = voiceFiles.map(f => f.replace('.onnx', ''));
      return { installed: true, voices: voiceNames };
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return { installed: false, voices: [] };
}

/**
 * Prompt user to select default reverb level for TTS
 * @returns {Promise<string>} Selected reverb level
 */
async function promptReverbSelection() {
  console.log(chalk.cyan('\n🎛️  Audio Effects Configuration:\n'));
  console.log(chalk.white('   Choose a default reverb level for TTS audio'));
  console.log(chalk.gray('   (Adds room/space ambiance to make voices sound more natural)\n'));

  const { reverbLevel } = await inquirer.prompt([
    {
      type: 'list',
      name: 'reverbLevel',
      message: 'Select default reverb level:',
      choices: [
        { name: 'Off (Dry, no reverb)', value: 'off' },
        { name: 'Light (Small room) - Recommended', value: 'light' },
        { name: 'Medium (Conference room)', value: 'medium' },
        { name: 'Heavy (Large hall)', value: 'heavy' },
        { name: 'Cathedral (Epic space)', value: 'cathedral' },
      ],
      default: 'light',
    },
  ]);

  return reverbLevel;
}

/**
 * Handle Piper TTS configuration (voice storage location)
 * Detects existing voice installations and skips download prompt if voices already exist
 * @returns {Promise<string>} Path where Piper voices will be stored
 */
async function handlePiperConfiguration() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const defaultPiperPath = path.join(homeDir, '.claude', 'piper-voices');

  // Check if voices are already installed at the default location
  const existingVoices = await checkExistingPiperVoices(defaultPiperPath);

  if (existingVoices.installed) {
    // Voices already installed - will be shown in Installation Summary boxen
    return defaultPiperPath;
  }

  console.log(chalk.cyan('\n📁 Piper Voice Storage Location:\n'));
  console.log(chalk.gray('   Piper voice models are ~25MB each. They can be stored globally'));
  console.log(chalk.gray('   to be shared across all your projects, or locally per project.\n'));

  const { piperPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'piperPath',
      message: 'Where should Piper voice models be downloaded?',
      default: defaultPiperPath,
      validate: (input) => {
        if (!input || input.trim() === '') {
          return 'Please provide a valid path';
        }
        return true;
      },
    },
  ]);

  console.log(chalk.green(`✓ Piper voices will be stored in: ${piperPath}`));
  return piperPath;
}

/**
 * Handle Termux SSH configuration (SSH host alias setup)
 * @returns {Promise<string|null>} SSH host alias or null if user skips
 */
async function handleTermuxSshConfiguration() {
  console.log(chalk.cyan('\n📱 Termux SSH Configuration:\n'));
  console.log(chalk.gray('   Termux SSH requires an SSH host alias configured in ~/.ssh/config'));
  console.log(chalk.gray('   Example: "android" pointing to your Android device\n'));
  console.log(chalk.gray('   See documentation: .claude/docs/TERMUX_SETUP.md\n'));
  console.log(chalk.cyan('   🔗 Required Components:\n'));
  console.log(chalk.gray('   • Tailscale VPN: ') + chalk.blue('https://tailscale.com/download/android'));
  console.log(chalk.gray('   • F-Droid Store: ') + chalk.blue('https://f-droid.org'));
  console.log(chalk.gray('   • Termux App: ') + chalk.blue('https://f-droid.org/packages/com.termux'));
  console.log(chalk.gray('   • Termux:API: ') + chalk.blue('https://f-droid.org/packages/com.termux.api\n'));

  const { configureNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configureNow',
      message: 'Do you want to configure the SSH host alias now?',
      default: false,
    },
  ]);

  if (!configureNow) {
    console.log(chalk.yellow('⚠️  SSH host not configured - you can set it later:'));
    console.log(chalk.gray('   echo "your-host-alias" > ~/.claude/termux-ssh-host.txt\n'));
    return null;
  }

  const { sshHost } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sshHost',
      message: 'Enter your SSH host alias (e.g., "android"):',
      validate: (input) => {
        if (!input || input.trim() === '') {
          return 'Please provide a valid SSH host alias';
        }
        // Basic validation: no spaces, no special chars that could cause issues
        if (!/^[a-zA-Z0-9_-]+$/.test(input.trim())) {
          return 'SSH host alias should only contain letters, numbers, dashes, and underscores';
        }
        return true;
      },
    },
  ]);

  const sshHostTrimmed = sshHost.trim();
  console.log(chalk.green(`✓ SSH host alias set to: ${sshHostTrimmed}`));
  return sshHostTrimmed;
}

/**
 * Copy command files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<{count: number, boxen: string}>} Number of files copied and boxen content
 */
async function copyCommandFiles(targetDir, spinner) {
  spinner.start('Installing /agent-vibes slash commands...');
  const srcCommandsDir = path.join(__dirname, '..', '.claude', 'commands', 'agent-vibes');
  const commandsDir = path.join(targetDir, '.claude', 'commands');
  const agentVibesCommandsDir = path.join(commandsDir, 'agent-vibes');

  try {
    await fs.mkdir(agentVibesCommandsDir, { recursive: true });

    const commandFiles = await fs.readdir(srcCommandsDir);

    let installedCommands = [];
    let failedCommands = [];
    let successCount = 0;

    for (const file of commandFiles) {
      const srcPath = path.join(srcCommandsDir, file);
      const destPath = path.join(agentVibesCommandsDir, file);
      try {
        await fs.copyFile(srcPath, destPath);
        installedCommands.push(file);
        successCount++;
      } catch (err) {
        failedCommands.push({ file, error: err.message });
        // Continue with other files
      }
    }

    if (successCount === commandFiles.length) {
      spinner.succeed(chalk.green(`Installed ${successCount} slash commands!\n`));
    } else {
      spinner.warn(chalk.yellow(`Installed ${successCount}/${commandFiles.length} commands (some failed)\n`));
    }

    // Create boxen content (don't print yet - will be shown in pagination)
    let content = chalk.bold(`${installedCommands.length} Slash Commands Installed\n\n`);
    content += chalk.gray('Installed in: ') + chalk.cyan('.claude/commands/\n\n');
    content += chalk.gray('Slash commands are shortcuts you type in chat to trigger actions.\n');
    content += chalk.gray('Type them with a forward slash like: /agent-vibes:list\n\n');
    content += chalk.cyan('Use ') + chalk.magenta('/agent-vibes:hide') + chalk.cyan(' to hide and ') + chalk.magenta('/agent-vibes:show') + chalk.cyan(' to show\n\n');

    // Format commands in two columns
    const commandNames = installedCommands.map(file => file.replace('.md', ''));
    const mid = Math.ceil(commandNames.length / 2);
    const leftColumn = commandNames.slice(0, mid);
    const rightColumn = commandNames.slice(mid);

    for (let i = 0; i < leftColumn.length; i++) {
      const leftCmd = leftColumn[i];
      const rightCmd = rightColumn[i];

      // Format left column
      let line = chalk.green('✓ ') + chalk.yellow(`/${leftCmd}`);

      // Pad to align right column (40 chars for command + checkmark)
      const leftLength = leftCmd.length + 4; // 4 = "✓ /" + command
      const padding = ' '.repeat(Math.max(0, 40 - leftLength));

      line += padding;

      // Format right column if it exists
      if (rightCmd) {
        line += chalk.green('✓ ') + chalk.yellow(`/${rightCmd}`);
      }

      content += line + '\n';
    }

    // Add failures if any
    if (failedCommands.length > 0) {
      content += '\n' + chalk.gray('─'.repeat(60)) + '\n\n';
      content += chalk.yellow('⚠ Failed Commands\n\n');
      failedCommands.forEach(({ file, error }) => {
        content += chalk.gray(`✗ ${file}: ${error}\n`);
      });
    }

    const boxenContent = boxen(content.trim(), {
      padding: 1,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: successCount === commandFiles.length ? 'cyan' : 'yellow',
      width: 80
    });

    return { count: successCount, boxen: boxenContent };
  } catch (err) {
    spinner.fail(chalk.red(`Failed to install commands: ${err.message}`));
    throw err;
  }
}

/**
 * Check if a file should be included as a hook file
 * @param {string} file - Filename to check
 * @param {Object} stat - File stats object
 * @returns {boolean} True if file should be included
 */
function shouldIncludeHookFile(file, stat) {
  if (isNativeWindows()) {
    // Include .ps1 scripts, .py helpers, and hooks.json; exclude dotfiles and prepare-release
    return stat.isFile() &&
           (file.endsWith('.ps1') || file.endsWith('.py') || file === 'hooks.json') &&
           !file.includes('prepare-release') &&
           !file.startsWith('.');
  }
  return stat.isFile() &&
         (file.endsWith('.sh') || file === 'hooks.json') &&
         !file.includes('prepare-release') &&
         !file.startsWith('.');
}

/**
 * Filter hook files from directory
 * @param {string} srcHooksDir - Source hooks directory
 * @param {Array} allFiles - All files in directory
 * @returns {Promise<Array>} Filtered hook files
 */
async function filterHookFiles(srcHooksDir, allFiles) {
  const hookFiles = [];

  for (const file of allFiles) {
    const srcPath = path.join(srcHooksDir, file);
    try {
      const stat = await fs.stat(srcPath);
      if (shouldIncludeHookFile(file, stat)) {
        hookFiles.push(file);
      }
    } catch (err) {
      console.log(chalk.yellow(`   ⚠ Could not check ${file}: ${err.message}`));
    }
  }

  return hookFiles;
}

/**
 * Copy a single hook file and set permissions
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 * @param {string} filename - Name of the file
 * @returns {Promise<Object>} Result object with success/error info
 */
async function copyHookFile(srcPath, destPath, filename) {
  try {
    await fs.copyFile(srcPath, destPath);

    if (filename.endsWith('.sh')) {
      await fs.chmod(destPath, 0o750);
      return { success: true, name: filename, executable: true };
    }

    return { success: true, name: filename, executable: false };
  } catch (err) {
    return { success: false, name: filename, error: err.message };
  }
}

/**
 * Build boxen content for hook installation results
 * @param {Array} installedFiles - Successfully installed files
 * @param {Array} failedFiles - Failed files
 * @returns {string} Boxen formatted content
 */
function buildHookInstallationBoxen(installedFiles, failedFiles) {
  let content = chalk.bold(`${installedFiles.length} TTS Hook Scripts Installed\n\n`);
  content += chalk.gray('Hook scripts automatically run at key moments during your\n');
  content += chalk.gray('Claude Code sessions to provide TTS feedback and manage audio.\n\n');

  // Format files in two columns
  const mid = Math.ceil(installedFiles.length / 2);
  for (let i = 0; i < mid; i++) {
    const left = installedFiles[i];
    const right = installedFiles[i + mid];

    // Format left column
    let line = chalk.green(`✓ ${left.name}`);
    const leftLen = left.name.length + 2; // "✓ " + name
    const padding = ' '.repeat(Math.max(0, 40 - leftLen));
    line += padding;

    // Format right column if it exists
    if (right) {
      line += chalk.green(`✓ ${right.name}`);
    }

    content += line + '\n';
  }

  if (failedFiles.length > 0) {
    content += '\n' + chalk.gray('─'.repeat(60)) + '\n\n';
    content += chalk.bold.yellow(`${failedFiles.length} Failed\n\n`);
    failedFiles.forEach(file => {
      content += chalk.yellow(`⚠ ${file.name}\n`);
      content += chalk.dim(`  ${file.error}\n`);
    });
  }

  return boxen(content.trim(), {
    padding: 1,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'green',
    width: 80
  });
}

/**
 * Copy hook files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<{count: number, boxen: string|null}>} Number of files copied and boxen content
 */
async function copyHookFiles(targetDir, spinner) {
  spinner.start('Installing TTS helper scripts...');
  const hooksSubdir = isNativeWindows() ? 'hooks-windows' : 'hooks';
  const srcHooksDir = path.join(__dirname, '..', '.claude', hooksSubdir);
  const hooksDir = path.join(targetDir, '.claude', hooksSubdir);

  try {
    await fs.mkdir(hooksDir, { recursive: true });

    const allHookFiles = await fs.readdir(srcHooksDir);
    const hookFiles = await filterHookFiles(srcHooksDir, allHookFiles);

    spinner.start(`Installing ${hookFiles.length} TTS scripts...`);

    const installedFiles = [];
    const failedFiles = [];

    for (const file of hookFiles) {
      const srcPath = path.join(srcHooksDir, file);
      const destPath = path.join(hooksDir, file);
      const result = await copyHookFile(srcPath, destPath, file);

      if (result.success) {
        installedFiles.push({ name: result.name, executable: result.executable });
      } else {
        failedFiles.push({ name: result.name, error: result.error });
      }
    }

    const successCount = installedFiles.length;

    if (successCount === hookFiles.length) {
      spinner.succeed(chalk.green('Installed TTS scripts!\n'));
    } else {
      spinner.warn(chalk.yellow(`Installed ${successCount}/${hookFiles.length} scripts (some failed)\n`));
    }

    const boxenContent = installedFiles.length > 0
      ? buildHookInstallationBoxen(installedFiles, failedFiles)
      : null;

    return { count: successCount, boxen: boxenContent };
  } catch (err) {
    spinner.fail(chalk.red(`Failed to install hook scripts: ${err.message}`));
    throw err;
  }
}

/**
 * Copy personality files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<{count: number, boxen: string|null}>} Number of files copied and boxen content
 */
async function copyPersonalityFiles(targetDir, spinner) {
  spinner.start('Installing personality templates...');
  const srcPersonalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
  const destPersonalitiesDir = path.join(targetDir, '.claude', 'personalities');

  await fs.mkdir(destPersonalitiesDir, { recursive: true });

  const personalityFiles = await fs.readdir(srcPersonalitiesDir);
  const personalityMdFiles = [];

  for (const file of personalityFiles) {
    const srcPath = path.join(srcPersonalitiesDir, file);
    const stat = await fs.stat(srcPath);

    if (stat.isFile() && file.endsWith('.md')) {
      personalityMdFiles.push(file);
    }
  }

  spinner.start(`Installing ${personalityMdFiles.length} personality templates...`);
  let installedPersonalities = [];

  for (const file of personalityMdFiles) {
    const srcPath = path.join(srcPersonalitiesDir, file);
    const destPath = path.join(destPersonalitiesDir, file);
    await fs.copyFile(srcPath, destPath);
    installedPersonalities.push(file);
  }

  spinner.succeed(chalk.green('Installed personality templates!\n'));

  // Create boxen content (don't print yet - will be shown in pagination)
  let boxenContent = null;
  if (installedPersonalities.length > 0) {
    let content = chalk.bold(`${installedPersonalities.length} Personality Templates Installed\n\n`);
    content += chalk.gray('Personalities change how Claude speaks - adding humor, emotion, or style.\n');
    content += chalk.gray('Change with: ') + chalk.yellow('/agent-vibes:personality <name>') + chalk.gray(' or say "change personality to sassy"\n\n');

    // Display personalities in two columns
    const personalities = installedPersonalities.map(file => {
      const name = file.replace('.md', '');
      const emoji = personalityEmojis[name] || '✨';
      return { emoji, name };
    });

    const mid = Math.ceil(personalities.length / 2);
    for (let i = 0; i < mid; i++) {
      const left = personalities[i];
      const right = personalities[i + mid];

      let line = chalk.green('✓ ') + left.emoji + ' ' + chalk.yellow(left.name);
      const leftLen = left.name.length + 4; // "✓ " + emoji + " " + name
      const padding = ' '.repeat(Math.max(0, 35 - leftLen));
      line += padding;

      if (right) {
        line += chalk.green('✓ ') + right.emoji + ' ' + chalk.yellow(right.name);
      }

      content += line + '\n';
    }

    boxenContent = boxen(content.trim(), {
      padding: 1,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'magenta',
      width: 80
    });
  }

  return { count: personalityMdFiles.length, boxen: boxenContent };
}

// Output styles removed - deprecated in favor of SessionStart hook system

/**
 * Copy plugin files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<number>} Number of files copied
 */
async function copyPluginFiles(targetDir, spinner) {
  spinner.start('Installing BMAD plugin files...');
  const srcPluginsDir = path.join(__dirname, '..', '.claude', 'plugins');
  const destPluginsDir = path.join(targetDir, '.claude', 'plugins');

  await fs.mkdir(destPluginsDir, { recursive: true });

  let pluginFiles = [];
  try {
    const allPluginFiles = await fs.readdir(srcPluginsDir);
    for (const file of allPluginFiles) {
      const srcPath = path.join(srcPluginsDir, file);
      const stat = await fs.stat(srcPath);

      if (stat.isFile() && file.endsWith('.md')) {
        pluginFiles.push(file);
        const destPath = path.join(destPluginsDir, file);
        await fs.copyFile(srcPath, destPath);
      }
    }
    spinner.succeed(chalk.green('Installed BMAD plugin files!\n'));
  } catch (error) {
    spinner.info(chalk.yellow('No plugin files found (optional)\n'));
  }

  return pluginFiles.length;
}

/**
 * Copy BMAD config files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<number>} Number of files copied
 */
async function copyBmadConfigFiles(targetDir, spinner) {
  spinner.start('Installing BMAD config files...');
  const srcBmadDir = path.join(__dirname, '..', '.agentvibes', 'bmad');
  const destBmadDir = path.join(targetDir, '.agentvibes', 'bmad');

  await fs.mkdir(destBmadDir, { recursive: true });

  let fileCount = 0;

  // Copy bmad-voices.md if it exists
  const bmadVoicesFile = 'bmad-voices.md';
  const srcPath = path.join(srcBmadDir, bmadVoicesFile);

  try {
    await fs.access(srcPath);
    const destPath = path.join(destBmadDir, bmadVoicesFile);
    await fs.copyFile(srcPath, destPath);
    fileCount++;
    spinner.succeed(chalk.green('Installed BMAD config files!\n'));
  } catch (error) {
    spinner.info(chalk.yellow('No BMAD config files found (optional)\n'));
  }

  return fileCount;
}

/**
 * Copy background music files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<{count: number, boxen: string}>} Number of files copied and boxen content
 */
async function copyBackgroundMusicFiles(targetDir, spinner) {
  spinner.start('Installing background music tracks...');
  const srcBackgroundsDir = path.join(__dirname, '..', '.claude', 'audio', 'tracks');
  const destBackgroundsDir = path.join(targetDir, '.claude', 'audio', 'tracks');

  await fs.mkdir(destBackgroundsDir, { recursive: true });

  let musicFiles = [];
  try {
    const allMusicFiles = await fs.readdir(srcBackgroundsDir);
    for (const file of allMusicFiles) {
      const srcPath = path.join(srcBackgroundsDir, file);
      const stat = await fs.stat(srcPath);

      if (stat.isFile() && (file.endsWith('.mp3') || file.endsWith('.wav'))) {
        const destPath = path.join(destBackgroundsDir, file);
        await fs.copyFile(srcPath, destPath);

        // Format file size
        const sizeKB = (stat.size / 1024).toFixed(1);

        musicFiles.push({
          name: file,
          size: `${sizeKB} KB`,
          path: destPath
        });
      }
    }

    if (musicFiles.length > 0) {
      spinner.succeed(chalk.green(`Installed ${musicFiles.length} background music track${musicFiles.length === 1 ? '' : 's'}!\n`));
    } else {
      spinner.info(chalk.yellow('No background music files found (optional)\n'));
    }
  } catch (error) {
    spinner.info(chalk.yellow('No background music files found (optional)\n'));
  }

  // Create boxen content (don't print yet - will be shown in pagination)
  if (musicFiles.length > 0) {
    let content = chalk.bold(`${musicFiles.length} Background Music Tracks Installed\n\n`);

    content += chalk.cyan('Agents need to have fun too! 🎉 Spice things up with background music.\n\n');

    content += chalk.white('💡 How to control background music:\n\n');
    content += chalk.cyan('  Slash Commands:\n');
    content += chalk.gray('    /agent-vibes:background-music on          - Enable music\n');
    content += chalk.gray('    /agent-vibes:background-music off         - Disable music\n');
    content += chalk.gray('    /agent-vibes:background-music set chillwave - Change track\n\n');
    content += chalk.cyan('  MCP Natural Language:\n');
    content += chalk.gray('    "turn on background music"\n');
    content += chalk.gray('    "change background music to chillwave"\n');
    content += chalk.gray('    "disable background music"\n\n');

    content += chalk.gray('─'.repeat(70)) + '\n\n';

    // Display tracks with emojis in two columns
    const trackEmojis = {
      'agentvibes_soft_flamenco_loop.mp3': '🎸',
      'agentvibes_chillwave_loop.mp3': '🌊',
      'agentvibes_lofi_hiphop_loop.mp3': '🎧',
      'agentvibes_ambient_space_loop.mp3': '🌌',
      'agentvibes_jazz_cafe_loop.mp3': '☕',
      'agentvibes_synthwave_loop.mp3': '🌃',
      'agentvibes_bossa_nova_loop.mp3': '🎺',
      'agentvibes_downtempo_loop.mp3': '🎹',
      'agentvibes_city_pop_loop.mp3': '🏙️',
      'agentvibes_vaporwave_loop.mp3': '💿',
      'agentvibes_trip_hop_loop.mp3': '🎵',
      'agentvibes_soul_loop.mp3': '🎤',
      'agentvibes_funk_loop.mp3': '🕺',
      'agentvibes_reggae_loop.mp3': '🌴',
      'agentvibes_blues_loop.mp3': '🎸',
      'agentvibes_classical_loop.mp3': '🎻',
      'Late Night Hip Hop Groove.mp3': '🎤',
      'Drifting Down the Hall.mp3': '🌃',
      'Midnight Charleston Stomp.mp3': '🎩'
    };

    const tracks = musicFiles.map(track => ({
      name: track.name.replace('agentvibes_', '').replace('_loop.mp3', '').replace(/_/g, ' '),
      emoji: trackEmojis[track.name] || '🎵',
      size: track.size
    }));

    const mid = Math.ceil(tracks.length / 2);
    for (let i = 0; i < mid; i++) {
      const left = tracks[i];
      const right = tracks[i + mid];

      let line = chalk.green('✓ ') + left.emoji + ' ' + chalk.yellow(left.name);
      const leftLen = left.name.length + 4; // "✓ " + emoji + " " + name
      const padding = ' '.repeat(Math.max(0, 35 - leftLen));
      line += padding;

      if (right) {
        line += chalk.green('✓ ') + right.emoji + ' ' + chalk.yellow(right.name);
      }

      content += line + '\n';
    }

    const boxenContent = boxen(content.trim(), {
      padding: 1,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'green',
      width: 80
    });

    return { count: musicFiles.length, boxen: boxenContent };
  }

  return { count: 0, boxen: null };
}

/**
 * Copy configuration files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<number>} Number of files copied
 */
async function copyConfigFiles(targetDir, spinner) {
  spinner.start('Installing configuration files...');
  const srcConfigDir = path.join(__dirname, '..', '.claude', 'config');
  const destConfigDir = path.join(targetDir, '.claude', 'config');

  await fs.mkdir(destConfigDir, { recursive: true });

  let copiedFiles = [];
  try {
    const configFiles = await fs.readdir(srcConfigDir);
    for (const file of configFiles) {
      const srcPath = path.join(srcConfigDir, file);
      const destPath = path.join(destConfigDir, file);
      const stat = await fs.stat(srcPath);

      if (stat.isFile()) {
        // For .sample files: copy as the real config name if it doesn't exist yet
        // e.g. audio-effects.cfg.sample → audio-effects.cfg (only if absent)
        let finalDest = destPath;
        let finalName = file;
        if (file.endsWith('.sample')) {
          finalName = file.replace(/\.sample$/, '');
          finalDest = path.join(destConfigDir, finalName);
          try {
            await fs.access(finalDest);
            continue; // Real config already exists, don't overwrite
          } catch {
            // Real config doesn't exist, install from sample
          }
        } else {
          // Non-sample files: skip if already exists
          try {
            await fs.access(destPath);
            continue;
          } catch {
            // File doesn't exist, proceed with copy
          }
        }

        await fs.copyFile(srcPath, finalDest);
        copiedFiles.push(finalName);
      }
    }

    if (copiedFiles.length > 0) {
      spinner.succeed(chalk.green(`Installed ${copiedFiles.length} config file${copiedFiles.length === 1 ? '' : 's'}!\n`));
    } else {
      spinner.info(chalk.gray('Config files already exist, skipping\n'));
    }
  } catch (error) {
    spinner.info(chalk.yellow('No config files found (optional)\n'));
  }

  return copiedFiles.length;
}

/**
 * Copy Codex integration files (.codex/AGENTS.md, .codex/hooks/, .codex/config.toml template)
 * These are template files so Codex CLI and VS Code extension can discover AgentVibes.
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 */
async function copyCodexFiles(targetDir, spinner) {
  spinner.start('Installing Codex integration files...');
  const srcCodexDir = path.join(__dirname, '..', '.codex');
  const destCodexDir = path.join(targetDir, '.codex');

  let copiedFiles = [];
  try {
    await fs.mkdir(destCodexDir, { recursive: true });
    await fs.mkdir(path.join(destCodexDir, 'hooks'), { recursive: true });

    // Copy AGENTS.md
    const agentsSrc = path.join(srcCodexDir, 'AGENTS.md');
    try {
      const content = await fs.readFile(agentsSrc, 'utf8');
      await fs.writeFile(path.join(destCodexDir, 'AGENTS.md'), content);
      copiedFiles.push('.codex/AGENTS.md');
    } catch { /* source not found */ }

    // Copy hook scripts
    for (const hookFile of ['init-agentvibes.sh', 'init-agentvibes.ps1']) {
      const hookSrc = path.join(srcCodexDir, 'hooks', hookFile);
      try {
        const content = await fs.readFile(hookSrc, 'utf8');
        const destPath = path.join(destCodexDir, 'hooks', hookFile);
        await fs.writeFile(destPath, content);
        if (hookFile.endsWith('.sh')) {
          try { await fs.chmod(destPath, 0o750); } catch { /* Windows */ }
        }
        copiedFiles.push(`.codex/hooks/${hookFile}`);
      } catch { /* source not found */ }
    }

    if (copiedFiles.length > 0) {
      spinner.succeed(chalk.green(`Installed ${copiedFiles.length} Codex file${copiedFiles.length === 1 ? '' : 's'}!\n`));
      copiedFiles.forEach(file => {
        console.log(chalk.gray(`   ✓ ${file}`));
      });
      console.log('');
    } else {
      spinner.info(chalk.gray('Codex files not found in package (optional)\n'));
    }
  } catch (error) {
    spinner.info(chalk.yellow('Codex integration files skipped (optional)\n'));
  }

  return copiedFiles.length;
}

/**
 * Configure SessionStart hook in settings.json
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 */
async function configureSessionStartHook(targetDir, spinner) {
  spinner.start('Configuring AgentVibes hook for automatic TTS...');
  const claudeDir = path.join(targetDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');
  const templateSettingsPath = path.join(__dirname, '..', '.claude', 'settings.json');

  try {
    let existingSettings = {};
    try {
      const existingContent = await fs.readFile(settingsPath, 'utf8');
      existingSettings = JSON.parse(existingContent);
    } catch {
      // File doesn't exist or is invalid - use template
    }

    const templateContent = await fs.readFile(templateSettingsPath, 'utf8');
    const templateSettings = JSON.parse(templateContent);

    if (!existingSettings.hooks) {
      existingSettings.hooks = {};
    }

    if (!existingSettings.hooks.SessionStart) {
      if (isNativeWindows()) {
        existingSettings.hooks.SessionStart = [{
          hooks: [{
            type: 'command',
            command: 'powershell -NoProfile -ExecutionPolicy Bypass -File "$CLAUDE_PROJECT_DIR\\.claude\\hooks-windows\\session-start-tts.ps1"'
          }]
        }];
      } else {
        existingSettings.hooks.SessionStart = templateSettings.hooks.SessionStart;
      }

      if (!existingSettings.$schema) {
        existingSettings.$schema = templateSettings.$schema;
      }

      await fs.writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));
      spinner.succeed(chalk.green('SessionStart hook configured!\n'));
    } else {
      spinner.info(chalk.yellow('SessionStart hook already configured\n'));
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to configure hook: ' + error.message + '\n'));
  }
}

/**
 * Configure BMAD party mode PostToolUse hook in the global ~/.claude/settings.json.
 * Copies bmad-party-speak script to ~/.claude/hooks/ (or hooks-windows/ on Windows)
 * and registers the PostToolUse hook so party mode TTS works in any BMAD project.
 * @param {string} targetDir - Target installation directory (used to locate source scripts)
 * @param {Object} spinner - Ora spinner instance
 */
async function configurePartyModeHook(targetDir, spinner, homeDirOverride) {
  spinner.start('Configuring BMAD party mode TTS hook...');
  const homeDir = homeDirOverride || os.homedir();
  const globalClaudeDir = path.join(homeDir, '.claude');
  const globalSettingsPath = path.join(globalClaudeDir, 'settings.json');

  try {
    // Determine platform-specific paths
    const hooksSubdir = isNativeWindows() ? 'hooks-windows' : 'hooks';
    const scriptName = isNativeWindows() ? 'bmad-party-speak.ps1' : 'bmad-party-speak.sh';
    const globalHooksDir = path.join(globalClaudeDir, hooksSubdir);
    const srcScript = path.join(__dirname, '..', '.claude', hooksSubdir, scriptName);
    const destScript = path.join(globalHooksDir, scriptName);

    // Copy script to global hooks dir (create dir if needed)
    await fs.mkdir(globalHooksDir, { recursive: true });
    await fs.copyFile(srcScript, destScript);
    if (!isNativeWindows()) {
      await fs.chmod(destScript, 0o750);
    }

    // Build the PostToolUse hook command
    const hookCommand = isNativeWindows()
      ? `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\\.claude\\hooks-windows\\bmad-party-speak.ps1"`
      : `bash "$HOME/.claude/hooks/bmad-party-speak.sh"`;

    // Read/create global settings.json
    let settings = {};
    try {
      const content = await fs.readFile(globalSettingsPath, 'utf8');
      settings = JSON.parse(content);
    } catch {
      // File missing or invalid — start fresh
    }

    if (!settings.hooks) settings.hooks = {};

    // Check if PostToolUse hook already registered
    const existing = settings.hooks.PostToolUse;
    const alreadyRegistered = Array.isArray(existing) &&
      existing.some(entry =>
        Array.isArray(entry.hooks) &&
        entry.hooks.some(h => h.command && h.command.includes('bmad-party-speak'))
      );

    if (!alreadyRegistered) {
      if (!Array.isArray(settings.hooks.PostToolUse)) {
        settings.hooks.PostToolUse = [];
      }
      settings.hooks.PostToolUse.push({
        hooks: [{ type: 'command', command: hookCommand }]
      });
      await fs.writeFile(globalSettingsPath, JSON.stringify(settings, null, 2));
      spinner.succeed(chalk.green('BMAD party mode TTS hook configured!\n'));
    } else {
      // Script still updated above — just note settings unchanged
      spinner.succeed(chalk.green('BMAD party mode TTS hook up to date\n'));
    }
  } catch (error) {
    spinner.warn(chalk.yellow(`BMAD party mode hook setup skipped: ${error.message}\n`));
  }
}

/**
 * Ensure target directory is a git repo (required for Claude Code hook context injection)
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 */
async function ensureGitRepo(targetDir, spinner) {
  const gitDir = path.join(targetDir, '.git');
  try {
    await fs.access(gitDir);
    // Already a git repo
  } catch {
    console.log(chalk.cyan('\n🔧 Initializing git repository (required for Claude Code hooks)...'));
    try {
      const { execSync: execSyncLocal } = await import('child_process');
      execSyncLocal('git init', { cwd: targetDir, stdio: 'pipe' });
      // Stage only files that exist
      execSyncLocal('git add .', { cwd: targetDir, stdio: 'pipe' });
      execSyncLocal('git commit -m "chore: initialize AgentVibes"', { cwd: targetDir, stdio: 'pipe' });
      console.log(chalk.green('✓ Git repository initialized (required for TTS hooks)'));
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not initialize git repo - TTS hooks may not work: ${error.message}`));
    }
  }
}

/**
 * Install plugin manifest
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 */
async function installPluginManifest(targetDir, spinner) {
  const srcPluginManifest = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');

  // Check if source plugin manifest exists (optional feature)
  try {
    await fs.access(srcPluginManifest);
  } catch {
    // Source doesn't exist - skip silently as this is optional
    return;
  }

  spinner.start('Installing AgentVibes plugin manifest...');
  const pluginDir = path.join(targetDir, '.claude-plugin');
  const destPluginManifest = path.join(pluginDir, 'plugin.json');

  try {
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.copyFile(srcPluginManifest, destPluginManifest);
    spinner.succeed(chalk.green('Plugin manifest installed!\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to install plugin manifest: ' + error.message + '\n'));
  }
}

/**
 * Check if Piper is installed and optionally install it
 * @param {string} targetDir - Target installation directory
 * @param {Object} options - Installation options
 */
async function checkAndInstallPiper(targetDir, options) {
  try {
    const { execSync } = await import('node:child_process');

    try {
      execSync('command -v piper', { stdio: 'ignore' }); // NOSONAR - Safe: fixed command, no user input
      console.log(chalk.green('✅ Piper TTS is already installed\n'));

      // Check if voices are installed
      const piperVoicesDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'piper-voices');
      let hasVoices = false;

      try {
        if (fsSync.existsSync(piperVoicesDir)) {
          const files = fsSync.readdirSync(piperVoicesDir);
          const voiceFiles = files.filter(f => f.endsWith('.onnx'));
          hasVoices = voiceFiles.length > 0;

          if (hasVoices) {
            console.log(chalk.green(`   Found ${voiceFiles.length} voice model(s)\n`));
            return;
          }
        }
      } catch {
        // Ignore errors, fall through to download voices
      }

      // Piper installed but no voices - download them
      console.log(chalk.yellow('   No voice models found - downloading recommended voices...\n'));
      const piperDownloadPath = path.join(targetDir, '.claude', 'hooks', 'piper-download-voices.sh');

      try {
        if (fsSync.existsSync(piperDownloadPath)) {
          execScript(`${piperDownloadPath} --yes`, {
            stdio: options.silent ? 'pipe' : 'inherit',
            env: process.env
          });
          console.log(chalk.green('\n✅ Voice models downloaded successfully!\n'));
        } else {
          console.log(chalk.yellow('   Voice download script not found. You can download voices later with:'));
          console.log(chalk.cyan('   ~/.claude/hooks/piper-download-voices.sh\n'));
        }
      } catch (error) {
        console.log(chalk.yellow('\n⚠️  Voice download failed'));
        console.log(chalk.gray('   You can download voices later by running:'));
        console.log(chalk.cyan(`   ${piperDownloadPath}\n`));
      }

      return;
    } catch {
      console.log(chalk.yellow('⚠️  Piper TTS binary not detected\n'));

      let installPiper = true;
      if (!options.yes) {
        const { confirmPiperInstall } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmPiperInstall',
            message: 'Would you like to install Piper TTS now? (Recommended)',
            default: true,
          },
        ]);
        installPiper = confirmPiperInstall;
      }

      if (installPiper) {
        // Check if we're on Termux/Android
        if (isTermux()) {
          console.log(chalk.green('\n📱 Android environment detected!'));
          console.log(chalk.cyan('📦 Installing Piper TTS with Termux-specific setup...\n'));
          console.log(chalk.gray('   This will install proot-distro and set up Piper in a Debian environment.\n'));
        } else {
          console.log(chalk.cyan('\n📦 Installing Piper TTS...\n'));
        }
        const piperInstallerPath = path.join(targetDir, '.claude', 'hooks', 'piper-installer.sh');

        try {
          execScript(`${piperInstallerPath} --non-interactive`, {
            stdio: options.silent ? 'pipe' : 'inherit',
            env: process.env
          });
          console.log(chalk.green('\n✅ Piper TTS installed successfully!\n'));
        } catch (error) {
          console.log(chalk.yellow('\n⚠️  Piper installation failed or was cancelled'));
          console.log(chalk.gray('   You can install it later by running:'));
          console.log(chalk.cyan(`   ${piperInstallerPath}`));
          if (isTermux()) {
            console.log(chalk.gray('   On Termux, this will use proot-distro for installation.\n'));
          } else {
            console.log(chalk.gray('   Or manually: pipx install piper-tts\n'));
          }
        }
      } else {
        console.log(chalk.yellow('\n⚠️  Skipping Piper installation'));
        console.log(chalk.gray('   You can install it later by running:'));
        console.log(chalk.cyan(`   ${targetDir}/.claude/hooks/piper-installer.sh`));
        if (!isTermux()) {
          console.log(chalk.gray('   Or manually: pipx install piper-tts\n'));
        }
      }
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Unable to auto-detect Piper installation'));
    console.log(chalk.gray('   Install manually if needed: pipx install piper-tts\n'));
  }
}

/**
 * Download a file from a URL, following redirects
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination file path
 * @returns {Promise<void>}
 */
async function downloadFile(url, destPath) {
  const https = await import('https');
  const MAX_REDIRECTS = 5;
  return new Promise((resolve, reject) => {
    const request = (reqUrl, redirectCount) => {
      if (redirectCount > MAX_REDIRECTS) {
        reject(new Error('Too many redirects'));
        return;
      }
      // Only follow HTTPS redirects (prevent downgrade to HTTP or file://)
      if (redirectCount > 0 && !reqUrl.startsWith('https://')) {
        reject(new Error(`Refused non-HTTPS redirect to: ${reqUrl}`));
        return;
      }
      const req = https.default.get(reqUrl, { timeout: 60000 }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location, redirectCount + 1);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }
        const fileStream = fsSync.createWriteStream(destPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => { fileStream.close(); resolve(); });
        fileStream.on('error', (err) => {
          fileStream.close();
          // Clean up partial file on error
          try { fsSync.unlinkSync(destPath); } catch {}
          reject(err);
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Download timed out')); });
    };
    request(url, 0);
  });
}

/**
 * Check and install Piper TTS on Windows
 * Downloads piper_windows_amd64.zip from GitHub, extracts via PowerShell,
 * and downloads default voice from HuggingFace
 * @param {string} targetDir - Target installation directory
 * @param {Object} options - Installation options
 */
async function checkAndInstallPiperWindows(targetDir, options) {
  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
  if (!localAppData) {
    console.log(chalk.red('Could not determine LOCALAPPDATA directory.\n'));
    return;
  }
  const piperDir = path.join(localAppData, 'Programs', 'Piper');
  const piperExe = path.join(piperDir, 'piper.exe');
  const spinner = ora();

  if (fsSync.existsSync(piperExe)) {
    console.log(chalk.green('✓ Piper TTS is already installed at ' + piperDir + '\n'));
    return;
  }

  // Also check PATH — piper may be installed outside the standard location
  if (isPiperInstalled()) {
    console.log(chalk.green('✓ Piper TTS is already available in PATH\n'));
    return;
  }

  spinner.start('Downloading Piper TTS for Windows...');
  try {
    await fs.mkdir(piperDir, { recursive: true });
    const zipPath = path.join(piperDir, 'piper_windows_amd64.zip');
    const piperUrl = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip';
    await downloadFile(piperUrl, zipPath);
    spinner.text = 'Extracting Piper...';
    const { execSync: execSyncLocal } = await import('child_process');
    // Escape single quotes to prevent PowerShell injection
    const safeZipPath = zipPath.replace(/'/g, "''");
    const safePiperDir = piperDir.replace(/'/g, "''");
    execSyncLocal(`powershell -NoProfile -Command "Expand-Archive -Path '${safeZipPath}' -DestinationPath '${safePiperDir}' -Force"`, { stdio: 'pipe' });
    // Move files from nested piper/ subdirectory to piperDir
    const nestedDir = path.join(piperDir, 'piper');
    if (fsSync.existsSync(nestedDir)) {
      const files = await fs.readdir(nestedDir);
      for (const file of files) {
        const src = path.join(nestedDir, file);
        const dest = path.join(piperDir, file);
        if (!fsSync.existsSync(dest)) {
          await fs.rename(src, dest);
        }
      }
      await fs.rm(nestedDir, { recursive: true, force: true });
    }
    await fs.unlink(zipPath).catch(() => {});
    spinner.succeed(chalk.green('Piper TTS installed!\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to install Piper: ' + error.message));
    console.log(chalk.yellow('You can install Piper manually from: https://github.com/rhasspy/piper/releases\n'));
    return;
  }

  // Download default voice
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    console.log(chalk.yellow('Could not determine home directory, skipping voice download.\n'));
    return;
  }
  const voicesDir = path.join(homeDir, '.claude', 'piper-voices');
  const voiceName = 'en_US-lessac-medium';
  const modelFile = path.join(voicesDir, voiceName + '.onnx');
  if (!fsSync.existsSync(modelFile)) {
    spinner.start('Downloading default voice (en_US-lessac-medium)...');
    try {
      await fs.mkdir(voicesDir, { recursive: true });
      const modelUrl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/${voiceName}.onnx`;
      const configUrl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/${voiceName}.onnx.json`;
      await downloadFile(modelUrl, modelFile);
      await downloadFile(configUrl, modelFile + '.json');
      spinner.succeed(chalk.green('Default voice downloaded!\n'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to download voice: ' + error.message));
      console.log(chalk.yellow('You can download voices manually later.\n'));
    }
  }
}

/**
 * Security: Validate that a path is safe and doesn't contain traversal sequences
 * @param {string} targetPath - Path to validate
 * @param {string} basePath - Base directory that targetPath must be within
 * @returns {boolean} - True if path is safe
 */
function isPathSafe(targetPath, basePath) {
  const resolved = path.resolve(targetPath);
  const baseResolved = path.resolve(basePath);
  // Ensure the resolved path is actually within basePath, not just a prefix match
  // e.g., /projectX should NOT be considered within /project
  // We check that resolved either equals baseResolved or starts with baseResolved + separator
  return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
}

/**
 * Handle MCP configuration file creation/detection
 * Offers to create .mcp.json in project directory if it doesn't exist
 * @param {string} targetDir - Target installation directory
 * @param {Object} options - Installation options (includes 'yes' for auto-confirm)
 */
async function handleMcpConfiguration(targetDir, options) {
  const mcpConfigPath = path.join(targetDir, '.mcp.json');

  // .mcp.json registers the AgentVibes MCP server for Claude Code, enabling
  // natural language control (text_to_speech, get_config, set_voice, etc.).
  //
  // AGENTVIBES_MCP_FALLBACK=copilot is the identity for non-Claude-Code tools
  // that read .mcp.json (primarily VS Code Copilot, which reads .mcp.json
  // with precedence over its own .vscode/mcp.json).  Claude Code is
  // auto-detected via CLAUDECODE=1 which takes priority over the fallback.
  const mcpConfig = {
    mcpServers: {
      agentvibes: {
        command: 'npx',
        args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
        env: { AGENTVIBES_MCP_FALLBACK: 'copilot' }
      }
    }
  };

  let mcpExists = false;
  try {
    await fs.access(mcpConfigPath);
    mcpExists = true;
  } catch { /* doesn't exist */ }

  if (mcpExists) {
    // Upgrade: ensure agentvibes entry exists with fallback env
    let parseFailed = false;
    try {
      const existing = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8'));
      // Guard: non-object root (arrays/primitives are valid JSON but wrong shape)
      if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
        console.log(chalk.yellow(
          `⚠️  ${mcpConfigPath} has a non-object root — skipping MCP registration. Fix the file manually and re-run.`
        ));
        return;
      }
      // Guard: mcpServers must be a plain object
      if (!existing.mcpServers || typeof existing.mcpServers !== 'object' || Array.isArray(existing.mcpServers)) {
        existing.mcpServers = {};
      }
      const current = existing.mcpServers.agentvibes;
      // Strip AGENTVIBES_LLM if present (causes identity collisions)
      if (current?.env?.AGENTVIBES_LLM) {
        delete current.env.AGENTVIBES_LLM;
      }
      // Ensure fallback is set
      const mergedEnv = { ...(current?.env ?? {}), AGENTVIBES_MCP_FALLBACK: 'copilot' };
      existing.mcpServers.agentvibes = {
        command: 'npx',
        args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server'],
        env: mergedEnv,
      };
      await fs.writeFile(mcpConfigPath, JSON.stringify(existing, null, 2) + '\n');
    } catch (err) {
      parseFailed = true;
      console.log(chalk.yellow(
        `⚠️  Could not update ${mcpConfigPath}: ${err.message}\n` +
        `   AgentVibes MCP server was NOT registered. Fix the file manually and re-run.`
      ));
    }
    if (!parseFailed) return;
    return;
  }

  // New install — create .mcp.json
  if (!options.yes) {
    const { confirmCreate } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmCreate',
      message: chalk.cyan('Create .mcp.json for AgentVibes MCP server? (enables natural language voice control)'),
      default: true,
    }]);
    if (!confirmCreate) return;
  }

  try {
    await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n');
    console.log(
      boxen(
        chalk.green.bold('✅ MCP Configuration Created!\n\n') +
        chalk.white('AgentVibes MCP server registered in ') + chalk.cyan('.mcp.json') + chalk.white('.\n') +
        chalk.green('Natural language voice control is ready!'),
        { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'double', borderColor: 'green' }
      )
    );
  } catch (err) {
    console.log(chalk.red(`\n✗ Failed to create .mcp.json: ${err.message}`));
  }
}

/**
 * Process TTS_INJECTION markers in BMAD files
 * Replaces markers with actual TTS instructions for both party mode and individual agents
 * @param {string} bmadPath - Absolute path to BMAD installation (e.g., /path/to/.bmad)
 * @param {string} targetDir - Base installation directory to validate bmadPath is within
 */
async function processBmadTtsInjections(bmadPath, targetDir) {
  // Security: Validate bmadPath is within targetDir (not process.cwd() which may differ
  // when called from BMAD's installer via npx with a different cwd)
  if (!isPathSafe(bmadPath, targetDir)) {
    console.error(chalk.red('⚠️  Security: Invalid BMAD path detected'));
    return;
  }
  const partyModeMarker = '<!-- TTS_INJECTION:party-mode -->';
  const agentTtsMarker = '<!-- TTS_INJECTION:agent-tts -->';

  const partyModeReplacement = `<critical>IMPORTANT: Always use the project BMAD speech entry point, never a global hook path.</critical>

If AgentVibes party mode is enabled, immediately trigger TTS with the agent's voice:
         - Use Bash tool: \`node bin/bmad-speak.js '[Agent Name]' '[dialogue]'\`
         - This speaks the dialogue with the agent's unique voice via the platform-specific bmad-speak script
         - Run each agent sequentially; do NOT background with & and do NOT run party mode TTS in parallel`;

  const agentTtsReplacement = `- When responding to user messages, speak your responses using TTS:
   Call: \`.claude/hooks/bmad-speak.sh '{agent-id}' '{response-text}'\` after each response
   Replace {agent-id} with YOUR agent ID from <agent id="..."> tag at top of this file
   Replace {response-text} with the text you just output to the user
   IMPORTANT: Use single quotes as shown - do NOT escape special characters like ! or $ inside single quotes
   Run in background (&) to avoid blocking`;

  // Process party mode file
  const partyModeFile = path.join(bmadPath, 'core/workflows/party-mode/instructions.md');
  try {
    let partyContent = await fs.readFile(partyModeFile, 'utf8');
    if (partyContent.includes(partyModeMarker)) {
      partyContent = partyContent.replaceAll(partyModeMarker, partyModeReplacement);
      await fs.writeFile(partyModeFile, partyContent, 'utf8');
    }
  } catch (error) {
    // Party mode file doesn't exist or already processed - skip
  }

  // Process all agent files
  const agentDirs = [
    path.join(bmadPath, 'core/agents'),
    path.join(bmadPath, 'bmm/agents'),
    path.join(bmadPath, 'bmgd/agents'),
    path.join(bmadPath, 'bmb/agents'),
    path.join(bmadPath, 'cis/agents'),
  ];

  for (const agentDir of agentDirs) {
    try {
      const files = await fs.readdir(agentDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const agentFile = path.join(agentDir, file);
          let content = await fs.readFile(agentFile, 'utf8');
          if (content.includes(agentTtsMarker)) {
            content = content.replaceAll(agentTtsMarker, agentTtsReplacement);
            await fs.writeFile(agentFile, content, 'utf8');
          }
        }
      }
    } catch (error) {
      // Agent directory doesn't exist - skip
    }
  }

  // Create default voice assignments for BMAD agents
  await createDefaultBmadVoiceAssignments(bmadPath);
}

async function createDefaultBmadVoiceAssignments(bmadPath) {
  const configDir = path.join(bmadPath, '_cfg');
  const voiceMapFile = path.join(configDir, 'agent-voice-map.csv');

  // Skip if voice map already exists
  try {
    await fs.access(voiceMapFile);
    return; // File exists, don't overwrite
  } catch {
    // File doesn't exist, create it
  }

  // Default voice assignments and intros for common BMAD agents
  // Note: BMAD installer also generates this file - these are fallback defaults
  // if AgentVibes is installed without BMAD or before BMAD
  const defaultVoices = `agent,voice,intro
bmad-master,en_US-lessac-medium,"Greetings! The BMad Master is here to orchestrate and guide you through any workflow."
analyst,en_US-kristin-medium,"Hi there! I'm Mary, your Business Analyst. I'll help uncover the real requirements."
architect,en_GB-alan-medium,"Hello! Winston here, your Architect. I'll ensure we build something scalable and pragmatic."
dev,en_US-joe-medium,"Hey! Amelia here, your Developer. Ready to turn specs into working code."
pm,en_US-ryan-high,"Hey team! John here, your Product Manager. Let's make sure we're building the right thing."
sm,en_US-amy-medium,"Hi everyone! Bob here, your Scrum Master. I'll keep us focused and moving forward."
tea,en_US-kusal-medium,"Hello! Murat here, your Test Architect. Quality is my obsession."
tech-writer,jenny,"Hi! I'm Paige, your Technical Writer. I'll make sure everything is documented clearly."
ux-designer,kristin,"Hey! Sally here, your UX Designer. The user experience is my top priority."
frame-expert,en_GB-alan-medium,"Hello! Saif here, your Visual Design Expert. I'll help visualize your ideas."
`;

  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(voiceMapFile, defaultVoices, 'utf8');
    console.log('✓ Created default BMAD agent voice assignments');
  } catch (error) {
    // Non-fatal error - voice assignments are optional
    console.log('Note: Could not create default voice assignments:', error.message);
  }
}

/**
 * Proactively create default BMAD voice assignments
 * Only creates if BMAD folder already exists (doesn't create folders proactively to avoid false legacy detection)
 * @param {string} targetDir - Target installation directory
 */
async function createDefaultBmadVoiceAssignmentsProactive(targetDir) {
  const bmadPaths = [
    path.join(targetDir, '.bmad'),
    path.join(targetDir, 'bmad'),
  ];

  const defaultVoices = `agent,voice
bmad-master,en_US-ryan-high
analyst,en_US-kristin-medium
architect,en_GB-alan-medium
dev,en_US-joe-medium
pm,en_US-lessac-medium
sm,en_US-amy-medium
tea,en_US-kusal-medium
tech-writer,jenny
ux-designer,kristin
frame-expert,en_GB-alan-medium
`;

  for (const bmadPath of bmadPaths) {
    // Only create if BMAD folder already exists
    // Don't create folders proactively - this triggers false legacy v4 detection in BMAD installer
    try {
      await fs.access(bmadPath);
    } catch {
      continue; // Folder doesn't exist, skip
    }

    const configDir = path.join(bmadPath, '_cfg');
    const voiceMapFile = path.join(configDir, 'agent-voice-map.csv');

    // Skip if voice map already exists
    try {
      await fs.access(voiceMapFile);
      continue; // File exists, don't overwrite
    } catch {
      // File doesn't exist, create it
    }

    try {
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(voiceMapFile, defaultVoices, 'utf8');
      console.log(`✓ Created default BMAD voice assignments in ${bmadPath}`);
    } catch (error) {
      // Non-fatal error - voice assignments are optional
      // Silent fail
    }
  }
}

/**
 * Detect and migrate old configuration from .claude/config/ and .claude/plugins/
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<boolean>} True if migration was performed
 */
/**
 * Check if any old config files exist
 * @param {string[]} paths - Array of paths to check
 * @returns {Promise<boolean>} True if any old config exists
 */
async function hasOldConfigFiles(paths) {
  for (const oldPath of paths) {
    try {
      await fs.access(oldPath);
      return true;
    } catch {
      // File doesn't exist, continue
    }
  }
  return false;
}

/**
 * Execute migration script
 * @param {string} migrationScript - Path to migration script
 * @param {string} targetDir - Target directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<boolean>} True if migration succeeded
 */
async function executeMigrationScript(migrationScript, targetDir, spinner) {
  try {
    await fs.access(migrationScript);

    // Execute migration script using execFileSync to prevent command injection
    // Uses top-level import of execFileSync (ESM-compatible, no require())
    execFileSync('bash', [migrationScript], { cwd: targetDir, stdio: 'pipe' });

    spinner.succeed(chalk.green('✓ Configuration migrated to .agentvibes/'));
    console.log(chalk.gray('   Old locations: .claude/config/, .claude/plugins/'));
    console.log(chalk.gray('   New location: .agentvibes/'));
    console.log('');

    return true;
  } catch (error) {
    spinner.warn(chalk.yellow('⚠️  Could not run migration script automatically'));
    console.log(chalk.gray(`   You can run it manually: .claude/hooks/migrate-to-agentvibes.sh`));
    console.log('');
    return false;
  }
}

async function detectAndMigrateOldConfig(targetDir, spinner) {
  const oldConfigPaths = [
    path.join(targetDir, '.claude', 'config', 'agentvibes.json'),
    path.join(targetDir, '.claude', 'config', 'bmad-voices.md'),
    path.join(targetDir, '.claude', 'config', 'bmad-voices-enabled.flag'),
    path.join(targetDir, '.claude', 'plugins', 'bmad-voices-enabled.flag'),
    path.join(targetDir, '.claude', 'plugins', 'bmad-party-mode-disabled.flag'),
  ];

  // Check if any old config exists
  if (!await hasOldConfigFiles(oldConfigPaths)) {
    return false; // No migration needed
  }

  spinner.info(chalk.yellow('🔄 Old configuration detected - migrating to .agentvibes/'));

  // Run migration script
  const migrationScript = path.join(targetDir, '.claude', 'hooks', 'migrate-to-agentvibes.sh');
  return await executeMigrationScript(migrationScript, targetDir, spinner);
}

/**
 * Handle BMAD integration (detection and TTS injection)
 * @param {string} targetDir - Target installation directory
 * @param {Object} options - Installation options (e.g., yes flag for non-interactive)
 * @returns {Promise<Object>} BMAD detection result
 */
async function handleBmadIntegration(targetDir, options = {}) {
  const bmadDetection = await detectBMAD(targetDir);
  const bmadDetected = bmadDetection.installed;

  if (!bmadDetected) {
    return bmadDetection;
  }

  const claudeDir = path.join(targetDir, '.claude');
  const versionLabel = bmadDetection.version === 6
    ? `v6 (${bmadDetection.detailedVersion})`
    : 'v4';

  console.log(chalk.green(`\n🎉 BMAD-METHOD ${versionLabel} detected!`));
  console.log(chalk.gray(`   Location: ${bmadDetection.bmadPath}`));

  const bmadConfigDir = path.join(targetDir, '.agentvibes', 'bmad');
  const enabledFlagPath = path.join(bmadConfigDir, 'bmad-voices-enabled.flag');
  const activationInstructionsPath = path.join(claudeDir, 'activation-instructions');

  await fs.mkdir(bmadConfigDir, { recursive: true });
  await fs.writeFile(enabledFlagPath, '');
  console.log(chalk.green('🎤 Auto-enabled BMAD voice plugin'));

  try {
    await fs.access(activationInstructionsPath);
  } catch {
    const activationContent = generateActivationInstructions(bmadDetection.version);
    await fs.writeFile(activationInstructionsPath, activationContent);
    console.log(chalk.green('📝 Created BMAD activation instructions'));
  }

  // Process TTS_INJECTION markers in BMAD files if they exist
  // This handles the case where BMAD was installed before AgentVibes
  await processBmadTtsInjections(bmadDetection.bmadPath, targetDir);

  // Create default voice assignments if they don't exist
  await createDefaultBmadVoiceAssignmentsProactive(targetDir);

  // Prompt user to inject TTS into BMAD agents (or auto-inject with --yes flag)
  let enableTtsInjection = options.yes; // Auto-enable with --yes flag

  if (!options.yes) {
    console.log(''); // Add spacing
    console.log(chalk.cyan.bold('🎤 AgentVibes TTS Integration for BMAD Agents\n'));
    console.log(chalk.white('AgentVibes can inject Text-to-Speech into your BMAD agents'));
    console.log(chalk.white('so each agent speaks with their own unique voice!\n'));
    console.log(chalk.gray('What this does:'));
    console.log(chalk.gray('  • Modifies agent activation instructions to include TTS'));
    console.log(chalk.gray('  • Each agent gets a unique voice (e.g., Mary, John, Winston)'));
    console.log(chalk.gray('  • Agents will speak when activated and during responses'));
    console.log(chalk.gray('  • Creates backups before making any changes\n'));
    console.log(chalk.cyan('Agents that will get unique voices:'));
    console.log(chalk.gray('  • Mary (analyst) → Female voice'));
    console.log(chalk.gray('  • John (pm) → Male voice'));
    console.log(chalk.gray('  • Winston (architect) → British voice'));
    console.log(chalk.gray('  • And 6+ more agents...\n'));
    console.log(chalk.yellow('You can disable this later with:'));
    console.log(chalk.gray('  .claude/hooks/bmad-tts-injector.sh disable\n'));

    const { enableTts } = await inquirer.prompt([{
      type: 'confirm',
      name: 'enableTts',
      message: chalk.yellow('Enable TTS for BMAD agents?'),
      default: true
    }]);

    enableTtsInjection = enableTts;
  }

  if (enableTtsInjection) {
    const injectorScript = path.join(claudeDir, 'hooks', 'bmad-tts-injector.sh');
    try {
      // Run bmad-tts-injector.sh enable
      execSync(`bash "${injectorScript}" enable`, {
        cwd: targetDir,
        stdio: 'inherit'
      });
      console.log(chalk.green('✅ TTS injection completed successfully'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  TTS injection encountered issues'));
      console.log(chalk.gray('   You can retry manually with: .claude/hooks/bmad-tts-injector.sh enable'));
    }
  } else {
    console.log(chalk.gray('   Skipped TTS injection. You can enable it later with:'));
    console.log(chalk.gray('   .claude/hooks/bmad-tts-injector.sh enable'));
  }

  console.log(chalk.green('✅ BMAD agents will use agent-specific voices via bmad-speak.sh hook'));

  return bmadDetection;
}

/**
 * Show git commit history or fallback to release notes
 * @param {string} sourceDir - Source directory containing git repo or release notes
 */
async function showRecentChanges(sourceDir) {
  try {
    // Check if sourceDir actually has a .git directory
    const gitDir = path.join(sourceDir, '.git');
    const gitDirExists = await fs.access(gitDir).then(() => true).catch(() => false);

    if (!gitDirExists) {
      // No .git directory - skip git log to avoid showing parent repo's commits
      throw new Error('No .git directory in package - using release notes');
    }

    const { execSync } = await import('node:child_process');
    const gitLog = execSync( // NOSONAR - Safe: fixed command with controlled cwd, no user input
      'git log --oneline --no-decorate -5',
      { cwd: sourceDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();

    if (gitLog) {
      console.log(chalk.cyan('📝 Recent Changes:\n'));
      const commits = gitLog.split('\n');
      commits.forEach(commit => {
        const [hash, ...messageParts] = commit.split(' ');
        const message = messageParts.join(' ');
        console.log(chalk.gray(`   ${hash}`) + ' ' + chalk.white(message));
      });
      console.log();
    }
  } catch (error) {
    // Git not available - try RELEASE_NOTES.md fallback
    try {
      const releaseNotesPath = path.join(sourceDir, 'RELEASE_NOTES.md');
      const releaseNotes = await fs.readFile(releaseNotesPath, 'utf8');
      const lines = releaseNotes.split('\n');
      const commitsIndex = lines.findIndex(line => line.includes('## 📝 Recent Commits'));

      if (commitsIndex >= 0) {
        console.log(chalk.cyan('📝 Recent Changes:\n'));
        let inCodeBlock = false;
        for (let i = commitsIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim() === '```') {
            if (inCodeBlock) break;
            inCodeBlock = true;
            continue;
          }
          if (inCodeBlock && line.trim()) {
            // Security: Use bounded quantifiers to prevent ReDoS
            // Match git short hash (7-12 hex chars) followed by single space and message
            const match = line.match(/^([a-f0-9]{7,12}) (.*)$/);
            if (match) {
              const [, hash, message] = match;
              console.log(chalk.gray(`   ${hash}`) + ' ' + chalk.white(message));
            }
          }
        }
        console.log();
      }
    } catch {
      // No release notes available
    }
  }
}

/**
 * Update personality files (add new, update existing)
 * @param {string} targetDir - Target installation directory
 * @param {string} srcPersonalitiesDir - Source personalities directory
 * @returns {Promise<{new: number, updated: number}>} Counts of new and updated files
 */
async function updatePersonalityFiles(targetDir, srcPersonalitiesDir) {
  const destPersonalitiesDir = path.join(targetDir, '.claude', 'personalities');
  const allPersonalityFiles = await fs.readdir(srcPersonalitiesDir);
  let newPersonalities = 0;
  let updatedPersonalities = 0;

  for (const file of allPersonalityFiles) {
    const srcPath = path.join(srcPersonalitiesDir, file);
    const stat = await fs.stat(srcPath);

    if (!stat.isFile() || !file.endsWith('.md')) {
      continue;
    }

    const destPath = path.join(destPersonalitiesDir, file);

    try {
      await fs.access(destPath);
      await fs.copyFile(srcPath, destPath);
      updatedPersonalities++;
    } catch {
      await fs.copyFile(srcPath, destPath);
      newPersonalities++;
    }
  }

  return { new: newPersonalities, updated: updatedPersonalities };
}

/**
 * Create a silent spinner for update operations
 * @returns {Object} Mock spinner object
 */
function createSilentSpinner() {
  const s = { start: () => s, succeed: () => s, info: () => s, fail: () => s, warn: () => s, stop: () => s };
  return s;
}

/**
 * Update command files
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<number>} Number of commands updated
 */
async function updateCommandFiles(targetDir, spinner) {
  spinner.text = 'Updating commands...';
  const commandsDir = path.join(targetDir, '.claude', 'commands', 'agent-vibes');
  const srcCommandsDir = path.join(__dirname, '..', '.claude', 'commands', 'agent-vibes');
  const commandFiles = await fs.readdir(srcCommandsDir);

  for (const file of commandFiles) {
    const srcPath = path.join(srcCommandsDir, file);
    const destPath = path.join(commandsDir, file);
    await fs.copyFile(srcPath, destPath);
  }

  return commandFiles.length;
}

/**
 * Critical hooks that must always be kept up-to-date in every installation,
 * including the global ~/.claude/hooks/ directory.
 * These hooks contain bug fixes (e.g. markdown stripping) that must propagate
 * on every `npx agentvibes update` regardless of target directory.
 */
const CRITICAL_HOOKS = ['stop-tts.sh', 'stop.sh', 'play-tts.sh', 'session-start-tts.sh', 'bmad-party-speak.sh'];
const CRITICAL_HOOKS_WINDOWS = ['play-tts.ps1', 'session-start-tts.ps1', 'bmad-speak.ps1', 'bmad-party-speak.ps1'];

/**
 * Update critical hooks in the global ~/.claude/hooks/ directory if it exists.
 * Runs silently during every `update` — only touches files that are already installed.
 * @param {string} srcHooksDir - Source hooks directory from the package
 * @param {string} [homeDirOverride] - Override home dir (for testing only)
 * @returns {Promise<number>} Number of hooks updated
 */
async function updateGlobalHooks(srcHooksDir, homeDirOverride) {
  const globalHooksDir = path.join(homeDirOverride || os.homedir(), '.claude', 'hooks');
  let updated = 0;
  try {
    await fs.access(globalHooksDir);
  } catch {
    return 0; // global hooks dir not present — nothing to do
  }

  for (const hook of CRITICAL_HOOKS) {
    const destPath = path.join(globalHooksDir, hook);
    const srcPath = path.join(srcHooksDir, hook);
    try {
      await fs.access(destPath); // only update if already installed
      await fs.copyFile(srcPath, destPath);
      await fs.chmod(destPath, 0o750);
      updated++;
    } catch {
      // file not in global dir or src missing — skip silently
    }
  }

  // Also update Windows global hooks-windows dir if present
  const globalHooksWindowsDir = path.join(homeDirOverride || os.homedir(), '.claude', 'hooks-windows');
  const srcHooksWindowsDir = path.join(path.dirname(srcHooksDir), 'hooks-windows');
  try {
    await fs.access(globalHooksWindowsDir);
    for (const hook of CRITICAL_HOOKS_WINDOWS) {
      const destPath = path.join(globalHooksWindowsDir, hook);
      const srcPath = path.join(srcHooksWindowsDir, hook);
      try {
        await fs.access(destPath); // only update if already installed
        await fs.copyFile(srcPath, destPath);
        updated++;
      } catch {
        // file not in global dir or src missing — skip silently
      }
    }
  } catch {
    // hooks-windows dir not present — nothing to do
  }

  return updated;
}

/**
 * Perform all update operations
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<Object>} Update results
 */
async function performUpdateOperations(targetDir, spinner) {
  const silentSpinner = createSilentSpinner();

  // Update commands
  const commandCount = await updateCommandFiles(targetDir, spinner);
  console.log(chalk.green(`\n✓ Updated ${commandCount} commands`));

  // Update hooks
  spinner.text = 'Updating TTS scripts...';
  const hookResult = await copyHookFiles(targetDir, silentSpinner);
  console.log(chalk.green(`✓ Updated ${hookResult.count} TTS scripts`));

  // Also update critical hooks in global ~/.claude/hooks/ if present (fixes stale installs)
  const hooksSubdir = isNativeWindows() ? 'hooks-windows' : 'hooks';
  const srcHooksDir = path.join(__dirname, '..', '.claude', hooksSubdir);
  const globalHooksUpdated = await updateGlobalHooks(srcHooksDir);
  if (globalHooksUpdated > 0) {
    console.log(chalk.green(`✓ Updated ${globalHooksUpdated} critical scripts in ~/.claude/hooks/`));
  }

  // Update personalities
  spinner.text = 'Updating personality templates...';
  const srcPersonalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
  const personalityResult = await updatePersonalityFiles(targetDir, srcPersonalitiesDir);
  console.log(chalk.green(`✓ Updated ${personalityResult.updated} personalities, added ${personalityResult.new} new`));

  // Update plugin files
  const pluginFileCount = await copyPluginFiles(targetDir, silentSpinner);
  if (pluginFileCount > 0) {
    console.log(chalk.green(`✓ Updated ${pluginFileCount} BMAD plugin files`));
  }

  // Update BMAD config files
  const bmadConfigFileCount = await copyBmadConfigFiles(targetDir, silentSpinner);
  if (bmadConfigFileCount > 0) {
    console.log(chalk.green(`✓ Updated ${bmadConfigFileCount} BMAD config files`));
  }

  // Update background music files
  const backgroundMusicUpdateResult = await copyBackgroundMusicFiles(targetDir, silentSpinner);
  if (backgroundMusicUpdateResult.count > 0) {
    console.log(chalk.green(`✓ Installed ${backgroundMusicUpdateResult.count} background music track${backgroundMusicUpdateResult.count === 1 ? '' : 's'}`));
  }

  // Update config files
  const configFileCount = await copyConfigFiles(targetDir, silentSpinner);
  if (configFileCount > 0) {
    console.log(chalk.green(`✓ Installed ${configFileCount} config file${configFileCount === 1 ? '' : 's'}`));
  }

  // Update settings.json
  spinner.text = 'Updating AgentVibes hook configuration...';
  await configureSessionStartHook(targetDir, silentSpinner);
  await configurePartyModeHook(targetDir, silentSpinner);
  await ensureGitRepo(targetDir, silentSpinner);

  // Detect and migrate old configuration
  spinner.text = 'Checking for old configuration...';
  await detectAndMigrateOldConfig(targetDir, spinner);

  return {
    commandCount,
    hookCount: hookResult.count,
    personalityResult,
    pluginFileCount
  };
}

/**
 * Display update summary
 * @param {Object} results - Update results
 */
function displayUpdateSummary(results) {
  console.log(chalk.cyan('📦 Update Summary:'));
  console.log(chalk.white(`   • ${results.commandCount} commands updated`));
  console.log(chalk.white(`   • ${results.hookCount} TTS scripts updated`));
  console.log(chalk.white(`   • ${results.personalityResult.new + results.personalityResult.updated} personality templates (${results.personalityResult.new} new, ${results.personalityResult.updated} updated)`));
  if (results.pluginFileCount > 0) {
    console.log(chalk.white(`   • ${results.pluginFileCount} BMAD plugin files updated`));
  }
  console.log('');
}

/**
 * Update AgentVibes files in target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} options - Update options
 */
async function updateAgentVibes(targetDir, options) {
  const spinner = ora('Updating AgentVibes...').start();

  try {
    // Perform all update operations
    const updateResults = await performUpdateOperations(targetDir, spinner);

    spinner.succeed(chalk.green.bold('\n✨ Update complete!\n'));

    // Display summary
    displayUpdateSummary(updateResults);

    // Show recent changes
    await showRecentChanges(path.join(__dirname, '..'));

    console.log(chalk.gray('💡 Changes will take effect immediately!'));
    console.log(chalk.gray('   Try the new personalities with: /agent-vibes:personality list\n'));

  } catch (error) {
    spinner.fail('Update failed!');
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

// Installation function
async function install(options = {}) {
  const currentDir = process.env.INIT_CWD || process.cwd();

  // Global pagination constants (used throughout install flow)
  const configPages = 4; // System Dependencies + Provider + Audio + Verbosity
  const configOffset = 0;

  // Loop to allow going back to welcome screen
  let lang = 'en';
  let userConfig = null;
  const isNonInteractive = options.yes || options.nonInteractive || process.env.AGENT_VIBES_NON_INTERACTIVE === '1';
  while (!userConfig) {
    // Language selection screen — skip in non-interactive / CI mode
    if (!isNonInteractive) {
      lang = await selectLanguage(lang);
    }
    showWelcome();

    // Show release notes and recent changes after welcome banner
    console.log(getReleaseInfoBoxen());
    console.log('');
    await showRecentChanges(path.join(__dirname, '..'));

    console.log(chalk.cyan('\n📍 Installation Details:'));
    console.log(chalk.gray(`   Install location: ${currentDir}/.claude/`));
    console.log(chalk.yellow(`   Package version: ${VERSION}`));

    // Prompt to continue (gives user time to read welcome banner)
    if (!options.yes) {
      console.log(''); // Add spacing before prompt

      const { continueToConfig } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueToConfig',
        message: chalk.yellow('Ready to configure AgentVibes?'),
        default: true
      }]);

      if (!continueToConfig) {
        console.log(chalk.yellow('\n✋ Installation cancelled.'));
        process.exit(0);
      }
    }

    // Collect configuration through paginated flow (totalPages will be updated later)
    // Returns null if user wants to go back to welcome
    userConfig = await collectConfiguration({
      ...options,
      lang,
      pageOffset: configOffset,
      totalPages: configPages // Temporary, will show correct count later
    });
  }

  const selectedProvider = userConfig.provider;
  const piperVoicesPath = userConfig.piperPath;
  const targetDir = options.directory || currentDir;

  // Non-interactive mode: structured logging and piper validation before install
  if (options.nonInteractive || process.env.AGENT_VIBES_NON_INTERACTIVE === '1') {
    console.log(`[AV] Non-interactive mode detected`);
    console.log(`[AV] Provider: ${selectedProvider} | Platform: ${process.platform}`);

    if (isPiperProvider(selectedProvider) && !isPiperInstalled()) {
      process.stderr.write(`[AV ERROR] Piper binaries not found.\n`);
      process.stderr.write(`[AV] To install Piper manually, run:\n`);
      process.stderr.write(`[AV]   npx agentvibes --install-piper\n`);
      process.stderr.write(`[AV] Or visit: https://github.com/paulpreibisch/AgentVibes#-installation\n`);
      process.exit(1);
    }

    console.log(`[AV] Installing to: ${targetDir}/.claude/`);
  }

  // Confirm and start installation (skip in non-interactive / --yes mode)
  if (!options.yes && !options.nonInteractive && process.env.AGENT_VIBES_NON_INTERACTIVE !== '1') {
    const { startInstall } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'startInstall',
        message: chalk.yellow('✅ Start Installation?'),
        default: true,
      },
    ]);

    if (!startInstall) {
      console.log(chalk.red('\n❌ Installation cancelled.\n'));
      process.exit(0);
    }
  }

  // Silent spinner for copy functions — suppresses per-file output
  const silentSpinner = createSilentSpinner();

  console.log('');
  const spinner = ora('Installing AgentVibes...').start();

  try {
    // Create .claude directory structure
    const claudeDir = path.join(targetDir, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');
    const hooksDir = path.join(claudeDir, isNativeWindows() ? 'hooks-windows' : 'hooks');
    const audioDir = path.join(claudeDir, 'audio');
    const tracksDir = path.join(audioDir, 'tracks');
    await fs.mkdir(commandsDir, { recursive: true });
    await fs.mkdir(hooksDir, { recursive: true });
    await fs.mkdir(tracksDir, { recursive: true });

    // Copy all files silently
    await copyCommandFiles(targetDir, silentSpinner);
    await copyHookFiles(targetDir, silentSpinner);
    await copyPersonalityFiles(targetDir, silentSpinner);
    await copyPluginFiles(targetDir, silentSpinner);
    await copyBmadConfigFiles(targetDir, silentSpinner);
    await copyBackgroundMusicFiles(targetDir, silentSpinner);
    await copyConfigFiles(targetDir, silentSpinner);
    await copyCodexFiles(targetDir, silentSpinner);
    await configureSessionStartHook(targetDir, silentSpinner);
    await configurePartyModeHook(targetDir, silentSpinner);
    await installPluginManifest(targetDir, silentSpinner);
    await ensureGitRepo(targetDir, silentSpinner);

    // Save provider configuration
    const providerConfigPath = path.join(claudeDir, 'tts-provider.txt');
    await fs.writeFile(providerConfigPath, selectedProvider);

    if (isPiperProvider(selectedProvider) && piperVoicesPath) {
      const piperConfigPath = path.join(claudeDir, 'piper-voices-dir.txt');
      await fs.writeFile(piperConfigPath, piperVoicesPath);
    }

    if (selectedProvider === 'termux-ssh' && userConfig.sshHost) {
      const sshHostConfigPath = path.join(claudeDir, 'termux-ssh-host.txt');
      await fs.writeFile(sshHostConfigPath, userConfig.sshHost);
    }

    // Set up receiver script if in receiver mode
    if (userConfig.isReceiver) {
      const receiverDir = path.join(process.env.HOME || process.env.USERPROFILE, '.agentvibes');
      await fs.mkdir(receiverDir, { recursive: true, mode: 0o700 });
      const templatePath = path.join(__dirname, '..', 'templates', 'agentvibes-receiver.sh');
      try {
        const templateContent = await fs.readFile(templatePath, 'utf8');
        // Install as play-remote.sh (ForceCommand target)
        const receiverScriptPath = path.join(receiverDir, 'play-remote.sh');
        await fs.writeFile(receiverScriptPath, templateContent, { mode: 0o755 });
        // Also install as receiver.sh for backward compatibility
        const legacyPath = path.join(receiverDir, 'receiver.sh');
        await fs.writeFile(legacyPath, templateContent, { mode: 0o755 });
      } catch {
        // Receiver script install failed — non-fatal
      }
    }

    // Save setup guide for SSH-remote installations (file only, no terminal output)
    if (selectedProvider === 'termux-ssh' || selectedProvider === 'ssh-pulseaudio') {
      const agentvibesDir = path.join(process.env.HOME || process.env.USERPROFILE, '.agentvibes');
      await fs.mkdir(agentvibesDir, { recursive: true, mode: 0o700 });

      const setupGuidePath = path.join(agentvibesDir, 'setup-guide.txt');
      const setupGuideContent = `AgentVibes SSH-Remote Setup Guide
=================================

What is Receiver Mode?
----------------------
This voiceless server has no speakers. Receiver mode lets you hear TTS
audio on a different device (phone/tablet) with speakers.

How it Works:
1. This server sends TEXT via SSH to your device
2. Your device generates audio locally with AgentVibes
3. You hear high-quality TTS with full voice effects

Benefits:
✓ Low bandwidth (text only, not audio files)
✓ Full AgentVibes features on your device
✓ Secure (SSH encrypted)
✓ Works anywhere with Tailscale

Quick Setup (5 minutes):

☐ Step 1: Install AgentVibes on target device
   npm install -g agentvibes

   The installer will auto-detect and configure receiver mode.

☐ Step 2: Setup SSH/Tailscale (pick one)

   Option A - Tailscale (easiest):
   1. Install Tailscale on both devices
   2. They'll auto-discover each other
   3. Use device name in SSH config

   Option B - Manual SSH:
   1. Copy your SSH key:
      ssh-copy-id user@your-device-ip
   2. Add to ~/.ssh/config:
      Host phone
          HostName your-device-ip
          User your-username
          Port 8022

☐ Step 3: Configure connection
   echo "${userConfig.sshHost || 'phone'}" > ~/.claude/ssh-remote-host.txt

☐ Step 4: Test it!
   agentvibes tts "Hello from server!"

Full Documentation:
https://github.com/paulpreibisch/AgentVibes/blob/main/docs/SSH_REMOTE_SETUP.md

Troubleshooting:
- Check SSH connection: ssh ${userConfig.sshHost || 'phone'} echo "Connected!"
- Verify AgentVibes on receiver: ssh ${userConfig.sshHost || 'phone'} which agentvibes
- Test receiver script: ssh ${userConfig.sshHost || 'phone'} ~/.agentvibes/receiver.sh "Test"
`;
      try {
        await fs.writeFile(setupGuidePath, setupGuideContent);
      } catch {
        // Setup guide write failed — non-fatal
      }
    }

    // Set default voice
    const voiceConfigPath = path.join(claudeDir, 'tts-voice.txt');
    let defaultVoice = userConfig.defaultVoice;
    if (!defaultVoice) {
      switch (selectedProvider) {
        case 'piper':          defaultVoice = 'en_US-ryan-high'; break;
        case 'macos':          defaultVoice = 'Samantha'; break;
        case 'sapi':           defaultVoice = 'Microsoft David Desktop'; break;
        case 'soprano':        defaultVoice = 'soprano-default'; break;
        case 'termux-ssh':     defaultVoice = 'android-system-default'; break;
        default:               defaultVoice = 'Samantha'; break;
      }
    }
    await fs.writeFile(voiceConfigPath, defaultVoice);

    // Sync voice + provider to global .agentvibes/config.json so TUI finds them
    // regardless of which directory it's launched from
    const globalAvDir = path.join(process.env.HOME || process.env.USERPROFILE, '.agentvibes');
    try {
      await fs.mkdir(globalAvDir, { recursive: true });
      const globalCfgPath = path.join(globalAvDir, 'config.json');
      let globalCfg = {};
      try { globalCfg = JSON.parse(await fs.readFile(globalCfgPath, 'utf8')); } catch { /* new file */ }
      globalCfg.voice = defaultVoice;
      globalCfg.provider = selectedProvider;
      await fs.writeFile(globalCfgPath, JSON.stringify(globalCfg, null, 2), { mode: 0o600 });
    } catch { /* best-effort global sync */ }

    // Detect and migrate old configuration
    await detectAndMigrateOldConfig(targetDir, silentSpinner);

    // Auto-install Piper if selected
    if (isPiperProvider(selectedProvider)) {
      spinner.text = 'Installing Piper TTS...';
      if (isNativeWindows()) {
        await checkAndInstallPiperWindows(targetDir, options);
      } else {
        await checkAndInstallPiper(targetDir, options);
      }
    }

    // Apply background music configuration
    const configDir = path.join(claudeDir, 'config');
    await fs.mkdir(configDir, { recursive: true });
    if (userConfig.backgroundMusic?.enabled) {
      await fs.writeFile(path.join(configDir, 'background-music-enabled.txt'), 'true');
      try {
        const audioEffectsPath = path.join(configDir, 'audio-effects.cfg');
        let audioEffectsContent = await fs.readFile(audioEffectsPath, 'utf-8');
        audioEffectsContent = audioEffectsContent.replace(
          /^default\|([^|]*)\|([^|]*)\|(.*)$/m,
          `default|$1|${userConfig.backgroundMusic.track}|$3`
        );
        await fs.writeFile(audioEffectsPath, audioEffectsContent);
      } catch {
        // Audio effects config not yet available — non-fatal
      }
    }

    // Persist language selection — validate against known codes before writing
    if (lang && /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/.test(lang)) {
      const langConfigPath = path.join(claudeDir, 'config', 'language.txt');
      await fs.mkdir(path.join(claudeDir, 'config'), { recursive: true });
      await fs.writeFile(langConfigPath, lang, { mode: 0o600 });
    }

    // Default translation to auto: syncs with BMAD communication_language if set, otherwise no translation
    const translateFile = path.join(claudeDir, 'tts-translate-to.txt');
    try { await fs.access(translateFile); } catch {
      await fs.writeFile(translateFile, 'auto', { mode: 0o600 });
    }

    // Apply verbosity, personality, pretext
    await fs.writeFile(path.join(claudeDir, 'tts-verbosity.txt'), userConfig.verbosity);
    if (userConfig.personality && userConfig.personality !== 'none') {
      await fs.writeFile(path.join(claudeDir, 'tts-personality.txt'), userConfig.personality);
    }
    if (userConfig.pretext && userConfig.pretext.trim()) {
      await fs.writeFile(path.join(configDir, 'tts-pretext.txt'), userConfig.pretext, { mode: 0o600 });
    } else {
      try { await fs.unlink(path.join(configDir, 'tts-pretext.txt')); } catch { /* ok */ }
    }

    // Apply reverb setting
    const selectedReverb = userConfig.reverb;
    if (selectedReverb && selectedReverb !== 'off') {
      const effectsManagerPath = path.join(targetDir, '.claude', 'hooks', 'effects-manager.sh');
      const validReverb = ['light', 'medium', 'heavy', 'cathedral'];
      if (validReverb.includes(selectedReverb)) {
        try {
          execFileSync('bash', [effectsManagerPath, 'set-reverb', selectedReverb, 'default'], { stdio: 'pipe' });
        } catch {
          // Reverb setting failed — non-fatal
        }
      }
    }

    // MCP configuration and BMAD voice assignments (silent)
    await handleMcpConfiguration(targetDir, { ...options, yes: true });
    await createDefaultBmadVoiceAssignmentsProactive(targetDir);
    await handleBmadIntegration(targetDir, { ...options, yes: true });

    if (options.nonInteractive || process.env.AGENT_VIBES_NON_INTERACTIVE === '1') {
      console.log(`[AV] Provider: ${selectedProvider} | Location: ${targetDir}/.claude/ | Version: ${VERSION}`);
    }

    console.log('');
    spinner.succeed(chalk.green('AgentVibes installed successfully!'));
    console.log('');
    console.log(chalk.magenta('  \u2661  Sponsor this Developer  github.com/sponsors/paulpreibisch'));
    console.log('');

    if (!(options.nonInteractive || process.env.AGENT_VIBES_NON_INTERACTIVE === '1')) {
      // Clean final summary
      console.log('');
      console.log(chalk.green.bold('  ✅ Installation Complete'));
      console.log(chalk.gray(`     Provider:  ${selectedProvider}`));
      console.log(chalk.gray(`     Location:  ${targetDir}/.claude/`));
      console.log(chalk.gray(`     Version:   ${VERSION}`));
      console.log('');
      console.log(chalk.white('  Run ') + chalk.cyan('npx agentvibes') + chalk.white(' to open the console.'));
      console.log('');
    }

  } catch (error) {
    if (options.nonInteractive || process.env.AGENT_VIBES_NON_INTERACTIVE === '1') {
      process.stderr.write(`[AV ERROR] Installation failed: ${error.message}\n`);
    } else {
      spinner.fail('Installation failed!');
      console.error(chalk.red('\n❌ Error:'), error.message);
    }
    process.exit(1);
  }
}

// CLI setup
program
  .version(VERSION)
  .description('AgentVibes - Now your AI Agents can finally talk back! TTS Voice for Claude Code');

program
  .command('install')
  .description('Install AgentVibes voice commands')
  .option('-d, --directory <path>', 'Installation directory (default: current directory)')
  .option('-y, --yes', 'Skip confirmation prompt (auto-confirm)')
  .option('--non-interactive', 'Skip TUI and install with defaults (for AI agents and CI pipelines). Also triggered by AGENT_VIBES_NON_INTERACTIVE=1 env var.')
  .action(async (options) => {
    // Merge env var trigger into options
    if (process.env.AGENT_VIBES_NON_INTERACTIVE === '1') {
      options.nonInteractive = true;
    }
    if (options.nonInteractive) {
      options.yes = true;
    }
    await install(options);
  });

program
  .command('update')
  .description('Update AgentVibes to latest version from source')
  .option('-d, --directory <path>', 'Installation directory (default: current directory)')
  .option('-y, --yes', 'Skip confirmation prompt (auto-confirm)')
  .action(async (options) => {
    const currentDir = process.env.INIT_CWD || process.cwd();
    const targetDir = options.directory || currentDir;

    showWelcome();

    console.log(chalk.cyan('📍 Update Details:'));
    console.log(chalk.gray(`   Update location: ${targetDir}/.claude/`));
    console.log(chalk.gray(`   Package version: ${VERSION}`));

    const releaseInfo = getReleaseInfoBoxen();
    if (releaseInfo) console.log(releaseInfo);

    // Check if already installed
    const commandsDir = path.join(targetDir, '.claude', 'commands', 'agent-vibes');
    let isInstalled = false;
    try {
      await fs.access(commandsDir);
      isInstalled = true;
    } catch {}

    if (!isInstalled) {
      console.log(chalk.red('\n❌ AgentVibes is not installed in this directory.'));
      console.log(chalk.gray('   Run: npx agentvibes install\n'));
      process.exit(1);
    }

    console.log(chalk.cyan('📦 What will be updated:'));
    console.log(chalk.gray('   • Slash commands (keep your customizations)'));
    console.log(chalk.gray('   • TTS scripts'));
    console.log(chalk.gray('   • Personality templates (new personalities added)'));
    console.log(chalk.gray('   • Output styles\n'));

    // Confirmation
    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: chalk.yellow('Update AgentVibes to latest version?'),
          default: true,
        },
      ]);

      if (!confirm) {
        console.log(chalk.red('\n❌ Update cancelled.\n'));
        process.exit(0);
      }
    } else {
      console.log(chalk.green('✓ Auto-confirmed (--yes flag)\n'));
    }

    // Perform update using helper function
    await updateAgentVibes(targetDir, options);

    // Recommend MCP Server installation
    console.log(
      boxen(
        chalk.cyan.bold('🎙️ Want Natural Language Control?\n\n') +
        chalk.white.bold('AgentVibes MCP Server - Easiest Way to Use AgentVibes!\n\n') +
        chalk.gray('Use Claude Desktop or Warp Terminal to control TTS with natural language:\n') +
        chalk.gray('   "Switch to Aria voice" instead of /agent-vibes:switch "Aria"\n') +
        chalk.gray('   "Set personality to sarcastic" instead of /agent-vibes:personality sarcastic\n\n') +
        chalk.cyan('👉 Setup Guide:\n') +
        chalk.cyan.bold('https://github.com/paulpreibisch/AgentVibes#-mcp-server-easiest-way-to-use-agentvibes\n\n') +
        chalk.gray('Quick Install:\n') +
        chalk.white('   npx agentvibes setup-mcp-for-claude-desktop') + chalk.gray(' (Claude Desktop)\n') +
        chalk.white('   npx -y agentvibes-mcp-server') + chalk.gray(' (Direct run)'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );
  });

program
  .command('uninstall')
  .description('Uninstall AgentVibes from current project')
  .option('-d, --directory <path>', 'Installation directory (default: current directory)')
  .option('-y, --yes', 'Skip confirmation prompt (auto-confirm)')
  .option('--global', 'Also remove global configuration (~/.claude/, ~/.agentvibes/)')
  .option('--with-piper', 'Also remove Piper TTS installation (~/piper/)')
  .action(async (options) => {
    const currentDir = process.env.INIT_CWD || process.cwd();
    const targetDir = options.directory || currentDir;

    showWelcome();

    console.log(chalk.cyan('📍 Uninstall Details:'));
    console.log(chalk.gray(`   Target directory: ${targetDir}`));
    console.log(chalk.gray(`   Package version: ${VERSION}\n`));

    // Check if installed
    const commandsDir = path.join(targetDir, '.claude', 'commands', 'agent-vibes');
    let isInstalled = false;
    try {
      await fs.access(commandsDir);
      isInstalled = true;
    } catch {}

    if (!isInstalled) {
      console.log(chalk.yellow('⚠️  AgentVibes is not installed in this directory.'));
      console.log(chalk.gray(`   Directory checked: ${targetDir}/.claude/`));
      console.log(chalk.gray('   Nothing to uninstall.\n'));
      process.exit(0);
    }

    // Show what will be removed
    console.log(chalk.cyan('📦 What will be removed:\n'));

    const itemsToRemove = [];

    // Project-level items
    console.log(chalk.white.bold('  Project Files:'));
    itemsToRemove.push({ path: '.claude/commands/agent-vibes/', desc: 'AgentVibes slash commands' });
    itemsToRemove.push({ path: '.claude/hooks/', desc: 'TTS scripts' });
    itemsToRemove.push({ path: '.claude/personalities/', desc: 'Personality templates' });
    itemsToRemove.push({ path: '.claude/output-styles/', desc: 'Output style templates' });
    itemsToRemove.push({ path: '.claude/audio/', desc: 'Audio cache' });
    itemsToRemove.push({ path: '.claude/tts-*.txt', desc: 'TTS configuration files' });
    itemsToRemove.push({ path: '.claude/*.json', desc: 'AgentVibes settings' });
    itemsToRemove.push({ path: '.agentvibes/', desc: 'BMAD integration files' });

    for (const item of itemsToRemove) {
      console.log(chalk.gray(`   • ${item.path}`));
    }

    // Global items
    if (options.global) {
      console.log(chalk.white.bold('\n  Global Files:'));
      console.log(chalk.gray('   • ~/.claude/ (global configuration)'));
      console.log(chalk.gray('   • ~/.agentvibes/ (global cache)'));
    }

    // Piper TTS
    if (options.withPiper) {
      console.log(chalk.white.bold('\n  TTS Engine:'));
      console.log(chalk.gray('   • ~/piper/ (Piper TTS installation)'));
    }

    console.log('');

    // Confirmation
    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: chalk.yellow('Are you sure you want to uninstall AgentVibes?'),
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.green('\n✓ Uninstall cancelled. AgentVibes remains installed.\n'));
        process.exit(0);
      }
    } else {
      console.log(chalk.gray('✓ Auto-confirmed (--yes flag)\n'));
    }

    const spinner = ora('Uninstalling AgentVibes...').start();

    try {
      let removedCount = 0;

      // Remove project-level files
      const projectPaths = [
        path.join(targetDir, '.claude', 'commands', 'agent-vibes'),
        path.join(targetDir, '.claude', 'hooks'),
        path.join(targetDir, '.claude', 'hooks-windows'),
        path.join(targetDir, '.claude', 'personalities'),
        path.join(targetDir, '.claude', 'output-styles'),
        path.join(targetDir, '.claude', 'audio'),
        path.join(targetDir, '.agentvibes'),
      ];

      for (const dirPath of projectPaths) {
        try {
          await fs.rm(dirPath, { recursive: true, force: true });
          removedCount++;
        } catch (err) {
          // Ignore if directory doesn't exist
        }
      }

      // Remove TTS config files
      const configPatterns = [
        'tts-voice.txt',
        'tts-provider.txt',
        'tts-personality.txt',
        'tts-verbosity.txt',
        'tts-translate.txt',
        'tts-target-voice.txt',
        'tts-target-language.txt',
        'tts-language.txt',
        'personalities.json',
        'github-star-reminder.txt',
        'piper-voices-dir.txt',
        'verbosity.txt',
      ];

      for (const pattern of configPatterns) {
        const filePath = path.join(targetDir, '.claude', pattern);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          // Ignore if file doesn't exist
        }
      }

      // Remove global files if requested
      if (options.global) {
        const homedir = process.env.HOME || process.env.USERPROFILE;
        const globalPaths = [
          path.join(homedir, '.claude'),
          path.join(homedir, '.agentvibes'),
        ];

        for (const dirPath of globalPaths) {
          try {
            await fs.rm(dirPath, { recursive: true, force: true });
            removedCount++;
          } catch (err) {
            // Ignore if directory doesn't exist
          }
        }
      }

      // Remove Piper TTS if requested
      if (options.withPiper) {
        const homedir = process.env.HOME || process.env.USERPROFILE;
        const piperPath = path.join(homedir, 'piper');

        try {
          await fs.rm(piperPath, { recursive: true, force: true });
          removedCount++;
        } catch (err) {
          // Ignore if directory doesn't exist
        }
      }

      spinner.succeed(chalk.green('Successfully uninstalled AgentVibes!\n'));

      // Show summary
      console.log(
        boxen(
          chalk.green.bold('✓ Uninstall Complete\n\n') +
          chalk.gray('AgentVibes has been removed from this project.\n') +
          (options.global ? chalk.gray('Global configuration has been removed.\n') : '') +
          (options.withPiper ? chalk.gray('Piper TTS has been removed.\n') : '') +
          chalk.gray('\nTo reinstall: ') + chalk.cyan('npx agentvibes install\n') +
          chalk.gray('\nWe\'d love to know why you uninstalled!\n') +
          chalk.gray('Share feedback: ') + chalk.cyan('https://github.com/paulpreibisch/AgentVibes/issues'),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );

    } catch (err) {
      spinner.fail(chalk.red('Failed to uninstall AgentVibes'));
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show installation status')
  .action(async () => {
    console.log(chalk.cyan('Checking AgentVibes installation...\n'));

    // When running via npx, process.cwd() returns the npm cache directory
    // Use INIT_CWD (set by npm/npx) to get the actual user's working directory
    const targetDir = process.env.INIT_CWD || process.cwd();
    const commandsDir = path.join(targetDir, '.claude', 'commands', 'agent-vibes');
    const hooksDir = path.join(targetDir, '.claude', 'hooks');

    let installed = false;
    try {
      await fs.access(commandsDir);
      installed = true;
    } catch {}

    if (installed) {
      console.log(chalk.green('✅ AgentVibes is installed!'));
      console.log(chalk.gray(`   Commands: ${commandsDir}`));
      console.log(chalk.gray(`   Hooks: ${hooksDir}`));
    } else {
      console.log(chalk.yellow('⚠️  AgentVibes is not installed.'));
      console.log(chalk.gray('   Run: node src/installer.js install'));
    }

    // TTS providers configured
    console.log(chalk.green('\n✅ TTS providers: Piper TTS (free) and macOS Say (macOS only)'));
  });

program
  .command('setup-mcp-for-claude-desktop')
  .description('Setup AgentVibes MCP server for Claude Desktop (Windows/Mac/Linux)')
  .action(async () => {
    await installMCP();
  });

program
  .command('agentvibes-mcp-server')
  .description('Start AgentVibes MCP server')
  .action(async () => {
    // Run the bash wrapper script
    const mcpServerScript = path.join(__dirname, '..', 'bin', 'mcp-server');

    try {
      execScript(mcpServerScript, {
        stdio: 'inherit',
        env: process.env
      });
    } catch (error) {
      process.exit(error.status || 1);
    }
  });

// BMAD Voice Management Commands
program
  .command('preview-voice <voice-name>')
  .description('Preview a voice with sample text')
  .option('-t, --text <text>', 'Custom text to speak (default: sample text)')
  .action(async (voiceName, options) => {
    await previewVoice(voiceName, options);
  });

program
  .command('list-available-voices')
  .description('Show all available voices grouped by provider')
  .action(async () => {
    await listAvailableVoices();
  });

program
  .command('list-bmad-assigned-voices')
  .description('Show all BMAD agents with their current voice assignments')
  .action(async () => {
    await listBmadAssignedVoices();
  });

program
  .command('assign-voice <agent-id> <voice-name>')
  .description('Assign a voice to a specific BMAD agent')
  .action(async (agentId, voiceName) => {
    await assignVoice(agentId, voiceName);
  });

program
  .command('reset-bmad-voices')
  .description('Reset all BMAD agents to default voice assignments')
  .option('-y, --yes', 'Skip confirmation prompt (auto-confirm)')
  .action(async (options) => {
    await resetBmadVoices(options);
  });

// Story 1.4: Config Command - Post-install configuration
program
  .command('config <setting>')
  .description('Configure AgentVibes settings after installation')
  .usage('intro-text [--no-default]')
  .action(async (setting, options) => {
    if (setting === 'intro-text' || setting === 'pretext') {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const claudeDir = path.join(homeDir, '.claude');
      const pretextFile = path.join(claudeDir, 'config', 'tts-pretext.txt');

      // Read current pretext if it exists
      let currentPretext = '';
      try {
        if (fsSync.existsSync(pretextFile)) {
          currentPretext = fsSync.readFileSync(pretextFile, 'utf-8').trim();
        }
      } catch (err) {
        // Ignore read errors
      }

      // Prompt for new intro text
      const { newPretext } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newPretext',
          message: chalk.yellow('Enter new intro text (max 50 chars):'),
          default: currentPretext || '(none)',
          validate: (input) => {
            if (input === '(none)') return true;
            if (input.length > 50) return 'Max 50 characters';
            if (input.includes('\n') || input.includes('\r')) return 'No newlines allowed';
            return true;
          }
        }
      ]);

      // Handle the response
      if (newPretext === '(none)' || newPretext === '') {
        // Remove pretext
        try {
          await fs.unlink(pretextFile);
          console.log(chalk.green('✓ Intro text cleared\n'));
        } catch (err) {
          // File doesn't exist - that's fine
          console.log(chalk.green('✓ No intro text configured\n'));
        }
      } else {
        // Save new pretext
        try {
          const configDir = path.join(claudeDir, 'config');
          await fs.mkdir(configDir, { recursive: true });
          await fs.writeFile(pretextFile, newPretext, { mode: 0o600 });
          console.log(chalk.green(`✓ Intro text updated: "${newPretext}"\n`));
          console.log(chalk.cyan('Preview: ') + chalk.gray(`"${newPretext}" This is a sample response\n`));
        } catch (err) {
          console.log(chalk.red(`❌ Error saving intro text: ${err.message}\n`));
          process.exit(1);
        }
      }
    } else if (setting === 'music') {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const claudeDir = path.join(homeDir, '.claude');
      const musicTracksDir = path.join(claudeDir, 'audio', 'custom-music', 'tracks');
      const musicConfigFile = path.join(claudeDir, 'config', 'background-music.txt');
      const musicEnabledFile = path.join(claudeDir, 'config', 'background-music-enabled.txt');

      console.log(boxen(
        chalk.cyan.bold('🎵 Background Music Configuration\n\n') +
        chalk.white('Manage your custom background music settings.'),
        { padding: 1, borderColor: 'cyan', borderStyle: 'round' }
      ));

      // Read current music setting
      let currentMusic = null;
      let musicEnabled = false;

      try {
        if (fsSync.existsSync(musicEnabledFile)) {
          const enabled = fsSync.readFileSync(musicEnabledFile, 'utf-8').trim();
          musicEnabled = enabled === 'true' || enabled === '1';
        }
        if (fsSync.existsSync(musicConfigFile)) {
          currentMusic = fsSync.readFileSync(musicConfigFile, 'utf-8').trim();
        }
      } catch (err) {
        // Ignore read errors
      }

      // Display current setting
      console.log(chalk.gray('\nCurrent Settings:'));
      console.log(chalk.gray('  Background Music: ') + (musicEnabled ? chalk.green('Enabled') : chalk.yellow('Disabled')));

      if (currentMusic && musicEnabled) {
        const isCustom = currentMusic.startsWith('custom-') || !currentMusic.includes('agentvibes_');
        if (isCustom) {
          console.log(chalk.gray('  Track: ') + chalk.cyan(currentMusic) + chalk.yellow(' (Custom)'));
        } else {
          console.log(chalk.gray('  Track: ') + chalk.white(currentMusic) + chalk.gray(' (Default)'));
        }
      } else if (!musicEnabled) {
        console.log(chalk.gray('  Track: ') + chalk.gray('(None - music disabled)'));
      }
      console.log('');

      // Show menu
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: chalk.yellow('What would you like to do?'),
        choices: [
          { name: '🎵 Change custom music file', value: 'change' },
          { name: '🗑️  Remove custom music (use defaults)', value: 'remove' },
          { name: '🔄 Reset to factory defaults', value: 'reset' },
          { name: musicEnabled ? '🔇 Disable background music' : '🔊 Enable background music', value: 'toggle' },
          new inquirer.Separator(),
          { name: '← Back', value: 'back' }
        ]
      }]);

      if (action === 'change') {
        // Change music - reuse promptForCustomMusic from Story 4.5
        console.log('');
        const result = await promptForCustomMusic(claudeDir);

        if (result.success && result.filename) {
          // Update config to point to custom music
          const configDir = path.join(claudeDir, 'config');
          await fs.mkdir(configDir, { recursive: true });
          await fs.writeFile(musicConfigFile, result.filename, { mode: 0o600 });

          // Ensure music is enabled
          await fs.writeFile(musicEnabledFile, 'true', { mode: 0o644 });

          console.log(chalk.green(`\n✓ Background music updated to: ${result.filename}`));
          console.log(chalk.gray('  Changes take effect immediately\n'));
        } else if (result.error) {
          console.log(chalk.yellow(`\n⚠️  ${result.error}`));
          console.log(chalk.gray('  Keeping previous setting\n'));
        } else {
          console.log(chalk.gray('\n  No changes made\n'));
        }

      } else if (action === 'remove') {
        // Remove custom music - keep defaults
        const customMusicFiles = fsSync.existsSync(musicTracksDir) ?
          fsSync.readdirSync(musicTracksDir) : [];

        if (customMusicFiles.length === 0) {
          console.log(chalk.yellow('\n⚠️  No custom music files found\n'));
        } else {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Remove all custom music files?',
            default: false
          }]);

          if (confirm) {
            try {
              // Remove custom music files
              for (const file of customMusicFiles) {
                await fs.unlink(path.join(musicTracksDir, file));
              }

              // Reset to default music
              await fs.writeFile(musicConfigFile, 'agentvibes_soft_flamenco_loop.mp3', { mode: 0o600 });

              console.log(chalk.green('\n✓ Custom music removed, reverted to defaults\n'));
            } catch (err) {
              console.log(chalk.red(`\n❌ Error removing custom music: ${err.message}\n`));
            }
          } else {
            console.log(chalk.gray('\n  Cancelled\n'));
          }
        }

      } else if (action === 'reset') {
        // Reset to factory defaults
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Reset all music settings to factory defaults?',
          default: false
        }]);

        if (confirm) {
          try {
            // Reset to default track
            await fs.writeFile(musicConfigFile, 'agentvibes_soft_flamenco_loop.mp3', { mode: 0o600 });

            // Enable music
            await fs.writeFile(musicEnabledFile, 'true', { mode: 0o644 });

            console.log(chalk.green('\n✓ Reset to factory defaults'));
            console.log(chalk.gray('  Track: Soft Flamenco (Spanish guitar)'));
            console.log(chalk.gray('  Status: Enabled\n'));
          } catch (err) {
            console.log(chalk.red(`\n❌ Error resetting settings: ${err.message}\n`));
          }
        } else {
          console.log(chalk.gray('\n  Cancelled\n'));
        }

      } else if (action === 'toggle') {
        // Toggle music on/off
        try {
          const newState = !musicEnabled;
          await fs.writeFile(musicEnabledFile, newState ? 'true' : 'false', { mode: 0o644 });

          console.log(chalk.green(`\n✓ Background music ${newState ? 'enabled' : 'disabled'}\n`));
        } catch (err) {
          console.log(chalk.red(`\n❌ Error toggling music: ${err.message}\n`));
        }

      } else if (action === 'back') {
        console.log(chalk.gray('\n  No changes made\n'));
      }

    } else {
      console.log(chalk.red(`❌ Unknown setting: ${setting}`));
      console.log(chalk.gray('Available settings: intro-text, music\n'));
      process.exit(1);
    }
  });

// BMAD PR Testing Command
program
  .command('test-bmad-pr [pr-number]')
  .description('Test BMAD PR with AgentVibes integration (default: PR #934)')
  .action(async (prNumber = '934') => {
    const testScript = path.join(__dirname, '..', 'bin', 'test-bmad-pr');

    try {
      execScript(`${testScript} ${prNumber}`, {
        stdio: 'inherit',
        env: process.env
      });
    } catch (error) {
      process.exit(error.status || 1);
    }
  });

// Help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    program.outputHelp();
  });

/* c8 ignore start - CLI entry point, tested via subprocess */
// Only run CLI if this file is being executed directly
const __entryFile = fileURLToPath(import.meta.url);
let __argvFile;
try { __argvFile = fsSync.realpathSync(process.argv[1]); } catch { __argvFile = path.resolve(process.argv[1]); }
if (__entryFile === __argvFile) {
  program.parse(process.argv);

  // Show help if no command provided
  if (process.argv.slice(2).length === 0) {
    showWelcome();
    program.outputHelp();
  }
}
/* c8 ignore stop */

// Export functions for testing and TUI installer
export {
  isTermux, isNativeWindows, detectAndNotifyTermux,
  copyCommandFiles, copyHookFiles, copyPersonalityFiles,
  copyPluginFiles, copyBmadConfigFiles, copyBackgroundMusicFiles,
  copyConfigFiles, copyCodexFiles, configureSessionStartHook, configurePartyModeHook, ensureGitRepo,
  installPluginManifest, checkAndInstallPiper,
  updateGlobalHooks, CRITICAL_HOOKS, CRITICAL_HOOKS_WINDOWS,
};
