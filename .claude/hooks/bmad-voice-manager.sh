#!/usr/bin/env bash
#
# File: .claude/hooks/bmad-voice-manager.sh
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
# @fileoverview BMAD Voice Plugin Manager - Maps BMAD agents to unique TTS voices
# @context Enables each BMAD agent to have its own distinct voice for multi-agent sessions
# @architecture Markdown table-based voice mapping with enable/disable flag, auto-detection of BMAD
# @dependencies .claude/config/bmad-voices.md (voice mappings), bmad-tts-injector.sh, .bmad-core/ (BMAD installation)
# @entrypoints Called by /agent-vibes:bmad commands, auto-enabled on BMAD detection
# @patterns Plugin architecture, auto-enable on dependency detection, state backup/restore on toggle
# @related bmad-tts-injector.sh, .claude/config/bmad-voices.md, .bmad-agent-context file

CONFIG_DIR=".agentvibes/bmad"
VOICE_CONFIG_FILE="$CONFIG_DIR/bmad-voices.md"
ENABLED_FLAG="$CONFIG_DIR/bmad-voices-enabled.flag"

# AI NOTE: Auto-enable pattern - When BMAD is detected via install-manifest.yaml,
# automatically enable the voice plugin to provide seamless multi-agent voice support.
# This avoids requiring manual plugin activation after BMAD installation.
# Supports both BMAD v4 (.bmad-core/) and v6-alpha (bmad/) directory structures.

# @function detect_bmad_version
# @intent Detect BMAD installation and return version number
# @why Support both v4 and v6-alpha installations with different directory structures
# @param None
# @returns Echoes version number (4, 6, or 0 for not installed) to stdout
# @exitcode 0=detected, 1=not installed
# @sideeffects None
# @edgecases Checks v6 first (newer version), falls back to v4
# @calledby auto_enable_if_bmad_detected, get_bmad_config_path
# @calls None
detect_bmad_version() {
    if [[ -f ".bmad/_cfg/manifest.yaml" ]]; then
        # v6 detected (standard path with dot prefix)
        echo "6"
        return 0
    elif [[ -f "bmad/_cfg/manifest.yaml" ]]; then
        # v6 detected (alternative path without dot prefix)
        echo "6"
        return 0
    elif [[ -f ".bmad-core/install-manifest.yaml" ]]; then
        # v4 detected
        echo "4"
        return 0
    else
        # Not installed
        echo "0"
        return 1
    fi
}

# @function get_bmad_config_path
# @intent Get BMAD configuration file path based on detected version
# @why v4 and v6 use different directory structures for config files
# @param None
# @returns Echoes config path to stdout, empty string if not installed
# @exitcode 0=path returned, 1=not installed
# @sideeffects None
# @edgecases Returns empty string if BMAD not detected
# @calledby Commands that need to read BMAD config (future use)
# @calls detect_bmad_version
get_bmad_config_path() {
    local version=$(detect_bmad_version)

    if [[ "$version" == "6" ]]; then
        # Check both possible v6 paths
        if [[ -f ".bmad/core/config.yaml" ]]; then
            echo ".bmad/core/config.yaml"
        else
            echo "bmad/core/config.yaml"
        fi
        return 0
    elif [[ "$version" == "4" ]]; then
        echo ".bmad-core/config.yaml"
        return 0
    else
        echo ""
        return 1
    fi
}

# @function auto_enable_if_bmad_detected
# @intent Automatically enable BMAD voice plugin when BMAD framework is detected
# @why Provide seamless integration - users shouldn't need to manually enable voice mapping
# @param None
# @returns None
# @exitcode 0=auto-enabled, 1=not enabled (already enabled or BMAD not detected)
# @sideeffects Creates enabled flag file, creates plugin directory
# @edgecases Only auto-enables if plugin not already enabled, silent operation
# @calledby get_agent_voice
# @calls mkdir, touch, detect_bmad_version
auto_enable_if_bmad_detected() {
    local version=$(detect_bmad_version)

    # Check if BMAD is installed (any version) and plugin not already enabled
    if [[ "$version" != "0" ]] && [[ ! -f "$ENABLED_FLAG" ]]; then
        # BMAD detected but plugin not enabled - enable it silently
        mkdir -p "$CONFIG_DIR"
        touch "$ENABLED_FLAG"
        return 0
    fi
    return 1
}

