#!/bin/bash
# Setup Automatic Audio Tunnel Monitoring
# Installs cron job to check tunnel health every 5 minutes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_CHECK_SCRIPT="${SCRIPT_DIR}/health-check-tunnel.sh"
CONFIG_FILE="${SCRIPT_DIR}/audio-tunnel.config"

echo "🔧 Setting up Automatic Audio Tunnel Monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found!"
    echo ""
    echo "Please create $CONFIG_FILE from the example:"
    echo "  cp ${CONFIG_FILE}.example $CONFIG_FILE"
    echo "  nano $CONFIG_FILE  # Edit with your settings"
    echo ""
    exit 1
fi

# Load config to get interval
source "$CONFIG_FILE"
CHECK_INTERVAL="${CHECK_INTERVAL:-5}"

echo "Configuration:"
echo "  Remote Host: $REMOTE_HOST"
echo "  Tunnel Port: $TUNNEL_PORT"
echo "  Check Interval: Every $CHECK_INTERVAL minutes"
echo ""

# Check if running on WSL
if ! grep -qi microsoft /proc/version 2>/dev/null; then
    echo "⚠️  Warning: This should be run on WSL (Windows side)"
    echo "   The monitoring runs on the Windows/WSL machine"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create cron entry
CRON_ENTRY="*/${CHECK_INTERVAL} * * * * ${HEALTH_CHECK_SCRIPT} >/dev/null 2>&1"

# Check if entry already exists
if crontab -l 2>/dev/null | grep -F "$HEALTH_CHECK_SCRIPT" >/dev/null; then
    echo "ℹ️  Cron job already exists"
    echo ""
    read -p "Replace existing entry? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing cron job"
        exit 0
    fi

    # Remove old entry
    crontab -l 2>/dev/null | grep -vF "$HEALTH_CHECK_SCRIPT" | crontab -
fi

# Add new cron entry
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo ""
echo "✅ Automatic monitoring installed!"
echo ""
echo "The health check will run every $CHECK_INTERVAL minutes and:"
echo "  1. Check if socat bridge is running"
echo "  2. Check if SSH tunnel exists"
echo "  3. Automatically run fix script if issues detected"
echo "  4. Log all actions to ${AUTO_FIX_LOG}"
echo ""
echo "To view logs:"
echo "  tail -f ${AUTO_FIX_LOG}"
echo ""
echo "To disable monitoring:"
echo "  crontab -e"
echo "  # Then remove the line containing: $HEALTH_CHECK_SCRIPT"
echo ""
echo "To test manually:"
echo "  $HEALTH_CHECK_SCRIPT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
