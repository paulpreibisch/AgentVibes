# Audio Tunnel Configuration Fix Summary

## Problem Identified

Your SSH tunnel was configured incorrectly:
- **Old config**: `RemoteForward 14713 localhost:4713`
- **Issue**: Forwarding to port 4713 (wrong port)
- **Result**: PulseAudio couldn't establish connection

## Changes Made

### 1. WSL2 (Local Windows Machine) ✅

#### SSH Config Updated
- **File**: `~/.ssh/config` (WSL) and `C:\Users\Paul\.ssh\config` (Windows)
- **Change**: `RemoteForward 14713 localhost:4713` → `RemoteForward 14713 localhost:14713`

#### PulseAudio Config Updated
- **File**: `~/.config/pulse/client.conf`
- **Change**: `tcp:localhost:4713` → `tcp:localhost:14713`

#### Shell Environment Updated
- **Files**: `~/.bashrc` and `~/.zshrc`
- **Change**: `export PULSE_SERVER=tcp:fire-den-laptop-3000:14713` → `export PULSE_SERVER=tcp:localhost:14713`

#### Socat Bridge
- **Status**: Already configured ✅
- **Command**: `socat TCP-LISTEN:14713,fork,reuseaddr UNIX-CONNECT:/mnt/wslg/PulseServer`
- **Autostart**: Configured in both .bashrc and .zshrc

### 2. Remote Server (ubuntu-rdp)

#### Setup Script Created
- **Location**: `/home/fire/claude/AgentVibes/setup-ubuntu-rdp-audio.sh`
- **Purpose**: Configures PulseAudio on remote server to accept TCP connections on localhost

## How It Works Now

```
┌─────────────────────────────────────────────────────────────────┐
│                        Architecture                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Remote Server (ubuntu-rdp)                                    │
│  ┌──────────────────────────────────────────┐                 │
│  │ PulseAudio Server                        │                 │
│  │ Listening on: tcp:localhost:4713         │                 │
│  │ (native-protocol-tcp module)             │                 │
│  └────────────────┬─────────────────────────┘                 │
│                   │                                            │
│                   │ Connection to                              │
│                   │ tcp:localhost:14713                        │
│                   │ (via PULSE_SERVER env)                     │
│                   │                                            │
│                   ▼                                            │
│  ┌──────────────────────────────────────────┐                 │
│  │ SSH Reverse Tunnel                       │                 │
│  │ RemoteForward 14713 localhost:14713      │                 │
│  └────────────────┬─────────────────────────┘                 │
│                   │                                            │
│                   │ Encrypted SSH Tunnel                       │
│                   │                                            │
└───────────────────┼────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Windows Machine (WSL2)                                        │
│  ┌──────────────────────────────────────────┐                 │
│  │ Socat Bridge                             │                 │
│  │ TCP:localhost:14713 → Unix Socket        │                 │
│  └────────────────┬─────────────────────────┘                 │
│                   │                                            │
│                   ▼                                            │
│  ┌──────────────────────────────────────────┐                 │
│  │ WSLg PulseAudio                          │                 │
│  │ /mnt/wslg/PulseServer                    │                 │
│  └────────────────┬─────────────────────────┘                 │
│                   │                                            │
│                   ▼                                            │
│              Windows Audio                                     │
│              (Your Speakers)                                   │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Instructions

### Step 1: Update Your Local Environment

Reload your shell configuration:
```bash
source ~/.bashrc  # or source ~/.zshrc if using zsh
```

Verify socat is running:
```bash
ps aux | grep socat
# Should show: socat TCP-LISTEN:14713,fork,reuseaddr UNIX-CONNECT:/mnt/wslg/PulseServer
```

If socat isn't running, start it:
```bash
socat TCP-LISTEN:14713,fork,reuseaddr UNIX-CONNECT:/mnt/wslg/PulseServer > /dev/null 2>&1 &
```

### Step 2: Copy Setup Script to Remote Server

```bash
scp /home/fire/claude/AgentVibes/setup-ubuntu-rdp-audio.sh ubuntu-rdp:~/
```

### Step 3: SSH to Remote Server and Run Setup

```bash
ssh ubuntu-rdp
bash ~/setup-ubuntu-rdp-audio.sh
source ~/.bashrc  # or source ~/.zshrc
```

### Step 4: Test the Connection

While connected via SSH to ubuntu-rdp:

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
.claude/hooks/play-tts.sh "Testing remote audio from ubuntu-rdp"
```

### Step 5: Troubleshooting

If audio doesn't work:

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
   ssh ubuntu-rdp
   ```

## Important Notes

- **Firewall**: Ports 14713 and 4713 are only accessed via localhost/SSH tunnel, no external access needed
- **Security**: All audio data travels through encrypted SSH tunnel
- **Persistence**: All configuration is saved and will persist across reboots
- **Kaspersky**: You can actually close the firewall exceptions for 14713 and 4713 since they're only localhost connections now

## Quick Reference

**Key Files Modified:**
- `/home/fire/.ssh/config` (WSL)
- `/mnt/c/Users/Paul/.ssh/config` (Windows)
- `/home/fire/.config/pulse/client.conf`
- `/home/fire/.bashrc`
- `/home/fire/.zshrc`

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

You'll know it's working when:
1. ✅ `pactl info` on remote shows `Server String: tcp:localhost:14713`
2. ✅ `speaker-test` plays sound on your Windows speakers
3. ✅ AgentVibes TTS plays through your Windows speakers
4. ✅ No "Connection refused" or "Connection terminated" errors

---

*Generated by Claude Code on 2025-10-15*
