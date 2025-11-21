# 🎙️ Testing Instructions for AgentVibes Party Mode PR

## Prerequisites
- Node.js and npm installed
- Git installed
- ~500MB free disk space
- 10-15 minutes for complete setup

## 🚀 Automated Testing (Easiest!)

We've made testing super simple with a single command:

### One-Line Install

```bash
npx -p agentvibes@latest test-bmad-pr
```

That's it! This command will automatically:
- Download the test script
- Clone BMAD with the PR
- Install everything you need
- Set up unique voices for each agent
- Verify the installation

### Testing a Different PR

```bash
npx -p agentvibes@latest test-bmad-pr <PR_NUMBER>
```

For example:
```bash
npx -p agentvibes@latest test-bmad-pr 935
```

### Alternative: Manual Download

If you prefer to download the script first:

```bash
# Download and run the test script
curl -sSL https://raw.githubusercontent.com/paulpreibisch/BMAD-METHOD/feature/agentvibes-tts-integration/test-bmad-pr.sh -o test-bmad-pr.sh
chmod +x test-bmad-pr.sh
./test-bmad-pr.sh
```

### What the Script Does

The script provides an **interactive menu** that lets you choose:

1. **Test official BMAD PR #934** (recommended for most users)
   - Automatically fetches the PR from the main BMAD repository
   - Perfect for testing before the PR is merged

2. **Test your forked repository**
   - Use your own fork and custom branch
   - Great for testing your own modifications

The script will:
- ✓ Clone the repository (official or your fork)
- ✓ Checkout the correct branch
- ✓ Install BMAD CLI tools
- ✓ Create a test project
- ✓ Install AgentVibes TTS
- ✓ Configure unique voices for each agent
- ✓ Verify the installation

### After Running the Script

Once setup is complete, the script will tell you exactly how to test party mode:

```bash
# Navigate to the test project
cd ~/bmad-pr-test-*/bmad-project

# Start Claude
claude

# Test party mode!
/bmad:core:workflows:party-mode
```

---

## 🛠️ Manual Testing (Advanced Users)

If you prefer to do it manually or want to understand each step:

### Step 1: Clone and Setup BMAD

```bash
# Clone the official BMAD repo
git clone https://github.com/bmad-code-org/BMAD-METHOD.git
cd BMAD-METHOD

# Fetch and checkout the PR branch
git remote add upstream https://github.com/bmad-code-org/BMAD-METHOD.git
git fetch upstream pull/934/head:agentvibes-party-mode
git checkout agentvibes-party-mode

# Install BMAD CLI
cd tools/cli
npm install
npm link
```

### Step 2: Create Test Project

```bash
# Create a test directory
cd ~
mkdir my-bmad-test
cd my-bmad-test

# Run BMAD installer
bmad install

# When prompted:
# - Enable TTS for agents? → Yes
# - Assign unique voices for party mode? → Yes
```

### Step 3: Install AgentVibes

```bash
# Install AgentVibes
npx agentvibes@latest install

# Follow the installer:
# - Choose a TTS provider (Piper recommended for testing)
# - Download voices when prompted
```

### Step 4: Test Party Mode

```bash
# Start Claude Code session
claude

# Run party mode
/bmad:core:workflows:party-mode
```

## What to Test

### ✅ Installation Flow
- [ ] BMAD installer detects AgentVibes
- [ ] Installer prompts about TTS setup
- [ ] Voice assignment file `.bmad/agent-voice-assignments.json` is created
- [ ] All agents have TTS markers injected

### ✅ Party Mode Voices
- [ ] Each agent speaks with a different voice
- [ ] Voices match agent personalities (e.g., architect sounds professional)
- [ ] No voice overlap between agents
- [ ] TTS works smoothly during multi-agent discussions

### ✅ Fallback Behavior
- [ ] If you skip TTS setup, agents still work normally (no errors)
- [ ] Party mode works without TTS (silent mode)

## Troubleshooting

**"bmad command not found"**
- Make sure you ran `npm link` in `BMAD-METHOD/tools/cli`
- Try running with full path: `node tools/cli/index.js install` from BMAD-METHOD root

**"No TTS heard during party mode"**
- Check `.claude/hooks/play-tts.sh` exists
- Verify `.bmad/agent-voice-assignments.json` was created
- Try: `/agent-vibes:whoami` to check active voice

**"All agents sound the same"**
- Check `.bmad/agent-voice-assignments.json` has unique voices per agent
- For Piper: ensure 16Speakers model downloaded (has 16 voices)
- Try: `/agent-vibes:list` to see available voices

**"Installation fails"**
- Make sure you're on the PR branch: `git branch` (should show `agentvibes-party-mode`)
- Try clean install in tools/cli: `rm -rf node_modules package-lock.json && npm install`

## Expected Output

When party mode works correctly, you'll see something like:
```
🎭 architect speaking... (Voice: matthew)
🎭 dev speaking... (Voice: ryan)
🎭 pm speaking... (Voice: amy)
```

Each agent's responses will be spoken aloud with their assigned voice!

## Report Issues

Please comment on the PR with:
- ✅ What worked
- ❌ What didn't work
- 📋 Your OS (Linux/Mac/Windows)
- 🎤 TTS provider used (Piper/ElevenLabs)

---

**PR Link:** https://github.com/bmad-code-org/BMAD-METHOD/pull/934
