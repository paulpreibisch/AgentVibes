# AgentVibes Setup Scripts

This directory contains setup scripts to help you configure AgentVibes and related features.

## Remote Audio Setup

These scripts help you set up audio playback from a remote Linux server to your local Windows machine. This is useful when running AgentVibes on a remote server but wanting TTS announcements to play on your local speakers.

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

## Troubleshooting

### Common Issues

**Audio doesn't play:**
- Ensure WSL is updated: `wsl --update`
- Restart WSL: `wsl --shutdown`
- Verify SSH tunnel: `ssh -v your-host`

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
