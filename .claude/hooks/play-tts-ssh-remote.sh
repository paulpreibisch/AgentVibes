#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts-ssh-remote.sh
#
# AgentVibes - SSH-Remote TTS Provider (v2 — JSON payload)
# Sends text + effects config to remote device via SSH for local playback
#
# The sender reads local audio-effects.cfg and bundles everything into a
# single base64-encoded JSON payload. The receiver is a thin executor.
#
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0
#

set -euo pipefail

TEXT="${1:-}"
VOICE="${2:-en_US-lessac-medium}"
AGENT_NAME="${3:-default}"
AGENT_PROFILE_FILE="${4:-}"

# LLM identity — forwarded to the remote so it can look up its own
# audio-effects.cfg llm:<name> row for voice, reverb, music, pretext, engine.
# AGENTVIBES_LLM_KEY is exported by play-tts.sh before calling this hook
# (format: "llm:<name>"). Strip the prefix to get the bare name.
LLM_NAME=""
if [[ -n "${AGENTVIBES_LLM_KEY:-}" ]]; then
  LLM_NAME="${AGENTVIBES_LLM_KEY#llm:}"
  # Validate — only allow safe identifier chars (mirrors play-tts.ps1 check)
  if [[ ! "$LLM_NAME" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]]; then
    LLM_NAME=""
  fi
fi
# Default to "default" so remote always has an LLM key to look up
LLM_NAME="${LLM_NAME:-default}"

# Music-only preview mode: AGENTVIBES_MUSIC_ONLY=<track.mp3> tells the receiver to
# play a standalone background-music track (no speech). Used by the Music tab's
# remote preview so a track can be auditioned on the receiver. In this mode empty
# TEXT is allowed and the track name is forwarded as the "music" field with
# kind=music; the receiver resolves the file from its own ~/.claude/audio/tracks/.
PAYLOAD_KIND="speak"
MUSIC_ONLY_TRACK=""
if [[ -n "${AGENTVIBES_MUSIC_STOP:-}" ]]; then
  # Stop whatever music preview is currently playing on the receiver.
  PAYLOAD_KIND="music-stop"
elif [[ -n "${AGENTVIBES_MUSIC_ONLY:-}" ]]; then
  # Only a bare .mp3 filename is allowed (no path separators, no leading dash) —
  # the receiver resolves it against its own tracks dir, so reject path-like input.
  if [[ "$AGENTVIBES_MUSIC_ONLY" =~ ^[A-Za-z0-9._][A-Za-z0-9._-]*\.mp3$ ]]; then
    PAYLOAD_KIND="music"
    MUSIC_ONLY_TRACK="$AGENTVIBES_MUSIC_ONLY"
  else
    echo "Invalid music track name: $AGENTVIBES_MUSIC_ONLY" >&2
    exit 1
  fi
fi

# Validate required input (music / music-stop modes carry no speech text)
if [[ "$PAYLOAD_KIND" == "music" || "$PAYLOAD_KIND" == "music-stop" ]]; then
  TEXT=""   # no speech in a music preview / stop
elif [[ -z "$TEXT" ]]; then
  echo "Usage: $0 <text> [voice] [agent_name]" >&2
  exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Derive project name from directory
PROJECT_NAME=$(basename "$PROJECT_ROOT")
# Absolute path, forwarded so the receiver-side avatar can show/learn the real
# remote folder (mirrors the local forward-to-avatar.sh's projectPath field).
PROJECT_PATH="$PROJECT_ROOT"

# ---------------------------------------------------------------------------
# Get SSH connection details from config
# Prefer ~/.agentvibes/transport-config.json, fall back to legacy host file
# ---------------------------------------------------------------------------

SSH_HOST=""
SSH_KEY=""
SSH_PORT=""

# Priority 1: per-LLM SSH override set by play-tts.sh
if [[ -n "${AGENTVIBES_SSH_HOST:-}" ]]; then
  SSH_HOST="$AGENTVIBES_SSH_HOST"
  SSH_KEY="${AGENTVIBES_SSH_KEY:-}"
  SSH_PORT="${AGENTVIBES_SSH_PORT:-}"
fi

