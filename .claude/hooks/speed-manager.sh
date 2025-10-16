#!/bin/bash
#
# @fileoverview Speech Speed Manager for Piper TTS
# @context Manage speech rate for main and target language voices
# @architecture Simple config file manager for Piper length-scale parameter
#

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine config directory (project-local first, then global)
if [[ -n "$CLAUDE_PROJECT_DIR" ]] && [[ -d "$CLAUDE_PROJECT_DIR/.claude" ]]; then
  CONFIG_DIR="$CLAUDE_PROJECT_DIR/.claude/config"
else
  # Try to find .claude in current path
  CURRENT_DIR="$PWD"
  while [[ "$CURRENT_DIR" != "/" ]]; do
    if [[ -d "$CURRENT_DIR/.claude" ]]; then
      CONFIG_DIR="$CURRENT_DIR/.claude/config"
      break
    fi
    CURRENT_DIR=$(dirname "$CURRENT_DIR")
  done
  # Fallback to global
  if [[ -z "$CONFIG_DIR" ]]; then
    CONFIG_DIR="$HOME/.claude/config"
  fi
fi

mkdir -p "$CONFIG_DIR"

MAIN_SPEED_FILE="$CONFIG_DIR/piper-speech-rate.txt"
TARGET_SPEED_FILE="$CONFIG_DIR/piper-target-speech-rate.txt"

# @function parse_speed_value
# @intent Convert user-friendly speed notation to Piper length-scale value
# @param $1 Speed string (e.g., "2x", "+2x", "-2x", "0.5x", "normal")
# @returns Numeric length-scale value
parse_speed_value() {
  local input="$1"

  # Handle special cases
  case "$input" in
    normal|1x|1.0)
      echo "1.0"
      return
      ;;
    fast|-2x|0.5x)
      echo "0.5"
      return
      ;;
    slow|+2x|2x|2.0)
      echo "2.0"
      return
      ;;
    slower|+3x|3x|3.0)
      echo "3.0"
      return
      ;;
  esac

  # Strip leading '+' if present
  input="${input#+}"

  # Strip trailing 'x' if present
  input="${input%x}"

  # Validate it's a number
  if [[ "$input" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    echo "$input"
  else
    echo "ERROR"
  fi
}

# @function set_speed
# @intent Set speech speed for main or target voice
# @param $1 Target ("target" or empty for main)
# @param $2 Speed value
set_speed() {
  local is_target=false
  local speed_input=""

  # Parse arguments
  if [[ "$1" == "target" ]]; then
    is_target=true
    speed_input="$2"
  else
    speed_input="$1"
  fi

  if [[ -z "$speed_input" ]]; then
    echo "❌ Error: Speed value required"
    echo "Usage: /agent-vibes:set-speed [target] <speed>"
    echo "Examples: 2x, 0.5x, normal, +3x"
    return 1
  fi

  # Parse speed value
  local speed_value
  speed_value=$(parse_speed_value "$speed_input")

  if [[ "$speed_value" == "ERROR" ]]; then
    echo "❌ Invalid speed value: $speed_input"
    echo "Valid values: normal, 0.5x, 1x, 2x, 3x, +2x, -2x"
    return 1
  fi

  # Determine which file to write to
  local config_file
  local voice_type
  if [[ "$is_target" == true ]]; then
    config_file="$TARGET_SPEED_FILE"
    voice_type="target language"
  else
    config_file="$MAIN_SPEED_FILE"
    voice_type="main voice"
  fi

  # Write speed value
  echo "$speed_value" > "$config_file"

  # Show confirmation
  echo "✓ Speech speed set for $voice_type"
  echo ""
  echo "Speed: ${speed_value}x"

  case "$speed_value" in
    0.5)
      echo "Effect: 2x faster (half duration)"
      ;;
    1.0)
      echo "Effect: Normal speed"
      ;;
    2.0)
      echo "Effect: 2x slower (great for language learning)"
      ;;
    3.0)
      echo "Effect: 3x slower (very slow, detailed learning)"
      ;;
    *)
      if (( $(echo "$speed_value > 1.0" | bc -l) )); then
        echo "Effect: Slower speech"
      else
        echo "Effect: Faster speech"
      fi
      ;;
  esac

  echo ""
  echo "Note: Speed control only works with Piper TTS voices"

  # Test the new speed
  if command -v bc &> /dev/null; then
    local test_msg
    if [[ "$is_target" == true ]]; then
      test_msg="Velocidad de voz ajustada para aprender mejor"
    else
      test_msg="Speech speed adjusted successfully"
    fi

    echo ""
    echo "🔊 Testing new speed..."
    "$SCRIPT_DIR/play-tts.sh" "$test_msg" &
  fi
}

# @function get_speed
# @intent Display current speech speed settings
get_speed() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   Current Speech Speed Settings"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Main voice speed
  if [[ -f "$MAIN_SPEED_FILE" ]]; then
    local main_speed=$(grep -v '^#' "$MAIN_SPEED_FILE" 2>/dev/null | grep -v '^$' | tail -1)
    echo "Main voice: ${main_speed}x"
  else
    echo "Main voice: 1.0x (default, normal speed)"
  fi

  # Target voice speed
  if [[ -f "$TARGET_SPEED_FILE" ]]; then
    local target_speed=$(cat "$TARGET_SPEED_FILE" 2>/dev/null)
    echo "Target language: ${target_speed}x"
  else
    echo "Target language: 2.0x (default, 2x slower for learning)"
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main command handler
case "${1:-}" in
  target)
    set_speed "target" "$2"
    ;;
  get|status)
    get_speed
    ;;
  normal|fast|slow|slower|*x|*.*|+*|-*)
    set_speed "$1"
    ;;
  *)
    echo "Speech Speed Manager"
    echo ""
    echo "Usage:"
    echo "  /agent-vibes:set-speed <speed>         Set main voice speed"
    echo "  /agent-vibes:set-speed target <speed>  Set target language speed"
    echo "  /agent-vibes:set-speed get              Show current speeds"
    echo ""
    echo "Speed values:"
    echo "  0.5x or -2x  = 2x faster"
    echo "  1x or normal = Normal speed"
    echo "  2x or +2x    = 2x slower (great for learning)"
    echo "  3x or +3x    = 3x slower"
    echo ""
    echo "Examples:"
    echo "  /agent-vibes:set-speed target 2x"
    echo "  /agent-vibes:set-speed 0.5x"
    echo "  /agent-vibes:set-speed normal"
    ;;
esac
