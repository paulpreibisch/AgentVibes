#!/bin/bash
# Personality manager for AgentVibes - adds character to TTS messages

PERSONALITY_FILE="$HOME/.claude/tts-personality.txt"
CUSTOM_PERSONALITIES_FILE="$HOME/.claude/custom-personalities.json"

# Default personalities with their modifiers
declare -A PERSONALITIES=(
  ["normal"]="NORMAL:|"
  ["flirty"]="FLIRTY: *winks* | *giggles*"
  ["angry"]="ANGRY: Ugh! | Dammit!"
  ["sassy"]="SASSY: *hair flip* | Whatever..."
  ["moody"]="MOODY: *sighs heavily* | I guess..."
  ["funny"]="FUNNY: Hehe! | *ba dum tss*"
  ["sarcastic"]="SARCASTIC: Oh great... | How wonderful..."
  ["poetic"]="POETIC: Like a gentle breeze, | Thus it is complete..."
  ["annoying"]="ANNOYING: OMG OMG OMG! | YAAAAAY!"
  ["professional"]="PROFESSIONAL: Certainly. | Task completed successfully."
  ["pirate"]="PIRATE: Arrr! | Shiver me timbers!"
  ["robot"]="ROBOT: INITIATING: | TASK_COMPLETE."
  ["valley-girl"]="VALLEY: Like, totally | Oh em gee!"
  ["zen"]="ZEN: Mindfully, | In harmony..."
  ["dramatic"]="DRAMATIC: *thunder crashes* | *curtain falls*"
)

