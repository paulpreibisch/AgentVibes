#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-termux.sh
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
# @fileoverview Termux Local TTS Provider - Android TTS running locally
# @context Enables TTS output on Android devices when Claude Code runs in Termux
# @architecture Direct local invocation of termux-tts-speak
# @dependencies termux-tts-speak, termux-api package
# @entrypoints Called by play-tts.sh router when provider=termux
# @patterns Local TTS invocation, native Android TTS engine
# @related play-tts.sh, provider-manager.sh, play-tts-termux-ssh.sh
#
# SETUP INSTRUCTIONS:
# ===================
# 1. Install Termux from F-Droid (NOT Google Play)
# 2. Install Termux:API app from F-Droid
# 3. In Termux, install: pkg install termux-api
# 4. Test: termux-tts-speak "Hello World"
# 5. Install AgentVibes: npx agentvibes install
# 6. Choose "termux" as TTS provider
#
# USAGE:
# ======
# This provider is automatically used when:
# - Running Claude Code locally in Termux on Android
# - Provider is set to "termux"
#
# FEATURES:
# =========
# - Native Android TTS engine
# - No network/SSH required
# - Uses device's installed TTS voices
# - Simple, fast, local TTS
#
# LIMITATIONS:
# ============
# - Only one voice (system default)
# - No audio effects support
# - No background music support
# - Only works when running locally in Termux
#

# Get the text to speak from command line argument
TEXT="$1"

# Exit if no text provided
if [[ -z "$TEXT" ]]; then
  echo "Error: No text provided to termux TTS provider" >&2
  exit 1
fi

# Check if termux-tts-speak is available
if ! command -v termux-tts-speak &>/dev/null; then
  echo "Error: termux-tts-speak not found. Install with: pkg install termux-api" >&2
  echo "Also install Termux:API app from F-Droid" >&2
  exit 1
fi

# Invoke Android TTS using termux-tts-speak
# The termux-tts-speak command uses Android's native TTS engine
termux-tts-speak "$TEXT"

# Check if TTS succeeded
if [[ $? -eq 0 ]]; then
  exit 0
else
  echo "Error: termux-tts-speak failed" >&2
  exit 1
fi
