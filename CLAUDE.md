# AgentVibes — Development Guidelines

**Updated:** 2026-07-06 (v5.12.x era)

## What this is

AgentVibes (`agentvibes` on npm) gives AI coding agents a spoken voice: Claude Code hooks + MCP server + interactive TUI, with Piper/Kokoro/ElevenLabs providers, background music, per-agent BMAD voices, a remote SSH receiver, and avatar rendering. Node ESM core with **parallel bash and PowerShell runtimes** and a Python MCP server.

## Repo map

| Path | What it is |
|------|-----------|
| `src/installer.js` + `src/installer/` | npx installer (manifest-based, non-destructive) |
| `src/console/` | blessed TUI (tabs, modals, widgets) |
| `src/services/` | config-service, provider services, **utterance-resolver.js** (single source of truth for playback plans) |
| `.claude/hooks/` + `.claude/hooks-windows/` | **Shipped product code** — bash/PS1 runtime (`play-tts.sh`, `audio-processor.sh`, `bmad-speak.sh`, …) installed into user projects |
| `mcp-server/` | Python MCP server (`server.py`, pytest suite) |
| `templates/` | Remote receiver scripts (`agentvibes-receiver.sh`/`.ps1`) |
| `bin/` | CLI entry points (`agentvibes.js`, `resolve-utterance.js`, `mcp-server.js`) |
| `test/unit/` | node:test `.test.js` + bats `.bats` suites |
| `docs/implementation-artifacts/` | BMAD story files + `sprint-status.yaml` |
| `docs/architecture/` | Provider/system architecture docs |

**Everything under the repo's `.claude/` (hooks, personalities, commands, config) is the npm package payload.** Editing a hook here is a product change: it must pass tests, keep bash/PowerShell parity, and reach real installs via the installer (`manifestSafeCopy`) — not just the dev checkout. The remote receiver additionally needs an in-place redeploy to `~/.agentvibes/` + watcher restart.

## Architecture invariants (hard-won — do not regress)

1. **The utterance resolver is the single source of truth.** `src/services/utterance-resolver.js` reads all config once and emits a flat plan (voice, engine, transport, effects, music, speed, volume). Players consume the plan; they must NOT re-read config files directly. New playback behavior goes in the resolver + precedence table, not in a player script.
2. **Volume defaults are 20% (`0.20`), never 70%.** Regression-tested; covered in bash, PS, and JS.
3. **Never select TTS output by "most recent file."** Providers emit an `AV_OUTPUT:` sentinel on stdout; capture the exact filename and fail loudly on synthesis failure. The `ls -t` heuristic is retired.
4. **Kokoro voices force the kokoro engine** (an `af_*`/`am_*` voice with a piper ENGINE column = silence). The resolver encodes this; keep it.
5. **Bash/PowerShell parity.** Any change to `play-tts.sh` needs the mirror change in `play-tts.ps1` (and vice versa), plus the contract-test matrix (`AVI-S8.7`) kept green. Note the historical env-flag split: bash reads `AGENTVIBES_NO_PLAYBACK`, PS reads `AGENTVIBES_NO_PLAY` — set both.
6. **Receiver settings are keyed by project** (TTS `--project-dir` basename namespaces scene/avatar/voice). Don't wipe `glb-scenes.json` — it holds calibration.
7. **SSH senders must never force `-p 22`** — it overrides `~/.ssh/config` alias ports and silently drops TTS.

## Non-Destructive Configuration Rule (MANDATORY)

All code touching user `.claude/` or `~/.claude/` config must be non-destructive. This is enforced by real machinery — use it:

- `manifestSafeCopy()` in `src/installer.js` copies via an install manifest and refuses to clobber user-modified files. New installed files go through it.
- `configureSessionStartHook()` and friends write hooks **only when absent**.
- Never delete/overwrite user settings, voices, personalities, or `audio-effects.cfg`; custom entries must survive `agentvibes update`. A settings.json parse error must not wipe the file.
- Any function that could overwrite user data needs an idempotency test (see `test/unit/installer-config-safety.test.js`, `install-manifest.test.js`).

