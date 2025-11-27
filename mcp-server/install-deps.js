#!/usr/bin/env node
/**
 * Automatic MCP Python Dependencies Installer
 *
 * Runs after npm install to ensure Python mcp package is installed
 */

import { execFileSync } from 'child_process';
import { platform } from 'os';

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
    // Security: Use execFileSync with array args to prevent command injection
    execFileSync(pythonCmd, ['-m', 'pip', 'install', '--user', 'mcp'], { stdio: 'inherit' });
    console.log('✅ Python mcp package installed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to install mcp package');
    console.error('   Please install manually: pip install --user mcp\n');
    return false;
  }
}

// Main installation flow
function main() {
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
  const success = installMcp(pythonCmd);

  if (success) {
    console.log('🎉 AgentVibes MCP Server setup complete!');
    console.log('   See mcp-server/README.md for Claude Desktop configuration\n');
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
