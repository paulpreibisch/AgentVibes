#!/usr/bin/env bats
#
# play-tts-soprano.sh shares one audio lock with the other providers. A lock
# whose holder has exited must not silence Soprano for good, and a lock held
# by a long clip that is still playing must not be taken over.

load '../helpers/test-helper'

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_audio_players

  SOPRANO="$TEST_CLAUDE_DIR/hooks/play-tts-soprano.sh"
  export XDG_RUNTIME_DIR="$BATS_TEST_TMPDIR/run"
  mkdir -p "$XDG_RUNTIME_DIR"
  LOCK="$XDG_RUNTIME_DIR/agentvibes-audio.lock"

  # No server: curl fails, so the script uses the soprano CLI, which writes a
  # stand-in wav. ffmpeg fails so the wav is used as it is; ffprobe reports the
  # clip length (one second unless a test sets MOCK_CLIP_SECONDS).
  local bin="$BATS_TEST_TMPDIR/bin"
  mkdir -p "$bin"
  printf '#!/bin/bash\nexit 1\n' > "$bin/curl"
  printf '#!/bin/bash\nexit 1\n' > "$bin/ffmpeg"
  printf '#!/bin/bash\necho "${MOCK_CLIP_SECONDS:-1}"\n' > "$bin/ffprobe"
  cat > "$bin/soprano" <<'EOF'
#!/bin/bash
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "-o" ]]; then printf 'RIFF0000WAVE' > "$2"; fi
  shift
done
EOF
  chmod +x "$bin"/*
  export PATH="$bin:$BATS_TEST_TMPDIR:$PATH"
}

teardown() {
  [[ -n "${HOLDER_PID:-}" ]] && kill "$HOLDER_PID" 2>/dev/null
  teardown_test_env
}

# A PID that is certainly not running.
dead_pid() {
  true &
  local pid=$!
  wait "$pid"
  echo "$pid"
}

@test "a lock whose holder has exited is removed, and Soprano speaks" {
  dead_pid > "$LOCK"
  run "$SOPRANO" "hello"
  [ "$status" -eq 0 ]
  [[ "$output" != *"Skipping TTS"* ]]
}

@test "a lock held by a running player is kept, even when it is old" {
  sleep 60 &
  HOLDER_PID=$!
  echo "$HOLDER_PID" > "$LOCK"
  touch -t 202001010000 "$LOCK"
  run "$SOPRANO" "hello"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Skipping TTS"* ]]
  [ "$(cat "$LOCK")" = "$HOLDER_PID" ]
}

@test "a fresh lock with no holder is kept" {
  : > "$LOCK"
  run "$SOPRANO" "hello"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Skipping TTS"* ]]
  [ -f "$LOCK" ]
}

@test "an old lock with no holder is removed" {
  : > "$LOCK"
  touch -t 202001010000 "$LOCK"
  run "$SOPRANO" "hello"
  [ "$status" -eq 0 ]
  [[ "$output" != *"Skipping TTS"* ]]
}

@test "the lock names a running releaser, which removes it after the clip" {
  export MOCK_CLIP_SECONDS=4
  run "$SOPRANO" "hello"
  [ "$status" -eq 0 ]
  local holder
  holder="$(cat "$LOCK")"
  [[ "$holder" =~ ^[0-9]+$ ]]
  kill -0 "$holder"
  for _ in $(seq 1 50); do [ -f "$LOCK" ] || break; sleep 0.2; done
  [ ! -f "$LOCK" ]
}

@test "a releaser never removes a lock another call has taken over" {
  export MOCK_CLIP_SECONDS=4
  run "$SOPRANO" "hello"
  [ "$status" -eq 0 ]
  local releaser
  releaser="$(cat "$LOCK")"
  sleep 60 &
  HOLDER_PID=$!
  echo "$HOLDER_PID" > "$LOCK"
  while kill -0 "$releaser" 2>/dev/null; do sleep 0.2; done
  [ "$(cat "$LOCK")" = "$HOLDER_PID" ]
}
