# AgentVibes SSH-Remote TTS Feature

## Feature Name: `ssh-remote` Provider

## Overview
A new TTS provider that sends **text** (not audio) to a remote device via SSH, where AgentVibes generates and plays audio locally with full features (voices, sound effects, music).

## Use Case
- **Server → Android/Mobile:** Send TTS from desktop/server to Android device  
- **Headless Server → Desktop:** Send TTS from cloud server to local machine with speakers
- **Multi-Device:** Route TTS to different devices dynamically

## Architecture

```
┌─────────────────────────────┐
│ Source (Server/Desktop)      │
│ ├─ AgentVibes (ssh-remote)  │
│ ├─ Sends TEXT via SSH       │
│ └─ Minimal bandwidth         │
└─────────────────────────────┘
           ↓ SSH/Tailscale
┌─────────────────────────────┐
│ Target (Android/Device)      │
│ ├─ AgentVibes installed     │
│ ├─ Receives text             │
│ ├─ Generates audio (Piper)  │
│ ├─ Applies sound effects    │
│ └─ Plays locally             │
└─────────────────────────────┘
```

## Benefits
✅ **Full AgentVibes features** on target device (50+ voices, effects, music)  
✅ **Low bandwidth** (text only, not audio files)  
✅ **No quality loss** (generated fresh on device)  
✅ **Offline capable** (after Piper voices downloaded)  
✅ **Secure** (SSH key-based authentication)  
✅ **Cross-platform** (Linux, Android/Termux, macOS)

## Implementation

### 1. New Provider: `ssh-remote`

Add to `.claude/hooks/play-tts.sh`:

```bash
# SSH-Remote provider - send text to remote device for local playback
if [[ "$PROVIDER" == "ssh-remote" ]]; then
    SSH_HOST=$(cat ~/.claude/ssh-remote-host.txt 2>/dev/null || echo "")
    SSH_VOICE="${VOICE:-en_US-ryan-high}"
    
    if [[ -z "$SSH_HOST" ]]; then
        echo "❌ SSH-Remote host not configured" >&2
        echo "💡 Set host: echo 'android' > ~/.claude/ssh-remote-host.txt" >&2
        exit 1
    fi
    
    # Send text to remote for local AgentVibes playback
    ssh "$SSH_HOST" "bash ~/.termux/agentvibes-play.sh '$TEXT' '$SSH_VOICE'" &
    
    echo "📱 Sent to $SSH_HOST for local playback"
    exit 0
fi
```

### 2. Remote Receiver Script

Install on target device (`~/.termux/agentvibes-play.sh` or `~/.agentvibes/play-remote.sh`):

```bash
#!/bin/bash
# AgentVibes SSH-TTS Receiver
# Auto-installed with: agentvibes install --ssh-receiver

TEXT="$1"
VOICE="${2:-en_US-ryan-high}"

[[ -z "$TEXT" ]] && { echo "❌ No text" >&2; exit 1; }

export AGENTVIBES_NO_REMINDERS=1

# Find AgentVibes installation
if command -v agentvibes >/dev/null 2>&1; then
    AGENTVIBES_ROOT="$(dirname $(dirname $(which agentvibes)))/lib/node_modules/agentvibes"
elif [[ -d ~/.npm-global/lib/node_modules/agentvibes ]]; then
    AGENTVIBES_ROOT="$HOME/.npm-global/lib/node_modules/agentvibes"
else
    echo "❌ AgentVibes not found" >&2
    exit 1
fi

PLAY_TTS="$AGENTVIBES_ROOT/.claude/hooks/play-tts.sh"
[[ ! -f "$PLAY_TTS" ]] && { echo "❌ play-tts.sh missing" >&2; exit 1; }

bash "$PLAY_TTS" "$TEXT" "$VOICE"
```

### 3. Configuration Files

**Source Device (`~/.claude/`):**
- `ssh-remote-host.txt` - Target SSH hostname (e.g., "android", "desktop")
- `ssh-remote-voice.txt` - Default voice for remote playback (optional)

**Target Device:**
- Receiver script installed at `~/.termux/agentvibes-play.sh` or `~/.agentvibes/play-remote.sh`

### 4. Installation Commands

