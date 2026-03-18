# AgentVibes Setup Scripts

This directory contains setup scripts to help you configure AgentVibes and related features.

## Remote Audio Setup

These scripts help you set up audio playback from a remote Linux server to your local machine. This is useful when running AgentVibes on a remote server but wanting TTS announcements to play on your local speakers.

### Scripts

#### `setup-remote-audio.sh` (Linux/Remote Server)

Configures PulseAudio on your remote Linux server to forward audio through an SSH tunnel.

**Requirements:**
- Linux system with bash
- PulseAudio installed
- SSH access

**Usage:**
```bash
# Download and run
curl -O https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/scripts/setup-remote-audio.sh
chmod +x setup-remote-audio.sh
./setup-remote-audio.sh
```

**What it does:**
- Configures PulseAudio to accept network connections
- Sets up the `PULSE_SERVER` environment variable
- Creates backups of existing configurations
- Provides verification steps

#### `setup-windows-audio.ps1` (Windows/Local Machine)

Configures your Windows SSH client to create the audio tunnel to the remote server.

**Requirements:**
- Windows 10/11
- WSL2 with GUI support (WSLg)
- OpenSSH Client
- PowerShell 5.1 or later

**Usage:**
```powershell
# Download
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/scripts/setup-windows-audio.ps1" -OutFile "setup-windows-audio.ps1"

# Run as Administrator (recommended)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-windows-audio.ps1 -RemoteHost "your-server-ip-or-hostname"
```

**Optional Parameters:**
- `-RemoteUser <username>` - SSH username (defaults to current Windows user)
- `-TunnelPort <port>` - Audio tunnel port (default: 14713)
- `-SSHConfigPath <path>` - Custom SSH config location

**Examples:**
```powershell
# Basic usage
.\setup-windows-audio.ps1 -RemoteHost "192.168.1.100"

# With custom username and port
.\setup-windows-audio.ps1 -RemoteHost "myserver.com" -RemoteUser "ubuntu" -TunnelPort 24713
```

**What it does:**
- Creates SSH configuration with RemoteForward tunnel
- Verifies WSL and OpenSSH installation
- Backs up existing SSH config
- Provides testing and verification steps

## Setup Order

1. **First**: Run `setup-windows-audio.ps1` on your local Windows machine
2. **Then**: Run `setup-remote-audio.sh` on your remote Linux server
3. **Finally**: Reconnect via SSH and test audio

## Documentation

For detailed information about the remote audio setup, see:
- [Remote Audio Setup Guide](../docs/remote-audio-setup.md)

#### `fix-audio-tunnel.sh` (WSL or Remote Server)

**The easiest way to fix audio tunnel issues!**

Auto-detects environment and runs appropriate fixes for stale SSH processes, stopped socat bridges, and connection issues.

**Requirements:**
- Run from WSL (for complete fix) OR from your remote server (for local fix)
- SSH access configured
- sudo privileges for killing processes

**Usage:**
```bash
# From WSL - runs complete fix
./scripts/fix-audio-tunnel.sh

# From the remote server - runs local fix
./scripts/fix-audio-tunnel.sh
```

**What it does (when run from WSL):**
1. Kills stale SSH processes on the remote server holding port 14713
2. Restarts socat bridge on WSL if needed
3. Kills local stale SSH tunnels
4. Creates fresh SSH tunnel to the remote server
5. Tests audio connection
6. Provides clear status and usage instructions

**What it does (when run from the remote server):**
1. Kills local processes using port 14713
2. Waits for tunnel to be re-established
3. Tests audio connection
4. Plays test tone through local speakers

**When to use:**
- Audio stopped working suddenly
- Getting "Connection refused" errors
- SSH shows "Warning: remote port forwarding failed"
- speaker-test fails
- AgentVibes TTS not playing through speakers

#### `check-audio-tunnel.sh` (Diagnostic)

Checks audio tunnel status without making changes. Useful for verifying setup or diagnosing issues.

**Usage:**
```bash
./scripts/check-audio-tunnel.sh
```

## Troubleshooting

### Quick Fix

**If audio stopped working**, run this first:
```bash
# From WSL
./scripts/fix-audio-tunnel.sh
```

This will automatically fix the most common issues:
- Stale SSH processes blocking port 14713
- Stopped socat bridge
- Conflicting SSH tunnels

### Common Issues

**Issue 1: "Warning: remote port forwarding failed for listen port 14713"**

**Symptom:** SSH tunnel fails to establish
**Cause:** Old SSH sessions left zombie processes holding port 14713
**Fix:** `./scripts/fix-audio-tunnel.sh` (kills stale processes automatically)

**Issue 2: "Connection refused" / "ALSA lib pulse.c: Unable to connect"**

**Symptom:** Audio playback fails
**Cause:** socat bridge on WSL stopped running
**Fix:** `./scripts/fix-audio-tunnel.sh` (restarts socat automatically)

**Issue 3: Audio works intermittently**

**Symptom:** Audio plays sometimes but not always
**Cause:** Multiple SSH sessions creating conflicting tunnels
**Fix:** `./scripts/fix-audio-tunnel.sh` (kills all tunnels and creates one clean tunnel)

### Manual Diagnostics

If the automated fix doesn't work, try these manual checks:

**Check socat bridge (WSL):**
```bash
wsl ss -tlnp | grep 14713
# Expected: LISTEN 0 5 *:14713 *:* users:(("socat"...))
```

**Check SSH tunnel (remote server):**
```bash
ssh <remote-server> 'netstat -tlnp | grep 14713'
# Expected: tcp 0 0 127.0.0.1:14713 0.0.0.0:* LISTEN
```

**Find stale processes:**
```bash
ssh <remote-server> 'sudo lsof -i :14713'
# Should show only one sshd process
```

**Test audio:**
```bash
ssh <remote-server>
export PULSE_SERVER=tcp:localhost:14713
speaker-test -t sine -f 1000 -l 1
```

**Detailed troubleshooting guide:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for in-depth analysis of recent issues and their solutions.

### Legacy Issues

**Audio doesn't play:**
- Ensure WSL is updated: `wsl --update`
- Restart WSL: `wsl --shutdown`
- Verify SSH tunnel: `ssh -v <remote-server>`

**Connection refused:**
- Check SSH config has `RemoteForward 14713 localhost:14713`
- Verify you're connected via SSH
- Check firewall settings

**PulseAudio errors:**
- Restart PulseAudio: `pulseaudio --kill && pulseaudio --start`
- Check environment: `echo $PULSE_SERVER`
- Verify config: `pactl info`

## Contributing

If you find issues or have improvements for these scripts:

1. Open an issue on GitHub
2. Submit a pull request with your changes
3. Include test results from your environment

## Support

For help and support:
- [GitHub Issues](https://github.com/paulpreibisch/AgentVibes/issues)
- [Documentation](../docs/remote-audio-setup.md)
- Community Discord (link in main README)
