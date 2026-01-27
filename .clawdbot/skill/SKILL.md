---
name: agentvibes
description: Text-to-speech using AgentVibes with PulseAudio/SSH tunnel support for remote servers. Use when you need to generate speech audio that plays on a local machine from a remote server, or when free/offline TTS is preferred over cloud APIs. Provides Piper TTS (50+ voices, multilingual, 100% free) with automatic audio tunneling through SSH.
---

# AgentVibes TTS for Clawdbot

Generate text-to-speech audio using AgentVibes with full support for remote SSH sessions and PulseAudio tunneling.

## Quick Start

### Basic TTS

```bash
# Simple TTS with default voice
npx agentvibes speak "Your text here"

# With a specific voice
npx agentvibes speak "Hello" --voice en_US-amy-medium
```

### Choose Your Voice

```bash
# List all 50+ available voices
npx agentvibes voices

# Set your default voice
npx agentvibes voice set en_US-amy-medium
```

### Popular Voice Options

- **Female voices:** `en_US-amy-medium`, `en_GB-jenny_dioco-medium`, `fr_FR-siwis-medium`
- **Male voices:** `en_US-lessac-medium` (default), `en_GB-alan-medium`, `en_US-ryan-high`
- **Other languages:** `es_ES-davefx-medium` (Spanish), `fr_FR-siwis-medium` (French), `de_DE-thorsten-medium` (German)

## Features

### Core Features
- **Free & Offline**: Uses Piper TTS (no API keys required)
- **50+ Voices**: Professional AI voices in 30+ languages
- **Remote SSH Support**: Audio automatically tunnels to your local machine via PulseAudio
- **Zero Latency**: Local generation, instant playback
- **Integrated**: Works seamlessly with Clawdbot messaging

### Advanced Features (All Available!)
- **🎵 Background Music**: 50+ pre-made tracks (jazz, lofi, flamenco, cumbia, bossa nova, etc.)
- **🎚️ Voice Effects**: Reverb (light, medium, heavy, cathedral)
- **🎭 Personalities**: 19+ styles (pirate, sarcastic, zen, flirty, robot, therapist, etc.)
- **🌍 Multi-language**: Auto-translation and language learning modes
- **⚡ Customization**: Speed control, sentiment, verbosity levels

## Installation

```bash
npx agentvibes install
```

That's it! AgentVibes is ready to use.

For remote SSH audio, see: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/remote-audio-setup.md

## Usage Examples

### Basic TTS

```bash
agentvibes speak "Hello from Clawdbot"
```

### Voice Selection

AgentVibes provides 50+ professional AI voices. Users can select voices in multiple ways:

#### Method 1: One-Time Voice (Per Message)

```bash
# Use specific voice for this message only
bash ~/.claude/hooks/play-tts.sh "Hello world" "en_US-amy-medium"

# Different voices:
bash ~/.claude/hooks/play-tts.sh "Hello" "en_US-lessac-medium"  # Default male (US)
bash ~/.claude/hooks/play-tts.sh "Hello" "en_US-amy-medium"     # Female (US)
bash ~/.claude/hooks/play-tts.sh "Hello" "en_US-ryan-high"      # High quality male (US)
bash ~/.claude/hooks/play-tts.sh "Good day" "en_GB-alan-medium" # British male
bash ~/.claude/hooks/play-tts.sh "Bonjour" "fr_FR-siwis-medium" # French female
bash ~/.claude/hooks/play-tts.sh "Hola" "es_ES-davefx-medium"   # Spanish male
```

#### Method 2: Set Default Voice (Persistent)

```bash
# List all available voices with preview samples
bash ~/.claude/hooks/voice-manager.sh list

# Set your preferred voice as default
bash ~/.claude/hooks/voice-manager.sh set en_US-amy-medium

# Now all messages use this voice
bash ~/.claude/hooks/play-tts.sh "This uses Amy's voice"

# Check current default voice
bash ~/.claude/hooks/voice-manager.sh show
```

