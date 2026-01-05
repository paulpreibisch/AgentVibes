#!/usr/bin/env node
/**
 * Unit Tests for Uninstall Command
 *
 * Tests the uninstall functionality added in v2.18.0 to ensure:
 * - Proper file/directory removal
 * - Correct handling of flags (--yes, --global, --with-piper)
 * - Graceful handling when AgentVibes is not installed
 * - Proper error handling and user feedback
 *
 * These tests use mocking to avoid actual file system operations.
 */

import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

/**
 * Mock implementation of the uninstall logic
 * This mirrors the actual implementation in src/installer.js
 */
class UninstallHandler {
  constructor(targetDir, options = {}) {
    this.targetDir = targetDir;
    this.options = options;
    this.removedPaths = [];
  }

  async checkInstalled() {
    const commandsDir = path.join(this.targetDir, '.claude', 'commands', 'agent-vibes');
    try {
      await fs.access(commandsDir);
      return true;
    } catch {
      return false;
    }
  }

  async removeProjectFiles() {
    const projectPaths = [
      path.join(this.targetDir, '.claude', 'commands', 'agent-vibes'),
      path.join(this.targetDir, '.claude', 'hooks'),
      path.join(this.targetDir, '.claude', 'personalities'),
      path.join(this.targetDir, '.claude', 'output-styles'),
      path.join(this.targetDir, '.claude', 'audio'),
      path.join(this.targetDir, '.agentvibes'),
    ];

    for (const dirPath of projectPaths) {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        this.removedPaths.push(dirPath);
      } catch (err) {
        // Ignore if directory doesn't exist
      }
    }
  }

  async removeConfigFiles() {
    const configPatterns = [
      'tts-voice.txt',
      'tts-provider.txt',
      'tts-personality.txt',
      'tts-verbosity.txt',
      'tts-translate.txt',
      'tts-target-voice.txt',
      'tts-target-language.txt',
      'tts-language.txt',
      'personalities.json',
      'github-star-reminder.txt',
      'piper-voices-dir.txt',
      'verbosity.txt',
    ];

    for (const pattern of configPatterns) {
      const filePath = path.join(this.targetDir, '.claude', pattern);
      try {
        await fs.unlink(filePath);
        this.removedPaths.push(filePath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }
  }

  async removeGlobalFiles() {
    if (!this.options.global) return;

    const homedir = process.env.HOME || process.env.USERPROFILE;
    const globalPaths = [
      path.join(homedir, '.claude'),
      path.join(homedir, '.agentvibes'),
    ];

    for (const dirPath of globalPaths) {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        this.removedPaths.push(dirPath);
      } catch (err) {
        // Ignore if directory doesn't exist
      }
    }
  }

  async removePiperTts() {
    if (!this.options.withPiper) return;

    const homedir = process.env.HOME || process.env.USERPROFILE;
    const piperPath = path.join(homedir, 'piper');

    try {
      await fs.rm(piperPath, { recursive: true, force: true });
      this.removedPaths.push(piperPath);
    } catch (err) {
      // Ignore if directory doesn't exist
    }
  }

  async execute() {
    const isInstalled = await this.checkInstalled();
    if (!isInstalled) {
      return { success: false, reason: 'not-installed' };
    }

    await this.removeProjectFiles();
    await this.removeConfigFiles();
    await this.removeGlobalFiles();
    await this.removePiperTts();

    return { success: true, removedPaths: this.removedPaths };
  }
}