# Priority 2: ~/.agentvibes/transport-config.json (ssh-remote section)
if [[ -z "$SSH_HOST" ]]; then
  _TRANSPORT_CFG="$HOME/.agentvibes/transport-config.json"
  if [[ -f "$_TRANSPORT_CFG" ]] && command -v python3 &>/dev/null; then
    SSH_HOST=$(python3 -c "import json,sys; d=json.load(open('$_TRANSPORT_CFG')); p=d.get('ssh-remote',{}); print(p.get('host',''))" 2>/dev/null || echo "")
    SSH_KEY=$(python3  -c "import json,sys; d=json.load(open('$_TRANSPORT_CFG')); p=d.get('ssh-remote',{}); print(p.get('sshKey',''))" 2>/dev/null || echo "")
    SSH_PORT=$(python3 -c "import json,sys; d=json.load(open('$_TRANSPORT_CFG')); p=d.get('ssh-remote',{}); print(p.get('port',''))" 2>/dev/null || echo "")
  fi
fi

# Priority 2b: fallback to first mode=remote entry in transport-config.json
# (config keyed by LLM name rather than 'ssh-remote', e.g. 'claude-code')
if [[ -z "$SSH_HOST" ]]; then
  _TRANSPORT_CFG="$HOME/.agentvibes/transport-config.json"
  if [[ -f "$_TRANSPORT_CFG" ]] && command -v python3 &>/dev/null; then
    _remote_data=$(python3 -c "
import json, sys
try:
    d = json.load(open('$_TRANSPORT_CFG'))
    for v in d.values():
        if isinstance(v, dict) and v.get('mode') == 'remote' and v.get('host',''):
            print(v.get('host',''))
            print(v.get('sshKey',''))
            print(v.get('port',''))
            sys.exit(0)
except Exception:
    pass
" 2>/dev/null || echo "")
    if [[ -n "$_remote_data" ]]; then
      SSH_HOST=$(echo "$_remote_data" | sed -n '1p')
      SSH_KEY=$(echo  "$_remote_data" | sed -n '2p')
      SSH_PORT=$(echo "$_remote_data" | sed -n '3p')
    fi
  fi
fi

# Priority 3: legacy host file
if [[ -z "$SSH_HOST" ]]; then
  SSH_HOST=$(cat "$PROJECT_ROOT/.claude/ssh-remote-host.txt" 2>/dev/null || \
             cat "$HOME/.claude/ssh-remote-host.txt" 2>/dev/null || echo "")
fi

if [[ -z "$SSH_HOST" ]]; then
  echo "SSH-Remote host not configured" >&2
  echo "Configure in AgentVibes Setup → Audio Transport → SSH Remote → Configure" >&2
  exit 1
fi

# SECURITY: Validate SSH_HOST format (hostname, IP, IPv6, or ~/.ssh/config alias)
if [[ ! "$SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]] && \
   [[ ! "$SSH_HOST" =~ ^\[[0-9a-fA-F:]+\]$ ]]; then
  echo "Invalid SSH host format: $SSH_HOST" >&2
  exit 1
fi

# SECURITY: Validate SSH_KEY path (must be absolute, no shell metacharacters)
if [[ -n "$SSH_KEY" ]] && [[ ! "$SSH_KEY" =~ ^/ ]]; then
  SSH_KEY=""  # Reject relative paths
fi

# SECURITY: Validate SSH_PORT (digits only)
if [[ -n "$SSH_PORT" ]] && [[ ! "$SSH_PORT" =~ ^[0-9]+$ ]]; then
  SSH_PORT=""
fi

# SECURITY: Validate VOICE
# Allow letters, digits, underscore, hyphen, period, colon (for :: multi-speaker separator), slash.
# Voice is passed to the remote via base64-encoded JSON (jq --arg safely escapes it),
# so shell metacharacters are the only real risk.
if [[ ! "$VOICE" =~ ^[a-zA-Z0-9_.:\/-]+$ ]]; then
  echo "Invalid voice format: $VOICE" >&2
  exit 1
fi

# SECURITY: Validate AGENT_NAME
if [[ ! "$AGENT_NAME" =~ ^[a-zA-Z0-9_\ -]+$ ]]; then
  echo "Invalid agent name format: $AGENT_NAME" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Read audio effects config for this agent
# ---------------------------------------------------------------------------

SOX_EFFECTS=""
BG_FILE=""
# TODO(AVI-S8.6): generate this constant from the shared JSON source of truth.
BG_VOLUME="0.20"

# Use CLAUDE_PROJECT_DIR (injected via --project-dir by play-tts.sh) so the
# agent-name / default row is read from the user's project, not the package.
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && -d "$CLAUDE_PROJECT_DIR/.claude" ]]; then
  EFFECTS_CFG="$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg"
else
  EFFECTS_CFG="$PROJECT_ROOT/.claude/config/audio-effects.cfg"
fi
if [[ -f "$EFFECTS_CFG" ]]; then
  # awk exact field-1 match — no regex injection risk from AGENT_NAME
  CONFIG_LINE=$(awk -F'|' -v k="${AGENT_NAME}" '$1==k{print;exit}' "$EFFECTS_CFG" 2>/dev/null || true)
  [[ -z "$CONFIG_LINE" ]] && \
    CONFIG_LINE=$(awk -F'|' '$1=="default"{print;exit}' "$EFFECTS_CFG" 2>/dev/null || true)
  if [[ -n "$CONFIG_LINE" ]]; then
    IFS='|' read -r _ SOX_EFFECTS BG_FILE BG_VOLUME <<< "$CONFIG_LINE"
    SOX_EFFECTS="${SOX_EFFECTS## }"; SOX_EFFECTS="${SOX_EFFECTS%% }"
    BG_FILE="${BG_FILE## }"; BG_FILE="${BG_FILE%% }"
    BG_VOLUME="${BG_VOLUME## }"; BG_VOLUME="${BG_VOLUME%% }"
  fi
fi

# ---------------------------------------------------------------------------
# Override with LLM-specific settings from llm:<name> row
# Format: llm:<name>|REVERB_PRESET|BACKGROUND_FILE|BACKGROUND_VOLUME|VOICE|PRETEXT|ENGINE
# The LLM row takes priority over the agent-name row. This is what the user
# configures in the TUI under Setup → LLM Providers → Configure, and these
# settings are forwarded to the remote so it can apply them as overrides —
# without requiring the remote to have its own audio-effects.cfg configured.
# ---------------------------------------------------------------------------
LLM_REVERB=""
LLM_BG_FILE=""
LLM_BG_VOLUME=""

# Build config search path for LLM-specific row lookup.
# Priority: CLAUDE_PROJECT_DIR (real user project) → global HOME fallback.
# PROJECT_ROOT is intentionally excluded when CLAUDE_PROJECT_DIR is set and
# different — prevents the AgentVibes package's own audio-effects.cfg from
# bleeding into a user project that doesn't define its own llm: row.
_llm_cfg_paths=()
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && "$CLAUDE_PROJECT_DIR" != "$PROJECT_ROOT" ]]; then
  _llm_cfg_paths+=("$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg")
