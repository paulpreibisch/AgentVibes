#!/usr/bin/env bash
#
# File: .claude/hooks/migrate-to-agentvibes.sh
#
# AgentVibes - Migration Script for v2.10.0+
# Migrates configuration from .claude/config/ and .claude/plugins/ to .agentvibes/
#
# This script is automatically run by the installer if old config is detected.
# Can also be run manually: .claude/hooks/migrate-to-agentvibes.sh
#

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 AgentVibes Configuration Migration${NC}"
echo ""
echo "Migrating from .claude/config/ and .claude/plugins/ to .agentvibes/"
echo ""

# Determine project root
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
    PROJECT_ROOT="$CLAUDE_PROJECT_DIR"
else
    PROJECT_ROOT="$(pwd)"
fi

cd "$PROJECT_ROOT"

# Track if any migrations happened
MIGRATED=false

# Create target directories
echo -e "${BLUE}📁 Creating .agentvibes/ directory structure...${NC}"
mkdir -p .agentvibes/bmad
mkdir -p .agentvibes/config
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Migrate BMAD files from .claude/plugins/
echo -e "${BLUE}🔍 Checking for BMAD files in .claude/plugins/...${NC}"

if [[ -f ".claude/plugins/bmad-voices-enabled.flag" ]]; then
    echo -e "${YELLOW}  Found: bmad-voices-enabled.flag${NC}"
    mv .claude/plugins/bmad-voices-enabled.flag .agentvibes/bmad/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/bmad/${NC}"
    MIGRATED=true
fi

if [[ -f ".claude/plugins/bmad-party-mode-disabled.flag" ]]; then
    echo -e "${YELLOW}  Found: bmad-party-mode-disabled.flag${NC}"
    mv .claude/plugins/bmad-party-mode-disabled.flag .agentvibes/bmad/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/bmad/${NC}"
    MIGRATED=true
fi

if [[ -f ".claude/plugins/.bmad-previous-settings" ]]; then
    echo -e "${YELLOW}  Found: .bmad-previous-settings${NC}"
    mv .claude/plugins/.bmad-previous-settings .agentvibes/bmad/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/bmad/${NC}"
    MIGRATED=true
fi

echo ""

# Migrate BMAD files from .claude/config/
echo -e "${BLUE}🔍 Checking for BMAD files in .claude/config/...${NC}"

if [[ -f ".claude/config/bmad-voices.md" ]]; then
    echo -e "${YELLOW}  Found: bmad-voices.md${NC}"
    mv .claude/config/bmad-voices.md .agentvibes/bmad/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/bmad/${NC}"
    MIGRATED=true
fi

if [[ -f ".claude/config/bmad-voices-enabled.flag" ]]; then
    echo -e "${YELLOW}  Found: bmad-voices-enabled.flag${NC}"
    # Check if already exists in new location
    if [[ -f ".agentvibes/bmad/bmad-voices-enabled.flag" ]]; then
        echo -e "${BLUE}  (Already exists in .agentvibes/bmad/ - removing duplicate)${NC}"
        rm .claude/config/bmad-voices-enabled.flag
    else
        mv .claude/config/bmad-voices-enabled.flag .agentvibes/bmad/
        echo -e "${GREEN}  ✓ Moved to .agentvibes/bmad/${NC}"
    fi
    MIGRATED=true
fi

echo ""

# Migrate AgentVibes config files
echo -e "${BLUE}🔍 Checking for AgentVibes config in .claude/config/...${NC}"

if [[ -f ".claude/config/agentvibes.json" ]]; then
    echo -e "${YELLOW}  Found: agentvibes.json${NC}"
    mv .claude/config/agentvibes.json .agentvibes/config/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/config/${NC}"
    MIGRATED=true
fi

if [[ -f ".claude/config/personality-voice-defaults.default.json" ]]; then
    echo -e "${YELLOW}  Found: personality-voice-defaults.default.json${NC}"
    mv .claude/config/personality-voice-defaults.default.json .agentvibes/config/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/config/${NC}"
    MIGRATED=true
fi

if [[ -f ".claude/config/personality-voice-defaults.json" ]]; then
    echo -e "${YELLOW}  Found: personality-voice-defaults.json${NC}"
    mv .claude/config/personality-voice-defaults.json .agentvibes/config/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/config/${NC}"
    MIGRATED=true
fi

if [[ -f ".claude/config/README-personality-defaults.md" ]]; then
    echo -e "${YELLOW}  Found: README-personality-defaults.md${NC}"
    mv .claude/config/README-personality-defaults.md .agentvibes/config/
    echo -e "${GREEN}  ✓ Moved to .agentvibes/config/${NC}"
    MIGRATED=true
fi

echo ""

# Clean up empty directories
echo -e "${BLUE}🧹 Cleaning up...${NC}"

if [[ -d ".claude/plugins" ]] && [[ -z "$(ls -A .claude/plugins 2>/dev/null)" ]]; then
    rmdir .claude/plugins
    echo -e "${GREEN}✓ Removed empty .claude/plugins/ directory${NC}"
fi

# Note: We don't remove .claude/config/ because it may contain runtime state files
# like tts-speech-rate.txt that should stay there

echo ""

if [[ "$MIGRATED" == "true" ]]; then
    echo -e "${GREEN}✅ Migration complete!${NC}"
    echo ""
    echo "Your AgentVibes configuration has been moved to:"
    echo "  .agentvibes/bmad/    - BMAD voice mappings and state"
    echo "  .agentvibes/config/  - AgentVibes settings"
    echo ""
    echo "Old locations are no longer used:"
    echo "  .claude/plugins/     - (removed if empty)"
    echo "  .claude/config/      - (AgentVibes files removed)"
    echo ""
    echo -e "${BLUE}ℹ️  Note: .claude/config/ still exists for runtime state files${NC}"
    echo "   (like tts-speech-rate.txt - these belong to Claude Code)"
else
    echo -e "${GREEN}✓ No migration needed${NC}"
    echo ""
    echo "All configuration is already in .agentvibes/"
fi

echo ""
echo -e "${GREEN}🎉 Ready to use AgentVibes!${NC}"
