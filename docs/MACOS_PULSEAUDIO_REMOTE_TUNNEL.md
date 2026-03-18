# macOS to Windows WSL PulseAudio Tunnel Guide

**Last Updated**: 2025-11-30
**Purpose**: Test macOS functionality when you don't have a Mac

---

## Why This Guide Exists

**Problem**: You need to test macOS-specific features (like the `say` command, macOS voices, or AgentVibes macOS provider) but you don't own a Mac.

**Solution**: Rent a cheap cloud Mac and tunnel audio back to your Windows machine!

We successfully used [Scaleway Console](https://console.scaleway.com) to rent affordable Mac instances for testing. This guide documents how to set up audio tunneling so you can hear TTS output from the cloud Mac on your local Windows speakers.

---

## Overview

This guide documents our working setup where:
- You SSH into a cloud macOS machine (e.g., Scaleway Mac) from Windows WSL
- Audio generated on macOS plays through your Windows speakers
- Claude/AgentVibes TTS on Mac is heard on Windows
- You can fully test macOS functionality without owning a Mac

**Architecture**:
```
┌─────────────────┐         SSH Tunnel          ┌─────────────────┐
│  Windows WSL    │ ─────────────────────────── │  Remote macOS   │
│  (You are here) │   RemoteForward 14714       │  (SSH target)   │
│                 │                              │                 │
│ PulseAudio      │◄────────────────────────────│  paplay sends   │
│ Server :14714   │     Audio streams back      │  audio to WSL   │
│                 │                              │                 │
│ 🔊 Speakers     │                              │  say → paplay   │
└─────────────────┘                              └─────────────────┘
```

**How it works**:
1. Windows WSL runs PulseAudio server on port 14714
2. SSH RemoteForward makes WSL's port 14714 available as `localhost:14714` on Mac
3. macOS uses `paplay` to send audio through the tunnel
4. Audio plays on Windows speakers

---

## Part 1: Windows WSL Setup

### Step 1: Ensure PulseAudio is Running

PulseAudio should already be running in WSL. Verify:

```bash
# Check PulseAudio status
pactl info

# If not running, start it
pulseaudio --start

# Verify it's listening on TCP
ss -tlnp | grep 14714
```

### Step 2: Configure SSH for macOS Connection

Edit `~/.ssh/config`:

```bash
nano ~/.ssh/config
```

Add the macOS host configuration:

```
Host macos
  HostName YOUR_MAC_IP_OR_HOSTNAME
  User YOUR_MAC_USERNAME
  IdentityFile ~/.ssh/id_rsa
  Port 22
  # This is the key line - forwards WSL's PulseAudio to Mac
  RemoteForward 14714 localhost:14714
  ServerAliveInterval 30
  ServerAliveCountMax 3
  # SSH multiplexing - allows multiple sessions to share one tunnel
  ControlMaster auto
  ControlPath ~/.ssh/sockets/%r@%h-%p
  ControlPersist 600
```

Create the sockets directory:

```bash
mkdir -p ~/.ssh/sockets
chmod 700 ~/.ssh/sockets
```

**Key configuration explained**:
- `RemoteForward 14714 localhost:14714`: Makes WSL's port 14714 available on Mac as localhost:14714
- `ControlMaster auto`: First connection becomes the master, subsequent connections share it
- `ControlPersist 600`: Keep tunnel alive for 10 minutes after last session closes

### Step 3: Copy PulseAudio Cookie to Mac

The Mac needs your WSL PulseAudio cookie for authentication:

```bash
# Copy cookie to Mac
scp ~/.config/pulse/cookie macos:~/.config/pulse/cookie_wsl
```

---

## Part 2: macOS Setup

### Step 1: Install PulseAudio Client Tools

On macOS, install PulseAudio via Homebrew:

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PulseAudio
brew install pulseaudio

# Verify paplay is available
/opt/homebrew/bin/paplay --version
```

### Step 2: Set Up SSH Audio Greeting

This script plays an audio greeting when you SSH in, confirming the tunnel works.

Create `~/macos-ssh-audio-greeting.zsh` on the Mac:

```zsh
# macOS SSH Audio Greeting for ZSH
# Add to ~/.zshrc on your Mac: source ~/macos-ssh-audio-greeting.zsh

# Always set PulseAudio environment for SSH sessions
if [[ -n "$SSH_CONNECTION" ]]; then
    export PULSE_SERVER=tcp:localhost:14714
    export PULSE_COOKIE_FILE=~/.config/pulse/cookie_wsl
fi

# Only play greeting for interactive sessions
if [[ -n "$SSH_CONNECTION" && -o interactive ]]; then
    # Run audio test in background so login isn't delayed
    (
        # Check if PulseAudio connection works
        if /opt/homebrew/bin/pactl info > /dev/null 2>&1; then
            TEMP_AUDIO="/tmp/ssh_greeting_$$.aiff"
            say -o "$TEMP_AUDIO" "Connected to Mac OS." 2>/dev/null
            if [[ -f "$TEMP_AUDIO" ]]; then
                /opt/homebrew/bin/paplay "$TEMP_AUDIO" 2>/dev/null
                rm -f "$TEMP_AUDIO"
            fi
        else
            echo "[AgentVibes] Audio tunnel not connected (port 14714)" >&2
        fi
    ) &!
fi
```

Add to `~/.zshrc`:

```bash
echo "" >> ~/.zshrc
echo "# AgentVibes SSH audio greeting" >> ~/.zshrc
echo "source ~/macos-ssh-audio-greeting.zsh" >> ~/.zshrc
```

### Step 3: Create Audio Test Script

Create `~/test-macos-audio.sh` on the Mac:

```bash
#!/bin/bash
echo "=========================================="
echo "Mac → Windows PulseAudio Tunnel Test"
echo "=========================================="
echo ""

export PULSE_SERVER=tcp:localhost:14714
export PULSE_COOKIE_FILE=~/.config/pulse/cookie_wsl

echo "[1/2] Testing connection to Windows PulseAudio..."
if /opt/homebrew/bin/pactl info > /dev/null 2>&1; then
    echo "✓ Connected to Windows PulseAudio!"
    /opt/homebrew/bin/pactl info | grep -E "Server Name|Default Sink"
else
    echo "✗ Cannot connect to Windows PulseAudio"
    exit 1
fi

echo ""
echo "[2/2] Playing audio through Windows speakers..."
TEMP_AUDIO="/tmp/windows_audio_test.aiff"

say -o "$TEMP_AUDIO" "Success! You are hearing this from the Mac, playing on Windows speakers."

if [ ! -f "$TEMP_AUDIO" ]; then
    echo "✗ Failed to generate audio"
    exit 1
fi

echo "  Generated audio file"
echo "  Sending to Windows speakers..."
/opt/homebrew/bin/paplay "$TEMP_AUDIO"
RESULT=$?

rm -f "$TEMP_AUDIO"

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "✓ Audio sent successfully!"
    echo ""
    echo "🎵 Did you hear the audio on your WINDOWS speakers?"
else
    echo "✗ Failed to play audio (error $RESULT)"
fi

exit $RESULT
```

Make it executable:

```bash
chmod +x ~/test-macos-audio.sh
```

---

## Part 3: AgentVibes Integration

### Automatic PulseAudio Detection in play-tts-macos.sh

The AgentVibes `play-tts-macos.sh` script automatically detects SSH sessions and uses `paplay` instead of `afplay`:

```bash
# Play audio in background (skip if in test mode)
if [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]]; then
  # Check if we're in an SSH session with PulseAudio tunnel available
  if [[ -n "$SSH_CONNECTION" ]] && [[ -n "$PULSE_SERVER" ]]; then
    # Use paplay to send audio through PulseAudio tunnel to remote machine
    if command -v /opt/homebrew/bin/paplay &> /dev/null; then
      /opt/homebrew/bin/paplay "$TEMP_FILE" >/dev/null 2>&1 &
      PLAYER_PID=$!
      echo "🔊 Playing via PulseAudio tunnel"
    else
      echo "⚠️  paplay not found - install pulseaudio for SSH audio"
      afplay "$TEMP_FILE" >/dev/null 2>&1 &
      PLAYER_PID=$!
    fi
  else
    # Local session - use native macOS player
    afplay "$TEMP_FILE" >/dev/null 2>&1 &
    PLAYER_PID=$!
  fi
