#!/usr/bin/env node
/**
 * generate-provider-catalog.mjs — Provider Catalog artifact generator (AVI-S9.2).
 *
 * Emits, deterministically, from the single source of truth
 * src/services/provider-catalog.js, four checked-in artifacts:
 *
 *   .claude/hooks/provider-catalog.sh       bash-3.2-safe catalog accessors
 *   .claude/hooks/elevenlabs-voices.sh      regenerated in place (bash-3.2-safe)
 *   .claude/hooks-windows/provider-catalog.ps1   dot-sourceable PowerShell
 *   .claude/hooks/provider-catalog.json     full record set for the Python MCP server
 *
 * Each artifact carries a `DO NOT EDIT — generated from src/services/provider-catalog.js`
 * header and a content hash. Generation is deterministic (stable key order, no
 * timestamps) so the conformance freshness test can regenerate in-memory and
 * byte-diff against the checked-in copies (design §5.1). Bash output is
 * bash-3.2-safe: NO `declare -A`, NO `${var,,}`/`${var^^}` — case statements +
 * `tr` folding + `printf` lists (design §5.7).
 *
 * Run directly to (re)write the artifacts:
 *   node scripts/generate-provider-catalog.mjs
 *
 * The generator functions are also exported so tests can call them without
 * touching disk.
 *
 * @module scripts/generate-provider-catalog
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { listProviders } from '../src/services/provider-catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const GENERATED_MARK = 'DO NOT EDIT — generated from src/services/provider-catalog.js';

/* ------------------------------------------------------------------ *
 * Canonical data model (deterministic ordering derived from the SSOT).
 * ------------------------------------------------------------------ */

/** All records, in canonical (declaration) order. */
function records() {
  return listProviders();
}

/** Voices, per voiceModel, as the plain tokens a shell/PS consumer lists. */
function listedVoiceTokens(r) {
  switch (r.voiceModel) {
    case 'static': // kokoro — ids
      return r.voices.slice();
    case 'name-to-id': // elevenlabs — friendly names
      return r.voices.map((v) => v.name);
    case 'single': // soprano
      return r.voices.slice();
    default: // discovered — enumerated at runtime, nothing to emit
      return [];
  }
}

/** The name→id map for elevenlabs (case-fold key), in declaration order. */
function elevenlabsPairs() {
  const r = records().find((x) => x.id === 'elevenlabs');
  return r.voices.map((v) => ({ name: v.name, id: v.id }));
}

/** Canonical alias→id resolution table (mirrors provider-catalog._BY_ID/_BY_ALIAS). */
function canonicalMap() {
  const map = new Map();
  for (const r of records()) map.set(r.id, r.id); // exact ids win
  for (const r of records()) {
    for (const a of r.aliases) {
      if (!map.has(a)) map.set(a, r.id);
    }
  }
  return map;
}

/** Providers available on a platform (runtime[platform] !== null; unix excludes darwinOnly). */
function providersForPlatform(platform) {
  return records()
    .filter((r) => {
      if (platform === 'windows') return r.runtime.windows !== null;
      if (platform === 'darwin') return r.runtime.unix !== null;
      return r.runtime.unix !== null && !r.runtime.darwinOnly; // 'unix' == generic Linux
    })
    .map((r) => r.id);
}

/** Stable content hash of the underlying data (NOT the rendered text). */
function catalogDataForHash() {
  return records().map((r) => ({
    id: r.id,
    engineId: r.engineId,
    aliases: r.aliases.slice(),
    displayName: r.displayName,
    voiceModel: r.voiceModel,
    defaultVoice: r.defaultVoice,
    requires: r.requires,
    runtime: { unix: r.runtime.unix, windows: r.runtime.windows, darwinOnly: r.runtime.darwinOnly },
    voices: r.voiceModel === 'name-to-id'
      ? r.voices.map((v) => ({ id: v.id, name: v.name, gender: v.gender || '', lang: v.lang || '', desc: v.desc || '' }))
      : (Array.isArray(r.voices) ? r.voices.slice() : null),
  }));
}

const DATA_HASH = createHash('sha256').update(JSON.stringify(catalogDataForHash())).digest('hex');
const CATALOG_VERSION = DATA_HASH.slice(0, 16);

/* ------------------------------------------------------------------ *
 * Small emit helpers.
 * ------------------------------------------------------------------ */

