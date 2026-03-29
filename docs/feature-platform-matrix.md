# AgentVibes Feature & Platform Matrix

**Generated:** 2026-03-29
**Purpose:** Bird's-eye view of all features, platform support, command interfaces, and test coverage.

---

## Matrix 1: Feature x Platform x Interface

Legend:
- Script column: underlying script name (without extension)
- Platform columns: `Y` = script exists, `-` = missing, `N/A` = not applicable to platform
- Slash Cmd: slash command that invokes this feature
- MCP Tool: MCP tool name that invokes this feature
- Test: `Y` = test exists, `-` = no test

### Core TTS Playback

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 1 | TTS playback (main) | `play-tts` | Y | Y | Y | - (hook) | `text_to_speech` | Y |
| 2 | Piper TTS provider | `play-tts-piper` | Y | - | Y | `/provider switch piper` | `set_provider` | Y |
| 3 | Windows Piper provider | `play-tts-windows-piper` | N/A | Y | N/A | `/provider switch windows-piper` | `set_provider` | Y |
| 4 | Windows SAPI provider | `play-tts-windows-sapi` | N/A | Y | N/A | `/provider switch windows-sapi` | `set_provider` | Y |
| 5 | macOS Say provider | `play-tts-macos` | Y | N/A | N/A | `/provider switch macos` | `set_provider` | - |
| 6 | Soprano provider | `play-tts-soprano` | Y | Y | Y | `/provider switch soprano` | `set_provider` | - |
| 7 | Termux SSH provider | `play-tts-termux-ssh` | Y | - | Y | `/provider switch termux-ssh` | `set_provider` | - |
| 8 | SSH remote playback | `play-tts-ssh-remote` | Y | - | Y | - | - | - |
| 9 | Enhanced TTS (effects chain) | `play-tts-enhanced` | Y | - | Y | - | - | - |
| 10 | Receiver (voiceless) | `play-tts-agentvibes-receiver-for-voiceless-connections` | Y | - | Y | - | - | - |
| 11 | Session start greeting | `session-start-tts` | Y | Y | Y | - (hook) | - | - |
| 12 | Stop TTS | `stop-tts` | Y | - | Y | - | - | Y |

### Voice Management

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 13 | Voice switching | `voice-manager` | Y | Y* | Y | `/switch` | `set_voice` | Y |
| 14 | Voice listing | `voice-manager` | Y | Y* | Y | `/list` | `list_voices` | Y |
| 15 | Voice preview | `voice-manager` | Y | Y* | Y | `/preview` | - | Y |
| 16 | Get current voice | `voice-manager` | Y | Y* | Y | `/get` | `get_config` | - |
| 17 | Replay audio | `voice-manager` | Y | Y* | Y | `/replay` | `replay_audio` | - |
| 18 | macOS voice manager | `macos-voice-manager` | Y | N/A | N/A | - | - | - |
| 19 | Piper voice manager | `piper-voice-manager` | Y | - | Y | - | - | - |
| 20 | Piper multispeaker | `piper-multispeaker-registry` | Y | - | Y | - | - | - |
| 21 | Download extra voices | `download-extra-voices` | Y | Y | Y | - | `download_extra_voices` | - |
| 22 | Piper voice download | `piper-download-voices` | Y | - | Y | - | - | - |
| 23 | Add custom voice | - | Y | Y | Y | `/add` | - | - |
| 24 | Voice sample | - | Y | Y | Y | `/sample` | - | - |
| 25 | Set favorite voice | - | Y | Y | Y | `/set-favorite-voice` | - | - |

> *\* Windows uses `voice-manager-windows.ps1` (different naming from `voice-manager.sh`)*

### Provider Management

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 26 | Provider switching | `provider-manager` | Y | Y | Y | `/provider` | `set_provider` | Y |
| 27 | Provider commands | `provider-commands` | Y | - | Y | `/provider` | - | Y |

### Personality & Sentiment

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 28 | Personality set/get | `personality-manager` | Y | - | Y | `/personality` | `set_personality` | Y |
| 29 | Personality listing | `personality-manager` | Y | - | Y | `/personality list` | `list_personalities` | Y |
| 30 | Sentiment manager | `sentiment-manager` | Y | - | Y | `/sentiment` | - | - |

