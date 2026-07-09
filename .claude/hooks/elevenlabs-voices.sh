#!/usr/bin/env bash
#
# elevenlabs-voices.sh — SINGLE SOURCE OF TRUTH for the ElevenLabs voice catalog
# on the shell side.
#
# This is a DATA file: source it, don't execute it. Both the synth hook
# (play-tts-elevenlabs.sh) and the voice switcher (voice-manager.sh) source this
# so there is exactly one name→id map on the bash side — no divergent copies.
#
# The JS mirror lives in src/services/provider-voice-catalog.js (ELEVENLABS_VOICES)
# for the TUI / list-voices formatter. test/unit/elevenlabs-catalog-parity.test.js
# asserts the two never drift apart.
#
# These are the 21 ElevenLabs DEFAULT-LIBRARY voices — available to every API key
# (community/library voices that require adding to an account are intentionally
# excluded so a switch can't fail at synth time).

# Guard against double-sourcing.
[[ -n "${_AGENTVIBES_ELEVENLABS_VOICES_LOADED:-}" ]] && return 0
_AGENTVIBES_ELEVENLABS_VOICES_LOADED=1

declare -A ELEVENLABS_VOICE_IDS=(
  [Sarah]="EXAVITQu4vr4xnSDxMaL"
  [Roger]="CwhRBWXzGAHq8TQ4Fs17"
  [Laura]="FGY2WhTYpPnrIDTdsKH5"
  [Charlie]="IKne3meq5aSn9XLyUdCD"
  [George]="JBFqnCBsd6RMkjVDRZzb"
  [Callum]="N2lVS1w4EtoT3dr4eOWO"
  [River]="SAz9YHcvj6GT2YYXdXww"
  [Harry]="SOYHLrjzK2X1ezoPC6cr"
  [Liam]="TX3LPaxmHKxFdv7VOQHJ"
  [Alice]="Xb7hH8MSUJpSbSDYk0k2"
  [Matilda]="XrExE9yKIg1WjnnlVkGX"
  [Will]="bIHbv24MWmeRgasZH58o"
  [Jessica]="cgSgspJ2msm6clMCkdW9"
  [Eric]="cjVigY5qzO86Huf0OWal"
  [Bella]="hpp4J3VqNfWAUOO0d1Us"
  [Chris]="iP95p4xoKVk53GoZ742B"
  [Brian]="nPczCjzI2devNBz1zQrb"
  [Daniel]="onwK4e9ZLuTAKqWW03F9"
  [Lily]="pFZP5JQG7iQjIQuC4Bku"
  [Adam]="pNInz6obpgDQGcFmaJgB"
  [Bill]="pqHfZKP75CvOlQylNhV4"
)

# Default voice used when none is configured.
ELEVENLABS_DEFAULT_VOICE="Sarah"

# Resolve a user-supplied name (case-insensitive) OR a raw voice_id to a
# canonical voice_id. Echoes the id and returns 0 on success; returns 1 if the
# input matches no catalog name and is not a raw-id shape.
elevenlabs_resolve_voice() {
  local query="${1:-}"
  [[ -z "$query" ]] && return 1

  # Exact name match (case-insensitive).
  local name
  for name in "${!ELEVENLABS_VOICE_IDS[@]}"; do
    if [[ "${query,,}" == "${name,,}" ]]; then
      printf '%s' "${ELEVENLABS_VOICE_IDS[$name]}"
      return 0
    fi
  done

  # Already a raw ElevenLabs voice_id (or an id present in the catalog).
  if [[ "$query" =~ ^[A-Za-z0-9]{20}$ ]]; then
    printf '%s' "$query"
    return 0
  fi

  return 1
}
