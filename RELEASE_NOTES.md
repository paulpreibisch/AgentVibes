# Release v2.13.9 - Provider-Aware Voice Migration

**Release Date:** 2025-11-27
**Type:** Patch Release (Bug Fix & Enhancement)

## 🔧 AI Summary

AgentVibes v2.13.9 fixes a critical issue where BMAD voice mappings were not provider-aware, causing "Voice model not found" errors when switching between ElevenLabs and Piper TTS providers. The release introduces intelligent voice migration that automatically maps voices when switching providers (e.g., "Amy" → "en_US-amy-medium"), ensuring seamless provider switching without manual reconfiguration.

**Key Highlights:**
- 🔄 **Smart Voice Migration** - Automatic voice mapping when switching TTS providers
- 📝 **Provider-Aware Docs** - BMAD documentation now shows both ElevenLabs and Piper columns
- 🎤 **Valid Piper Names** - Fixed incomplete Piper voice names (kristin → en_US-kristin-medium)
- 🛡️ **Preserve Voice Names** - Internal spaces in voice names no longer stripped
- ✅ **122 Tests Passing** - All functionality verified (110 bats + 12 node tests)

---

## 🔧 Bug Fixes

### Provider-Aware Voice Mappings (Issue #49)
**Files:** `.claude/commands/agent-vibes/bmad.md`, `.agentvibes/bmad/bmad-voices.md`

**Problem:**
When users switched from ElevenLabs to Piper TTS provider, the voice file retained ElevenLabs voice names (like "Amy") which don't exist in Piper. This caused errors:
```
📥 Voice model not found: Amy
❌ Voice download cancelled
```

**Solution:**
1. Updated `bmad.md` documentation to show both ElevenLabs and Piper columns
2. Fixed invalid Piper voice names in configuration files
3. Added `migrate_voice_to_provider()` function for automatic voice mapping

**Impact:**
- Seamless provider switching without manual voice reconfiguration
- BMAD agents work correctly regardless of TTS provider

### Invalid Piper Voice Names
**Files:** `.agentvibes/bmad/bmad-voices.md`

**Fixed:**
- `kristin` → `en_US-kristin-medium`
- `jenny` → `en_US-lessac-medium`

All Piper voice names now follow the correct format: `lang_REGION-name-quality`

### Voice Name Space Preservation
**File:** `.claude/hooks/provider-manager.sh`

**Problem:**
Voice names with spaces (like "Jessica Anne Bogart") were being corrupted to "JessicaAnneBogart" due to overly aggressive whitespace stripping.

**Solution:**
Changed from `tr -d '[:space:]'` to strip only leading/trailing whitespace while preserving internal spaces.

---

## ✨ New Features

### Automatic Voice Migration
**File:** `.claude/hooks/provider-manager.sh` (new function: `migrate_voice_to_provider`)

When switching TTS providers, voices are automatically mapped to equivalents:

| ElevenLabs | Piper |
|------------|-------|
| Amy | en_US-amy-medium |
| Aria | en_US-amy-medium |
| Matthew Schmitz | en_US-ryan-high |
| Michael | en_GB-alan-medium |
| Jessica Anne Bogart | en_US-kristin-medium |
| Ms. Walker | en_US-lessac-medium |
| Cowboy Bob | en_US-joe-medium |
| Ralf Eisend | en_US-arctic-medium |
| Northern Terry | en_GB-alan-medium |
| Lutz Laugh | en_US-joe-medium |
| Dr. Von Fusion | en_US-danny-low |
| Demon Monster | en_US-danny-low |
| Drill Sergeant | en_US-ryan-high |
| Grandpa Spuds Oxley | en_US-joe-medium |

**Usage:**
```bash
# Switch to Piper - voice automatically migrated
/agent-vibes:provider switch piper
# Output: ✓ Active provider set to: piper
#         🔄 Voice migrated: Amy → en_US-amy-medium
```

### Provider-Aware Documentation
**File:** `.claude/commands/agent-vibes/bmad.md`

The "Available BMAD Agents" table now shows voices for both providers:

| Agent ID | Role | ElevenLabs Voice | Piper Voice |
|----------|------|------------------|-------------|
| pm | Product Manager | Matthew Schmitz | en_US-ryan-high |
| dev | Developer | Aria | en_US-amy-medium |
| analyst | Business Analyst | Jessica Anne Bogart | en_US-kristin-medium |
| architect | Architect | Michael | en_GB-alan-medium |
| sm | Scrum Master | Matthew Schmitz | en_US-joe-medium |
| tea | Test Architect | Michael | en_US-arctic-medium |
| tech-writer | Technical Writer | Aria | en_US-lessac-medium |
| ux-designer | UX Designer | Jessica Anne Bogart | en_US-lessac-medium |
| frame-expert | Visual Designer | Matthew Schmitz | en_GB-alan-medium |
| bmad-master | BMAD Master | Michael | en_US-danny-low |

---

## 📊 Changes Summary

**Files Modified:** 4
- `.claude/commands/agent-vibes/bmad.md` - Provider-aware documentation table
- `.claude/hooks/provider-manager.sh` - Voice migration feature (+95 lines)
- `.agentvibes/bmad/bmad-voices.md` - Fixed Piper voice names
- `test/unit/provider-manager.bats` - Updated tests for new behavior

**Lines Changed:** 143 additions, 48 deletions

**Test Results:** 122/122 passing ✅ (110 bats + 12 node)

---

## 🎯 Migration Notes

**No migration required** - This is a patch release with bug fixes and enhancements.

**Compatibility:** 100% backward compatible with v2.13.8

**Recommended Action:** Update to fix voice mapping issues
```bash
npx agentvibes@latest update
```

---

## 🔗 References

- GitHub Issue #49: https://github.com/paulpreibisch/AgentVibes/issues/49
- BMAD voice mappings not provider-aware in documentation

---

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
