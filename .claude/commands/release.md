---
description: Prepare and push a new release with AI-generated notes (human-in-the-loop)
argument-hint: [patch|minor|major]
---

# /release

Semi-automated release process with AI-generated release notes and human approval checkpoints.

This command:
1. **Runs full test suite** - MUST pass before proceeding ✅
2. Analyzes all changes since the last release (git log + diffs)
3. Reads actual code changes to understand context
4. **Generates AI summary and release notes**
5. **PAUSES for human review of RELEASE_NOTES.md** ⏸️
6. **PAUSES for human review of AI summary** ⏸️
7. Updates installer.js and update scripts with AI summary
8. **Updates README.md with new version and release info** ⚠️
9. Bumps the version using npm version
10. Commits everything together (including updated README)
11. Pushes to master with --follow-tags
12. Creates GitHub release
13. **Publishes to npm** (packages README at this moment!)

**⚠️ CRITICAL ORDER**: README must be updated (step 8) BEFORE npm publish (step 13) because npm packages whatever README exists at publish time. This ensures the npm package page displays current release info.

**🧪 TEST REQUIREMENT**: The test suite MUST pass before any release operations begin. If tests fail, the release is aborted immediately. This prevents publishing broken code to npm.

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

## Human-in-the-Loop Checkpoints

### Checkpoint 1: Review RELEASE_NOTES.md
After AI generates release notes, **you will be asked to review**:
- AI-generated summary
- Categorized changes (features, fixes, docs, tests)
- User impact notes
- Breaking changes (if any)

**You can**:
- ✅ Approve as-is
- ✏️ Edit before proceeding
- ❌ Cancel release

### Checkpoint 2: Review AI Summary
The AI summary will be shown to you for approval before being added to:
- `src/installer.js` (shown during `npx agentvibes install`)
- Update scripts (shown during `npx agentvibes update`)

**You can**:
- ✅ Approve summary
- ✏️ Request changes
- ❌ Cancel release

## What Gets Updated

### RELEASE_NOTES.md
Complete release history with:
- AI-generated summary
- Categorized changes
- User impact
- Migration notes (if breaking changes)

### src/installer.js
**CRITICAL**: Update the `showReleaseInfo()` function (around line 126) with:
- New version number in the title
- New "WHAT'S NEW" summary (2-4 sentences about the release)
- New "KEY HIGHLIGHTS" bullet points (3-5 items with emojis)

Example structure:
```javascript
function showReleaseInfo() {
  console.log(
    boxen(
      chalk.white.bold('═══...═══\n') +
      chalk.cyan.bold('  📦 AgentVibes v2.7.0 - Release Title Here\n') +
      chalk.white.bold('═══...═══\n\n') +
      chalk.green.bold('🎙️ WHAT\'S NEW:\n\n') +
      chalk.cyan('AgentVibes v2.7.0 summary here...\n\n') +
      chalk.green.bold('✨ KEY HIGHLIGHTS:\n\n') +
      chalk.gray('   🎭 Feature 1 - Description\n') +
      chalk.gray('   ⏸️ Feature 2 - Description\n') +
      // ... more highlights
```

This appears during `npx agentvibes install` and `npx agentvibes update`.

### README.md
Updated with new version and release information:
- Version badge updated (e.g., `v2.3.0`)
- Latest Release section updated with new title and link
- AI summary updated with key highlights from the release

### Update Scripts
Updated to show during `npx agentvibes update`:
- Latest version number
- AI summary of what's new
- Recent commit messages
- Link to full release notes

### package.json
- Version bumped (patch/minor/major)

### Git
- New version tag created (e.g., `v2.0.18`)
- All changes committed together
- Pushed to **master** branch with tags

### NPM Registry
- New version published
- Available via `npx agentvibes@latest`
- Beta tag updated for beta releases

## Example Flow

```bash
/release minor
```

**Step 1: Run Tests**
```
🧪 Running test suite...
✅ All 132 tests passed (bats + node)
```

**Step 2: Analysis**
```
🔍 Analyzing changes since v2.0.17...
📊 Found 47 commits across 12 files
🤖 Generating AI summary...
```

**Step 3: Review RELEASE_NOTES.md**
```
✅ Generated RELEASE_NOTES.md

Preview:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Release v2.1.0

## AI Summary
This release adds comprehensive test coverage and
AI-optimized documentation standards...

## Changes
### ✨ New Features
- Added speed control with tongue twister demos
- Provider-aware voice management

### 🐛 Bug Fixes
- Fixed project-local config precedence
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 Please review RELEASE_NOTES.md
   Options:
   - Type 'approve' to continue
   - Type 'edit' to make changes
   - Type 'cancel' to abort
```

