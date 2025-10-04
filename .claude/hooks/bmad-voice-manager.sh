#!/bin/bash

PLUGIN_DIR=".claude/plugins"
PLUGIN_FILE="$PLUGIN_DIR/bmad-voices.md"
ENABLED_FLAG="$PLUGIN_DIR/bmad-voices-enabled.flag"

# Parse markdown table to get voice mapping
get_agent_voice() {
    local agent_id="$1"

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
    touch "$ENABLED_FLAG"
    echo "✅ BMAD voice plugin enabled"
    echo ""
    list_mappings
}

# Disable plugin
disable_plugin() {
    rm -f "$ENABLED_FLAG"
    echo "❌ BMAD voice plugin disabled"
    echo "AgentVibes will use default voice behavior for BMAD agents"
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
    if [[ $(is_plugin_enabled) == "true" ]]; then
        echo "✅ BMAD voice plugin: ENABLED"
    else
        echo "❌ BMAD voice plugin: DISABLED"
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
