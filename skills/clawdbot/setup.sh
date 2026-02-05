#!/usr/bin/env bash
#
# AgentVibes Clawdbot Skill - Setup Script
# Automatically configures Clawdbot for local-gen-tts
#
# Usage:
#   CLAWDBOT_WORKSPACE=~/clawd bash setup.sh
#   CLAWDBOT_WORKSPACE=~/clawd AGENTVIBES_VOICE=en_US-kristin-medium bash setup.sh
#

set -euo pipefail

echo "╔════════════════════════════════════════╗"
echo "║  AgentVibes Clawdbot Skill Setup      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Configuration
WORKSPACE="${CLAWDBOT_WORKSPACE:-$HOME/clawd}"
SSH_HOST="${AGENTVIBES_SSH_HOST:-android}"
VOICE="${AGENTVIBES_VOICE:-en_US-kristin-medium}"
MUSIC="${AGENTVIBES_MUSIC:-agentvibes_soft_flamenco_loop.mp3}"
MUSIC_VOLUME="${AGENTVIBES_MUSIC_VOLUME:-0.10}"

# Step -1: SSH Setup Validation
echo "🔐 SSH Configuration Check"
echo "────────────────────────────────────────"
echo "Remote device (SSH_HOST): $SSH_HOST"
echo ""

if ssh -o BatchMode=yes -o ConnectTimeout=3 "$SSH_HOST" "echo 'OK'" 2>&1 | grep -q "OK"; then
    echo "✓ SSH connection to '$SSH_HOST' is working!"
    echo ""
else
    echo "❌ Cannot connect to '$SSH_HOST' via SSH"
    echo ""
    echo "📋 To set up SSH to your remote device:"
    echo ""
    echo "1️⃣  Generate SSH key (if you don't have one):"
    echo "   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ''"
    echo ""
    echo "2️⃣  Copy key to remote device:"
    echo "   ssh-copy-id -i ~/.ssh/id_ed25519.pub user@remote-ip"
    echo "   (or manually copy ~/.ssh/id_ed25519.pub to ~/.ssh/authorized_keys on remote)"
    echo ""
    echo "3️⃣  Test SSH connection:"
    echo "   ssh $SSH_HOST 'echo Connected'"
    echo ""
    echo "4️⃣  Add to ~/.ssh/config (optional but recommended):"
    echo "   Host $SSH_HOST"
    echo "       HostName your-device-ip"
    echo "       User your-username"
    echo "       Port 22"
    echo ""
    echo "5️⃣  Once SSH works, run this script again"
    echo ""
    exit 1
fi

