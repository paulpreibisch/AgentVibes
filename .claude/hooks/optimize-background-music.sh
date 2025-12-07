#!/usr/bin/env bash
#
# File: .claude/hooks/optimize-background-music.sh
#
# AgentVibes - Background Music Optimizer
# Creates small, looping clips optimized for RDP/remote playback
#
# Strategy:
# 1. Extract 10-15 second clips from each track
# 2. Find seamless loop points
# 3. Convert to mono 22kHz 32kbps MP3
# 4. Target: 50-100KB per file (vs 2-7MB originals)
#

set -euo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKGROUNDS_DIR="$SCRIPT_DIR/../audio/tracks"
OPTIMIZED_DIR="$BACKGROUNDS_DIR/optimized"

mkdir -p "$OPTIMIZED_DIR"

# Check dependencies
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg required for optimization"
    exit 1
fi

echo "🎵 Optimizing background music for RDP/remote playback..."
echo ""

# Function to optimize a single track
optimize_track() {
    local input="$1"
    local filename=$(basename "$input")
    local output="$OPTIMIZED_DIR/${filename%.mp3}-loop.mp3"

    # Skip if already optimized
    if [[ -f "$output" ]]; then
        echo "   ⏭️  Skipped (already exists): $filename"
        return
    fi

    # Get duration
    local duration
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input" 2>/dev/null)
    duration=${duration%.*}

    # Extract middle 15 seconds (best chance for smooth loop)
    local start=$((duration / 2 - 7))
    [[ $start -lt 0 ]] && start=0

    echo "   🔄 Processing: $filename"
    echo "      • Extract: 15s loop from middle"
    echo "      • Convert: mono, 22kHz, 32kbps"

    # Extract 15 seconds, convert to mono 22kHz 32kbps, add fade in/out for seamless loop
    ffmpeg -i "$input" -ss $start -t 15 \
        -ac 1 -ar 22050 -b:a 32k \
        -af "afade=t=in:d=0.3,afade=t=out:st=14.7:d=0.3" \
        -y "$output" 2>/dev/null

    # Show size comparison
    local orig_size=$(du -h "$input" | cut -f1)
    local new_size=$(du -h "$output" | cut -f1)
    local reduction=$((100 - ($(stat -f%z "$output" 2>/dev/null || stat -c%s "$output") * 100 / $(stat -f%z "$input" 2>/dev/null || stat -c%s "$input"))))

    echo "      ✓ Done: $orig_size → $new_size (${reduction}% reduction)"
    echo ""
}

# Process all background music files
for track in "$BACKGROUNDS_DIR"/*.mp3; do
    [[ -f "$track" ]] || continue
    optimize_track "$track"
done

echo "✅ Optimization complete!"
echo ""
echo "📊 Results:"
echo "   Original dir: $(du -sh "$BACKGROUNDS_DIR" | cut -f1)"
echo "   Optimized dir: $(du -sh "$OPTIMIZED_DIR" | cut -f1)"
echo ""
echo "💡 To use optimized tracks:"
echo "   1. Update audio-effects.cfg to point to optimized/*.mp3"
echo "   2. Or replace originals: cp optimized/* ./"
