---
description: ElevenLabs TTS voice management commands
---

# 🎤 ElevenLabs Voice Management

Manage your ElevenLabs text-to-speech voices with these commands:

## Available Commands

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
Add a new custom voice from your ElevenLabs account
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

Saved locally in `.claude/config/agentvibes.json`

## Getting Voice IDs

To add your own custom voices:
1. Go to https://elevenlabs.io/app/voice-library
2. Select or create a voice
3. Copy the voice ID (15-30 character alphanumeric string)
4. Use `/agent-vibes:add` to add it

## Default Voices

The system comes with these Character Voices from ElevenLabs:
- Northern Terry, Grandpa Spuds Oxley, Ms. Walker
- Ralf Eisend, Amy, Michael, Jessica Anne Bogart
- Aria, Lutz Laugh, Dr. Von Fusion, Matthew Schmitz
- Demon Monster, Cowboy Bob, Drill Sergeant

Enjoy your TTS experience! 🎵