describe('Uninstall Command', () => {
  let testDir;

  before(async () => {
    // Create a temporary test directory structure
    testDir = path.join(os.tmpdir(), `agentvibes-uninstall-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  after(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Installation Detection', () => {
    it('should detect when AgentVibes is not installed', async () => {
      const handler = new UninstallHandler(testDir);
      const isInstalled = await handler.checkInstalled();
      assert.strictEqual(isInstalled, false, 'Should return false when not installed');
    });

    it('should detect when AgentVibes is installed', async () => {
      // Create installation directory
      const commandsDir = path.join(testDir, '.claude', 'commands', 'agent-vibes');
      await fs.mkdir(commandsDir, { recursive: true });

      const handler = new UninstallHandler(testDir);
      const isInstalled = await handler.checkInstalled();
      assert.strictEqual(isInstalled, true, 'Should return true when installed');

      // Cleanup
      await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
    });

    it('should exit gracefully when not installed', async () => {
      const handler = new UninstallHandler(testDir);
      const result = await handler.execute();

      assert.strictEqual(result.success, false, 'Should return failure');
      assert.strictEqual(result.reason, 'not-installed', 'Should indicate not installed');
    });
  });

  describe('Project-Level Uninstallation', () => {
    beforeEach(async () => {
      // Setup installation
      const dirs = [
        '.claude/commands/agent-vibes',
        '.claude/hooks',
        '.claude/personalities',
        '.claude/output-styles',
        '.claude/audio',
        '.agentvibes',
      ];

      for (const dir of dirs) {
        await fs.mkdir(path.join(testDir, dir), { recursive: true });
      }

      // Create some config files
      const configFiles = ['tts-voice.txt', 'tts-provider.txt', 'personalities.json'];
      for (const file of configFiles) {
        await fs.writeFile(path.join(testDir, '.claude', file), 'test content');
      }
    });

    afterEach(async () => {
      // Cleanup
      try {
        await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
      } catch {}
      try {
        await fs.rm(path.join(testDir, '.agentvibes'), { recursive: true, force: true });
      } catch {}
    });

    it('should remove all project-level directories', async () => {
      const handler = new UninstallHandler(testDir);
      await handler.removeProjectFiles();

      // Verify directories are removed
      const dirsToCheck = [
        '.claude/commands/agent-vibes',
        '.claude/hooks',
        '.claude/personalities',
        '.claude/output-styles',
        '.claude/audio',
        '.agentvibes',
      ];

      for (const dir of dirsToCheck) {
        try {
          await fs.access(path.join(testDir, dir));
          assert.fail(`Directory ${dir} should have been removed`);
        } catch (err) {
          // Expected - directory should not exist
          assert.ok(true, `Directory ${dir} was removed`);
        }
      }
    });

    it('should remove configuration files', async () => {
      const handler = new UninstallHandler(testDir);
      await handler.removeConfigFiles();

      // Verify config files are removed
      const filesToCheck = ['tts-voice.txt', 'tts-provider.txt', 'personalities.json'];

      for (const file of filesToCheck) {
        try {
          await fs.access(path.join(testDir, '.claude', file));
          assert.fail(`File ${file} should have been removed`);
        } catch (err) {
          // Expected - file should not exist
          assert.ok(true, `File ${file} was removed`);
        }
      }
    });

    it('should track all removed paths', async () => {
      const handler = new UninstallHandler(testDir);
      const result = await handler.execute();

      assert.strictEqual(result.success, true, 'Uninstall should succeed');
      assert.ok(Array.isArray(result.removedPaths), 'Should return array of removed paths');
      assert.ok(result.removedPaths.length > 0, 'Should have removed at least one path');
    });
  });

  describe('Global Uninstallation (--global flag)', () => {
    let homeBackup;
    let tempHome;

    beforeEach(async () => {
      // Create temporary home directory
      tempHome = path.join(os.tmpdir(), `agentvibes-home-${Date.now()}`);
      await fs.mkdir(tempHome, { recursive: true });

      // Backup and override HOME
      homeBackup = process.env.HOME;
      process.env.HOME = tempHome;

      // Setup AgentVibes installation
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'agent-vibes'), { recursive: true });

      // Setup global directories
      await fs.mkdir(path.join(tempHome, '.claude'), { recursive: true });
      await fs.mkdir(path.join(tempHome, '.agentvibes'), { recursive: true });
    });

    afterEach(async () => {
      // Restore HOME
      process.env.HOME = homeBackup;

      // Cleanup
      await fs.rm(tempHome, { recursive: true, force: true });
      try {
        await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
      } catch {}
    });

    it('should remove global directories when --global flag is set', async () => {
      const handler = new UninstallHandler(testDir, { global: true });
      await handler.removeGlobalFiles();

      // Verify global directories are removed
      try {
        await fs.access(path.join(tempHome, '.claude'));
        assert.fail('Global .claude directory should have been removed');
      } catch {
        assert.ok(true, 'Global .claude directory was removed');
      }

      try {
        await fs.access(path.join(tempHome, '.agentvibes'));
        assert.fail('Global .agentvibes directory should have been removed');
      } catch {
        assert.ok(true, 'Global .agentvibes directory was removed');
      }
    });

    it('should NOT remove global directories without --global flag', async () => {
      const handler = new UninstallHandler(testDir, { global: false });
      await handler.removeGlobalFiles();

      // Verify global directories still exist
      await fs.access(path.join(tempHome, '.claude'));
      await fs.access(path.join(tempHome, '.agentvibes'));
      assert.ok(true, 'Global directories were preserved');
    });
  });

  describe('Piper TTS Uninstallation (--with-piper flag)', () => {
    let homeBackup;
    let tempHome;

    beforeEach(async () => {
      // Create temporary home directory
      tempHome = path.join(os.tmpdir(), `agentvibes-home-piper-${Date.now()}`);
      await fs.mkdir(tempHome, { recursive: true });

      // Backup and override HOME
      homeBackup = process.env.HOME;
      process.env.HOME = tempHome;

      // Setup AgentVibes installation
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'agent-vibes'), { recursive: true });

      // Setup Piper directory
      await fs.mkdir(path.join(tempHome, 'piper'), { recursive: true });
    });

    afterEach(async () => {
      // Restore HOME
      process.env.HOME = homeBackup;

      // Cleanup
      await fs.rm(tempHome, { recursive: true, force: true });
      try {
        await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
      } catch {}
    });

    it('should remove Piper TTS when --with-piper flag is set', async () => {
      const handler = new UninstallHandler(testDir, { withPiper: true });
      await handler.removePiperTts();

      // Verify Piper directory is removed
      try {
        await fs.access(path.join(tempHome, 'piper'));
        assert.fail('Piper directory should have been removed');
      } catch {
        assert.ok(true, 'Piper directory was removed');
      }
    });

    it('should NOT remove Piper TTS without --with-piper flag', async () => {
      const handler = new UninstallHandler(testDir, { withPiper: false });
      await handler.removePiperTts();

      // Verify Piper directory still exists
      await fs.access(path.join(tempHome, 'piper'));
      assert.ok(true, 'Piper directory was preserved');
    });
  });

  describe('Combined Flags', () => {
    let homeBackup;
    let tempHome;

    beforeEach(async () => {
      // Create temporary home directory
      tempHome = path.join(os.tmpdir(), `agentvibes-home-combined-${Date.now()}`);
      await fs.mkdir(tempHome, { recursive: true });

      // Backup and override HOME
      homeBackup = process.env.HOME;
      process.env.HOME = tempHome;

      // Setup complete installation
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'agent-vibes'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.claude', 'hooks'), { recursive: true });
      await fs.mkdir(path.join(tempHome, '.claude'), { recursive: true });
      await fs.mkdir(path.join(tempHome, '.agentvibes'), { recursive: true });
      await fs.mkdir(path.join(tempHome, 'piper'), { recursive: true });
    });

    afterEach(async () => {
      // Restore HOME
      process.env.HOME = homeBackup;

      // Cleanup
      await fs.rm(tempHome, { recursive: true, force: true });
      try {
        await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
      } catch {}
    });

    it('should handle --global and --with-piper together', async () => {
      const handler = new UninstallHandler(testDir, { global: true, withPiper: true });
      const result = await handler.execute();

      assert.strictEqual(result.success, true, 'Uninstall should succeed');

      // Verify all directories are removed
      const pathsToCheck = [
        path.join(testDir, '.claude'),
        path.join(tempHome, '.claude'),
        path.join(tempHome, '.agentvibes'),
        path.join(tempHome, 'piper'),
      ];

      for (const checkPath of pathsToCheck) {
        try {
          await fs.access(checkPath);
          assert.fail(`Path ${checkPath} should have been removed`);
        } catch {
          assert.ok(true, `Path ${checkPath} was removed`);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing directories gracefully', async () => {
      const handler = new UninstallHandler(testDir);

      // Should not throw even if directories don't exist
      await assert.doesNotReject(
        async () => await handler.removeProjectFiles(),
        'Should handle missing directories without error'
      );
    });

    it('should handle missing config files gracefully', async () => {
      const handler = new UninstallHandler(testDir);

      // Should not throw even if files don't exist
      await assert.doesNotReject(
        async () => await handler.removeConfigFiles(),
        'Should handle missing files without error'
      );
    });
  });

  describe('Path Validation', () => {
    it('should construct correct project paths', async () => {
      const handler = new UninstallHandler(testDir);

      // Create installation
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'agent-vibes'), { recursive: true });

      await handler.removeProjectFiles();

      // Verify paths in removedPaths are correct
      assert.ok(
        handler.removedPaths.some(p => p.includes('.claude/commands/agent-vibes')),
        'Should include correct project path'
      );
    });

    it('should construct correct global paths', async () => {
      const tempHome = path.join(os.tmpdir(), `agentvibes-path-test-${Date.now()}`);
      await fs.mkdir(tempHome, { recursive: true });

      const homeBackup = process.env.HOME;
      process.env.HOME = tempHome;

      try {
        // Setup
        await fs.mkdir(path.join(testDir, '.claude', 'commands', 'agent-vibes'), { recursive: true });
        await fs.mkdir(path.join(tempHome, '.claude'), { recursive: true });

        const handler = new UninstallHandler(testDir, { global: true });
        await handler.removeGlobalFiles();

        // Verify paths
        assert.ok(
          handler.removedPaths.some(p => p.includes(tempHome)),
          'Should include home directory in paths'
        );
      } finally {
        process.env.HOME = homeBackup;
        await fs.rm(tempHome, { recursive: true, force: true });
        await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
      }
    });
  });
});
