#!/usr/bin/env bash
#
# VibeVoice Provider Setup Script
# Installs dependencies and configures VibeVoice for AgentVibes
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  VibeVoice Provider Setup for AgentVibes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Step 1: Check GPU
echo -e "${YELLOW}[1/5] Checking GPU availability...${NC}"
if command -v nvidia-smi &>/dev/null; then
  GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits | head -1)
  GPU_NAME=$(echo "$GPU_INFO" | cut -d',' -f1 | xargs)
  GPU_VRAM=$(echo "$GPU_INFO" | cut -d',' -f2 | xargs)

  echo -e "${GREEN}✓ GPU detected: $GPU_NAME${NC}"
  echo -e "  VRAM: ${GPU_VRAM}MB"

  if (( GPU_VRAM < 6000 )); then
    echo -e "${RED}⚠️  Warning: GPU has less than 6GB VRAM${NC}"
    echo -e "   VibeVoice may run slowly or fail"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
else
  echo -e "${RED}⚠️  No NVIDIA GPU detected${NC}"
  echo -e "   VibeVoice will run on CPU (very slow)"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo ""

# Step 2: Check Python
echo -e "${YELLOW}[2/5] Checking Python installation...${NC}"
if ! command -v python3 &>/dev/null; then
  echo -e "${RED}✗ Python 3 not found${NC}"
  echo -e "  Please install Python 3.8 or higher"
  exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"
echo ""

# Step 3: Install Python dependencies
echo -e "${YELLOW}[3/5] Installing Python dependencies...${NC}"
echo -e "  This may take several minutes..."

if [[ -f "$PROJECT_ROOT/requirements-vibevoice.txt" ]]; then
  if pip3 install -r "$PROJECT_ROOT/requirements-vibevoice.txt" --quiet; then
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
  else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ requirements-vibevoice.txt not found${NC}"
  exit 1
fi
echo ""

# Step 4: Download VibeVoice model (optional pre-download)
echo -e "${YELLOW}[4/5] VibeVoice model download${NC}"
echo -e "  Model size: ~3GB"
read -p "Download model now? (Y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$  ]] || [[ -z $REPLY ]]; then
  echo -e "  Downloading microsoft/VibeVoice-1.5B..."
  if python3 -c "from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained('microsoft/VibeVoice-1.5B', trust_remote_code=True)" 2>&1 | grep -q "Downloading"; then
    echo -e "${GREEN}✓ Model downloaded${NC}"
  else
    echo -e "${YELLOW}⚠️  Model may already be cached or download failed${NC}"
  fi
else
  echo -e "${YELLOW}⊘ Skipped - model will download on first use${NC}"
fi
echo ""

# Step 5: Enable VibeVoice provider
echo -e "${YELLOW}[5/5] Configuring AgentVibes...${NC}"

# Make scripts executable
chmod +x "$PROJECT_ROOT/.claude/hooks/play-tts-vibevoice.sh"
chmod +x "$PROJECT_ROOT/.claude/hooks/vibevoice-wrapper.py"
echo -e "${GREEN}✓ Scripts configured${NC}"

# Register provider
PROVIDER_FILE="$PROJECT_ROOT/.claude/tts-provider.txt"
echo "vibevoice" > "$PROVIDER_FILE"
echo -e "${GREEN}✓ VibeVoice set as active provider${NC}"
echo ""

# Success message
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ VibeVoice Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Test basic TTS:"
echo -e "     ${BLUE}.claude/hooks/play-tts-vibevoice.sh \"Hello from VibeVoice\"${NC}"
echo ""
echo -e "  2. Try different speakers:"
echo -e "     ${BLUE}.claude/hooks/play-tts-vibevoice.sh \"Speaker 1\" \"1\"${NC}"
echo -e "     ${BLUE}.claude/hooks/play-tts-vibevoice.sh \"I'm Alice\" \"alice\"${NC}"
echo ""
echo -e "  3. Switch voices via AgentVibes:"
echo -e "     ${BLUE}/agent-vibes:switch alice${NC}"
echo ""
echo -e "${YELLOW}Note: This is a POC with placeholder audio generation${NC}"
echo -e "      Real VibeVoice API integration is needed for production"
echo ""