# @function get_agent_voice
# @intent Retrieve TTS voice assigned to specific BMAD agent (provider-aware)
# @why Each BMAD agent needs unique voice for multi-agent conversation differentiation
# @param $1 {string} agent_id - BMAD agent identifier (pm, dev, qa, architect, etc.)
# @returns Echoes voice name to stdout, empty string if plugin disabled or agent not found
# @exitcode Always 0
# @sideeffects May auto-enable plugin if BMAD detected
# @edgecases Returns empty string if plugin disabled/missing, parses markdown table syntax
# @calledby bmad-tts-injector.sh, play-tts.sh when BMAD agent is active
# @calls auto_enable_if_bmad_detected, grep, awk, sed
# @version 2.0.0 - Now provider-aware: returns Piper or macOS voice based on active provider
get_agent_voice() {
    local agent_id="$1"

    # Check for BMAD v6 CSV file first (preferred, loose coupling)
    # If this exists, use it directly without requiring plugin enable flag
    # Support both .bmad (standard) and bmad (alternative) paths
    local bmad_voice_map=""
    if [[ -f ".bmad/_cfg/agent-voice-map.csv" ]]; then
        bmad_voice_map=".bmad/_cfg/agent-voice-map.csv"
    elif [[ -f "bmad/_cfg/agent-voice-map.csv" ]]; then
        bmad_voice_map="bmad/_cfg/agent-voice-map.csv"
    fi

    if [[ -n "$bmad_voice_map" ]]; then
        # Read from BMAD's standard _cfg directory
        # CSV format: agent_id,voice_name
        local voice=$(grep "^$agent_id," "$bmad_voice_map" | cut -d',' -f2)

        # If voice is empty or generic (same for all), use defaults
        if [[ -n "$voice" ]] && [[ "$voice" != "en_US-lessac-medium" ]]; then
            echo "$voice"
            return
        fi
        # If empty or generic, fall through to defaults below
    fi

    # Default voice mappings (hardcoded fallback when CSV is missing or has generic values)
    # These match the BMAD-METHOD defaults for consistency
    case "$agent_id" in
        bmad-master)
            echo "en_US-lessac-medium"
            return
            ;;
        analyst)
            echo "en_US-kristin-medium"
            return
            ;;
        architect)
            echo "en_GB-alan-medium"
            return
            ;;
        dev)
            echo "en_US-joe-medium"
            return
            ;;
        pm)
            echo "en_US-ryan-high"
            return
            ;;
        quick-flow-solo-dev)
            echo "en_US-joe-medium"
            return
            ;;
        sm)
            echo "en_US-amy-medium"
            return
            ;;
        tea)
            echo "en_US-kusal-medium"
            return
            ;;
        tech-writer)
            echo "en_US-kristin-medium"
            return
            ;;
        ux-designer)
            echo "en_US-kristin-medium"
            return
            ;;
        frame-expert)
            echo "en_GB-alan-medium"
            return
            ;;
    esac

    # Auto-enable if BMAD is detected (for legacy markdown config)
    auto_enable_if_bmad_detected

    if [[ ! -f "$ENABLED_FLAG" ]]; then
        echo ""  # Plugin disabled
        return
    fi

    # Fallback to legacy markdown config file
    if [[ ! -f "$VOICE_CONFIG_FILE" ]]; then
        echo ""  # Plugin file missing
        return
    fi

    # Detect active TTS provider
    local provider_file=""
    if [[ -f ".claude/tts-provider.txt" ]]; then
        provider_file=".claude/tts-provider.txt"
    elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
        provider_file="$HOME/.claude/tts-provider.txt"
    fi

    local active_provider="piper"  # default
    if [[ -n "$provider_file" ]] && [[ -f "$provider_file" ]]; then
        active_provider=$(cat "$provider_file")
    fi

    # Extract voice from markdown table based on provider
    # Table: Agent ID | Agent Name | Intro | Piper Voice | macOS Voice | Personality
    # AWK columns: $1=empty | $2=ID | $3=Name | $4=Intro | $5=Piper | $6=macOS | $7=Personality
    local column=5  # Default to Piper (AWK column 5)
    if [[ "$active_provider" == "piper" ]]; then
        column=6  # Use Piper (AWK column 6)
    fi

    local voice=$(grep "^| $agent_id " "$VOICE_CONFIG_FILE" | \
                  awk -F'|' "{print \$$column}" | \
                  sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    echo "$voice"
}

