#!/usr/bin/env node
/**
 * AgentVibes MCP Server Installer
 *
 * Interactive installer for setting up AgentVibes MCP server with Claude Desktop
 * Handles platform-specific installation (Windows/Mac/Linux)
 */

import inquirer from 'inquirer';
import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { checkDependencies, displayMissingDependencies } from '../utils/dependency-checker.js';

/**
 * Check if WSL is installed on Windows
 */
function checkWSL() {
  try {
    // Security: Use execFileSync with array args to prevent command injection
    execFileSync('wsl', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Python is available
 */
function checkPython() {
  const commands = ['python3', 'python', 'py'];

  for (const cmd of commands) {
    try {
      // Security: Use execFileSync with array args to prevent command injection
      const version = execFileSync(cmd, ['--version'], { encoding: 'utf8', stdio: 'pipe' });
      return { available: true, command: cmd, version: version.trim() };
    } catch {
      continue;
    }
  }

  return { available: false };
}

/**
 * Check if Python MCP package is installed
 */
function checkMCPPackage(pythonCmd) {
  try {
    // Security: Use execFileSync with array args to prevent command injection
    execFileSync(pythonCmd, ['-c', 'import mcp'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Claude Desktop config path for current platform
 */
function getClaudeConfigPath() {
  const platform = os.platform();

  switch (platform) {
    case 'darwin': // macOS
      return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32': // Windows
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
    default: // Linux
      return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }
}

/**
 * Get AgentVibes installation directory
 */
function getAgentVibesDir() {
  // Try to find AgentVibes directory
  // 1. Current directory
  if (fs.existsSync('./.claude/hooks/play-tts.sh')) {
    return process.cwd();
  }

  // 2. Parent directory
  const parentDir = path.resolve(process.cwd(), '..');
  if (fs.existsSync(path.join(parentDir, '.claude/hooks/play-tts.sh'))) {
    return parentDir;
  }

  // 3. Ask user
  return null;
}

/**
 * Update Claude Desktop configuration
 */
function updateClaudeConfig(agentVibesPath, provider, apiKey = null) {
  const configPath = getClaudeConfigPath();
  const platform = os.platform();

  // Create config directory if it doesn't exist
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Read existing config or create new one
  let config = { mcpServers: {} };
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
  }

  // Prepare MCP server config
  let serverPath = path.join(agentVibesPath, 'mcp-server', 'server.py');

  if (platform === 'win32') {
    // Windows: Use WSL
    serverPath = serverPath.replace(/\\/g, '/').replace(/^([A-Z]):/, (match, drive) => {
      return `/mnt/${drive.toLowerCase()}`;
    });

    config.mcpServers.agentvibes = {
      command: 'wsl',
      args: ['python3', serverPath],
      env: {}
    };
  } else {
    // macOS/Linux: Use native Python
    config.mcpServers.agentvibes = {
      command: 'python3',
      args: [serverPath],
      env: {}
    };
  }


  // Write config atomically to prevent race conditions (TOCTOU)
  // Write to temp file first, then rename atomically
  const tempPath = `${configPath}.tmp.${process.pid}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    fs.renameSync(tempPath, configPath);
  } catch (error) {
    // Clean up temp file if rename fails
    try { fs.unlinkSync(tempPath); } catch { /* ignore cleanup errors */ }
    throw error;
  }

  return configPath;
}

/**
 * Install Piper TTS
 */
async function installPiper(useWSL = false) {
  const spinner = ora('Installing Piper TTS...').start();

  try {
    // Security: Use execFileSync with array args to prevent command injection
    if (useWSL) {
      execFileSync('wsl', ['pipx', 'install', 'piper-tts'], { stdio: 'inherit' });
    } else {
      execFileSync('pipx', ['install', 'piper-tts'], { stdio: 'inherit' });
    }
    spinner.succeed('Piper TTS installed successfully!');
    return true;
  } catch (error) {
    spinner.fail('Failed to install Piper TTS');
    console.error(chalk.yellow('\n⚠️  You may need to install pipx first:'));
    if (useWSL) {
      console.log(chalk.cyan('   wsl sudo apt install pipx'));
    } else {
      console.log(chalk.cyan('   brew install pipx  (macOS)'));
      console.log(chalk.cyan('   sudo apt install pipx  (Linux)'));
    }
    return false;
  }
}

/**
 * Install Python MCP package
 */
async function installMCPPackage(pythonCmd, useWSL = false) {
  const spinner = ora('Installing Python MCP package...').start();

  try {
    // Security: Use execFileSync with array args to prevent command injection
    if (useWSL) {
      execFileSync('wsl', [pythonCmd, '-m', 'pip', 'install', '--break-system-packages', 'mcp'], { stdio: 'pipe' });
    } else {
      execFileSync(pythonCmd, ['-m', 'pip', 'install', '--user', 'mcp'], { stdio: 'pipe' });
    }
    spinner.succeed('Python MCP package installed successfully!');
    return true;
  } catch (error) {
    spinner.fail('Failed to install Python MCP package');
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    return false;
  }
}

/**
 * Main installer
 */
/**
 * Check system dependencies and handle missing ones
 * @returns {Promise<void>}
 */
async function checkSystemDependencies() {
  console.log(chalk.bold('🔍 Step 1: Checking system dependencies...\n'));

  const depResults = checkDependencies();
  const hasMissingDeps = displayMissingDependencies(depResults);

  if (!hasMissingDeps) {
    console.log(chalk.green('✓ All dependencies installed!\n'));
    return;
  }

  const hasCoreMissing = depResults.missing.node || depResults.missing.python || depResults.missing.bash;

  if (hasCoreMissing) {
    console.log(chalk.red('\n❌ Critical dependencies are missing. Please install them before continuing.\n'));
    process.exit(1);
  }

  // Only optional dependencies missing
  const { continueAnyway } = await inquirer.prompt([{
    type: 'confirm',
    name: 'continueAnyway',
    message: 'Some optional dependencies are missing. Continue anyway?',
    default: true
  }]);

  if (!continueAnyway) {
    console.log(chalk.yellow('\nInstallation cancelled. Please install the dependencies and try again.\n'));
    process.exit(0);
  }
}

/**
 * Locate AgentVibes installation directory
 * @param {boolean} isWindows - Whether running on Windows
 * @returns {Promise<string>} AgentVibes directory path
 */
async function locateAgentVibesDir(isWindows) {
  console.log(chalk.bold('📁 Step 2: Locating AgentVibes installation...\n'));

  let agentVibesDir = getAgentVibesDir();

  if (!agentVibesDir) {
    const { customPath } = await inquirer.prompt([{
      type: 'input',
      name: 'customPath',
      message: 'Enter the path to your AgentVibes installation:',
      default: isWindows ? 'C:\\Users\\USERNAME\\AgentVibes' : '~/AgentVibes',
      validate: (input) => {
        const expanded = input.replace(/^~/, os.homedir());
        if (fs.existsSync(path.join(expanded, '.claude/hooks/play-tts.sh'))) {
          return true;
        }
        return 'AgentVibes not found at this path. Please check and try again.';
      }
    }]);

    agentVibesDir = customPath.replace(/^~/, os.homedir());
  }

  console.log(chalk.green(`✓ Found AgentVibes at: ${agentVibesDir}\n`));
  return agentVibesDir;
}

/**
 * Check and setup WSL on Windows
 * @returns {Promise<void>}
 */
async function setupWindowsWSL() {
  console.log(chalk.bold('🪟 Step 3: Windows environment setup...\n'));

  const hasWSL = checkWSL();

  if (hasWSL) {
    console.log(chalk.green('✓ WSL is installed\n'));
    return;
  }

  console.log(chalk.yellow('⚠️  WSL (Windows Subsystem for Linux) is required but not installed.'));
  const { installWSL } = await inquirer.prompt([{
    type: 'confirm',
    name: 'installWSL',
    message: 'Install WSL now? (Requires restart)',
    default: true
  }]);

  if (!installWSL) {
    console.log(chalk.red('\n❌ WSL is required for AgentVibes MCP server on Windows'));
    process.exit(1);
  }

  console.log(chalk.cyan('\n📦 Installing WSL...'));
  try {
    // Security: Use execFileSync with array args to prevent command injection
    execFileSync('wsl', ['--install'], { stdio: 'inherit' });
    console.log(chalk.green('\n✅ WSL installed successfully!'));
    console.log(chalk.yellow('⚠️  Please restart your computer and run this installer again.'));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to install WSL'));
    console.error(chalk.yellow('Please install WSL manually: https://aka.ms/wsl'));
    process.exit(1);
  }
}

/**
 * Select and install TTS provider
 * @param {boolean} isWindows - Whether running on Windows
 * @returns {Promise<string>} Selected provider name
 */
async function setupTTSProvider(isWindows) {
  console.log(chalk.bold('🎤 Step 4: Choose TTS provider...\n'));

  const { provider } = await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: 'Select your preferred TTS provider:',
    choices: [
      {
        name: 'Piper TTS (Free, Offline, Open Source) - Recommended',
        value: 'piper',
        short: 'Piper'
      },
      {
        name: 'macOS TTS (Native macOS text-to-speech)',
        value: 'macos',
        short: 'macOS'
      }
    ]
  }]);

  if (provider === 'piper') {
    console.log(chalk.cyan('\n📦 Installing Piper TTS...'));
    await installPiper(isWindows);
  } else if (provider === 'macos') {
    console.log(chalk.cyan('\n✅ macOS TTS uses native system voices - no installation needed'));
  }

  return provider;
}

/**
 * Setup Python dependencies
 * @param {boolean} isWindows - Whether running on Windows
 * @returns {Promise<void>}
 */
async function setupPythonDependencies(isWindows) {
  console.log(chalk.bold('\n🐍 Step 5: Installing Python dependencies...\n'));

  const pythonCheck = isWindows
    ? { available: true, command: 'python3' } // WSL Python
    : checkPython();

  if (!pythonCheck.available) {
    console.error(chalk.red('❌ Python not found!'));
    console.log(chalk.yellow('Please install Python 3.10+ from https://python.org'));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Python found: ${pythonCheck.version || 'python3'}\n`));

  // Check and install MCP package
  const hasMCP = isWindows
    ? false // Always install in WSL
    : checkMCPPackage(pythonCheck.command);

  if (!hasMCP) {
    await installMCPPackage(pythonCheck.command, isWindows);
  } else {
    console.log(chalk.green('✓ Python MCP package already installed\n'));
  }
}

/**
 * Display welcome banner
 * @param {string} platform - Platform name
 */
function showWelcomeBanner(platform) {
  console.log(boxen(
    chalk.bold.cyan('AgentVibes MCP Server Installer') + '\n\n' +
    'Give Claude Desktop a voice! 🎤',
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }
  ));

  const platformLabel = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux';
  console.log(chalk.gray(`Platform: ${platformLabel}\n`));
}

/**
 * Display success message
 * @param {string} configPath - Config file path
 * @param {string} provider - Provider name
 */
function showSuccessMessage(configPath, provider) {
  console.log(boxen(
    chalk.bold.green('✅ Installation Complete!') + '\n\n' +
    chalk.white('Next steps:\n') +
    chalk.cyan('1. Restart Claude Desktop\n') +
    chalk.cyan('2. Try: "Say hello using text to speech"\n') +
    chalk.cyan('3. Enjoy your talking Claude! 🎤'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green'
    }
  ));

  console.log(chalk.gray('\nConfiguration saved to:'));
  console.log(chalk.gray(`  ${configPath}\n`));

  if (provider === 'piper') {
    console.log(chalk.gray('Voice models will download automatically on first use.\n'));
  }
}

export async function installMCP() {
  const platform = os.platform();
  const isWindows = platform === 'win32';

  showWelcomeBanner(platform);

  // Step 1: Check system dependencies
  await checkSystemDependencies();

  // Step 2: Find AgentVibes directory
  const agentVibesDir = await locateAgentVibesDir(isWindows);

  // Step 3: Windows-specific checks
  if (isWindows) {
    await setupWindowsWSL();
  }

  // Step 4: Choose TTS provider
  const provider = await setupTTSProvider(isWindows);

  // Step 5: Install Python dependencies
  await setupPythonDependencies(isWindows);

  // Step 6: Configure provider in AgentVibes
  console.log(chalk.bold('⚙️  Step 6: Configuring AgentVibes...\n'));
  const providerFile = path.join(agentVibesDir, '.claude', 'tts-provider.txt');
  fs.writeFileSync(providerFile, provider);
  console.log(chalk.green(`✓ Set provider to: ${provider}\n`));

  // Step 7: Update Claude Desktop config
  console.log(chalk.bold('📝 Step 7: Updating Claude Desktop configuration...\n'));
  const configPath = updateClaudeConfig(agentVibesDir, provider, apiKey);
  console.log(chalk.green(`✓ Updated: ${configPath}\n`));

  // Success!
  showSuccessMessage(configPath, provider);
}
