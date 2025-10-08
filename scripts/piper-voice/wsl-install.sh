#!/bin/bash
# WSL Installation Script for Piper TTS
# A fast, local neural text-to-speech system for offline voice generation
# Author: AgentVibes Team
# License: Apache-2.0
# Version: 1.1.3

set -e  # Exit on error

# Color codes
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
ORANGE='\033[0;33m'
GREEN='\033[0;32m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Clear screen for better presentation
clear

# AgentVibes Banner (smaller version)
echo -e "${CYAN}"
cat << "EOF"
   _                    _   __   ___  _
  /_\  __ _  ___ _ _  _| |_\ \ / (_)| |__  ___  ___
 / _ \/ _` |/ -_) ' \|  _|\ V /| || '_ \/ -_)(_-<
/_/ \_\__, |\___|_||_|\__| \_/ |_||_.__/\___//__/
      |___/
EOF
echo -e "${NC}"

# Piper Installation Banner (orange)
echo -e "${ORANGE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║        🎵  Piper Sound Installation Script  🎵        ║
║                                                       ║
║     Fast • Local • Free Neural Text-to-Speech        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "${GRAY}Version: 1.1.3${NC}"
echo ""

echo -e "${GRAY}This script will install:${NC}"
echo -e "  ${GREEN}•${NC} Piper TTS (neural text-to-speech system)"
echo -e "  ${GREEN}•${NC} English US voice (medium quality - ~20MB)"
echo -e "  ${GREEN}•${NC} All required dependencies"
echo ""

# Check if running in WSL
if ! grep -qi microsoft /proc/version; then
    echo -e "${ORANGE}⚠️  Warning: This doesn't appear to be WSL${NC}"
    echo -e "${GRAY}   This script is designed for WSL (Windows Subsystem for Linux)${NC}"
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${ORANGE}❌ Error: Do not run this script as root (no sudo)${NC}"
   echo -e "${GRAY}   The script will ask for sudo when needed${NC}"
   exit 1
fi

echo -e "${CYAN}📦 Step 1: Installing system dependencies...${NC}"
echo -e "${GRAY}   This requires sudo access${NC}"
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv pipx

echo ""
echo -e "${CYAN}🔧 Step 2: Configuring pipx...${NC}"
pipx ensurepath

# Add to shell config files if not already present
if [ -f "$HOME/.bashrc" ] && ! grep -q '$HOME/.local/bin' "$HOME/.bashrc"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    echo -e "${GRAY}   Added to ~/.bashrc${NC}"
fi

if [ -f "$HOME/.zshrc" ] && ! grep -q '$HOME/.local/bin' "$HOME/.zshrc"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
    echo -e "${GRAY}   Added to ~/.zshrc${NC}"
fi

# Source the updated PATH for current session
export PATH="$HOME/.local/bin:$PATH"

echo ""
echo -e "${CYAN}⬇️  Step 3: Installing Piper TTS...${NC}"
pipx install piper-tts

echo ""
echo -e "${CYAN}📂 Step 4: Creating voice directory...${NC}"
VOICE_DIR="$HOME/.local/share/piper/voices"
mkdir -p "$VOICE_DIR"

echo ""
echo -e "${CYAN}🗣️  Step 5: Downloading English US voice (medium quality)...${NC}"
echo -e "${GRAY}   Voice: en_US-lessac-medium (~20MB)${NC}"
echo -e "${GRAY}   Source: HuggingFace (rhasspy/piper-voices)${NC}"

cd "$VOICE_DIR"

# Download voice model
if [ ! -f "en_US-lessac-medium.onnx" ]; then
    echo -e "${GRAY}   Downloading model file...${NC}"
    wget -q --show-progress \
        https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
        -O en_US-lessac-medium.onnx
else
    echo -e "${GREEN}   ✓ Model file already exists${NC}"
fi

# Download voice config
if [ ! -f "en_US-lessac-medium.onnx.json" ]; then
    echo -e "${GRAY}   Downloading config file...${NC}"
    wget -q --show-progress \
        https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json \
        -O en_US-lessac-medium.onnx.json
else
    echo -e "${GREEN}   ✓ Config file already exists${NC}"
fi

echo ""
echo -e "${CYAN}🧪 Step 6: Testing Piper installation...${NC}"
TEST_FILE="/tmp/piper-test-$(date +%s).wav"

echo -e "${GRAY}   Generating test audio...${NC}"
echo "Well, hi there, Piper! Installation successful. We hope you have fun with AgentVibes." | \
    ~/.local/bin/piper --model "$VOICE_DIR/en_US-lessac-medium.onnx" \
    --output_file "$TEST_FILE"

if [ -f "$TEST_FILE" ]; then
    echo -e "${GREEN}   ✓ Audio file generated successfully${NC}"

    # Try to play the audio
    if command -v paplay &> /dev/null; then
        echo -e "${GRAY}   Playing test audio with paplay...${NC}"
        paplay "$TEST_FILE" 2>/dev/null || echo -e "${ORANGE}   ⚠️  Could not play audio (but file was generated)${NC}"
    elif command -v aplay &> /dev/null; then
        echo -e "${GRAY}   Playing test audio with aplay...${NC}"
        aplay "$TEST_FILE" 2>/dev/null || echo -e "${ORANGE}   ⚠️  Could not play audio (but file was generated)${NC}"
    else
        echo -e "${ORANGE}   ⚠️  No audio player found (paplay/aplay), but audio file was generated${NC}"
        echo -e "${GRAY}   Install pulseaudio-utils: sudo apt-get install pulseaudio-utils${NC}"
    fi

    rm -f "$TEST_FILE"
else
    echo -e "${ORANGE}   ❌ Error: Failed to generate test audio${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║          ✅  Installation Complete!  ✅               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}📍 Installation Details:${NC}"
echo -e "${GRAY}   Piper binary: ~/.local/bin/piper${NC}"
echo -e "${GRAY}   Voice directory: $VOICE_DIR${NC}"
echo -e "${GRAY}   Default voice: en_US-lessac-medium${NC}"
echo ""
echo -e "${CYAN}🎯 Quick Usage:${NC}"
echo -e "${GRAY}   # Generate speech from text${NC}"
echo -e "   ${GREEN}echo \"Hello world\" | piper --model $VOICE_DIR/en_US-lessac-medium.onnx --output_file output.wav${NC}"
echo ""
echo -e "${GRAY}   # Play immediately${NC}"
echo -e "   ${GREEN}echo \"Hello world\" | piper --model $VOICE_DIR/en_US-lessac-medium.onnx --output_file - | paplay${NC}"
echo ""
echo -e "${CYAN}📚 Additional Voices:${NC}"
echo -e "${GRAY}   Browse available voices at:${NC}"
echo -e "   ${MAGENTA}https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0${NC}"
echo ""
echo -e "${GRAY}   Download more voices to: ${GREEN}$VOICE_DIR${NC}"
echo ""
echo -e "${CYAN}🔗 Next Steps:${NC}"
echo -e "   ${GREEN}•${NC} Test Piper: ${GRAY}echo \"Test\" | piper --model $VOICE_DIR/en_US-lessac-medium.onnx --output_file - | paplay${NC}"
echo -e "   ${GREEN}•${NC} Download more voices from HuggingFace"
echo -e "   ${GREEN}•${NC} Integrate with AgentVibes (coming soon!)"
echo ""
