# VibeVoice Provider - Proof of Concept

## Overview

This POC integrates Microsoft's **VibeVoice** multi-speaker conversational TTS into AgentVibes as a new provider. VibeVoice enables natural, podcast-style conversations between multiple AI agents - perfect for AgentVibes' party-mode feature!

## What is VibeVoice?

**VibeVoice** is Microsoft's open-source research framework for generating expressive, long-form, multi-speaker conversational audio.

### Key Features
- **Multi-speaker synthesis**: Up to 4 distinct speakers in conversations
- **Long-form generation**: Synthesize up to 90 minutes of continuous speech
- **Real-time streaming**: Produces initial audio in ~300ms
- **Multi-language support**: Experimental support for 9 languages
- **Natural conversation**: Expressive, podcast-quality speech

### Technology
- Built on Qwen2.5 1.5B LLM
- Continuous speech tokenizers at 7.5 Hz
- Next-token diffusion framework

## Architecture Integration

### Provider Pattern

VibeVoice follows AgentVibes' existing provider architecture:

```
play-tts.sh (router)
    ↓
provider-manager.sh
    ↓
play-tts-vibevoice.sh (VibeVoice provider)
    ↓
vibevoice-wrapper.py (Python API wrapper)
    ↓
Microsoft VibeVoice Model
```

### File Structure

```
.claude/hooks/
├── play-tts-vibevoice.sh      # Bash provider implementation
├── vibevoice-wrapper.py        # Python wrapper for VibeVoice API
└── provider-manager.sh         # Registers VibeVoice as available provider

requirements-vibevoice.txt       # Python dependencies
```

## Installation

### Prerequisites

1. **GPU Requirements**
   - NVIDIA GPU with 8GB+ VRAM (e.g., RTX 3060, RTX 4060)
   - CUDA toolkit installed
   - For RTX 3060 (6GB): Model will use optimizations (float16, memory efficient)

2. **Software Requirements**
   - Python 3.8+
   - PyTorch with CUDA support
   - ffmpeg or aplay for audio playback

### Setup Steps

1. **Install Python Dependencies**
   ```bash
   pip install -r requirements-vibevoice.txt
   ```

2. **Download VibeVoice Model** (first run only)
   ```bash
   # The model will auto-download on first use (~3GB)
   # Or pre-download:
   python3 -c "from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained('microsoft/VibeVoice-1.5B', trust_remote_code=True)"
   ```

3. **Enable VibeVoice Provider**
   ```bash
   # Switch to VibeVoice provider
   /agent-vibes:provider switch vibevoice
   ```

## Usage

### Basic TTS

```bash
# Use default speaker (0)
.claude/hooks/play-tts-vibevoice.sh "Hello from VibeVoice!"

# Specify speaker by ID (0-3)
.claude/hooks/play-tts-vibevoice.sh "I'm speaker 1" "1"

# Specify speaker by name
.claude/hooks/play-tts-vibevoice.sh "I'm Alice" "alice"
```

### Speaker Mapping

The POC includes placeholder speaker mappings:

| Speaker ID | Voice Name | Character |
|------------|------------|-----------|
| 0 | Alice / Female1 | Default female voice |
| 1 | Bob / Male1 | Default male voice |
| 2 | Carol / Female2 | Alternative female voice |
| 3 | David / Male2 | Alternative male voice |

### Party Mode Integration

VibeVoice shines in multi-agent conversations:

```bash
# In party-mode, different agents can use different speakers
# Agent PM uses speaker 0 (Alice)
# Agent Architect uses speaker 1 (Bob)
# Agent Dev uses speaker 2 (Carol)
# Agent TEA uses speaker 3 (David)
```

### Voice Switching

```bash
# Through slash commands
/agent-vibes:switch alice
/agent-vibes:switch bob
/agent-vibes:switch 2  # Speaker ID

# Programmatically
.claude/hooks/voice-manager.sh switch alice
```

## POC Limitations & Notes

### Current POC Status

⚠️ **This is a PROOF OF CONCEPT** - Not production ready!