### Audio Effects

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 31 | Reverb set | `effects-manager` | Y | Y | Y | `/effects` | `set_reverb` | Y |
| 32 | Reverb get | `effects-manager` | Y | Y | Y | `/effects` | `get_reverb` | Y |
| 33 | List all effects | `effects-manager` | Y | Y | Y | `/effects` | `list_audio_effects` | Y |
| 34 | Audio processor (sox) | `audio-processor` | Y | - | Y | - | - | - |
| 35 | Speed control | `speed-manager` | Y | - | Y | `/set-speed` | `set_speed` | Y |
| 36 | Get speed | `speed-manager` | Y | - | Y | `/set-speed` | `get_speed` | Y |

### Background Music

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 37 | BG music enable/disable | `background-music-manager` | Y | Y | Y | `/background-music` | `enable_background_music` | Y |
| 38 | BG music set track | `background-music-manager` | Y | Y | Y | `/background-music` | `set_background_music` | Y |
| 39 | BG music volume | `background-music-manager` | Y | Y | Y | `/background-music` | `set_background_music_volume` | Y |
| 40 | BG music list tracks | `background-music-manager` | Y | Y | Y | `/background-music` | `list_background_music` | Y |
| 41 | BG music status | `background-music-manager` | Y | Y | Y | `/background-music` | `get_background_music_status` | Y |
| 42 | Optimize BG music | `optimize-background-music` | Y | - | Y | - | - | - |
| 43 | Migrate BG music | `migrate-background-music` | Y | - | Y | - | - | - |

### Language & Learning

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 44 | Language set | `language-manager` | Y | - | Y | `/set-language` | `set_language` | - |
| 45 | Learn mode toggle | `learn-manager` | Y | - | Y | `/learn` | `set_learn_mode` | - |
| 46 | Translation | `translate-manager` | Y | - | Y | `/translate` | - | Y |
| 47 | Replay target audio | `replay-target-audio` | Y | - | Y | `/replay-target` | - | - |
| 48 | Set target language | - | Y | Y | Y | `/target` | - | - |
| 49 | Set target voice | - | Y | Y | Y | `/target-voice` | - | - |
| 50 | Set native language | - | Y | Y | Y | `/language` | - | - |

### Mute / Verbosity

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 51 | Mute | `verbosity-manager` | Y | - | Y | `/mute` | `mute` | Y |
| 52 | Unmute | `verbosity-manager` | Y | - | Y | `/unmute` | `unmute` | Y |
| 53 | Is muted check | `verbosity-manager` | Y | - | Y | - | `is_muted` | Y |
| 54 | Verbosity set | `verbosity-manager` | Y | - | Y | `/verbosity` | `set_verbosity` | Y |
| 55 | Verbosity get | `verbosity-manager` | Y | - | Y | `/verbosity` | `get_verbosity` | Y |
| 56 | Pretext set | - | Y | Y | Y | `/set-pretext` | - | Y |

### BMAD Integration

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 57 | BMAD speak (per-agent TTS) | `bmad-speak` | Y | - | Y | - (hook) | - | Y |
| 58 | BMAD speak enhanced | `bmad-speak-enhanced` | Y | - | Y | - | - | - |
| 59 | BMAD TTS injector | `bmad-tts-injector` | Y | - | Y | - | - | - |
| 60 | BMAD voice manager | `bmad-voice-manager` | Y | - | Y | `/bmad` | - | Y |
| 61 | BMAD party mode voices | - | Y | Y | Y | `/agent-vibes-bmad-voices` | - | Y |
| 62 | TTS queue (party mode) | `tts-queue` | Y | - | Y | - | - | Y |
| 63 | TTS queue worker | `tts-queue-worker` | Y | - | Y | - | - | - |

### Cache & Cleanup

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 64 | Clean audio cache | `clean-audio-cache` | Y | - | Y | `/clean` | `clean_audio_cache` | - |
| 65 | Cleanup cache (interactive) | `cleanup-cache` | Y | - | Y | `/cleanup` | - | - |
| 66 | Audio cache utils | `audio-cache-utils` | Y | Y | Y | - | - | - |

### Configuration & System

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 67 | Get config | - | Y | Y | Y | `/whoami` | `get_config` | - |
| 68 | Path resolver | `path-resolver` | Y | - | Y | - | - | - |
| 69 | RDP mode | `configure-rdp-mode` | Y | - | Y | `/agent-vibes-rdp` | - | - |
| 70 | Version check | - | Y | Y | Y | `/version` | - | - |
| 71 | Update | - | Y | Y | Y | `/update` | - | Y |
| 72 | Hide/show commands | - | Y | Y | Y | `/hide`, `/show` | - | - |

