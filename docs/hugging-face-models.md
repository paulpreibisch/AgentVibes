# 🤗 Hugging Face AI Voice Models

**AgentVibes' Piper TTS uses 100% Hugging Face-trained AI voice models** from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices).

## What are Hugging Face voice models?

Hugging Face voice models are pre-trained artificial intelligence models hosted on the Hugging Face Model Hub platform, designed to convert text into human-like speech (Text-to-Speech or TTS) or perform other speech tasks like voice cloning and speech-to-speech translation. They're accessible via their Transformers library for easy use in applications like voice assistants, audio generation, and more.

## Key Benefits

- 🎯 **Human-like Speech** - VITS-based neural models for natural pronunciation and intonation
- 🌍 **35+ Languages** - Multilingual support with native accents
- 🆓 **100% Open Source** - All Piper voices are free HF models (Tacotron2, FastSpeech2, VITS)
- 🔧 **Developer-Friendly** - Fine-tune, customize, or deploy for various audio projects
- ⚡ **Offline & Fast** - No API keys, no internet needed once installed

## Voice Sources

All 50+ Piper voices AgentVibes provides are sourced from Hugging Face's open-source AI voice models, ensuring high-quality, natural-sounding speech synthesis across all supported platforms.

### Popular Voice Models Available

- **English**: Male and female voices with various accents (US, UK, Australian)
- **Spanish**: Native Spanish speakers with clear pronunciation
- **French**: Professional French voices
- **German**: High-quality German voices
- **35+ Additional Languages**: Global language support with native speakers

### Technical Details

**Model Architecture:**
- **Tacotron2** - Classic sequence-to-sequence model for TTS
- **FastSpeech2** - Faster inference with quality comparable to Tacotron2
- **VITS** - Variational Inference with adversarial learning for TTS

**Training Data:**
- Models trained on high-quality public datasets
- Licensed under permissive open-source licenses
- Continuously updated with community contributions

### Getting Started

Once AgentVibes is installed, you automatically have access to all Piper voices:

```bash
# List all available voices
/agent-vibes:list

# Switch to a specific voice
/agent-vibes:switch en_US-amy-medium

# Preview voices before selecting
/agent-vibes:preview
```

### Why Hugging Face?

1. **No API Costs** - All models are free and open-source
2. **Privacy First** - Everything runs locally on your machine
3. **Community Driven** - Continuous improvements from ML community
4. **Flexibility** - Fine-tune models for custom applications
5. **Quality** - State-of-the-art neural TTS technology

### Learn More

- [Hugging Face Model Hub](https://huggingface.co/)
- [Piper Voices Repository](https://huggingface.co/rhasspy/piper-voices)
- [Tacotron2 Paper](https://arxiv.org/abs/1703.10135)
- [FastSpeech2 Paper](https://arxiv.org/abs/2006.04558)
- [VITS Paper](https://arxiv.org/abs/2106.06103)
