# AgentVibes Release Notes

## 🎉 v5.13.0 — Your Voices Everywhere, With a Heads-Up

**Released:** 2026-07-15 · on `latest` — `npm install agentvibes`

What's new:

### 🖥️ Use your computer's own voices, from anywhere

Run your agents on one machine and listen on another? You can now pick the voices built into **Windows** (David, Zira, Mark) or **Mac**, and hear them right where you're sitting. AgentVibes shows you every voice and clearly marks the ones your listening device can play.

### 🗂️ All your voices in one tidy list

Piper, Kokoro, ElevenLabs, Windows, Mac, Soprano — every voice now comes from a single list, so what you see is always what you can use.

### 🔔 A "heads-up" chime before sound plays

Just before a voice line or music preview starts, you'll hear a short chime — so you always know audio is on the way, even if it takes a moment.

### 🎵 Music previews follow your sound

Preview a track and it plays wherever your audio is set to go — including on another computer.

### 🆔 Agents that introduce themselves

Turn on self-introductions and each agent says who it is when it starts — handy when a whole team is talking.

### 🛟 Your own edits are kept safe when you update

Tinkered with one of the AgentVibes files in your `.claude/hooks` folder? From this version on, updating never throws your work away. If we need to update a file you'd changed, we tuck your copy in beside it with `.user.bak` on the end — like `play-tts.sh.user.bak`.

**That file is made by AgentVibes — nothing is broken and nothing else put it there.** It's simply your old version, saved so you can peek at it or copy your changes back into the new one. Delete it whenever you're done with it.

If you customized files in an older version, it's worth a quick look in `.claude/hooks` for anything you'd want to put back.

### ✨ More voices, smoother ride

- **ElevenLabs** voices fully supported
- More **Kokoro** voices, working great on Windows
- Faster, more reliable setup on Windows
- **3,261 automated tests passing** — steady and dependable

---

## 🎉 v5.12.0 — The Fable Week Overhaul (Stable)

**Released:** 2026-07-05 · now on `latest` — `npm install agentvibes`

This turns the "Fable Week" alpha into a stable release. During a week of early access to Anthropic's new **Fable** model, we pointed it at the whole AgentVibes codebase and rebuilt the core properly.

### A stronger, shared core

Every time AgentVibes speaks it makes a lot of decisions — which voice, which engine, whether to play here or send the audio to another machine, background music, volume, mute. That logic had been copied into several separate scripts (Mac/Linux, Windows, remote, and the voice server), and the copies slowly **drifted apart** — a fix in one was missed in the others, which is why certain glitches kept coming back.

We replaced all of it with **one shared core** that every part of AgentVibes now follows — one place to fix, one place to trust. What you'll notice:

- **Kokoro voices that were silent on Linux now work everywhere.**
- **Your voice choices stick** — settings no longer get quietly overridden.
- **Volume, mute, and remote playback behave the same** across Mac, Linux, and Windows.
- **Safe by default** — if the new core isn't available on your machine, AgentVibes falls back to the old behaviour, so it never just stops talking.

### Previews now play in the right place

Previewing a voice or track used to play on whatever machine you were sitting at — which was silent if you'd set AgentVibes up to send its audio elsewhere. Now:

- **If you have SSH remote configured, previews play on your receiver; otherwise they play locally, like before.**
- This covers **voice previews** (Piper and Kokoro) from the Setup, Agent, and Settings screens, and **music/track previews** — press Space to play, Space again to stop.

### A simpler voice menu

- We **removed the redundant Voices tab.** It only ever listed Piper voices and confused people, since choosing a voice for any provider already lives in **Setup**.

### Groundwork for what's next

- The receiver now also receives the **full path of the project folder** a message came from (a new `projectPath` field, alongside the project name it already got) — laying the groundwork for upcoming enhancements.

### Reviewed before shipping

We ran three independent reviews over the changes — security, correctness, and regressions — and fixed every real issue before release.

---

## 🧪 v5.12.0-alpha.0 — The "Fable Week" Overhaul (ALPHA / testing)

**Published:** 2026-07-04 · dist-tag **`alpha`** (not `latest`). Try it with `npm install agentvibes@alpha`.

### The story behind this release

For one week, Anthropic gave us early access to their brand-new **Fable** model. Instead of keeping that to ourselves, we decided to **spend our tokens on the community** — we pointed Fable at the entire AgentVibes codebase and asked it to find everything that was fragile, duplicated, or quietly broken, and to help us rebuild it properly. This alpha is the result: a real overhaul, paid for with that week of access, so **everyone who uses AgentVibes benefits**.

### What was wrong (in plain terms)

AgentVibes has to make a lot of decisions every time it speaks — which voice, which engine, play here or send to another machine, background music on or off, how loud, muted or not. Over time, that decision-making logic had been **copied into four different places**, written in four different languages (the Mac/Linux script, the Windows script, the remote-audio script, and the voice-control server). Those copies slowly **drifted apart** — a fix made in one was missed in the others. That's why the same kinds of glitches kept coming back: a voice that played silence on one system but worked on another, volume that ignored your setting, mute that behaved differently everywhere.

### What we did

We built **one "brain"** that makes all those decisions in a single place, and everything else simply does what the brain says. One place to fix, one place to trust — which retires that whole family of recurring bugs. Concretely in this alpha:

- **Kokoro voices that played silence on Linux now work** on every system.
- **Your per-voice assignments stick** — the assistant repeating back its own settings no longer overrides them.
- **Team/party voices are back** — a hidden crash that made every agent speak with the same voice is fixed; each agent has its own voice again.
- **No more grabbing the wrong audio file** — a long-standing shortcut that could play another agent's clip is gone for good.
- **Consistent volume, mute, and remote playback** across Mac, Linux, and Windows.
- **Safety first:** if anything about the new brain isn't available on your machine, AgentVibes automatically falls back to the old behaviour — so your voice **never just stops working**.

Before shipping, we had Fable act as a tough reviewer of our own work — it caught **three real bugs and a packaging mistake** we'd have otherwise released, and we fixed them first.

**This is an alpha for testing.** `latest` is unchanged; please try it and tell us what you find. Thank you, Anthropic, for the week with Fable — and thanks to this community for making it worth spending on. 🙏

---

## 🐛 v5.11.2 — Kokoro Installer Fix (PEP 668)

**Released:** 2026-06-27

