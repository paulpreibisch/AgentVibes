# 🎤 AgentVibes Release Notes

## 📦 v2.1.0 - Streamlined Installation & CI Improvements (2025-10-26)

### 🎯 Overview

This minor release delivers **automated Piper TTS installation** and **improved CI/CD workflow**, making AgentVibes easier to install and maintain. Users selecting Piper no longer need manual binary installation - the installer handles everything automatically with human approval.

**Release Date:** October 26, 2025
**Git Tag:** v2.1.0
**Type:** Minor release (new features)
**Impact:** Significantly improved installation experience for Piper users

---

### ✨ New Features

- **Automatic Piper Installation** 🚀
  - Installer now auto-detects if Piper TTS binary is installed
  - Prompts user to install Piper automatically when missing
  - Runs `.claude/hooks/piper-installer.sh` seamlessly during setup
  - Supports `--yes` flag for fully unattended installation
  - Graceful fallback with clear manual instructions if declined

### 🔧 Improvements

- **CI Workflow Cleanup**
  - Removed deprecated `v1` branch from GitHub Actions test workflow
  - Tests now only run on `master` branch and pull requests
  - Cleaner workflow configuration with single source of truth

### 📝 Files Changed

- `src/installer.js` - Added automatic Piper detection and installation (lines 605-659)
- `.github/workflows/test.yml` - Removed v1 branch references

### 🎓 User Impact

**For New Users Installing with Piper:**
- **Before**:
  ```bash
  npx agentvibes install  # Select Piper
  # Then manually run:
  .claude/hooks/piper-installer.sh
  ```
- **After**:
  ```bash
  npx agentvibes install  # Select Piper
  # Installer automatically asks: "Install Piper now? [Y/n]"
  # ✅ Done! Fully automated.
  ```

**For Developers:**
- CI workflow now only monitors `master` branch (v1 deprecated)
- Tests run on all PRs to master with 110 test coverage
- Cleaner GitHub Actions logs

**Technical Details:**
The installer now checks for Piper binary (`piper --version`) after provider selection. If not found, it prompts for installation and executes `piper-installer.sh` which handles:
1. pipx installation (if needed)
2. Piper TTS installation via pipx
3. Optional voice download
4. PATH configuration

### 🤖 AI Summary

This release eliminates manual steps for Piper TTS users by auto-installing the binary during setup, and streamlines the CI workflow by removing deprecated branch references. Installation is now fully hands-off with human approval checkpoints.

---

## 📦 v2.0.24 - Performance Optimization (2025-10-21)

### 🎯 Overview

This patch release delivers a **significant performance optimization** to the output style, reducing CLI overhead by consolidating multiple bash commands into a single efficient call. This makes TTS acknowledgments and completions faster and produces cleaner output.

**Release Date:** October 21, 2025
**Git Tag:** v2.0.24
**Impact:** Performance improvement, cleaner CLI output

---

### ⚡ Performance Improvements

- **Optimized Settings Check**: Reduced three separate bash commands (checking language, sentiment, and personality settings) into one efficient `eval` command
  - **Before**: 3 separate `cat` commands for each setting file
  - **After**: Single compound command that checks all three settings at once
  - **Result**: Faster acknowledgment/completion responses, cleaner CLI output

### 📝 Files Changed

- `.claude/output-styles/agent-vibes.md` - Optimized settings check from 3 commands to 1

### 🎓 User Impact

**For All Users:**
- Faster TTS acknowledgments and completions
- Cleaner CLI output with less visual noise
- No behavioral changes - all features work exactly the same

**Technical Details:**
The optimization uses bash `eval` to combine three sequential file reads into a single compound operation, reducing the number of bash tool calls visible in the Claude Code CLI from 3 to 1 per acknowledgment/completion.

---

## 📦 v2.0.21 - Test Suite & Quality Improvements (2025-10-22)

### 🎯 Overview

This patch release focuses on **test reliability** and **user experience improvements**, making the testing process completely silent and replacing distracting tongue twisters with simple test messages.

**Release Date:** October 22, 2025
**Git Tag:** v2.0.21
**NPM tests:** All 110 tests passing ✅

---

### ✨ New Features

- **Silent Test Mode**: Tests now run completely silently when `AGENTVIBES_TEST_MODE=true` is set

### 🐛 Bug Fixes

- **Fixed provider-manager tests**: Updated 2 failing tests that expected "voice reset to default" but code outputs "voice set to: [voice_name]"
- **Removed tongue twisters**: Replaced distracting tongue twisters with simple test messages:
  - "Testing speed change"
  - "Speed test in progress"
  - "Checking audio speed"
  - "Speed configuration test"
  - "Audio speed test"

### 🧪 Testing Improvements

- **Test configuration**: `npm test` now automatically sets `AGENTVIBES_TEST_MODE=true` for silent execution
- **Audio playback control**: Both Piper and ElevenLabs TTS scripts now respect `AGENTVIBES_TEST_MODE` flag
- **Updated test assertions**: Speed manager tests now check for simple messages instead of tongue twisters

### 📝 Files Changed

- `.claude/hooks/play-tts-piper.sh` - Added AGENTVIBES_TEST_MODE check
- `.claude/hooks/play-tts-elevenlabs.sh` - Added AGENTVIBES_TEST_MODE check
- `.claude/hooks/speed-manager.sh` - Replaced tongue twisters with simple messages
- `mcp-server/server.py` - Replaced tongue twisters with simple messages
- `test/unit/provider-manager.bats` - Fixed 2 failing tests
- `test/unit/speed-manager.bats` - Updated test assertions
- `package.json` - Added AGENTVIBES_TEST_MODE to test scripts

### 🎓 User Impact

**For Developers:**
- Running `npm test` is now completely silent - no more disruptive audio during test runs
- Clearer test output without tongue twister noise
- More reliable test suite (all 110 tests passing)

**For Users:**
- Speed changes still announce themselves during normal use
- Test mode only affects automated testing, not regular usage
- No changes to normal TTS behavior

---
