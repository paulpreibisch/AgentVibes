#!/usr/bin/env bash
#
# File: ~/.claude/hooks/bmad-party-speak.sh
#
# AgentVibes PostToolUse Hook - BMAD Party Mode TTS (Linux / macOS / WSL)
#
# Fires after every Agent tool call. Detects BMAD party mode agents by
# fingerprinting the prompt, extracts the agent display name, maps it to
# the canonical agent ID via the manifest, then calls bmad-speak.sh.
# Uses flock for cross-process audio serialization (no overlapping speech).
#
# Installed globally so it works in any BMAD project.
# Uses CLAUDE_PROJECT_DIR env var to locate the project manifest at runtime.
#
# Input: JSON on stdin (Claude Code PostToolUse payload)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/agentvibes-party-queue.lock"
DEBUG_LOG="/tmp/agentvibes-party-debug.log"

_dbg() { printf '[%s] %s\n' "$(date -Iseconds)" "$*" >> "$DEBUG_LOG" 2>/dev/null || true; }

# --- Read stdin ---
raw="$(cat)"
if [[ -z "$raw" ]]; then
    _dbg "exit: empty stdin"
    exit 0
fi
_dbg "fired (stdin ${#raw} bytes)"

# --- Parse all needed fields in one python3 call (fixes M5: 3x subprocess, echo safety) ---
# Outputs: TOOL_NAME|DISPLAY_NAME|RESPONSE_TEXT (newlines in response encoded as \n literals)
parsed="$(printf '%s' "$raw" | python3 - <<'PYEOF'
import sys, json, re

try:
    d = json.load(sys.stdin)
except Exception:
    print("|||")
    sys.exit(0)

tool_name = d.get('tool_name', '')
prompt = d.get('tool_input', {}).get('prompt', '')

# Extract display name — safe alternative to grep -oP (fixes C2: macOS BSD grep no -P)
display_name = ''
m = re.search(r'You are ([A-Za-z]+)\s*\(', prompt)
if m:
    display_name = m.group(1)

# Extract response text
response_text = ''
for item in d.get('tool_response', {}).get('content', []):
    if item.get('type') == 'text':
        response_text = item['text']
        break

# Strip leading icon + bold name header (e.g. "📊 **Mary:** " or garbled prefix)
response_text = response_text.strip()
response_text = re.sub(r'^\S*\s*\*\*[^:]+:\*\*\s*', '', response_text).strip()

# Encode newlines so we can pass multi-line text through a single shell variable (fixes m3)
response_text = response_text.replace('\n', '\\n')

print(f"{tool_name}|{display_name}|{response_text}")
PYEOF
)" 2>/dev/null || true

[[ -z "$parsed" ]] && exit 0

tool_name="${parsed%%|*}"
rest="${parsed#*|}"
display_name="${rest%%|*}"
response_text="${rest#*|}"

# Decode \n back to newlines for TTS
response_text="${response_text//\\n/ }"

# --- Only handle Agent tool ---
if [[ "$tool_name" != "Agent" ]]; then
    _dbg "skip: tool_name='$tool_name' (not Agent)"
    exit 0
fi

# --- Fingerprint: only fire for BMAD party mode agents (safe string match, no pipe) ---
if [[ "$raw" != *"BMAD agent in a collaborative roundtable"* ]]; then
    _dbg "skip: fingerprint MISS (Agent call but prompt lacks 'BMAD agent in a collaborative roundtable')"
    exit 0
fi
_dbg "fingerprint HIT: display='$display_name' text_len=${#response_text}"

if [[ -z "$display_name" ]]; then
    _dbg "skip: empty display_name"
    exit 0
fi
if [[ -z "$response_text" ]]; then
    _dbg "skip: empty response_text"
    exit 0
fi

# --- Resolve project root ---
project_root="${CLAUDE_PROJECT_DIR:-}"

