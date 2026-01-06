# Termux SSH TTS Provider Setup Guide

## Overview

The `termux-ssh` provider allows AgentVibes to send TTS audio output to your Android device when you're connected from Termux via SSH. Instead of playing audio locally on your server/desktop, text is sent to your phone via SSH and spoken using Android's native TTS engine (`termux-tts-speak`).

### Why This Provider?

- **Solves PulseAudio issues**: PulseAudio tunneling doesn't work reliably on Android/Termux
- **Uses native Android TTS**: High-quality voices from Google TTS or other installed engines
- **Near-instant**: Only sends text, not audio files
- **No configuration overhead**: Works with standard SSH setup

## Prerequisites

### On Android Device (Termux)

1. **Install Termux** from F-Droid (NOT Google Play - it's outdated)
   ```bash
   # Download from: https://f-droid.org/en/packages/com.termux/
   ```

2. **Install required packages**:
   ```bash
   pkg update
   pkg install termux-api openssh
   ```

3. **Install Termux:API app** from F-Droid:
   ```bash
   # Download from: https://f-droid.org/en/packages/com.termux.api/
   ```

4. **Start SSH server**:
   ```bash
   # Generate SSH keys (first time only)
   ssh-keygen -t rsa -b 4096

   # Start SSH daemon
   sshd

   # Find your SSH port (usually 8022)
   cat $PREFIX/var/run/sshd.pid
   ```

5. **Get your device IP address**:
   ```bash
   # On same Wi-Fi network
   ifconfig wlan0 | grep "inet addr"

   # Or use Tailscale/ZeroTier for internet-wide access
   # Example: 100.115.27.58 (Tailscale IP)
   ```

### On Server/Desktop

1. **Copy SSH public key to Android**:
   ```bash
   # On your desktop/server
   ssh-copy-id -p 8022 u0_a###@<android-ip>

   # Replace:
   # - u0_a### with your Termux username (run 'whoami' in Termux)
   # - <android-ip> with your Android device IP
   ```

2. **Configure SSH host alias** in `~/.ssh/config`:
   ```ssh-config
   Host android
       HostName <your-android-ip>
       User <your-termux-username>
       Port 8022
       IdentityFile ~/.ssh/id_rsa
       ServerAliveInterval 60
       ServerAliveCountMax 3
   ```

   **Example**:
   ```ssh-config
   Host android
       HostName 100.115.27.58     # Tailscale IP
       User u0_a484                # From 'whoami' in Termux
       Port 8022
       IdentityFile ~/.ssh/id_ed25519
       ServerAliveInterval 60
   ```

3. **Test SSH connection**:
   ```bash
   ssh android "echo 'Connection successful!'"
   ```

## AgentVibes Configuration

### 1. Set SSH Host Alias

Choose ONE of these methods:

**Option A: Environment Variable** (Temporary)
```bash
export TERMUX_SSH_HOST="android"
```

**Option B: Global Config File** (Recommended)
```bash
echo "android" > ~/.claude/termux-ssh-host.txt
```

**Option C: Project-Specific**
```bash
echo "android" > /path/to/project/.claude/termux-ssh-host.txt
```

### 2. Switch to termux-ssh Provider

```bash
# Using slash command (in Claude Code)
/agent-vibes:provider switch termux-ssh

# Or manually
echo "termux-ssh" > ~/.claude/tts-provider.txt
```

### 3. Verify Setup

```bash
# List available providers (should include termux-ssh)
/agent-vibes:provider list

# Check active provider
/agent-vibes:provider get

# Test TTS
.claude/hooks/play-tts.sh "Testing Android TTS via SSH"
```

## Usage

Once configured, AgentVibes will automatically route TTS to your Android device:

```bash
# TTS plays on your Android phone, not the server
.claude/hooks/play-tts.sh "This will play on my Android device"
```

## Troubleshooting

### "Cannot connect to SSH host 'android'"

**Possible causes**:
1. SSH server not running on Android: `sshd` in Termux
2. Wrong IP/hostname in ~/.ssh/config
3. Firewall blocking port 8022
4. Android device not on same network (or no VPN connection)

**Debug**:
```bash
# Test SSH connection manually
ssh android "echo ok"

# Check SSH config
cat ~/.ssh/config | grep -A5 "Host android"

# Verify sshd is running on Android
ssh android "ps aux | grep sshd"
```

### "termux-tts-speak: command not found"

**Solution**:
```bash
# On Android (Termux)
pkg install termux-api

# Verify installation
which termux-tts-speak
```

### "Provider 'termux-ssh' not found"

**Solution**:
```bash
# Verify provider file exists
ls -la .claude/hooks/play-tts-termux-ssh.sh

# Check if executable
chmod +x .claude/hooks/play-tts-termux-ssh.sh

# List providers to confirm
/agent-vibes:provider list
```

### Audio plays but very slow/delayed

This is normal for the first invocation. Subsequent calls should be instant.

**Optimization**:
```bash
# Add ControlMaster to ~/.ssh/config for connection pooling
Host android
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 10m
```

## Advanced Configuration

### Using Tailscale for Internet-Wide Access

Tailscale creates a secure VPN so you can access your Android device from anywhere:

1. Install Tailscale on Android and server
2. Use Tailscale IP (100.x.x.x) in SSH config
3. Access your device from any network

### Multiple Android Devices

Configure different host aliases:

```ssh-config
Host android-phone
    HostName 100.115.27.58
    User u0_a484
    Port 8022

Host android-tablet
    HostName 100.115.27.59
    User u0_a485
    Port 8022
```

Then switch between them:
```bash
echo "android-tablet" > ~/.claude/termux-ssh-host.txt
```

### Custom TTS Voices

Android TTS voices are managed in Android Settings, not AgentVibes:

1. Open Android **Settings** → **Accessibility** → **Text-to-Speech**
2. Install additional voice engines from Play Store (e.g., Google TTS, eSpeak)
3. Select preferred engine and voice
4. AgentVibes will use the selected voice automatically

## Security Considerations

- **SSH Key Authentication**: Always use SSH keys, never passwords
- **Firewall**: Expose SSH port 8022 only on trusted networks
- **VPN Recommended**: Use Tailscale/ZeroTier instead of public IPs
- **No Sensitive Data**: Don't send sensitive information via TTS

## How It Works

```
┌──────────────┐              ┌──────────────┐
│   Desktop    │              │   Android    │
│   (Server)   │              │   (Termux)   │
└──────┬───────┘              └───────┬──────┘
       │                               │
       │  1. User runs command         │
       │  .claude/hooks/play-tts.sh    │
       │                               │
       │  2. Route to termux-ssh       │
       │     provider                  │
       │                               │
       │  3. SSH to Android            │
       ├──────────────────────────────>│
       │  ssh android "termux-tts-     │
       │  speak 'text'"                │
       │                               │
       │                               │  4. Android TTS
       │                               │     speaks text
       │                               │     🔊
       │                               │
       │  5. Returns immediately       │
       │<──────────────────────────────┤
       │                               │
       └───────────────────────────────┘
```

## Limitations

- **Requires SSH connection**: Must be reachable via network
- **No audio file output**: Provider outputs to remote device only
- **Language support**: Limited to Android TTS engine capabilities
- **Network latency**: Adds ~100-500ms depending on connection

## See Also

- [Provider Management](../commands/agent-vibes/provider.md)
- [Voice Configuration](../commands/agent-vibes/voice.md)
- [SSH Configuration Guide](https://www.ssh.com/academy/ssh/config)
- [Termux Wiki](https://wiki.termux.com/)
