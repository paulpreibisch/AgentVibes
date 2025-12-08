# VibeVoice Provider - Proof of Concept

🎭 **Multi-speaker conversational TTS for AgentVibes party-mode**

This branch contains a proof-of-concept integration of Microsoft's VibeVoice into AgentVibes as a new TTS provider.

## Quick Start

```bash
# 1. Install dependencies
./scripts/setup-vibevoice.sh

# 2. Test basic functionality
.claude/hooks/play-tts-vibevoice.sh "Hello from VibeVoice!"

# 3. Try different speakers
.claude/hooks/play-tts-vibevoice.sh "I'm speaker 2" "2"
```

## What's New

### Files Added

```
.claude/hooks/
├── play-tts-vibevoice.sh      # VibeVoice provider (bash)
└── vibevoice-wrapper.py        # Python wrapper for VibeVoice API

scripts/
└── setup-vibevoice.sh          # Automated setup script

docs/
└── VIBEVOICE_POC.md           # Detailed documentation

requirements-vibevoice.txt      # Python dependencies
```

### Features

- ✅ **Multi-speaker support**: 4 distinct voices (alice, bob, carol, david)
- ✅ **Provider integration**: Seamlessly integrated with AgentVibes provider system
- ✅ **Speaker mapping**: Friendly names instead of numeric IDs
- ✅ **GPU optimized**: Works with 6GB+ VRAM GPUs
- ⚠️ **POC status**: Currently uses placeholder audio (sine waves)

## System Requirements

### Hardware
- **GPU**: NVIDIA GPU with 8GB VRAM recommended (6GB minimum)
- **RAM**: 16GB+ system RAM
- **Storage**: ~5GB for model and dependencies

### Software
- **OS**: Linux, WSL2, or macOS with NVIDIA GPU
- **Python**: 3.8 or higher
- **CUDA**: 11.0+ (for GPU acceleration)
- **Audio**: ffplay, aplay, or afplay for playback

## Installation

### Option 1: Automated Setup (Recommended)

```bash
cd /home/fire/claude/AgentVibes-vibevoice-poc
./scripts/setup-vibevoice.sh
```

The script will:
1. Check GPU availability
2. Verify Python installation
3. Install Python dependencies
4. Download VibeVoice model (~3GB)
5. Configure AgentVibes provider

### Option 2: Manual Setup

```bash
# Install Python dependencies
pip install -r requirements-vibevoice.txt

# Download model (first use only)
python3 -c "from transformers import AutoModelForCausalLM; \
AutoModelForCausalLM.from_pretrained('microsoft/VibeVoice-1.5B', trust_remote_code=True)"

# Make scripts executable
chmod +x .claude/hooks/play-tts-vibevoice.sh
chmod +x .claude/hooks/vibevoice-wrapper.py

# Set as active provider
echo "vibevoice" > .claude/tts-provider.txt
```

## Usage

### Basic TTS

```bash
# Default speaker (0 - Alice)
.claude/hooks/play-tts-vibevoice.sh "Hello, I'm Alice!"

# Specific speaker by ID (0-3)
.claude/hooks/play-tts-vibevoice.sh "I'm Bob" "1"

# Specific speaker by name
.claude/hooks/play-tts-vibevoice.sh "Hey there!" "carol"
```

### Voice Switching

```bash
# Via slash command
/agent-vibes:switch alice
/agent-vibes:switch bob
/agent-vibes:switch 2

# Via voice manager
.claude/hooks/voice-manager.sh switch alice
```

### Speaker Names

| ID | Name | Character |
|----|------|-----------|
| 0 | alice, female1, speaker0 | Default female |
| 1 | bob, male1, speaker1 | Default male |
| 2 | carol, female2, speaker2 | Alt female |
| 3 | david, male2, speaker3 | Alt male |

## Testing

### GPU Test

```bash
# Monitor GPU while running
nvidia-smi -l 1

# In another terminal
.claude/hooks/play-tts-vibevoice.sh "Testing GPU usage"
```

### All Speakers Test

```bash
# Test each speaker
for i in {0..3}; do
  .claude/hooks/play-tts-vibevoice.sh "I am speaker $i" "$i"
  sleep 2
done
```

### Party Mode Test

