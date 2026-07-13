#!/usr/bin/env bats
#
# Canonical routing session-id (AVI session-id-everywhere).
#
# The receiver multiplexes forwarded TTS from many sources by a per-message
# identity. This suite locks in the single canonical derivation
# (.claude/hooks/session-id.sh :: av_session_id) and proves BOTH forward paths
# use it:
#   - normal / SSH path is covered end-to-end in ssh-forward-mute-language.bats
#   - the party / bmad-speak path threads CLAUDE_PROJECT_DIR through to
#     play-tts.sh here (regression for the "administrator" install-root bug)
#   - forward-to-avatar.sh (local /speak, dormant) carries `session` — asserted
#     at source level, mirroring this repo's static-guard convention for
#     non-hermetic transports (see the receiver.ps1 asserts).

load '../helpers/test-helper'

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
SESSION_ID_SH="$REPO_ROOT/.claude/hooks/session-id.sh"
FORWARD_SH="$REPO_ROOT/.claude/hooks/forward-to-avatar.sh"

setup() {
  setup_test_env
}

teardown() {
  teardown_test_env
}

# ===========================================================================
# CANONICAL HELPER — the single source of truth both forward paths call
# ===========================================================================

@test "av_session_id: CLAUDE_PROJECT_DIR wins over the passed (install-root) fallback" {
  source "$SESSION_ID_SH"
  CLAUDE_PROJECT_DIR="/some/real-project" run av_session_id "/install/root"
  [ "$status" -eq 0 ]
  [ "$output" = "real-project" ]
}

@test "av_session_id: falls back to the passed project dir when CLAUDE_PROJECT_DIR unset" {
  source "$SESSION_ID_SH"
  unset CLAUDE_PROJECT_DIR
  run av_session_id "/home/administrator/myproj"
  [ "$status" -eq 0 ]
  [ "$output" = "myproj" ]
}

@test "av_session_id: trailing slash on CLAUDE_PROJECT_DIR still yields the basename" {
  source "$SESSION_ID_SH"
  CLAUDE_PROJECT_DIR="/a/b/My_Project/" run av_session_id "/x"
  [ "$status" -eq 0 ]
  [ "$output" = "My_Project" ]
}

@test "av_session_id: slugifies unsafe characters (plain routing slug)" {
  source "$SESSION_ID_SH"
  CLAUDE_PROJECT_DIR="/a/weird name!" run av_session_id "/x"
  [ "$status" -eq 0 ]
  [ "$output" = "weird-name" ]
}

# ===========================================================================
# PARTY / BMAD-SPEAK PATH — CLAUDE_PROJECT_DIR is threaded to play-tts.sh so
# the forwarded identity is the real project, NOT the install/HOME basename.
# ===========================================================================

# Build a self-contained mini BMAD project whose play-tts.sh is a stub that
# records the args bmad-speak.sh hands it.
_setup_party_project() {
  PARTY_PROJ="$BATS_TEST_TMPDIR/partyproj"       # stands in for a global-install root
  mkdir -p "$PARTY_PROJ/.claude/hooks" "$PARTY_PROJ/_bmad/_config"
  cp "$REPO_ROOT/.claude/hooks/bmad-speak.sh" "$PARTY_PROJ/.claude/hooks/bmad-speak.sh"

  # Stub play-tts.sh — capture exactly what bmad-speak.sh passes.
  cat > "$PARTY_PROJ/.claude/hooks/play-tts.sh" <<EOF
#!/usr/bin/env bash
printf '%s\n' "\$@" > "$PARTY_PROJ/pt-args.txt"
exit 0
EOF
  chmod +x "$PARTY_PROJ/.claude/hooks/play-tts.sh"

  # Minimal agent manifest so bmad-speak's "BMAD installed" gate passes.
  printf 'name,displayName\narchitect,Winston\n' \
    > "$PARTY_PROJ/_bmad/_config/agent-manifest.csv"

  # The real user project the party is running in.
  REAL_PROJ="$BATS_TEST_TMPDIR/real-project"
  mkdir -p "$REAL_PROJ/.claude"
}

@test "party path: bmad-speak.sh threads --project-dir <CLAUDE_PROJECT_DIR> to play-tts.sh" {
  _setup_party_project
  export CLAUDE_PROJECT_DIR="$REAL_PROJ"
  run bash "$PARTY_PROJ/.claude/hooks/bmad-speak.sh" "architect" "hello world"
  [ "$status" -eq 0 ]
  [ -f "$PARTY_PROJ/pt-args.txt" ]
  grep -qx -- "--project-dir" "$PARTY_PROJ/pt-args.txt"
  grep -qx -- "$REAL_PROJ" "$PARTY_PROJ/pt-args.txt"
}

@test "party path: threaded dir yields the real-project session id, not the install basename" {
  _setup_party_project
  export CLAUDE_PROJECT_DIR="$REAL_PROJ"
  run bash "$PARTY_PROJ/.claude/hooks/bmad-speak.sh" "architect" "hello world"
  [ "$status" -eq 0 ]

  # The dir bmad-speak forwarded, fed through the canonical helper, is the
  # session id the SSH/avatar forward will emit — assert it is the project, not
  # the install-root basename ("partyproj").
  source "$SESSION_ID_SH"
  local threaded sid install_base
  threaded="$(grep -A1 -x -- '--project-dir' "$PARTY_PROJ/pt-args.txt" | tail -1)"
  sid="$(CLAUDE_PROJECT_DIR="$threaded" av_session_id "$PARTY_PROJ")"
  install_base="$(basename "$PARTY_PROJ")"
  [ "$sid" = "real-project" ]
  [ "$sid" != "$install_base" ]
}

@test "party path: no CLAUDE_PROJECT_DIR → no --project-dir flag (no-project case unchanged)" {
  _setup_party_project
  unset CLAUDE_PROJECT_DIR
  run bash "$PARTY_PROJ/.claude/hooks/bmad-speak.sh" "architect" "hello world"
  [ "$status" -eq 0 ]
  [ -f "$PARTY_PROJ/pt-args.txt" ]
  run grep -qx -- "--project-dir" "$PARTY_PROJ/pt-args.txt"
  [ "$status" -ne 0 ]
}

# ===========================================================================
# LOCAL /speak (forward-to-avatar.sh) — carries `session` and agrees with
# `project`. Asserted at source level (this path needs a live receiver on two
# ports to run end-to-end; the SSH transport exercises the runtime payload).
# ===========================================================================

@test "forward-to-avatar.sh: sources the canonical session-id helper" {
  run grep -E 'source .*/session-id\.sh' "$FORWARD_SH"
  [ "$status" -eq 0 ]
}

@test "forward-to-avatar.sh: derives SESSION via av_session_id and pins project == session" {
  run grep -E 'SESSION="\$\(av_session_id' "$FORWARD_SH"
  [ "$status" -eq 0 ]
  run grep -E '^PROJECT="\$SESSION"' "$FORWARD_SH"
  [ "$status" -eq 0 ]
}

@test "forward-to-avatar.sh: both /speak bodies include a session field" {
  # warm-path + cold-path python bodies each emit "session"
  run grep -c '"session"' "$FORWARD_SH"
  [ "$status" -eq 0 ]
  [ "$output" -ge 2 ]
}
