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
import { execSync } from 'node:child_process';
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
function showReleaseInfo() {
  console.log(
    boxen(
      chalk.white.bold('═══════════════════════════════════════════════════════════════\n') +
      chalk.cyan.bold('  📦 AgentVibes v2.12.0 - .agentvibes/ Directory Migration\n') +
      chalk.white.bold('═══════════════════════════════════════════════════════════════\n\n') +
      chalk.green.bold('🎙️ WHAT\'S NEW:\n\n') +
      chalk.cyan('AgentVibes v2.12.0 introduces a comprehensive directory reorganization,\n') +
      chalk.cyan('migrating all AgentVibes configuration to a dedicated .agentvibes/ directory.\n') +
      chalk.cyan('This eliminates namespace confusion with Claude Code and provides a clear,\n') +
      chalk.cyan('predictable location for all AgentVibes state. Migration is fully automatic—\n') +
      chalk.cyan('your settings are seamlessly moved during upgrade. Also includes BMAD testing\n') +
      chalk.cyan('improvements and enhanced Piper voice installation.\n\n') +
      chalk.green.bold('✨ KEY HIGHLIGHTS:\n\n') +
      chalk.gray('   📁 Dedicated .agentvibes/ Directory - Clear namespace separation\n') +
      chalk.gray('   🔄 Automatic Migration - Seamless upgrade from old locations\n') +
      chalk.gray('   ✅ 100% Backward Compatible - No manual intervention needed\n') +
      chalk.gray('   🧪 32 Passing Tests - Comprehensive migration validation\n') +
      chalk.gray('   🎭 npx test-bmad-pr - One-line BMAD PR testing command\n') +
      chalk.gray('   🎤 Enhanced Voice Detection - Better Piper installation status\n\n') +
      chalk.cyan('Configuration Migration:\n') +
      chalk.gray('   .claude/config/ → .agentvibes/config/\n') +
      chalk.gray('   .claude/plugins/ → .agentvibes/bmad/\n') +
      chalk.gray('   Automatic migration runs during update\n') +
      chalk.gray('   All settings and voice mappings preserved\n\n') +
      chalk.white.bold('═══════════════════════════════════════════════════════════════\n\n') +
      chalk.gray('📖 Full Release Notes: RELEASE_NOTES.md\n') +
      chalk.gray('🌐 Website: https://agentvibes.org\n') +
      chalk.gray('📦 Repository: https://github.com/paulpreibisch/AgentVibes\n\n') +
      chalk.gray('Co-created by Paul Preibisch with Claude AI\n') +
      chalk.gray('Copyright © 2025 Paul Preibisch | Apache-2.0 License'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
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

  // Source the shell config to load environment variables, then run the script
  // Don't wrap scriptPath in quotes - it may contain arguments
  const command = `source "${shellConfig}" 2>/dev/null; ${shell} ${scriptPath}`;

  return execSync(command, {
    shell: shell,
    ...options
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
 * Prompt user to select TTS provider (Piper or ElevenLabs)
 * @param {Object} options - Installation options
 * @returns {Promise<string>} Selected provider ('piper' or 'elevenlabs')
 */
async function promptProviderSelection(options) {
  if (options.yes) {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey) {
      console.log(chalk.green('✓ Using ElevenLabs (API key detected)\n'));
      return 'elevenlabs';
    }
    console.log(chalk.green('✓ Using Piper TTS (free option)\n'));
    return 'piper';
  }

  console.log(chalk.cyan('🎭 Choose Your TTS Provider:\n'));

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which TTS provider would you like to use?',
      choices: [
        {
          name: chalk.green('🆓 Piper TTS (Free, Offline)') + chalk.gray(' - 50+ neural voices, no API key needed'),
          value: 'piper',
        },
        {
          name: chalk.cyan('🎤 ElevenLabs (Premium)') + chalk.gray(' - 150+ AI voices, requires API key'),
          value: 'elevenlabs',
        },
      ],
      default: 'piper',
    },
  ]);

  return provider;
}

/**
 * Handle Piper TTS configuration (voice storage location)
 * @returns {Promise<string>} Path where Piper voices will be stored
 */
async function handlePiperConfiguration() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const defaultPiperPath = path.join(homeDir, '.claude', 'piper-voices');

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
 * Handle ElevenLabs API key setup
 * @param {Object} options - Installation options
 * @returns {Promise<string|null>} API key or null
 */
async function handleElevenLabsApiKey(options) {
  let elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (elevenLabsKey) {
    console.log(chalk.green(`\n✓ ElevenLabs API key detected from environment`));
    console.log(chalk.gray(`  Key: ${elevenLabsKey.substring(0, 10)}...`));

    if (!options.yes) {
      const { useExisting } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useExisting',
          message: 'Use this existing API key?',
          default: true,
        },
      ]);

      if (!useExisting) {
        elevenLabsKey = null;
      }
    }
  }

  if (!elevenLabsKey) {
    console.log(chalk.yellow('\n⚠️  ElevenLabs API Key Required'));
    console.log(chalk.gray('   Get your free API key at: https://elevenlabs.io'));
    console.log(chalk.gray('   Free tier: 10,000 characters/month\n'));

    const { setupMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupMethod',
        message: 'How would you like to set up your API key?',
        choices: [
          {
            name: 'Add to shell config (recommended)',
            value: 'shell',
          },
          {
            name: 'Enter manually (I\'ll set it up myself later)',
            value: 'manual',
          },
          {
            name: 'Skip (use Piper TTS instead)',
            value: 'skip',
          },
        ],
      },
    ]);

    if (setupMethod === 'skip') {
      return 'SWITCH_TO_PIPER';
    }

    const { apiKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your ElevenLabs API key:',
        validate: (input) => input.length > 0 || 'API key cannot be empty',
      },
    ]);
    elevenLabsKey = apiKey;

    if (setupMethod === 'manual') {
      console.log(chalk.yellow('\n⚠️  Remember to add this to your environment variables later:'));
      console.log(chalk.gray(`   export ELEVENLABS_API_KEY="${apiKey}"\n`));
    } else if (setupMethod === 'shell') {
      await addApiKeyToShellConfig(apiKey);
    }
  }

  return elevenLabsKey;
}

