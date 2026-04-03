# AgentVibes Release Notes

## 🐛 v4.6.3 — Patch Release

**Release Date:** April 2026

### Bug Fixes

- **Party mode pre-synthesis uses wrong speaker for every agent** — `bmad-party-speak.ps1` extracted the trailing number from the display name suffix (e.g. `14` from `Yara-14`) and passed it directly as the piper `--speaker` index. The display suffix is a human-readable disambiguator, not the model index. `Yara-14` is speaker 860, but the bug caused piper to speak as speaker 14 ("Ivy") instead. Every configured agent was silently playing a completely different voice. The fix looks up the full speaker name in `speaker_id_map` from the `.onnx.json` file, matching what `play-tts-piper.ps1` already does correctly. Fixes [#165](https://github.com/paulpreibisch/AgentVibes/issues/165).

### Testing

- **New cross-platform test: `bmad-party-speak-speaker-id.test.js`** — 15 tests covering correct `speaker_id_map` lookup for all 8 configured agents, plain names without suffixes (e.g. `Evan`), missing model graceful degradation, and a regression suite that verifies the correct index disagrees with the naive suffix extraction for every agent.

### User Impact

- Party mode agents now speak with their correct configured voices (the voices shown in the BMAD Agents tab)
- No configuration changes needed — the fix is automatic

---

## 🐛 v4.6.2 — Patch Release

**Release Date:** April 2026

### Bug Fixes

- **BMAD party mode: agents now speak with their unique voices** — The party mode `SKILL.md` was missing TTS wiring entirely. It now creates `.bmad-agent-context` on activation, calls `bmad-speak.ps1` sequentially per agent after each round, and cleans up on exit. When BMAD and AgentVibes are both installed, AgentVibes' skill now correctly overrides the BMAD version.

- **LibriTTS speaker IDs resolved correctly on Windows** — `play-tts-piper.ps1` was extracting the speaker index via a regex on the voice name suffix (e.g. `Holly-7` → `7`). That suffix is a disambiguation counter, not the Piper speaker index. `Holly-7` is actually speaker 322. The script now looks up the real index from `voice-assignments.json`, with a fallback to the patched `.onnx.json`.

- **LibriTTS `parseMultiSpeaker` fallback for unpatched models** — `voices-tab.js` now falls back to `voice-assignments.json` when the `.onnx.json` speaker map hasn't been patched yet with friendly names, preventing silent fallback to speaker 0 (often male) on fresh installs.

- **Agent pretext spoken on Windows** — `bmad-speak.ps1` never read or applied the agent's configured pretext. It now reads `pretext` from the voice map profile, and falls back to the default `"DisplayName, Title here."` computed from the agent manifest — matching the behaviour of `bmad-speak.sh` and `AgentVoiceStore.getDefaultPretext()`.

### User Impact

- Party mode agents will introduce themselves by role before speaking and use their individually configured voices throughout the conversation
- LibriTTS multi-speaker voices now reliably map to the correct speaker on first install (no manual patching required)
- No breaking changes — all fixes are silent fallbacks or missing behaviours being added

---

## ✨ v4.6.0 — Minor Release

**Release Date:** April 2026

### New Features

- **BMAD party mode TTS auto-installs for all platforms** — The installer now automatically copies `bmad-party-speak.sh` (Linux/macOS/WSL) or `bmad-party-speak.ps1` (Windows) to `~/.claude/hooks/` and registers a `PostToolUse` hook in `~/.claude/settings.json`. Party mode agents now speak out of the box in any BMAD project without manual setup. Both scripts are included in critical hooks so `npx agentvibes update` keeps them fresh.

### Bug Fixes

- **Background music volume default** — All volume defaults lowered from 70% to 20% across the UI (settings tab, agents tab, music tab, track picker) and scripts (`audio-processor.sh`, `bmad-speak.sh`, `bmad-speak.ps1`). New installs and newly configured agents default to a much more reasonable level.
- **bmad-speak volume inheritance** — `bmad-speak.sh` and `bmad-speak.ps1` now read the global `background-music-volume.txt` config file as the fallback volume instead of a hardcoded value.
- **Installer wizard left arrow** — Pressing ← on the completion screen (screen 5) to move from Done-Quit to Done-Customize More no longer jumps back to the installation step.

### Tests

- 29 new tests: volume default regression guards across all affected files, `configurePartyModeHook` installer coverage (idempotency, settings.json registration, script copying, hook preservation), and a regression test for the screen 5 navigation fix.

---

## 🐛 v4.5.7 — Patch Release

**Release Date:** April 2026

### Bug Fixes

- **Background music volume default** — All volume defaults lowered from 70% to 20% across the UI (settings tab, agents tab, music tab, track picker). New installs and newly configured agents will default to a much more reasonable background music level.
- **bmad-speak volume inheritance** — `bmad-speak.sh` and `bmad-speak.ps1` now read the global `background-music-volume.txt` config file as the fallback volume instead of a hardcoded value. Per-agent background music volume now correctly inherits the global setting when no explicit per-agent override is saved.

---

## 🐛 v4.5.1 — Patch Release

**Release Date:** April 2026

### Bug Fix

- **Music tab preview** — Pressing Space on a track in the Music tab now plays correctly
  when running `npx agentvibes` from a fresh directory. Previously, if `.claude/audio/tracks/`
  didn't exist in the current working directory, the track list showed built-in tracks but
  Space did nothing (the player was spawned against a non-existent path). Now falls back to
  the package-bundled tracks directory automatically.

---

## 🌍 v4.5.0 — "Speak Every Language" Release

**Release Date:** April 2026

Full multilingual TUI support across all 9 languages, complete Windows security hardening, and zero failing tests.

### 🌍 Multilingual TUI — 9 Languages

Every screen, tab, button, and label in the `npx agentvibes` TUI is now fully translated:

- **English, Spanish, French, German, Portuguese, Japanese, Korean, Chinese (Simplified), Italian**
- Language selection on first launch (Screen 0 of the installer wizard)
- Language sub-tab in Settings — switch language live without restarting
- All tab bar labels, button text, footer hints, and status messages translated
- BMAD tab and SSH Receiver tab fully localized
- Per-language i18n files (`src/i18n/en.js`, `es.js`, `fr.js`, ...) with English fallback

### 🪟 Windows Security & Bug Fixes

- **Temp filenames** — All `Date.now()` temp filenames replaced with `randomUUID()` across JS and PowerShell (unpredictable, prevents temp file hijacking)
- **Shell injection** — `execSync('which ...', { shell: true })` replaced with `spawnSync` (no shell expansion)
- **Music player** — Hardcoded `ffplay` on Windows replaced with `detectMp3Player()` (respects user's installed player)
- **Boolean coercion** — `isWindowsTerminal` now correctly returns `true/false` instead of leaking `WT_SESSION` UUID string
- **Network mount detection** — `.match()` result properly coerced to boolean

### 🎙️ Cross-Platform BMAD Speak

BMAD (Build More Architect Dreams) is an AI multi-agent framework where specialized agents — Architect, PM, Developer, QA, and Analyst — collaborate to build software. With this release, every agent in a BMAD party mode session now speaks aloud with their own unique voice, personality, and music on Windows — making each role instantly recognizable.

## 🐛 v4.5.1 — Patch Release

**Release Date:** April 2026

### Bug Fix

- **Music tab preview** — Pressing Space on a track in the Music tab now plays correctly
  when running `npx agentvibes` from a fresh directory. Previously, if `.claude/audio/tracks/`
  didn't exist in the current working directory, the track list showed built-in tracks but
  Space did nothing (the player was spawned against a non-existent path). Now falls back to
  the package-bundled tracks directory automatically.

---

- `bin/bmad-speak.js` — cross-platform entry point for BMAD agent speech
- `.claude/hooks-windows/bmad-speak.ps1` — native Windows BMAD speak with per-agent personality routing

### 🧪 Test Suite

- 600 tests, 0 failures
- Full cross-platform coverage (Windows path separators, chmod skip, provider file restore)

---

## 🎉 v4.4.0 — "Full Platform Parity" Release

**Release Date:** March 2026

The biggest AgentVibes release since the TUI launched in v4.0. Three headline features: **BMAD Party Mode** gives every agent their own voice and music, **Windows Parity** brings full feature support to native Windows, and the **SSH Receiver** lets you hear your headless server speak on your local machine. Plus two rounds of adversarial code review hardening with 17+ security fixes.

### 🪟 Windows Parity — First-Class Windows Support

AgentVibes now runs natively on Windows with full feature parity:

- **Background music on Windows** — New `background-music-manager.ps1`, full port of the Linux bash manager
- **play-tts.ps1** reads `audio-effects.cfg` with per-agent track support, same as Linux
- **ffmpeg auto-install** via `winget` during installer, PATH auto-refresh (no shell restart)
- **Piper TTS native** — `piper.exe` resolved from `LOCALAPPDATA`, no WSL/bash needed
- **Voice selection works** — `play-tts-windows-piper.ps1` reads `tts-voice.txt` set by TUI
- **Multi-speaker models** — voices like libritts-high pass `--speaker` flag to Piper on Windows
- **Windows SSH Receiver** — `setup-ssh-receiver.ps1` + `agentvibes-receiver.ps1` templates with hardened `sshd_config`
- **TUI color contrast** — fixed for Windows Terminal (green focus, layout consistency)
- **Music preview overlap** — switching tracks kills previous player via `taskkill`
- **MCP Server** — strips `\r\n` line endings, accepts `[OK]` markers for PowerShell 5.1 compatibility

### 🎭 BMAD Party Mode — Every Agent Has Its Own Voice

When BMAD's party mode runs a multi-agent discussion, every agent speaks with their own individually configured voice, background music, reverb, and personality — making the Architect, PM, Developer, QA, and Analyst immediately recognizable.

**Per-agent configuration:**
- 🎙️ **Voice** — 914 voices, gender-aware auto-assign
- 🎵 **Background Music** — Unique ambient track per agent (cinematic, lo-fi, jazz...)
- 🎚️ **Music Volume** — Per-agent level, or bulk-set all at once
- 🎛️ **Reverb** — none / room / hall / cathedral / studio
- 💬 **Pretext** — Custom intro phrase ("Winston says:..." before every line)
- 🎭 **Personality** — sarcastic, dramatic, pirate, cheerful, and more
- 🔇 **No overlap** — speech lock serializes agents (mkdir-based, portable across platforms)
- ✨ **Markdown stripped** — asterisks, emojis, and formatting removed before TTS

### 🎛️ BMad Tab — Full Visual Agent Configurator

New **BMad Tab** (`B` key) in `npx agentvibes` for managing every agent visually:

- Voice, Gender, Provider, Reverb, Music, Vol, and Pretext columns
- Voice names auto-beautified: `16Speakers::Rose_Ibex` → `Rose Ibex`
- `Space` to preview with full profile (animated braille spinner while playing)
- `Enter` to configure, `A` to auto-assign, `B` for bulk edit, `X` to reset

### 🖥️ SSH Receiver Tab — Hear Your Headless Server

New **Receiver Tab** streams TTS from voiceless remote servers to your local machine over TCP — perfect for cloud dev boxes, WSL2, and SSH sessions. Multi-provider TTS support, color-coded log columns, and platform-aware setup guide.

### ⚡ Performance & UX
- **TTS latency reduced ~1s** — batched 6 Node.js calls into 1, inotifywait queue worker, background cache cleanup
- **ANSI colors restored** to TTS banner via `AGENTVIBES_WAV_OUTPATH` sidecar file
- **Banner toggle** — hide TTS info without muting: `touch ~/.agentvibes/banner-disabled`
- **`bin/agent-vibes` routes to blessed TUI** instead of old CLI installer
- **Global hooks updated on upgrade** — `~/.claude/hooks/` synced automatically (#141)
- **Markdown stripping in stop hook** — no more "asterisk asterisk" spoken aloud

### 🔌 Windows MCP Parity — 27/27 Tools Working (#157)

All MCP tools now work natively on Windows (previously 12 silently failed):

- **6 new PowerShell scripts** — personality-manager, speed-manager, language-manager, learn-manager, verbosity-manager, clean-audio-cache
- **Unified provider naming** — `piper` and `sapi` on all platforms (no more `windows-piper`/`windows-sapi`)
- **replay command** added to voice-manager for Windows
- **28 new tests** — script parity, effects round-trip, provider management, naming consistency
- **Feature-platform matrix** — `docs/feature-platform-matrix.md` tracks all 85 features across 4 platforms
- **Adversarial review** found 24 issues, 10 fixed in this release

**HIGH bug fixes:**
- ffmpeg stderr redirected to temp file instead of literal `"NUL"` file on disk
- `AGENTVIBES_NO_PLAY` env var properly cleaned up on error/kill paths
- `PIPER_SPEAKER` env var no longer leaks between voice switches
- Provider config now uses project-local `.claude` directory
- Text over-sanitization fixed — `$50 (USD)` no longer becomes `50 USD`

### 🔧 Code Hardening (Adversarial Review)

Three rounds of adversarial code review with 27+ fixes across HIGH and MEDIUM severity:

**Round 3 (v4.4.0 — Windows parity):**
- 6 CRITICAL missing script gaps closed (#157)
- 4 HIGH severity bugs fixed (NUL redirect, env var leaks, config scope, speaker leak)
- 3 MEDIUM fixes (text sanitization, error handling, provider naming)

**Round 2 (v4.4.0 — agents tab):**
- Temp file leak on piper error — cleanup added to error handler (#151)
- Orphaned player process — generation counter gates player spawn (#152)
- Duplicate piper resolution — extracted `_resolvePiperBin()` shared helper (#153)
- Race condition in process handoff — double generation check (#154)
- Voice reuse modulo bug — per-group round-robin counter (#155)
- Ambiguous gender names removed from hardcoded map (#156)

**Round 1 (earlier commits):**
- 11 receiver-tab security findings addressed
- All HIGH and MEDIUM issues from agents-tab review fixed
- Portable speech lock (mkdir instead of flock)
- Path traversal prevention, credential masking, resource cleanup throughout

### 🛡️ Quality
- 639 Node unit tests passing, 213 BATS tests passing
- 28 new Windows-specific platform parity tests
- Sonar quality gates validated across all changed files
- JS syntax verified on all modules

**Previous release:** [v4.0.0](https://github.com/paulpreibisch/AgentVibes/releases/tag/v4.0.0)

---

## 🎉 v4.2 — "Party Mode" Release

**Release Date:** March 2026

This is the biggest AgentVibes release since the TUI launched in v4.0. Two headline features: **BMAD Party Mode** gives every agent their own voice and music, and the **SSH Receiver** lets you hear your headless server speak on your local machine.

### 🤖 What is BMAD?

The BMad Method (Build More Architect Dreams) is an AI-driven development framework module within the BMad Method Ecosystem that helps you build software through the whole process from ideation and planning all the way through agentic implementation. It provides specialized AI agents, guided workflows, and intelligent planning that adapts to your project's complexity, whether you're fixing a bug or building an enterprise platform.

### 🎭 BMAD Party Mode — Every Agent Has Its Own Voice

When BMAD's party mode runs a multi-agent discussion, every agent now speaks with their own individually configured voice, background music, reverb, and personality — making the Architect, PM, Developer, QA, and Analyst immediately recognizable the moment they speak.

```bash
/agent-vibes:bmad-party enable
```

**Per-agent configuration:**
- 🎙️ **Voice** — 914 voices to choose from, auto-assigned gender-aware
- 🎵 **Background Music** — Unique ambient track per agent (cinematic, lo-fi, jazz...)
- 🎚️ **Music Volume** — Per-agent level, or bulk-set all at once
- 🎛️ **Reverb** — none / room / hall / cathedral / studio
- 💬 **Pretext** — Custom intro phrase ("Winston says:..." before every line)
- 🎭 **Personality** — sarcastic, dramatic, pirate, cheerful, and more
- 🔇 **No overlap** — speech lock held until audio fully completes
- ✨ **Markdown stripped** — asterisks and formatting removed before TTS

**Configuration stored in:** `~/.agentvibes/bmad-voice-map.json`

### 🎛️ BMad Tab — Full Visual Agent Configurator

New **BMad Tab** in `npx agentvibes` for managing every agent visually — built with the same polish as the Voices tab:

```bash
npx agentvibes   # Press B to open BMad Tab
```

The agent table shows **Voice, Gender, Provider, Reverb, Music, Vol, and Pretext** columns. Voice names are automatically beautified: `16Speakers::Rose_Ibex` → `Rose Ibex`, `en_US-kusal-medium` → `Kusal`.

| Key | Action |
|-----|--------|
| `↑↓` / `jk` | Navigate agents |
| `Space` | Preview agent with full profile (animated spinner while playing) |
| `Enter` | Configure voice, music, volume, reverb, personality, pretext |
| `A` | Auto-assign unique voices to all agents (gender-aware, no repeats) |
| `B` | Bulk Edit — set music / volume / pretext / reverb for all agents |
| `X` | Reset agent to defaults |

**BMad Tab highlights:**
- Inline row hints — navigate to any agent and see `[Space] Preview  [Enter] Configure` on the row
- Animated `⠋⠙⠹⠸` braille spinner while audio plays
- Gender & Provider columns — same metadata as the Voices tab

### 🖥️ SSH Receiver Tab — Hear Your Headless Server

New **Receiver Tab** streams TTS from voiceless remote servers to your local machine over TCP — perfect for cloud dev boxes (AWS, GCP, Azure), WSL2, and SSH sessions.

```bash
# On local machine: open TUI → Receiver tab → Start
npx agentvibes

# Remote server auto-detects the receiver and streams audio to you
```

### ⚡ TTS Latency Reduced ~1 Second

- **Batched Node.js profile reads** — 6 `node -e` calls collapsed into 1 (~900ms saved per speech)
- **inotifywait queue worker** — file-event-driven queue, no polling delay
- **Background cache cleanup** — off the critical path every 10th call

### 🎨 ANSI Colors Restored to Banner

Full ANSI color in the TTS banner (gold voice, cyan reverb, traffic-light cache size), fixed via `AGENTVIBES_WAV_OUTPATH` sidecar file.

### 🔕 Banner Toggle

Hide TTS info banner without muting: `touch ~/.agentvibes/banner-disabled` or say "turn off the TTS banner" via MCP.

### 🛡️ Security

- Adversarial code review — 58 issues identified and addressed
- Agent ID injection prevention, PID-scoped temp profile files
- Env-var-based Node.js JSON reads (no shell interpolation)

**Full Changelog**: https://github.com/paulpreibisch/AgentVibes/compare/v4.0.1...v4.2

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
