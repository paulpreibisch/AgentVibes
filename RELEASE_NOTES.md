# Release v1.0.12

## 🤖 AI Summary

This release enhances security and improves the npm package distribution by adding pre-release security scanning and excluding maintainer-only files from the published package. The `/release` command now includes comprehensive security checks to prevent accidental exposure of sensitive information, and the npm package is streamlined to only include user-facing functionality.

## 🔒 Security Enhancements

### Pre-Release Security Scanning
- **Automated security checks** before every release
- Scans for API keys, tokens, and secrets in changed files
- Detects hardcoded passwords and credentials
- Reviews commit messages for leaked secrets
- Validates `.gitignore` and `.npmignore` protection
- **Blocks release** if sensitive content detected

**What Gets Scanned:**
- All files modified since last release
- Commit messages and diffs
- RELEASE_NOTES.md content
- README.md updates
- Configuration files

**Common Patterns Detected:**
- API keys (OpenAI, ElevenLabs, AWS, etc.)
- Tokens (JWT, GitHub, npm)
- Passwords and credentials
- Private keys and certificates
- Database connection strings

### Improved Package Distribution
- **Excluded maintainer-only files** from npm package
- `/release` and `/prepare-release` commands removed from distribution
- `RELEASE_NOTES.md` and `RELEASE_PROCESS.md` kept in repo only
- Smaller, cleaner npm package focused on user features
- Users no longer see internal release tooling

## ✨ What's New

### Security Features
- **Pre-release security scanning** - Automatic detection of sensitive content
- **Release blocking** - Won't publish if security issues found
- **Pattern matching** - Detects common secret formats (API keys, tokens, passwords)
- **Commit message scanning** - Ensures no secrets in commit history

### Package Improvements
- **Cleaner distribution** - Maintainer tools excluded from npm
- **Reduced confusion** - Users only see commands relevant to them
- **Smaller package size** - Fewer unnecessary files
- **Better separation** - Development vs. production files

### README Updates
- **Simplified release link** - Changed to "v1.0.11 - Detailed Release Notes"
- **Removed redundant links** - Single "View All Releases" link
- **Cleaner format** - More focused on what users need

## 📝 Technical Details

**Files Changed:**
- `.npmignore` - Added maintainer-only file exclusions
- `README.md` - Updated release link format
- `.claude/commands/release.md` - Added security documentation (maintainer-only)

**Security Scan Implementation:**
```bash
# Performed before every release:
1. git diff v1.0.11..HEAD | grep sensitive patterns
2. Check commit messages for leaked secrets
3. Validate file protection (.gitignore/.npmignore)
4. Block release if issues found
```

**Excluded from npm package:**
```
.claude/commands/release.md
.claude/commands/prepare-release.md
.claude/hooks/prepare-release.sh
RELEASE_NOTES.md
RELEASE_PROCESS.md
```

## 🎯 User Impact

**For Maintainers:**
- Peace of mind with automatic security scanning
- Won't accidentally publish API keys or secrets
- Release process validates safety before pushing

**For End Users:**
- Cleaner npm package without confusing maintainer commands
- Smaller package size (faster install)
- Only see commands relevant to using AgentVibes
- No exposure to internal release tooling

## 🔧 Example Security Scan

```bash
User: /release patch

Claude:
🔒 Running security scan...
   ✓ No API keys detected
   ✓ No tokens found
   ✓ No passwords in commits
   ✓ No credentials exposed
   ✓ .gitignore properly configured
   ✓ .npmignore properly configured

✅ Security check passed!

📊 Analyzing changes since v1.0.11...
   - 2 commits found
   - 2 files changed
...
```

## 💡 Security Patterns Blocked

If sensitive content is detected, the release is blocked:

```bash
❌ SECURITY ISSUE DETECTED!

Found potential API key in:
  src/config.js:12 - ELEVENLABS_API_KEY="sk-abc123..."

🛑 Release blocked for security review.

Please:
1. Remove the sensitive content
2. Add the file to .gitignore
3. Update environment variables
4. Run /release again
```

## 📦 Installation

```bash
npx agentvibes@1.0.12 install
```

## 🔗 Links

- [View this release on GitHub](https://github.com/paulpreibisch/AgentVibes/releases/tag/v1.0.12)
- [npm package](https://www.npmjs.com/package/agentvibes/v/1.0.12)
- [Full Documentation](https://github.com/paulpreibisch/AgentVibes#readme)

---

**Built with ❤️ by Paul Preibisch | Powered by ElevenLabs AI & Claude AI**