else
  _llm_cfg_paths+=("$PROJECT_ROOT/.claude/config/audio-effects.cfg")
fi
_llm_cfg_paths+=("$HOME/.claude/config/audio-effects.cfg")

_llm_key="llm:${LLM_NAME}"
_llm_row_found=0
for _cfg in "${_llm_cfg_paths[@]}"; do
  if [[ -f "$_cfg" ]]; then
    while IFS='|' read -r _key _reverb _bgfile _bgvol _rest; do
      _key="${_key## }"; _key="${_key%% }"
      if [[ "$_key" == "$_llm_key" ]]; then
        _reverb="${_reverb## }"; _reverb="${_reverb%% }"
        _bgfile="${_bgfile## }"; _bgfile="${_bgfile%% }"
        _bgvol="${_bgvol## }";   _bgvol="${_bgvol%% }"
        # Only accept preset names for reverb (cross-platform safe)
        case "$_reverb" in
          off|light|medium|heavy|cathedral) LLM_REVERB="$_reverb" ;;
        esac
        [[ -n "$_bgfile" ]] && LLM_BG_FILE="$_bgfile"
        [[ -n "$_bgvol"  ]] && LLM_BG_VOLUME="$_bgvol"
        _llm_row_found=1
        break  # first matching row in this file wins
      fi
    done < "$_cfg"
    # Stop searching after first file that contains the llm: row
    [[ $_llm_row_found -eq 1 ]] && break
  fi
done

# LLM settings win over agent-name settings
[[ -n "$LLM_REVERB"    ]] && SOX_EFFECTS="$LLM_REVERB"
# Allow caller to override reverb for one-shot preview (e.g. effects picker Space preview)
[[ -n "${AGENTVIBES_REVERB_OVERRIDE:-}" ]] && SOX_EFFECTS="$AGENTVIBES_REVERB_OVERRIDE"
[[ -n "$LLM_BG_FILE"   ]] && BG_FILE="$LLM_BG_FILE"
[[ -n "$LLM_BG_VOLUME" ]] && BG_VOLUME="$LLM_BG_VOLUME"

