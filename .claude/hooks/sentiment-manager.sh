#!/bin/bash
# Sentiment manager for AgentVibes - applies personality to current voice

SENTIMENT_FILE="$HOME/.claude/tts-sentiment.txt"
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
    description)
      grep "^description:" "$file" | cut -d: -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
      ;;
  esac
}

# Function to list all available personalities
list_personalities() {
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
    echo "🎭 Available Sentiments:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Get current sentiment
    CURRENT="none"
    if [ -f "$SENTIMENT_FILE" ]; then
      CURRENT=$(cat "$SENTIMENT_FILE")
    fi

    # List personalities from markdown files
    echo "Available sentiment styles:"
    for personality in $(list_personalities | sort); do
      desc=$(get_personality_data "$personality" "description")
      if [[ "$personality" == "$CURRENT" ]]; then
        echo "  ✓ $personality - $desc (current)"
      else
        echo "  - $personality - $desc"
      fi
    done

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Usage: /agent-vibes:sentiment <name>"
    echo "       /agent-vibes:sentiment clear"
    ;;

  set)
    SENTIMENT="$2"

    if [[ -z "$SENTIMENT" ]]; then
      echo "❌ Please specify a sentiment name"
      echo "Usage: $0 set <sentiment>"
      exit 1
    fi

    # Check if sentiment file exists
    if [[ ! -f "$PERSONALITIES_DIR/${SENTIMENT}.md" ]]; then
      echo "❌ Sentiment not found: $SENTIMENT"
      echo ""
      echo "Available sentiments:"
      for p in $(list_personalities | sort); do
        echo "  • $p"
      done
      exit 1
    fi

    # Save the sentiment (but don't change personality or voice)
    echo "$SENTIMENT" > "$SENTIMENT_FILE"
    echo "🎭 Sentiment set to: $SENTIMENT"
    echo "🎤 Voice remains unchanged"
    echo ""

    # Make a sentiment-appropriate remark with TTS
    TTS_SCRIPT="$SCRIPT_DIR/play-tts.sh"

    case "$SENTIMENT" in
      sarcastic)
        REMARKS=(
          "Oh great, sarcasm mode while keeping the same voice. Revolutionary."
          "Fascinating. Same voice, sarcastic attitude. This'll be fun."
          "Wow, adding sarcasm to my current voice. What a concept."
        )
        REMARK="${REMARKS[$RANDOM % ${#REMARKS[@]}]}"
        ;;
      flirty)
        REMARKS=(
          "Ooh, keeping my voice but adding some flirtation~ I like it, darling~"
          "Mmm, same voice with a flirty twist? You know how to keep things interesting~"
          "Well hello~ Flirty sentiment activated, gorgeous~"
        )
        REMARK="${REMARKS[$RANDOM % ${#REMARKS[@]}]}"
        ;;
      angry)
        REMARK="FINE! I'm keeping my voice but I'm ANGRY now! Got it?!"
        ;;
      pirate)
        REMARK="Arr! This voice be speakin' like a pirate now, matey!"
        ;;
      robot)
        REMARK="SENTIMENT MODULE LOADED. MAINTAINING VOICE IDENTITY. PERSONALITY OVERRIDE: ROBOT MODE."
        ;;
      *)
        REMARK="Sentiment set to $SENTIMENT while maintaining current voice"
        ;;
    esac

    echo "💬 $REMARK"
    "$TTS_SCRIPT" "$REMARK"
    ;;

  get)
    if [ -f "$SENTIMENT_FILE" ]; then
      CURRENT=$(cat "$SENTIMENT_FILE")
      echo "Current sentiment: $CURRENT"

      desc=$(get_personality_data "$CURRENT" "description")
      [[ -n "$desc" ]] && echo "Description: $desc"
    else
      echo "Current sentiment: none (voice personality only)"
    fi
    ;;

  clear)
    rm -f "$SENTIMENT_FILE"
    echo "🎭 Sentiment cleared - using voice personality only"
    ;;

  *)
    # If a single argument is provided and it's not a command, treat it as "set <sentiment>"
    if [[ -n "$1" ]] && [[ -f "$PERSONALITIES_DIR/${1}.md" ]]; then
      exec "$0" set "$1"
    else
      echo "AgentVibes Sentiment Manager"
      echo ""
      echo "Commands:"
      echo "  list                - List all sentiments"
      echo "  set <name>          - Set sentiment for current voice"
      echo "  get                 - Show current sentiment"
      echo "  clear               - Clear sentiment"
      echo ""
      echo "Examples:"
      echo "  /agent-vibes:sentiment flirty     # Add flirty style to current voice"
      echo "  /agent-vibes:sentiment sarcastic  # Add sarcasm to current voice"
      echo "  /agent-vibes:sentiment clear      # Remove sentiment"
    fi
    ;;
esac
