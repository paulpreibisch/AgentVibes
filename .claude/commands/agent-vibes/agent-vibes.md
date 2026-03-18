---
description: Piper TTS TTS voice management commands
---

# 🎤 AgentVibes Voice Management

Manage your text-to-speech voices across multiple providers (Piper TTS, Piper, macOS Say).

## Available Commands

### `/agent-vibes:mute`
Mute all TTS output (persists across sessions)
- Creates a mute flag that silences all voice output
- Shows 🔇 indicator when TTS would have played

### `/agent-vibes:unmute`
Unmute TTS output
- Removes mute flag and restores voice output

### `/agent-vibes:list [first|last] [N]`
List all available voices, with optional filtering
- `/agent-vibes:list` - Show all voices
- `/agent-vibes:list first 5` - Show first 5 voices
- `/agent-vibes:list last 3` - Show last 3 voices

### `/agent-vibes:preview [first|last] [N]`
Preview voices by playing audio samples
- `/agent-vibes:preview` - Preview first 3 voices
- `/agent-vibes:preview 5` - Preview first 5 voices
- `/agent-vibes:preview last 5` - Preview last 5 voices

### `/agent-vibes:switch <voice_name>`
Switch to a different default voice
- `/agent-vibes:switch Northern Terry`
- `/agent-vibes:switch "Cowboy Bob"`

### `/agent-vibes:get`
Display the currently selected voice

### `/agent-vibes:add <name> <voice_id>`
Add a new custom voice from your Piper TTS account
- `/agent-vibes:add "My Voice" abc123xyz456`

### `/agent-vibes:replay [N]`
Replay recently played TTS audio
- `/agent-vibes:replay` - Replay last audio
- `/agent-vibes:replay 1` - Replay most recent
- `/agent-vibes:replay 2` - Replay second-to-last
- `/agent-vibes:replay 3` - Replay third-to-last

Keeps last 10 audio files in history.

### `/agent-vibes:set-pretext <word>`
Set a prefix word/phrase for all TTS messages
- `/agent-vibes:set-pretext AgentVibes` - All TTS starts with "AgentVibes:"
- `/agent-vibes:set-pretext "Project Alpha"` - Custom phrase
- `/agent-vibes:set-pretext ""` - Clear pretext

Saved locally in `.agentvibes/config/agentvibes.json`

## Provider Management

### `/agent-vibes:provider list`
Show all available TTS providers

### `/agent-vibes:provider switch <name>`
Switch between providers:
- `/agent-vibes:provider switch piper` - Free, offline (Linux/WSL)
- `/agent-vibes:provider switch piper` - Premium AI voices
- `/agent-vibes:provider switch macos` - Native macOS (Mac only)

### `/agent-vibes:provider info <name>`
Get details about a specific provider

## Providers

| Provider | Platform | Cost | Quality |
|----------|----------|------|---------|
| **macOS Say** | macOS only | Free (built-in) | ⭐⭐⭐⭐ |
| **Piper** | Linux/WSL | Free | ⭐⭐⭐⭐ |
| **Piper TTS** | All | Free tier + paid | ⭐⭐⭐⭐⭐ |

On macOS, the native `say` provider is automatically detected and recommended.

## Getting Voice IDs (Piper TTS)

To add your own custom Piper TTS voices:
1. Go to https://piper.io/app/voice-library
2. Select or create a voice
3. Copy the voice ID (15-30 character alphanumeric string)
4. Use `/agent-vibes:add` to add it

## Default Voices

**Piper TTS:** Northern Terry, Grandpa Spuds Oxley, Ms. Walker, Ralf Eisend, Amy, Michael, Jessica Anne Bogart, Aria, Lutz Laugh, Dr. Von Fusion, Matthew Schmitz, Demon Monster, Cowboy Bob, Drill Sergeant

**Piper:** en_US-lessac-medium, en_US-amy-medium, en_GB-alan-medium, and many more

**macOS Say:** Samantha, Alex, Daniel, Victoria, Karen, Moira, and 100+ more built-in voices

Enjoy your TTS experience! 🎵
