#!/usr/bin/env node

/**
 * File: src/commands/bmad-voices.js
 *
 * AgentVibes - BMAD Voice Management Commands
 *
 * Provides CLI commands for managing BMAD agent voice assignments.
 * These commands make it easy to preview, list, and assign voices
 * without manually editing CSV files.
 *
 * Co-created by Paul Preibisch with Claude AI
 * Copyright (c) 2025 Paul Preibisch
 * Licensed under the Apache License, Version 2.0
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import chalk from 'chalk';

// Default BMAD agent voice assignments
const DEFAULT_VOICE_ASSIGNMENTS = [
  { agent_id: 'pm', voice_name: 'en_US-ryan-high', description: 'Professional male' },
  { agent_id: 'architect', voice_name: 'en_US-danny-low', description: 'Deep male' },
  { agent_id: 'dev', voice_name: 'en_US-joe-medium', description: 'Casual male' },
  { agent_id: 'analyst', voice_name: 'en_US-amy-medium', description: 'Articulate female' },
  { agent_id: 'ux-designer', voice_name: 'en_US-kristin-medium', description: 'Warm female' },
  { agent_id: 'tea', voice_name: 'en_US-lessac-medium', description: 'Balanced neutral' },
  { agent_id: 'sm', voice_name: 'en_US-bryce-medium', description: 'Energetic male' },
  { agent_id: 'tech-writer', voice_name: 'en_US-kathleen-low', description: 'Clear female' },
  { agent_id: 'frame-expert', voice_name: 'en_US-kusal-medium', description: 'Precise male' },
  { agent_id: 'bmad-master', voice_name: 'en_US-libritts_r-high', description: 'Rich commanding' },
];

// All available Piper voices with descriptions
const PIPER_VOICES = {
  'en_US-ryan-high': 'Professional, clear male voice',
  'en_US-danny-low': 'Deep, authoritative male voice',
  'en_US-joe-medium': 'Casual, friendly male voice',
  'en_US-amy-medium': 'Articulate female voice',
  'en_US-kristin-medium': 'Warm, professional female voice',
  'en_US-lessac-medium': 'Balanced, neutral voice',
  'en_US-bryce-medium': 'Energetic male voice',
  'en_US-kathleen-low': 'Clear, measured female voice',
  'en_US-kusal-medium': 'Precise male voice',
  'en_US-libritts_r-high': 'Rich, commanding voice',
  'en_US-hfc_female-medium': 'Clear female voice',
  'en_US-hfc_male-medium': 'Clear male voice',
  'en_US-arctic-medium': 'Crisp, neutral voice',
};

/**
 * Get the working directory (handles npx context)
 */
function getWorkingDirectory() {
  return process.env.INIT_CWD || process.cwd();
}

/**
 * Check if BMAD is installed
 */
