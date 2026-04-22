# SSH Audio Tunnel Setup Guide

## Overview

This guide explains how to forward audio from a remote server back to your local machine over SSH, using PulseAudio and a reverse tunnel. This is useful when running AgentVibes (or any TTS/audio application) on a remote server and wanting to hear audio on your local speakers.

## Common Problem

A misconfigured SSH tunnel can prevent audio from reaching your local machine:
- **Incorrect config**: `RemoteForward 14713 localhost:4713` (wrong local port)
- **Correct config**: `RemoteForward 14713 localhost:14713` (matching ports)
- **Result of mismatch**: PulseAudio cannot establish a connection

## Configuration

### 1. Local Machine (WSL2 on Windows)

#### SSH Config
- **Files**: `~/.ssh/config` (WSL) and `C:\Users\<your-windows-user>\.ssh\config` (Windows)
- **Required entry**:
  ```
  Host <remote-server>
      HostName <remote-server-address>
      RemoteForward 14713 localhost:14713
  ```

#### PulseAudio Config
- **File**: `~/.config/pulse/client.conf`
- **Required setting**: `default-server = tcp:localhost:14713`

#### Shell Environment
- **Files**: `~/.bashrc` and/or `~/.zshrc`
- **Required export**: `export PULSE_SERVER=tcp:localhost:14713`

#### Socat Bridge (WSL2 only)
- **Purpose**: Bridges TCP connections to the WSLg PulseAudio Unix socket
- **Command**: `socat TCP-LISTEN:14713,fork,reuseaddr UNIX-CONNECT:/mnt/wslg/PulseServer`
- **Tip**: Add this to your shell rc file so it starts automatically

### 2. Remote Server

#### Setup Script
Create a setup script on the remote server that:
1. Installs PulseAudio (if not present)
2. Loads the `module-native-protocol-tcp` module to accept TCP connections on localhost
3. Sets `PULSE_SERVER=tcp:localhost:14713` in the shell environment

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Remote Server                                                  │
│  ┌──────────────────────────────────────────┐                  │
│  │ PulseAudio Server                        │                  │
│  │ Listening on: tcp:localhost:4713          │                  │
│  │ (native-protocol-tcp module)             │                  │
│  └────────────────┬─────────────────────────┘                  │
│                   │                                             │
│                   │ Connection to                               │
│                   │ tcp:localhost:14713                         │
│                   │ (via PULSE_SERVER env)                      │
│                   │                                             │
│                   ▼                                             │
│  ┌──────────────────────────────────────────┐                  │
│  │ SSH Reverse Tunnel                       │                  │
│  │ RemoteForward 14713 localhost:14713      │                  │
│  └────────────────┬─────────────────────────┘                  │
│                   │                                             │
│                   │ Encrypted SSH Tunnel                        │
│                   │                                             │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Local Machine (WSL2)                                           │
│  ┌──────────────────────────────────────────┐                  │
│  │ Socat Bridge                             │                  │
│  │ TCP:localhost:14713 → Unix Socket        │                  │
│  └────────────────┬─────────────────────────┘                  │
│                   │                                             │
│                   ▼                                             │
│  ┌──────────────────────────────────────────┐                  │
│  │ WSLg PulseAudio                          │                  │
│  │ /mnt/wslg/PulseServer                    │                  │
│  └────────────────┬─────────────────────────┘                  │
│                   │                                             │
│                   ▼                                             │
│              Windows Audio                                      │
│              (Your Speakers)                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Setup Steps

### Step 1: Configure Your Local Environment

Reload your shell configuration:
```bash
source ~/.bashrc  # or source ~/.zshrc if using zsh
```

Verify socat is running:
```bash
ps aux | grep socat
# Should show: socat TCP-LISTEN:14713,fork,reuseaddr UNIX-CONNECT:/mnt/wslg/PulseServer
```

If socat is not running, start it:
```bash
socat TCP-LISTEN:14713,fork,reuseaddr UNIX-CONNECT:/mnt/wslg/PulseServer > /dev/null 2>&1 &
```

### Step 2: Copy Setup Script to Remote Server

```bash
scp setup-remote-audio.sh <remote-server>:~/
```

### Step 3: SSH to Remote Server and Run Setup

```bash
ssh <remote-server>
bash ~/setup-remote-audio.sh
source ~/.bashrc  # or source ~/.zshrc
```

### Step 4: Test the Connection

While connected via SSH to the remote server:

```bash
# 1. Verify PulseAudio is running
pactl info

# Expected output should show:
# Server String: tcp:localhost:14713
# Default Sink: <something>
# Default Source: <something>

# 2. Test with speaker-test
speaker-test -t sine -f 1000 -l 1

# 3. If you have a sound file
paplay /usr/share/sounds/alsa/Front_Center.wav

# 4. If AgentVibes is installed
.claude/hooks/play-tts.sh "Testing remote audio tunnel"
```

### Step 5: Troubleshooting

If audio does not work:

1. **Check SSH tunnel:**
   ```bash
   # On remote server
   ss -tlnp | grep :14713
   # Should show listening socket
   ```

2. **Check local socat:**
   ```bash
   # On WSL2
   ps aux | grep socat
   # Should be running
   ```

3. **Check PulseAudio on remote:**
   ```bash
   # On remote server
   pulseaudio --check && echo "Running" || echo "Not running"
   ```

4. **Restart everything:**
   ```bash
   # On remote server
   pulseaudio --kill
   pulseaudio --start --exit-idle-time=-1

   # Disconnect and reconnect SSH
   exit
   ssh <remote-server>
   ```

## Important Notes

- **Firewall**: Ports 14713 and 4713 are only accessed via localhost/SSH tunnel -- no external firewall rules needed
- **Security**: All audio data travels through the encrypted SSH tunnel
- **Persistence**: Shell rc and SSH config changes persist across reboots
- **Windows firewall**: No inbound exceptions needed since traffic stays on localhost

## Quick Reference

**Key Files to Configure:**
- `~/.ssh/config` (WSL or Linux)
- `C:\Users\<your-windows-user>\.ssh\config` (Windows, if applicable)
- `~/.config/pulse/client.conf`
- `~/.bashrc` / `~/.zshrc`

**Key Commands:**
```bash
# Check PulseAudio status
pactl info

# Check SSH tunnel
ss -tlnp | grep :14713

# Test audio
speaker-test -t sine -f 1000 -l 1

# Restart PulseAudio
pulseaudio --kill && pulseaudio --start --exit-idle-time=-1

# Restart socat (if needed)
pkill socat
socat TCP-LISTEN:14713,fork,reuseaddr UNIX-CONNECT:/mnt/wslg/PulseServer > /dev/null 2>&1 &
```

## Success Indicators

You will know it is working when:
1. `pactl info` on the remote server shows `Server String: tcp:localhost:14713`
2. `speaker-test` plays sound on your local speakers
3. AgentVibes TTS plays through your local speakers
4. No "Connection refused" or "Connection terminated" errors
