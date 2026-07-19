#!/usr/bin/env bash
#
# File: .claude/hooks/session-id.sh
#
# AgentVibes - Canonical routing session-id helper.
#
# The receiver MULTIPLEXES forwarded TTS from many sources (multiple local
# projects + remote machines) keyed by a per-message identity. That identity
# MUST be stable and correctly derived, or the receiver merges unrelated
# sessions into one.
#
# This helper is the SINGLE source of truth for that routing id so every
# forward path (e.g. play-tts-ssh-remote.sh SSH) derives it identically:
#
#   session id = basename(CLAUDE_PROJECT_DIR)   when CLAUDE_PROJECT_DIR is set
#              = basename(<fallback dir>)        otherwise (passed dir, else PWD)
#
# It is intentionally NOT basename(install root): for a global install
# (~/.claude/hooks) that basename collapses to the HOME dir name (e.g.
# "administrator"), so every project on the machine would report the same id.
#
# NOTE: This is a PLAIN SLUG for routing — do NOT confuse it with
# agentvibes-session-id.sh, which produces a human SPOKEN identity string.
#
# Usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/session-id.sh"
#   SESSION_ID="$(av_session_id "$FALLBACK_PROJECT_DIR")"
#
# bash-3.2 safe (macOS default bash). Sourced by scripts already in strict mode;
# defines a function only and does not alter shell options.
#

# av_session_id [fallback_dir]
#   Prints the canonical routing session id (plain slug) to stdout.
#   Prefers CLAUDE_PROJECT_DIR (the real user project injected via
#   --project-dir); else the passed fallback dir; else PWD. Callers MUST pass a
#   real project dir as the fallback — never the package/install root.
av_session_id() {
  local _dir="${CLAUDE_PROJECT_DIR:-}"
  if [[ -z "$_dir" ]]; then
    _dir="${1:-$PWD}"
  fi
  # Strip trailing slashes so basename of "/a/b/" is "b", not "".
  while [[ "$_dir" == */ && "${#_dir}" -gt 1 ]]; do
    _dir="${_dir%/}"
  done
  local _base
  _base="$(basename "$_dir" 2>/dev/null || printf '%s' "$_dir")"
  # Slugify: collapse anything outside [A-Za-z0-9._-] to '-' so the id is safe
  # as a JSON string and a stable map key on the receiver.
  _base="$(printf '%s' "$_base" | tr -c 'A-Za-z0-9._-' '-')"
  # Trim leading/trailing dashes introduced by slugification.
  _base="${_base#-}"; _base="${_base%-}"
  [[ -z "$_base" ]] && _base="unknown"
  printf '%s' "$_base"
}
