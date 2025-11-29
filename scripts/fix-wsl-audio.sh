#!/bin/bash
# fix-wsl-audio.sh - Reset and fix WSL audio when it breaks
# Usage: ./scripts/fix-wsl-audio.sh
#
# This script fixes the common WSLg audio issue where PulseAudio becomes unresponsive.
# It restarts the WSLg PulseAudio server without requiring a full WSL shutdown.

set -euo pipefail

echo "=== WSL Audio Fix Script ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Step 1: Kill local audio processes that might interfere
info "Step 1: Cleaning up local audio processes..."
pkill -9 -u "$USER" pipewire 2>/dev/null || true
pkill -9 -u "$USER" pipewire-pulse 2>/dev/null || true
pkill -9 -u "$USER" pulseaudio 2>/dev/null || true
pkill -9 -f "socat.*PulseServer" 2>/dev/null || true
rm -f /run/user/"$(id -u)"/pipewire*.lock 2>/dev/null || true
sleep 1
echo "  Done."

# Step 2: Check and fix WSLg PulseAudio
info "Step 2: Checking WSLg PulseAudio status..."
WSLG_PULSE_SOCKET="/mnt/wslg/PulseServer"

if [[ ! -S "$WSLG_PULSE_SOCKET" ]]; then
    error "WSLg PulseAudio socket not found at $WSLG_PULSE_SOCKET"
    error "WSLg may not be enabled. Run 'wsl --shutdown' from PowerShell."
    exit 1
fi

# Test if the socket is responsive
if timeout 2 pactl info &>/dev/null 2>&1; then
    info "WSLg PulseAudio is already responding!"
else
    warn "WSLg PulseAudio is NOT responding - restarting..."

    # Kill the hung PulseAudio in the WSLg system distro - it auto-restarts!
    # This is the magic fix that avoids needing 'wsl --shutdown'
    if wsl.exe --system -d Ubuntu -e bash -c "pkill -9 pulseaudio" 2>/dev/null; then
        info "Killed hung PulseAudio, waiting for restart..."
        sleep 3

        # Verify it restarted
        if timeout 2 pactl info &>/dev/null 2>&1; then
            info "WSLg PulseAudio restarted successfully!"
        else
            error "PulseAudio restart failed"
            echo ""
            echo "Fallback: Run 'wsl --shutdown' from PowerShell"
            exit 1
        fi
    else
        error "Could not access WSLg system distro"
        echo ""
        echo "Fallback: Run 'wsl --shutdown' from PowerShell"
        exit 1
    fi
fi

echo ""
echo "=== Fix Complete ==="
echo ""

# Final verification
if pactl info &>/dev/null 2>&1; then
    echo -e "${GREEN}Audio is working!${NC}"
    echo ""
    pactl info 2>/dev/null | grep -E "Server Name|Default Sink" || true
    echo ""

    # Play a test sound
    info "Playing test sound..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    AGENTVIBES_DIR="$(dirname "$SCRIPT_DIR")"

    if [[ -x "$AGENTVIBES_DIR/.claude/hooks/play-tts.sh" ]]; then
        "$AGENTVIBES_DIR/.claude/hooks/play-tts.sh" "Audio fixed! We're back in business!" 2>/dev/null || true
    elif command -v paplay &>/dev/null; then
        # Generate a simple beep
        python3 -c "
import sys, math, struct
for i in range(int(44100 * 0.3)):
    sample = int(32767 * 0.5 * math.sin(2 * math.pi * 440 * i / 44100))
    sys.stdout.buffer.write(struct.pack('<h', sample))
" 2>/dev/null | paplay --raw --rate=44100 --channels=1 --format=s16le 2>/dev/null || true
    fi

    exit 0
else
    echo -e "${RED}Audio is still not working.${NC}"
    echo ""
    echo "Last resort: Run 'wsl --shutdown' from PowerShell"
    exit 1
fi
