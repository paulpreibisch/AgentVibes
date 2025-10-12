# Remote Audio Setup Guide

This guide explains how to set up audio playback from a remote Linux server to your local Windows machine using SSH tunneling and PulseAudio. This is especially useful for AgentVibes users who want TTS announcements to play on their local speakers when running AgentVibes on a remote server.

## Overview

When you run AgentVibes on a remote server (e.g., via SSH), TTS audio normally tries to play on the remote server's speakers (which you can't hear). This setup redirects that audio through an SSH tunnel to play on your local Windows machine.

## Architecture

```
Remote Linux Server (PulseAudio) → SSH Reverse Tunnel → Windows Client (RDP Audio) → Local Speakers
```

## Prerequisites

### On Remote Linux Server:
- PulseAudio installed
- SSH access configured
- Linux shell (bash or zsh)
- Optional: Piper TTS for testing (see setup below)

### On Windows Client:
- Windows Subsystem for Linux (WSL2) with GUI support
- VS Code with Remote-SSH extension (recommended) or any SSH client
- OpenSSH Client enabled

## Automatic Setup (Recommended)

We provide setup scripts to automate the configuration:

### 1. Remote Linux Server Setup

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/scripts/setup-remote-audio.sh
chmod +x setup-remote-audio.sh
./setup-remote-audio.sh
```

### 2. Windows Client Setup

Download and run the PowerShell setup script as Administrator:

```powershell
# Download the script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/scripts/setup-windows-audio.ps1" -OutFile "setup-windows-audio.ps1"

# Run as Administrator
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-windows-audio.ps1 -RemoteHost "your-server-hostname"
```

## Manual Setup

If you prefer to configure manually or need to troubleshoot:

### 1. Remote Linux Server Configuration

#### Configure PulseAudio

Create or edit `~/.config/pulse/default.pa`:

```bash
# Include default configuration
.include /etc/pulse/default.pa

# Enable network support
load-module module-native-protocol-tcp auth-ip-acl=127.0.0.1;192.168.0.0/16;10.0.0.0/8;172.16.0.0/12
```

#### Set Environment Variable

Add to your shell configuration (`~/.bashrc` or `~/.zshrc`):

```bash
# PulseAudio via SSH tunnel
export PULSE_SERVER=tcp:localhost:14713
```

Reload your shell configuration:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### 2. Windows Client Configuration

#### Enable WSL GUI Support

Ensure you have WSL2 with GUI support (WSLg). This comes by default with Windows 11 and recent Windows 10 versions.

```powershell
wsl --update
```

#### Configure SSH Tunnel

Add this to your `~/.ssh/config` (usually at `C:\Users\<YourUsername>\.ssh\config`):

```
Host your-remote-server
    HostName <SERVER_IP_OR_HOSTNAME>
    User <YOUR_USERNAME>
    Port 22
    RemoteForward 14713 localhost:14713
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

**Key parameters to customize:**
- `Host`: A friendly name for your connection
- `HostName`: Your remote server's IP address or domain
- `User`: Your username on the remote server
- `RemoteForward 14713 localhost:14713`: This creates the audio tunnel

## Port Configuration

- **4713**: Standard PulseAudio TCP port (local on remote server)
- **14713**: SSH tunnel port for audio forwarding

You can change port `14713` to any available port if needed, but make sure it matches in both:
1. The `PULSE_SERVER` environment variable
2. The SSH `RemoteForward` configuration

## Optional: Installing Piper TTS for Testing

Piper TTS is a fast, local neural text-to-speech system perfect for testing your remote audio setup.

### Download Piper Binary

```bash
# Create directory for Piper
mkdir -p ~/piper && cd ~/piper

# Download Piper binary (Linux x86_64)
wget https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz

# Extract
tar -xzf piper_amd64.tar.gz
rm piper_amd64.tar.gz

# Make executable
chmod +x piper
```

### Download a Voice Model

```bash
# Download a quality English voice (Amy - medium quality)
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json
```

### Test Piper TTS

```bash
# Test Piper locally (without PulseAudio tunnel)
echo "Hello from Piper" | ~/piper/piper -m ~/piper/en_US-amy-medium.onnx --output_raw | aplay -r 22050 -f S16_LE -t raw -

# Test through PulseAudio tunnel (after SSH connection is established)
echo "Testing remote audio" | ~/piper/piper -m ~/piper/en_US-amy-medium.onnx --output_raw | paplay --raw --rate=22050 --format=s16le
```

### Create Helper Script

Create `~/test-audio.sh` for easy testing:

