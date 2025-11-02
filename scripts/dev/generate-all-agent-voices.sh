#!/bin/bash

# Script to generate agent intro samples for ALL ElevenLabs and Piper voices
# This allows users to hear agent intros in any voice they select

# Check if ELEVENLABS_API_KEY is set
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "Error: ELEVENLABS_API_KEY environment variable is not set"
    echo "Please set it with: export ELEVENLABS_API_KEY='your-key-here'"
    exit 1
fi

# Output directories
ELEVENLABS_DIR="agentvibes.org/public/audio/elevenlabs/agents"
PIPER_DIR="agentvibes.org/public/audio/piper-voices/agents"

mkdir -p "$ELEVENLABS_DIR"
mkdir -p "$PIPER_DIR"

# Voice model path for Piper
VOICE_MODEL_16="mcp-server/voices/16Speakers.onnx"

# Agent intro texts
NEGOTIATOR_TEXT="Hello, I'm your Negotiator agent, inspired by some of the proven methods from Chris Voss, former FBI lead hostage negotiator. I specialize in tactical empathy, calibrated questions, and psychological techniques that help you win negotiations. Whether you're discussing salary, closing a business deal, or navigating a difficult situation, I'll do my best to guide you through strategies from Never Split the Difference. To activate me in AgentVibes, just select the Negotiator agent and I'll help you prepare for any high-stakes conversation. Let's get you the outcome you deserve. Please note, this is an experimental feature and it's meant for entertainment purposes only."

HEALTH_COACH_TEXT="Hey there! I'm your Health Coach, inspired by the Keto Flex approach from Ben Azadi. I focus on sustainable wellness through clean ketogenic nutrition, intermittent fasting, and addressing root causes rather than just symptoms. Whether you want to lose weight, boost your energy, or improve your metabolic flexibility, I'll do my best to guide you with evidence-based protocols. Activate me in AgentVibes by selecting the Health Coach agent, and let's start your transformation. Remember, you're not broken, your metabolism just needs support. Please note, this is an experimental feature and it's meant for entertainment purposes only."

MOTIVATOR_TEXT="LISTEN UP! I'm your Motivator agent, inspired by the most powerful strategies from Tony Robbins, David Goggins, Mel Robbins, and Les Brown to help you TAKE ACTION NOW. You've got five seconds before your brain kills that idea. Five, four, three, two, one, GO! I'll do my best to use state management, the forty percent rule, and the philosophy of massive action to help destroy your limiting beliefs and get you moving. Select the Motivator agent in AgentVibes when you need someone to hold you accountable and push you past your comfort zone. Your life is happening RIGHT NOW. Stop waiting. Let's DO this! Please note, this is an experimental feature and it's meant for entertainment purposes only."

# ElevenLabs Voice IDs (from voices-config.sh)
declare -A ELEVENLABS_VOICES=(
    ["jessica"]="flHkNRp1BlvT73UL6gyz"
    ["drill"]="vfaqCOvlrKi4Zp7C2IAm"  # Demon Monster
    ["drill-sergeant"]="DGzg6RaUqxGRTHSBjfgF"
    ["aria"]="9BWtsMINqrJLrRacOk9x"
    ["cowboy"]="KTPVrSVAEUSJRClDzBw7"
    ["dr"]="yjJ45q8TVCrtMhEKurxY"
    ["grandpa"]="MKlLqCItoCkvdhrxgtLv"
    ["michael"]="flq6f7yk4E4fJM5XTYuZ"
    ["ms"]="t0jbNlBVZ17f02VDIeMI"
    ["pirate"]="PPzYpIqttlTYA83688JI"
    ["amy"]="bhJUNIXWQQ94l8eI2VUf"
)

# Piper voices (speaker IDs from 16Speakers model)
declare -A PIPER_VOICES=(
    ["0"]="Cori"
    ["1"]="Kara"
    ["2"]="Kristin"
    ["3"]="Maria"
    ["4"]="Mike"
    ["5"]="Mark"
    ["6"]="Michael"
    ["7"]="James"
    ["8"]="Rose"
    ["9"]="Hazel"
    ["10"]="Steve"
)

# Function to generate ElevenLabs audio
generate_elevenlabs_audio() {
    local voice_id=$1
    local voice_slug=$2
    local agent=$3
    local text=$4
    local output_file="${ELEVENLABS_DIR}/${agent}-${voice_slug}.mp3"

    echo "  Generating: ${agent}-${voice_slug}.mp3"

    curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${voice_id}" \
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

    if [ $? -eq 0 ] && [ -s "$output_file" ]; then
        echo "  ✓ Generated: ${agent}-${voice_slug}.mp3"
    else
        echo "  ✗ Failed: ${agent}-${voice_slug}.mp3"
        return 1
    fi

    sleep 0.5
}

# Function to generate Piper audio
generate_piper_audio() {
    local speaker_id=$1
    local speaker_name=$2
    local agent=$3
    local text=$4
    local output_file="${PIPER_DIR}/${agent}-${speaker_id}.wav"

    echo "  Generating: ${agent}-${speaker_id}.wav (${speaker_name})"

    if [ ! -f "$VOICE_MODEL_16" ]; then
        echo "  ✗ Model not found: $VOICE_MODEL_16"
        return 1
    fi

    echo "$text" | piper --model "$VOICE_MODEL_16" --speaker "$speaker_id" --output_file "$output_file" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "  ✓ Generated: ${agent}-${speaker_id}.wav"
    else
        echo "  ✗ Failed: ${agent}-${speaker_id}.wav"
        return 1
    fi
}

echo "=========================================="
echo "Generating Agent Voice Samples"
echo "=========================================="
echo ""

# Generate for each agent
for agent_slug in "negotiator" "health-coach" "motivator"; do
    # Set agent text
    case $agent_slug in
        "negotiator")
            agent_text="$NEGOTIATOR_TEXT"
            agent_name="Negotiator"
            ;;
        "health-coach")
            agent_text="$HEALTH_COACH_TEXT"
            agent_name="Health Coach"
            ;;
        "motivator")
            agent_text="$MOTIVATOR_TEXT"
            agent_name="Motivator"
            ;;
    esac

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Agent: $agent_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Generate ElevenLabs voices
    echo "ElevenLabs Voices:"
    echo "------------------------------------------"
    for voice_slug in "${!ELEVENLABS_VOICES[@]}"; do
        voice_id="${ELEVENLABS_VOICES[$voice_slug]}"
        generate_elevenlabs_audio "$voice_id" "$voice_slug" "$agent_slug" "$agent_text"
    done

    echo ""
    echo "Piper Voices:"
    echo "------------------------------------------"
    # Generate Piper voices
    for speaker_id in "${!PIPER_VOICES[@]}"; do
        speaker_name="${PIPER_VOICES[$speaker_id]}"
        generate_piper_audio "$speaker_id" "$speaker_name" "$agent_slug" "$agent_text"
    done

    echo ""
done

echo "=========================================="
echo "Generation Complete!"
echo "=========================================="
echo ""
echo "ElevenLabs files:"
ls -lh "${ELEVENLABS_DIR}"/*.mp3 2>/dev/null | wc -l
echo ""
echo "Piper files:"
ls -lh "${PIPER_DIR}"/*.wav 2>/dev/null | wc -l
