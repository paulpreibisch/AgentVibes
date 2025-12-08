#!/usr/bin/env node
/**
 * AgentVibes Dependency Checker
 *
 * Checks for required and optional system dependencies
 * Displays missing dependencies with platform-specific install commands
 */

import { execFileSync } from 'child_process';
import os from 'os';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Check if a command exists in the system
 */
function commandExists(command) {
  try {
    // Try --version first (most common)
    execFileSync(command, ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    // Some commands like ffmpeg use -version (single dash)
    try {
      execFileSync(command, ['-version'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check bash version (macOS specific requirement)
 */
function checkBashVersion() {
  try {
    const version = execFileSync('bash', ['--version'], { encoding: 'utf8' });
    const match = version.match(/version (\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      return { installed: true, version: `${major}.${match[2]}`, isModern: major >= 5 };
    }
    return { installed: true, version: 'unknown', isModern: false };
  } catch {
    return { installed: false, version: null, isModern: false };
  }
}

/**
 * Check Python version
 */
function checkPythonVersion() {
  const commands = ['python3', 'python', 'py'];

  for (const cmd of commands) {
    try {
      const version = execFileSync(cmd, ['--version'], { encoding: 'utf8', stdio: 'pipe' });
      const match = version.match(/Python (\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        const versionStr = `${major}.${minor}`;
        const isCompatible = major === 3 && minor >= 10;
        return { installed: true, command: cmd, version: versionStr, isCompatible };
      }
    } catch {
      continue;
    }
  }

  return { installed: false, command: null, version: null, isCompatible: false };
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  try {
    const version = process.version;
    const match = version.match(/v(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const versionStr = `${major}.${match[2]}`;
      const isCompatible = major >= 16;
      return { installed: true, version: versionStr, isCompatible };
    }
    return { installed: true, version: 'unknown', isCompatible: false };
  } catch {
    return { installed: false, version: null, isCompatible: false };
  }
}

/**
 * Check for audio players (Linux/WSL)
 */
function checkAudioPlayers() {
  const players = ['paplay', 'aplay', 'mpg123', 'mpv'];
  const found = [];

  for (const player of players) {
    if (commandExists(player)) {
      found.push(player);
    }
  }

  return { hasAny: found.length > 0, players: found };
}

/**
 * Get platform-specific install commands for missing dependencies
 */
export function getInstallCommands(missing, platform) {
  const commands = [];

  if (platform === 'darwin') {
    // macOS
    const brewPackages = [];

    if (missing.bash) {
      brewPackages.push('bash');
    }
    if (missing.sox) {
      brewPackages.push('sox');
    }
    if (missing.ffmpeg) {
      brewPackages.push('ffmpeg');
    }
    if (missing.pipx) {
      brewPackages.push('pipx');
    }
    if (missing.flock) {
      // flock is usually part of util-linux, but might need separate install on macOS
      brewPackages.push('util-linux');
    }
    if (missing.curl) {
      brewPackages.push('curl');
    }
    if (missing.bc) {
      brewPackages.push('bc');
    }

    if (brewPackages.length > 0) {
      commands.push({
        label: 'macOS (Homebrew)',
        command: `brew install ${brewPackages.join(' ')}`
      });
    }

    if (missing.python) {
      commands.push({
        label: 'Python 3.10+',
        command: 'brew install python@3.11'
      });
    }
  } else if (platform === 'linux' || platform === 'wsl') {
    // Linux/WSL
    const aptPackages = [];
    const dnfPackages = [];
    const pacmanPackages = [];

    if (missing.sox) {
      aptPackages.push('sox');
      dnfPackages.push('sox');
      pacmanPackages.push('sox');
    }
    if (missing.ffmpeg) {
      aptPackages.push('ffmpeg');
      dnfPackages.push('ffmpeg');
      pacmanPackages.push('ffmpeg');
    }
    if (missing.python) {
      aptPackages.push('python3-pip');
      dnfPackages.push('python3-pip');
      pacmanPackages.push('python-pip');
    }
    if (missing.pipx) {
      aptPackages.push('pipx');
      dnfPackages.push('pipx');
      pacmanPackages.push('python-pipx');
    }
    if (missing.audioPlayer) {
      aptPackages.push('pulseaudio-utils'); // provides paplay
      dnfPackages.push('pulseaudio-utils');
      pacmanPackages.push('libpulse'); // provides paplay
    }
    if (missing.flock) {
      // flock is part of util-linux package on most Linux distros
      aptPackages.push('util-linux');
      dnfPackages.push('util-linux');
      pacmanPackages.push('util-linux');
    }
    if (missing.curl) {
      aptPackages.push('curl');
      dnfPackages.push('curl');
      pacmanPackages.push('curl');
    }
    if (missing.bc) {
      aptPackages.push('bc');
      dnfPackages.push('bc');
      pacmanPackages.push('bc');
    }

    if (aptPackages.length > 0) {
      commands.push({
        label: 'Ubuntu/Debian',
        command: `sudo apt-get update && sudo apt-get install -y ${aptPackages.join(' ')}`
      });
    }

    if (dnfPackages.length > 0) {
      commands.push({
        label: 'Fedora/RHEL',
        command: `sudo dnf install -y ${dnfPackages.join(' ')}`
      });
    }

    if (pacmanPackages.length > 0) {
      commands.push({
        label: 'Arch Linux',
        command: `sudo pacman -S ${pacmanPackages.join(' ')}`
      });
    }
  } else if (platform === 'win32') {
    // Windows
    commands.push({
      label: 'Windows (WSL Required)',
      command: 'wsl --install -d Ubuntu',
      note: 'Then install dependencies inside WSL using Ubuntu commands above'
    });
  }

  return commands;
}

/**
 * Main dependency check function
 */
export function checkDependencies(options = {}) {
  const platform = os.platform();
  const isMac = platform === 'darwin';
  const isWindows = platform === 'win32';
  const isLinux = !isMac && !isWindows;

  const results = {
    core: {},
    optional: {},
    missing: {},
    warnings: []
  };

  // Core requirements
  const nodeCheck = checkNodeVersion();
  results.core.node = nodeCheck;
  if (!nodeCheck.isCompatible) {
    results.missing.node = true;
    results.warnings.push(`Node.js ${nodeCheck.version || 'not found'} - requires ≥16.0`);
  }

  const pythonCheck = checkPythonVersion();
  results.core.python = pythonCheck;
  if (!pythonCheck.isCompatible) {
    results.missing.python = true;
    results.warnings.push(`Python ${pythonCheck.version || 'not found'} - requires ≥3.10`);
  }

  // macOS-specific: bash 5.x requirement
  if (isMac) {
    const bashCheck = checkBashVersion();
    results.core.bash = bashCheck;
    if (!bashCheck.isModern) {
      results.missing.bash = true;
      results.warnings.push(`Bash ${bashCheck.version || 'not found'} - macOS requires ≥5.0`);
    }
  }

  // Optional tools
  results.optional.sox = commandExists('sox');
  if (!results.optional.sox) {
    results.missing.sox = true;
  }

  results.optional.ffmpeg = commandExists('ffmpeg');
  if (!results.optional.ffmpeg) {
    results.missing.ffmpeg = true;
  }

  results.optional.pipx = commandExists('pipx');
  if (!results.optional.pipx) {
    results.missing.pipx = true;
  }

  // Check for flock (used for TTS queue file locking)
  results.optional.flock = commandExists('flock');
  if (!results.optional.flock) {
    results.missing.flock = true;
    results.warnings.push('flock command not found (required for TTS queue file locking)');
  }

  // Check for curl (used for downloading Piper TTS and voices)
  results.optional.curl = commandExists('curl');
  if (!results.optional.curl) {
    results.missing.curl = true;
    results.warnings.push('curl command not found (required for downloading Piper TTS)');
  }

  // Check for bc (used for audio processing calculations)
  results.optional.bc = commandExists('bc');
  if (!results.optional.bc) {
    results.missing.bc = true;
    results.warnings.push('bc command not found (used for audio processing calculations)');
  }

  // Audio player check (Linux/WSL only)
  if (isLinux || process.env.WSL_DISTRO_NAME) {
    const audioCheck = checkAudioPlayers();
    results.optional.audioPlayer = audioCheck.hasAny;
    if (!audioCheck.hasAny) {
      results.missing.audioPlayer = true;
      results.warnings.push('No audio player found (paplay, aplay, mpg123, or mpv)');
    }
  }

  return results;
}

/**
 * Display missing dependencies in a formatted box
 */
export function displayMissingDependencies(results) {
  const platform = os.platform();
  const missing = results.missing;
  const hasMissing = Object.keys(missing).length > 0;

  if (!hasMissing) {
    return false; // No missing dependencies
  }

  let content = chalk.bold.yellow('⚠️  Missing Dependencies Detected\n\n');

  // Core requirements
  const coreMissing = [];
  if (missing.node) coreMissing.push(`• Node.js ≥16.0 ${results.core.node.version ? `(found: ${results.core.node.version})` : ''}`);
  if (missing.python) coreMissing.push(`• Python ≥3.10 ${results.core.python.version ? `(found: ${results.core.python.version})` : ''}`);
  if (missing.bash) coreMissing.push(`• Bash ≥5.0 ${results.core.bash.version ? `(found: ${results.core.bash.version})` : ''}`);

  if (coreMissing.length > 0) {
    content += chalk.red('Required:\n');
    content += coreMissing.map(item => chalk.red(item)).join('\n') + '\n\n';
  }

  // Optional tools
  const optionalMissing = [];
  if (missing.curl) optionalMissing.push('• curl (downloading Piper TTS and voices)');
  if (missing.sox) optionalMissing.push('• sox (audio effects)');
  if (missing.ffmpeg) optionalMissing.push('• ffmpeg (background music, RDP optimization)');
  if (missing.bc) optionalMissing.push('• bc (audio processing calculations)');
  if (missing.pipx) optionalMissing.push('• pipx (Piper TTS installation)');
  if (missing.flock) optionalMissing.push('• flock (TTS queue file locking)');
  if (missing.audioPlayer) optionalMissing.push('• paplay/aplay (audio playback)');

  if (optionalMissing.length > 0) {
    content += chalk.yellow('Optional (recommended):\n');
    content += optionalMissing.map(item => chalk.yellow(item)).join('\n') + '\n\n';
  }

  // Install commands
  const commands = getInstallCommands(missing, platform);
  if (commands.length > 0) {
    content += chalk.cyan.bold('Installation Commands:\n\n');
    commands.forEach(({ label, command, note }) => {
      content += chalk.cyan(`${label}:\n`);
      content += chalk.white(`  ${command}\n`);
      if (note) {
        content += chalk.gray(`  ${note}\n`);
      }
      content += '\n';
    });
  }

  // Impact notice
  if (optionalMissing.length > 0 && coreMissing.length === 0) {
    content += chalk.gray('Note: TTS will still work without optional tools,\n');
    content += chalk.gray('but some features will be disabled.\n');
  }

  console.log(boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: coreMissing.length > 0 ? 'red' : 'yellow'
  }));

  return hasMissing;
}

/**
 * Check and display dependencies (convenience function)
 */
export function checkAndDisplay() {
  const results = checkDependencies();
  return displayMissingDependencies(results);
}
