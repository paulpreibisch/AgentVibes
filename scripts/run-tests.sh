#!/usr/bin/env bash
# Test runner that suppresses AgentVibes TTS audio for the duration of the test suite.
# Creates $HOME/.agentvibes-tests-running so that play-tts.sh exits early even when
# called from a separate shell process (e.g. a Claude Code hook running concurrently).
# The marker file is removed on EXIT, so it is always cleaned up even when tests fail.

set -euo pipefail

MARKER="$HOME/.agentvibes-tests-running"
# shellcheck disable=SC2064
trap "rm -f '$MARKER'" EXIT
touch "$MARKER"

npm run test:syntax
AGENTVIBES_TEST_MODE=true bats test/unit/*.bats
npm run test:coverage