**Step 4: Review AI Summary**
```
📝 AI Summary for installer/update scripts:

"This release adds comprehensive test coverage with
110 passing tests, introduces AI-optimized
documentation standards, and includes speed control
with intuitive 0.5x-3.0x scaling."

👉 Approve this summary?
   Options:
   - Type 'approve' to continue
   - Type 'revise' to regenerate
   - Type 'cancel' to abort
```

**Step 5: Update & Publish**
```
✅ Updating installer.js with release info...
✅ Updating README.md with new version...
✅ Bumping version: 2.0.17 → 2.1.0
✅ Creating commit: "Release v2.1.0"
✅ Creating tag: v2.1.0
✅ Pushing to master with tags...
✅ Creating GitHub release...
✅ Publishing to npm...

🎉 Release v2.1.0 complete!

📦 NPM: https://www.npmjs.com/package/agentvibes
🐙 GitHub: https://github.com/paulpreibisch/AgentVibes/releases/tag/v2.1.0
```

## What Happens

1. **Test Suite**: Runs `npm test` - MUST pass or release is aborted 🧪
2. **Git Analysis**: Reviews all commits since last tag
3. **Code Review**: Examines actual diffs for context
4. **AI Generation**: Creates intelligent summary and categorized changes
5. **Human Review**: You review and approve/edit release notes
6. **Summary Review**: You approve AI summary for installer/update
7. **Installer Update**: Adds release info to installation flow
8. **README Update**: Updates version badge and latest release section ⚠️ **CRITICAL: Must happen BEFORE npm publish!**
9. **Update Script Update**: Adds release info to update flow
10. **Version Bump**: Updates package.json (npm version)
11. **Commit**: Single atomic commit with all changes (includes README with correct version)
12. **Push**: Pushes to **master** branch with tags
13. **GitHub Release**: Creates public release with notes
14. **NPM Publish**: Makes new version available globally (packages README at this point)

**⚠️ ORDER IS CRITICAL**: README must be updated BEFORE running `npm publish` because npm packages the README from the current working directory. If you publish first, the npm package page will show outdated README content.

## Safety Features

- **Test suite must pass** before proceeding - prevents broken releases
- **Human approval required** before any git operations
- **Dry-run preview** of all changes
- **Rollback support** via git tags
- **Git status check**: Won't run with uncommitted changes
- **Branch verification**: Ensures on master branch

## Files Modified

- `RELEASE_NOTES.md` - New release entry
- `README.md` - Version badge and latest release section
- `package.json` - Version bump
- `package-lock.json` - Version bump
- `src/installer.js` - Release info display
- Git tag created (e.g., `v2.1.0`)

## Implementation

This command tells Claude AI to prepare and push a new release with AI-generated notes and human approval checkpoints.

### Step-by-Step Implementation Guide

When executing this command, Claude MUST follow these steps in order:

1. **Run Test Suite** (MANDATORY FIRST STEP):
   - Execute `AGENTVIBES_TEST_MODE=true npm test`
   - If ANY tests fail, STOP immediately and report the failures
   - Do NOT proceed with any release operations if tests fail
   - Example output: "🧪 Running tests... ✅ All 132 tests passed"
2. **Analyze Changes**: Git log since last tag, examine diffs
3. **Generate RELEASE_NOTES.md**: AI-generated summary with categorized changes
4. **Human Review Checkpoint 1**: Wait for approval of RELEASE_NOTES.md
5. **Update src/installer.js**:
   - Find the `showReleaseInfo()` function (line ~126)
   - Replace the version number in title (e.g., `v2.6.0` → `v2.7.0`)
   - Replace the release title (e.g., `BMAD Integration` → `Party Mode Voice Improvements`)
   - Replace the "WHAT'S NEW" summary (2-4 sentences from RELEASE_NOTES.md AI Summary)
   - Replace all "KEY HIGHLIGHTS" bullets (extract from RELEASE_NOTES.md)
   - Keep the same format/structure, just update content
6. **Update README.md**:
   - Update version badge in header (line ~14)
   - Update "Latest Release" section (line ~95+) with new title and summary
   - Update key highlights list
7. **Human Review Checkpoint 2**: Show what will be updated, wait for approval
8. **Bump package.json**: Use npm version (patch/minor/major)
9. **Commit all changes**: Single commit with RELEASE_NOTES.md, installer.js, README.md, package.json
10. **Push to master with tags**
11. **Create GitHub release**
12. **Publish to npm**: This packages the already-updated README.md

### Critical Points

- **ALWAYS run tests first** - Never proceed with release if tests fail
- **NEVER skip updating installer.js** - This is what users see during install
- **Update installer BEFORE npm publish** - npm packages whatever installer.js exists at publish time
- **Extract content from RELEASE_NOTES.md** - Don't make up new content, use what's in the release notes
- **Keep the installer format consistent** - Same boxen structure, just update text content
