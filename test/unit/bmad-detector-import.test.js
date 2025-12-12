#!/usr/bin/env node
/**
 * Unit tests for src/bmad-detector.js
 * Tests BMAD version detection and configuration path resolution
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { detectBMAD, getBMADConfigPath } from '../../src/bmad-detector.js';

describe('BMAD Detector', () => {
  let testDir;

  before(async () => {
    testDir = path.join(os.tmpdir(), `agentvibes-bmad-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('detectBMAD v6 with .bmad path', () => {
    let v6Dir;

    before(async () => {
      v6Dir = path.join(testDir, 'v6-dotbmad');
      const manifestDir = path.join(v6Dir, '.bmad/_cfg');
      await fs.mkdir(manifestDir, { recursive: true });

      const manifest = {
        installation: {
          version: '6.1.0',
          timestamp: Date.now()
        }
      };

      // Create YAML manifest using simple string format
      const yamlContent = `installation:
  version: ${manifest.installation.version}
  timestamp: ${manifest.installation.timestamp}
`;
      await fs.writeFile(
        path.join(manifestDir, 'manifest.yaml'),
        yamlContent
      );
    });

    it('should detect v6 installation with .bmad path', async () => {
      const result = await detectBMAD(v6Dir);

      assert.strictEqual(result.installed, true);
      assert.strictEqual(result.version, 6);
      assert.strictEqual(result.detailedVersion, '6.1.0');
      assert.ok(result.manifestPath.includes('.bmad/_cfg/manifest.yaml'));
      assert.ok(result.bmadPath.endsWith('.bmad'));
    });

    it('should return correct config path for v6', async () => {
      const result = await detectBMAD(v6Dir);
      const configPath = getBMADConfigPath(result);

      assert.ok(configPath);
      assert.ok(configPath.includes('.bmad/core/config.yaml'));
    });
  });

  describe('detectBMAD v6 with bmad path (no dot)', () => {
    let v6AltDir;

    before(async () => {
      v6AltDir = path.join(testDir, 'v6-bmad');
      const manifestDir = path.join(v6AltDir, 'bmad/_cfg');
      await fs.mkdir(manifestDir, { recursive: true });

      const yamlContent = `installation:
  version: 6.2.0-beta.1
  timestamp: ${Date.now()}
`;
      await fs.writeFile(
        path.join(manifestDir, 'manifest.yaml'),
        yamlContent
      );
    });

    it('should detect v6 installation with bmad path (no dot)', async () => {
      const result = await detectBMAD(v6AltDir);

      assert.strictEqual(result.installed, true);
      assert.strictEqual(result.version, 6);
      assert.strictEqual(result.detailedVersion, '6.2.0-beta.1');
      assert.ok(result.manifestPath.includes('bmad/_cfg/manifest.yaml'));
      assert.ok(result.bmadPath.endsWith('bmad'));
      assert.ok(!result.bmadPath.includes('.bmad'));
    });
  });

  describe('detectBMAD v4 (legacy)', () => {
    let v4Dir;

    before(async () => {
      v4Dir = path.join(testDir, 'v4-legacy');
      const manifestDir = path.join(v4Dir, '.bmad-core');
      await fs.mkdir(manifestDir, { recursive: true });

      const yamlContent = `version: 4.5.2
timestamp: ${Date.now()}
`;
      await fs.writeFile(
        path.join(manifestDir, 'install-manifest.yaml'),
        yamlContent
      );
    });

    it('should detect v4 installation', async () => {
      const result = await detectBMAD(v4Dir);

      assert.strictEqual(result.installed, true);
      assert.strictEqual(result.version, 4);
      assert.strictEqual(result.detailedVersion, '4.x');
      assert.ok(result.manifestPath.includes('.bmad-core/install-manifest.yaml'));
    });

    it('should return correct config path for v4', async () => {
      const result = await detectBMAD(v4Dir);
      const configPath = getBMADConfigPath(result);

      assert.ok(configPath);
      assert.ok(configPath.includes('.bmad-core/config.yaml'));
    });
  });

  describe('detectBMAD not installed', () => {
    let emptyDir;

    before(async () => {
      emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });
    });

    it('should return not installed for directory without BMAD', async () => {
      const result = await detectBMAD(emptyDir);

      assert.strictEqual(result.installed, false);
      assert.strictEqual(result.version, null);
    });

    it('should return null config path when not installed', async () => {
      const result = await detectBMAD(emptyDir);
      const configPath = getBMADConfigPath(result);

      assert.strictEqual(configPath, null);
    });
  });

  describe('Edge cases', () => {
    it('should handle non-existent directory gracefully', async () => {
      const nonExistent = path.join(testDir, 'does-not-exist-12345');
      const result = await detectBMAD(nonExistent);

      assert.strictEqual(result.installed, false);
      assert.strictEqual(result.version, null);
    });

    it('should handle directory with partial BMAD structure', async () => {
      const partialDir = path.join(testDir, 'partial');
      await fs.mkdir(path.join(partialDir, '.bmad/_cfg'), { recursive: true });
      // No manifest.yaml file created

      const result = await detectBMAD(partialDir);

      assert.strictEqual(result.installed, false);
    });

    it('should handle corrupt YAML in manifest', async () => {
      const corruptDir = path.join(testDir, 'corrupt');
      const manifestDir = path.join(corruptDir, '.bmad/_cfg');
      await fs.mkdir(manifestDir, { recursive: true });

      // Write invalid YAML
      await fs.writeFile(
        path.join(manifestDir, 'manifest.yaml'),
        'this is not: valid: yaml: content: [[['
      );

      const result = await detectBMAD(corruptDir);

      // Should fall through to not installed
      assert.strictEqual(result.installed, false);
    });
  });
});
