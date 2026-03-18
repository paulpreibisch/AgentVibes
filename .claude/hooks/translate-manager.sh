#!/usr/bin/env bash
#
# File: .claude/hooks/translate-manager.sh
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
# @fileoverview Translation Manager - Auto-translate TTS to user's preferred language
# @context Integrates with BMAD communication_language and provides manual override
# @architecture Manages translation settings, detects BMAD config, translates text via translator.py
# @dependencies translator.py, language-manager.sh, .bmad/core/config.yaml (optional)
# @entrypoints Called by /agent-vibes:translate commands and play-tts.sh
# @patterns Config cascade - manual override > BMAD config > default (no translation)
# @related translator.py, play-tts.sh, language-manager.sh, learn-manager.sh

# Only set strict mode when executed directly, not when sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    set -euo pipefail
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Use PWD for project dir when called from project context, fall back to script-relative
if [[ -d "$PWD/.claude" ]]; then
    PROJECT_DIR="$PWD"
else
    PROJECT_DIR="$SCRIPT_DIR/../.."
fi

# Configuration files
TRANSLATE_FILE="$PROJECT_DIR/.claude/tts-translate-to.txt"
GLOBAL_TRANSLATE_FILE="$HOME/.claude/tts-translate-to.txt"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Supported languages (matching language-manager.sh)
SUPPORTED_LANGUAGES="spanish french german italian portuguese chinese japanese korean russian polish dutch turkish arabic hindi swedish danish norwegian finnish czech romanian ukrainian greek bulgarian croatian slovak"

# @function get_bmad_language
# @intent Read communication_language from BMAD config
# @why BMAD users can set their preferred language in .bmad/core/config.yaml
# @returns Language name (lowercase) or empty if not set
get_bmad_language() {
    local bmad_config=""

    # Search for BMAD config in project or parents
    local search_dir="$PWD"
    while [[ "$search_dir" != "/" ]]; do
        if [[ -f "$search_dir/.bmad/core/config.yaml" ]]; then
            bmad_config="$search_dir/.bmad/core/config.yaml"
            break
        fi
        search_dir=$(dirname "$search_dir")
    done

    if [[ -z "$bmad_config" ]] || [[ ! -f "$bmad_config" ]]; then
        echo ""
        return
    fi

    # Security: Verify file ownership (should be owned by current user)
    local owner
    owner=$(stat -c '%u' "$bmad_config" 2>/dev/null || stat -f '%u' "$bmad_config" 2>/dev/null || echo "")
    if [[ -n "$owner" ]] && [[ "$owner" != "$(id -u)" ]]; then
        echo "Warning: BMAD config not owned by current user, skipping" >&2
        echo ""
        return
    fi

    # Extract communication_language from YAML (simple grep approach)
    local lang
    lang=$(grep -E "^communication_language:" "$bmad_config" 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' "'"'" | tr '[:upper:]' '[:lower:]')

    echo "$lang"
}

# @function get_translate_to
# @intent Get the target language for translation
# @why Implements priority: manual override > BMAD config > no translation
# @returns Language name or empty if no translation
get_translate_to() {
    # Priority 1: Manual override
    if [[ -f "$TRANSLATE_FILE" ]]; then
        local manual
        manual=$(cat "$TRANSLATE_FILE")
        if [[ "$manual" != "off" ]] && [[ "$manual" != "auto" ]]; then
            echo "$manual"
            return
        elif [[ "$manual" == "off" ]]; then
            echo ""
            return
        fi
        # If "auto", fall through to BMAD detection
    elif [[ -f "$GLOBAL_TRANSLATE_FILE" ]]; then
        local manual
        manual=$(cat "$GLOBAL_TRANSLATE_FILE")
        if [[ "$manual" != "off" ]] && [[ "$manual" != "auto" ]]; then
            echo "$manual"
            return
        elif [[ "$manual" == "off" ]]; then
            echo ""
            return
        fi
    fi

    # Priority 2: BMAD config
    local bmad_lang
    bmad_lang=$(get_bmad_language)
    if [[ -n "$bmad_lang" ]] && [[ "$bmad_lang" != "english" ]]; then
        echo "$bmad_lang"
        return
    fi

    # Default: No translation
    echo ""
}

# @function is_translation_enabled
# @intent Check if translation should occur
# @why Quick check for play-tts.sh to decide whether to translate
# @returns 0 if enabled, 1 if disabled
is_translation_enabled() {
    local translate_to
    translate_to=$(get_translate_to)
    [[ -n "$translate_to" ]] && [[ "$translate_to" != "english" ]]
}

# @function translate_text
# @intent Translate text to target language using translator.py
# @why Central translation function for all TTS
# @param $1 text to translate
# @param $2 target language (optional, auto-detected if not provided)
# @returns Translated text (or original if translation fails/disabled)
translate_text() {
    local text="$1"
    local target="${2:-}"

    if [[ -z "$target" ]]; then
        target=$(get_translate_to)
    fi

    # Skip if no translation target or target is English
    if [[ -z "$target" ]] || [[ "$target" == "english" ]]; then
        echo "$text"
        return
    fi

    # Call translator.py
    local translated
    translated=$(python3 "$SCRIPT_DIR/translator.py" "$text" "$target" 2>/dev/null) || translated="$text"

    echo "$translated"
}

