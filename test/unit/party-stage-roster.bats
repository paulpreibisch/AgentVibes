#!/usr/bin/env bats
#
# Phase 2 — deterministic party staging + open-cast broadcast.
#
# Locks in the AgentVibes-owned, receiver-agnostic "doorbell":
#   .claude/hooks/party-stage-roster.py  — resolves a BMAD party cast (read-only
#     via resolve_party.py) and POSTs a session-keyed roster to /stage-roster.
#   .claude/hooks/party-set-room.sh      — records the chosen (non-default) room.
#   .claude/hooks/bmad-speak.sh          — fires the doorbell ONCE per party on
#     the first party line (stage-on-first-speak + idempotency flag).
#
# Hermetic: HOME and USERPROFILE are both pinned to an isolated tmp home (the
# python home resolver prefers USERPROFILE on Windows), and resolve_party.py is
# a fixture that echoes canned JSON, so no real BMAD project / receiver is
# needed. AGENTVIBES_STAGE_CAPTURE dumps the exact wire payload to a file.

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
STAGE_PY="$REPO_ROOT/.claude/hooks/party-stage-roster.py"
SET_ROOM_SH="$REPO_ROOT/.claude/hooks/party-set-room.sh"
PY="$(command -v python3 || command -v python)"

setup() {
  setup_test_env
  # Pin BOTH home vars: party-stage-roster.py's _home_dir() prefers USERPROFILE.
  export USERPROFILE="$TEST_HOME"
  mkdir -p "$TEST_HOME/.agentvibes"

  # Isolated user project → session id = basename = "real-project".
  export CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/real-project"
  mkdir -p "$CLAUDE_PROJECT_DIR"

  # Fixture skill whose resolve_party.py just echoes $FAKE_RESOLVE_JSON.
  FAKE_SKILL="$BATS_TEST_TMPDIR/skill"
  mkdir -p "$FAKE_SKILL/scripts"
  cat > "$FAKE_SKILL/scripts/resolve_party.py" <<'PY'
import os, sys
sys.stdout.write(open(os.environ["FAKE_RESOLVE_JSON"], encoding="utf-8").read())
PY

  # A voice map so members join to voices.
  cat > "$TEST_HOME/.agentvibes/bmad-voice-map.json" <<'JSON'
{"agents":{"bmad-agent-architect":{"voice":"en_US-amy-medium"},"bmad-agent-pm":{"voice":"en_US-ryan-high"}}}
JSON
}

teardown() {
  teardown_test_env
}

_write_fixed_resolve() {
  cat > "$BATS_TEST_TMPDIR/resolve.json" <<'JSON'
{"active":"installed","name":"The Full Collective",
 "members":[{"code":"bmad-agent-architect","name":"Winston","title":"Architect"},
            {"code":"bmad-agent-pm","name":"John","title":"Product Manager"}],
 "memory_enabled":false}
JSON
  export FAKE_RESOLVE_JSON="$BATS_TEST_TMPDIR/resolve.json"
}

_write_open_resolve() {
  cat > "$BATS_TEST_TMPDIR/resolve.json" <<'JSON'
{"active":"rebels-room","name":"Star Wars Rebels Room","members":[],"open_cast":true,
 "scene":"figures from the Star Wars Rebels universe","memory_enabled":true}
JSON
  export FAKE_RESOLVE_JSON="$BATS_TEST_TMPDIR/resolve.json"
}

_field() {
  # _field <capture-file> <python-expr over `d`>
  "$PY" -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print($2)" "$1"
}

# ===========================================================================
# FIXED-CAST — POST a roster keyed by session == basename-<suffix>
# ===========================================================================

@test "fixed-cast: payload session == basename(CLAUDE_PROJECT_DIR)-bmad-party-mode" {
  _write_fixed_resolve
  export AGENTVIBES_STAGE_CAPTURE="$BATS_TEST_TMPDIR/payload.json"
  run "$PY" "$STAGE_PY" --project-root "$CLAUDE_PROJECT_DIR" --skill "$FAKE_SKILL" \
    --session-suffix bmad-party-mode
  [ "$status" -eq 0 ]
  [ -f "$AGENTVIBES_STAGE_CAPTURE" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["session"]')" = "real-project-bmad-party-mode" ]
  # project is the back-compat alias of session
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["project"]')" = "real-project-bmad-party-mode" ]
}

@test "fixed-cast: roster carries name/agentId/voice/role for each voiced member" {
  _write_fixed_resolve
  export AGENTVIBES_STAGE_CAPTURE="$BATS_TEST_TMPDIR/payload.json"
  run "$PY" "$STAGE_PY" --project-root "$CLAUDE_PROJECT_DIR" --skill "$FAKE_SKILL"
  [ "$status" -eq 0 ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'len(d["roster"])')" = "2" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["roster"][0]["name"]')" = "Winston" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["roster"][0]["agentId"]')" = "bmad-agent-architect" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["roster"][0]["voice"]')" = "en_US-amy-medium" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["roster"][0]["role"]')" = "Architect" ]
  # fixed-cast has NO openCast flag
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd.get("openCast", False)')" = "False" ]
}

