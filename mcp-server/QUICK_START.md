# Quick Start Guide

Get AgentVibes MCP server running in 5 minutes!

## Step 1: Prerequisites

Make sure AgentVibes is installed and working:

```bash
# Test your AgentVibes installation
cd /path/to/AgentVibes
.claude/hooks/play-tts.sh "Testing AgentVibes"
```

If you hear audio, you're good to go! If not, see the main AgentVibes README.

## Step 2: Install MCP Python Library

```bash
cd mcp-server
pip install mcp
```

Or using pipx (recommended for CLI tools):

```bash
pipx install mcp
```

## Step 3: Test the Server (Optional)

```bash
# Syntax check (always works)
python3 -m py_compile server.py

# Full test (requires mcp library)
python3 test_server.py
```

## Step 4: Configure Claude Desktop

### Find Your Config File

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Add AgentVibes Server

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "python3",
      "args": ["/FULL/PATH/TO/AgentVibes/mcp-server/server.py"],
      "env": {
        "ELEVENLABS_API_KEY": "sk-..."
      }
    }
  }
}
```

**Important:**
- Use the FULL absolute path (not ~/ shortcuts)
- Use `python3` (not `python`) on Linux/macOS
- Replace `/FULL/PATH/TO/AgentVibes/` with your actual path

### Find Your Full Path

```bash
cd /path/to/AgentVibes
pwd
# Copy this output and use it in the config
```

## Step 5: Restart Claude Desktop

Close Claude Desktop completely and reopen it.

## Step 6: Test in Claude Desktop

Try these prompts:

```
"What AgentVibes tools do you have?"
```

You should see tools like `text_to_speech`, `list_voices`, etc.

```
"Use text to speech to say hello"
```

You should hear audio!

## Common Issues

### "No module named 'mcp'"

```bash
pip install mcp
# or
pip3 install mcp
```

### "Server not showing in Claude Desktop"

1. Check path is absolute (not relative)
2. Check you used `python3` (not `python`)
3. View logs:
   - **macOS:** `~/Library/Logs/Claude/mcp*.log`
   - **Windows:** `%APPDATA%\Claude\logs\mcp*.log`

### "Audio not playing"

```bash
# Test directly
cd /path/to/AgentVibes
.claude/hooks/play-tts.sh "Test"

# Check provider
cat .claude/tts-provider.txt

# Try switching provider
.claude/hooks/provider-manager.sh list
.claude/hooks/provider-manager.sh switch piper
```

## Next Steps

### Add Custom Instructions

Copy from `examples/custom_instructions.md` to enable automatic voice acknowledgments.

### Try Personalities

```
"List available personalities"
"Set personality to pirate"
"Say hello with the current personality"
```

### Try Languages

```
"Set language to Spanish"
"Say welcome in Spanish"
```

### Explore Voices

```
"List all available voices"
"Switch to Northern Terry voice"
"Preview voices"
```

## Advanced

### Using Piper (Free, Offline)

If you don't have an ElevenLabs API key:

```bash
# Install Piper
pipx install piper-tts

# Switch to Piper
cd /path/to/AgentVibes
.claude/hooks/provider-manager.sh switch piper

# Update Claude Desktop config (remove ELEVENLABS_API_KEY)
{
  "mcpServers": {
    "agentvibes": {
      "command": "python3",
      "args": ["/FULL/PATH/TO/AgentVibes/mcp-server/server.py"]
    }
  }
}
```

### Project-Specific Settings

Each project can have its own voice and personality:

```bash
cd /your/project
mkdir -p .claude
echo "pirate" > .claude/tts-personality.txt
echo "Cowboy Bob" > .claude/tts-voice.txt
```

Now when Claude Desktop works in this directory, it uses those settings!

## Help

- **GitHub Issues:** https://github.com/paulpreibisch/AgentVibes/issues
- **Full README:** See `README.md` in this directory
- **AgentVibes Docs:** Main repository README

---

🎤 **Enjoy your talking Claude Desktop!**