### Installation & Setup

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 73 | Piper installer | `piper-installer` | Y | - | Y | - | - | - |
| 74 | Termux installer | `termux-installer` | Y | N/A | N/A | - | - | Y |
| 75 | Windows setup | `setup-windows.ps1` | N/A | Y | N/A | - | - | - |
| 76 | WSL Piper install | `scripts/piper-voice/wsl-install` | N/A | N/A | Y | - | - | - |
| 77 | Migration script | `migrate-to-agentvibes` | Y | - | Y | - | - | - |
| 78 | SSH receiver setup | `setup-ssh-receiver.ps1` | N/A | Y | N/A | - | - | - |
| 79 | TTS lock dir setup | `setup-tts-lock-dir.sh` | Y | N/A | Y | - | - | - |

### Specialized / Misc

| # | Feature | Script | Linux/macOS | Windows | WSL | Slash Cmd | MCP Tool | Test |
|---|---------|--------|:-----------:|:-------:|:---:|-----------|----------|:----:|
| 80 | AI Agent roles | - | Y | Y | Y | `/agent` | - | - |
| 81 | Voice browser TUI | `bin/agentvibes-voice-browser.js` | Y | Y | Y | `/audio-browser` | - | - |
| 82 | GitHub star reminder | `github-star-reminder` | Y | - | Y | - | - | - |
| 83 | Release prep | `prepare-release` | Y | - | Y | `/release` | - | - |
| 84 | ClawdBot receiver | `clawdbot-receiver` | Y | - | Y | - | - | - |
| 85 | ClawdBot receiver (secure) | `clawdbot-receiver-SECURE` | Y | - | Y | - | - | - |

---

## Matrix 2: Windows Script Gap Analysis

Scripts that exist on Linux/macOS but are **missing** on Windows (excluding N/A platform-specific ones):

| # | Missing Script | Feature Impact | Priority | Notes |
|---|---------------|----------------|----------|-------|
| 1 | `personality-manager` | Cannot set/get/list personalities | **HIGH** | MCP `set_personality` + `list_personalities` broken |
| 2 | `voice-manager` | Voice ops via MCP may fail | **HIGH** | `voice-manager-windows.ps1` exists but naming mismatch |
| 3 | `speed-manager` | Cannot set/get speed | **HIGH** | MCP `set_speed` + `get_speed` broken |
| 4 | `language-manager` | Cannot set language | **HIGH** | MCP `set_language` broken |
| 5 | `learn-manager` | Cannot toggle learn mode | **HIGH** | MCP `set_learn_mode` broken |
| 6 | `verbosity-manager` | Cannot mute/unmute/set verbosity | **HIGH** | MCP `mute`/`unmute`/`set_verbosity` broken |
| 7 | `clean-audio-cache` | Cannot clean cache via MCP | **MEDIUM** | MCP `clean_audio_cache` broken |
| 8 | `sentiment-manager` | Cannot set sentiment | **MEDIUM** | Slash cmd only |
| 9 | `translate-manager` | Cannot configure translation | **MEDIUM** | Slash cmd only |
| 10 | `replay-target-audio` | Cannot replay target lang audio | **MEDIUM** | Slash cmd only |
| 11 | `bmad-speak` | BMAD party mode broken | **MEDIUM** | No per-agent TTS on Windows |
| 12 | `bmad-voice-manager` | Cannot manage BMAD voices | **MEDIUM** | Slash cmd only |
| 13 | `tts-queue` | Party mode queue broken | **MEDIUM** | Needed for bmad-speak |
| 14 | `tts-queue-worker` | Party mode worker | **MEDIUM** | Needed for bmad-speak |
| 15 | `audio-processor` | No sox-based effects chain | **LOW** | ffmpeg used instead on Windows |
| 16 | `configure-rdp-mode` | Cannot configure RDP mode | **LOW** | Windows-specific need though! |
| 17 | `stop-tts` | Cannot stop TTS mid-playback | **LOW** | - |
| 18 | `path-resolver` | Path resolution utility | **LOW** | May be handled inline |
| 19 | `provider-commands` | Provider sub-commands | **LOW** | Main provider-manager exists |
| 20 | `cleanup-cache` | Interactive cache cleanup | **LOW** | Non-interactive `clean` exists |
| 21 | `piper-download-voices` | Manual Piper download | **LOW** | `download-extra-voices` exists |
| 22 | `piper-voice-manager` | Piper-specific voice ops | **LOW** | General voice manager handles it |
| 23 | `piper-multispeaker-registry` | Multispeaker voice data | **LOW** | - |
| 24 | `piper-installer` | Piper install on Windows | **LOW** | Handled by setup-windows.ps1 |
| 25 | `github-star-reminder` | Cosmetic reminder | **LOW** | Non-essential |
| 26 | `prepare-release` | Release workflow | **LOW** | Dev tooling |
| 27 | `bmad-speak-enhanced` | Enhanced BMAD speak | **LOW** | Needs bmad-speak first |
| 28 | `bmad-tts-injector` | BMAD injection | **LOW** | Needs bmad-speak first |
| 29 | `play-tts-enhanced` | Enhanced effects | **LOW** | - |
| 30 | `play-tts-ssh-remote` | SSH remote | **LOW** | Not typical on Windows |
| 31 | `optimize-background-music` | Optimize BG music | **LOW** | Utility |
| 32 | `migrate-background-music` | Migration | **LOW** | One-time |
| 33 | `migrate-to-agentvibes` | Migration | **LOW** | One-time |
| 34 | `clawdbot-receiver` | SSH receiver | **LOW** | Has separate Windows setup |
| 35 | `clawdbot-receiver-SECURE` | Secure receiver | **LOW** | Has separate Windows setup |

