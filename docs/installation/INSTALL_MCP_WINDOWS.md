# Install AgentVibes MCP on Windows

## Prerequisites

1. **Python 3.10+** - Download from [python.org](https://python.org)
2. **Node.js 16+** - Should already be installed if you have Claude Desktop
3. **ElevenLabs API Key** (optional) - Get from [elevenlabs.io](https://elevenlabs.io)

## Installation

### Option 1: NPX (Recommended)

AgentVibes MCP is published to npm and can be installed automatically via NPX.

#### Step 1: Set Environment Variable

Open **PowerShell** and set your ElevenLabs API key (if using ElevenLabs):

```powershell
setx ELEVENLABS_API_KEY "your-api-key-here"
```

If you don't have an API key, Piper TTS (free, offline) will be used automatically.

#### Step 2: Configure Claude Desktop

Open your Claude Desktop config file:
```
C:\Users\YOUR_USERNAME\AppData\Roaming\Claude\claude_desktop_config.json
```

Add this to the `mcpServers` section:

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "npx",
      "args": [
        "-y",
        "-p",
        "agentvibes@beta",
        "agentvibes-mcp-server"
      ],
      "env": {
        "ELEVENLABS_API_KEY": "${ELEVENLABS_API_KEY}"
      }
    }
  }
}
```

**⚠️ IMPORTANT:** The `-p` flag is critical for NPX to correctly parse the command!

#### Step 3: Restart Claude Desktop

1. **Completely exit** Claude Desktop (right-click system tray → Exit)
2. **Wait 5 seconds**
3. **Restart** Claude Desktop

The first launch will download AgentVibes and install Python dependencies automatically.

#### Step 4: Verify

In Claude Desktop, try:
- "List available voices"
- "Use text to speech to say hello"

## Troubleshooting

### Error: "No module named 'mcp'"

The Python MCP package is missing. Install it:

```powershell
pip install mcp
```

Or:
```powershell
python -m pip install mcp
```

### Error: "Python 3 Not Found"

Install Python 3.10+ from [python.org](https://python.org), then restart Claude Desktop.

### Error: "bin/mcp-server: No such file or directory"

You're using the wrong NPX syntax. Make sure your config includes the `-p` flag:

```json
"args": ["-y", "-p", "agentvibes@beta", "agentvibes-mcp-server"]
```

**NOT:**
```json
"args": ["-y", "agentvibes@beta", "agentvibes-mcp-server"]  ❌ Missing -p
```

### Check Logs

View the MCP server logs:
```
C:\Users\YOUR_USERNAME\AppData\Roaming\Claude\logs\mcp-server-agentvibes.log
```

### Clear NPX Cache

If you're stuck on an old version:

```powershell
npx clear-npx-cache
```

Then restart Claude Desktop to download fresh.

## Configuration Options

### Using Piper TTS (Free, Offline)

Remove or omit the `ELEVENLABS_API_KEY` environment variable. Piper will be used automatically.

### Using ElevenLabs (Premium)

Set your API key:
```powershell
setx ELEVENLABS_API_KEY "your-key"
```

### Beta vs Stable

- **Beta:** Latest features, may have bugs
  ```json
  "args": ["-y", "-p", "agentvibes@beta", "agentvibes-mcp-server"]
  ```

- **Stable:** Production-ready
  ```json
  "args": ["-y", "-p", "agentvibes@latest", "agentvibes-mcp-server"]
  ```

## Next Steps

Once installed, explore these slash commands in Claude Code:
- `/agent-vibes:list` - List available voices
- `/agent-vibes:switch <voice>` - Change voice
- `/agent-vibes:personality <name>` - Set personality style
- `/agent-vibes:provider` - Manage TTS providers

---

🎤 **Ready to make your AI agents speak!**
