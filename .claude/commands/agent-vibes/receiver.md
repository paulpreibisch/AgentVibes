---
description: Master ON/OFF switch — mute or unmute BOTH local text TTS and server-received (receiver) TTS with one command
argument-hint: on | off | status
---

# AgentVibes Master Switch (Receiver + Local)

This machine can speak from **two** independent sources:

1. **Server-received TTS** — arrives over SSH, is queued, and played by the
   watcher through `play-tts.ps1`, which checks `~/.claude/tts-muted.txt`.
2. **Local text TTS** — the local Claude Code hooks. The Windows hook
   (`play-tts.ps1`) checks `~/.claude/tts-muted.txt`; the bash hook
   (`play-tts.sh`) checks `~/.agentvibes-muted`.

A single mute file only covers part of this, so this command sets **all**
of them at once. `off` silences everything; `on` restores everything.

Run the block below. The user's requested mode is in `$ARGUMENTS`
(e.g. `on`, `off`, or empty/`status` to just report).

```bash
set -euo pipefail

ARG="$(printf '%s' "${ARGUMENTS:-}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"

WIN_MUTE="$HOME/.claude/tts-muted.txt"      # gates play-tts.ps1 (receiver + local Windows)
BASH_MUTE="$HOME/.agentvibes-muted"         # gates play-tts.sh (local bash hook)
mkdir -p "$HOME/.claude"

report_state() {
  local w="false" b="absent"
  [ -f "$WIN_MUTE" ] && w="$(tr -d '[:space:]' < "$WIN_MUTE" 2>/dev/null || echo '?')"
  [ -f "$BASH_MUTE" ] && b="present"
  if [ "$w" = "true" ] || [ "$b" = "present" ]; then
    echo "🔇 AgentVibes is OFF (muted) — windows=$w bash=$b"
  else
    echo "🔊 AgentVibes is ON (unmuted) — windows=$w bash=$b"
  fi
}

case "$ARG" in
  off|mute|silence|stop|quiet|0|false)
    printf 'true' > "$WIN_MUTE"
    : > "$BASH_MUTE"
    # Drop any project-level override that could re-enable local TTS in the cwd.
    rm -f "./.claude/agentvibes-unmuted" 2>/dev/null || true
    echo "🔇 **AgentVibes OFF.** Both server-received and local TTS are now muted on this machine."
    ;;
  on|unmute|sound|start|speak|1|true)
    printf 'false' > "$WIN_MUTE"
    rm -f "$BASH_MUTE"
    rm -f "./.claude/agentvibes-muted" 2>/dev/null || true
    echo "🔊 **AgentVibes ON.** Both server-received and local TTS are now active on this machine."
    ;;
  ""|status|check|state)
    report_state
    ;;
  *)
    echo "Usage: /agent-vibes:receiver on | off | status"
    report_state
    ;;
esac
```
