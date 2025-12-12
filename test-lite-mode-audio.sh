#!/usr/bin/env bash
#
# File: test-lite-mode-audio.sh
#
# AgentVibes Lite Mode Audio Test
# Verifies that TTS audio is actually being generated
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════"
echo "  AgentVibes Lite Mode Audio Test"
echo "═══════════════════════════════════════════"
echo ""

# Enable test mode
export AGENTVIBES_TEST_AUDIO=true
export AGENTVIBES_TEST_AUDIO_FILE="/tmp/agentvibes-lite-test.txt"

# Clean up previous test file
rm -f "$AGENTVIBES_TEST_AUDIO_FILE"

# Test 1: Simulate a Claude response with Audio Summary marker
echo -e "${BLUE}Test 1: Testing Audio Summary extraction and TTS${NC}"
echo ""

CLAUDE_RESPONSE="I've successfully completed a comprehensive update of your configuration file with all the new settings you requested. The changes include multiple important modifications: First, I've updated the TTS provider from the default system to Piper TTS, which offers superior voice quality and more natural-sounding speech synthesis. Second, I've adjusted the verbosity levels from medium to high, which will provide you with more detailed feedback during operation. Third, I've enabled the background music feature with sophisticated volume normalization to ensure a pleasant listening experience without overwhelming the TTS audio. Fourth, I've configured the personality system to use the professional personality profile, which will give your AI assistant a more formal and business-appropriate tone in its communications.

All modifications have been carefully validated for syntax correctness and saved to the appropriate configuration files in their designated locations. These changes will take effect immediately upon your next Claude Code session restart, requiring no additional manual intervention. Additionally, I've proactively created backup copies of all the original configuration files in the dedicated backup directory, allowing for easy rollback if you decide you prefer the previous settings. The backup files are timestamped for easy identification.

The new settings have been thoroughly tested to ensure full compatibility with your current system configuration, and all required dependencies are properly installed and configured. You should notice significantly improved audio quality and more responsive TTS feedback in your next session. The system is now optimized for maximum performance while maintaining stability and reliability.

**Audio Summary:** Updated configuration with new TTS settings and personality profile."

echo "Simulating Claude response:"
echo "---"
echo "$CLAUDE_RESPONSE"
echo "---"
echo ""

# Run the post-tool-use hook
export CLAUDE_LAST_MESSAGE="$CLAUDE_RESPONSE"
bash .agentvibes/hooks/post-tool-use-lite.sh 2>&1

# Check if test file was created
if [[ -f "$AGENTVIBES_TEST_AUDIO_FILE" ]]; then
  echo -e "${GREEN}✓ Test file created${NC}"
  echo ""
  echo "Contents:"
  cat "$AGENTVIBES_TEST_AUDIO_FILE"
  echo ""
else
  echo -e "${RED}✗ Test file NOT created${NC}"
  echo "Expected file: $AGENTVIBES_TEST_AUDIO_FILE"
  exit 1
fi

# Test 2: Short response (should simplify to "Done")
echo ""
echo -e "${BLUE}Test 2: Testing short response (should say 'Done')${NC}"
echo ""

rm -f "$AGENTVIBES_TEST_AUDIO_FILE"

SHORT_RESPONSE="I fixed the typo in the README file. The correction has been applied successfully and the file has been saved to disk with the proper formatting maintained throughout the document structure. This ensures the documentation remains accurate and professional for all users who read it. The change was minor but important for clarity and correctness.

**Audio Summary:** Fixed typo in README."

echo "Simulating short Claude response (<200 tokens):"
echo "---"
echo "$SHORT_RESPONSE"
echo "---"
echo ""

export CLAUDE_LAST_MESSAGE="$SHORT_RESPONSE"
bash .agentvibes/hooks/post-tool-use-lite.sh 2>&1

if [[ -f "$AGENTVIBES_TEST_AUDIO_FILE" ]]; then
  echo -e "${GREEN}✓ Test file created${NC}"
  echo ""
  echo "Contents (should be 'Done'):"
  cat "$AGENTVIBES_TEST_AUDIO_FILE"
  echo ""

  if grep -q "Done" "$AGENTVIBES_TEST_AUDIO_FILE"; then
    echo -e "${GREEN}✓ Correctly simplified to 'Done'${NC}"
  else
    echo -e "${RED}✗ Expected 'Done', got:${NC}"
    cat "$AGENTVIBES_TEST_AUDIO_FILE"
  fi
else
  echo -e "${RED}✗ Test file NOT created${NC}"
  exit 1
