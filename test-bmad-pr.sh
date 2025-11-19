#!/usr/bin/env bash
#
# BMAD PR Testing Script
# Interactive script to test BMAD PR #934 with AgentVibes integration
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/.test-bmad-config"

echo "🎙️  BMAD PR #934 Testing Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load saved config if it exists
SAVED_FORK=""
SAVED_TEST_DIR=""
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
    echo "📋 Loaded saved configuration:"
    echo "   Fork: $SAVED_FORK"
    echo "   Test directory: $SAVED_TEST_DIR"
    echo ""
fi

# Ask for GitHub fork URL
echo "Step 1: GitHub Fork"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -n "$SAVED_FORK" ]]; then
    read -p "GitHub fork URL [$SAVED_FORK]: " FORK_URL
    FORK_URL="${FORK_URL:-$SAVED_FORK}"
else
    read -p "GitHub fork URL (e.g., https://github.com/paulpreibisch/BMAD-METHOD.git): " FORK_URL
fi
echo ""

# Ask for test directory
echo "Step 2: Test Directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -n "$SAVED_TEST_DIR" ]]; then
    read -p "Test directory [$SAVED_TEST_DIR]: " TEST_DIR
    TEST_DIR="${TEST_DIR:-$SAVED_TEST_DIR}"
else
    DEFAULT_DIR="$HOME/bmad-pr-test-$(date +%Y%m%d-%H%M%S)"
    read -p "Test directory [$DEFAULT_DIR]: " TEST_DIR
    TEST_DIR="${TEST_DIR:-$DEFAULT_DIR}"
fi

# Expand ~ to actual home directory
TEST_DIR="${TEST_DIR/#\~/$HOME}"

echo ""

# Save configuration
echo "SAVED_FORK=\"$FORK_URL\"" > "$CONFIG_FILE"
echo "SAVED_TEST_DIR=\"$TEST_DIR\"" >> "$CONFIG_FILE"
echo "✅ Configuration saved to $CONFIG_FILE"
echo ""

# Confirm before starting
echo "Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Fork:      $FORK_URL"
echo "  Test dir:  $TEST_DIR"
echo ""
read -p "Proceed with testing? [Y/n]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
    echo "❌ Testing cancelled"
    exit 0
fi
echo ""

# Clean up old test directory if it exists
if [[ -d "$TEST_DIR" ]]; then
    echo "⚠️  Test directory already exists: $TEST_DIR"
    read -p "Delete and recreate? [Y/n]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        rm -rf "$TEST_DIR"
        echo "✅ Deleted old test directory"
    else
        echo "❌ Using existing directory (may have stale data)"
    fi
    echo ""
fi

# Step 1: Clone fork
echo "Step 1: Cloning your fork"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
git clone "$FORK_URL" BMAD-METHOD
cd BMAD-METHOD
echo "✅ Cloned fork"
echo ""

# Step 2: Fetch PR branch
echo "Step 2: Fetching PR #934 branch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git remote add upstream https://github.com/bmad-code-org/BMAD-METHOD.git
git fetch upstream pull/934/head:agentvibes-party-mode
git checkout agentvibes-party-mode
echo "✅ On PR branch: agentvibes-party-mode"
echo ""

# Step 3: Install BMAD CLI
echo "Step 3: Installing BMAD CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd tools/cli
npm install
npm link
echo "✅ BMAD CLI installed and linked"
echo ""

# Step 4: Create test project
echo "Step 4: Creating test BMAD project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$TEST_DIR"
mkdir -p bmad-project
cd bmad-project
echo "✅ Test project directory created: $TEST_DIR/bmad-project"
echo ""

# Step 5: Run BMAD installer
echo "Step 5: Running BMAD installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  When prompted:"
echo "   - Enable TTS for agents? → Yes"
echo "   - Assign unique voices for party mode? → Yes"
echo ""
read -p "Press Enter to start BMAD installer..."
bmad install

echo ""
echo "✅ BMAD installation complete"
echo ""

# Step 6: Install AgentVibes
echo "Step 6: Installing AgentVibes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  When prompted, choose:"
echo "   - Provider: Piper (free) for testing"
echo "   - Download voices: Yes"
echo ""
read -p "Press Enter to start AgentVibes installer..."
npx agentvibes@latest install

echo ""
echo "✅ AgentVibes installation complete"
echo ""

# Verification
echo "Step 7: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for voice map file
if [[ -f ".bmad/_cfg/agent-voice-map.csv" ]]; then
    echo "✅ Voice map file created: .bmad/_cfg/agent-voice-map.csv"
    echo ""
    echo "Voice assignments:"
    cat .bmad/_cfg/agent-voice-map.csv
    echo ""
else
    echo "❌ Voice map file NOT found: .bmad/_cfg/agent-voice-map.csv"
    echo "   This is a problem - agents won't have unique voices!"
    echo ""
fi

# Check for AgentVibes hooks
if [[ -f ".claude/hooks/bmad-speak.sh" ]]; then
    echo "✅ BMAD TTS hooks installed"
else
    echo "❌ BMAD TTS hooks NOT found"
    echo ""
fi

# Check for Piper installation
if command -v piper &> /dev/null; then
    echo "✅ Piper TTS installed"
    piper --version
else
    echo "⚠️  Piper not found in PATH (may still work if installed locally)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Testing setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $TEST_DIR/bmad-project"
echo "  2. Start Claude Code session"
echo "  3. Run: /bmad:core:workflows:party-mode"
echo "  4. Verify each agent speaks with a unique voice"
echo ""
echo "Test project location: $TEST_DIR/bmad-project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
