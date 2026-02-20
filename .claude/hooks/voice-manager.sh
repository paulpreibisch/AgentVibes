#!/usr/bin/env bash
#
# File: .claude/hooks/voice-manager.sh
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
# @fileoverview Voice Manager - Unified voice management for Piper and macOS providers
# @context Central interface for listing, switching, previewing, and replaying TTS voices across providers
# @architecture Provider-aware operations with dynamic voice listing based on active provider
# @dependencies piper-voice-manager.sh (Piper voices), provider-manager.sh
# @entrypoints Called by /agent-vibes:switch, /agent-vibes:list, /agent-vibes:whoami, /agent-vibes:replay commands
# @patterns Provider abstraction, numbered selection UI, silent mode for programmatic switching
# @related piper-voice-manager.sh, .claude/tts-voice.txt, .claude/audio/ (replay)

# Get script directory (physical path for sourcing files)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

# Bash 3.2 compatible lowercase function (macOS ships with bash 3.2)
# ${var,,} syntax requires bash 4.0+
to_lower() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}

# Determine target .claude directory based on context
# Priority:
# 1. CLAUDE_PROJECT_DIR env var (set by MCP for project-specific settings)
# 2. Script location (for direct slash command usage)
# 3. Global ~/.claude (fallback)

if [[ -n "$CLAUDE_PROJECT_DIR" ]] && [[ -d "$CLAUDE_PROJECT_DIR/.claude" ]]; then
  # MCP context: Use the project directory where MCP was invoked
  CLAUDE_DIR="$CLAUDE_PROJECT_DIR/.claude"
else
  # Direct usage context: Use script location
  SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  CLAUDE_DIR="$(dirname "$SCRIPT_PATH")"

  # If script is in global ~/.claude, use that
  if [[ "$CLAUDE_DIR" == "$HOME/.claude" ]]; then
    CLAUDE_DIR="$HOME/.claude"
  elif [[ ! -d "$CLAUDE_DIR" ]]; then
    # Fallback to global if directory doesn't exist
    CLAUDE_DIR="$HOME/.claude"
  fi
fi

VOICE_FILE="$CLAUDE_DIR/tts-voice.txt"

# Helper function to get default voice based on active provider
get_default_voice() {
  local provider_file="$CLAUDE_DIR/tts-provider.txt"
  [[ ! -f "$provider_file" ]] && provider_file="$HOME/.claude/tts-provider.txt"

  local active_provider="piper"
  [[ -f "$provider_file" ]] && active_provider=$(cat "$provider_file")

  case "$active_provider" in
    piper)
      echo "en_US-lessac-medium"  # Piper default
      ;;
    macos)
      echo "Samantha"  # macOS default
      ;;
    *)
      echo "en_US-lessac-medium"  # Default to Piper
      ;;
  esac
}