@test "fixed-cast: a member with no saved voice is skipped (no orphan avatar)" {
  cat > "$BATS_TEST_TMPDIR/resolve.json" <<'JSON'
{"active":"installed","name":"x",
 "members":[{"code":"bmad-agent-architect","name":"Winston","title":"Architect"},
            {"code":"bmad-agent-nobody","name":"Ghost","title":"Ghost"}]}
JSON
  export FAKE_RESOLVE_JSON="$BATS_TEST_TMPDIR/resolve.json"
  export AGENTVIBES_STAGE_CAPTURE="$BATS_TEST_TMPDIR/payload.json"
  run "$PY" "$STAGE_PY" --project-root "$CLAUDE_PROJECT_DIR" --skill "$FAKE_SKILL"
  [ "$status" -eq 0 ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'len(d["roster"])')" = "1" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["roster"][0]["name"]')" = "Winston" ]
}

# ===========================================================================
# OPEN-CAST — the headline new behavior: broadcast, do NOT skip
# ===========================================================================

@test "open-cast: POSTs openCast:true + room.scene (does NOT skip)" {
  _write_open_resolve
  export AGENTVIBES_STAGE_CAPTURE="$BATS_TEST_TMPDIR/payload.json"
  run "$PY" "$STAGE_PY" --project-root "$CLAUDE_PROJECT_DIR" --skill "$FAKE_SKILL"
  [ "$status" -eq 0 ]
  [ -f "$AGENTVIBES_STAGE_CAPTURE" ]   # a payload WAS produced — not skipped
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["openCast"]')" = "True" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["room"]["id"]')" = "rebels-room" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["room"]["name"]')" = "Star Wars Rebels Room" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["room"]["scene"]')" = "figures from the Star Wars Rebels universe" ]
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd["session"]')" = "real-project-bmad-party-mode" ]
}

# ===========================================================================
# ACTIVE-ROOM DISCOVERY — the active-room file drives --party
# ===========================================================================

@test "active-room: party-active-<sessionid>.json selects the room passed to resolve_party" {
  # Make resolve_party ECHO the --party it received so we can prove it was used.
  cat > "$FAKE_SKILL/scripts/resolve_party.py" <<'PY'
import sys, json
party = ""
argv = sys.argv
for i, a in enumerate(argv):
    if a == "--party" and i + 1 < len(argv):
        party = argv[i + 1]
print(json.dumps({"active": party or "installed", "name": "echo",
                  "members": [{"code": "bmad-agent-architect", "name": "Winston"}]}))
PY
  echo '{"group":"rebels-room"}' > "$TEST_HOME/.agentvibes/party-active-real-project.json"
  export FAKE_RESOLVE_JSON="/dev/null"
  export AGENTVIBES_STAGE_CAPTURE="$BATS_TEST_TMPDIR/payload.json"
  run "$PY" "$STAGE_PY" --project-root "$CLAUDE_PROJECT_DIR" --skill "$FAKE_SKILL"
  [ "$status" -eq 0 ]
  # The room echoed back through 'active' proves --party rebels-room was passed.
  [ "$(_field "$AGENTVIBES_STAGE_CAPTURE" 'd.get("roster") is not None')" = "True" ]
}

# ===========================================================================
# BEST-EFFORT — no receiver → exit 0, no error propagates
# ===========================================================================

@test "no receiver: real POST to a dead port still exits 0 (best-effort)" {
  _write_fixed_resolve
  unset AGENTVIBES_STAGE_CAPTURE
  run "$PY" "$STAGE_PY" --project-root "$CLAUDE_PROJECT_DIR" --skill "$FAKE_SKILL" \
    --url "http://127.0.0.1:59997"
  [ "$status" -eq 0 ]
}

@test "no receiver: resolver failure exits 0 (never breaks the party)" {
  # No FAKE_RESOLVE_JSON export → the fixture resolve_party crashes → None.
  unset FAKE_RESOLVE_JSON || true
  export AGENTVIBES_STAGE_CAPTURE="$BATS_TEST_TMPDIR/payload.json"
  run "$PY" "$STAGE_PY" --project-root "$CLAUDE_PROJECT_DIR" --skill "$FAKE_SKILL"
  [ "$status" -eq 0 ]
  [ ! -f "$AGENTVIBES_STAGE_CAPTURE" ]   # nothing captured on resolver failure
}

