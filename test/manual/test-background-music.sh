#!/usr/bin/env bash
#
# Manual test for background music functionality
# Tests setting default background music and playing TTS with it
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🎵 Background Music Test"
echo "======================="
echo ""

# Navigate to project root
cd "$PROJECT_ROOT"

# Step 1: Show current status
echo "📊 Current background music status:"
.claude/hooks/background-music-manager.sh status
echo ""

# Step 2: Enable background music
echo "✅ Enabling background music..."
.claude/hooks/background-music-manager.sh on
echo ""

# Step 3: Set a specific default track
echo "🎼 Setting default background music to: agent_vibes_chillwave_v2_loop.mp3"
.claude/hooks/background-music-manager.sh set-default agent_vibes_chillwave_v2_loop.mp3
echo ""

# Step 4: Set volume to 30%
echo "🔊 Setting background music volume to 0.30"
.claude/hooks/background-music-manager.sh volume 0.30
echo ""

# Step 5: Show updated status
echo "📊 Updated background music status:"
.claude/hooks/background-music-manager.sh status
echo ""

# Step 6: Play a test TTS message with background music
echo "🎤 Playing test TTS message with background music..."
echo "   (You should hear the voice with chillwave music in the background)"
echo ""

.claude/hooks/play-tts.sh "Testing background music! This is a longer message to give you time to hear the chillwave music playing softly in the background. The music should fade in at the start and fade out after the speech ends."

echo ""
echo "✅ Test complete!"
echo ""
echo "Expected results:"
echo "  ✓ Background music should be enabled"
echo "  ✓ Default track should be: agent_vibes_chillwave_v2_loop.mp3"
echo "  ✓ Volume should be 30%"
echo "  ✓ TTS playback should include background music"
echo "  ✓ Music should fade in at start (0.3s)"
echo "  ✓ Music should fade out after speech (2s)"
echo ""
echo "To disable background music:"
echo "  .claude/hooks/background-music-manager.sh off"
