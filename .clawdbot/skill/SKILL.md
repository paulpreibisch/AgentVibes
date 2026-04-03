---
name: agentvibes
description: 🎤 AgentVibes TTS for Claude Code & OpenClaw — Switch voices, set personality, control speed, background music, language learning mode, reverb/effects, and more. Free offline TTS with 914+ Piper voices across 30+ languages. Works on Windows (SAPI/Piper), macOS (Say/Piper), Linux, and Android/Termux. No account or API key required.
---

# 🎤 AgentVibes Voice Management

Professional text-to-speech for Claude Code and OpenClaw. Free, offline, no account required.

**Providers:** Piper TTS (914+ voices, all platforms) · macOS Say (built-in) · Windows SAPI (zero setup) · Soprano (neural)

---

## Voice Commands

### /agent-vibes:switch \<voice_name\>
Switch to a different voice.

```bash
/agent-vibes:switch en_US-amy-medium
/agent-vibes:switch en_GB-alan-medium
/agent-vibes:switch fr_FR-siwis-medium
```

### /agent-vibes:list [first|last] [N]
List available voices.

```bash
/agent-vibes:list                    # Show all voices
/agent-vibes:list first 5            # Show first 5
/agent-vibes:list last 3             # Show last 3
```

### /agent-vibes:preview [first|last] [N]
Preview voices with audio samples.

```bash
/agent-vibes:preview                 # Preview first 3 voices
/agent-vibes:preview 5               # Preview first 5
/agent-vibes:preview last 5          # Preview last 5
```

### /agent-vibes:sample \<voice_name\>
Play a sample of a specific voice.

```bash
/agent-vibes:sample en_US-ryan-high
```

### /agent-vibes:get
Show the currently active voice.

### /agent-vibes:set-favorite-voice
Mark current voice as your favorite.

---

## Personality & Style

### /agent-vibes:personality [name|list|add|edit|get|reset]
Set a personality style for TTS output.

```bash
/agent-vibes:personality list          # Show available personalities
/agent-vibes:personality sarcastic     # Switch to sarcastic style
/agent-vibes:personality dramatic      # Switch to dramatic style
/agent-vibes:personality reset         # Back to default
```

### /agent-vibes:set-pretext \<phrase\>
Add a spoken prefix before every TTS message.

```bash
/agent-vibes:set-pretext "AgentVibes"   # Speaks "AgentVibes: ..." before each message
/agent-vibes:set-pretext ""              # Clear pretext
```

---

## Speed & Effects

### /agent-vibes:set-speed \<speed\>
Control speech rate (0.5x – 3.0x).

```bash
/agent-vibes:set-speed 1.0             # Normal speed
/agent-vibes:set-speed 1.5             # 50% faster
/agent-vibes:set-speed 0.8             # Slower
```

### /agent-vibes:effects [reverb|echo|pitch|eq|reset]
Configure voice effects.

```bash
/agent-vibes:effects reverb hall       # Hall reverb
/agent-vibes:effects reverb none       # No reverb
/agent-vibes:effects reset             # Clear all effects
```

---

## Background Music

### /agent-vibes:background-music [on|off|status|list|switch]
Toggle or change background music played under TTS.

```bash
/agent-vibes:background-music on       # Enable background music
/agent-vibes:background-music off      # Disable
/agent-vibes:background-music list     # Show available tracks
/agent-vibes:background-music switch jazz  # Switch to jazz track
```

---

## Verbosity

### /agent-vibes:verbosity [low|medium|high]
Control how much Claude speaks while working.

```bash
/agent-vibes:verbosity low             # Brief acknowledgments only
/agent-vibes:verbosity medium          # Key decisions (default)
/agent-vibes:verbosity high            # Full reasoning
```

---

## Mute / Replay

### /agent-vibes:mute / /agent-vibes:unmute
Silence or restore TTS output (persists across sessions).

### /agent-vibes:replay [N]
Replay recent audio (last 10 kept).

```bash
/agent-vibes:replay                    # Replay last audio
/agent-vibes:replay 2                  # Replay second-to-last
```

---

## Language & Learning

### /agent-vibes:language \<lang\>
Set your native language.

```bash
/agent-vibes:language english
/agent-vibes:language japanese
```

### /agent-vibes:learn [on|off]
Enable language learning mode — Claude speaks in both your native and target language.

```bash
/agent-vibes:learn on
/agent-vibes:learn off
```

### /agent-vibes:translate \<text\>
Translate and speak text in the target language.

---

## Provider Management

### /agent-vibes:provider [list|switch|info]

```bash
/agent-vibes:provider list
/agent-vibes:provider switch piper     # Piper TTS (free, offline, 914+ voices)
/agent-vibes:provider switch macos     # macOS Say (Mac only)
/agent-vibes:provider switch sapi      # Windows SAPI (Windows only, zero setup)
/agent-vibes:provider switch soprano   # Soprano (neural)
```

---

## Providers

| Provider | Platform | Cost | Voices |
|----------|----------|------|--------|
| **Piper TTS** | All platforms | Free, offline | 914+ in 30+ languages |
| **macOS Say** | macOS only | Free (built-in) | 100+ system voices |
| **Windows SAPI** | Windows only | Free (built-in) | System voices, zero setup |
| **Soprano** | All platforms | Free | Neural voices |

---

## Miscellaneous

### /agent-vibes:whoami
Show current AgentVibes configuration.

### /agent-vibes:version
Show installed version.

### /agent-vibes:update
Update AgentVibes to the latest version.

### /agent-vibes:show / /agent-vibes:hide
Show or hide the AgentVibes status indicator.

### /agent-vibes:cleanup / /agent-vibes:clean
Remove cached audio files.

---

## Default Voices (Piper TTS — Free & Offline)

**English (US):** en_US-lessac-medium · en_US-amy-medium · en_US-ryan-high · en_US-libritts-high (914 speakers)

**English (UK):** en_GB-alan-medium · en_GB-jenny_dioco-medium

**French:** fr_FR-siwis-medium · fr_FR-gilles-low

**German:** de_DE-thorsten-medium · de_DE-eva_k-x_low

**Spanish:** es_ES-davefx-medium · es_MX-claude-high

**Japanese:** ja_JP-ayanami-medium · **Chinese:** zh_CN-huayan-x_low · **Korean:** ko_KR-kss-medium

**+ 900 more** across 30+ languages. All voices are downloaded from [HuggingFace](https://huggingface.co/rhasspy/piper-voices) — no account required.

---

## Tips

- **Preview first**: Use `/agent-vibes:preview` before committing to a voice
- **Verbosity**: Set to `low` for focused work, `high` for full narration
- **BMAD party mode**: Each agent gets their own voice, music, and personality
- **Replay**: Use `/agent-vibes:replay` to re-hear the last 10 responses
- **Speed**: Combine with personality for a fully custom TTS character

Enjoy your TTS experience! 🎵
