#!/usr/bin/env bash
#
# File: scripts/setup-receiver-user.sh
#
# Sets up the agentvibes-receiver dedicated user with voices, tracks,
# audio permissions, and the receiver script. Run with sudo.
#
# Usage: sudo bash scripts/setup-receiver-user.sh
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under Apache-2.0
#

set -euo pipefail

# ---------------------------------------------------------------------------
# Must run as root
# ---------------------------------------------------------------------------

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Error: This script must be run with sudo" >&2
  echo "Usage: sudo bash $0" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Detect the desktop user (whoever invoked sudo)
# ---------------------------------------------------------------------------

DESKTOP_USER="${SUDO_USER:-}"
if [[ -z "$DESKTOP_USER" ]]; then
  echo "Error: Could not detect desktop user. Run with: sudo bash $0" >&2
  exit 1
fi

DESKTOP_HOME=$(getent passwd "$DESKTOP_USER" | cut -d: -f6)
DESKTOP_UID=$(id -u "$DESKTOP_USER")
RECEIVER_USER="agentvibes-receiver"
RECEIVER_HOME="/home/$RECEIVER_USER"

echo ""
echo "  AgentVibes Receiver User Setup"
echo "  ==============================="
echo ""
echo "  Desktop user:  $DESKTOP_USER ($DESKTOP_HOME)"
echo "  Receiver user: $RECEIVER_USER ($RECEIVER_HOME)"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Create receiver user if needed
# ---------------------------------------------------------------------------

if id "$RECEIVER_USER" &>/dev/null; then
  echo "  [ok] User $RECEIVER_USER already exists"
else
  echo "  [+] Creating user $RECEIVER_USER..."
  useradd -m -s /bin/bash "$RECEIVER_USER"
fi

# Add to audio group and desktop user's group
usermod -aG audio "$RECEIVER_USER" 2>/dev/null || true
usermod -aG "$(id -gn "$DESKTOP_USER")" "$RECEIVER_USER" 2>/dev/null || true
echo "  [ok] Groups: audio, $(id -gn "$DESKTOP_USER")"

# ---------------------------------------------------------------------------
# Step 2: Create directory structure
# ---------------------------------------------------------------------------

echo "  [+] Creating directories..."
mkdir -p "$RECEIVER_HOME/.claude/piper-voices"
mkdir -p "$RECEIVER_HOME/.claude/audio/tracks"
mkdir -p "$RECEIVER_HOME/.agentvibes"

# ---------------------------------------------------------------------------
# Step 3: Copy voices
# ---------------------------------------------------------------------------