/** Group a Map<key,value> into value → [keys], preserving first-seen order. */
function groupByValue(map) {
  const groups = new Map();
  for (const [k, v] of map) {
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(k);
  }
  return groups;
}

/** printf a newline-terminated list; empty list emits `printf '' ` (a no-op). */
function bashPrintfList(tokens, indent) {
  if (tokens.length === 0) return `${indent}: # (none — enumerated at runtime)\n`;
  return `${indent}printf '%s\\n' ${tokens.map((t) => `'${t}'`).join(' ')}\n`;
}

/* ------------------------------------------------------------------ *
 * Artifact 1 — provider-catalog.sh (bash-3.2-safe accessors).
 * ------------------------------------------------------------------ */

function generateProviderCatalogSh() {
  const recs = records();
  const canon = canonicalMap();
  const canonGroups = groupByValue(canon);

  let body = '';
  body += `AGENTVIBES_CATALOG_VERSION="${CATALOG_VERSION}"\n\n`;

  body += '# Guard against double-sourcing.\n';
  body += '[ -n "${_AGENTVIBES_PROVIDER_CATALOG_LOADED:-}" ] && return 0\n';
  body += '_AGENTVIBES_PROVIDER_CATALOG_LOADED=1\n\n';

  body += '# Lowercase a string without case-modifying expansions (unavailable in bash 3.2).\n';
  body += '_catalog_lc() { printf \'%s\' "${1:-}" | tr \'[:upper:]\' \'[:lower:]\'; }\n\n';

  // canonical provider resolver
  body += '# Resolve an id-or-alias to its canonical provider id (echoes it; 1 if unknown).\n';
  body += 'catalog_canonical_provider() {\n';
  body += '  case "$(_catalog_lc "${1:-}")" in\n';
  for (const [id, keys] of canonGroups) {
    body += `    ${keys.join('|')}) printf '%s' '${id}' ;;\n`;
  }
  body += '    *) return 1 ;;\n';
  body += '  esac\n';
  body += '}\n\n';

  // default voice
  body += '# Echo the default voice for a provider (empty string is valid — system default).\n';
  body += 'catalog_default_voice() {\n';
  body += '  local _p; _p="$(catalog_canonical_provider "${1:-}")" || return 1\n';
  body += '  case "$_p" in\n';
  for (const r of recs) {
    body += `    ${r.id}) printf '%s' '${r.defaultVoice}' ;;\n`;
  }
  body += '  esac\n';
  body += '}\n\n';

  // display name
  body += '# Echo a human display name for a provider.\n';
  body += 'catalog_display_name() {\n';
  body += '  local _p; _p="$(catalog_canonical_provider "${1:-}")" || { printf \'%s\' "${1:-}"; return 0; }\n';
  body += '  case "$_p" in\n';
  for (const r of recs) {
    body += `    ${r.id}) printf '%s' '${r.displayName}' ;;\n`;
  }
  body += '  esac\n';
  body += '}\n\n';

  // providers for platform
  body += '# Print the provider ids playable on a platform (unix|darwin|windows), one per line.\n';
  body += 'catalog_providers_for_platform() {\n';
  body += '  case "$(_catalog_lc "${1:-}")" in\n';
  for (const platform of ['unix', 'darwin', 'windows']) {
    const list = providersForPlatform(platform);
    body += `    ${platform})\n`;
    body += bashPrintfList(list, '      ');
    body += '      ;;\n';
  }
  body += '    *) return 1 ;;\n';
  body += '  esac\n';
  body += '}\n\n';

  // list voices
  body += '# Print a provider\'s listable voices (ids for kokoro, names for elevenlabs), one per line.\n';
  body += '# Discovered providers (piper/macos/sapi) enumerate at runtime and print nothing here.\n';
  body += 'catalog_list_voices() {\n';
  body += '  local _p; _p="$(catalog_canonical_provider "${1:-}")" || return 1\n';
  body += '  case "$_p" in\n';
  for (const r of recs) {
    const tokens = listedVoiceTokens(r);
    body += `    ${r.id})\n`;
    body += bashPrintfList(tokens, '      ');
    body += '      ;;\n';
  }
  body += '  esac\n';
  body += '}\n\n';

  // validate voice
  const kokoro = recs.find((r) => r.id === 'kokoro');
  const el = elevenlabsPairs();
  body += '# Validate a voice for a provider. Echoes the canonical voice and returns 0 on\n';
  body += '# success; returns 1 (no output) on rejection. Mirrors validateVoice() in the JS SSOT.\n';
  body += 'catalog_validate_voice() {\n';
  body += '  local _p _v _lc; _p="$(catalog_canonical_provider "${1:-}")" || return 1\n';
  body += '  _v="${2:-}"; _lc="$(_catalog_lc "$_v")"\n';
  body += '  case "$_p" in\n';
  // kokoro — case-fold exact membership
  body += '    kokoro)\n';
  body += '      case "$_lc" in\n';
  body += `        ${kokoro.voices.map((v) => `'${v}'`).join('|')})\n`;
  body += '          printf \'%s\' "$_lc"; return 0 ;;\n';
  body += '      esac\n';
  body += '      return 1 ;;\n';
  // elevenlabs — name→id (case-fold), else raw 20-char id
  body += '    elevenlabs)\n';
  body += '      case "$_lc" in\n';
  for (const { name, id } of el) {
    body += `        '${name.toLowerCase()}') printf '%s' '${id}'; return 0 ;;\n`;
  }
  body += '      esac\n';
  body += '      [[ "$_v" =~ ^[A-Za-z0-9]{20}$ ]] && { printf \'%s\' "$_v"; return 0; }\n';
  body += '      return 1 ;;\n';
  // soprano
  body += '    soprano)\n';
  body += '      case "$_lc" in\n';
  body += '        \'\'|soprano|soprano-default) printf \'%s\' \'soprano-default\'; return 0 ;;\n';
  body += '      esac\n';
  body += '      return 1 ;;\n';
  // piper family — shape or multispeaker
  body += '    piper|windows-piper)\n';
  body += '      if [[ "$_v" =~ ^[a-z]{2,3}_[A-Z]{2}- ]] || [[ "$_v" == *"::"* ]]; then\n';
  body += '        printf \'%s\' "$_v"; return 0\n';
  body += '      fi\n';
  body += '      return 1 ;;\n';
  // macos / windows-sapi — permissive; '' == system default for windows-sapi
  body += '    macos|windows-sapi)\n';
  body += '      if [ -n "$_v" ]; then printf \'%s\' "$_v"; return 0; fi\n';
  body += '      [ "$_p" = windows-sapi ] && { printf \'%s\' \'\'; return 0; }\n';
  body += '      return 1 ;;\n';
  body += '  esac\n';
  body += '  return 1\n';
  body += '}\n';

  return wrapBash('provider-catalog.sh', body, {
    extra: 'Bash-3.2-safe catalog accessors (macOS ships bash 3.2 — no associative\n'
      + '# arrays, no case-modifying parameter expansions). Source this file; do not execute it.',
  });
}

