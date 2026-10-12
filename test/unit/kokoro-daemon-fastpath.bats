#!/usr/bin/env bats
#
# play-tts-kokoro.sh must use the resident kokoro-server (warm model, ~0.6 s)
# instead of cold-loading Kokoro through kokoro-tts.py on every call (~20 s).
# Regression: the bash provider never had the daemon fast path that
# play-tts-kokoro.ps1 has, so every spoken line on the bash path paid a full
# model load even while the daemon sat idle on port 7855.
#
# Hermetic: curl, the Python interpreter, kokoro-tts.py and kokoro-server.py are
# all stubbed. No real synthesis, no real daemon, no audio, no GPU.

load '../helpers/test-helper'

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_audio_players

  KOKORO="$TEST_CLAUDE_DIR/hooks/play-tts-kokoro.sh"
  LOG="$BATS_TEST_TMPDIR/calls.log"
  : > "$LOG"
  export LOG
  export AGENTVIBES_NO_PLAYBACK=true AGENTVIBES_NO_PLAY=true
  unset AGENTVIBES_TEST_MODE AGENTVIBES_KOKORO_DAEMON
  export AGENTVIBES_KOKORO_PORT=17855

  REAL_PY="$(command -v python3 || command -v python)"
  export REAL_PY

  # Interpreter stub: reports kokoro as installed, otherwise defers to real Python.
  cat > "$BATS_TEST_TMPDIR/pystub" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *"find_spec('kokoro')"* ]]; then echo "find_spec" >> "$LOG"; exit 0; fi
exec "$REAL_PY" "$@"
EOF
  chmod +x "$BATS_TEST_TMPDIR/pystub"
  export AGENTVIBES_PYTHON="$BATS_TEST_TMPDIR/pystub"

  # Direct-synthesis stub: writes the wav it was asked for and records the call.
  cat > "$TEST_CLAUDE_DIR/hooks/kokoro-tts.py" <<'EOF'
import os, sys
open(sys.argv[3], "wb").write(b"RIFFdirect")
open(os.environ["LOG"], "a").write("direct\n")
EOF
  # Daemon stub: records that a start was attempted and exits.
  cat > "$TEST_CLAUDE_DIR/hooks/kokoro-server.py" <<'EOF'
import os, sys
open(os.environ["LOG"], "a").write("daemon-start port=%s\n" % sys.argv[1])
EOF

  # curl stub. FAKE_DAEMON=up|down|broken controls /health and /synth.
  cat > "$BATS_TEST_TMPDIR/curl" <<'EOF'
#!/usr/bin/env bash
url="" data=""
prev=""
for a in "$@"; do
  [[ "$prev" == "--data-binary" ]] && data="$a"
  [[ "$a" == http://* ]] && url="$a"
  prev="$a"
done
echo "curl $url" >> "$LOG"
case "${FAKE_DAEMON:-down}:$url" in
  up:*/health|broken:*/health) echo '{"ok": true}' ;;
  up:*/synth)
    out="$("$REAL_PY" -c 'import json,sys; print(json.loads(sys.argv[1])["output"])' "$data")"
    voice="$("$REAL_PY" -c 'import json,sys; print(json.loads(sys.argv[1])["voice"])' "$data")"
    echo "synth voice=$voice" >> "$LOG"
    printf 'RIFFdaemon' > "$out"
    echo '{"ok": true}' ;;
  broken:*/synth) echo '{"ok": false, "error": "boom"}' ;;
  *) exit 7 ;;
esac
EOF
  chmod +x "$BATS_TEST_TMPDIR/curl"
  export PATH="$BATS_TEST_TMPDIR:$PATH"
}

teardown() {
  teardown_test_env
}

_wav_from_output() {
  printf '%s\n' "$output" | sed -n 's/^AV_OUTPUT://p' | tail -1
}

@test "kokoro: daemon up -> synthesizes through /synth, never cold-loads" {
  export FAKE_DAEMON=up
  run "$KOKORO" "Hello from the daemon" am_michael
  [ "$status" -eq 0 ]
  wav="$(_wav_from_output)"
  [ -n "$wav" ]
  [ "$(cat "$wav")" = "RIFFdaemon" ]
  grep -q "curl http://127.0.0.1:17855/health" "$LOG"
  grep -q "synth voice=am_michael" "$LOG"
  ! grep -q "^direct" "$LOG"
  ! grep -q "daemon-start" "$LOG"
}

@test "kokoro: daemon up -> skips the kokoro-module check (daemon may use another interpreter)" {
  export FAKE_DAEMON=up
  run "$KOKORO" "Hello" am_michael
  [ "$status" -eq 0 ]
  ! grep -q "find_spec" "$LOG"
}

@test "kokoro: daemon down -> direct synthesis AND starts the daemon for next time" {
  export FAKE_DAEMON=down
  run "$KOKORO" "Hello" am_michael
  [ "$status" -eq 0 ]
  [ "$(cat "$(_wav_from_output)")" = "RIFFdirect" ]
  grep -q "^direct" "$LOG"
  # the start is detached; give it a moment to record itself
  for _ in 1 2 3 4 5 6 7 8 9 10; do grep -q "daemon-start port=17855" "$LOG" && break; sleep 0.3; done
  grep -q "daemon-start port=17855" "$LOG"
}

@test "kokoro: daemon answers /health but /synth fails -> falls back, does not spawn a second daemon" {
  export FAKE_DAEMON=broken
  run "$KOKORO" "Hello" am_michael
  [ "$status" -eq 0 ]
  [ "$(cat "$(_wav_from_output)")" = "RIFFdirect" ]
  [[ "$output" == *"falling back to direct synthesis"* ]]
  sleep 1
  ! grep -q "daemon-start" "$LOG"
}

@test "kokoro: AGENTVIBES_KOKORO_DAEMON=false -> no daemon contact, no daemon start" {
  export FAKE_DAEMON=up AGENTVIBES_KOKORO_DAEMON=false
  run "$KOKORO" "Hello" am_michael
  [ "$status" -eq 0 ]
  [ "$(cat "$(_wav_from_output)")" = "RIFFdirect" ]
  ! grep -q "^curl" "$LOG"
  sleep 1
  ! grep -q "daemon-start" "$LOG"
}

@test "kokoro: test mode never contacts the daemon" {
  export FAKE_DAEMON=up AGENTVIBES_TEST_MODE=true
  run "$KOKORO" "Hello" am_michael
  [ "$status" -eq 0 ]
  ! grep -q "^curl" "$LOG"
}

@test "parity: PowerShell twin honours the same port override and opt-out" {
  ps1="${BATS_TEST_DIRNAME}/../../.claude/hooks-windows/play-tts-kokoro.ps1"
  grep -q 'AGENTVIBES_KOKORO_PORT' "$ps1"
  grep -q "AGENTVIBES_KOKORO_DAEMON -ne 'false'" "$ps1"
  grep -q '/synth' "$ps1"
}
