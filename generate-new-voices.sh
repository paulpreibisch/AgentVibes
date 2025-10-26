#!/bin/bash

# Script to generate ElevenLabs voice samples for new voices
# Voices: Drill Sergeant (DGzg6RaUqxGRTHSBjfgF) and Grandpa Werthers (MKlLqCItoCkvdhrxgtLv)

# Check if ELEVENLABS_API_KEY is set
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "Error: ELEVENLABS_API_KEY environment variable is not set"
    echo "Please set it with: export ELEVENLABS_API_KEY='your-key-here'"
    exit 1
fi

# Output directory
OUTPUT_DIR="agentvibes.org/public/audio/elevenlabs"
mkdir -p "$OUTPUT_DIR"

# Voice configurations
DRILL_SERGEANT_ID="DGzg6RaUqxGRTHSBjfgF"
DRILL_SERGEANT_SLUG="drill-sergeant"

GRANDPA_WERTHERS_ID="MKlLqCItoCkvdhrxgtLv"
GRANDPA_WERTHERS_SLUG="grandpa"

# Personality texts (from the webpage)
declare -A PERSONALITY_TEXTS=(
    ["sarcastic"]="Oh wonderful! Even more documentation surgery. Because that's exactly what I wanted to do with my evening."
    ["angry"]="ARE YOU KIDDING ME?! Another bug in production! This is absolutely UNACCEPTABLE!"
    ["flirty"]="Well hello there, gorgeous! I've been waiting for you to ask me that. How about we tackle this together?"
    ["pirate"]="Arrr matey! Hoist the colors and prepare to set sail on this here coding adventure!"
    ["millennial"]="I literally can't even write now. This cold is giving me anxiety. I need coffee and avocado toast to deal with this. Then we select about it later."
    ["sassy"]="Oh honey, please. I've been doing this since before you even knew what a terminal was. Watch and learn."
    ["robot"]="Beeep boop. Processing request. Human emotion detected. Initiating task completion protocol. Probability of success: 99.7%."
    ["zen"]="Breathe in the bugs. Breathe out the fixes. The code flows like water. We are one with the repository. All errors are merely opportunities for growth."
    ["dramatic"]="This is the most important commit of our lives. The fate of the entire application rests upon this single line of code. Behold."
    ["surfer_dude"]="This code is totally gnarly, like riding the wave of optimization, bro. Let's catch some sick performance improvements."
    ["funny"]="Oh. My. God. Like, this is totally the most important thing ever? I'm literally so excited right now!"
    ["professional"]="For our previous discussion, I've completed the code review and identified three actionable items for optimization. Please advise our next steps."
    ["poetic"]="The code flows eternal. Each function a verse, each variable a rhyme. We write not mere programs, but digital poetry."
    ["moody"]="I guess I'll fix this bug. Not like anyone appreciates my work anyway. Why do I even bother? *Sigh* Fine. Let's get this over with."
    ["grandpa"]="Back in my day, we didn't have all these fancy frameworks. We coded uphill both ways in the snow and we liked it."
    ["dry_humor"]="Another merge conflict. How thrilling. I can barely contain my excitement. This is exactly what I went to computer science school for."
)

# Function to generate audio using ElevenLabs API
generate_audio() {
    local voice_id=$1
    local voice_slug=$2
    local personality=$3
    local text=$4
    local output_file="${OUTPUT_DIR}/${voice_slug}-${personality}.mp3"

    echo "Generating: ${voice_slug}-${personality}.mp3"

    curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/${voice_id}" \
        -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"${text}\",
            \"model_id\": \"eleven_monolingual_v1\",
            \"voice_settings\": {
                \"stability\": 0.5,
                \"similarity_boost\": 0.75
            }
        }" \
        --output "$output_file"

    if [ $? -eq 0 ]; then
        echo "✓ Successfully generated: $output_file"
    else
        echo "✗ Failed to generate: $output_file"
    fi

    # Small delay to avoid rate limiting
    sleep 1
}

echo "=========================================="
echo "Generating ElevenLabs Voice Samples"
echo "=========================================="
echo ""

# Generate all samples for Drill Sergeant
echo "Voice 1: Drill Sergeant"
echo "------------------------------------------"
for personality in "${!PERSONALITY_TEXTS[@]}"; do
    text="${PERSONALITY_TEXTS[$personality]}"
    generate_audio "$DRILL_SERGEANT_ID" "$DRILL_SERGEANT_SLUG" "$personality" "$text"
done

echo ""
echo "Voice 2: Grandpa Werthers"
echo "------------------------------------------"
# Note: Grandpa Werthers keeps the same slug 'grandpa' as before, just new voice ID
for personality in "${!PERSONALITY_TEXTS[@]}"; do
    text="${PERSONALITY_TEXTS[$personality]}"
    generate_audio "$GRANDPA_WERTHERS_ID" "$GRANDPA_WERTHERS_SLUG" "$personality" "$text"
done

echo ""
echo "=========================================="
echo "Generation Complete!"
echo "=========================================="
echo ""
echo "Files created in: $OUTPUT_DIR"
echo ""
echo "Total files generated:"
ls -1 "$OUTPUT_DIR"/*-sergeant-*.mp3 2>/dev/null | wc -l | xargs echo "  Drill Sergeant:"
ls -1 "$OUTPUT_DIR"/grandpa-*.mp3 2>/dev/null | wc -l | xargs echo "  Grandpa Werthers:"
