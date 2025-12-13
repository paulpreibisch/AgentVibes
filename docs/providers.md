# Multi-Provider Support

AgentVibes v2.0 introduces **multi-provider TTS support** - choose between premium Piper TTS AI voices or free offline Piper TTS!

## 🎤 Piper TTS (Premium AI Voices)

**Features:**
- 150+ professional AI voices
- 30+ languages with multilingual v2 model
- Studio-quality audio with emotional range
- Character voices, accents, and unique personalities
- Voices include: Aria, Archer, Cowboy Bob, Pirate Marshal, Grandpa Spuds, Jessica Anne Bogart, and more!

**Requirements:**
- Piper TTS API key (get free tier at [piper.io](https://piper.io))
- Internet connection for API calls

**Pricing (2025):**
- Free: 10,000 chars/month (light use)
- Starter: $5/month - 30,000 chars
- Creator: $22/month - 100,000 chars
- Pro: $99/month - 500,000 chars

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

## 💾 Audio File Saving

AgentVibes supports optional saving of TTS audio files to disk. By **default, audio files are NOT saved** - they use secure temporary storage and are automatically cleaned up after playback.

**Default Behavior (Recommended):**
- Audio plays but files are not saved
- Uses secure temp directories (`$XDG_RUNTIME_DIR/agentvibes-tts/`)
- Automatic cleanup after playback
- Saves disk space
- Privacy-focused (no permanent audio logs)

**When to Enable Audio Saving:**
- Building TTS voice libraries
- Debugging TTS output quality
- Creating audio archives/logs
- Testing replay functionality
- Need persistent audio files

### Commands

```bash
# Check current setting
/agent-vibes:save-audio status
# MCP: get_save_audio_status()

# Enable audio file saving
/agent-vibes:save-audio on
# MCP: enable_save_audio()
# Files saved to: .claude/audio/tts-{timestamp}.wav

# Disable audio file saving (default)
/agent-vibes:save-audio off
# MCP: disable_save_audio()
# Uses temp files with automatic cleanup
```

### Installation

During **Full Mode** setup, you'll be prompted:
```
Would you like to save TTS audio files to disk?
  [y] Yes - Save files to .claude/audio/
            (useful for debugging, replay, archiving)
  [N] No  - Use temporary files (default)
            (automatic cleanup, saves disk space)
```

**Lite Mode**: Always uses temporary files regardless of this setting (for minimal overhead).

### Technical Details

**When Disabled (Default):**
- Temp location: `$XDG_RUNTIME_DIR/agentvibes-tts/tts-{timestamp}.wav`
- Fallback: `/tmp/agentvibes-tts-$USER/tts-{timestamp}.wav`
- Permissions: `700` (user-only access)
- Cleanup: Automatic via trap on script exit
- Security: SonarQube compliant (secure temp directories)

**When Enabled:**
- Location: `.claude/audio/tts-{timestamp}.wav`
- Persistence: Files remain after playback
- Cleanup: Manual (user manages files)
- Use case: Debugging, archiving, building voice libraries

### Configuration

Setting stored in: `.agentvibes/config/save-audio.txt`
- `true` = Save files
- `false` = Use temp files (default)
- Missing file = Defaults to `false`

Configuration persists across sessions and can be changed anytime via slash command or MCP.

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

# Switch to Piper TTS (premium)
/agent-vibes:provider switch
# Select: piper
```

**Automatic Fallback:**
If Piper TTS API key is missing, AgentVibes automatically falls back to Piper TTS.

## Provider Comparison

| Feature | Piper TTS | Piper TTS |
|---------|-----------|-----------|
| **Voices** | 150+ premium AI | 50+ neural voices |
| **Cost** | $0-99/month | Free forever |
| **Quality** | Studio-grade | High-quality neural |
| **Languages** | 30+ with multilingual v2 | 18 languages |
| **Offline** | ❌ Requires internet | ✅ Works offline |
| **API Key** | ✅ Required | ❌ Not needed |
| **Emotional Range** | ✅ Advanced | ⚠️ Limited |
| **Character Voices** | ✅ Extensive library | ⚠️ Standard voices |
| **Platform Support** | All platforms | Windows, macOS, Linux, WSL |
| **Best For** | Production, demos, variety | Development, privacy, Windows users |

## Which Provider Should I Choose?

**Choose Piper TTS if:**
- You want premium studio-quality voices
- You need extensive character voice variety
- You're creating demos or production content
- You want advanced emotional range
- You have a budget for API costs

**Choose Piper TTS if:**
- You want completely free TTS (works on ALL platforms!)
- You prefer offline/local processing
- You're on macOS, Windows, WSL, or Linux
- You value privacy and data control
- You're in development/testing phase
- You don't want to manage API keys or billing
- **macOS users**: Piper now works via precompiled binaries!

**Pro Tip:** Use Piper for development and Piper TTS for production/demos!

---

[↑ Back to Main README](../README.md)
