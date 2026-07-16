# Provider Catalog / Voice Registry — Architecture Design

**Layer 2 of the single-source-of-truth program** (companion to the Utterance Resolver)
**Status:** Implemented in v5.13.0.

---

## 1. Executive summary

Create `src/services/provider-catalog.js` — a pure-data JS module holding ONE record per provider (voices, default, validation rule, per-platform runtime, display name) — and a **build-time generator** that emits three derived artifacts from it: `provider-catalog.sh` (bash-3.2-safe functions), `provider-catalog.ps1`, and `provider-catalog.json` (for the Python MCP server). All artifacts are checked in and shipped as ordinary hooks; a single conformance test regenerates them in-memory and byte-diffs against the checked-in copies, then walks the full **provider × surface × platform** matrix — including the *negative* assertion that a platform's dispatchers reject any provider whose runtime script doesn't exist on that platform (which fails **today** on `mcp-server/server.py:746` accepting `elevenlabs` on Windows with no `play-tts-elevenlabs.ps1`). The existing ElevenLabs pair (`elevenlabs-voices.sh` + `ELEVENLABS_VOICES` + parity test) is the seed: the catalog absorbs it, and its hand-mirroring becomes generation. Unlike the resolver — which needed a live node bridge because it reads dozens of runtime config inputs — the catalog is static data known at pack time, so generation (zero runtime node dependency) is the right derivation mode, with the resolver's proven "legacy fallback if the artifact is missing" fail-safe.

---

## 2. The seam — catalog vs. resolver

Two different questions, asked at different times:

| | Utterance Resolver (exists) | Provider Catalog (this design) |
|---|---|---|
| Question | **HOW** is this utterance spoken? | **WHAT** exists to speak with? |
| Concern | Precedence: voice/engine/transport/mute/volume routing | Inventory: voice lists, defaults, membership validation, platform availability, display names |
| When | Every utterance (play-time) | Config-write time (`switch`, `set_provider`, `set_voice`), list/whoami time, dispatch guard time |
| Shape vs. membership | `KOKORO_VOICE_RE` (`utterance-resolver.js:34`) answers "does this voice *look* kokoro?" — deliberately permissive so an unknown-but-kokoro-shaped voice still routes to the kokoro engine (R1 coupling) | `validateVoice('kokoro', v)` answers "is this voice *in* the catalog?" — strict, for rejecting typos at switch time |

**Data flow:** catalog sits **upstream** of the resolver. Validation happens when config is *written* (a typo never reaches `voice.txt`); availability happens when a dispatcher *accepts* a provider. The resolver stays pure and does **not** import the catalog — its shape regexes remain classification heuristics, not inventory. The seam is welded by conformance assertions instead of imports:

- every catalog kokoro id must match resolver `KOKORO_VOICE_RE`, and none may match `PIPER_VOICE_RE`;
- every catalog `engineId` ∈ resolver `ENGINES` (`utterance-resolver.js:45`);
- the catalog alias table must equal resolver `ENGINE_ALIASES` (`utterance-resolver.js:52-57`).

This keeps the resolver's 433-test contract untouched while guaranteeing the two layers can never disagree about what a provider is called.

---

## 3. Module design

### 3.1 Canonical module: `src/services/provider-catalog.js`

Pure data + pure functions (no fs, no env — same discipline as the resolver). **Seven canonical records** — the alias mess collapses into records, mirroring `ENGINE_ALIASES`:

```
ProviderRecord = {
  id:           'kokoro',                      // canonical id (matches SUPPORTED_PROVIDERS)
  engineId:     'kokoro',                      // resolver ENGINES value ('sapi' for windows-sapi)
  aliases:      [],                            // e.g. windows-sapi: ['sapi']; windows-piper: ['piper' on win]
  displayName:  'Kokoro TTS',
  voiceModel:   'static' | 'discovered' | 'single' | 'name-to-id',
  voices:       [...ids] | [{name,id,gender,lang,desc}] | null,   // null when discovered
  defaultVoice: 'af_heart',
  runtime:      { unix: 'play-tts-kokoro.sh', windows: 'play-tts-kokoro.ps1', darwinOnly: false },
  requires:     'api-key' | 'pip' | 'builtin' | 'exe',            // for install/validate messaging
}
```

