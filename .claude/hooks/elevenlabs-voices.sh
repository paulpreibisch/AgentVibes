#!/usr/bin/env bash
#
# elevenlabs-voices.sh — GENERATED FILE. DO NOT EDIT.
# DO NOT EDIT — generated from src/services/provider-catalog.js
# Regenerate with: node scripts/generate-provider-catalog.mjs
# content-hash: sha256:5e717024f1250a8f54d07291256e532606dba7b4a15ab9589305d1af6bba7f35
#
# SINGLE SOURCE OF TRUTH for the ElevenLabs voice catalog on the shell side.
# Source it, do not execute it. Consumed by play-tts-elevenlabs.sh and
# voice-manager.sh. These are the ElevenLabs DEFAULT-LIBRARY voices — available to
# every API key (community/library voices that must be added to an account first are
# intentionally excluded so a switch can't fail at synth time).

# Guard against double-sourcing.
[ -n "${_AGENTVIBES_ELEVENLABS_VOICES_LOADED:-}" ] && return 0
_AGENTVIBES_ELEVENLABS_VOICES_LOADED=1

# Default voice used when none is configured.
ELEVENLABS_DEFAULT_VOICE="Sarah"

# Print the catalog voice names, one per line (bash-3.2-safe replacement for the
# old associative-array key expansion "${!ELEVENLABS_VOICE_IDS[@]}").
elevenlabs_voice_names() {
  printf '%s\n' 'Sarah' 'Roger' 'Laura' 'Charlie' 'George' 'Callum' 'River' 'Harry' 'Liam' 'Alice' 'Matilda' 'Will' 'Jessica' 'Eric' 'Bella' 'Chris' 'Brian' 'Daniel' 'Lily' 'Adam' 'Bill'
}

# Resolve a user-supplied name (case-insensitive) OR a raw voice_id to a canonical
# voice_id. Echoes the id and returns 0 on success; returns 1 if the input matches
# no catalog name and is not a raw-id shape. bash-3.2-safe: case statement + tr fold
# (no associative arrays, no case-modifying expansions).
elevenlabs_resolve_voice() {
  local query lc
  query="${1:-}"
  [ -z "$query" ] && return 1
  lc="$(printf '%s' "$query" | tr '[:upper:]' '[:lower:]')"
  case "$lc" in
    'sarah') printf '%s' 'EXAVITQu4vr4xnSDxMaL'; return 0 ;;
    'roger') printf '%s' 'CwhRBWXzGAHq8TQ4Fs17'; return 0 ;;
    'laura') printf '%s' 'FGY2WhTYpPnrIDTdsKH5'; return 0 ;;
    'charlie') printf '%s' 'IKne3meq5aSn9XLyUdCD'; return 0 ;;
    'george') printf '%s' 'JBFqnCBsd6RMkjVDRZzb'; return 0 ;;
    'callum') printf '%s' 'N2lVS1w4EtoT3dr4eOWO'; return 0 ;;
    'river') printf '%s' 'SAz9YHcvj6GT2YYXdXww'; return 0 ;;
    'harry') printf '%s' 'SOYHLrjzK2X1ezoPC6cr'; return 0 ;;
    'liam') printf '%s' 'TX3LPaxmHKxFdv7VOQHJ'; return 0 ;;
    'alice') printf '%s' 'Xb7hH8MSUJpSbSDYk0k2'; return 0 ;;
    'matilda') printf '%s' 'XrExE9yKIg1WjnnlVkGX'; return 0 ;;
    'will') printf '%s' 'bIHbv24MWmeRgasZH58o'; return 0 ;;
    'jessica') printf '%s' 'cgSgspJ2msm6clMCkdW9'; return 0 ;;
    'eric') printf '%s' 'cjVigY5qzO86Huf0OWal'; return 0 ;;
    'bella') printf '%s' 'hpp4J3VqNfWAUOO0d1Us'; return 0 ;;
    'chris') printf '%s' 'iP95p4xoKVk53GoZ742B'; return 0 ;;
    'brian') printf '%s' 'nPczCjzI2devNBz1zQrb'; return 0 ;;
    'daniel') printf '%s' 'onwK4e9ZLuTAKqWW03F9'; return 0 ;;
    'lily') printf '%s' 'pFZP5JQG7iQjIQuC4Bku'; return 0 ;;
    'adam') printf '%s' 'pNInz6obpgDQGcFmaJgB'; return 0 ;;
    'bill') printf '%s' 'pqHfZKP75CvOlQylNhV4'; return 0 ;;
  esac
  # Already a raw ElevenLabs voice_id.
  [[ "$query" =~ ^[A-Za-z0-9]{20}$ ]] && { printf '%s' "$query"; return 0; }
  return 1
}
