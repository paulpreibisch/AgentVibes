#!/usr/bin/env bash
#
# File: scripts/add-server-key.sh
#
# Adds a server's SSH public key to the agentvibes-receiver user's
# authorized_keys so the server can send TTS over SSH.
#
# Usage: sudo bash scripts/add-server-key.sh "ssh-ed25519 AAAA... comment"
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under Apache-2.0
#

set -euo pipefail

RECEIVER_USER="agentvibes-receiver"
RECEIVER_HOME="/home/$RECEIVER_USER"
SSH_DIR="$RECEIVER_HOME/.ssh"
AUTH_KEYS="$SSH_DIR/authorized_keys"

# Must run as root
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Error: Run with sudo" >&2
  echo "Usage: sudo bash $0 \"ssh-ed25519 AAAA... comment\"" >&2
  exit 1
fi

# Check receiver user exists
if ! id "$RECEIVER_USER" &>/dev/null; then
  echo "Error: User $RECEIVER_USER does not exist." >&2
  echo "Run setup-receiver-user.sh first." >&2
  exit 1
fi

# Get key from argument or prompt
PUB_KEY="${1:-}"
if [[ -z "$PUB_KEY" ]]; then
  echo ""
  echo "  Paste the server's SSH public key (ssh-ed25519 AAAA... comment):"
  echo ""
  read -r PUB_KEY
fi

# Validate key format
if [[ ! "$PUB_KEY" =~ ^ssh-(ed25519|rsa|ecdsa)[[:space:]] ]]; then
  echo "Error: Invalid SSH public key format" >&2
  echo "Expected: ssh-ed25519 AAAA... comment" >&2
  exit 1
fi

# Create .ssh dir if needed
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
chown "$RECEIVER_USER:$RECEIVER_USER" "$SSH_DIR"

# Check for duplicate
if [[ -f "$AUTH_KEYS" ]] && grep -qF "$PUB_KEY" "$AUTH_KEYS" 2>/dev/null; then
  echo "  Key already exists in $AUTH_KEYS"
  exit 0
fi

# Add key
echo "$PUB_KEY" >> "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"
chown "$RECEIVER_USER:$RECEIVER_USER" "$AUTH_KEYS"

# Show result
KEY_COUNT=$(grep -c "^ssh-" "$AUTH_KEYS" 2>/dev/null || echo 0)
KEY_COMMENT=$(echo "$PUB_KEY" | awk '{print $3}')

echo ""
echo "  Key added: ${KEY_COMMENT:-unnamed}"
echo "  Authorized keys: $KEY_COUNT total"
echo "  File: $AUTH_KEYS"
echo ""
