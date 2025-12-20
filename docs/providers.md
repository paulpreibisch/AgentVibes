# Multi-Provider Support

AgentVibes supports multiple TTS providers - choose between free offline Piper TTS or native macOS voices!

## 🆓 Piper TTS (Free, Offline)

**Features:**
- 50+ neural voices, completely free
- 18 languages supported
- No API key required
- Works offline (perfect for all platforms!)
- Privacy-focused local processing
- Cross-platform support (Windows, macOS, Linux, WSL)

**Requirements:**
- **macOS**: Precompiled binaries (no Python dependencies!)
- **Linux/WSL**: Python pipx (auto-installed)
- **Windows**: Native support - no additional setup
- Automatic voice download on first use

## 🍎 macOS Say (Built-in, Free)

**Features:**
- 70+ built-in system voices
- 40+ languages supported
- Zero installation required
- Native macOS integration
- Instant availability
- High-quality system voices

**Requirements:**
- macOS only (Darwin)
- Pre-installed with every Mac
- No setup needed

## Provider Commands

```bash
# View current provider
/agent-vibes:provider info
# MCP: "What's my current TTS provider?" or "Show provider info"

# List available providers
/agent-vibes:provider list
# MCP: "List all TTS providers" or "What providers are available?"

# Switch providers instantly
/agent-vibes:provider switch
# MCP: "Switch to Piper TTS" or "Change provider to Piper TTS"

# Test provider functionality
/agent-vibes:provider test
# MCP: "Test my TTS provider" or "Test Piper TTS connection"
```

## Switching Between Providers

**During Installation:**
The installer asks which provider you prefer and sets it up automatically.

**After Installation:**
```bash
# Switch to Piper TTS (free)
/agent-vibes:provider switch
# Select: piper

# Switch to macOS Say (macOS only)
/agent-vibes:provider switch
# Select: macos
```

## Provider Comparison

| Feature | Piper TTS | macOS Say |
|---------|-----------|-----------|
| **Voices** | 50+ neural voices | 70+ built-in voices |
| **Cost** | Free forever | Free (built-in) |
| **Quality** | High-quality neural | Natural, system native |
| **Languages** | 18 languages | 40+ languages |
| **Offline** | ✅ Works offline | ✅ Works offline |
| **API Key** | ❌ Not needed | ❌ Not needed |
| **Platform Support** | Windows, macOS, Linux, WSL | macOS only |
| **Installation** | Auto-installed | Pre-installed |
| **Best For** | Cross-platform, development | macOS users, system integration |

## Which Provider Should I Choose?

**Choose Piper TTS if:**
- You want free, high-quality neural voices
- You prefer offline/local processing
- You're on Windows, Linux, or WSL
- You value privacy and data control
- You need cross-platform consistency
- **Works on ALL platforms with precompiled binaries!**

**Choose macOS Say if:**
- You're on macOS
- You want instant setup (no installation)
- You prefer native system voices
- You want maximum language variety (40+ languages)
- You value system integration

**Pro Tip:** macOS users can use either provider - Piper for consistency across platforms, or macOS Say for native system integration!

---

[↑ Back to Main README](../README.md)
