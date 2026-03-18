# SSH Audio Tunnel Troubleshooting

## Problem Summary

The SSH audio tunnel stops functioning. Common symptoms:
- `speaker-test` failing with "Connection refused"
- SSH tunnel showing "Warning: remote port forwarding failed for listen port 14713"

## Root Cause Analysis

### Primary Issue: Stale SSH Processes
**Multiple old SSH sessions** on the remote server may be holding port 14713, preventing new tunnels from binding to that port.

```bash
# Investigation on remote server:
$ sudo lsof -i :14713
COMMAND     PID   USER   FD   TYPE   DEVICE SIZE/OFF NODE NAME
sshd      12345   user    7u  IPv6 70604344      0t0  TCP ip6-localhost:14713 (LISTEN)
sshd      12345   user    9u  IPv4 70604345      0t0  TCP localhost:14713 (LISTEN)
```

### Secondary Issue: Stopped socat Bridge
The socat bridge on WSL (Windows side) may have stopped running, breaking the connection chain even if the tunnel is intact.

## How the Audio Tunnel Works

```
Remote Server                 WSL (Windows)                Windows
    |                              |                          |
    | Speaker-test/TTS             |                          |
    |         v                    |                          |
    |  PULSE_SERVER=               |                          |
    |  tcp:localhost:14713         |                          |
    |         v                    |                          |
    |  [SSH Tunnel Port 14713] <---+---> [socat Bridge]       |
    |                              |      v                   |
    |                              |  TCP:14713 ->            |
    |                              |  UNIX:/mnt/wslg/         |
    |                              |  PulseServer             |
    |                              |      v                   |
    |                              |  [WSL PulseAudio] ---> Speakers
```

## Symptoms

1. **SSH tunnel fails to establish:**
   ```
   Warning: remote port forwarding failed for listen port 14713
   ```

2. **Audio playback error:**
   ```
   ALSA lib pulse.c:242:(pulse_connect) PulseAudio: Unable to connect: Connection terminated
   Playback open error: -111,Connection refused
   ```

3. **pactl info shows local connection instead of TCP:**
   ```
   Server String: unix:/mnt/wslg/PulseServer
   # Instead of:
   Server String: tcp:localhost:14713
   ```

## The Fix

In these examples, replace `<remote-server>` with your SSH host alias or hostname (e.g., the `Host` entry from your `~/.ssh/config`).

### Step 1: Kill Stale Processes on Remote Server
```bash
ssh <remote-server> 'sudo fuser -k 14713/tcp'
```

This forcefully kills all processes (including zombie SSH sessions) holding port 14713 on the remote server.

### Step 2: Restart socat Bridge on WSL
```powershell
# Kill any existing socat
wsl pkill socat

# Start fresh socat bridge
Start-Job -ScriptBlock {
  wsl socat 'TCP-LISTEN:14713,fork,reuseaddr' 'UNIX-CONNECT:/mnt/wslg/PulseServer'
} -Name "SocatAudioBridge"

# Verify it's running
wsl ss -tlnp | Select-String ":14713"
```

### Step 3: Kill Local Stale SSH Tunnels
```bash
wsl bash -c "pkill -f 'ssh.*<remote-server>'"
```

### Step 4: Create Fresh SSH Tunnel
```bash
wsl bash -c "ssh -f -N -R 14713:localhost:14713 <remote-server>"
```

### Step 5: Verify Everything Works
```bash
# Check tunnel exists on remote
wsl bash -c "ssh <remote-server> 'netstat -tlnp | grep 14713'"

# Test audio
ssh <remote-server>
export PULSE_SERVER=tcp:localhost:14713
speaker-test -t sine -f 1000 -l 1
```

## Prevention

### Why This Happens
- SSH sessions don't always clean up properly when disconnected
- Network interruptions can leave zombie processes
- Multiple VS Code Remote sessions can create conflicting tunnels
- X2Go client (if enabled) can conflict with SSH audio tunnel

### Best Practices

1. **Always use `-f` flag for background tunnels:**
   ```bash
   ssh -f -N -R 14713:localhost:14713 <remote-server>
   ```

