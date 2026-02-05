# AgentVibes Clawdbot Skill - local-gen-tts Integration

**Version:** 1.0.0  
**Author:** Paul Preibisch  
**Repository:** https://github.com/paulpreibisch/AgentVibes  
**License:** Apache-2.0

## Overview

Automatically integrates AgentVibes with Clawdbot for local TTS generation on remote devices (Android/Termux, Linux, macOS) via SSH.

### What This Does

- ✅ **Automatic TTS** - Every Clawdbot response speaks via AgentVibes
- ✅ **Remote Generation** - Text sent to Android/device, audio generated locally
- ✅ **Full Features** - Voice effects, reverb, background music
- ✅ **Low Bandwidth** - Only text sent over SSH (~1-5 KB)
- ✅ **Secure** - SSH key authentication, Tailscale VPN

## Prerequisites

### On Server (Clawdbot)
- Clawdbot installed and running
- SSH access to remote device
- Workspace directory (e.g., `~/clawd`)

### On Remote Device (Android/Linux/macOS)
- SSH server running (`sshd`)
- Node.js installed (for auto-install of AgentVibes)
- Tailscale (optional but recommended)

**Note:** AgentVibes is automatically installed on both server and remote device during setup.

## Installation

### Prerequisites First: SSH Setup ⚠️

**Before running the skill setup, you MUST set up SSH to your remote device:**

