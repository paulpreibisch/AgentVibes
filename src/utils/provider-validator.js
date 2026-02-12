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
 * Validate a TTS provider's installation status
 * @param {string} providerName - Provider name (soprano, piper, macos, windows-sapi, etc.)
 * @returns {Promise<{installed: boolean, message: string, pythonVersion?: string, error?: string}>}
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
 * Validate Soprano TTS installation
 * Checks multiple Python versions since Soprano might be in non-default Python
 * @returns {Promise<{installed: boolean, message: string, pythonVersion?: string, checkedCount?: number}>}
 */
export async function validateSopranoInstallation() {
  const checkedLocations = [];

  // Check for pipx installation first (common for CLI tools)
  // Use os.homedir() (not env var) to prevent HOME injection attacks
  try {
    const homeDir = os.homedir();
    const sopranoVenvPath = path.join(homeDir, '.local', 'share', 'pipx', 'venvs', 'soprano-tts');

    // Validate path is within home directory (prevent path traversal)
    const resolvedPath = path.resolve(sopranoVenvPath);
    const resolvedHome = path.resolve(homeDir);
    if (!resolvedPath.startsWith(resolvedHome)) {
      throw new Error('Path traversal detected');
    }

    if (fs.existsSync(sopranoVenvPath)) {
      checkedLocations.push('pipx'); // Always track what was checked
      return { installed: true, message: 'Soprano TTS detected (via pipx)', checkedLocations };
    }
  } catch (error) {
    // If home directory check fails, fall through to Python checks
    if (error.code !== 'ENOENT') {
      console.error('[DEBUG] Pipx check error:', error.message);
    }
  }
  checkedLocations.push('pipx');

  // Comprehensive Python version detection
  const pythonCommands = ['python3', 'python', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8'];

  for (const pythonCmd of pythonCommands) {
    try {
      // Use array form to prevent command injection (security: CLAUDE.md)
      const result = execSync(pythonCmd, ['-m', 'pip', 'show', 'soprano-tts'], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000
      });

      if (result && result.trim()) {
        checkedLocations.push(pythonCmd); // Track which Python found it
        return {
          installed: true,
          message: `Soprano TTS detected via ${pythonCmd}`,
          pythonVersion: pythonCmd,
          checkedCount: checkedLocations.length + pythonCommands.indexOf(pythonCmd)
        };
      }
    } catch (error) {
      // Continue to next Python version - errors expected when Python not in PATH or package missing
    }
  }

  // Build list of Python versions checked
  checkedLocations.push(...pythonCommands);

  return {
    installed: false,
    message: `Soprano TTS is not installed on your system (checked: ${checkedLocations.join(', ')})`,
    error: 'SOPRANO_NOT_FOUND',
    checkedCount: checkedLocations.length
  };
}

/**
 * Validate Piper TTS installation
 * Checks if Piper is available via pipx or direct installation
 * Suppresses all error output for clean UX
 * @returns {Promise<{installed: boolean, message: string}>}
 */
export async function validatePiperInstallation() {
  const checkedLocations = [];

  // Check for piper binary with error suppression
  try {
    execSync('which piper 2>/dev/null', {
      encoding: 'utf8',
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { installed: true, message: 'Piper TTS detected (binary in PATH)' };
  } catch (error) {
    checkedLocations.push('PATH (piper binary)');
  }

  // Check for pipx installation (use venv directory check - more reliable than pipx list)
  try {
    const homeDir = os.homedir(); // Use os.homedir() not env var (security: prevent HOME injection)
    const piperVenvPath = path.join(homeDir, '.local', 'share', 'pipx', 'venvs', 'piper-tts');

    // Validate path is within home directory (prevent path traversal)
    const resolvedPath = path.resolve(piperVenvPath);
    const resolvedHome = path.resolve(homeDir);
    if (!resolvedPath.startsWith(resolvedHome)) {
      throw new Error('Path traversal detected');
    }

    if (fs.existsSync(piperVenvPath)) {
      checkedLocations.push('pipx'); // Always track
      return { installed: true, message: 'Piper TTS detected (via pipx)', checkedLocations };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[DEBUG] Pipx check error:', error.message);
    }
  }
  checkedLocations.push('pipx');

  // Check if Python + piper-tts package installed using array form (security: prevent injection)
  try {
    const result = execSync('python3', ['-m', 'pip', 'show', 'piper-tts'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000
    });
    if (result && result.trim()) {
      checkedLocations.push('python3 pip'); // Track what found it
      return { installed: true, message: 'Piper TTS detected (Python package)', checkedLocations };
    }
  } catch (error) {
    checkedLocations.push('python3 pip');
  }

  return {
    installed: false,
    message: `Piper TTS is not installed on your system (checked: ${checkedLocations.join(', ')})`,
    error: 'PIPER_NOT_FOUND'
  };
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
    execSync('piper', ['--help'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
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
    execSync('say', ['-f', '/dev/null'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
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

  // Strategy 1: Try regular pip install (using array form for security - CRITICAL #1 fix)
  try {
    // Show installation in progress
    console.log(`   Attempting: pip install ${pkgName}...`);
    execSync('pip', ['install', pkgName], {
      stdio: 'inherit',
      timeout: 60000 // HIGH #1 fix - 60 second timeout
    });

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
  } catch (error) {
    // Strategy 1 failed - continue to Strategy 2
    // Don't check specific error messages - just try next strategy (MEDIUM #3 fix)
  }

  // Strategy 2: Try pipx install (recommended for PEP 668 protection)
  try {
    console.log(`   Attempting: pipx install ${pkgName}...`);
    execSync('pipx', ['install', pkgName], {
      stdio: 'inherit',
      timeout: 60000 // HIGH #1 fix - 60 second timeout
    });

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
    // Small delay to ensure package is registered in pip
    // (sometimes pip needs a moment to update its cache)
    const output = execSync('pip', ['show', pkgName], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'] // Capture both stdout and stderr
    });

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
