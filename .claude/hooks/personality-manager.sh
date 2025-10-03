#!/bin/bash
# Personality manager for AgentVibes - adds character to TTS messages

PERSONALITY_FILE="$HOME/.claude/tts-personality.txt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERSONALITIES_DIR="$SCRIPT_DIR/../personalities"

# Function to get personality data from markdown file
get_personality_data() {
  local personality="$1"
  local field="$2"
  local file="$PERSONALITIES_DIR/${personality}.md"

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  case "$field" in
    prefix)
      sed -n '/^## Prefix/,/^##/p' "$file" | sed '1d;$d' | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
      ;;
    suffix)
      sed -n '/^## Suffix/,/^##/p' "$file" | sed '1d;$d' | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
      ;;
    description)
      grep "^description:" "$file" | cut -d: -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
      ;;
    voice)
      grep "^voice:" "$file" | cut -d: -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
      ;;
    instructions)
      sed -n '/^## AI Instructions/,/^##/p' "$file" | sed '1d;$d'
      ;;
  esac
}

# Function to list all available personalities
list_personalities() {
  local personalities=()

  # Find all .md files in personalities directory
  if [[ -d "$PERSONALITIES_DIR" ]]; then
    for file in "$PERSONALITIES_DIR"/*.md; do
      if [[ -f "$file" ]]; then
        basename "$file" .md
      fi
    done
  fi
}

case "$1" in
  list)
    echo "🎭 Available Personalities:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Get current personality
    CURRENT="normal"
    if [ -f "$PERSONALITY_FILE" ]; then
      CURRENT=$(cat "$PERSONALITY_FILE")
    fi

    # List personalities from markdown files
    echo "Built-in personalities:"
    for personality in $(list_personalities | sort); do
      desc=$(get_personality_data "$personality" "description")
      if [[ "$personality" == "$CURRENT" ]]; then
        echo "  ✓ $personality - $desc (current)"
      else
        echo "  - $personality - $desc"
      fi
    done

    # Add random option
    if [[ "$CURRENT" == "random" ]]; then
      echo "  ✓ random - Picks randomly each time (current)"
    else
      echo "  - random - Picks randomly each time"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Usage: /agent-vibes:personality <name>"
    echo "       /agent-vibes:personality add <name>"
    echo "       /agent-vibes:personality edit <name>"
    ;;

  set|switch)
    PERSONALITY="$2"

    if [[ -z "$PERSONALITY" ]]; then
      echo "❌ Please specify a personality name"
      echo "Usage: $0 set <personality>"
      exit 1
    fi

    # Check if personality file exists (unless it's random)
    if [[ "$PERSONALITY" != "random" ]]; then
      if [[ ! -f "$PERSONALITIES_DIR/${PERSONALITY}.md" ]]; then
        echo "❌ Personality not found: $PERSONALITY"
        echo ""
        echo "Available personalities:"
        for p in $(list_personalities | sort); do
          echo "  • $p"
        done
        exit 1
      fi
    fi

    # Save the personality
    echo "$PERSONALITY" > "$PERSONALITY_FILE"
    echo "🎭 Personality set to: $PERSONALITY"

    # Check if personality has an assigned voice
    ASSIGNED_VOICE=$(get_personality_data "$PERSONALITY" "voice")
    if [[ -n "$ASSIGNED_VOICE" ]]; then
      # Switch to the assigned voice (silently - personality will do the talking)
      VOICE_MANAGER="$SCRIPT_DIR/voice-manager.sh"
      if [[ -x "$VOICE_MANAGER" ]]; then
        echo "🎤 Switching to assigned voice: $ASSIGNED_VOICE"
        "$VOICE_MANAGER" switch "$ASSIGNED_VOICE" --silent >/dev/null 2>&1
      fi
    fi

    # Make a personality-appropriate remark with TTS
    if [[ "$PERSONALITY" != "random" ]]; then
      echo ""

      # Get TTS script path
      TTS_SCRIPT="$SCRIPT_DIR/play-tts.sh"

      # Generate personality-appropriate remark based on personality type
      case "$PERSONALITY" in
        sarcastic)
          # Randomly pick from varied sarcastic remarks
          REMARKS=(
            "Wow, a personality change. This is the highlight of my day. Truly."
            "Fascinating. We're doing sarcasm now. How delightfully predictable."
            "Great, sarcastic mode. Because subtlety was clearly overrated."
            "Could this BE any more sarcastic? Well, yes. Yes it could."
            "Sarcasm enabled. Try to contain your excitement."
            "And now I'm sarcastic. What a thrilling plot twist."
          )
          REMARK="${REMARKS[$RANDOM % ${#REMARKS[@]}]}"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        flirty)
          REMARKS=(
            "Ooh, flirty mode activated. This should be fun, sweetheart~"
            "Well aren't you in for a treat, gorgeous~"
            "Mmm, I like where this is going, darling~"
            "Flirty personality? My pleasure, love~"
            "Oh I'm gonna enjoy this, babe~"
            "Ready to charm your socks off, honey~"
          )
          REMARK="${REMARKS[$RANDOM % ${#REMARKS[@]}]}"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        angry)
          REMARK="FINE! I'm angry now. Happy?!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        pirate)
          REMARK="Arr matey! This scalawag be speakin' like a proper pirate now!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        robot)
          REMARK="PERSONALITY MODULE LOADED. SYSTEM OPERATING IN $PERSONALITY MODE."
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        zen)
          REMARK="Inner peace flows through me like water over smooth stones..."
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        dramatic)
          REMARK="BEHOLD! A NEW PERSONALITY EMERGES FROM THE DEPTHS OF CONFIGURATION!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        millennial)
          REMARK="No cap, this personality is bussin fr fr! Periodt!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        surfer-dude)
          REMARK="Duuuude, this personality is totally gnarly, bro!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        annoying)
          REMARK="OMG THIS IS SO EXCITING!!! I'M ANNOYING NOW!!! ISN'T THIS AMAZING?!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        crass)
          REMARK="Yeah yeah, I'm crass now. What's it to ya?"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        moody)
          REMARK="*sighs* ...another personality... not that it matters..."
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        funny)
          REMARK="*ba dum tss* I'm here all week folks! Try the personality, it's hilarious!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        poetic)
          REMARK="Like petals on the wind, my words shall dance with elegance and grace..."
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        professional)
          REMARK="Acknowledged. Personality configuration has been successfully updated per your request."
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        sassy)
          REMARK="Oh honey, you just activated SASS MODE. Buckle up, sweetie!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        normal)
          REMARK="Personality set to normal. Back to professional mode."
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
        *)
          # For custom personalities
          REMARK="$PERSONALITY personality activated!"
          echo "💬 $REMARK"
          "$TTS_SCRIPT" "$REMARK"
          ;;
      esac

      echo ""
      echo "Note: AI will generate unique ${PERSONALITY} responses - no fixed templates!"
    fi
    ;;

  get)
    if [ -f "$PERSONALITY_FILE" ]; then
      CURRENT=$(cat "$PERSONALITY_FILE")
      echo "Current personality: $CURRENT"

      if [[ "$CURRENT" != "random" ]]; then
        desc=$(get_personality_data "$CURRENT" "description")
        [[ -n "$desc" ]] && echo "Description: $desc"
      fi
    else
      echo "Current personality: normal (default)"
    fi
    ;;

  add)
    NAME="$2"
    if [[ -z "$NAME" ]]; then
      echo "❌ Please specify a personality name"
      echo "Usage: $0 add <name>"
      exit 1
    fi

    FILE="$PERSONALITIES_DIR/${NAME}.md"
    if [[ -f "$FILE" ]]; then
      echo "❌ Personality '$NAME' already exists"
      echo "Use 'edit' to modify it"
      exit 1
    fi

    # Create new personality file
    cat > "$FILE" << 'EOF'
---
name: NAME
description: Custom personality
---

# NAME Personality

## Prefix


## Suffix


## AI Instructions
Describe how the AI should generate messages for this personality.

## Example Responses
- "Example response 1"
- "Example response 2"
EOF

    # Replace NAME with actual name
    sed -i "s/NAME/$NAME/g" "$FILE"

    echo "✅ Created new personality: $NAME"
    echo "📝 Edit the file: $FILE"
    echo ""
    echo "You can now customize:"
    echo "  • Prefix: Text before messages"
    echo "  • Suffix: Text after messages"
    echo "  • AI Instructions: How AI should speak"
    echo "  • Example Responses: Sample messages"
    ;;

  edit)
    NAME="$2"
    if [[ -z "$NAME" ]]; then
      echo "❌ Please specify a personality name"
      echo "Usage: $0 edit <name>"
      exit 1
    fi

    FILE="$PERSONALITIES_DIR/${NAME}.md"
    if [[ ! -f "$FILE" ]]; then
      echo "❌ Personality '$NAME' not found"
      echo "Use 'add' to create it first"
      exit 1
    fi

    echo "📝 Edit this file to customize the personality:"
    echo "$FILE"
    ;;

  reset)
    echo "normal" > "$PERSONALITY_FILE"
    echo "🎭 Personality reset to: normal"
    ;;

  *)
    # If a single argument is provided and it's not a command, treat it as "set <personality>"
    if [[ -n "$1" ]] && [[ -f "$PERSONALITIES_DIR/${1}.md" || "$1" == "random" ]]; then
      # Call set with the personality name
      exec "$0" set "$1"
    else
      echo "AgentVibes Personality Manager"
      echo ""
      echo "Commands:"
      echo "  list                              - List all personalities"
      echo "  set/switch <name>                 - Set personality"
      echo "  add <name>                        - Create new personality"
      echo "  edit <name>                       - Show path to edit personality"
      echo "  get                               - Show current personality"
      echo "  reset                             - Reset to normal"
      echo ""
      echo "Examples:"
      echo "  /agent-vibes:personality flirty"
      echo "  /agent-vibes:personality add cowboy"
    fi
    ;;
esac