#!/usr/bin/env bash
#
# File: .claude/hooks/macos-voice-manager.sh
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
# @fileoverview macOS Voice Manager - Voice discovery and management for macOS 'say' command
# @context Provides voice listing, validation, and info for macOS native TTS
# @architecture Helper functions for play-tts-macos.sh provider
# @dependencies macOS only (Darwin), say command (built-in)
# @entrypoints Called by voice-manager.sh for provider-aware voice operations
# @patterns Voice enumeration via 'say -v ?', language filtering, quality tiers
# @related play-tts-macos.sh, voice-manager.sh, provider-manager.sh
#

# Platform guard
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "❌ Error: macOS voice manager only works on macOS"
  exit 1
fi

# @function list_macos_voices
# @intent List all available macOS voices
# @returns Echoes voice names one per line
list_macos_voices() {
  say -v ? 2>/dev/null | awk '{print $1}'
}

# @function list_macos_voices_detailed
# @intent List all voices with language info
# @returns Echoes "voice_name language_code" per line
list_macos_voices_detailed() {
  say -v ? 2>/dev/null | while read -r line; do
    local voice=$(echo "$line" | awk '{print $1}')
    local lang=$(echo "$line" | awk '{print $2}')
    echo "$voice $lang"
  done
}

# @function list_english_voices
# @intent List only English voices
# @returns Echoes English voice names
list_english_voices() {
  say -v ? 2>/dev/null | grep -i "en_" | awk '{print $1}'
}

# @function get_voice_language
# @intent Get the language code for a voice
# @param $1 Voice name
# @returns Echoes language code (e.g., "en_US")
get_voice_language() {
  local voice="$1"
  say -v ? 2>/dev/null | grep -i "^${voice} " | awk '{print $2}'
}

# @function validate_voice
# @intent Check if a voice exists on this system
# @param $1 Voice name
# @returns 0 if valid, 1 if not found
validate_voice() {
  local voice="$1"
  say -v ? 2>/dev/null | grep -qi "^${voice} "
}

# @function get_recommended_voices
# @intent Get list of recommended high-quality voices
# @returns Echoes recommended voice names
get_recommended_voices() {
  # These are typically the highest quality voices on macOS
  local recommended=("Samantha" "Alex" "Daniel" "Karen" "Moira" "Tessa" "Fiona" "Veena" "Victoria")

  for voice in "${recommended[@]}"; do
    if validate_voice "$voice"; then
      echo "$voice"
    fi
  done
}

# @function get_voice_info
# @intent Get detailed info about a specific voice
# @param $1 Voice name
# @returns Echoes voice details
get_voice_info() {
  local voice="$1"

  if ! validate_voice "$voice"; then
    echo "❌ Voice not found: $voice"
    return 1
  fi

  local full_info=$(say -v ? 2>/dev/null | grep -i "^${voice} ")
  local lang=$(echo "$full_info" | awk '{print $2}')

  echo "Voice: $voice"
  echo "Language: $lang"
  echo "Provider: macOS Say (built-in)"

  # Add description for known voices
  case "$voice" in
    Alex) echo "Description: American English male (enhanced)" ;;
    Samantha) echo "Description: American English female (enhanced)" ;;
    Victoria) echo "Description: American English female" ;;
    Daniel) echo "Description: British English male (enhanced)" ;;
    Karen) echo "Description: Australian English female (enhanced)" ;;
    Moira) echo "Description: Irish English female (enhanced)" ;;
    Tessa) echo "Description: South African English female (enhanced)" ;;
    Fiona) echo "Description: Scottish English female (enhanced)" ;;
    Veena) echo "Description: Indian English female (enhanced)" ;;
  esac
}

# @function count_voices
# @intent Count total available voices
# @returns Echoes count
count_voices() {
  say -v ? 2>/dev/null | wc -l | tr -d ' '
}

# @function count_english_voices
# @intent Count English voices
# @returns Echoes count
count_english_voices() {
  say -v ? 2>/dev/null | grep -i "en_" | wc -l | tr -d ' '
}

# Command-line interface
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-}" in
    list)
      echo "🎤 Available macOS Voices:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      list_macos_voices_detailed | while read -r voice lang; do
        printf "  %-15s %s\n" "$voice" "$lang"
      done
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "Total: $(count_voices) voices"
      ;;
    list-english)
      echo "🎤 English macOS Voices:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      list_english_voices
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "Total: $(count_english_voices) English voices"
      ;;
    recommended)
      echo "🌟 Recommended macOS Voices:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      get_recommended_voices
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      ;;
    info)
      if [[ -z "$2" ]]; then
        echo "Usage: $0 info <voice_name>"
        exit 1
      fi
      get_voice_info "$2"
      ;;
    validate)
      if [[ -z "$2" ]]; then
        echo "Usage: $0 validate <voice_name>"
        exit 1
      fi
      if validate_voice "$2"; then
        echo "✅ Voice '$2' is available"
        exit 0
      else
        echo "❌ Voice '$2' is not available"
        exit 1
      fi
      ;;
    *)
      echo "Usage: $0 {list|list-english|recommended|info|validate} [voice_name]"
      echo ""
      echo "Commands:"
      echo "  list           - List all available voices"
      echo "  list-english   - List English voices only"
      echo "  recommended    - List recommended high-quality voices"
      echo "  info <voice>   - Get details about a voice"
      echo "  validate <voice> - Check if voice exists"
      exit 1
      ;;
  esac
fi
