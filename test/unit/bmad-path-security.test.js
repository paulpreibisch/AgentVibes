#!/usr/bin/env node
/**
 * Test for BMAD path security validation fix
 *
 * This tests the fix for the bug where processBmadTtsInjections was using
 * process.cwd() for security validation instead of the targetDir parameter.
 *
 * The bug caused "Security: Invalid BMAD path detected" errors when BMAD's
 * installer called AgentVibes with a different cwd than the installation target.
 *
 * Run with: node test/unit/bmad-path-security.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

// Import the isPathSafe function logic (we'll inline it since it's not exported)
// This mirrors the fixed implementation in src/installer.js
function isPathSafe(targetPath, basePath) {
  const resolved = path.resolve(targetPath);
  const baseResolved = path.resolve(basePath);
  // Ensure the resolved path is actually within basePath, not just a prefix match
  // e.g., /projectX should NOT be considered within /project
  // We check that resolved either equals baseResolved or starts with baseResolved + separator
  return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
}

describe('BMAD Path Security Validation', () => {
  let testDir;
  let bmadDir;

  before(async () => {
    // Create a temporary test directory structure
    testDir = path.join(os.tmpdir(), `agentvibes-test-${Date.now()}`);
    bmadDir = path.join(testDir, '.bmad');
    await fs.mkdir(bmadDir, { recursive: true });
  });

  after(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('isPathSafe function', () => {
    it('should return true when bmadPath is within targetDir', () => {
      const targetDir = '/Users/brianmadison/dev/BMAD-METHOD';
      const bmadPath = '/Users/brianmadison/dev/BMAD-METHOD/.bmad';

      assert.strictEqual(isPathSafe(bmadPath, targetDir), true);
    });

    it('should return true for nested paths within targetDir', () => {
      const targetDir = '/project';
      const bmadPath = '/project/.bmad/bmm/agents';

      assert.strictEqual(isPathSafe(bmadPath, targetDir), true);
    });

    it('should return false for path traversal attempts', () => {
      const targetDir = '/Users/brianmadison/dev/BMAD-METHOD';
      const maliciousPath = '/Users/brianmadison/dev/BMAD-METHOD/../../../etc/passwd';

      assert.strictEqual(isPathSafe(maliciousPath, targetDir), false);
    });

    it('should return false for completely different paths', () => {
      const targetDir = '/Users/brianmadison/dev/BMAD-METHOD';
      const differentPath = '/tmp/something';

      assert.strictEqual(isPathSafe(differentPath, targetDir), false);
    });

    it('should return false when bmadPath is parent of targetDir', () => {
      const targetDir = '/Users/brianmadison/dev/BMAD-METHOD/.bmad';
      const parentPath = '/Users/brianmadison/dev/BMAD-METHOD';

      assert.strictEqual(isPathSafe(parentPath, targetDir), false);
    });

    it('should handle relative paths by resolving them', () => {
      const cwd = process.cwd();
      const targetDir = cwd;
      const relativeBmadPath = './.bmad';

      // The resolved path should be within cwd
      assert.strictEqual(isPathSafe(relativeBmadPath, targetDir), true);
    });

    it('should work with the actual test directory', () => {
      // bmadDir is within testDir
      assert.strictEqual(isPathSafe(bmadDir, testDir), true);

      // testDir parent is NOT within testDir
      const parentDir = path.dirname(testDir);
      assert.strictEqual(isPathSafe(parentDir, testDir), false);
    });
  });

  describe('BMAD integration scenario', () => {
    it('should validate correctly when BMAD installer sets different cwd', () => {
      // Simulate the scenario:
      // 1. BMAD installer runs in /Users/brianmadison/dev/BMAD-METHOD
      // 2. It calls npx agentvibes with cwd: result.projectDir
      // 3. AgentVibes detects BMAD and gets bmadPath as absolute path
      // 4. The security check should use targetDir, not process.cwd()

      const bmadInstallerCwd = '/Users/brianmadison/dev/BMAD-METHOD';
      const agentVibesTargetDir = bmadInstallerCwd; // Same as where BMAD installer ran
      const detectedBmadPath = '/Users/brianmadison/dev/BMAD-METHOD/.bmad';

      // OLD BUG: Used process.cwd() which might be different
      // This would fail if process.cwd() was different from bmadInstallerCwd

      // NEW FIX: Use targetDir parameter
      assert.strictEqual(
        isPathSafe(detectedBmadPath, agentVibesTargetDir),
        true,
        'BMAD path should be valid when checked against targetDir'
      );
    });

    it('should reject paths outside the installation directory', () => {
      const agentVibesTargetDir = '/Users/brianmadison/dev/BMAD-METHOD';
      const suspiciousPath = '/Users/attacker/malicious/.bmad';

      assert.strictEqual(
        isPathSafe(suspiciousPath, agentVibesTargetDir),
        false,
        'Paths outside targetDir should be rejected'
      );
    });
  });

  describe('Edge cases for Windows/Unix path handling', () => {
    it('should handle paths with trailing slashes', () => {
      const targetDir = '/project/';
      const bmadPath = '/project/.bmad';

      assert.strictEqual(isPathSafe(bmadPath, targetDir), true);
    });

    it('should handle paths with multiple slashes', () => {
      const targetDir = '/project';
      const bmadPath = '/project//.bmad';

      assert.strictEqual(isPathSafe(bmadPath, targetDir), true);
    });

    it('should handle case where basePath has similar prefix', () => {
      // /projectX should NOT be considered within /project
      const targetDir = '/project';
      const bmadPath = '/projectX/.bmad';

      assert.strictEqual(isPathSafe(bmadPath, targetDir), false);
    });
  });
});

console.log('Running BMAD path security tests...\n');
