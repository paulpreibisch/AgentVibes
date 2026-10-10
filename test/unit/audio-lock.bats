#!/usr/bin/env bats
#
# The audio lock shared by play-tts-piper.sh, play-tts-macos.sh and
# play-tts-soprano.sh (audio-cache-utils.sh): a held lock survives however long
# the clip, an orphaned one is cleared, and a lock write never goes through a
# path another user controls.

REPO_ROOT="${BATS_TEST_DIRNAME}/../.."

setup() {
  source "$REPO_ROOT/.claude/hooks/audio-cache-utils.sh"
  export XDG_RUNTIME_DIR="$BATS_TEST_TMPDIR/run"
  mkdir -p "$XDG_RUNTIME_DIR"
  LOCK="$XDG_RUNTIME_DIR/agentvibes-audio.lock"
}

teardown() {
  [[ -n "${HOLDER_PID:-}" ]] && kill "$HOLDER_PID" 2>/dev/null
  true
}

@test "the lock lives in the user's private runtime dir" {
  [ "$(audio_lock_file)" = "$LOCK" ]
}

@test "a symlinked lock dir is not used" {
  local target="$BATS_TEST_TMPDIR/elsewhere"
  mkdir -p "$target"
  rm -rf "$XDG_RUNTIME_DIR"
  ln -s "$target" "$XDG_RUNTIME_DIR"
  run audio_lock_file
  [[ "$output" == *"not a private directory"* ]]
  local path="${lines[${#lines[@]}-1]}"
  [[ "$path" != "$XDG_RUNTIME_DIR/"* ]]
  [[ "$path" != "$target/"* ]]
}

@test "a lock write replaces a symlink instead of writing through it" {
  local victim="$BATS_TEST_TMPDIR/victim"
  echo "keep me" > "$victim"
  ln -s "$victim" "$LOCK"
  audio_lock_write "$LOCK" 12345
  [ "$(cat "$victim")" = "keep me" ]
  [ ! -L "$LOCK" ]
  [ "$(cat "$LOCK")" = "12345" ]
}

@test "a lock held by a running process is not stale, however old" {
  sleep 60 &
  HOLDER_PID=$!
  audio_lock_write "$LOCK" "$HOLDER_PID"
  touch -t 202001010000 "$LOCK"
  ! audio_lock_is_stale "$LOCK"
}

@test "a lock whose holder has exited is stale" {
  true &
  local pid=$!
  wait "$pid"
  audio_lock_write "$LOCK" "$pid"
  audio_lock_is_stale "$LOCK"
}

@test "a lock with no holder is stale only after 30 seconds" {
  : > "$LOCK"
  ! audio_lock_is_stale "$LOCK"
  touch -t 202001010000 "$LOCK"
  audio_lock_is_stale "$LOCK"
}

@test "release removes the lock only for its holder" {
  audio_lock_write "$LOCK" 111
  audio_lock_release "$LOCK" 222
  [ "$(cat "$LOCK")" = "111" ]
  audio_lock_release "$LOCK" 111
  [ ! -f "$LOCK" ]
}

@test "every provider that shares the lock checks the holder before clearing it" {
  for p in piper macos soprano; do
    grep -q 'audio_lock_is_stale "$LOCK_FILE"' "$REPO_ROOT/.claude/hooks/play-tts-$p.sh"
    ! grep -q 'touch "$LOCK_FILE"' "$REPO_ROOT/.claude/hooks/play-tts-$p.sh"
  done
}
