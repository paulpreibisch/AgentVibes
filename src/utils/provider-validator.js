/**
 * @fileoverview Provider validation utility for AgentVibes
 * Validates TTS provider availability at installation, switch, and runtime
 */

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
  // SECURITY: Use spawnSync instead of execSync+shell to prevent command injection (#126)
  const result = spawnSync('which', [command], { // NOSONAR
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return result.status === 0;
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
    case 'kokoro':
      return await validateKokoroInstallation();
    case 'elevenlabs':
      return await validateElevenLabsInstallation();
    case 'macos':
      return await validateMacOSProvider();
    case 'sapi':
    case 'windows-sapi':
      return await validateWindowsSAPI();
    case 'windows-piper':
      return await validateWindowsPiperInstallation();
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
  // On Windows, 'py' is the standard Python launcher and often the only one in PATH
  const pythonCommands = process.platform === 'win32'
    ? ['py', 'python', 'python3', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8']
    : ['python3', 'python', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8'];

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
 * Validate Kokoro TTS installation (kokoro-onnx Python package)
 * @returns {Promise<{installed: boolean, message: string, checkedLocations?: string[], error?: string}>}
 */
export async function validateKokoroInstallation() {
  const pythonCommands = process.platform === 'win32'
    ? ['py', 'python', 'python3']
    : ['python3', 'python'];

  for (const pythonCmd of pythonCommands) {
    try {
      const result = spawnSync(pythonCmd, ['-c', 'import kokoro; import soundfile; import numpy'], { // NOSONAR
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 8000,
      });
      if (result.status === 0) {
        return { installed: true, message: `Kokoro TTS detected (via ${pythonCmd})`, checkedLocations: [pythonCmd] };
      }
    } catch {
      // try next
    }
  }

  return {
    installed: false,
    message: 'Kokoro TTS not installed. Run: pip install kokoro-onnx soundfile numpy',
    error: 'KOKORO_NOT_FOUND',
    checkedLocations: pythonCommands,
  };
}

/**
 * Validate ElevenLabs configuration (API key presence)
 * @returns {Promise<{installed: boolean, message: string, error?: string}>}
 */
export async function validateElevenLabsInstallation() {
  // Check environment variable
  if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.length > 0) {
    return { installed: true, message: 'ElevenLabs API key found in environment' };
  }

  // Check key file
  const keyFile = path.join(os.homedir(), '.agentvibes', 'elevenlabs-key.txt');
  if (isSafePathExists(keyFile)) {
    try {
      const key = fs.readFileSync(keyFile, 'utf8').trim();
      if (key.length > 0) {
        return { installed: true, message: 'ElevenLabs API key found in ~/.agentvibes/elevenlabs-key.txt' };
      }
    } catch { /* fall through */ }
  }

  return {
    installed: false,
    message: 'ElevenLabs API key not set. Set ELEVENLABS_API_KEY env var or save key to ~/.agentvibes/elevenlabs-key.txt',
    error: 'ELEVENLABS_NO_KEY',
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
    // SECURITY: Use spawnSync instead of execSync+shell to prevent command injection (#126)
    const result = spawnSync('which', ['say'], { // NOSONAR
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (result.status !== 0) throw new Error('say not found');
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
 * Validate Windows Piper TTS installation
 * Checks for piper.exe at the standard Windows install location
 * @returns {Promise<{installed: boolean, message: string, checkedLocations?: string[], error?: string}>}
 */
export async function validateWindowsPiperInstallation() {
  if (process.platform !== 'win32') {
    return await validatePiperInstallation(); // Fall back to Unix checks
  }

  const checkedLocations = [];

  // Check the standard Windows install path
  const localAppData = process.env.LOCALAPPDATA ||
    (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
  if (localAppData) {
    const piperExe = path.join(localAppData, 'Programs', 'Piper', 'piper.exe');
    checkedLocations.push(piperExe);
    if (fs.existsSync(piperExe)) {
      return { installed: true, message: 'Piper TTS detected (Windows exe)', checkedLocations };
    }
  }

  // Also check PATH in case user installed it differently
  if (commandExistsInPath('piper')) {
    return { installed: true, message: 'Piper TTS detected (in PATH)', checkedLocations: ['PATH'] };
  }
  checkedLocations.push('PATH');

  return {
    installed: false,
    message: `Piper TTS is not installed on your system (checked: ${checkedLocations.join(', ')})`,
    error: 'WINDOWS_PIPER_NOT_FOUND',
    checkedLocations
  };
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
    const result = spawnSync('python3', ['-c', 'import soprano; print("OK")'], { // NOSONAR
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
    const result = spawnSync('piper', ['--help'], { // NOSONAR
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
    const result = spawnSync('say', ['-f', '/dev/null'], { // NOSONAR
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
    kokoro: 'pip install kokoro-onnx soundfile numpy',
    elevenlabs: 'export ELEVENLABS_API_KEY=your_key  # get free key at elevenlabs.io',
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
  // Whitelist approach - only allow known providers
  const providers = {
    soprano: 'soprano-tts',
    piper: 'piper-tts',
    kokoro: 'kokoro-onnx',
    'windows-piper': 'piper-windows-exe'
    // elevenlabs requires API key, not pip install — handled separately
  };

  const pkgName = providers[providerName];
  if (!pkgName) {
    return { success: false, message: `Unknown provider: ${providerName}` };
  }

  // Windows Piper: download exe instead of pip install
  // The actual download is handled by checkAndInstallPiperWindows() in installer.js.
  // Signal success here so the installer flow continues to that function.
  if (providerName === 'windows-piper') {
    return {
      success: true,
      message: 'Windows Piper will be downloaded during installation',
      command: 'checkAndInstallPiperWindows()',
      verified: false // Verification happens after the actual download
    };
  }

  const isWindows = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;

  // Strategy 1: Try regular pip install (using spawnSync for correct API usage)
  try {
    console.log(`   Attempting: pip install ${pkgName}...`);
    const result = spawnSync('pip', ['install', pkgName], { // NOSONAR
      stdio: 'inherit',
      timeout: 60000
    });

    if (result.error || result.status !== 0) {
      // Strategy 1 failed - continue to Strategy 2
    } else {
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
    const result = spawnSync('pipx', ['install', pkgName], { // NOSONAR
      stdio: 'inherit',
      timeout: 60000
    });

    if (result.error || result.status !== 0) {
      // Strategy 2 failed
    } else {
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
    // Strategy 2 failed
  }

  // Strategy 3 (Windows only): Try 'py -m pip' which is the standard Windows Python launcher
  if (isWindows) {
    try {
      console.log(`   Attempting: py -m pip install ${pkgName}...`);
      const result = spawnSync('py', ['-m', 'pip', 'install', pkgName], { // NOSONAR
        stdio: 'inherit',
        timeout: 60000
      });

      if (!result.error && result.status === 0) {
        const validation = await validateProvider(providerName);
        if (validation.installed) {
          return {
            success: true,
            message: `Successfully installed via py -m pip`,
            command: `py -m pip install ${pkgName}`,
            verified: true
          };
        }

        return { success: true, message: `Successfully installed via py -m pip`, command: `py -m pip install ${pkgName}` };
      }
    } catch (error) {
      // Strategy 3 failed
    }
  }

  // All strategies failed
  const installHint = isWindows
    ? `Installation failed. Please install manually:\n   py -m pip install ${pkgName}\n   or\n   pip install ${pkgName}`
    : `Installation failed. Please install manually:\n   pip install ${pkgName}\n   or\n   pipx install ${pkgName}`;
  return { success: false, message: installHint };
}

/**
 * Get package installation information (location and version)
 * @param {string} pkgName - Package name to check
 * @returns {object|null} {location, version} or null if not found
 */
function getPackageInfo(pkgName) {
  try {
    // Use spawnSync with array args (security: correct API usage per CLAUDE.md)
    const result = spawnSync('pip', ['show', pkgName], { // NOSONAR
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
    kokoro: 'Kokoro TTS',
    elevenlabs: 'ElevenLabs',
    macos: 'macOS Say',
    sapi: 'Windows SAPI',
    'windows-sapi': 'Windows SAPI',
    'windows-piper': 'Piper TTS'
  };

  return names[providerName] || providerName;
}
