#!/usr/bin/env bash
#
# File: .claude/hooks/party-set-room.sh
#
# AgentVibes - record the chosen (non-default) party room for this session.
#
# party-stage-roster.py broadcasts the DEFAULT installed-agent room unless it
# knows a specific room was chosen. This tiny helper is the AgentVibes-side
# mechanism for recording that choice: it writes the active-room state file
#
#   ~/.agentvibes/party-active-<sessionid>.json  =  {"group":"<group-id>"}
#
# keyed by the canonical routing session id (av_session_id = basename of
# CLAUDE_PROJECT_DIR). party-stage-roster.py reads this file and passes the
# group to resolve_party.py as --party, so an open-cast themed room (e.g. a
# Star Wars room with a freeform `scene`) gets broadcast instead of the default.
#
# EXTENSION POINT (we do NOT edit the BMAD skill): a party skill can call this
# from its user-config `activation_steps_append` when the user picks a room --
# that is the sanctioned way to wire this in without touching BMAD-owned files.
#
# Non-destructive: only creates ~/.agentvibes (mkdir -p) and writes/overwrites
# the one per-session state file it owns. Touches no user config.
#
# Usage: party-set-room.sh <group-id>
#        party-set-room.sh --clear      # remove the state file (back to default)
#
# bash-3.2 safe (macOS default bash).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./session-id.sh
source "$SCRIPT_DIR/session-id.sh"

GROUP="${1:-}"
if [[ -z "$GROUP" ]]; then
  echo "usage: party-set-room.sh <group-id> | --clear" >&2
  exit 2
fi

SESSION_ID="$(av_session_id "${CLAUDE_PROJECT_DIR:-$PWD}")"
STATE_DIR="$HOME/.agentvibes"
STATE_FILE="$STATE_DIR/party-active-${SESSION_ID}.json"

mkdir -p "$STATE_DIR"

if [[ "$GROUP" == "--clear" ]]; then
  rm -f "$STATE_FILE"
  # Also clear the stage-on-first-speak idempotency flag so the next party
  # re-broadcasts its cast (this is the manual party-reset path).
  rm -f "$STATE_DIR/staged-${SESSION_ID}.flag"
  echo "party-set-room: cleared active room for session '$SESSION_ID' (back to default)."
  exit 0
fi

# Validate the group id: a group id is a slug (letters/digits/._-). Reject
# anything else so we never write attacker-controlled JSON.
if [[ ! "$GROUP" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "party-set-room: invalid group id '$GROUP' (allowed: A-Za-z0-9._-)" >&2
  exit 2
fi

# Write atomically so a concurrent reader never sees a half-written file.
_tmp="$(mktemp "$STATE_DIR/party-active-${SESSION_ID}.XXXXXX")" || exit 1
trap 'rm -f "$_tmp"' EXIT
printf '{"group":"%s"}\n' "$GROUP" > "$_tmp"
mv "$_tmp" "$STATE_FILE"
trap - EXIT

echo "party-set-room: session '$SESSION_ID' room set to '$GROUP'."
