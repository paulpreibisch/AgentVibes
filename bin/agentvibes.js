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
import { ConfigService } from '../src/services/config-service.js';
import { launchConsole } from '../src/console/app.js';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
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

  launchConsole({ startTab: result.startTab }).catch(err => {
    process.stderr.write(`Failed to launch AgentVibes console: ${err.message}\n`);
    process.exit(1);
  });
}
