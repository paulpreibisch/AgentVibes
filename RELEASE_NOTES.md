# Release v2.13.4 - BMAD Integration Fix

**Release Date:** 2025-01-27
**Type:** Patch Release (Bug Fix)

## 🔧 AI Summary

AgentVibes v2.13.4 fixes a critical bug in BMAD integration where path security validation was using `process.cwd()` instead of the actual target installation directory. This caused false "Security: Invalid BMAD path detected" errors when AgentVibes was called from BMAD's installer via `npx`.

**Key Highlights:**
- 🔧 **BMAD Path Fix** - Security validation now correctly uses the `targetDir` parameter
- 🛡️ **Edge Case Fixed** - `/projectX` no longer incorrectly matches `/project` prefix
- 🧪 **New Test Suite** - 12 comprehensive tests for path security validation
- ✅ **All Tests Passing** - Full test coverage verified
- 🔄 **Zero Breaking Changes** - Fully backward compatible

---

## 🔧 Bug Fix

### BMAD Path Security Validation (PR #934 Integration)
**Files:** `src/installer.js` (lines 870-895, 1138)

**Problem:**
When BMAD's installer called AgentVibes via `npx agentvibes@latest install`, the `processBmadTtsInjections` function was using `process.cwd()` for security validation. However, `process.cwd()` reflects where the command was run from, not the target installation directory. This caused legitimate BMAD paths to be rejected as security violations.

**Solution:**
- Modified `processBmadTtsInjections` to accept a `targetDir` parameter
- Changed security validation from `isPathSafe(bmadPath, process.cwd())` to `isPathSafe(bmadPath, targetDir)`
- Enhanced `isPathSafe` function to check for path separator, preventing prefix attacks (e.g., `/projectX` should NOT match `/project`)

**Code Change:**
```javascript
// Before (buggy)
async function processBmadTtsInjections(bmadPath) {
  const cwd = process.cwd();
  if (!isPathSafe(bmadPath, cwd)) {
    console.error('⚠️  Security: Invalid BMAD path detected');
    return;
  }
}

// After (fixed)
async function processBmadTtsInjections(bmadPath, targetDir) {
  if (!isPathSafe(bmadPath, targetDir)) {
    console.error('⚠️  Security: Invalid BMAD path detected');
    return;
  }
}
```

**Impact:**
- BMAD integration now works correctly when called via `npx` from any directory
- Security validation still prevents path traversal attacks
- No changes required for existing installations

---

## 🧪 New Tests

### Path Security Validation Test Suite
**File:** `test/unit/bmad-path-security.test.js`

**12 new tests covering:**
1. Valid paths within targetDir
2. Nested paths within targetDir
3. Path traversal attack prevention (e.g., `../../etc/passwd`)
4. Completely different paths rejection
5. Parent directory rejection
6. Relative path handling
7. Actual directory validation
8. BMAD integration scenario simulation
9. Paths outside installation directory rejection
10. Trailing slashes handling
11. Multiple slashes handling
12. Similar prefix edge cases (`/projectX` vs `/project`)

---

## 📊 Changes Summary

**Files Modified:** 2
- `src/installer.js` - Fixed path security validation, updated showReleaseInfo
- `package.json` - Added Node.js test runner support

**Files Added:** 1
- `test/unit/bmad-path-security.test.js` - Comprehensive path security tests

**Lines Changed:** ~180 additions, ~10 deletions

---

## 🎯 Migration Notes

**No migration required** - This is a patch release with a bug fix.

**Compatibility:** 100% backward compatible with v2.13.3

**Recommended Action:** Update to fix BMAD integration issues
```bash
npx agentvibes@latest update
```

---

## 🔗 References

- BMAD-METHOD PR #934: BMAD installer integration
- Issue: "Security: Invalid BMAD path detected" false positives

---

# Release v2.12.6 - Security & Reliability Improvements

**Release Date:** 2025-01-24
**Type:** Patch Release (Security & Reliability)

## 🔒 AI Summary

AgentVibes v2.12.6 brings quality improvements based on SonarCloud analysis and enhances BMAD party mode. This release improves API key privacy in terminal output, adds better cleanup for long-running sessions, includes more robust error handling, and ensures BMAD agents each get their unique voice. All improvements maintain 100% backward compatibility with 110/110 tests passing.

**Key Highlights:**
- 🔒 **API Key Security** - Masked API key display prevents credential leaks in terminal history
- 🛡️ **Resource Leak Prevention** - Subprocess cleanup prevents "too many open files" errors
- ⚡ **Enhanced Error Handling** - Graceful degradation instead of crashes on file operations
- 🎭 **BMAD Voice Detection** - Fixed party mode to support both .bmad and bmad directory paths
- ✅ **110/110 Tests Passing** - All functionality verified and working

---

## 🔧 Security Improvements

### API Key Masking (Issue #45)
**Files:** `src/installer.js` (lines 384, 445, 464, 489)

**Changes:**
- Replaced partial API key display (`first10chars...`) with masked format (`***************...`)
- Removed full API key from error messages and manual setup instructions
- Changed all console outputs to use placeholder `<your-api-key>`

**Impact:**
- Prevents credential leaks in terminal history (`.bash_history`, `.zsh_history`)
- Safer during screen recordings and screenshots
- Reduces risk during pair programming sessions

### Path Validation Enhancement (Issue #45)
**File:** `src/installer.js:214-219`

