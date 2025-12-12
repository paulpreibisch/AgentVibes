#!/usr/bin/env bash
#
# File: test-lite-mode-live-audio.sh
#
# AgentVibes Lite Mode LIVE Audio Test
# Tests actual audio playback (you should hear the TTS)
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════"
echo "  AgentVibes Lite Mode LIVE Audio Test"
echo "═══════════════════════════════════════════"
echo ""
echo -e "${BLUE}This test will play actual TTS audio.${NC}"
echo -e "${YELLOW}You should HEAR the spoken text!${NC}"
echo ""

# Check for TTS engine
TTS_AVAILABLE=false
if command -v say >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Using macOS 'say' for TTS${NC}"
  TTS_AVAILABLE=true
elif command -v espeak >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Using 'espeak' for TTS${NC}"
  TTS_AVAILABLE=true
elif command -v spd-say >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Using 'spd-say' for TTS${NC}"
  TTS_AVAILABLE=true
elif [[ -f ".claude/hooks/play-tts.sh" ]]; then
  echo -e "${GREEN}✓ Using AgentVibes play-tts.sh for TTS${NC}"
  TTS_AVAILABLE=true
else
  echo -e "${YELLOW}⚠ No TTS engine found${NC}"
  echo "Please install: 'say' (macOS), 'espeak', or 'spd-say'"
  exit 1
fi

echo ""
echo -e "${BLUE}Test: Playing a sample TTS message${NC}"
echo ""

# Simulate a Claude response with >200 tokens
LONG_RESPONSE="I've successfully completed a comprehensive update of your configuration file with all the new settings you requested. The changes include multiple important modifications: First, I've updated the TTS provider from the default system to Piper TTS, which offers superior voice quality and more natural-sounding speech synthesis. Second, I've adjusted the verbosity levels from medium to high, which will provide you with more detailed feedback during operation. Third, I've enabled the background music feature with sophisticated volume normalization to ensure a pleasant listening experience without overwhelming the TTS audio. Fourth, I've configured the personality system to use the professional personality profile, which will give your AI assistant a more formal and business-appropriate tone in its communications.

All modifications have been carefully validated for syntax correctness and saved to the appropriate configuration files in their designated locations. These changes will take effect immediately upon your next Claude Code session restart, requiring no additional manual intervention. Additionally, I've proactively created backup copies of all the original configuration files in the dedicated backup directory, allowing for easy rollback if you decide you prefer the previous settings. The backup files are timestamped for easy identification.

The new settings have been thoroughly tested to ensure full compatibility with your current system configuration, and all required dependencies are properly installed and configured. You should notice significantly improved audio quality and more responsive TTS feedback in your next session. The system is now optimized for maximum performance while maintaining stability and reliability.

**Audio Summary:** Updated configuration with new TTS settings and personality profile."

echo "Simulating Claude response (>200 tokens)..."
echo "Expected TTS: 'Updated configuration with new TTS settings and personality profile.'"
echo ""
echo -e "${YELLOW}🔊 Listen now...${NC}"
echo ""

# Run the hook WITHOUT test mode (will actually play audio)
export CLAUDE_LAST_MESSAGE="$LONG_RESPONSE"
bash .agentvibes/hooks/post-tool-use-lite.sh

# Wait a moment for audio to start
sleep 1

echo ""
echo -e "${GREEN}✓ TTS command sent${NC}"
echo ""
echo "Did you hear: 'Updated configuration with new TTS settings and personality profile'?"
echo ""

# Test 2: Short response (should say "Done")
echo "─────────────────────────────────────────"
echo ""
echo -e "${BLUE}Test 2: Short response (<200 tokens)${NC}"
echo ""

SHORT_RESPONSE="I fixed the typo in the README file. The correction has been applied successfully and the file has been saved to disk with the proper formatting maintained throughout the document structure. This ensures the documentation remains accurate and professional for all users who read it. The change was minor but important for clarity and correctness.

**Audio Summary:** Fixed typo in README."

echo "Simulating short Claude response (<200 tokens)..."
echo "Expected TTS: 'Done'"
echo ""
echo -e "${YELLOW}🔊 Listen now...${NC}"
echo ""

export CLAUDE_LAST_MESSAGE="$SHORT_RESPONSE"
bash .agentvibes/hooks/post-tool-use-lite.sh

sleep 1

echo ""
echo -e "${GREEN}✓ TTS command sent${NC}"
echo ""
echo "Did you hear: 'Done'?"
echo ""

# Summary
echo "═══════════════════════════════════════════"
echo "  Test Complete"
echo "═══════════════════════════════════════════"
echo ""
echo "If you heard both messages, the lite mode audio is working!"
echo ""
echo -e "${BLUE}📝 Lite Mode Features Verified:${NC}"
echo "  • Audio Summary extraction"
echo "  • Smart verbosity (full text for long responses)"
echo "  • Simplified to 'Done' for short responses"
echo "  • Direct TTS playback (no file saving)"
echo ""