async function isBmadInstalled() {
  const targetDir = getWorkingDirectory();
  const bmadPath = path.join(targetDir, '.bmad');

  try {
    await fs.access(bmadPath);
    return true;
  } catch {
    // Try legacy location
    const legacyPath = path.join(targetDir, 'bmad');
    try {
      await fs.access(legacyPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get BMAD folder path (.bmad or bmad)
 */
async function getBmadPath() {
  const targetDir = getWorkingDirectory();
  const modernPath = path.join(targetDir, '.bmad');
  const legacyPath = path.join(targetDir, 'bmad');

  try {
    await fs.access(modernPath);
    return modernPath;
  } catch {
    try {
      await fs.access(legacyPath);
      return legacyPath;
    } catch {
      return null;
    }
  }
}

/**
 * Read BMAD agent voice assignments
 */
async function readVoiceAssignments() {
  const bmadPath = await getBmadPath();
  if (!bmadPath) {
    return null;
  }

  const csvPath = path.join(bmadPath, '_cfg', 'agent-voice-map.csv');

  try {
    const content = await fs.readFile(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const assignments = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const [agent_id, voice_name] = lines[i].split(',');
      if (agent_id && voice_name) {
        assignments.push({ agent_id, voice_name });
      }
    }

    return assignments;
  } catch {
    return null;
  }
}

/**
 * Write BMAD agent voice assignments
 */
async function writeVoiceAssignments(assignments) {
  const bmadPath = await getBmadPath();
  if (!bmadPath) {
    throw new Error('BMAD not found');
  }

  const cfgDir = path.join(bmadPath, '_cfg');
  const csvPath = path.join(cfgDir, 'agent-voice-map.csv');

  // Ensure directory exists
  await fs.mkdir(cfgDir, { recursive: true });

  // Build CSV content
  const lines = ['agent_id,voice_name'];
  for (const { agent_id, voice_name } of assignments) {
    lines.push(`${agent_id},${voice_name}`);
  }

  await fs.writeFile(csvPath, lines.join('\n') + '\n', 'utf8');
}

/**
 * Find matching voice name using fuzzy matching
 * Supports partial matches like "ryan" → "en_US-ryan-high"
 */
function findVoiceMatch(input) {
  const lowerInput = input.toLowerCase();

  // Exact match
  if (PIPER_VOICES[input]) {
    return input;
  }

  // Find voices containing the input string
  const matches = Object.keys(PIPER_VOICES).filter(voice =>
    voice.toLowerCase().includes(lowerInput)
  );

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    // Return the shortest match (most specific)
    // Initial value prevents TypeError if array were empty
    return matches.reduce((a, b) => (a.length <= b.length ? a : b), matches[0]);
  }

  return null;
}

/**
 * Command: preview-voice <voice-name>
 * Preview a voice with sample text
 */
export async function previewVoice(voiceName, options = {}) {
  const text = options.text || 'Hello! This is a voice preview for AgentVibes.';

  // Try fuzzy matching
  const matchedVoice = findVoiceMatch(voiceName);

  if (!matchedVoice) {
    console.error(chalk.red(`\n❌ Voice "${voiceName}" not found.`));
    console.error(chalk.gray('   View available voices: npx agentvibes list-available-voices\n'));
    process.exit(1);
  }

  if (matchedVoice !== voiceName) {
    console.log(chalk.yellow(`\n💡 Matched "${voiceName}" to "${matchedVoice}"\n`));
  }

  console.log(chalk.cyan(`🔊 Previewing voice: ${matchedVoice}\n`));
  console.log(chalk.gray(`   Text: "${text}"\n`));

  const targetDir = getWorkingDirectory();
  const playTtsPath = path.join(targetDir, '.claude', 'hooks', 'play-tts.sh');

  try {
    await fs.access(playTtsPath);
  } catch {
    console.error(chalk.red('❌ AgentVibes not installed in this directory.'));
    console.error(chalk.gray('   Run: npx agentvibes install\n'));
    process.exit(1);
  }

  try {
    // Security: Use execFileSync with array args to prevent command injection
    execFileSync('bash', [playTtsPath, text, matchedVoice], {
      stdio: 'inherit',
      cwd: targetDir,
    });
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to play voice preview'));
    console.error(chalk.gray(`   Voice: ${matchedVoice}`));
    console.error(chalk.gray(`   Error: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Command: list-available-voices
 * Show all available voices grouped by provider
 */
export async function listAvailableVoices() {
  console.log(chalk.cyan('\n📋 Available Voices:\n'));

  console.log(chalk.white.bold('Piper TTS Voices (Free):'));
  console.log(chalk.gray('─'.repeat(60)));

  for (const [voice, description] of Object.entries(PIPER_VOICES)) {
    console.log(chalk.cyan(`  ${voice.padEnd(30)}`) + chalk.gray(description));
  }

  console.log('');
  console.log(chalk.gray('💡 Tip: Preview voices with:'));
  console.log(chalk.white('   npx agentvibes preview-voice <voice-name>'));
  console.log('');
}

/**
 * Command: list-bmad-assigned-voices
 * Show all BMAD agents with their current voice assignments
 */
export async function listBmadAssignedVoices() {
  if (!(await isBmadInstalled())) {
    console.error(chalk.red('\n❌ BMAD not found in this directory.'));
    console.error(chalk.gray('   Install BMAD first: npx bmad install\n'));
    process.exit(1);
  }

  const assignments = await readVoiceAssignments();

  if (!assignments || assignments.length === 0) {
    console.error(chalk.yellow('\n⚠️  No voice assignments found.'));
    console.error(chalk.gray('   Create assignments with: npx agentvibes reset-bmad-voices\n'));
    process.exit(1);
  }

  console.log(chalk.cyan('\n🎙️ BMAD Agent Voice Assignments:\n'));
  console.log(chalk.gray('─'.repeat(70)));

  for (const { agent_id, voice_name } of assignments) {
    const description = PIPER_VOICES[voice_name] || 'Unknown voice';
    const paddedAgent = agent_id.padEnd(20);
    console.log(
      chalk.white(`  ${paddedAgent}`) +
      chalk.cyan('→ ') +
      chalk.yellow(voice_name.padEnd(30)) +
      chalk.gray(`(${description})`)
    );
  }

  console.log('');
  console.log(chalk.gray('💡 Tip: Change assignments with:'));
  console.log(chalk.white('   npx agentvibes assign-voice <agent-id> <voice-name>'));
  console.log('');
}

/**
 * Command: assign-voice <agent-id> <voice-name>
 * Assign a voice to a specific BMAD agent
 */
export async function assignVoice(agentId, voiceName) {
  if (!(await isBmadInstalled())) {
    console.error(chalk.red('\n❌ BMAD not found in this directory.'));
    console.error(chalk.gray('   Install BMAD first: npx bmad install\n'));
    process.exit(1);
  }

  // Validate voice exists
  if (!PIPER_VOICES[voiceName]) {
    console.error(chalk.red(`\n❌ Voice "${voiceName}" not found.`));
    console.error(chalk.gray('   View available voices: npx agentvibes list-available-voices\n'));
    process.exit(1);
  }

  let assignments = await readVoiceAssignments();

  if (!assignments) {
    console.log(chalk.yellow('⚠️  No voice assignments found. Creating default assignments...\n'));
    assignments = DEFAULT_VOICE_ASSIGNMENTS.map(({ agent_id, voice_name }) => ({
      agent_id,
      voice_name,
    }));
  }

  // Find and update assignment
  const existing = assignments.find(a => a.agent_id === agentId);

  if (existing) {
    const oldVoice = existing.voice_name;
    existing.voice_name = voiceName;
    console.log(chalk.green(`\n✓ Updated ${agentId} voice assignment:`));
    console.log(chalk.gray(`   ${oldVoice} → ${voiceName}\n`));
  } else {
    assignments.push({ agent_id: agentId, voice_name: voiceName });
    console.log(chalk.green(`\n✓ Created new voice assignment for ${agentId}:`));
    console.log(chalk.gray(`   Voice: ${voiceName}\n`));
  }

  await writeVoiceAssignments(assignments);

  console.log(chalk.gray('💡 Test the voice with:'));
  console.log(chalk.white(`   npx agentvibes preview-voice ${voiceName}\n`));
}

/**
 * Command: reset-bmad-voices
 * Reset all BMAD agents to default voice assignments
 */
export async function resetBmadVoices(options = {}) {
  if (!(await isBmadInstalled())) {
    console.error(chalk.red('\n❌ BMAD not found in this directory.'));
    console.error(chalk.gray('   Install BMAD first: npx bmad install\n'));
    process.exit(1);
  }

  console.log(chalk.yellow('\n⚠️  Reset BMAD Voice Assignments\n'));
  console.log(chalk.gray('This will reset all agent voices to defaults:\n'));

  for (const { agent_id, voice_name, description } of DEFAULT_VOICE_ASSIGNMENTS) {
    console.log(chalk.gray(`   ${agent_id.padEnd(15)} → ${voice_name.padEnd(25)} (${description})`));
  }

  console.log('');

  if (!options.yes) {
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise(resolve => {
      rl.question(chalk.cyan('Continue with reset? (y/N): '), answer => {
        rl.close();
        resolve(answer);
      });
    });

    if (answer.toLowerCase() !== 'y') {
      console.log(chalk.red('\n❌ Reset cancelled.\n'));
      process.exit(0);
    }
  } else {
    console.log(chalk.green('✓ Auto-confirmed (--yes flag)\n'));
  }

  const assignments = DEFAULT_VOICE_ASSIGNMENTS.map(({ agent_id, voice_name }) => ({
    agent_id,
    voice_name,
  }));

  await writeVoiceAssignments(assignments);

  console.log(chalk.green('\n✓ Voice assignments reset to defaults!\n'));
  console.log(chalk.gray('💡 View assignments with:'));
  console.log(chalk.white('   npx agentvibes list-bmad-assigned-voices\n'));
}
