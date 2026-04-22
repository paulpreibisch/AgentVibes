#!/usr/bin/env node
/**
 * AgentVibes TUI Console — Command Entry Point
 * Story 6.5: Command Routing & Entry Points
 *
 * Routes CLI subcommands to the correct TUI console tab:
 *   npx agentvibes            → smart detection (Settings if installed, Install if not)
 *   npx agentvibes install    → Install tab
 *   npx agentvibes config     → Settings tab
 *   npx agentvibes configure  → Settings tab
 *   npx agentvibes <unknown>  → help text + exit(1)
 */

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensure all npm dependencies are installed before importing modules that need them.
 * This prevents "Cannot find package" errors when running via npx with a stale cache
 * or from a fresh clone without npm install.
 */
function ensureDependencies() {
  const pkgRoot = path.resolve(__dirname, '..');
  const nodeModules = path.join(pkgRoot, 'node_modules');
  const pkgJsonPath = path.join(pkgRoot, 'package.json');

  // Quick check: if node_modules doesn't exist or blessed is missing, run npm install
  const criticalPackages = ['blessed', 'chalk', 'inquirer', 'commander'];
  const missing = criticalPackages.filter(
    pkg => !fs.existsSync(path.join(nodeModules, pkg))
  );

  if (missing.length === 0) return;

  process.stderr.write(
    `\n  Installing missing dependencies (${missing.join(', ')})...\n\n`
  );

  try {
    execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: pkgRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  } catch {
    process.stderr.write(
      '\n  Failed to install dependencies. Please run: npm install\n\n'
    );
    process.exit(1);
  }
}

/**
 * Resolve CLI args to a TUI start tab or an error.
 * Exported as named export for unit testing without child-process spawning.
 *
 * @param {string[]} args - CLI arguments (process.argv.slice(2))
 * @param {{ isInstalled: () => boolean }} configService
 * @returns {{ startTab: string } | { help: string } | { error: string }}
 */
export function resolveStartTab(args, configService) {
  const cmd = args[0];

  if (cmd === 'install') {
    // Non-interactive flags → delegate to CLI installer (src/installer.js), not TUI
    const isNonInteractive = args.includes('--non-interactive') || args.includes('--yes') || args.includes('-y');
    if (isNonInteractive) {
      return { cliInstall: true, args: args.slice(1) };
    }
    return { startTab: 'install' };
  }

  if (cmd === 'config' || cmd === 'configure') {
    return { startTab: 'settings' };
  }

  if (cmd === '--help' || cmd === '-h') {
    return {
      help: [
        'AgentVibes — TTS for AI assistants with personality',
        '',
        'Usage:',
        '  npx agentvibes             # Open console (auto-detects install state)',
        '  npx agentvibes install     # Open Install tab',
        '  npx agentvibes config      # Open Settings tab',
        '  npx agentvibes --help      # Show this help',
        '',
        'Visit https://agentvibes.org for documentation.',
      ].join('\n'),
    };
  }

  if (!cmd) {
    // Smart detection: show Install tab if not installed, Settings if installed
    return { startTab: configService.isInstalled() ? 'settings' : 'install' };
  }

  // Unknown command → help + error
  return {
    error: [
      `Unknown command: '${cmd}'`,
      '',
      'Usage:',
      '  npx agentvibes             # Open console (auto-detects install state)',
      '  npx agentvibes install     # Open Install tab',
      '  npx agentvibes config      # Open Settings tab',
      '',
      "Run 'npx agentvibes' to get started.",
    ].join('\n'),
  };
}

// ---------------------------------------------------------------------------
// Main: run only when executed directly (not imported by tests)
// ---------------------------------------------------------------------------

// Resolve symlinks before comparing so the guard works when run via npm link / npx
const _thisFile = fileURLToPath(import.meta.url);
const _argv1    = (() => { try { return fs.realpathSync(process.argv[1]); } catch { return process.argv[1]; } })();

if (_argv1 === _thisFile) {
  // Ensure deps are installed BEFORE dynamic imports that need them
  ensureDependencies();

  // Dynamic imports — only loaded after deps are confirmed present
  const { ConfigService } = await import('../src/services/config-service.js');
  const { launchConsole } = await import('../src/console/app.js');

  const configService = new ConfigService();
  const result = resolveStartTab(process.argv.slice(2), configService);

  if (result.help) {
    process.stdout.write(result.help + '\n');
    process.exit(0);
  }

  if (result.error) {
    process.stderr.write(result.error + '\n');
    process.exit(1);
  }

  if (result.cliInstall) {
    // Route to CLI installer for non-interactive installs
    const installerPath = path.resolve(__dirname, '..', 'src', 'installer.js');
    execFileSync(process.execPath, [installerPath, 'install', ...result.args], {
      stdio: 'inherit',
      shell: false,
    });
    process.exit(0);
  }

  launchConsole({ startTab: result.startTab }).catch(err => {
    process.stderr.write(`Failed to launch AgentVibes console: ${err.message}\n`);
    process.exit(1);
  });
}
