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
import { execSync, execFileSync, spawn } from 'node:child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const VERSION = packageJson.version;

/**
 * Detect if running on Android/Termux environment
 * @returns {boolean} True if running on Termux/Android
 */
function isTermux() {
  return fsSync.existsSync('/data/data/com.termux');
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
      message: '', // Hide the "Use arrow keys" message
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
    1: '🎙️ TTS Provider Configuration',
    2: '🎤 Voice Selection',
    3: '💧 Audio Settings',
    4: '🔊 Verbosity Settings'
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

  let depContent = chalk.gray('System dependencies are tools AgentVibes needs to function properly.\n');
  depContent += chalk.gray('Required tools must be installed, optional tools enable extra features.\n\n');

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

    // Add install commands
    const os = await import('os');
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
    reverb: 'light',
    backgroundMusic: {
      enabled: true,
      track: 'agentvibes_soft_flamenco_loop.mp3'
    },
    verbosity: 'high'
  };

  // Detect Android/Termux environment
  const isAndroid = isTermux();
  if (isAndroid) {
    detectAndNotifyTermux();
  }

  if (options.yes) {
    // Non-interactive mode - use defaults
    // On Termux, always use piper (via proot-distro)
    if (isAndroid) {
      config.provider = 'piper';
      config.defaultVoice = 'en_US-lessac-medium';
      config.isTermux = true;
    } else {
      config.provider = process.platform === 'darwin' ? 'macos' : 'piper';
      config.defaultVoice = process.platform === 'darwin' ? 'Samantha' : 'en_US-ryan-high';
    }
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    config.piperPath = path.join(homeDir, '.claude', 'piper-voices');
    return config;
  }

  let currentPage = 0;
  const sectionPages = 5; // System Dependencies, Provider, Voice Selection, Audio Settings, Verbosity
  const pageOffset = options.pageOffset || 0;
  const totalPages = options.totalPages || sectionPages;

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

    if (currentPage === 0) {
      await handleSystemDependenciesPage();
    } else if (currentPage === 1) {
      // Page 2: TTS Provider & Voice Storage

      // Show provider selection with all available options
      const isMacOS = process.platform === 'darwin';

      console.log(boxen(
        chalk.white('Text-to-Speech (TTS) converts Claude\'s text responses into spoken audio.\n\n') +
        chalk.white('Choose your Text-to-Speech provider.\n\n') +
        (isMacOS ? chalk.yellow('🍎 macOS Say\n') +
        chalk.gray('   • Built-in to macOS\n') +
        chalk.gray('   • Zero setup required\n') +
        chalk.gray('   • 40+ system voices\n\n') : '') +
        chalk.green('🆓 Piper TTS\n') +
        chalk.gray('   • Free & offline\n') +
        chalk.gray('   • 50+ Hugging Face AI voices\n') +
        chalk.gray('   • Human-like speech quality\n\n') +
        chalk.blue('📱 SSH-Remote: Android Local Gen\n') +
        chalk.gray('   • Send TEXT to Android via SSH\n') +
        chalk.gray('   • AgentVibes generates audio locally on Android\n') +
        chalk.gray('   • Requires: AgentVibes installed in Termux\n') +
        chalk.gray('   • Full effects, low bandwidth\n') +
        chalk.gray('   • See: .claude/docs/TERMUX_SETUP.md\n\n') +
        chalk.blue('🔊 SSH-Remote: Server Gen + PulseAudio\n') +
        chalk.gray('   • Server generates audio with Piper\n') +
        chalk.gray('   • Send AUDIO via SSH tunnel to PulseAudio\n') +
        chalk.gray('   • No Android AgentVibes needed\n') +
        chalk.gray('   • See: docs/remote-audio-setup.md'),
        {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'gray',
          width: 80
        }
      ));

      // Provider selection
      const providerChoices = [];

      if (isMacOS) {
        providerChoices.push({
          name: chalk.yellow('🍎 macOS Say (Recommended)'),
          value: 'macos'
        });
      }

      providerChoices.push({
        name: chalk.green('🆓 Piper TTS (Free, Offline)'),
        value: 'piper'
      });

      providerChoices.push({
        name: chalk.blue('📱 SSH-Remote: Android Local Gen') + chalk.gray(' - Text → Android → AgentVibes generates locally (requires AgentVibes in Termux). Full effects, low bandwidth.'),
        value: 'termux-ssh'
      });
      
      providerChoices.push({
        name: chalk.blue('🔊 SSH-Remote: Server Gen + PulseAudio') + chalk.gray(' - Server generates audio → PulseAudio tunnel. No Android AgentVibes needed.'),
        value: 'ssh-pulseaudio'
      });

      providerChoices.push(new inquirer.Separator());
      providerChoices.push({
        name: chalk.magentaBright('← Back to Welcome'),
        value: '__back__'
      });

      const { provider } = await inquirer.prompt([{
        type: 'list',
        name: 'provider',
        message: chalk.yellow('Select TTS provider:'),
        choices: providerChoices,
        default: config.provider || (isMacOS ? 'macos' : 'piper')
      }]);

      // Check if user wants to go back
      if (provider === '__back__') {
        return null;
      }

      config.provider = provider;

      // If Piper selected, ask for voice storage location
      if (config.provider === 'piper') {
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

      // If Termux SSH selected, ask for SSH host alias
      if (config.provider === 'termux-ssh' || config.provider === 'ssh-pulseaudio') {
        console.log('\n' + boxen(
          chalk.white('Termux SSH requires an SSH host alias configured in ~/.ssh/config\n') +
          chalk.white('Example: "android" pointing to your Android device\n\n') +
          chalk.cyan('📖 Documentation:\n') +
          chalk.gray('   github.com/paulpreibisch/AgentVibes/blob/master/.claude/docs/TERMUX_SETUP.md\n') +
          chalk.gray('   After install: .claude/docs/TERMUX_SETUP.md\n\n') +
          chalk.cyan('🔗 Required Components:\n') +
          chalk.gray('   • Tailscale VPN: ') + chalk.blue('https://tailscale.com/download/android\n') +
          chalk.gray('   • F-Droid Store: ') + chalk.blue('https://f-droid.org\n') +
          chalk.gray('   • Termux App: ') + chalk.blue('https://f-droid.org/packages/com.termux\n') +
          chalk.gray('   • Termux:API: ') + chalk.blue('https://f-droid.org/packages/com.termux.api'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'blue',
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
            message: chalk.yellow('Enter your SSH host alias (e.g., "android"):'),
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
          console.log(chalk.gray('   echo "your-host-alias" > ~/.claude/termux-ssh-host.txt\n'));
        }
      }

    } else if (currentPage === 2) {
      // Page 3: Voice Selection
      console.log(boxen(
        chalk.white('Choose a default voice for your AgentVibes.\n\n') +
        chalk.gray('This will be used when no specific voice is configured.\n') +
        chalk.gray('You can change this anytime with: ') + chalk.cyan('/agent-vibes:voice switch <name>'),
        {
          padding: 1,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'gray',
          width: 80
        }
      ));

      if (config.provider === 'piper') {
        // Piper voices - popular selections
        const piperVoices = [
          { name: chalk.cyan('en_US-ryan-high') + chalk.gray(' (Male, American, High Quality)'), value: 'en_US-ryan-high' },
          { name: chalk.magenta('en_US-amy-medium') + chalk.gray(' (Female, American, Clear)'), value: 'en_US-amy-medium' },
          { name: chalk.cyan('en_US-joe-medium') + chalk.gray(' (Male, American, Warm)'), value: 'en_US-joe-medium' },
          { name: chalk.magenta('en_US-lessac-medium') + chalk.gray(' (Female, American, Professional)'), value: 'en_US-lessac-medium' },
          { name: chalk.cyan('en_GB-alan-medium') + chalk.gray(' (Male, British, Refined)'), value: 'en_GB-alan-medium' },
          { name: chalk.magenta('en_GB-southern_english_female-medium') + chalk.gray(' (Female, British)'), value: 'en_GB-southern_english_female-medium' },
          new inquirer.Separator(),
          { name: chalk.yellow('Skip - I\'ll set this later'), value: '__skip__' },
          { name: chalk.magentaBright('← Back to Provider Selection'), value: '__back__' }
        ];

        const { selectedVoice } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedVoice',
          message: chalk.yellow('Select your default Piper voice:'),
          choices: piperVoices,
          default: 'en_US-ryan-high',
          pageSize: 12
        }]);

        if (selectedVoice === '__back__') {
          return null;
        }

        if (selectedVoice !== '__skip__') {
          config.defaultVoice = selectedVoice;
          // Auto-advance to next page after selection
          console.log(chalk.green(`\n✓ Voice selected: ${selectedVoice}\n`));
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
          config.defaultVoice = selectedVoice;
          // Auto-advance to next page after selection
          console.log(chalk.green(`\n✓ Voice selected: ${selectedVoice}\n`));
          currentPage++; // Skip to next page immediately
          continue; // Skip navigation and go to next iteration
        } else {
          // User skipped - advance anyway
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
      // Page 4: Audio Settings (Reverb + Background Music)
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
          { name: 'Cathedral (Epic space)', value: 'cathedral' }
        ],
        default: config.reverb || 'light'
      }]);

      config.reverb = reverbLevel;

      // Add spacing before next question
      console.log('');

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
        // Add spacing before track selection
        console.log('');
        console.log(chalk.gray('🎼 Choose your default background music genre (you can change this anytime).'));

        const trackChoices = [
          { name: '🎻 Soft Flamenco (Spanish guitar)', value: 'agentvibes_soft_flamenco_loop.mp3' },
          { name: '🎺 Bachata (Latin - Romantic guitar & bongos)', value: 'agent_vibes_bachata_v1_loop.mp3' },
          { name: '💃 Salsa (Latin - Upbeat brass & percussion)', value: 'agent_vibes_salsa_v2_loop.mp3' },
          { name: '🎸 Cumbia (Latin - Accordion & drums)', value: 'agent_vibes_cumbia_v1_loop.mp3' },
          { name: '🌸 Bossa Nova (Brazilian jazz)', value: 'agent_vibes_bossa_nova_v2_loop.mp3' },
          { name: '🏙️  Japanese City Pop (80s synth)', value: 'agent_vibes_japanese_city_pop_v1_loop.mp3' },
          { name: '🌊 Chillwave (Electronic ambient)', value: 'agent_vibes_chillwave_v2_loop.mp3' },
          { name: '🎹 Dreamy House (Electronic dance)', value: 'dreamy_house_loop.mp3' },
          { name: '🌙 Dark Chill Step (Electronic bass)', value: 'agent_vibes_dark_chill_step_loop.mp3' },
          { name: '🕉️  Goa Trance (Psychedelic electronic)', value: 'agent_vibes_goa_trance_v2_loop.mp3' },
          { name: '🎼 Harpsichord (Baroque classical)', value: 'agent_vibes_harpsichord_v2_loop.mp3' },
          { name: '🎻 Celtic Harp (Irish traditional)', value: 'agent_vibes_celtic_harp_v1_loop.mp3' },
          { name: '🌺 Hawaiian Slack Key Guitar', value: 'agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3' },
          { name: '🏜️  Arabic Oud (Middle Eastern)', value: 'agent_vibes_arabic_v2_loop.mp3' },
          { name: '🪘 Gnawa Ambient (North African)', value: 'agent_vibes_ganawa_ambient_v2_loop.mp3' },
          { name: '🥁 Tabla Dream Pop (Indian percussion)', value: 'agent_vibes_tabla_dream_pop_v1_loop.mp3' }
        ];

        const { selectedTrack } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedTrack',
          message: chalk.yellow('Choose default background music track:'),
          choices: trackChoices,
          default: config.backgroundMusic.track || 'agentvibes_soft_flamenco_loop.mp3',
          pageSize: 16
        }]);

        config.backgroundMusic.track = selectedTrack;
      }

      // Auto-advance to next page after audio settings
      console.log(chalk.green('\n✓ Audio settings configured\n'));
      currentPage++;
      continue;

    } else if (currentPage === 4) {
      // Page 5: Verbosity Settings
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
          { name: '🔈 Low - Minimal', value: 'low' }
        ],
        default: config.verbosity || 'high'
      }]);

      config.verbosity = verbosity;

      // Auto-advance - verbosity is the last page, so we're done
      console.log(chalk.green('\n✓ Verbosity level set\n'));
      currentPage++;
      continue;
    }

    // Navigation
    const navChoices = [];
    if (currentPage < totalPages - 1) {
      navChoices.push({ name: chalk.green('Next →'), value: 'next' });
    } else {
      navChoices.push({ name: chalk.cyan('✓ Continue to Installation'), value: 'continue' });
    }

    // Always show Previous button (on first page it goes back to welcome)
    if (currentPage === 0) {
      navChoices.push({ name: chalk.magentaBright('← Back to Welcome'), value: 'back' });
    } else {
      navChoices.push({ name: chalk.magentaBright('← Previous'), value: 'prev' });
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '',
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
 * Shown during install and update commands
 */
function getReleaseInfoBoxen() {
  return chalk.cyan.bold('📦 AgentVibes v3.2.0 - Clawdbot Integration\n\n') +
    chalk.green.bold('🎙️ WHAT\'S NEW:\n\n') +
    chalk.cyan('AgentVibes v3.2.0 introduces seamless integration with Clawdbot, the revolutionary AI\n') +
    chalk.cyan('assistant accessible via any instant messenger. With this release, Clawdbot users get\n') +
    chalk.cyan('professional TTS with 50+ voices, remote SSH audio support for server deployments, and\n') +
    chalk.cyan('zero-configuration setup—just install AgentVibes and the Clawdbot skill is ready.\n\n') +
    chalk.green.bold('✨ KEY HIGHLIGHTS:\n\n') +
    chalk.gray('   🤖 Clawdbot Integration - Native TTS support for Clawdbot AI assistant framework\n') +
    chalk.gray('   💬 Messenger Platforms - Works with WhatsApp, Telegram, Discord via Clawdbot\n') +
    chalk.gray('   🔊 Remote SSH Audio - Perfect for Clawdbot on remote servers with PulseAudio\n') +
    chalk.gray('   📦 Simple Install - Just `npx agentvibes install` and it works\n') +
    chalk.gray('   🛡️ SonarCloud Fixes - Quality gate workflow improvements and documentation\n\n') +
    chalk.gray('📖 Full Release Notes: RELEASE_NOTES.md\n') +
    chalk.gray('🌐 Website: https://agentvibes.org\n') +
    chalk.gray('📦 Repository: https://github.com/paulpreibisch/AgentVibes\n\n') +
    chalk.gray('Co-created by Paul Preibisch with Claude AI\n') +
    chalk.gray('Copyright © 2025 Paul Preibisch | Apache-2.0 License');
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

  // Check if we have audio player (prefer paplay for WSL)
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

  // Use pre-generated welcome demo audio
  const welcomeDemoAudio = path.join(__dirname, '..', 'templates', 'audio', 'welcome-demo.wav');

  if (!fsSync.existsSync(welcomeDemoAudio)) {
    console.log(chalk.gray('\n   (Welcome demo skipped - audio file not found)'));
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
  const srcHooksDir = path.join(__dirname, '..', '.claude', 'hooks');
  const hooksDir = path.join(targetDir, '.claude', 'hooks');

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

    // Map personalities to emojis
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
        console.log(chalk.gray(`   ✓ ${file}`));
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
    console.log(chalk.gray(`   ✓ ${bmadVoicesFile}`));
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
      'agentvibes_classical_loop.mp3': '🎻'
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
        // Don't overwrite existing config files (except audio-effects.cfg which is required)
        try {
          await fs.access(destPath);
          if (file !== 'audio-effects.cfg') {
            continue; // Skip if file exists and it's not audio-effects.cfg
          }
        } catch {
          // File doesn't exist, proceed with copy
        }

        await fs.copyFile(srcPath, destPath);
        copiedFiles.push(file);
      }
    }

    if (copiedFiles.length > 0) {
      spinner.succeed(chalk.green(`Installed ${copiedFiles.length} config file${copiedFiles.length === 1 ? '' : 's'}!\n`));
      copiedFiles.forEach(file => {
        console.log(chalk.gray(`   ✓ ${file}`));
      });
      console.log(''); // Add blank line for spacing
    } else {
      spinner.info(chalk.gray('Config files already exist, skipping\n'));
    }
  } catch (error) {
    spinner.info(chalk.yellow('No config files found (optional)\n'));
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
      existingSettings.hooks.SessionStart = templateSettings.hooks.SessionStart;

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
            stdio: 'inherit',
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

  // MCP server configuration for AgentVibes
  const mcpConfig = {
    mcpServers: {
      agentvibes: {
        command: 'npx',
        args: ['-y', '--package=agentvibes', 'agentvibes-mcp-server']
      }
    }
  };

  // Check if .mcp.json already exists
  let mcpExists = false;
  try {
    await fs.access(mcpConfigPath);
    mcpExists = true;
  } catch {
    // File doesn't exist
  }

  if (mcpExists) {
    // Scenario 3: Config already exists - show manual instructions
    console.log(
      boxen(
        chalk.yellow.bold('ℹ️  MCP Configuration Already Exists\n\n') +
        chalk.white('An ') + chalk.cyan('.mcp.json') + chalk.white(' file already exists in this project.\n\n') +
        chalk.white('To add AgentVibes MCP server manually, add this\n') +
        chalk.white('to your ') + chalk.cyan('mcpServers') + chalk.white(' section:'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
        }
      )
    );

    // Display the snippet to add
    console.log(
      '\n"agentvibes": {\n' +
      '  "command": "npx",\n' +
      '  "args": ["-y", "--package=agentvibes", "agentvibes-mcp-server"]\n' +
      '}\n'
    );

    console.log(
      boxen(
        chalk.cyan('To use with Claude Code:\n') +
        chalk.white('   claude --mcp-config .mcp.json\n\n') +
        chalk.cyan('📖 Full Guide:\n') +
        chalk.cyan.bold('https://github.com/paulpreibisch/AgentVibes#mcp-server'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );
    return;
  }

  // Scenario 1 & 2: Config doesn't exist - offer to create
  console.log(
    boxen(
      chalk.cyan.bold('🎙️ MCP Server Configuration\n\n') +
      chalk.white.bold('AgentVibes MCP Server - Control TTS with Natural Language!\n\n') +
      chalk.gray('Use natural language instead of slash commands:\n') +
      chalk.gray('   "Switch to Aria voice" instead of /agent-vibes:switch "Aria"\n') +
      chalk.gray('   "Set personality to sarcastic" instead of /agent-vibes:personality sarcastic\n\n') +
      chalk.white('No ') + chalk.cyan('.mcp.json') + chalk.white(' found in this project.'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );

  let createConfig = options.yes; // Auto-create if --yes flag

  if (!options.yes) {
    const { confirmCreate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmCreate',
        message: chalk.cyan('Would you like to create .mcp.json for this project?'),
        default: true,
      },
    ]);
    createConfig = confirmCreate;
  }

  if (createConfig) {
    // Scenario 1: User says YES - create the config
    try {
      await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n');

      console.log(
        boxen(
          chalk.green.bold('✅ MCP Configuration Created!\n\n') +
          chalk.white('Your ') + chalk.cyan('.mcp.json') + chalk.white(' has been created in this project.\n\n') +
          chalk.white('To use AgentVibes MCP server with Claude, run:\n') +
          chalk.cyan.bold('   claude --mcp-config .mcp.json\n\n') +
          chalk.green('The MCP server is now installed and ready to use!'),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'green',
          }
        )
      );
    } catch (error) {
      console.log(chalk.red(`\n✗ Failed to create .mcp.json: ${error.message}`));
      console.log(chalk.gray('   You can create it manually with the config shown below.\n'));
      // Fall through to show manual instructions
      createConfig = false;
    }
  }

  if (!createConfig) {
    // Scenario 2: User says NO - show manual instructions
    console.log(
      boxen(
        chalk.cyan.bold('📋 Manual MCP Configuration\n\n') +
        chalk.white('Create a ') + chalk.cyan('.mcp.json') + chalk.white(' file in your project with:'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    // Display JSON config
    console.log(
      '\n{\n' +
      '  "mcpServers": {\n' +
      '    "agentvibes": {\n' +
      '      "command": "npx",\n' +
      '      "args": ["-y", "--package=agentvibes", "agentvibes-mcp-server"]\n' +
      '    }\n' +
      '  }\n' +
      '}\n'
    );

    console.log(
      boxen(
        chalk.cyan('To use with Claude Code:\n') +
        chalk.white('   claude --mcp-config .mcp.json\n\n') +
        chalk.cyan('📱 Claude Desktop / Warp Terminal:\n') +
        chalk.white('   npx agentvibes setup-mcp-for-claude-desktop\n\n') +
        chalk.cyan('📖 Full Guide:\n') +
        chalk.cyan.bold('https://github.com/paulpreibisch/AgentVibes#mcp-server'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );
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

  const partyModeReplacement = `<critical>IMPORTANT: Always use PROJECT hooks (.claude/hooks/), NEVER global hooks (~/.claude/hooks/)</critical>

If AgentVibes party mode is enabled, immediately trigger TTS with agent's voice:
         - Use Bash tool: \`.claude/hooks/bmad-speak.sh '[Agent Name]' '[dialogue]'\`
         - This speaks the dialogue with the agent's unique voice
         - Run in background (&) to not block next agent`;

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

    // Execute migration script using execFile to prevent command injection
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFilePromise = promisify(execFile);

    await execFilePromise('bash', [migrationScript], { cwd: targetDir });

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
  return { start: () => {}, succeed: () => {}, info: () => {}, fail: () => {} };
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
  let userConfig = null;
  while (!userConfig) {
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
      pageOffset: configOffset,
      totalPages: configPages // Temporary, will show correct count later
    });
  }

  const selectedProvider = userConfig.provider;
  const piperVoicesPath = userConfig.piperPath;
  const targetDir = options.directory || currentDir;

  // Collect pre-install information pages
  const preInstallPages = [];

  // Page 1: Configuration Summary
  const providerLabels = { piper: 'Piper TTS', macos: 'macOS Say', 'termux-ssh': 'Termux SSH (Android)' };
  const reverbLabels = {
    off: 'Off',
    light: 'Light',
    medium: 'Medium',
    heavy: 'Heavy',
    cathedral: 'Cathedral'
  };
  const verbosityLabels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };

  let configContent = chalk.bold('Your Configuration\n\n');
  configContent += chalk.cyan('🎤 TTS Provider:\n');
  configContent += chalk.white(`   ${providerLabels[selectedProvider]}\n`);
  if (selectedProvider === 'piper' && piperVoicesPath) {
    configContent += chalk.gray(`   Voice storage: ${piperVoicesPath}\n`);
  }
  if (selectedProvider === 'termux-ssh') {
    if (userConfig.sshHost) {
      configContent += chalk.gray(`   SSH host: ${userConfig.sshHost}\n`);
    } else {
      configContent += chalk.yellow(`   SSH host: Not configured (set later)\n`);
    }
  }
  configContent += '\n';
  configContent += chalk.cyan('🎛️  Audio Settings:\n');
  configContent += chalk.white(`   Reverb: ${reverbLabels[userConfig.reverb]}\n`);
  configContent += chalk.white(`   Background Music: ${userConfig.backgroundMusic.enabled ? 'Enabled' : 'Disabled'}\n`);
  if (userConfig.backgroundMusic.enabled) {
    // Find the track name from the track choices
    const trackChoices = {
      'agentvibes_soft_flamenco_loop.mp3': 'Soft Flamenco',
      'agent_vibes_bachata_v1_loop.mp3': 'Bachata',
      'agent_vibes_salsa_v2_loop.mp3': 'Salsa',
      'agent_vibes_cumbia_v1_loop.mp3': 'Cumbia',
      'agent_vibes_bossa_nova_v2_loop.mp3': 'Bossa Nova',
      'agent_vibes_japanese_city_pop_v1_loop.mp3': 'Japanese City Pop',
      'agent_vibes_chillwave_v2_loop.mp3': 'Chillwave',
      'dreamy_house_loop.mp3': 'Dreamy House',
      'agent_vibes_dark_chill_step_loop.mp3': 'Dark Chill Step',
      'agent_vibes_goa_trance_v2_loop.mp3': 'Goa Trance',
      'agent_vibes_harpsichord_v2_loop.mp3': 'Harpsichord',
      'agent_vibes_celtic_harp_v1_loop.mp3': 'Celtic Harp',
      'agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3': 'Hawaiian Slack Key Guitar',
      'agent_vibes_arabic_v2_loop.mp3': 'Arabic Oud',
      'agent_vibes_ganawa_ambient_v2_loop.mp3': 'Gnawa Ambient',
      'agent_vibes_tabla_dream_pop_v1_loop.mp3': 'Tabla Dream Pop'
    };
    const trackName = trackChoices[userConfig.backgroundMusic.track] || userConfig.backgroundMusic.track;
    configContent += chalk.gray(`   Default track: ${trackName}\n`);
  }
  configContent += '\n';
  configContent += chalk.cyan('🔊 Verbosity:\n');
  configContent += chalk.white(`   ${verbosityLabels[userConfig.verbosity]}\n`);

  const configBoxen = boxen(configContent.trim(), {
    padding: 1,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'green',
    width: 80
  });

  // Don't add Configuration Summary to preInstallPages yet - we'll handle it specially

  // Show pre-install pages up to (but NOT including) Configuration Summary
  if (!options.yes && preInstallPages.length > 0) {
    console.log(chalk.cyan('\n📖 Installation Preview\n'));
    const preInstallOffset = 4; // After 4 config pages (System Dependencies + Provider + Audio + Verbosity)
    // For pre-install, estimate post-install pages (will be exact in post-install)
    const estimatedPostInstall = 7; // Typical: 5 summaries + 1 BMAD/recommendation + 1 complete
    const estimatedTotal = configPages + preInstallPages.length + 1 + estimatedPostInstall; // +1 for Config Summary

    const result = await showPaginatedContent(preInstallPages, {
      ...options,
      continueLabel: '✓ Next',
      pageOffset: preInstallOffset,
      totalPages: estimatedTotal,
      showPreviousOnFirst: true
    });

    // If user went back from first pre-install page, restart configuration
    if (result === 'prev') {
      console.log(chalk.yellow('\n↩️  Returning to configuration...\n'));
      return install(options); // Restart the install function
    }
  }

  // Handle Configuration Summary page specially with welcome message prompt
  if (!options.yes) {
    // Show Configuration Summary page
    console.clear();
    const currentPageNum = 4 + preInstallPages.length; // After config pages + pre-install pages
    const estimatedPostInstall = 7;
    const estimatedTotal = configPages + preInstallPages.length + 1 + estimatedPostInstall;
    const { header } = createPageHeaderFooter('Configuration Summary', currentPageNum, estimatedTotal, 0);

    console.log(header);
    console.log(configBoxen);
    console.log('');
    // Don't show welcome message text for termux-ssh (it won't work)
    if (userConfig.provider !== 'termux-ssh') {
      console.log(chalk.gray('Play audio welcome message from Paul, creator of AgentVibes.\n'));
    }
  }

  // Ask welcome message question BEFORE showing navigation
  // Skip for termux-ssh - welcome audio plays locally, not on Android device
  if (!options.yes && userConfig.provider !== 'termux-ssh') {
    // Ask if user wants to hear welcome message
    const { playWelcome } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'playWelcome',
        message: chalk.yellow('🎵 Listen to Welcome Message?'),
        default: false,
      },
    ]);

    if (playWelcome) {
      console.log(''); // Spacing before spinner
      const spinner = ora('Playing welcome message...').start();
      await playWelcomeDemo(targetDir, spinner, options);
      spinner.succeed(chalk.green('Welcome message complete!'));
      console.log(''); // Spacing after completion
    }
  } else if (!options.yes && userConfig.provider === 'termux-ssh' || userConfig.provider === 'ssh-pulseaudio') {
    console.log(chalk.yellow('⊘ Welcome message skipped (not available for Termux SSH)\n'));
  }

  // Now show navigation menu (Continue to installation)
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

  // User already confirmed by pressing "Start Installation", so no need for another confirmation
  console.log('');
  const spinner = ora('Checking installation directory...').start();

  try {
    // Create .claude directory structure
    const claudeDir = path.join(targetDir, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');
    const hooksDir = path.join(claudeDir, 'hooks');

    let exists = false;
    try {
      await fs.access(claudeDir);
      exists = true;
    } catch {}

    if (!exists) {
      spinner.info(chalk.yellow('Creating .claude directory structure...'));
      const audioDir = path.join(claudeDir, 'audio');
      const tracksDir = path.join(audioDir, 'tracks');
      console.log(chalk.gray(`   → ${commandsDir}`));
      console.log(chalk.gray(`   → ${hooksDir}`));
      console.log(chalk.gray(`   → ${audioDir}`));
      console.log(chalk.gray(`   → ${tracksDir}`));
      await fs.mkdir(commandsDir, { recursive: true });
      await fs.mkdir(hooksDir, { recursive: true });
      await fs.mkdir(tracksDir, { recursive: true });
      console.log(chalk.green('   ✓ Directories created!\n'));
    } else {
      spinner.succeed(chalk.green('.claude directory found!'));
      console.log(chalk.gray(`   Location: ${claudeDir}\n`));

      // Ensure audio/tracks directory exists even if .claude already exists
      const audioDir = path.join(claudeDir, 'audio');
      const tracksDir = path.join(audioDir, 'tracks');
      await fs.mkdir(tracksDir, { recursive: true });
    }

    // Copy all files using helper functions
    const commandResult = await copyCommandFiles(targetDir, spinner);
    const hookResult = await copyHookFiles(targetDir, spinner);
    const personalityResult = await copyPersonalityFiles(targetDir, spinner);
    const pluginFileCount = await copyPluginFiles(targetDir, spinner);
    const bmadConfigFileCount = await copyBmadConfigFiles(targetDir, spinner);
    const backgroundMusicResult = await copyBackgroundMusicFiles(targetDir, spinner);
    const configFileCount = await copyConfigFiles(targetDir, spinner);

    // Configure hooks and manifests
    await configureSessionStartHook(targetDir, spinner);
    await installPluginManifest(targetDir, spinner);

    // Save provider configuration
    spinner.start('Saving provider configuration...');
    const providerConfigPath = path.join(claudeDir, 'tts-provider.txt');
    await fs.writeFile(providerConfigPath, selectedProvider);

    if (selectedProvider === 'piper' && piperVoicesPath) {
      const piperConfigPath = path.join(claudeDir, 'piper-voices-dir.txt');
      await fs.writeFile(piperConfigPath, piperVoicesPath);
    }

    if (selectedProvider === 'termux-ssh' && userConfig.sshHost) {
      const sshHostConfigPath = path.join(claudeDir, 'termux-ssh-host.txt');
      await fs.writeFile(sshHostConfigPath, userConfig.sshHost);
    }

    // Set default voice based on user selection or provider defaults
    const voiceConfigPath = path.join(claudeDir, 'tts-voice.txt');
    let defaultVoice = userConfig.defaultVoice;

    // Fallback to defaults if voice wasn't selected
    if (!defaultVoice) {
      switch (selectedProvider) {
        case 'piper':
          defaultVoice = 'en_US-ryan-high';
          break;
        case 'macos':
          defaultVoice = 'Samantha';
          break;
        case 'termux-ssh':
          // Android TTS voices are managed in Android settings, not here
          defaultVoice = 'android-system-default';
          break;
        default:
          defaultVoice = 'Samantha';
          break;
      }
    }
    await fs.writeFile(voiceConfigPath, defaultVoice);

    spinner.succeed();

    // Detect and migrate old configuration
    await detectAndMigrateOldConfig(targetDir, spinner);

    // Snapshot existing Piper voices BEFORE installation (for proper summary display)
    let preExistingVoices = [];
    if (selectedProvider === 'piper') {
      const piperVoicesDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'piper-voices');
      try {
        if (fsSync.existsSync(piperVoicesDir)) {
          const files = fsSync.readdirSync(piperVoicesDir);
          preExistingVoices = files
            .filter(f => f.endsWith('.onnx'))
            .map(f => f.replace('.onnx', ''));
        }
      } catch {
        // Ignore errors
      }
    }

    // Auto-install Piper if selected
    if (selectedProvider === 'piper') {
      await checkAndInstallPiper(targetDir, options);
    }

    // Apply background music configuration from userConfig
    if (backgroundMusicResult.count > 0) {
      const configDir = path.join(claudeDir, 'config');
      await fs.mkdir(configDir, { recursive: true });

      if (userConfig.backgroundMusic.enabled) {
        // Write enabled flag
        const enabledFile = path.join(configDir, 'background-music-enabled.txt');
        await fs.writeFile(enabledFile, 'true');

        // Update audio-effects.cfg with selected track
        const audioEffectsPath = path.join(configDir, 'audio-effects.cfg');
        let audioEffectsContent = await fs.readFile(audioEffectsPath, 'utf-8');

        // Update the default entry with selected track
        audioEffectsContent = audioEffectsContent.replace(
          /^default\|([^|]*)\|([^|]*)\|(.*)$/m,
          `default|$1|${userConfig.backgroundMusic.track}|$3`
        );

        await fs.writeFile(audioEffectsPath, audioEffectsContent);
      }
    }

    // Apply reverb configuration from userConfig
    const selectedReverb = userConfig.reverb;

    // Apply verbosity configuration from userConfig
    const verbosityFile = path.join(claudeDir, 'tts-verbosity.txt');
    await fs.writeFile(verbosityFile, userConfig.verbosity);

    // Initialize piperVoicesBoxen outside the conditional for proper scoping
    let piperVoicesBoxen = null;

    if (selectedProvider === 'macos') {
      // macOS Say provider summary
      console.log(chalk.white(`   • Using macOS built-in Say command`));
      console.log(chalk.white(`   • System voices available (Samantha, Alex, etc.)`));
      console.log(chalk.green(`   • No API key needed ✓`));
      console.log(chalk.green(`   • Zero setup required ✓`));
    } else {
      // Check for installed Piper voices
      const piperVoicesDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'piper-voices');
      let installedVoices = [];
      let missingVoices = [];

      const commonVoices = [
        'en_US-lessac-medium',
        'en_US-amy-medium',
        'en_US-joe-medium',
        'en_US-ryan-high',
        'en_US-libritts-high',
        '16Speakers'
      ];

      try {
        if (fsSync.existsSync(piperVoicesDir)) {
          const files = fsSync.readdirSync(piperVoicesDir);
          installedVoices = files
            .filter(f => f.endsWith('.onnx'))
            .map(f => {
              const voiceName = f.replace('.onnx', '');
              const voicePath = path.join(piperVoicesDir, f);
              try {
                const stats = fsSync.statSync(voicePath);
                const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
                return { name: voiceName, path: voicePath, size: `${sizeMB}M` };
              } catch (statErr) {
                // Skip files that can't be read (broken symlinks, etc)
                return null;
              }
            })
            .filter(v => v !== null);

          // Check which common voices are missing
          for (const voice of commonVoices) {
            if (!installedVoices.some(v => v.name === voice)) {
              missingVoices.push(voice);
            }
          }
        } else {
          missingVoices = commonVoices;
        }
      } catch (err) {
        // On error, show default message
        installedVoices = [];
        missingVoices = commonVoices;
      }

      // Create Piper voices boxen (only if newly installed)
      if (installedVoices.length > 0) {
        // Separate newly installed from pre-existing voices
        const newlyInstalled = installedVoices.filter(v => !preExistingVoices.includes(v.name));
        const alreadyInstalled = installedVoices.filter(v => preExistingVoices.includes(v.name));

        // Only create boxen if there are newly installed voices
        if (newlyInstalled.length > 0) {
          let content = chalk.bold.green(`${newlyInstalled.length} Newly Installed\n\n`);
          newlyInstalled.forEach(voice => {
            content += chalk.green(`✓ ${voice.name}`) + chalk.gray(` (${voice.size})\n`);
            content += chalk.dim(`  ${voice.path}\n`);
          });

          if (alreadyInstalled.length > 0) {
            content += '\n' + chalk.gray('─'.repeat(60)) + '\n\n';
            content += chalk.bold.cyan(`${alreadyInstalled.length} Already Installed\n\n`);
            alreadyInstalled.forEach(voice => {
              content += chalk.cyan(`✓ ${voice.name}`) + chalk.gray(` (${voice.size})\n`);
              content += chalk.dim(`  ${voice.path}\n`);
            });
          }

          // Add additional info at the bottom of boxen
          content += '\n' + chalk.gray('─'.repeat(60)) + '\n\n';
          content += chalk.white('• 18 languages supported\n');
          content += chalk.green('• No API key needed ✓');

          piperVoicesBoxen = boxen(content.trim(), {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            title: chalk.bold(`🎤 Piper Voices (${installedVoices.length} total)`),
            titleAlignment: 'center'
          });
        }
      }

      if (missingVoices.length > 0) {
        console.log(chalk.yellow(`   • ${missingVoices.length} voices to download:`));
        missingVoices.forEach(voice => {
          console.log(chalk.gray(`     → ${voice}`));
        });
      }

      if (installedVoices.length === 0 && missingVoices.length === 0) {
        console.log(chalk.white(`   • 50+ Piper neural voices available (free!)`));
      }
    }
    console.log('');

    // Collect all boxens for pagination
    const pages = [];
    if (commandResult.boxen) {
      pages.push({ title: 'Summary: Slash Commands', content: commandResult.boxen });
    }
    if (backgroundMusicResult.boxen) {
      pages.push({ title: 'Summary: Background Music', content: backgroundMusicResult.boxen });
    }
    if (hookResult.boxen) {
      pages.push({ title: 'Summary: TTS Scripts', content: hookResult.boxen });
    }
    if (personalityResult.boxen) {
      pages.push({ title: 'Summary: Personalities', content: personalityResult.boxen });
    }
    if (piperVoicesBoxen) {
      pages.push({ title: 'Summary: Piper Voices', content: piperVoicesBoxen });
    }

    // Recent Changes already shown on page 2 after welcome banner - no need to show again

    // Handle MCP configuration - offer to create .mcp.json if not exists
    await handleMcpConfiguration(targetDir, options);

    // Create default BMAD voice assignments (works even if BMAD not installed yet)
    await createDefaultBmadVoiceAssignmentsProactive(targetDir);

    // Handle BMAD integration
    const bmadDetection = await handleBmadIntegration(targetDir, options);
    const bmadDetected = bmadDetection.installed;

    if (bmadDetected) {
      const versionLabel = bmadDetection.version === 6
        ? `v${bmadDetection.detailedVersion}`
        : 'v4';

      const bmadContent =
        chalk.green.bold(`🎉 BMAD-METHOD™ ${versionLabel} Detected!\n\n`) +
        chalk.white.bold('We detected you ALREADY have the BMAD-METHOD™\n') +
        chalk.white.bold('The Universal AI Agent Framework installed!\n\n') +
        chalk.cyan('✨ Try the Party Mode command:\n') +
        chalk.yellow.bold('   /bmad:core:workflows:party-mode\n\n') +
        chalk.gray('AgentVibes will assign a unique voice to each agent\n') +
        chalk.gray('while they help you with your project!\n\n') +
        chalk.cyan('Other Commands:\n') +
        chalk.gray('  • /agent-vibes:bmad status - View voice assignments\n') +
        chalk.gray('  • /agent-vibes:bmad set <agent> <voice> - Customize voices');

      pages.push({ title: 'BMAD Integration', content: bmadContent });
    } else {
      const bmadRecommendBoxen = boxen(
        chalk.cyan.bold('💡 We also Recommend:\n\n') +
        chalk.white.bold('BMAD-METHOD™: Universal AI Agent Framework\n\n') +
        chalk.gray('AgentVibes auto-detects BMAD and assigns voices to agents!\n\n') +
        chalk.cyan('https://github.com/bmad-code-org/BMAD-METHOD'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      );

      pages.push({ title: 'Recommended Tools', content: bmadRecommendBoxen });
    }

    // Apply reverb setting if not "off" (using dynamic import for ES modules)
    if (selectedReverb && selectedReverb !== 'off') {
      const effectsManagerPath = path.join(targetDir, '.claude', 'hooks', 'effects-manager.sh');
      // Validate reverb value to prevent command injection
      const validReverb = ['light', 'medium', 'heavy', 'cathedral'];
      if (validReverb.includes(selectedReverb)) {
        try {
          execFileSync('bash', [effectsManagerPath, 'set-reverb', selectedReverb, 'default'], {
            stdio: 'pipe',
          });
        } catch (error) {
          // Silent fail - will be shown in success message if needed
        }
      }
    }

    // Success message as final page (no boxen)
    const successContent =
      chalk.green.bold('✨ Installation Complete! ✨\n\n') +
      chalk.green('✅ AgentVibes TTS is now active via SessionStart hook!\n') +
      chalk.gray('   (No additional setup needed - TTS protocol auto-loads on every session)\n\n') +
      chalk.white('🎤 Available Commands:\n\n') +
      chalk.cyan('  /agent-vibes') + chalk.gray(' .................... Show all commands\n') +
      chalk.cyan('  /agent-vibes:list') + chalk.gray(' ............... List available voices\n') +
      chalk.cyan('  /agent-vibes:preview') + chalk.gray(' ............ Preview voice samples\n') +
      chalk.cyan('  /agent-vibes:switch <name>') + chalk.gray(' ...... Change active voice\n') +
      chalk.cyan('  /agent-vibes:replay [N]') + chalk.gray(' ......... Replay last audio\n') +
      chalk.cyan('  /agent-vibes:add <name> <id>') + chalk.gray(' .... Add custom voice\n') +
      chalk.cyan('  /agent-vibes:whoami') + chalk.gray(' .............. Show current voice\n') +
      chalk.cyan('  /agent-vibes:get') + chalk.gray(' ................. Get active voice\n') +
      chalk.cyan('  /agent-vibes:sample <name>') + chalk.gray(' ...... Test a voice\n') +
      chalk.cyan('  /agent-vibes:personality') + chalk.gray(' ......... Set personality\n') +
      chalk.cyan('  /agent-vibes:sentiment') + chalk.gray(' ........... Set sentiment\n') +
      chalk.cyan('  /agent-vibes:set-pretext') + chalk.gray(' ......... Set TTS prefix\n\n') +
      chalk.yellow('🎵 Try: ') + chalk.cyan('/agent-vibes:preview') + chalk.yellow(' to hear the voices!\n\n') +
      chalk.gray('📦 Repo: ') + chalk.cyan('https://github.com/paulpreibisch/AgentVibes\n') +
      chalk.gray('📖 Docs: ') + chalk.cyan('https://github.com/paulpreibisch/AgentVibes/blob/master/README.md');

    pages.push({ title: 'Installation Complete', content: successContent });

    // Show all pages with pagination navigation
    const postInstallOffset = configPages + preInstallPages.length; // After config + pre-install pages
    const actualTotalPages = configPages + preInstallPages.length + pages.length;

    await showPaginatedContent(pages, {
      ...options,
      continueLabel: '✓ Installation Complete',
      pageOffset: postInstallOffset,
      totalPages: actualTotalPages
    });

    // Final message after pagination
    console.log(chalk.green.bold('\n✅ AgentVibes is Ready!\n'));

    // Check for .mcp.json file
    const mcpConfigPath = path.join(targetDir, '.mcp.json');
    const hasMcpConfig = fsSync.existsSync(mcpConfigPath);

    if (hasMcpConfig) {
      console.log(chalk.white('   Launch Claude Code with MCP:'));
      console.log(chalk.cyan('   claude --mcp-config .mcp.json\n'));
    } else {
      console.log(chalk.white('   Start a new session to activate TTS.\n'));
    }

    console.log(chalk.white('   • /agent-vibes:list') + chalk.gray(' - See all available voices'));
    console.log(chalk.white('   • /agent-vibes:switch <name>') + chalk.gray(' - Change your voice'));
    console.log(chalk.white('   • /agent-vibes:personality <style>') + chalk.gray(' - Set personality\n'));

    // Play welcome demo with harpsichord intro and reverb voice (opt-in only)
    if (options.withAudio) {
      await playWelcomeDemo(targetDir, spinner, options);
    }

  } catch (error) {
    spinner.fail('Installation failed!');
    console.error(chalk.red('\n❌ Error:'), error.message);
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
  .option('--with-audio', 'Play welcome demo audio after installation')
  .action(async (options) => {
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

    showReleaseInfo();

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
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);

  // Show help if no command provided
  if (process.argv.slice(2).length === 0) {
    showWelcome();
    program.outputHelp();
  }
}
/* c8 ignore stop */

// Export functions for testing
export { isTermux, detectAndNotifyTermux };