2. **Check for existing tunnels before creating new ones:**
   ```bash
   ssh <remote-server> 'sudo lsof -i :14713'
   ```

3. **Clean exit from SSH sessions:**
   - Use `exit` command instead of closing terminal
   - Avoid killing terminal windows with active SSH sessions

4. **Disable X2Go PulseAudio:**
   - X2Go's audio support conflicts with SSH tunnel
   - Disable in X2Go session settings under "Media/Sound"

5. **Use the automated fix script:**
   ```bash
   ./scripts/fix-audio-tunnel.sh
   ```

## Automated Solution

The `fix-audio-tunnel.sh` script handles:
- Kills stale SSH processes on remote server
- Restarts socat bridge on WSL
- Kills local stale SSH tunnels
- Creates fresh tunnel
- Verifies connection works
- Tests audio playback

## Future Improvements

### 1. Healthcheck Script
Create a cron job or systemd timer that periodically checks tunnel health:
```bash
#!/bin/bash
# /usr/local/bin/check-audio-tunnel.sh
if ! ss -tlnp | grep -q :14713; then
  # Alert or auto-fix
  logger "Audio tunnel down, attempting fix"
  /path/to/fix-audio-tunnel.sh
fi
```

### 2. SSH Config Improvement
Add these to `~/.ssh/config` for more reliable connections:
```
Host your-remote-server
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
    # This makes SSH exit if tunnel can't be created
```

### 3. Monitoring
Add tunnel status to shell prompt or status bar:
```bash
# In .bashrc or .zshrc
audio_tunnel_status() {
  if ss -tlnp 2>/dev/null | grep -q :14713; then
    echo "[audio:up]"
  else
    echo "[audio:down]"
  fi
}
```

## Related Issues

- **VS Code Remote SSH**: May need `"remote.SSH.useExecServer": false` in settings
- **Multiple WSL instances**: Each instance needs its own socat bridge
- **Firewall rules**: Ensure UFW allows localhost connections to 14713
- **PulseAudio config**: Must have `autospawn = no` and `auth-anonymous = true`

## Key Learnings

1. **Always check for stale processes first** - `sudo lsof -i :14713` should be the first diagnostic command
2. **socat bridge is critical** - Without it, even a working tunnel won't function
3. **Force kill is necessary** - Regular process termination may not clear port bindings
4. **Background tunnels need monitoring** - The `-f` flag creates fire-and-forget tunnels that need healthchecks
5. **Environment variable persistence** - `PULSE_SERVER` must be set in every new shell session

## Success Indicators

When working correctly, you should see:

1. **On WSL:**
   ```bash
   wsl ss -tlnp | grep 14713
   # Output: socat listening on *:14713
   ```

2. **On the remote server:**
   ```bash
   netstat -tlnp | grep 14713
   # Output: listening on 127.0.0.1:14713 and ::1:14713
   ```

3. **PulseAudio connection:**
   ```bash
   export PULSE_SERVER=tcp:localhost:14713
   pactl info | head -3
   # Output: Server String: tcp:localhost:14713
   ```

4. **Audio playback:**
   ```bash
   speaker-test -t sine -f 1000 -l 1
   # Output: Sound plays through Windows speakers
   ```

## Diagnostic Commands Cheat Sheet

Replace `<remote-server>` with your SSH host alias or hostname.

```bash
# Check socat bridge (on WSL)
wsl ss -tlnp | grep 14713

# Check tunnel on remote
ssh <remote-server> 'netstat -tlnp | grep 14713'

# Find processes using port
ssh <remote-server> 'sudo lsof -i :14713'

# Check PulseAudio connection
ssh <remote-server> 'export PULSE_SERVER=tcp:localhost:14713 && pactl info'

# Test audio
ssh <remote-server> 'export PULSE_SERVER=tcp:localhost:14713 && speaker-test -t sine -f 1000 -l 1'

# Kill stale processes
ssh <remote-server> 'sudo fuser -k 14713/tcp'

# Kill local SSH tunnels
wsl pkill -f 'ssh.*<remote-server>'

# Create new tunnel
wsl bash -c "ssh -f -N -R 14713:localhost:14713 <remote-server>"
```