/**
 * Add ElevenLabs API key to shell configuration
 * @param {string} apiKey - The API key to add
 */
async function addApiKeyToShellConfig(apiKey) {
  const { shellName, shellConfig } = getUserShell();

  if (!shellName || !shellConfig) {
    console.log(chalk.yellow('\n⚠️  Could not detect shell type'));
    console.log(chalk.gray('   Please add manually to your shell config:'));
    console.log(chalk.gray(`   export ELEVENLABS_API_KEY="${apiKey}"\n`));
    return;
  }

  console.log(chalk.cyan(`\n🐚 Detected shell: ${shellName}`));
  console.log(chalk.gray(`   Config file: ${shellConfig}`));

  const { confirmShell } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmShell',
      message: `Add ELEVENLABS_API_KEY to ${shellConfig}?`,
      default: true,
    },
  ]);

  if (confirmShell) {
    try {
      const configContent = `\n# ElevenLabs API Key for AgentVibes\nexport ELEVENLABS_API_KEY="${apiKey}"\n`;
      await fs.appendFile(shellConfig, configContent);
      console.log(chalk.green(`\n✓ API key added to ${shellConfig}`));
      console.log(chalk.yellow('  Run this to use immediately: ') + chalk.cyan(`source ${shellConfig}`));
    } catch (error) {
      console.log(chalk.red(`\n✗ Failed to write to ${shellConfig}`));
      console.log(chalk.gray('   Please add manually:'));
      console.log(chalk.gray(`   export ELEVENLABS_API_KEY="${apiKey}"\n`));
    }
  }
}

/**
 * Copy command files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<number>} Number of files copied
 */
async function copyCommandFiles(targetDir, spinner) {
  spinner.start('Installing /agent-vibes slash commands...');
  const srcCommandsDir = path.join(__dirname, '..', '.claude', 'commands', 'agent-vibes');
  const commandsDir = path.join(targetDir, '.claude', 'commands');
  const agentVibesCommandsDir = path.join(commandsDir, 'agent-vibes');

  await fs.mkdir(agentVibesCommandsDir, { recursive: true });

  const commandFiles = await fs.readdir(srcCommandsDir);
  console.log(chalk.cyan(`\n📋 Installing ${commandFiles.length} command files:`));

  for (const file of commandFiles) {
    const srcPath = path.join(srcCommandsDir, file);
    const destPath = path.join(agentVibesCommandsDir, file);
    await fs.copyFile(srcPath, destPath);
    console.log(chalk.gray(`   ✓ agent-vibes/${file}`));
  }

  spinner.succeed(chalk.green('Installed /agent-vibes commands!\n'));
  return commandFiles.length;
}

