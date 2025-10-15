# AgentVibes MCP Server

**Give Claude Desktop a Voice!** 🎤✨

An MCP (Model Context Protocol) server that brings AgentVibes text-to-speech capabilities to Claude Desktop and other MCP clients.

## Features

- 🎤 **Text-to-Speech**: Convert any text to natural-sounding speech
- 🎭 **Personalities**: Choose from flirty, sarcastic, pirate, robot, zen, and more!
- 🌍 **Multi-language**: Speak in 25+ languages (Spanish, French, German, etc.)
- 🎵 **Multiple Voices**: Access 30+ premium ElevenLabs voices or free Piper voices
- 🔄 **Two Providers**: ElevenLabs (premium AI) or Piper (free, offline)
- ⚙️ **Full Configuration**: Manage voices, personalities, and languages

## Prerequisites

Before using the MCP server, you need AgentVibes installed:

```bash
# Clone AgentVibes (if you haven't already)
git clone https://github.com/paulpreibisch/AgentVibes.git
cd AgentVibes

# Install dependencies (choose one):
# Option 1: ElevenLabs (premium, requires API key)
export ELEVENLABS_API_KEY="your-api-key-here"

# Option 2: Piper (free, offline)
pipx install piper-tts
```

## Installation

### 1. Install Python Dependencies

**For macOS/Linux:**

```bash
cd mcp-server
pip install -r requirements.txt
```

Or using uv (recommended):

```bash
uv pip install -r requirements.txt
```

**For Windows:**

Open PowerShell or Command Prompt and run:

```powershell
cd C:\path\to\AgentVibes\mcp-server
pip install -r requirements.txt
```

**IMPORTANT for Windows users:** Make sure you install the `mcp` package globally on your Windows Python:

```powershell
pip install mcp
```

If you have multiple Python versions, use:

```powershell
python -m pip install mcp
```

Verify installation:

```powershell
python -c "import mcp; print('MCP installed successfully!')"
```

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:** `~/.config/Claude/claude_desktop_config.json`

