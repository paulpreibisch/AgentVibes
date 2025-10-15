#!/bin/bash
# Setup script for ubuntu-rdp remote audio configuration
# This script configures PulseAudio to work with SSH audio tunneling

set -e

echo "=================================================="
echo "  Ubuntu RDP Audio Configuration Setup"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if PulseAudio is installed
echo "Checking PulseAudio installation..."
if ! command -v pulseaudio &> /dev/null; then
    print_warning "PulseAudio not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y pulseaudio pulseaudio-utils
    print_success "PulseAudio installed"
else
    print_success "PulseAudio is already installed"
fi

# Create PulseAudio config directory if it doesn't exist
echo ""
echo "Setting up PulseAudio configuration..."
mkdir -p ~/.config/pulse

# Backup existing config if it exists
if [ -f ~/.config/pulse/default.pa ]; then
    print_warning "Backing up existing default.pa to default.pa.backup"
    cp ~/.config/pulse/default.pa ~/.config/pulse/default.pa.backup
fi

# Create default.pa configuration
cat > ~/.config/pulse/default.pa << 'EOF'
#!/usr/bin/pulseaudio -nF

# Include default configuration
.include /etc/pulse/default.pa

# Enable network support - allow connections from localhost (SSH tunnel)
load-module module-native-protocol-tcp auth-ip-acl=127.0.0.1 auth-anonymous=1
EOF

print_success "Created ~/.config/pulse/default.pa"

# Configure PULSE_SERVER environment variable
echo ""
echo "Configuring shell environment..."

# Function to add PULSE_SERVER to shell config
add_pulse_server() {
    local shell_config="$1"
    local config_name="$2"

    if [ -f "$shell_config" ]; then
        # Check if PULSE_SERVER is already set
        if grep -q "export PULSE_SERVER" "$shell_config"; then
            print_warning "$config_name already has PULSE_SERVER configured"
            # Update it to use correct value
            sed -i 's|export PULSE_SERVER=.*|export PULSE_SERVER=tcp:localhost:14713|' "$shell_config"
            print_success "Updated PULSE_SERVER in $config_name"
        else
            # Add PULSE_SERVER configuration
            cat >> "$shell_config" << 'SHELLEOF'

# PulseAudio via SSH tunnel
export PULSE_SERVER=tcp:localhost:14713
SHELLEOF
            print_success "Added PULSE_SERVER to $config_name"
        fi
    else
        print_warning "$config_name not found, skipping"
    fi
}

# Configure bashrc
add_pulse_server ~/.bashrc ".bashrc"

# Configure zshrc if it exists
add_pulse_server ~/.zshrc ".zshrc"

# Restart PulseAudio
echo ""
echo "Restarting PulseAudio..."
pulseaudio --kill 2>/dev/null || true
sleep 1
pulseaudio --start --exit-idle-time=-1 2>/dev/null
print_success "PulseAudio restarted"

# Test configuration
echo ""
echo "Testing PulseAudio configuration..."
if pactl info &> /dev/null; then
    print_success "PulseAudio is running"

    # Show server info
    echo ""
    echo "PulseAudio Server Info:"
    pactl info | grep -E "(Server String|Server Name|Server Version)"
else
    print_error "PulseAudio is not responding properly"
fi

echo ""
echo "=================================================="
echo "  Configuration Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Reload your shell: ${YELLOW}source ~/.bashrc${NC} (or source ~/.zshrc)"
echo "2. Connect via SSH from your Windows machine"
echo "3. Test audio with: ${YELLOW}speaker-test -t sine -f 1000 -l 1${NC}"
echo ""
echo "If you have AgentVibes installed, test with:"
echo "  ${YELLOW}.claude/hooks/play-tts.sh \"Testing remote audio\"${NC}"
echo ""
echo "For Piper TTS testing, install with:"
echo "  ${YELLOW}~/test-audio.sh \"Hello from remote server\"${NC}"
echo ""
