#!/usr/bin/env node

/**
 * AgentVibes MCP Server Launcher (Cross-Platform)
 *
 * This Node.js script replaces the bash wrapper to work on Windows, macOS, and Linux.
 * It auto-installs Python dependencies and launches the Python MCP server.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Package root is one level up from bin/
const PACKAGE_ROOT = join(__dirname, '..');
const MCP_SERVER = join(PACKAGE_ROOT, 'mcp-server', 'server.py');
const INSTALL_DEPS = join(PACKAGE_ROOT, 'mcp-server', 'install-deps.js');

// Check if Python MCP server exists
if (!existsSync(MCP_SERVER)) {
  console.error(`❌ Error: MCP server not found at ${MCP_SERVER}`);
  process.exit(1);
}

// Function to find available Python command
async function findPythonCommand() {
  const commands = platform() === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

  for (const cmd of commands) {
    try {
      const checkCmd = platform() === 'win32' ? 'where' : 'which';
      const proc = spawn(checkCmd, [cmd], { stdio: 'ignore' });
      const exists = await new Promise((resolve) => {
        proc.on('close', (code) => resolve(code === 0));
      });

      if (exists) {
        return cmd;
      }
    } catch (err) {
      // Try next command
    }
  }

  return null;
}

// Function to check if Python module is installed
function checkPythonModule(pythonCmd, moduleName) {
  return new Promise((resolve) => {
    const proc = spawn(pythonCmd, ['-c', `import ${moduleName}`], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
  });
}

// Main setup and launch function
async function main() {
  // Silent mode - no output to avoid breaking MCP JSON protocol

  // Find Python command
  const pythonCmd = await findPythonCommand();
  if (!pythonCmd) {
    console.error('ERROR: Python 3 not found. Install from https://python.org and restart Claude Desktop.');
    process.exit(1);
  }

  // Check if MCP Python package is installed
  const hasMCP = await checkPythonModule(pythonCmd, 'mcp');
  if (!hasMCP) {
    // Try to install MCP package directly
    try {
      const installCmd = `${pythonCmd} -m pip install --user mcp`;
      const installProc = spawn(pythonCmd, ['-m', 'pip', 'install', '--user', 'mcp'], {
        stdio: 'pipe',
        shell: false
      });

      await new Promise((resolve, reject) => {
        installProc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            console.error('ERROR: Failed to install Python mcp package. Run: pip install mcp');
            reject(new Error('Dependency installation failed'));
          }
        });
      });
    } catch (err) {
      console.error('ERROR: Failed to install Python mcp package. Run: pip install mcp');
      process.exit(1);
    }
  }

  // Launch the Python MCP server
  const serverProc = spawn(pythonCmd, [MCP_SERVER], {
    stdio: 'inherit',
    env: process.env
  });

  serverProc.on('error', (err) => {
    console.error('❌ Failed to start MCP server:', err.message);
    process.exit(1);
  });

  serverProc.on('close', (code) => {
    process.exit(code || 0);
  });

  // Handle termination signals
  process.on('SIGINT', () => serverProc.kill('SIGINT'));
  process.on('SIGTERM', () => serverProc.kill('SIGTERM'));
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
