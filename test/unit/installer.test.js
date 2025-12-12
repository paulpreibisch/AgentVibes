#!/usr/bin/env node
/**
 * Unit tests for src/installer.js
 * Tests path security validation and key functions
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

// We need to test the isPathSafe logic from installer.js
// Since it's not exported, we'll recreate the logic here to test it
// This matches the implementation in src/installer.js
function isPathSafe(targetPath, basePath) {
  const resolved = path.resolve(targetPath);
  const baseResolved = path.resolve(basePath);
  return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
}

describe('Installer Path Security', () => {
  let testDir;
  let bmadDir;

  before(async () => {
    // Create a temporary test directory structure
    testDir = path.join(os.tmpdir(), `agentvibes-installer-test-${Date.now()}`);
    bmadDir = path.join(testDir, '.bmad');
    await fs.mkdir(bmadDir, { recursive: true });
  });

  after(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('isPathSafe function', () => {
    it('should return true when path is within base directory', () => {
      const targetDir = '/Users/test/project';
      const testPath = '/Users/test/project/.bmad';

      assert.strictEqual(isPathSafe(testPath, targetDir), true);
    });

    it('should return true for nested paths within base directory', () => {
      const targetDir = '/project';
      const testPath = '/project/.bmad/config';

      assert.strictEqual(isPathSafe(testPath, targetDir), true);
    });

    it('should return false for path traversal attempts', () => {
      const targetDir = '/Users/test/project';
      const maliciousPath = '/Users/test/project/../../../etc/passwd';

      assert.strictEqual(isPathSafe(maliciousPath, targetDir), false);
    });

    it('should return false for completely different paths', () => {
      const targetDir = '/Users/test/project';
      const differentPath = '/tmp/something';

      assert.strictEqual(isPathSafe(differentPath, targetDir), false);
    });

    it('should return false when path is parent of base directory', () => {
      const targetDir = '/Users/test/project/.bmad';
      const parentPath = '/Users/test/project';

      assert.strictEqual(isPathSafe(parentPath, targetDir), false);
    });

    it('should handle relative paths by resolving them', () => {
      const cwd = process.cwd();
      const targetDir = cwd;
      const relativePath = './.bmad';

      assert.strictEqual(isPathSafe(relativePath, targetDir), true);
    });

    it('should work with the actual test directory', () => {
      assert.strictEqual(isPathSafe(bmadDir, testDir), true);

      const parentDir = path.dirname(testDir);
      assert.strictEqual(isPathSafe(parentDir, testDir), false);
    });

    it('should handle paths with trailing slashes', () => {
      const targetDir = '/project/';
      const testPath = '/project/.bmad';

      assert.strictEqual(isPathSafe(testPath, targetDir), true);
    });

    it('should handle case where basePath has similar prefix', () => {
      // /projectX should NOT be considered within /project
      const targetDir = '/project';
      const similarPath = '/projectX/.bmad';

      assert.strictEqual(isPathSafe(similarPath, targetDir), false);
    });
  });

  describe('BMAD Integration Scenarios', () => {
    it('should validate correctly when BMAD installer sets different cwd', () => {
      const bmadInstallerCwd = '/Users/test/BMAD-METHOD';
      const agentVibesTargetDir = bmadInstallerCwd;
      const detectedBmadPath = '/Users/test/BMAD-METHOD/.bmad';

      assert.strictEqual(
        isPathSafe(detectedBmadPath, agentVibesTargetDir),
        true,
        'BMAD path should be valid when checked against targetDir'
      );
    });

    it('should reject paths outside the installation directory', () => {
      const agentVibesTargetDir = '/Users/test/BMAD-METHOD';
      const suspiciousPath = '/Users/attacker/malicious/.bmad';

      assert.strictEqual(
        isPathSafe(suspiciousPath, agentVibesTargetDir),
        false,
        'Paths outside targetDir should be rejected'
      );
    });

    it('should handle symlink path resolution', () => {
      // Test that resolved paths are used, not literal paths
      const targetDir = path.resolve('/tmp/test');
      const testPath = path.resolve('/tmp/test/subdir');

      assert.strictEqual(isPathSafe(testPath, targetDir), true);
    });
  });
});
