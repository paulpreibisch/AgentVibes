# Clawdbot SSH-Remote TTS with Agent Support

**Version:** 3.3.0-alpha.3  
**Feature:** Multi-agent voice personalities via SSH

## Overview

AgentVibes now supports sending TTS requests from remote Clawdbot instances to an Android device via SSH, with full support for agent-specific audio personalities defined in `audio-effects.cfg`.

This enables multiple Clawdbot instances (Samuel, Orian, Ace, ConciergeBot, etc.) to have unique voices, effects, and background music while generating audio on a shared Android device.

## Architecture

```
Server (Clawdbot)                    Android (Termux)
─────────────────                    ────────────────
local-gen-tts.sh                     ~/.termux/agentvibes-play.sh
      |                                       |
      | SSH + base64                          v
      └──────────────────────>  clawdbot-receiver.sh
                                              |
                                              v
                                   play-tts-enhanced.sh
                                              |
                        ┌─────────────────────┴─────────────┐
                        v                                   v
              audio-effects.cfg lookup          play-tts.sh (Piper TTS)
              (reverb, EQ, music, etc.)
```

## Security

All data is **base64-encoded** before SSH transmission to prevent command injection attacks:

- **Text:** Prevents execution of shell metacharacters (`$()`, `;`, `|`, etc.)
- **Agent Name:** Prevents injection via agent names
- **Validation:** All inputs are validated before encoding

## Setup

### 1. Install AgentVibes on Android

```bash
# On Android (Termux)
cd ~
git clone https://github.com/paulpreibisch/AgentVibes.git agentvibes
cd agentvibes
bash .claude/hooks/termux-installer.sh
```

The installer automatically sets up:
- Piper TTS in proot-distro Debian
- Clawdbot receiver at `~/.termux/agentvibes-play.sh`
- Fallback at `~/.agentvibes/play-remote.sh`

### 2. Configure Audio Effects

Create `~/agentvibes/.claude/config/audio-effects.cfg`:

```bash
# Format: AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|VOLUME
Samuel|reverb 30 50 70|agentvibes_soft_flamenco_loop.mp3|0.30
Orian|reverb 40 50 80|agent_vibes_ganawa_ambient_v2_loop.mp3|0.25
Ace|reverb 35 40 70 gain -1|upbeat_track.mp3|0.28
ConciergeBot|reverb 25 45 75|elegant_lounge.mp3|0.22
default|reverb 20 50 50|agent_vibes_ganawa_ambient_v2_loop.mp3|0.30
```

### 3. Configure SSH on Server

Add Android to `~/.ssh/config`:

```
Host android
    HostName <android-tailscale-ip>
    User u0_a484
    Port 8022
    IdentityFile ~/.ssh/android_key
```

### 4. Create Bot-Specific TTS Scripts

Example for Samuel (`/home/administrator/samuelClawdBot/local-gen-tts.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

ANDROID_HOST="android"
AGENT_NAME="Samuel"
TEXT="${1:-}"
VOICE="${2:-en_US-ryan-high}"

if [[ -z "$TEXT" ]]; then
    echo "Usage: $0 <text> [voice]" >&2
    exit 1
fi

echo "📱 Sending to Android as $AGENT_NAME..." >&2

# Encode for security
ENCODED_TEXT=$(printf '%s' "$TEXT" | base64 -w 0)
ENCODED_AGENT=$(printf '%s' "$AGENT_NAME" | base64 -w 0)

# Call AgentVibes SSH-remote provider
# Or direct SSH to receiver:
ssh "$ANDROID_HOST" "bash ~/.termux/agentvibes-play.sh '$ENCODED_TEXT' '$VOICE' '$ENCODED_AGENT'" &

echo "✓ Sent to Android" >&2
exit 0
```

### 5. Configure Clawdbot

Add to each bot's config (`.clawdbot/clawdbot.json`):

```json
{
  "tools": {
    "tts": {
      "command": "/home/administrator/samuelClawdBot/local-gen-tts.sh"
    }
  }
}
```

## Usage

### Direct Call

```bash
# From any Clawdbot instance
bash local-gen-tts.sh "Hello from Samuel!" "en_US-ryan-high"
```

### Via Clawdbot tts() Tool

```javascript
// Automatically uses configured TTS command
tts("Hello from Samuel!")
```

### Via AgentVibes Provider

```bash
# Using play-tts-ssh-remote.sh directly
cd ~/agentvibes
bash .claude/hooks/play-tts-ssh-remote.sh "Hello world" "en_US-lessac-medium" "Samuel"
```

## Testing

```bash
# Test receiver on Android
ssh android "bash ~/.termux/agentvibes-play.sh \
  '$(echo "Test from Samuel" | base64 -w 0)' \
  'en_US-ryan-high' \
  '$(echo "Samuel" | base64 -w 0)'"

# Should play with Samuel's configured effects and music
```

## Agent Configuration Reference

Each agent can have unique:

**SOX Effects:**
- `reverb <reverberance> <HF-damping> <room-scale>` - Adds space
- `pitch <cents>` - Adjust pitch (100 cents = 1 semitone)
- `equalizer <freq> <width>q <gain-dB>` - Frequency adjustment
- `gain <dB>` - Volume adjustment
- `compand` - Dynamic range compression

**Background Music:**
- Track file (relative to `.claude/audio/tracks/`)
- Volume (0.0-1.0, recommend 0.20-0.40)

## Troubleshooting

### "Receiver script not found"
```bash
ssh android "ls -la ~/.termux/agentvibes-play.sh"
# If missing, re-run termux installer
```

### "AgentVibes not found"
```bash
ssh android "ls -la ~/agentvibes/.claude/hooks/clawdbot-receiver.sh"
# Ensure AgentVibes is installed at ~/agentvibes
```

### "Failed to decode text"
```bash
# Verify base64 encoding:
echo "test" | base64 -w 0
# Should output: dGVzdA==
```

### Agent effects not applying
```bash
# Check audio-effects.cfg exists and has agent entry
ssh android "cat ~/agentvibes/.claude/config/audio-effects.cfg | grep Samuel"
```

## Version History

- **3.3.0-alpha.3:** Added Clawdbot SSH-remote agent support
- **3.3.0-alpha.2:** SSH-remote provider with base64 security
- **3.2.0:** SSH-remote provider initial release

## See Also

- [AgentVibes Documentation](https://agentvibes.org)
- [Clawdbot Documentation](https://docs.clawd.bot)
- [Audio Effects Configuration](../config/audio-effects.cfg.sample)
