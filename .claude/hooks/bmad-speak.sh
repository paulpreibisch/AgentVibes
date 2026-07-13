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
# Stage-on-first-speak (Phase 2): the FIRST party line for a session rings the
# receiver's /stage-roster doorbell so the whole cast is painted up front,
# instead of avatars trickling in one /speak at a time. Everything here is
# additive + fail-safe: if python is missing or the doorbell errors, the line
# still speaks.
#
# Party context is detected via either signal:
#   * AGENTVIBES_PARTY_MODE=1 -- the "party marker" bmad-party-speak.sh exports
#     before it invokes this script (it alone knows the roundtable fingerprint).
#   * the routing session id ends in "-bmad-party-mode" (the suffix the party
#     stages under), for any flow that runs under that session directly.
#
# Idempotency: a per-session flag ~/.agentvibes/staged-<sessionid>.flag makes the
# doorbell fire ONCE per party, not once per line.
#
# Clearing the flag: there is no per-line clear (that would re-fire every line).
# `party-set-room.sh --clear` removes it (manual reset / room change), and a
# party-end / clear hook should remove it too. TODO: wire an automatic clear to
# a party-teardown hook if/when BMAD exposes one -- until then the flag persists
# for the life of the session, which is the correct once-per-party behavior.
if [[ "${AGENTVIBES_STAGE_ROSTER_DISABLED:-}" != "1" ]]; then
  _sr_session=""
  if [[ -f "$SCRIPT_DIR/session-id.sh" ]]; then
    # shellcheck source=./session-id.sh
    source "$SCRIPT_DIR/session-id.sh"
    _sr_session="$(av_session_id "${CLAUDE_PROJECT_DIR:-$PROJECT_ROOT}")"
  fi
  if [[ "${AGENTVIBES_PARTY_MODE:-}" == "1" || "$_sr_session" == *-bmad-party-mode ]]; then
    _sr_flag="$HOME/.agentvibes/staged-${_sr_session:-unknown}.flag"
    if [[ -n "$_sr_session" && ! -f "$_sr_flag" ]]; then
      # Claim the flag FIRST (atomic-ish) so parallel party lines don't each fire.
      mkdir -p "$HOME/.agentvibes" 2>/dev/null || true
      if ( set -o noclobber; : > "$_sr_flag" ) 2>/dev/null; then
        _sr_python=""
        if [[ -f "$SCRIPT_DIR/python-resolver.sh" ]]; then
          # shellcheck source=./python-resolver.sh
          source "$SCRIPT_DIR/python-resolver.sh"
          _sr_python="${PYTHON_BIN:-}"
        fi
        if [[ -n "$_sr_python" && -f "$SCRIPT_DIR/party-stage-roster.py" ]]; then
          # Fire-and-forget in the background; NEVER block or fail the line.
          ( "$_sr_python" "$SCRIPT_DIR/party-stage-roster.py" \
              --project-root "${CLAUDE_PROJECT_DIR:-$PROJECT_ROOT}" \
              --session-suffix bmad-party-mode >/dev/null 2>&1 || true ) &
        fi
      fi
    fi
  fi
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
    echo "||||||"
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

# ---------------------------------------------------------------------------
# Populate the per-agent profile (voice/pretext/reverb/personality/music) from
# bmad-voice-map.json. THIS is the population step that a botched merge
# (610af0f2) dropped, leaving $PROFILE_VOICE et al. below referenced-but-never-
# -assigned — a fatal "unbound variable" under `set -u`. read_agent_profile_all()
# already existed (defined above) but was never called; wire it in here.
# Always initialize (even to "") so downstream references never crash, and a
# missing/unknown agent just falls through to normal TTS below.
PROFILE_VOICE=""
PROFILE_PRETEXT=""
PROFILE_REVERB=""
PROFILE_PERSONALITY=""
PROFILE_MUSIC_TRACK=""
PROFILE_MUSIC_VOLUME=""
PROFILE_MUSIC_ENABLED=""
_PROFILE_ALL="$(read_agent_profile_all "${AGENT_ID:-}")"
IFS='|' read -r PROFILE_VOICE PROFILE_PRETEXT PROFILE_REVERB PROFILE_PERSONALITY \
  PROFILE_MUSIC_TRACK PROFILE_MUSIC_VOLUME PROFILE_MUSIC_ENABLED <<< "$_PROFILE_ALL"

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
#
# Declare voice provenance so the resolver never demotes a BMAD agent's own voice
# to the per-LLM/default row (F-1). This must be set independently of whether a
# TEMP_PROFILE file was created: a voice-only agent (no reverb/personality/music)
# has an empty TEMP_PROFILE, so the arg-3 heuristic in play-tts.sh alone would
# miss it. AGENT_VOICE is an agent-profile voice, always.
export AGENTVIBES_VOICE_SOURCE="agent-profile"
# Thread the real project dir through to play-tts.sh so any downstream forward
# (SSH-remote / avatar) derives the correct routing session id from the user's
# project — NOT the install/HOME basename. Only add the flag when the var is
# non-empty so the no-project case is unchanged. Mirrors session-start-tts.sh.
_PT_PROJECT_FLAG=()
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  _PT_PROJECT_FLAG=(--project-dir "$CLAUDE_PROJECT_DIR")
fi
if [[ -n "$AGENT_VOICE" ]]; then
  bash "$SCRIPT_DIR/play-tts.sh" "$FULL_TEXT" "$AGENT_VOICE" "$TEMP_PROFILE" "${_PT_PROJECT_FLAG[@]+"${_PT_PROJECT_FLAG[@]}"}"
else
  bash "$SCRIPT_DIR/play-tts.sh" "$FULL_TEXT" "" "$TEMP_PROFILE" "${_PT_PROJECT_FLAG[@]+"${_PT_PROJECT_FLAG[@]}"}"
fi

# Release lock
rmdir "$SPEECH_LOCK" 2>/dev/null || true
trap - EXIT

# Clean up temp profile after use
if [[ -n "$TEMP_PROFILE" ]] && [[ -f "$TEMP_PROFILE" ]]; then
  rm -f "$TEMP_PROFILE"
fi