# @function sync_intros_from_manifest
# @intent Synchronize generic intros in agent-voice-map.csv with displayNames from agent-manifest.csv
# @why Until BMAD PR 987 merges, CSV has generic "Hello! Ready to help with the discussion." intros
# @param None (operates on .bmad/_cfg files)
# @returns 0 on success, 1 on error
# @exitcode 0 on success, 1 if files missing or sync fails
# @sideeffects Updates agent-voice-map.csv, creates .backup on first run, writes .bmad-csv-sync-timestamp
# @edgecases Only updates EXACT match of generic intro, preserves all custom intros, idempotent
# @calledby get_agent_intro (lazy trigger on manifest change)
# @calls grep, cut, sed, stat, date
# @version 2.17.4 - Safe CSV sync utility that preserves user customizations
sync_intros_from_manifest() {
    # Locate the CSV and manifest files
    local bmad_voice_map=""
    local manifest_file=""

    if [[ -f ".bmad/_cfg/agent-voice-map.csv" ]]; then
        bmad_voice_map=".bmad/_cfg/agent-voice-map.csv"
    elif [[ -f "bmad/_cfg/agent-voice-map.csv" ]]; then
        bmad_voice_map="bmad/_cfg/agent-voice-map.csv"
    fi

    if [[ -f ".bmad/_cfg/agent-manifest.csv" ]]; then
        manifest_file=".bmad/_cfg/agent-manifest.csv"
    elif [[ -f "bmad/_cfg/agent-manifest.csv" ]]; then
        manifest_file="bmad/_cfg/agent-manifest.csv"
    fi

    # Both files must exist for sync to work
    if [[ -z "$bmad_voice_map" ]] || [[ -z "$manifest_file" ]]; then
        return 1
    fi

    # Check if sync is needed based on manifest timestamp
    local timestamp_file="${bmad_voice_map%/*}/.bmad-csv-sync-timestamp"
    local manifest_mtime=$(stat -c '%Y' "$manifest_file" 2>/dev/null || stat -f '%m' "$manifest_file" 2>/dev/null)

    if [[ -f "$timestamp_file" ]]; then
        local last_sync=$(cat "$timestamp_file" 2>/dev/null || echo "0")
        if [[ "$manifest_mtime" -le "$last_sync" ]]; then
            # Manifest hasn't changed since last sync
            return 0
        fi
    fi

    # Create backup on first sync
    if [[ ! -f "${bmad_voice_map}.backup" ]]; then
        cp "$bmad_voice_map" "${bmad_voice_map}.backup"
    fi

    # Build a temp file with synced intros
    local temp_file="${bmad_voice_map}.tmp"
    local generic_intro="Hello! Ready to help with the discussion."

    # Read header
    head -n 1 "$bmad_voice_map" > "$temp_file"

    # Process each agent entry
    tail -n +2 "$bmad_voice_map" | while IFS=, read -r agent voice intro; do
        # Remove quotes from intro
        intro=$(echo "$intro" | sed 's/^"//;s/"$//')

        # Only update if intro is the exact generic placeholder
        if [[ "$intro" == "$generic_intro" ]]; then
            # Look up displayName and title from manifest using awk for proper CSV parsing
            # CSV format: name,displayName,title,icon,role,...
            local manifest_data=$(grep "^\"*${agent}\"*," "$manifest_file" | awk -F'","' '{
                gsub(/^"/, "", $2);
                gsub(/"$/, "", $3);
                print $2 "|" $3
            }')

            local display_name=$(echo "$manifest_data" | cut -d'|' -f1)
            local title=$(echo "$manifest_data" | cut -d'|' -f2)

            if [[ -n "$display_name" ]] && [[ -n "$title" ]]; then
                # Generate intro like PR 987: "Hi! I'm [Name], your [Title]."
                intro="Hi! I'm ${display_name}, your ${title}."
            elif [[ -n "$display_name" ]]; then
                # Fallback if title missing
                intro="${display_name} here"
            fi
        fi

        # Write the line (preserving custom intros, updating generic ones)
        echo "${agent},${voice},\"${intro}\""
    done >> "$temp_file"

    # Replace original with synced version
    mv "$temp_file" "$bmad_voice_map"

    # Update timestamp
    echo "$manifest_mtime" > "$timestamp_file"

    return 0
}

# @function get_agent_intro
# @intent Retrieve intro text for BMAD agent (spoken before their message)
# @why Helps users identify which agent is speaking in party mode
# @param $1 {string} agent_id - BMAD agent identifier
# @returns Echoes intro text to stdout, empty string if not configured
# @exitcode Always 0
# @sideeffects Triggers CSV sync on first call or manifest change
# @edgecases Returns empty string if plugin file missing, parses column 3 of CSV or markdown table
# @calledby bmad-speak.sh for agent identification in party mode
# @calls sync_intros_from_manifest, grep, awk, sed, cut
# @version 2.2.1 - Added lazy CSV sync trigger
get_agent_intro() {
    local agent_id="$1"

    # Check for BMAD v6 CSV file first (preferred, loose coupling)
    # If this exists, use it directly without requiring plugin enable flag
    # Support both .bmad (standard) and bmad (alternative) paths
    local bmad_voice_map=""
    if [[ -f ".bmad/_cfg/agent-voice-map.csv" ]]; then
        bmad_voice_map=".bmad/_cfg/agent-voice-map.csv"
    elif [[ -f "bmad/_cfg/agent-voice-map.csv" ]]; then
        bmad_voice_map="bmad/_cfg/agent-voice-map.csv"
    fi

    # Lazy trigger: sync intros from manifest if needed
    if [[ -n "$bmad_voice_map" ]]; then
        sync_intros_from_manifest
    fi

    if [[ -n "$bmad_voice_map" ]]; then
        # Read from BMAD's standard _cfg directory
        # CSV format: agent,voice,intro
        # Use awk to properly handle quoted CSV fields (intro may contain commas)
        local intro=$(grep "^$agent_id," "$bmad_voice_map" | awk -F',' '{
            # Extract field 3 onwards (intro may span multiple comma-separated parts)
            intro = $3;
            for (i = 4; i <= NF; i++) {
                intro = intro "," $i;
            }
            gsub(/^"/, "", intro);
            gsub(/"$/, "", intro);
            print intro;
        }')

        # If intro is empty or generic, fall back to agent display name from manifest
        if [[ -z "$intro" ]] || [[ "$intro" == "Hello! Ready to help with the discussion." ]]; then
            # Try to get display name from agent-manifest.csv
            local manifest_file=""
            if [[ -f ".bmad/_cfg/agent-manifest.csv" ]]; then
                manifest_file=".bmad/_cfg/agent-manifest.csv"
            elif [[ -f "bmad/_cfg/agent-manifest.csv" ]]; then
                manifest_file="bmad/_cfg/agent-manifest.csv"
            fi

            if [[ -n "$manifest_file" ]]; then
                # Extract displayName (column 2) where name (column 1) matches agent_id
                # CSV format: name,displayName,title,icon,role,...
                local display_name=$(grep "^\"*${agent_id}\"*," "$manifest_file" | cut -d',' -f2 | sed 's/^"//;s/"$//')
                if [[ -n "$display_name" ]]; then
                    intro="$display_name here"
                fi
            fi
        fi

        # If we got an intro, return it
        if [[ -n "$intro" ]]; then
            echo "$intro"
            return
        fi
        # Otherwise fall through to hardcoded defaults below
    fi

    # Hardcoded default intro mappings (final fallback)
    # These match the BMAD-METHOD agent display names for consistency
    case "$agent_id" in
        bmad-master)
            echo "BMad Master here"
            return
            ;;
        analyst)
            echo "Mary here"
            return
            ;;
        architect)
            echo "Winston here"
            return
            ;;
        dev)
            echo "Amelia here"
            return
            ;;
        pm)
            echo "John here"
            return
            ;;
        quick-flow-solo-dev)
            echo "Barry here"
            return
            ;;
        sm)
            echo "Bob here"
            return
            ;;
        tea)
            echo "Murat here"
            return
            ;;
        tech-writer)
            echo "Paige here"
            return
            ;;
        ux-designer)
            echo "Sally here"
            return
            ;;
        frame-expert)
            echo "Frame Expert here"
            return
            ;;
    esac

    # Fallback to legacy markdown config file
    if [[ ! -f "$VOICE_CONFIG_FILE" ]]; then
        echo ""
        return
    fi

    # AWK column 4 = Intro text
    local intro=$(grep "^| $agent_id " "$VOICE_CONFIG_FILE" | \
                  awk -F'|' '{print $4}' | \
                  sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    echo "$intro"
}

