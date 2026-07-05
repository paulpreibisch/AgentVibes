#!/usr/bin/env bash
#
# File: .claude/hooks/play-tts.sh
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose and noninfringement.
# In no event shall the authors or copyright holders be liable for any claim,
# damages or other liability, whether in an action of contract, tort or
# otherwise, arising from, out of or in connection with the software or the
# use or other dealings in the software.
#
# ---
#
# @fileoverview TTS Provider Router with Translation and Language Learning Support
# @context Routes TTS requests to active provider (Piper or macOS) with optional translation
# @architecture Provider abstraction layer - single entry point for all TTS, handles translation and learning mode
# @dependencies provider-manager.sh, play-tts-piper.sh, translator.py, translate-manager.sh, learn-manager.sh
# @entrypoints Called by hooks, slash commands, personality-manager.sh, and all TTS features
# @patterns Provider pattern - delegates to provider-specific implementations, auto-detects provider from voice name
# @related provider-manager.sh, play-tts-piper.sh, learn-manager.sh, translate-manager.sh
#
# **IMPORTANT: This script should be called inline (NOT in background) in Bash tool**
# Wait for TTS playback to complete before continuing.
# Example: Bash: .claude/hooks/play-tts.sh "Acknowledging task start"
#

set -euo pipefail

# Fix locale warnings
export LC_ALL=C

# Get script directory - handle symlinks correctly with readlink -f
# This resolves: symlinks, relative paths, and working directory changes
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

# Find PROJECT_ROOT by searching up the directory tree for .claude/hooks
# This handles non-standard installations and directory structures
PROJECT_ROOT="$SCRIPT_DIR"
_search_depth=0
while [[ "$PROJECT_ROOT" != "/" && "$PROJECT_ROOT" != "$(dirname "$PROJECT_ROOT")" && $_search_depth -lt 20 ]]; do
  if [[ -d "$PROJECT_ROOT/.claude/hooks" ]]; then
    break  # PROJECT_ROOT is already the project root when its .claude/hooks child exists
  fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
  _search_depth=$(( _search_depth + 1 ))
done
unset _search_depth

# Verify PROJECT_ROOT is valid
if [[ ! -d "$PROJECT_ROOT/.claude/hooks" ]]; then
  echo "❌ ERROR: Could not find AgentVibes .claude/hooks directory" >&2
  echo "   Script path: $SCRIPT_PATH" >&2
  echo "   Searched up from: $SCRIPT_DIR" >&2
  exit 1
fi

export PROJECT_ROOT  # Export for child scripts

# Suppress audio when tests are running in a separate shell.
# AGENTVIBES_TEST_MODE only propagates to child processes of the test runner;
# external callers (e.g. Claude Code hooks) don't inherit it.
# scripts/run-tests.sh writes this marker file so all play-tts.sh invocations —
# regardless of which process spawns them — stay silent during test runs.
if [[ -f "${HOME}/.agentvibes-tests-running" ]]; then
  exit 0
fi

# Check if muted (persists across sessions)
# Project settings always override global settings:
# - .claude/agentvibes-unmuted = project explicitly unmuted (overrides global mute)
# - .claude/agentvibes-muted = project muted (overrides global unmute)
# - ~/.agentvibes-muted = global mute (only if no project-level setting)
GLOBAL_MUTE_FILE="$HOME/.agentvibes-muted"
PROJECT_MUTE_FILE="$PROJECT_ROOT/.claude/agentvibes-muted"
PROJECT_UNMUTE_FILE="$PROJECT_ROOT/.claude/agentvibes-unmuted"

# Check project-level settings first (project overrides global)
if [[ -f "$PROJECT_UNMUTE_FILE" ]]; then
  # Project explicitly unmuted - ignore global mute
  :  # Continue (do nothing, will not exit)
elif [[ -f "$PROJECT_MUTE_FILE" ]]; then
  # Project explicitly muted
  if [[ -f "$GLOBAL_MUTE_FILE" ]]; then
    echo "🔇 TTS muted (project + global)" >&2
  else
    echo "🔇 TTS muted (project)" >&2
  fi
  exit 0