fi
```

**How it works**:
- Checks for `$SSH_CONNECTION` (set by SSH) and `$PULSE_SERVER` (set by greeting script)
- If both present, uses `/opt/homebrew/bin/paplay` to send audio through tunnel
- If local session, uses native `afplay`

---

## Part 4: Testing & Usage

### Connect to macOS

From Windows WSL:

```bash
ssh macos
```

You should hear "Connected to Mac OS" through your Windows speakers.

### Manual Audio Test

On macOS (via SSH):

```bash
~/test-macos-audio.sh
```

### Test Claude/AgentVibes TTS

On macOS (via SSH), in a Claude project:

```bash
.claude/hooks/play-tts.sh "Testing audio from Mac to Windows"
```

You should see:
```
🔊 Playing via PulseAudio tunnel
🎵 Saved to: /path/to/audio.aiff
🎤 Voice used: Samantha (macOS Say)
```

And hear the audio on Windows!

---

## Troubleshooting

### "Warning: remote port forwarding failed for listen port 14714"

**Cause**: Another SSH session already has the port forwarded.

**Solution**: Kill stale sessions or use SSH multiplexing (already configured above).

```bash
# On Mac, check what's using the port
lsof -i :14714

# Kill the process if it's a stale SSH session
kill <PID>
```

### No Audio Heard

1. **Check PulseAudio is running on WSL**:
   ```bash
   pactl info
   ```

2. **Check tunnel is active** (on Mac):
   ```bash
   export PULSE_SERVER=tcp:localhost:14714
   export PULSE_COOKIE_FILE=~/.config/pulse/cookie_wsl
   /opt/homebrew/bin/pactl info
   ```

3. **Verify cookie exists**:
   ```bash
   ls -la ~/.config/pulse/cookie_wsl
   ```

### "Connection refused" on pactl

The SSH tunnel isn't forwarding properly. Reconnect:

```bash
# From WSL, kill existing connections
pkill -f "ssh.*macos"

