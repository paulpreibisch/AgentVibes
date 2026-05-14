# 🚀 Claude Code Quick Start

Get AgentVibes up and running in 3 simple steps!

## 🍎 macOS Users - Important Prerequisite

**REQUIRED:** macOS ships with bash 3.2 (from 2007) which is incompatible with AgentVibes. Install bash 5.x first:

```bash
# One-time setup
brew install bash

# Verify installation
bash --version
# Should show: GNU bash, version 5.x
```

**Why?** AgentVibes uses modern bash features (associative arrays, advanced string manipulation) that aren't available in bash 3.2. The `#!/usr/bin/env bash` shebang in our scripts will automatically use Homebrew's bash 5.x once installed.

---

## Step 1: Install AgentVibes

Choose your preferred installation method:

### **Option A: Using npx (Recommended)** ⚡
No installation needed! Run directly:
```bash
npx agentvibes install
```

### **Option B: Install globally via npm** 📦
Install once, use anywhere:
```bash
npm install -g agentvibes
agentvibes install
```

### **Option C: From source (Development)** 🔧
Clone and run from repository:
```bash
git clone https://github.com/paulpreibisch/AgentVibes.git
cd AgentVibes
npm install
node bin/agent-vibes install
```

## Step 2: Choose Your TTS Provider

AgentVibes supports two TTS providers - pick the one that fits your needs:

### **Option A: Piper TTS (Free, Recommended for Getting Started)** 🆓

**No setup required!** Piper TTS works out of the box with zero configuration.

- ✅ Completely free, no API key needed
- ✅ Works offline (perfect for Windows, WSL, Linux)
- ✅ 50+ neural voices
- ✅ 18 languages supported
- ✅ Privacy-focused local processing

Option B: if on a Mac, you can use Mac Say
```

**Switch providers anytime:** `/agent-vibes:provider switch`

## Step 3: Start Using AgentVibes! 🎉

**That's it - no additional setup needed!**

AgentVibes works automatically through the **SessionStart hook** that injects TTS protocol instructions at the beginning of every Claude Code session.

### How It Works:
- ✅ **Automatic activation**: TTS protocol loads on every session start
- ✅ **No commands needed**: Claude automatically speaks acknowledgments and completions
- ✅ **SessionStart hook**: `.claude/settings.json` → `session-start-tts.sh`

### Quick Test:
```bash
# Try any command - Claude will speak acknowledgment and completion
/agent-vibes:list              # List all voices
/agent-vibes:switch Aria       # Switch to Aria voice
/agent-vibes:personality flirty # Set personality
```

### For Claude Desktop/Warp:
AgentVibes MCP is enabled by default once configured. No extra steps required!

---

**[← Back to Main README](../README.md)**
