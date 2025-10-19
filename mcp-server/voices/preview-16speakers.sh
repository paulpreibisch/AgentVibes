#!/bin/bash
#
# Preview all 16 speakers in the 16Speakers.onnx voice model
#

MODEL_PATH="/home/fire/claude/AgentVibes/mcp-server/voices/16Speakers.onnx"
OUTPUT_DIR="/home/fire/claude/AgentVibes/mcp-server/voices/previews"
SAMPLE_TEXT="Hello, this is speaker number"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Speaker names from the JSON file
declare -a SPEAKERS=(
    "Cori_Samuel"
    "Kara_Shallenberg"
    "Kristin_Hughes"
    "Maria_Kasper"
    "Mike_Pelton"
    "Mark_Nelson"
    "Michael_Scherer"
    "James_K_White"
    "Rose_Ibex"
    "progressingamerica"
    "Steve_C"
    "Owlivia"
    "Paul_Hampton"
    "Jennifer_Dorr"
    "Emily_Cripps"
    "Martin_Clifton"
)

echo "🎤 Generating voice previews for all 16 speakers..."
echo ""

# Generate preview for each speaker
for i in "${!SPEAKERS[@]}"; do
    SPEAKER_NAME="${SPEAKERS[$i]}"
    OUTPUT_FILE="$OUTPUT_DIR/speaker_${i}_${SPEAKER_NAME}.wav"

    echo "[$((i+1))/16] Generating preview for: $SPEAKER_NAME (Speaker ID: $i)"

    # Generate TTS with speaker ID
    echo "$SAMPLE_TEXT $((i+1)), $SPEAKER_NAME." | piper \
        --model "$MODEL_PATH" \
        --speaker "$i" \
        --output_file "$OUTPUT_FILE" 2>/dev/null

    if [ -f "$OUTPUT_FILE" ]; then
        echo "    ✅ Saved to: $OUTPUT_FILE"
        # Play the audio
        paplay "$OUTPUT_FILE" 2>/dev/null || aplay "$OUTPUT_FILE" 2>/dev/null || afplay "$OUTPUT_FILE" 2>/dev/null
        sleep 1
    else
        echo "    ❌ Failed to generate"
    fi
    echo ""
done

echo "🎉 Preview generation complete!"
echo "📂 All previews saved to: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