elif [[ -f "$GLOBAL_MUTE_FILE" ]]; then
  # Global mute and no project-level override
  echo "🔇 TTS muted (global)" >&2
  exit 0
fi

# Parse named flags (e.g. --llm) before positional arguments.
# This allows callers to pass: play-tts.sh --llm claude-code "text to speak"
# Named args are extracted; remaining positional args are shifted into $1/$2/$3.
LLM_PROVIDER="${LLM_PROVIDER:-}"
_POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --llm)
      LLM_PROVIDER="${2:-}"
      shift 2
      ;;
    --project-dir)
      # Always prefer the explicitly-injected project dir over any stale
      # CLAUDE_PROJECT_DIR in the environment (fixes silent override by env).
      # Validate the path exists before trusting it.
      if [[ -n "${2:-}" && -d "${2}" ]]; then
        export CLAUDE_PROJECT_DIR="${2}"
      fi
      shift 2
      ;;
    *)
      _POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done
set -- "${_POSITIONAL_ARGS[@]+"${_POSITIONAL_ARGS[@]}"}"
unset _POSITIONAL_ARGS

TEXT="${1:-}"
VOICE_OVERRIDE="${2:-}"  # Optional: voice name or ID
AGENT_PROFILE_FILE="${3:-}"  # Optional: path to agent profile file
_ORIG_EXPLICIT_VOICE="$VOICE_OVERRIDE"  # raw positional voice, before any per-LLM override (fed to the resolver as the explicit voice)

# Security: Validate inputs
if [[ -z "$TEXT" ]]; then
  echo "Error: No text provided" >&2
  exit 1
fi

# Security: Validate voice override (allowlist — only safe chars for voice IDs)
if [[ -n "$VOICE_OVERRIDE" ]] && [[ ! "$VOICE_OVERRIDE" =~ ^[a-zA-Z0-9_:./\ -]+$ ]]; then
  echo "Error: Invalid characters in voice parameter" >&2
  exit 1
fi

# Remove backslash escaping that Claude might add for SAFE special chars only
# SECURITY: Only unescape punctuation chars that cannot form shell commands (#127)
# Never unescape $, `, \, or other shell metacharacters
TEXT="${TEXT//\\!/!}"        # Remove \!
TEXT="${TEXT//\\?/?}"        # Remove \?
TEXT="${TEXT//\\,/,}"        # Remove \,
TEXT="${TEXT//\\./.}"        # Remove \. (keep the period)

# When no --llm is supplied, route through the "default" pseudo-LLM so the
# user-managed `llm:default` row in audio-effects.cfg becomes the global
# fallback for voice / pretext / music / effects.  This is configured via
# Setup → Default → Configure in the TUI.  If `llm:default` doesn't exist,
# the lookup returns empty and the script falls through to the legacy
# global config chain (project / user .agentvibes/config.json).
if [[ -z "$LLM_PROVIDER" ]]; then
  LLM_PROVIDER="default"
fi