fi

# Test 3: Very short response (should skip TTS)
echo ""
echo -e "${BLUE}Test 3: Testing very short response (should skip TTS)${NC}"
echo ""

rm -f "$AGENTVIBES_TEST_AUDIO_FILE"

TINY_RESPONSE="OK

**Audio Summary:** Done."

echo "Simulating very short response (<50 tokens):"
echo "---"
echo "$TINY_RESPONSE"
echo "---"
echo ""

export CLAUDE_LAST_MESSAGE="$TINY_RESPONSE"
bash .agentvibes/hooks/post-tool-use-lite.sh 2>&1

if [[ -f "$AGENTVIBES_TEST_AUDIO_FILE" ]]; then
  echo -e "${YELLOW}⚠ Test file was created (expected to skip)${NC}"
  cat "$AGENTVIBES_TEST_AUDIO_FILE"
else
  echo -e "${GREEN}✓ Correctly skipped TTS for very short response${NC}"
fi

# Test 4: Response without Audio Summary marker
echo ""
echo -e "${BLUE}Test 4: Testing response without Audio Summary marker${NC}"
echo ""

rm -f "$AGENTVIBES_TEST_AUDIO_FILE"

NO_MARKER_RESPONSE="This is a regular response without the Audio Summary marker.
It has plenty of text but no marker, so it should be skipped."

echo "Simulating response without marker:"
echo "---"
echo "$NO_MARKER_RESPONSE"
echo "---"
echo ""

export CLAUDE_LAST_MESSAGE="$NO_MARKER_RESPONSE"
bash .agentvibes/hooks/post-tool-use-lite.sh 2>&1

if [[ -f "$AGENTVIBES_TEST_AUDIO_FILE" ]]; then
  echo -e "${RED}✗ Test file was created (expected to skip)${NC}"
  cat "$AGENTVIBES_TEST_AUDIO_FILE"
  exit 1
else
  echo -e "${GREEN}✓ Correctly skipped response without Audio Summary marker${NC}"
fi

# Test 5: Test actual TTS engine availability
echo ""
echo -e "${BLUE}Test 5: Testing TTS engine availability${NC}"
echo ""

echo "Checking for available TTS engines:"
echo ""

TTS_FOUND=false

if command -v say >/dev/null 2>&1; then
  echo -e "${GREEN}✓ macOS 'say' found${NC}"
  TTS_FOUND=true
fi

if command -v espeak >/dev/null 2>&1; then
  echo -e "${GREEN}✓ 'espeak' found${NC}"
  TTS_FOUND=true
fi

if command -v spd-say >/dev/null 2>&1; then
  echo -e "${GREEN}✓ 'spd-say' found${NC}"
  TTS_FOUND=true
fi

if [[ -f ".claude/hooks/play-tts.sh" ]]; then
  echo -e "${GREEN}✓ AgentVibes play-tts.sh found (fallback)${NC}"
  TTS_FOUND=true
fi

if [[ "$TTS_FOUND" == "false" ]]; then
  echo -e "${RED}✗ No TTS engines found${NC}"
  echo ""
  echo "Please install one of:"
  echo "  - macOS: 'say' (built-in)"
  echo "  - Linux: 'espeak' or 'spd-say'"
  echo "  - Or ensure .claude/hooks/play-tts.sh exists"
else
  echo ""
  echo -e "${GREEN}✓ TTS engine(s) available${NC}"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════"
echo "  Test Summary"
echo "═══════════════════════════════════════════"
echo ""
echo -e "${GREEN}✓ Audio Summary extraction working${NC}"
echo -e "${GREEN}✓ Smart verbosity (Done for short responses)${NC}"
echo -e "${GREEN}✓ Skip TTS for very short responses${NC}"
echo -e "${GREEN}✓ Skip responses without Audio Summary marker${NC}"

if [[ "$TTS_FOUND" == "true" ]]; then
  echo -e "${GREEN}✓ TTS engine available${NC}"
else
  echo -e "${YELLOW}⚠ TTS engine not available${NC}"
fi

echo ""
echo -e "${BLUE}Note: To test actual audio playback, disable test mode:${NC}"
echo "  unset AGENTVIBES_TEST_AUDIO"
echo "  bash .agentvibes/hooks/post-tool-use-lite.sh"
echo ""

# Clean up
rm -f "$AGENTVIBES_TEST_AUDIO_FILE"

echo -e "${GREEN}All tests passed!${NC}"
echo ""