```bash
# Simulate multi-agent conversation
.claude/hooks/play-tts-vibevoice.sh "PM: Let's discuss the architecture" "alice"
sleep 1
.claude/hooks/play-tts-vibevoice.sh "Architect: I suggest microservices" "bob"
sleep 1
.claude/hooks/play-tts-vibevoice.sh "Dev: That sounds complex" "carol"
sleep 1
.claude/hooks/play-tts-vibevoice.sh "TEA: Let's test it thoroughly" "david"
```

## POC Status

### ✅ What Works

- Provider architecture integration
- Speaker ID mapping and voice switching
- Python wrapper structure
- GPU detection and optimization flags
- Audio file generation (placeholder)

### ⚠️ What's Missing (TODO)

- **Real VibeVoice API integration** - Currently generates placeholder sine waves
- **Actual model inference** - Need to implement proper audio synthesis
- **Streaming support** - For low-latency real-time TTS
- **Multi-speaker orchestration** - Conversation turn management
- **Memory optimization** - Better quantization for 6GB GPUs
- **Background music mixing** - Integration with AgentVibes audio effects
- **Voice customization** - Speaker personality tuning

### Known Issues

1. ⚠️ **Placeholder Audio**: Generates simple sine waves instead of real speech
2. ⚠️ **VibeVoice SDK**: Real integration requires Microsoft's official SDK/API
3. ⚠️ **Memory Usage**: 1.5B model needs ~6GB VRAM minimum
4. ⚠️ **First Run Slow**: Initial model download and loading takes time
5. ⚠️ **Research License**: Not for commercial use without proper licensing

## Architecture

```
User Request
    ↓
play-tts.sh (router)
    ↓
provider-manager.sh (provider selection)
    ↓
play-tts-vibevoice.sh (bash provider)
    ↓
vibevoice-wrapper.py (Python API)
    ↓
VibeVoice Model (HuggingFace)
    ↓
Audio Output (WAV file)
    ↓
Audio Player (ffplay/aplay)
```

## Next Steps for Production

1. **Integrate Real VibeVoice API**
   - Use official Microsoft VibeVoice SDK
   - Implement proper audio synthesis
   - Add streaming capabilities

2. **Optimize Performance**
   - Model quantization (int8/int4)
   - Memory-efficient loading
   - GPU memory monitoring

3. **Party Mode Integration**
   - Auto-assign speakers to BMAD agents
   - Conversation orchestration
   - Speaker transitions

4. **Testing & Validation**
   - Benchmark latency and quality
   - Multi-language testing
   - Memory profiling

5. **Production Polish**
   - Error handling and fallbacks
   - Comprehensive logging
   - User documentation

## Documentation

- **Detailed POC Docs**: [docs/VIBEVOICE_POC.md](docs/VIBEVOICE_POC.md)
- **VibeVoice GitHub**: https://github.com/microsoft/VibeVoice
- **HuggingFace Model**: https://huggingface.co/microsoft/VibeVoice-1.5B
- **AgentVibes Docs**: [README.md](README.md)

## Troubleshooting

### GPU Not Detected

```bash
# Check NVIDIA driver
nvidia-smi

# Check CUDA
nvcc --version

# Verify PyTorch sees GPU
python3 -c "import torch; print(torch.cuda.is_available())"
```

### Model Download Fails

```bash
# Manual download
python3 -c "from transformers import AutoModelForCausalLM; \
AutoModelForCausalLM.from_pretrained('microsoft/VibeVoice-1.5B', trust_remote_code=True)"

# Check HuggingFace cache
ls -lh ~/.cache/huggingface/hub/
```

### Audio Playback Issues

```bash
# Install audio player
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Test playback
ffplay -nodisp -autoexit test.wav
```

## Contributing

This is a POC branch. To contribute:

1. Test the setup on your hardware
2. Report issues with GPU/memory configuration
3. Suggest improvements to speaker mapping
4. Help with real VibeVoice API integration

## License

- **AgentVibes**: Apache 2.0
- **VibeVoice**: Research-only (see Microsoft's license)

---

**Branch**: `feature/vibevoice-provider-poc`
**Status**: 🚧 Proof of Concept
**Last Updated**: 2025-12-08