# Per-LLM config lookup: if --llm is passed, look up llm:<name> in audio-effects.cfg
# Format: llm:<name>|REVERB_PRESET|BACKGROUND_FILE|BACKGROUND_VOLUME|VOICE|PRETEXT
_LLM_VOICE=""
_LLM_PRETEXT=""
_LLM_ENGINE=""
if [[ -n "$LLM_PROVIDER" ]]; then
  _llm_key="llm:${LLM_PROVIDER}"
  # Search order: CLAUDE_PROJECT_DIR (actual user project, may differ from
  # PROJECT_ROOT when hooks run from the package dir), then PROJECT_ROOT,
  # then global home fallback.
  _llm_cfg_paths=()
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" && "$CLAUDE_PROJECT_DIR" != "$PROJECT_ROOT" ]]; then
    _llm_cfg_paths+=("$CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg")
  fi
  _llm_cfg_paths+=("$PROJECT_ROOT/.claude/config/audio-effects.cfg" "$HOME/.claude/config/audio-effects.cfg")
  for _cfg in "${_llm_cfg_paths[@]}"; do
    if [[ -z "$_LLM_VOICE" && -z "$_LLM_PRETEXT" && -f "$_cfg" ]]; then
      while IFS='|' read -r _key _reverb _bgfile _bgvol _voice _pretext _engine _rest; do
        if [[ "$_key" == "$_llm_key" ]]; then
          _voice="${_voice## }"; _voice="${_voice%% }"
          _pretext="${_pretext## }"; _pretext="${_pretext%% }"
          _engine="${_engine## }"; _engine="${_engine%% }"
          [[ -n "$_voice" ]] && _LLM_VOICE="$_voice"
          [[ -n "$_pretext" ]] && _LLM_PRETEXT="$_pretext"
          [[ -n "$_engine" ]] && _LLM_ENGINE="$_engine"
          break
        fi
      done < "$_cfg"
    fi
  done
  # Apply LLM voice (only if no explicit voice override, and not in effects-preview mode)
  if [[ -n "$_LLM_VOICE" && -z "$VOICE_OVERRIDE" && -z "${AGENTVIBES_EFFECTS_PREVIEW:-}" ]]; then
    VOICE_OVERRIDE="$_LLM_VOICE"
  fi
  # Export LLM key for child scripts (process-local, not system-wide)
  export AGENTVIBES_LLM_KEY="llm:${LLM_PROVIDER}"
  # Emit routing info when verbose debugging is enabled (used by tests and diagnostics)
  if [[ "${AGENTVIBES_VERBOSE:-0}" == "1" ]]; then
    echo "llm=${LLM_PROVIDER}" >&2
  fi
fi

# Prepend intro text (pretext) if configured
# Priority: LLM-specific pretext → project .agentvibes/config.json → project .claude/config
#           → global ~/.agentvibes/config.json → global ~/.claude/config
_PRETEXT="$_LLM_PRETEXT"
if [[ -z "$_PRETEXT" ]]; then
  for _src in \
    "$PROJECT_ROOT/.agentvibes/config.json" \
    "$PROJECT_ROOT/.claude/config/tts-pretext.txt" \
    "$PROJECT_ROOT/.claude/config/intro-text.txt" \
    "$HOME/.agentvibes/config.json" \
    "$HOME/.claude/config/tts-pretext.txt" \
    "$HOME/.claude/config/intro-text.txt"; do
    if [[ -z "$_PRETEXT" && -f "$_src" ]]; then
      if [[ "$_src" == *.json ]]; then
        # Extract pretext from JSON (lightweight — no jq dependency)
        _PRETEXT="$(sed -n 's/.*"pretext"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$_src" 2>/dev/null | head -1)"
      else
        _PRETEXT="$(head -1 "$_src" 2>/dev/null || true)"
      fi
    fi
  done
fi
if [[ -n "$_PRETEXT" ]]; then
  TEXT="${_PRETEXT}, ${TEXT}"
fi

# ── Utterance Resolver (AVI-S8.5 Stage 2) ────────────────────────────────────
# Single source of truth for the voice + engine decision. Resolve the plan once
# and adopt its voice (per-LLM voice wins over an LLM-echoed override — R2) and,
# below, its local engine (a kokoro-shaped voice forces the kokoro engine on
# Linux too — R1, curing the detect_voice_provider silence bug). FAIL-SAFE: if
# node or the resolver bundle isn't reachable (e.g. an installed ~/.claude that
# predates the bundle-shipping installer change), PLAN_OK stays empty and the
# legacy logic below runs unchanged — TTS never breaks on a missing bridge.
PLAN_OK=""
_RESOLVER_CLI=""
# AGENTVIBES_RESOLVER_CLI lets the installer (or tests) point at the resolver
# bundle when it lives outside the hooks tree — e.g. an installed ~/.claude/hooks
# whose sibling package dir holds bin/resolve-utterance.js.
# Candidate order: explicit env override; the installed dedicated bundle dir
# (has its own package.json so ESM works on every Node version — F-5); the repo
# layout (dev); a co-located copy.
for _cand in "${AGENTVIBES_RESOLVER_CLI:-}" \
             "$SCRIPT_DIR/../agentvibes-resolver/bin/resolve-utterance.js" \
             "$SCRIPT_DIR/../../bin/resolve-utterance.js" \
             "$SCRIPT_DIR/resolve-utterance.js"; do
  [[ -n "$_cand" && -f "$_cand" ]] && { _RESOLVER_CLI="$_cand"; break; }
