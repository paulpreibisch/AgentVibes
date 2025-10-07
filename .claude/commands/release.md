---
description: Prepare and push a new release with AI-generated notes
argument-hint: [patch|minor|major]
---

# /release

Fully automates the release process with AI-generated release notes and pushes to master.

This command automatically:
1. Analyzes all changes since the last release (git log)
2. Reads actual code diffs to understand what changed
3. Generates an intelligent AI summary
4. Creates/updates RELEASE_NOTES.md with comprehensive notes
5. **Updates installer message in src/installer.js** with accurate counts:
   - Counts slash commands in .claude/commands/agent-vibes/
   - Counts personality templates in .claude/personalities/
   - Updates voice counts and feature list
6. Bumps the version using npm version
7. Commits everything together
8. Pushes to master with --follow-tags
9. Updates v1 branch

## Usage

```bash
# Patch release (bug fixes) - default
/release
/release patch

# Minor release (new features)
/release minor

# Major release (breaking changes)
/release major
```

## What Happens

- **Git Analysis**: Reviews commits since last tag
- **Code Review**: Examines actual diffs for context
- **AI Summary**: High-level overview of changes
- **Categorized Changes**: Features, fixes, docs, tests
- **Version Bump**: Updates package.json
- **Auto Push**: Pushes to master with tags
- **Branch Update**: Syncs v1 branch

## Example

```bash
/release minor
```

This will:
- Analyze changes since last release
- Generate comprehensive release notes
- Bump from 1.0.10 → 1.1.0
- Commit and push everything
- Update v1 branch to point to new release

## Implementation

This command tells Claude AI to prepare and push a new release with AI-generated notes.