/* ------------------------------------------------------------------ *
 * Artifact 2 — elevenlabs-voices.sh (regenerated in place, bash-3.2-safe).
 * ------------------------------------------------------------------ */

function generateElevenlabsVoicesSh() {
  const el = elevenlabsPairs();
  const names = el.map((p) => p.name);

  let body = '';
  body += '# Guard against double-sourcing.\n';
  body += '[ -n "${_AGENTVIBES_ELEVENLABS_VOICES_LOADED:-}" ] && return 0\n';
  body += '_AGENTVIBES_ELEVENLABS_VOICES_LOADED=1\n\n';

  body += '# Default voice used when none is configured.\n';
  body += 'ELEVENLABS_DEFAULT_VOICE="Sarah"\n\n';

  body += '# Print the catalog voice names, one per line (bash-3.2-safe replacement for the\n';
  body += '# old associative-array key expansion "${!ELEVENLABS_VOICE_IDS[@]}").\n';
  body += 'elevenlabs_voice_names() {\n';
  body += `  printf '%s\\n' ${names.map((n) => `'${n}'`).join(' ')}\n`;
  body += '}\n\n';

  body += '# Resolve a user-supplied name (case-insensitive) OR a raw voice_id to a canonical\n';
  body += '# voice_id. Echoes the id and returns 0 on success; returns 1 if the input matches\n';
  body += '# no catalog name and is not a raw-id shape. bash-3.2-safe: case statement + tr fold\n';
  body += '# (no associative arrays, no case-modifying expansions).\n';
  body += 'elevenlabs_resolve_voice() {\n';
  body += '  local query lc\n';
  body += '  query="${1:-}"\n';
  body += '  [ -z "$query" ] && return 1\n';
  body += '  lc="$(printf \'%s\' "$query" | tr \'[:upper:]\' \'[:lower:]\')"\n';
  body += '  case "$lc" in\n';
  for (const { name, id } of el) {
    body += `    '${name.toLowerCase()}') printf '%s' '${id}'; return 0 ;;\n`;
  }
  body += '  esac\n';
  body += '  # Already a raw ElevenLabs voice_id.\n';
  body += '  [[ "$query" =~ ^[A-Za-z0-9]{20}$ ]] && { printf \'%s\' "$query"; return 0; }\n';
  body += '  return 1\n';
  body += '}\n';

  return wrapBash('elevenlabs-voices.sh', body, {
    extra: 'SINGLE SOURCE OF TRUTH for the ElevenLabs voice catalog on the shell side.\n'
      + '# Source it, do not execute it. Consumed by play-tts-elevenlabs.sh and\n'
      + '# voice-manager.sh. These are the ElevenLabs DEFAULT-LIBRARY voices — available to\n'
      + '# every API key (community/library voices that must be added to an account first are\n'
      + '# intentionally excluded so a switch can\'t fail at synth time).',
  });
}

