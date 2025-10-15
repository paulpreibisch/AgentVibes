# AgentVibes MCP Server - Windows Setup Guide

Complete guide for setting up AgentVibes MCP server on Windows with Claude Desktop.

## Quick Start (Automatic)

```powershell
cd C:\Users\Paul\AgentVibes
npm install
```

That's it! The `npm install` command will automatically:
- Install Node.js dependencies
- Install Python `mcp` package
- Verify Python is available

## Voice Options for Windows

AgentVibes supports two TTS providers on Windows:

### 1. ElevenLabs (Recommended for Windows) ⭐

**Pros:**
- ✅ Works perfectly on Windows
- ✅ 30+ premium, natural-sounding voices
- ✅ Multi-language support (25+ languages)
- ✅ Easy setup - no additional software needed

**Cons:**
- ❌ Requires API key (paid service, but has free tier)
- ❌ Requires internet connection

**Setup:**

1. Get API key from https://elevenlabs.io
2. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "python",
      "args": ["C:\\\\Users\\\\Paul\\\\AgentVibes\\\\mcp-server\\\\server.py"],
      "env": {
        "ELEVENLABS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3. Configure in AgentVibes (from WSL):
```bash
cd /mnt/c/Users/Paul/AgentVibes
.claude/hooks/provider-manager.sh switch elevenlabs
```

### 2. Piper TTS (Free, Offline)

**Pros:**
- ✅ Completely free
- ✅ Works offline
- ✅ No API key needed
- ✅ Privacy-focused (all local)

**Cons:**
- ❌ More complex Windows setup
- ❌ Fewer voice options
- ❌ Audio quality not as good as ElevenLabs

**Setup:**

Piper works on Windows but requires WSL or Windows builds:

**Option A: Use WSL (Easier)**

1. Install WSL if not already:
   ```powershell
   wsl --install
   ```

2. In WSL Ubuntu:
   ```bash
   pipx install piper-tts
   ```

3. Configure audio to work from WSL → Windows:
   - See: `setup-ubuntu-rdp-audio.sh` in the repo

**Option B: Windows Native (Advanced)**

1. Download Piper Windows release:
   - https://github.com/rhasspy/piper/releases
   - Extract to `C:\Program Files\Piper\`

2. Add to PATH in PowerShell:
   ```powershell
   $env:PATH += ";C:\Program Files\Piper"
   ```

3. Configure in AgentVibes

**Recommendation:** For Windows, use **ElevenLabs**. It's much easier to set up and provides better voice quality.

## Complete Installation Steps

### 1. Prerequisites

- **Python 3.10+** installed from https://python.org
  - During installation, check "Add Python to PATH"
- **Node.js 16+** installed from https://nodejs.org
- **Git** (optional, for cloning)

### 2. Install AgentVibes

Clone or download the repository:

```powershell
cd C:\Users\Paul
git clone https://github.com/paulpreibisch/AgentVibes.git
cd AgentVibes
```

### 3. Run NPM Install

```powershell
npm install
```

This automatically installs:
- Node.js dependencies
- Python `mcp` package

### 4. Configure Claude Desktop

Edit: `C:\Users\Paul\AppData\Roaming\Claude\claude_desktop_config.json`

**For ElevenLabs:**

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "python",
      "args": ["C:\\\\Users\\\\Paul\\\\AgentVibes\\\\mcp-server\\\\server.py"],
      "env": {
        "ELEVENLABS_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

**For Piper (if you set it up):**

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "python",
      "args": ["C:\\\\Users\\\\Paul\\\\AgentVibes\\\\mcp-server\\\\server.py"],
      "env": {}
    }
  }
}
```

### 5. Restart Claude Desktop

Close Claude Desktop completely and reopen it.

### 6. Test It!

In Claude Desktop:

```
"What AgentVibes tools do you have?"
```

Should show: `text_to_speech`, `list_voices`, `set_voice`, etc.

```
"Use text to speech to say hello"
```

You should hear audio!

## Troubleshooting

### "No module named 'mcp'"

Run manually:
```powershell
pip install mcp
# or
python -m pip install mcp
```

Verify:
```powershell
python -c "import mcp; print('Success!')"
```

### Python Not Found

1. Install Python from https://python.org
2. During installation, check "Add Python to PATH"
3. Restart PowerShell
4. Verify: `python --version`

### Audio Not Playing (ElevenLabs)

1. Check API key is correct
2. Check internet connection
3. View logs: `C:\Users\Paul\AppData\Roaming\Claude\logs\mcp-server-agentvibes.log`

### Audio Not Playing (Piper)

Piper on Windows requires:
- PulseAudio or WSL audio setup
- See `setup-ubuntu-rdp-audio.sh` for WSL configuration
- Or use ElevenLabs instead (much easier)

## Voice Configuration

List available voices:
```
"List all AgentVibes voices"
```

Switch voice:
```
"Switch to Northern Terry voice"
```

Set personality:
```
"Set personality to pirate"
```

## Advanced: Custom Instructions

Add to Claude Desktop custom instructions for automatic TTS:

```markdown
When I give you a task:
1. Use text_to_speech to acknowledge before starting
2. Perform the task
3. Use text_to_speech to confirm completion

Keep messages brief (under 150 characters).
```

See `mcp-server/examples/custom_instructions.md` for full examples.

## Performance Notes

- **ElevenLabs**: ~1-2 second latency (API call over internet)
- **Piper**: Near instant (runs locally)
- **Windows Python**: Slightly slower startup than WSL Python

## Recommended Setup for Windows Users

1. Use **ElevenLabs** for best voice quality
2. Get a free API key (500 characters/month free tier)
3. Upgrade to paid plan if you use it heavily
4. Keep Piper as backup for offline use

## Support

- **Issues**: https://github.com/paulpreibisch/AgentVibes/issues
- **Docs**: See main README.md
- **Logs**: `%APPDATA%\Claude\logs\mcp-server-agentvibes.log`

---

🎤 **Enjoy your talking Claude Desktop on Windows!**
