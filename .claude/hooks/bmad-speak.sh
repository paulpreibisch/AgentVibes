#!/usr/bin/env bash
#
# File: .claude/hooks/bmad-speak.sh
#
# AgentVibes BMAD Voice Integration
# Maps agent display names OR agent IDs to voices and triggers TTS
#
# Usage: bmad-speak.sh "Agent Name" "dialogue text"
#        bmad-speak.sh "agent-id" "dialogue text"
#
# Supports both:
# - Display names (e.g., "Winston", "John") for party mode
# - Agent IDs (e.g., "architect", "pm") for individual agents
#

set -euo pipefail

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Arguments
AGENT_NAME_OR_ID="$1"
DIALOGUE="$2"

# Remove backslash escaping that Claude might add for special chars like ! and $
# In single quotes these don't need escaping, but Claude sometimes adds \! anyway
DIALOGUE="${DIALOGUE//\\!/!}"
DIALOGUE="${DIALOGUE//\\\$/\$}"

# Check if party mode is enabled
if [[ -f "$PROJECT_ROOT/.agentvibes/bmad/bmad-party-mode-disabled.flag" ]]; then
  exit 0
fi

# Check if BMAD is installed
if [[ ! -f "$PROJECT_ROOT/_bmad/_config/agent-manifest.csv" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Per-agent profile reader — reads from ~/.agentvibes/bmad-voice-map.json
# Uses node for reliable JSON parsing (jq may not be installed)
# Returns empty string if field not found or file missing

VOICE_MAP_FILE="$HOME/.agentvibes/bmad-voice-map.json"

# Read a field from the per-agent profile in bmad-voice-map.json
# Usage: read_agent_profile <agent_id> <field>
# Fields: voice, pretext, reverbPreset, personality, backgroundMusic.track, backgroundMusic.volume
read_agent_profile() {
  local agent_id="$1"
  local field="$2"

  if [[ ! -f "$VOICE_MAP_FILE" ]]; then
    echo ""
    return
  fi

  # Validate agent_id format (prevent injection)
  if [[ ! "$agent_id" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo ""
    return
  fi

  # Use node for JSON parsing (always available in AgentVibes projects)
  node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync('$VOICE_MAP_FILE','utf8'));
      const a = d.agents?.['$agent_id'] ?? {};
      const f = '$field';
      if (f.includes('.')) {
        const [k1, k2] = f.split('.');
        process.stdout.write(String(a[k1]?.[k2] ?? ''));
      } else {
        process.stdout.write(String(a[f] ?? ''));
      }
    } catch { process.stdout.write(''); }
  " 2>/dev/null || echo ""
}

# ---------------------------------------------------------------------------
# Map display name to agent ID

map_to_agent_id() {
  local name_or_id="$1"

  # If it looks like a file path (.bmad/*/agents/*.md), extract the agent ID
  if [[ "$name_or_id" =~ _?\.?bmad/.*/agents/([^/]+)\.md$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi

  # First check if it's already an agent ID (column 1 of manifest)
  local direct_match=$(grep -i "^\"*${name_or_id}\"*," "$PROJECT_ROOT/_bmad/_config/agent-manifest.csv" | head -1)
  if [[ -n "$direct_match" ]]; then
    echo "$name_or_id"
    return
  fi

  # Otherwise map display name to agent ID (for party mode)
  local agent_id=$(awk -F',' -v name="$name_or_id" '
    BEGIN { IGNORECASE=1 }
    NR > 1 {
      display = $2
      gsub(/^"|"$/, "", display)
      if (tolower(display) ~ "^" tolower(name) "($| |\\()") {
        agent = $1
        gsub(/^"|"$/, "", agent)
        print agent
        exit
      }
    }
  ' "$PROJECT_ROOT/_bmad/_config/agent-manifest.csv")

  echo "$agent_id"
}

# ---------------------------------------------------------------------------
# Resolve agent profile

AGENT_ID=$(map_to_agent_id "$AGENT_NAME_OR_ID")

# Read per-agent profile from bmad-voice-map.json (takes priority)
PROFILE_VOICE=""
PROFILE_PRETEXT=""
PROFILE_REVERB=""
PROFILE_PERSONALITY=""
PROFILE_MUSIC_TRACK=""
PROFILE_MUSIC_VOLUME=""

if [[ -n "$AGENT_ID" ]] && [[ -f "$VOICE_MAP_FILE" ]]; then
  PROFILE_VOICE=$(read_agent_profile "$AGENT_ID" "voice")
  PROFILE_PRETEXT=$(read_agent_profile "$AGENT_ID" "pretext")
  PROFILE_REVERB=$(read_agent_profile "$AGENT_ID" "reverbPreset")
  PROFILE_PERSONALITY=$(read_agent_profile "$AGENT_ID" "personality")
  PROFILE_MUSIC_TRACK=$(read_agent_profile "$AGENT_ID" "backgroundMusic.track")
  PROFILE_MUSIC_VOLUME=$(read_agent_profile "$AGENT_ID" "backgroundMusic.volume")
fi

# Fallback to bmad-voice-manager.sh if no profile voice found
AGENT_VOICE="$PROFILE_VOICE"
AGENT_INTRO="$PROFILE_PRETEXT"

if [[ -z "$AGENT_VOICE" ]] && [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_VOICE=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$AGENT_ID" 2>/dev/null || true)
fi

if [[ -z "$AGENT_INTRO" ]] && [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_INTRO=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-intro "$AGENT_ID" 2>/dev/null || true)
fi

# ---------------------------------------------------------------------------
# Write PID-scoped temp profile file for per-agent overrides
# play-tts-enhanced.sh and queue worker read this for reverb/personality/music

TEMP_PROFILE=""
if [[ -n "$PROFILE_REVERB" ]] || [[ -n "$PROFILE_PERSONALITY" ]] || [[ -n "$PROFILE_MUSIC_TRACK" ]]; then
  PROFILE_DIR="${XDG_RUNTIME_DIR:-/tmp}/agentvibes-$(id -u)"
  mkdir -p "$PROFILE_DIR"
  chmod 700 "$PROFILE_DIR"
  TEMP_PROFILE="$PROFILE_DIR/agent-profile-$$.json"

  # Write profile as JSON for reliable parsing downstream
  node -e "
    const p = {};
    if ('$PROFILE_REVERB') p.reverbPreset = '$PROFILE_REVERB';
    if ('$PROFILE_PERSONALITY') p.personality = '$PROFILE_PERSONALITY';
    if ('$PROFILE_MUSIC_TRACK') p.backgroundMusic = {
      track: '$PROFILE_MUSIC_TRACK',
      volume: parseInt('${PROFILE_MUSIC_VOLUME:-70}') || 70
    };
    require('fs').writeFileSync('$TEMP_PROFILE', JSON.stringify(p), { mode: 0o600 });
  " 2>/dev/null || true

  # NOTE: Do NOT clean up temp profile here — the queue worker processes it
  # asynchronously and cleans it up after use (see tts-queue-worker.sh).
  # Removing it here would race with the background queue consumer.
fi

# ---------------------------------------------------------------------------
# Build full text with intro/pretext

FULL_TEXT="$DIALOGUE"
if [[ -n "$AGENT_INTRO" ]]; then
  FULL_TEXT="${AGENT_INTRO}. ${DIALOGUE}"
fi

# ---------------------------------------------------------------------------
# Speak with agent's voice using queue system (non-blocking for Claude)

if [[ -n "$AGENT_VOICE" ]]; then
  bash "$SCRIPT_DIR/tts-queue.sh" add "$FULL_TEXT" "$AGENT_VOICE" "$AGENT_NAME_OR_ID" "$TEMP_PROFILE" &
else
  bash "$SCRIPT_DIR/tts-queue.sh" add "$FULL_TEXT" "" "$AGENT_NAME_OR_ID" "$TEMP_PROFILE" &
fi