# @function get_agent_personality
# @intent Retrieve TTS personality assigned to specific BMAD agent
# @why Agents may have distinct speaking styles (friendly, professional, energetic, etc.)
# @param $1 {string} agent_id - BMAD agent identifier
# @returns Echoes personality name to stdout, empty string if not found
# @exitcode Always 0
# @sideeffects None
# @edgecases Returns empty string if plugin file missing, parses column 6 of markdown table
# @calledby bmad-tts-injector.sh for personality-aware voice synthesis
# @calls grep, awk, sed
# @version 2.0.0 - Updated to column 6 (was 5) due to new provider-aware format
get_agent_personality() {
    local agent_id="$1"

    if [[ ! -f "$VOICE_CONFIG_FILE" ]]; then
        echo ""
        return
    fi

    # AWK column 7 = Personality
    local personality=$(grep "^| $agent_id " "$VOICE_CONFIG_FILE" | \
                       awk -F'|' '{print $7}' | \
                       sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    echo "$personality"
}

# @function is_plugin_enabled
# @intent Check if BMAD voice plugin is currently enabled
# @why Allow conditional logic based on plugin state
# @param None
# @returns Echoes "true" or "false" to stdout
# @exitcode Always 0
# @sideeffects None
# @edgecases None
# @calledby show_status, enable_plugin, disable_plugin
# @calls None (file existence check)
is_plugin_enabled() {
    [[ -f "$ENABLED_FLAG" ]] && echo "true" || echo "false"
}

# @function enable_plugin
# @intent Enable BMAD voice plugin and backup current voice settings
# @why Allow users to switch to per-agent voices while preserving original configuration
# @param None
# @returns None
# @exitcode Always 0
# @sideeffects Creates flag file, backs up current voice/personality/sentiment to .bmad-previous-settings
# @sideeffects Creates activation-instructions file for BMAD agents, calls bmad-tts-injector.sh
# @edgecases Handles missing settings files gracefully with defaults
# @calledby Main command dispatcher with "enable" argument
# @calls mkdir, cat, source, list_mappings, bmad-tts-injector.sh
enable_plugin() {
    mkdir -p "$CONFIG_DIR"

    # Save current settings before enabling
    BACKUP_FILE="$CONFIG_DIR/.bmad-previous-settings"

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

    # Create activation-instructions file for BMAD agents
    ACTIVATION_FILE=".claude/activation-instructions"
    if [[ ! -f "$ACTIVATION_FILE" ]]; then
        cat > "$ACTIVATION_FILE" <<'ACTIVATION_EOF'
# BMAD Agent Activation Instructions

When a BMAD agent activates, follow these steps EXACTLY:

## STEP 3.5a: Create BMAD Context File (CRITICAL)

**IMMEDIATELY after agent identification, create the context file:**

```bash
echo "$AGENT_ID" > .bmad-agent-context
```

Where `$AGENT_ID` is one of:
- `pm` (Product Manager)
- `dev` (Developer)
- `qa` (QA)
- `architect` (Architect)
- `po` (Product Owner)
- `analyst` (Analyst)
- `sm` (Scrum Master)
- `ux-expert` (UX Expert)
- `bmad-master` (BMAD Master)
- `bmad-orchestrator` (Orchestrator)

**Example:**
```bash
# For Product Manager agent
echo "pm" > .bmad-agent-context
```

This file allows AgentVibes to:
1. Detect which BMAD agent is active
2. Look up the correct voice mapping
3. Automatically speak questions using the agent's assigned voice

## STEP 10: Clean Up on Exit

**Before exiting the agent, remove the context file:**

```bash
rm -f .bmad-agent-context
```

This ensures voice switching only happens when an agent is active.

## Why This Matters

Without the `.bmad-agent-context` file:
- AgentVibes cannot detect which agent is active
- Questions won't be spoken automatically
- Voice switching won't work
- The BMAD voice plugin becomes non-functional

**This is MANDATORY for BMAD voice integration to work!**
ACTIVATION_EOF
        echo "📝 Created activation instructions: $ACTIVATION_FILE"
    fi

    echo "✅ BMAD voice plugin enabled"
    echo "💾 Previous settings backed up:"
    echo "   Voice: $CURRENT_VOICE"
    echo "   Personality: $CURRENT_PERSONALITY"
    [[ -n "$CURRENT_SENTIMENT" ]] && echo "   Sentiment: $CURRENT_SENTIMENT"
    echo ""
    list_mappings

    # Automatically inject TTS into BMAD agents
    echo ""
    echo "🎤 Automatically enabling TTS for BMAD agents..."
    echo ""

    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Check if bmad-tts-injector.sh exists
    if [[ -f "$SCRIPT_DIR/bmad-tts-injector.sh" ]]; then
        # Run the TTS injector
        "$SCRIPT_DIR/bmad-tts-injector.sh" enable
    else
        echo "⚠️  TTS injector not found at: $SCRIPT_DIR/bmad-tts-injector.sh"
        echo "   You can manually enable TTS with: /agent-vibes:bmad-tts enable"
    fi
}

# @function disable_plugin
# @intent Disable BMAD voice plugin and restore previous voice settings
# @why Allow users to return to single-voice mode with their original configuration
# @param None
# @returns None
# @exitcode Always 0
# @sideeffects Removes flag file, restores settings from backup, calls bmad-tts-injector.sh disable
# @edgecases Handles missing backup file gracefully, warns user if no backup exists
# @calledby Main command dispatcher with "disable" argument
# @calls source, rm, echo, bmad-tts-injector.sh
disable_plugin() {
    BACKUP_FILE="$CONFIG_DIR/.bmad-previous-settings"

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

    # Automatically remove TTS from BMAD agents
    echo ""
    echo "🔇 Automatically disabling TTS for BMAD agents..."
    echo ""

    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Check if bmad-tts-injector.sh exists
    if [[ -f "$SCRIPT_DIR/bmad-tts-injector.sh" ]]; then
        # Run the TTS injector disable
        "$SCRIPT_DIR/bmad-tts-injector.sh" disable
    else
        echo "⚠️  TTS injector not found"
        echo "   You can manually disable TTS with: /agent-vibes:bmad-tts disable"
    fi
}

# @function list_mappings
# @intent Display all BMAD agent-to-voice mappings in readable format (provider-aware)
# @why Help users see which voice is assigned to each agent based on active TTS provider
# @param None
# @returns None
# @exitcode 0=success, 1=plugin file not found
# @sideeffects Writes formatted output to stdout
# @edgecases Parses markdown table format, skips header and separator rows
# @calledby enable_plugin, show_status, main command dispatcher with "list"
# @calls grep, sed, echo
# @version 2.1.0 - Now provider-aware: shows Piper or macOS voices based on active provider
list_mappings() {
    if [[ ! -f "$VOICE_CONFIG_FILE" ]]; then
        echo "❌ Plugin file not found: $VOICE_CONFIG_FILE"
        return 1
    fi

    # Detect active TTS provider
    local provider_file=""
    if [[ -f ".claude/tts-provider.txt" ]]; then
        provider_file=".claude/tts-provider.txt"
    elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
        provider_file="$HOME/.claude/tts-provider.txt"
    fi

    local active_provider="piper"  # default
    if [[ -n "$provider_file" ]] && [[ -f "$provider_file" ]]; then
        active_provider=$(cat "$provider_file")
    fi

    # Display provider info
    echo "📊 BMAD Agent Voice Mappings (Provider: $active_provider):"
    echo ""

    # Table: Agent ID | Agent Name | Intro | Piper Voice | macOS Voice | Personality
    # AWK columns: $1=empty | $2=ID | $3=Name | $4=Intro | $5=Piper | $6=macOS | $7=Personality
    local voice_column=5  # Default to Piper (AWK column 5)
    if [[ "$active_provider" == "piper" ]]; then
        voice_column=6  # Use Piper (AWK column 6)
    fi

    grep "^| " "$VOICE_CONFIG_FILE" | grep -v "Agent ID" | grep -v "^|---" | \
    while IFS='|' read -r line; do
        agent_id=$(echo "$line" | awk -F'|' '{print $2}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        name=$(echo "$line" | awk -F'|' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        voice=$(echo "$line" | awk -F'|' "{print \$$voice_column}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        personality=$(echo "$line" | awk -F'|' '{print $7}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        [[ -n "$agent_id" ]] && echo "   $agent_id → $voice [$personality]"
    done
}

# @function set_agent_voice
# @intent Update voice and personality mapping for specific BMAD agent
# @why Allow customization of agent voices to user preferences
# @param $1 {string} agent_id - BMAD agent identifier
# @param $2 {string} voice - New voice name
# @param $3 {string} personality - New personality (optional, defaults to "normal")
# @returns None
# @exitcode 0=success, 1=plugin file not found or agent not found
# @sideeffects Modifies plugin file, creates .bak backup
# @edgecases Validates agent exists before updating
# @calledby Main command dispatcher with "set" argument
# @calls grep, sed
set_agent_voice() {
    local agent_id="$1"
    local voice="$2"
    local personality="${3:-normal}"

    if [[ ! -f "$VOICE_CONFIG_FILE" ]]; then
        echo "❌ Plugin file not found: $VOICE_CONFIG_FILE"
        return 1
    fi

    # Check if agent exists
    if ! grep -q "^| $agent_id " "$VOICE_CONFIG_FILE"; then
        echo "❌ Agent '$agent_id' not found in plugin"
        return 1
    fi

    # Update the voice and personality in the table
    sed -i.bak "s/^| $agent_id |.*| .* | .* |$/| $agent_id | $(grep "^| $agent_id " "$VOICE_CONFIG_FILE" | awk -F'|' '{print $3}') | $voice | $personality |/" "$VOICE_CONFIG_FILE"

    echo "✅ Updated $agent_id → $voice [$personality]"
}

# @function show_status
# @intent Display plugin status, BMAD detection, and current voice mappings
# @why Provide comprehensive overview of plugin state for troubleshooting
# @param None
# @returns None
# @exitcode Always 0
# @sideeffects Writes status information to stdout
# @edgecases Checks for BMAD installation via manifest file
# @calledby Main command dispatcher with "status" argument
# @calls is_plugin_enabled, list_mappings
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

# @function edit_plugin
# @intent Open plugin configuration file for manual editing
# @why Allow advanced users to modify voice mappings directly
# @param None
# @returns None
# @exitcode 0=success, 1=plugin file not found
# @sideeffects Displays file path and instructions
# @edgecases Does not actually open editor, just provides guidance
# @calledby Main command dispatcher with "edit" argument
# @calls echo
edit_plugin() {
    if [[ ! -f "$VOICE_CONFIG_FILE" ]]; then
        echo "❌ Plugin file not found: $VOICE_CONFIG_FILE"
        return 1
    fi

    echo "Opening $VOICE_CONFIG_FILE for editing..."
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
    get-intro)
        get_agent_intro "$2"
        ;;
    get-personality)
        get_agent_personality "$2"
        ;;
    edit)
        edit_plugin
        ;;
    *)
        echo "Usage: bmad-voice-manager.sh {enable|disable|status|list|set|get-voice|get-intro|get-personality|edit}"
        echo ""
        echo "Commands:"
        echo "  enable              Enable BMAD voice plugin"
        echo "  disable             Disable BMAD voice plugin"
        echo "  status              Show plugin status and mappings"
        echo "  list                List all agent voice mappings"
        echo "  set <id> <voice>    Set voice for agent"
        echo "  get-voice <id>      Get voice for agent"
        echo "  get-intro <id>      Get intro text for agent"
        echo "  get-personality <id> Get personality for agent"
        echo "  edit                Edit plugin configuration"
        exit 1
        ;;
esac
