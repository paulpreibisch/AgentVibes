#!/bin/bash

# Script to generate provider intro audio and agent intro audio files
# Uses ElevenLabs API

# Check if ELEVENLABS_API_KEY is set in environment
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "Error: ELEVENLABS_API_KEY environment variable is not set"
    echo "Please run: source ~/.zshrc"
    echo "Or set it manually: export ELEVENLABS_API_KEY='your-key-here'"
    exit 1
fi

# Output directories
ELEVENLABS_DIR="agentvibes.org/public/audio/elevenlabs"
PIPER_DIR="agentvibes.org/public/audio/piper-voices"
AGENTS_DIR="agentvibes.org/public/audio/agents"

mkdir -p "$ELEVENLABS_DIR"
mkdir -p "$PIPER_DIR"
mkdir -p "$AGENTS_DIR"

# Voice IDs
MS_WALKER_ID="t0jbNlBVZ17f02VDIeMI"  # Ms. Walker for ElevenLabs intro
MICHAEL_ID="flq6f7yk4E4fJM5XTYuZ"   # Michael for Negotiator
DRILL_SERGEANT_ID="DGzg6RaUqxGRTHSBjfgF"  # Drill Sergeant for Health Coach
ARIA_ID="9BWtsMINqrJLrRacOk9x"  # Aria for Motivator

# Provider explanation texts
PIPER_TEXT="Hello! I'm Piper TTS, your free, offline text-to-speech provider. I'm a fast neural text-to-speech system that runs entirely on your local machine, which means no API costs, complete privacy, and lightning-fast response times. I offer over fifty high-quality voices in multiple languages, all available without an internet connection. I'm perfect for developers who want professional voice synthesis without subscription fees or usage limits. Best of all, I work seamlessly with AgentVibes right out of the box. Try me out and experience free, high-quality text-to-speech!"

ELEVENLABS_TEXT="Welcome to AgentVibes. AgentVibes offers multi-provider support. By selecting ElevenLabs, you have access to premium AI voices. If you want to create an API key, you can create a subscription from AgentVibes. Click on our affiliate link to create an API key now. If however you would rather use free voices, then we advise you to select Piper. For now however, you can click on the personalities and voices below to hear some samples of ElevenLabs amazing voices."

# Agent intro texts (from the webpage)
NEGOTIATOR_TEXT="Hello, I'm your Negotiator agent, inspired by some of the proven methods from Chris Voss, former FBI lead hostage negotiator. I specialize in tactical empathy, calibrated questions, and psychological techniques that help you win negotiations. Whether you're discussing salary, closing a business deal, or navigating a difficult situation, I'll do my best to guide you through strategies from Never Split the Difference. To activate me in AgentVibes, just select the Negotiator agent and I'll help you prepare for any high-stakes conversation. Let's get you the outcome you deserve. Please note, this is an experimental feature and it's meant for entertainment purposes only."

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

# Function to generate Piper audio
generate_piper_audio() {
    local text=$1
    local output_file=$2
    local voice_num=${3:-0}  # Default to Cori (voice 0)

    echo "Generating Piper audio: $output_file"

    # Check if piper is available
    if ! command -v piper &> /dev/null; then
        echo "⚠ Piper not found. Skipping Piper audio generation."
        echo "  Install with: pip install piper-tts"
        return 1
    fi

    # Use echo to pipe text to piper
    echo "$text" | piper --model en_US-lessac-medium --output_file "$output_file"

    if [ $? -eq 0 ]; then
        echo "✓ Successfully generated: $output_file"
    else
        echo "✗ Failed to generate: $output_file"
        return 1
    fi
}

echo "=========================================="
echo "Generating Provider & Agent Intro Audio"
echo "=========================================="
echo ""

# Generate ElevenLabs provider intro
echo "1. ElevenLabs Provider Intro (Ms. Walker)"
echo "------------------------------------------"
generate_elevenlabs_audio "$MS_WALKER_ID" "$ELEVENLABS_TEXT" "${ELEVENLABS_DIR}/provider-intro-elevenlabs.mp3"

echo ""
echo "2. Piper Provider Intro (Cori - will use Piper if installed)"
echo "------------------------------------------"
generate_piper_audio "$PIPER_TEXT" "${PIPER_DIR}/provider-intro-piper.wav" 0

echo ""
echo "3. Agent Intro: Negotiator (Michael)"
echo "------------------------------------------"
generate_elevenlabs_audio "$MICHAEL_ID" "$NEGOTIATOR_TEXT" "${AGENTS_DIR}/elevenlabs-negotiator.mp3"

echo ""
echo "4. Agent Intro: Health Coach (Drill Sergeant)"
echo "------------------------------------------"
generate_elevenlabs_audio "$DRILL_SERGEANT_ID" "$HEALTH_COACH_TEXT" "${AGENTS_DIR}/elevenlabs-health-coach.mp3"

echo ""
echo "5. Agent Intro: Motivator (Aria)"
echo "------------------------------------------"
generate_elevenlabs_audio "$ARIA_ID" "$MOTIVATOR_TEXT" "${AGENTS_DIR}/elevenlabs-motivator.mp3"

echo ""
echo "=========================================="
echo "Generation Complete!"
echo "=========================================="
echo ""
echo "Generated files:"
ls -lh "${ELEVENLABS_DIR}/provider-intro-elevenlabs.mp3" 2>/dev/null
ls -lh "${PIPER_DIR}/provider-intro-piper.wav" 2>/dev/null
ls -lh "${AGENTS_DIR}"/*.mp3 2>/dev/null
