#!/usr/bin/env bash
#
# File: .claude/hooks/piper-installer.sh
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
#
# Usage: piper-installer.sh [--non-interactive]
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose and noninfringement.
# In no event shall the authors or copyright holders be liable for any claim,
# damages or other liability, whether in an action of contract, tort or
# otherwise, arising from, out of or in connection with the software or the
# use or other dealings in the software.
#
# ---
#
# @fileoverview Piper TTS Installer - Installs Piper TTS via pipx and downloads initial voice models
# @context Automated installation script for free offline Piper TTS on WSL/Linux systems
# @architecture Helper script for AgentVibes installer, invoked manually or from provider switcher
# @dependencies pipx (Python package installer), apt-get/brew/dnf/pacman (for pipx installation)
# @entrypoints Called by src/installer.js or manually by users during setup
# @patterns Platform detection (WSL/Linux only), package manager abstraction, guided voice download
# @related piper-download-voices.sh, provider-manager.sh, src/installer.js
#

set -e  # Exit on error

# Parse command line arguments
NON_INTERACTIVE=false
if [[ "$1" == "--non-interactive" ]]; then
  NON_INTERACTIVE=true
fi

echo "🎤 Piper TTS Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect platform
PLATFORM="$(uname -s)"
ARCH="$(uname -m)"

# Check if running on Termux/Android first
if [[ -d "/data/data/com.termux" ]]; then
  echo "📱 Detected Termux/Android"
  echo ""
  echo "   Termux requires a special installation process using proot-distro."
  echo "   Running Termux-specific installer..."
  echo ""
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "$SCRIPT_DIR/termux-installer.sh" ]]; then
    exec "$SCRIPT_DIR/termux-installer.sh" "$@"
  else
    echo "❌ Error: termux-installer.sh not found"
    echo "   Please download it from the AgentVibes repository"
    exit 1
  fi
fi

# Check if running on macOS, WSL, or Linux
if [[ "$PLATFORM" == "Darwin" ]]; then
  IS_MACOS=true
  echo "🍎 Detected macOS"
elif grep -qi microsoft /proc/version 2>/dev/null || [[ "$PLATFORM" == "Linux" ]]; then
  IS_MACOS=false
  echo "🐧 Detected Linux/WSL"
else
  echo "❌ Unsupported platform: $PLATFORM"
  echo ""
  echo "   For Windows, use macOS provider instead:"
  echo "   /agent-vibes:provider switch macos"
  exit 1
fi

INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"
# pipx and the private venv both put piper in ~/.local/bin; play-tts-piper.sh
# adds it to PATH too, so non-login shells find it.
export PATH="$INSTALL_DIR:$PATH"

# A piper that is on PATH but cannot start is not an install. The old macOS
# release binaries fail this way (their dylibs do not load), and treating them
# as installed left Macs silent.
piper_works() {
  "$1" --help >/dev/null 2>&1
}

if EXISTING_PIPER=$(command -v piper 2>/dev/null); then
  if piper_works "$EXISTING_PIPER"; then
    echo "✅ Piper TTS is already installed!"
    echo "   Location: $EXISTING_PIPER"
    echo ""
    echo "   Download voices with: .claude/hooks/piper-download-voices.sh"
    exit 0
  fi
  echo "⚠️  Found piper at $EXISTING_PIPER, but it does not run. Replacing it."
  if [[ "$EXISTING_PIPER" == "$INSTALL_DIR/piper" ]]; then
    mv -f "$EXISTING_PIPER" "$EXISTING_PIPER.broken"
  fi
  echo ""
fi

echo "📦 Installing Piper TTS..."
echo ""

# pipx is used when it is present. Linux installs it from the package manager;
# macOS skips that, since a Homebrew pipx pulls in a whole Python build.
ensure_pipx() {
  command -v pipx &> /dev/null && return 0
  [[ "$IS_MACOS" == true ]] && return 1

  echo "⚠️  pipx not found. Installing pipx first..."
  echo ""
  if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu — DEBIAN_FRONTEND prevents tzdata interactive prompt
    DEBIAN_FRONTEND=noninteractive sudo -E apt-get update -qq || return 1
    DEBIAN_FRONTEND=noninteractive sudo -E apt-get install -y pipx || return 1
  elif command -v brew &> /dev/null; then
    brew install pipx || return 1
  elif command -v dnf &> /dev/null; then
    sudo dnf install -y pipx || return 1
  elif command -v pacman &> /dev/null; then
    sudo pacman -S --noconfirm python-pipx || return 1
  else
    return 1
  fi
  pipx ensurepath 2>/dev/null || true
}

