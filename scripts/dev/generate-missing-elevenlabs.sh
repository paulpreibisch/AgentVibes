#!/bin/bash

# Script to generate missing ElevenLabs audio samples
# Usage: ./generate-missing-elevenlabs.sh

# Use the API key from environment
if [ -z "$OCT_8_ELEVELABS_API_KEY" ]; then
  echo "ERROR: OCT_8_ELEVELABS_API_KEY environment variable is not set"
  echo "Run: export OCT_8_ELEVELABS_API_KEY='your-key-here'"
  exit 1
fi

OUTPUT_DIR="/home/fire/claude/AgentVibes/agentvibes.org/public/audio/elevenlabs"
mkdir -p "$OUTPUT_DIR"

# Define personality texts
declare -A PERSONALITY_TEXTS
PERSONALITY_TEXTS[sarcastic]="Oh wonderful! Even more documentation surgery. Because that's exactly what I wanted to do with my evening."
PERSONALITY_TEXTS[angry]="ARE YOU KIDDING ME?! Another bug in production! This is absolutely UNACCEPTABLE!"
PERSONALITY_TEXTS[flirty]="Well hello there, gorgeous! I've been waiting for you to ask me that. How about we tackle this together?"
PERSONALITY_TEXTS[pirate]="Arrr matey! Hoist the colors and prepare to set sail on this here coding adventure!"
PERSONALITY_TEXTS[millennial]="No cap, I'll handle that for you fr fr! This is gonna be absolutely bussin, bestie!"
PERSONALITY_TEXTS[sassy]="Oh honey, please. I've been doing this since before you even knew what a terminal was. Watch and learn."
PERSONALITY_TEXTS[robot]="AFFIRMATIVE. INITIATING TASK SEQUENCE. PROCESSING REQUEST WITH MAXIMUM EFFICIENCY."
PERSONALITY_TEXTS[zen]="Take a deep breath. Center yourself. The code will flow naturally when we approach it with mindfulness."
PERSONALITY_TEXTS[dramatic]="GASP! This changes EVERYTHING! The fate of the entire codebase hangs in the balance!"
PERSONALITY_TEXTS[surfer_dude]="Dude! This wave is totally tubular! Let's hang ten and catch some gnarly code, bro!"
PERSONALITY_TEXTS[funny]="Oh. My. God. Like, this is totally the most important thing ever? I'm literally so excited right now!"
PERSONALITY_TEXTS[professional]="According to best practices and industry standards, the optimal approach would be to implement this systematically."
PERSONALITY_TEXTS[poetic]="In the garden of code, where logic blooms eternal, let us craft solutions that sing with elegant beauty."
PERSONALITY_TEXTS[moody]="I suppose we could work on this... if you really think it matters. Does anything really matter though?"
PERSONALITY_TEXTS[grandpa]="Oh sweetie, come here and let grandpa help you with that. I've got some wisdom to share from my years of coding!"
PERSONALITY_TEXTS[dry_humor]="Well, that's just fantastic. Another edge case. What could possibly go wrong this time?"

# Define ElevenLabs voice IDs (you'll need to add the actual voice IDs)
declare -A VOICE_IDS
VOICE_IDS[aria]="9BWtsMINqrJLrRacOk9x"      # Aria voice ID
VOICE_IDS[cowboy]="INSERT_COWBOY_VOICE_ID"  # Need actual ID
VOICE_IDS[dr]="INSERT_DR_VOICE_ID"          # Need actual ID
VOICE_IDS[michael]="INSERT_MICHAEL_VOICE_ID" # Need actual ID
VOICE_IDS[ms]="INSERT_MS_VOICE_ID"          # Need actual ID

# Missing files to generate
# Aria: needs all 16 personalities except dry_humor, poetic, zen
# Cowboy: needs all except funny
# Dr: needs all except ?
# Michael: needs 8 files
# Ms: needs all except ?

echo "========================================="
echo "ElevenLabs Missing Audio Generator"
echo "========================================="
echo ""

# Generate missing Aria files (13 missing)
echo "Generating Aria samples..."
aria_personalities="sarcastic angry flirty pirate millennial sassy robot dramatic surfer_dude funny professional moody grandpa"
for personality in $aria_personalities; do
    OUTPUT_FILE="$OUTPUT_DIR/aria-${personality}.mp3"

    if [ -f "$OUTPUT_FILE" ]; then
        echo "⏭️  Skipping aria-${personality} (already exists)"
        continue
    fi

    TEXT="${PERSONALITY_TEXTS[$personality]}"
    VOICE_ID="${VOICE_IDS[aria]}"

    echo "🎙️  Generating aria-${personality}..."

    curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
      -H "Accept: audio/mpeg" \
      -H "Content-Type: application/json" \
      -H "xi-api-key: ${OCT_8_ELEVELABS_API_KEY}" \
      -d "{
        \"text\": \"${TEXT}\",
        \"model_id\": \"eleven_monolingual_v1\",
        \"voice_settings\": {
          \"stability\": 0.5,
          \"similarity_boost\": 0.75
        }
      }" \
      --output "$OUTPUT_FILE"

    if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
        echo "✅ Generated aria-${personality}"
    else
        echo "❌ Failed to generate aria-${personality}"
    fi

    sleep 0.5  # Rate limiting
done

echo ""
echo "========================================="
echo "IMPORTANT: Update voice IDs in this script"
echo "========================================="
echo ""
echo "To generate the remaining voices, you need to:"
echo "1. Find the correct ElevenLabs voice IDs for:"
echo "   - cowboy"
echo "   - dr (Dr. Von)"
echo "   - michael"
echo "   - ms (Ms. Walker)"
echo ""
echo "2. Update the VOICE_IDS array in this script"
echo ""
echo "3. Uncomment and add generation loops for each voice"
echo ""
echo "Aria samples generated. Check $OUTPUT_DIR"
