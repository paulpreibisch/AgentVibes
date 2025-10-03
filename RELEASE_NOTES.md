# Release v1.0.10

## 🤖 AI Summary

This release introduces a AI-powered release preparation system for this repo that fundamentally changes how AgentVibes releases are created. Instead of relying on GitHub Actions to automatically generate release notes from commit messages, you can now leverage Claude AI running locally to analyze code changes, understand their impact, and generate comprehensive, intelligent release notes before pushing to GitHub.

The new `/prepare-release` command allows Claude to examine the actual code diffs, categorize changes semantically, explain user impact, and create professional release documentation that goes far beyond simple commit message parsing. This ensures every release has clear, accurate, and helpful notes that users can actually understand.

## ✨ What's New

### AI-Powered Release Preparation
- **New `/prepare-release` command** - Tell Claude to analyze changes and generate release notes
- **Intelligent change analysis** - Claude reads actual code diffs, not just commit messages
- **Comprehensive summaries** - Explains what changed, why it matters, and how users are affected
- **Pre-commit generation** - Release notes are created locally before pushing to GitHub

### Enhanced GitHub Actions Workflow
- **Prioritizes AI-generated notes** - Checks for `RELEASE_NOTES.md` first
- **Smart fallback** - Falls back to automatic commit categorization if no AI notes exist
- **Flexible release process** - Works with both AI-generated and automatic notes

## 📝 How It Works

**Before this release:**
1. Push version tag
2. GitHub Actions parses commit messages
3. Generates basic categorized changelog
4. Creates release

**After this release:**
1. Say: "Prepare release patch"
2. Claude analyzes all changes since last release
3. Claude generates intelligent summary in `RELEASE_NOTES.md`
4. Claude bumps version and commits
5. You push
6. GitHub Actions uses Claude's AI summary
7. Creates release with comprehensive notes

## 🎯 User Impact

**For Release Creators:**
- Better release notes with minimal effort
- AI explains what changed in plain English
- Highlights important changes users should know
- Includes migration guidance when needed

**For End Users:**
- Clear explanations of new features
- Understand bug fixes without reading code
- Know exactly what changed and why
- Better decision-making for upgrades

## 🔧 Technical Details

**Files Changed:**
- `.claude/commands/prepare-release.md` - New command documentation
- `.claude/hooks/prepare-release.sh` - Placeholder script (Claude handles logic)
- `.github/workflows/publish.yml` - Updated to check for AI-generated notes

**Workflow Logic:**
```bash
if [ -f "RELEASE_NOTES.md" ]; then
  # Use AI-generated release notes
  CHANGELOG=$(cat RELEASE_NOTES.md)
else
  # Fall back to automatic commit categorization
  CHANGELOG=$(generate_from_commits)
fi
```

## 💡 Example Usage

```bash
# In your Claude Code session:
User: "Prepare release patch"

Claude:
1. Analyzes git log v1.0.9..HEAD
2. Reads code diffs
3. Generates this RELEASE_NOTES.md
4. Runs: npm version patch
5. Commits everything
6. Says: "Ready to push!"

User: git push origin master --follow-tags

GitHub Actions:
1. Finds RELEASE_NOTES.md
2. Uses AI summary for release
3. Publishes to npm
4. Creates GitHub release
```

## 🚀 What's Next

This release lays the foundation for even more intelligent release automation:
- Automatic migration guide generation
- Breaking change detection
- Dependency impact analysis
- Version recommendation (should this be minor or patch?)

## 📦 Installation

```bash
npx agentvibes@1.0.10 install
```

---

**Built with ❤️ by Paul Preibisch | Powered by ElevenLabs AI & Claude AI**