# Per-agent profile (written by bmad-speak.sh) takes highest priority for music
if [[ -n "$AGENT_PROFILE_FILE" ]] && [[ -f "$AGENT_PROFILE_FILE" ]]; then
  _prof_track=$(_AV_PROF="$AGENT_PROFILE_FILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._AV_PROF,'utf8'));process.stdout.write(p.backgroundMusic?.track??'')}catch{process.stdout.write('')}" 2>/dev/null || true)
  _prof_vol=$(_AV_PROF="$AGENT_PROFILE_FILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._AV_PROF,'utf8'));process.stdout.write(String(p.backgroundMusic?.volume??''))}catch{process.stdout.write('')}" 2>/dev/null || true)
  _prof_enabled=$(_AV_PROF="$AGENT_PROFILE_FILE" node -e "try{const p=JSON.parse(require('fs').readFileSync(process.env._AV_PROF,'utf8'));process.stdout.write(String(p.backgroundMusic?.enabled??''))}catch{process.stdout.write('')}" 2>/dev/null || true)
  if [[ "$_prof_enabled" == "true" ]] && [[ -n "$_prof_track" ]]; then
    BG_FILE="$_prof_track"
    if [[ "$_prof_vol" =~ ^[0-9]+$ ]]; then
      BG_VOLUME=$(awk "BEGIN{printf \"%.2f\", ${_prof_vol}/100}")
    fi
  fi
fi

# PRETEXT is NOT extracted from the llm row here.
# play-tts.sh already prepends the llm row's pretext to TEXT before calling this script.
# Extracting it again and sending it as a separate JSON field would cause the receiver
# to prepend it a second time — the user hears the intro text twice.
# PRETEXT here is only for the (rare) pretext.txt override file, not the llm row.
PRETEXT=""
PRETEXT_FILE="$PROJECT_ROOT/.agentvibes/config/pretext.txt"
if [[ -f "$PRETEXT_FILE" ]]; then
  PRETEXT=$(cat "$PRETEXT_FILE" 2>/dev/null || true)
fi

# Read speed if configured
SPEED=""
SPEED_FILE="$PROJECT_ROOT/.agentvibes/config/speed.txt"
if [[ -f "$SPEED_FILE" ]]; then
  SPEED=$(cat "$SPEED_FILE" 2>/dev/null || true)
fi

# Read the TTS provider the RECEIVER should use to generate audio.
# This is separate from the sender's own provider (which is "ssh-remote").
# Check receiver-provider.txt first, then fall back to "piper".
PROVIDER=""
RECEIVER_PROVIDER_FILE="$PROJECT_ROOT/.agentvibes/config/receiver-provider.txt"
if [[ -f "$RECEIVER_PROVIDER_FILE" ]]; then
  PROVIDER=$(cat "$RECEIVER_PROVIDER_FILE" 2>/dev/null || true)
fi
# Also check home-level config
if [[ -z "$PROVIDER" ]]; then
  RECEIVER_PROVIDER_FILE="$HOME/.agentvibes/config/receiver-provider.txt"
  if [[ -f "$RECEIVER_PROVIDER_FILE" ]]; then
    PROVIDER=$(cat "$RECEIVER_PROVIDER_FILE" 2>/dev/null || true)
  fi
fi
# Validate — only known TTS providers (not transport providers like ssh-remote)
case "${PROVIDER:-}" in
  piper|soprano|macos|windows-sapi|kokoro|elevenlabs) ;;
  *) PROVIDER="piper" ;;
esac

# ---------------------------------------------------------------------------
# Resolve the project-level .claude dir the way the local managers do:
# CLAUDE_PROJECT_DIR (the real user project, injected via --project-dir by
# play-tts.sh) wins; otherwise fall back to the package PROJECT_ROOT.
# ---------------------------------------------------------------------------
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && -d "$CLAUDE_PROJECT_DIR/.claude" ]]; then
  _RESOLVE_PROJECT_DIR="$CLAUDE_PROJECT_DIR"
else
  _RESOLVE_PROJECT_DIR="$PROJECT_ROOT"
fi

