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
 * Output (stdout):
 *   default / --format json : a single JSON object (the UtterancePlan).
 *   --format sh             : safe `AV_<FIELD>=<single-quoted>` lines a POSIX
 *                             shell can `eval`. Booleans emit 'true'/'false';
 *                             nested music/ssh fields flatten to AV_MUSIC_*,
 *                             AV_SSH_*. This is how bash/zsh players consume the
 *                             plan without a JSON parser.
 * Nothing else is printed to stdout so callers can parse it directly;
 * diagnostics go to stderr. Exit codes: 0 = plan emitted; 2 = the resolved plan
 * failed validation (a loud failure — never emit a silently-wrong plan).
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

  if (args.format === 'sh') {
    process.stdout.write(toShell(plan));
  } else {
    process.stdout.write(JSON.stringify(plan) + '\n');
  }
}

/** Single-quote a value for safe POSIX-shell eval (wrap, escaping embedded quotes). */
function shq(v) {
  return `'${String(v).replace(/'/g, `'\\''`)}'`;
}

/** Flatten a plan into `AV_<FIELD>=<quoted>` lines for `eval` in a shell player. */
function toShell(plan) {
  const b = (x) => (x ? 'true' : 'false');
  const m = plan.music || {};
  const s = plan.sshTarget || {};
  const lines = [
    `AV_TEXT=${shq(plan.text ?? '')}`,
    `AV_VOICE=${shq(plan.voice ?? '')}`,
    `AV_VOICE_IS_OVERRIDE=${b(plan.voiceIsOverride)}`,
    `AV_ENGINE=${shq(plan.engine ?? '')}`,
    `AV_TRANSPORT=${shq(plan.transport ?? 'local')}`,
    `AV_VOICE_MODEL=${shq(plan.voiceModel ?? '')}`,
    `AV_SPEAKER_ID=${shq(plan.speakerId ?? '')}`,
    `AV_PERSONALITY=${shq(plan.personality ?? '')}`,
    `AV_LANGUAGE=${shq(plan.language ?? '')}`,
    `AV_PRETEXT=${shq(plan.pretext ?? '')}`,
    `AV_SPEED=${shq(plan.speed ?? '')}`,
    `AV_REVERB=${shq(plan.reverb ?? 'off')}`,
    `AV_EFFECTS=${shq(plan.effects ?? '')}`,
    `AV_MUSIC_ENABLED=${b(m.enabled)}`,
    `AV_MUSIC_TRACK=${shq(m.track ?? '')}`,
    `AV_MUSIC_VOLUME=${shq(m.volume ?? '')}`,
    `AV_MUTE=${b(plan.mute)}`,
    `AV_RDP_MODE=${b(plan.rdpMode)}`,
    `AV_NO_PLAYBACK=${b(plan.noPlayback)}`,
    `AV_TEST_MODE=${b(plan.testMode)}`,
    `AV_LLM_KEY=${shq(plan.llmKey ?? '')}`,
    `AV_PROJECT_DIR=${shq(plan.projectDir ?? '')}`,
    `AV_SSH_HOST=${shq(s.host ?? '')}`,
    `AV_SSH_PORT=${shq(s.port ?? '')}`,
    `AV_SSH_PASS_PORT_FLAG=${b(s.passPortFlag)}`,
    `AV_SSH_KEY=${shq(s.key ?? '')}`,
  ];
  return lines.join('\n') + '\n';
}

main();