**What Works:**
- ✅ Provider architecture integration
- ✅ Python wrapper structure
- ✅ Speaker ID mapping
- ✅ Audio file generation placeholder
- ✅ AgentVibes provider system compatibility

**What Needs Implementation:**
- ⚠️ Actual VibeVoice API integration (currently using placeholder audio)
- ⚠️ Real audio synthesis from model
- ⚠️ Streaming support for low latency
- ⚠️ Multi-speaker conversation orchestration
- ⚠️ Voice cloning/customization
- ⚠️ Background music mixing for VibeVoice output
- ⚠️ GPU memory optimization for 6GB cards

### Known Issues

1. **Placeholder Audio**: Current POC generates sine wave audio as a placeholder
2. **VibeVoice API**: Real VibeVoice API integration requires their actual SDK
3. **Memory Usage**: 1.5B model needs optimization for 6GB GPU
4. **First Run**: Initial model download is ~3GB and takes time

### Research License

⚠️ **VibeVoice is research-only** - Not recommended for commercial use without further testing and development. See [Microsoft VibeVoice License](https://github.com/microsoft/VibeVoice).

## Next Steps for Production

To make this production-ready:

1. **Integrate Real VibeVoice API**
   - Replace placeholder synthesis with actual VibeVoice model calls
   - Implement proper audio decoding
   - Add streaming support

2. **Optimize for 6GB GPU**
   - Use model quantization (int8/int4)
   - Implement model sharding
   - Add memory monitoring and fallback

3. **Party Mode Enhancement**
   - Auto-assign speakers to BMAD agents
   - Implement conversation turn management
   - Add speaker transitions and overlays

4. **Testing & Validation**
   - Test all 4 speakers
   - Benchmark latency and quality
   - Memory profiling on target hardware
   - Multi-language testing

5. **Documentation**
   - API reference
   - Speaker customization guide
   - Troubleshooting guide

## Testing

### Test Basic Functionality

```bash
# Test speaker 0
.claude/hooks/play-tts-vibevoice.sh "Testing speaker zero" "0"

# Test all speakers
for i in {0..3}; do
  .claude/hooks/play-tts-vibevoice.sh "I am speaker $i" "$i"
done

# Test speaker names
.claude/hooks/play-tts-vibevoice.sh "Hello, I'm Alice" "alice"
.claude/hooks/play-tts-vibevoice.sh "Hi, I'm Bob" "bob"
```

### Verify GPU Usage

```bash
# Monitor GPU while running
nvidia-smi -l 1

# In another terminal, run synthesis
.claude/hooks/play-tts-vibevoice.sh "Monitor GPU usage"
```

## Architecture Decisions

### Why This Approach?

1. **Provider Pattern**: Seamless integration with existing AgentVibes architecture
2. **Python Wrapper**: Easier to work with PyTorch/HuggingFace ecosystem
3. **Speaker Mapping**: Abstracts VibeVoice's speaker IDs into friendly names
4. **Lazy Loading**: Model loads on first use to save memory
5. **Security**: Input validation prevents command injection

### Trade-offs

**Pros:**
- Clean separation of concerns
- Easy to test and iterate
- Compatible with existing AgentVibes features
- Multi-speaker support for party mode

**Cons:**
- Python subprocess overhead (~100-200ms)
- GPU memory footprint (3-6GB)
- Model loading time on first use (~10-30s)
- Research license restrictions

## Resources

- [Microsoft VibeVoice GitHub](https://github.com/microsoft/VibeVoice)
- [VibeVoice Model on HuggingFace](https://huggingface.co/microsoft/VibeVoice-1.5B)
- [VibeVoice Official Site](https://microsoft.github.io/VibeVoice/)
- [AgentVibes Provider Documentation](../README.md)

## Support

For issues or questions:
- VibeVoice: [GitHub Issues](https://github.com/microsoft/VibeVoice/issues)
- AgentVibes: [GitHub Issues](https://github.com/paulpreibisch/AgentVibes/issues)

---

**Status**: 🚧 Proof of Concept
**Last Updated**: 2025-12-08
**Author**: AgentVibes Team with Claude AI