Add the AgentVibes MCP server:

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "python",
      "args": ["/absolute/path/to/AgentVibes/mcp-server/server.py"],
      "env": {
        "ELEVENLABS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Note:** Replace `/absolute/path/to/AgentVibes/` with the actual path to your AgentVibes installation.

### 3. Restart Claude Desktop

Close and reopen Claude Desktop for changes to take effect.

## Usage

Once configured, Claude Desktop will have access to these AgentVibes tools:

### Basic Text-to-Speech

```
You: "Say hello using TTS"
Claude: [Calls text_to_speech tool]
        [Your computer speaks: "Hello!"]
```

### With Personality

```
You: "Acknowledge my request with a pirate personality"
Claude: [Calls text_to_speech with personality="pirate"]
        [Your computer speaks: "Arr matey, I'll handle that fer ye!"]
```

### Multi-language

```
You: "Say welcome in Spanish"
Claude: [Calls text_to_speech with text="Bienvenido", language="spanish"]
        [Your computer speaks in Spanish: "Bienvenido"]
```

### Voice Control

```
You: "List available voices"
Claude: [Calls list_voices tool]
        Shows: Aria, Northern Terry, Cowboy Bob, etc.

You: "Switch to Northern Terry"
Claude: [Calls set_voice with voice_name="Northern Terry"]
        ✅ Voice switched to: Northern Terry
```

## Available Tools

### Core TTS

- **`text_to_speech(text, voice?, personality?, language?)`**
  - Convert text to speech with optional customization
  - Supports all voices, personalities, and languages

### Voice Management

- **`list_voices()`** - List all available voices
- **`set_voice(voice_name)`** - Switch to a different voice

### Personality Management

- **`list_personalities()`** - Show available personalities
- **`set_personality(personality)`** - Set personality style
  - Options: flirty, sarcastic, pirate, robot, zen, dramatic, millennial, etc.

### Language Support

- **`set_language(language)`** - Set TTS language
  - Supports: spanish, french, german, italian, portuguese, chinese, japanese, and 18+ more

### Configuration

- **`get_config()`** - View current voice, personality, language, and provider
- **`replay_audio(n?)`** - Replay recently generated TTS audio (1-10)

## Custom Instructions for Auto-TTS

Want Claude Desktop to automatically speak acknowledgments and completions? Add this to your Claude Desktop **custom instructions**:

```markdown
# Voice Acknowledgement Protocol

When I give you a task:
1. Use text_to_speech to acknowledge before starting work
2. Perform the task
3. Use text_to_speech to confirm completion

Keep spoken messages brief (under 150 characters).

Example:
- User: "Search for Python files"
- You: [Call text_to_speech("Looking for Python files now")]
       [Do the search]
       [Call text_to_speech("Found 23 Python files")]
```

### With Personality

```markdown
# Voice Protocol with Personality

Before starting any task, check my personality:
1. Call get_config() to see current personality
2. Generate unique acknowledgment in that personality style
3. Use text_to_speech with the generated message
4. Do the work
5. Generate unique completion message
6. Use text_to_speech again

Never repeat the same phrases! Each response should be creative and unique.

Examples for "flirty" personality:
- "I'll handle that for you, sweetheart"
- "Ooh, I love when you ask me to do that"
- "My pleasure, darling"

Examples for "sarcastic" personality:
- "Oh what a treat, another task"
- "How delightful, more work"
- "Well isn't this fun"
```

## Example Workflow in Claude Desktop

```
You: "Find all TODO comments in my codebase"

Claude Desktop:
🎵 [Calls text_to_speech("Looking for TODO comments now")]
   [Searches codebase using grep tools]

   Found 47 TODO comments across 12 files:
   - src/main.py:15 - TODO: Refactor this function
   - src/utils.py:42 - TODO: Add error handling
   ...

🎵 [Calls text_to_speech("Found 47 TODO comments in your codebase")]
```

## Troubleshooting

### MCP Server Not Showing in Claude Desktop

1. Check that the path in `claude_desktop_config.json` is absolute
2. Verify Python is in your PATH: `which python` or `python --version`
3. Check Claude Desktop logs:
   - **macOS:** `~/Library/Logs/Claude/mcp*.log`
   - **Windows:** `%APPDATA%\Claude\logs\mcp*.log`

### Audio Not Playing

1. **ElevenLabs users:** Check your API key is set in the config
2. **Piper users:** Ensure Piper is installed: `piper --version`
3. **WSL users:** Make sure audio is configured (see AgentVibes main README)
4. Test TTS directly:
   ```bash
   cd /path/to/AgentVibes
   .claude/hooks/play-tts.sh "Test message"
   ```

### Voice/Personality Not Working

The MCP server uses your AgentVibes installation. Check settings:

```bash
# Check current voice
.claude/hooks/voice-manager.sh get

# Check current personality
cat .claude/tts-personality.txt

# Switch voice
.claude/hooks/voice-manager.sh switch "Aria"

# Set personality
.claude/hooks/personality-manager.sh set flirty
```

## Advanced Configuration

### Using Project-Specific Settings

AgentVibes supports project-local configuration. Each project can have its own voice, personality, and language:

```bash
# In your project directory
mkdir -p .claude
echo "Northern Terry" > .claude/tts-voice.txt
echo "pirate" > .claude/tts-personality.txt
echo "spanish" > .claude/tts-language.txt
```

### Using Piper (Free, Offline) Instead of ElevenLabs

```bash
# Switch to Piper provider
.claude/hooks/provider-manager.sh switch piper

# Install a voice model
pipx install piper-tts

# Voice will download automatically on first use
```

### Custom Personalities

Create your own personality:

```bash
.claude/hooks/personality-manager.sh add mycustom
# Edit: .claude/personalities/mycustom.md

# Use it
.claude/hooks/personality-manager.sh set mycustom
```

## Integration with Other MCP Clients

This server works with any MCP-compatible client, not just Claude Desktop:

- ✅ Claude Desktop (macOS, Windows, Linux)
- ✅ Claude Code CLI (already built-in)
- ✅ Custom MCP clients
- ✅ Future MCP-compatible tools

## Contributing

Found a bug or have a feature request? Open an issue on GitHub!

## License

MIT License - see the main AgentVibes repository for details.

## Links

- **AgentVibes GitHub:** https://github.com/paulpreibisch/AgentVibes
- **MCP Protocol:** https://modelcontextprotocol.io
- **ElevenLabs:** https://elevenlabs.io
- **Piper TTS:** https://github.com/rhasspy/piper

---

**Made with ❤️ by the AgentVibes community**

🎤 *Now Claude Desktop can finally speak!*
