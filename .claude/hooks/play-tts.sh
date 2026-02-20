#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts.sh
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
# @fileoverview TTS Provider Router with Translation and Language Learning Support
# @context Routes TTS requests to active provider (Piper or macOS) with optional translation
# @architecture Provider abstraction layer - single entry point for all TTS, handles translation and learning mode
# @dependencies provider-manager.sh, play-tts-piper.sh, translator.py, translate-manager.sh, learn-manager.sh
# @entrypoints Called by hooks, slash commands, personality-manager.sh, and all TTS features
# @patterns Provider pattern - delegates to provider-specific implementations, auto-detects provider from voice name
# @related provider-manager.sh, play-tts-piper.sh, learn-manager.sh, translate-manager.sh
#

set -euo pipefail

# Fix locale warnings
export LC_ALL=C

# Get script directory (needed for mute file check)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
export PROJECT_ROOT  # Export for child scripts

# Check if muted (persists across sessions)
# Project settings always override global settings:
# - .claude/agentvibes-unmuted = project explicitly unmuted (overrides global mute)
# - .claude/agentvibes-muted = project muted (overrides global unmute)
# - ~/.agentvibes-muted = global mute (only if no project-level setting)
GLOBAL_MUTE_FILE="$HOME/.agentvibes-muted"
PROJECT_MUTE_FILE="$PROJECT_ROOT/.claude/agentvibes-muted"
PROJECT_UNMUTE_FILE="$PROJECT_ROOT/.claude/agentvibes-unmuted"

# Check project-level settings first (project overrides global)
if [[ -f "$PROJECT_UNMUTE_FILE" ]]; then
  # Project explicitly unmuted - ignore global mute
  :  # Continue (do nothing, will not exit)
elif [[ -f "$PROJECT_MUTE_FILE" ]]; then
  # Project explicitly muted
  if [[ -f "$GLOBAL_MUTE_FILE" ]]; then
    echo "🔇 TTS muted (project + global)"
  else
    echo "🔇 TTS muted (project)"
  fi
  exit 0
elif [[ -f "$GLOBAL_MUTE_FILE" ]]; then
  # Global mute and no project-level override
  echo "🔇 TTS muted (global)"
  exit 0
fi

TEXT="${1:-}"
VOICE_OVERRIDE="${2:-}"  # Optional: voice name or ID

# Security: Validate inputs
if [[ -z "$TEXT" ]]; then
  echo "Error: No text provided" >&2
  exit 1
fi

# Security: Validate voice override doesn't contain dangerous characters
if [[ -n "$VOICE_OVERRIDE" ]] && [[ "$VOICE_OVERRIDE" =~ [';|&$`<>(){}'] ]]; then
  echo "Error: Invalid characters in voice parameter" >&2
  exit 1
fi

# Remove backslash escaping that Claude might add for special chars
# In single quotes these don't need escaping, but Claude sometimes adds backslashes
TEXT="${TEXT//\\!/!}"        # Remove \!
TEXT="${TEXT//\\\$/\$}"      # Remove \$
TEXT="${TEXT//\\?/?}"        # Remove \?
TEXT="${TEXT//\\,/,}"        # Remove \,
TEXT="${TEXT//\\./.}"        # Remove \. (keep the period)
TEXT="${TEXT//\\\\/\\}"      # Remove \\ (escaped backslash)

# Source provider manager to get active provider
source "$SCRIPT_DIR/provider-manager.sh"

# Get active provider
ACTIVE_PROVIDER=$(get_active_provider)

# Show GitHub star reminder (once per day)
"$SCRIPT_DIR/github-star-reminder.sh" 2>/dev/null || true

# @function detect_voice_provider
# @intent Auto-detect provider from voice name (for mixed-provider support)
# @why Allow Piper for main language + macOS for target language
# @param $1 voice name/ID
# @returns Provider name (piper or macos)
detect_voice_provider() {
  local voice="$1"
  # Piper voice names contain underscore and dash (e.g., es_ES-davefx-medium)
  if [[ "$voice" == *"_"*"-"* ]]; then
    echo "piper"
  else
    echo "$ACTIVE_PROVIDER"
  fi
}

# Override provider if voice indicates different provider (mixed-provider mode)
if [[ -n "$VOICE_OVERRIDE" ]]; then
  DETECTED_PROVIDER=$(detect_voice_provider "$VOICE_OVERRIDE")
  if [[ "$DETECTED_PROVIDER" != "$ACTIVE_PROVIDER" ]]; then
    ACTIVE_PROVIDER="$DETECTED_PROVIDER"
  fi
fi

