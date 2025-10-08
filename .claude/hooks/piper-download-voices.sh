#!/bin/bash
#
# @fileoverview Piper Voice Model Downloader
# @context Downloads Piper TTS voice models from HuggingFace
# @purpose Batch download popular voices after installation
# @dependencies piper-voice-manager.sh, piper binary
# @usage ./piper-download-voices.sh [--yes|-y]
#   --yes|-y: Skip confirmation prompt (auto-download)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/piper-voice-manager.sh"

# Parse command line arguments
AUTO_YES=false
if [[ "$1" == "--yes" ]] || [[ "$1" == "-y" ]]; then
  AUTO_YES=true
fi

# Common voice models to download
COMMON_VOICES=(
  "en_US-lessac-medium"      # Default, clear male
  "en_US-amy-medium"         # Warm female
  "en_US-joe-medium"         # Professional male
  "en_US-ryan-high"          # Expressive male
  "en_US-libritts-high"      # Premium quality
)

echo "🎙️  Piper Voice Model Downloader"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will download the most commonly used Piper voice models."
echo "Each voice is approximately 25MB."
echo ""

# Check if piper is installed
if ! command -v piper &> /dev/null; then
  echo "❌ Error: Piper TTS not installed"
  echo "Install with: pipx install piper-tts"
  exit 1
fi

# Get storage directory
VOICE_DIR=$(get_voice_storage_dir)

echo "📂 Storage location: $VOICE_DIR"
echo ""

# Count already downloaded
ALREADY_DOWNLOADED=0
ALREADY_DOWNLOADED_LIST=()
NEED_DOWNLOAD=()

for voice in "${COMMON_VOICES[@]}"; do
  if verify_voice "$voice" 2>/dev/null; then
    ((ALREADY_DOWNLOADED++))
    ALREADY_DOWNLOADED_LIST+=("$voice")
  else
    NEED_DOWNLOAD+=("$voice")
  fi
done

echo "📊 Status:"
echo "   Already downloaded: $ALREADY_DOWNLOADED voice(s)"
echo "   Need to download: ${#NEED_DOWNLOAD[@]} voice(s)"
echo ""

# Show already downloaded voices
if [[ $ALREADY_DOWNLOADED -gt 0 ]]; then
  echo "✅ Already downloaded (skipped):"
  for voice in "${ALREADY_DOWNLOADED_LIST[@]}"; do
    echo "   ✓ $voice"
  done
  echo ""
fi

if [[ ${#NEED_DOWNLOAD[@]} -eq 0 ]]; then
  echo "🎉 All common voices ready to use!"
  exit 0
fi

echo "Voices to download:"
for voice in "${NEED_DOWNLOAD[@]}"; do
  echo "  • $voice (~25MB)"
done
echo ""

# Ask for confirmation (skip if --yes flag provided)
if [[ "$AUTO_YES" == "false" ]]; then
  read -p "Download ${#NEED_DOWNLOAD[@]} voice model(s)? [Y/n]: " -n 1 -r
  echo

  if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
    echo "❌ Download cancelled"
    exit 0
  fi
else
  echo "Auto-downloading ${#NEED_DOWNLOAD[@]} voice model(s)..."
  echo ""
fi

# Download each voice
DOWNLOADED=0
FAILED=0

for voice in "${NEED_DOWNLOAD[@]}"; do
  echo ""
  echo "📥 Downloading: $voice..."

  if download_voice "$voice"; then
    ((DOWNLOADED++))
    echo "✅ Downloaded: $voice"
  else
    ((FAILED++))
    echo "❌ Failed: $voice"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Download Summary:"
echo "   ✅ Successfully downloaded: $DOWNLOADED"
echo "   ❌ Failed: $FAILED"
echo "   📦 Total voices available: $((ALREADY_DOWNLOADED + DOWNLOADED))"
echo ""

if [[ $DOWNLOADED -gt 0 ]]; then
  echo "✨ Ready to use Piper TTS with downloaded voices!"
  echo ""
  echo "Try it:"
  echo "  /agent-vibes:provider switch piper"
  echo "  /agent-vibes:preview"
fi
