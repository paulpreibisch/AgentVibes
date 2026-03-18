# 🎙️ AgentVibes MCP Setup

**🎯 The easiest way to control AgentVibes - just talk naturally!**

In addition to installing AgentVibes in Claude Code using the NPX installer, we **highly recommend** installing the AgentVibes MCP server. This allows you to control AgentVibes simply by talking naturally to it (especially if you've installed [WhisperTyping](https://whispertyping.com/)), rather than having to remember slash commands.

**Note:** Slash commands (`/agent-vibes:*`) only work in Claude Code. For Claude Desktop and Warp Terminal, you **must** use the AgentVibes MCP for voice control.

Instead of remembering slash commands like `/agent-vibes:switch Aria`, just say:
- "Switch to Aria voice"
- "Change to pirate personality"
- "Speak in Spanish"
- "List available voices"

## Why Use AgentVibes MCP?

✅ **Natural language** - No commands to memorize

✅ **Works everywhere** - Claude Desktop, Claude Code, Warp Terminal

✅ **Unified interface** - Same tools across all apps

✅ **Smart context** - Project-specific or global settings

## Quick MCP Setup

### For Claude Desktop

**📖 Read This First:** If you haven't installed Claude Desktop yet, [click here for the Windows Setup Guide](../mcp-server/WINDOWS_SETUP.md) - it covers WSL setup, Python installation, and all prerequisites.

**Step 1: Set Your Piper TTS API Key (Windows)**

Open Command Prompt or PowerShell and run:
```cmd
```

**Important:** After running `setx`, you must:
1. Close Claude Desktop completely (if running)
2. Open a **new** terminal window (the variable won't be available in current terminal)
3. Restart Claude Desktop

**Step 2: Configure Claude Desktop**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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


### For Warp Terminal

Add to `~/.warp/mcp.json`:

```json
{
  "agentvibes": {
    "command": "npx",
    "args": ["-y", "agentvibes@beta", "agentvibes-mcp-server"],
    "env": {
    }
  }
}
```

### For Claude Code

Add to `.mcp-minimal.json` in your project:

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "npx",
      "args": ["-y", "agentvibes@beta", "agentvibes-mcp-server"],
      "env": {
      }
    }
  }
}
```

**That's it!** Restart the app and start using natural language:

```
"Switch to Northern Terry voice"
"Change personality to sarcastic"
"What voices are available?"
"Speak in French"
"Show my current configuration"
```

## AgentVibes MCP vs Slash Commands

| Feature | AgentVibes MCP | Slash Commands |
|---------|-----------|----------------|
| **Ease of Use** | Natural language | Must remember syntax |
| **Works In** | Claude Desktop, Warp, Claude Code | Claude Code only |
| **Setup** | Add to config file | Auto-installed |
| **Examples** | "Switch voice to Aria" | `/agent-vibes:switch Aria` |

**💡 Recommendation:** Use **AgentVibes MCP for daily use** (easier), **slash commands for scripting** (precise).

## Available AgentVibes MCP Tools

All these work with natural language:

| Tool | Example Command |
|------|-----------------|
| **text_to_speech** | "Say hello in a pirate voice" |
| **list_voices** | "What voices are available?" |
| **set_voice** | "Change to Aria voice" |
| **list_personalities** | "Show me all personalities" |
| **set_personality** | "Set personality to flirty" |
| **set_language** | "Speak in Spanish" |
| **get_config** | "What's my current voice?" |
| **replay_audio** | "Replay the last message" |

## Where Settings Are Saved

The MCP server is smart about where it saves settings:

- **Warp Terminal** → Global `~/.claude/` (terminal-wide settings)
- **Claude Code** → Project `.claude/` (per-project settings)
- **Claude Desktop** → Project `.claude/` (per-project settings)

This means different projects can have different voices/personalities!

---

**[← Back to Main README](../README.md)**
