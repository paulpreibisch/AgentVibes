#!/bin/bash
# Fix Audio Tunnel Script
# Kills stale connections on port 14713 and waits for tunnel to be re-established

echo "🔧 Fixing Audio Tunnel..."
echo ""

# Kill any process using port 14713
echo "1️⃣  Killing stale connections on port 14713..."
if sudo fuser -k 14713/tcp 2>/dev/null; then
    echo "   ✅ Killed processes using port 14713"
else
    echo "   ℹ️  No processes were using port 14713"
fi

echo ""
echo "2️⃣  Waiting for tunnel to be re-established..."
echo "   (Run from Windows: ssh -N -R 14713:localhost:14713 ubuntu-rdp)"
echo ""

# Wait for tunnel to come back up (max 60 seconds)
TIMEOUT=60
ELAPSED=0
TUNNEL_UP=false

while [ $ELAPSED -lt $TIMEOUT ]; do
    if ss -tlnp 2>/dev/null | grep -q :14713; then
        TUNNEL_UP=true
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    # Show progress dots every 5 seconds
    if [ $((ELAPSED % 5)) -eq 0 ]; then
        echo "   Still waiting... (${ELAPSED}s elapsed)"
    fi
done

echo ""

if [ "$TUNNEL_UP" = true ]; then
    echo "✅ Audio tunnel is UP!"
    echo ""

    # Export PULSE_SERVER for this session
    export PULSE_SERVER=tcp:localhost:14713

    # Test PulseAudio connection
    if pactl info >/dev/null 2>&1; then
        echo "🎵 Playing confirmation message..."
        echo ""

        # Play TTS confirmation message through the tunnel
        # Check if we have espeak or piper available
        if command -v espeak >/dev/null 2>&1; then
            echo "Audio tunnel is fixed, new tunnel created!" | espeak -s 150 2>/dev/null
        elif [ -f /usr/local/bin/piper ] || command -v piper >/dev/null 2>&1; then
            echo "Audio tunnel is fixed, new tunnel created!" | piper --model en_US-lessac-medium --output-raw | aplay -r 22050 -f S16_LE -t raw - 2>/dev/null
        else
            # Fallback: just use speaker-test
            echo "   (TTS not available, playing test tone)"
            speaker-test -t sine -f 1000 -l 1 -s 1 2>/dev/null
        fi

        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Audio tunnel fixed successfully!"
        echo "   AgentVibes TTS will now play through Windows speakers."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    else
        echo "⚠️  Tunnel exists but PulseAudio connection failed"
        echo "   Check if socat bridge is running on Windows:"
        echo "   wsl ss -tlnp | grep 14713"
    fi
else
    echo "❌ Timeout: Tunnel did not come up after ${TIMEOUT} seconds"
    echo ""
    echo "   Make sure you run this from Windows:"
    echo "   ssh -N -R 14713:localhost:14713 ubuntu-rdp"
    echo ""
    exit 1
fi