- **Kokoro voice download now works on modern Ubuntu/Debian servers.** The Setup-tab Kokoro picker installed its Python dependencies with a bare `pip install`, which fails on externally-managed Python (PEP 668: `error: externally-managed-environment`). It now detects the `EXTERNALLY-MANAGED` marker and installs with `--break-system-packages`, so Kokoro voices actually download and flip from `!` to `✓`. ([#205](https://github.com/paulpreibisch/AgentVibes/issues/205))
- **"Download all" is honest:** it prompts to install the Kokoro engine first when it's missing, and no longer reports a false "✓ complete" when nothing actually downloaded.
- Added `scripts/diagnose-server.sh` to reproduce/verify install issues on a server.

---

## 🧾 v5.11.1 — README Overhaul (docs only)

**Released:** 2026-06-27

A documentation release so the npm package page reflects the rewritten README. **No functional changes since 5.11.0.**

- Rewrote `README.md` to be value-first: a clear elevator pitch, **explained** features, and the v5.11.0 highlights — trimmed from ~2,150 lines to ~235.
- Removed the long inline version changelog; version history now lives here and in [GitHub Releases](https://github.com/paulpreibisch/AgentVibes/releases).

See **v5.11.0** below for the full feature list (Kokoro + ElevenLabs providers, combinable audio effects, provider-aware BMAD auto-assign, streamlined voices tab, rock-solid CI).

---

## 🎙️ v5.11.0 — Kokoro & ElevenLabs Providers, Unified Pickers, Windows SAPI, Rock-Solid CI

**Released:** 2026-06-26

This is a big one. AgentVibes gains two new TTS engines — **Kokoro** (high-quality local neural voices, including Chinese/Japanese/Korean) and **ElevenLabs** (premium cloud voices) — combinable audio effects, a unified selector UI, a Windows SAPI routing fix, and a deterministically green test suite. It also rolls up everything from the earlier 5.11.0 preview (LibriTTS 900+ voices, setup UX).

### 🆕 New TTS Provider: Kokoro (local neural voices)
- Browse and preview Kokoro voices from the Setup tab using the standardized picker.
- **CPU synthesis** path so it runs without a GPU.
- Smart dependency detection with in-TUI install dialogs — installs `kokoro`, `soundfile`, and `numpy` together, with a real progress bar (not just a spinner).
- **CJK support**: Chinese, Japanese, and Korean voices, with per-language `misaki` / `pyopenjtalk` dependency handling and native sample phrases.
- Windows playback fixed (Forms assembly load, correct paths, clearer exit-code errors).
- A readiness "bling" cue (bundled CC0 sound) signals when a voice is ready to preview.

### 🆕 New TTS Provider: ElevenLabs (premium cloud voices)
- API-key dialog built into the Setup tab, with a navigation hint and Escape-to-close.
- Routed through the same per-LLM voice system as every other provider.

### 🎚️ New: Combinable Audio Effects — Reverb · Echo · Chorus
Give any voice real character. A new multi-select effects modal lets you stack **reverb**, **echo**, and **chorus** independently:
- **Reverb:** Room, Hall, Cathedral, and Warm (reverb + bass).
- **Echo:** Echo (short delay) and Cave Echo (long) — brand new; there was no echo before.
- **Chorus** for a richer, doubled timbre.
- Effects **combine** (e.g. a little reverb *plus* a short echo), preview live with Space, and the picker now speaks the effect name and shows a spinner while auditioning.

### 🎨 Unified Selector Chrome
- All selector pickers (voices, tracks, reverb/effects) now share a common help bar, title style, and a fixed-width voice-row formatter — a consistent look and aligned status columns across every picker.

### 🪟 Windows SAPI Routing Fixed
- The bash hook router now recognizes the `sapi` / `windows-sapi` provider and routes to `play-tts-sapi.ps1` correctly (previously errored with "Unknown provider: sapi").

### 🎤 Voices & BMAD Tab Improvements
- **Streamlined, keystroke-only voice list.** Removed the redundant Switch / Favorite / Download button row — **Enter** selects (and downloads an uninstalled Piper voice first), **Space** previews, and **`f`** toggles a favorite ★. Thumbs-up/thumbs-down collapsed into a single favorite star.
- **Removed the confusing "Install BMAD Voices" button.** Bulk voice downloads are available from the CLI (`npx agentvibes voices download`) instead.
- **BMAD auto-assign now respects the active provider.** Pressing **[A] Auto-assign** previously always picked Piper voices; it now assigns voices from whichever provider is currently selected (Piper, Kokoro, ElevenLabs, soprano, …).

### 🎛️ Picker & Preview Polish
- **Effects preview:** correct voice + effect routing, an inline spinner on the item row, and a `pyopenjtalk` install prompt where needed.
- **Track picker:** uses an `ffmpeg → pacat` pipe on headless PulseAudio TCP servers so previews work in remote/headless setups.
- **Navigation:** pressing a tab's shortcut key while already on that tab is now a no-op.

### 🧪 Rock-Solid CI (no more flaky failures)
- Eliminated the intermittent CI red: fixed a `blessed.log()`-after-teardown crash in the Voices tab that randomly failed an innocent test file, and added a coverage runner (`scripts/run-coverage.mjs`) that gates on the actual reported test results instead of node's flaky `--test-force-exit` exit code. Real failures still fail the build; node's force-exit artifacts are tolerated.
- Test audio is fully silenced during runs (marker file + env flags) so the suite never bleeds to your speakers.

### 🐛 Audio Robustness Fixes
- `getAudioDuration()` now attaches an error listener to its `which ffprobe` probe (previously this could throw an unhandled error and crash on Windows, where `which` doesn't exist) and bounds both spawns with 5s/10s timeouts so a stalled `ffprobe` can never hang the caller.
- The interactive voice-preview prompt now releases (`pause()`) the stdin handle it opens, so the process exits cleanly instead of lingering.

### 📦 Also in 5.11.0 (earlier preview)
- LibriTTS 900+ voice library offer during install (~114 MB, 904 speakers).
- Linux Piper install now uses the project's own `piper-installer.sh --non-interactive`.
- Setup tab: spinner during engine install, smarter Tab navigation to Continue, install timeout raised to 30 minutes.

### 🛡️ Quality
- Full test suite green. New audio code covered: `audio-duration-validator` 96%, `preview-list-prompt` 90%.
- Known pre-existing: `piper-voice-manager.sh` / `piper-installer.sh` use partial shell strict mode; tracked for a future hardening pass.

---

## 🔧 v5.9.0 — SSH Remote + Windows Home Directory Fixes

**Released:** 2026-05-18

### 🐛 SSH Remote: Connection Timeout Added

The SSH remote transport could hang indefinitely if the remote host was unreachable or
slow to respond. A `ConnectTimeout=10` option is now applied to all SSH connections, so
a stuck session surfaces an error within 10 seconds instead of blocking forever.

The SSH subshell structure was also cleaned up so the process exit code is reliably
captured — a previous formatting issue could cause `wait` to report "pid N is not a
child of this shell" in some shell environments.

### 🐛 Windows: Home Directory Detection Fixed

`detectRemoteLlm()` used `process.env.HOME || os.homedir()` to find the AgentVibes
config directory. On Windows, `HOME` is typically unset, but `||` would fall through to
`os.homedir()` correctly — however `??` (null-coalescing) is strictly safer since it
only falls back on `null`/`undefined`, not on an empty string. The fix also adds test
injectability: passing a fake `HOME` in tests now reliably overrides the system value on
all platforms.

---

## 🎸 v5.8.0 — Soprano Now Works + Voice Picker Fixed for All Engines

**Released:** 2026-05-18

### 🐛 Soprano TTS Was Broken — Now Fixed

Soprano (our 80M-parameter neural TTS engine, introduced in v5.6) was silently failing on
Windows. Several issues combined to break it end-to-end:

- The Windows voice picker showed Soprano as an option but launched it with the wrong binary
  name (`soprano-tts` instead of `soprano`)
- `play-tts-soprano.ps1` was called from Node.js with a stripped PATH, so the `soprano`
  and `soprano-webui` executables couldn't be found even when installed
- The wav file path was written to PowerShell's Information stream (`Write-Host`) instead
  of stdout, so the reverb/background-music processor couldn't find it and exited with an error
- The Gradio WebUI was never auto-started — you had to manually run `soprano-webui` before
  every session

All of these are now fixed. AgentVibes auto-detects whether the Soprano WebUI server is
running on port 7860, starts it if not, and polls until it's ready (up to 90 seconds).
Three modes work in priority order: WebUI (fastest — model stays loaded) → OpenAI-compatible
API → direct `soprano` CLI.

### 🐛 Voice Picker Ignored Windows SAPI and macOS Say

When opening the voice picker for an LLM configured to use **Windows SAPI** or **macOS Say**,
the picker displayed the full list of Piper voices instead of the engine's built-in voice.
This was confusing — selecting a Piper voice while using SAPI or macOS Say had no effect,
and the Space-bar preview played through the wrong engine.

The picker now adapts to whichever engine is selected:

- **Windows SAPI / macOS Say / Soprano:** shows exactly one item (the engine's built-in voice),
  auto-selects it, and the Space-bar preview speaks through the correct engine binary
- **Piper:** shows the full installed-voice catalog as before

Additionally, saving the config no longer silently overwrites the `ttsEngine` field to `piper`
when a native engine is in use.

### 🔒 Soprano Reliability (9 Adversarial-Review Fixes)

- **Crash fix:** socket `destroy()` could emit a late `error` event with no listener,
  crashing the Node.js process — an absorber handler is now in place
- **Loop cancellation:** the 90-second WebUI polling loop now stops immediately when
  the modal or voice picker is closed (via AbortController)
- **No unhandled rejections:** `.catch()` handlers added to all async WebUI-check calls
- **No duplicate processes:** a 10-second cooldown prevents spawning two `soprano-webui`
  instances when Preview is clicked rapidly
- **Better error feedback:** spawn failures and non-zero exit codes now surface a visible
  error label in the voice picker instead of silently resetting
- **PATH preserved:** the PowerShell PATH refresh now appends registry entries rather than
  replacing the whole PATH, so nvm, conda, and pyenv shims continue to work

---

## 🎭 v5.7.7 — Party Mode Voice Restore + Polish

**Released:** 2026-05-17

### 🐛 BMAD Party Mode Agents Silent (No Per-Agent TTS)

Party mode agents were displaying responses in text but not speaking with their unique voices. Two root causes:

**Skill disambiguation:** `/party-mode` was matching the upstream BMAD `_bmad/core/workflows/party-mode` command (which tries to load a path that doesn't exist in this project) instead of the AgentVibes skill. A project-local `/party-mode` command override now routes to the correct skill.

**Mandatory TTS step:** The orchestrator's `bmad-speak.js` call step was underspecified, so it was sometimes skipped. Step 4 in the BMAD party mode skill is now clearly marked MANDATORY, with explicit documentation of what `bmad-speak.js` applies per agent: voice, pretext, reverb, personality, and background music — all loaded automatically from `~/.agentvibes/bmad-voice-map.json`.

### 🔍 Party Mode Debug Logging

`bmad-party-speak.sh` (PostToolUse hook) now writes structured diagnostic entries to `/tmp/agentvibes-party-debug.log` — `fired`, `fingerprint HIT/MISS`, `invoking`, and errors — so voice issues are diagnosable without guessing.

### 🎵 New Bundled Track: CelestialVelvet

A new ambient music track **CelestialVelvet** (🌌) has been added to the built-in catalog. Available immediately in the TUI music picker and BMAD voice map — no download required.

### 🐛 TUI: Gray Text on Selected Rows Fixed

White text now renders correctly on selected rows in the Voices and Agents tabs. Previously `bright-black` foreground combined with green background produced unreadable gray text in many terminals.

### 🐛 SSH Remote: "wait: pid is not a child of this shell" Error

`play-tts-ssh-remote.sh` would emit `wait: pid X is not a child of this shell` on certain shells. Fixed by spawning `ssh` directly inside the background subshell so `$?` captures the exit code without a cross-shell `wait` call.

---

## 🔧 v5.7.6 — SSH Remote Payload Integrity + Receiver Rewrite

**Released:** 2026-05-16

### 🐛 SSH Remote Playing Wrong Music and Voice

When using the SSH remote TTS feature, the wrong project's music track and voice were being applied. Root cause: `CLAUDE_PROJECT_DIR` was not forwarded to the sender, causing it to fall back to the global config instead of the active project's `audio-effects.cfg`.

### 🐛 Bash Receiver Incompatible with JSON Payload Format

The Linux/Termux bash receiver (`agentvibes-receiver.sh`) was using a positional-argument format from pre-v5.5 and could not decode the current base64 JSON payload at all. The receiver has been fully rewritten to match the PowerShell receiver's logic: decodes base64, parses JSON, applies voice/music/effects/volume, and validates all fields.

### 🐛 Personality Intro Heard Twice on Remote

The personality pretext (e.g., "Bcs latin dance here") was being spoken twice when using SSH remote TTS. Root cause: `play-tts.sh` already prepends the pretext to the speech text before calling the sender; the sender was also packing it into the JSON `pretext` field, causing the receiver to prepend it again. The `pretext` JSON field is now intentionally left empty — the personality is delivered via the `text` field only.

### 🆕 SSH Host Alias Visible in Settings Tab

The configured SSH remote host alias is now displayed in the Settings and Voices tabs so users can confirm which remote machine TTS is targeting without opening config files.

### 🔒 Security Fixes

Input validation improvements in the SSH remote sender and receiver.

### 🧪 24 New BATS Tests

- 15 SSH remote payload tests: verify voice, music track, volume, reverb/effects, pretext handling, LLM identifier, project config precedence, and JSON validity
- 9 end-to-end round-trip tests: sender builds payload → receiver decodes and applies all fields simultaneously, catching regressions in either end

---

## 🖥️ v5.7.5 — TUI Button Contrast + BMAD Routing Fixes

**Released:** 2026-05-13

### 🐛 TUI Button Focus: Grey Text Eliminated Across All Terminals

Focused and selected buttons in the TUI (voices, music, settings, setup tabs) displayed light grey text on light-blue backgrounds in many terminals. Root cause: `bold: true` combined with a dark foreground triggers terminal "bright mode," rendering the color as grey regardless of shade.

**Fix:** All button focus states now use **white text on dark green (`#2e7d32`) background** — the same high-contrast pattern already used by the Agents tab. Explicit `focus`/`blur` handlers were added to setup-tab modal buttons to prevent `attachBtnBlink` from interfering with blessed's passive `style.focus` color application.

### 🐛 BMAD Tab Voice Picker ♪ Indicator Not Showing

The ♪ preview indicator in the BMAD tab voice list didn't appear during preview. The Agents tab was missing `_refreshVP()` calls that the Settings tab already had. A 2-second minimum display timer now keeps the indicator visible when SSH-remote exits immediately (fire-and-forget mode).

### 🐛 Non-Interactive Install: Generic Pretext Instead of Project Name

Running `agentvibes install` non-interactively always set the pretext to `"Claude Code here"` regardless of project. The installer now derives a project-aware pretext from `path.basename(process.cwd())` with capitalization (e.g., `"MyProject here"`), with a safe fallback for Docker root paths.

### 🐛 Global Pretext Overriding Per-Project Config

`seedAllLlmDefaultsSync` was seeding project-level LLM rows with the global pretext string, causing the global `"Claude Code here"` to override per-project `tts-pretext.txt` values. Project-level rows are now seeded with empty pretexts so the per-project file takes precedence.

### 🐛 `screen`/`tmux` TERM Variant Caused `plab_norm` Capability Error

When `TERM` was set to a `screen-*` or `tmux-*` variant, blessed threw a `plab_norm` terminal capability error on startup. The app now overrides `TERM` to `xterm-256color` before creating the blessed screen when such a variant is detected.

### 🐛 BMAD Per-Agent Music/Reverb Not Reaching SSH Receiver

`play-tts.sh` was not forwarding `AGENT_PROFILE_FILE` to the SSH remote transport, so per-agent background music and reverb overrides in the BMAD tab were silently ignored for remote audio. The profile file path is now passed as argument 4 to `play-tts-ssh-remote.sh`.

### 🐛 Node 18 Compatibility: `import.meta.dirname` Replaced

A test file used `import.meta.dirname`, available only in Node 21+. Replaced with the `fileURLToPath(import.meta.url)` pattern so tests run correctly on Node 18 and 20.

---

## 🎭 v5.7.0 — BMAD v6.6 Support + Windows Auto-Restart Watcher

**Released:** 2026-05-11

### 🆕 BMAD v6.6.0 Compatibility

BMAD v6.6 restructured where agents live — they moved from `_bmad/bmm/agents/` to `.claude/skills/*/agents/`. AgentVibes now detects and scans these new paths correctly.

**TTS injection** gracefully skips v6.6+ agents (which use plain Markdown without XML/YAML activation sections) instead of throwing errors. The install summary now clearly reports how many agents were skipped vs. modified.

**BMAD tab detection** now finds globally-installed BMAD at `~/_bmad` (home-dir install) in addition to project-local installs. Previously the BMAD tab showed "Not detected" even when BMAD was installed globally.

**Security:** The installer's path validation now correctly permits BMAD paths under the user's home directory, fixing a false-positive "Invalid BMAD path" error for global installs.

### 🆕 Windows TTS Watcher — Standalone File + Auto-Restart

`tts-watcher.ps1` is now extracted to `~/.agentvibes/tts-watcher.ps1` as a standalone file. Running `npx agentvibes update` now copies the latest watcher to that location **and** automatically restarts it — so both the watcher script itself and its running process are updated in one step. No manual file replacement or restart needed after updates.

### 🐛 Windows Provider Override Respected on Laptop

`play-tts.ps1` now reads the `ProviderOverride` setting from the Linux-side config when receiving audio via SSH. Previously the laptop always used its locally-configured provider even if the server specified a different one.

### 🐛 Sample Command Added to Voice Manager

`voice-manager.sh sample` was missing its handler — calling it fell through to the usage/exit path silently. Fixed.

### 🐛 Preview SSH Routing Detects Correct Endpoint

`provider-manager.sh` now includes `detect_routing_llm()` which checks `AGENTVIBES_LLM_KEY` then `transport-config.json` for the first `mode=remote` entry, so preview audio reaches the correct SSH host.

---

## 🔇 v5.6.9 — Reverb & Background Music Silent in NPX Installs

**Released:** 2026-05-09

### 🐛 Reverb and Background Music Silently Broken for All NPX Users

When AgentVibes is installed via `npx`, hook files are extracted from the tarball with 644 permissions — no execute bit. `play-tts-piper.sh` called `audio-processor.sh` directly, which exits immediately with code 126 (Permission denied) on a non-executable file. Every `npx`-installed user was getting voice-only TTS — no reverb, no background music, silently.

**Fix 1:** `play-tts-piper.sh` now calls `audio-processor.sh` via `bash "$SCRIPT_DIR/audio-processor.sh"`, bypassing the execute-bit check.
**Fix 2:** `install-deps.js` (postinstall) now runs `ensureHookPermissions()` to `chmod 755` all `.sh` files after npm install.

### 🐛 Voice Browser Preview Ignored Reverb and Background Music

The **Preview** button in the Voice Browser played raw piper output with no reverb and no background music, bypassing `audio-processor.sh` entirely.

**Fix:** Preview audio now routes through the same `audio-processor.sh` pipeline as real TTS.

### 🐛 MCP `text_to_speech` Returned Garbled File Path and Missing Voice Info

The tool extracted the audio file path incorrectly (trailing size/emoji characters included) and never reported the voice name in its response.

**Fix:** ANSI codes are stripped before parsing, the `.wav` path is cleanly extracted, and the `🎤 Voice used:` line is included in the tool response.

### 🐛 Background Music TUI Toggle Didn't Take Effect

Enabling background music in the **Music** tab wrote to `config.json` but not to `background-music-enabled.txt` (read by bash hooks). Music stayed off after toggling. Saving a track also now implies enabling music.

---

## 🐧 v5.6.8 — WSL Voice Routing Fixed + Session Lifecycle Reliability

**Released:** 2026-05-09

### 🐛 WSL: Configured Voice Now Plays (Not Lessac Fallback)

In WSL sessions, AgentVibes was playing `en_US-lessac-medium` regardless of what voice you configured. The root cause: `pipx` installs Piper to `~/.local/bin/`, which interactive shells get via `.bashrc`/`.zshrc`, but Claude Code's Bash tool calls run non-interactively and skip profile sourcing — `command -v piper` failed, falling back to the default voice.

**Fix:** `play-tts-piper.sh` now prepends `~/.local/bin` and the pipx Piper venv bin to `PATH` before the binary check, so Piper is found regardless of shell mode.

### 🐛 Per-Project Voice/Music Lost When `CLAUDE_PROJECT_DIR` Not in Bash Environment

When Claude Code runs a Bash tool call, `CLAUDE_PROJECT_DIR` is not passed in the environment. The TTS hooks couldn't find per-project config and fell back to global defaults — wrong voice, wrong music, no pretext.

**Fix:** `session-start-tts.sh` (and `.ps1`) now bakes the project directory into the injected hook command as `--project-dir`. `play-tts.sh` reads this flag before any config lookup, so per-project routing is reliable in every Bash tool call.

### 🐛 `play-tts-piper.sh` and `play-tts-piper.ps1` Not Deployed by `agentvibes install`

These hooks were missing from `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS`, so `agentvibes install` never propagated updated versions to `~/.claude/hooks/`.

**Fix:** Both are now in the critical hooks list and always deployed on install/update.

### 🐛 Voice Display Name Bugs

- `uniquifyVoiceName("Mary-1")` returned `"Mary-1 Bell"` instead of `"Mary Bell"`.
- 16Speakers names like `Rose_Ibex` were incorrectly getting a surname appended (`"Rose Ibex Bell"`).
- `🎤 Voice used:` line was missing from WSL bash output.

All three fixed. A new test file (`test/unit/voice-names.test.js`, 16 tests) covers these cases.

---

## 🪟 v5.6.7 — Windows Preview Fixed

**Released:** 2026-05-08

### 🐛 Preview Button Now Works Correctly on Windows

When configuring audio per LLM on Windows, clicking **Preview** was playing the wrong voice (defaulting to Windows SAPI) with no background music or reverb. Now it plays exactly the voice, reverb, and background track you configured.

### 🧪 Regression Tests Added

Two new Windows CI tests verify the preview config lookup — so this can't regress silently in a future release.

---

## 🎵 v5.6.6 — Preview Button Works in WSL + Comprehensive Windows Test Suite

**Released:** 2026-05-08

### 🐛 Background Music Silently Missing from Preview (npm link / Global Install)

When you clicked **Preview** in the LLM configure modal with a background track set, you heard only the voice — no music — unless AgentVibes was installed as a local dependency. Fixed regardless of how you install AgentVibes.

**Root cause:** In `npm link` and global-install setups, a sync script using `rsync --delete` periodically erased `background-music-enabled.txt` from the package directory because the file is gitignored. After deletion, `audio-processor.sh` fell back to a global config that had music disabled — silence.

**Fix:** `audio-processor.sh` now checks `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt` **first**. The TUI Preview also writes the flag to the project directory (not the package directory), so it survives any package-dir sync.

### 🐛 Per-LLM Config Not Found in npm link / Global Installs

In the same setups, `audio-processor.sh` couldn't find per-LLM audio configuration (voice, reverb, background track) when your project wasn't the AgentVibes package itself.

**Fix:** The script now searches `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg` before falling back to the package config.

### 🐛 Background Track "Not Found" After Correct Config

When a background track was configured but AgentVibes was installed globally or via `npm link`, the track file couldn't be found — only the package directory was searched.

**Fix:** `audio-processor.sh` now also searches `CLAUDE_PROJECT_DIR/.claude/audio/tracks/` when the track isn't in the package directory.

### 🐛 LLM Config Row Parsing — Volume Absorbing Extra Columns

With a full 7-column LLM row (the format the TUI writes), the volume field absorbed all trailing columns. ffmpeg received a malformed volume string and silently fell back to voice-only audio.

**Fix:** Parser now captures only the numeric volume field, leaving extra columns in `_rest`.

### 🧪 Windows CI Test Suite

Windows-native tests now run in CI alongside the Linux BATS suite, gating publishing so Windows-specific paths can't regress silently.

---

## 🛡️ v5.6.4 — Critical Uninstall Safety Fix

**Released:** 2026-05-08

### 🐛 `--global` Uninstall No Longer Wipes ~/.claude/

With `--global`, the uninstaller was removing `~/.claude/` recursively rather than only the AgentVibes-owned paths within it. This caused total data loss — settings, CLAUDE.md, skills, plugins, MCP configurations, custom tools, everything. Confirmed real, confirmed fixed.

**v5.6.4 performs a surgical removal — only paths AgentVibes installed:**

- `~/.claude/hooks/`, `hooks-windows/`, `commands/agent-vibes/`, `personalities/`, `audio/`
- `~/.agentvibes/` — fully AgentVibes-owned, removed entirely
- `settings.json`, `CLAUDE.md`, skills, plugins, MCP configs — **untouched**

A regression test now enforces this in CI. If anyone reintroduces broad deletion, the build fails:

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

This can't quietly regress — it will break the build first.

---

## 🌟 v5.6.3 — AgentVibes Comes to Hermes + Easier Remote Setup

**Released:** 2026-05-07

### 🎉 AgentVibes Now Works with Hermes

**[Hermes](https://github.com/NousResearch/hermes-agent)** is one of the most popular open-source AI agents on GitHub — 21,000+ stars and growing. AgentVibes now integrates with it out of the box: when Hermes finishes a response, AgentVibes speaks it aloud through your speakers automatically. No extra setup beyond installing the included hook.

### 🎉 Per-LLM Audio Destination — Pick Where the Voice Comes From

When you configure an LLM in AgentVibes (Claude Code, Copilot, Codex, or Hermes), you already could set a unique **voice, reverb style, background music, and intro prefix** for each one. Now you can also set the **audio destination** per LLM:

- **Local** — play through the speakers on the computer you're working on
- **Remote** — send audio to a different machine (your laptop, for example) while you work on a remote server or run Hermes in the cloud

### 🎉 SSH Alias Picker — No More Typing Paths

Setting up remote audio used to require typing an SSH path by hand. Now there's a **dropdown right in the AgentVibes TUI** that reads the SSH aliases already on your machine. Pick the one that points to your speakers — done. Your voice follows you whether you're local or remote.

### 🐛 Fixes

- **No audio at all** — some setups would get complete silence with no error message. Fixed.
- **Wrong voice playing** — in some configs, AgentVibes would ignore your per-LLM voice settings and fall back to the default. Fixed.
- **Audio settings leaking between messages** — music or reverb set for one message could accidentally carry over to the next one. Fixed.
- **Lost messages after a crash** — if AgentVibes crashed mid-message, that message was gone. It now recovers and replays it when it restarts.

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

**Released:** 2026-05-02

### 🎉 Per-Message Override: Voice, Music, Reverb, Volume

Remote senders (Hermes, SSH remote provider) can now control every audio parameter **per message** without touching the receiver's persistent config:

- **Music** — pass `"music": "bachata"` (keyword) or full filename to switch background track for that message
- **Volume** — pass `"volume": "0.35"` to adjust music volume for that message  
- **Reverb** — pass `"effects": "medium"` (`off`/`light`/`medium`/`heavy`/`cathedral`) to set reverb per message
- **Voice** — already worked; now documented with full field reference
- **Pretext** — pass `"pretext": ""` to suppress the intro prefix for a single message

Previously these fields were parsed by the receiver and queued but **never applied** — `play-tts.ps1` didn't read the `AGENTVIBES_OVERRIDE_*` env vars the watcher set. Fixed.

### 📚 Hermes Skill: Full Payload Field Reference

`agentvibes-target` SKILL.md now documents all 9 JSON payload fields with examples so Hermes (or any AI agent) can say "switch to chillwave", "add reverb", "use a female voice", "remove the intro prefix" — and it just works.

### 🐛 Hermes Hook: handler.py + HOOK.yaml now ship in the package

`docs/hermes/skills/tts/hermes-agentvibes-hook/` was missing `handler.py` and `HOOK.yaml` — only `SKILL.md` was included. Both files now ship. `handler.py` also reads `AGENTVIBES_MUSIC` from the environment so the default background music is configurable without editing the file.

---

## 🤖 v5.6.1 — Hermes Agent Integration & Windows PS5.1 Fixes

**Released:** 2026-05-01

### 🎉 Hermes Agent Integration (New!)

AgentVibes now officially supports **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — the self-hosted, self-improving AI assistant. Two production-ready Hermes skills ship in `docs/hermes/skills/`:

**`hermes-agentvibes-hook`** — Auto-speaks every Hermes response via AgentVibes
- Fires on every `agent:end` event (Telegram, Discord, CLI, etc.)
- Strips markdown, code blocks, emoji before speaking
- Truncates at word boundaries, rate-limits to prevent queue flooding
- MITM-safe SSH with `StrictHostKeyChecking=accept-new` + persistent `known_hosts`
- Full logging to `tts-hook.log` for debugging

**`agentvibes-target`** — Teaches Hermes to send any text to your speakers on demand
- Base64 JSON payload over SSH (same ForceCommand architecture as the Windows receiver)
- Supports Windows and Android targets
- Detailed troubleshooting guide included

**Install:** Copy the skill to your Hermes home and restart the gateway:
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Windows PS5.1 Bug Fixes

- **play-tts.ps1 PS5.1 compatibility** — Fixed three regressions from v5.6.0 rebase:
  replaced PS7 null-conditional (`?.`) with PS5.1-compatible if/else, added UTF-8 BOM so
  em-dash literals aren't mangled by CP1252, restored piper provider alias and
  `AGENTVIBES_TEXT_FILE` sentinel lost in merge
- **Modal & hotkey fixes** — Modal escape key, navigation hotkeys, Q+Caps Lock, and voice
  preview error handling all repaired
- **BMAD tab** — Now shows all agents regardless of module

---

## 📸 v5.6.0 — TUI Screenshots & Documentation Cleanup

**Released:** 2026-04-28

### 📸 TUI Screenshots Added

Added real screenshots of every major TUI tab to the README:

- **Setup tab** — LLM Providers screen (Claude Code, Copilot, Codex, Default)
- **Configure dialog** — Per-LLM audio config (voice, pretext, reverb, music)
- **Voice Browser** — Select Voice dialog with alpha-jump, thumbs up/down, 914 voices
- **Music tab** — Built-in tracks list with preview and toggle
- **BMad tab** — Agent voice assignment (voice, reverb, music, pretext per agent)

### 🧹 Documentation Cleanup

- Removed all `npx agentvibes-voice-browser` references (tool retired, replaced by TUI)
- Renamed "Voice Browser" section to reflect TUI-native access via Setup → Configure → Voice
- All image paths now use absolute GitHub raw URLs (renders correctly on npmjs.com)
- Fixed BMad section placeholder screenshot replaced with real screenshot

---

## 🎵 v5.5.0 — Per-LLM Audio Routing & Windows Installer Resilience

**Released:** 2026-04-27

### 🆕 Per-LLM Audio Routing
Each LLM (Claude Code, Copilot, Codex) can now have its own voice, pretext, reverb, and
background-music settings. The MCP server passes `--llm <key>` to both `play-tts.sh`
(Linux/macOS) and `play-tts.ps1` (Windows), and the scripts look up `llm:<key>` rows in
`audio-effects.cfg`. Default rows for `claude-code`, `copilot`, and `codex` ship out of the
box; configure them via **Setup → Default → Configure** in the TUI.

### 🐛 Windows Installer Crash Fix
Fixed `spinner.info is not a function` error that crashed AgentVibes **reinstalls** on Windows
when users had an older global install. All 10 file-copy functions in the installer now wrap
their spinner with `createRobustSpinner()` so stale callers can never cause a crash regardless
of which methods they expose.

### 🎶 Windows Background Music Parity
Windows TTS playback now prefers `ffplay` (sinc resampling, no artefacts) over the low-quality
WinMM `SoundPlayer` resampler. The new `Invoke-AudioPlay` helper handles the fallback
transparently — if `ffplay` is unavailable, `SoundPlayer` is used as before.

### 🎉 Party Mode Cross-Platform Entry Point
BMAD party mode step files and the Copilot skill now consistently reference
`node bin/bmad-speak.js` — the single cross-platform entry point that delegates to
`bmad-speak.ps1` on Windows and `bmad-speak.sh` elsewhere.

### 🔧 Other Fixes
- `play-tts.sh` now accepts a named `--llm <key>` flag in addition to the `LLM_PROVIDER` env var
- `mcp-server/server.py` routes `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK`
  priority chain and forwards the resolved key as `-llm`/`--llm` to TTS scripts
- Added `audio-effects.cfg` rows for `llm:claude-code`, `llm:copilot`, `llm:codex`
- Added `command-routing.test.js` and `ConfigService` unit tests
- npm pack content guard now catches untracked publishable files

### 📊 Technical
- 231 tests passing (0 failures)

---

## 🎛️ v5.4.0 — TUI Installer, Spinner Fix & Dependency Cleanup

**Released:** 2026-04-22

### ✨ New
- **TUI Installer**: Interactive terminal UI for guided installation — browse voices, configure providers, enable BMAD party mode, all from a beautiful terminal interface
- **Cross-Platform Spinner Fix**: Resolved `spinner.info is not a function` crash on WSL/Linux that blocked installation

### 🐛 Bug Fixes
- **Removed circular self-dependency**: `package.json` was depending on `agentvibes@^3.5.9` (itself), causing npm to shadow the fixed binary with the old buggy one — the silent cause of the spinner crash on repeat installs
- **Restored background music volume fallback**: `audio-processor.sh` `bg_volume="0.20"` fallback lost in merge was restored
- **Fixed PROJECT_ROOT detection in `play-tts.sh`**: Walk-up logic was going 2 levels too far, causing TTS to use global `~/.agentvibes` config instead of project config

### 🔧 Technical
- 706/738 tests passing

---

## ✨ v3.5.10 - Soprano Detection Fixes & Enhanced Installer Features

**Release Date:** February 14, 2026

### 🎯 Summary

Production release combining critical bug fixes and new installer features. Fixed Soprano TTS detection for pipx installations (the core issue reported by users), resolved 5 execSync API misuse bugs that were breaking Python package detection, and eliminated 100+ lines of code duplication. Introduces new installer features: custom music track support with preview functionality, personality emoji mapping for better visual recognition, and pretext configuration allowing users to customize agent introductions.

### ✨ Key Features & Fixes

**🔧 Critical Bug Fixes:**
- **Soprano TTS Detection:** Fixed detection when installed via pipx (was showing "not installed" despite working)
- **execSync API Bugs:** Fixed 5 locations using incorrect API signature (array args with execSync)
- **Code Duplication:** Eliminated 100+ lines of duplicate code between Soprano and Piper validators
- **API Consistency:** All provider validation functions now return consistent response structures
- **Python Package Detection:** Fixed broken Python pip detection that was silently failing

**🎨 New Installer Features:**
- **Custom Music Tracks:** Users can now upload and preview their own background music
- **Personality Emojis:** Visual recognition mapping (😊 for none, 🎭 for dramatic, 💁 for sassy, etc.)
- **Pretext Configuration:** Custom agent introductions (e.g., "FireBot: " prefix for all messages)
- **Track Preview:** Audio preview with support for ffplay, sox, and mpv players

**🛡️ Security & Quality:**
- Improved path traversal protection in provider validation
- Enhanced error handling and logging
- Reduced code complexity by 29% through deduplication
- Test coverage improved: 56.61% → 63.67%

### 📊 Technical Details

**Soprano Detection Improvements:**
- Checks command in PATH first (most reliable for pipx)
- Falls back to ~/.local/bin directory check
- Checks pipx venv directory for installation
- Final fallback to Python pip package detection
- Consistent error messages showing all checked locations

**Code Quality Metrics:**
- File size reduced by 145 lines (-29%)
- Code duplication eliminated (was ~100 lines)
- Test coverage improved +7.06%
- All 114 tests passing
- Provider validator now 63.67% covered (up from 56.61%)

**Installer Enhancements:**
- Added personality emoji mapping (26 personalities)
- Custom track upload with validation
- File type restrictions (.mp3, .wav, .ogg, .m4a)
- Registry storage in ~/.agentvibes/custom-tracks.json
- Audio preview before finalizing selection

### 🔒 Security Notes

- All spawnSync calls now use correct array argument form
- Path traversal prevention maintained in all operations
- HOME injection protection via os.homedir()
- No hardcoded credentials introduced
- Input validation for file uploads and track selection

### 🐛 Known Limitations

- Audio preview requires ffplay, sox, or mpv (feature gracefully degrades if unavailable)
- Custom track registry is stored locally per user
- Some legacy bash scripts still lack strict mode (pre-existing, low risk)

### 🙏 Acknowledgments

This release includes fixes identified through adversarial code review, ensuring production-quality reliability and security alignment with CLAUDE.md standards.

---

## 🛡️ v3.5.8 - Provider Validation Security & UX Improvements

**Release Date:** February 12, 2026

### 🎯 Summary

Critical security and reliability update for provider detection. Fixes command injection vulnerabilities in validation code, prevents HOME directory injection attacks, and improves UX with explicit provider detection messaging. Soprano TTS installed via pipx is now correctly detected (previously showed "not installed" due to ES module import error). All 8 critical code review issues resolved with comprehensive security hardening and enhanced error reporting.

### ✨ Key Improvements

- **🔐 Security Fixes:** Fixed command injection vulnerability (template strings → array form), prevented HOME injection attacks, added path traversal protection
- **✅ Provider Detection:** Soprano via pipx now correctly detected; added checkedLocations tracking for transparency
- **💬 Better Messaging:** Explicit "Detected and selected!" confirmation; detailed error messages showing what was checked
- **🧪 Test Coverage:** Enhanced tests verify actual detection values, not just types
- **🐛 Debugging:** Added [DEBUG] logging for troubleshooting provider issues

### 🔴 Critical Fixes

1. **Command Injection Prevention** - All execSync calls now use array form (security: CLAUDE.md)
2. **HOME Directory Injection** - Switched to os.homedir() instead of process.env.HOME
3. **Path Traversal Protection** - Added path.resolve() validation for pipx venv directories

### 🟡 Medium Fixes

4. **Pipx Logic Improved** - Tracks checked locations even on success (transparency)
5. **Silent Failures Eliminated** - Added [DEBUG] error logging for diagnostics
6. **Test Quality Enhanced** - Verify message content, not just types
7. **Documentation** - Added JSDoc comments explaining security-critical imports
8. **Error Differentiation** - Better distinction between different failure types

### 📊 Technical Impact

- Soprano detection now works reliably for both pip and pipx installations
- Reduced false negatives in provider validation
- Enhanced security posture aligned with CLAUDE.md security mandates
- Improved debuggability with explicit error messages

---

## 🔧 v3.5.7 - CLI Fix: npx Command Output & Startup Hooks

**Release Date:** February 12, 2026

Fixes critical bug where `npx agent-vibes install` and other commands produced no output, making CLI unusable. Root cause: bin/agent-vibes used dynamic import without passing arguments to installer.js on local execution. Also removed broken hook configurations (pre_compact.py, notification.ts) that didn't exist and caused startup errors in Claude Code settings.

### 🎯 What's Fixed

- **npx agent-vibes now works** - `npx agent-vibes install`, `npx agent-vibes --help`, all commands produce proper output
- **Startup hook errors gone** - Removed non-existent hook references from settings.json (pre_compact.py, notification.ts)
- **CLI execution proper** - Both npx and local execution now use execFileSync with proper argument passing

### 🚀 Technical Details

**Before v3.5.7:**
```javascript
// bin/agent-vibes (local execution path)
import('../src/installer.js');  // ❌ No args, doesn't await
```

**After v3.5.7:**
```javascript
// bin/agent-vibes (all execution paths)
execFileSync('node', [installerPath, ...arguments_], {
  stdio: 'inherit',
  cwd: isNpxExecution ? path.dirname(__dirname) : process.cwd(),
});  // ✅ Passes args, proper I/O
```

---

## 🔧 v3.5.6 - Bug Fix: Bash Hook Parameter Handling

**Release Date:** February 11, 2026

Fixes critical regression in v3.5.5 where bash hooks failed with unbound variable errors when called with optional parameters under strict mode. Affects `play-tts.sh` and `provider-manager.sh`.

---

## 📦 v3.5.5 - Native Windows Support: Soprano, Piper & SAPI Providers

**Release Date:** February 12, 2026

### 🎯 Why v3.5.5?

v3.5.5 brings **native Windows support** to AgentVibes with a full-featured PowerShell installer and three TTS providers. Windows users no longer need WSL - AgentVibes runs natively with Soprano (neural), Piper (offline neural), or Windows SAPI (zero-setup) voices. The installer also adds **background music selection** (16 genre tracks), **reverb/audio effects** (via ffmpeg aecho), and **verbosity control** for the TTS experience.

### 🚀 Key Highlights

#### 🖥️ Native Windows TTS (NEW!)
- **3 providers**: Soprano (ultra-fast neural), Piper (offline neural), Windows SAPI (built-in)
- **Beautiful PowerShell installer** with figlet banner and interactive setup
- **8 hook scripts** for complete TTS functionality on Windows
- **MCP server** auto-resolves `.sh` to `.ps1` on Windows
- **46 Windows-specific unit tests** with full coverage

#### 🎵 Background Music Selection
- **16 genre tracks**: Flamenco, Bachata, Bossa Nova, City Pop, Chillwave, and more
- **Interactive picker** in the installer with descriptions
- **ffmpeg mixing**: 2s intro, voice over music, 2s fade-out outro

#### 🎛️ Reverb / Audio Effects
- **5 reverb levels**: Off, Light, Medium, Heavy, Cathedral
- **ffmpeg aecho filter** (no SOX dependency on Windows)
- Applied before background music mixing for clean layering

#### 🔊 Verbosity Control
- **3 levels**: High (full reasoning), Medium (key updates), Low (essential only)
- Integrates with session-start-tts.ps1 protocol instructions

### 🤖 AI Summary

AgentVibes v3.5.5 delivers native Windows support with a polished PowerShell installer offering three TTS providers (Soprano neural, Piper offline, Windows SAPI), background music selection from 16 genre tracks, reverb effects via ffmpeg aecho filter, and verbosity control. The release includes 8 Windows hook scripts, MCP server platform detection for automatic .sh-to-.ps1 resolution, and 46 new unit tests. Security hardening adds path traversal prevention with regex allowlisting and path containment checks, reverb config allowlist validation, and strict mode compliance across all scripts. Cross-platform test fixes ensure the full 93-test suite passes on both Windows and Unix.

---

## ✨ New Features

### Native Windows TTS
- Full PowerShell installer (`setup-windows.ps1`) with figlet banner and interactive UX
- Soprano provider (`play-tts-soprano.ps1`) with Gradio WebUI integration
- Piper provider (`play-tts-windows-piper.ps1`) with auto-download of voices from HuggingFace
- Windows SAPI provider (`play-tts-windows-sapi.ps1`) with zero-setup built-in voices
- TTS router (`play-tts.ps1`) with mute support, background music mixing, and reverb
- Provider manager, voice manager, audio cache utils, and session-start hook scripts
- MCP server `.sh` to `.ps1` auto-resolution on Windows

### Installer Enhancements
- Background music selection with 16 genre tracks and interactive picker
- Reverb/audio effects selection (Off/Light/Medium/Heavy/Cathedral)
- Verbosity control (High/Medium/Low) for TTS protocol instructions
- Updated completion screen showing all 4 settings (provider, background, reverb, verbosity)

---

## 🐛 Bug Fixes

### Security Fixes
- Fix path traversal in background music config reader (regex allowlist + path containment)
- Add allowlist validation for reverb-level.txt config (prevent invalid values)
- Add `set -euo pipefail` strict mode to `play-tts.sh` for Sonar compliance

### Cross-Platform Fixes
- Fix self-copy error when setup-windows.ps1 runs from project root
- Fix test executable permission checks on Windows (skip Unix mode bits)
- Fix test path separator comparison in uninstall test (use `path.join` not hardcoded `/`)

---

## 🏗️ Improvements

### Code Quality
- Reverb config uses switch-as-allowlist pattern - file content never flows into commands
- All SoundPlayer instances wrapped in try/finally for resource disposal
- Environment variable cleanup (`AGENTVIBES_NO_PLAY`) on all exit paths
- Input validation with regex + range checks for all installer prompts

### Testing
- 46 new Windows-specific unit tests (hook scripts, providers, security, encoding)
- 3 cross-platform test fixes for Windows compatibility
- Full suite: 93 Node tests passing on Windows

---

## 📊 Statistics

- **7 commits** since v3.4.1
- **3,769 lines added**, 211 removed across 24 files
- **9 new PowerShell scripts** for Windows TTS
- **93 tests passing** (46 Windows + 47 cross-platform)
- **24/24 Sonar quality gates** passing
- **Security score**: All path traversal and injection vectors reviewed

---

## 🔧 Technical Details

### Files Added
- `.claude/hooks-windows/play-tts.ps1`: TTS router with reverb and background music
- `.claude/hooks-windows/play-tts-soprano.ps1`: Soprano neural TTS provider
- `.claude/hooks-windows/play-tts-windows-piper.ps1`: Piper offline TTS provider
- `.claude/hooks-windows/play-tts-windows-sapi.ps1`: Windows SAPI built-in voices
- `.claude/hooks-windows/provider-manager.ps1`: Provider switching
- `.claude/hooks-windows/voice-manager-windows.ps1`: Voice browsing and selection
- `.claude/hooks-windows/audio-cache-utils.ps1`: Cache management
- `.claude/hooks-windows/session-start-tts.ps1`: Auto-activates TTS on Claude start
- `setup-windows.ps1`: Full Windows installer with 4 interactive sections
- `test/unit/windows-tts.test.js`: 46 Windows-specific unit tests

### Breaking Changes
None - all changes are backward compatible. Existing Unix/macOS installations are unaffected.

---

## 🎓 Migration Notes

### For New Windows Users
1. Run `npx agentvibes install` (Node.js) or `.\setup-windows.ps1` (PowerShell)
2. Follow the interactive setup
3. Choose provider (Soprano, Piper, or SAPI)
4. Select background music, reverb, and verbosity
5. TTS works automatically in Claude Code sessions

### For Existing Unix/macOS Users
- No changes required - your setup continues working
- All Unix bash hooks remain untouched
- Only `play-tts.sh` gained `set -euo pipefail` (strict mode)

---

## 🙏 Acknowledgments

### Project Lead
- **[@paulpreibisch](https://github.com/paulpreibisch)** (Paul Preibisch) — Creator and maintainer of AgentVibes

### Community Contributors
- **[@nathanchase](https://github.com/nathanchase)** — For contributing the Soprano TTS provider in v3.4.0, whose ultra-fast neural engine is now one of the three Windows-native providers
- **[@alexeyv](https://github.com/alexeyv)** — For suggesting native Windows support and recommending Windows SAPI as a zero-dependency provider
- **[@bmadcode](https://github.com/bmadcode)** (Brian Madison) — Creator of the [BMAD Method](https://github.com/bmadcode/BMAD-METHOD), used daily for planning and building AgentVibes features

### Quality Assurance
- **Adversarial Security Review**: Path traversal, injection, and resource disposal all validated
- **Testing**: 93/93 tests passing (100% suite coverage)
- **Quality Gates**: 24/24 Sonar requirements validated
- **Co-Authored-By**: Claude Opus 4.6

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v3.4.1...v3.5.5

---

## 📦 v3.4.0 - Soprano TTS, Security Hardening & Environment Intelligence

**Release Date:** February 10, 2026

### 🎯 Why v3.4.0?

v3.4.0 introduces **Soprano TTS** - an ultra-fast neural TTS provider with GPU acceleration, comprehensive **security hardening** across the codebase, and **intelligent environment detection** that recognizes PulseAudio tunnels for remote audio scenarios.

### 🚀 Key Highlights

#### ⚡ Soprano TTS Provider (NEW!)
- **80M parameter neural model** with premium female English voice
- **20x CPU speed** (vs Piper), **2000x GPU speed** with CUDA
- **3 synthesis modes**: WebUI (Gradio), API (OpenAI-compatible), CLI (fallback)
- **Auto-detection**: Checks for running Gradio server, falls back gracefully
- **<1GB memory footprint** - perfect for low-RAM systems
- **Provider-aware voice management**: Auto-selects single voice, shows model specs
- **Thanks to [@nathanchase](https://github.com/nathanchase)** for this contribution! ([see acknowledgments](#-acknowledgments))

#### 🛡️ Security Hardening (9.5/10 Score)
- **Timeouts on system commands**: Prevents installer hangs (nvidia-smi, sysctl, meminfo)
- **Bounds checking**: Validates array access before parsing system output
- **NaN validation**: Prevents crashes from malformed memory/GPU detection
- **Case-insensitive checks**: PulseAudio tunnel detection handles TCP: and tcp:
- **Code duplication eliminated**: Extracted PulseAudio helper function (DRY)

#### 🌐 Environment Intelligence
- **PulseAudio tunnel detection**: Recognizes `PULSE_SERVER=tcp:*` as working audio
- **Context-aware messaging**:
  - "🌐 PulseAudio Tunnel Detected!" for SSH + tunnel setups
  - "🔊 Audio Output Detected!" for local speakers
  - Distinguishes local/tunnel/hybrid configurations
- **Smart environment classification**:
  - DESKTOP: Local audio OR active PulseAudio tunnel
  - VOICELESS: No audio AND no tunnel
  - PHONE: Termux/Android devices

#### 🎤 Installer Enhancements
- **Provider-aware voice pages**: Soprano shows model specs, Piper shows 50+ voices
- **Auto-selection logic**: Soprano (1 voice) auto-selects, no manual choice needed
- **GPU-based recommendations**: "Your GPU will run Soprano 2000x faster!"
- **RAM-based suggestions**: Low memory systems see "Soprano uses <1GB" message
- **Better RAM display**: Shows "512MB" instead of "0GB" for sub-1GB systems

### 🤖 AI Summary

AgentVibes v3.4.0 brings Soprano TTS - an 80M parameter neural provider offering 20x CPU and 2000x GPU acceleration with sub-1GB memory footprint - plus comprehensive security hardening (timeouts, bounds checking, NaN validation) and intelligent environment detection that recognizes PulseAudio tunnels as working audio for remote scenarios. The enhanced installer provides context-aware messaging distinguishing local speakers from SSH tunnels, GPU-based provider recommendations (Soprano for CUDA users, macOS Say for Apple, Piper for versatility), and provider-specific voice pages that auto-select Soprano's single voice while showcasing model specifications. This release achieves a 9.5/10 security score through systematic defensive programming, making AgentVibes production-ready for enterprise deployments while expanding TTS provider options for diverse hardware configurations.

---

## ✨ New Features

### Soprano TTS Provider
- Add Soprano TTS provider script with 3 synthesis modes (WebUI, API, CLI) (#95)
- Integrate Soprano into TTS router and provider manager
- Add soprano-gradio-synth.py helper for WebUI/SSE protocol
- Provider-aware voice selection page with model specifications
- Auto-select single Soprano voice with performance details

### Installer Intelligence
- Add `detectSystemCapabilities()` for GPU/RAM detection
- Add `hasPulseAudioTunnel()` helper function
- Context-aware audio detection messaging (tunnel vs local)
- GPU-based provider ordering (Soprano first for CUDA users)
- RAM-based recommendations (<4GB systems see Soprano first)
- Provider-specific intro messages (Soprano vs Piper vs macOS)

### Environment Detection
- PulseAudio tunnel recognition via PULSE_SERVER env var
- Case-insensitive TCP protocol detection
- Smart DESKTOP classification (local audio OR tunnel)
- Improved VOICELESS detection (no audio AND no tunnel)

---

## 🐛 Bug Fixes

### Security Fixes
- Add 5s timeout to nvidia-smi to prevent GPU detection hangs
- Add 3s timeout to sysctl/meminfo to prevent memory detection hangs
- Add bounds checking before parsing sysctl output (macOS)
- Add bounds checking before parsing /proc/meminfo (Linux)
- Add NaN validation for parseInt() memory size parsing
- Fix case sensitivity in PULSE_SERVER detection (handles TCP: and tcp:)

### Test Fixes
- Fix provider-manager test #90: Add soprano and ssh-remote to cleanup list
- Ensure zero-provider edge case properly simulates empty state

### User Experience
- Fix RAM display for <1GB systems (show "512MB" not "0GB")
- Fix PulseAudio selection triggering wrong setup flow
- Separate PulseAudio tunnel setup from SSH receiver setup

---

## 🏗️ Improvements

### Code Quality
- Extract PulseAudio detection to helper function (DRY principle)
- Implement system capabilities caching (eliminates duplicate calls)
- Add comprehensive error handling in detectSystemCapabilities()
- Improve code comments for security-critical sections

### Performance
- Cache system detection results (prevents duplicate nvidia-smi calls)
- Add timeouts to prevent indefinite hangs
- Optimize provider detection with early returns

### Documentation
- Add comprehensive commit message documenting all changes
- Document security improvements (timeouts, bounds checking, NaN validation)
- Explain PulseAudio tunnel detection architecture
- Detail environment classification logic

---

## 📊 Statistics

- **91 commits** since v3.3.0
- **817 lines added** in merge to master
- **6 files modified** in core integration
- **260 tests passing** (213 BATS + 47 Node)
- **Security score**: 7.5/10 → 9.5/10
- **Test coverage**: 100% pass rate

---

## 🔧 Technical Details

### Files Modified
- `src/installer.js`: +335 lines (security fixes, environment detection, Soprano integration)
- `test/unit/provider-manager.bats`: +4 lines (fix edge case test)
- `.claude/hooks/play-tts-soprano.sh`: +320 lines (new provider)
- `.claude/hooks/soprano-gradio-synth.py`: +139 lines (new helper)
- `.claude/hooks/provider-manager.sh`: +17 lines (Soprano support)
- `.claude/hooks/play-tts.sh`: +6 lines (route to Soprano)

### Breaking Changes
None - all changes are backward compatible.

### Dependencies
- **New**: `soprano-tts` (Python package, optional)
- **Recommended**: CUDA-capable GPU for 2000x speedup (optional)
- **Compatible**: Works on CPU-only systems (20x vs Piper)

---

## 🎓 Migration Notes

### For New Users
1. Run `npx agentvibes install`
2. Installer auto-detects your hardware (GPU, RAM, platform)
3. Soprano appears as option if you have working audio
4. Select Soprano for ultra-fast TTS with GPU acceleration

### For Existing Users
1. Update: `npx agentvibes update`
2. Switch provider: `/agent-vibes:provider switch soprano`
3. Test: `/agent-vibes:sample soprano-default`
4. Optionally install soprano-tts: `pip install soprano-tts`

### PulseAudio Tunnel Users
- Installer now auto-detects your tunnel configuration
- Shows "🌐 PulseAudio Tunnel Detected!" instead of "speakers"
- Provides DESKTOP mode options (Soprano, Piper, macOS Say)
- No manual configuration needed

---

## 🙏 Acknowledgments

### Special Thanks

**🎉 [@nathanchase](https://github.com/nathanchase)** - For contributing the Soprano TTS Provider integration (PR #95)! Nathan's work brings ultra-fast neural TTS with GPU acceleration to AgentVibes, offering 20x CPU and 2000x GPU performance improvements. The comprehensive integration includes WebUI, API, and CLI synthesis modes with intelligent auto-detection and graceful fallback. Thank you for this outstanding contribution! 🚀

### Quality Assurance

- **Security Review**: Adversarial code review achieved 9.5/10 score
- **Testing**: All 260 tests pass (100% suite coverage)
- **Quality Gates**: All Sonar requirements validated
- **Co-Authored-By**: Claude Sonnet 4.5

---

## 📚 Additional Resources

- [Soprano TTS Documentation](https://github.com/paulpreibisch/AgentVibes/blob/master/docs/providers.md#soprano-tts)
- [PulseAudio Tunnel Setup](https://github.com/paulpreibisch/AgentVibes/blob/master/docs/SSH_REMOTE_SETUP.md)
- [Security Hardening Guide](https://github.com/paulpreibisch/AgentVibes/blob/master/docs/security-hardening-guide.md)
- [Provider Comparison](https://github.com/paulpreibisch/AgentVibes/blob/master/docs/providers.md)

---

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v3.3.0...v3.4.0

---

## 📦 v3.3.0 - Remote TTS, Smart Installer, OpenClaw Receiver & Cache Management

**Release Date:** February 5, 2026

### 🎯 Why v3.3.0?

v3.3.0 transforms AgentVibes into a **universal TTS platform** for any environment:

- **SSH-Remote Provider** - Generate TTS on servers, receive audio on your phone/computer
- **Termux/Android Support** - Native Piper TTS on mobile devices
- **OpenClaw Integration** - Turn voiceless servers into Siri-like conversational AI
- **AgentVibes Receiver** - Receive and play audio from remote servers on your device
- **Smart Installer** - Auto-detects your environment (voiceless, GUI, Termux, SSH)
- **Intelligent Cache Management** - Real-time tracking and auto-cleanup prevents disk bloat

#### 🌐 Real-World Use Case: OpenClaw + AgentVibes Receiver

You deploy OpenClaw on a voiceless Mac mini (or remote server) where users message you via WhatsApp, Telegram, or Discord. With v3.3.0:

**Before AgentVibes Receiver:**
- User messages: "Tell me a joke"
- Mac mini processes request
- Text response appears in chat
- 😞 No audio - silent experience

**After AgentVibes Receiver:**
1. **Install AgentVibes** on your Mac mini (or remote server)
2. **Install AgentVibes Receiver** on your phone/iPad/laptop
3. **Connect via Tailscale** (one-time setup)
4. **User messages:** "Tell me a joke"
5. **Mac mini generates TTS** with your configured voice
6. **Audio streams to your device** via SSH tunnel
7. **Your speakers play:** 🔊 "Why did the AI go to school? To improve its learning model!"
8. **User in WhatsApp also hears** the audio playing (Siri-like experience)

Result: OpenClaw transforms from **silent text AI** → **Conversational AI with voice**

Perfect for:
- 🖥️ Mac mini with OpenClaw
- 🖥️ Remote servers (AWS, DigitalOcean, Linode)
- 🏗️ Container deployments (Docker)
- 🔧 WSL (Windows Subsystem for Linux)
- 📱 Any voiceless environment needing audio

### 🤖 AI Summary

AgentVibes v3.3.0 unleashes the platform across new frontiers: remote servers via SSH-PulseAudio tunneling, Android/Termux environments with native Piper support, and OpenClaw (formerly Clawdbot) multi-agent orchestration. The redesigned smart installer detects your environment (voiceless, GUI, SSH, Termux) and shows only relevant options, plus optional BMAD personality injection for advanced users. Every TTS output now displays real-time cache metrics (file count/size with dynamic colors) plus intelligent size-based auto-cleanup that deletes oldest files when the cache exceeds threshold. The release includes comprehensive TTS queue management to prevent audio overlap, audio effects support across all providers, and full MCP tool integration for programmatic control. This release transforms AgentVibes into a universal TTS platform.

**Key Highlights:**
- 🌍 **SSH-Remote TTS** - Remote device playback via PulseAudio tunneling (servers, containers, WSL)
- 📱 **Android/Termux Support** - Native Piper TTS on Android with termux-media-player integration
- 🤖 **OpenClaw Receiver** (formerly Clawdbot) - AgentVibes Receiver for receiving TTS from voiceless servers
- 🧠 **Smart Installer** - Voiceless environment detection + personality injection for BMAD
- 📊 **Real-Time Cache Tracking** - File count and size on every output with dynamic colors
- 🧹 **Intelligent Auto-Cleanup** - Size-based threshold (15MB default) prevents storage bloat
- 🎵 **Queue Management** - Prevents TTS audio overlap via centralized queue system
- ⚙️ **Audio Effects** - Full support across SSH-remote, Termux-ssh, and local providers
- 📁 **Uninstall Command** - Comprehensive cleanup with full documentation
- ✅ **96 Commits** - Massive feature expansion with 213 BATS tests passing

### ✨ New Features

#### 🌍 Remote SSH TTS Support

**SSH-Remote Provider:**
- Play TTS on remote servers via SSH + PulseAudio tunneling
- Zero-dependency for audio output (uses PulseAudio network tunnel)
- Perfect for deployed Claude Code on servers, containers, WSL
- Auto-configuration of PulseAudio TCP module
- Fallback to local playback if SSH unavailable
- Full compatibility with all voice selection and audio effects

**SSH-PulseAudio Integration:**
- Automatic SSH connection detection and setup
- Secure TCP tunnel for audio stream transmission
- Support for both interactive and batch TTS operations
- Persistent audio configuration per SSH session

#### 📱 Android/Termux Support

**Termux-SSH Provider:**
- Native Piper TTS on Android via Termux environment
- Uses termux-media-player for audio playback
- Full voice selection and effects support
- Automatic temp directory detection
- Integration with Tailscale for secure remote access
- Comprehensive setup guide with QR codes

**Android Installation:**
- Self-contained Termux installer script
- One-command setup: `curl https://agentvibes.org/install-android | bash`
- Automatic dependency detection and installation
- Piper voice download management

#### 🎙️ OpenClaw Integration & AgentVibes Receiver

**What is AgentVibes Receiver?**

AgentVibes Receiver is a **lightweight audio client** that receives and plays TTS audio from remote servers where OpenClaw is installed. It runs on your phone, tablet, or personal computer and connects to voiceless servers via SSH tunnel.

**The Problem It Solves:**
- OpenClaw running on Mac mini/remote server has no audio output
- Users message via WhatsApp/Telegram/Discord - get text responses only
- 😞 No voice = Less engaging AI experience

**AgentVibes Receiver Solution:**
1. **Lightweight client** runs on your device (phone/tablet/laptop)
2. **SSH tunnel** securely connects to your voiceless server
3. **Audio streams** from server to your device via PulseAudio
4. **Auto-plays** on your speakers when OpenClaw responds
5. **Siri-like experience** - Text + Voice in one flow

**How It Works:**

```
┌──────────────────────────────┐
│ Your Mac mini / Server       │
│ (OpenClaw + AgentVibes)      │
│ ├─ No audio output           │
│ ├─ Generates TTS             │
│ └─ Sends via SSH tunnel      │
└──────────────────────────────┘
            ↓ SSH Tunnel (encrypted)
┌──────────────────────────────┐
│ Your Phone / Laptop          │
│ (AgentVibes Receiver)        │
│ ├─ Receives audio stream     │
│ ├─ Plays on speakers         │
│ └─ You hear OpenClaw speak   │
└──────────────────────────────┘
```

**Example Flow:**
```
WhatsApp: "Tell me a joke"
        ↓
Mac mini: Processes with Claude
        ↓
Generates TTS: "Why did the AI... [audio file]"
        ↓ SSH tunnel
Your Phone: Plays audio 🔊
        ↓
You hear: "Why did the AI go to school?"
```

**AgentVibes Receiver Features:**
- **One-Time Setup** - Pair with server via SSH key
- **Automatic Connection** - Reconnects if interrupted
- **Real-Time Streaming** - Low latency audio playback
- **SSH Encryption** - Secure tunnel for audio
- **Tailscale Support** - Easy VPN for remote servers
- **Multiple Servers** - Connect to different OpenClaw instances
- **Voice Control** - Full voice selection on the server side
- **Cache Metrics** - Monitor audio generation and cleanup

**OpenClaw Skill Integration:**
- Installed automatically with AgentVibes on OpenClaw server
- Full feature access:
  - Voice selection (50+ voices)
  - Personality/sentiment (sarcastic, flirty, etc.)
  - Audio effects (reverb, echo, pitch)
  - Speech speed (0.5x - 3.0x)
  - Language translation (speak in different languages)
  - Real-time cache tracking
  - Automatic cleanup of old audio files

#### 🧠 Smart Installer Enhancements

**Voiceless Environment Detection:**
- Auto-detects if GUI audio is unavailable (headless servers, containers)
- Offers SSH-remote TTS as alternative for voiceless environments
- Prevents installation of unnecessary audio dependencies

**Personality Injection (BMAD):**
- Interactive prompt during install for BMAD users
- Optional TTS personality configuration
- Sentiment/personality selection built into setup flow
- Skipped for non-BMAD environments

**Provider Auto-Selection:**
- Intelligent detection of available providers:
  - macOS Say (macOS systems)
  - Piper TTS (all systems)
  - SSH-remote (if SSH available)
  - Termux-ssh (Android/Termux)
- Shows only relevant providers in installation

**Better UX:**
- Clear descriptions of each provider
- Setup URLs for complex providers (Tailscale)
- Comprehensive help text for each option
- Git log integration for recent changes

#### 📊 Real-Time TTS Cache Tracking & Intelligent Auto-Cleanup

**Why Cache Management Matters:**
- TTS audio files accumulate quickly
- Server deployments can run out of disk space silently
- Users have no visibility into cache size or cleanup status
- Manual cleanup is inconvenient and error-prone

**Cache Display on Every Output:**
Every time you generate TTS, you see real-time cache metrics:
```
💾 Saved to: /home/user/.claude/audio/tts-1770274925.wav 📦 28 20.9MB 🧹[15mb]
```

What you see:
- 💾 **Full path** - Clickable file for replay or sharing
- 📦 **28** - File count in cache
- **20.9MB** - Total cache size (color-coded):
  - 🟢 Green: <500MB
  - 🟡 Yellow: 500MB-3GB
  - 🔴 Red: >3GB
- 🧹 **[15mb]** - Auto-cleanup threshold

**Intelligent Size-Based Auto-Cleanup:**
- Deletes oldest files when cache exceeds threshold (default: 15MB)
- Silent operation (no blocking prompts)
- Write-lock protection prevents conflicts with TTS generation
- Respects active TTS (won't delete while generating)

**Configuration:**
```bash
# Per-project threshold override
echo "50" > .claude/tts-auto-clean-threshold.txt  # 50MB limit

# Or disable cleanup
echo "0" > .claude/tts-auto-clean-threshold.txt   # Disable
```

**Manual Cleanup:**
```bash
# Non-interactive cleanup
/agent-vibes:clean

# Or programmatically via MCP
await agent_vibes.clean_audio_cache()
```

#### 🎵 TTS Queue Management

**Overlap Prevention:**
- Centralized queue system for TTS operations
- Prevents simultaneous audio playback
- Critical for Clawdbot multi-agent scenarios
- Atomic queue operations ensure consistency

**Queue Integration:**
- Automatic in OpenClaw Receiver
- Optional in standalone environments
- Fallback to sequential playback

#### ⚙️ Audio Effects Across All Providers

**Effects Support:**
- Reverb, echo, pitch, EQ available
- SSH-remote provider: Full effects support
- Termux-ssh provider: Full effects support
- All local providers: Unchanged effects behavior

**Configuration:**
- Per-session override via environment variables
- Project-local settings via config files
- Persistent across TTS operations

#### 📁 Comprehensive Uninstall Command

**`/agent-vibes:uninstall` Skill:**
- Complete removal of AgentVibes and dependencies
- Interactive prompts for user confirmation
- Option to preserve configuration
- Detailed removal logs
- Full documentation included

### 🐛 Bug Fixes

- **TTS Overlap** - Fixed audio overlapping via queue management
- **Termux Audio** - Proper detection and use of termux-media-player
- **SSH Detection** - Improved SSH environment detection logic
- **Race Conditions** - Write-lock mechanism prevents cleanup conflicts
- **Temp Directory** - Proper Termux temp directory handling
- **Color Codes** - Fixed GOLD color (256-color \033[38;5;226m)
- **Stat Compatibility** - BSD/GNU stat detection with proper output suppression
- **Syntax Validation** - Fixed installer.js syntax errors
- **Coverage Testing** - Proper coverage file generation for CI/CD

### 🔒 Security & Quality

- **No Hardcoded Credentials** - All secure operations use environment variables
- **SSH Safety** - Secure PulseAudio tunnel authentication
- **Atomic Operations** - Queue and receiver use atomic file operations
- **Input Validation** - All external inputs validated
- **Pre-existing Limitations** - TTS scripts lack `set -euo pipefail` (pre-existing)
- **Sonar Compliance** - Security hotspots resolved, quality gates passing
- **Test Coverage** - 213 BATS tests + 47 Node unit tests

### ✅ Testing & Validation

- **213 BATS Tests** - Core functionality validation
- **47 Node Tests** - JavaScript/installer validation
- **Cross-Platform** - Piper, macOS, SSH-remote, Termux-ssh
- **Environment Tests** - Voiceless, GUI, SSH, Termux detection
- **Audio Effects** - All providers tested
- **Backwards Compatible** - No breaking changes to existing code

---

## 📦 v3.2.0 - Clawdbot Integration: AI Assistants on Any Messenger

**Release Date:** January 27, 2026

### 🎯 Why v3.2.0?

This minor release adds **native Clawdbot integration** to AgentVibes, bringing professional TTS to the revolutionary AI assistant you can access via any instant messenger. Clawdbot connects Claude AI to WhatsApp, Telegram, Discord, and more—and now with AgentVibes, your Clawdbot can speak with 50+ professional voices in 30+ languages. This release also includes SonarCloud quality gate improvements and CI/CD workflow enhancements.

### 🤖 AI Summary

AgentVibes v3.2.0 introduces seamless integration with Clawdbot, the revolutionary AI assistant accessible via any instant messenger. With this release, Clawdbot users get professional TTS with 50+ voices, remote SSH audio support for server deployments, and zero-configuration setup—just install AgentVibes and the Clawdbot skill is ready. The release also includes quality improvements: SonarCloud workflow fixes, enhanced documentation for disabling quality gate checks, and improved test coverage validation.

**Key Highlights:**
- 🤖 **Clawdbot Integration** - Native TTS support for Clawdbot AI assistant framework
- 💬 **Messenger Platforms** - Works with WhatsApp, Telegram, Discord via Clawdbot
- 🔊 **Remote SSH Audio** - Perfect for Clawdbot on remote servers with PulseAudio tunneling
- 📦 **Simple Install** - Just `npx agentvibes install` and it works
- 🛡️ **SonarCloud Fixes** - Quality gate workflow improvements and documentation
- ✅ **Full Test Coverage** - All 213 BATS + 47 Node tests passing

### ✨ New Features

**Clawdbot Skill (`.clawdbot/`):**
- New `.clawdbot/` directory with skill integration files
- `README.md` - Clawdbot integration overview and setup guide
- `skill/SKILL.md` - Comprehensive skill documentation with voice selection, background music, effects, personalities, and remote SSH audio setup
- Automatically distributed via npm package
- Zero-configuration when AgentVibes is installed

**README Updates:**
- Added "🤖 Clawdbot Integration" section with full documentation
- Updated header to include Clawdbot alongside Claude Code, Claude Desktop, and Warp Terminal
- Added Clawdbot to Quick Links table
- Clawdbot description: "A revolutionary AI assistant you can access via any instant messenger"
- Website link: https://clawd.bot

**package.json Updates:**
- Added `.clawdbot/` to npm files array for distribution
- Added `clawdbot` to keywords for npm discoverability
- Updated description to mention Clawdbot support

### 🐛 Bug Fixes

- **SonarCloud Quality Gate** - Disabled quality gate status reporting to GitHub to prevent false CI failures
- **Coverage File Generation** - Ensured coverage file is generated before SonarCloud scan
- **CLI Test Coverage** - Added CLI tests and excluded CLI entry point from coverage requirements
- **macOS Runner** - Removed macos-15-large runner to avoid GitHub billing limits
- **Piper Voice Test** - Updated installation test to match current voice list

### 📚 Documentation

- Added step-by-step SonarCloud dashboard configuration guide
- Added guide to disable SonarCloud GitHub App checks
- Comprehensive Clawdbot integration documentation with SSH audio examples

### 🔒 Security & Quality

- ✅ All Sonar quality gates validated
- ✅ No hardcoded credentials in changes
- ✅ New Clawdbot files are documentation only (no executable code)
- ✅ All 213 BATS + 47 Node tests passing

### 📊 Changes Summary

- **Files Added:** 2 (`.clawdbot/README.md`, `.clawdbot/skill/SKILL.md`)
- **Files Modified:** 2 (`README.md`, `package.json`)
- **Commits Since v3.1.0:** 11 (5 fixes, 4 docs, 1 test, 1 debug)

### 🎯 User Impact

**For Clawdbot Users:**
- Professional TTS with 50+ voices in 30+ languages
- Works on remote servers with SSH audio tunneling
- Zero API costs—Piper TTS is free and offline
- Automatic integration when AgentVibes is installed

**For Existing Users:**
- Zero breaking changes
- All existing features work exactly the same
- Clawdbot support is additive

### 🚀 Migration Notes

No migration required! This is a fully backward-compatible minor release.

**To Use with Clawdbot:**
1. Install: `npx agentvibes install`
2. Speak: `npx agentvibes speak "Hello!"`

### 📦 Full Changelog

**Feature Commits:**
- `(pending)` feat: Add Clawdbot integration

**Bug Fix Commits:**
- `5cd97d52` fix: Disable SonarCloud quality gate status reporting to GitHub
- `12f822e6` fix: Disable quality gate failure in SonarCloud workflow
- `0d26ccc2` fix: Ensure coverage file is generated before SonarCloud scan
- `c2465508` fix: Add CLI tests and exclude CLI entry point from coverage
- `c673afe1` fix: Remove macos-15-large runner to avoid GitHub billing limits
- `92271732` fix: Update Piper installation test to match current voice list

**Documentation Commits:**
- `f72dd977` docs: Add guide to disable SonarCloud GitHub App checks
- `6587519b` docs: Add step-by-step SonarCloud dashboard configuration guide
- `ba765f50` docs: Add SonarCloud quality gate configuration guidance

**Test Commits:**
- `47f08a79` test: Trigger workflow to verify SonarCloud quality gate fix

**Debug Commits:**
- `84945d25` debug: Add coverage file verification to SonarCloud workflow

---

## 📦 v3.1.0 - Android Native Support: Run Claude Code on Your Phone

**Release Date:** January 22, 2026

### 🎯 Why v3.1.0?

This minor release brings **native Android support** to AgentVibes, enabling developers to run Claude Code with professional TTS voices directly on Android devices via Termux. No SSH required, no remote server needed—just install Termux on your Android phone or tablet and get the full AgentVibes experience locally. This complements the v3.0.0 termux-ssh provider by offering a **complete mobile development solution**: use native Termux for local Android development, or use termux-ssh when connecting to remote servers.

### 🤖 AI Summary

AgentVibes v3.1.0 introduces native Android/Termux support, enabling developers to run Claude Code with professional TTS voices directly on their Android devices. Through automatic detection and a specialized installer, AgentVibes now runs Piper TTS via proot-distro with Debian (solving Android's glibc compatibility issues), uses termux-media-player for audio playback, and includes comprehensive Android-specific documentation. Perfect for developers who want to code on-the-go with their Android phone or tablet using the full power of Claude Code and AgentVibes.

**Key Highlights:**
- 🤖 **Native Android Support** - Run Claude Code with TTS directly on Android devices via Termux
- 📦 **Automatic Termux Detection** - AgentVibes auto-detects Android and runs specialized installation
- 🎯 **Proot-Distro Integration** - Solves glibc compatibility with proot Debian environment
- 🔊 **Android Audio Playback** - Uses termux-media-player for native Android audio routing
- 📚 **Comprehensive Documentation** - Complete Android setup guide with troubleshooting and F-Droid instructions
- ✅ **Full Test Coverage** - All 213 BATS + 38 Node tests passing with Android compatibility

### ✨ New Features

**Termux Installer (`.claude/hooks/termux-installer.sh`):**
- New 224-line installer specifically for Android/Termux environments
- Automatically installs proot-distro with Debian (for glibc compatibility)
- Downloads and configures Piper TTS binary in proot environment
- Creates `/usr/bin/piper` wrapper that routes through proot
- Installs audio dependencies: ffmpeg, sox, bc, termux-api
- Interactive voice selection with 50+ language options
- Validates Termux environment before proceeding

**Termux Detection (`src/installer.js`):**
- New `isTermux()` function checks for `/data/data/com.termux` directory
- New `detectAndNotifyTermux()` displays Android detection messages
- Auto-configures piper provider with Termux-compatible voice
- Shows Termux-specific installation instructions
- Piper installer automatically redirects to termux-installer.sh on Android

**Audio Processor Updates (`.claude/hooks/audio-processor.sh`):**
- Detects Termux environment for temp directory selection
- Uses `${PREFIX}/tmp` on Termux, `/tmp` on standard systems
- Ensures audio effects work correctly on Android
- Cross-platform compatibility maintained

**Piper Installer Updates (`.claude/hooks/piper-installer.sh`):**
- Auto-detects Termux and redirects to specialized installer
- Shows clear message when routing to Termux-specific setup

**Android Audio Playback (`.claude/hooks/play-tts-piper.sh`):**
- Detects Android/Termux environment
- Uses `termux-media-player` instead of `paplay` on Android
- Audio routes through Android's native media system

### 📚 Documentation

**New Android Setup Section (`README.md`):**
- Added "🤖 Android / Termux" section to System Requirements
- Complete 3-step installation guide for Android devices
- Explanation of why Termux needs special handling (bionic vs glibc)
- Requirements: Termux app from F-Droid, Termux:API, Android 7.0+
- Audio playback architecture explanation
- Setup verification commands
- Troubleshooting table for common issues
- Clear explanation of why F-Droid version is required (not Google Play)
- Updated Quick Links table with direct link to Android setup

### 🐛 Bug Fixes

- **Test #90 Fix** - Added termux-ssh provider to test cleanup list for "no providers found" edge case
- **Temp Directory Detection** - Fixed audio-processor.sh defaulting to Termux paths on non-Termux systems
- **Sonar Compliance** - Added `set -euo pipefail` strict mode to termux-installer.sh for security

### 🔒 Security & Quality

- ✅ All Sonar quality gates validated
- ✅ Strict mode (`set -euo pipefail`) on all new bash scripts
- ✅ No hardcoded credentials
- ✅ Proper variable quoting and input validation
- ✅ Cross-platform temp directory handling
- ✅ All 213 BATS + 38 Node tests passing

### 📊 Changes Summary

- **Files Modified:** 7
- **Lines Added:** +391
- **Lines Removed:** -8
- **New Files:** 1 (termux-installer.sh)
- **Commits:** 8 (5 fixes, 1 feature, 1 docs, 1 merge)

### 🎯 User Impact

**For Android Users:**
- Can now run Claude Code directly on Android phones/tablets
- Full TTS support with 50+ voices and languages
- No remote server required for basic usage
- Works offline after initial voice downloads

**For Developers:**
- Complete mobile development solution (native + SSH)
- Native Termux for local Android development
- Termux-SSH provider for remote server connections
- Seamless integration with existing AgentVibes workflows

**For Existing Users:**
- Zero breaking changes
- All existing features work exactly the same
- New Android support is opt-in via Termux installation

### 🚀 Migration Notes

No migration required! This is a fully backward-compatible minor release.

**To Try Android Support:**
1. Install [Termux from F-Droid](https://f-droid.org/en/packages/com.termux/)
2. Install [Termux:API](https://f-droid.org/en/packages/com.termux.api/)
3. In Termux: `pkg install nodejs-lts`
4. Run: `npx agentvibes install`

AgentVibes will auto-detect Termux and run the specialized installer.

### 📦 Full Changelog

**Feature Commits:**
- `e9d4cf95` feat: Add Android/Termux support for Piper TTS

**Bug Fix Commits:**
- `aa4d3cdd` fix: Add termux-ssh provider to test #90 cleanup list
- `c1b00c6d` fix: Use termux-media-player for audio playback on Android
- `f96ab89a` fix: Properly detect Termux environment for temp directory
- `e2efeb06` fix: Add strict mode to termux-installer.sh for Sonar compliance

**Documentation Commits:**
- `701a9412` docs: Add comprehensive Android/Termux setup section to README

**Merge Commits:**
- `a5d3f546` Merge feature/android-termux into master
- `95f04e70` Merge origin/master into feature/pulseaudio-reverse-tunnel

---

## 📦 v3.0.0 - Cross-Platform Remote Audio: Termux SSH Provider

**Release Date:** January 8, 2026

### 🎯 Why v3.0.0?

This major release marks a significant milestone in AgentVibes' evolution, introducing **mobile-first interactive AI conversations**. The termux-ssh provider enables a revolutionary workflow: **have fully interactive, hands-free conversations with Claude Code using just your mobile device**—whether you're coding locally on your laptop with audio routed to your phone, or working on remote servers from anywhere in the world. This architectural breakthrough represents a new paradigm: **"Code with your hands, converse with your voice."**

### 🤖 AI Summary

AgentVibes v3.0.0 introduces the termux-ssh TTS provider, enabling **true mobile-first interactive conversations with Claude Code**. Route TTS audio to your Android device via SSH—whether coding locally on your laptop or on remote servers—and have hands-free, voice-driven conversations with Claude using just your phone. This major release includes comprehensive Tailscale VPN setup documentation for internet-wide access, full MCP server integration, and transforms how developers interact with AI assistants. Perfect for developers who want to experience AI conversations naturally through their mobile device while their hands stay on the keyboard.

**Key Highlights:**
- 📱 **Mobile-First AI Conversations** - Have fully interactive, hands-free conversations with Claude Code using just your Android device
- 💻 **Local + Remote Development** - Works for both local coding (laptop → phone audio) and remote server development
- 🌐 **Tailscale Integration** - Comprehensive guide for internet-wide device access without port forwarding or firewall configuration
- 🔧 **Enhanced Installer** - Interactive SSH host configuration with validation and clear use-case guidance
- 🎯 **Full MCP Compatibility** - Complete integration with all MCP commands and workflows
- 🛡️ **Quality Gates Integration** - Automated security validation in release process

### 🎥 Demo Video

**Watch it in action:** [Mobile-First AI Conversations with Claude Code](https://youtu.be/ngLiA_KQtTA?si=wTwS4CJidIxWqLIP)

See the termux-ssh provider in action—fully interactive, hands-free conversations with Claude Code using just your Android device.

### ✨ New Features

**Termux SSH TTS Provider (`.claude/hooks/play-tts-termux-ssh.sh`):**
- New TTS provider for Android via SSH connection
- Routes text to `termux-tts-speak` on remote Android device
- Configuration priority: env var → project → global
- Secure quote escaping for safe text transmission
- 196 lines of fully documented code

**Installer Updates (`src/installer.js`):**
- Added termux-ssh to provider selection menu
- Interactive SSH host alias configuration with validation
- Saves host alias to `.claude/termux-ssh-host.txt`
- Clear use case description: "Only choose if your project is on a remote server and you want audio sent to your Android device"
- Documentation link to TERMUX_SETUP.md

**TTS Router Updates (`.claude/hooks/play-tts.sh`):**
- Added termux-ssh provider routing in two locations
- Full integration with existing provider detection
- Supports mixed-provider mode (Piper + Termux)

**MCP Server Integration (`mcp-server/server.py`):**
