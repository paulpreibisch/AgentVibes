import path from 'node:path';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';

/**
 * Detect BMAD installation and version
 * @param {string} targetDir - Directory to check
 * @returns {Promise<Object>} Detection result with version info
 */
export async function detectBMAD(targetDir) {
  // Check v6 first (newer version)
  const v6Manifest = path.join(targetDir, 'bmad/_cfg/manifest.yaml');
  try {
    await fs.access(v6Manifest);
    const manifestContent = await fs.readFile(v6Manifest, 'utf8');
    const manifest = yaml.load(manifestContent);

    return {
      version: 6,
      detailedVersion: manifest.installation?.version || '6.0.0-alpha.x',
      manifestPath: v6Manifest,
      configPath: path.join(targetDir, 'bmad/core/config.yaml'),
      bmadPath: path.join(targetDir, 'bmad'),
      installed: true
    };
  } catch {}

  // Check v4 (legacy)
  const v4Manifest = path.join(targetDir, '.bmad-core/install-manifest.yaml');
  try {
    await fs.access(v4Manifest);
    return {
      version: 4,
      detailedVersion: '4.x',
      manifestPath: v4Manifest,
      configPath: path.join(targetDir, '.bmad-core/config.yaml'),
      bmadPath: path.join(targetDir, '.bmad-core'),
      installed: true
    };
  } catch {}

  // Not installed
  return { version: null, installed: false };
}

/**
 * Get BMAD configuration file path for detected version
 * @param {Object} detection - Result from detectBMAD()
 * @returns {string|null} Path to config.yaml or null
 */
export function getBMADConfigPath(detection) {
  return detection.installed ? detection.configPath : null;
}
