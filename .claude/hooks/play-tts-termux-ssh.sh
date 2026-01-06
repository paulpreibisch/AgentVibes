#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-termux-ssh.sh
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
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
# express or implied. Use at your own risk. See the Apache License for details.
#
# ---
#
# @fileoverview Termux SSH TTS Provider - Android TTS via SSH tunnel
# @context Enables TTS output on Android devices when connected via SSH from Termux
# @architecture SSH-based remote TTS invocation using termux-tts-speak on Android
# @dependencies ssh, termux-tts-speak (on Android), termux-api (on Android)
# @entrypoints Called by play-tts.sh router when provider=termux-ssh
# @patterns Remote TTS invocation, SSH host alias configuration, graceful fallback
# @related play-tts.sh, provider-manager.sh
# @setup Requires user to configure SSH host alias in ~/.ssh/config
#
# SETUP INSTRUCTIONS:
# ===================
# 1. On Android device (Termux):
#    - Install: pkg install termux-api openssh
#    - Install Termux:API app from F-Droid
#    - Start SSH server: sshd
#    - Get SSH port: echo $PREFIX/var/run/sshd.pid
#
# 2. On server/desktop:
#    - Add to ~/.ssh/config:
#      Host android
#          HostName <your-android-ip>
#          User <your-termux-username>
#          Port 8022
#          IdentityFile ~/.ssh/id_rsa
#
# 3. Configure AgentVibes:
#    - echo "android" > ~/.claude/termux-ssh-host.txt
#    OR
#    - export TERMUX_SSH_HOST="android"
#
# 4. Set provider:
#    - echo "termux-ssh" > ~/.claude/tts-provider.txt
#

# Fix locale warnings
export LC_ALL=C

TEXT="$1"
VOICE_OVERRIDE="$2"  # Not used for termux-ssh, but kept for interface compatibility

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# @function get_ssh_host
# @intent Determine SSH host alias for Android device
# @why Allows users to configure their own SSH connection without hardcoded values
# @returns Echoes SSH host alias or empty string if not configured
# @sideeffects None
get_ssh_host() {
  local ssh_host=""

  # Priority order:
  # 1. Environment variable TERMUX_SSH_HOST
  # 2. Project-specific config file (CLAUDE_PROJECT_DIR)
  # 3. Script location config file
  # 4. Global config file (~/.claude/termux-ssh-host.txt)

  if [[ -n "$TERMUX_SSH_HOST" ]]; then
    ssh_host="$TERMUX_SSH_HOST"
  elif [[ -n "$CLAUDE_PROJECT_DIR" ]] && [[ -f "$CLAUDE_PROJECT_DIR/.claude/termux-ssh-host.txt" ]]; then
    ssh_host=$(cat "$CLAUDE_PROJECT_DIR/.claude/termux-ssh-host.txt" 2>/dev/null | tr -d '\n\r')
  elif [[ -f "$SCRIPT_DIR/../termux-ssh-host.txt" ]]; then
    ssh_host=$(cat "$SCRIPT_DIR/../termux-ssh-host.txt" 2>/dev/null | tr -d '\n\r')
  elif [[ -f "$HOME/.claude/termux-ssh-host.txt" ]]; then
    ssh_host=$(cat "$HOME/.claude/termux-ssh-host.txt" 2>/dev/null | tr -d '\n\r')
  fi

  echo "$ssh_host"
}

# @function check_termux_connection
# @intent Verify SSH connection to Android device is available
# @why Prevent hanging on SSH timeout if device is unreachable
# @param $1 SSH host alias
# @returns 0 if connection successful, 1 otherwise
# @sideeffects None (uses ConnectTimeout=2)
check_termux_connection() {
  local host="$1"

  # Quick connection test (2 second timeout)
  if ssh -o ConnectTimeout=2 -o BatchMode=yes "$host" "echo ok" >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Main execution
SSH_HOST=$(get_ssh_host)

if [[ -z "$SSH_HOST" ]]; then
  echo "❌ Termux SSH provider not configured" >&2
  echo "   Set SSH host alias in one of:" >&2
  echo "   - Environment: export TERMUX_SSH_HOST='android'" >&2
  echo "   - Global: echo 'android' > ~/.claude/termux-ssh-host.txt" >&2
  echo "   - Project: echo 'android' > .claude/termux-ssh-host.txt" >&2
  echo "" >&2
  echo "   See provider documentation for SSH setup instructions" >&2
  exit 1
fi

if [[ -z "$TEXT" ]]; then
  echo "❌ No text provided for TTS" >&2
  exit 1
fi

# Check if SSH connection is available (with timeout)
if ! check_termux_connection "$SSH_HOST"; then
  echo "⚠️  Cannot connect to SSH host '$SSH_HOST'" >&2
  echo "   Make sure:" >&2
  echo "   - Android device is reachable" >&2
  echo "   - SSH server is running: sshd" >&2
  echo "   - SSH config is correct in ~/.ssh/config" >&2
  exit 1
fi

# Escape single quotes in text for safe shell transmission
# Replace ' with '\'' (end quote, escaped quote, start quote)
SAFE_TEXT="${TEXT//\'/\'\\\'\'}"

# Send TTS command to Android device via SSH
# Use termux-tts-speak for native Android TTS
# Run in background to avoid blocking
ssh -o ConnectTimeout=5 "$SSH_HOST" "termux-tts-speak '$SAFE_TEXT'" &

# Get the background process PID
SSH_PID=$!

# Optional: Wait a moment to detect immediate failures
sleep 0.2

# Check if the SSH process is still running (indicates successful start)
if kill -0 "$SSH_PID" 2>/dev/null; then
  echo "✓ TTS sent to Android device via SSH" >&2
else
  echo "⚠️  SSH command may have failed" >&2
fi

# Note: We don't return an audio file path since audio plays on the Android device
# This is by design - the provider outputs audio remotely, not locally
echo ""
