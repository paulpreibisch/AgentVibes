# Release v2.12.5 - Code Quality Improvements

**Release Date:** 2025-01-23
**Type:** Patch Release (Quality & Security)

## 🔒 AI Summary

AgentVibes v2.12.5 improves code quality by upgrading Sonar quality gates and implementing best practices identified through static analysis. This release includes enhanced input validation, improved shell command handling, better file locking for atomic operations, and secure temporary directory management while maintaining 100% backward compatibility. All 110 existing tests pass with no breaking changes.

**Key Highlights:**
- ✅ **Sonar Quality Gates Upgraded** - Enhanced code quality standards across the codebase
- 🔒 **18 Code Improvements** - Better input validation, command handling, and file operations
- 🧪 **110/110 Tests Passing** - All functionality verified and working
- 🔄 **Zero Breaking Changes** - Fully backward compatible with existing installations
- 📊 **162 Lines Enhanced** - Code quality improvements across 8 files

---

## 🔧 Code Quality Improvements

### Enhanced Input Validation
**Files:** `src/installer.js`, `.claude/hooks/play-tts.sh`, `mcp-server/install-deps.js`

- Added comprehensive input validation across all user-facing interfaces
- Shell metacharacter detection and validation
- Numeric validation for configuration values
- Empty/null checks for required parameters
- **Impact:** More robust error handling and better user experience

### Improved Shell Command Handling
**Files:** `src/installer.js:200`, `scripts/fix-audio-tunnel.sh`, `src/commands/bmad-voices.js:221`

- Enhanced shell script execution with proper argument escaping
- Added `escapeShellArg()` helper function for safe parameter passing
- Proper quoting of all shell variables in SSH commands
- Python command validation against allowlist
- **Impact:** Safer script execution and better command reliability

### Better File System Operations
**Files:** `src/installer.js` (multiple locations)

- Added `isPathSafe()` validation function for file operations
- Canonical path resolution to prevent unexpected behavior
- More restrictive file permissions (750 instead of 755)
- User-specific temporary directories with proper permissions (700)
- **Impact:** More predictable file operations and better isolation

### Atomic PID File Operations
**File:** `.claude/hooks/tts-queue.sh:47-57`

- Implemented flock-based file locking for PID management
- Atomic PID file operations prevent race conditions
- Added timeout protection (5 seconds) for lock acquisition
- **Impact:** Prevents duplicate TTS queue workers in edge cases

### Code Cleanup
**File:** `src/installer.js:1398-1450`

- Removed debug console.error statements
- Cleaner production output
- **Impact:** Better user experience with less verbose output

---

## 📊 Changes Summary

**Files Modified:** 8
- `src/installer.js` - Input validation, command handling, path operations, code cleanup
- `src/commands/bmad-voices.js` - Enhanced shell argument escaping
- `mcp-server/install-deps.js` - Python command validation
- `scripts/fix-audio-tunnel.sh` - SSH command quoting improvements
- `.claude/hooks/tts-queue.sh` - Secure temp directory, file locking
- `.claude/hooks/play-tts.sh` - Input validation
- `test/unit/play-tts.bats` - Updated test expectations
- `AgentVibes.code-workspace` - Minor workspace config

**Lines Changed:** 162 additions, 35 deletions

**Test Results:** 110/110 passing ✅

---

## 💡 Technical Improvements

### Best Practices Implemented

**Input Handling**
- Comprehensive validation before processing
- Metacharacter detection for shell inputs
- Type validation (numeric, string, etc.)
- Empty/null safety checks

**Command Execution**
- Proper argument escaping for shell commands
- Allowlist-based command validation
- Quote all variables in shell scripts
- Avoid raw string interpolation

**File Operations**
- Path validation and canonical resolution
- Appropriate permissions for different file types
- User-specific temporary directories
- Atomic operations where needed

**Concurrency**
- File locking for shared resources
- Atomic PID file operations
- Timeout protection on locks

**Code Quality**
- Removed debug output from production code
- Clear, informative error messages
- Consistent code patterns

---

## ✅ Testing

### Test Suite Results
- **110 tests total**
- **110 passing** ✅
- **0 failing**
- All functionality verified working

### Test Coverage
- Personality Manager: 14 tests
- Play TTS: 6 tests (including validation)
- Provider Manager: 43 tests
- Speed Manager: 37 tests
- Voice Manager: 11 tests

---

## 🎯 Migration Notes

**No migration required** - This is a patch release with code quality improvements.

**Compatibility:** 100% backward compatible with v2.12.4

