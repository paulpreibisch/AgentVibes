#!/usr/bin/env node
/**
 * Unit tests for src/utils/dependency-checker.js
 * Tests dependency detection and platform-specific command generation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  checkDependencies,
  getInstallCommands,
  displayMissingDependencies,
  checkAndDisplay
} from '../../src/utils/dependency-checker.js';

describe('Dependency Checker', () => {
  describe('checkDependencies', () => {
    it('should return results object with expected structure', () => {
      const results = checkDependencies();

      assert.ok(results.core, 'Should have core dependencies');
      assert.ok(results.optional, 'Should have optional dependencies');
      assert.ok(results.missing, 'Should have missing dependencies object');
      assert.ok(Array.isArray(results.warnings), 'Should have warnings array');
    });

    it('should check Node.js version', () => {
      const results = checkDependencies();

      assert.ok(results.core.node, 'Should check Node.js');
      assert.strictEqual(results.core.node.installed, true);
      assert.ok(results.core.node.version, 'Should detect Node version');
      assert.strictEqual(typeof results.core.node.isCompatible, 'boolean');
    });

    it('should check Python version', () => {
      const results = checkDependencies();

      assert.ok(results.core.python, 'Should check Python');
      assert.strictEqual(typeof results.core.python.installed, 'boolean');
    });

    it('should check optional tools', () => {
      const results = checkDependencies();

      assert.strictEqual(typeof results.optional.sox, 'boolean');
      assert.strictEqual(typeof results.optional.ffmpeg, 'boolean');
      assert.strictEqual(typeof results.optional.pipx, 'boolean');
      assert.strictEqual(typeof results.optional.flock, 'boolean');
      assert.strictEqual(typeof results.optional.curl, 'boolean');
      assert.strictEqual(typeof results.optional.bc, 'boolean');
    });

    it('should detect if Node.js is compatible (>=16)', () => {
      const results = checkDependencies();
      const nodeVersion = process.version.match(/v(\d+)/);
      const majorVersion = parseInt(nodeVersion[1]);

      assert.strictEqual(
        results.core.node.isCompatible,
        majorVersion >= 16,
        'Node compatibility should match actual version'
      );
    });
  });

  describe('getInstallCommands', () => {
    it('should generate macOS commands for missing dependencies', () => {
      const missing = { sox: true, ffmpeg: true, bash: true };
      const commands = getInstallCommands(missing, 'darwin');

      assert.ok(Array.isArray(commands));
      assert.ok(commands.length > 0);
      assert.ok(commands.some(cmd => cmd.label.includes('macOS')));
      assert.ok(commands.some(cmd => cmd.command.includes('brew install')));
    });

    it('should generate Linux commands for missing dependencies', () => {
      const missing = { sox: true, pipx: true };
      const commands = getInstallCommands(missing, 'linux');

      assert.ok(Array.isArray(commands));
      assert.ok(commands.length > 0);
      assert.ok(commands.some(cmd =>
        cmd.label === 'Ubuntu/Debian' ||
        cmd.label === 'Fedora/RHEL' ||
        cmd.label === 'Arch Linux'
      ));
    });

    it('should handle empty missing dependencies', () => {
      const missing = {};
      const commands = getInstallCommands(missing, 'darwin');

      assert.ok(Array.isArray(commands));
      // Should return empty or minimal commands
    });

    it('should generate Windows WSL commands', () => {
      const missing = { sox: true };
      const commands = getInstallCommands(missing, 'win32');

      assert.ok(Array.isArray(commands));
      assert.ok(commands.some(cmd => cmd.command.includes('wsl')));
    });

    it('should include curl in Linux package lists', () => {
      const missing = { curl: true };
      const commands = getInstallCommands(missing, 'linux');

      const aptCommand = commands.find(cmd => cmd.label === 'Ubuntu/Debian');
      assert.ok(aptCommand);
      assert.ok(aptCommand.command.includes('curl'));
    });

    it('should include bc in macOS package lists', () => {
      const missing = { bc: true };
      const commands = getInstallCommands(missing, 'darwin');

      assert.ok(commands.length > 0);
      const brewCommand = commands.find(cmd => cmd.label.includes('macOS'));
      assert.ok(brewCommand);
      assert.ok(brewCommand.command.includes('bc'));
    });

    it('should include flock in Linux package lists', () => {
      const missing = { flock: true };
      const commands = getInstallCommands(missing, 'linux');

      const aptCommand = commands.find(cmd => cmd.label === 'Ubuntu/Debian');
      assert.ok(aptCommand);
      assert.ok(aptCommand.command.includes('util-linux'));
    });
  });

  describe('displayMissingDependencies', () => {
    it('should return false when no dependencies are missing', () => {
      const results = {
        core: {},
        optional: {},
        missing: {},
        warnings: []
      };

      const hasMissing = displayMissingDependencies(results);
      assert.strictEqual(hasMissing, false);
    });

    it('should return true when dependencies are missing', () => {
      const results = {
        core: {
          node: { installed: false, version: null, isCompatible: false }
        },
        optional: {},
        missing: { node: true },
        warnings: ['Node.js not found']
      };

      const hasMissing = displayMissingDependencies(results);
      assert.strictEqual(hasMissing, true);
    });

    it('should handle optional dependencies missing', () => {
      const results = {
        core: {
          node: { installed: true, version: '18.0.0', isCompatible: true }
        },
        optional: {},
        missing: { sox: true, ffmpeg: true },
        warnings: []
      };

      const hasMissing = displayMissingDependencies(results);
      assert.strictEqual(hasMissing, true);
    });
  });

  describe('checkAndDisplay', () => {
    it('should run check and display in one call', () => {
      // This should not throw
      const result = checkAndDisplay();
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  describe('Dependency detection logic', () => {
    it('should mark Node as compatible for version 16+', () => {
      const results = checkDependencies();

      // Current Node version should be compatible (we're running in Node 18+)
      if (results.core.node.installed) {
        const version = parseInt(results.core.node.version.split('.')[0]);
        assert.strictEqual(
          results.core.node.isCompatible,
          version >= 16
        );
      }
    });

    it('should include all required fields in results', () => {
      const results = checkDependencies();

      // Core checks
      assert.ok('node' in results.core);
      assert.ok('python' in results.core);

      // Optional checks
      assert.ok('sox' in results.optional);
      assert.ok('ffmpeg' in results.optional);
      assert.ok('pipx' in results.optional);
      assert.ok('flock' in results.optional);
      assert.ok('curl' in results.optional);
      assert.ok('bc' in results.optional);

      // Structure
      assert.ok('missing' in results);
      assert.ok('warnings' in results);
    });
  });

  describe('Platform-specific behavior', () => {
    it('should check bash version on macOS', () => {
      const results = checkDependencies();

      if (process.platform === 'darwin') {
        assert.ok('bash' in results.core);
        assert.ok(results.core.bash.installed !== undefined);
      }
    });

    it('should check audio players on Linux', () => {
      const results = checkDependencies();

      if (process.platform === 'linux' || process.env.WSL_DISTRO_NAME) {
        assert.ok('audioPlayer' in results.optional);
      }
    });
  });
});