/** Wrap a bash body with the shared shebang + DO-NOT-EDIT header. */
function wrapBash(basename, body, { extra } = {}) {
  let head = '#!/usr/bin/env bash\n';
  head += '#\n';
  head += `# ${basename} — GENERATED FILE. DO NOT EDIT.\n`;
  head += `# ${GENERATED_MARK}\n`;
  head += '# Regenerate with: node scripts/generate-provider-catalog.mjs\n';
  head += `# content-hash: sha256:${DATA_HASH}\n`;
  if (extra) head += `#\n# ${extra}\n`;
  head += '\n';
  return head + body;
}

/* ------------------------------------------------------------------ *
 * Artifact 3 — provider-catalog.ps1 (dot-sourceable PowerShell).
 * ------------------------------------------------------------------ */

function generateProviderCatalogPs1() {
  const recs = records();
  const canon = canonicalMap();

  const psArr = (tokens) => tokens.length ? `@(${tokens.map((t) => `'${t}'`).join(',')})` : '@()';
  const psHashLines = (pairs, indent) =>
    pairs.map(([k, v]) => `${indent}'${k}' = '${v}'`).join('\n');

  let body = '';
  body += `$script:AgentVibesCatalogVersion = '${CATALOG_VERSION}'\n\n`;

  // defaults
  body += '$script:CatalogDefaults = @{\n';
  body += psHashLines(recs.map((r) => [r.id, r.defaultVoice]), '  ') + '\n';
  body += '}\n\n';

  // display names
  body += '$script:CatalogDisplayNames = @{\n';
  body += psHashLines(recs.map((r) => [r.id, r.displayName]), '  ') + '\n';
  body += '}\n\n';

  // alias → canonical
  const aliasPairs = [...canon].filter(([k, v]) => k !== v);
  body += '$script:CatalogAlias = @{\n';
  body += (aliasPairs.length ? psHashLines(aliasPairs, '  ') + '\n' : '');
  body += '}\n\n';

  // platform sets
  body += '$script:CatalogPlatform = @{\n';
  for (const platform of ['unix', 'darwin', 'windows']) {
    body += `  '${platform}' = ${psArr(providersForPlatform(platform))}\n`;
  }
  body += '}\n\n';

  // voices
  body += '$script:CatalogVoices = @{\n';
  for (const r of recs) {
    const tokens = listedVoiceTokens(r);
    body += `  '${r.id}' = ${psArr(tokens)}\n`;
  }
  body += '}\n\n';

  // elevenlabs name → id
  body += '$script:CatalogElevenLabs = @{\n';
  body += psHashLines(elevenlabsPairs().map((p) => [p.name.toLowerCase(), p.id]), '  ') + '\n';
  body += '}\n\n';

  body += `function Get-CatalogCanonicalProvider {
  param([Parameter(Mandatory)][string]$Provider)
  $key = $Provider.Trim().ToLowerInvariant()
  if ($script:CatalogDefaults.ContainsKey($key)) { return $key }
  if ($script:CatalogAlias.ContainsKey($key)) { return $script:CatalogAlias[$key] }
  return $null
}

function Get-CatalogDefaultVoice {
  param([Parameter(Mandatory)][string]$Provider)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return $null }
  return $script:CatalogDefaults[$p]
}

function Get-CatalogDisplayName {
  param([Parameter(Mandatory)][string]$Provider)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return $Provider }
  return $script:CatalogDisplayNames[$p]
}

function Get-CatalogProvidersForPlatform {
  param([Parameter(Mandatory)][string]$Platform)
  $key = $Platform.Trim().ToLowerInvariant()
  if ($script:CatalogPlatform.ContainsKey($key)) { return $script:CatalogPlatform[$key] }
  return @()
}

function Get-CatalogVoices {
  param([Parameter(Mandatory)][string]$Provider)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return @() }
  return $script:CatalogVoices[$p]
}

function Test-CatalogVoice {
  param([Parameter(Mandatory)][string]$Provider, [Parameter(Mandatory)][AllowEmptyString()][string]$Voice)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return $null }
  $lc = $Voice.Trim().ToLowerInvariant()
  switch ($p) {
    'kokoro' {
      if ($script:CatalogVoices['kokoro'] -contains $lc) { return $lc }
      return $null
    }
    'elevenlabs' {
      if ($script:CatalogElevenLabs.ContainsKey($lc)) { return $script:CatalogElevenLabs[$lc] }
      if ($Voice -match '^[A-Za-z0-9]{20}$') { return $Voice }
      return $null
    }
    'soprano' {
      if ($lc -eq '' -or $lc -eq 'soprano' -or $lc -eq 'soprano-default') { return 'soprano-default' }
      return $null
    }
    { $_ -eq 'piper' -or $_ -eq 'windows-piper' } {
      if ($Voice -match '^[a-z]{2,3}_[A-Z]{2}-' -or $Voice -like '*::*') { return $Voice }
      return $null
    }
    default {
      if ($Voice -ne '') { return $Voice }
      if ($p -eq 'windows-sapi') { return '' }
      return $null
    }
  }
}
`;

  return wrapPs1('provider-catalog.ps1', body);
}