#### Method 3: Preview Before Choosing

```bash
# Preview a voice before committing
bash ~/.claude/hooks/voice-manager.sh preview en_US-ryan-high

# Preview multiple voices to compare
bash ~/.claude/hooks/voice-manager.sh preview en_GB-alan-medium
bash ~/.claude/hooks/voice-manager.sh preview en_US-lessac-medium

# Set your favorite after testing
bash ~/.claude/hooks/voice-manager.sh set en_GB-alan-medium
```

### Voice Categories

**🇺🇸 English (US) - Most Popular:**
- `en_US-lessac-medium` - Clear male voice (default)
- `en_US-amy-medium` - Friendly female voice
- `en_US-ryan-high` - High quality male voice
- `en_US-libritts-high` - Multiple speakers available

**🇬🇧 English (UK):**
- `en_GB-alan-medium` - British male
- `en_GB-jenny_dioco-medium` - British female

**🌍 Other Languages:**
- `es_ES-davefx-medium` - Spanish (Spain) male
- `es_MX-claude-high` - Spanish (Mexico) male
- `fr_FR-siwis-medium` - French female
- `fr_FR-gilles-low` - French male
- `de_DE-thorsten-medium` - German male
- `de_DE-eva_k-x_low` - German female
- `it_IT-riccardo-x_low` - Italian male
- `pt_BR-faber-medium` - Portuguese (Brazilian) male
- `ja_JP-ayanami-medium` - Japanese female
- `zh_CN-huayan-x_low` - Chinese female
- `ko_KR-kss-medium` - Korean female

See full list: https://rhasspy.github.io/piper-samples/

### Advanced Features

AgentVibes provides powerful audio customization through hook scripts:

#### 🎵 Background Music

```bash
# Enable background music
bash ~/.claude/hooks/background-music-manager.sh on

# List available tracks
bash ~/.claude/hooks/background-music-manager.sh list

# Set specific track (flamenco, jazz, lofi, etc.)
bash ~/.claude/hooks/background-music-manager.sh set-default agentvibes_soft_flamenco_loop.mp3

# Adjust volume (0.0-1.0)
bash ~/.claude/hooks/background-music-manager.sh volume 0.3

# Disable background music
bash ~/.claude/hooks/background-music-manager.sh off
```

#### 🎚️ Voice Effects (Reverb)

```bash
# Add reverb effects
bash ~/.claude/hooks/effects-manager.sh set-reverb light      # Small room
bash ~/.claude/hooks/effects-manager.sh set-reverb medium     # Conference room
bash ~/.claude/hooks/effects-manager.sh set-reverb heavy      # Large hall
bash ~/.claude/hooks/effects-manager.sh set-reverb cathedral  # Epic space

# Turn off reverb
bash ~/.claude/hooks/effects-manager.sh set-reverb off

# Check current effects
bash ~/.claude/hooks/effects-manager.sh list
```

#### 🎭 Personalities

Add personality and emotion to the voice:

```bash
# Set personality (sarcastic is hilarious!)
bash ~/.claude/hooks/personality-manager.sh set sarcastic
bash ~/.claude/hooks/personality-manager.sh set flirty
bash ~/.claude/hooks/personality-manager.sh set zen
bash ~/.claude/hooks/personality-manager.sh set robot

# List all personalities
bash ~/.claude/hooks/personality-manager.sh list

# Remove personality
bash ~/.claude/hooks/personality-manager.sh unset
```

Available personalities: sarcastic (highly recommended!), flirty, pirate, robot, zen, valley-girl, noir-detective, wizard, shakespearean, drill-sergeant, therapist, game-show-host, conspiracy-theorist, stoner, dry-humor, enthusiastic, professional, drunk, and more!

#### 🗣️ Voice & Speed Control

