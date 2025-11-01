#!/bin/bash

# Script to generate ALL missing ElevenLabs audio samples
# Usage: ./generate-missing-elevenlabs-complete.sh

# Use the API key from environment
if [ -z "$OCT_8_ELEVELABS_API_KEY" ]; then
  echo "ERROR: OCT_8_ELEVELABS_API_KEY environment variable is not set"
  echo "Run: export OCT_8_ELEVELABS_API_KEY='your-key-here'"
  exit 1
fi

OUTPUT_DIR="/home/fire/claude/AgentVibes/agentvibes.org/public/audio/elevenlabs"
mkdir -p "$OUTPUT_DIR"

# Define updated personality texts
declare -A PERSONALITY_TEXTS
PERSONALITY_TEXTS[sarcastic]="Oh wonderful! Even more documentation surgery. Because that's exactly what I wanted to do with my evening."
PERSONALITY_TEXTS[angry]="ARE YOU KIDDING ME?! Another bug in production! This is absolutely UNACCEPTABLE!"
PERSONALITY_TEXTS[flirty]="Well hello there, gorgeous! I've been waiting for you to ask me that. How about we tackle this together?"
PERSONALITY_TEXTS[pirate]="Arrr matey! Hoist the colors and prepare to set sail on this here coding adventure!"
PERSONALITY_TEXTS[millennial]="I literally can't even write now. This cold is giving me anxiety. I need coffee and avocado toast to deal with this. Then we select about it later."
PERSONALITY_TEXTS[sassy]="Oh honey, please. I've been doing this since before you even knew what a terminal was. Watch and learn."
PERSONALITY_TEXTS[robot]="Beeep boop. Processing request. Human emotion detected. Initiating task completion protocol. Probability of success: 99.7%."
PERSONALITY_TEXTS[zen]="Breathe in the bugs. Breathe out the fixes. The code flows like water. We are one with the repository. All errors are merely opportunities for growth."
PERSONALITY_TEXTS[dramatic]="This is the most important commit of our lives. The fate of the entire application rests upon this single line of code. Behold."
PERSONALITY_TEXTS[funny]="Oh. My. God. Like, this is totally the most important thing ever? I'm literally so excited right now!"
PERSONALITY_TEXTS[professional]="For our previous discussion, I've completed the code review and identified three actionable items for optimization. Please advise our next steps."
PERSONALITY_TEXTS[poetic]="The code flows eternal. Each function a verse, each variable a rhyme. We write not mere programs, but digital poetry."
PERSONALITY_TEXTS[moody]="I guess I'll fix this bug. Not like anyone appreciates my work anyway. Why do I even bother? *Sigh* Fine. Let's get this over with."
PERSONALITY_TEXTS[grandpa]="Back in my day, we didn't have all these fancy frameworks. We coded uphill both ways in the snow and we liked it."
PERSONALITY_TEXTS[dry_humor]="Another merge conflict. How thrilling. I can barely contain my excitement. This is exactly what I went to computer science school for."

# Define ElevenLabs voice IDs from voices-config.sh
declare -A VOICE_IDS
VOICE_IDS[cowboy]="KTPVrSVAEUSJRClDzBw7"      # Cowboy Bob
VOICE_IDS[dr]="yjJ45q8TVCrtMhEKurxY"          # Dr. Von Fusion
VOICE_IDS[michael]="U1Vk2oyatMdYs096Ety7"     # Michael
VOICE_IDS[ms]="DLsHlh26Ugcm6ELvS0qi"          # Ms. Walker

echo "========================================="
echo "ElevenLabs Missing Audio Generator"
echo "========================================="
echo ""
echo "Missing files to generate:"
echo "  Cowboy: 14 files"
echo "  Dr. Von: 14 files"
echo "  Michael: 7 files"
echo "  Ms. Walker: 13 files"
echo ""
echo "Total: 48 audio files"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi
echo ""

# All personalities (15 total, no surfer_dude)
ALL_PERSONALITIES="sarcastic angry flirty pirate millennial sassy robot zen dramatic funny professional poetic moody grandpa dry_humor"

# Generate Cowboy samples (missing 14)
echo "========================================="
echo "Generating Cowboy samples..."
echo "========================================="
for personality in $ALL_PERSONALITIES; do
    OUTPUT_FILE="$OUTPUT_DIR/cowboy-${personality}.mp3"

    if [ -f "$OUTPUT_FILE" ]; then
        echo "⏭️  Skipping cowboy-${personality} (already exists)"
        continue
    fi

    TEXT="${PERSONALITY_TEXTS[$personality]}"
    VOICE_ID="${VOICE_IDS[cowboy]}"

    echo "🎙️  Generating cowboy-${personality}..."

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
        echo "✅ Generated cowboy-${personality}"
    else
        echo "❌ Failed to generate cowboy-${personality}"
    fi

    sleep 0.5  # Rate limiting
done

echo ""

# Generate Dr. Von samples (missing 14)
echo "========================================="
echo "Generating Dr. Von samples..."
echo "========================================="
for personality in $ALL_PERSONALITIES; do
    OUTPUT_FILE="$OUTPUT_DIR/dr-${personality}.mp3"

    if [ -f "$OUTPUT_FILE" ]; then
        echo "⏭️  Skipping dr-${personality} (already exists)"
        continue
    fi

    TEXT="${PERSONALITY_TEXTS[$personality]}"
    VOICE_ID="${VOICE_IDS[dr]}"

    echo "🎙️  Generating dr-${personality}..."

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
        echo "✅ Generated dr-${personality}"
    else
        echo "❌ Failed to generate dr-${personality}"
    fi

    sleep 0.5
done

echo ""

# Generate Michael samples (missing 7)
echo "========================================="
echo "Generating Michael samples..."
echo "========================================="
for personality in $ALL_PERSONALITIES; do
    OUTPUT_FILE="$OUTPUT_DIR/michael-${personality}.mp3"

    if [ -f "$OUTPUT_FILE" ]; then
        echo "⏭️  Skipping michael-${personality} (already exists)"
        continue
    fi

    TEXT="${PERSONALITY_TEXTS[$personality]}"
    VOICE_ID="${VOICE_IDS[michael]}"

    echo "🎙️  Generating michael-${personality}..."

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
        echo "✅ Generated michael-${personality}"
    else
        echo "❌ Failed to generate michael-${personality}"
    fi

    sleep 0.5
done

echo ""

# Generate Ms. Walker samples (missing 13)
echo "========================================="
echo "Generating Ms. Walker samples..."
echo "========================================="
for personality in $ALL_PERSONALITIES; do
    OUTPUT_FILE="$OUTPUT_DIR/ms-${personality}.mp3"

    if [ -f "$OUTPUT_FILE" ]; then
        echo "⏭️  Skipping ms-${personality} (already exists)"
        continue
    fi

    TEXT="${PERSONALITY_TEXTS[$personality]}"
    VOICE_ID="${VOICE_IDS[ms]}"

    echo "🎙️  Generating ms-${personality}..."

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
        echo "✅ Generated ms-${personality}"
    else
        echo "❌ Failed to generate ms-${personality}"
    fi

    sleep 0.5
done

echo ""
echo "========================================="
echo "Generation Complete!"
echo "========================================="
echo ""
echo "All missing ElevenLabs samples generated!"
echo "Check: $OUTPUT_DIR"
