# AgentVibes Release Notes

## v4.0.0 - Interactive Console & Voice Explorer

**Release Date:** March 9, 2026

### Summary

AgentVibes v4.0.0 is a major release that transforms the user experience with a full interactive TUI (Terminal User Interface) console, a voice browser with 914+ voices, and comprehensive platform support. This release includes 260 commits with 68 new features, 88 bug fixes, and significant security hardening across the entire codebase.

### Key Features

**Interactive TUI Console:**
- Full terminal UI with tabbed navigation (Settings, Voices, Music, Agents, Help)
- Real-time settings management with live preview
- Voice selection modal with Save Locally/Globally options
- Music tab with background track browsing and preview
- Installer wizard with 5-screen guided flow
- Two-column settings layout with audio effects controls

**Voice Explorer & Browser:**
- Browse and preview 914+ Piper TTS voices
- Multi-speaker voice support with individual speaker selection
- Voice list with Name/Gender/Provider columns
- One-click voice installation and switching
- Friendly name resolution for voice switching

**Reliable TTS Hook System:**
- SessionStart hook now outputs structured JSON for reliable context injection
- Installer auto-initializes git repo (required for Claude Code hook support)
- Global voice config fallback when local multi-speaker files are missing
- Fixed hook path resolution for non-git directories

**Platform & Provider Improvements:**
- Native Windows support with Soprano, Piper, and SAPI providers
- Android/Termux support with termux-ssh provider
- SSH-PulseAudio remote audio streaming
- Clawdbot multi-agent SSH-remote TTS support
- macOS audio player support (afplay)
- Background music with custom track uploads

**Security Hardening:**
- 58 code review issues fixed across all files
- SSH receiver scripts hardened against injection attacks
- Comprehensive input validation and path traversal prevention
- Strict mode enforced across all bash scripts
- 180+ security test variations added

### Bug Fixes

- Fixed multi-speaker voice ID storage and playback matching
- Fixed header status bar updates when settings change
- Fixed verbosity manager reading wrong .claude/ dir via MCP
- Fixed audio overlap with file locking mechanism
- Fixed provider selection navigation staying on correct page
- Fixed SessionStart hook calling PowerShell instead of bash on WSL2
- Fixed ffmpeg install prompt when sudo lacks a tty
- Fixed background music sync when track changes in Settings

### Breaking Changes

- Minimum Node.js version: v20
- SessionStart hook output format changed from plain text to JSON
- Voice config files restructured for multi-speaker support
- Installer now creates a git repository in the target directory

