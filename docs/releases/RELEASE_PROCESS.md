# AgentVibes Release Process

## 📦 npm Publishing Best Practices

### Current Setup ✅

AgentVibes follows industry best practices for npm package releases:

1. **Semantic Versioning (SemVer)**
   - `MAJOR.MINOR.PATCH` format (e.g., 1.0.7)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

2. **Conventional Commits**
   - `feat:` → New features (MINOR bump)
   - `fix:` → Bug fixes (PATCH bump)
   - `docs:` → Documentation only
   - `test:` → Test updates
   - `chore:` → Maintenance tasks

3. **Automated Publishing**
   - GitHub Actions handles all releases
   - No manual `npm publish` needed
   - Publishes on git tag push

4. **Dual Release Strategy**
   - npm package (automated)
   - GitHub Release (automated with categorized notes)

## 🚀 How to Release

### Simple Release Process

```bash
# 1. Make your changes and commit using conventional commits
git add -A
git commit -m "feat: Add new voice preview feature"

# 2. Bump version and create tag (this triggers everything)
npm version patch   # For bug fixes (1.0.7 → 1.0.8)
npm version minor   # For new features (1.0.7 → 1.1.0)
npm version major   # For breaking changes (1.0.7 → 2.0.0)

# 3. Push with tags
git push origin master --follow-tags

# 4. Update v1 branch (optional but recommended)
git checkout v1 && git merge master --no-edit && git push origin v1 && git checkout master
```

**That's it!** GitHub Actions automatically:
- ✅ Publishes to npm
- ✅ Creates GitHub Release
- ✅ Generates categorized changelog
- ✅ Tags the release

## 📋 What Happens Automatically

### When you push a version tag (e.g., v1.0.8):

1. **npm Publishing** (`.github/workflows/publish.yml`)
   - Runs on Ubuntu latest
   - Uses Node.js 20
   - Runs `npm ci` for clean install
   - Publishes to npm registry
   - Uses `NPM_TOKEN` secret for authentication

2. **GitHub Release Creation**
   - Extracts version from tag
   - Categorizes commits by type:
     - ✨ New Features (feat:)
     - 🐛 Bug Fixes (fix:)
     - 📚 Documentation (docs:)
     - 🧪 Testing (test:)
     - 🔧 Maintenance (chore:)
   - Generates formatted release notes
   - Includes installation instructions
   - Adds links to npm, docs, and issues
   - Uses GitHub's auto-generated notes too

3. **Testing** (`.github/workflows/test.yml`)
   - Runs all BATS tests
   - Validates no regressions
   - Shows status in PR/commit

## 🏷️ Release Notes Format

Example output:
```markdown
## AgentVibes v1.0.8

> Professional text-to-speech narration for Claude Code sessions

### 📦 Installation
\`\`\`bash
npx agentvibes@1.0.8 install
\`\`\`

### 📝 What's Changed

### ✨ New Features
- Add voice preview feature (abc123)
- Support custom personalities (def456)

### 🐛 Bug Fixes
- Fix audio save directory detection (ghi789)
- Resolve double-audio bug in personality switching (jkl012)

### 📚 Documentation
- Update README with new commands (mno345)

### 🔗 Links
- 📦 [npm package](https://www.npmjs.com/package/agentvibes/v/1.0.8)
- 📚 [Full Documentation](https://github.com/paulpreibisch/AgentVibes#readme)
- 🐛 [Report Issues](https://github.com/paulpreibisch/AgentVibes/issues)

---

**Built with ❤️ by Paul Preibisch | Powered by ElevenLabs AI**
```

## 🔐 Secrets Configuration

Required GitHub secrets:
- `NPM_TOKEN` - Automation token from npmjs.com
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions

## 📊 Release Checklist

Before releasing:
- [ ] All tests passing locally (`npm test`)
- [ ] Conventional commit messages used
- [ ] CHANGELOG reflects changes (auto-generated)
- [ ] Version bump appropriate for changes
- [ ] Both master and v1 branches updated

After releasing:
- [ ] Check npm package published: https://www.npmjs.com/package/agentvibes
- [ ] Verify GitHub Release created
- [ ] Test installation: `npx agentvibes@VERSION install`
- [ ] Check badges on README (should be green)

## 🎯 Best Practices We Follow

✅ **Automated Everything**
- No manual npm publish
- No manual release notes
- No manual changelog

✅ **Semantic Versioning**
- Clear version meaning
- Predictable upgrades

✅ **Conventional Commits**
- Auto-categorized changes
- Better git history

✅ **Comprehensive Testing**
- 29+ tests with mocks
- No API token usage
- CI/CD integration

✅ **Clear Documentation**
- Installation in release notes
- Links to resources
- Version-specific npx commands

## 🚨 Common Issues

**Release didn't trigger:**
- Ensure tag format is `v*.*.*` (e.g., v1.0.8)
- Check GitHub Actions tab for errors
- Verify NPM_TOKEN is valid

**Tests failing:**
- Run `npm test` locally first
- Check test output in Actions tab
- Fix issues before releasing

**npm already has this version:**
- Can't republish same version
- Bump version again
- Delete tag if needed: `git tag -d v1.0.8 && git push origin :refs/tags/v1.0.8`

## 📈 Version History

Current release: **v1.0.7**

Recent changes (unreleased):
- test: Add tests for replay command directory detection and output
- fix: Replay command now uses project-local audio directory
- feat: Show full file path in replay command output
- docs: Add GitHub Actions status badges for tests and publishing

Next release will be: **v1.0.8** (PATCH - bug fixes and tests)

## 🔮 Future Improvements

- [ ] Automated security scanning
- [ ] Performance benchmarks
- [ ] Pre-release/beta channel support
- [ ] Automatic dependency updates (Dependabot)
- [ ] Release candidate workflow
