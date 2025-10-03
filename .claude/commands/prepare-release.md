---
description: Prepare a new release with AI-generated summary
argument-hint: [patch|minor|major]
---

# /prepare-release

Prepares a new AgentVibes release with AI-generated release notes.

This command:
1. Analyzes all changes since the last release
2. Generates an intelligent summary using Claude AI
3. Creates/updates RELEASE_NOTES.md
4. Bumps the version
5. Commits everything
6. Ready for you to push

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

!bash .claude/hooks/prepare-release.sh $ARGUMENTS