done
if [[ -n "$_RESOLVER_CLI" ]] && command -v node &>/dev/null; then
  # Voice provenance (F-1): a per-agent profile ($3) is an 'agent-profile' voice
  # (BMAD party mode — each agent its OWN voice, must not be demoted to the
  # per-LLM/default voice); a caller may declare provenance via
  # AGENTVIBES_VOICE_SOURCE (e.g. MCP text_to_speech → 'user-explicit'); the
  # voice-browser sets 'audition'; otherwise it's an 'llm-echo' (the LLM parroting
  # back get_config, which the per-LLM row rightly overrides — R2).
  _vsource="${AGENTVIBES_VOICE_SOURCE:-llm-echo}"
  # Whitelist the provenance — an unknown value falls back to llm-echo (safe default).
  case "$_vsource" in
    llm-echo|user-explicit|agent-profile|translation-target|audition) ;;
    *) _vsource="llm-echo" ;;
  esac
  # A per-agent profile ($3) also implies agent-profile provenance (belt-and-suspenders
  # with bmad-speak.sh's explicit AGENTVIBES_VOICE_SOURCE export).
  [[ -n "${AGENT_PROFILE_FILE:-}" && "$_vsource" == "llm-echo" ]] && _vsource="agent-profile"
  [[ -n "${AGENTVIBES_EFFECTS_PREVIEW:-}" ]] && _vsource="audition"
  # `timeout 5` caps a wedged bridge so the fail-safe promise ("TTS never breaks
  # on the bridge") also covers a hung node, not just a missing one.
  _av_timeout="timeout 5"; command -v timeout &>/dev/null || _av_timeout=""
  if _plan_sh=$($_av_timeout node "$_RESOLVER_CLI" --format sh \
        --text "$TEXT" \
        --llm "$LLM_PROVIDER" \
        --voice "$_ORIG_EXPLICIT_VOICE" \
        --voice-source "$_vsource" \
        --project-dir "${CLAUDE_PROJECT_DIR:-$PROJECT_ROOT}" \
        --package-root "$PROJECT_ROOT" 2>/dev/null); then
    # Guard the eval: a malformed OR EMPTY plan must fall back to legacy, never
    # abort the script mid-run under `set -euo pipefail`. `eval ""` succeeds with
    # no AV_* vars set, which would falsely set PLAN_OK — so require non-empty
    # output AND a field that is ALWAYS present in a valid plan. AV_TRANSPORT is
    # always 'local' or a transport name (never empty), unlike AV_ENGINE which is
    # legitimately empty on a remote plan (F-7).
    if [[ -n "$_plan_sh" ]] && eval "$_plan_sh" 2>/dev/null && [[ -n "${AV_TRANSPORT:-}" ]]; then   # AV_* shell-quoted, safe
      PLAN_OK=1
      # Adopt the voice into VOICE_OVERRIDE ONLY when it's a real override
      # (F-2): a plain provider-file voice is left for play-tts-piper.sh's own
      # file+model+speaker-id resolution (adopting it as an explicit override
      # skips the multi-speaker lookup and plays speaker 0). Engine coupling (R1)
      # still applies below regardless.
      if [[ "${AV_VOICE_IS_OVERRIDE:-false}" == "true" && -n "${AV_VOICE:-}" ]]; then
        VOICE_OVERRIDE="$AV_VOICE"
      fi
    fi
  fi
fi

# Source provider manager to get active provider
source "$SCRIPT_DIR/provider-manager.sh"

