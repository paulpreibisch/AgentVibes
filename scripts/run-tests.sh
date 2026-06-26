#!/usr/bin/env bash
# Test runner that suppresses AgentVibes TTS audio for the duration of the test suite.
#
# Default behaviour (no env vars):
#   Creates $HOME/.agentvibes-tests-running so that play-tts.sh exits early even when
#   called from a separate shell process (e.g. a Claude Code hook running concurrently).
#   The marker file is removed on EXIT, so it is always cleaned up even when tests fail.
#
# Opt-in to audio during tests:
#   AGENTVIBES_TEST_AUDIO=true npm test
#   Skips the global suppression marker.  Playback uses a calmer background track
#   (flamenco by default) instead of the production track configured for the LLM.
#
#   Override the test track:
#   AGENTVIBES_TEST_AUDIO=true AGENTVIBES_TEST_TRACK=agent_vibes_bossa_nova_v2_loop.mp3 npm test

set -euo pipefail

if [[ "${AGENTVIBES_TEST_AUDIO:-false}" == "true" ]]; then
  echo "ℹ️  Audio enabled during tests (AGENTVIBES_TEST_AUDIO=true)"
  # Default to flamenco; user may override with AGENTVIBES_TEST_TRACK
  export AGENTVIBES_TEST_TRACK="${AGENTVIBES_TEST_TRACK:-agentvibes_soft_flamenco_loop.mp3}"
  echo "   Background track: $AGENTVIBES_TEST_TRACK"
else
  MARKER="$HOME/.agentvibes-tests-running"
  # shellcheck disable=SC2064
  trap "rm -f '$MARKER'" EXIT
  touch "$MARKER"
  # Belt-and-suspenders: the marker silences the shell hooks (play-tts.sh /
  # play-tts.ps1), while this env flag silences the TUI's direct-spawn voice
  # previews (SAPI/piper/say/kokoro) that coverage tests fire via the Space key.
  export AGENTVIBES_SUPPRESS_AUDIO=true
fi

npm run test:syntax
AGENTVIBES_TEST_MODE=true bats test/unit/*.bats
npm run test:coverage
