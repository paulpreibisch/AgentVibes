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

// Version appears in two possible forms depending on the README layout:
//   1. **Version**: vX.X.X                     (older header badge)
//   2. **AgentVibes** · vX.X.X · Licensed…     (current footer line)
// Both are matched so a layout change doesn't silently strand the version.
const PATTERNS = [
  /(\*\*Version\*\*: )v\d+\.\d+\.\d+/,
  /(\*\*AgentVibes\*\* · )v\d+\.\d+\.\d+/,
];

let updated = readme;
let replacements = 0;
for (const re of PATTERNS) {
  if (re.test(updated)) {
    updated = updated.replace(re, `$1v${newVersion}`);
    replacements++;
  }
}

// Exit non-zero when nothing matched. Previously this only warned and exited 0,
// so a README layout change stranded the version at its old value and the
// release shipped anyway — the failure was invisible in the npm version output.
if (replacements === 0) {
  process.stderr.write(
    'sync-readme-version: ERROR — no version string found in README.md.\n' +
    'Expected one of: "**Version**: vX.X.X" or "**AgentVibes** · vX.X.X".\n' +
    'If the README layout changed, add its pattern to PATTERNS in this script.\n'
  );
  process.exit(1);
}

fs.writeFileSync(readmePath, updated);
process.stdout.write(`sync-readme-version: README.md updated to v${newVersion} (${replacements} site(s))\n`);
