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

# Step 1: Create directories
echo "📁 Creating directories..."
mkdir -p "$WORKSPACE/.claude/hooks"
mkdir -p "$WORKSPACE/.claude/config"

# Step 2: Create local-gen-tts.sh
echo "📝 Creating local-gen-tts.sh..."
cat > "$WORKSPACE/local-gen-tts.sh" << 'SCRIPT_EOF'
#!/usr/bin/env bash
#
# AgentVibes local-gen-tts
# Sends text to remote device for local TTS generation
#

set -euo pipefail

ANDROID_HOST="REPLACEME_SSH_HOST"
TEXT="${1:-}"
VOICE="${2:-REPLACEME_VOICE}"

if [[ -z "$TEXT" ]]; then
    echo "Usage: $0 <text> [voice]" >&2
    exit 1
fi

echo "📱 Sending text to Android for local AgentVibes playback..."

# Send text to Android and trigger AgentVibes there
ssh "$ANDROID_HOST" "bash ~/.termux/agentvibes-play.sh '$TEXT' '$VOICE'" &

echo "✓ Text sent to Android"
exit 0
SCRIPT_EOF

# Replace placeholders
sed -i "s/REPLACEME_SSH_HOST/$SSH_HOST/g" "$WORKSPACE/local-gen-tts.sh"
sed -i "s/REPLACEME_VOICE/$VOICE/g" "$WORKSPACE/local-gen-tts.sh"
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

# Call local-gen-tts in background
bash "REPLACEME_WORKSPACE/local-gen-tts.sh" "$TEXT" "$VOICE" &

exit 0
HOOK_EOF

# Replace placeholders
sed -i "s|REPLACEME_WORKSPACE|$WORKSPACE|g" "$WORKSPACE/.claude/hooks/play-tts.sh"
sed -i "s/REPLACEME_VOICE/$VOICE/g" "$WORKSPACE/.claude/hooks/play-tts.sh"
chmod +x "$WORKSPACE/.claude/hooks/play-tts.sh"

# Step 4: Create config files
echo "⚙️  Creating config files..."
echo "piper" > "$WORKSPACE/.claude/tts-provider.txt"
echo "$VOICE" > "$WORKSPACE/.claude/tts-voice.txt"
echo "$SSH_HOST" > "$WORKSPACE/.claude/ssh-remote-host.txt"

# Step 5: Install receiver on remote (if SSH available)
echo ""
echo "🌐 Installing receiver on remote device ($SSH_HOST)..."

if ssh "$SSH_HOST" "echo 'Connected'" 2>/dev/null; then
    echo "✓ SSH connection successful"
    
    # Create receiver script
    ssh "$SSH_HOST" "mkdir -p ~/.termux" 2>/dev/null || ssh "$SSH_HOST" "mkdir -p ~/.agentvibes"
    
    ssh "$SSH_HOST" "cat > ~/.termux/agentvibes-play.sh << 'RECEIVER_EOF'
#!/usr/bin/env bash
# AgentVibes SSH-TTS Receiver

TEXT=\"\\\$1\"
VOICE=\"\\\${2:-$VOICE}\"

[[ -z \"\\\$TEXT\" ]] && { echo \"❌ No text\" >&2; exit 1; }

export AGENTVIBES_NO_REMINDERS=1
export AGENTVIBES_RDP_MODE=false

# Find AgentVibes
if command -v agentvibes >/dev/null 2>&1; then
    AGENTVIBES_ROOT=\"\\\$(dirname \\\$(dirname \\\$(which agentvibes)))/lib/node_modules/agentvibes\"
elif [[ -d ~/.npm-global/lib/node_modules/agentvibes ]]; then
    AGENTVIBES_ROOT=\"\\\$HOME/.npm-global/lib/node_modules/agentvibes\"
elif [[ -d /data/data/com.termux/files/usr/lib/node_modules/agentvibes ]]; then
    AGENTVIBES_ROOT=\"/data/data/com.termux/files/usr/lib/node_modules/agentvibes\"
else
    echo \"❌ AgentVibes not found\" >&2
    exit 1
fi

PLAY_TTS=\"\\\$AGENTVIBES_ROOT/.claude/hooks/play-tts.sh\"
[[ ! -f \"\\\$PLAY_TTS\" ]] && { echo \"❌ play-tts.sh missing\" >&2; exit 1; }

echo \"🎵 Playing via AgentVibes...\" >&2
bash \"\\\$PLAY_TTS\" \"\\\$TEXT\" \"\\\$VOICE\"
RECEIVER_EOF
"
    
    ssh "$SSH_HOST" "chmod +x ~/.termux/agentvibes-play.sh"
    echo "✓ Receiver installed on $SSH_HOST"
    
    # Configure audio effects (optional)
    if [[ -n "$MUSIC" ]]; then
        echo "🎵 Configuring audio effects..."
        ssh "$SSH_HOST" "mkdir -p ~/.local/share/agentvibes/.claude/config"
        ssh "$SSH_HOST" "cat > ~/.local/share/agentvibes/.claude/config/audio-effects.cfg << 'EFFECTS_EOF'
# AgentVibes Audio Effects
$VOICE|reverb 50 50 90|$MUSIC|$MUSIC_VOLUME
default|reverb 50 50 90|$MUSIC|$MUSIC_VOLUME
EFFECTS_EOF
"
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