/**
 * Copy hook files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<number>} Number of files copied
 */
async function copyHookFiles(targetDir, spinner) {
  spinner.start('Installing TTS helper scripts...');
  const srcHooksDir = path.join(__dirname, '..', '.claude', 'hooks');
  const hooksDir = path.join(targetDir, '.claude', 'hooks');

  await fs.mkdir(hooksDir, { recursive: true });

  const allHookFiles = await fs.readdir(srcHooksDir);
  const hookFiles = [];

  for (const file of allHookFiles) {
    const srcPath = path.join(srcHooksDir, file);
    const stat = await fs.stat(srcPath);

    if (stat.isFile() &&
        (file.endsWith('.sh') || file === 'hooks.json') &&
        !file.includes('prepare-release') &&
        !file.startsWith('.')) {
      hookFiles.push(file);
    }
  }

  console.log(chalk.cyan(`🔧 Installing ${hookFiles.length} TTS scripts:`));
  for (const file of hookFiles) {
    const srcPath = path.join(srcHooksDir, file);
    const destPath = path.join(hooksDir, file);
    await fs.copyFile(srcPath, destPath);

    if (file.endsWith('.sh')) {
      await fs.chmod(destPath, 0o755);
      console.log(chalk.gray(`   ✓ ${file} (executable)`));
    } else {
      console.log(chalk.gray(`   ✓ ${file}`));
    }
  }

  spinner.succeed(chalk.green('Installed TTS scripts!\n'));
  return hookFiles.length;
}

/**
 * Copy personality files to target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} spinner - Ora spinner instance
 * @returns {Promise<number>} Number of files copied
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

  console.log(chalk.cyan(`🎭 Installing ${personalityMdFiles.length} personality templates:`));
  for (const file of personalityMdFiles) {
    const srcPath = path.join(srcPersonalitiesDir, file);
    const destPath = path.join(destPersonalitiesDir, file);
    await fs.copyFile(srcPath, destPath);
    console.log(chalk.gray(`   ✓ ${file}`));
  }

  spinner.succeed(chalk.green('Installed personality templates!\n'));
  return personalityMdFiles.length;
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
      execSync('command -v piper', { stdio: 'ignore' });
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
        console.log(chalk.cyan('\n📦 Installing Piper TTS...\n'));
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
          console.log(chalk.gray('   Or manually: pipx install piper-tts\n'));
        }
      } else {
        console.log(chalk.yellow('\n⚠️  Skipping Piper installation'));
        console.log(chalk.gray('   You can install it later by running:'));
        console.log(chalk.cyan(`   ${targetDir}/.claude/hooks/piper-installer.sh`));
        console.log(chalk.gray('   Or manually: pipx install piper-tts\n'));
      }
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Unable to auto-detect Piper installation'));
    console.log(chalk.gray('   Install manually if needed: pipx install piper-tts\n'));
  }
}

/**
 * Process TTS_INJECTION markers in BMAD files
 * Replaces markers with actual TTS instructions for both party mode and individual agents
 * @param {string} bmadPath - Path to BMAD installation (e.g., .bmad or bmad)
 */