---

## Matrix 3: Test Coverage

| # | Test File | Type | Features Covered | Platform |
|---|-----------|------|-----------------|----------|
| **Unit Tests (JS)** | | | | |
| 1 | `agents-tab.test.js` | Unit | Agents tab UI | All |
| 2 | `audio-effects-helpers.test.js` | Unit | Audio effects helpers | All |
| 3 | `audio-format-validator.test.js` | Unit | Audio format validation | All |
| 4 | `background-music.test.js` | Unit | BG music config, naming | All |
| 5 | `bmad-path-security.test.js` | Unit | BMAD path security | All |
| 6 | `command-routing.test.js` | Unit | Command routing | All |
| 7 | `config-service-rw.test.js` | Unit | Config read/write, merging | All |
| 8 | `console-app.test.js` | Unit | TUI scaffold, tabs, navigation | All |
| 9 | `emoji.test.js` | Unit | Emoji handling | All |
| 10 | `file-ownership-verifier.test.js` | Unit | File ownership checks | All |
| 11 | `footer-config.test.js` | Unit | Footer config, colors | All |
| 12 | `help-readme-tabs.test.js` | Unit | Help/README tabs | All |
| 13 | `install-tab.test.js` | Unit | Install tab UI | All |
| 14 | `installer-cli.test.js` | Unit | CLI installer | All |
| 15 | `installer-termux.test.js` | Unit | Termux installer | Android |
| 16 | `intro-text-helpers.test.js` | Unit | Intro text rendering | All |
| 17 | `modal-overlay.test.js` | Unit | Modal overlay UI | All |
| 18 | `music-settings-helpers.test.js` | Unit | Music settings helpers | All |
| 19 | `music-tab.test.js` | Unit | Music tab UI | All |
| 20 | `navigation-service.test.js` | Unit | Navigation service | All |
| 21 | `navigation.test.js` | Unit | Navigation UI | All |
| 22 | `personality-verbosity-helpers.test.js` | Unit | Personality/verbosity helpers | All |
| 23 | `pretext.test.js` | Unit | Pretext configuration | All |
| 24 | `provider-service.test.js` | Unit | Provider service | All |
| 25 | `provider-validator.test.js` | Unit | Provider validation | All |
| 26 | `secure-music-storage.test.js` | Unit | Secure music storage | All |
| 27 | `settings-tab-navigation.test.js` | Unit | Settings tab nav | All |
| 28 | `settings-tab.test.js` | Unit | Settings tab UI | All |
| 29 | `stop-tts-markdown.test.js` | Unit | Stop TTS markdown | All |
| 30 | `uninstall.test.js` | Unit | Uninstall flow | All |
| 31 | `verbosity-service.test.js` | Unit | Verbosity service | All |
| 32 | `voices-tab.test.js` | Unit | Voices tab UI | All |
| 33 | `windows-tts.test.js` | Unit | Windows TTS specifics | Windows |
| **BATS Shell Tests** | | | | |
| 34 | `background-music-disabled.bats` | Shell | BG music disabled state | Linux/macOS |
| 35 | `bmad-voice-map.bats` | Shell | BMAD voice mapping | Linux/macOS |
| 36 | `bmad-voice-map-edge-cases.bats` | Shell | BMAD voice edge cases | Linux/macOS |
| 37 | `intro-messages.bats` | Shell | Intro messages | Linux/macOS |
| 38 | `party-mode-tts.bats` | Shell | Party mode TTS | Linux/macOS |
| 39 | `personality-manager.bats` | Shell | Personality management | Linux/macOS |
| 40 | `personality-voice-mapping.bats` | Shell | Personality-voice mapping | Linux/macOS |
| 41 | `play-tts.bats` | Shell | TTS playback | Linux/macOS |
| 42 | `provider-manager.bats` | Shell | Provider management | Linux/macOS |
| 43 | `provider-switching.bats` | Shell | Provider switching | Linux/macOS |
| 44 | `speed-manager.bats` | Shell | Speed control | Linux/macOS |
| 45 | `translator.bats` | Shell | Translation | Linux/macOS |
| 46 | `voice-manager.bats` | Shell | Voice management | Linux/macOS |
| **Security Tests** | | | | |
| 47 | `path-traversal.test.js` | Security | 100+ path traversal attacks | All |
| 48 | `edge-cases.test.js` | Security | 65+ edge case attacks | All |
| 49 | `link-attacks.test.js` | Security | Link-based attacks | All |
| **Utility Tests** | | | | |
| 50 | `audio-duration-validator.test.js` | Utils | Audio duration validation | All |
| **Integration Tests** | | | | |
| 51 | `installer-page-flow.test.js` | Integration | 8-page installer flow | All |
| **Python Tests** | | | | |
| 52 | `test_server.py` | Unit | MCP server, mute, providers | All |

