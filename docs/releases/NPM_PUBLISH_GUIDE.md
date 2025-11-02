# 📦 Publishing AgentVibes to npm

## Prerequisites

1. **npm Account**
   - Sign up at [npmjs.com](https://www.npmjs.com/signup)
   - Verify your email

2. **Two-Factor Authentication**
   - Enable 2FA on your npm account (required for publishing)
   - Go to [npmjs.com/settings/profile](https://www.npmjs.com/settings/profile)

## Step 1: Login to npm

```bash
cd ~/claude/AgentVibes
npm login
```

Enter your:
- Username
- Password
- Email
- One-time password (if 2FA is enabled)

Verify login:
```bash
npm whoami
```

## Step 2: Check Package Configuration

The package is already configured in `package.json`:
```json
{
  "name": "agentvibes",
  "version": "1.0.0",
  "bin": {
    "agentvibes": "./bin/agent-vibes",
    "agent-vibes": "./bin/agent-vibes"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## Step 3: Test the Package Locally

```bash
# Test installation from local files
npm pack
npm install -g agentvibes-1.0.0.tgz

# Test the CLI
agent-vibes --version
```

## Step 4: Publish to npm

```bash
# Dry run (see what will be published)
npm publish --dry-run

# Publish for real
npm publish
```

## Step 5: Verify Publication

```bash
# Check on npm
npm view agentvibes

# Test with npx (no installation needed!)
npx agentvibes install
```

## Step 6: Update README

After publishing, update the installation instructions:

```bash
# Users can now install with
npx agentvibes install

# Or install globally
npm install -g agentvibes
agentvibes install
```

## Updating to New Versions

1. Make your changes
2. Update version in `package.json`:
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   npm version minor  # 1.0.0 -> 1.1.0
   npm version major  # 1.0.0 -> 2.0.0
   ```
3. Publish:
   ```bash
   npm publish
   ```
4. Push git tags:
   ```bash
   git push --follow-tags
   ```

## Troubleshooting

### "You must sign in to publish packages"
```bash
npm logout
npm login
```

### "Package name already exists"
- Choose a different name in `package.json`
- Or publish under your username: `@yourusername/agentvibes`

### "Need to enable 2FA"
- Go to npmjs.com/settings/profile
- Enable 2FA
- Try publishing again

## Files Included in Package

The `.gitignore` and `package.json` control what gets published:
- ✅ `/bin` - CLI scripts
- ✅ `/src` - Source code
- ✅ `/.claude` - Commands, hooks, personalities
- ✅ `/templates` - Output styles
- ❌ `/node_modules` - Excluded
- ❌ `/demo-audio` - Excluded (too large)
- ❌ `/.git` - Excluded

## After Publishing

Users can now install AgentVibes with:
```bash
npx agentvibes install
```

No need to clone the repo! 🎉