case "$1" in
  list)
    echo "🎭 Available Personalities:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Get current personality
    CURRENT="normal"
    if [ -f "$PERSONALITY_FILE" ]; then
      CURRENT=$(cat "$PERSONALITY_FILE")
    fi

    # List built-in personalities
    echo "Built-in:"
    for personality in "${!PERSONALITIES[@]}"; do
      if [[ "$personality" == "$CURRENT" ]]; then
        echo "  ✓ $personality (current)"
      else
        echo "  - $personality"
      fi
    done | sort

    # List custom personalities if they exist
    if [ -f "$CUSTOM_PERSONALITIES_FILE" ] && [ -s "$CUSTOM_PERSONALITIES_FILE" ]; then
      echo ""
      echo "Custom:"
      # Parse custom personalities (simple approach)
      grep '"name"' "$CUSTOM_PERSONALITIES_FILE" | sed 's/.*"name": *"\([^"]*\)".*/  - \1/'
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Usage: /agent-vibes:personality <name>"
    echo "       /agent-vibes:personality add <name> <prefix> <suffix>"
    ;;

  set|switch)
    PERSONALITY_NAME="$2"

    if [[ -z "$PERSONALITY_NAME" ]]; then
      echo "❌ Error: Please specify a personality"
      echo "Usage: /agent-vibes:personality <name>"
      exit 1
    fi

    # Check if it's a built-in personality
    if [[ -n "${PERSONALITIES[$PERSONALITY_NAME]}" ]]; then
      echo "$PERSONALITY_NAME" > "$PERSONALITY_FILE"
      echo "🎭 Personality set to: $PERSONALITY_NAME"

      # Have the voice demonstrate the new personality
      SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
      PLAY_TTS="$SCRIPT_DIR/play-tts.sh"

      # Get the personality prefix
      IFS='|' read -r PREFIX SUFFIX <<< "${PERSONALITIES[$PERSONALITY_NAME]}"
      PREFIX=$(echo "$PREFIX" | sed 's/^[^:]*: *//')

      if [ -x "$PLAY_TTS" ]; then
        DEMO_MESSAGE="$PREFIX I'm now using the $PERSONALITY_NAME personality"
        "$PLAY_TTS" "$DEMO_MESSAGE" > /dev/null 2>&1 &
      fi
    else
      # Check custom personalities
      if [ -f "$CUSTOM_PERSONALITIES_FILE" ]; then
        if grep -q "\"name\": *\"$PERSONALITY_NAME\"" "$CUSTOM_PERSONALITIES_FILE"; then
          echo "$PERSONALITY_NAME" > "$PERSONALITY_FILE"
          echo "🎭 Personality set to custom: $PERSONALITY_NAME"
        else
          echo "❌ Unknown personality: $PERSONALITY_NAME"
          echo "Use '/agent-vibes:personality list' to see available options"
          exit 1
        fi
      else
        echo "❌ Unknown personality: $PERSONALITY_NAME"
        echo "Use '/agent-vibes:personality list' to see available options"
        exit 1
      fi
    fi
    ;;

  add)
    NAME="$2"
    PREFIX="$3"
    SUFFIX="$4"

    if [[ -z "$NAME" || -z "$PREFIX" || -z "$SUFFIX" ]]; then
      echo "❌ Error: Missing parameters"
      echo "Usage: /agent-vibes:personality add <name> <prefix> <suffix>"
      echo "Example: /agent-vibes:personality add \"cowboy\" \"Howdy partner!\" \"Yeehaw!\""
      exit 1
    fi

    # Create custom personalities file if it doesn't exist
    if [ ! -f "$CUSTOM_PERSONALITIES_FILE" ]; then
      echo "[]" > "$CUSTOM_PERSONALITIES_FILE"
    fi

    # Add the custom personality (simple JSON append)
    # Note: In production, you'd want proper JSON parsing
    TEMP_FILE=$(mktemp)
    if [ -s "$CUSTOM_PERSONALITIES_FILE" ]; then
      # Remove the closing bracket
      head -c -2 "$CUSTOM_PERSONALITIES_FILE" > "$TEMP_FILE"
      if [ $(wc -l < "$CUSTOM_PERSONALITIES_FILE") -gt 1 ]; then
        echo "," >> "$TEMP_FILE"
      fi
    else
      echo "[" > "$TEMP_FILE"
    fi

    cat >> "$TEMP_FILE" << EOF
  {
    "name": "$NAME",
    "prefix": "$PREFIX",
    "suffix": "$SUFFIX"
  }
]
EOF

    mv "$TEMP_FILE" "$CUSTOM_PERSONALITIES_FILE"
    echo "✅ Added custom personality: $NAME"
    echo "   Prefix: $PREFIX"
    echo "   Suffix: $SUFFIX"
    echo ""
    echo "Use: /agent-vibes:personality $NAME"
    ;;

  get)
    if [ -f "$PERSONALITY_FILE" ]; then
      CURRENT=$(cat "$PERSONALITY_FILE")
      echo "Current personality: $CURRENT"

      # Show the modifiers
      if [[ -n "${PERSONALITIES[$CURRENT]}" ]]; then
        IFS='|' read -r PREFIX SUFFIX <<< "${PERSONALITIES[$CURRENT]}"
        echo "  Start: $(echo "$PREFIX" | sed 's/^[^:]*: *//')"
        echo "  End: $(echo "$SUFFIX" | sed 's/^ *//')"
      fi
    else
      echo "Current personality: normal (default)"
    fi
    ;;

  apply)
    # Used internally by play-tts.sh to apply personality
    MESSAGE="$2"
    TYPE="$3"  # "start" or "end"

    PERSONALITY="normal"
    if [ -f "$PERSONALITY_FILE" ]; then
      PERSONALITY=$(cat "$PERSONALITY_FILE")
    fi

    # Get modifiers for this personality
    if [[ -n "${PERSONALITIES[$PERSONALITY]}" ]]; then
      IFS='|' read -r PREFIX SUFFIX <<< "${PERSONALITIES[$PERSONALITY]}"

      if [[ "$TYPE" == "start" ]]; then
        MODIFIER=$(echo "$PREFIX" | sed 's/^[^:]*: *//')
      else
        MODIFIER=$(echo "$SUFFIX" | sed 's/^ *//')
      fi

      # Don't add modifier for normal personality
      if [[ "$PERSONALITY" != "normal" ]]; then
        echo "$MODIFIER $MESSAGE"
      else
        echo "$MESSAGE"
      fi
    else
      # Check custom personalities
      if [ -f "$CUSTOM_PERSONALITIES_FILE" ]; then
        # Extract custom personality (simple grep approach)
        if grep -q "\"name\": *\"$PERSONALITY\"" "$CUSTOM_PERSONALITIES_FILE"; then
          if [[ "$TYPE" == "start" ]]; then
            MODIFIER=$(grep -A1 "\"name\": *\"$PERSONALITY\"" "$CUSTOM_PERSONALITIES_FILE" | grep "prefix" | sed 's/.*"prefix": *"\([^"]*\)".*/\1/')
          else
            MODIFIER=$(grep -A2 "\"name\": *\"$PERSONALITY\"" "$CUSTOM_PERSONALITIES_FILE" | grep "suffix" | sed 's/.*"suffix": *"\([^"]*\)".*/\1/')
          fi
          echo "$MODIFIER $MESSAGE"
        else
          echo "$MESSAGE"
        fi
      else
        echo "$MESSAGE"
      fi
    fi
    ;;

  reset)
    echo "normal" > "$PERSONALITY_FILE"
    echo "🎭 Personality reset to: normal"
    ;;

  *)
    echo "AgentVibes Personality Manager"
    echo ""
    echo "Commands:"
    echo "  list                              - List all personalities"
    echo "  set/switch <name>                 - Set personality"
    echo "  add <name> <prefix> <suffix>      - Add custom personality"
    echo "  get                               - Show current personality"
    echo "  reset                             - Reset to normal"
    echo ""
    echo "Examples:"
    echo "  /agent-vibes:personality flirty"
    echo "  /agent-vibes:personality add cowboy \"Howdy!\" \"Partner!\""
    exit 1
    ;;
esac