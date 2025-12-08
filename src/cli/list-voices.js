#!/usr/bin/env node
/**
 * Voice List Display - Beautiful multi-column voice listing
 * Called by voice-manager.sh to display voices with boxen formatting
 */

import { formatVoicesList } from '../utils/list-formatter.js';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import os from 'os';

/**
 * Get Piper voices from voice directory
 */
function getPiperVoices(voiceDir, currentVoice) {
  const voices = [];

  if (!fs.existsSync(voiceDir)) {
    return voices;
  }

  const files = fs.readdirSync(voiceDir);
  for (const file of files) {
    if (file.endsWith('.onnx')) {
      const voiceName = path.basename(file, '.onnx');
      voices.push({
        name: voiceName,
        lang: extractLanguage(voiceName),
        current: voiceName === currentVoice
      });
    }
  }

  return voices.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get macOS voices using say -v ?
 */
function getMacOSVoices(currentVoice) {
  const voices = [];

  if (os.platform() !== 'darwin') {
    return voices;
  }

  try {
    const output = execFileSync('say', ['-v', '?'], { encoding: 'utf8' });
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const voiceName = parts[0];
        const lang = parts[1];

        voices.push({
          name: voiceName,
          lang,
          current: voiceName === currentVoice
        });
      }
    }
  } catch (error) {
    // say command failed
  }

  return voices;
}

/**
 * Extract language code from voice name
 */
function extractLanguage(voiceName) {
  const match = voiceName.match(/^([a-z]{2}_[A-Z]{2})/);
  return match ? match[1] : '';
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const provider = args[0] || 'piper';
  const currentVoice = args[1] || '';
  const voiceDir = args[2] || '';

  let voices = [];
  let providerName = 'Piper TTS';

  if (provider === 'piper') {
    voices = getPiperVoices(voiceDir, currentVoice);
    providerName = 'Piper TTS';
  } else if (provider === 'macos') {
    voices = getMacOSVoices(currentVoice);
    providerName = 'macOS TTS';
  }

  // Display with boxen
  const output = formatVoicesList(voices, {
    provider: providerName,
    columns: 2,
    showUsage: true
  });

  console.log(output);
}

main();
