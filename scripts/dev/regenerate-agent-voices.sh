#!/bin/bash

# Script to regenerate specific agent intros with new voice assignments
# Health Coach: Drill Sergeant
# Motivator: Aria

# Check if ELEVENLABS_API_KEY is set
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "Error: ELEVENLABS_API_KEY environment variable is not set"
    echo "Please set it with: export ELEVENLABS_API_KEY='your-key-here'"
    exit 1
fi

# Output directory
AGENTS_DIR="agentvibes.org/public/audio/agents"
mkdir -p "$AGENTS_DIR"

# Voice IDs
DRILL_SERGEANT_ID="DGzg6RaUqxGRTHSBjfgF"
ARIA_ID="9BWtsMINqrJLrRacOk9x"

# Agent intro texts
HEALTH_COACH_TEXT="Hey there! I'm your Health Coach, inspired by the Keto Flex approach from Ben Azadi. I focus on sustainable wellness through clean ketogenic nutrition, intermittent fasting, and addressing root causes rather than just symptoms. Whether you want to lose weight, boost your energy, or improve your metabolic flexibility, I'll do my best to guide you with evidence-based protocols. Activate me in AgentVibes by selecting the Health Coach agent, and let's start your transformation. Remember, you're not broken, your metabolism just needs support. Please note, this is an experimental feature and it's meant for entertainment purposes only."

MOTIVATOR_TEXT="LISTEN UP! I'm your Motivator agent, inspired by the most powerful strategies from Tony Robbins, David Goggins, Mel Robbins, and Les Brown to help you TAKE ACTION NOW. You've got five seconds before your brain kills that idea. Five, four, three, two, one, GO! I'll do my best to use state management, the forty percent rule, and the philosophy of massive action to help destroy your limiting beliefs and get you moving. Select the Motivator agent in AgentVibes when you need someone to hold you accountable and push you past your comfort zone. Your life is happening RIGHT NOW. Stop waiting. Let's DO this! Please note, this is an experimental feature and it's meant for entertainment purposes only."

# Function to generate ElevenLabs audio
generate_elevenlabs_audio() {
    local voice_id=$1
    local text=$2
    local output_file=$3

    echo "Generating: $output_file"

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
        return 1
    fi

    sleep 1
}

echo "=========================================="
echo "Regenerating Agent Voices"
echo "=========================================="
echo ""

echo "1. Health Coach (Drill Sergeant)"
echo "------------------------------------------"
generate_elevenlabs_audio "$DRILL_SERGEANT_ID" "$HEALTH_COACH_TEXT" "${AGENTS_DIR}/elevenlabs-health-coach.mp3"

echo ""
echo "2. Motivator (Aria)"
echo "------------------------------------------"
generate_elevenlabs_audio "$ARIA_ID" "$MOTIVATOR_TEXT" "${AGENTS_DIR}/elevenlabs-motivator.mp3"

echo ""
echo "=========================================="
echo "Generation Complete!"
echo "=========================================="
echo ""
echo "Generated files:"
ls -lh "${AGENTS_DIR}/elevenlabs-health-coach.mp3" 2>/dev/null
ls -lh "${AGENTS_DIR}/elevenlabs-motivator.mp3" 2>/dev/null