# Get active provider.
# Per-LLM engine (from audio-effects.cfg `llm:<key>` row column 7) overrides
# the global tts-provider.txt — UNLESS the global is a transport provider
# (ssh-remote, agentvibes-receiver, termux-ssh).  Transport providers
# forward TTS to a remote receiver which picks its OWN engine; overriding
# them with a local engine like piper would synthesize on the wrong host.
ACTIVE_PROVIDER=$(get_active_provider)
case "$ACTIVE_PROVIDER" in
  ssh-remote|agentvibes-receiver|termux-ssh)
    # Transport — keep it.  The receiver's audio-effects.cfg picks the engine.
    ;;
  *)
    if [[ -n "$_LLM_ENGINE" ]]; then
      ACTIVE_PROVIDER="$_LLM_ENGINE"
    fi
    ;;
esac

# AGENTVIBES_FORCE_PROVIDER: set by agentvibes-receiver.sh to honour the
# provider field in the incoming JSON payload (e.g. kokoro, elevenlabs).
# Only applies when the locally-configured provider is still the default "piper"
# so a receiver that has tts-provider.txt set keeps its own preference.
if [[ -n "${AGENTVIBES_FORCE_PROVIDER:-}" && "$ACTIVE_PROVIDER" == "piper" ]]; then
  case "$AGENTVIBES_FORCE_PROVIDER" in
    piper|soprano|macos|windows-sapi|kokoro|elevenlabs)
      ACTIVE_PROVIDER="$AGENTVIBES_FORCE_PROVIDER" ;;
  esac
fi

# Per-LLM SSH override: if the current LLM has mode=remote in transport-config.json,
# write a one-shot env override so play-tts-ssh-remote.sh uses that LLM's SSH config.
_TRANSPORT_CFG="$HOME/.agentvibes/transport-config.json"
if [[ "$ACTIVE_PROVIDER" != "ssh-remote" && "$ACTIVE_PROVIDER" != "agentvibes-receiver" && "$ACTIVE_PROVIDER" != "termux-ssh" ]] \
   && [[ -n "$LLM_PROVIDER" && "$LLM_PROVIDER" != "default" ]] \
   && [[ -f "$_TRANSPORT_CFG" ]] && command -v python3 &>/dev/null; then
  _LLM_SSH_MODE=$(AGENTVIBES_CFG="$_TRANSPORT_CFG" AGENTVIBES_KEY="$LLM_PROVIDER" python3 - <<'PYEOF'
import json, os, sys
try:
    d = json.load(open(os.environ['AGENTVIBES_CFG'], encoding='utf-8'))
    print(d.get(os.environ['AGENTVIBES_KEY'], {}).get('mode', 'local'))
except Exception:
    print('local')
PYEOF
)
  if [[ "$_LLM_SSH_MODE" == "remote" ]]; then
    # Redirect this LLM's audio through ssh-remote using its own SSH config
    _llm_remote_data=$(AGENTVIBES_CFG="$_TRANSPORT_CFG" AGENTVIBES_KEY="$LLM_PROVIDER" python3 - <<'PYEOF'
import json, os, sys
try:
    d = json.load(open(os.environ['AGENTVIBES_CFG'], encoding='utf-8'))
    p = d.get(os.environ['AGENTVIBES_KEY'], {})
    print(p.get('host', ''))
    print(p.get('sshKey', ''))
    print(p.get('port', '22'))
except Exception:
    print('')
    print('')
    print('22')
PYEOF
)
    _LLM_SSH_HOST=$(echo "$_llm_remote_data" | sed -n '1p')
    _LLM_SSH_KEY=$(echo  "$_llm_remote_data" | sed -n '2p')
    _LLM_SSH_PORT=$(echo "$_llm_remote_data" | sed -n '3p')
    if [[ -n "$_LLM_SSH_HOST" ]]; then
      # Override transport config env vars so play-tts-ssh-remote.sh picks up this LLM's SSH settings
      export AGENTVIBES_SSH_HOST="$_LLM_SSH_HOST"
      export AGENTVIBES_SSH_KEY="$_LLM_SSH_KEY"
      export AGENTVIBES_SSH_PORT="$_LLM_SSH_PORT"
      ACTIVE_PROVIDER="ssh-remote"
    fi
  fi
