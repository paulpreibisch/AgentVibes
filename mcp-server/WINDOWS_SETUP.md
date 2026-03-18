# 🪟 Windows Setup Guide for Claude Desktop

**Complete beginner's guide** - Start from scratch and get AgentVibes working in 20 minutes!

---

## What You'll Need

This guide assumes you're starting with **just Windows** installed. We'll install everything else together, step by step.

---

## Step 1: Install Python

Python is needed to run AgentVibes.

1. **Download Python**:
   - Go to https://python.org/downloads
   - Click the big yellow "Download Python" button

2. **Install Python**:
   - Run the downloaded installer
   - ⚠️ **CRITICAL**: Check the box "Add Python to PATH" at the bottom
   - Click "Install Now"
   - Wait for installation to complete
   - Click "Close"

3. **Verify it worked**:
   - Press `Windows Key + R`
   - Type `cmd` and press Enter
   - In the black window, type: `python --version`
   - You should see something like `Python 3.12.0`

---

## Step 2: Install Node.js

Node.js is needed to download and run AgentVibes.

1. **Download Node.js**:
   - Go to https://nodejs.org
   - Click the big green "LTS" button (recommended for most users)

2. **Install Node.js**:
   - Run the downloaded installer
   - Click "Next" through all the steps (defaults are fine)
   - Click "Install"
   - Click "Finish"

3. **Verify it worked**:
   - Press `Windows Key + R`
   - Type `cmd` and press Enter
   - Type: `node --version`
   - You should see something like `v20.11.0`

---

## Step 3: Install WSL (Windows Subsystem for Linux)

WSL is needed for the free Piper voice system.

1. **Open PowerShell as Administrator**:
   - Press `Windows Key`
   - Type `PowerShell`
   - Right-click "Windows PowerShell"
   - Click "Run as administrator"
   - Click "Yes" when asked

2. **Install WSL**:
   - Type this command and press Enter:
     ```powershell
     wsl --install
     ```
   - Wait for it to download and install (5-10 minutes)

3. **Restart your computer**:
   - After installation completes, restart Windows
   - WSL will finish setup after restart

4. **Verify it worked**:
   - Open PowerShell again (doesn't need to be as administrator this time)
   - Type: `wsl --status`
   - You should see status information (not an error)

---

## Step 4: Install Claude Desktop

Claude Desktop is the app where you'll talk to Claude with voice.

1. **Download Claude Desktop**:
   - Go to https://claude.ai/download
   - Click "Download for Windows"

2. **Install Claude Desktop**:
   - Run the downloaded installer
   - Follow the installation steps
   - Sign in with your Anthropic account (or create one)

3. **Close Claude Desktop for now** (we'll configure it in the next step)

---

## Step 5: Configure AgentVibes in Claude Desktop

Now we'll tell Claude Desktop to use AgentVibes.

1. **Open the config file**:
   - Press `Windows Key + R`
   - Copy and paste this path:
     ```
     %APPDATA%\Claude\claude_desktop_config.json
     ```
   - Press Enter
   - If asked "How do you want to open this file?", choose "Notepad"

2. **Add AgentVibes configuration**:
   - If the file is empty or just has `{}`, replace everything with this:
     ```json
     {
       "mcpServers": {
         "agentvibes": {
           "command": "npx",
           "args": ["-y", "agentvibes@beta", "agentvibes-mcp-server"]
         }
       }
     }
     ```
   - If the file already has content, carefully add the `"agentvibes"` section inside `"mcpServers"`

3. **Save the file**:
   - Click "File" → "Save"
   - Close Notepad

---

## Step 6: Install Piper Voice System

Piper needs to be installed inside WSL for the free voices to work.

1. **Open PowerShell**

2. **Run the automated installer**:
   - Copy and paste this single command and press Enter:
     ```powershell
     wsl -e bash -c "curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/.claude/hooks/piper-installer.sh | bash"
     ```
   - The installer will:
     - Install pipx (if needed)
     - Install Piper TTS
     - Download a default voice (en_US-lessac-medium)
   - Wait for installation (2-3 minutes)

3. **When prompted** "Would you like to download voice models now?":
   - Type `y` and press Enter
   - This downloads the free voice model

4. **Installation complete!**
   - You should see "🎉 Piper TTS Setup Complete!"

---

## Step 7: Start Using AgentVibes!

1. **Open Claude Desktop**

2. **Wait for setup** (first time only):
   - The first time, AgentVibes MCP server needs to start (10-20 seconds)
   - You'll see a small notification when it's ready

3. **Test it**:
   - Type: `What AgentVibes tools do you have?`
   - Claude should list tools like `text_to_speech`, `list_voices`, etc.

4. **Hear your first voice**:
   - Type: `Use text to speech to say "Hello, I'm using AgentVibes!"`
   - You should hear audio! 🎉

---

## Common Tasks

### Change Voice

Type: `List all available voices`

Then: `Switch to [voice name]`

Example: `Switch to Northern Terry voice`

### Add Personality

Type: `Set personality to pirate`

Now Claude will talk like a pirate! Try: `Use text to speech to say "Hello there!"`

Other personalities: `sarcastic`, `flirty`, `robot`, `zen`, `millennial`

### Speak Different Language

Type: `Speak in Spanish`

Now TTS will speak in Spanish! Try: `Use text to speech to say "Hello"`

### Check Your Settings

Type: `What's my current AgentVibes configuration?`

Shows your current voice, personality, language, and provider.

---

## Troubleshooting

### "I don't hear any audio"

1. Check your Windows volume (unmuted?)
2. Make sure speakers/headphones are plugged in
3. Restart Claude Desktop
4. See [Audio Troubleshooting Guide](docs/troubleshooting-audio.md)

### "AgentVibes tools not showing"

1. Close Claude Desktop completely (check system tray)
2. Reopen Claude Desktop
3. Wait 30 seconds for MCP server to start
4. Try again

### "Python not found" error

You forgot to check "Add Python to PATH" during installation!

Fix:
1. Uninstall Python (Windows Settings → Apps)
2. Reinstall Python
3. **CHECK THE BOX** "Add Python to PATH"

---

## Want Better Voice Quality?

The free Piper voices are good, but if you want **premium AI voices**, see:

📖 **[Piper TTS Setup Guide](docs/piper-setup.md)** - Premium voices (paid)

---

## Next Steps

✅ You're all set with AgentVibes!

Want to learn more?

- 🎭 **[Personality Guide](docs/personalities.md)** - All available personalities
- 🎤 **[Voice Library](docs/voice-library.md)** - Browse all voices
- 🌍 **[Language Learning Mode](docs/language-learning-mode.md)** - Learn languages while coding

---

**[← Back to Main README](../README.md)**