## Development workflow

Hybrid, in practice:

- **BMAD for planning and tracking.** Epics/stories live in `docs/implementation-artifacts/` with `sprint-status.yaml` actively maintained. Use `/sprint-planning`, `/create-story`, `/dev-story` for story-shaped work; update `sprint-status.yaml` when a story changes state.
- **Implementation happens on feature branches and git worktrees** (many active: `feat/*`, `fix/*`, worktrees like `AgentVibes-musetalk`, `AgentVibes-outfit-swap`), merged to `master`. Direct fixes, agent-driven implementation, and adversarial code-review passes are all normal — `/dev-story` is a tool, not a gate on every commit.
- **Adversarial code review before merging significant work** (see the `fix(review): …` commits); HIGH/MEDIUM findings get fixed, not deferred.
- Get explicit user approval before commits/pushes for non-story work. Paul doesn't code — do the work end-to-end via scripts; give estimates in AI time.

## Testing

- `npm test` → `scripts/run-tests.sh`: syntax check → bats suite → `node --test` with c8 coverage. **Required before committing.**
- The runner suppresses TTS audio globally (marker file `~/.agentvibes-tests-running` + `AGENTVIBES_SUPPRESS_AUDIO` + both no-play flags). Opt in to audio with `AGENTVIBES_TEST_AUDIO=true`.
- Python: `pytest` in `mcp-server/` (`test_server.py`, `test_mcp_correctness.py`, `test_windows_script_parity.py`).
- CI: `test.yml`, `test-windows.yml`, `test-macos*.yml`, `sonarcloud.yml`, `codeql.yml`, `publish.yml`.
- New regressions become permanent tests (contract-test matrix pattern) — a bug fixed without a test will come back.

## Releases — use the `/release` skill

`/release` runs the managed workflow with human checkpoints: pre-flight (coverage must pass, secret scan), version-bump recommendation, drafted RELEASE_NOTES.md + README "NEW IN" section + 8-language translations (`docs/i18n/`), then `npm version` → push → `gh release create` → optional `npm publish`, each gated on explicit approval.

- **`package.json` is the single source of truth for version.** The README badge is auto-updated by `scripts/sync-readme-version.js` via the npm `version` hook — never hand-edit it.
- **`npm publish` packs the working tree, not the git tag.** Run the pack-contents test (`test/unit/npm-pack-contents.test.js`) and never publish from a dirty tree.
- Alpha flow is normal: ship `x.y.z-alpha.N` while iterating, then promote to stable.

## Security (project-specific, enforced by tests)

- **User-supplied file paths** (custom music, config) go through the validator chain: `path.resolve()`, containment check, magic-number format validation, UID ownership check (see `audio-format-validator`, `file-ownership-verifier` and the 180-case traversal suite).
- **Hooks/shell scripts use `set -euo pipefail`**, quoted expansions, and `trap` cleanup of temp files.
- **Never display or log secrets** — no API keys/tokens in chat, logs, commits, or example data (real SSH ports/aliases were once scrubbed from tests; don't reintroduce them). Mask credentials (`key.substring(0,3) + '...'`).
- Clean up spawned processes (`try/finally` kill in JS, `finally: process.kill()` in Python) — the TUI spawns preview processes constantly.
- SonarCloud runs on CI after push; it can't run locally.

## Key references

| File | Purpose |
|------|---------|
| `docs/implementation-artifacts/sprint-status.yaml` | Live sprint/story state |
| `docs/architecture/provider-system.md` | Provider architecture |
| `BMAD-STORY-DEVELOPMENT.md` | BMAD story workflow reference |
| `AGENTS.md` | TTS protocol for AI agents using AgentVibes |
| `.claude/skills/release/SKILL.md` | Release workflow |
| `docs/feature-platform-matrix.md` | What works on which platform |