# ===========================================================================
# party-set-room.sh — writes the expected JSON to the expected path
# ===========================================================================

@test "party-set-room.sh: writes {\"group\":<id>} to party-active-<sessionid>.json" {
  run bash "$SET_ROOM_SH" "rebels-room"
  [ "$status" -eq 0 ]
  local f="$TEST_HOME/.agentvibes/party-active-real-project.json"
  [ -f "$f" ]
  [ "$("$PY" -c "import json,sys; print(json.load(open(sys.argv[1]))['group'])" "$f")" = "rebels-room" ]
}

@test "party-set-room.sh: --clear removes the room file and the staged flag" {
  bash "$SET_ROOM_SH" "rebels-room"
  : > "$TEST_HOME/.agentvibes/staged-real-project.flag"
  run bash "$SET_ROOM_SH" --clear
  [ "$status" -eq 0 ]
  [ ! -f "$TEST_HOME/.agentvibes/party-active-real-project.json" ]
  [ ! -f "$TEST_HOME/.agentvibes/staged-real-project.flag" ]
}

@test "party-set-room.sh: rejects an injection-y group id" {
  run bash "$SET_ROOM_SH" 'evil","x":"y'
  [ "$status" -ne 0 ]
  [ ! -f "$TEST_HOME/.agentvibes/party-active-real-project.json" ]
}

# ===========================================================================
# STAGE-ON-FIRST-SPEAK + IDEMPOTENCY — bmad-speak.sh fires the doorbell ONCE
# ===========================================================================

# Build a mini BMAD project: bmad-speak.sh + the helpers it sources, a stub
# play-tts.sh, and a STUB party-stage-roster.py that counts its invocations.
_setup_speak_project() {
  SPEAK_PROJ="$BATS_TEST_TMPDIR/speakproj"
  mkdir -p "$SPEAK_PROJ/.claude/hooks" "$SPEAK_PROJ/_bmad/_config"
  cp "$REPO_ROOT/.claude/hooks/bmad-speak.sh"  "$SPEAK_PROJ/.claude/hooks/"
  cp "$REPO_ROOT/.claude/hooks/session-id.sh"  "$SPEAK_PROJ/.claude/hooks/"

  # Stub python-resolver.sh → point PYTHON_BIN at the test python.
  cat > "$SPEAK_PROJ/.claude/hooks/python-resolver.sh" <<EOF
PYTHON_BIN="$PY"
EOF

  # Stub play-tts.sh — succeed, do nothing.
  cat > "$SPEAK_PROJ/.claude/hooks/play-tts.sh" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$SPEAK_PROJ/.claude/hooks/play-tts.sh"

  # Stub doorbell — append one mark per invocation to $STAGE_COUNTER.
  cat > "$SPEAK_PROJ/.claude/hooks/party-stage-roster.py" <<'PY'
import os
p = os.environ.get("STAGE_COUNTER")
if p:
    with open(p, "a", encoding="utf-8") as f:
        f.write("x\n")
PY

  printf 'name,displayName\narchitect,Winston\n' \
    > "$SPEAK_PROJ/_bmad/_config/agent-manifest.csv"

  export STAGE_COUNTER="$BATS_TEST_TMPDIR/stage-count.txt"
  : > "$STAGE_COUNTER"
}

_count_stage() {
  # Doorbell fires in the background; give it a moment to land, then count.
  sleep 1
  local n
  # grep -c exits 1 on zero matches (still prints "0"); capture, don't pipe to
  # a second echo, or "0\n0" leaks out and breaks the integer test.
  n="$(grep -c x "$STAGE_COUNTER" 2>/dev/null)" || n=0
  printf '%s' "$n"
}

@test "stage-on-first-speak: many party lines fire the doorbell exactly ONCE" {
  _setup_speak_project
  export AGENTVIBES_PARTY_MODE=1     # the party marker bmad-party-speak.sh exports
  local i
  for i in 1 2 3 4 5; do
    run bash "$SPEAK_PROJ/.claude/hooks/bmad-speak.sh" "architect" "line $i"
    [ "$status" -eq 0 ]
  done
  [ "$(_count_stage)" -eq 1 ]
  [ -f "$TEST_HOME/.agentvibes/staged-real-project.flag" ]
}

@test "stage-on-first-speak: NOT in party context → doorbell never fires" {
  _setup_speak_project
  unset AGENTVIBES_PARTY_MODE     # no marker; session id has no party suffix
  run bash "$SPEAK_PROJ/.claude/hooks/bmad-speak.sh" "architect" "solo line"
  [ "$status" -eq 0 ]
  [ "$(_count_stage)" -eq 0 ]
  [ ! -f "$TEST_HOME/.agentvibes/staged-real-project.flag" ]
}
