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

  console.log(chalk.cyan('\n📍 Installation Details:'));
  console.log(chalk.gray(`   Target directory: ${targetDir}`));
  console.log(chalk.gray(`   Package version: ${VERSION}`));

  console.log(chalk.cyan('\n📦 What will be installed:'));
  console.log(chalk.gray(`   • 10 slash commands → ${targetDir}/.claude/commands/`));
  console.log(chalk.gray(`   • 2 TTS scripts → ${targetDir}/.claude/hooks/`));
  console.log(chalk.gray(`   • Voice configuration files`));
  console.log(chalk.gray(`   • 15+ character voices ready to use\n`));

  // Confirmation prompt (unless --yes flag is used)
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow('Install AgentVibes in this directory?'),
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

    // Copy command files
    spinner.start('Installing /agent-vibes slash commands...');
    const srcCommandsDir = path.join(__dirname, '..', '.claude', 'commands');
    const srcHooksDir = path.join(__dirname, '..', '.claude', 'hooks');

    // Copy all command files
    const commandFiles = await fs.readdir(srcCommandsDir);
    console.log(chalk.cyan(`\n📋 Installing ${commandFiles.length} command files:`));
    for (const file of commandFiles) {
      const srcPath = path.join(srcCommandsDir, file);
      const destPath = path.join(commandsDir, file);
      await fs.copyFile(srcPath, destPath);
      console.log(chalk.gray(`   ✓ ${file}`));
    }
    spinner.succeed(chalk.green('Installed /agent-vibes commands!\n'));

    // Copy hook scripts
    spinner.start('Installing TTS helper scripts...');
    const hookFiles = await fs.readdir(srcHooksDir);
    console.log(chalk.cyan(`🔧 Installing ${hookFiles.length} TTS scripts:`));
    for (const file of hookFiles) {
      const srcPath = path.join(srcHooksDir, file);
      const destPath = path.join(hooksDir, file);
      await fs.copyFile(srcPath, destPath);
      await fs.chmod(destPath, 0o755); // Make executable
      console.log(chalk.gray(`   ✓ ${file} (executable)`));
    }
    spinner.succeed(chalk.green('Installed TTS scripts!\n'));

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
    console.log(chalk.white(`   • Voice manager ready`));
    console.log(chalk.white(`   • 15+ character voices available\n`));

    // Success message
    console.log(
      boxen(
        chalk.green.bold('✨ Installation Complete! ✨\n\n') +
        chalk.white('🎤 Available Commands:\n\n') +
        chalk.cyan('  /agent-vibes') + chalk.gray(' ................. Show all commands\n') +
        chalk.cyan('  /agent-vibes:list') + chalk.gray(' ............ List available voices\n') +
        chalk.cyan('  /agent-vibes:preview') + chalk.gray(' ......... Preview voice samples\n') +
        chalk.cyan('  /agent-vibes:switch <name>') + chalk.gray(' ... Change active voice\n') +
        chalk.cyan('  /agent-vibes:replay') + chalk.gray(' ......... Replay last audio\n') +
        chalk.cyan('  /agent-vibes:add <name> <id>') + chalk.gray(' . Add custom voice\n\n') +
        chalk.yellow('🎵 Try: ') + chalk.cyan('/agent-vibes:preview') + chalk.yellow(' to hear the voices!'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'green',
        }
      )
    );

    console.log(chalk.gray('\n💡 Next steps:'));
    console.log(chalk.gray('   1. Try /agent-vibes:list to see all voices'));
    console.log(chalk.gray('   2. Use /agent-vibes:switch to change your voice'));
    console.log(chalk.gray('   3. Configure your output style to use TTS\n'));

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
