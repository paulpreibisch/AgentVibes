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
import chalk from 'chalk';
import inquirer from 'inquirer';
import figlet from 'figlet';
import { detectBMAD } from './bmad-detector.js';
import boxen from 'boxen';
import ora from 'ora';
import { fileURLToPath } from 'node:url';
import { installMCP } from './commands/install-mcp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const VERSION = packageJson.version;

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

// Installation function
async function install(options = {}) {
  showWelcome();

  // When running via npx, process.cwd() returns the npm cache directory
  // Use INIT_CWD (set by npm/npx) to get the actual user's working directory
  const currentDir = process.env.INIT_CWD || process.cwd();

  console.log(chalk.cyan('\n📍 Installation Details:'));
  console.log(chalk.gray(`   Install location: ${currentDir}/.claude/`));
  console.log(chalk.gray(`   Package version: ${VERSION}`));

  // Show AI summary of latest release
  console.log(
    boxen(
      chalk.white.bold('═══════════════════════════════════════════════════════════════\n') +
      chalk.cyan.bold('  📦 AgentVibes v2.1.5 - Critical macOS Fix\n') +
      chalk.white.bold('═══════════════════════════════════════════════════════════════\n\n') +
      chalk.red.bold('🐛 CRITICAL macOS FIX:\n\n') +
      chalk.cyan('All 23 shell scripts now use #!/usr/bin/env bash instead of\n') +
      chalk.cyan('#!/bin/bash, enabling AgentVibes to work on macOS. The old\n') +
      chalk.cyan('shebang forced bash 3.2 (from 2007) which doesn\'t support\n') +
      chalk.cyan('associative arrays or modern bash syntax, causing complete\n') +
      chalk.cyan('failure on Mac.\n\n') +
      chalk.green('Mac users: brew install bash (one-time setup)\n') +
      chalk.green('Then AgentVibes works perfectly!\n\n') +
      chalk.white.bold('✨ NEW FEATURES:\n\n') +
      chalk.cyan('🤖 FREE GitHub Actions macOS Testing\n') +
      chalk.gray('   • Tests on macOS 13/14/15 (Intel + M1/M2/M3)\n') +
      chalk.gray('   • Node 18, 20, 22 tested automatically\n') +
      chalk.gray('   • 13 parallel test jobs on every push\n') +
      chalk.gray('   • Saves $60-276/year vs Mac VPS!\n\n') +
      chalk.cyan('💡 Provider Switch Hint\n') +
      chalk.gray('   • Helpful hints in voice list output\n') +
      chalk.gray('   • Discover ElevenLabs ↔ Piper switching\n\n') +
      chalk.white('───────────────────────────────────────────────────────────────\n\n') +
      chalk.blue.bold('📊 IMPACT:\n') +
      chalk.gray('   • 30 files changed\n') +
      chalk.gray('   • 877 insertions, 31 deletions\n') +
      chalk.gray('   • AgentVibes now works on macOS!\n') +
      chalk.gray('   • FREE automated testing on all platforms\n\n') +
      chalk.white.bold('═══════════════════════════════════════════════════════════════\n\n') +
      chalk.green.bold('🚀 TRY LANGUAGE LEARNING MODE:\n\n') +
      chalk.cyan('  /agent-vibes:language english\n') +
      chalk.cyan('  /agent-vibes:target spanish\n') +
      chalk.cyan('  /agent-vibes:learn\n\n') +
      chalk.white('  Now while coding, you can also learn a second language\n') +
      chalk.white('  such as Spanish, Italian, French, Mandarin, you name it! 🌍\n\n') +
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

  // Provider selection prompt
  let selectedProvider = 'piper';
  let elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  let piperVoicesPath = null;

  if (!options.yes) {
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

    selectedProvider = provider;

    // If Piper selected, ask for voice storage location
    if (selectedProvider === 'piper') {
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

      piperVoicesPath = piperPath;
      console.log(chalk.green(`✓ Piper voices will be stored in: ${piperVoicesPath}`));
    }

    // If ElevenLabs selected, handle API key
    if (selectedProvider === 'elevenlabs') {
      if (elevenLabsKey) {
        console.log(chalk.green(`\n✓ ElevenLabs API key detected from environment`));
        console.log(chalk.gray(`  Key: ${elevenLabsKey.substring(0, 10)}...`));

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
          console.log(chalk.yellow('\n→ Switching to Piper TTS (free option)\n'));
          selectedProvider = 'piper';
        } else if (setupMethod === 'manual') {
          const { apiKey } = await inquirer.prompt([
            {
              type: 'input',
              name: 'apiKey',
              message: 'Enter your ElevenLabs API key:',
              validate: (input) => input.length > 0 || 'API key cannot be empty',
            },
          ]);
          elevenLabsKey = apiKey;
          console.log(chalk.yellow('\n⚠️  Remember to add this to your environment variables later:'));
          console.log(chalk.gray(`   export ELEVENLABS_API_KEY="${apiKey}"\n`));
        } else if (setupMethod === 'shell') {
          const { apiKey } = await inquirer.prompt([
            {
              type: 'input',
              name: 'apiKey',
              message: 'Enter your ElevenLabs API key:',
              validate: (input) => input.length > 0 || 'API key cannot be empty',
            },
          ]);
          elevenLabsKey = apiKey;

          // Detect shell
          const shell = process.env.SHELL || '';
          let shellConfig = '';
          let shellName = '';

          if (shell.includes('zsh')) {
            shellConfig = path.join(process.env.HOME, '.zshrc');
            shellName = 'zsh';
          } else if (shell.includes('bash')) {
            shellConfig = path.join(process.env.HOME, '.bashrc');
            shellName = 'bash';
          } else {
            console.log(chalk.yellow('\n⚠️  Could not detect shell type'));
            console.log(chalk.gray('   Please add manually to your shell config:'));
            console.log(chalk.gray(`   export ELEVENLABS_API_KEY="${apiKey}"\n`));
          }

          if (shellConfig && shellName) {
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
        }
      }
    }

    console.log(''); // Spacing
  } else {
    console.log(chalk.green('✓ Auto-confirmed (--yes flag)'));
    // Auto-detect provider based on API key
    if (elevenLabsKey) {
      selectedProvider = 'elevenlabs';
      console.log(chalk.green('✓ Using ElevenLabs (API key detected)\n'));
    } else {
      selectedProvider = 'piper';
      console.log(chalk.green('✓ Using Piper TTS (free option)\n'));
    }
  }

  // Use current directory for installation (where installer was run)
  const targetDir = options.directory || currentDir;

  // Explain why installing in .claude/ and confirm
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
  console.log(chalk.gray(`   • Agent Vibes output style → ${targetDir}/.claude/output-styles/`));
  console.log(chalk.gray(`   • 27+ curated voices (ElevenLabs premium)`));
  console.log(chalk.gray(`   • 50+ neural voices (Piper TTS - free & offline)`));
  console.log(chalk.gray(`   • 30+ language support with native voices`));
  console.log(chalk.gray(`   • BMAD integration for multi-agent sessions\n`));

  // Final confirmation prompt (unless --yes flag is used)
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

  console.log(''); // Add spacing
  const spinner = ora('Checking installation directory...').start();

  try {
    // Check if .claude directory exists
    const claudeDir = path.join(targetDir, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');
    const hooksDir = path.join(claudeDir, 'hooks');
    const outputStylesDir = path.join(claudeDir, 'output-styles');

    let exists = false;
    try {
      await fs.access(claudeDir);
      exists = true;
    } catch {}

    if (!exists) {
      spinner.info(chalk.yellow('Creating .claude directory structure...'));
      console.log(chalk.gray(`   → ${commandsDir}`));
      console.log(chalk.gray(`   → ${hooksDir}`));
      console.log(chalk.gray(`   → ${outputStylesDir}`));
      await fs.mkdir(commandsDir, { recursive: true });
      await fs.mkdir(hooksDir, { recursive: true });
      await fs.mkdir(outputStylesDir, { recursive: true });
      console.log(chalk.green('   ✓ Directories created!\n'));
    } else {
      spinner.succeed(chalk.green('.claude directory found!'));
      console.log(chalk.gray(`   Location: ${claudeDir}\n`));
    }

    // Copy command files
    spinner.start('Installing /agent-vibes slash commands...');
    const srcCommandsDir = path.join(__dirname, '..', '.claude', 'commands', 'agent-vibes');
    const srcHooksDir = path.join(__dirname, '..', '.claude', 'hooks');

    // Create agent-vibes commands directory
    const agentVibesCommandsDir = path.join(commandsDir, 'agent-vibes');
    await fs.mkdir(agentVibesCommandsDir, { recursive: true });

    // Copy all command files to agent-vibes folder
    const commandFiles = await fs.readdir(srcCommandsDir);
    console.log(chalk.cyan(`\n📋 Installing ${commandFiles.length} command files:`));
    for (const file of commandFiles) {
      const srcPath = path.join(srcCommandsDir, file);
      const destPath = path.join(agentVibesCommandsDir, file);
      await fs.copyFile(srcPath, destPath);
      console.log(chalk.gray(`   ✓ agent-vibes/${file}`));
    }
    spinner.succeed(chalk.green('Installed /agent-vibes commands!\n'));

    // Copy hook scripts
    spinner.start('Installing TTS helper scripts...');

    // Ensure hooks directory exists
    await fs.mkdir(hooksDir, { recursive: true });

    const allHookFiles = await fs.readdir(srcHooksDir);

    // Filter to only include files (not directories) and exclude project-specific files
    const hookFiles = [];
    for (const file of allHookFiles) {
      const srcPath = path.join(srcHooksDir, file);
      const stat = await fs.stat(srcPath);

      // Copy shell scripts and hooks.json, skip directories and unwanted files
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
      // Make shell scripts executable, but not JSON files
      if (file.endsWith('.sh')) {
        await fs.chmod(destPath, 0o755);
        console.log(chalk.gray(`   ✓ ${file} (executable)`));
      } else {
        console.log(chalk.gray(`   ✓ ${file}`));
      }
    }
    spinner.succeed(chalk.green('Installed TTS scripts!\n'));

    // Copy personalities folder
    spinner.start('Installing personality templates...');
    const srcPersonalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
    const destPersonalitiesDir = path.join(claudeDir, 'personalities');

    // Create personalities directory
    await fs.mkdir(destPersonalitiesDir, { recursive: true });

    // Copy all personality files (excluding directories like 'backups')
    const personalityFiles = await fs.readdir(srcPersonalitiesDir);
    const personalityMdFiles = [];

    for (const file of personalityFiles) {
      const srcPath = path.join(srcPersonalitiesDir, file);
      const stat = await fs.stat(srcPath);

      // Only copy .md files, skip directories
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

    // Copy output styles
    spinner.start('Installing output styles...');
    const srcOutputStylesDir = path.join(__dirname, '..', 'templates', 'output-styles');

    // Create output-styles directory if it doesn't exist
    try {
      await fs.mkdir(outputStylesDir, { recursive: true });
    } catch {}

    const outputStyleFiles = await fs.readdir(srcOutputStylesDir);
    console.log(chalk.cyan(`📝 Installing ${outputStyleFiles.length} output styles:`));
    for (const file of outputStyleFiles) {
      const srcPath = path.join(srcOutputStylesDir, file);
      const destPath = path.join(outputStylesDir, file);
      await fs.copyFile(srcPath, destPath);
      console.log(chalk.gray(`   ✓ ${file}`));
    }
    spinner.succeed(chalk.green('Installed output styles!\n'));

    // Copy plugins folder (BMAD voice mappings)
    spinner.start('Installing BMAD plugin files...');
    const srcPluginsDir = path.join(__dirname, '..', '.claude', 'plugins');
    const destPluginsDir = path.join(claudeDir, 'plugins');

    // Create plugins directory
    await fs.mkdir(destPluginsDir, { recursive: true });

    // Copy only .md files from plugins directory
    let pluginFiles = [];
    try {
      const allPluginFiles = await fs.readdir(srcPluginsDir);
      for (const file of allPluginFiles) {
        const srcPath = path.join(srcPluginsDir, file);
        const stat = await fs.stat(srcPath);

        // Only copy .md files, skip .flag files (those are runtime generated)
        if (stat.isFile() && file.endsWith('.md')) {
          pluginFiles.push(file);
          const destPath = path.join(destPluginsDir, file);
          await fs.copyFile(srcPath, destPath);
          console.log(chalk.gray(`   ✓ ${file}`));
        }
      }
      spinner.succeed(chalk.green('Installed BMAD plugin files!\n'));
    } catch (error) {
      // Plugins directory might not exist in source - that's okay
      spinner.info(chalk.yellow('No plugin files found (optional)\n'));
    }

    // Install settings.json with SessionStart hook
    spinner.start('Configuring AgentVibes hook for automatic TTS...');
    const settingsPath = path.join(claudeDir, 'settings.json');
    const templateSettingsPath = path.join(__dirname, '..', '.claude', 'settings.json');

    try {
      // Check if settings.json already exists
      let existingSettings = {};
      try {
        const existingContent = await fs.readFile(settingsPath, 'utf8');
        existingSettings = JSON.parse(existingContent);
      } catch {
        // File doesn't exist or is invalid - use template
      }

      // Read template settings
      const templateContent = await fs.readFile(templateSettingsPath, 'utf8');
      const templateSettings = JSON.parse(templateContent);

      // Merge: Add SessionStart hook if not already present
      if (!existingSettings.hooks) {
        existingSettings.hooks = {};
      }

      if (!existingSettings.hooks.SessionStart) {
        existingSettings.hooks.SessionStart = templateSettings.hooks.SessionStart;

        // Add schema if not present
        if (!existingSettings.$schema) {
          existingSettings.$schema = templateSettings.$schema;
        }

        // Write merged settings
        await fs.writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));
        spinner.succeed(chalk.green('SessionStart hook configured!\n'));
      } else {
        spinner.info(chalk.yellow('SessionStart hook already configured\n'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to configure hook: ' + error.message + '\n'));
    }

    // Install plugin manifest (.claude-plugin/plugin.json)
    spinner.start('Installing AgentVibes plugin manifest...');
    const pluginDir = path.join(targetDir, '.claude-plugin');
    const srcPluginManifest = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');
    const destPluginManifest = path.join(pluginDir, 'plugin.json');

    try {
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.copyFile(srcPluginManifest, destPluginManifest);
      spinner.succeed(chalk.green('Plugin manifest installed!\n'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to install plugin manifest: ' + error.message + '\n'));
    }

    // Save provider selection
    spinner.start('Saving provider configuration...');
    const providerConfigPath = path.join(claudeDir, 'tts-provider.txt');
    await fs.writeFile(providerConfigPath, selectedProvider);

    // Save Piper voices directory if Piper is selected
    if (selectedProvider === 'piper' && piperVoicesPath) {
      const piperConfigPath = path.join(claudeDir, 'piper-voices-dir.txt');
      await fs.writeFile(piperConfigPath, piperVoicesPath);
    }

    spinner.succeed(chalk.green(`Provider set to: ${selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Piper TTS'}\n`));

    // Auto-install Piper if selected and not already installed
    if (selectedProvider === 'piper') {
      try {
        const { execSync } = await import('node:child_process');

        // Check if piper is installed
        try {
          execSync('command -v piper', { stdio: 'ignore' });
          console.log(chalk.green('✅ Piper TTS is already installed\n'));
        } catch {
          // Piper not installed - offer to install it
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
            const piperInstallerPath = path.join(hooksDir, 'piper-installer.sh');

            try {
              execSync(`bash "${piperInstallerPath}"`, {
                stdio: 'inherit',
                env: process.env
              });
              console.log(chalk.green('\n✅ Piper TTS installed successfully!\n'));
            } catch (error) {
              console.log(chalk.yellow('\n⚠️  Piper installation failed or was cancelled'));
              console.log(chalk.gray('   You can install it later by running:'));
              console.log(chalk.cyan(`   bash "${piperInstallerPath}"`));
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
        // execSync import failed - skip auto-install
        console.log(chalk.yellow('⚠️  Unable to auto-detect Piper installation'));
        console.log(chalk.gray('   Install manually if needed: pipx install piper-tts\n'));
      }
    }

    // List what was installed
    console.log(chalk.cyan('📦 Installation Summary:'));
    console.log(chalk.white(`   • ${commandFiles.length} slash commands installed`));
    console.log(chalk.white(`   • ${hookFiles.length} TTS scripts installed`));
    console.log(chalk.white(`   • ${personalityMdFiles.length} personality templates installed`));
    console.log(chalk.white(`   • ${outputStyleFiles.length} output styles installed`));
    if (pluginFiles.length > 0) {
      console.log(chalk.white(`   • ${pluginFiles.length} BMAD plugin files installed`));
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
      console.log(chalk.white(`   • 50+ Piper neural voices available (free!)`));
      console.log(chalk.white(`   • 18 languages supported`));
      console.log(chalk.green(`   • No API key needed ✓`));
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
    console.log(chalk.white('   TTS protocol automatically loads on every Claude Code session'));
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
        chalk.white('Add this to your ') + chalk.cyan('~/.claude/mcp.json') + chalk.white(':\n\n') +
        '{\n' +
        '  "mcpServers": {\n' +
        '    "agentvibes": {\n' +
        '      "command": "npx",\n' +
        '      "args": ["-y", "agentvibes-mcp-server"]\n' +
        '    }\n' +
        '  }\n' +
        '}\n\n' +
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

    // Check for BMAD installation (both v4 and v6)
    const bmadDetection = await detectBMAD(targetDir);
    const bmadDetected = bmadDetection.installed;

    // Auto-enable BMAD plugin and create activation-instructions if BMAD detected
    if (bmadDetected) {
      const versionLabel = bmadDetection.version === 6
        ? `v6 (${bmadDetection.detailedVersion})`
        : 'v4';

      console.log(chalk.green(`\n🎉 BMAD-METHOD ${versionLabel} detected!`));
      console.log(chalk.gray(`   Location: ${bmadDetection.bmadPath}`));

      const pluginsDir = path.join(claudeDir, 'plugins');
      const enabledFlagPath = path.join(pluginsDir, 'bmad-voices-enabled.flag');
      const activationInstructionsPath = path.join(claudeDir, 'activation-instructions');

      // Auto-enable the plugin (create the flag file)
      await fs.mkdir(pluginsDir, { recursive: true });
      await fs.writeFile(enabledFlagPath, '');
      console.log(chalk.green('🎤 Auto-enabled BMAD voice plugin'));

      // Only create if doesn't exist (don't overwrite user customizations)
      try {
        await fs.access(activationInstructionsPath);
      } catch {
        // File doesn't exist - create it with version-specific instructions
        const activationContent = generateActivationInstructions(bmadDetection.version);
        await fs.writeFile(activationInstructionsPath, activationContent);
        console.log(chalk.green('📝 Created BMAD activation instructions'));
      }
    }

    if (bmadDetected) {
      const versionLabel = bmadDetection.version === 6
        ? `v${bmadDetection.detailedVersion}`
        : 'v4';

      console.log(
        boxen(
          chalk.green.bold(`🎉 BMAD-METHOD ${versionLabel} Detected!\n\n`) +
          chalk.white('✅ BMAD Voice Plugin: AUTO-ENABLED\n') +
          chalk.gray('Each BMAD agent will automatically use its assigned voice\n') +
          chalk.gray('and speak when activated!\n\n') +
          chalk.cyan('Commands:\n') +
          chalk.gray('  • /agent-vibes:bmad status - View agent voices\n') +
          chalk.gray('  • /agent-vibes:bmad set <agent> <voice> - Customize\n') +
          chalk.gray('  • /agent-vibes:bmad disable - Turn off if unwanted'),
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
    // When running via npx, process.cwd() returns the npm cache directory
    // Use INIT_CWD (set by npm/npx) to get the actual user's working directory
    const currentDir = process.env.INIT_CWD || process.cwd();
    const targetDir = options.directory || currentDir;

    // Read version from package.json
    const packageJson = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    const version = packageJson.version;

    // Generate two-tone ASCII art
    const agentText = figlet.textSync('Agent', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
    });
    const vibesText = figlet.textSync('Vibes', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
    });

    // Add blank line for spacing
    console.log();

    // Combine the two parts with different colors
    const agentLines = agentText.split('\n');
    const vibesLines = vibesText.split('\n');
    const maxLength = Math.max(...agentLines.map(line => line.length));

    for (let i = 0; i < agentLines.length; i++) {
      const agentLine = agentLines[i].padEnd(maxLength);
      const vibesLine = vibesLines[i] || '';
      console.log(chalk.cyan(agentLine) + chalk.magenta(vibesLine));
    }
    console.log();

    // Welcome box
    console.log(
      boxen(
        chalk.white('🎤 Now your AI Agents can finally talk back! TTS Voice for Claude Code\n\n') +
        chalk.gray('Add professional text-to-speech narration to your AI coding sessions\n\n') +
        chalk.cyan('📦 https://github.com/paulpreibisch/AgentVibes'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    console.log(chalk.cyan('📍 Update Details:'));
    console.log(chalk.gray(`   Update location: ${targetDir}/.claude/`));
    console.log(chalk.gray(`   Package version: ${version}`));

    // Show AI summary of latest release
    console.log(
      boxen(
        chalk.white.bold('═══════════════════════════════════════════════════════════════\n') +
        chalk.cyan.bold('  📦 AgentVibes v2.1.5 - Critical macOS Fix\n') +
        chalk.white.bold('═══════════════════════════════════════════════════════════════\n\n') +
        chalk.red.bold('🐛 CRITICAL macOS FIX:\n\n') +
        chalk.cyan('All 23 shell scripts now use #!/usr/bin/env bash instead of\n') +
        chalk.cyan('#!/bin/bash, enabling AgentVibes to work on macOS. The old\n') +
        chalk.cyan('shebang forced bash 3.2 (from 2007) which doesn\'t support\n') +
        chalk.cyan('associative arrays or modern bash syntax, causing complete\n') +
        chalk.cyan('failure on Mac.\n\n') +
        chalk.green('Mac users: brew install bash (one-time setup)\n') +
        chalk.green('Then AgentVibes works perfectly!\n\n') +
        chalk.white.bold('✨ NEW FEATURES:\n\n') +
        chalk.cyan('🤖 FREE GitHub Actions macOS Testing\n') +
        chalk.gray('   • Tests on macOS 13/14/15 (Intel + M1/M2/M3)\n') +
        chalk.gray('   • Node 18, 20, 22 tested automatically\n') +
        chalk.gray('   • 13 parallel test jobs on every push\n') +
        chalk.gray('   • Saves $60-276/year vs Mac VPS!\n\n') +
        chalk.cyan('💡 Provider Switch Hint\n') +
        chalk.gray('   • Helpful hints in voice list output\n') +
        chalk.gray('   • Discover ElevenLabs ↔ Piper switching\n\n') +
        chalk.white('───────────────────────────────────────────────────────────────\n\n') +
        chalk.blue.bold('📊 IMPACT:\n') +
        chalk.gray('   • 30 files changed\n') +
        chalk.gray('   • 877 insertions, 31 deletions\n') +
        chalk.gray('   • AgentVibes now works on macOS!\n') +
        chalk.gray('   • FREE automated testing on all platforms\n\n') +
        chalk.white.bold('═══════════════════════════════════════════════════════════════\n\n') +
        chalk.green.bold('🚀 TRY LANGUAGE LEARNING MODE:\n\n') +
        chalk.cyan('  /agent-vibes:language english\n') +
        chalk.cyan('  /agent-vibes:target spanish\n') +
        chalk.cyan('  /agent-vibes:learn\n\n') +
        chalk.white('  Now while coding, you can also learn a second language\n') +
        chalk.white('  such as Spanish, Italian, French, Mandarin, you name it! 🌍\n\n') +
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

    const spinner = ora('Updating AgentVibes...').start();

    try {
      const claudeDir = path.join(targetDir, '.claude');
      const hooksDir = path.join(claudeDir, 'hooks');
      const outputStylesDir = path.join(claudeDir, 'output-styles');
      const personalitiesDir = path.join(claudeDir, 'personalities');

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
      const srcHooksDir = path.join(__dirname, '..', '.claude', 'hooks');
      const allHookFiles = await fs.readdir(srcHooksDir);

      // Filter to only include files (not directories) and exclude project-specific files
      const hookFiles = [];
      for (const file of allHookFiles) {
        const srcPath = path.join(srcHooksDir, file);
        const stat = await fs.stat(srcPath);

        // Copy shell scripts and hooks.json, skip directories and unwanted files
        if (stat.isFile() &&
            (file.endsWith('.sh') || file === 'hooks.json') &&
            !file.includes('prepare-release') &&
            !file.startsWith('.')) {
          hookFiles.push(file);
        }
      }

      for (const file of hookFiles) {
        const srcPath = path.join(srcHooksDir, file);
        const destPath = path.join(hooksDir, file);
        await fs.copyFile(srcPath, destPath);
        // Make shell scripts executable, but not JSON files
        if (file.endsWith('.sh')) {
          await fs.chmod(destPath, 0o755);
        }
      }
      console.log(chalk.green(`✓ Updated ${hookFiles.length} TTS scripts`));

      // Update personalities (only add new ones, don't overwrite existing)
      spinner.text = 'Updating personality templates...';
      const srcPersonalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
      const allPersonalityFiles = await fs.readdir(srcPersonalitiesDir);
      let newPersonalities = 0;
      let updatedPersonalities = 0;

      // Filter to only .md files, skip directories
      for (const file of allPersonalityFiles) {
        const srcPath = path.join(srcPersonalitiesDir, file);
        const stat = await fs.stat(srcPath);

        // Only copy .md files, skip directories
        if (!stat.isFile() || !file.endsWith('.md')) {
          continue;
        }

        const destPath = path.join(personalitiesDir, file);

        try {
          await fs.access(destPath);
          // File exists - update it
          await fs.copyFile(srcPath, destPath);
          updatedPersonalities++;
        } catch {
          // File doesn't exist - add it
          await fs.copyFile(srcPath, destPath);
          newPersonalities++;
        }
      }
      console.log(chalk.green(`✓ Updated ${updatedPersonalities} personalities, added ${newPersonalities} new`));

      // Update output styles
      spinner.text = 'Updating output styles...';
      const srcOutputStylesDir = path.join(__dirname, '..', '.claude', 'output-styles');
      const outputStyleFiles = await fs.readdir(srcOutputStylesDir);

      for (const file of outputStyleFiles) {
        const srcPath = path.join(srcOutputStylesDir, file);
        const destPath = path.join(outputStylesDir, file);
        await fs.copyFile(srcPath, destPath);
      }
      console.log(chalk.green(`✓ Updated ${outputStyleFiles.length} output styles`));

      // Update plugins folder (BMAD voice mappings)
      spinner.text = 'Updating BMAD plugin files...';
      const srcPluginsDir = path.join(__dirname, '..', '.claude', 'plugins');
      const destPluginsDir = path.join(claudeDir, 'plugins');

      // Create plugins directory if it doesn't exist
      await fs.mkdir(destPluginsDir, { recursive: true });

      // Copy only .md files from plugins directory
      let pluginFiles = [];
      try {
        const allPluginFiles = await fs.readdir(srcPluginsDir);
        for (const file of allPluginFiles) {
          const srcPath = path.join(srcPluginsDir, file);
          const stat = await fs.stat(srcPath);

          // Only copy .md files, skip .flag files (those are runtime generated)
          if (stat.isFile() && file.endsWith('.md')) {
            pluginFiles.push(file);
            const destPath = path.join(destPluginsDir, file);
            await fs.copyFile(srcPath, destPath);
          }
        }
        if (pluginFiles.length > 0) {
          console.log(chalk.green(`✓ Updated ${pluginFiles.length} BMAD plugin files`));
        }
      } catch (error) {
        // Plugins directory might not exist in source - that's okay
      }

      // Update settings.json with SessionStart hook
      spinner.text = 'Updating AgentVibes hook configuration...';
      const settingsPath = path.join(claudeDir, 'settings.json');
      const templateSettingsPath = path.join(__dirname, '..', '.claude', 'settings.json');

      try {
        // Check if settings.json already exists
        let existingSettings = {};
        try {
          const existingContent = await fs.readFile(settingsPath, 'utf8');
          existingSettings = JSON.parse(existingContent);
        } catch {
          // File doesn't exist or is invalid - use template
        }

        // Read template settings
        const templateContent = await fs.readFile(templateSettingsPath, 'utf8');
        const templateSettings = JSON.parse(templateContent);

        // Merge: Add SessionStart hook if not already present
        if (!existingSettings.hooks) {
          existingSettings.hooks = {};
        }

        if (!existingSettings.hooks.SessionStart) {
          existingSettings.hooks.SessionStart = templateSettings.hooks.SessionStart;

          // Add schema if not present
          if (!existingSettings.$schema) {
            existingSettings.$schema = templateSettings.$schema;
          }

          // Write merged settings
          await fs.writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));
          console.log(chalk.green('✓ SessionStart hook configured'));
        } else {
          console.log(chalk.gray('✓ SessionStart hook already configured'));
        }
      } catch (error) {
        console.log(chalk.yellow('⚠ Failed to configure hook: ' + error.message));
      }

      spinner.succeed(chalk.green.bold('\n✨ Update complete!\n'));

      console.log(chalk.cyan('📦 Update Summary:'));
      console.log(chalk.white(`   • ${commandFiles.length} commands updated`));
      console.log(chalk.white(`   • ${hookFiles.length} TTS scripts updated`));
      console.log(chalk.white(`   • ${newPersonalities + updatedPersonalities} personality templates (${newPersonalities} new, ${updatedPersonalities} updated)`));
      console.log(chalk.white(`   • ${outputStyleFiles.length} output styles updated`));
      if (pluginFiles.length > 0) {
        console.log(chalk.white(`   • ${pluginFiles.length} BMAD plugin files updated`));
      }
      console.log('');

      // Show latest release notes from RELEASE_NOTES_V2.md (v2.0+) or RELEASE_NOTES.md (legacy)
      try {
        // Try v2.0 format first
        let releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES_V2.md');
        let releaseNotes;
        let isV2Format = true;

        try {
          releaseNotes = await fs.readFile(releaseNotesPath, 'utf8');
        } catch {
          // Fallback to legacy format
          releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
          releaseNotes = await fs.readFile(releaseNotesPath, 'utf8');
          isV2Format = false;
        }

        const lines = releaseNotes.split('\n');

        if (isV2Format) {
          // v2.0 format - extract summary from top of file
          const packageVersion = packageJson.version;
          console.log(chalk.cyan(`📰 Latest Release (v${packageVersion}):\n`));

          // Find content after "## 🚀 Major Features" line
          let summaryText = '';
          let foundMajorFeatures = false;

          for (const line of lines) {
            if (line.includes('## 🚀 Major Features')) {
              foundMajorFeatures = true;
              continue;
            }
            if (foundMajorFeatures) {
              // Stop at next major heading or after 200 chars
              if (line.startsWith('##') && !line.includes('Major Features')) break;
              if (summaryText.length > 200) break;
              if (line.trim() && !line.startsWith('#') && !line.startsWith('**Release Date')) {
                summaryText += line.trim() + ' ';
              }
            }
          }

          // Wrap text at ~80 chars
          if (summaryText) {
            const words = summaryText.split(' ');
            let currentLine = '';
            const wrappedLines = [];

            words.forEach(word => {
              if ((currentLine + word).length > 80) {
                wrappedLines.push(currentLine.trim());
                currentLine = word + ' ';
              } else {
                currentLine += word + ' ';
              }
            });
            if (currentLine.trim()) wrappedLines.push(currentLine.trim());

            wrappedLines.forEach(line => {
              console.log(chalk.white(`   ${line}`));
            });
            console.log();
          }
        } else {
          // Legacy format (v1.x)
          const versionIndex = lines.findIndex(line => line.match(/^## 📦 v\d+\.\d+\.\d+/));

          if (versionIndex >= 0) {
            const versionMatch = lines[versionIndex].match(/v(\d+\.\d+\.\d+)/);
            const version = versionMatch ? versionMatch[1] : 'unknown';

            const summaryIndex = lines.findIndex((line, idx) =>
              idx > versionIndex && line.includes('### 🤖 AI Summary')
            );

            if (summaryIndex >= 0) {
              console.log(chalk.cyan(`📰 Latest Release (v${version}):\n`));

              let summaryText = '';
              for (let i = summaryIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith('###') || line.startsWith('##')) break;
                if (line.trim()) {
                  summaryText += line.trim() + ' ';
                }
              }

              const words = summaryText.split(' ');
              let currentLine = '';
              const wrappedLines = [];

              words.forEach(word => {
                if ((currentLine + word).length > 80) {
                  wrappedLines.push(currentLine.trim());
                  currentLine = word + ' ';
                } else {
                  currentLine += word + ' ';
                }
              });
              if (currentLine.trim()) wrappedLines.push(currentLine.trim());

              wrappedLines.forEach(line => {
                console.log(chalk.white(`   ${line}`));
              });
              console.log();
            }
          }
        }
      } catch {
        // Release notes not available - no problem
      }

      // Show latest commit messages
      try {
        const { execSync } = await import('node:child_process');
        const gitLog = execSync(
          'git log --oneline --no-decorate -5',
          { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();

        if (gitLog) {
          console.log(chalk.cyan('📝 Latest Commit Messages:\n'));
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
          const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
          const releaseNotes = await fs.readFile(releaseNotesPath, 'utf8');

          // Extract commits from "Recent Commits" section
          const lines = releaseNotes.split('\n');
          const commitsIndex = lines.findIndex(line => line.includes('## 📝 Recent Commits'));

          if (commitsIndex >= 0) {
            console.log(chalk.cyan('📝 Latest Commit Messages:\n'));

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

      console.log(chalk.gray('💡 Changes will take effect immediately!'));
      console.log(chalk.gray('   Try the new personalities with: /agent-vibes:personality list\n'));

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

    } catch (error) {
      spinner.fail('Update failed!');
      console.error(chalk.red('\n❌ Error:'), error.message);
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
      const { execSync } = await import('node:child_process');
      execSync(`bash "${mcpServerScript}"`, {
        stdio: 'inherit',
        env: process.env
      });
    } catch (error) {
      process.exit(error.status || 1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (process.argv.slice(2).length === 0) {
  showWelcome();
  program.outputHelp();
}
