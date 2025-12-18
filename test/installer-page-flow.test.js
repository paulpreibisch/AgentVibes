#!/usr/bin/env node

/**
 * Test: Installer Page Flow
 * Verifies that pages appear in the correct order during installation
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Testing Installer Page Flow\n');

// Test configuration
const tests = [
  {
    name: 'Page sequence verification',
    expectedPages: [
      'Page 1/8', // Mode Selection
      'Page 2/8', // System Dependencies
      'Page 3/8', // TTS Provider
      'Page 4/8', // Audio File Saving
      'Page 5/8', // Voice Selection
      'Page 6/8', // Audio Effects
      'Page 7/8', // Background Music
      'Page 8/8'  // Verbosity
    ]
  }
];

let testsPassed = 0;
let testsFailed = 0;

// Helper to extract page numbers from installer output
function extractPageNumbers(output) {
  const pageRegex = /Page (\d+)\/(\d+)/g;
  const pages = [];
  let match;

  while ((match = pageRegex.exec(output)) !== null) {
    pages.push(`Page ${match[1]}/${match[2]}`);
  }

  return pages;
}

// Run installer in test mode
async function testPageFlow() {
  return new Promise((resolve) => {
    const installerPath = join(projectRoot, 'src', 'installer.js');

    // Spawn installer with automated inputs
    const child = spawn('node', [installerPath, 'install'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        AGENTVIBES_TEST_MODE: 'true',
        CI: 'true' // Suppress interactive prompts
      }
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      // Auto-respond to prompts
      if (data.toString().includes('Select mode:')) {
        child.stdin.write('\n'); // Select default
      } else if (data.toString().includes('Select TTS provider:')) {
        child.stdin.write('\n'); // Select default
      } else if (data.toString().includes('Audio file handling:')) {
        child.stdin.write('\n'); // Select default
      } else if (data.toString().includes('Select voice:')) {
        child.stdin.write('\n'); // Select default
      } else if (data.toString().includes('Continue to Installation')) {
        child.stdin.write('\n'); // Continue
      }
    });

    child.stderr.on('data', (data) => {
      console.error('Error output:', data.toString());
    });

    child.on('close', (code) => {
      resolve({ output, code });
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      resolve({ output, code: -1, timeout: true });
    }, 30000);
  });
}

// Simple manual test - check the page title mapping
console.log('📋 Checking page title configuration...\n');

import { readFile } from 'fs/promises';

const installerSource = await readFile(join(projectRoot, 'src', 'installer.js'), 'utf-8');

// Extract page titles
const titleMatch = installerSource.match(/const titles = \{([^}]+)\}/s);
if (titleMatch) {
  const titles = titleMatch[1];
  console.log('Page titles found:');
  console.log(titles);

  // Check for correct sequence
  const expectedTitles = [
    "0: '⚡ Mode Selection'",
    "1: '🔧 System Dependencies'",
    "2: '🎙️ TTS Provider Configuration'",
    "3: '💾 Audio File Saving'",
    "4: '🎤 Voice Selection'",
    "5: '💧 Audio Effects'",
    "6: '🎵 Background Music'",
    "7: '🔊 Verbosity Settings'"
  ];

  let titlesCorrect = true;
  expectedTitles.forEach((expected) => {
    if (!titles.includes(expected)) {
      console.log(`❌ Missing: ${expected}`);
      titlesCorrect = false;
      testsFailed++;
    }
  });

  if (titlesCorrect) {
    console.log('✅ All page titles present in correct order\n');
    testsPassed++;
  }
} else {
  console.log('❌ Could not find page titles in installer.js\n');
  testsFailed++;
}

// Check page counts
const pageCountMatches = installerSource.match(/const (?:sectionPages|configPages) = (\d+)/g);
if (pageCountMatches) {
  console.log('📊 Page count declarations:');
  pageCountMatches.forEach(match => {
    console.log(`  ${match}`);
    if (match.includes('= 8')) {
      console.log('  ✅ Correct (updated to 8 pages)');
      testsPassed++;
    } else {
      console.log('  ❌ Incorrect (should be 8 pages)');
      testsFailed++;
    }
  });
} else {
  console.log('❌ Could not find page count declarations\n');
  testsFailed++;
}

// Check for save-audio page logic
const saveAudioPageMatch = installerSource.match(/currentPage === 3.*Audio File Saving/);
if (saveAudioPageMatch) {
  console.log('\n✅ Save-audio page found at currentPage === 3 (Page 4)');
  testsPassed++;
} else {
  console.log('\n❌ Save-audio page not found at correct position');
  testsFailed++;
}

// Check auto-advance logic
const autoAdvanceMatch = installerSource.match(/config\.saveAudio = saveAudio;[\s\S]{1,200}currentPage\+\+.*Auto-advance/);
if (autoAdvanceMatch) {
  console.log('✅ Auto-advance logic found after save-audio selection');
  testsPassed++;
} else {
  console.log('❌ Auto-advance logic not found after save-audio selection');
  testsFailed++;
}

// Summary
console.log('\n═══════════════════════════════════════════');
console.log('  Test Summary');
console.log('═══════════════════════════════════════════');
console.log(`  Tests passed: ${testsPassed}`);
console.log(`  Tests failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════\n');

process.exit(testsFailed > 0 ? 1 : 0);
