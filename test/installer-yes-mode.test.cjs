#!/usr/bin/env node
/**
 * Test: --yes non-interactive installer mode
 * Verifies that the installer works in non-interactive mode with defaults
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const TEST_DIR = `/tmp/agentvibes-yes-test-${Date.now()}`;

async function runTest() {
  console.log('🧪 Testing --yes non-interactive installer mode...\n');

  try {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
    console.log(`✓ Created test directory: ${TEST_DIR}`);

    // Run installer with --yes flag
    console.log('\n🚀 Running: npx . install --yes --directory ' + TEST_DIR);

    const install = spawn('npx', ['.', 'install', '--yes', '--directory', TEST_DIR], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    let output = '';
    install.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    install.stderr.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
    });

    await new Promise((resolve, reject) => {
      install.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Installer exited with code ${code}`));
        }
      });

      install.on('error', reject);

      // Timeout after 60 seconds
      setTimeout(() => {
        install.kill();
        reject(new Error('Installer timeout after 60s'));
      }, 60000);
    });

    console.log('\n✓ Installer completed successfully');

    // Verify save-audio config was created with default value
    const saveAudioFile = path.join(TEST_DIR, '.agentvibes', 'config', 'save-audio.txt');
    const saveAudioValue = await fs.readFile(saveAudioFile, 'utf8');

    if (saveAudioValue.trim() === 'false') {
      console.log('✅ Test PASSED: save-audio.txt created with default value "false"');
    } else {
      throw new Error(`save-audio.txt has wrong value: "${saveAudioValue.trim()}" (expected "false")`);
    }

    // Verify other config files
    const checks = [
      { file: '.claude/tts-provider.txt', expected: process.platform === 'darwin' ? 'macos' : 'piper' },
      { file: '.claude/piper-voices-dir.txt', expected: (content) => content.includes('.claude/piper-voices') },
      { file: '.claude/tts-voice.txt', expected: (content) => content.length > 0 },
      { file: '.agentvibes/config/mode.txt', expected: 'full' }
    ];

    for (const check of checks) {
      const filePath = path.join(TEST_DIR, check.file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const contentTrimmed = content.trim();

        if (typeof check.expected === 'function') {
          if (check.expected(contentTrimmed)) {
            console.log(`✓ ${check.file}: OK`);
          } else {
            throw new Error(`${check.file}: validation failed`);
          }
        } else if (contentTrimmed === check.expected) {
          console.log(`✓ ${check.file}: ${contentTrimmed}`);
        } else {
          throw new Error(`${check.file}: expected "${check.expected}", got "${contentTrimmed}"`);
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          throw new Error(`${check.file}: file not created`);
        }
        throw err;
      }
    }

    console.log('\n✅ All tests PASSED');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      console.log(`\n✓ Cleaned up test directory`);
    } catch (err) {
      console.error('Warning: Could not clean up test directory:', err.message);
    }
  }
}

runTest();
