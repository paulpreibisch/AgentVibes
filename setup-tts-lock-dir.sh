#!/usr/bin/env bash
#
# setup-tts-lock-dir.sh
#
# Sets up a secure, shared TTS lock directory at /run/agentvibes.
#
# WHY: The default TTS lock file lives in /tmp which has the sticky bit set,
# meaning only the file owner can delete it. When multiple users (e.g. a server
# user and a local user) both use AgentVibes, a crashed process leaves a stale
# lock that the other user cannot clear — permanently silencing TTS.
#
# This script creates /run/agentvibes owned by the tts-users group with no
# sticky bit, so any group member can clear a stale lock regardless of who
# created it. play-tts-piper.sh auto-detects and uses this directory.
#
# PREREQUISITES:
#   - Run as a user with sudo access
#   - Both users must be in the tts-users group (AgentVibes installer handles this)
#
# USAGE:
#   bash setup-tts-lock-dir.sh
#

set -euo pipefail

echo "🔧 Setting up AgentVibes shared TTS lock directory..."

# Check sudo is available
if ! sudo -n true 2>/dev/null && ! sudo -v 2>/dev/null; then
  echo "❌ sudo access required" >&2
  exit 1
fi

# Create the directory
sudo mkdir -p /run/agentvibes

# Own by root, tts-users group
sudo chown root:tts-users /run/agentvibes

# 2775 = setgid (new files inherit tts-users group) + group-writable + NO sticky bit
# No sticky bit is intentional: any tts-users member can delete any member's stale lock
sudo chmod 2775 /run/agentvibes

echo "✅ Created /run/agentvibes"
ls -la /run/ | grep agentvibes

echo ""
echo "ℹ️  Note: /run/ is tmpfs — this directory will NOT survive a reboot."
echo "   To make it persistent, add to /etc/tmpfiles.d/agentvibes.conf:"
echo ""
echo "   d /run/agentvibes 2775 root tts-users -"
echo ""
echo "   Then run: sudo systemd-tmpfiles --create"