async function processBmadTtsInjections(bmadPath) {
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

  // Default voice assignments for common BMAD agents
  const defaultVoices = `agent_id,voice_name
pm,en_US-ryan-high
architect,en_US-danny-low
dev,en_US-joe-medium
analyst,en_US-amy-medium
ux-designer,en_US-kristin-medium
tea,en_US-lessac-medium
sm,en_US-bryce-medium
tech-writer,en_US-kathleen-low
frame-expert,en_US-kusal-medium
bmad-master,en_US-libritts_r-high
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

  const defaultVoices = `agent_id,voice_name
pm,en_US-ryan-high
architect,en_US-danny-low
dev,en_US-joe-medium
analyst,en_US-amy-medium
ux-designer,en_US-kristin-medium
tea,en_US-lessac-medium
sm,en_US-bryce-medium
tech-writer,en_US-kathleen-low
frame-expert,en_US-kusal-medium
bmad-master,en_US-libritts_r-high
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
async function detectAndMigrateOldConfig(targetDir, spinner) {
  const oldConfigPaths = [
    path.join(targetDir, '.claude', 'config', 'agentvibes.json'),
    path.join(targetDir, '.claude', 'config', 'bmad-voices.md'),
    path.join(targetDir, '.claude', 'config', 'bmad-voices-enabled.flag'),
    path.join(targetDir, '.claude', 'plugins', 'bmad-voices-enabled.flag'),
    path.join(targetDir, '.claude', 'plugins', 'bmad-party-mode-disabled.flag'),
  ];

  // Check if any old config exists
  let hasOldConfig = false;
  for (const oldPath of oldConfigPaths) {
    try {
      await fs.access(oldPath);
      hasOldConfig = true;
      break;
    } catch {
      // File doesn't exist, continue
    }
  }

  if (!hasOldConfig) {
    return false; // No migration needed
  }

  spinner.info(chalk.yellow('🔄 Old configuration detected - migrating to .agentvibes/'));

  // Run migration script
  const migrationScript = path.join(targetDir, '.claude', 'hooks', 'migrate-to-agentvibes.sh');

  try {
    await fs.access(migrationScript);

    // Execute migration script
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execPromise = promisify(exec);

    await execPromise(`bash "${migrationScript}"`, { cwd: targetDir });

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

/**
 * Handle BMAD integration (detection and TTS injection)
 * @param {string} targetDir - Target installation directory
 * @returns {Promise<Object>} BMAD detection result
 */
async function handleBmadIntegration(targetDir) {
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
  await processBmadTtsInjections(bmadDetection.bmadPath);

  console.log(chalk.green('✅ BMAD agents will use agent-specific voices via bmad-speak.sh hook'));

  return bmadDetection;
}

/**
 * Show git commit history or fallback to release notes
 * @param {string} sourceDir - Source directory containing git repo or release notes
 */
async function showRecentChanges(sourceDir) {
  try {
    const { execSync } = await import('node:child_process');
    const gitLog = execSync(
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
            const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
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
 * Update AgentVibes files in target directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} options - Update options
 */
async function updateAgentVibes(targetDir, options) {
  const spinner = ora('Updating AgentVibes...').start();

  try {
    const claudeDir = path.join(targetDir, '.claude');
    const commandsDir = path.join(targetDir, '.claude', 'commands', 'agent-vibes');

    // Update commands
    spinner.text = 'Updating commands...';
    const srcCommandsDir = path.join(__dirname, '..', '.claude', 'commands', 'agent-vibes');
    const commandFiles = await fs.readdir(srcCommandsDir);

    for (const file of commandFiles) {
      const srcPath = path.join(srcCommandsDir, file);
      const destPath = path.join(commandsDir, file);
      await fs.copyFile(srcPath, destPath);
    }
    console.log(chalk.green(`\n✓ Updated ${commandFiles.length} commands`));

    // Update hooks
    spinner.text = 'Updating TTS scripts...';
    const hookFileCount = await copyHookFiles(targetDir, { start: () => {}, succeed: () => {}, info: () => {}, fail: () => {} });
    console.log(chalk.green(`✓ Updated ${hookFileCount} TTS scripts`));

    // Update personalities
    spinner.text = 'Updating personality templates...';
    const srcPersonalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
    const personalityResult = await updatePersonalityFiles(targetDir, srcPersonalitiesDir);
    console.log(chalk.green(`✓ Updated ${personalityResult.updated} personalities, added ${personalityResult.new} new`));

    // Output styles removed - deprecated in favor of SessionStart hook system

    // Update plugin files
    const pluginFileCount = await copyPluginFiles(targetDir, { start: () => {}, succeed: () => {}, info: () => {}, fail: () => {} });
    if (pluginFileCount > 0) {
      console.log(chalk.green(`✓ Updated ${pluginFileCount} BMAD plugin files`));
    }

    // Update BMAD config files
    const bmadConfigFileCount = await copyBmadConfigFiles(targetDir, { start: () => {}, succeed: () => {}, info: () => {}, fail: () => {} });
    if (bmadConfigFileCount > 0) {
      console.log(chalk.green(`✓ Updated ${bmadConfigFileCount} BMAD config files`));
    }

    // Update settings.json
    spinner.text = 'Updating AgentVibes hook configuration...';
    await configureSessionStartHook(targetDir, { start: () => {}, succeed: () => {}, info: () => {}, fail: () => {} });

    // Detect and migrate old configuration
    spinner.text = 'Checking for old configuration...';
    await detectAndMigrateOldConfig(targetDir, spinner);

    spinner.succeed(chalk.green.bold('\n✨ Update complete!\n'));

    console.log(chalk.cyan('📦 Update Summary:'));
    console.log(chalk.white(`   • ${commandFiles.length} commands updated`));
    console.log(chalk.white(`   • ${hookFileCount} TTS scripts updated`));
    console.log(chalk.white(`   • ${personalityResult.new + personalityResult.updated} personality templates (${personalityResult.new} new, ${personalityResult.updated} updated)`));
    console.log(chalk.white(`   • ${outputStyleFiles.length} output styles updated`));
    if (pluginFileCount > 0) {
      console.log(chalk.white(`   • ${pluginFileCount} BMAD plugin files updated`));
    }
    console.log('');

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
  showWelcome();

  const currentDir = process.env.INIT_CWD || process.cwd();

  console.log(chalk.cyan('\n📍 Installation Details:'));
  console.log(chalk.gray(`   Install location: ${currentDir}/.claude/`));
  console.log(chalk.gray(`   Package version: ${VERSION}`));

  showReleaseInfo();

  // Provider selection
  let selectedProvider = await promptProviderSelection(options);
  let elevenLabsKey = null;
  let piperVoicesPath = null;

  if (options.yes) {
    console.log(chalk.green('✓ Auto-confirmed (--yes flag)'));
  }

  // Handle provider-specific configuration
  if (selectedProvider === 'piper' && !options.yes) {
    piperVoicesPath = await handlePiperConfiguration();
  }

  if (selectedProvider === 'elevenlabs') {
    elevenLabsKey = await handleElevenLabsApiKey(options);
    if (elevenLabsKey === 'SWITCH_TO_PIPER') {
      console.log(chalk.yellow('\n→ Switching to Piper TTS (free option)\n'));
      selectedProvider = 'piper';
      elevenLabsKey = null;
    }
  }

  if (!options.yes) {
    console.log(''); // Spacing
  }

  const targetDir = options.directory || currentDir;

  // Confirm installation location
  if (!options.yes) {
    console.log(chalk.cyan('\n📂 Installation Location:\n'));
    console.log(chalk.white('   AgentVibes will be installed in:'));
    console.log(chalk.yellow(`   ${targetDir}/.claude/\n`));
    console.log(chalk.gray('   Why .claude/?'));
    console.log(chalk.gray('   • Claude Code automatically discovers tools in .claude/ directories'));
    console.log(chalk.gray('   • This makes slash commands and TTS features immediately available'));
    console.log(chalk.gray('   • Project-specific installation keeps your setup isolated\n'));

    const { confirmLocation } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmLocation',
        message: `Install AgentVibes in ${targetDir}/.claude/ ?`,
        default: true,
      },
    ]);

    if (!confirmLocation) {
      console.log(chalk.red('\n❌ Installation cancelled.\n'));
      process.exit(0);
    }
  }

  console.log(chalk.cyan('\n📦 What will be installed:'));
  console.log(chalk.gray(`   • 16 slash commands → ${targetDir}/.claude/commands/agent-vibes/`));
  console.log(chalk.gray(`   • Multi-provider TTS system (ElevenLabs + Piper TTS) → ${targetDir}/.claude/hooks/`));
  console.log(chalk.gray(`   • 19 personality templates → ${targetDir}/.claude/personalities/`));
  console.log(chalk.gray(`   • SessionStart hook for automatic TTS activation`));
  console.log(chalk.gray(`   • 27+ curated voices (ElevenLabs premium)`));
  console.log(chalk.gray(`   • 50+ neural voices (Piper TTS - free & offline)`));
  console.log(chalk.gray(`   • 30+ language support with native voices`));
  console.log(chalk.gray(`   • BMAD integration for multi-agent sessions\n`));

  // Final confirmation
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow(`Proceed with installation using ${selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Piper TTS'}?`),
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.red('\n❌ Installation cancelled.\n'));
      process.exit(0);
    }
  }

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
      console.log(chalk.gray(`   → ${commandsDir}`));
      console.log(chalk.gray(`   → ${hooksDir}`));
      await fs.mkdir(commandsDir, { recursive: true });
      await fs.mkdir(hooksDir, { recursive: true });
      console.log(chalk.green('   ✓ Directories created!\n'));
    } else {
      spinner.succeed(chalk.green('.claude directory found!'));
      console.log(chalk.gray(`   Location: ${claudeDir}\n`));
    }

    // Copy all files using helper functions
    const commandFileCount = await copyCommandFiles(targetDir, spinner);
    const hookFileCount = await copyHookFiles(targetDir, spinner);
    const personalityFileCount = await copyPersonalityFiles(targetDir, spinner);
    const pluginFileCount = await copyPluginFiles(targetDir, spinner);
    const bmadConfigFileCount = await copyBmadConfigFiles(targetDir, spinner);

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

    spinner.succeed(chalk.green(`Provider set to: ${selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Piper TTS'}\n`));

    // Detect and migrate old configuration
    await detectAndMigrateOldConfig(targetDir, spinner);

    // Auto-install Piper if selected
    if (selectedProvider === 'piper') {
      await checkAndInstallPiper(targetDir, options);
    }

    // Display installation summary
    console.log(chalk.cyan('📦 Installation Summary:'));
    console.log(chalk.white(`   • ${commandFileCount} slash commands installed`));
    console.log(chalk.white(`   • ${hookFileCount} TTS scripts installed`));
    console.log(chalk.white(`   • ${personalityFileCount} personality templates installed`));
    console.log(chalk.white(`   • SessionStart hook configured for automatic TTS`));
    if (pluginFileCount > 0) {
      console.log(chalk.white(`   • ${pluginFileCount} BMAD plugin files installed`));
    }
    if (bmadConfigFileCount > 0) {
      console.log(chalk.white(`   • ${bmadConfigFileCount} BMAD config files installed`));
    }
    console.log(chalk.white(`   • Voice manager ready`));

    if (selectedProvider === 'elevenlabs') {
      console.log(chalk.white(`   • 27+ ElevenLabs AI voices available`));
      console.log(chalk.white(`   • 30+ languages supported`));
      if (elevenLabsKey) {
        console.log(chalk.green(`   • ElevenLabs API key configured ✓`));
      } else {
        console.log(chalk.yellow(`   • ElevenLabs API key: Set manually later`));
      }
    } else {
      console.error(chalk.red(`   DEBUG: In Piper block, selectedProvider = ${selectedProvider}`));
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
        console.error(chalk.gray(`   Debug: Checking ${piperVoicesDir}`));
        if (fsSync.existsSync(piperVoicesDir)) {
          const files = fsSync.readdirSync(piperVoicesDir);
          console.error(chalk.gray(`   Debug: Found ${files.length} files`));
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
                console.error(chalk.gray(`   Debug: Skipped ${voiceName} (${statErr.message})`));
                return null;
              }
            })
            .filter(v => v !== null);
          console.error(chalk.gray(`   Debug: ${installedVoices.length} valid voices after filtering`));

          // Check which common voices are missing
          for (const voice of commonVoices) {
            if (!installedVoices.some(v => v.name === voice)) {
              missingVoices.push(voice);
            }
          }
          console.error(chalk.gray(`   Debug: ${missingVoices.length} missing voices`));
        } else {
          console.error(chalk.gray(`   Debug: Directory does not exist`));
          missingVoices = commonVoices;
        }
      } catch (err) {
        console.error(chalk.gray(`   Debug: Error checking voices: ${err.message}`));
        // On error, show default message
        installedVoices = [];
        missingVoices = commonVoices;
      }

      console.log(chalk.white(`   • 18 languages supported`));
      console.log(chalk.green(`   • No API key needed ✓`));

      if (installedVoices.length > 0) {
        console.log(chalk.green(`   • ${installedVoices.length} Piper voices installed:`));
        installedVoices.forEach(voice => {
          console.log(chalk.green(`     ✓ ${voice.name} (${voice.size})`));
          console.log(chalk.gray(`       ${voice.path}`));
        });
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

    // Pause to let user review installation summary
    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.cyan('📋 Review the installation summary above. Continue?'),
        default: true,
      }
    ]);

    // Show recent changes from git log or RELEASE_NOTES.md
    try {
      const { execSync } = await import('node:child_process');
      const gitLog = execSync(
        'git log --oneline --no-decorate -5',
        { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
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
      // Git not available or not a git repo - try RELEASE_NOTES.md
      try {
        const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
        const releaseNotes = await fs.readFile(releaseNotesPath, 'utf8');

        // Extract commits from "Recent Commits" section
        const lines = releaseNotes.split('\n');
        const commitsIndex = lines.findIndex(line => line.includes('## 📝 Recent Commits'));

        if (commitsIndex >= 0) {
          console.log(chalk.cyan('📝 Recent Changes:\n'));

          // Find the code block with commits (between ``` markers)
          let inCodeBlock = false;
          for (let i = commitsIndex + 1; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim() === '```') {
              if (inCodeBlock) break; // End of code block
              inCodeBlock = true;
              continue;
            }

            if (inCodeBlock && line.trim()) {
              // Parse commit line: "hash message"
              const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
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

    // Success message
    console.log(
      boxen(
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
        chalk.gray('📦 Repo: ') + chalk.cyan('https://github.com/paulpreibisch/AgentVibes'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'green',
        }
      )
    );

    console.log(chalk.green.bold('\n✅ AgentVibes is Ready!'));
    console.log(chalk.white('   TTS protocol automatically loads on every Claude session'));
    console.log(chalk.gray('   via SessionStart hook - no additional setup needed!\n'));
    console.log(chalk.cyan('🎤 Try these commands:'));
    console.log(chalk.white('   • /agent-vibes:list') + chalk.gray(' - See all available voices'));
    console.log(chalk.white('   • /agent-vibes:switch <name>') + chalk.gray(' - Change your voice'));
    console.log(chalk.white('   • /agent-vibes:personality <style>') + chalk.gray(' - Set personality\n'));

    // Pause to let user review setup instructions
    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.cyan('Continue?'),
        default: true,
      }
    ]);

    // Recommend MCP Server installation
    console.log(
      boxen(
        chalk.cyan.bold('🎙️ Want Natural Language Control?\n\n') +
        chalk.white.bold('AgentVibes MCP Server - Control TTS with Natural Language!\n\n') +
        chalk.gray('Use natural language instead of slash commands:\n') +
        chalk.gray('   "Switch to Aria voice" instead of /agent-vibes:switch "Aria"\n') +
        chalk.gray('   "Set personality to sarcastic" instead of /agent-vibes:personality sarcastic\n\n') +
        chalk.cyan('📋 Claude Code MCP Configuration:\n\n') +
        chalk.white('Add this to your ') + chalk.cyan('~/.claude/mcp.json') + chalk.white(':'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    // Display JSON config without border
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

    // Bottom section with border
    console.log(
      boxen(
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

    // Pause to let user review MCP server info
    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.cyan('🎙️  Review MCP Server setup info above. Continue?'),
        default: true,
      }
    ]);

    // Create default BMAD voice assignments (works even if BMAD not installed yet)
    await createDefaultBmadVoiceAssignmentsProactive(targetDir);

    // Handle BMAD integration
    const bmadDetection = await handleBmadIntegration(targetDir);
    const bmadDetected = bmadDetection.installed;

    if (bmadDetected) {
      const versionLabel = bmadDetection.version === 6
        ? `v${bmadDetection.detailedVersion}`
        : 'v4';

      console.log(
        boxen(
          chalk.green.bold(`🎉 BMAD-METHOD ${versionLabel} Integration Complete!\n\n`) +
          chalk.white('✅ BMAD Voice Plugin: AUTO-ENABLED\n') +
          chalk.white('✅ TTS Hooks: INJECTED into all agent files\n') +
          chalk.gray('Each BMAD agent will automatically use its assigned voice\n') +
          chalk.gray('and speak when activated!\n\n') +
          chalk.cyan('Commands:\n') +
          chalk.gray('  • /agent-vibes:bmad status - View TTS injection status\n') +
          chalk.gray('  • /agent-vibes:bmad set <agent> <voice> - Customize voices\n') +
          chalk.gray('  • /agent-vibes:bmad disable - Disable TTS for all agents\n') +
          chalk.gray('  • /agent-vibes:bmad restore - Restore agents from backup'),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
    } else {
      console.log(
        boxen(
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
        )
      );
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

    // Check API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (apiKey) {
      console.log(chalk.green('\n✅ ElevenLabs API key is set'));
    } else {
      console.log(chalk.yellow('\n⚠️  ElevenLabs API key not found'));
      console.log(chalk.gray('   Set: export ELEVENLABS_API_KEY="your-key"'));
    }
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

program.parse(process.argv);

// Show help if no command provided
if (process.argv.slice(2).length === 0) {
  showWelcome();
  program.outputHelp();
}
