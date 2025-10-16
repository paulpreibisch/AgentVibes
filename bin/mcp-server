#!/usr/bin/env bash
#
# AgentVibes MCP Server Wrapper with Auto-Install
#
# This script is called by Claude Desktop via npx:
#   npx -y agentvibes mcp-server
#
# It auto-installs dependencies when possible and provides helpful errors when not.
#

set -e

# Find the directory where this script lives
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Package root is one level up from bin/
PACKAGE_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Path to the Python MCP server
MCP_SERVER="$PACKAGE_ROOT/mcp-server/server.py"

# Detect OS for platform-specific instructions
OS="$(uname -s)"

# Ensure the server file exists
if [ ! -f "$MCP_SERVER" ]; then
    echo "❌ Error: MCP server not found at $MCP_SERVER" >&2
    exit 1
fi

# Function to print section headers
print_section() {
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "$1" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
}

# Check Python
if ! command -v python3 &> /dev/null; then
    print_section "❌ Python 3 Not Found"
    echo "AgentVibes MCP server requires Python 3.10 or newer." >&2
    echo "" >&2
    echo "📖 Install Python:" >&2

    case "$OS" in
        Linux*)
            echo "   sudo apt install python3        # Ubuntu/Debian" >&2
            echo "   sudo yum install python3        # RedHat/CentOS" >&2
            ;;
        Darwin*)
            echo "   brew install python3            # macOS (requires Homebrew)" >&2
            echo "   Or download from: https://python.org" >&2
            ;;
        *)
            echo "   Download from: https://python.org" >&2
            ;;
    esac

    echo "" >&2
    echo "💡 After installing Python, restart Claude Desktop" >&2
    echo "" >&2
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "🐍 Python $PYTHON_VERSION detected" >&2

# Auto-install Python mcp package
if ! python3 -c "import mcp" 2>/dev/null; then
    print_section "📦 Installing Python MCP Package"
    echo "Installing 'mcp' package to enable Claude Desktop integration..." >&2

    if python3 -m pip install --user mcp --quiet 2>&1; then
        echo "✅ Python MCP package installed successfully!" >&2
    else
        echo "❌ Failed to auto-install MCP package" >&2
        echo "" >&2
        echo "💡 Try manually:" >&2
        echo "   python3 -m pip install --user mcp" >&2
        echo "" >&2
        exit 1
    fi
else
    echo "✅ Python MCP package already installed" >&2
fi

# Check provider (Piper vs ElevenLabs)
PROVIDER_FILE="$PACKAGE_ROOT/.claude/tts-provider.txt"
PROVIDER="elevenlabs"  # Default

if [ -f "$PROVIDER_FILE" ]; then
    PROVIDER=$(cat "$PROVIDER_FILE" | tr -d '[:space:]')
fi

# If using Piper, ensure it's installed
if [ "$PROVIDER" = "piper" ]; then
    if ! command -v piper &> /dev/null; then
        # Piper not found, try to auto-install

        # First check if pipx is available
        if ! command -v pipx &> /dev/null; then
            print_section "📦 Installing pipx"
            echo "pipx is needed to install Piper TTS..." >&2

            if python3 -m pip install --user pipx --quiet 2>&1; then
                # Add pipx to PATH for this session
                export PATH="$HOME/.local/bin:$PATH"

                # Ensure pipx is set up
                python3 -m pipx ensurepath >/dev/null 2>&1 || true

                echo "✅ pipx installed successfully!" >&2
            else
                echo "⚠️  Could not auto-install pipx" >&2
                echo "" >&2
                echo "📖 Install pipx manually:" >&2
                case "$OS" in
                    Linux*)
                        echo "   sudo apt install pipx       # Ubuntu/Debian" >&2
                        ;;
                    Darwin*)
                        echo "   brew install pipx           # macOS" >&2
                        ;;
                    *)
                        echo "   python3 -m pip install --user pipx" >&2
                        ;;
                esac
                echo "" >&2
                echo "⚠️  Continuing without Piper (TTS will not work)" >&2
            fi
        fi

        # Now try to install Piper with pipx
        if command -v pipx &> /dev/null; then
            print_section "📦 Installing Piper TTS"
            echo "Installing Piper TTS (free, offline voice synthesis)..." >&2

            if pipx install piper-tts --quiet 2>&1; then
                echo "✅ Piper TTS installed successfully!" >&2

                # Add pipx bin to PATH
                export PATH="$HOME/.local/bin:$PATH"
            else
                echo "⚠️  Could not auto-install Piper TTS" >&2
                echo "" >&2
                echo "💡 Try manually:" >&2
                echo "   pipx install piper-tts" >&2
                echo "" >&2
                echo "⚠️  Continuing without Piper (TTS will not work)" >&2
            fi
        fi
    else
        echo "✅ Piper TTS already installed" >&2
    fi

    # Auto-download default voice if needed
    if command -v piper &> /dev/null; then
        # Source the voice manager for download functions
        if [ -f "$PACKAGE_ROOT/.claude/hooks/piper-voice-manager.sh" ]; then
            source "$PACKAGE_ROOT/.claude/hooks/piper-voice-manager.sh"

            # Default voice for Piper
            DEFAULT_VOICE="en_US-lessac-medium"

            # Check if default voice is downloaded
            if ! verify_voice "$DEFAULT_VOICE" 2>/dev/null; then
                print_section "📥 Downloading Default Voice"
                echo "Downloading voice model: $DEFAULT_VOICE (~25MB)..." >&2
                echo "Source: HuggingFace (rhasspy/piper-voices)" >&2

                if download_voice "$DEFAULT_VOICE" 2>&1 | grep -v "^📥" | grep -v "Source:" | grep -v "Size:" >&2; then
                    echo "✅ Default voice downloaded successfully!" >&2
                else
                    echo "⚠️  Could not download default voice" >&2
                    echo "   Voice will download on first TTS request" >&2
                fi
            else
                echo "✅ Default Piper voice ready" >&2
            fi
        fi
    fi
elif [ "$PROVIDER" = "elevenlabs" ]; then
    # Check for ElevenLabs API key
    if [ -z "$ELEVENLABS_API_KEY" ]; then
        echo "⚠️  ElevenLabs selected but ELEVENLABS_API_KEY not set" >&2
        echo "" >&2
        echo "📖 Set your API key:" >&2
        echo "   export ELEVENLABS_API_KEY='your-key-here'" >&2
        echo "" >&2
        echo "💡 Or switch to Piper TTS (free):" >&2
        echo "   echo 'piper' > $PACKAGE_ROOT/.claude/tts-provider.txt" >&2
        echo "" >&2
    else
        echo "✅ ElevenLabs API key configured" >&2
    fi
fi

# All checks passed, run the MCP server
echo "" >&2
echo "🚀 Starting AgentVibes MCP Server..." >&2
echo "" >&2

# Run the Python MCP server
exec python3 "$MCP_SERVER"
