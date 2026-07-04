#!/usr/bin/env node
/**
 * File: bin/resolve-utterance.js
 *
 * CLI bridge between the pure Node utterance resolver and the bash/PowerShell/
 * Python player scripts (Story AVI-S8.5, Stage 2). Reads all config once via the
 * loader, resolves the plan, and prints it as one line of JSON on stdout.
 *
 * Players call this ONCE and execute the returned plan verbatim — they no longer
 * read config or make precedence decisions themselves.
 *
 * Usage:
 *   resolve-utterance.js --text "hello" [--llm claude-code] [--voice af_bella]
 *       [--voice-source user-explicit] [--project-dir /path] [--personality pirate]
 *
 * Output (stdout): a single JSON object (the UtterancePlan). Nothing else is
 * printed to stdout so callers can parse it directly; diagnostics go to stderr.
 * Exit codes: 0 = plan emitted; 2 = the resolved plan failed validation (a loud
 * failure — never emit a silently-wrong plan).
 */

'use strict';

import os from 'node:os';
import { gatherInputs } from '../src/services/utterance-loader.js';
import { resolveUtterance, validatePlan } from '../src/services/utterance-resolver.js';

/** Minimal --flag value parser (no external deps; players pass simple flags). */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ctx = {
    text: args.text ?? '',
    voice: args.voice,
    voiceSource: args.voiceSource,
    llm: args.llm,
    personality: args.personality,
    projectDir: args.projectDir,
    homeDir: os.homedir(),
    cwd: process.cwd(),
    env: process.env,
  };

  let plan;
  try {
    const inputs = gatherInputs(ctx);
    plan = resolveUtterance(inputs);
  } catch (err) {
    process.stderr.write(`resolve-utterance: failed to resolve plan: ${err.message}\n`);
    process.exit(2);
  }

  const problems = validatePlan(plan);
  if (problems.length) {
    // Fail loud — a malformed plan must never be executed (silent-wrong audio).
    process.stderr.write(`resolve-utterance: invalid plan: ${problems.join('; ')}\n`);
    process.exit(2);
  }

  process.stdout.write(JSON.stringify(plan) + '\n');
}

main();
