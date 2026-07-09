#!/usr/bin/env bash
#
# File: .claude/hooks/agentvibes-session-id.sh
#
# AgentVibes - Text-to-Speech WITH personality for AI Assistants
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Licensed under the Apache License, Version 2.0
#
# @fileoverview Print a short spoken self-identifier for THIS session, e.g.
#   "Claude on AgentVibes in Ghostty"
# @why With several agent sessions open at once, every one saying the same thing
#   makes it impossible to tell which tab just spoke. Prefixing each session's
#   speech with who+where answers "which one is that?" (community request).
# @usage agentvibes-session-id.sh <llm-key> <project-dir>
#   Also used via the {{session}} token in a per-LLM PRETEXT (see play-tts.sh).
#
set -uo pipefail
export LC_ALL=C

LLM_KEY="${1:-claude-code}"
PROJ_DIR="${2:-$PWD}"

# LLM display name
case "$LLM_KEY" in
  claude-code|claude*) LLM_NAME="Claude" ;;
  gemini*)             LLM_NAME="Gemini" ;;
  codex|openai*|gpt*)  LLM_NAME="Codex" ;;
  cursor*)             LLM_NAME="Cursor" ;;
  default)             LLM_NAME="Agent" ;;
  *)                   LLM_NAME="$LLM_KEY" ;;
esac

# Project name = basename of the project dir
PROJ_NAME="$(basename "$PROJ_DIR" 2>/dev/null || true)"
[[ -z "$PROJ_NAME" || "$PROJ_NAME" == "/" || "$PROJ_NAME" == "." ]] && PROJ_NAME="this project"

# Terminal detection — prefer the most specific signal available.
TERM_NAME=""
if [[ -n "${WT_SESSION:-}" ]]; then
  TERM_NAME="Windows Terminal"
elif [[ -n "${TERM_PROGRAM:-}" ]]; then
  case "$TERM_PROGRAM" in
    vscode)         TERM_NAME="VS Code" ;;
    iTerm.app)      TERM_NAME="iTerm" ;;
    Apple_Terminal) TERM_NAME="Terminal" ;;
    ghostty|Ghostty) TERM_NAME="Ghostty" ;;
    WezTerm)        TERM_NAME="WezTerm" ;;
    Hyper)          TERM_NAME="Hyper" ;;
    tmux)           TERM_NAME="tmux" ;;
    Tabby)          TERM_NAME="Tabby" ;;
    *)              TERM_NAME="$TERM_PROGRAM" ;;
  esac
elif [[ -n "${TERMINAL_EMULATOR:-}" ]]; then
  TERM_NAME="$TERMINAL_EMULATOR"
elif [[ -n "${KITTY_WINDOW_ID:-}" ]]; then
  TERM_NAME="kitty"
elif [[ -n "${ALACRITTY_WINDOW_ID:-}" ]]; then
  TERM_NAME="Alacritty"
elif [[ -n "${TMUX:-}" ]]; then
  TERM_NAME="tmux"
fi

if [[ -n "$TERM_NAME" ]]; then
  printf '%s on %s in %s' "$LLM_NAME" "$PROJ_NAME" "$TERM_NAME"
else
  printf '%s on %s' "$LLM_NAME" "$PROJ_NAME"
fi
