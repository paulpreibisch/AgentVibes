#!/usr/bin/env bash
#
# File: .claude/hooks/python-resolver.sh
#
# AgentVibes - Text-to-Speech WITH personality for AI Assistants
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Licensed under the Apache License, Version 2.0
#
# @fileoverview Locate a WORKING Python 3 interpreter across platforms.
# @context Windows git-bash frequently has NO `python3`/`python` on PATH even when
#          Python is installed (the on-PATH WindowsApps entries are Microsoft Store
#          execution-alias stubs that do not actually run). The old `command -v
#          python3` guard therefore made hooks falsely report "not installed".
# @architecture Sourced (not executed) by hooks; sets and exports $PYTHON_BIN.
#          $PYTHON_BIN is empty when no usable interpreter exists. Callers should
#          test `[[ -n "$PYTHON_BIN" ]]` instead of `command -v python3`.
# @related play-tts.sh, play-tts-kokoro.sh, kokoro-installer.sh, provider-commands.sh
#
# Usage:
#   source "$SCRIPT_DIR/python-resolver.sh"
#   [[ -n "$PYTHON_BIN" ]] || { echo "No Python 3 found" >&2; exit 1; }
#   "$PYTHON_BIN" my-script.py ...
#
# Override: set AGENTVIBES_PYTHON=/path/to/python to force a specific interpreter.

# Fast path: resolve once per process. Several hooks source this file
# transitively (e.g. play-tts.sh -> provider-manager.sh), so if PYTHON_BIN is
# already exported and the file still exists, TRUST it without re-launching
# Python — a fresh interpreter startup per source adds ~100ms of latency per
# utterance for nothing. We only pay the exec-validation cost during genuine
# discovery below, where the Windows Store stub actually needs rejecting.
if [[ -n "${PYTHON_BIN:-}" && -f "$PYTHON_BIN" ]]; then
  export PYTHON_BIN
else
  _AV_PY_CACHE="${HOME}/.claude/config/python-bin.txt"

  # A candidate is valid only if it runs AND is Python 3. Running it filters out
  # the Windows Store alias stub (which exits non-zero when given args); the
  # version check rejects a lone python2 whose py3 syntax would crash at runtime.
  _av_python_valid() {
    [[ -n "${1:-}" ]] || return 1
    "$1" -c 'import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)' >/dev/null 2>&1
  }

  _av_resolve_python() {
    local cand resolved

    # 1. Explicit override wins.
    if [[ -n "${AGENTVIBES_PYTHON:-}" ]] && _av_python_valid "$AGENTVIBES_PYTHON"; then
      printf '%s' "$AGENTVIBES_PYTHON"; return 0
    fi

    # 2. Previously-cached hit (strip a stray CR from a CRLF-edited cache file).
    if [[ -f "$_AV_PY_CACHE" ]]; then
      cand="$(head -1 "$_AV_PY_CACHE" 2>/dev/null | tr -d '\r' || true)"
      if _av_python_valid "$cand"; then printf '%s' "$cand"; return 0; fi
    fi

    # 3. On PATH — but VALIDATE each (rejects the WindowsApps store stub).
    for cand in python3 python python3.13 python3.12 python3.11 python3.10; do
      resolved="$(command -v "$cand" 2>/dev/null || true)"
      if [[ -n "$resolved" ]] && _av_python_valid "$resolved"; then
        printf '%s' "$resolved"; return 0
      fi
    done

    # 4. Windows `py` launcher — ask it for the real interpreter path. Python on
    #    Windows emits CRLF even to a pipe, so strip the trailing CR or the exec
    #    of "…python.exe\r" fails.
    if command -v py >/dev/null 2>&1; then
      cand="$(py -3 -c 'import sys; print(sys.executable)' 2>/dev/null | tr -d '\r' || true)"
      if _av_python_valid "$cand"; then printf '%s' "$cand"; return 0; fi
    fi

    # 5. Known Windows install locations, newest version first. Built with
    #    nullglob into an array so paths containing spaces ("C:\Program Files",
    #    "C:\Users\John Smith\…") survive — an unquoted *variable* glob would
    #    word-split them, which is exactly the case this resolver exists to fix.
    #    This file is SOURCED, so nullglob is saved and restored to avoid leaking
    #    the option into the calling hook.
    local _av_restore_glob; _av_restore_glob="$(shopt -p nullglob 2>/dev/null || true)"
    shopt -s nullglob 2>/dev/null || true
    local -a _av_pys=(
      "${LOCALAPPDATA:-$HOME/AppData/Local}/Programs/Python"/Python3*/python.exe
      "$HOME/AppData/Local/Programs/Python"/Python3*/python.exe
      /c/Python3*/python.exe
      "/c/Program Files/Python3"*/python.exe
      "/c/Program Files (x86)/Python3"*/python.exe
    )
    eval "${_av_restore_glob:-shopt -u nullglob}" 2>/dev/null || true
    # Version-sort descending (Python312 before Python39 — a plain sort -r is
    # lexical and would rank "39" above "312"); NUL-delimited so spacey paths
    # stay intact. `sort -zrV` is GNU coreutils, which git-bash ships (this glob
    # only ever matches under git-bash anyway).
    if [[ ${#_av_pys[@]} -gt 0 ]]; then
      while IFS= read -r -d '' cand; do
        _av_python_valid "$cand" && { printf '%s' "$cand"; return 0; }
      done < <(printf '%s\0' "${_av_pys[@]}" | sort -zrV 2>/dev/null)
    fi

    return 1
  }

  PYTHON_BIN="$(_av_resolve_python || true)"
  export PYTHON_BIN

  # Cache a fresh discovery (best-effort; never fatal). Only rewrite when it
  # actually changed, to avoid needless disk writes on every hook invocation.
  if [[ -n "$PYTHON_BIN" ]]; then
    if [[ ! -f "$_AV_PY_CACHE" ]] || [[ "$(head -1 "$_AV_PY_CACHE" 2>/dev/null | tr -d '\r' || true)" != "$PYTHON_BIN" ]]; then
      mkdir -p "$(dirname "$_AV_PY_CACHE")" 2>/dev/null || true
      printf '%s\n' "$PYTHON_BIN" > "$_AV_PY_CACHE" 2>/dev/null || true
    fi
  fi
fi
