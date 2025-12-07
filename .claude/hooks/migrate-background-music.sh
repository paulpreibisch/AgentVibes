#!/usr/bin/env bash
#
# File: .claude/hooks/migrate-background-music.sh
#
# AgentVibes - Background Music Migration Script
# Cleans up old background music structure from previous versions
#
# This script removes:
# - Old optimized/ subdirectory
# - Old PascalCase/space-formatted filenames
# - Outdated config entries with optimized/ prefix
#
# Called automatically during installation to ensure clean state
#

set -euo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BG_DIR="$SCRIPT_DIR/../audio/tracks"
CONFIG_FILE="$SCRIPT_DIR/../config/audio-effects.cfg"

# Flag to track if any changes were made
CHANGES_MADE=false

echo "🔄 Checking for old background music structure..."

# 1. Remove old optimized/ subdirectory if it exists
if [[ -d "$BG_DIR/optimized" ]]; then
    echo "  → Removing old optimized/ subdirectory..."

    # Check if there are any files in optimized/ that aren't in the parent
    if [[ -n "$(find "$BG_DIR/optimized" -type f -name "*.mp3" 2>/dev/null)" ]]; then
        # Move any unique files up before deleting
        find "$BG_DIR/optimized" -type f -name "*.mp3" 2>/dev/null | while IFS= read -r file; do
            basename_file=$(basename "$file")
            # Convert to snake_case if needed
            snake_case_file=$(echo "$basename_file" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr '-' '_')

            # Only move if file doesn't exist in parent with snake_case name
            if [[ ! -f "$BG_DIR/$snake_case_file" ]]; then
                echo "    • Migrating: $basename_file → $snake_case_file"
                mv "$file" "$BG_DIR/$snake_case_file"
                CHANGES_MADE=true
            fi
        done
    fi

    # Remove the optimized directory
    rm -rf "$BG_DIR/optimized"
    echo "  ✓ Removed optimized/ subdirectory"
    CHANGES_MADE=true
fi

# 2. Remove old PascalCase/space-formatted files if snake_case versions exist
if [[ -d "$BG_DIR" ]]; then
    find "$BG_DIR" -maxdepth 1 -type f -name "*.mp3" 2>/dev/null | while IFS= read -r file; do
        basename_file=$(basename "$file")

        # Check if this file has spaces or uppercase letters (old format)
        if [[ "$basename_file" =~ [[:space:]] ]] || [[ "$basename_file" =~ [A-Z] ]]; then
            # Generate snake_case equivalent
            snake_case_file=$(echo "$basename_file" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr '-' '_')

            # If snake_case version exists, remove the old format
            if [[ -f "$BG_DIR/$snake_case_file" ]] && [[ "$basename_file" != "$snake_case_file" ]]; then
                echo "  → Removing old format: $basename_file (replaced by $snake_case_file)"
                rm -f "$file"
                CHANGES_MADE=true
            fi
        fi
    done
fi

# 3. Update audio-effects.cfg to remove optimized/ prefixes
if [[ -f "$CONFIG_FILE" ]]; then
    if grep -q "optimized/" "$CONFIG_FILE" 2>/dev/null; then
        echo "  → Updating config to remove optimized/ prefixes..."

        # Create backup
        cp "$CONFIG_FILE" "${CONFIG_FILE}.backup-migration"

        # Remove optimized/ prefix from all entries
        sed -i.bak 's|optimized/||g' "$CONFIG_FILE"
        rm -f "${CONFIG_FILE}.bak"

        echo "  ✓ Updated audio-effects.cfg"
        CHANGES_MADE=true
    fi

    # Also convert any remaining PascalCase/space filenames to snake_case in config
    if grep -E '\|[^|]*[A-Z ][^|]*\.mp3\|' "$CONFIG_FILE" 2>/dev/null | grep -v '^#' > /dev/null; then
        echo "  → Converting config entries to snake_case..."

        # This is complex - we need to convert field 3 (background file) to snake_case
        temp_file=$(mktemp)
        while IFS='|' read -r field1 field2 field3 field4 rest; do
            # Skip comments and empty lines
            if [[ "$field1" =~ ^#.* ]] || [[ -z "$field1" ]]; then
                echo "$field1|$field2|$field3|$field4$rest"
                continue
            fi

            # Convert field3 (background file) to snake_case if it contains spaces or uppercase
            if [[ -n "$field3" ]] && ([[ "$field3" =~ [[:space:]] ]] || [[ "$field3" =~ [A-Z] ]]); then
                new_field3=$(echo "$field3" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr '-' '_')
                echo "$field1|$field2|$new_field3|$field4$rest"
            else
                echo "$field1|$field2|$field3|$field4$rest"
            fi
        done < "$CONFIG_FILE" > "$temp_file"

        mv "$temp_file" "$CONFIG_FILE"
        echo "  ✓ Converted config entries to snake_case"
        CHANGES_MADE=true
    fi
fi

if [[ "$CHANGES_MADE" == "true" ]]; then
    echo "✅ Migration complete! Old background music structure cleaned up."
else
    echo "✅ No migration needed - structure is already up to date."
fi
