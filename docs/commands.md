# Commands Reference

All commands are prefixed with `/agent-vibes:`

## Voice Commands

| Command | AgentVibes MCP Equivalent | Description |
|---------|----------------|-------------|
| `/agent-vibes:list` | "List all voices" or "What voices are available?" | Show all available voices |
| `/agent-vibes:switch <voice>` | "Switch to Aria voice" or "Change voice to Cowboy Bob" | Change to a different voice |
| `/agent-vibes:whoami` | "What's my current voice?" or "Show my configuration" | Show current voice, sentiment & personality |
| `/agent-vibes:preview [N]` | "Preview voices" or "Let me hear the first 5 voices" | Preview voices with audio samples |
| `/agent-vibes:sample <voice>` | "Test Aria voice" or "Let me hear Cowboy Bob" | Test a specific voice |
| `/agent-vibes:add <name> <id>` | "Add custom voice MyVoice with ID abc123" | Add custom Piper TTS voice |
| `/agent-vibes:replay [N]` | "Replay last message" or "Replay the 3rd message" | Replay recent TTS audio |
| `/agent-vibes:get` | "What voice am I using?" or "Get current voice" | Get currently selected voice |

## System Commands

| Command | AgentVibes MCP Equivalent | Description |
|---------|----------------|-------------|
| `/agent-vibes:version` | "What version of AgentVibes?" or "Show version" | Show installed AgentVibes version |
| `/agent-vibes:update [--yes]` | "Update AgentVibes" or "Upgrade to latest version" | Update to latest version |

## Personality Commands

| Command | AgentVibes MCP Equivalent | Description |
|---------|----------------|-------------|
| `/agent-vibes:personality <name>` | "Set personality to pirate" or "Change to sarcastic personality" | Set personality (changes voice + style) |
| `/agent-vibes:personality list` | "List all personalities" or "What personalities are available?" | Show all personalities |
| `/agent-vibes:personality add <name>` | "Create custom personality called mycustom" | Create custom personality |
| `/agent-vibes:personality edit <name>` | "Edit the flirty personality" | Edit personality file |
| `/agent-vibes:personality get` | "What's my current personality?" or "Show personality" | Show current personality |
| `/agent-vibes:personality reset` | "Reset personality to normal" or "Remove personality" | Reset to normal |

## Sentiment Commands

| Command | AgentVibes MCP Equivalent | Description |
|---------|----------------|-------------|
| `/agent-vibes:sentiment <name>` | "Apply sarcastic sentiment" or "Add flirty sentiment to voice" | Apply sentiment to current voice |
| `/agent-vibes:sentiment list` | "List all sentiments" or "What sentiments are available?" | Show all available sentiments |
| `/agent-vibes:sentiment get` | "What's my current sentiment?" or "Show sentiment" | Show current sentiment |
| `/agent-vibes:sentiment clear` | "Clear sentiment" or "Remove sentiment" | Remove sentiment |

## Language Commands

| Command | AgentVibes MCP Equivalent | Description |
|---------|----------------|-------------|
| `/agent-vibes:set-language <language>` | "Speak in Spanish" or "Change language to French" | Set TTS language (30+ supported) |
| `/agent-vibes:set-language english` | "Reset to English" or "Change language to English" | Reset to English |
| `/agent-vibes:set-language list` | "List all languages" or "What languages are supported?" | Show all supported languages |
| `/agent-vibes:whoami` | "What's my current language?" or "Show configuration" | Show current language + voice |

## BMAD Plugin Commands

| Command | AgentVibes MCP Equivalent | Description |
|---------|----------------|-------------|
| `/agent-vibes-bmad status` | "Show BMAD plugin status" or "What's the BMAD configuration?" | Show BMAD plugin status & mappings |
| `/agent-vibes-bmad enable` | "Enable BMAD voice plugin" or "Turn on BMAD voices" | Enable automatic voice switching |
| `/agent-vibes-bmad disable` | "Disable BMAD plugin" or "Turn off BMAD voices" | Disable plugin (restores previous settings) |
| `/agent-vibes-bmad list` | "List BMAD agent voices" or "Show BMAD voice mappings" | List all BMAD agent voice mappings |
| `/agent-vibes-bmad set <agent> <voice> [personality]` | "Set PM agent to Aria voice with zen personality" | Update agent mapping |
| `/agent-vibes-bmad edit` | "Edit BMAD configuration" or "Open BMAD voice config" | Edit configuration file |

---

[↑ Back to Main README](../README.md)
