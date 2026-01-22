# AgentVibes Release Notes

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
