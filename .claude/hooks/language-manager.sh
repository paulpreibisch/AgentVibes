#!/bin/bash
# Language Manager for AgentVibes
# Manages language settings and multilingual voice selection

# Determine project or global config
if [[ -d ".claude" ]]; then
    LANGUAGE_FILE=".claude/tts-language.txt"
else
    LANGUAGE_FILE="$HOME/.claude/tts-language.txt"
    mkdir -p "$HOME/.claude"
fi

# Language to multilingual voice mapping
declare -A LANGUAGE_VOICES=(
    ["spanish"]="Antoni"
    ["french"]="Rachel"
    ["german"]="Domi"
    ["italian"]="Bella"
    ["portuguese"]="Matilda"
    ["chinese"]="Antoni"
    ["japanese"]="Antoni"
    ["korean"]="Antoni"
    ["russian"]="Domi"
    ["polish"]="Antoni"
    ["dutch"]="Rachel"
    ["turkish"]="Antoni"
    ["arabic"]="Antoni"
    ["hindi"]="Antoni"
    ["swedish"]="Rachel"
    ["danish"]="Rachel"
    ["norwegian"]="Rachel"
    ["finnish"]="Rachel"
    ["czech"]="Domi"
    ["romanian"]="Rachel"
    ["ukrainian"]="Domi"
    ["greek"]="Antoni"
    ["bulgarian"]="Domi"
    ["croatian"]="Domi"
    ["slovak"]="Domi"
)

# Supported languages list
SUPPORTED_LANGUAGES="spanish, french, german, italian, portuguese, chinese, japanese, korean, polish, dutch, turkish, russian, arabic, hindi, swedish, danish, norwegian, finnish, czech, romanian, ukrainian, greek, bulgarian, croatian, slovak"

# Function to set language
set_language() {
    local lang="$1"

    # Convert to lowercase
    lang=$(echo "$lang" | tr '[:upper:]' '[:lower:]')

    # Handle reset/english
    if [[ "$lang" == "reset" ]] || [[ "$lang" == "english" ]] || [[ "$lang" == "en" ]]; then
        if [[ -f "$LANGUAGE_FILE" ]]; then
            rm "$LANGUAGE_FILE"
            echo "✓ Language reset to English (default)"
        else
            echo "Already using English (default)"
        fi
        return 0
    fi

    # Check if language is supported
    if [[ ! " ${!LANGUAGE_VOICES[@]} " =~ " ${lang} " ]]; then
        echo "❌ Language '$lang' not supported"
        echo ""
        echo "Supported languages:"
        echo "$SUPPORTED_LANGUAGES"
        return 1
    fi

    # Save language
    echo "$lang" > "$LANGUAGE_FILE"

    # Get recommended voice
    local recommended_voice="${LANGUAGE_VOICES[$lang]}"

    echo "✓ Language set to: $lang"
    echo "📢 Recommended multilingual voice: $recommended_voice"
    echo ""
    echo "TTS will now speak in $lang using multilingual voices."
    echo "Switch voice with: /agent-vibes:switch \"$recommended_voice\""
}

# Function to get current language
get_language() {
    if [[ -f "$LANGUAGE_FILE" ]]; then
        local lang=$(cat "$LANGUAGE_FILE")
        local recommended_voice="${LANGUAGE_VOICES[$lang]}"
        echo "Current language: $lang"
        echo "Recommended voice: $recommended_voice"
    else
        echo "Current language: english (default)"
        echo "No multilingual voice required"
    fi
}

# Function to get language for use in other scripts
get_language_code() {
    if [[ -f "$LANGUAGE_FILE" ]]; then
        cat "$LANGUAGE_FILE"
    else
        echo "english"
    fi
}

# Function to check if current voice supports language
is_voice_multilingual() {
    local voice="$1"

    # List of multilingual voices
    local multilingual_voices=("Antoni" "Rachel" "Domi" "Bella" "Charlotte" "Matilda")

    for mv in "${multilingual_voices[@]}"; do
        if [[ "$voice" == "$mv" ]]; then
            return 0
        fi
    done

    return 1
}

# Function to get best voice for current language
get_best_voice_for_language() {
    local lang=$(get_language_code)

    if [[ "$lang" == "english" ]]; then
        # No specific multilingual voice needed for English
        echo ""
        return
    fi

    # Return recommended voice for language
    echo "${LANGUAGE_VOICES[$lang]}"
}

# Main command handler
case "${1:-}" in
    set)
        if [[ -z "$2" ]]; then
            echo "Usage: language-manager.sh set <language>"
            exit 1
        fi
        set_language "$2"
        ;;
    get)
        get_language
        ;;
    code)
        get_language_code
        ;;
    check-voice)
        if [[ -z "$2" ]]; then
            echo "Usage: language-manager.sh check-voice <voice-name>"
            exit 1
        fi
        if is_voice_multilingual "$2"; then
            echo "yes"
        else
            echo "no"
        fi
        ;;
    best-voice)
        get_best_voice_for_language
        ;;
    list)
        echo "Supported languages and recommended voices:"
        echo ""
        for lang in "${!LANGUAGE_VOICES[@]}"; do
            printf "%-15s → %s\n" "$lang" "${LANGUAGE_VOICES[$lang]}"
        done | sort
        ;;
    *)
        echo "AgentVibes Language Manager"
        echo ""
        echo "Usage:"
        echo "  language-manager.sh set <language>     Set language"
        echo "  language-manager.sh get                Get current language"
        echo "  language-manager.sh code               Get language code only"
        echo "  language-manager.sh check-voice <name> Check if voice is multilingual"
        echo "  language-manager.sh best-voice         Get best voice for current language"
        echo "  language-manager.sh list               List all supported languages"
        exit 1
        ;;
esac
