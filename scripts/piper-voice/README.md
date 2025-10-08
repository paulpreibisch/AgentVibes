# 🎤 Piper TTS Installation for AgentVibes

This directory contains installation scripts for [Piper TTS](https://github.com/rhasspy/piper), a fast, local neural text-to-speech system.

## Why Piper?

- ✅ **100% Free** - No API costs, ever
- ✅ **Offline** - Works without internet connection
- ✅ **Cross-platform** - Windows, macOS, Linux
- ✅ **High Quality** - Comparable to Google TTS
- ✅ **Fast** - Even runs on Raspberry Pi
- ✅ **No Rate Limits** - Generate unlimited audio

## Installation

### For WSL (Windows Subsystem for Linux)

```bash
# Run the installation script
./scripts/piper-voice/wsl-install.sh
```

**What it does:**
1. Installs Python dependencies (pipx)
2. Installs Piper TTS via pipx
3. Downloads English US voice (medium quality, ~20MB)
4. Tests the installation
5. Provides usage examples

**Requirements:**
- WSL2 (Ubuntu/Debian-based)
- Internet connection (for initial download)
- ~50MB disk space

### Manual Installation

If you prefer manual installation or need a different platform:

```bash
# Install via pipx
pipx install piper-tts

# Download voices manually
mkdir -p ~/.local/share/piper/voices
cd ~/.local/share/piper/voices

# Download a voice from HuggingFace
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
```

## Usage

### Basic Usage

```bash
# Generate speech to file
echo "Hello from Piper!" | piper \
  --model ~/.local/share/piper/voices/en_US-lessac-medium.onnx \
  --output_file output.wav

# Play immediately (WSL)
echo "Hello from Piper!" | piper \
  --model ~/.local/share/piper/voices/en_US-lessac-medium.onnx \
  --output_file - | paplay
```

### With AgentVibes

Integration with AgentVibes is coming soon! This will allow you to:
- Use Piper as an alternative to ElevenLabs
- Switch between providers with `/agent-vibes:provider`
- Save on API costs while maintaining quality

## Available Voices

Browse and download voices from:
- **HuggingFace**: https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0
- **Samples**: https://rhasspy.github.io/piper-samples/

### Recommended Voices

**English (US):**
- `en_US-lessac-medium` - Clear, natural (included in install script)
- `en_US-amy-medium` - Warm, friendly
- `en_US-libritts-high` - Highest quality

**Other Languages:**
- Spanish: `es_ES-sharvard-medium`
- French: `fr_FR-siwis-medium`
- German: `de_DE-thorsten-medium`
- Italian: `it_IT-riccardo-medium`

### Quality Levels

- `x_low` - 16kHz, ~5-7MB - Fast, lower quality
- `low` - 16kHz, ~15-20MB - Good balance
- `medium` - 22.05kHz, ~15-20MB - **Recommended**
- `high` - 22.05kHz, ~28-32MB - Best quality

## Troubleshooting

### Command not found: piper

Add pipx bin directory to PATH:
```bash
export PATH="$HOME/.local/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc to make permanent
```

### No audio output

Install audio utilities:
```bash
# For WSL
sudo apt-get install pulseaudio-utils
```

### Voice download fails

- Check internet connection
- Verify HuggingFace is accessible
- Try alternative mirror or manual download

## Performance

**Benchmark (WSL2 on modern laptop):**
- Generation speed: ~10-20x real-time
- Latency: ~100-200ms for short phrases
- Memory: ~50-100MB per voice model

## Links

- **Piper GitHub**: https://github.com/rhasspy/piper
- **Voice Samples**: https://rhasspy.github.io/piper-samples/
- **HuggingFace Models**: https://huggingface.co/rhasspy/piper-voices
- **AgentVibes Discussion**: https://github.com/paulpreibisch/AgentVibes/discussions/24

## License

Piper TTS is licensed under the MIT License.

---

**Need help?** Open an issue at https://github.com/paulpreibisch/AgentVibes/issues
