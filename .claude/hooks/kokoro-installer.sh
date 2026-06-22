#!/usr/bin/env bash
#
# File: .claude/hooks/kokoro-installer.sh
#
# AgentVibes - Kokoro TTS Installer
# Installs kokoro-onnx and dependencies for local neural TTS.
# Website: https://agentvibes.org
#
# Licensed under the Apache License, Version 2.0
#
# Usage:
#   ./kokoro-installer.sh              # interactive
#   ./kokoro-installer.sh --check      # check only, no install
#   ./kokoro-installer.sh --non-interactive  # install without prompts
#

set -euo pipefail
export LC_ALL=C

NON_INTERACTIVE=false
CHECK_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --non-interactive|--yes|-y) NON_INTERACTIVE=true ;;
    --check) CHECK_ONLY=true ;;
  esac
done

REQUIRED_PACKAGES=("kokoro" "soundfile" "numpy")

# ---------------------------------------------------------------------------
# Check current installation state (use find_spec to avoid slow torch import)
check_kokoro() {
  python3 -c "import importlib.util; exit(0 if importlib.util.find_spec('kokoro') else 1)" 2>/dev/null && \
  python3 -c "import importlib.util; exit(0 if importlib.util.find_spec('soundfile') else 1)" 2>/dev/null && \
  python3 -c "import importlib.util; exit(0 if importlib.util.find_spec('numpy') else 1)" 2>/dev/null
}

if check_kokoro; then
  echo "✅ Kokoro TTS is already installed"
  if [[ "$CHECK_ONLY" == true ]]; then exit 0; fi
  echo ""
  echo "Voice examples:"
  echo "  af_heart  af_nova  af_sky   (American Female)"
  echo "  am_adam   am_michael         (American Male)"
  echo "  bf_emma   bf_isabella        (British Female)"
  echo "  bm_george bm_lewis           (British Male)"
  exit 0
fi

if [[ "$CHECK_ONLY" == true ]]; then
  echo "❌ Kokoro TTS is not installed"
  exit 1
fi

# ---------------------------------------------------------------------------
echo "🎙️  Kokoro TTS Installer"
echo "   High-quality local neural TTS — 60+ voices, 8+ languages"
echo "   No API key needed. Runs 100% offline."
echo "   Model: kokoro-onnx (~82MB download on first use)"
echo ""

if [[ "$NON_INTERACTIVE" != true ]]; then
  read -p "Install Kokoro TTS? [Y/n]: " -r REPLY
  REPLY="${REPLY:-y}"
  if [[ ! "$REPLY" =~ ^[Yy] ]]; then
    echo "Skipping Kokoro installation."
    exit 0
  fi
fi

# Check Python is available
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 is required but not found in PATH" >&2
  echo "   Install with: sudo apt install python3 python3-pip" >&2
  exit 1
fi

echo ""
echo "Installing: ${REQUIRED_PACKAGES[*]}"
echo ""

# Try pip install with PEP 668 fallback to pipx/user install
_install_pkgs() {
  local pkgs=("$@")
  if pip install "${pkgs[@]}" 2>/dev/null; then return 0; fi
  if pip install --user "${pkgs[@]}" 2>/dev/null; then return 0; fi
  if pip3 install "${pkgs[@]}" 2>/dev/null; then return 0; fi
  if pip3 install --user "${pkgs[@]}" 2>/dev/null; then return 0; fi
  if python3 -m pip install "${pkgs[@]}" 2>/dev/null; then return 0; fi
  if python3 -m pip install --user "${pkgs[@]}" 2>/dev/null; then return 0; fi
  return 1
}

if _install_pkgs "${REQUIRED_PACKAGES[@]}"; then
  echo ""
  if check_kokoro; then
    echo "✅ Kokoro TTS installed successfully!"
    echo ""
    echo "Voice examples:"
    echo "  af_heart  af_nova  af_sky   (American Female)"
    echo "  am_adam   am_michael         (American Male)"
    echo "  bf_emma   bf_isabella        (British Female)"
    echo "  bm_george bm_lewis           (British Male)"
    echo ""
    echo "Switch to Kokoro:  /agent-vibes:provider switch kokoro"
  else
    echo "⚠️  Packages installed but import check failed." >&2
    echo "   Try: python3 -c 'import kokoro'" >&2
    exit 1
  fi
else
  echo "❌ Installation failed." >&2
  echo "   Try manually: pip install kokoro-onnx soundfile numpy" >&2
  exit 1
fi