fi

# Adopt the resolver's engine for LOCAL playback (AVI-S8.5 Stage 2): this cures
# the kokoro/piper voice→engine coupling (R1) and normalizes engine aliases,
# replacing the detect_voice_provider heuristic below. Transports are left
# untouched — the plan forwards the voice and the receiver picks its own engine.
if [[ -n "$PLAN_OK" ]]; then
  case "$ACTIVE_PROVIDER" in
    ssh-remote|agentvibes-receiver|termux-ssh) : ;;   # transport — keep it
    *) [[ -n "${AV_ENGINE:-}" ]] && ACTIVE_PROVIDER="$AV_ENGINE" ;;
  esac
fi

# Show GitHub star reminder (once per day)
bash "$SCRIPT_DIR/github-star-reminder.sh" 2>/dev/null || true

# @function detect_voice_provider
# @intent Auto-detect provider from voice name (for mixed-provider support)
# @why Allow Piper for main language + macOS for target language
# @param $1 voice name/ID
# @returns Provider name (piper or macos)
detect_voice_provider() {
  local voice="$1"
  # Piper voice names contain underscore and dash (e.g., es_ES-davefx-medium)
  if [[ "$voice" == *"_"*"-"* ]]; then
    echo "piper"
  else
    echo "$ACTIVE_PROVIDER"
  fi
}

# Legacy mixed-provider heuristic — ONLY on the fallback path (no resolver plan).
# When PLAN_OK is set, the resolver already coupled voice→engine correctly above
# (including kokoro, which this heuristic misses — the R1 silence bug), so skip it.
if [[ -z "$PLAN_OK" && -n "$VOICE_OVERRIDE" ]]; then
  case "$ACTIVE_PROVIDER" in
    ssh-remote|agentvibes-receiver|termux-ssh)
      # Transport provider — don't override, voice info is forwarded to receiver
      ;;
    *)
      DETECTED_PROVIDER=$(detect_voice_provider "$VOICE_OVERRIDE")
      if [[ "$DETECTED_PROVIDER" != "$ACTIVE_PROVIDER" ]]; then
        ACTIVE_PROVIDER="$DETECTED_PROVIDER"
      fi
      ;;
  esac
fi

# Emit resolved voice and provider in verbose mode (used by tests and diagnostics)
if [[ "${AGENTVIBES_VERBOSE:-0}" == "1" ]]; then
  [[ -n "${VOICE_OVERRIDE:-}" ]] && echo "voice=${VOICE_OVERRIDE}" >&2
  echo "provider=${ACTIVE_PROVIDER}" >&2
fi

# @function _play_windows_sapi
# @intent Speak via the built-in Windows SAPI engine from a POSIX shell
# @why On Windows git-bash the `sapi`/`windows-sapi` provider has no native bash
#      player; delegate to the PowerShell SAPI script so the engine selector's
#      `sapi` id no longer dead-ends in "Unknown provider".
# @param $1 text to speak
# @param $2 voice override (optional)
_play_windows_sapi() {
  local text="$1"
  local voice="${2:-}"

  # Sibling hooks-windows/ holds the PowerShell players. Prefer the short name,
  # fall back to the legacy windows-prefixed one.
  local ps1="$SCRIPT_DIR/../hooks-windows/play-tts-sapi.ps1"
  [[ -f "$ps1" ]] || ps1="$SCRIPT_DIR/../hooks-windows/play-tts-windows-sapi.ps1"
  if [[ ! -f "$ps1" ]]; then
    echo "❌ Windows SAPI player not found beside this hook" >&2
    return 1
  fi

  local ps_exe=""
  local c
  for c in powershell.exe pwsh.exe powershell pwsh; do
    if command -v "$c" >/dev/null 2>&1; then ps_exe="$c"; break; fi
  done
  if [[ -z "$ps_exe" ]]; then
    echo "❌ Windows SAPI requires PowerShell (Windows only)" >&2
    return 1
  fi

  # PowerShell needs a native Windows path, not a /c/... MSYS path.
  local win_ps1="$ps1"
  command -v cygpath >/dev/null 2>&1 && win_ps1="$(cygpath -w "$ps1")"

  "$ps_exe" -NoProfile -ExecutionPolicy Bypass -File "$win_ps1" "$text" "$voice"
}

