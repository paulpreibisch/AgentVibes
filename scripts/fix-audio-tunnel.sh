#!/bin/bash
# Complete Audio Tunnel Fix Script
# Fixes audio tunnel issues between remote server and Windows WSL
# Updated: 2025-10-16 - Handles stale SSH processes and socat bridge

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/audio-tunnel.config"

# Load configuration if it exists, otherwise use defaults
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    # Default values (can be overridden by config)
    REMOTE_HOST="${REMOTE_HOST:-ubuntu-rdp}"
    TUNNEL_PORT="${TUNNEL_PORT:-14713}"
    PULSE_SOCKET="${PULSE_SOCKET:-/mnt/wslg/PulseServer}"
fi

# Security: Validate TUNNEL_PORT is numeric only
if ! [[ "$TUNNEL_PORT" =~ ^[0-9]+$ ]]; then
    echo "❌ Error: TUNNEL_PORT must be numeric (got: $TUNNEL_PORT)"
    exit 1
fi

# Security: Validate REMOTE_HOST doesn't contain dangerous characters
if [[ "$REMOTE_HOST" =~ [';|&$`<>(){}'] ]]; then
    echo "❌ Error: REMOTE_HOST contains invalid characters"
    exit 1
fi

echo "🔧 Complete Audio Tunnel Fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect if we're running on WSL or remote server
if grep -qi microsoft /proc/version 2>/dev/null; then
    RUNNING_ON="wsl"
    echo "📍 Detected: Running on WSL (Windows side)"
elif [ -n "$SSH_CONNECTION" ] || [ -n "$SSH_CLIENT" ]; then
    RUNNING_ON="remote"
    echo "📍 Detected: Running on remote server"
else
    # Check if hostname matches REMOTE_HOST
    CURRENT_HOST=$(hostname)
    if [ "$CURRENT_HOST" = "$REMOTE_HOST" ]; then
        RUNNING_ON="remote"
        echo "📍 Detected: Running on remote server ($REMOTE_HOST)"
    else
        RUNNING_ON="wsl"
        echo "📍 Assumed: Running on WSL (use config file to customize)"
    fi
fi

echo ""

# Function to check if socat is running on WSL
check_socat() {
    if ss -tlnp 2>/dev/null | grep -q ":${TUNNEL_PORT}.*socat"; then
        return 0
    else
        return 1
    fi
}

# Function to kill stale SSH processes on remote server
kill_remote_stale_processes() {
    echo "1️⃣  Checking for stale SSH processes on ${REMOTE_HOST}..."

    # Get list of processes using the port
    # Security: Variables are now validated at script start, and TUNNEL_PORT is numeric-only
    STALE_PROCS=$(ssh "${REMOTE_HOST}" "sudo lsof -i :${TUNNEL_PORT} 2>/dev/null | grep -v COMMAND || echo 'none'")

    if [ "$STALE_PROCS" != "none" ] && [ -n "$STALE_PROCS" ]; then
        echo "   🔍 Found stale processes:"
        echo "$STALE_PROCS" | sed 's/^/      /'
        echo ""
        echo "   🗑️  Killing stale processes..."
        ssh "${REMOTE_HOST}" "sudo fuser -k ${TUNNEL_PORT}/tcp 2>/dev/null || true"
        echo "   ✅ Stale processes killed"
        sleep 2
    else
        echo "   ℹ️  No stale processes found"
    fi
    echo ""
}

# Function to fix socat bridge (WSL only)
fix_socat_bridge() {
    echo "2️⃣  Checking socat bridge on WSL..."

    if check_socat; then
        echo "   ✅ socat bridge is already running"
    else
        echo "   ⚠️  socat bridge not running, restarting..."

        # Kill any existing socat
        pkill socat 2>/dev/null || true
        sleep 1

        # Start socat in background
        nohup socat "TCP-LISTEN:${TUNNEL_PORT},fork,reuseaddr" "UNIX-CONNECT:${PULSE_SOCKET}" \
            > /tmp/socat-audio-${TUNNEL_PORT}.log 2>&1 &

        sleep 2

        if check_socat; then
            echo "   ✅ socat bridge started successfully"
        else
            echo "   ❌ Failed to start socat bridge"
            echo "   Check logs: /tmp/socat-audio-${TUNNEL_PORT}.log"
            return 1
        fi
    fi
    echo ""
}

# Function to kill local stale SSH tunnels (WSL only)
kill_local_ssh_tunnels() {
    echo "3️⃣  Killing local stale SSH tunnels..."

    # Security: Quote REMOTE_HOST to prevent command injection
    if pgrep -f "ssh.*${REMOTE_HOST}" > /dev/null; then
        pkill -f "ssh.*${REMOTE_HOST}" 2>/dev/null || true
        echo "   ✅ Killed stale SSH tunnels"
        sleep 2
    else
        echo "   ℹ️  No stale SSH tunnels found"
    fi
    echo ""
}

# Function to create SSH tunnel (WSL only)
create_ssh_tunnel() {
    echo "4️⃣  Creating fresh SSH tunnel..."

    # Create tunnel in background
    # Security: Quote variables to prevent command injection
    ssh -f -N -R "${TUNNEL_PORT}:localhost:${TUNNEL_PORT}" "${REMOTE_HOST}" 2>/dev/null || {
        echo "   ⚠️  Tunnel creation returned warning (this is normal if tunnel already exists)"
    }

    sleep 2

    # Verify tunnel exists on remote
    echo "   🔍 Verifying tunnel on ${REMOTE_HOST}..."
    if ssh "${REMOTE_HOST}" "netstat -tlnp 2>/dev/null | grep -q ${TUNNEL_PORT}"; then
        echo "   ✅ SSH tunnel established successfully"
    else
        echo "   ❌ Failed to establish SSH tunnel"
        return 1
    fi
    echo ""
}

