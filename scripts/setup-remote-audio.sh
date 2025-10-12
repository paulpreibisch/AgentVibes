#!/bin/bash

# AgentVibes Remote Audio Setup Script
# This script configures PulseAudio on a remote Linux server to forward audio
# through an SSH tunnel to your local machine.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TUNNEL_PORT=14713
PULSE_CONFIG_DIR="$HOME/.config/pulse"
PULSE_CONFIG_FILE="$PULSE_CONFIG_DIR/default.pa"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        AgentVibes Remote Audio Setup (Linux)              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}==>${NC} ${1}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}⚠${NC} ${1}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗${NC} ${1}"
}

# Check if running on a remote system
print_section "Checking system requirements"

# Check for PulseAudio
if ! command -v pulseaudio &> /dev/null; then
    print_error "PulseAudio is not installed"
    echo "Please install PulseAudio first:"
    echo ""
    if command -v apt &> /dev/null; then
        echo "  sudo apt update && sudo apt install pulseaudio pulseaudio-utils"
    elif command -v yum &> /dev/null; then
        echo "  sudo yum install pulseaudio pulseaudio-utils"
    elif command -v dnf &> /dev/null; then
        echo "  sudo dnf install pulseaudio pulseaudio-utils"
    elif command -v pacman &> /dev/null; then
        echo "  sudo pacman -S pulseaudio"
    else
        echo "  Please install PulseAudio using your distribution's package manager"
    fi
    echo ""
    exit 1
fi
print_success "PulseAudio is installed"

# Detect shell
SHELL_NAME=$(basename "$SHELL")
if [ "$SHELL_NAME" = "bash" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [ "$SHELL_NAME" = "zsh" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
else
    print_warning "Detected shell: $SHELL_NAME"
    read -p "Enter path to your shell config file (e.g., ~/.bashrc): " SHELL_CONFIG
    if [ -z "$SHELL_CONFIG" ]; then
        print_error "No shell config file specified"
        exit 1
    fi
fi
print_success "Detected shell configuration: $SHELL_CONFIG"

# Backup existing configuration
print_section "Backing up existing configuration"

if [ -f "$PULSE_CONFIG_FILE" ]; then
    backup_file="${PULSE_CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$PULSE_CONFIG_FILE" "$backup_file"
    print_success "Backed up existing PulseAudio config to: $backup_file"
fi

if [ -f "$SHELL_CONFIG" ]; then
    backup_file="${SHELL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$SHELL_CONFIG" "$backup_file"
    print_success "Backed up existing shell config to: $backup_file"
fi

# Create PulseAudio config directory if it doesn't exist
print_section "Configuring PulseAudio"

mkdir -p "$PULSE_CONFIG_DIR"
print_success "Created PulseAudio config directory"

# Create PulseAudio configuration
cat > "$PULSE_CONFIG_FILE" << 'EOF'
# AgentVibes Remote Audio Configuration
# This configuration enables PulseAudio network support for SSH audio tunneling

# Include default configuration
.include /etc/pulse/default.pa

# Enable network support
# Allow connections from localhost and private networks
load-module module-native-protocol-tcp auth-ip-acl=127.0.0.1;192.168.0.0/16;10.0.0.0/8;172.16.0.0/12

EOF

print_success "Created PulseAudio configuration"

# Configure shell environment
print_section "Configuring shell environment"

# Check if PULSE_SERVER is already configured
if grep -q "PULSE_SERVER" "$SHELL_CONFIG" 2>/dev/null; then
    print_warning "PULSE_SERVER already configured in $SHELL_CONFIG"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove old configuration
        sed -i '/PULSE_SERVER/d' "$SHELL_CONFIG"
        print_success "Removed old PULSE_SERVER configuration"
    else
        print_warning "Keeping existing PULSE_SERVER configuration"
    fi
fi

# Add PULSE_SERVER configuration if not present
if ! grep -q "export PULSE_SERVER=tcp:localhost:$TUNNEL_PORT" "$SHELL_CONFIG" 2>/dev/null; then
    echo "" >> "$SHELL_CONFIG"
    echo "# AgentVibes Remote Audio Configuration" >> "$SHELL_CONFIG"
    echo "# PulseAudio via SSH tunnel" >> "$SHELL_CONFIG"
    echo "export PULSE_SERVER=tcp:localhost:$TUNNEL_PORT" >> "$SHELL_CONFIG"
    print_success "Added PULSE_SERVER to $SHELL_CONFIG"
else
    print_success "PULSE_SERVER already configured correctly"
fi

# Restart PulseAudio
print_section "Restarting PulseAudio"

pulseaudio --kill 2>/dev/null || true
sleep 1
pulseaudio --start --log-target=syslog 2>/dev/null || true
sleep 2

if pulseaudio --check; then
    print_success "PulseAudio restarted successfully"
else
    print_warning "PulseAudio may not be running (this is normal on some systems)"
fi

# Setup verification
print_section "Setup Summary"
echo ""
echo -e "${GREEN}✓ Configuration complete!${NC}"
echo ""
echo "Configuration details:"
echo "  - PulseAudio config: $PULSE_CONFIG_FILE"
echo "  - Shell config: $SHELL_CONFIG"
echo "  - Tunnel port: $TUNNEL_PORT"
echo ""

print_section "Next Steps"
echo ""
echo "1. ${YELLOW}IMPORTANT:${NC} Configure your SSH client with the tunnel"
echo "   Add this to your ~/.ssh/config on your ${BLUE}Windows/local machine${NC}:"
echo ""
echo "   Host your-remote-server"
echo "       HostName <YOUR_SERVER_IP>"
echo "       User $(whoami)"
echo "       RemoteForward $TUNNEL_PORT localhost:$TUNNEL_PORT"
echo "       ServerAliveInterval 30"
echo "       ServerAliveCountMax 3"
echo ""
echo "2. Reconnect via SSH to apply the changes"
echo ""
echo "3. Test the setup after reconnecting:"
echo ""
echo "   # Check environment variable"
echo "   echo \$PULSE_SERVER"
echo ""
echo "   # Test PulseAudio connection"
echo "   pactl info"
echo ""
echo "   # Test audio playback"
echo "   speaker-test -t sine -f 1000 -l 1"
echo ""

print_section "Troubleshooting"
echo ""
echo "If you encounter issues:"
echo ""
echo "  - Check tunnel status: ss -tlnp | grep :$TUNNEL_PORT"
echo "  - Restart PulseAudio: pulseaudio --kill && pulseaudio --start"
echo "  - Check PulseAudio logs: journalctl --user -u pulseaudio -f"
echo "  - Verify SSH tunnel in SSH client config"
echo ""
echo "For more help, see: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/remote-audio-setup.md"
echo ""

print_success "Setup completed successfully!"