**Recommended Action:** Update to get the latest improvements
```bash
npx agentvibes@latest update
```

---

## 🔗 References

- GitHub Issue #44: https://github.com/paulpreibisch/AgentVibes/issues/44
- Sonar Quality Gates: Code quality and best practices analysis

---

# Release v2.12.0 - .agentvibes/ Directory Migration

**Release Date:** 2025-11-20
**Type:** Minor Release (Breaking Change - Automatic Migration)

## 🎯 AI Summary

AgentVibes v2.12.0 introduces a comprehensive directory reorganization, migrating all AgentVibes-specific configuration from `.claude/config/` and `.claude/plugins/` to a dedicated `.agentvibes/` directory. This eliminates namespace confusion with Claude Code's official directories and provides a clear, predictable location for all AgentVibes state. The migration is fully automatic during upgrade—users simply run `npx agentvibes@latest update` and their configuration is seamlessly moved. This release also includes extensive BMAD testing improvements with the new `npx test-bmad-pr` command and comprehensive Piper voice installation enhancements.

**Key Highlights:**
- 📁 **Dedicated .agentvibes/ Directory** - Clear namespace separation from Claude Code
- 🔄 **Automatic Migration** - Seamless upgrade from .claude/config/ and .claude/plugins/
- ✅ **100% Backward Compatible** - No manual intervention required
- 🧪 **32 Passing Tests** - Comprehensive test suite validates all migration scenarios
- 🎭 **BMAD Testing Made Easy** - New `npx test-bmad-pr` command for one-line testing
- 🎤 **Improved Voice Installation** - Better Piper voice detection and status display

---

## 🚀 Major Features

### Dedicated .agentvibes/ Directory Structure

**Complete namespace reorganization** (commits: ab293d05, 04f2f97d, 99134216)

The `.agentvibes/` directory replaces scattered configuration across `.claude/config/` and `.claude/plugins/`:

```
.agentvibes/
├── bmad/                    # BMAD integration
│   ├── bmad-voices.md       # Agent-to-voice mappings
│   ├── bmad-voices-enabled.flag
│   ├── bmad-party-mode-disabled.flag
│   └── .bmad-previous-settings
└── config/                  # AgentVibes configuration
    ├── agentvibes.json      # Pretext configuration
    ├── personality-voice-defaults.json
    └── README-personality-defaults.md
```

**Migration Paths:**
- `.claude/config/agentvibes.json` → `.agentvibes/config/agentvibes.json`
- `.claude/plugins/bmad-voices-enabled.flag` → `.agentvibes/bmad/bmad-voices-enabled.flag`
- `.claude/config/bmad-voices.md` → `.agentvibes/bmad/bmad-voices.md`

**Benefits:**
- ✅ Clear ownership - `.agentvibes/` is obviously AgentVibes-managed
- ✅ No collision risk - Claude Code may add official plugins in the future
- ✅ Easier troubleshooting - All state in one predictable location
- ✅ Better organization - Separate BMAD integration from core config

### Automatic Migration System

**Seamless upgrade experience** (commit: ab293d05)

- **Detection:** Installer automatically detects old configuration on startup
- **Execution:** Runs `.claude/hooks/migrate-to-agentvibes.sh` automatically
- **Preservation:** All settings, voice mappings, and flags preserved
- **Cleanup:** Removes empty `.claude/plugins/` directory after migration
- **Graceful Fallback:** Manual migration option if auto-migration fails

**Migration Script Features:**
- Color-coded progress output
- File-by-file migration reporting
- Duplicate detection and handling
- Preserves `.claude/config/` for runtime state files (like `tts-speech-rate.txt`)

### Comprehensive Test Suite

**32 passing tests across 6 scenarios** (commit: ab293d05)

Created `test-migration.sh` with full coverage:

1. **Fresh Install** (6 assertions)
   - Verifies `.agentvibes/` created directly
   - Ensures old directories NOT created

2. **Upgrade from v2.9.x** (9 assertions)
   - Auto-migration of all config files
   - Cleanup of old locations
   - Value preservation

3. **Manual Migration** (4 assertions)
   - Script execution
   - File movement
   - Old location cleanup

4. **BMAD Integration** (5 assertions)
   - Voice mappings in new location
   - Hook scripts read from new paths
   - Party mode functionality

5. **Pretext Configuration** (3 assertions)
   - Config in new location
   - Scripts reference new paths

6. **No Old Config** (4 assertions)
   - No errors when nothing to migrate
   - Idempotent behavior
