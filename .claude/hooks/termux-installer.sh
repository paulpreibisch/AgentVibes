#!/bin/bash
#
# AgentVibes Termux/Android Installer
# Installs Piper TTS and dependencies for Android/Termux
#
# Usage: ./termux-installer.sh [--non-interactive]
#
# Requirements:
#   - Termux app installed
#   - termux-api package (for audio playback)
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
NON_INTERACTIVE=false
if [[ "$1" == "--non-interactive" ]]; then
    NON_INTERACTIVE=true
fi

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     AgentVibes Termux/Android Installer                    ║"
echo "║     TTS with Personality for AI Assistants                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Detect if running on Termux
if [[ ! -d "/data/data/com.termux" ]]; then
    echo -e "${RED}Error: This installer is for Termux on Android only${NC}"
    echo "For other platforms, use the standard installer."
    exit 1
fi

echo -e "${GREEN}✓ Detected Termux environment${NC}"
echo ""

# Step 1: Update packages and install dependencies
echo -e "${BLUE}[1/6] Installing system dependencies...${NC}"

pkg update -y 2>/dev/null || true

DEPS="proot-distro ffmpeg sox bc termux-api curl"
for dep in $DEPS; do
    if ! command -v "$dep" &> /dev/null && ! pkg list-installed 2>/dev/null | grep -q "^$dep/"; then
        echo "  Installing $dep..."
        pkg install -y "$dep" 2>/dev/null || echo "  Warning: Failed to install $dep"
    else
        echo -e "  ${GREEN}✓${NC} $dep already installed"
    fi
done

echo ""

# Step 2: Install proot-distro Debian
echo -e "${BLUE}[2/6] Setting up proot-distro Debian...${NC}"

if proot-distro list 2>/dev/null | grep -q "debian.*installed"; then
    echo -e "  ${GREEN}✓${NC} Debian already installed in proot-distro"
else
    echo "  Installing Debian (this may take a few minutes)..."
    proot-distro install debian 2>/dev/null || {
        # Check if it's already installed despite error
        if proot-distro list 2>/dev/null | grep -q "debian"; then
            echo -e "  ${GREEN}✓${NC} Debian is available"
        else
            echo -e "${RED}  Error: Failed to install Debian${NC}"
            exit 1
        fi
    }
fi

echo ""

# Step 3: Download Piper binary inside Debian
echo -e "${BLUE}[3/6] Installing Piper TTS in Debian proot...${NC}"

PIPER_CHECK=$(proot-distro login debian -- ls /root/piper/piper 2>/dev/null || echo "not found")
if [[ "$PIPER_CHECK" != "not found" ]]; then
    echo -e "  ${GREEN}✓${NC} Piper binary already installed"
else
    echo "  Downloading Piper TTS binary..."
    proot-distro login debian -- bash -c "
        mkdir -p /root/piper /root/piper-voices
        cd /root
        curl -L -o piper.tar.gz 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_aarch64.tar.gz'
        tar -xzf piper.tar.gz
        rm piper.tar.gz
        echo 'Piper installed successfully'
    " 2>/dev/null || echo -e "${YELLOW}  Warning: Piper download may have issues${NC}"
fi

# Verify piper works
PIPER_TEST=$(proot-distro login debian -- /root/piper/piper --help 2>/dev/null | head -1 || echo "failed")
if [[ "$PIPER_TEST" == *"usage"* ]]; then
    echo -e "  ${GREEN}✓${NC} Piper binary verified"
else
    echo -e "${YELLOW}  Warning: Piper verification failed, but may still work${NC}"
fi

echo ""

# Step 4: Download voice model
echo -e "${BLUE}[4/6] Downloading voice model...${NC}"

VOICE_MODEL="en_US-lessac-medium"
VOICES_DIR="$HOME/.claude/piper-voices"
mkdir -p "$VOICES_DIR"

if [[ -f "$VOICES_DIR/${VOICE_MODEL}.onnx" ]]; then
    echo -e "  ${GREEN}✓${NC} Voice model already downloaded"
else
    echo "  Downloading ${VOICE_MODEL} (~63MB)..."

    # Download to Termux location (accessible from both Termux and proot)
    curl -L -o "$VOICES_DIR/${VOICE_MODEL}.onnx" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
        2>/dev/null || echo -e "${YELLOW}  Warning: Voice download may have failed${NC}"

    curl -L -o "$VOICES_DIR/${VOICE_MODEL}.onnx.json" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" \
        2>/dev/null || true

    if [[ -f "$VOICES_DIR/${VOICE_MODEL}.onnx" ]]; then
        echo -e "  ${GREEN}✓${NC} Voice model downloaded"
    fi
fi

echo ""

# Step 5: Create piper wrapper script
echo -e "${BLUE}[5/6] Creating Piper wrapper for Termux...${NC}"

WRAPPER_PATH="/data/data/com.termux/files/usr/bin/piper"

cat > "$WRAPPER_PATH" << 'WRAPPER_EOF'
#!/bin/bash
#
# Piper TTS wrapper for Termux
# Runs piper through proot-distro Debian
#

PIPER_DIR="/root/piper"

