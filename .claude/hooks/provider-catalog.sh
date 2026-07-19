#!/usr/bin/env bash
#
# provider-catalog.sh — GENERATED FILE. DO NOT EDIT.
# DO NOT EDIT — generated from src/services/provider-catalog.js
# Regenerate with: node scripts/generate-provider-catalog.mjs
# content-hash: sha256:5e717024f1250a8f54d07291256e532606dba7b4a15ab9589305d1af6bba7f35
#
# Bash-3.2-safe catalog accessors (macOS ships bash 3.2 — no associative
# arrays, no case-modifying parameter expansions). Source this file; do not execute it.

AGENTVIBES_CATALOG_VERSION="5e717024f1250a8f"

# Guard against double-sourcing.
[ -n "${_AGENTVIBES_PROVIDER_CATALOG_LOADED:-}" ] && return 0
_AGENTVIBES_PROVIDER_CATALOG_LOADED=1

# Lowercase a string without case-modifying expansions (unavailable in bash 3.2).
_catalog_lc() { printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]'; }

# Resolve an id-or-alias to its canonical provider id (echoes it; 1 if unknown).
catalog_canonical_provider() {
  case "$(_catalog_lc "${1:-}")" in
    soprano) printf '%s' 'soprano' ;;
    piper) printf '%s' 'piper' ;;
    kokoro) printf '%s' 'kokoro' ;;
    elevenlabs) printf '%s' 'elevenlabs' ;;
    macos|macos-say|say) printf '%s' 'macos' ;;
    windows-sapi|sapi) printf '%s' 'windows-sapi' ;;
    windows-piper) printf '%s' 'windows-piper' ;;
    *) return 1 ;;
  esac
}

# Echo the default voice for a provider (empty string is valid — system default).
catalog_default_voice() {
  local _p; _p="$(catalog_canonical_provider "${1:-}")" || return 1
  case "$_p" in
    soprano) printf '%s' 'soprano-default' ;;
    piper) printf '%s' 'en_US-lessac-medium' ;;
    kokoro) printf '%s' 'af_heart' ;;
    elevenlabs) printf '%s' 'Sarah' ;;
    macos) printf '%s' 'Samantha' ;;
    windows-sapi) printf '%s' '' ;;
    windows-piper) printf '%s' 'en_US-lessac-medium' ;;
  esac
}

# Echo a human display name for a provider.
catalog_display_name() {
  local _p; _p="$(catalog_canonical_provider "${1:-}")" || { printf '%s' "${1:-}"; return 0; }
  case "$_p" in
    soprano) printf '%s' 'Soprano TTS' ;;
    piper) printf '%s' 'Piper TTS' ;;
    kokoro) printf '%s' 'Kokoro TTS' ;;
    elevenlabs) printf '%s' 'ElevenLabs' ;;
    macos) printf '%s' 'macOS Say' ;;
    windows-sapi) printf '%s' 'Windows SAPI' ;;
    windows-piper) printf '%s' 'Piper TTS' ;;
  esac
}

# Print the provider ids playable on a platform (unix|darwin|windows), one per line.
catalog_providers_for_platform() {
  case "$(_catalog_lc "${1:-}")" in
    unix)
      printf '%s\n' 'soprano' 'piper' 'kokoro' 'elevenlabs'
      ;;
    darwin)
      printf '%s\n' 'soprano' 'piper' 'kokoro' 'elevenlabs' 'macos'
      ;;
    windows)
      printf '%s\n' 'soprano' 'kokoro' 'windows-sapi' 'windows-piper'
      ;;
    *) return 1 ;;
  esac
}