VOICES_SRC="$DESKTOP_HOME/.claude/piper-voices"
if [[ -d "$VOICES_SRC" ]]; then
  echo "  [+] Copying voice models..."
  VOICE_COUNT=0
  for f in "$VOICES_SRC"/*.onnx; do
    [[ -f "$f" ]] || continue
    cp -u "$f" "$RECEIVER_HOME/.claude/piper-voices/"
    # Copy config json if exists
    [[ -f "${f}.json" ]] && cp -u "${f}.json" "$RECEIVER_HOME/.claude/piper-voices/"
    VOICE_COUNT=$((VOICE_COUNT + 1))
  done
  echo "  [ok] Copied $VOICE_COUNT voice models"
else
  echo "  [warn] No voices found at $VOICES_SRC"
fi

# ---------------------------------------------------------------------------
# Step 4: Copy music tracks
# ---------------------------------------------------------------------------

TRACKS_SRC="$DESKTOP_HOME/.claude/audio/tracks"
if [[ -d "$TRACKS_SRC" ]] && ls "$TRACKS_SRC"/*.mp3 &>/dev/null; then
  echo "  [+] Copying music tracks..."
  TRACK_COUNT=0
  for f in "$TRACKS_SRC"/*.mp3; do
    [[ -f "$f" ]] || continue
    cp -u "$f" "$RECEIVER_HOME/.claude/audio/tracks/"
    TRACK_COUNT=$((TRACK_COUNT + 1))
  done
  echo "  [ok] Copied $TRACK_COUNT tracks"
else
  echo "  [info] No music tracks found (optional)"
fi

# ---------------------------------------------------------------------------
# Step 5: Install receiver script
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../templates/agentvibes-receiver.sh"

if [[ -f "$TEMPLATE" ]]; then
  echo "  [+] Installing receiver script..."
  cp "$TEMPLATE" "$RECEIVER_HOME/.agentvibes/play-remote.sh"
  chmod +x "$RECEIVER_HOME/.agentvibes/play-remote.sh"
  echo "  [ok] Installed play-remote.sh"
else
  echo "  [error] Template not found: $TEMPLATE" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Step 6: Set ownership and permissions
# ---------------------------------------------------------------------------

echo "  [+] Setting permissions..."
chown -R "$RECEIVER_USER:$RECEIVER_USER" "$RECEIVER_HOME/.claude" "$RECEIVER_HOME/.agentvibes"
chmod 755 "$RECEIVER_HOME/.agentvibes"

# ---------------------------------------------------------------------------
# Step 7: PipeWire/PulseAudio audio access via localhost TCP
# ---------------------------------------------------------------------------

echo "  [+] Setting up audio access..."

# Copy PulseAudio cookie so receiver user can authenticate
PULSE_COOKIE="$DESKTOP_HOME/.config/pulse/cookie"
RECEIVER_PULSE_DIR="$RECEIVER_HOME/.config/pulse"
if [[ -f "$PULSE_COOKIE" ]]; then
  mkdir -p "$RECEIVER_PULSE_DIR"
  cp "$PULSE_COOKIE" "$RECEIVER_PULSE_DIR/cookie"
  chown -R "$RECEIVER_USER:$RECEIVER_USER" "$RECEIVER_PULSE_DIR"
  chmod 600 "$RECEIVER_PULSE_DIR/cookie"
  echo "  [ok] PulseAudio cookie shared"
else
  echo "  [warn] No PulseAudio cookie found at $PULSE_COOKIE"
fi

# Configure PipeWire-Pulse to accept localhost TCP connections (cookie auth)
# This is the reliable way for cross-user audio — Unix sockets reject different UIDs
PIPEWIRE_CONF_DIR="$DESKTOP_HOME/.config/pipewire/pipewire-pulse.conf.d"
PIPEWIRE_CONF="$PIPEWIRE_CONF_DIR/agentvibes-tcp.conf"
mkdir -p "$PIPEWIRE_CONF_DIR"
cat > "$PIPEWIRE_CONF" << 'TCPEOF'
# AgentVibes: Allow receiver user to connect via localhost TCP
# Cookie auth required — only users with the shared pulse cookie can connect
# Listens on 127.0.0.1 only (not exposed to network)
pulse.cmd = [
    { cmd = "load-module" args = "module-native-protocol-tcp auth-cookie-enabled=1 auth-anonymous=0 listen=127.0.0.1 port=34567" }
]
TCPEOF
chown "$DESKTOP_USER:$(id -gn "$DESKTOP_USER")" "$PIPEWIRE_CONF"
echo "  [ok] PipeWire TCP config installed ($PIPEWIRE_CONF)"

# Load module now if PipeWire is running
if sudo -u "$DESKTOP_USER" XDG_RUNTIME_DIR="/run/user/$DESKTOP_UID" \
  pactl load-module module-native-protocol-tcp auth-cookie-enabled=1 auth-anonymous=0 listen=127.0.0.1 port=34567 2>/dev/null; then
  echo "  [ok] TCP audio module loaded (port 34567, cookie auth, localhost only)"
else
  echo "  [info] TCP module will activate on next login/reboot"
fi

# ---------------------------------------------------------------------------
# Step 8: SSH ForceCommand (check/advise)
# ---------------------------------------------------------------------------

SSHD_CONFIG="/etc/ssh/sshd_config"
if grep -q "Match User $RECEIVER_USER" "$SSHD_CONFIG" 2>/dev/null; then
  echo "  [ok] ForceCommand already configured in sshd_config"
else
  echo ""
  echo "  [!] Add this to $SSHD_CONFIG:"
  echo ""
  echo "      Match User $RECEIVER_USER"
  echo "          ForceCommand $RECEIVER_HOME/.agentvibes/play-remote.sh"
  echo "          PasswordAuthentication no"
  echo "          PermitTTY no"
  echo ""
  echo "      Then run: systemctl reload sshd"
fi

# ---------------------------------------------------------------------------
# Step 9: Verify
# ---------------------------------------------------------------------------

echo ""
echo "  ==============================="
echo "  Verification"
echo "  ==============================="
echo ""

VOICES_INSTALLED=$(ls "$RECEIVER_HOME/.claude/piper-voices/"*.onnx 2>/dev/null | wc -l)
TRACKS_INSTALLED=$(ls "$RECEIVER_HOME/.claude/audio/tracks/"*.mp3 2>/dev/null | wc -l)

echo "  Voices:   $VOICES_INSTALLED models"
echo "  Tracks:   $TRACKS_INSTALLED files"
echo "  Script:   $RECEIVER_HOME/.agentvibes/play-remote.sh"
echo "  Log:      $RECEIVER_HOME/.agentvibes/receiver.log"
echo ""

# Quick audio test
echo "  [+] Testing audio playback..."
if sudo -u "$RECEIVER_USER" \
  XDG_RUNTIME_DIR="/run/user/$DESKTOP_UID" \
  paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null; then
  echo "  [ok] Audio playback works!"
else
  echo "  [warn] Audio test failed — check PipeWire permissions"
fi

echo ""
echo "  Setup complete!"
echo ""
