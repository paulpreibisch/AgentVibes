#!/usr/bin/env node
/**
 * scripts/audit-destructive-ops.js
 *
 * Checks that installer code does not contain direct (unconditional) fs.copyFile
 * or recursive fs.rm calls in functions that copy user-editable .claude/ files.
 *
 * The audit checks specific high-risk function bodies, not the whole file, so it
 * does not generate false positives from the manifest utility functions themselves.
 *
 * Exit 0 = clean.  Exit 1 = issues found (push/publish blocked).
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Functions that MUST NOT contain direct fs.copyFile (they must use manifestSafeCopy)
const PROTECTED_FUNCTIONS = [
  'copyHookFiles',
  'copyCommandFiles',
  'copyPersonalityFiles',
  'updatePersonalityFiles',
  'updateCommandFiles',
  'updateGlobalHooks',
];

// Patterns that are always dangerous in uninstall context for shared .claude dirs
const UNINSTALL_DANGER = /fs\.rm\([^)]*(?:hooksDir|personalities|hooks|\.claude|claudeDir)[^)]*,\s*\{[^}]*recursive\s*:\s*true[^}]*force\s*:\s*true[^}]*\}/;

function extractFunctionBody(code, fnName) {
  const fnStart = code.indexOf(`async function ${fnName}(`);
  if (fnStart === -1) return null;
  // Find the matching closing brace
  let depth = 0;
  let inBody = false;
  for (let i = fnStart; i < code.length; i++) {
    if (code[i] === '{') { depth++; inBody = true; }
    else if (code[i] === '}') { depth--; }
    if (inBody && depth === 0) {
      return { body: code.substring(fnStart, i + 1), startLine: code.substring(0, fnStart).split('\n').length };
    }
  }
  return null;
}

function getLineNumber(code, index) {
  return code.substring(0, index).split('\n').length;
}

let totalIssues = 0;

// ── Check installer.js ──────────────────────────────────────────────────────
const installerPath = join(ROOT, 'src/installer.js');
let installerCode;
try {
  installerCode = readFileSync(installerPath, 'utf8');
} catch {
  console.error('❌ Could not read src/installer.js');
  process.exit(1);
}

// 1. Check protected functions don't contain raw fs.copyFile
for (const fnName of PROTECTED_FUNCTIONS) {
  const fn = extractFunctionBody(installerCode, fnName);
  if (!fn) continue; // function might not exist

  // Allow: copyFile calls that are inside the manifestSafeCopy utility (already checked above)
  // Flag: any fs.copyFile with exactly 2 args (no COPYFILE_EXCL) where dest is NOT a .bak file
  const rawCopyRegex = /await\s+fs\.copyFile\(\s*([^,]+),\s*([^,)]+)\s*\)/g;
  let match;
  while ((match = rawCopyRegex.exec(fn.body)) !== null) {
    const destArg = match[2].trim();
    // Allow .user.bak copies (those are backup saves, not overwrites)
    if (destArg.includes('.user.bak')) continue;
    // Allow copies where dest is clearly a temp/bak path
    if (destArg.includes('.bak') || destArg.includes('tmp') || destArg.includes('Tmp')) continue;

    const line = fn.startLine + fn.body.substring(0, match.index).split('\n').length - 1;
    console.error(`CRITICAL ${installerPath}:${line} [${fnName}]: Direct fs.copyFile — use manifestSafeCopy()`);
    console.error(`  → ${match[0].substring(0, 100)}`);
    totalIssues++;
  }
}

// 2. Check uninstall does not rm -rf shared dirs by name
const uninstallMarker = "// Remove project-level files";
const uninstallStart = installerCode.indexOf(uninstallMarker);
if (uninstallStart !== -1) {
  // Grab ~200 lines of uninstall context
  const uninstallSnippet = installerCode.substring(uninstallStart, uninstallStart + 5000);
  if (UNINSTALL_DANGER.test(uninstallSnippet)) {
    const line = getLineNumber(installerCode, uninstallStart);
    console.error(`HIGH ${installerPath}:~${line}: fs.rm with recursive+force on shared .claude dir in uninstall — use removeManifestFiles()`);
    totalIssues++;
  }
}

// ── Check llm-provider-service.js ──────────────────────────────────────────
const providerPath = join(ROOT, 'src/services/llm-provider-service.js');
let providerCode;
try {
  providerCode = readFileSync(providerPath, 'utf8');
} catch {
  console.error('❌ Could not read src/services/llm-provider-service.js');
  process.exit(1);
}

// installCopilotInstructions and installCodexInstructions must use marker blocks, not raw writeFile
for (const fnName of ['installCopilotInstructions', 'installCodexInstructions']) {
  const fn = extractFunctionBody(providerCode, fnName);
  if (!fn) continue;

  // Should reference AGENTVIBES_MARKER_START — if not, it's doing a raw overwrite
  if (!fn.body.includes('AGENTVIBES_MARKER') && !fn.body.includes('injectMarkerBlock')) {
    const line = fn.startLine;
    console.error(`HIGH ${providerPath}:${line} [${fnName}]: No marker-block injection found — file content may be overwritten wholesale`);
    totalIssues++;
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────
if (totalIssues > 0) {
  console.error(`\n❌ Destructive-ops audit failed: ${totalIssues} issue(s).`);
  console.error('   Helpers to use instead:');
  console.error('     • manifestSafeCopy(src, dest, manifest)  — replaces fs.copyFile(src, dest)');
  console.error('     • removeManifestFiles(manifest, baseDir) — replaces fs.rm(dir, {recursive, force})');
  console.error('     • injectMarkerBlock / removeMarkerBlock  — replaces wholesale file writes');
  process.exit(1);
}

console.log('✓ Destructive-ops audit passed.');
