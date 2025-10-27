# 🎤 AgentVibes Release Notes

## 📦 v2.1.4 - Critical Voice Switching Fix for MCP Projects (2025-10-26)

### 🎯 Overview

This patch release fixes a **critical bug** where voice switching didn't work correctly when using AgentVibes via MCP (Model Context Protocol) in project-specific directories. After switching voices, TTS would continue using the old voice instead of the newly selected one.

**Release Date:** October 26, 2025
**Git Tag:** v2.1.4
**Type:** Patch release (bug fix)
**Impact:** Voice switching now works correctly in all contexts (MCP, direct commands, global settings)

---

### 🤖 AI Summary

Medium bug fix: Voice switching now works correctly in MCP project contexts. Previously, after switching voices via MCP (Claude Desktop, Claude Code), TTS would continue using the old voice. This release fixes play-tts-piper.sh to respect CLAUDE_PROJECT_DIR environment variable, ensuring project-specific voice settings take priority. Voice switching now persists correctly across all contexts (MCP, direct commands, global settings).

---

### 🐛 Bug Fixes

- **Fixed Voice Switching in MCP Project Contexts** 🎤
  - Voice switches now persist correctly when using AgentVibes MCP server
  - `play-tts-piper.sh` now respects `CLAUDE_PROJECT_DIR` environment variable
  - Project-specific voice settings take priority over package/global settings
  - Multi-speaker voice configurations (model + speaker ID) also fixed

### 🔧 Technical Details

**Root Cause:**
- When MCP server runs in a project directory (e.g., `/home/user/my-project/`), it sets `CLAUDE_PROJECT_DIR` environment variable
- Voice switching correctly saved to project's `.claude/tts-voice.txt`
- However, `play-tts-piper.sh` didn't check `CLAUDE_PROJECT_DIR`, so it read voice from package directory instead
- Result: Voice appeared switched in config, but TTS still used old voice

**Solution:**
- Updated voice file resolution priority in `play-tts-piper.sh`:
  1. Check `CLAUDE_PROJECT_DIR/.claude/tts-voice.txt` (MCP project context)
  2. Check script location `$SCRIPT_DIR/../tts-voice.txt` (direct usage)
  3. Fall back to `~/.claude/tts-voice.txt` (global)
- Applied same logic to multi-speaker model/speaker ID files

### 📝 Files Changed

- `.claude/hooks/play-tts-piper.sh` (lines 68-94)
  - Added `CLAUDE_PROJECT_DIR` environment variable check
  - Updated multi-speaker file path resolution
  - Added detailed comments explaining priority order

### 🎓 User Impact

**Before This Fix:**
```bash
# In project directory
/agent-vibes:switch kristin
# ✅ Shows: "Voice switched to: kristin"

# But when TTS runs...
# 🐛 Still plays with old voice (e.g., lessac)
```

**After This Fix:**
```bash
# In project directory
/agent-vibes:switch kristin
# ✅ Shows: "Voice switched to: kristin"

# TTS runs...
# ✅ Plays with kristin voice correctly!
```

### 🧪 Testing

Verified fix with:
- ✅ MCP server context with project-local `.claude/` directory
- ✅ Direct slash command usage
- ✅ Global `~/.claude/` fallback
- ✅ Multi-speaker voices (16Speakers model)

### 📚 Related Issues

This fix resolves user-reported issue where voices weren't switching in MCP-enabled projects like Claude Desktop and Claude Code.

---

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

**For CI/CD Automation:**
- Unattended installation now possible:
  ```bash
  npx agentvibes install --provider piper --yes
  # Piper installed automatically without prompts
  ```

### 🔄 Upgrade Path

No breaking changes. Existing installations continue working.

To benefit from automatic Piper installation:
```bash
npx agentvibes update
```

---

## 📦 v2.0.18 - Speed Control & AI Documentation Standards (2025-10-19)

[Previous release notes continue below...]