The four `voiceModel` kinds make every provider fit ONE interface:

| Provider | voiceModel | voices | defaultVoice | validate rule | runtime.unix / runtime.windows |
|---|---|---|---|---|---|
| **piper** | `discovered` | `null` (disk `*.onnx` glob) | `en_US-lessac-medium` (as *preferred fallback*, not a guaranteed install) | shape `^[a-z]{2,3}_[A-Z]{2}-` or `::` multispeaker, **plus** membership in injected `installedVoices` when provided | `play-tts-piper.sh` / — (unix identity; Windows uses windows-piper) |
| **kokoro** | `static` | the 54 ids now at `provider-voice-catalog.js:47-70` | `af_heart` | case-fold, exact membership; replaces the loose regex | `play-tts-kokoro.sh` / `play-tts-kokoro.ps1` |
| **elevenlabs** | `name-to-id` | the 21 entries at `provider-voice-catalog.js:17-39` | `Sarah` | case-insensitive name → id, OR raw `^[A-Za-z0-9]{20}$` id passthrough (preserves `elevenlabs-voices.sh:52-72` semantics) | `play-tts-elevenlabs.sh` / **null** ← the contradiction, now data |
| **macos** | `discovered` | `null` (`say -v ?`) | `Samantha` | membership in injected list; permissive shape when list unavailable | `play-tts-macos.sh` / null; `darwinOnly: true` |
| **soprano** | `single` | `['soprano-default']` | `soprano-default` | accepts `''`, `soprano`, `soprano-default` → canonical `soprano-default`; rejects all else | `play-tts-soprano.sh` / `play-tts-soprano.ps1` |
| **windows-sapi** | `discovered` | `null` (System.Speech) | `''` (system default) | injected-list membership; permissive fallback | null / `play-tts-sapi.ps1` (+`play-tts-windows-sapi.ps1` alias, verified on disk) |
| **windows-piper** | `discovered` | `null` (same `*.onnx` model as piper) | `en_US-lessac-medium` | same rule as piper | null / `play-tts-windows-piper.ps1` |

**Discovered providers** use the injection pattern already proven in `voicesForProvider()` (`provider-voice-catalog.js:99-123`): the caller passes `{ installedVoices }`; the catalog owns the *rule*, never the I/O. `validateVoice` returns `{ ok, canonical, reason }` — never a bare boolean, so every rejection carries a user-facing message and the accepted spelling is normalized once (kokoro case-fold at `voice-manager.sh:402` becomes catalog behavior).

### 3.2 API surface

```
getProvider(idOrAlias)                → ProviderRecord | null      (alias-normalizing)
listProviders()                       → all 7 records
providersFor(platform)                → records with runtime[platform] !== null   // 'unix'|'windows'|'darwin'
isAvailable(idOrAlias, platform)      → boolean
listVoices(idOrAlias, {installed})    → [{id, name?, gender, lang?}]
defaultVoice(idOrAlias)               → string
validateVoice(idOrAlias, voice, {installed}) → { ok, canonical, reason }
displayName(idOrAlias)                → string
```

`src/utils/provider-validator.js` keeps its exported names but `SUPPORTED_PROVIDERS` / `CROSS_PLATFORM_PROVIDERS` / `WINDOWS_RUNTIME_PROVIDERS` (`provider-validator.js:29-49`) and `getProviderDisplayName` (`:654-667`) become **derived views over the catalog** — one definition, same API. `provider-voice-catalog.js` is absorbed (its exports re-exported for back-compat; the existing `provider-voice-catalog.test.js` keeps passing).

### 3.3 Strict-at-switch, lenient-at-synth (important policy)

