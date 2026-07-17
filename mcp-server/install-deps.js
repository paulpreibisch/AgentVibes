#!/usr/bin/env node
/**
 * Automatic MCP Python Dependencies Installer
 *
 * Runs after npm install to ensure Python mcp package is installed
 */

import { execFileSync } from 'child_process';
import { platform } from 'os';
import { readdirSync, chmodSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const isWindows = platform() === 'win32';

console.log('🎤 AgentVibes MCP Server - Installing Python dependencies...\n');

// Function to check if Python is available
function checkPython() {
  const pythonCommands = ['python3', 'python', 'py'];

  for (const cmd of pythonCommands) {
    // Security: Validate command is in our allowlist only
    if (!pythonCommands.includes(cmd)) {
      continue;
    }

    try {
      // Security: Use execFileSync with array args to prevent command injection
      const version = execFileSync(cmd, ['--version'], { encoding: 'utf8', stdio: 'pipe' });
      console.log(`✅ Found ${cmd}: ${version.trim()}`);
      return cmd;
    } catch (error) {
      // Try next command
    }
  }

  return null;
}

// Function to check if mcp is installed
function checkMcpInstalled(pythonCmd) {
  // Security: Validate pythonCmd is in allowlist
  const allowedCommands = ['python3', 'python', 'py'];
  if (!allowedCommands.includes(pythonCmd)) {
    console.error('❌ Invalid Python command');
    return false;
  }

  try {
    // Security: Use execFileSync with array args to prevent command injection
    execFileSync(pythonCmd, ['-c', 'import mcp'], { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to install mcp package
function installMcp(pythonCmd) {
  // Security: Validate pythonCmd is in allowlist
  const allowedCommands = ['python3', 'python', 'py'];
  if (!allowedCommands.includes(pythonCmd)) {
    console.error('❌ Invalid Python command');
    return false;
  }

  try {
    console.log('\n📦 Installing Python mcp package...');
    // Security: Use execFileSync with array args to prevent command injection.
    // stderr is PIPED, not inherited: pip reports PEP 668 on stderr, and with
    // 'inherit' the child writes straight to the terminal so error.stderr is
    // null — which silently disabled the externally-managed branch below and
    // showed macOS users a scary "failed" instead of the venv guidance written
    // for them. Piped stderr is re-emitted below so nothing is swallowed.
    execFileSync(pythonCmd, ['-m', 'pip', 'install', '--user', 'mcp'], {
      stdio: ['ignore', 'inherit', 'pipe'],
    });
    console.log('✅ Python mcp package installed successfully!\n');
    return true;
  } catch (error) {
    // Check if this is a PEP 668 externally-managed environment error (macOS, some Linux distros)
    const errorOutput = error.stderr?.toString() || error.message || '';
    if (errorOutput.includes('externally-managed-environment') || errorOutput.includes('PEP 668')) {
      console.log('ℹ️  Python environment is externally managed (PEP 668)');
      console.log('   This is normal on macOS and some Linux distributions');
      console.log('   MCP will work when installed in a virtual environment');
      console.log('   See mcp-server/README.md for setup instructions\n');
      return 'skipped'; // Special return value
    }

    // Surface pip's own stderr — it is piped above, so print it or the user
    // sees a bare "failed" with no reason.
    if (errorOutput.trim()) console.error(errorOutput.trim());
    console.error('❌ Failed to install mcp package');
    console.error('⚠️  Manual installation required:');
    console.error('   Please install manually: pip install --user mcp');
    console.error('   Run: pip install mcp\n');
    return false;
  }
}

/**
 * Ensure all shell hook files have execute permissions.
 * npm publish can strip execute bits from .sh files; this restores them.
 * No-op on Windows (execute bit is meaningless there).
 */
function ensureHookPermissions() {
  if (isWindows) return;

  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const hooksDirs = [
    join(packageRoot, '.claude', 'hooks'),
  ];

  for (const dir of hooksDirs) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue; // Directory may not exist
    }

    for (const file of entries) {
      if (!file.endsWith('.sh')) continue;
      const filePath = join(dir, file);
      // SECURITY: Validate path stays within hooks directory
      const resolved = resolve(filePath);
      if (!resolved.startsWith(resolve(dir) + '/') && resolved !== resolve(dir)) continue;
      try {
        const stat = statSync(filePath);
        // Only chmod if not already executable (avoids unnecessary writes)
        if ((stat.mode & 0o111) === 0) {
          chmodSync(filePath, stat.mode | 0o755);
        }
      } catch {
        // Non-fatal: log and continue
        console.warn(`⚠️  Could not chmod ${file}`);
      }
    }
  }
}

// Main installation flow
function main() {
  // Restore execute permissions on hook files (npm publish may strip them)
  ensureHookPermissions();

  // Check if Python is available
  const pythonCmd = checkPython();

  if (!pythonCmd) {
    console.error('❌ Python not found!');
    console.error('   Please install Python 3.10+ from https://python.org\n');
    console.error('   After installing Python, run: npm run install-mcp-deps\n');
    process.exit(0); // Don't fail npm install
  }

  // Check if mcp is already installed
  if (checkMcpInstalled(pythonCmd)) {
    console.log('✅ Python mcp package already installed\n');
    console.log('🎉 AgentVibes MCP Server is ready to use!');
    console.log('   See mcp-server/README.md for setup instructions\n');
    return;
  }

  // Install mcp package
  const result = installMcp(pythonCmd);

  if (result === true) {
    console.log('🎉 AgentVibes MCP Server setup complete!');
    console.log('   See mcp-server/README.md for Claude Desktop configuration\n');
  } else if (result === 'skipped') {
    console.log('✅ AgentVibes MCP Server is ready for virtual environment setup');
    console.log('   Create a venv and install: python3 -m venv venv && source venv/bin/activate && pip install mcp\n');
  } else {
    console.log('⚠️  Manual installation required:');
    console.log('   Run: pip install mcp\n');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkPython, checkMcpInstalled, installMcp };
