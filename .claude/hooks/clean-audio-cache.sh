#!/usr/bin/env bash
# Non-Interactive TTS Audio Cache Cleanup
# Used by /agent-vibes:clean skill and MCP clean_audio_cache tool

set -euo pipefail

# Source audio cache utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/audio-cache-utils.sh"

# Colors
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 AgentVibes Cache Cleanup (Non-Interactive)${NC}"
echo ""

# Get audio directory and perform cleanup
AUDIO_DIR=$(get_audio_dir)
clean_all_tts_files "$AUDIO_DIR"

echo ""