# Build the piper command with proper quoting
PIPER_CMD="cd $PIPER_DIR && LD_LIBRARY_PATH=. ./piper"

# Add all arguments
for arg in "$@"; do
    PIPER_CMD="$PIPER_CMD \"$arg\""
done

# Run piper, filtering only the proot warning
if [ -t 0 ]; then
    # No stdin
    proot-distro login debian -- bash -c "$PIPER_CMD" 2>&1 | grep -v "proot warning"
else
    # With stdin - need to pass it through
    cat | proot-distro login debian -- bash -c "$PIPER_CMD" 2>&1 | grep -v "proot warning"
fi
WRAPPER_EOF

chmod +x "$WRAPPER_PATH"
echo -e "  ${GREEN}✓${NC} Piper wrapper created at $WRAPPER_PATH"

echo ""

# Step 6: Apply Termux-specific fixes
echo -e "${BLUE}[6/6] Applying Termux-specific fixes...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Fix audio-processor.sh to use Termux temp directory
AUDIO_PROCESSOR="$SCRIPT_DIR/audio-processor.sh"
if [[ -f "$AUDIO_PROCESSOR" ]]; then
    if grep -q 'temp_effects="/tmp/' "$AUDIO_PROCESSOR"; then
        echo "  Patching audio-processor.sh for Termux temp directory..."
        sed -i 's|temp_effects="/tmp/|temp_effects="${TMPDIR:-/data/data/com.termux/files/usr/tmp}/|g' "$AUDIO_PROCESSOR"
        sed -i 's|temp_final="/tmp/|temp_final="${TMPDIR:-/data/data/com.termux/files/usr/tmp}/|g' "$AUDIO_PROCESSOR"
        sed -i "s|trap 'rm -f /tmp/|trap 'rm -f \"\${TMPDIR:-/data/data/com.termux/files/usr/tmp}/|g" "$AUDIO_PROCESSOR"
        echo -e "  ${GREEN}✓${NC} audio-processor.sh patched"
    else
        echo -e "  ${GREEN}✓${NC} audio-processor.sh already patched"
    fi
fi

# Set default voice
CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR"
if [[ ! -f "$CLAUDE_DIR/tts-voice.txt" ]]; then
    echo "$VOICE_MODEL" > "$CLAUDE_DIR/tts-voice.txt"
    echo -e "  ${GREEN}✓${NC} Default voice set to $VOICE_MODEL"
fi

# Set provider to piper
if [[ ! -f "$CLAUDE_DIR/tts-provider.txt" ]]; then
    echo "piper" > "$CLAUDE_DIR/tts-provider.txt"
    echo -e "  ${GREEN}✓${NC} TTS provider set to piper"
fi

echo ""

# Step 7: Install Clawdbot SSH receiver
echo -e "${BLUE}[7/7] Installing Clawdbot SSH receiver...${NC}"

TERMUX_DIR="$HOME/.termux"
mkdir -p "$TERMUX_DIR"

# Create wrapper script at ~/.termux/agentvibes-play.sh
# This calls the main receiver in AgentVibes hooks
cat > "$TERMUX_DIR/agentvibes-play.sh" << 'EOF'
#!/usr/bin/env bash
# AgentVibes Clawdbot Receiver Wrapper
# Installed by AgentVibes Termux installer
# Forwards to main receiver script in AgentVibes

# Find AgentVibes installation
if [[ -f "$HOME/agentvibes/.claude/hooks/clawdbot-receiver.sh" ]]; then
  exec bash "$HOME/agentvibes/.claude/hooks/clawdbot-receiver.sh" "$@"
elif [[ -f "$HOME/AgentVibes-dev/.claude/hooks/clawdbot-receiver.sh" ]]; then
  exec bash "$HOME/AgentVibes-dev/.claude/hooks/clawdbot-receiver.sh" "$@"
else
  echo "❌ AgentVibes clawdbot-receiver.sh not found" >&2
  exit 1
fi
EOF

chmod +x "$TERMUX_DIR/agentvibes-play.sh"
echo -e "  ${GREEN}✓${NC} Clawdbot receiver installed at ~/.termux/agentvibes-play.sh"

# Also create fallback at ~/.agentvibes/play-remote.sh
AGENTVIBES_DIR="$HOME/.agentvibes"
mkdir -p "$AGENTVIBES_DIR"
ln -sf "$TERMUX_DIR/agentvibes-play.sh" "$AGENTVIBES_DIR/play-remote.sh" 2>/dev/null || \
  cp "$TERMUX_DIR/agentvibes-play.sh" "$AGENTVIBES_DIR/play-remote.sh"
echo -e "  ${GREEN}✓${NC} Fallback link created at ~/.agentvibes/play-remote.sh"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  To test TTS:"
echo "    echo 'Hello world' | piper -m ~/.claude/piper-voices/en_US-lessac-medium.onnx -f ~/test.wav"
echo "    termux-media-player play ~/test.wav"
echo ""
echo "  To enable background music:"
echo "    .claude/hooks/background-music-manager.sh on"
echo ""
echo "  Available background tracks:"
echo "    .claude/hooks/background-music-manager.sh list"
echo ""
echo -e "${BLUE}Enjoy AgentVibes on Android! 🎤${NC}"
echo ""
