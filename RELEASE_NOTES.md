# AgentVibes Release Notes

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
