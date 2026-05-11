import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import yaml from 'js-yaml';

/**
 * Detect BMAD installation and version
 * @param {string} targetDir - Directory to check
 * @returns {Promise<Object>} Detection result with version info
 */
export async function detectBMAD(targetDir) {
  // Check v6 first (newer version).
  // Search order: project-local variants first, then home-dir (_bmad is the current BMAD installer default)
  const homeDir = os.homedir();
  const v6Candidates = [
    // Project-local checks first
    { manifest: path.join(targetDir, '.bmad/_cfg/manifest.yaml'),    bmadPath: '.bmad' },
    { manifest: path.join(targetDir, 'bmad/_cfg/manifest.yaml'),     bmadPath: 'bmad' },
    { manifest: path.join(targetDir, '_bmad/_cfg/manifest.yaml'),    bmadPath: '_bmad' },
    { manifest: path.join(targetDir, '_bmad/_config/manifest.yaml'), bmadPath: '_bmad' },
    // Home-dir installs (global BMAD not inside a project) — detected but NOT injected
    { manifest: path.join(homeDir, '_bmad/_config/manifest.yaml'),   bmadPath: '_bmad', root: homeDir, isGlobal: true },
    { manifest: path.join(homeDir, '_bmad/_cfg/manifest.yaml'),      bmadPath: '_bmad', root: homeDir, isGlobal: true },
    { manifest: path.join(homeDir, '.bmad/_cfg/manifest.yaml'),      bmadPath: '.bmad', root: homeDir, isGlobal: true },
  ];

  let v6Manifest = null;
  let bmadPath = null;
  let bmadRoot = targetDir;
  let isGlobal = false;

  for (const candidate of v6Candidates) {
    try {
      await fs.access(candidate.manifest);
      v6Manifest = candidate.manifest;
      bmadPath = candidate.bmadPath;
      bmadRoot = candidate.root ?? targetDir;
      isGlobal = candidate.isGlobal ?? false;
      break;
    } catch { /* try next */ }
  }

  if (bmadPath) {
    try {
      const manifestContent = await fs.readFile(v6Manifest, 'utf8');
      const manifest = yaml.load(manifestContent);

      return {
        version: 6,
        detailedVersion: manifest.installation?.version || '6.0.0-alpha.x',
        manifestPath: v6Manifest,
        configPath: path.join(bmadRoot, bmadPath, 'core/config.yaml'),
        bmadPath: path.join(bmadRoot, bmadPath),
        installed: true,
        isGlobal,
      };
    } catch {}
  }

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