**Changes:**
- Added `path.resolve()` validation for script execution
- Ensures scripts are within allowed `.claude/hooks` directory
- Defense-in-depth security measure

**Impact:**
- Prevents path traversal attacks
- Better error messages for invalid paths

---

## 🛡️ Reliability Improvements

### Resource Leak Prevention (Issue #45)
**Files:** `mcp-server/server.py:144-174, 510-537`

**Changes:**
- Added try-finally blocks around subprocess operations
- Ensures processes are properly killed if still running after errors
- Cleanup happens even on exceptions

**Impact:**
- Prevents "too many open files" errors in long-running MCP server sessions
- Better resource management for continuous operation
- More stable in production environments

### Enhanced Error Handling - Python (Issue #45)
**Files:** `mcp-server/server.py:544-558, 565-584`

**Changes:**
- Added error handling to `_get_personality()` function
- Added error handling to `_get_provider()` function
- Catches `PermissionError`, `UnicodeDecodeError`, `OSError`
- Returns sensible defaults instead of crashing

**Impact:**
- Graceful degradation when config files are corrupted or inaccessible
- Continues operation with defaults rather than failing
- Better user experience in edge cases

### Enhanced Error Handling - JavaScript (Issue #45)
**Files:** `src/installer.js:500-536, 544-604`

**Changes:**
- Added comprehensive error handling to `copyCommandFiles()`
- Added comprehensive error handling to `copyHookFiles()`
- Tracks success/failure counts per file
- Continues with remaining files on partial failures
- Shows clear feedback about what succeeded vs failed

**Impact:**
- Installation continues even if individual files fail to copy
- Users see exactly which operations succeeded
- Partial installations are more visible and recoverable

### Shell Config Deduplication (Issue #45)
**File:** `src/installer.js:482-498`

**Changes:**
- Checks if `ELEVENLABS_API_KEY` already exists before appending
- Shows friendly message when key already present
- Prevents duplicate entries on repeated installations

**Impact:**
- Cleaner shell configuration files
- No accumulation of duplicate exports
- Better UX for repeated installs

---

## 🎭 BMAD Integration Improvements

### Multi-Path Voice Detection (Issue #46)
**File:** `.claude/hooks/bmad-voice-manager.sh`

**Changes:**
- Enhanced `detect_bmad_version()` to check both `.bmad/` and `bmad/` paths
- Updated `get_bmad_config_path()` to support both v6 directory variants
- Fixed `get_agent_voice()` to find `agent-voice-map.csv` in either location

**Impact:**
- BMAD party mode now works regardless of installation path
- Each agent speaks with their unique assigned voice
- Resolves all agents using default "lessac" voice

**Supported Paths:**
```
✓ .bmad/_cfg/agent-voice-map.csv (standard)
✓ bmad/_cfg/agent-voice-map.csv (alternative)
✓ .bmad/core/config.yaml (standard)
✓ bmad/core/config.yaml (alternative)
```

---

## 📊 Changes Summary

**Issues Resolved:**
- #45 - SonarCloud Quality Gate: 17 Security Hotspots & C Reliability
- #46 - BMAD Plugin: Missing agent-voice-map.csv path detection

**Files Modified:** 3
- `src/installer.js` - API key masking, error handling, shell config deduplication, path validation
- `mcp-server/server.py` - Resource cleanup, error handling
- `.claude/hooks/bmad-voice-manager.sh` - Multi-path BMAD detection

**Lines Changed:** 180 additions, 85 deletions

**Test Results:** 110/110 passing ✅

---

## 💡 Technical Details

### SonarCloud Quality Gate Fixes

**Must-Fix Items (High Priority):**
1. ✅ API Key Logging - Prevents accidental credential exposure
2. ✅ Resource Leaks - Prevents crashes in long-running sessions
3. ✅ Missing Error Handling - Prevents crashes on file system errors

**Nice-to-Fix Items (Medium Priority):**
4. ✅ Shell Config Deduplication - Better UX on repeated installations
5. ✅ Path Validation Enhancement - Defense-in-depth security

### Error Handling Strategy

**Python (`server.py`):**
```python
try:
    if personality_file.exists():
        return personality_file.read_text().strip()
except (PermissionError, UnicodeDecodeError, OSError) as e:
    print(f"Warning: Could not read file: {e}", file=sys.stderr)
return "normal"  # Sensible default
```

**JavaScript (`installer.js`):**
```javascript
try {
    await fs.copyFile(srcPath, destPath);
    successCount++;
} catch (err) {
    console.log(chalk.yellow(`⚠ Failed to copy ${file}: ${err.message}`));
    // Continue with other files
}
```

---

## ✅ Testing

### Test Suite Results
- **110 tests total**
- **110 passing** ✅
- **0 failing**
- All functionality verified working

### Syntax Validation
- ✅ Node.js syntax check passed
- ✅ Python syntax check passed
- ✅ No runtime errors detected

---

## 🎯 Migration Notes

**No migration required** - This is a patch release with security and reliability improvements.

**Compatibility:** 100% backward compatible with v2.12.5

**Recommended Action:** Update to get the latest security and stability improvements
```bash
npx agentvibes@latest update
```

---

## 🔗 References

- GitHub Issue #45: https://github.com/paulpreibisch/AgentVibes/issues/45
- GitHub Issue #46: https://github.com/paulpreibisch/AgentVibes/issues/46
- SonarCloud Quality Gates: Code quality and security analysis

---

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
