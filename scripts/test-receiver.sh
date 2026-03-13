#!/usr/bin/env bash
#
# File: scripts/test-receiver.sh
#
# Diagnoses and tests the agentvibes-receiver setup end-to-end.
# Run with sudo: sudo bash scripts/test-receiver.sh
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under Apache-2.0
#

set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Error: Run with sudo" >&2
  exit 1
fi

DESKTOP_USER="${SUDO_USER:-}"
DESKTOP_UID=$(id -u "$DESKTOP_USER")
RECEIVER_USER="agentvibes-receiver"
RECEIVER_HOME="/home/$RECEIVER_USER"
RECEIVER_SCRIPT="$RECEIVER_HOME/.agentvibes/play-remote.sh"

echo ""
echo "  AgentVibes Receiver Diagnostic"
echo "  ==============================="
echo ""

# 1. Check user exists
if id "$RECEIVER_USER" &>/dev/null; then
  echo "  [ok] User $RECEIVER_USER exists"
else
  echo "  [FAIL] User $RECEIVER_USER does not exist"
  exit 1
fi

# 2. Check script exists
if [[ -x "$RECEIVER_SCRIPT" ]]; then
  echo "  [ok] Receiver script: $RECEIVER_SCRIPT"
else
  echo "  [FAIL] Receiver script missing or not executable: $RECEIVER_SCRIPT"
  exit 1
fi

# 3. Check piper
PIPER_PATH=$(sudo -u "$RECEIVER_USER" bash -c 'export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"; command -v piper 2>/dev/null || echo ""')
if [[ -n "$PIPER_PATH" ]]; then
  echo "  [ok] piper found at: $PIPER_PATH"
else
  echo "  [FAIL] piper not found in receiver user PATH"
  echo "         Fix: sudo cp $(command -v piper) /usr/local/bin/piper"
  exit 1
fi

# 4. Check paplay
PAPLAY_PATH=$(sudo -u "$RECEIVER_USER" bash -c 'export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"; command -v paplay 2>/dev/null || echo ""')
if [[ -n "$PAPLAY_PATH" ]]; then
  echo "  [ok] paplay found at: $PAPLAY_PATH"
else
  echo "  [WARN] paplay not found, will try pw-play/aplay"
fi

# 5. Check voices
VOICE_COUNT=$(ls "$RECEIVER_HOME/.claude/piper-voices/"*.onnx 2>/dev/null | wc -l)
echo "  [ok] Voice models: $VOICE_COUNT"

# 6. Check XDG_RUNTIME_DIR / PipeWire access
echo ""
echo "  Testing audio access..."
XDG_DIR="/run/user/$DESKTOP_UID"

# Check ACL
if getfacl "$XDG_DIR" 2>/dev/null | grep -q "$RECEIVER_USER"; then
  echo "  [ok] ACL on $XDG_DIR grants access to $RECEIVER_USER"
else
  echo "  [FIXING] Applying ACL on $XDG_DIR..."
  setfacl -m "u:$RECEIVER_USER:rx" "$XDG_DIR" 2>/dev/null || true
  if [[ -d "$XDG_DIR/pulse" ]]; then
    setfacl -m "u:$RECEIVER_USER:rx" "$XDG_DIR/pulse" 2>/dev/null || true
  fi
  echo "  [ok] ACLs applied"
fi

# 7. Test pactl as receiver user
echo ""
echo "  Testing audio session access as $RECEIVER_USER..."
DEFAULT_SINK=$(sudo -u "$RECEIVER_USER" XDG_RUNTIME_DIR="$XDG_DIR" pactl get-default-sink 2>/dev/null || echo "FAIL")
if [[ "$DEFAULT_SINK" != "FAIL" ]]; then
  echo "  [ok] Default sink: $DEFAULT_SINK"
