---
title: 'Unified Setup Tab — Replace Install + LLM Tabs'
type: 'feature'
created: '2026-04-06'
status: 'done'
baseline_commit: '209a96ee'
context: ['CLAUDE.md', 'docs/architecture/provider-system.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The TUI has a 5-screen install wizard AND a separate LLM Providers tab that duplicate provider selection/config. Users see two disconnected interfaces for the same task, and there's no TTS engine selection during install. The LLM tab is redundant once providers are in the installer.

**Approach:** Merge both into a single "Setup" tab. First-run shows a 4-step wizard (Language → Dependencies → TTS Engine → Providers). Returning users skip to the Providers screen directly. Remove the LLM Providers tab entirely. Each provider's Config modal gains a TTS Engine dropdown. Settings tab simplified.

## Boundaries & Constraints

**Always:**
- Use named ANSI colors only (no hex in blessed styles/tags — Paul's terminal renders them as white)
- Reuse the existing config modal pattern from agents-tab.js (voice, reverb, bg music, pretext + new TTS engine field)
- OS-aware TTS engine list: Windows → Piper + SAPI (native); macOS → Piper + Say (native); Linux → Piper + Soprano
- Native engines (SAPI, Say) display as "Available" with no install button
- Extract provider install/remove/check functions to a shared service — do NOT leave 1000+ LOC in one file
- Per-provider config stored in audio-effects.cfg with new ttsEngine field appended
- First-run detection via configService (check if setup has been completed before)
- Tab shortcut key: `I` for Setup (same as current Install)

**Ask First:**
- If the config format change (adding ttsEngine field) risks breaking existing configs
- If any existing test files need updating beyond what's obvious

**Never:**
- Delete installer.js — it still provides copy*/install functions called during provider installation
- Break the existing agents-tab config modal — reuse its pattern, don't modify it
- Add hex colors to any blessed widget styles or tags

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh install | No .claude/config exists | Wizard starts at Step 1 (Language) | Graceful — create config dirs as needed |
| Returning user | Config exists, setup completed | Setup tab shows Providers screen directly | N/A |
| Re-run wizard | User clicks "Re-run Setup Wizard" in Settings | Wizard restarts from Step 1 | N/A |
| Windows OS | process.platform === 'win32' | Shows Piper + Windows SAPI (native) | Hide macOS Say |
| macOS OS | process.platform === 'darwin' | Shows Piper + macOS Say (native) | Hide Windows SAPI |
| Linux/WSL | process.platform === 'linux' | Shows Piper + Soprano | Hide SAPI and Say |
| No TTS installed | Dep check finds no TTS engine | Step 3 blocks continue until ≥1 engine installed | Show warning message |
| Existing audio-effects.cfg | Has llm:key lines without ttsEngine | Load gracefully, default ttsEngine to '' (global default) | Never corrupt existing config |

</frozen-after-approval>

## Code Map

- `src/console/tabs/install-tab.js` → rename to `setup-tab.js` — main Setup tab with wizard + provider UI
- `src/console/tabs/llm-providers-tab.js` — extract provider logic to service, then delete tab
- `src/services/llm-provider-service.js` (NEW) — provider check/install/remove/config functions
- `src/services/tts-engine-service.js` (NEW) — OS detection, engine availability, install commands
- `src/services/navigation-service.js` — remove 'llm-providers' from TAB_ORDER
- `src/console/navigation.js` — remove 'l'/'L' → 'llm-providers' from KEY_TO_TAB
- `src/console/footer-config.js` — remove 'llm-providers' entry, rename 'install' → 'setup'
- `src/console/tabs/placeholder-tab.js` — update TAB_DISPLAY_LABELS and TAB_SHORTCUT_KEYS
- `src/console/app.js` — remove createLlmProvidersTab import/usage, rename createInstallTab → createSetupTab

## Tasks & Acceptance

**Execution:**
- [x] `src/services/llm-provider-service.js` -- CREATE -- Extract all provider check/install/remove/config functions from llm-providers-tab.js into a shared service (checkClaudeInstalled, checkCopilotInstalled, checkCodexInstalled, installCopilotMcp, removeCopilotMcp, installCodexMcp, removeCodexMcp, buildCodexToml, loadLlmConfigSync, saveLlmConfigSync, etc.)
- [x] `src/services/tts-engine-service.js` -- CREATE -- OS detection (process.platform), list available engines per OS, check installed status, provide install commands for Piper/Soprano
- [x] `src/console/tabs/install-tab.js` → `src/console/tabs/setup-tab.js` -- RENAME + REFACTOR -- Replace 5-screen wizard with 4-step flow (Language → Deps → TTS Engine → Providers). Returning users skip to Providers. Import from llm-provider-service and tts-engine-service. Config modal per provider matches agents-tab pattern with added TTS Engine field.
- [x] `src/console/tabs/llm-providers-tab.js` -- DELETE -- All logic extracted to llm-provider-service.js
- [x] `src/services/navigation-service.js` -- EDIT -- Change TAB_ORDER: replace 'install' with 'setup', remove 'llm-providers'
- [x] `src/console/navigation.js` -- EDIT -- Remove 'l'/'L' key mapping, rename 'i'/'I' target to 'setup'
- [x] `src/console/footer-config.js` -- EDIT -- Remove 'llm-providers' entry, rename 'install' key to 'setup'
- [x] `src/console/tabs/placeholder-tab.js` -- EDIT -- Update TAB_DISPLAY_LABELS (remove llm-providers, rename install→setup), update TAB_SHORTCUT_KEYS
- [x] `src/console/app.js` -- EDIT -- Remove createLlmProvidersTab import/call, rename createInstallTab→createSetupTab, update services wiring

**Acceptance Criteria:**
- Given a fresh install, when user runs `npx agentvibes install`, then the Setup tab shows a 4-step wizard: Language → Dependencies → TTS Engine → Providers
- Given setup was previously completed, when user opens the Setup tab, then it shows the Providers screen directly (no wizard)
- Given the Providers screen, when user clicks Configure on any provider, then a modal opens with: TTS Engine, Voice, Reverb, Background Music, Pretext fields
- Given Windows OS, when TTS Engine step renders, then it shows Piper + Windows SAPI (native), and hides macOS Say
- Given the LLM Providers tab shortcut key `L` is pressed, then nothing happens (tab removed)
- Given an existing audio-effects.cfg without ttsEngine field, when loaded, then it defaults gracefully without corruption

## Verification

**Commands:**
- `npm test` -- expected: all existing tests pass (no regressions)
- `node -e "import('./src/services/llm-provider-service.js')"` -- expected: module loads without error
- `node -e "import('./src/services/tts-engine-service.js')"` -- expected: module loads without error

**Manual checks:**
- Launch TUI, verify Setup tab appears where Install was, LLM tab is gone
- On Setup tab, verify provider cards with Install/Remove/Configure buttons render
- Click Configure — verify TTS Engine field is present in the modal

## Suggested Review Order

**New Services (data layer)**

- Provider logic extracted from old LLM tab — check/install/remove/config for all 3 providers
  [`llm-provider-service.js:1`](../../src/services/llm-provider-service.js#L1)

- OS-aware TTS engine detection — platform filtering + native engine handling
  [`tts-engine-service.js:1`](../../src/services/tts-engine-service.js#L1)

**Unified Setup Tab (main deliverable)**

- Entry point: 4-screen wizard with first-run detection at show() time
  [`setup-tab.js:166`](../../src/console/tabs/setup-tab.js#L166)

- Screen 3 provider cards — Install/Remove/Configure buttons per provider
  [`setup-tab.js:350`](../../src/console/tabs/setup-tab.js#L350)

- Config modal with TTS Engine field — matches agents-tab pattern
  [`setup-tab.js:555`](../../src/console/tabs/setup-tab.js#L555)

**Navigation & Wiring (cleanup)**

- TAB_ORDER updated — 'setup' replaces 'install', 'llm-providers' removed
  [`navigation-service.js:10`](../../src/services/navigation-service.js#L10)

- Key bindings — 'I' maps to 'setup', 'L' removed
  [`navigation.js:10`](../../src/console/navigation.js#L10)

- App wiring — createSetupTab import, legacy 'install' → 'setup' compat
  [`app.js:26`](../../src/console/app.js#L26)

**Supporting (tests, config)**

- Footer config — 'setup' entry, 'llm-providers' removed
  [`footer-config.js:42`](../../src/console/footer-config.js#L42)

- Tab labels and shortcut keys updated
  [`placeholder-tab.js:40`](../../src/console/tabs/placeholder-tab.js#L40)

- Test updates — backward compat assertions for 'install' → 'setup' mapping
  [`console-app.test.js:205`](../../test/unit/console-app.test.js#L205)
