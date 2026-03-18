---
name: agentvibes
description: 🎤 AgentVibes Voice Management - Manage your text-to-speech voices across multiple providers (Piper TTS, Piper, macOS Say). Switch voices, preview audio, manage providers, add custom voices, and control TTS output.
---

# 🎤 AgentVibes Voice Management

Manage your text-to-speech voices across multiple providers (Piper TTS, Piper, macOS Say).

---

## Available Commands

### Voice Control

#### /agent-vibes:mute
Mute all TTS output (persists across sessions)

- Creates a mute flag that silences all voice output
- Shows 🔇 indicator when TTS would have played

```bash
/agent-vibes:mute
```

#### /agent-vibes:unmute
Unmute TTS output

- Removes mute flag and restores voice output

```bash
/agent-vibes:unmute
```

#### /agent-vibes:list [first|last] [N]
List all available voices, with optional filtering

```bash
/agent-vibes:list                    # Show all voices
/agent-vibes:list first 5            # Show first 5 voices
/agent-vibes:list last 3             # Show last 3 voices
```

#### /agent-vibes:preview [first|last] [N]
Preview voices by playing audio samples

```bash
/agent-vibes:preview                 # Preview first 3 voices
/agent-vibes:preview 5               # Preview first 5 voices
/agent-vibes:preview last 5          # Preview last 5 voices
```

#### /agent-vibes:switch <voice_name>
Switch to a different default voice

```bash
/agent-vibes:switch en_US-amy-medium
/agent-vibes:switch en_GB-alan-medium
/agent-vibes:switch fr_FR-siwis-medium
```

#### /agent-vibes:get
Display the currently selected voice

```bash
/agent-vibes:get
```

#### /agent-vibes:add <name> <voice_id>
Add a new custom voice from your Piper TTS account

```bash
/agent-vibes:add "My Voice" abc123xyz456
```

See [Getting Voice IDs](#getting-voice-ids-piper-tts) section below.

#### /agent-vibes:replay [N]
Replay recently played TTS audio

```bash
/agent-vibes:replay                  # Replay last audio
/agent-vibes:replay 1                # Replay most recent
/agent-vibes:replay 2                # Replay second-to-last
/agent-vibes:replay 3                # Replay third-to-last
```

Keeps last 10 audio files in history.

#### /agent-vibes:set-pretext <word>
Set a prefix word/phrase for all TTS messages

```bash
/agent-vibes:set-pretext AgentVibes  # All TTS starts with "AgentVibes:"
/agent-vibes:set-pretext "Project Alpha" # Custom phrase
/agent-vibes:set-pretext ""          # Clear pretext
```

Saved locally in `.agentvibes/config/agentvibes.json`

---

## Provider Management

#### /agent-vibes:provider list
Show all available TTS providers

```bash
/agent-vibes:provider list
```

#### /agent-vibes:provider switch <name>
Switch between providers

```bash
/agent-vibes:provider switch piper    # Piper TTS - Free, offline, 50+ voices
/agent-vibes:provider switch macos    # macOS Say - Native macOS voices (Mac only)
```

#### /agent-vibes:provider info <name>
Get details about a specific provider

```bash
/agent-vibes:provider info piper
/agent-vibes:provider info macos
```

---

## Providers

| Provider | Platform | Cost | Voices | Quality |
|----------|----------|------|--------|---------|
| **Piper TTS** | All platforms (Linux, macOS, WSL) | Free | 50+ in 30+ languages | ⭐⭐⭐⭐ |
| **macOS Say** | macOS only | Free (built-in) | 100+ system voices | ⭐⭐⭐⭐ |

**On macOS**, the native `say` provider is automatically detected and recommended!

---

## Getting Voice IDs (Piper TTS)

To add your own custom Piper TTS voices:

1. Go to https://piper.io/app/voice-library
2. Select or create a voice
3. Copy the voice ID (15-30 character alphanumeric string)
4. Use `/agent-vibes:add` to add it:

```bash
/agent-vibes:add "My Custom Voice" xyz789abc123def456
```

---

## Default Voices

### Piper TTS (Free & Offline)

**English (US):**
- en_US-lessac-medium (default male voice)
- en_US-amy-medium (friendly female)
- en_US-ryan-high (high quality male)
- en_US-libritts-high (multiple speakers)

**English (UK):**
- en_GB-alan-medium (British male)
- en_GB-jenny_dioco-medium (British female)

**Romance Languages:**
- es_ES-davefx-medium (Spanish - Spain)
- es_MX-claude-high (Spanish - Mexico)
- fr_FR-siwis-medium (French female)
- fr_FR-gilles-low (French male)
- it_IT-riccardo-x_low (Italian male)
- pt_BR-faber-medium (Portuguese - Brazilian)

**Germanic Languages:**
- de_DE-thorsten-medium (German male)
- de_DE-eva_k-x_low (German female)

**Asian Languages:**
- ja_JP-ayanami-medium (Japanese female)
- zh_CN-huayan-x_low (Chinese female)
- ko_KR-kss-medium (Korean female)

### macOS Say (100+ Built-in)
- Samantha
- Alex
- Daniel
- Victoria
- Karen
- Moira
- And 100+ more system voices

---

## Quick Examples

### Switch to a different voice
```bash
/agent-vibes:switch en_US-lessac-medium    # Clear male voice
/agent-vibes:switch en_US-ryan-high        # High quality male
/agent-vibes:switch en_GB-alan-medium      # British male
```

### Preview before choosing
```bash
/agent-vibes:preview 5                     # Preview first 5 voices
/agent-vibes:preview last 3                # Preview last 3 voices
```

### Add your custom Piper voice
```bash
/agent-vibes:add "My Voice" abc123xyz456
/agent-vibes:switch My Voice
```

### Switch providers
```bash
/agent-vibes:provider switch macos    # Use native macOS voices
/agent-vibes:provider switch piper    # Switch back to Piper
```

### Mute/Unmute
```bash
/agent-vibes:mute                     # Silent mode
/agent-vibes:unmute                   # Restore voice
```

---

## Tips & Tricks

- **Preview first**: Always use `/agent-vibes:preview` before switching to a new voice
- **Provider switching**: Some voices are only available on specific providers
- **Voice history**: Use `/agent-vibes:replay` to hear the last 10 TTS messages
- **Custom pretext**: Set a pretext to brand all your responses (e.g., "AgentVibes:")
- **Mute for focus**: Use `/agent-vibes:mute` during intensive work sessions

Enjoy your TTS experience! 🎵
