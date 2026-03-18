#!/usr/bin/env bash
#
# File: .claude/hooks/configure-rdp-mode.sh
#
# AgentVibes - RDP Mode Configuration
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# ---
#
# @fileoverview Configure RDP mode for optimized audio over remote desktop
# @context Reduces audio bandwidth for choppy RDP audio connections
# @architecture Sets environment variable in shell profile for RDP audio optimization
# @entrypoints Called by /agent-vibes:rdp slash command
#

set -euo pipefail

# Fix locale warnings
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/../config"
mkdir -p "$CONFIG_DIR"

RDP_CONFIG="$CONFIG_DIR/rdp-mode.txt"

# Detect shell profile
SHELL_PROFILE=""
if [[ -f "$HOME/.bashrc" ]]; then
    SHELL_PROFILE="$HOME/.bashrc"
elif [[ -f "$HOME/.zshrc" ]]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [[ -f "$HOME/.profile" ]]; then
    SHELL_PROFILE="$HOME/.profile"
fi

show_status() {
    if [[ -f "$RDP_CONFIG" ]] && [[ "$(cat "$RDP_CONFIG" 2>/dev/null)" == "true" ]]; then
        echo "✅ RDP mode: ENABLED"
        echo ""
        echo "Audio settings:"
        echo "  • Mono (1 channel)"
        echo "  • 22kHz sample rate"
        echo "  • 64kbps bitrate"
        echo ""
        echo "This reduces bandwidth for smoother playback over remote desktop."
    else
        echo "❌ RDP mode: DISABLED"
        echo ""
        echo "Standard audio settings:"
        echo "  • Stereo (2 channels)"
        echo "  • 44.1kHz sample rate"
        echo "  • Default bitrate"
    fi
}

enable_rdp_mode() {
    echo "true" > "$RDP_CONFIG"

    # Add to shell profile if not already present
    if [[ -n "$SHELL_PROFILE" ]]; then
        if ! grep -q "AGENTVIBES_RDP_MODE" "$SHELL_PROFILE" 2>/dev/null; then
            echo "" >> "$SHELL_PROFILE"
            echo "# AgentVibes RDP Mode - Optimized audio for remote desktop" >> "$SHELL_PROFILE"
            echo "export AGENTVIBES_RDP_MODE=true" >> "$SHELL_PROFILE"
            echo "" >> "$SHELL_PROFILE"

            echo "✅ RDP mode enabled"
            echo ""
            echo "⚠️  IMPORTANT: You must restart Claude Code or run:"
            echo "   source $SHELL_PROFILE"
            echo ""
            echo "This is required to set the AGENTVIBES_RDP_MODE environment variable."
        else
            echo "✅ RDP mode enabled (already configured in shell profile)"
        fi
    else
        echo "✅ RDP mode enabled"
        echo ""
        echo "⚠️  WARNING: Could not detect shell profile"
        echo "   Manually add this to your shell profile (.bashrc, .zshrc, etc.):"
        echo "   export AGENTVIBES_RDP_MODE=true"
    fi
}

disable_rdp_mode() {
    echo "false" > "$RDP_CONFIG"

    # Remove from shell profile if present
    if [[ -n "$SHELL_PROFILE" ]] && [[ -f "$SHELL_PROFILE" ]]; then
        if grep -q "AGENTVIBES_RDP_MODE" "$SHELL_PROFILE" 2>/dev/null; then
            # Remove the export line and surrounding AgentVibes RDP comments
            sed -i '/# AgentVibes RDP Mode/d' "$SHELL_PROFILE"
            sed -i '/AGENTVIBES_RDP_MODE/d' "$SHELL_PROFILE"

            echo "✅ RDP mode disabled"
            echo ""
            echo "⚠️  IMPORTANT: You must restart Claude Code or run:"
            echo "   unset AGENTVIBES_RDP_MODE"
            echo "   source $SHELL_PROFILE"
        else
            echo "✅ RDP mode disabled"
        fi
    else
        echo "✅ RDP mode disabled"
    fi
}

# Main command handling
COMMAND="${1:-status}"

case "$COMMAND" in
    on|enable)
        enable_rdp_mode
        ;;
    off|disable)
        disable_rdp_mode
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {on|off|status}"
        echo ""
        echo "  on     - Enable RDP mode (optimized audio)"
        echo "  off    - Disable RDP mode (standard audio)"
        echo "  status - Show current RDP mode status"
        exit 1
        ;;
esac
