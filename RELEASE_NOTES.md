# AgentVibes Release Notes

## 📦 v2.18.0 - Uninstall Command & CI Improvements

**Release Date:** December 30, 2025

### 🤖 AI Summary

AgentVibes v2.18.0 introduces a comprehensive uninstall command that makes it easy to cleanly remove AgentVibes from your projects. The new `agentvibes uninstall` command provides interactive confirmation, flexible removal options (project-level, global, or complete including Piper TTS), and clear documentation. This release also improves CI test reliability by adjusting timeouts for slower build environments, ensuring more consistent test results across different systems.

**Key Highlights:**
- 🗑️ **Comprehensive Uninstall Command** - New `agentvibes uninstall` with interactive confirmation and preview of what will be removed
- 🎛️ **Flexible Removal Options** - Support for `--yes` (auto-confirm), `--global` (remove global config), and `--with-piper` (remove TTS engine) flags
- 📚 **Complete Documentation** - New uninstall section in README with examples, options, and what gets removed at each level
- 🧪 **Improved CI Reliability** - Increased party-mode TTS test timeout from 10s to 15s for slower CI systems

### ✨ New Features

**Uninstall Command (`src/installer.js`):**
- Added `agentvibes uninstall` command with ~194 lines of new functionality
- Interactive confirmation prompt (skippable with `--yes` flag)
- Preview display showing exactly what will be removed before uninstalling
- Project-level uninstall (default): Removes `.claude/`, `.agentvibes/` directories
- Global uninstall (with `--global`): Also removes `~/.claude/`, `~/.agentvibes/`
- Complete uninstall (with `--with-piper`): Also removes `~/piper/` TTS engine
- Safety check: Verifies installation exists before proceeding
- Colored output with spinner, progress indicators, and feedback prompts
- Helpful messaging with reinstall instructions and feedback link

### 📝 Documentation

**README.md:**
- Added new "🗑️ Uninstalling" section to Table of Contents
- Complete uninstall documentation with:
  - Quick uninstall command: `npx agentvibes uninstall`
  - All command options with descriptions
  - Clear breakdown of what gets removed at each level (project/global/Piper)
  - Tips and best practices
  - Reinstall instructions

### 🐛 Bug Fixes & Improvements

**Test Reliability (`test/unit/party-mode-tts.bats`):**
- Increased timeout for party mode multi-agent TTS test from 10s to 15s
- Accommodates slower CI systems while still catching real performance issues
- Updated test comment to explain the timeout adjustment

### 🔧 Technical Details

**Files Changed:**
- `README.md`: Added uninstall documentation section (+56 lines)
- `src/installer.js`: Implemented uninstall command (+194 lines)
- `test/unit/party-mode-tts.bats`: Adjusted timeout for CI compatibility (+2 lines, -2 lines)

**Command Usage:**
```bash
# Interactive uninstall (confirms before removing)
npx agentvibes uninstall

# Auto-confirm (skip confirmation prompt)
npx agentvibes uninstall --yes

# Also remove global configuration
npx agentvibes uninstall --global

# Complete uninstall including Piper TTS
npx agentvibes uninstall --global --with-piper
```

### 📊 Impact

**User Experience:**
- Users can now cleanly uninstall AgentVibes at their preferred scope
- Clear visibility into what will be removed before taking action
- Safety confirmation prevents accidental uninstalls
- Easy reinstallation path with `npx agentvibes install`

**Developer Experience:**
- More reliable CI builds with adjusted test timeouts
- Better test failure signal-to-noise ratio
- Clearer test comments explaining timeout rationale

---

## 📦 v2.17.9 - Documentation Accuracy Update

**Release Date:** December 20, 2024

### 🤖 AI Summary

AgentVibes v2.17.9 is a documentation accuracy release that removes all outdated ElevenLabs references and updates documentation to reflect the current architecture. This release corrects the voice library documentation (removing fake piper.io URLs), updates provider documentation to accurately describe Piper TTS and macOS Say (removing references to the no-longer-supported ElevenLabs provider), and completely rewrites the technical deep dive to reflect the current startup hook architecture instead of the deprecated output styles system.

**Key Highlights:**
- 📚 **Voice Library Accuracy** - Replaced fake voice URLs with actual Piper TTS voice names and accurate language support (18+ languages)
- 🔧 **Provider Documentation** - Removed ElevenLabs section, added macOS Say provider details, corrected feature comparison tables
- 🏗️ **Architecture Update** - Technical deep dive rewritten: "Output Style System" → "Startup Hook Protocol", updated from 4 to 3 core systems
- ✅ **Code Example Accuracy** - All code snippets now match current implementation (Piper TTS local generation, macOS Say integration)

### 📝 Documentation Updates

**docs/voice-library.md:**
- Removed fake "piper.io/voice-library" URLs (formatted like old ElevenLabs links)
- Updated from "30+ languages" to accurate "18+ languages"
- Replaced character voice list with actual Piper voice names (en_US-lessac-medium, en_GB-alan-medium, etc.)
- Added commands to preview and list voices

**docs/providers.md:**
- Removed entire "Piper TTS (Premium AI Voices)" section with ElevenLabs references
- Added "macOS Say (Built-in, Free)" provider section
- Updated provider comparison table: Piper TTS vs macOS Say (was incorrectly "Piper TTS vs Piper TTS")
- Removed outdated pricing information ($0-99/month)
- Removed API key requirements
- Updated recommendations for cross-platform vs macOS-specific use cases

**docs/technical-deep-dive.md** (Major Rewrite):
- Architecture: Changed from "4 Core Systems" to "3 Core Systems" (removed Output Style System)
- System 1: "Output Style System" → "Startup Hook Protocol"
  - Explained how `.claude/hooks/startup.sh` injects TTS instructions
  - Removed references to `.claude/output-styles/agent-vibes.md`
  - Added actual startup hook code examples
- Provider Implementation:
  - Removed fake ElevenLabs API curl examples
  - Removed SSH audio conversion (MP3→OGG, only needed for API streaming)
  - Added macOS Say provider implementation with actual code
  - Updated Piper implementation to show local voice generation
- Data Flow: Updated all examples to use startup hook instead of output style
- Installation: Removed `output-styles/` from directory structure, added `startup.sh`
- Performance: Updated latency numbers (removed API latency, added local generation times)
- Error Handling: "API Failure Handling" → "TTS Generation Failure Handling"
- Updated voice references from "150+ voices" to "50+ neural voices"
- Changed default voice from "Aria" to "en_GB-alan-medium"

### 🐛 Bug Fixes

**macOS Installation (src/installer.js):**
- Fixed Python installation on macOS to handle PEP 668 externally-managed environments
- Added `--break-system-packages` flag for Python dependencies when virtual environments aren't available
- Prevents installation failures on macOS systems with externally-managed Python
- Maintains compatibility with standard Python environments

### 🔧 Technical Details

**Files Changed:**
- `docs/voice-library.md`: Voice name and language accuracy
- `docs/providers.md`: Provider documentation overhaul
- `docs/technical-deep-dive.md`: Complete architecture rewrite
- `src/installer.js`: macOS Python dependency handling

### 📊 Impact

This release ensures that all documentation accurately reflects the current AgentVibes architecture. No functionality was changed, but users will find:
- Accurate voice names and language support
- Correct provider information for making informed choices
- Technical documentation matching the actual codebase
- Better macOS installation reliability
