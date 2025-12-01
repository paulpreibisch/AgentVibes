#!/usr/bin/env bash
#
# File: .claude/hooks/voices-config.sh
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
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose and noninfringement.
# In no event shall the authors or copyright holders be liable for any claim,
# damages or other liability, whether in an action of contract, tort or
# otherwise, arising from, out of or in connection with the software or the
# use or other dealings in the software.
#
# ---
#
# @fileoverview ElevenLabs Voice Configuration - Single source of truth for voice ID mappings
# @context Maps human-readable voice names to ElevenLabs API voice IDs for consistency
# @architecture Associative array (bash hash map) sourced by multiple scripts
# @dependencies None (pure data structure)
# @entrypoints Sourced by voice-manager.sh, play-tts-elevenlabs.sh, and personality managers
# @patterns Centralized configuration, DRY principle for voice mappings
# @related voice-manager.sh, play-tts-elevenlabs.sh, personality/*.md files

# Bash 3.2 compatible voice lookup functions
# macOS ships with bash 3.2 which doesn't support associative arrays (declare -A)
# We use simple functions instead for compatibility

# Get voice ID by name
get_voice_id() {
  local name="$1"
  case "$name" in
    "Amy") echo "bhJUNIXWQQ94l8eI2VUf" ;;
    "Antoni") echo "ErXwobaYiN019PkySvjV" ;;
    "Archer") echo "L0Dsvb3SLTyegXwtm47J" ;;
    "Aria") echo "TC0Zp7WVFzhA8zpTlRqV" ;;
    "Bella") echo "EXAVITQu4vr4xnSDxMaL" ;;
    "Burt Reynolds") echo "4YYIPFl9wE5c4L2eu2Gb" ;;
    "Charlotte") echo "XB0fDUnXU5powFXDhCwa" ;;
    "Cowboy Bob") echo "KTPVrSVAEUSJRClDzBw7" ;;
    "Demon Monster") echo "vfaqCOvlrKi4Zp7C2IAm" ;;
    "Domi") echo "AZnzlk1XvdvUeBnXmlld" ;;
    "Dr. Von Fusion") echo "yjJ45q8TVCrtMhEKurxY" ;;
    "Drill Sergeant") echo "vfaqCOvlrKi4Zp7C2IAm" ;;
    "Grandpa Spuds Oxley") echo "NOpBlnGInO9m6vDvFkFC" ;;
    "Grandpa Werthers") echo "MKlLqCItoCkvdhrxgtLv" ;;
    "Jessica Anne Bogart") echo "flHkNRp1BlvT73UL6gyz" ;;
    "Juniper") echo "aMSt68OGf4xUZAnLpTU8" ;;
    "Lutz Laugh") echo "9yzdeviXkFddZ4Oz8Mok" ;;
    "Matilda") echo "XrExE9yKIg1WjnnlVkGX" ;;
    "Matthew Schmitz") echo "0SpgpJ4D3MpHCiWdyTg3" ;;
    "Michael") echo "U1Vk2oyatMdYs096Ety7" ;;
    "Ms. Walker") echo "DLsHlh26Ugcm6ELvS0qi" ;;
    "Northern Terry") echo "wo6udizrrtpIxWGp2qJk" ;;
    "Pirate Marshal") echo "PPzYpIqttlTYA83688JI" ;;
    "Rachel") echo "21m00Tcm4TlvDq8ikWAM" ;;
    "Ralf Eisend") echo "A9evEp8yGjv4c3WsIKuY" ;;
    "Tiffany") echo "6aDn1KB0hjpdcocrUkmq" ;;
    "Tom") echo "DYkrAHD8iwork3YSUBbs" ;;
    *) echo "" ;;
  esac
}

# List all ElevenLabs voice names
list_elevenlabs_voices() {
  echo "Amy"
  echo "Antoni"
  echo "Archer"
  echo "Aria"
  echo "Bella"
  echo "Burt Reynolds"
  echo "Charlotte"
  echo "Cowboy Bob"
  echo "Demon Monster"
  echo "Domi"
  echo "Dr. Von Fusion"
  echo "Drill Sergeant"
  echo "Grandpa Spuds Oxley"
  echo "Grandpa Werthers"
  echo "Jessica Anne Bogart"
  echo "Juniper"
  echo "Lutz Laugh"
  echo "Matilda"
  echo "Matthew Schmitz"
  echo "Michael"
  echo "Ms. Walker"
  echo "Northern Terry"
  echo "Pirate Marshal"
  echo "Rachel"
  echo "Ralf Eisend"
  echo "Tiffany"
  echo "Tom"
}

# Check if voice exists
is_elevenlabs_voice() {
  local name="$1"
  local id
  id=$(get_voice_id "$name")
  [[ -n "$id" ]]
}