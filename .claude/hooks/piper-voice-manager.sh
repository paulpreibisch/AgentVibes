#!/bin/bash
#
# @fileoverview Piper Voice Model Management
# @context Manages downloading, caching, and validating Piper ONNX voice models
# @architecture Voice model lifecycle management for Piper provider
# @dependencies curl, piper binary
# @entrypoints Sourced by play-tts-piper.sh and provider management commands
# @patterns HuggingFace model repository integration, file-based caching
# @related play-tts-piper.sh, provider-manager.sh, GitHub Issue #25
#

# Base URL for Piper voice models on HuggingFace
PIPER_VOICES_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main"

# @function get_voice_storage_dir
# @intent Determine directory for storing Piper voice models
# @why Voice models are large (~25MB each) and should be shared globally across all projects
# @returns Echoes path to voice storage directory (~/.claude/piper-voices)
# @sideeffects Creates directory if it doesn't exist
# @architecture Supports custom path via PIPER_VOICES_DIR env var, defaults to global storage
get_voice_storage_dir() {
  local voice_dir

  # Check for custom path in environment or config file
  if [[ -n "$PIPER_VOICES_DIR" ]]; then
    voice_dir="$PIPER_VOICES_DIR"
  else
    # Check for config file (project-local first, then global)
    local config_file
    if [[ -n "$CLAUDE_PROJECT_DIR" ]] && [[ -f "$CLAUDE_PROJECT_DIR/.claude/piper-voices-dir.txt" ]]; then
      config_file="$CLAUDE_PROJECT_DIR/.claude/piper-voices-dir.txt"
    else
      # Search up directory tree for .claude/
      local current_dir="$PWD"
      while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/.claude/piper-voices-dir.txt" ]]; then
          config_file="$current_dir/.claude/piper-voices-dir.txt"
          break
        fi
        current_dir=$(dirname "$current_dir")
      done

      # Check global config
      if [[ -z "$config_file" ]] && [[ -f "$HOME/.claude/piper-voices-dir.txt" ]]; then
        config_file="$HOME/.claude/piper-voices-dir.txt"
      fi
    fi

    if [[ -n "$config_file" ]]; then
      voice_dir=$(cat "$config_file" | tr -d '[:space:]')
    fi
  fi

  # Fallback to default global storage
  if [[ -z "$voice_dir" ]]; then
    voice_dir="$HOME/.claude/piper-voices"
  fi

  mkdir -p "$voice_dir"
  echo "$voice_dir"
}

# @function verify_voice
# @intent Check if voice model files exist locally
# @why Avoid redundant downloads, detect missing models
# @param $1 {string} voice_name - Voice model name (e.g., en_US-lessac-medium)
# @returns None
# @exitcode 0=voice exists, 1=voice missing
# @sideeffects None
verify_voice() {
  local voice_name="$1"
  local voice_dir
  voice_dir=$(get_voice_storage_dir)

  local onnx_file="$voice_dir/${voice_name}.onnx"
  local json_file="$voice_dir/${voice_name}.onnx.json"

  [[ -f "$onnx_file" ]] && [[ -f "$json_file" ]]
}

# @function get_voice_path
# @intent Get absolute path to voice model ONNX file
# @why Piper binary requires full path to model file
# @param $1 {string} voice_name - Voice model name
# @returns Echoes path to .onnx file
# @exitcode 0=success, 1=voice not found
# @sideeffects None
get_voice_path() {
  local voice_name="$1"
  local voice_dir
  voice_dir=$(get_voice_storage_dir)

  local onnx_file="$voice_dir/${voice_name}.onnx"

  if [[ ! -f "$onnx_file" ]]; then
    echo "❌ Voice model not found: $voice_name" >&2
    return 1
  fi

  echo "$onnx_file"
}

