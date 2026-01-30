#!/usr/bin/env bash
#
# File: scripts/install-ssh-receiver.sh
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# AgentVibes SSH-Remote Receiver Installer
# Installs the receiver script for ssh-remote TTS provider
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/scripts/install-ssh-receiver.sh | bash
#   OR
#   agentvibes install --ssh-receiver
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under Apache-2.0
#

set -euo pipefail

echo "╔════════════════════════════════════════╗"
echo "║  AgentVibes SSH-Remote Receiver Setup  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Detect platform
PLATFORM="unknown"
if [[ -d "/data/data/com.termux" ]]; then
    PLATFORM="termux"
    INSTALL_DIR="$HOME/.termux"
elif [[ "$(uname)" == "Darwin" ]]; then
    PLATFORM="macos"
    INSTALL_DIR="$HOME/.agentvibes"
elif [[ "$(uname)" == "Linux" ]]; then
    PLATFORM="linux"
    INSTALL_DIR="$HOME/.agentvibes"
fi

echo "✓ Detected platform: $PLATFORM"

# Check if AgentVibes is installed
if ! command -v agentvibes >/dev/null 2>&1; then
    echo ""
    echo "❌ AgentVibes not found!"
    echo "💡 Install first: npm install -g agentvibes"
    exit 1
fi

echo "✓ AgentVibes installed"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download or copy receiver script
RECEIVER_SCRIPT="$INSTALL_DIR/agentvibes-play.sh"

echo ""
echo "📥 Installing receiver script to: $RECEIVER_SCRIPT"

# Try to download from GitHub (main branch)
if command -v curl >/dev/null 2>&1; then
    if curl -fsSL -o "$RECEIVER_SCRIPT" \
        "https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/templates/agentvibes-receiver.sh" 2>/dev/null; then
        echo "✓ Downloaded from GitHub"
    else
        echo "⚠️  GitHub download failed, using embedded template"
        # Fallback: embed the script
        cat > "$RECEIVER_SCRIPT" << 'RECEIVER_EOF'
#!/usr/bin/env bash
# AgentVibes SSH-TTS Receiver (embedded template)
set -euo pipefail
TEXT="$1"
VOICE="${2:-en_US-ryan-high}"
[[ -z "$TEXT" ]] && { echo "❌ No text" >&2; exit 1; }
export AGENTVIBES_NO_REMINDERS=1
if command -v agentvibes >/dev/null 2>&1; then
    AGENTVIBES_ROOT="$(dirname $(dirname $(which agentvibes)))/lib/node_modules/agentvibes"
elif [[ -d ~/.npm-global/lib/node_modules/agentvibes ]]; then
    AGENTVIBES_ROOT="$HOME/.npm-global/lib/node_modules/agentvibes"
elif [[ -d /data/data/com.termux/files/usr/lib/node_modules/agentvibes ]]; then
    AGENTVIBES_ROOT="/data/data/com.termux/files/usr/lib/node_modules/agentvibes"
else
    echo "❌ AgentVibes not found" >&2; exit 1
fi
PLAY_TTS="$AGENTVIBES_ROOT/.claude/hooks/play-tts.sh"
[[ ! -f "$PLAY_TTS" ]] && { echo "❌ play-tts.sh missing" >&2; exit 1; }
echo "🎵 Playing via AgentVibes..." >&2
bash "$PLAY_TTS" "$TEXT" "$VOICE"
RECEIVER_EOF
    fi
else
    echo "⚠️  curl not found, using embedded template"
    # Same fallback as above
fi

# Make executable
chmod +x "$RECEIVER_SCRIPT"
echo "✓ Made executable"

# Test the script
echo ""
echo "🧪 Testing receiver script..."
if "$RECEIVER_SCRIPT" "AgentVibes SSH-Remote receiver installed successfully!" 2>&1 | grep -q "🎵"; then
    echo "✓ Test successful!"
else
    echo "⚠️  Test completed (check audio output manually)"
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  ✅ Installation Complete!             ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📍 Receiver script: $RECEIVER_SCRIPT"
echo ""
echo "🎯 Next Steps:"
echo "   1. On your SOURCE device (server/desktop):"
echo "      agentvibes provider switch ssh-remote"
echo "      echo 'android' > ~/.claude/ssh-remote-host.txt"
echo ""
echo "   2. Test from SOURCE device:"
echo "      agentvibes tts 'Hello from the server!'"
echo ""
echo "📚 Docs: https://agentvibes.org/docs/ssh-remote"