case "$1" in
  list)
    # Get active provider
    PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    if [[ ! -f "$PROVIDER_FILE" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    ACTIVE_PROVIDER="piper"  # default
    if [ -f "$PROVIDER_FILE" ]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
    fi

    CURRENT_VOICE=$(cat "$VOICE_FILE" 2>/dev/null || get_default_voice)

    # Use Node.js formatter for beautiful boxen display
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    FORMATTER="$PROJECT_ROOT/src/cli/list-voices.js"

    if [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
      # Get voice directory for Piper
      if [[ -f "$SCRIPT_DIR/piper-voice-manager.sh" ]]; then
        source "$SCRIPT_DIR/piper-voice-manager.sh"
        VOICE_DIR=$(get_voice_storage_dir)

        # Use Node.js formatter if available
        if [[ -f "$FORMATTER" ]] && command -v node &> /dev/null; then
          node "$FORMATTER" "piper" "$CURRENT_VOICE" "$VOICE_DIR"
        else
          # Fallback to plain text display
          echo "🎤 Available Piper TTS Voices:"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

          VOICE_LIST=()
          for onnx_file in "$VOICE_DIR"/*.onnx; do
            if [[ -f "$onnx_file" ]]; then
              voice=$(basename "$onnx_file" .onnx)
              if [ "$voice" = "$CURRENT_VOICE" ]; then
                VOICE_LIST+=("  ▶ $voice (current)")
              else
                VOICE_LIST+=("    $voice")
              fi
            fi
          done

          if [[ ${#VOICE_LIST[@]} -eq 0 ]]; then
            echo "  (No Piper voices downloaded yet)"
          else
            printf "%s\n" "${VOICE_LIST[@]}" | sort
          fi
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        fi
      fi
    elif [[ "$ACTIVE_PROVIDER" == "macos" ]]; then
      # Use Node.js formatter if available
      if [[ -f "$FORMATTER" ]] && command -v node &> /dev/null; then
        node "$FORMATTER" "macos" "$CURRENT_VOICE"
      else
        # Fallback to plain text display
        echo "🎤 Available macOS TTS Voices:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        if [[ "$(uname -s)" == "Darwin" ]]; then
          say -v ? 2>/dev/null | while read -r line; do
            voice=$(echo "$line" | awk '{print $1}')
            lang=$(echo "$line" | awk '{print $2}')
            if [ "$voice" = "$CURRENT_VOICE" ]; then
              printf "  ▶ %-15s %s (current)\n" "$voice" "$lang"
            else
              printf "    %-15s %s\n" "$voice" "$lang"
            fi
          done
        else
          echo "  (macOS voices only available on macOS)"
        fi
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      fi
    else
      echo "❌ Unknown provider: $ACTIVE_PROVIDER"
      echo ""
      echo "Available providers:"
      echo "  - piper (Free, Offline)"
      echo "  - macos (Built-in, macOS only)"
      echo ""
      echo "Switch provider with: /agent-vibes:provider switch piper"
    fi
    ;;

  preview)
    echo "❌ Preview feature is not supported for this provider"
    echo ""
    echo "Try switching to a voice to hear it:"
    echo "  /agent-vibes:switch <voice-name>"
    echo ""
    echo "Or list available voices:"
    echo "  /agent-vibes:list"
    ;;

  switch)
    VOICE_NAME="$2"
    SILENT_MODE=false

    # Check for --silent flag
    if [[ "$2" == "--silent" ]] || [[ "$3" == "--silent" ]]; then
      SILENT_MODE=true
      # If --silent is first arg, voice name is in $3
      [[ "$2" == "--silent" ]] && VOICE_NAME="$3"
    fi

    if [[ -z "$VOICE_NAME" ]]; then
      echo "❌ No voice name provided"
      echo ""
      echo "Usage: /agent-vibes:switch <voice-name>"
      echo ""
      echo "List available voices with: /agent-vibes:list"
      exit 1
    fi

    # Detect active TTS provider
    PROVIDER_FILE=""
    if [[ -f "$CLAUDE_DIR/tts-provider.txt" ]]; then
      PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    ACTIVE_PROVIDER="piper"  # default
    if [[ -n "$PROVIDER_FILE" ]]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
    fi

    # Voice lookup strategy depends on active provider
    if [[ "$ACTIVE_PROVIDER" == "macos" ]]; then
      # macOS voice lookup using say -v ?
      if [[ "$(uname -s)" != "Darwin" ]]; then
        echo "❌ macOS voices only available on macOS"
        echo "Switch to another provider: /agent-vibes:provider switch piper"
        exit 1
      fi

      # Check if voice exists (case-insensitive match against first column)
      FOUND=""
      while IFS= read -r line; do
        voice=$(echo "$line" | awk '{print $1}')
        if [[ "$(to_lower "$voice")" == "$(to_lower "$VOICE_NAME")" ]]; then
          FOUND="$voice"
          break
        fi
      done < <(say -v ? 2>/dev/null)

      if [[ -z "$FOUND" ]]; then
        echo "❌ macOS voice not found: $VOICE_NAME"
        echo ""
        echo "Available macOS voices:"
        say -v ? 2>/dev/null | awk '{printf "  - %-15s %s\n", $1, $2}' | head -20
        echo "  ... (use /agent-vibes:list to see all)"
        exit 1
      fi
    elif [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
      # Piper voice lookup: Scan voice directory for .onnx files
      source "$SCRIPT_DIR/piper-voice-manager.sh"
      VOICE_DIR=$(get_voice_storage_dir)

      # Check if voice file exists (case-insensitive)
      FOUND=""
      shopt -s nullglob
      for onnx_file in "$VOICE_DIR"/*.onnx; do
        if [[ -f "$onnx_file" ]]; then
          voice=$(basename "$onnx_file" .onnx)
          if [[ "$(to_lower "$voice")" == "$(to_lower "$VOICE_NAME")" ]]; then
            FOUND="$voice"
            break
          fi
        fi
      done
      shopt -u nullglob

      # If not found, check multi-speaker registry
      if [[ -z "$FOUND" ]] && [[ -f "$SCRIPT_DIR/piper-multispeaker-registry.sh" ]]; then
        source "$SCRIPT_DIR/piper-multispeaker-registry.sh"

        MULTISPEAKER_INFO=$(get_multispeaker_info "$VOICE_NAME")
        if [[ -n "$MULTISPEAKER_INFO" ]]; then
          MODEL="${MULTISPEAKER_INFO%%:*}"
          SPEAKER_ID="${MULTISPEAKER_INFO#*:}"

          # Verify the model file exists
          if [[ -f "$VOICE_DIR/${MODEL}.onnx" ]]; then
            # Store speaker name in tts-voice.txt
            echo "$VOICE_NAME" > "$VOICE_FILE"

            # Store model and speaker ID separately for play-tts-piper.sh
            echo "$MODEL" > "$CLAUDE_DIR/tts-piper-model.txt"
            echo "$SPEAKER_ID" > "$CLAUDE_DIR/tts-piper-speaker-id.txt"

            DESCRIPTION=$(get_multispeaker_description "$VOICE_NAME")
            echo "✅ Multi-speaker voice switched to: $VOICE_NAME"
            echo "🎤 Model: $MODEL.onnx (Speaker ID: $SPEAKER_ID)"
            if [[ -n "$DESCRIPTION" ]]; then
              echo "📝 Description: $DESCRIPTION"
            fi

            # Have the new voice introduce itself (unless silent mode)
            if [[ "$SILENT_MODE" != "true" ]]; then
              PLAY_TTS="$SCRIPT_DIR/play-tts.sh"
              if [ -x "$PLAY_TTS" ]; then
                "$PLAY_TTS" "Hi, I'm $VOICE_NAME. I'll be your voice assistant moving forward." > /dev/null 2>&1 &
              fi

              echo ""
              echo "💡 Tip: To hear automatic TTS narration, enable the Agent Vibes output style:"
              echo "   /output-style Agent Vibes"
            fi
            exit 0
          else
            echo "❌ Multi-speaker model not found: $MODEL.onnx"
            echo ""
            echo "Download it with: /agent-vibes:provider download"
            exit 1
          fi
        fi
      fi

      # In test mode, allow switching to any voice name without file validation
      if [[ -z "$FOUND" ]] && [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]]; then
        echo "❌ Piper voice not found: $VOICE_NAME"
        echo ""
        echo "Available Piper voices:"
        shopt -s nullglob
        for onnx_file in "$VOICE_DIR"/*.onnx; do
          if [[ -f "$onnx_file" ]]; then
            echo "  - $(basename "$onnx_file" .onnx)"
          fi
        done | sort
        shopt -u nullglob
        echo ""
        if [[ -f "$SCRIPT_DIR/piper-multispeaker-registry.sh" ]]; then
          echo "Multi-speaker voices (requires 16Speakers.onnx):"
          source "$SCRIPT_DIR/piper-multispeaker-registry.sh"
          for entry in "${MULTISPEAKER_VOICES[@]}"; do
            name="${entry%%:*}"
            echo "  - $name"
          done | sort
          echo ""
        fi
        echo "Download extra voices with: /agent-vibes:provider download"
        exit 1
      fi
    else
      echo "❌ Unknown provider: $ACTIVE_PROVIDER"
      echo ""
      echo "Available providers:"
      echo "  - piper (Free, Offline)"
      echo "  - macos (Built-in, macOS only)"
      echo ""
      echo "Switch provider with: /agent-vibes:provider switch piper"
      exit 1
    fi

    # In test mode, use the requested voice name even if not found
    VOICE_TO_SAVE="${FOUND:-$VOICE_NAME}"
    echo "$VOICE_TO_SAVE" > "$VOICE_FILE"
    echo "✅ Voice switched to: $VOICE_TO_SAVE"

    # Have the new voice introduce itself (unless silent mode)
    if [[ "$SILENT_MODE" != "true" ]] && [[ "${AGENTVIBES_TEST_MODE:-false}" != "true" ]]; then
      SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
      PLAY_TTS="$SCRIPT_DIR/play-tts.sh"
      if [ -x "$PLAY_TTS" ]; then
        "$PLAY_TTS" "Hi, I'm $VOICE_TO_SAVE. I'll be your voice assistant moving forward." "$VOICE_TO_SAVE" > /dev/null 2>&1 &
      fi

      echo ""
      echo "💡 Tip: To hear automatic TTS narration, enable the Agent Vibes output style:"
      echo "   /output-style Agent Vibes"
    fi
    ;;

  get)
    if [ -f "$VOICE_FILE" ]; then
      cat "$VOICE_FILE"
    else
      get_default_voice
    fi
    ;;

  whoami)
    echo "🎤 Current Voice Configuration"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Get active TTS provider
    PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    if [[ ! -f "$PROVIDER_FILE" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    if [ -f "$PROVIDER_FILE" ]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
      if [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
        echo "Provider: Piper TTS (Free, Offline)"
      elif [[ "$ACTIVE_PROVIDER" == "macos" ]]; then
        echo "Provider: macOS Say (Built-in, Free)"
      else
        echo "Provider: $ACTIVE_PROVIDER"
      fi
    else
      # Default to Piper if no provider file
      echo "Provider: Piper TTS (Free, Offline)"
    fi

    # Get current voice
    CURRENT_VOICE=$(cat "$VOICE_FILE" 2>/dev/null || get_default_voice)
    echo "Voice: $CURRENT_VOICE"

    # Get current sentiment (priority)
    if [ -f "$HOME/.claude/tts-sentiment.txt" ]; then
      SENTIMENT=$(cat "$HOME/.claude/tts-sentiment.txt")
      echo "Sentiment: $SENTIMENT (active)"

      # Also show personality if set
      if [ -f "$HOME/.claude/tts-personality.txt" ]; then
        PERSONALITY=$(cat "$HOME/.claude/tts-personality.txt")
        echo "Personality: $PERSONALITY (overridden by sentiment)"
      fi
    else
      # No sentiment, check personality
      if [ -f "$HOME/.claude/tts-personality.txt" ]; then
        PERSONALITY=$(cat "$HOME/.claude/tts-personality.txt")
        echo "Personality: $PERSONALITY (active)"
      else
        echo "Personality: normal"
      fi
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ;;

  list-simple)
    # Simple list for AI to parse and display
    # Get active provider
    PROVIDER_FILE="$CLAUDE_DIR/tts-provider.txt"
    if [[ ! -f "$PROVIDER_FILE" ]]; then
      PROVIDER_FILE="$HOME/.claude/tts-provider.txt"
    fi

    ACTIVE_PROVIDER="piper"  # default
    if [ -f "$PROVIDER_FILE" ]; then
      ACTIVE_PROVIDER=$(cat "$PROVIDER_FILE")
    fi

    if [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
      # List downloaded Piper voices
      if [[ -f "$SCRIPT_DIR/piper-voice-manager.sh" ]]; then
        source "$SCRIPT_DIR/piper-voice-manager.sh"
        VOICE_DIR=$(get_voice_storage_dir)
        for onnx_file in "$VOICE_DIR"/*.onnx; do
          if [[ -f "$onnx_file" ]]; then
            basename "$onnx_file" .onnx
          fi
        done | sort
      fi
    elif [[ "$ACTIVE_PROVIDER" == "macos" ]]; then
      # List macOS voices (voice names only)
      if [[ "$(uname -s)" == "Darwin" ]]; then
        say -v ? 2>/dev/null | awk '{print $1}' | sort
      else
        echo "(macOS voices only available on macOS)"
      fi
    else
      echo "(Unknown provider: $ACTIVE_PROVIDER)"
    fi
    ;;

  replay)
    # Replay recent TTS audio from history
    # Use project-local directory with same logic as play-tts.sh
    if [[ -n "$CLAUDE_PROJECT_DIR" ]]; then
      AUDIO_DIR="$CLAUDE_PROJECT_DIR/.claude/audio"
    else
      # Fallback: try to find .claude directory in current path
      CURRENT_DIR="$PWD"
      while [[ "$CURRENT_DIR" != "/" ]]; do
        if [[ -d "$CURRENT_DIR/.claude" ]]; then
          AUDIO_DIR="$CURRENT_DIR/.claude/audio"
          break
        fi
        CURRENT_DIR=$(dirname "$CURRENT_DIR")
      done
      # Final fallback to global if no project .claude found
      if [[ -z "$AUDIO_DIR" ]]; then
        AUDIO_DIR="$HOME/.claude/audio"
      fi
    fi

    # Default to replay last audio (N=1)
    N="${2:-1}"

    # Validate N is a number
    if ! [[ "$N" =~ ^[0-9]+$ ]]; then
      echo "❌ Invalid argument. Please use a number (1-10)"
      echo "Usage: /agent-vibes:replay [N]"
      echo "  N=1 - Last audio (default)"
      echo "  N=2 - Second-to-last"
      echo "  N=3 - Third-to-last"
      exit 1
    fi

    # Check bounds
    if [[ $N -lt 1 || $N -gt 10 ]]; then
      echo "❌ Number out of range. Please choose 1-10"
      exit 1
    fi

    # Get list of audio files sorted by time (newest first)
    if [[ ! -d "$AUDIO_DIR" ]]; then
      echo "❌ No audio history found"
      echo "Audio files are stored in: $AUDIO_DIR"
      exit 1
    fi

    # Get the Nth most recent file (check all supported formats)
    AUDIO_FILE=$(ls -t "$AUDIO_DIR"/tts-*.{mp3,wav,aiff} 2>/dev/null | sed -n "${N}p")

    if [[ -z "$AUDIO_FILE" ]]; then
      TOTAL=$(ls -t "$AUDIO_DIR"/tts-*.{mp3,wav,aiff} 2>/dev/null | wc -l)
      echo "❌ Audio #$N not found in history"
      echo "Total audio files available: $TOTAL"
      exit 1
    fi

    echo "🔊 Replaying audio #$N:"
    echo "   File: $(basename "$AUDIO_FILE")"
    echo "   Path: $AUDIO_FILE"

    # Play the audio file in background (afplay for macOS, paplay/aplay/mpg123 for Linux)
    if [[ "$(uname -s)" == "Darwin" ]]; then
      afplay "$AUDIO_FILE" &
    else
      (paplay "$AUDIO_FILE" 2>/dev/null || aplay "$AUDIO_FILE" 2>/dev/null || mpg123 "$AUDIO_FILE" 2>/dev/null) &
    fi
    ;;

  *)
    echo "Usage: voice-manager.sh [list|switch|get|replay|whoami] [voice_name]"
    echo ""
    echo "Commands:"
    echo "  list                    - List all available voices"
    echo "  switch <voice_name>     - Switch to a different voice"
    echo "  get                     - Get current voice name"
    echo "  replay [N]              - Replay Nth most recent audio (default: 1)"
    echo "  whoami                  - Show current voice and personality"
    exit 1
    ;;
esac