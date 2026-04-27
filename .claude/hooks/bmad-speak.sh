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

# Strip markdown formatting — prevent Piper from speaking "asterisk asterisk" literally.
# play-tts-piper.sh also strips via perl, but do it here early as defense-in-depth.
DIALOGUE=$(printf '%s' "$DIALOGUE" | sed \
  -e 's/\*\{1,3\}//g' \
  -e 's/`\{1,3\}[^`]*`\{1,3\}//g' \
  -e 's/^[[:space:]]*#\{1,6\}[[:space:]]*//g' \
  -e 's/__//g' -e 's/_//g' \
  -e 's/\[([^]]*)\]([^)]*)//g' \
  -e 's/^[[:space:]]*[-*+] //g' \
  -e 's/^[[:space:]]*[0-9]\+\. //g')

# Check if party mode is enabled
if [[ -f "$PROJECT_ROOT/.agentvibes/bmad/bmad-party-mode-disabled.flag" ]]; then
  exit 0
fi

# Check if BMAD is installed
if [[ ! -f "$PROJECT_ROOT/_bmad/_config/agent-manifest.csv" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Per-agent profile reader — reads from project .agentvibes/bmad-voice-map.json (falls back to global)
# Uses node for reliable JSON parsing (jq may not be installed)
# Returns empty string if field not found or file missing

if [[ -f "$PROJECT_ROOT/.agentvibes/bmad-voice-map.json" ]]; then
  VOICE_MAP_FILE="$PROJECT_ROOT/.agentvibes/bmad-voice-map.json"
else
  VOICE_MAP_FILE="$HOME/.agentvibes/bmad-voice-map.json"
fi

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
  # SECURITY: Pass values via env vars to prevent shell injection
  _VOICE_MAP="$VOICE_MAP_FILE" _AGENT_ID="$agent_id" _FIELD="$field" node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync(process.env._VOICE_MAP,'utf8'));
      const a = d.agents?.[process.env._AGENT_ID] ?? {};
      const f = process.env._FIELD;
      if (f.includes('.')) {
        const [k1, k2] = f.split('.');
        process.stdout.write(String(a[k1]?.[k2] ?? ''));
      } else {
        process.stdout.write(String(a[f] ?? ''));
      }
    } catch { process.stdout.write(''); }
  " 2>/dev/null || echo ""
}

