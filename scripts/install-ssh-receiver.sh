#!/usr/bin/env bash
#
# File: scripts/install-ssh-receiver.sh
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# AgentVibes SSH-Remote Receiver Installer (v2)
# Installs the self-contained receiver script for SSH TTS playback.
#
# The receiver accepts a single base64-encoded JSON payload containing
# text, voice, effects, music, and project info from the sender.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/scripts/install-ssh-receiver.sh | bash
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under Apache-2.0
#

set -euo pipefail

echo ""
echo "  AgentVibes SSH Receiver Setup"
echo "  =============================="
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

echo "  Platform: $PLATFORM"

# ---------------------------------------------------------------------------
# Check dependencies
# ---------------------------------------------------------------------------

MISSING=()

if ! command -v piper >/dev/null 2>&1; then
    MISSING+=("piper")
fi

if ! command -v sox >/dev/null 2>&1; then
    echo "  [warn] sox not found — effects will be skipped"
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "  [warn] ffmpeg not found — background music will be skipped"
fi

# Check for audio player
AUDIO_PLAYER=""
if command -v pw-play >/dev/null 2>&1; then
    AUDIO_PLAYER="pw-play"
elif command -v paplay >/dev/null 2>&1; then
    AUDIO_PLAYER="paplay"
elif command -v aplay >/dev/null 2>&1; then
    AUDIO_PLAYER="aplay"
fi

if [[ -z "$AUDIO_PLAYER" ]]; then
    MISSING+=("audio player (pw-play, paplay, or aplay)")
fi

if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo ""
    echo "  Missing required dependencies:"
    for dep in "${MISSING[@]}"; do
        echo "    - $dep"
    done
    echo ""
    echo "  Install piper: pipx install piper-tts"
    echo "  Install audio: sudo apt install pipewire-utils (or pulseaudio-utils)"
    exit 1
fi

echo "  Audio player: $AUDIO_PLAYER"

# ---------------------------------------------------------------------------
# Install receiver script
# ---------------------------------------------------------------------------

# SECURITY: Create install directory with restrictive permissions
mkdir -p "$INSTALL_DIR"
chmod 700 "$INSTALL_DIR"

RECEIVER_SCRIPT="$INSTALL_DIR/play-remote.sh"

echo "  Installing to: $RECEIVER_SCRIPT"

# Try to download from GitHub (main branch)
DOWNLOADED=false
if command -v curl >/dev/null 2>&1; then
    if curl -fsSL -o "$RECEIVER_SCRIPT" \
        "https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/templates/agentvibes-receiver.sh" 2>/dev/null; then
        DOWNLOADED=true
        echo "  Downloaded from GitHub"
    fi
fi

if [[ "$DOWNLOADED" != "true" ]]; then
    echo "  [error] Failed to download receiver script" >&2
    echo "  Try: curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/templates/agentvibes-receiver.sh -o $RECEIVER_SCRIPT" >&2
    exit 1
fi

# Make executable
chmod +x "$RECEIVER_SCRIPT"

# Create log directory
mkdir -p "$HOME/.agentvibes"

# ---------------------------------------------------------------------------
# Create voice directory if needed
# ---------------------------------------------------------------------------

VOICES_DIR="$HOME/.claude/piper-voices"
if [[ ! -d "$VOICES_DIR" ]]; then
    echo ""
    echo "  Voice models directory not found: $VOICES_DIR"
    echo "  You'll need to download at least one piper voice model."
    echo "  Example: piper --download-dir $VOICES_DIR --model en_US-lessac-medium"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "  Installation complete!"
echo ""
echo "  Receiver script: $RECEIVER_SCRIPT"
echo "  Log file:        $HOME/.agentvibes/receiver.log"
echo "  Voice models:    $VOICES_DIR"
echo ""

# ---------------------------------------------------------------------------
# Dedicated user setup (optional but recommended)
# ---------------------------------------------------------------------------

echo "  =============================================="
echo "  OPTION A: Same-user mode (simpler)"
echo "  =============================================="
echo "  Already done! The receiver runs as your user."
echo ""
echo "  OPTION B: Dedicated user (more secure)"
echo "  =============================================="
echo ""
echo "  Run these commands to set up a dedicated receiver user:"
echo ""
echo "    # 1. Create user and add to audio + your group"
echo "    sudo useradd -m -s /bin/bash agentvibes-receiver"
echo "    sudo usermod -aG audio,\$(id -gn) agentvibes-receiver"
echo ""
echo "    # 2. Install receiver for dedicated user"
echo "    sudo cp $RECEIVER_SCRIPT /home/agentvibes-receiver/.agentvibes/play-remote.sh"
echo "    sudo chown agentvibes-receiver:agentvibes-receiver /home/agentvibes-receiver/.agentvibes/play-remote.sh"
echo ""
echo "    # 3. Grant audio session access (PipeWire/PulseAudio)"
echo "    sudo setfacl -m u:agentvibes-receiver:rx /run/user/\$(id -u)"
echo "    # Persist across reboots:"
echo "    echo \"a /run/user/\$(id -u) - - - - m:u:agentvibes-receiver:rx\" \\"
echo "      | sudo tee /etc/tmpfiles.d/agentvibes-receiver.conf"
echo ""
echo "    # 4. Grant read access to voices"
echo "    sudo setfacl -R -m u:agentvibes-receiver:rx $VOICES_DIR"
echo ""
echo "    # 5. ForceCommand in /etc/ssh/sshd_config:"
echo "    #   Match User agentvibes-receiver"
echo "    #       ForceCommand /home/agentvibes-receiver/.agentvibes/play-remote.sh"
echo "    #       PasswordAuthentication no"
echo "    #       PermitTTY no"
echo "    # Then: sudo systemctl reload sshd"
echo ""
echo "  =============================================="
echo "  SENDER SETUP (on the remote server)"
echo "  =============================================="
echo ""
echo "    echo 'receiver-hostname' > .claude/ssh-remote-host.txt"
echo ""
echo "  Test from sender:"
echo "    ssh receiver-host \$(echo '{\"text\":\"hello\",\"voice\":\"en_US-lessac-medium\"}' | base64 -w 0)"
echo ""
