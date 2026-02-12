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
    const version = execFileSync('bash', ['--version'], { encoding: 'utf8' }); // NOSONAR - Safe: checking bash version from system PATH
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
/**
 * Build homebrew package list for macOS
 * @param {Object} missing - Missing dependencies
 * @returns {string[]} Homebrew packages to install
 */
function buildBrewPackages(missing) {
  const packages = [];
  const packageMap = {
    bash: 'bash',
    sox: 'sox',
    ffmpeg: 'ffmpeg',
    pipx: 'pipx',
    flock: 'util-linux',
    curl: 'curl',
    bc: 'bc'
  };

  for (const [key, pkg] of Object.entries(packageMap)) {
    if (missing[key]) {
      packages.push(pkg);
    }
  }

  return packages;
}

/**
 * Build Linux package lists for different package managers
 * @param {Object} missing - Missing dependencies
 * @returns {Object} Package lists for apt, dnf, and pacman
 */
function buildLinuxPackages(missing) {
  const apt = [];
  const dnf = [];
  const pacman = [];

  const packageMap = {
    sox: { apt: 'sox', dnf: 'sox', pacman: 'sox' },
    ffmpeg: { apt: 'ffmpeg', dnf: 'ffmpeg', pacman: 'ffmpeg' },
    python: { apt: 'python3-pip', dnf: 'python3-pip', pacman: 'python-pip' },
    pipx: { apt: 'pipx', dnf: 'pipx', pacman: 'python-pipx' },
    audioPlayer: { apt: 'pulseaudio-utils', dnf: 'pulseaudio-utils', pacman: 'libpulse' },
    flock: { apt: 'util-linux', dnf: 'util-linux', pacman: 'util-linux' },
    curl: { apt: 'curl', dnf: 'curl', pacman: 'curl' },
    bc: { apt: 'bc', dnf: 'bc', pacman: 'bc' }
  };

  for (const [key, packages] of Object.entries(packageMap)) {
    if (missing[key]) {
      apt.push(packages.apt);
      dnf.push(packages.dnf);
      pacman.push(packages.pacman);
    }
  }

  return { apt, dnf, pacman };
}

/**
 * Generate macOS installation commands
 * @param {Object} missing - Missing dependencies
 * @returns {Array} Installation command objects
 */
function getMacOSCommands(missing) {
  const commands = [];
  const brewPackages = buildBrewPackages(missing);

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

  return commands;
}

/**
 * Generate Linux installation commands
 * @param {Object} missing - Missing dependencies
 * @returns {Array} Installation command objects
 */
function getLinuxCommands(missing) {
  const commands = [];
  const packages = buildLinuxPackages(missing);

  if (packages.apt.length > 0) {
    commands.push({
      label: 'Ubuntu/Debian',
      command: `sudo apt-get update && sudo apt-get install -y ${packages.apt.join(' ')}`
    });
  }

  if (packages.dnf.length > 0) {
    commands.push({
      label: 'Fedora/RHEL',
      command: `sudo dnf install -y ${packages.dnf.join(' ')}`
    });
  }

  if (packages.pacman.length > 0) {
    commands.push({
      label: 'Arch Linux',
      command: `sudo pacman -S ${packages.pacman.join(' ')}`
    });
  }

  return commands;
}

export function getInstallCommands(missing, platform) {
  if (platform === 'darwin') {
    return getMacOSCommands(missing);
  } else if (platform === 'linux' || platform === 'wsl') {
    return getLinuxCommands(missing);
  } else if (platform === 'win32') {
    return [{
      label: 'Windows (Native)',
      command: 'npx agentvibes install',
      note: 'Windows Piper and SAPI providers are supported natively'
    }];
  }

  return [];
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

  // Optional tools (Unix-only — Windows uses native providers)
  if (!isWindows) {
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
  }

  return results;
}

/**
 * Build list of missing core dependencies
 * @param {Object} missing - Missing dependencies object
 * @param {Object} results - Full check results
 * @returns {string[]} List of missing core dependencies
 */
function buildCoreMissingList(missing, results) {
  const list = [];
  const coreMap = {
    node: { label: 'Node.js ≥16.0', key: 'node' },
    python: { label: 'Python ≥3.10', key: 'python' },
    bash: { label: 'Bash ≥5.0', key: 'bash' }
  };

  for (const [dep, { label, key }] of Object.entries(coreMap)) {
    if (missing[dep]) {
      const version = results.core[key]?.version;
      list.push(`• ${label} ${version ? `(found: ${version})` : ''}`);
    }
  }

  return list;
}

/**
 * Build list of missing optional dependencies
 * @param {Object} missing - Missing dependencies object
 * @returns {string[]} List of missing optional dependencies
 */
function buildOptionalMissingList(missing) {
  const optionalMap = {
    curl: '• curl (downloading Piper TTS and voices)',
    sox: '• sox (audio effects)',
    ffmpeg: '• ffmpeg (background music, RDP optimization)',
    bc: '• bc (audio processing calculations)',
    pipx: '• pipx (Piper TTS installation)',
    flock: '• flock (TTS queue file locking)',
    audioPlayer: '• paplay/aplay (audio playback)'
  };

  const list = [];
  for (const [dep, description] of Object.entries(optionalMap)) {
    if (missing[dep]) {
      list.push(description);
    }
  }

  return list;
}

/**
 * Format install commands section
 * @param {Array} commands - Install commands
 * @returns {string} Formatted commands section
 */
function formatInstallCommands(commands) {
  if (commands.length === 0) {
    return '';
  }

  let section = chalk.cyan.bold('Installation Commands:\n\n');
  commands.forEach(({ label, command, note }) => {
    section += chalk.cyan(`${label}:\n`);
    section += chalk.white(`  ${command}\n`);
    if (note) {
      section += chalk.gray(`  ${note}\n`);
    }
    section += '\n';
  });

  return section;
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
  const coreMissing = buildCoreMissingList(missing, results);
  if (coreMissing.length > 0) {
    content += chalk.red('Required:\n');
    content += coreMissing.map(item => chalk.red(item)).join('\n') + '\n\n';
  }

  // Optional tools
  const optionalMissing = buildOptionalMissingList(missing);
  if (optionalMissing.length > 0) {
    content += chalk.yellow('Optional (recommended):\n');
    content += optionalMissing.map(item => chalk.yellow(item)).join('\n') + '\n\n';
  }

  // Install commands
  const commands = getInstallCommands(missing, platform);
  content += formatInstallCommands(commands);

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
