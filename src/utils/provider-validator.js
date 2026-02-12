/**
 * @fileoverview Provider validation utility for AgentVibes
 * Validates TTS provider availability at installation, switch, and runtime
 */

import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';

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
 * @returns {Promise<{installed: boolean, message: string, pythonVersion?: string}>}
 */
export async function validateSopranoInstallation() {
  // Comprehensive Python version detection
  const pythonCommands = ['python3', 'python', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8'];

  for (const pythonCmd of pythonCommands) {
    try {
      // Use array form instead of template string for safety (security best practice)
      const result = execSync(pythonCmd, ['-m', 'pip', 'show', 'soprano-tts'], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (result && result.trim()) {
        return {
          installed: true,
          message: `Soprano TTS detected via ${pythonCmd}`,
          pythonVersion: pythonCmd
        };
      }
    } catch (error) {
      // Log error for debugging but continue to next Python version
      // Silent continue is intentional - we're checking multiple fallbacks
      continue;
    }
  }

  return {
    installed: false,
    message: 'Soprano TTS package not found in any Python installation',
    error: 'SOPRANO_NOT_FOUND'
  };
}

/**
 * Validate Piper TTS installation
 * Checks if Piper is available via pipx or direct installation
 * @returns {Promise<{installed: boolean, message: string}>}
 */
export async function validatePiperInstallation() {
  // Check for piper binary
  try {
    execSync('which', ['piper'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { installed: true, message: 'Piper TTS detected (binary)' };
  } catch (error) {
    // Continue to next check
  }

  // Check for pipx installation
  try {
    const result = execSync('pipx', ['list'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (result && result.includes('piper-tts')) {
      return { installed: true, message: 'Piper TTS detected (via pipx)' };
    }
  } catch (error) {
    // pipx not available or not in PATH
  }

  // Check if Python + piper-tts package installed
  try {
    const result = execSync('python3', ['-m', 'pip', 'show', 'piper-tts'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (result && result.trim()) {
      return { installed: true, message: 'Piper TTS detected (Python package)' };
    }
  } catch (error) {
    // Not installed via pip
  }

  return {
    installed: false,
    message: 'Piper TTS binary or Python package not found',
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
      message: 'macOS Say only available on macOS',
      error: 'NOT_MACOS'
    };
  }

  try {
    execSync('which', ['say'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { installed: true, message: 'macOS Say detected' };
  } catch (error) {
    // say command not found
  }

  return {
    installed: false,
    message: 'macOS Say command not found',
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
