#!/usr/bin/env bats
# Regression tests for the bmad-speak.sh per-agent profile crash (Story AVI-S8.5
# blocker; see docs/implementation-artifacts/8-5-precedence-map.md, R21).
#
# Why this file exists: a botched merge (610af0f2) dropped the call site that
# populates $PROFILE_VOICE/$PROFILE_PRETEXT/$PROFILE_REVERB/$PROFILE_PERSONALITY/
# $PROFILE_MUSIC_* from bmad-voice-map.json, while the helper function that
# reads them (read_agent_profile_all) was left in place unused. Under
# `set -euo pipefail` referencing those unset variables is a fatal "unbound
# variable" error, so bmad-speak.sh crashed on every call — silently, because
# its sole caller (bmad-party-speak.sh) swallows the failure.
#
# The pre-existing test/unit/bmad-voice-map.bats "integration" test never
# caught this: it plants its mock BMAD install at
# `${CLAUDE_PROJECT_DIR}/.bmad/_cfg/agent-voice-map.csv`, but (a) bmad-speak.sh's
# install-gate checks `_bmad/_config/agent-manifest.csv` (different directory
# names entirely), and (b) bmad-speak.sh derives PROJECT_ROOT from its OWN
# script location (two directories up from wherever bmad-speak.sh lives), not
# from $CLAUDE_PROJECT_DIR. So the old test's gate file was never even in the
# right place, the install-gate check at the top of bmad-speak.sh always
# failed, and the script exited 0 well before ever reaching the crash site —
# a blind spot that let the bug ship silently.
#
# These tests instead place the manifest/profile files at the location
# bmad-speak.sh actually reads (script-derived PROJECT_ROOT, which
# setup_agentvibes_scripts pins to $TEST_HOME here), and mock play-tts.sh
# (bmad-speak.sh's ONLY downstream call) to capture its exact argv + the
# per-agent temp profile JSON instead of touching real audio.

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts

  BMAD_SPEAK="$TEST_CLAUDE_DIR/hooks/bmad-speak.sh"

  # bmad-speak.sh computes PROJECT_ROOT as two directories up from its own
  # location ($TEST_CLAUDE_DIR/hooks -> $TEST_CLAUDE_DIR -> $TEST_HOME), NOT
  # from $CLAUDE_PROJECT_DIR. Place the BMAD manifest + voice map there.
  BMAD_PROJECT_ROOT="$TEST_HOME"

  mkdir -p "$BMAD_PROJECT_ROOT/_bmad/_config"
  cat > "$BMAD_PROJECT_ROOT/_bmad/_config/agent-manifest.csv" << 'EOF'
name,displayName,title,icon,module
architect,Winston,Architect,building,bmm
pm,John,Product Manager,chart,bmm
EOF

  mkdir -p "$BMAD_PROJECT_ROOT/.agentvibes"
  cat > "$BMAD_PROJECT_ROOT/.agentvibes/bmad-voice-map.json" << 'EOF'
{
  "partyMode": true,
  "voiceMap": { "architect": "en_GB-alan-medium" },
  "agents": {
    "architect": {
      "voice": "en_GB-alan-medium",
      "pretext": "Winston, Architect here",
      "reverbPreset": "cathedral",
      "personality": "normal",
      "backgroundMusic": { "track": "soft_piano.mp3", "volume": 30, "enabled": true }
    }
  }
}
EOF

  # Mock play-tts.sh — bmad-speak.sh's only downstream call. Capture the
  # exact args + the per-agent temp profile file's content (read it here,
  # before bmad-speak.sh deletes it on cleanup) instead of doing real TTS.
  AGENTVIBES_CAPTURE_FILE="$BATS_TEST_TMPDIR/capture.txt"
  export AGENTVIBES_CAPTURE_FILE
  cat > "$TEST_CLAUDE_DIR/hooks/play-tts.sh" << 'EOF'
#!/usr/bin/env bash
{
  echo "ARG1=$1"
  echo "ARG2=${2:-}"
  echo "ARG3=${3:-}"
  if [[ -n "${3:-}" && -f "${3:-}" ]]; then
    echo "PROFILE_JSON=$(cat "$3")"
  fi
} > "${AGENTVIBES_CAPTURE_FILE:?}"
exit 0
EOF
  chmod +x "$TEST_CLAUDE_DIR/hooks/play-tts.sh"
}

teardown() {
  teardown_test_env
}

@test "bmad-speak.sh does not crash with unbound variable when a profile is configured (regression guard)" {
  run "$BMAD_SPEAK" "architect" "Hello from the architect"
  [ "$status" -eq 0 ]
  [[ "$output" != *"unbound variable"* ]]
}

@test "bmad-speak.sh applies the configured per-agent voice and pretext" {
  run "$BMAD_SPEAK" "architect" "Hello from the architect"
  [ "$status" -eq 0 ]

  grep -q '^ARG2=en_GB-alan-medium$' "$AGENTVIBES_CAPTURE_FILE"
  grep -q '^ARG1=Winston, Architect here\. Hello from the architect$' "$AGENTVIBES_CAPTURE_FILE"
}

@test "bmad-speak.sh resolves the per-agent profile via display name through agent-manifest.csv" {
  # "Winston" is the displayName for the "architect" agent id in the manifest.
  run "$BMAD_SPEAK" "Winston" "Reporting on the architecture"
  [ "$status" -eq 0 ]

  grep -q '^ARG2=en_GB-alan-medium$' "$AGENTVIBES_CAPTURE_FILE"
}

@test "bmad-speak.sh writes a temp profile with reverb/personality/music for downstream effects" {
  run "$BMAD_SPEAK" "architect" "Hello from the architect"
  [ "$status" -eq 0 ]

  run cat "$AGENTVIBES_CAPTURE_FILE"
  [[ "$output" == *'"reverbPreset":"cathedral"'* ]]
  [[ "$output" == *'"personality":"normal"'* ]]
  [[ "$output" == *'"track":"soft_piano.mp3"'* ]]
  [[ "$output" == *'"volume":30'* ]]
  [[ "$output" == *'"enabled":true'* ]]
}

@test "bmad-speak.sh falls through gracefully when the agent has no profile entry (no crash)" {
  # "pm" exists in the manifest but has no entry under "agents" in bmad-voice-map.json.
  run "$BMAD_SPEAK" "pm" "Hello from PM"
  [ "$status" -eq 0 ]
  [[ "$output" != *"unbound variable"* ]]

  # Falls through to bmad-voice-manager.sh's own default/CSV resolution rather
  # than crashing or leaving the voice empty.
  grep -q '^ARG2=.\+$' "$AGENTVIBES_CAPTURE_FILE"
}

@test "bmad-speak.sh does not crash when bmad-voice-map.json is entirely absent" {
  rm -f "$BMAD_PROJECT_ROOT/.agentvibes/bmad-voice-map.json"

  run "$BMAD_SPEAK" "architect" "Hello from the architect"
  [ "$status" -eq 0 ]
  [[ "$output" != *"unbound variable"* ]]
}

@test "bmad-speak.sh does not crash for an unknown agent name with no manifest match" {
  run "$BMAD_SPEAK" "TotallyUnknownAgentXYZ" "Some dialogue"
  [ "$status" -eq 0 ]
  [[ "$output" != *"unbound variable"* ]]
}