else
  echo "  [FAIL] Cannot access audio session as $RECEIVER_USER"
  echo "         Check ACLs: getfacl $XDG_DIR"
  # Try to fix by also granting access to pipewire-0 socket
  if [[ -e "$XDG_DIR/pipewire-0" ]]; then
    echo "  [FIXING] Granting access to pipewire socket..."
    setfacl -m "u:$RECEIVER_USER:rw" "$XDG_DIR/pipewire-0" 2>/dev/null || true
    setfacl -m "u:$RECEIVER_USER:rw" "$XDG_DIR/pipewire-0.lock" 2>/dev/null || true
  fi
  if [[ -d "$XDG_DIR/pulse" ]]; then
    setfacl -m "u:$RECEIVER_USER:rwx" "$XDG_DIR/pulse" 2>/dev/null || true
    setfacl -m "u:$RECEIVER_USER:rw" "$XDG_DIR/pulse/native" 2>/dev/null || true
  fi
  # Retry
  DEFAULT_SINK=$(sudo -u "$RECEIVER_USER" XDG_RUNTIME_DIR="$XDG_DIR" pactl get-default-sink 2>/dev/null || echo "FAIL")
  if [[ "$DEFAULT_SINK" != "FAIL" ]]; then
    echo "  [ok] Fixed! Default sink: $DEFAULT_SINK"
  else
    echo "  [FAIL] Still can't access audio. Manual fix needed."
    exit 1
  fi
fi

# 8. Test bell sound
echo ""
echo "  Playing test sound as $RECEIVER_USER..."
if sudo -u "$RECEIVER_USER" XDG_RUNTIME_DIR="$XDG_DIR" \
  paplay --device="$DEFAULT_SINK" /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null; then
  echo "  [ok] Bell sound played!"
else
  echo "  [FAIL] paplay failed. Trying pw-play..."
  if sudo -u "$RECEIVER_USER" XDG_RUNTIME_DIR="$XDG_DIR" \
    pw-play /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null; then
    echo "  [ok] pw-play worked!"
  else
    echo "  [FAIL] Audio playback failed completely"
    exit 1
  fi
fi

# 9. Full TTS test
echo ""
echo "  Running full TTS pipeline as $RECEIVER_USER..."
PAYLOAD=$(echo '{"text":"AgentVibes receiver test successful","voice":"en_US-lessac-medium"}' | base64 -w 0)
OUTPUT=$(sudo -u "$RECEIVER_USER" \
  SSH_CLIENT="127.0.0.1 12345 45217" \
  XDG_RUNTIME_DIR="$XDG_DIR" \
  bash "$RECEIVER_SCRIPT" "$PAYLOAD" 2>&1) || true

if [[ -z "$OUTPUT" ]]; then
  echo "  [ok] TTS played successfully!"
else
  echo "  [FAIL] TTS output: $OUTPUT"
fi

# 10. Add paul's key for local testing
PAUL_KEY_FILE="/home/$DESKTOP_USER/.ssh/github_pauls_laptop.pub"
AUTH_KEYS="$RECEIVER_HOME/.ssh/authorized_keys"
if [[ -f "$PAUL_KEY_FILE" ]]; then
  PAUL_KEY=$(cat "$PAUL_KEY_FILE")
  if [[ -f "$AUTH_KEYS" ]] && grep -qF "$PAUL_KEY" "$AUTH_KEYS" 2>/dev/null; then
    echo "  [ok] Local user key already authorized"
  else
    mkdir -p "$RECEIVER_HOME/.ssh"
    echo "$PAUL_KEY" >> "$AUTH_KEYS"
    chmod 600 "$AUTH_KEYS"
    chmod 700 "$RECEIVER_HOME/.ssh"
    chown -R "$RECEIVER_USER:$RECEIVER_USER" "$RECEIVER_HOME/.ssh"
    echo "  [ok] Added local user key for testing"
  fi
fi

echo ""
echo "  ==============================="
echo "  Diagnostic complete!"
echo ""