# @function set_translate
# @intent Set manual translation override
# @why Allows users to override BMAD config or force specific language
# @param $1 language name, "auto", or "off"
set_translate() {
    local lang="$1"

    if [[ -z "$lang" ]]; then
        echo -e "${YELLOW}Usage: translate-manager.sh set <language|auto|off>${NC}"
        exit 1
    fi

    lang=$(echo "$lang" | tr '[:upper:]' '[:lower:]')

    mkdir -p "$PROJECT_DIR/.claude"

    if [[ "$lang" == "off" ]]; then
        echo "off" > "$TRANSLATE_FILE"
        echo -e "${GREEN}✓${NC} Translation: ${YELLOW}DISABLED${NC}"
        echo "  TTS will speak in English only"
        return
    fi

    if [[ "$lang" == "auto" ]]; then
        echo "auto" > "$TRANSLATE_FILE"
        echo -e "${GREEN}✓${NC} Translation: ${BLUE}AUTO${NC}"
        echo "  Will detect from BMAD config if available"

        local bmad_lang
        bmad_lang=$(get_bmad_language)
        if [[ -n "$bmad_lang" ]]; then
            echo -e "  ${BLUE}ℹ${NC}  BMAD config detected: $bmad_lang"
        else
            echo -e "  ${YELLOW}⚠${NC}  No BMAD config found, will speak English"
        fi
        return
    fi

    # Validate language
    local valid=false
    for supported in $SUPPORTED_LANGUAGES; do
        if [[ "$lang" == "$supported" ]]; then
            valid=true
            break
        fi
    done

    if [[ "$valid" != "true" ]]; then
        echo -e "${RED}❌${NC} Language '$lang' not supported"
        echo ""
        echo "Supported languages:"
        echo "$SUPPORTED_LANGUAGES" | tr ' ' '\n' | column
        exit 1
    fi

    echo "$lang" > "$TRANSLATE_FILE"
    echo -e "${GREEN}✓${NC} Translation set to: ${BLUE}$lang${NC}"
    echo "  All TTS will be translated to $lang before speaking"

    # Show voice recommendation
    source "$SCRIPT_DIR/language-manager.sh" 2>/dev/null || true
    if command -v get_voice_for_language &>/dev/null; then
        local provider
        provider=$(get_active_provider 2>/dev/null || echo "piper")
        local voice
        voice=$(get_voice_for_language "$lang" "$provider" 2>/dev/null || echo "")
        if [[ -n "$voice" ]]; then
            echo -e "  ${BLUE}💡${NC} Recommended voice: ${YELLOW}$voice${NC}"
            echo -e "     Switch with: /agent-vibes:switch $voice"
        fi
    fi
}

# @function show_status
# @intent Display current translation settings
# @why Help users understand what's configured
show_status() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}   Translation Settings${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check manual setting
    local manual_setting=""
    if [[ -f "$TRANSLATE_FILE" ]]; then
        manual_setting=$(cat "$TRANSLATE_FILE")
    elif [[ -f "$GLOBAL_TRANSLATE_FILE" ]]; then
        manual_setting=$(cat "$GLOBAL_TRANSLATE_FILE")
    fi

    # Check BMAD config
    local bmad_lang
    bmad_lang=$(get_bmad_language)

    # Get effective translation
    local effective
    effective=$(get_translate_to)

    echo -e "  ${BLUE}Manual Setting:${NC}   ${manual_setting:-"(not set)"}"
    echo -e "  ${BLUE}BMAD Language:${NC}    ${bmad_lang:-"(not detected)"}"
    echo -e "  ${BLUE}Effective:${NC}        $(if [[ -n "$effective" ]]; then echo -e "${GREEN}$effective${NC}"; else echo -e "${YELLOW}No translation${NC}"; fi)"
    echo ""

    if [[ -n "$effective" ]]; then
        echo -e "  ${GREEN}✓${NC} TTS will be translated to ${BLUE}$effective${NC}"
    else
        echo -e "  ${YELLOW}ℹ${NC}  TTS will speak in English"
    fi

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}Commands:${NC}"
    echo -e "    /agent-vibes:translate set <lang>  Set manual translation"
    echo -e "    /agent-vibes:translate auto        Use BMAD config"
    echo -e "    /agent-vibes:translate off         Disable translation"
    echo ""
}

# Main command handler - only run if script is executed directly, not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
case "${1:-}" in
    get-bmad-language)
        get_bmad_language
        ;;
    get-translate-to)
        get_translate_to
        ;;
    is-enabled)
        if is_translation_enabled; then
            echo "ON"
            exit 0
        else
            echo "OFF"
            exit 1
        fi
        ;;
    translate)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: translate-manager.sh translate <text> [target_lang]" >&2
            exit 1
        fi
        translate_text "$2" "${3:-}"
        ;;
    set)
        set_translate "${2:-}"
        ;;
    auto)
        set_translate "auto"
        ;;
    off)
        set_translate "off"
        ;;
    status)
        show_status
        ;;
    *)
        show_status
        ;;
esac
fi