install_with_pipx() {
  ensure_pipx || return 1
  echo "📥 Installing Piper TTS via pipx..."
  # Pin the bin dir: a user PIPX_BIN_DIR would put piper where the check below
  # does not look.
  PIPX_BIN_DIR="$INSTALL_DIR" pipx install --force piper-tts || return 1
}

# Needs nothing but python3 (3.9+), which every Mac with the command line
# tools has. piper-tts ships prebuilt wheels for Apple Silicon and Intel.
install_with_venv() {
  local venv="$HOME/.local/share/agentvibes/piper-venv"
  command -v python3 &> /dev/null || return 1
  echo "📥 Installing Piper TTS into $venv..."
  python3 -m venv "$venv" || return 1
  "$venv/bin/python" -m pip install --quiet --upgrade pip || return 1
  "$venv/bin/python" -m pip install --quiet piper-tts || return 1
  ln -sf "$venv/bin/piper" "$INSTALL_DIR/piper" || return 1
}

if ! install_with_pipx || ! piper_works "$INSTALL_DIR/piper"; then
  install_with_venv || true
fi

if ! piper_works "$INSTALL_DIR/piper"; then
  echo ""
  echo "❌ Piper TTS could not be installed."
  echo ""
  if [[ "$IS_MACOS" == true ]]; then
    echo "   Install the command line tools (xcode-select --install), then run this again."
  else
    echo "   Install pipx (https://pipx.pypa.io/stable/installation/) or python3-venv, then run this again."
  fi
  exit 1
fi

echo ""
echo "✅ Piper TTS installed successfully!"
echo ""

# Use full path since PATH hasn't been updated in current session
PIPER_VERSION=$($INSTALL_DIR/piper --version 2>&1 || echo "unknown")
echo "   Version: $PIPER_VERSION"
echo ""

# Determine voices directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

# Check for configured voices directory
VOICES_DIR=""
if [[ -f "$CLAUDE_DIR/piper-voices-dir.txt" ]]; then
  VOICES_DIR=$(cat "$CLAUDE_DIR/piper-voices-dir.txt")
elif [[ -f "$HOME/.claude/piper-voices-dir.txt" ]]; then
  VOICES_DIR=$(cat "$HOME/.claude/piper-voices-dir.txt")
else
  VOICES_DIR="$HOME/.claude/piper-voices"
fi

echo "📁 Voice storage location: $VOICES_DIR"
echo ""

# Ask if user wants to download voices now (skip in non-interactive mode)
DOWNLOAD_VOICES=true
if [[ "$NON_INTERACTIVE" == "false" ]]; then
  read -p "Would you like to download voice models now? [Y/n] " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
    DOWNLOAD_VOICES=false
  fi
else
  echo "📥 Auto-downloading recommended voices (non-interactive mode)..."
  echo ""
fi

if [[ "$DOWNLOAD_VOICES" == "true" ]]; then
  echo ""
  echo "📥 Downloading recommended voices..."
  echo ""

  # Use the piper-download-voices.sh script if available
  if [[ -f "$SCRIPT_DIR/piper-download-voices.sh" ]]; then
    "$SCRIPT_DIR/piper-download-voices.sh" --yes
  else
    # Manual download of a basic voice
    mkdir -p "$VOICES_DIR"

    echo "Downloading en_US-lessac-medium (recommended)..."
    curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
      -o "$VOICES_DIR/en_US-lessac-medium.onnx"
    curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" \
      -o "$VOICES_DIR/en_US-lessac-medium.onnx.json"

    echo "✅ Voice downloaded!"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Piper TTS Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Download more voices: .claude/hooks/piper-download-voices.sh"
echo "  2. List available voices: /agent-vibes:list"
echo "  3. Test it out: /agent-vibes:preview"
echo ""
echo "Enjoy your free, offline TTS! 🎤"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
