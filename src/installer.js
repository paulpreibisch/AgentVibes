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

const VERSION = '2.0.0';

// Beautiful ASCII art
function showWelcome() {
  console.log(
    chalk.cyan(
      figlet.textSync('AgentVibes', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
      })
    )
  );

  console.log(
    boxen(
      chalk.white.bold('🎤 Beautiful ElevenLabs TTS Voice Commands for Claude Code\n\n') +
      chalk.gray('Add professional text-to-speech narration to your AI coding sessions'),
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

  const targetDir = options.directory || process.cwd();
  const spinner = ora('Checking installation directory...').start();

  try {
    // Check if .claude directory exists
    const claudeDir = path.join(targetDir, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');
    const hooksDir = path.join(claudeDir, 'hooks');

    let exists = false;
    try {
      await fs.access(claudeDir);
      exists = true;
    } catch {}

    if (!exists) {
      spinner.info('Creating .claude directory structure...');
      await fs.mkdir(commandsDir, { recursive: true });
      await fs.mkdir(hooksDir, { recursive: true });
    } else {
      spinner.succeed('.claude directory found!');
    }

    // Copy command files
    spinner.start('Installing /agent-vibes commands...');
    const srcCommandsDir = path.join(__dirname, '..', '.claude', 'commands');
    const srcHooksDir = path.join(__dirname, '..', '.claude', 'hooks');

    // Copy all command files
    const commandFiles = await fs.readdir(srcCommandsDir);
    for (const file of commandFiles) {
      const srcPath = path.join(srcCommandsDir, file);
      const destPath = path.join(commandsDir, file);
      await fs.copyFile(srcPath, destPath);
    }
    spinner.succeed('Installed /agent-vibes commands!');

    // Copy hook scripts
    spinner.start('Installing TTS scripts...');
    const hookFiles = await fs.readdir(srcHooksDir);
    for (const file of hookFiles) {
      const srcPath = path.join(srcHooksDir, file);
      const destPath = path.join(hooksDir, file);
      await fs.copyFile(srcPath, destPath);
      await fs.chmod(destPath, 0o755); // Make executable
    }
    spinner.succeed('Installed TTS scripts!');

    // Check for API key
    spinner.start('Checking ElevenLabs API key...');
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      spinner.warn('ElevenLabs API key not found!');
      console.log(chalk.yellow('\n⚠️  To use AgentVibes, you need an ElevenLabs API key:\n'));
      console.log(chalk.white('1. Go to https://elevenlabs.io/'));
      console.log(chalk.white('2. Sign up or log in'));
      console.log(chalk.white('3. Copy your API key'));
      console.log(chalk.white('4. Set it in your environment:'));
      console.log(chalk.cyan('   export ELEVENLABS_API_KEY="your-key-here"\n'));
    } else {
      spinner.succeed('ElevenLabs API key found!');
    }

    // Success message
    console.log(
      boxen(
        chalk.green.bold('✨ Installation Complete! ✨\n\n') +
        chalk.white('Available commands:\n') +
        chalk.cyan('  /agent-vibes') + chalk.gray(' - Show all commands\n') +
        chalk.cyan('  /agent-vibes:list') + chalk.gray(' - List voices\n') +
        chalk.cyan('  /agent-vibes:preview') + chalk.gray(' - Preview voices\n') +
        chalk.cyan('  /agent-vibes:switch <name>') + chalk.gray(' - Change voice\n') +
        chalk.cyan('  /agent-vibes:replay') + chalk.gray(' - Replay last audio\n\n') +
        chalk.yellow('🎵 Enjoy your TTS-enhanced coding sessions!'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'green',
        }
      )
    );

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
  .action(async (options) => {
    await install(options);
  });

program
  .command('status')
  .description('Show installation status')
  .action(async () => {
    console.log(chalk.cyan('Checking AgentVibes installation...\n'));

    const targetDir = process.cwd();
    const commandsDir = path.join(targetDir, '.claude', 'commands');
    const hooksDir = path.join(targetDir, '.claude', 'hooks');

    let installed = false;
    try {
      await fs.access(path.join(commandsDir, 'agent-vibes.md'));
      installed = true;
    } catch {}

    if (installed) {
      console.log(chalk.green('✅ AgentVibes is installed!'));
      console.log(chalk.gray(`   Commands: ${commandsDir}`));
      console.log(chalk.gray(`   Hooks: ${hooksDir}`));
    } else {
      console.log(chalk.yellow('⚠️  AgentVibes is not installed.'));
      console.log(chalk.gray('   Run: npx agentvibes install'));
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