# @function speak_text
# @intent Route text to appropriate TTS provider
# @why Reusable function for speaking, used by both single and learning modes
# @param $1 text to speak
# @param $2 voice override (optional)
# @param $3 provider override (optional)
speak_text() {
  local text="$1"
  local voice="${2:-}"
  local provider="${3:-$ACTIVE_PROVIDER}"
  local profile_file="${4:-$AGENT_PROFILE_FILE}"

  case "$provider" in
    piper)
      bash "$SCRIPT_DIR/play-tts-piper.sh" "$text" "$voice" "$profile_file"
      ;;
    soprano)
      bash "$SCRIPT_DIR/play-tts-soprano.sh" "$text" "$voice"
      ;;
    macos)
      bash "$SCRIPT_DIR/play-tts-macos.sh" "$text" "$voice"
      ;;
    elevenlabs)
      bash "$SCRIPT_DIR/play-tts-elevenlabs.sh" "$text" "$voice"
      ;;
    kokoro)
      bash "$SCRIPT_DIR/play-tts-kokoro.sh" "$text" "$voice"
      ;;
    sapi|windows-sapi)
      _play_windows_sapi "$text" "$voice"
      ;;
    termux-ssh)
      bash "$SCRIPT_DIR/play-tts-termux-ssh.sh" "$text" "$voice"
      ;;
    ssh-remote|agentvibes-receiver)
      # Both route through the base64-JSON sender that the modern receiver
      # (templates/agentvibes-receiver.ps1 / .sh, installed as play-remote.*)
      # understands. The old voiceless-connections sender spoke a 3-positional-arg
      # protocol for a legacy ~/.agentvibes/play-remote.sh receiver that no current
      # receiver install produces, so it delivered a non-base64 command the modern
      # receiver rejects ("Payload must be base64-encoded"). play-tts-ssh-remote.sh
      # resolves the host from any transport-config mode=remote entry (Priority 2b),
      # so the agentvibes-receiver section is found without an ssh-remote section.
      bash "$SCRIPT_DIR/play-tts-ssh-remote.sh" "$text" "$voice" "" "${profile_file:-}"
      ;;
    *)
      echo "❌ Unknown provider: $provider" >&2
      return 1
      ;;
  esac
}

# Note: learn-manager.sh and translate-manager.sh are sourced inside their
# respective handler functions to avoid triggering their main handlers

# @function handle_learning_mode
# @intent Speak in both main language and target language for learning
# @why Issue #51 - Auto-translate and speak twice for immersive language learning
# @returns 0 if learning mode handled, 1 if not in learning mode
handle_learning_mode() {
  # Source learn-manager for learning mode functions
  source "$SCRIPT_DIR/learn-manager.sh" 2>/dev/null || return 1

  # Check if learning mode is enabled
  if ! is_learn_mode_enabled 2>/dev/null; then
    return 1
  fi

  local target_lang
  target_lang=$(get_target_language 2>/dev/null || echo "")
  local target_voice
  target_voice=$(get_target_voice 2>/dev/null || echo "")

  # Need both target language and voice for learning mode
  if [[ -z "$target_lang" ]] || [[ -z "$target_voice" ]]; then
    return 1
  fi

  # 1. Speak in main language (current voice)
  speak_text "$TEXT" "$VOICE_OVERRIDE" "$ACTIVE_PROVIDER"

  # 2. Auto-translate to target language
  local translated
  # SECURITY: Add timeout to prevent hanging (#134)
  translated=$(timeout 5 python3 "$SCRIPT_DIR/translator.py" "$TEXT" "$target_lang" 2>/dev/null) || translated="$TEXT"

  # Small pause between languages
  sleep 0.5

  # 3. Speak translated text with target voice
  local target_provider
  target_provider=$(detect_voice_provider "$target_voice")
  speak_text "$translated" "$target_voice" "$target_provider"

  return 0
}