/** Wrap a PowerShell body with the DO-NOT-EDIT header. */
function wrapPs1(basename, body) {
  let head = '';
  head += `# ${basename} — GENERATED FILE. DO NOT EDIT.\n`;
  head += `# ${GENERATED_MARK}\n`;
  head += '# Regenerate with: node scripts/generate-provider-catalog.mjs\n';
  head += `# content-hash: sha256:${DATA_HASH}\n`;
  head += '# Dot-source this file to load the catalog accessors; do not execute it.\n';
  head += '\n';
  return head + body;
}

/* ------------------------------------------------------------------ *
 * Artifact 4 — provider-catalog.json (for the Python MCP server).
 * ------------------------------------------------------------------ */

function generateProviderCatalogJson() {
  const data = {
    _generated: GENERATED_MARK,
    _contentHash: `sha256:${DATA_HASH}`,
    version: CATALOG_VERSION,
    providers: catalogDataForHash(),
    platforms: {
      unix: providersForPlatform('unix'),
      darwin: providersForPlatform('darwin'),
      windows: providersForPlatform('windows'),
    },
    displayNames: Object.fromEntries(records().map((r) => [r.id, r.displayName])),
  };
  return JSON.stringify(data, null, 2) + '\n';
}

/* ------------------------------------------------------------------ *
 * Registry + main.
 * ------------------------------------------------------------------ */

const ARTIFACTS = [
  { relPath: '.claude/hooks/provider-catalog.sh', generate: generateProviderCatalogSh },
  { relPath: '.claude/hooks/elevenlabs-voices.sh', generate: generateElevenlabsVoicesSh },
  { relPath: '.claude/hooks-windows/provider-catalog.ps1', generate: generateProviderCatalogPs1 },
  { relPath: '.claude/hooks/provider-catalog.json', generate: generateProviderCatalogJson },
];

/** Return { relPath → generated content } for all artifacts (no disk I/O). */
function generateAll() {
  const out = {};
  for (const a of ARTIFACTS) out[a.relPath] = a.generate();
  return out;
}

function main() {
  for (const a of ARTIFACTS) {
    const dest = path.join(ROOT, a.relPath);
    writeFileSync(dest, a.generate());
    process.stdout.write(`  wrote ${a.relPath}\n`);
  }
  process.stdout.write(`provider-catalog: ${ARTIFACTS.length} artifacts generated (version ${CATALOG_VERSION}).\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

export {
  ARTIFACTS,
  ROOT,
  DATA_HASH,
  CATALOG_VERSION,
  GENERATED_MARK,
  generateAll,
  generateProviderCatalogSh,
  generateElevenlabsVoicesSh,
  generateProviderCatalogPs1,
  generateProviderCatalogJson,
};
