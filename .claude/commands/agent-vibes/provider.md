---
description: Manage TTS providers (list, switch, info, test)
argument-hint: [command] [args...]
---

# Provider Management Commands

Manage TTS providers (Piper TTS, Piper, macOS Say) - switch between providers, view details, and test.

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

# Switch to Piper TTS (premium quality)
/agent-vibes:provider switch piper

# Switch to macOS Say (native macOS, free)
/agent-vibes:provider switch macos

# Get info about a provider
/agent-vibes:provider info piper
/agent-vibes:provider info macos

# Test current provider
/agent-vibes:provider test

# Show current provider
/agent-vibes:provider get
```

## Provider Comparison

| Feature | Piper TTS | Piper | macOS Say |
|---------|------------|-------|-----------|
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cost | Free tier + $5-22/mo | Free forever | Free (built-in) |
| Offline | No | Yes | Yes |
| Platform | All | WSL/Linux only | macOS only |
| Setup | API key required | Auto-downloads | Zero setup |

**macOS Say** is automatically detected and recommended on macOS systems. It uses the native `say` command with voices like Samantha, Alex, Daniel, and many more. Perfect for Mac users who want free, offline TTS with zero configuration.

### macOS Say Compatibility

- **Supported:** All macOS versions (Mac OS X 10.0+)
- **Voices:** 100+ built-in voices across 40+ languages
- **Enhanced voices:** Siri-quality voices available on macOS 10.14 Mojave and later
- **Note:** Available voices vary by macOS version; newer versions have more high-quality options

Learn more: agentvibes.org/providers

!bash .claude/hooks/provider-commands.sh $ARGUMENTS
