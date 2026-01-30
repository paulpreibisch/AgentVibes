## v3.3.0 - SSH-Remote TTS Provider

### 🎉 New Features

- ✨ **ssh-remote provider** - Send text to remote devices for local TTS playback
  - Full AgentVibes features on target device (voices, effects, music)
  - Perfect for Server → Android, Headless → Desktop
  - Secure SSH + Tailscale support
  - Low bandwidth (text only)
  - Easy setup with auto-installer

### Installation & Setup

```bash
# On target device (Android, Linux, macOS)
curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/feature/ssh-remote-provider/scripts/install-ssh-receiver.sh | bash

# On source device
agentvibes provider switch ssh-remote
echo "android" > ~/.claude/ssh-remote-host.txt
agentvibes tts "Hello from the server!"
```

See [SSH-Remote Setup Guide](docs/SSH_REMOTE_SETUP.md) for complete documentation.

### Files Added
- `.claude/hooks/play-tts-ssh-remote.sh` - SSH-remote provider implementation
- `scripts/install-ssh-receiver.sh` - Auto-installer for receiver
- `templates/agentvibes-receiver.sh` - Receiver template
- `docs/SSH_REMOTE_SETUP.md` - Complete setup guide

### Architecture

```
Server → SSH (text) → Remote Device → AgentVibes → Piper TTS → Audio
```

**Benefits:**
- ✅ Full AgentVibes features on remote device
- ✅ Text-only transmission (1-5 KB per message)
- ✅ No quality loss (generated fresh)
- ✅ Secure (SSH key-based auth)
- ✅ Fast (~5 second latency)