---

## Matrix 4: Features Without Test Coverage

| # | Feature | Script | Gap Type | Priority |
|---|---------|--------|----------|----------|
| 1 | macOS Say provider | `play-tts-macos` | No test | LOW (platform-specific) |
| 2 | Soprano provider | `play-tts-soprano` | No test | MEDIUM |
| 3 | Termux SSH provider | `play-tts-termux-ssh` | No test | LOW |
| 4 | SSH remote playback | `play-tts-ssh-remote` | No test | LOW |
| 5 | Session start greeting | `session-start-tts` | No test | LOW |
| 6 | macOS voice manager | `macos-voice-manager` | No test | LOW |
| 7 | Piper voice manager | `piper-voice-manager` | No test | LOW |
| 8 | Download extra voices | `download-extra-voices` | No test | MEDIUM |
| 9 | Language manager | `language-manager` | No test | MEDIUM |
| 10 | Learn manager | `learn-manager` | No test | MEDIUM |
| 11 | Replay target audio | `replay-target-audio` | No test | LOW |
| 12 | Sentiment manager | `sentiment-manager` | No test | LOW |
| 13 | Audio processor (sox) | `audio-processor` | No test | LOW |
| 14 | Clean audio cache | `clean-audio-cache` | No test | LOW |
| 15 | Cleanup cache | `cleanup-cache` | No test | LOW |
| 16 | Configure RDP mode | `configure-rdp-mode` | No test | LOW |
| 17 | Path resolver | `path-resolver` | No test | LOW |
| 18 | Get config / whoami | - | No test | MEDIUM |
| 19 | Effects manager (Windows) | `effects-manager.ps1` | No test | MEDIUM |
| 20 | Voice browser TUI | `agentvibes-voice-browser.js` | No test | MEDIUM |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total features tracked | 85 |
| Linux/macOS scripts | 49 |
| Windows scripts | 11 |
| Script parity gap (Windows missing) | 35 |
| HIGH priority gaps | 6 |
| Slash commands | ~40 |
| MCP tools | 27 |
| Total test files | 52 |
| Features with tests | ~65 |
| Features without tests | ~20 |
| BATS tests (Linux/macOS only) | 13 |
| BATS tests with Windows equivalents | 0 |