# Function to test audio connection
test_audio() {
    echo "5️⃣  Testing audio connection..."

    # Test PulseAudio connection
    # Security: Quote variables to prevent command injection
    if ssh "${REMOTE_HOST}" "export PULSE_SERVER=tcp:localhost:${TUNNEL_PORT} && timeout 5 pactl info > /dev/null 2>&1"; then
        echo "   ✅ PulseAudio connection successful"

        # Get server info
        SERVER_INFO=$(ssh "${REMOTE_HOST}" "export PULSE_SERVER=tcp:localhost:${TUNNEL_PORT} && pactl info | head -3")
        echo "   📊 Server Info:"
        echo "$SERVER_INFO" | sed 's/^/      /'
    else
        echo "   ⚠️  PulseAudio connection test failed"
        return 1
    fi
    echo ""
}

# Main execution based on environment
if [ "$RUNNING_ON" = "wsl" ]; then
    echo "🔄 Running complete fix from WSL..."
    echo ""

    # Step 1: Kill stale processes on remote
    kill_remote_stale_processes

    # Step 2: Fix socat bridge
    fix_socat_bridge || exit 1

    # Step 3: Kill local SSH tunnels
    kill_local_ssh_tunnels

    # Step 4: Create fresh tunnel
    create_ssh_tunnel || exit 1

    # Step 5: Test audio
    test_audio || {
        echo "⚠️  Audio test failed, but tunnel is established"
        echo "   Try manually: ssh ${REMOTE_HOST}"
        echo "   Then: export PULSE_SERVER=tcp:localhost:${TUNNEL_PORT}"
        echo "   Test: speaker-test -t sine -f 1000 -l 1"
    }

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Audio tunnel fix complete!"
    echo ""
    echo "To use audio on ${REMOTE_HOST}:"
    echo "  export PULSE_SERVER=tcp:localhost:${TUNNEL_PORT}"
    echo "  speaker-test -t sine -f 1000 -l 1"
    echo ""
    echo "For persistent audio, add to ~/.bashrc:"
    echo "  echo 'export PULSE_SERVER=tcp:localhost:${TUNNEL_PORT}' >> ~/.bashrc"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

elif [ "$RUNNING_ON" = "remote" ]; then
    echo "🔄 Running local fix on remote server..."
    echo ""

    # Kill any process using port 14713
    echo "1️⃣  Killing stale connections on port ${TUNNEL_PORT}..."
    if sudo fuser -k ${TUNNEL_PORT}/tcp 2>/dev/null; then
        echo "   ✅ Killed processes using port ${TUNNEL_PORT}"
    else
        echo "   ℹ️  No processes were using port ${TUNNEL_PORT}"
    fi

    echo ""
    echo "2️⃣  Waiting for tunnel to be re-established..."
    echo "   (Run from Windows/WSL: ssh -N -R ${TUNNEL_PORT}:localhost:${TUNNEL_PORT} ${REMOTE_HOST})"
    echo ""

    # Wait for tunnel to come back up (max 60 seconds)
    TIMEOUT=60
    ELAPSED=0
    TUNNEL_UP=false

    while [ $ELAPSED -lt $TIMEOUT ]; do
        if ss -tlnp 2>/dev/null | grep -q :${TUNNEL_PORT}; then
            TUNNEL_UP=true
            break
        fi
        sleep 5
        ELAPSED=$((ELAPSED + 5))
        echo "   Still waiting... (${ELAPSED}s elapsed)"
    done

    echo ""

    if [ "$TUNNEL_UP" = true ]; then
        echo "✅ Audio tunnel is UP!"
        echo ""

        # Export PULSE_SERVER for this session
        export PULSE_SERVER=tcp:localhost:${TUNNEL_PORT}

        # Test PulseAudio connection
        if pactl info >/dev/null 2>&1; then
            echo "🎵 Testing audio connection..."
            echo ""

            # Test with speaker-test
            speaker-test -t sine -f 1000 -l 1 2>/dev/null || echo "   (Audio test completed)"

            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ Audio tunnel fixed successfully!"
            echo "   AgentVibes TTS will now play through Windows speakers."
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
        else
            echo "⚠️  Tunnel exists but PulseAudio connection failed"
            echo "   Check if socat bridge is running on Windows/WSL:"
            echo "   wsl ss -tlnp | grep ${TUNNEL_PORT}"
        fi
    else
        echo "❌ Timeout: Tunnel did not come up after ${TIMEOUT} seconds"
        echo ""
        echo "   Run this from Windows/WSL to fix:"
        echo "   wsl bash /path/to/fix-audio-tunnel.sh"
        echo ""
        exit 1
    fi

else
    echo "❌ Unknown environment. This script should run on either:"
    echo "   - WSL (Windows Subsystem for Linux)"
    echo "   - Remote server (configured as REMOTE_HOST in config file)"
    echo ""
    echo "Create audio-tunnel.config from audio-tunnel.config.example"
    exit 1
fi