Membership validation is enforced where config is **written** (switch/set_voice/MCP). At **synth time** the provider scripts keep a shape check + loud warning fallback (today's `play-tts-kokoro.sh:65-70` behavior) — because a user on a newer kokoro model with a voice the shipped catalog doesn't know must degrade audibly, not brick. Escape hatch: `AGENTVIBES_ALLOW_UNLISTED_VOICE=1` bypasses membership (not shape) at switch time.

---

## 4. Consumer migration table

Every verified divergent site → what it becomes. "sources catalog.sh" = sources the generated bash artifact; "reads catalog.json" = Python; "dot-sources catalog.ps1" = PowerShell.

| # | Current site (verified) | Divergence | Becomes |
|---|---|---|---|
| 1 | `.claude/hooks/elevenlabs-voices.sh` (whole file; `declare -A` at :22, `${query,,}` at :59 — **breaks macOS bash 3.2 today**) | Hand-mirrored SSOT seed | **Generated** from catalog, same filename (so its `source` sites at `voice-manager.sh:194,427,583` and `play-tts-elevenlabs.sh` don't move), rewritten bash-3.2-safe (case-statement lookup, `tr`-based fold) |
| 2 | `src/services/provider-voice-catalog.js:17-39, 47-70` | JS mirror of #1; kokoro list canonical here only | Absorbed into `provider-catalog.js`; file becomes a re-export shim |
| 3 | `.claude/hooks/voice-manager.sh:403` | kokoro switch validated by regex only — typo `af_hart` accepted, saved, dies at model | `catalog_validate_voice kokoro "$VOICE"` from catalog.sh (membership + canonical case-fold + error text) |
| 4 | `voice-manager.sh:179-184` (list arm, ~16 hardcoded ids) | Partial divergent kokoro list | `catalog_list_voices kokoro` (all 54, grouped by lang prefix) |
| 5 | `voice-manager.sh:576-579` (list-simple arm, ~16 ids) | Second divergent partial list | `catalog_list_voices kokoro` |
| 6 | `voice-manager.sh:200-210`, `:444-454`, `:586-588` | **soprano falls through to "Unknown provider"** in list/switch/list-simple; help text omits soprano | Arms + "Available providers" help generated from `catalog_providers_for_platform unix`; soprano gets a real single-voice arm |
| 7 | `voice-manager.sh:85, 91` | piper default `en_US-lessac-medium` hardcoded | `catalog_default_voice piper` |
| 8 | `.claude/hooks/play-tts-kokoro.sh:60, 65, 75` | default ×1 + regex ×2 | default from catalog.sh; regex stays as *synth-time lenient shape check* (§3.3) but the literal comes from one sourced variable |
| 9 | `.claude/hooks/provider-manager.sh:191-195` | per-provider defaults hardcoded (`piper_default`, `kokoro_default`, `elevenlabs_default="Sarah"`, `soprano_default`) | `catalog_default_voice <p>` |
| 10 | `provider-manager.sh:218` | kokoro regex + legacy `"Rachel"` sentinel | `catalog_validate_voice` / catalog membership |
| 11 | `.claude/hooks-windows/voice-manager-windows.ps1:138` | kokoro regex validation | `Test-CatalogVoice kokoro` from catalog.ps1 |
| 12 | `.claude/hooks-windows/play-tts-kokoro.ps1:73, 77-79` | default `af_heart` + regex fallback | catalog.ps1 default; shape check stays lenient (§3.3) |
| 13 | `.claude/hooks-windows/play-tts.ps1:312` | `-ProviderOverride` allowlist **includes `elevenlabs`** on Windows (no ps1 runtime exists — verified: no `play-tts-elevenlabs.ps1` in `hooks-windows/`) | allowlist generated from `catalog_providers_for_platform windows` (+ cross-platform forwarding aliases); negative test guards it |
| 14 | `.claude/hooks-windows/play-tts.ps1:519` | kokoro shape regex (engine coupling, mirrors resolver) | **Stays** — it's resolver-seam shape logic, not inventory; conformance asserts it equals resolver `KOKORO_VOICE_RE` |
| 15 | `.claude/hooks-windows/provider-manager.ps1:20` | `$ValidProviders = @('windows-piper','windows-sapi','soprano','kokoro')` hand-maintained | Generated from catalog windows set (test already parses this literal — extractor at `provider-dispatcher-parity.test.js:49-53` reused) |
| 16 | `mcp-server/server.py:746, 748` | Two hand-coded allowlists; **Windows list includes `elevenlabs` — the live contradiction** | server.py reads `provider-catalog.json` (shipped beside hooks) with its current lists demoted to embedded fallback; conformance test asserts fallback ≡ catalog **both directions** |
| 17 | `mcp-server/server.py:755-764` | display-name dict | from catalog.json |
| 18 | `src/utils/provider-validator.js:29-49, 654-667` | canonical-by-intent sets + display names | derived views over catalog (§3.2) |
| 19 | `src/cli/list-voices.js:137-146` | four `provider ===` branches | iterate `listProviders()`; branch only on `voiceModel` |
| 20 | `.claude/hooks/personality-manager.sh:204`, `hooks-windows/personality-manager.ps1:119` | lessac default | catalog default |
| 21 | `.claude/hooks/learn-manager.sh:262` | lessac + **`"Antoni"` as elevenlabs default — not even in the 21-voice catalog** (real found bug) | `catalog_default_voice elevenlabs` (→ Sarah) |
| 22 | `.claude/hooks/bmad-tts-injector.sh:196`, `bmad-voice-manager.sh:164,175` | lessac defaults | catalog default |
| 23 | `.claude/hooks/clawdbot-receiver.sh:27`, `clawdbot-receiver-SECURE.sh:25,30`, `play-tts-agentvibes-receiver-for-voiceless-connections.sh:17` | lessac defaults + ad-hoc `ALLOWED_VOICES` pipe list | catalog default; receiver allowlist stays deliberately independent (security allowlist ≠ inventory) — documented, not migrated |
| 24 | `.claude/hooks/kokoro-tts.py:35,38`, `kokoro-server.py:168,205` (+ windows twins) | py-side default + regex | keep as last-ditch defense-in-depth; conformance asserts the literal regex/default strings match catalog (text-parse, same style as today's parity test) |
| 25 | `.claude/hooks/piper-download-voices.sh:76`, `piper-installer.sh:277-281`, `termux-installer.sh:113` | lessac as *download target* | legitimately hardcoded (installer bootstraps the default); the string itself asserted equal to catalog default |

---

## 5. The conformance test

`test/unit/provider-catalog-conformance.test.js` — one file, matrix-driven like `resolver-conformance-matrix.test.js`, reusing the text-extractor style already proven in `provider-dispatcher-parity.test.js:37-92` (which it eventually supersedes).

**Enumerated matrix: provider (7) × surface × platform (unix, windows, darwin).** Surfaces: JS API, generated `catalog.sh`, generated `catalog.ps1`, `catalog.json`, `server.py` allowlists, `provider-manager.ps1 $ValidProviders`, `play-tts.ps1:312` allowlist, `voice-manager.sh` switch/list/list-simple arms, `list-voices.js` branches, `play-tts.sh` / `play-tts.ps1` dispatch cases.

Assertion groups:

1. **Artifact freshness** — regenerate `.sh`/`.ps1`/`.json` in-memory, byte-diff against checked-in files. Any hand-edit or stale generation fails loud (replaces hand-mirror parity of `elevenlabs-catalog-parity.test.js`).
2. **Positive availability** — for every provider with `runtime[platform] !== null`, every dispatcher on that platform recognises it (current test's direction, now over ALL 7 providers, not just the cross-platform two — this is what catches the soprano fallthrough at `voice-manager.sh:200/444/586`).
3. **NEGATIVE availability (the new one)** — for every platform, `(tokens accepted by each dispatcher on that platform) ∩ (providers with runtime[platform] === null)` **must be empty**, alias-normalized. On day one this fails on `server.py:746` (`elevenlabs` in the Windows list) and `play-tts.ps1:312` — exactly the class the current test provably misses.
4. **Runtime truth** — for each declared `runtime` script name, the file exists in `.claude/hooks/` / `.claude/hooks-windows/`; conversely, if a `play-tts-<provider>.ps1` appears on disk while the catalog says `windows: null`, fail with "flip the availability flag" (so shipping `play-tts-elevenlabs.ps1` later forces the catalog update, which auto-unlocks every dispatcher).
5. **Voice rules** — per static provider: default ∈ voices; no duplicate ids; `validateVoice` accepts every catalog voice and rejects a fuzzed-typo set (`af_hart`, `Sara`, `en_US-lessac`, case variants resolving to canonical); kokoro ids all match resolver `KOKORO_VOICE_RE` and none match `PIPER_VOICE_RE`; elevenlabs ids `^[A-Za-z0-9]{20}$`.
6. **Resolver-seam parity** — catalog `engineId`s ⊆ resolver `ENGINES`; alias table ≡ `ENGINE_ALIASES`; `play-tts.ps1:519` and `kokoro-tts.py:38` literal regexes equal `KOKORO_VOICE_RE.source`.
7. **Bash-3.2 lint** — generated `.sh` contains no `declare -A`, no `${...,,}` / `${...^^}` / `${x^}` (regex scan). Fixes-and-guards the latent macOS break in today's `elevenlabs-voices.sh`.
8. **Display names** — every provider (and alias) yields a non-id display name; `server.py:755-764` dict ≡ catalog.

---

## 6. Build-time generation vs. runtime node bridge — recommendation: **generate**

The resolver chose a runtime bridge (`bin/resolve-utterance.js`) because its output depends on dozens of *live* config inputs — impossible to precompute. The catalog is the opposite: **static data, fully known at pack time.** Weighing:

| | Runtime node bridge | **Generated static artifacts (chosen)** |
|---|---|---|
| Node required at play/switch time | Yes — and `voice-manager.sh:421-423` explicitly values "works in installed deployments with no Node dependency" | No — pure `source` / dot-source / JSON read |
| Latency | ~100-300 ms node spawn per lookup | Zero |
| Python (server.py) consumption | Awkward (spawn node from python) | Natural (`catalog.json`) |
| Drift risk | None (always live) | Handled: freshness byte-diff test (§5.1) + `DO NOT EDIT — generated from src/services/provider-catalog.js` header + content hash |
| Fail-safe when artifact missing | n/a | Same pattern as resolver's `PLAN_OK` fallback (`play-tts.sh:307-322`): consumers probe for the sourced function (`type catalog_default_voice >/dev/null 2>&1`) and keep today's regex/hardcoded behavior as the legacy path — TTS never breaks on a missing catalog |

Mechanics: `scripts/generate-provider-catalog.mjs`, wired into `npm test` (regenerate + diff, so a stale artifact can't pass CI) and run by `/release`. Artifacts are **checked in** — they ship in the npm pack automatically (npm packs the working tree; freshness test protects the pack) and the installer copies them like any other hook. Generated bash targets **bash 3.2**: newline-separated lists emitted via `printf`, `case`-statement name→id lookup for elevenlabs, `tr`-based case folding — enforced by lint assertion §5.7.

**Non-destructive-config compliance:** the generated files live in the package's `hooks/` trees and are *program code*, updated on `agentvibes update` exactly like every other hook script today. No user config file (`tts-provider.txt`, `voice.txt`, `audio-effects.cfg`, `~/.claude/*`) is ever written or read by the catalog layer; installer behavior stays add/overwrite-own-hooks-only.

---

## 7. Implementation history (each phase independently shippable, test-guarded)

**Phase 0 — Canonical module + conformance v1 (pure JS, no consumer changes).**
Create `provider-catalog.js` absorbing `provider-voice-catalog.js` (re-export shim) and deriving `provider-validator.js`'s three sets + display names. Conformance test groups 2, 3, 5, 6, 8 against *existing* dispatcher files. Group 3 fails on `server.py:746` and `play-tts.ps1:312` → fix both in this phase (delete `elevenlabs` from the Windows allowlists; smallest possible diff). Existing 433 resolver tests + `provider-dispatcher-parity` + `elevenlabs-catalog-parity` all still pass untouched. *Risk: minimal — data + two-token deletions.*

**Phase 1 — Generator + artifacts.**
`scripts/generate-provider-catalog.mjs` emits `catalog.sh` (regenerating `elevenlabs-voices.sh` in place, bash-3.2-safe — fixes the latent macOS bug), `catalog.ps1`, `catalog.json`. Add freshness (§5.1), runtime-truth (§5.4), bash-lint (§5.7) assertions. No consumer sources the new files yet — zero behavior change. `elevenlabs-catalog-parity.test.js` retires into the freshness check.

**Phase 2 — Kokoro consumers (the biggest win).**
Migrate table rows 3-5, 8, 11-12: switch-time membership validation replaces the regex in `voice-manager.sh:403` and `voice-manager-windows.ps1:138`; both divergent 16-id lists become full 54-id catalog lists; `af_heart` literals sourced. Synth-time scripts keep lenient shape fallback (§3.3). Each consumer carries the resolver-style legacy fallback for missing catalog.sh.

**Phase 3 — Soprano arms + piper default constant.**
Rows 6-7, 9-10, 20: soprano gets real list/switch/list-simple arms; "Available providers" help generated; `en_US-lessac-medium` literals in hooks become `catalog_default_voice piper`.

**Phase 4 — Platform allowlists become derived.**
Rows 13, 15-17, 19: `server.py` reads `catalog.json` with embedded fallback (bidirectional parity asserted); `provider-manager.ps1:20` and `play-tts.ps1:312` generated; `list-voices.js` iterates records.

**Phase 5 — Long tail.**
Rows 21-24: `learn-manager.sh:262` "Antoni" bug, bmad scripts, receiver defaults, python literal-parity assertions. Retire `provider-dispatcher-parity.test.js` (fully superseded).

---

## 8. Risks / what could still be missed

| Risk | Defense |
|---|---|
| **Kokoro model updates add voices** → strict switch validation rejects a real voice | Lenient synth path (§3.3), `AGENTVIBES_ALLOW_UNLISTED_VOICE` escape hatch, catalog record carries the kokoro package version it was audited against |
| **Hand-edit of a generated artifact** (contributor doesn't know) | `DO NOT EDIT` header + byte-diff freshness test in `npm test` — fails before commit per CLAUDE.md testing rule |
| **Installed-tree skew**: user's `~/.claude/hooks` older/newer than package after partial update | catalog.sh exports `AGENTVIBES_CATALOG_VERSION`; consumers probe for the function and fall back to legacy behavior (resolver's proven `PLAN_OK` pattern) — degraded, never dead |
| **A future dispatcher is added and never wired into the matrix** | Conformance test enumerates dispatchers as a declared list, same as today — residual risk. Mitigation: a repo-wide grep assertion that no file under `.claude/hooks*/` introduces a *new* literal provider-name `case`/`-in` list without appearing in the test's `DISPATCHERS` table (fails on the token pattern, points at the table) |
| **Discovered providers (macos say, SAPI) can't be enumerated in CI** | Their *rules* are pure and tested with injected lists; availability is declared (darwinOnly/windows) and runtime-file-checked, not probed |
| **ElevenLabs account has voices beyond the default 21** | Raw-20-char-id passthrough preserved from `elevenlabs-voices.sh:66-69` — catalog validates names strictly, ids permissively |
| **server.py fallback list drifts from catalog.json** | Parity asserted in BOTH directions (the exact gap that let `server.py:746` pass today's positive-only test) |
| **Receiver `ALLOWED_VOICES` security allowlists** (`clawdbot-receiver-SECURE.sh:30`) conflated with inventory | Explicitly *not* migrated — a security allowlist must stay independently narrow; documented in the module header so nobody "helpfully" unifies it |

---

**Key files for review:** `src/services/utterance-resolver.js` (the pattern being mirrored), `src/services/provider-voice-catalog.js` + `.claude/hooks/elevenlabs-voices.sh` + `test/unit/elevenlabs-catalog-parity.test.js` (the seed being generalized), `src/utils/provider-validator.js` + `test/unit/provider-dispatcher-parity.test.js` (the layer being subsumed), `mcp-server/server.py:746` and `.claude/hooks-windows/play-tts.ps1:312` (the two live negative-availability violations fixed in Phase 0).
