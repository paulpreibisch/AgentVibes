#!/usr/bin/env bash
# AgentVibes Cache Cleanup Script
# Removes TTS cache files to free up disk space

set -euo pipefail

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AUDIO_DIR="$PROJECT_ROOT/.claude/audio"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 AgentVibes Cache Cleanup${NC}"
echo ""

# Check if audio directory exists
if [[ ! -d "$AUDIO_DIR" ]]; then
  echo -e "${YELLOW}No cache directory found at: $AUDIO_DIR${NC}"
  exit 0
fi

# Calculate current cache size
echo "Calculating cache size..."
CACHE_SIZE=$(du -sh "$AUDIO_DIR" 2>/dev/null | cut -f1 || echo "unknown")
echo -e "${BLUE}Current cache size: ${YELLOW}$CACHE_SIZE${NC}"
echo ""

# Count files to be deleted
TTS_MP3_COUNT=$(find "$AUDIO_DIR" -maxdepth 1 -name "tts-*.mp3" -type f 2>/dev/null | wc -l)
TTS_WAV_COUNT=$(find "$AUDIO_DIR" -maxdepth 1 -name "tts-*.wav" -type f 2>/dev/null | wc -l)
TTS_PADDED_MP3_COUNT=$(find "$AUDIO_DIR" -maxdepth 1 -name "tts-padded-*.mp3" -type f 2>/dev/null | wc -l)
TTS_PADDED_WAV_COUNT=$(find "$AUDIO_DIR" -maxdepth 1 -name "tts-padded-*.wav" -type f 2>/dev/null | wc -l)
BMAD_RECORDINGS_COUNT=0
if [[ -d "$AUDIO_DIR/bmad-party-mode-recordings" ]]; then
  BMAD_RECORDINGS_COUNT=$(find "$AUDIO_DIR/bmad-party-mode-recordings" -type f 2>/dev/null | wc -l)
fi

TOTAL_FILES=$((TTS_MP3_COUNT + TTS_WAV_COUNT + TTS_PADDED_MP3_COUNT + TTS_PADDED_WAV_COUNT + BMAD_RECORDINGS_COUNT))

if [[ $TOTAL_FILES -eq 0 ]]; then
  echo -e "${GREEN}✓ Cache is already clean! No TTS cache files found.${NC}"
  exit 0
fi

echo -e "Found ${YELLOW}$TOTAL_FILES${NC} cache files:"
echo -e "  • TTS MP3 files: $TTS_MP3_COUNT"
echo -e "  • TTS WAV files: $TTS_WAV_COUNT"
echo -e "  • TTS padded MP3 files: $TTS_PADDED_MP3_COUNT"
echo -e "  • TTS padded WAV files: $TTS_PADDED_WAV_COUNT"
echo -e "  • BMAD party mode recordings: $BMAD_RECORDINGS_COUNT"
echo ""

# Ask for confirmation
read -p "Delete all cache files? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Cleanup cancelled.${NC}"
  exit 0
fi

echo ""
echo "Deleting cache files..."

# Delete TTS cache files
DELETED=0

if [[ $TTS_MP3_COUNT -gt 0 ]]; then
  find "$AUDIO_DIR" -maxdepth 1 -name "tts-*.mp3" -type f -delete
  DELETED=$((DELETED + TTS_MP3_COUNT))
fi

if [[ $TTS_WAV_COUNT -gt 0 ]]; then
  find "$AUDIO_DIR" -maxdepth 1 -name "tts-*.wav" -type f -delete
  DELETED=$((DELETED + TTS_WAV_COUNT))
fi

if [[ $TTS_PADDED_MP3_COUNT -gt 0 ]]; then
  find "$AUDIO_DIR" -maxdepth 1 -name "tts-padded-*.mp3" -type f -delete
  DELETED=$((DELETED + TTS_PADDED_MP3_COUNT))
fi

if [[ $TTS_PADDED_WAV_COUNT -gt 0 ]]; then
  find "$AUDIO_DIR" -maxdepth 1 -name "tts-padded-*.wav" -type f -delete
  DELETED=$((DELETED + TTS_PADDED_WAV_COUNT))
fi

if [[ $BMAD_RECORDINGS_COUNT -gt 0 ]]; then
  rm -rf "$AUDIO_DIR/bmad-party-mode-recordings"
  DELETED=$((DELETED + BMAD_RECORDINGS_COUNT))
fi

# Calculate new size
NEW_SIZE=$(du -sh "$AUDIO_DIR" 2>/dev/null | cut -f1 || echo "unknown")

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
echo -e "  • Deleted: ${GREEN}$DELETED${NC} files"
echo -e "  • Old size: ${YELLOW}$CACHE_SIZE${NC}"
echo -e "  • New size: ${GREEN}$NEW_SIZE${NC}"
echo ""