1. **Generate SSH key** (if you don't have one):
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ''
```

2. **Copy key to remote device**:
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@remote-ip
```

3. **Test SSH connection** (without password):
```bash
ssh android "echo Connected"
# Should print: Connected
```

4. **Add to ~/.ssh/config** (optional but recommended):
```
Host android
    HostName your-device-ip
    User your-username
    Port 22
```

Once SSH works, proceed to installation.

### Quick Setup

Run the installer script:

```bash
npx agentvibes install-clawdbot-skill
```

### Manual Setup

1. **Run the setup script** (AgentVibes auto-installs on both server and remote device):
```bash
cd ~/.npm-global/lib/node_modules/agentvibes

# Set your Clawdbot workspace
export CLAWDBOT_WORKSPACE=~/clawd

# Set SSH remote host (optional, defaults to 'android')
export AGENTVIBES_SSH_HOST=android

# Run setup - AgentVibes will be auto-installed if needed
bash skills/clawdbot/setup.sh
```

The setup script will:
- ✅ Install AgentVibes on the server (if not present)
- ✅ Create TTS hooks and scripts
- ✅ SSH to your remote device and auto-install AgentVibes there
- ✅ Configure all necessary files and permissions

## What Gets Installed

### 1. TTS Hook (`<workspace>/.claude/hooks/play-tts.sh`)

Automatically called by Clawdbot for every TTS response:

```bash
#!/usr/bin/env bash
# AgentVibes Clawdbot TTS Hook
TEXT="${1:-}"
VOICE="${2:-en_US-kristin-medium}"
[[ -z "$TEXT" ]] && exit 0
bash "$WORKSPACE/local-gen-tts.sh" "$TEXT" "$VOICE" &
exit 0
```

### 2. Local Gen Script (`<workspace>/local-gen-tts.sh`)

Sends text to remote device for local AgentVibes generation:

```bash
#!/usr/bin/env bash
# AgentVibes local-gen-tts
ANDROID_HOST="android"
TEXT="${1:-}"
VOICE="${2:-en_US-kristin-medium}"

ssh "$ANDROID_HOST" "bash ~/.termux/agentvibes-play.sh '$TEXT' '$VOICE'" &
```

### 3. Remote Receiver (`~/.termux/agentvibes-play.sh`)

Installed on Android/remote device:

```bash
#!/usr/bin/env bash
# AgentVibes SSH Receiver
TEXT="$1"
VOICE="${2:-en_US-ryan-high}"
export AGENTVIBES_NO_REMINDERS=1
export AGENTVIBES_RDP_MODE=false

AGENTVIBES_ROOT="/data/data/com.termux/files/usr/lib/node_modules/agentvibes"
bash "$AGENTVIBES_ROOT/.claude/hooks/play-tts.sh" "$TEXT" "$VOICE"
```

### 4. Config Files (`<workspace>/.claude/`)

- `tts-provider.txt` → `piper`
- `tts-voice.txt` → Voice name (e.g., `en_US-kristin-medium`)
- `ssh-remote-host.txt` → SSH hostname (e.g., `android`)

## Configuration

### Voices

**Female voices:**
- `en_US-kristin-medium` - Professional, neutral (recommended)
- `en_US-lessac-medium` - Warm, expressive
- `en_US-amy-medium` - Friendly, conversational
- `en_US-libritts-high` - Clear, high quality

**Male voices:**
- `en_US-ryan-high` - Energetic, clear (recommended)
- `en_US-joe-medium` - Casual
- `en_US-bryce-medium` - Professional

### Audio Effects (Optional)

Configure on remote device:

```bash
# On Android/remote
nano ~/.local/share/agentvibes/.claude/config/audio-effects.cfg
```

Add:
```
# Voice|Reverb|Music|Volume
en_US-kristin-medium|reverb 50 50 90|agentvibes_soft_flamenco_loop.mp3|0.10
en_US-ryan-high|reverb 50 50 90|agent_vibes_bachata_v1_loop.mp3|0.10
```

### SSH Setup

Add to `~/.ssh/config`:

```
Host android
    HostName 100.115.27.58  # Tailscale IP
    User u0_a484
    Port 52847
    IdentityFile ~/.ssh/android_key
```

## Usage

Once installed, **it's completely automatic**:

```
You: "Hello Clawdbot"
Clawdbot: "Hello!"
→ Automatically plays on Android with voice + effects
```

No manual commands needed!

## Architecture

```
┌─────────────────────────────────────┐
│ Clawdbot (Server)                   │
│ ├─ Generates text response          │
│ ├─ Calls .claude/hooks/play-tts.sh │
│ ├─ Calls local-gen-tts.sh          │
│ └─ Sends TEXT via SSH              │
└─────────────────────────────────────┘
              ↓ SSH/Tailscale
┌─────────────────────────────────────┐
│ Android/Remote Device               │
│ ├─ Receives text                    │
│ ├─ AgentVibes (Piper TTS)          │
│ ├─ Generates audio locally          │
│ ├─ Applies reverb + music           │
│ └─ Plays on speakers                │
└─────────────────────────────────────┘
```

## Multiple Instances

For multiple Clawdbot instances (e.g., Orian + Samuel):

```bash
# Orian (workspace: ~/clawd)
export CLAWDBOT_WORKSPACE=~/clawd
export AGENTVIBES_VOICE=en_US-kristin-medium
bash skills/clawdbot/setup.sh

# Samuel (workspace: ~/clawd2)
export CLAWDBOT_WORKSPACE=~/clawd2
export AGENTVIBES_VOICE=en_US-ryan-high
bash skills/clawdbot/setup.sh
```

Each instance can have:
- Different voice
- Different background music
- Different audio effects

## Troubleshooting

### No audio on remote device

```bash
# Check SSH connection
ssh android "echo 'Connected'"

# Test receiver directly
ssh android "bash ~/.termux/agentvibes-play.sh 'Test' 'en_US-kristin-medium'"
```

### TTS not triggering automatically

```bash
# Check hook exists
ls -la $CLAWDBOT_WORKSPACE/.claude/hooks/play-tts.sh

# Check provider set
cat $CLAWDBOT_WORKSPACE/.claude/tts-provider.txt
# Should output: piper
```

### Wrong voice playing

```bash
# Check voice config
cat $CLAWDBOT_WORKSPACE/.claude/tts-voice.txt

# Update voice
echo "en_US-kristin-medium" > $CLAWDBOT_WORKSPACE/.claude/tts-voice.txt
```

## Uninstall

```bash
# Remove TTS integration
rm -rf $CLAWDBOT_WORKSPACE/.claude/hooks
rm $CLAWDBOT_WORKSPACE/.claude/tts-provider.txt
rm $CLAWDBOT_WORKSPACE/.claude/tts-voice.txt
rm $CLAWDBOT_WORKSPACE/local-gen-tts.sh

# On remote device
ssh android "rm ~/.termux/agentvibes-play.sh"
```

## Security

- ✅ SSH key-only authentication (no passwords)
- ✅ Text-only transmission (no executable code)
- ✅ Tailscale VPN recommended
- ✅ Configurable SSH port (use non-standard)

## Performance

- **Latency:** ~5-8 seconds (text → audio → playback)
- **Bandwidth:** ~1-5 KB per message (text only)
- **Quality:** Full neural TTS with effects
- **Reliability:** Background execution, non-blocking

## Examples

### Basic Setup (Orian)

```bash
# 1. Install on server
cd ~/.npm-global/lib/node_modules/agentvibes
CLAWDBOT_WORKSPACE=~/clawd AGENTVIBES_SSH_HOST=android bash skills/clawdbot/setup.sh

# 2. Install receiver on Android
ssh android "curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/scripts/install-ssh-receiver.sh | bash"

# 3. Done! Send a message to Clawdbot
```

### Advanced Setup (Multiple Instances with Different Music)

```bash
# Orian - Kristin + Flamenco
CLAWDBOT_WORKSPACE=~/clawd \
AGENTVIBES_VOICE=en_US-kristin-medium \
AGENTVIBES_MUSIC=agentvibes_soft_flamenco_loop.mp3 \
bash skills/clawdbot/setup.sh

# Samuel - Ryan + Bachata
CLAWDBOT_WORKSPACE=~/clawd2 \
AGENTVIBES_VOICE=en_US-ryan-high \
AGENTVIBES_MUSIC=agent_vibes_bachata_v1_loop.mp3 \
bash skills/clawdbot/setup.sh
```

## Support the Project

⭐ **Love AgentVibes?** Star the repository to support the project:
👉 https://github.com/paulpreibisch/AgentVibes

Your star helps other developers discover this project!

## Contributing

Found a bug or have a suggestion? Open an issue:
https://github.com/paulpreibisch/AgentVibes/issues

## License

Apache-2.0 - See LICENSE file

## Credits

- **AgentVibes:** Paul Preibisch
- **Clawdbot Integration:** Developed with Claude AI
- **Piper TTS:** Rhasspy/Home Assistant

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-30  
**Status:** Production Ready ✅
