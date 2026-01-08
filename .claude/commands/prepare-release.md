---
description: Prepare a new release with AI-generated summary
argument-hint: [patch|minor|major]
---

# /prepare-release

Prepares a new AgentVibes release with AI-generated release notes.

This command:
1. **Runs full test suite** - MUST pass before proceeding ✅
2. **Validates Sonar quality gates** - MUST pass before proceeding ✅
3. Analyzes all changes since the last release
4. Generates an intelligent summary using Claude AI
5. Creates/updates RELEASE_NOTES.md
6. Bumps the version
7. Commits everything
8. Ready for you to push

## Usage

```bash
# Patch release (bug fixes)
/prepare-release patch

# Minor release (new features)
/prepare-release minor

# Major release (breaking changes)
/prepare-release major
```

## What Gets Generated

- **AI Summary**: High-level overview of changes
- **Categorized Changes**: Features, fixes, docs, tests
- **User Impact**: What users should know
- **Migration Notes**: If breaking changes exist

## Example Output

```markdown
# Release v1.0.10

## AI Summary
This release focuses on improving test reliability and fixing directory
detection issues. The test suite now properly handles bash warnings and
all 27 tests pass consistently across different environments.

## Changes
### 🐛 Bug Fixes
- Fixed test path resolution for BATS tests
- Updated test assertions to handle bash warnings

### 🧪 Testing
- Added comprehensive test coverage for replay command
- All tests now passing in CI/CD

## User Impact
- More reliable installation and testing
- Better error messages
- No breaking changes
```

## Implementation

When executing this command, Claude MUST follow these steps in order:

1. **Run Test Suite** (MANDATORY FIRST STEP):
   - Execute `npm test` (which runs syntax validation, BATS tests, and coverage tests)
   - If ANY tests fail, STOP immediately and report the failures
   - Do NOT proceed with any release operations if tests fail
   - Example output: "🧪 Running tests... ✅ All 213 BATS tests passed, ✅ All 38 Node tests passed"

2. **Validate Sonar Quality Gates** (MANDATORY SECOND STEP):
   - Check all bash scripts for `set -euo pipefail` (strict mode)
   - Verify no hardcoded credentials in code
   - Validate proper variable quoting in bash scripts
   - Check for input validation and error handling
   - Review any new or modified files for security issues
   - If ANY quality gate fails, STOP immediately and report the issues
   - Example output: "🛡️ Validating quality gates... ✅ All Sonar requirements met"
   - **Note**: Document any known minor issues (like missing strict mode in legacy scripts) if they existed before this release

3. **Analyze Changes**: Git log since last tag, examine diffs
4. **Generate RELEASE_NOTES.md**: AI-generated summary with categorized changes
5. **Bump package.json**: Use npm version (patch/minor/major)
6. **Commit changes**: RELEASE_NOTES.md and package.json
7. **Ready for push**: User must manually push to master

### Critical Points

- **ALWAYS run tests first** - Never proceed if tests fail
- **ALWAYS validate Sonar quality gates** - Never proceed if quality checks fail
- **Extract content from RELEASE_NOTES.md** - Don't make up new content
- **Document any security exceptions** - If known issues exist from before this release, document them

!bash .claude/hooks/prepare-release.sh $ARGUMENTS