# @function handle_translation_mode
# @intent Translate and speak in target language (non-learning mode)
# @why Issue #50 - BMAD multi-language TTS support
# @returns 0 if translation handled, 1 if not translating
handle_translation_mode() {
  # Source translate-manager to get translation settings
  source "$SCRIPT_DIR/translate-manager.sh" 2>/dev/null || return 1

  # Check if translation is enabled
  if ! is_translation_enabled 2>/dev/null; then
    return 1
  fi

  local translate_to
  translate_to=$(get_translate_to 2>/dev/null || echo "")

  if [[ -z "$translate_to" ]] || [[ "$translate_to" == "english" ]]; then
    return 1
  fi

  # Translate text
  local translated
  # SECURITY: Add timeout to prevent hanging (#134)
  translated=$(timeout 5 python3 "$SCRIPT_DIR/translator.py" "$TEXT" "$translate_to" 2>/dev/null) || translated="$TEXT"

  # Get voice for target language if no override specified
  local voice_to_use="$VOICE_OVERRIDE"
  if [[ -z "$voice_to_use" ]]; then
    source "$SCRIPT_DIR/language-manager.sh" 2>/dev/null || true
    voice_to_use=$(get_voice_for_language "$translate_to" "$ACTIVE_PROVIDER" 2>/dev/null || echo "")
  fi

  # Update provider if voice indicates different provider
  local provider_to_use="$ACTIVE_PROVIDER"
  if [[ -n "$voice_to_use" ]]; then
    provider_to_use=$(detect_voice_provider "$voice_to_use")
  fi

  # Speak translated text
  speak_text "$translated" "$voice_to_use" "$provider_to_use"
  return 0
}

# Mode priority:
# 1. Learning mode (speaks twice: main + translated)
# 2. Translation mode (speaks translated only)
# 3. Normal mode (speaks as-is)

# Try learning mode first (Issue #51)
if handle_learning_mode; then
  exit 0
fi

# Try translation mode (Issue #50)
if handle_translation_mode; then
  exit 0
fi

# Normal single-language mode - route to appropriate provider implementation
case "$ACTIVE_PROVIDER" in
  piper)
    exec bash "$SCRIPT_DIR/play-tts-piper.sh" "$TEXT" "$VOICE_OVERRIDE" "${AGENT_PROFILE_FILE:-}"
    ;;
  soprano)
    exec bash "$SCRIPT_DIR/play-tts-soprano.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  macos)
    exec bash "$SCRIPT_DIR/play-tts-macos.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  elevenlabs)
    exec bash "$SCRIPT_DIR/play-tts-elevenlabs.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  kokoro)
    exec bash "$SCRIPT_DIR/play-tts-kokoro.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  sapi|windows-sapi)
    _play_windows_sapi "$TEXT" "$VOICE_OVERRIDE"
    exit $?
    ;;
  termux-ssh)
    exec bash "$SCRIPT_DIR/play-tts-termux-ssh.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  ssh-remote|agentvibes-receiver)
    # Both route through the base64-JSON sender the modern receiver understands.
    # The legacy voiceless-connections sender spoke a 3-arg protocol for an old
    # ~/.agentvibes/play-remote.sh receiver that no current install produces, so it
    # delivered a non-base64 command the modern receiver rejects with
    # "Payload must be base64-encoded".
    exec bash "$SCRIPT_DIR/play-tts-ssh-remote.sh" "$TEXT" "$VOICE_OVERRIDE" "" "${AGENT_PROFILE_FILE:-}"
    ;;
  *)
    echo "❌ Unknown provider: $ACTIVE_PROVIDER" >&2
    echo "   Run: /agent-vibes:provider list" >&2
    exit 1
    ;;
esac