# SECURITY: Validate all inputs to prevent injection attacks
# SSH_HOST: alphanumeric, dots, hyphens, underscores only (no leading hyphen)
if [[ ! "$SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]; then
    echo "❌ Invalid SSH host format: $SSH_HOST" >&2
    echo "💡 Host must be alphanumeric (may contain dots, hyphens, underscores)" >&2
    exit 1
fi

# VOICE: alphanumeric, hyphens, underscores only
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "❌ Invalid voice format: $VOICE" >&2
    exit 1
fi

# MUSIC: alphanumeric, hyphens, underscores, dots only (filename)
if [[ ! "$MUSIC" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    echo "❌ Invalid music filename: $MUSIC" >&2
    exit 1
fi

# MUSIC_VOLUME: decimal number 0.0-1.0
if [[ ! "$MUSIC_VOLUME" =~ ^[0-1]\.[0-9]+$ ]] && [[ ! "$MUSIC_VOLUME" =~ ^[01]$ ]]; then
    echo "❌ Invalid music volume: $MUSIC_VOLUME (must be 0.0-1.0)" >&2
    exit 1
fi

echo "📂 Workspace: $WORKSPACE"
echo "🌐 SSH Host: $SSH_HOST"
echo "🎤 Voice: $VOICE"
echo "🎵 Music: $MUSIC @ ${MUSIC_VOLUME}"
echo ""

# Validate workspace
if [[ ! -d "$WORKSPACE" ]]; then
    echo "❌ Workspace not found: $WORKSPACE"
    echo "💡 Create it first: mkdir -p $WORKSPACE"
    exit 1
fi

# Step 0: Auto-install AgentVibes on server if needed
echo "🔍 Checking for AgentVibes installation..."
if ! command -v agentvibes >/dev/null 2>&1; then
    echo "📦 AgentVibes not found, installing globally..."
    npm install -g agentvibes || {
        echo "❌ Failed to install AgentVibes with npm" >&2
        echo "💡 Install manually: npx agentvibes --help (or npm install -g agentvibes)" >&2
        exit 1
    }
    echo "✓ AgentVibes installed successfully"
else
    echo "✓ AgentVibes already installed"
fi

# Step 1: Create directories with restrictive permissions
echo "📁 Creating directories..."
mkdir -p "$WORKSPACE/.claude/hooks"
mkdir -p "$WORKSPACE/.claude/config"
chmod 700 "$WORKSPACE/.claude"
chmod 700 "$WORKSPACE/.claude/hooks"
chmod 700 "$WORKSPACE/.claude/config"

# Step 2: Create local-gen-tts.sh with security fixes
echo "📝 Creating local-gen-tts.sh..."
cat > "$WORKSPACE/local-gen-tts.sh" << 'SCRIPT_EOF'
#!/usr/bin/env bash
#
# AgentVibes local-gen-tts
# Sends text to remote device for local TTS generation
# SECURITY: Uses base64 encoding to prevent command injection
#

set -euo pipefail

ANDROID_HOST="REPLACEME_SSH_HOST"
TEXT="${1:-}"
VOICE="${2:-REPLACEME_VOICE}"

if [[ -z "$TEXT" ]]; then
    echo "Usage: $0 <text> [voice]" >&2
    exit 1
fi

# SECURITY: Validate voice format
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "❌ Invalid voice format: $VOICE" >&2
    exit 1
fi

# SECURITY: Encode text as base64 to prevent command injection
ENCODED_TEXT=$(printf '%s' "$TEXT" | base64 -w 0)

echo "📱 Sending text to Android for local AgentVibes playback..."

# Send base64-encoded text to Android (receiver will decode)
ssh "$ANDROID_HOST" "bash ~/.termux/agentvibes-play.sh '$ENCODED_TEXT' '$VOICE'" &

echo "✓ Text sent to Android"
exit 0
SCRIPT_EOF

# Replace placeholders using portable sed (works on both GNU and BSD)
sed "s/REPLACEME_SSH_HOST/$SSH_HOST/g" "$WORKSPACE/local-gen-tts.sh" > "$WORKSPACE/local-gen-tts.sh.tmp"
mv "$WORKSPACE/local-gen-tts.sh.tmp" "$WORKSPACE/local-gen-tts.sh"
sed "s/REPLACEME_VOICE/$VOICE/g" "$WORKSPACE/local-gen-tts.sh" > "$WORKSPACE/local-gen-tts.sh.tmp"
mv "$WORKSPACE/local-gen-tts.sh.tmp" "$WORKSPACE/local-gen-tts.sh"
chmod +x "$WORKSPACE/local-gen-tts.sh"

# Step 3: Create TTS hook
echo "🔗 Creating TTS hook..."
cat > "$WORKSPACE/.claude/hooks/play-tts.sh" << 'HOOK_EOF'
#!/usr/bin/env bash
#
# AgentVibes Clawdbot TTS Hook
# Automatically speaks all Clawdbot responses via local-gen-tts
#

set -euo pipefail

TEXT="${1:-}"
VOICE="${2:-REPLACEME_VOICE}"

if [[ -z "$TEXT" ]]; then
    exit 0
fi

# Call local-gen-tts in background (it handles security/encoding)
bash "REPLACEME_WORKSPACE/local-gen-tts.sh" "$TEXT" "$VOICE" &

exit 0
HOOK_EOF

# Replace placeholders using portable sed
sed "s|REPLACEME_WORKSPACE|$WORKSPACE|g" "$WORKSPACE/.claude/hooks/play-tts.sh" > "$WORKSPACE/.claude/hooks/play-tts.sh.tmp"
mv "$WORKSPACE/.claude/hooks/play-tts.sh.tmp" "$WORKSPACE/.claude/hooks/play-tts.sh"
sed "s/REPLACEME_VOICE/$VOICE/g" "$WORKSPACE/.claude/hooks/play-tts.sh" > "$WORKSPACE/.claude/hooks/play-tts.sh.tmp"
mv "$WORKSPACE/.claude/hooks/play-tts.sh.tmp" "$WORKSPACE/.claude/hooks/play-tts.sh"
chmod +x "$WORKSPACE/.claude/hooks/play-tts.sh"

# Step 4: Create config files
echo "⚙️  Creating config files..."
echo "piper" > "$WORKSPACE/.claude/tts-provider.txt"
echo "$VOICE" > "$WORKSPACE/.claude/tts-voice.txt"
echo "$SSH_HOST" > "$WORKSPACE/.claude/ssh-remote-host.txt"

# Step 5: Install receiver on remote (if SSH available)
echo ""
echo "🌐 Installing receiver on remote device ($SSH_HOST)..."

# Test SSH connection (show errors for debugging)
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" "echo 'Connected'" 2>&1; then
    echo "✓ SSH connection successful"

    # SECURITY: Create receiver script locally first, then scp to remote
    # This avoids complex heredoc escaping which is error-prone
    TEMP_RECEIVER=$(mktemp)
    trap 'rm -f "$TEMP_RECEIVER"' EXIT

    cat > "$TEMP_RECEIVER" << 'RECEIVER_EOF'
#!/usr/bin/env bash
# AgentVibes SSH-TTS Receiver
set -euo pipefail

TEXT="${1:-}"
VOICE="${2:-en_US-kristin-medium}"

[[ -z "$TEXT" ]] && { echo "❌ No text" >&2; exit 1; }

# SECURITY: Decode base64 if input appears to be encoded
if [[ "$TEXT" =~ ^[A-Za-z0-9+/]+=*$ ]] && [[ ${#TEXT} -gt 20 ]]; then
    DECODED=$(printf '%s' "$TEXT" | base64 -d 2>/dev/null) || DECODED=""
    [[ -n "$DECODED" ]] && TEXT="$DECODED"
fi

# SECURITY: Validate voice format
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "❌ Invalid voice format" >&2; exit 1
fi

export AGENTVIBES_NO_REMINDERS=1
export AGENTVIBES_RDP_MODE=false

# Step 1: Check if AgentVibes is installed, auto-install if needed
if ! command -v agentvibes >/dev/null 2>&1; then
    echo "📦 AgentVibes not found, attempting auto-install..." >&2
    if ! npm install -g agentvibes 2>/dev/null; then
        echo "❌ AgentVibes not installed and auto-install failed" >&2
        echo "💡 Install manually: npm install -g agentvibes" >&2
        exit 1
    fi
fi

# Step 2: Find AgentVibes
if command -v agentvibes >/dev/null 2>&1; then
    AGENTVIBES_ROOT="$(dirname "$(dirname "$(which agentvibes)")")/lib/node_modules/agentvibes"
elif [[ -d ~/.npm-global/lib/node_modules/agentvibes ]]; then
    AGENTVIBES_ROOT="$HOME/.npm-global/lib/node_modules/agentvibes"
elif [[ -d /data/data/com.termux/files/usr/lib/node_modules/agentvibes ]]; then
    AGENTVIBES_ROOT="/data/data/com.termux/files/usr/lib/node_modules/agentvibes"
else
    echo "❌ AgentVibes not found after install attempt" >&2
    exit 1
fi

PLAY_TTS="$AGENTVIBES_ROOT/.claude/hooks/play-tts.sh"
[[ ! -f "$PLAY_TTS" ]] && { echo "❌ play-tts.sh missing" >&2; exit 1; }

echo "🎵 Playing via AgentVibes..." >&2
bash "$PLAY_TTS" "$TEXT" "$VOICE"
RECEIVER_EOF

    # Create remote directories with proper permissions
    ssh "$SSH_HOST" "mkdir -p ~/.termux && chmod 700 ~/.termux" 2>/dev/null || \
    ssh "$SSH_HOST" "mkdir -p ~/.agentvibes && chmod 700 ~/.agentvibes"

    # Copy receiver script to remote
    scp -q "$TEMP_RECEIVER" "$SSH_HOST:~/.termux/agentvibes-play.sh" 2>/dev/null || \
    scp -q "$TEMP_RECEIVER" "$SSH_HOST:~/.agentvibes/agentvibes-play.sh"

    ssh "$SSH_HOST" "chmod +x ~/.termux/agentvibes-play.sh 2>/dev/null || chmod +x ~/.agentvibes/agentvibes-play.sh"
    echo "✓ Receiver installed on $SSH_HOST"

    # Configure audio effects (optional)
    if [[ -n "$MUSIC" ]]; then
        echo "🎵 Configuring audio effects..."
        ssh "$SSH_HOST" "mkdir -p ~/.local/share/agentvibes/.claude/config && chmod 700 ~/.local/share/agentvibes/.claude/config"

        # Create config file locally and scp
        TEMP_CONFIG=$(mktemp)
        cat > "$TEMP_CONFIG" << EFFECTS_EOF
# AgentVibes Audio Effects
$VOICE|reverb 50 50 90|$MUSIC|$MUSIC_VOLUME
default|reverb 50 50 90|$MUSIC|$MUSIC_VOLUME
EFFECTS_EOF
        scp -q "$TEMP_CONFIG" "$SSH_HOST:~/.local/share/agentvibes/.claude/config/audio-effects.cfg"
        rm -f "$TEMP_CONFIG"

        ssh "$SSH_HOST" "echo 'true' > ~/.local/share/agentvibes/.claude/config/background-music-enabled.txt"
        ssh "$SSH_HOST" "echo '$MUSIC_VOLUME' > ~/.local/share/agentvibes/.claude/config/background-music-volume.txt"
        echo "✓ Audio effects configured"
    fi
else
    echo "⚠️  Cannot connect to $SSH_HOST"
    echo "💡 Install receiver manually:"
    echo "   ssh $SSH_HOST"
    echo "   curl -sSL https://raw.githubusercontent.com/paulpreibisch/AgentVibes/main/scripts/install-ssh-receiver.sh | bash"
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                    ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📊 Configuration Summary:"
echo "   Workspace: $WORKSPACE"
echo "   Voice: $VOICE"
echo "   SSH Host: $SSH_HOST"
echo "   Music: $MUSIC @ $MUSIC_VOLUME"
echo ""
echo "🎯 What's Next:"
echo "   1. Send a message to Clawdbot"
echo "   2. It will automatically speak via AgentVibes!"
echo ""
echo "📚 Docs: $WORKSPACE/agentvibes-clawdbot-skill/SKILL.md"
echo ""
echo "⭐ Love AgentVibes? Star the repo!"
echo "   https://github.com/paulpreibisch/AgentVibes"