# ---------------------------------------------------------------------------
# Resolve MUTE to forward (map §C 'mute never forwarded on SSH', R17).
# Mirrors play-tts.sh's 3-level file check exactly:
#   project-unmute (overrides global) > project-mute > global-mute.
# The receiver is authoritative and applies a SAFETY-OR:
#   effective_mute = receiver_local_mute OR forwarded_mute
# so if EITHER side is muted, playback stays silent. We forward this as a
# STRING ("true"/"false") — the receiver does a plain string compare, and it
# keeps the JSON boolean out of python's "True"/"False" capitalization.
# ---------------------------------------------------------------------------
_GLOBAL_MUTE_FILE="$HOME/.agentvibes-muted"
_PROJECT_MUTE_FILE="$_RESOLVE_PROJECT_DIR/.claude/agentvibes-muted"
_PROJECT_UNMUTE_FILE="$_RESOLVE_PROJECT_DIR/.claude/agentvibes-unmuted"
MUTE="false"
if [[ -f "$_PROJECT_UNMUTE_FILE" ]]; then
  MUTE="false"                       # project explicitly unmuted overrides global
elif [[ -f "$_PROJECT_MUTE_FILE" ]]; then
  MUTE="true"
elif [[ -f "$_GLOBAL_MUTE_FILE" ]]; then
  MUTE="true"
fi

# ---------------------------------------------------------------------------
# Resolve LANGUAGE to forward (map §D 'language | Forward on SSH', R18).
# Precedence mirrors the local chain (learn-manager.sh / language-manager.sh):
#   learning-mode target (tts-target-language.txt when tts-learn-mode.txt=="ON")
#   > tts-language.txt.
# Forwarded as a DEFAULT only — the receiver stays authoritative and its own
# language config (if any) wins. language-manager.sh stores tts-language.txt at
# the .claude/ root; the resolver contract tests use the .claude/config/ subdir,
# so we accept both. Project scope wins over the global home fallback.
# ---------------------------------------------------------------------------
LANGUAGE=""
for _cdir in "$_RESOLVE_PROJECT_DIR/.claude" "$HOME/.claude"; do
  # Priority 1: learning-mode target language (only when learn mode is ON).
  if [[ -z "$LANGUAGE" && -f "$_cdir/tts-learn-mode.txt" ]]; then
    if [[ "$(cat "$_cdir/tts-learn-mode.txt" 2>/dev/null || true)" == "ON" ]]; then
      [[ -f "$_cdir/tts-target-language.txt" ]] && \
        LANGUAGE=$(cat "$_cdir/tts-target-language.txt" 2>/dev/null || true)
    fi
  fi
  # Priority 2: tts-language.txt (root or config/ subdir).
  if [[ -z "$LANGUAGE" && -f "$_cdir/tts-language.txt" ]]; then
    LANGUAGE=$(cat "$_cdir/tts-language.txt" 2>/dev/null || true)
  fi
  if [[ -z "$LANGUAGE" && -f "$_cdir/config/tts-language.txt" ]]; then
    LANGUAGE=$(cat "$_cdir/config/tts-language.txt" 2>/dev/null || true)
  fi
  [[ -n "$LANGUAGE" ]] && break