```bash
# List all 50+ available voices
bash ~/.claude/hooks/voice-manager.sh list

# Preview a voice before selecting
bash ~/.claude/hooks/voice-manager.sh preview en_US-amy-medium

# Set default voice (persists across messages)
bash ~/.claude/hooks/voice-manager.sh set en_US-amy-medium

# Check current voice
bash ~/.claude/hooks/voice-manager.sh show

# Use specific voice for one message only
bash ~/.claude/hooks/play-tts.sh "Hello" "en_GB-alan-medium"

# Adjust speech speed (0.5-2.0)
bash ~/.claude/hooks/speed-manager.sh set 1.2  # 20% faster
bash ~/.claude/hooks/speed-manager.sh set 0.8  # 20% slower
bash ~/.claude/hooks/speed-manager.sh show     # Check current speed
```

**Popular Voice Choices:**
- Female: `en_US-amy-medium`, `en_GB-jenny_dioco-medium`, `fr_FR-siwis-medium`
- Male: `en_US-lessac-medium`, `en_GB-alan-medium`, `en_US-ryan-high`
- High Quality: `en_US-ryan-high`, `es_MX-claude-high`

#### 🗣️ Verbosity Control

Control how much detail gets spoken via TTS:

```bash
# Set verbosity level
bash ~/.claude/hooks/verbosity-manager.sh set high      # Maximum transparency (recommended for Clawdbot)
bash ~/.claude/hooks/verbosity-manager.sh set medium    # Balanced (major decisions only)
bash ~/.claude/hooks/verbosity-manager.sh set low       # Minimal (acknowledgments only)

# Check current level
bash ~/.claude/hooks/verbosity-manager.sh get

# Get info about levels
bash ~/.claude/hooks/verbosity-manager.sh info
```

**Verbosity Levels:**
- **HIGH** - All reasoning spoken (full transparency) - *Recommended for Clawdbot*
- **MEDIUM** - Major decisions and findings only
- **LOW** - Just acknowledgments and completions

**For Clawdbot:** Set to HIGH for full verbosity in all responses.

#### 🌍 Language & Translation

```bash
# Set target language
bash ~/.claude/hooks/language-manager.sh set-language es  # Spanish
bash ~/.claude/hooks/language-manager.sh set-language fr  # French

# Enable auto-translation
bash ~/.claude/hooks/translate-manager.sh on

# Disable translation
bash ~/.claude/hooks/translate-manager.sh off
```

### Complete Example with Effects

```bash
# Setup: Flamenco music + cathedral reverb + sarcastic personality
bash ~/.claude/hooks/background-music-manager.sh set-default agentvibes_soft_flamenco_loop.mp3
bash ~/.claude/hooks/effects-manager.sh set-reverb cathedral
bash ~/.claude/hooks/personality-manager.sh set sarcastic

# Speak with all effects applied
bash ~/.claude/hooks/play-tts.sh "Oh great, another user who needs help. How wonderful."
```

### Programmatic Use

```bash
# Capture audio file path
OUTPUT=$(agentvibes speak "Test")
AUDIO_FILE=$(echo "$OUTPUT" | grep "Saved to:" | cut -d: -f2- | xargs)
echo "Audio: $AUDIO_FILE"
```

## Voice Library

Common voices:
- **English (US)**: `en_US-lessac-medium` (default male), `en_US-amy-medium` (female)
- **English (UK)**: `en_GB-alan-medium` (male), `en_GB-jenny_dioco-medium` (female)
- **Spanish**: `es_ES-davefx-medium` (male), `es_MX-claude-high` (female HQ)
- **French**: `fr_FR-siwis-medium` (female), `fr_FR-gilles-low` (male)
- **German**: `de_DE-thorsten-medium` (male), `de_DE-eva_k-x_low` (female)

See full voice library: `agentvibes list-voices`

Or browse online: https://rhasspy.github.io/piper-samples/

## Remote SSH Audio

When running Clawdbot on a remote server, audio can play on your local machine through SSH tunneling.

