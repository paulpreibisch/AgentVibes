#!/usr/bin/env node
/**
 * Personality List Display - Beautiful multi-column personality listing
 * Called by personality-manager.sh to display personalities with boxen formatting
 */

import { formatPersonalitiesList } from '../utils/list-formatter.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Get personality description from markdown file
 */
function getPersonalityDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Try to extract description from frontmatter or first paragraph
    const descMatch = content.match(/description:\s*(.+)/i);
    if (descMatch) {
      return descMatch[1].trim();
    }

    // Try to get first line after frontmatter
    const lines = content.split('\n');
    let inFrontmatter = false;
    let frontmatterCount = 0;

    for (const line of lines) {
      if (line.trim() === '---') {
        frontmatterCount++;
        inFrontmatter = frontmatterCount === 1;
        continue;
      }

      if (!inFrontmatter && frontmatterCount >= 2 && line.trim()) {
        // First non-empty line after frontmatter
        return line.trim().replace(/^#+\s*/, '').substring(0, 50);
      }
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Get all personalities from directory
 */
function getPersonalities(personalitiesDir, currentPersonality) {
  const personalities = [];

  if (!fs.existsSync(personalitiesDir)) {
    return personalities;
  }

  const files = fs.readdirSync(personalitiesDir);
  for (const file of files) {
    if (file.endsWith('.md')) {
      const name = path.basename(file, '.md');
      const filePath = path.join(personalitiesDir, file);
      const description = getPersonalityDescription(filePath);

      personalities.push({
        name,
        description,
        current: name === currentPersonality
      });
    }
  }

  // Add special 'random' option
  personalities.push({
    name: 'random',
    description: 'Picks randomly each time',
    current: currentPersonality === 'random'
  });

  return personalities.sort((a, b) => {
    // Keep 'random' at the end
    if (a.name === 'random') return 1;
    if (b.name === 'random') return -1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const personalitiesDir = args[0] || path.join(os.homedir(), '.claude', 'personalities');
  const currentPersonality = args[1] || 'normal';

  const personalities = getPersonalities(personalitiesDir, currentPersonality);

  // Display with boxen
  const output = formatPersonalitiesList(personalities, {
    columns: 2,
    showUsage: true
  });

  console.log(output);
}

main();
