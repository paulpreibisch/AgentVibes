# BMAD Voice Map Integration Tests

## Purpose

These test suites validate that AgentVibes can correctly consume voice mappings from BMAD's generated CSV files (introduced in [PR #987](https://github.com/paulpreibisch/BMAD-METHOD/pull/987)).

**Related GitHub Issues:**
- [Issue #67](https://github.com/paulpreibisch/AgentVibes/issues/67) - Voice Map CSV Parsing Edge Cases

## Test Files

### `bmad-voice-map.bats` (10 tests)
Core functionality tests for the BMAD voice map integration:
- CSV file detection in `.bmad/_cfg/` and `bmad/_cfg/` directories
- Voice extraction for different BMAD agents
- CSV priority over legacy markdown config
- Alternative BMAD path support
- Integration with bmad-speak.sh

### `bmad-voice-map-edge-cases.bats` (24 tests)
Comprehensive edge case and security testing:

#### CSV Parsing Edge Cases (13 tests)
- RFC 4180 compliant quote escaping (`""` not `\"`)
- Escaped newline characters
- Empty voice fields (fallback behavior)
- Empty intro fields
- Invalid/non-existent voice names
- Missing CSV files
- Corrupted CSV with binary data
- Permission-denied scenarios
- CSV with only headers
- Extra columns (forward compatibility)
- Windows CRLF line endings
- Whitespace padding in fields
- Unicode/emoji characters
- Very long intro text (>500 chars)
- Duplicate agent entries

#### Security Tests (5 tests)
- Shell special characters (`$`, backticks, command substitution)
- Semicolons (command injection prevention)
- Pipe characters (command chaining prevention)
- Single quotes (SQL injection-style attacks)
- Validates no shell expansion occurs

#### Contract Tests (2 tests)
- CSV format compatibility with BMAD's manifest-generator.js
- Three-column format (agent,voice,intro)
- Alternative BMAD path support (`bmad/` without dot prefix)

## Running Tests

### Run all BMAD voice map tests:
```bash
npm test -- test/unit/bmad-voice-map*.bats
```

### Run only edge cases:
```bash
npm test -- test/unit/bmad-voice-map-edge-cases.bats
```

### Run only core functionality:
```bash
npm test -- test/unit/bmad-voice-map.bats
```

## Test Architecture

### Shared Helpers
Tests use shared assertion helpers from `test/helpers/bmad-assertions.bash`:
- `assert_output_contains "substring"` - Check output contains text
- `assert_output_equals_clean "expected"` - Compare after removing warnings/whitespace
- `assert_output_empty_clean` - Verify empty output (ignoring warnings)

### Fallback Behavior
The `bmad-voice-manager.sh` script has hardcoded fallback voices for all BMAD agents. When CSV is:
- Missing
- Corrupted
- Has empty voice fields
- Contains only headers

The voice manager returns the hardcoded default for that agent instead of empty string. For example:
- `pm` → `en_US-ryan-high`
- `dev` → `en_US-joe-medium`
- `architect` → `en_GB-alan-medium`

This is by design to ensure TTS never fails silently.

## Covered Scenarios

### Happy Path ✅
- CSV file exists with valid agent,voice,intro format
- Voice names are extracted correctly
- Multiple agents can be queried
- CSV takes priority over legacy markdown config

### Edge Cases ✅
- Malformed CSV (empty fields, wrong format)
- File I/O issues (missing file, permission denied)
- Compatibility (Windows CRLF, Unicode, whitespace)
- CSV spec compliance (RFC 4180 quote escaping)

### Security ✅
- Shell injection prevention
- Command injection prevention
- No shell expansion of special characters

### Integration ✅
- BMAD manifest-generator.js → agent-voice-map.csv → AgentVibes
- bmad-speak.sh uses voice from CSV
- Alternative BMAD installation paths supported

## Debugging Test Failures

### Test 6, 9, 12: "Expected empty but got voice"
**Cause:** Test expects empty output but voice manager returns fallback voice
**Fix:** Update test to expect the hardcoded fallback (e.g., `en_US-ryan-high` for pm)
**Why:** This is correct behavior - fallback ensures TTS never fails

### Test 18: "Duplicate entries"
**Cause:** grep returns multiple lines when agent appears twice in CSV
**Fix:** Test should verify both voices are in output (grep's multi-line behavior)
**Why:** CSV deduplication is not bmad-voice-manager's responsibility

### Test 11: "Permission denied"
**Cause:** chmod 000 might fail on some filesystems or in CI environments
**Fix:** Test accepts either status 0 (fallback) or status 1 (error)
**Why:** Permission handling varies by environment

### General locale warnings
**Not an error:** Warnings like `warning: setlocale: LC_ALL: cannot change locale (en_US.UTF-8)` are filtered out by `assert_output_*_clean` helpers

## Future Enhancements

### Intro Text Reading (Currently Skipped)
Test 27 and 31 in `bmad-voice-map.bats` are skipped because intro text reading from CSV is not yet implemented in `bmad-voice-manager.sh`. When this feature is added:
1. Unskip tests 27 and 31
2. Add tests for intro text edge cases (commas, quotes, emoji)
3. Add contract test for intro text round-trip

### Performance Tests
For large BMAD projects with 100+ agents:
- CSV parsing performance
- Memory usage with large intro text fields

### Error Message Validation
Current tests check exit codes but not error messages. Future tests should validate:
- Specific error messages for corrupted CSV
- Helpful troubleshooting hints
- Clear indication of which line/field failed

## Test Maintenance

### When BMAD Changes CSV Format
1. Update contract tests (test #23-24)
2. Update setup() fixtures to match new format
3. Document breaking changes in this README

### When Adding New BMAD Agents
1. Add agent to hardcoded fallback list in bmad-voice-manager.sh
2. Add test case to verify new agent's voice extraction
3. Update contract test #23 with new agent example

### When Modifying Helpers
Shared helpers are in `test/helpers/bmad-assertions.bash`. Changes affect both test files, so:
1. Test changes against both bmad-voice-map.bats and bmad-voice-map-edge-cases.bats
2. Update this README if helper behavior changes
3. Maintain backward compatibility where possible