# Print a provider's listable voices (ids for kokoro, names for elevenlabs), one per line.
# Discovered providers (piper/macos/sapi) enumerate at runtime and print nothing here.
catalog_list_voices() {
  local _p; _p="$(catalog_canonical_provider "${1:-}")" || return 1
  case "$_p" in
    soprano)
      printf '%s\n' 'soprano-default'
      ;;
    piper)
      : # (none — enumerated at runtime)
      ;;
    kokoro)
      printf '%s\n' 'af_heart' 'af_alloy' 'af_aoede' 'af_bella' 'af_jessica' 'af_kore' 'af_nicole' 'af_nova' 'af_river' 'af_sarah' 'af_sky' 'am_adam' 'am_echo' 'am_eric' 'am_fenrir' 'am_liam' 'am_michael' 'am_onyx' 'am_puck' 'bf_alice' 'bf_emma' 'bf_isabella' 'bf_lily' 'bm_daniel' 'bm_fable' 'bm_george' 'bm_lewis' 'jf_alpha' 'jf_gongitsune' 'jf_nezumi' 'jf_tebukuro' 'jm_kumo' 'zf_xiaobei' 'zf_xiaoni' 'zf_xiaoxiao' 'zf_xiaoyi' 'zm_yunxi' 'zm_yunxia' 'zm_yunyang' 'ef_dora' 'em_alex' 'em_santa' 'ff_siwis' 'hf_alpha' 'hm_omega' 'if_sara' 'im_nicola' 'pf_dora' 'pm_alex' 'pm_santa' 'kf_alpha' 'km_hyunsu'
      ;;
    elevenlabs)
      printf '%s\n' 'Sarah' 'Roger' 'Laura' 'Charlie' 'George' 'Callum' 'River' 'Harry' 'Liam' 'Alice' 'Matilda' 'Will' 'Jessica' 'Eric' 'Bella' 'Chris' 'Brian' 'Daniel' 'Lily' 'Adam' 'Bill'
      ;;
    macos)
      : # (none — enumerated at runtime)
      ;;
    windows-sapi)
      : # (none — enumerated at runtime)
      ;;
    windows-piper)
      : # (none — enumerated at runtime)
      ;;
  esac
}

# Validate a voice for a provider. Echoes the canonical voice and returns 0 on
# success; returns 1 (no output) on rejection. Mirrors validateVoice() in the JS SSOT.
catalog_validate_voice() {
  local _p _v _lc; _p="$(catalog_canonical_provider "${1:-}")" || return 1
  _v="${2:-}"; _lc="$(_catalog_lc "$_v")"
  case "$_p" in
    kokoro)
      case "$_lc" in
        'af_heart'|'af_alloy'|'af_aoede'|'af_bella'|'af_jessica'|'af_kore'|'af_nicole'|'af_nova'|'af_river'|'af_sarah'|'af_sky'|'am_adam'|'am_echo'|'am_eric'|'am_fenrir'|'am_liam'|'am_michael'|'am_onyx'|'am_puck'|'bf_alice'|'bf_emma'|'bf_isabella'|'bf_lily'|'bm_daniel'|'bm_fable'|'bm_george'|'bm_lewis'|'jf_alpha'|'jf_gongitsune'|'jf_nezumi'|'jf_tebukuro'|'jm_kumo'|'zf_xiaobei'|'zf_xiaoni'|'zf_xiaoxiao'|'zf_xiaoyi'|'zm_yunxi'|'zm_yunxia'|'zm_yunyang'|'ef_dora'|'em_alex'|'em_santa'|'ff_siwis'|'hf_alpha'|'hm_omega'|'if_sara'|'im_nicola'|'pf_dora'|'pm_alex'|'pm_santa'|'kf_alpha'|'km_hyunsu')
          printf '%s' "$_lc"; return 0 ;;
      esac
      return 1 ;;
    elevenlabs)
      case "$_lc" in
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
      [[ "$_v" =~ ^[A-Za-z0-9]{20}$ ]] && { printf '%s' "$_v"; return 0; }
      return 1 ;;
    soprano)
      case "$_lc" in
        ''|soprano|soprano-default) printf '%s' 'soprano-default'; return 0 ;;
      esac
      return 1 ;;
    piper|windows-piper)
      if [[ "$_v" =~ ^[a-z]{2,3}_[A-Z]{2}- ]] || [[ "$_v" == *"::"* ]]; then
        printf '%s' "$_v"; return 0
      fi
      return 1 ;;
    macos|windows-sapi)
      if [ -n "$_v" ]; then printf '%s' "$_v"; return 0; fi
      [ "$_p" = windows-sapi ] && { printf '%s' ''; return 0; }
      return 1 ;;
  esac
  return 1
}
