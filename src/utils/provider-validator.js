/**
 * @fileoverview Provider validation utility for AgentVibes
 * Validates TTS provider availability at installation, switch, and runtime
 */

import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import path from 'node:path'; // For safe path operations and traversal prevention
import fs from 'node:fs'; // For checking file/directory existence
import os from 'node:os'; // For os.homedir() to prevent HOME injection attacks

/**
 * Helper: Check if command exists in PATH
 * @param {string} command - Command name to check
 * @returns {boolean} True if command exists in PATH
 */
function commandExistsInPath(command) {
  try {
    execSync(`which "${command}" 2>/dev/null`, {
      encoding: 'utf8',
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Check if file/directory exists and is within home directory
 * @param {string} targetPath - Full path to check
 * @returns {boolean} True if path exists and is safe
 */
function isSafePathExists(targetPath) {
  try {
    const homeDir = os.homedir();
    const resolvedPath = path.resolve(targetPath);
    const resolvedHome = path.resolve(homeDir);

    // Validate path is within home directory (prevent path traversal)
    if (!resolvedPath.startsWith(resolvedHome)) {
      return false;
    }

    return fs.existsSync(targetPath);
  } catch (error) {
    return false;
  }
}

/**
 * Validate a TTS provider's installation status
 * @param {string} providerName - Provider name (soprano, piper, macos, windows-sapi, etc.)
 * @returns {Promise<{installed: boolean, message: string, checkedLocations?: string[], error?: string}>}
 */
export async function validateProvider(providerName) {
  switch (providerName) {
    case 'soprano':
      return await validateSopranoInstallation();
    case 'piper':
      return await validatePiperInstallation();
    case 'macos':
      return await validateMacOSProvider();
    case 'windows-sapi':
      return await validateWindowsSAPI();
    case 'windows-piper':
      return await validatePiperInstallation();
    case 'termux-ssh':
    case 'ssh-remote':
    case 'ssh-pulseaudio':
    case 'piper-receiver':
    case 'silent':
      // These don't require local provider installation
      return { installed: true, message: 'Remote/Special provider - no local installation needed' };
    default:
      return { installed: false, message: `Unknown provider: ${providerName}`, error: 'UNKNOWN_PROVIDER' };
  }
}

/**
 * Helper: Check if pipx provider is installed (Soprano, Piper)
 * @param {string} providerName - Provider name (soprano or piper)
 * @param {string} packageName - Package name (soprano-tts or piper-tts)
 * @returns {Promise<{installed: boolean, message: string, checkedLocations: string[]}>}
 */
async function validatePipxProvider(providerName, packageName) {
  const checkedLocations = [];
  const binName = providerName === 'soprano' ? 'soprano' : 'piper';
  const venvName = providerName === 'soprano' ? 'soprano-tts' : 'piper-tts';

  // Check for binary in PATH first (most reliable for pipx installations)
  if (commandExistsInPath(binName)) {
    return { installed: true, message: `${providerName} TTS detected (binary in PATH)`, checkedLocations: ['PATH'] };
  }
  checkedLocations.push('PATH');

  // Check for pipx bin directory directly
  const homeDir = os.homedir();
  const binPath = path.join(homeDir, '.local', 'bin', binName);
  if (isSafePathExists(binPath)) {
    return { installed: true, message: `${providerName} TTS detected (via pipx bin)`, checkedLocations: ['~/.local/bin'] };
  }
  checkedLocations.push('~/.local/bin');

  // Check for pipx venv installation directory
  const venvPath = path.join(homeDir, '.local', 'share', 'pipx', 'venvs', venvName);
  if (isSafePathExists(venvPath)) {
    return { installed: true, message: `${providerName} TTS detected (via pipx venv)`, checkedLocations: ['pipx venv'] };
  }
  checkedLocations.push('pipx venv');

  // Check Python package installations (comprehensive version detection)
  const pythonCommands = ['python3', 'python', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8'];

  for (const pythonCmd of pythonCommands) {
    try {
      // Use spawnSync with array args (security: correct API usage per CLAUDE.md)
      const result = spawnSync(pythonCmd, ['-m', 'pip', 'show', packageName], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000
      });

      if (result.status === 0 && result.stdout && result.stdout.trim()) {
        return {
          installed: true,
          message: `${providerName} TTS detected (Python package via ${pythonCmd})`,
          checkedLocations: [...checkedLocations, pythonCmd]
        };
      }
    } catch (error) {
      // Continue to next Python version - errors expected when Python not in PATH or package missing
    }
  }

  checkedLocations.push(...pythonCommands);

  return {
    installed: false,
    message: `${providerName} TTS is not installed on your system (checked: ${checkedLocations.join(', ')})`,
    error: `${providerName.toUpperCase()}_NOT_FOUND`,
    checkedLocations
  };
}

/**
 * Validate Soprano TTS installation
 * Checks multiple locations: PATH, pipx bin, pipx venv, Python packages
 * @returns {Promise<{installed: boolean, message: string, checkedLocations?: string[], error?: string}>}
 */
export async function validateSopranoInstallation() {
  return await validatePipxProvider('soprano', 'soprano-tts');
}

/**
 * Validate Piper TTS installation
 * Checks multiple locations: PATH, pipx bin, pipx venv, Python packages
 * @returns {Promise<{installed: boolean, message: string, checkedLocations?: string[], error?: string}>}
 */
export async function validatePiperInstallation() {
  return await validatePipxProvider('piper', 'piper-tts');
}

/**
 * Validate macOS Say (built-in)
 * @returns {Promise<{installed: boolean, message: string}>}
 */
export async function validateMacOSProvider() {
  if (process.platform !== 'darwin') {
    return {
      installed: false,
      message: 'macOS Say is only available on macOS (this is not a Mac)',
      error: 'NOT_MACOS'
    };
  }

  try {
    execSync('which say 2>/dev/null', {
      encoding: 'utf8',
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { installed: true, message: 'macOS Say detected' };
  } catch (error) {
    // say command not found
  }

  return {
    installed: false,
    message: 'macOS Say is not installed on your system (checked: /usr/bin/say)',
    error: 'MACOS_SAY_NOT_FOUND'
  };
}

/**
 * Validate Windows SAPI (built-in)
 * @returns {Promise<{installed: boolean, message: string}>}
 */
export async function validateWindowsSAPI() {
  if (process.platform !== 'win32') {
    return {
      installed: false,
      message: 'Windows SAPI only available on Windows',
      error: 'NOT_WINDOWS'
    };
  }

  // Windows SAPI is built-in, always available
  return { installed: true, message: 'Windows SAPI available' };
}

/**
 * Test if a provider works at runtime (more thorough check)
 * Attempts to actually use the provider for a brief moment
 * @param {string} providerName
 * @returns {Promise<{working: boolean, error?: string}>}
 */
export async function testProviderRuntime(providerName) {
  switch (providerName) {
    case 'soprano':
      return await testSopranoRuntime();
    case 'piper':
      return await testPiperRuntime();
    case 'macos':
      return await testMacOSRuntime();
    default:
      return { working: true }; // Assume other providers work if installed
  }
}

/**
 * Test Soprano runtime (webui connectivity)
 */
async function testSopranoRuntime() {
  try {
    // Try a quick soprano import check
    const result = spawnSync('python3', ['-c', 'import soprano; print("OK")'], {
      timeout: 5000,
      encoding: 'utf8'
    });

    if (result.error || result.status !== 0) {
      return {
        working: false,
        error: 'Soprano Python module import failed'
      };
    }

    return { working: true };
  } catch (e) {
    return {
      working: false,
      error: e.message
    };
  }
}

/**
 * Test Piper runtime
 */
async function testPiperRuntime() {
  try {
    const result = spawnSync('piper', ['--help'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    if (result.error || result.status !== 0) {
      return {
        working: false,
        error: 'Piper command execution failed'
      };
    }
    return { working: true };
  } catch (e) {
    return {
      working: false,
      error: 'Piper command execution failed'
    };
  }
}

/**
 * Test macOS Say runtime
 */
async function testMacOSRuntime() {
  try {
    const result = spawnSync('say', ['-f', '/dev/null'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (result.error || result.status !== 0) {
      return {
        working: false,
        error: 'macOS Say command execution failed'
      };
    }
    return { working: true };
  } catch (e) {
    return {
      working: false,
      error: 'macOS Say command execution failed'
    };
  }
}

/**
 * Get the appropriate pip/install command for a provider
 * @param {string} providerName
 * @returns {string} Installation command or empty string if N/A
 */
export function getProviderInstallCommand(providerName) {
  const commands = {
    soprano: 'pip install soprano-tts',
    piper: 'pip install piper-tts',
    // macOS Say and Windows SAPI are built-in, no install needed
  };

  return commands[providerName] || '';
}

/**
 * Attempt to install a provider with fallback strategies
 * Handles PEP 668 protection by trying multiple installation methods
 * @param {string} providerName - Provider name (soprano, piper)
 * @returns {object} {success: boolean, message: string, command?: string, verified?: boolean}
 */
export async function attemptProviderInstallation(providerName) {
  // Whitelist approach - only allow known providers (MEDIUM #1 fix)
  const providers = {
    soprano: 'soprano-tts',
    piper: 'piper-tts'
  };

  const pkgName = providers[providerName];
  if (!pkgName) {
    return { success: false, message: `Unknown provider: ${providerName}` };
  }

  // Strategy 1: Try regular pip install (using spawnSync for correct API usage)
  try {
    // Show installation in progress
    console.log(`   Attempting: pip install ${pkgName}...`);
    const result = spawnSync('pip', ['install', pkgName], {
      stdio: 'inherit',
      timeout: 60000
    });

    if (result.error || result.status !== 0) {
      // Strategy 1 failed - continue to Strategy 2
    } else {
      // Verify installation actually worked (proves it's installed)
      const validation = await validateProvider(providerName);
      if (validation.installed) {
        return {
          success: true,
          message: `Successfully installed via pip`,
          command: `pip install ${pkgName}`,
          verified: true
        };
      }

      return { success: true, message: `Successfully installed via pip`, command: `pip install ${pkgName}` };
    }
  } catch (error) {
    // Strategy 1 failed - continue to Strategy 2
  }

  // Strategy 2: Try pipx install (recommended for PEP 668 protection)
  try {
    console.log(`   Attempting: pipx install ${pkgName}...`);
    const result = spawnSync('pipx', ['install', pkgName], {
      stdio: 'inherit',
      timeout: 60000
    });

    if (result.error || result.status !== 0) {
      // Both strategies failed
    } else {
      // Verify installation actually worked (proves it's installed)
      const validation = await validateProvider(providerName);
      if (validation.installed) {
        return {
          success: true,
          message: `Successfully installed via pipx`,
          command: `pipx install ${pkgName}`,
          verified: true
        };
      }

      return { success: true, message: `Successfully installed via pipx`, command: `pipx install ${pkgName}` };
    }
  } catch (error) {
    // Both strategies failed
  }

  // Both strategies failed - consistent error message (MEDIUM #2 fix)
  return { success: false, message: `Installation failed. Please install manually:\n   pip install ${pkgName}\n   or\n   pipx install ${pkgName}` };
}

/**
 * Get package installation information (location and version)
 * @param {string} pkgName - Package name to check
 * @returns {object|null} {location, version} or null if not found
 */
function getPackageInfo(pkgName) {
  try {
    // Use spawnSync with array args (security: correct API usage per CLAUDE.md)
    const result = spawnSync('pip', ['show', pkgName], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (result.error || result.status !== 0) {
      return null;
    }

    const output = result.stdout;

    // Parse pip show output
    const info = {};
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (key === 'Location') {
        info.location = value;
      } else if (key === 'Version') {
        info.version = value;
      } else if (key === 'Name') {
        info.name = value;
      }
    }

    // Return info if we found at least version or location
    return (info.version || info.location) ? info : null;
  } catch (error) {
    // Silently fail - package info is optional, not critical
    return null;
  }
}

/**
 * Get user-friendly provider names
 * @param {string} providerName
 * @returns {string} Display name
 */
export function getProviderDisplayName(providerName) {
  const names = {
    soprano: 'Soprano TTS',
    piper: 'Piper TTS',
    macos: 'macOS Say',
    'windows-sapi': 'Windows SAPI',
    'windows-piper': 'Windows Piper TTS'
  };

  return names[providerName] || providerName;
}
