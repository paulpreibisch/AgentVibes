#!/bin/bash

PLUGIN_DIR=".claude/plugins"
PLUGIN_FILE="$PLUGIN_DIR/bmad-voices.md"
ENABLED_FLAG="$PLUGIN_DIR/bmad-voices-enabled.flag"

# Auto-enable plugin if BMAD is detected
auto_enable_if_bmad_detected() {
    # Check if BMAD is installed
    if [[ -f ".bmad-core/install-manifest.yaml" ]] && [[ ! -f "$ENABLED_FLAG" ]]; then
        # BMAD detected but plugin not enabled - enable it silently
        mkdir -p "$PLUGIN_DIR"
        touch "$ENABLED_FLAG"
        return 0
    fi
    return 1
}

# Parse markdown table to get voice mapping
get_agent_voice() {
    local agent_id="$1"

    # Auto-enable if BMAD is detected
    auto_enable_if_bmad_detected

    if [[ ! -f "$ENABLED_FLAG" ]]; then
        echo ""  # Plugin disabled
        return
    fi

    if [[ ! -f "$PLUGIN_FILE" ]]; then
        echo ""  # Plugin file missing
        return
    fi

    # Extract voice from markdown table
    local voice=$(grep "^| $agent_id " "$PLUGIN_FILE" | \
                  awk -F'|' '{print $4}' | \
                  sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    echo "$voice"
}

# Get personality for agent
get_agent_personality() {
    local agent_id="$1"

    if [[ ! -f "$PLUGIN_FILE" ]]; then
        echo ""
        return
    fi

    local personality=$(grep "^| $agent_id " "$PLUGIN_FILE" | \
                       awk -F'|' '{print $5}' | \
                       sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    echo "$personality"
}

# Check if plugin is enabled
is_plugin_enabled() {
    [[ -f "$ENABLED_FLAG" ]] && echo "true" || echo "false"
}

# Enable plugin
enable_plugin() {
    mkdir -p "$PLUGIN_DIR"

    # Save current settings before enabling
    BACKUP_FILE="$PLUGIN_DIR/.bmad-previous-settings"

    # Save current voice
    if [[ -f ".claude/tts-voice.txt" ]]; then
        CURRENT_VOICE=$(cat .claude/tts-voice.txt 2>/dev/null)
    elif [[ -f "$HOME/.claude/tts-voice.txt" ]]; then
        CURRENT_VOICE=$(cat "$HOME/.claude/tts-voice.txt" 2>/dev/null)
    else
        CURRENT_VOICE="Aria"
    fi

    # Save current personality
    if [[ -f ".claude/tts-personality.txt" ]]; then
        CURRENT_PERSONALITY=$(cat .claude/tts-personality.txt 2>/dev/null)
    elif [[ -f "$HOME/.claude/tts-personality.txt" ]]; then
        CURRENT_PERSONALITY=$(cat "$HOME/.claude/tts-personality.txt" 2>/dev/null)
    else
        CURRENT_PERSONALITY="normal"
    fi

    # Save current sentiment
    if [[ -f ".claude/tts-sentiment.txt" ]]; then
        CURRENT_SENTIMENT=$(cat .claude/tts-sentiment.txt 2>/dev/null)
    elif [[ -f "$HOME/.claude/tts-sentiment.txt" ]]; then
        CURRENT_SENTIMENT=$(cat "$HOME/.claude/tts-sentiment.txt" 2>/dev/null)
    else
        CURRENT_SENTIMENT=""
    fi

    # Write backup
    cat > "$BACKUP_FILE" <<EOF
VOICE=$CURRENT_VOICE
PERSONALITY=$CURRENT_PERSONALITY
SENTIMENT=$CURRENT_SENTIMENT
EOF

    touch "$ENABLED_FLAG"
    echo "✅ BMAD voice plugin enabled"
    echo "💾 Previous settings backed up:"
    echo "   Voice: $CURRENT_VOICE"
    echo "   Personality: $CURRENT_PERSONALITY"
    [[ -n "$CURRENT_SENTIMENT" ]] && echo "   Sentiment: $CURRENT_SENTIMENT"
    echo ""
    list_mappings
}

# Disable plugin
disable_plugin() {
    BACKUP_FILE="$PLUGIN_DIR/.bmad-previous-settings"

    # Check if we have a backup to restore
    if [[ -f "$BACKUP_FILE" ]]; then
        source "$BACKUP_FILE"

        echo "❌ BMAD voice plugin disabled"
        echo "🔄 Restoring previous settings:"
        echo "   Voice: $VOICE"
        echo "   Personality: $PERSONALITY"
        [[ -n "$SENTIMENT" ]] && echo "   Sentiment: $SENTIMENT"

        # Restore voice
        if [[ -n "$VOICE" ]]; then
            echo "$VOICE" > .claude/tts-voice.txt 2>/dev/null || echo "$VOICE" > "$HOME/.claude/tts-voice.txt"
        fi

        # Restore personality
        if [[ -n "$PERSONALITY" ]] && [[ "$PERSONALITY" != "normal" ]]; then
            echo "$PERSONALITY" > .claude/tts-personality.txt 2>/dev/null || echo "$PERSONALITY" > "$HOME/.claude/tts-personality.txt"
        fi

        # Restore sentiment
        if [[ -n "$SENTIMENT" ]]; then
            echo "$SENTIMENT" > .claude/tts-sentiment.txt 2>/dev/null || echo "$SENTIMENT" > "$HOME/.claude/tts-sentiment.txt"
        fi

        # Clean up backup
        rm -f "$BACKUP_FILE"
    else
        echo "❌ BMAD voice plugin disabled"
        echo "⚠️  No previous settings found to restore"
        echo "AgentVibes will use current voice/personality settings"
    fi

    rm -f "$ENABLED_FLAG"
}

# List all mappings
list_mappings() {
    if [[ ! -f "$PLUGIN_FILE" ]]; then
        echo "❌ Plugin file not found: $PLUGIN_FILE"
        return 1
    fi

    echo "📊 BMAD Agent Voice Mappings:"
    echo ""

    grep "^| " "$PLUGIN_FILE" | grep -v "Agent ID" | grep -v "^|---" | \
    while IFS='|' read -r _ agent_id name voice personality _; do
        agent_id=$(echo "$agent_id" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        name=$(echo "$name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        voice=$(echo "$voice" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        personality=$(echo "$personality" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        [[ -n "$agent_id" ]] && echo "   $agent_id → $voice [$personality]"
    done
}

# Set voice for agent
set_agent_voice() {
    local agent_id="$1"
    local voice="$2"
    local personality="${3:-normal}"

    if [[ ! -f "$PLUGIN_FILE" ]]; then
        echo "❌ Plugin file not found: $PLUGIN_FILE"
        return 1
    fi

    # Check if agent exists
    if ! grep -q "^| $agent_id " "$PLUGIN_FILE"; then
        echo "❌ Agent '$agent_id' not found in plugin"
        return 1
    fi

    # Update the voice and personality in the table
    sed -i.bak "s/^| $agent_id |.*| .* | .* |$/| $agent_id | $(grep "^| $agent_id " "$PLUGIN_FILE" | awk -F'|' '{print $3}') | $voice | $personality |/" "$PLUGIN_FILE"

    echo "✅ Updated $agent_id → $voice [$personality]"
}

# Show status
show_status() {
    # Check for BMAD installation
    local bmad_installed="false"
    if [[ -f ".bmad-core/install-manifest.yaml" ]]; then
        bmad_installed="true"
    fi

    if [[ $(is_plugin_enabled) == "true" ]]; then
        echo "✅ BMAD voice plugin: ENABLED"
        if [[ "$bmad_installed" == "true" ]]; then
            echo "🔍 BMAD detected: Auto-enabled"
        fi
    else
        echo "❌ BMAD voice plugin: DISABLED"
        if [[ "$bmad_installed" == "true" ]]; then
            echo "⚠️  BMAD detected but plugin disabled (enable with: /agent-vibes-bmad enable)"
        fi
    fi
    echo ""
    list_mappings
}

# Edit plugin file
edit_plugin() {
    if [[ ! -f "$PLUGIN_FILE" ]]; then
        echo "❌ Plugin file not found: $PLUGIN_FILE"
        return 1
    fi

    echo "Opening $PLUGIN_FILE for editing..."
    echo "Edit the markdown table to change voice mappings"
}

# Main command dispatcher
case "${1:-help}" in
    enable)
        enable_plugin
        ;;
    disable)
        disable_plugin
        ;;
    status)
        show_status
        ;;
    list)
        list_mappings
        ;;
    set)
        if [[ -z "$2" ]] || [[ -z "$3" ]]; then
            echo "Usage: bmad-voice-manager.sh set <agent-id> <voice> [personality]"
            exit 1
        fi
        set_agent_voice "$2" "$3" "$4"
        ;;
    get-voice)
        get_agent_voice "$2"
        ;;
    get-personality)
        get_agent_personality "$2"
        ;;
    edit)
        edit_plugin
        ;;
    *)
        echo "Usage: bmad-voice-manager.sh {enable|disable|status|list|set|get-voice|get-personality|edit}"
        echo ""
        echo "Commands:"
        echo "  enable              Enable BMAD voice plugin"
        echo "  disable             Disable BMAD voice plugin"
        echo "  status              Show plugin status and mappings"
        echo "  list                List all agent voice mappings"
        echo "  set <id> <voice>    Set voice for agent"
        echo "  get-voice <id>      Get voice for agent"
        echo "  get-personality <id> Get personality for agent"
        echo "  edit                Edit plugin configuration"
        exit 1
        ;;
esac
