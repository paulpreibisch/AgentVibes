# 🎙️ Testing Instructions for AgentVibes Party Mode PR

## Prerequisites
- Node.js and npm installed
- Git installed
- Fresh terminal session

## Quick Test (5-10 minutes)

### Step 1: Fork and Clone BMAD
```bash
# Fork the BMAD repo on GitHub first, then:
git clone https://github.com/YOUR-USERNAME/BMAD-METHOD.git
cd BMAD-METHOD
```

### Step 2: Merge the PR Branch
```bash
# Add the upstream remote
git remote add upstream https://github.com/bmad-code-org/BMAD-METHOD.git

# Fetch and merge the PR
git fetch upstream pull/934/head:agentvibes-party-mode
git checkout agentvibes-party-mode
```

### Step 3: Install BMAD from Your Fork
```bash
# Navigate to the CLI installer directory
cd tools/cli

# Install dependencies
npm install

# Link it globally so you can run 'bmad' command
npm link

# Navigate to where you want to create your BMAD project
cd ~
mkdir my-bmad-test
cd my-bmad-test

# Run the BMAD installer (now using your forked version with the PR)
bmad install

# When prompted about AgentVibes TTS:
# - Answer "Yes" to enable TTS for agents
# - Answer "Yes" to assign unique voices for party mode
```

### Step 4: Install AgentVibes (if not already installed)
```bash
# If you don't have AgentVibes yet:
npx agentvibes@latest install

# Follow the installer:
# - Choose a TTS provider (ElevenLabs or Piper)
# - For Piper (free): it will auto-download voices including 16Speakers
# - For ElevenLabs: you'll need an API key
```

### Step 5: Test Party Mode! 🎉
```bash
# Start a Claude Code session in your BMAD project directory (my-bmad-test)
# Then run party mode:
/bmad:core:workflows:party-mode

# You should hear each BMAD agent speak with their own unique voice!
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
