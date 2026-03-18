# Updating

## Quick Update (From Claude Code)

The fastest way to update is directly from Claude Code:

```bash
/agent-vibes:update
```

This checks for the latest version and updates with confirmation.

## Alternative Methods

### If installed via npx:
```bash
npx agentvibes update --yes
```

### If installed globally via npm:
```bash
npm update -g agentvibes
agentvibes update --yes
```

### If installed from source:
```bash
cd ~/AgentVibes
git pull origin master
npm install
node bin/agent-vibes update --yes
```

## Check Your Version

```bash
/agent-vibes:version
```

## What Gets Updated

The update command will:
- ✅ Update all slash commands
- ✅ Update TTS scripts and plugins
- ✅ Add new personalities (keeps your custom ones)
- ✅ Update output styles
- ✅ Update MCP server
- ✅ Show recent changes and release notes
- ⚠️  Preserves your voice settings and configurations

---

[↑ Back to Main README](../README.md)
