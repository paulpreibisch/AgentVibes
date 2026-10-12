#!/usr/bin/env bash
#
# File: .claude/hooks/tests-running-guard.sh
#
# AgentVibes - Text-to-Speech WITH personality for AI Assistants
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Licensed under the Apache License, Version 2.0
#
# @fileoverview Scoped "tests running" mute (sourced, not executed)
# @context scripts/run-tests.sh appends the repo root it is testing to
#   ~/.agentvibes-tests-running (one root per line) and removes it on exit.
#   Speech is muted only for callers whose context directory is inside a listed
#   root, so a test run in one checkout no longer silences every other project
#   on the machine. An EMPTY marker (written by an older runner, or `touch`ed by
#   hand) still mutes everything, as before.
# @related scripts/run-tests.sh, play-tts.sh, audio-processor.sh,
#   hooks-windows/tests-running-guard.ps1, src/console/tabs/setup-tab.js

# Normalise a path for comparison: forward slashes, no trailing slash,
# "C:/x" -> "/c/x" (Git Bash form), lower-case (Windows paths are case-insensitive;
# on Linux a false match can only mean an extra mute, never a missed one).
_av_tests_norm_path() {
  local p="${1//\\//}"
  while [[ "$p" == */ && "$p" != "/" ]]; do p="${p%/}"; done
  if [[ "$p" =~ ^([A-Za-z]):(/.*)?$ ]]; then
    p="/${BASH_REMATCH[1]}${BASH_REMATCH[2]}"
  fi
  printf '%s' "$p" | tr 'A-Z' 'a-z'
}

# av_tests_running_mute [context-dir ...]
# Returns 0 (mute) when a test run covers any of the given directories, or when
# the marker is present but empty (legacy global mute). Returns 1 otherwise.
av_tests_running_mute() {
  local marker="${HOME}/.agentvibes-tests-running" root r ctx c
  [[ -f "$marker" ]] || return 1
  grep -q '[^[:space:]]' "$marker" 2>/dev/null || return 0
  while IFS= read -r root || [[ -n "$root" ]]; do
    root="${root%$'\r'}"
    [[ -n "${root//[[:space:]]/}" ]] || continue
    r="$(_av_tests_norm_path "$root")"
    for ctx in "$@"; do
      [[ -n "$ctx" ]] || continue
      c="$(_av_tests_norm_path "$ctx")"
      if [[ "$c" == "$r" || "$c" == "$r"/* ]]; then
        return 0
      fi
    done
  done < "$marker"
  return 1
}
