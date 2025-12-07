# 🔊 Audio Troubleshooting Guide

**No sound?** Let's fix it! This guide covers the most common audio issues.

---

## Quick Checks (Try These First!)

1. **Is your volume turned up?**
   - Check Windows volume (bottom right corner)
   - Make sure it's not muted (look for red X icon)

2. **Are speakers/headphones plugged in?**
   - Check physical connection
   - Try playing music from another app (YouTube, Spotify)

3. **Restart Claude Desktop**
   - Close it completely (check system tray)
   - Wait 5 seconds
   - Open it again

If still no audio, continue below...

---

## For Piper (Free Voices)

### Issue: "No audio output"

**Step 1: Check if WSL is installed**

Open PowerShell and type:
```powershell
wsl --status
```

- ✅ If you see status info → WSL is installed
- ❌ If you see an error → [Install WSL](#installing-wsl)

**Step 2: Check if Piper is installed in WSL**

In PowerShell, type:
```powershell
wsl -e bash -c "which piper"
```

- ✅ If you see a path like `/usr/local/bin/piper` → Piper is installed
- ❌ If you see nothing or error → [Install Piper](#installing-piper)

**Step 3: Test Piper directly**

In PowerShell, type:
```powershell
wsl -e bash -c "echo 'Hello' | piper --model en_US-lessac-medium --output_file /tmp/test.wav"
```

- ✅ If this completes without error → Piper works
- ❌ If you see an error → See [Common Piper Errors](#common-piper-errors)

**Step 4: Check audio routing from WSL**

Windows needs PulseAudio or WSLg to play WSL audio.

1. Make sure you're on Windows 11 or Windows 10 version 2004+ (build 19041+)
2. Check Windows Update for latest updates
3. Install WSLg update: https://github.com/microsoft/wslg/releases

### Installing WSL

If WSL isn't installed:

1. Open PowerShell **as Administrator**:
   - Press `Windows Key`
   - Type `PowerShell`
   - Right-click "Windows PowerShell"
   - Click "Run as administrator"

2. Run:
   ```powershell
   wsl --install
   ```

3. Restart your computer

4. Verify:
   ```powershell
   wsl --status
   ```

### Installing Piper

If Piper isn't installed in WSL:

1. Open PowerShell and run:
   ```powershell
   wsl -e bash -c "curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/.claude/hooks/piper-installer.sh | bash"
   ```

2. Wait for installation to complete (2-3 minutes)

3. Verify:
   ```powershell
   wsl -e bash -c "piper --version"
   ```

### Common Piper Errors

**Error: "piper: command not found"**

Piper isn't installed. See [Installing Piper](#installing-piper)

**Error: "Could not find model file"**

The voice model isn't downloaded:

```powershell
wsl -e bash -c "piper --model en_US-lessac-medium --download-dir /tmp/piper-models"
```

**Error: "Permission denied"**

Fix file permissions:

```powershell
wsl -e bash -c "chmod +x ~/.local/bin/piper"
```

---

## For Piper TTS (Premium Voices)

### Issue: "No audio output"

**Step 1: Check API key is set**

Open PowerShell and type:
```powershell
```

- ✅ If you see a long string (your API key) → Key is set
- ❌ If you see nothing or blank → [Set API Key](#setting-api-key)

**Step 2: Check internet connection**

Piper TTS requires internet:

1. Open your browser
2. Go to https://piper.io
3. Make sure the site loads

**Step 3: Check your quota**

You might be out of free credits:

1. Go to https://piper.io/app/usage
2. Check if you've exceeded your character limit
3. If exceeded → [Upgrade plan](https://piper.io/pricing) or switch to Piper

**Step 4: Test API key is valid**

In Claude Desktop, type:
```
List all available voices
```

- ✅ If you see a list of voices → API key works
- ❌ If you see an error → [Check API Key](#checking-api-key)

### Setting API Key

If your API key isn't set:

1. Get your key from https://piper.io/app/settings/api-keys

2. Open PowerShell and run:
   ```powershell
   ```

3. Close PowerShell

4. Close Claude Desktop completely

5. Open Claude Desktop again

### Checking API Key

If your API key isn't working:

1. Go to https://piper.io/app/settings/api-keys

2. Create a **new** API key

3. Copy the new key

4. Set it in PowerShell:
   ```powershell
   ```

5. Restart Claude Desktop

---

## For Both Providers

### Issue: "Tools not showing in Claude Desktop"

**Check MCP server status:**

1. Close Claude Desktop completely (check system tray)

2. Open this folder:
   - Press `Windows Key + R`
   - Paste: `%APPDATA%\Claude\logs`
   - Press Enter

3. Open `mcp-server-agentvibes.log`

4. Look at the last few lines:
   - ✅ If you see "Server started" → MCP is running
   - ❌ If you see errors → See [Common MCP Errors](#common-mcp-errors)

### Common MCP Errors

**Error: "Python not found"**

Python isn't installed or not in PATH:

1. Download Python from https://python.org/downloads

2. During installation, **check "Add Python to PATH"**

3. Restart Claude Desktop

**Error: "Node.js not found"** or **"npx not found"**

Node.js isn't installed:

1. Download Node.js from https://nodejs.org

2. Install it (click Next through all steps)

3. Restart Claude Desktop

**Error: "Module 'mcp' not found"**

MCP package isn't installed:

1. Open PowerShell

2. Run:
   ```powershell
   pip install mcp
   ```

3. Restart Claude Desktop

**Error: "Config file invalid JSON"**

Your config file has syntax errors:

1. Press `Windows Key + R`

2. Paste: `%APPDATA%\Claude\claude_desktop_config.json`

3. Open with Notepad

4. Make sure it looks exactly like this:
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

5. Save and restart Claude Desktop

---

## Still Not Working?

### Check Claude Desktop Logs

Full diagnostic info:

1. Press `Windows Key + R`

2. Paste: `%APPDATA%\Claude\logs\mcp-server-agentvibes.log`

3. Press Enter

4. Read the error messages

5. Search for the error online or [open an issue](https://github.com/paulpreibisch/AgentVibes/issues)

### Get Help

- **GitHub Issues**: https://github.com/paulpreibisch/AgentVibes/issues
- **Discussions**: https://github.com/paulpreibisch/AgentVibes/discussions

When asking for help, include:
- Your Windows version
- Python version (`python --version`)
- Node.js version (`node --version`)
- Provider (Piper or Piper TTS)
- Error messages from logs

---

**[← Back to Windows Setup Guide](../mcp-server/WINDOWS_SETUP.md)**
