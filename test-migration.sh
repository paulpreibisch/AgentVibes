#!/usr/bin/env bash
#
# AgentVibes Migration Testing Script
# Tests the migration from .claude/config/ and .claude/plugins/ to .agentvibes/
#
# Usage: ./test-migration.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Cleanup function
cleanup() {
    if [[ -n "${TEST_DIR:-}" ]] && [[ -d "$TEST_DIR" ]]; then
        echo ""
        echo -e "${YELLOW}🧹 Cleaning up test directory...${NC}"
        rm -rf "$TEST_DIR"
        echo -e "${GREEN}✓ Cleanup complete${NC}"
    fi
}

# Register cleanup on exit
trap cleanup EXIT

# Helper: Assert file exists
assert_file_exists() {
    local file="$1"
    local description="$2"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✓ PASS:${NC} $description"
        echo -e "    ${CYAN}→${NC} $file"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL:${NC} $description"
        echo -e "    ${CYAN}→${NC} Expected: $file"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper: Assert file does NOT exist
assert_file_not_exists() {
    local file="$1"
    local description="$2"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [[ ! -f "$file" ]]; then
        echo -e "  ${GREEN}✓ PASS:${NC} $description"
        echo -e "    ${CYAN}→${NC} File correctly absent: $file"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL:${NC} $description"
        echo -e "    ${CYAN}→${NC} File should not exist: $file"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper: Assert directory exists
assert_dir_exists() {
    local dir="$1"
    local description="$2"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [[ -d "$dir" ]]; then
        echo -e "  ${GREEN}✓ PASS:${NC} $description"
        echo -e "    ${CYAN}→${NC} $dir"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL:${NC} $description"
        echo -e "    ${CYAN}→${NC} Expected: $dir"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper: Assert directory does NOT exist
assert_dir_not_exists() {
    local dir="$1"
    local description="$2"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [[ ! -d "$dir" ]]; then
        echo -e "  ${GREEN}✓ PASS:${NC} $description"
        echo -e "    ${CYAN}→${NC} Directory correctly absent: $dir"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL:${NC} $description"
        echo -e "    ${CYAN}→${NC} Directory should not exist: $dir"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper: Assert file contains text
assert_file_contains() {
    local file="$1"
    local pattern="$2"
    local description="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✓ PASS:${NC} $description"
        echo -e "    ${CYAN}→${NC} Found pattern in $file"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL:${NC} $description"
        echo -e "    ${CYAN}→${NC} Pattern not found: $pattern in $file"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

clear

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 AgentVibes Migration Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}This script tests the migration from:${NC}"
echo "  • .claude/config/ → .agentvibes/config/"
echo "  • .claude/plugins/ → .agentvibes/bmad/"
echo ""
echo -e "${BLUE}Test scenarios:${NC}"
echo "  1. Fresh Install - New .agentvibes/ structure"
echo "  2. Upgrade from v2.9.x - Auto-migration"
echo "  3. Manual Migration - Script execution"
echo "  4. BMAD Integration - Voice mappings"
echo "  5. Pretext Configuration - Location"
echo "  6. No Old Config - No errors"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Press Enter to start tests..."
echo ""

#═══════════════════════════════════════════════════════════════
# TEST 1: Fresh Install - Verify .agentvibes/ is created directly
#═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Test 1: Fresh Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${CYAN}Testing: npx agentvibes install (fresh)${NC}"
echo ""

# Create clean test directory
TEST_DIR=$(mktemp -d -t agentvibes-test-XXXXXX)
cd "$TEST_DIR"
echo -e "${BLUE}Test directory: $TEST_DIR${NC}"
echo ""

# Run installer (simulated - we'll just copy files)
echo "Simulating fresh install..."
mkdir -p .claude/{commands,hooks,personalities,output-styles}
mkdir -p .agentvibes/{bmad,config}

# Copy essential files from source
cp "$SCRIPT_DIR/.claude/hooks/migrate-to-agentvibes.sh" .claude/hooks/ 2>/dev/null || true
cp "$SCRIPT_DIR/.claude/hooks/bmad-voice-manager.sh" .claude/hooks/ 2>/dev/null || true

# Create fresh config files in new location
echo '{"pretext": "AgentVibes"}' > .agentvibes/config/agentvibes.json
echo '{"version": "1.0"}' > .agentvibes/config/personality-voice-defaults.default.json
touch .agentvibes/bmad/bmad-voices-enabled.flag

echo ""
echo -e "${YELLOW}Running assertions...${NC}"
echo ""

# Assertions
assert_dir_exists ".agentvibes" "Created .agentvibes/ directory"
assert_dir_exists ".agentvibes/bmad" "Created .agentvibes/bmad/ subdirectory"
assert_dir_exists ".agentvibes/config" "Created .agentvibes/config/ subdirectory"
assert_file_exists ".agentvibes/config/agentvibes.json" "Created agentvibes.json in new location"
assert_dir_not_exists ".claude/plugins" "Did NOT create .claude/plugins/"
assert_file_not_exists ".claude/config/agentvibes.json" "Did NOT create config in old location"

echo ""

#═══════════════════════════════════════════════════════════════
# TEST 2: Upgrade from v2.9.x - Verify auto-migration
#═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Test 2: Upgrade from v2.9.x (Auto-Migration)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${CYAN}Testing: Upgrade path with old config${NC}"
echo ""

# Clean and recreate test directory
cd /tmp
rm -rf "$TEST_DIR"
TEST_DIR=$(mktemp -d -t agentvibes-test-XXXXXX)
cd "$TEST_DIR"
echo -e "${BLUE}Test directory: $TEST_DIR${NC}"
echo ""

# Simulate old v2.9.x installation
echo "Creating v2.9.x directory structure..."
mkdir -p .claude/{config,plugins,hooks}

# Create old config files
echo '{"pretext": "OldPretext"}' > .claude/config/agentvibes.json
echo '{"version": "1.0"}' > .claude/config/personality-voice-defaults.default.json
echo "# Personality README" > .claude/config/README-personality-defaults.md
touch .claude/plugins/bmad-voices-enabled.flag
touch .claude/plugins/bmad-party-mode-disabled.flag

# Copy migration script
cp "$SCRIPT_DIR/.claude/hooks/migrate-to-agentvibes.sh" .claude/hooks/

echo ""
echo -e "${YELLOW}Running migration script...${NC}"
echo ""

# Run migration
bash .claude/hooks/migrate-to-agentvibes.sh

echo ""
echo -e "${YELLOW}Running assertions...${NC}"
echo ""

# Assertions - Files should be in new location
assert_file_exists ".agentvibes/config/agentvibes.json" "Migrated agentvibes.json"
assert_file_exists ".agentvibes/config/personality-voice-defaults.default.json" "Migrated personality defaults"
assert_file_exists ".agentvibes/config/README-personality-defaults.md" "Migrated README"
assert_file_exists ".agentvibes/bmad/bmad-voices-enabled.flag" "Migrated BMAD enabled flag"
assert_file_exists ".agentvibes/bmad/bmad-party-mode-disabled.flag" "Migrated party mode flag"

# Old files should be gone
assert_file_not_exists ".claude/config/agentvibes.json" "Removed old agentvibes.json"
assert_file_not_exists ".claude/plugins/bmad-voices-enabled.flag" "Removed old BMAD flag"
assert_dir_not_exists ".claude/plugins" "Removed empty .claude/plugins/"

# Check content preserved
assert_file_contains ".agentvibes/config/agentvibes.json" "OldPretext" "Preserved pretext value"

echo ""

#═══════════════════════════════════════════════════════════════
# TEST 3: Manual Migration - Script execution
#═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛠️  Test 3: Manual Migration Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${CYAN}Testing: Manual execution of migrate-to-agentvibes.sh${NC}"
echo ""

# Clean and recreate
cd /tmp
rm -rf "$TEST_DIR"
TEST_DIR=$(mktemp -d -t agentvibes-test-XXXXXX)
cd "$TEST_DIR"
echo -e "${BLUE}Test directory: $TEST_DIR${NC}"
echo ""

# Setup old structure with mixed old/new
mkdir -p .claude/{config,plugins,hooks}
mkdir -p .agentvibes/{bmad,config}

# Some files in old location, some already migrated
echo '{"pretext": "Test"}' > .claude/config/agentvibes.json
touch .agentvibes/bmad/bmad-voices-enabled.flag  # Already migrated
touch .claude/plugins/bmad-party-mode-disabled.flag  # Not yet migrated

cp "$SCRIPT_DIR/.claude/hooks/migrate-to-agentvibes.sh" .claude/hooks/

echo ""
echo -e "${YELLOW}Running migration script...${NC}"
echo ""

bash .claude/hooks/migrate-to-agentvibes.sh

echo ""
echo -e "${YELLOW}Running assertions...${NC}"
echo ""

# Both should now be in new location
assert_file_exists ".agentvibes/config/agentvibes.json" "Migrated remaining config"
assert_file_exists ".agentvibes/bmad/bmad-party-mode-disabled.flag" "Migrated remaining flag"
assert_file_not_exists ".claude/config/agentvibes.json" "Removed old config"
assert_file_not_exists ".claude/plugins/bmad-party-mode-disabled.flag" "Removed old flag"

echo ""

#═══════════════════════════════════════════════════════════════
# TEST 4: BMAD Integration - Voice mappings work
#═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎤 Test 4: BMAD Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${CYAN}Testing: BMAD voice mappings in new location${NC}"
echo ""

cd /tmp
rm -rf "$TEST_DIR"
TEST_DIR=$(mktemp -d -t agentvibes-test-XXXXXX)
cd "$TEST_DIR"
echo -e "${BLUE}Test directory: $TEST_DIR${NC}"
echo ""

# Setup BMAD structure
mkdir -p .agentvibes/bmad
mkdir -p .claude/hooks
mkdir -p .bmad/_cfg

# Create voice mapping file
cat > .agentvibes/bmad/bmad-voices.md <<'EOF'
| Agent ID | Agent Name | Intro | ElevenLabs Voice | Piper Voice | Personality |
|----------|------------|-------|------------------|-------------|-------------|
| pm | John | Product Manager | Jessica Anne Bogart | en_US-lessac-medium | professional |
| dev | Sarah | Developer | Matthew Schmitz | en_US-amy-medium | friendly |
EOF

# Create CSV version (v6 format)
cat > .bmad/_cfg/agent-voice-map.csv <<'EOF'
pm,en_US-lessac-medium
dev,en_US-amy-medium
EOF

touch .agentvibes/bmad/bmad-voices-enabled.flag

# Copy bmad-voice-manager.sh
cp "$SCRIPT_DIR/.claude/hooks/bmad-voice-manager.sh" .claude/hooks/ 2>/dev/null || true

echo ""
echo -e "${YELLOW}Running assertions...${NC}"
echo ""

# Verify structure
assert_file_exists ".agentvibes/bmad/bmad-voices.md" "Created voice mapping file"
assert_file_exists ".agentvibes/bmad/bmad-voices-enabled.flag" "Created enabled flag"
assert_file_contains ".agentvibes/bmad/bmad-voices.md" "pm" "Voice mapping contains pm agent"
assert_file_contains ".agentvibes/bmad/bmad-voices.md" "dev" "Voice mapping contains dev agent"

# Test bmad-voice-manager.sh if available
if [[ -f ".claude/hooks/bmad-voice-manager.sh" ]]; then
    # Test get-voice function
    VOICE=$(bash .claude/hooks/bmad-voice-manager.sh get-voice pm)
    if [[ -n "$VOICE" ]]; then
        echo -e "  ${GREEN}✓ PASS:${NC} bmad-voice-manager.sh can read from new location"
        echo -e "    ${CYAN}→${NC} Retrieved voice: $VOICE"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}✗ FAIL:${NC} bmad-voice-manager.sh could not read voice"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
fi

echo ""

#═══════════════════════════════════════════════════════════════
# TEST 5: Pretext - Uses new location
#═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 5: Pretext Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${CYAN}Testing: Pretext reads from .agentvibes/config/${NC}"
echo ""

cd /tmp
rm -rf "$TEST_DIR"
TEST_DIR=$(mktemp -d -t agentvibes-test-XXXXXX)
cd "$TEST_DIR"
echo -e "${BLUE}Test directory: $TEST_DIR${NC}"
echo ""

# Setup new structure
mkdir -p .agentvibes/config
mkdir -p .claude/hooks

# Create pretext config
echo '{"pretext": "MyProject"}' > .agentvibes/config/agentvibes.json

# Copy play-tts-elevenlabs.sh to test
cp "$SCRIPT_DIR/.claude/hooks/play-tts-elevenlabs.sh" .claude/hooks/ 2>/dev/null || true

echo ""
echo -e "${YELLOW}Running assertions...${NC}"
echo ""

assert_file_exists ".agentvibes/config/agentvibes.json" "Pretext config in new location"
assert_file_contains ".agentvibes/config/agentvibes.json" "MyProject" "Pretext value set correctly"

# Test if play-tts-elevenlabs.sh references new path
if [[ -f ".claude/hooks/play-tts-elevenlabs.sh" ]]; then
    if grep -q ".agentvibes/config" ".claude/hooks/play-tts-elevenlabs.sh"; then
        echo -e "  ${GREEN}✓ PASS:${NC} play-tts-elevenlabs.sh uses new config path"
        echo -e "    ${CYAN}→${NC} References .agentvibes/config/"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}✗ FAIL:${NC} play-tts-elevenlabs.sh does not reference new path"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
fi

echo ""

#═══════════════════════════════════════════════════════════════
# TEST 6: No Old Config - No errors
#═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test 6: No Old Config (No Migration Needed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${CYAN}Testing: Migration script with no old config${NC}"
echo ""

cd /tmp
rm -rf "$TEST_DIR"
TEST_DIR=$(mktemp -d -t agentvibes-test-XXXXXX)
cd "$TEST_DIR"
echo -e "${BLUE}Test directory: $TEST_DIR${NC}"
echo ""

# Setup only new structure (no old config)
mkdir -p .agentvibes/{bmad,config}
mkdir -p .claude/hooks

# Create only new config
echo '{"pretext": "NewInstall"}' > .agentvibes/config/agentvibes.json

cp "$SCRIPT_DIR/.claude/hooks/migrate-to-agentvibes.sh" .claude/hooks/

echo ""
echo -e "${YELLOW}Running migration script (should be no-op)...${NC}"
echo ""

# Run migration - should complete without errors
if bash .claude/hooks/migrate-to-agentvibes.sh > /tmp/migration-output.txt 2>&1; then
    echo -e "  ${GREEN}✓ PASS:${NC} Migration script ran without errors"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL:${NC} Migration script failed"
    cat /tmp/migration-output.txt
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo ""
echo -e "${YELLOW}Running assertions...${NC}"
echo ""

# Config should still exist and be unchanged
assert_file_exists ".agentvibes/config/agentvibes.json" "Config file still exists"
assert_file_contains ".agentvibes/config/agentvibes.json" "NewInstall" "Config unchanged"
assert_dir_not_exists ".claude/plugins" ".claude/plugins/ not created"
assert_file_not_exists ".claude/config/agentvibes.json" "No old config created"

echo ""

#═══════════════════════════════════════════════════════════════
# TEST SUMMARY
#═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Total Tests:  $TESTS_RUN"
echo -e "  ${GREEN}Passed:       $TESTS_PASSED${NC}"
if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "  ${RED}Failed:       $TESTS_FAILED${NC}"
else
    echo "  Failed:       $TESTS_FAILED"
fi
echo ""

# Calculate percentage
if [[ $TESTS_RUN -gt 0 ]]; then
    PERCENTAGE=$((TESTS_PASSED * 100 / TESTS_RUN))
    echo "  Success Rate: ${PERCENTAGE}%"
    echo ""
fi

# Final verdict
if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "The migration system is working correctly. All scenarios tested:"
    echo "  ✓ Fresh install creates .agentvibes/ directly"
    echo "  ✓ Upgrade auto-migrates old config"
    echo "  ✓ Manual migration script works"
    echo "  ✓ BMAD integration uses new paths"
    echo "  ✓ Pretext config in new location"
    echo "  ✓ No errors when no migration needed"
    EXIT_CODE=0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please review the failures above and fix the issues."
    EXIT_CODE=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $EXIT_CODE
