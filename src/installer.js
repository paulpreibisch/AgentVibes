#!/usr/bin/env node

import { program } from 'commander';
import path from 'node:path';
import fs from 'node:fs/promises';
import chalk from 'chalk';
import inquirer from 'inquirer';
import figlet from 'figlet';
import boxen from 'boxen';
import ora from 'ora';
import { fileURLToPath } from 'node:url';

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
      chalk.white.bold('🎤 Beautiful ElevenLabs TTS Voice Commands for Claude Code\n\n') +
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

// Installation function
async function install(options = {}) {
  showWelcome();

  // When running via npx, process.cwd() returns the npm cache directory
  // Use INIT_CWD (set by npm/npx) to get the actual user's working directory
  const currentDir = process.env.INIT_CWD || process.cwd();
  const targetDir = options.directory || currentDir;

  console.log(chalk.cyan('\n📍 Installation Details:'));
  console.log(chalk.gray(`   Current directory: ${currentDir}`));
  console.log(chalk.gray(`   Install location: ${targetDir}/.claude/ (project-local)`));
  console.log(chalk.gray(`   Package version: ${VERSION}`));

  // Show latest release notes from git log
  try {
    const { execSync } = await import('node:child_process');
    const gitLog = execSync(
      'git log --oneline --no-decorate -5',
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
    ).trim();

    if (gitLog) {
      console.log(chalk.cyan('\n📰 Latest Release Notes:'));
      const commits = gitLog.split('\n');
      commits.forEach(commit => {
        const [hash, ...messageParts] = commit.split(' ');
        const message = messageParts.join(' ');
        console.log(chalk.gray(`   ${hash}`) + ' ' + chalk.white(message));
      });
    }
  } catch (error) {
    // Git not available or not a git repo - skip release notes
  }

  console.log(chalk.cyan('\n📦 What will be installed:'));
  console.log(chalk.gray(`   • 11 slash commands → ${targetDir}/.claude/commands/agent-vibes/`));
  console.log(chalk.gray(`   • 6 TTS scripts → ${targetDir}/.claude/hooks/`));
  console.log(chalk.gray(`   • 10+ personality templates → ${targetDir}/.claude/personalities/`));
  console.log(chalk.gray(`   • Agent Vibes output style → ${targetDir}/.claude/output-styles/`));
  console.log(chalk.gray(`   • Voice configuration files`));
  console.log(chalk.gray(`   • 22 unique ElevenLabs voices\n`));

  // Confirmation prompt (unless --yes flag is used)
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow(`Install AgentVibes in ${targetDir}/.claude/ ?`),
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.red('\n❌ Installation cancelled.\n'));
      process.exit(0);
    }
  } else {
    console.log(chalk.green('✓ Auto-confirmed (--yes flag)\n'));
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
    const allHookFiles = await fs.readdir(srcHooksDir);
    // Only copy AgentVibes-related scripts, exclude project-specific files
    const hookFiles = allHookFiles.filter(file =>
      !file.includes('prepare-release') &&
      !file.startsWith('.')
    );
    console.log(chalk.cyan(`🔧 Installing ${hookFiles.length} TTS scripts:`));
    for (const file of hookFiles) {
      const srcPath = path.join(srcHooksDir, file);
      const destPath = path.join(hooksDir, file);
      await fs.copyFile(srcPath, destPath);
      await fs.chmod(destPath, 0o755); // Make executable
      console.log(chalk.gray(`   ✓ ${file} (executable)`));
    }
    spinner.succeed(chalk.green('Installed TTS scripts!\n'));

    // Copy personalities folder
    spinner.start('Installing personality templates...');
    const srcPersonalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
    const destPersonalitiesDir = path.join(claudeDir, 'personalities');

    // Create personalities directory
    await fs.mkdir(destPersonalitiesDir, { recursive: true });

    // Copy all personality files
    const personalityFiles = await fs.readdir(srcPersonalitiesDir);
    console.log(chalk.cyan(`🎭 Installing ${personalityFiles.length} personality templates:`));
    for (const file of personalityFiles) {
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

    // Check for API key
    spinner.start('Checking ElevenLabs API key...');
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      spinner.warn(chalk.yellow('ElevenLabs API key not found!'));
      console.log(chalk.yellow('\n⚠️  To use AgentVibes, you need an ElevenLabs API key:\n'));
      console.log(chalk.white('   1. Go to https://elevenlabs.io/'));
      console.log(chalk.white('   2. Sign up or log in (free tier available)'));
      console.log(chalk.white('   3. Copy your API key from the profile section'));
      console.log(chalk.white('   4. Set it in your shell profile:\n'));
      console.log(chalk.cyan('      export ELEVENLABS_API_KEY="your-key-here"'));
      console.log(chalk.gray('\n   Add this to ~/.bashrc or ~/.zshrc to make it permanent\n'));
    } else {
      spinner.succeed(chalk.green('ElevenLabs API key found!'));
      console.log(chalk.gray(`   Key: ${apiKey.substring(0, 10)}...\n`));
    }

    // List what was installed
    console.log(chalk.cyan('📦 Installation Summary:'));
    console.log(chalk.white(`   • ${commandFiles.length} slash commands installed`));
    console.log(chalk.white(`   • ${hookFiles.length} TTS scripts installed`));
    console.log(chalk.white(`   • ${personalityFiles.length} personality templates installed`));
    console.log(chalk.white(`   • ${outputStyleFiles.length} output styles installed`));
    console.log(chalk.white(`   • Voice manager ready`));
    console.log(chalk.white(`   • 22 unique ElevenLabs voices available\n`));

    // Show recent changes from git log or RELEASE_NOTES.md
    try {
      const { execSync } = await import('node:child_process');
      const gitLog = execSync(
        'git log --oneline --no-decorate -5',
        { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
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
        chalk.yellow.bold('⚠️  IMPORTANT SETUP STEP:\n') +
        chalk.white('In Claude Code, run this command:\n') +
        chalk.cyan.bold('/output-style agent-vibes') + '\n\n' +
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

    console.log(chalk.yellow.bold('\n⚠️  REQUIRED SETUP:'));
    console.log(chalk.white('   1. In Claude Code, run: ') + chalk.cyan.bold('/output-style agent-vibes'));
    console.log(chalk.gray('      This enables TTS narration for your sessions\n'));
    console.log(chalk.gray('💡 Then try these commands:'));
    console.log(chalk.gray('   • /agent-vibes:list - See all available voices'));
    console.log(chalk.gray('   • /agent-vibes:switch <name> - Change your voice'));
    console.log(chalk.gray('   • /agent-vibes:personality <style> - Set personality\n'));

    // Check for BMAD installation
    const bmadManifestPath = path.join(targetDir, '.bmad-core', 'install-manifest.yaml');
    let bmadDetected = false;
    try {
      await fs.access(bmadManifestPath);
      bmadDetected = true;
    } catch {}

    if (bmadDetected) {
      console.log(
        boxen(
          chalk.green.bold('🎉 BMAD Detected!\n\n') +
          chalk.white('AgentVibes BMAD Plugin is automatically enabled!\n') +
          chalk.gray('Each BMAD agent will now use its assigned voice.\n\n') +
          chalk.cyan('Commands:\n') +
          chalk.gray('  • /agent-vibes-bmad status - View agent voices\n') +
          chalk.gray('  • /agent-vibes-bmad set <agent> <voice> - Customize\n') +
          chalk.gray('  • /agent-vibes-bmad disable - Turn off plugin'),
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
  .description('AgentVibes - Beautiful ElevenLabs TTS Voice Commands for Claude Code');

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
        chalk.white('🎤 Beautiful ElevenLabs TTS Voice Commands for Claude Code\n\n') +
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
    console.log(chalk.white(`   Current directory: ${currentDir}`));
    console.log(chalk.white(`   Update location: ${targetDir}/.claude/ (project-local)`));
    console.log(chalk.white(`   Package version: ${version}\n`));

    // Check if already installed
    const commandsDir = path.join(targetDir, '.claude', 'commands', 'agent-vibes');
    let isInstalled = false;
    try {
      await fs.access(commandsDir);
      isInstalled = true;
    } catch {}

    if (!isInstalled) {
      console.log(chalk.red('❌ AgentVibes is not installed in this directory.'));
      console.log(chalk.gray('   Run: node src/installer.js install\n'));
      process.exit(1);
    }

    // Show latest release notes from RELEASE_NOTES.md
    try {
      const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
      const releaseNotes = await fs.readFile(releaseNotesPath, 'utf8');

      // Extract latest release summary
      const lines = releaseNotes.split('\n');

      // Find the first release version header
      const versionIndex = lines.findIndex(line => line.match(/^## 📦 v\d+\.\d+\.\d+/));

      if (versionIndex >= 0) {
        // Extract version
        const versionMatch = lines[versionIndex].match(/v(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';

        // Find the AI Summary section
        const summaryIndex = lines.findIndex((line, idx) =>
          idx > versionIndex && line.includes('### 🤖 AI Summary')
        );

        if (summaryIndex >= 0) {
          console.log(chalk.cyan(`📰 Latest Release (v${version}):\n`));

          // Extract summary text (lines between AI Summary and next ###)
          let summaryText = '';
          for (let i = summaryIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('###') || line.startsWith('##')) break;
            if (line.trim()) {
              summaryText += line.trim() + ' ';
            }
          }

          // Wrap text at ~80 chars for better readability
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
    } catch {
      // Release notes not available - no problem
    }

    // Show latest commit messages
    try {
      const { execSync } = await import('node:child_process');
      const gitLog = execSync(
        'git log --oneline --no-decorate -5',
        { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
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
      // Only copy AgentVibes-related scripts, exclude project-specific files
      const hookFiles = allHookFiles.filter(file =>
        !file.includes('prepare-release') &&
        !file.startsWith('.')
      );

      for (const file of hookFiles) {
        const srcPath = path.join(srcHooksDir, file);
        const destPath = path.join(hooksDir, file);
        await fs.copyFile(srcPath, destPath);
        await fs.chmod(destPath, 0o755);
      }
      console.log(chalk.green(`✓ Updated ${hookFiles.length} TTS scripts`));

      // Update personalities (only add new ones, don't overwrite existing)
      spinner.text = 'Updating personality templates...';
      const srcPersonalitiesDir = path.join(__dirname, '..', '.claude', 'personalities');
      const srcPersonalityFiles = await fs.readdir(srcPersonalitiesDir);
      let newPersonalities = 0;
      let updatedPersonalities = 0;

      for (const file of srcPersonalityFiles) {
        const srcPath = path.join(srcPersonalitiesDir, file);
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

      spinner.succeed(chalk.green.bold('\n✨ Update complete!\n'));

      console.log(chalk.cyan('📦 Update Summary:'));
      console.log(chalk.white(`   • ${commandFiles.length} commands updated`));
      console.log(chalk.white(`   • ${hookFiles.length} TTS scripts updated`));
      console.log(chalk.white(`   • ${srcPersonalityFiles.length} personality templates (${newPersonalities} new, ${updatedPersonalities} updated)`));
      console.log(chalk.white(`   • ${outputStyleFiles.length} output styles updated\n`));

      // Show latest release notes from RELEASE_NOTES.md
      try {
        const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
        const releaseNotes = await fs.readFile(releaseNotesPath, 'utf8');

        // Extract latest release summary
        const lines = releaseNotes.split('\n');

        // Find the first release version header
        const versionIndex = lines.findIndex(line => line.match(/^## 📦 v\d+\.\d+\.\d+/));

        if (versionIndex >= 0) {
          // Extract version
          const versionMatch = lines[versionIndex].match(/v(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : 'unknown';

          // Find the AI Summary section
          const summaryIndex = lines.findIndex((line, idx) =>
            idx > versionIndex && line.includes('### 🤖 AI Summary')
          );

          if (summaryIndex >= 0) {
            console.log(chalk.cyan(`📰 Latest Release (v${version}):\n`));

            // Extract summary text (lines between AI Summary and next ###)
            let summaryText = '';
            for (let i = summaryIndex + 1; i < lines.length; i++) {
              const line = lines[i];
              if (line.startsWith('###') || line.startsWith('##')) break;
              if (line.trim()) {
                summaryText += line.trim() + ' ';
              }
            }

            // Wrap text at ~80 chars for better readability
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
      } catch {
        // Release notes not available - no problem
      }

      // Show latest commit messages
      try {
        const { execSync } = await import('node:child_process');
        const gitLog = execSync(
          'git log --oneline --no-decorate -5',
          { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
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

program.parse(process.argv);

// Show help if no command provided
if (process.argv.slice(2).length === 0) {
  showWelcome();
  program.outputHelp();
}
