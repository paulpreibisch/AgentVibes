---
description: Manage TTS providers (list, switch, info, test)
argument-hint: [command] [args...]
---

# Provider Management Commands

Manage TTS providers (ElevenLabs, Piper) - switch between providers, view details, and test.

## Usage

```bash
/agent-vibes:provider list              # Show all available providers
/agent-vibes:provider switch <name>     # Switch to a different provider
/agent-vibes:provider info <name>       # Show detailed provider information
/agent-vibes:provider test              # Test current provider
/agent-vibes:provider get               # Show current active provider
/agent-vibes:provider help              # Show this help
```

## Examples

```bash
# List available providers
/agent-vibes:provider list

# Switch to Piper (free, offline)
/agent-vibes:provider switch piper

# Switch to ElevenLabs (premium quality)
/agent-vibes:provider switch elevenlabs

# Get info about a provider
/agent-vibes:provider info piper

# Test current provider
/agent-vibes:provider test

# Show current provider
/agent-vibes:provider get
```

## Provider Comparison

| Feature | ElevenLabs | Piper |
|---------|------------|-------|
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cost | Free tier + $5-22/mo | Free forever |
| Offline | No | Yes |
| Platform | All | WSL/Linux only |

Learn more: agentvibes.org/providers

!bash .claude/hooks/provider-commands.sh $ARGUMENTS