# @function speak_text
# @intent Route text to appropriate TTS provider
# @why Reusable function for speaking, used by both single and learning modes
# @param $1 text to speak
# @param $2 voice override (optional)
# @param $3 provider override (optional)
speak_text() {
  local text="$1"
  local voice="${2:-}"
  local provider="${3:-$ACTIVE_PROVIDER}"

  case "$provider" in
    piper)
      "$SCRIPT_DIR/play-tts-piper.sh" "$text" "$voice"
      ;;
    soprano)
      "$SCRIPT_DIR/play-tts-soprano.sh" "$text" "$voice"
      ;;
    macos)
      "$SCRIPT_DIR/play-tts-macos.sh" "$text" "$voice"
      ;;
    termux-ssh)
      "$SCRIPT_DIR/play-tts-termux-ssh.sh" "$text" "$voice"
      ;;
    *)
      echo "❌ Unknown provider: $provider" >&2
      return 1
      ;;
  esac
}

# Note: learn-manager.sh and translate-manager.sh are sourced inside their
# respective handler functions to avoid triggering their main handlers

# @function handle_learning_mode
# @intent Speak in both main language and target language for learning
# @why Issue #51 - Auto-translate and speak twice for immersive language learning
# @returns 0 if learning mode handled, 1 if not in learning mode
handle_learning_mode() {
  # Source learn-manager for learning mode functions
  source "$SCRIPT_DIR/learn-manager.sh" 2>/dev/null || return 1

  # Check if learning mode is enabled
  if ! is_learn_mode_enabled 2>/dev/null; then
    return 1
  fi

  local target_lang
  target_lang=$(get_target_language 2>/dev/null || echo "")
  local target_voice
  target_voice=$(get_target_voice 2>/dev/null || echo "")

  # Need both target language and voice for learning mode
  if [[ -z "$target_lang" ]] || [[ -z "$target_voice" ]]; then
    return 1
  fi

  # 1. Speak in main language (current voice)
  speak_text "$TEXT" "$VOICE_OVERRIDE" "$ACTIVE_PROVIDER"

  # 2. Auto-translate to target language
  local translated
  translated=$(python3 "$SCRIPT_DIR/translator.py" "$TEXT" "$target_lang" 2>/dev/null) || translated="$TEXT"

  # Small pause between languages
  sleep 0.5

  # 3. Speak translated text with target voice
  local target_provider
  target_provider=$(detect_voice_provider "$target_voice")
  speak_text "$translated" "$target_voice" "$target_provider"

  return 0
}

# @function handle_translation_mode
# @intent Translate and speak in target language (non-learning mode)
# @why Issue #50 - BMAD multi-language TTS support
# @returns 0 if translation handled, 1 if not translating
handle_translation_mode() {
  # Source translate-manager to get translation settings
  source "$SCRIPT_DIR/translate-manager.sh" 2>/dev/null || return 1

  # Check if translation is enabled
  if ! is_translation_enabled 2>/dev/null; then
    return 1
  fi

  local translate_to
  translate_to=$(get_translate_to 2>/dev/null || echo "")

  if [[ -z "$translate_to" ]] || [[ "$translate_to" == "english" ]]; then
    return 1
  fi

  # Translate text
  local translated
  translated=$(python3 "$SCRIPT_DIR/translator.py" "$TEXT" "$translate_to" 2>/dev/null) || translated="$TEXT"

  # Get voice for target language if no override specified
  local voice_to_use="$VOICE_OVERRIDE"
  if [[ -z "$voice_to_use" ]]; then
    source "$SCRIPT_DIR/language-manager.sh" 2>/dev/null || true
    voice_to_use=$(get_voice_for_language "$translate_to" "$ACTIVE_PROVIDER" 2>/dev/null || echo "")
  fi

  # Update provider if voice indicates different provider
  local provider_to_use="$ACTIVE_PROVIDER"
  if [[ -n "$voice_to_use" ]]; then
    provider_to_use=$(detect_voice_provider "$voice_to_use")
  fi

  # Speak translated text
  speak_text "$translated" "$voice_to_use" "$provider_to_use"
  return 0
}

# Mode priority:
# 1. Learning mode (speaks twice: main + translated)
# 2. Translation mode (speaks translated only)
# 3. Normal mode (speaks as-is)

# Try learning mode first (Issue #51)
if handle_learning_mode; then
  exit 0
fi

# Try translation mode (Issue #50)
if handle_translation_mode; then
  exit 0
fi

# Normal single-language mode - route to appropriate provider implementation
case "$ACTIVE_PROVIDER" in
  piper)
    exec "$SCRIPT_DIR/play-tts-piper.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  soprano)
    exec "$SCRIPT_DIR/play-tts-soprano.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  macos)
    exec "$SCRIPT_DIR/play-tts-macos.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  termux-ssh)
    exec "$SCRIPT_DIR/play-tts-termux-ssh.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  *)
    echo "❌ Unknown provider: $ACTIVE_PROVIDER"
    echo "   Run: /agent-vibes:provider list"
    exit 1
    ;;
esac
