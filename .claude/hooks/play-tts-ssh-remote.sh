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

# Validate required input
if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 <text> [voice] [agent_name]" >&2
  exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Derive project name from directory
PROJECT_NAME=$(basename "$PROJECT_ROOT")

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
  SSH_PORT="${AGENTVIBES_SSH_PORT:-22}"
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

# SECURITY: Validate SSH_HOST format (hostname, IP, or ~/.ssh/config alias)
if [[ ! "$SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]; then
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
BG_VOLUME="0.10"

EFFECTS_CFG="$PROJECT_ROOT/.claude/config/audio-effects.cfg"
if [[ -f "$EFFECTS_CFG" ]]; then
  CONFIG_LINE=$(grep "^${AGENT_NAME}|" "$EFFECTS_CFG" 2>/dev/null || \
                grep "^default|" "$EFFECTS_CFG" 2>/dev/null || true)
  if [[ -n "$CONFIG_LINE" ]]; then
    IFS='|' read -r _ SOX_EFFECTS BG_FILE BG_VOLUME <<< "$CONFIG_LINE"
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

# Build config search path: CLAUDE_PROJECT_DIR first (the actual user project,
# even when hooks run from the package dir), then PROJECT_ROOT (may be the
# same or the package dir), then global home fallback.
_llm_cfg_paths=()
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && "$CLAUDE_PROJECT_DIR" != "$PROJECT_ROOT" ]]; then
  _llm_cfg_paths+=("$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg")
fi
_llm_cfg_paths+=("$PROJECT_ROOT/.claude/config/audio-effects.cfg" "$HOME/.claude/config/audio-effects.cfg")

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
[[ -n "$LLM_BG_FILE"   ]] && BG_FILE="$LLM_BG_FILE"
[[ -n "$LLM_BG_VOLUME" ]] && BG_VOLUME="$LLM_BG_VOLUME"

# Read pretext if configured
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
  piper|soprano|macos|windows-sapi) ;;
  *) PROVIDER="piper" ;;
esac

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
      --arg pretext "$PRETEXT" \
      --arg speed "$SPEED" \
      --arg provider "$PROVIDER" \
      --arg llm "$LLM_NAME" \
      '{text: $text, voice: $voice, effects: $effects, music: $music, volume: $volume, project: $project, pretext: $pretext, speed: $speed, provider: $provider, llm: $llm}'
  else
    # Manual JSON — escape double quotes and backslashes in text
    local escaped_text
    escaped_text=$(printf '%s' "$TEXT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g')
    local escaped_pretext
    escaped_pretext=$(printf '%s' "$PRETEXT" | sed 's/\\/\\\\/g; s/"/\\"/g')
    printf '{"text":"%s","voice":"%s","effects":"%s","music":"%s","volume":"%s","project":"%s","pretext":"%s","speed":"%s","provider":"%s","llm":"%s"}' \
      "$escaped_text" "$VOICE" "$SOX_EFFECTS" "$BG_FILE" "$BG_VOLUME" "$PROJECT_NAME" "$escaped_pretext" "$SPEED" "$PROVIDER" "$LLM_NAME"
  fi
}

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

echo "Sending to $SSH_HOST..." >&2

# Build SSH args — use explicit key/port from config if available, else rely on ~/.ssh/config
SSH_ARGS=()
[[ -n "$SSH_KEY"  && -f "$SSH_KEY"  ]] && SSH_ARGS+=(-i "$SSH_KEY")
[[ -n "$SSH_PORT" ]] && SSH_ARGS+=(-p "$SSH_PORT")

# ForceCommand receiver: SSH_ORIGINAL_COMMAND passes the payload directly
ssh "${SSH_ARGS[@]}" "$SSH_HOST" "$ENCODED_PAYLOAD" &
SSH_PID=$!

echo "Sent to $SSH_HOST (PID: $SSH_PID)" >&2
exit 0
