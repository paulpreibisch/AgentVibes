#!/usr/bin/env node
/**
 * AgentVibes List Formatter
 *
 * Beautiful multi-column boxen displays for voices and personalities
 * Inspired by BMAD-METHOD's installer UX
 */

import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Format items into multi-column layout
 * @param {Array} items - Array of strings or objects with {name, description, current}
 * @param {Object} options - Formatting options
 * @returns {string} Formatted multi-column text
 */
export function formatColumns(items, options = {}) {
  const {
    columns = 2,
    columnWidth = 35,
    highlightChar = '▶',
    indent = '  '
  } = options;

  const rows = [];
  const itemsPerRow = columns;

  for (let i = 0; i < items.length; i += itemsPerRow) {
    const rowItems = items.slice(i, i + itemsPerRow);
    const row = rowItems.map((item, idx) => {
      const isObject = typeof item === 'object';
      const name = isObject ? item.name : item;
      const desc = isObject ? item.description : '';
      const isCurrent = isObject ? item.current : false;

      // Format item
      let formatted = isCurrent ? `${highlightChar} ${name}` : `  ${name}`;

      if (desc) {
        formatted = chalk.cyan(formatted) + chalk.gray(` ${desc}`);
      } else if (isCurrent) {
        formatted = chalk.cyan(formatted);
      }

      // Pad to column width (accounting for ANSI codes)
      const plainLength = (isCurrent ? `${highlightChar} ${name}` : `  ${name}`).length + (desc ? ` ${desc}`.length : 0);
      const padding = Math.max(0, columnWidth - plainLength);

      return formatted + ' '.repeat(padding);
    });

    rows.push(indent + row.join('  '));
  }

  return rows.join('\n');
}

/**
 * Format voices list with boxen
 * @param {Array} voices - Array of voice objects {name, lang, current}
 * @param {Object} options - Display options
 * @returns {string} Formatted boxen output
 */
export function formatVoicesList(voices, options = {}) {
  const {
    provider = 'Piper TTS',
    title = '🎤 Available Voices',
    columns = 2,
    showUsage = true
  } = options;

  if (voices.length === 0) {
    const content = chalk.yellow('No voices found') + '\n\n' +
      chalk.gray('Download voices with:\n') +
      chalk.cyan('  /agent-vibes:provider download <voice-name>');

    return boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
      title: chalk.bold(title),
      titleAlignment: 'center'
    });
  }

  // Format voices
  const formattedItems = voices.map(v => ({
    name: v.name,
    description: v.lang || '',
    current: v.current || false
  }));

  let content = chalk.bold(`${provider}\n\n`);
  content += formatColumns(formattedItems, { columns });

  if (showUsage) {
    content += '\n\n' + chalk.gray('─'.repeat(60)) + '\n';
    content += chalk.dim('Switch voice: ') + chalk.cyan('/agent-vibes:switch <voice-name>') + '\n';
    content += chalk.dim('Preview voice: ') + chalk.cyan('/agent-vibes:preview <voice-name>');
  }

  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: chalk.bold(title),
    titleAlignment: 'center'
  });
}

/**
 * Format personalities list with boxen
 * @param {Array} personalities - Array of personality objects {name, description, current}
 * @param {Object} options - Display options
 * @returns {string} Formatted boxen output
 */
export function formatPersonalitiesList(personalities, options = {}) {
  const {
    title = '🎭 Available Personalities',
    columns = 2,
    showUsage = true
  } = options;

  if (personalities.length === 0) {
    const content = chalk.yellow('No personalities found') + '\n\n' +
      chalk.gray('Add a personality with:\n') +
      chalk.cyan('  /agent-vibes:personality add <name>');

    return boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
      title: chalk.bold(title),
      titleAlignment: 'center'
    });
  }

  let content = formatColumns(personalities, { columns, columnWidth: 40 });

  if (showUsage) {
    content += '\n\n' + chalk.gray('─'.repeat(60)) + '\n';
    content += chalk.dim('Set personality: ') + chalk.cyan('/agent-vibes:personality <name>') + '\n';
    content += chalk.dim('Add personality: ') + chalk.cyan('/agent-vibes:personality add <name>') + '\n';
    content += chalk.dim('Edit personality: ') + chalk.cyan('/agent-vibes:personality edit <name>');
  }

  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'magenta',
    title: chalk.bold(title),
    titleAlignment: 'center'
  });
}

/**
 * Format generic list with boxen
 * @param {Array} items - Array of items (strings or objects)
 * @param {Object} options - Display options
 * @returns {string} Formatted boxen output
 */
export function formatList(items, options = {}) {
  const {
    title = 'Items',
    icon = '📋',
    columns = 2,
    borderColor = 'blue',
    showCount = true
  } = options;

  const titleText = icon ? `${icon} ${title}` : title;
  const countText = showCount ? chalk.gray(` (${items.length})`) : '';

  let content = '';
  if (showCount) {
    content = chalk.bold(`Total: ${items.length} items\n\n`);
  }

  content += formatColumns(items, { columns });

  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor,
    title: chalk.bold(titleText) + countText,
    titleAlignment: 'center'
  });
}