```bash
cat > ~/test-audio.sh << 'EOF'
#!/bin/bash
# Test remote audio with Piper TTS

TEXT="${1:-Testing remote audio through SSH tunnel}"
PIPER_DIR="$HOME/piper"
MODEL="$PIPER_DIR/en_US-amy-medium.onnx"

if [ ! -f "$MODEL" ]; then
    echo "Error: Piper model not found at $MODEL"
    echo "Run setup first!"
    exit 1
fi

echo "$TEXT" | "$PIPER_DIR/piper" -m "$MODEL" --output_raw | paplay --raw --rate=22050 --format=s16le
EOF

chmod +x ~/test-audio.sh
```

**Usage:**
```bash
# Test with default message
~/test-audio.sh

# Test with custom message
~/test-audio.sh "Hello from my remote server"
```

## Usage

### Connecting and Testing

1. **Connect via SSH:**
   ```bash
   ssh your-remote-server
   ```

2. **Verify PulseAudio connection:**
   ```bash
   pactl info
   ```

   You should see connection to `tcp:localhost:14713`

3. **Test audio playback:**
   ```bash
   speaker-test -t sine -f 1000 -l 1
   ```

4. **Test TTS audio:**
   ```bash
   # Option 1: If AgentVibes is installed
   .claude/hooks/play-tts.sh "Testing remote audio"

   # Option 2: If you installed Piper TTS (see above)
   ~/test-audio.sh "Testing remote audio"

   # Option 3: Test with system sound
   paplay /usr/share/sounds/alsa/Front_Center.wav
   ```

### Troubleshooting Commands

#### Check environment variable:
```bash
echo $PULSE_SERVER
```
Expected: `tcp:localhost:14713`

#### Check SSH tunnel status:
```bash
ss -tlnp | grep :14713
```
Should show listening on port 14713

#### Check PulseAudio status:
```bash
pactl info
```
Should show "Server String: tcp:localhost:14713"

#### Restart PulseAudio:
```bash
pulseaudio --kill
pulseaudio --start
```

## Common Issues

### Issue: "Connection refused"
**Cause**: SSH tunnel not established
**Solution**: Check your SSH config and reconnect

### Issue: "Connection terminated"
**Cause**: Wrong PULSE_SERVER setting
**Solution**: Verify `echo $PULSE_SERVER` shows `tcp:localhost:14713`

### Issue: No audio output
**Cause**: Windows RDP audio not configured or WSLg not running
**Solution**:
- Ensure WSL2 is updated: `wsl --update`
- Restart WSL: `wsl --shutdown` then restart
- Check Windows audio settings

### Issue: Audio stuttering or lag
**Cause**: Network latency or SSH connection quality
**Solution**:
- Check your internet connection
- Reduce audio quality in PulseAudio settings
- Consider using a local setup if latency is too high

## VS Code Integration

If you use VS Code with Remote-SSH extension, the SSH tunnel is automatically established when you connect to your remote server. No additional steps needed!

## Security Considerations

- The PulseAudio configuration only allows connections from localhost and private IP ranges
- Audio is transmitted through the encrypted SSH tunnel
- The `RemoteForward` creates a reverse tunnel from server → client
- No external ports are exposed

## File Locations

- **Remote Server:**
  - PulseAudio config: `~/.config/pulse/default.pa`
  - Shell config: `~/.bashrc` or `~/.zshrc`

- **Windows Client:**
  - SSH config: `C:\Users\<YourUsername>\.ssh\config`

## Advanced Configuration

### Using Different Ports

If port 14713 is already in use:

1. Choose a new port (e.g., 24713)
2. Update SSH config: `RemoteForward 24713 localhost:24713`
3. Update PULSE_SERVER: `export PULSE_SERVER=tcp:localhost:24713`

### Multiple Remote Servers

Configure different tunnel ports for each server:

```
Host server1
    RemoteForward 14713 localhost:14713

Host server2
    RemoteForward 14714 localhost:14714
```

Then set PULSE_SERVER dynamically based on which server you're on.

## Verification Checklist

- [ ] PulseAudio installed on remote server
- [ ] `~/.config/pulse/default.pa` configured with network module
- [ ] `PULSE_SERVER` environment variable set
- [ ] SSH config has `RemoteForward 14713 localhost:14713`
- [ ] WSL2 with GUI support enabled on Windows
- [ ] Can connect to remote server via SSH
- [ ] `pactl info` shows correct server string
- [ ] Test audio plays successfully

## Getting Help

If you encounter issues not covered in this guide:

1. Check AgentVibes GitHub Issues
2. Join our Discord community (link in README)
3. Review PulseAudio and SSH logs for detailed error messages

## Credits

This guide is based on working configurations from AgentVibes community members. Special thanks to all contributors who helped test and refine this setup!