**Quick setup:**

1. Configure PulseAudio on remote server:
```bash
mkdir -p ~/.config/pulse
cat > ~/.config/pulse/default.pa << 'EOF'
.include /etc/pulse/default.pa
load-module module-native-protocol-tcp auth-ip-acl=127.0.0.1;192.168.0.0/16
EOF

echo 'export PULSE_SERVER=tcp:localhost:14713' >> ~/.bashrc
source ~/.bashrc
```

2. Configure SSH tunnel on local machine (`~/.ssh/config`):
```
Host your-server
    RemoteForward 14713 localhost:14713
```

3. Connect and test:
```bash
ssh your-server
agentvibes speak "Testing remote audio"
```

Full guide: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/remote-audio-setup.md

## Troubleshooting

### No audio output

Check PulseAudio:
```bash
pactl info
```

Should show: `Server String: tcp:localhost:14713`

### AgentVibes command not found

Make sure AgentVibes is installed:
```bash
npx agentvibes install
```

Or globally:
```bash
npm install -g agentvibes
```

### Audio plays on server instead of local

Verify environment variable:
```bash
echo $PULSE_SERVER
```

Should be: `tcp:localhost:14713`

## Quick Reference - Common Commands

### Voice Selection
```bash
bash ~/.claude/hooks/voice-manager.sh list                    # List all voices
bash ~/.claude/hooks/voice-manager.sh preview en_US-amy-medium # Preview voice
bash ~/.claude/hooks/voice-manager.sh set en_US-amy-medium     # Set default
bash ~/.claude/hooks/play-tts.sh "Hi" "en_US-amy-medium"       # One-time use
```

### Background Music
```bash
bash ~/.claude/hooks/background-music-manager.sh on            # Enable
bash ~/.claude/hooks/background-music-manager.sh list          # List tracks
bash ~/.claude/hooks/background-music-manager.sh set-default agentvibes_soft_flamenco_loop.mp3
bash ~/.claude/hooks/background-music-manager.sh volume 0.3    # Set volume
bash ~/.claude/hooks/background-music-manager.sh off           # Disable
```

### Voice Effects
```bash
bash ~/.claude/hooks/effects-manager.sh set-reverb medium      # Add reverb
bash ~/.claude/hooks/effects-manager.sh set-reverb off         # Remove
bash ~/.claude/hooks/effects-manager.sh list                   # Show effects
```

### Personality
```bash
bash ~/.claude/hooks/personality-manager.sh list               # List all
bash ~/.claude/hooks/personality-manager.sh set sarcastic      # Set personality
bash ~/.claude/hooks/personality-manager.sh unset              # Remove
```

### Speed Control
```bash
bash ~/.claude/hooks/speed-manager.sh set 1.2                  # 20% faster
bash ~/.claude/hooks/speed-manager.sh set 0.8                  # 20% slower
bash ~/.claude/hooks/speed-manager.sh show                     # Current speed
```

### Verbosity Control
```bash
bash ~/.claude/hooks/verbosity-manager.sh set high             # Full detail (recommended)
bash ~/.claude/hooks/verbosity-manager.sh set medium           # Balanced
bash ~/.claude/hooks/verbosity-manager.sh set low              # Minimal
bash ~/.claude/hooks/verbosity-manager.sh get                  # Check current
```

## Technical Details

- **Audio Format**: WAV (16-bit, 22.05kHz mono)
- **Storage**: `~/.claude/audio/tts-processed-*.wav`
- **Engine**: Piper TTS (VITS neural TTS from Hugging Face)
- **Latency**: <1 second for typical sentences

## Documentation

- **AgentVibes Home**: https://agentvibes.org
- **GitHub**: https://github.com/paulpreibisch/AgentVibes
- **Piper TTS**: https://github.com/rhasspy/piper
- **Voice Models**: https://huggingface.co/rhasspy/piper-voices