# @function parse_voice_components
# @intent Extract language, locale, speaker, quality from voice name
# @why HuggingFace uses directory structure: lang/locale/speaker/quality
# @param $1 {string} voice_name - Voice name (e.g., en_US-lessac-medium)
# @returns Sets global variables: LANG, LOCALE, SPEAKER, QUALITY
# @sideeffects Sets global variables
# AI NOTE: Voice name format is: lang_LOCALE-speaker-quality
parse_voice_components() {
  local voice_name="$1"

  # Extract components from voice name
  # Format: en_US-lessac-medium
  #         lang_LOCALE-speaker-quality

  local lang_locale="${voice_name%%-*}"  # en_US
  local speaker_quality="${voice_name#*-}"  # lessac-medium

  LANG="${lang_locale%%_*}"  # en
  LOCALE="${lang_locale#*_}"  # US
  SPEAKER="${speaker_quality%%-*}"  # lessac
  QUALITY="${speaker_quality#*-}"  # medium
}

# @function download_voice
# @intent Download Piper voice model from HuggingFace
# @why Provide free offline TTS voices
# @param $1 {string} voice_name - Voice model name
# @param $2 {string} lang_code - Language code (optional, inferred from voice_name)
# @returns None
# @exitcode 0=success, 1=download failed
# @sideeffects Downloads .onnx and .onnx.json files
# @edgecases Handles network failures, validates file integrity
download_voice() {
  local voice_name="$1"
  local lang_code="${2:-}"

  local voice_dir
  voice_dir=$(get_voice_storage_dir)

  # Check if already downloaded
  if verify_voice "$voice_name"; then
    echo "✅ Voice already downloaded: $voice_name"
    return 0
  fi

  # Parse voice components
  parse_voice_components "$voice_name"

  # Construct download URLs
  # Path format: {language}/{language}_{locale}/{speaker}/{quality}/{speaker}-{quality}.onnx
  local model_path="${LANG}/${LANG}_${LOCALE}/${SPEAKER}/${QUALITY}/${voice_name}"
  local onnx_url="${PIPER_VOICES_BASE_URL}/${model_path}.onnx"
  local json_url="${PIPER_VOICES_BASE_URL}/${model_path}.onnx.json"

  echo "📥 Downloading Piper voice: $voice_name"
  echo "   Source: HuggingFace (rhasspy/piper-voices)"
  echo "   Size: ~25MB"
  echo ""

  # Download ONNX model
  echo "   Downloading model file..."
  if ! curl -L --progress-bar -o "$voice_dir/${voice_name}.onnx" "$onnx_url"; then
    echo "❌ Failed to download voice model"
    rm -f "$voice_dir/${voice_name}.onnx"
    return 1
  fi

  # Download JSON config
  echo "   Downloading config file..."
  if ! curl -L -s -o "$voice_dir/${voice_name}.onnx.json" "$json_url"; then
    echo "❌ Failed to download voice config"
    rm -f "$voice_dir/${voice_name}.onnx" "$voice_dir/${voice_name}.onnx.json"
    return 1
  fi

  # Verify file integrity (basic check - file size > 0)
  if [[ ! -s "$voice_dir/${voice_name}.onnx" ]]; then
    echo "❌ Downloaded file is empty or corrupt"
    rm -f "$voice_dir/${voice_name}.onnx" "$voice_dir/${voice_name}.onnx.json"
    return 1
  fi

  echo "✅ Voice downloaded successfully: $voice_name"
  echo "   Location: $voice_dir/${voice_name}.onnx"
}

# @function list_downloaded_voices
# @intent Show all locally cached voice models
# @why Help users see what voices they have available
# @returns Echoes voice names (one per line)
# @exitcode 0=success
# @sideeffects None
list_downloaded_voices() {
  local voice_dir
  voice_dir=$(get_voice_storage_dir)

  echo "📦 Downloaded Piper Voices:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local count=0
  shopt -s nullglob
  for onnx_file in "$voice_dir"/*.onnx; do
    if [[ -f "$onnx_file" ]]; then
      local voice_name
      voice_name=$(basename "$onnx_file" .onnx)
      local file_size
      file_size=$(du -h "$onnx_file" | cut -f1)
      echo "  • $voice_name ($file_size)"
      ((count++))
    fi
  done
  shopt -u nullglob

  if [[ $count -eq 0 ]]; then
    echo "  (No voices downloaded yet)"
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Total: $count voices"
}

# AI NOTE: This file manages the lifecycle of Piper voice models
# Voice models are ONNX files (~20-30MB each) downloaded from HuggingFace
# Files are cached locally to avoid repeated downloads
# Project-local storage preferred over global for isolation
