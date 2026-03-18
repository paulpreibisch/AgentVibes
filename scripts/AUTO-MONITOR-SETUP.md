# Automatic Audio Tunnel Monitoring Setup

This guide shows you how to set up automatic monitoring for your audio tunnel so it fixes itself when issues occur.

## Quick Setup

### 1. Create Your Configuration

```bash
cd scripts/
cp audio-tunnel.config.example audio-tunnel.config
nano audio-tunnel.config  # Edit with your settings
```

**Configure these values:**
- `REMOTE_HOST`: Your SSH host name (from `~/.ssh/config`)
- `TUNNEL_PORT`: The port number (default: 14713)
- `PULSE_SOCKET`: Path to PulseAudio socket (usually `/mnt/wslg/PulseServer`)
- `CHECK_INTERVAL`: How often to check in minutes (default: 5)

### 2. Install Automatic Monitoring

```bash
./setup-auto-monitor.sh
```

This will:
- ✅ Validate your configuration
- ✅ Install a cron job that runs every 5 minutes (or your chosen interval)
- ✅ Log all actions to `/tmp/audio-tunnel-autofix.log`

## What It Does

The monitoring system automatically:

1. **Checks socat bridge** - Verifies it's running on WSL
2. **Checks SSH tunnel** - Verifies connection to remote server
3. **Auto-fixes issues** - Runs `fix-audio-tunnel.sh` if problems detected
4. **Logs everything** - Records all checks and fixes

## Viewing Logs

Watch live monitoring:
```bash
tail -f /tmp/audio-tunnel-autofix.log
```

Recent activity:
```bash
tail -20 /tmp/audio-tunnel-autofix.log
```

## Testing

Test the health check manually:
```bash
./health-check-tunnel.sh
```

This runs the same check that cron will run automatically.

## Disabling

To stop automatic monitoring:
```bash
crontab -e
# Remove the line containing: health-check-tunnel.sh
```

Or just comment it out with `#` if you want to easily re-enable later.

## Changing Check Interval

Edit your config file:
```bash
nano audio-tunnel.config
# Change CHECK_INTERVAL="5" to whatever you want
```

Then run setup again:
```bash
./setup-auto-monitor.sh
```

## Log Format

Logs look like this:
```
[2025-10-16 10:00:00] OK: Audio tunnel is healthy
[2025-10-16 10:05:00] ALERT: socat bridge not running on port 14713
[2025-10-16 10:05:00] Running automatic fix...
[2025-10-16 10:05:05] SUCCESS: Audio tunnel restored automatically
[2025-10-16 10:10:00] OK: Audio tunnel is healthy
```

## Troubleshooting

### "Configuration file not found"
```bash
cp audio-tunnel.config.example audio-tunnel.config
nano audio-tunnel.config
```

### "REMOTE_HOST not configured"
Edit `audio-tunnel.config` and set your actual remote host name.

### "Automatic fix failed"
Check the logs:
```bash
tail -50 /tmp/audio-tunnel-autofix.log
```

Try running the fix manually:
```bash
./fix-audio-tunnel.sh
```

### Cron not running
Verify cron service is running:
```bash
# Check if cron is active
service cron status

# Or on systemd systems
systemctl status cron
```

List your cron jobs:
```bash
crontab -l
```

## Manual Cron Setup

If `setup-auto-monitor.sh` doesn't work, add manually:

```bash
crontab -e
```

Add this line (adjust path to your actual script location):
```
*/5 * * * * /full/path/to/scripts/health-check-tunnel.sh >/dev/null 2>&1
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Cron (every 5 minutes)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            health-check-tunnel.sh                       │
│  • Reads audio-tunnel.config                           │
│  • Checks socat bridge                                 │
│  • Checks SSH tunnel                                   │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    Issues Found?           All Good?
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ fix-audio-       │    │ Log: OK          │
│ tunnel.sh        │    └──────────────────┘
│ • Kill stale     │
│   processes      │
│ • Restart socat  │
│ • Create tunnel  │
│ • Verify fix     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Log: SUCCESS or  │
│      ERROR       │
└──────────────────┘
```

## Why This Approach?

**Benefits:**
- ✅ **Automatic recovery** - Fixes issues without manual intervention
- ✅ **Logged diagnostics** - Track when issues occur and how they're fixed
- ✅ **Configurable** - Adjust check frequency as needed
- ✅ **Non-intrusive** - Only acts when there's a problem
- ✅ **Portable** - Config file makes it work on any system

**Alternative approaches considered:**
- ❌ Systemd service - More complex, requires root
- ❌ Background daemon - Uses resources continuously
- ❌ Git hooks - Only runs during git operations
- ✅ Cron job - Simple, reliable, widely available

## Security Considerations

The health check script:
- ✅ Doesn't store passwords or keys
- ✅ Uses existing SSH config and keys
- ✅ Only reads config file (not world-writable)
- ✅ Logs to local temp directory
- ✅ Runs with user permissions (no sudo needed for checks)

The fix script requires sudo only for:
- Killing processes on remote server (via `sudo fuser -k`)
- This uses your existing SSH sudo access

## Integration with AgentVibes

Once monitoring is active, AgentVibes TTS will have maximum uptime:
- Audio tunnel issues are detected within 5 minutes
- Automatic fix runs immediately
- Your TTS narration continues with minimal interruption

## Next Steps

After setup:
1. Monitor logs for the first hour to ensure it's working
2. Adjust `CHECK_INTERVAL` if needed
3. Test by manually breaking the tunnel and watching it recover

**To test recovery:**
```bash
# Break the tunnel
pkill socat

# Wait up to 5 minutes
# Check logs to see automatic recovery
tail -f /tmp/audio-tunnel-autofix.log
```
