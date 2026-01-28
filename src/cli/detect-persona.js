/**
 * File: src/cli/detect-persona.js
 *
 * AgentVibes - Persona Detection CLI
 * Display detected persona from IDENTITY.md
 *
 * @fileoverview CLI command to test persona detection
 * @context Shows detected persona attributes and voice mapping
 * @architecture CLI wrapper around persona-detector utility
 * @dependencies persona-detector, chalk, boxen
 * @entrypoints agentvibes detect-persona [directory]
 * @patterns CLI formatting, detection display, graceful fallbacks
 * @related persona-detector.js, installer.js
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { detectPersona } from '../utils/persona-detector.js';
import path from 'node:path';

/**
 * Run persona detection and display results
 * @param {string} targetDir - Directory to check for IDENTITY.md
 */
export async function runPersonaDetection(targetDir) {
  const workspaceDir = path.resolve(targetDir || process.cwd());

  console.log(chalk.cyan(`\n🔍 Detecting persona in: ${workspaceDir}\n`));

  const persona = await detectPersona(workspaceDir);

  if (persona.detected) {
    const personaInfo = [
      `${chalk.bold('Name:')} ${persona.name} ${persona.emoji}`,
      `${chalk.bold('Creature:')} ${persona.creature}`,
      `${chalk.bold('Vibe:')} ${persona.vibe}`,
      '',
      chalk.green('🎤 Voice Settings:'),
      `  ${chalk.bold('Voice:')} ${persona.voice}`,
      `  ${chalk.bold('Speed:')} ${persona.speed}x`,
      `  ${chalk.bold('Personality:')} ${persona.personality}`,
      '',
      chalk.dim(`Source: ${persona.source}`),
    ].join('\n');

    console.log(
      boxen(personaInfo, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
        title: '✨ Persona Detected',
        titleAlignment: 'center',
      })
    );

    console.log(
      chalk.green(
        '✓ AgentVibes will automatically use these voice settings for TTS.\n'
      )
    );
  } else {
    const defaultInfo = [
      chalk.yellow('No IDENTITY.md found in workspace.'),
      '',
      chalk.bold('Using default settings:'),
      `  Name: ${persona.name}`,
      `  Voice: ${persona.voice}`,
      `  Speed: ${persona.speed}x`,
      '',
      chalk.dim(
        'Create an IDENTITY.md file to customize your agent\'s persona!'
      ),
    ].join('\n');

    console.log(
      boxen(defaultInfo, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
        title: '⚙️ Default Settings',
        titleAlignment: 'center',
      })
    );
  }
}