# Reconnect
ssh macos
```

### Audio Plays Locally on Mac Instead of Windows

The `PULSE_SERVER` environment variable isn't set. Check your `~/.zshrc` sources the greeting script:

```bash
grep "macos-ssh-audio-greeting" ~/.zshrc
```

---

## Quick Reference

### Environment Variables (Set Automatically by Greeting Script)

```bash
export PULSE_SERVER=tcp:localhost:14714
export PULSE_COOKIE_FILE=~/.config/pulse/cookie_wsl
```

### Key Files

| Location | File | Purpose |
|----------|------|---------|
| WSL | `~/.ssh/config` | SSH tunnel configuration |
| WSL | `~/.config/pulse/cookie` | PulseAudio authentication |
| Mac | `~/.config/pulse/cookie_wsl` | Copy of WSL cookie |
| Mac | `~/macos-ssh-audio-greeting.zsh` | SSH login audio greeting |
| Mac | `~/test-macos-audio.sh` | Manual audio test script |
| Mac | `.claude/hooks/play-tts-macos.sh` | AgentVibes TTS with tunnel support |

### Commands

```bash
# Connect to Mac (tunnel auto-establishes)
ssh macos

# Test audio manually
~/test-macos-audio.sh

# Check tunnel status (on Mac)
lsof -i :14714

# Check PulseAudio connection (on Mac)
/opt/homebrew/bin/pactl info
```

---

## Summary

This setup allows you to:
1. SSH into macOS from Windows WSL
2. Hear an audio greeting confirming the tunnel works
3. Use Claude/AgentVibes with TTS that plays on Windows speakers
4. Run multiple SSH sessions sharing one tunnel (via ControlMaster)

The key insight is that we **reverse** the typical PulseAudio network setup:
- Windows WSL is the PulseAudio **server** (has speakers)
- macOS is the PulseAudio **client** (sends audio via `paplay`)
- SSH RemoteForward makes the connection possible
