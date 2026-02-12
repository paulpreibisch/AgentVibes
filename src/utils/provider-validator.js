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
      return validateSopranoInstallation();
    case 'piper':
      return validatePiperInstallation();
    case 'macos':
      return validateMacOSProvider();
    case 'windows-sapi':
      return validateWindowsSAPI();
    case 'windows-piper':
      return validatePiperInstallation();
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
  const pythonCommands = ['python3', 'python', 'python3.11', 'python3.10', 'python3.9'];

  for (const pythonCmd of pythonCommands) {
    try {
      const result = execSync(`${pythonCmd} -m pip show soprano-tts`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (result) {
        return {
          installed: true,
          message: `Soprano TTS detected (${pythonCmd})`,
          pythonVersion: pythonCmd
        };
      }
    } catch {}
  }

  return {
    installed: false,
    message: 'pip show soprano-tts',
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
    execSync('which piper', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { installed: true, message: 'Piper TTS detected' };
  } catch {}

  // Check for pipx installation
  try {
    const result = execSync('pipx list', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (result.includes('piper-tts')) {
      return { installed: true, message: 'Piper TTS detected (via pipx)' };
    }
  } catch {}

  // Check if Python + piper-tts package installed
  try {
    const result = execSync('python3 -m pip show piper-tts', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (result) {
      return { installed: true, message: 'Piper TTS detected (Python package)' };
    }
  } catch {}

  return {
    installed: false,
    message: 'piper binary or piper-tts package',
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
    execSync('which say', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { installed: true, message: 'macOS Say detected' };
  } catch {}

  return {
    installed: false,
    message: 'macOS Say command',
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
      return testSopranoRuntime();
    case 'piper':
      return testPiperRuntime();
    case 'macos':
      return testMacOSRuntime();
    default:
      return { working: true }; // Assume other providers work if installed
  }
}

/**
 * Test Soprano runtime (webui connectivity)
 */
async function testSopranoRuntime() {
  try {
    // Try a quick soprano generation
    const result = spawnSync('python3', ['-c', 'import soprano; print("OK")'], {
      timeout: 5000,
      encoding: 'utf8'
    });

    if (result.error || result.status !== 0) {
      return {
        working: false,
        error: 'Soprano Python module check failed'
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
    execSync('piper --help', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    return { working: true };
  } catch (e) {
    return {
      working: false,
      error: 'Piper runtime test failed'
    };
  }
}

/**
 * Test macOS Say runtime
 */
async function testMacOSRuntime() {
  try {
    execSync('say -f /dev/null', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { working: true };
  } catch (e) {
    return {
      working: false,
      error: 'macOS Say runtime test failed'
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
