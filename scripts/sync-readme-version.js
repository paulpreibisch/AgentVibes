#!/usr/bin/env node
/**
 * @fileoverview Syncs the README.md version badge from package.json.
 * Run automatically by the npm `version` lifecycle hook so that
 * `package.json` is the single source of truth for the release version.
 *
 * Usage: called via `npm version patch|minor|major` (not directly).
 * The env var `npm_package_version` is set by npm to the NEW version before
 * this script runs, so no args are needed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const newVersion = process.env.npm_package_version;
if (!newVersion) {
  process.stderr.write('sync-readme-version: npm_package_version not set — run via npm version\n');
  process.exit(1);
}

const readmePath = path.join(root, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');

// Replace the single version badge line: **Version**: vX.X.X
const updated = readme.replace(
  /(\*\*Version\*\*: )v[\d]+\.[\d]+\.[\d]+/,
  `$1v${newVersion}`
);

if (updated === readme) {
  process.stderr.write(`sync-readme-version: warning — no **Version** badge found in README.md\n`);
} else {
  fs.writeFileSync(readmePath, updated);
  process.stdout.write(`sync-readme-version: README.md updated to v${newVersion}\n`);
}
