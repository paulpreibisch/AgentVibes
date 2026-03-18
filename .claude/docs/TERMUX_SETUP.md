# Termux SSH TTS Provider Setup Guide

## Overview

The `termux-ssh` provider allows AgentVibes to send TTS audio output to your Android device when you're connected from Termux via SSH. Instead of playing audio locally on your server/desktop, text is sent to your phone via SSH and spoken using Android's native TTS engine (`termux-tts-speak`).

**Use Case:** You're working on a remote server (VPS, cloud instance, home server) and want to hear AgentVibes TTS on your Android phone instead of the server's speakers.

### Why This Provider?

- **Solves PulseAudio issues**: PulseAudio tunneling doesn't work reliably on Android/Termux
- **Uses native Android TTS**: High-quality voices from Google TTS or other installed engines
- **Near-instant**: Only sends text, not audio files
- **Works from anywhere**: With Tailscale, access your Android from any network
- **No configuration overhead**: Works with standard SSH setup

## Prerequisites

> **💡 Tip:** Install Tailscale first (see [Advanced Configuration](#using-tailscale-for-internet-wide-access-recommended)) for the best experience. It allows you to access your Android device from anywhere, not just your local WiFi.

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

   **Option A: Tailscale IP (Recommended)**
   ```bash
   # After installing Tailscale (see Advanced Configuration)
   tailscale ip -4
   # Example: 100.100.100.100
   ```

   **Option B: Local WiFi IP (Same Network Only)**
   ```bash
   # Only works when both devices are on the same WiFi
   ifconfig wlan0 | grep "inet addr"
   # Example: 192.168.1.100
   ```

   > ⚠️ **Local WiFi IPs only work on the same network.** Use Tailscale for reliable access from anywhere.

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
       HostName 100.100.100.100    # Tailscale IP
       User u0_a123                # From 'whoami' in Termux
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

### Using Tailscale for Internet-Wide Access (Recommended)

#### Why Use Tailscale?

**The Problem:**
- Your Android device and server are on different networks (home WiFi, mobile data, office)
- SSH requires both devices on the same local network OR a public IP with port forwarding
- Port forwarding is complex, insecure, and often blocked by carriers/ISPs
- Public WiFi networks block SSH connections

**The Solution: Tailscale**

Tailscale creates a secure, private VPN network between your devices that works from anywhere:
- ✅ Access your Android from any network (home, office, coffee shop, mobile data)
- ✅ No port forwarding or firewall configuration needed
- ✅ Encrypted point-to-point connections
- ✅ Works behind NAT, firewalls, and on mobile data
- ✅ Free for personal use (up to 100 devices)
- ✅ Each device gets a stable private IP (100.x.x.x)

#### Step 1: Install Tailscale on Android

1. **Download Tailscale from Play Store:**
   - Search for "Tailscale" in Google Play Store
   - Install the official Tailscale app
   - OR download APK from: https://tailscale.com/download/android

2. **Connect to Tailscale:**
   - Open Tailscale app
   - Tap "Sign in with Google" (or another provider)
   - Grant VPN permissions when prompted
   - Toggle the connection ON

3. **Get your Android's Tailscale IP:**
   ```bash
   # In Termux, run:
   tailscale ip -4
   # Example output: 100.100.100.100
   ```

   **OR** check in the Tailscale app:
   - Open Tailscale app
   - Your IP is shown under your device name (e.g., "100.100.100.100")

#### Step 2: Install Tailscale on Server/Desktop

**On Ubuntu/Debian:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

**On macOS:**
```bash
brew install tailscale
sudo tailscale up
```

**On Windows:**
- Download installer from https://tailscale.com/download/windows
- Run installer and sign in

**Get your server's Tailscale IP:**
```bash
tailscale ip -4
# Example output: 100.100.100.101
```

#### Step 3: Configure SSH with Tailscale IP

Update your `~/.ssh/config` to use the Tailscale IP instead of local WiFi IP:

```ssh-config
Host android
    HostName 100.100.100.100    # ← Use Tailscale IP (from Step 1)
    User u0_a123                # ← Your Termux username (run 'whoami' in Termux)
    Port 8022
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

**Why this works everywhere:**
- Tailscale IPs (100.x.x.x) are stable and work on ANY network
- No need to change config when switching WiFi networks
- Works even when Android is on mobile data

#### Step 4: Test Connection

```bash
# Test from your server/desktop
ssh android "echo 'Connected via Tailscale!'"

# If successful, you're ready for AgentVibes
```

#### Benefits Summary

| Without Tailscale | With Tailscale |
|------------------|----------------|
| Only works on same WiFi | Works from anywhere |
| Need to update IP when network changes | Stable IP that never changes |
| Port forwarding required | No configuration needed |
| Insecure over internet | End-to-end encrypted |
| Doesn't work on mobile data | Works on mobile data |

**Recommendation:** Always use Tailscale for the best experience. It makes your Android device accessible from anywhere while keeping connections secure and private.

### Multiple Android Devices

Configure different host aliases:

```ssh-config
Host android-phone
    HostName 100.100.100.100
    User u0_a123
    Port 8022

Host android-tablet
    HostName 100.100.100.101
    User u0_a456
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
