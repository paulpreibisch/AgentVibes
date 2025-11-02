#!/bin/bash

# Script to generate Piper TTS audio for provider and agent intros
# Uses multi-speaker Piper voices

# Output directories
PIPER_DIR="agentvibes.org/public/audio/piper-voices"
AGENTS_DIR="agentvibes.org/public/audio/agents"

mkdir -p "$PIPER_DIR"
mkdir -p "$AGENTS_DIR"

# Voice model paths
VOICE_MODEL_16="mcp-server/voices/16Speakers.onnx"
VOICE_MODEL_LESSAC=".claude/piper-voices/en_US-lessac-medium.onnx"

# Provider explanation texts
PIPER_TEXT="Hello! I'm Piper TTS, your free, offline text-to-speech provider. I'm a fast neural text-to-speech system that runs entirely on your local machine, which means no API costs, complete privacy, and lightning-fast response times. I offer over fifty high-quality voices in multiple languages, all available without an internet connection. I'm perfect for developers who want professional voice synthesis without subscription fees or usage limits. Best of all, I work seamlessly with AgentVibes right out of the box. Try me out and experience free, high-quality text-to-speech!"

# Agent intro texts (updated with disclaimers)
NEGOTIATOR_TEXT="Hello, I'm your Negotiator agent, inspired by some of the proven methods from Chris Voss, former FBI lead hostage negotiator. I specialize in tactical empathy, calibrated questions, and psychological techniques that help you win negotiations. Whether you're discussing salary, closing a business deal, or navigating a difficult situation, I'll do my best to guide you through strategies from Never Split the Difference. To activate me in AgentVibes, just select the Negotiator agent and I'll help you prepare for any high-stakes conversation. Let's get you the outcome you deserve. Please note, this is an experimental feature and it's meant for entertainment purposes only."

HEALTH_COACH_TEXT="Hey there! I'm your Health Coach, inspired by the Keto Flex approach from Ben Azadi. I focus on sustainable wellness through clean ketogenic nutrition, intermittent fasting, and addressing root causes rather than just symptoms. Whether you want to lose weight, boost your energy, or improve your metabolic flexibility, I'll do my best to guide you with evidence-based protocols. Activate me in AgentVibes by selecting the Health Coach agent, and let's start your transformation. Remember, you're not broken, your metabolism just needs support. Please note, this is an experimental feature and it's meant for entertainment purposes only."

MOTIVATOR_TEXT="LISTEN UP! I'm your Motivator agent, inspired by the most powerful strategies from Tony Robbins, David Goggins, Mel Robbins, and Les Brown to help you TAKE ACTION NOW. You've got five seconds before your brain kills that idea. Five, four, three, two, one, GO! I'll do my best to use state management, the forty percent rule, and the philosophy of massive action to help destroy your limiting beliefs and get you moving. Select the Motivator agent in AgentVibes when you need someone to hold you accountable and push you past your comfort zone. Your life is happening RIGHT NOW. Stop waiting. Let's DO this! Please note, this is an experimental feature and it's meant for entertainment purposes only."

# Function to generate Piper audio
generate_piper_audio() {
    local text=$1
    local output_file=$2
    local model=$3
    local speaker=${4:-0}  # Default to speaker 0

    echo "Generating: $output_file (speaker $speaker)"

    # Check if model exists
    if [ ! -f "$model" ]; then
        echo "✗ Model not found: $model"
        return 1
    fi

    # Use echo to pipe text to piper
    echo "$text" | piper --model "$model" --speaker "$speaker" --output_file "$output_file"

    if [ $? -eq 0 ]; then
        echo "✓ Successfully generated: $output_file"
    else
        echo "✗ Failed to generate: $output_file"
        return 1
    fi
}

echo "=========================================="
echo "Generating Piper Agent Intro Audio"
echo "=========================================="
echo ""

# Generate Piper provider intro (using Kristin Hughes - speaker 2)
echo "1. Piper Provider Intro (Kristin Hughes - Speaker 2)"
echo "------------------------------------------"
generate_piper_audio "$PIPER_TEXT" "${PIPER_DIR}/provider-intro-piper.wav" "$VOICE_MODEL_16" 2

echo ""
echo "2. Agent Intro: Negotiator (Michael - Speaker 6)"
echo "------------------------------------------"
generate_piper_audio "$NEGOTIATOR_TEXT" "${AGENTS_DIR}/piper-negotiator.wav" "$VOICE_MODEL_16" 6

echo ""
echo "3. Agent Intro: Health Coach (Michael - Speaker 6)"
echo "------------------------------------------"
generate_piper_audio "$HEALTH_COACH_TEXT" "${AGENTS_DIR}/piper-health-coach.wav" "$VOICE_MODEL_16" 6

echo ""
echo "4. Agent Intro: Motivator (Anthony Malone - Speaker 7)"
echo "------------------------------------------"
generate_piper_audio "$MOTIVATOR_TEXT" "${AGENTS_DIR}/piper-motivator.wav" "$VOICE_MODEL_16" 7

echo ""
echo "=========================================="
echo "Generation Complete!"
echo "=========================================="
echo ""
echo "Generated files:"
ls -lh "${PIPER_DIR}/provider-intro-piper.wav" 2>/dev/null
ls -lh "${AGENTS_DIR}"/piper-*.wav 2>/dev/null