# Read all profile fields in a single Node.js invocation to avoid ~900ms of overhead.
# Returns: voice|pretext|reverbPreset|personality|backgroundMusic.track|backgroundMusic.volume
# Outputs `|||||` if the file is missing or the agent is not found.
# SECURITY: Pass values via env vars to prevent shell injection
read_agent_profile_all() {
  local agent_id="$1"

  # Validate agent_id format (prevent injection)
  if [[ ! "$agent_id" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "|||||"
    return
  fi

  if [[ ! -f "$VOICE_MAP_FILE" ]]; then
    echo "||||||"
    return
  fi

  _VOICE_MAP="$VOICE_MAP_FILE" _AGENT_ID="$agent_id" node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync(process.env._VOICE_MAP,'utf8'));
      const a = d.agents?.[process.env._AGENT_ID] ?? {};
      const fields = [
        String(a.voice ?? ''),
        String(a.pretext ?? ''),
        String(a.reverbPreset ?? ''),
        String(a.personality ?? ''),
        String(a.backgroundMusic?.track ?? ''),
        String(a.backgroundMusic?.volume ?? ''),
        String(a.backgroundMusic?.enabled ?? ''),
      ];
      process.stdout.write(fields.join('|'));
    } catch { process.stdout.write('||||||'); }
  " 2>/dev/null || echo "||||||"
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

# Get agent's voice and intro text
AGENT_VOICE=""
AGENT_INTRO=""
if [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_VOICE=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$AGENT_ID" 2>/dev/null)
  AGENT_INTRO=$(cd "$PROJECT_ROOT" && "$SCRIPT_DIR/bmad-voice-manager.sh" get-intro "$AGENT_ID" 2>/dev/null)
fi

# Read global background music volume as fallback (stored as 0.0-1.0, convert to 0-100 integer)
_BG_VOL_FILE="${CLAUDE_PROJECT_DIR:-$PROJECT_ROOT}/.claude/config/background-music-volume.txt"
if [[ ! -f "$_BG_VOL_FILE" ]]; then
  _BG_VOL_FILE="$HOME/.claude/config/background-music-volume.txt"
fi
if [[ -f "$_BG_VOL_FILE" ]]; then
  GLOBAL_BG_VOLUME=$(_BG_VOL_RAW=$(cat "$_BG_VOL_FILE") node -e "
    const v = parseFloat(process.env._BG_VOL_RAW);
    process.stdout.write(isNaN(v) ? '20' : String(Math.round(v * 100)));
  " 2>/dev/null || echo "20")
else
  GLOBAL_BG_VOLUME=20
fi

# Fallback to bmad-voice-manager.sh if no profile voice found
AGENT_VOICE="$PROFILE_VOICE"
AGENT_INTRO="$PROFILE_PRETEXT"

if [[ -z "$AGENT_VOICE" ]] && [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_VOICE=$(cd "$PROJECT_ROOT" && bash "$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$AGENT_ID" 2>/dev/null || true)
fi

if [[ -z "$AGENT_INTRO" ]] && [[ -n "$AGENT_ID" ]] && [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
  AGENT_INTRO=$(cd "$PROJECT_ROOT" && bash "$SCRIPT_DIR/bmad-voice-manager.sh" get-intro "$AGENT_ID" 2>/dev/null || true)
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
  # SECURITY: Pass values via env vars to prevent shell injection
  _P_REVERB="$PROFILE_REVERB" _P_PERSONALITY="$PROFILE_PERSONALITY" \
  _P_MUSIC_TRACK="$PROFILE_MUSIC_TRACK" _P_MUSIC_VOL="${PROFILE_MUSIC_VOLUME:-$GLOBAL_BG_VOLUME}" \
  _P_MUSIC_ENABLED="$PROFILE_MUSIC_ENABLED" \
  _P_OUTFILE="$TEMP_PROFILE" node -e "
    const p = {};
    if (process.env._P_REVERB) p.reverbPreset = process.env._P_REVERB;
    if (process.env._P_PERSONALITY) p.personality = process.env._P_PERSONALITY;
    if (process.env._P_MUSIC_TRACK) p.backgroundMusic = {
      track: process.env._P_MUSIC_TRACK,
      volume: parseInt(process.env._P_MUSIC_VOL) || 20,
      enabled: process.env._P_MUSIC_ENABLED === 'true'
    };
    require('fs').writeFileSync(process.env._P_OUTFILE, JSON.stringify(p), { mode: 0o600 });
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


# Serialize speech — prevents overlap when Claude fires parallel calls
# Uses mkdir as a portable atomic lock (works on Linux, macOS, WSL)
SPEECH_LOCK="${XDG_RUNTIME_DIR:-/tmp}/agentvibes-speech.lock"

# Acquire lock (wait up to 120s, retry every 0.5s)
# Clean up stale file locks from older flock-based version
[[ -f "$SPEECH_LOCK" ]] && rm -f "$SPEECH_LOCK"
_WAIT=0
while ! mkdir "$SPEECH_LOCK" 2>/dev/null; do
  if [[ -e "$SPEECH_LOCK" ]]; then
    _LOCK_AGE=$(( $(date +%s) - $(stat -c '%Y' "$SPEECH_LOCK" 2>/dev/null || stat -f '%m' "$SPEECH_LOCK" 2>/dev/null || echo 0) ))
    [[ $_LOCK_AGE -gt 60 ]] && { rm -rf "$SPEECH_LOCK" 2>/dev/null || true; continue; }
  fi
  sleep 0.5
  _WAIT=$((_WAIT + 1))
  [[ $_WAIT -gt 240 ]] && break
done
trap 'rmdir "$SPEECH_LOCK" 2>/dev/null' EXIT

# Speak with agent's voice, passing the temp profile path as arg 3 so
# play-tts-piper.sh → audio-processor.sh can read per-agent music settings
# without any env vars (safe for concurrent multi-project use).
if [[ -n "$AGENT_VOICE" ]]; then
  bash "$SCRIPT_DIR/play-tts.sh" "$FULL_TEXT" "$AGENT_VOICE" "$TEMP_PROFILE"
else
  bash "$SCRIPT_DIR/play-tts.sh" "$FULL_TEXT" "" "$TEMP_PROFILE"
fi

# Release lock
rmdir "$SPEECH_LOCK" 2>/dev/null || true
trap - EXIT

# Clean up temp profile after use
if [[ -n "$TEMP_PROFILE" ]] && [[ -f "$TEMP_PROFILE" ]]; then
  rm -f "$TEMP_PROFILE"
fi