done
# Trim surrounding whitespace
LANGUAGE="${LANGUAGE#"${LANGUAGE%%[![:space:]]*}"}"
LANGUAGE="${LANGUAGE%"${LANGUAGE##*[![:space:]]}"}"
# SECURITY: only forward a plain language name (letters, spaces, hyphen); jq
# --arg escapes anyway, but reject odd values rather than propagate them.
if [[ -n "$LANGUAGE" ]] && [[ ! "$LANGUAGE" =~ ^[a-zA-Z][a-zA-Z\ -]*$ ]]; then
  LANGUAGE=""
fi

# ---------------------------------------------------------------------------
# Build JSON payload
# ---------------------------------------------------------------------------

# SECURITY: Use jq if available for safe JSON construction, else manual escaping
build_json_payload() {
  if command -v jq &>/dev/null; then
    jq -n \
      --arg text "$TEXT" \
      --arg voice "$VOICE" \
      --arg effects "$SOX_EFFECTS" \
      --arg music "$BG_FILE" \
      --arg volume "$BG_VOLUME" \
      --arg project "$PROJECT_NAME" \
      --arg projectPath "$PROJECT_PATH" \
      --arg pretext "$PRETEXT" \
      --arg speed "$SPEED" \
      --arg provider "$PROVIDER" \
      --arg llm "$LLM_NAME" \
      --arg mute "$MUTE" \
      --arg language "$LANGUAGE" \
      --arg kind "$PAYLOAD_KIND" \
      '{text: $text, voice: $voice, effects: $effects, music: $music, volume: $volume, project: $project, projectPath: $projectPath, pretext: $pretext, speed: $speed, provider: $provider, llm: $llm, mute: $mute, language: $language, kind: $kind}'
  else
    # Manual JSON — escape backslashes, quotes, control chars
    local escaped_text
    escaped_text=$(printf '%s' "$TEXT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ' | sed 's/\r//g')
    local escaped_pretext
    escaped_pretext=$(printf '%s' "$PRETEXT" | sed 's/\\/\\\\/g; s/"/\\"/g')
    local escaped_project_path
    escaped_project_path=$(printf '%s' "$PROJECT_PATH" | sed 's/\\/\\\\/g; s/"/\\"/g')
    printf '{"text":"%s","voice":"%s","effects":"%s","music":"%s","volume":"%s","project":"%s","projectPath":"%s","pretext":"%s","speed":"%s","provider":"%s","llm":"%s","mute":"%s","language":"%s","kind":"%s"}' \
      "$escaped_text" "$VOICE" "$SOX_EFFECTS" "$BG_FILE" "$BG_VOLUME" "$PROJECT_NAME" "$escaped_project_path" "$escaped_pretext" "$SPEED" "$PROVIDER" "$LLM_NAME" "$MUTE" "$LANGUAGE" "$PAYLOAD_KIND"
  fi
}

# Music-only preview: force the track as the "music" field (overriding any
# per-LLM/agent background-music config) so the receiver plays exactly this track.
if [[ "$PAYLOAD_KIND" == "music" ]]; then
  BG_FILE="$MUSIC_ONLY_TRACK"
fi

JSON_PAYLOAD=$(build_json_payload)

# SECURITY: Base64-encode entire payload — safe for SSH transport
# base64 -w 0 is Linux (GNU coreutils), -b 0 is macOS (BSD)
if base64 --help 2>&1 | grep -q '\-w'; then
  ENCODED_PAYLOAD=$(printf '%s' "$JSON_PAYLOAD" | base64 -w 0)
else
  ENCODED_PAYLOAD=$(printf '%s' "$JSON_PAYLOAD" | base64 -b 0 2>/dev/null || printf '%s' "$JSON_PAYLOAD" | base64 | tr -d '\n')
fi

# ---------------------------------------------------------------------------
# Send to receiver via SSH (fire and forget — backgrounded)
# ---------------------------------------------------------------------------

# In test mode, dump the decoded payload to stdout so tests can inspect it
# without needing a real SSH connection or a mock binary.
if [[ "${AGENTVIBES_TEST_MODE:-false}" == "true" ]]; then
  echo "$JSON_PAYLOAD"
  exit 0
fi

echo "Sending to $SSH_HOST..." >&2

# Build SSH args — use explicit key/port from config if available, else rely on ~/.ssh/config
SSH_ARGS=()
[[ -n "$SSH_KEY"  && -f "$SSH_KEY"  ]] && SSH_ARGS+=(-i "$SSH_KEY")
# Only pass -p for an explicit, non-default port.  Port 22 is ssh's universal
# default, so forcing "-p 22" is at best a no-op and at worst overrides the
# real port of an ~/.ssh/config Host alias (e.g. my-laptop -> Port 2222),
# silently delivering the payload to the wrong port.  Empty or "22" means
# "use ssh / ~/.ssh/config defaults" -- never force it.
if [[ -n "$SSH_PORT" && "$SSH_PORT" != "22" ]]; then SSH_ARGS+=(-p "$SSH_PORT"); fi

# ForceCommand receiver: SSH_ORIGINAL_COMMAND passes the payload directly.
# Run ssh inside the backgrounded subshell so its exit code is reachable via $?
# (a `wait` from outside the spawning shell would error: "pid X is not a child").
(
  ssh -o ConnectTimeout=10 "${SSH_ARGS[@]}" "$SSH_HOST" "$ENCODED_PAYLOAD"
  _exit=$?
  if [[ $_exit -ne 0 ]]; then
    echo "$(date -Iseconds) [ERROR] SSH to $SSH_HOST failed (exit $_exit)" \
      >> "$HOME/.agentvibes/ssh-remote.log" 2>/dev/null || true
  fi
) &
SSH_PID=$!

echo "Sent to $SSH_HOST (PID: $SSH_PID)" >&2
exit 0