# --- Find bmad-speak.sh (prefer project-local, fall back to global) ---
bmad_speak=""
if [[ -n "$project_root" && -f "$project_root/.claude/hooks/bmad-speak.sh" ]]; then
    bmad_speak="$project_root/.claude/hooks/bmad-speak.sh"
elif [[ -f "$SCRIPT_DIR/bmad-speak.sh" ]]; then
    bmad_speak="$SCRIPT_DIR/bmad-speak.sh"
fi
[[ -z "$bmad_speak" ]] && exit 0

# --- Look up canonical agent ID from project manifest via python3 (fixes M4: awk CSV comma) ---
agent_id="$display_name"  # fallback
if [[ -n "$project_root" && -f "$project_root/_bmad/_config/agent-manifest.csv" ]]; then
    manifest="$project_root/_bmad/_config/agent-manifest.csv"
    matched="$(python3 - "$manifest" "$display_name" <<'PYEOF'
import sys, csv
manifest_path, target = sys.argv[1], sys.argv[2].lower()
try:
    with open(manifest_path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row.get('displayName', '').lower() == target:
                print(row.get('name', ''))
                break
except Exception:
    pass
PYEOF
)" 2>/dev/null || true
    [[ -n "$matched" ]] && agent_id="$matched"
fi

# --- Apply verbosity truncation ---
verbosity="medium"
# Guard project_root empty to avoid /.claude/... path (fixes M1)
if [[ -n "$project_root" && -f "$project_root/.claude/tts-verbosity.txt" ]]; then
    v="$(tr -d '[:space:]' < "$project_root/.claude/tts-verbosity.txt")"
    [[ -n "$v" ]] && verbosity="$v"
elif [[ -f "$HOME/.claude/tts-verbosity.txt" ]]; then
    v="$(tr -d '[:space:]' < "$HOME/.claude/tts-verbosity.txt")"
    [[ -n "$v" ]] && verbosity="$v"
fi

case "$verbosity" in
    low)
        # First sentence — fall back to full text if no punctuation (fixes m1)
        first="$(printf '%s' "$response_text" | python3 -c "
import sys, re
t = sys.stdin.read()
m = re.match(r'^.*?[.!?]', t)
print(m.group(0) if m else t)
" 2>/dev/null || printf '%s' "$response_text")"
        [[ -n "$first" ]] && response_text="$first"
        ;;
    medium)
        # First 2 sentences — fall back to full text if no punctuation (fixes m1)
        two="$(printf '%s' "$response_text" | python3 -c "
import sys, re
t = sys.stdin.read()
parts = re.findall(r'.*?[.!?]', t)
print(' '.join(parts[:2]) if parts else t)
" 2>/dev/null || printf '%s' "$response_text")"
        [[ -n "$two" ]] && response_text="$two"
        ;;
    # high = full text
esac

[[ -z "$response_text" ]] && exit 0

# --- Acquire queue lock (flock: cross-process, auto-releases on crash) ---
exec 9>"$LOCK_FILE"
if command -v flock &>/dev/null; then
    flock -w 60 9
    _dbg "invoking: $bmad_speak '$agent_id' (text_len=${#response_text})"
    "$bmad_speak" "$agent_id" "$response_text" || _dbg "bmad-speak returned non-zero"
    flock -u 9
else
    # macOS fallback: atomic mkdir polling lock
    LOCK_DIR="/tmp/agentvibes-party-queue.lock.d"
    # Register trap BEFORE acquiring lock so SIGTERM can't orphan it (fixes M3)
    trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
    WAITED=0
    while ! mkdir "$LOCK_DIR" 2>/dev/null; do
        sleep 0.5
        WAITED=$((WAITED + 1))
        if [[ $WAITED -ge 120 ]]; then
            echo "[AgentVibes] Party mode TTS queue timeout for agent: $agent_id" >&2
            exit 0
        fi
    done
    "$bmad_speak" "$agent_id" "$response_text" || true
    rmdir "$LOCK_DIR" 2>/dev/null || true
fi