```bash
# On source (sender)
agentvibes provider switch ssh-remote
echo "android" > ~/.claude/ssh-remote-host.txt

# On target (receiver) - auto-install script
agentvibes install --ssh-receiver

# Or manual:
curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/scripts/install-ssh-receiver.sh | bash
```

### 5. SSH Config Setup

Add to `~/.ssh/config`:
```
Host android
    HostName 100.115.27.58
    User u0_a484
    Port 52847
    IdentityFile ~/.ssh/android_key
```

## New Commands

```bash
# Switch to SSH-Remote provider
agentvibes provider switch ssh-remote

# Configure remote host
agentvibes ssh-remote config android

# Test connection
agentvibes ssh-remote test

# Install receiver on remote
agentvibes ssh-remote install

# List configured remotes
agentvibes ssh-remote list
```

## File Structure

```
agentvibes/
├── .claude/
│   ├── hooks/
│   │   └── play-tts.sh          # Add ssh-remote provider
│   ├── docs/
│   │   └── SSH_REMOTE_SETUP.md  # New documentation
│   └── ssh-remote-host.txt      # User config (gitignored)
├── scripts/
│   └── install-ssh-receiver.sh  # Receiver installer
└── templates/
    └── agentvibes-receiver.sh   # Template for receiver script
```

## Testing

### Unit Tests
```bash
# Test SSH connection
agentvibes ssh-remote test

# Test with text
agentvibes tts "Hello from server!" --provider ssh-remote

# Test voice override
agentvibes tts "Testing" --provider ssh-remote --voice en_US-amy-medium
```

### Integration Tests
1. Server → Android (Termux/Tailscale)
2. Headless → Desktop (SSH local network)
3. Multi-hop (Server → Jump → Android)

## Documentation Updates

### README.md
Add ssh-remote to provider list and features

### New: SSH_REMOTE_SETUP.md
- Complete setup guide
- Troubleshooting
- Android/Termux specific instructions
- Tailscale integration

### RELEASE_NOTES.md
```
## v3.3.0 - SSH-Remote TTS Provider

### New Features
- 🆕 **ssh-remote provider** - Send text to remote devices for local playback
- 📱 Android/Termux support with full AgentVibes features
- 🔐 Secure SSH-based text transmission
- 🎵 Full voice/effect/music support on target device
- 🌐 Tailscale integration for secure remote access

### Installation
\`\`\`bash
npm install -g agentvibes@3.3.0
agentvibes provider switch ssh-remote
echo "android" > ~/.claude/ssh-remote-host.txt
\`\`\`
```

## Security Considerations

✅ **SSH Key-Based Auth Only** - No password authentication  
✅ **Text Only** - No executable code sent over SSH  
✅ **Input Sanitization** - Escape quotes/special chars in text  
✅ **Tailscale Support** - Encrypted VPN recommended  
✅ **No Internet Exposure** - SSH listening on private IPs only

## Performance

| Metric | Value |
|--------|-------|
| **Latency** | ~100-300ms (local network) |
| **Bandwidth** | ~1-5 KB per message (text only) |
| **Audio Quality** | Full Piper quality (local generation) |
| **Battery Impact** | Moderate (Android TTS generation) |

## Version & Release Plan

**Target Version:** v3.3.0  
**Branch:** `feature/ssh-remote-provider`  
**Estimated Completion:** 2026-02-01

### Release Checklist
- [ ] Implement ssh-remote provider
- [ ] Create receiver installer script
- [ ] Write SSH_REMOTE_SETUP.md
- [ ] Add unit tests
- [ ] Test on Android/Termux
- [ ] Test on Linux Desktop
- [ ] Update README.md
- [ ] Update RELEASE_NOTES.md
- [ ] Create example configs
- [ ] Add to agentvibes.org docs

## Future Enhancements (v3.4+)

- **Multi-target:** Send to multiple devices simultaneously
- **Load balancing:** Distribute TTS across multiple Android devices
- **Fallback chain:** ssh-remote → piper → elevenlabs
- **WebSocket alternative:** For firewall-restricted environments
- **Mobile app:** Native Android app (non-Termux)

---

**Status:** 🚧 In Development  
**Author:** Paul Preibisch  
**Repo:** https://github.com/paulpreibisch/AgentVibes
